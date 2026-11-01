import React, { useState } from 'react';
import { Icon, Sheet, Field, useToast, Img, Toggle, Confirm, Empty } from '../ui.jsx';
import { useApp } from '../App.jsx';
import { useRestaurants, useBanners, useItems } from '../lib/data.js';
import { put, patch, remove, newId, getList } from '../lib/fb.js';
import { compressImage } from '../lib/utils.js';
import { useOffers, offerLabel, offerTerms, OFFER_COLORS, isLive } from '../lib/offers.js';
import { t } from '../i18n/index.js';

export default function Promos() {
  const [tab, setTab] = useState('coupons');
  return (
    <div className="pad-x">
      <div className="seg">
        <button className={tab === 'coupons' ? 'on' : ''} onClick={() => setTab('coupons')}>Coupons</button>
        <button className={tab === 'banners' ? 'on' : ''} onClick={() => setTab('banners')}>Banners</button>
        <button className={tab === 'popup' ? 'on' : ''} onClick={() => setTab('popup')}>Popup</button>
      </div>
      {tab === 'coupons' && <Coupons />}
      {tab === 'banners' && <Banners />}
      {tab === 'popup' && <Popup />}
    </div>
  );
}

/* ---------------- coupons ---------------- */
function Coupons() {
  const offers = useOffers() || [];
  const rests = useRestaurants() || [];
  const [edit, setEdit] = useState(null);
  const [smart, setSmart] = useState(false);
  const toast = useToast();
  return (
    <>
      <button className="btn primary block" onClick={() => setEdit({})}><Icon name="plus" size={18} /> New coupon / offer</button>
      <button className="btn ai-btn block" onClick={() => setSmart(true)} data-notr="">✨ AI से ऑफ़र बनाएँ</button>
      <SmartOffers open={smart} rests={rests} onClose={() => setSmart(false)} onUse={(o) => { setSmart(false); setEdit(o); }} />
      <p className="tiny muted">Coupons show on the home page and restaurant page. Customers apply them in the cart.</p>
      {!offers.length && <Empty icon="star" title="No offers yet" text="Create your first coupon, e.g. PYAAR20 — 20% off up to ₹50." />}
      {offers.map((o) => (
        <div key={o.id} className={'coupon-row' + (isLive(o) ? '' : ' off')} style={{ '--c': o.color || OFFER_COLORS[0] }}>
          <div className="cr-tag">{offerLabel(o)}</div>
          <div className="grow" onClick={() => setEdit(o)}>
            <b data-notr="">{o.code}</b>
            <small>{o.title}</small>
            <small className="muted">{[offerTerms(o), o.restaurantId ? (rests.find((r) => r.id === o.restaurantId)?.name || '') : t('All restaurants'), o.fundedBy === 'restaurant' ? t('Restaurant pays') : t('You pay'), o.until ? `${t('till')} ${o.until}` : ''].filter(Boolean).join(' · ')}</small>
          </div>
          <Toggle on={o.active !== false} onChange={(v) => patch('offers', o.id, { active: v }).catch(() => toast(t('Could not save'), 'err'))} label="Active" />
        </div>
      ))}
      <CouponEditor open={!!edit} o={edit} rests={rests} onClose={() => setEdit(null)} />
    </>
  );
}

/* ---------------- smart offer ideas from the last 30 days of orders ---------------- */
const DAY = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
const up50 = (n) => Math.max(99, Math.ceil(n / 50) * 50 - 1);
const r10 = (n) => Math.max(10, Math.round(n / 10) * 10);
const iso = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const FESTIVALS = [['2026-11-08', 'DIWALI', 'दिवाली'], ['2026-12-25', 'XMAS', 'क्रिसमस'], ['2027-01-01', 'NEWYEAR', 'नया साल']];

function SmartOffers({ open, rests, onClose, onUse }) {
  const { config } = useApp();
  const [orders, setOrders] = useState(null);
  React.useEffect(() => {
    if (!open) return;
    setOrders(null);
    getList('orders', [['day', '>=', iso(Date.now() - 30 * 864e5)]]).then(setOrders).catch(() => setOrders([]));
  }, [open]);
  if (!open) return null;
  const ok = (orders || []).filter((o) => !['cancelled', 'rejected', 'payment_failed', 'awaiting_payment'].includes(o.status));
  const n = ok.length;
  const avg = n ? ok.reduce((a, o) => a + Number(o.itemTotal || o.total || 0), 0) / n : 200;
  const fee = Number(config.commissionPct || 4.9);
  const byDay = Array(7).fill(0); ok.forEach((o) => { byDay[new Date(o.createdMs || Date.now()).getDay()] += 1; });
  const slow = byDay.indexOf(Math.min(...byDay));
  const live = rests.filter((r) => !r.demo);
  const cnt = (rid) => ok.filter((o) => o.restaurantId === rid).length;
  const weak = live.length > 1 ? [...live].sort((a, b) => cnt(a.id) - cnt(b.id))[0] : null;
  const custs = {}; ok.forEach((o) => { custs[o.customerUid] = (custs[o.customerUid] || 0) + 1; });
  const once = Object.values(custs).filter((c) => c === 1).length;
  const nextSun = (() => { const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); return iso(d.getTime()); })();
  const plus = (days) => iso(Date.now() + days * 864e5);

  const ideas = [];
  const bigMin = up50(avg * 1.3);
  const bigOff = r10(bigMin * 0.07);
  ideas.push({ why: `औसत ऑर्डर ₹${Math.round(avg)} का है। ₹${bigMin + 1} से ऊपर पर छूट देने से लोग एक-दो चीज़ ज़्यादा मँगाएँगे — बिक्री बढ़ेगी।`,
    o: { code: `BADA${bigOff}`, title: `₹${bigMin + 1}+ के ऑर्डर पर ₹${bigOff} की छूट`, sub: 'पूरे परिवार के लिए मँगाइए', type: 'flat', value: bigOff, minOrder: bigMin + 1, maxOff: 0, until: plus(14) } });
  ideas.push({ why: once > 0 ? `${once} ग्राहकों ने पिछले 30 दिनों में सिर्फ़ एक बार ऑर्डर किया। यह ऑफ़र उन्हें दोबारा बुलाने के लिए है।` : 'ग्राहकों को दोबारा ऑर्डर करने का बहाना देने वाला छोटा ऑफ़र।',
    o: { code: 'PHIRSE15', title: '15% छूट — फिर से स्वाद लीजिए', sub: '₹30 तक की छूट', type: 'percent', value: 15, minOrder: up50(avg * 0.8) + 1, maxOff: 30, until: plus(7) } });
  if (n >= 7) ideas.push({ why: `सबसे कम ऑर्डर ${DAY[slow]} को आते हैं। यह वीकेंड तक चलने वाला ऑफ़र है — ${DAY[slow]} को WhatsApp पर याद दिलाएँ।`,
    o: { code: 'WEEKEND10', title: '10% छूट — इस हफ़्ते', sub: '₹40 तक', type: 'percent', value: 10, minOrder: up50(avg) + 1, maxOff: 40, until: nextSun } });
  if (weak) ideas.push({ why: `"${weak.name}" पर पिछले 30 दिनों में सिर्फ़ ${cnt(weak.id)} ऑर्डर आए। सिर्फ़ उसी रेस्टोरेंट पर छूट से उसकी बिक्री बढ़ेगी।`,
    o: { code: `TRY${String(weak.name || 'NEW').replace(/[^A-Za-z]/g, '').slice(0, 5).toUpperCase() || 'NEW'}`, title: `${weak.name} पर 15% छूट`, sub: 'नया स्वाद आज़माइए', type: 'percent', value: 15, minOrder: 149, maxOff: 30, restaurantId: weak.id, until: plus(10) } });
  const today = iso(Date.now());
  FESTIVALS.forEach(([d, code, name]) => {
    const diff = (new Date(d) - new Date(today)) / 864e5;
    if (diff >= -1 && diff <= 14) ideas.push({ why: `${name} नज़दीक है — त्योहार पर घर में मेहमान और ऑर्डर दोनों बढ़ते हैं।`,
      o: { code, title: `${name} स्पेशल — ₹40 की छूट`, sub: `₹${up50(avg * 1.5) + 1}+ के ऑर्डर पर`, type: 'flat', value: 40, minOrder: up50(avg * 1.5) + 1, maxOff: 0, until: iso(new Date(d).getTime() + 864e5) } });
  });

  const offAt = (o) => (o.type === 'flat' ? (avg >= o.minOrder ? o.value : o.value) : Math.min(Math.max(avg, o.minOrder) * o.value / 100, o.maxOff || 1e9));
  return (
    <Sheet open={open} onClose={onClose} title="✨ AI ऑफ़र सुझाव" full>
      <div data-notr="">
        {orders === null ? <div className="skeleton" style={{ height: 160 }} /> : (
          <>
            <div className="ai-sum">
              <span>🧠</span>
              <p>{n ? `पिछले 30 दिनों के ${n} ऑर्डर देखकर ये ऑफ़र बनाए गए हैं — औसत ऑर्डर ₹${Math.round(avg)}.` : 'अभी ऑर्डर कम हैं, इसलिए शुरुआत वाले ऑफ़र सुझाए गए हैं (औसत ऑर्डर ₹200 मानकर)।'}</p>
            </div>
            {ideas.map(({ why, o }, i) => {
              const off = Math.round(offAt(o));
              const earn = Math.round((Math.max(avg, o.minOrder) * fee) / 100);
              return (
                <div key={i} className="ai-idea" style={{ '--c': OFFER_COLORS[i % OFFER_COLORS.length] }}>
                  <div className="ai-top"><b>{o.code}</b><span>{o.type === 'flat' ? `₹${o.value} OFF` : `${o.value}% OFF`}</span></div>
                  <p className="ai-title">{o.title}</p>
                  <p className="ai-why">💡 {why}</p>
                  <p className="ai-cost">हर ऑर्डर पर लगभग ₹{off} की छूट आपकी जेब से · आपकी फ़ीस लगभग ₹{earn} {off > earn ? <em>— फ़ीस से ज़्यादा, सीमित समय तक ही चलाएँ</em> : null}</p>
                  <button className="btn primary block" onClick={() => onUse({ ...o, fundedBy: 'admin', restaurantId: o.restaurantId || '', color: OFFER_COLORS[i % OFFER_COLORS.length], active: true, sort: 3 })}>इसे इस्तेमाल करें (बदल भी सकते हैं)</button>
                </div>
              );
            })}
            <p className="tiny muted">ये सुझाव आपके ऐप के ऑर्डर के आँकड़ों से अपने-आप बनते हैं। सेव करने से पहले हर चीज़ बदल सकते हैं।</p>
          </>
        )}
      </div>
    </Sheet>
  );
}

function CouponEditor({ open, o, rests, onClose }) {
  const toast = useToast();
  const [f, setF] = useState(null);
  const [del, setDel] = useState(false);
  React.useEffect(() => {
    if (open) setF({ code: '', title: '', sub: '', type: 'percent', value: 20, minOrder: 149, maxOff: 50, restaurantId: '', fundedBy: 'admin', active: true, color: OFFER_COLORS[0], until: '', sort: 5, ...o });
  }, [open]); // eslint-disable-line
  if (!f) return null;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    const code = String(f.code).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 3 || !(Number(f.value) > 0)) { toast(t('Enter a code (3+ letters) and discount value'), 'err'); return; }
    const data = {
      code, title: f.title.trim() || (f.type === 'flat' ? `Flat ₹${f.value} off` : `${f.value}% off your order`), sub: f.sub.trim(),
      type: f.type, value: Number(f.value), minOrder: Number(f.minOrder) || 0, maxOff: Number(f.maxOff) || 0,
      restaurantId: f.restaurantId, fundedBy: f.fundedBy, active: f.active !== false, color: f.color, until: f.until || '', sort: Number(f.sort) || 5,
    };
    try { await put('offers', o?.id || newId('offers'), data, false); toast(t('Saved')); onClose(); } catch { toast(t('Could not save'), 'err'); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={o?.id ? 'Edit offer' : 'New offer'} full>
      <div className="coupon-preview" style={{ '--c': f.color }}>
        <div className="cp-left"><b>{f.type === 'flat' ? `₹${f.value || 0}` : `${f.value || 0}%`}</b><span>OFF</span></div>
        <div className="cp-right"><b data-notr="">{String(f.code || 'CODE').toUpperCase()}</b><small>{f.title || 'Your offer title'}</small></div>
      </div>
      <div className="row gap">
        <Field label="Coupon code"><input className="input" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="PYAAR20" maxLength={14} /></Field>
        <Field label="Type">
          <select className="input" value={f.type} onChange={set('type')}><option value="percent">{t('% off')}</option><option value="flat">{t('Flat ₹ off')}</option></select>
        </Field>
      </div>
      <div className="row gap">
        <Field label={f.type === 'flat' ? 'Discount ₹' : 'Discount %'}><input className="input" inputMode="decimal" value={f.value} onChange={set('value')} /></Field>
        <Field label="Min order ₹"><input className="input" inputMode="decimal" value={f.minOrder} onChange={set('minOrder')} /></Field>
        {f.type !== 'flat' && <Field label="Max discount ₹"><input className="input" inputMode="decimal" value={f.maxOff} onChange={set('maxOff')} /></Field>}
      </div>
      <Field label="Title (shown to customers)"><input className="input" value={f.title} onChange={set('title')} placeholder="e.g. 20% off on your first order" /></Field>
      <Field label="Short line (optional)"><input className="input" value={f.sub} onChange={set('sub')} placeholder="e.g. Valid on all restaurants" /></Field>
      <div className="row gap">
        <Field label="Restaurant">
          <select className="input" value={f.restaurantId} onChange={set('restaurantId')}>
            <option value="">{t('All restaurants')}</option>
            {rests.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="Who pays the discount?">
          <select className="input" value={f.fundedBy} onChange={set('fundedBy')}><option value="admin">{t('You (FoodGaon)')}</option><option value="restaurant">{t('Restaurant')}</option></select>
        </Field>
      </div>
      <div className="row gap">
        <Field label="Valid till (optional)"><input className="input" type="date" value={f.until} onChange={set('until')} /></Field>
        <Field label="Order on list"><input className="input" inputMode="numeric" value={f.sort} onChange={set('sort')} /></Field>
      </div>
      <p className="field-label">Colour</p>
      <div className="row gap wrap">{OFFER_COLORS.map((c) => <button key={c} className={'swatch' + (f.color === c ? ' on' : '')} style={{ background: c }} onClick={() => setF({ ...f, color: c })} aria-label={c} />)}</div>
      <button className="btn primary block lg" onClick={save}>Save offer</button>
      {o?.id && <button className="btn ghost danger-text block" onClick={() => setDel(true)}><Icon name="trash" size={16} /> Delete offer</button>}
      <Confirm open={del} onClose={() => setDel(false)} danger title="Delete this offer?" text="Customers will no longer see it." okText="Delete"
        onOk={async () => { try { await remove('offers', o.id); onClose(); } catch { toast(t('Could not delete'), 'err'); } }} />
    </Sheet>
  );
}

/* ---------------- banners ---------------- */
function Banners() {
  const banners = useBanners() || [];
  const [edit, setEdit] = useState(null);
  const [smart, setSmart] = useState(false);
  const toast = useToast();
  return (
    <>
      <button className="btn primary block" onClick={() => setEdit({})}><Icon name="plus" size={18} /> New banner</button>
      <p className="tiny muted">Banners slide at the top of the customer home page.</p>
      {banners.map((b) => (
        <div key={b.id} className={'banner-row' + (b.active === false ? ' off' : '')}>
          <Img src={b.img} alt="" className="br-img" />
          <div className="grow" onClick={() => setEdit(b)}><b>{b.title}</b><small className="muted">{b.sub}</small></div>
          <Toggle on={b.active !== false} onChange={(v) => patch('banners', b.id, { active: v }).catch(() => toast(t('Could not save'), 'err'))} label="Show" />
        </div>
      ))}
      <BannerEditor open={!!edit} b={edit} onClose={() => setEdit(null)} />
    </>
  );
}

function BannerEditor({ open, b, onClose }) {
  const toast = useToast();
  const rests = useRestaurants() || [];
  const items = useItems() || [];
  const [f, setF] = useState(null);
  const [pick, setPick] = useState(false);
  const [del, setDel] = useState(false);
  React.useEffect(() => { if (open) setF({ title: '', sub: '', img: '', link: '', code: '', sort: 5, active: true, ...b }); }, [open]); // eslint-disable-line
  if (!f) return null;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const upload = async (e) => { const file = e.target.files?.[0]; if (!file) return; try { setF({ ...f, img: await compressImage(file, 1100, 230000) }); } catch (er) { toast(t(er.message), 'err'); } };
  const save = async () => {
    if (!f.title.trim() || !f.img) { toast(t('Add a title and a photo'), 'err'); return; }
    try { await put('banners', b?.id || newId('banners'), { title: f.title.trim(), sub: f.sub.trim(), img: f.img, link: f.link, code: f.code.trim().toUpperCase(), sort: Number(f.sort) || 5, active: f.active !== false }, false); toast(t('Saved')); onClose(); } catch { toast(t('Could not save'), 'err'); }
  };
  const photos = [...new Set(items.map((i) => i.img).filter((x) => x && x.startsWith('http')))];
  return (
    <Sheet open={open} onClose={onClose} title={b?.id ? 'Edit banner' : 'New banner'} full>
      <div className="banner preview">
        {f.img ? <Img src={f.img} alt="" className="banner-img" /> : <div className="banner-img img-fallback" />}
        <div className="banner-txt"><b>{f.title || 'Banner title'}</b><span>{f.sub || 'Short line'}</span></div>
      </div>
      <div className="row gap">
        <label className="btn ghost grow"><Icon name="image" size={16} /> Upload photo<input type="file" accept="image/*" hidden onChange={upload} /></label>
        <button className="btn ghost grow" onClick={() => setPick(!pick)}><Icon name="list" size={16} /> Pick dish photo</button>
      </div>
      {pick && <div className="photo-pick">{photos.map((p) => <button key={p} onClick={() => { setF({ ...f, img: p }); setPick(false); }}><img src={p} alt="" loading="lazy" /></button>)}</div>}
      <Field label="Title"><input className="input" value={f.title} onChange={set('title')} placeholder="e.g. Diwali Mithai Fest" maxLength={40} /></Field>
      <Field label="Short line"><input className="input" value={f.sub} onChange={set('sub')} placeholder="e.g. Flat ₹50 off on sweets" maxLength={60} /></Field>
      <div className="row gap">
        <Field label="Opens restaurant">
          <select className="input" value={f.link} onChange={set('link')}><option value="">{t('Nothing')}</option>{rests.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        </Field>
        <Field label="Coupon code (optional)"><input className="input" value={f.code} onChange={set('code')} placeholder="PYAAR20" /></Field>
      </div>
      <Field label="Order on list"><input className="input" inputMode="numeric" value={f.sort} onChange={set('sort')} /></Field>
      <button className="btn primary block lg" onClick={save}>Save banner</button>
      {b?.id && <button className="btn ghost danger-text block" onClick={() => setDel(true)}><Icon name="trash" size={16} /> Delete banner</button>}
      <Confirm open={del} onClose={() => setDel(false)} danger title="Delete this banner?" text="It will be removed from the home page." okText="Delete"
        onOk={async () => { try { await remove('banners', b.id); onClose(); } catch { toast(t('Could not delete'), 'err'); } }} />
    </Sheet>
  );
}

/* ---------------- popup ---------------- */
function Popup() {
  const { config } = useApp();
  const toast = useToast();
  const items = useItems() || [];
  const [f, setF] = useState(() => ({ active: false, title: '', text: '', img: '', code: '', ...(config.popup || {}) }));
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const upload = async (e) => { const file = e.target.files?.[0]; if (!file) return; try { setF({ ...f, img: await compressImage(file, 900, 200000) }); } catch (er) { toast(t(er.message), 'err'); } };
  const save = async () => {
    try { await put('config', 'app', { popup: { ...f, title: f.title.trim(), text: f.text.trim(), code: f.code.trim().toUpperCase(), v: Date.now() } }); toast(t('Saved')); } catch { toast(t('Could not save'), 'err'); }
  };
  const photos = [...new Set(items.map((i) => i.img).filter((x) => x && x.startsWith('http')))].slice(0, 24);
  return (
    <div className="card">
      <div className="row between"><h4>Show popup when app opens</h4><Toggle on={!!f.active} onChange={(v) => setF({ ...f, active: v })} label="Popup on" /></div>
      <p className="tiny muted">Each customer sees it once. Saving again shows it again to everyone.</p>
      <div className="popup-preview">
        {f.img && <img src={f.img} alt="" />}
        <b>{f.title || 'Big offer title'}</b>
        <p>{f.text || 'A line about the offer'}</p>
        {f.code && <span className="code-pill" data-notr="">{f.code}</span>}
      </div>
      <Field label="Title"><input className="input" value={f.title} onChange={set('title')} placeholder="e.g. Free Gulab Jamun!" /></Field>
      <Field label="Text"><textarea className="input" rows={2} value={f.text} onChange={set('text')} placeholder="e.g. Use code PYAAR20 and get 20% off today" /></Field>
      <Field label="Coupon code (optional)"><input className="input" value={f.code} onChange={set('code')} /></Field>
      <label className="btn ghost block"><Icon name="image" size={16} /> Upload photo<input type="file" accept="image/*" hidden onChange={upload} /></label>
      <div className="photo-pick">{photos.map((p) => <button key={p} onClick={() => setF({ ...f, img: p })}><img src={p} alt="" loading="lazy" /></button>)}</div>
      <button className="btn primary block lg" onClick={save}>Save popup</button>
    </div>
  );
}

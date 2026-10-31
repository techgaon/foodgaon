import { HideOrderBtn, visibleFor } from '../components/OrderActions.jsx';
import React, { useEffect, useRef, useState } from 'react';
import { Icon, Empty, StatusChip, STATUS, Confirm, useToast, VegMark, Sheet, Field, WaBtn } from '../ui.jsx';
import { useApp } from '../App.jsx';
import { useDoc, setStatus, ACTIVE, cartStore } from '../lib/data.js';
import { patch } from '../lib/fb.js';
import { priceText, lineText, rupee, fmtDateTime, fmtTime, tel, plain, km, ms, systemNotify } from '../lib/utils.js';
import MapView from '../components/MapView.jsx';
import { TopBar } from './RestaurantPage.jsx';
import { t, tr } from '../i18n/index.js';
import { UpiQr, UpiButton, UpiAppStrip } from '../components/Pay.jsx';
import { DocSheet, Invoice, CustomerStatement } from '../components/Docs.jsx';
import { ReviewBox } from '../components/Reviews.jsx';

const SORTS = { new: 'Newest first', old: 'Oldest first', high: 'Amount: high to low', low: 'Amount: low to high', rest: 'Restaurant A–Z' };
export function OrdersList({ orders, nav, openHisab }) {
  const { user, askLogin, config } = useApp();
  const [st, setSt] = useState('all');
  const [sort, setSort] = useState('new');
  const [rest, setRest] = useState('');
  const [q, setQ] = useState('');
  const [hisab, setHisab] = useState(!!openHisab);
  const [per, setPer] = useState('all');
  const [from, setFrom] = useState(ymd(new Date(new Date().getFullYear(), 0, 1)));
  const [to, setTo] = useState(ymd(new Date()));
  if (!user) return <div className="page"><div className="page-head"><h2>Orders</h2></div><Empty icon="receipt" title="Log in to see your orders" action={<button className="btn primary" onClick={askLogin}>Log in</button>} /></div>;
  const all = (orders || []).filter(visibleFor('customer'));
  const rests = [...new Map(all.map((o) => [o.restaurantId, o.restaurantName])).entries()];
  const ql = q.trim().toLowerCase();
  const list = all.filter((o) => (st === 'all' ? true : st === 'active' ? ACTIVE.includes(o.status) : st === 'cancelled' ? ['cancelled', 'rejected'].includes(o.status) : o.status === st))
    .filter((o) => !rest || o.restaurantId === rest)
    .filter((o) => { if (per === 'all') return true; const [a, b] = rangeOf(per, from, to); return (o.day || '') >= a && (o.day || '') <= b; })
    .filter((o) => !ql || o.restaurantName.toLowerCase().includes(ql) || (o.code || '').toLowerCase().includes(ql) || o.items.some((x) => x.name.toLowerCase().includes(ql)))
    .sort((a, b) => (sort === 'old' ? a.createdMs - b.createdMs : sort === 'high' ? b.total - a.total : sort === 'low' ? a.total - b.total : sort === 'rest' ? a.restaurantName.localeCompare(b.restaurantName) || b.createdMs - a.createdMs : b.createdMs - a.createdMs));
  const spent = all.filter((o) => o.status === 'delivered').reduce((x, o) => x + Number(o.total || 0), 0);
  return (
    <div className="page">
      <div className="page-head"><h2>Your orders</h2></div>
      <div className="pad-x">
        {all.length > 0 && (() => {
          const done = all.filter((o) => o.status === 'delivered');
          const y = String(new Date().getFullYear()); const m = ymd(new Date()).slice(0, 7);
          const sum = (l) => l.reduce((x, o) => x + Number(o.total || 0), 0);
          const yl = done.filter((o) => (o.day || '').startsWith(y)); const ml = done.filter((o) => (o.day || '').startsWith(m));
          return (
            <div className="hisab-card">
              <div className="hc-head"><span className="hc-ic"><Icon name="wallet" size={20} /></span><b className="grow">My order hisab</b><button className="btn small light" onClick={() => setHisab(true)}>Full hisab / PDF</button></div>
              <div className="hc-grid">
                <div><small>This month</small><b>{rupee(sum(ml))}</b><span>{`${ml.length} orders`}</span></div>
                <div><small>{`This year (${y})`}</small><b>{rupee(sum(yl))}</b><span>{`${yl.length} orders`}</span></div>
                <div><small>All time</small><b>{rupee(spent)}</b><span>{`${done.length} orders`}</span></div>
              </div>
            </div>
          );
        })()}
        {all.length > 0 && (
          <div className="ord-tools">
            <div className="rp-search" style={{ margin: 0 }}><Icon name="search" size={18} /><input placeholder="Search dish, restaurant or order no." value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <div className="date-filter">
              <Icon name="clock" size={16} />
              <select value={per} onChange={(e) => setPer(e.target.value)}>
                {[['all', 'All time'], ['month', 'This month'], ['lastmonth', 'Last month'], ['year', 'This year'], ['lastyear', 'Last year'], ['custom', 'Choose dates']].map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}
              </select>
            </div>
            {per === 'custom' && <div className="row gap"><Field label="From"><input className="input" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></Field><Field label="To"><input className="input" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></Field></div>}
            <div className="chip-row wrap" style={{ padding: 0 }}>
              {[['all', 'All'], ['active', 'Active'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled']].map(([k, l]) => <button key={k} className={'fchip' + (st === k ? ' on' : '')} onClick={() => setSt(k)}>{l}</button>)}
            </div>
            <div className="row gap">
              <label className="sel grow"><Icon name="sort" size={16} /><select value={sort} onChange={(e) => setSort(e.target.value)}>{Object.entries(SORTS).map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select></label>
              {rests.length > 1 && <label className="sel grow"><Icon name="store" size={16} /><select value={rest} onChange={(e) => setRest(e.target.value)}><option value="">{t('All restaurants')}</option>{rests.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></label>}
            </div>
            <p className="tiny muted">{`${list.length} of ${all.length} orders`}{list.length ? ` · ${rupee(list.filter((o) => o.status === 'delivered').reduce((x, o) => x + Number(o.total || 0), 0))}` : ''}</p>
          </div>
        )}
        {orders === undefined && [1, 2].map((i) => <div key={i} className="order-card skeleton" style={{ height: 110 }} />)}
        {orders && !all.length && <Empty icon="receipt" title="No orders yet" text="Your hot, fresh food is just a few taps away." />}
        {list.map((o, i) => (
          <div key={o.id} className="oc-wrap">
            <button className="order-card" style={{ animationDelay: Math.min(i, 8) * 50 + 'ms' }} onClick={() => nav.track(o.id)}>
              <div className="row between"><b data-notr="">{o.restaurantName}</b><StatusChip s={o.status} /></div>
              <p className="small muted">{o.items.map((x) => `${tr(x.name)} × ${x.qty}`).join(', ')}</p>
              <div className="row between small"><span className="muted">{fmtDateTime(o.createdMs)} · <span data-notr="">#{o.code}</span></span><b>{rupee(o.total)}</b></div>
            </button>
            {!ACTIVE.includes(o.status) && <HideOrderBtn o={o} role="customer" />}
          </div>
        ))}
      </div>
      {hisab && <OrderHisab orders={all} config={config} user={user} onClose={() => setHisab(false)} />}
    </div>
  );
}

/* customer's own spending: by month / year / custom dates, with PDF */
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function rangeOf(k, from, to) {
  const n = new Date(); const y = n.getFullYear(); const m = n.getMonth();
  if (k === 'month') return [ymd(new Date(y, m, 1)), ymd(n)];
  if (k === 'lastmonth') return [ymd(new Date(y, m - 1, 1)), ymd(new Date(y, m, 0))];
  if (k === 'year') return [`${y}-01-01`, ymd(n)];
  if (k === 'lastyear') return [`${y - 1}-01-01`, `${y - 1}-12-31`];
  if (k === 'custom') return [from || '2020-01-01', to || ymd(n)];
  return ['2020-01-01', ymd(n)];
}
function OrderHisab({ orders, config, user, onClose }) {
  const [k, setK] = useState('all');
  const [from, setFrom] = useState(ymd(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [to, setTo] = useState(ymd(new Date()));
  const [pdf, setPdf] = useState(false);
  const [a, b] = rangeOf(k, from, to);
  const list = orders.filter((o) => o.status === 'delivered' && (o.day || '') >= a && (o.day || '') <= b).sort((x, y) => y.createdMs - x.createdMs);
  const sum = (key) => list.reduce((x, o) => x + Number(o[key] || 0), 0);
  const byRest = Object.values(list.reduce((m, o) => { const r = (m[o.restaurantId] = m[o.restaurantId] || { name: o.restaurantName, n: 0, amt: 0 }); r.n++; r.amt += Number(o.total || 0); return m; }, {})).sort((x, y) => y.amt - x.amt);
  const byMonth = Object.entries(list.reduce((m, o) => { const mk = (o.day || '').slice(0, 7); m[mk] = (m[mk] || 0) + Number(o.total || 0); return m; }, {})).sort().reverse();
  const top = Object.entries(list.flatMap((o) => o.items).reduce((m, x) => { m[x.name] = (m[x.name] || 0) + x.qty; return m; }, {})).sort((x, y) => y[1] - x[1]).slice(0, 5);
  const label = k === 'custom' ? `${a} to ${b}` : t({ all: 'All time', month: 'This month', lastmonth: 'Last month', year: 'This year', lastyear: 'Last year' }[k]);
  return (
    <Sheet open onClose={onClose} title="My order hisab" full>
      <div className="chip-row wrap">
        {[['all', 'All time'], ['month', 'This month'], ['lastmonth', 'Last month'], ['year', 'This year'], ['lastyear', 'Last year'], ['custom', 'Choose dates']].map(([x, l]) => <button key={x} className={'fchip' + (k === x ? ' on' : '')} onClick={() => setK(x)}>{l}</button>)}
      </div>
      {k === 'custom' && (
        <div className="row gap"><Field label="From"><input className="input" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></Field><Field label="To"><input className="input" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></Field></div>
      )}
      <div className="money-grid">
        <div className="mg big"><small>Total spent</small><b>{rupee(sum('total'))}</b><span>{`${list.length} orders delivered`}</span></div>
        <div className="mg"><small>Average order</small><b>{rupee(list.length ? Math.round(sum('total') / list.length) : 0)}</b></div>
        <div className="mg green"><small>Saved with coupons</small><b>{rupee(sum('discount'))}</b></div>
        <div className="mg"><small>GST paid</small><b>{rupee(Math.round(sum('gst') * 100) / 100)}</b></div>
        <div className="mg"><small>Calories ordered</small><b>{`${Math.round(sum('kcal')).toLocaleString('en-IN')}`}</b><span>kcal</span></div>
      </div>
      {byRest.length > 0 && <div className="card"><h4>By restaurant</h4>{byRest.map((r) => <div key={r.name} className="bill small"><span data-notr="">{`${r.name} (${r.n})`}</span><span>{rupee(r.amt)}</span></div>)}</div>}
      {byMonth.length > 1 && <div className="card"><h4>By month</h4>{byMonth.map(([mk, amt]) => <div key={mk} className="bill small"><span>{new Date(mk + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span><span>{rupee(amt)}</span></div>)}</div>}
      {top.length > 0 && <div className="card"><h4>Your favourite dishes</h4>{top.map(([n, c]) => <div key={n} className="bill small"><span>{tr(n)}</span><span>{`× ${c}`}</span></div>)}</div>}
      {!list.length && <p className="muted center">No delivered orders in this period</p>}
      {list.length > 0 && <button className="btn primary block lg" onClick={() => setPdf(true)}><Icon name="download" size={18} /> Statement PDF</button>}
      {pdf && <DocSheet open onClose={() => setPdf(false)} title="Order statement" fileName={`FoodGaon-orders-${a}-${b}.pdf`}><CustomerStatement list={list} label={label} range={[a, b]} user={user} config={config} /></DocSheet>}
    </Sheet>
  );
}

const STEPS = [
  { k: 'placed', label: 'Order placed', icon: 'receipt' },
  { k: 'accepted', label: 'Accepted & cooking', icon: 'fire' },
  { k: 'ready', label: 'Food ready', icon: 'bag' },
  { k: 'picked', label: 'On the way', icon: 'bike' },
  { k: 'delivered', label: 'Delivered', icon: 'home' },
];
const stepIndex = (s) => ({ placed: 0, accepted: 1, preparing: 1, ready: 2, picked: 3, delivered: 4 }[s] ?? 0);

export function TrackOrder({ id, fresh, nav }) {
  const toast = useToast();
  const o = useDoc('orders', id);
  const rider = useDoc('riderLoc', o?.riderPhone && ['accepted', 'preparing', 'ready', 'picked'].includes(o?.status) ? o.riderPhone : null);
  const [party, setParty] = useState(!!fresh);
  const [cancel, setCancel] = useState(false);
  const [bill, setBill] = useState(false);
  const { config, user } = useApp();
  const last = useRef(null);
  useEffect(() => { if (party) { const x = setTimeout(() => setParty(false), 2600); return () => clearTimeout(x); } }, [party]);
  useEffect(() => {
    if (!o) return;
    if (last.current && last.current !== o.status) systemNotify('FoodGaon', t(STATUS[o.status]?.label || o.status));
    last.current = o.status;
  }, [o?.status]); // eslint-disable-line

  if (o === undefined) return <div className="page"><TopBar onBack={nav.back} title="Order" /><div className="skeleton" style={{ height: 240, margin: 16 }} /></div>;
  if (o === null) return <div className="page"><TopBar onBack={nav.back} title="Order" /><Empty title="Order not found" /></div>;

  const idx = stepIndex(o.status);
  const dead = o.status === 'cancelled' || o.status === 'rejected';
  const live = ACTIVE.includes(o.status);
  const restP = o.restLat ? { id: 'rest', kind: 'rest', lat: o.restLat, lng: o.restLng } : null;
  const homeP = o.address?.lat ? { id: 'home', kind: 'home', lat: o.address.lat, lng: o.address.lng } : null;
  const riderP = rider?.lat && o.status === 'picked' ? { id: 'rider', kind: 'rider', lat: rider.lat, lng: rider.lng } : null;
  const eta = etaText(o, rider, homeP);

  const rate = async (n) => { try { await patch('orders', o.id, { rating: n }); toast(t('Thanks for rating!')); } catch { toast(t('Could not save'), 'err'); } };

  return (
    <div className="page track-page">
      {party && <OrderParty />}
      <TopBar onBack={nav.back} title={`Order #${o.code}`} />
      <div className={'track-hero tone-' + (dead ? 'red' : o.status === 'delivered' ? 'green' : 'orange')}>
        <div className="th-status">
          {live && <span className="pulse-dot" />}
          <div><b>{t(STATUS[o.status]?.label || o.status)}</b>{eta && live && <small>{eta}</small>}</div>
        </div>
        {o.status === 'picked' && <div className="road"><span className="scooter"><Icon name="bike" size={30} /></span></div>}
        {(o.status === 'accepted' || o.status === 'preparing') && <div className="cooking"><span /><span /><span /><Icon name="fire" size={34} /></div>}
      </div>

      {(restP || homeP) && live && <MapView height={220} points={[restP, homeP, riderP].filter(Boolean)} className="track-map" />}

      <div className="pad-x">
        {!dead && (
          <div className="card steps-card">
            {STEPS.map((s, i) => (
              <div key={s.k} className={'tstep' + (i < idx ? ' done' : i === idx ? ' cur' : '')}>
                <span className="ts-ic"><Icon name={i < idx ? 'check' : s.icon} size={16} stroke={2.6} /></span>
                <span className="grow">{s.label}</span>
                <small className="muted">{o.timeline?.[s.k] ? fmtTime(o.timeline[s.k]) : s.k === 'accepted' && o.timeline?.preparing ? fmtTime(o.timeline.preparing) : ''}</small>
              </div>
            ))}
          </div>
        )}
        {dead && <div className="alert alert-red">{o.status === 'rejected' ? `Sorry, the restaurant could not take this order. ${o.cancelReason || ''}` : 'This order was cancelled.'}</div>}
        {dead && o.payment === 'online' && o.paid && <div className="alert alert-amber">{o.rzpRefundId ? t('Your money is being returned to the same account/UPI. It usually takes 5–7 working days.') : t('Your refund will start shortly.')}</div>}

        {o.riderPhone && live && <RiderCard o={o} />}
        )}
        <div className="card person">
          <span className="avatar"><Icon name="store" size={22} /></span>
          <div className="grow"><b data-notr="">{o.restaurantName}</b><small className="muted" data-notr="">{o.restaurantAddr}</small></div>
          {o.restaurantPhone && <WaBtn phone={o.restaurantPhone} text={`नमस्ते, मेरा FoodGaon ऑर्डर #${o.code} के बारे में…`} label="WhatsApp restaurant" />}
          {o.restaurantPhone && <a className="icon-btn round" href={tel(o.restaurantPhone)} aria-label="Call restaurant"><Icon name="phone" size={20} /></a>}
        </div>

        <PayBox o={o} />

        {o.status === 'delivered' && !o.rating && <ReviewBox o={o} user={user} />}
        {o.rating > 0 && (
          <div className="card review-done" data-notr="" lang="hi">
            <span className="rev-stars big">{'★'.repeat(o.rating)}<i>{'★'.repeat(5 - o.rating)}</i></span>
            {o.review && <p>“{o.review}”</p>}
            {(o.reviewTags || []).length > 0 && <div className="rev-mini">{o.reviewTags.map((tg) => <span key={tg}>{tg}</span>)}</div>}
            <small className="muted">आपकी समीक्षा के लिए धन्यवाद 🙏</small>
          </div>
        )}

        <div className="card">
          <h4>Order details</h4>
          {o.items.map((x) => (
            <div key={x.id} className="bill"><span><VegMark size={11} /> {x.name} × {x.qty}</span><span>{lineText(x)}</span></div>
          ))}
          {o.discount > 0 && <div className="bill t-green"><span>{`Coupon ${o.offerCode}`}</span><span>− {rupee(o.discount)}</span></div>}
          {o.gst > 0 && <div className="bill muted small"><span>{o.gstIncluded ? `Includes GST ${o.gstPct || 5}%` : `GST ${o.gstPct || 5}%`}</span><span>{rupee(o.gst)}</span></div>}
          <div className="bill"><span>Delivery fee</span><span className="t-green">{o.deliveryFee ? rupee(o.deliveryFee) : 'FREE'}</span></div>
          <div className="bill total"><span>{o.payment === 'cod' ? 'To pay in cash' : o.payment === 'online' ? (o.paid ? 'Paid online' : 'Online payment pending') : o.payment === 'upi_rider' ? 'To pay by UPI on delivery' : o.paid || o.paymentClaim ? 'Paid by UPI' : 'To pay by UPI'}</span><span>{rupee(o.total)}</span></div>
          <button className="btn ghost block" onClick={() => setBill(true)}><Icon name="receipt" size={18} /> View bill / Download PDF</button>
          {['delivered', 'cancelled', 'rejected'].includes(o.status) && (
            <button className="btn primary block" onClick={() => { cartStore.clear(); o.items.forEach((x) => { for (let k = 0; k < x.qty; k++) cartStore.add({ ...x, restaurantId: o.restaurantId }); }); nav.openCart(); }}><Icon name="bag" size={18} /> Order again</button>
          )}
          {o.kcal > 0 && <p className="tiny muted"><Icon name="fire" size={12} /> {`About ${o.kcal} kcal`}</p>}
          <p className="tiny muted">{fmtDateTime(o.createdMs)} · <span data-notr="">{o.address?.line}</span></p>
          {o.note && <p className="tiny muted">{`Note: ${o.note}`}</p>}
        </div>

        {o.status === 'placed' && <button className="btn ghost danger-text block" onClick={() => setCancel(true)}>Cancel order</button>}
      </div>
      <Confirm open={cancel} onClose={() => setCancel(false)} danger title="Cancel this order?" text="The restaurant has not accepted it yet, so you can cancel for free." okText="Yes, cancel"
        onOk={() => setStatus(o, 'cancelled', { cancelReason: 'Cancelled by customer' }).catch(() => toast(t('Could not cancel. The restaurant may have accepted already.'), 'err'))} />
      <DocSheet open={bill} onClose={() => setBill(false)} title="Your bill" fileName={`FoodGaon-bill-${o.code}.pdf`}><Invoice o={o} config={config} /></DocSheet>
    </div>
  );
}

/* payment straight to the restaurant's UPI */
function PayBox({ o }) {
  const toast = useToast();
  const [show, setShow] = useState(false);
  if (o.payment === 'cod' || o.payment === 'online' || ['rejected', 'cancelled'].includes(o.status)) return null;
  if (o.paid) return <div className="card pay-box ok"><Icon name="shield" size={22} /><div><b>Payment received</b><small>The restaurant confirmed your UPI payment</small></div></div>;
  const claim = async () => { try { await patch('orders', o.id, { paymentClaim: 'paid', claimMs: Date.now() }); toast(t('Thanks! The restaurant will confirm your payment.')); } catch { toast(t('Could not save'), 'err'); } };
  const ref = o.code;
  if (o.paymentClaim) return <div className="card pay-box wait"><Icon name="clock" size={22} /><div><b>Payment done — waiting for restaurant to confirm</b><small>Keep the UPI receipt until the food arrives</small></div></div>;
  if (o.payment === 'upi_now') return (
    <div className="card pay-box">
      <b>Complete your UPI payment</b>
      <p className="tiny muted">{`Pay ${rupee(o.total)} directly to ${o.restaurantName}`}</p>
      <UpiAppStrip />
      <UpiButton extra={o.restUpiParams} upiId={o.restUpiId} upiName={o.restUpiName} amount={o.total} note={`FoodGaon order ${ref}`} refId={ref} label="Open UPI app" />
      <div className="row gap"><button className="btn ghost grow small" onClick={() => setShow(!show)}>{show ? 'Hide QR' : 'Show QR'}</button><button className="btn green grow small" onClick={claim}><Icon name="check" size={16} /> I have paid</button></div>
      {show && <UpiQr extra={o.restUpiParams} upiId={o.restUpiId} upiName={o.restUpiName} amount={o.total} note={`FoodGaon order ${ref}`} refId={ref} />}
    </div>
  );
  // upi on delivery
  return (
    <div className="card pay-box">
      <b>Pay by UPI when your food arrives</b>
      <p className="tiny muted">{`${rupee(o.total)} goes directly to ${o.restaurantName}. The delivery partner will also show the QR.`}</p>
      {o.status === 'picked' && <UpiAppStrip />}
      {o.status === 'picked' && <UpiButton extra={o.restUpiParams} upiId={o.restUpiId} upiName={o.restUpiName} amount={o.total} note={`FoodGaon order ${ref}`} refId={ref} label="Pay now" />}
      {o.status === 'picked' && <button className="btn green block small" onClick={claim}><Icon name="check" size={16} /> I have paid</button>}
    </div>
  );
}

/* delivery partner with photo, vehicle number and vehicle photo */
function RiderCard({ o }) {
  const p = useDoc('riders', o.riderPhone);
  const [show, setShow] = useState(false);
  const veh = { bike: 'Bike', scooter: 'Scooter', cycle: 'Cycle' }[p?.vehicleType] || '';
  return (
    <div className="card person rider-person">
      <button className="avatar big" onClick={() => setShow(true)} aria-label="See photo">{p?.photo ? <img src={p.photo} alt="" /> : <Icon name="bike" size={22} />}</button>
      <div className="grow">
        <b data-notr="">{p?.name || o.riderName || 'Delivery partner'}</b>
        <small className="muted">{[t('Your delivery partner'), veh && t(veh), p?.vehicle].filter(Boolean).join(' · ')}</small>
        {(p?.photo || p?.vehiclePhoto) && <button className="link small" onClick={() => setShow(true)}>See photo & vehicle</button>}
      </div>
      <WaBtn phone={o.riderPhone} text={`भैया, मेरा FoodGaon ऑर्डर #${o.code}…`} label="WhatsApp delivery partner" />
      <a className="icon-btn round green" href={tel(o.riderPhone)} aria-label="Call delivery partner"><Icon name="phone" size={20} /></a>
      <Sheet open={show} onClose={() => setShow(false)} title={p?.name || o.riderName || 'Delivery partner'}>
        {p?.photo && <img className="rider-big" src={p.photo} alt="" />}
        {p?.vehiclePhoto && <><p className="small"><b>{veh || 'Vehicle'}</b> <span data-notr="">{p.vehicle}</span></p><img className="rider-big" src={p.vehiclePhoto} alt="" /></>}
        {!p?.photo && !p?.vehiclePhoto && <p className="muted">No photos added yet</p>}
      </Sheet>
    </div>
  );
}

function etaText(o, rider, homeP) {
  if (o.status === 'picked' && rider?.lat && homeP) {
    const d = km(rider, homeP);
    if (d != null) return `${Math.max(2, Math.round((d / 18) * 60) + 2)} min away · ${d.toFixed(1)} km`;
  }
  if (o.status === 'placed') return 'Usually accepted within 2 minutes';
  if (['accepted', 'preparing', 'ready'].includes(o.status)) {
    const base = (o.timeline?.accepted || o.timeline?.preparing || ms(o.createdMs)) + ((o.prepMins || 20) + 12) * 60000;
    const m = Math.max(5, Math.round((base - Date.now()) / 60000));
    return `Arriving in about ${m} min`;
  }
  return '';
}

function OrderParty() {
  const bits = Array.from({ length: 36 });
  return (
    <div className="party">
      <div className="confetti">{bits.map((_, i) => <i key={i} style={{ left: (i * 37) % 100 + '%', animationDelay: (i % 9) * 0.08 + 's', background: ['#e8461a', '#ffb627', '#1e9e55', '#ff7ab6', '#3d8bfd'][i % 5] }} />)}</div>
      <div className="party-card">
        <svg className="check-draw" viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" /><path d="M14 27l8 8 16-17" /></svg>
        <b>Order placed!</b>
        <span>Sending it to the restaurant…</span>
      </div>
    </div>
  );
}

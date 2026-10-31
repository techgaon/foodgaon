import { HideOrderBtn, visibleFor } from '../components/OrderActions.jsx';
import React, { useEffect, useRef, useState } from 'react';
import { Icon, Toggle, Empty, useToast, StatusChip, Logo, BottomNav, Confirm, WaBtn } from '../ui.jsx';
import { useApp, RoleSwitchButton } from '../App.jsx';
import { useList, setStatus, useRestaurants, useDoc , isRealOrder } from '../lib/data.js';
import { UpiQr, UpiEditor } from '../components/Pay.jsx';
import PhotoPick from '../components/PhotoPick.jsx';
import { Field, Sheet } from '../ui.jsx';
import { compressImage, fmtDateTime } from '../lib/utils.js';
import { put, patch } from '../lib/fb.js';
import { watchPosition } from '../lib/native.js';
import { rupee, fmtTime, tel, plain, mapsDir, km, todayKey, ding, unlockAudio, systemNotify, askNotifyPermission, LS } from '../lib/utils.js';
import MapView from '../components/MapView.jsx';
import { t } from '../i18n/index.js';

const OPEN = ['accepted', 'preparing', 'ready'];

export default function RiderApp() {
  const { phone, staff, user, logout } = useApp();
  const toast = useToast();
  const name = staff?.name || user?.displayName || 'Rider';
  const mine = useList('orders', [['riderPhone', '==', phone]], [phone]);
  const riderOf = staff?.riderOf || '';
  // only orders of MY restaurant, as soon as the restaurant accepts them
  const free0 = useList('orders', riderOf ? [['riderPhone', '==', ''], ['restaurantId', '==', riderOf]] : null, [riderOf]);
  const free = free0 && free0.filter(isRealOrder);
  const shop = (useRestaurants() || []).find((r) => r.id === riderOf);
  const [online, setOnline] = useState(() => LS.get('pp_online', true));
  const [pos, setPos] = useState(null);
  const [tab, setTab] = useState('live');
  const lastSent = useRef(0);
  const seen = useRef(null);

  useEffect(() => { askNotifyPermission(); window.addEventListener('pointerdown', unlockAudio, { once: true }); }, []);
  // live GPS while online
  useEffect(() => {
    LS.set('pp_online', online);
    put('riderLoc', phone, { online, name, ts: Date.now() }).catch(() => {});
    if (!online) return;
    let stop = () => {};
    watchPosition((p) => {
      setPos(p);
      if (Date.now() - lastSent.current > 8000) { lastSent.current = Date.now(); put('riderLoc', phone, { lat: p.lat, lng: p.lng, acc: p.acc || 0, ts: Date.now(), online: true, name }).catch(() => {}); }
    }).then((s) => { stop = s; }).catch((e) => toast(t(e.message || 'Location permission denied'), 'err'));
    return () => stop();
  }, [online, phone]); // eslint-disable-line

  const active = (mine || []).filter((o) => [...OPEN, 'picked'].includes(o.status)).sort((a, b) => a.createdMs - b.createdMs);
  const avail = (free || []).filter((o) => OPEN.includes(o.status)).sort((a, b) => a.createdMs - b.createdMs);
  // alert when an order is assigned to me / becomes available
  useEffect(() => {
    if (!mine || !free) return;
    const ids = new Set([...active, ...avail].map((o) => o.id));
    if (seen.current && online) {
      const nw = [...ids].filter((x) => !seen.current.has(x));
      if (nw.length) { ding(3); systemNotify(t('New delivery'), t('Open FoodGaon to see the order')); }
    }
    seen.current = ids;
  }, [mine, free]); // eslint-disable-line

  const today = (mine || []).filter((o) => o.status === 'delivered' && o.day === todayKey());
  const cash = today.filter((o) => o.payment === 'cod').reduce((a, o) => a + o.total, 0);

  return (
    <div className="panel">
      <header className="panel-head rider-head">
        <div className="ph-row">
          <Logo size={34} />
          <div className="grow"><b data-notr="">{name}</b><small>Delivery partner</small></div>
          <RoleSwitchButton />
          <button className="icon-btn light" onClick={logout} aria-label="Log out"><Icon name="logout" /></button>
        </div>
        <div className={'open-switch' + (online ? ' on' : '')}>
          <span><b>{online ? 'You are online' : 'You are offline'}</b><small>{online ? (pos ? 'Sharing live location with customers' : 'Getting GPS…') : 'Go online to get orders'}</small></span>
          <Toggle on={online} onChange={setOnline} label="Online" />
        </div>
      </header>

      {tab === 'live' && (
        <div className="pad-x page-anim">
          <div className="kpis">
            <div><b>{active.length}</b><small>My orders</small></div>
            <div><b>{today.length}</b><small>Delivered today</small></div>
            <div><b>{rupee(cash)}</b><small>Cash collected</small></div>
          </div>
          {online && <p className="tiny muted center">Keep this screen open while delivering so the customer can see you on the map.</p>}
          {active.map((o) => <DeliveryCard key={o.id} o={o} me={pos} />)}
          {avail.length > 0 && <h3 className="board-h new">Available orders</h3>}
          {avail.map((o) => <DeliveryCard key={o.id} o={o} me={pos} available phone={phone} name={name} />)}
          {!active.length && !avail.length && <Empty icon="bike" title="No deliveries right now" text={online ? 'New orders will ring here.' : 'Go online to receive orders.'} />}
        </div>
      )}
      {tab === 'money' && <RiderMoney phone={phone} mine={mine} shop={shop} today={today} />}
      {tab === 'profile' && <RiderProfile phone={phone} name={name} shop={shop} />}
      <BottomNav value={tab} onChange={setTab} tabs={[{ id: 'live', icon: 'bike', label: 'Deliveries', badge: avail.length }, { id: 'money', icon: 'wallet', label: 'My pay' }, { id: 'profile', icon: 'user', label: 'Profile' }]} />
    </div>
  );
}

function DeliveryCard({ o, me, available, phone, name }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [refuse, setRefuse] = useState(false);
  const [qr, setQr] = useState(false);
  const shop = (useRestaurants() || []).find((r) => r.id === o.restaurantId) || {};
  const upiId = shop.upiId || o.restUpiId;
  const rest = o.restLat ? { lat: o.restLat, lng: o.restLng } : null;
  const home = o.address?.lat ? { lat: o.address.lat, lng: o.address.lng } : null;
  const run = async (fn) => { setBusy(true); try { await fn(); } catch (e) { console.warn(e); toast(t('Could not save. Maybe another partner took this order.'), 'err'); } setBusy(false); };
  const d1 = km(me, rest); const d2 = km(rest, home);
  const picked = o.status === 'picked';
  return (
    <div className={'dcard' + (available ? ' avail' : '')}>
      <div className="row between"><b>#{o.code}</b><StatusChip s={o.status} /></div>
      {(rest || home) && <MapView height={150} points={[rest && { id: 'r', kind: 'rest', ...rest }, home && { id: 'h', kind: 'home', ...home }, me && { id: 'me', kind: 'rider', ...me }].filter(Boolean)} />}
      <div className={'leg' + (picked ? ' done' : '')}>
        <span className="leg-ic"><Icon name="store" size={18} /></span>
        <div className="grow"><small>PICK UP{d1 != null ? ` · ${d1.toFixed(1)} km` : ''}</small><b data-notr="">{o.restaurantName}</b><p className="tiny muted" data-notr="">{o.restaurantAddr}</p></div>
        {rest && <a className="icon-btn round" href={mapsDir(rest)} target="_blank" rel="noreferrer" aria-label="Navigate to restaurant"><Icon name="nav" size={18} /></a>}
        {o.restaurantPhone && <WaBtn phone={o.restaurantPhone} text={`ऑर्डर #${o.code}`} />}
        {o.restaurantPhone && <a className="icon-btn round" href={tel(o.restaurantPhone)} aria-label="Call restaurant"><Icon name="phone" size={18} /></a>}
      </div>
      <div className="leg">
        <span className="leg-ic home"><Icon name="home" size={18} /></span>
        <div className="grow"><small>DROP{d2 != null ? ` · ${d2.toFixed(1)} km from shop` : ''}</small><b data-notr="">{o.address?.name || o.customerName}</b><p className="tiny muted" data-notr="">{o.address?.line}</p></div>
        {home ? <a className="icon-btn round" href={mapsDir(home)} target="_blank" rel="noreferrer" aria-label="Navigate to customer"><Icon name="nav" size={18} /></a> : <span className="tiny t-red">No GPS</span>}
        <WaBtn phone={o.address?.phone || o.customerPhone} text={`नमस्ते, मैं FoodGaon से आपका ऑर्डर #${o.code} लेकर आ रहा हूँ।`} />
        <a className="icon-btn round green" href={tel(o.address?.phone || o.customerPhone)} aria-label="Call customer"><Icon name="phone" size={18} /></a>
      </div>
      <div className="row between small"><span>{`${o.items.reduce((a, x) => a + x.qty, 0)} items`}</span>
        <b>{o.payment === 'cod' ? `Collect cash ${rupee(o.total)}` : o.payment === 'upi_rider' ? `Collect UPI ${rupee(o.total)}` : o.paid || o.paymentClaim ? 'Prepaid' : `UPI pending ${rupee(o.total)}`}</b></div>
      {o.payment !== 'cod' && !o.paid && picked && (upiId || shop.upiQr) && (
        <>
          <button className="btn ghost block" onClick={() => setQr(!qr)}><Icon name="upi" size={18} /> {qr ? t('Hide QR') : t('Show restaurant UPI QR to customer')}</button>
          {qr && <UpiQr extra={shop.upiParams || o.restUpiParams} upiId={upiId} upiName={shop.upiName || o.restUpiName} upiQr={shop.upiQr} amount={o.total} note={`FoodGaon order ${o.code}`} refId={o.code} size={240} />}
        </>
      )}

      {available && <button className="btn primary block" disabled={busy} onClick={() => run(() => patch('orders', o.id, { riderPhone: phone, riderName: name }))}><Icon name="check" size={18} /> Accept delivery</button>}
      {!available && !picked && (
        <button className="btn primary block" disabled={busy || o.status !== 'ready'} onClick={() => run(() => setStatus(o, 'picked'))}>
          {o.status === 'ready' ? 'Picked up the food' : 'Waiting for food to be ready…'}
        </button>
      )}
      {!available && picked && <button className="btn green block lg" disabled={busy} onClick={() => setDone(true)}><Icon name="check" size={18} /> Delivered</button>}
      {!available && picked && o.payment === 'cod' && <button className="btn ghost small block danger-text" disabled={busy} onClick={() => setRefuse(true)}>Customer refused / not at home</button>}
      <Confirm open={refuse} onClose={() => setRefuse(false)} danger title="Customer refused the order?" okText="Yes, refused"
        text="Use this only if the customer did not take the food or could not be reached. Bring the food back to the shop."
        onOk={() => run(() => setStatus(o, 'cancelled', { refusedCod: true, cancelReason: 'Customer refused at the door' }))} />
      <Confirm open={done} onClose={() => setDone(false)} title="Mark as delivered?" okText="Yes, delivered"
        text={o.payment === 'cod' ? `Make sure you collected ${rupee(o.total)} from the customer.` : o.paid || o.paymentClaim ? 'Hand over the food to the customer.' : `Make sure the customer paid ${rupee(o.total)} by UPI to the restaurant.`}
        onOk={() => run(() => setStatus(o, 'delivered', o.payment === 'cod' ? { paid: true } : { paymentClaim: o.paymentClaim || 'rider' }))} />
    </div>
  );
}

const r2 = (n) => Math.round(n * 100) / 100;
/* delivery pay from the restaurant: earned (deliveries × rate), received, confirm receipt */
function RiderMoney({ phone, mine, shop, today }) {
  const toast = useToast();
  const pays = useList('riderPays', [['riderPhone', '==', phone]], [phone]);
  const done = (mine || []).filter((o) => o.status === 'delivered');
  const rate = Number(shop?.riderRate ?? 20);
  const earned = r2(done.length * rate);
  const got = r2((pays || []).filter((x) => x.status !== 'rejected').reduce((a, x) => a + Number(x.amount || 0), 0));
  const confirm = async (x) => { try { await patch('riderPays', x.id, { status: 'received', receivedMs: Date.now() }); toast(t('Thank you! Marked as received.')); } catch { toast(t('Could not save'), 'err'); } };
  return (
    <div className="pad-x page-anim">
      <div className="money-grid">
        <div className="mg big"><small>Total deliveries</small><b>{done.length}</b><span>{`${rupee(rate)} per delivery · ${shop?.name || ''}`}</span></div>
        <div className="mg"><small>Earned</small><b>{rupee(earned)}</b></div>
        <div className="mg"><small>Received</small><b>{rupee(got)}</b></div>
        <div className={'mg big' + (earned - got > 0 ? '' : ' green')}><small>Still to get</small><b>{rupee(Math.max(0, r2(earned - got)))}</b></div>
      </div>
      <div className="card">
        <h4>Payments from restaurant</h4>
        {(pays || []).sort((a, b) => b.createdMs - a.createdMs).map((x) => (
          <div key={x.id} className="sett-row">
            <div className="grow"><b>{rupee(x.amount)}</b><small className="muted">{`${fmtDateTime(x.createdMs)} · ${x.mode === 'cash' ? t('Cash') : 'UPI'}`}</small></div>
            {x.status === 'received' ? <em className="st-mini confirmed">{t('Received')}</em> : <button className="btn small green" onClick={() => confirm(x)}>Got it</button>}
          </div>
        ))}
        {pays && !pays.length && <p className="tiny muted">No payments yet</p>}
      </div>
      <div className="card">
        <h4>Delivered today</h4>
        {today.filter(visibleFor('rider')).map((o) => <div key={o.id} className="bill"><span>#{o.code} · {fmtTime(o.timeline?.delivered)}</span><span className="row gap" style={{ gap: 6 }}>{o.payment === 'cod' ? `${t('Cash')} ${rupee(o.total)}` : 'UPI'}<HideOrderBtn o={o} role="rider" /></span></div>)}
        {!today.length && <p className="muted small">Nothing yet today</p>}
      </div>
    </div>
  );
}

/* rider's own details: photo, vehicle, address and UPI (so the restaurant can pay) */
function RiderProfile({ phone, name, shop }) {
  const toast = useToast();
  const prof = useDoc('riders', phone);
  const [f, setF] = useState(null);
  useEffect(() => { if (prof !== undefined && !f) setF({ name: prof?.name || name, vehicle: prof?.vehicle || '', vehicleType: prof?.vehicleType || 'bike', vehiclePhoto: prof?.vehiclePhoto || '', address: prof?.address || '', photo: prof?.photo || '' }); }, [prof]); // eslint-disable-line
  if (!f) return <div className="pad"><div className="skeleton" style={{ height: 140 }} /></div>;
  const save = async () => { try { await put('riders', phone, { ...f, phone, riderOf: shop?.id || '' }); toast(t('Saved')); } catch { toast(t('Could not save'), 'err'); } };
  const pic = async (e) => { const file = e.target.files?.[0]; if (!file) return; try { setF({ ...f, photo: await compressImage(file, 400, 60000) }); } catch (er) { toast(t(er.message), 'err'); } };
  return (
    <div className="pad-x page-anim">
      <div className="card">
        <div className="row gap">
          <span className="avatar big">{f.photo ? <img src={f.photo} alt="" /> : <Icon name="user" size={30} />}</span>
          <div className="grow"><b data-notr="">{f.name}</b><small className="muted">{plain(phone)}{shop ? ` · ${shop.name}` : ''}</small></div>
        </div>
        <p className="tiny muted">Your photo — customers see it when you bring their food</p>
        <PhotoPick facing="user" maxSide={500} maxLen={80000} onPick={(photo) => setF({ ...f, photo })} />
        <Field label="Name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-notr="" /></Field>
        <h4 style={{ marginTop: 14 }}><Icon name="bike" size={18} /> Your vehicle</h4>
        <div className="seg">{[['bike', 'Bike'], ['scooter', 'Scooter'], ['cycle', 'Cycle']].map(([k, l]) => <button key={k} type="button" className={f.vehicleType === k ? 'on' : ''} onClick={() => setF({ ...f, vehicleType: k })}>{l}</button>)}</div>
        {f.vehicleType !== 'cycle' && <Field label="Vehicle number"><input className="input" value={f.vehicle} onChange={(e) => setF({ ...f, vehicle: e.target.value.toUpperCase() })} placeholder="UP 41 AB 1234" data-notr="" /></Field>}
        <div className="veh-photo">{f.vehiclePhoto ? <img src={f.vehiclePhoto} alt="" /> : <span className="qr-ph"><Icon name="bike" size={28} /><small>No photo</small></span>}</div>
        <p className="tiny muted">Vehicle photo — helps the customer spot you</p>
        <PhotoPick maxSide={700} maxLen={120000} onPick={(vehiclePhoto) => setF({ ...f, vehiclePhoto })} />
        <Field label="Address"><input className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} data-notr="" /></Field>
        <button className="btn primary block" onClick={save}>Save profile</button>
      </div>
      <UpiEditor value={prof || {}} title="Your UPI — get your delivery pay here" hint="The restaurant pays your delivery money to this UPI." onSave={(v) => put('riders', phone, { ...v, phone, name: f.name, riderOf: shop?.id || '' })} />
    </div>
  );
}

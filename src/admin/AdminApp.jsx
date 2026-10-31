import { createPortal } from 'react-dom';
import { useMenuPack } from '../lib/menuPack.js';
import { ClearTestOrders } from '../components/OrderActions.jsx';
import React, { useEffect, useMemo, useState } from 'react';
import { Icon, BottomNav, Toggle, Empty, Sheet, Field, useToast, Img, Logo, Confirm } from '../ui.jsx';
import { useApp, RoleSwitchButton } from '../App.jsx';
import { useRestaurants, useItems, useList, ACTIVE , isRealOrder } from '../lib/data.js';
import { put, patch, remove, bulk, getList, watchList, getOne } from '../lib/fb.js';
import { rupee, todayKey, dayKey, plain, unlockAudio, askNotifyPermission, fmtDateTime, tel, wa } from '../lib/utils.js';
import { RESTAURANTS, ITEMS, BANNERS, DEFAULT_CONFIG, STAFF, OFFERS, DEMO_OFFER_IDS, OLD_STAFF, TEST_DATA_BEFORE } from '../data/menu.js';
import { OrderCard, useNewOrderAlert, Earnings } from '../restaurant/RestaurantApp.jsx';
import MenuManager from '../restaurant/MenuManager.jsx';
import Team from '../restaurant/Team.jsx';
import MapView from '../components/MapView.jsx';
import Promos from './Promos.jsx';
import { DocSheet, GstReport } from '../components/Docs.jsx';
import { UpiEditor } from '../components/Pay.jsx';
import { dueOf } from '../restaurant/RestaurantApp.jsx';
import { t } from '../i18n/index.js';
import Applications, { usePartnerApps } from './Applications.jsx';
import { linkRestaurant, restaurantPayStatus } from '../lib/gateway.js';

export default function AdminApp() {
  const { logout } = useApp();
  const [tab, setTab] = useState('dash');
  const days = useMemo(() => [todayKey(), dayKey(Date.now() - 86400000)], []);
  const orders0 = useList('orders', [['day', 'in', days]], [days.join()]);
  const orders = orders0 && orders0.filter(isRealOrder);
  const newCount = useNewOrderAlert(orders, 'New order on FoodGaon!');
  useEffect(() => { askNotifyPermission(); window.addEventListener('pointerdown', unlockAudio, { once: true }); }, []);
  useAutoSeed();
  useMenuPack(useRestaurants(), () => true);
  useCleanup();
  useCodGuard();
  const apps = usePartnerApps();
  const newApps = (apps || []).filter((a) => a.status === 'submitted').length;
  useEffect(() => { window.__ppBack = () => { if (tab !== 'dash') { setTab('dash'); return true; } return false; }; return () => { window.__ppBack = null; }; });
  return (
    <div className="panel">
      <header className="panel-head admin-head">
        <div className="ph-row">
          <Logo size={34} />
          <div className="grow"><b>FoodGaon Admin</b><small data-notr="">TechGaon AI Services</small></div>
          <RoleSwitchButton />
          <button className="icon-btn light" onClick={logout} aria-label="Log out"><Icon name="logout" /></button>
        </div>
      </header>
      <div className="page-anim" key={tab}>
        {tab === 'dash' && <Dashboard orders={orders} go={setTab} />}
        {tab === 'orders' && <LiveOrders orders={orders} />}
        {tab === 'rest' && <Restaurants />}
        {tab === 'riders' && <Riders />}
        {tab === 'offers' && <Promos />}
        {tab === 'settings' && <Settings />}
      </div>
      <BottomNav value={tab} onChange={setTab} tabs={[
        { id: 'dash', icon: 'chart', label: 'Dashboard' },
        { id: 'orders', icon: 'receipt', label: 'Orders', badge: newCount },
        { id: 'rest', icon: 'store', label: 'Restaurants', badge: newApps },
        { id: 'riders', icon: 'bike', label: 'Riders' },
        { id: 'offers', icon: 'star', label: 'Offers' },
        { id: 'settings', icon: 'gear', label: 'Settings' },
      ]} />
    </div>
  );
}

/* when the app ships new starter dishes/offers, add the missing ones automatically (never overwrites edits) */
const SEED_V = 'v6';
/* one-time cleanup before real testing: delete all test orders & their records, remove old staff numbers */
const CLEAN_V = 'c1';
function useCleanup() {
  const toast = useToast();
  useEffect(() => {
    if (!TEST_DATA_BEFORE || localStorage.getItem('pp_clean') === CLEAN_V) return;
    (async () => {
      try {
        const cfg = await getOne('config', 'app');
        if (cfg?.cleanV === CLEAN_V) { localStorage.setItem('pp_clean', CLEAN_V); return; }
        const old = (l, k = 'createdMs') => l.filter((x) => !x[k] || x[k] < TEST_DATA_BEFORE);
        const [orders, reviews, pays, setts] = await Promise.all([getList('orders', []), getList('reviews', []), getList('riderPays', []), getList('settlements', [])]);
        const ops = [
          ...old(orders).map((o) => ['del', 'orders', o.id]),
          ...reviews.filter((r) => !orders.some((o) => o.id === r.id) || old(orders).some((o) => o.id === r.id)).map((r) => ['del', 'reviews', r.id]),
          ...old(pays).map((x) => ['del', 'riderPays', x.id]),
          ...setts.filter((x) => (x.createdMs || x.claimMs || 0) < TEST_DATA_BEFORE).map((x) => ['del', 'settlements', x.id]),
          ...OLD_STAFF.flatMap((ph) => [['del', 'staff', ph], ['del', 'riders', ph], ['del', 'riderLoc', ph]]),
        ];
        await bulk(ops);
        await bulk([['set', 'config', 'app', { cleanV: CLEAN_V, cleanedMs: Date.now() }]]);
        localStorage.setItem('pp_clean', CLEAN_V);
        toast(t('Old test orders cleared — ready for real testing'));
      } catch (e) { console.warn('cleanup', e); }
    })();
  }, []); // eslint-disable-line
}

function useAutoSeed() {
  const items = useItems();
  const rests = useRestaurants();
  const toast = useToast();
  useEffect(() => {
    if (!items || !rests || localStorage.getItem('pp_seed') === SEED_V) return;
    const haveI = new Set(items.map((i) => i.id)); const haveR = new Set(rests.map((r) => r.id));
    const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
    const ops = [
      ...RESTAURANTS.filter((r) => !haveR.has(r.id)).map((r) => ['set', 'restaurants', r.id, r]),
      // v4: FoodGaon — real restaurants get owner numbers, own riders, FSSAI/GST fields, 5 km radius, ₹50 minimum
      ...RESTAURANTS.filter((r) => haveR.has(r.id) && !r.demo).map((r) => {
        const cur = rests.find((x) => x.id === r.id) || {};
        const add = pick(r, ['ownerPhone', 'ownerName', 'riders', 'radiusKm', 'minOrder', 'riderRate', 'selfDelivery']);
        if (cur.fssai === undefined) add.fssai = ''; if (cur.gstin === undefined) add.gstin = '';
        return ['set', 'restaurants', r.id, add];
      }),
      ...ITEMS.filter((i) => !haveI.has(i.id)).map((i) => ['set', 'items', i.id, i]),
      ...ITEMS.filter((i) => haveI.has(i.id)).map((i) => { const cur = items.find((x) => x.id === i.id); const add = {}; if (!cur.gallery) add.gallery = i.gallery; if (!cur.story && i.story) add.story = i.story; return Object.keys(add).length ? ['set', 'items', i.id, add] : null; }).filter(Boolean),
      ...DEMO_OFFER_IDS.map((id) => ['del', 'offers', id]),
      ...BANNERS.filter((b) => b.id === 'b1').map((b) => ['set', 'banners', b.id, b]),
      ...STAFF.map((x) => ['set', 'staff', x.phone, x]),
      ['set', 'config', 'app', pick(DEFAULT_CONFIG, ['appName', 'firmName', 'firmAddress', 'supportEmail', 'otpMode', 'gstPct', 'commissionPct', 'commissionGstPct', 'restaurantDeliveryCharge', 'minOrder', 'radiusKm', 'upiName'])],
    ];
    bulk(ops).then(() => { localStorage.setItem('pp_seed', SEED_V); toast(t('FoodGaon setup updated')); }).catch((e) => console.warn('autoseed', e));
  }, [items, rests]); // eslint-disable-line
}

function Dashboard({ orders, go }) {
  const rests = useRestaurants();
  const today = (orders || []).filter((o) => o.day === todayKey());
  const del = today.filter((o) => o.status === 'delivered');
  const live = (orders || []).filter((o) => ACTIVE.includes(o.status));
  const sum = (l, k) => l.reduce((a, o) => a + Number(o[k] || 0), 0);
  const [riders, setRiders] = useState([]);
  useEffect(() => watchList('riderLoc', [['online', '==', true]], setRiders), []);
  return (
    <div className="pad-x">
      {rests && !rests.length && <SeedCard />}
      <div className="money-grid">
        <div className="mg big"><small>Today's orders</small><b>{today.length}</b><span>{`${del.length} delivered · ${live.length} live`}</span></div>
        <div className="mg"><small>Food sales</small><b>{rupee(sum(del, 'itemTotal'))}</b></div>
        <div className="mg"><small>Your commission</small><b className="t-green">{rupee(sum(del, 'commission'))}</b></div>
        <div className="mg"><small>Delivery charges</small><b>{rupee(sum(del, 'restDelivery'))}</b></div>
        <div className="mg"><small>Discounts you gave</small><b className="t-red">{rupee(del.filter((o) => o.discountBy === 'admin').reduce((a, o) => a + Number(o.discount || 0), 0))}</b></div>
        <div className="mg"><small>Cash with riders</small><b>{rupee(sum(del.filter((o) => o.payment === 'cod'), 'total'))}</b></div>
      </div>
      <div className="card">
        <div className="row between"><h4>Riders online</h4><button className="link small" onClick={() => go('riders')}>Manage</button></div>
        {riders.filter((r) => r.lat).length > 0
          ? <MapView height={200} line={false} points={[...(rests || []).filter((r) => r.lat).map((r) => ({ id: r.id, kind: 'rest', lat: r.lat, lng: r.lng })), ...riders.filter((r) => r.lat).map((r) => ({ id: 'rd' + r.id, kind: 'rider', lat: r.lat, lng: r.lng }))]} />
          : <p className="small muted">No rider online right now</p>}
        {riders.map((r) => <div key={r.id} className="small">• {r.name} ({plain(r.id)}) — {r.ts ? fmtDateTime(r.ts) : ''}</div>)}
      </div>
      <button className="btn primary block" onClick={() => go('orders')}><Icon name="receipt" size={18} /> {`Live orders (${live.length})`}</button>
      <QualityAlerts />
      <Reports />
    </div>
  );
}

function LiveOrders({ orders }) {
  const { config } = useApp();
  const [show, setShow] = useState('live');
  if (!orders) return null;
  const list = orders.filter((o) => (show === 'live' ? ACTIVE.includes(o.status) : !ACTIVE.includes(o.status))).sort((a, b) => b.createdMs - a.createdMs);
  return (
    <div className="pad-x">
      <div className="seg"><button className={show === 'live' ? 'on' : ''} onClick={() => setShow('live')}>Live</button><button className={show === 'done' ? 'on' : ''} onClick={() => setShow('done')}>Completed (2 days)</button></div>
      {!list.length && <Empty icon="receipt" title="No orders here" />}
      {list.map((o) => <OrderCard key={o.id} o={o} riders={config.riders || []} showRest admin />)}
    </div>
  );
}

function Reports() {
  const rests = useRestaurants() || [];
  const [range, setRange] = useState(7);
  const [orders, setOrders] = useState(null);
  useEffect(() => { setOrders(null); getList('orders', [['day', '>=', dayKey(Date.now() - (range - 1) * 86400000)]]).then(setOrders).catch(() => setOrders([])); }, [range]);
  const del = (orders || []).filter((o) => o.status === 'delivered');
  const rows = rests.map((r) => {
    const l = del.filter((o) => o.restaurantId === r.id);
    const s = (k) => l.reduce((a, o) => a + Number(o[k] || 0), 0);
    return { r, n: l.length, sales: s('itemTotal'), disc: s('discount'), com: s('commission'), dc: s('restDelivery'), pay: s('payable') };
  });
  return (
    <div className="card">
      <h4>Settlement report</h4>
      <div className="seg">{[[1, 'Today'], [7, '7 days'], [30, '30 days']].map(([v, l]) => <button key={v} className={range === v ? 'on' : ''} onClick={() => setRange(v)}>{l}</button>)}</div>
      {!orders ? <p className="muted small">Loading…</p> : (
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Restaurant</th><th>Orders</th><th>Sales</th><th>Discount</th><th>Fee</th><th>Delivery</th><th>Pay to shop</th></tr></thead>
            <tbody>{rows.map((x) => <tr key={x.r.id}><td data-notr="">{x.r.name}</td><td>{x.n}</td><td>{rupee(x.sales)}</td><td>{rupee(x.disc)}</td><td>{rupee(x.com)}</td><td>{rupee(x.dc)}</td><td><b>{rupee(x.pay)}</b></td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Restaurants() {
  const rests = useRestaurants() || [];
  const items = useItems() || [];
  const [edit, setEdit] = useState(null);
  const [menu, setMenu] = useState(null);
  const [view, setView] = useState(() => (sessionStorage.getItem('pp_restview') || 'list'));
  const apps = usePartnerApps();
  const pend = (apps || []).filter((a) => a.status === 'submitted').length;
  const toast = useToast();
  const seg = (
    <div className="seg">
      <button className={view === 'list' ? 'on' : ''} onClick={() => { setView('list'); sessionStorage.setItem('pp_restview', 'list'); }}>Restaurants</button>
      <button className={view === 'apps' ? 'on' : ''} onClick={() => { setView('apps'); sessionStorage.setItem('pp_restview', 'apps'); }}>{pend ? `Join requests (${pend})` : 'Join requests'}</button>
    </div>
  );
  if (view === 'apps' && !menu) return <div className="pad-x">{seg}<Applications /></div>;
  if (menu) return (
    <div>
      <div className="pad-x row gap"><button className="btn ghost small" onClick={() => setMenu(null)}><Icon name="back" size={16} /> Back</button><b data-notr="">{menu.name}</b></div>
      <MenuManager restId={menu.id} />
    </div>
  );
  return (
    <div className="pad-x">
      {seg}
      <button className="btn primary block" onClick={() => setEdit({})}><Icon name="plus" size={18} /> Add restaurant</button>
      {rests.map((r) => (
        <div key={r.id} className="adm-rest">
          <Img src={r.cover} alt="" className="ar-img" />
          <div className="grow">
            <b data-notr="">{r.name}</b>
            <small className="muted">{`${items.filter((i) => i.restaurantId === r.id).length} dishes · owner ${r.ownerPhone || '—'}`}{r.demo ? ' · DEMO' : ''}{r.verified ? ' · ✓ verified' : ''}{r.codBlocked ? ' · COD paused' : ''}</small>
            <div className="row gap">
              <button className="link small" onClick={() => setMenu(r)}>Menu</button>
              <button className="link small" onClick={() => setEdit(r)}>Edit</button>
              {r.ownerPhone && <a className="link small" href={tel(r.ownerPhone)}>Call</a>}
              {r.applicationId && <OnlinePayLink r={r} />}
              {r.ownerPhone && <a className="link small wa-link" href={wa(r.ownerPhone, `नमस्ते ${r.ownerName || ''} जी, FoodGaon (TechGaon AI Services) से —`)} target="_blank" rel="noreferrer">WhatsApp</a>}
            </div>
          </div>
          <Toggle on={r.open !== false} onChange={(v) => patch('restaurants', r.id, { open: v }).catch(() => toast(t('Could not save'), 'err'))} label="Open" />
        </div>
      ))}
      <RestEditor open={!!edit} r={edit} onClose={() => setEdit(null)} />
    </div>
  );
}

function RestEditor({ open, r, onClose }) {
  const { config } = useApp();
  const toast = useToast();
  const [f, setF] = useState(null);
  const [del, setDel] = useState(false);
  useEffect(() => {
    if (open) setF({ fssai: '', gstin: '', radiusKm: 5, minOrder: 50, name: '', tagline: '', address: '', ownerPhone: '', ownerName: '', prepMins: 20, commissionPct: '', deliveryCharge: '', cover: '', ...r, commissionPct: r?.commissionPct ?? '', deliveryCharge: r?.deliveryCharge ?? '' });
  }, [open]); // eslint-disable-line
  if (!f) return null;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    if (!f.name.trim()) { toast(t('Name is required'), 'err'); return; }
    if (f.ownerPhone && !/^\d{10}$/.test(f.ownerPhone)) { toast(t('Enter a valid 10-digit mobile number'), 'err'); return; }
    const id = r?.id || f.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) + '-' + Date.now().toString(36).slice(-3);
    const data = {
      name: f.name.trim(), tagline: f.tagline.trim(), address: f.address.trim(), ownerPhone: f.ownerPhone, ownerName: f.ownerName.trim(),
      fssai: (f.fssai || '').trim(), gstin: (f.gstin || '').trim().toUpperCase(), radiusKm: Number(f.radiusKm) || 5, minOrder: Number(f.minOrder) || 0,
      prepMins: Number(f.prepMins) || 20, cover: f.cover || '', open: r?.open ?? true, rating: r?.rating ?? 4.2, sort: r?.sort ?? 20, demo: false,
      cuisines: r?.cuisines || [], lat: r?.lat || null, lng: r?.lng || null,
      ...(f.commissionPct !== '' ? { commissionPct: Number(f.commissionPct) } : {}),
      ...(f.deliveryCharge !== '' ? { deliveryCharge: Number(f.deliveryCharge) } : {}),
    };
    try {
      const ops = [['set', 'restaurants', id, data]];
      if (f.ownerPhone) ops.push(['set', 'staff', '+91' + f.ownerPhone, { restaurant: id, name: f.ownerName || f.name }]);
      if (r?.ownerPhone && r.ownerPhone !== f.ownerPhone) ops.push(['set', 'staff', '+91' + r.ownerPhone, { restaurant: '' }]);
      await bulk(ops);
      toast(t('Saved')); onClose();
    } catch (e) { console.warn(e); toast(t('Could not save'), 'err'); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={r?.id ? 'Edit restaurant' : 'Add restaurant'} full>
      <Field label="Restaurant name"><input className="input" value={f.name} onChange={set('name')} /></Field>
      <Field label="Short line"><input className="input" value={f.tagline} onChange={set('tagline')} placeholder="e.g. Best chaat in town" /></Field>
      <Field label="Address"><input className="input" value={f.address} onChange={set('address')} /></Field>
      <div className="row gap">
        <Field label="Owner mobile" hint="This number logs in to the restaurant panel"><input className="input" inputMode="numeric" maxLength={10} value={f.ownerPhone} onChange={(e) => setF({ ...f, ownerPhone: e.target.value.replace(/\D/g, '') })} /></Field>
        <Field label="Owner name"><input className="input" value={f.ownerName} onChange={set('ownerName')} /></Field>
      </div>
      <div className="row gap">
        <Field label="FSSAI no. (required)"><input className="input" inputMode="numeric" maxLength={14} value={f.fssai} onChange={(e) => setF({ ...f, fssai: e.target.value.replace(/\D/g, '') })} /></Field>
        <Field label="GSTIN"><input className="input" maxLength={15} value={f.gstin} onChange={(e) => setF({ ...f, gstin: e.target.value.toUpperCase() })} /></Field>
      </div>
      <div className="row gap">
        <Field label="Delivery area km"><input className="input" inputMode="decimal" value={f.radiusKm} onChange={set('radiusKm')} /></Field>
        <Field label="Minimum order ₹"><input className="input" inputMode="numeric" value={f.minOrder} onChange={set('minOrder')} /></Field>
      </div>
      <div className="row gap">
        <Field label="Fee %" hint={`Blank = default ${config.commissionPct}%${config.commissionGstExtra ? ' + GST' : ''}`}><input className="input" inputMode="decimal" value={f.commissionPct} onChange={set('commissionPct')} /></Field>
        <Field label="Delivery charge ₹" hint={`Blank = default ₹${config.restaurantDeliveryCharge}`}><input className="input" inputMode="decimal" value={f.deliveryCharge} onChange={set('deliveryCharge')} /></Field>
      </div>
      <Field label="Cooking time (min)"><input className="input" inputMode="numeric" value={f.prepMins} onChange={set('prepMins')} /></Field>
      <button className="btn primary block lg" onClick={save}>Save</button>
      {r?.id && <button className="btn ghost danger-text block" onClick={() => setDel(true)}>Delete restaurant</button>}
      <Confirm open={del} onClose={() => setDel(false)} danger title="Delete restaurant?" text="The restaurant and its menu will be removed." okText="Delete"
        onOk={async () => { try { const its = await getList('items', [['restaurantId', '==', r.id]]); await bulk([['del', 'restaurants', r.id], ...its.map((i) => ['del', 'items', i.id])]); onClose(); } catch { toast(t('Could not delete'), 'err'); } }} />
    </Sheet>
  );
}

function Riders() {
  const rests = (useRestaurants() || []).filter((r) => !r.demo);
  const [pick, setPick] = useState(null);
  const r = rests.find((x) => x.id === pick) || rests[0];
  const orders0 = useList('orders', r ? [['restaurantId', '==', r.id]] : null, [r?.id]);
  const orders = orders0 && orders0.filter(isRealOrder);
  if (!r) return <div className="pad"><Empty icon="bike" title="No restaurant yet" /></div>;
  return (
    <div className="pad-x">
      <p className="tiny muted">Each restaurant has its own delivery boys. Pick a restaurant to manage them.</p>
      <div className="chip-row wrap">{rests.map((x) => <button key={x.id} className={'fchip' + (x.id === r.id ? ' on' : '')} onClick={() => setPick(x.id)} data-notr="">{x.name}</button>)}</div>
      <Team rest={r} orders={orders || []} />
    </div>
  );
}

function Settings() {
  const { config } = useApp();
  const toast = useToast();
  const [f, setF] = useState(config);
  useEffect(() => setF(config), [config]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    try {
      await put('config', 'app', {
        commissionPct: Number(f.commissionPct) || 0, commissionGstExtra: !!f.commissionGstExtra, codDueLimit: Number(f.codDueLimit) || 0, codRefuseLimit: Number(f.codRefuseLimit) || 0, qualityAlertAt: Number(f.qualityAlertAt) || 3, customerDeliveryFee: Number(f.customerDeliveryFee) || 0, restaurantDeliveryCharge: Number(f.restaurantDeliveryCharge) || 0,
        gstPct: Number(f.gstPct) || 0, radiusKm: Number(f.radiusKm) || 0, otpMode: f.otpMode === 'real' ? 'real' : 'mock',
        firmName: (f.firmName || '').trim(), firmAddress: (f.firmAddress || '').trim(), gstin: (f.gstin || '').trim().toUpperCase(), supportEmail: (f.supportEmail || '').trim(),
        minOrder: Number(f.minOrder) || 0, supportPhone: (f.supportPhone || '').trim(), upiNowEnabled: f.upiNowEnabled !== false,
        serviceArea: f.serviceArea || '', gatewayEnabled: !!f.gatewayEnabled, codEnabled: !!f.codEnabled, upiEnabled: !!f.upiEnabled, showCalories: !!f.showCalories,
      });
      toast(t('Saved'));
    } catch { toast(t('Could not save'), 'err'); }
  };
  return (
    <div className="pad-x">
      <div className="card">
        <h4><Icon name="store" size={18} /> Firm</h4>
        <Field label="Firm name"><input className="input" value={f.firmName || ''} onChange={set('firmName')} data-notr="" /></Field>
        <div className="row gap">
          <Field label="GSTIN" hint="Shown on every customer bill"><input className="input" maxLength={15} value={f.gstin || ''} onChange={(e) => setF({ ...f, gstin: e.target.value.toUpperCase() })} data-notr="" /></Field>
          <Field label="Email"><input className="input" value={f.supportEmail || ''} onChange={set('supportEmail')} data-notr="" /></Field>
        </div>
        <Field label="Address"><input className="input" value={f.firmAddress || ''} onChange={set('firmAddress')} data-notr="" /></Field>
      </div>
      <div className="card">
        <h4>Money</h4>
        <div className="row gap">
          <Field label="FoodGaon fee %" hint={f.commissionGstExtra ? 'On full bill; 18% GST added on the fee' : 'On full bill; already includes 18% GST'}><input className="input" inputMode="decimal" value={f.commissionPct} onChange={set('commissionPct')} /></Field>
          <Field label="GST on food %" hint="Added on customer bill"><input className="input" inputMode="decimal" value={f.gstPct ?? 5} onChange={set('gstPct')} /></Field>
        </div>
        <label className="check-row"><input type="checkbox" checked={!!f.commissionGstExtra} onChange={(e) => setF({ ...f, commissionGstExtra: e.target.checked })} /> {t('Fee + GST (GST charged extra on the fee)')}</label>
        <p className="tiny muted">{`₹100 order → ${t('restaurant gets')} ₹${Math.round((100 - (Number(f.commissionPct) || 0) * (f.commissionGstExtra ? 1.18 : 1)) * 100) / 100} ${t('(before 5% food GST)')}`}</p>
        <div className="row gap">
          <Field label="Delivery area km" hint="Default for restaurants"><input className="input" inputMode="decimal" value={f.radiusKm ?? 5} onChange={set('radiusKm')} /></Field>
          <Field label="Delivery charge ₹" hint="0 = restaurant delivers free"><input className="input" inputMode="decimal" value={f.restaurantDeliveryCharge} onChange={set('restaurantDeliveryCharge')} /></Field>
        </div>
        <div className="row gap">
          <Field label="Customer delivery fee ₹" hint="0 = FREE delivery"><input className="input" inputMode="decimal" value={f.customerDeliveryFee} onChange={set('customerDeliveryFee')} /></Field>
          <Field label="Minimum order ₹"><input className="input" inputMode="decimal" value={f.minOrder} onChange={set('minOrder')} /></Field>
        </div>
      </div>
      <div className="card">
        <h4>Payments</h4>
        <p className="tiny muted">Customers pay each restaurant's own UPI. FoodGaon never holds customer money.</p>
        <label className="check-row"><input type="checkbox" checked={!!f.gatewayEnabled} onChange={(e) => setF({ ...f, gatewayEnabled: e.target.checked })} /> {t('Online payment gateway (Razorpay split) — turn on only after the server is set up')}</label>
        <label className="check-row"><input type="checkbox" checked={f.upiNowEnabled !== false} onChange={(e) => setF({ ...f, upiNowEnabled: e.target.checked })} /> Pay now by UPI</label>
        <label className="check-row"><input type="checkbox" checked={!!f.upiEnabled} onChange={(e) => setF({ ...f, upiEnabled: e.target.checked })} /> Pay on delivery by UPI</label>
        <label className="check-row"><input type="checkbox" checked={!!f.codEnabled} onChange={(e) => setF({ ...f, codEnabled: e.target.checked })} /> Cash on delivery</label>
        <div className="row gap">
          <Field label="Pause COD when shop owes ₹" hint="0 = never pause"><input className="input" inputMode="numeric" value={f.codDueLimit ?? 0} onChange={(e) => setF({ ...f, codDueLimit: e.target.value.replace(/\D/g, '') })} /></Field>
          <Field label="Stop COD for a customer after refusals" hint="0 = never"><input className="input" inputMode="numeric" value={f.codRefuseLimit ?? 2} onChange={(e) => setF({ ...f, codRefuseLimit: e.target.value.replace(/\D/g, '') })} /></Field>
        </div>
        <Field label="Quality alert after complaints (7 days)"><input className="input" inputMode="numeric" value={f.qualityAlertAt ?? 3} onChange={(e) => setF({ ...f, qualityAlertAt: e.target.value.replace(/\D/g, '') })} /></Field>
      </div>
      <div className="card">
        <h4>App</h4>
        <div className="seg"><button className={f.otpMode !== 'real' ? 'on' : ''} onClick={() => setF({ ...f, otpMode: 'mock' })}>Test OTP 1234</button><button className={f.otpMode === 'real' ? 'on' : ''} onClick={() => setF({ ...f, otpMode: 'real' })}>Real SMS OTP</button></div>
        <p className="tiny muted">{f.otpMode === 'real' ? 'Customers get a real SMS OTP (needs Firebase billing beyond 10 SMS/day).' : 'Testing: any number logs in with OTP 1234. Switch to real SMS before public launch.'}</p>
        <Field label="Support phone"><input className="input" inputMode="numeric" value={f.supportPhone} onChange={set('supportPhone')} /></Field>
        <Field label="Service area"><input className="input" value={f.serviceArea} onChange={set('serviceArea')} /></Field>
        <label className="check-row"><input type="checkbox" checked={!!f.showCalories} onChange={(e) => setF({ ...f, showCalories: e.target.checked })} /> Show calories on dishes</label>
      </div>
      <button className="btn primary block lg" onClick={save}>Save settings</button>
      <UpiEditor value={config} title="FoodGaon UPI — restaurants send commission here" hint="Restaurants see this UPI ID and QR in their Earnings tab when paying FoodGaon dues."
        onSave={(v) => put('config', 'app', v)} />
      <Settlements />
      <GstCard />
      <ClearTestOrders />
      <SeedCard small />
    </div>
  );
}

/* commission payments sent by restaurants */
/* restaurant's payment screenshots for a commission payment (tap to enlarge) */
function SettProofs({ id }) {
  const [imgs, setImgs] = useState(null);
  const [big, setBig] = useState(null);
  useEffect(() => { let on = true; getOne('settproofs', id).then((d) => on && setImgs(d?.imgs || [])).catch(() => on && setImgs([])); return () => { on = false; }; }, [id]);
  return (
    <div className="row gap wrap" style={{ marginTop: 6 }}>
      {imgs === null && <span className="tiny muted">…</span>}
      {(imgs || []).map((s, i) => <button key={i} className="proof-th" onClick={() => setBig(s)}><img src={s} alt="" /></button>)}
      {big && createPortal(<div className="proof-big" onClick={() => setBig(null)}><img src={big} alt="" /><span>✕</span></div>, document.body)}
    </div>
  );
}

function Settlements() {
  const toast = useToast();
  const list = useList('settlements', [], []);
  const rests = useRestaurants() || [];
  const all = useList('orders', [['status', '==', 'delivered']], []);
  if (!list) return null;
  const sorted = [...list].sort((a, b) => b.createdMs - a.createdMs);
  const setSt = (x, status) => patch('settlements', x.id, { status, checkedMs: Date.now() }).then(() => toast(t('Saved'))).catch(() => toast(t('Could not save'), 'err'));
  return (
    <div className="card">
      <h4><Icon name="wallet" size={18} /> Commission from restaurants</h4>
      {all && rests.map((r) => {
        const owed = all.filter((o) => o.restaurantId === r.id).reduce((a, o) => a + dueOf(o), 0);
        const got = list.filter((x) => x.restaurantId === r.id && x.status !== 'rejected').reduce((a, x) => a + Number(x.amount || 0), 0);
        const left = Math.round((owed - got) * 100) / 100;
        if (!owed && !got) return null;
        return <div key={r.id} className="bill small"><span data-notr="">{r.name}</span><span>{left > 0 ? <b className="t-red">{rupee(left)}</b> : <b className="t-green">✓</b>}</span></div>;
      })}
      {sorted.map((x) => (
        <div key={x.id} className="sett-row">
          <div className="grow"><b data-notr="">{x.restaurantName}</b><small className="muted">{fmtDateTime(x.createdMs)}{x.utr ? ` · UTR ${x.utr}` : ''}{x.cycle ? ` · ${x.cycle}` : ''}</small>{x.proofCount > 0 && <SettProofs id={x.id} />}</div>
          <b>{rupee(x.amount)}</b>
          {x.status === 'claimed' ? (
            <span className="row gap"><button className="btn small green" onClick={() => setSt(x, 'confirmed')}>Got it</button><button className="btn small ghost danger-text" onClick={() => setSt(x, 'rejected')}>Not received</button></span>
          ) : <em className={'st-mini ' + x.status}>{x.status === 'confirmed' ? t('Confirmed') : t('Rejected')}</em>}
        </div>
      ))}
      {!sorted.length && <p className="tiny muted">No commission payments yet</p>}
    </div>
  );
}

function GstCard() {
  const { config } = useApp();
  const rests = useRestaurants() || [];
  const [month, setMonth] = useState(() => todayKey().slice(0, 7));
  const [open, setOpen] = useState(false);
  const orders = useList('orders', open ? [['status', '==', 'delivered']] : null, [open]);
  return (
    <div className="card">
      <h4><Icon name="receipt" size={18} /> GST report</h4>
      <p className="tiny muted">Monthly totals for GSTR-1 / GSTR-3B: food GST (sec. 9(5)) + GST on your commission.</p>
      <div className="row gap"><input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /><button className="btn primary" onClick={() => setOpen(true)}>View / PDF</button></div>
      {open && orders && <DocSheet open onClose={() => setOpen(false)} title="GST report" fileName={`FoodGaon-GST-${month}.pdf`}><GstReport month={month} orders={orders} rests={rests} config={config} /></DocSheet>}
    </div>
  );
}

function SeedCard({ small }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(false);
  const { config } = useApp();
  const cfgEmpty = !config.riders;
  const run = async () => {
    setBusy(true);
    try {
      const riders = STAFF.filter((s) => s.rider).map((s) => ({ phone: s.phone, name: s.name }));
      await bulk([
        ['set', 'config', 'app', { riders, ...(cfgEmpty ? DEFAULT_CONFIG : {}) }],
        ...RESTAURANTS.map((r) => ['set', 'restaurants', r.id, r]),
        ...ITEMS.map((i) => ['set', 'items', i.id, i]),
        ...BANNERS.map((b) => ['set', 'banners', b.id, b]),
        ...OFFERS.map((o) => ['set', 'offers', o.id, o]),
        ...STAFF.map(({ phone, ...s }) => ['set', 'staff', phone, s]),
      ]);
      toast(t('Starter menu loaded'));
    } catch (e) { console.warn(e); toast(t('Could not save'), 'err'); }
    setBusy(false);
  };
  return (
    <div className={'card' + (small ? '' : ' seed')}>
      <h4>Starter menu</h4>
      <p className="small muted">{`Loads ${RESTAURANTS.length} restaurants (Raju Lassi + ${RESTAURANTS.length - 1} demo), ${ITEMS.length} veg dishes with photos & calories, banners, Rohit as rider. Existing dishes with the same id are updated.`}</p>
      <button className="btn ghost block" disabled={busy} onClick={() => setAsk(true)}>{busy ? 'Loading…' : 'Load starter menu'}</button>
      <Confirm open={ask} onClose={() => setAsk(false)} title="Load starter menu?" text="This adds/updates the starter restaurants and dishes." okText="Load" onOk={run} />
    </div>
  );
}

/* complaints about taste / portion / freshness in the last 7 days, per restaurant */
function QualityAlerts() {
  const { config } = useApp();
  const rests = useRestaurants() || [];
  const since = useMemo(() => Date.now() - 7 * 86400000, []);
  const list = useList('reviews', [['createdMs', '>=', since]], [since]);
  const [open, setOpen] = useState(null);
  const [img, setImg] = useState(null);
  if (!list) return null;
  const limit = Number(config.qualityAlertAt) || 3;
  const bad = list.filter((x) => x.issue);
  const by = rests.map((r) => ({ r, l: bad.filter((x) => x.restaurantId === r.id) })).filter((x) => x.l.length).sort((a, b) => b.l.length - a.l.length);
  const photo = async (id) => { const c = await getOne('complaints', id).catch(() => null); if (c?.img) setImg(c.img); };
  return (
    <div className="card">
      <h4><Icon name="star" size={18} /> Quality — last 7 days</h4>
      {!by.length && <p className="small t-green">{`No complaints in ${list.length} reviews 👍`}</p>}
      {by.map(({ r, l }) => (
        <div key={r.id} className={'qa-row' + (l.length >= limit ? ' hot' : '')}>
          <button className="row gap grow" onClick={() => setOpen(open === r.id ? null : r.id)}>
            <b className="grow" data-notr="">{r.name}</b>
            <span className="pill">{l.length}</span>
            {l.length >= limit && <em className="st-mini rejected">{t('Call now')}</em>}
          </button>
          {open === r.id && (
            <div className="qa-list">
              {l.map((x) => (
                <div key={x.id} className="small">
                  {`★${x.rating} · `}{['taste', 'portion', 'fresh'].filter((k) => x.qc?.[k] === false).map((k) => ({ taste: 'taste', portion: 'portion', fresh: 'not fresh' }[k])).join(', ') || 'low rating'}
                  {x.review && <span data-notr="">{` — “${x.review}”`}</span>}
                  {' '}<button className="link small" onClick={() => photo(x.id)}>Photo</button>
                </div>
              ))}
              <div className="row gap">
                {r.ownerPhone && <a className="btn small ghost" href={tel(r.ownerPhone)}>Call</a>}
                {r.ownerPhone && <a className="btn small ghost wa-link" href={wa(r.ownerPhone, `नमस्ते ${r.ownerName || ''} जी, FoodGaon पर पिछले 7 दिन में ${l.length} ग्राहकों ने स्वाद/मात्रा/ताज़गी की शिकायत की है। कृपया ध्यान दें — ऐप पर भी वही खाना, वही मात्रा जो दुकान पर।`)} target="_blank" rel="noreferrer">WhatsApp</a>}
                <button className="btn small ghost danger-text" onClick={() => patch('restaurants', r.id, { open: false })}>Pause shop</button>
              </div>
            </div>
          )}
        </div>
      ))}
      {img && createPortal(<div className="proof-big" onClick={() => setImg(null)}><img src={img} alt="" /><span>✕</span></div>, document.body)}
    </div>
  );
}

/* pause cash-on-delivery for a restaurant while its unpaid FoodGaon dues are above the limit (Settings → Payments) */
function useCodGuard() {
  const { config } = useApp();
  const rests = useRestaurants();
  const limit = Number(config.codDueLimit) || 0;
  useEffect(() => {
    if (!rests) return;
    let on = true;
    (async () => {
      try {
        const [orders, setts] = limit ? await Promise.all([getList('orders', [['status', '==', 'delivered']]), getList('settlements', [])]) : [[], []];
        const ops = [];
        rests.filter((r) => !r.demo).forEach((r) => {
          const owed = orders.filter((o) => o.restaurantId === r.id).reduce((a, o) => a + dueOf(o), 0);
          const got = setts.filter((x) => x.restaurantId === r.id && x.status !== 'rejected').reduce((a, x) => a + Number(x.amount || 0), 0);
          const left = Math.round((owed - got) * 100) / 100;
          const block = limit > 0 && left > limit;
          if (!!r.codBlocked !== block) ops.push(['set', 'restaurants', r.id, { codBlocked: block, codDue: left }]);
        });
        if (on && ops.length) await bulk(ops);
      } catch (e) { console.warn('cod guard', e); }
    })();
    return () => { on = false; };
  }, [limit, rests?.length]); // eslint-disable-line
}

/* connect a restaurant's bank to the payment gateway (Razorpay Route linked account) */
function OnlinePayLink({ r }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const go = async (fn) => {
    setBusy(true);
    try { const x = await fn(r.id); toast(`${t('Online payment')}: ${x.status || 'ok'}`); } catch (e) { toast(e.message || t('Could not connect. Is the payment server set up?'), 'err'); }
    setBusy(false);
  };
  if (r.onlinePay) return <span className="link small t-green">✓ {t('Online pay')}</span>;
  return <button className="link small" disabled={busy} onClick={() => go(r.rzpLinked ? restaurantPayStatus : async (id) => { const x = await linkRestaurant(id); await patch('restaurants', id, { rzpLinked: true }); return x; })}>{busy ? '…' : r.rzpLinked ? t('Check online pay') : t('Connect online pay')}</button>;
}

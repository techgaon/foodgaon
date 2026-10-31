import { useEffect, useState, useSyncExternalStore } from 'react';
import { watchList, watchDoc, patch, put, newId, serverTimestamp, phoneOf } from './fb.js';
import { LS, todayKey, shortId } from './utils.js';

/* ---------- live collections (small, public) ---------- */
const cache = {};
function useShared(key, start) {
  const [v, setV] = useState(cache[key]?.v);
  useEffect(() => {
    let c = cache[key];
    if (!c) {
      c = cache[key] = { v: undefined, subs: new Set() };
      c.off = start((x) => { c.v = x; c.subs.forEach((f) => f(x)); });
    }
    c.subs.add(setV); if (c.v !== undefined) setV(c.v);
    return () => c.subs.delete(setV);
  }, [key]); // eslint-disable-line
  return v;
}
const bySort = (a, b) => (a.sort || 99) - (b.sort || 99) || String(a.name).localeCompare(String(b.name));
export const useRestaurants = () => useShared('restaurants', (cb) => watchList('restaurants', [], (l) => cb(l.sort(bySort))));
export const useItems = () => useShared('items', (cb) => watchList('items', [], (l) => cb(l.sort(bySort))));
export const useBanners = () => useShared('banners', (cb) => watchList('banners', [], (l) => cb(l.sort(bySort))));

export function useDoc(path, id) {
  const [d, setD] = useState(undefined);
  useEffect(() => { if (!id) { setD(null); return; } return watchDoc(path, id, setD); }, [path, id]);
  return d;
}
export function useList(path, filters, deps = []) {
  const [l, setL] = useState(undefined);
  useEffect(() => {
    if (!filters) { setL([]); return; }
    return watchList(path, filters, setL, null, null, () => setL([]));
  }, deps); // eslint-disable-line
  return l;
}

/* ---------- cart (one restaurant at a time, like the big apps) ---------- */
const CK = 'pp_cart';
let cart = LS.get(CK, { restaurantId: '', items: {} });
const subs = new Set();
const emit = () => { LS.set(CK, cart); subs.forEach((f) => f()); };
export const cartStore = {
  get: () => cart,
  subscribe: (f) => { subs.add(f); return () => subs.delete(f); },
  add(item) {
    if (cart.restaurantId && cart.restaurantId !== item.restaurantId) return false;
    const cur = cart.items[item.id]?.qty || 0;
    cart = { restaurantId: item.restaurantId, items: { ...cart.items, [item.id]: { id: item.id, name: item.name, price: item.price, kcal: item.kcal || 0, onMrp: !!item.onMrp, qty: cur + 1 } } };
    emit(); return true;
  },
  sub(id) {
    const cur = cart.items[id]?.qty || 0;
    const items = { ...cart.items };
    if (cur <= 1) delete items[id]; else items[id] = { ...items[id], qty: cur - 1 };
    cart = { restaurantId: Object.keys(items).length ? cart.restaurantId : '', items };
    emit();
  },
  replaceWith(item) { cart = { restaurantId: '', items: {} }; this.add(item); },
  clear() { cart = { restaurantId: '', items: {} }; emit(); },
};
export const useCart = () => useSyncExternalStore(cartStore.subscribe, cartStore.get);
export function cartTotals(c) {
  const list = Object.values(c.items);
  return {
    list,
    count: list.reduce((a, x) => a + x.qty, 0),
    total: list.reduce((a, x) => a + x.qty * x.price, 0),
    kcal: list.reduce((a, x) => a + x.qty * (x.kcal || 0), 0),
  };
}

/* ---------- orders ---------- */
export const ACTIVE = ['placed', 'accepted', 'preparing', 'ready', 'picked'];
/** orders waiting for / failed UPI payment are not real orders yet — restaurants & riders never see them */
export const UNPAID = ['awaiting_payment', 'payment_failed'];
export const isRealOrder = (o) => o && !UNPAID.includes(o.status);
export const r2 = (n) => Math.round(n * 100) / 100;

/** FoodGaon money rules (per order)
 *  menu prices INCLUDE GST 5% → bill splits them: ₹210 = ₹200 food + ₹10 GST (FoodGaon pays the GST to govt under section 9(5))
 *  commission (default 4.90%) on the full bill incl. GST — either including FoodGaon's own 18% GST, or "+ GST" when commissionGstExtra
 *  customer pays the restaurant directly; every week the restaurant sends FoodGaon:  GST + commission (− FoodGaon-funded coupon)  */
export function billFor({ itemTotal, discount = 0, discountBy = '', rest = {}, config = {} }) {
  const gstPct = Number(config.gstPct ?? 5);
  const pct = Number(rest.commissionPct ?? config.commissionPct ?? 4.9);
  const cgPct = Number(config.commissionGstPct ?? 18);
  const disc = Math.max(0, Math.min(Number(discount) || 0, itemTotal));
  const incl = rest.priceInclGst !== false;                     // restaurant setting: menu prices include GST (default) or not
  const food = r2(itemTotal - disc);
  const taxable = incl ? r2((food * 100) / (100 + gstPct)) : food; // food value without GST
  const gst = incl ? r2(food - taxable) : r2((food * gstPct) / 100);
  const foodIncl = r2(taxable + gst);                             // what the customer pays for food, GST included
  const deliveryFee = Number(config.customerDeliveryFee || 0);
  const total = r2(foodIncl + deliveryFee);
  // fee mode: "x% incl. GST" (default) or "x% + GST" (config/restaurant commissionGstExtra) — `commission` is always the full amount incl. its GST
  const gstExtra = !!(rest.commissionGstExtra ?? config.commissionGstExtra);
  const base = r2((total * pct) / 100);
  const commission = gstExtra ? r2(base + (base * cgPct) / 100) : base;
  const commissionGst = gstExtra ? r2(commission - base) : r2((commission * cgPct) / (100 + cgPct));
  const fgCoupon = discountBy === 'admin' ? disc : 0; // FoodGaon gives this back to the restaurant
  const dues = r2(gst + commission - fgCoupon);
  return { gstPct, commissionPct: pct, commissionGstExtra: gstExtra, taxable, gst, cgst: r2(gst / 2), sgst: r2(gst - r2(gst / 2)), deliveryFee, total, commission, commissionGst, fgCoupon, dues, payable: r2(total - dues), discount: disc, gstIncluded: incl, food };
}

/** weekly settlement cycle: 1-7, 8-14, 15-21, 22-28, 29-end → '2026-11-W1' */
export function cycleOf(ms) {
  const d = new Date(ms); const w = Math.min(5, Math.ceil(d.getDate() / 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-W${w}`;
}
export function cycleRange(key) {
  const [y, m, w] = key.split('-'); const n = Number(w.slice(1));
  const last = new Date(Number(y), Number(m), 0).getDate();
  const from = (n - 1) * 7 + 1; const to = n === 5 ? last : n * 7;
  const mon = new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-IN', { month: 'short' });
  return { from, to, label: `${from}-${to} ${mon} ${y}`, dueMs: new Date(Number(y), Number(m) - 1, to + 1).getTime() };
}

export async function placeOrder({ user, customerName, rest, config, cartData, address, payment, note, offer, discount = 0, status = 'placed' }) {
  const { list, total: itemTotal, kcal } = cartTotals(cartData);
  const discountBy = discount ? (offer?.fundedBy === 'restaurant' ? 'restaurant' : 'admin') : '';
  const b = billFor({ itemTotal, discount, discountBy, rest, config });
  const id = newId('orders');
  const now = Date.now();
  const order = {
    code: shortId(), day: todayKey(), cycle: cycleOf(now), createdAt: serverTimestamp(), createdMs: now,
    customerUid: user.uid, customerPhone: phoneOf(user) || (address?.phone ? '+91' + String(address.phone).replace(/\D/g, '').slice(-10) : ''), customerName,
    address, restaurantId: rest.id, restaurantName: rest.name, restaurantPhone: rest.ownerPhone || '', restaurantAddr: rest.address || '',
    restFssai: rest.fssai || '', restGstin: rest.gstin || '',
    restLat: rest.lat || null, restLng: rest.lng || null, restUpiId: rest.upiId || '', restUpiName: rest.upiName || rest.name || '', restUpiParams: rest.upiParams || null,
    items: list.map((x) => ({ id: x.id, name: x.name, price: x.price, qty: x.qty, kcal: x.kcal || 0, ...(x.onMrp ? { onMrp: true } : {}) })),
    itemTotal, discount: b.discount, offerCode: b.discount ? offer.code : '', discountBy, kcal,
    taxable: b.taxable, gstPct: b.gstPct, gst: b.gst, gstIncluded: b.gstIncluded, deliveryFee: b.deliveryFee, total: b.total,
    commissionPct: b.commissionPct, commissionGstExtra: b.commissionGstExtra, commission: b.commission, commissionGst: b.commissionGst, fgCoupon: b.fgCoupon,
    dues: b.dues, restDelivery: 0, payable: b.payable,
    firmName: config.firmName || 'TechGaon AI Services', firmGstin: config.gstin || '',
    payment, paid: false, paymentClaim: '', note: note || '',
    status, riderPhone: '', riderName: '', prepMins: rest.prepMins || 20,
    timeline: status === 'placed' ? { placed: now } : { created: now },
  };
  await put('orders', id, order, false);
  lastOrder.code = order.code;
  return id;
}
export const lastOrder = { code: '' };
export function setStatus(order, status, extra = {}) {
  // a rejected / cancelled order is taken off the delivery boy's list at once
  const off = ['rejected', 'cancelled'].includes(status) && order.status !== 'picked' ? { riderPhone: '', riderName: '' } : {};
  return patch('orders', order.id, { status, [`timeline.${status}`]: Date.now(), ...off, ...extra });
}

/* ---------- favourite dishes ❤️ (saved on the customer's account, or on this phone when logged out) ---------- */
let favUid = null; let favs = (() => { try { return JSON.parse(localStorage.getItem('pp_favs') || '[]'); } catch { return []; } })();
const favSubs = new Set(); let favUnsub = null;
const favEmit = () => { try { localStorage.setItem('pp_favs', JSON.stringify(favs)); } catch { /* ignore */ } favSubs.forEach((f) => f()); };
export function bindFavs(uid) {
  if (uid === favUid) return; favUid = uid; if (favUnsub) { favUnsub(); favUnsub = null; }
  if (uid) favUnsub = watchDoc('customers', uid, (d) => { if (d && Array.isArray(d.favs)) { favs = d.favs; favEmit(); } else if (favs.length) put('customers', uid, { favs }).catch(() => {}); });
}
export const favStore = {
  get: () => favs,
  subscribe: (f) => { favSubs.add(f); return () => favSubs.delete(f); },
  toggle(id) { favs = favs.includes(id) ? favs.filter((x) => x !== id) : [id, ...favs].slice(0, 100); favEmit(); if (favUid) put('customers', favUid, { favs }).catch(() => {}); return favs.includes(id); },
};
export const useFavs = () => useSyncExternalStore(favStore.subscribe, favStore.get);

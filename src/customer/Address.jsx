import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Icon, Sheet, Field, useToast, Empty } from '../ui.jsx';
import { useApp } from '../App.jsx';
import MapView from '../components/MapView.jsx';
import { getPosition } from '../lib/native.js';
import { LS } from '../lib/utils.js';
import { put, getOne, phoneOf } from '../lib/fb.js';
import { TopBar } from './RestaurantPage.jsx';
import { t } from '../i18n/index.js';

/* saved addresses — kept on the device and in the customer's profile */
let state = { list: LS.get('pp_addrs', []), sel: LS.get('pp_addr_sel', '') };
const subs = new Set();
const emit = () => { LS.set('pp_addrs', state.list); LS.set('pp_addr_sel', state.sel); const a = state.list.find((x) => x.id === state.sel); LS.set('pp_addr_label', a ? a.label : null); subs.forEach((f) => f()); };
export const addrStore = {
  get: () => state,
  subscribe: (f) => { subs.add(f); return () => subs.delete(f); },
  save(a, uid) {
    const list = state.list.some((x) => x.id === a.id) ? state.list.map((x) => (x.id === a.id ? a : x)) : [...state.list, a];
    state = { list, sel: a.id }; emit();
    if (uid) put('customers', uid, { addresses: list }).catch(() => {});
  },
  select(id) { state = { ...state, sel: id }; emit(); },
  del(id, uid) { const list = state.list.filter((x) => x.id !== id); state = { list, sel: state.sel === id ? (list[0]?.id || '') : state.sel }; emit(); if (uid) put('customers', uid, { addresses: list }).catch(() => {}); },
  merge(remote = []) { const ids = new Set(state.list.map((x) => x.id)); const add = remote.filter((x) => !ids.has(x.id)); if (add.length) { state = { list: [...state.list, ...add], sel: state.sel || add[0].id }; emit(); } },
};
export const useAddresses = () => useSyncExternalStore(addrStore.subscribe, addrStore.get);
export function useSyncAddresses() {
  const { user } = useApp();
  useEffect(() => { if (user) getOne('customers', user.uid).then((d) => d?.addresses && addrStore.merge(d.addresses)).catch(() => {}); }, [user?.uid]); // eslint-disable-line
}

export const addrLine = (a) => [a.house, a.area, a.landmark && `${t('Near')} ${a.landmark}`].filter(Boolean).join(', ');

export function AddressForm({ open, onClose, initial }) {
  const { user } = useApp();
  const toast = useToast();
  const [a, setA] = useState(null);
  const [locating, setLocating] = useState(false);
  useEffect(() => {
    if (open) setA(initial || { id: 'a' + Date.now(), label: 'Home', name: user?.displayName || '', phone: phoneOf(user).replace('+91', ''), house: '', area: '', landmark: '', lat: null, lng: null });
  }, [open]); // eslint-disable-line
  const set = (k) => (e) => setA((x) => ({ ...x, [k]: e.target ? e.target.value : e }));
  const locate = async () => {
    setLocating(true);
    try { const p = await getPosition(); setA((x) => ({ ...x, lat: p.lat, lng: p.lng, accuracy: p.acc, pinConfirmed: true })); toast(t('Location found. Drag the pin if needed.')); } catch (e) { toast(t(e.message || 'Could not get location'), 'err'); }
    setLocating(false);
  };
  useEffect(() => { if (open && !initial) locate(); }, [open]); // eslint-disable-line
  const save = () => {
    if (a.lat == null || a.lng == null) { toast(t('Choose your exact location on the map'), 'err'); return; }
    if (!a.house.trim() || !a.area.trim()) { toast(t('Please fill house / street and area / village'), 'err'); return; }
    if (!/^[6-9]\d{9}$/.test(a.phone)) { toast(t('Enter a valid 10-digit mobile number'), 'err'); return; }
    addrStore.save({ ...a, house: a.house.trim(), area: a.area.trim(), landmark: a.landmark.trim() }, user?.uid);
    onClose();
  };
  if (!a) return null;
  return (
    <Sheet open={open} onClose={onClose} title={initial ? 'Edit address' : 'Add delivery address'} full>
      <div className="addr-map">
        <MapView height={320} follow line={false} points={a.lat ? [{ id: 'me', kind: 'home', lat: a.lat, lng: a.lng }] : []} draggable="me" onDrag={(p) => setA((x) => ({ ...x, ...p, pinConfirmed: true, accuracy: null }))} />
        <button className="btn small gps-btn" onClick={locate} disabled={locating}><Icon name="gps" size={16} /> {locating ? 'Finding…' : 'Use current location'}</button>
      </div>
      <p className="tiny muted">Nearby roads and places appear on the map. Zoom in, then tap or drag the pin to your exact entrance.</p>
      {a.accuracy > 100 && <div className="alert alert-amber">GPS accuracy is low. Move the pin to your exact location before saving.</div>}
      {!a.lat && <p className="tiny muted">Turn on GPS so the delivery partner reaches your exact door.</p>}
      <div className="seg">
        {['Home', 'Work', 'Other'].map((l) => <button key={l} className={a.label === l ? 'on' : ''} onClick={() => setA((x) => ({ ...x, label: l }))}>{l}</button>)}
      </div>
      <Field label="House no. / street / mohalla"><input className="input" value={a.house} onChange={set('house')} placeholder="e.g. H.No. 12, Gandhi Nagar" /></Field>
      <Field label="Area / village"><input className="input" value={a.area} onChange={set('area')} placeholder="e.g. Haidergarh" /></Field>
      <Field label="Landmark (optional)"><input className="input" value={a.landmark} onChange={set('landmark')} placeholder="e.g. near SBI bank" /></Field>
      <div className="row gap">
        <Field label="Receiver name"><input className="input" value={a.name} onChange={set('name')} /></Field>
        <Field label="Phone"><input className="input" inputMode="numeric" maxLength={10} value={a.phone} onChange={(e) => setA((x) => ({ ...x, phone: e.target.value.replace(/\D/g, '') }))} /></Field>
      </div>
      <button className="btn primary block lg" onClick={save}>Save address</button>
    </Sheet>
  );
}

export function AddressPage({ nav }) {
  const { user } = useApp();
  useSyncAddresses();
  const { list, sel } = useAddresses();
  const [form, setForm] = useState(null);
  return (
    <div className="page">
      <TopBar onBack={nav.back} title="Delivery address" />
      <div className="pad-x">
        <button className="btn ghost block" onClick={() => setForm({})}><Icon name="plus" size={18} /> Add new address</button>
        {!list.length && <Empty icon="pin" title="No saved address" text="Add your address once, we'll remember it." />}
        {list.map((a) => (
          <div key={a.id} className={'addr-card' + (a.id === sel ? ' on' : '')} onClick={() => { addrStore.select(a.id); nav.back(); }}>
            <Icon name={a.label === 'Work' ? 'store' : 'home'} size={20} />
            <div className="grow"><b>{a.label}</b><p className="small muted" data-notr="">{addrLine(a)}</p><small className="muted">{a.name} · {a.phone}{a.lat ? ' · GPS ✓' : ''}</small></div>
            <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setForm(a); }} aria-label="Edit"><Icon name="edit" size={18} /></button>
            <button className="icon-btn" onClick={(e) => { e.stopPropagation(); addrStore.del(a.id, user?.uid); }} aria-label="Delete"><Icon name="trash" size={18} /></button>
          </div>
        ))}
      </div>
      <AddressForm open={!!form} initial={form?.id ? form : null} onClose={() => setForm(null)} />
    </div>
  );
}

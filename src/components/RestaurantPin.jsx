import React, { useState } from 'react';
import { Icon, Field, Sheet } from '../ui.jsx';
import { setRestaurantPin, changeRestaurantPin, validRestaurantPin, pinError } from '../lib/restaurantPin.js';

export default function RestaurantPin({ restaurant, admin = false }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const clear = () => { setCurrent(''); setPin(''); setConfirm(''); setMessage(''); setSuccess(false); };
  const save = async event => {
    event.preventDefault();
    if (busy || !validRestaurantPin(pin) || pin !== confirm || (!admin && !/^(1234|\d{6})$/.test(current))) return;
    setBusy(true); setMessage(''); setSuccess(false);
    try {
      if (admin) await setRestaurantPin(restaurant.id, pin);
      else await changeRestaurantPin(current, pin);
      setSuccess(true); setMessage('PIN updated. Use the new PIN with the registered mobile number. Default OTP will no longer work for this account.');
      setCurrent(''); setPin(''); setConfirm('');
    } catch (error) { setMessage(pinError(error)); }
    finally { setBusy(false); }
  };
  return <>
    <button className={admin ? 'link small' : 'btn ghost block'} onClick={() => { clear(); setOpen(true); }}><Icon name="shield" size={16} /> {admin ? 'Set / reset login PIN' : 'Change my login PIN'}</button>
    <Sheet open={open} onClose={() => { if (!busy) { setOpen(false); clear(); } }} title={admin ? 'Set / reset restaurant PIN' : 'Change my login PIN'}>
      <form onSubmit={save} data-ui-lang="en">
        <div className="pin-header"><Icon name="shield" size={28} /><div><b data-notr="">{restaurant.name}</b><small data-notr="">{restaurant.ownerPhone}</small></div></div>
        <p className="small muted">Before a PIN is set, the registered number uses default OTP 1234. After setting a PIN, use your 6-digit PIN instead.</p>
        {!admin && <Field label="Current OTP or PIN"><input className="input" aria-label="Current OTP or PIN" type="password" inputMode="numeric" autoComplete="current-password" maxLength={6} value={current} onChange={e => setCurrent(e.target.value.replace(/\D/g, ''))} required /></Field>}
        <Field label="New 6-digit PIN"><input className="input" aria-label="New 6-digit PIN" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} required /></Field>
        <Field label="Confirm new PIN"><input className="input" aria-label="Confirm new PIN" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={confirm} onChange={e => setConfirm(e.target.value.replace(/\D/g, ''))} required /></Field>
        <p className="tiny muted">Use 6 digits, not all the same. Avoid your phone number or birth date.</p>
        {confirm && <p className={pin === confirm && validRestaurantPin(pin) ? 't-green small' : 't-red small'}>{pin === confirm && validRestaurantPin(pin) ? '✓ PINs match' : 'Check that both PINs match and contain 6 digits.'}</p>}
        {message && <p role="status" className={'alert ' + (success ? 'alert-green' : 'alert-red')}>{message}</p>}
        <button className="btn primary block" disabled={busy || !validRestaurantPin(pin) || pin !== confirm || (!admin && !/^(1234|\d{6})$/.test(current))}>{busy ? 'Updating…' : admin ? 'Set new PIN' : 'Change PIN'}</button>
        <p className="tiny muted">{admin ? 'Give the new PIN privately to the restaurant owner. Existing sessions may need to sign in again.' : 'Forgot your PIN? Ask FoodGaon admin to set a new one.'}</p>
      </form>
    </Sheet>
  </>;
}

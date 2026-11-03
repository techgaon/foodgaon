import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Icon, Field, useToast } from '../ui.jsx';
import { compressImage, upiLink, rupee, parseUpiQr } from '../lib/utils.js';

/* decode a QR code from a photo (jsQR, loaded only when needed) */
export async function readQr(file) {
  const { default: jsQR } = await import('jsqr');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
    for (const max of [1400, 900, 2000]) {
      const sc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, c.width, c.height);
      const d = ctx.getImageData(0, 0, c.width, c.height);
      const r = jsQR(d.data, d.width, d.height, { inversionAttempts: 'attemptBoth' });
      if (r?.data) return r.data;
    }
    return '';
  } finally { URL.revokeObjectURL(url); }
}
import { upiPay, upiApps, isNative } from '../lib/native.js';
import { LS } from '../lib/utils.js';
import { t } from '../i18n/index.js';

export const UPI_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,64}$/;
export const hasUpi = (x) => !!(x && (x.upiId || x.upiQr || x.upiMobile));

/* UPI apps installed on this phone (with their own icons from the phone) */
let APPS = null;
export function useUpiApps() {
  const [apps, setApps] = useState(APPS || []);
  useEffect(() => { if (APPS) return; upiApps().then((a) => { APPS = a; setApps(a); }); }, []);
  return apps;
}
const PREF = ['google', 'phonepe', 'paytm', 'bhim', 'amazon', 'cred', 'mobikwik', 'whatsapp'];
const rank = (p) => { const i = PREF.findIndex((k) => p.includes(k)); return i < 0 ? 99 : i; };
export const chosenApp = () => LS.get('pp_upi_pkg', '');

/** row of UPI app icons — tap one to choose which app opens */
export function UpiAppStrip({ value, onChange, compact }) {
  const apps = [...useUpiApps()].sort((a, b) => rank(a.package) - rank(b.package));
  if (!apps.length) {
    return <div className="upi-strip generic"><span className="upi-badge">UPI</span><small>{isNative ? t('Any UPI app on your phone') : 'Google Pay · PhonePe · Paytm · BHIM'}</small></div>;
  }
  return (
    <div className={'upi-strip' + (compact ? ' compact' : '')}>
      {apps.slice(0, compact ? 5 : 8).map((a) => (
        <button type="button" key={a.package} className={'upi-app' + (value === a.package ? ' on' : '')} onClick={(e) => { e.stopPropagation(); LS.set('pp_upi_pkg', a.package); onChange?.(a.package); }} title={a.label}>
          {a.icon ? <img src={a.icon} alt="" /> : <span className="upi-badge">UPI</span>}
          {!compact && <small data-notr="">{a.label}</small>}
        </button>
      ))}
    </div>
  );
}

/** QR made from a UPI link (with amount) — falls back to an uploaded QR photo */
export function UpiQr({ upiId, upiName, upiQr, amount, note, refId, size = 220, extra }) {
  const [src, setSrc] = useState('');
  const link = upiId ? upiLink({ upiId, upiName, amount, note, ref: refId, extra }) : '';
  useEffect(() => {
    let on = true;
    if (!link) { setSrc(''); return; }
    QRCode.toDataURL(link, { width: size * 2, margin: 1, errorCorrectionLevel: 'M' }).then((d) => on && setSrc(d)).catch(() => setSrc(''));
    return () => { on = false; };
  }, [link, size]);
  const img = src || upiQr;
  if (!img) return null;
  return (
    <div className="upi-qr">
      <img src={img} alt="UPI QR" width={size} height={size} />
      {upiId && <small data-notr="">{upiId}</small>}
      {amount > 0 && <b>{rupee(amount)}</b>}
    </div>
  );
}

/** “Open UPI app” button */
export function UpiButton({ upiId, upiName, amount, note, refId, label = 'Pay by UPI app', className = 'btn primary block lg', onDone, extra }) {
  if (!upiId) return null;
  const go = async () => { await upiPay(upiLink({ upiId, upiName, amount, note, ref: refId, extra }), chosenApp()); onDone?.(); };
  return <button type="button" className={className} onClick={go}><Icon name="upi" size={20} /> {t(label)}{amount > 0 ? ` · ${rupee(amount)}` : ''}</button>;
}

/** Edit UPI ID + mobile + name + QR photo (restaurant shop settings use `noQr` = shop mode; admin uses the plain one) */
export function UpiEditor({ value, onSave, title = 'UPI for receiving money', hint, noQr: shop }) {
  const toast = useToast();
  const init = () => ({ upiId: value.upiId || '', upiName: value.upiName || '', upiQr: value.upiQr || '', upiMobile: value.upiMobile || '' });
  const [f, setF] = useState(init);
  const [busy, setBusy] = useState(false);
  const [params, setParams] = useState(value.upiParams || null);
  useEffect(() => setF(init()), [value.upiId, value.upiName, value.upiQr, value.upiMobile]); // eslint-disable-line
  useEffect(() => setParams(value.upiParams || null), [value.upiParams]);
  // QR photo: keep the photo (customers see it) and also read the UPI ID / merchant code from it
  const pick = async (e) => {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
    try {
      const img = await compressImage(file, 900, 260000);
      setF((x) => ({ ...x, upiQr: img }));
      try {
        const u = parseUpiQr(await readQr(file));
        if (u) { setF((x) => ({ ...x, upiQr: img, upiId: u.upiId, upiName: u.upiName || x.upiName })); setParams(u.extra); toast(t('QR read — UPI ID filled in. Tap Save.')); }
        else toast(t('QR photo added. Type your UPI ID below too.'));
      } catch { /* photo still saved */ }
    } catch (er) { toast(t(er.message || 'Could not read the photo'), 'err'); }
  };
  const save = async () => {
    const id = f.upiId.trim(); const mob = f.upiMobile.replace(/\D/g, '').slice(-10);
    if (id && !UPI_RE.test(id)) { toast(t('UPI ID looks wrong. Example: shopname@okaxis'), 'err'); return; }
    if (f.upiMobile && mob.length !== 10) { toast(t('Enter a valid 10-digit mobile number'), 'err'); return; }
    if (shop && !id && !f.upiQr && !mob) { toast(t('Add your UPI ID, mobile number or QR photo'), 'err'); return; }
    setBusy(true);
    try { await onSave({ upiId: id, upiName: f.upiName.trim(), upiQr: f.upiQr, upiMobile: mob, upiParams: params || null }); toast(t('Saved')); } catch (er) { console.warn(er); toast(t('Could not save'), 'err'); }
    setBusy(false);
  };
  return (
    <div className="card upi-edit">
      <h4><Icon name="upi" size={18} /> {title}</h4>
      {hint && <p className="tiny muted">{hint}</p>}
      <p className="field-label">{t('Shop UPI QR')}</p>
      <div className="qr-edit">
        {f.upiQr ? <img src={f.upiQr} alt="QR" /> : <span className="qr-ph"><Icon name="image" size={28} /><small>No QR photo</small></span>}
        <div className="grow">
          <p className="tiny muted">{t('Take a clear, straight photo of your UPI QR stand — customers will see and scan it.')}</p>
          <div className="row gap wrap">
            <label className="btn small green"><Icon name="camera" size={16} /> {t('QR photo')}<input type="file" accept="image/*" capture="environment" hidden onChange={pick} /></label>
            <label className="btn small ghost"><Icon name="image" size={16} /> {t('From gallery')}<input type="file" accept="image/*" hidden onChange={pick} /></label>
            {f.upiQr && <button type="button" className="btn small ghost danger-text" onClick={() => setF({ ...f, upiQr: '' })}>Remove</button>}
          </div>
        </div>
      </div>
      <Field label="UPI ID">
        <input className="input" value={f.upiId} onChange={(e) => { setF({ ...f, upiId: e.target.value.replace(/\s/g, '') }); setParams(null); }} placeholder="shopname@okaxis" autoCapitalize="none" data-notr="" />
      </Field>
      {(
        <Field label="UPI mobile number" hint="The number customers can pay to in any UPI app">
          <input className="input" inputMode="numeric" maxLength={10} value={f.upiMobile} onChange={(e) => setF({ ...f, upiMobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="98XXXXXXXX" />
        </Field>
      )}
      <Field label="Name on UPI account"><input className="input" value={f.upiName} onChange={(e) => setF({ ...f, upiName: e.target.value })} data-notr="" /></Field>
      <button className="btn green block" disabled={busy} onClick={save}>{busy ? 'Saving…' : t('Save')}</button>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { Icon, Field, useToast, Empty } from '../ui.jsx';
import { useApp } from '../App.jsx';
import { watchDoc, patch } from '../lib/fb.js';
import { compressImage, fmtDateTime, plain } from '../lib/utils.js';
import { saveDataUrl, openDataUrl } from '../lib/pdf.js';
import { DocSheet } from '../components/Docs.jsx';
import PartnerAgreement from '../components/PartnerAgreement.jsx';
import { GrowStory } from '../components/Grow.jsx';
import {
  DOC_TYPES, FORM_DOCS, SIGN_DOCS, APP_STATUS, AGREEMENT_VERSION, blankApp, missing, saveApp, saveDoc, loadDoc, dropDoc, fileToDoc,
  feeTerms, addHistory, PAN_RE, IFSC_RE, GSTIN_RE, maskAcc,
} from '../lib/partner.js';
import { t } from '../i18n/index.js';

const STEPS = [
  { id: 'details', label: 'Restaurant', icon: 'store' },
  { id: 'bank', label: 'Bank & tax', icon: 'wallet' },
  { id: 'docs', label: 'Documents', icon: 'image' },
  { id: 'agreement', label: 'Agreement', icon: 'shield' },
];

/** "List your restaurant on FoodGaon" — the owner fills details, uploads documents and accepts the agreement.
 *  The admin sees the full file and approves it. */
export default function JoinRestaurant({ nav }) {
  const { user, config, askLogin, roles, setRole } = useApp();
  const [app, setApp] = useState(undefined);
  const [step, setStep] = useState('intro');
  useEffect(() => { if (!user) { setApp(null); return undefined; } return watchDoc('partnerApps', user.uid, setApp); }, [user?.uid]); // eslint-disable-line

  const head = (
    <div className="page-head row gap">
      <button className="icon-btn" onClick={() => (step !== 'intro' && step !== 'status' && app?.status !== 'submitted' ? setStep(prevStep(step)) : nav.back())} aria-label="Back"><Icon name="back" /></button>
      <h2 className="grow">List your restaurant</h2>
    </div>
  );

  if (!user) return <div className="page">{head}<Intro config={config} onStart={askLogin} loggedOut /></div>;
  if (app === undefined) return <div className="page">{head}<div className="skeleton" style={{ height: 220, margin: 16 }} /></div>;

  const locked = app && ['submitted', 'approved', 'rejected', 'removed'].includes(app.status);
  if (locked || (app?.status === 'returned' && step === 'intro')) {
    return <div className="page">{head}<StatusView app={app} config={config} onEdit={() => setStep('details')} canOpenPanel={roles.includes('restaurant')} openPanel={() => setRole('restaurant')} /></div>;
  }
  if (step === 'intro') return <div className="page">{head}<Intro config={config} app={app} onStart={() => setStep('details')} /></div>;
  return <div className="page">{head}<Wizard user={user} config={config} app={app} step={step} setStep={setStep} /></div>;
}
/* ---- small form helpers ---- */
const TOWNS = ['हैदरगढ़', 'सुबेहा', 'बाराबंकी', 'रामसनेहीघाट', 'त्रिवेदीगंज'];
const BANKS = ['State Bank of India', 'Punjab National Bank', 'Bank of Baroda', 'Bank of India', 'Union Bank of India', 'Aryavart Bank', 'HDFC Bank', 'ICICI Bank'];
const ampm = (v) => { const [h, m] = String(v).split(':').map(Number); return `${((h + 11) % 12) + 1}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`; };

/** input whose empty placeholder "types itself" with an example */
function TypedInput({ ex, area, plain: noTr, className = '', ...props }) {
  const [n, setN] = useState(0);
  const empty = !props.value;
  useEffect(() => {
    if (!empty) return undefined;
    const id = setInterval(() => setN((x) => (x + 1) % (ex.length + 14)), 120);
    return () => clearInterval(id);
  }, [empty, ex]);
  const ph = 'जैसे: ' + ex.slice(0, Math.min(n, ex.length)) + (n < ex.length ? '│' : '');
  const p = { className: 'input ' + className, placeholder: ph, 'data-notr': '', ...props };
  return area ? <textarea rows={2} {...p} /> : <input {...p} />;
}
function Chips({ options, value, onPick, fmt = (v) => v }) {
  return (
    <div className="pick-chips" data-notr="">
      {options.map((o) => <button type="button" key={o} className={String(value) === String(o) ? 'on' : ''} onClick={() => onPick(o)}>{fmt(o)}</button>)}
    </div>
  );
}
function Ok({ show, ok, bad }) {
  if (!show) return null;
  return ok ? <small className="t-green tiny" data-notr="">✔ ठीक है</small> : <small className="t-red tiny">{t(bad)}</small>;
}

const prevStep = (s) => { const i = STEPS.findIndex((x) => x.id === s); return i <= 0 ? 'intro' : STEPS[i - 1].id; };

function Intro({ config, app, onStart, loggedOut }) {
  const f = feeTerms(config);
  return (
    <div className="pad-x join-intro">
      <div className="join-hero">
        <div className="jh-glow" />
        <span className="jh-chip">For restaurant owners</span>
        <h2>Your kitchen, on every phone in town</h2>
        <p>Take orders on FoodGaon. Your food, your delivery boys, your customers — and the money comes to your own account.</p>
      </div>
      {app && <button className="btn primary block" onClick={onStart}>Continue my form <Icon name="right" size={18} /></button>}
      <GrowStory />
      <div className="card compare-card">
        <h4>On ₹100 of food</h4>
        <div className="cmp-row head"><span /><span>Big delivery apps</span><span className="fg">FoodGaon</span></div>
        <div className="cmp-row"><span>Restaurant gets</span><span>₹60–70</span><span className="fg">{`₹${Math.round((100 - 100 * 5 / 105 - f.onHundred) * 100) / 100}`}</span></div>
        <div className="cmp-row"><span>Customer pays extra</span><span>₹20–40 fees</span><span className="fg">₹0</span></div>
        <div className="cmp-row"><span>Price on app</span><span>Often higher</span><span className="fg">Same as counter</span></div>
        <p className="tiny muted">FoodGaon figure after 5% GST (paid by FoodGaon) and the FoodGaon fee. Big-app figures are typical commission + fees reported in news; they vary.</p>
      </div>
      <div className="card">
        <h4><Icon name="list" size={18} /> Keep these ready</h4>
        <ul className="ready-list">
          <li>FSSAI licence or registration</li><li>Owner's PAN card</li><li>Bank passbook first page or a cancelled cheque</li><li>A photo of your shop / kitchen</li><li>GST certificate (only if you have GST)</li>
        </ul>
        <p className="tiny muted">Takes about 10 minutes. You can stop and continue later — your form is saved.</p>
      </div>
      <button className="btn primary block lg" onClick={onStart}>{loggedOut ? 'Log in to start' : app ? 'Continue my form' : 'Start — it is free'} <Icon name="right" size={18} /></button>
    </div>
  );
}

function Stepper({ step, setStep, done }) {
  const i = STEPS.findIndex((s) => s.id === step);
  return (
    <div className="join-steps">
      {STEPS.map((s, k) => (
        <button key={s.id} className={(k === i ? 'on ' : '') + (k < i || done[s.id] ? 'done' : '')} onClick={() => setStep(s.id)}>
          <span>{k < i || done[s.id] ? <Icon name="check" size={14} stroke={3} /> : k + 1}</span><small>{s.label}</small>
        </button>
      ))}
    </div>
  );
}

function Wizard({ user, config, app, step, setStep }) {
  const toast = useToast();
  const [f, setF] = useState(() => { const x = { ...blankApp(user), ...(app || {}) }; if (x.bankAcc) x.bankAcc2 = x.bankAcc; return x; });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (app) setF((x) => ({ ...x, docs: app.docs || {}, status: app.status, note: app.note })); }, [app?.docs, app?.status]); // eslint-disable-line
  const set = (k, fn = (v) => v) => (e) => setF({ ...f, [k]: fn(e.target.value) });
  const up = (v) => v.toUpperCase().replace(/\s/g, '');
  const digits = (v) => v.replace(/\D/g, '');
  const save = async (extra = {}) => {
    const data = { ...f, ...extra, uid: user.uid, ownerPhone: f.ownerPhone, status: extra.status || (f.status === 'returned' ? 'returned' : 'draft'), updatedMs: Date.now() };
    delete data.bankAcc2;
    delete data.id;
    if (!extra.docs) delete data.docs; // document list is written only by the uploader (no race with uploads)
    await saveApp(user.uid, data);
    return data;
  };
  const next = async (to) => {
    setBusy(true);
    try { await save(); setStep(to); window.scrollTo(0, 0); } catch (e) { console.warn(e); toast(t('Could not save'), 'err'); }
    setBusy(false);
  };
  const done = {
    details: !!(f.restName && f.address && f.ownerName && /^\d{14}$/.test(f.fssai) && /^\d{6}$/.test(f.pincode || '')),
    bank: !!(PAN_RE.test(f.pan) && IFSC_RE.test(f.bankIfsc) && /^\d{8,18}$/.test(f.bankAcc) && f.bankHolder),
    docs: FORM_DOCS.filter((d) => d.need).every((d) => f.docs?.[d.id]),
    agreement: false,
  };

  return (
    <div className="pad-x">
      <Stepper step={step} setStep={setStep} done={done} />
      {f.status === 'returned' && app?.note && <div className="alert alert-red"><b>{t('Changes needed')}:</b> <span data-notr="">{app.note}</span></div>}

      {step === 'details' && (
        <div className="card join-form">
          <h4><Icon name="store" size={18} /> Restaurant details</h4>
          <label className={'veg-pledge' + (f.vegOnly ? ' on' : '')} data-notr="">
            <input type="checkbox" checked={!!f.vegOnly} onChange={(e) => setF({ ...f, vegOnly: e.target.checked })} />
            <span className="vp-mark"><i /></span>
            <span className="grow"><b>हम केवल शुद्ध शाकाहारी खाना बनाते और परोसते हैं</b><small>FoodGaon पर सिर्फ़ शुद्ध शाकाहारी रसोई जुड़ती हैं</small></span>
          </label>
          {!f.vegOnly && <div className="alert alert-amber small" data-notr="">FoodGaon केवल शुद्ध शाकाहारी रेस्टोरेंट जोड़ता है। अगर आपकी रसोई में नॉन-वेज बनता है, तो आवेदन मंज़ूर नहीं हो पाएगा।</div>}
          <Field label="Restaurant name *"><TypedInput value={f.restName} onChange={set('restName')} maxLength={60} ex="शर्मा भोजनालय" /></Field>
          <Field label="One line about your food"><TypedInput value={f.tagline} onChange={set('tagline')} maxLength={80} ex="1995 से मशहूर छोले-भटूरे" /></Field>
          <Field label="Full address *"><TypedInput area value={f.address} onChange={set('address')} maxLength={200} ex="मेन रोड, बस अड्डे के सामने, हैदरगढ़" /></Field>
          <Field label="Town"><TypedInput value={f.town} onChange={set('town')} maxLength={40} ex="हैदरगढ़" /></Field>
          <Chips options={TOWNS} value={f.town} onPick={(v) => setF({ ...f, town: v })} />
          <div className="row gap">
            <Field label="Landmark"><TypedInput value={f.landmark} onChange={set('landmark')} maxLength={60} ex="SBI के पास" /></Field>
            <Field label="PIN code *"><TypedInput inputMode="numeric" maxLength={6} value={f.pincode || ''} onChange={set('pincode', digits)} ex="225124" plain /></Field>
          </div>
          <Field label="Owner name *"><TypedInput value={f.ownerName} onChange={set('ownerName')} maxLength={50} ex="रमेश कुमार शर्मा" /></Field>
          <Field label="Owner mobile" hint="Your login number — orders come to this"><input className="input" value={plain(f.ownerPhone)} disabled /></Field>
          <div className="row gap">
            <Field label="Other mobile"><TypedInput inputMode="numeric" maxLength={10} value={f.altPhone} onChange={set('altPhone', digits)} ex="9876543210" plain /></Field>
            <Field label="Email"><TypedInput type="email" value={f.email} onChange={set('email', (v) => v.trim())} maxLength={60} ex="shop@gmail.com" plain /></Field>
          </div>
          <Field label="FSSAI number * (14 digits)"><TypedInput inputMode="numeric" maxLength={14} value={f.fssai} onChange={set('fssai', digits)} ex="12345678901234" plain /></Field>
          {f.fssai && <small className={'tiny ' + (/^\d{14}$/.test(f.fssai) ? 't-green' : 'muted')}>{/^\d{14}$/.test(f.fssai) ? '✔ ठीक है' : `${f.fssai.length}/14`}</small>}
          <p className="field-label">Opens at</p>
          <div className="row gap"><input className="input" type="time" value={f.openTime} onChange={set('openTime')} /><Chips options={['08:00', '09:00', '10:00', '11:00']} value={f.openTime} onPick={(v) => setF({ ...f, openTime: v })} fmt={ampm} /></div>
          <p className="field-label">Closes at</p>
          <div className="row gap"><input className="input" type="time" value={f.closeTime} onChange={set('closeTime')} /><Chips options={['21:00', '22:00', '23:00']} value={f.closeTime} onPick={(v) => setF({ ...f, closeTime: v })} fmt={ampm} /></div>
          <p className="field-label">Cooking time (min)</p>
          <Chips options={[10, 15, 20, 30, 45]} value={Number(f.prepMins)} onPick={(v) => setF({ ...f, prepMins: v })} fmt={(v) => `${v} मिनट`} />
          <p className="field-label">Delivery area (km)</p>
          <Chips options={[2, 3, 5, 8, 10]} value={Number(f.radiusKm)} onPick={(v) => setF({ ...f, radiusKm: v })} fmt={(v) => `${v} किमी`} />
          <p className="field-label">Your delivery boys <span className="muted" data-notr="">(कम से कम 1)</span></p>
          <div className="qty-step">
            <button type="button" onClick={() => setF({ ...f, ownRiders: Math.max(1, Number(f.ownRiders || 1) - 1) })} aria-label="कम करें">−</button>
            <b>{Math.max(1, Number(f.ownRiders || 1))}</b>
            <button type="button" onClick={() => setF({ ...f, ownRiders: Math.min(20, Number(f.ownRiders || 1) + 1) })} aria-label="बढ़ाएँ">+</button>
          </div>
          <div className="gst-mode">
            <p className="small"><b>{t('Menu prices are…')}</b></p>
            <div className="seg">
              <button type="button" className={f.priceInclGst !== false ? 'on' : ''} onClick={() => setF({ ...f, priceInclGst: true })}>{t('With GST')}</button>
              <button type="button" className={f.priceInclGst === false ? 'on' : ''} onClick={() => setF({ ...f, priceInclGst: false })}>{t('Without GST')}</button>
            </div>
          </div>
          <button className="btn primary block lg" disabled={busy} onClick={() => next('bank')}>Save and next <Icon name="right" size={18} /></button>
        </div>
      )}

      {step === 'bank' && (
        <div className="card join-form">
          <h4><Icon name="wallet" size={18} /> Bank & tax</h4>
          <p className="tiny muted"><Icon name="shield" size={13} /> {t('Only the FoodGaon admin can see these details. They are never shown to customers.')}</p>
          <Field label="Owner PAN *"><TypedInput maxLength={10} value={f.pan} onChange={set('pan', up)} ex="ABCDE1234F" plain /></Field>
          <Ok show={!!f.pan} ok={PAN_RE.test(f.pan || '')} bad="PAN looks wrong" />
          <Field label="GSTIN (if you have GST)"><TypedInput maxLength={15} value={f.gstin} onChange={set('gstin', up)} ex="09ABCDE1234F1Z5" plain /></Field>
          <Ok show={!!f.gstin} ok={GSTIN_RE.test(f.gstin || '')} bad="GSTIN looks wrong" />
          <Field label="Account holder name *" hint="Exactly as in the passbook"><TypedInput value={f.bankHolder} onChange={set('bankHolder')} maxLength={60} ex="RAMESH KUMAR SHARMA" plain /></Field>
          <Field label="Bank name"><TypedInput value={f.bankName} onChange={set('bankName')} maxLength={60} ex="State Bank of India" plain /></Field>
          <Chips options={BANKS} value={f.bankName} onPick={(v) => setF({ ...f, bankName: v })} />
          <Field label="Account number *"><TypedInput inputMode="numeric" maxLength={18} value={f.bankAcc} onChange={(e) => setF({ ...f, bankAcc: digits(e.target.value) })} ex="12345678901" plain /></Field>
          <Field label="Type account number again *">
            <div className="match-wrap">
              <input className="input" inputMode="numeric" maxLength={18} value={f.bankAcc2 || ''} onChange={(e) => setF({ ...f, bankAcc2: digits(e.target.value) })} onPaste={(e) => e.preventDefault()} autoComplete="off" placeholder="दोबारा टाइप करें" data-notr="" />
              {f.bankAcc2 && f.bankAcc2 === f.bankAcc && <span className="match-tick" aria-label="मिलान हो गया">✔</span>}
            </div>
          </Field>
          {f.bankAcc2 && f.bankAcc2 !== f.bankAcc && <small className="t-red tiny">{f.bankAcc.startsWith(f.bankAcc2) ? '…' : t('Account numbers do not match')}</small>}
          {f.bankAcc2 && f.bankAcc2 === f.bankAcc && <small className="t-green tiny" data-notr="">✔ खाता नंबर मिल गया</small>}
          <Field label="IFSC *"><TypedInput maxLength={11} value={f.bankIfsc} onChange={set('bankIfsc', up)} ex="SBIN0001234" plain /></Field>
          <Ok show={!!f.bankIfsc} ok={IFSC_RE.test(f.bankIfsc || '')} bad="IFSC looks wrong" />
          <Field label="Shop UPI ID" hint="For direct UPI orders"><TypedInput value={f.upiId} onChange={set('upiId', (v) => v.trim())} ex="sharmabhojnalaya@sbi" plain /></Field>
          <button className="btn primary block lg" disabled={busy || (f.bankAcc2 || '') !== (f.bankAcc || '')} onClick={() => next('docs')}>Save and next <Icon name="right" size={18} /></button>
          {(f.bankAcc2 || '') !== (f.bankAcc || '') && <p className="tiny muted center" data-notr="">आगे बढ़ने के लिए खाता नंबर दोबारा टाइप करें</p>}
        </div>
      )}

      {step === 'docs' && <DocsStep uid={user.uid} f={f} setF={setF} save={save} onNext={() => next('agreement')} busy={busy} />}

      {step === 'agreement' && <AgreementStep user={user} config={config} f={f} setF={setF} app={app} save={save} />}
    </div>
  );
}

function DocsStep({ uid, f, setF, save, onNext, busy }) {
  return (
    <div className="card join-form">
      <h4><Icon name="image" size={18} /> Documents</h4>
      <p className="tiny muted">{t('Take a clear photo in good light. A PDF up to 650 KB also works.')}</p>
      <div className="doc-up-list">
        {FORM_DOCS.map((d) => <DocUpload key={d.id} uid={uid} d={d} f={f} setF={setF} save={save} />)}
      </div>
      <p className="tiny muted" data-notr="">हस्ताक्षर वाला अनुबंध अगले (चौथे) कदम में अपलोड होगा।</p>
      <button className="btn primary block lg" disabled={busy} onClick={onNext}>Save and next <Icon name="right" size={18} /></button>
    </div>
  );
}

/** one document row: camera / gallery / PDF, live percent while uploading, green tick when saved */
function DocUpload({ uid, d, f, setF, save }) {
  const toast = useToast();
  const [pct, setPct] = useState(null);
  const [err, setErr] = useState('');
  const have = f.docs?.[d.id];
  const pick = async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setErr(''); setPct(5);
    let p = 5; const tick = setInterval(() => { p = Math.min(p + (p < 60 ? 9 : 3), 92); setPct(p); }, 180);
    try {
      const doc = await fileToDoc(file, compressImage);
      p = Math.max(p, 55); setPct(p);
      await saveDoc(uid, d.id, doc);
      const meta = { name: String(doc.name || '').slice(0, 60), ms: Date.now(), pdf: doc.data.startsWith('data:application/pdf') };
      try { await patch('partnerApps', uid, { [`docs.${d.id}`]: meta, updatedMs: Date.now() }); } catch (pe) {
        if (!/not-found|no document/i.test(String(pe?.code || pe?.message))) throw pe;
        await save({ docs: { ...(f.docs || {}), [d.id]: meta } });
      }
      setF((x) => ({ ...x, docs: { ...(x.docs || {}), [d.id]: meta } }));
      clearInterval(tick); setPct(100);
      setTimeout(() => setPct(null), 900);
    } catch (er) {
      clearInterval(tick); setPct(null);
      const m = String(er?.code || er?.message || '');
      const msg = /permission/i.test(m) ? 'अनुमति नहीं मिली — ऐप बंद करके दोबारा लॉग इन करें' : /network|unavailable|offline/i.test(m) ? 'इंटरनेट धीमा है — दोबारा कोशिश करें' : /too large|exceeds|size/i.test(m) ? 'फ़ाइल बहुत बड़ी है — फ़ोटो से भेजें' : (er?.message || 'अपलोड नहीं हुआ — दोबारा कोशिश करें');
      setErr(msg); toast(msg, 'err');
    }
  };
  const del = async () => {
    try {
      await dropDoc(uid, d.id);
      await patch('partnerApps', uid, { [`docs.${d.id}`]: null, updatedMs: Date.now() });
      setF((x) => ({ ...x, docs: { ...(x.docs || {}), [d.id]: null } }));
    } catch { toast(t('Could not delete'), 'err'); }
  };
  return (
    <div className={'doc-up' + (have ? ' have' : '') + (err ? ' bad' : '')}>
      <span className="du-ic">{pct !== null ? <span className="du-pct">{pct}%</span> : have ? <Icon name="check" size={18} stroke={3} /> : <Icon name={d.id === 'shop' ? 'store' : 'receipt'} size={18} />}</span>
      <div className="grow du-body">
        <b>{t(d.label)}{d.need ? ' *' : ''}</b>
        {pct !== null ? (
          <div className="du-bar"><i style={{ width: pct + '%' }} /></div>
        ) : (
          <small className="muted du-name">{have ? `✔ ${have.name || ''} · ${fmtDateTime(have.ms)}` : t(d.hint)}</small>
        )}
        {err && <small className="t-red du-err" data-notr="">{err}</small>}
        {have && pct === null && <ViewDocBtn uid={uid} type={d.id} name={d.label} />}
      </div>
      {pct === null && (
        <div className="du-act">
          <label className="btn small ghost" aria-label="कैमरा"><Icon name="camera" size={15} /><input type="file" accept="image/*" capture="environment" hidden onChange={pick} /></label>
          <label className="btn small ghost" aria-label="गैलरी या PDF"><Icon name="plus" size={15} /><input type="file" accept="image/*,application/pdf" hidden onChange={pick} /></label>
          {have && <button className="btn small ghost danger-text" onClick={del} aria-label="Remove"><Icon name="trash" size={15} /></button>}
        </div>
      )}
    </div>
  );
}

export function ViewDocBtn({ uid, type, name, label = 'View' }) {
  const toast = useToast();
  const [img, setImg] = useState(null);
  const go = async (download) => {
    try {
      const d = await loadDoc(uid, type); if (!d) throw new Error('File not found');
      if (download) await saveDataUrl(d.data, `${name}-${d.name || type}`);
      else if (d.data.startsWith('data:image')) setImg(d.data); else await openDataUrl(d.data, `${name}.pdf`);
    } catch (e) { toast(t(e.message || 'Could not open'), 'err'); }
  };
  return (
    <span className="row gap tiny">
      <button className="link small" onClick={() => go(false)}>{label}</button>
      <button className="link small" onClick={() => go(true)}><Icon name="download" size={14} /> Download</button>
      {img && <div className="proof-big" onClick={() => setImg(null)}><img src={img} alt="" /><span>✕</span></div>}
    </span>
  );
}

function AgreementStep({ user, config, f, setF, app, save }) {
  const toast = useToast();
  const [name, setName] = useState(f.accepted?.name || f.ownerName || '');
  const [ok, setOk] = useState(false);
  const [pdf, setPdf] = useState(false);
  const [busy, setBusy] = useState(false);
  const miss = useMemo(() => missing(f), [f]);
  const terms = feeTerms(config);
  const submit = async () => {
    if (miss.length) { toast(t('Please complete: ') + miss.map((x) => t(x)).join(', '), 'err'); return; }
    if (!ok || name.trim().length < 3) { toast(t('Tick the box and type your full name'), 'err'); return; }
    setBusy(true);
    try {
      const accepted = { name: name.trim().slice(0, 60), ms: Date.now(), version: AGREEMENT_VERSION, device: navigator.userAgent.slice(0, 120) };
      await save({ status: 'submitted', submittedMs: Date.now(), terms, accepted, note: '', history: addHistory(app || f, 'owner', f.status === 'returned' ? 'resubmitted' : 'submitted') });
      toast(t('Sent! FoodGaon will check and call you.'));
      window.scrollTo(0, 0);
    } catch (e) { console.warn(e); toast(t('Could not send. Check the internet and try again.'), 'err'); }
    setBusy(false);
  };
  return (
    <div className="join-form">
      <div className="card">
        <h4><Icon name="shield" size={18} /> Read the agreement</h4>
        <div className="ag-box"><PartnerAgreement a={{ ...f, terms }} config={config} /></div>
      </div>
      <div className="card sign-card" data-notr="">
        <h4>✍️ अनुबंध पर हस्ताक्षर करके अपलोड करें</h4>
        <ol className="sign-steps">
          <li><span>1</span><div><b>डाउनलोड करें</b><small>नीचे के बटन से अनुबंध की PDF फ़ोन में सेव करें।</small></div></li>
          <li><span>2</span><div><b>प्रिंट निकालें</b><small>नज़दीकी फ़ोटोकॉपी / CSC दुकान से प्रिंट करवाएँ।</small></div></li>
          <li><span>3</span><div><b>हर पन्ने पर हस्ताक्षर करें</b><small>मालिक हर पन्ने पर साइन करे; मोहर हो तो लगा दें। एक कॉपी अपने पास रखें।</small></div></li>
          <li><span>4</span><div><b>हर पन्ने की फ़ोटो अपलोड करें</b><small>पूरा पन्ना साफ़ दिखे, रोशनी अच्छी हो।</small></div></li>
        </ol>
        <button className="btn primary block" onClick={() => setPdf(true)}><Icon name="download" size={18} /> अनुबंध डाउनलोड करें (प्रिंट और साइन के लिए)</button>
        <div className="doc-up-list">
          {SIGN_DOCS.map((d) => <DocUpload key={d.id} uid={user.uid} d={d} f={f} setF={setF} save={save} />)}
        </div>
        <p className="tiny muted">अभी प्रिंट नहीं हो पा रहा? नीचे नाम लिखकर अनुबंध स्वीकार करके भेज दें — साइन वाली फ़ोटो बाद में भी "मेरा आवेदन" से अपलोड कर सकते हैं।</p>
      </div>
      <div className="card">
        {miss.length > 0 && <div className="alert alert-amber small"><b>{t('Still needed')}:</b> {miss.map((x) => t(x)).join(' · ')}</div>}
        <Field label="Type your full name as signature"><input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} data-notr="" /></Field>
        <label className="check-row"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /> {t('I have read and accept the FoodGaon Restaurant Partner Agreement. My prices, portions and quality on FoodGaon will be the same as at my counter.')}</label>
        <button className="btn green block lg" disabled={busy} onClick={submit}><Icon name="check" size={18} stroke={3} /> {busy ? t('Sending…') : t('Accept and send to FoodGaon')}</button>
      </div>
      {pdf && <DocSheet open onClose={() => setPdf(false)} title="Restaurant Partner Agreement" fileName={`FoodGaon-Agreement-${(f.restName || 'restaurant').replace(/[^\w]+/g, '-')}.pdf`}><PartnerAgreement a={{ ...f, terms }} config={config} /></DocSheet>}
    </div>
  );
}

function StatusView({ app, config, onEdit, canOpenPanel, openPanel }) {
  const st = APP_STATUS[app.status] || APP_STATUS.draft;
  const [pdf, setPdf] = useState(false);
  return (
    <div className="pad-x">
      <StatusTrack status={app.status} />
      <div className={'status-hero st-' + app.status}>
        <span className="sh-ic"><Icon name={app.status === 'approved' ? 'check' : app.status === 'submitted' ? 'clock' : 'info'} size={30} stroke={2.5} /></span>
        <b>{t(st.label)}</b>
        <small data-notr="">{app.restName}</small>
        {app.status === 'submitted' && <p>{t('FoodGaon will check your documents and call you within 1–2 days.')}</p>}
        {app.status === 'approved' && <p data-notr="">🎉 बधाई हो! आपकी दुकान FoodGaon पर जुड़ गई है। मेनू जोड़ें और "दुकान खुली" करते ही आप लाइव हैं।</p>}
        {app.status === 'removed' && <p data-notr="">यह रेस्टोरेंट FoodGaon से हटा दिया गया है। जानकारी के लिए FoodGaon से संपर्क करें।</p>}
        {(app.status === 'returned' || app.status === 'rejected') && app.note && <p className="sh-note" data-notr="">{app.note}</p>}
      </div>
      {app.status === 'approved' && canOpenPanel && <button className="btn primary block lg" onClick={openPanel}><Icon name="store" size={18} /> Open my restaurant panel</button>}
      {app.status === 'returned' && <button className="btn primary block lg" onClick={onEdit}><Icon name="edit" size={18} /> Make changes and send again</button>}
      <div className="card">
        <h4>Your details</h4>
        <div className="kv" data-notr="">
          <span>{t('Owner')}</span><b>{app.ownerName} · {plain(app.ownerPhone)}</b>
          <span>FSSAI</span><b>{app.fssai}</b>
          <span>PAN</span><b>{app.pan}</b>
          {app.gstin && <><span>GSTIN</span><b>{app.gstin}</b></>}
          <span>{t('Bank')}</span><b>{app.bankHolder} · {maskAcc(app.bankAcc)} · {app.bankIfsc}</b>
        </div>
      </div>
      <div className="card">
        <h4>Documents</h4>
        {FORM_DOCS.filter((d) => app.docs?.[d.id]).map((d) => (
          <div key={d.id} className="bill small"><span>{t(d.label)}</span><ViewDocBtn uid={app.uid || app.id} type={d.id} name={d.label} /></div>
        ))}
        {SIGN_DOCS.filter((d) => app.docs?.[d.id]).map((d) => (
          <div key={d.id} className="bill small"><span>{t(d.label)}</span><ViewDocBtn uid={app.uid || app.id} type={d.id} name={d.label} /></div>
        ))}
      </div>
      {['submitted', 'returned'].includes(app.status) && (
        <div className="card sign-card" data-notr="">
          <h4>✍️ हस्ताक्षर वाला अनुबंध</h4>
          <p className="tiny muted">अनुबंध डाउनलोड करें, प्रिंट करके हर पन्ने पर साइन करें, फिर हर पन्ने की फ़ोटो यहाँ अपलोड करें।</p>
          <button className="btn ghost block" onClick={() => setPdf(true)}><Icon name="download" size={18} /> अनुबंध डाउनलोड करें</button>
          <div className="doc-up-list">
            {SIGN_DOCS.map((d) => <DocUpload key={d.id} uid={app.uid || app.id} d={d} f={app} setF={() => {}} save={(x) => patch('partnerApps', app.uid || app.id, { ...x, updatedMs: Date.now() })} />)}
          </div>
        </div>
      )}
      {app.status === 'approved' && !SIGN_DOCS.some((d) => app.docs?.[d.id]) && <p className="tiny muted center" data-notr="">साइन वाली अनुबंध की कॉपी FoodGaon टीम आपसे मिलकर ले लेगी।</p>}
      <div className="card">
        <h4>Agreement</h4>
        {app.accepted && <p className="small">{t('Accepted by')} <b data-notr="">{app.accepted.name}</b> · {fmtDateTime(app.accepted.ms)}</p>}
        <button className="btn ghost block" onClick={() => setPdf(true)}><Icon name="download" size={18} /> Agreement PDF</button>
      </div>
      {(app.history || []).length > 0 && (
        <div className="card">
          <h4>History</h4>
          <div className="timeline">{[...app.history].reverse().map((h, i) => <div key={i} className="tl-row"><i /><div><b>{t(HIST[h.act] || h.act)}</b><small className="muted">{fmtDateTime(h.ms)}{h.note ? ' · ' : ''}<span data-notr="">{h.note}</span></small></div></div>)}</div>
        </div>
      )}
      {pdf && <DocSheet open onClose={() => setPdf(false)} title="Restaurant Partner Agreement" fileName={`FoodGaon-Agreement-${(app.restName || 'restaurant').replace(/[^\w]+/g, '-')}.pdf`}><PartnerAgreement a={app} config={config} accepted={app.accepted} /></DocSheet>}
    </div>
  );
}
/** sent → under review → live */
function StatusTrack({ status }) {
  const stage = status === 'approved' ? 3 : status === 'submitted' ? 2 : 1;
  const bad = ['rejected', 'removed'].includes(status);
  const steps = [['📝', 'आवेदन भेजा'], ['🔍', status === 'returned' ? 'सुधार चाहिए' : 'जाँच में'], ['🎉', 'आप लाइव हैं']];
  return (
    <div className={'st-track' + (bad ? ' bad' : '')} data-notr="">
      {steps.map(([e, l], i) => (
        <React.Fragment key={l}>
          {i > 0 && <span className={'stt-line' + (stage > i ? ' on' : '')} />}
          <div className={'stt' + (stage > i ? ' done' : '') + (stage === i + 1 ? ' cur' : '') + (status === 'returned' && i === 1 ? ' warn' : '')}>
            <span>{stage > i + 1 || (status === 'approved' && i === 2) ? '✔' : e}</span><small>{l}</small>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

export const HIST = { removed: 'Removed from FoodGaon', submitted: 'Sent to FoodGaon', resubmitted: 'Sent again after changes', returned: 'Sent back for changes', approved: 'Approved', rejected: 'Not approved', edited: 'Details changed by admin', note: 'Note' };

export function JoinEmpty() { return <Empty icon="store" title="Nothing here" />; }

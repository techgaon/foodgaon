import React, { useEffect, useMemo, useState } from 'react';
import { Icon, Field, useToast, Empty } from '../ui.jsx';
import { useApp } from '../App.jsx';
import { watchDoc } from '../lib/fb.js';
import { compressImage, fmtDateTime, plain } from '../lib/utils.js';
import { saveDataUrl, openDataUrl } from '../lib/pdf.js';
import { DocSheet } from '../components/Docs.jsx';
import PartnerAgreement from '../components/PartnerAgreement.jsx';
import { GrowStory } from '../components/Grow.jsx';
import {
  DOC_TYPES, APP_STATUS, AGREEMENT_VERSION, blankApp, missing, saveApp, saveDoc, loadDoc, dropDoc, fileToDoc,
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

  const locked = app && ['submitted', 'approved', 'rejected'].includes(app.status);
  if (locked || (app?.status === 'returned' && step === 'intro')) {
    return <div className="page">{head}<StatusView app={app} config={config} onEdit={() => setStep('details')} canOpenPanel={roles.includes('restaurant')} openPanel={() => setRole('restaurant')} /></div>;
  }
  if (step === 'intro') return <div className="page">{head}<Intro config={config} app={app} onStart={() => setStep('details')} /></div>;
  return <div className="page">{head}<Wizard user={user} config={config} app={app} step={step} setStep={setStep} /></div>;
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
  const [f, setF] = useState(() => ({ ...blankApp(user), ...(app || {}) }));
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (app) setF((x) => ({ ...x, docs: app.docs || {}, status: app.status, note: app.note })); }, [app?.docs, app?.status]); // eslint-disable-line
  const set = (k, fn = (v) => v) => (e) => setF({ ...f, [k]: fn(e.target.value) });
  const up = (v) => v.toUpperCase().replace(/\s/g, '');
  const digits = (v) => v.replace(/\D/g, '');
  const save = async (extra = {}) => {
    const data = { ...f, ...extra, uid: user.uid, ownerPhone: f.ownerPhone, status: extra.status || (f.status === 'returned' ? 'returned' : 'draft'), updatedMs: Date.now() };
    delete data.bankAcc2;
    delete data.id;
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
    docs: DOC_TYPES.filter((d) => d.need).every((d) => f.docs?.[d.id]),
    agreement: false,
  };

  return (
    <div className="pad-x">
      <Stepper step={step} setStep={setStep} done={done} />
      {f.status === 'returned' && app?.note && <div className="alert alert-red"><b>{t('Changes needed')}:</b> <span data-notr="">{app.note}</span></div>}

      {step === 'details' && (
        <div className="card join-form">
          <h4><Icon name="store" size={18} /> Restaurant details</h4>
          <Field label="Restaurant name *"><input className="input" value={f.restName} onChange={set('restName')} maxLength={60} data-notr="" /></Field>
          <Field label="One line about your food" hint="e.g. Famous for chole bhature since 1995"><input className="input" value={f.tagline} onChange={set('tagline')} maxLength={80} data-notr="" /></Field>
          <Field label="Full address *"><textarea className="input" rows={2} value={f.address} onChange={set('address')} maxLength={200} data-notr="" /></Field>
          <div className="row gap">
            <Field label="Town"><input className="input" value={f.town} onChange={set('town')} maxLength={40} data-notr="" /></Field>
            <Field label="Landmark"><input className="input" value={f.landmark} onChange={set('landmark')} maxLength={60} data-notr="" /></Field>
          </div>
          <Field label="PIN code *"><input className="input" inputMode="numeric" maxLength={6} value={f.pincode || ''} onChange={set('pincode', digits)} /></Field>
          <div className="row gap">
            <Field label="Owner name *"><input className="input" value={f.ownerName} onChange={set('ownerName')} maxLength={50} data-notr="" /></Field>
            <Field label="Owner mobile" hint="Your login number — orders come to this"><input className="input" value={plain(f.ownerPhone)} disabled /></Field>
          </div>
          <div className="row gap">
            <Field label="Other mobile"><input className="input" inputMode="numeric" maxLength={10} value={f.altPhone} onChange={set('altPhone', digits)} /></Field>
            <Field label="Email"><input className="input" type="email" value={f.email} onChange={set('email', (v) => v.trim())} maxLength={60} data-notr="" /></Field>
          </div>
          <Field label="FSSAI number * (14 digits)"><input className="input" inputMode="numeric" maxLength={14} value={f.fssai} onChange={set('fssai', digits)} data-notr="" /></Field>
          <div className="row gap">
            <Field label="Opens at"><input className="input" type="time" value={f.openTime} onChange={set('openTime')} /></Field>
            <Field label="Closes at"><input className="input" type="time" value={f.closeTime} onChange={set('closeTime')} /></Field>
          </div>
          <div className="row gap">
            <Field label="Cooking time (min)"><input className="input" inputMode="numeric" value={f.prepMins} onChange={set('prepMins', digits)} /></Field>
            <Field label="Delivery area (km)"><input className="input" inputMode="decimal" value={f.radiusKm} onChange={set('radiusKm', (v) => v.replace(/[^\d.]/g, ''))} /></Field>
          </div>
          <Field label="Your delivery boys"><input className="input" inputMode="numeric" value={f.ownRiders} onChange={set('ownRiders', digits)} /></Field>
          <div className="gst-mode">
            <p className="small"><b>{t('Menu prices are…')}</b></p>
            <div className="seg">
              <button type="button" className={f.priceInclGst !== false ? 'on' : ''} onClick={() => setF({ ...f, priceInclGst: true })}>{t('With GST')}</button>
              <button type="button" className={f.priceInclGst === false ? 'on' : ''} onClick={() => setF({ ...f, priceInclGst: false })}>{t('Without GST')}</button>
            </div>
          </div>
          <label className="check-row"><input type="checkbox" checked={!!f.vegOnly} onChange={(e) => setF({ ...f, vegOnly: e.target.checked })} /> {t('We serve only vegetarian food')}</label>
          <button className="btn primary block lg" disabled={busy} onClick={() => next('bank')}>Save and next <Icon name="right" size={18} /></button>
        </div>
      )}

      {step === 'bank' && (
        <div className="card join-form">
          <h4><Icon name="wallet" size={18} /> Bank & tax</h4>
          <p className="tiny muted"><Icon name="shield" size={13} /> {t('Only the FoodGaon admin can see these details. They are never shown to customers.')}</p>
          <Field label="Owner PAN *"><input className="input" maxLength={10} value={f.pan} onChange={set('pan', up)} placeholder="ABCDE1234F" data-notr="" /></Field>
          {f.pan && !PAN_RE.test(f.pan) && <small className="t-red tiny">{t('PAN looks wrong')}</small>}
          <Field label="GSTIN (if you have GST)"><input className="input" maxLength={15} value={f.gstin} onChange={set('gstin', up)} data-notr="" /></Field>
          {f.gstin && !GSTIN_RE.test(f.gstin) && <small className="t-red tiny">{t('GSTIN looks wrong')}</small>}
          <Field label="Account holder name *" hint="Exactly as in the passbook"><input className="input" value={f.bankHolder} onChange={set('bankHolder')} maxLength={60} data-notr="" /></Field>
          <Field label="Bank name"><input className="input" value={f.bankName} onChange={set('bankName')} maxLength={60} data-notr="" /></Field>
          <Field label="Account number *"><input className="input" inputMode="numeric" maxLength={18} value={f.bankAcc} onChange={set('bankAcc', digits)} data-notr="" /></Field>
          <Field label="Type account number again *"><input className="input" inputMode="numeric" maxLength={18} value={f.bankAcc2 ?? f.bankAcc} onChange={(e) => setF({ ...f, bankAcc2: digits(e.target.value) })} data-notr="" /></Field>
          {f.bankAcc2 !== undefined && f.bankAcc2 !== f.bankAcc && <small className="t-red tiny">{t('Account numbers do not match')}</small>}
          <Field label="IFSC *"><input className="input" maxLength={11} value={f.bankIfsc} onChange={set('bankIfsc', up)} placeholder="SBIN0001234" data-notr="" /></Field>
          {f.bankIfsc && !IFSC_RE.test(f.bankIfsc) && <small className="t-red tiny">{t('IFSC looks wrong')}</small>}
          <Field label="Shop UPI ID" hint="For direct UPI orders"><input className="input" value={f.upiId} onChange={set('upiId', (v) => v.trim())} placeholder="shopname@okaxis" data-notr="" /></Field>
          <button className="btn primary block lg" disabled={busy || (f.bankAcc2 !== undefined && f.bankAcc2 !== f.bankAcc)} onClick={() => { const x = { ...f }; delete x.bankAcc2; setF(x); next('docs'); }}>Save and next <Icon name="right" size={18} /></button>
        </div>
      )}

      {step === 'docs' && <DocsStep uid={user.uid} f={f} setF={setF} save={save} onNext={() => next('agreement')} busy={busy} />}

      {step === 'agreement' && <AgreementStep user={user} config={config} f={f} app={app} save={save} />}
    </div>
  );
}

function DocsStep({ uid, f, setF, save, onNext, busy }) {
  const toast = useToast();
  const [working, setWorking] = useState('');
  const pick = (type) => async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setWorking(type);
    try {
      const d = await fileToDoc(file, compressImage);
      await saveDoc(uid, type, d);
      const docs = { ...(f.docs || {}), [type]: { name: d.name, ms: Date.now(), pdf: d.data.startsWith('data:application/pdf') } };
      setF({ ...f, docs }); await save({ docs });
      toast(t('Uploaded'));
    } catch (er) { toast(t(er.message || 'Could not upload'), 'err'); }
    setWorking('');
  };
  const del = async (type) => {
    try { await dropDoc(uid, type); const docs = { ...(f.docs || {}) }; delete docs[type]; setF({ ...f, docs }); await save({ docs }); } catch { toast(t('Could not delete'), 'err'); }
  };
  return (
    <div className="card join-form">
      <h4><Icon name="image" size={18} /> Documents</h4>
      <p className="tiny muted">{t('Take a clear photo in good light. A PDF up to 650 KB also works.')}</p>
      <div className="doc-up-list">
        {DOC_TYPES.map((d) => {
          const have = f.docs?.[d.id];
          return (
            <div key={d.id} className={'doc-up' + (have ? ' have' : '')}>
              <span className="du-ic">{have ? <Icon name="check" size={18} stroke={3} /> : <Icon name={d.id === 'shop' ? 'store' : 'receipt'} size={18} />}</span>
              <div className="grow">
                <b>{d.label}{d.need ? ' *' : ''}</b>
                <small className="muted">{have ? `${have.name || ''} · ${fmtDateTime(have.ms)}` : d.hint}</small>
                {have && <ViewDocBtn uid={uid} type={d.id} name={d.label} />}
              </div>
              {working === d.id ? <span className="tiny muted">…</span> : (
                <div className="du-act">
                  <label className="btn small ghost"><Icon name="camera" size={15} /><input type="file" accept="image/*" capture="environment" hidden onChange={pick(d.id)} /></label>
                  <label className="btn small ghost"><Icon name="plus" size={15} /><input type="file" accept="image/*,application/pdf" hidden onChange={pick(d.id)} /></label>
                  {have && <button className="btn small ghost danger-text" onClick={() => del(d.id)} aria-label="Remove"><Icon name="trash" size={15} /></button>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="tiny muted">{t('Signed agreement: you can also upload it later, after printing it from the next step.')}</p>
      <button className="btn primary block lg" disabled={busy} onClick={onNext}>Save and next <Icon name="right" size={18} /></button>
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

function AgreementStep({ user, config, f, app, save }) {
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
        <button className="btn ghost block" onClick={() => setPdf(true)}><Icon name="download" size={18} /> Download to print and sign (PDF)</button>
        <p className="tiny muted">{t('Print it, sign every page, and upload the photo under Documents → Signed agreement. You can do this later too.')}</p>
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
      <div className={'status-hero st-' + app.status}>
        <span className="sh-ic"><Icon name={app.status === 'approved' ? 'check' : app.status === 'submitted' ? 'clock' : 'info'} size={30} stroke={2.5} /></span>
        <b>{t(st.label)}</b>
        <small data-notr="">{app.restName}</small>
        {app.status === 'submitted' && <p>{t('FoodGaon will check your documents and call you within 1–2 days.')}</p>}
        {app.status === 'approved' && <p>{t('Welcome to FoodGaon! Add your menu and start taking orders.')}</p>}
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
        {DOC_TYPES.filter((d) => app.docs?.[d.id]).map((d) => (
          <div key={d.id} className="bill small"><span>{t(d.label)}</span><ViewDocBtn uid={app.uid || app.id} type={d.id} name={d.label} /></div>
        ))}
        {!app.docs?.agreement && app.status !== 'rejected' && <p className="tiny muted">{t('Signed agreement not uploaded yet. FoodGaon will collect the signed copy when they visit.')}</p>}
      </div>
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
export const HIST = { submitted: 'Sent to FoodGaon', resubmitted: 'Sent again after changes', returned: 'Sent back for changes', approved: 'Approved', rejected: 'Not approved', edited: 'Details changed by admin', note: 'Note' };

export function JoinEmpty() { return <Empty icon="store" title="Nothing here" />; }

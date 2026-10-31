import React, { useEffect, useState } from 'react';
import { Icon, Sheet, Field, useToast, Empty, Confirm } from '../ui.jsx';
import { useApp } from '../App.jsx';
import { watchList, bulk, patch } from '../lib/fb.js';
import { fmtDateTime, plain, tel, wa } from '../lib/utils.js';
import { DocSheet } from '../components/Docs.jsx';
import PartnerAgreement from '../components/PartnerAgreement.jsx';
import { ViewDocBtn, HIST } from '../customer/JoinRestaurant.jsx';
import { DOC_TYPES, APP_STATUS, loadDocs, setAppStatus, addHistory, feeTerms, feeLine, maskAcc, shrinkDataUrl, slugOf, PAN_RE, IFSC_RE } from '../lib/partner.js';
import { t } from '../i18n/index.js';

/** live list of restaurant applications (admin only) */
export function usePartnerApps() {
  const [l, setL] = useState(null);
  useEffect(() => watchList('partnerApps', [], (x) => setL(x.sort((a, b) => (b.submittedMs || b.updatedMs || 0) - (a.submittedMs || a.updatedMs || 0))), null, null, () => setL([])), []);
  return l;
}

export default function Applications() {
  const list = usePartnerApps();
  const [show, setShow] = useState('submitted');
  const [open, setOpen] = useState(null);
  if (!list) return <div className="skeleton" style={{ height: 120, margin: '10px 0' }} />;
  const n = (s) => list.filter((a) => a.status === s).length;
  const shown = list.filter((a) => show === 'all' || a.status === show);
  const cur = open && list.find((a) => a.id === open);
  return (
    <div>
      <div className="chip-row wrap">
        {[['submitted', 'New'], ['returned', 'Sent back'], ['approved', 'Approved'], ['draft', 'Not sent'], ['all', 'All']].map(([k, l]) => (
          <button key={k} className={'fchip' + (show === k ? ' on' : '')} onClick={() => setShow(k)}>{l}{k !== 'all' && n(k) ? ` (${n(k)})` : ''}</button>
        ))}
      </div>
      {!shown.length && <Empty icon="store" title="No applications here" text="Restaurant owners apply from the FoodGaon app: Account → List your restaurant." />}
      {shown.map((a) => (
        <button key={a.id} className="app-row" onClick={() => setOpen(a.id)}>
          <span className={'app-dot st-' + a.status} />
          <div className="grow">
            <b data-notr="">{a.restName || '(no name yet)'}</b>
            <small className="muted" data-notr="">{`${a.ownerName || ''} · ${plain(a.ownerPhone)} · ${a.town || ''}`}</small>
            <small className={'app-st st-' + a.status}>{t(APP_STATUS[a.status]?.label || a.status)}{a.submittedMs ? ` · ${fmtDateTime(a.submittedMs)}` : ''}</small>
          </div>
          <Icon name="right" size={18} />
        </button>
      ))}
      {cur && <AppFile a={cur} onClose={() => setOpen(null)} />}
    </div>
  );
}

function AppFile({ a, onClose }) {
  const { config } = useApp();
  const toast = useToast();
  const uid = a.uid || a.id;
  const [docs, setDocs] = useState(null);
  const [showBank, setShowBank] = useState(false);
  const [act, setAct] = useState(null); // 'approve' | 'returned' | 'rejected' | 'note' | 'edit'
  const [note, setNote] = useState('');
  const [fee, setFee] = useState(() => feeTerms(config));
  const [file, setFile] = useState(false);
  const [agr, setAgr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState({});
  useEffect(() => { loadDocs(uid).then(setDocs).catch(() => setDocs([])); }, [uid, a.updatedMs]);
  const doc = (type) => (docs || []).find((d) => d.type === type);

  const approve = async () => {
    setBusy(true);
    try {
      const id = a.restaurantId || slugOf(a.restName);
      const cover = await shrinkDataUrl(doc('shop')?.data || '');
      const p10 = plain(a.ownerPhone);
      const terms = { ...feeTerms(config), pct: Number(fee.pct), gstExtra: !!fee.gstExtra };
      terms.onHundred = terms.gstExtra ? Math.round(terms.pct * (1 + terms.cg / 100) * 100) / 100 : terms.pct;
      const rest = {
        name: a.restName.trim(), tagline: a.tagline || '', address: [a.address, a.landmark, a.town, a.pincode].filter(Boolean).join(', '), ownerPhone: p10, ownerName: a.ownerName,
        fssai: a.fssai, gstin: a.gstin || '', radiusKm: Number(a.radiusKm) || 5, minOrder: Number(config.minOrder) || 50, prepMins: Number(a.prepMins) || 20,
        openTime: a.openTime || '', closeTime: a.closeTime || '', priceInclGst: a.priceInclGst !== false, upiId: a.upiId || '', upiName: a.restName,
        cover, open: false, rating: 4.2, sort: 20, demo: false, cuisines: [], lat: null, lng: null,
        applicationId: uid, verified: true, commissionPct: terms.pct, commissionGstExtra: terms.gstExtra, samePrice: true, joinedMs: Date.now(),
      };
      await bulk([
        ['set', 'restaurants', id, rest],
        ['set', 'staff', '+91' + p10, { restaurant: id, name: a.ownerName || a.restName }],
      ]);
      await setAppStatus(uid, a, 'approved', 'admin', note || `Fee: ${feeLine(terms)}`, { restaurantId: id, terms, note: '' });
      toast(t('Approved. The owner can now open the restaurant panel.'));
      setAct(null);
    } catch (e) { console.warn(e); toast(t('Could not save'), 'err'); }
    setBusy(false);
  };
  const decide = async (status) => {
    if (status !== 'note' && note.trim().length < 5) { toast(t('Write the reason for the owner'), 'err'); return; }
    setBusy(true);
    try {
      if (status === 'note') await patch('partnerApps', uid, { history: addHistory(a, 'admin', 'note', note) });
      else await setAppStatus(uid, a, status, 'admin', note, { note: note.trim() });
      toast(t('Saved')); setAct(null); setNote('');
    } catch { toast(t('Could not save'), 'err'); }
    setBusy(false);
  };
  const saveEdit = async () => {
    const keys = Object.keys(edit).filter((k) => edit[k] !== a[k]);
    if (!keys.length) { setAct(null); return; }
    if (edit.pan && !PAN_RE.test(edit.pan)) { toast(t('PAN looks wrong'), 'err'); return; }
    if (edit.bankIfsc && !IFSC_RE.test(edit.bankIfsc)) { toast(t('IFSC looks wrong'), 'err'); return; }
    const old = keys.map((k) => `${k}: ${k === 'bankAcc' ? maskAcc(a[k]) : a[k] || '—'} → ${k === 'bankAcc' ? maskAcc(edit[k]) : edit[k]}`).join('; ');
    setBusy(true);
    try {
      await patch('partnerApps', uid, { ...Object.fromEntries(keys.map((k) => [k, edit[k]])), history: addHistory(a, 'admin', 'edited', old), updatedMs: Date.now() });
      if (a.restaurantId) {
        const pub = Object.fromEntries(keys.filter((k) => ['fssai', 'gstin'].includes(k)).map((k) => [k, edit[k]]));
        if (Object.keys(pub).length) await patch('restaurants', a.restaurantId, pub);
      }
      toast(t('Saved')); setAct(null); setEdit({});
    } catch { toast(t('Could not save'), 'err'); }
    setBusy(false);
  };

  const st = APP_STATUS[a.status] || {};
  return (
    <Sheet open onClose={onClose} title="Restaurant file" full>
      <div className={'file-head st-' + a.status}>
        <div className="grow"><b data-notr="">{a.restName}</b><small data-notr="">{a.address}</small></div>
        <em className={'app-st st-' + a.status}>{t(st.label || a.status)}</em>
      </div>
      <div className="row gap wrap">
        <a className="btn small ghost" href={tel(a.ownerPhone)}><Icon name="phone" size={15} /> Call</a>
        <a className="btn small ghost wa-link" href={wa(a.ownerPhone, `नमस्ते ${a.ownerName || ''} जी, FoodGaon से —`)} target="_blank" rel="noreferrer">WhatsApp</a>
        <button className="btn small ghost" onClick={() => setFile(true)}><Icon name="download" size={15} /> Full file PDF</button>
        <button className="btn small ghost" onClick={() => setAgr(true)}><Icon name="shield" size={15} /> Agreement</button>
      </div>

      <div className="card">
        <h4>Restaurant</h4>
        <div className="kv" data-notr="">
          <span>Owner</span><b>{a.ownerName} · {plain(a.ownerPhone)}{a.altPhone ? ` / ${a.altPhone}` : ''}</b>
          {a.email && <><span>Email</span><b>{a.email}</b></>}
          <span>Town</span><b>{[a.town, a.landmark, a.pincode].filter(Boolean).join(' · ') || '—'}</b>
          <span>Timing</span><b>{`${a.openTime || '?'} – ${a.closeTime || '?'} · cook ${a.prepMins || '?'} min · ${a.radiusKm || '?'} km · ${a.ownRiders || 0} delivery boys`}</b>
          <span>Prices</span><b>{a.priceInclGst !== false ? 'Include GST' : 'Without GST'} · {a.vegOnly ? 'Pure veg' : 'NOT pure veg'}</b>
          <span>FSSAI</span><b>{a.fssai}</b>
        </div>
      </div>
      <div className="card">
        <div className="row between"><h4>Tax & bank</h4><button className="link small" onClick={() => setShowBank(!showBank)}>{showBank ? 'Hide' : 'Show full'}</button></div>
        <div className="kv" data-notr="">
          <span>PAN</span><b>{showBank ? a.pan : maskAcc(a.pan)}</b>
          <span>GSTIN</span><b>{a.gstin || 'Not registered'}</b>
          <span>Holder</span><b>{a.bankHolder}</b>
          <span>Bank</span><b>{a.bankName || '—'}</b>
          <span>Account</span><b>{showBank ? a.bankAcc : maskAcc(a.bankAcc)}</b>
          <span>IFSC</span><b>{a.bankIfsc}</b>
          <span>UPI</span><b>{a.upiId || '—'}</b>
        </div>
        <button className="link small" onClick={() => { setEdit({ fssai: a.fssai, gstin: a.gstin || '', pan: a.pan, bankHolder: a.bankHolder, bankName: a.bankName || '', bankAcc: a.bankAcc, bankIfsc: a.bankIfsc, upiId: a.upiId || '' }); setAct('edit'); }}><Icon name="edit" size={14} /> Change details</button>
      </div>

      <div className="card">
        <h4>Documents</h4>
        {docs === null && <p className="tiny muted">Loading…</p>}
        <div className="doc-grid-adm">
          {DOC_TYPES.map((d) => {
            const x = doc(d.id);
            return (
              <div key={d.id} className={'dga' + (x ? '' : ' none')}>
                <div className="dga-th">{x ? (x.data.startsWith('data:image') ? <img src={x.data} alt="" /> : <span className="pdf-badge">PDF</span>) : <Icon name="x" size={20} />}</div>
                <small>{t(d.label)}{d.need ? ' *' : ''}</small>
                {x ? <ViewDocBtn uid={uid} type={d.id} name={`${a.restName}-${d.id}`} /> : <small className="t-red">{t('Not uploaded')}</small>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h4>Agreement</h4>
        {a.accepted ? <p className="small">{t('Accepted by')} <b data-notr="">{a.accepted.name}</b> · {fmtDateTime(a.accepted.ms)} · {a.accepted.version}</p> : <p className="small t-red">{t('Not accepted yet')}</p>}
        {a.terms && <p className="tiny muted">{`Fee: ${feeLine(a.terms)}`}</p>}
        <p className="tiny muted">{doc('agreement') ? t('Signed paper copy uploaded ✓') : t('Signed paper copy: not uploaded. Collect it when you visit and keep it in the file.')}</p>
      </div>

      {(a.history || []).length > 0 && (
        <div className="card">
          <h4>History</h4>
          <div className="timeline">{[...a.history].reverse().map((h, i) => <div key={i} className="tl-row"><i /><div><b>{t(HIST[h.act] || h.act)} <small className="muted">({h.by})</small></b><small className="muted">{fmtDateTime(h.ms)}{h.note ? ' · ' : ''}<span data-notr="">{h.note}</span></small></div></div>)}</div>
        </div>
      )}

      <div className="file-actions">
        {a.status !== 'approved' && <button className="btn green block lg" onClick={() => setAct('approve')}><Icon name="check" size={18} stroke={3} /> Approve</button>}
        <div className="row gap">
          {a.status !== 'approved' && <button className="btn ghost grow" onClick={() => { setNote(''); setAct('returned'); }}>Send back</button>}
          {a.status !== 'approved' && <button className="btn ghost grow danger-text" onClick={() => { setNote(''); setAct('rejected'); }}>Reject</button>}
          <button className="btn ghost grow" onClick={() => { setNote(''); setAct('note'); }}>Add note</button>
        </div>
      </div>

      <Sheet open={act === 'approve'} onClose={() => setAct(null)} title="Approve restaurant">
        <p className="small">{t('This creates the restaurant on FoodGaon (closed until the owner adds the menu and opens it) and gives the owner the restaurant panel.')}</p>
        <div className="row gap">
          <Field label="Fee %"><input className="input" inputMode="decimal" value={fee.pct} onChange={(e) => setFee({ ...fee, pct: e.target.value.replace(/[^\d.]/g, '') })} /></Field>
          <label className="check-row" style={{ marginTop: 18 }}><input type="checkbox" checked={!!fee.gstExtra} onChange={(e) => setFee({ ...fee, gstExtra: e.target.checked })} /> + GST extra</label>
        </div>
        {a.terms && (Number(a.terms.pct) !== Number(fee.pct) || !!a.terms.gstExtra !== !!fee.gstExtra) && <div className="alert alert-amber small">{t('The owner accepted a different fee in the agreement:')} {feeLine(a.terms)}</div>}
        {!a.accepted && <div className="alert alert-red small">{t('The owner has not accepted the agreement yet.')}</div>}
        <Field label="Note (optional)"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <button className="btn green block lg" disabled={busy || !Number(fee.pct)} onClick={approve}>{busy ? '…' : t('Approve and create restaurant')}</button>
      </Sheet>
      <Sheet open={['returned', 'rejected', 'note'].includes(act)} onClose={() => setAct(null)} title={act === 'returned' ? 'Send back for changes' : act === 'rejected' ? 'Reject application' : 'Add a note'}>
        <p className="tiny muted">{act === 'note' ? t('Only you see notes. They stay in the file history.') : t('The owner sees this message in the app.')}</p>
        <textarea className="input" rows={4} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={act === 'returned' ? 'e.g. FSSAI photo is not clear, please upload again' : ''} />
        <button className={'btn block lg ' + (act === 'rejected' ? 'danger' : 'primary')} disabled={busy} onClick={() => decide(act)}>{t('Save')}</button>
      </Sheet>
      <Sheet open={act === 'edit'} onClose={() => setAct(null)} title="Change details">
        <p className="tiny muted">{t('Old values are kept in the file history.')}</p>
        {[['fssai', 'FSSAI'], ['gstin', 'GSTIN'], ['pan', 'PAN'], ['bankHolder', 'Account holder'], ['bankName', 'Bank'], ['bankAcc', 'Account number'], ['bankIfsc', 'IFSC'], ['upiId', 'UPI ID']].map(([k, l]) => (
          <Field key={k} label={l}><input className="input" value={edit[k] ?? ''} onChange={(e) => setEdit({ ...edit, [k]: ['pan', 'gstin', 'bankIfsc'].includes(k) ? e.target.value.toUpperCase().trim() : e.target.value })} data-notr="" /></Field>
        ))}
        <button className="btn primary block lg" disabled={busy} onClick={saveEdit}>{t('Save')}</button>
      </Sheet>

      {agr && <DocSheet open onClose={() => setAgr(false)} title="Restaurant Partner Agreement" fileName={`FoodGaon-Agreement-${(a.restName || '').replace(/[^\w]+/g, '-')}.pdf`}><PartnerAgreement a={a} config={config} accepted={a.accepted} /></DocSheet>}
      {file && (
        <DocSheet open onClose={() => setFile(false)} title="Restaurant file" fileName={`FoodGaon-File-${(a.restName || '').replace(/[^\w]+/g, '-')}.pdf`}>
          <FullFile a={a} docs={docs || []} config={config} />
        </DocSheet>
      )}
    </Sheet>
  );
}

/** everything in one printable document: details, bank, documents (photos), agreement, history */
function FullFile({ a, docs, config }) {
  const row = (k, v) => <tr><td>{k}</td><td>{v || '—'}</td></tr>;
  return (
    <div className="full-file" data-notr="">
      <h3 style={{ margin: '0 0 6px' }}>{`Restaurant file — ${a.restName}`}</h3>
      <p className="tiny">{`Status: ${APP_STATUS[a.status]?.label || a.status} · Printed ${fmtDateTime(Date.now())}`}</p>
      <table className="doc-table small ff-table"><tbody>
        {row('Owner', `${a.ownerName} · ${plain(a.ownerPhone)}${a.altPhone ? ' / ' + a.altPhone : ''}`)}
        {row('Address', [a.address, a.landmark, a.town, a.pincode].filter(Boolean).join(', '))}
        {row('Email', a.email)}
        {row('FSSAI', a.fssai)}{row('PAN', a.pan)}{row('GSTIN', a.gstin || 'Not registered')}
        {row('Bank', `${a.bankHolder} · ${a.bankName || ''} · A/c ${a.bankAcc} · IFSC ${a.bankIfsc}`)}
        {row('UPI', a.upiId)}
        {row('Timing', `${a.openTime} – ${a.closeTime} · ${a.radiusKm} km · ${a.ownRiders} delivery boys`)}
        {row('Agreement', a.accepted ? `Accepted by ${a.accepted.name} on ${fmtDateTime(a.accepted.ms)} (${a.accepted.version})` : 'Not accepted')}
        {a.terms && row('Fee', feeLine(a.terms))}
        {row('Restaurant ID', a.restaurantId)}
      </tbody></table>
      <h4>History</h4>
      <table className="doc-table small ff-table"><tbody>{(a.history || []).map((h, i) => <tr key={i}><td>{fmtDateTime(h.ms)}</td><td>{`${HIST[h.act] || h.act} (${h.by}) ${h.note || ''}`}</td></tr>)}</tbody></table>
      <h4>Documents</h4>
      {DOC_TYPES.map((d) => {
        const x = docs.find((y) => y.type === d.id);
        return (
          <div key={d.id} className="ff-doc">
            <b>{d.label}</b>
            {!x ? <p className="tiny">Not uploaded</p> : x.data.startsWith('data:image') ? <img src={x.data} alt="" /> : <p className="tiny">{`PDF attached in the app (${x.name}) — download it separately.`}</p>}
          </div>
        );
      })}
      <div style={{ pageBreakBefore: 'always' }} />
      <PartnerAgreement a={a} config={config} accepted={a.accepted} />
    </div>
  );
}

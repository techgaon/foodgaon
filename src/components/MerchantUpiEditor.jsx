import React, { useState } from 'react';
import { merchantFor, readMerchantUri } from '../lib/directUpi.js';
import { readQr } from './Pay.jsx';
import { useToast } from '../ui.jsx';

export default function MerchantUpiEditor({ rest, onSave }) {
  const [f, setF] = useState(() => merchantFor(rest) || rest.directUpi || { vpa: '', name: rest.name, mcc: '', enabled: false });
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const read = (uri) => { try { setF(readMerchantUri(uri)); toast('QR से विवरण मिला। सेव करें।'); } catch (e) { toast(e.message, 'err'); } };
  const pick = async (e) => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; try { read(await readQr(file)); } catch { toast('QR नहीं पढ़ा गया। UPI लिंक या विवरण डालें।', 'err'); } };
  const save = async () => {
    const value = { ...f, vpa: f.vpa.trim(), name: f.name.trim(), mcc: f.mcc.trim() };
    if (value.enabled && !merchantFor({ directUpi: value })) { toast('सही UPI ID, नाम और चार अंकों का MCC (यदि उपलब्ध हो) डालें।', 'err'); return; }
    setBusy(true);
    try { await onSave({ directUpi: value }); toast('Direct Merchant UPI सेव हो गया।'); } catch { toast('सेव नहीं हुआ। फिर प्रयास करें।', 'err'); }
    setBusy(false);
  };
  return <div className="card" data-notr="">
    <h4>Pay via UPI Live <small className="t-green">NEW</small></h4>
    <p className="small muted">अपने बैंक/बिजनेस ऐप का Merchant QR इस्तेमाल करें। MCC बैंक से मिला हो तभी भरें। केवल MCC डालने से पर्सनल UPI, मर्चेंट UPI नहीं बनता।</p>
    <label><input type="checkbox" checked={!!f.enabled} onChange={e => setF({ ...f, enabled: e.target.checked })} /> यह भुगतान विकल्प चालू रखें</label>
    <p><label className="btn small ghost">QR फोटो चुनें<input hidden type="file" accept="image/*" onChange={pick} /></label></p>
    <input className="input" aria-label="Merchant UPI URI" placeholder="upi://pay?..." value={text} onChange={e => setText(e.target.value)} />
    <button className="btn ghost small" onClick={() => read(text)}>UPI लिंक से भरें</button>
    {['vpa', 'name', 'mcc'].map((key, i) => <label className="field" key={key}><span>{['Merchant UPI ID (VPA)', 'Merchant name', 'MCC (वैकल्पिक)'][i]}</span><input className="input" value={f[key] || ''} inputMode={key === 'mcc' ? 'numeric' : 'text'} maxLength={key === 'mcc' ? 4 : 256} onChange={e => setF({ ...f, [key]: e.target.value, sourceUri: '' })} /></label>)}
    <p className="tiny muted">{f.mcc ? `MCC: ${f.mcc}` : 'QR में MCC उपलब्ध नहीं है।'} बैंक सत्यापन का दावा नहीं; भुगतान की पुष्टि रेस्टोरेंट करेगा।</p>
    <button className="btn green block" disabled={busy} onClick={save}>{busy ? 'सेव हो रहा है…' : 'सेव करें'}</button>
  </div>;
}

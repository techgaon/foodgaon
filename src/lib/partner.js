// Restaurant partner onboarding: application, documents, agreement terms.
// partnerApps/{uid}   — one application per login (owner phone = login phone). Bank / PAN stay here (never on the public restaurant doc).
// partnerDocs/{uid}__{type} — one uploaded document each (photo or PDF as a data URL, under ~900 KB)
import { put, patch, getOne, getList, remove, phoneOf } from './fb.js';

export const AGREEMENT_VERSION = '2026-11-v1';

export const DOC_TYPES = [
  { id: 'shop', label: 'Shop / kitchen photo', need: true, hint: 'A clear photo of your shop front or kitchen' },
  { id: 'fssai', label: 'FSSAI licence / registration', need: true, hint: 'Photo or PDF of the certificate' },
  { id: 'pan', label: 'PAN card of the owner', need: true, hint: 'Front side' },
  { id: 'bank', label: 'Bank passbook first page or cancelled cheque', need: true, hint: 'Name, account number and IFSC must be readable' },
  { id: 'gst', label: 'GST certificate', need: false, hint: 'Only if you have GST' },
  { id: 'agreement', label: 'Signed agreement (printed copy)', need: false, hint: 'Print the agreement, sign it, and upload a photo of every page' },
];

export const APP_STATUS = {
  draft: { label: 'Not sent yet', cls: 'amber' },
  submitted: { label: 'Sent — under review', cls: 'blue' },
  returned: { label: 'Sent back — changes needed', cls: 'red' },
  approved: { label: 'Approved — live on FoodGaon', cls: 'green' },
  rejected: { label: 'Not approved', cls: 'red' },
};

export const appIdOf = (uid) => uid;
export const docId = (uid, type) => `${uid}__${type}`;

/** commission as plain words, used in the agreement and on screens */
export function feeTerms(config = {}, rest = {}) {
  const pct = Number(rest.commissionPct ?? config.commissionPct ?? 4.9);
  const gstExtra = !!(rest.commissionGstExtra ?? config.commissionGstExtra);
  const cg = Number(config.commissionGstPct ?? 18);
  const onHundred = gstExtra ? Math.round(pct * (1 + cg / 100) * 100) / 100 : pct;
  return { pct, gstExtra, cg, onHundred };
}
export const feeLine = (f) => (f.gstExtra
  ? `${f.pct}% of the order value + ${f.cg}% GST on this fee (₹${f.onHundred} on every ₹100)`
  : `${f.pct}% of the order value, including ${f.cg}% GST on this fee (₹${f.onHundred} on every ₹100)`);
export const feeLineHi = (f) => (f.gstExtra
  ? `ऑर्डर की रकम का ${f.pct}% + इस फ़ीस पर ${f.cg}% GST (हर ₹100 पर ₹${f.onHundred})`
  : `ऑर्डर की रकम का ${f.pct}%, इस फ़ीस का ${f.cg}% GST इसी में शामिल (हर ₹100 पर ₹${f.onHundred})`);

export const blankApp = (user) => ({
  status: 'draft', ownerPhone: phoneOf(user), uid: user.uid,
  restName: '', tagline: '', address: '', town: '', landmark: '', pincode: '', ownerName: user.displayName || '', altPhone: '', email: '',
  fssai: '', gstin: '', pan: '', vegOnly: true, priceInclGst: true, openTime: '10:00', closeTime: '22:00', prepMins: 20, radiusKm: 5,
  ownRiders: 1, bankName: '', bankHolder: '', bankAcc: '', bankIfsc: '', upiId: '',
  docs: {}, history: [],
});

export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** what is still missing before the application can be sent */
export function missing(a) {
  const m = [];
  if (!a.restName?.trim()) m.push('Restaurant name');
  if (!a.address?.trim()) m.push('Full address');
  if (!/^\d{6}$/.test(a.pincode || '')) m.push('PIN code');
  if (!a.ownerName?.trim()) m.push('Owner name');
  if (!/^\d{14}$/.test(a.fssai || '')) m.push('FSSAI number (14 digits)');
  if (!PAN_RE.test(a.pan || '')) m.push('PAN number');
  if (a.gstin && !GSTIN_RE.test(a.gstin)) m.push('GSTIN (looks wrong)');
  if (!a.bankHolder?.trim()) m.push('Account holder name');
  if (!/^\d{8,18}$/.test(a.bankAcc || '')) m.push('Bank account number');
  if (!IFSC_RE.test(a.bankIfsc || '')) m.push('IFSC code');
  DOC_TYPES.filter((d) => d.need && !a.docs?.[d.id]).forEach((d) => m.push(d.label));
  return m;
}

export const saveApp = (uid, data) => put('partnerApps', uid, data);
export const loadApp = (uid) => getOne('partnerApps', uid);
export async function saveDoc(uid, type, { name, data }) {
  await put('partnerDocs', docId(uid, type), { uid, type, name: String(name || type).slice(0, 80), data, ms: Date.now() }, false);
}
export const loadDoc = (uid, type) => getOne('partnerDocs', docId(uid, type));
export const loadDocs = (uid) => getList('partnerDocs', [['uid', '==', uid]]);
export const dropDoc = (uid, type) => remove('partnerDocs', docId(uid, type));
export const addHistory = (app, by, act, note = '') => [...(app.history || []), { ms: Date.now(), by, act, note: String(note).slice(0, 300) }].slice(-60);
export const setAppStatus = (uid, app, status, by, note, extra = {}) =>
  patch('partnerApps', uid, { status, history: addHistory(app, by, status, note), [`${status}Ms`]: Date.now(), ...extra });

/** read a file → data URL; photos are shrunk, PDFs must be small */
export async function fileToDoc(file, compressImage) {
  if (file.type.startsWith('image/')) return { name: file.name, data: await compressImage(file, 1600, 420000) };
  if (file.type === 'application/pdf') {
    if (file.size > 650 * 1024) throw new Error('PDF is bigger than 650 KB. Send a photo instead.');
    const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('Could not read the file')); r.readAsDataURL(file); });
    return { name: file.name, data };
  }
  throw new Error('Use a photo or a PDF');
}

export const maskAcc = (s = '') => (s.length > 4 ? '•'.repeat(Math.min(8, s.length - 4)) + s.slice(-4) : s);

/** shrink a stored photo (data URL) — used to make the restaurant cover from the shop photo */
export function shrinkDataUrl(src, maxSide = 1000, maxLen = 220000) {
  return new Promise((resolve) => {
    if (!String(src).startsWith('data:image')) { resolve(''); return; }
    const img = new Image();
    img.onload = () => {
      const sc = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      let q = 0.82; let out = c.toDataURL('image/jpeg', q);
      while (out.length > maxLen && q > 0.35) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
      resolve(out);
    };
    img.onerror = () => resolve('');
    img.src = src;
  });
}
export const slugOf = (name) => (String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 26) || 'rest') + '-' + Date.now().toString(36).slice(-4);

// A QR identifies a payee; it does not prove bank verification or receipt of money.
export const PARAG_UPI_URI = 'upi://pay?pa=8081824545@upi&pn=PARAG%20MILK%20PARLOUR%20AND%20RESTAURANT';
export const VPA_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z0-9.-]{2,64}$/;
export function readMerchantUri(text) {
  const url = new URL(String(text).trim());
  if (url.username || url.password || url.port || url.pathname || url.hash) throw new Error('UPI लिंक सही नहीं है।');
  if (url.protocol !== 'upi:' || url.hostname !== 'pay') throw new Error('सही upi://pay लिंक डालें।');
  const q = url.searchParams;
  if (q.getAll('pa').length !== 1 || !VPA_RE.test(q.get('pa') || '')) throw new Error('UPI ID सही नहीं है।');
  if (q.getAll('mc').length > 1 || q.getAll('pn').length > 1) throw new Error('UPI लिंक में दोहराए हुए विवरण हैं।');
  const mcc = q.get('mc') || '';
  if (mcc && !/^\d{4}$/.test(mcc)) throw new Error('MCC चार अंकों का होना चाहिए।');
  return { vpa: q.get('pa'), name: q.get('pn') || '', mcc, sourceUri: url.href, enabled: true };
}
export function merchantFor(rest) {
  if (!rest) return null;
  const m = rest.directUpi || (rest.id === 'parag' ? { ...readMerchantUri(PARAG_UPI_URI), mcc: '5812', mccSource: 'user-provided' } : null);
  return m?.enabled && VPA_RE.test(m.vpa || '') && m.name?.trim() && (!m.mcc || /^\d{4}$/.test(m.mcc)) ? m : null;
}
export function directUpiLink(merchant, amount, reference) {
  if (!merchantFor({ directUpi: merchant }) || !Number.isFinite(amount) || amount <= 0 || !/^[A-Za-z0-9]{1,35}$/.test(reference)) throw new Error('भुगतान विवरण सही नहीं है।');
  const q = new URLSearchParams({ pa: merchant.vpa, pn: merchant.name, tr: reference, am: amount.toFixed(2), cu: 'INR', tn: `FoodGaon ${reference}` });
  if (merchant.mcc) q.set('mc', merchant.mcc);
  return `upi://pay?${q.toString()}`;
}
export function upiClaim(result) {
  return { paymentClaim: 'direct_merchant_upi', upiStatus: String(result.status || 'UNKNOWN').slice(0, 32), upiTxn: String(result.txnId || '').slice(0, 100), upiRef: String(result.approvalRef || '').slice(0, 100) };
}

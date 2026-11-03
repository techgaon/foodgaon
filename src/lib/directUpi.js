// A QR identifies a payee; it does not prove bank verification or receipt of money.
// Parag's PhonePe merchant QR (counter stand), decoded exactly as printed on 03 Nov 2026
export const PARAG_UPI_URI = 'upi://pay?pa=Q182934791@ybl&pn=PhonePeMerchant&mc=0000&mode=02&purpose=00';
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
  return { vpa: q.get('pa'), name: q.get('pn') || '', mcc, mode: q.get('mode') || '', purpose: q.get('purpose') || '', sourceUri: url.href, enabled: true };
}
export function merchantFor(rest) {
  if (!rest) return null;
  const m = rest.directUpi || (rest.id === 'parag' ? readMerchantUri(PARAG_UPI_URI) : null);
  return m?.enabled && VPA_RE.test(m.vpa || '') && m.name?.trim() && (!m.mcc || /^\d{4}$/.test(m.mcc)) ? m : null;
}
/** Link that looks to the UPI app exactly like a scan of the shop's own QR (same pa, pn, mc, mode, purpose),
 *  plus the amount. No `tr`: small (non-verified) merchants reject an unknown transaction reference.
 *  variant 'plain' = the QR exactly as printed (no amount — the customer types it), the most widely accepted form. */
export function directUpiLink(merchant, amount, reference, variant = 'amount') {
  if (!merchantFor({ directUpi: merchant }) || !Number.isFinite(amount) || amount <= 0 || !/^[A-Za-z0-9]{1,35}$/.test(reference)) throw new Error('भुगतान विवरण सही नहीं है।');
  if (variant === 'plain' && merchant.sourceUri) return merchant.sourceUri;
  // built by hand: UPI apps want '@' as-is and spaces as %20 (not '+')
  const enc = (v) => encodeURIComponent(v);
  const parts = [`pa=${merchant.vpa}`, `pn=${enc(merchant.name)}`];
  if (merchant.mcc) parts.push(`mc=${merchant.mcc}`);
  if (merchant.mode) parts.push(`mode=${enc(merchant.mode)}`);
  if (merchant.purpose) parts.push(`purpose=${enc(merchant.purpose)}`);
  if (variant !== 'plain') parts.push(`am=${amount.toFixed(2)}`, 'cu=INR', `tn=${enc(`FoodGaon ${reference.slice(-8)}`)}`);
  return `upi://pay?${parts.join('&')}`;
}
export function upiClaim(result) {
  return { paymentClaim: 'direct_merchant_upi', upiStatus: String(result.status || 'UNKNOWN').slice(0, 32), upiTxn: String(result.txnId || '').slice(0, 100), upiRef: String(result.approvalRef || '').slice(0, 100) };
}

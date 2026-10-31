/* FoodGaon — online payments (Razorpay Route)
 *
 *  How money moves:
 *   customer pays the full bill online → Razorpay
 *     ├─ restaurant's share (bill − GST − FoodGaon fee − any unpaid COD dues) → restaurant's own bank (linked account), ON HOLD until delivered
 *     └─ the rest (5% food GST + FoodGaon fee) → FoodGaon's current account
 *   delivered  → hold released → restaurant gets paid in the normal Razorpay settlement cycle
 *   cancelled / rejected after payment → full refund to the customer, restaurant transfer reversed
 *
 *  Secrets (set once, see README-payments.md):
 *   firebase functions:secrets:set RAZORPAY_KEY_ID
 *   firebase functions:secrets:set RAZORPAY_KEY_SECRET
 *   firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET
 *  Nothing secret is ever put in the app.
 */
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();
const db = admin.firestore();
setGlobalOptions({ region: 'asia-south1', maxInstances: 5 });

const KEY_ID = defineSecret('RAZORPAY_KEY_ID');
const KEY_SECRET = defineSecret('RAZORPAY_KEY_SECRET');
const HOOK_SECRET = defineSecret('RAZORPAY_WEBHOOK_SECRET');
const SUPER_ADMIN = '+919129203268';
const paise = (rs) => Math.round(Number(rs || 0) * 100);
const r2 = (n) => Math.round(n * 100) / 100;

/** phone of the caller: real SMS login, or test login 91XXXXXXXXXX@login.foodgaon.app */
function phoneOf(auth) {
  if (!auth) return '';
  if (auth.token.phone_number) return auth.token.phone_number;
  const m = /^(91\d{10})@login\.foodgaon\.app$/.exec(auth.token.email || '');
  return m ? '+' + m[1] : '';
}
async function isAdmin(auth) {
  const ph = phoneOf(auth);
  if (ph === SUPER_ADMIN) return true;
  const s = await db.doc(`staff/${ph}`).get();
  return s.exists && s.data().admin === true;
}

async function rzp(method, path, body) {
  const auth = Buffer.from(`${KEY_ID.value()}:${KEY_SECRET.value()}`).toString('base64');
  const res = await fetch('https://api.razorpay.com' + path, {
    method, headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const msg = data?.error?.description || `Razorpay ${res.status}`; console.error('razorpay', path, res.status, data); throw new Error(msg); }
  return data;
}

/* 1) customer starts an online payment for an order that is waiting for payment */
exports.createPayment = onCall({ secrets: [KEY_ID, KEY_SECRET] }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Log in first');
  const id = String(req.data?.orderId || '');
  const ref = db.doc(`orders/${id}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Order not found');
  const o = snap.data();
  if (o.customerUid !== req.auth.uid) throw new HttpsError('permission-denied', 'Not your order');
  if (o.status !== 'awaiting_payment' || o.payment !== 'online') throw new HttpsError('failed-precondition', 'This order is not waiting for online payment');
  if (o.rzpOrderId) return { keyId: KEY_ID.value(), rzpOrderId: o.rzpOrderId, amount: paise(o.total), name: 'FoodGaon', code: o.code };

  const priv = (await db.doc(`restPrivate/${o.restaurantId}`).get()).data() || {};
  if (!priv.rzpAccount) throw new HttpsError('failed-precondition', 'This restaurant does not take online payment yet');
  const rest = (await db.doc(`restaurants/${o.restaurantId}`).get()).data() || {};

  // restaurant share; unpaid FoodGaon dues from cash orders are taken back from it (at most half of the share)
  const share = r2(Number(o.payable || 0));
  const codDue = Math.max(0, Number(rest.codDue || 0));
  const codAdjust = r2(Math.min(codDue, share / 2));
  const transfer = r2(share - codAdjust);
  const order = await rzp('POST', '/v1/orders', {
    amount: paise(o.total), currency: 'INR', receipt: o.code,
    notes: { foodgaon_order: id, restaurant: o.restaurantId },
    transfers: transfer > 0 ? [{ account: priv.rzpAccount, amount: paise(transfer), currency: 'INR', on_hold: 1, notes: { foodgaon_order: id, cod_adjust: String(codAdjust) } }] : [],
  });
  await ref.update({ rzpOrderId: order.id, rzpTransfer: transfer, codAdjust });
  return { keyId: KEY_ID.value(), rzpOrderId: order.id, amount: paise(o.total), name: 'FoodGaon', code: o.code };
});

/** mark an order paid (from checkout callback or webhook) — idempotent */
async function markPaid(orderId, paymentId, rzpOrderId) {
  const ref = db.doc(`orders/${orderId}`);
  await db.runTransaction(async (tx) => {
    const s = await tx.get(ref); if (!s.exists) return;
    const o = s.data();
    if (o.paid && o.rzpPaymentId) return;
    if (rzpOrderId && o.rzpOrderId !== rzpOrderId) throw new Error('order mismatch');
    const now = Date.now();
    tx.update(ref, { paid: true, paidMs: now, rzpPaymentId: paymentId, gateway: 'razorpay', status: o.status === 'awaiting_payment' ? 'placed' : o.status, 'timeline.placed': o.timeline?.placed || now, dues: 0, duesBy: 'gateway' });
    if (o.codAdjust > 0) tx.set(db.collection('settlements').doc(), { restaurantId: o.restaurantId, restaurantName: o.restaurantName, amount: o.codAdjust, status: 'confirmed', via: 'online-adjust', orderId, createdMs: now, checkedMs: now });
  });
}

/* 2) checkout says "paid" → check Razorpay's signature, then mark the order paid */
exports.confirmPayment = onCall({ secrets: [KEY_ID, KEY_SECRET] }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Log in first');
  const { orderId, razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = req.data || {};
  const want = crypto.createHmac('sha256', KEY_SECRET.value()).update(`${oid}|${pid}`).digest('hex');
  if (!sig || want !== sig) throw new HttpsError('permission-denied', 'Payment could not be verified');
  const o = (await db.doc(`orders/${orderId}`).get()).data();
  if (!o || o.customerUid !== req.auth.uid) throw new HttpsError('permission-denied', 'Not your order');
  await markPaid(orderId, pid, oid);
  return { ok: true };
});

/* 3) Razorpay webhook (backup, in case the phone closes before the callback): payment.captured / payment.failed */
exports.razorpayWebhook = onRequest({ secrets: [HOOK_SECRET] }, async (req, res) => {
  const sig = req.get('x-razorpay-signature') || '';
  const want = crypto.createHmac('sha256', HOOK_SECRET.value()).update(req.rawBody).digest('hex');
  if (sig !== want) { res.status(400).send('bad signature'); return; }
  try {
    const ev = req.body?.event; const p = req.body?.payload?.payment?.entity || {};
    const orderId = p.notes?.foodgaon_order || (await db.collection('orders').where('rzpOrderId', '==', p.order_id).limit(1).get()).docs[0]?.id;
    if (orderId && ev === 'payment.captured') await markPaid(orderId, p.id, p.order_id);
    if (orderId && ev === 'payment.failed') {
      const ref = db.doc(`orders/${orderId}`); const o = (await ref.get()).data();
      if (o && o.status === 'awaiting_payment') await ref.update({ status: 'payment_failed', upiStatus: 'failed' });
    }
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).send('error'); }
});

/* 4) delivered → release the restaurant's money; cancelled/rejected after payment → refund */
exports.onOrderChange = onDocumentUpdated({ document: 'orders/{id}', secrets: [KEY_ID, KEY_SECRET] }, async (ev) => {
  const before = ev.data.before.data(); const o = ev.data.after.data(); const ref = ev.data.after.ref;
  if (!o.rzpPaymentId || before.status === o.status) return;
  try {
    if (o.status === 'delivered' && !o.rzpReleased) {
      const t = await rzp('GET', `/v1/payments/${o.rzpPaymentId}/transfers`);
      for (const tr of t.items || []) if (tr.on_hold) await rzp('PATCH', `/v1/transfers/${tr.id}`, { on_hold: 0 });
      await ref.update({ rzpReleased: Date.now() });
    }
    if (['cancelled', 'rejected'].includes(o.status) && !o.rzpRefundId) {
      const r = await rzp('POST', `/v1/payments/${o.rzpPaymentId}/refund`, { amount: paise(o.total), reverse_all: 1, notes: { foodgaon_order: ev.params.id, reason: o.cancelReason || o.status } });
      await ref.update({ rzpRefundId: r.id, refundMs: Date.now(), refundStatus: r.status || 'created' });
    }
  } catch (e) { console.error('order change', ev.params.id, e); await ref.update({ gatewayError: String(e.message || e).slice(0, 200) }); }
});

/* 5) admin: create the restaurant's Razorpay Route account from its FoodGaon application (bank details stay on the server) */
exports.linkRestaurant = onCall({ secrets: [KEY_ID, KEY_SECRET] }, async (req) => {
  if (!req.auth || !(await isAdmin(req.auth))) throw new HttpsError('permission-denied', 'Admin only');
  const restId = String(req.data?.restaurantId || '');
  const rest = (await db.doc(`restaurants/${restId}`).get()).data();
  if (!rest?.applicationId) throw new HttpsError('failed-precondition', 'Restaurant has no FoodGaon application');
  const a = (await db.doc(`partnerApps/${rest.applicationId}`).get()).data();
  const privRef = db.doc(`restPrivate/${restId}`);
  const priv = (await privRef.get()).data() || {};
  if (priv.rzpAccount && priv.rzpProduct) return { account: priv.rzpAccount, status: priv.rzpStatus };
  const phone = String(a.ownerPhone || '').replace(/^\+91/, '');
  const acc = priv.rzpAccount ? { id: priv.rzpAccount } : await rzp('POST', '/v2/accounts', {
    email: a.email || `${phone}@partners.foodgaon.app`, phone, type: 'route', reference_id: restId.slice(0, 20),
    legal_business_name: a.restName, business_type: 'proprietorship', contact_name: a.ownerName,
    profile: { category: 'food', subcategory: 'restaurant', addresses: { registered: { street1: String(a.address).slice(0, 100), street2: String(a.landmark || a.town || 'Barabanki').slice(0, 100), city: a.town || 'Haidergarh', state: 'UTTAR PRADESH', postal_code: String(a.pincode || '225125'), country: 'IN' } } },
    legal_info: { pan: a.pan, ...(a.gstin ? { gst: a.gstin } : {}) },
  });
  await privRef.set({ rzpAccount: acc.id }, { merge: true });
  await rzp('POST', `/v2/accounts/${acc.id}/stakeholders`, { name: a.ownerName, email: a.email || `${phone}@partners.foodgaon.app` }).catch((e) => console.warn('stakeholder', e.message));
  const prod = await rzp('POST', `/v2/accounts/${acc.id}/products`, { product_name: 'route', tnc_accepted: true });
  const upd = await rzp('PATCH', `/v2/accounts/${acc.id}/products/${prod.id}`, { settlements: { account_number: a.bankAcc, ifsc_code: a.bankIfsc, beneficiary_name: a.bankHolder }, tnc_accepted: true });
  await privRef.set({ rzpAccount: acc.id, rzpProduct: prod.id, rzpStatus: upd.activation_status || 'under_review', linkedMs: Date.now() }, { merge: true });
  await db.doc(`restaurants/${restId}`).set({ onlinePay: (upd.activation_status || '') === 'activated' }, { merge: true });
  return { account: acc.id, status: upd.activation_status || 'under_review' };
});

/* 6) admin: refresh a restaurant's Route status (activation can take a few hours) */
exports.restaurantPayStatus = onCall({ secrets: [KEY_ID, KEY_SECRET] }, async (req) => {
  if (!req.auth || !(await isAdmin(req.auth))) throw new HttpsError('permission-denied', 'Admin only');
  const restId = String(req.data?.restaurantId || '');
  const privRef = db.doc(`restPrivate/${restId}`);
  const priv = (await privRef.get()).data() || {};
  if (!priv.rzpAccount || !priv.rzpProduct) return { status: 'not_linked' };
  const p = await rzp('GET', `/v2/accounts/${priv.rzpAccount}/products/${priv.rzpProduct}`);
  const status = p.activation_status || 'under_review';
  await privRef.set({ rzpStatus: status }, { merge: true });
  await db.doc(`restaurants/${restId}`).set({ onlinePay: status === 'activated' }, { merge: true });
  return { status, requirements: p.requirements || [] };
});

// Online payment through Razorpay (Route split). Off until the admin switches it on (Settings → Payments)
// and the server functions are deployed with the Razorpay keys. No secret key is ever in the app.
import { app, patch } from './fb.js';

let fns = null;
async function call(name, data) {
  if (!fns) { const m = await import('firebase/functions'); fns = { m, f: m.getFunctions(app, 'asia-south1') }; }
  const r = await fns.m.httpsCallable(fns.f, name)(data);
  return r.data;
}
let sdk = null;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (!sdk) sdk = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = res; s.onerror = () => { sdk = null; rej(new Error('Payment page could not load. Check the internet.')); }; document.head.appendChild(s); });
  return sdk;
}

/** opens Razorpay checkout for an order in "awaiting_payment"; resolves true when paid, false when closed */
export async function payOnline(orderId, { name, phone, email } = {}) {
  const [info] = await Promise.all([call('createPayment', { orderId }), loadCheckout()]);
  return new Promise((resolve, reject) => {
    const rp = new window.Razorpay({
      key: info.keyId, order_id: info.rzpOrderId, amount: info.amount, currency: 'INR',
      name: 'FoodGaon', description: `Order ${info.code}`, image: './icons/icon-192.png',
      prefill: { name: name || '', contact: String(phone || '').replace(/^\+91/, ''), email: email || '' },
      theme: { color: '#e8461a' }, config: { display: { preferences: { show_default_blocks: true } } },
      handler: async (r) => {
        try { await call('confirmPayment', { orderId, ...r }); resolve(true); } catch (e) { reject(e); }
      },
      modal: { ondismiss: async () => { try { await patch('orders', orderId, { status: 'payment_failed', upiStatus: 'cancelled' }); } catch { /* ignore */ } resolve(false); } },
    });
    rp.on('payment.failed', () => { /* checkout shows the error and lets the customer retry */ });
    rp.open();
  });
}
export const linkRestaurant = (restaurantId) => call('linkRestaurant', { restaurantId });
export const restaurantPayStatus = (restaurantId) => call('restaurantPayStatus', { restaurantId });

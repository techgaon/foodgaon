import { isNative, nativeNotify, nativeAskNotify } from './native.js';
import { getLang } from '../i18n/index.js';

export const rupee = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
/** price label: 'On MRP' when the dish is sold at printed MRP and no price is set */
export const mrpFree = (it) => !!it?.onMrp && !(Number(it.price) > 0);
export const priceText = (it) => (mrpFree(it) ? 'On MRP' : rupee(it?.price) + (it?.onMrp ? ' (MRP)' : ''));
export const lineText = (x) => (mrpFree(x) ? 'On MRP' : rupee(Number(x.price) * Number(x.qty || 1)));
const EN_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HI_SHORT = ['जन', 'फ़र', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुला', 'अग', 'सित', 'अक्टू', 'नव', 'दिस'];
const toMs = (t) => (t?.toMillis ? t.toMillis() : typeof t === 'number' ? t : t ? Date.parse(t) : 0);
export const ms = toMs;

export function fmtTime(t) {
  const d = new Date(toMs(t)); let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h < 12 ? 'AM' : 'PM'; h = h % 12 || 12; return `${h}:${m} ${ap}`;
}
export function fmtDateTime(t) {
  if (!t) return '';
  const d = new Date(toMs(t));
  const mon = (getLang() === 'en' ? EN_SHORT : HI_SHORT)[d.getMonth()];
  return `${d.getDate()} ${mon}, ${fmtTime(t)}`;
}
export function timeAgo(t) {
  const s = Math.floor((Date.now() - toMs(t)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return fmtDateTime(t);
}
export const dayKey = (t) => { const d = new Date(toMs(t)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const todayKey = () => dayKey(Date.now());

export const shortId = () => {
  const d = new Date();
  return 'FG' + String(d.getDate()).padStart(2, '0') + String(d.getHours()).padStart(2, '0') + Math.random().toString(36).slice(2, 6).toUpperCase();
};

/** distance in km between two {lat,lng} */
export function km(a, b) {
  if (a?.lat == null || a?.lng == null || b?.lat == null || b?.lng == null) return null;
  const R = 6371, r = (x) => (x * Math.PI) / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const mapsDir = (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=two-wheeler`;
export const mapsPin = (p) => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
export const tel = (phone) => `tel:${String(phone).replace(/^\+91/, '')}`;
/** WhatsApp chat link (opens the WhatsApp app) with an optional ready message */
export const wa = (phone, text = '') => { const d = String(phone || '').replace(/\D/g, '').slice(-10); return `https://wa.me/91${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`; };
export const plain = (phone) => String(phone || '').replace(/^\+91/, '');

const ascii = (s, d) => { const t = String(s || '').replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim(); return t || d; };
/** UPI payment link. `extra` = merchant details read from the shop's own QR (mc, mode, purpose, orgid, mid…)
 *  so UPI apps treat it as a payment to a shop (P2M), not to a person. */
const MERCHANT_KEYS = ['mc', 'purpose', 'mid', 'msid', 'mtid']; // not 'mode' (QR-only) or 'sign' (would break with a new amount)
export const upiLink = ({ upiId, upiName, amount, note, ref, extra }) =>
  `upi://pay?pa=${String(upiId).trim()}&pn=${encodeURIComponent(ascii(upiName, 'FoodGaon'))}` +
  MERCHANT_KEYS.filter((k) => extra && extra[k]).map((k) => `&${k}=${encodeURIComponent(extra[k])}`).join('') +
  (amount ? `&am=${Number(amount).toFixed(2)}` : '') + '&cu=INR' +
  `&tn=${encodeURIComponent(ascii(note, 'Food order').slice(0, 50))}` +
  (ref ? `&tr=${encodeURIComponent(ascii(ref, '').replace(/[^A-Za-z0-9]/g, '').slice(0, 30))}` : '');
/** read a UPI QR text → { upiId, upiName, extra } */
export function parseUpiQr(text) {
  const s = String(text || '').trim();
  if (!/^upi:\/\/pay\?/i.test(s)) return null;
  const q = new URLSearchParams(s.replace(/^upi:\/\/pay\?/i, ''));
  const pa = q.get('pa'); if (!pa) return null;
  const extra = {}; MERCHANT_KEYS.forEach((k) => { if (q.get(k)) extra[k] = q.get(k); });
  return { upiId: pa, upiName: q.get('pn') || '', extra };
}

/** Compress a picked image to a small JPEG data URL (for menu photos stored in Firestore) */
export function compressImage(file, maxSide = 720, maxLen = 180000) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('Could not read the file'));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('This photo cannot be opened. Choose another photo.'));
      img.onload = () => {
        let { width: w, height: h } = img;
        const sc = Math.min(1, maxSide / Math.max(w, h)); w = Math.round(w * sc); h = Math.round(h * sc);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
        let q = 0.8, out = c.toDataURL('image/jpeg', q);
        while (out.length > maxLen && q > 0.35) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
        while (out.length > maxLen && c.width > 320) {
          w = Math.round(c.width * 0.8); h = Math.round(c.height * 0.8);
          c.width = w; c.height = h;
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
          out = c.toDataURL('image/jpeg', 0.6);
        }
        if (out.length > maxLen) { reject(new Error('File is too large. Please choose a smaller PDF or photo.')); return; }
        resolve(out);
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

export async function systemNotify(title, body) {
  if (isNative) return nativeNotify(title, body);
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg) reg.showNotification(title, { body, icon: './icons/icon-192.png', tag: 'pp-' + Date.now() });
    else new Notification(title, { body });
  } catch { /* ignore */ }
}
export async function askNotifyPermission() {
  if (isNative) return nativeAskNotify();
  try { if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission(); } catch { /* ignore */ }
}

/* loud repeating "new order" ding (WebAudio, no file needed) */
let actx = null;
export function ding(times = 3) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const now = actx.currentTime;
    for (let i = 0; i < times; i++) {
      [880, 1320].forEach((f, j) => {
        const o = actx.createOscillator(); const g = actx.createGain();
        o.type = 'triangle'; o.frequency.value = f; o.connect(g); g.connect(actx.destination);
        const t = now + i * 0.7 + j * 0.16;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.6, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        o.start(t); o.stop(t + 0.4);
      });
    }
    navigator.vibrate?.([300, 150, 300, 150, 300]);
  } catch { /* ignore */ }
}
export const unlockAudio = () => { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch { /* ignore */ } };

export const LS = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

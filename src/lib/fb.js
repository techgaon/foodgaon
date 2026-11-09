import { initializeApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, RecaptchaVerifier, signInWithPhoneNumber, signOut, updateProfile, updatePassword,
  PhoneAuthProvider, GoogleAuthProvider, signInWithCredential, signInWithPopup, signInWithCustomToken,
  indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence, initializeAuth, browserPopupRedirectResolver,
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, addDoc, onSnapshot, query, where, orderBy, limit, writeBatch, serverTimestamp, getDocs, increment,
} from 'firebase/firestore';
import { firebaseConfig } from '../firebase-config.js';

export const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
});
auth.languageCode = 'en';
export const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });

export { onAuthStateChanged, signOut, updateProfile, serverTimestamp, increment };

/* ---------- phone OTP ----------
   Android app: native Firebase (Play Integrity / SMS auto-read) — no reCAPTCHA inside the WebView.
   Web: reCAPTCHA (invisible). Both return { confirm(code) } like the web SDK. */
import { Capacitor } from '@capacitor/core';
const NATIVE = Capacitor.isNativePlatform();
let verifier = null;
let FA = null;
// NOTE: never return a Capacitor plugin proxy from an async function — `await` would call proxy.then() and hang forever.
// So we return the module and read .FirebaseAuthentication synchronously.
const faMod = async () => (FA = FA || (await import('@capacitor-firebase/authentication')));

// native (Android) phone OTP; resolves with { confirm } or rejects; gives up after `ms`
function nativeOtp(F, phone, ms) {
  return new Promise((resolve, reject) => {
    let vid = null; let autoCode = null; let over = false;
    const finish = (fn, v) => { if (over) return; over = true; clearTimeout(timer); fn(v); };
    const done = {
      native: true,
      confirm: (code) => signInWithCredential(auth, PhoneAuthProvider.credential(vid, code || autoCode)),
      get autoCode() { return autoCode; },
    };
    const timer = setTimeout(() => finish(reject, Object.assign(new Error('native timeout'), { code: 'auth/native-timeout' })), ms);
    F.addListener('phoneCodeSent', (e) => { vid = e.verificationId; finish(resolve, done); });
    F.addListener('phoneVerificationFailed', (e) => finish(reject, Object.assign(new Error(e.message || 'failed'), { code: e.code || 'auth/native-failed' })));
    F.addListener('phoneVerificationCompleted', (e) => {
      // SMS was read automatically — remember the code so the OTP box can fill itself
      if (e.verificationCode) { autoCode = e.verificationCode; window.dispatchEvent(new CustomEvent('pp-otp', { detail: autoCode })); }
    });
    F.signInWithPhoneNumber({ phoneNumber: phone, timeout: 60 }).catch((e) => finish(reject, e));
  });
}

async function webOtp(phone, containerId) {
  if (!verifier) {
    // fresh element every time — reCAPTCHA cannot render twice into the same node
    const host = document.getElementById(containerId);
    const el = document.createElement('div');
    if (host) { host.innerHTML = ''; host.appendChild(el); }
    verifier = new RecaptchaVerifier(auth, el, { size: 'invisible' });
  }
  try {
    return await signInWithPhoneNumber(auth, phone, verifier);
  } catch (e) {
    try { verifier.clear(); } catch { /* ignore */ }
    verifier = null;
    throw e;
  }
}

/* ---------- Real OTP via our own server (Cloudflare Worker + Message Central VerifyNow) ----------
   The server sends a 6-digit SMS, checks it, and returns a Firebase custom token for
   the same account the app already uses for this number (91XXXXXXXXXX@login.foodgaon.app). */
export const DEFAULT_OTP_API = 'https://foodgaon-otp.surajbhanpandey853.workers.dev';
const otpErr = (code, msg) => Object.assign(new Error(msg || code), { code: 'auth/' + code });
async function otpPost(api, path, data) {
  let r;
  const base = new URL(api);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) throw otpErr('otp-server');
  try { r = await fetch(api.replace(/\/$/, '') + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: AbortSignal.timeout(45000) }); }
  catch { throw otpErr('network-request-failed'); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.ok) {
    const map = { 'too-soon': 'too-many-requests', 'too-many': 'too-many-requests', 'wrong-otp': 'invalid-verification-code', 'expired': 'code-expired', 'invalid-phone': 'invalid-phone-number' };
    throw otpErr(map[d.error] || 'otp-server');
  }
  return d;
}
async function serverOtp(api, phone10) {
  const { vid } = await otpPost(api, '/send', { phone: phone10 });
  if (!vid) throw otpErr('otp-server');
  return {
    server: true,
    confirm: async (code) => {
      const { token } = await otpPost(api, '/verify', { phone: phone10, vid, code: String(code) });
      if (!token) throw otpErr('otp-server');
      return signInWithCustomToken(auth, token);
    },
  };
}

export async function sendOtp(phone10, containerId, otpApi) {
  if (otpApi !== 'firebase') return serverOtp(otpApi || DEFAULT_OTP_API, phone10);
  const phone = '+91' + phone10;
  if (NATIVE) {
    let F = null;
    try {
      F = (await faMod()).FirebaseAuthentication;
      await F.removeAllListeners();
      return await nativeOtp(F, phone, 25000);
    } catch (e) {
      console.warn('native OTP failed, trying web', e);
      try { await F?.removeAllListeners(); } catch { /* ignore */ }
      // fall back to the web method inside the app
      try { return await webOtp(phone, containerId); } catch (e2) { e2.nativeCode = e?.code; throw e2; }
    }
  }
  return webOtp(phone, containerId);
}

/* ---------- Mock OTP (testing phase) ----------
   Any 10-digit number + OTP 1234 logs in. Behind the scenes each number gets its own
   Firebase email/password account: 91XXXXXXXXXX@login.foodgaon.app
   Firestore rules read the phone back from this email. Switch to real SMS OTP before public launch. */
export const MOCK_OTP = '1234';
export const MOCK_DOMAIN = 'login.foodgaon.app';
const mockEmail = (p10) => `91${p10}@${MOCK_DOMAIN}`;
const mockPass = (p10) => `FG-${p10}-tg2026`;
let trialLookupAuth;
/** Trial-only existence check: isolated, memory-only auth; never creates an account or changes the main login session. */
export async function lookupTrialPhone(phone10) {
  if (!/^\d{10}$/.test(phone10)) throw Object.assign(new Error('invalid phone'), { code: 'auth/invalid-phone-number' });
  trialLookupAuth ||= initializeAuth(initializeApp(firebaseConfig, 'trial-phone-lookup'), { persistence: inMemoryPersistence });
  try {
    await signInWithEmailAndPassword(trialLookupAuth, mockEmail(phone10), mockPass(phone10));
    return true;
  } catch (e) {
    if (/user-not-found|invalid-credential|invalid-login|wrong-password/.test(e.code || '')) return false;
    throw e;
  } finally { await signOut(trialLookupAuth); }
}
/* the admin number uses its own secret PIN instead of the public test OTP (the PIN is part of its password) */
export const ADMIN_P10 = '9129203268';
const ADMIN_PIN_SHA = '1d44804dea45fe6ddce3ac8ce3bd0952cfb5bfa34d5091aa878c0ea17099a4bd';
const sha = async (s) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');
const wrongOtp = () => Object.assign(new Error('wrong otp'), { code: 'auth/invalid-verification-code' });
async function adminLogin(code) {
  const email = mockEmail(ADMIN_P10); const pass = `FG-${ADMIN_P10}-${code}-pin`;
  try { return await signInWithEmailAndPassword(auth, email, pass); } catch (e) {
    if (!/invalid-credential|invalid-login|wrong-password/.test(e.code || '')) throw e;
  }
  if ((await sha(`foodgaon-admin:${code}`)) !== ADMIN_PIN_SHA) throw wrongOtp();
  // one-time move from the old test password to the PIN password
  const r = await signInWithEmailAndPassword(auth, email, mockPass(ADMIN_P10)).catch(() => null);
  if (r) { await updatePassword(r.user, pass); return r; }
  // first login of a new admin number: create its account with the PIN password
  return await createUserWithEmailAndPassword(auth, email, pass).catch(() => { throw wrongOtp(); });
}
export async function mockLogin(phone10, code) {
  if (phone10 === ADMIN_P10) return adminLogin(String(code));
  if (/^\d{6}$/.test(String(code))) {
    // Firebase checks the real account password; no public PIN hashes or client-only gate.
    const { restaurantPassword } = await import('./restaurantPin.js');
    return signInWithEmailAndPassword(auth, mockEmail(phone10), restaurantPassword(phone10, code));
  }
  if (String(code) !== MOCK_OTP && String(code) !== phone10.slice(0, 4)) throw wrongOtp();
  const email = mockEmail(phone10); const pass = mockPass(phone10);
  let result;
  try { result = await signInWithEmailAndPassword(auth, email, pass); } catch (e) {
    if (!/user-not-found|invalid-credential|invalid-login/.test(e.code || '')) throw e;
    result = await createUserWithEmailAndPassword(auth, email, pass);
  }
  // Trial only: registered owners use the first four digits; customers retain 1234.
  try {
    const staff = await getOne('staff', '+91' + phone10);
    const restaurant = staff?.restaurant ? await getOne('restaurants', staff.restaurant) : null;
    const owner = restaurant && String(restaurant.ownerPhone || '').replace(/\D/g, '').slice(-10) === phone10;
    if (String(code) !== (owner ? phone10.slice(0, 4) : MOCK_OTP)) throw wrongOtp();
    return result;
  } catch (error) { await signOut(auth); throw error; }
}
/** +91 phone of the signed-in user (real SMS login, or mock login email) */
export function phoneOf(u) {
  if (!u) return '';
  if (u.phoneNumber) return u.phoneNumber;
  const m = /^(91\d{10})@login\.foodgaon\.app$/.exec(u.email || '');
  return m ? '+' + m[1] : '';
}

/* ---------- Google ---------- */
export async function googleSignIn() {
  if (NATIVE) {
    const F = (await faMod()).FirebaseAuthentication;
    const r = await F.signInWithGoogle();
    const idToken = r?.credential?.idToken;
    if (!idToken) throw Object.assign(new Error('Google sign-in cancelled'), { code: 'auth/cancelled' });
    return signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  }
  const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, p);
}
export async function fullSignOut() {
  if (NATIVE) { try { await (await faMod()).FirebaseAuthentication.signOut(); } catch { /* ignore */ } }
  return signOut(auth);
}

/* ---------- tiny data helpers ---------- */
const snapList = (s) => s.docs.map((d) => ({ id: d.id, ...d.data() }));
const build = (path, filters = [], order, lim) => {
  const parts = filters.map(([f, op, v]) => where(f, op, v));
  if (order) parts.push(orderBy(order[0], order[1] || 'asc'));
  if (lim) parts.push(limit(lim));
  return query(collection(db, path), ...parts);
};
export const watchList = (path, filters, cb, order, lim, onErr) =>
  onSnapshot(build(path, filters, order, lim), (s) => cb(snapList(s)), (e) => { console.warn(path, e); onErr?.(e); });
export const watchDoc = (path, id, cb) =>
  onSnapshot(doc(db, path, id), (d) => cb(d.exists() ? { id: d.id, ...d.data() } : null), (e) => { console.warn(path, id, e); cb(null); });
/** like watchDoc, but tells whether the answer came from the server (not the offline cache) */
export const watchDocLive = (path, id, cb) =>
  onSnapshot(doc(db, path, id), { includeMetadataChanges: true }, (d) => cb(d.exists() ? { id: d.id, ...d.data() } : null, !d.metadata.fromCache), () => {});
export const getOne = async (path, id) => { const d = await getDoc(doc(db, path, id)); return d.exists() ? { id: d.id, ...d.data() } : null; };
export const getList = async (path, filters, order, lim) => snapList(await getDocs(build(path, filters, order, lim)));
export const put = (path, id, data, merge = true) => setDoc(doc(db, path, id), data, { merge });
export const patch = (path, id, data) => updateDoc(doc(db, path, id), data);
export const remove = (path, id) => deleteDoc(doc(db, path, id));
export const add = (path, data) => addDoc(collection(db, path), data);
export const newId = (path) => doc(collection(db, path)).id;
export async function bulk(ops) {
  for (let i = 0; i < ops.length; i += 400) {
    const b = writeBatch(db);
    ops.slice(i, i + 400).forEach(([kind, path, id, data]) => {
      const r = doc(db, path, id);
      if (kind === 'set') b.set(r, data, { merge: true }); else if (kind === 'del') b.delete(r); else b.update(r, data);
    });
    await b.commit();
  }
}

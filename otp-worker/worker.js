/* FoodGaon OTP server (Cloudflare Worker, free plan)
   POST /send   {phone:"9XXXXXXXXX"}                       -> {ok, vid}
   POST /verify {phone, vid, code}                         -> {ok, token}  (Firebase custom token)
   Secrets (wrangler secret put / dashboard): MC_CUSTOMER_ID, MC_PASSWORD, FB_SA_JSON
   Optional secrets for the Google Play review account: REVIEW_PHONE (10 digits), REVIEW_CODE (6 digits)
     -> that number gets no SMS; REVIEW_CODE is accepted instead. Keep it a plain customer number.
   Vars: ALLOWED_ORIGINS (comma list), FB_PROJECT_ID
   Durable Object binding: OTP_STATE (consistent rate limits + pending verifications) */

const MC = 'https://cpaas.messagecentral.com';
const LOGIN_DOMAIN = 'login.foodgaon.app';

const handler = {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : (allowed[0] || ''),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };
    if(origin && !allowed.includes(origin)) return new Response('Forbidden',{status:403});
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
    const url = new URL(req.url);
    let body = {};
    try { body = await req.json(); } catch { return json({ ok: false, error: 'bad-json' }, 400); }
    const phone = String(body.phone || '');
    if (!/^[6-9]\d{9}$/.test(phone)) return json({ ok: false, error: 'invalid-phone' }, 400);
    const ip = req.headers.get('CF-Connecting-IP') || 'x';

    try {
      if(!env.MC_CUSTOMER_ID||!env.MC_PASSWORD||!env.FB_SA_JSON)return json({ok:false,error:'not-configured'},503);
      const isReview = env.REVIEW_PHONE && env.REVIEW_CODE && phone === env.REVIEW_PHONE;
      if(url.pathname==='/send' || url.pathname==='/verify'){
        if(!(await bump(env,'ip:'+ip,40)))return json({ok:false,error:'too-many'},429);
      }
      if (url.pathname === '/send' && isReview) {
        if(await env.OTPKV.get('cool:'+phone))return json({ok:false,error:'too-soon'},429);
        const vid = 'r' + BigInt('0x'+[...crypto.getRandomValues(new Uint8Array(12))].map(x=>x.toString(16).padStart(2,'0')).join('')).toString();
        await env.OTPKV.put('vid:' + vid, phone, { expirationTtl: 600 });
        await env.OTPKV.put('cool:'+phone,'1',{expirationTtl:60});
        return json({ ok: true, vid });
      }
      if (url.pathname === '/send') {
        // limits: 1 per 45 s and 5 per hour per number; 20 per hour per IP
        if (await env.OTPKV.get('cool:' + phone)) return json({ ok: false, error: 'too-soon' }, 429);
        if (!(await bump(env, 'ph:' + phone, 5))) return json({ ok: false, error: 'too-many' }, 429);
        if(!(await bump(env,'daily:'+new Date().toISOString().slice(0,10),Number(env.DAILY_SMS_LIMIT)||50,86400)))return json({ok:false,error:'too-many'},429);
        const token = await mcToken(env);
        const r = await fetch(`${MC}/verification/v3/send?countryCode=91&flowType=SMS&otpLength=6&mobileNumber=${phone}`, { method: 'POST', headers: { authToken: token }, signal:AbortSignal.timeout(15000) });
        const d = await r.json().catch(() => ({}));
        const vid = d?.data?.verificationId;
        if (!r.ok || !vid) return json({ ok: false, error: 'send-failed' }, 502);
        await env.OTPKV.put('cool:' + phone, '1', { expirationTtl: 60 });
        await env.OTPKV.put('vid:' + vid, phone, { expirationTtl: 600 });
        return json({ ok: true, vid: String(vid) });
      }

      if (url.pathname === '/verify') {
        const vid = String(body.vid || ''); const code = String(body.code || '');
        if (!/^r?\d+$/.test(vid) || !/^\d{6}$/.test(code)) return json({ ok: false, error: 'bad-input' }, 400);
        if ((await env.OTPKV.get('vid:' + vid)) !== phone) return json({ ok: false, error: 'expired' }, 400);
        if (!(await bump(env, 'try:' + vid, 5))) return json({ ok: false, error: 'too-many' }, 429);
        if (vid.startsWith('r')) {
          if (!isReview || code !== String(env.REVIEW_CODE)) return json({ ok: false, error: 'wrong-otp' }, 400);
          const fbToken=await firebaseTokenFor(env,phone);
          await env.OTPKV.delete('vid:' + vid);
          return json({ ok: true, token: fbToken });
        }
        const token = await mcToken(env);
        const r = await fetch(`${MC}/verification/v3/validateOtp?verificationId=${vid}&code=${code}`, { headers: { authToken: token },signal:AbortSignal.timeout(15000) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || d?.data?.verificationStatus !== 'VERIFICATION_COMPLETED') return json({ ok: false, error: 'wrong-otp' }, 400);
        const fbToken = await firebaseTokenFor(env, phone);
        await env.OTPKV.delete('vid:' + vid);
        return json({ ok: true, token: fbToken });
      }
      return json({ ok: false, error: 'not-found' }, 404);
    } catch (e) {
      console.error('OTP server error',e?.name||'Error');
      return json({ ok: false, error: 'server' }, 500);
    }
  },
};

// counter in a 1-hour window; returns false when over the limit
async function bump(env, key, max, ttl = 3600) {
  const n = Number(await env.OTPKV.get(key)) || 0;
  if (n >= max) return false;
  await env.OTPKV.put(key, String(n + 1), { expirationTtl: ttl });
  return true;
}

async function mcToken(env) {
  const cached = await env.OTPKV.get('mc-token');
  if (cached) return cached;
  const key = btoa(env.MC_PASSWORD);
  const r = await fetch(`${MC}/auth/v1/authentication/token?customerId=${encodeURIComponent(env.MC_CUSTOMER_ID)}&key=${encodeURIComponent(key)}&scope=NEW&country=91`,{signal:AbortSignal.timeout(15000)});
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d?.token) throw new Error('message-central token failed');
  await env.OTPKV.put('mc-token', d.token, { expirationTtl: 3600 * 6 });
  return d.token;
}

/* ---------- Firebase (service account) ---------- */
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uStr = (s) => b64u(new TextEncoder().encode(s));
let keyCache;
async function signJwt(sa, payload) {
  if (!keyCache) {
    const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
    const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
    keyCache = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  }
  const head = b64uStr(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64uStr(JSON.stringify(payload));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keyCache, new TextEncoder().encode(head + '.' + body));
  return head + '.' + body + '.' + b64u(sig);
}
async function googleAccessToken(env, sa) {
  const cached = await env.OTPKV.get('g-token');
  if (cached) return cached;
  const now = Math.floor(Date.now() / 1000);
  const assertion = await signJwt(sa, { iss: sa.client_email, scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/cloud-platform', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + assertion, signal:AbortSignal.timeout(15000) });
  const d = await r.json();
  if (!r.ok || !d.access_token) throw new Error('google token failed');
  await env.OTPKV.put('g-token', d.access_token, { expirationTtl: 3000 });
  return d.access_token;
}
/* Same account the app already uses for this number (91XXXXXXXXXX@login.foodgaon.app),
   so existing orders/roles and Firestore rules keep working. Its password is replaced
   with a random one, so the old test-mode password stops working. */
async function firebaseTokenFor(env, phone) {
  const sa = JSON.parse(env.FB_SA_JSON);
  const pid = env.FB_PROJECT_ID || sa.project_id;
  const at = await googleAccessToken(env, sa);
  const api = `https://identitytoolkit.googleapis.com/v1/projects/${pid}`;
  const H = { Authorization: 'Bearer ' + at, 'Content-Type': 'application/json' };
  const email = `91${phone}@${LOGIN_DOMAIN}`;
  const randPass = b64u(crypto.getRandomValues(new Uint8Array(24)));
  let uid;
  const lookup = await fetch(`${api}/accounts:lookup`, { method: 'POST', headers: H, body: JSON.stringify({ email: [email] }), signal:AbortSignal.timeout(15000) });
  if(!lookup.ok)throw new Error('account lookup failed');
  const lk = await lookup.json();
  if (lk.users?.length) {
    uid = lk.users[0].localId;
    if(lk.users[0].disabled)throw new Error('account disabled');
    const updated=await fetch(`${api}/accounts:update`, { method: 'POST', headers: H, body: JSON.stringify({ localId: uid, password: randPass }), signal:AbortSignal.timeout(15000) });
    if(!updated.ok)throw new Error('account migration failed');
  } else {
    const created=await fetch(`${api}/accounts`, { method: 'POST', headers: H, body: JSON.stringify({ email, password: randPass }), signal:AbortSignal.timeout(15000) });
    if(!created.ok)throw new Error('account create failed');
    const cr = await created.json();
    uid = cr.localId;
    if (!uid) throw new Error('account create failed');
  }
  const now = Math.floor(Date.now() / 1000);
  return signJwt(sa, {
    iss: sa.client_email, sub: sa.client_email,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat: now, exp: now + 3600, uid, claims:{fg_phone:'+91'+phone},
  });
}

// Strongly consistent session consumption: two concurrent verifications cannot reuse an OTP.
export class OtpState {
  constructor(state,env){this.state=state;this.env=env;this.tail=Promise.resolve();}
  fetch(req){const work=this.tail.then(()=>this.run(req));this.tail=work.catch(()=>{});return work;}
  async run(req){
    const storage=this.state.storage;
    const kv={get:async key=>{const v=await storage.get(key);if(!v)return null;if(v.expires<=Date.now()){await storage.delete(key);return null;}return v.value;},put:async(key,value,opts)=>{await storage.put(key,{value,expires:Date.now()+(opts?.expirationTtl||3600)*1000});},delete:key=>storage.delete(key)};
    if(!await storage.getAlarm())await storage.setAlarm(Date.now()+3600000);
    return handler.fetch(req,{...this.env,OTPKV:kv});
  }
  async alarm(){const rows=await this.state.storage.list();const expired=[...rows].filter(([,v])=>v.expires<=Date.now()).map(([k])=>k);if(expired.length)await this.state.storage.delete(expired);await this.state.storage.setAlarm(Date.now()+3600000);}
}
export default {async fetch(req,env){
  if(new URL(req.url).pathname==='/health')return Response.json({ok:!!(env.OTP_STATE&&env.MC_CUSTOMER_ID&&env.MC_PASSWORD&&env.FB_SA_JSON),service:'FoodGaon OTP'});
  if(!env.OTP_STATE)return Response.json({ok:false,error:'not-configured'},{status:503});
  return env.OTP_STATE.get(env.OTP_STATE.idFromName('foodgaon-auth-v1')).fetch(req);
}};

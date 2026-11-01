import React, { useEffect, useRef, useState } from 'react';
import { sendOtp, googleSignIn, updateProfile, auth, put, getOne, serverTimestamp, mockLogin, phoneOf, MOCK_OTP, ADMIN_P10 } from './lib/fb.js';
import { useApp } from './App.jsx';
import { Logo, Wordmark, Icon, useToast } from './ui.jsx';
import { t } from './i18n/index.js';
import { FoodOrbit, FloatingVeggies } from './components/Motion.jsx';
import { photo } from './data/photos.js';

const ORBIT = ['gulab_jamun', 'pbm', 'momos', 'lassi', 'masala_dosa', 'pani_puri', 'sundae'].map(photo);

const errText = (e) => {
  const c = e?.code || '';
  if (c.includes('invalid-verification-code')) return 'Wrong OTP or PIN. Please check and try again.';
  if (/invalid-credential|invalid-login|wrong-password|email-already-in-use/.test(c)) return 'Wrong OTP or PIN. If your restaurant has a PIN, use that instead of default OTP.';
  if (c.includes('code-expired')) return 'OTP expired. Please request a new one.';
  if (c.includes('too-many-requests') || c.includes('quota')) return 'Too many attempts. Please try again after some time.';
  if (c.includes('operation-not-allowed')) return 'SMS login is not enabled yet. Please try again later.';
  if (c.includes('invalid-phone')) return 'Enter a valid 10-digit mobile number';
  if (c.includes('network')) return 'Network problem. Please try again.';
  if (c.includes('popup-closed') || c.includes('cancel')) return 'Sign-in was cancelled';
  if (c.includes('captcha') || c.includes('app-credential') || c.includes('app-not-authorized')) return 'Phone verification failed on this device. Please update Google Play services and try again.';
  return 'Could not send OTP. Please try again.';
};

export default function Login({ onClose, startStep = 'phone', startMode = 'login' }) {
  const toast = useToast();
  const { config } = useApp() || {};
  const mock = (config?.otpMode || 'mock') !== 'real';
  const [step, setStep] = useState(startStep === 'phone' ? 'choose' : startStep);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [pinOnly, setPinOnly] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [googleProfile, setGoogleProfile] = useState(false);
  const [confirmedPhone, setConfirmedPhone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);
  const conf = useRef(null);
  const otpRef = useRef(null);
  const returnTo = useRef((() => { try { return sessionStorage.getItem('fg_login_return'); } catch { return null; } })());
  const finishLogin = () => {
    try { if (returnTo.current === 'cart') sessionStorage.setItem('fg_login_return', 'cart'); } catch {}
    onClose?.(); location.reload();
  };
  const validCode = pinOnly ? /^(\d{4}|\d{6})$/.test(otp) : mock ? /^(\d{4}|\d{6})$/.test(otp) : /^\d{6}$/.test(otp);

  useEffect(() => { if (left <= 0) return; const x = setTimeout(() => setLeft(left - 1), 1000); return () => clearTimeout(x); }, [left]);
  useEffect(() => {
    document.activeElement?.blur?.();
    const timer = setTimeout(() => document.querySelector('.login-card')?.scrollTo({ top: 0, behavior: 'smooth' }), 150);
    return () => clearTimeout(timer);
  }, [step]);
  // Android may read the SMS by itself — fill the box and log in
  useEffect(() => {
    const h = (e) => { const c = String(e.detail || ''); if (c.length === 6) { setOtp(c); setTimeout(() => document.getElementById('otp-go')?.click(), 300); } };
    window.addEventListener('pp-otp', h); return () => window.removeEventListener('pp-otp', h);
  }, []);

  const send = async (e) => {
    e?.preventDefault();
    if (busy) return;
    if (!(mock ? /^\d{10}$/ : /^[6-9]\d{9}$/).test(phone)) { toast(t('Enter a valid 10-digit mobile number'), 'err'); return; }
    if (name.trim().length < 2) { toast(t('Please enter your name'), 'err'); return; }
    setPinOnly(false);
    if (mock) { setStep('otp'); setOtp(''); setLeft(0); return; }
    setBusy(true);
    try {
      conf.current = await sendOtp(phone, 'recaptcha-box');
      setStep('otp'); setLeft(30);
      toast(t('OTP sent to +91 {}').replace('{}', phone));
    } catch (er) { console.warn(er); toast(`${t(errText(er))} (${er?.code || er?.message || ''}${er?.nativeCode ? ' / ' + er.nativeCode : ''})`, 'err'); }
    setBusy(false);
  };
  const google = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await googleSignIn();
      const u = r.user;
      const profile = await getOne('customers', u.uid);
      setName(profile?.name || u.displayName || '');
      setGender(profile?.gender || '');
      setPhone(String(profile?.phone || u.phoneNumber || '').replace(/\D/g, '').slice(-10));
      setGoogleProfile(true); setConfirmedPhone(false); setStep('name');
    } catch (er) { console.warn(er); toast(`${t(errText(er))} (${er?.code || er?.message || ''})`, 'err'); }
    setBusy(false);
  };
  const verify = async (e) => {
    e?.preventDefault();
    if (busy || !validCode) return;
    setBusy(true);
    try {
      const r = mock || pinOnly ? await mockLogin(phone, otp) : await conf.current.confirm(otp);
      const st = await getOne('staff', phoneOf(r.user));
      if (st) {
        if (!r.user.displayName && st.name) await updateProfile(r.user, { displayName: st.name });
      } else {
        const n = name.trim();
        await put('customers', r.user.uid, { name: n, gender, phone: phoneOf(r.user), lastLogin: serverTimestamp() });
        await updateProfile(r.user, { displayName: n });
      }
      finishLogin();
    } catch (er) { toast(`${t(errText(er))} (${er?.code || ''})`, 'err'); setBusy(false); }
  };
  const saveName = async (e) => {
    e?.preventDefault();
    if (busy) return;
    const n = name.trim();
    if (n.length < 2) { toast(t('Please enter your name'), 'err'); return; }
    if (googleProfile && (!/^\d{10}$/.test(phone) || !confirmedPhone)) return;
    setBusy(true);
    try {
      await updateProfile(auth.currentUser, { displayName: n });
      await put('customers', auth.currentUser.uid, { name: n, gender, ...(googleProfile ? { phone: '+91' + phone, email: auth.currentUser.email || '', provider: 'google', phoneConfirmedByUser: true } : { phone: phoneOf(auth.currentUser) }), lastLogin: serverTimestamp() });
    } catch (er) { console.warn(er); toast(t('Could not save your name. Please try again.'), 'err'); setBusy(false); return; }
    finishLogin();
  };

  return (
    <div className={`login-wrap ${step === 'choose' ? '' : 'login-details'}`}>
      <div className="login-card">
        <FloatingVeggies count={8} seed={7} className="login-veg" />
        {onClose && (step === 'phone' || step === 'choose') && <button className="icon-btn login-x" onClick={onClose} aria-label="Close"><Icon name="x" /></button>}
        <div className="login-brand">
          <FoodOrbit photos={ORBIT} size={210}><Logo size={70} animate /></FoodOrbit>
          <Wordmark size={34} />
          <p className="lb-tag">Hot food from the best kitchens in your villages and towns</p>
        </div>

        {step === 'choose' && <div className="login-form">
            <h3>Welcome to FoodGaon</h3>
            <button type="button" className="btn google block lg" disabled={busy} onClick={google}>
              <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
              Continue with Google
            </button>
            <div className="or-line"><span>or</span></div>
            <button type="button" className="btn primary block lg" disabled={busy} onClick={() => setStep('phone')}>Continue with mobile number</button>
        </div>}

        {step === 'phone' && (
          <form onSubmit={send} className="login-form">
            <button type="button" className="link" onClick={() => setStep('choose')}>Back</button>
            <h3>Continue with mobile number</h3>
            <label>Your name<input className="input" autoComplete="name" maxLength={40} value={name} onChange={e => setName(e.target.value)} /></label>
            <label>Gender<select className="input" value={gender} onChange={e => setGender(e.target.value)}><option value="">Prefer not to say</option><option value="male">Male</option><option value="female">Female</option></select></label>
            <div className="phone-input">
              <span>+91</span>
              <input inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="10-digit mobile number" value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />
            </div>
            <button className="btn primary block lg" disabled={busy || phone.length !== 10 || name.trim().length < 2}>{busy ? 'Sending…' : mock ? 'Continue' : 'Get OTP'}</button>
            {mock && <p className="tiny muted center">Trial login — no SMS will be sent.</p>}
            <button type="button" className="btn ghost block" disabled={busy || !/^\d{10}$/.test(phone) || phone === ADMIN_P10} onClick={() => { setPinOnly(true); setOtp(''); setStep('otp'); }}>Restaurant PIN login</button>
            <div className="or-line"><span>or</span></div>

            <p className="tiny muted center">By continuing you agree to our Terms & Privacy Policy</p>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={verify} className="login-form">
            <h3>{pinOnly ? 'Enter restaurant PIN' : mock && phone !== ADMIN_P10 ? 'Enter OTP or restaurant PIN' : 'Enter OTP'}</h3>
            <p className="muted small">{mock || pinOnly ? `+91 ${phone}` : `Sent to +91 ${phone}`} · <button type="button" className="link" disabled={busy} onClick={() => { setStep('phone'); setOtp(''); setPinOnly(false); setShowCode(false); }}>Change</button></p>
            {mock && !pinOnly && phone !== ADMIN_P10 && <div className="mock-otp big"><span>Default OTP: <b data-notr="">{MOCK_OTP}</b><small>Trial restaurant PIN: first 4 digits of your registered mobile number.</small></span></div>}
            {pinOnly && <p className="small muted">Trial mode: use the first 4 digits of your registered mobile number.</p>}
            <input ref={otpRef} className="otp-input" type={showCode ? 'text' : 'password'} disabled={busy} inputMode="numeric" aria-label={pinOnly ? 'Restaurant PIN' : 'OTP or PIN'} autoComplete={pinOnly ? 'current-password' : 'one-time-code'} maxLength={6} value={otp} placeholder={mock ? '••••' : '••••••'}
              onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setOtp(v); }} />
            <button type="button" className="link" aria-pressed={showCode} onClick={() => setShowCode(!showCode)}>{showCode ? 'Hide code' : 'Show code'}</button>
            <button id="otp-go" className="btn primary block lg" disabled={busy || !validCode}>{busy ? 'Checking…' : 'Verify & continue'}</button>
            {!mock && !pinOnly && <p className="small center">
              {left > 0 ? <span className="muted">{`Resend OTP in ${left}s`}</span> : <button type="button" className="link" onClick={send}>Resend OTP</button>}
            </p>}
          </form>
        )}

        {step === 'name' && (
          <form onSubmit={saveName} className="login-form">
            <h3>What should we call you?</h3>
            <p className="small muted" style={{ marginTop: -4 }}>Last step — your account is almost ready</p>
            <input className="input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={40} />
            <label>Gender<select className="input" value={gender} onChange={e => setGender(e.target.value)}><option value="">Prefer not to say</option><option value="male">Male</option><option value="female">Female</option></select></label>
            {googleProfile && <>
              <label>Mobile number<input className="input" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setConfirmedPhone(false); }} placeholder="10-digit mobile number" /></label>
              <label className="small"><input type="checkbox" checked={confirmedPhone} onChange={e => setConfirmedPhone(e.target.checked)} /> This is my mobile number</label>
            </>}
            <button className="btn primary block lg" disabled={busy || name.trim().length < 2 || (googleProfile && (phone.length !== 10 || !confirmedPhone))}>{busy ? 'Saving…' : "Let's eat!"}</button>
          </form>
        )}
        <div id="recaptcha-box" />
      </div>
    </div>
  );
}

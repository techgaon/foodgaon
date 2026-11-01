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
  if (c.includes('invalid-verification-code')) return 'Wrong OTP. Please check and try again.';
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
  const [step, setStep] = useState(startStep);
  const [mode, setMode] = useState(startMode);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [pinOnly, setPinOnly] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);
  const conf = useRef(null);
  const otpRef = useRef(null);
  const validCode = pinOnly ? /^(\d{4}|\d{6})$/.test(otp) : mock ? /^(\d{4}|\d{6})$/.test(otp) : /^\d{6}$/.test(otp);

  useEffect(() => { if (left <= 0) return; const x = setTimeout(() => setLeft(left - 1), 1000); return () => clearTimeout(x); }, [left]);
  useEffect(() => { if (step === 'otp') setTimeout(() => otpRef.current?.focus(), 200); }, [step]);
  // Android may read the SMS by itself — fill the box and log in
  useEffect(() => {
    const h = (e) => { const c = String(e.detail || ''); if (c.length === 6) { setOtp(c); setTimeout(() => document.getElementById('otp-go')?.click(), 300); } };
    window.addEventListener('pp-otp', h); return () => window.removeEventListener('pp-otp', h);
  }, []);

  const send = async (e) => {
    e?.preventDefault();
    if (!(mock ? /^\d{10}$/ : /^[6-9]\d{9}$/).test(phone)) { toast(t('Enter a valid 10-digit mobile number'), 'err'); return; }
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
    setBusy(true);
    try {
      const r = await googleSignIn();
      const u = r.user;
      await put('customers', u.uid, { name: u.displayName || '', email: u.email || '', provider: 'google', createdAt: serverTimestamp() });
      if (!u.displayName) { setStep('name'); setBusy(false); return; }
      onClose?.(); location.reload();
    } catch (er) { console.warn(er); toast(`${t(errText(er))} (${er?.code || er?.message || ''})`, 'err'); }
    setBusy(false);
  };
  const verify = async (e) => {
    e?.preventDefault();
    if (!validCode) return;
    setBusy(true);
    try {
      const r = mock || pinOnly ? await mockLogin(phone, otp) : await conf.current.confirm(otp);
      await put('customers', r.user.uid, { phone: phoneOf(r.user), lastLogin: serverTimestamp() }).catch(() => {});
      // staff (restaurant / delivery / admin) already have a name — no name step for them
      if (!r.user.displayName) {
        const st = await getOne('staff', phoneOf(r.user)).catch(() => null);
        if (st?.name) { await updateProfile(r.user, { displayName: st.name }).catch(() => {}); onClose?.(); location.reload(); return; }
      }
      if (!r.user.displayName) { setStep('name'); setBusy(false); return; }
      onClose?.(); location.reload();
    } catch (er) { toast(`${t(errText(er))} (${er?.code || ''})`, 'err'); setBusy(false); }
  };
  const saveName = async (e) => {
    e?.preventDefault();
    const n = name.trim();
    if (n.length < 2) { toast(t('Please enter your name'), 'err'); return; }
    setBusy(true);
    try {
      await updateProfile(auth.currentUser, { displayName: n });
      await put('customers', auth.currentUser.uid, { name: n, phone: phoneOf(auth.currentUser), createdAt: serverTimestamp() });
    } catch (er) { console.warn(er); }
    onClose?.();
    location.reload();
  };
  const isSignup = mode === 'signup';

  return (
    <div className="login-wrap">
      <div className="login-card">
        <FloatingVeggies count={8} seed={7} className="login-veg" />
        {onClose && step === 'phone' && <button className="icon-btn login-x" onClick={onClose} aria-label="Close"><Icon name="x" /></button>}
        <div className="login-brand">
          <FoodOrbit photos={ORBIT} size={210}><Logo size={70} animate /></FoodOrbit>
          <Wordmark size={34} />
          <p className="lb-tag">Hot food from the best kitchens in your villages and towns</p>
        </div>

        {step === 'phone' && (
          <form onSubmit={send} className="login-form">
            <div className="seg auth-seg">
              <button type="button" className={!isSignup ? 'on' : ''} onClick={() => setMode('login')}>Log in</button>
              <button type="button" className={isSignup ? 'on' : ''} onClick={() => setMode('signup')}>Sign up</button>
            </div>
            <h3>{isSignup ? 'Create your account' : 'Welcome back!'}</h3>
            <p className="small muted" style={{ marginTop: -4 }}>{isSignup ? 'Mobile number → OTP → your name. That\'s it!' : 'Log in with your mobile number'}</p>
            <div className="phone-input">
              <span>+91</span>
              <input inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="10-digit mobile number" value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} autoFocus />
            </div>
            <button className="btn primary block lg" disabled={busy || phone.length !== 10}>{busy ? 'Sending…' : 'Get OTP'}</button>
            <button type="button" className="btn ghost block" disabled={busy || !/^\d{10}$/.test(phone) || phone === ADMIN_P10} onClick={() => { setPinOnly(true); setOtp(''); setStep('otp'); }}>Restaurant PIN login</button>
            <div className="or-line"><span>or</span></div>
            <button type="button" className="btn google block lg" disabled={busy} onClick={google}>
              <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
              {isSignup ? 'Sign up with Google' : 'Continue with Google'}
            </button>
            <p className="tiny muted center">By continuing you agree to our Terms & Privacy Policy</p>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={verify} className="login-form">
            <h3>{pinOnly ? 'Enter restaurant PIN' : mock && phone !== ADMIN_P10 ? 'Enter OTP or restaurant PIN' : 'Enter OTP'}</h3>
            <p className="muted small">{mock || pinOnly ? `+91 ${phone}` : `Sent to +91 ${phone}`} · <button type="button" className="link" onClick={() => { setStep('phone'); setOtp(''); setPinOnly(false); }}>Change</button></p>
            {mock && !pinOnly && phone !== ADMIN_P10 && <div className="mock-otp big"><span>Default OTP: <b data-notr="">{MOCK_OTP}</b><small>Trial restaurant PIN: first 4 digits of your registered mobile number.</small></span></div>}
            {pinOnly && <p className="small muted">Trial mode: use the first 4 digits of your registered mobile number.</p>}
            <input ref={otpRef} className="otp-input" type="password" inputMode="numeric" aria-label={pinOnly ? 'Restaurant PIN' : 'OTP or PIN'} autoComplete={pinOnly ? 'current-password' : 'one-time-code'} maxLength={6} value={otp} placeholder={pinOnly || !mock ? '••••••' : '••••'}
              onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setOtp(v); }} />
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
            <input className="input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={40} />
            <button className="btn primary block lg" disabled={busy}>Let's eat!</button>
          </form>
        )}
        <div id="recaptcha-box" />
      </div>
    </div>
  );
}

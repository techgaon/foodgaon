// Android (Capacitor): notifications, status bar, back button, GPS, UPI app chooser
import { Capacitor, registerPlugin } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();

let LN = null;
const lnMod = async () => (LN = LN || (await import('@capacitor/local-notifications'))); // return the module, not the plugin proxy (await on a proxy hangs)

export async function nativeAskNotify() {
  try {
    const L = (await lnMod()).LocalNotifications;
    const p = await L.checkPermissions();
    if (p.display !== 'granted') await L.requestPermissions();
    await L.createChannel?.({ id: 'orders', name: 'Orders', importance: 5, visibility: 1, vibration: true });
  } catch (e) { console.warn('notify perm', e); }
}
let nid = 1;
export async function nativeNotify(title, body) {
  try {
    const L = (await lnMod()).LocalNotifications;
    await L.schedule({ notifications: [{ id: (Date.now() % 100000) * 10 + (nid++ % 10), title, body, channelId: 'orders', smallIcon: 'ic_stat_notify' }] });
  } catch (e) { console.warn('notify', e); }
}

export async function initNative() {
  if (!isNative) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setBackgroundColor({ color: '#e8461a' });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch (e) { console.warn('statusbar', e); }
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', () => {
      if (document.querySelector('.sheet-wrap')) window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      else if (window.__ppBack && window.__ppBack()) { /* handled by screen */ } else App.minimizeApp();
    });
  } catch (e) { console.warn('back', e); }
}

/* ---------- GPS ---------- */
export async function getPosition() {
  if (isNative) {
    const { Geolocation } = await import('@capacitor/geolocation');
    const perm = await Geolocation.checkPermissions();
    if (perm.location !== 'granted') {
      const r = await Geolocation.requestPermissions({ permissions: ['location'] });
      if (r.location !== 'granted' && r.coarseLocation !== 'granted') throw new Error('Location permission denied');
    }
    const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    return { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy };
  }
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('GPS not available'));
    navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      (e) => rej(new Error(e.code === 1 ? 'Location permission denied' : 'Could not get location')), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });
}
/** keep sending position; returns stop() */
export async function watchPosition(cb) {
  if (isNative) {
    const { Geolocation } = await import('@capacitor/geolocation');
    try { await Geolocation.requestPermissions({ permissions: ['location'] }); } catch { /* ignore */ }
    const id = await Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 20000 }, (p) => p && cb({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }));
    return () => Geolocation.clearWatch({ id });
  }
  if (!navigator.geolocation) return () => {};
  const id = navigator.geolocation.watchPosition((p) => cb({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }), () => {}, { enableHighAccuracy: true });
  return () => navigator.geolocation.clearWatch(id);
}

/* ---------- UPI ---------- */
const UpiPay = registerPlugin('UpiPay');
export async function upiApps() { if (!isNative) return []; try { return (await UpiPay.apps()).apps || []; } catch { return []; } }
/** Opens a UPI app. On the phone app it waits for the UPI app to come back and returns its answer:
 *  { ok, status: 'SUCCESS'|'SUBMITTED'|'FAILURE'|'CANCELLED'|'UNKNOWN'|'WEB', txnId, txnRef } */
export async function upiPay(url, pkg) {
  if (!isNative) { location.href = url; return { ok: true, status: 'WEB' }; }
  const run = async (p) => { const r = await UpiPay.pay({ url, package: p || '' }); return { ok: true, status: String(r?.status || 'UNKNOWN').toUpperCase(), txnId: r?.txnId || '', txnRef: r?.txnRef || '', raw: r?.raw || '' }; };
  try { return await run(pkg); } catch {
    if (pkg) { try { return await run(''); } catch { /* no UPI app */ } }
    return { ok: false, status: 'NOAPP' };
  }
}

/** save an image (data URL) to the phone gallery (Pictures/FoodGaon); on the web it downloads the file */
export async function saveImage(dataUrl, name = 'FoodGaon-QR.png') {
  if (isNative) {
    try { await UpiPay.saveImage({ data: dataUrl, name }); return true; } catch (e) { console.warn('saveImage', e); return false; }
  }
  const a = document.createElement('a'); a.href = dataUrl; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  return true;
}

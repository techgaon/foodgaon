import { initializeAppCheck, ReCaptchaEnterpriseProvider, CustomProvider, getToken } from 'firebase/app-check';
import { Capacitor } from '@capacitor/core';
import { FirebaseAppCheck } from '@capacitor-firebase/app-check';
import { app } from './fb.js';

// Public site key of the provider already registered for petpyaar-web.
const SITE_KEY = '6LdwUg8uAAAAAKJYBbw2EI2_PFd8yd4akEDaLICC';
export const AI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
let initialization;
async function initializeCheck() {
  let provider;
  if (Capacitor.isNativePlatform()) {
    await FirebaseAppCheck.initialize({ isTokenAutoRefreshEnabled: true });
    provider = new CustomProvider({ getToken: () => FirebaseAppCheck.getToken({ forceRefresh: false }) });
  } else {
    provider = new ReCaptchaEnterpriseProvider(SITE_KEY);
  }
  return initializeAppCheck(app, { provider, isTokenAutoRefreshEnabled: true });
}
export async function prepareAI() {
  initialization ||= initializeCheck().catch(error => { initialization = null; throw error; });
  const check = await initialization;
  try { await getToken(check); }
  catch (error) {
    throw new Error('App Check verification failed', { cause: error });
  }
}

export function isAIAccessError(error) {
  return /\[40[13]|API key|App.?Check|appCheck|recaptcha/i.test(String(error?.message || error));
}

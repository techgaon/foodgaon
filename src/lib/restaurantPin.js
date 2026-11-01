import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth, phoneOf } from './fb.js';

export const validRestaurantPin = pin => /^\d{6}$/.test(String(pin)) && !/^(\d)\1{5}$/.test(String(pin));
export const restaurantPassword = (phone10, pin) => `FG-${phone10}-${pin}-restaurant-pin-v1`;

export async function setRestaurantPin(restaurantId, pin) {
  if (!validRestaurantPin(pin)) throw new Error('Use 6 digits, not all the same.');
  const result = await httpsCallable(getFunctions(app, 'asia-south1'), 'setRestaurantLoginPin')({ restaurantId, pin });
  return result.data;
}

export async function changeRestaurantPin(currentPin, newPin) {
  if (!validRestaurantPin(newPin)) throw new Error('Use 6 digits, not all the same.');
  if (currentPin === newPin) throw new Error('Choose a different new PIN.');
  const user = auth.currentUser;
  const phone10 = phoneOf(user).slice(-10);
  if (!user || user.email !== `91${phone10}@login.foodgaon.app`) throw new Error('Log in with your registered mobile number and current OTP or PIN first.');
  const oldPassword = currentPin === '1234' ? `FG-${phone10}-tg2026` : restaurantPassword(phone10, currentPin);
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, oldPassword));
  await updatePassword(user, restaurantPassword(phone10, newPin));
}

export function pinError(error) {
  const code = error?.code || '';
  if (/invalid-credential|wrong-password|invalid-login/.test(code)) return 'Current OTP or PIN is incorrect.';
  if (/too-many-requests|resource-exhausted/.test(code)) return 'Too many attempts. Please try again later.';
  if (/unauthenticated|requires-recent-login/.test(code)) return 'Please log in again and retry.';
  if (/functions\/(not-found|unavailable|internal)/.test(code)) return 'PIN service is unavailable. Could not confirm the update. Please try again or contact FoodGaon support.';
  return error?.message || 'Could not update PIN. Please try again.';
}

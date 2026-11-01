// Firebase Auth stores the password hash. Never write PINs to Firestore or logs.
const normalizePhone = value => {
  const digits = String(value || '').replace(/\D/g, '');
  return /^\d{10}$/.test(digits) ? '+91' + digits : /^91\d{10}$/.test(digits) ? '+' + digits : '';
};
const validPin = pin => typeof pin === 'string' && /^\d{6}$/.test(pin) && !/^(\d)\1{5}$/.test(pin);
const passwordFor = (phone, pin) => `FG-${phone.slice(-10)}-${pin}-restaurant-pin-v1`;

function makeSetRestaurantPin({ db, auth, isAdmin, HttpsError }) {
  return async request => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Log in as admin first.');
    if (!await isAdmin(request.auth)) throw new HttpsError('permission-denied', 'Only an admin can reset restaurant PINs.');
    const { restaurantId, pin } = request.data || {};
    if (typeof restaurantId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(restaurantId) || !validPin(pin)) {
      throw new HttpsError('invalid-argument', 'Select a restaurant and enter 6 digits, not all the same.');
    }
    const restaurant = await db.doc(`restaurants/${restaurantId}`).get();
    if (!restaurant.exists) throw new HttpsError('not-found', 'Restaurant no longer exists.');
    const phone = normalizePhone(restaurant.data().ownerPhone);
    if (!phone || phone === '+919129203268') throw new HttpsError('failed-precondition', 'Use a separate registered restaurant owner number.');
    const staff = await db.doc(`staff/${phone}`).get();
    if (!staff.exists || staff.data().restaurant !== restaurantId || staff.data().admin === true) {
      throw new HttpsError('failed-precondition', 'This number is not linked exclusively to this restaurant owner. Check the registered number.');
    }
    const email = phone.slice(1) + '@login.foodgaon.app';
    let account;
    try { account = await auth.getUserByEmail(email); }
    catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
      // Assign the PIN before first login without changing the admin's own session.
      try { account = await auth.createUser({ email, password: passwordFor(phone, pin), displayName: staff.data().name || restaurant.data().name || 'Restaurant owner' }); }
      catch (createError) {
        if (createError.code !== 'auth/email-already-exists') throw createError;
        account = await auth.getUserByEmail(email);
      }
    }
    if (account.disabled) throw new HttpsError('failed-precondition', 'This account is disabled.');
    await auth.updateUser(account.uid, { password: passwordFor(phone, pin) });
    await auth.revokeRefreshTokens(account.uid);
    return { success: true, phone };
  };
}
module.exports = { makeSetRestaurantPin, normalizePhone, validPin, passwordFor };

const assert = require('node:assert/strict');
const { makeSetRestaurantPin, normalizePhone, validPin, passwordFor } = require('../functions/restaurant-pin');
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
const owner = '+919876543210';
function fixture(overrides = {}) {
  const changes = [];
  const docs = {
    'restaurants/shop': { ownerPhone: owner, name: 'Test kitchen' },
    [`staff/${owner}`]: { restaurant: 'shop', name: 'Owner' },
    ...overrides.docs,
  };
  const deps = {
    db: { doc(path) { return { async get() { return { exists: !!docs[path], data: () => docs[path] }; } }; } },
    auth: {
      async getUserByEmail(email) { assert.equal(email, '919876543210@login.foodgaon.app'); if (overrides.missing) throw { code: 'auth/user-not-found' }; return { uid: 'owner-id', disabled: overrides.disabled }; },
      async createUser(data) { changes.push(['create', data]); return { uid: 'owner-id' }; },
      async updateUser(uid, data) { changes.push(['update', uid, data]); },
      async revokeRefreshTokens(uid) { changes.push(['revoke', uid]); },
    },
    isAdmin: async () => overrides.admin !== false,
    HttpsError,
  };
  return { run: makeSetRestaurantPin(deps), changes };
}
const request = { auth: { uid: 'admin-id' }, data: { restaurantId: 'shop', pin: '482619' } };
(async () => {
  assert.equal(normalizePhone('98765 43210'), owner);
  assert.equal(normalizePhone('+91 98765 43210'), owner);
  assert.equal(normalizePhone('123'), '');
  for (const pin of ['1234', '111111', 'abcdef', 482619, '1234567']) assert.equal(validPin(pin), false);
  for (const [options, req, code] of [
    [{}, { ...request, auth: null }, 'unauthenticated'],
    [{ admin: false }, request, 'permission-denied'],
    [{}, { ...request, data: { restaurantId: '../admin', pin: '482619' } }, 'invalid-argument'],
    [{}, { ...request, data: { restaurantId: 'shop', pin: '111111' } }, 'invalid-argument'],
    [{ docs: { 'restaurants/shop': null } }, request, 'not-found'],
    [{ docs: { [`staff/${owner}`]: { restaurant: 'other' } } }, request, 'failed-precondition'],
    [{ docs: { [`staff/${owner}`]: { restaurant: 'shop', admin: true } } }, request, 'failed-precondition'],
    [{ docs: { 'restaurants/shop': { ownerPhone: '+919129203268' } } }, request, 'failed-precondition'],
    [{ disabled: true }, request, 'failed-precondition'],
  ]) {
    const f = fixture(options);
    await assert.rejects(f.run(req), { code });
    assert.equal(f.changes.length, 0, 'Rejected callers must never change credentials');
  }
  const f = fixture();
  assert.deepEqual(await f.run(request), { success: true, phone: owner });
  assert.deepEqual(f.changes, [['update', 'owner-id', { password: passwordFor(owner, request.data.pin) }], ['revoke', 'owner-id']]);
  const fresh = fixture({ missing: true });
  await fresh.run(request);
  assert.equal(fresh.changes[0][0], 'create');
  assert.equal(fresh.changes[0][1].password, passwordFor(owner, request.data.pin));
  assert.notEqual(passwordFor(owner, request.data.pin), 'FG-9876543210-tg2026');
  console.log('PASS: PIN authorization, deleted/mismatched owners, admin protection, validation, first login, password replacement and session revocation.');
})().catch(error => { console.error(error); process.exitCode = 1; });

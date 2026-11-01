const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/Login.jsx', 'utf8');
const sendSource = source.slice(source.indexOf('  const send ='), source.indexOf('  const google ='));
const errors = source.slice(source.indexOf('const errText ='), source.indexOf('export default'));
async function run(phone, restaurants, fail = false) {
  const state = {};
  const context = { phone, restaurants, mock: true, name: 'Test User', busy: false, ADMIN_P10: '9129203268', t: s => s,
    console: { warn() {} }, toast: m => { state.error = m; }, getList: async () => { if (fail) throw Error('offline'); return restaurants; } };
  for (const key of ['PinOnly', 'Step', 'Otp', 'Left', 'Busy']) context['set' + key] = value => { state[key] = value; };
  await vm.runInNewContext(errors + sendSource + '\nsend()', context);
  return state;
}
(async () => {
  const restaurants = [{ ownerPhone: '+91 94153 33145' }];
  const owner = await run('9415333145', restaurants);
  assert.equal(owner.PinOnly, true); assert.equal(owner.Step, 'otp'); assert.equal(owner.Busy, false);
  const customer = await run('9990000001', restaurants);
  assert.equal(customer.PinOnly, false); assert.equal(customer.Step, 'otp');
  const admin = await run('9129203268', restaurants);
  assert.equal(admin.PinOnly, false);
  const offline = await run('9990000001', [], true);
  assert.equal(offline.Step, undefined); assert.equal(offline.Busy, false); assert.ok(offline.error);
  const googleError = vm.runInNewContext(errors + '\nerrText({code:"auth/unauthorized-domain"}, "google")');
  assert.ok(googleError.includes('Google')); assert.ok(!googleError.includes('OTP'));
  console.log('PASS: registered restaurant detection, customer/admin OTP, lookup failures and Google-specific errors.');
})().catch(e => { console.error(e); process.exitCode = 1; });

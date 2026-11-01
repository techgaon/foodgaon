const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/Login.jsx', 'utf8');
const sendSource = source.slice(source.indexOf('  const send ='), source.indexOf('  const google ='));
const errors = source.slice(source.indexOf('const errText ='), source.indexOf('export default'));
async function run(phone, restaurants, fail = false, registered = true, step = 'phone') {
  const state = {};
  const context = { phone, restaurants, step, lookupTrialPhone: async () => registered, mock: true, name: 'Test User', busy: false, ADMIN_P10: '9129203268', t: s => s,
    console: { warn() {} }, toast: m => { state.error = m; }, getList: async () => { if (fail) throw Error('offline'); return restaurants; } };
  for (const key of ['PinOnly', 'Step', 'Otp', 'Left', 'Busy', 'NewMobile', 'Name', 'Gender']) context['set' + key] = value => { state[key] = value; };
  await vm.runInNewContext(errors + sendSource + '\nsend()', context);
  return state;
}
(async () => {
  const restaurants = [{ ownerPhone: '+91 94153 33145' }];
  const owner = await run('9415333145', restaurants);
  assert.equal(owner.PinOnly, true); assert.equal(owner.Step, 'otp'); assert.equal(owner.Busy, false);
  const customer = await run('9990000001', restaurants);
  assert.equal(customer.PinOnly, false); assert.equal(customer.Step, 'otp');
  const fresh = await run('9990000002', restaurants, false, false);
  assert.equal(fresh.Step, 'details'); assert.equal(fresh.NewMobile, true);
  const completed = await run('9990000002', restaurants, false, false, 'details');
  assert.equal(completed.Step, 'otp');
  const admin = await run('9129203268', restaurants);
  assert.equal(admin.PinOnly, false);
  const offline = await run('9990000001', [], true);
  assert.equal(offline.Step, undefined); assert.equal(offline.Busy, false); assert.ok(offline.error);
  const googleError = vm.runInNewContext(errors + '\nerrText({code:"auth/unauthorized-domain"}, "google")');
  assert.ok(googleError.includes('Google')); assert.ok(!googleError.includes('OTP'));
  const fb = fs.readFileSync('src/lib/fb.js', 'utf8');
  const lookup = fb.slice(fb.indexOf('let trialLookupAuth;'), fb.indexOf('/* the admin number')) .replace('export async function', 'async function');
  for (const code of ['', 'auth/invalid-credential', 'auth/network-request-failed']) {
    const isolated = {id:'isolated'}; let cleaned = false;
    const promise = vm.runInNewContext(lookup + '\nlookupTrialPhone("9990000001")', {
      firebaseConfig:{}, inMemoryPersistence:'memory', initializeApp:()=>({}), initializeAuth:()=>isolated,
      mockEmail:p=>p, mockPass:p=>p,
      signInWithEmailAndPassword:async target=>{assert.equal(target,isolated);if(code)throw {code};},
      signOut:async target=>{assert.equal(target,isolated);cleaned=true;},
    });
    if(code.includes('network')) await assert.rejects(promise); else assert.equal(await promise, !code);
    assert.equal(cleaned,true);
  }
  const verifySource = source.slice(source.indexOf('  const verify ='), source.indexOf('  const saveName ='));
  let written;
  await vm.runInNewContext(verifySource + '\nverify()', {
    busy:false, validCode:true, mock:true, pinOnly:false, phone:'9990000001',otp:'1234',newMobile:false,name:'',gender:'male',
    mockLogin:async()=>({user:{uid:'existing',displayName:'Saved Name'}}),phoneOf:()=>'+919990000001',
    getOne:async path=>path==='staff'?null:{name:'Saved Name',gender:'female',family:[{name:'Child'}]},
    put:async(p,id,data)=>{written=data;},setBusy:()=>{},serverTimestamp:()=>0,finishLogin:()=>{},toast:()=>{},
  });
  assert.equal('gender' in written,false);assert.equal('name' in written,false);assert.equal('family' in written,false);
  console.log('PASS: phone-first routing, existing customer/admin OTP, restaurant PIN, new-customer details and lookup failures.');
})().catch(e => { console.error(e); process.exitCode = 1; });

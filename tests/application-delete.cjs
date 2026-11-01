const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const file = fs.readFileSync('src/admin/Applications.jsx', 'utf8');
const source = file.slice(file.indexOf('  const deleteRequest ='), file.indexOf('  useEffect(() => { loadDocs'));
async function run(a, fail = false) {
  const calls = []; let closed = false;
  await vm.runInNewContext(source + '\ndeleteRequest()', { a, uid: 'owner', busy: false, setBusy: () => {}, t: s => s, toast: () => {}, onClose: () => {closed = true;}, loadDocs: async () => {if (fail) throw Error('offline'); return [{id:'owner__pan'}, {id:'owner__agreement'}];}, bulk: async ops => calls.push(JSON.parse(JSON.stringify(ops))) });
  return {calls, closed};
}
(async () => {
  const deleted = await run({status:'submitted'});
  assert.deepEqual(deleted.calls, [[['del','partnerDocs','owner__pan'],['del','partnerDocs','owner__agreement'],['del','partnerApps','owner']]]);
  assert.equal(deleted.closed, true);
  assert.equal((await run({status:'approved'})).calls.length, 0);
  assert.equal((await run({status:'submitted',restaurantId:'live-shop'})).calls.length, 0);
  const failed = await run({status:'submitted'}, true);
  assert.equal(failed.calls.length, 0); assert.equal(failed.closed, false);
  console.log('PASS: application and attached documents deleted together; linked restaurants and failed lookups protected.');
})().catch(e => { console.error(e); process.exitCode = 1; });

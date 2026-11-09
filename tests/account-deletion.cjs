const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('src/lib/accountDeletion.js','utf8').replace(/export /g,'');
const moduleContext={encodeURIComponent};vm.createContext(moduleContext);
vm.runInContext(source+'\nthis.build=deletionRequest;',moduleContext);
const request=moduleContext.build({phone:'+919000000001',email:'919000000001@login.foodgaon.app'});
assert.equal(request.mobile,'+919000000001');assert.equal(request.email,'');
assert.ok(!request.text.includes('login.foodgaon.app'));
const mail=new URL(request.emailHref);
assert.equal(mail.protocol,'mailto:');assert.equal(mail.pathname,'contact@techgaon.in');
assert.equal(mail.searchParams.get('subject'),'FoodGaon account and data deletion request');
assert.equal(mail.searchParams.get('body'),request.text);
const whats=new URL(request.whatsappHref);assert.equal(whats.origin,'https://wa.me');assert.equal(whats.pathname,'/919129203268');assert.equal(whats.searchParams.get('text'),request.text);
const google=moduleContext.build({email:'reviewer@example.com'});assert.equal(google.email,'reviewer@example.com');assert.ok(google.text.includes('reviewer@example.com'));
const guest=moduleContext.build();assert.ok(guest.text.includes('My registered mobile number or Google email:'));
const injection=moduleContext.build({email:'reviewer@example.com\nbcc:other@example.com',phone:'invalid'});assert.equal(injection.email,'');assert.equal(injection.mobile,'');
const dictContext={};vm.createContext(dictContext);vm.runInContext(fs.readFileSync('src/i18n/dict.js','utf8').replace('export const DICT','const DICT')+'\nthis.rows=DICT;',dictContext);
for(const col of [1,2]){
  const dict=new Map(dictContext.rows.map(row=>[row[0],row[col]]));
  const translated=moduleContext.build({phone:'+919000000001'},s=>dict.get(s)||s);
  assert.ok(translated.text.includes('+919000000001'));
  assert.ok(!translated.text.includes('Please delete my FoodGaon account'));
  assert.ok(translated.text.match(/[\u0900-\u097f]/));
}
console.log('PASS: Central support destinations, encoded message drafts, verified phone/Google identity, guest requests, hidden Firebase aliases, input safety, Hindi and Awadhi request text. No messages sent or data deleted.');

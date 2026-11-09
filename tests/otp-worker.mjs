import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../otp-worker/worker.js',import.meta.url),'utf8');
const {default:worker,OtpState}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const pem='-----BEGIN PRIVATE KEY-----\n'+Buffer.from(await crypto.subtle.exportKey('pkcs8',pair.privateKey)).toString('base64')+'\n-----END PRIVATE KEY-----';
const env={MC_CUSTOMER_ID:'fixture',MC_PASSWORD:'fixture',FB_PROJECT_ID:'fixture',FB_SA_JSON:JSON.stringify({project_id:'fixture',client_email:'test@fixture.iam.gserviceaccount.com',private_key:pem}),REVIEW_PHONE:'9000000001',REVIEW_CODE:'654321',ALLOWED_ORIGINS:'https://techgaon.in',DAILY_SMS_LIMIT:'2'};
const records=new Map();let alarm=null;
const storage={get:async k=>records.get(k),put:async(k,v)=>records.set(k,v),delete:async k=>Array.isArray(k)?k.forEach(x=>records.delete(x)):records.delete(k),getAlarm:async()=>alarm,setAlarm:async a=>{alarm=a;},list:async()=>new Map(records)};
const state=new OtpState({storage},env);
env.OTP_STATE={idFromName:n=>n,get:()=>state};
let sends=0,updates=0,disabled=false,lookupFailure=false;
globalThis.fetch=async(url,opts={})=>{
  url=String(url);
  if(url.includes('/authentication/token'))return Response.json({token:'fixture-mc'});
  if(url.includes('/verification/v3/send')){sends++;return Response.json({data:{verificationId:String(sends)}});}
  if(url.includes('/validateOtp'))return Response.json({data:{verificationStatus:new URL(url).searchParams.get('code')==='111111'?'VERIFICATION_COMPLETED':'FAILED'}});
  if(url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'fixture-google'});
  if(url.endsWith('/accounts:lookup'))return lookupFailure?Response.json({error:'denied'},{status:403}):Response.json({users:[{localId:'existing-uid',disabled}]});
  if(url.endsWith('/accounts:update')){updates++;assert.equal(JSON.parse(opts.body).localId,'existing-uid');return Response.json({localId:'existing-uid'});}
  throw new Error('Unexpected network request');
};
async function post(path,body,origin='https://techgaon.in',ip='fixture-ip'){
  const r=await worker.fetch(new Request('https://otp.example'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,'CF-Connecting-IP':ip},body:JSON.stringify(body)}),env);
  return {status:r.status,data:await r.json().catch(()=>null)};
}
assert.equal((await post('/send',{phone:'123'},'https://evil.example')).status,403);
assert.equal((await post('/send',{phone:'123'})).status,400);
assert.equal(sends,0);
const review=await post('/send',{phone:env.REVIEW_PHONE});
assert.equal(review.data.ok,true);assert.equal(sends,0);
assert.equal((await post('/send',{phone:env.REVIEW_PHONE})).status,429);
assert.equal((await post('/verify',{phone:env.REVIEW_PHONE,vid:review.data.vid,code:'123456'})).status,400);
const duplicate=await Promise.all([1,2].map(()=>post('/verify',{phone:env.REVIEW_PHONE,vid:review.data.vid,code:env.REVIEW_CODE})));
assert.deepEqual(duplicate.map(r=>r.status).sort(),[200,400]);
const token=duplicate.find(r=>r.status===200).data.token;
const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url'));
assert.equal(claims.uid,'existing-uid');assert.equal(claims.claims.fg_phone,'+91'+env.REVIEW_PHONE);assert.equal(updates,1);
assert.equal(await crypto.subtle.verify('RSASSA-PKCS1-v1_5',pair.publicKey,Buffer.from(token.split('.')[2],'base64url'),Buffer.from(token.split('.').slice(0,2).join('.'))),true);
const sms=await post('/send',{phone:'9415333145'});assert.equal(sms.status,200);assert.equal(sends,1);
assert.equal((await post('/verify',{phone:'9415333145',vid:sms.data.vid,code:'000000'})).status,400);
assert.equal((await post('/verify',{phone:'9415333145',vid:sms.data.vid,code:'111111'})).status,200);
assert.equal((await post('/verify',{phone:'9415333145',vid:sms.data.vid,code:'111111'})).status,400);
await post('/send',{phone:'9129203268'});assert.equal(sends,2);
assert.equal((await post('/send',{phone:'9888888888'})).status,429);assert.equal(sends,2);
const daily=[...records].find(([k])=>k.startsWith('daily:'))[1];assert.ok(daily.expires>Date.now()+23*3600000);
// Rate limits persist across object recreation. Expired sessions cannot verify.
records.set('vid:999',{value:'9777777777',expires:Date.now()-1});
assert.equal((await post('/verify',{phone:'9777777777',vid:'999',code:'111111'})).status,400);
// Disabled accounts and failed lookups must never mint tokens or create replacements.
for(const kind of ['disabled','lookup']){
  disabled=kind==='disabled';lookupFailure=kind==='lookup';
  records.set('vid:r123',{value:env.REVIEW_PHONE,expires:Date.now()+60000});
  const r=await post('/verify',{phone:env.REVIEW_PHONE,vid:'r123',code:env.REVIEW_CODE});
  assert.equal(r.status,500);assert.equal(r.data.token,undefined);
}
console.log('OTP security checks passed: no live SMS sent; replay, limits, existing UID, signed phone claims, disabled accounts, expiry and origin checks verified.');

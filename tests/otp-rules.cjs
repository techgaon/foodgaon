const fs=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('../../FoodGaon verification tools/rules-test/node_modules/@firebase/rules-unit-testing');
const {doc,setDoc,getDoc}=require('../../FoodGaon verification tools/rules-test/node_modules/firebase/firestore');
(async()=>{
  const env=await initializeTestEnvironment({projectId:'demo-foodgaon-otp',firestore:{rules:fs.readFileSync('firestore.rules','utf8')}});
  const phone='+919129203268';
  const legacy=env.authenticatedContext('admin-old',{email:'919129203268@login.foodgaon.app',firebase:{sign_in_provider:'password'}}).firestore();
  const custom=env.authenticatedContext('admin-old',{email:'919129203268@login.foodgaon.app',fg_phone:phone,firebase:{sign_in_provider:'custom'}}).firestore();
  const forged=env.authenticatedContext('forged',{email:'919129203268@login.foodgaon.app',fg_phone:phone,firebase:{sign_in_provider:'password'}}).firestore();
  const customer=env.authenticatedContext('customer-old',{email:'919415333145@login.foodgaon.app',firebase:{sign_in_provider:'password'}}).firestore();
  const verifiedCustomer=env.authenticatedContext('customer-old',{email:'919415333145@login.foodgaon.app',fg_phone:'+919415333145',firebase:{sign_in_provider:'custom'}}).firestore();
  const google=env.authenticatedContext('google-user',{email:'customer@example.com',firebase:{sign_in_provider:'google.com'}}).firestore();
  const native=env.authenticatedContext('native-admin',{phone_number:phone,firebase:{sign_in_provider:'phone'}}).firestore();
  try{
    await env.withSecurityRulesDisabled(async c=>{
      await setDoc(doc(c.firestore(),'config/app'),{otpMode:'mock'});
      await setDoc(doc(c.firestore(),'staff/'+phone),{admin:true});
      await setDoc(doc(c.firestore(),'customers/customer-old'),{name:'Fixture'});
    });
    await assertSucceeds(getDoc(doc(legacy,'staff/'+phone)));
    await assertSucceeds(getDoc(doc(customer,'customers/customer-old')));
    await assertSucceeds(setDoc(doc(custom,'config/app'),{otpMode:'real'}));
    await assertFails(getDoc(doc(legacy,'staff/'+phone)));
    await assertFails(getDoc(doc(forged,'staff/'+phone)));
    await assertFails(getDoc(doc(customer,'customers/customer-old')));
    await assertFails(setDoc(doc(legacy,'config/app'),{otpMode:'mock'}));
    await assertSucceeds(getDoc(doc(custom,'staff/'+phone)));
    await assertSucceeds(getDoc(doc(native,'staff/'+phone)));
    await assertSucceeds(getDoc(doc(verifiedCustomer,'customers/customer-old')));
    await assertFails(getDoc(doc(verifiedCustomer,'staff/'+phone)));
    await assertSucceeds(setDoc(doc(google,'customers/google-user'),{name:'Google fixture'}));
    console.log('PASS: Real mode blocks trial password sessions and forged phone claims, preserves verified admin/customer/native/Google access.');
  }finally{await env.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1;});

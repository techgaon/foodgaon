const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
function load(file, lang='en') {
 const code = esbuild.buildSync({entryPoints:[file],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
 const context = {module:{exports:{}},exports:{},localStorage:{getItem:()=>lang},console};
 vm.runInNewContext(code,context); return context.module.exports;
}
const {minimumOrderFor} = load('src/lib/delivery.js');
const rest={minOrder:50,minOrderBands:{near:100,mid:200,far:400}};
for(const [distance, expected] of [[0,100],[4,100],[4.001,200],[8,200],[8.001,400],[20,400],[20.001,50],[null,50],[NaN,50],[-1,50]]) assert.equal(minimumOrderFor(rest,{},distance),expected,`distance ${distance}`);
assert.equal(minimumOrderFor({minOrder:50,minOrderBands:{near:0}},{},2),0);
assert.equal(minimumOrderFor({minOrder:50,minOrderBands:{near:''}},{},2),50);
for (const lang of ['en','hi','awa']) {
 const {t,hi,getLang}=load('src/i18n/index.js',lang); assert.equal(getLang(),lang);
 for(const key of ['Owner Aadhaar card','Complete signed agreement PDF','Minimum order by delivery distance','Choose a restaurant']) {
  if(lang==='en') assert.equal(t(key),key); else assert.notEqual(t(key),key,`${lang}: ${key}`);
 }
 assert.equal(hi('Week'),lang==='en'?'Week':t('Week'));
 assert.equal(t('Use code PARAG20'), 'Use code PARAG20');
}
console.log('PASS: distance boundaries, fallback/zero settings, English/Hindi/Awadhi selection and legacy helper.');
(async () => {
 const result=await esbuild.build({entryPoints:['src/lib/partner.js'],bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'mock-firebase',setup(build){build.onResolve({filter:/\/fb\.js$/},()=>({path:'fb',namespace:'test'}));build.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const put=()=>{},patch=()=>{},getOne=()=>{},getList=()=>{},remove=()=>{},phoneOf=()=>"+910000000000";'}));}}]});
 const context={module:{exports:{}},exports:{},FileReader:class {readAsDataURL(){this.result='data:application/pdf;base64,AA==';this.onload();}}};
 vm.runInNewContext(result.outputFiles[0].text,context);
 const {fileToDoc,FORM_DOCS,SIGN_DOCS,missing,blankApp,applicationData}=context.module.exports;
 assert(FORM_DOCS.some(d=>d.id==='aadhaar'&&d.need));
 assert(!FORM_DOCS.some(d=>d.step==='agreement'));
 assert(!SIGN_DOCS.some(d=>d.id==='agreement4'));
 assert.equal(SIGN_DOCS.length,1);
 assert(SIGN_DOCS.some(d=>d.id==='agreementPdf'&&d.pdfOnly));
 const saved=applicationData({...blankApp({uid:'test'}),note:undefined});
 assert(!Object.prototype.hasOwnProperty.call(saved,'note'),'Screenshot regression: undefined note must never reach setDoc');
 assert.equal(applicationData({note:'',restName:'Kitchen'}).note,'');
 await assert.rejects(()=>fileToDoc({type:'application/pdf',size:651*1024},()=>{}),/650 KB/);
 await assert.rejects(()=>fileToDoc({type:'text/plain',size:10},()=>{}),/photo or a PDF/);
 await assert.rejects(()=>fileToDoc({type:'image/png',name:'scan.png'},async()=> 'x'.repeat(1000000)),/too large/);
 assert((await fileToDoc({type:'application/pdf',name:'signed.pdf',size:10},()=>{})).data.startsWith('data:application/pdf'));
 assert(missing(blankApp({uid:'test'})).includes('Owner Aadhaar number (12 digits)'));
 console.log('PASS: Aadhaar requirements, agreement choices, upload type/size limits and PDF reading.');
})().catch(error=>{console.error(error);process.exitCode=1;});
(async()=>{
 const result=await esbuild.build({stdin:{contents:"export {default as Agreement} from './src/components/PartnerAgreement.jsx'; export {GrowStory, JoinCta, ShareCta} from './src/components/Grow.jsx';",resolveDir:process.cwd(),loader:'jsx'},bundle:true,platform:'node',format:'cjs',external:['react'],write:false,plugins:[{name:'render-isolation',setup(build){
 build.onResolve({filter:/ui\.jsx$/},()=>({path:'ui',namespace:'render'}));
 build.onResolve({filter:/App\.jsx$/},()=>({path:'app',namespace:'render'}));
 build.onResolve({filter:/lib\/fb\.js$|\.\/fb\.js$/},()=>({path:'fb',namespace:'render'}));
 build.onResolve({filter:/lib\/utils\.js$/},()=>({path:'utils',namespace:'render'}));
 build.onResolve({filter:/lib\/native\.js$/},()=>({path:'native',namespace:'render'}));
 build.onLoad({filter:/.*/,namespace:'render'},({path})=>({contents:({ui:'export const Logo=()=>null,Wordmark=()=>null,Icon=()=>null,Sheet=()=>null,useToast=()=>()=>{};',app:'export const useApp=()=>({config:{},user:null});',fb:'export const watchDoc=()=>()=>{},put=()=>{},patch=()=>{},getOne=()=>{},getList=()=>{},remove=()=>{},phoneOf=()=>"";',utils:'export const plain=x=>x||"",fmtDateTime=x=>"date";',native:'export const isNative=false;'})[path]}));
 }}]});
 const React=require('react'); const {renderToStaticMarkup}=require('react-dom/server');
 for(const lang of ['en','hi','awa']){
  const c={module:{exports:{}},exports:{},require,console,localStorage:{getItem:()=>lang}};vm.runInNewContext(result.outputFiles[0].text,c);
  const {Agreement,GrowStory,JoinCta,ShareCta}=c.module.exports;
  const html=renderToStaticMarkup(React.createElement(Agreement,{a:{restName:'Test kitchen'}}));
  if(lang==='en') assert(!/[\u0900-\u097f]/u.test(html),'English agreement must not contain fixed Hindi');
  else assert(html.includes('सरल भाषा'),'Local agreement summary should render');
  for(const Comp of [GrowStory,JoinCta,ShareCta]) {const html=renderToStaticMarkup(React.createElement(Comp,{nav:{go(){}}}));if(lang==='en') assert(!/[\u0900-\u097f]/u.test(html),'English growth/share screens must not contain fixed Hindi');}
 }
 console.log('PASS: agreement and growth/share render in all languages; default English contains no Hindi copy.');
})().catch(error=>{console.error(error);process.exitCode=1;});
const draft = load('src/lib/offerDraft.js');
assert.deepEqual(Array.from(draft.offerCodes({fundedBy:'admin',value:10})),['FOODGAON10','GAON10','FGSAVE10']);
assert.deepEqual(Array.from(draft.offerCodes({fundedBy:'restaurant',value:20,generated:['PARAG20','parag20','bad!','PARAG50']})),['PARAG20','PARAG50']);
assert(/[\u0900-\u097f]/u.test(draft.offerLine('Shuddh shakahari swad','hi',{type:'percent',value:10})));
assert.equal(draft.offerLine('गरमा-गरम खाने पर छूट','hi',{type:'flat',value:50}),'गरमा-गरम खाने पर छूट');
assert.equal(draft.offerTarget({admin:true,restaurantId:'',fundedBy:'restaurant'}).fundedBy,'admin');
assert.equal(draft.offerTarget({admin:false,restaurantId:'parag',fundedBy:'admin'}).fundedBy,'restaurant');
assert.equal(draft.offerTarget({admin:true,restaurantId:'parag',fundedBy:'restaurant'}).restaurantId,'parag');
console.log('PASS: FoodGaon-branded codes, Devanagari fallback, all-restaurant and specific-restaurant funding.');

const delivery=load('src/lib/delivery.js');
const custom={radiusKm:20,minOrder:50,deliverySlabs:[{upToKm:5,minOrder:149},{upToKm:10,minOrder:299},{upToKm:20,minOrder:1000}]};
for(const [d,min] of [[0,149],[5,149],[5.01,299],[10,299],[10.01,1000],[20,1000]]) assert.equal(delivery.minimumOrderFor(custom,{},d),min);
assert(delivery.validSlabs(custom.deliverySlabs,20));
assert(!delivery.validSlabs([{upToKm:5,minOrder:149},{upToKm:4,minOrder:299}],4));
assert(!delivery.validSlabs([{upToKm:5,minOrder:149}],20));
assert(delivery.servesAddress({lat:26.6,lng:81.3,radiusKm:5},{lat:26.6,lng:81.3}));
assert(!delivery.servesAddress({lat:26.6,lng:81.3,radiusKm:5},{lat:28.6,lng:77.2}));
assert(!delivery.servesAddress({radiusKm:5},{lat:26.6,lng:81.3}));
const en=load('src/i18n/index.js','en');
assert.equal(en.tr('Share FoodGaon',0,'hi'),'FoodGaon शेयर करें');
assert.equal(en.tr('Try your own estimate',0,'en'),'Try your own estimate');
console.log('PASS: custom delivery slabs, location coverage and independent Hindi/English sections.');

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
 const {fileToDoc,FORM_DOCS,SIGN_DOCS,missing,blankApp}=context.module.exports;
 assert(FORM_DOCS.some(d=>d.id==='aadhaar'&&d.need));
 assert(!FORM_DOCS.some(d=>d.step==='agreement'));
 assert(!SIGN_DOCS.some(d=>d.id==='agreement4'));
 assert(SIGN_DOCS.some(d=>d.id==='agreementPdf'&&d.pdfOnly));
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

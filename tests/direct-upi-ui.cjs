// Isolated payment UI: no Firebase, no UPI apps, no money movement.
const esbuild = require('esbuild');
const http = require('node:http');
const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const bundle = await esbuild.build({stdin:{contents:`import React from 'react'; import {createRoot} from 'react-dom/client'; import PayDirect from './src/customer/PayDirect.jsx'; import {merchantFor} from './src/lib/directUpi.js'; window.writes=[]; window.done=0; window.reply={ok:true,status:'SUCCESS',txnId:'TX123',approvalRef:'UTR123'}; createRoot(document.getElementById('root')).render(<PayDirect order={{id:'order123',amount:123.50}} merchant={merchantFor({id:'parag'})} onDone={()=>window.done++} onClose={()=>window.closed=true}/>);`,resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,plugins:[{name:'isolate-payments',setup(build){
    build.onResolve({filter:/\/lib\/(fb|native|utils)\.js$/},args=>({path:args.path,namespace:'mock'}));
    build.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path.includes('fb.js') ? `export async function patch(path,id,value){if(window.failSave)throw Error('offline');window.writes.push({path,id,value});}` : args.path.includes('native.js') ? `export const isNative=location.search!=='?web';export async function upiPay(link){window.link=link;return window.reply;}` : `export const rupee=n=>'₹'+n.toFixed(2);`}));
  }}]});
  const server = http.createServer((req,res)=>{res.setHeader('Content-Type',req.url.startsWith('/test.js')?'text/javascript':'text/html; charset=utf-8');res.end(req.url.startsWith('/test.js')?bundle.outputFiles[0].text:'<meta charset="utf-8"><div id="root"></div><script src="/test.js"></script>');});
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
  const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const base=`http://127.0.0.1:${server.address().port}`;
    const open=async(suffix='')=>{await page.goto(base+'/'+suffix);await page.getByRole('button',{name:'UPI ऐप चुनें और भुगतान करें'}).waitFor();};
    await open(); await page.getByRole('button',{name:'UPI ऐप चुनें और भुगतान करें'}).click(); await page.getByText('ऑर्डर भेज दिया गया').waitFor();
    let writes=await page.evaluate(()=>window.writes); assert.equal(writes.length,1); assert.equal(writes[0].value.upiRef,'UTR123'); assert.equal(writes[0].value.status,'placed'); assert(!('paid' in writes[0].value));
    assert.equal(new URL(await page.evaluate(()=>window.link)).searchParams.get('am'),'123.50');
    for(const status of ['CANCELLED','FAILURE','SUBMITTED','NOAPP','UNKNOWN']) {
      await open();await page.evaluate(s=>window.reply={status:s,ok:s!=='NOAPP'},status);await page.getByRole('button',{name:'UPI ऐप चुनें और भुगतान करें'}).click();await page.getByRole('button',{name:'मैंने भुगतान किया — ऑर्डर भेजें'}).waitFor();assert.equal(await page.evaluate(()=>window.writes.length),0,status+' must not auto-submit');
    }
    await open('?web');await page.evaluate(()=>window.reply={status:'WEB',ok:true});await page.getByRole('button',{name:'UPI ऐप चुनें और भुगतान करें'}).click();await page.getByRole('button',{name:'मैंने भुगतान किया — ऑर्डर भेजें'}).waitFor();assert.equal(await page.evaluate(()=>window.writes.length),0);
    await page.evaluate(()=>window.failSave=true);await page.getByRole('button',{name:'मैंने भुगतान किया — ऑर्डर भेजें'}).click();await page.getByText('ऑर्डर भेजा नहीं गया। इंटरनेट जाँचकर दोबारा पुष्टि करें।').waitFor();
    await page.evaluate(()=>window.failSave=false);await page.getByRole('textbox',{name:'UTR'}).fill('WEBUTR123');await page.getByRole('button',{name:'मैंने भुगतान किया — ऑर्डर भेजें'}).dblclick();await page.getByText('ऑर्डर भेज दिया गया').waitFor();writes=await page.evaluate(()=>window.writes);assert.equal(writes.length,1);assert.equal(writes[0].value.upiRef,'WEBUTR123');
    console.log('PASS: native SUCCESS, five non-success returns, web one-tap confirmation, offline retry and duplicate-submit prevention; no real payments.');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

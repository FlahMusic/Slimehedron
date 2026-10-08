// ============================================================================================
//  HEAD-TO-HEAD BENCH — measures the things that can actually be measured, on the LIVE sites.
//  Not opinion: bytes over the wire, requests, time to interactive, third-party calls, console
//  errors, offline survival, touch-target compliance. Run: node dev-bench.js
// ============================================================================================
const {chromium}=require('playwright');
const TARGETS=[
  ['Slimehedron',      'https://flahmusic.github.io/Slimehedron/'],
  ['CML Song Maker',   'https://musiclab.chromeexperiments.com/Song-Maker/'],
  ['CML Rhythm',       'https://musiclab.chromeexperiments.com/Rhythm/'],
  ['CML Melody Maker', 'https://musiclab.chromeexperiments.com/Melody-Maker/'],
  ['Groove Pizza',     'https://apps.musedlab.org/groovepizza/'],
  ['Blob Opera',       'https://artsandculture.google.com/experiment/blob-opera/AAHWrq360NcGbw'],
];
const fmt=n=>n>=1048576?(n/1048576).toFixed(2)+' MB':(n/1024).toFixed(0)+' KB';

(async()=>{
 // this container reaches the internet only through the agent proxy, and Chromium does not read the
 // env vars the way curl does — it has to be told, and told to trust the proxy's CA.
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
   proxy:{server:process.env.HTTPS_PROXY||'http://127.0.0.1:33605'},
   args:['--autoplay-policy=no-user-gesture-required','--ignore-certificate-errors']});
 const rows=[];
 for(const [name,url] of TARGETS){
  const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,
    userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
  const p=await ctx.newPage();
  let bytes=0,reqs=0,thirdParty=new Set(),errs=[],failed=0;
  const host=new URL(url).host;
  p.on('request',r=>{reqs++;try{const h=new URL(r.url()).host;if(h&&h!==host)thirdParty.add(h);}catch(e){}});
  p.on('response',async r=>{try{const h=r.headers()['content-length'];if(h)bytes+=+h;}catch(e){}});
  p.on('requestfailed',()=>failed++);
  p.on('pageerror',e=>errs.push(e.message.slice(0,70)));
  p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,60));});
  const t0=Date.now();
  let ok=true,tti=null,dcl=null;
  try{
    await p.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
    dcl=Date.now()-t0;
    await p.waitForLoadState('load',{timeout:45000}).catch(()=>{});
    tti=Date.now()-t0;
    await p.waitForTimeout(3500);
  }catch(e){ok=false;errs.push('LOAD FAIL: '+e.message.slice(0,60));}
  // transferred size is more honest than content-length sums
  let transferred=null;
  try{transferred=await p.evaluate(()=>performance.getEntriesByType('resource')
      .reduce((a,r)=>a+(r.transferSize||0),0)+(performance.getEntriesByType('navigation')[0]?.transferSize||0));}catch(e){}
  // does it register a service worker (i.e. will it work on a school wifi that drops)?
  let sw=false;try{sw=await p.evaluate(async()=>{
    if(!navigator.serviceWorker)return false;
    const r=await navigator.serviceWorker.getRegistrations();return r.length>0;});}catch(e){}
  // touch targets on the first screen
  let small=null,total=null;
  try{const t=await p.evaluate(()=>{
    let n=0,bad=0;
    document.querySelectorAll('button,[role="button"],a[href],input,select,label').forEach(e=>{
      const c=getComputedStyle(e);if(c.display==='none'||c.visibility==='hidden'||c.pointerEvents==='none')return;
      const r=e.getBoundingClientRect();
      if(r.width<1||r.height<1||r.bottom<0||r.top>innerHeight)return;
      n++;if(Math.min(r.width,r.height)<44)bad++;});
    return {n,bad};});small=t.bad;total=t.n;}catch(e){}
  rows.push({name,ok,dcl,tti,reqs,transferred,thirdParty:[...thirdParty],sw,small,total,
             errs:[...new Set(errs)].slice(0,3),failed});
  await ctx.close();
 }
 await b.close();

 const pad=(s,n)=>String(s==null?'—':s).padEnd(n);
 console.log('\n'+pad('PRODUCT',18)+pad('LOAD',8)+pad('REQS',6)+pad('WEIGHT',10)+pad('3RD-PARTY',11)+pad('OFFLINE',9)+pad('TAPS<44px',11)+'ERRORS');
 console.log('-'.repeat(96));
 for(const r of rows){
   console.log(pad(r.name,18)
     +pad(r.tti!=null?r.tti+'ms':'FAIL',8)
     +pad(r.reqs,6)
     +pad(r.transferred?fmt(r.transferred):'—',10)
     +pad(r.thirdParty.length,11)
     +pad(r.sw?'yes':'no',9)
     +pad(r.small!=null?r.small+'/'+r.total:'—',11)
     +(r.errs.length?r.errs.length:'0'));
 }
 console.log('\n--- third-party hosts contacted (privacy: every one of these sees the child) ---');
 for(const r of rows)console.log('  '+pad(r.name,18)+(r.thirdParty.length?r.thirdParty.join(', '):'NONE'));
 console.log('\n--- errors ---');
 for(const r of rows)if(r.errs.length)console.log('  '+r.name+': '+r.errs.join(' | '));
})();

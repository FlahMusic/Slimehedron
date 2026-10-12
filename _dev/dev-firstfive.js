// ============================================================================================
//  THE FIRST FIVE SECONDS, MEASURED.
//  Not "does it load" - what a person actually experiences: when the first pixel lands, when the
//  biggest thing lands, how long the main thread is blocked before they can touch anything, how
//  long their first tap takes to make a sound, and whether the frame rate holds once it is running.
//  Baseline it, change the engine, run it again. Numbers, not vibes.
//  Run: node _dev/dev-firstfive.js   (needs: python3 -m http.server 8765)
// ============================================================================================
const {launch}=require('./browser');
const SIZES=[{n:'desktop 1440',w:1440,h:900,touch:false,cpu:1},
             {n:'phone 390 (4x slower cpu)',w:390,h:844,touch:true,cpu:4}];
(async()=>{
 const b=await launch();
 for(const s of SIZES){
  const ctx=await b.newContext({viewport:{width:s.w,height:s.h},hasTouch:s.touch,isMobile:s.touch,deviceScaleFactor:s.touch?2:1});
  const p=await ctx.newPage();
  const cdp=await ctx.newCDPSession(p);
  if(s.cpu>1)await cdp.send('Emulation.setCPUThrottlingRate',{rate:s.cpu});
  await p.addInitScript(()=>{
    window.__lt=[];window.__loaf=[];
    try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__lt.push(Math.round(e.duration));})
      .observe({type:'longtask',buffered:true});}catch(e){}
    try{new PerformanceObserver(l=>{for(const e of l.getEntries())
      window.__loaf.push({d:Math.round(e.duration),block:Math.round(e.blockingDuration||0)});})
      .observe({type:'long-animation-frame',buffered:true});}catch(e){}
    window.__lcp=0;
    try{new PerformanceObserver(l=>{const es=l.getEntries();window.__lcp=Math.round(es[es.length-1].startTime);
      window.__lcpEl=(es[es.length-1].element&&es[es.length-1].element.tagName)||'';})
      .observe({type:'largest-contentful-paint',buffered:true});}catch(e){}
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak:()=>{},cancel:()=>{},getVoices:()=>[]}});
    try{localStorage.setItem('slimehedron-coach','1');}catch(e){}
  });
  await p.goto('http://127.0.0.1:8765/index.html',{waitUntil:'load'});
  await p.waitForTimeout(3200);
  const paint=await p.evaluate(()=>{
    const fcp=performance.getEntriesByName('first-contentful-paint')[0];
    const nav=performance.getEntriesByType('navigation')[0]||{};
    return {fcp:fcp?Math.round(fcp.startTime):null,lcp:window.__lcp,lcpEl:window.__lcpEl,
      dcl:Math.round(nav.domContentLoadedEventEnd||0),load:Math.round(nav.loadEventEnd||0),
      bytes:performance.getEntriesByType('resource').reduce((a,r)=>a+(r.transferSize||0),0),
      res:performance.getEntriesByType('resource').map(r=>({n:r.name.split('/').pop(),t:Math.round(r.responseEnd),kb:Math.round((r.transferSize||0)/1024)})).sort((a,b)=>b.kb-a.kb).slice(0,6),
      lt:window.__lt.slice(),loaf:window.__loaf.slice()};
  });
  console.log('\n=== '+s.n+' ===');
  console.log('  first paint        '+paint.fcp+'ms');
  console.log('  largest paint      '+paint.lcp+'ms  ('+(paint.lcpEl||'?')+')');
  console.log('  DOM ready / load   '+paint.dcl+'ms / '+paint.load+'ms');
  console.log('  bytes over wire    '+Math.round(paint.bytes/1024)+'KB   heaviest: '+paint.res.map(r=>r.n+' '+r.kb+'KB').join(', '));
  console.log('  long tasks (>50ms) '+(paint.lt.length?paint.lt.join(', ')+'ms':'none')+'   total '+paint.lt.reduce((a,x)=>a+x,0)+'ms');
  const blk=paint.loaf.filter(f=>f.block>0);
  console.log('  blocking frames    '+(blk.length?blk.map(f=>f.d+'ms/'+f.block+'blk').slice(0,8).join(', '):'none'));

  // --- the tap: splash -> play, then one tap on the tank, measured to first audible sample ---
  await p.evaluate(()=>{window.__t=[];});
  const t0=Date.now();
  if(s.touch)await p.tap('.modeCard[data-m="play"]'); else await p.click('.modeCard[data-m="play"]');
  await p.waitForFunction(()=>document.body.classList.contains('mode-play'),null,{timeout:8000});
  const toPlay=Date.now()-t0;
  await p.waitForTimeout(900);
  const hooked=await p.evaluate(()=>{
    if(typeof AC==='undefined'||!AC||typeof master==='undefined'||!master)return false;
    const an=AC.createAnalyser();an.fftSize=1024;master.connect(an);
    const buf=new Float32Array(an.fftSize);window.__first=null;
    (function poll(){an.getFloatTimeDomainData(buf);let m=0;for(const v of buf)m=Math.max(m,Math.abs(v));
      if(m>0.01&&window.__first==null)window.__first=performance.now();
      requestAnimationFrame(poll);})();return true;});
  const box=await p.evaluate(()=>{const c=document.getElementById('cv').getBoundingClientRect();
    return {x:Math.round(c.left+c.width/2),y:Math.round(c.top+c.height*0.38)};});
  await p.evaluate(()=>{window.__first=null;window.__tap=performance.now();});
  if(s.touch)await p.touchscreen.tap(box.x,box.y); else await p.mouse.click(box.x,box.y);
  await p.waitForTimeout(400);
  const tap=await p.evaluate(()=>window.__first==null?null:Math.round(window.__first-window.__tap));
  console.log('  splash -> play     '+toPlay+'ms'+(hooked?'':'  (no audio graph!)'));
  console.log('  tap -> first sound '+(tap==null?'NEVER':tap+'ms'));

  // --- frame rate while it is actually running ---
  await p.waitForTimeout(1500);
  const fps=await p.evaluate(()=>new Promise(res=>{
    const ts=[];let n=0;const t=(now)=>{ts.push(now);if(++n<90)requestAnimationFrame(t);else{
      const d=[];for(let i=1;i<ts.length;i++)d.push(ts[i]-ts[i-1]);
      d.sort((a,b)=>a-b);
      res({median:+d[d.length>>1].toFixed(1),p95:+d[Math.floor(d.length*0.95)].toFixed(1),worst:+d[d.length-1].toFixed(1)});}};
    requestAnimationFrame(t);}));
  console.log('  frame gap med/p95  '+fps.median+'ms / '+fps.p95+'ms  (worst '+fps.worst+'ms)');
  const balls=await p.evaluate(()=>typeof balls!=='undefined'?balls.length:-1);
  console.log('  balls in the tank  '+balls);
  await ctx.close();
 }
 await b.close();
})();

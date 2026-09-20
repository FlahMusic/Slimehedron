// ============================================================================================
//  ENTRY TEST — the front door and the ways into it.
//    1. DEEP LINK: ?m=<mode> and ?l=<lessonId> open that screen with no other interaction. This is
//       the only route a teacher has to put one URL on the board for a whole class.
//    2. CARRY ON: a returner with finished lessons is offered the next one by name; a first-timer
//       is NOT (there is nothing to carry on with, and "start here" already says it).
//    3. The chip is ADDITIVE ONLY — no streak counter, no "don't lose", no day count, nothing that
//       can be taken away. Radesky et al. (JAMA Netw Open 2022) found 98.8% of 3-5-year-olds' apps
//       carry at least one manipulative pattern; this test is what keeps us out of that number.
//    4. TIME TO FIRST SOUND, measured off the audio graph, not a flag.
//  Needs a local server: python3 -m http.server 8765
//  Run: node dev-entry.js
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const U='http://127.0.0.1:8765/index.html';

(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
 const open=async(q,seed)=>{const ctx=await b.newContext({viewport:{width:393,height:852},hasTouch:true,isMobile:true});
   const p=await ctx.newPage();
   if(seed)await p.addInitScript(s=>{try{localStorage.setItem('slimehedron-learn2',s);localStorage.setItem('slimehedron-coach','1');}catch(e){}},seed);
   else await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');}catch(e){}});
   await p.goto(U+(q||''));await p.waitForTimeout(1500);return{ctx,p};};

 // ---- 1. DEEP LINKS ----
 for(const [q,mode] of [['?m=play','play'],['?m=studio','studio'],['?m=learn','learn']]){
   const {ctx,p}=await open(q);
   const r=await p.evaluate(()=>({mode:S.mode,splash:!!document.getElementById('splash')}));
   ok(r.mode===mode&&!r.splash,`[${q}] opens ${mode} with no tap (mode=${r.mode}, splash gone=${!r.splash})`);
   await ctx.close();}
 {const {ctx,p}=await open('?l=majorscale');
  await p.waitForTimeout(1400);
  const r=await p.evaluate(()=>({mode:S.mode,scale:S.scale,lab:document.body.classList.contains('lab-on'),
    stage:!!document.querySelector('.lgStage'),
    title:(document.querySelector('.lgTop h3')||{}).textContent||''}));
  ok(r.mode==='learn'&&r.lab&&r.stage,'[?l=majorscale] lands INSIDE the lesson, not on the menu');
  ok(r.scale==='major','[?l=majorscale] and the instrument is on that lesson\'s scale ('+r.scale+')');
  ok(/major/i.test(r.title),'[?l=majorscale] and the right lesson opened ("'+r.title+'")');
  await ctx.close();}
 {const {ctx,p}=await open('?l=notarealunit');
  const r=await p.evaluate(()=>({mode:S.mode,lab:document.body.classList.contains('lab-on')}));
  ok(r.mode==='learn'&&!r.lab,'a bogus lesson id falls back to the lesson list instead of breaking');
  await ctx.close();}

 // ---- 2. CARRY ON ----
 {const {ctx,p}=await open('');
  const r=await p.evaluate(()=>!!document.getElementById('spCarry'));
  ok(!r,'a first-time visitor is NOT offered "carry on" (nothing to carry on with)');
  await ctx.close();}
 {const seed=JSON.stringify({pulse:{hits:10,tries:10,at:Date.now()},sayplay:{hits:10,tries:10,at:Date.now()}});
  const {ctx,p}=await open('',seed);
  const r=await p.evaluate(()=>{const c=document.getElementById('spCarry');
    return c?{txt:c.textContent.trim(),u:c.dataset.u,h:Math.round(c.getBoundingClientRect().height)}:null;});
  ok(!!r,'a returner IS offered "carry on"');
  if(r){
    ok(/^carry on/.test(r.txt)&&/3\./.test(r.txt),'and it names the next lesson by number ("'+r.txt+'")');
    ok(r.u==='high','pointing at the right unit ('+r.u+')');
    ok(r.h>=44,'the chip is a 44px target ('+r.h+'px)');
    // the ethics guard: nothing loss-framed anywhere on the front door
    const bad=await p.evaluate(()=>{const t=(document.getElementById('splash')||document.body).innerText.toLowerCase();
      return ['streak','don\'t lose','dont lose','lose your','keep your streak','day streak','lives','hearts','energy','coins','gems','xp','league']
        .filter(w=>t.includes(w));});
    ok(bad.length===0,'the front door has no loss-framed or currency mechanic'+(bad.length?': '+bad.join(', '):''));
    // and tapping it goes straight into that lesson
    await p.tap('#spCarry');await p.waitForTimeout(1600);
    const g=await p.evaluate(()=>({mode:S.mode,lab:document.body.classList.contains('lab-on')}));
    ok(g.mode==='learn'&&g.lab,'tapping it opens that lesson directly');}
  await ctx.close();}

 // ---- 3. THE SPLASH ITSELF FITS ----
 // .spCredit carried an unconditional left:210px/right:210px so the two bottom corners could sit
 // beside it. On a 393px phone that is a NEGATIVE content width, and the line stacked one word per
 // line down the middle of the front door. Nothing caught it because the sweep skips the splash.
 for(const [tag,w,h] of [['phone',393,852],['small phone',375,667],['tiny',320,568],['desktop',1440,900],['landscape',852,393]]){
   const {ctx,p}=await open('');
   await p.setViewportSize({width:w,height:h});await p.waitForTimeout(400);
   const r=await p.evaluate(()=>{
     const g=(sel)=>{const e=document.querySelector(sel);if(!e)return null;
       const q=e.getBoundingClientRect();const fs=parseFloat(getComputedStyle(e).fontSize);
       return {w:Math.round(q.width),h:Math.round(q.height),lines:Math.round(q.height/(fs*1.7)),
               left:Math.round(q.left),right:Math.round(q.right)};};
     const hit=(a,b)=>a&&b&&a.left<b.right&&a.right>b.left;
     const cr=g('.spCredit'),cb=g('#cbdBox'),cards=g('#modeCards');
     return {credit:cr,cbd:cb,cards,overlap:hit(cr,cb),vw:innerWidth,
       off:cr?(cr.left<0||cr.right>innerWidth+1):false};});
   ok(!!r.credit,'['+tag+'] the credit line exists');
   if(r.credit){
     ok(r.credit.w>60,'['+tag+'] the credit line has a usable width ('+r.credit.w+'px of '+r.vw+')');
     ok(r.credit.lines<=2,'['+tag+'] and it fits on at most 2 lines (~'+r.credit.lines+')');
     ok(!r.off,'['+tag+'] and stays on screen');}
   await ctx.close();}

 // ---- 4. TIME TO FIRST SOUND (off the audio graph) ----
 for(const mode of ['play','studio']){
   const {ctx,p}=await open('?m='+mode);
   const hooked=await p.evaluate(()=>{if(typeof AC==='undefined'||!AC||typeof master==='undefined'||!master)return false;
     const an=AC.createAnalyser();an.fftSize=1024;master.connect(an);
     const buf=new Float32Array(an.fftSize);window.__first=null;const t0=performance.now();
     (function poll(){an.getFloatTimeDomainData(buf);let m=0;for(const v of buf)m=Math.max(m,Math.abs(v));
       if(m>0.01&&window.__first==null)window.__first=Math.round(performance.now()-t0);
       requestAnimationFrame(poll);})();return true;});
   ok(hooked,'['+mode+'] the audio graph is reachable to measure');
   await p.waitForTimeout(2500);
   const f=await p.evaluate(()=>window.__first);
   ok(f!==null&&f<2000,'['+mode+'] makes sound on its own, with nothing touched ('+(f===null?'silent':f+'ms')+')');
   await ctx.close();}

 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'the front door works: deep links, carry-on, sound on arrival'));
 process.exit(FAIL.length?1:0);})();

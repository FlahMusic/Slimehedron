const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
 const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message)});
 await p.goto('file://'+process.cwd()+'/index.html');await p.waitForTimeout(600);
 await p.click('.modeCard[data-m="learn"]');await p.waitForTimeout(1200);
 await p.click('[data-a2="unit"][data-u="echo"]');await p.waitForTimeout(2200);
 // instrument the game: capture every phrase it generates, confirm all notes are reachable
 const res=await p.evaluate(async()=>{
   const pool=new Set(LAB._playable||[]);
   const bad=[];let seen=0;
   const origFlash=window._labKeyFlash;
   const asked=[];
   window._labKeyFlash=function(d,ms){asked.push(d);return origFlash.apply(this,arguments);};
   for(let i=0;i<25;i++){window._lab_ecNext();await new Promise(r=>setTimeout(r,120));}
   window._labKeyFlash=origFlash;
   for(const d of asked){seen++;if(!pool.has(d))bad.push(d);}
   return {seen,bad:[...new Set(bad)],pool:[...pool]};});
 ok(res.seen>0,'echo generated '+res.seen+' demo notes');
 ok(res.bad.length===0,'every note the game asks for is on a key'+(res.bad.length?': unreachable '+res.bad.join(','):''));
 // and now actually PLAY a phrase back correctly via key taps, confirming the game advances
 const win=await p.evaluate(async()=>{
   window._lab_ecNext();await new Promise(r=>setTimeout(r,1800));
   // read the phrase the game is holding by replaying and capturing
   const asked=[];const of_=window._labKeyFlash;
   window._labKeyFlash=function(d,ms){asked.push(d);return of_.apply(this,arguments);};
   window._lab_ecReplay();await new Promise(r=>setTimeout(r,2200));
   window._labKeyFlash=of_;
   const phrase=asked.slice();
   let fed=0;const prev=LAB._hit;
   // press the right walls in order
   for(const d of phrase){LAB.strikeDeg(d);fed++;await new Promise(r=>setTimeout(r,180));}
   const txt=(document.querySelector('.labFeed')||{}).textContent||'';
   return {phrase,fed,feedback:txt};});
 ok(win.phrase.length>0,'captured the phrase ('+win.phrase.join(' ')+')');
 // Match against the LIVE praise list rather than a hardcoded copy of it. This assertion used to spell
 // out the old strings, so rewriting the feedback as process praise broke a test about echo playback —
 // a test failing for a reason that has nothing to do with what it is testing.
 const praiseList=await p.evaluate(()=>(window.LEARN2&&window.LEARN2.LANG.en.yes)||[]);
 ok(praiseList.length>0&&praiseList.some(x=>win.feedback&&win.feedback.indexOf(x)>=0),
   'playing it back correctly is recognised ("'+win.feedback+'")');
 ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'echo game is actually playable'));
 await b.close();process.exit(FAIL.length?1:0);})();

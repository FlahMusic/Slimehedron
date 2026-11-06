// ============================================================================================
//  GOVERNOR TEST — run hard, stay cool (spec 2026-11-06-many-walls, ticket 02).
//    1. the skip rule: on a fast screen (8.3 ms frames) a busy frame with no new tick is skipped, never two in a
//       row; a 60 Hz screen, a light frame or a frame with a tick is always drawn
//    2. at 60 Hz nothing is ever skipped (headless runs at 60)
//    3. heavy frames (14 ms of work each): the pixel ratio cap steps down to 1 within ~4 s
//    4. light again: it steps back up (one level within ~7 s), and not before the work has been low for a while
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-governor.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html';

(async()=>{const b=await launch();
 const ctx=await b.newContext({viewport:{width:1100,height:900}});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message);});
 await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1')}catch(e){}});
 await p.goto(URL+'?m=studio&view=3d&space=normal');await p.waitForTimeout(1500);

 // ---- 1. the rule ----
 const r=await p.evaluate(()=>{const B=1000/60;
   return {fastBusy:govSkip(8.3,B*0.7,false,0),fastBusyTick:govSkip(8.3,B*0.7,false,1),twice:govSkip(8.3,B*0.7,true,0),
     slowBusy:govSkip(16.7,B*0.9,false,0),fastLight:govSkip(8.3,B*0.3,false,0)};});
 ok(r.fastBusy,'120 Hz, a busy frame with no new tick: skipped');
 ok(!r.fastBusyTick&&!r.twice,'but never a frame with a new tick, and never two in a row');
 ok(!r.slowBusy&&!r.fastLight,'a 60 Hz screen or a light frame: always drawn');

 // ---- 2. 60 Hz: nothing skipped ----
 const s=await p.evaluate(async()=>{S.slimeMode=false;balls.length=0;for(let i=0;i<8;i++)spawn(CX+Math.cos(i)*60,CY+Math.sin(i)*60);setPlaying(true);
   const k0=__gov.skipped,d0=__gov.drawn;await new Promise(r=>setTimeout(r,3000));return {skipped:__gov.skipped-k0,drawn:__gov.drawn-d0,dt:__gov.dt,lvl:__gov.lvl};});
 ok(s.skipped===0&&s.drawn>60,'3 s at '+(1000/s.dt).toFixed(0)+' Hz: '+s.drawn+' frames drawn, '+s.skipped+' skipped');
 ok(s.lvl===0,'light frames keep the full pixel ratio (level '+s.lvl+')');
 // (headless Chrome only runs at 60 Hz, so the skip on a real 120 Hz screen is checked by the rule above, not end to end)

 // ---- 3. heavy frames step the pixel ratio down ----
 const down=await p.evaluate(async()=>{const d0=draw;window.__heavy=true;
   draw=function(){const t=performance.now();while(window.__heavy&&performance.now()-t<14){}return d0.apply(this,arguments);};
   const steps=[],k0=__gov.skipped;const t0=performance.now();
   while(performance.now()-t0<6000){await new Promise(r=>setTimeout(r,250));if(steps[steps.length-1]!==window.__dprCap)steps.push(window.__dprCap);if(window.__dprCap===1)break;}
   return {steps,ms:Math.round(performance.now()-t0),work:__gov.work,skipped:__gov.skipped-k0};});
 ok(down.steps[down.steps.length-1]===1,'14 ms of work a frame: the pixel ratio cap steps '+down.steps.join(' -> ')+' in '+down.ms+' ms');
 ok(down.ms<=5000,'and gets to 1 within 5 s');
 ok(down.skipped===0,'a 60 Hz screen never skips a frame, busy or not ('+down.skipped+' skipped)');

 // ---- 4. light again: back up, but not at once ----
 const up=await p.evaluate(async()=>{window.__heavy=false;const t0=performance.now(),seen=[];
   while(performance.now()-t0<8000){await new Promise(r=>setTimeout(r,250));seen.push([Math.round(performance.now()-t0),window.__dprCap]);}
   const firstUp=seen.find(x=>x[1]>1);return {firstUp:firstUp?firstUp[0]:null,end:window.__dprCap};});
 ok(up.firstUp!=null&&up.firstUp>=3000,'light again: it steps back up after '+up.firstUp+' ms (not before 3 s of light frames)');
 ok(up.end>1,'and is above 1 after 8 s (cap '+up.end+')');

 ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
 await b.close();
 console.log(FAIL.length?'\n'+FAIL.length+' FAILED':'\nALL PASS');process.exit(FAIL.length?1:0);})();

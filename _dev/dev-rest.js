// ============================================================================================
//  RESTS — silence has to be worth something, or it is decoration.
//  Two runs of the same lesson:
//    1. play the notes, stay silent on the rests  -> must FINISH
//    2. play on everything, rests included        -> must NOT finish
//  If run 2 also finishes, the rest glyph is a picture and the lesson teaches nothing.
//  Needs a local server: python3 -m http.server 8765
//  Run: node dev-rest.js
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});

// ---- the notation itself ----
{const ctx=await b.newContext({viewport:{width:393,height:852},hasTouch:true,isMobile:true});
 const p=await ctx.newPage();
 await p.goto('http://127.0.0.1:8765/index.html?l=rest');
 await p.waitForTimeout(2600);
 const r=await p.evaluate(()=>{
   const cells=[...document.querySelectorAll('.lgCell')];
   const rests=cells.filter(c=>c.classList.contains('rest'));
   const bigUnderRest=rests.reduce((a,c)=>a+[...c.querySelectorAll('u')].filter(u=>!u.classList.contains('small')).length,0);
   const drawn=rests.filter(c=>c.querySelector('svg')).length;
   const counts=cells.reduce((a,c)=>a+c.querySelectorAll('u').length,0);
   return {cells:cells.length,rests:rests.length,bigUnderRest,drawn,counts,
           sig:!!document.querySelector('.lgSig')};});
 ok(r.cells>=2,'[rest] a bar of notation is on screen ('+r.cells+' cells)');
 ok(r.rests>=1,'[rest] and at least one of them is a rest ('+r.rests+')');
 ok(r.drawn===r.rests,'[rest] every rest is DRAWN, not left blank ('+r.drawn+'/'+r.rests+')');
 ok(r.bigUnderRest===0,'[rest] no count under a rest is big — you count it, you do not play it');
 ok(r.counts%4===0,'[rest] the counts still add up to whole measures ('+r.counts+')');
 ok(r.sig,'[rest] the time signature is on screen');
 await ctx.close();}

// ---- does silence actually count? ----
const run=async(tapRests)=>{
  const ctx=await b.newContext({viewport:{width:393,height:852},hasTouch:true,isMobile:true});
  const p=await ctx.newPage();
  await p.goto('http://127.0.0.1:8765/index.html?l=rest');
  await p.waitForTimeout(2200);
  for(let i=0;i<700;i++){
    if(await p.evaluate(()=>!!document.querySelector('.lgDone')))break;
    const r=await p.evaluate(()=>{
      if(typeof AC==='undefined'||!AC||window._labReadAt==null)return null;
      const c=[...document.querySelectorAll('.lgCell')][window._labReadIdx];
      return {wait:(window._labReadAt-AC.currentTime)*1000,rest:!!(c&&c.classList.contains('rest'))};});
    if(!r){await p.waitForTimeout(80);continue;}
    if(r.wait>0)await p.waitForTimeout(Math.min(700,r.wait));
    if(tapRests||!r.rest)await p.evaluate(()=>window._lab_tap&&window._lab_tap());
    await p.waitForTimeout(90);
  }
  const done=await p.evaluate(()=>!!document.querySelector('.lgDone'));
  await ctx.close();return done;};

ok(await run(false),'[rest] playing the notes and resting on the rests FINISHES the lesson');
ok(!(await run(true)),'[rest] playing straight through the rests does NOT finish it — the silence is the lesson');

console.log(FAIL.length?('\n'+FAIL.length+' FAILURE(S)'):'\nsilence is notated, counted, and required');
await b.close();process.exit(FAIL.length?1:0);})();

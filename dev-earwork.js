// ============================================================================================
//  THE TWO THINGS THAT MADE THIS EAR TRAINING INSTEAD OF SLOT MEMORY.
//  Both were measured failures before this pass, and both are silent failures — the app looked and
//  behaved perfectly while teaching the wrong skill. So they get a suite of their own.
//
//  1. THE KEY MOVES. Measured: "The Major Pentatonic" sounded FIVE distinct pitches across sixty
//     answered rounds, every session, forever. The root was pinned for the whole visit, so a child
//     could clear every melodic lesson by remembering which slot, never comparing two sounds.
//     It is RAMPED: lessons 1-9 hold still on purpose (a beginner needs an anchor), lessons 10+ move.
//
//  2. COLOUR MEANS A NOTE. Measured: #a6c8ff meant "high", "so", "mi", "re" AND "me" depending which
//     screen you opened. A free channel wired to noise, actively teaching the wrong association.
//
//  Needs a local server: python3 -m http.server 8765
//  Run: node dev-earwork.js
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};

const HOLD_STILL=['high','notes','home','steps'];        // lessons 6-9: one key, on purpose
const MUST_MOVE =['newhome','majorscale','minorscale','modes'];  // 10+: the key roams

const pitches=async(b,id,rounds)=>{
  const ctx=await b.newContext({viewport:{width:393,height:852},hasTouch:true,isMobile:true});
  const p=await ctx.newPage();
  await p.addInitScript(()=>{window.__f=[];
    const h=setInterval(()=>{ if(typeof playNote==='function'&&!window.__hk){ window.__hk=1;
      const o=window.playNote;
      window.playNote=function(f,v,d){window.__f.push(Math.round(f));return o.apply(this,arguments);};
      clearInterval(h);} },25);});
  await p.goto('http://127.0.0.1:8765/index.html?l='+id);
  await p.waitForTimeout(2000);
  for(let i=0;i<rounds;i++){
    const d=await p.evaluate(()=>window._labHintDeg);
    if(d!=null)await p.evaluate(dd=>{const r=document.querySelector('.lgRung[data-deg="'+dd+'"]');
      if(r)r.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));},d);
    await p.waitForTimeout(230);
  }
  const f=await p.evaluate(()=>window.__f.slice());
  await ctx.close();
  return [...new Set(f)];};

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});

// ---- 1. the ramp ----
for(const id of HOLD_STILL){
  const u=await pitches(b,id,45);
  ok(u.length<=8,'['+id+'] holds one key while the child is still finding their feet ('+u.length+' pitches)');
}
for(const id of MUST_MOVE){
  // Counting distinct pitches is scale-size dependent (a 5-note lesson can never reach a 7-note
  // lesson's totals), so ask the lesson directly which key it is in, question by question.
  const ctx=await b.newContext({viewport:{width:393,height:852},hasTouch:true,isMobile:true});
  const p=await ctx.newPage();
  await p.goto('http://127.0.0.1:8765/index.html?l='+id);
  await p.waitForTimeout(2000);
  const keys=new Set();
  for(let i=0;i<24;i++){
    const k=await p.evaluate(()=>window._labRoam&&window._labRoam());
    if(k!=null)keys.add(k);
    const d=await p.evaluate(()=>window._labHintDeg);
    if(d!=null)await p.evaluate(dd=>{const r=document.querySelector('.lgRung[data-deg="'+dd+'"]');
      if(r)r.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));},d);
    await p.waitForTimeout(240);
  }
  await ctx.close();
  ok(keys.size>=3,'['+id+'] the key MOVES between questions — the answer cannot be a screen position ('
    +keys.size+' different keys in 24 asks)');
}

// ---- 2. colour ----
// A tint may cover two names that are the SAME scale degree. It may not cover two different ones.
// One family per scale degree. A degree keeps its hue whether it is natural or lowered (mi and me are
// both the third), and the first pitch lesson labels its two rungs "low"/"high" before solfege is
// introduced, so those belong to their degree's family too.
const FAMILY=[['do','low'],['ra','re'],['me','mi'],['fa','fi'],['so'],['le','la','high'],['te','ti']];
const famOf=(n)=>FAMILY.findIndex(f=>f.indexOf(n)>=0);
const kin=(a,b2)=>{const x=famOf(a);return x>=0&&x===famOf(b2);};
const seen={};
for(const id of ['high','notes','home','steps','newhome','majorscale','minorscale','modes','echo','findhome','review']){
  const ctx=await b.newContext({viewport:{width:393,height:852},hasTouch:true,isMobile:true});
  const p=await ctx.newPage();
  await p.goto('http://127.0.0.1:8765/index.html?l='+id);
  await p.waitForTimeout(2400);
  const rows=await p.evaluate(()=>[...document.querySelectorAll('.lgRung')].map(r=>({
    name:((r.querySelector('.rgName')||{}).textContent||'?').trim(),
    tint:r.style.getPropertyValue('--rc').trim()})));
  rows.forEach(r=>{(seen[r.tint]=seen[r.tint]||new Set()).add(r.name);});
  await ctx.close();
}
let clash=[];
for(const tint of Object.keys(seen)){
  const names=[...seen[tint]];
  for(let i=0;i<names.length;i++)for(let j=i+1;j<names.length;j++)
    if(!kin(names[i],names[j]))clash.push(tint+': '+names[i]+' vs '+names[j]);
}
ok(Object.keys(seen).length>0,'rung colours were readable at all ('+Object.keys(seen).length+' tints in use)');
ok(clash.length===0,'every colour means one scale degree, in every lesson'+(clash.length?' — '+clash.join(' | '):''));

// ---- 3. and a roaming lesson still hands the child a reference, or the question is unanswerable ----
{const ctx=await b.newContext({viewport:{width:393,height:852},hasTouch:true,isMobile:true});
 const p=await ctx.newPage();
 await p.addInitScript(()=>{window.__n=0;
   const h=setInterval(()=>{ if(typeof playNote==='function'&&!window.__hk){ window.__hk=1;
     const o=window.playNote;
     window.playNote=function(){window.__n++;return o.apply(this,arguments);};clearInterval(h);} },25);});
 await p.goto('http://127.0.0.1:8765/index.html?l=majorscale');
 await p.waitForTimeout(3400);
 const n=await p.evaluate(()=>window.__n);
 ok(n>=2,'a roaming lesson sounds the tonic before the question — one bare pitch has no answer ('+n+' notes per ask)');
 await ctx.close();}

console.log(FAIL.length?('\n'+FAIL.length+' FAILURE(S)'):'\nthe ear is doing the work, not the memory of a screen');
await b.close();process.exit(FAIL.length?1:0);})();

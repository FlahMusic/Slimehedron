// ============================================================================================
//  THE IS-IT-ANSWERABLE GATE.
//  "The Tonic" shipped as a coin flip: it asked which of two notes finished a phrase, then played a
//  phrase that was chosen WITHOUT REFERENCE TO THE ANSWER. Tapping the same rung every time scored
//  8/14 — chance — and no suite noticed, because the lesson ran, ended, and spoke correctly. The
//  only thing wrong with it was that the information needed to answer was never emitted.
//  So: for every listening lesson, record (target -> the set of pitches actually sounded) over many
//  rounds. If the audio is statistically independent of the target, the lesson cannot be answered by
//  ear and it FAILS, no matter how healthy it looks.
//  Run: node dev-answerable.js   (needs python3 -m http.server 8765)
// ============================================================================================
const {launch}=require('./browser');   // one place decides where Chromium is - see _dev/browser.js
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
// The explore screen comes first now (Orff stage two): a lesson opens with its notes playable and
// nothing scored, and the child presses "ask me questions" when they are ready. A driver has to do
// the same thing a child does. Pressing it when it is not there is a no-op, so this is safe to call
// after opening any unit.
const askQuestions=async(page)=>{
  try{await page.evaluate(()=>{ if(window._lab_ready)window._lab_ready(); });}catch(e){}
  // WAIT FOR THE QUESTION, not for a guessed number of milliseconds. A roaming lesson sounds the
  // tonic first and only plays the question ~820ms later, so a fixed short wait read the screen
  // mid-anchor and made a working lesson look like it had asked an unanswerable one-note question.
  for(let i=0;i<40;i++){
    // Poll ONLY for a real question. An earlier version also broke out when the ready button had
    // gone, which is true the instant the gate opens - so it read the screen 344ms before the
    // anchored question actually sounded and a working lesson looked like it asked a one-note
    // question with no answer.
    const asked=await page.evaluate(()=>{
      try{ return window._labHintDeg!=null||window._labExpect!=null; }catch(e){return false;}
    }).catch(()=>false);
    if(asked)break;
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(900);   // a roaming lesson sounds the tonic, THEN the question 820ms later
};

const SPY=()=>{
  {let id=1;const cbs=new Map();
   window.requestAnimationFrame=function(fn){const i=id++;cbs.set(i,fn);
     setTimeout(()=>{if(cbs.has(i)){cbs.delete(i);try{fn(performance.now());}catch(e){}}},16);return i;};
   window.cancelAnimationFrame=function(i){cbs.delete(i);};}
  window.__f=[];
  const h=setInterval(()=>{ if(typeof playSynth==='function'&&!window.__hk){ window.__hk=1;
    const o=window.playSynth;
    window.playSynth=function(f){window.__f.push(Math.round(f));return o.apply(this,arguments);};
    clearInterval(h);} },20);
};
// lessons whose answer is a note/choice the child must HEAR
const EAR=[
  {id:'home',     rounds:26},
  {id:'findhome', rounds:26},
  {id:'high',     rounds:24},
  {id:'notes',    rounds:24},
  {id:'steps',    rounds:24},
  {id:'majorscale',rounds:24},
  {id:'minorscale',rounds:24},
  {id:'staff',    rounds:24},
];
(async()=>{
const b=await launch();
const ctx=await b.newContext({viewport:{width:1100,height:860}});
await ctx.addInitScript(SPY);
for(const L of EAR){
  const p=await ctx.newPage();
  await p.goto('http://127.0.0.1:8765/index.html?l='+L.id);
  await p.waitForTimeout(2600);await askQuestions(p);
  const data=await p.evaluate(async(rounds)=>{
    const seen=[];
    for(let k=0;k<rounds;k++){
      window.__f=[];
      await new Promise(r=>setTimeout(r,1500));          // let the phrase finish
      const tgt=window._labHintDeg;
      seen.push({t:tgt,f:window.__f.slice().join(',')});   // order preserved: a melody is a sequence
      // answer correctly so it moves on
      const rung=(tgt!=null)&&document.querySelector('.lgRung[data-deg="'+tgt+'"]');
      const hitr=(tgt!=null)&&document.querySelector('.stHit[data-st="'+tgt+'"]');
      const ch=(window._labExpect!=null)&&document.querySelector('[data-ch="'+window._labExpect+'"]');
      const el=rung||hitr||ch;
      if(el)el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
      await new Promise(r=>setTimeout(r,420));
    }
    return seen;},L.rounds);
  await p.close();

  const rows=data.filter(d=>d.t!=null&&d.f.length);
  const byTarget={};
  rows.forEach(r=>{(byTarget[r.t]=byTarget[r.t]||new Set()).add(r.f);});
  const targets=Object.keys(byTarget);
  // the test: is any sounded pattern shared between two DIFFERENT targets? If the same audio can
  // mean two different right answers, the child is guessing.
  const all={};
  rows.forEach(r=>{(all[r.f]=all[r.f]||new Set()).add(String(r.t));});
  const ambiguous=Object.entries(all).filter(([f,ts])=>ts.size>1);
  const shared=ambiguous.length, total=Object.keys(all).length;
  const pct=total?Math.round(shared/total*100):0;
  ok(targets.length>=2,'['+L.id+'] asks for more than one answer ('+targets.length+' distinct targets over '+rows.length+' rounds)');
  ok(shared===0,'['+L.id+'] the sound always tells you which answer it is'+
     (shared?' — '+shared+'/'+total+' ('+pct+'%) of phrases mean MORE THAN ONE answer':''));
  if(shared)console.log('        e.g. "'+ambiguous[0][0].slice(0,46)+'" means targets '+[...ambiguous[0][1]].join(' and '));
}
await b.close();
console.log(FAIL.length?'\n'+FAIL.length+' FAILURE(S) — a lesson cannot be answered by ear':'\nevery listening lesson emits the information needed to answer it');
process.exit(FAIL.length?1:0);})();

// ============================================================================================
//  IMPROVISE: THE STAGE THAT WAS MISSING
//  Orff runs imitate -> explore -> improvise -> compose. This curriculum had the first, the second
//  (added alongside), nothing, and then the fourth. 'Your Turn' is the third: the app plays a bit,
//  the child answers with ANYTHING. The whole point is that nothing is checked, so that is exactly
//  what this proves - no target, no score, no wrong, and playing a note still counts as learned.
//  Run: node _dev/dev-jam.js   (needs: python3 -m http.server 8765)
// ============================================================================================
const {launch}=require('./browser');   // one place decides where Chromium is - see _dev/browser.js
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};

(async()=>{
 const b=await launch();
 const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
 await p.addInitScript(()=>{Object.defineProperty(window,'speechSynthesis',{configurable:true,
   value:{speak:()=>{},cancel:()=>{},getVoices:()=>[]}});});
 await p.goto('http://127.0.0.1:8765/index.html?l=jam');
 await p.waitForTimeout(3000);

 const st=await p.evaluate(()=>({
   rungs:document.querySelectorAll('.lgRung').length,
   dots:document.querySelectorAll('.lgDots i').length,
   count:(document.querySelector('.lgCount')||{}).textContent||'',
   target:window._labHintDeg,
   say:(document.querySelector('.lgSay')||{}).textContent||''}));
 ok(st.rungs===5,'the pentatonic is on screen — five notes, no wrong one ('+st.rungs+')');
 ok(st.dots===0,'no progress dots: this is not a drill');
 ok(!/\d+\s*\/\s*\d+/.test(st.count),'no score out of anything ("'+st.count.trim()+'")');
 ok(st.target==null,'there is NO target note to find');

 // wait for the call to finish and the child's turn to come round
 for(let i=0;i<40;i++){const t=await p.evaluate(()=>window._labJam?window._labJam().mine:true);
   if(t===false)break; await p.waitForTimeout(250);}
 const turn=await p.evaluate(()=>window._labJam());
 ok(turn.mine===false,'the app plays first, then hands over (round '+turn.rounds+')');
 const say2=await p.evaluate(()=>(document.querySelector('.lgSay')||{}).textContent||'');
 console.log('        it says: "'+say2.trim()+'"');
 ok(/your turn/i.test(say2),'and it says so in words');

 // ---- play a deliberately "wrong-sounding" scatter. none of it may be marked wrong ----
 const before=await p.evaluate(()=>{try{return JSON.parse(localStorage.getItem('slimehedron-learn2')||'{}');}catch(e){return{};}});
 await p.evaluate(async()=>{
   const rs=[...document.querySelectorAll('.lgRung')];
   const order=[4,0,4,0,3,1,4,2];
   for(const i of order){rs[i%rs.length].dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
     await new Promise(r=>setTimeout(r,90));}
 });
 await p.waitForTimeout(400);
 const marks=await p.evaluate(()=>({
   wrong:document.querySelectorAll('.lgRung.wrong').length,
   right:document.querySelectorAll('.lgRung.right').length,
   feed:(document.getElementById('lgFeed')||{}).textContent||'',
   count:(document.querySelector('.lgCount')||{}).textContent||''}));
 ok(marks.wrong===0,'eight scattered notes and NOT ONE is marked wrong');
 ok(marks.right===0,'and none is marked right either — nothing is being judged');
 ok(!/not yet|try again|nope/i.test(marks.feed),'nothing scolds them ("'+marks.feed.trim()+'")');
 ok(/8/.test(marks.count),'it just counts what they played ("'+marks.count.trim()+'")');

 const after=await p.evaluate(()=>{try{return JSON.parse(localStorage.getItem('slimehedron-learn2')||'{}');}catch(e){return{};}});
 const j=after.jam||{};
 ok(!!after.jam,'playing counts as having done it');
 ok((j.hits||0)===(j.tries||0),'with no wrong answers on the record ('+(j.hits||0)+'/'+(j.tries||0)+')');
 ok(!before.jam,'and it was not already marked before they played');

 // ---- the child decides when it is over ----
 const hasDone=await p.evaluate(()=>!!document.querySelector('[data-jam="done"]'));
 ok(hasDone,'there is a way out the child presses themselves');
 await p.evaluate(()=>document.querySelector('[data-jam="done"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})));
 await p.waitForTimeout(700);
 ok(await p.evaluate(()=>!!document.querySelector('.lgDone')),'and pressing it reaches an ending');

 await b.close();
 console.log(FAIL.length?('\n'+FAIL.length+' FAILED:\n'+FAIL.map(f=>'  - '+f).join('\n')):'\nnothing a child plays here can be wrong');
 process.exit(FAIL.length?1:0);
})();

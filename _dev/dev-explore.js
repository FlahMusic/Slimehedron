// ============================================================================================
//  ORFF STAGE TWO: THE CHILD PLAYS BEFORE ANYONE ASKS
//  Every big approach to teaching children music runs imitate -> explore -> improvise -> compose.
//  This curriculum did the first one twenty-three times and never the rest. A lesson now opens with
//  its notes playable, nothing scored, and a button the CHILD presses when they want questions.
//  This proves: no question fires before they ask, playing a note while exploring scores nothing,
//  the gate actually opens, and the lesson still finishes afterwards.
//  Run: node _dev/dev-explore.js   (needs: python3 -m http.server 8765)
// ============================================================================================
const {launch}=require('./browser');   // one place decides where Chromium is - see _dev/browser.js
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};

(async()=>{
 const b=await launch();
 const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
 await p.addInitScript(()=>{Object.defineProperty(window,'speechSynthesis',{configurable:true,
   value:{speak:()=>{},cancel:()=>{},getVoices:()=>[]}});});
 await p.goto('http://127.0.0.1:8765/index.html?l=notes');
 await p.waitForTimeout(2600);

 // ---- 1. it opens in explore, with no question and no score furniture -------------------
 const st=await p.evaluate(()=>({
   exploring:window._lab_exploring?window._lab_exploring():null,
   target:window._labHintDeg,
   rungs:document.querySelectorAll('.lgRung').length,
   ready:!!document.querySelector('[data-lg="ready"]'),
   dots:document.querySelectorAll('.lgDots i').length,
   count:(document.querySelector('.lgCount')||{}).textContent||'',
   say:(document.querySelector('.lgSay')||{}).textContent||''}));
 ok(st.exploring===true,'the lesson opens in explore, not in a quiz');
 // NOT >=5. 'notes' is a lesson that GROWS - two rungs, then three, then five, as the child gets
 // them - so phase zero legitimately shows two. Asserting five here failed on correct behaviour.
 ok(st.rungs>=2,'the notes are on screen and playable ('+st.rungs+' rungs at the opening phase)');
 ok(st.ready,'there is a button the child presses to ask for questions');
 ok(st.dots===0,'no progress dots while exploring');
 ok(st.count.trim()==='','no score in the header while exploring (saw "'+st.count.trim()+'")');
 console.log('        it says: "'+st.say.trim()+'"');
 ok(/play them/i.test(st.say),'and it invites them to play');

 // ---- 2. playing every note while exploring must score NOTHING --------------------------
 const before=await p.evaluate(()=>{try{return JSON.parse(localStorage.getItem('slimehedron-learn2')||'{}');}catch(e){return{};}});
 await p.evaluate(()=>[...document.querySelectorAll('.lgRung')]
   .forEach(r=>r.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))));
 await p.waitForTimeout(400);
 const after=await p.evaluate(()=>{try{return JSON.parse(localStorage.getItem('slimehedron-learn2')||'{}');}catch(e){return{};}});
 const tries=(o)=>((o.notes||{}).tries)||0;
 ok(tries(after)===tries(before),'playing all five notes while exploring is scored as nothing ('+tries(before)+' -> '+tries(after)+' tries)');
 const stillExploring=await p.evaluate(()=>window._lab_exploring&&window._lab_exploring());
 ok(stillExploring===true,'and it does not kick them into the quiz for touching a note');

 // ---- 3. the gate opens when the child asks ---------------------------------------------
 await p.evaluate(()=>{const r=document.querySelector('[data-lg="ready"]');
   if(r)r.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));});
 await p.waitForTimeout(1400);
 const q=await p.evaluate(()=>({exploring:window._lab_exploring?window._lab_exploring():null,
   target:window._labHintDeg,dots:document.querySelectorAll('.lgDots i').length,
   count:(document.querySelector('.lgCount')||{}).textContent||''}));
 ok(q.exploring===false,'pressing it leaves explore');
 ok(q.target!=null,'and a real question arrives (target degree '+q.target+')');
 ok(q.dots>0,'the progress dots come back ('+q.dots+')');
 ok(/\d+\s*\/\s*\d+/.test(q.count),'and the score with them ("'+q.count.trim()+'")');

 // ---- 4. it still finishes ---------------------------------------------------------------
 const done=()=>p.evaluate(()=>!!document.querySelector('.lgDone'));
 for(let i=0;i<60&&!(await done());i++){
   await p.evaluate(()=>{const d=window._labHintDeg;
     const r=[...document.querySelectorAll('.lgRung')].find(x=>+x.dataset.deg===d);
     if(r)r.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));});
   await p.waitForTimeout(880);}
 ok(await done(),'and the lesson still reaches its ending after exploring');

 await b.close();
 console.log(FAIL.length?('\n'+FAIL.length+' FAILED:\n'+FAIL.map(f=>'  - '+f).join('\n')):'\nthe child plays first, then the questions come');
 process.exit(FAIL.length?1:0);
})();

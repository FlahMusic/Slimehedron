// ============================================================================================
//  REVIEW ASKS THE QUESTION THE LESSON ASKED  +  A PLAYED NOTE IS AN ANSWER
//  Two things that were wrong for as long as learn mode has existed:
//   * review ran EVERYTHING on the pitch ladder, so a rhythm, staff or note-length lesson came
//     back as "find the note" -- the one question none of them taught.
//   * a child with a keyboard could hear the question, play the note back, and have it count for
//     nothing. The only input that is actually musical was the only one that did not work.
//  Run: node _dev/dev-review.js   (needs: python3 -m http.server 8765)
// ============================================================================================
const {launch}=require('./browser');   // one place decides where Chromium is - see _dev/browser.js
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const askQuestions=async(page)=>{
  try{await page.evaluate(()=>{if(window._lab_ready)window._lab_ready();});}catch(e){}
  for(let i=0;i<40;i++){
    const r=await page.evaluate(()=>{try{
      if(window._lab_exploring&&window._lab_exploring())return false;
      return window._labHintDeg!=null||window._labExpect!=null;}catch(e){return true;}}).catch(()=>true);
    if(r)break; await page.waitForTimeout(60);}
  await page.waitForTimeout(900);
};

(async()=>{
 const b=await launch();
 const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
 await p.addInitScript(()=>{Object.defineProperty(window,'speechSynthesis',{configurable:true,
   value:{speak:()=>{},cancel:()=>{},getVoices:()=>[]}});});

 // Seed a finished RHYTHM lesson and a finished PITCH lesson, both learned two days ago, so both
 // are due. Before the fix, review offered one ladder for both.
 await p.addInitScript(()=>{
   const old=Date.now()-2*86400000;
   const rec=()=>({at:old,tries:8,hits:8});
   localStorage.setItem('slimehedron-learn2',JSON.stringify({howlong:rec(),notes:rec(),staff:rec()}));
 });
 await p.goto('http://127.0.0.1:8765/index.html');await p.waitForTimeout(500);
 await p.click('.modeCard[data-m="learn"]');await p.waitForTimeout(1300);

 // ---- 1. review offers the actual lessons, not one merged ladder -------------------------
 await p.click('.uCard[data-u="review"]');await p.waitForTimeout(900);
 const shelf=await p.evaluate(()=>({
   due:(window._labDue||[]).slice(),
   cards:[...document.querySelectorAll('.uCard')].map(c=>c.dataset.u),
   rungs:document.querySelectorAll('.lgRung').length}));
 ok(shelf.due.length>=3,'three lessons are due ('+shelf.due.join(', ')+')');
 ok(shelf.rungs===0,'review does NOT open a pitch ladder (found '+shelf.rungs+' rungs)');
 ok(shelf.cards.includes('howlong'),'the note-length lesson is offered by name');
 ok(shelf.cards.includes('staff'),'the staff lesson is offered by name');

 // ---- 2. the rhythm lesson comes back AS A RHYTHM QUESTION -------------------------------
 await p.click('.uCard[data-u="howlong"]');await p.waitForTimeout(1600);
 const rq=await p.evaluate(()=>({
   cnt:document.querySelectorAll('[data-cnt]').length,     // the note-length answer buttons
   rungs:document.querySelectorAll('.lgRung').length,
   title:(document.querySelector('.lgTop h3')||{}).textContent||''}));
 ok(rq.cnt>0,'reviewing a note-length lesson asks about note length ('+rq.cnt+' duration buttons)');
 ok(rq.rungs===0,'and NOT by making the child find a pitch on a ladder');
 console.log('        screen title: "'+rq.title.trim()+'"');

 // ---- 3. a played note answers a pitch lesson -------------------------------------------
 await p.goto('http://127.0.0.1:8765/index.html?l=notes');await p.waitForTimeout(2600);
 await askQuestions(p);
 const armed=await p.evaluate(()=>window._labHintDeg);
 ok(armed!=null,'a pitch question is on screen (target '+armed+')');
 const res=await p.evaluate(()=>{
   // play the RIGHT note the way a keyboard would: straight through playNote(), no screen tap
   const d=window._labHintDeg;
   const before=(document.querySelector('.lgCount')||{}).textContent||'';
   let cents=null; try{cents=centsForDegree(d);}catch(e){}
   if(cents==null)return{err:'no cents for degree'};
   const midi=Math.round(S.root+cents/100);
   playNote(midi,100);
   return {before,midi,cents};
 });
 await p.waitForTimeout(500);
 const afterCount=await p.evaluate(()=>(document.querySelector('.lgCount')||{}).textContent||'');
 ok(!res.err,'the test could reach the keyboard door ('+(res.err||'playNote')+')');
 console.log('        played MIDI '+res.midi+' for degree '+armed+': "'+(res.before||'').trim()+'" -> "'+afterCount.trim()+'"');
 const num=(s)=>parseInt((s||'0'),10)||0;
 ok(num(afterCount)===num(res.before)+1,'playing the right note on a keyboard SCORES, same as a tap');

 // ---- 4. and a wrong played note is marked wrong, not ignored ----------------------------
 await p.waitForTimeout(1200);
 const wrong=await p.evaluate(()=>{
   const d=window._labHintDeg;
   const rungs=[...document.querySelectorAll('.lgRung')].map(r=>+r.dataset.deg).filter(x=>x!==d);
   if(!rungs.length)return{skip:true};
   const before=(document.querySelector('.lgCount')||{}).textContent||'';
   let cents=null; try{cents=centsForDegree(rungs[0]);}catch(e){}
   playNote(Math.round(S.root+cents/100),100);
   return {before,deg:rungs[0]};
 });
 await p.waitForTimeout(450);
 const afterW=await p.evaluate(()=>(document.querySelector('.lgCount')||{}).textContent||'');
 if(wrong.skip) ok(true,'(only one rung on screen, nothing to get wrong)');
 else ok(num(afterW)===num(wrong.before),'playing a WRONG note does not score ('+num(wrong.before)+' -> '+num(afterW)+')');

 // ---- 5. outside a lesson a played note must not be swallowed ----------------------------
 await p.goto('http://127.0.0.1:8765/index.html?m=play');await p.waitForTimeout(900);
 await p.mouse.click(195,420);await p.waitForTimeout(400);
 const free=await p.evaluate(()=>{try{return window.LEARN2&&LEARN2.noteIn?LEARN2.noteIn(0):'nohook';}catch(e){return 'threw';}});
 ok(free===false,'in play mode a played note answers nothing and is just a note (noteIn -> '+free+')');

 await b.close();
 console.log(FAIL.length?('\n'+FAIL.length+' FAILED:\n'+FAIL.map(f=>'  - '+f).join('\n')):'\nreview asks the right question, and a keyboard can answer it');
 process.exit(FAIL.length?1:0);
})();

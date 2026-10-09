// ============================================================================================
//  ONE ANSWER PER QUESTION
//  `busy` only went true when a lesson ENDED. Until then every tap ran the full scoring path, so a
//  child could tap 1, 2, 3, 4 and one of them had to be right — brute force, filed as mastery.
//  This proves the opposite of "it runs": it proves a SECOND tap on the same question earns nothing,
//  and that locking the question did not deadlock the lesson.
//  Run: node dev-oneanswer.js
// ============================================================================================
const {chromium}=require('playwright');
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


(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
 const ctx=await b.newContext({viewport:{width:1280,height:860}});const p=await ctx.newPage();
 await p.addInitScript(()=>{Object.defineProperty(window,'speechSynthesis',{configurable:true,
   value:{speak:()=>{},cancel:()=>{},getVoices:()=>[]}});});
 await p.goto('file://'+process.cwd()+'/index.html');await p.waitForTimeout(400);
 await p.click('.modeCard[data-m="learn"]');await p.waitForTimeout(1200);
 const home=async()=>{await p.evaluate(()=>window.LEARN2.home());await p.waitForTimeout(500);};
 const open=async(id)=>{await p.click(`.uCard[data-u="${id}"]`);await p.waitForTimeout(1100);await askQuestions(p);await askQuestions(p);};
 const count=()=>p.evaluate(()=>{const c=document.querySelector('.lgCount');
   return c?(parseInt(c.textContent,10)||0):0;});
 const doneUp=()=>p.evaluate(()=>!!document.querySelector('.lgDone'));

 // ---- 1. THE LADDER: brute-forcing one question must earn nothing --------------------------
 // Tap EVERY rung on a single question, in one burst, with the correct one included. Before the
 // fix the correct one scored and the counter moved. After it, the first tap is the answer.
 await home();await open('steps');
 const before=await count();
 const rungs=await p.evaluate(()=>document.querySelectorAll('.lgRung').length);
 ok(rungs>=3,'the ladder lesson is on screen ('+rungs+' rungs)');
 await p.evaluate(()=>{const target=window._labHintDeg;
   const all=[...document.querySelectorAll('.lgRung')];
   // deliberately put a WRONG rung first, then the right one: the classic brute force
   const wrong=all.filter(r=>+r.dataset.deg!==target), right=all.filter(r=>+r.dataset.deg===target);
   [...wrong,...right].forEach(r=>r.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})));});
 await p.waitForTimeout(260);
 const after=await count();
 ok(after===before,'tapping every rung on one question earns nothing ('+before+' -> '+after+', brute force is worth 0)');

 // ---- 2. and the lesson still FINISHES when answered one tap at a time ---------------------
 await home();await open('steps');
 for(let i=0;i<60&&!(await doneUp());i++){
   await p.evaluate(()=>{const d=window._labHintDeg;
     const r=[...document.querySelectorAll('.lgRung')].find(x=>+x.dataset.deg===d);
     if(r)r.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));});
   await p.waitForTimeout(900);}
 ok(await doneUp(),'answering one tap at a time still reaches the "you did it" card (no deadlock)');

 // ---- 3. THE TWO-BUTTON SCREEN: same rule -------------------------------------------------
 await home();await open('updown');
 const cBefore=await count();
 await p.evaluate(()=>{const want=String(window._labExpect);
   const all=[...document.querySelectorAll('[data-ch]')];
   const wrong=all.filter(x=>x.dataset.ch!==want), right=all.filter(x=>x.dataset.ch===want);
   [...wrong,...right].forEach(x=>x.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})));});
 await p.waitForTimeout(260);
 const cAfter=await count();
 ok(cAfter===cBefore,'pressing both buttons on one question earns nothing ('+cBefore+' -> '+cAfter+')');

 await p.waitForTimeout(1400);
 await home();await open('updown');
 for(let i=0;i<70&&!(await doneUp());i++){
   await p.evaluate(()=>{const w=String(window._labExpect);
     const btn=document.querySelector('[data-ch="'+w+'"]');
     if(btn)btn.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));});
   await p.waitForTimeout(900);}
 ok(await doneUp(),'the two-button lesson still finishes one answer at a time');

 await b.close();
 console.log(FAIL.length?('\n'+FAIL.length+' FAILED:\n'+FAIL.map(f=>'  - '+f).join('\n')):'\nall good');
 process.exit(FAIL.length?1:0);
})();

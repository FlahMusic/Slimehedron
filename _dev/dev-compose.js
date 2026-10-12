// ============================================================================================
//  WRITE A TUNE  —  Orff's fourth stage, and the half of reading the app never taught
//  Reading block asked the child to read. It never asked them to WRITE. The claim this makes is
//  the only claim that matters about notation: what you put on the page is what comes back out,
//  and it comes back out the same way twice. So this does not check that the handler ran — it
//  records the pitches and compares them to the notes that were written down.
//  Run: node _dev/dev-compose.js   (needs: python3 -m http.server 8765)
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m)};
// C major on the staff, in semitones from middle C. The test must NOT assume a root frequency:
// it compares INTERVALS, which is the only thing that has to be right.
const SEMI=[0,2,4,5,7,9,11,12];
const steps=(freqs)=>freqs.map(f=>Math.round(12*Math.log2(f/freqs[0])));

(async()=>{
 const b=await launch();
 const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
 await p.addInitScript(()=>{
   Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak:()=>{},cancel:()=>{},getVoices:()=>[]}});
   window.__notes=[];
   const h=setInterval(()=>{if(typeof playSynth==='function'&&!window.__hk){window.__hk=1;
     const o=window.playSynth;
     window.playSynth=function(f){window.__notes.push({t:Date.now(),f:f});return o.apply(this,arguments);};
     clearInterval(h);}},20);});
 await p.goto('http://127.0.0.1:8765/index.html?l=compose');
 await p.waitForTimeout(2400);

 const st=await p.evaluate(()=>({
   holes:document.querySelectorAll('.cmpHole').length,
   next:document.querySelectorAll('.cmpHole.next').length,
   keys:[...document.querySelectorAll('.stKey')].map(e=>e.textContent),
   notes:document.querySelectorAll('.stNote').length,
   keep:!!document.querySelector('[data-cmp2="keep"]'),
   say:(document.querySelector('.lgSay')||{}).textContent||''}));
 ok(st.holes===6,'six empty places to write in ('+st.holes+')');
 ok(st.next===1,'and exactly one of them is marked as the next one');
 ok(st.keys.join('')==='CDEFGABC','the letter keys are the staff, laid on its side ('+st.keys.join(' ')+')');
 ok(st.notes===0,'nothing is written yet');
 ok(!st.keep,'and there is nothing to keep yet');
 console.log('        it says: "'+st.say.trim()+'"');

 // ---- writing a note puts it on the staff AND sounds it ----
 const TUNE=[0,2,4,7];                 // C E G C' -- do mi so do
 const heard=[];
 for(const stp of TUNE){
   await p.evaluate(()=>window.__notes=[]);
   await p.evaluate(s=>window._lab_cmpTap(s),stp);
   await p.waitForTimeout(260);
   const f=await p.evaluate(()=>window.__notes.map(x=>x.f));
   heard.push(f[0]||0);
 }
 const slots=await p.evaluate(()=>window._labCompose().slots);
 ok(slots.join(',')===TUNE.join(','),'the four notes landed in the order they were written ('+slots.join(',')+')');
 ok(await p.evaluate(()=>document.querySelectorAll('.stNote').length)===4,'and four note heads are on the staff');
 ok(heard.every(f=>f>0),'each one sounded as it was written');
 const wrote=steps(heard), want=TUNE.map(s=>SEMI[s]-SEMI[TUNE[0]]);
 ok(wrote.join(',')===want.join(','),'and at the right pitch: wrote '+wrote.join(',')+' semitones, wanted '+want.join(','));

 // ---- hear it: the tune plays back, in order, one note at a time ----
 const playback=async()=>{
   await p.evaluate(()=>window.__notes=[]);
   await p.evaluate(()=>window._lab_cmpBtn('hear'));
   await p.waitForTimeout(TUNE.length*460+700);
   return p.evaluate(()=>window.__notes.map(x=>x.f));
 };
 const back1=await playback();
 ok(back1.length===TUNE.length,'hear it plays back exactly what was written, no more ('+back1.length+' notes)');
 ok(steps(back1).join(',')===want.join(','),'in the right order and at the right pitches ('+steps(back1).join(',')+')');
 // THE WHOLE POINT OF NOTATION: press it again and get the same tune. This is the one assertion
 // that separates composing from improvising, so it is asserted, not assumed.
 const back2=await playback();
 ok(back2.length===back1.length&&steps(back2).join(',')===steps(back1).join(','),
    'and pressing it again gives the SAME tune — which is what writing it down is for');

 // ---- the bar does not overflow, and nothing scolds you ----
 for(const s of [1,3,5]) await p.evaluate(x=>window._lab_cmpTap(x),s);
 await p.waitForTimeout(200);
 await p.evaluate(()=>window._lab_cmpTap(6));       // a seventh note into six places
 await p.waitForTimeout(200);
 const full=await p.evaluate(()=>({n:window._labCompose().slots.length,
   wrong:document.querySelectorAll('.wrong,.no,.miss').length}));
 ok(full.n===6,'a seventh note into six places is ignored, not squeezed in ('+full.n+')');
 ok(full.wrong===0,'and nothing is marked wrong for trying');

 // ---- take one off ----
 await p.evaluate(()=>window._lab_cmpBtn('undo'));
 await p.waitForTimeout(200);
 ok(await p.evaluate(()=>window._labCompose().slots.length)===5,'"take one off" takes the last one off');

 // ---- keeping it ----
 const before=await p.evaluate(()=>{try{return JSON.parse(localStorage.getItem('slimehedron-learn2')||'{}').compose||null;}catch(e){return null;}});
 ok(!before||!before.at,'the lesson is not marked done before anything is kept');
 await p.evaluate(()=>window._lab_cmpBtn('keep'));
 await p.waitForTimeout(5*460+1400);
 const kept=await p.evaluate(()=>({k:window._labCompose().kept,n:window._labCompose().slots.length,
   rec:(()=>{try{return JSON.parse(localStorage.getItem('slimehedron-learn2')||'{}').compose||null;}catch(e){return null;}})()}));
 ok(kept.k===1,'keeping it counts one tune kept');
 ok(kept.n===0,'and the staff clears for the next one');
 ok(kept.rec&&kept.rec.at>0,'writing one tune down IS the lesson learned');
 ok(kept.rec&&(kept.rec.hits||0)===(kept.rec.tries||0),
    'and not one wrong answer is on the record ('+((kept.rec||{}).hits||0)+'/'+((kept.rec||{}).tries||0)+')');

 // ---- a one-note "tune" is not a tune, and saying so is not a scolding ----
 await p.evaluate(()=>window._lab_cmpTap(0));
 await p.waitForTimeout(220);
 const thin=await p.evaluate(()=>({keep:!!document.querySelector('[data-cmp2="keep"]'),
   wrong:document.querySelectorAll('.wrong,.no,.miss').length}));
 ok(!thin.keep,'with one note down there is no "keep it" button to press');
 ok(thin.wrong===0,'and nothing tells the child off about it');

 // ---- the child leaves when the child decides ----
 ok(await p.evaluate(()=>window._lab_cmpBtn('done')),'there is an "all done" button');
 await p.waitForTimeout(900);
 ok(await p.evaluate(()=>!!document.querySelector('.lgDone')),'and it ends on a card like every other lesson');

 await b.close();
 console.log(FAIL.length?('\n'+FAIL.length+' FAILED:\n'+FAIL.map(f=>'  - '+f).join('\n')):'\nwhat you write is what comes back, twice');
 process.exit(FAIL.length?1:0);
})();

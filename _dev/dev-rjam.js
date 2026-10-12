// ============================================================================================
//  YOUR TURN: DRUMS  —  improvise, in the block that has no notes in it
//  The pitch jam hands a child five notes. The rhythm block has none, so this one hands out three
//  drums. The claim is the same claim: the app plays, then the child plays ANYTHING, and nothing
//  about it is checked. A screen that renders three pads proves nothing — this listens to the kit.
//  Run: node _dev/dev-rjam.js   (needs: python3 -m http.server 8765)
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m)};

(async()=>{
 const b=await launch();
 const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
 // record every drum hit the app schedules, with the voice and the time it was asked for
 await p.addInitScript(()=>{
   Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak:()=>{},cancel:()=>{},getVoices:()=>[]}});
   window.__hits=[];
   const h=setInterval(()=>{if(typeof dHit==='function'&&!window.__hk){window.__hk=1;
     const o=window.dHit;
     window.dHit=function(v,t){window.__hits.push({t:Date.now(),v:v});return o.apply(this,arguments);};
     clearInterval(h);}},20);});
 await p.goto('http://127.0.0.1:8765/index.html?l=rjam');
 await p.waitForTimeout(2600);
 // read this BEFORE anything is tapped: the first tap marks the unit seen, and the pad tests below
 // tap. Reading it after them was my bug, not the app's.
 const before=await p.evaluate(()=>{try{return JSON.parse(localStorage.getItem('slimehedron-learn2')||'{}').rjam||null;}catch(e){return null;}});

 const st=await p.evaluate(()=>({
   pads:[...document.querySelectorAll('.rjPad')].map(e=>({v:e.dataset.rj,label:(e.textContent||'').trim()})),
   dots:document.querySelectorAll('.lgDots i').length,
   count:(document.querySelector('.lgCount')||{}).textContent||'',
   target:window._labHintDeg,expect:window._labExpect,
   say:(document.querySelector('.lgSay')||{}).textContent||''}));
 ok(st.pads.length===3,'three drums on screen ('+st.pads.length+')');
 ok(st.pads.every(x=>x.label.length>0),'and each one is labelled: '+st.pads.map(x=>x.label).join(' / '));
 ok(st.dots===0,'no progress dots: this is not a drill');
 ok(!/\d+\s*\/\s*\d+/.test(st.count),'no score out of anything ("'+st.count.trim()+'")');
 ok(st.target==null&&st.expect==null,'there is NO right answer waiting');
 console.log('        it says: "'+st.say.trim()+'"');

 // ---- there is a pulse to play against, and it keeps going ----
 // The groove is scheduled a WHOLE BAR at a time - seven hits in one burst, then 2.5s of silence
 // while that bar plays - so a 1.4s window reads 0 or 7 depending on where it lands. That is a
 // property of the scheduler, not of the groove. Measure two whole bars.
 await p.evaluate(()=>window.__hits=[]);
 await p.waitForTimeout(5600);
 const groove=await p.evaluate(()=>window.__hits.length);
 ok(groove>=14,'a groove is running under it, so there is a beat to play against ('+groove+' hits in two bars)');

 // ---- the app plays first, then hands over ----
 for(let i=0;i<60;i++){const t=await p.evaluate(()=>window._labRJam?window._labRJam().mine:true);
   if(t===false)break;await p.waitForTimeout(250);}
 const turn=await p.evaluate(()=>window._labRJam());
 ok(turn.mine===false,'the app plays a call first, then hands over (round '+turn.rounds+')');
 const say2=await p.evaluate(()=>(document.querySelector('.lgSay')||{}).textContent||'');
 ok(/your turn/i.test(say2),'and it says so in words: "'+say2.trim()+'"');

 // ---- each pad actually fires ITS OWN drum ----
 for(const v of ['c','C','h']){
   await p.evaluate(()=>window.__hits=[]);
   await p.evaluate(vv=>window._lab_rjTap(vv),v);
   await p.waitForTimeout(140);
   const got=await p.evaluate(()=>window.__hits.map(x=>x.v));
   ok(got.indexOf(v)>=0,'the "'+v+'" pad fires the "'+v+'" drum (heard: '+(got.join(',')||'nothing')+')');
 }

 // ---- a deliberate mess. none of it may be marked wrong, and none of it may be scored ----
 for(let i=0;i<14;i++){
   await p.evaluate(()=>window._lab_rjTap(['c','C','h'][(Math.random()*3)|0]));
   await p.waitForTimeout(55);     // deliberately off the beat
 }
 await p.waitForTimeout(400);
 const marks=await p.evaluate(()=>({
   wrong:document.querySelectorAll('.wrong,.no,.miss').length,
   count:(document.querySelector('.lgCount')||{}).textContent||'',
   played:window._labRJam().played}));
 ok(marks.wrong===0,'fourteen random hits off the beat and nothing is marked wrong');
 ok(marks.played>=14,'all of it counted as playing ('+marks.played+' hits)');
 ok(/hits/.test(marks.count),'the header counts what you played, not what you got right ("'+marks.count.trim()+'")');
 const after=await p.evaluate(()=>{try{return JSON.parse(localStorage.getItem('slimehedron-learn2')||'{}').rjam||null;}catch(e){return null;}});
 // seen() credits a no-score unit full marks on purpose, so it counts as learned without ever being
 // tested. So "no tries on the record" is the wrong question - a MISS on the record is the question.
 ok(after&&(after.hits||0)===(after.tries||0),
    'not one wrong answer is on the record ('+((after||{}).hits||0)+'/'+((after||{}).tries||0)+')');
 ok(after&&after.at>0,'but playing it DID count as having done the lesson');
 ok(!before,'and it was not marked before they played'+(before?' ('+JSON.stringify(before)+')':''));

 // ---- the child leaves when the child decides ----
 const btn=await p.evaluate(()=>{const e=document.querySelector('[data-rj="done"]');
   if(!e)return false;e.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));return true;});
 ok(btn,'there is an "all done" button, and the child presses it');
 await p.waitForTimeout(900);
 ok(await p.evaluate(()=>!!document.querySelector('.lgDone')),'and it ends on a card like every other lesson');

 await b.close();
 console.log(FAIL.length?('\n'+FAIL.length+' FAILED:\n'+FAIL.map(f=>'  - '+f).join('\n')):'\nthe rhythm block improvises too, and nothing in it can be wrong');
 process.exit(FAIL.length?1:0);
})();

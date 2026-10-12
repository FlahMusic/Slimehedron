// ============================================================================================
//  THREE AT ONCE, AND EXPLORE ON THE TWO-BUTTON SCREENS
//  The app plays chords behind the child in every mode and twenty-three lessons never said what
//  one is. This proves the new lesson actually sounds the right number of notes (not just that it
//  renders three buttons), and that the two-button screens now let a child hear both sides freely
//  before anything is scored.
//  Run: node _dev/dev-chords.js   (needs: python3 -m http.server 8765)
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m)};

(async()=>{
 const b=await launch();
 const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
 await p.addInitScript(()=>{
   Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak:()=>{},cancel:()=>{},getVoices:()=>[]}});
   window.__notes=[];
   const h=setInterval(()=>{if(typeof playSynth==='function'&&!window.__hk){window.__hk=1;
     const o=window.playSynth;
     window.playSynth=function(f){window.__notes.push({t:Date.now(),f:Math.round(f)});return o.apply(this,arguments);};
     clearInterval(h);}},20);});
 await p.goto('http://127.0.0.1:8765/index.html?l=chords');
 await p.waitForTimeout(3000);

 // ---- the explore screen comes first, even here ----
 const ex=await p.evaluate(()=>({exploring:window._lab_exploring?window._lab_exploring():null,
   ready:!!document.querySelector('[data-lg="ready"]'),
   opts:[...document.querySelectorAll('[data-ch]')].map(e=>e.dataset.ch),
   say:(document.querySelector('.lgSay')||{}).textContent||''}));
 ok(ex.exploring===true&&ex.ready,'the chord lesson opens on an explore screen');
 ok(ex.opts.join(',')==='1,2,3','three answers: one, two, three ('+ex.opts.join(', ')+')');
 console.log('        it says: "'+ex.say.trim()+'"');

 // pressing an option while exploring must SOUND it and score nothing
 const before=await p.evaluate(()=>{try{return (JSON.parse(localStorage.getItem('slimehedron-learn2')||'{}').chords||{}).tries||0;}catch(e){return 0;}});
 const heard=async(which)=>{
   await p.evaluate(()=>window.__notes=[]);
   await p.evaluate(w=>{const el=document.querySelector('[data-ch="'+w+'"]');
     if(el)el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));},which);
   await p.waitForTimeout(700);
   // notes that started within 150ms of each other are "at once"
   return p.evaluate(()=>{const n=window.__notes;if(!n.length)return 0;
     const t0=n[0].t;return n.filter(x=>x.t-t0<150).length;});
 };
 const n1=await heard('1'), n2=await heard('2'), n3=await heard('3');
 ok(n1===1,'pressing "one" sounds exactly ONE note ('+n1+')');
 ok(n2===2,'pressing "two" sounds exactly TWO notes at once ('+n2+')');
 ok(n3===3,'pressing "three" sounds exactly THREE notes at once ('+n3+')');
 const after=await p.evaluate(()=>{try{return (JSON.parse(localStorage.getItem('slimehedron-learn2')||'{}').chords||{}).tries||0;}catch(e){return 0;}});
 ok(after===before,'and exploring scored nothing ('+before+' -> '+after+' tries)');

 // ---- then the questions arrive and it behaves like a lesson ----
 await p.evaluate(()=>window._lab_ready&&window._lab_ready());
 await p.waitForTimeout(1600);
 const q=await p.evaluate(()=>({exploring:window._lab_exploring(),expect:window._labExpect,
   dots:document.querySelectorAll('.lgDots i').length}));
 ok(q.exploring===false&&q.expect!=null,'pressing ready brings a real question (expects "'+q.expect+'")');
 ok(q.dots>0,'and the score comes back');

 const done=()=>p.evaluate(()=>!!document.querySelector('.lgDone'));
 for(let i=0;i<70&&!(await done());i++){
   await p.evaluate(()=>{const w=String(window._labExpect);
     const el=document.querySelector('[data-ch="'+w+'"]');
     if(el)el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));});
   await p.waitForTimeout(900);}
 ok(await done(),'and the chord lesson reaches its ending');

 // ---- the same explore screen on an older two-button lesson ----
 await p.goto('http://127.0.0.1:8765/index.html?l=brightdark');
 await p.waitForTimeout(3000);
 const bd=await p.evaluate(()=>({exploring:window._lab_exploring?window._lab_exploring():null,
   ready:!!document.querySelector('[data-lg="ready"]'),expect:window._labExpect}));
 ok(bd.exploring===true&&bd.ready,'bright/dark opens on an explore screen too');
 ok(bd.expect==null,'with no question waiting behind it');

 await b.close();
 console.log(FAIL.length?('\n'+FAIL.length+' FAILED:\n'+FAIL.map(f=>'  - '+f).join('\n')):'\nthe stack is taught, and you hear both sides before anyone asks');
 process.exit(FAIL.length?1:0);
})();

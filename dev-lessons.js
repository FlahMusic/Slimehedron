// ============================================================================================
//  LESSON TEST — every lesson must (a) SPEAK its instruction and (b) actually END.
//  The two things the audit said were disqualifying:
//    * instructions were text only, so a five-year-old could not start a lesson unaided
//    * no unit had a finish: the drill ran forever and never said "you did it"
//  Run: node dev-lessons.js
// ============================================================================================
const {chromium}=require('playwright');
const fs=require('fs');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};

// --- static guard first: a new unit added without an ending is caught here, not in the field ---
const src=fs.readFileSync('learn2.js','utf8');
const ids=[...src.matchAll(/\{id:'([a-z]+)'/g)].map(m=>m[1]);
ok(ids.length>=7,'found the unit list ('+ids.length+' units)');
// A unit reaches an ending either by calling finish() itself, or by running on one of the three shared
// controllers, which finish for it. Checking only for the literal call encoded the OLD architecture and
// failed the moment the lessons were refactored. The controllers are: ladderUnit (find the note),
// readUnit (read the bar) and choiceUnit (two big buttons). Helpers that wrap one of them count too.
const HELPERS=['scaleLadder'];
for(const h of HELPERS)
  ok(new RegExp("function "+h+"\\([\\s\\S]{0,900}?(pitchUnit|ladderUnit)\\(").test(src),
     "the shared helper "+h+"() runs on a controller that finishes, so everything it wraps reaches an ending");
// readUnit is the FOURTH controller: the reading lessons (count the bar, play a song) are two thin
// wrappers over it. Prove it finishes before accepting anything that runs on it.
for(const c of ['readUnit','choiceUnit'])
  ok(new RegExp('function '+c+'\\([\\s\\S]{0,4200}?finish\\(cfg\\.id').test(src),
     'the shared controller '+c+'() calls finish(), so the lessons on it reach an ending');
// and the engine every lesson USED to run on must stay gone -- two renderers means two sets of copy
ok(!/function pitchUnit\(/.test(src),'the retired tank engine is not still in the file');
const CTRL='(ladderUnit|readUnit|choiceUnit)';
const viaHelper=(id)=>HELPERS.some(h=>new RegExp(h+"\\('"+id+"'").test(src));
for(const id of ids)ok(new RegExp("finish\\('"+id+"'").test(src)
    ||new RegExp("id:'"+id+"'[\\s\\S]{0,400}?"+CTRL+"|"+CTRL+"\\(\\{[\\s\\S]{0,160}?id:'"+id+"'").test(src)
    ||viaHelper(id),
  "unit '"+id+"' reaches an ending (its own finish(), a shared controller, or a helper that uses one)");

(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
 const ctx=await b.newContext({viewport:{width:1280,height:860}});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message)});
 // stub the voice BEFORE the page's scripts run, and record every line it is asked to say
 await p.addInitScript(()=>{
   window.__said=[];
   class U{constructor(t){this.text=t;}}
   window.SpeechSynthesisUtterance=U;
   // window.speechSynthesis is a READ-ONLY accessor in Chromium: a plain assignment silently does
   // nothing and the real (voiceless, headless) engine keeps the calls. defineProperty is required.
   Object.defineProperty(window,'speechSynthesis',{configurable:true,
     value:{speak:u=>window.__said.push(String(u.text)),cancel:()=>{},getVoices:()=>[]}});
 });
 await p.goto('file://'+process.cwd()+'/index.html');await p.waitForTimeout(400);
 await p.click('.modeCard[data-m="learn"]');await p.waitForTimeout(1200);

 const open=async(id)=>{await p.click(`.uCard[data-u="${id}"]`);await p.waitForTimeout(900);};
 const doneUp=()=>p.evaluate(()=>!!document.querySelector('.lgDone'));  // the ending is on the lesson's own screen now
 const home=async()=>{await p.evaluate(()=>window.LEARN2.home());await p.waitForTimeout(500);};

 for(const id of ids){
   await home();
   await p.evaluate(()=>window.__said=[]);
   await open(id);
   const said=await p.evaluate(()=>window.__said.slice());
   ok(said.length>0&&said.join(' ').trim().length>8,"'"+id+"' says its instruction out loud"+(said[0]?' ("'+said[0].slice(0,54)+'")':' (SILENT)'));
   const hasSpk=await p.evaluate(()=>!!document.querySelector('.labSpk'));
   ok(hasSpk,"'"+id+"' offers a say-it-again button");
 }

 // --- drive each unit to its ending -------------------------------------------------------
 const strikeDeg=(d)=>p.evaluate(dd=>{const i=edges.findIndex(e=>e.deg===dd);if(i>=0)LAB.strike(i);},d);

 // BEAT: tap fast; a tap inside the window counts, one outside just resets the run (no scolding)
 await home();await open('pulse');
 // BEAT is a TIMED lesson now: it wants eight taps in a row inside a window of +/-30% of a beat,
 // so hammering the hook cannot pass it any more — and must not be able to. The lesson publishes the
 // audio-clock time of the next beat; this taps ON it, the way a child would.
 for(let i=0;i<120&&!(await doneUp());i++){
   const wait=await p.evaluate(()=>{ if(typeof AC==='undefined'||!AC||window._labNextBeat==null)return 120;
     return Math.max(4,(window._labNextBeat-AC.currentTime)*1000);});
   await p.waitForTimeout(Math.min(1200,wait));
   await p.evaluate(()=>window._lab_tap&&window._lab_tap());}
 ok(await doneUp(),'BEAT ends with a "you did it" card');

 // HIGH & LOW / UP OR DOWN: answer both ways each round; one of them is right
 // These answer by CHIP, not by striking a wall. They are now mastery-gated at 80%, so a driver that
 // guesses 50/50 will (correctly) loop forever — it has to actually answer right. window._labExpect
 // carries the expected answer for exactly this purpose.
 // up/down runs on the same two-choice screen as bright/dark now, so it answers the same way
 for(const id of ['updown']){
   await home();await open(id);
   for(let i=0;i<120&&!(await doneUp());i++){
     const w=await p.evaluate(()=>window._labExpect);
     await p.evaluate(ww=>{const b=document.querySelector('[data-ch="'+(ww||'up')+'"]');
       if(b)b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));},w);
     await p.waitForTimeout(320);}
   ok(await doneUp(),id.toUpperCase()+' ends with a "you did it" card');}

 // HOME + FIND HOME: land on the tonic (degree 0 in the pentatonic the lessons now use)
 for(const id of ['home','findhome']){
   await home();await open(id);
   for(let i=0;i<90&&!(await doneUp());i++){
     const onLadder=await p.evaluate(()=>{const r=document.querySelector('.lgRung[data-deg="0"]');
       if(!r)return false; r.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));return true;});
     if(!onLadder)await strikeDeg(0);
     await p.waitForTimeout(260);}
   ok(await doneUp(),id.toUpperCase()+' ends with a "you did it" card');}

 // the new hint-driven pitch lessons: so-mi, +la, all five
 // sayplay plays a pattern then wants it back, one syllable at a time, following the hint.
 // sayplay is the long one: each rep plays a whole four-syllable pattern AT you before asking for it
 // back, so it needs a bigger budget than a single-note lesson. That is the repetition, not a stall.
 // the LADDER lessons answer by tapping a rung, and the lesson publishes which one it wants.
 for(const id of ['high','notes','newhome','majorscale','minorscale','minorshapes','modes']){
   await home();await open(id);
   for(let i=0;i<200&&!(await doneUp());i++){
     const d=await p.evaluate(()=>window._labHintDeg);
     if(d==null){await p.waitForTimeout(200);continue;}
     const hit=await p.evaluate(dd=>{const r=document.querySelector('.lgRung[data-deg="'+dd+'"]');
       if(!r)return false; r.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));return true;},d);
     await p.waitForTimeout(hit?260:200);}
   ok(await doneUp(),id.toUpperCase()+' ends with a "you did it" card');}

 // INTERVALS is the other two-choice lesson: same screen, same hook
 {await home();await open('intervals');
  for(let i=0;i<120&&!(await doneUp());i++){
    const w=await p.evaluate(()=>window._labExpect);
    await p.evaluate(ww=>{const bb=document.querySelector('[data-ch="'+(ww||'near')+'"]');
      if(bb)bb.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));},w);
    await p.waitForTimeout(320);}
  ok(await doneUp(),'INTERVALS ends with a "you did it" card');}

 // REST DURATION: play the notes, stay silent on the rests. dev-rest.js proves the silence MATTERS;
 // this just proves the lesson terminates like every other one.
 {await home();await open('rest');
  for(let i=0;i<700&&!(await doneUp());i++){
    const r=await p.evaluate(()=>{
      if(typeof AC==='undefined'||!AC||window._labReadAt==null)return null;
      const c=[...document.querySelectorAll('.lgCell')][window._labReadIdx];
      return {wait:(window._labReadAt-AC.currentTime)*1000,rest:!!(c&&c.classList.contains('rest'))};});
    if(!r){await p.waitForTimeout(80);continue;}
    if(r.wait>0)await p.waitForTimeout(Math.min(700,r.wait));
    if(!r.rest)await p.evaluate(()=>window._lab_tap&&window._lab_tap());
    await p.waitForTimeout(90);}
  ok(await doneUp(),'REST ends with a "you did it" card');}

 // BRIGHT AND DARK answers with two big buttons; the lesson publishes which one is right.
 {await home();await open('brightdark');
  for(let i=0;i<120&&!(await doneUp());i++){
    const w=await p.evaluate(()=>window._labExpect);
    await p.evaluate(ww=>{const b=document.querySelector('[data-ch="'+(ww||'bright')+'"]');
      if(b)b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));},w);
    await p.waitForTimeout(300);}
  ok(await doneUp(),'BRIGHTDARK ends with a "you did it" card');}

 // SAY IT FIRST has its own screen now: two drum pads, and it publishes which one it wants next.
 for(const id of ['sayplay']){
   await home();await open(id);
   for(let i=0;i<420&&!(await doneUp());i++){
     const w=await p.evaluate(()=>window._labExpect);
     if(w==null){await p.waitForTimeout(240);continue;}
     await p.evaluate(ww=>{const b=document.querySelector('[data-sp="'+(ww==='low'?'1':'0')+'"]');
       if(b)b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));},w);
     await p.waitForTimeout(220);}
   ok(await doneUp(),id.toUpperCase()+' ends with a "you did it" card');}

 // STEPS walks the scale and wraps; follow the hint rather than assuming how far it counts.
 await home();await open('steps');
 for(let i=0;i<220&&!(await doneUp());i++){
   const d=await p.evaluate(()=>window._labHintDeg);
   if(d==null){await p.waitForTimeout(200);continue;}
   await p.evaluate(dd=>{const r=document.querySelector('.lgRung[data-deg="'+dd+'"]');
     if(r)r.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));},d);
   await p.waitForTimeout(240);}
 ok(await doneUp(),'STEPS ends with a "you did it" card');

 // ECHO: the game names its own next target (window._labHintDeg); follow it
 await home();await open('echo');
 // the phrase grows 2 -> 5 notes and it PLAYS to you between turns, so this has to be patient:
 // while the hint is null the game is still singing, and striking then would count as a wrong answer.
 // the phrase grows 2 -> 5 notes and PLAYS to you between turns; striking while it is still singing
 // counts as a wrong answer and restarts the phrase, so this has to wait the game out rather than race it.
 for(let i=0;i<400&&!(await doneUp());i++){
   const d=await p.evaluate(()=>window._labHintDeg);
   if(d==null){await p.waitForTimeout(300);continue;}
   const hit=await p.evaluate(dd=>{const r=document.querySelector('.lgRung[data-deg="'+dd+'"]');
     if(!r)return false; r.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));return true;},d);
   await p.waitForTimeout(hit?260:300);}
 ok(await doneUp(),'ECHO ends with a "you did it" card');

 // the ending must offer a way onward, not a dead end
 const doors=await p.evaluate(()=>[...document.querySelectorAll('.lgStage [data-a2]')].map(e=>e.dataset.a2));
 ok(doors.includes('home'),'the ending offers a way back to the lessons list');
 ok(doors.includes('again'),'the ending offers "do it again"');

 ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
 await ctx.close();await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'every lesson speaks, and every lesson ends'));
 process.exit(FAIL.length?1:0);})();

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
for(const id of ids)ok(new RegExp("finish\\('"+id+"'").test(src),"unit '"+id+"' reaches finish()");

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
 const doneUp=()=>p.evaluate(()=>!!document.querySelector('.labDone'));
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
 for(let i=0;i<420&&!(await doneUp());i++){await p.evaluate(()=>window._lab_tap&&window._lab_tap());await p.waitForTimeout(22);}
 ok(await doneUp(),'BEAT ends with a "you did it" card');

 // HIGH & LOW / UP OR DOWN: answer both ways each round; one of them is right
 for(const [id,fn] of [['high','_lab_hi'],['updown','_lab_ud']]){
   await home();await open(id);
   for(let i=0;i<60&&!(await doneUp());i++){
     await p.evaluate(f=>window[f]&&window[f]('up'),fn);
     await p.waitForTimeout(1300);
     if(await doneUp())break;
     await p.evaluate(f=>window[f]&&window[f]('down'),fn);
     await p.waitForTimeout(1300);}
   ok(await doneUp(),id.toUpperCase()+' ends with a "you did it" card');}

 // HOME + FIND HOME: land on the tonic
 for(const id of ['home','findhome']){
   await home();await open(id);
   for(let i=0;i<40&&!(await doneUp());i++){await strikeDeg(0);await p.waitForTimeout(220);}
   ok(await doneUp(),id.toUpperCase()+' ends with a "you did it" card');}

 // STEPS: walk 0,1,2,3
 await home();await open('steps');
 for(let round=0;round<8&&!(await doneUp());round++){
   for(let d=0;d<4;d++){await strikeDeg(d);await p.waitForTimeout(160);}}
 ok(await doneUp(),'STEPS ends with a "you did it" card');

 // ECHO: the game names its own next target (window._labHintDeg); follow it
 await home();await open('echo');
 // the phrase grows 2 -> 5 notes and it PLAYS to you between turns, so this has to be patient:
 // while the hint is null the game is still singing, and striking then would count as a wrong answer.
 for(let i=0;i<400&&!(await doneUp());i++){
   const d=await p.evaluate(()=>window._labHintDeg);
   if(d==null){await p.waitForTimeout(300);continue;}
   await strikeDeg(d);await p.waitForTimeout(320);}
 ok(await doneUp(),'ECHO ends with a "you did it" card');

 // the ending must offer a way onward, not a dead end
 const doors=await p.evaluate(()=>[...document.querySelectorAll('.labDone [data-a2]')].map(e=>e.dataset.a2));
 ok(doors.includes('home'),'the ending offers a way back to the lessons list');
 ok(doors.includes('again'),'the ending offers "do it again"');

 ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
 await ctx.close();await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'every lesson speaks, and every lesson ends'));
 process.exit(FAIL.length?1:0);})();

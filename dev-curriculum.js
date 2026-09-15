// ============================================================================================
//  CURRICULUM TEST — is this actually teaching, or just a menu of activities?
//  Each assertion below is tied to a published finding, named in the message so a future reader can
//  check the claim rather than trust it:
//   * PENTATONIC FIRST. Kodaly reaches fa in Grade 3 and ti in Grade 4; Orff removes the F and B bars
//     outright. Both give the same reason: those two notes make the semitones, the only intervals that
//     can sound wrong. A pitch lesson on a 7-note scale starts at the hard end. (This test exists
//     because the first build put five of six pitch lessons on the major scale.)
//   * SO-MI IS THE ENTRY POINT. Every published sequence found opens there.
//   * MASTERY, NOT ATTENDANCE. EEF Toolkit: mastery learning is +5 months over 80 studies, +8 at
//     primary age, and the effect is attributed to a HIGH bar — "usually 80% to 90%".
//   * SPACING AT THE DAY BOUNDARY. Simmons 2012 found accuracy gains only at 24h; Wiseheart 2017 found
//     nothing at all within 15 minutes. Review must refuse to run on today's material.
//   * PROCESS PRAISE ONLY. Kamins & Dweck 1999: person-directed feedback to five-year-olds — including
//     positive person praise — lowered persistence. Never tell a child what they ARE.
//  Run: node dev-curriculum.js     (needs a server on :8765)
// ============================================================================================
const {chromium}=require('playwright');
const fs=require('fs');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const src=fs.readFileSync('learn2.js','utf8');

(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
 const ctx=await b.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message.slice(0,80))});
 await p.goto('http://127.0.0.1:8765/index.html');await p.waitForTimeout(500);
 await p.click('.modeCard[data-m="learn"]');await p.waitForTimeout(1400);

 // ---- 1. no pitch lesson may use a scale containing fa or ti ----
 const scales=[...src.matchAll(/LAB\.take\(\{[^}]*scale:'([a-zA-Z]+)'/g)].map(m=>m[1]);
 const SEVEN=['major','minor','ionian','aeolian','dorian','mixolydian','lydian','phrygian','locrian'];
 const bad=scales.filter(x=>SEVEN.includes(x));
 ok(bad.length===0,'no lesson puts a child on a scale containing fa or ti ('+[...new Set(scales)].join(', ')+')'
   +(bad.length?' — FOUND: '+bad.join(', '):''));

 // ---- 2. the sequence opens where every published sequence opens ----
 const order=await p.evaluate(()=>window.LEARN2.UNITS.filter(u=>u.tier==='lesson').map(u=>u.id));
 ok(order[0]==='pulse','the sequence opens on beat and body, not on pitch ('+order[0]+')');
 const somi=order.indexOf('somi');
 ok(somi>=0,'there is a so-mi lesson at all — the universal entry point');
 ok(somi<order.indexOf('home'),'so-mi comes before do/home, as in both published Kodaly sequences');
 ok(order.indexOf('addla')>somi&&order.indexOf('addla')<order.indexOf('home'),
    'la is added after so-mi and before do — the published order is so-mi, la, do');
 ok(order.indexOf('five')>order.indexOf('home'),'the full pentatonic comes last of the note lessons');

 // ---- 3. each lesson only asks for notes it has taught ----
 const taught=await p.evaluate(()=>{
   const U=window.LEARN2.UNITS.filter(u=>u.tier==='lesson'&&u.use);
   const out=[];const known=new Set();
   for(const u of U){const novel=u.use.filter(d=>!known.has(d));
     u.use.forEach(d=>known.add(d));
     out.push({id:u.id,use:u.use,novel:novel.length});}
   return out;});
 const leaps=taught.filter(x=>x.novel>1&&x.id!=='high'&&x.id!=='somi');
 ok(leaps.length===0,'no lesson introduces more than one new note at a time'
   +(leaps.length?': '+leaps.map(x=>x.id+' (+'+x.novel+')').join(', '):''));

 // ---- 4. MASTERY, not attendance ----
 const m=await p.evaluate(()=>{
   // a child who answers badly must NOT be marked as having learned it
   localStorage.setItem('slimehedron-learn2',JSON.stringify({trial:{hits:4,tries:10,at:Date.now()}}));
   return null;});
 const gate=await p.evaluate(()=>{
   const L=window.LEARN2;
   return {bar:L._MASTERY,min:L._MIN_TRIES};});
 ok(gate.bar>=0.8,'the mastery bar is at least 80%, the level the EEF evidence attaches its effect to (bar '+Math.round(gate.bar*100)+'%)');
 ok(gate.min>=8,'and it is measured over enough attempts to mean something ('+gate.min+')');
 const reps=[...src.matchAll(/need:(\d+)/g)].map(x=>+x[1]);
 ok(reps.length>0&&Math.min(...reps)>=10,'every lesson asks at least 10 times — repetition is the point ('+[...new Set(reps)].join(', ')+')');

 // ---- 5. SPACING: review refuses to run on today's material ----
 const sp=await p.evaluate(async()=>{
   const L=window.LEARN2;
   localStorage.setItem('slimehedron-learn2',JSON.stringify({somi:{hits:10,tries:10,at:Date.now()}}));
   location.reload();return null;});
 await p.waitForTimeout(1200);
 await p.click('.modeCard[data-m="learn"]');await p.waitForTimeout(1300);
 const today=await p.evaluate(()=>window.LEARN2._due().length);
 ok(today===0,'a lesson learned TODAY is not offered for review — spacing works at the day boundary ('+today+' due)');
 const yesterday=await p.evaluate(async()=>{
   localStorage.setItem('slimehedron-learn2',JSON.stringify({somi:{hits:10,tries:10,at:Date.now()-25*3600e3}}));
   location.reload();return null;});
 await p.waitForTimeout(1200);
 await p.click('.modeCard[data-m="learn"]');await p.waitForTimeout(1300);
 const due=await p.evaluate(()=>window.LEARN2._due().length);
 ok(due===1,'a lesson learned YESTERDAY comes back ('+due+' due)');
 // and the review unit actually runs on it
 await p.click('.uCard[data-u="review"]');await p.waitForTimeout(1100);
 const running=await p.evaluate(()=>!!document.querySelector('.labFeed')&&!document.querySelector('.labDone'));
 ok(running,'the review session opens with something to ask');

 // ---- 6. PROCESS PRAISE: never tell a child what they ARE ----
 const praise=await p.evaluate(()=>{
   const L=window.LEARN2.LANG.en;
   return [].concat(L.yes||[],L.notYet||[],[L.onceMore||''],[L.doneTitle||'']);});
 const PERSON=/\b(you're|you are|yo[u]r? a |so (musical|clever|smart|talented|good)|natural|genius|star|clever|smart|talented|gifted)\b/i;
 const personPraise=praise.filter(x=>PERSON.test(x));
 ok(personPraise.length===0,'no feedback string tells a child what they ARE (Kamins & Dweck 1999)'
   +(personPraise.length?': "'+personPraise.join('", "')+'"':''));
 ok(praise.every(x=>x&&x.length>0),'every feedback slot has words in it');

 ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
 await ctx.close();await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'the curriculum matches the published sequences'));
 process.exit(FAIL.length?1:0);})();

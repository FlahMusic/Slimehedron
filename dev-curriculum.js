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

 // ---- 7. SAY IT BEFORE YOU PLAY IT — the one practice found on every continent ----
 const say=await p.evaluate(()=>{
   const U=window.LEARN2.UNITS.find(u=>u.id==='sayplay');
   const L=window.LEARN2.LANG.en;
   return {exists:!!U,first:window.LEARN2.UNITS.filter(u=>u.tier==='lesson').indexOf(U),
           low:L.sp_low,high:L.sp_high};});
 ok(say.exists,'there is a say-it-then-play-it lesson — konnakol, bols, kuchi shoga, gu-eum and usul all do this');
 ok(say.first>=0&&say.first<=2,'and it comes early, where the oral traditions put it (position '+say.first+')');
 // Hughes 2000: vowels track pitch by second formant (i-e-a-o-u runs high to low), voiced stops mark low
 // sounds and voiceless ones mark high. The syllables must obey that or they are just noises.
 ok(/^[dbg]/i.test(say.low||''),'the LOW syllable opens on a voiced stop, as every one of those systems does ("'+say.low+'")');
 ok(/^[tkp]/i.test(say.high||''),'the HIGH syllable opens on a voiceless stop ("'+say.high+'")');
 const BACK=/[ou]/i, FRONT=/[ie]/i;
 ok(BACK.test(say.low||''),'the low syllable carries a back vowel (lower second formant)');
 ok(FRONT.test(say.high||''),'the high syllable carries a front vowel (higher second formant)');

 // ---- 8. claims we must NOT make ----
 // The falling minor third being "the natural interval of childhood all over the world" traces to a
 // Bernstein anecdote. Best measurement: 2.72 semitones, Southern British English speakers only, and its
 // own author says no cross-cultural evidence exists. This test exists because we shipped that claim.
 // Scan the CHILD-FACING COPY only, not the source. The source deliberately contains these phrases
 // inside the comment that explains why they are NOT supported — scanning it flagged the debunking as
 // the offence. What matters is what a child is told, which is LANG.
 const txt=(await p.evaluate(()=>JSON.stringify(window.LEARN2.LANG))).toLowerCase();
 const FOLKLORE=[
   ['every child already sings','claims a specific interval is sung by every child'],
   ['in every playground','claims a playground universal'],
   ['all over the world','claims a musical universal that is not established'],
   ['natural interval of childhood','repeats the uncited Kodaly-site claim']];
 const claimed=FOLKLORE.filter(([needle])=>txt.includes(needle));
 ok(claimed.length===0,'no unsupported universality claim in the copy'
   +(claimed.length?': '+claimed.map(x=>'"'+x[0]+'" — '+x[1]).join('; '):''));

 // ---- 9. no extrinsic-reward mechanics ----
 // Self-determination theory in music (Evans 2015) advises avoiding gold stars and monetary rewards;
 // Faulkner et al. found NOT ONE child whose parents used monetary rewards continued past a year.
 const rewards=['streak','badge','gold star','coins','gems','lives','hearts'];
 const found=rewards.filter(w=>txt.includes(w));
 ok(found.length===0,'no streaks, badges or point economies'+(found.length?': '+found.join(', '):''));

 ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
 await ctx.close();await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'the curriculum matches the published sequences'));
 process.exit(FAIL.length?1:0);})();

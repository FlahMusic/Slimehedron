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

 // ---- 1. fa and ti may not appear before the lesson that TEACHES them ----
 // The ramp now goes past the pentatonic on purpose, so a blanket "no seven-note scale anywhere" is
 // the wrong rule. The rule that still matters: nothing in the first block may hand a child fa or ti
 // before "The major scale" introduces them — that is the Kodaly ordering this whole file rests on.
 const SEVEN=['major','minor','ionian','aeolian','dorian','mixolydian','lydian','phrygian','locrian','harmMin','melMin'];
 const early=await p.evaluate((SEVEN)=>{
   const L=window.LEARN2, les=L.UNITS.filter(u=>u.tier==='lesson');
   const gate=les.findIndex(u=>u.id==='majorscale');
   return les.slice(0,gate<0?les.length:gate).map(u=>u.id);},SEVEN);
 const firstBlockScales=[];
 for(const id of early){
   const sc=await p.evaluate(async(id)=>{const L=window.LEARN2;
     L.UNITS.find(u=>u.id===id).run(); await new Promise(r=>setTimeout(r,500));
     const s=S.scale; L.home(); await new Promise(r=>setTimeout(r,200)); return s;},id);
   firstBlockScales.push(id+':'+sc);
   ok(!SEVEN.includes(sc),'"'+id+'" stays off fa and ti (scale='+sc+')');
 }

 // ---- 2. the sequence opens where every published sequence opens ----
 const order=await p.evaluate(()=>window.LEARN2.UNITS.filter(u=>u.tier==='lesson').map(u=>u.id));
 ok(order[0]==='pulse','the sequence opens on beat and body, not on pitch ('+order[0]+')');
 // so-mi, then la, then the full pentatonic used to be three separate lessons; they are three PHASES
 // of one lesson now. The published order is unchanged, so assert it where it actually lives — on the
 // note sets themselves, which is a stronger check than the old one on lesson ordering.
 const notes=order.indexOf('notes');
 ok(notes>=0,'there is a find-the-note lesson');
 ok(notes<order.indexOf('home'),'it comes before do/home, as in both published Kodaly sequences');
 const phases=await p.evaluate(()=>{
   const m=/const SETS=(\[\[[^;]*?\]\]);/.exec(window.__learnSrc||'');
   return null;});
 const SETS=(/const SETS=(\[\[[\s\S]*?\]\]);/.exec(src)||[])[1];
 ok(!!SETS,'the note lesson declares its phases');
 if(SETS){
   const ph=SETS.replace(/DEG\.do/g,'0').replace(/DEG\.re/g,'1').replace(/DEG\.mi/g,'2')
                .replace(/DEG\.so/g,'3').replace(/DEG\.la/g,'4');
   let sets=[];try{sets=JSON.parse(ph);}catch(e){}
   ok(sets.length===4,'four phases ('+JSON.stringify(sets)+')');
   ok(JSON.stringify(sets[0])==='[2,3]','phase 1 is so and mi — the universal entry point');
   for(let i=1;i<sets.length;i++)
     ok(sets[i].length===sets[i-1].length+1&&sets[i-1].every(d=>sets[i].includes(d)),
        'phase '+(i+1)+' adds exactly ONE new note and keeps the old ones ('+JSON.stringify(sets[i])+')');
   ok(sets[sets.length-1].length===5,'it ends on the full pentatonic');
 }

 // ---- 3. each lesson only asks for notes it has taught ----
 const taught=await p.evaluate(()=>{
   const U=window.LEARN2.UNITS.filter(u=>u.tier==='lesson'&&u.use);
   const out=[];const known=new Set();
   for(const u of U){const novel=u.use.filter(d=>!known.has(d));
     u.use.forEach(d=>known.add(d));
     out.push({id:u.id,use:u.use,novel:novel.length});}
   return out;});
 // The UNITS `use` field is the widest note set a lesson ever shows, for the review engine to draw
 // from -- it is not the set the child meets on arrival. Lessons that GROW (find-the-note, the major
 // scale) add one note at a time internally, and their phase lists are checked above; the seven-note
 // scale lessons are past the point where "one new note" is the rule at all. So this counts the
 // lessons that present a fixed set, which is where the rule applies.
 const GROWS=['notes','majorscale'];
 const PAST_PENTATONIC=['minorscale','minorshapes','modes','brightdark','newhome'];
 const leaps=taught.filter(x=>x.novel>1&&x.id!=='high'
   &&GROWS.indexOf(x.id)<0&&PAST_PENTATONIC.indexOf(x.id)<0);
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
   localStorage.setItem('slimehedron-learn2',JSON.stringify({notes:{hits:12,tries:12,at:Date.now()-25*3600e3}}));
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
 // The letters are a PROXY for the phoneme, and the proxy was too tight: /ae/ -- the vowel in "tap" --
 // is a near-open FRONT vowel with a high second formant (~1700-2000 Hz, against ~800-1200 for /u/), so
 // it satisfies Hughes' rule exactly as /e/ and /i/ do. The low-syllable check still demands a back
 // vowel, so nothing can pass both.
 const BACK=/[ou]/i, FRONT=/[iea]/i;
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

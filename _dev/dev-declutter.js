// ============================================================================================
//  A FIRST-TIMER SEES LESS, AND NOTHING IS LOST.
//    1. studio opens on the beat, the mix, the song and the feel: the sound-shaping cards (key range,
//       shape, instrument, delay, velocity, envelope, filter) and the humanize knobs are folded away
//    2. every one of those controls is still reachable with real taps: open "more settings", open a card
//       title, and it is there, on screen and working
//    3. a fold you opened stays open next time
//    4. "start fresh" is not one stray tap away in the header any more. It is in Preferences, one tap only
//       arms it, the second wipes the settings AND the beat, the mixer and the chords (they were surviving)
//    5. play mode does not offer the chord editor (play never follows a written progression)
//    6. "send MIDI out" is shown once (Preferences), and that switch still drives the real one
//    7. the first-run hints never scroll the side panel away from where someone is tapping in it
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-declutter.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const BASE='http://127.0.0.1:8765/index.html';
// controls that belong behind "more settings"
const DEEP=['octs','shape','spin','randShapeT','chaos','synthT','waveSeg','sub','dly','fxPwr','velRandT','atk','dec','sus','rel','filtSeg','cut','res','fenv'];
// a fixed bottom sheet is a scroller Playwright will not always scroll for us: bring the thing into view first
const into=(p,sel)=>p.evaluate(sel=>{const e=document.querySelector(sel);if(e)e.scrollIntoView({block:'center'});},sel);
// then press it where it is drawn, and only if it is the thing on top there (Playwright's own visibility check
// misreads the sheet's transform on a phone)
const tap=async(p,sel)=>{await into(p,sel);await p.waitForTimeout(150);
  const at=await p.evaluate(sel=>{const e=document.querySelector(sel),r=e.getBoundingClientRect(),x=r.left+Math.min(20,r.width/2),y=r.top+r.height/2;
    const t=document.elementFromPoint(x,y);return {x,y,top:!!t&&(t===e||e.contains(t)),who:t&&(t.id||t.className||t.tagName)+'',txt:e.textContent.slice(0,20),r:[Math.round(r.top),Math.round(r.left),innerHeight]};},sel);
  if(!at.top)throw new Error(sel+' ('+at.txt+') is covered where it is drawn, by '+at.who+' '+at.r);await p.mouse.click(at.x,at.y);};
const seen=(p,id)=>p.evaluate(id=>{const e=document.getElementById(id);if(!e)return false;
  const r=e.getBoundingClientRect();if(r.width<2||r.height<2)return false;
  return e.checkVisibility?e.checkVisibility({visibilityProperty:true,opacityProperty:true}):true;},id);
// drawn AND on the screen (a closed phone sheet is drawn, just below the bottom edge)
const onScreen=(p,id)=>p.evaluate(id=>{const e=document.getElementById(id);if(!e||!e.checkVisibility({visibilityProperty:true}))return false;
  const r=e.getBoundingClientRect();return r.width>2&&r.height>2&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;},id);

(async()=>{const b=await launch();
 for(const [tag,w,h,mob] of [['desktop',1440,900,false],['phone',390,844,true]]){
  const L='['+tag+'] ';
  const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:mob,hasTouch:mob});
  await ctx.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');}catch(e){}});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(BASE+'?m=studio');await p.waitForTimeout(2200);
  // on a phone the side panel is behind the menu button
  const openAside=async()=>{if(mob&&!(await onScreen(p,'padWrap'))){const m=await p.$('#menuBtn');if(m)await m.click();await p.waitForTimeout(500);}};
  await openAside();
  // ---- 1. folded away ----
  const first=[];for(const id of ['padWrap','stepGrid','mixer','songSave']){await into(p,'#'+id);if(await onScreen(p,id))first.push(id);}
  ok(first.length===4,L+'the beat, the mixer and the song are there straight away'+(first.length<4?' (only '+first+')':''));
  const shown=[];for(const id of DEEP)if(await seen(p,id))shown.push(id);
  ok(shown.length===0,L+'the sound-shaping controls start folded away'+(shown.length?' (showing: '+shown.join(',')+')':''));
  // (a closed fold still lays its contents out for a measuring tape, so ask whether it is actually drawn)
  ok(!(await p.evaluate(()=>[...document.querySelectorAll('.hzKnob')].some(k=>k.checkVisibility()))),L+'the humanize knobs start folded too');
  const count=await p.evaluate(()=>[...document.querySelectorAll('aside button,aside input,aside select,aside .toggle,aside [role=slider]')]
    .filter(e=>!e.closest('#stepGrid')&&e.checkVisibility({visibilityProperty:true})).length);
  console.log('         ('+count+' controls in the side panel before you open anything, not counting the beat grid)');
  // ---- 2. everything still reachable with real taps ----
  await tap(p,'#advReveal > summary');await p.waitForTimeout(200);
  const n=await p.evaluate(()=>{document.querySelectorAll('#advReveal .card').forEach((c,i)=>c.dataset.dk=i);return [...document.querySelectorAll('#advReveal .card.collapsed')].map(c=>c.dataset.dk);});
  for(const i of n){await tap(p,'#advReveal .card[data-dk="'+i+'"] > h2');await p.waitForTimeout(80);}
  const missing=[];for(const id of DEEP){await into(p,'#'+id);if(!(await onScreen(p,id)))missing.push(id);}
  ok(missing.length===0,L+'open "more settings" and the card titles: every one of them is there'+(missing.length?' (missing: '+missing.join(',')+')':''));
  // and they work: a real tap on a waveform changes the sound setting
  await tap(p,'#waveSeg [data-w="square"]');
  ok(await p.evaluate(()=>S.wave==='square'||document.querySelector('#waveSeg [data-w="square"]').classList.contains('active')),L+'and they work (tapping "sqr" picks the square wave)');
  await tap(p,'#hzFold > summary');await p.waitForTimeout(150);
  const k=p.locator('.hzKnob[data-k="dyn"]');const v0=await p.evaluate(()=>HUMAN.dyn);
  ok(await p.evaluate(()=>document.querySelector('.hzKnob[data-k="dyn"]').checkVisibility()),L+'tap "Humanize" and its knobs appear');
  await k.focus();await p.keyboard.press('ArrowUp');await p.keyboard.press('ArrowUp');
  ok(await p.evaluate(v0=>Math.abs(HUMAN.dyn-v0)>0.05||HUMAN.dyn===1,v0),L+'and they turn');
  // ---- 3. remembered ----
  await p.reload();await p.waitForTimeout(2200);await openAside();
  ok(await p.evaluate(()=>document.getElementById('advReveal').open&&document.getElementById('hzFold').open),L+'what you opened is still open next time');
  errs.length||ok(true,L+'no page errors');if(errs.length)ok(false,L+'no page errors: '+errs[0]);
  await ctx.close();}

 // ---- 4. start fresh ----
 {const ctx=await b.newContext({viewport:{width:1440,height:900}});
  await ctx.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');}catch(e){}});
  const p=await ctx.newPage();await p.goto(BASE+'?m=studio');await p.waitForTimeout(2200);
  ok(!(await seen(p,'resetBtn')),'[fresh] there is no wipe-everything button in the header');
  // make something worth losing: a mixer change, chords, a groove, a look
  await p.evaluate(()=>{localStorage.setItem('slimehedron-chords','[1,2,3]');localStorage.setItem('slimehedron-chordbars','2');localStorage.setItem('slimehedron-groove','Swing');
    localStorage.setItem('slimehedron-look','crayon');localStorage.setItem('slimehedron-song','{"x":1}');localStorage.setItem('slimehedron2','{"r":{}}');});
  await p.click('#prefsBtn');await p.waitForTimeout(300);
  ok(await seen(p,'freshBtn'),'[fresh] it lives in Preferences');
  await p.evaluate(()=>{window.__same=1;});
  await p.click('#freshBtn');await p.waitForTimeout(1200);
  const after1=await p.evaluate(()=>({same:!!window.__same,song:localStorage.getItem('slimehedron-song'),txt:(document.getElementById('freshBtn')||{}).textContent}));
  if(!after1.same){ok(false,'[fresh] one tap only asks again -- but the page was wiped and reloaded on the FIRST tap');await ctx.close();}else{
  ok(after1.song!==null&&/again/.test(after1.txt),'[fresh] one tap only asks again ("'+after1.txt+'"), nothing is wiped');
  await Promise.all([p.waitForNavigation(),p.click('#freshBtn')]);await p.waitForTimeout(400);
  const left=await p.evaluate(()=>{const g=k=>localStorage.getItem(k);return {chords:g('slimehedron-chords'),bars:g('slimehedron-chordbars'),groove:g('slimehedron-groove'),look:g('slimehedron-look')};});
  ok(left.chords===null&&left.bars===null&&left.groove===null,'[fresh] the second tap clears the chords and the groove too ('+JSON.stringify(left)+')');
  ok(left.look==='crayon','[fresh] how you like to see it (the look) stays');
  await ctx.close();}}

 // ---- 5 + 6. play has no chord editor; MIDI out shown once and still works ----
 {const ctx=await b.newContext({viewport:{width:1440,height:900}});
  await ctx.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');}catch(e){}});
  const p=await ctx.newPage();await p.goto(BASE+'?m=play');await p.waitForTimeout(2000);
  ok(!(await seen(p,'chordBtn')),'[play] the chord editor is not offered in play');
  await p.goto(BASE+'?m=studio');await p.waitForTimeout(2000);
  ok(await seen(p,'chordBtn'),'[studio] and it is in studio');
  await tap(p,'#advReveal > summary');await p.waitForTimeout(150);
  ok(!(await seen(p,'midiT')),'[studio] "send MIDI out" is not on the delay card a second time');
  await p.click('#prefsBtn');await p.waitForTimeout(300);
  const m0=await p.evaluate(()=>!!S.midi);await p.click('#midiT2');await p.waitForTimeout(300);
  ok(await p.evaluate(m0=>!!S.midi!==m0&&document.getElementById('midiT').classList.contains('on')===!!S.midi,m0),'[studio] the one in Preferences still switches MIDI out');
  await ctx.close();}
 // ---- 7. the first-run hints never scroll the side panel out from under someone working in it ----
 {const ctx=await b.newContext({viewport:{width:1440,height:900}});
  await ctx.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');}catch(e){}});   // studio hints still to come
  const p=await ctx.newPage();await p.goto(BASE+'?m=studio');await p.waitForTimeout(2200);
  const hint=await p.evaluate(()=>!!document.getElementById('coach'));
  await tap(p,'#advReveal > summary');await p.waitForTimeout(900);
  const r=await p.evaluate(()=>{const e=document.querySelector('#advReveal > summary').getBoundingClientRect();return e.top>0&&e.bottom<innerHeight;});
  ok(hint&&r,'[studio] with the first-run hints still showing, opening "more settings" leaves it where you tapped it'+(hint?'':' (no hint was showing)'));
  await ctx.close();}
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'declutter pass clean'));
 process.exit(FAIL.length?1:0);})();

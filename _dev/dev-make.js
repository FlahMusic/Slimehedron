// ============================================================================================
//  THE LESSON 2 GATE.
//  Lesson 2 is where this category of product dies: Hoffman's lesson 1 has 1.4M views and lesson 2
//  has 46.9K. So lesson 2 here is not a quiz, it is a looper, and it only works if three promises
//  hold. Nothing a child plays can sound wrong. Nothing they play can be out of time. And what they
//  play comes back at them, with a band, immediately. Those are the three things measured below —
//  plus the one that matters most for a five-year-old: there is no way to fail or get stuck.
//  Run: node dev-make.js   (needs python3 -m http.server 8765)
// ============================================================================================
const {launch}=require('./browser');   // one place decides where Chromium is - see _dev/browser.js
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
(async()=>{
const b=await launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
const p=await ctx.newPage();
await p.addInitScript(()=>{window.__osc=0;
  const o=AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator=function(){window.__osc++;return o.call(this);};});
p.on('pageerror',e=>{FAIL.push('pageerror: '+e.message);console.log('  FAIL  pageerror: '+e.message);});
await p.goto('http://127.0.0.1:8765/index.html?l=make');
await p.waitForTimeout(3000);

// ---- it is the second lesson, not buried ----
const where=await p.evaluate(async()=>{
  window.LEARN2.home();await new Promise(r=>setTimeout(r,600));
  const cards=[...document.querySelectorAll('.uCard')].map(c=>c.dataset.u);
  return {idx:cards.indexOf('make'),first:cards.slice(0,3)};});
ok(where.idx===1,'it is the SECOND lesson a child meets ('+where.first.join(' -> ')+')');

await p.goto('http://127.0.0.1:8765/index.html?l=make');
await p.waitForTimeout(2800);

const ui=await p.evaluate(()=>({
  pads:document.querySelectorAll('.mkPad').length,
  slots:document.querySelectorAll('.mkSlot').length,
  padPx:(()=>{const r=document.querySelector('.mkPad').getBoundingClientRect();
    return {w:Math.round(r.width),h:Math.round(r.height)};})(),
  words:(document.body.innerText.match(/\S+/g)||[]).length}));
ok(ui.pads===5,'five pads — the major pentatonic, where no wrong note exists ('+ui.pads+')');
ok(ui.slots===8,'eight slots — four beats of eighths ('+ui.slots+')');
ok(ui.padPx.h>=60,'the pads are big enough for a five-year-old ('+ui.padPx.w+'x'+ui.padPx.h+'px)');
ok(ui.words<=30,'the screen is not a wall of instructions ('+ui.words+' words)');

// ---- the loop must actually be running before anything is tapped ----
const moving=await p.evaluate(async()=>{
  const seen=new Set();
  for(let i=0;i<22;i++){
    const n=document.querySelector('.mkSlot.now');
    if(n)seen.add([...document.querySelectorAll('.mkSlot')].indexOf(n));
    await new Promise(r=>setTimeout(r,90));}
  return seen.size;});
ok(moving>=5,'the loop is already going round before the child does anything ('+moving+' slots lit)');

// ---- a tap must land on the grid, quantised, and stay there ----
const tapped=await p.evaluate(async()=>{
  const before=window._lab_mkGrid();
  window._lab_mkTap(2);await new Promise(r=>setTimeout(r,700));
  window._lab_mkTap(4);await new Promise(r=>setTimeout(r,700));
  const after=window._lab_mkGrid();
  return {before:before.filter(x=>x!=null).length,after:after.filter(x=>x!=null).length,
    grid:after,degs:after.filter(x=>x!=null)};});
ok(tapped.before===0,'it starts empty — nothing is pre-filled for the child');
ok(tapped.after>=2,'two taps a beat apart land in two different slots ('+tapped.after+' notes)');
ok(tapped.degs.every(d=>d>=0&&d<=4),'and only ever on the five safe notes ('+tapped.degs.join(',')+')');
// every filled slot is an integer index: that IS the quantising
ok(tapped.grid.every((g,i)=>g==null||Number.isInteger(g)),'every note sits exactly on an eighth, so it cannot be out of time');

// ---- the loop must play back what was made ----
// with notes in the grid the loop must make MORE sound than an empty loop does. That difference
// is the child's own playing coming back at them, which is the entire point of the lesson.
const heard=await p.evaluate(async()=>{
  const bar=2700;                                  // one bar at 96bpm, plus a hair
  const a0=window.__osc;await new Promise(r=>setTimeout(r,bar));
  const withNotes=window.__osc-a0;
  document.querySelector('[data-mk="clear"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
  await new Promise(r=>setTimeout(r,bar));         // let the cleared bar start
  const b0=window.__osc;await new Promise(r=>setTimeout(r,bar));
  const empty=window.__osc-b0;
  return {withNotes,empty};});
ok(heard.withNotes>heard.empty,
   'what the child made comes back round and plays itself ('+heard.withNotes+' voices a bar vs '+heard.empty+' when empty)');

// ---- there must be a band under it, or it is a metronome with colours ----
const drums=await p.evaluate(async()=>{
  const hits=[];const real=window.dHit;
  window.dHit=function(v){hits.push(v);return real.apply(this,arguments);};
  await new Promise(r=>setTimeout(r,2800));
  window.dHit=real;return hits;});
ok(drums.length>=6,'there is a groove underneath, not just a click ('+drums.length+' drum hits per bar)');
ok(new Set(drums).size>=2,'with more than one drum in it ('+[...new Set(drums)].join(', ')+')');

// ---- no way to fail, and no way to get stuck ----
const safety=await p.evaluate(async()=>{
  // keep with an empty grid must do nothing at all, never scold
  document.querySelector('[data-mk="clear"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
  await new Promise(r=>setTimeout(r,200));
  const clearedTo=window._lab_mkGrid().filter(x=>x!=null).length;
  const countBefore=document.querySelector('.lgCount').textContent;
  document.querySelector('[data-mk="keep"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
  await new Promise(r=>setTimeout(r,400));
  const txt=document.body.innerText.toLowerCase();
  return {clearedTo,countBefore,countAfter:document.querySelector('.lgCount').textContent,
    scolds:/wrong|try again|incorrect|oops|no!/.test(txt)};});
ok(safety.clearedTo===0,'"start again" really does clear it');
ok(safety.countBefore===safety.countAfter,'pressing keep with nothing made does nothing, rather than counting it');
ok(!safety.scolds,'nothing on screen tells the child they got something wrong');

// ---- and it completes when two loops are kept ----
const fin=await p.evaluate(async()=>{
  for(let k=0;k<2;k++){
    window._lab_mkTap(0);await new Promise(r=>setTimeout(r,200));
    window._lab_mkTap(3);await new Promise(r=>setTimeout(r,200));
    document.querySelector('[data-mk="keep"]')&&
      document.querySelector('[data-mk="keep"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
    await new Promise(r=>setTimeout(r,1100));}
  return !!document.querySelector('.lgDone');});
// NOT "keeping two loops finishes the lesson". It used to, and that was the bug: the one unit in the
// curriculum where a child makes something up had need=2 and a progress counter, which is a quiz
// wearing a sandbox's clothes. Keeping does not end anything now; the CHILD decides when to leave.
ok(!fin,'keeping loops does NOT end the unit - a sandbox has no quota');
{const st=await p.evaluate(()=>({
   dots:document.querySelectorAll('.lgDots i').length,
   count:(document.querySelector('.lgCount')||{}).textContent||'',
   done:!!document.querySelector('[data-mk="done"]'),
   keep:!!document.querySelector('[data-mk="keep"]')}));
 ok(st.dots===0,'no progress dots in the sandbox');
 ok(!/\d+\s*\/\s*\d+/.test(st.count),'the header is a tally, not a target ("'+st.count.trim()+'")');
 ok(st.keep,'and you can still keep another one');
 ok(st.done,'there is a way out that the child presses themselves');
 // and pressing it does finish, so the unit is still completable
 await p.evaluate(()=>document.querySelector('[data-mk="done"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})));
 await p.waitForTimeout(700);
 ok(await p.evaluate(()=>!!document.querySelector('.lgDone')),'and pressing it reaches the ending');}

await b.close();
console.log(FAIL.length?'\n'+FAIL.length+' FAILURE(S)':'\nlesson 2 is a thing you make, and it cannot go wrong');
process.exit(FAIL.length?1:0);})();

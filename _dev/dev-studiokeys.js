// ============================================================================================
//  STUDIO KEYS (spec _docs/specs/2026-11-10-studio-keys/spec.md): studio answers the keys a DAW user already knows.
//  Ableton Live 12 manual 42.20: "Play from Start Marker/Stop: Space"; GarageBand: "Start or stop playback: Space bar".
//    1. in studio, Space plays and pauses (and drops no ball); in play it still drops a ball (the kids' room keeps its toy)
//    2. Space on a button reached with the keyboard presses that button (WCAG: a focused control answers Space), and
//       does not touch the transport; after a mouse click leaves a button focused, Space is the transport again
//    3. the controls with keys say so: play names Space (studio), drums D, the slime A, the tempo box says it drags
//    4. the sequencer's "on" with the transport stopped starts it: one press, and it sounds (seqSetOn already did; now asserted)
//  Sabotaged 5 ways (2026-11-10), each caught: no Space transport (1, 2), a keyboard-focused button losing Space (2),
//  :focus-visible instead of how focus arrived (2), seqSetOn not starting the transport (4), drums' key not named (3).
//  Needs a local server: python -m http.server 8765. Run from the project root: node _dev/dev-studiokeys.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const init=()=>{try{for(const k of ['slimehedron-coach','slimehedron-coach-studio','slimehedron-tapped'])localStorage.setItem(k,'1');}catch(e){}};

(async()=>{const b=await launch();
 // ---- studio ----
 {const ctx=await b.newContext({viewport:{width:1280,height:900}});await ctx.addInitScript(init);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html?m=studio&view=2d');await p.waitForTimeout(2500);
  await p.evaluate(()=>{if(document.activeElement)document.activeElement.blur();if(S.playing)setPlaying(false);S.autoNotes=false;});   // focus on the page, not a control (a click on the tank would play); no auto-notes (pressing play would drop their ball)
  const s0=await p.evaluate(()=>({pl:S.playing,b:balls.length}));
  await p.keyboard.press('Space');await p.waitForTimeout(300);
  const s1=await p.evaluate(()=>({pl:S.playing,b:balls.length}));
  await p.keyboard.press('Space');await p.waitForTimeout(300);
  const s2=await p.evaluate(()=>({pl:S.playing,b:balls.length}));
  ok(!s0.pl&&s1.pl&&!s2.pl,'1. [studio] Space plays, Space pauses ('+[s0.pl,s1.pl,s2.pl].join(' -> ')+')');
  ok(s1.b===s0.b&&s2.b===s0.b,'1. [studio] and drops no ball ('+s0.b+' -> '+s1.b+' -> '+s2.b+')');
  // 2a. a button reached with Tab: Space presses it, the transport stays
  const SOLO='#mixRows .mixRow[data-k="bass"] .mixS';
  const kb=await p.evaluate(sel=>document.querySelector(sel).getAttribute('aria-pressed'),SOLO);
  await p.evaluate(()=>{document.querySelector('#mixRows .mixRow[data-k="bass"] .mixM').focus();});
  await p.keyboard.press('Tab');   // a real key moves focus to the next control: the bass row's solo (focus-visible)
  const foc=await p.evaluate(()=>{const a=document.activeElement;return {id:a&&a.className,row:a&&a.closest('.mixRow')&&a.closest('.mixRow').dataset.k,fv:a&&a.matches(':focus-visible')};});
  const pl0=await p.evaluate(()=>S.playing);
  await p.keyboard.press('Space');await p.waitForTimeout(250);
  const after=await p.evaluate(()=>({pressed:document.activeElement.getAttribute('aria-pressed'),pl:S.playing,cls:document.activeElement.className}));
  ok(foc.fv&&after.pl===pl0&&after.pressed!==kb&&after.cls===foc.id,'2. Space on a control reached with the keyboard presses it ('+foc.id+' in '+foc.row+': '+kb+' -> '+after.pressed+'), the transport stays ('+pl0+' -> '+after.pl+')');
  // put that solo back, then click ANOTHER button with the mouse (clicking the one that already has keyboard focus
  // keeps it keyboard focus, which is right): focus moves there, and it is not keyboard focus
  await p.evaluate(sel=>document.querySelector(sel).click(),SOLO);
  await p.click('#mixRows .mixRow[data-k="chords"] .mixM');await p.click('#mixRows .mixRow[data-k="chords"] .mixM');await p.waitForTimeout(150);
  const pl1=await p.evaluate(()=>S.playing),mp=await p.evaluate(()=>document.activeElement.getAttribute('aria-pressed'));
  await p.keyboard.press('Space');await p.waitForTimeout(300);
  const aft2=await p.evaluate(()=>({pl:S.playing,pressed:document.activeElement.getAttribute('aria-pressed')}));
  ok(aft2.pl!==pl1&&aft2.pressed===mp,'2. after a mouse click, Space is the transport again ('+pl1+' -> '+aft2.pl+'), the clicked button untouched ('+mp+' -> '+aft2.pressed+')');
  if(aft2.pl)await p.evaluate(()=>setPlaying(false));
  // 3. the keys are named
  const tt=await p.evaluate(()=>({play:$("playBtn").title,drums:$("drumBtn").title,slime:$("slimeBig").title,bpm:$("bpmNum").title}));
  ok(/space/i.test(tt.play),'3. [studio] play names its key ("'+tt.play+'")');
  ok(/\(D\)/.test(tt.drums)&&/\(A\)/.test(tt.slime),'3. drums and the slime name theirs ("'+tt.drums+'", "'+tt.slime+'")');
  ok(/drag/i.test(tt.bpm),'3. the tempo box says it drags ("'+tt.bpm+'")');
  // 4. the sequencer's on, with the transport stopped
  await p.click('.patTabs [data-pt="seq"]');await p.waitForTimeout(150);
  await p.evaluate(()=>{if(S.playing)setPlaying(false);if(SEQ.on)seqSetOn(false);});
  await p.click('#seqOnBtn');await p.waitForTimeout(400);
  const sq=await p.evaluate(()=>({on:SEQ.on,pl:S.playing}));
  ok(sq.on&&sq.pl,'4. "on" with the transport stopped starts it (sequencer '+sq.on+', playing '+sq.pl+')');
  ok(errs.length===0,'[studio] no page errors ('+errs.slice(0,2).join(' | ')+')');
  await ctx.close();}
 // ---- play: Space keeps its toy ----
 {const ctx=await b.newContext({viewport:{width:1280,height:900}});await ctx.addInitScript(init);
  const p=await ctx.newPage();await p.goto('http://127.0.0.1:8765/index.html?m=play&view=2d');await p.waitForTimeout(2500);
  await p.evaluate(()=>{if(document.activeElement)document.activeElement.blur();});
  const b0=await p.evaluate(()=>balls.length);await p.keyboard.press('Space');await p.waitForTimeout(250);
  const b1=await p.evaluate(()=>balls.length);
  ok(b1>b0,'1. [play] Space still drops a ball ('+b0+' -> '+b1+')');
  const tt=await p.evaluate(()=>$("playBtn").title);
  ok(!/space/i.test(tt),'3. [play] play does not claim Space there ("'+tt+'")');
  await ctx.close();}
 await b.close();
 console.log(FAIL.length?'\n'+FAIL.length+' FAILURE(S)':'\nstudio answers the keys a DAW user knows; play keeps its toy');process.exit(FAIL.length?1:0);})();

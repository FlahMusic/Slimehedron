// ============================================================================================
//  HANDS ON THE TANK (2026-10-27). Flah: "play mode is getting a bit too automated ... you pick the sound and
//  the genre and it just plays". Every check is what a hand does and what comes back:
//    1. AUTO-NOTES: play opens with the slime NOT dropping notes (it still moves the key and the shape); the
//       note button turns it on and off, turns the slime on if it was off, and is remembered per room
//    2. a TAP still sounds the moment the finger lands, and drops its note when it lifts
//    3. a DRAG turns the shape with the finger; a FLICK keeps it spinning and it coasts to a stop
//    4. the spinning walls really hit the notes (more notes, faster notes) and nothing leaves the tank,
//       in every kind of tank
//    5. HOLD plants a seed that plays its spot once a bar; a tap takes it away; clear takes them all
//    6. a SWIPE that starts on the edge strums the walls it passes (no note dropped, no spin)
//    7. the CHORD JACKPOT: the chord's notes, and little else, within a bar -> the tank and the band answer;
//       strumming every wall does not count
//    8. a lesson is untouched: a drag there does not spin anything
//    9. the phone's top bar still fits
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-hands.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const BASE='http://127.0.0.1:8765/index.html';
const quiet=()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');localStorage.setItem('slimehedron-tapped','1');}catch(e){}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
// where things are on screen
const centre=p=>p.evaluate(()=>{const r=cv.getBoundingClientRect();return {x:r.left+CX*r.width/W,y:r.top+CY*r.height/H,R:R*r.width/W};});
const countTriggers=p=>p.evaluate(()=>{if(window.__trg)return;window.__trg=0;const o=trigger;window.trigger=function(){window.__trg++;return o.apply(this,arguments);};});

(async()=>{const b=await launch();
 // ---- 1. auto-notes ----
 {const ctx=await b.newContext({viewport:{width:1440,height:900}});await ctx.addInitScript(quiet);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(BASE+'?m=play');await p.waitForTimeout(2500);
  const c=await centre(p);
  await p.mouse.click(c.x,c.y);await p.waitForTimeout(1500);   // first touch: the band (and the slime) come in
  const s0=await p.evaluate(()=>({slime:S.slimeMode,auto:S.autoNotes,pressed:$("autoNotesBtn").getAttribute('aria-pressed'),vis:$("autoNotesBtn").checkVisibility(),
    next:$("autoNotesBtn").previousElementSibling&&$("autoNotesBtn").previousElementSibling.id}));
  ok(s0.vis&&s0.next==='slimeBig','1. the note button sits right next to the slime switch');
  ok(s0.slime&&!s0.auto&&s0.pressed==='false','1. play opens with the slime on but NOT dropping notes ('+JSON.stringify(s0)+')');
  const n=await p.evaluate(async()=>{balls.length=0;const spawned=[];const o=autoMelodyNote;window.autoMelodyNote=function(){spawned.push(1);return o.apply(this,arguments);};
    await new Promise(r=>setTimeout(r,7000));const a=spawned.length;
    $("autoNotesBtn").click();await new Promise(r=>setTimeout(r,7000));return {off:a,on:spawned.length-a,balls:balls.length,auto:S.autoNotes};});
  ok(n.off===0,'1. with it off, the slime drops no notes in 7 s ('+n.off+')');
  ok(n.on>=2&&n.auto,'1. tap it and the slime plays notes ('+n.on+' in 7 s)');
  await p.evaluate(()=>{$("slimeBig").click();});   // slime off
  await p.evaluate(()=>{$("autoNotesBtn").click();});
  ok(await p.evaluate(()=>S.slimeMode&&S.autoNotes&&$("autoNotesBtn").getAttribute('aria-pressed')==='true'),'1. pressing it with the slime off turns the slime on too');
  await p.evaluate(()=>{$("autoNotesBtn").click();});   // off again, remembered for play
  await p.reload();await p.waitForTimeout(2500);await p.mouse.click(c.x,c.y);await p.waitForTimeout(1200);
  ok(await p.evaluate(()=>!S.autoNotes),'1. remembered in play');
  await p.goto(BASE+'?m=studio');await p.waitForTimeout(2500);
  ok(await p.evaluate(()=>S.autoNotes===true&&$("autoNotesBtn").checkVisibility()),'1. studio keeps its melody: auto-notes on there');
  ok(errs.length===0,'1. no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}

 // ---- 2 + 3. tap, drag, flick ----
 {const ctx=await b.newContext({viewport:{width:1440,height:900}});await ctx.addInitScript(quiet);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(BASE+'?m=play&view=2d');await p.waitForTimeout(2500);await countTriggers(p);   // 2D: a screen angle IS the shape's angle (in 3D the grabbed spot of glass follows the finger, which is a different number)
  const c=await centre(p);
  await p.mouse.move(c.x+c.R*0.2,c.y);await p.mouse.down();await p.waitForTimeout(60);
  const atDown=await p.evaluate(()=>({t:window.__trg,b:balls.length}));
  await p.mouse.up();await p.waitForTimeout(120);
  const atUp=await p.evaluate(()=>balls.length);
  ok(atDown.t>=1,'2. a tap sounds the moment the finger lands ('+atDown.t+' note)');
  ok(atDown.b===0&&atUp===1,'2. and its note drops when the finger lifts');
  await p.evaluate(()=>{if(S.slimeMode)$("slimeBig").click();S.spin=0;balls.length=0;});   // nothing turning but the hand
  // a slow quarter turn, held still before letting go: the shape follows the finger and stays
  const r0=await p.evaluate(()=>rot);
  await p.mouse.move(c.x+c.R*0.6,c.y);await p.mouse.down();
  for(let i=1;i<=20;i++){const a=i/20*Math.PI/2;await p.mouse.move(c.x+c.R*0.6*Math.cos(a),c.y+c.R*0.6*Math.sin(a));await p.waitForTimeout(30);}
  await p.waitForTimeout(200);await p.mouse.up();await p.waitForTimeout(400);
  const turn=await p.evaluate(r0=>({d:rot-r0,w:_hands.SPINU.w,balls:balls.length}),r0);
  ok(Math.abs(turn.d-Math.PI/2)<0.12,'3. a quarter turn of the finger turns the shape a quarter turn ('+(turn.d*180/Math.PI).toFixed(0)+' degrees)');
  ok(turn.w===0,'3. let go after stopping and it stays put');
  ok(turn.balls===0,'3. a drag drops no note');
  // a flick
  const r1=await p.evaluate(()=>rot);
  await p.mouse.move(c.x+c.R*0.6,c.y);await p.mouse.down();
  for(let i=1;i<=8;i++){const a=i/8*Math.PI*0.6;await p.mouse.move(c.x+c.R*0.6*Math.cos(a),c.y+c.R*0.6*Math.sin(a));await p.waitForTimeout(12);}
  await p.mouse.up();
  const w0=await p.evaluate(()=>_hands.SPINU.w);await p.waitForTimeout(1000);
  const w1=await p.evaluate(()=>_hands.SPINU.w);await p.waitForTimeout(9000);
  const end=await p.evaluate(r1=>({w:_hands.SPINU.w,turns:(rot-r1)/(2*Math.PI)}),r1);
  ok(w0>0.03,'3. a flick keeps it spinning ('+(w0*60/(2*Math.PI)).toFixed(2)+' turns a second as it leaves the finger)');
  ok(w1>0&&w1<w0*0.75,'3. it slows down like something heavy ('+(w1/w0*100).toFixed(0)+'% left after 1 s)');
  ok(end.w===0&&end.turns>0.5,'3. and coasts to a stop ('+end.turns.toFixed(1)+' turns in all)');
  // the flick direction: the other way round spins the other way
  await p.mouse.move(c.x+c.R*0.6,c.y);await p.mouse.down();
  for(let i=1;i<=8;i++){const a=-i/8*Math.PI*0.6;await p.mouse.move(c.x+c.R*0.6*Math.cos(a),c.y+c.R*0.6*Math.sin(a));await p.waitForTimeout(12);}
  await p.mouse.up();
  ok(await p.evaluate(()=>_hands.SPINU.w<-0.03),'3. flick it the other way and it spins the other way');
  ok(errs.length===0,'2-3. no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}

 // ---- 4. the walls hit the notes, in every kind of tank ----
 for(const [view,space,shape] of [['2d','normal','6'],['3d','normal','6'],['3d','normal','cube'],['3d','curved','6'],['3d','portal','8']]){
  const ctx=await b.newContext({viewport:{width:1200,height:900}});await ctx.addInitScript(quiet);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(BASE+'?m=studio&view='+view+'&space='+space);await p.waitForTimeout(2500);
  const r=await p.evaluate(async shape=>{const sh=$("shape");sh.value=shape;sh.dispatchEvent(new Event('change'));
    await new Promise(r=>setTimeout(r,800));startBreak=()=>{};breakWall=()=>{};S.spin=0;
    if(!S.playing)setPlaying(true);
    const run=async(spin)=>{balls.length=0;Math.random=(s=>()=>(s=(s*16807)%2147483647)/2147483647)(7);
      for(let i=0;i<10;i++)spawn(CX+(i%5-2)*R*0.12,CY+(Math.floor(i/5)-0.5)*R*0.2);
      let hits=0;const o=trigger;window.trigger=function(){hits++;return o.apply(this,arguments);};
      const inside=b=>edges._solid||edges._space==='curved'?Math.hypot(b.x-CX,b.y-CY)<R*1.6:inPoly(b.x,b.y,edges._verts);
      let out=0,fast=0;
      for(let k=0;k<30;k++){if(spin)_hands.SPINU.w=0.2;await new Promise(r=>setTimeout(r,80));
        for(const b of balls){if(!inside(b))out++;fast=Math.max(fast,Math.hypot(b.vx,b.vy)/ballSpeed());}}
      window.trigger=o;_hands.SPINU.w=0;return {hits,out,n:balls.length,fast};};
    const still=await run(false),spun=await run(true);
    return {still,spun,solid:!!edges._solid,space:edges._space||'normal'};},shape);
  const L='4. ['+view+' '+space+' '+shape+'] ';
  ok(r.spun.out===0&&r.spun.n===10,L+'spinning it hard for 2.4 s loses no notes ('+r.spun.n+' of 10 still inside)');
  ok(r.spun.hits>r.still.hits,L+'the spinning walls hit the notes: '+r.spun.hits+' notes against '+r.still.hits+' standing still');
  if(r.space!=='curved')ok(r.spun.fast>1.5,L+'and fling them ('+r.spun.fast.toFixed(1)+'x their usual speed)');
  ok(errs.length===0,L+'no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}

 // ---- 5 + 6 + 7. hold, strum, jackpot ----
 {const ctx=await b.newContext({viewport:{width:1440,height:900}});await ctx.addInitScript(quiet);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(BASE+'?m=play&view=2d');await p.waitForTimeout(2500);
  const c=await centre(p);
  await p.mouse.click(c.x,c.y);await p.waitForTimeout(1200);
  await p.evaluate(()=>{S.spin=0;balls.length=0;});
  // hold
  const sx=c.x-c.R*0.3,sy=c.y-c.R*0.2;
  await p.mouse.move(sx,sy);await p.mouse.down();await p.waitForTimeout(750);await p.mouse.up();
  const seed=await p.evaluate(()=>({n:_hands.SEEDS.length,balls:balls.length,el:!!document.querySelector('.tankSeed')}));
  ok(seed.n===1&&seed.el,'5. holding still for half a second plants a seed you can see');
  ok(seed.balls===0,'5. (and does not also drop a note)');
  const fires=await p.evaluate(async()=>{balls.length=0;let n=0;const o=spawn;window.spawn=function(){n++;return o.apply(this,arguments);};
    const bm=beatsPerBar()*60000/S.bpm;await new Promise(r=>setTimeout(r,bm*3+200));window.spawn=o;return {n,bars:3};});
  ok(fires.n>=2&&fires.n<=4,'5. it plays its spot once a bar ('+fires.n+' times in 3 bars)');
  await p.mouse.click(sx,sy);await p.waitForTimeout(400);
  ok(await p.evaluate(()=>_hands.SEEDS.length===0),'5. a tap on the seed takes it away');
  for(const [dx,dy] of [[-0.3,-0.2],[0.25,0.1]]){await p.mouse.move(c.x+c.R*dx,c.y+c.R*dy);await p.mouse.down();await p.waitForTimeout(700);await p.mouse.up();}
  await p.click('#clearBtn');await p.waitForTimeout(400);
  ok(await p.evaluate(()=>_hands.SEEDS.length===0&&!document.querySelector('.tankSeed:not(.gone)')),'5. clear takes every seed away');
  // strum: from outside the shape, across the right-hand edge and round
  await p.evaluate(()=>{balls.length=0;window.__walls=new Set();const o=LAB.strike;LAB.strike=function(i,v){window.__walls.add(i);return o.apply(this,arguments);};});
  const r0=await p.evaluate(()=>rot);
  await p.mouse.move(c.x+c.R*1.15,c.y-c.R*0.6);await p.mouse.down();
  for(let i=1;i<=24;i++){const a=-0.55+i/24*1.9;await p.mouse.move(c.x+c.R*1.0*Math.cos(a),c.y+c.R*1.0*Math.sin(a));await p.waitForTimeout(16);}
  await p.mouse.up();await p.waitForTimeout(200);
  const st=await p.evaluate(r0=>({walls:window.__walls.size,balls:balls.length,turned:Math.abs(rot-r0)}),r0);
  ok(st.walls>=3,'6. a swipe along the edge strums the walls it passes ('+st.walls+' walls)');
  ok(st.balls===0&&st.turned<0.01,'6. and drops no note and does not spin the shape');
  // jackpot: the chord's own notes
  const jp=await p.evaluate(async()=>{setPlaying(false);   // hold the chord still while we play it
    const sh=$("shape");sh.value='12';sh.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,400));
    curRootDeg=0;const tones=_hands.chordPcsNow();const pc=c=>((Math.round(c/100)%12)+12)%12;
    const walls=edges.map((e,i)=>({i,pc:pc(e.cents)}));const pick=tones.map(t=>walls.find(w=>w.pc===t)).filter(Boolean);
    _hands.JACK.last=-1e9;_hands.JACK.notes=[];const j0=window.__jackpots||0;
    if(pick.length<tones.length)return {skip:true,tones};
    for(const w of pick){LAB.strike(w.i);_hands.jackNote(edges[w.i].cents);await new Promise(r=>setTimeout(r,150));}
    await new Promise(r=>setTimeout(r,450));   // it is judged when the hand pauses
    const got=(window.__jackpots||0)-j0;
    // every wall in a row (a strum round the whole shape) is not finding the chord
    _hands.JACK.last=-1e9;_hands.JACK.notes=[];const j1=window.__jackpots||0;
    for(const w of walls){_hands.jackNote(edges[w.i].cents);await new Promise(r=>setTimeout(r,25));}
    await new Promise(r=>setTimeout(r,450));
    const all=(window.__jackpots||0)-j1,allChord=walls.every(w=>tones.includes(w.pc));
    return {got,all,allChord,tones,fill:_hands.JACK.fill,chip:$("hdrChord").classList.contains('jack')};});
  if(jp.skip)ok(true,'7. (this shape has no wall for one of the chord tones '+jp.tones+'; jackpot not checked)');
  else{ok(jp.got===1,'7. playing the chord\'s notes within a bar sets off the jackpot');
    ok(jp.chip,'7. the chord name lights up with it');
    ok(jp.allChord||jp.all===0,'7. strumming every wall does not count');}
  // the drummer answers: a fill, then a crash on the next bar
  const fill=await p.evaluate(async()=>{if(!S.playing)setPlaying(true);if(!drumOn)$("drumBtn").click();
    const J=_hands.JACK,seen=[1];let v=1;Object.defineProperty(J,'fill',{get:()=>v,set:x=>{v=x;seen.push(x);},configurable:true});   // every change, not a sample
    let crash=0;const od=dHit;window.dHit=function(k){if(k==='x'||k==='y')crash++;return od.apply(this,arguments);};
    const bm=beatsPerBar()*60000/S.bpm;await new Promise(r=>setTimeout(r,bm*2.3));window.dHit=od;return {seen,crash};});
  const fillSeen=fill.seen;
  ok(fillSeen.includes(2)&&fillSeen[fillSeen.length-1]===0&&fill.crash>0,'7. the band answers with a fill and a crash ('+fillSeen.join(' -> ')+', '+fill.crash+' crash)');
  ok(errs.length===0,'5-7. no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}

 // ---- 8. a lesson is untouched ----
 {const ctx=await b.newContext({viewport:{width:1440,height:900}});await ctx.addInitScript(quiet);
  const p=await ctx.newPage();await p.goto(BASE+'?l=pulse');await p.waitForTimeout(4000);
  const on=await p.evaluate(()=>!!(LAB&&LAB._on));
  if(on){const c=await centre(p);const r0=await p.evaluate(()=>rot);
    await p.mouse.move(c.x+c.R*0.6,c.y);await p.mouse.down();
    for(let i=1;i<=10;i++){const a=i/10;await p.mouse.move(c.x+c.R*0.6*Math.cos(a),c.y+c.R*0.6*Math.sin(a));await p.waitForTimeout(16);}
    await p.mouse.up();await p.waitForTimeout(300);
    ok(await p.evaluate(r0=>Math.abs(rot-r0)<0.05&&!_hands.SPINU.w,r0),'8. a drag in a lesson spins nothing');
  }else ok(true,'8. (lesson did not open its tank here; skipped)');
  await ctx.close();}

 // ---- 10. the keyboard can do it too (WCAG 2.5.1: a path gesture needs a one-press way) ----
 {const ctx=await b.newContext({viewport:{width:1440,height:900}});await ctx.addInitScript(quiet);
  const p=await ctx.newPage();await p.goto(BASE+'?m=play');await p.waitForTimeout(2500);
  await p.focus('#cv');await p.keyboard.press(']');await p.keyboard.press(']');
  ok(await p.evaluate(()=>_hands.SPINU.w>0.1),'10. "]" spins the shape from the keyboard ("[" the other way)');
  await p.keyboard.press('Shift+Enter');await p.waitForTimeout(200);
  ok(await p.evaluate(()=>_hands.SEEDS.length===1),'10. shift+enter leaves a seed at the marker');
  await ctx.close();}

 // ---- 11. the bugs the 2026-10-27 review of 139ca19 found (each check was red before its fix) ----
 // 11a. a spinning wall throws a note, and the note calms back down: a gentle steady spin must not wind every
 //      note up to the boost cap (it did: the kick read the note's speed, which already held the last kick)
 {const ctx=await b.newContext({viewport:{width:1200,height:900}});await ctx.addInitScript(quiet);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(BASE+'?m=studio&view=2d');await p.waitForTimeout(2500);
  const r=await p.evaluate(async()=>{const sh=$("shape");sh.value='6';sh.dispatchEvent(new Event('change'));
    await new Promise(r=>setTimeout(r,800));startBreak=()=>{};breakWall=()=>{};S.spin=0;if(!S.playing)setPlaying(true);
    balls.length=0;Math.random=(s=>()=>(s=(s*16807)%2147483647)/2147483647)(7);
    for(let i=0;i<10;i++)spawn(CX+(i%5-2)*R*0.12,CY+(Math.floor(i/5)-0.5)*R*0.2);
    const sp=()=>balls.map(b=>Math.hypot(b.vx,b.vy)/ballSpeed()).sort((a,b)=>a-b);
    for(let k=0;k<40;k++){_hands.SPINU.w=0.03;await new Promise(r=>setTimeout(r,80));}
    const during=sp();_hands.SPINU.w=0;await new Promise(r=>setTimeout(r,1500));
    return {med:during[during.length>>1],after:sp().pop()};});
  ok(r.med<1.8,'11a. a gentle steady spin does not wind the notes up (middle note at '+r.med.toFixed(2)+'x its usual speed)');
  ok(r.after<1.4,'11a. and once it stops they calm back down ('+r.after.toFixed(2)+'x, 1.5 s later)');
  ok(errs.length===0,'11a. no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}
 // 11b. a reload straight into studio (or into play with auto-notes saved on) keeps auto-notes and the chord button
 for(const [mode,saved,want] of [['studio',null,true],['play','1',true]]){
  const ctx=await b.newContext({viewport:{width:1440,height:900}});await ctx.addInitScript(quiet);
  await ctx.addInitScript(([m,s])=>{try{localStorage.setItem('slimehedron-mode',m);if(s!=null)localStorage.setItem('slimehedron-autonotes-'+m,s);}catch(e){}},[mode,saved]);
  const p=await ctx.newPage();await p.goto(BASE);await p.waitForTimeout(2500);
  const s=await p.evaluate(()=>({mode:S.mode,auto:S.autoNotes,dock:!!($("chordBtn")&&$("chordBtn").parentElement===document.querySelector('header .btngroup'))}));
  ok(s.mode===mode&&s.auto===want&&s.dock,'11b. a reload into '+mode+(saved?' (auto-notes saved on)':'')+' keeps auto-notes '+(want?'on':'off')+' and the chord button in the header ('+JSON.stringify(s)+')');
  await ctx.close();}
 // 11c. a drag turns a STOPPED tank too (the transport starts, as a tap's does), and so does "]"
 {const ctx=await b.newContext({viewport:{width:1440,height:900}});await ctx.addInitScript(quiet);
  const p=await ctx.newPage();await p.goto(BASE+'?m=play&view=2d');await p.waitForTimeout(2500);
  const c=await centre(p);
  await p.evaluate(()=>{if(S.playing)setPlaying(false);S.spin=0;});
  const r0=await p.evaluate(()=>rot);
  await p.mouse.move(c.x+c.R*0.6,c.y);await p.mouse.down();
  for(let i=1;i<=20;i++){const a=i/20*Math.PI/2;await p.mouse.move(c.x+c.R*0.6*Math.cos(a),c.y+c.R*0.6*Math.sin(a));await p.waitForTimeout(30);}
  await p.waitForTimeout(200);
  const mid=await p.evaluate(r0=>({d:rot-r0,playing:S.playing}),r0);
  await p.mouse.up();
  ok(mid.playing&&Math.abs(mid.d-Math.PI/2)<0.2,'11c. a drag on a stopped tank turns it with the finger ('+(mid.d*180/Math.PI).toFixed(0)+' degrees, playing: '+mid.playing+')');
  await p.evaluate(()=>{setPlaying(false);_hands.SPINU.w=0;});const r1=await p.evaluate(()=>rot);
  await p.focus('#cv');await p.keyboard.press(']');await p.waitForTimeout(500);
  const kb=await p.evaluate(r1=>({d:rot-r1,playing:S.playing}),r1);
  ok(kb.playing&&kb.d>0.1,'11c. "]" on a stopped tank spins it right away ('+(kb.d*180/Math.PI).toFixed(0)+' degrees in 0.5 s)');
  await ctx.close();}
 // 11d. a seed's loop does not steer the chord brain: neither its own ring nor the note it drops each bar
 // 11e. if the browser takes the finger away mid-spin (lost pointer capture), the spin lets go
 // 11g. shift+enter plants the seed where the aim marker is drawn (3D)
 {const ctx=await b.newContext({viewport:{width:1440,height:900}});await ctx.addInitScript(quiet);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(BASE+'?m=play&view=2d');await p.waitForTimeout(2500);
  const c=await centre(p);
  await p.mouse.click(c.x,c.y);await p.waitForTimeout(1200);
  const f=await p.evaluate(async()=>{S.spin=0;S.autoNotes=false;balls.length=0;
    let feeds=0,rings=0;const of=noteFeed,ot=trigger;window.noteFeed=function(){feeds++;return of.apply(this,arguments);};
    window.trigger=function(c,i,g,n,pane){if(!pane)rings++;return ot.apply(this,arguments);};
    _hands.plantSeed(CX-R*0.3,CY-R*0.2);const bm=beatsPerBar()*60000/S.bpm;await new Promise(r=>setTimeout(r,bm*3+300));
    window.noteFeed=of;window.trigger=ot;_hands.clearSeeds();return {feeds,rings};});
  ok(f.rings>=4&&f.feeds===0,'11d. a seed plays for 3 bars and never steers the chord brain ('+f.rings+' notes, '+f.feeds+' fed to it)');
  await p.evaluate(()=>{balls.length=0;});
  await p.mouse.move(c.x+c.R*0.6,c.y);await p.mouse.down();
  for(let i=1;i<=6;i++){const a=i/6*0.5;await p.mouse.move(c.x+c.R*0.6*Math.cos(a),c.y+c.R*0.6*Math.sin(a));await p.waitForTimeout(20);}
  const was=await p.evaluate(()=>{const was=_hands.SPINU.drag;for(const id of _hands.G.keys())try{cv.releasePointerCapture(id);}catch(e){}return was;});
  // Chrome fires lostpointercapture when it handles the NEXT pointer event (measured: 0 of 4 without one, 4 of 4 with)
  await p.mouse.move(c.x+c.R*0.6*Math.cos(0.55),c.y+c.R*0.6*Math.sin(0.55));await p.waitForTimeout(80);
  const lost=await p.evaluate(was=>({was,drag:_hands.SPINU.drag,held:_hands.G.size}),was);
  await p.mouse.up();
  ok(lost.was&&!lost.drag&&lost.held===0,'11e. losing the finger mid-spin lets the spin go ('+JSON.stringify(lost)+')');
  ok(errs.length===0,'11d-e. no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}
 {const ctx=await b.newContext({viewport:{width:1440,height:900}});await ctx.addInitScript(quiet);
  const p=await ctx.newPage();await p.goto(BASE+'?m=play&view=3d');await p.waitForTimeout(2500);
  await p.focus('#cv');await p.keyboard.press('ArrowUp');await p.keyboard.press('ArrowLeft');await p.keyboard.press('Shift+Enter');await p.waitForTimeout(300);
  const g=await p.evaluate(()=>{const d=$("aimDot"),s=_hands.SEEDS[0];if(!s)return null;
    return {dx:parseFloat(s.el.style.left)-parseFloat(d.style.left),dy:parseFloat(s.el.style.top)-parseFloat(d.style.top)};});
  ok(g&&Math.hypot(g.dx,g.dy)<4,'11g. [3d] shift+enter puts the seed on the aim marker ('+(g?Math.hypot(g.dx,g.dy).toFixed(1)+' px off':'no seed')+')');
  await ctx.close();}
 // 11f. the jackpot's fill: a fill the drummer cannot play is never left waiting (it used to wait, in 3/4 or with
 //      the drums off, and land a fill and a crash out of nowhere minutes later)
 {const ctx=await b.newContext({viewport:{width:1440,height:900}});await ctx.addInitScript(quiet);
  const p=await ctx.newPage();await p.goto(BASE+'?m=play&view=2d');await p.waitForTimeout(2500);
  const c=await centre(p);await p.mouse.click(c.x,c.y);await p.waitForTimeout(1200);
  const j=await p.evaluate(async()=>{if(!drumOn)$("drumBtn").click();const bm=()=>beatsPerBar()*60000/S.bpm,wait=ms=>new Promise(r=>setTimeout(r,ms));
    const J=_hands.JACK;let v=0,seen=[];Object.defineProperty(J,'fill',{get:()=>v,set:x=>{v=x;seen.push(x);},configurable:true});
    const tones=_hands.chordPcsNow();
    // 3/4: a jackpot, then back to 4/4 a bar later: nothing was left waiting to go off there
    drumSig='12';await wait(bm()*1.5);seen=[];J.last=-1e9;jackpot(tones);await wait(bm()*1.2);drumSig='16';await wait(bm()*3.5);
    const meter={seen:seen.slice(),end:v};
    // drums off right after a jackpot, back on two bars later
    seen=[];J.last=-1e9;jackpot(tones);$("drumBtn").click();await wait(bm()*2.5);seen=[];$("drumBtn").click();await wait(bm()*2.2);
    return {meter,late:seen.slice(),end:v};});
  ok(!j.meter.seen.includes(2)&&j.meter.end===0,'11f. [3/4] a jackpot leaves no fill waiting ('+(j.meter.seen.join(' -> ')||'nothing')+', ends at '+j.meter.end+')');
  ok(!j.late.includes(2)&&j.end===0,'11f. a fill the drums were off for is forgotten (after they come back: '+(j.late.join(' -> ')||'nothing')+', ends at '+j.end+')');
  await ctx.close();}
 // 11h. a wall a note hits keeps its flash while the shape turns (every turn rebuilt the walls and wiped it)
 {const ctx=await b.newContext({viewport:{width:1200,height:900}});await ctx.addInitScript(quiet);
  const p=await ctx.newPage();await p.goto(BASE+'?m=play&view=2d');await p.waitForTimeout(2500);
  const c=await centre(p);await p.mouse.click(c.x,c.y);await p.waitForTimeout(800);
  const fl=await p.evaluate(async()=>{if(!S.spin)S.spin=6;edges[0].flash=1;await new Promise(r=>setTimeout(r,50));return edges[0].flash;});
  ok(fl>0.3,'11h. a struck wall still glows 50 ms later on a turning shape (flash '+fl.toFixed(2)+')');
  await ctx.close();}

 // ---- 9. the phone bar ----
 for(const [w,h] of [[390,844],[375,667],[360,740]]){
  const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:true,hasTouch:true});await ctx.addInitScript(quiet);
  const p=await ctx.newPage();await p.goto(BASE+'?m=play');await p.waitForTimeout(2500);
  const bad=await p.evaluate(()=>{const els=[...document.querySelectorAll('header button,#topRight button,.fadeRow > *')].filter(e=>e.checkVisibility({visibilityProperty:true}));
    const R=els.map(e=>({id:e.id||e.className,r:e.getBoundingClientRect()}));const out=[];
    for(let i=0;i<R.length;i++){const a=R[i].r;if(a.left<-1||a.right>innerWidth+1)out.push(R[i].id+' off screen');
      for(let j=i+1;j<R.length;j++){const c=R[j].r;if(a.left<c.right-1&&c.left<a.right-1&&a.top<c.bottom-1&&c.top<a.bottom-1&&!R[i].id.includes('volMute')&&!R[j].id.includes('volMute'))out.push(R[i].id+' x '+R[j].id);}}
    return out;});
  ok(bad.length===0,'9. ['+w+'px] the top bar fits, nothing on top of anything'+(bad.length?' ('+bad.join(', ')+')':''));
  await ctx.close();}

 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'hands on the tank'));
 process.exit(FAIL.length?1:0);})();

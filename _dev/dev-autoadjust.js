// ============================================================================================
//  THE AUTO ADJUSTER (web-first ticket 15): each shape plays at its own pace, by bars.
//  Flah 2026-10-29: "each shape takes on its own slightly individual speed of note playing ... an auto adjuster that
//  smoothly adjusts to fit this timeframe regardless of BPM, as its based on number of bars". Before it, one ball speed
//  and one set of odds made a tetrahedron play 26 notes a bar and a hexagon 11 (measured at 80 bpm).
//    1. with the slime and auto-notes on, each shape settles near its own aim (8 a bar on the hexagon, the cube root of
//       its volume against the hexagon's, within 6..10): over bars 32-48, within 20% of it
//    2. the same at another tempo (bars, not seconds)
//    3. it glides: the knob never jumps between two beats
//  Driven tick by tick on a pinned clock. The slime opens a wall every 8 bars and heals one every 24 on the drum clock,
//  which does not run here, so the test does the same on its own bar count.
//  Needs a local server: python -m http.server 8765. Run from the project root: node _dev/dev-autoadjust.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html';

(async()=>{const b=await launch();
 for(const [shape,bpm,seed] of [['6',80,7],['6',80,99],['cube',80,7],['cube',80,99],['tetra',80,7],['tetra',80,99],['icosa',80,7],['icosa',80,99],['6',140,7],['6',140,99]]){
  const ctx=await b.newContext({viewport:{width:1000,height:900}});const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');}catch(e){}});
  await p.goto(URL+'?m=studio&view=3d&space=normal');await p.waitForTimeout(1500);
  const r=await p.evaluate(async([shape,bpm,seed])=>{const s=document.getElementById('shape');s.value=shape;s.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,800));
    let sd=seed;Math.random=function(){sd=(sd+0x6D2B79F5)>>>0;let t=sd;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};   // seeded: the same run every time
    if(!S.slimeMode)$("slimeBig").click();S.autoNotes=true;S.randomShape=false;_keyPinned=true;setBpm(bpm);S.spin=14;
    if(!S.playing)setPlaying(true);await new Promise(r=>setTimeout(r,300));
    balls.length=0;particles.length=0;fillState='fill';fillBeats=0;startBreak=function(){};drumOn=false;bandOn=false;playSynth=function(){};sendMidi=function(){};
    let hits=0;const t=trigger;trigger=function(c,i,g,now){if(!now)hits++;return t.apply(this,arguments);};
    const real=performance.now.bind(performance);let T=real();performance.now=()=>T;
    const barT=60/S.bpm*beatsPerBar()*60,perBar=[],ks=[];let bs=0,bn=0,ticks=0,lastStep=_melStepN,jump=0;
    try{for(let bar=0;bar<48;bar++){hits=0;
        if(bar%8===7){_lastBreak=0;breakWall();}if(bar%24===23)repairWall();
        for(let i=0;i<barT;i++){T+=1000/60;update(T);ticks++;if(bar>=24){bs+=balls.length;bn++;}   // update(): the auto-notes run there, not in simTick
          if(_melStepN!==lastStep){lastStep=_melStepN;ks.push(AUTO.k);if(ks.length>1)jump=Math.max(jump,Math.abs(ks[ks.length-1]-ks[ks.length-2]));}}
        perBar.push(hits);}}
    finally{performance.now=real;trigger=t;setPlaying(false);}
    const late=perBar.slice(24),mean=late.reduce((a,x)=>a+x,0)/late.length;
    return {shape:String(S.shape),aim:autoAim(),mean,early:perBar.slice(0,8).reduce((a,x)=>a+x,0)/8,k:AUTO.k,jump,balls:bs/bn};},[shape,bpm,seed]);
  ok(Math.abs(r.mean-r.aim)<=r.aim*0.2,'['+shape+' '+bpm+' bpm seed '+seed+'] settles near its own pace: '+r.mean.toFixed(1)+' notes a bar over bars 24-48, aim '+r.aim.toFixed(1)+' (first 8 bars '+r.early.toFixed(1)+', knob '+r.k.toFixed(2)+', '+r.balls.toFixed(1)+' balls)');
  ok(r.jump<0.1,'['+shape+' '+bpm+' bpm] and it glides: the knob moves at most '+r.jump.toFixed(3)+' between two beats');
  ok(errs.length===0,'['+shape+' '+bpm+' bpm] no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}
 // 4. it only ever thins the melody's own balls: balls a hand dropped are never melted, however full the tank
 {const ctx=await b.newContext({viewport:{width:1000,height:900}});const p=await ctx.newPage();
  await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');}catch(e){}});
  await p.goto(URL+'?m=studio&view=3d&space=normal');await p.waitForTimeout(1500);
  const r=await p.evaluate(async()=>{const s=document.getElementById('shape');s.value='tetra';s.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,800));
    if(!S.slimeMode)$("slimeBig").click();S.autoNotes=true;_keyPinned=true;if(!S.playing)setPlaying(true);
    balls.length=0;drumOn=false;bandOn=false;playSynth=function(){};sendMidi=function(){};startBreak=function(){};
    for(let i=0;i<8;i++)spawn(CX+(i-4)*12,CY);const hand=balls.slice();
    const real=performance.now.bind(performance);let T=real();performance.now=()=>T;
    try{for(let i=0;i<8*180;i++){T+=1000/60;update(T);}}finally{performance.now=real;}
    return {melted:hand.filter(b=>b.leave||!balls.includes(b)).length,room:autoRoom()};});
  ok(r.melted===0,'a hand\'s balls are never melted: 8 dropped into a tetrahedron, '+r.melted+' melted after 8 bars (room '+r.room+')');
  await ctx.close();}
 // 5. a ball flying off through an open wall is not "in the tank": it makes no notes, so it must not block new ones
 // (it used to, for ~3 s after every wall opened, and the tank fell quiet)
 {const ctx=await b.newContext({viewport:{width:1000,height:900}});const p=await ctx.newPage();
  await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');}catch(e){}});
  await p.goto(URL+'?m=studio&view=3d&space=normal');await p.waitForTimeout(1500);
  const r=await p.evaluate(async()=>{const s=document.getElementById('shape');s.value='6';s.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,800));
    if(!S.slimeMode)$("slimeBig").click();S.autoNotes=true;_keyPinned=true;if(!S.playing)setPlaying(true);
    balls.length=0;drumOn=false;bandOn=false;playSynth=function(){};sendMidi=function(){};startBreak=function(){};
    for(let i=0;i<9;i++){spawn(CX,CY);const q=balls[balls.length-1];const a=i*0.7;q.x=q.px=CX+Math.cos(a)*(R+150);q.y=q.py=CY+Math.sin(a)*(R+150);q.vx=-Math.sin(a)*0.3;q.vy=Math.cos(a)*0.3;q.auto=0;}   // nine a hand dropped, past the walls, drifting slowly (more than any room; a hand's balls never melt)
    const out=balls.slice(),real=performance.now.bind(performance);let T=real();performance.now=()=>T;
    try{for(let i=0;i<2*180;i++){T+=1000/60;update(T);}}finally{performance.now=real;}
    return {fresh:balls.filter(b=>!out.includes(b)).length,inside:ballsIn()};});
  ok(r.fresh>0,'balls flying off outside the walls do not block new notes (9 outside; '+r.fresh+' new in 2 bars)');
  await ctx.close();}
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'auto adjuster pass clean'));
 process.exit(FAIL.length?1:0);})();

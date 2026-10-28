// ============================================================================================
//  VST PARITY NUMBERS -- what the web tank does, in numbers, so the plugin's tank can be held to it.
//  Plays the real app in studio, 3D, at the start state of _docs/specs/2026-10-28-tank-headless/spec.md:
//  6 walls, C major, 2 octaves, 80 bpm, quantize on (1/16, swing 0.15), slime on, auto-notes on, spin 0.
//  Pinned so only the tank and the melody move: key journey off (_keyPinned), MODS still, chord stays on the home
//  chord (the chord brain is not called), no burst / reform, no drums or band (their clock is the audio clock).
//  Math.random is seeded per run, and the clock is a counter stepped one 60 Hz tick at a time, so 200 bars take
//  about a minute instead of ten (SPEEDCHECK=1 compares that against a real-time run first). The physics reads three
//  things the 3D draw keeps up (the view tilt, a healing wall, the fill), so the fast loop runs those per tick too.
//  For each run it counts what a listener hears from the tank:
//    1. hits per bar
//    2. the share of hits that sound within 20 ms of a grid line
//    3. the share of hits that are front/back pane chimes
//    4. how loud a gooed hit is next to a clean one (mean level ratio, wall hits only)
//    5. how full the tank is after 64 bars
//  and writes mean + standard deviation over the runs to the spec folder's web-stats.json.
//  SABOTAGE=quantoff runs it again with quantize off and checks "share on grid" leaves the mean +- 2 sd band
//  (proof the instrument can tell). It never overwrites web-stats.json.
//  Env: BARS (200), RUNS (5), WALLS (break = a wall opens every 8 bars and heals every 24, as in the app; shut =
//  walls never open), SABOTAGE, SPEEDCHECK.
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-vstparity.js
// ============================================================================================
const {launch}=require('./browser');
const fs=require('fs'),path=require('path');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html';
const BARS=+(process.env.BARS||200),RUNS=+(process.env.RUNS||5),WALLS=process.env.WALLS||'break';
const SAB=process.env.SABOTAGE||'',SPEEDCHECK=!!process.env.SPEEDCHECK;
const OUT=process.env.OUT||path.join(__dirname,'..','_docs','specs','2026-10-28-tank-headless','web-stats.json');
const SEEDS=[11,22,33,44,55,66,77,88,99,111].slice(0,RUNS);

// one run, inside the page. fast=true: the clock is a counter. fast=false: the real clock, the real frame loop.
async function run(b,seed,bars,fast){
 const ctx=await b.newContext({viewport:{width:1100,height:900}});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message);});
 await p.addInitScript(()=>{try{['slimehedron-coach','slimehedron-coach-studio','slimehedron-tapped'].forEach(k=>localStorage.setItem(k,'1'));
   localStorage.setItem('slimehedron-slime','0');}catch(e){}});
 await p.goto(URL+'?m=studio&view=3d');await p.waitForTimeout(1500);
 await p.evaluate(([seed,fast,walls,sab])=>{
   // seeded Math.random (mulberry32): the same seed gives the same run
   let s=seed>>>0;Math.random=function(){s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
   if(fast){window.requestAnimationFrame=()=>0;const T0=performance.now();window.__T=T0;performance.now=()=>window.__T;}
   // the start state: slime on the real way (it sets quantize on, 1/16), then what the plugin pins
   const sb=document.getElementById('slimeBig');if(!sb.classList.contains('on'))sb.click();
   setSliderValue('spin',0);S.spin=0;_keyPinned=true;S.autoNotes=true;S.randomShape=false;S.quantize=sab!=='quantoff';
   drumOn=false;bandOn=false;manualHold=false;window.__setLite(false);
   slimeModStep=function(){};advanceHarmony=function(){};startBreak=function(){};explodeReform=function(){};
   drumSchedule=function(){};clockSchedule=function(){};
   playSynth=function(){window.__vel=arguments[1];};sendMidi=function(){};
   rot=0;rebuild();balls.length=0;particles=[];pendingNotes.length=0;fillState='fill';measuredFill=0;curRootDeg=0;
   _melNext=0;_melStepN=0;lastTick=performance.now();_acc=0;_lastTick=0;
   // every ball hit: when it sounds, how far that is from the grid, pane or wall, gooed or clean, its level
   const rec=[];window.__rec=rec;
   const t0=trigger;trigger=function(c,imp,goo,now,pane){const n0=pendingNotes.length,t=_tickT||performance.now(),prev=lastTick,next=lastTick+tickInterval();window.__vel=null;
     const r=t0.apply(this,arguments);
     if(!now){const q=pendingNotes.length>n0,sound=q?next:t,vel=q?pendingNotes[pendingNotes.length-1].vel:window.__vel;
       rec.push({t,goo:goo||0,pane:!!pane,vel,grid:Math.min(Math.abs(sound-prev),Math.abs(next-sound))});}return r;};
   // the wall that opens every 8 bars and heals every 24 (the app does it in the chord brain, which is off here)
   const barMs=4*60000/S.bpm;window.__bar=0;window.__fill64=null;window.__ballsSum=0;window.__ballsN=0;window.__k=0;let barAt=performance.now()+barMs;
   window.__barTick=function(){const n=performance.now();while(n>=barAt){barAt+=barMs;window.__bar++;
       if(walls==='break'&&fillState==='fill'){_wallBars++;if(_wallBars%8===0)breakWall();if(_wallBars%24===0)repairWall();}
       if(window.__bar===64){measureFill();window.__fill64=measuredFill;}}
     window.__ballsSum+=balls.length;window.__ballsN++;};
   if(!fast){const u=update;update=function(now){const r=u.apply(this,arguments);window.__barTick();return r;};}
   setPlaying(true);lastTick=performance.now();
 },[seed,fast,WALLS,SAB]);
 if(fast){
   // one 60 Hz tick at a time, then what the 3D draw (glFrame) does that the physics reads back: the view's slow tilt
   // (viewTick: the goo and balls fall toward its 'down'), a healing wall fading back in (wallUpkeep), the fill (measureFill)
   const ticks=Math.round(bars*4*60/80*60);let k=0;
   while(k<ticks){const n=Math.min(1800,ticks-k);await p.evaluate(n=>{for(let i=0;i<n;i++){window.__T+=FIXED;update(window.__T);viewTick();wallUpkeep(false);if(++window.__k%10===0)measureFill();window.__barTick();}},n);k+=n;}
 }else{await p.waitForFunction(b=>window.__bar>=b,bars,{timeout:bars*3000+60000,polling:500});}
 const r=await p.evaluate(bars=>{const rec=window.__rec.filter(x=>x.vel!=null),wall=rec.filter(x=>!x.pane);
   const gooed=wall.filter(x=>x.goo>0),clean=wall.filter(x=>!(x.goo>0)),mean=a=>a.reduce((s,x)=>s+x.vel,0)/Math.max(1,a.length);
   return {hits:rec.length,hitsPerBar:rec.length/bars,onGrid:rec.filter(x=>x.grid<=20).length/Math.max(1,rec.length),
     paneShare:rec.filter(x=>x.pane).length/Math.max(1,rec.length),gooLevel:gooed.length&&clean.length?mean(gooed)/mean(clean):null,
     gooedHits:gooed.length,parts:particles.length,pooled:particles.filter(q=>q.pooled).length,fill64:window.__fill64,meanBalls:window.__ballsSum/Math.max(1,window.__ballsN),
     div:S.div,swing:S.swing,quantize:S.quantize,spin:S.spin,shape:S.shape,root:S.root,scale:S.scale,octs:S.octs,bpm:S.bpm,chaos:S.chaos,
     velMin:S.velMin,velMax:S.velMax,velRand:S.velRand,curRootDeg,walls:edges.length};},bars);
 r.errors=errs.slice(0,3);await ctx.close();return r;}

const KEYS=['hitsPerBar','onGrid','paneShare','gooLevel','fill64'];
const stats=rs=>{const o={};for(const k of KEYS){const v=rs.map(r=>r[k]).filter(x=>x!=null),m=v.reduce((a,b)=>a+b,0)/Math.max(1,v.length);
  o[k]={mean:+m.toFixed(4),sd:+(v.length>1?Math.sqrt(v.reduce((a,b)=>a+(b-m)*(b-m),0)/(v.length-1)):0).toFixed(4),n:v.length};}return o;};
const show=(L,r)=>console.log('  '+L+' hits/bar '+r.hitsPerBar.toFixed(2)+'  on grid '+(r.onGrid*100).toFixed(1)+'%  panes '+(r.paneShare*100).toFixed(1)+
  '%  goo level x'+(r.gooLevel==null?'-':r.gooLevel.toFixed(3))+' ('+r.gooedHits+' gooed)  fill@64 '+(r.fill64==null?'-':r.fill64.toFixed(3))+'  balls '+r.meanBalls.toFixed(1)+'  drops '+r.parts+' pooled '+r.pooled);

(async()=>{const b=await launch();
 if(SPEEDCHECK){
   // the fast clock must not change the physics: same seeds, real time vs counter, 20 bars each
   const fast=[],real=[];for(const s of SEEDS.slice(0,3)){fast.push(await run(b,s,20,true));real.push(await run(b,s,20,false));
     show('fast s'+s,fast[fast.length-1]);show('real s'+s,real[real.length-1]);}
   const F=stats(fast),Rl=stats(real);
   for(const k of ['hitsPerBar','onGrid','paneShare']){const d=Math.abs(F[k].mean-Rl[k].mean),band=2*Math.max(F[k].sd,Rl[k].sd,k==='hitsPerBar'?0.1:0.02);
     ok(d<=band,'fast clock = real clock for '+k+': '+F[k].mean+' vs '+Rl[k].mean+' (allowed '+band.toFixed(3)+')');}
   await b.close();process.exit(FAIL.length?1:0);}
 const rs=[];for(const s of SEEDS){const r=await run(b,s,BARS,true);show((SAB?'['+SAB+'] ':'')+'seed '+s,r);rs.push(r);
   ok(!r.errors.length,'seed '+s+': no page errors'+(r.errors.length?': '+r.errors[0]:''));}
 await b.close();
 const st=stats(rs);
 ok(st.hitsPerBar.mean>0.5,'the tank plays ('+st.hitsPerBar.mean+' hits a bar)');
 ok(st.paneShare.mean>0,'the panes chime ('+(st.paneShare.mean*100).toFixed(1)+'% of hits)');
 ok(st.gooLevel.n===rs.length&&st.gooLevel.mean<1,'gooed hits are softer than clean ones (x'+st.gooLevel.mean+')');
 ok(st.fill64.mean>0,'the goo fills (fill at bar 64 '+st.fill64.mean+')');
 ok(rs.every(r=>r.curRootDeg===0&&r.spin===0&&r.div===0.0625&&r.quantize===(SAB!=='quantoff')),'the start state held (home chord, spin 0, 1/16, quantize '+(SAB!=='quantoff'?'on':'off')+')');
 if(SAB){
   const base=JSON.parse(fs.readFileSync(OUT,'utf8')).stats,lo=base.onGrid.mean-2*base.onGrid.sd,hi=base.onGrid.mean+2*base.onGrid.sd;
   ok(st.onGrid.mean<lo||st.onGrid.mean>hi,'SABOTAGE '+SAB+': share on grid '+st.onGrid.mean+' is outside the web band '+lo.toFixed(4)+'..'+hi.toFixed(4));
 }else if(!FAIL.length){
   const r0=rs[0];
   fs.writeFileSync(OUT,JSON.stringify({made:new Date().toISOString().slice(0,10),by:'_dev/dev-vstparity.js',bars:BARS,runs:RUNS,seeds:SEEDS,walls:WALLS,
     start:{view:'3d',shape:r0.shape,walls:r0.walls,root:r0.root,scale:r0.scale,octs:r0.octs,bpm:r0.bpm,div:r0.div,swing:r0.swing,quantize:true,spin:0,chaos:r0.chaos,
       velRand:r0.velRand,velMin:r0.velMin,velMax:r0.velMax,curRootDeg:0},
     pinned:'lite look off, key journey off, MODS still, chord brain not called (home chord), no burst/reform, drums and band off, Math.random seeded, 60 Hz counter clock, measureFill every 10 ticks',
     defs:{hitsPerBar:'ball hits (walls + panes) per 4/4 bar',onGrid:'share of hits that sound within 20 ms of a 1/16 grid line (a queued note sounds on the next line)',
       paneShare:'share of hits that are pane chimes',gooLevel:'mean velocity of gooed wall hits / mean velocity of clean wall hits',fill64:'measuredFill after 64 bars (3D: pooled drops / (partCap*0.92))'},
     stats:st,perRun:rs.map(r=>({hitsPerBar:r.hitsPerBar,onGrid:r.onGrid,paneShare:r.paneShare,gooLevel:r.gooLevel,fill64:r.fill64,meanBalls:r.meanBalls}))},null,1)+'\n');
   console.log('\n  wrote '+path.relative(process.cwd(),OUT));}
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'vst parity pass clean'));
 process.exit(FAIL.length?1:0);})();

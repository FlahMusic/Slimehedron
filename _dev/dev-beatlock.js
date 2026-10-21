// ============================================================================================
//  BEAT-LOCK TEST — a ball's bounce, its wall's flash, its goo splash and its NOTE are one moment.
//  Quantize used to hold a ball's note to the next grid line, up to a whole step (375ms at 1/8) after the
//  ball visibly hit the wall. Now balls steer their speed a little so they reach walls ON the grid.
//  Measured with the real clock, balls really flying, in the flat tank, the 3D box and a 3D solid:
//    1. sight and sound: no note ever sounds more than 45ms after its ball hit the wall
//    2. still musical: most notes still land within 45ms of a grid line (the steering is doing it)
//    3. no ball is steered faster or slower than about a fifth
//    4. a ball in the goo plays as it hits; quantize off plays as it hits and steers nothing
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-beatlock.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html';
const SECS=+(process.env.SECS||20);

(async()=>{const b=await launch();
 const open=async(view)=>{const ctx=await b.newContext({viewport:{width:1100,height:900}});const p=await ctx.newPage();
   const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message);});
   await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1')}catch(e){}});
   await p.goto(URL+'?m=studio&view='+view);await p.waitForTimeout(1500);return {ctx,p,errs};};
 // records every ball note: when the ball hit, when the note actually sounds, how far that is from the grid
 const RUN=async(p,shape,secs,quant)=>p.evaluate(async([shape,secs,quant])=>{const sel=document.getElementById('shape');sel.value=shape;sel.dispatchEvent(new Event('change'));
   S.slimeMode=false;S.rain=false;S.randomShape=false;S.quantize=quant;setPlaying(true);startBreak=function(){};
   balls.length=0;for(let i=0;i<6;i++)spawn(CX+Math.cos(i)*60,CY+Math.sin(i)*60);
   const rec=[];let tqMin=9,tqMax=0;
   const t0=trigger;trigger=function(c,imp,goo,now,pane){const n0=pendingNotes.length,t=_tickT||performance.now(),prev=lastTick,next=lastTick+tickInterval();const r=t0.apply(this,arguments);
     if(!now){const q=pendingNotes.length>n0,sound=q?next:t;rec.push({goo:!!goo,pane:!!pane,delay:sound-t,grid:Math.min(Math.abs(sound-prev),Math.abs(next-sound))});}return r;};
   const iv=setInterval(()=>{for(const x of balls){const q=x.tq||1;tqMin=Math.min(tqMin,q);tqMax=Math.max(tqMax,q);}},50);
   await new Promise(r=>setTimeout(r,secs*1000));trigger=t0;clearInterval(iv);
   const dry=rec.filter(x=>!x.goo);
   return {n:rec.length,dry:dry.length,late:dry.filter(x=>x.delay>45).length,worst:Math.max(0,...dry.map(x=>x.delay)),
     onGrid:dry.filter(x=>x.grid<=45).length,tqMin,tqMax,goo:rec.filter(x=>x.goo).map(x=>x.delay)};},[shape,secs,quant]);

 for(const [view,shape] of [['2d','6'],['3d','6'],['3d','icosa']]){
  const L='['+view+' '+shape+'] ';
  const {ctx,p,errs}=await open(view);
  const r=await RUN(p,shape,SECS,true);
  ok(r.dry>=25,L+'balls are bouncing and playing ('+r.dry+' notes in '+SECS+'s)');
  ok(r.late===0,L+'no note sounds more than 45ms after its ball hit (worst '+r.worst.toFixed(0)+'ms; it used to be up to a whole step)');
  ok(r.onGrid>=r.dry*0.75,L+'and the music is still on the grid: '+r.onGrid+'/'+r.dry+' notes within 45ms of a grid line');
  ok(r.tqMin>=0.79&&r.tqMax<=1.23,L+'no ball is steered by more than about a fifth (speed x'+r.tqMin.toFixed(2)+' to x'+r.tqMax.toFixed(2)+')');
  ok(errs.length===0,L+'no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}

 // a ball in the goo, and quantize off: the note is never held back, and nothing is steered
 {const {ctx,p,errs}=await open('3d');
  const g=await p.evaluate(()=>{const sel=document.getElementById('shape');sel.value='cube';sel.dispatchEvent(new Event('change'));
    S.slimeMode=false;S.rain=false;S.quantize=true;setPlaying(true);startBreak=function(){};balls.length=0;particles.length=0;
    for(let i=0;i<300;i++){const a=Math.random()*6.28,c=Math.random()*2-1,r=Math.cbrt(Math.random())*50,s=Math.sqrt(1-c*c);
      particles.push({x:CX+Math.cos(a)*s*r,y:CY+Math.sin(a)*s*r,z:0.5+c*r/BOXD,vx:0,vy:0,vz:0,r:8,hue:0,pooled:true,age:80});}
    buildGooHash();const n0=pendingNotes.length;lastTick=performance.now()-60;_tickT=performance.now();   // mid-step: a dry note here would wait
    let played=0;const ps=playSynth;playSynth=function(){played++;return ps.apply(this,arguments);};
    trigger(0,0.8,0.7);const goo={queued:pendingNotes.length>n0,played};played=0;trigger(0,0.8,0);const dry={queued:pendingNotes.length>n0,played};
    pendingNotes.length=0;playSynth=ps;
    spawn(CX,CY);const B=balls[balls.length-1];B.z=0.5;B.tq=1.15;beatLock(B,performance.now());const inGoo=B.tq;
    return {goo,dry,inGoo};});
  ok(!g.goo.queued&&g.goo.played===1,'a ball in the goo plays the moment it hits, never held for the grid');
  ok(g.inGoo<1.15,'and a ball in the goo is not steered: it eases back to its own speed (x1.15 -> x'+g.inGoo.toFixed(3)+')');
  const off=await RUN(p,'6',8,false);
  ok(off.late===0&&off.tqMax<=1.0001&&off.tqMin>=0.9999,'quantize off: every note as it hits ('+off.late+' late) and no ball steered');
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'beat-lock pass clean'));
 process.exit(FAIL.length?1:0);})();

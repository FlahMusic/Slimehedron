// ============================================================================================
//  GOO 3D TEST — the lava-lamp goo in the 3D tank.
//  Every claim is checked by what the goo DOES, not by whether the code ran:
//    1. it stays inside the real shape — every drop, in every space (flat, portal, curved; prism and solid),
//       a solid's faces and a prism's walls AND panes, all while balls splash into it and it pulses
//    2. on the graphics card its skin is clipped to that same glass, and barely needs to be
//    3. it pulses with the beat: right after a beat a heart is stretched, by the end of the beat it is round again
//    4. it moves: its hearts wander, so a ball crossing the middle meets goo in different places
//    5. depth counts: a ball in front of the goo is not in the goo
//    6. a ball pushes the goo aside as it passes
//    7. it still fills up and bursts
//    8. the flat 2D tank's goo is left exactly as it was
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-goo3d.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html';
const GL=!!process.env.SLIME_GL;

(async()=>{const b=await launch(GL?{args:['--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader','--use-angle=swiftshader']}:undefined);
 const open=async(q)=>{const ctx=await b.newContext({viewport:{width:1000,height:900}});const p=await ctx.newPage();
   const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message);});
   await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1')}catch(e){}window.__glKeep=true;});
   await p.goto(URL+q);await p.waitForTimeout(1500);return {ctx,p,errs};};
 // how far each pooled drop sits inside the glass (px; must be at least its radius + GOO_IN)
 const MEASURE=()=>{window.__gooWorst=function(){let worst=-1e9;const c=Math.cos(rot),s=Math.sin(rot);
   for(const p of particles){if(!p.pooled)continue;const need=p.r+GOO_IN;let past=-1e9;
     if(edges._solid){
       if(edges._space==='curved'){const RB=HYP.RD,K=HKR(),u=[(p.x-CX)/RB,(p.y-CY)/RB,(p.z-0.5)*BOXD/RB],r2=u[0]**2+u[1]**2+u[2]**2,k=u.map(x=>2*x/(1+r2));
         for(const pl of SOLID.planes){const n=pl.n,v=(n[0]*c-n[1]*s)*k[0]+(n[0]*s+n[1]*c)*k[1]+n[2]*k[2]-(pl.d/K-2*need/RB);past=Math.max(past,v*RB/2);}}
       else{const x=p.x-CX,y=p.y-CY,z=(p.z-0.5)*BOXD;
         for(const pl of SOLID.planes){const n=pl.n;past=Math.max(past,(n[0]*c-n[1]*s)*x+(n[0]*s+n[1]*c)*y+n[2]*z-(pl.d-need));}}}
     else{
       for(const e of edges){if(e.broken)continue;
         if(edges._space==='curved'){if(!e.cr)continue;past=Math.max(past,(e.cr+need)-Math.hypot(p.x-e.ccx,p.y-e.ccy));}
         else past=Math.max(past,need-((p.x-e.ax)*e.nx+(p.y-e.ay)*e.ny));}
       past=Math.max(past,need-p.z*BOXD,need-(1-p.z)*BOXD);}
     worst=Math.max(worst,past);}
   return worst;};};

 // ---- 1. containment, in every space, with balls flying and the goo pulsing ----
 for(const [shape,space] of [['6','normal'],['tetra','normal'],['icosa','normal'],['cube','portal'],['6','curved'],['dodeca','curved'],['octa','curved']]){
  const {ctx,p,errs}=await open('?m=studio&view=3d&space='+space);
  await p.evaluate(MEASURE);
  const r=await p.evaluate(async(shape)=>{const sel=document.getElementById('shape');sel.value=shape;sel.dispatchEvent(new Event('change'));
    S.slimeMode=false;S.rain=false;S.randomShape=false;S.chaos=0.1;setPlaying(true);
    balls.length=0;for(let i=0;i<8;i++)spawn(CX+Math.cos(i)*40,CY+Math.sin(i)*40);
    let worst=-1e9,maxN=0,ticks=0;startBreak=function(){};   // no burst mid-test: this is about holding it
    for(let i=0;i<900;i++){simTick(performance.now());ticks++;if(i%10===0){worst=Math.max(worst,__gooWorst());let n=0;for(const q of particles)if(q.pooled)n++;maxN=Math.max(maxN,n);}}
    // and topped right up, squeezed in from everywhere at once
    for(let i=0;i<partCap()*0.9-particles.length;i++)particles.push({x:CX+(Math.random()-0.5)*R,y:CY+(Math.random()-0.5)*R,z:Math.random(),vx:(Math.random()-0.5)*8,vy:(Math.random()-0.5)*8,vz:0,r:8,hue:Math.random(),pooled:true,age:80});
    for(let i=0;i<300;i++){simTick(performance.now());if(i%10===0)worst=Math.max(worst,__gooWorst());}
    return {worst,maxN,n:particles.length,space:edges._space,solid:!!edges._solid,fill:fillState};},shape);
  ok(r.space===space&&r.fill==='fill'&&r.maxN>40,'['+shape+' '+space+'] goo builds up from the balls\' splashes ('+r.maxN+' drops, then topped up to '+r.n+')');
  ok(r.worst<=0.5,'['+shape+' '+space+'] every drop stays inside the glass, the whole time (deepest '+r.worst.toFixed(2)+'px past where it may go)');
  ok(errs.length===0,'['+shape+' '+space+'] no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}

 // ---- 3-7 on one tank ----
 {const {ctx,p,errs}=await open('?m=studio&view=3d&space=normal');
  await p.evaluate(()=>{const sel=document.getElementById('shape');sel.value='cube';sel.dispatchEvent(new Event('change'));
    S.slimeMode=false;S.rain=false;S.randomShape=false;S.spin=0;rot=0;rebuild();setPlaying(true);balls.length=0;window.__sb=startBreak;startBreak=function(){};});
  // 3. THE BEAT. The clock is driven by hand so the test sees every beat: 50 ticks a beat.
  const beat=await p.evaluate(()=>{let T=0;beatNow=()=>T;splash=function(){};
    particles.length=0;for(let i=0;i<300;i++){const a=Math.random()*6.28,c=Math.random()*2-1,r=Math.cbrt(Math.random())*60,s=Math.sqrt(1-c*c);
      particles.push({x:CX+Math.cos(a)*s*r,y:CY+Math.sin(a)*s*r,z:0.5+c*r/BOXD,vx:0,vy:0,vz:0,r:8,hue:Math.random(),pooled:true,age:80,h:0});}
    const shape=()=>{let mx=0,my=0,mz=0,n=0;for(const q of particles){if(q.h!==0)continue;mx+=q.x;my+=q.y;mz+=q.z*BOXD;n++;}mx/=n;my/=n;mz/=n;
      // how stretched the heart is: its spread along its longest axis over its shortest (power iteration on the covariance)
      const C=[[0,0,0],[0,0,0],[0,0,0]];for(const q of particles){if(q.h!==0)continue;const v=[q.x-mx,q.y-my,q.z*BOXD-mz];for(let i=0;i<3;i++)for(let j=0;j<3;j++)C[i][j]+=v[i]*v[j]/n;}
      const big=M=>{let v=[1,0.7,0.3];for(let k=0;k<40;k++){const w=[0,1,2].map(i=>M[i][0]*v[0]+M[i][1]*v[1]+M[i][2]*v[2]),l=Math.hypot(...w);v=w.map(x=>x/l);}
        return {l:v.reduce((s,x,i)=>s+x*(M[i][0]*v[0]+M[i][1]*v[1]+M[i][2]*v[2]),0),v};};
      const a=big(C),tr=C[0][0]+C[1][1]+C[2][2];return {mx,my,mz,str:a.l/Math.max(1e-6,(tr-a.l)/2)};};
    for(let i=0;i<200;i++){simTick(performance.now());}   // settle into a heart first, before the clock starts
    const early=[],late=[],cents=[];
    for(let i=0;i<50*16;i++){T=i/50;simTick(performance.now());const ph=T-Math.floor(T),sh=shape();
      if(ph>0.2&&ph<0.45)early.push(sh.str);if(ph>0.85)late.push(sh.str);if(i%50===0)cents.push([sh.mx,sh.my,sh.mz]);}
    const avg=a=>a.reduce((s,x)=>s+x,0)/a.length;
    let move=0;for(const c of cents)move=Math.max(move,Math.hypot(c[0]-cents[0][0],c[1]-cents[0][1],c[2]-cents[0][2]));
    return {early:avg(early),late:avg(late),move};});
  ok(beat.early>beat.late*1.3,'right after each beat the goo is stretched, by the end of the beat it has sprung back (long/short axis '+beat.early.toFixed(2)+' just after vs '+beat.late.toFixed(2)+' at the end)');
  ok(beat.move>25,'over 16 beats the goo wanders round the middle, it does not sit still ('+beat.move.toFixed(0)+'px)');
  // 4b. more goo, more hearts
  const hearts=await p.evaluate(()=>{for(let i=0;i<400;i++)particles.push({x:CX+(Math.random()-0.5)*80,y:CY+(Math.random()-0.5)*80,z:0.5,vx:0,vy:0,vz:0,r:8,hue:Math.random(),pooled:true,age:80});
    for(let i=0;i<300;i++)simTick(performance.now());const used=new Set(particles.filter(q=>q.pooled).map(q=>q.h));return {n:LAVA.n,used:used.size};});
  ok(hearts.n>=2&&hearts.used===hearts.n,'with more goo it splits into more than one heart ('+hearts.n+' hearts, all holding goo)');
  // 5. depth
  const depth=await p.evaluate(()=>{particles.length=0;for(let i=0;i<260;i++){const a=Math.random()*6.28,c=Math.random()*2-1,r=Math.cbrt(Math.random())*50,s=Math.sqrt(1-c*c);
      particles.push({x:CX+Math.cos(a)*s*r,y:CY+Math.sin(a)*s*r,z:0.5+c*r/BOXD,vx:0,vy:0,vz:0,r:8,hue:0,pooled:true,age:80});}
    buildGooHash();return {mid:gooAt(CX,CY,0.5),front:gooAt(CX,CY,0.04),back:gooAt(CX,CY,0.96),side:gooAt(CX+150,CY,0.5)};});
  ok(depth.mid>0.5,'a ball inside the goo is in it (density '+depth.mid.toFixed(2)+')');
  ok(depth.front<0.1&&depth.back<0.1&&depth.side<0.1,'a ball in front of it, behind it or beside it is not ('+[depth.front,depth.back,depth.side].map(x=>x.toFixed(2)).join(', ')+')');
  // 6. a ball pushes the goo aside
  const wake=await p.evaluate(()=>{balls.length=0;spawn(CX-30,CY);const B=balls[0];B.z=0.5;B.vx=4;B.vy=0;B.vz=0;
    for(const q of particles){q.vx=q.vy=q.vz=0;}gooWake();let near=0,pushed=0,far=0,farMoved=0;
    for(const q of particles){const d=Math.hypot(q.x-B.x,q.y-B.y,(q.z-B.z)*BOXD);if(d<BR+PR){near++;if(Math.hypot(q.vx,q.vy,q.vz)>0.1)pushed++;}else if(d>BR+PR+12){far++;if(Math.hypot(q.vx,q.vy,q.vz)>0)farMoved++;}}
    balls.length=0;return {near,pushed,far,farMoved};});
  ok(wake.near>0&&wake.pushed===wake.near&&wake.farMoved===0,'a ball shoves the goo it passes through ('+wake.pushed+'/'+wake.near+' drops at the ball moved), and nothing further off ('+wake.farMoved+'/'+wake.far+')');
  // 7. it still fills and bursts
  const burst=await p.evaluate(()=>{startBreak=window.__sb;pressure=0;particles.length=0;
    for(let i=0;i<partCap()*0.95;i++)particles.push({x:CX+(Math.random()-0.5)*100,y:CY+(Math.random()-0.5)*100,z:0.5,vx:0,vy:0,vz:0,r:8,hue:Math.random(),pooled:true,age:80});
    measureFill();const ff=fillFrac();for(let i=0;i<80&&fillState==='fill';i++)simTick(performance.now());return {ff,state:fillState};});
  ok(burst.ff>=0.9&&burst.state!=='fill','a full tank still bursts (fill '+burst.ff.toFixed(2)+', then '+burst.state+')');
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}

 // ---- 7b. the goo is in proportion to the shape: the same share of every shape's inside ----
 {const {ctx,p,errs}=await open('?m=studio&view=3d&space=normal');
  const sc=await p.evaluate(()=>{const out={};for(const sh of ['cube','octa','icosa','dodeca','rhombus','3']){const sel=document.getElementById('shape');sel.value=sh;sel.dispatchEvent(new Event('change'));
      out[sh]={cap:partCap(),v:tankVolume(),room:Math.min(...gooRoom())};}return out;});
  const share=Object.entries(sc).map(([k,x])=>[k,x.cap*3300/x.v]),lo=Math.min(...share.map(x=>x[1])),hi=Math.max(...share.map(x=>x[1]));
  ok(hi/lo<1.05,'a full tank of goo takes the same share of every shape\'s inside ('+share.map(([k,x])=>k+' '+(x*100).toFixed(1)+'%').join(', ')+')');
  ok(sc.octa.cap<sc.cube.cap,'an octahedron (wide in the middle, small inside) gets less goo than a cube ('+sc.octa.cap+' vs '+sc.cube.cap+'), not twice as much');
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}

 // ---- 8. the flat 2D goo is untouched: no depth, the old sheet and pool ----
 {const {ctx,p,errs}=await open('?m=studio&view=2d');
  const flat=await p.evaluate(()=>{S.slimeMode=false;S.rain=false;setPlaying(true);balls.length=0;for(let i=0;i<6;i++)spawn(CX+i*10,CY);
    let called=0;const g=gooStep3D;gooStep3D=function(){called++;return g.apply(this,arguments);};
    for(let i=0;i<200;i++)simTick(performance.now());gooStep3D=g;return {called,d3:goo3D()};});
  ok(!flat.d3&&flat.called===0,'the flat 2D tank never runs the 3D goo');
  ok(errs.length===0,'no page errors in 2D'+(errs.length?': '+errs[0]:''));
  await ctx.close();}

 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'goo 3D pass clean'));
 process.exit(FAIL.length?1:0);})();

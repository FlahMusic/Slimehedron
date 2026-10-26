// ============================================================================================
//  PORTAL SPACE: TWO WORMHOLES (see PORTAL SPACE in index.html, THE WORMHOLES in tank3d.js).
//  Flah: portals "look like shit ... like they are just despawning". Every check is about what you would
//  SEE and HEAR, measured off the running physics and the renderers:
//    1. every shape can be portal space now (no gluing to fit), in 2D, in the 3D box and in solids
//    2. there are two holes, each lying ON a wall (or face), inside it, open, never overlapping each other
//    3. a ball that meets a hole is drawn INTO it (moving to its middle, shrinking, stretched toward it),
//       is gone for a moment but never lost, and comes out of the OTHER hole: inside the tank, at that hole,
//       heading away from its wall, at the same speed, drawn small and swelling to its size, ringing the
//       note of the wall it came out of
//    4. a ball that hits a wall anywhere else bounces off it as always and rings it: not every note is a portal
//    5. the holes move WITH THE MUSIC: they slide in the first part of each beat and rest in the rest, they visit
//       several walls, and they shrink to slip round a corner instead of hanging off it
//    6. a busy tank: no ball is ever lost, some go through, most do not
//    7. on the graphics card the two holes are drawn (and not in a normal tank), and they are clearly coloured
//    8. lessons never have them
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-portal.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html';

(async()=>{const b=await launch();
 const open=async(q)=>{const ctx=await b.newContext({viewport:{width:1100,height:860}});
   await ctx.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');}catch(e){}});
   const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(URL+q);await p.waitForTimeout(1300);return {ctx,p,errs};};
 const setShape=(p,sh)=>p.evaluate(async sh=>{const rs=document.getElementById('randShapeT');if(rs&&rs.classList.contains('on'))rs.click();
   const s=document.getElementById('shape');s.value=sh;s.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,2400));
   startBreak=()=>{};fillState='fill';particles.length=0;},sh);

 // ---- 1. every shape ----
 {const {ctx,p,errs}=await open('?m=studio&view=2d&space=portal');
  const el=await p.evaluate(()=>{const out={};for(const sh of ['3','4','5','6','7','8','trapezoid','star','heart','rhombus'])out[sh]=buildEdges(sh,'portal')._space;
    for(const sh of ['tetra','cube','octa','dodeca','icosa','cube.cut'])out[sh]=spaceFits(sh,'portal');return out;});
  ok(Object.values(el).every(v=>v==='portal'||v===true),'1. every shape can be portal space ('+Object.entries(el).map(([k,v])=>k+':'+(v===true?'yes':v)).join(' ')+')');
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));await ctx.close();}

 // ---- 2-4. per view and shape ----
 for(const [view,shape] of [['2d','6'],['2d','star'],['3d','6'],['3d','cube'],['3d','icosa']]){
  const L='['+view+' '+shape+'] ';
  const {ctx,p,errs}=await open('?m=studio&view='+view+'&space=portal');await setShape(p,shape);
  const r=await p.evaluate(async()=>{
    if(!S.playing)setPlaying(true);await new Promise(r=>setTimeout(r,400));
    // hold the music still so the holes stay put while one ball is followed through
    let T=performance.now();const real=performance.now.bind(performance);performance.now=()=>T;const bn=beatNow;
    let B0=3.8;beatNow=()=>B0;   // late in a beat: the holes are resting in the middle of their wallsS.spin=0;S.chaos=0;
    const tick=(n)=>{for(let i=0;i<n;i++){T+=1000/60;_tickT=T;simTick(T);}};
    tick(30);
    const solid=solid3D()&&!!edges._solid,d3=VIEW.d3&&!_labOn(),W=__worm.P;
    // 2. the two holes: on their wall's plane, inside it, open, apart
    const onWall=W.map(P=>{const X=P.x,Y=P.y,Z=P.z;
      if(solid){const c=Math.cos(rot),s=Math.sin(rot),pl=SOLID.planes[P.face],n=pl.n,nx=n[0]*c-n[1]*s,ny=n[0]*s+n[1]*c;
        const off=nx*X+ny*Y+n[2]*Z-pl.d,inside=SOLID.planes.every((q,j)=>{const m=q.n,mx=m[0]*c-m[1]*s,my=m[0]*s+m[1]*c;return mx*X+my*Y+m[2]*Z<=q.d+0.5;});
        return {off:Math.abs(off),inside,rad:P.rad};}
      const e=edges[P.wall],off=(X+CX-e.ax)*e.nx+(Y+CY-e.ay)*e.ny,L2=Math.hypot(e.bx-e.ax,e.by-e.ay),t=((X+CX-e.ax)*(e.bx-e.ax)+(Y+CY-e.ay)*(e.by-e.ay))/(L2*L2);
      return {off:Math.abs(off),inside:t>=0&&t<=1&&(!d3||Math.abs(Z)<=BOXD/2),rad:P.rad};});
    const apart=Math.hypot(W[0].x-W[1].x,W[0].y-W[1].y,W[0].z-W[1].z)-W[0].rad-W[1].rad;
    // 3. one ball into hole A
    const notes=[];const tr=trigger;trigger=function(c){notes.push(c);return tr.apply(this,arguments);};
    const A=W[0],Bh=W[1];balls.length=0;spawn(CX,CY);const ball=balls[0];const ts=ballSpeed(),d=BR*4;
    ball.x=CX+A.x+A.n[0]*d;ball.y=CY+A.y+A.n[1]*d;if(d3)ball.z=(A.z+A.n[2]*d)/BOXD+0.5;ball.vx=-A.n[0]*ts;ball.vy=-A.n[1]*ts;ball.vz=d3?-A.n[2]*ts/BOXD:0;ball.s3=1;ball.mute=0;ball.trail.length=0;ball.tq=1;
    let n=0;while(!ball.warp&&n<60){tick(1);n++;}
    const went=!!ball.warp,noteIn=notes.length;
    const views=[];if(went){const w=ball.warp,e0=Math.hypot(w.ex[0]-w.c[0],w.ex[1]-w.c[1],w.ex[2]-w.c[2]);for(const dt of [20,70,120,170]){const v=wormView(ball,w.t0+dt);   // null = drawn as usual, where it went in
      views.push(!v?{s:1,sx:1,sy:1,toC:e0}:v.hide?{hide:true}:{s:v.s,sx:v.sx,sy:v.sy,toC:Math.hypot(v.x-w.c[0],v.y-w.c[1],v.z-w.c[2])});}}
    const startToC=went?Math.hypot(ball.warp.ex[0]-ball.warp.c[0],ball.warp.ex[1]-ball.warp.c[1],ball.warp.ex[2]-ball.warp.c[2]):0;
    const r_inSpd=went?(solid?Math.hypot(...ball.warp.v):Math.hypot(ball.warp.v[0],ball.warp.v[1])):0;/* a solid keeps its whole speed; the box side walls work across, depth moves on its own */const count=[];let m=0;while(ball.warp&&m<120){tick(1);m++;count.push(balls.length);}
    const inSpd=r_inSpd,outPos=[ball.x-CX,ball.y-CY,d3?(ball.z-0.5)*BOXD:0],vz=d3?(ball.vz||0)*BOXD:0,sp=solid?Math.hypot(ball.vx,ball.vy,vz):Math.hypot(ball.vx,ball.vy);
    const rel=[outPos[0]-Bh.x,outPos[1]-Bh.y,outPos[2]-Bh.z],along=rel[0]*Bh.n[0]+rel[1]*Bh.n[1]+rel[2]*Bh.n[2],
          across=Math.hypot(rel[0]-along*Bh.n[0],rel[1]-along*Bh.n[1],rel[2]-along*Bh.n[2]),head=(ball.vx*Bh.n[0]+ball.vy*Bh.n[1]+vz*Bh.n[2])/(sp||1);
    const outNote=notes.slice(noteIn),pop=[0,130,250].map(dt=>{const v=wormView(ball,ball.spit+dt);return v?v.s:1;});
    const inside=solid?true:inPoly(ball.x,ball.y,edges._verts);
    // 4. the same wall away from the holes: a bounce
    let bounce=null;
    {const e=solid?null:edges[A.wall];balls.length=0;notes.length=0;spawn(CX,CY);const q=balls[0];q.mute=0;q.s3=1;q.tq=1;
      if(solid){const c=Math.cos(rot),s=Math.sin(rot);let k=-1,bd=-1;   // a face with no hole on it
        SOLID.planes.forEach((pl,j)=>{if(j===A.face||j===Bh.face)return;const dd=Math.min(...[A,Bh].map(P=>{const n=pl.n,nx=n[0]*c-n[1]*s,ny=n[0]*s+n[1]*c;return -(nx*P.n[0]+ny*P.n[1]+n[2]*P.n[2]);}));if(dd>bd){bd=dd;k=j;}});
        const pl=SOLID.planes[k],n=pl.n,nx=n[0]*c-n[1]*s,ny=n[0]*s+n[1]*c,nz=n[2],dd=pl.d-BR*4;
        q.x=CX+nx*dd;q.y=CY+ny*dd;q.z=nz*dd/BOXD+0.5;q.vx=nx*ts;q.vy=ny*ts;q.vz=nz*ts/BOXD;bounce={face:k};}
      else{let best=null,bt=-1;for(const t of [0.15,0.3,0.5,0.7,0.85]){const px=e.ax+(e.bx-e.ax)*t-CX,py=e.ay+(e.by-e.ay)*t-CY,dm=Math.min(...[A,Bh].map(P=>Math.hypot(px-P.x,py-P.y)-P.rad));if(dm>bt){bt=dm;best=[px,py];}}
        q.x=CX+best[0]+e.nx*BR*4;q.y=CY+best[1]+e.ny*BR*4;q.z=0.5;q.vx=-e.nx*ts;q.vy=-e.ny*ts;q.vz=0;bounce={room:bt};}
      let k=0,warped=false;const v0=[q.vx,q.vy];while(k<40){tick(1);k++;if(q.warp){warped=true;break;}if(q.vx*v0[0]+q.vy*v0[1]<0)break;}
      bounce.turned=q.vx*v0[0]+q.vy*v0[1]<0||(solid&&notes.length>0);bounce.warped=warped;bounce.note=notes.length>0;}
    trigger=tr;performance.now=real;beatNow=bn;
    return {space:edges._space,onWall,apart,rmax:wormMax(),went,noteIn,views,startToC,count,across,along,head,sp,ts:inSpd,outNote:outNote.length,
      outCents:outNote[0],bCents:Bh.cents,pop,inside,bounce,BR};});
  ok(r.space==='portal',L+'is portal space');
  ok(r.onWall.every(w=>w.off<0.6&&w.inside),L+'2. both holes lie on a wall, inside it ('+r.onWall.map(w=>w.off.toFixed(2)+'px off, '+(w.inside?'inside':'OUTSIDE')).join('; ')+')');
  ok(r.onWall.every(w=>w.rad>r.BR*1.4),L+'   both are open ('+r.onWall.map(w=>w.rad.toFixed(0)).join(', ')+' px, full size '+r.rmax.toFixed(0)+')');
  ok(r.apart>=0,L+'   and they never overlap ('+r.apart.toFixed(0)+' px between their rims)');
  ok(r.went&&r.noteIn===0,L+'3. a ball that meets a hole goes in (silently: the note comes out the other side)');
  const v=r.views;
  ok(v.length===4&&!v[0].hide&&v[0].s<1&&v[1].s<v[0].s&&v[1].toC<r.startToC&&v[1].sx>v[1].sy,L+'   it is drawn INTO it: moving to its middle, shrinking, stretched toward it ('+v.map(q=>q.hide?'gone':'size '+q.s.toFixed(2)).join(' > ')+')');
  ok(v.length===4&&v[3].hide,L+'   then it is in the other dimension: not drawn at all');
  ok(r.count.length>0&&r.count.every(c=>c===1),L+'   and it is never lost: the tank still holds it the whole time');
  ok(r.across<r.onWall[1].rad&&Math.abs(r.along-(r.BR+1.5))<r.BR,L+'   it comes out of the OTHER hole ('+r.across.toFixed(1)+' px from its middle, '+r.along.toFixed(1)+' px out from its wall)');
  ok(r.head>0.5&&Math.abs(r.sp-r.ts)<r.ts*0.05,L+'   heading away from that wall ('+r.head.toFixed(2)+'), at the same speed it went in at ('+r.sp.toFixed(2)+' vs '+r.ts.toFixed(2)+')');
  ok(r.inside,L+'   inside the tank');
  ok(r.pop[0]<0.4&&r.pop[2]>0.9,L+'   drawn small as it comes out, swelling to its size ('+r.pop.map(x=>x.toFixed(2)).join(' > ')+')');
  ok(r.outNote>=1&&Math.abs(r.outCents-r.bCents)<0.01,L+'   ringing the wall it came out of');
  ok(r.bounce&&!r.bounce.warped&&r.bounce.turned&&r.bounce.note,L+'4. anywhere else on the walls a ball bounces and rings, as always');
  ok(errs.length===0,L+'no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}

 // ---- 5. the holes move with the music ----
 for(const [view,shape] of [['3d','6'],['3d','cube']]){const L='['+view+' '+shape+'] ';
  const {ctx,p}=await open('?m=studio&view='+view+'&space=portal');await setShape(p,shape);
  const r=await p.evaluate(()=>{S.spin=0;let T=performance.now();let B=2;const bn=beatNow;beatNow=()=>B;
    const pos=()=>__worm.P.map(P=>[P.x,P.y,P.z,P.rad,P.face>=0?P.face:P.wall]);
    let early=0,late=0,maxStep=0,visits=[new Set(),new Set()],cornerMin=1e9,last=pos();
    for(let i=0;i<8*40;i++){B=2+i/40;T+=1000/60;_tickT=T;wormTick();const q=pos();
      for(let k=0;k<2;k++){const d=Math.hypot(q[k][0]-last[k][0],q[k][1]-last[k][1],q[k][2]-last[k][2]);if(q[k][4]===last[k][4]){maxStep=Math.max(maxStep,d);(B%1<0.6?early+=d:late+=d);}
        visits[k].add(q[k][4]);if(q[k][4]!==last[k][4])cornerMin=Math.min(cornerMin,q[k][3],last[k][3]);}
      last=q;}
    beatNow=bn;return {early,late,maxStep,visits:visits.map(v=>v.size),cornerMin,rmax:wormMax()};});
  ok(r.early>r.late*4,L+'5. the holes slide in the first part of each beat and rest in the rest ('+r.early.toFixed(0)+' px vs '+r.late.toFixed(0)+' px)');
  ok(r.visits.every(v=>v>=2),L+'   over 8 beats each visits more than one wall ('+r.visits.join(', ')+')');
  ok(r.maxStep<r.rmax*0.6,L+'   gliding, not jumping (largest move in one tick '+r.maxStep.toFixed(1)+' px)');
  ok(r.cornerMin<r.rmax*0.35,L+'   and a hole shrinks to slip round a corner (down to '+r.cornerMin.toFixed(0)+' of '+r.rmax.toFixed(0)+' px where it changes wall)');
  await ctx.close();}

 // ---- 6. a busy tank, in real time ----
 {const {ctx,p,errs}=await open('?m=studio&view=3d&space=portal');await setShape(p,'6');
  const r=await p.evaluate(async()=>{balls.length=0;for(let i=0;i<8;i++)spawn(CX+Math.cos(i)*60,CY+Math.sin(i)*60);if(!S.playing)setPlaying(true);
    let warps=0,hits=0,lost=0;const en=wormEnter,tr=trigger;wormEnter=function(){warps++;return en.apply(this,arguments);};trigger=function(c,v,g,x,pane){if(!pane)hits++;return tr.apply(this,arguments);};
    const iv=setInterval(()=>{if(balls.length!==8)lost++;},100);await new Promise(r=>setTimeout(r,14000));clearInterval(iv);wormEnter=en;trigger=tr;
    return {warps,hits,lost,n:balls.length};});
  ok(r.lost===0&&r.n===8,'6. 14 s of a busy portal tank: every ball still there at every look ('+r.n+' balls)');
  ok(r.warps>=1,'   some went through a wormhole ('+r.warps+')');
  ok(r.warps<r.hits*0.4,'   and most notes are plain bounces ('+r.warps+' trips, '+r.hits+' wall notes)');
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
  // 8. a lesson never has them
  const les=await p.evaluate(()=>{LAB._on=true;rebuild();wormTick();const on=__worm.on;LAB._on=false;rebuild();wormTick();return {on,after:__worm.on};});
  ok(!les.on&&les.after,'8. a lesson never has wormholes (and they come back after)');
  await ctx.close();}

 // ---- 7. on the graphics card ----
 {process.env.SLIME_GL='1';const b2=await launch();const ctx=await b2.newContext({viewport:{width:1000,height:820}});   // the GPU renderer is chosen when the browser starts
  await ctx.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');localStorage.removeItem('slimehedron-view3d');}catch(e){}window.__glKeep=true;});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL+'?m=studio&view=3d&space=portal');await p.waitForTimeout(3500);
  const gl=await p.evaluate(()=>!!(window.__gl&&window.__gl.api&&window.__gl.api.worms));
  ok(gl,'7. the GPU tank is running');
  if(gl){for(const look of ['glass','crayon']){
    const r=await p.evaluate(async look=>{window.setLook3D(look);const rs=document.getElementById('randShapeT');if(rs&&rs.classList.contains('on'))rs.click();
      const s=document.getElementById('shape');s.value='6';s.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,2400));startBreak=()=>{};fillState='fill';
      if(!S.playing)setPlaying(true);await new Promise(r=>setTimeout(r,1500));
      beatNow=()=>9.85;for(let i=0;i<40;i++)simTick(performance.now());   // hold a moment when both holes rest, fully open (kept: a frame already queued must not move them before the picture is taken)
      window.requestAnimationFrame=()=>0;window.__gl.api.render();window.__gl.api.render();
      const c=document.getElementById('cv').getBoundingClientRect(),k=c.width/W;
      const at=__worm.P.map(P=>{const h=P.rad*0.3,q=P3(CX+P.x+P.n[0]*h,CY+P.y+P.n[1]*h,(P.z+P.n[2]*h)/BOXD+0.5);return [c.left+q[0]*k,c.top+q[1]*k,Math.max(16,P.rad*q[2]*k)];});
      return {worms:window.__gl.api.worms(),at};},look);
    const satAt=async(png,at)=>p.evaluate(async ([png,at])=>{const img=new Image();img.src='data:image/png;base64,'+png;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;
      const x=c.getContext('2d');x.drawImage(img,0,0);return at.map(([cx,cy,r])=>{const d=x.getImageData(Math.round(cx-r*0.3),Math.round(cy-r*0.3),Math.max(2,Math.round(r*0.6)),Math.max(2,Math.round(r*0.6))).data;
        let s=0,n=0;for(let i=0;i<d.length;i+=4){const mx=Math.max(d[i],d[i+1],d[i+2]),mn=Math.min(d[i],d[i+1],d[i+2]);s+=(mx-mn)/255;n++;}return s/n;});},[png,at]);
    const sh1=await p.screenshot();if(process.env.KEEP)require('fs').writeFileSync('/tmp/claude-0/shots/pt-'+look+'.png',sh1);const sat=await satAt(sh1.toString('base64'),r.at);if(process.env.KEEP)console.log(JSON.stringify(r.at));
    // the same spots with the holes switched off (same frame: only the wormholes hidden)
    await p.evaluate(()=>{const o=__worm.open;__worm.open=0;window.__gl.api.render();window.__wo=o;});
    const base=await satAt((await p.screenshot()).toString('base64'),r.at);
    await p.evaluate(()=>{__worm.open=window.__wo;});
    ok(r.worms.filter(w=>w.on).length===2,'['+look+'] two wormholes are drawn ('+r.worms.map(w=>w.on?'on':'off').join(', ')+')');
    ok(sat.every((x,i)=>x>base[i]*1.5+0.03),'['+look+'] and each one clearly stands out where it is (colour '+sat.map(x=>x.toFixed(2)).join(', ')+' against '+base.map(x=>x.toFixed(2)).join(', ')+' with the holes hidden)');}
   const off=await p.evaluate(async()=>{window.setSpace('normal');await new Promise(r=>setTimeout(r,300));window.__gl.api.render();window.__gl.api.render();return window.__gl.api.worms().filter(w=>w.on).length;});
   ok(off===0,'   and none in a normal tank');}
  ok(errs.length===0,'no page errors on the graphics card'+(errs.length?': '+errs[0]:''));
  await ctx.close();await b2.close();}
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'portal pass clean'));
 process.exit(FAIL.length?1:0);})();

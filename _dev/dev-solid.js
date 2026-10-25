// ============================================================================================
//  SOLID TEST — the real 3D solids, every face a note, and the grow buttons (cut / puff / flip).
//  Checks what the solids ARE and what they DO, off the running app:
//    1. the geometry is right: Euler's V - E + F = 2 for every shape, the textbook counts (cube 6/8/12,
//       soccer ball 32/60/90 ...), every face flat, every corner inside every face (convex, closed)
//    2. balls stay inside a solid for good, and a bounce off a face is a true 3D mirror that plays
//       THAT face's note
//    3. faces are notes from low at the bottom to high at the top
//    4. 2D shows the middle slice, and each slice wall plays the note of the face it is cut from
//    5. grow morphs smoothly: every in-between frame is a closed solid with every ball still inside,
//       and it lands on the right new shape; the face cap greys the buttons out
//    6. portal cube: a ball through a face comes out of the opposite face, same velocity
//    7. no WebGL: the canvas draws the solid; the grow buttons are 44px, on screen, on no control
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-solid.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html';

(async()=>{const b=await launch();
 const open=async(q,vp,init)=>{const ctx=await b.newContext(vp||{viewport:{width:1100,height:900}});const p=await ctx.newPage();
   const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message);});
   await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1')}catch(e){}});if(init)await p.addInitScript(init);
   await p.goto(URL+q);await p.waitForTimeout(1300);return {ctx,p,errs};};
 const setShape=(p,sh)=>p.evaluate(sh=>{const s=document.getElementById('shape');s.value=sh;s.dispatchEvent(new Event('change'));},sh);

 // ---- 1. geometry ----
 {const {ctx,p,errs}=await open('?m=studio&view=3d&space=normal');
  const g=await p.evaluate(()=>{const want={tetra:[4,4,6],cube:[6,8,12],octa:[8,6,12],dodeca:[12,20,30],icosa:[20,12,30],
      'cube.cut':[14,24,36],'icosa.cut':[32,60,90],'cube.flip':[8,6,12],'cube.puff':[24,14,36],'octa.cut':[14,24,36],'dodeca.flip':[20,12,30],'prism6':[8,12,18]};
    const out={};for(const n in want){const P=solidPlanes(n),F=solidFaces(P),V=solidVerts(F),E=V.reduce((a,v)=>a+v.nb.size,0)/2;
      let flat=0,inside=0;F.forEach((f,i)=>{for(const v of f)flat=Math.max(flat,Math.abs(vdot(P[i].n,v.p)-P[i].d));});
      for(const v of V)for(const pl of P)inside=Math.max(inside,vdot(pl.n,v.p)-pl.d);
      out[n]={got:[P.length,V.length,E],want:want[n],euler:V.length-E+P.length,flat,inside};}
    return out;});
  const bad=Object.entries(g).filter(([n,r])=>r.got.join()!==r.want.join());
  ok(bad.length===0,'every solid has the textbook faces / corners / edges ('+(bad.length?bad.map(([n,r])=>n+' '+r.got+' vs '+r.want).join('; '):Object.keys(g).length+' shapes, soccer ball 32/60/90')+')');
  ok(Object.values(g).every(r=>r.euler===2),'and Euler\'s V - E + F = 2 holds for every one');
  ok(Object.values(g).every(r=>r.flat<0.01),'every face is flat (worst '+Math.max(...Object.values(g).map(r=>r.flat)).toExponential(1)+'px off its plane)');
  ok(Object.values(g).every(r=>r.inside<0.01),'every corner is inside every face: closed and convex');

  // ---- 2. balls stay inside; a bounce is a mirror that plays that face ----
  await setShape(p,'icosa');
  const run=await p.evaluate(async()=>{S.slimeMode=false;S.rain=false;balls.length=0;for(let i=0;i<10;i++)spawn(CX+Math.cos(i)*60,CY+Math.sin(i)*60);setPlaying(true);   // no auto-play: it opens walls on purpose
    const notes=[];const t0=trigger;trigger=function(c,i,g,n,pane){notes.push(c);return t0.apply(this,arguments);};
    // only a CLOSED solid has to hold: the burst opens the tank on purpose and lets balls trickle out
    let worst=-1e9;const iv=setInterval(()=>{if(fillState!=='fill')return;const c=Math.cos(rot),s=Math.sin(rot);for(const b of balls){const x=b.x-CX,y=b.y-CY,z=(b.z-0.5)*BOXD;
      for(const pl of SOLID.planes){const n=pl.n;worst=Math.max(worst,(n[0]*c-n[1]*s)*x+(n[0]*s+n[1]*c)*y+n[2]*z-pl.d);}}},50);
    await new Promise(r=>setTimeout(r,12000));clearInterval(iv);trigger=t0;
    const faceCents=new Set(SOLID.deg.map(d=>Math.round(centsForDegree(d))));
    return {balls:balls.length,worst,notes:notes.length,onFace:notes.filter(c=>faceCents.has(Math.round(c))).length,
      zr:Math.max(...balls.map(b=>b.z))-Math.min(...balls.map(b=>b.z))};});
  ok(run.balls===10,'12s in an icosahedron: all 10 balls still there');
  ok(run.worst<=0.5,'and never once outside a face (deepest '+run.worst.toFixed(2)+'px past a face; a ball is '+9+'px)');
  ok(run.notes>=15&&run.onFace===run.notes,'every note they played is one of the faces\' notes ('+run.onFace+'/'+run.notes+')');
  ok(run.zr>0.5,'they really use the depth ('+run.zr.toFixed(2)+' of the box)');
  const mir=await p.evaluate(()=>{S.playing=false;S.chaos=0;balls.length=0;rot=0;rebuild();const ts=ballSpeed(),res=[];
    for(let k=0;k<SOLID.planes.length;k+=3){const n=SOLID.planes[k].n,d=SOLID.planes[k].d;
      spawn(CX+n[0]*(d-30),CY+n[1]*(d-30));const B=balls[balls.length-1];B.s3=1;B.mute=0;B.z=0.5+n[2]*(d-30)/BOXD;
      const t=vnorm(vcross(n,[0.3,0.7,0.2])),v=[n[0]*0.8+t[0]*0.6,n[1]*0.8+t[1]*0.6,n[2]*0.8+t[2]*0.6].map(x=>x*ts);
      B.vx=v[0];B.vy=v[1];B.vz=v[2]/BOXD;let notes=[];const t0=trigger;trigger=function(c){notes.push(c);return t0.apply(this,arguments);};
      for(let i=0;i<20;i++){const pv=[B.vx,B.vy,B.vz*BOXD];solidSub(B,1,ts);const nv=[B.vx,B.vy,B.vz*BOXD];
        if(Math.abs(nv[0]-pv[0])+Math.abs(nv[1]-pv[1])+Math.abs(nv[2]-pv[2])>1e-6){
          const vn=vdot(pv,n),want=[pv[0]-2*vn*n[0],pv[1]-2*vn*n[1],pv[2]-2*vn*n[2]];
          res.push({err:Math.hypot(nv[0]-want[0],nv[1]-want[1],nv[2]-want[2]),note:notes.length===1&&Math.abs(notes[0]-centsForDegree(SOLID.deg[k]))<0.01});break;}}
      trigger=t0;balls.length=0;}
    return res;});
  ok(mir.length>=6&&mir.every(r=>r.err<1e-9),'a ball aimed at a face bounces as a true 3D mirror, v - 2(v.n)n ('+mir.length+' faces, worst '+Math.max(...mir.map(r=>r.err)).toExponential(1)+')');
  ok(mir.every(r=>r.note),'and plays exactly that face\'s note');

  // ---- 3. low notes at the bottom ----
  const ord=await p.evaluate(()=>{const P=SOLID.planes,D=SOLID.deg;let lo=0,hi=0;P.forEach((p,i)=>{if(p.n[1]>P[lo].n[1])lo=i;if(p.n[1]<P[hi].n[1])hi=i;});
    return {lo:centsForDegree(D[lo]),hi:centsForDegree(D[hi])};});
  ok(ord.lo<ord.hi,'the bottom face is the lowest note and the top face the highest ('+ord.lo+' < '+ord.hi+' cents)');

  // ---- 4. the slice ----
  const sl=await p.evaluate(()=>{setView3D(false);rot=0;rebuild();const ok1=edges._solid==='icosa'&&edges.every(e=>e.face!=null&&Math.abs(e.cents-centsForDegree(SOLID.deg[e.face]))<0.01);
    const c=Math.cos(rot),s=Math.sin(rot);let worst=0;for(const e of edges){const n=SOLID.planes[e.face].n,mx=(e.ax+e.bx)/2-CX,my=(e.ay+e.by)/2-CY;
      worst=Math.max(worst,Math.abs((n[0]*c-n[1]*s)*mx+(n[0]*s+n[1]*c)*my-SOLID.planes[e.face].d));}
    const r={n:edges.length,ok1,worst};setView3D(true);return r;});
  ok(sl.ok1&&sl.worst<0.5,'in 2D the tank is the middle slice: '+sl.n+' walls, each lying on its face and playing that face\'s note');

  // ---- 5. grow ----
  await setShape(p,'cube');
  const gr=await p.evaluate(async()=>{balls.length=0;for(let i=0;i<8;i++)spawn(CX+Math.cos(i)*40,CY+Math.sin(i)*40);setPlaying(true);
    await new Promise(r=>setTimeout(r,800));
    const res={frames:0,closed:true,outside:-1e9};const t0=performance.now();growSolid('cut');
    const seen=new Set();
    while(SOLID.from&&performance.now()-t0<3000){await new Promise(r=>setTimeout(r,25));res.frames++;
      seen.add(SOLID.planes.map(p=>p.d.toFixed(1)).join(','));
      const F=solidFaces(SOLID.planes),V=solidVerts(F),E=V.reduce((a,v)=>a+v.nb.size,0)/2,act=F.filter(f=>f.length>=3).length;
      if(V.length-E+act!==2)res.closed=false;
      const c=Math.cos(rot),s=Math.sin(rot);for(const b of balls){const x=b.x-CX,y=b.y-CY,z=(b.z-0.5)*BOXD;
        for(const pl of SOLID.planes){const n=pl.n;res.outside=Math.max(res.outside,(n[0]*c-n[1]*s)*x+(n[0]*s+n[1]*c)*y+n[2]*z-pl.d);}}}
    res.ms=performance.now()-t0;res.states=seen.size;res.shape=String(S.shape);res.faces=SOLID.planes.length;return res;});
  ok(gr.shape==='cube.cut'&&gr.faces===14,'"cut" turns the cube into a truncated cube ('+gr.shape+', '+gr.faces+' faces)');
  ok(gr.states>=15&&gr.ms>700&&gr.ms<1500,'and it grows into it smoothly over about a second ('+gr.states+' different in-between shapes in '+Math.round(gr.ms)+'ms)');
  ok(gr.closed,'every in-between frame is itself a closed solid (V - E + F = 2 the whole way)');
  ok(gr.outside<=1,'and every ball stays inside the whole time (deepest '+gr.outside.toFixed(2)+'px)');
  const cap=await p.evaluate(()=>{const s=document.getElementById('shape');s.value='icosa';s.dispatchEvent(new Event('change'));growSolid('cut');
    return new Promise(r=>setTimeout(()=>{window._spaceChip();const bs=[...document.querySelectorAll('#growBar button')].map(b=>[b.dataset.grow,b.disabled]);
      r({shape:String(S.shape),bs,refused:growSolid('cut')===false&&String(S.shape)==='icosa.cut'});},1300));});
  ok(cap.shape==='icosa.cut'&&cap.refused&&cap.bs.find(x=>x[0]==='cut')[1]&&!cap.bs.find(x=>x[0]==='flip')[1],'past '+62+' faces a button greys out and does nothing; the others still work');
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}

 // ---- 6. portal cube ----
 {const {ctx,p,errs}=await open('?m=studio&view=3d&space=portal');await setShape(p,'cube');
  const r=await p.evaluate(()=>{S.playing=false;rot=0;rebuild();balls.length=0;const ts=ballSpeed();
    spawn(CX+120,CY+10);const B=balls[0];B.s3=1;B.mute=0;B.z=0.5;B.vx=ts*0.9;B.vy=ts*0.3;B.vz=ts*0.2/BOXD;
    const sp=Math.hypot(B.vx,B.vy,B.vz*BOXD),v0=[B.vx,B.vy,B.vz];let crossed=null;
    for(let i=0;i<60&&!crossed;i++){const x0=B.x;solidSub(B,1,ts);if(B.x<x0-100)crossed={x:B.x-CX};}
    return {space:edges._space,crossed,dv:Math.hypot(B.vx-v0[0],B.vy-v0[1],(B.vz-v0[2])*BOXD),sp};});
  ok(r.space==='portal'&&r.crossed&&r.crossed.x<-150,'portal cube: a ball through the right face comes out of the left face ('+(r.crossed?Math.round(r.crossed.x):'none')+'px)');
  ok(r.dv<1e-9,'with exactly the same velocity');
  ok(errs.length===0,'no page errors in the portal cube'+(errs.length?': '+errs[0]:''));
  await ctx.close();}

 // ---- 6b. curved solid: hyperbolic 3-space ----
 // In the Klein model a straight line of hyperbolic space is a straight line, so the test turns the
 // ball's Poincare-ball positions into Klein coordinates (k = 2u / (1 + |u|^2)) and checks they line up.
 {const {ctx,p,errs}=await open('?m=studio&view=3d&space=curved');await setShape(p,'dodeca');
  const g=await p.evaluate(()=>{S.playing=false;S.chaos=0;rot=0;rebuild();balls.length=0;const ts=ballSpeed(),RB=HYP.RD;
    const keep=SOLID.planes;SOLID.planes=[];                     // walls out of the way: free flight
    spawn(CX+40,CY-30);const B=balls[0];B.s3=1;B.mute=0;B.z=0.5+20/BOXD;B.vx=ts*0.6;B.vy=ts*0.5;B.vz=ts*0.62/BOXD;
    const K=[],U=[];for(let i=0;i<70;i++){const u=[(B.x-CX)/RB,(B.y-CY)/RB,(B.z-0.5)*BOXD/RB],r2=u[0]**2+u[1]**2+u[2]**2;U.push(u);K.push(u.map(x=>2*x/(1+r2)));hypSolidSub(B,1,ts);}
    SOLID.planes=keep;
    const a=K[0],b=K[K.length-1],d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],L=Math.hypot(...d);let off=0;
    for(const k of K){const w=[k[0]-a[0],k[1]-a[1],k[2]-a[2]],t=(w[0]*d[0]+w[1]*d[1]+w[2]*d[2])/(L*L);off=Math.max(off,Math.hypot(w[0]-d[0]*t,w[1]-d[1]*t,w[2]-d[2]*t));}
    const H=u=>{const r2=u[0]**2+u[1]**2+u[2]**2,D=1-r2;return [(1+r2)/D,2*u[0]/D,2*u[1]/D,2*u[2]/D];};
    let hd=0;for(let i=1;i<U.length;i++){const A=H(U[i-1]),Bq=H(U[i]),m=-A[0]*Bq[0]+A[1]*Bq[1]+A[2]*Bq[2]+A[3]*Bq[3];hd=Math.max(hd,Math.abs(Math.acosh(Math.max(1,-m))/(2*ts/RB)-1));}
    return {off:off*RB,hd,rmax:Math.max(...U.map(u=>Math.hypot(...u)))};});
  ok(g.off<0.05,'curved solid: a free ball flies a straight line of hyperbolic space (straight in Klein coordinates, worst '+g.off.toFixed(4)+'px off)');
  ok(g.hd<0.01,'covering the same hyperbolic distance every tick (worst '+(g.hd*100).toFixed(2)+'% off, out to r='+g.rmax.toFixed(2)+')');
  // the burst is held off: a curved solid is a small room, its goo fills it in ~7s and the burst (on purpose) lets the
  // balls fly out. This run is about the walls holding the balls, so it must stay a whole 10s in one piece.
  const run=await p.evaluate(async()=>{const sb=startBreak;startBreak=()=>{};S.slimeMode=false;S.rain=false;S.chaos=0.1;balls.length=0;for(let i=0;i<8;i++)spawn(CX+Math.cos(i)*40,CY+Math.sin(i)*40);setPlaying(true);
    let n=0,bad=0;const t0=trigger;trigger=function(c){n++;if(!SOLID.deg.some(d=>Math.abs(centsForDegree(d)-c)<0.01))bad++;return t0.apply(this,arguments);};
    let worst=-1e9;const RB=HYP.RD,K=HKR();
    const iv=setInterval(()=>{if(fillState!=='fill')return;const c=Math.cos(rot),s=Math.sin(rot);for(const b of balls){const u=[(b.x-CX)/RB,(b.y-CY)/RB,(b.z-0.5)*BOXD/RB],r2=u[0]**2+u[1]**2+u[2]**2,k=u.map(x=>2*x/(1+r2));
      for(const pl of SOLID.planes){const nn=pl.n,v=(nn[0]*c-nn[1]*s)*k[0]+(nn[0]*s+nn[1]*c)*k[1]+nn[2]*k[2]-pl.d/K;worst=Math.max(worst,v*K);}}},50);
    await new Promise(r=>setTimeout(r,10000));clearInterval(iv);trigger=t0;startBreak=sb;return {balls:balls.length,n,bad,worst,space:edges._space,small:Math.min(...balls.map(b=>ballScale(b.x,b.y,b.z)))};});
  ok(run.space==='curved'&&run.balls===8,'10s in a curved dodecahedron: all 8 balls still there');
  ok(run.worst<=0.5,'and never outside a face (deepest '+run.worst.toFixed(2)+' Klein-px)');
  ok(run.n>=8&&run.bad===0,'every note is one of its faces\' notes ('+(run.n-run.bad)+'/'+run.n+')');
  ok(run.small<1,'balls are drawn smaller away from the middle (smallest '+run.small.toFixed(2)+')');
  const sl=await p.evaluate(()=>{setView3D(false);rot=0;rebuild();const r={space:edges._space,n:edges.length,arcs:edges.every(e=>e.cr>0||e.pts),faces:edges.every(e=>e.face!=null&&Math.abs(e.cents-centsForDegree(SOLID.deg[e.face]))<0.01)};setView3D(true);return r;});
  ok(sl.space==='curved'&&sl.arcs&&sl.faces,'in 2D the curved solid is its curved middle slice, each arc playing its face\'s note ('+sl.n+' walls)');
  ok(errs.length===0,'no page errors in curved solids'+(errs.length?': '+errs[0]:''));
  await ctx.close();}

 // ---- 7. canvas fallback, and the grow bar on screen ----
 {const {ctx,p,errs}=await open('?m=play&view=3d',null,()=>{const o=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return /webgl/.test(t)?null:o.call(this,t,...a);};});
  await setShape(p,'dodeca');await p.mouse.click(550,450);await p.waitForTimeout(2500);
  const r=await p.evaluate(()=>{const d=cv.getContext('2d').getImageData(0,0,W,H).data;let ink=0;for(let i=3;i<d.length;i+=4*97)if(d[i]>0)ink++;return {gl:!!window.__gl.api,ink,solid:edges._solid};});
  ok(!r.gl&&r.solid==='dodeca'&&r.ink>20,'no WebGL: the canvas draws the dodecahedron ('+r.ink+' inked samples)');
  ok(errs.length===0,'no page errors on the canvas path'+(errs.length?': '+errs[0]:''));
  await ctx.close();}
 for(const [tag,vp,mode] of [['desktop play',{viewport:{width:1440,height:900}},'play'],['desktop studio',{viewport:{width:1440,height:900}},'studio'],
                              ['phone play',{viewport:{width:390,height:844},isMobile:true,hasTouch:true},'play'],['phone studio',{viewport:{width:390,height:844},isMobile:true,hasTouch:true},'studio'],
                              ['small phone play',{viewport:{width:360,height:640},isMobile:true,hasTouch:true},'play']]){
  const {ctx,p,errs}=await open('?m='+mode+'&view=3d',vp);await setShape(p,'cube');await p.waitForTimeout(1400);
  await p.click('#spaceBtn');await p.waitForTimeout(200);   // cut / puff / flip live in the corner menu now, out of the way
  const r=await p.evaluate(()=>{const gb=document.getElementById('growBar'),chip=document.getElementById('spaceChip'),menu=document.getElementById('spaceMenu');if(gb.hidden)return {hidden:true};
    const bs=[...gb.querySelectorAll('button')].map(b=>b.getBoundingClientRect()),cr=chip.getBoundingClientRect(),mr=menu.getBoundingClientRect();
    const hits=[...document.querySelectorAll('button,select,input,[role="button"],.psBtn,#triMix')].filter(e=>!chip.contains(e)&&e.offsetWidth&&getComputedStyle(e).visibility!=='hidden')
      .map(e=>[e.id||e.className,e.getBoundingClientRect()]).filter(([n,q])=>cr.left<q.right&&cr.right>q.left&&cr.top<q.bottom&&cr.bottom>q.top).map(([n])=>String(n).slice(0,20));
    return {hidden:false,small:bs.filter(q=>q.width<44||q.height<44).length,onScreen:cr.left>=0&&cr.top>=0&&cr.right<=innerWidth&&cr.bottom<=innerHeight&&mr.left>=0&&mr.top>=0&&mr.right<=innerWidth+0.5&&mr.bottom<=innerHeight,hits};});
  ok(!r.hidden&&r.small===0&&r.onScreen&&r.hits.length===0,'['+tag+'] the corner menu offers cut / puff / flip for a 3D shape: 44px, on screen; the button sits on no control'+(r.hits&&r.hits.length?' (covers '+r.hits.join(',')+')':''));
  const grew=await p.evaluate(async()=>{document.querySelector('#growBar [data-grow="cut"]').click();await new Promise(r=>setTimeout(r,1400));return String(S.shape);});
  ok(grew==='cube.cut','['+tag+'] and pressing "cut" grows the cube ('+grew+')');
  const flat=await p.evaluate(()=>{setView3D(false);window._spaceChip();return document.getElementById('growBar').hidden;});
  ok(flat,'['+tag+'] and hide in 2D');
  ok(errs.length===0,'['+tag+'] no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'solid pass clean'));
 process.exit(FAIL.length?1:0);})();

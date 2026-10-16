// ============================================================================================
//  SPACE TEST — the three spaces the tank can be (normal / portal / curved), and the corner menu.
//  Every check here is about what the space DOES, measured off the running physics, not that code ran:
//    portal  a ball that crosses a wall comes out of the opposite wall at the exact translated spot,
//            with exactly the same velocity, and the crossed wall's note sounds. Only shapes whose
//            opposite sides are equal and parallel get portals; the rest keep solid walls.
//    curved  with the walls out of the way a ball's path is a hyperbolic straight line: an arc that
//            meets the rim at right angles (or a diameter). It covers the same hyperbolic distance
//            every tick, it looks slower near the rim by exactly (1-r^2), a bounce is a true mirror
//            (angle in = angle out), and with the walls in nothing ever leaks out. Regular shapes are
//            sized so k copies meet at each corner (the echoes tile).
//    both    3D still has depth in both; lessons are always normal; auto mixes spaces in play only,
//            about one shape in three; a picked space holds.
//    menu    3D is the default view; the corner menu switches view and space and sits on no control.
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-space.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html';

(async()=>{const b=await launch();
 const open=async(q,vp)=>{const ctx=await b.newContext(vp||{viewport:{width:1280,height:860}});const p=await ctx.newPage();
   const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message);});
   await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1')}catch(e){}});
   await p.goto(URL+q);await p.waitForTimeout(1200);return {ctx,p,errs};};
 const setShape=(p,sh)=>p.evaluate(sh=>{const s=document.getElementById('shape');s.value=sh;s.dispatchEvent(new Event('change'));},sh);

 // ---- 0. defaults: 3D view, no remembered choice ----
 {const {ctx,p,errs}=await open('?m=play');
  const d=await p.evaluate(()=>({d3:window.__view.d3,txt:document.getElementById('spaceTxt').textContent}));
  ok(d.d3,'3D is the default view');
  ok(/^3D/.test(d.txt),'the corner chip says so ("'+d.txt+'")');
  ok(errs.length===0,'no page errors on a fresh load'+(errs.length?': '+errs[0]:''));
  await ctx.close();}

 // ---- 1. PORTAL ----
 {const {ctx,p,errs}=await open('?m=studio&view=2d&space=portal');
  const elig=await p.evaluate(()=>{const out={};for(const sh of ['3','4','5','6','8','12','rhombus','parallelogram','trapezoid','star','heart'])out[sh]=buildEdges(sh,'portal')._space;return out;});
  ok(['4','6','8','12','rhombus','parallelogram'].every(k=>elig[k]==='portal'),'shapes with equal parallel opposite sides get portals ('+['4','6','8','12','rhombus','parallelogram'].map(k=>k+':'+elig[k]).join(' ')+')');
  ok(['3','5','trapezoid','star','heart'].every(k=>elig[k]==='normal'),'every other shape keeps solid walls ('+['3','5','trapezoid','star','heart'].map(k=>k+':'+elig[k]).join(' ')+')');
  await setShape(p,'6');
  // one ball, aimed straight through wall 0, stepped by the real physics
  const r=await p.evaluate(()=>{S.spin=0;S.chaos=0;S.grav=0;balls.length=0;particles.length=0;mMask=null;settleAmt=()=>0;
    const notes=[];const t0=trigger;trigger=function(c){notes.push(c);return t0.apply(this,arguments);};
    const e=edges[0],t=e.twin,mx=(e.ax+e.bx)/2,my=(e.ay+e.by)/2;
    const ts=ballSpeed(),dx=-e.nx*3-e.ny*0.8,dy=-e.ny*3+e.nx*0.8,dl=Math.hypot(dx,dy);
    spawn(mx+e.nx*30,my+e.ny*30);const B=balls[0];B.mute=0;B.vx=dx/dl*ts;B.vy=dy/dl*ts;B.vz=0;B.z=0.5;
    const v0=[B.vx,B.vy];let cross=null;
    for(let i=0;i<40&&!cross;i++){const bx=B.x,by=B.y,vx=B.vx,vy=B.vy;step();
      if(Math.hypot(B.x-bx,B.y-by)>60)cross={bx,by,ax:B.x,ay:B.y,vx0:vx,vy0:vy,vx:B.vx,vy:B.vy};}
    trigger=t0;
    const T=[(t.ax+t.bx-e.ax-e.bx)/2,(t.ay+t.by-e.ay-e.by)/2];
    const pred=cross?[cross.bx+cross.vx0+T[0],cross.by+cross.vy0+T[1]]:null;
    return {crossed:!!cross,posErr:cross?Math.hypot(cross.ax-pred[0],cross.ay-pred[1]):99,
      velErr:cross?Math.hypot(cross.vx-cross.vx0,cross.vy-cross.vy0):99,
      inside:inPoly(B.x,B.y,edges._verts),noteOk:notes.length>0&&Math.abs(notes[0]-e.cents)<0.01,notes:notes.length};});
  ok(r.crossed,'a ball aimed at a portal wall goes through it');
  ok(r.posErr<0.5,'and comes out of the opposite wall exactly where the gluing says ('+r.posErr.toFixed(3)+'px off)');
  ok(r.velErr<1e-9,'with exactly the same velocity, speed and heading ('+r.velErr.toExponential(1)+')');
  ok(r.inside,'landing inside the tank');
  ok(r.noteOk,'and the wall it crossed played its own note');
  // a full tank for 15s: nobody escapes, notes keep coming, and no ball ever bounces off a portal wall
  const run=await p.evaluate(async()=>{S.chaos=0.1;balls.length=0;for(let i=0;i<8;i++)spawn(CX+Math.cos(i)*60,CY+Math.sin(i)*60);setPlaying(true);
    let n=0;const t0=trigger;trigger=function(){n++;return t0.apply(this,arguments);};
    let outside=0;const iv=setInterval(()=>{for(const b of balls)if(!inPoly(b.x,b.y,edges._verts))outside++;},100);
    await new Promise(r=>setTimeout(r,15000));clearInterval(iv);trigger=t0;return {balls:balls.length,n,outside};});
  ok(run.balls===8,'15s of a busy portal tank: all 8 balls still in it ('+run.balls+')');
  ok(run.outside<=2,'and essentially never seen outside the walls ('+run.outside+' ball-samples outside, mid-crossing)');
  ok(run.n>=15,'notes keep coming ('+run.n+')');
  ok(errs.length===0,'no page errors in portal space'+(errs.length?': '+errs[0]:''));
  await ctx.close();}

 // ---- 2. CURVED ----
 {const {ctx,p,errs}=await open('?m=studio&view=2d&space=curved');
  const elig=await p.evaluate(()=>{const out={};for(const sh of ['3','4','6','12','rhombus','trapezoid','star','heart'])out[sh]=buildEdges(sh,'curved')._space;return out;});
  ok(['3','4','6','12','rhombus','trapezoid'].every(k=>elig[k]==='curved'),'convex shapes go curved ('+['3','4','6','12','rhombus','trapezoid'].map(k=>k+':'+elig[k]).join(' ')+')');
  ok(['star','heart'].every(k=>elig[k]==='normal'),'shapes with dents stay normal (star:'+elig.star+' heart:'+elig.heart+')');
  await setShape(p,'6');
  // free flight with the walls out of the way
  const g=await p.evaluate(()=>{S.spin=0;S.chaos=0;S.grav=0;balls.length=0;particles.length=0;
    for(const e of edges){e.broken=true;e.reform=0;}
    const RD=HYP.RD,ts=ballSpeed();
    const fly=(x,y,ang)=>{spawn(x,y);const B=balls[balls.length-1];B.mute=0;B.vx=Math.cos(ang)*ts;B.vy=Math.sin(ang)*ts;
      const pts=[];for(let i=0;i<45;i++){pts.push([(B.x-CX)/RD,(B.y-CY)/RD]);hypSub(B,1,ts);B.vx=Math.cos(Math.atan2(B.vy,B.vx))*ts;B.vy=Math.sin(Math.atan2(B.vy,B.vx))*ts;}return pts;};
    // off-centre path: fit 2u.c = |u|^2+1 (circle orthogonal to the rim) by least squares, report the worst miss
    const pts=fly(CX+60,CY-90,0.3);
    let a11=0,a12=0,a22=0,b1=0,b2=0;for(const[u,v]of pts){const r=u*u+v*v+1;a11+=4*u*u;a12+=4*u*v;a22+=4*v*v;b1+=2*u*r;b2+=2*v*r;}
    const det=a11*a22-a12*a12,cx=(b1*a22-b2*a12)/det,cy=(a11*b2-a12*b1)/det,rr=Math.sqrt(cx*cx+cy*cy-1);
    const miss=Math.max(...pts.map(([u,v])=>Math.abs(Math.hypot(u-cx,v-cy)-rr)))*RD;
    // straight one through the centre: a diameter
    const d=fly(CX-120,CY,0).map(([u,v])=>Math.abs(v)*RD);
    // hyperbolic distance per tick, and on-screen speed vs the (1-r^2) the space predicts
    const H=([u,v])=>{const r2=u*u+v*v,D=1-r2;return [(1+r2)/D,2*u/D,2*v/D];},md=(a,b)=>-a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
    const hd=[],ratio=[];for(let i=1;i<pts.length;i++){hd.push(Math.acosh(Math.max(1,-md(H(pts[i-1]),H(pts[i])))));
      const [u,v]=pts[i-1],r2=u*u+v*v,eu=Math.hypot(pts[i][0]-u,pts[i][1]-v)*RD;ratio.push(eu/(ts*(1-r2)));}
    const want=2*ts/RD;
    return {miss,diam:Math.max(...d),hdErr:Math.max(...hd.map(x=>Math.abs(x/want-1))),ratio:[Math.min(...ratio),Math.max(...ratio)],
      rmax:Math.max(...pts.map(([u,v])=>Math.hypot(u,v)))};});
  ok(g.miss<0.5,'off-centre, a ball flies along an arc that meets the rim at right angles (worst miss '+g.miss.toFixed(3)+'px)');
  ok(g.diam<0.5,'through the centre, it flies a straight diameter (worst drift '+g.diam.toFixed(3)+'px)');
  ok(g.hdErr<0.01,'it covers the same hyperbolic distance every tick (worst '+(g.hdErr*100).toFixed(2)+'% off)');
  ok(g.ratio[0]>0.98&&g.ratio[1]<1.02,'and on screen it moves at exactly (1-r^2) of its centre speed ('+g.ratio.map(v=>v.toFixed(3)).join('..')+', out to r='+g.rmax.toFixed(2)+')');
  // bounce: angle in = angle out, measured with the Minkowski normal
  await setShape(p,'6');
  const bo=await p.evaluate(()=>{S.chaos=0;balls.length=0;const ts=ballSpeed(),RD=HYP.RD;for(const e of edges)e.flash=0;
    const res=[];for(let k=0;k<6;k++){spawn(CX+(Math.random()-0.5)*40,CY+(Math.random()-0.5)*40);const B=balls[balls.length-1];B.mute=0;
      const a=Math.random()*6.28;B.vx=Math.cos(a)*ts;B.vy=Math.sin(a)*ts;
      const tang=()=>{const ux=(B.x-CX)/RD,uy=(B.y-CY)/RD,r2=ux*ux+uy*uy,D=1-r2,s=Math.hypot(B.vx,B.vy),wx=B.vx/s,wy=B.vy/s,uw=ux*wx+uy*wy;
        return [[(1+r2)/D,2*ux/D,2*uy/D],[2*uw/D,wx+2*ux*uw/D,wy+2*uy*uw/D]];};
      for(let i=0;i<400;i++){const [P,V]=tang();let near=null;for(const e of edges){if(mdot(P,e.N)<Math.sinh(2*BR/RD)*1.5)near=e;}
        const fl=edges.map(e=>e.flash);hypSub(B,1,ts);const hit=edges.find((e,j)=>e.flash===1&&fl[j]!==1);
        if(hit){const [P2,V2]=tang();res.push(Math.abs(mdot(V,hit.N)+mdot(V2,hit.N)));break;}
        for(const e of edges)e.flash=0;}}
    return res;});
  ok(bo.length>=5,'balls bounce off the curved walls ('+bo.length+' bounces caught)');
  ok(bo.every(x=>x<0.02),'every bounce is a true mirror: angle in = angle out (worst '+Math.max(...bo,0).toFixed(4)+')');
  // tiling: the corner angle of a regular shape is 2pi/k
  const tile=await p.evaluate(()=>{const out=[];for(const sh of ['4','6','8']){const s=document.getElementById('shape');s.value=sh;s.dispatchEvent(new Event('change'));
    const N=+sh,k=hypCorner(N).k,e=edges[0],f=edges[N-1];   // corner where wall N-1 ends and wall 0 starts
    const tan=(ed,atStart)=>{const a=atStart?ed.a0:ed.a1,s=(ed.a1-ed.a0)>0?1:-1;let tx=-Math.sin(a)*s,ty=Math.cos(a)*s;if(!atStart){tx=-tx;ty=-ty;}return [tx,ty];};
    const t1=tan(e,true),t2=tan(f,false),ang=Math.acos(Math.max(-1,Math.min(1,t1[0]*t2[0]+t1[1]*t2[1])));
    out.push({sh,k,ang:ang*180/Math.PI,want:360/k});}return out;});
  ok(tile.every(t=>Math.abs(t.ang-t.want)<0.5),'regular shapes are sized so k copies meet at each corner and tile ('+tile.map(t=>t.sh+'-gon '+t.ang.toFixed(1)+'deg vs 360/'+t.k).join(', ')+')');
  // a busy curved tank for 15s: nobody leaks out, notes keep coming
  await setShape(p,'6');
  const run=await p.evaluate(async()=>{S.chaos=0.1;balls.length=0;for(let i=0;i<8;i++)spawn(CX+Math.cos(i)*50,CY+Math.sin(i)*50);setPlaying(true);
    let n=0;const t0=trigger;trigger=function(){n++;return t0.apply(this,arguments);};
    let outside=0,bad=0;const iv=setInterval(()=>{for(const b of balls){if(!inPoly(b.x,b.y,edges._verts))outside++;if(!isFinite(b.x)||!isFinite(b.y))bad++;}},100);
    await new Promise(r=>setTimeout(r,15000));clearInterval(iv);trigger=t0;
    return {balls:balls.length,n,outside,bad,small:Math.min(...balls.map(b=>ballScale(b.x,b.y)))};});
  ok(run.balls===8&&run.outside===0&&run.bad===0,'15s of a busy curved tank: all 8 balls stay inside the curved walls ('+run.balls+' balls, '+run.outside+' samples outside)');
  ok(run.n>=10,'notes keep coming ('+run.n+')');
  ok(run.small<1,'balls are drawn smaller away from the centre (smallest scale '+run.small.toFixed(2)+')');
  ok(errs.length===0,'no page errors in curved space'+(errs.length?': '+errs[0]:''));
  await ctx.close();}

 // ---- 3. 3D keeps its depth in the new spaces ----
 for(const sp of ['portal','curved']){const {ctx,p,errs}=await open('?m=studio&view=3d&space='+sp);await setShape(p,'6');
  const z=await p.evaluate(async()=>{balls.length=0;for(let i=0;i<6;i++)spawn(CX+Math.cos(i)*50,CY+Math.sin(i)*50);setPlaying(true);
    const lo=new Map(),hi=new Map();const iv=setInterval(()=>{for(const b of balls){lo.set(b,Math.min(lo.get(b)??1,b.z));hi.set(b,Math.max(hi.get(b)??0,b.z));}},100);
    await new Promise(r=>setTimeout(r,8000));clearInterval(iv);return {space:edges._space,range:balls.map(b=>hi.get(b)-lo.get(b))};});
  ok(z.space===sp&&z.range.filter(r=>r>0.8).length>=3,'3D '+sp+': balls still travel front to back ('+z.range.map(v=>v.toFixed(2)).join(' ')+')');
  ok(errs.length===0,'no page errors in 3D '+sp+(errs.length?': '+errs[0]:''));
  await ctx.close();}

 // ---- 4. lessons are always normal; auto mixes in play only; a picked space holds ----
 {const {ctx,p}=await open('?m=play&space=curved');
  const l=await p.evaluate(()=>{const before=edges._space;LAB._on=true;rebuild();const during=edges._space;LAB._on=false;rebuild();return {before,during,after:edges._space};});
  ok(l.before==='curved'&&l.during==='normal'&&l.after==='curved','a lesson always gets the normal tank, and the picked space comes back after ('+l.before+' / '+l.during+' / '+l.after+')');
  const roll=await p.evaluate(()=>{setSpace('auto');const out={normal:0,portal:0,curved:0,bad:0};
    for(let i=0;i<600;i++){const sh=['12','8','6','10','5','rhombus','4','trapezoid'][i%8],sp=rollSpace(sh);out[sp]++;if(!spaceFits(sh,sp))out.bad++;}
    setSpace('portal');const held=[...Array(50)].every(()=>rollSpace('6')==='portal');
    applyMode('studio');setSpace('auto');const st=[...Array(50)].every(()=>rollSpace('6')==='normal');applyMode('play');
    return {...out,held,st};});
  const odd=(roll.portal+roll.curved)/600;
  ok(odd>0.25&&odd<0.42,'on auto in play, about one new shape in three lands in a portal or curved space ('+(odd*100).toFixed(0)+'%: '+roll.portal+' portal, '+roll.curved+' curved)');
  ok(roll.bad===0,'and only ever in a space that shape can be');
  ok(roll.held,'a picked space holds through every new shape');
  ok(roll.st,'studio on auto stays normal');
  await ctx.close();}

 // ---- 5. the corner menu ----
 for(const [tag,vp,mode] of [['desktop play',{viewport:{width:1440,height:900}},'play'],['desktop studio',{viewport:{width:1440,height:900}},'studio'],
                              ['phone play',{viewport:{width:390,height:844},isMobile:true,hasTouch:true},'play'],['phone studio',{viewport:{width:390,height:844},isMobile:true,hasTouch:true},'studio'],
                              ['small phone play',{viewport:{width:360,height:640},isMobile:true,hasTouch:true},'play']]){
  const {ctx,p,errs}=await open('?m='+mode,vp);await p.waitForTimeout(800);
  const pos=await p.evaluate(()=>{const c=document.getElementById('spaceBtn'),r=c.getBoundingClientRect();
    const hits=[...document.querySelectorAll('button,select,input,[role="button"],.psBtn,#triMix')].filter(e=>!document.getElementById('spaceChip').contains(e)&&e.offsetWidth&&getComputedStyle(e).visibility!=='hidden')
      .map(e=>[e.id||e.className,e.getBoundingClientRect()]).filter(([n,q])=>r.left<q.right&&r.right>q.left&&r.top<q.bottom&&r.bottom>q.top).map(([n])=>String(n).slice(0,20));
    return {r:[r.left,r.top,r.width,r.height].map(Math.round),hits,onScreen:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight};});
  ok(pos.onScreen&&pos.hits.length===0,'['+tag+'] the corner chip is on screen and on top of no control ('+pos.r.join(',')+(pos.hits.length?' covers '+pos.hits.join(','):'')+')');
  await p.click('#spaceBtn');await p.waitForTimeout(200);
  const m=await p.evaluate(()=>{const menu=document.getElementById('spaceMenu'),r=menu.getBoundingClientRect();
    const bs=[...menu.querySelectorAll('button')].filter(b=>!b.hidden).map(b=>b.getBoundingClientRect());
    return {open:!menu.hidden,onScreen:r.left>=0&&r.top>=0&&r.right<=innerWidth+0.5&&r.bottom<=innerHeight,small:bs.filter(q=>q.width<44||q.height<44).length,
      auto:!menu.querySelector('[data-space="auto"]').hidden};});
  ok(m.open&&m.onScreen,'['+tag+'] it opens, fully on screen');
  ok(m.small===0,'['+tag+'] every choice in it is at least 44x44');
  ok(m.auto===(mode==='play'),'['+tag+'] "auto" is offered in play only');
  await p.click('#spaceMenu [data-space="curved"]');await p.waitForTimeout(150);
  await p.click('#spaceMenu [data-view="2d"]');await p.waitForTimeout(150);
  const after=await p.evaluate(()=>({sp:edges._space,d3:window.__view.d3,txt:document.getElementById('spaceTxt').textContent,
    z:balls.every(b=>(b.z||0)===0)}));
  ok(after.d3===false&&after.z&&/^2D/.test(after.txt),'['+tag+'] picking 2D flattens the tank ('+after.txt+')');
  ok(after.sp==='curved'||String(await p.evaluate(()=>S.shape))==='star'||String(await p.evaluate(()=>S.shape))==='heart','['+tag+'] picking curved makes the tank curved ('+after.sp+')');
  await p.mouse.click(5,(vp.viewport.height*0.5)|0);await p.waitForTimeout(150);
  ok(await p.evaluate(()=>document.getElementById('spaceMenu').hidden),'['+tag+'] a tap anywhere else closes it');
  ok(errs.length===0,'['+tag+'] no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}
 {const {ctx,p}=await open('?m=learn');
  ok(await p.evaluate(()=>getComputedStyle(document.getElementById('spaceChip')).display==='none'),'learn mode has no corner chip');await ctx.close();}

 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'space pass clean'));
 process.exit(FAIL.length?1:0);})();

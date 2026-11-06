// ============================================================================================
//  ORB TEST — a solid with a wall per note (spec 2026-11-06-many-walls, ticket 01).
//    1. every orb from 12 to 124 faces is a real solid: exactly N faces, Euler holds, flat, closed, convex,
//       and no face is tiny next to another (the Fibonacci lattice is near equal-area)
//    2. "orb" in studio's menu sizes itself to the tank's notes: 31-EDO x 3 octaves = 93 faces, each a different
//       note, low at the bottom, high at the top; a new range or scale regrows it
//    3. balls stay inside a 93-face orb and only ever play its faces' notes
//    4. curved space takes an orb (it is convex)
//    5. the goo is never clipped by more than 24 planes (only checked when the GPU tank is up: SLIME_GL=1)
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-orb.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html';

(async()=>{const b=await launch();
 const open=async(q)=>{const ctx=await b.newContext({viewport:{width:1100,height:900}});const p=await ctx.newPage();
   const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message);});
   await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1')}catch(e){}});
   await p.goto(URL+q);await p.waitForTimeout(1300);return {ctx,p,errs};};
 const pick=(p,id,v)=>p.evaluate(([id,v])=>{const s=document.getElementById(id);s.value=v;s.dispatchEvent(new Event(s.type==='range'?'input':'change'));},[id,v]);

 // ---- 1. geometry, every size ----
 {const {ctx,p,errs}=await open('?m=studio&view=3d&space=normal');
  const g=await p.evaluate(()=>{const out=[];
    for(let N=12;N<=124;N++){const n='orb'+N,P=solidPlanes(n),F=solidFaces(P),V=solidVerts(F),E=V.reduce((a,v)=>a+v.nb.size,0)/2;
      let flat=0,inside=0;F.forEach((f,i)=>{for(const v of f)flat=Math.max(flat,Math.abs(vdot(P[i].n,v.p)-P[i].d));});
      for(const v of V)for(const pl of P)inside=Math.max(inside,vdot(pl.n,v.p)-pl.d);
      const area=F.map(f=>{let a=[0,0,0];for(let k=1;k+1<f.length;k++){const c=vcross([f[k].p[0]-f[0].p[0],f[k].p[1]-f[0].p[1],f[k].p[2]-f[0].p[2]],[f[k+1].p[0]-f[0].p[0],f[k+1].p[1]-f[0].p[1],f[k+1].p[2]-f[0].p[2]]);a=[a[0]+c[0],a[1]+c[1],a[2]+c[2]];}return vlen(a)/2;});
      out.push({N,F:P.length,euler:V.length-E+P.length,flat,inside,ratio:Math.max(...area)/Math.min(...area)});}
    return out;});
  const off=g.filter(r=>r.F!==r.N);
  ok(off.length===0,'every orb 12..124 has exactly N faces'+(off.length?' (off: '+off.map(r=>r.N+'->'+r.F).join(', ')+')':' (113 sizes)'));
  ok(g.every(r=>r.euler===2),'Euler\'s V - E + F = 2 for every one');
  ok(g.every(r=>r.flat<0.01&&r.inside<0.01),'every face flat, every corner inside every face: closed and convex');
  const worst=g.reduce((a,r)=>r.ratio>a.ratio?r:a);
  ok(worst.ratio<3,'no face under a third of the biggest (worst orb'+worst.N+': '+worst.ratio.toFixed(2)+'x)');

  // ---- 2. the menu's orb sizes itself to the notes ----
  await pick(p,'scale','edo31');await pick(p,'octs','3');await pick(p,'shape','orb');await p.waitForTimeout(300);
  const o=await p.evaluate(()=>{const P=SOLID.planes,D=SOLID.deg;
    const order=P.map((pl,i)=>i).sort((a,b)=>P[b].n[1]-P[a].n[1]);   // y is down: biggest y = bottom
    let climbs=0;for(let j=1;j<order.length;j++)if(D[order[j]]>D[order[j-1]])climbs++;
    return {shape:S.shape,faces:P.length,notes:new Set(D.map(d=>Math.round(centsForDegree(d)*100))).size,climbs,td:totalDegrees()};});
  ok(o.shape==='orb93'&&o.faces===93,'31-EDO x 3 octaves: "orb" becomes a 93-face solid (got '+o.shape+', '+o.faces+')');
  ok(o.notes===93,'every face plays a different note ('+o.notes+' of 93)');
  ok(o.climbs===92,'bottom to top, every face is higher than the one below ('+o.climbs+'/92)');
  await pick(p,'octs','4');await p.waitForTimeout(200);
  const o4=await p.evaluate(()=>[S.shape,SOLID.planes.length]);
  ok(o4[0]==='orb124'&&o4[1]===124,'range 4: it regrows to 124 faces (got '+o4.join(' ')+')');
  await pick(p,'scale','major');await pick(p,'octs','2');await p.waitForTimeout(200);
  const o2=await p.evaluate(()=>[S.shape,SOLID.planes.length,new Set(SOLID.deg).size]);
  ok(o2[0]==='orb14'&&o2[2]===14,'major x 2: 14 faces, 14 notes (got '+o2.join(' ')+')');
  await pick(p,'scale','pentaMaj');await pick(p,'octs','1');await p.waitForTimeout(200);
  const o1=await p.evaluate(()=>[S.shape,SOLID.planes.length,new Set(SOLID.deg).size]);
  ok(o1[0]==='orb12'&&o1[2]===5,'5 notes: never under 12 faces, and all 5 notes are on it (got '+o1.join(' ')+')');

  // ---- 3. balls stay in a 93-face orb and play its faces ----
  await pick(p,'scale','edo31');await pick(p,'octs','3');await p.waitForTimeout(200);
  const run=await p.evaluate(async()=>{S.slimeMode=false;S.rain=false;balls.length=0;for(let i=0;i<10;i++)spawn(CX+Math.cos(i)*60,CY+Math.sin(i)*60);setPlaying(true);
    const notes=[];const t0=trigger;trigger=function(c){notes.push(c);return t0.apply(this,arguments);};
    let worst=-1e9;const iv=setInterval(()=>{if(fillState!=='fill')return;const c=Math.cos(rot),s=Math.sin(rot);for(const b of balls){const x=b.x-CX,y=b.y-CY,z=(b.z-0.5)*BOXD;
      for(const pl of SOLID.planes){const n=pl.n;worst=Math.max(worst,(n[0]*c-n[1]*s)*x+(n[0]*s+n[1]*c)*y+n[2]*z-pl.d);}}},50);
    await new Promise(r=>setTimeout(r,10000));clearInterval(iv);trigger=t0;setPlaying(false);
    const faceCents=new Set(SOLID.deg.map(d=>Math.round(centsForDegree(d))));
    return {balls:balls.length,worst,notes:notes.length,onFace:notes.filter(c=>faceCents.has(Math.round(c))).length,distinct:new Set(notes.map(Math.round)).size};});
  ok(run.balls===10&&run.worst<=0.5,'10s in orb93: all 10 balls inside (deepest '+run.worst.toFixed(2)+'px past a face)');
  ok(run.notes>=15&&run.onFace===run.notes,'every note is one of the faces\' ('+run.onFace+'/'+run.notes+', '+run.distinct+' different)');
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}

 // ---- 4. curved orb, 5. goo clip cap ----
 {const {ctx,p,errs}=await open('?m=studio&view=3d&space=curved');
  await pick(p,'scale','edo31');await pick(p,'octs','2');await pick(p,'shape','orb');await p.waitForTimeout(600);
  const c=await p.evaluate(()=>({sp:edges._space,shape:S.shape,faces:SOLID.planes.length}));
  ok(c.sp==='curved'&&c.faces===62,'curved space takes an orb ('+c.sp+', '+c.shape+')');
  const gl=await p.evaluate(async()=>{await new Promise(r=>setTimeout(r,800));return window.__gooClipN;});
  if(gl==null)console.log('  SKIP  goo clip cap (no GPU tank in this browser; run with SLIME_GL=1)');
  else{await p.goto(URL+'?m=studio&view=3d&space=normal');await p.waitForTimeout(1300);
    await pick(p,'scale','edo31');await pick(p,'octs','2');await pick(p,'shape','orb');await p.waitForTimeout(1200);
    const n=await p.evaluate(()=>window.__gooClipN);ok(n<=24,'orb62: the goo is clipped by '+n+' planes, not 62');}
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}

 await b.close();
 console.log(FAIL.length?'\n'+FAIL.length+' FAILED':'\nALL PASS');process.exit(FAIL.length?1:0);})();

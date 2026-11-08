// ============================================================================================
//  THE SLIME, MODERNISED (2026-11-07, Flah: "looks like N64 slop" next to the glass; research
//  _docs/research/2026-11-07-slime-rendering.md). On the graphics-card renderer (SLIME_GL=1), a fixed seeded pool:
//    1. the skin is built on another core (goo-worker.js): the main thread spends at most 1.5 ms a frame on the goo
//       (p95 over 60 frames; it was 3-4 ms at the old 40-cell grid), and the grid is at least 56 cells
//    2. it is wet: a sharp glint (brightest pixel >= 0.94) and real shading (p99-p50 lightness >= 0.09), in three chord colours
//    3. it has volume: the thin edge is never darker than the deep middle
//    4. the hue is still the chord's (within 0.05 of the liquid colour) and saturated, in each of the three
//    5. it breathes, and stops under prefers-reduced-motion
//    6. with no Worker (an old browser) the goo is still built, on the main thread
//    7. one look, glass (ADR 0012): no switch, a crayon link or an old saved setting draws glass
//  Thresholds were measured on the old goo and the new one first (numbers in the checks). Run: node _dev/dev-goopro.js
// ============================================================================================
process.env.SLIME_GL='1';
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html?m=studio&view=3d&space=normal';
const init=()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');localStorage.setItem('slimehedron-tapped','1');}catch(e){}};
// the same pool every run: a compact body of goo and its loose drops (seeded, no Math.random)
const PLANT=async(p)=>p.evaluate(async()=>{const sel=document.getElementById('shape');sel.value='6';sel.dispatchEvent(new Event('change'));
  await new Promise(r=>setTimeout(r,600));fillState='fill';particles.length=0;const n=Math.round(partCap()*0.5);
  let sd=12345;const rnd=()=>((sd=sd*1103515245+12345&0x7fffffff)/0x7fffffff),g=()=>{let u=0;for(let k=0;k<3;k++)u+=rnd();return u/3-0.5;};
  for(let i=0;i<n;i++)particles.push({x:CX+g()*R*0.5,y:CY+g()*R*0.4,z:0.5+g()*0.5,vx:0,vy:0,vz:0,r:PR3,hue:0.8,pooled:true,age:80});
  if(!S.playing)setPlaying(true);await new Promise(r=>setTimeout(r,2500));});
// read the GPU canvas in the same task as a render (no preserveDrawingBuffer needed) and score the goo: the region of
// the liquid's hue (closed over the small holes a glint makes), its lightness spread, its brightest pixel, ring vs core
const SCORE=()=>{GLV.api.render();const c=GLV.api.canvas,w=c.width,h=c.height,cv=document.createElement('canvas');cv.width=w;cv.height=h;const x=cv.getContext('2d');x.drawImage(c,0,0);const d=x.getImageData(0,0,w,h).data;
 const toHSL=(r,g,b)=>{r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let H=0,Sx=0;if(mx!==mn){const dd=mx-mn;Sx=l>0.5?dd/(2-mx-mn):dd/(mx+mn);H=mx===r?((g-b)/dd+(g<b?6:0)):mx===g?(b-r)/dd+2:(r-g)/dd+4;H/=6;}return [H,Sx,l];};
 const lq=toHSL(liqRGB[0],liqRGB[1],liqRGB[2])[0],hd=(a,b)=>{const q=Math.abs(a-b)%1;return Math.min(q,1-q);};
 // the goo region: liquid-hue saturated pixels, closed over small holes (a glint is a hole in that mask)
 const m=new Uint8Array(w*h);for(let i=0,k=0;i<w*h;i++,k+=4){if(d[k+3]<200)continue;const [H,Sx]=toHSL(d[k],d[k+1],d[k+2]);if(Sx>0.3&&hd(H,lq)<0.08)m[i]=1;}
 const reg=new Uint8Array(w*h);for(let y=6;y<h-6;y++)for(let xx=6;xx<w-6;xx++){const i=y*w+xx;if(m[i]){reg[i]=1;continue;}let c4=0;for(const o of [-6,6,-6*w,6*w])if(m[i+o])c4++;if(c4>=4)reg[i]=1;}
 const L=[];let ring=0,rn=0,core=0,cn=0,hx=0,hy=0,ss=0;for(let i=0;i<w*h;i++){if(!reg[i])continue;const k=i*4;{const q2=toHSL(d[k],d[k+1],d[k+2]);if(q2[1]>0.3){hx+=Math.cos(q2[0]*6.2832);hy+=Math.sin(q2[0]*6.2832);}ss+=q2[1];}const l=toHSL(d[k],d[k+1],d[k+2])[2];L.push(l);let e=false;for(const o of [-5,5,-5*w,5*w])if(!reg[i+o])e=true;if(e){ring+=l;rn++;}else{core+=l;cn++;}}
 L.sort((a,b)=>a-b);const q=f=>L[Math.floor(L.length*f)];const med=q(0.5);
 return {hueOff:+hd(((Math.atan2(hy,hx)/6.2832)+1)%1,lq).toFixed(3),sat:+(ss/Math.max(1,L.length)).toFixed(2),n:L.length,p50:+med.toFixed(3),p95:+q(0.95).toFixed(3),p99:+q(0.99).toFixed(3),max:+L[L.length-1].toFixed(3),bright:+(L.filter(l=>l>=Math.min(0.97,med+0.15)).length/L.length*100).toFixed(2),ring:+(ring/rn).toFixed(3),core:+(core/cn).toFixed(3)};};

(async()=>{const b=await launch({args:['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist']});
 {const ctx=await b.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1});await ctx.addInitScript(init);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL);await p.waitForTimeout(4000);
  const up=await p.evaluate(()=>!!(typeof GLV!=='undefined'&&GLV.api));
  if(!up){ok(false,'the graphics-card renderer did not start (needs a GPU)');await b.close();process.exit(1);}
  await PLANT(p);
  const t=await p.evaluate(async()=>{const ts=[],ws=[];for(let i=0;i<60;i++){await new Promise(r=>requestAnimationFrame(r));const g=window.__gooT;if(g){ts.push(g[0]+g[1]+g[2]+g[3]);if(g[7])ws.push(g[7]);}}
    ts.sort((a,b)=>a-b);return {p95:ts[Math.floor(ts.length*0.95)],res:window.__gooT[6],worker:GLV.api.gooWorker(),wms:ws.length?ws[ws.length>>1]:0};});
  ok(t.worker&&t.wms>0,'1. the skin is built on another core (worker '+t.wms.toFixed(1)+' ms a build)');
  ok(t.p95<=1.5,'1. the main thread spends at most 1.5 ms a frame on the goo (p95 '+t.p95.toFixed(2)+' ms; it was 3-4)');
  ok(t.res>=56,'1. on a fine grid ('+t.res+' cells; it was 40)');
  const sc=[];for(const col of [[250,160,170],[160,230,190],[190,160,240]]){await p.evaluate(c=>{liqRGB[0]=c[0];liqRGB[1]=c[1];liqRGB[2]=c[2];},col);
   await p.waitForTimeout(600);await p.evaluate(()=>{S.playing=false;});await p.waitForTimeout(400);sc.push(await p.evaluate(SCORE));await p.evaluate(()=>{S.playing=true;});}
  console.log('        '+sc.map(s=>'max '+s.max+' range '+(s.p99-s.p50).toFixed(3)+' ring '+s.ring+' core '+s.core+' ('+s.n+' px)').join(' | '));
  // measured 2026-11-07 on the same seeded pool: old goo max 0.90-0.91, range 0.045-0.063, ring 0.024-0.035 DARKER than the
  // core in two colours of three; new goo max 0.967-0.976, range 0.116-0.133, ring 0.009-0.019 lighter
  ok(sc.every(s=>s.n>8000),'the goo is on screen in all three chord colours ('+sc.map(s=>s.n).join(', ')+' px)');
  ok(sc.every(s=>s.max>=0.94),'2. it is wet: a sharp glint in every colour (brightest '+sc.map(s=>s.max).join(', ')+'; the old wax topped out at 0.91)');
  ok(sc.every(s=>s.p99-s.p50>=0.09),'2. and it has real shading, not a flat fill (p99-p50 lightness '+sc.map(s=>(s.p99-s.p50).toFixed(3)).join(', ')+'; old 0.045-0.063)');
  ok(sc.every(s=>s.hueOff<0.05&&s.sat>0.35),'4. still the chord colour in each (hue off by '+sc.map(s=>s.hueOff).join(', ')+'), saturated ('+sc.map(s=>s.sat).join(', ')+')');
  ok(sc.every(s=>s.ring>=s.core),'3. it has volume: the thin edge is never darker than the deep middle ('+sc.map(s=>s.ring+' vs '+s.core).join(', ')+')');
  const wob=await p.evaluate(()=>GLV.api.gooWobble());
  ok(wob>0,'5. it breathes (wobble '+wob.toFixed(4)+')');
  await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(300);
  const wob2=await p.evaluate(()=>{GLV.api.render();return GLV.api.gooWobble();});
  ok(wob2===0,'5. and holds still under prefers-reduced-motion ('+wob2+')');
  ok(errs.length===0,'no page errors ('+errs.slice(0,2).join(' | ')+')');
  await ctx.close();}
 // 7. one look, glass (ADR 0012): no look switch, the renderer knows only glass, a crayon link or an old saved setting draws glass
 {const ctx=await b.newContext({viewport:{width:1280,height:900}});await ctx.addInitScript(init);await ctx.addInitScript(()=>{try{localStorage.setItem('slimehedron-look','crayon');}catch(e){}});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL+'&look=crayon');await p.waitForTimeout(4000);
  const lk=await p.evaluate(()=>({api:GLV.api&&GLV.api.look,row:!!document.getElementById('lookRow'),btn:document.querySelectorAll('[data-look]').length,
    saved:localStorage.getItem('slimehedron-look'),setLook:typeof window.setLook3D}));
  ok(lk.api==='glass'&&!lk.row&&lk.btn===0&&lk.setLook==='undefined','7. one look: glass, with no switch for another (a ?look=crayon link: '+lk.api+')');
  ok(lk.saved===null,'7. an old saved crayon setting is cleared ('+lk.saved+')');
  ok(errs.length===0,'7. no page errors ('+errs.slice(0,2).join(' | ')+')');
  await ctx.close();}
 // 6. no Worker: the old path builds it here
 {const ctx=await b.newContext({viewport:{width:1280,height:900}});await ctx.addInitScript(init);await ctx.addInitScript(()=>{try{delete window.Worker;window.Worker=undefined;}catch(e){}});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL);await p.waitForTimeout(4000);await PLANT(p);
  const f=await p.evaluate(()=>({worker:GLV.api.gooWorker(),col:!!GLV.api.gooColors()}));
  ok(!f.worker&&f.col,'6. with no Worker the goo is still built, on the main thread');
  ok(errs.length===0,'6. no page errors ('+errs.slice(0,2).join(' | ')+')');
  await ctx.close();}
 await b.close();
 console.log(FAIL.length?'\n'+FAIL.length+' FAIL':'\nthe slime is wet, has volume, keeps its colour, and costs the main thread almost nothing');process.exit(FAIL.length?1:0);})();

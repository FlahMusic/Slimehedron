// ============================================================================================
//  THE GOO BREAKS OUT AS A LIQUID (Flah 2026-11-21: "the look of the slime falling out of geometries looks absolutely
//  atrocious and so unorganic"). Out of a broken tank every drop fell on its own (gravity and a bounce) and was drawn as
//  its own disc: one rigid sheet of beads that dropped off the screen in ~1.5 s. Now it is a viscoelastic particle
//  liquid (Clavet, Beaudoin & Poulin 2005: gooBurstStep) drawn as metaballs (burstBlobs).
//  A full hexagon (packed drops, the flat view, studio, no spin) bursts on a pinned clock, three times with seeded
//  randomness (how the walls fly decides how long the goo hangs on them); each number is the median of the three.
//  Measured 2026-11-21, new / the code before it:
//    1. no dust: from 0.5 to 2 s at most 6% of the drops on screen are alone (2% / 17%)
//    2. it clings and drains: at 2 s at least 20% of it is still on screen, on the broken walls (32% / 10%); at 5.5 s at
//       most 12% (3% / 0%)
//    3. one skin, not gravel: 1 s in, the goo's outline on the screen is at most 15x the side of a square of its area
//       (perimeter / sqrt(area): 13.5 / 16.4). (Each drop drawn as its own disc over the NEW physics reads 13.6: the
//       liquid packs the drops so close the discs touch. The metaball look itself was judged on screenshots.)
//    4. cheap and sound: a physics tick at most 3 ms with ~900 drops (here ~1.1), never a NaN
//  Sabotage: SAB=sand (the old fall: each drop alone, gravity and a bounce) fails 1 and 2; SAB=stuck (no gravity) fails
//  2; the page as it was before this pass (put back by hand, 2026-11-21) fails 1, 2 and 3.
//  Needs a local server: python -m http.server 8765. Run from the project root: node _dev/dev-burst.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const SAB=process.env.SAB||'';
const SEEDS=[1,2,3];   // a burst is random (how the walls fly decides how long the goo hangs on them): three seeded bursts, the median of each
(async()=>{const b=await launch();const runs=[];const errs=[];
 for(const seed of SEEDS){const p=await (await b.newContext({viewport:{width:1100,height:860}})).newPage();
 p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');localStorage.setItem('slimehedron-tapped','1');}catch(e){}});
 await p.goto('http://127.0.0.1:8765/index.html?m=studio&space=normal&view=2d');await p.waitForTimeout(2500);
 runs.push(await p.evaluate(([SAB,seed])=>{
  let st=seed*2654435761>>>0;Math.random=()=>{st=(st+0x6D2B79F5)>>>0;let t=st;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};   // mulberry32
  const sel=document.getElementById('shape');sel.value='6';sel.dispatchEvent(new Event('change'));
  S.spin=0;balls.length=0;S.playing=false;
  if(SAB==='sand')window.gooBurstStep=function(segs){for(const q of particles){q.vy+=gY;q.vx+=gX;q.x+=q.vx;q.y+=q.vy;q.vx*=0.994;segHit(q,segs);}};
  if(SAB==='stuck')gY=0;
  // the goo: a colour found nowhere on the page, so its pixels can be counted
  window.chordHSL=()=>[0.86,0.75,0.5];liqHSL=null;
  particles.length=0;let sd=7;const rnd=()=>((sd=sd*1103515245+12345&0x7fffffff)/0x7fffffff);
  for(let y=CY+R*0.85;y>CY-R*0.6;y-=PR*1.75)for(let x=CX-R;x<CX+R;x+=PR*2){const q=mkDrop(x+rnd()*2,y+rnd()*2,0.5,0,0,0,0.3,PR,80,true,0,0);
    let inside=true;for(const e of edges)if((q.x-e.ax)*e.nx+(q.y-e.ay)*e.ny<PR)inside=false;if(inside)particles.push(q);}
  for(let i=0;i<20;i++){relaxParticles();for(const q of particles)bounceInside(q);}
  const N0=particles.length;let T=performance.now();startBreak(T);
  const out={N0,spread:0,dust:0,at2:0,at55:0,rough:0,ms:0,nan:0};
  const dustShare=()=>{const P=particles.filter(q=>q.x>-20&&q.x<W+20&&q.y<H+20),n=P.length,par=P.map((_,i)=>i),f=i=>{while(par[i]!==i){par[i]=par[par[i]];i=par[i];}return i;};
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Math.hypot(P[i].x-P[j].x,P[i].y-P[j].y)<PR*2.6)par[f(i)]=f(j);
    const sz={};for(let i=0;i<n;i++){const k=f(i);sz[k]=(sz[k]||0)+1;}let lone=0;for(const k in sz)if(sz[k]===1)lone++;return n?lone/n:0;};
  const onScreen=()=>particles.filter(q=>q.x>-20&&q.x<W+20&&q.y<H+20).length/N0;
  for(let t=1;t<=330;t++){T+=1000/60;_tickT=T;const a=performance.now();fillPhysics(T);out.ms+=performance.now()-a;
    for(const q of particles)if(!Number.isFinite(q.x)||!Number.isFinite(q.y))out.nan++;
    if(t===30){const sp=particles.map(q=>Math.hypot(q.vx,q.vy)),m=sp.reduce((x,y)=>x+y,0)/sp.length,v=Math.sqrt(sp.reduce((x,y)=>x+(y-m)*(y-m),0)/sp.length);out.spread=v/Math.max(1e-6,m);}
    if(t>=30&&t<=120&&t%15===0)out.dust=Math.max(out.dust,dustShare());
    if(t===60){draw();const d=ctx.getImageData(0,0,W,H).data,M=new Uint8Array(W*H);let A=0;
      for(let i=0,j=0;j<W*H;i+=4,j++){const R_=d[i],G=d[i+1],B=d[i+2];if(d[i+3]>100&&R_>120&&G<130&&B>110&&R_-G>60&&B-G>40){M[j]=1;A++;}}
      let Pm=0;for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const j=y*W+x;if(M[j]&&(!M[j-1]||!M[j+1]||!M[j-W]||!M[j+W]))Pm++;}
      out.rough=A>200?Pm/Math.sqrt(A):99;out.area=A;}
    if(t===120)out.at2=onScreen();}
  out.at55=onScreen();out.ms/=330;return out;},[SAB,seed]));
  await p.close();}
 const med=k=>{const v=runs.map(x=>x[k]).sort((a,b)=>a-b);return v[v.length>>1];},all=k=>runs.map(x=>+x[k].toFixed(2)).join(' / ');
 const r={spread:med('spread'),dust:med('dust'),at2:med('at2'),at55:med('at55'),rough:med('rough'),ms:med('ms'),nan:runs.reduce((n,x)=>n+x.nan,0),N0:runs[0].N0};
 if(process.env.DEBUG)for(const k of ['spread','dust','at2','at55','rough','ms'])console.log('   ',k,all(k));
 ok(r.dust<=0.06,`1. no dust (${(r.dust*100).toFixed(0)}% of the drops alone at worst, 0.5-2 s)`);
 ok(r.at2>=0.2&&r.at55<=0.12,`2. it clings, then drains (${(r.at2*100).toFixed(0)}% on screen at 2 s, ${(r.at55*100).toFixed(0)}% at 5.5 s)`);
 ok(r.rough<=15,`3. one skin, not gravel (outline ${r.rough.toFixed(1)}x the side of its area)`);
 ok(r.ms<=3&&r.nan===0,`4. cheap and sound (${r.ms.toFixed(2)} ms a tick for ${r.N0} drops; ${r.nan} NaN)`);
 ok(errs.length===0,'no page errors '+errs.slice(0,2).join(' | '));
 await b.close();console.log(FAIL.length?FAIL.length+' FAILURE(S)':'the goo breaks out as a liquid');process.exit(FAIL.length?1:0);})();

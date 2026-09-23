// ============================================================================================
//  IS THE MOTION FLUID?
//  The simulation runs on a fixed 60Hz step, which is the right call — it is what makes bounces
//  deterministic and stops a fast ball tunnelling through a wall. But the renderer was drawing the
//  raw simulated position, so on any display not exactly in phase with the step, frames repeat.
//  This samples the drawn position ONCE PER ANIMATION FRAME (sampling on a timer instead fakes
//  stalls, because _alpha only advances when a frame runs) and compares:
//     RAW  = where the simulation last put the ball
//     DRAWN = where the renderer actually paints it
//  A duplicate frame is one where the position did not move. Fewer is smoother.
//  Needs a local server: python3 -m http.server 8765
//  Run: node dev-fluid.js
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};

const sample=async(p,frames)=>p.evaluate((N)=>new Promise(res=>{
  for(let i=0;i<5;i++){try{spawnRain();}catch(e){}}
  const raw=[],drawn=[];let n=0;
  const tick=()=>{
    if(balls.length){
      const b=balls[0];
      raw.push([b.x,b.y]);
      drawn.push([(typeof lerpX==='function')?lerpX(b):b.x,(typeof lerpY==='function')?lerpY(b):b.y]);
    }
    if(++n<N)requestAnimationFrame(tick); else res({raw,drawn});
  };
  requestAnimationFrame(tick);
}),frames);

const stats=(pts)=>{
  const d=[];
  for(let i=1;i<pts.length;i++)d.push(Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
  const moving=d.filter(x=>x>0.0001);
  const mean=moving.length?moving.reduce((a,c)=>a+c,0)/moving.length:0;
  const dup=d.filter(x=>x<1e-6).length;              // frame painted the exact same pixel
  return {dupPct:100*dup/Math.max(1,d.length),mean,n:d.length};};

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--autoplay-policy=no-user-gesture-required']});

for(const mode of ['play','studio']){
  const ctx=await b.newContext({viewport:{width:1440,height:900}});
  const p=await ctx.newPage();
  await p.goto('http://127.0.0.1:8765/index.html?m='+mode);
  await p.waitForTimeout(3500);
  const r=await sample(p,240);
  const R=stats(r.raw), D=stats(r.drawn);
  console.log('  ['+mode+'] '+R.n+' frames — raw duplicates '+R.dupPct.toFixed(0)+
              '%  ->  drawn duplicates '+D.dupPct.toFixed(0)+'%');
  ok(D.dupPct<=R.dupPct,'['+mode+'] interpolating never makes it worse than the raw position');
  ok(D.dupPct<12,'['+mode+'] the drawn position advances nearly every frame ('+D.dupPct.toFixed(0)+'% duplicate frames)');
  ok(D.mean>0,'['+mode+'] the balls are actually moving');
  await ctx.close();
}

// THE MECHANISM ITSELF. Headless Chromium drives rAF at whatever rate it likes, and here it happens
// to line up with the 60Hz sim step — so the duplicate-frame count above cannot demonstrate the fix,
// only guard against a regression. The judder this addresses appears when the display and the step
// are OUT of phase, which is every 120Hz/144Hz screen. So test the mechanism directly: sweep the
// blend factor and prove the drawn position really does walk from the previous tick to the current
// one, instead of snapping at tick boundaries.
{const ctx=await b.newContext({viewport:{width:1440,height:900}});
 const p=await ctx.newPage();
 await p.goto('http://127.0.0.1:8765/index.html?m=play');
 await p.waitForTimeout(3000);
 const r=await p.evaluate(()=>{
   for(let i=0;i<3;i++){try{spawnRain();}catch(e){}}
   const b=balls[0]; if(!b)return null;
   // a known, non-trivial step between the previous and current tick
   b.px=100;b.py=100;b.x=160;b.y=100;
   const keep=_alpha, out=[];
   for(const a of [0,0.25,0.5,0.75,1]){_alpha=a;out.push(+lerpX(b).toFixed(3));}
   _alpha=keep;
   return {out,fixed:(typeof FIXED!=='undefined')?FIXED:null};});
 ok(!!r,'a ball was available to measure');
 if(r){
   ok(JSON.stringify(r.out)==='[100,115,130,145,160]',
     'the drawn position walks the whole way between ticks ('+r.out.join(' -> ')+')');
   ok(r.fixed&&Math.abs(r.fixed-1000/60)<0.01,'and the simulation is still a fixed 60Hz step ('+r.fixed.toFixed(3)+'ms)');
 }
 await ctx.close();}

console.log(FAIL.length?('\n'+FAIL.length+' FAILURE(S)'):'\nfluid to look at, fixed-step underneath');
await b.close();process.exit(FAIL.length?1:0);})();

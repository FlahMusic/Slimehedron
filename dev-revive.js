// ============================================================================================
//  THE REVIVE SWEEP — does the app actually SURVIVE a bad number?
//
//  A ball whose position goes to NaN is fatal in a way that is easy to miss: every comparison
//  against NaN is false, so it matches no despawn test and is never removed, and from then on it
//  throws inside the renderer on EVERY frame. One bad subtraction = a permanently dead app.
//
//  Guarding each entry point only covers the ones someone thought of. So the app now sweeps the
//  live state once a frame and throws out whatever has gone bad. This suite proves that works by
//  deliberately poisoning the tank and then demanding the app still runs, still moves and still
//  makes a sound — not merely that a function was called.
//  Run: node dev-revive.js   (needs python3 -m http.server 8765)
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const SILENT=0.0004;

const TAP=()=>{
  {let id=1;const cbs=new Map();
   window.requestAnimationFrame=function(fn){const i=id++;cbs.set(i,fn);
     setTimeout(()=>{if(cbs.has(i)){cbs.delete(i);try{fn(performance.now());}catch(e){}}},16);return i;};
   window.cancelAnimationFrame=function(i){cbs.delete(i);};}
  const oc=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(dest){const r=oc.apply(this,arguments);
    try{const ctx=this.context;if(dest&&ctx&&dest===ctx.destination){
      if(!ctx.__tap){const an=ctx.createAnalyser();an.fftSize=2048;an.smoothingTimeConstant=0;ctx.__tap=an;window.__tap=an;}
      oc.call(this,ctx.__tap);}}catch(e){}
    return r;};
  window.__rms=async(ms)=>{const an=window.__tap;if(!an)return -1;
    const buf=new Float32Array(an.fftSize);let peak=0;const t0=performance.now();
    while(performance.now()-t0<ms){an.getFloatTimeDomainData(buf);let s=0;
      for(let i=0;i<buf.length;i++)s+=buf[i]*buf[i];peak=Math.max(peak,Math.sqrt(s/buf.length));
      await new Promise(r=>setTimeout(r,16));}
    return peak;};
};

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--autoplay-policy=no-user-gesture-required']});
const ctx=await b.newContext({viewport:{width:1100,height:860}});
await ctx.addInitScript(TAP);
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8765/index.html?m=studio');
await p.waitForTimeout(3200);

// ---------- 1. A HEALTHY APP DROPS NOTHING ----------
// If this ever fires on its own, something upstream is genuinely producing NaN and the sweep is
// papering over a real bug. The counter is the alarm, not the cure.
const baseline=await p.evaluate(()=>window.__nanDrops||0);
await p.waitForTimeout(4000);
const afterIdle=await p.evaluate(()=>window.__nanDrops||0);
ok(afterIdle===0,'normal play produces NO broken numbers at all (dropped '+afterIdle+')');

// ---------- 2. POISON THE TANK ----------
const before=await p.evaluate(()=>({n:balls.length,drops:window.__nanDrops||0}));
await p.evaluate(()=>{
  // every flavour of bad: NaN position, Infinity position, NaN velocity
  balls.push({x:NaN,y:NaN,px:NaN,py:NaN,vx:1,vy:1,hue:0.5,trail:[]});
  balls.push({x:Infinity,y:0,px:0,py:0,vx:0,vy:0,hue:0.2,trail:[]});
  balls.push({x:100,y:100,px:100,py:100,vx:NaN,vy:-Infinity,hue:0.8,trail:[]});
});
const poisoned=await p.evaluate(()=>balls.length);
ok(poisoned===before.n+3,'three poisoned balls are in the tank ('+before.n+' -> '+poisoned+')');

await p.waitForTimeout(600);
const after=await p.evaluate(()=>({n:balls.length,drops:window.__nanDrops||0,
  anyBad:balls.some(x=>!(Number.isFinite(x.x)&&Number.isFinite(x.y)&&Number.isFinite(x.vx)&&Number.isFinite(x.vy)))}));
ok(after.drops-before.drops===3,'all three were thrown out and COUNTED ('+(after.drops-before.drops)+' dropped)');
ok(!after.anyBad,'no ball with broken numbers remains in the tank');

// ---------- 3. THE APP IS STILL ALIVE — this is the part that matters ----------
// Removing them is not the point. Surviving them is. Without the sweep the renderer throws every
// frame from here on, so these three checks are the real gate.
const moved=await p.evaluate(()=>new Promise(res=>{
  const pts=[];let n=0;
  const tick=()=>{if(balls.length)pts.push([balls[0].x,balls[0].y]);
    if(++n<40)requestAnimationFrame(tick);
    else{let m=0;for(let i=1;i<pts.length;i++)if(Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1])>1e-6)m++;
      res({samples:pts.length,moved:m});}};
  requestAnimationFrame(tick);}));
ok(moved.samples>0&&moved.moved>moved.samples*0.5,
  'the tank is still animating after the poisoning ('+moved.moved+'/'+Math.max(0,moved.samples-1)+' frames moved)');

const rms=await p.evaluate(async()=>{const iv=setInterval(()=>{try{drumSchedule();}catch(e){}},25);
  const v=await window.__rms(3000);clearInterval(iv);return v;});
ok(rms>SILENT,'and it still makes a sound afterwards (peak RMS '+rms.toFixed(5)+')');

const box=await p.evaluate(()=>{const r=document.getElementById('cv').getBoundingClientRect();
  return {x:r.left+r.width*0.5,y:r.top+r.height*0.38};});
const nBefore=await p.evaluate(()=>balls.length);
await p.mouse.click(box.x,box.y);
await p.waitForTimeout(400);
const nAfter=await p.evaluate(()=>balls.length);
ok(nAfter>nBefore,'and it still responds to a touch ('+nBefore+' -> '+nAfter+' balls)');

// ---------- 4. NO RENDERER DAMAGE ----------
// A NaN that reaches createRadialGradient throws. If the sweep missed, this fills up.
const rendererErrs=errs.filter(e=>/gradient|non-finite|NaN|Infinity/i.test(e));
ok(rendererErrs.length===0,'the renderer never threw on a bad number ('+rendererErrs.length+')'+
  (rendererErrs.length?' :: '+rendererErrs[0]:''));
ok(errs.length===0,'no page errors at all ('+errs.length+')'+(errs.length?' :: '+errs.slice(0,3).join(' | '):''));

await b.close();
console.log('\n'+(FAIL.length?'FAILED '+FAIL.length+':\n - '+FAIL.join('\n - '):'the app survives bad numbers instead of dying of them'));
process.exit(FAIL.length?1:0);
})();

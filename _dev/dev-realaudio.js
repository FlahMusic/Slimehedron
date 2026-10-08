// ============================================================================================
//  THE DOES-IT-ACTUALLY-MAKE-A-SOUND GATE.
//  Every pitched sound in learn mode was silent for two months while twenty-one suites stayed green,
//  because every one of them measured whether a FUNCTION WAS CALLED. The call happened. The sound
//  did not. Three suites even hooked a function the lessons had stopped routing through, so a dead
//  hook and a dead app looked identical.
//
//  So this one does not trust any function. It taps the audio graph at the point where it reaches
//  the speakers, reads the actual samples, and computes RMS. If the number is zero, nothing came
//  out — no matter how green everything else is. You cannot fake this by calling something.
//  Run: node dev-realaudio.js   (needs python3 -m http.server 8765)
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};

// Splice an analyser in beside AudioContext.destination, whatever connects to it and whenever.
const TAP=()=>{
  // Headless throttles requestAnimationFrame for a backgrounded page, and several lessons drive
  // their click track from a rAF loop. Shim it to a timer so a throttled frame cannot be mistaken
  // for a mute lesson — the first time this suite ran, six lessons looked silent for this reason
  // and were silent for a REAL one underneath, which is exactly why the shim has to be here.
  {let id=1;const cbs=new Map();
   window.requestAnimationFrame=function(fn){const i=id++;cbs.set(i,fn);
     setTimeout(()=>{if(cbs.has(i)){cbs.delete(i);try{fn(performance.now());}catch(e){}}},16);return i;};
   window.cancelAnimationFrame=function(i){cbs.delete(i);};}
  const origConnect=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(dest){
    const r=origConnect.apply(this,arguments);
    try{
      const ctx=this.context;
      if(dest&&ctx&&dest===ctx.destination){
        if(!ctx.__tap){
          const an=ctx.createAnalyser();an.fftSize=2048;an.smoothingTimeConstant=0;
          ctx.__tap=an;window.__tap=an;
        }
        origConnect.call(this,ctx.__tap);
      }
    }catch(e){}
    return r;
  };
  // peak RMS over a window — the loudest moment, so a short note is not averaged into nothing
  window.__rms=async(ms)=>{
    const an=window.__tap; if(!an)return -1;
    const buf=new Float32Array(an.fftSize);
    let peak=0; const t0=performance.now();
    while(performance.now()-t0<ms){
      an.getFloatTimeDomainData(buf);
      let s=0;for(let i=0;i<buf.length;i++)s+=buf[i]*buf[i];
      peak=Math.max(peak,Math.sqrt(s/buf.length));
      await new Promise(r=>setTimeout(r,16));
    }
    return peak;
  };
};
const SILENT=0.0004;   // below this is numerically indistinguishable from a dead graph

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--autoplay-policy=no-user-gesture-required']});
const ctx=await b.newContext({viewport:{width:1100,height:860}});
await ctx.addInitScript(TAP);
const p=await ctx.newPage();
const errs=[];
p.on('pageerror',e=>errs.push(e.message));

// ---------- 1. PLAY MODE ----------
await p.goto('http://127.0.0.1:8765/index.html?m=play');
await p.waitForTimeout(3200);
await p.click('#playBtn').catch(()=>{});
await p.waitForTimeout(1200);
const playRms=await p.evaluate(()=>window.__rms(3500));
ok(playRms>SILENT,'PLAY mode actually makes a sound (peak RMS '+playRms.toFixed(5)+')');

await p.click('#drumBtn').catch(()=>{});
await p.waitForTimeout(400);
const playDrums=await p.evaluate(async()=>{
  // rAF is throttled headless, so pump the conductor on our own clock
  const iv=setInterval(()=>{try{drumSchedule();}catch(e){}},25);
  const v=await window.__rms(3500);clearInterval(iv);return v;});
ok(playDrums>SILENT,'PLAY mode with the kit running makes a sound (peak RMS '+playDrums.toFixed(5)+')');

// ---------- 2. STUDIO MODE ----------
const p2=await ctx.newPage();
p2.on('pageerror',e=>errs.push('studio: '+e.message));
await p2.goto('http://127.0.0.1:8765/index.html?m=studio');
await p2.waitForTimeout(3200);
await p2.click('#playBtn').catch(()=>{});
await p2.waitForTimeout(600);
await p2.click('#drumBtn').catch(()=>{});
const studioRms=await p2.evaluate(async()=>{
  const iv=setInterval(()=>{try{drumSchedule();}catch(e){}},25);
  const v=await window.__rms(4000);clearInterval(iv);return v;});
ok(studioRms>SILENT,'STUDIO mode actually makes a sound (peak RMS '+studioRms.toFixed(5)+')');

// ---------- 3. EVERY LESSON ----------
const LESSONS=['pulse','make','sayplay','howlong','countbar','rest','song','split','tempo','dynamic',
  'high','notes','home','steps','newhome','majorscale','brightdark','intervals',
  'minorscale','minorshapes','modes','staff','melody','echo','updown','findhome'];
console.log('');
const mute=[];
for(const id of LESSONS){
  const pg=await ctx.newPage();
  pg.on('pageerror',e=>errs.push(id+': '+e.message));
  await pg.goto('http://127.0.0.1:8765/index.html?l='+id);
  await pg.waitForTimeout(1500);
  let rms=await pg.evaluate(()=>window.__rms(5000));
  if(rms<=SILENT){                       // ask it to play again before calling it mute
    await pg.evaluate(()=>{const b=document.querySelector('.lgListen');
      if(b)b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
      if(window._lab_lgAgain)window._lab_lgAgain();});
    rms=await pg.evaluate(()=>window.__rms(4000));
  }
  const good=rms>SILENT;
  if(!good)mute.push(id);
  console.log('  '+(good?'PASS':'FAIL')+'  '+id.padEnd(12)+' peak RMS '+rms.toFixed(5));
  await pg.close();
}
console.log('');
ok(mute.length===0,'every lesson puts real audio out of the speakers'+(mute.length?' — SILENT: '+mute.join(', '):''));

const real=errs.filter(e=>!/ServiceWorker|sw\.js/.test(e));
ok(real.length===0,'no page errors anywhere'+(real.length?': '+real.slice(0,3).join(' | '):''));

await b.close();
console.log(FAIL.length?'\n'+FAIL.length+' FAILURE(S) — something is mute':'\nall three modes put real audio out, measured at the speakers');
process.exit(FAIL.length?1:0);})();

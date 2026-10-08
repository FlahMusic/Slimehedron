// ============================================================================================
//  THE FIRST SOUND BELONGS TO THE CHILD — and it has to arrive FAST.
//
//  Two bugs lived here together, each hiding the other:
//   1. play mode started the whole band the instant the door opened, so the app's first sound was
//      the app's, not the child's.
//   2. a tap on the tank took 1471 MILLISECONDS to make any noise (measured): the ball must fly
//      across the tank to reach a wall, and quantize then held that note until the next grid line.
//  Because (1) was playing a band over the top, (2) was invisible — you tapped, you heard music,
//  you assumed it was you. Fixing (1) alone would have shipped a mode whose first touch is silent.
//
//  So this suite measures TIME-TO-SOUND from a real trusted click, not whether a handler ran.
//  Run: node dev-firsttouch.js   (needs python3 -m http.server 8765)
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};

const SILENT=0.0004;      // below this is indistinguishable from a dead audio graph
const CAUSAL=250;         // ms. past roughly a quarter second a child stops linking touch to sound

const TAP=()=>{
  // headless throttles requestAnimationFrame for a backgrounded page and the tank runs on rAF,
  // so a throttled frame would look exactly like a mute app. shim it to a timer first.
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
  // a timeline, so we can say WHEN a sound happened rather than just that one did
  window.__startTL=()=>{window.__tl=[];const an=window.__tap;const buf=new Float32Array(an.fftSize);
    const t0=performance.now();
    window.__tlIv=setInterval(()=>{an.getFloatTimeDomainData(buf);let s=0;
      for(let i=0;i<buf.length;i++)s+=buf[i]*buf[i];
      window.__tl.push([performance.now()-t0,Math.sqrt(s/buf.length)]);},4);};   // 4ms, not 16: a
      // struck wall is a short note, and a coarse sampler can step straight over its peak and
      // report silence. Measured directly, a strike is 0-14ms at peak 0.10-0.26 — never silent.
  window.__stopTL=()=>{clearInterval(window.__tlIv);return window.__tl;};
};

const open=async(ctx,mode,settle)=>{const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.__errs=errs;
  await p.goto('http://127.0.0.1:8765/index.html?m='+mode);
  await p.waitForTimeout(settle==null?3000:settle);return p;};
const tankPoint=p=>p.evaluate(()=>{const r=document.getElementById('cv').getBoundingClientRect();
  return {x:r.left+r.width*0.5,y:r.top+r.height*0.38};});

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--autoplay-policy=no-user-gesture-required']});
const ctx=await b.newContext({viewport:{width:1100,height:860}});
await ctx.addInitScript(TAP);
const allErrs=[];

// ---------- 1. PLAY MODE OPENS SILENT ----------
{const p=await open(ctx,'play');
 const st=await p.evaluate(()=>({playing:S.playing,drum:drumOn,band:bandOn,slime:S.slimeMode}));
 const rms=await p.evaluate(()=>window.__rms(2500));
 ok(rms<=SILENT,'play mode opens SILENT — the app does not play itself (peak RMS '+rms.toFixed(5)+')');
 ok(!st.drum&&!st.band&&!st.slime,'play mode opens with kit, band and slime all OFF ('+JSON.stringify(st)+')');
 allErrs.push(...p.__errs.map(e=>'silent-open: '+e));await p.close();}

// ---------- 2. THE CHILD'S TAP SOUNDS, FAST ----------
{const p=await ctx.newPage();
 const _e=[];p.on('pageerror',e=>_e.push(e.message));p.__errs=_e;   // open() normally does this
 // Go in through the SPLASH, the way a child does. The door click is the user gesture that starts
 // the audio engine; deep-linking ?m=play skips it, so the first tap is also the gesture and the
 // note lands in a context that has not finished waking up (measured 41-306ms, sometimes silent).
 // That is a property of the test's shortcut, not of the app.
 await p.goto('http://127.0.0.1:8765/index.html');
 await p.waitForTimeout(1200);
 await p.click('.modeCard[data-m="play"]');
 await p.waitForTimeout(2600);
 const ready=await p.evaluate(()=>AC.state);
 ok(ready==='running','the audio engine is awake before the child touches anything ('+ready+')');
 const pt=await tankPoint(p);
 await p.evaluate(()=>window.__startTL());
 await p.mouse.click(pt.x,pt.y);                       // a REAL trusted click, not a dispatched event
 await p.waitForTimeout(380);                          // stop before the band is due at 400ms
 const tl=await p.evaluate(()=>window.__stopTL());
 const first=tl.find(r=>r[1]>SILENT);
 const t=first?first[0]:1e9;
 ok(!!first,'tapping the tank makes a sound at all'+(first?' (peak RMS '+first[1].toFixed(5)+')':''));
 ok(t<=CAUSAL,'that sound arrives in '+(first?Math.round(t)+'ms':'never')+' — must be under '+CAUSAL+'ms to feel caused');
 allErrs.push(...p.__errs.map(e=>'tap: '+e));await p.close();}

// ---------- 3. THE CHILD GOES FIRST, THE BAND FOLLOWS ----------
{const p=await open(ctx,'play');
 const pt=await tankPoint(p);
 const pre=await p.evaluate(()=>({drum:drumOn,band:bandOn}));
 await p.mouse.click(pt.x,pt.y);
 await p.waitForTimeout(1400);
 const post=await p.evaluate(()=>({drum:drumOn,band:bandOn,slime:S.slimeMode,playing:S.playing}));
 ok(!pre.drum&&!pre.band,'band is still off at the moment of the first touch');
 ok(post.drum&&post.band,'band has joined within 1.4s AFTER the touch ('+JSON.stringify(post)+')');
 allErrs.push(...p.__errs.map(e=>'order: '+e));await p.close();}

// ---------- 4. IDLE RESCUE: a child who touches nothing still gets shown what this is ----------
{const p=await open(ctx,'play',10500);
 const st=await p.evaluate(()=>({drum:drumOn,band:bandOn,slime:S.slimeMode,playing:S.playing}));
 const rms=await p.evaluate(async()=>{const iv=setInterval(()=>{try{drumSchedule();}catch(e){}},25);
   const v=await window.__rms(3000);clearInterval(iv);return v;});
 ok(st.drum&&st.band&&st.playing,'after ~10s of nothing, the band starts by itself ('+JSON.stringify(st)+')');
 ok(rms>SILENT,'and that rescue actually makes a sound (peak RMS '+rms.toFixed(5)+')');
 allErrs.push(...p.__errs.map(e=>'rescue: '+e));await p.close();}

// ---------- 5. STUDIO IS DELIBERATELY DIFFERENT AND MUST NOT REGRESS ----------
// studio is a musical bed you grab and shape, so it DOES start by itself. this guards that on purpose,
// so a future "make everything open silent" pass cannot quietly take it away.
{const p=await open(ctx,'studio');
 const st=await p.evaluate(()=>({drum:drumOn,band:bandOn,playing:S.playing}));
 const rms=await p.evaluate(async()=>{const iv=setInterval(()=>{try{drumSchedule();}catch(e){}},25);
   const v=await window.__rms(3000);clearInterval(iv);return v;});
 ok(st.playing&&st.band,'studio still starts jamming on its own, by design ('+JSON.stringify(st)+')');
 ok(rms>SILENT,'studio makes a sound on entry (peak RMS '+rms.toFixed(5)+')');
 allErrs.push(...p.__errs.map(e=>'studio: '+e));await p.close();}

// ---------- 6. PRESSING PAUSE FIRST MUST NOT LEAVE A CONTRADICTION ----------
// the first-touch listener runs in the capture phase, i.e. BEFORE the button it was aimed at. if it
// touched the transport it would fight play/pause. assert the button still wins.
{const p=await open(ctx,'play');
 await p.click('#playBtn');
 await p.waitForTimeout(1300);
 const st=await p.evaluate(()=>({playing:S.playing,label:document.getElementById('playBtn').textContent.trim()}));
 const agrees=(st.playing&&/pause/i.test(st.label))||(!st.playing&&/play/i.test(st.label));
 ok(agrees,'pressing play/pause first leaves button and transport agreeing ('+JSON.stringify(st)+')');
 allErrs.push(...p.__errs.map(e=>'transport: '+e));await p.close();}

// ---------- 7. LEARN MODE'S TANK IS INSTANT TOO ----------
// learn mode taps go through the same struck-wall path, so the un-quantized fix must hold there.
{const p=await open(ctx,'learn');
 const got=await p.evaluate(async()=>{
   try{if(!window.LAB||!LAB.take)return {skip:'no LAB'};
     LAB.take({touch:true});
     const an=window.__tap;if(!an)return {skip:'no tap'};
     const buf=new Float32Array(an.fftSize);const t0=performance.now();let first=null;
     LAB.strike(0);
     while(performance.now()-t0<400){an.getFloatTimeDomainData(buf);let s=0;
       for(let i=0;i<buf.length;i++)s+=buf[i]*buf[i];
       const v=Math.sqrt(s/buf.length);
       if(v>0.0004&&first===null)first=performance.now()-t0;
       await new Promise(r=>setTimeout(r,8));}
     LAB.give();return {first:first};
   }catch(e){return {err:String(e)};}});
 if(got.skip)console.log('  SKIP  learn tank timing ('+got.skip+')');
 else ok(got.first!==null&&got.first<=CAUSAL,'a struck wall in learn mode sounds in '+
   (got.first===null?'never':Math.round(got.first)+'ms')+' — under '+CAUSAL+'ms'+(got.err?' ERR '+got.err:''));
 allErrs.push(...p.__errs.map(e=>'learn: '+e));await p.close();}

ok(allErrs.length===0,'no page errors anywhere ('+allErrs.length+')'+(allErrs.length?' :: '+allErrs.slice(0,4).join(' | '):''));
await b.close();
console.log('\n'+(FAIL.length?'FAILED '+FAIL.length+':\n - '+FAIL.join('\n - '):'ALL GREEN'));
process.exit(FAIL.length?1:0);
})();

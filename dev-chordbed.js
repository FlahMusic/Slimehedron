// ============================================================================================
//  THE CHORD BED MUST SURVIVE THE MIXER.
//  The chords used to run through the triangle mixer's band corner AND have their level multiplied
//  by the bass/pad crossfader on top. So dragging the triangle toward drums silenced the harmony,
//  and a control that says nothing about chords quietly took them away. The chords are the floor
//  the rest of the music stands on; they now have their own path to the speakers.
//
//  This drags the triangle HARD to drums, switches the kit off and mutes the melody, so anything
//  still audible can only be the chord bed — then mutes the chord bus as a control, to prove the
//  thing being measured really is the chords and not something leaking through another path.
//  Run: node dev-chordbed.js   (needs python3 -m http.server 8765)
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const SILENT=0.0004;
const AUDIBLE=0.012;   // a bed this quiet still reads through a phone speaker; below it, it is gone

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
  window.__pk=async(ms)=>{const an=window.__tap;if(!an)return -1;
    const buf=new Float32Array(an.fftSize);let peak=0;const t0=performance.now();
    while(performance.now()-t0<ms){an.getFloatTimeDomainData(buf);let s=0;
      for(let i=0;i<buf.length;i++)s+=buf[i]*buf[i];peak=Math.max(peak,Math.sqrt(s/buf.length));
      await new Promise(r=>setTimeout(r,16));}
    return peak;};
};

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--autoplay-policy=no-user-gesture-required']});
const ctx=await b.newContext({viewport:{width:1440,height:900}});
await ctx.addInitScript(TAP);
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8765/index.html?m=studio');
await p.waitForTimeout(3200);

const wiring=await p.evaluate(()=>({hasPadBus:!!(window.padBus||typeof padBus!=='undefined'&&padBus)}));
ok(wiring.hasPadBus,'the chords have a bus of their own');

const full=await p.evaluate(async()=>{const iv=setInterval(()=>{try{drumSchedule();}catch(e){}},25);
  const v=await window.__pk(5000);clearInterval(iv);return v;});
ok(full>AUDIBLE,'the full mix plays (peak RMS '+full.toFixed(5)+')');

// strip everything but the chords
await p.evaluate(()=>{S.wM=0;S.wD=1;S.wK=0;applyMix();
  if(typeof drumOn!=='undefined'&&drumOn)document.getElementById('drumBtn').click();});
await p.waitForTimeout(1000);
const bed=await p.evaluate(async()=>await window.__pk(7000));
ok(bed>AUDIBLE,'with the triangle dragged hard to DRUMS and the kit off, the chords still play '+
  '(peak RMS '+bed.toFixed(5)+', '+Math.round(100*bed/full)+'% of the full mix)');
ok(bed<full*0.45,'and it stays a BED, not the loudest thing in the room ('+Math.round(100*bed/full)+'% of full)');

// THE CONTROL. The speakers carry a live generative mix, so "is it silent" is the wrong question —
// the tank keeps ticking along quietly whatever the mixer says. What must be proven is that the
// thing just measured was DOMINATED by the chords, so mute the chord bus and demand the level
// collapse. (Do NOT try this on melBus/drumBus/master: applyMix() rewrites those gains continuously
// and an assignment to them is undone before the next measurement. padBus is not touched by it.)
await p.evaluate(()=>{padBus.gain.value=0;});
await p.waitForTimeout(6000);                 // the chords feed a reverb whose tail runs for seconds
const muted=await p.evaluate(async()=>await window.__pk(5000));
ok(muted<bed*0.35,'muting the chord bus collapses the level — so that really was the chords ('+
  bed.toFixed(5)+' -> '+muted.toFixed(5)+', '+(bed/Math.max(1e-6,muted)).toFixed(1)+'x drop)');
await p.evaluate(()=>{padBus.gain.value=1;});

// the bass/pad crossfader must no longer touch the chord level at all
await p.evaluate(()=>{S.wM=0;S.wD=1;S.wK=0;applyMix();});
const byMix={};
for(const v of [0,1,0.5]){
  await p.evaluate(x=>{S.bpMix=x;},v);
  await p.waitForTimeout(500);
  byMix[v]=await p.evaluate(async()=>await window.__pk(6000));
}
const vals=Object.values(byMix);
const lo=Math.min(...vals);
ok(lo>AUDIBLE,'the chords stay audible at every bass/pad crossfader position '+
  '(0: '+byMix[0].toFixed(4)+', 0.5: '+byMix[0.5].toFixed(4)+', 1: '+byMix[1].toFixed(4)+')');

// AND THE BAND BUTTON IS STILL THE REAL OFF SWITCH, so there is still a way to stop them.
// Metered on the chord bus itself rather than at the speakers: that answers "are chords playing"
// directly, instead of asking whether a live generative mix happens to be silent.
const onOff=await p.evaluate(async()=>{
  const meter=AC.createAnalyser();meter.fftSize=1024;meter.smoothingTimeConstant=0;padBus.connect(meter);
  const buf=new Float32Array(1024);
  const read=async(ms)=>{let pk=0;const t0=performance.now();
    while(performance.now()-t0<ms){meter.getFloatTimeDomainData(buf);let s=0;
      for(let i=0;i<buf.length;i++)s+=buf[i]*buf[i];pk=Math.max(pk,Math.sqrt(s/buf.length));
      await new Promise(r=>setTimeout(r,16));}
    return pk;};
  if(typeof bandOn!=='undefined'&&!bandOn)document.getElementById('bandBtn').click();
  await new Promise(r=>setTimeout(r,1200));
  const on=await read(6000);
  document.getElementById('bandBtn').click();      // band OFF
  await new Promise(r=>setTimeout(r,6000));        // let the last chord and its tail finish
  const off=await read(5000);
  return {on,off};});
ok(onOff.on>SILENT,'with the band ON the chord bus is live (peak '+onOff.on.toFixed(5)+')');
ok(onOff.off<=SILENT,'turning the band OFF stops the chords at source — the deliberate switch still works (peak '+
  onOff.off.toFixed(5)+')');

ok(errs.length===0,'no page errors ('+errs.length+')'+(errs.length?' :: '+errs[0]:''));
await b.close();
console.log('\n'+(FAIL.length?'FAILED '+FAIL.length+':\n - '+FAIL.join('\n - '):'the chord bed holds under the mixer'));
process.exit(FAIL.length?1:0);
})();

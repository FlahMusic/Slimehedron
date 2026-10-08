// ============================================================================================
//  IS THE SOUND ACTUALLY CLEAN?
//  A waveshaper creates harmonics. Any harmonic above half the sample rate has nowhere to go and
//  FOLDS BACK into the audible range as inharmonic noise that slides around with the pitch — the
//  thing that makes cheap digital distortion sound cheap. Browsers default WaveShaperNode to
//  oversample:'none', so our tape-saturation stage was doing exactly that.
//
//  This reads the curve and the oversample setting OFF THE LIVE APP, renders that exact
//  configuration offline, and measures how far below the fundamental the aliasing sits. Tying it
//  to the shipped values means the test fails if someone removes the oversampling, instead of
//  passing on a copy of the settings it wishes we had.
//  Run: node dev-fidelity.js   (needs python3 -m http.server 8765)
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const FLOOR_DB=-80;   // below this the folded junk is inaudible under music

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--autoplay-policy=no-user-gesture-required']});
const ctx=await b.newContext();
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8765/index.html?m=studio');
await p.waitForTimeout(3000);

const live=await p.evaluate(()=>{
  if(typeof tapeShaper==='undefined'||!tapeShaper)return{none:true};
  return {oversample:tapeShaper.oversample,
          curve:Array.from(tapeShaper.curve||[]),
          sampleRate:AC.sampleRate,
          baseLatencyMs:+(AC.baseLatency*1000).toFixed(2)};});
ok(!live.none,'the tape saturation stage exists and is reachable');
ok(live.oversample==='4x','the saturator is oversampled (is "'+live.oversample+'", must be 4x)');
ok(live.curve.length>64,'it has a real shaping curve ('+live.curve.length+' points)');

// render the SHIPPED curve + setting and measure what comes out
const res=await p.evaluate(async(cfg)=>{
  const SR=48000,F=7000,N=SR;
  const curve=Float32Array.from(cfg.curve);
  async function run(ov){
    const oc=new OfflineAudioContext(1,N,SR);
    const osc=oc.createOscillator();osc.type='sine';osc.frequency.value=F;
    const g=oc.createGain();g.gain.value=0.9;
    const ws=oc.createWaveShaper();ws.curve=curve;ws.oversample=ov;
    osc.connect(g);g.connect(ws);ws.connect(oc.destination);osc.start();
    return (await oc.startRendering()).getChannelData(0);}
  const mag=(x,f)=>{let re=0,im=0;const w=2*Math.PI*f/SR,n=Math.min(x.length,SR);
    for(let i=0;i<n;i++){re+=x[i]*Math.cos(w*i);im+=x[i]*Math.sin(w*i);}
    return Math.sqrt(re*re+im*im)/n*2;};
  const out={};
  for(const ov of ['none',cfg.oversample]){
    const x=await run(ov);
    const fund=mag(x,F);
    // 20k/13k/6k/1k are folded images of the 4th-7th harmonics. Nothing else can put energy there.
    const a=[20000,13000,6000,1000].reduce((s,f)=>s+mag(x,f),0);
    let peak=0;for(let i=0;i<x.length;i++)peak=Math.max(peak,Math.abs(x[i]));
    out[ov]={db:+(20*Math.log10(Math.max(1e-12,a)/Math.max(1e-12,fund))).toFixed(1),
             fund:+fund.toFixed(5),peak:+peak.toFixed(4)};}
  return out;},live);

const off=res['none'], on=res[live.oversample];
console.log('        7kHz through the shipped curve:  oversample off '+off.db+' dB   |   shipped ('+live.oversample+') '+on.db+' dB');
ok(on.db<=FLOOR_DB,'aliasing is inaudible: '+on.db+' dB below the fundamental (need '+FLOOR_DB+' or lower)');
ok(on.db<off.db-30,'and the oversampling is doing real work — '+Math.round(off.db-on.db)+' dB cleaner than without it');
ok(Math.abs(20*Math.log10(on.fund/off.fund))<0.5,
  'the TONE is unchanged, only the dirt under it ('+(20*Math.log10(on.fund/off.fund)).toFixed(2)+' dB difference in the fundamental)');
ok(on.peak<=1.0001,'the saturator never pushes past full scale (peak '+on.peak+')');

// and the whole engine still has to come out of the speakers
console.log('        engine: '+live.sampleRate+' Hz, base latency '+live.baseLatencyMs+' ms');
ok(live.sampleRate>=44100,'running at the device rate, no resampling ('+live.sampleRate+' Hz)');
ok(errs.length===0,'no page errors ('+errs.length+')'+(errs.length?' :: '+errs[0]:''));

await b.close();
console.log('\n'+(FAIL.length?'FAILED '+FAIL.length+':\n - '+FAIL.join('\n - '):'the saturation is clean — no folded harmonics riding the pitch'));
process.exit(FAIL.length?1:0);
})();

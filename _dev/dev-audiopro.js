// ============================================================================================
//  THE AUDIO OVERHAUL, PART 1 (spec _docs/specs/2026-11-07-audio-overhaul; research
//  _docs/research/2026-11-07-audio-overhaul.md, thresholds from its section 5). Measured at the output (outClip):
//    1. a limiter that limits: a 0 dBFS sine through the app's limiter comes out <= -2.5 dBFS; a stress run (every
//       part, top velocity, a loud kit, slime on) stays <= -1.0 dBTP (4x oversampled) and touches the clip on at most
//       0.1 % of samples
//    2. a real room: the reverb's top dies first (T20 4k / 500 Hz 0.45..0.80), the early decay matches the tail
//       (|EDT/T20 - 1| <= 0.25 at 500 Hz), 8 ms+ of pre-delay, L and R independent (|r| <= 0.2), nothing cut off
//       (the decay curve is <= -55 dB at the buffer's end)
//    3. a stage: a note from a wall at x = +0.8 is >= 2.5 dB louder on the right, mirrored at -0.8; the whole mix is
//       wide but not split (r(L,R) 0.3..0.95, over 14 s of auto-notes, drums and band) and its low end is mono (r below 150 Hz >= 0.95)
//    4. a hard hit is brighter than a soft one (velocity 110 vs 35, filter on: >= 6 dB more energy over 2 kHz)
//    5. no click on a sine's attack: energy above 2 kHz in its first 10 ms <= -46 dB of the note's energy there
//    6. the drums land with the melody: the drum path's extra delay (an impulse each way) is what a kick is sent early by (+-1 ms)
//  Sabotaged 9 ways (2026-11-07), each caught: knee back to 30 (1), every band alike (2), no pre-delay (2), the same
//  room both sides (2), no placement (3), the bass off centre (3), velocity not brightness (4), a 1 ms straight attack
//  (5), drums not sent early (6).
//  Needs a local server: python -m http.server 8765. Run from the project root: node _dev/dev-audiopro.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html?m=studio&view=2d';
const init=()=>{try{for(const k of ['slimehedron-coach','slimehedron-coach-studio','slimehedron-tapped'])localStorage.setItem(k,'1');}catch(e){}};

(async()=>{const b=await launch();
 const ctx=await b.newContext({viewport:{width:1280,height:900}});await ctx.addInitScript(init);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(URL);await p.waitForTimeout(2500);
 await p.evaluate(async()=>{initAudio();if(AC.state==='suspended')await AC.resume();
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  // capture the output in stereo, stamped in AC time (relative times cancel the processor's own latency)
  window.__cap=async(secs,during)=>{const sp=AC.createScriptProcessor(4096,2,2),L=[],R=[];let t0=null;
    sp.onaudioprocess=e=>{if(t0===null)t0=e.playbackTime;L.push(new Float32Array(e.inputBuffer.getChannelData(0)));R.push(new Float32Array(e.inputBuffer.getChannelData(1)));};
    outClip.connect(sp);sp.connect(AC.destination);await wait(120);const ts=AC.currentTime;if(during)await during();await wait(secs*1000);
    outClip.disconnect(sp);sp.disconnect();const cat=a=>{const o=new Float32Array(a.reduce((n,x)=>n+x.length,0));let k=0;for(const x of a){o.set(x,k);k+=x.length;}return o;};
    return {L:cat(L),R:cat(R),t0,ts,sr:AC.sampleRate};};
  window.__wait=wait;
  // 4x oversampled true peak: a 32-tap windowed sinc between every pair of samples (BS.1770 Annex 2 spirit)
  window.__tp=x=>{const N=16,ph=[0.25,0.5,0.75].map(f=>{const h=[];for(let k=-N+1;k<=N;k++){const t=k-f,w=0.5+0.5*Math.cos(Math.PI*t/N);h.push(t===0?1:Math.sin(Math.PI*t)/(Math.PI*t)*w);}return h;});
    let m=0;for(let i=N;i<x.length-N;i++){const a=Math.abs(x[i]);if(a>m)m=a;if(a<0.3)continue;for(const h of ph){let s=0;for(let k=0;k<2*N;k++)s+=h[k]*x[i-N+1+k];s=Math.abs(s);if(s>m)m=s;}}return m;};
  window.__corr=(a,b)=>{let ab=0,aa=0,bb=0;for(let i=0;i<a.length;i++){ab+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];}return ab/Math.sqrt(aa*bb+1e-30);};
  window.__rms=a=>{let s=0;for(const x of a)s+=x*x;return Math.sqrt(s/Math.max(1,a.length));};
  // offline biquad filtering of an array (renders through the real BiquadFilterNode)
  window.__filt=async(x,sr,stages)=>{const oc=new OfflineAudioContext(1,x.length,sr),bf=oc.createBuffer(1,x.length,sr);bf.getChannelData(0).set(x);
    const src=oc.createBufferSource();src.buffer=bf;let n=src;for(const [type,f,q] of stages){const bq=oc.createBiquadFilter();bq.type=type;bq.frequency.value=f;bq.Q.value=q;n.connect(bq);n=bq;}
    n.connect(oc.destination);src.start();return (await oc.startRendering()).getChannelData(0);};
 });

 // ---- 1. the limiter ----
 const lim=await p.evaluate(async()=>{if(typeof makeLimiter!=='function')return {none:true};
   const oc=new OfflineAudioContext(1,48000,48000),o=oc.createOscillator(),l=makeLimiter(oc);o.frequency.value=440;o.connect(l);l.connect(oc.destination);o.start();
   const d=(await oc.startRendering()).getChannelData(0);let m=0;for(let i=24000;i<48000;i++)m=Math.max(m,Math.abs(d[i]));return {out:20*Math.log10(m)};});
 ok(!lim.none&&lim.out<=-2.5,'1. a 0 dBFS sine through the limiter comes out at or under -2.5 dBFS ('+(lim.none?'no makeLimiter':lim.out.toFixed(2)+' dBFS; it was -0.21 with the 30 dB default knee')+')');
 const st=await p.evaluate(async()=>{const W={v:S.velRand,f:S.velFix};S.velRand=false;S.velFix=127;
   if(!S.playing)setPlaying(true);if(!S.slimeMode)$("slimeBig").click();if(!drumOn)$("drumBtn").click();if(!bandOn)$("bandBtn").click();
   const ks=$("drumKit");if(ks){ks.value='rock';ks.dispatchEvent(new Event('change'));}S.autoNotes=true;await __wait(2000);
   const c=await __cap(8,async()=>{for(let i=0;i<24;i++)setTimeout(()=>{try{trigger(centsForDegree(7+(i%8)),1,0,true);}catch(e){}},i*300);});
   S.velRand=W.v;S.velFix=W.f;const ceil=outClip.curve[outClip.curve.length-1];let near=0;
   for(const a of [c.L,c.R])for(const x of a)if(Math.abs(x)>=ceil-0.01)near++;
   return {tp:20*Math.log10(Math.max(__tp(c.L),__tp(c.R))),near:near/(c.L.length*2)*100,ceil};});
 ok(st.tp<=-1.0,'1. a stress run stays at or under -1.0 dBTP (true peak '+st.tp.toFixed(2)+' dBTP)');
 ok(st.near<=0.1,'1. and touches the clip ('+st.ceil.toFixed(3)+') on at most 0.1 % of samples ('+st.near.toFixed(3)+' %)');

 // ---- 2. the room ----
 const ir=await p.evaluate(async()=>{const B=rvb.buffer,sr=B.sampleRate,L=B.getChannelData(0),R=B.getChannelData(1);
   const sch=x=>{const e=new Float64Array(x.length);let acc=0;for(let i=x.length-1;i>=0;i--){acc+=x[i]*x[i];e[i]=acc;}const tot=e[0];return Array.from(e,v=>10*Math.log10(v/tot+1e-30));};
   const at=(c,db)=>{for(let i=0;i<c.length;i++)if(c[i]<=db)return i/sr;return c.length/sr;};
   const band=async f=>{const x=await __filt(L,sr,[['bandpass',f,1.41],['bandpass',f,1.41]]);const c=sch(x);
     let o=0;for(let i=0;i<x.length;i++)if(c[i]<-0.05){o=i/sr;break;}return {t20:3*(at(c,-25)-at(c,-5)),edt:6*(at(c,-10)-o)};};
   const b5=await band(500),b4=await band(4000);
   let pk=0;for(const x of L)pk=Math.max(pk,Math.abs(x));let on=0;for(let i=0;i<L.length;i++)if(Math.abs(L[i])>=pk*0.01){on=i/sr;break;}
   const cw=sch(L);return {ratio:b4.t20/b5.t20,t5:b5.t20,t4:b4.t20,edt:b5.edt,onset:on*1000,r:__corr(L,R),end:cw[cw.length-Math.round(sr*0.01)]};});
 ok(ir.ratio>=0.45&&ir.ratio<=0.80,'2. the room\'s top dies first: T20 4k / 500 Hz '+ir.ratio.toFixed(2)+' ('+ir.t4.toFixed(2)+' / '+ir.t5.toFixed(2)+' s; real rooms 0.5-0.75)');
 ok(Math.abs(ir.edt/ir.t5-1)<=0.25,'2. its early decay matches its tail (EDT/T20 at 500 Hz '+(ir.edt/ir.t5).toFixed(2)+'; it was 1.34)');
 ok(ir.onset>=8,'2. a pre-delay keeps the attack dry (first sound at '+ir.onset.toFixed(1)+' ms)');
 ok(Math.abs(ir.r)<=0.2,'2. left and right are independent (r '+ir.r.toFixed(3)+')');
 ok(ir.end<=-55,'2. nothing is cut off: the decay is at '+ir.end.toFixed(1)+' dB by the end of the buffer');

 // ---- 3. the stage ----
 const pan=await p.evaluate(async()=>{if(drumOn)$("drumBtn").click();if(bandOn)$("bandBtn").click();S.autoNotes=false;balls.length=0;S.fxOn=false;await __wait(2500);
   // placement is the dry note's: a pure tone through a noise reverb lands louder on one side by chance, as in any room
   const W=rvbWet.gain.value;rvbWet.gain.value=0;
   const one=async x=>{const c=await __cap(1.2,async()=>{playSynth(freqFromCents(centsForDegree(9)),100,0.7,0.3,true,undefined,x);});return 20*Math.log10(__rms(c.R)/__rms(c.L));};
   const res={r:await one(0.8),l:await one(-0.8)};rvbWet.gain.value=W;return res;});
 ok(pan.r>=2.5&&pan.l<=-2.5,'3. a note from the right wall is louder on the right ('+pan.r.toFixed(1)+' dB), from the left on the left ('+pan.l.toFixed(1)+' dB)');
 const wide=await p.evaluate(async()=>{S.fxOn=true;if(!drumOn)$("drumBtn").click();if(!bandOn)$("bandBtn").click();S.autoNotes=true;await __wait(3000);
   const c=await __cap(14);const lo=async x=>__filt(x,c.sr,[['lowpass',150,0.707],['lowpass',150,0.707]]);
   return {r:__corr(c.L,c.R),rlo:__corr(await lo(c.L),await lo(c.R))};});
 ok(wide.r>=0.3&&wide.r<=0.95,'3. the whole mix is wide but whole (r(L,R) '+wide.r.toFixed(3)+')');
 ok(wide.rlo>=0.95,'3. and its low end is mono (r below 150 Hz '+wide.rlo.toFixed(3)+')');

 // ---- 4. hit strength is brightness ----
 // the sustain, once the filter envelope has settled (250-500 ms in), above 2 kHz, with the cutoff knob at 0.6 (1.6 kHz
 // for the everyday note): there a cutoff move is in plain view. At the default 4.2 kHz a gentle 12 dB/oct filter on a
 // saw shows only ~3 dB over 4 kHz. Velocities 110 / 35 stay under the limiter, the tape stage is at its cleanest.
 // single notes from here on: the transport stops (no drums, no rain, no auto-notes) and the tape hiss, a floor under
 // these quiet measurements, is pinned off
 await p.evaluate(()=>{if(S.playing)setPlaying(false);S.autoNotes=false;balls.length=0;hissG.gain.cancelScheduledValues(0);hissG.gain.value=0;});
 // ---- 3b. the echo answers left, then right ----
 const pp=await p.evaluate(async()=>{await __wait(2500);const fx=S.fxOn;S.fxOn=true;const d0=dlyWet.gain.value;dlyWet.gain.value=0.6;
   const c=await __cap(1.6,async()=>{const bf=AC.createBuffer(1,64,AC.sampleRate);bf.getChannelData(0)[0]=0.05;const s=AC.createBufferSource();s.buffer=bf;s.connect(melEcho);s.start(AC.currentTime+0.1);});
   dlyWet.gain.value=d0;S.fxOn=fx;
   // the first echo is the loudest; the second is looked for one echo-time later (the third, left again, is as loud as
   // the second, so "the next loudest" could be either)
   const m=i=>Math.max(Math.abs(c.L[i]),Math.abs(c.R[i])),T=Math.round(delayNode.delayTime.value*c.sr),w=Math.round(c.sr*0.005);
   let g=0,p0=0;for(let i=0;i<c.L.length;i++)if(m(i)>g){g=m(i);p0=i;}let g1=0,p1=p0+T;for(let i=p0+T-w;i<Math.min(c.L.length,p0+T+w);i++)if(m(i)>g1){g1=m(i);p1=i;}
   const pk=[p0,p1];const side=i=>{let l=0,r=0;for(let k=i-32;k<i+256;k++){l+=c.L[k]*c.L[k];r+=c.R[k]*c.R[k];}return 10*Math.log10((r+1e-20)/(l+1e-20));};
   return {first:side(pk[0]),second:side(pk[1]),gap:(pk[1]-pk[0])/c.sr*1000,T:T/c.sr*1000};});
 // ideal 15 dB each way (pan 0.8, equal power). The second echo read only +4.1..+8.8 until the code review found the
 // way back skipped the feedback (the third echo, left, came in as loud as the second); fixed, it reads +9.8. A centred
 // echo reads 0
 ok(pp.first<=-10&&pp.second>=10&&Math.abs(pp.gap-pp.T)<=3,'3. the echo answers left ('+pp.first.toFixed(1)+' dB R-L), then right ('+pp.second.toFixed(1)+' dB), one echo-time apart ('+pp.gap.toFixed(0)+' ms vs '+pp.T.toFixed(0)+')');

 const br=await p.evaluate(async()=>{if(drumOn)$("drumBtn").click();if(bandOn)$("bandBtn").click();S.autoNotes=false;balls.length=0;S.fxOn=false;
   const W={on:S.filtOn,w:S.wave,cut:S.cut,warm:S.warm};S.filtOn=true;S.wave='sawtooth';S.cut=0.6;setWarmth(0);await __wait(2500);
   const top=async v=>{await __wait(1500);const c=await __cap(0.9,async()=>{activeVoices=24;playSynth(220,v,0.5,0.6,true);});activeVoices=0;const x=c.L;
     let pk=0;for(const q of x)pk=Math.max(pk,Math.abs(q));let i0=0;for(let i=0;i<x.length;i++)if(Math.abs(x[i])>pk*0.05){i0=i;break;}
     const a=i0+Math.round(c.sr*0.25),e=i0+Math.round(c.sr*0.5),hp=await __filt(x,c.sr,[['highpass',2000,0.707],['highpass',2000,0.707]]);
     return 20*Math.log10(__rms(hp.slice(a,e))/__rms(x.slice(a,e)));};
   const hi=await top(110),lo=await top(35);S.filtOn=W.on;S.wave=W.w;S.cut=W.cut;setWarmth(W.warm);return {hi,lo};});
 ok(br.hi-br.lo>=6,'4. a hard hit is brighter than a soft one (energy over 2 kHz '+br.hi.toFixed(1)+' vs '+br.lo.toFixed(1)+' dB of the note, '+(br.hi-br.lo).toFixed(1)+' dB more)');

 // ---- 5. no click on the attack ----
 // measured 2026-11-07 in this test's own conditions: a straight 1 ms ramp puts -38 dB over 2 kHz into a sine's first
 // 10 ms, the 4 ms S-curve -51 to -53 (over 4 kHz both sit lower; 2 kHz is where the click lives). The line is between.
 const ck=await p.evaluate(async()=>{await __wait(3000);   // the last test's saw tail rings in the room for ~1.5 s: let it die first
   const W={on:S.filtOn,w:S.wave,a:S.atk,warm:S.warm};S.filtOn=false;S.wave='sine';S.atk=0.001;setWarmth(0);const r=[];   // warmth 0: no tape hiss under the measurement
   for(let k=0;k<3;k++){await __wait(1200);
     const c=await __cap(0.4,async()=>{activeVoices=24;playSynth(220,110,0.5,0.2,true);});   // 24 busy voices: the tick layer is skipped
     activeVoices=0;
     // the onset: the first sample over 1 % of the note's peak (lower, the room's and the tape's floor is all there is)
     const x=c.L;let pk=0;for(const v of x)pk=Math.max(pk,Math.abs(v));let i0=-1;for(let i=0;i<x.length;i++)if(Math.abs(x[i])>pk*0.01){i0=i;break;}
     // filter the whole take, then window it: a segment cut out first would hand the high-pass a step of its own to ring on
     const n=Math.round(c.sr*0.01),hp=await __filt(x,c.sr,[['highpass',2000,0.707],['highpass',2000,0.707]]);
     r.push(20*Math.log10(__rms(hp.slice(i0,i0+n))/(__rms(x.slice(i0,i0+n))+1e-12)));}
   S.filtOn=W.on;S.wave=W.w;S.atk=W.a;setWarmth(W.warm);return Math.max(...r);});
 ok(ck<=-46,'5. a sine note\'s attack does not click (energy over 2 kHz in its first 10 ms, worst of 3: '+ck.toFixed(1)+' dB; a straight 1 ms ramp is -38)');

 // ---- 6. drums and melody together ----
 // the paths, with clean impulses: the drums' path is longer by its glue compressor's fixed look-ahead. A small impulse
 // (-34 dBFS) moves no compressor's gain (a loud one did, and its peak wandered by up to 5 ms). The capture tool (a
 // ScriptProcessor) now and then slips one 128-sample block between two events, even on a melody-vs-master pair with
 // no drum path in it (measured 2026-11-08, about 1 pair in 4 at 0.5 s apart): so the two impulses go 50 ms apart
 // (a slip seldom lands inside that), melody first, and the median of 3 pairs.
 const sk=await p.evaluate(async()=>{if(!drumBus)initDrums();await __wait(500);
   const imp=(bus,t)=>{const bf=AC.createBuffer(1,64,AC.sampleRate);bf.getChannelData(0)[0]=0.02;const s=AC.createBufferSource();s.buffer=bf;s.connect(bus);s.start(t);};
   const gaps=[];for(let k=0;k<3;k++){
   const c=await __cap(1.0,async()=>{const t=AC.currentTime+0.3;imp(melBus,t);imp(drumBus,t+0.05);});
   // the two impulses: the loudest sample, then the loudest at least 25 ms from it; each onset at 30 % of its own peak
   const x=c.L,pk=[];for(let ev=0;ev<2;ev++){let g=0,gi=0;for(let i=0;i<x.length;i++){if(pk.some(q=>Math.abs(i-q)<c.sr*0.025))continue;if(Math.abs(x[i])>g){g=Math.abs(x[i]);gi=i;}}pk.push(gi);}
   const on=pk.sort((a,b)=>a-b).map(gi=>{const g=Math.abs(x[gi]);let o=gi;for(let i=Math.max(0,gi-Math.round(c.sr*0.005));i<=gi;i++)if(Math.abs(x[i])>g*0.3){o=i;break;}return o;});
   gaps.push((on[1]-on[0])/c.sr*1000-50);}
   const path=gaps.sort((a,b)=>a-b)[1];
   // and a kick asked for at T starts at T minus that difference
   const st=[];const co=AC.createOscillator.bind(AC);AC.createOscillator=function(){const o=co();const s0=o.start.bind(o);o.start=(t)=>{st.push(t);return s0(t);};return o;};
   const T=AC.currentTime+0.5;try{dHit('K',T,1,true,0);}finally{AC.createOscillator=co;}
   return {path,lead:(T-st[0])*1000};});
 ok(Math.abs(sk.path-sk.lead)<=1,'6. the drums land with the melody: their path is '+sk.path.toFixed(2)+' ms longer, and a kick is sent '+sk.lead.toFixed(2)+' ms early (+-1 ms)');
 ok(errs.length===0,'no page errors ('+errs.slice(0,2).join(' | ')+')');
 await b.close();
 console.log(FAIL.length?'\n'+FAIL.length+' FAILURE(S)':'\nthe master limits, the room decays like a room, the notes have a place, and the drums land on time');process.exit(FAIL.length?1:0);})();

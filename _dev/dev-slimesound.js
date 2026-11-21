// ============================================================================================
//  THE SLIME FILLS, THE SOUND SOFTENS (Flah 2026-11-21: "reduce the ugly sounding resonant sound when the melodies are
//  close to bursting with full slime ... it should be slower attack and release and more low passed than anything as
//  its literally being filled with slime", "its so so so abrasive on the melody arp parts when the slime is filled ...
//  a shitty gritty distorted sound that is so resonant and shitty loud", "we wanna go from plinky sounds at start to a
//  more harmonious flavor"). Until now a filling tank HIGH-passed the whole mix up to ~2.2 kHz and opened its low-pass
//  to 14 kHz: the full slime kept only the gritty top of each note.
//  The same 8-note melody (each wave: sine, triangle, saw, square), played through the real output (outClip), with the
//  tank's fill held empty (0) and full (0.88, just under the burst), 4 s each, after the master's filters have settled:
//    1. full is DARKER: its spectral centroid at most 0.7 of the empty tank's (saw and square: a sine is one partial
//       and a triangle's overtones are 19 dB down at the 3rd, so a low-pass cannot move their centroid; 2 covers them)
//    2. full is low-passed, not thinned: energy over 4 kHz at least 10 dB down on the empty tank's, energy under
//       400 Hz no more than 3 dB down (it used to be high-passed away)
//    3. full is not louder (K-weighted level, BS.1770's ear curve, within +1 dB of the empty tank's: "shitty loud")
//    4. full notes start softer: each note's rise to 90% takes at least 25 ms longer than in the empty tank
//  Sabotage: put back the old morph (the high-pass climb, the low-pass opening), the old envelopes, the old level.
//  Needs a local server: python -m http.server 8765. Run from the project root: node _dev/dev-slimesound.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const SAB=process.env.SAB||'';
(async()=>{const b=await launch();const p=await (await b.newContext({viewport:{width:1280,height:860}})).newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');localStorage.setItem('slimehedron-tapped','1');}catch(e){}});
 await p.goto('http://127.0.0.1:8765/index.html?m=studio');await p.waitForTimeout(2500);
 const res=await p.evaluate(async([SAB])=>{
  initAudio();if(AC.state==='suspended')await AC.resume();
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  // the tank must run (the master's slime morph lives in its tick), with nothing else sounding: no drums, band, slime
  // knob wobble, auto-notes or rain, no balls
  setPlaying(true);
  if(drumOn)document.getElementById('drumBtn').click();if(bandOn)document.getElementById('bandBtn').click();
  S.slimeMode=false;S.autoNotes=false;S.rain=false;
  // (and no tape hiss: it enters after the slime's filter, a constant floor that a muffled sine's top sinks under, so
  // "over 4 kHz" measured the hiss in some runs: -27 dB one run, -5 the next)
  const quiet=setInterval(()=>{balls.length=0;S.autoNotes=false;S.rain=false;if(hissG){hissG.gain.cancelScheduledValues(0);hissG.gain.value=0;}},50);
  const cap=async secs=>{const sp=AC.createScriptProcessor(4096,2,2),L=[];
    sp.onaudioprocess=e=>{const a=e.inputBuffer.getChannelData(0),c=e.inputBuffer.getChannelData(1),m=new Float32Array(a.length);for(let i=0;i<a.length;i++)m[i]=(a[i]+c[i])/2;L.push(m);};
    outClip.connect(sp);sp.connect(AC.destination);
    const t0=AC.currentTime+0.15,notes=[0,200,400,700,900,700,400,200];
    notes.forEach((c,i)=>playSynth(freqFromCents(c+1200),90,0.5,0.2,true,t0+i*0.45));
    await wait(secs*1000);outClip.disconnect(sp);sp.disconnect();
    const o=new Float32Array(L.reduce((n,x)=>n+x.length,0));let k=0;for(const x of L){o.set(x,k);k+=x.length;}return o;};
  const spec=x=>{   // average power spectrum (2048-point frames, Hann), and per-band energies
    const N=2048,P=new Float64Array(N/2);let fr=0;
    for(let s=0;s+N<=x.length;s+=N/2){const re=new Float64Array(N),im=new Float64Array(N);
      for(let i=0;i<N;i++)re[i]=x[s+i]*(0.5-0.5*Math.cos(2*Math.PI*i/N));
      for(let i=0,j=0;i<N;i++){if(i<j){[re[i],re[j]]=[re[j],re[i]];}let m=N>>1;while(m>=1&&j&m){j^=m;m>>=1;}j|=m;}
      for(let len=2;len<=N;len<<=1){const a=-2*Math.PI/len;for(let i=0;i<N;i+=len)for(let q=0;q<len/2;q++){const wr=Math.cos(a*q),wi=Math.sin(a*q),xr=re[i+q+len/2]*wr-im[i+q+len/2]*wi,xi=re[i+q+len/2]*wi+im[i+q+len/2]*wr;re[i+q+len/2]=re[i+q]-xr;im[i+q+len/2]=im[i+q]-xi;re[i+q]+=xr;im[i+q]+=xi;}}
      for(let i=0;i<N/2;i++)P[i]+=re[i]*re[i]+im[i]*im[i];fr++;}
    const sr=AC.sampleRate,bin=sr/N;let tot=0,cen=0,lo=0,hi=0;
    for(let i=1;i<N/2;i++){const f=i*bin;tot+=P[i];cen+=P[i]*f;if(f<400)lo+=P[i];if(f>4000)hi+=P[i];}
    return {cen:cen/tot,lo,hi,tot};};
  const rise=x=>{   // each note's rise: 1 ms envelope; from 10% to 90% of its peak inside its 450 ms
    const sr=AC.sampleRate,hop=Math.round(sr*0.001),env=[];for(let i=0;i+hop<=x.length;i+=hop){let m=0;for(let k=0;k<hop;k++)m=Math.max(m,Math.abs(x[i+k]));env.push(m);}
    const out=[];let st=env.findIndex(v=>v>1e-3);if(st<0)return 0;
    for(let n=0;n<8;n++){const a=st+n*450,seg=env.slice(a,a+450);if(seg.length<100)break;const pk=Math.max(...seg);const i10=seg.findIndex(v=>v>=0.1*pk),i90=seg.findIndex(v=>v>=0.9*pk);if(i10>=0&&i90>=i10)out.push(i90-i10);}
    out.sort((a,b)=>a-b);return out.length?out[Math.floor(out.length/2)]:0;};
  // loudness as the ear weighs it: BS.1770's K-weighting (a +4 dB shelf over ~1.7 kHz, a 38 Hz high-pass), through the
  // real BiquadFilterNode, then the mean square. Plain RMS would call a dark note as loud as a bright one of equal power
  const kw=async x=>{const oc=new OfflineAudioContext(1,x.length,AC.sampleRate),bf=oc.createBuffer(1,x.length,AC.sampleRate);bf.getChannelData(0).set(x);
    const src=oc.createBufferSource();src.buffer=bf;const sh=oc.createBiquadFilter();sh.type='highshelf';sh.frequency.value=1681;sh.gain.value=4;
    const hp=oc.createBiquadFilter();hp.type='highpass';hp.frequency.value=38;hp.Q.value=0.5;src.connect(sh);sh.connect(hp);hp.connect(oc.destination);src.start();
    const y=(await oc.startRendering()).getChannelData(0);let s=0;for(const v of y)s+=v*v;return 10*Math.log10(s/y.length+1e-20);};
  const real=window.fillFrac,out={};
  for(const w of ['sine','triangle','sawtooth','square']){
    S.wave=w;out[w]={};
    for(const ff of [0,0.88]){                              // (0.88: just under the burst, which 0.9 starts)
      window.fillFrac=()=>ff;
      await wait(3000);                                     // the master's filters glide (setTargetAtTime 0.6 s)
      const lp=masterFilt.frequency.value,wet=dlyWet.gain.value;
      const x=await cap(4.2);const sp=spec(x);out[w][ff]={cen:sp.cen,lo:sp.lo,hi:sp.hi,tot:sp.tot,lvl:await kw(x),rise:rise(x),lp,wet};}}
  clearInterval(quiet);window.fillFrac=real;return out;},[SAB]);
 for(const w of Object.keys(res)){const E=res[w][0],F=res[w][0.88];
  if(process.env.DEBUG)console.log(w,JSON.stringify({E,F},(k,v)=>typeof v==='number'?+v.toPrecision(4):v));
  const db=(a,b)=>10*Math.log10((a+1e-30)/(b+1e-30));
  if(w==='sawtooth'||w==='square')ok(F.cen<=E.cen*0.7,`[${w}] a full tank is darker (centroid ${F.cen.toFixed(0)} Hz, empty ${E.cen.toFixed(0)})`);
  ok(db(F.hi,E.hi)<=-10&&db(F.lo,E.lo)>=-3,`[${w}] low-passed, not thinned (over 4 kHz ${db(F.hi,E.hi).toFixed(1)} dB, under 400 Hz ${db(F.lo,E.lo).toFixed(1)} dB)`);
  ok(F.lvl-E.lvl<=1,`[${w}] not louder (${(F.lvl-E.lvl).toFixed(1)} dB)`);
  ok(F.rise-E.rise>=25,`[${w}] softer starts (a note rises in ${F.rise} ms, empty ${E.rise} ms)`);}
 ok(errs.length===0,'no page errors '+errs.slice(0,2).join(' | '));
 await b.close();console.log(FAIL.length?FAIL.length+' FAILURE(S)':'the slime fills and the sound softens');process.exit(FAIL.length?1:0);})();

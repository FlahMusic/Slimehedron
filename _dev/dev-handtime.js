// ============================================================================================
//  A HAND'S NOTE IS ON TIME, EVERY TIME (2026-11-23; research _docs/research/2026-11-23-personality-polish.md 1-2: an
//  instrument's own delay at most ~10 ms, and steady: Wessel & Wright 2002, Jack et al. 2018 found 10 ms with +-3 ms
//  of wobble rated worse than none). Every note's ring started a random 8-25 ms after its click (the "crater" pause that
//  gives falling drops their texture) and a hand's tap had it too; with a busy tank the click is skipped, and a tap
//  then sounded 8-25 ms late, a different amount each time.
//  In a quiet tank a tap was on time already (its click starts at once and is heard first: measured 0.0 ms); the late,
//  wobbly part was the ring, which is ALL of the note in a busy tank (over 24 voices the click is skipped).
//  Twelve hand notes (playSynth, firm) in a busy tank, rendered offline at exact times (the app's own synth, pointed at
//  an OfflineAudioContext), each note's own pitch band (a band-pass at its fundamental, the real BiquadFilterNode), the
//  moment it reaches 20% of its peak:
//    1. a hand's note rings within 10 ms of its time (median), the latest within 12
//    2. and steady: the spread from earliest to latest at most 2 ms
//    3. a falling drop's ring keeps its texture: its delays still spread at least 8 ms (the pause is theirs)
//  Sabotage: SAB=old (the random pause on hands too) fails 1 and 2.
//  Needs a local server: python -m http.server 8765. Run from the project root: node _dev/dev-handtime.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const SAB=process.env.SAB||'';
(async()=>{const b=await launch();const p=await (await b.newContext({viewport:{width:1280,height:860}})).newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');localStorage.setItem('slimehedron-tapped','1');}catch(e){}});
 await p.goto('http://127.0.0.1:8765/index.html?m=studio');await p.waitForTimeout(2500);
 const r=await p.evaluate(async SAB=>{
  initAudio();if(AC.state==='suspended')await AC.resume();
  if(drumOn)document.getElementById('drumBtn').click();if(bandOn)document.getElementById('bandBtn').click();
  S.autoNotes=false;S.rain=false;S.playing=false;balls.length=0;window.fillFrac=()=>0;
  if(hissG){hissG.gain.cancelScheduledValues(0);hissG.gain.value=0;}
  if(SAB==='old'){const ps=playSynth;window.playSynth=function(f,v,i,h,firm,at,pan){return ps(f,v,i,h,false,at,pan);};}   // a hand treated as a drop
  // RENDERED OFFLINE: the synth is pointed at an OfflineAudioContext for the measurement, so every sample sits at an
  // exact, known time (a live capture dropped blocks under load and its timestamps sit a block off the audio clock)
  const run=async firm=>{
    const sr=48000,F=[392,440,494,523,587,659,698,784,440,523,659,784],T=F.map((f,i)=>0.3+i*0.8);
    const oc=new OfflineAudioContext(1,Math.ceil(sr*(T[T.length-1]+0.6)),sr);
    const keep={AC,melBus,melEcho,wave:S.wave,av:activeVoices,fx:S.fxOn};
    try{AC=oc;melBus=oc.createGain();melBus.connect(oc.destination);melEcho=null;S.wave='sine';S.fxOn=false;   /* (the echo is the live context's) */
      F.forEach((f,i)=>{activeVoices=25;   /* a busy tank: the click is skipped, the ring is the note */
        playSynth(f,100,0.5,0.15,firm,T[i]);});}
    finally{AC=keep.AC;melBus=keep.melBus;melEcho=keep.melEcho;S.wave=keep.wave;activeVoices=keep.av;S.fxOn=keep.fx;}
    const x=(await oc.startRendering()).getChannelData(0),out=[];
    for(let i=0;i<F.length;i++){   // its own pitch band, from the note's time: the first moment it reaches 20% of its peak
      const s0=Math.round(T[i]*sr),n=Math.round(0.2*sr),o2=new OfflineAudioContext(1,n,sr),bf=o2.createBuffer(1,n,sr);bf.getChannelData(0).set(x.subarray(s0,s0+n));
      const src=o2.createBufferSource();src.buffer=bf;const bp=o2.createBiquadFilter();bp.type='bandpass';bp.frequency.value=F[i];bp.Q.value=4;
      src.connect(bp);bp.connect(o2.destination);src.start();const y=(await o2.startRendering()).getChannelData(0);
      const hop=Math.round(sr*0.0005),env=[];for(let j=0;j+hop<=y.length;j+=hop){let m=0;for(let q=0;q<hop;q++)m=Math.max(m,Math.abs(y[j+q]));env.push(m);}
      const pk=Math.max(...env),on=env.findIndex(v=>v>=pk*0.2);out.push(on*0.5);}
    return out;};
  const hand=await run(true),drop=await run(false);
  return {hand,drop};},SAB);
 const st=a=>{const s=[...a].sort((x,y)=>x-y);return {med:s[s.length>>1],min:s[0],max:s[s.length-1]};};
 const H=st(r.hand),D=st(r.drop);
 ok(H.med<=10&&H.max<=12,`1. a hand's note rings within 10 ms (median ${H.med.toFixed(1)} ms, latest ${H.max.toFixed(1)})`);
 ok(H.max-H.min<=2,`2. and steady (${(H.max-H.min).toFixed(1)} ms from earliest to latest)`);
 ok(D.max-D.min>=8,`3. a falling drop keeps its texture (its rings spread ${(D.max-D.min).toFixed(1)} ms, ${D.min.toFixed(1)}..${D.max.toFixed(1)})`);
 ok(errs.length===0,'no page errors '+errs.slice(0,2).join(' | '));
 await b.close();console.log(FAIL.length?FAIL.length+' FAILURE(S)':'a hand is on time');process.exit(FAIL.length?1:0);})();

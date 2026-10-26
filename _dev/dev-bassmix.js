// ============================================================================================
//  CAN YOU HEAR THE BASS? On a phone speaker as well as on headphones, in play and in studio.
//  Flah: "the bass is so quiet u can literally barely hear it ... even with the triangle pointing only
//  at the bass". Three causes, each checked here by what reaches the speaker, not by what ran:
//    1. REGISTER: the bass hung an octave under the tank's key, so a low key put it at 31-60 Hz, below
//       what most speakers make. Every bass note must now sit between ~50 and ~330 Hz, in every key.
//    2. PHONE PRESENCE: a phone speaker makes almost nothing under ~300 Hz. The bass carries its own
//       harmonics so the ear still hears the note. Through a phone-speaker model, one bass note must be
//       within a few dB of its full-range level, in every key.
//    3. THE KICK DUCK: every kick pushed the band down 10 dB for 300 ms, and the bass starts on the kick,
//       even with the drums muted. Muted drums must not duck the bass at all.
//    4. THE MIX, LIVE: each part alone at the real output (after the limiter), with a style picked in play
//       and in studio. The bass is about as loud as the melody on full-range speakers and not buried on a phone.
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-bassmix.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const BASE='http://127.0.0.1:8765/index.html';

(async()=>{const b=await launch();
 const ctx=await b.newContext({viewport:{width:1280,height:860}});
 await ctx.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');}catch(e){}});
 // ---- 1-3. one note at a time, rendered offline ----
 {const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(BASE+'?m=studio');await p.waitForTimeout(1500);
  const r=await p.evaluate(async()=>{const SR=44100,out={keys:[]};
    // full-range level and the level through a phone speaker (nothing much under 300 Hz: two 2nd-order high-passes)
    const lvl=async(buf)=>{const c=new OfflineAudioContext(1,buf.length,SR),s=c.createBufferSource();s.buffer=buf;
      const h1=c.createBiquadFilter(),h2=c.createBiquadFilter();h1.type=h2.type='highpass';h1.frequency.value=h2.frequency.value=300;h1.Q.value=h2.Q.value=0.707;
      s.connect(h1);h1.connect(h2);h2.connect(c.destination);s.start();const ph=(await c.startRendering()).getChannelData(0),d=buf.getChannelData(0);
      let a=0,q=0;for(let i=0;i<d.length;i++){a+=d[i]*d[i];q+=ph[i]*ph[i];}return {full:10*Math.log10(a/d.length+1e-20),phone:10*Math.log10(q/d.length+1e-20)};};
    const freqs=[];const oC=OfflineAudioContext.prototype.createOscillator;
    OfflineAudioContext.prototype.createOscillator=function(){const n=oC.call(this);const sv=n.frequency.setValueAtTime.bind(n.frequency);   // the NOTE's pitch = the harmonic voice (the sine body and sub glide in under it)
      n.frequency.setValueAtTime=function(v,t){if(window.__grab&&n.type!=='sine')freqs.push(v);return sv(v,t);};return n;};
    const render=async(fn,secs)=>{const rA=AC,rB=bandBus,rM=melBus,rE=melEcho;AC=new OfflineAudioContext(1,Math.round(SR*(secs||1.2)),SR);
      bandBus=AC.createGain();bandBus.connect(AC.destination);melBus=AC.createGain();melBus.connect(AC.destination);melEcho=AC.createGain();
      _lastBassFreq=null;_lastBassCents=null;fn();const buf=await AC.startRendering();AC=rA;bandBus=rB;melBus=rM;melEcho=rE;return buf;};
    for(const root of [48,51,55,58,62,65,67]){S.root=root;curRootDeg=0;
      window.__grab=1;freqs.length=0;const bb=await render(()=>{bassNote('R',0.02,1,0.75);});window.__grab=0;
      const f=freqs.filter(x=>x>20);
      // a walk through the whole key: every token the bass plays
      window.__grab=1;freqs.length=0;await render(()=>{let t=0.02;for(const tok of ['R','F','T','A','O','R','F','T'])
        {bassNote(tok,t,1,0.3);t+=0.3;}},2.6);window.__grab=0;
      const walk=freqs.filter(x=>x>20);
      out.keys.push({root,...await lvl(bb),lo:Math.min(...walk),hi:Math.max(...walk),sine:Math.min(...f)});}
    // the kick duck, with the drums muted: the band bus must not move
    const saved=[S.wD,bandOn];S.wD=0;bandOn=true;const g0=bandBus.gain.value;const t=AC.currentTime+0.05;dHit('K',t,1,true);
    await new Promise(r=>setTimeout(r,120));out.duckMuted=bandBus.gain.value/(g0||1);
    S.wD=0.33;dHit('K',AC.currentTime+0.02,1,true);await new Promise(r=>setTimeout(r,60));out.duckOn=bandBus.gain.value;
    await new Promise(r=>setTimeout(r,400));S.wD=saved[0];bandOn=saved[1];
    return out;});
  console.log('         key   bass Hz range    one note: full / phone');
  r.keys.forEach(k=>console.log('         '+String(k.root).padEnd(5)+(Math.round(k.lo)+'-'+Math.round(k.hi)).padEnd(17)+k.full.toFixed(1)+' / '+k.phone.toFixed(1)+' dB'));
  ok(r.keys.every(k=>k.lo>=48&&k.hi<=340),'1. in every key the bass plays between ~50 and ~330 Hz (lowest '+Math.round(Math.min(...r.keys.map(k=>k.lo)))+' Hz, highest '+Math.round(Math.max(...r.keys.map(k=>k.hi)))+' Hz)');
  ok(r.keys.every(k=>k.full-k.phone<7),'2. on a phone speaker a bass note keeps most of its level, in every key (worst loss '+Math.max(...r.keys.map(k=>k.full-k.phone)).toFixed(1)+' dB)');
  ok(r.duckMuted>0.98,'3. with the drums muted, a kick does not push the bass down ('+(r.duckMuted*100).toFixed(0)+'% left)');
  ok(r.duckOn>0.6,'   and with the drums up, the dip under the kick is gentle (bass held at '+(r.duckOn*100).toFixed(0)+'%, was 32%)');
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
  await p.close();}

 // ---- 4. the live mix, each part alone at the real output ----
 for(const [mode,kit,root] of [['play','pop',55],['play','jazz',50],['studio','pop',60]]){
  const p=await ctx.newPage();await p.goto(BASE+'?m='+mode);await p.waitForTimeout(2200);
  if(mode==='play'){await p.click('.psBtn.bandBtn[data-kit="'+kit+'"]');await p.waitForTimeout(600);}
  const r=await p.evaluate(async root=>{
    const rt=document.getElementById('root');rt.value=String(root);rt.dispatchEvent(new Event('change'));
    if(!S.playing)setPlaying(true);
    for(let i=0;i<5;i++)try{spawn(CX+(i-2)*R*0.2,CY-R*0.2);}catch(e){}
    const sp=AC.createScriptProcessor(4096,1,1),sp2=AC.createScriptProcessor(4096,1,1),h1=AC.createBiquadFilter(),h2=AC.createBiquadFilter();
    h1.type=h2.type='highpass';h1.frequency.value=h2.frequency.value=300;h1.Q.value=h2.Q.value=0.707;
    let acc=[0,0,0],on=false;
    sp.onaudioprocess=e=>{if(!on)return;const d=e.inputBuffer.getChannelData(0);for(const x of d)acc[0]+=x*x;acc[2]+=d.length;};
    sp2.onaudioprocess=e=>{if(!on)return;const d=e.inputBuffer.getChannelData(0);for(const x of d)acc[1]+=x*x;};
    outClip.connect(sp);sp.connect(AC.destination);outClip.connect(h1);h1.connect(h2);h2.connect(sp2);sp2.connect(AC.destination);
    const meas=async(m,d,k)=>{S.wM=m;S.wD=d;S.wK=k;applyMix();padBus.gain.cancelScheduledValues(0);padBus.gain.value=0;
      await new Promise(r=>setTimeout(r,700));acc=[0,0,0];on=true;await new Promise(r=>setTimeout(r,9000));on=false;
      const db=x=>10*Math.log10(x/acc[2]+1e-20);return {full:db(acc[0]),phone:db(acc[1])};};
    return {bass:await meas(0,0,1),mel:await meas(1,0,0)};},root);
  const L='4. ['+mode+(mode==='play'?' '+kit:'')+'] ';
  console.log('         '+L+'bass '+r.bass.full.toFixed(1)+' / '+r.bass.phone.toFixed(1)+' dB, melody '+r.mel.full.toFixed(1)+' / '+r.mel.phone.toFixed(1)+' dB (full / phone)');
  ok(r.bass.full>r.mel.full-5&&r.bass.full<r.mel.full+5,L+'with the triangle on the bass, it is about as loud as the melody is on its own (within 5 dB)');
  ok(r.bass.phone>r.mel.phone-9,L+'and on a phone speaker it is not buried ('+(r.bass.phone-r.mel.phone).toFixed(1)+' dB against the melody)');
  await p.close();}
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'the bass can be heard'));
 process.exit(FAIL.length?1:0);})();

// ============================================================================================
//  DRUMS TEST — the kit, the five play-mode styles, and the humanize knobs. Checks what you would
//  HEAR, not that functions ran:
//    1. every drum voice renders, at the pitch and length that makes it that drum; the ride is a short,
//       mellow bell in the key (no ringing metal above 5 kHz)
//    2. a closed hat really shuts an open hat
//    3. each style plays its signature: the bossa clave, the jazz ride + swung "&", disco's open hat
//    4. humanize can never move a beat, and never drifts further than its cap
//    5. the ghost-notes knob actually adds (and removes) quiet notes
//    6. fills come round on the phrase and the crash answers them
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-drums.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html';

(async()=>{const b=await launch();
 const ctx=await b.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message);});
 await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1')}catch(e){}});
 await p.goto(URL);await p.waitForTimeout(900);

 // ---- 1+2. render every voice offline and measure it ----
 const V=await p.evaluate(async()=>{
   const SR=44100,out={};drumKit='pop';
   const render=async(fn,len)=>{const rA=AC,rB=drumBus,rN=NB;
     AC=new OfflineAudioContext(1,SR*len,SR);NB=null;drumBus=AC.createGain();drumBus.connect(AC.destination);_ohChoke=null;
     try{fn();}finally{}const buf=await AC.startRendering();AC=rA;drumBus=rB;NB=rN;return buf.getChannelData(0);};
   for(const v of ['K','s','r','h','o','y','x','ht','lt','cl']){
     const d=await render(()=>dHit(v,0.05,1,true),2.5);
     let pk=0;for(const x of d)pk=Math.max(pk,Math.abs(x));
     let last=0;for(let i=d.length-1;i>=0;i--)if(Math.abs(d[i])>pk/100){last=i;break;}
     const st=Math.round(0.05*SR),N=4096;let best=0,bf=0;
     for(let f=40;f<16000;f*=1.03){let re=0,im=0;const w=2*Math.PI*f/SR;
       for(let n=0;n<N;n++){const x=d[st+n]*(0.5-0.5*Math.cos(2*Math.PI*n/N));re+=x*Math.cos(w*n);im-=x*Math.sin(w*n);}
       const m=Math.hypot(re,im);if(m>best){best=m;bf=f;}}
     out[v]={peak:pk,decay:(last-st)/SR,hz:bf};}
   // THE RIDE, measured the way it was complained about: sharp, ringing, metallic. Rendered in the jazz kit, in
   // two keys, at a hard and a soft hit. hi = share of its energy above 5 kHz (Goertzel, per-Hz weighted).
   const spec=(d,st)=>{const N=8192;let tot=0,hi=0,cen=0,bf=0,bm=0;
     for(let f=60;f<18000;f*=1.02){let re=0,im=0;const w=2*Math.PI*f/SR;
       for(let n=0;n<N;n++){const x=d[st+n]*(0.5-0.5*Math.cos(2*Math.PI*n/N));re+=x*Math.cos(w*n);im-=x*Math.sin(w*n);}
       const m=(re*re+im*im)*f;tot+=m;cen+=m*f;if(f>5000)hi+=m;if(m>bm){bm=m;bf=f;}}
     return {hi:hi/tot,cen:cen/tot,hz:bf};};
   const rms=(d,st)=>{let e=0;for(let i=st;i<st+Math.round(0.3*SR);i++)e+=d[i]*d[i];return Math.sqrt(e/(0.3*SR));};
   drumKit='jazz';const st=Math.round(0.05*SR);out.ride={};
   for(const root of [60,66]){S.root=root;const d=await render(()=>dHit('y',0.05,1,true),2);
     let pk=0;for(const x of d)pk=Math.max(pk,Math.abs(x));let last=0;for(let i=d.length-1;i>=0;i--)if(Math.abs(d[i])>pk/100){last=i;break;}
     out.ride[root]={...spec(d,st),decay:(last-st)/SR,rms:rms(d,st),peak:pk};}
   out.ride.soft=rms(await render(()=>dHit('y',0.05,0.45,true),2),st);
   out.ride.hat=rms(await render(()=>dHit('h',0.05,1,true),2),st);
   drumKit='pop';S.root=60;
   const energy=d=>{let e=0;for(let i=Math.round(0.3*SR);i<Math.round(0.45*SR);i++)e+=d[i]*d[i];return e;};
   out.open=energy(await render(()=>dHit('o',0.05,1,true),1));
   out.choked=energy(await render(()=>{dHit('o',0.05,1,true);dHit('h',0.17,1,true);},1));
   // the same hi-hat: a second open hit cuts the first, so two open hats ring like ONE, not two stacked
   const late=d=>{let e=0;for(let i=Math.round(0.15*SR);i<Math.round(0.25*SR);i++)e+=d[i]*d[i];return e;};
   out.oneOpen=late(await render(()=>dHit('o',0.12,1,true),1));
   out.twoOpen=late(await render(()=>{dHit('o',0.05,1,true);dHit('o',0.12,1,true);},1));
   return out;});
 for(const v of ['K','s','r','h','o','y','x','ht','lt','cl'])ok(V[v].peak>0.02,v+' makes a sound (peak '+V[v].peak.toFixed(3)+')');
 ok(V.cl.hz>2000&&V.cl.hz<3200&&V.cl.decay<0.12,'the clave is a bright, short click ('+Math.round(V.cl.hz)+'Hz, '+(V.cl.decay*1000|0)+'ms)');
 ok(V.lt.hz<V.ht.hz&&V.lt.hz<160&&V.ht.hz<260,'the low tom is lower than the high tom ('+Math.round(V.lt.hz)+' < '+Math.round(V.ht.hz)+'Hz)');
 ok(V.x.decay>1,'the crash rings on ('+V.x.decay.toFixed(2)+'s)');
 ok(V.x.hz>2500,'and it is cymbal-bright ('+Math.round(V.x.hz)+'Hz)');
 // the ride is a small clean bell now (Flah: the old metal one was "ear bleeding")
 {const R=V.ride,a=R[60],b=R[66],pc=hz=>((Math.round(12*Math.log2(hz/440))+69)%12+12)%12;
  ok(a.hi<0.03&&b.hi<0.03,'the ride has no sharp metal on top (energy above 5 kHz: '+(a.hi*100).toFixed(1)+'%)');
  ok(a.cen<2000,'it is a mellow bell, not a hiss (centre of its sound '+Math.round(a.cen)+' Hz)');
  ok(a.decay<0.5&&a.decay>0.15,'it rings briefly, then it is gone (silent after '+a.decay.toFixed(2)+'s)');
  ok(a.rms<R.hat*1.4,'it is no louder than a closed hat ('+a.rms.toFixed(4)+' vs hat '+R.hat.toFixed(4)+')');
  ok(pc(a.hz)===0&&pc(b.hz)===6,'and it is in tune with the key (C key rings a C, F# key rings an F#: '+Math.round(a.hz)+' / '+Math.round(b.hz)+' Hz)');
  ok(R.soft<a.rms*0.6,'a soft hit is clearly softer than an accent ('+(R.soft/a.rms*100).toFixed(0)+'%)');}
 ok(V.o.decay>V.h.decay*4,'the open hat rings far longer than the closed one ('+V.o.decay.toFixed(2)+'s vs '+V.h.decay.toFixed(3)+'s)');
 ok(V.choked<V.open*0.05,'a closed hat shuts the open hat (tail energy '+(V.choked/V.open*100).toFixed(1)+'% of unchoked)');
 ok(V.twoOpen<V.oneOpen*1.05,'open hat and open hat share the choke group too (two hits ring like one: '+(V.twoOpen/V.oneOpen).toFixed(2)+'x)');

 // ---- 3-6. play each style through the real scheduler and log every hit ----
 await p.click('.modeCard[data-m="studio"]');await p.waitForTimeout(1500);
 await p.evaluate(()=>{window.__log=[];window.__hv=[];
   const hv=humanVoice;humanVoice=function(v,inBar){const r=hv(v,inBar);window.__hv.push(r.t);return r;};
   const dh=dHit;dHit=function(v,t,a,solid,inBar){const n=window.__hv.length;dh(v,t,a,solid,inBar);
     const ht=window.__hv.length>n?window.__hv[window.__hv.length-1]:0;
     window.__log.push({v,inBar,a,grid:drumTime,off:(t-drumTime)+ht,bar:(drumStep/16)|0,step:drumStep%16});};});
 const run=(kit,bars,setup)=>p.evaluate(async([kit,bars,setup])=>{
   if(!S.playing)setPlaying(true);if(!drumOn)$("drumBtn").click();
   const s=$("drumKit");s.value=kit;s.dispatchEvent(new Event('change'));drumKit=kit;
   delete KIT_EDITS[kit];loadHuman();if(setup)Object.assign(HUMAN,setup),HUMAN_KIT=kit;
   setBpm(220);PAD.x=0.5;PAD.y=0.5;S.groove=false;
   window.__log.length=0;drumStep=0;drumTime=AC.currentTime+0.05;
   const dur=bars*4*60/220;await new Promise(r=>setTimeout(r,dur*1000+300));
   return window.__log.slice();},[kit,bars,setup]);

 // BOSSA: the clave on 1, a-of-1, &-of-2, &-of-3, a-of-4, in every bar
 const bo=await run('bossa',6);
 const clSteps=[...new Set(bo.filter(h=>h.v==='cl').map(h=>h.step))].sort((a,b)=>a-b);
 ok(JSON.stringify(clSteps)==='[0,3,6,10,13]','bossa plays the bossa nova clave on steps '+JSON.stringify(clSteps)+' (want [0,3,6,10,13])');
 const clBars=new Set(bo.filter(h=>h.v==='cl').map(h=>h.bar));
 ok(clBars.size>=5,'and the clave is there every bar ('+clBars.size+' of 6)');
 ok(!bo.some(h=>h.v==='s'&&h.a>0.5),'bossa has no loud snare backbeat');

 // JAZZ: ride on 1 2 &2 3 4 &4, the "&" swung late, hat foot on 2 and 4
 const jz=await run('jazz',6);
 const ride=jz.filter(h=>h.v==='y');
 const rideSteps=[...new Set(ride.map(h=>h.step))].sort((a,b)=>a-b);
 ok(JSON.stringify(rideSteps)==='[0,4,6,8,12,14]','jazz ride plays "ding, ding-a ding, ding-a" '+JSON.stringify(rideSteps));
 const stepDur=60/220/4, and=ride.filter(h=>h.step===6||h.step===14).map(h=>h.off/stepDur);
 const andAvg=and.reduce((a,c)=>a+c,0)/Math.max(1,and.length);
 ok(andAvg>0.4&&andAvg<0.75,'the ride\'s "&" lands late, in the triplet spot ('+andAvg.toFixed(2)+' of a 16th late; straight=0, full triplet=0.67)');
 ok([...new Set(jz.filter(h=>h.v==='h').map(h=>h.step))].join()==='4,12','the hi-hat foot closes on 2 and 4');

 // DISCO: four on the floor, open hats on every "&"
 const di=await run('disco',4);
 ok([...new Set(di.filter(h=>h.v==='K').map(h=>h.step))].sort((a,b)=>a-b).join()==='0,4,8,12','disco: kick on every beat');
 ok([...new Set(di.filter(h=>h.v==='o').map(h=>h.step))].sort((a,b)=>a-b).join()==='2,6,10,14','disco: open hat on every "&"');

 // HUMANIZE at maximum: beats locked, nothing past the cap
 const hz=await run('rock',8,{dyn:1,time:1,ghost:1});
 const beats=hz.filter(h=>h.inBar!=null&&h.inBar%4===0);
 const maxBeat=Math.max(...beats.map(h=>Math.abs(h.off)));
 ok(beats.length>20&&maxBeat<1e-6,'with every knob at 100, every hit on a beat is exactly on the grid ('+beats.length+' hits, worst '+(maxBeat*1000).toFixed(3)+'ms)');
 const between=hz.filter(h=>h.inBar!=null&&h.inBar%4!==0);
 const maxOff=Math.max(...between.map(h=>Math.abs(h.off)));
 ok(maxOff<=Math.min(0.022,0.25*stepDur)+1e-6,'the notes between beats stay inside the cap (worst '+(maxOff*1000).toFixed(1)+'ms, cap '+(Math.min(0.022,0.25*stepDur)*1000).toFixed(1)+'ms)');
 ok(between.some(h=>Math.abs(h.off)>0.002),'and they really do move at that setting');
 const tight=await run('rock',8,{dyn:0,time:0,ghost:0});
 const tMax=Math.max(...tight.filter(h=>h.inBar!=null).map(h=>Math.abs(h.off)));
 ok(tMax<1e-6,'with timing at 0 nothing moves at all ('+(tMax*1000).toFixed(3)+'ms)');

 // GHOST NOTES: count quiet notes that are not in the pattern
 const ghosts=l=>l.filter(h=>h.a<0.35&&(h.v==='s'||h.v==='h')).length;
 ok(ghosts(tight)===0,'ghost notes at 0: none ('+ghosts(tight)+')');
 ok(ghosts(hz)>=8,'ghost notes at 100: plenty ('+ghosts(hz)+' in 8 bars)');

 // FILLS: pop fills every 8 bars, on the toms -- and NO crash after a fill any more
 const po=await run('pop',10);
 const fillToms=po.filter(h=>h.bar===7&&h.step>=12&&(h.v==='ht'||h.v==='lt')).length;
 ok(fillToms>0,'pop fills round the toms at the end of bar 8 ('+fillToms+' tom hits)');
 ok(!po.some(h=>h.v==='x'),'no crash after the fill, or anywhere, while the key stays put');
 // CRASH: one, on the downbeat where the key moves, and only in styles that crash
 const keyRun=(kit)=>p.evaluate(async(kit)=>{
   if(!S.playing)setPlaying(true);if(!drumOn)$("drumBtn").click();
   const s=$("drumKit");s.value=kit;s.dispatchEvent(new Event('change'));drumKit=kit;delete KIT_EDITS[kit];loadHuman();
   setBpm(220);S.groove=false;S.slimeMode=true;_keyPinned=false;_autoHold=0;_slimeBars=_keyJourneyBars()-2;
   window.__log.length=0;drumStep=0;drumTime=AC.currentTime+0.05;const root0=S.root;
   await new Promise(r=>setTimeout(r,6*4*60/220*1000+300));
   return {log:window.__log.slice(),moved:S.root!==root0};},kit);
 const pk=await keyRun('pop');
 const crashes=pk.log.filter(h=>h.v==='x');
 ok(pk.moved,'the key moved during the run');
 ok(crashes.length===1&&crashes[0].step===0,'pop: exactly one crash, on the 1 where the key moved ('+crashes.length+')');
 const jk=await keyRun('jazz');
 ok(jk.moved&&!jk.log.some(h=>h.v==='x'),'jazz: the key moves, and no crash');

 ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'drums pass clean'));
 process.exit(FAIL.length?1:0);})();

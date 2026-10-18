// ============================================================================================
//  WORLD TEST — every scale harmonizes the way its own music does, the chord chip says something a
//  kid can learn from, and play mode travels the world and comes home.
//    1. modes and world scales walk their own changes (dorian i-IV, mixolydian I-bVII, lydian I-II,
//       hijaz I-bII-iv-vii, harmonic minor i-iv-V, whole tone I+-II+), never a stray chord
//    2. the blues plays the twelve-bar, one chord a bar, as dominant sevenths
//    3. a raga stays on its drone (Sa), Japanese scales on their fourth/fifth frames, never a triad
//    4. the chip says the chord in words ("E minor", "C7", "E drone") and the scale it is in
//    5. play mode: home (major/minor) -> abroad on the same home note -> home again; never microtonal;
//       it gets round a good part of the world
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-world.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html';
(async()=>{const b=await launch();
 const ctx=await b.newContext({viewport:{width:1280,height:860}});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message);});
 await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1')}catch(e){}});
 await p.goto(URL+'?m=studio');await p.waitForTimeout(1500);
 // drive the chord brain directly, bar by bar, with the key pinned so nothing else moves
 const walk=(scale,bars)=>p.evaluate(([scale,bars])=>{const s=document.getElementById('scale');s.value=scale;s.dispatchEvent(new Event('change'));
   _keyPinned=true;S.slimeMode=true;_chordIdx=0;_autoHold=0;_vampIdx=0;_bluesBar=0;nextRootDeg=null;
   const seq=[];for(let i=0;i<bars;i++){advanceHarmony(i);seq.push(curRootDeg);}return seq;},[scale,bars]);
 const set=a=>[...new Set(a)].sort((x,y)=>x-y).join(',');
 const allow={dorian:[0,3,6],mixolydian:[0,3,6],lydian:[0,1,4],phrygian:[0,1,6],harmMin:[0,3,4,5],hijaz:[0,1,3,6],wholeTone:[0,1]};
 const must={dorian:[0,3,6],mixolydian:[0,6,3],lydian:[0,1,4],phrygian:[0,1],harmMin:[0,3,4],hijaz:[0,1],wholeTone:[0,1]};
 for(const k in allow){const seq=await walk(k,64);
   ok(seq.every(d=>allow[k].includes(d))&&must[k].every(d=>seq.includes(d)),k+' walks its own changes ('+set(seq)+' of '+allow[k].join(',')+')');}
 // blues
 const bl=await p.evaluate(()=>{const s=document.getElementById('scale');s.value='blues';s.dispatchEvent(new Event('change'));
   _keyPinned=true;_bluesBar=0;const roots=[],voic=[];const bc=bandComp;bandComp=function(t,barI,degs){voic.push(degs.slice());};
   const was=bandOn;bandOn=true;for(let i=0;i<12;i++){advanceHarmony(i);roots.push(Math.round(centsForDegree(curRootDeg)/100));bandBar(AC?AC.currentTime:0,i);}
   bandComp=bc;bandOn=was;return {roots,voic:voic.map(v=>v.map(c=>((Math.round(c-v[0])%1200)+1200)%1200).sort((a,b)=>a-b).join(','))};});
 ok(bl.roots.join(',')==='0,0,0,0,5,5,0,0,7,5,0,7','the blues plays the twelve-bar: I I I I IV IV I I V IV I V ('+bl.roots.join(' ')+')');
 ok(bl.voic.length===12&&bl.voic.every(v=>v==='0,400,700,1000'),'as dominant sevenths ('+(bl.voic[0]||'nothing voiced')+')');
 // drones
 const raga=await walk('bhairav',32);ok(raga.every(d=>d===0),'bhairav never leaves its drone on Sa ('+set(raga)+')');
 for(const k of ['hirajoshi','inSen','iwato']){const seq=await walk(k,48);
   let v=await p.evaluate(()=>{const was=bandOn;bandOn=true;let got=null;const bc=bandComp;bandComp=function(t,b,degs){got=degs.slice();};bandBar(0,0);bandComp=bc;bandOn=was;return {n:got?got.length:0,fifth:degNear(scaleObj().c,700)};});
   ok(seq.every(d=>d===0||d===v.fifth),k+' stays on its tonic and fifth frames ('+set(seq)+')');
   v=v.n;
   ok(v===2,k+' is voiced as an open fifth, never a triad ('+v+' notes)');}
 // the chip
 const chip=await p.evaluate(()=>{const out={};const s=document.getElementById('scale'),r=document.getElementById('root');
   const read=(sc,root,deg)=>{s.value=sc;s.dispatchEvent(new Event('change'));r.value=String(root);r.dispatchEvent(new Event('change'));curRootDeg=deg;paintChordChip();
     return document.getElementById('hcName').textContent+' | '+document.getElementById('hcKey').textContent;};
   out.min=read('major',67,5);out.maj=read('major',67,0);out.blues=read('blues',60,0);out.raga=read('bhairav',64,0);out.hira=read('hirajoshi',64,0);return out;});
 ok(chip.min==='E minor | G major','the chip names the chord and its scale ("'+chip.min+'")');
 ok(chip.maj==='G major | G major','and a major chord says major ("'+chip.maj+'")');
 ok(/^C7 \| C blues$/.test(chip.blues),'the blues says C7 ("'+chip.blues+'")');
 ok(/^E drone \| E bhairav$/.test(chip.raga),'a raga says it is a drone ("'+chip.raga+'")');
 ok(/^E drone \| E hirajoshi$/.test(chip.hira),'hirajoshi too ("'+chip.hira+'")');
 // play-mode journey
 const j=await p.evaluate(()=>{applyMode('play');const s=document.getElementById('scale'),r=document.getElementById('root');
   s.value='major';s.dispatchEvent(new Event('change'));r.value='60';r.dispatchEvent(new Event('change'));
   const log=[];for(let i=0;i<40;i++){const before={sc:S.scale,root:S.root};keyJourney();log.push({from:before.sc,to:S.scale,r0:before.root,r1:S.root});}
   return log;});
 const micro=['maqamRast','maqamBayati','slendro','pelog','neutral7','edo19','chromatic','locrian'];
 ok(j.every(x=>!micro.includes(x.to)),'play mode never goes microtonal (or chromatic / locrian)');
 const homes=['major','minor'];
 ok(j.every(x=>homes.includes(x.from)!==homes.includes(x.to)),'it alternates: home, abroad, home, abroad');
 ok(j.filter(x=>homes.includes(x.from)).every(x=>x.r0===x.r1),'a trip abroad keeps the home note');
 const visited=new Set(j.map(x=>x.to).filter(k=>!homes.includes(k)));
 ok(visited.size>=10,'in 40 moves it visits '+visited.size+' scales abroad: '+[...visited].join(', '));
 ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'world pass clean'));
 process.exit(FAIL.length?1:0);})();

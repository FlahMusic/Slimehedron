// ============================================================================================
//  THE MIX UNDER THE MELODY (critique tickets 04-05, Flah 2026-11-03: the bossa clave "overwhelmed everything", the
//  jazz ride sounded like a note). Each part is played ALONE through the real output chain and measured K-weighted
//  (ITU-R BS.1770: the two biquads), ungated, over 4 whole bars at 120 bpm, plus 100 ms windows for single drum hits.
//  Thresholds from _docs/research/2026-11-04-mix-levels.md (soft kits: bossa, jazz):
//    1. the bass sits 3 to 10 LU under the melody; the chords at least 3 under
//    2. every kit's drums at least 6 LU under the melody (soft kits 9)
//    3. every drum piece at least 10 LU under the melody (soft kits 13), pattern, ghost notes and a fill together
//    4. every drum piece's loudest 100 ms at least 3 LU under the melody's median 100 ms
//    5. the melody at least 1 LU over the whole band (bass + chords + drums)
//    6. jazz plays no ride
//  The melody is a fixed eighth-note line at the notes' normal velocity, so every run measures the same thing.
//  Slow (~25 min for all 11 kits). Kits: node _dev/dev-mix.js pop,bossa
//  Sabotage: SAB=clave (the clave back to 0.34), SAB=ride (the jazz ride back), SAB=rock (rock's kit trim off).
//  Needs a local server: python -m http.server 8765. Run from the project root: node _dev/dev-mix.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const KITS=(process.argv[2]||'chip,beep,pop,rock,disco,bossa,samba,conga,march,industrial,jazz').split(',');
const SOFT={bossa:1,jazz:1},SAB=process.env.SAB||'';

(async()=>{const b=await launch();const p=await (await b.newContext({viewport:{width:1280,height:860}})).newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');}catch(e){}});
 await p.goto('http://127.0.0.1:8765/index.html?m=studio');await p.waitForTimeout(2500);
 const out=await p.evaluate(async([kits,SAB])=>{initAudio();if(AC.state==='suspended')await AC.resume();
  if(SAB==='clave')PIECE_DB.bossa=Object.assign({},PIECE_DB.bossa,{cl:((PIECE_DB.bossa||{}).cl||0)+6});   // 0.17 -> 0.34 is +6 dB
  if(SAB==='ride')KITS.jazz.y=[0,4,6,8,12,14,16,20,22,24,28,30,32,36,38,40,44,46,48,52,54,56,60,62];
  if(SAB==='rock')KIT_DB.rock=0;
  const W0={m:S.wM,d:S.wD,k:S.wK};
  const k1=AC.createBiquadFilter(),k2=AC.createBiquadFilter();k1.type='highshelf';k1.frequency.value=1681.97;k1.gain.value=4;
  k2.type='highpass';k2.frequency.value=38.13;k2.Q.value=0.5;const sp=AC.createScriptProcessor(1024,1,1);
  outClip.connect(k1);k1.connect(k2);k2.connect(sp);sp.connect(AC.destination);
  let win=[],cur=0,cn=0,on=false;const WN=Math.round(AC.sampleRate*0.1);
  sp.onaudioprocess=e=>{if(!on)return;const d=e.inputBuffer.getChannelData(0);for(const x of d){cur+=x*x;cn++;if(cn>=WN){win.push(cur/cn);cur=0;cn=0;}}};
  const L=ms=>-0.691+10*Math.log10(ms+1e-20),wait=ms=>new Promise(r=>setTimeout(r,ms));
  const meas=async(secs)=>{win=[];cur=0;cn=0;on=true;await wait(secs*1000);on=false;
    const srt=win.filter(m=>L(m)>-70).map(L).sort((a,b)=>a-b);
    return {int:L(win.reduce((a,m)=>a+m,0)/Math.max(1,win.length)),max:srt.length?srt[srt.length-1]:-99,med:srt.length?srt[srt.length>>1]:-99};};
  const solo=(m,d,k)=>{S.wM=m;S.wD=d;S.wK=k;applyMix();};
  setBpm(120);const bar=()=>drumBar()*drumStepDur()*1000;
  // whole patterns: from the top of the 4-bar cycle, with a fill in it every time (a fill is a chord-jackpot answer here,
  // so the toms and the landing are always measured, not only when the phrase end happens to fall in the window)
  const meas4=async()=>{for(let i=0;i<400&&(drumStep%64)!==1;i++)await wait(10);JACK.fill=1;JACK.fillAt=performance.now();return meas(4*bar()/1000);};
  if(!S.playing)setPlaying(true);if(!S.slimeMode)$("slimeBig").click();_keyPinned=true;
  const res={jazzRide:(KITS.jazz.y||[]).length+(KITVOICE.jazz.hi==='y'?1:0)};
  // the melody alone: a fixed line, no balls, no band, no drums
  S.autoNotes=false;balls.length=0;if(drumOn)$("drumBtn").click();if(bandOn)$("bandBtn").click();solo(W0.m,0,0);await wait(800);
  const vel=S.velRand?Math.round((S.velMin+S.velMax)/2):S.velFix,line=[7,9,11,12,14,11,9,8];let k=0;
  const iv=setInterval(()=>{playSynth(freqFromCents(centsForDegree(line[k++%line.length])),vel,0.7);},60000/S.bpm/2);
  await wait(400);res.mel=await meas(8);clearInterval(iv);
  // the band: bass alone, chords alone, both
  if(!bandOn)$("bandBtn").click();solo(0,0,W0.k);
  MIX.chords.m=true;applyMix();await wait(1200);res.bass=await meas(4*bar()/1000);
  MIX.chords.m=false;MIX.bass.m=true;applyMix();await wait(1200);res.chords=await meas(4*bar()/1000);
  MIX.bass.m=false;applyMix();await wait(1200);res.band=await meas(4*bar()/1000);
  if(bandOn)$("bandBtn").click();
  // each kit: the whole kit, then each piece it played, alone (every hit of that voice: pattern, ghost notes, fills)
  res.kits={};
  for(const kit of kits){const sel=document.getElementById('drumKit');drumKit=kit;if(sel){sel.value=kit;sel.dispatchEvent(new Event('change'));}
    const D0=dHit,hit=new Set();dHit=function(v){hit.add(v);return D0.apply(this,arguments);};
    if(!drumOn)$("drumBtn").click();solo(0,W0.d,0);await wait(800);const all=await meas4();dHit=D0;
    const pieces={};
    for(const pc of hit){dHit=function(v){return v===pc?D0.apply(this,arguments):undefined;};
      await wait(bar());pieces[pc]=await meas4();dHit=D0;}   // a bar first: the hits the scheduler already queued play out
    if(drumOn)$("drumBtn").click();res.kits[kit]={all,pieces};}
  solo(W0.m,W0.d,W0.k);return res;},[KITS,SAB]);
 const f=x=>(x>=0?'+':'')+x.toFixed(1),M=out.mel,psum=(...l)=>10*Math.log10(l.reduce((a,x)=>a+Math.pow(10,x/10),0));
 console.log('melody '+M.int.toFixed(1)+' LUFS (median 100 ms '+M.med.toFixed(1)+')');
 const bass=out.bass.int-M.int,chords=out.chords.int-M.int;
 ok(bass<=-3&&bass>=-10,'1. the bass sits 3 to 10 LU under the melody ('+f(bass)+' LU)');
 ok(chords<=-3,'1. the chords sit at least 3 LU under the melody ('+f(chords)+' LU)');
 for(const [kit,v] of Object.entries(out.kits)){const soft=!!SOFT[kit],dr=v.all.int-M.int;
  ok(dr<=(soft?-9:-6),'2. '+kit+': the drums sit at least '+(soft?9:6)+' LU under the melody ('+f(dr)+' LU)');
  const loud=Object.entries(v.pieces).map(([pc,m])=>({pc,int:m.int-M.int,tr:m.max-M.med})).filter(x=>x.int>-60);
  const worst=loud.reduce((a,x)=>x.int>a.int?x:a,{pc:'-',int:-99}),worstT=loud.reduce((a,x)=>x.tr>a.tr?x:a,{pc:'-',tr:-99});
  ok(worst.int<=(soft?-13:-10),'3. '+kit+': every piece at least '+(soft?13:10)+' LU under the melody (loudest: '+worst.pc+' '+f(worst.int)+'; '+loud.map(x=>x.pc+' '+f(x.int)).join(', ')+')');
  ok(worstT.tr<=-3,'4. '+kit+': every hit\'s loudest 100 ms at least 3 LU under the melody\'s median (loudest: '+worstT.pc+' '+f(worstT.tr)+')');
  const whole=psum(out.band.int,v.all.int)-M.int;
  ok(whole<=-1,'5. '+kit+': the melody at least 1 LU over the whole band ('+f(-whole)+' LU)');}
 ok(out.jazzRide===0,'6. jazz plays no ride, in its pattern or its fills ('+out.jazzRide+')');
 ok(errs.length===0,'no page errors ('+errs.slice(0,2).join(' | ')+')');
 await b.close();
 console.log(FAIL.length?'\n'+FAIL.length+' FAIL':'\nthe melody leads: every kit and the band sit under it');process.exit(FAIL.length?1:0);})();

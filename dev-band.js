// ============================================================================================
//  IS THE BAND ACTUALLY GENERATING, OR JUST LOOPING?
//  The chord comp used to be four hardcoded rhythms rotated by bar — identical for all five kits,
//  so a bossa comped like a rock song and you heard the same four bars until you turned it off.
//  It is now generated per bar from a per-genre rule table (FEELS), with the bass generated per
//  16-bar block and the comp written AGAINST it so the two interlock instead of doubling up.
//
//  "It generated something" is not the claim. The claims are: it is genuinely varied, each genre
//  sounds like its own genre, and the chords dodge the bass. So this measures the statistics of a
//  few hundred generated bars rather than checking a function ran.
//  Run: node dev-band.js   (needs python3 -m http.server 8765)
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const KITS=['pop','rock','disco','bossa','jazz'];
const ON=[0,4,8,12], OFF=[2,6,10,14];

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--autoplay-policy=no-user-gesture-required']});
const ctx=await b.newContext({viewport:{width:1280,height:860}});
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8765/index.html?m=studio');
await p.waitForTimeout(3000);

const data=await p.evaluate((kits)=>{
  const out={};
  for(const k of kits){
    const comps=[],basses=[];
    for(let bar=0;bar<240;bar++){
      const pl=window.__bandPlan(bar,k);
      comps.push(pl.comp.slice());
      basses.push(Object.keys(pl.bass).map(Number).sort((a,b)=>a-b));
    }
    out[k]={comps,basses};
  }
  return out;},KITS);

for(const k of KITS){
  const {comps,basses}=data[k];

  // ---- 1. VARIETY. a generator that emits four patterns is a list with extra steps ----
  const uniq=new Set(comps.map(c=>c.join(',')));
  ok(uniq.size>=20,'['+k+'] the chord rhythm is genuinely varied — '+uniq.size+' distinct patterns in 240 bars (need 20+)');

  // ---- 2. IT IS STILL MUSIC. every onset on the grid, every bar has something ----
  const bad=comps.filter(c=>!c.length||c.some(x=>!Number.isInteger(x)||x<0||x>15));
  ok(bad.length===0,'['+k+'] every bar has at least one chord hit and all land on the 16th grid ('+bad.length+' bad)');

  // ---- 3. IT SOUNDS LIKE ITS OWN GENRE ----
  const all=comps.flat();
  const onBeat=all.filter(x=>ON.includes(x)).length/all.length;
  const offBeat=all.filter(x=>OFF.includes(x)).length/all.length;
  const eAndA=all.filter(x=>x%2===1).length/all.length;
  if(k==='disco')
    ok(offBeat>onBeat*1.6,'[disco] the chords live on the OFF-beats, as disco does (off '+
      (offBeat*100).toFixed(0)+'% vs on '+(onBeat*100).toFixed(0)+'%)');
  if(k==='jazz')
    ok(eAndA<0.06,'[jazz] chords stay on beats and &s, never the e/a — that is where swing lives ('+
      (eAndA*100).toFixed(1)+'% strays)');
  if(k==='rock')
    ok(onBeat>offBeat,'[rock] straight and driving: more on-beat than off ('+
      (onBeat*100).toFixed(0)+'% vs '+(offBeat*100).toFixed(0)+'%)');
  if(k==='bossa'){
    const two=all.filter(x=>x===2).length/all.length, six=all.filter(x=>x===6).length/all.length;
    ok(two+six>0.18,'[bossa] it leans on the &1 and &2 the way bossa does ('+((two+six)*100).toFixed(0)+'% of hits)');}

  // ---- 4. THE BASS HOLDS, THEN CHANGES. a bassline that changes every bar is not a bassline ----
  const sig=basses.map(x=>x.join(','));
  let withinBlock=true,blocks=new Set();
  for(let bl=0;bl<15;bl++){
    const first=sig[bl*16];
    blocks.add(first);
    for(let i=1;i<16;i++)if(sig[bl*16+i]!==first)withinBlock=false;}
  ok(withinBlock,'['+k+'] the bass figure holds steady for a whole 16-bar block');
  ok(blocks.size>=5,'['+k+'] and it is a different figure next block — '+blocks.size+' in 15 blocks (need 5+)');

}

// ---- 5. THE INTERLOCK, measured fairly ----
// An earlier version of this compared against a uniform baseline and failed everything, which was
// the TEST being wrong: chord hits and bass notes both cluster on strong beats, so they collide
// more often than random chance even with no dodging at all. The fair comparison is the same
// generator on the SAME seeds, run once with the bass handed to it and once without.
// And dodging is NOT a universal good — disco and rock lock their chords to the bass on purpose,
// which is why `dodge` is a per-genre number and this checks each genre against its own intent.
for(const k of KITS){
  const ab=await p.evaluate((kit)=>{
    const feel=window.__feelFor(kit);
    const bass=new Set([0,4,8,12]);        // a plain bass figure to write against
    let cWith=0,cWithout=0,nWith=0,nWithout=0;
    for(let seed=1;seed<=900;seed++){
      const a=window.__genComp(feel,window.__mul32(seed),bass);   // knows where the bass is
      const b=window.__genComp(feel,window.__mul32(seed),null);   // same dice, deaf to the bass
      for(const x of a){nWith++;if(bass.has(x))cWith++;}
      for(const x of b){nWithout++;if(bass.has(x))cWithout++;}
    }
    return {on:cWith/nWith, off:cWithout/nWithout, dodge:feel.dodge};
  },k);
  const drop=1-(ab.on/ab.off);
  if(ab.dodge>=0.5)
    ok(drop>0.1,'['+k+'] weaves AROUND the bass (dodge '+ab.dodge+'): '+(ab.off*100).toFixed(0)+
      '% of hits would land on a bass note, '+(ab.on*100).toFixed(0)+'% actually do — '+(drop*100).toFixed(0)+'% fewer');
  else
    ok(drop<0.12,'['+k+'] LOCKS to the bass on purpose (dodge '+ab.dodge+'): collisions barely move, '+
      (ab.off*100).toFixed(0)+'% -> '+(ab.on*100).toFixed(0)+'% — disco and rock are supposed to hit together');
}

// ---- 6. DIFFERENT KITS REALLY ARE DIFFERENT ----
const prof=k=>{const a=data[k].comps.flat();const h=new Array(16).fill(0);
  for(const x of a)h[x]++;const t=a.length;return h.map(v=>v/t);};
const dist=(a,b)=>a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0);
let minD=9,worst='';
for(let i=0;i<KITS.length;i++)for(let j=i+1;j<KITS.length;j++){
  const d=dist(prof(KITS[i]),prof(KITS[j]));
  if(d<minD){minD=d;worst=KITS[i]+' vs '+KITS[j];}}
ok(minD>0.25,'the five kits comp genuinely differently — closest pair '+worst+' differs by '+minD.toFixed(2)+' (need 0.25+)');

// ---- 6b. DRUM FILLS. Nobody likes a fancy metronome ----
for(const k of KITS){
  const f=await p.evaluate((kit)=>{
    const out={phraseEnd:0,normal:0,patterns:new Set(),every:null,voices:new Set()};
    const fl=window.__feelFor(kit).fill; out.every=fl.every;
    for(let bar=0;bar<320;bar++){
      let row='';
      for(let st=0;st<16;st++){
        const g=window.__genFill(kit,bar,st);
        if(g){row+=g.v; out.voices.add(g.v);} else row+='.';
      }
      const hits=row.split('').filter(c=>c!=='.').length;
      if(((bar+1)%fl.every)===0){out.phraseEnd+=hits; if(hits)out.patterns.add(row);}
      else out.normal+=hits;
    }
    return {phraseEnd:out.phraseEnd,normal:out.normal,patterns:out.patterns.size,
            every:out.every,voices:[...out.voices]};
  },k);
  ok(f.normal===0,'['+k+'] fills NEVER fire mid-phrase ('+f.normal+' stray hits)');
  ok(f.phraseEnd>0,'['+k+'] a fill lands at the end of every '+f.every+' bars ('+f.phraseEnd+' hits across 320 bars)');
  ok(f.patterns>=12,'['+k+'] and it is a different fill each time — '+f.patterns+' distinct fills (need 12+)');
  ok(f.voices.length>=2,'['+k+'] the fill uses this kit\'s own voices, more than one of them ('+f.voices.join(' ')+')');
}

// ---- 7. A CHORD LASTS WHAT IT SAYS, AND THE KITS DON'T ALL PLAY THE SAME SONG ----
// The previous version of this test drove advanceHarmony() in a loop and then accepted
//     Math.abs(avg-bars)<0.6 || held.every(x => x % bars === 0)
// — and that second clause is why a chord set to 4 bars, which actually lasted 12, sailed through
// green. An assertion with an escape hatch is not an assertion. Runs must equal the setting; a run
// LONGER than the setting means two chords merged because the picker handed back the chord we were
// already on, which is exactly what made "2 bars" sound like 4 and the changes feel random.
for(const bars of [1,2,4]){
  const res=await p.evaluate(async(n)=>{
    S.chordBars=n;_chordIdx=0;_autoHold=0;nextRootDeg=null;curRootDeg=0;
    try{noteHisto.fill(0);}catch(e){}            // quiet tank = the auto progression path
    const degs=[];
    for(let bar=0;bar<64;bar++){advanceHarmony(bar);degs.push(curRootDeg);}
    const runs=[];let last=null,r=0;
    for(const d of degs){if(d===last)r++;else{if(last!==null)runs.push(r);r=1;last=d;}}
    runs.push(r);
    return runs.slice(1,-1);                     // drop the partial first and last
  },bars);
  const avg=res.length?res.reduce((a,c)=>a+c,0)/res.length:0;
  const over=res.filter(x=>x>bars);
  ok(Math.abs(avg-bars)<0.25,'a chord set to '+bars+' bar(s) lasts exactly that (average run '+avg.toFixed(2)+')');
  ok(over.length===0,'  ...and never runs long by landing on the same chord twice ('+over.length+' merged runs'+
    (over.length?': '+over.slice(0,4).join(', '):'')+')');
}

// Each kit must walk its OWN changes. One shared pool of four pop progressions is why all five
// rhythms sounded like the same song with different drums, however different the grooves were.
{const seqs=await p.evaluate(async(kits)=>{
   const out={};
   for(const kit of kits){
     drumKit=kit;_chordIdx=0;_autoHold=0;nextRootDeg=null;curRootDeg=0;progIdx=0;
     try{noteHisto.fill(0);}catch(e){}
     const d=[];for(let bar=0;bar<32;bar++){advanceHarmony(bar);d.push(curRootDeg);}
     out[kit]=d.join(',');
   }
   return out;},KITS);
 const keys=Object.keys(seqs);
 let dupes=[];
 for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++)
   if(seqs[keys[i]]===seqs[keys[j]])dupes.push(keys[i]+'='+keys[j]);
 ok(dupes.length===0,'the five kits walk different chord changes'+(dupes.length?' — IDENTICAL: '+dupes.join(', '):''));
 const uniq=new Set(Object.values(seqs));
 ok(uniq.size===keys.length,'all '+keys.length+' progressions are distinct ('+uniq.size+' unique)');
}

// ---- 8. THE CHORD IS PLAYED, AND THERE IS NO BED UNDER IT ----
// This used to assert that the sustained bed re-struck with the rhythm. There is no bed any more —
// it was removed because a held note buries the rhythm underneath it — so the assertion is now that
// the chord comes out as struck notes and the pad voice is never touched.
{const art=await p.evaluate(async()=>{
   let pads=0,plucks=0,bars=0;
   const _pv=window.padVoice,_pl=window.pluck,_bc=window.bandComp;
   window.padVoice=function(){pads++;return _pv.apply(this,arguments);};
   window.pluck=function(){plucks++;return _pl.apply(this,arguments);};
   window.bandComp=function(){bars++;return _bc.apply(this,arguments);};
   if(typeof bandOn!=='undefined'&&!bandOn)document.getElementById('bandBtn').click();
   if(typeof drumOn!=='undefined'&&!drumOn)document.getElementById('drumBtn').click();
   if(!S.playing)setPlaying(true);
   const iv=setInterval(()=>{try{drumSchedule();}catch(e){}},20);
   await new Promise(r=>setTimeout(r,14000));
   clearInterval(iv);
   window.padVoice=_pv;window.pluck=_pl;window.bandComp=_bc;
   return {pads,plucks,bars};});
 ok(art.bars>=3,'the band played enough bars to judge ('+art.bars+')');
 ok(art.pads===0,'no sustained bed is playing at all ('+art.pads+' pad voices)');
 ok(art.plucks>art.bars*4,'the chord is carried by struck notes ('+art.plucks+' over '+art.bars+' bars)');
 // the chord voice's own tone claim, moved here from dev-sound when the pad left the band:
 // it is a blend of two oscillators, not one bare waveform.
 const tone=await p.evaluate(()=>{
   let oscs=0;const _co=AC.createOscillator.bind(AC);
   AC.createOscillator=function(){oscs++;return _co();};
   try{pluck(0,AC.currentTime+0.2,0.6,true);}catch(e){}
   AC.createOscillator=_co;return oscs;});
 ok(tone>=2,'and that voice blends more than one oscillator, not a bare waveform ('+tone+')');
}

// ---- 9. THE COMP IS NOT SCALED BY A CONTROL THAT SAYS NOTHING ABOUT IT ----
// The comp rode S.bpMix (the bass/pad crossfader) — the same mistake the pad bed had. Moving a
// control labelled for bass and pads must not change how loud the RHYTHM is.
{const lv=await p.evaluate(()=>{
   // Drive bandComp DIRECTLY, once per bar, for each setting. Pumping drumSchedule() in real time
   // raced its own lookahead: the first window schedules seconds ahead, so the second window has
   // nothing left to do and collects zero samples — which reads as "silent" when it means
   // "already scheduled". Calling the function under test removes the race entirely.
   const seen={};const _pl=window.pluck;
   let bucket=null;
   window.pluck=function(c,t,vel,short){if(bucket)bucket.push(vel);return _pl.apply(this,arguments);};
   for(const m of [0,1]){
     S.bpMix=m;bucket=seen[m]=[];
     for(let bar=0;bar<16;bar++){
       // bars 0-2 of each phrase are the comp; bar 3 is the arp lick
       if(bar%4===3)continue;
       try{bandComp(AC.currentTime+0.5+bar,bar,[0,400,700],0.12,16);}catch(e){}
     }
   }
   bucket=null;window.pluck=_pl;S.bpMix=0.5;
   const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
   return {a:{n:seen[0].length,avg:avg(seen[0])},b:{n:seen[1].length,avg:avg(seen[1])}};});
 ok(lv.a.n>=8&&lv.b.n>=8,'enough comp stabs to compare ('+lv.a.n+' at bpMix 0, '+lv.b.n+' at bpMix 1)');
 const d=Math.abs(lv.a.avg-lv.b.avg)/Math.max(1e-6,Math.max(lv.a.avg,lv.b.avg));
 ok(d<0.25,'the bass/pad crossfader does not change the comp ('+lv.a.avg.toFixed(3)+' vs '+lv.b.avg.toFixed(3)+')');
}

// ---- 10. NOTHING DRONES, AND THE CHORD IS PLAYED, NOT HELD ----
// The chord used to have a sustained bed under it — one held note per chord tone per bar. A held
// note carries far more energy than a short one, so it buried the rhythm and the only thing you
// could hear was a chord tone sitting there. The bed is gone entirely: bandComp() is the whole
// chord voice now, like a keyboard player. If padVoice() is ever called from the band again, the
// drone is back.
{const kb=await p.evaluate((kits)=>{
   const out={};const _pl=window.pluck,_pv=window.padVoice;
   for(const kit of kits){
     drumKit=kit;_chordIdx=0;_autoHold=0;nextRootDeg=null;curRootDeg=0;progIdx=0;
     try{noteHisto.fill(0);}catch(e){}
     const sc=scaleObj().c;
     const inScale=sc.map(c=>((Math.round(c)%1200)+1200)%1200);
     const bars=[];let padCalls=0,outside=0,total=0;
     let vBars=0,vRich=0;
     window.padVoice=function(){padCalls++;return _pv.apply(this,arguments);};
     for(let bar=0;bar<48;bar++){
       const got=[];
       window.pluck=function(c,t,vel,short){got.push({c:Math.round(c),t:+t.toFixed(4),short:!!short});};
       advanceHarmony(bar);
       const wasV=(curRootDeg===4%sc.length);
       try{bandBar(100+bar*2,bar);}catch(e){}
       window.pluck=_pl;
       const byT={};got.forEach(g=>{byT[g.t]=(byT[g.t]||0)+1;});
       const onsets=Object.keys(byT).length;
       const per=onsets?got.length/onsets:0;
       const pcs=new Set(got.map(g=>((g.c%1200)+1200)%1200));
       for(const pc of pcs){total++;
         let ok=false;for(const sdeg of inScale)
           if(Math.abs(sdeg-pc)<=3||Math.abs(sdeg-pc-1200)<=3||Math.abs(sdeg-pc+1200)<=3)ok=true;
         if(!ok)outside++;}
       if(wasV){vBars++;if(pcs.size>=4)vRich++;}
       bars.push({onsets,per:+per.toFixed(2),allShort:got.every(g=>g.short),n:got.length});
     }
     window.padVoice=_pv;
     out[kit]={padCalls,outside,total,
       shapes:new Set(bars.map(x=>x.onsets+'/'+x.per)).size,
       arp:bars.filter(x=>x.per<1.35&&x.onsets>=4).length,
       block:bars.filter(x=>x.per>=2.5).length,
       allShort:bars.every(x=>x.allShort),
       silent:bars.filter(x=>x.n===0).length};
   }
   window.pluck=_pl;return out;},KITS);

 for(const k of KITS){const x=kb[k];
   ok(x.padCalls===0,'['+k+'] NOTHING drones — the sustained bed is never called ('+x.padCalls+' pad voices)');
   ok(x.allShort,'['+k+'] every chord note is struck and released, never held');
   ok(x.silent===0,'['+k+'] the chord speaks in every bar ('+x.silent+' silent bars)');
   ok(x.outside===0,'['+k+'] nothing lands outside the scale ('+x.outside+' of '+x.total+' pitch classes)');
   ok(x.shapes>=8,'['+k+'] the voicing changes bar to bar — '+x.shapes+' distinct shapes in 48 bars (need 8+)');
   ok(x.arp>0&&x.block>0,'['+k+'] it both arpeggiates and plays block chords ('+x.arp+' arp bars, '+x.block+' block)');
 }
 // the genres must differ in HOW they play it, not just what they play
 // Compare each kit's OWN balance. Raw counts are not comparable: the kits play different numbers
 // of arp and block bars, so "rock has more block bars" can be false while rock is still the
 // blockier of the two. The claim is about the MIX, so measure the mix.
 const ratio=k=>kb[k].block/Math.max(1,kb[k].arp);
 ok(ratio('rock')>ratio('disco'),
   'rock leans on block chords where disco leans on arpeggios (rock '+ratio('rock').toFixed(2)+
   ' block-per-arp vs disco '+ratio('disco').toFixed(2)+')');
 ok(kb.disco.arp>kb.rock.arp,'and disco arpeggiates more often ('+kb.disco.arp+' vs '+kb.rock.arp+' bars)');
}

ok(errs.length===0,'no page errors ('+errs.length+')'+(errs.length?' :: '+errs[0]:''));
await b.close();
console.log('\n'+(FAIL.length?'FAILED '+FAIL.length+':\n - '+FAIL.join('\n - '):'the band improvises, in character, and listens to the bass'));
process.exit(FAIL.length?1:0);
})();

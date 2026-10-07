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

// ---- 7. A CHORD NOW LASTS ----
for(const bars of [1,2,4]){
  const held=await p.evaluate(async(n)=>{
    S.chordBars=n;_autoHold=0;
    const seen=[];let last=null,run=0;const runs=[];
    for(let bar=0;bar<64;bar++){
      advanceHarmony(bar);
      if(curRootDeg===last)run++;else{if(last!==null)runs.push(run);run=1;last=curRootDeg;}
    }
    runs.push(run);
    return runs.slice(1,-1);   // drop the partial first/last
  },bars);
  const avg=held.length?held.reduce((a,c)=>a+c,0)/held.length:0;
  ok(Math.abs(avg-bars)<0.6||held.every(x=>x%bars===0),
    'a chord set to '+bars+' bar(s) actually lasts about that long (average run '+avg.toFixed(2)+' bars)');
}

ok(errs.length===0,'no page errors ('+errs.length+')'+(errs.length?' :: '+errs[0]:''));
await b.close();
console.log('\n'+(FAIL.length?'FAILED '+FAIL.length+':\n - '+FAIL.join('\n - '):'the band improvises, in character, and listens to the bass'));
process.exit(FAIL.length?1:0);
})();

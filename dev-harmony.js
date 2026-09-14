// ============================================================================================
//  HARMONY IN MOTION — the test dev-chordtest could not have caught.
//  chordtest drives advanceHarmony() in a tight loop. That proves the BRAIN advances, but with no
//  balls bouncing the note histogram stays empty, so it silently exercises the FALLBACK path (a fixed
//  progression) and never the melody-following roulette the app actually uses. It also never watched
//  the KEY move at all — the key journey fired every 64 bars, which at the default 80 BPM is 3.2
//  MINUTES, so "it stays in one chord and one scale forever" was a true report of a working feature
//  scheduled past anyone's patience.
//  This test therefore runs the REAL loop, with slime auto-play on, and asserts:
//    * the chord actually varies bar to bar
//    * the follower is LISTENING (histogram fed by real ball hits), not on the fallback loop
//    * the key genuinely travels, within the advertised number of bars
//    * every key move is a circle-of-fifths neighbour (+-7 semitones), never a random jump
//    * a hand-played chord steers the harmony
//    * locking the key stops the journey, and the lock can be released
//  Run: node dev-harmony.js        (needs a server on :8765 serving this folder)
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html';

(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
 const open=async(mode)=>{const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();
   const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message.slice(0,80))});
   await p.goto(URL);await p.waitForTimeout(500);
   await p.click(`.modeCard[data-m="${mode}"]`);await p.waitForTimeout(2000);
   return {ctx,p,errs};};

 for(const mode of ['play','studio']){
  const L='['+mode+'] ';
  const {ctx,p,errs}=await open(mode);
  ok(await p.evaluate(()=>S.slimeMode),L+'slime auto-play is on by default');

  // ---- 1. a LIVE session: chords must move, and the follower must be listening ----
  await p.evaluate(()=>{S.bpm=240;});          // 1 bar = 1s, so 30s buys us 30 bars
  const live=await p.evaluate(async()=>{
    const log=[];
    for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,1000));
      let tot=0;const n=scaleObj().c.length;for(let k=0;k<n;k++)tot+=noteHisto[k];
      log.push({chord:curRootDeg,histo:tot,balls:balls.length});}
    return log;});
  const chords=[...new Set(live.map(x=>x.chord))];
  ok(chords.length>=3,L+'the chord genuinely moves in a live session ('+chords.length+' distinct over 30 bars: '+chords.join(',')+')');
  // the fallback threshold is 1.2; anything at or above it means the melody-following roulette is the
  // path actually being taken. Studio idles near 2.7, which is why the old bar of 3 kept tripping.
  const minH=Math.min(...live.map(x=>x.histo));
  ok(minH>=1.2,L+'the follower is LISTENING to the melody, never dropping onto the fallback loop (histogram min '+minH.toFixed(1)+', threshold 1.2)');
  ok(Math.min(...live.map(x=>x.balls))>0,L+'balls are actually bouncing (that is what feeds it)');
  // a fixed 4-bar loop is the signature of the fallback path — catch it explicitly
  const seq=live.map(x=>x.chord);
  let looped=true;for(let i=4;i<seq.length;i++)if(seq[i]!==seq[i%4]){looped=false;break;}
  ok(!looped,L+'the progression is not a fixed 4-bar loop repeating forever');

  // ---- 2. the KEY must travel, and travel by fifths ----
  const journey=await p.evaluate(()=>{
    const want=_keyJourneyBars();
    const roots=[S.root];_slimeBars=0;
    // drive whole bars through the real brain; 6 journeys' worth
    for(let i=0;i<want*6;i++){advanceHarmony(i);if(S.root!==roots[roots.length-1])roots.push(S.root);}
    return {want,roots,pinned:_keyPinned};});
  ok(journey.roots.length>=4,L+'the key travels ('+(journey.roots.length-1)+' moves over '+(journey.want*6)+' bars, expected ~6)');
  const steps=[];for(let i=1;i<journey.roots.length;i++){
    let d=Math.abs(journey.roots[i]-journey.roots[i-1])%12;d=Math.min(d,12-d);steps.push(d);}
  ok(steps.length>0&&steps.every(d=>d===5||d===7),
     L+'every key move is a circle-of-fifths neighbour, never a random jump (semitone steps: '+steps.join(',')+')');
  ok(journey.want>=16&&journey.want<=64,L+'the journey interval is sane ('+journey.want+' bars)');

  // and in WALL-CLOCK terms it has to be something a human will actually witness
  const secs=await p.evaluate(()=>{let sec=4*60/(S.bpm||80);try{sec=drumBar()*drumStepDur();}catch(e){}
    return {sec,bars:_keyJourneyBars()};});
  const wall=secs.sec*secs.bars;
  ok(wall<=140,L+'a key move lands within ~2 minutes at this tempo ('+wall.toFixed(0)+'s) — the old flat 64 bars was 192s at 80bpm');

  // ---- 3. THE LOCK: stops the journey, and can be released ----
  const lock=await p.evaluate(()=>{
    _keyPinned=false;_slimeBars=0;
    const start=S.root;
    _keyPinned=true;                              // as if the user picked a key by hand
    for(let i=0;i<_keyJourneyBars()*3;i++)advanceHarmony(i);
    const held=S.root;
    paintChordChip();
    const shows=document.body.classList.contains('keyPinned');
    document.getElementById('hdrChord').click();  // tap the chip to release
    const released=!_keyPinned;
    for(let i=0;i<_keyJourneyBars()*3;i++)advanceHarmony(i);
    return {start,held,shows,released,after:S.root};});
  ok(lock.held===lock.start,L+'locking the key actually holds it ('+lock.start+' -> '+lock.held+')');
  ok(lock.shows,L+'and the app SHOWS it is locked, instead of just going quiet');
  ok(lock.released,L+'tapping the chord chip releases the lock');
  ok(lock.after!==lock.held,L+'after release the key travels again ('+lock.held+' -> '+lock.after+')');

  // ---- 4. the CHORD FOLLOWER still steers from hand-played notes ----
  if(mode==='studio'){
    const f=await p.evaluate(()=>{
      S.slimeMode=true;manualNotes.length=0;
      [0,4,7].forEach(iv=>noteManual((snapToScale(S.root+5+iv)-S.root)*100)); // an F chord
      const want=manualRoot();advanceHarmony(0);const got=curRootDeg;
      manualNotes.length=0;return {want,got};});
    ok(f.got===f.want,L+'a hand-played chord steers the harmony even with slime on (root '+f.got+' == played '+f.want+')');}

  ok(errs.length===0,L+'no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}

 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'harmony moves: chords, keys and the follower all live'));
 process.exit(FAIL.length?1:0);})();

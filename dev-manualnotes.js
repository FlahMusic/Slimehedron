// ============================================================================================
//  MANUAL NOTE INPUT TEST — keyboard / MIDI -> wall, and the chord follower.
//  Guards three bugs that made hand-played notes look like random balls hitting random walls:
//    * noteFlash lit edges[midi % wallCount] (the MIDI NUMBER modulo the wall count)
//    * shootBall fired at an angle from the degree, hitting whatever wall lay that way
//    * octaves of the same note struck different walls
//  Run: node dev-manualnotes.js
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
 for(const mode of ['play','studio']){
  console.log('\n== '+mode+' ==');
  const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message)});
  await p.goto('file://'+process.cwd()+'/index.html');await p.waitForTimeout(500);
  await p.click(`.modeCard[data-m="${mode}"]`);await p.waitForTimeout(1800);

  // 1. SCALE LOCK ON: every chromatic note must land on a wall whose pitch class matches the SNAPPED note
  const snap=await p.evaluate(()=>{
    S.scaleLock=true;S.scale='major';S.octs=2;S.shape='6';rebuild();
    const bad=[];
    for(let m=S.root-12;m<=S.root+24;m++){
      const snapped=snapToScale(m);
      const cents=(snapped-S.root)*100;
      const i=wallForPitch(cents);
      if(i<0){bad.push('midi '+m+' -> no wall');continue;}
      // Compare like for like: a wall's cents are RELATIVE TO THE ROOT, so turn them back into an
      // absolute pitch class before comparing with the played note. (Comparing a wall's root-relative
      // class against the note's absolute class is what made this test cry wolf.)
      const abspc=e=>(((S.root+Math.round(e.cents/100))%12)+12)%12;
      const wpc=abspc(edges[i]), npc=((snapped%12)+12)%12;
      // Contract: IF a wall of that pitch class exists, it must be the one chosen. A shape can carry
      // fewer walls than the scale has notes (a hexagon over 14 degrees), and then the note has no wall
      // of its own and legitimately borrows the nearest pitch class instead.
      const exists=edges.some(e=>abspc(e)===npc);
      if(exists&&wpc!==npc)bad.push('midi '+m+' -> wall pc '+wpc+' != '+npc+' (a '+npc+' wall EXISTS)');
    }
    return bad;});
  ok(snap.length===0,'scale lock: a note lands on its OWN pitch-class wall whenever one exists'+(snap.length?' ('+snap.length+' bad, e.g. '+snap[0]+')':''));

  // 2. OCTAVE EQUIVALENCE: the same note in different octaves must strike the same wall where one exists
  const oct=await p.evaluate(()=>{
    S.scaleLock=true;S.scale='major';S.octs=1;S.shape='6';rebuild();
    const out=[];
    for(let semi=0;semi<12;semi++){
      const hits=[-12,0,12,24].map(o=>{
        const m=snapToScale(S.root+semi+o);
        return wallForPitch((m-S.root)*100);});
      const uniq=new Set(hits.filter(x=>x>=0));
      out.push({semi,hits,same:uniq.size===1});}
    return out;});
  const bad=oct.filter(o=>!o.same);
  ok(bad.length===0,'octave equivalence: 4 octaves of each note hit ONE wall'+(bad.length?' (failed for '+bad.length+'/12 notes)':' (12/12)'));

  // 3. the flash must light the wall that owns the note, not an arbitrary index
  const fl=await p.evaluate(()=>{
    S.scaleLock=true;S.scale='major';S.octs=2;S.shape='7';rebuild();
    const bad=[];
    for(let m=S.root;m<S.root+24;m++){
      const sn=snapToScale(m),cents=(sn-S.root)*100;
      edges.forEach(e=>e.flash=0);
      noteFlash(sn);
      const lit=edges.findIndex(e=>e.flash>0.5);
      const want=wallForPitch(cents);
      if(lit!==want)bad.push('midi '+sn+' lit '+lit+' want '+want);}
    return bad;});
  ok(fl.length===0,'noteFlash lights the wall that owns the pitch'+(fl.length?' ('+fl.length+' wrong, e.g. '+fl[0]+')':''));

  // 4. the ball must actually STRIKE that wall
  const strike=await p.evaluate(async()=>{
    S.scaleLock=true;S.scale='major';S.octs=1;S.shape='6';S.slimeMode=false;rebuild();
    balls.length=0;
    const cents=(snapToScale(S.root+4)-S.root)*100;   // a major 3rd
    const want=wallForPitch(cents);
    shootBall(cents);
    const bl=balls[balls.length-1];
    if(!bl)return {err:'no ball'};
    // walk the ball forward and see which wall it reaches first
    let hit=-1;
    for(let step=0;step<400&&hit<0;step++){
      bl.x+=bl.vx*0.35;bl.y+=bl.vy*0.35;
      for(let i=0;i<edges.length;i++){const e=edges[i];
        const d=(bl.x-e.ax)*e.nx+(bl.y-e.ay)*e.ny;
        if(d<8){const ex=e.bx-e.ax,ey=e.by-e.ay,L2=ex*ex+ey*ey||1;
          const t=((bl.x-e.ax)*ex+(bl.y-e.ay)*ey)/L2;
          if(t>=0&&t<=1){hit=i;break;}}}}
    balls.length=0;
    return {want,hit};});
  ok(strike.hit===strike.want,'the ball strikes the wall that owns the note (hit '+strike.hit+', wanted '+strike.want+')');

  // 5. CHROMATIC / scale lock OFF must still be allowed and still sound the true pitch
  const chrom=await p.evaluate(()=>{
    S.scaleLock=false;S.scale='major';S.octs=1;S.shape='6';rebuild();
    const out=[];
    for(let m=S.root;m<S.root+12;m++){
      const kept=snapToScale(m);                    // lock off => unchanged
      const i=wallForPitch((kept-S.root)*100);
      out.push({m,kept,wall:i});}
    S.scaleLock=true;
    return {unchanged:out.every(o=>o.kept===o.m), allPlaced:out.every(o=>o.wall>=0), n:out.length};});
  ok(chrom.unchanged,'scale lock OFF passes every chromatic note through untouched ('+chrom.n+' notes)');
  ok(chrom.allPlaced,'a chromatic note with no wall of its own still borrows the nearest wall');

  // 6. CHORD FOLLOWER still reads hand-played notes
  const follow=await p.evaluate(async()=>{
    S.scaleLock=true;S.scale='major';S.octs=2;S.shape='6';rebuild();
    manualNotes.length=0;
    [0,4,7].forEach(iv=>noteManual((snapToScale(S.root+9+iv)-S.root)*100));   // an A minor-ish triad
    const active=manualActive(), root=manualRoot();
    const pcs=manualNotes.map(x=>x.pc);
    manualNotes.length=0;
    return {active,root,pcs,stale:manualActive()};});
  ok(follow.active,'manualActive() sees hand-played notes');
  ok(follow.root!=null,'manualRoot() resolves a chord root from them (deg '+follow.root+', pcs '+follow.pcs.join(',')+')');
  ok(!follow.stale,'clearing the buffer clears the follower');

  // 7. and the harmony brain actually USES it in studio
  if(mode==='studio'){
    const drive=await p.evaluate(async()=>{
      S.slimeMode=false;manualNotes.length=0;
      [0,4,7].forEach(iv=>noteManual((snapToScale(S.root+5+iv)-S.root)*100));  // an F chord
      const want=manualRoot();
      advanceHarmony(0);
      const got=curRootDeg;
      manualNotes.length=0;
      return {want,got};});
    ok(drive.got===drive.want,'a played chord steers the harmony brain (root '+drive.got+' == played '+drive.want+')');
  }
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'manual note input is sane'));
 await b.close();process.exit(FAIL.length?1:0);})();

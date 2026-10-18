// ============================================================================================
//  HARMONY REGRESSION TEST — guards the invariant that broke once and was game-breaking:
//  the chord progression is WORLD STATE and must advance every bar whether or not the band
//  is audible, and a user-entered custom progression must be followed in studio, and ignored in play mode.
//  Run:  node dev-chordtest.js      (expects index.html beside it)
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];
const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m); if(!c)FAIL.push(m);};
const sample=(p,ms)=>p.evaluate(async n=>{const o=[];for(let i=0;i<n;i++){o.push(curRootDeg);await new Promise(r=>setTimeout(r,500));}return o;},ms);
(async()=>{const b=await require('./browser').launch();   // the shared launcher: finds Chrome anywhere, and keeps the 3D tank on the canvas renderer here
 for(const [tag,w,h,mode] of [['phone/play',390,844,'play'],['desktop/studio',1440,900,'studio']]){
  console.log('\n== '+tag+' ==');
  const ctx=await b.newContext({viewport:{width:w,height:h}});const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message);});
  await p.goto('file://'+process.cwd()+'/index.html');await p.waitForTimeout(500);
  await p.click(`.modeCard[data-m="${mode}"]`);await p.waitForTimeout(1500);
  // TRANSPORT. Neither mode starts playing on its own any more (studio waits for play, play waits for
  // the child's first touch), and the conductor that runs the harmony only ticks while drums or band
  // are on. This suite used to sample a stopped clock and fail on every run.
  await p.evaluate(()=>{if(!S.playing)setPlaying(true);if(!drumOn)$("drumBtn").click();});await p.waitForTimeout(300);

  // 1. THE BUG: band muted must NOT freeze the harmony
  await p.evaluate(()=>{bandOn=false;});
  const muted=await sample(p,26);
  ok(new Set(muted).size>1, 'chord advances with the band MUTED (saw '+new Set(muted).size+' distinct roots)');

  // 2. the wheel hub must show a chord that actually changes
  const hubs=await p.evaluate(async()=>{const o=[];for(let i=0;i<26;i++){const e=document.getElementById('cofHub');o.push(e?e.textContent:null);await new Promise(r=>setTimeout(r,500));}return o;});
  ok(new Set(hubs.filter(Boolean)).size>1, 'circle-of-fifths hub text changes with the chord (saw '+new Set(hubs.filter(Boolean)).size+' distinct)');

  // 2b. THE HEADER CHORD CHIP is the only chord readout play mode has left (the wheel is studio-only
  //     and the floating pill is retired), so it gets the same guard: it must be VISIBLE and it must MOVE.
  const chipVis=await p.evaluate(()=>{const e=document.getElementById('hdrChord');
    if(!e)return 'missing';const r=e.getBoundingClientRect();
    return (getComputedStyle(e).display!=='none'&&r.width>8&&r.top>=0&&r.bottom<=innerHeight)?'ok':'hidden/offscreen';});
  ok(chipVis==='ok','header chord chip is on screen ('+chipVis+')');
  const chips=await p.evaluate(async()=>{const o=[];for(let i=0;i<26;i++){const e=document.getElementById('hcName');o.push(e?e.textContent:null);await new Promise(r=>setTimeout(r,500));}return o;});
  ok(new Set(chips.filter(Boolean)).size>1,'header chord chip text changes with the chord (saw '+new Set(chips.filter(Boolean)).size+' distinct)');
  ok(chips.filter(x=>x&&x!=='-').length>20,'header chord chip is never stuck on the placeholder');

  // 3. a custom progression must be followed, band still muted
  const prog=await p.evaluate(async()=>{
    CHORD_MODE.on=true;CHORD_MODE.idx=0;CHORD_MODE.barsLeft=0;
    CHORD_MODE.prog=[{pc:0,qual:'maj',bars:1},{pc:5,qual:'maj',bars:1},{pc:7,qual:'maj',bars:1},{pc:9,qual:'min',bars:1}];
    bandOn=false;
    const bpm0=S.bpm;setBpm(200);                    // fast, so 16s holds enough chord CHANGES to judge
    const seen=[];for(let i=0;i<40;i++){seen.push(curRootDeg);await new Promise(r=>setTimeout(r,400));}
    const want=CHORD_MODE.prog.map(c=>pcToNearestDeg(c.pc));
    CHORD_MODE.on=false;CHORD_MODE.prog=[];setBpm(bpm0);
    // how many chord changes went exactly where the saved progression says they go next
    const ch=seen.filter((d,i)=>i===0||d!==seen[i-1]);let hit=0;
    for(let i=1;i<ch.length;i++){const at=want.indexOf(ch[i-1]);if(at>=0&&want[(at+1)%want.length]===ch[i])hit++;}
    return {seen:[...new Set(seen)].sort((a,b)=>a-b),want:[...new Set(want)].sort((a,b)=>a-b),moves:ch.length-1,hit};});
  const covered=prog.want.filter(d=>prog.seen.includes(d)).length;
  if(mode==='play'){
    // PLAY MODE IGNORES A SAVED PROGRESSION, on purpose (2026-10-14). It has no chord panel to show or
    // switch one off, so a single dice roll in Tools used to lock play mode onto four chords for good.
    ok(prog.moves>=4&&prog.hit/prog.moves<0.75,
       'play mode does NOT follow a saved custom progression ('+prog.hit+' of '+prog.moves+' chord changes went where it says)');
  }else
  ok(covered>=Math.min(3,prog.want.length), 'custom progression is followed with the band MUTED ('+covered+'/'+prog.want.length+' of its chords seen; got '+JSON.stringify(prog.seen)+')');

  // 4. and it still works with the band audible
  await p.evaluate(()=>{bandOn=true;});
  const loud=await sample(p,20);
  ok(new Set(loud).size>1, 'chord still advances with the band ON (saw '+new Set(loud).size+' distinct roots)');
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'all harmony checks passed'));
 process.exit(FAIL.length?1:0);})();

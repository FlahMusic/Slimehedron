// ============================================================================================
//  PLAYABILITY TEST — the one I did not have, and the reason lesson 1 shipped broken.
//  Every other suite asks "does the lesson RUN": does it speak, does it end, does it build walls.
//  All of that was green on a lesson that dropped a new ball every beat, never removed one, and
//  put the only tap target in a chip the size of a word. This suite asks the other question:
//  IS IT POSSIBLE TO DO?
//    * how many things are sounding at once
//    * is the tempo fixed, or whatever the app was last left on
//    * how big is the thing the child has to hit
//    * does the screen hold still
//  Needs a local server: python3 -m http.server 8765
//  Run: node dev-playable.js
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};

(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
 const go=async(w,h,unit)=>{
   const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:true,isMobile:w<600});
   const p=await ctx.newPage();
   await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1')}catch(e){}});
   await p.goto('http://127.0.0.1:8765/index.html?m=learn');await p.waitForTimeout(1400);
   await p.evaluate(id=>LEARN2.UNITS.find(u=>u.id===id).run(),unit);
   await p.waitForTimeout(1500);
   return {ctx,p};};

 // ---- LESSON 1: A PULSE YOU CAN ACTUALLY FIND ----
 {const {ctx,p}=await go(393,852,'pulse');
  // 1. THE SCREEN IS THE LESSON. No note tank, no solfege keybed, no app chrome.
  const clean=await p.evaluate(()=>{const hid=s=>{const e=document.querySelector(s);
      return !e||getComputedStyle(e).display==='none';};
    return {stage:!!document.querySelector('.lgStage'),tank:hid('#stage'),keys:hid('#labKeys'),
            hdr:hid('header'),back:hid('#exitMode'),
            balls:(typeof balls!=='undefined'&&balls)?balls.length:0};});
  ok(clean.stage,'[beat] the lesson owns the whole screen');
  ok(clean.tank&&clean.keys,'[beat] no note tank and no keybed — this lesson has no pitch in it');
  ok(clean.hdr&&clean.back,'[beat] and no leftover app chrome');
  ok(clean.balls===0,'[beat] nothing is loose in the tank ('+clean.balls+')');

  // 2. TEMPO IN THE CHILD'S OWN BAND. Spontaneous motor tempo at this age is 400-500ms between taps,
  //    i.e. 120-150 BPM -- FASTER than an adult's. Untrained synchronisation falls apart once the gap
  //    passes a second, so "slow it down to make it easier" is backwards here.
  const bpm=await p.evaluate(()=>S.bpm);
  ok(bpm>=110&&bpm<=150,'[beat] the tempo sits in a child\'s own tempo band ('+bpm+' BPM)');

  // 3. THE CUE MOVES, AND IT MOVES UNDER GRAVITY. A flash is the wrong cue: visual synchronisation to
  //    a stationary flash needs ~460ms between flashes to work at all. Sample the ball's position and
  //    check the motion ACCELERATES -- later thirds of the drop must cover more ground than earlier.
  const track=await p.evaluate(()=>new Promise(res=>{
    const out=[];const t0=performance.now();
    // sample EVERY ball each frame: they are appended, so querySelector always returned the OLDEST
    // one and the newest ball's first, slowest moments were never recorded.
    (function poll(){document.querySelectorAll('.lgBall').forEach(b=>{
        const m=/translateY\(([-\d.]+)px\)/.exec(b.style.transform||'');
        if(m)out.push({t:performance.now()-t0,y:+m[1],n:b.dataset.n});});
      if(performance.now()-t0<2600)requestAnimationFrame(poll);else res(out);})();}));
  ok(track.length>30,'[beat] there is a moving cue at all ('+track.length+' samples)');
  // pick a ball caught from the TOP of its drop: a ball already halfway down when sampling started
  // shows only the fast end of the curve, and the ratio then looks flat for the wrong reason.
  const byBall={}; track.forEach(x=>{(byBall[x.n]=byBall[x.n]||[]).push(x);});
  const runs=Object.values(byBall).filter(r=>r.length>9&&r[0].y<12).sort((a,b)=>b.length-a.length);
  const run=runs[0]||[];
  let accel=null;
  if(run.length>9){
    const third=Math.floor(run.length/3);
    const d1=run[third].y-run[0].y, d3=run[run.length-1].y-run[run.length-1-third].y;
    // constant acceleration from rest covers 1/9 of the drop in the first third and 5/9 in the last:
    // a ratio of 5. Anything under about 3 is not a falling object.
    accel=(d3>d1*3);
    ok(accel,'[beat] and it ACCELERATES like a falling object ('+d1.toFixed(0)+'px then '+d3.toFixed(0)+'px, x'+(d3/Math.max(1,d1)).toFixed(1)+')');
  } else ok(false,'[beat] could not follow one ball through its drop');

  // 4. TWO BEATS OF LEAD. Reacting to a beat is physically too late (visual RT ~200-250ms is a third
  //    of a beat at 120 BPM), so the cue has to be visible well before it lands.
  const inAir=await p.evaluate(()=>document.querySelectorAll('.lgBall').length);
  ok(inAir>=2,'[beat] more than one beat is visible ahead, so the beat can be anticipated ('+inAir+' in the air)');

  // 5. THE TARGET IS FIXED AND BIG. Tapping a MOVING target succeeds 37% of the time at ages 4-6.
  const pad=await p.evaluate(()=>{const e=document.getElementById('lgPad');if(!e)return null;
    const r=e.getBoundingClientRect();return{w:Math.round(r.width),h:Math.round(r.height),
      on:r.top>=0&&r.bottom<=innerHeight+1};});
  ok(!!pad,'[beat] there is a hit pad');
  if(pad){ok(Math.min(pad.w,pad.h)>=96,'[beat] and it is big — '+pad.w+'x'+pad.h+'px');
          ok(pad.on,'[beat] and fully on screen');}

  // 6. THE WINDOW ACTUALLY WORKS. This is the assertion that matters: a tap ON the beat is credited,
  //    and a tap half a beat away is not. Without this, "it runs" tells you nothing.
  const onBeat=await p.evaluate(async()=>{
    const P=window._labBeatP||0.5; let scored=0;
    for(let i=0;i<4;i++){
      const wait=Math.max(0,(window._labNextBeat-AC.currentTime)*1000);
      await new Promise(r=>setTimeout(r,wait));
      window._lab_tap();
      await new Promise(r=>setTimeout(r,P*1000*0.2));}
    return +(document.querySelector('.lgCount')||{textContent:'0'}).textContent.split('/')[0].trim();});
  ok(onBeat>=3,'[beat] tapping ON the beat is credited ('+onBeat+' of 4)');
  const offBeat=await p.evaluate(async()=>{
    const P=window._labBeatP||0.5;
    for(let i=0;i<3;i++){
      const wait=Math.max(0,(window._labNextBeat-AC.currentTime)*1000)+P*500; // dead between two beats
      await new Promise(r=>setTimeout(r,wait));
      window._lab_tap();}
    return +(document.querySelector('.lgCount')||{textContent:'0'}).textContent.split('/')[0].trim();});
  ok(offBeat===0,'[beat] and tapping BETWEEN beats is not ('+offBeat+' credited)');

  // 7. one short instruction, narrated
  const words=await p.evaluate(()=>(document.querySelector('.lgSay')||{textContent:''}).textContent.trim().split(/\s+/).length);
  ok(words>0&&words<=10,'[beat] the instruction is one short line ('+words+' words)');
  await ctx.close();}

 // ---- EVERY PITCH LESSON: ONE THING IS ASKED AT A TIME ----
 for(const id of ['high','notes','majorscale','modes']){
   const {ctx,p}=await go(393,852,id);
   const r=await p.evaluate(()=>{
     const n=(typeof balls!=='undefined'&&balls)?balls.length:0;
     const card=document.querySelector('#learnOverlay .lCard');
     const tappable=[...document.querySelectorAll('#learnOverlay button,.lgRung,.lk')].filter(e=>{
       const q=e.getBoundingClientRect();return q.width>1&&getComputedStyle(e).display!=='none';});
     const small=tappable.filter(e=>{const q=e.getBoundingClientRect();return Math.min(q.width,q.height)<44;});
     return {balls:n,keys:document.querySelectorAll('#labKeys .lk,.lgRung').length,
             small:small.map(e=>(e.id||e.className)+' '+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height)),
             words:((document.querySelector('.lgStage')||card||{innerText:''}).innerText||'').trim().split(/\s+/).length};});
   ok(r.balls<=2,'['+id+'] at most a couple of balls in play, not a shower ('+r.balls+')');
   ok(r.keys>=2,'['+id+'] the child has something to answer with ('+r.keys+')');
   ok(r.small.length===0,'['+id+'] nothing the child must hit is under 44px'+(r.small.length?': '+r.small.slice(0,3).join(', '):''));
   ok(r.words<=45,'['+id+'] the card is short enough to read to a child ('+r.words+' words)');
   await ctx.close();}

 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'the lessons are playable, not just runnable'));
 process.exit(FAIL.length?1:0);})();

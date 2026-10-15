// ============================================================================================
//  PHONE TEST — the things Flah hit on his iPhone on 2026-10-14, each checked for whether it
//  WORKS, not whether it runs.
//    1. the volume fader is the master: at 0 the drums and the reverb go silent too
//    2. a press anywhere on a slider moves it (iPhone ignores presses that miss the handle)
//    3. the circle of fifths fits its window and does not sit on its own caption
//    4. chord chips show their names (the remove cross used to cover them)
//    5. the drum machine: all 16 steps per drum, beat numbers, a playhead that moves, no last-step
//    6. play mode ignores a saved custom progression and changes key on its own
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-phone.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html';
const overlap=(a,b)=>!(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom);

(async()=>{const b=await launch();
 const phone=()=>b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});

 // ---- 1. MASTER VOLUME ----
 {const ctx=await phone();const p=await ctx.newPage();
  await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1')}catch(e){}});
  await p.goto(URL+'?m=play');await p.waitForTimeout(1500);
  await p.mouse.click(196,500);await p.waitForTimeout(2500);        // first touch brings in drums + band
  await p.evaluate(()=>{window.__an=AC.createAnalyser();window.__an.fftSize=2048;lim.connect(window.__an);
    window.__peak=async ms=>{const a=new Float32Array(2048);let pk=0;const t0=performance.now();
      while(performance.now()-t0<ms){window.__an.getFloatTimeDomainData(a);for(const v of a)pk=Math.max(pk,Math.abs(v));
        await new Promise(r=>requestAnimationFrame(r));}return pk;};});
  const loud=await p.evaluate(()=>window.__peak(3000));
  await p.evaluate(()=>{const v=document.getElementById('volPlay');v.value=0;v.dispatchEvent(new Event('input'));});
  await p.waitForTimeout(1500);
  const quiet=await p.evaluate(()=>window.__peak(3000));
  const drums=await p.evaluate(()=>drumOn);
  ok(loud>0.05,'music is playing before the test (peak '+loud.toFixed(3)+')');
  ok(drums,'the drums are on');
  ok(quiet<0.001,'volume at 0 silences EVERYTHING, drums and echoes included (peak '+quiet.toFixed(4)+')');
  await ctx.close();}

 // ---- 2-5. TOOLS ON A PHONE ----
 {const ctx=await phone();const p=await ctx.newPage();
  await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1')}catch(e){}});
  const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message);});
  await p.goto(URL);await p.waitForTimeout(1200);
  await p.tap('#toolsCard');await p.waitForTimeout(2200);
  const pick=k=>p.evaluate(k=>document.querySelector('[data-tool="'+k+'"]').click(),k);
  const back=()=>p.evaluate(()=>document.querySelector('[data-tw="back"]').click());

  // 3. circle of fifths
  await pick('cof');await p.waitForTimeout(600);
  const cof=await p.evaluate(()=>{const c=document.querySelector('#toolsOv .twCard').getBoundingClientRect(),
    w=document.querySelector('#toolsOv #cofSvg').getBoundingClientRect(),n=document.querySelector('#toolsOv .twNote').getBoundingClientRect(),
    card=document.querySelector('#toolsOv .twCard');
    return {c:{left:c.left,right:c.right,top:c.top,bottom:c.bottom},w:{left:w.left,right:w.right,top:w.top,bottom:w.bottom,width:w.width},
            n:{left:n.left,right:n.right,top:n.top,bottom:n.bottom},hscroll:card.scrollWidth-card.clientWidth};});
  ok(cof.w.left>=cof.c.left&&cof.w.right<=cof.c.right,'the wheel fits inside its window');
  ok(!overlap(cof.w,cof.n),'the wheel does not sit on its caption');
  ok(cof.hscroll<=1,'the window has no sideways scroll ('+cof.hscroll+'px)');
  ok(cof.w.width>=200,'the wheel is big enough to read ('+Math.round(cof.w.width)+'px)');
  await back();await p.waitForTimeout(300);

  // 4. chord chips + 2. touch slider
  await pick('chord');await p.waitForTimeout(500);
  await p.tap('#cpDice');await p.waitForTimeout(400);
  const chips=await p.evaluate(()=>[...document.querySelectorAll('.cpChip')].map(c=>{
    const n=c.querySelector('.cpNm').getBoundingClientRect(),x=c.querySelector('.cpX').getBoundingClientRect();
    return {txt:c.querySelector('.cpNm').textContent,ov:!(x.left>=n.right||x.right<=n.left||x.top>=n.bottom||x.bottom<=n.top),xw:x.width,xh:x.height};}));
  ok(chips.length>=3,'the dice made a progression ('+chips.map(c=>c.txt).join(' ')+')');
  ok(chips.every(c=>!c.ov),'no remove cross covers a chord name');
  ok(chips.every(c=>c.xw>=24&&c.xh>=24),'every remove cross is at least 24px to tap');
  const r=await p.evaluate(()=>{const e=document.getElementById('twTempo').getBoundingClientRect();return {x:e.x,y:e.y,w:e.width,h:e.height};});
  await p.touchscreen.tap(r.x+r.w*0.8,r.y+r.h/2);await p.waitForTimeout(200);
  const t80=await p.evaluate(()=>+document.getElementById('twTempo').value);
  await p.touchscreen.tap(r.x+r.w*0.2,r.y+r.h/2);await p.waitForTimeout(200);
  const t20=await p.evaluate(()=>+document.getElementById('twTempo').value);
  ok(t80>=160&&t80<=180,'a tap at 80% of the tempo bar sets about 80% of the range ('+t80+')');
  ok(t20>=60&&t20<=80,'a tap at 20% sets about 20% ('+t20+')');
  ok(await p.evaluate(v=>Math.round(S.bpm)===v,t20),'and the app tempo followed the slider');
  await back();await p.waitForTimeout(300);

  // 5. drum machine
  await pick('drums');await p.waitForTimeout(500);
  const g=await p.evaluate(()=>{const per={};document.querySelectorAll('#toolsOv .sgCell').forEach(c=>{(per[c.dataset.v]=per[c.dataset.v]||new Set()).add(c.dataset.i);});
    const ticks=[...document.querySelectorAll('#toolsOv .sgRuler .sgTick')].slice(0,16).map(i=>{const s=i.querySelector('span');return s?s.textContent:'';}).filter(Boolean);
    const cells=[...document.querySelectorAll('#toolsOv .sgCell')].map(c=>c.getBoundingClientRect());
    const rows=[...document.querySelectorAll('#toolsOv .sgRow')].map(r=>{const tops=new Set([...r.querySelectorAll('.sgCell')].map(c=>Math.round(c.getBoundingClientRect().top)));return {v:r.dataset.v,lines:tops.size};});
    const sc=document.querySelector('#toolsOv .sgScroll');
    return {per:Object.values(per).map(s=>s.size),bars:kitBars(),nums:ticks,minW:Math.min(...cells.map(c=>c.width)),rows,
            scrolls:sc.scrollWidth>sc.clientWidth,
            last:!!document.getElementById('sgLastR'),past:document.querySelectorAll('.sgCell.past').length};});
  ok(g.per.length>=10&&g.per.every(n=>n===16*g.bars),'every drum shows every step of its '+g.bars+'-bar pattern ('+g.per.length+' drums)');
  ok(['K','s','h','o','y','x','ht','lt','cl','r'].every(v=>g.rows.some(r=>r.v===v)),'the kit has kick, snare, side stick, closed + open hat, ride, crash, two toms and clave');
  ok(g.rows.every(r=>r.lines===1),'each drum is ONE row; the steps never wrap onto a second line');
  ok(g.scrolls,'a pattern wider than the phone scrolls sideways');
  ok(g.nums.join('')==='1234','the ruler counts 1 2 3 4 once, over the beats ('+g.nums.join(' ')+')');
  ok(g.minW>=24,'every step is at least 24px wide ('+g.minW.toFixed(1)+')');
  ok(!g.last&&g.past===0,'no last-step slider and no greyed-out steps');
  await p.evaluate(()=>{if(!S.playing)setPlaying(true);});await p.waitForTimeout(1200);
  const seen=new Set();for(let k=0;k<24;k++){seen.add(await p.evaluate(()=>{const c=document.querySelector('#toolsOv .sgCell.now');return c?c.dataset.i:'none';}));await p.waitForTimeout(80);}
  seen.delete('none');
  ok(seen.size>=6,'the playhead moves across the steps ('+seen.size+' different steps lit)');
  // tap a step: it lights AND the scheduler plays it
  const before=await p.evaluate(()=>activeKit().K.includes(2));
  await p.tap('#toolsOv .sgCell[data-v="K"][data-i="2"]');await p.waitForTimeout(150);
  const after=await p.evaluate(()=>({lit:document.querySelector('#toolsOv .sgCell[data-v="K"][data-i="2"]').classList.contains('on'),plays:activeKit().K.includes(2)}));
  ok(after.lit!==before&&after.plays!==before,'tapping a step changes what the drums play');
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}

 // ---- 6. PLAY MODE IGNORES A SAVED PROGRESSION, AND THE KEY MOVES ----
 {const ctx=await phone();const p=await ctx.newPage();
  await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');
    localStorage.setItem('slimehedron-chords',JSON.stringify({on:true,prog:[{pc:9,qual:'m7b5',bars:1},{pc:2,qual:'7',bars:1},{pc:7,qual:'min',bars:1},{pc:7,qual:'min',bars:1}]}));}catch(e){}});
  await p.goto(URL+'?m=play');await p.waitForTimeout(1500);
  await p.mouse.click(196,500);await p.waitForTimeout(800);
  // run the conductor's harmony step directly, bar after bar: the key journey is ~90s of real time
  const res=await p.evaluate(()=>{const roots=new Set(),chords=new Set();
    for(let bar=0;bar<200;bar++){advanceHarmony(bar%4);roots.add(S.root);chords.add(S.root+':'+curRootDeg);}
    return {roots:roots.size,chords:chords.size,cm:cmActive()};});
  ok(!res.cm,'a saved progression is not active in play mode');
  ok(res.roots>=2,'the key changes on its own over 200 bars ('+res.roots+' keys)');
  ok(res.chords>=8,'and the chords are not stuck on a few ('+res.chords+' different)');
  await ctx.close();}

 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'phone pass clean'));
 process.exit(FAIL.length?1:0);})();

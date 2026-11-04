// ============================================================================================
//  PLAY MODE'S FIRST MINUTE (critique ticket 01, Flah 2026-11-03): the slime is on, auto-notes are off, and a bubble
//  says "tap to play notes and spin the shapes". After the first tap it glides to just under the tank and the notes
//  toggle sits there for good (the header's button, moved). Nothing sounds before the first touch.
//    1. a fresh visit: slime on, notes off, the bubble on the middle of the tank, taps pass through it, silent
//    2. the first tap: the bubble goes, the toggle shows just under the tank, big enough, on top of nothing else
//    3. the toggle works: on, off
//    4. a return visit: no bubble, the toggle is already there; studio keeps it in the header
//  Needs a local server: python -m http.server 8765. Run from the project root: node _dev/dev-play.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const BASE='http://127.0.0.1:8765/index.html';
const TOGGLE=()=>{const b=document.getElementById('autoNotesBtn'),r=b.getBoundingClientRect(),c=cv.getBoundingClientRect();
  const top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
  return {slot:b.parentNode&&b.parentNode.id,vis:b.checkVisibility(),w:r.width,h:r.height,x:r.left+r.width/2,y:r.top,
    under:r.top>c.top+c.height*0.6&&r.left>c.left&&r.right<c.right,mine:!!top&&(top===b||b.contains(top)),pressed:b.getAttribute('aria-pressed')};};

(async()=>{const b=await launch();
 for(const [tag,w,h,mob] of [['phone',390,844,true],['desktop',1440,900,false]]){const L='['+tag+'] ';
  const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:mob,hasTouch:mob});
  await ctx.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');}catch(e){}
    window.__rmsMax=0;const AC0=window.AudioContext;window.AudioContext=function(...a){const ac=new AC0(...a);const an=ac.createAnalyser();an.fftSize=2048;
      const g=ac.createGain();const d=ac.destination;Object.defineProperty(ac,'destination',{get:()=>g});g.connect(an);an.connect(d);const buf=new Float32Array(2048);
      setInterval(()=>{an.getFloatTimeDomainData(buf);let s=0;for(const v of buf)s+=v*v;window.__rmsMax=Math.max(window.__rmsMax,Math.sqrt(s/buf.length));},50);return ac;};});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(BASE+'?m=play');await p.waitForTimeout(3500);
  // 1. fresh
  const f=await p.evaluate(()=>{const e=document.getElementById('tapInvite'),c=cv.getBoundingClientRect();if(!e)return {none:true};const r=e.getBoundingClientRect();
    return {slime:S.slimeMode,notes:!!S.autoNotes,on:e.classList.contains('on'),text:e.textContent,pe:getComputedStyle(e).pointerEvents,
      off:Math.hypot(r.left+r.width/2-(c.left+c.width/2),r.top+r.height/2-(c.top+c.height/2)),slotReady:document.getElementById('notesSlot').classList.contains('ready'),rms:window.__rmsMax};});
  ok(f.slime&&!f.notes,L+'a fresh visit: the slime is on, notes are off ('+JSON.stringify({slime:f.slime,notes:f.notes})+')');
  ok(f.on&&f.text==='tap to play notes and spin the shapes',L+'the bubble says "tap to play notes and spin the shapes"');
  ok(f.off<6&&f.pe==='none'&&!f.slotReady,L+'it sits on the middle of the tank ('+(f.off||0).toFixed(1)+' px off), taps pass through, and the toggle waits');
  ok(f.rms<0.002,L+'and nothing sounds before the first touch (peak RMS '+(f.rms||0).toFixed(4)+')');
  // 2. the first tap
  const c=await p.evaluate(()=>{const r=cv.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];});
  if(mob)await p.touchscreen.tap(c[0],c[1]);else await p.mouse.click(c[0],c[1]);
  await p.waitForTimeout(1400);
  const t=await p.evaluate(TOGGLE),gone=await p.evaluate(()=>!document.getElementById('tapInvite'));
  ok(gone,L+'after the first tap the bubble is gone');
  ok(t.slot==='notesSlot'&&t.vis&&t.under,L+'and the notes toggle sits just under the tank ('+JSON.stringify({slot:t.slot,vis:t.vis,under:t.under})+')');
  ok(t.w>=44&&t.h>=44&&t.mine,L+'at least 44x44 ('+t.w.toFixed(0)+'x'+t.h.toFixed(0)+') and nothing covers it');
  // 3. it works
  const on=await p.evaluate(()=>{document.getElementById('autoNotesBtn').click();return {n:!!S.autoNotes,s:S.slimeMode,a:document.getElementById('autoNotesBtn').getAttribute('aria-pressed')};});
  const off=await p.evaluate(()=>{document.getElementById('autoNotesBtn').click();return {n:!!S.autoNotes,a:document.getElementById('autoNotesBtn').getAttribute('aria-pressed')};});
  ok(on.n&&on.s&&on.a==='true'&&!off.n&&off.a==='false',L+'the toggle turns the slime\'s notes on and off ('+JSON.stringify({on,off})+')');
  // 4. a return visit, then studio
  await p.reload();await p.waitForTimeout(3000);
  const r=await p.evaluate(()=>({bubble:!!document.querySelector('#tapInvite'),ready:document.getElementById('notesSlot').classList.contains('ready')}));
  const tr=await p.evaluate(TOGGLE);
  ok(!r.bubble&&r.ready&&tr.vis&&tr.under,L+'a return visit: no bubble, the toggle is already under the tank');
  await p.goto(BASE+'?m=studio');await p.waitForTimeout(2500);
  const s=await p.evaluate(()=>{const b=document.getElementById('autoNotesBtn');return {slot:b.parentNode.id==='notesSlot',bySwitch:b.previousElementSibling&&b.previousElementSibling.id==='slimeBig',vis:b.checkVisibility()};});
  ok(!s.slot&&s.bySwitch&&s.vis,L+'studio keeps it next to the slime switch ('+JSON.stringify(s)+')');
  ok(errs.length===0,L+'no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}
 // 5. THE CHORD COLOUR (critique ticket 02; Flah: "Color = key (hue) + chord type (shade)", never grey). The table: every
 // key and chord type is above the grey line, and two types in one key never share a colour. Then the live slime (the
 // droplets are drawn in it): sampled over 16 bars of play with the band on and off, it never goes grey.
 {const ctx=await b.newContext({viewport:{width:1000,height:900}});await ctx.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-tapped','1');}catch(e){}});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(BASE+'?m=play');await p.waitForTimeout(2500);
  const r=await p.evaluate(()=>{const sat=c=>(Math.max(c[0],c[1],c[2])-Math.min(c[0],c[1],c[2]))/255;   /* chroma: how far from grey (HSL saturation calls a pale wash colourful) */
    const Q=Object.keys(CHORD_SHADE);let minSat=1,sameKeyMin=1e9;
    for(let pc=0;pc<12;pc++){const cs=Q.map(q=>chordColourPQ(pc,q));for(const c of cs)minSat=Math.min(minSat,sat(c));
      for(let i=0;i<cs.length;i++)for(let j=i+1;j<cs.length;j++)sameKeyMin=Math.min(sameKeyMin,Math.hypot(cs[i][0]-cs[j][0],cs[i][1]-cs[j][1],cs[i][2]-cs[j][2]));}
    // the old way, for the record: the three notes' colours averaged
    const old=[0,1,2,3,4,5,6].map(rd=>{const a=[0,0,0];for(const d of [rd,rd+2,rd+4]){const c=degRGB(d);a[0]+=c[0]/3;a[1]+=c[1]/3;a[2]+=c[2]/3;}return sat(a);});
    const real=performance.now.bind(performance);let T=real();performance.now=()=>T;const live=[];
    for(const band of [false,true]){if(band!==bandOn)$("bandBtn").click();for(let i=0;i<16*180;i++){T+=1000/60;update(T);if(i%30===0){liquidColor();live.push(sat(liqRGB));}}}
    performance.now=real;return {minSat,sameKeyMin,oldMin:Math.min(...old),liveMin:Math.min(...live.slice(10))};});
  ok(r.minSat>=0.3&&r.sameKeyMin>=12,'every key and chord type has its own colour, none grey (lowest chroma '+r.minSat.toFixed(2)+'; two types in one key at least '+r.sameKeyMin.toFixed(0)+' apart; the old averaged colours went down to '+r.oldMin.toFixed(2)+')');
  ok(r.liveMin>=0.3,'and the live slime and its droplets never go grey (lowest chroma over 32 bars '+r.liveMin.toFixed(2)+')');
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'play pass clean'));
 process.exit(FAIL.length?1:0);})();

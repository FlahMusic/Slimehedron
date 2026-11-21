// ============================================================================================
//  THE SLIME'S COLOUR FLOWS (Flah 2026-11-21: "a weird jitteriness ... causes the slime to glitch and sperg around
//  when it changes color, it should be a fluid gradual gradient thing that flows effortlessly"). The pool's colour
//  (liqRGB, which the flat goo, the 3D goo and the droplets are drawn in) recorded each time it is made for 22 s with the band
//  on at 140 bpm (chord changes every bar) and a key change in the middle, after the first 1.5 s:
//    1. it never jumps: no frame moves it more than 8 (RGB distance, 0..441, per 60 Hz frame). It was 104 once and
//       13-20 for six frames running at a bar line (2026-11-21)
//    2. it never turns back mid-glide: at most 1 frame where its direction reverses while it moves. It was 18 in 20 s
//    3. it eases: its speed changes by at most 3 from one frame to the next (no lurch from standing to racing)
//    4. it does change: it travels at least 120 in total and visits at least 3 chords (a frozen colour fails 1-3 never)
//  Sabotage: SAB=snap (follows the chord at once), SAB=steps (the old mid-bar blend in drum steps), SAB=freeze.
//  Needs a local server: python -m http.server 8765. Run from the project root: node _dev/dev-goocolour.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const SAB=process.env.SAB||'';
(async()=>{const b=await launch();const p=await (await b.newContext({viewport:{width:1280,height:860}})).newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');localStorage.setItem('slimehedron-tapped','1');}catch(e){}});
 await p.goto('http://127.0.0.1:8765/index.html?m=studio');await p.waitForTimeout(2500);
 const r=await p.evaluate(async([SAB])=>{
  initAudio();if(AC.state==='suspended')await AC.resume();
  setPlaying(true);if(!bandOn)document.getElementById('bandBtn').click();S.bpm=140;
  if(SAB==='snap'){const f=liquidColor;window.liquidColor=function(){liqHSL=null;return f();};}
  if(SAB==='steps'){const f=liquidColor;window.liquidColor=function(){const o=f(),k=(drumStep%drumBar())/drumBar(),a=chordHSL(curRootDeg),c=chordHSL(nextRootDeg==null?curRootDeg:nextRootDeg),m=hslMix(a,c,k),q=hslRGB(m[0],m[1],m[2]);liqRGB[0]=q[0];liqRGB[1]=q[1];liqRGB[2]=q[2];return o;};}
  if(SAB==='freeze'){const f=liquidColor;window.liquidColor=function(){const s=liqRGB.slice(),o=f();liqRGB[0]=s[0];liqRGB[1]=s[1];liqRGB[2]=s[2];return o;};}
  // recorded where the colour is made (each liquidColor call that moves the clock), so the governor's skipped draws
  // and the headless browser's uneven frames are not read as the colour lurching
  const rec=[],t0=performance.now();let keyed=false,lastT=-1;
  const inner=window.liquidColor;window.liquidColor=function(){const o=inner.apply(this,arguments),t=performance.now()-t0;
    if(t>1500&&t-lastT>=4){lastT=t;rec.push([t,liqRGB[0],liqRGB[1],liqRGB[2],curRootDeg+'|'+S.root]);}return o;};
  await new Promise(res=>{const f=()=>{const t=performance.now()-t0;
    if(!keyed&&t>11000){keyed=true;S.root=(S.root||60)+5;}
    if(t<23500)requestAnimationFrame(f);else res();};requestAnimationFrame(f);});
  const sp=[];let travel=0;
  for(let i=1;i<rec.length;i++){const dt=Math.max(1,rec[i][0]-rec[i-1][0]),d=Math.hypot(rec[i][1]-rec[i-1][1],rec[i][2]-rec[i-1][2],rec[i][3]-rec[i-1][3]);travel+=d;sp.push(d/dt*16.67);}
  let rev=0;for(let i=2;i<rec.length;i++){const a=[1,2,3].map(k=>rec[i-1][k]-rec[i-2][k]),c=[1,2,3].map(k=>rec[i][k]-rec[i-1][k]);
    if(a[0]*c[0]+a[1]*c[1]+a[2]*c[2]<0&&Math.hypot(...a)>0.3&&Math.hypot(...c)>0.3)rev++;}
  let jerk=0;for(let i=1;i<sp.length;i++)jerk=Math.max(jerk,Math.abs(sp[i]-sp[i-1]));
  return {frames:rec.length,max:Math.max(...sp),rev,jerk,travel,chords:new Set(rec.map(x=>x[4])).size};},[SAB]);
 ok(r.max<=8,`it never jumps (the largest move in a frame ${r.max.toFixed(1)})`);
 ok(r.rev<=1,`it never turns back mid-glide (${r.rev} reversals in ${r.frames} frames)`);
 ok(r.jerk<=3,`it eases (its speed changes by ${r.jerk.toFixed(1)} at most between frames)`);
 ok(r.travel>=120&&r.chords>=3,`it does change colour (travelled ${r.travel.toFixed(0)}, ${r.chords} chords)`);
 ok(errs.length===0,'no page errors '+errs.slice(0,2).join(' | '));
 await b.close();console.log(FAIL.length?FAIL.length+' FAILURE(S)':'the slime\'s colour flows');process.exit(FAIL.length?1:0);})();

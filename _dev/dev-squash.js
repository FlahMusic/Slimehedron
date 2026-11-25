// ============================================================================================
//  THE SLIMES SQUASH ON THEIR FEET (2026-11-24; research _docs/research/2026-11-23-personality-polish.md 6-7: squash
//  and stretch happen at the contact point, a squash presses into the ground, it never lifts off it). The page slimes'
//  tap squish, cheer and beat bounce scaled round the middle of their box, and their feet are near the bottom of it: on
//  the tap's squash (scale .8 tall) a slime lifted up to 8 px off the ground, on the cheer's stretch it sank ~5 px into
//  it. And the drawings' feet sit anywhere from 80% (blue2) to 98% (orange) down their box, so a tap's face swap (happy
//  -> wow picture) moved the feet (15 px apart across the set). Now every drawing is nudged onto one line (92% down)
//  and squashes round that line.
//  For every mini picture (minis/*.png: its own lowest drawn row, read from its pixels), made by the app's slimeSVG in a
//  real .slime box, every 10 ms through each animation the page's CSS runs on it (bob, squish, cheer, bpop), the foot's
//  place on screen under the live transforms (getComputedStyle: the picture's nudge, the box's transform and origin):
//    1. it never sinks into the ground: at most 1 px below where it stands at rest
//    2. on the ground (no hop: the keyframes' lift under 0.5 px) it stays put: within 2.5 px of rest
//    3. every picture stands on the same line at rest (within 1 px), so swapping faces never moves the feet
//  Measured: before 4.8 px sunk / 8 px off the ground / 14.9 px apart; after 0.0 / 0.5 / 0.1.
//  Sabotage: SAB=centre (origin back to the middle) fails 1 and 2; SAB=push (the squash's old 3 px push down) fails 1;
//  SAB=nofoot (no nudge onto the line) fails 1 and 3.
//  Needs a local server: python -m http.server 8765. Run from the project root: node _dev/dev-squash.js
// ============================================================================================
const {launch}=require('./browser');
const fs=require('fs'),path=require('path');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const SAB=process.env.SAB||'';
const PICS=fs.readdirSync(path.join(__dirname,'..','minis')).filter(f=>/\.png$/.test(f));
(async()=>{const b=await launch();const p=await (await b.newContext({viewport:{width:1280,height:860}})).newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');localStorage.setItem('slimehedron-tapped','1');}catch(e){}});
 await p.goto('http://127.0.0.1:8765/index.html?m=play');await p.waitForTimeout(2000);
 const R=await p.evaluate(async([PICS,SAB])=>{
  if(SAB){const st=document.createElement('style');
    st.textContent=SAB==='centre'?'#sqTest .bob{transform-origin:50% 50%!important}':SAB==='nofoot'?'#sqTest img{transform:none!important}'
      :'@keyframes squish{0%{transform:translateY(0) scale(1,1)}18%{transform:translateY(3px) scale(1.2,.8)}46%{transform:translateY(-11px) scale(.88,1.14)}70%{transform:translateY(0) scale(1.06,.95)}86%{transform:translateY(-3px) scale(.98,1.03)}100%{transform:translateY(0) scale(1,1)}}';
    document.head.appendChild(st);}
  const layer=document.getElementById('slimes')||document.body;
  const out=[],rest=[];
  // the app's own markup for each picture: slimeSVG(family, face) as the page makes it (teal4 is teal2fam's happy)
  const how={};for(const fam of Object.keys(MINI))for(const fr of ['happy','blink','wow'])if(!how[MINI[fam][fr]])how[MINI[fam][fr]]=[fam,fr];
  const markup=f=>{const k=f.replace(/\.png$/,'');if(!how[k])return null;for(let i=0;i<40;i++){const m=slimeSVG(how[k][0],how[k][1]);if(m.indexOf('minis/'+f)>=0)return m;}return null;};
  for(const f of PICS){
   const im=new Image();im.src='minis/'+f;await im.decode();
   const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const x=c.getContext('2d');x.drawImage(im,0,0);
   const d=x.getImageData(0,0,c.width,c.height).data;let foot=0;
   for(let y=c.height-1;y>=0&&!foot;y--)for(let q=0;q<c.width;q++)if(d[(y*c.width+q)*4+3]>40){foot=y+1;break;}
   for(const [cls,name] of [['','bob'],['squish','squish'],['cheer','slimeCheer'],['bpop','beatBounce']]){
    // a fresh slime for each animation, its class from the start (a class swapped on a paused one never applied)
    const el=document.createElement('div');el.id='sqTest';el.className='slime'+(cls?' '+cls:'');el.style.cssText='position:fixed;left:200px;top:200px;z-index:6';
    const mk=markup(f);if(!mk){out.push({f,name,missing:1});continue;}
    el.innerHTML='<div class="bob">'+mk+'</div>';
    layer.appendChild(el);const bob=el.querySelector('.bob'),img=bob.querySelector('img');
    const it=getComputedStyle(img).transform,iy=it==='none'?0:new DOMMatrix(it).f;   // the picture's own nudge onto the line
    const W=bob.offsetWidth,H=bob.offsetHeight,s=Math.min(W/c.width,H/c.height),fy=(H-c.height*s)/2+foot*s+iy,fx=W/2;
    if(!cls)rest.push({f,fy,H});
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const an=bob.getAnimations().find(a=>a.animationName===name);if(!an){out.push({f,name,missing:1});el.remove();continue;}
    an.pause();const dur=an.effect.getComputedTiming().duration;let sink=0,drift=0,n=0;
    for(let t=0;t<=dur;t+=10){an.currentTime=t;const cs=getComputedStyle(bob),m=new DOMMatrix(cs.transform==='none'?undefined:cs.transform);
     const [ox,oy]=cs.transformOrigin.split(' ').map(parseFloat);
     const y=oy+m.b*(fx-ox)+m.d*(fy-oy)+m.f,dy=y-fy;   // the foot's move on screen (+ = down)
     sink=Math.max(sink,dy);if(Math.abs(m.f)<0.5){drift=Math.max(drift,Math.abs(dy));n++;}}
    out.push({f,name,sink,drift,n});el.remove();}}
  return {out,rest};},[PICS,SAB]);
 const rest=R.rest,r=R.out;
 const miss=r.filter(x=>x.missing);
 ok(PICS.length>=20&&miss.length===0,'every picture ('+PICS.length+') runs all four animations'+(miss.length?' (missing: '+miss.slice(0,3).map(x=>x.f+' '+x.name).join(', ')+')':''));
 const live=r.filter(x=>!x.missing),worst=k=>live.reduce((a,x)=>x[k]>a[k]?x:a,live[0]);
 const ws=worst('sink'),wd=worst('drift');
 ok(ws.sink<=1,'1. no slime sinks into the ground (deepest '+ws.sink.toFixed(1)+' px: '+ws.f+' in '+ws.name+')');
 ok(live.every(x=>x.n>0)&&wd.drift<=2.5,'2. on the ground its feet stay put (worst '+wd.drift.toFixed(1)+' px: '+wd.f+' in '+wd.name+')');
 const fys=rest.map(x=>x.fy),lo=rest[fys.indexOf(Math.min(...fys))],hi=rest[fys.indexOf(Math.max(...fys))];
 ok(rest.length===PICS.length&&hi.fy-lo.fy<=1,'3. every picture stands on the same line, so a face swap never jumps ('+(hi.fy-lo.fy).toFixed(1)+' px from '+lo.f+' to '+hi.f+'; at '+(100*lo.fy/lo.H).toFixed(1)+'% of the box)');
 for(const nm of ['bob','squish','slimeCheer','beatBounce']){const a=live.filter(x=>x.name===nm);
   console.log('     '+nm+': sink '+Math.max(...a.map(x=>x.sink)).toFixed(1)+' px, drift '+Math.max(...a.map(x=>x.drift)).toFixed(1)+' px');}
 ok(errs.length===0,'no page errors '+errs.slice(0,2).join(' | '));
 await b.close();console.log(FAIL.length?FAIL.length+' FAILURE(S)':'the slimes squash on their feet');process.exit(FAIL.length?1:0);})();

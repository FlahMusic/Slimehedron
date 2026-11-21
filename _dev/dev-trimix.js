// ============================================================================================
//  THE TRIANGLE MIXER (Flah 2026-11-21: "make the triangle mixer more 3d-like ... put them more to the left some on
//  desktop at least to make them fit in that white space of background"). In play and studio at 1440 x 900 and
//  1280 x 800, and play on a phone (390 x 844):
//    1. the knob goes where you press: a tap on each corner and the middle lands the knob within 3 units of it (the
//       drawing's units, the triangle is 58 wide), and the corner's part gets at least 0.9 of the mix. The pointer map
//       was not the drawing's (the knob landed 13 low at the top corner)
//    2. it is a tile, not a sticker: a side below the face, a ground shadow, a lit edge, a ball knob (radial gradient)
//    3. on a desktop in play it sits left of the tank's box, its left edge within 60 px of the sound column (it was 110 px off it, crowding the tank)'s right
//       edge, and it covers no button by more than 4 px (studio too)
//  Sabotage: SAB=oldmap (the old pointer map), SAB=flat (the side and the shadow removed), SAB=right (left: 210px).
//  Needs a local server: python -m http.server 8765. Run from the project root: node _dev/dev-trimix.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const SAB=process.env.SAB||'';
const RUNS=[['play',1440,900],['play',1280,800],['studio',1440,900],['studio',1280,800],['play',390,844]];
(async()=>{const b=await launch();
 for(const [mode,W,H] of RUNS){const tag=`[${mode} ${W}x${H}]`;
  const ctx=await b.newContext({viewport:{width:W,height:H}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');localStorage.setItem('slimehedron-tapped','1');}catch(e){}});
  await p.goto('http://127.0.0.1:8765/index.html?m='+mode);await p.waitForTimeout(2800);
  await p.evaluate(SAB=>{const svg=document.querySelector('#triMix svg');
    if(SAB==='flat'){[...svg.querySelectorAll('path[transform],ellipse')].forEach(e=>e.remove());}
    if(SAB==='right'&&S.mode==='play')document.getElementById('triMixBar').style.left='210px';
    if(SAB==='oldmap'){const kn=svg.querySelector('#triKnob');   // the old map, by hand: re-place the knob as the old code would have
      svg.addEventListener('pointerdown',e=>{const r=svg.getBoundingClientRect(),x=-14+(e.clientX-r.left)/r.width*128,y=-18+(e.clientY-r.top)/r.height*124;
        setTimeout(()=>{kn.setAttribute('cx',x);kn.setAttribute('cy',y);},0);},true);}},SAB);
  await p.waitForTimeout(200);
  // 1. press each corner (just inside it) and the middle, through the real pointer
  const targets=[[50,18,'wM'],[23,67,'wD'],[77,67,'wK'],[50,50.7,null]];
  let worst=0,weakest=1;
  for(const [x,y,part] of targets){
    const scr=await p.evaluate(([x,y])=>{const svg=document.querySelector('#triMix svg'),q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return [q.x,q.y];},[x,y]);
    await p.mouse.move(scr[0],scr[1]);await p.mouse.down();await p.mouse.up();await p.waitForTimeout(80);
    const k=await p.evaluate(()=>{const kn=document.getElementById('triKnob');return {cx:+kn.getAttribute('cx'),cy:+kn.getAttribute('cy'),wM:S.wM,wD:S.wD,wK:S.wK};});
    // the knob is held inside the triangle (T 50,16  L 21,68  R 79,68), so compare with the press clamped the same way
    worst=Math.max(worst,Math.hypot(k.cx-x,k.cy-y));if(part)weakest=Math.min(weakest,k[part]);}
  ok(worst<=3&&weakest>=0.9,`${tag} 1. the knob goes where you press (${worst.toFixed(1)} units off at worst; a corner's part ${weakest.toFixed(2)})`);
  const look=await p.evaluate(()=>{const svg=document.querySelector('#triMix svg');return {side:!!svg.querySelector('path[transform*="translate"]'),shadow:!!svg.querySelector('ellipse'),
    rim:[...svg.querySelectorAll('path')].some(e=>e.getAttribute('stroke')==='#fff'),ball:/url\(#tmKnobG\)/.test(document.getElementById('triKnob').getAttribute('fill')||'')};});
  ok(look.side&&look.shadow&&look.rim&&look.ball,`${tag} 2. a tile: side ${look.side}, ground shadow ${look.shadow}, lit edge ${look.rim}, ball knob ${look.ball}`);
  const g=await p.evaluate(()=>{const m=document.getElementById('triMix').getBoundingClientRect(),col=document.getElementById('psWaves'),c=col&&col.checkVisibility()?col.getBoundingClientRect():null;
    const svg=document.querySelector('#triMix svg'),face=svg.querySelector('path').getBoundingClientRect();   // (the face, not the band's pictures round it)
    let over=0,by='';for(const e of document.querySelectorAll('button,select,input')){if(!e.checkVisibility()||document.getElementById('triMix').contains(e))continue;const q=e.getBoundingClientRect();
      const ox=Math.min(face.right,q.right)-Math.max(face.left,q.left),oy=Math.min(face.bottom,q.bottom)-Math.max(face.top,q.top);if(ox>0&&oy>0&&Math.min(ox,oy)>over){over=Math.min(ox,oy);by=e.id||e.className;}}
    return {left:m.left,colR:c?c.right:null,over,by};});
  if(mode==='play'&&W>=1000)ok(g.colR!=null&&g.left-g.colR<=60&&g.left-g.colR>=-30,`${tag} 3. it sits by the sound column (${(g.left-g.colR).toFixed(0)} px right of it)`);
  ok(g.over<=4,`${tag}    it covers no button (${g.over.toFixed(0)} px${g.by?' on '+g.by:''})`);
  ok(errs.length===0,`${tag} no page errors ${errs.slice(0,2).join(' | ')}`);
  await ctx.close();}
 await b.close();console.log(FAIL.length?FAIL.length+' FAILURE(S)':'the mixer: a tile, where you press, out of the way');process.exit(FAIL.length?1:0);})();

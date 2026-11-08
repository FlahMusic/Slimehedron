// ============================================================================================
//  THE MASCOTS STAND WHOLE, AWAY FROM THE TANK (Flah 2026-11-03, look question 2: "the background mascots get cut off at
//  the screen edge and a star sits on the tank: keep them whole and away from the tank?" - yes).
//    1. no decoration (the slimes, the rainbow girl and her sparkles, the motes, the worm) hangs more than 2 px off the
//       screen, in play on a phone (390) and in play and studio on desktops (1280, 1440), while it is out (a peeker that
//       is ducking away is meant to be off screen)
//    2. none of them covers more than 5 % of itself with the tank (the shape's own box)
//  The crayon stars painted INTO the background pictures (bg-desktop / bg-mobile) are art, not elements: moving them is
//  an art change (on the morning list), so they are not checked here.
//  Sabotaged 4 ways (2026-11-08), each caught: bottom peekers cut again (1), the side peekers back (1), the rainbow girl
//  buried 10 px (1), the tank left out of the furniture the decorations avoid (1 and 2).
//  Needs a local server: python -m http.server 8765. Run from the project root: node _dev/dev-decor.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const init=()=>{try{for(const k of ['slimehedron-coach','slimehedron-coach-studio','slimehedron-tapped'])localStorage.setItem(k,'1');}catch(e){}};

(async()=>{const b=await launch();
 for(const [m,w,h] of [['play',390,844],['play',1280,900],['studio',1280,900],['play',1440,900],['studio',1440,900]]){
  const ctx=await b.newContext({viewport:{width:w,height:h}});await ctx.addInitScript(init);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html?m='+m+'&view=2d');await p.waitForTimeout(3500);
  const r=await p.evaluate(()=>{const cv=document.getElementById('cv'),cr=cv.getBoundingClientRect(),k=cr.width/cv.width;
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const e of edges)for(const [x,y] of [[e.ax,e.ay],[e.bx,e.by]]){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
    const T={l:cr.left+x0*k,t:cr.top+y0*k,r:cr.left+x1*k,b:cr.top+y1*k};const cut=[],over=[];let n=0;
    for(const el of document.querySelectorAll('.slime,.mote,.gdecor,.spark,#wormEl')){
      if(!el.checkVisibility()||(el.classList.contains('peeker')&&el.dataset.state!=='out'))continue;
      const q=el.getBoundingClientRect();if(q.width<4||q.height<4)continue;n++;
      const name=(el.id||String(el.className.baseVal!=null?el.className.baseVal:el.className)).slice(0,28);
      const off=Math.max(0,-q.left,q.right-innerWidth,-q.top,q.bottom-innerHeight);if(off>2)cut.push(name+' '+Math.round(off)+'px');
      const ov=Math.max(0,Math.min(q.right,T.r)-Math.max(q.left,T.l))*Math.max(0,Math.min(q.bottom,T.b)-Math.max(q.top,T.t))/(q.width*q.height);
      if(ov>0.05)over.push(name+' '+Math.round(ov*100)+'%');}
    return {n,cut,over};});
  const tag='['+m+' '+w+']';
  ok(r.n>=2&&r.cut.length===0,'1. '+tag+' every one of '+r.n+' decorations stands whole on screen'+(r.cut.length?' (cut: '+r.cut.join(', ')+')':''));
  ok(r.over.length===0,'2. '+tag+' none of them sits on the tank'+(r.over.length?' ('+r.over.join(', ')+')':''));
  ok(errs.length===0,tag+' no page errors ('+errs.slice(0,2).join(' | ')+')');
  await ctx.close();}
 await b.close();
 console.log(FAIL.length?'\n'+FAIL.length+' FAILURE(S)':'\nthe mascots stand whole, away from the tank');process.exit(FAIL.length?1:0);})();

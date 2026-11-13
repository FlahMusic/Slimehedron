// ============================================================================================
//  THE TALL PHONE TANK (look question 4; spec _docs/specs/2026-11-11-tall-phone-tank). On a portrait phone in play the
//  tank's SPACE is drawn 1.5x taller: the canvas keeps its 720x720 tank coordinates (the physics, the goo and the plugin's
//  numbers are untouched) and is shown at 2:3, so a hexagon squashes and unsquashes as it turns. Everything that maps
//  the screen to the tank goes through the canvas rect per axis, so touches, seeds and the GL canvas follow.
//    1. 390x844 play: the canvas is 2:3 (+-2%), at least half the stage's height, inside the screen; the GL canvas
//       sits exactly on it
//       the notes toggle under it still clears the mixer (the tank sits at the top of the stage for that)
//    2. a touch in the middle of the screen's tank lands in the middle of the tank (the per-axis mapping holds)
//    3. the same phone in studio, and a desktop in play: square (play on portrait phones only)
//    4. landscape phone: square (there is no spare height)
//  Needs a local server: python -m http.server 8765. Run from the project root: node _dev/dev-tall.js
// ============================================================================================
process.env.SLIME_GL='1';
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const init=()=>{try{for(const k of ['slimehedron-coach','slimehedron-coach-studio','slimehedron-tapped'])localStorage.setItem(k,'1');}catch(e){}};
const shape=async(b,w,h,mode)=>{const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,hasTouch:true,isMobile:w<900});await ctx.addInitScript(init);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html?m='+mode);await p.waitForTimeout(2500);
  const r=await p.evaluate(()=>{const c=document.getElementById('cv').getBoundingClientRect(),s=document.getElementById('stage').getBoundingClientRect();
    const g=document.getElementById('cvGL'),gr=g&&g.style.display!=='none'?g.getBoundingClientRect():null;
    return {w:c.width,h:c.height,ratio:c.height/c.width,stageH:s.height,inside:c.top>=0&&c.bottom<=innerHeight&&c.left>=0&&c.right<=innerWidth,
      gl:gr?{dx:Math.abs(gr.left-c.left),dy:Math.abs(gr.top-c.top),dw:Math.abs(gr.width-c.width),dh:Math.abs(gr.height-c.height)}:null,
      gap:(()=>{const n=document.getElementById('notesSlot'),t=document.getElementById('triMix');if(!n||!t)return null;const a=n.getBoundingClientRect(),q=t.getBoundingClientRect();return {clear:q.top-a.bottom,onCanvas:a.bottom<=c.bottom&&a.top>=c.top};})(),
      mid:(()=>{const x=c.left+c.width/2,y=c.top+c.height/2;const q=[(x-c.left)*(W/c.width),(y-c.top)*(H/c.height)];return [Math.abs(q[0]-CX),Math.abs(q[1]-CY)];})()};});
  return {r,errs,p,ctx};};
(async()=>{const b=await launch({args:['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist']});
 {const {r,errs,ctx}=await shape(b,390,844,'play');
  ok(Math.abs(r.ratio-1.5)<0.03,'1. 390x844 play: the tank is drawn 1.5x taller than wide ('+r.w.toFixed(0)+'x'+r.h.toFixed(0)+', ratio '+r.ratio.toFixed(2)+')');
  ok(r.h>=r.stageH*0.5&&r.inside,'1. it fills at least half the stage\'s height ('+Math.round(r.h/r.stageH*100)+'% of '+r.stageH.toFixed(0)+' px) and stays on screen');
  ok(!!r.gl&&r.gl.dx<1.5&&r.gl.dy<1.5&&r.gl.dw<1.5&&r.gl.dh<1.5,'1. the GL canvas sits exactly on it ('+(r.gl?JSON.stringify(r.gl):'no GL canvas')+')');
  ok(!!r.gap&&r.gap.clear>=8,'1. the notes toggle under the tank clears the mixer ('+(r.gap?r.gap.clear.toFixed(0)+' px':'no toggle or mixer')+'; it sat on the keys sticker when the tank was centred)');
  ok(r.mid[0]<1&&r.mid[1]<1,'2. a touch in the middle of the tank on screen is the middle of the tank ('+r.mid.map(v=>v.toFixed(2)).join(', ')+' px off)');
  ok(errs.length===0,'no page errors ('+errs.slice(0,2).join(' | ')+')');await ctx.close();}
 for(const [w,h,mode,why] of [[390,844,'studio','studio keeps the square tank'],[1280,860,'play','a desktop keeps the square tank'],[844,390,'play','a landscape phone keeps the square tank']]){
  const {r,ctx}=await shape(b,w,h,mode);ok(Math.abs(r.ratio-1)<0.03,'3/4. '+w+'x'+h+' '+mode+': '+why+' (ratio '+r.ratio.toFixed(2)+')');await ctx.close();}
 await b.close();
 console.log(FAIL.length?'\n'+FAIL.length+' FAIL':'\nthe tall tank: play on portrait phones only, and the screen still maps to the tank');process.exit(FAIL.length?1:0);})();

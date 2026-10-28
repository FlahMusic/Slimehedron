// ============================================================================================
//  THE CRAYON LOOK (tank3d.js) — the 3D tank drawn like the rest of the app, not rendered as glass.
//  Measured on the real GPU path (this suite turns WebGL on itself). It checks what you would SEE:
//    1. the corner menu offers glass / crayon in 3D, and the choice sticks after a reload
//    2. crayon really changes the picture: different pixels, and more crayon texture (fine grain)
//    3. the strokes "boil": a still tank in crayon still changes a few times a second, glass does not
//    4. with reduced motion the boil stops
//    5. going back to glass gives back exactly the glass picture
//    6. the goo is still held inside the glass in crayon (same clip planes)
//  Needs a local server: python3 -m http.server 8765, and python3 with Pillow for the pixel maths.
//  Run from the project root: node _dev/dev-crayon.js
// ============================================================================================
process.env.SLIME_GL='1';
const {launch}=require('./browser');
const {execFileSync}=require('child_process');const fs=require('fs'),os=require('os'),path=require('path');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html?m=play&view=3d&space=normal';
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'crayon-'));
// pixel maths in Pillow: mean abs difference of two shots, and fine texture (mean |px - right neighbour|)
const PY=`import sys,json
from PIL import Image,ImageChops,ImageStat
a=Image.open(sys.argv[1]).convert('L');out={}
def tex(im):
  w,h=im.size;s=ImageChops.difference(im.crop((0,0,w-1,h)),im.crop((1,0,w,h)));return ImageStat.Stat(s).mean[0]
out['tex']=tex(a)
if len(sys.argv)>2:
  b=Image.open(sys.argv[2]).convert('L');out['diff']=ImageStat.Stat(ImageChops.difference(a,b)).mean[0];out['tex2']=tex(b)
print(json.dumps(out))`;
const px=(...f)=>JSON.parse(execFileSync('python3',['-c',PY,...f]).toString());

(async()=>{const b=await launch();
 const run=async(reduce)=>{
  const ctx=await b.newContext({viewport:{width:1200,height:900},reducedMotion:reduce?'reduce':'no-preference'});
  // tapped: the first-tap invite (a DOM pulse over the middle of the tank, 2026-10-27) would fade in over the frozen
  // frames once the tank is emptied, and this suite measures the tank's own drawing
  await ctx.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-tapped','1');}catch(e){}window.__glKeep=true;});   // software GL is slow here: keep it on anyway
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'||(m.type()==='warning'&&!/GPU stall/.test(m.text())))console.log('   console:',m.text().slice(0,400));});
  await p.goto(URL);await p.waitForTimeout(3500);
  // a still tank: nothing moving, so any change between two frames is the drawing itself
  const still=()=>p.evaluate(async()=>{try{setPlaying(false);}catch(e){}balls.length=0;particles.length=0;await new Promise(r=>setTimeout(r,500));});
  const shot=async(n)=>{const f=path.join(TMP,n+'.png');await p.locator('#cvGL').screenshot({path:f});return f;};
  return {ctx,p,errs,still,shot};};

 {const {ctx,p,errs,shot}=await run(false);
  const gl=await p.evaluate(()=>!!(window.__gl&&window.__gl.api));
  ok(gl,'the GPU tank is running (WebGL on)');
  if(!gl){await b.close();process.exit(1);}
  await p.click('#spaceBtn');await p.waitForTimeout(200);
  const row=await p.evaluate(()=>{const r=document.getElementById('lookRow');return r&&!r.hidden&&r.offsetWidth>0;});
  ok(row,'the corner menu offers a look row in 3D');
  await p.click('#lookRow [data-look="crayon"]');await p.waitForTimeout(300);await p.keyboard.press('Escape');
  const look=await p.evaluate(()=>({api:window.__gl.api.look,saved:localStorage.getItem('slimehedron-look'),pressed:document.querySelector('#lookRow [data-look="crayon"]').getAttribute('aria-pressed')}));
  ok(look.api==='crayon'&&look.saved==='crayon'&&look.pressed==='true','choosing crayon switches the tank, is remembered, and shows as chosen');
  // goo in crayon: still clipped to the glass (the same goo dev-gl uses: a tank's worth, pooled, then settled)
  const goo=await p.evaluate(()=>{const sb=startBreak;startBreak=()=>{};fillState='fill';
    for(let i=0;i<500;i++)particles.push({x:CX+(Math.random()-0.5)*R*1.4,y:CY+(Math.random()-0.5)*R*1.4,z:Math.random(),vx:0,vy:0,vz:0,r:8,hue:Math.random(),pooled:true,age:80});
    for(let i=0;i<60;i++)simTick(performance.now());for(let i=0;i<4;i++)draw();const o=window.__gl.api.gooOut();startBreak=sb;return o;});
  ok(goo&&goo.clip>=goo.glass&&goo.glass>0&&goo.reach<=4,'the goo is still clipped to every pane of glass in crayon, its skin at most 4px past it ('+JSON.stringify(goo)+')');
  await p.reload();await p.waitForTimeout(3500);
  ok(await p.evaluate(()=>window.__gl.api&&window.__gl.api.look)==='crayon','the crayon look is still on after a reload');
  // A FROZEN TANK. The tank tilts and turns with time even when paused, so two live frames always differ.
  // Stop every animation loop, hold the clock, and draw single frames by hand: then the ONLY thing that can
  // change between two frames at different times is the drawing itself (the crayon boil).
  await p.evaluate(()=>{try{setPlaying(false);}catch(e){}balls.length=0;particles.length=0;window.requestAnimationFrame=()=>0;
    const real=performance.now.bind(performance);window.__T=real();performance.now=()=>window.__T;});
  await p.waitForTimeout(300);
  const frame=async(name,look,dt)=>{await p.evaluate(([look,dt])=>{window.__gl.api.setLook(look);window.__T+=dt;window.__gl.api.render();window.__gl.api.render();},[look,dt]);return shot(name);};
  const g1=await frame('g1','glass',0),g2=await frame('g2','glass',130);
  const c1=await frame('c1','crayon',0),c2=await frame('c2','crayon',130);
  const g3=await frame('g3','glass',0);
  const gg=px(g1,g2),cg=px(g2,c1),cc=px(c1,c2),back=px(g2,g3);
  ok(cg.diff>2,'crayon really changes the picture (mean change '+cg.diff.toFixed(2)+' / 255)');
  ok(cg.tex2>cg.tex*1.15,'and it has more crayon texture than glass (fine grain '+cg.tex.toFixed(2)+' -> '+cg.tex2.toFixed(2)+')');
  ok(cc.diff>0.15&&cc.diff>gg.diff*4,'the crayon strokes boil as time passes on a still tank, glass does not ('+gg.diff.toFixed(3)+' glass vs '+cc.diff.toFixed(3)+' crayon)');
  ok(back.diff<0.1,'back to glass gives back exactly the glass picture (change '+back.diff.toFixed(3)+')');
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}
 {const {ctx,p,shot}=await run(true);
  await p.evaluate(()=>{window.setLook3D('crayon');try{setPlaying(false);}catch(e){}balls.length=0;particles.length=0;window.requestAnimationFrame=()=>0;
    const real=performance.now.bind(performance);window.__T=real();performance.now=()=>window.__T;});
  await p.waitForTimeout(300);
  const frame=async(name,dt)=>{await p.evaluate(dt=>{window.__T+=dt;window.__gl.api.render();window.__gl.api.render();},dt);return shot(name);};
  const a=await frame('rm1',0),c=await frame('rm2',130);const d=px(a,c);
  ok(d.diff<0.1,'[reduced motion] the crayon strokes hold still ('+d.diff.toFixed(3)+')');
  await ctx.close();}
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'crayon pass clean'));
 process.exit(FAIL.length?1:0);})();

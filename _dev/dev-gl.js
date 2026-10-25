// ============================================================================================
//  GL TEST — the 3D tank drawn on the graphics card (tank3d.js + vendor/three-slime.js).
//  It must draw the SAME tank the physics runs, on the SAME pixels, and never leave a kid without a tank:
//    1. it loads by itself in 3D, from this site only (no outside requests), MIT notice intact
//    2. a ball is drawn exactly where P3() says it is, so the camera matches and taps still land
//    3. a glow adds light, it never punches a dark hole in the page behind (premultiplied alpha)
//    4. a struck wall visibly lights up; the goo is a real surface when there is goo, gone when not
//    5. no WebGL, ?gl=0, a lost GPU context, a lesson or the 2D view: the canvas draws the tank instead
//  Headless Chromium draws WebGL in software (SwiftShader), so this checks WHAT is drawn, not how fast.
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-gl.js
// ============================================================================================
process.env.SLIME_GL='1';                 // this suite is about the graphics-card renderer: let it load
const {launch}=require('./browser');
const fs=require('fs');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html';
const ARGS=['--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader','--use-angle=swiftshader'];

(async()=>{const b=await launch({args:ARGS});
 const open=async(q,init)=>{const ctx=await b.newContext({viewport:{width:1000,height:900}});const p=await ctx.newPage();
   const errs=[],reqs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message);});p.on('request',r=>reqs.push(r.url()));
   await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1')}catch(e){}window.__glKeep=true;});   // software GL is slow here: keep it on anyway
   if(init)await p.addInitScript(init);
   await p.goto(URL+q);await p.waitForTimeout(1500);return {ctx,p,errs,reqs};};
 const waitGL=async p=>{for(let i=0;i<40;i++){if(await p.evaluate(()=>!!(window.__gl&&window.__gl.api)))return true;await p.waitForTimeout(200);}return false;};

 // ---- 1. it loads, from here only ----
 const head=fs.readFileSync('vendor/three-slime.js','utf8').slice(0,600);
 ok(/three\.js/.test(head)&&/MIT License/.test(head)&&/Permission is hereby granted/.test(head),'vendor/three-slime.js carries the three.js MIT notice');
 {const {ctx,p,errs,reqs}=await open('?m=studio&view=3d&space=normal');
  const up=await waitGL(p);ok(up,'in 3D the graphics-card tank loads by itself');
  await p.evaluate(()=>{setPlaying(true);for(let i=0;i<5;i++)spawn(CX+i*20,CY);});await p.waitForTimeout(1500);
  const lay=await p.evaluate(()=>{const a=document.getElementById('cv').getBoundingClientRect(),g=document.getElementById('cvGL').getBoundingClientRect();
    return {d:Math.max(Math.abs(a.left-g.left),Math.abs(a.top-g.top),Math.abs(a.width-g.width),Math.abs(a.height-g.height)),shown:getComputedStyle(document.getElementById('cvGL')).display!=='none'};});
  ok(lay.shown&&lay.d<1,'and sits exactly on the tank canvas (off by '+lay.d.toFixed(2)+'px)');
  const foreign=reqs.filter(u=>/^https?:/.test(u)&&!u.startsWith('http://127.0.0.1:8765'));
  ok(foreign.length===0,'nothing is fetched from anywhere else ('+foreign.length+' outside requests)'+(foreign.length?': '+foreign[0]:''));
  ok(reqs.some(u=>/vendor\/three-slime\.js/.test(u))&&reqs.some(u=>/tank3d\.js/.test(u)),'three.js and the tank renderer came from this site');

  // ---- 2. a ball is drawn where P3 says ----
  const shots=[];
  for(const [bx,by,bz] of [[0,0,0.2],[-140,-90,0.6],[120,110,0.9]]){
    const pos=await p.evaluate(([bx,by,bz])=>{S.playing=false;balls.length=0;particles.length=0;
      spawn(CX+bx,CY+by);const B=balls[0];B.z=bz;B.pz=bz;B.px=B.x;B.py=B.y;B.vx=B.vy=0;B.trail.length=0;B.hue=0;   // pure red
      draw();const q=__P3(B.x,B.y,bz),r=cv.getBoundingClientRect();
      return {x:r.left+q[0]*r.width/W,y:r.top+q[1]*r.height/H,rad:BR*q[2]*r.width/W};},[bx,by,bz]);
    await p.evaluate(()=>draw());
    const png=await p.screenshot({clip:{x:pos.x-30,y:pos.y-30,width:60,height:60}});
    shots.push({pos,png});}
  // screenshots are decoded in the page itself (an <img> drawn to a canvas): no extra npm package
  const PNG={sync:{read:null}};const decode=async(png)=>p.evaluate(async b64=>{const im=new Image();im.src='data:image/png;base64,'+b64;await im.decode();
    const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);
    return {width:im.width,height:im.height,data:Array.from(x.getImageData(0,0,im.width,im.height).data)};},png.toString('base64'));
  const dec=[];for(const s0 of shots)dec.push(await decode(s0.png));
  PNG.sync.read=(png)=>{const i=shots.findIndex(s0=>s0.png===png);return dec[i];};
  {const res=shots.map(({png})=>{const im=PNG.sync.read(png),px=(x,y)=>{const i=(y*im.width+x)*4;return [im.data[i],im.data[i+1],im.data[i+2]];};
      const red=([r,g,bb])=>r>140&&r-g>60&&r-bb>45;   // the ball's own red
      let hit=0;for(let y=27;y<=33;y++)for(let x=27;x<=33;x++)if(red(px(x,y)))hit++;
      let far=0;for(const [x,y] of [[2,2],[57,2],[2,57],[57,57]])if(red(px(x,y)))far++;
      return {hit,far};});
    ok(res.every(r=>r.hit>=20),'a red ball shows up on the exact pixel P3 puts it, front, middle and back of the box ('+res.map(r=>r.hit+'/49').join(' ')+')');
    ok(res.every(r=>r.far===0),'and not 28px away from it');}

  // ---- 3. glows add light, never a dark disk ----
  const glow=await p.evaluate(()=>{balls.length=0;spawn(CX,CY);const B=balls[0];B.z=B.pz=0.1;B.vx=B.vy=0;B.trail.length=0;B.hue=0.6;draw();
    const q=__P3(B.x,B.y,0.1),r=cv.getBoundingClientRect();return {x:r.left+q[0]*r.width/W,y:r.top+q[1]*r.height/H,rad:BR*q[2]*r.width/W*((window.__gl&&window.__gl.api&&window.__gl.api.noteScale)||1)};});   // the note as DRAWN (it is drawn bigger than the physics ball)
  // over a mid-tone backdrop, so a white ring would show (on a near-white page it hides, which is how it slipped by)
  const before=await p.evaluate(()=>{document.getElementById('cvGL').style.background='rgb(90,140,110)';balls.length=0;draw();return 1;});
  const bgPng=await p.screenshot({clip:{x:glow.x-30,y:glow.y-30,width:60,height:60}});
  await p.evaluate(()=>{spawn(CX,CY);const B=balls[0];B.z=B.pz=0.1;B.vx=B.vy=0;B.trail.length=0;B.hue=0.6;draw();});
  const glPng=await p.screenshot({clip:{x:glow.x-30,y:glow.y-30,width:60,height:60}});
  {const A=await decode(bgPng),Bm=await decode(glPng),L=(im,x,y)=>{const i=(y*im.width+x)*4;return (im.data[i]+im.data[i+1]+im.data[i+2])/3;};
    let worst=0,white=0;for(let y=0;y<60;y+=2)for(let x=0;x<60;x+=2){const d=Math.hypot(x-30,y-30);if(d<glow.rad*1.3||d>28)continue;worst=Math.max(worst,L(A,x,y)-L(Bm,x,y));
      if(d<glow.rad*2.6)white=Math.max(white,L(Bm,x,y)-L(A,x,y));}
    ok(worst<12,'around a ball nothing punches a dark hole in the page behind (worst darkening '+worst.toFixed(1)+' of 255)');
    ok(white<14,'and there is no white ring round a ball either (worst brightening just outside it '+white.toFixed(1)+' of 255)');}

  // ---- 4. a struck wall lights; goo is a surface only when there is goo ----
  await p.evaluate(()=>{document.getElementById('cvGL').style.background='';});
  const wall=await p.evaluate(()=>{balls.length=0;particles.length=0;const e=edges[0],q=__P3((e.ax+e.bx)/2,(e.ay+e.by)/2,0),r=cv.getBoundingClientRect();
    for(const f of edges)f.flash=0;formGlow=0;draw();return {x:r.left+q[0]*r.width/W,y:r.top+q[1]*r.height/H};});
  const w0=await p.screenshot({clip:{x:wall.x-6,y:wall.y-6,width:12,height:12}});
  await p.evaluate(()=>{edges[0].flash=1;draw();});
  const w1=await p.screenshot({clip:{x:wall.x-6,y:wall.y-6,width:12,height:12}});
  // glass at rest is pearl (nearly colourless); a strike floods it with the note's colour: measure COLOUR, not brightness
  {const avg=im=>{let s=0;for(let i=0;i<im.data.length;i+=4){const r=im.data[i],g=im.data[i+1],b2=im.data[i+2];s+=Math.max(r,g,b2)-Math.min(r,g,b2);}return s/(im.data.length/4);};
    const a=avg(await decode(w0)),c=avg(await decode(w1));
    ok(a>=20,'a wall at rest is its own pastel colour, not white glass (colour '+a.toFixed(0)+')');
    ok(c>a+8,'a struck wall floods with its note\'s colour where it is drawn (colour '+a.toFixed(0)+' -> '+c.toFixed(0)+')');}
  const goo=await p.evaluate(async()=>{particles.length=0;for(let i=0;i<5;i++)draw();const none=window.__gl.api.stats().goo;
    for(let i=0;i<120;i++)particles.push({x:CX+(Math.random()-0.5)*200,y:CY+80+Math.random()*60,z:0.5,vx:0,vy:0,r:7,hue:Math.random(),pooled:true,age:80,born:0});
    for(let i=0;i<5;i++)draw();return {none,some:window.__gl.api.stats().goo};});
  ok(goo.none===0&&goo.some>200,'the goo is a real 3D surface when there is goo ('+goo.some+' triangles) and nothing when there is none ('+goo.none+')');
  // ---- 4a. the goo's skin is clipped to the glass, and barely needs to be ----
  const clip=await p.evaluate(()=>{fillState='fill';frags=null;pressure=0;const s=document.getElementById('shape');s.value='cube';s.dispatchEvent(new Event('change'));
    balls.length=0;particles.length=0;S.playing=false;const sb=startBreak;startBreak=function(){};   // no burst: this is about the glass holding it
    for(let i=0;i<500;i++)particles.push({x:CX+(Math.random()-0.5)*R*1.4,y:CY+(Math.random()-0.5)*R*1.4,z:Math.random(),vx:0,vy:0,vz:0,r:8,hue:Math.random(),pooled:true,age:80});
    for(let i=0;i<60;i++)simTick(performance.now());for(let i=0;i<4;i++)draw();const o=window.__gl.api.gooOut();o.state=fillState;startBreak=sb;return o;});
  ok(clip&&clip.clip===clip.glass&&clip.glass===6,'the goo is clipped to every face of the cube it is in ('+(clip&&clip.clip)+' clip planes for '+(clip&&clip.glass)+' faces)');
  ok(clip&&clip.reach<=4,'and pressed hard against the glass, its skin reaches at most '+4+'px past it before the clip ('+(clip?clip.reach.toFixed(1):'?')+'px)');
  // ---- 4b. a real solid is drawn as glass faces, and a struck face lights up ----
  const sol=await p.evaluate(()=>{fillState='fill';frags=null;pressure=0;const s=document.getElementById('shape');s.value='icosa';s.dispatchEvent(new Event('change'));balls.length=0;particles.length=0;
    for(let i=0;i<SOLID.flash.length;i++)SOLID.flash[i]=0;draw();const r=cv.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,st:window.__gl.api.stats()};});
  const f0=await p.screenshot({clip:{x:sol.x-120,y:sol.y-120,width:240,height:240}});
  await p.evaluate(()=>{for(let i=0;i<SOLID.flash.length;i++)SOLID.flash[i]=1;window.__gl.api.render();});
  const f1=await p.screenshot({clip:{x:sol.x-120,y:sol.y-120,width:240,height:240}});
  {const avg=im=>{let s=0;for(let i=0;i<im.data.length;i+=4){const r=im.data[i],g=im.data[i+1],b2=im.data[i+2];s+=Math.max(r,g,b2)-Math.min(r,g,b2);}return s/(im.data.length/4);};
    const a=avg(await decode(f0)),c=avg(await decode(f1));
    ok(sol.st.tris>=120+240,'an icosahedron is drawn: 20 faces inside and out, and its 30 edges ('+sol.st.tris+' triangles)');
    ok(c>a+5,'and its clear faces flood with their notes\' colours when struck (colour '+a.toFixed(1)+' -> '+c.toFixed(1)+')');}
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
  // ---- 5a. 2D view and lessons hand the tank back to the canvas ----
  const hand=await p.evaluate(()=>{const g=document.getElementById('cvGL');setView3D(false);draw();const flat=getComputedStyle(g).display==='none';
    setView3D(true);LAB._on=true;draw();const lesson=getComputedStyle(g).display==='none';LAB._on=false;draw();const back=getComputedStyle(g).display!=='none';
    return {flat,lesson,back};});
  ok(hand.flat,'the 2D view hides the graphics-card tank');ok(hand.lesson,'a lesson gets the canvas tank, exactly as before');ok(hand.back,'and it comes back after');
  // ---- 5b. a lost GPU context falls back without a crash ----
  const lost=await p.evaluate(async()=>{const g=document.getElementById('cvGL'),gl=g.getContext('webgl2')||g.getContext('webgl');
    const ext=gl&&gl.getExtension('WEBGL_lose_context');if(!ext)return null;ext.loseContext();await new Promise(r=>setTimeout(r,400));
    spawn(CX,CY);for(let i=0;i<5;i++)draw();return {api:!!window.__gl.api,hidden:getComputedStyle(g).display==='none'};});
  ok(lost&&!lost.api&&lost.hidden,'a lost GPU context hands the tank back to the canvas');
  ok(errs.length===0,'and nothing threw'+(errs.length?': '+errs[0]:''));
  await ctx.close();}

 // ---- 5c. no WebGL at all, or ?gl=0: the canvas tank, no errors ----
 for(const [tag,q,init] of [['no WebGL','?m=play&view=3d',()=>{const o=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return /webgl/.test(t)?null:o.call(this,t,...a);};}],
                            ['?gl=0','?m=play&view=3d&gl=0',null]]){
  const {ctx,p,errs}=await open(q,init);await p.mouse.click(500,450);await p.waitForTimeout(2500);
  const r=await p.evaluate(()=>{const g=document.getElementById('cvGL');
    const d=cv.getContext('2d').getImageData(0,0,W,H).data;let ink=0;for(let i=3;i<d.length;i+=4*97)if(d[i]>0)ink++;
    return {api:!!window.__gl.api,gl:!!g&&getComputedStyle(g).display!=='none',ink,balls:balls.length};});
  ok(!r.api&&!r.gl&&r.ink>20,'['+tag+'] the canvas draws the 3D tank instead ('+r.ink+' inked samples, '+r.balls+' balls)');
  ok(errs.length===0,'['+tag+'] no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'gl pass clean'));
 process.exit(FAIL.length?1:0);})();

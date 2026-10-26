// ============================================================================================
//  THE GOO IS SMOOTH (this suite turns WebGL on itself).
//  Flah: "the goo seems kinda laggy and shitty ... choppy and not smooth". Measured on the old code: the
//  surface was rebuilt every 2nd frame (half the frames on screen were a repeat), its drops were drawn where
//  the last 60 Hz tick left them, and lumps were binned into grid cells, so a drop crossing a cell line moved a
//  whole lump at once. At 60 Hz the surface jumped up to 150 px between two frames.
//  This drives the app frame by frame on a pinned clock, as a 120 Hz and a 60 Hz screen would, with the goo
//  left alone (no balls, no beat kick: any motion is the renderer's own), and checks what is ON SCREEN:
//    1. the surface is rebuilt on every frame: no repeated frames
//    2. it moves smoothly: frame-to-frame change and jerk stay small (px, in the tank's own units)
//    3. it is cheap enough to do that: the physics tick and the surface rebuild, timed on their own
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-goosmooth.js
// ============================================================================================
process.env.SLIME_GL='1';
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};

(async()=>{const b=await launch();
 const ctx=await b.newContext({viewport:{width:900,height:800}});
 await ctx.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');}catch(e){}window.__glKeep=true;});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://127.0.0.1:8765/index.html?m=play&view=3d&space=normal');await p.waitForTimeout(3500);
 ok(await p.evaluate(()=>!!(window.__gl&&window.__gl.api)),'the GPU tank is running');
 await p.evaluate(async()=>{const s=document.getElementById('shape');s.value='cube';s.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,2500));
   startBreak=()=>{};spawn=()=>{};balls.length=0;window.requestAnimationFrame=()=>0;
   const lt=lavaTick;lavaTick=function(n){const L=lt(n);L.kick[0]=L.kick[1]=L.kick[2]=0;return L;};});
 for(const HZ of [120,60]){
  const r=await p.evaluate(HZ=>{fillState='fill';particles.length=0;balls.length=0;
    for(let i=0;i<450;i++)particles.push({x:CX+(Math.random()-0.5)*R*0.5,y:CY+(Math.random()-0.5)*R*0.5,z:0.35+Math.random()*0.3,vx:0,vy:0,vz:0,r:PR,hue:Math.random(),pooled:true,age:80});
    for(let i=0;i<300;i++)simTick(performance.now());
    let T=performance.now();const real=performance.now.bind(performance);performance.now=()=>T;
    const api=window.__gl.api,out=[];
    // the goo's slow wander follows the music's clock (the audio clock); pin that to the same frame clock, or
    // the test would be measuring how much real time each software-drawn frame took
    const bn=beatNow;beatNow=()=>T/60000*(S.bpm||80);
    try{for(let f=0;f<330;f++){T+=1000/HZ;try{update(T);}catch(e){}balls.length=0;api.render();const g=api.gooShape();
        if(f>=30&&g)out.push([g.c[0],g.c[1],g.c[2],g.w,g.h]);}}   // the first 30 frames: the lumps find this new goo
    finally{performance.now=real;beatNow=bn;}
    const step=[],jerk=[];
    for(let i=1;i<out.length;i++){let m=0;for(let k=0;k<5;k++)m=Math.max(m,Math.abs(out[i][k]-out[i-1][k]));step.push(m);}
    for(let i=1;i<out.length-1;i++){let m=0;for(let k=0;k<5;k++)m=Math.max(m,Math.abs(out[i+1][k]-2*out[i][k]+out[i-1][k]));jerk.push(m);}
    const q=(a,f)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(s.length*f))];};
    return {n:out.length,frozen:step.filter(x=>x<1e-6).length,step95:q(step,0.95),stepMax:q(step,1),jerk95:q(jerk,0.95),jerkMax:q(jerk,1)};},HZ);
  const L='['+HZ+' Hz] ';
  ok(r.n>=290&&r.frozen<=r.n*0.02,L+'the goo is redrawn on every frame ('+r.frozen+' of '+r.n+' frames were a repeat; the old code repeated half of them)');
  ok(r.step95<3&&r.stepMax<6,L+'it flows: frame to frame it moves at most '+r.stepMax.toFixed(1)+' px (95% under '+r.step95.toFixed(1)+')');
  ok(r.jerk95<2&&r.jerkMax<4,L+'and without jolts (jerk: 95% under '+r.jerk95.toFixed(1)+' px, worst '+r.jerkMax.toFixed(1)+')');}
 // 3. cost, each part timed alone, 600 drops (medians, so a busy machine does not decide it)
 const cost=await p.evaluate(()=>{fillState='fill';particles.length=0;
   for(let i=0;i<600;i++)particles.push({x:CX+(Math.random()-0.5)*R*0.8,y:CY+(Math.random()-0.5)*R*0.8,z:0.3+Math.random()*0.4,vx:0,vy:0,vz:0,r:PR,hue:Math.random(),pooled:true,age:80});
   for(let i=0;i<120;i++)gooStep3D(performance.now());
   const ph=[],bd=[],api=window.__gl.api;
   for(let i=0;i<150;i++){const a=performance.now();gooStep3D(performance.now());ph.push(performance.now()-a);bd.push(api.gooBuild());}
   const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[s.length>>1];};return {phys:med(ph),build:med(bd),lumps:api.stats().lumps};});
 ok(cost.phys<1.8,'3. one physics tick of 600 drops takes '+cost.phys.toFixed(2)+' ms (was ~4 ms: the neighbour grid made garbage every tick)');
 ok(cost.build<4,'   rebuilding the surface takes '+cost.build.toFixed(2)+' ms from '+cost.lumps+' lumps (was ~9 ms, every 2nd frame)');
 ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'the goo is smooth'));
 process.exit(FAIL.length?1:0);})();

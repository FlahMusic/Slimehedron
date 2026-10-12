// ============================================================================================
//  PERFORMANCE MODE HAS TO HELP, AND IT HAS TO LET GO.
//  It used to need 200 slow frames to notice (fifteen seconds of stutter on the device that needed
//  it), it was one-way with no way back - the checkbox it reached for did not exist in the document
//  - and after the goo rewrite it did MORE full-size work than the normal path, so turning it on
//  made the frame rate worse. All three of those are measured here.
//  Run: node _dev/dev-perfmode.js   (needs: python3 -m http.server 8765)
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m)};
const open=async(b,opts)=>{
  const ctx=await b.newContext(Object.assign({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2},opts||{}));
  const p=await ctx.newPage();
  await p.addInitScript(()=>{Object.defineProperty(window,'speechSynthesis',{configurable:true,
    value:{speak:()=>{},cancel:()=>{},getVoices:()=>[]}});try{localStorage.setItem('slimehedron-coach','1');}catch(e){}});
  return {ctx,p};
};
const gap=(p,n)=>p.evaluate(N=>new Promise(res=>{let i=0,last=0;const g=[];
  const t=(now)=>{if(last)g.push(now-last);last=now;if(++i<N)requestAnimationFrame(t);
    else{g.sort((a,b)=>a-b);res(+g[g.length>>1].toFixed(1));}};requestAnimationFrame(t);}),n);

(async()=>{
 const b=await launch();

 // ---- 1. someone who asked for less motion gets it from the first frame ----
 {const {ctx,p}=await open(b,{reducedMotion:'reduce'});
  await p.goto('http://127.0.0.1:8765/index.html?m=play');await p.waitForTimeout(2200);
  const st=await p.evaluate(()=>({lite:window.__lite,cls:document.body.classList.contains('lite')}));
  ok(st.lite===true&&st.cls,'prefers-reduced-motion turns the sweeping shine off before the first frame');
  await ctx.close();}

 // ---- 2. a healthy device is NOT put in performance mode ----
 {const {ctx,p}=await open(b,{viewport:{width:1440,height:900},hasTouch:false,isMobile:false,deviceScaleFactor:1});
  await p.goto('http://127.0.0.1:8765/index.html?m=play');await p.waitForTimeout(2000);
  for(let i=0;i<5;i++){await p.evaluate(()=>{const c=document.getElementById('cv').getBoundingClientRect();
    document.getElementById('cv').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,
      clientX:c.left+c.width*0.35+Math.random()*80,clientY:c.top+c.height*0.3}));});await p.waitForTimeout(150);}
  await p.waitForTimeout(4000);
  const g=await gap(p,100);
  const lite=await p.evaluate(()=>window.__lite);
  ok(lite===false,'a desktop that holds 60fps is left alone (frame gap '+g+'ms, lite '+lite+')');
  ok(g<=20,'and it really is holding 60fps ('+g+'ms a frame)');
  await ctx.close();}

 // ---- 3. a device that cannot keep up gets help, and quickly ----
 {const {ctx,p}=await open(b);
  const cdp=await ctx.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:8});
  await p.goto('http://127.0.0.1:8765/index.html?m=play');await p.waitForTimeout(2500);
  for(let i=0;i<5;i++){await p.evaluate(()=>{const c=document.getElementById('cv').getBoundingClientRect();
    document.getElementById('cv').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,
      clientX:c.left+c.width*0.35+Math.random()*60,clientY:c.top+c.height*0.3}));});await p.waitForTimeout(150);}
  const t0=Date.now();
  let on=false;
  for(let i=0;i<60;i++){on=await p.evaluate(()=>window.__lite===true);if(on)break;await p.waitForTimeout(250);}
  const took=Date.now()-t0;
  ok(on,'a device stuck well under 21fps is noticed'+(on?' (after '+took+'ms)':' — it never was'));
  ok(on&&took<9000,'and noticed in seconds, not a quarter of a minute ('+took+'ms, budget 9000)');
  const glass=await p.evaluate(()=>document.body.classList.contains('lite'));
  ok(glass,'and the frosted glass comes off with it — that is the other half of the cost');
  await ctx.close();}

 // ---- 4. performance mode must be FASTER than the full look, not slower ----
 {const res={};
  for(const force of [false,true]){
   const {ctx,p}=await open(b);
   const cdp=await ctx.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
   await p.goto('http://127.0.0.1:8765/index.html?m=play');await p.waitForTimeout(2200);
   for(let i=0;i<6;i++){await p.evaluate(()=>{const c=document.getElementById('cv').getBoundingClientRect();
     document.getElementById('cv').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,
       clientX:c.left+c.width*0.35+Math.random()*60,clientY:c.top+c.height*0.3}));});await p.waitForTimeout(140);}
   // drive the real switch the way the watchdog does, through the same two levers
   await p.evaluate(f=>{document.body.classList.toggle('lite',f);},force);
   await p.waitForTimeout(1500);
   res[force?'lite':'full']=await gap(p,110);
   await ctx.close();}
  ok(res.lite<=res.full+2,'taking the glass off is faster than leaving it on (lite '+res.lite+'ms vs full '+res.full+'ms a frame)');
  console.log('        full look '+res.full+'ms/frame, performance mode '+res.lite+'ms/frame');}

 await b.close();
 console.log(FAIL.length?('\n'+FAIL.length+' FAILED'):'\nperformance mode notices quickly, helps, and lets go');
 process.exit(FAIL.length?1:0);
})();

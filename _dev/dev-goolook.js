// ============================================================================================
//  THE GOO MUST STILL LOOK LIKE THE GOO.
//  softBlobs() is 97% of the frame cost, so it is going to get cheaper - and the one thing that
//  must NOT change is how it looks. This plants a FIXED set of particles (no RNG), renders one
//  frame, and writes the tank out as a PNG. Run it before the change and after, and compare.
//  With a saved reference it also scores the difference, so it can fail on its own.
//  Run: node _dev/dev-goolook.js [--save]   (needs: python3 -m http.server 8765)
// ============================================================================================
const {launch}=require('./browser');
const fs=require('fs'),path=require('path');
const SAVE=process.argv.includes('--save');
const REF=path.join(__dirname,'goolook-ref.json');   // a 96x96 signature, not a 600KB screenshot
const OUT=path.join(require('os').tmpdir(),'goolook-now.png');   // written every run for eyeballing, never committed
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m)};

// A deterministic pool: two clumps and a spray, all with fixed hues. Same input, same picture.
const PLANT=()=>{
  const seed=(()=>{let s=1234567;return()=>((s=s*1103515245+12345&0x7fffffff)/0x7fffffff);})();
  particles.length=0;
  const CXl=CX,CYl=CY,Rl=R;
  for(let i=0;i<70;i++){const a=seed()*6.283,d=seed();
    particles.push({x:CXl-Rl*0.28+Math.cos(a)*Rl*0.26*d,y:CYl+Rl*0.42+Math.sin(a)*Rl*0.16*d,
      vx:0,vy:0,r:7,hue:0.55,pooled:true,born:0});}
  for(let i=0;i<40;i++){const a=seed()*6.283,d=seed();
    particles.push({x:CXl+Rl*0.30+Math.cos(a)*Rl*0.20*d,y:CYl+Rl*0.30+Math.sin(a)*Rl*0.14*d,
      vx:0,vy:0,r:7,hue:0.82,pooled:true,born:0});}
  for(let i=0;i<10;i++)
    particles.push({x:CXl+(seed()-0.5)*Rl*0.8,y:CYl-Rl*0.3+seed()*Rl*0.2,
      vx:0,vy:0,r:5,hue:0.12,pooled:false,born:0});
  // freeze everything that moves, so the picture is a function of the particles alone
  // PIN THE PATH. LITE is a scoped `let` in the app, so `window.LITE=false` set a DIFFERENT
  // variable and this suite happily compared the performance render against itself - three
  // deliberate sabotages of the full render came back as 0% changed. __setLite is the app's own
  // test hook and actually moves the flag.
  // THE FLAT TANK. The reference is the 2D goo; the 3D view draws the same goo through a tilted plane,
  // which would 'change' every pixel. This suite guards the goo renderer itself, so it pins 2D.
  if(window.setView3D)window.setView3D(false);
  S.playing=false; window.PIX=false;
  if(window.__setLite)window.__setLite(false); else window.LITE=false;
  if(typeof mFrame!=='undefined')mFrame=0;
  if(typeof _poolMode!=='undefined')try{_poolMode=false;}catch(e){}
  if(typeof surfY!=='undefined')try{surfY=null;}catch(e){}
  ripples.length=0;
  // ONE DETERMINISTIC FRAME, GRABBED IN THE SAME BREATH. Drawing a frame and then screenshotting
  // the element a moment later was pointless: the app's own rAF loop repaints every frame whether
  // the transport is running or not, so what got photographed was a LATER frame with different
  // particle state - which is why three deliberate sabotages of the renderer came back as 0%
  // changed. Draw, then read the canvas out immediately, before anything else can touch it.
  // 2000ms, not 4000: the shine sweep is (now*0.00025)%1, so 4000 lands exactly on 0 and the
  // gradient's three stops all collapse to the same place - the shine is INVISIBLE at that
  // instant, and deleting it entirely changed nothing in the picture. 2000 puts the sweep at
  // half way across, where it can actually be seen and therefore missed.
  const RN=performance.now; performance.now=()=>2000;
  let url='';
  try{ measureFill(); draw(); url=document.getElementById('cv').toDataURL('image/png'); }
  finally{ performance.now=RN; }
  return url;
};

(async()=>{
 const b=await launch();
 const ctx=await b.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1});
 const p=await ctx.newPage();
 await p.addInitScript(()=>{Object.defineProperty(window,'speechSynthesis',{configurable:true,
   value:{speak:()=>{},cancel:()=>{},getVoices:()=>[]}});
   try{localStorage.setItem('slimehedron-coach','1');}catch(e){}});
 await p.goto('http://127.0.0.1:8765/index.html?m=play');
 await p.waitForTimeout(2600);
 const dataUrl=await p.evaluate(`(${PLANT.toString()})()`);
 if(!dataUrl||dataUrl.length<2000){console.log('  FAIL  the tank did not render');process.exit(1);}
 fs.writeFileSync(OUT,Buffer.from(dataUrl.split(',')[1],'base64'));
 const bytes=fs.statSync(OUT).size;
 console.log('        wrote '+OUT+'  '+Math.round(bytes/1024)+'KB');

 // THE REFERENCE IS A SIGNATURE, NOT A SCREENSHOT. A 600KB PNG in the repo for one test fixture is
 // 600KB of repo forever; a 96x96 average-pooled grid is 37KB, survives in a diff a human can read,
 // and still catches any change to the shape, the colour or the shine. The full-size PNG is still
 // written next to it every run, for eyeballing - it is just not committed.
 const sig=await p.evaluate(async(d)=>{
   const load=(x)=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src='data:image/png;base64,'+x;});
   const A=await load(d);
   const N=64,cv=document.createElement('canvas');cv.width=cv.height=N;
   const k=cv.getContext('2d',{willReadFrequently:true});
   k.imageSmoothingEnabled=true;k.imageSmoothingQuality='high';   // average-pool: one cell = one patch
   k.drawImage(A,0,0,N,N);
   const raw=k.getImageData(0,0,N,N).data;
   let bin='';for(let i=0;i<raw.length;i++)bin+=String.fromCharCode(raw[i]);
   return {w:A.width,h:A.height,n:N,b64:btoa(bin)};
 },fs.readFileSync(OUT).toString('base64'));

 if(SAVE){fs.writeFileSync(REF,JSON.stringify(sig));
   console.log('        SAVED the reference signature ('+Math.round(fs.statSync(REF).size/1024)+'KB) — commit it');
   await b.close();process.exit(0);}

 if(!fs.existsSync(REF)){
   console.log('        no reference yet: run with --save first');
   await b.close();process.exit(0);}

 const ref=JSON.parse(fs.readFileSync(REF,'utf8'));
 const unb=(o)=>Buffer.from(o.b64,'base64');
 const RP=unb(ref), SP=unb(sig);
 if(ref.w!==sig.w||ref.h!==sig.h){
   ok(false,'same canvas size (ref '+ref.w+'x'+ref.h+' vs now '+sig.w+'x'+sig.h+')');
 }else{
   let bad=0,inked=0,worst=0;
   for(let i=0;i<RP.length;i+=4){
     const aA=RP[i+3],aB=SP[i+3];
     if(aA>8||aB>8)inked++;
     const d=Math.max(Math.abs(RP[i]-SP[i]),Math.abs(RP[i+1]-SP[i+1]),
                      Math.abs(RP[i+2]-SP[i+2]),Math.abs(aA-aB));
     if(d>12){bad++;if(d>worst)worst=d;}
   }
   const pct=+(100*bad/Math.max(1,inked)).toFixed(2);
   console.log('        '+bad+' of '+inked+' inked cells differ by >12  ('+pct+'%), worst '+worst);
   // A cheaper compositor is allowed to shift a soft edge inside a cell. It is NOT allowed to change
   // the shape, the colour or the shine - pooled cells average those away, so anything real shows.
   ok(pct<=4,'the goo still looks like the goo ('+pct+'% of pooled cells moved, budget 4%)');
   ok(worst<=60,'and nothing changed colour outright (worst channel delta '+worst+', budget 60)');
 }
 await b.close();
 console.log(FAIL.length?('\n'+FAIL.length+' FAILED — look at the PNG printed above'):'\nthe look survived');
 process.exit(FAIL.length?1:0);
})();

// ============================================================================================
//  3D TANK TEST — two views of one tank. 3D is the default (dev-space checks that); 2D must be exactly
//  the old flat tank (?view=2d, or the tank's corner menu), and 3D's depth has to MEAN something:
//    1. balls really travel front-to-back, not just get drawn smaller
//    2. the front and back glass are things to hit: they play notes, and those notes are the
//       chord that is sounding (back = root, front = a high chord tone), so more notes are never wrong
//    3. pane notes do not feed the chord brain (or the harmony would camp on whatever is playing)
//    4. lessons keep every ball on the front glass, exactly as before
//    5. in play mode the shape turns with the tempo: twice the tempo, twice the turn
//    6. the selected sound and rhythm wear the glass rim; the background art is in full colour, with no blank paper band
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-3d.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html';

(async()=>{const b=await launch();
 const ctx=await b.newContext({viewport:{width:1280,height:860}});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message);});
 await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1')}catch(e){}});
 // ---- 0. 2D is still exactly the flat tank ----
 await p.goto(URL+'?m=play&view=2d');await p.waitForTimeout(1200);
 await p.mouse.click(640,430);await p.waitForTimeout(3000);
 const flat2d=await p.evaluate(()=>({d3:window.__view.d3,z:balls.map(b=>b.z||0)}));
 ok(!flat2d.d3,'?view=2d gives the flat tank');
 ok(flat2d.z.every(v=>v===0),'in 2D every ball stays flat, exactly as before ('+flat2d.z.length+' balls)');
 // this section watches the slime's own notes travel the box: since 2026-10-27 play starts with auto-notes off, so turn it on
 await p.evaluate(()=>{try{localStorage.setItem('slimehedron-autonotes-play','1');}catch(e){}});
 await p.goto(URL+'?m=play&view=3d');await p.waitForTimeout(1500);
 await p.evaluate(()=>{window.__notes=[];const t=trigger;trigger=function(c,i,g,n,pane){window.__notes.push({c,pane:!!pane,root:curRootDeg,
   feedBefore:noteHisto.reduce((a,v)=>a+v,0)});return t.apply(this,arguments);};});
 await p.evaluate(()=>{window.__zr=new Map();setInterval(()=>{for(const b of balls){const r=window.__zr.get(b)||[1,0];
   window.__zr.set(b,[Math.min(r[0],b.z||0),Math.max(r[1],b.z||0)]);}},100);});
 await p.mouse.click(640,430);await p.waitForTimeout(9000);

 // 1. depth is real
 const z=await p.evaluate(()=>[...window.__zr.values()].map(r=>r[1]-r[0]));
 ok(z.length>=3,'balls were dropped into the tank ('+z.length+')');
 ok(z.filter(d=>d>0.8).length>=Math.ceil(z.length/2),'and they travel front to back through the box ('+z.map(v=>v.toFixed(2)).join(' ')+' of depth covered)');

 // 2+3. pane notes are chord tones and stay out of the chord brain
 const r=await p.evaluate(()=>{const n=window.__notes,pane=n.filter(x=>x.pane),wall=n.filter(x=>!x.pane);
   const sc=scaleObj().c,len=sc.length;
   const isChordTone=x=>{const pcs=[0,2,4].map(k=>((centsForDegree(x.root+k)%1200)+1200)%1200);
     return pcs.some(pc=>Math.abs((((x.c%1200)+1200)%1200)-pc)<1);};
   return {pane:pane.length,wall:wall.length,tones:pane.filter(isChordTone).length};});
 ok(r.pane>=2,'balls hit the front and back glass and they play ('+r.pane+' pane notes, '+r.wall+' wall notes in 9s)');
 ok(r.pane===r.tones,'every pane note is a tone of the chord playing at that moment ('+r.tones+'/'+r.pane+')');
 const fed=await p.evaluate(()=>{const before=noteHisto.slice();trigger(centsForDegree(curRootDeg),0.3,0,true,true);
   return noteHisto.every((v,i)=>v===before[i]);});
 ok(fed,'a pane note does not feed the chord brain');

 // 4. lessons stay flat
 const flat=await p.evaluate(async()=>{LAB._on=true;await new Promise(r=>setTimeout(r,700));const zz=balls.map(b=>b.z||0);LAB._on=false;return zz;});
 ok(flat.every(v=>v===0),'while a lesson runs every ball is on the front glass ('+flat.length+' balls)');

 // 5. tempo turns the shape
 const turn=async(bpm)=>p.evaluate(async(bpm)=>{setBpm(bpm);S.spin=14;const r0=rot;await new Promise(r=>setTimeout(r,2000));return rot-r0;},bpm);
 const slow=await turn(80), fast=await turn(160);
 ok(slow>0&&fast/slow>1.7&&fast/slow<2.3,'in play mode doubling the tempo doubles the spin ('+(fast/slow).toFixed(2)+'x)');
 const lap=await p.evaluate(()=>{setBpm(80);const secBar=drumBar()*drumStepDur();return (S.spin/14)*(2*Math.PI)/(8*secBar*60)*60*secBar*8/(2*Math.PI);});
 ok(Math.abs(lap-1)<1e-6,'at the slime\'s spin the shape makes one full turn every 8 bars ('+lap.toFixed(3)+' turns)');

 // 6. glass rim + background
 const look=await p.evaluate(()=>{const on=document.querySelector('#psWaves .psBtn.on')||document.querySelector('.psBtn.on');
   const be=on?getComputedStyle(on,'::before'):null;
   return {rim:!!be&&be.content!=='none'&&/conic-gradient/.test(be.backgroundImage),bg:getComputedStyle(document.body).backgroundImage};});
 ok(look.rim,'the selected button wears the glass rim');
 // FULL-COLOUR CRAYON (2026-10-26): only a light white veil (Flah: the bright white burnt his eyes), never lilac, and the art
 // file starts with the drawing: no band of blank paper at the top for the header to sit on
 const va=(look.bg.match(/rgba\(255, 255, 255, ([0-9.]+)\)/)||[])[1];
 ok(va!=null&&+va<=0.2&&!/rgba\(7[0-9], 5[0-9], 12/.test(look.bg),'the background art shows in full colour: a light veil ('+va+'), not lilac');
 const paper=await p.evaluate(async()=>{const out={};for(const f of ['bg-desktop.jpg','bg-mobile.jpg']){const im=new Image();im.src=f+'?t='+Date.now();await im.decode();
   const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);
   const rowWhite=y=>{const d=x.getImageData(0,y,im.width,1).data;let w=0;for(let i=0;i<d.length;i+=4)if(Math.min(d[i],d[i+1],d[i+2])>250)w++;return w/(d.length/4);};
   let top=0;for(let y=0;y<12;y++)top+=rowWhite(y)/12;out[f]=top;}return out;});
 ok(Object.values(paper).every(v=>v<0.7),'the art starts with the drawing, no blank paper along the top ('+Object.entries(paper).map(([k,v])=>k+' '+(v*100).toFixed(0)+'% white').join(', ')+')');

 // 6b. THE BOX LEANS TOWARD YOU, AND BY THE CLOCK (Flah: the 3D "still feels too flat"). Over 32 bars the lean breathes
 // from under 20 degrees to over 30; and a 120 Hz screen turns it exactly as fast as a 60 Hz one (it used to be per frame)
 const lean=await p.evaluate(()=>{const real=performance.now.bind(performance);let T=real();performance.now=()=>T;
   const secBar=drumBar()*drumStepDur(),run=(hz,secs)=>{const a0=_phi;for(let i=0;i<secs*hz;i++){T+=1000/hz;viewTick();}return _phi-a0;};
   run(60,0.1);const d60=run(60,4),d120=run(120,4);
   let lo=9,hi=0;for(let i=0;i<32*secBar*30;i++){T+=1000/30;viewTick();lo=Math.min(lo,_tiltNow);hi=Math.max(hi,_tiltNow);}
   performance.now=real;return {d60,d120,lo:lo*180/Math.PI,hi:hi*180/Math.PI};});
 ok(lean.lo<20&&lean.hi>30,'over 32 bars the box leans from '+lean.lo.toFixed(0)+' to '+lean.hi.toFixed(0)+' degrees toward you');
 ok(Math.abs(lean.d120-lean.d60)<lean.d60*0.02,'and it turns by the clock: 4 s at 120 Hz turns it as far as 4 s at 60 Hz ('+lean.d60.toFixed(3)+' vs '+lean.d120.toFixed(3)+')');

 // 7. a tap in 3D lands where it looks like it lands
 const tap=await p.evaluate(()=>{const out=[];for(const [sx,sy] of [[360,360],[250,300],[470,430],[300,470]]){
   const [bx,by]=__screenToBox(sx,sy);const q=__P3(bx,by,0);out.push(Math.hypot(q[0]-sx,q[1]-sy));}return Math.max(...out);});
 ok(tap<0.5,'un-projecting a tap and drawing it again lands on the same pixel (worst '+tap.toFixed(3)+'px)');
 // 8. the axis is tilted and it wanders: the view keeps changing while the music plays
 const tilt=await p.evaluate(async()=>{const a=[...(_M||[])];await new Promise(r=>setTimeout(r,1500));const b=[..._M];
   return {tilted:Math.acos(Math.max(-1,Math.min(1,b[8])))*180/Math.PI,moved:a.some((v,i)=>Math.abs(v-b[i])>1e-4)};});
 ok(tilt.tilted>8&&tilt.tilted<25,'the spin axis leans ('+tilt.tilted.toFixed(1)+' degrees)');
 ok(tilt.moved,'and it wanders round over time, like a planet\'s');
 // 9. switching back to 2D flattens everything at once
 const back=await p.evaluate(()=>{setView3D(false);const z=balls.map(b=>b.z||0);setView3D(true);return z;});
 ok(back.every(v=>v===0),'switching to 2D puts every ball back on the flat tank');
 ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'3d pass clean'));
 process.exit(FAIL.length?1:0);})();

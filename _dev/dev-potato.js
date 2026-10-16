// ============================================================================================
//  POTATO TEST — what a frame of the tank costs, 2D vs 3D, on a fast machine and on slow phones
//  (Chrome's CPU throttle at 4x and 8x stands in for a cheap or old phone).
//  It times the app's own draw() and physics tick directly, with the tank busy (balls, goo,
//  spray), because headless Chromium's frame clock is not the phone's. 16.7ms is one 60fps frame.
//  The absolute numbers depend on the machine running the test, so the rules are RELATIVE,
//  measured side by side on the same machine with the same tank contents:
//    * 3D costs at most a third more than 2D, on every device
//    * the portal and curved spaces cost at most a third more than the normal 3D tank
//    * performance mode makes 3D cheaper, not dearer
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-potato.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html';
const DEV=[{n:'desktop',w:1440,h:900,cpu:1,mob:false},{n:'phone 4x slower',w:390,h:844,cpu:4,mob:true},{n:'potato 8x slower',w:360,h:740,cpu:8,mob:true}];

(async()=>{const b=await launch();const res={};
 for(const d of DEV)for(const view of ['2d','3d','3d-curved','3d-portal'])for(const lite of [false,true]){
  if(lite&&view!=='3d')continue;
  const ctx=await b.newContext({viewport:{width:d.w,height:d.h},isMobile:d.mob,hasTouch:d.mob,deviceScaleFactor:d.mob?2:1});
  const p=await ctx.newPage();
  await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1')}catch(e){}});
  const [vw,sp]=view.split('-');
  await p.goto(URL+'?m=play&view='+vw+'&space='+(sp||'normal'));await p.waitForTimeout(1500);
  if(sp)await p.evaluate(()=>{const s=document.getElementById('shape');s.value='6';s.dispatchEvent(new Event('change'));});
  await p.mouse.click(d.w/2,d.h*0.5);await p.waitForTimeout(6000);   // let the tank fill: balls, goo, spray
  await p.evaluate(l=>{if(window.__setLite)window.__setLite(l);
    // the same tank every time: 9 balls and 90 drops of goo, from a seeded random
    Math.random=__mul32(1234);balls.length=0;particles.length=0;
    for(let i=0;i<9;i++)spawn(CX+Math.cos(i*0.7)*R*0.4,CY+Math.sin(i*0.7)*R*0.4);
    for(let i=0;i<90;i++)particles.push({x:CX+(Math.random()-0.5)*R*0.9,y:CY+R*0.55+Math.random()*R*0.3,z:0.5,vx:0,vy:0,r:7,hue:Math.random(),pooled:i>15,age:80,born:0});
    for(let i=0;i<30;i++)simTick(performance.now());},lite);
  const cdp=await ctx.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:d.cpu});
  const ms=await p.evaluate(()=>{const N=60,t=[];
    for(let i=0;i<N;i++){const a=performance.now();simTick(performance.now());draw();t.push(performance.now()-a);}
    t.sort((x,y)=>x-y);return {med:t[N>>1],p90:t[Math.floor(N*0.9)],balls:balls.length,parts:particles.length};});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
  const k=d.n+' / '+view+(lite?' / performance mode':'');res[k]=ms;
  console.log('        '+k.padEnd(42)+' median '+ms.med.toFixed(1)+'ms  p90 '+ms.p90.toFixed(1)+'ms  ('+ms.balls+' balls, '+ms.parts+' goo)');
  await ctx.close();}
 const g=(k)=>res[k]?res[k].med:999;
 for(const d of DEV){const a=g(d.n+' / 2d'),c=g(d.n+' / 3d');
   ok(c<=a*1.33,d.n+': 3D costs at most a third more than 2D ('+c.toFixed(1)+' vs '+a.toFixed(1)+'ms)');
   for(const sp of ['curved','portal']){const x=g(d.n+' / 3d-'+sp);
     ok(x<=c*1.33,d.n+': 3D '+sp+' costs at most a third more than normal 3D ('+x.toFixed(1)+' vs '+c.toFixed(1)+'ms)');}}
 ok(g('potato 8x slower / 3d / performance mode')<=g('potato 8x slower / 3d')*1.05,'performance mode makes 3D cheaper, not dearer ('+g('potato 8x slower / 3d / performance mode').toFixed(1)+' vs '+g('potato 8x slower / 3d').toFixed(1)+'ms)');
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'potato pass clean'));
 process.exit(FAIL.length?1:0);})();

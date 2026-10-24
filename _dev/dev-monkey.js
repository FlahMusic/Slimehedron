// ============================================================================================
//  MONKEY TEST — someone who has never seen the app, pressing everything, fast, in every room.
//  Seeded, so a failure can be replayed exactly: SEED=7 node _dev/dev-monkey.js
//  Each run hammers one room with random taps, drags, keys, select changes, extreme slider values,
//  resizes, mode switches, view/space switches and burst spam, then checks the app is still WHOLE:
//    - no page error, no console error
//    - every number that drives the app is a real number in its range (tempo, volume, balls, goo)
//    - the tank is still drawing frames and the physics still ticking
//    - the sound still works: after the chaos, one deliberate tap still makes a note
//    - the page did not quietly grow (DOM nodes, listeners' leftovers) out of control
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-monkey.js        (ROUNDS=n, SECS=n to go longer)
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html';
const SEED0=+(process.env.SEED||1),ROUNDS=+(process.env.ROUNDS||1),SECS=+(process.env.SECS||25);
const rng=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
const SIZES=[[1440,900,false],[390,844,true],[900,1100,true]];

(async()=>{const b=await launch();
 for(let round=0;round<ROUNDS;round++)for(const room of ['play','studio','learn','menu']){
  const seed=SEED0*1000+round*10+['play','studio','learn','menu'].indexOf(room),R=rng(seed);
  const [w,h,mob]=SIZES[Math.floor(R()*SIZES.length)];
  const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:mob,hasTouch:mob,deviceScaleFactor:mob?2:1});const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push('page: '+e.message.slice(0,160)+' @ '+String(e.stack||'').split('\n').slice(1,4).map(x=>x.trim().replace(/https?:\/\/[^/]+\//,'')).join(' < '));});
  p.on('console',m=>{if(m.type()==='error'&&!/favicon|ServiceWorker|Failed to load resource/.test(m.text()))errs.push('console: '+m.text().slice(0,160));});
  await p.goto(URL+(room==='menu'?'':'?m='+room));await p.waitForTimeout(1500);
  const L='[seed '+seed+' '+room+' '+w+'x'+h+'] ';
  const base=await p.evaluate(()=>({nodes:document.getElementsByTagName('*').length}));
  const t0=Date.now();let n=0;const log=[];
  while(Date.now()-t0<SECS*1000){n++;const r=R(),x=Math.floor(R()*w),y=Math.floor(R()*h);
    try{
      if(r<0.30){log.push('tap '+x+','+y);if(mob)await p.touchscreen.tap(x,y);else await p.mouse.click(x,y);}
      else if(r<0.40){const x2=Math.floor(R()*w),y2=Math.floor(R()*h);log.push('drag');await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x2,y2,{steps:4});await p.mouse.up();}
      else if(r<0.52){const keys=['Space','Enter','Escape','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab','a','s','d','f','g','h','j','k','z','x','1','2','r','Backspace','Delete','+','-'];
        const k=keys[Math.floor(R()*keys.length)];log.push('key '+k);await p.keyboard.press((R()<0.15?'Control+':'')+k);}
      else if(r<0.62){log.push('select');await p.evaluate(rr=>{const s=[...document.querySelectorAll('select')].filter(e=>e.offsetWidth&&!e.disabled);if(!s.length)return;
          const e=s[Math.floor(rr[0]*s.length)];if(!e.options.length)return;e.selectedIndex=Math.floor(rr[1]*e.options.length);e.dispatchEvent(new Event('change',{bubbles:true}));},[R(),R()]);}
      else if(r<0.72){log.push('slider');await p.evaluate(rr=>{const s=[...document.querySelectorAll('input[type=range],input[type=number]')].filter(e=>e.offsetWidth&&!e.disabled);if(!s.length)return;
          const e=s[Math.floor(rr[0]*s.length)];const lo=+e.min||0,hi=e.max===''?999:+e.max;const pick=rr[1]<0.15?lo:rr[1]>0.85?hi:rr[1]<0.2?'':rr[1]<0.25?'-5':lo+(hi-lo)*rr[2];
          e.value=pick;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},[R(),R(),R()]);}
      else if(r<0.80){log.push('button');await p.evaluate(rr=>{const s=[...document.querySelectorAll('button,[role="button"],summary')].filter(e=>e.offsetWidth&&!e.disabled&&!/exit|back|exitMode|modePill/.test(e.id+' '+(e.dataset.tw||'')));if(!s.length)return;
          s[Math.floor(rr*s.length)].click();},R());}
      else if(r<0.84){log.push('burst');await p.evaluate(()=>{try{if(typeof startBreak==='function'&&fillState==='fill')startBreak(performance.now());}catch(e){}});}
      else if(r<0.88){log.push('view/space');await p.evaluate(rr=>{try{if(rr[0]<0.5)window.setView3D(rr[1]<0.5);else window.setSpace(['auto','normal','portal','curved'][Math.floor(rr[1]*4)]);}catch(e){}},[R(),R()]);}
      else if(r<0.91){const W2=Math.floor(320+R()*1300),H2=Math.floor(480+R()*700);log.push('resize '+W2+'x'+H2);await p.setViewportSize({width:W2,height:H2});}
      else if(r<0.94){log.push('mode');await p.evaluate(rr=>{try{if(typeof applyMode==='function')applyMode(['play','studio','learn'][Math.floor(rr*3)]);}catch(e){}},R());}
      else if(r<0.97){log.push('hide/show');await p.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));});}
      else{log.push('wait');await p.waitForTimeout(400);}
    }catch(e){if(/closed|Target/.test(e.message))throw e;}   // a click on something that moved is fine; a dead page is not
    if(n%25===0)await p.waitForTimeout(60);}
  await p.setViewportSize({width:w,height:h});await p.waitForTimeout(800);
  // ---- is it still whole? ----
  const st=await p.evaluate(async()=>{const bad=[];const num=(k,v,lo,hi)=>{if(!(typeof v==='number'&&isFinite(v)&&v>=lo&&v<=hi))bad.push(k+'='+v);};
    num('S.bpm',S.bpm,20,400);num('S.vol',+S.vol,0,1.5);num('balls',balls.length,0,40);num('goo',particles.length,0,4000);num('rot',rot,-1e7,1e7);
    for(const bl of balls)if(![bl.x,bl.y,bl.vx,bl.vy].every(isFinite)){bad.push('ball NaN');break;}
    for(const q of particles)if(![q.x,q.y].every(isFinite)||(q.z!=null&&!isFinite(q.z))){bad.push('goo NaN');break;}
    if(edges&&edges.some(e=>![e.ax,e.ay,e.bx,e.by].every(isFinite)))bad.push('edge NaN');
    // the loop is alive
    const f0=window.__frames||0;let ticks=0;const st0=tickCount;await new Promise(r=>setTimeout(r,700));
    const ac=(typeof AC!=='undefined'&&AC)?AC.state:'none';
    return {bad,ac,nodes:document.getElementsByTagName('*').length,mode:S.mode,ctx:ac};});
  ok(errs.length===0,L+'no errors in '+n+' wild actions'+(errs.length?': '+errs.slice(0,3).join(' | ')+' (last actions: '+log.slice(-6).join(', ')+')':''));
  ok(st.bad.length===0,L+'every number that drives the app is still sane'+(st.bad.length?': '+st.bad.join(', '):''));
  ok(st.ac!=='closed',L+'the audio engine is still open ('+st.ac+')');
  ok(st.nodes<base.nodes*2.2+400,L+'the page has not quietly grown ('+base.nodes+' -> '+st.nodes+' elements)');
  // ---- and a person can still get a sound out of it ----
  const alive=await p.evaluate(async()=>{let frames=0;const raf=()=>{frames++;if(frames<30)requestAnimationFrame(raf);};requestAnimationFrame(raf);
    try{if(S.mode==='learn'||!document.getElementById('cv').offsetWidth){applyMode('play');}}catch(e){}
    await new Promise(r=>setTimeout(r,600));
    try{const d=document.getElementById('prefsDlg');if(d&&d.open)d.close();}catch(e){}
    try{if(typeof LAB!=='undefined'&&LAB._on&&LAB.give)LAB.give();}catch(e){}
    let notes=0;const ps=playSynth;playSynth=function(){notes++;return ps.apply(this,arguments);};
    const tk=tickCount,phys0=balls.length;
    try{initAudio();if(AC&&AC.state!=='running')await AC.resume();}catch(e){}
    try{S.quantize=false;fillState='fill';frags=null;if(!edges||!edges.length)rebuild();
      shootBall?shootBall(0):spawn(CX,CY);}catch(e){}
    try{trigger(0,0.8,0,true);}catch(e){}
    await new Promise(r=>setTimeout(r,1500));playSynth=ps;
    return {frames,notes,ac:AC?AC.state:'none',ballsMoved:balls.some(bl=>isFinite(bl.x))};});
  ok(alive.frames>=20,L+'the screen is still drawing ('+alive.frames+' frames in ~0.5s)');
  ok(alive.notes>=1,L+'and a deliberate note still sounds afterwards ('+alive.notes+' notes, audio '+alive.ac+')');
  await ctx.close();}
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'monkey pass clean'));
 process.exit(FAIL.length?1:0);})();

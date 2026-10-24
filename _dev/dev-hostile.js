// ============================================================================================
//  HOSTILE TEST — the worst things a real device, browser or person will do, one at a time.
//  Each one must leave an app that still opens, still draws and still makes a sound:
//    1. a corrupted save (garbage JSON, wrong types, absurd numbers, values the menus do not offer)
//    2. storage that throws (private browsing, blocked cookies)
//    3. no Web Audio at all, and an audio engine that refuses to start
//    4. absurd typed values: tempo 0, -5, 99999, "abc", empty
//    5. a ball-drop flood (500 in a second) and a MIDI-note flood (2000 notes)
//    6. switching rooms 40 times as fast as possible
//    7. the tab asleep for ten minutes, then woken
//    8. a 240x320 screen and a 3840x2160 screen
//    9. a long session (simulated minutes of play): nothing that should stay small keeps growing
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-hostile.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html';

(async()=>{const b=await launch();
 const open=async(q,init,vp)=>{const ctx=await b.newContext({viewport:vp||{width:1100,height:850}});const p=await ctx.newPage();
   const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message.slice(0,140)+' @ '+String(e.stack||'').split('\n')[1]);});
   if(init)await p.addInitScript(init);
   await p.goto(URL+(q||''));await p.waitForTimeout(1500);return {ctx,p,errs};};
 // can a person still use it: go to play, drop a ball, hear a note
 const STILL=async(p)=>p.evaluate(async()=>{let notes=0;const ps=window.playSynth;
   try{if(S.mode!=='play')applyMode('play');}catch(e){}
   await new Promise(r=>setTimeout(r,500));
   try{window.playSynth=function(){notes++;return ps.apply(this,arguments);};playSynth=window.playSynth;}catch(e){}
   let frames=0;await new Promise(r=>{const f=()=>{frames++;if(frames<20)requestAnimationFrame(f);else r();};requestAnimationFrame(f);setTimeout(r,2500);});
   try{trigger(0,0.8,0,true);}catch(e){}
   try{playSynth=ps;}catch(e){}
   const sane=isFinite(S.bpm)&&S.bpm>=20&&S.bpm<=400&&balls.every(bl=>isFinite(bl.x)&&isFinite(bl.y));
   return {notes,frames,sane,bpm:S.bpm,mode:S.mode};});

 // ---- 1. corrupted saves ----
 for(const [tag,blob] of [['garbage JSON','{{{not json'],['wrong types','{"r":{"bpmTop":"banana","vol":null,"spin":[1,2]},"s":{"drumKit":42,"scale":{"x":1},"root":"zz"},"t":{"quantT":"yes"},"seg":{"waveSeg":99}}'],
                          ['absurd numbers','{"r":{"bpmTop":"1e308","vol":"-1e9","chaos":"NaN","rainRate":"Infinity"},"s":{"drumSig":"13/7","divSel":"0"}}'],
                          ['a kit the menu no longer offers','{"s":{"kitStyle":"electronic","drumKit":"bossa"}}']]){
   const r2=await (async()=>{const c=await b.newContext({viewport:{width:1100,height:850}});const pg=await c.newPage();const er=[];pg.on('pageerror',e=>er.push(e.message.slice(0,140)+' @ '+String(e.stack||'').split('\n')[1]));
     await pg.addInitScript(bl=>{try{localStorage.setItem('slimehedron2',bl);localStorage.setItem('slimehedron-coach','1');}catch(e){}},blob);
     await pg.goto(URL+'?m=studio');await pg.waitForTimeout(1800);const s=await STILL(pg);await c.close();return {s,er};})();
   ok(r2.er.length===0,'['+tag+' save] the app opens without an error'+(r2.er.length?': '+r2.er[0]:''));
   ok(r2.s.sane&&r2.s.notes>=1&&r2.s.frames>=10,'['+tag+' save] and still draws and plays (tempo '+r2.s.bpm+', '+r2.s.notes+' notes, '+r2.s.frames+' frames)');}

 // ---- 2. storage that throws ----
 {const {ctx,p,errs}=await open('?m=play',()=>{const thrower={getItem(){throw new Error('denied');},setItem(){throw new Error('denied');},removeItem(){throw new Error('denied');},clear(){},key(){return null;},length:0};
     try{Object.defineProperty(window,'localStorage',{configurable:true,get(){return thrower;}});}catch(e){}});
  const s=await STILL(p);
  ok(errs.length===0,'[storage blocked] no errors'+(errs.length?': '+errs[0]:''));ok(s.sane&&s.notes>=1,'[storage blocked] it still plays ('+s.notes+' notes)');await ctx.close();}

 // ---- 3. no Web Audio / an engine that will not start ----
 for(const [tag,init] of [['no Web Audio',()=>{try{delete window.AudioContext;delete window.webkitAudioContext;window.AudioContext=undefined;window.webkitAudioContext=undefined;}catch(e){}}],
                          ['audio refuses to start',()=>{const A=window.AudioContext;window.AudioContext=class extends A{resume(){return Promise.reject(new Error('NotAllowed'));}};}]]){
   const {ctx,p,errs}=await open('?m=play',init);
   await p.mouse.click(550,425);await p.waitForTimeout(800);
   const s=await p.evaluate(async()=>{let frames=0;await new Promise(r=>{const f=()=>{frames++;if(frames<15)requestAnimationFrame(f);else r();};requestAnimationFrame(f);setTimeout(r,2500);});
     return {frames,balls:balls.length,mode:S.mode,told:!!document.getElementById('noAudioNote')};});
   ok(errs.length===0,'['+tag+'] no errors'+(errs.length?': '+errs[0]:''));
   ok(s.frames>=10,'['+tag+'] the tank still runs silently instead of freezing ('+s.frames+' frames)');
   if(tag==='no Web Audio')ok(s.told,'['+tag+'] and the person is told the browser cannot play sound');await ctx.close();}

 // ---- 4. absurd typed values ----
 {const {ctx,p,errs}=await open('?m=studio',()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');}catch(e){}});
  const r=await p.evaluate(async()=>{const out=[];const n=document.getElementById('bpmNum');
    for(const v of ['0','-5','99999','abc','','1e9','12.3456','NaN']){n.value=v;n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}));
      await new Promise(r=>setTimeout(r,60));out.push(v+'->'+S.bpm);}
    return {out,ok:isFinite(S.bpm)&&S.bpm>=20&&S.bpm<=400};});
  ok(r.ok&&errs.length===0,'[typed tempo] nonsense is refused, the tempo stays real ('+r.out.join(', ')+')'+(errs.length?' ERR '+errs[0]:''));
  const s=await STILL(p);ok(s.notes>=1,'[typed tempo] and it still plays');await ctx.close();}

 // ---- 5. floods ----
 {const {ctx,p,errs}=await open('?m=play');
  const r=await p.evaluate(async()=>{setPlaying(true);for(let i=0;i<500;i++){try{spawn(CX+Math.random()*100,CY);}catch(e){}if(i%50===0)await new Promise(r=>setTimeout(r,20));}
    const afterBalls=balls.length;
    for(let i=0;i<2000;i++){try{noteManual((i%24)*100);}catch(e){}}
    await new Promise(r=>setTimeout(r,800));
    return {balls:afterBalls,manual:(typeof manualNotes!=='undefined'?manualNotes.length:0),pending:pendingNotes.length};});
  ok(r.balls<=40,'[ball flood] 500 drops in a second still leaves a bounded tank ('+r.balls+' balls)');
  ok(r.manual<=200,'[MIDI flood] 2000 notes do not pile up in memory ('+r.manual+' remembered)');
  ok(r.pending<=200,'[flood] the note queue stays small ('+r.pending+')');
  ok(errs.length===0,'[floods] no errors'+(errs.length?': '+errs[0]:''));await ctx.close();}

 // ---- 6. room switching ----
 {const {ctx,p,errs}=await open('?m=play');
  await p.evaluate(async()=>{for(let i=0;i<40;i++){applyMode(['play','studio','learn'][i%3]);await new Promise(r=>setTimeout(r,i%5?5:60));}});
  await p.waitForTimeout(800);const s=await STILL(p);
  const dup=await p.evaluate(()=>{const ids={};let d=0;for(const e of document.querySelectorAll('[id]')){if(ids[e.id])d++;ids[e.id]=1;}return d;});
  ok(errs.length===0,'[40 room switches] no errors'+(errs.length?': '+errs[0]:''));
  ok(s.notes>=1&&s.sane,'[40 room switches] it still plays ('+s.notes+' notes)');
  ok(dup===0,'[40 room switches] no element was duplicated ('+dup+' repeated ids)');await ctx.close();}

 // ---- 7. ten minutes asleep ----
 {const {ctx,p,errs}=await open('?m=play');
  await p.mouse.click(550,425);await p.waitForTimeout(1500);
  const r=await p.evaluate(async()=>{const real=performance.now.bind(performance);const off=600000;performance.now=()=>real()+off;   // the clock jumps ten minutes
    await new Promise(r=>setTimeout(r,1500));const st={balls:balls.length,ok:balls.every(bl=>isFinite(bl.x)),tick:lastTick};performance.now=real;return st;});
  ok(r.ok&&errs.length===0,'[ten minutes asleep] waking does not explode the physics or the clock ('+r.balls+' balls)'+(errs.length?' ERR '+errs[0]:''));
  const s=await STILL(p);ok(s.notes>=1,'[ten minutes asleep] and it still plays');await ctx.close();}

 // ---- 8. tiny and huge screens ----
 for(const vp of [{width:240,height:320},{width:3840,height:2160}]){
  const {ctx,p,errs}=await open('',null,vp);
  for(const m of ['play','studio','learn']){await p.goto(URL+'?m='+m);await p.waitForTimeout(1300);}
  const off=await p.evaluate(()=>[...document.querySelectorAll('header button')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.right>innerWidth+2||r.left<-2);}).length);
  const s=await STILL(p);
  ok(errs.length===0,'['+vp.width+'x'+vp.height+'] no errors in any room'+(errs.length?': '+errs[0]:''));
  ok(s.notes>=1&&s.frames>=10,'['+vp.width+'x'+vp.height+'] it still plays and draws');
  ok(off===0,'['+vp.width+'x'+vp.height+'] no top-bar button is off the screen ('+off+')');await ctx.close();}

 // ---- 9. a long session ----
 {const {ctx,p,errs}=await open('?m=play');
  await p.mouse.click(550,425);await p.waitForTimeout(1200);
  const r=await p.evaluate(async()=>{const size=()=>({nodes:document.getElementsByTagName('*').length,ripples:(typeof ripples!=='undefined'?ripples.length:0),pend:pendingNotes.length,
      man:(typeof manualNotes!=='undefined'?manualNotes.length:0),ph:(typeof _phQ!=='undefined'?_phQ.length:0),parts:particles.length,balls:balls.length});
    const a=size();
    for(let k=0;k<20;k++){for(let i=0;i<300;i++)simTick(performance.now());draw();if(k%5===4&&fillState==='fill')startBreak(performance.now());await new Promise(r=>setTimeout(r,30));}   // ~100 s of physics, four bursts
    const z=size();return {a,z};});
  const grew=Object.keys(r.z).filter(k=>k!=='parts'&&k!=='balls'&&r.z[k]>Math.max(r.a[k]*1.5,r.a[k]+60));
  ok(grew.length===0,'[long session] nothing that should stay small kept growing ('+Object.keys(r.z).map(k=>k+' '+r.a[k]+'->'+r.z[k]).join(', ')+')');
  ok(errs.length===0,'[long session] no errors'+(errs.length?': '+errs[0]:''));await ctx.close();}

 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'hostile pass clean'));
 process.exit(FAIL.length?1:0);})();

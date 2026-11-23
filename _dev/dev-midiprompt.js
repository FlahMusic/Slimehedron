// ============================================================================================
//  NO MIDI PERMISSION PROMPT ON A CHILD'S FIRST TAP (2026-11-23). MIDI in was on by default and the first touch anywhere
//  called navigator.requestMIDIAccess(). Since Chrome 124 every Web MIDI request asks the person first (Firefox too:
//  developer.chrome.com/blog/web-midi-permission-prompt), so a kid's first tap in play opened a browser permission
//  prompt about "MIDI devices", and where it was refused a toast said "MIDI permission denied".
//    1. play, permission not yet given ('prompt'): the first taps never ask (no requestMIDIAccess), and no MIDI toast
//    2. studio, permission already given ('granted'): the first touch connects by itself, as before (a keyboard that was
//       allowed once just plays)
//    3. studio, not yet given: switching MIDI in on in the settings asks, then connects ("MIDI: 1 device")
//  Sabotage: SAB=ask (the old first-touch request) fails 1.
//  Needs a local server: python -m http.server 8765. Run from the project root: node _dev/dev-midiprompt.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const SAB=process.env.SAB||'';
const stub=([state,SAB])=>{window.__midiAsks=0;window.__toasts=[];
  const dev={name:'stub keys',onmidimessage:null};
  navigator.requestMIDIAccess=()=>{window.__midiAsks++;return Promise.resolve({inputs:new Map([['k',dev]]),outputs:new Map(),onstatechange:null});};
  try{const q=navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query=d=>d&&d.name==='midi'?Promise.resolve({state}):q(d);}catch(e){}
  window.__SAB=SAB;};
(async()=>{const b=await launch();
 const run=async(mode,state,act)=>{const ctx=await b.newContext({viewport:{width:1280,height:860}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await ctx.addInitScript(stub,[state,SAB]);
  await ctx.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');localStorage.setItem('slimehedron-tapped','1');}catch(e){}});
  await p.goto('http://127.0.0.1:8765/index.html?m='+mode);await p.waitForTimeout(2500);
  // every toast the app shows, read off the page
  await p.evaluate(()=>{const t0=window.toast;window.toast=m=>{window.__toasts.push(String(m));return t0(m);};});
  if(SAB==='ask')await p.evaluate(()=>{addEventListener('pointerdown',()=>{if(!window.__asked){window.__asked=1;navigator.requestMIDIAccess();}},{once:true});});
  const r=await act(p);r.errs=errs;await ctx.close();return r;};
 const tapTank=async p=>{const c=await p.evaluate(()=>{const r=document.getElementById('cv').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];});
  for(let i=0;i<3;i++){await p.mouse.click(c[0]+i*20,c[1]);await p.waitForTimeout(300);}await p.waitForTimeout(800);
  return p.evaluate(()=>({asks:window.__midiAsks,toasts:window.__toasts.filter(x=>/midi/i.test(x))}));};
 const r1=await run('play','prompt',tapTank);
 ok(r1.asks===0&&r1.toasts.length===0,`1. play, permission not given: three taps ask ${r1.asks} times, MIDI toasts: ${JSON.stringify(r1.toasts)}`);
 const r2=await run('studio','granted',tapTank);
 ok(r2.asks>=1,`2. studio, permission given: the first touch connects (asked ${r2.asks})`);
 const r3=await run('studio','prompt',async p=>{const a=await tapTank(p);
  await p.evaluate(()=>{const t=document.getElementById('midiInT');if(t&&t.classList.contains('on'))t.click();t&&t.click();});await p.waitForTimeout(800);
  return p.evaluate(a=>({before:a.asks,asks:window.__midiAsks,on:document.getElementById('midiInT').classList.contains('on'),toasts:window.__toasts.filter(x=>/midi/i.test(x))}),a);});
 ok(r3.before===0&&r3.asks>=1&&r3.on&&r3.toasts.some(t=>/1 device/.test(t)),`3. studio, not given: no ask on taps (${r3.before}), switching it on asks (${r3.asks}) and connects (${JSON.stringify(r3.toasts)})`);
 ok([r1,r2,r3].every(r=>r.errs.length===0),'no page errors '+[r1,r2,r3].flatMap(r=>r.errs).slice(0,2).join(' | '));
 await b.close();console.log(FAIL.length?FAIL.length+' FAILURE(S)':'no MIDI prompt on a first tap');process.exit(FAIL.length?1:0);})();

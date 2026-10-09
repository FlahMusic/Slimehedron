// ============================================================================================
//  THE SILENCE ALARM.
//  Learn mode made no pitched sound for two months. The cause was one function throwing and
//  ~130 `catch(e){}` blocks swallowing it at every call site. Twenty-one suites stayed green the
//  whole time, because an error that is caught and discarded looks exactly like success.
//
//  The sound functions now report their own failures (playSynth, pluck, dHit) into window.__oops,
//  where no caller's empty catch can reach. This suite drives every mode and every lesson and
//  demands that list stay EMPTY. If the mute ever comes back, this goes red on the first run
//  instead of two months later.
//
//  It also watches console errors, which the catch blocks cannot suppress once the callee reports.
//  Run: node dev-silence.js   (needs python3 -m http.server 8765)
// ============================================================================================
const {launch}=require('./browser');   // one place decides where Chromium is - see _dev/browser.js
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};

const SHIM=()=>{   // headless throttles rAF and several lessons drive their click track from it
  let id=1;const cbs=new Map();
  window.requestAnimationFrame=function(fn){const i=id++;cbs.set(i,fn);
    setTimeout(()=>{if(cbs.has(i)){cbs.delete(i);try{fn(performance.now());}catch(e){}}},16);return i;};
  window.cancelAnimationFrame=function(i){cbs.delete(i);};
};

const LESSONS=['pulse','make','sayplay','howlong','countbar','rest','song','split','tempo','dynamic',
  'high','notes','home','steps','newhome','majorscale','brightdark','intervals',
  'minorscale','minorshapes','modes','staff','melody','echo','updown','findhome'];

(async()=>{
const b=await launch();
const ctx=await b.newContext({viewport:{width:1100,height:860}});
await ctx.addInitScript(SHIM);
const allOops=[];

// ---------- 1. THE REPORTER EXISTS AND IS REACHABLE ----------
// If this fails every other check below is meaningless — an empty list because nothing can write
// to it looks identical to an empty list because nothing went wrong. Prove it can go red first.
{const p=await ctx.newPage();
 await p.goto('http://127.0.0.1:8765/index.html?m=play');
 await p.waitForTimeout(2500);
 const present=await p.evaluate(()=>Array.isArray(window.__oops));
 ok(present,'the failure list exists and is readable from outside');
 // deliberately break the synth the way the real bug did, and demand it gets reported
 const caught=await p.evaluate(()=>{const was=S.synth;S.synth=false;
   try{playSynth(440,90,0.5);}catch(e){}
   const got=(window.__oops||[]).slice();S.synth=was;return got;});
 ok(caught.some(x=>/S\.synth is off/.test(x)),
   'switching the synth off IS reported, not swallowed ('+(caught.length?caught[caught.length-1]:'nothing')+')');
 await p.close();}

// ---------- 2. EVERY MODE, CLEAN ----------
for(const mode of ['play','studio','learn']){
  const p=await ctx.newPage();
  const cerr=[];p.on('pageerror',e=>cerr.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html?m='+mode);
  await p.waitForTimeout(2500);
  if(mode==='play'){   // play opens silent on purpose, so give it the touch that starts everything
    const box=await p.evaluate(()=>{const r=document.getElementById('cv').getBoundingClientRect();
      return {x:r.left+r.width*0.5,y:r.top+r.height*0.38};});
    await p.mouse.click(box.x,box.y);
  }
  await p.waitForTimeout(4000);
  const o=await p.evaluate(()=>(window.__oops||[]).slice());
  ok(o.length===0,'['+mode+'] nothing reported a silent failure'+(o.length?' :: '+o.slice(0,3).join(' | '):''));
  ok(cerr.length===0,'['+mode+'] no page errors'+(cerr.length?' :: '+cerr[0]:''));
  o.forEach(x=>allOops.push(mode+': '+x));
  await p.close();
}

// ---------- 3. EVERY LESSON, CLEAN ----------
// This is the exact surface that was mute. One page per lesson so a thrown error in one cannot
// hide the next.
const dirty=[];
for(const id of LESSONS){
  const p=await ctx.newPage();
  const cerr=[];p.on('pageerror',e=>cerr.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html?l='+id);
  await p.waitForTimeout(1200);
  await p.evaluate(()=>{const b=document.querySelector('.lgListen');
    if(b)b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
    if(window._lab_lgAgain)window._lab_lgAgain();});
  await p.waitForTimeout(2600);
  const o=await p.evaluate(()=>(window.__oops||[]).slice());
  if(o.length||cerr.length){dirty.push(id+' ('+[...o,...cerr].slice(0,2).join(' | ')+')');
    o.forEach(x=>allOops.push(id+': '+x));}
  await p.close();
}
ok(dirty.length===0,'all '+LESSONS.length+' lessons ran without one silent failure'+
  (dirty.length?' :: '+dirty.slice(0,4).join('  //  '):''));

await b.close();
console.log('\n'+(FAIL.length
  ? 'FAILED '+FAIL.length+':\n - '+FAIL.join('\n - ')+(allOops.length?'\n\nreports:\n - '+allOops.slice(0,20).join('\n - '):'')
  : 'nothing is failing quietly'));
process.exit(FAIL.length?1:0);
})();

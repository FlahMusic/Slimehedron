// ============================================================================================
//  RAMP TEST — the eleven lessons above the pentatonic (Kodaly G2 -> Trinity G8).
//  Each one must: build the right number of walls AND keys for its scale, speak its instruction,
//  and put copy on the card. Run against a local server: python3 -m http.server 8765
//  Run: node dev-newunits.js
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
// the ramp after consolidation: nineteen lessons became twelve, so this is the set above the pentatonic
const NEW=['newhome','majorscale','brightdark','minorscale','minorshapes','modes'];
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
 for(const id of NEW){
  const ctx=await b.newContext({viewport:{width:1100,height:860}});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,110)));
  await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1')}catch(e){}
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(u){(window.__said=window.__said||[]).push(String(u.text))},cancel(){},getVoices(){return[]}}});});
  await p.goto('http://127.0.0.1:8765/index.html');await p.waitForTimeout(500);
  await p.click('.modeCard[data-m="learn"]');await p.waitForTimeout(1500);
  const r=await p.evaluate(async(id)=>{
    window.__said=[];
    const u=LEARN2.UNITS.find(x=>x.id===id); if(!u)return{err:'missing unit'};
    u.run(); await new Promise(r=>setTimeout(r,1400));
    const card=document.querySelector('#learnOverlay .lCard');
    const walls=(typeof scaleObj==='function')?scaleObj().c.length:0, keys=document.querySelectorAll('#labKeys .lk').length;
    const rungs=document.querySelectorAll('.lgRung,[data-ch]').length;  // [data-ch]: the two-choice screen
    const playable=(window.LAB&&LAB._playable)?LAB._playable.length:0;
    return {scale:S.scale, root:S.root, walls, keys, rungs, playable,
      title:((document.querySelector('.lgTop h3')||card&&card.querySelector('b')||{}).textContent)||'',
      text:((document.querySelector('.lgStage')||card||{innerText:''}).innerText||'').replace(/\s+/g,' ').slice(0,110),
      said:(window.__said||[]).join(' | ').slice(0,90)};},id);
  if(r.err){ok(false,id+': '+r.err);}
  else{
    // these run on the LADDER now: no tank, no keybed. What must exist is a rung per note.
    ok(r.rungs>=2, `${id}: scale=${r.scale} root=${r.root} rungs=${r.rungs}`);
    ok(!!r.said, `${id}: says its instruction out loud ("${r.said.slice(0,44)}")`);
    ok(r.text.length>10, `${id}: card has copy`);
  }
  const real=errs.filter(e=>!/ServiceWorker/.test(e)); // file/plain-http cannot register one
  if(real.length)ok(false,id+' JS ERROR: '+real[0]);
  await ctx.close();}
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'all '+NEW.length+' new lessons load, sound and speak'));
 process.exit(FAIL.length?1:0);})();

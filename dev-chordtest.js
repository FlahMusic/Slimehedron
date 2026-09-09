// ============================================================================================
//  HARMONY REGRESSION TEST — guards the invariant that broke once and was game-breaking:
//  the chord progression is WORLD STATE and must advance every bar whether or not the band
//  is audible, and a user-entered custom progression must be followed in every mode.
//  Run:  node dev-chordtest.js      (expects index.html beside it)
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];
const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m); if(!c)FAIL.push(m);};
const sample=(p,ms)=>p.evaluate(async n=>{const o=[];for(let i=0;i<n;i++){o.push(curRootDeg);await new Promise(r=>setTimeout(r,500));}return o;},ms);
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
 for(const [tag,w,h,mode] of [['phone/play',390,844,'play'],['desktop/studio',1440,900,'studio']]){
  console.log('\n== '+tag+' ==');
  const ctx=await b.newContext({viewport:{width:w,height:h}});const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message);});
  await p.goto('file://'+process.cwd()+'/index.html');await p.waitForTimeout(500);
  await p.click(`.modeCard[data-m="${mode}"]`);await p.waitForTimeout(1500);

  // 1. THE BUG: band muted must NOT freeze the harmony
  await p.evaluate(()=>{bandOn=false;});
  const muted=await sample(p,26);
  ok(new Set(muted).size>1, 'chord advances with the band MUTED (saw '+new Set(muted).size+' distinct roots)');

  // 2. the wheel hub must show a chord that actually changes
  const hubs=await p.evaluate(async()=>{const o=[];for(let i=0;i<26;i++){const e=document.getElementById('cofHub');o.push(e?e.textContent:null);await new Promise(r=>setTimeout(r,500));}return o;});
  ok(new Set(hubs.filter(Boolean)).size>1, 'circle-of-fifths hub text changes with the chord (saw '+new Set(hubs.filter(Boolean)).size+' distinct)');

  // 3. a custom progression must be followed, band still muted
  const prog=await p.evaluate(async()=>{
    CHORD_MODE.on=true;CHORD_MODE.idx=0;CHORD_MODE.barsLeft=0;
    CHORD_MODE.prog=[{pc:0,qual:'maj',bars:1},{pc:5,qual:'maj',bars:1},{pc:7,qual:'maj',bars:1},{pc:9,qual:'min',bars:1}];
    bandOn=false;
    const seen=[];for(let i=0;i<40;i++){seen.push(curRootDeg);await new Promise(r=>setTimeout(r,400));}
    const want=CHORD_MODE.prog.map(c=>pcToNearestDeg(c.pc));
    CHORD_MODE.on=false;CHORD_MODE.prog=[];
    return {seen:[...new Set(seen)].sort((a,b)=>a-b),want:[...new Set(want)].sort((a,b)=>a-b)};});
  const covered=prog.want.filter(d=>prog.seen.includes(d)).length;
  ok(covered>=Math.min(3,prog.want.length), 'custom progression is followed with the band MUTED ('+covered+'/'+prog.want.length+' of its chords seen; got '+JSON.stringify(prog.seen)+')');

  // 4. and it still works with the band audible
  await p.evaluate(()=>{bandOn=true;});
  const loud=await sample(p,20);
  ok(new Set(loud).size>1, 'chord still advances with the band ON (saw '+new Set(loud).size+' distinct roots)');
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'all harmony checks passed'));
 process.exit(FAIL.length?1:0);})();

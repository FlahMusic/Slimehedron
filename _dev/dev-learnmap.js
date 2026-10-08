// ============================================================================================
//  LEARN NOTE-COVERAGE TEST
//  Guards the promise a lesson makes: every note of the lesson's scale exists on exactly one wall
//  and one key. This failed for EVERY unit before -- wallDegrees() snaps walls onto chord tones,
//  which is right for play/studio and silently deleted `re` and `fa` from a 7-note scale lesson,
//  so "walk up the scale" was impossible to perform.
//  Run: node dev-learnmap.js   (expects index.html + learn2.js beside it)
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
 const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message)});
 await p.goto('file://'+process.cwd()+'/index.html');await p.waitForTimeout(600);
 await p.click('.modeCard[data-m="learn"]');await p.waitForTimeout(1200);

 // 1. every real unit, as the child actually opens it
 for(const u of await p.evaluate(()=>LEARN2.UNITS.map(x=>x.id))){
   await p.click(`[data-a2="unit"][data-u="${u}"]`);await p.waitForTimeout(1500);
   const r=await p.evaluate(()=>{
     const td=totalDegrees(),got=edges.map(e=>e.deg);
     const set=new Set(got),missing=[];for(let d=0;d<td;d++)if(!set.has(d))missing.push(d);
     const keys=document.querySelectorAll('#labKeys .lk').length;
     return {exact:LAB._exact,shape:S.shape,scale:S.scale,octs:S.octs,walls:edges.length,td,
       reach:set.size,missing,keys,dupWalls:got.length-set.size};});
   const label=u.padEnd(9)+r.scale.padEnd(10)+'shape='+String(r.shape).padEnd(3)+
     'walls='+String(r.walls).padEnd(3)+'notes='+String(r.td).padEnd(3)+'keys='+String(r.keys).padEnd(3);
   if(r.exact){
     ok(r.missing.length===0,label+'every note has a wall'+(r.missing.length?' MISSING '+r.missing.join(','):''));
     ok(r.walls===r.td,label+'one wall per note');
     ok(r.dupWalls===0,label+'no two walls share a note');
     ok(r.keys===r.td,label+'one key per note');
   }else{
     ok(true,label+'(exact mapping off by design - not a pitch lesson)');
   }
   await p.click('[data-a2="home"]');await p.waitForTimeout(500);
 }

 // 2. the rule must hold for ANY scale a lesson might request, not just the ones we ship
 const sweep=await p.evaluate(()=>{
   const bad=[];
   for(const sc in SCALES){
     LAB.take({scale:sc,octs:1,drums:false,band:false});
     const td=totalDegrees(),set=new Set(edges.map(e=>e.deg));
     if(edges.length!==td)bad.push(sc+': '+edges.length+' walls for '+td+' notes');
     for(let d=0;d<td;d++)if(!set.has(d))bad.push(sc+': note '+d+' unreachable');
   }
   LAB.give();
   return bad;});
 ok(sweep.length===0,'holds for all '+ (await p.evaluate(()=>Object.keys(SCALES).length)) +
    ' scales in the app'+(sweep.length?': '+sweep.slice(0,4).join('; '):''));

 // 3. a scale too big for a polygon must degrade safely, never silently drop notes
 const big=await p.evaluate(()=>{
   LAB.take({scale:'chromatic',octs:3,drums:false,band:false});
   const r={shape:S.shape,octs:S.octs,walls:edges.length,td:totalDegrees(),
     reach:new Set(edges.map(e=>e.deg)).size};
   LAB.give();return r;});
 ok(big.walls===big.td&&big.reach===big.td,
    'chromatic x3 octaves clamps to what a polygon can hold (shape='+big.shape+', octs='+big.octs+', '+big.reach+'/'+big.td+' reachable)');

 // 4. leaving learn must restore the MUSICAL mapping for play/studio
 await p.evaluate(()=>applyMode('play'));await p.waitForTimeout(1000);
 const back=await p.evaluate(()=>({exact:LAB._exact,
   chordy:(()=>{S.scale='major';S.octs=2;S.shape='6';rebuild();
     const CT=chordDegrees(),len=scaleObj().c.length;
     return edges.filter(e=>CT.indexOf(((e.deg%len)+len)%len)>=0).length;})(),walls:edges.length}));
 ok(!back.exact,'exact mapping is off again outside learn');
 ok(back.chordy>=back.walls-1,'play mode gets its chord-tone mapping back ('+back.chordy+'/'+back.walls+' walls on chord tones)');
 ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'every learn unit reaches every note'));
 await b.close();process.exit(FAIL.length?1:0);})();

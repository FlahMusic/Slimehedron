// ============================================================================================
//  POLISH TEST — the "amateur hour" pass. Each assertion is a thing that was actually wrong:
//    * a lone pink X floated over the splash (app chrome above the splash's z-index)
//    * the studio step grid showed 7 of 16 steps and cut off mid-cell at the panel edge
//    * all five Rhythm buttons carried the SAME picture — text-only differentiation
//    * the splash was three coloured rectangles differing only by a word (non-readers)
//    * decorative slimes poked out between the record button and the chord readout
//    * the lessons list never said where to start
//  Run: node dev-polish.js
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const open=async(b,w,h)=>{const ctx=await b.newContext({viewport:{width:w,height:h}});const p=await ctx.newPage();
  await p.goto('file://'+process.cwd()+'/index.html');await p.waitForTimeout(450);return {ctx,p};};

(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});

 // ---- 1. THE SPLASH is the front door. Nothing from inside the app may float on it. ----
 for(const [tag,w,h] of [['desktop',1440,900],['phone',390,844]]){
   const {ctx,p}=await open(b,w,h);
   const leak=await p.evaluate(()=>{
     const sp=document.getElementById('splash');if(!sp)return ['no splash'];
     const z=+getComputedStyle(sp).zIndex||0, bad=[];
     document.querySelectorAll('body > *:not(#splash)').forEach(el=>{
       const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')return;
       const walk=(n)=>{const c=getComputedStyle(n);
         if(c.display==='none'||c.visibility==='hidden')return;
         const r=n.getBoundingClientRect();
         if(r.width>6&&r.height>6&&(c.position==='fixed'||c.position==='absolute')&&(+c.zIndex||0)>z)
           bad.push((n.id||n.className||n.tagName)+' z'+c.zIndex);
         [...n.children].forEach(walk);};
       walk(el);});
     return bad;});
   ok(leak.length===0,'['+tag+'] nothing floats above the splash'+(leak.length?': '+leak.slice(0,3).join(', '):''));
   // and each door must be recognisable without reading
   const icons=await p.evaluate(()=>[...document.querySelectorAll('.modeCard')].map(c=>!!c.querySelector('.mcIco svg')));
   ok(icons.length===3&&icons.every(Boolean),'['+tag+'] every splash door carries an icon, not just a word ('+icons.filter(Boolean).length+'/3)');
   await ctx.close();}

 // ---- 2. THE STEP GRID must show the whole bar. No hidden steps, ever. ----
 for(const [tag,w,h] of [['desktop',1440,900],['phone',390,844]]){
   const {ctx,p}=await open(b,w,h);
   await p.click('.modeCard[data-m="studio"]');await p.waitForTimeout(1900);
   const g=await p.evaluate(()=>{
     const rows=[...document.querySelectorAll('#stepGrid .sgRow')];
     if(!rows.length)return {rows:0};
     const out=rows.map(r=>{const cells=r.querySelector('.sgCells');
       const kids=[...cells.querySelectorAll('.sgCell')];
       const box=cells.getBoundingClientRect();
       // a cell is HIDDEN if any part of it falls outside its scroller
       const cut=kids.filter(c=>{const k=c.getBoundingClientRect();return k.right>box.right+1||k.left<box.left-1;}).length;
       const small=kids.filter(c=>c.getBoundingClientRect().width<20).length;
       return {n:kids.length,cut,small,scroll:cells.scrollWidth-Math.round(box.width)};});
     return {rows:rows.length,out};});
   ok(g.rows>0,'['+tag+'] the step grid rendered ('+g.rows+' voices)');
   if(g.rows){
     const cut=g.out.reduce((a,r)=>a+r.cut,0), small=g.out.reduce((a,r)=>a+r.small,0);
     const n=g.out[0].n;
     ok(cut===0,'['+tag+'] every one of the '+n+' steps is fully on screen'+(cut?' ('+cut+' clipped)':''));
     ok(small===0,'['+tag+'] no step cell is under 20px'+(small?' ('+small+' too small to tap)':''));
     ok(g.out.every(r=>r.scroll<=2),'['+tag+'] the grid does not hide steps behind a scroller');
   }
   // the last-step readout must not wrap into the slider
   const lw=await p.evaluate(()=>{const e=document.getElementById('sgLastV');if(!e)return null;
     const r=e.getBoundingClientRect();const fs=parseFloat(getComputedStyle(e).fontSize);
     return {h:Math.round(r.height),fs:Math.round(fs),txt:e.textContent};});
   if(lw)ok(lw.h<lw.fs*1.9,'['+tag+'] the last-step readout "'+lw.txt+'" fits on one line ('+lw.h+'px)');
   await ctx.close();}

 // ---- 3. FIVE RHYTHM BUTTONS, FIVE DIFFERENT PICTURES ----
 {const {ctx,p}=await open(b,1440,900);
  await p.click('.modeCard[data-m="play"]');await p.waitForTimeout(1900);
  const art=await p.evaluate(()=>[...document.querySelectorAll('#psDrums .psBtn')].map(btn=>{
    const s=btn.querySelector('svg'),i=btn.querySelector('img');
    return s?s.innerHTML:(i?'IMG:'+i.getAttribute('src'):'EMPTY');}));
  ok(art.length===5,'play mode offers five rhythms ('+art.length+')');
  ok(new Set(art).size===art.length,'each rhythm button draws its OWN picture ('+new Set(art).size+' distinct of '+art.length+')');
  ok(art.every(a=>a!=='EMPTY'&&!a.startsWith('IMG:')),'the rhythm glyphs are drawn, not a shared photo');
  await ctx.close();}

 // ---- 4. NO DECORATIVE SLIME IN THE TRANSPORT BAND ----
 for(const [tag,w,h,mode] of [['play/desktop',1440,900,'play'],['studio/desktop',1440,900,'studio'],['play/phone',390,844,'play']]){
   const {ctx,p}=await open(b,w,h);
   await p.click(`.modeCard[data-m="${mode}"]`);await p.waitForTimeout(2600);
   const sl=await p.evaluate(()=>{
     const boxes=[];
     document.querySelectorAll('header .btngroup,#hdrChord,#topRight,#studioBar').forEach(el=>{
       if(!el||getComputedStyle(el).display==='none')return;
       const r=el.getBoundingClientRect();if(r.width>2)boxes.push(r);});
     const hit=[];
     document.querySelectorAll('.slime,.mote').forEach(el=>{
       if(el.id==='wormEl')return;
       const c=getComputedStyle(el);if(c.display==='none'||c.visibility==='hidden')return;
       const r=el.getBoundingClientRect();if(r.width<3)return;
       if(boxes.some(o=>r.left<o.right-2&&r.right>o.left+2&&r.top<o.bottom-2&&r.bottom>o.top+2))
         hit.push(el.className);});
     return hit;});
   ok(sl.length===0,'['+tag+'] no slime or mote sits in the transport band'+(sl.length?' ('+sl.length+' found)':''));
   await ctx.close();}

 // ---- 5. THE LESSONS LIST SAYS WHERE TO START ----
 {const {ctx,p}=await open(b,1280,860);
  await p.evaluate(()=>{try{localStorage.removeItem('slimehedron-learn2');}catch(e){}});
  await p.reload();await p.waitForTimeout(500);
  await p.click('.modeCard[data-m="learn"]');await p.waitForTimeout(1400);
  const s=await p.evaluate(()=>{
    const flags=[...document.querySelectorAll('.uNext')];
    const rings=[...document.querySelectorAll('.uCard.nextUp')];
    const first=document.querySelector('.uCard');
    return {flags:flags.length,rings:rings.length,txt:flags[0]?flags[0].textContent:'',
            onFirst:!!(first&&first.classList.contains('nextUp')),
            locked:[...document.querySelectorAll('.uCard')].filter(c=>c.disabled).length};});
  ok(s.flags===1,'exactly one "start here" flag ('+s.flags+')');
  ok(s.onFirst,'the flag is on the first lesson, not a random one');
  ok(s.rings===1,'the flagged card is ringed');
  ok(s.locked===0,'and NOTHING is locked — the sequence is signposted, never gated ('+s.locked+' disabled)');
  await ctx.close();}

 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'polish pass clean'));
 process.exit(FAIL.length?1:0);})();

// ============================================================================================
//  THE LESSONS MAP — a path you walk, practice on side paths, nothing locked.
//  Checks what a child would SEE and DO, not that the map rendered:
//    1. every unit is on the map exactly once; the no-right-or-wrong units (make, jams, compose), the
//       games and review sit on SIDE paths, every taught lesson on the main path
//    2. nothing is locked
//    3. the slime stands ON the first unfinished lesson (not a side path), feet on the stone
//    4. the dots behind it are coloured in, the dots ahead are not
//    5. finish a lesson and come back: the slime HOPS along the dots to the next stone (seen moving,
//       through the path, landing on the right stone); with reduced motion it is simply there
//    6. no stone or caption sits on another stone, nothing runs off the side, on phone and desktop
//    7. the tab order walks the map: a lesson, then its own side paths, then the next lesson
//    8. tapping a side-path stone opens that playground
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-map.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html?m=learn';
const FREE=['make','rjam','jam','jammaj','jammin','compose'],SIDE=FREE.concat(['echo','updown','findhome','review']);
const done=ids=>{const P={};for(const id of ids)P[id]={hits:9,tries:9,at:Date.now()};return JSON.stringify(P);};

(async()=>{const b=await launch();
 for(const [tag,w,h,mob] of [['phone',390,844,true],['small',360,640,true],['desktop',1440,900,false]]){
  const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:mob,hasTouch:mob,deviceScaleFactor:mob?2:1});
  await ctx.addInitScript(p=>{try{if(!sessionStorage.getItem('dm')){localStorage.setItem('slimehedron-learn2',p);sessionStorage.setItem('dm','1');}}catch(e){}},done(['pulse','sayplay','howlong','make']));
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL);await p.waitForTimeout(2200);
  const L='['+tag+'] ';
  const r=await p.evaluate(SIDE=>{
    const st=[...document.querySelectorAll('#lmMap .lmStone')];
    const units=LEARN2.UNITS.map(u=>u.id);
    const count={};st.forEach(s=>{count[s.dataset.u]=(count[s.dataset.u]||0)+1;});
    const side=st.filter(s=>s.classList.contains('lmSide')).map(s=>s.dataset.u);
    const main=st.filter(s=>!s.classList.contains('lmSide')).map(s=>s.dataset.u);
    const disc=s=>s.querySelector('.lmDisc').getBoundingClientRect(),cap=s=>s.querySelector('.lmCap').getBoundingClientRect();
    const hit=(a,b2)=>Math.min(a.right,b2.right)-Math.max(a.left,b2.left)>2&&Math.min(a.bottom,b2.bottom)-Math.max(a.top,b2.top)>2;
    const clash=[];
    for(let i=0;i<st.length;i++)for(let j=0;j<st.length;j++){if(i===j)continue;
      if(j>i&&hit(disc(st[i]),disc(st[j])))clash.push(st[i].dataset.u+' disc x '+st[j].dataset.u+' disc');
      if(hit(cap(st[i]),disc(st[j])))clash.push(st[i].dataset.u+' caption x '+st[j].dataset.u+' disc');
      if(j>i&&hit(cap(st[i]),cap(st[j])))clash.push(st[i].dataset.u+' caption x '+st[j].dataset.u+' caption');}
    // the slime itself must not stand on anyone's caption
    const mr=document.getElementById('lmMascot').getBoundingClientRect();st.forEach(s=>{if(hit(mr,cap(s)))clash.push('the slime x '+s.dataset.u+' caption');});
    const card=document.querySelector('#learnOverlay .lCard');
    const nx=document.querySelector('.lmStone.nextUp:not(.lmSide)');
    const m=document.getElementById('lmMascot').getBoundingClientRect(),nd=nx?disc(nx):null;
    const dots=[...document.querySelectorAll('#lmMap .lmDot:not(.lmSm)')];
    return {missing:units.filter(u=>!count[u]),twice:Object.keys(count).filter(k=>count[k]>1),side,main,
      locked:st.filter(s=>s.disabled||s.getAttribute('aria-disabled')==='true').length,clash,
      offRight:card.scrollWidth>card.clientWidth+1,next:nx?nx.dataset.u:null,
      mascotOn:nd?{dx:Math.abs((m.left+m.right)/2-(nd.left+nd.right)/2),feet:m.bottom-nd.top,h:nd.height}:null,
      onDots:dots.filter(d=>d.classList.contains('on')).length,offDots:dots.filter(d=>!d.classList.contains('on')).length,
      firstOn:dots.length?dots[0].classList.contains('on'):null,
      order:[...document.querySelectorAll('#lmMap .lmStone')].slice(0,6).map(s=>s.dataset.u)};},SIDE);
  ok(r.missing.length===0&&r.twice.length===0,L+'every unit is on the map exactly once'+(r.missing.length?' missing: '+r.missing:'')+(r.twice.length?' twice: '+r.twice:''));
  ok(SIDE.every(u=>r.side.includes(u))&&r.side.length===SIDE.length,L+'practice, the games and review are on side paths ('+r.side.join(',')+')');
  ok(!r.main.some(u=>SIDE.includes(u)),L+'the main path holds only taught lessons');
  ok(r.locked===0,L+'nothing is locked');
  ok(r.next==='countbar',L+'the next lesson is the first unfinished TAUGHT lesson, skipping the side paths ('+r.next+')');
  ok(r.mascotOn&&r.mascotOn.dx<6&&Math.abs(r.mascotOn.feet)<r.mascotOn.h*0.35,L+'the slime stands on that stone, feet on the top ('+JSON.stringify(r.mascotOn)+')');
  ok(r.firstOn&&r.onDots===6*3&&r.offDots>0,L+'the dots it has walked are coloured in and the ones ahead are not ('+r.onDots+' on, '+r.offDots+' ahead)');
  ok(r.clash.length===0,L+'no stone or caption sits on another stone'+(r.clash.length?': '+r.clash.slice(0,4).join('; '):''));
  ok(!r.offRight,L+'nothing runs off the side');
  ok(r.order[0]==='pulse'&&r.order[1]==='make'&&r.order[2]==='review'&&r.order[3]==='sayplay',L+'the tab order walks the map: a lesson, its side paths, the next lesson ('+r.order.join(' > ')+')');
  // ---- 5. finish a lesson, come back: the slime hops there ----
  const hop=await p.evaluate(async()=>{
    const P=JSON.parse(localStorage.getItem('slimehedron-learn2'));P.countbar={hits:9,tries:9,at:Date.now()};localStorage.setItem('slimehedron-learn2',JSON.stringify(P));LEARN2._reloadProgress();
    // as if back from the lesson: the map is drawn again
    const m0=()=>{const e=document.getElementById('lmMascot');const r=e.getBoundingClientRect();const lm=document.getElementById('lmMap').getBoundingClientRect();return [r.left+r.width/2-lm.left,r.bottom-lm.top];};
    LEARN2.home();const a=m0();const seen=[];
    for(let i=0;i<14;i++){await new Promise(r=>setTimeout(r,90));seen.push(m0());}
    await new Promise(r=>setTimeout(r,1500));const z=m0();
    const tgt=document.querySelector('.lmStone[data-u="rest"] .lmDisc').getBoundingClientRect(),lm=document.getElementById('lmMap').getBoundingClientRect();
    return {a,seen,z,tx:tgt.left+tgt.width/2-lm.left,ty:tgt.top-lm.top};});
  const moved=hop.seen.filter(q=>Math.hypot(q[0]-hop.a[0],q[1]-hop.a[1])>4&&Math.hypot(q[0]-hop.z[0],q[1]-hop.z[1])>4).length;
  ok(moved>=3,L+'back from a lesson, the slime is SEEN travelling between the stones ('+moved+' in-between frames)');
  ok(Math.abs(hop.z[0]-hop.tx)<6&&Math.abs(hop.z[1]-hop.ty)<hop.ty*0.05+20,L+'and lands on the next stone ('+hop.z.map(Math.round)+' vs '+[Math.round(hop.tx),Math.round(hop.ty)]+')');
  // ---- 8. a side path opens its playground ----
  await p.click('.lmStone[data-u="make"]');await p.waitForTimeout(900);
  ok(await p.evaluate(()=>document.getElementById('learnOverlay').classList.contains('stage')&&!document.getElementById('learnOverlay').classList.contains('lmOn')),L+'tapping a side-path stone opens that playground');
  ok(errs.length===0,L+'no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}
 // ---- reduced motion: no hop, it is just there ----
 {const ctx=await b.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await ctx.addInitScript(p=>{try{if(!sessionStorage.getItem('dm')){localStorage.setItem('slimehedron-learn2',p);sessionStorage.setItem('dm','1');}}catch(e){}},done(['pulse','sayplay','howlong']));
  const p=await ctx.newPage();await p.goto(URL);await p.waitForTimeout(2000);
  const r=await p.evaluate(async()=>{const P=JSON.parse(localStorage.getItem('slimehedron-learn2'));P.countbar={hits:9,tries:9,at:Date.now()};localStorage.setItem('slimehedron-learn2',JSON.stringify(P));LEARN2._reloadProgress();
    LEARN2.home();await new Promise(r=>setTimeout(r,60));
    const m=document.getElementById('lmMascot').getBoundingClientRect(),d=document.querySelector('.lmStone[data-u="rest"] .lmDisc').getBoundingClientRect();
    return {dx:Math.abs((m.left+m.right)/2-(d.left+d.right)/2),anim:getComputedStyle(document.getElementById('lmMascot')).animationName};});
  ok(r.dx<6&&r.anim==='none','[reduced motion] the slime is simply on the next stone, and does not bob ('+r.dx.toFixed(1)+'px, '+r.anim+')');
  await ctx.close();}
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'map pass clean'));
 process.exit(FAIL.length?1:0);})();

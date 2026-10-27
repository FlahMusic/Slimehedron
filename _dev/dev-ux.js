// ============================================================================================
//  THE FIRST-TIMER PASS (2026-10-27). Flah: "imagine opening excel or ableton for the first time ... make
//  it fun, not daunting". Each check is what a person SEES or GETS, not that some code ran:
//    1. an empty play tank shows where to touch; the touch goes straight through to the tank; it never
//       comes back once someone has tapped
//    2. ONE tempo control per room: play is the SLOW/knob/FAST on every screen (no different-looking
//       slider on a phone), studio is the number + TAP (no third slider, no "80.00")
//    3. ONE key control: the strip lists 12 notes ("G", never "G3"), picking one keeps the tank in the same
//       register, octave lives under more settings, no "· 7" in the scale menu, no circle of fifths floating
//       over the studio tank (it is still in Tools)
//    4. the chord chip: play shows the chord only; studio says "in <key> <scale>" and is never stale
//    5. studio has one loud button (play); "chords" is a plain one
//    6. a phone's studio strip has ONE "more" button, and it opens every group's extras
//    7. share a link: it rebuilds the setup in a fresh browser (studio and play), the link leaves the address
//       bar after opening, undo takes you back, and broken / hostile / oversized links do nothing
//    8. the lessons map: nothing is hidden under the "Lessons 0 of 23" card, and the first sign is clear
//       of the slime
//    9. landing.html is retired: not served, not cached
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-ux.js
// ============================================================================================
const {launch}=require('./browser');
const fs=require('fs');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const BASE='http://127.0.0.1:8765/index.html';
const COACHED=()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');}catch(e){}};
const shown=(p,sel)=>p.evaluate(sel=>{const e=document.querySelector(sel);if(!e||!e.checkVisibility({visibilityProperty:true,opacityProperty:true}))return false;
  const r=e.getBoundingClientRect();return r.width>2&&r.height>2&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;},sel);
const box=(p,sel)=>p.evaluate(sel=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height};},sel);
const hit=(a,b)=>a&&b&&a.l<b.r-1&&b.l<a.r-1&&a.t<b.b-1&&b.t<a.b-1;

(async()=>{const b=await launch();
 const SIZES=[['desktop',1440,900,false],['phone',390,844,true]];

 // ---- 1. the empty tank asks to be touched ----
 for(const [tag,w,h,mob] of SIZES){const L='1. ['+tag+'] ';
  const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:mob,hasTouch:mob});
  await ctx.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');}catch(e){}});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(BASE+'?m=play');await p.waitForTimeout(3200);
  const inv=await p.evaluate(()=>{const e=document.getElementById('tapInvite');if(!e)return null;const r=e.getBoundingClientRect(),c=cv.getBoundingClientRect();
    return {on:e.classList.contains('on')&&+getComputedStyle(e).opacity>0.5,x:r.left+r.width/2,y:r.top+r.height/2,
      cx:c.left+CX*c.width/W,cy:c.top+CY*c.height/H,pe:getComputedStyle(e).pointerEvents,top:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===cv||document.elementFromPoint(r.left+r.width/2,r.top+r.height/2).id==='cvGL'};});
  ok(inv&&inv.on,L+'an empty tank shows where to touch');
  ok(inv&&Math.hypot(inv.x-inv.cx,inv.y-inv.cy)<4,L+'right on the middle of the tank');
  ok(inv&&inv.pe==='none',L+'and it does not get in the way of the touch');
  const c=[inv.cx,inv.cy];
  if(mob)await p.touchscreen.tap(c[0],c[1]);else await p.mouse.click(c[0],c[1]);
  await p.waitForTimeout(900);
  const after=await p.evaluate(()=>({balls:balls.length,inv:!!document.querySelector('#tapInvite.on')}));
  ok(after.balls>0&&!after.inv,L+'a tap right on it drops a ball, and the hint goes ('+after.balls+' balls)');
  await p.evaluate(()=>{balls.length=0;});await p.reload();await p.waitForTimeout(3200);
  ok(!(await p.evaluate(()=>!!document.querySelector('#tapInvite.on'))),L+'once someone has tapped, it never comes back');
  ok(errs.length===0,L+'no page errors'+(errs.length?': '+errs[0]:''));
  await ctx.close();}

 // ---- 2. one tempo control per room ----
 for(const [tag,w,h,mob] of SIZES){const L='2. ['+tag+'] ';
  const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:mob,hasTouch:mob});await ctx.addInitScript(COACHED);
  const p=await ctx.newPage();await p.goto(BASE+'?m=play');await p.waitForTimeout(2500);
  const k=await box(p,'#tempoKnob');
  ok(await shown(p,'#tempoKnob')&&!(await shown(p,'#playBpm')),L+'play: tempo is the knob, the same as on every screen (no slider instead)');
  if(mob)ok(k&&k.w>=40&&k.h>=40,L+'play: the knob is big enough for a finger ('+(k?Math.round(k.w):0)+'px)');
  if(mob){const b0=await p.evaluate(()=>S.bpm);const fast=await box(p,'#tempoDial .td-ico:last-of-type');
    ok(await shown(p,'#tempoDial .td-ico'),L+'play: and it says which way is slow and which is fast');
    await p.touchscreen.tap(fast.l+fast.w/2,fast.t+fast.h/2);await p.waitForTimeout(200);
    const b1=await p.evaluate(()=>S.bpm);ok(b1>b0,L+'play: tapping "fast" speeds it up ('+b0+' -> '+b1+')');}
  await p.goto(BASE+'?m=studio');await p.waitForTimeout(2500);
  ok(!(await shown(p,'#bpmTop')),L+'studio: no extra tempo slider on the strip');
  ok(await shown(p,'#bpmNum')&&await shown(p,'#sbTap'),L+'studio: the number and TAP are there');
  ok(await p.evaluate(()=>$("bpmNum").value)==='80',L+'studio: the number reads "80", not "80.00" ('+await p.evaluate(()=>$("bpmNum").value)+')');
  await p.evaluate(()=>{const n=$("bpmNum");n.value='87.5';n.dispatchEvent(new Event('change'));});
  ok(await p.evaluate(()=>S.bpm===87.5&&$("bpmNum").value==='87.5'),L+'studio: a typed 87.5 is kept as 87.5');
  await ctx.close();}

 // ---- 3 + 4 + 5. key, chip, one loud button (desktop) ----
 {const ctx=await b.newContext({viewport:{width:1440,height:900}});await ctx.addInitScript(COACHED);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(BASE+'?m=studio');await p.waitForTimeout(2500);
  const kt=await p.evaluate(()=>[...$("keyTop").options].map(o=>o.textContent));
  ok(kt.length===12&&kt.every(t=>!/\d/.test(t)),'3. the key menu lists the 12 notes, no octave numbers ('+kt.join(' ')+')');
  ok(await p.evaluate(()=>[...$("scaleTop").options].every(o=>!/·|\d$/.test(o.textContent))),'3. the scale menu is just names (no "· 7")');
  const reg=await p.evaluate(()=>{const out=[];const kt=$("keyTop");
    for(const start of [48,55,62,69]){const r=$("root");r.value=String(start);r.dispatchEvent(new Event('change'));
      for(let pc=0;pc<12;pc++){const before=+r.value;kt.value=String(pc);kt.dispatchEvent(new Event('change'));
        let best=null;for(let x=48;x<=72;x++)if(x%12===pc&&(best===null||Math.abs(x-before)<Math.abs(best-before)))best=x;   // nearest that the tank's range allows
        out.push({before,after:S.root,pc,ok:S.root===best});}}
    return out;});
  ok(reg.every(x=>x.ok),'3. picking a key moves the tank to that note in the octave nearest where it was (48 cases'+(reg.filter(x=>!x.ok).length?', bad: '+JSON.stringify(reg.filter(x=>!x.ok).slice(0,3)):'')+')');
  // the octave row, under more settings
  await p.evaluate(()=>{const d=$("advReveal");d.open=true;[...d.querySelectorAll('.card.collapsed')].forEach(c=>c.classList.remove('collapsed'));const r=$("root");r.value='55';r.dispatchEvent(new Event('change'));});
  await p.evaluate(()=>$("octUp").scrollIntoView({block:'center'}));await p.waitForTimeout(150);
  await p.click('#octUp');const up=await p.evaluate(()=>S.root);
  await p.click('#octDn');const dn=await p.evaluate(()=>({r:S.root,dis:$("octDn").disabled,kt:$("keyTop").value}));
  ok(up===67&&dn.r===55,'3. "higher" / "lower" move the whole tank an octave (55 -> '+up+' -> '+dn.r+')');
  ok(dn.dis,'3. "lower" greys out where the tank cannot go any lower');
  ok(dn.kt==='7','3. and the key menu still says G');
  ok(!(await shown(p,'#cofWheel')),'3. no circle of fifths floating over the studio tank');
  // chip, while stopped: change key + scale, it must follow at once
  await p.evaluate(()=>{setPlaying(false);const s=$("scaleTop");s.value='dorian';s.dispatchEvent(new Event('change'));const k=$("keyTop");k.value='2';k.dispatchEvent(new Event('change'));});
  await p.waitForTimeout(150);
  const chip=await p.evaluate(()=>({k:$("hcKey").textContent,vis:$("hcKey").checkVisibility()}));
  ok(chip.vis&&/^in D dorian$/i.test(chip.k),'4. studio chip says the key once, and right away: "'+chip.k+'"');
  const loud=await p.evaluate(()=>{const c=getComputedStyle($("chordBtn")),pl=getComputedStyle($("playBtn"));
    return {chordInk:c.color,playBg:pl.backgroundImage,chordBg:c.backgroundImage};});
  ok(loud.chordInk!=='rgb(255, 255, 255)'&&loud.chordBg!==loud.playBg,'5. "chords" is a plain button; play is the only filled one');
  ok(errs.length===0,'no page errors (studio)'+(errs.length?': '+errs[0]:''));
  await p.goto(BASE+'?m=play');await p.waitForTimeout(2500);
  ok(!(await p.evaluate(()=>$("hcKey").checkVisibility())),'4. play chip shows the chord and nothing else');
  ok(/\S/.test(await p.evaluate(()=>$("hcName").textContent)),'4. (and the chord is there: "'+await p.evaluate(()=>$("hcName").textContent)+'")');
  await ctx.close();}

 // ---- 6. a phone's strip has one "more" ----
 {const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await ctx.addInitScript(COACHED);
  const p=await ctx.newPage();await p.goto(BASE+'?m=studio');await p.waitForTimeout(2500);
  const n=await p.evaluate(()=>[...document.querySelectorAll('#studioBar .sbExp')].filter(e=>e.checkVisibility()).length);
  ok(n===1,'6. [phone] one "more" button on the strip ('+n+')');
  const hid=await p.evaluate(()=>['divSel','scaleTop','kitStyle'].filter(id=>$(id).checkVisibility()));
  ok(hid.length===0,'6. [phone] step size, scale and kit style start tucked away'+(hid.length?' ('+hid+' showing)':''));
  const m=await box(p,'#sbMoreAll');await p.touchscreen.tap(m.l+m.w/2,m.t+m.h/2);await p.waitForTimeout(300);
  const vis=[];for(const id of ['divSel','scaleTop','kitStyle'])if(await shown(p,'#'+id))vis.push(id);
  ok(vis.length===3,'6. [phone] one tap shows all of them ('+vis.join(', ')+')');
  await ctx.close();}

 // ---- 7. share a link ----
 {const mk=async(w,h,mob)=>{const ctx=await b.newContext({viewport:{width:w||1440,height:h||900},isMobile:!!mob,hasTouch:!!mob,permissions:['clipboard-read','clipboard-write']});
    await ctx.addInitScript(COACHED);const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));return {ctx,p,errs};};
  // studio
  const A=await mk();await A.p.goto(BASE+'?m=studio');await A.p.waitForTimeout(2500);
  const made=await A.p.evaluate(async()=>{const set=(id,v)=>{const e=$(id);e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}));};
    set('drumKit','jazz');set('bpmNum','123');set('keyTop','2');set('scaleTop','dorian');set('shape','cube');
    MIX.bass.v=0.4;MIX.drums.m=true;STEP_VEL.jazz={K:{0:0.5}};
    KIT_EDITS.jazz=JSON.parse(JSON.stringify(KITS.jazz));KIT_EDITS.jazz.K=[0,3,8,11];
    await new Promise(r=>setTimeout(r,200));return {bpm:S.bpm,root:S.root,scale:S.scale,kit:drumKit};});
  await A.p.evaluate(()=>{const c=document.querySelector('#songCard .songShare');c.scrollIntoView({block:'center'});});
  await A.p.click('#songCard .songShare');await A.p.waitForTimeout(700);
  const url=await A.p.evaluate(()=>navigator.clipboard.readText());
  ok(/\?m=studio#s=z[A-Za-z0-9_-]+$/.test(url)&&url.length<2000,'7. studio "share link" copies a link ('+url.length+' characters, short enough for any chat app)');
  ok(/link copied/.test(await A.p.evaluate(()=>$("songNote").textContent)),'7. and says so');
  const B=await mk();await B.p.evaluate(()=>{});await B.p.goto(BASE+'?m=studio');await B.p.waitForTimeout(2200);
  const before=await B.p.evaluate(()=>({bpm:S.bpm,kit:drumKit}));
  await B.p.goto(url);await B.p.waitForTimeout(4200);
  const got=await B.p.evaluate(()=>({mode:S.mode,bpm:S.bpm,root:S.root,scale:S.scale,kit:drumKit,shape:$("shape").value,bass:MIX.bass.v,dm:MIX.drums.m,
    k:(KIT_EDITS.jazz||{}).K,vel:((STEP_VEL.jazz||{}).K||{})[0],hash:location.hash}));
  ok(got.mode==='studio'&&got.bpm===123&&got.root===made.root&&got.scale==='dorian'&&got.kit==='jazz'&&got.shape==='cube',
    '7. another browser opens it into the same studio: tempo, key, scale, kit, shape ('+JSON.stringify({bpm:got.bpm,root:got.root,scale:got.scale,kit:got.kit,shape:got.shape})+')');
  ok(got.bass===0.4&&got.dm===true&&JSON.stringify(got.k)==='[0,3,8,11]'&&got.vel===0.5,'7. ...and the mix and the beat you drew');
  ok(got.hash==='','7. the song leaves the address bar once it is in (a reload will not undo what you do next)');
  await B.p.evaluate(()=>window._song.undo());await B.p.waitForTimeout(400);
  const und=await B.p.evaluate(()=>({bpm:S.bpm,kit:drumKit}));
  ok(und.bpm===before.bpm&&und.kit===before.kit,'7. undo takes you back to what you had before you opened it ('+JSON.stringify(und)+')');
  ok(A.errs.length+B.errs.length===0,'7. no page errors');
  // play, on a phone: the button lives on the volume/tempo row and does not cover the chord name
  const C=await mk(390,844,true);await C.p.goto(BASE+'?m=play');await C.p.waitForTimeout(2500);
  const ps=await box(C.p,'#playShare'),chip=await box(C.p,'#hdrChord');
  ok(await shown(C.p,'#playShare')&&!hit(ps,chip),'7. [phone] play has a share button, clear of the chord name');
  const offs=await C.p.evaluate(()=>[...document.querySelectorAll('header button,#topRight button,.fadeRow button,.fadeRow input')].filter(e=>e.checkVisibility()).filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1||r.left<-1;}).map(e=>e.id));
  ok(offs.length===0,'7. [phone] nothing in the top bars runs off the screen'+(offs.length?' ('+offs+')':''));
  await C.p.click('.psBtn.bandBtn[data-kit="bossa"]');await C.p.waitForTimeout(200);
  await C.p.evaluate(()=>{const b=document.querySelector('#psWaves .psBtn[data-w="sawtooth"]');b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));});
  const purl=await C.p.evaluate(()=>window._shareLink.packLink());
  const D=await mk();await D.p.goto(purl);await D.p.waitForTimeout(4200);
  const pg=await D.p.evaluate(()=>({mode:S.mode,kit:drumKit,drums:drumOn,wave:S.wave,lit:[...document.querySelectorAll('.psBtn.on')].map(e=>e.dataset.kit||e.dataset.w)}));
  ok(pg.mode==='play'&&pg.kit==='bossa'&&pg.drums&&pg.wave==='sawtooth','7. a play link opens play with the same beat and sound ('+JSON.stringify(pg)+')');
  ok(pg.lit.includes('bossa')&&pg.lit.includes('sawtooth'),'7. and the right buttons are lit');
  // hostile links: nothing changes, nothing breaks
  const zlib=require('zlib');
  const forged='j'+Buffer.from(JSON.stringify({app:'slimehedron',kind:'song',version:1,controls:{s:{drumKit:'<img src=x onerror=alert(1)>'},r:{bpmTop:'1e308'}},mix:{bass:{v:9}}})).toString('base64url');
  const bad=[['empty deflate','zAAAA'],['not base64','zgarbage!!'],['too long','j'+'A'.repeat(20000)],['forged values',forged],
    ['a 5 MB bomb','z'+zlib.deflateRawSync(Buffer.alloc(5e6,32)).toString('base64url')],['wrong app','j'+Buffer.from('{"app":"x","kind":"song","version":1}').toString('base64url')],
    ['future version','j'+Buffer.from('{"app":"slimehedron","kind":"song","version":99}').toString('base64url')]];
  for(const [name,h] of bad){const E=await mk();await E.p.goto(BASE+'?m=play#s='+h);await E.p.waitForTimeout(2600);
    const r=await E.p.evaluate(()=>({kit:$("drumKit").value,bpm:S.bpm,bass:MIX.bass.v}));
    ok(r.kit==='pop'&&r.bpm>=40&&r.bpm<=220&&r.bass<=1&&E.errs.length===0,'7. a link with '+name+' changes nothing and breaks nothing');
    await E.ctx.close();}
  for(const X of [A,B,C,D])await X.ctx.close();}

 // ---- 8. the lessons map ----
 for(const [tag,w,h,mob] of SIZES){const L='8. ['+tag+'] ';
  const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:mob,hasTouch:mob});await ctx.addInitScript(COACHED);
  const p=await ctx.newPage();await p.goto(BASE+'?m=learn');await p.waitForTimeout(3000);
  const r=await p.evaluate(()=>{const g=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom};};
    return {head:g('#learnOverlay.lmOn .uHead'),slime:g('#lmMascot'),sign:g('.lmSign'),stone:g('.lmStone .lmDisc')};});
  ok(r.head&&r.slime&&!hit(r.head,r.slime),L+'the slime on the first stone is not under the "Lessons" card');
  ok(r.sign&&!hit(r.head,r.sign),L+'nor is the first sign');
  ok(r.sign&&!hit(r.sign,r.slime)&&!hit(r.sign,r.stone),L+'and the sign does not sit on the slime or its stone');
  await ctx.close();}

 // ---- 9. landing.html is retired ----
 {const http=require('http');
  const code=await new Promise(r=>http.get('http://127.0.0.1:8765/landing.html',res=>{res.resume();r(res.statusCode);}).on('error',()=>r(0)));
  ok(code===404,'9. landing.html is not served any more ('+code+')');
  ok(!/landing\.html/.test(fs.readFileSync('sw.js','utf8')),'9. and the offline cache does not ask for it');}

 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'a first-timer gets a friendlier app'));
 process.exit(FAIL.length?1:0);})();

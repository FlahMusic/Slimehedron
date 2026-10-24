// ============================================================================================
//  GUIDANCE TEST — what a person who has never seen Slimehedron is told, in every room.
//  For each mode (menu, play, studio, learn, tools) on a desktop, a tablet and a phone:
//    1. every control you can see has a name a screen reader can say, and an icon-only one also has a
//       hover tooltip on a mouse screen (a picture with no words is a guess)
//    2. nothing on screen says a word the app has retired ("measure" -> "bar") or leaks code
//       ("undefined", "NaN", "[object", "null")
//    3. no label is cut off mid-word (text wider than its own box)
//    4. every panel you can open is actually on top: nothing else is drawn over it
//    5. the first-run hints point at real, visible things, and never cover the thing they point at;
//       and what they say matches what is happening (no "tap the slime to start it" while it is on)
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-guide.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html';
const SIZES=[['desktop',1440,900,false],['tablet',900,1100,true],['phone',390,844,true]];

const AUDIT=()=>{
  const vis=e=>{const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return r.width>1&&r.height>1&&cs.visibility!=='hidden'&&cs.display!=='none'&&+cs.opacity>0.05&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth&&!e.closest('[hidden],[aria-hidden="true"]')&&!(e.closest('details:not([open])')&&!e.closest('summary')&&e.closest('details:not([open])').querySelector('summary')!==e);};   // a closed <details> keeps its children's boxes in Chrome, but nobody can see them
  const name=e=>(e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')&&document.getElementById(e.getAttribute('aria-labelledby'))?.innerText||(e.labels&&e.labels[0]&&e.labels[0].innerText)||e.title||e.innerText||e.value||'').trim();
  const ctrls=[...document.querySelectorAll('button,select,input:not([type=hidden]),[role="button"],[role="slider"],summary,a[href]')].filter(vis);
  const unnamed=[],noTip=[];
  for(const e of ctrls){const n=name(e);if(!n)unnamed.push(e.id||e.className||e.tagName);
    const txt=(e.innerText||'').trim();
    if(matchMedia('(hover:hover)').matches&&e.tagName==='BUTTON'&&txt.replace(/[^a-z0-9]/gi,'').length<2&&!e.title&&!e.closest('#stepGrid,.sgScroll'))noTip.push(e.id||e.getAttribute('aria-label')||e.className);}
  // words: visible text only
  const words=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let t;
  while((t=walker.nextNode())){const s=t.nodeValue;if(!s||!s.trim())continue;const el=t.parentElement;if(!el||el.closest('script,style,svg')||!vis(el))continue;
    if(/\bmeasures?\b/i.test(s)&&!/\bmeasured\b/i.test(s))words.push('"'+s.trim().slice(0,40)+'"');
    if(/\bundefined\b|\bNaN\b|\[object|\bnull\b/.test(s))words.push('code leak: "'+s.trim().slice(0,40)+'"');}
  // cut-off labels: a text element narrower than its text, with its overflow clipped
  const cut=[];
  for(const e of document.querySelectorAll('button,label,b,i,span,.psSub,.sbLbl,option')){if(!vis(e)||e.children.length>1)continue;
    const cs=getComputedStyle(e);if(!(cs.overflow==='hidden'||cs.textOverflow==='ellipsis'||cs.overflowX==='hidden'))continue;
    if(e.scrollWidth>e.clientWidth+2&&(e.innerText||'').trim().length>2)cut.push((e.id||e.className||e.tagName)+' "'+e.innerText.trim().slice(0,24)+'"');}
  for(const s of document.querySelectorAll('select')){if(!vis(s))continue;const o=s.options[s.selectedIndex];if(!o)continue;
    const c=document.createElement('canvas').getContext('2d'),cs=getComputedStyle(s);c.font=cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;
    const need=c.measureText(o.text).width+parseFloat(cs.paddingLeft)+18;if(need>s.clientWidth+2)cut.push('select#'+(s.id||'?')+' "'+o.text+'" ('+Math.round(need)+'>'+s.clientWidth+')');}
  return {n:ctrls.length,unnamed,noTip,words,cut};};
// is this panel on top? sample a grid of points inside it
const ONTOP=(sel)=>{const p=document.querySelector(sel);if(!p)return {missing:true};const r=p.getBoundingClientRect();if(r.width<2)return {missing:true};
  const bad=[];for(const fx of [0.1,0.5,0.9])for(const fy of [0.03,0.5,0.92]){const x=r.left+r.width*fx,y=r.top+r.height*fy;if(x<0||y<0||x>innerWidth||y>innerHeight){bad.push('off-screen');continue;}
    const e=document.elementFromPoint(x,y);if(e&&!p.contains(e))bad.push((e.id||e.className||e.tagName)+'@'+Math.round(fx*100)+','+Math.round(fy*100));}
  return {bad};};

(async()=>{const b=await launch();
 for(const [tag,w,h,mob] of SIZES){
  const open=async(q,coach)=>{const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:mob,hasTouch:mob,deviceScaleFactor:mob?2:1});const p=await ctx.newPage();
    const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message);});
    if(!coach)await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');}catch(e){}});
    await p.goto(URL+q);await p.waitForTimeout(1600);return {ctx,p,errs};};
  const report=(L,r)=>{
    ok(r.unnamed.length===0,L+'every visible control has a name ('+r.n+' controls)'+(r.unnamed.length?': '+r.unnamed.slice(0,5).join(', '):''));
    ok(r.noTip.length===0,L+'every icon-only button has a hover tooltip'+(r.noTip.length?': '+r.noTip.slice(0,6).join(', '):''));
    ok(r.words.length===0,L+'no retired words or code on screen'+(r.words.length?': '+r.words.slice(0,4).join(', '):''));
    ok(r.cut.length===0,L+'no label is cut off'+(r.cut.length?': '+r.cut.slice(0,5).join(', '):''));};
  // ---- every room ----
  for(const [mode,q] of [['menu',''],['play','?m=play'],['studio','?m=studio'],['learn','?m=learn']]){
    const {ctx,p,errs}=await open(q);const L='['+tag+' '+mode+'] ';
    report(L,await p.evaluate(AUDIT));
    if(mode==='studio'){
      // the panels a newcomer opens: each must sit on top of everything
      for(const [btn,panel,shut] of [['#chordBtn','#chordPanel','#cpClose'],['#spaceBtn','#spaceMenu','#spaceBtn'],['#prefsBtn','#prefsDlg','#prefsDlg button']]){
        const can=await p.evaluate(s=>{const e=document.querySelector(s);if(!e)return false;const r=e.getBoundingClientRect();return r.width>1&&getComputedStyle(e).visibility!=='hidden';},btn);
        if(!can){if(btn==='#prefsBtn'&&mob){const m=await p.$('#menuBtn');if(m){await m.click();await p.waitForTimeout(500);}}else continue;}
        try{await p.click(btn,{timeout:2000});}catch(e){continue;}
        await p.waitForTimeout(500);
        const t=await p.evaluate(ONTOP,panel);
        if(!t.missing){ok(t.bad.length===0,L+panel+' opens on top of everything'+(t.bad.length?' (covered at '+t.bad.slice(0,4).join(', ')+')':''));
          report(L+panel+' ',await p.evaluate(AUDIT));}
        await p.keyboard.press('Escape');await p.evaluate(s=>{const e=document.querySelector(s);if(e&&e.offsetParent!==null)try{e.click();}catch(err){}},shut);await p.waitForTimeout(300);
        await p.evaluate(()=>{const d=document.getElementById('prefsDlg');if(d&&d.open)d.close();const c=document.getElementById('chordPanel');if(c)c.hidden=true;const s=document.getElementById('spaceMenu');if(s)s.hidden=true;});}}
    ok(errs.length===0,L+'no page errors'+(errs.length?': '+errs[0]:''));
    await ctx.close();}
  // ---- tools ----
  {const {ctx,p,errs}=await open('');const L='['+tag+' tools] ';
   await p.click('#toolsCard');await p.waitForTimeout(800);report(L,await p.evaluate(AUDIT));
   const tools=await p.evaluate(()=>[...document.querySelectorAll('[data-tool]')].map(e=>e.dataset.tool));
   for(const t of tools){await p.evaluate(t=>{const e=document.querySelector('[data-tool="'+t+'"]');if(e)e.click();},t);await p.waitForTimeout(700);
     report(L+t+' ',await p.evaluate(AUDIT));
     await p.evaluate(()=>{const e=document.querySelector('[data-tw="back"]');if(e)e.click();});await p.waitForTimeout(400);}
   ok(errs.length===0,L+'no page errors'+(errs.length?': '+errs[0]:''));await ctx.close();}
  // ---- the first-run hints (play, then studio): fresh storage, a newcomer's first touches ----
  for(const [mode,q,first] of [['play','?m=play','tank'],['studio','?m=studio','none']]){
    const {ctx,p,errs}=await open(q,true);const L='['+tag+' '+mode+' hints] ';
    if(first==='tank'){if(mob)await p.touchscreen.tap(w/2,h/2);else await p.mouse.click(w/2,h/2);}
    const seen=[];
    for(let k=0;k<5;k++){await p.waitForTimeout(k?900:3200);
      const c=await p.evaluate(()=>{const b=document.getElementById('coach');if(!b)return null;const tgt=document.querySelector(b.dataset.target||'#nothing');
        const br=b.getBoundingClientRect(),tr=tgt?tgt.getBoundingClientRect():null;
        const over=tr?!(br.right<tr.left||br.left>tr.right||br.bottom<tr.top||br.top>tr.bottom):false;
        const arrow=b.querySelector('.coachArrow');let points=false;if(arrow&&tr){const a=arrow.getBoundingClientRect(),ax=(a.left+a.right)/2;points=ax>=tr.left-4&&ax<=tr.right+4;}
        return {text:b.innerText.replace(/\s+/g,' ').replace(/ skip$/,''),target:b.dataset.target,visible:!!tr&&tr.width>1,over,points,state:b.dataset.state||'',slime:S.slimeMode};});
      if(!c)break;seen.push(c);
      // advance like a newcomer would: tap the thing it points at
      await p.evaluate(()=>{const b=document.getElementById('coach');const t=b&&document.querySelector(b.dataset.target);if(t)t.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));});}
    ok(seen.length>=1,L+'a newcomer is shown at least one hint ('+seen.length+': '+seen.map(s=>'"'+s.text+'"').join(' -> ')+')');
    ok(seen.every(s=>s.visible),L+'every hint points at something you can see'+(seen.some(s=>!s.visible)?' ('+seen.filter(s=>!s.visible).map(s=>s.target).join(', ')+' is not on screen)':''));
    ok(seen.every(s=>!s.over),L+'no hint covers the thing it points at');
    ok(seen.every(s=>s.points),L+'every hint has an arrow that lines up with its target');
    const slimeHint=seen.find(s=>s.target==='#slimeBig');
    if(slimeHint)ok(slimeHint.slime?/stop/.test(slimeHint.text):/start|tap/.test(slimeHint.text),L+'the slime hint says what tapping it will do right now ("'+slimeHint.text+'", auto-play '+(slimeHint.slime?'on':'off')+')');
    ok(errs.length===0,L+'no page errors'+(errs.length?': '+errs[0]:''));
    await ctx.close();}}
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'guidance pass clean'));
 process.exit(FAIL.length?1:0);})();

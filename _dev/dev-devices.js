// ============================================================================================
//  EVERY CHANGE, ON EVERY SCREEN
//  New screens and new logic get built at one size and break at another. This drives the things
//  added this session - the explore screen, "Your Turn", the review shelf, the ungated loop grid,
//  the renamed cards - across phone, tablet and desktop, portrait and landscape, and checks the
//  things that actually break: content running off the screen, buttons too small for a small thumb,
//  text overlapping, and the background slimes crowding the controls.
//  Run: node _dev/dev-devices.js   (needs: python3 -m http.server 8765)
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m)};

// BROWSER ZOOM IS JUST A SMALLER CSS VIEWPORT. A 1920x1080 screen at 150% zoom reports 1280x720
// CSS pixels, so zoom levels are tested by testing those sizes - no special emulation needed.
// This is the matrix the fluid scale has to hold across, not a set of breakpoints to hand-tune.
const SIZES=[
  {n:'iPhone SE',       w:375, h:667,  touch:true,  mob:true},
  {n:'iPhone 14',       w:390, h:844,  touch:true,  mob:true},
  {n:'iPhone landscape',w:844, h:390,  touch:true,  mob:true},
  {n:'small android',   w:360, h:640,  touch:true,  mob:true},
  {n:'iPad portrait',   w:810, h:1080, touch:true,  mob:true},
  {n:'iPad landscape',  w:1080,h:810,  touch:true,  mob:true},
  {n:'laptop 1366',     w:1366,h:768,  touch:false, mob:false},
  {n:'desktop 1920',    w:1920,h:1080, touch:false, mob:false},
  {n:'1920 @125% zoom', w:1536,h:864,  touch:false, mob:false},
  {n:'1920 @150% zoom', w:1280,h:720,  touch:false, mob:false},
  {n:'1920 @175% zoom', w:1097,h:617,  touch:false, mob:false},
  {n:'1920 @200% zoom', w:960, h:540,  touch:false, mob:false},
  {n:'1366 @150% zoom', w:911, h:512,  touch:false, mob:false},
];
const SCREENS=[
  {n:'explore',   url:'?l=notes',  wait:3000, ready:false},
  {n:'quiz',      url:'?l=notes',  wait:3000, ready:true},
  {n:'Your Turn', url:'?l=jam',    wait:3000, ready:false},
  {n:'loop grid', url:'?l=make',   wait:2600, ready:false},
  {n:'drum jam',  url:'?l=rjam',  wait:2600, ready:false},   // three pads + a word on each one
  {n:'write tune',url:'?l=compose',wait:2600,ready:false},   // staff + 8 letter keys + 4 buttons:
                                                            // the most crowded screen in the app
  {n:'lesson list',url:'',         wait:1800, ready:false, learn:true},
  {n:'studio',     url:'?m=studio',wait:2600, ready:false},
  {n:'play',       url:'?m=play',  wait:2000, ready:false},
];

(async()=>{
 const b=await launch();
 for(const s of SIZES){
  const ctx=await b.newContext({viewport:{width:s.w,height:s.h},hasTouch:s.touch,isMobile:s.mob,
                               deviceScaleFactor:s.mob?2:1});
  const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/i.test(e.message))errs.push(e.message)});
  await p.addInitScript(()=>{Object.defineProperty(window,'speechSynthesis',{configurable:true,
    value:{speak:()=>{},cancel:()=>{},getVoices:()=>[]}});});
  console.log('\n--- '+s.n+'  '+s.w+'x'+s.h+' ---');
  for(const sc of SCREENS){
    await p.goto('http://127.0.0.1:8765/index.html'+sc.url);
    await p.waitForTimeout(sc.wait);
    if(sc.learn){ try{await p.click('.modeCard[data-m="learn"]');}catch(e){} await p.waitForTimeout(1500); }
    if(sc.ready){ await p.evaluate(()=>{if(window._lab_ready)window._lab_ready();}); await p.waitForTimeout(1500); }
    const r=await p.evaluate(()=>{
      // VISIBLE MEANS VISIBLE, NOT MERELY LAID OUT. A button scrolled out of a column with
      // overflow:auto still reports a bounding rect, so it looked like it sat on top of whatever
      // is at those coordinates - while being clipped and invisible. That is exactly what
      // "psBtn x volMute" was: a wave button scrolled 48px above its own container's top.
      // THE RECT YOU CAN SEE, NOT THE RECT THE ELEMENT CLAIMS.
      // A button half-scrolled out of a column with overflow:auto still reports its whole box, so
      // the hidden half "collided" with whatever sat at those coordinates. That is exactly what
      // "psBtn x volMute" was: the top 48px of a wave button, scrolled up out of view, landing on
      // the mute button's coordinates. Clip every box to its scrolling ancestors first, then
      // compare. Same for the tap-size check - measure the part a thumb can actually reach.
      const clipped=e=>{
        const b=e.getBoundingClientRect();
        let L=b.left,T=b.top,R=b.right,B=b.bottom;
        for(let n=e.parentElement;n;n=n.parentElement){
          const c=getComputedStyle(n);
          if(!/auto|scroll|hidden/.test(c.overflowY+c.overflowX))continue;
          const r=n.getBoundingClientRect();
          L=Math.max(L,r.left); T=Math.max(T,r.top); R=Math.min(R,r.right); B=Math.min(B,r.bottom);
        }
        L=Math.max(L,0); T=Math.max(T,0); R=Math.min(R,innerWidth); B=Math.min(B,innerHeight);
        return {left:L,top:T,right:R,bottom:B,width:R-L,height:B-T};};
      const onscreen=e=>{const c=clipped(e);return c.width>1&&c.height>1;};
      const vis=e=>{const c=getComputedStyle(e);
        return c.display!=='none'&&c.visibility!=='hidden'&&e.offsetParent!==null&&onscreen(e);};
      const vw=innerWidth, vh=innerHeight;
      const docW=document.documentElement.scrollWidth;
      // every control a finger has to hit
      const hits=[...document.querySelectorAll('button,[role=button],.lgRung,.mkPad,.uCard,[data-cnt],[data-ch],[data-lg],[data-jam],[data-mk]')]
        .filter(vis)
        // SIZE uses the element's OWN box: a card half past the bottom of a scrolling list is not
        // a 13px tap target, it is a full-size one you scroll to. COLLISION uses the clipped box,
        // because that is what is actually painted. Different questions, different rectangles.
        .map(e=>{const b=e.getBoundingClientRect();
          return {t:(e.textContent||'').trim().slice(0,18),w:Math.round(b.width),h:Math.round(b.height),
                  dense:!!e.closest('#stepGrid'),
                  x:Math.round(b.left),y:Math.round(b.top),r:Math.round(b.right),bt:Math.round(b.bottom)};})
        .filter(z=>z.w>0&&z.h>0);
      return {vw,vh,docW,hits,
        offRight:hits.filter(z=>z.r>vw+1).map(z=>z.t||'(unnamed)'),
        offBottom:hits.filter(z=>z.bt>vh+1).map(z=>z.t||'(unnamed)'),
        // The 16-step sequencer grid is exempt and says so: sixteen cells across a 375px phone
        // cannot each be 44px, and a dense editor grid is not a primary control. Everything a child
        // actually presses - the transport, the kits, the lesson buttons - is held to the floor.
        tiny:hits.filter(z=>!z.dense&&Math.min(z.w,z.h)<44).map(z=>(z.t||'(unnamed)')+' '+z.w+'x'+z.h),
        // the LESSON OVERLAY scrolls, not the document - checking documentElement said "cannot
        // scroll" for a list that scrolls perfectly well, and flagged correct behaviour everywhere
        // NOTHING MAY SIT ON TOP OF ANYTHING ELSE YOU CAN PRESS. This is the bug where the studio
        // clear button landed on the pop kit card: both were positioned from different anchors and
        // nothing stopped them meeting. Ancestors legitimately contain their children, so those
        // pairs are skipped; two separate controls overlapping is always wrong.
        collisions:(()=>{
          const out=[];
          const ctl=[...document.querySelectorAll('button,[role=button],.psBtn,.uCard,.lgRung,.mkPad')]
            .filter(vis)
            .map(e=>({e,b:clipped(e),n:(e.id||e.textContent||e.className||'?').toString().trim().slice(0,16)}))
            .filter(o=>o.b.width>10&&o.b.height>10&&!o.e.closest('#stepGrid'));
          for(let i=0;i<ctl.length;i++)for(let j=i+1;j<ctl.length;j++){
            const A=ctl[i],B=ctl[j];
            if(A.e.contains(B.e)||B.e.contains(A.e))continue;
            const a=A.b,b=B.b;
            const ox=Math.min(a.right,b.right)-Math.max(a.left,b.left);
            const oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
            if(ox>3&&oy>3) out.push(A.n+' x '+B.n+' ('+Math.round(ox)+'x'+Math.round(oy)+'px)');
          }
          return out.slice(0,5);})(),
        // TEXT THAT DOES NOT FIT IS THE THING THAT LOOKS STUPID. A label clipped mid-word, a button
        // whose word is cut off, a heading overflowing its box - none of that trips a tap-size or
        // collision check, and all of it is what a person actually notices. Compare each text
        // element's content width to the box it has been given.
        // A TOOLBAR YOU HAVE TO DRAG SIDEWAYS IS A TOOLBAR YOU CANNOT SEE. The studio strip used to
        // scroll horizontally on a phone with 490px of it off the right edge - the key, the scale
        // and the kit were, in practice, missing, and a fade on the edge is an apology for a layout
        // rather than a layout. A long vertical list is fine; sideways is not. Pianos are exempt,
        // because a keyboard wider than the screen is a keyboard, not a menu.
        sideways:(()=>{
          const bad=[];
          for(const e of document.querySelectorAll('*')){
            if(e.scrollWidth<=e.clientWidth+2)continue;
            if(e.clientWidth<40)continue;
            // ONLY things you can actually DRAG. An element whose content is wider than its box but
            // whose overflow is visible is not a scroller - it is just overflowing, and the
            // off-the-right-edge check above already owns that. Checking scrollWidth alone flagged
            // every decorative slime on the page.
            const ox=getComputedStyle(e).overflowX;
            if(ox!=='auto'&&ox!=='scroll')continue;
            const id=e.id||'';
            if(/Keys$|Piano|kbMap|pxPiano/i.test(id+' '+String(e.className)))continue;  // a keyboard may be wider than the screen
            // and so may a drum pattern: rows of drums with time running sideways, scrolling like a DAW's
            // pattern editor, is what Flah asked for (2026-10-14). Its row names stay pinned on the left.
            if(e.classList.contains('sgScroll'))continue;
            const r=e.getBoundingClientRect();
            if(r.width<40||r.height<10)continue;
            bad.push(e.tagName.toLowerCase()+(id?'#'+id:(String(e.className)?'.'+String(e.className).split(' ')[0]:''))+' '+e.scrollWidth+'>'+e.clientWidth);
          }
          return bad.slice(0,4);
        })(),
        clipped_text:(()=>{
          const bad=[];
          for(const e of document.querySelectorAll('button,.btn,.uCard,.psLbl,.lgSay,h1,h2,h3,label,.lgRung,.rgName')){
            const c=getComputedStyle(e);
            if(c.display==='none'||c.visibility==='hidden'||!e.offsetParent)continue;
            const t=(e.textContent||'').trim(); if(!t)continue;
            // an explicit ellipsis is a deliberate choice, not a bug; silent clipping is the bug
            const deliberate=/ellipsis/.test(c.textOverflow)||c.overflow==='hidden'&&/nowrap/.test(c.whiteSpace)&&/ellipsis/.test(c.textOverflow);
            if(deliberate)continue;
            const ow=e.scrollWidth-e.clientWidth, oh=e.scrollHeight-e.clientHeight;
            if(ow>2||oh>2) bad.push(t.slice(0,18)+' ('+(ow>2?'+'+ow+'w':'')+(oh>2?' +'+oh+'h':'')+')');
          }
          return bad.slice(0,4);})(),
        scrollable:(()=>{
          if(document.documentElement.scrollHeight>vh+2)return true;
          for(const e of document.querySelectorAll('*')){
            const c=getComputedStyle(e);
            if(/auto|scroll/.test(c.overflowY)&&e.scrollHeight>e.clientHeight+2)return true;}
          return false;})()};
    });
    const tag=s.n+' / '+sc.n;
    ok(r.docW<=r.vw+1, tag+': nothing runs off the side (doc '+r.docW+' vs '+r.vw+')');
    ok(r.offRight.length===0, tag+': no control off the right edge'+(r.offRight.length?': '+r.offRight.slice(0,3).join(', '):''));
    // A SCROLLING LIST IS ALLOWED TO BE LONGER THAN THE SCREEN. 28 lesson cards obviously extend
    // past the fold - that is what a list is. This only matters on a screen that does NOT scroll,
    // where something below the fold is genuinely unreachable. The first version of this assertion
    // flagged correct behaviour on all six devices.
    if(r.scrollable) ok(true, tag+': (scrolls — a long list is allowed past the fold)');
    else ok(r.offBottom.length===0, tag+': no control below the fold on a screen that cannot scroll'
      +(r.offBottom.length?': '+r.offBottom.slice(0,3).join(', '):''));
    // 44px is the Apple/WCAG floor for a touch target; only enforce it where a finger is used
    ok(r.tiny.length===0, tag+': every tap target is at least 44px'+(r.tiny.length?': '+r.tiny.slice(0,4).join(' · '):''));
    ok(r.clipped_text.length===0, tag+': no label is cut off'+(r.clipped_text.length?': '+r.clipped_text.join(' · '):''));
    ok(r.collisions.length===0, tag+': no control sits on top of another'+(r.collisions.length?': '+r.collisions.join(' · '):''));
    ok(r.sideways.length===0, tag+': nothing has to be dragged sideways to be seen'+(r.sideways.length?': '+r.sideways.join(' · '):''));
  }
  ok(errs.length===0, s.n+': no page errors'+(errs.length?': '+errs.slice(0,2).join(' | '):''));
  await ctx.close();
 }
 await b.close();
 console.log(FAIL.length?('\n'+FAIL.length+' FAILED:\n'+FAIL.map(f=>'  - '+f).join('\n')):'\nevery new screen holds up on every device');
 process.exit(FAIL.length?1:0);
})();

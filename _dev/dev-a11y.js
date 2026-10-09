// ============================================================================================
//  ACCESSIBILITY + CONGRUENCE TEST
//   1. TOUCH TARGETS — every control on a touch screen is >= 44x44 CSS px (WCAG 2.2 SC 2.5.5 AAA,
//      and Apple's HIG figure). Two documented exceptions: links inside a sentence (SC 2.5.8
//      "Inline"), and the step-sequencer grid ("Spacing").
//   2. MUTE — the speaker is a real button, it silences the master, and the muted state is carried
//      by a SHAPE (a slash) and not by colour alone (SC 1.4.1).
//   3. COLOUR-BLIND MODE — the switch is on the splash, it persists, it repaints the tank (not just
//      the CSS chrome), and it moves the palette's known collisions apart.
//   4. CONGRUENCE — the transport sits at the SAME x in play and studio. Every DAW surveyed treats
//      this as inviolable; ours used to drift 106px. And volume is reachable in every mode.
//  Run: node dev-a11y.js
// ============================================================================================
const {launch}=require('./browser');   // one place decides where Chromium is - see _dev/browser.js
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
// The explore screen comes first now (Orff stage two): a lesson opens with its notes playable and
// nothing scored, and the child presses "ask me questions" when they are ready. A driver has to do
// the same thing a child does. Pressing it when it is not there is a no-op, so this is safe to call
// after opening any unit.
const askQuestions=async(page)=>{
  try{await page.evaluate(()=>{ if(window._lab_ready)window._lab_ready(); });}catch(e){}
  // WAIT FOR THE QUESTION, not for a guessed number of milliseconds. A roaming lesson sounds the
  // tonic first and only plays the question ~820ms later, so a fixed short wait read the screen
  // mid-anchor and made a working lesson look like it had asked an unanswerable one-note question.
  for(let i=0;i<40;i++){
    // Poll ONLY for a real question. An earlier version also broke out when the ready button had
    // gone, which is true the instant the gate opens - so it read the screen 344ms before the
    // anchored question actually sounded and a working lesson looked like it asked a one-note
    // question with no answer.
    const asked=await page.evaluate(()=>{
      try{ return window._labHintDeg!=null||window._labExpect!=null; }catch(e){return false;}
    }).catch(()=>false);
    if(asked)break;
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(900);   // a roaming lesson sounds the tonic, THEN the question 820ms later
};

const MIN=44;
// links inside a sentence are exempt (SC 2.5.8 "Inline"); the step grid is exempt (SC 2.5.8 "Spacing")
const EXEMPT='.spCredit a, .spCredit, #stepGrid .sgCell, .lk, #labKeys *, .cofNode, #cofSvg *';

(async()=>{const b=await launch();
 const open=async(w,h,mode)=>{
   const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:true,isMobile:true,deviceScaleFactor:2});
   const p=await ctx.newPage();
   await p.goto('file://'+process.cwd()+'/index.html');await p.waitForTimeout(500);
   if(mode){await p.tap(`.modeCard[data-m="${mode}"]`);await p.waitForTimeout(2100);}
   return {ctx,p};};

 // ---------- 1. TOUCH TARGETS ----------
 for(const [tag,w,h,mode] of [['play',390,844,'play'],['studio',390,844,'studio'],['learn',390,844,'learn'],
                              ['splash',390,844,null],['play-sm',375,667,'play'],['studio-sm',375,667,'studio']]){
   const {ctx,p}=await open(w,h,mode);
   const small=await p.evaluate(EX=>{
     const out=[];
     document.querySelectorAll('button,select,input,[role="button"],a[href],label').forEach(e=>{
       if(e.matches(EX)||e.closest(EX))return;
       const c=getComputedStyle(e);
       if(c.display==='none'||c.visibility==='hidden'||c.pointerEvents==='none')return;
       const r=e.getBoundingClientRect();
       if(r.width<1||r.height<1)return;
       if(r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)return;
       if(Math.min(r.width,r.height)<44)
         out.push((e.id||e.className||e.tagName).toString().slice(0,24)+' '+Math.round(r.width)+'x'+Math.round(r.height));});
     return out;},EXEMPT);
   ok(small.length===0,'['+tag+' '+w+'px] every control is at least 44x44'+(small.length?': '+small.slice(0,5).join(', '):''));
   await ctx.close();}

 // ---------- 2. MUTE ----------
 {const {ctx,p}=await open(1440,900,'play');
  const st=await p.evaluate(async()=>{
    const b=document.getElementById('volMute');if(!b)return{err:'no mute button'};
    const before={pressed:b.getAttribute('aria-pressed'),vol:S.vol};
    b.click();await new Promise(r=>setTimeout(r,260));
    const slashOn=[...b.querySelectorAll('.vmSlash')].every(e=>+getComputedStyle(e).opacity>0.5);
    const waveOff=[...b.querySelectorAll('.vmWave')].every(e=>+getComputedStyle(e).opacity<0.5);
    const muted={pressed:b.getAttribute('aria-pressed'),vol:S.vol,gain:(window.master?master.gain.value:null),slashOn,waveOff,label:b.getAttribute('aria-label')};
    b.click();await new Promise(r=>setTimeout(r,260));
    const after={pressed:b.getAttribute('aria-pressed'),vol:S.vol,
      slashOn:[...b.querySelectorAll('.vmSlash')].every(e=>+getComputedStyle(e).opacity>0.5)};
    return {before,muted,after,faderKept:document.getElementById('volPlay').value};});
  ok(!st.err,'the volume icon is a button'+(st.err?' ('+st.err+')':''));
  if(!st.err){
    ok(st.muted.pressed==='true'&&st.after.pressed==='false','tapping it toggles mute on and back off');
    ok(st.muted.vol===0,'muting actually silences the master (S.vol '+st.muted.vol+')');
    ok(st.after.vol>0,'unmuting restores the level ('+st.after.vol.toFixed(3)+')');
    ok(st.muted.slashOn&&st.muted.waveOff,'muted shows a SLASH and hides the sound waves — a shape, not just a colour');
    ok(!st.after.slashOn,'the slash goes away when you unmute');
    ok(st.muted.label==='unmute','the button relabels itself for screen readers ("'+st.muted.label+'")');
    ok(+st.faderKept>0,'the fader keeps its position while muted, so unmuting returns to the same level');}
  await ctx.close();}

 // Mute must be reachable wherever sound can play — a child in a lesson needs the volume down too.
 // LEARN HOME is the exception, and deliberately: it is a modal menu (#learnOverlay, z120) with the
 // bar sealed underneath it, so the six controls showing through the blur were visible and dead. The
 // bar is hidden there now and comes back the moment a lesson starts, which is the moment sound does.
 // So learn is checked INSIDE a lesson, not on the menu — and "reachable" means it answers a tap,
 // not merely that it has a rectangle.
 for(const mode of ['play','studio','learn']){
   const {ctx,p}=await open(390,844,mode);
   if(mode==='learn'){await p.evaluate(()=>{const c=document.querySelector('#learnOverlay .uCard');if(c)c.click();});
                      await p.waitForTimeout(1400);}
   const v=await p.evaluate(()=>{const e=document.getElementById('volMute');
     if(!e)return 'absent';const c=getComputedStyle(e);
     if(c.display==='none'||c.visibility==='hidden')return 'hidden';
     const r=e.getBoundingClientRect();
     if(!(r.width>=44&&r.height>=44&&r.top>=0&&r.bottom<=innerHeight))return 'offscreen/small';
     const t=document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+r.height/2));
     return (t===e||e.contains(t))?'ok':'covered by '+((t&&(t.id||t.className))||'?');});
   ok(v==='ok','['+mode+'] mute is reachable ('+v+')');
   await ctx.close();}

 // ---------- 3. COLOUR IS NEVER THE ONLY SIGNAL (WCAG 1.4.1) ----------
 // There used to be a colour-blind toggle here. It swapped four CSS tokens for darker, more separated
 // ones -- real, measurable (pink vs mint went from dE 4.8 to 15.0 under deuteranopia) but hidden
 // behind a switch almost nobody finds, and dark enough to fight the crayon art everywhere else.
 // 1.4.1 does not actually ask for a special palette. It asks that colour is never the ONLY way to
 // know something. That is the thing worth testing, for every user, with no switch to find.
 {const {ctx,p}=await open(390,844,null);
  const gone=await p.evaluate(()=>({box:!!document.getElementById('cbdBox'),
    chk:!!document.getElementById('cbdChk'),fn:typeof window.setCBD}));
  ok(!gone.box&&!gone.chk,'the colour-blind switch is gone from the splash');
  ok(gone.fn==='undefined','and its code went with it, not just the button');
  await ctx.close();}

 // every rung a child has to tell apart carries a WORD, not just a colour
 {const {ctx,p}=await open(390,844,null);
  await p.goto('http://127.0.0.1:8765/index.html?l=majorscale');
  await p.waitForTimeout(3000);await askQuestions(p);
  const rungs=await p.evaluate(()=>[...document.querySelectorAll('.lgRung')].map(r=>({
    txt:(r.querySelector('.rgName')||{}).textContent||'',
    abc:(r.querySelector('.rgAbc')||{}).textContent||'',
    bg:getComputedStyle(r).getPropertyValue('--rc')})));
  ok(rungs.length>0,'the ladder rendered ('+rungs.length+' rungs)');
  ok(rungs.every(r=>r.txt.trim().length>0),'every rung is named in words, not only tinted');
  ok(rungs.every(r=>r.abc.trim().length>0),'and carries its letter name too');
  ok(new Set(rungs.map(r=>r.txt)).size===rungs.length,'no two rungs share a label');
  await ctx.close();}

 // an ON step must be marked by a shape, not only a fill (SC 1.4.1)
 {const {ctx,p}=await open(1440,900,'studio');
  const dot=await p.evaluate(()=>{const c=document.querySelector('#stepGrid .sgCell.on');
    if(!c)return 'no lit step';
    const a=getComputedStyle(c,'::after');
    return (a.content&&a.content!=='none'&&parseFloat(a.width)>3)?'ok':('content='+a.content+' w='+a.width);});
  ok(dot==='ok','a lit step carries a DOT as well as a colour ('+dot+')');
  await ctx.close();}

 // ---------- 4. CONGRUENCE ----------
 {const pos={};
  for(const mode of ['play','studio']){
    const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();
    await p.goto('file://'+process.cwd()+'/index.html');await p.waitForTimeout(450);
    await p.click(`.modeCard[data-m="${mode}"]`);await p.waitForTimeout(2000);
    // Wait for the webfont before measuring. Text measured in the fallback font is a few px wider or
    // narrower, which made this check report a 3px drift on one run and 0 on the next -- flaky, and a
    // flaky check is worse than no check because you stop believing it.
    await p.evaluate(()=>document.fonts&&document.fonts.ready?document.fonts.ready:null).catch(()=>{});
    await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    await p.waitForTimeout(250);
    pos[mode]=await p.evaluate(()=>{const o={};
      ['playBtn','recBtn','slimeBig','hdrChord'].forEach(id=>{const e=document.getElementById(id);
        if(!e)return;const r=e.getBoundingClientRect();o[id]=Math.round(r.left);});
      return o;});
    await ctx.close();}
  for(const k of ['playBtn','recBtn','slimeBig','hdrChord']){
    const d=Math.abs((pos.play[k]||0)-(pos.studio[k]||0));
    ok(d<=2,'#'+k+' is at the same x in play and studio (drift '+d+'px)');}}

 // ---------- 4b. THE CONTROLS MUST HOLD STILL WHILE THE MUSIC PLAYS ----------
 // The chord chip prints the chord name, and "G", "Bb" and "F#m" are different widths. The transport
 // row is centred, so the chip growing by 6px slid the play button, record button and slime switch
 // sideways on EVERY chord change -- a child aiming at a button that moves. Both that chip and the
 // play/pause label (whose text also swaps width) now reserve their width. This watches real playback
 // across several chords and demands that every control stays at exactly ONE x position.
 {const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();
  await p.goto('file://'+process.cwd()+'/index.html?m=studio');await p.waitForTimeout(3000);
  const r=await p.evaluate(()=>new Promise(res=>{
    const ids=['playBtn','recBtn','slimeBig','hdrChord','chordBtn'];
    const seen={},names=new Set();let n=0;
    ids.forEach(i=>seen[i]=new Set());
    const iv=setInterval(()=>{
      ids.forEach(i=>{const e=document.getElementById(i);if(e)seen[i].add(Math.round(e.getBoundingClientRect().left));});
      const hc=document.getElementById('hcName');if(hc&&hc.textContent.trim())names.add(hc.textContent.trim());
      if(++n>=170){clearInterval(iv);const o={};ids.forEach(i=>o[i]=[...seen[i]]);res({pos:o,chords:[...names]});}
    },100);}));
  ok(r.chords.length>=3,'the chord actually changed while we watched ('+r.chords.length+' chords: '+r.chords.join(' ')+')');
  for(const k in r.pos){
    const xs=r.pos[k];
    ok(xs.length===1,'#'+k+' never moves while the music plays ('+xs.length+' position'+(xs.length===1?'':'s '+JSON.stringify(xs))+')');}
  await ctx.close();}

 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'accessibility + congruence clean'));
 process.exit(FAIL.length?1:0);})();

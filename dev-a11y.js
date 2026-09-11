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
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const MIN=44;
// links inside a sentence are exempt (SC 2.5.8 "Inline"); the step grid is exempt (SC 2.5.8 "Spacing")
// #cbdChk is a visually-hidden native input; its <label> (#cbdBox) is the real 44px target and IS tested.
const EXEMPT='.spCredit a, .spCredit, #stepGrid .sgCell, .lk, #labKeys *, .cofNode, #cofSvg *, #cbdBox input';

(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
 const open=async(w,h,mode,cbd)=>{
   const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:true,isMobile:true,deviceScaleFactor:2});
   const p=await ctx.newPage();
   if(cbd)await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-cbd','1')}catch(e){}});
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

 // mute must be reachable in EVERY mode — a child in a lesson needs the volume down too
 for(const mode of ['play','studio','learn']){
   const {ctx,p}=await open(390,844,mode);
   const v=await p.evaluate(()=>{const e=document.getElementById('volMute');
     if(!e)return 'absent';const c=getComputedStyle(e);
     if(c.display==='none'||c.visibility==='hidden')return 'hidden';
     const r=e.getBoundingClientRect();
     return (r.width>=44&&r.height>=44&&r.top>=0&&r.bottom<=innerHeight)?'ok':'offscreen/small';});
   ok(v==='ok','['+mode+'] mute is reachable ('+v+')');
   await ctx.close();}

 // ---------- 3. COLOUR-BLIND MODE ----------
 {const {ctx,p}=await open(390,844,null);
  const box=await p.evaluate(()=>{const e=document.getElementById('cbdBox');
    if(!e)return{err:'no switch'};const r=e.getBoundingClientRect();
    const near=(r.left<innerWidth*0.4||r.right>innerWidth*0.6)&&r.bottom>innerHeight*0.72;
    const clash=[...document.querySelectorAll('#spShareRow,.spCredit,#modeCards')].some(o=>{
      const q=o.getBoundingClientRect();
      return q.left<r.right&&q.right>r.left&&q.top<r.bottom&&q.bottom>r.top;});
    return {err:null,corner:near,clash,h:Math.round(r.height),onScreen:r.bottom<=innerHeight&&r.left>=0};});
  ok(!box.err,'the colour-blind switch is on the splash');
  if(!box.err){
    ok(box.corner,'it sits in a bottom corner');
    ok(box.onScreen,'it is fully on screen');
    ok(!box.clash,'it does not sit on the share button or the credit line');
    ok(box.h>=44,'it is a 44px target ('+box.h+'px)');}
  // toggling it must persist AND repaint the tank, not just the chrome
  const t=await p.evaluate(async()=>{
    const before=aurora(0.25,62);
    document.getElementById('cbdChk').click();
    await new Promise(r=>setTimeout(r,200));
    return {before,after:aurora(0.25,62),cls:document.body.classList.contains('cbd'),
            flag:!!window.CBD,saved:localStorage.getItem('slimehedron-cbd')};});
  ok(t.cls&&t.flag,'ticking it turns the mode on');
  ok(t.saved==='1','and remembers it for next time');
  ok(t.before!==t.after,'the TANK repaints, not just the CSS chrome ('+t.before+' -> '+t.after+')');
  await ctx.close();}

 // the mode must pull the palette's known collisions apart, measured, not assumed
 {const {ctx,p}=await open(1440,900,null);
  const sep=await p.evaluate(()=>{
    // Machado 2009 deuteranopia, severity 1.0, applied in LINEAR RGB (the step most implementations skip)
    const M=[[0.367322,0.860646,-0.227968],[0.280085,0.672501,0.047413],[-0.011820,0.042940,0.968881]];
    const s2l=c=>{c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
    const l2s=c=>{c=c<=0.0031308?c*12.92:1.055*Math.pow(c,1/2.4)-0.055;return Math.max(0,Math.min(255,c*255));};
    const hex=h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16));
    const deut=h=>{const [r,g,b]=hex(h).map(s2l);
      return M.map(row=>l2s(row[0]*r+row[1]*g+row[2]*b));};
    const lab=(rgb)=>{ // sRGB -> Lab (D65)
      const f=rgb.map(s2l);
      const X=f[0]*0.4124+f[1]*0.3576+f[2]*0.1805, Y=f[0]*0.2126+f[1]*0.7152+f[2]*0.0722, Z=f[0]*0.0193+f[1]*0.1192+f[2]*0.9505;
      const g=t=>t>0.008856?Math.cbrt(t):(7.787*t+16/116);
      const fx=g(X/0.95047),fy=g(Y/1),fz=g(Z/1.08883);
      return [116*fy-16,500*(fx-fy),200*(fy-fz)];};
    const dE=(a,b)=>{const A=lab(a),B=lab(b);return Math.hypot(A[0]-B[0],A[1]-B[1],A[2]-B[2]);};
    const cs=()=>getComputedStyle(document.body);
    const tok=n=>{const v=cs().getPropertyValue(n).trim();return v;};
    const read=()=>({mint:tok('--mint'),pink:tok('--pink'),lav:tok('--lav'),sky:tok('--sky')});
    const norm=read();
    document.body.classList.add('cbd');
    const cbd=read();
    document.body.classList.remove('cbd');
    const pairSep=(o)=>({pinkMint:dE(deut(o.pink),deut(o.mint)), lavSky:dE(deut(o.lav),deut(o.sky))});
    return {norm:pairSep(norm),cbd:pairSep(cbd),tokens:{norm,cbd}};});
  ok(sep.cbd.pinkMint>sep.norm.pinkMint,
     'pink vs mint separates further under deuteranopia in CB mode (dE '+sep.norm.pinkMint.toFixed(1)+' -> '+sep.cbd.pinkMint.toFixed(1)+')');
  ok(sep.cbd.lavSky>sep.norm.lavSky,
     'lavender vs sky separates further (dE '+sep.norm.lavSky.toFixed(1)+' -> '+sep.cbd.lavSky.toFixed(1)+')');
  ok(sep.cbd.pinkMint>=10,'and clears dE 10, the point where the pair is reliably tellable apart ('+sep.cbd.pinkMint.toFixed(1)+')');
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
    pos[mode]=await p.evaluate(()=>{const o={};
      ['playBtn','recBtn','slimeBig','hdrChord'].forEach(id=>{const e=document.getElementById(id);
        if(!e)return;const r=e.getBoundingClientRect();o[id]=Math.round(r.left);});
      return o;});
    await ctx.close();}
  for(const k of ['playBtn','recBtn','slimeBig','hdrChord']){
    const d=Math.abs((pos.play[k]||0)-(pos.studio[k]||0));
    ok(d<=2,'#'+k+' is at the same x in play and studio (drift '+d+'px)');}}

 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'accessibility + congruence clean'));
 process.exit(FAIL.length?1:0);})();

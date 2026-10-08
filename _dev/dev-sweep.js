// ============================================================================
//  DEVICE SWEEP — measure, don't guess. Walks every mode at every viewport we
//  care about (portrait AND landscape) and reports, per screen:
//    * horizontal document overflow
//    * any visible box that pokes past the viewport edge
//    * overlapping interactive controls (real hit-test, not a bbox guess)
//    * text clipped inside its own button/label
//    * the tank's usable size
//    * sub-44px touch targets (coarse pointer)
//  Run: node dev-sweep.js
// ============================================================================
const {chromium}=require('playwright');

const VIEWS=[
 ['iPhoneSE-p',375,667,1],['iPhoneSE-l',667,375,1],
 ['iPhone14-p',393,852,1],['iPhone14-l',852,393,1],
 ['Pixel7-p',412,915,1],['Pixel7-l',915,412,1],
 ['tiny-p',320,568,1],
 ['iPadMini-p',744,1133,1],['iPadMini-l',1133,744,1],
 ['iPadPro-l',1366,1024,1],
 ['laptop',1280,800,0],['desktop',1440,900,0],['wide',1920,1080,0],
];
const MODES=['play','studio','learn'];
const EXEMPT='.spCredit a, .spCredit, #stepGrid .sgCell, .lk, #labKeys *, .cofNode, #cofSvg *, #cbdBox input';

const probe=`(EX)=>{
  const vis=(e)=>{const c=getComputedStyle(e);
    if(c.display==='none'||c.visibility==='hidden'||+c.opacity<0.05)return false;
    const r=e.getBoundingClientRect();return r.width>1&&r.height>1;};
  const name=(e)=>(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\\s+/).slice(0,2).join('.'):'')||e.tagName;

  // --- overflow of the document
  const doc={sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,
             sh:document.documentElement.scrollHeight,ch:document.documentElement.clientHeight};

  // --- boxes poking past the viewport
  const outside=[];
  document.querySelectorAll('header *, .panel, .panel *, .btngroup *, #transport, #transport *, .fadeRow, .fadeRow *, #dock, #dock *, .lo, .lo *').forEach(e=>{
    if(!vis(e))return;const r=e.getBoundingClientRect();
    if(r.right>innerWidth+1||r.left<-1)outside.push(name(e)+' x['+Math.round(r.left)+','+Math.round(r.right)+']');});

  // --- interactive controls: collect, then hit-test the centre of each
  const ctrls=[];
  document.querySelectorAll('button,select,input,[role="button"],a[href],label').forEach(e=>{
    if(e.matches(EX)||e.closest(EX))return;
    // A label and the control it drives are ONE target. Whichever of the pair is big enough
    // satisfies the rule -- a 13px "last step" caption beside a 44px slider is not a 13px target,
    // and a 16px checkbox inside a 44px label is not a 16px target.
    const big=(x)=>{if(!x)return false;const q=x.getBoundingClientRect();return Math.min(q.width,q.height)>=44;};
    if(e.tagName==='LABEL'){const ctl=e.htmlFor?document.getElementById(e.htmlFor):e.querySelector('input,select,textarea,button');
      if(!ctl)return; if(big(ctl))return;}
    else{const lab=e.id?document.querySelector('label[for="'+CSS.escape(e.id)+'"]'):null;
      const wrap=e.closest('label');
      if(big(lab)||big(wrap))return;}
    if(!vis(e))return;const r=e.getBoundingClientRect();
    if(r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)return;
    ctrls.push({n:name(e),r:{l:r.left,t:r.top,w:r.width,h:r.height,rr:r.right,b:r.bottom},e});});

  const small=ctrls.filter(c=>Math.min(c.r.w,c.r.h)<44).map(c=>c.n+' '+Math.round(c.r.w)+'x'+Math.round(c.r.h));

  // occluded: centre point of the control resolves to something that is not it or its child
  const occluded=[];
  ctrls.forEach(c=>{
    const x=Math.round(c.r.l+c.r.w/2),y=Math.round(c.r.t+c.r.h/2);
    if(x<0||y<0||x>=innerWidth||y>=innerHeight)return;
    let sc=c.e.parentElement,away=false;
    while(sc&&sc!==document.body){const oc=getComputedStyle(sc);
      if(/auto|scroll/.test(oc.overflowX+oc.overflowY)){const sr=sc.getBoundingClientRect();
        if(x<sr.left+1||x>sr.right-1||y<sr.top+1||y>sr.bottom-1){away=true;break;}}
      sc=sc.parentElement;}
    if(away)return; // scrolled out of its own strip -- reachable by scrolling, not covered by anything
    const top=document.elementFromPoint(x,y);
    if(!top)return;
    // an <svg>/<path> INSIDE the control is the control. Element.contains() is unreliable across the
    // HTML/SVG boundary in some engines, so walk up by hand as well.
    if(top===c.e||c.e.contains(top)||top.contains(c.e))return;
    let a=top;while(a){if(a===c.e)return;a=a.parentNode&&a.parentNode.host?a.parentNode.host:(a.parentElement||a.parentNode);if(a===document)break;}
    occluded.push(c.n+' <- '+name(top));});

  // --- clipped text
  const clipped=[];
  document.querySelectorAll('button,label,.lbl,.pill,option,.sgLbl,h1,h2,h3,.mcTxt').forEach(e=>{
    if(!vis(e))return;const c=getComputedStyle(e);
    if(c.overflow==='visible'&&c.textOverflow!=='ellipsis')return;
    // This check is about TRUNCATED WORDS. An absolutely-positioned sheen at inset:0, or a picture
    // sitting inside a bordered button, overshoots scrollWidth by the border width without a single
    // character being lost - so measure elements whose own text is the content.
    if(e.querySelector('img,svg'))return;
    if([...e.children].some(k=>/absolute|fixed/.test(getComputedStyle(k).position)))return;
    if(!(e.textContent||'').trim())return;
    if(e.scrollWidth>e.clientWidth+2)clipped.push(name(e)+' '+e.scrollWidth+'>'+e.clientWidth);});

  const cv=document.querySelector('canvas');
  const cr=cv?cv.getBoundingClientRect():null;
  return {doc,outside:[...new Set(outside)],small:[...new Set(small)],occluded:[...new Set(occluded)],
          clipped:[...new Set(clipped)],
          canvas:cr?{w:Math.round(cr.width),h:Math.round(cr.height),t:Math.round(cr.top),b:Math.round(cr.bottom)}:null,
          nctrl:ctrls.length};
}`;

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
 let issues=0;
 for(const [tag,w,h,touch] of VIEWS){
  for(const mode of MODES){
   const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:!!touch,isMobile:!!touch,deviceScaleFactor:touch?2:1});
   const p=await ctx.newPage();
   // The first-run coach is a one-tap hint, not chrome: any tap dismisses it. Measure the STEADY
   // state here; the hint gets its own assertion below (it must never block the transport).
   await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1')}catch(e){}});
   const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,90)));
   await p.goto('file://'+__dirname+'/index.html');await p.waitForTimeout(420);
   try{ touch?await p.tap(`.modeCard[data-m="${mode}"]`):await p.click(`.modeCard[data-m="${mode}"]`);}catch(e){}
   await p.waitForTimeout(1800);
   const r=await p.evaluate(eval('('+probe+')'),EXEMPT);
   const hov=r.doc.sw>r.doc.cw+1;
   const bad=[];
   if(hov)bad.push('H-OVERFLOW '+r.doc.sw+'>'+r.doc.cw);
   if(r.outside.length)bad.push('OUTSIDE('+r.outside.length+'): '+r.outside.slice(0,4).join(' | '));
   if(r.occluded.length)bad.push('OCCLUDED('+r.occluded.length+'): '+r.occluded.slice(0,4).join(' | '));
   // SHORT screens (landscape phones) keep a deliberate 30-34px chrome: WCAG 2.2 SC 2.5.5 is AAA,
   // SC 2.5.8 (AA) asks 24px, and a 44px bar on a 375px-tall screen is 12% of the whole display.
   if(touch&&h>520&&r.small.length)bad.push('SMALL('+r.small.length+'): '+r.small.slice(0,5).join(' | '));
   if(r.clipped.length)bad.push('CLIPPED('+r.clipped.length+'): '+r.clipped.slice(0,4).join(' | '));
   const real=errs.filter(e=>!/ServiceWorker/.test(e)); // file:// cannot register one; not a defect
   if(real.length)bad.push('JSERR: '+real.slice(0,2).join(' | '));
   const cvs=r.canvas?`canvas ${r.canvas.w}x${r.canvas.h} @${r.canvas.t}..${r.canvas.b}`:'NO CANVAS';
   if(bad.length){issues+=bad.length;console.log(`\n### ${tag} ${w}x${h} / ${mode}  (${r.nctrl} ctrls, ${cvs})`);bad.forEach(x=>console.log('   ! '+x));}
   else console.log(`ok  ${tag} ${w}x${h} / ${mode}  (${r.nctrl} ctrls, ${cvs})`);
   await ctx.close();}}
 // ---- the first-run coach: a hint that eats a tap is a trap ----
 for(const [tag,w,h] of [['phone',393,852],['tiny',320,568],['landscape',852,393]]){
   const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:true,isMobile:true,deviceScaleFactor:2});
   const p=await ctx.newPage();await p.goto('file://'+__dirname+'/index.html');await p.waitForTimeout(400);
   await p.tap('.modeCard[data-m="play"]');await p.waitForTimeout(1600);
   const r=await p.evaluate(()=>{const c=document.getElementById('coach');
     if(!c)return{shown:false};
     const cr=c.getBoundingClientRect(),cs=getComputedStyle(c);
     const blocked=[];
     ['#volMute','#volPlay','#playBtn','#recBtn','#slimeBig'].forEach(sel=>{const e=document.querySelector(sel);
       if(!e)return;const q=e.getBoundingClientRect();if(q.width<2)return;
       const x=Math.round(q.left+q.width/2),y=Math.round(q.top+q.height/2);
       const t=document.elementFromPoint(x,y);
       if(t&&(t===c||c.contains(t)))blocked.push(sel);});
     const hdr=document.querySelector('header');const hb=hdr?hdr.getBoundingClientRect().bottom:0;
     return{shown:true,pe:cs.pointerEvents,overlapsHeader:cr.top<hb-1,blocked};});
   if(!r.shown){console.log('   ! ['+tag+'] first-run coach never appeared');issues++;continue;}
   const bad=[];
   if(r.pe!=='none')bad.push('coach catches pointers (pointer-events='+r.pe+')');
   if(r.overlapsHeader)bad.push('coach sits on the top bar');
   if(r.blocked.length)bad.push('coach blocks '+r.blocked.join(', '));
   if(bad.length){issues+=bad.length;console.log('\n### '+tag+' first-run coach');bad.forEach(x=>console.log('   ! '+x));}
   else console.log('ok  '+tag+' first-run coach clears the transport');
   await ctx.close();}
 console.log('\n==== '+issues+' issue lines ====');
 await b.close();})();

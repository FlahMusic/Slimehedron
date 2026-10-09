// ============================================================================================
//  TOOLS TEST — the four standalone instruments.
//  Three of them BORROW studio's live panel and must hand it back on close; if they don't, studio
//  loses its circle of fifths / chord editor / step grid for the rest of the session. That is the
//  failure mode this suite exists for. Also: every window opens, every window closes, the exit and
//  back buttons are real 44px targets, and the metronome actually clicks.
//  Needs a local server: python3 -m http.server 8765
//  Run: node dev-tools.js
// ============================================================================================
const {launch}=require('./browser');   // one place decides where Chromium is - see _dev/browser.js
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const TOOLS=[['metro','Metronome'],['cof','Circle of fifths'],['chord','Chords'],['drums','Drum machine']];

(async()=>{const b=await launch();
 for(const [tag,w,h] of [['desktop',1280,900],['phone',393,852]]){
  const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:w<600,isMobile:w<600});
  const p=await ctx.newPage();
  await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1')}catch(e){}});
  const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,90)));
  await p.goto('http://127.0.0.1:8765/index.html');await p.waitForTimeout(900);

  // the shelf is on the front door, under the three doors
  const card=await p.evaluate(()=>{const e=document.getElementById('toolsCard');if(!e)return null;
    const r=e.getBoundingClientRect(),cards=document.getElementById('modeCards').getBoundingClientRect();
    return {h:Math.round(r.height),below:r.top>=cards.bottom-2,on:r.bottom<=innerHeight+1};});
  ok(!!card,'['+tag+'] there is a tools card on the front door');
  if(card){ok(card.below,'['+tag+'] and it sits BELOW the three main doors');
           ok(card.h>=44,'['+tag+'] and it is a real target ('+card.h+'px)');}

  // open the shelf
  await (w<600?p.tap('#toolsCard'):p.click('#toolsCard'));
  await p.waitForTimeout(2200);
  const menu=await p.evaluate(()=>({on:document.getElementById('toolsOv').classList.contains('on'),
    picks:[...document.querySelectorAll('#toolsOv [data-tool]')].map(e=>e.dataset.tool)}));
  ok(menu.on,'['+tag+'] tapping it opens the tools window');
  ok(menu.picks.length===4,'['+tag+'] with all four tools ('+menu.picks.join(', ')+')');

  // where studio's panels live BEFORE anything is borrowed
  const homes=await p.evaluate(()=>{const g=id=>{const e=document.getElementById(id);
    return e?(e.parentNode.id||e.parentNode.className||e.parentNode.tagName):null;};
    return {cofWheel:g('cofWheel'),chordPanel:g('chordPanel'),stepGrid:g('stepGrid')};});

  for(const [k,title] of TOOLS){
    await p.click('#toolsOv [data-tool="'+k+'"]');await p.waitForTimeout(700);
    const r=await p.evaluate(()=>{const c=document.querySelector('#toolsOv .twCard');
      const head=document.querySelector('#toolsOv .twHead b');
      const xs=[...document.querySelectorAll('#toolsOv .twX')].map(e=>{const q=e.getBoundingClientRect();
        return Math.round(Math.min(q.width,q.height));});
      const body=document.querySelector('#toolsOv .twBody');
      const host=document.querySelector('#toolsOv .twHost');
      const cr=c?c.getBoundingClientRect():null;
      return {title:head?head.textContent:'', xs, onScreen:cr?(cr.top>=-1&&cr.left>=-1&&cr.right<=innerWidth+1):false,
        w:cr?Math.round(cr.width):0, filled:host?host.children.length:(body?body.children.length:0),
        vw:innerWidth};});
    ok(r.title===title,'['+tag+'] '+k+' opens its own window ("'+r.title+'")');
    ok(r.filled>0,'['+tag+'] '+k+' has something in it');
    ok(r.xs.length>=1&&r.xs.every(v=>v>=44),'['+tag+'] '+k+' close/back buttons are 44px+ ('+r.xs.join(',')+')');
    ok(r.onScreen,'['+tag+'] '+k+' window is fully on screen');
    ok(r.w>=Math.min(320,r.vw*0.8),'['+tag+'] '+k+' window is ENLARGED, not a tooltip ('+r.w+'px of '+r.vw+')');
    if(k==='metro'){
      await p.click('#toolsOv [data-tw="mstart"]');await p.waitForTimeout(1400);
      const lit=await p.evaluate(()=>document.querySelectorAll('#twBeats i.on').length);
      ok(lit>=1,'['+tag+'] the metronome runs and shows the beat ('+lit+' lit)');
      await p.click('#toolsOv [data-tw="mstart"]');}
    await p.click('#toolsOv [data-tw="back"]');await p.waitForTimeout(500);
  }

  // THE ONE THAT MATTERS: every borrowed panel went home
  await p.evaluate(()=>window._toolsClose&&window._toolsClose());
  await p.waitForTimeout(400);
  const back=await p.evaluate(()=>{const g=id=>{const e=document.getElementById(id);
    return e?(e.parentNode.id||e.parentNode.className||e.parentNode.tagName):null;};
    return {cofWheel:g('cofWheel'),chordPanel:g('chordPanel'),stepGrid:g('stepGrid'),
            leftBehind:document.querySelectorAll('#toolsOv #cofWheel,#toolsOv #chordPanel,#toolsOv #stepGrid').length};});
  for(const id of ['cofWheel','chordPanel','stepGrid'])
    ok(back[id]===homes[id],'['+tag+'] #'+id+' was handed back to studio ('+homes[id]+' -> '+back[id]+')');
  ok(back.leftBehind===0,'['+tag+'] nothing is stranded inside the tools overlay');

  const real=errs.filter(e=>!/ServiceWorker/.test(e));
  ok(real.length===0,'['+tag+'] no page errors'+(real.length?': '+real[0]:''));
  await ctx.close();}
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'all four tools open, close, and give studio its panels back'));
 process.exit(FAIL.length?1:0);})();

// ============================================================================================
//  THE SLIMES MUST NOT STAND ON EACH OTHER — IN EVERY MODE, ON EVERY SCREEN.
//  Every family of decoration avoided the FURNITURE (controls, tank, mixer) but not the OTHER
//  families, and three of them placed themselves outside the shared pass entirely. What that
//  looked like, all found by measuring rather than looking:
//    - lesson mode hides the tank, so `cv` measures 0x0 and every band computed from it was
//      nonsense: three margin slimes landed on the same pixel, above the top of the screen
//    - the phone scatter called addFill() directly, bypassing the collision gate
//    - the worm placed himself off the tank's right edge, which with no tank is mid-screen —
//      on the studio "Pattern" heading and across the lesson list
//    - the rainbow girl was pinned at left:22% and never looked at anything; once 93% on the worm
//    - the side peekers are rotated by CSS, so on a small phone they sat entirely off the edge:
//      visible to the CSS, invisible to the child, and still counted as placed
//  So this checks every page and every state at every size, and checks three things: nothing on
//  top of anything, nothing on top of a word, and nothing placed where it cannot be seen.
//  Run: node dev-crowding.js   (needs python3 -m http.server 8765)
// ============================================================================================
const {launch}=require('./browser');   // one place decides where Chromium is - see _dev/browser.js
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};

const SIZES=[['desktop',1440,900],['laptop',1280,800],['tablet',820,1180],
             ['phone',393,852],['small phone',360,740],['landscape',852,393]];
const STATES=[
  ['landing','/landing.html',null],
  ['splash','/index.html',null],
  ['play','/index.html?m=play',null],
  ['studio','/index.html?m=studio',null],
  ['learn','/index.html?m=learn',null],
  ['lesson','/index.html?l=pulse',null],
  ['tools','/index.html?m=studio','tools'],
  ['keyboard','/index.html?m=studio','keys'],
];

const SURVEY=()=>{
  const vis=e=>{const s=getComputedStyle(e);
    if(s.display==='none'||s.visibility==='hidden'||parseFloat(s.opacity)<0.05)return false;
    const b=e.getBoundingClientRect();return b.width>2&&b.height>2;};
  const els=[...document.querySelectorAll('.slime,.mote,.gdecor,.floaty,#wormEl')].filter(vis)
    .map(e=>{const b=e.getBoundingClientRect();
      return {id:(e.id||e.className).toString().replace(/\s+/g,'.').slice(0,24),
        l:b.left,t:b.top,r:b.right,bo:b.bottom,w:b.width,h:b.height,worm:e.id==='wormEl'};});

  // 1. nothing on top of anything
  let pairs=0,worst=0;const ex=[];
  for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){
    const a=els[i],c=els[j];
    const ox=Math.min(a.r,c.r)-Math.max(a.l,c.l), oy=Math.min(a.bo,c.bo)-Math.max(a.t,c.t);
    if(ox>0&&oy>0){const f=(ox*oy)/Math.max(1,Math.min(a.w*a.h,c.w*c.h));
      if(f>0.05){pairs++;worst=Math.max(worst,f);
        if(ex.length<3)ex.push(a.id+' on '+c.id+' '+Math.round(f*100)+'%');}}}

  // 2. nothing on top of a WORD. Leaf-ish elements with real text only — a wrapper div that
  //    happens to span the page is not a label, and counting it produces phantom failures.
  const words=[...document.querySelectorAll('h1,h2,h3,p,li,button,a,label,span')].filter(e=>{
    if(!vis(e))return false;
    if(e.children.length>2)return false;
    return (e.textContent||'').trim().length>3;}).map(e=>({r:e.getBoundingClientRect(),
      t:(e.textContent||'').trim().slice(0,18)}));
  let onText=0;const tex=[];
  for(const e of els)for(const w of words){
    const ox=Math.min(e.r,w.r.right)-Math.max(e.l,w.r.left);
    const oy=Math.min(e.bo,w.r.bottom)-Math.max(e.t,w.r.top);
    if(ox>3&&oy>3){onText++;if(tex.length<3)tex.push(e.id+' on "'+w.t+'"');}}

  // 3. nothing placed where it cannot be seen
  let unseen=0;const uex=[];
  for(const e of els){
    const vx=Math.max(0,Math.min(e.r,innerWidth)-Math.max(e.l,0));
    const vy=Math.max(0,Math.min(e.bo,innerHeight)-Math.max(e.t,0));
    if((vx*vy)/Math.max(1,e.w*e.h)<0.15){unseen++;if(uex.length<2)uex.push(e.id);}}

  // how much room the worm gets to himself
  const worm=els.find(e=>e.worm);let wormGap=null;
  if(worm){wormGap=1e9;
    for(const e of els){if(e.worm)continue;
      const dx=Math.max(0,Math.max(worm.l-e.r,e.l-worm.r));
      const dy=Math.max(0,Math.max(worm.t-e.bo,e.t-worm.bo));
      wormGap=Math.min(wormGap,Math.hypot(dx,dy));}
    if(wormGap===1e9)wormGap=null;}
  return {n:els.length,pairs,worst:+worst.toFixed(2),ex,onText,tex,unseen,uex,wormGap};
};

(async()=>{
const b=await launch();

for(const [state,url,extra] of STATES){
  for(const [tag,w,h] of SIZES){
    const ctx=await b.newContext({viewport:{width:w,height:h}});
    const p=await ctx.newPage();
    const errs=[];p.on('pageerror',e=>errs.push(e.message));
    const where='['+state+'/'+tag+']';
    try{
      await p.goto('http://127.0.0.1:8765'+url);
      await p.waitForTimeout(3400);
      if(extra==='tools')await p.evaluate(()=>{try{window._toolsMenu&&window._toolsMenu();}catch(e){}});
      if(extra==='keys')await p.evaluate(()=>{const b=document.getElementById('kbBtn');if(b)b.click();});
      if(extra)await p.waitForTimeout(1300);

      const rest=await p.evaluate(SURVEY);
      ok(rest.pairs===0,where+' '+rest.n+' decorations, none on top of another'+
        (rest.pairs?' — '+rest.pairs+' overlapping, worst '+Math.round(rest.worst*100)+'%: '+rest.ex.join(' | '):''));
      ok(rest.onText===0,where+' nothing covering a word'+(rest.onText?' — '+rest.tex.join(' | '):''));
      ok(rest.unseen===0,where+' nothing placed where it cannot be seen'+
        (rest.unseen?' — '+rest.unseen+': '+rest.uex.join(', '):''));

      // the hop is the runtime placer, and is where most of the pile-ups came from
      await p.evaluate(()=>{for(let i=0;i<40;i++){try{window._morphSlime&&window._morphSlime();}catch(e){}}});
      await p.waitForTimeout(1400);
      const after=await p.evaluate(SURVEY);
      ok(after.pairs===0,where+' still none on top of another after 40 hops'+
        (after.pairs?' — worst '+Math.round(after.worst*100)+'%: '+after.ex.join(' | '):''));

      if(rest.wormGap!==null)
        ok(rest.wormGap>=6,where+' the worm has room of his own ('+Math.round(rest.wormGap)+'px to his nearest neighbour)');
      ok(errs.length===0,where+' no page errors'+(errs.length?' :: '+errs[0]:''));
    }catch(e){ok(false,where+' blew up :: '+e.message.slice(0,70));}
    await ctx.close();
  }
}
await b.close();
console.log('\n'+(FAIL.length?'FAILED '+FAIL.length+':\n - '+FAIL.join('\n - '):'everybody has their own patch of grass, in every mode, on every screen'));
process.exit(FAIL.length?1:0);
})();

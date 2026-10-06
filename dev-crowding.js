// ============================================================================================
//  THE SLIMES MUST NOT STAND ON EACH OTHER.
//  Every family of decoration avoided the FURNITURE — controls, tank, mixer, worm — but none of them
//  avoided the OTHER families. The nappers hang in the very band the margin slimes fill, the edge
//  peekers slid along their rails without knowing the worm or the band characters existed, and the
//  4-bar morph-hop could drop a slime straight onto a friend. So they piled up, and it read as a bug.
//
//  This measures the actual painted rectangles and counts overlapping pairs. It checks the resting
//  layout AND the layout after the slimes have hopped, because the hop is the runtime placer and is
//  where most of the pile-ups actually came from.
//  Run: node dev-crowding.js   (needs python3 -m http.server 8765)
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};

// a sliver of overlap between two soft hand-drawn blobs is invisible; a fifth of one covered is not.
const TOLERATED=0.05;

const SIZES=[['desktop',1440,900],['laptop',1280,800],['tablet',820,1180],
             ['phone',393,852],['small phone',360,740],['landscape',852,393]];

const SURVEY=()=>{
  const vis=e=>{const s=getComputedStyle(e);
    if(s.display==='none'||s.visibility==='hidden'||parseFloat(s.opacity)<0.05)return false;
    const b=e.getBoundingClientRect();return b.width>2&&b.height>2;};
  const els=[...document.querySelectorAll('.slime,.mote,.gdecor,#wormEl')].filter(vis)
    .map(e=>{const b=e.getBoundingClientRect();
      return {id:e.id||e.className.replace(/\s+/g,'.').slice(0,24),
        l:b.left,t:b.top,r:b.right,bo:b.bottom,w:b.width,h:b.height,
        worm:e.id==='wormEl'};});
  let pairs=0,worst=0;const examples=[];
  for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){
    const a=els[i],c=els[j];
    const ox=Math.min(a.r,c.r)-Math.max(a.l,c.l), oy=Math.min(a.bo,c.bo)-Math.max(a.t,c.t);
    if(ox>0&&oy>0){
      const frac=(ox*oy)/Math.max(1,Math.min(a.w*a.h,c.w*c.h));
      if(frac>0.05){pairs++;worst=Math.max(worst,frac);
        if(examples.length<3)examples.push(a.id+' on '+c.id+' ('+Math.round(frac*100)+'%)');}}}
  // how much clear room does the worm actually get?
  const worm=els.find(e=>e.worm);
  let wormGap=null;
  if(worm){wormGap=1e9;
    for(const e of els){if(e.worm)continue;
      const dx=Math.max(0,Math.max(worm.l-e.r,e.l-worm.r));
      const dy=Math.max(0,Math.max(worm.t-e.bo,e.t-worm.bo));
      wormGap=Math.min(wormGap,Math.hypot(dx,dy));}
    if(wormGap===1e9)wormGap=null;}
  // nothing decorative may cover a label — an unreadable word is worse than a crowded corner
  const words=[...document.querySelectorAll('.psLbl,.psSub,.psItem,header h1')].filter(vis)
    .map(e=>e.getBoundingClientRect());
  let onText=0;
  for(const e of els)for(const t of words){
    const ox=Math.min(e.r,t.right)-Math.max(e.l,t.left), oy=Math.min(e.bo,t.bottom)-Math.max(e.t,t.top);
    if(ox>2&&oy>2)onText++;}
  return {n:els.length,pairs,worst:+worst.toFixed(3),examples,wormGap,onText};
};

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--autoplay-policy=no-user-gesture-required']});

for(const mode of ['play','studio','learn']){
  for(const [tag,w,h] of SIZES){
    const ctx=await b.newContext({viewport:{width:w,height:h}});
    const p=await ctx.newPage();
    const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.goto('http://127.0.0.1:8765/index.html?m='+mode);
    await p.waitForTimeout(3400);

    const rest=await p.evaluate(SURVEY);
    ok(rest.pairs===0,'['+mode+'/'+tag+'] '+rest.n+' decorations, none on top of another'+
      (rest.pairs?' — '+rest.pairs+' overlapping, worst '+Math.round(rest.worst*100)+'%: '+rest.examples.join(' | '):''));
    ok(rest.onText===0,'['+mode+'/'+tag+'] nothing decorative is sitting on a label ('+rest.onText+')');

    // THE HOP. One slime re-places itself every 4 bars; that runtime placer is where the pile-ups
    // mostly came from, so run it hard and check the room again.
    await p.evaluate(()=>{for(let i=0;i<40;i++){try{window._morphSlime&&window._morphSlime();}catch(e){}}});
    await p.waitForTimeout(1400);
    const after=await p.evaluate(SURVEY);
    ok(after.pairs===0,'['+mode+'/'+tag+'] still none on top of another after 40 hops'+
      (after.pairs?' — '+after.pairs+' overlapping, worst '+Math.round(after.worst*100)+'%: '+after.examples.join(' | '):''));

    if(mode!=='learn'&&rest.wormGap!==null)
      ok(rest.wormGap>=6,'['+mode+'/'+tag+'] the worm has room of his own ('+Math.round(rest.wormGap)+'px to his nearest neighbour)');

    ok(errs.length===0,'['+mode+'/'+tag+'] no page errors'+(errs.length?' :: '+errs[0]:''));
    await ctx.close();
  }
}
await b.close();
console.log('\n'+(FAIL.length?'FAILED '+FAIL.length+':\n - '+FAIL.join('\n - '):'everybody has their own patch of grass'));
process.exit(FAIL.length?1:0);
})();

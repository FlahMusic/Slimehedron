// ============================================================================================
//  IS THE MICROTUNING REAL, OR JUST A LABEL?
//  The scale menu offers quarter-tone maqams, Slendro, Pelog and a 19-EDO major. A menu entry that
//  selects without retuning anything is the worst kind of feature: it looks shipped and teaches a
//  child something false. So this does not check that the option exists or that the handler ran --
//  it reads the actual pitch of every wall, in cents, and demands the intervals BE the tuning.
//  19-EDO's major third is 379c (7c flat of a pure 5/4, i.e. better than 12-TET's 400c, which is
//  14c sharp). If the walls say 400c under 19-EDO, the microtuning is decorative.
//  Run: node dev-tuning.js   (needs python3 -m http.server 8765)
// ============================================================================================
const {launch}=require('./browser');   // one place decides where Chromium is - see _dev/browser.js
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};

// scale -> the intervals above the lowest wall that MUST be present, in cents (±3c for rounding)
const WANT={
  major:     {third:400, fifth:700, note:'12-TET'},
  edo19:     {third:379, fifth:695, note:'19-EDO — a better third than 12-TET'},
  maqamRast: {third:350, fifth:700, note:'quarter-tone neutral third'},
};
const TOL=3;

(async()=>{
const b=await launch();
const ctx=await b.newContext({viewport:{width:1440,height:900}});
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8765/index.html?m=studio');
await p.waitForTimeout(2800);

// the picker a human can actually reach. #scale is a hidden duplicate used programmatically;
// #scaleTop is the one on screen, so test the one the user touches.
const reachable=await p.evaluate(()=>{const s=document.getElementById('scaleTop');
  if(!s)return{ok:false};
  const r=s.getBoundingClientRect();
  const micro=[...s.options].filter(o=>/edo|maqam|slendro|pelog|neutral/i.test(o.value)).map(o=>o.value);
  return{ok:r.width>1&&r.height>1,w:Math.round(r.width),micro};});
ok(reachable.ok,'the scale picker is actually on screen in studio ('+reachable.w+'px wide)');
ok(reachable.micro.length>=6,'and it offers the microtonal scales ('+reachable.micro.length+': '+reachable.micro.join(', ')+')');

const seen={};
for(const sc of Object.keys(WANT)){
  const r=await p.evaluate((name)=>{
    const sel=document.getElementById('scaleTop');
    sel.value=name;sel.dispatchEvent(new Event('change',{bubbles:true}));
    return new Promise(res=>setTimeout(()=>{
      const base=Math.min(...edges.map(e=>e.cents));
      res({scale:S.scale,rel:edges.map(e=>Math.round(e.cents-base)),
           hz:edges.map(e=>+freqFromCents(e.cents).toFixed(2))});},450));
  },sc);
  const w=WANT[sc];
  ok(r.scale===sc,'['+sc+'] the app really switched to it (S.scale='+r.scale+')');
  const near=(t)=>r.rel.some(v=>Math.abs(v-t)<=TOL);
  ok(near(w.third),'['+sc+'] a wall sits at '+w.third+'c — '+w.note+' (walls: '+r.rel.join(', ')+')');
  ok(near(w.fifth),'['+sc+'] and its fifth is '+w.fifth+'c, not borrowed from another tuning');
  seen[sc]=r.rel;
}

// The decisive one: these tunings must DIFFER from each other. Three menu entries that all
// produce 12-TET would pass every check above if the targets were sloppy.
const sig=(a)=>a.join(',');
ok(sig(seen.major)!==sig(seen.edo19),'19-EDO is genuinely a different tuning from 12-TET major');
ok(sig(seen.major)!==sig(seen.maqamRast),'the quarter-tone maqam is genuinely different from 12-TET major');
ok(sig(seen.edo19)!==sig(seen.maqamRast),'and 19-EDO and the maqam are different from each other');

ok(errs.length===0,'no page errors ('+errs.length+')'+(errs.length?' :: '+errs[0]:''));
await b.close();
console.log('\n'+(FAIL.length?'FAILED '+FAIL.length+':\n - '+FAIL.join('\n - '):'the microtuning retunes the instrument, it is not a label'));
process.exit(FAIL.length?1:0);
})();

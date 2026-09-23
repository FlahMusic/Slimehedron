// ============================================================================================
//  THE AUTO-MELODY, MEASURED.
//  The generator's comments promised an arch contour, antecedent/consequent phrasing and motif
//  memory. What it actually produced, over 400 generated notes:
//      34.1% immediate repeats · longest run of one note: NINE · long 10-11-10-11 trills
//  Three causes, all "repetitive by design": the cadence walked to its target and then SAT on it;
//  the strong-beat chord snap could pick the note it was already on; and clampDeg clamped only the
//  RETURNED value, so _melDeg drifted out of range and every later note came back as the boundary.
//  A melody you can hear is the whole product. This suite is how it stays one.
//  Needs a local server: python3 -m http.server 8765
//  Run: node dev-melody.js
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};

const N=400;

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});

// run it across several scales — a generator that only behaves in the major scale is not fixed
for(const scale of ['major','minor','pentaMaj','dorian']){
  const ctx=await b.newContext({viewport:{width:1280,height:860}});
  const p=await ctx.newPage();
  await p.goto('http://127.0.0.1:8765/index.html?m=play');
  await p.waitForTimeout(2600);
  const r=await p.evaluate(([sc,n])=>{
    try{S.scale=sc;const el=document.getElementById('scale');if(el)el.value=sc;}catch(e){}
    const seq=[];for(let i=0;i<n;i++)seq.push(nextMelodyDeg(i%2===0));
    return {seq,size:scaleObj().c.length};},[scale,N]);
  await ctx.close();

  const s=r.seq, tag='['+scale+'] ';
  let rep=0,maxRun=1,run=1;
  for(let i=1;i<s.length;i++){ if(s[i]===s[i-1]){rep++;run++;maxRun=Math.max(maxRun,run);} else run=1; }
  const pct=100*rep/(s.length-1);
  const uniq=[...new Set(s)];
  const lo=Math.min(...s),hi=Math.max(...s);
  const atEdge=100*s.filter(x=>x===lo||x===hi).length/s.length;

  // intervals
  const iv=[];for(let i=1;i<s.length;i++)iv.push(Math.abs(s[i]-s[i-1]));
  const steps=iv.filter(d=>d===1).length, skips=iv.filter(d=>d===2||d===3).length,
        leaps=iv.filter(d=>d>=4).length;

  // the two-note trill that the first fix introduced: a-b-a-b-a-b anywhere in the line
  let trill=0,tr=0;
  for(let i=2;i<s.length;i++){ if(s[i]===s[i-2]&&s[i]!==s[i-1]){tr++;trill=Math.max(trill,tr+2);} else tr=0; }

  ok(pct<15,tag+'a repeated note is a choice, not a drone ('+pct.toFixed(1)+'% immediate repeats)');
  ok(maxRun<=3,tag+'no run of the same note longer than 3 ('+maxRun+')');
  ok(trill<=8,tag+'no endless two-note trill ('+trill+' notes was the longest a-b-a-b run)');
  ok(atEdge<20,tag+'it is not grinding against the ends of its range ('+atEdge.toFixed(1)+'% on an extreme)');
  ok(uniq.length>=6,tag+'it actually uses its range ('+uniq.length+' distinct degrees, '+lo+'..'+hi+')');
  ok(steps/iv.length>0.5,tag+'mostly stepwise, the way a singable line moves ('+(100*steps/iv.length).toFixed(0)+'% steps)');
  ok(leaps/iv.length<0.12,tag+'leaps stay rare ('+(100*leaps/iv.length).toFixed(0)+'%)');
  ok(skips>0,tag+'but it still skips sometimes ('+skips+')');
}

console.log(FAIL.length?('\n'+FAIL.length+' FAILURE(S)'):'\nthe line moves like a melody, not a stuck note');
await b.close();process.exit(FAIL.length?1:0);})();

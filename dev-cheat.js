// ============================================================================================
//  THE CHEAT GATE.
//  A lesson that can be cleared by a fixed strategy is not a lesson, it is a button. Three of them
//  were: "The Tonic" and "Find the Tonic" always answered the bottom rung, and "Steps and Skips"
//  lit the answer and walked up in order. All three passed every existing test, because the tests
//  asked whether the lesson RUNS. This one asks whether it can be BEATEN without listening.
//  For each lesson: run a dumb strategy and require it to FAIL, then run the honest one and
//  require it to PASS. A lesson must fail the first test to be worth anything.
//  Run: node dev-cheat.js   (needs python3 -m http.server 8765)
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};

// Play N rounds picking a rung by `strategy`, return how many were right.
async function run(page,lesson,strategy,rounds){
  return await page.evaluate(async({lesson,strategy,rounds})=>{
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    window.LEARN2.home();await sleep(500);
    const card=document.querySelector('.uCard[data-u="'+lesson+'"]');
    if(!card)return{err:'no card for '+lesson};
    card.click();await sleep(1400);
    let right=0;
    for(let i=0;i<rounds;i++){
      const rungs=[...document.querySelectorAll('.lgRung')];
      if(!rungs.length)return{err:'no ladder for '+lesson};
      const degs=rungs.map(r=>+r.dataset.deg);
      const target=window._labHintDeg;
      let pickDeg;
      if(strategy==='bottom')      pickDeg=Math.min(...degs);          // always the lowest rung
      else if(strategy==='lit'){                                        // always whatever is highlighted
        const l=rungs.find(r=>r.classList.contains('target'));
        pickDeg=l?+l.dataset.deg:degs[0];
      }
      else if(strategy==='walk')   pickDeg=degs[i%degs.length];         // march up the ladder
      else                          pickDeg=target;                     // actually listened
      const el=rungs.find(r=>+r.dataset.deg===pickDeg)||rungs[0];
      if(pickDeg===target)right++;
      el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
      el.click();
      await sleep(900);
    }
    return{right,rounds};
  },{lesson,strategy,rounds});
}
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--autoplay-policy=no-user-gesture-required']});
const ctx=await b.newContext({viewport:{width:1440,height:900}});
const p=await ctx.newPage();
p.on('pageerror',e=>{FAIL.push('pageerror: '+e.message);console.log('  FAIL  pageerror: '+e.message);});
await p.goto('http://127.0.0.1:8765/index.html?m=learn');
await p.waitForTimeout(3000);

// "Pitch" offers two buttons, so chance IS 50% and a short sample can spike past the bar on luck
// alone. Sample in short blocks and re-open the lesson between them: enough tries for a stable
// number, without the strategy ever accumulating enough correct answers to COMPLETE the lesson
// (which would leave no ladder to tap and look like a crash).
const BLOCK=8, BLOCKS=4;
const CASES=[
  {id:'home',    cheat:'bottom', label:'The Tonic'},
  {id:'findhome',cheat:'bottom', label:'Find the Tonic'},
  {id:'steps',   cheat:'lit',    label:'Steps and Skips (tap whatever is lit)'},
  {id:'steps',   cheat:'walk',   label:'Steps and Skips (march up the ladder)'},
  {id:'high',    cheat:'bottom', label:'Pitch'},
];
for(const c of CASES){
  let right=0,rounds=0,err=null;
  for(let bl=0;bl<BLOCKS;bl++){
    const r=await run(p,c.id,c.cheat,BLOCK);
    if(r.err){err=r.err;break;}
    right+=r.right;rounds+=r.rounds;}
  if(err){ok(false,c.label+': '+err);continue;}
  const pct=Math.round(right/rounds*100);
  // chance on these ladders is 20-50%. Anything at or above 80% means the strategy IS the lesson.
  ok(pct<80,'['+c.label+'] cannot be cleared without listening ('+pct+'% over '+rounds+' tries, '+c.cheat+' strategy)');
}
console.log('');
// and the honest way must still work, or we have only made it impossible
for(const id of ['home','findhome','steps','high']){
  const r=await run(p,id,'listen',10);
  ok(!r.err&&r.right===10,'['+id+'] a child who actually hears it gets 10/10 ('+(r.err||r.right+'/10')+')');
}
console.log('');
// the letter names have to be REAL -- the right note for the key the ladder is currently in
const abc=await p.evaluate(async()=>{
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  window.LEARN2.home();await sleep(500);
  document.querySelector('.uCard[data-u="majorscale"]').click();await sleep(1600);
  const out=[];
  for(let k=0;k<7;k++){
    const rungs=[...document.querySelectorAll('.lgRung')];
    const shown=rungs.map(r=>({deg:+r.dataset.deg,
      abc:(r.querySelector('.rgAbc')||{}).textContent||'',
      solf:(r.querySelector('.rgName')||{}).textContent||''}));
    const L=['C','D','E','F','G','A','B'],LS=[0,2,4,5,7,9,11];
    const pc=(x)=>((x%12)+12)%12;
    const letters=shown.map(x=>x.abc.replace(/[#b]+$/,''));
    const seqOk=letters.every((l,i)=>i===0||
      (L.indexOf(l)===(L.indexOf(letters[0])+i)%7));        // one letter per degree, in order
    const pitchOk=shown.every(x=>{
      const base=L.indexOf(x.abc[0]);if(base<0)return false;
      const sharp=(x.abc.match(/#/g)||[]).length,flat=(x.abc.match(/b/g)||[]).length;
      return pc(LS[base]+sharp-flat)===pc(Math.round(S.root+centsForDegree(x.deg)/100));});
    const noDbl=new Set(letters).size===letters.length;      // no key repeats a letter
    out.push({root:S.root,ok:seqOk&&pitchOk&&noDbl,seqOk,pitchOk,noDbl,
      spelling:shown.map(x=>x.abc).join(' '),first:shown[0],n:shown.length});
    const tg=window._labHintDeg;
    const r2=[...document.querySelectorAll('.lgRung')].find(x=>+x.dataset.deg===tg);
    if(r2){r2.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));r2.click();}
    await sleep(1100);
  }
  return out;});
ok(abc.every(x=>x.n===7||x.n===6),'the major-scale ladder shows its 6-7 rungs');
ok(abc.every(x=>x.pitchOk),'every letter name sounds the pitch it claims');
ok(abc.every(x=>x.seqOk),'the letters run A,B,C,D,E,F,G in order -- one per degree');
ok(abc.every(x=>x.noDbl),'no key uses the same letter twice (the A#-in-F-major bug)');
abc.slice(0,4).forEach(x=>console.log('  ----   root '+x.root+':  '+x.spelling));
const roots=[...new Set(abc.map(x=>x.root))];
ok(roots.length>1,'the letters follow the key as it roams (saw roots '+roots.join(', ')+')');
console.log('  ----   e.g. bottom rung: '+JSON.stringify(abc[0].first));
// and the early lessons must NOT show letters -- a five-year-old on so-mi does not need them
const early=await p.evaluate(async()=>{const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  window.LEARN2.home();await sleep(500);
  document.querySelector('.uCard[data-u="notes"]').click();await sleep(1500);
  return document.querySelectorAll('.lgRung .rgAbc').length;});
ok(early===0,'the first lessons stay clean -- no letter names on the beginner ladder ('+early+')');

await b.close();
console.log(FAIL.length?'\n'+FAIL.length+' FAILURE(S)':'\nno lesson can be cleared by a strategy instead of an ear');
process.exit(FAIL.length?1:0);})();

// ============================================================================================
//  THE CLUTTER GATE.
//  Every pass on this app is locally correct. Measured, proven, tests green. And the product still
//  drifts toward "more": a row added to a panel, a lesson added to a list, a toggle added to a
//  screen — each one justified on the day. Nobody adds clutter. Clutter is the INTEGRAL of correct
//  decisions, and nothing else in this repo measures it, which is exactly why the app can feel
//  worse after a week of improvements.
//
//  So it gets measured. This counts what a user actually faces on each screen — visible interactive
//  controls, and visible words — and compares against a committed baseline. Growth is allowed, but
//  only DELIBERATELY: re-baseline with --accept and the change shows up in the diff where it can be
//  argued about, instead of accumulating silently.
//
//  Needs a local server: python3 -m http.server 8765
//  Run:    node dev-surface.js
//  Accept: node dev-surface.js --accept      (after a growth you can justify)
// ============================================================================================
const {chromium}=require('playwright');
const fs=require('fs');
const BASE='surface-baseline.json';
const ACCEPT=process.argv.includes('--accept');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};

// a control the user has to look at and decide about
const COUNT=()=>{
  const vis=(e)=>{
    if(e.offsetParent===null&&getComputedStyle(e).position!=='fixed')return false;
    const s=getComputedStyle(e);
    if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0)return false;
    const r=e.getBoundingClientRect();
    return r.width>0&&r.height>0&&r.top<innerHeight&&r.bottom>0&&r.left<innerWidth&&r.right>0;
  };
  const sel='button,input,select,textarea,[role="button"],.toggle,.modeCard,.uCard,summary,a[href]';
  // a modal covers the page: the user faces the dialog, not what is behind it. Counting both made
  // the prefs panel read as 34 controls when 17 of them were studio, underneath, unreachable.
  const modal=[...document.querySelectorAll('dialog[open]')].pop();
  const root=modal||document.body;
  const controls=[...root.querySelectorAll(sel)].filter(vis);
  // words the user is asked to read, ignoring anything inside a closed <details>
  const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let words=0,n;
  while((n=walk.nextNode())){
    const p=n.parentElement; if(!p)continue;
    if(p.closest('script,style,noscript'))continue;
    if(p.closest('details:not([open])'))continue;
    if(!vis(p))continue;
    const t=n.textContent.trim(); if(!t)continue;
    words+=t.split(/\s+/).length;
  }
  return {controls:controls.length,words};
};

const SCREENS=[
  {name:'splash',       go:async p=>{await p.goto('http://127.0.0.1:8765/index.html');await p.waitForTimeout(1600);}},
  {name:'play',         go:async p=>{await p.goto('http://127.0.0.1:8765/index.html?m=play');await p.waitForTimeout(3000);}},
  {name:'studio',       go:async p=>{await p.goto('http://127.0.0.1:8765/index.html?m=studio');await p.waitForTimeout(3000);}},
  {name:'learn-home',   go:async p=>{await p.goto('http://127.0.0.1:8765/index.html?m=learn');await p.waitForTimeout(2400);}},
  {name:'lesson',       go:async p=>{await p.goto('http://127.0.0.1:8765/index.html?l=notes');await p.waitForTimeout(2800);}},
  {name:'midi-prefs',   go:async p=>{await p.goto('http://127.0.0.1:8765/index.html?m=studio');await p.waitForTimeout(2600);
                                     await p.evaluate(()=>{const d=document.getElementById('prefsDlg');if(d&&!d.open)d.showModal();});
                                     await p.waitForTimeout(600);}},
];

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--autoplay-policy=no-user-gesture-required']});

const now={};
for(const sc of SCREENS){
  const ctx=await b.newContext({viewport:{width:393,height:852},hasTouch:true,isMobile:true});
  const p=await ctx.newPage();
  await sc.go(p);
  now[sc.name]=await p.evaluate(COUNT);
  await ctx.close();
}
await b.close();

let prev=null;
try{prev=JSON.parse(fs.readFileSync(BASE,'utf8'));}catch(e){}

if(!prev||ACCEPT){
  fs.writeFileSync(BASE,JSON.stringify(now,null,2)+'\n');
  console.log((prev?'RE-BASELINED':'BASELINE RECORDED')+' — '+BASE);
  for(const k of Object.keys(now)){
    const d=prev?('  (was '+prev[k].controls+' / '+prev[k].words+')'):'';
    console.log('  '+k.padEnd(12)+now[k].controls+' controls, '+now[k].words+' words'+d);
  }
  console.log('\ncommit this file — growth should show up in a diff, not in the user\'s face');
  process.exit(0);
}

// a phone screen holds about this much before it stops being a screen and starts being a form
const HARD={controls:30,words:220};

for(const k of Object.keys(now)){
  const a=prev[k], c=now[k];
  if(!a){console.log('  NEW    '+k+' — '+c.controls+' controls, '+c.words+' words (run --accept to record)');continue;}
  ok(c.controls<=a.controls,
     '['+k+'] no new controls appeared ('+a.controls+' → '+c.controls+')');
  ok(c.words<=Math.ceil(a.words*1.05),
     '['+k+'] no creeping wall of text ('+a.words+' → '+c.words+' words)');
  if(c.controls<a.controls||c.words<a.words)
    console.log('  ----   ['+k+'] got simpler: '+a.controls+'→'+c.controls+' controls, '+a.words+'→'+c.words+' words');
}
// and an absolute ceiling, so a long slow slide can't be ratcheted in one --accept at a time
for(const k of Object.keys(now)){
  ok(now[k].controls<=HARD.controls,'['+k+'] is still a screen, not a control panel ('+now[k].controls+' controls, ceiling '+HARD.controls+')');
  ok(now[k].words<=HARD.words,'['+k+'] is still readable ('+now[k].words+' words, ceiling '+HARD.words+')');
}

console.log(FAIL.length
  ? '\n'+FAIL.length+' FAILURE(S) — either fold something away, or run --accept and defend it in the diff'
  : '\nthe app did not get bigger while you were improving it');
process.exit(FAIL.length?1:0);})();

// every deep link the teachers page prints must actually open that lesson
const {launch}=require('./browser');   // one place decides where Chromium is - see _dev/browser.js
const fs=require('fs');
(async()=>{
const src=fs.readFileSync('teachers/index.html','utf8');
const ids=[...new Set([...src.matchAll(/\?l=([a-z0-9]+)/g)].map(m=>m[1]))];
const b=await launch();
let bad=0;
// AND THE OTHER DIRECTION, which is the one that actually went wrong: the teachers page listed 17
// lessons while the app ran 24, with the old names, and no suite noticed because every link it DID
// print worked. A link that is missing is as broken as a link that is dead.
{const curr=fs.readFileSync('learn2.js','utf8');
 const units=[...new Set([...curr.matchAll(/\{id:'([a-z0-9]+)',\s*title:'[A-Za-z0-9_]+',\s*sub:'[A-Za-z0-9_]+',\s*tier:'(lesson|game|practice)'/g)]
   .map(m=>m[1]))];
 const missing=units.filter(u=>ids.indexOf(u)<0);
 const okAll=missing.length===0;
 if(!okAll)bad++;
 console.log((okAll?'  PASS  ':'  FAIL  ')+'the teachers page lists every unit the app runs ('+
   ids.length+' links / '+units.length+' units'+(missing.length?', MISSING: '+missing.join(', '):'')+')');}
for(const id of ids){
  const ctx=await b.newContext({viewport:{width:393,height:852},hasTouch:true,isMobile:true});
  const p=await ctx.newPage();
  await p.goto('http://127.0.0.1:8765/index.html?l='+id);
  await p.waitForTimeout(2600);
  const r=await p.evaluate(()=>({stage:!!document.querySelector('.lgStage'),
    h3:(document.querySelector('.lgTop h3')||{}).textContent||''}));
  const ok=r.stage&&r.h3.length>0;
  if(!ok)bad++;
  console.log((ok?'  PASS  ':'  FAIL  ')+'?l='+id+' opens a lesson ("'+r.h3+'")');
  await ctx.close();
}
console.log(bad?('\n'+bad+' DEAD LINK(S) on the teachers page'):'\nevery teachers-page link opens its lesson');
await b.close();process.exit(bad?1:0);
})();

// every deep link the teachers page prints must actually open that lesson
const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{
const src=fs.readFileSync('teachers/index.html','utf8');
const ids=[...new Set([...src.matchAll(/\?l=([a-z]+)/g)].map(m=>m[1]))];
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
let bad=0;
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

// ============================================================================================
//  WHAT A CHILD SEES WHEN THE LESSONS DO NOT LOAD
//  There used to be a learn.js fallback here. It had been silent for months, so the one time it
//  would ever have run is the one time it would have handed a kid a broken lesson. It is gone.
//  This blocks learn2.js at the network and proves the door says so instead of opening onto nothing.
//  Run: node dev-nolab.js   (needs: python3 -m http.server 8765)
// ============================================================================================
const {launch}=require('./browser');   // one place decides where Chromium is - see _dev/browser.js
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
(async()=>{
 const b=await launch();
 const p=await (await b.newContext({viewport:{width:390,height:780}})).newPage();
 let served=false;
 await p.route('**/learn2.js',r=>{served=true;r.abort();});   // the Lab never arrives
 await p.route('**/learn.js',r=>{ok(false,'something still tried to fetch the deleted learn.js');r.abort();});
 await p.goto('http://127.0.0.1:8765/index.html');await p.waitForTimeout(600);
 ok(served,'learn2.js was blocked, so this is the real failure case');

 await p.click('.modeCard[data-m="learn"]');await p.waitForTimeout(2600);  // boot poller waits 1.5s
 const seen=await p.evaluate(()=>{const d=document.getElementById('learnBroke');
   if(!d)return {there:false};
   const r=d.getBoundingClientRect(), cs=getComputedStyle(d);
   return {there:true,shown:cs.display!=='none'&&r.width>0&&r.height>0,
     text:(d.querySelector('p')||{}).textContent||'',
     btn:!!d.querySelector('#learnBrokeBack'),
     btnH:(d.querySelector('#learnBrokeBack')||{getBoundingClientRect:()=>({height:0})}).getBoundingClientRect().height};});
 ok(seen.there&&seen.shown,'the child is told the lessons did not load, on screen');
 console.log('        it says: "'+seen.text.trim()+'"');
 ok(/did not load/i.test(seen.text),'the message is plain and says what happened');
 ok(!/error|exception|undefined|failed to fetch/i.test(seen.text),'no developer words in it');
 ok(seen.btn&&seen.btnH>=44,'there is a way out, and it is big enough for a small thumb ('+Math.round(seen.btnH)+'px)');

 // and nothing silently pretends lessons exist
 const fake=await p.evaluate(()=>!!(window.LEARN2&&window.LEARN2.UNITS));
 ok(!fake,'it does not pretend to have a lesson list');
 const legacy=await p.evaluate(()=>typeof window.LEARN!=='undefined');
 ok(!legacy,'the old learn.js global is nowhere in the page');

 await b.close();
 console.log(FAIL.length?('\n'+FAIL.length+' FAILED:\n'+FAIL.map(f=>'  - '+f).join('\n')):'\nthe door says it is stuck instead of opening onto nothing');
 process.exit(FAIL.length?1:0);
})();

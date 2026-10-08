// ============================================================================================
//  THE OFFLINE GATE.
//  The app shipped with teachers/index.html listed in the service worker but missing from the
//  server. cache.addAll() is all-or-nothing, so that one 404 rejected the whole install: the worker
//  was discarded, the cache stayed EMPTY, and the app lost offline support completely — silently,
//  with no error anywhere a user or a test would look. The privacy page tells schools to pull the
//  plug and watch it keep working. That claim was false in production and nothing caught it.
//  So: install the worker with a file deliberately missing, and require it to survive.
//  Run: node dev-sw.js    (starts its own server on 8791 — do not point this at 8765)
// ============================================================================================
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const TYPES={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.xml':'application/xml','.txt':'text/plain'};
// serve the real folder, but 404 one file the worker asks for — the exact production condition
const GONE='/teachers/index.html';
const srv=http.createServer((rq,rs)=>{
  let u=decodeURIComponent(rq.url.split('?')[0]);
  if(u===GONE){rs.writeHead(404);return rs.end('gone');}
  if(u.endsWith('/'))u+='index.html';
  const f=path.join('/root/plinktest',u);
  fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404);return rs.end('no');}
    rs.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});rs.end(d);});
});
(async()=>{
await new Promise(r=>srv.listen(8791,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
const ctx=await b.newContext();
const p=await ctx.newPage();
await p.goto('http://127.0.0.1:8791/index.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(9000);

const st=await p.evaluate(async()=>{
  const rs=await navigator.serviceWorker.getRegistrations();
  const ks=await caches.keys();
  let n=0,has={};
  for(const k of ks){const c=await caches.open(k);const keys=await c.keys();n+=keys.length;
    for(const r of keys)has[new URL(r.url).pathname]=1;}
  return{regs:rs.length,active:rs.some(r=>!!r.active),caches:ks,cached:n,
    index:!!has['/index.html'],learn:!!has['/learn2.js'],priv:!!has['/privacy.html']};});

ok(st.regs>0,'the worker survives a missing file instead of being discarded ('+st.regs+' registration)');
ok(st.active,'the worker reaches ACTIVE, not stuck installing');
ok(st.cached>=20,'the cache is populated, not empty ('+st.cached+' files cached)');
ok(st.index,'index.html made it into the cache');
ok(st.learn,'learn2.js made it into the cache');
ok(st.priv,'privacy.html made it into the cache');

// the claim the privacy page actually makes: pull the plug, it keeps working
await ctx.setOffline(true);
const p2=await ctx.newPage();
let boot=false;
try{await p2.goto('http://127.0.0.1:8791/index.html',{waitUntil:'domcontentloaded',timeout:15000});
  await p2.waitForTimeout(3500);
  boot=await p2.evaluate(()=>!!document.querySelector('canvas,.modeCard,#splash')&&document.title.length>0);
}catch(e){boot=false;}
ok(boot,'THE PRIVACY PAGE CLAIM: it still loads with the network off');
await ctx.setOffline(false);

await b.close();srv.close();
console.log(FAIL.length?'\n'+FAIL.length+' FAILURE(S) — offline is broken':'\noffline survives a missing file');
process.exit(FAIL.length?1:0);})();

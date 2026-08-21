const C='slimehedron-v24'; // bump each deploy
const FILES=['./','./index.html','./learn.js','./landing.html','./manifest.json','./icon-192.png','./icon-512.png','./slimehedron-mascot.png','./bg-desktop.jpg','./bg-mobile.jpg','./slimelogo.png','./band.png','./minis/grn.png','./minis/grn2.png','./minis/grn3.png','./minis/violet.png','./minis/violet2.png','./minis/violet3.png','./minis/bo.png','./minis/blue1.png','./minis/blue2.png','./minis/blue3.png','./minis/pear1.png','./minis/pear2.png','./minis/pear3.png','./minis/pink1.png','./minis/pink2.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  // NETWORK FIRST for the app itself AND its scripts — a cache-first learn.js meant
  // uploads never reached anyone until the cache name changed. this was the stale-build bug.
  const isPage=e.request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('.js');
  if(isPage){ // NETWORK FIRST for the app itself: updates always arrive, cache is the offline fallback
    e.respondWith(fetch(e.request).then(n=>{caches.open(C).then(c=>c.put(e.request,n.clone()));return n;}).catch(()=>caches.match(e.request)));
    return;}
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(n=>{
    if(e.request.method==='GET'&&n.ok&&url.origin===location.origin)caches.open(C).then(c=>c.put(e.request,n.clone()));
    return n;}).catch(()=>caches.match('./index.html'))));
});

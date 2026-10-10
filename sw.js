const C='slimehedron-v111'; // bump each deploy
const FILES=['./','./index.html','./learn2.js','./teachers/index.html','./landing.html','./privacy.html','./accessibility.html','./manifest.json','./icon-192.png','./icon-512.png','./slimehedron-mascot.png','./bg-desktop.jpg','./bg-mobile.jpg','./slimelogo.png','./kits/kit-pop.png','./kits/kit-rock.png','./kits/kit-disco.png','./kits/kit-bossa.png','./kits/kit-jazz.png','./mixslime_keys.png','./mixslime_drum.png','./mixslime_bass.png','./minis/grn.png','./minis/grn2.png','./minis/grn3.png','./minis/violet.png','./minis/violet2.png','./minis/violet3.png','./minis/bo.png','./minis/blue1.png','./minis/blue2.png','./minis/blue3.png','./minis/pear1.png','./minis/pear2.png','./minis/pear3.png','./minis/pink1.png','./minis/pink2.png','./minis/pink3.png','./minis/teal.png','./minis/teal2.png','./minis/teal3.png','./minis/teal4.png','./minis/orange.png','./minis/bo2.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>
  Promise.all(FILES.map(f=>c.add(f).catch(()=>{})))       // one missing file must not cost the whole cache
).then(()=>self.skipWaiting()));});
// only ever delete OUR OWN old caches. github.io is one shared origin across every project on the
// account, so a blanket "delete everything that isn't me" was reaching into the neighbours.
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(
  ks.filter(k=>k!==C&&k.indexOf('slimehedron-')===0).map(k=>caches.delete(k))
)).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  // NETWORK FIRST for the app itself AND its scripts — a cache-first learn.js meant
  // uploads never reached anyone until the cache name changed. this was the stale-build bug.
  const isPage=e.request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('.js');
  if(isPage){ // NETWORK FIRST for the app itself: updates always arrive, cache is the offline fallback
    // only cache a REAL answer. caching whatever came back meant one 404, or one cafe wifi login page,
    // got saved as the app and served from then on, offline, forever.
    e.respondWith(fetch(e.request).then(n=>{
      if(n&&n.ok&&n.type!=='opaque')caches.open(C).then(c=>c.put(e.request,n.clone()));
      return n;}).catch(()=>caches.match(e.request)));
    return;}
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(n=>{
    if(e.request.method==='GET'&&n.ok&&url.origin===location.origin)caches.open(C).then(c=>c.put(e.request,n.clone()));
    // offline fallback is the app page, and ONLY for a page request. handing index.html back to an
    // <img> or a stylesheet just produced a broken thing that claimed to have loaded.
    return n;}).catch(()=>e.request.mode==='navigate'?caches.match('./index.html'):Response.error())));
});

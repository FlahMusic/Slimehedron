// ============================================================================================
//  THE WORM IS ALWAYS THERE (Flah 2026-11-21: "wtf have u done to my worm? he doesnt even pop up anymore at all ...
//  make sure the things like the worm always work"). From 2026-11-08 his placer counted the other decorations as
//  obstacles, the floor slimes took every spot, and he was display:none in play and studio: dancing, unseen.
//  With the music playing at 200 bpm (a 12-bar cycle in 14.4 s), sampled every 250 ms for 16 s:
//    1. he is displayed, and at least 30% of his box is on screen, at every sample
//    2. at his head nothing covers him whenever he is risen: no control, canvas or picture, nothing opaque, above him
//    3. he rests (sunk: only his head and neck out) AND rises (fully up) within the cycle
//    4. he wiggles: his body's path changes from sample to sample
//    5. he keeps clear of the controls: his box covers no button, select or input more than 10 px
//  In play at 1280 x 860 and 1440 x 900, on a phone (390 x 844), and in studio at 1280 x 860.
//  Sabotage: SAB=hide (the old placer that counted the decorations), SAB=freeze (his tick stopped).
//  Needs a local server: python -m http.server 8765. Run from the project root: node _dev/dev-worm.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const SAB=process.env.SAB||'';
const RUNS=[['play',1280,860],['play',1440,900],['play',390,844],['studio',1280,860]];
(async()=>{const b=await launch();
 for(const [mode,W,H] of RUNS){
  const p=await (await b.newContext({viewport:{width:W,height:H}})).newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');localStorage.setItem('slimehedron-tapped','1');}catch(e){}});
  await p.goto('http://127.0.0.1:8765/index.html?m='+mode);await p.waitForTimeout(3000);
  const r=await p.evaluate(async([SAB])=>{
    initAudio();if(AC.state==='suspended')await AC.resume();
    S.bpm=200;try{if(typeof setTempo==='function')setTempo(200);}catch(e){}
    try{if(!S.playing&&typeof togglePlay==='function')togglePlay();}catch(e){}
    if(!drumOn&&typeof toggleDrums==='function'){try{toggleDrums();}catch(e){}}
    const w=document.getElementById('wormEl');
    if(SAB==='hide'){w.style.display='none';const keep=setInterval(()=>{w.style.display='none';},50);setTimeout(()=>clearInterval(keep),20000);}
    if(SAB==='freeze'){const body=w.querySelector('#wBody');const d=body.getAttribute('d');new MutationObserver(()=>{if(body.getAttribute('d')!==d)body.setAttribute('d',d);}).observe(body,{attributes:true});}
    const out={n:0,shown:0,onscreen:0,covered:0,by:'',risenSeen:0,restSeen:0,paths:new Set(),maxOverlap:0};
    const ctrls=[...document.querySelectorAll('button,select,input')].map(e=>e.getBoundingClientRect()).filter(r=>r.width>2&&r.height>2);
    for(let i=0;i<64;i++){
      await new Promise(res=>setTimeout(res,250));
      out.n++;
      const cs=getComputedStyle(w),fb=w.getBoundingClientRect(),m=/translateY\(([-\d.]+)px\)/.exec(w.style.transform||''),ty=m?+m[1]:0;
      if(cs.display!=='none'&&cs.visibility!=='hidden'&&+cs.opacity>0.1)out.shown++;
      const vx=Math.max(0,Math.min(fb.right,innerWidth)-Math.max(fb.left,0)),vy=Math.max(0,Math.min(fb.bottom,innerHeight)-Math.max(fb.top,0));
      if(fb.width>2&&(vx*vy)/(fb.width*fb.height)>=0.3)out.onscreen++;
      if(ty<fb.height*0.1)out.risenSeen++;
      if(ty>fb.height*0.4)out.restSeen++;
      const body=w.querySelector('#wBody');if(body)out.paths.add(body.getAttribute('d'));
      if(ty<fb.height*0.1&&cs.display!=='none'){const face=w.querySelector('#wFace').getBoundingClientRect(),hx=face.left+face.width/2,hy=face.top+face.height/2;
        for(const e of document.elementsFromPoint(hx,hy)){        // above him: a control, a picture, or anything opaque covers him
          if(e===w||w.contains(e))break;                            // (a transparent layout box over the page does not)
          const cs2=getComputedStyle(e),opaque=(cs2.backgroundImage!=='none')||(/rgba?\(([^)]+)\)/.exec(cs2.backgroundColor)||[0,'0,0,0,0'])[1].split(',').map(Number)[3]!==0;
          if(/^(BUTTON|SELECT|INPUT|LABEL|CANVAS|IMG|VIDEO)$/.test(e.tagName)||(opaque&&e!==document.body&&e!==document.documentElement)){out.covered++;out.by=e.id||e.tagName;break;}}}
      for(const c of ctrls){const ox=Math.min(fb.right,c.right)-Math.max(fb.left,c.left),oy=Math.min(fb.bottom-Math.max(0,ty),c.bottom)-Math.max(fb.top+ty,c.top);if(ox>0&&oy>0)out.maxOverlap=Math.max(out.maxOverlap,Math.min(ox,oy));}
    }
    out.paths=out.paths.size;return out;},[SAB]);
  const tag=`[${mode} ${W}x${H}]`;
  ok(r.shown===r.n&&r.onscreen===r.n,`${tag} he is shown and on screen at every look (${r.shown}, ${r.onscreen} of ${r.n})`);
  ok(r.covered===0,`${tag} nothing covers his head while he is up (${r.covered} looks covered${r.by?' by '+r.by:''})`);
  ok(r.restSeen>0&&r.risenSeen>0,`${tag} he rests and rises within the cycle (${r.restSeen} looks resting, ${r.risenSeen} risen)`);
  ok(r.paths>r.n*0.6,`${tag} he wiggles (${r.paths} different shapes in ${r.n} looks)`);
  ok(r.maxOverlap<=10,`${tag} he keeps clear of the controls (overlaps one by ${r.maxOverlap.toFixed(0)} px at most)`);
  ok(errs.length===0,`${tag} no page errors ${errs.slice(0,2).join(' | ')}`);
  await p.close();
 }
 await b.close();
 console.log(FAIL.length?FAIL.length+' FAILURE(S)':'the worm: always there, always dancing');process.exit(FAIL.length?1:0);
})();

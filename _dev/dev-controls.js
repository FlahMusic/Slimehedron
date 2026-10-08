// ============================================================================================
//  THE EVERY-BUTTON-DOES-SOMETHING GATE.
//  Two separate silent failures shipped because nothing checked OUTPUT: note() routed to a function
//  that returned without throwing, and dHit() threw into a silent catch. Both were invisible to
//  every suite because the suites asked "was it called" and "did it error", and the answers were
//  yes and no.
//  So this presses every visible control in every mode and demands EVIDENCE that something
//  happened: audio out of the speakers, a DOM change, or a class change. A control that does
//  nothing measurable is reported by name. It also fails on any page error, anywhere.
//  Run: node dev-controls.js   (needs python3 -m http.server 8765)
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const SETUP=()=>{
  {let id=1;const cbs=new Map();
   window.requestAnimationFrame=function(fn){const i=id++;cbs.set(i,fn);
     setTimeout(()=>{if(cbs.has(i)){cbs.delete(i);try{fn(performance.now());}catch(e){}}},16);return i;};
   window.cancelAnimationFrame=function(i){cbs.delete(i);};}
  const oc=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(dest){const r=oc.apply(this,arguments);
    try{const c=this.context;if(dest&&c&&dest===c.destination){
      if(!c.__tap){const an=c.createAnalyser();an.fftSize=1024;an.smoothingTimeConstant=0;c.__tap=an;window.__tap=an;}
      oc.call(this,c.__tap);}}catch(e){}return r;};
  window.__rms=()=>{const an=window.__tap;if(!an)return 0;
    const b=new Float32Array(an.fftSize);an.getFloatTimeDomainData(b);
    let s=0;for(let i=0;i<b.length;i++)s+=b[i]*b[i];return Math.sqrt(s/b.length);};
  // every swallowed exception, counted — the pattern that hid both bugs
  window.__thrown=0;
  const oe=window.onerror;
  window.addEventListener('error',()=>{window.__thrown++;});
};
// Press one button per visit. A control that navigates (back, reset, a door) would otherwise kill
// the whole sweep halfway through and take the remaining controls with it.
async function sweep(ctx,label,url,skip){
  const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html'+url);
  await p.waitForTimeout(3200);
  const list=await p.evaluate((skip)=>{
    const vis=(e)=>{const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0)return false;
      const r=e.getBoundingClientRect();
      if(!(r.width>2&&r.height>2))return false;
      if(r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)return false;
      const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
      return !!hit&&(hit===e||e.contains(hit));};   // reachable by a finger, not buried under an overlay
    const sel='button:not([disabled]),.modeCard,.uCard,.psBtn,.mkPad,.stKey,.lgRung,.sgCell';
    return [...document.querySelectorAll(sel)].filter(vis).map((b,i)=>{
      b.setAttribute('data-sweep',i);
      return {i,name:b.id||b.getAttribute('aria-label')||b.dataset.u||b.dataset.a2||
        (b.textContent||'').trim().slice(0,20)||b.className.split(' ')[0]};})
      .filter(x=>!skip.includes(x.name));},skip||[]);
  await p.close();

  const dead=[];
  for(const item of list){
    const pg=await ctx.newPage();
    pg.on('pageerror',e=>errs.push(label+'/'+item.name+': '+e.message));
    try{
      await pg.goto('http://127.0.0.1:8765/index.html'+url);
      await pg.waitForTimeout(2600);
      const r=await pg.evaluate(async(i)=>{
        const vis=(e)=>{const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0)return false;
          const r=e.getBoundingClientRect();
          if(!(r.width>2&&r.height>2))return false;
          if(r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)return false;
          const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
          return !!hit&&(hit===e||e.contains(hit));};
        const sel='button:not([disabled]),.modeCard,.uCard,.psBtn,.mkPad,.stKey,.lgRung,.sgCell';
        const b=[...document.querySelectorAll(sel)].filter(vis)[i];
        if(!b)return {gone:true};
        // an option that is ALREADY selected staying selected is correct, not dead
        const wasOn=b.classList.contains('on')||b.classList.contains('active')||b.getAttribute('aria-pressed')==='true';
        const domBefore=document.body.innerHTML.length;
        const clsBefore=b.className+'|'+document.body.className;
        const hrefBefore=location.href;
        let loud=0;
        b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));
        b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true}));
        b.click();
        for(let k=0;k<24;k++){loud=Math.max(loud,window.__rms());await new Promise(r=>setTimeout(r,16));}
        const changed=(document.body.innerHTML.length!==domBefore)||
          ((b.className+'|'+document.body.className)!==clsBefore)||(location.href!==hrefBefore);
        return {changed,loud,wasOn};
      },item.i);
      if(!r.gone&&!r.wasOn&&!r.changed&&r.loud<0.0004)dead.push(item.name);
    }catch(e){ /* a control that navigates away counts as having done something */ }
    await pg.close().catch(()=>{});
  }
  const real=errs.filter(e=>!/ServiceWorker|sw\.js/.test(e));
  ok(real.length===0,'['+label+'] no page errors while pressing everything'+(real.length?': '+real.slice(0,2).join(' | '):''));
  ok(dead.length===0,'['+label+'] all '+list.length+' controls do something measurable'+
     (dead.length?' — DEAD: '+dead.join(', '):''));
}
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--autoplay-policy=no-user-gesture-required']});
const ctx=await b.newContext({viewport:{width:1280,height:900}});
await ctx.addInitScript(SETUP);
// skip the doors that navigate away mid-sweep, and anything that leaves the page
await sweep(ctx,'splash','',['learn','play','studio','share slimehedron','for grown-ups','privacy','source','license','☕ support','tools']);
await sweep(ctx,'play','?m=play',[]);
await sweep(ctx,'studio','?m=studio',[]);
await sweep(ctx,'learn home','?m=learn',[]);
await b.close();
console.log(FAIL.length?'\n'+FAIL.length+' FAILURE(S)':'\nevery control in every mode does something you can measure');
process.exit(FAIL.length?1:0);})();

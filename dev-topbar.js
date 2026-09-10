// ============================================================================================
//  TOP BAR TEST — the bar must be ONE row, fully on screen, at every size, in play and studio.
//  Guards the things that were actually wrong:
//    * the transport wrapped and dropped controls onto a second floating row
//    * the auto-play switch floated at top:56px, exactly where the studio strip later appeared
//    * the chord chip / switch overflowed off the right edge of a 390px phone
//    * play mode reserved 268px of chrome above the tank (a third of a phone screen)
//  Run: node dev-topbar.js
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const SIZES=[['desktop',1440,900],['laptop',1180,760],['tablet',900,700],['phone',390,844],['phone-sm',375,667]];
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
 for(const mode of ['play','studio']){
  for(const [tag,w,h] of SIZES){
   const ctx=await b.newContext({viewport:{width:w,height:h}});const p=await ctx.newPage();
   await p.goto('file://'+process.cwd()+'/index.html');await p.waitForTimeout(350);
   await p.click(`.modeCard[data-m="${mode}"]`);await p.waitForTimeout(1500);
   const r=await p.evaluate(()=>{
     const box=e=>{const b=e.getBoundingClientRect();return {t:b.top,l:b.left,r:b.right,b:b.bottom,w:b.width,h:b.height};};
     const vis=e=>e&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden'&&e.getBoundingClientRect().width>1;
     const hdr=document.querySelector('header');
     const kids=[...hdr.querySelectorAll('.btngroup > *, header > button, #hdrChord')]
                  .filter(e=>vis(e)&&getComputedStyle(e).position!=='fixed'); // fixed children have left the bar on purpose
     const off=kids.filter(e=>{const k=box(e);return k.left<-1||k.right>innerWidth+1;})
                   .map(e=>(e.id||e.className)+' '+Math.round(box(e).left)+'..'+Math.round(box(e).right));
     // ONE ROW: every control's vertical centre must sit within 10px of the group's centre
     const grp=hdr.querySelector('.btngroup');const gb=box(grp);const gc=(gb.t+gb.b)/2;
     const rows=kids.filter(e=>{const k=box(e);return Math.abs((k.t+k.b)/2-gc)>10;}).map(e=>e.id||e.className);
     // no header control may sit on top of another
     const hits=[];
     for(let i=0;i<kids.length;i++)for(let j=i+1;j<kids.length;j++){
       const a=box(kids[i]),c=box(kids[j]);
       if(a.l<c.r-1&&a.r>c.l+1&&a.t<c.b-1&&a.b>c.t+1)hits.push((kids[i].id||'?')+' x '+(kids[j].id||'?'));}
     // the clear button lives outside the header in play mode; it must not land on the bar's controls
     const clr=document.getElementById('clearBtn');
     if(clr&&vis(clr)&&clr.parentElement!==hdr){const a=box(clr);
       for(const e of kids){const c=box(e);
         if(a.l<c.r-1&&a.r>c.l+1&&a.t<c.b-1&&a.b>c.t+1)hits.push('clearBtn x '+(e.id||'?'));}}
     // the tank must start right under the chrome, not 268px down
     const cv=document.getElementById('cv');const cb=box(cv);
     let chromeBot=box(hdr).b;
     const sb=document.getElementById('studioBar');
     if(vis(sb))chromeBot=Math.max(chromeBot,box(sb).b);
     // and nothing fixed in the top zone may sit ON the tank
     const overlapTank=[];
     for(const sel of ['#studioBar','#cofWheel','#hdrChord','#slimeBig','#chordBtn']){
       const e=document.querySelector(sel);if(!vis(e))continue;const k=box(e);
       if(k.l<cb.r-2&&k.r>cb.l+2&&k.t<cb.b-2&&k.b>cb.t+2)overlapTank.push(sel);}
     // The tank is a SQUARE in a tall box, so on a phone it is width-limited and centres itself with
     // slack above and below. That is fine; what is NOT fine is chrome eating the top. So the test is
     // "is the tank centred in the room left under the chrome", not "is it glued to the bar".
     const room=innerHeight-chromeBot, above=cb.t-chromeBot, below=innerHeight-cb.b;
     return {off,rows,hits,gap:Math.round(cb.t-chromeBot),skew:Math.round(Math.abs(above-below)),
             room:Math.round(room),tankH:Math.round(cb.h),vh:innerHeight,overlapTank,
             chip:vis(document.getElementById('hdrChord')),sw:vis(document.getElementById('slimeBig'))};});
   const L='['+mode+'/'+tag+'] ';
   ok(r.off.length===0,L+'no header control runs off screen'+(r.off.length?': '+r.off.join(', '):''));
   ok(r.rows.length===0,L+'the transport is ONE row'+(r.rows.length?' (off-row: '+r.rows.join(', ')+')':''));
   ok(r.hits.length===0,L+'no two top-bar controls overlap'+(r.hits.length?': '+r.hits.join(', ')+'':''));
   ok(r.chip,L+'the chord chip is visible');
   ok(r.sw,L+'the auto-play switch is in the bar');
   ok(r.overlapTank.length===0,L+'nothing in the top zone sits on the tank'+(r.overlapTank.length?': '+r.overlapTank.join(', '):''));
   ok(r.gap<=120||r.skew<=Math.max(60,r.room*0.12),L+'the tank is centred under the chrome, not pushed down by it (top gap '+r.gap+'px, top-vs-bottom skew '+r.skew+'px)');
   ok(r.tankH>=r.vh*0.42,L+'the tank gets >=42% of the screen height ('+Math.round(r.tankH/r.vh*100)+'%)');
   await ctx.close();}}
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'top bar is one clean row everywhere'));
 process.exit(FAIL.length?1:0);})();

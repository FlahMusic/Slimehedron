// ============================================================================================
//  THE STUDIO SEQUENCER (spec _docs/specs/2026-11-07-studio-sequencer): Korg SQ-1 ease, Studio One movement.
//    1. the engine: every row mode x direction plays the right steps; every rate lands on the grid (< 2 ms)
//    2. scale lock: a pitch is a degree, so a key or scale change carries the pattern; rests are silent
//    3. the drums target plays the picked kit piece; the arp plays only the chord's tones, in the direction's order
//    4. the four sliders, 400 passes each: chance (step 1 always, off-beats 40 %, beats 70 %), humanize (never past
//       min(1/4 step, 30 ms), velocity +-24), wander (in range, at most 2 degrees, nothing stored changes), repeat
//       (2-4 hits, never under 30 ms apart); at 0 % each changes nothing
//    5. the knobs: drag sets, drag across draws, tap rests, every knob 44 px+; the lane switch shows velocity
//    6. songs: the autosave round-trips the pattern; a hostile pattern is cleaned; undo takes an edit back
//    7. the conductor: resume after a pause schedules nothing in the past (it used to fire ~30 hits at once)
//  Needs a local server: python -m http.server 8765. Run from the project root: node _dev/dev-seq.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html?m=studio';
const init=()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');localStorage.setItem('slimehedron-tapped','1');}catch(e){}};

(async()=>{const b=await launch();
 const ctx=await b.newContext({viewport:{width:1280,height:900}});await ctx.addInitScript(init);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(URL);await p.waitForTimeout(2500);
 await p.evaluate(async()=>{initAudio();if(AC.state==='suspended')await AC.resume();});

 // ---- 1. the order of steps, for every row mode and direction (the engine's own walk) ----
 const order=await p.evaluate(()=>{const out={};
   for(const rows of ['A','AB','alt'])for(const dir of ['fwd','rev','bounce','random']){
     SEQ.rows=rows;SEQ.dir=dir;SEQ._i=null;SEQ._pass=0;SEQ._n=0;SEQ._last=-1;const seq=[];
     for(let n=0;n<48;n++){const q=seqAdvance();seq.push(q.row+q.k);}out[rows+'/'+dir]=seq;}
   SEQ.rows='A';SEQ.dir='fwd';return out;});
 const A=[0,1,2,3,4,5,6,7].map(k=>'A'+k),B=A.map(x=>'B'+x[1]);
 ok(order['A/fwd'].slice(0,16).join()===A.concat(A).join(),'1. rows A, forward: A1..A8, round again');
 ok(order['AB/fwd'].slice(0,16).join()===A.concat(B).join(),'1. rows A→B: one line of 16 (A then B)');
 ok(order['alt/fwd'].slice(0,16).join()===A.concat(B).join()&&order['alt/fwd'].slice(16,24).join()===A.join(),'1. rows A|B: A one time round, B the next, then A');
 ok(order['A/rev'].slice(0,9).join()===A.slice().reverse().concat(['A7']).join(),'1. reverse: A8..A1, round again');
 const bo=order['A/bounce'].slice(0,15).map(x=>+x[1]);
 ok(bo.join()==='0,1,2,3,4,5,6,7,6,5,4,3,2,1,0','1. bounce: there and back without repeating the ends ('+bo.join('')+')');
 const rnd=order['AB/random'];
 ok(rnd.every((x,i)=>i===0||x!==rnd[i-1])&&new Set(rnd).size>=12,'1. random: never the same step twice running, and it goes everywhere ('+new Set(rnd).size+' of 16 steps)');

 // ---- 1b. timing: every rate on the conductor's grid ----
 const timing=await p.evaluate(async()=>{setBpm(120);const out={};const sd=60/120/4;
   for(const rate of [1,2,4]){SEQ.rate=rate;window._seqLog=[];seqSetOn(true);await new Promise(r=>setTimeout(r,1600));SEQ.on=false;
     const L=window._seqLog.filter(x=>x.hit===0),gaps=L.slice(1).map((x,i)=>x.t-L[i].t);
     out[rate]={n:L.length,worst:Math.max(0,...gaps.map(g=>Math.abs(g-rate*sd)))*1000};
     await new Promise(r=>setTimeout(r,300));}
   SEQ.rate=2;return out;});
 for(const r of [1,2,4])ok(timing[r].n>=3&&timing[r].worst<2,'1. rate 1/'+(16/r)+': each step exactly '+r+' sixteenth'+(r>1?'s':'')+' apart ('+timing[r].n+' steps, worst '+timing[r].worst.toFixed(3)+' ms off)');

 // ---- 2. scale lock and rests ----
 const lock=await p.evaluate(async()=>{const stub=()=>{};const P0=playSynth;playSynth=stub;
   const run=()=>{window._seqLog=[];for(let k=0;k<8;k++)seqPlay(SEQ.A[k],{i:k,row:'A',k},AC.currentTime+1,0.25);return window._seqLog.slice();};
   const s0=S.scale;S.scale='major';const maj=run();S.scale='minor';const min=run();S.scale=s0;
   SEQ.A[3].on=0;const rest=run();SEQ.A[3].on=1;playSynth=P0;
   const inScale=(L,sc)=>L.every(x=>{const c=((x.cents%1200)+1200)%1200;return SCALES[sc].c.some(v=>Math.abs(v-c)<0.5);});
   return {degSame:maj.map(x=>x.deg).join()===min.map(x=>x.deg).join(),majIn:inScale(maj,'major'),minIn:inScale(min,'minor'),
     moved:maj.some((x,i)=>x.cents!==min[i].cents),restN:rest.length,restHas3:rest.some(x=>x.k===3)};});
 ok(lock.degSame&&lock.majIn&&lock.minIn&&lock.moved,'2. scale lock: the same degrees play in major and in minor, every note in the scale it is in');
 ok(lock.restN===7&&!lock.restHas3,'2. a step turned off is a rest: silent ('+lock.restN+' of 8 played)');

 // ---- 3. drums target, and the arp ----
 const tg=await p.evaluate(()=>{const P0=playSynth,D0=dHit;const heard=[];playSynth=()=>{};dHit=(v)=>{heard.push(v);};
   SEQ.target='drums';window._seqLog=[];for(let k=0;k<8;k++)seqPlay(SEQ.A[k],{i:k,row:'A',k},AC.currentTime+1,0.25);
   const drums={want:SEQ.A.filter(s=>s.on).map(s=>SEQ_DRUMS[s.dr]).join(),got:heard.join()};SEQ.target='notes';
   SEQ.arp=true;curRootDeg=3;const tones=seqChordTones();const arp={};
   for(const dir of ['fwd','rev','bounce']){SEQ.dir=dir;SEQ._arp=0;window._seqLog=[];for(let k=0;k<8;k++)seqPlay(SEQ.A[k],{i:k,row:'A',k},AC.currentTime+1,0.25);arp[dir]=window._seqLog.map(x=>x.deg);}
   SEQ.arp=false;SEQ.dir='fwd';playSynth=P0;dHit=D0;return {drums,tones,arp};});
 ok(tg.drums.got===tg.drums.want&&tg.drums.got.length>0,'3. target drums: each step plays the kit piece its knob picks ('+tg.drums.got+')');
 const T=tg.tones;
 ok(Object.values(tg.arp).every(a=>a.every(d=>T.includes(d))),'3. the arp plays only the chord\'s tones ('+T.join(',')+')');
 ok(tg.arp.fwd.slice(0,4).join()===T.join()&&tg.arp.rev.slice(0,4).join()===T.slice().reverse().join(),'3. forward is up, reverse is down ('+tg.arp.fwd.slice(0,4).join(' ')+' / '+tg.arp.rev.slice(0,4).join(' ')+')');
 ok(tg.arp.bounce.slice(0,7).join()===[T[0],T[1],T[2],T[3],T[2],T[1],T[0]].join(),'3. bounce is up then down ('+tg.arp.bounce.slice(0,7).join(' ')+')');

 // ---- 4. the four sliders, as statistics ----
 const st=await p.evaluate(()=>{const P0=playSynth,M0=sendMidiAt;playSynth=()=>{};sendMidiAt=()=>{};SEQ.rate=2;
   const before=JSON.stringify([SEQ.A,SEQ.B]);const t0=AC.currentTime+5,dur=0.25;
   const pass=(n,fn)=>{window._seqLog=[];for(let p=0;p<n;p++)for(let k=0;k<8;k++)seqPlay(SEQ.A[k],{i:k,row:'A',k},t0,dur);const L=window._seqLog;fn&&fn(L);return L;};
   const zero=pass(50),zeroSame=zero.every(x=>x.t===t0&&x.hit===0&&x.deg===SEQ.A[x.k].deg&&x.vel===SEQ.A[x.k].vel)&&zero.length===400;
   const res={zeroSame};
   SEQ.mac.chance=1;{const L=pass(400);const c=[0,0,0,0,0,0,0,0];L.forEach(x=>c[x.k]++);res.chance={s1:c[0],off:[1,3,5,7].map(k=>c[k]/400),beat:[2,4,6].map(k=>c[k]/400)};}SEQ.mac.chance=0;
   SEQ.mac.human=1;{const L=pass(400);const cap=Math.min(0.25*dur,0.03);res.human={maxOff:Math.max(...L.map(x=>Math.abs(x.t-t0))),cap,maxDv:Math.max(...L.map(x=>Math.abs(x.vel-SEQ.A[x.k].vel)))*127,spread:new Set(L.map(x=>Math.round((x.t-t0)*1000))).size};}SEQ.mac.human=0;
   SEQ.mac.wander=1;{const L=pass(400);const ch=L.filter(x=>x.deg!==SEQ.A[x.k].deg);res.wander={frac:ch.length/L.length,maxD:Math.max(0,...ch.map(x=>Math.abs(x.deg-SEQ.A[x.k].deg))),inRange:L.every(x=>x.deg>=0&&x.deg<=SEQ_DEG_MAX),same:JSON.stringify([SEQ.A,SEQ.B])===before};}SEQ.mac.wander=0;
   SEQ.mac.repeat=1;{const L=pass(400);const groups={};L.forEach(x=>{const key=Math.round((x.t-t0-(x.hit?0:0))*1e6);});
     let multi=0,steps=0,minGap=1e9,maxN=1;const firsts=L.filter(x=>x.hit===0).length;
     for(let i=0;i<L.length;i++){if(L[i].hit===0){steps++;let n=1;while(i+n<L.length&&L[i+n].hit===n){minGap=Math.min(minGap,L[i+n].t-L[i+n-1].t);n++;}if(n>1)multi++;maxN=Math.max(maxN,n);}}
     res.repeat={frac:multi/steps,maxN,minGap,firsts};}SEQ.mac.repeat=0;
   playSynth=P0;sendMidiAt=M0;return res;});
 ok(st.zeroSame,'4. all four at 0 %: nothing moves, nothing drops, nothing repeats (400 notes as written)');
 ok(st.chance.s1===400&&st.chance.off.every(f=>Math.abs(f-0.4)<0.06)&&st.chance.beat.every(f=>Math.abs(f-0.7)<0.06),
   '4. chance 100 %: step 1 every time ('+st.chance.s1+'/400), off-beats ~40 % ('+st.chance.off.map(f=>Math.round(f*100)).join(' ')+'), beats ~70 % ('+st.chance.beat.map(f=>Math.round(f*100)).join(' ')+')');
 ok(st.human.maxOff<=st.human.cap+1e-9&&st.human.maxDv<=24.01&&st.human.spread>=20,'4. humanize 100 %: timing within '+(st.human.cap*1000).toFixed(0)+' ms (worst '+(st.human.maxOff*1000).toFixed(1)+'), velocity within 24 (worst '+st.human.maxDv.toFixed(1)+'), and it really varies ('+st.human.spread+' different offsets)');
 ok(Math.abs(st.wander.frac-0.25)<0.04&&st.wander.maxD<=2&&st.wander.maxD>=2&&st.wander.inRange&&st.wander.same,'4. wander 100 %: ~25 % of notes move ('+Math.round(st.wander.frac*100)+' %), 1-2 degrees at most, in range, and the pattern itself is unchanged');
 ok(Math.abs(st.repeat.frac-0.35)<0.05&&st.repeat.maxN<=4&&st.repeat.maxN>=3&&st.repeat.minGap>=0.03-1e-9,'4. repeat 100 %: ~35 % of steps stutter ('+Math.round(st.repeat.frac*100)+' %), 2-'+st.repeat.maxN+' hits, never under 30 ms apart ('+(st.repeat.minGap*1000).toFixed(1)+' ms)');

 // ---- 5. the knobs ----
 await p.evaluate(()=>{const t=document.querySelector('.patTabs [data-pt="seq"]');t.scrollIntoView({block:'center'});t.click();});await p.waitForTimeout(300);
 const kn=await p.evaluate(()=>{document.getElementById('seqGrid').scrollIntoView({block:'center'});const ks=[...document.querySelectorAll('#seqGrid .sqKnob')];
   return {n:ks.length,min:Math.min(...ks.map(k=>{const r=k.getBoundingClientRect();return Math.min(r.width,r.height);})),deg0:SEQ.A[0].deg,on1:SEQ.A[1].on};});
 ok(kn.n===16&&kn.min>=44,'5. sixteen knobs, two rows of 8, each at least 44 px ('+kn.min.toFixed(0)+')');
 const at=async(r,k)=>p.evaluate(([r,k])=>{const e=document.querySelector('#seqGrid .sqKnob[data-r="'+r+'"][data-k="'+k+'"]').getBoundingClientRect();return {x:e.x+e.width/2,y:e.y+e.height/2};},[r,k]);
 {const c=await at('A',0);await p.mouse.move(c.x,c.y);await p.mouse.down();for(let i=1;i<=6;i++){await p.mouse.move(c.x,c.y-i*6);}await p.mouse.up();}
 {const c=await at('A',1);await p.mouse.click(c.x,c.y);}
 await p.waitForTimeout(150);
 {const c=await at('A',4),c2=await at('A',7);await p.mouse.move(c.x,c.y);await p.mouse.down();await p.mouse.move(c.x,c.y-30,{steps:4});await p.mouse.move(c2.x,c2.y-30,{steps:12});await p.mouse.up();}
 const kv=await p.evaluate(()=>({deg0:SEQ.A[0].deg,on1:SEQ.A[1].on,drawn:[4,5,6,7].map(k=>SEQ.A[k].deg),lbl:document.querySelector('#seqGrid .sqKnob[data-r="A"][data-k="0"] b').textContent}));
 ok(kv.deg0===kn.deg0+3,'5. dragging a knob up 36 px raises its note 3 scale steps ('+kn.deg0+' -> '+kv.deg0+', shows '+kv.lbl+')');
 ok(kv.on1===(kn.on1?0:1),'5. a tap without a drag turns the step into a rest (and back)');
 ok(new Set(kv.drawn).size===1,'5. dragging across the row draws: every knob passed takes the same value ('+kv.drawn.join(',')+')');
 await p.evaluate(()=>document.querySelector('#seqPanel [data-ln="vel"]').click());
 const vel=await p.evaluate(()=>[...document.querySelectorAll('#seqGrid .sqKnob b')].slice(0,3).map(b=>b.textContent));
 ok(vel.every(v=>/^\d+$/.test(v)),'5. the velocity switch turns every knob into its step\'s velocity ('+vel.join(' ')+')');
 await p.evaluate(()=>document.querySelector('#seqPanel [data-ln="pitch"]').click());

 // ---- 6. songs: autosave round-trip, a hostile pattern, undo ----
 const saved=await p.evaluate(()=>{SEQ.A[2].deg=12;SEQ.B[5].vel=0.33;SEQ.rows='AB';SEQ.dir='bounce';SEQ.target='notes';
   const x=window._songExtras();localStorage.setItem('slimehedron-song',JSON.stringify(x));return JSON.stringify({A:SEQ.A,B:SEQ.B,rows:SEQ.rows,dir:SEQ.dir});});
 await p.reload();await p.waitForTimeout(2500);
 const back=await p.evaluate(()=>JSON.stringify({A:SEQ.A,B:SEQ.B,rows:SEQ.rows,dir:SEQ.dir}));
 ok(back===saved,'6. the pattern, rows and direction come back after a reload (autosave)');
 await p.evaluate(()=>{const x=JSON.parse(localStorage.getItem('slimehedron-song'));
   x.seq={on:'yes',rows:'ZZ',dir:{evil:1},rate:3,target:'<img>',arp:1,A:[{on:1,deg:999,vel:-5,dr:'K'},{__proto__:{on:1}},null],B:'x'.repeat(10)};
   localStorage.setItem('slimehedron-song',JSON.stringify(x));});
 await p.reload();await p.waitForTimeout(2500);
 const clean=await p.evaluate(()=>({rows:SEQ.rows,dir:SEQ.dir,rate:SEQ.rate,target:SEQ.target,arp:SEQ.arp,on:SEQ.on,nA:SEQ.A.length,nB:SEQ.B.length,a0:SEQ.A[0],
   allOk:SEQ.A.concat(SEQ.B).every(s=>[0,1].includes(s.on)&&Number.isInteger(s.deg)&&s.deg>=0&&s.deg<=SEQ_DEG_MAX&&s.vel>=0.05&&s.vel<=1&&Number.isInteger(s.dr))}));
 ok(clean.rows==='A'&&clean.dir==='fwd'&&clean.rate===2&&clean.target==='notes'&&clean.arp===false&&clean.on===false&&clean.nA===8&&clean.nB===8&&clean.allOk,
   '6. a hostile pattern is cleaned: unknown words dropped, numbers clamped, always two rows of 8 ('+JSON.stringify(clean.a0)+')');
 await p.evaluate(()=>{localStorage.removeItem('slimehedron-song');});
 await p.evaluate(()=>{const t=document.querySelector('.patTabs [data-pt="seq"]');t.scrollIntoView({block:'center'});t.click();document.getElementById('seqGrid').scrollIntoView({block:'center'});});await p.waitForTimeout(600);
 const u0=await p.evaluate(()=>SEQ.A[6].on);
 {const c=await at('A',6);await p.mouse.click(c.x,c.y);}await p.waitForTimeout(700);
 const u1=await p.evaluate(()=>SEQ.A[6].on);
 await p.evaluate(()=>document.getElementById('undoBtn').click());await p.waitForTimeout(400);
 const u2=await p.evaluate(()=>SEQ.A[6].on);
 ok(u1!==u0&&u2===u0,'6. undo takes a step edit back ('+u0+' -> '+u1+' -> '+u2+')');

 // ---- 7. resume after a pause: nothing scheduled in the past ----
 const rs=await p.evaluate(async()=>{setBpm(120);if(!drumOn)$("drumBtn").click();if(!S.playing)$("playBtn").click();await new Promise(r=>setTimeout(r,1500));
   $("playBtn").click();await new Promise(r=>setTimeout(r,2500));const hits=[];const D0=dHit;dHit=function(v,t){hits.push(t-AC.currentTime);return D0.apply(this,arguments);};
   $("playBtn").click();await new Promise(r=>setTimeout(r,400));dHit=D0;$("playBtn").click();return {n:hits.length,past:hits.filter(x=>x<-0.05).length};});
 ok(rs.n>0&&rs.past===0,'7. resume after a pause: '+rs.past+' hits in the past (it used to fire ~30 at once), '+rs.n+' on time');

 ok(errs.length===0,'no page errors ('+errs.slice(0,2).join(' | ')+')');
 await b.close();
 console.log(FAIL.length?'\n'+FAIL.length+' FAIL':'\nthe sequencer plays what it shows, moves how its sliders say, and keeps what you made');process.exit(FAIL.length?1:0);})();

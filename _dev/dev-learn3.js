// ============================================================================================
//  LEARN, AFTER FLAH'S CRITIQUE (2026-11-03, _docs/specs/2026-11-03-flah-critique). One suite, one section per ticket.
//  06 NO VOICE, LISTEN FIRST: no unit ever calls speechSynthesis. In a round the kid judges by ear, nothing sounds
//     until "listen" is pressed: the button pulses, an answer before it is ignored (and nudges the button), the
//     press plays the sound, and the next round waits again.
//  07 U_MAKE SEQUENCES: each step plays the note picked for it, on its step, at its pitch, every loop (it played them
//     all at once on step 1: the notes had no start time, only the drums did).
//  08/09 COPY THE BEAT (was "say it, play it", ADR 0013): a drum grid, kick purple, snare red, hi-hat yellow. It
//     explains once; each round a count-in 4 3 2 1 (seen and heard), the beat with the playhead, the kid places the
//     hits, check: wrong turns the row lilac, "Close, listen and try again!"; right "Good job!". No beat twice in a
//     row over 20 rounds, and the beats grow.
//  10 LONG AND SHORT: four lead-in clicks (seen and heard), then the note alone: nothing starts while it rings.
//  11 COUNT TO FOUR: waits for "listen", a lead-in bar (four clicks, 4 3 2 1 on screen), then a ball hops along a
//     4/4 step grid (four steps a beat, like studio's), on the right beat at each beat.
//  12 PLAY IT AGAIN: every unit finished (today too, under 80% too) is listed with what it taught, and replays.
//  14b WRONG ANSWERS: in every judged unit a wrong answer says "Close, listen and try again!" and counts nothing.
//  16 LESSON DRUMS: a lesson plays the pop kit whatever studio picked, its drums 1-6 LU under its notes.
//  13 BACK: from every unit, mid-sound, a real press on back shows the whole learn map, nothing playing behind it.
//  Runs WITHOUT the listen-pressing driver the other suites get (SLIME_LISTEN=wait): the waiting is what it tests.
//  Needs a local server: python -m http.server 8765. Run from the project root: node _dev/dev-learn3.js
// ============================================================================================
process.env.SLIME_LISTEN='wait';
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const BASE=process.env.SLIME_BASE||'http://127.0.0.1:8765/index.html';
// the rounds judged by ear (a ladder lesson that shows its target on screen is not one of them)
const JUDGED=['howlong','sayplay','echo','notes'];   // (staff is read by sight now: see the note, press its letter)

// ---- 15: the standard words (ui-words.md). Static: the labels shown, and how each concept lesson ends
{const L=require('fs').readFileSync('learn2.js','utf8'),H=require('fs').readFileSync('index.html','utf8');
 ok(!/>loudness</.test(H)&&/>velocity</.test(H),'15 the step grid says velocity, the DAW word, not loudness');
 const END={hl_name:/DURATION/,sb_name:/EIGHTH NOTES/,tp_name:/TEMPO.*BPM/,dy_name:/DYNAMICS.*VELOCITY/,cb_name:/BAR.*TIME SIGNATURE/,
   high_name:/PITCH/,mk_name:/LOOP/,pulse_name:/BEAT.*METRONOME/,ge_name:/DRUM GRID/,iv_name:/INTERVAL/,ch_name:/CHORD/,st_name:/STAFF/,
   ms_name:/MAJOR SCALE/,rs_name:/REST/,jam_name:/IMPROVISING/,rj_name:/IMPROVISING/,ml_name:/READING MUSIC/};
 const miss=Object.entries(END).filter(([k,re])=>{const m=L.match(new RegExp(k+":'([^']*)'"));return !m||!re.test(m[1]);}).map(([k])=>k);
 ok(miss.length===0,'15 each concept lesson ends on the standard word ('+(miss.join(' ')||Object.keys(END).length+' lessons')+')');}

(async()=>{const b=await launch();
 const ctx=await b.newContext({viewport:{width:1280,height:860}});
 await ctx.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-tapped','1');}catch(e){}
   window.__said=[];window.SpeechSynthesisUtterance=class{constructor(t){this.text=t;}};
   Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak:u=>window.__said.push(String(u.text)),cancel:()=>{},getVoices:()=>[],addEventListener:()=>{}}});
   window.__starts=0;const st=AudioScheduledSourceNode.prototype.start;
   AudioScheduledSourceNode.prototype.start=function(...a){window.__starts++;return st.apply(this,a);};});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(BASE);await p.waitForTimeout(1500);await p.click('.modeCard[data-m="learn"]');await p.waitForTimeout(1500);
 const ids=[...new Set([...require('fs').readFileSync('learn2.js','utf8').matchAll(/{id:'([a-z0-9]+)',[^}]*?tier:'(lesson|game|practice)'/g)].map(m=>m[1]))];   // parts (merged) are not on the map
 const home=async()=>{await p.evaluate(()=>window.LEARN2.home());await p.waitForTimeout(400);};
 const open=async(id)=>{await home();await p.evaluate(()=>{window.__opened=window.__starts;});   /* count from before the lesson opens */
  await p.evaluate(i=>{const c=document.querySelector('.uCard[data-u="'+i+'"]');if(c)c.click();},id);
   await p.waitForTimeout(900);await p.evaluate(()=>{if(window._lab_ready&&document.querySelector('#learnOverlay [data-lg="ready"]'))window._lab_ready();});await p.waitForTimeout(900);};
 const state=()=>p.evaluate(()=>({go:!!document.querySelector('#learnOverlay .lgListen.go'),listen:!!document.querySelector('#learnOverlay .lgListen'),
   starts:window.__starts,opened:window.__opened,feed:((document.getElementById('lgFeed')||{}).textContent||'').trim(),count:(document.querySelector('#learnOverlay .lgCount')||{}).textContent||''}));

 // ---- 06: every unit, opened and asked: never a word spoken; which rounds wait for "listen"
 const waits=[],plays=[];
 const counts={};
 for(const id of ids){await open(id);const s=await state();if(s.go)waits.push(id);else if(s.listen)plays.push(id);const m=s.count.match(/\/\s*(\d+)/);if(m&&id!=='compose')counts[id]=+m[1];}   /* compose counts note slots, not rounds */
 ok(Object.keys(counts).length>=15&&Object.values(counts).every(n=>n===3||n===5),'14 every unit asks 3 or 5 times, never 10 ('+Object.entries(counts).map(([k,v])=>k+' '+v).join(', ')+')');
 console.log('  waits for listen: '+waits.join(' ')+'\n  listen, target on screen: '+plays.join(' '));
 ok(JUDGED.every(id=>waits.includes(id)),'06 every round judged by ear waits for "listen" ('+JUDGED.filter(id=>!waits.includes(id)).join(' ')+' missing)');
 ok(waits.length>=8,'06 and so do the ear lessons ('+waits.length+' units wait)');

 for(const id of waits){
  await open(id);
  const a=await state();await p.waitForTimeout(2500);const b2=await state();
  ok(b2.starts===b2.opened&&b2.go,'06 '+id+': nothing sounds before "listen" ('+(b2.starts-b2.opened)+' sounds from opening it), and it pulses');
  // an answer before listening is ignored
  const tapped=await p.evaluate(()=>{const el=document.querySelector('#learnOverlay [data-cnt],#learnOverlay [data-sp],#learnOverlay .stHit,#learnOverlay [data-ch],#learnOverlay .lgRung,#learnOverlay [data-ge],#learnOverlay #lgPad');
    if(!el)return false;const r=el.getBoundingClientRect();const o={bubbles:true,cancelable:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2,pointerId:1,isPrimary:true};
    el.dispatchEvent(new PointerEvent('pointerdown',o));el.dispatchEvent(new PointerEvent('pointerup',o));return true;});
  await p.waitForTimeout(500);const c=await state();
  ok(tapped&&c.count===a.count&&c.feed===a.feed&&c.go&&c.starts-b2.starts<=1,'06 '+id+': an answer before "listen" does not count ('+a.count+' -> '+c.count+')');
  await p.click('#learnOverlay .lgListen',{force:true});await p.waitForTimeout(1500);   /* force: it pulses, so it is never "stable" */const d=await state();
  ok(d.starts>c.starts&&!d.go,'06 '+id+': "listen" plays it ('+(d.starts-c.starts)+' sounds) and stops pulsing');}

 // the next round waits again (a ladder lesson publishes its target, so answer it right)
 await open('notes');await p.click('#learnOverlay .lgListen',{force:true});await p.waitForTimeout(1200);
 await p.evaluate(()=>{const d=window._labHintDeg,el=document.querySelector('#learnOverlay .lgRung[data-deg="'+d+'"]');
   el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));});
 await p.waitForTimeout(1800);const n1=await state();await p.waitForTimeout(2000);const n2=await state();
 ok(n1.count.startsWith('1')&&n2.go&&n2.starts===n1.starts,'06 the next round waits for "listen" too ('+n1.count+', '+(n2.starts-n1.starts)+' sounds)');

 // ---- 07: u_make plays each step's picked note ON its step, at its pitch, every loop
 await open('make');await p.waitForTimeout(600);
 await p.evaluate(()=>{window.__syn=[];const P0=playSynth;
   playSynth=function(f,v,i,h,fi,at){window.__syn.push({f,at:(typeof at==='number'?at:null),now:AC.currentTime});return P0.apply(this,arguments);};});
 for(const [k,w] of [[0,700],[2,900],[4,500]]){await p.evaluate(k=>{const el=document.querySelectorAll('#learnOverlay .mkPad')[k];
   el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));},k);await p.waitForTimeout(w);}
 const mk=await p.evaluate(async()=>{const taps=window.__syn.filter(r=>r.at==null);const grid=window._lab_mkGrid();
   const pads=[...document.querySelectorAll('#learnOverlay .mkPad')].map(e=>+e.dataset.d);
   window.__syn=[];window.__when=[];const st=AudioScheduledSourceNode.prototype.start;
   OscillatorNode.prototype.start=function(w){window.__when.push(w);return st.apply(this,arguments);};
   const c=window._lab_mkClock();await new Promise(r=>setTimeout(r,c.LOOP*2200));
   return {taps,grid,pads,c:window._lab_mkClock(),sched:window.__syn.slice(),when:window.__when.slice()};});
 {const pickF={};mk.taps.forEach((r,i)=>{pickF[[0,2,4].map(k=>mk.pads[k])[i]]=r.f;});
  const picks=mk.grid.map((d,i)=>d==null?null:{i,d,f:pickF[d]}).filter(Boolean);
  const S=mk.c.SLOT,L=mk.c.LOOP,base=mk.c.loopAt;   // loopAt is the start of the bar not yet scheduled
  const got=mk.sched.filter(r=>r.at!=null).map(r=>{const rel=(((r.at-base)%L)+L)%L,slot=Math.round(rel/S)%mk.grid.length;
    return {slot,err:Math.abs(rel-Math.round(rel/S)*S),f:r.f,ahead:r.at-r.now};});
  const loops=Math.floor(got.length/Math.max(1,picks.length));
  console.log('  picks '+JSON.stringify(mk.grid)+', '+got.length+' scheduled notes over 2 loops');
  ok(picks.length>=2&&new Set(picks.map(x=>x.d)).size>=2,'07 three taps on three pads land as picks on the grid ('+picks.length+')');
  ok(loops>=2&&got.length===loops*picks.length,'07 every loop schedules exactly the picked notes ('+got.length+' notes, '+picks.length+' picks)');
  ok(got.every(g=>picks.some(x=>x.i===g.slot))&&picks.every(x=>got.some(g=>g.slot===x.i)),'07 each note lands on a picked step, and every picked step sounds');
  ok(got.every(g=>{const x=picks.find(q=>q.i===g.slot);return x&&Math.abs(g.f-x.f)<0.01;}),'07 at the pitch picked for that step');
  ok(got.every(g=>g.err<0.002&&g.ahead>-0.005),'07 on the grid, scheduled ahead (worst '+(Math.max(0,...got.map(g=>g.err))*1000).toFixed(2)+' ms off)');
  const starts=got.length?mk.sched.filter(r=>r.at!=null).every(r=>mk.when.some(w=>w-r.at>=0.007&&w-r.at<=0.026)):false;
  ok(starts,'07 and an oscillator starts at each of those times (the note itself, not just the call)');}

 // ---- 08/09: Copy the Beat, a drum grid: colours, explain once, count-in, the beat, the playhead, wrong -> lilac, right
 {const gen=await p.evaluate(()=>{const B=window.LEARN2._geBeat,K=window.LEARN2._geKey,out={lv:[[],[],[]],kickless:0,stacked0:0,keys:new Set()};
    for(let i=0;i<3000;i++){const r=i%5,p=B(r,Math.random),lv=r<2?0:r<4?1:2;let n=0,stack=0;
      for(let k=0;k<4;k++){const c=['K','s','h'].filter(v=>p[v][k]).length;n+=c;if(c>1)stack++;}
      out.lv[lv].push({n,h:p.h.some(Boolean),stack});if(!p.K.some(Boolean))out.kickless++;out.keys.add(K(p));}
    const f=a=>({min:Math.min(...a.map(x=>x.n)),max:Math.max(...a.map(x=>x.n)),hat:a.filter(x=>x.h).length/a.length,stack:a.filter(x=>x.stack).length/a.length});
    return {l0:f(out.lv[0]),l1:f(out.lv[1]),l2:f(out.lv[2]),kickless:out.kickless,kinds:out.keys.size};});
  console.log('  beats by level: '+JSON.stringify(gen));
  ok(gen.l0.min>=2&&gen.l0.max<=3&&gen.l0.hat===0&&gen.l0.stack===0,'09 the first beats: kick and snare, 2-3 hits, one at a time');
  ok(gen.l1.min>=3&&gen.l1.max<=4&&gen.l1.hat===1&&gen.l1.stack===0,'09 then the hi-hat comes in, 3-4 hits');
  ok(gen.l2.min>=4&&gen.l2.max<=6&&gen.l2.stack>0.3,'09 then 4-6 hits, two drums on one beat ('+Math.round(gen.l2.stack*100)+'% of beats)');
  ok(gen.kickless===0&&gen.kinds>=40,'09 every beat has a kick, and there are many of them ('+gen.kinds+' different beats)');}
 await open('sayplay');
 await p.evaluate(()=>{window.__dh=[];if(!window.__dhOn){window.__dhOn=1;const D0=dHit;dHit=function(v,t){window.__dh.push({v,t:t==null?AC.currentTime:t});return D0.apply(this,arguments);};}});
 const g0=await p.evaluate(()=>{const hue=c=>{const m=c.match(/\d+/g).map(Number),[r,g,b]=m.map(x=>x/255),mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;
     if(!d)return -1;let h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;return (h*60+360)%360;};
   const rows=[...document.querySelectorAll('#geGrid .geRow:not(.geNums)')];
   return {intro:!!document.querySelector('.geIntro'),go:!!document.querySelector('.lgListen.go'),
     lanes:rows.map(r=>({name:r.querySelector('.geLbl').textContent,hue:hue(getComputedStyle(r.querySelector('.geCell')).borderTopColor)})),
     cell:(()=>{const r=document.querySelector('.geCell').getBoundingClientRect();return {w:r.width,h:r.height};})()};});
 ok(g0.lanes.map(l=>l.name).join()==='kick,snare,hi-hat','09 three rows: kick, snare, hi-hat');
 const [hk,hs,hh]=g0.lanes.map(l=>l.hue);
 ok(hk>=250&&hk<=285&&(hs<=12||hs>=348)&&hh>=38&&hh<=55,'09 kick purple, snare red, hi-hat yellow (hues '+[hk,hs,hh].map(Math.round).join(' / ')+')');
 ok(g0.cell.w>=44&&g0.cell.h>=44,'09 every box is a big enough target ('+Math.round(g0.cell.w)+'x'+Math.round(g0.cell.h)+')');
 ok(g0.intro&&g0.go,'08 the first round explains itself, and waits for "listen"');
 // listen: the count-in is heard and seen, then the beat, with the playhead on the beat being played
 await p.click('#learnOverlay .lgListen',{force:true});
 const seen=[];const pl=[];
 for(let i=0;i<70;i++){const s=await p.evaluate(()=>{const t0=window._labGeT0,B=60/90,b=(AC.currentTime-t0)/B;
    const now=[...document.querySelectorAll('#geGrid .geRow:not(.geNums)')[0].querySelectorAll('.geCell')].findIndex(c=>c.classList.contains('now'));
    return {cnt:(document.getElementById('geCount')||{}).textContent||'',b,now,playing:window._labGeState().playing};});
   if(s.cnt&&seen[seen.length-1]!==s.cnt)seen.push(s.cnt);
   const frac=s.b-Math.floor(s.b);if(s.b>=4&&s.b<8&&frac>0.15&&frac<0.85)pl.push({want:Math.floor(s.b-4),got:s.now});
   if(!s.playing&&s.b>8)break;await p.waitForTimeout(90);}
 const ge1=await p.evaluate(()=>({dh:window.__dh.slice(),t0:window._labGeT0,pat:window._labGePat,st:window._labGeState()}));
 {const B=60/90,clicks=ge1.dh.filter(h=>h.v==='r').map(h=>(h.t-ge1.t0)/B),beat=ge1.dh.filter(h=>h.v!=='r');
  ok(seen.join('')==='4321','09 a count-in you see: '+seen.join(' '));
  ok(clicks.length===4&&clicks.every((c,i)=>Math.abs(c-i)<0.01),'09 and hear: four clicks, one a beat, before the beat ('+clicks.map(c=>c.toFixed(2)).join(' ')+')');
  const want=[];['K','s','h'].forEach(v=>ge1.pat[v].forEach((x,k)=>{if(x)want.push(v+k);}));
  const got=beat.map(h=>h.v+Math.round((h.t-ge1.t0)/B-4)).sort();
  ok(JSON.stringify(got)===JSON.stringify(want.sort())&&beat.every(h=>Math.abs((h.t-ge1.t0)/B-Math.round((h.t-ge1.t0)/B))<0.01),
    '09 then the beat itself, each hit on its beat ('+got.join(' ')+')');
  ok(pl.length>=8&&pl.every(x=>x.want===x.got),'09 the playhead is on the beat being played ('+pl.filter(x=>x.want===x.got).length+' of '+pl.length+' looks)');
  ok(ge1.st.explained&&!(await p.evaluate(()=>!!document.querySelector('.geIntro'))),'08 once it has been heard, the explanation is gone');}
 // a wrong answer: the beat with one kick moved
 const tapCell=(id)=>p.evaluate(id=>{const c=document.querySelector('[data-ge="'+id+'"]');c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));},id);
 const checkIt=()=>p.evaluate(()=>{document.querySelector('[data-gek="check"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));});
 {const pat=ge1.pat,want=[];['K','s','h'].forEach(v=>pat[v].forEach((x,k)=>{if(x)want.push(v+k);}));
  const wrongK=[0,1,2,3].find(k=>!pat.K[k]);
  for(const id of want)if(id!=='K'+pat.K.indexOf(1))await tapCell(id);
  await tapCell('K'+wrongK);await p.waitForTimeout(200);await checkIt();await p.waitForTimeout(300);
  const w=await p.evaluate(()=>({miss:[...document.querySelectorAll('#geGrid .geRow.miss .geLbl')].map(e=>e.textContent),
    bg:(()=>{const r=document.querySelector('#geGrid .geRow.miss');return r?getComputedStyle(r).backgroundColor:'';})(),
    feed:document.getElementById('lgFeed').textContent,count:document.querySelector('.lgCount').textContent,mine:window._labGeMine()}));
  ok(w.miss.join()==='kick'&&/230, 220, 255/.test(w.bg),'09 wrong: only the kick row turns lilac ('+w.miss.join()+', '+w.bg+')');
  ok(w.feed==='Close, listen and try again!'&&w.count.startsWith('0'),'09 "Close, listen and try again!", and it does not count ('+w.count+')');
  ok(w.mine.K[wrongK]===1,'09 and the kid\'s hits stay, to fix');
  await tapCell('K'+wrongK);await tapCell('K'+pat.K.indexOf(1));await p.waitForTimeout(200);
  const fixed=await p.evaluate(()=>document.querySelectorAll('#geGrid .geRow.miss').length);
  await checkIt();await p.waitForTimeout(300);
  const r=await p.evaluate(()=>({feed:document.getElementById('lgFeed').textContent,count:document.querySelector('.lgCount').textContent}));
  ok(fixed===0&&r.feed==='Good job!'&&r.count.startsWith('1'),'09 fixed: the lilac goes, "Good job!", 1 counted ('+r.count+')');}
 // the next rounds: no explanation, no beat twice in a row, a count-in every time; 20 rounds over two runs of the unit
 {const keys=[ge1.pat],intros=[],counts=[];let runs=1;
  for(let i=0;i<19;i++){
   for(let w=0;w<40;w++){const s=await p.evaluate(()=>window._labGeState&&window._labGeState()&&!window._labGeState().playing&&!!document.querySelector('.lgListen.go'));
     if(s)break;
     if(await p.evaluate(()=>!!document.querySelector('.lgDone'))){runs++;await p.evaluate(()=>{const a=document.querySelector('[data-a2="again"]');if(a)a.click();});}
     await p.waitForTimeout(150);}
   const pat=await p.evaluate(()=>window._labGePat);keys.push(pat);intros.push(await p.evaluate(()=>({on:!!document.querySelector('.geIntro'),first:window._labGeState().round===0})));
   await p.evaluate(()=>{window.__dh=[];});await p.click('#learnOverlay .lgListen',{force:true});
   for(let w=0;w<60;w++){await p.waitForTimeout(150);if(!(await p.evaluate(()=>window._labGeState().playing)))break;}
   counts.push(await p.evaluate(()=>window.__dh.filter(h=>h.v==='r').length));
   for(const v of ['K','s','h'])for(let k=0;k<4;k++)if(pat[v][k])await tapCell(v+k);
   await checkIt();await p.waitForTimeout(250);}
  const K=x=>['K','s','h'].map(v=>x[v].join('')).join('|');
  const rep=keys.slice(1).filter((x,i)=>K(x)===K(keys[i])).length;
  ok(keys.length===20&&rep===0,'09 20 rounds, never the same beat twice in a row ('+rep+' repeats, '+new Set(keys.map(K)).size+' different, '+runs+' runs)');
  ok(counts.every(c=>c===4),'09 a count-in before every beat ('+counts.join('')+')');
  ok(intros.every(x=>x.on===x.first),'08 the explanation shows on the first round of a run only, never round after round ('+intros.filter(x=>x.on).length+' of 19 rounds, '+intros.filter(x=>x.first).length+' first rounds)');}

 // ---- 10: long and short: a lead-in, then the note alone
 await open('howlong');
 await p.evaluate(()=>{window.__dh=[];if(!window.__dhOn){window.__dhOn=1;const D0=dHit;dHit=function(v,t){window.__dh.push({v,t:t==null?AC.currentTime:t});return D0.apply(this,arguments);};}
   window.__sy=[];const P0=playSynth;playSynth=function(f,v,i,h,fi,at){window.__sy.push({at,h});return P0.apply(this,arguments);};
   window.__st=[];for(const C of [AudioScheduledSourceNode,OscillatorNode]){const st=C.prototype.start;C.prototype.start=function(w){window.__st.push(w||AC.currentTime);return st.apply(this,arguments);};}   /* both: 07 gave oscillators their own start */});
 await p.click('#learnOverlay .lgListen',{force:true});
 const hlSeen=[];for(let i=0;i<40;i++){const f=await p.evaluate(()=>document.getElementById('lgFeed').textContent);
   if(f&&hlSeen[hlSeen.length-1]!==f)hlSeen.push(f);await p.waitForTimeout(80);}
 await p.waitForTimeout(2500);
 {const h=await p.evaluate(()=>({dh:window.__dh,sy:window.__sy,st:window.__st,t0:window._labHlT0}));const P=0.6;
  const clicks=h.dh.map(x=>(x.t-h.t0)/P),nt=h.sy.length===1?(h.sy[0].at-h.t0)/P:-1,len=h.sy.length?h.sy[0].h/P/0.95:0;
  ok(h.dh.every(x=>x.v==='r')&&clicks.length===4&&clicks.every((c,i)=>Math.abs(c-i)<0.01),'10 a lead-in of four clicks, one a beat ('+clicks.map(c=>c.toFixed(2)).join(' ')+')');
  ok(hlSeen.join('')==='4321','10 that you can see: '+hlSeen.join(' '));
  ok(Math.abs(nt-4)<0.01,'10 then the note, on the beat after them ('+nt.toFixed(2)+')');
  const nStart=h.t0+4*P,nEnd=nStart+len*P,over=h.st.filter(w=>w>nStart+0.03&&w<nEnd);
  ok(over.length===0,'10 and nothing else starts while it rings ('+over.length+' sounds over a '+len.toFixed(0)+'-beat note)');}

 // ---- 11: count to four: a lead-in, then a ball on the 4/4 grid, on the beat at each beat
 await open('countbar');
 await p.evaluate(()=>{window.__dh=[];if(!window.__dhOn){window.__dhOn=1;const D0=dHit;dHit=function(v,t){window.__dh.push({v,t:t==null?AC.currentTime:t});return D0.apply(this,arguments);};}});
 const cbWait=await p.evaluate(()=>({go:!!document.querySelector('.lgListen.go'),steps:document.querySelectorAll('.rgStep').length,
   beats:document.querySelectorAll('.rgNums b').length,on:document.querySelectorAll('.rgStep.on').length}));
 ok(cbWait.go&&cbWait.steps===cbWait.beats*4&&cbWait.beats>=4,'11 a 4/4 grid under the bar, four steps a beat ('+cbWait.steps+' steps, '+cbWait.beats+' beats), waiting for "listen"');
 await p.click('#learnOverlay .lgListen',{force:true});
 const cb=[];const cbLead=[];
 for(let i=0;i<90;i++){const s=await p.evaluate(()=>{const t0=window._labReadT0,P=0.6,b=(AC.currentTime-t0)/P,ball=document.getElementById('rgBall'),w=document.getElementById('rgWrap');
    if(!ball||!w)return null;const br=ball.getBoundingClientRect(),wr=w.getBoundingClientRect();
    return {b,beat:ball.dataset.beat,x:(br.left-wr.left)/wr.width,beats:document.querySelectorAll('.rgNums b').length,feed:document.getElementById('lgFeed').textContent};});
   if(!s)break;if(s.b<0){if(s.feed&&cbLead[cbLead.length-1]!==s.feed)cbLead.push(s.feed);}
   else if(s.b<s.beats){const fr=s.b-Math.floor(s.b);if(fr>0.15&&fr<0.85)cb.push({want:Math.floor(s.b),got:+s.beat,x:s.x,wx:Math.floor(s.b)/s.beats});}
   else break;await p.waitForTimeout(70);}
 {const h=await p.evaluate(()=>({dh:window.__dh,t0:window._labReadT0}));const P=0.6;
  const lead=h.dh.filter(x=>x.t<h.t0-0.01).map(x=>(x.t-h.t0)/P);
  ok(lead.length===4&&lead.every((c,i)=>Math.abs(c-(i-4))<0.01),'11 a lead-in bar of four clicks before counting starts ('+lead.map(c=>c.toFixed(2)).join(' ')+')');
  ok(cbLead.join('')==='4321','11 and on screen: '+cbLead.join(' '));
  ok(cb.length>=8&&cb.every(x=>x.got===x.want&&Math.abs(x.x-x.wx)<0.02),'11 the ball is on the right beat at each beat ('+cb.filter(x=>x.got===x.want&&Math.abs(x.x-x.wx)<0.02).length+' of '+cb.length+' looks)');}

 // ---- 14: a merged lesson: High and Low's rounds, then Up or Down as its part 2, then ONE ending
 {await open('high');let saw2=false,title2='';
  for(let i=0;i<120&&!(await p.evaluate(()=>!!document.querySelector('.lgDone')));i++){
   await p.evaluate(()=>{const r=document.querySelector('#learnOverlay [data-lg="ready"]');if(r){r.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));return;}
     const l=document.querySelector('#learnOverlay .lgListen.go');if(l)l.click();});await p.waitForTimeout(500);   /* part 2 opens on its own explore screen */
   const h=await p.evaluate(()=>{const h3=(document.querySelector('#learnOverlay .lgTop h3')||{}).textContent||'';
     const d=window._labHintDeg,e=window._labExpect;
     const el=(e!=null&&document.querySelector('#learnOverlay [data-ch="'+e+'"]'))||(d!=null&&document.querySelector('#learnOverlay .lgRung[data-deg="'+d+'"]'));
     if(el)el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));return h3;});
   if(/up or down/i.test(h)){saw2=true;title2=h;}await p.waitForTimeout(700);}
  const end=await p.evaluate(()=>({done:!!document.querySelector('.lgDone'),h3:(document.querySelector('#learnOverlay .lgTop h3')||{}).textContent||'',
    line:[...document.querySelectorAll('#learnOverlay .lgSay')].map(e=>e.textContent).join(' '),again:(document.querySelector('[data-a2="again"]')||{dataset:{}}).dataset.u}));
  ok(saw2,'14 High and Low runs Up or Down as its part 2 ("'+title2+'")');
  ok(end.done&&end.again==='high'&&/PITCH/.test(end.line)&&/UP/.test(end.line),'14 and ends once, as High and Low, with both lines ("'+end.line.slice(0,90)+'")');
  const onMap=await p.evaluate(async()=>{window.LEARN2.home();await new Promise(r=>setTimeout(r,500));return ['updown','findhome','intervals','song'].filter(id=>document.querySelector('.lmMap .uCard[data-u="'+id+'"]'));});
  ok(onMap.length===0,'14 a part is never on the map on its own ('+onMap.join(' ')+')');}

 // ---- 14b: the wrong-answer third of the three-way playthrough (spec section 3; right answers = dev-lessons, back = 13):
 // in every judged unit, after "listen", a wrong answer says "Close, listen and try again!" and counts nothing
 {const bad=[];const judged=waits.filter(id=>!['countbar','rest','split','sayplay'].includes(id));   // read units and Copy the Beat: their own checks (11, 09)
  for(const id of judged){await open(id);
   await p.evaluate(()=>{const l=document.querySelector('#learnOverlay .lgListen');if(l)l.click();});await p.waitForTimeout(id==='howlong'?3200:1500);   /* howlong: answers wait for the note, after the lead-in */
   const r=await p.evaluate(()=>{const c0=(document.querySelector('#learnOverlay .lgCount')||{}).textContent||'';
     const pd=el=>el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));
     const e=window._labExpect,d=window._labHintDeg;let el=null;
     if(e!=null)el=[...document.querySelectorAll('#learnOverlay [data-ch]')].find(b=>b.dataset.ch!==String(e));
     if(!el&&d!=null)el=[...document.querySelectorAll('#learnOverlay .lgRung')].find(b=>+b.dataset.deg!==d);
     if(!el){const w=[...document.querySelectorAll('#learnOverlay [data-cnt]')];if(w.length)el=w.find(b=>b.dataset.cnt!==String(window._labHowlong||''))||w[0];}
     if(!el)return {skip:true};pd(el);return {c0};});
   if(r.skip){bad.push(id+' (nothing to answer wrong)');continue;}
   await p.waitForTimeout(250);
   const after=await p.evaluate(()=>({feed:((document.getElementById('lgFeed')||{}).textContent||'').trim(),c:(document.querySelector('#learnOverlay .lgCount')||{}).textContent||''}));
   if(!(/Close, listen and try again!/.test(after.feed)&&after.c===r.c0))bad.push(id+' ("'+after.feed+'", '+r.c0+' -> '+after.c+')');}
  ok(bad.length===0,'14 a wrong answer in every judged unit says "Close, listen and try again!" and counts nothing ('+judged.length+' units'+(bad.length?'; '+bad.join(' | '):'')+')');}

 // ---- 16: a lesson's drums: the lesson kit whatever studio last picked, about as loud as a lesson's notes allow
 {const lv=await p.evaluate(async()=>{const k1=AC.createBiquadFilter(),k2=AC.createBiquadFilter();k1.type='highshelf';k1.frequency.value=1681.97;k1.gain.value=4;
    k2.type='highpass';k2.frequency.value=38.13;k2.Q.value=0.5;const sp=AC.createScriptProcessor(1024,1,1);outClip.connect(k1);k1.connect(k2);k2.connect(sp);sp.connect(AC.destination);
    let s=0,n=0,on=false;sp.onaudioprocess=e=>{if(!on)return;for(const x of e.inputBuffer.getChannelData(0)){s+=x*x;n++;}};
    const meas=async(fn,secs)=>{s=0;n=0;on=true;fn();await new Promise(r=>setTimeout(r,secs*1000));on=false;return -0.691+10*Math.log10(s/Math.max(1,n)+1e-20);};
    LAB.give();drumKit='industrial';applyMix();LAB.take({scale:'pentaMaj',octs:1,drums:false,band:false,touch:false});
    const kit=drumKit,trim=drumTrim.gain.value;await new Promise(r=>setTimeout(r,400));
    const P=0.5,t0=AC.currentTime+0.1;
    const drums=await meas(()=>{for(let i=0;i<8;i++){dHit(i%2?'s':'K',t0+i*P,1.0,true);if(i%2)dHit('h',t0+i*P+P/2,0.8,true);}},8*P+0.4);
    const t1=AC.currentTime+0.1;
    const notes=await meas(()=>{for(let i=0;i<8;i++)playSynth(freqFromCents(centsForDegree([0,2,4,2,3,1,2,0][i])),92,0.72,0.3,true,t1+i*P);},8*P+0.4);
    LAB.give();return {kit,back:drumKit,drums,notes};});
  ok(lv.kit==='pop'&&lv.back==='industrial','16 a lesson plays the lesson kit (pop) whatever was picked before, and hands the kit back after ('+lv.kit+', back to '+lv.back+')');
  const gap=lv.drums-lv.notes;
  ok(gap<=-1&&gap>=-6,'16 and its drums sit just under its notes, audible, not buried (drums '+gap.toFixed(1)+' LU against the notes; window -6..-1)');}

 // ---- 12: Play It Again lists what was finished (the same day too), each with what it taught, and replays it
 {const fin=['howlong','sayplay','staff'];
  await p.evaluate(f=>{const pr=JSON.parse(localStorage.getItem('slimehedron-learn2')||'{}');const now=Date.now();
    f.forEach((id,i)=>{pr[id]=Object.assign(pr[id]||{},{hits:6,tries:10,at:now-i*60000});});   /* 60%: under the mastery bar, finished today */
    localStorage.setItem('slimehedron-learn2',JSON.stringify(pr));window.LEARN2._reloadProgress();},fin);
  await open('review');
  const rv=await p.evaluate(()=>[...document.querySelectorAll('#learnOverlay .uCard[data-u]')].map(c=>({id:c.dataset.u,txt:c.textContent})));
  ok(fin.every(id=>rv.some(r=>r.id===id)),'12 every unit finished today shows, even under 80% ('+rv.map(r=>r.id).join(' ')+')');
  ok(rv.every(r=>/today|yesterday|days ago/.test(r.txt)&&r.txt.length>20),'12 each says what it taught and when ("'+(rv[0]||{}).txt+'")');
  for(const id of fin){await open('review');
   await p.evaluate(i=>{document.querySelector('#learnOverlay .uCard[data-u="'+i+'"]').click();},id);await p.waitForTimeout(900);
   const h3=await p.evaluate(()=>(document.querySelector('#learnOverlay .lgTop h3')||{}).textContent||'');
   const n0=await p.evaluate(()=>window.__starts);await p.click('#learnOverlay .lgListen',{force:true}).catch(()=>{});await p.waitForTimeout(1500);
   const n1=await p.evaluate(()=>window.__starts);
   ok(h3.length>2&&n1>n0,'12 '+id+' from Play It Again opens that lesson ("'+h3+'") and it plays ('+(n1-n0)+' sounds)');}}

 // ---- 13: back from every unit lands on the learn map, loaded, with nothing running behind it. A real mouse press,
 // while the unit is making sound (a redraw between press and release used to be able to swallow the click)
 {const bad=[];
  for(const id of ids){await open(id);
   await p.evaluate(()=>{const l=document.querySelector('#learnOverlay .lgListen');if(l)l.click();});await p.waitForTimeout(700);
   const hasBack=await p.evaluate(()=>!!document.querySelector('#learnOverlay .lgBack'));
   if(!hasBack){bad.push(id+' (no back)');continue;}
   await p.click('#learnOverlay .lgBack',{force:true});await p.waitForTimeout(900);
   const s0=await p.evaluate(()=>window.__starts);await p.waitForTimeout(1500);
   const m=await p.evaluate(s0=>{const map=document.querySelector('#learnOverlay .lmMap'),c=document.elementFromPoint(innerWidth/2,innerHeight/2);
     return {map:!!map&&map.checkVisibility(),cards:document.querySelectorAll('#learnOverlay .lmMap .uCard').length,stage:document.body.classList.contains('lab-stage'),
       cover:!!c&&!!c.closest('#learnOverlay'),sounds:window.__starts-s0,drums:!!drumOn,band:!!bandOn};},s0);
   if(!(m.map&&m.cards>=ids.length-1&&!m.stage&&m.cover&&m.sounds===0&&!m.drums&&!m.band))bad.push(id+' '+JSON.stringify(m));}
  ok(bad.length===0,'13 back from every unit ('+ids.length+') shows the whole map, nothing playing behind it'+(bad.length?': '+bad.join(' | '):''));}

 ok((await p.evaluate(()=>window.__said.length))===0,'06 nothing was ever spoken ('+(await p.evaluate(()=>window.__said.slice(0,2).join(' | ')))+')');
 ok(errs.length===0,'no page errors ('+errs.slice(0,2).join(' | ')+')');
 await b.close();
 console.log(FAIL.length?'\n'+FAIL.length+' FAIL':'\nlearn: no voice, and a sound to judge waits for "listen"');process.exit(FAIL.length?1:0);})();

// ============================================================================================
//  STUDIO POLISH (spec _docs/specs/2026-11-07-studio-polish; research _docs/research/2026-11-07-daw-layout.md)
//    1. the pattern tabs: the sequencer tab shows the sequencer only, the drum grid tab the drum grid (and revert)
//    2. one row's buttons never steal another row's choice: pressing sequencer buttons leaves the drum grid's tap mode
//       (and every other sequencer row) as it was (a page-wide click handler used to clear them all)
//    3. option rows are segmented controls: one rounded track, buttons 2 px apart at most, each 44 px+ tall
//    4. tempo: drag the number (up 40 px = +8..12 BPM, down lowers, clamped 40..220), the wheel steps it, a tap
//       still lets you type; no spinner arrows; TAP's text is as bold as the strip's other buttons
//    5. the mixer: mute pressed is blue / periwinkle (Logic, GarageBand), solo yellow; each part has its own colour
//    6. the first screen: Groove sits in the Pattern card, Timing is under "more settings"; no sideways page scroll
//       at 360, 390, 1280 and 1440 px
//  Sabotaged 6 ways (2026-11-07), each caught: the tap-mode handler matching every row (2), the drum grid not hidden (1),
//  no segmented tracks (3), tempo drag twice as fast (4), mute back to pink (5), Timing back on the first screen (6).
//  Needs a local server: python -m http.server 8765. Run from the project root: node _dev/dev-studiopolish.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html?m=studio&view=2d';
const init=()=>{try{for(const k of ['slimehedron-coach','slimehedron-coach-studio','slimehedron-tapped'])localStorage.setItem(k,'1');}catch(e){}};
const hueOf=css=>{const m=css.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);if(!m)return -1;let [r,g,b]=[+m[1]/255,+m[2]/255,+m[3]/255];
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;if(!d)return -1;let h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h*=60;return (h+360)%360;};
const hd=(a,b)=>{const d=Math.abs(a-b)%360;return Math.min(d,360-d);};

(async()=>{const b=await launch();
 const ctx=await b.newContext({viewport:{width:1280,height:900}});await ctx.addInitScript(init);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(URL);await p.waitForTimeout(2500);
 const vis=sel=>p.evaluate(s=>{const e=document.querySelector(s);return !!(e&&e.checkVisibility()&&e.getBoundingClientRect().height>0);},sel);

 // ---- 1. the tabs ----
 await p.click('.patTabs [data-pt="seq"]');await p.waitForTimeout(200);
 const s1={seq:await vis('#seqPanel'),grid:await vis('#drumEditor'),rev:await vis('#stepRevert')};
 ok(s1.seq&&!s1.grid&&!s1.rev,'1. the sequencer tab shows the sequencer only (sequencer '+s1.seq+', drum grid '+s1.grid+', revert '+s1.rev+')');
 // ---- 2. pressing sequencer buttons steals nothing ----
 for(const sel of ['[data-tg="drums"]','[data-rw="AB"]','[data-dr="rev"]','[data-rt="1"]','[data-ln="vel"]','[data-tg="notes"]'])await p.click('#seqPanel '+sel);
 await p.waitForTimeout(200);
 const st=await p.evaluate(()=>{const one=g=>[...document.querySelectorAll('#seqPanel [data-'+g+']')].filter(b=>b.classList.contains('on')).map(b=>b.dataset[g]);
   return {tg:one('tg'),rw:one('rw'),dr:one('dr'),rt:one('rt'),ln:one('ln'),
     mode:[...document.querySelectorAll('#drumEditor [data-mode]')].filter(b=>b.classList.contains('on')).map(b=>b.dataset.mode)};});
 ok(st.rw.join()==='AB'&&st.dr.join()==='rev'&&st.rt.join()==='1'&&st.ln.join()==='vel'&&st.tg.join()==='notes',
   '2. each sequencer row keeps its own choice (rows '+st.rw+', way '+st.dr+', step '+st.rt+', knobs '+st.ln+', play '+st.tg+')');
 ok(st.mode.join()==='on','2. and the drum grid\'s tap mode is untouched ('+(st.mode.join()||'none lit')+')');
 await p.click('.patTabs [data-pt="grid"]');await p.waitForTimeout(200);
 const s2={seq:await vis('#seqPanel'),grid:await vis('#drumEditor'),rev:await vis('#stepRevert')};
 ok(!s2.seq&&s2.grid&&s2.rev,'1. the drum grid tab shows the drum grid and revert, not the sequencer ('+JSON.stringify(s2)+')');
 await p.click('#drumEditor [data-mode="vel"]');await p.click('.patTabs [data-pt="seq"]');await p.click('.patTabs [data-pt="grid"]');
 const m2=await p.evaluate(()=>[...document.querySelectorAll('#drumEditor [data-mode]')].filter(b=>b.classList.contains('on')).map(b=>b.dataset.mode).join());
 ok(m2==='vel','2. switching tabs keeps the drum grid\'s tap mode ('+m2+')');

 // ---- 3. segmented rows ----
 await p.click('.patTabs [data-pt="seq"]');await p.waitForTimeout(150);
 const seg=await p.evaluate(()=>{const out=[];
   for(const row of document.querySelectorAll('.patTabs,#seqPanel .sqBar,#drumEditor .deLen,#drumEditor .deMode')){
     const bs=[...row.querySelectorAll('button')].filter(b=>!b.classList.contains('sqOn'));
     const tr=bs[0]&&bs[0].parentElement;const same=bs.every(b=>b.parentElement===tr)&&tr&&tr.classList.contains('segT');
     let gap=0;const vb=bs.filter(b=>b.checkVisibility());
     for(let i=1;i<vb.length;i++){const a=vb[i-1].getBoundingClientRect(),c=vb[i].getBoundingClientRect();if(Math.abs(a.top-c.top)<2)gap=Math.max(gap,c.left-a.right);}
     const h=Math.min(...vb.map(b=>b.getBoundingClientRect().height));
     out.push({row:(row.getAttribute('aria-label')||row.className).slice(0,20),same,gap:+gap.toFixed(1),h:Math.round(h),vis:vb.length});}
   return out;});
 const segBad=seg.filter(s=>s.vis&&(!s.same||s.gap>2||s.h<44));
 ok(seg.length>=8&&segBad.length===0,'3. every option row is one segmented track, buttons <= 2 px apart, 44 px+ ('+seg.length+' rows'+(segBad.length?'; bad: '+JSON.stringify(segBad):'')+')');

 // ---- 4. tempo ----
 await p.evaluate(()=>setBpm(100));
 const nb=await p.$('#bpmNum');const bx=await nb.boundingBox();const cx=bx.x+bx.width/2,cy=bx.y+bx.height/2;
 await p.mouse.move(cx,cy);await p.mouse.down();for(let i=1;i<=8;i++)await p.mouse.move(cx,cy-5*i);await p.mouse.up();
 const up=await p.evaluate(()=>({bpm:S.bpm,box:+document.getElementById('bpmNum').value,focus:document.activeElement&&document.activeElement.id}));
 ok(up.bpm>=108&&up.bpm<=112&&up.box===up.bpm,'4. dragging the tempo up 40 px raises it 8-12 BPM (100 -> '+up.bpm+', box '+up.box+')');
 ok(up.focus!=='bpmNum','4. and a drag does not start typing (focus '+up.focus+')');
 await p.mouse.move(cx,cy);await p.mouse.down();for(let i=1;i<=40;i++)await p.mouse.move(cx,cy+20*i);await p.mouse.up();
 const dn=await p.evaluate(()=>S.bpm);
 ok(dn===40,'4. dragging down lowers it, and stops at 40 ('+dn+')');
 await p.mouse.move(cx,cy);await p.mouse.down();for(let i=1;i<=40;i++)await p.mouse.move(cx,cy-20*i);await p.mouse.up();
 const tp=await p.evaluate(()=>S.bpm);
 ok(tp===220,'4. dragging up stops at 220 ('+tp+')');
 await p.evaluate(()=>setBpm(40));
 await p.mouse.move(cx,cy);await p.mouse.wheel(0,-100);await p.waitForTimeout(100);
 const wh=await p.evaluate(()=>S.bpm);
 ok(wh===41,'4. a wheel notch up steps it by 1 ('+wh+')');
 await p.mouse.click(cx,cy);await p.waitForTimeout(100);
 await p.keyboard.press('Control+A');await p.keyboard.type('133');await p.keyboard.press('Enter');await p.waitForTimeout(100);
 const ty=await p.evaluate(()=>S.bpm);
 ok(ty===133,'4. a tap without a drag lets you type a tempo (133 -> '+ty+')');
 const tf=await p.evaluate(()=>{const n=document.getElementById('bpmNum'),t=document.getElementById('sbTap'),u=document.querySelector('.segT>button');   /* the app's text buttons (the strip's undo/redo are icons, weight 400) */
   return {app:getComputedStyle(n).appearance,tw:getComputedStyle(t).fontWeight,uw:u?getComputedStyle(u).fontWeight:'?',tfam:getComputedStyle(t).fontFamily,nfam:getComputedStyle(n).fontFamily};});
 ok(tf.app==='textfield','4. no spinner arrows on the tempo box (appearance '+tf.app+')');
 ok(+tf.tw>=700&&tf.tw===tf.uw,'4. TAP is as bold as the strip\'s other buttons (weight '+tf.tw+', undo '+tf.uw+')');

 // ---- 5. the mixer ----
 await p.click('#mixRows .mixRow[data-k="bass"] .mixM');await p.click('#mixRows .mixRow[data-k="chords"] .mixS');await p.waitForTimeout(250);
 const mx=await p.evaluate(()=>{const cs=(s,ps)=>getComputedStyle(document.querySelector(s),ps||null);
   const bg=s=>{const v=cs(s).backgroundImage;const m=v.match(/rgba?\([^)]+\)/g);return m?m[m.length-1]:cs(s).backgroundColor;};
   return {m:bg('#mixRows .mixRow[data-k="bass"] .mixM'),s:bg('#mixRows .mixRow[data-k="chords"] .mixS'),
     mText:document.querySelector('#mixRows .mixRow[data-k="bass"] .mixM').textContent,
     parts:[...document.querySelectorAll('#mixRows .mixRow')].map(r=>getComputedStyle(r.querySelector('b'),'::before').backgroundColor)};});
 const mh=hueOf(mx.m),sh=hueOf(mx.s),ph=mx.parts.map(hueOf);
 ok(mh>=200&&mh<=260&&mx.mText==='mute','5. a pressed mute is blue / periwinkle and still says mute (hue '+Math.round(mh)+')');
 ok(sh>=40&&sh<=60,'5. a pressed solo is yellow (hue '+Math.round(sh)+')');
 let minD=360;for(let i=0;i<ph.length;i++)for(let j=i+1;j<ph.length;j++)minD=Math.min(minD,hd(ph[i],ph[j]));
 ok(ph.length===4&&ph.every(h=>h>=0)&&minD>=30,'5. each part has its own colour, at least 30 deg apart ('+ph.map(Math.round).join(', ')+')');
 await p.click('#mixRows .mixRow[data-k="bass"] .mixM');await p.click('#mixRows .mixRow[data-k="chords"] .mixS');

 // ---- 6. the first screen ----
 const fs=await p.evaluate(()=>{const g=document.getElementById('grooveT'),card=g&&g.closest('.card');
   const tc=document.getElementById('timingCard');
   const loose=[...document.querySelectorAll('aside .row')].filter(r=>!r.closest('.card')).map(r=>r.textContent.trim().slice(0,20));
   return {loose,qIn:!!document.getElementById('quantT').closest('#timingCard'),inPattern:!!(card&&card.querySelector('#padWrap')),timingVis:!!(tc&&tc.checkVisibility()),timingFold:!!(tc&&tc.closest('#advReveal')),adv:document.getElementById('advReveal').open};});
 ok(fs.qIn&&fs.loose.length===0,'6. every row of the side column sits in a card, quantize in Timing ('+(fs.loose.join(' | ')||'none loose')+')');
 ok(fs.inPattern,'6. Groove sits in the Pattern card (the pattern\'s feel)');
 ok(fs.timingFold&&!fs.timingVis&&!fs.adv,'6. Timing (quantize) waits under "more settings" (in the fold '+fs.timingFold+', shown '+fs.timingVis+')');
 ok(errs.length===0,'no page errors ('+errs.slice(0,2).join(' | ')+')');
 await ctx.close();
 for(const w of [360,390,1280,1440]){const c2=await b.newContext({viewport:{width:w,height:w<500?800:900}});await c2.addInitScript(init);
   const q=await c2.newPage();await q.goto(URL);await q.waitForTimeout(2000);
   const sx=await q.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   ok(sx<=0,'6. no sideways page scroll at '+w+' px ('+sx+' px over)');await c2.close();}
 await b.close();
 console.log(FAIL.length?'\n'+FAIL.length+' FAILURE(S)':'\nstudio: tabs, rows, tempo, mixer and first screen all hold');process.exit(FAIL.length?1:0);})();

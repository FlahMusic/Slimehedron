// ============================================================================================
//  THE STAFF GATE.
//  A staff that is a picture of a staff is worthless -- the lines have to mean what they mean. This
//  checks the notation itself: that each note lands on the line or space a musician would expect,
//  that middle C gets its ledger line, that stems flip at the middle line, and that the lesson
//  cannot be cleared by tapping the same place every time.
//  Run: node dev-staff.js   (needs python3 -m http.server 8765)
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
// where each note of C major actually belongs in the treble clef
const TRUTH=[
  {n:'C4',where:'ledger below'},{n:'D4',where:'space below'},{n:'E4',where:'line 1'},
  {n:'F4',where:'space'},      {n:'G4',where:'line 2'},      {n:'A4',where:'space'},
  {n:'B4',where:'line 3'},     {n:'C5',where:'space'}];
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--autoplay-policy=no-user-gesture-required']});
const ctx=await b.newContext({viewport:{width:1100,height:820}});
const p=await ctx.newPage();
p.on('pageerror',e=>{FAIL.push('pageerror: '+e.message);console.log('  FAIL  pageerror: '+e.message);});
await p.goto('http://127.0.0.1:8765/index.html?l=staff');
await p.waitForTimeout(3200);

const geo=await p.evaluate(()=>{
  const lines=[...document.querySelectorAll('.stLine')].map(l=>+l.getAttribute('y1')).sort((a,b)=>a-b);
  const gap=lines[1]-lines[0];
  return {lines,gap,clef:!!document.querySelector('.stClef'),
    hits:[...document.querySelectorAll('.stHit')].map(h=>({st:+h.dataset.st,
      y:+h.getAttribute('y')+(+h.getAttribute('height'))/2,
      h:+h.getAttribute('height')}))};});
ok(geo.lines.length===5,'a staff has five lines ('+geo.lines.length+')');
ok(geo.clef,'and a clef');
ok(geo.hits.length===8,'there are eight places to tap, middle C up to the next C ('+geo.hits.length+')');

const L=geo.lines, gap=geo.gap;
const classify=(y)=>{
  const i=L.indexOf(y);
  if(i>=0)return 'line '+(5-i);
  if(y===L[4]+gap)return 'ledger below';
  if(y>L[4])return 'space below';
  if(y<L[0])return 'above';
  return 'space';};
let wrong=[];
geo.hits.sort((a,b)=>a.st-b.st).forEach((h,i)=>{
  const got=classify(h.y), want=TRUTH[i].where;
  if(got!==want)wrong.push(TRUTH[i].n+': expected '+want+', got '+got);});
ok(wrong.length===0,'every note sits where a musician would read it'+(wrong.length?' — '+wrong.join('; '):''));
geo.hits.sort((a,b)=>a.st-b.st).forEach((h,i)=>console.log('    '+TRUTH[i].n.padEnd(3)+' '+classify(h.y)));

// the tap targets must not overlap or a child aiming at G could score F
const ys=geo.hits.map(h=>h.y).sort((a,b)=>a-b);
let minGap=1e9;for(let i=1;i<ys.length;i++)minGap=Math.min(minGap,ys[i]-ys[i-1]);
ok(minGap>=gap/2,'the tap zones are a half-space apart and do not overlap ('+minGap+' vs '+(gap/2)+')');
const tapPx=await p.evaluate(()=>{const r=document.querySelector('.stHit').getBoundingClientRect();
  return {w:Math.round(r.width),h:Math.round(r.height)};});
console.log('    tap target on screen: '+tapPx.w+'x'+tapPx.h+'px');

// stems: up below the middle line, down on or above it
const stems=await p.evaluate(async()=>{
  const out=[];
  for(let k=0;k<26;k++){
    const st=window._labHintDeg;
    const g=document.querySelector('.stNote');
    if(g){const e=g.querySelector('ellipse'),r=g.querySelector('rect');
      if(e&&r)out.push({st,down:(+r.getAttribute('y'))>(+e.getAttribute('cy'))});}
    const hit=document.querySelector('.stHit[data-st="'+st+'"]');
    if(hit)hit.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
    await new Promise(r=>setTimeout(r,330));
  }
  return out;});
const bad=stems.filter(x=>x.down!==(x.st>=6));
ok(stems.length>6,'we saw enough notes to judge stems ('+stems.length+')');
ok(bad.length===0,'stems flip at the middle line'+(bad.length?' — wrong on steps '+[...new Set(bad.map(x=>x.st))].join(','):''));

// and it cannot be beaten by tapping one spot
const p2=await ctx.newPage();
await p2.goto('http://127.0.0.1:8765/index.html?l=staff');
await p2.waitForTimeout(3000);
const cheat=await p2.evaluate(async()=>{
  let right=0,n=20;
  for(let k=0;k<n;k++){
    const want=window._labHintDeg;
    const h=document.querySelector('.stHit[data-st="4"]');   // always tap G
    if(want===4)right++;
    if(h)h.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
    await new Promise(r=>setTimeout(r,330));}
  return Math.round(right/n*100);});
ok(cheat<40,'tapping the same line every time does not clear it ('+cheat+'%)');

// ---- READING A MELODY: the lesson that used to claim "you played a tune off the page" while
// containing no pitches at all. It must show a real tune, in order, and refuse a wrong note.
const p3=await ctx.newPage();
p3.on('pageerror',e=>{FAIL.push('melody pageerror: '+e.message);});
await p3.goto('http://127.0.0.1:8765/index.html?l=melody');
await p3.waitForTimeout(3200);
const m=await p3.evaluate(()=>({
  notes:document.querySelectorAll('.stNote').length,
  now:document.querySelectorAll('.stNote.now').length,
  keys:[...document.querySelectorAll('.stKey')].map(k=>k.textContent),
  title:(document.querySelector('.lgSay')||{}).textContent||'',
  keyPx:(()=>{const r=document.querySelector('.stKey');const b=r.getBoundingClientRect();
    return {w:Math.round(b.width),h:Math.round(b.height)};})()}));
ok(m.notes>=3&&m.notes<=6,'one short phrase is on screen, not a wall of notes ('+m.notes+')');
ok(m.now===1,'exactly one note is marked as the one to play');
ok(m.keys.join('')==='CDEFGABC','the keys are the musical alphabet ('+m.keys.join(' ')+')');
ok(/Hot Cross Buns|Mary|Ode to Joy/.test(m.title),'it names a real tune ("'+m.title+'")');
ok(m.keyPx.h>=44,'the keys are a 44px target ('+m.keyPx.w+'x'+m.keyPx.h+'px)');

// a wrong note must NOT advance the tune
const wrongStays=await p3.evaluate(async()=>{
  const before=document.querySelectorAll('.stNote.done').length;
  const nowEl=document.querySelector('.stNote.now');
  // find which key is correct by trying the one that is NOT under the cursor
  const keys=[...document.querySelectorAll('.stKey')];
  // deliberately press a key we know is wrong for a 3-note C-major phrase: the top C
  keys[7].dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
  await new Promise(r=>setTimeout(r,300));
  return {before,after:document.querySelectorAll('.stNote.done').length,
    fed:(document.getElementById('lgFeed')||{}).textContent||''};});
ok(wrongStays.after===wrongStays.before,'a wrong note does not move the cursor on');
ok(wrongStays.fed.length>0,'and it says something rather than failing silently');

// reading the whole phrase correctly must complete it
const played=await p3.evaluate(async()=>{
  // read the phrase off the staff itself: sort note heads by x, map y back to a step
  const svg=document.querySelector('.stSvg');
  const heads=[...document.querySelectorAll('.stNote ellipse')]
    .map(e=>({x:+e.getAttribute('cx'),y:+e.getAttribute('cy')})).sort((a,b)=>a.x-b.x);
  const lines=[...document.querySelectorAll('.stLine')].map(l=>+l.getAttribute('y1')).sort((a,b)=>a-b);
  const half=(lines[1]-lines[0])/2;
  const steps=heads.map(h=>Math.round((lines[4]-h.y)/half)+2);
  let okAll=true;
  for(const st of steps){
    const k=document.querySelector('.stKey[data-st="'+st+'"]');
    if(!k){okAll=false;break;}
    k.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
    await new Promise(r=>setTimeout(r,320));}
  return {steps,okAll,dots:document.querySelectorAll('.lgDots i.got').length};});
ok(played.okAll,'every note of the phrase maps to a key ('+played.steps.join(',')+')');
ok(played.dots>=1,'reading the phrase correctly completes it ('+played.dots+' done)');

await b.close();
console.log(FAIL.length?'\n'+FAIL.length+' FAILURE(S)':'\nthe staff is real notation, and the melody lesson reads a real tune');
process.exit(FAIL.length?1:0);})();

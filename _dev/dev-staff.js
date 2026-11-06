// ============================================================================================
//  THE STAFF GATE.
//  A staff that is a picture of a staff is worthless -- the lines have to mean what they mean. This
//  checks the notation itself: that each note lands on the line or space a musician would expect,
//  that middle C gets its ledger line, that stems flip at the middle line, and that the lesson
//  cannot be cleared by tapping the same place every time.
//  Run: node dev-staff.js   (needs python3 -m http.server 8765)
// ============================================================================================
const {launch}=require('./browser');   // one place decides where Chromium is - see _dev/browser.js
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
// The explore screen comes first now (Orff stage two): a lesson opens with its notes playable and
// nothing scored, and the child presses "ask me questions" when they are ready. A driver has to do
// the same thing a child does. Pressing it when it is not there is a no-op, so this is safe to call
// after opening any unit.
const askQuestions=async(page)=>{
  try{await page.evaluate(()=>{ if(window._lab_ready)window._lab_ready(); });}catch(e){}
  // WAIT FOR THE QUESTION, not for a guessed number of milliseconds. A roaming lesson sounds the
  // tonic first and only plays the question ~820ms later, so a fixed short wait read the screen
  // mid-anchor and made a working lesson look like it had asked an unanswerable one-note question.
  for(let i=0;i<40;i++){
    // Poll ONLY for a real question. An earlier version also broke out when the ready button had
    // gone, which is true the instant the gate opens - so it read the screen 344ms before the
    // anchored question actually sounded and a working lesson looked like it asked a one-note
    // question with no answer.
    const asked=await page.evaluate(()=>{
      try{ return window._labHintDeg!=null||window._labExpect!=null; }catch(e){return false;}
    }).catch(()=>false);
    if(asked)break;
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(900);   // a roaming lesson sounds the tonic, THEN the question 820ms later
};

// where each note of C major actually belongs in the treble clef
const TRUTH=[
  {n:'C4',where:'ledger below'},{n:'D4',where:'space below'},{n:'E4',where:'line 1'},
  {n:'F4',where:'space'},      {n:'G4',where:'line 2'},      {n:'A4',where:'space'},
  {n:'B4',where:'line 3'},     {n:'C5',where:'space'}];
(async()=>{
const b=await launch();
const ctx=await b.newContext({viewport:{width:1100,height:820}});
const p=await ctx.newPage();
p.on('pageerror',e=>{FAIL.push('pageerror: '+e.message);console.log('  FAIL  pageerror: '+e.message);});
await p.goto('http://127.0.0.1:8765/index.html?l=staff');
await p.waitForTimeout(3200);await askQuestions(p);

// FIVE LINES IS READING NOW (Flah's logic pass, rule 1): the note is drawn and the kid presses its letter. So each
// note's place is read off the drawn note itself, over enough rounds to see all eight.
const geo=await p.evaluate(async()=>{
  const lines=[...document.querySelectorAll('.stLine')].map(l=>+l.getAttribute('y1')).sort((a,b)=>a-b);
  const seen={},stems=[];const kr=document.querySelector('.stKey').getBoundingClientRect(),clef0=!!document.querySelector('.stClef'),keys0=document.querySelectorAll('.stKey').length;
  for(let k=0;k<60&&Object.keys(seen).length<8;k++){
    if(document.querySelector('.lgDone')){document.querySelector('[data-a2="again"]').click();await new Promise(r=>setTimeout(r,900));}   // 5 rounds a run: again
    const st=window._labHintDeg,g=document.querySelector('.stNote');
    if(g&&st!=null){const e=g.querySelector('ellipse'),r=g.querySelector('rect');seen[st]=+e.getAttribute('cy');
      if(r)stems.push({st,down:(+r.getAttribute('y'))>(+e.getAttribute('cy'))});}
    const key=document.querySelector('.stKey[data-st="'+st+'"]');
    if(key)key.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));
    await new Promise(r=>setTimeout(r,900));}

  return {lines,gap:lines[1]-lines[0],clef:clef0,seen,stems,keys:keys0,key:{w:kr.width,h:kr.height}};});
ok(geo.lines.length===5,'a staff has five lines ('+geo.lines.length+')');
ok(geo.clef,'and a clef');
ok(geo.keys===8&&geo.key.w>=44&&geo.key.h>=44,'eight letters to press, middle C up to the next C, each big enough ('+geo.keys+', '+Math.round(geo.key.w)+'x'+Math.round(geo.key.h)+')');
ok(Object.keys(geo.seen).length===8,'all eight notes came up ('+Object.keys(geo.seen).length+')');

const L=geo.lines, gap=geo.gap;
const classify=(y)=>{
  const i=L.indexOf(y);
  if(i>=0)return 'line '+(5-i);
  if(y===L[4]+gap)return 'ledger below';
  if(y>L[4])return 'space below';
  if(y<L[0])return 'above';
  return 'space';};
let wrong=[];
for(let i=0;i<8;i++){const y=geo.seen[i];if(y==null)continue;const got=classify(y),want=TRUTH[i].where;
  if(got!==want)wrong.push(TRUTH[i].n+': expected '+want+', got '+got);
  console.log('    '+TRUTH[i].n.padEnd(3)+' '+got);}
ok(wrong.length===0,'every note sits where a musician would read it'+(wrong.length?' — '+wrong.join('; '):''));

// stems: up below the middle line, down on or above it
const bad=geo.stems.filter(x=>x.down!==(x.st>=6));
ok(geo.stems.length>6,'we saw enough notes to judge stems ('+geo.stems.length+')');
ok(bad.length===0,'stems flip at the middle line'+(bad.length?' — wrong on steps '+[...new Set(bad.map(x=>x.st))].join(','):''));

// and it cannot be beaten by pressing one letter
const p2=await ctx.newPage();
await p2.goto('http://127.0.0.1:8765/index.html?l=staff');
await p2.waitForTimeout(3000);
const cheat=await p2.evaluate(async()=>{
  let right=0,n=20;
  for(let k=0;k<n;k++){
    const want=window._labHintDeg;
    const h=document.querySelector('.stKey[data-st="4"]');   // always press G
    if(document.querySelector('.lgDone')){document.querySelector('[data-a2="again"]').click();await new Promise(r=>setTimeout(r,900));k--;continue;}
    if(want===4)right++;
    if(h)h.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));
    await new Promise(r=>setTimeout(r,1300));}
  return Math.round(right/n*100);});
ok(cheat<40,'pressing the same letter every time does not clear it ('+cheat+'%)');

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

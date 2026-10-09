// ============================================================================================
//  THE RECORDINGS GATE.
//  A recording is the only thing a child actually hands to anyone — a teacher, a parent, a friend.
//  So the tests are about the artifact, not the button: does the download produce a file that is
//  really audio, does the MIDI export produce files a DAW would accept, and does the share button
//  appear ONLY where the OS can genuinely take a file. A share button that quietly does something
//  else on desktop is worse than no share button.
//  Run: node dev-takes.js   (needs python3 -m http.server 8765)
// ============================================================================================
const {launch}=require('./browser');   // one place decides where Chromium is - see _dev/browser.js
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};

async function record(p,secs){
  await p.evaluate(()=>document.getElementById('recBtn').click());
  await p.waitForTimeout(secs*1000);
  await p.evaluate(()=>document.getElementById('recBtn').click());
  await p.waitForTimeout(3000);
}
(async()=>{
const b=await launch();
const ctx=await b.newContext({viewport:{width:1440,height:900}});
const p=await ctx.newPage();
p.on('pageerror',e=>{FAIL.push('pageerror: '+e.message);console.log('  FAIL  pageerror: '+e.message);});
await p.goto('http://127.0.0.1:8765/index.html?m=play');
await p.waitForTimeout(3000);
await record(p,10);

const row=await p.evaluate(()=>{const r=document.querySelector('.recItem');if(!r)return{none:true};
  return{btns:[...r.querySelectorAll('button')].map(x=>({t:x.textContent,lbl:x.getAttribute('aria-label')||x.title})),
    canShareFiles:!!(navigator.canShare&&navigator.canShare({files:[new File([new Blob(['x'])],'a.txt',{type:'text/plain'})]}))};});
ok(!row.none,'a 10-second recording appears on the shelf');
console.log('  ----   buttons: '+(row.btns||[]).map(x=>x.t+'('+x.lbl+')').join(' '));
console.log('  ----   this browser can share files: '+row.canShareFiles);

const dl=(row.btns||[]).find(x=>/download the audio/.test(x.lbl||''));
ok(!!dl,'there is a download button');
ok((row.btns||[]).some(x=>/MIDI/.test(x.lbl||'')),'the MIDI button is on the row, not just the MIDI data in the database');
const sharePresent=(row.btns||[]).some(x=>/send this recording/.test(x.lbl||''));
ok(sharePresent===row.canShareFiles,
   'the share button appears exactly when the OS can take a file (present:'+sharePresent+', supported:'+row.canShareFiles+')');

// the download must be REAL audio, not a zero-byte or html file
const [dlEvt]=await Promise.all([
  p.waitForEvent('download',{timeout:15000}).catch(()=>null),
  p.evaluate(()=>{const b=[...document.querySelectorAll('.recItem button')].find(x=>/download/.test(x.getAttribute('aria-label')||''));b.click();})]);
ok(!!dlEvt,'pressing download actually starts a download');
if(dlEvt){
  const fs=require('fs');const pth=await dlEvt.path();
  const sz=pth?fs.statSync(pth).size:0;
  const head=pth?fs.readFileSync(pth).slice(0,12):Buffer.alloc(0);
  const magic=head.slice(4,8).toString()==='ftyp'||head.slice(0,4).toString()==='RIFF'||head[0]===0x1a;
  ok(sz>20000,'the downloaded file is real audio, not an empty stub ('+sz+' bytes)');
  ok(magic,'the file starts with a real audio container signature ('+head.slice(0,8).toString('hex')+')');
  ok(/\.(m4a|wav|webm)$/.test(dlEvt.suggestedFilename()),'it is named something a human can find: '+dlEvt.suggestedFilename());
}

// MIDI: one file per part, each one a valid SMF a DAW would open
const midi=await p.evaluate(async()=>{
  const db=await recDB();
  const tk=await new Promise(r=>{const q=db.transaction('takes').objectStore('takes').getAll();q.onsuccess=()=>r(q.result[q.result.length-1]);});
  const out={};
  for(const part in (tk.midi||{})){const buf=new Uint8Array(await tk.midi[part].arrayBuffer());
    out[part]={bytes:buf.length,hdr:String.fromCharCode(...buf.slice(0,4)),trk:String.fromCharCode(...buf.slice(14,18))};}
  return{parts:out,notes:Object.keys(tk.notes||{}).filter(k=>tk.notes[k].length).length};});
const mp=Object.keys(midi.parts);
ok(mp.length>0,'the recording exported MIDI ('+mp.join(', ')+')');
ok(mp.every(k=>midi.parts[k].hdr==='MThd'&&midi.parts[k].trk==='MTrk'),'every MIDI file has a real MThd/MTrk header');
ok(mp.every(k=>midi.parts[k].bytes>40),'no MIDI file is an empty shell');

// a second take must not clobber the first
await record(p,6);
const n=await p.evaluate(()=>document.querySelectorAll('.recItem').length);
ok(n===2,'a second recording is added, not swapped in ('+n+' on the shelf)');

// ---- the phone case: where the OS CAN take a file, the share button must appear and must call
// share() with no await in front of it, or iOS refuses the sheet (the tap's activation is spent).
const ctx2=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
await ctx2.addInitScript(()=>{
  window.__shared=null;
  navigator.canShare=()=>true;
  navigator.share=(d)=>{window.__shared={files:(d.files||[]).map(f=>({n:f.name,t:f.type,s:f.size})),text:d.text};
    return Promise.resolve();};});
const m=await ctx2.newPage();
await m.goto('http://127.0.0.1:8765/index.html?m=play');
await m.waitForTimeout(3200);
await record(m,8);
const mb=await m.evaluate(()=>{const r=document.querySelector('.recItem');
  return r?[...r.querySelectorAll('button')].map(x=>x.getAttribute('aria-label')||x.title):null;});
console.log('  ----   phone buttons: '+(mb||['NONE']).join(' | '));
ok(mb&&mb.some(x=>/send this recording/.test(x)),'on a phone the share button IS there');
const sent=await m.evaluate(async()=>{
  const b=[...document.querySelectorAll('.recItem button')].find(x=>/send this recording/.test(x.getAttribute('aria-label')||''));
  b.click();await new Promise(r=>setTimeout(r,300));return window.__shared;});
ok(sent&&sent.files&&sent.files.length===1,'the share sheet is handed the audio FILE, not a link');
if(sent&&sent.files[0]){
  ok(sent.files[0].s>20000,'the shared file is the real recording ('+sent.files[0].s+' bytes)');
  ok(/audio\//.test(sent.files[0].t),'it is sent with an audio mime type ('+sent.files[0].t+')');
  ok(/slimehedron/.test(sent.text||''),'the share text points back at the app: "'+(sent.text||'')+'"');
  ok((sent.text||'').length<80,'the share text is a sentence, not a wall of URL ('+(sent.text||'').length+' chars)');
}

await b.close();
console.log(FAIL.length?'\n'+FAIL.length+' FAILURE(S)':'\nrecordings are real files a person can actually hand over');
process.exit(FAIL.length?1:0);})();

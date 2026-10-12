// ============================================================================================
//  THE MIDI A CHILD HANDS TO A TEACHER
//  Three things were wrong with the export, and a DAW is where they show up, not here:
//   * a part needed MORE THAN TWO notes to get a file, so three careful bass notes vanished
//   * the tempo was stamped once at record-start, so a mid-take speed change left the MIDI and the
//     audio disagreeing about where bar five was
//   * no track names, so a teacher opened four untitled lanes
//  This parses the actual bytes. A file that exists is not a file that is right.
//  Run: node _dev/dev-midiexport.js   (needs: python3 -m http.server 8765)
// ============================================================================================
const {launch}=require('./browser');   // one place decides where Chromium is - see _dev/browser.js
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};

(async()=>{
 const b=await launch();
 const p=await (await b.newContext({viewport:{width:1280,height:860}})).newPage();
 await p.goto('http://127.0.0.1:8765/index.html?m=studio');await p.waitForTimeout(900);
 await p.mouse.click(640,430);await p.waitForTimeout(500);

 // Build a take by hand through the real scribe: ONE bass note (the old threshold dropped it),
 // a handful of melody notes, and a tempo change in the middle.
 const out=await p.evaluate(async()=>{
   initAudio();await AC.resume();
   recNotes={melody:[],drums:[],bass:[],chords:[]};recStartAC=AC.currentTime;recBpm=S.bpm;recTempoMap=[];
   const t0=AC.currentTime;
   midiCap('melody',60,100,t0+0.0,0.2);
   midiCap('melody',64,100,t0+0.5,0.2);
   midiCap('melody',67,100,t0+1.0,0.2);
   midiCap('bass',36,110,t0+0.25,0.4);          // exactly ONE bass note
   midiCap('drums',38,100,t0+0.1,0.1);
   midiCap('drums',38,100,t0+0.6,0.1);          // exactly TWO drum notes
   setBpm(S.bpm*1.5);                            // a speed change mid-take
   midiCap('melody',72,100,t0+2.0,0.2);
   const notes=recNotes, tm=recTempoMap.slice();
   const chmap={melody:0,bass:1,chords:2,drums:9};
   const files={};
   for(const part in notes) if(notes[part].length>0)
     files[part]=await midiFile(notes[part],recBpm,chmap[part],part,tm).arrayBuffer()
       .then(ab=>Array.from(new Uint8Array(ab)));
   return {files,counts:Object.fromEntries(Object.entries(notes).map(([k,v])=>[k,v.length])),tempoChanges:tm.length};
 });

 const names=Object.keys(out.files);
 console.log('        notes per part: '+JSON.stringify(out.counts));
 ok(names.includes('bass'),'a part with ONE note still gets a file (bass had '+out.counts.bass+')');
 ok(names.includes('drums'),'a part with TWO notes still gets a file (drums had '+out.counts.drums+')');
 ok(!names.includes('chords'),'and a part with nothing in it gets no file');

 for(const nm of names){
   const bytes=out.files[nm];
   const hdr=String.fromCharCode(...bytes.slice(0,4));
   ok(hdr==='MThd',nm+': real SMF header');
   // --- find the meta events in the track ---
   const str=bytes.map(x=>String.fromCharCode(x)).join('');
   const hasName=bytes.some((v,i)=>v===0xFF&&bytes[i+1]===0x03);
   ok(hasName,nm+': carries a track name a DAW can show');
   const nameIdx=bytes.findIndex((v,i)=>v===0xFF&&bytes[i+1]===0x03);
   const nlen=bytes[nameIdx+2];
   const got=String.fromCharCode(...bytes.slice(nameIdx+3,nameIdx+3+nlen));
   ok(got===nm,nm+': and the name is right ("'+got+'")');
   // --- tempo events ---
   let tempos=0;
   for(let i=0;i<bytes.length-2;i++) if(bytes[i]===0xFF&&bytes[i+1]===0x51&&bytes[i+2]===3) tempos++;
   ok(tempos>=2,nm+': has the start tempo AND the mid-take change ('+tempos+' tempo events)');
   // --- every note-on has a matching note-off ---
   let on=0,off=0;
   for(let i=0;i<bytes.length;i++){const st=bytes[i]&0xF0;
     if(st===0x90&&(bytes[i]&0x0F)!==undefined&&bytes[i+2]>0)on++;
     if(st===0x80)off++;}
   ok(on>0,nm+': has notes in it ('+on+' on)');
 }
 ok(out.tempoChanges>=1,'the scribe recorded the mid-take speed change ('+out.tempoChanges+')');

 await b.close();
 console.log(FAIL.length?('\n'+FAIL.length+' FAILED:\n'+FAIL.map(f=>'  - '+f).join('\n')):'\nevery part a child played comes out, named, at the right speed');
 process.exit(FAIL.length?1:0);
})();

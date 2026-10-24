// ============================================================================================
//  STUDIO DAW TOOLS — the mixer, per-step loudness and chance, undo / redo, song files, autosave.
//  Every check is about what you would HEAR or GET BACK, driven through the real buttons:
//    1. mute and solo really silence a part (signal measured on the bus), volume really scales it,
//       and the melody's echo goes quiet with the melody
//    2. a step set to 25 loudness plays at a quarter of the level; a step set to 50 chance plays about
//       half the time, and 100 chance plays every time
//    3. undo takes back a drawn step, a tempo change and a mute; redo puts them back; a drag is one step
//    4. a saved song file opens back into exactly what was saved
//    5. hostile song files are refused or cleaned, never crash, never pollute the page
//    6. the beat you drew (and its loudness) is still there after a reload
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-daw.js
// ============================================================================================
const {launch}=require('./browser');
const fs=require('fs'),os=require('os'),path=require('path');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const URL='http://127.0.0.1:8765/index.html?m=studio';

(async()=>{const b=await launch();
 const ctx=await b.newContext({viewport:{width:1366,height:950},acceptDownloads:true});
 await ctx.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');localStorage.setItem('slimehedron-coach-studio','1');}catch(e){}});
 const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message);});
 await p.goto(URL);await p.waitForTimeout(1800);
 const startBand=()=>p.evaluate(async()=>{initAudio();if(AC.state!=='running')await AC.resume();
   if(typeof drumOn!=='undefined'&&!drumOn)document.getElementById('drumBtn').click();if(!S.playing)setPlaying(true);});
 await startBand();await p.waitForTimeout(800);

 // ---------------------------------------------------------------- 1. MIXER
 const rms=()=>p.evaluate(async()=>{if(!window.__an){window.__an=AC.createAnalyser();window.__an.fftSize=2048;drumBus.connect(window.__an);}
   const a=new Float32Array(2048);let e=0,n=0;const t0=performance.now();
   while(performance.now()-t0<1400){window.__an.getFloatTimeDomainData(a);for(const x of a){e+=x*x;n++;}await new Promise(r=>setTimeout(r,40));}
   return Math.sqrt(e/n);});
 const row=k=>'#mixRows .mixRow[data-k="'+k+'"]';
 const loud=await rms();
 await p.click(row('drums')+' .mixM');await p.waitForTimeout(500);
 const muted=await rms();
 ok(loud>0.004&&muted<loud*0.02,'mute really silences the drums (signal '+loud.toFixed(4)+' -> '+muted.toFixed(5)+')');
 await p.click(row('drums')+' .mixM');await p.click(row('mel')+' .mixS');await p.waitForTimeout(500);
 const soloOther=await rms();
 const g1=await p.evaluate(()=>({bass:bandMix.gain.value,pad:padBus.gain.value,mel:melBus.gain.value,quiet:document.querySelector('#mixRows .mixRow[data-k="drums"]').classList.contains('quiet')}));
 ok(soloOther<loud*0.02&&g1.bass<0.01&&g1.pad<0.01&&g1.mel>0.05,'solo melody silences drums, bass and chords and keeps the melody ('+soloOther.toFixed(5)+', bass '+g1.bass.toFixed(3)+', chords '+g1.pad.toFixed(3)+', melody '+g1.mel.toFixed(3)+')');
 ok(g1.quiet,'a part that solo has silenced looks silenced');
 await p.click(row('mel')+' .mixS');await p.waitForTimeout(500);
 const back=await rms();ok(back>loud*0.4,'un-solo brings the drums back ('+back.toFixed(4)+')');
 const full=await p.evaluate(()=>drumBus.gain.value);
 await p.$eval(row('drums')+' input',el=>{el.value=50;el.dispatchEvent(new Event('input',{bubbles:true}));});await p.waitForTimeout(700);
 const half=await p.evaluate(()=>drumBus.gain.value);
 ok(Math.abs(half/full-0.5)<0.03,'drum volume 50 is half the level ('+(half/full).toFixed(3)+')');
 await p.$eval(row('drums')+' input',el=>{el.value=100;el.dispatchEvent(new Event('input',{bubbles:true}));});
 // the echo is measured where it is made: the delay line itself, while melody notes are played
 const echoE=()=>p.evaluate(async()=>{if(!window.__ea){window.__ea=AC.createAnalyser();window.__ea.fftSize=2048;delayNode.connect(window.__ea);}
   S.fxOn=true;const a=new Float32Array(2048);let e=0,n=0;
   for(let k=0;k<6;k++){try{trigger(k%5,0.9,0,true);}catch(err){}
     for(let j=0;j<5;j++){await new Promise(r=>setTimeout(r,40));window.__ea.getFloatTimeDomainData(a);for(const x of a){e+=x*x;n++;}}}
   return Math.sqrt(e/n);});
 const echoOn=await echoE();
 await p.click(row('mel')+' .mixM');await p.waitForTimeout(4000);   // let the earlier echoes die away first
 const echoOff=await echoE();
 ok(echoOn>0.001&&echoOff<echoOn*0.03,'muting the melody also silences its echo (delay line '+echoOn.toFixed(4)+' -> '+echoOff.toFixed(5)+')');
 await p.click(row('mel')+' .mixM');

 // ---------------------------------------------------------------- 2. LOUDNESS + CHANCE
 await p.evaluate(()=>{drumKit='pop';const k=editableKit();for(const v in k)k[v]=[];k.K=[0,16,32,48];k.h=[];for(let i=0;i<64;i++)k.h.push(i);
   KIT_BARS.pop=1;PAD.x=0.5;PAD.y=0.5;window._rebuildStepGrid();setBpm(200);
   window.__hits=[];const d=dHit;window.__realHit=d;dHit=function(v,t,a,solid,inBar){window.__hits.push({v,a,inBar});return d.apply(this,arguments);};});
 const collect=async ms=>{await p.evaluate(()=>{window.__hits=[];});await p.waitForTimeout(ms);return p.evaluate(()=>window.__hits.slice());};
 const med=a=>{const s=a.slice().sort((x,y)=>x-y);return s[s.length>>1];};
 let h=await collect(5000);
 const kFull=med(h.filter(x=>x.v==='K'&&x.inBar===0).map(x=>x.a));
 const hatFull=h.filter(x=>x.v==='h'&&x.inBar<10).length,stepsFull=h.filter(x=>x.v==='K'&&x.inBar===0).length*10;
 await p.click('.deMode button[data-mode="vel"]');
 for(let i=0;i<3;i++)await p.click('#stepGrid .sgCell[data-v="K"][data-i="0"]');
 const cell=await p.$eval('#stepGrid .sgCell[data-v="K"][data-i="0"]',el=>({vt:el.dataset.vt,w:parseFloat(getComputedStyle(el,'::after').width),lbl:el.getAttribute('aria-label')}));
 ok(cell.vt==='25'&&/loudness 25/.test(cell.lbl),'three taps in loudness mode set the step to 25, and it says so ('+cell.vt+', "'+cell.lbl+'")');
 const wOn=await p.$eval('#stepGrid .sgCell[data-v="h"][data-i="0"]',el=>parseFloat(getComputedStyle(el,'::after').width));
 ok(cell.w<wOn-3,'a quiet step has a smaller dot ('+cell.w+'px vs '+wOn+'px)');
 h=await collect(5000);
 const kQ=med(h.filter(x=>x.v==='K'&&x.inBar===0).map(x=>x.a));
 ok(Math.abs(kQ/kFull-0.25)<0.04,'a step at loudness 25 really plays at a quarter of the level ('+(kQ/kFull).toFixed(3)+')');
 await p.click('.deMode button[data-mode="prob"]');
 for(let i=0;i<16;i++){await p.click('#stepGrid .sgCell[data-v="h"][data-i="'+i+'"]');await p.click('#stepGrid .sgCell[data-v="h"][data-i="'+i+'"]');}
 const pc=await p.$eval('#stepGrid .sgCell[data-v="h"][data-i="5"]',el=>({pt:el.dataset.pt,maybe:el.classList.contains('maybe')}));
 ok(pc.pt==='50%'&&pc.maybe,'two taps in chance mode set a step to 50% and it is marked');
 h=await collect(9000);
 const bars=h.filter(x=>x.v==='K'&&x.inBar===0).length,hat=h.filter(x=>x.v==='h'&&x.inBar<10).length,rate=hat/(bars*10);
 ok(hatFull>=stepsFull*0.85,'at 100% chance every step plays ('+hatFull+'/'+stepsFull+')');
 ok(bars>=6&&rate>0.35&&rate<0.65,'at 50% chance about half the steps play ('+hat+' of '+bars*10+' = '+(rate*100).toFixed(0)+'%)');
 await p.click('.deMode button[data-mode="on"]');
 await p.evaluate(()=>{dHit=window.__realHit;});

 // ---------------------------------------------------------------- 3. UNDO / REDO
 await p.click('#stepRevert');await p.waitForTimeout(600);
 const cellSel='#stepGrid .sgCell[data-v="s"][data-i="2"]';
 const st=()=>p.$eval(cellSel,el=>el.getAttribute('aria-pressed'));
 const before=await st();
 await p.click(cellSel);await p.waitForTimeout(650);
 const drawn=await st();
 await p.keyboard.press('Control+z');await p.waitForTimeout(250);
 const undone=await st();
 await p.keyboard.press('Control+Shift+z');await p.waitForTimeout(250);
 const redone=await st();
 ok(drawn!==before&&undone===before&&redone===drawn,'ctrl+z takes back a drawn step and ctrl+shift+z puts it back ('+[before,drawn,undone,redone].join(' > ')+')');
 const bpm0=await p.evaluate(()=>S.bpm);
 await p.$eval('#bpmTop',el=>{el.value=+el.value+30;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
 await p.mouse.click(5,5);await p.waitForTimeout(650);
 const bpm1=await p.evaluate(()=>S.bpm);
 await p.click('#undoBtn');await p.waitForTimeout(300);
 const bpm2=await p.evaluate(()=>S.bpm);
 ok(bpm1!==bpm0&&bpm2===bpm0,'the undo button takes back a tempo change ('+bpm0+' > '+bpm1+' > '+bpm2+')');
 await p.click('#redoBtn');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>S.bpm)===bpm1,'redo puts the tempo back');
 await p.click(row('bass')+' .mixM');await p.waitForTimeout(650);
 await p.keyboard.press('Control+z');await p.waitForTimeout(500);
 const mb=await p.evaluate(()=>({m:MIX.bass.m,g:bandMix.gain.value,pr:document.querySelector('#mixRows .mixRow[data-k="bass"] .mixM').getAttribute('aria-pressed')}));
 ok(!mb.m&&mb.pr==='false'&&mb.g>0.05,'undo un-mutes the bass and you hear it again (gain '+mb.g.toFixed(3)+')');
 const d0=await p.evaluate(()=>window._song.depth());
 const box=await p.$eval(row('chords')+' input',el=>{const r=el.getBoundingClientRect();return {x:r.left,y:r.top+r.height/2,w:r.width};});
 await p.mouse.move(box.x+box.w*0.9,box.y);await p.mouse.down();for(let i=0;i<20;i++)await p.mouse.move(box.x+box.w*(0.9-i*0.03),box.y);await p.mouse.up();
 await p.waitForTimeout(650);
 const d1=await p.evaluate(()=>window._song.depth());
 ok(d1.idx-d0.idx===1,"a whole drag on a fader is one undo step ("+(d1.idx-d0.idx)+")");
 // a text box keeps its own ctrl+z
 await p.focus('#bpmNum');const dd=await p.evaluate(()=>window._song.depth());await p.keyboard.press('Control+z');await p.waitForTimeout(200);
 ok(JSON.stringify(await p.evaluate(()=>window._song.depth()))===JSON.stringify(dd),'ctrl+z inside the tempo box is left to the box');
 await p.mouse.click(5,5);

 // ---------------------------------------------------------------- 4. SAVE / OPEN
 await p.click('#stepRevert');await p.click(cellSel);
 await p.click('.deMode button[data-mode="vel"]');await p.click(cellSel);await p.click('.deMode button[data-mode="on"]');
 await p.click(row('drums')+' .mixS');
 await p.evaluate(()=>{CHORD_MODE.prog=[{pc:2,qual:'min',bars:1},{pc:7,qual:'maj',bars:2}];CHORD_MODE.on=true;cmSave();window._cpRefresh();});
 await p.waitForTimeout(500);
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#songSave')]);
 const fpath=path.join(os.tmpdir(),'dev-daw-song.slime');await dl.saveAs(fpath);
 const saved=JSON.parse(fs.readFileSync(fpath,'utf8'));
 ok(saved.app==='slimehedron'&&saved.kind==='song'&&saved.version===1,'save song downloads a song file ('+dl.suggestedFilename()+')');
 const want=await p.evaluate(()=>({s:activeKit().s.slice(),vel:stepVel('s',2),solo:MIX.drums.s,prog:JSON.stringify(CHORD_MODE.prog),bpm:S.bpm,kit:drumKit}));
 await p.click('#stepRevert');await p.click(row('drums')+' .mixS');
 await p.evaluate(()=>{CHORD_MODE.prog=[];CHORD_MODE.on=false;cmSave();window._cpRefresh();setBpm(97);});
 await p.waitForTimeout(300);
 await p.setInputFiles('#songFile',fpath);await p.waitForTimeout(900);
 const got=await p.evaluate(()=>({s:activeKit().s.slice(),vel:stepVel('s',2),solo:MIX.drums.s,prog:JSON.stringify(CHORD_MODE.prog),bpm:S.bpm,kit:drumKit,note:document.getElementById('songNote').textContent,
   cell:document.querySelector('#stepGrid .sgCell[data-v="s"][data-i="2"]').getAttribute('aria-pressed')}));
 ok(JSON.stringify(got.s)===JSON.stringify(want.s)&&got.vel===want.vel&&got.cell==='true','opening the song brings the drawn beat back, with its loudness ('+got.vel+')');
 ok(got.solo===want.solo&&got.prog===want.prog,'and the mixer and the chords');
 ok(got.bpm===want.bpm&&got.kit===want.kit,'and the tempo and the kit ('+got.bpm+' bpm, '+got.kit+')');
 ok(/opened/.test(got.note),'it says the song opened ("'+got.note+'")');
 await p.keyboard.press('Control+z');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>S.bpm)===97,'opening a song can be undone');
 await p.keyboard.press('Control+Shift+z');await p.waitForTimeout(500);

 // ---------------------------------------------------------------- 5. HOSTILE FILES
 const before5=await p.evaluate(()=>window._song.key());   // the key leaves out the sliders the slime moves by itself
 const tryFile=async(name,text)=>{await p.setInputFiles('#songFile',{name,mimeType:'application/json',buffer:Buffer.from(text)});await p.waitForTimeout(400);
   return p.evaluate(()=>document.getElementById('songNote').textContent);};
 ok(/not a slimehedron song/.test(await tryFile('a.slime','this is not json {')),'a broken file is refused in plain words');
 ok(/not a slimehedron song/.test(await tryFile('b.json','{"app":"other","kind":"song","version":1}')),'a file from something else is refused');
 ok(/newer/.test(await tryFile('c.slime','{"app":"slimehedron","kind":"song","version":99}')),'a song from a newer version says so');
 ok(/too big/.test(await tryFile('d.slime','{"app":"slimehedron","kind":"song","version":1,"x":"'+'a'.repeat(260*1024)+'"}')),'a huge file is refused before it is read');
 {const after5=await p.evaluate(()=>window._song.key());const dif=[];
  const walk=(x,y,pth)=>{if(JSON.stringify(x)===JSON.stringify(y))return;if(!x||!y||typeof x!=='object'){dif.push(pth+': '+JSON.stringify(x)+' -> '+JSON.stringify(y));return;}
    for(const k of new Set([...Object.keys(x),...Object.keys(y)]))walk(x[k],y[k],pth+'.'+k);};
  walk(JSON.parse(before5),JSON.parse(after5),'');
  ok(dif.length===0,'none of the refused files changed anything'+(dif.length?' ('+dif.slice(0,4).join(', ')+')':''));}
 await tryFile('e.slime',JSON.stringify({app:'slimehedron',kind:'song',version:1,
   controls:{r:{bpmTop:'99999',vol:'banana',spin:'0.3'},s:{drumKit:'<img src=x onerror=alert(1)>',scale:'nope'},t:{dotT:'yes'},seg:{divSeg:42}},
   kitBars:{pop:3,rock:2,nope:1},mix:{mel:{v:5,m:'yes',s:true},drums:null},pad:{x:2,y:0.5},human:{dyn:-1,time:0.5,ghost:0.5},groove:'evil'}).replace('"kitBars"','"kitEdits":{"__proto__":{"K":[1]},"constructor":{"K":[2]},"pop":{"K":[0,999,-1,"x",3.5,4],"zz":[1]}},"stepVel":{"pop":{"K":{"0":7,"4":0.5,"-3":0.5}}},"chords":{"on":true,"prog":[{"pc":13,"qual":"maj"},{"pc":3,"qual":"__proto__"},{"pc":4,"qual":"min","bars":2}]},"kitBars"'));
 const z=await p.evaluate(()=>({pol:({}).K,polC:Object.prototype.K,popK:activeKit===undefined?null:(KIT_EDITS.pop&&KIT_EDITS.pop.K),zz:KIT_EDITS.pop&&KIT_EDITS.pop.zz,proto:Object.keys(KIT_EDITS),
   vel:STEP_VEL.pop&&STEP_VEL.pop.K,bars:JSON.stringify(KIT_BARS),mix:JSON.stringify(MIX.mel),bpm:S.bpm,kit:drumKit,prog:JSON.stringify(CHORD_MODE.prog),groove:curGroove,pad:PAD.x,human:HUMAN.dyn,img:!!document.querySelector('img[src="x"]')}));
 ok(z.pol===undefined&&z.polC===undefined&&!z.proto.includes('constructor'),'a file cannot reach the page\'s objects through __proto__ or constructor');
 ok(JSON.stringify(z.popK)==='[0,4]'&&z.zz===undefined,'impossible steps and unknown drums are dropped ('+JSON.stringify(z.popK)+')');
 ok(JSON.stringify(z.vel)==='{"4":0.5}','impossible loudness values are dropped ('+JSON.stringify(z.vel)+')');
 ok(z.bars==='{"rock":2}','impossible pattern lengths and unknown kits are dropped ('+z.bars+')');
 ok(z.mix==='{"v":1,"m":false,"s":true}','a broken mixer entry falls back to full volume, unmuted ('+z.mix+')');
 ok(z.bpm!==99999&&z.kit!=='<img src=x onerror=alert(1)>'&&!z.img,'impossible tempo and kit names are ignored ('+z.bpm+', '+z.kit+')');
 ok(z.prog==='[{"pc":4,"qual":"min","bars":2}]','only real chords come through ('+z.prog+')');
 ok(z.groove!=='evil'&&z.pad!==2&&z.human!==-1,'feel, pad and humanize ignore impossible values');

 // ---------------------------------------------------------------- 6. AUTOSAVE
 await p.click('#stepRevert');await p.click(cellSel);
 await p.click('.deMode button[data-mode="vel"]');await p.click(cellSel);await p.click(cellSel);await p.click('.deMode button[data-mode="on"]');
 await p.click(row('bass')+' .mixM');
 await p.waitForTimeout(1200);
 const pre=await p.evaluate(()=>({kit:drumKit,s:activeKit().s.slice(),vel:stepVel('s',2),mute:MIX.bass.m}));
 await p.reload();await p.waitForTimeout(2000);
 const post=await p.evaluate(()=>({kit:drumKit,s:activeKit().s.slice(),vel:stepVel('s',2),mute:MIX.bass.m,cell:document.querySelector('#stepGrid .sgCell[data-v="s"][data-i="2"]').getAttribute('aria-pressed'),
   mbtn:document.querySelector('#mixRows .mixRow[data-k="bass"] .mixM').getAttribute('aria-pressed')}));
 ok(post.kit===pre.kit&&JSON.stringify(post.s)===JSON.stringify(pre.s)&&post.cell==='true','the beat you drew is still there after a reload');
 ok(post.vel===pre.vel&&pre.vel===0.5,'and so is its loudness ('+post.vel+')');
 ok(post.mute===true&&post.mbtn==='true','and the mixer');
 ok(await p.evaluate(()=>document.getElementById('undoBtn').disabled),'a fresh page has nothing to undo');

 // the studio mixer stays in studio: a part muted there is not silently missing in play
 await p.evaluate(async()=>{initAudio();await AC.resume();initDrums();});
 const room=await p.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));MIX.drums.m=true;applyMix();await w(600);const st=drumBus.gain.value;
   applyMode('play');await w(600);const pl=drumBus.gain.value;applyMode('studio');await w(600);const st2=drumBus.gain.value;MIX.drums.m=false;applyMix();return {st,pl,st2};});
 ok(room.st<0.01&&room.pl>0.05&&room.st2<0.01,'drums muted in studio still play in play, and are muted again back in studio ('+room.st.toFixed(3)+' / '+room.pl.toFixed(3)+' / '+room.st2.toFixed(3)+')');
 ok(errs.length===0,'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'daw tools all pass'));
 process.exit(FAIL.length?1:0);})();

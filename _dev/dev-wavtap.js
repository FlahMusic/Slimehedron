// ============================================================================================
//  THE WAV TAP RUNS OFF THE MAIN THREAD, AND STILL WORKS WHEN IT CANNOT.
//  iOS (and anything without MediaRecorder) records by capturing raw PCM and writing the WAV here.
//  That capture used a ScriptProcessorNode, which is deprecated AND runs its callback on the main
//  thread: every ~93ms the recording waits for whatever the page is doing, so a busy moment punches
//  a hole in the take. It is an AudioWorklet now, which runs on the audio thread.
//  The worklet module is handed over as a blob: URL - refused under a strict Content-Security-Policy,
//  which this app does not set but a school self-hosting it under the GPL might - so the old path
//  stays as the fallback. Both are proven here, and both must produce a real WAV.
//  Run: node _dev/dev-wavtap.js   (needs: python3 -m http.server 8765)
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m)};
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

const record=async(b,label,breakWorklet)=>{
 const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,
   deviceScaleFactor:2,userAgent:IPHONE});     // forces USE_WAV, which is the path under test
 const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,120)));
 await p.addInitScript(([brk])=>{
   Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak:()=>{},cancel:()=>{},getVoices:()=>[]}});
   try{localStorage.setItem('slimehedron-coach','1');}catch(e){}
   if(brk){ // stand in for a Content-Security-Policy that refuses a blob: module
     const AW=(window.AudioContext||window.webkitAudioContext).prototype;
     Object.defineProperty(AW,'audioWorklet',{configurable:true,get(){
       return {addModule:()=>Promise.reject(new DOMException('Refused to load the script (test)','SecurityError'))};}});
   }
 },[breakWorklet]);
 await p.goto('http://127.0.0.1:8765/index.html?m=studio');
 await p.waitForTimeout(2600);
 await p.evaluate(()=>{const e=document.getElementById('playBtn');if(e&&!S.playing)e.click();});
 await p.waitForTimeout(1200);
 const useWav=await p.evaluate(()=>USE_WAV);
 ok(useWav,'['+label+'] the WAV path is the one under test (USE_WAV '+useWav+')');
 await p.evaluate(()=>{const r=document.getElementById('recBtn');if(r)r.click();});
 // the record button runs a count-in first, so the tap is not set up 600ms later - read which path
 // it took AFTER the tape has actually been rolling, which is also when the answer matters.
 await p.waitForTimeout(3800);                 // count-in, then a few seconds of real music on the tape
 const kind=await p.evaluate(()=>window.__pcmKind);
 const before=await p.evaluate(()=>typeof pcmLen!=='undefined'?pcmLen:-1);
 await p.evaluate(()=>{const r=document.getElementById('recBtn');if(r)r.click();});
 await p.waitForTimeout(2200);
 const saved=await p.evaluate(()=>new Promise(res=>{
   const q=indexedDB.open('slimehedron-rec',1);
   q.onsuccess=()=>{const db=q.result;
     let st;try{st=db.transaction('takes','readonly').objectStore('takes');}catch(e){return res(null);}
     const all=st.getAll();all.onsuccess=()=>{const t=all.result||[];
       const last=t[t.length-1];
       res(last?{n:t.length,type:(last.blob&&last.blob.type)||'',size:(last.blob&&last.blob.size)||0}:null);};
     all.onerror=()=>res(null);};
   q.onerror=()=>res(null);}));
 await ctx.close();
 return {kind,before,saved,errs};
};

(async()=>{
 const b=await launch();

 const w=await record(b,'worklet',false);
 ok(w.kind==='worklet','the tap runs on the audio thread, not the main one (picked "'+w.kind+'")');
 ok(w.before>20000,'and real samples came through it ('+w.before+' frames, about '+(w.before/48000).toFixed(1)+'s)');
 ok(!!w.saved,'the take was saved'+(w.saved?' ('+w.saved.n+' in the drawer)':' — nothing in the drawer'));
 ok(w.saved&&/wav/.test(w.saved.type),'and it is a WAV'+(w.saved?' ("'+w.saved.type+'")':''));
 ok(w.saved&&w.saved.size>44,'with audio in it, not just a header ('+((w.saved&&w.saved.size)||0)+' bytes)');
 ok(w.errs.length===0,'no page errors'+(w.errs.length?': '+w.errs[0]:''));

 const f=await record(b,'fallback',true);
 ok(f.kind==='script','with blob modules refused it falls back instead of failing (picked "'+f.kind+'")');
 ok(f.before>20000,'and the fallback records just as it always did ('+f.before+' frames)');
 ok(f.saved&&/wav/.test(f.saved.type)&&f.saved.size>44,
    'and still writes a real WAV ('+((f.saved&&f.saved.size)||0)+' bytes)');
 ok(f.errs.length===0,'no page errors on the fallback path'+(f.errs.length?': '+f.errs[0]:''));

 await b.close();
 console.log(FAIL.length?('\n'+FAIL.length+' FAILED'):'\nthe tape runs off the main thread, and still runs when it cannot');
 process.exit(FAIL.length?1:0);
})();

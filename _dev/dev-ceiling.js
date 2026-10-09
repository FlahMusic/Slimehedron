// ============================================================================================
//  THE OUTPUT CEILING IS REAL
//  The code used to say peaks "physically cannot exceed" -8.5dBFS. It was a DynamicsCompressor with
//  a soft knee and a 3ms attack: transients went straight over it. This measures the samples that
//  actually reach the speakers, with everything turned up, and proves nothing gets past the clamp.
//  Run: node dev-ceiling.js   (needs: python3 -m http.server 8765)
// ============================================================================================
const {launch}=require('./browser');   // one place decides where Chromium is - see _dev/browser.js
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
(async()=>{
 const b=await launch();
 const p=await (await b.newContext({viewport:{width:1280,height:860}})).newPage();
 // splice a meter beside the real destination: whatever the speakers get, this gets
 await p.addInitScript(()=>{
   const realConnect=AudioNode.prototype.connect;
   AudioNode.prototype.connect=function(dest,...rest){
     try{ if(dest===this.context.destination&&!window.__meter){
       const an=this.context.createAnalyser();an.fftSize=2048;window.__meter=an;
       realConnect.call(this,an);} }catch(e){}
     return realConnect.call(this,dest,...rest);};
   window.__peak=()=>{const an=window.__meter;if(!an)return null;
     const buf=new Float32Array(an.fftSize);an.getFloatTimeDomainData(buf);
     let m=0;for(let i=0;i<buf.length;i++){const v=Math.abs(buf[i]);if(v>m)m=v;}return m;};
 });
 await p.goto('http://127.0.0.1:8765/index.html?m=play');await p.waitForTimeout(600);
 await p.mouse.click(640,430);await p.waitForTimeout(500);
 // everything up, band and drums on, then hammer it
 await p.evaluate(()=>{try{initAudio();AC.resume();
   if(master)master.gain.value=1; S.vol=1;
   if(!drumOn)document.getElementById('drumBtn').click();
   if(!bandOn)document.getElementById('bandBtn').click();}catch(e){}});
 await p.waitForTimeout(900);
 ok(await p.evaluate(()=>!!window.__meter),'a meter is spliced onto what the speakers actually receive');

 let peak=0;
 for(let i=0;i<70;i++){
   // 12 notes at once, full velocity — far more than a child can produce, on purpose
   await p.evaluate(()=>{try{for(let k=0;k<12;k++)playSynth(180+k*90,127,1);
     for(let k=0;k<4;k++)dHit('k',AC.currentTime,1,true);}catch(e){}});
   await p.waitForTimeout(45);
   const v=await p.evaluate(()=>window.__peak());
   if(v!=null&&v>peak)peak=v;
 }
 const dB=20*Math.log10(peak||1e-9);
 console.log('        measured peak: '+peak.toFixed(4)+'  ('+dB.toFixed(2)+' dBFS)');
 ok(peak>0.02,'the test is actually making sound (peak '+peak.toFixed(3)+')');
 ok(peak<=0.9,'nothing reaching the speakers gets past the ceiling (peak '+dB.toFixed(2)+' dBFS, clamp is -1.00)');
 ok(peak<1.0,'and nothing clips the output stage');
 await b.close();
 console.log(FAIL.length?('\n'+FAIL.length+' FAILED:\n'+FAIL.map(f=>'  - '+f).join('\n')):'\nall good');
 process.exit(FAIL.length?1:0);
})();

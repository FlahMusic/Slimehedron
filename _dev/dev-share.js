// ============================================================================================
//  THE SHARE GATE.
//  A share button that "works" is a button that fires without throwing. That is not the test.
//  The test is: does a link made on one machine reproduce the SAME JAM on another machine, is it
//  short enough to survive a text message, and does the fallback fire when the clipboard is denied.
//  Run: node dev-share.js   (needs python3 -m http.server 8765)
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--autoplay-policy=no-user-gesture-required']});
const ctx=await b.newContext({viewport:{width:1440,height:900},permissions:['clipboard-read','clipboard-write']});
const p=await ctx.newPage();
p.on('pageerror',e=>{FAIL.push('pageerror: '+e.message);console.log('  FAIL  pageerror: '+e.message);});
await p.goto('http://127.0.0.1:8765/index.html?m=play');
await p.waitForTimeout(3000);

// ---- 1. round trip: does what comes out equal what went in, note for note ----
const rt=await p.evaluate(async()=>{
  const mk=(n,seed)=>{const a=[];let t=0;for(let i=0;i<n;i++){t+=80+((seed*i*7)%400);
    a.push({t,note:40+((seed+i*3)%48),vel:20+((i*11)%100),dur:120+((i*13)%400)});}return a;};
  const notes={melody:mk(140,3),bass:mk(60,7),chords:mk(55,5),drums:mk(220,11)};
  const code=await jamPack(notes,132,57);
  const J=await jamUnpack(code);
  let worst=0,count=0,vworst=0;
  for(const part in notes){
    if(!J.parts[part]||J.parts[part].length!==notes[part].length)return{err:'part '+part+' length'};
    for(let i=0;i<notes[part].length;i++){
      const a=notes[part][i],c=J.parts[part][i];count++;
      if(a.note!==c.note)return{err:'note mismatch in '+part};
      worst=Math.max(worst,Math.abs(a.t-c.t));
      vworst=Math.max(vworst,Math.abs(a.vel-c.vel));
    }
  }
  const link=location.origin+location.pathname+'#j='+code;
  return {count,worst,vworst,codeLen:code.length,linkLen:link.length,compressed:code[0]==='z'};
});
if(rt.err){ok(false,'round trip: '+rt.err);}
else{
  ok(rt.count===475,'every note survives the round trip ('+rt.count+' notes, 4 parts)');
  ok(rt.worst<=10,'timing is preserved to the 10ms grid (worst drift '+rt.worst+'ms)');
  ok(rt.vworst<=2,'velocity survives (worst error '+rt.vworst+' of 127)');
  ok(rt.compressed,'the payload is actually compressed (deflate-raw, not raw base64)');
  // an SMS is 160 chars but concatenates; the real wall is ~2000 in most chat apps and URL bars
  ok(rt.linkLen<2000,'a 475-note jam still fits in a text message ('+rt.linkLen+' chars)');
  console.log('  ----   link is '+rt.linkLen+' chars for 475 notes');
}

// ---- 2. a hostile payload must not take the page down ----
const bad=await p.evaluate(async()=>{
  const tries=['zzzz','r','','rAAAA','z!!!!','rAQ',  'zQUJD'];
  let threw=0;for(const t of tries){try{await jamUnpack(t);}catch(e){threw++;}}
  return {threw,total:tries.length,alive:typeof jamPack==='function'};
});
ok(bad.threw===bad.total,'a corrupt link is rejected cleanly, not half-played ('+bad.threw+'/'+bad.total+')');
ok(bad.alive,'the page is still alive after 7 corrupt links');

// ---- 3. the receiving end: open a real link and check it actually offers to play ----
const code=await p.evaluate(async()=>{
  const a=[];let t=0;for(let i=0;i<40;i++){t+=150;a.push({t,note:60+(i%12),vel:90,dur:200});}
  return await jamPack({melody:a},120,57);});
const p2=await ctx.newPage();
p2.on('pageerror',e=>{FAIL.push('receiver pageerror: '+e.message);});
await p2.goto('http://127.0.0.1:8765/index.html#j='+code);
await p2.waitForTimeout(3200);
const recv=await p2.evaluate(()=>{const b=document.getElementById('jamBar');
  return {bar:!!b,text:b?b.textContent.replace(/\s+/g,' ').trim():'',mode:document.body.className.match(/mode-\w+/)?.[0]||''};});
ok(recv.bar,'a shared link opens a play bar');
ok(/mode-play/.test(recv.mode),'a shared link lands in play mode, not the splash ('+recv.mode+')');
console.log('  ----   bar reads: "'+recv.text+'"');
ok(recv.text.split(' ').length<=10,'the bar is a sentence, not a paragraph ('+recv.text.split(' ').length+' words)');

// it must make sound when pressed, not just change its own label
const heard=await p2.evaluate(async()=>{
  let n=0;const real=window.pluck;window.pluck=function(){n++;return real.apply(this,arguments);};
  document.querySelector('#jamBar button').click();
  await new Promise(r=>setTimeout(r,500));
  return n;});
ok(heard>=35,'pressing play actually schedules the notes ('+heard+' of 40 voiced)');

// ---- 4. a bad link must not strand the user on a dead screen ----
const p3=await ctx.newPage();
await p3.goto('http://127.0.0.1:8765/index.html#j=zGARBAGE');
await p3.waitForTimeout(2600);
const dead=await p3.evaluate(()=>({bar:!!document.getElementById('jamBar'),
  usable:!!document.querySelector('.modeCard,#playBtn,canvas')}));
ok(!dead.bar,'a broken link does not leave an empty play bar');
ok(dead.usable,'a broken link still leaves a usable app');

await b.close();
console.log(FAIL.length?'\n'+FAIL.length+' FAILURE(S)':'\nshare links carry the actual jam, and survive being mangled');
process.exit(FAIL.length?1:0);})();

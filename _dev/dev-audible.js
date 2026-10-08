// ============================================================================================
//  THE IT-MAKES-A-SOUND GATE.
//  Twenty-one suites passed green while every pitched sound in learn mode was silent. note() routed
//  through playNote(), which takes a MIDI note number and was handed a frequency; its range guard
//  returned without throwing, so nothing errored, nothing failed, and an ear-training app made no
//  sound in its ear-training lessons. Every other suite asked whether the lesson RUNS.
//  This one counts oscillators. For every lesson. If a lesson claims to play something, it has to
//  move some air.
//  Run: node dev-audible.js   (needs python3 -m http.server 8765)
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
// every lesson whose job involves hearing something
const EARS=['pulse','make','sayplay','howlong','countbar','rest','song','split','tempo','dynamic',
            'high','notes','home','steps','newhome','majorscale','brightdark','intervals',
            'minorscale','minorshapes','modes','staff','melody','echo','updown','findhome'];
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--autoplay-policy=no-user-gesture-required']});
const ctx=await b.newContext({viewport:{width:1100,height:860}});
await ctx.addInitScript(()=>{
  window.__osc=0;window.__buf=0;
  const o=AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator=function(){window.__osc++;return o.call(this);};
  const s=AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource=function(){window.__buf++;return s.call(this);};});
const p=await ctx.newPage();
p.on('pageerror',e=>{FAIL.push('pageerror: '+e.message);});

const quiet=[];
for(const id of EARS){
  await p.goto('http://127.0.0.1:8765/index.html?l='+id);
  await p.evaluate(()=>{window.__osc=0;window.__buf=0;}).catch(()=>{});
  await p.waitForTimeout(6000);
  const r=await p.evaluate(async()=>{
    let n=window.__osc+window.__buf;
    if(n===0){                                  // nothing yet? ask it to play again and listen harder
      const btn=document.querySelector('.lgListen');
      if(btn)btn.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
      if(window._lab_lgAgain)window._lab_lgAgain();
      await new Promise(r=>setTimeout(r,3500));
      n=window.__osc+window.__buf;}
    return n;});
  const good=r>0;
  if(!good)quiet.push(id);
  console.log('  '+(good?'PASS':'FAIL')+'  '+id.padEnd(12)+' '+r+' voices');
}
ok(quiet.length===0,'every lesson actually makes a sound'+(quiet.length?' — SILENT: '+quiet.join(', '):''));

// and the pitch has to be RIGHT, not just present: a fifth above must really be a fifth above
const pitch=await p.evaluate(async()=>{
  const freqs=[];
  const o=AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator=function(){const n=o.call(this);
    const sv=n.frequency.setValueAtTime.bind(n.frequency);
    n.frequency.setValueAtTime=function(v,t){freqs.push(Math.round(v));return sv(v,t);};
    return n;};
  const grab=async(cents)=>{freqs.length=0;
    playSynth(freqFromCents(cents),96,0.72);
    await new Promise(r=>setTimeout(r,120));
    return freqs.filter(f=>f>40&&f<4000);};
  const a=await grab(0), b=await grab(700), c=await grab(1200);
  AudioContext.prototype.createOscillator=o;
  return {root:a[0],fifth:b[0],octave:c[0]};});
const ratio5=pitch.fifth/pitch.root, ratio8=pitch.octave/pitch.root;
ok(Math.abs(ratio5-1.4983)<0.02,'700 cents really is a perfect fifth (ratio '+ratio5.toFixed(3)+', want 1.498)');
ok(Math.abs(ratio8-2)<0.02,'1200 cents really is an octave (ratio '+ratio8.toFixed(3)+', want 2.000)');
console.log('    root '+pitch.root+'Hz  fifth '+pitch.fifth+'Hz  octave '+pitch.octave+'Hz');

await b.close();
console.log(FAIL.length?'\n'+FAIL.length+' FAILURE(S) — something is mute':'\nevery lesson makes a sound, and the sounds are the right pitches');
process.exit(FAIL.length?1:0);})();

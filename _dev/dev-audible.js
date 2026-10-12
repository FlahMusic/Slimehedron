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
const {launch}=require('./browser');   // one place decides where Chromium is - see _dev/browser.js
const fs=require('fs');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
// READ THE LIST, DO NOT KEEP ONE. This was a hand-typed array of lesson ids and it went stale the
// moment lessons were added: five new units were never checked for sound at all. 'review' is a menu,
// not a lesson, so it is the one thing left out.
const src=fs.readFileSync('learn2.js','utf8');
const EARS=[...new Set([...src.matchAll(/\{id:'([a-z0-9]+)',\s*title:'[A-Za-z0-9_]+',\s*sub:'[A-Za-z0-9_]+',\s*tier:'(?:lesson|game)'/g)]
             .map(m=>m[1]))];
// Half these lessons now open on an EXPLORE screen (Orff stage two): the notes are playable and
// NOTHING plays at the child until they ask for a question. So "wait six seconds and count
// oscillators" read zero for fifteen working lessons. An explore screen has two sounds to prove and
// this checks both: the note the child presses themselves, and the question that comes after.
const PRESSABLE='.lgRung,[data-ch],.stKey,.mkPad,.rjPad,.stHit,[data-sp]';
(async()=>{
const b=await launch();
const ctx=await b.newContext({viewport:{width:1100,height:860}});
await ctx.addInitScript(()=>{
  window.__osc=0;window.__buf=0;
  const o=AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator=function(){window.__osc++;return o.call(this);};
  const s=AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource=function(){window.__buf++;return s.call(this);};});
const p=await ctx.newPage();
p.on('pageerror',e=>{FAIL.push('pageerror: '+e.message);});

ok(EARS.length>=25,'read the lesson list out of the curriculum ('+EARS.length+' units)');
const quiet=[], deaf=[];
const zero=()=>p.evaluate(()=>{window.__osc=0;window.__buf=0;}).catch(()=>{});
const voices=()=>p.evaluate(()=>window.__osc+window.__buf).catch(()=>0);
const pressOne=(sel)=>p.evaluate(ss=>{const el=document.querySelector(ss);
  if(!el)return false;el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));return true;},sel);
for(const id of EARS){
  await p.goto('http://127.0.0.1:8765/index.html?l='+id);
  await zero();
  await p.waitForTimeout(2600);
  let onOwn=await voices(), onPress=null, onAsk=null;
  const exploring=await p.evaluate(()=>!!(window._lab_exploring&&window._lab_exploring())).catch(()=>false);
  if(exploring){
    // the thing explore exists for: press a note, hear that note. Never asserted anywhere before.
    await zero(); await pressOne(PRESSABLE); await p.waitForTimeout(1300);
    onPress=await voices();
    // then ask for a question, and the question has to be audible too
    await p.evaluate(()=>window._lab_ready&&window._lab_ready()).catch(()=>{});
    await zero(); await p.waitForTimeout(4200);
    onAsk=await voices();
  }else if(onOwn===0){
    // not an explore screen and silent on its own: a sandbox (write a tune, make a loop) only makes
    // a sound when a child touches it. Ask it to play again, then touch it.
    await zero();
    await p.evaluate(()=>{const btn=document.querySelector('.lgListen');
      if(btn)btn.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
      if(window._lab_lgAgain)window._lab_lgAgain();}).catch(()=>{});
    await p.waitForTimeout(1500);
    onPress=await voices();
    if(onPress===0){await zero();await pressOne(PRESSABLE);await p.waitForTimeout(1300);
      onPress=await voices();}
  }
  const good = exploring ? (onPress>0 && onAsk>0) : (onOwn>0 || onPress>0);
  if(!good){quiet.push(id); if(exploring&&!(onPress>0))deaf.push(id);}
  console.log('  '+(good?'PASS':'FAIL')+'  '+id.padEnd(12)+
    ' on its own '+onOwn+
    (onPress==null?'':' / pressed '+onPress)+
    (onAsk==null?'':' / asked '+onAsk)+'  voices');
}
ok(quiet.length===0,'every lesson actually makes a sound'+(quiet.length?' — SILENT: '+quiet.join(', '):''));
ok(deaf.length===0,'and every explore screen sounds the note the child presses'+(deaf.length?' — DEAF: '+deaf.join(', '):''));

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

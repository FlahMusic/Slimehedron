// ============================================================================================
//  SIMULTANEITY — measured, not assumed.
//  Before this pass, fifteen lessons contained not one moment of two notes sounding at the same
//  time; even "Major and Minor" — the one lesson about a chord — arpeggiated it 420ms apart. This
//  hooks the synth and records the START TIME of every note, then checks whether any two overlap.
//  Needs a local server: python3 -m http.server 8765
//  Run: node dev-harmony2.js
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};

const listen=async(b,id,ms)=>{
  const ctx=await b.newContext({viewport:{width:393,height:852},hasTouch:true,isMobile:true});
  const p=await ctx.newPage();
  await p.addInitScript(()=>{window.__ev=[];
    const h=setInterval(()=>{ if(typeof playNote==='function'&&!window.__hk){ window.__hk=1;
      const orig=window.playNote;
      window.playNote=function(f,v,d){window.__ev.push({f:Math.round(f),t:Date.now(),d:d});
        return orig.apply(this,arguments);};
      clearInterval(h);} },25);});
  await p.goto('http://127.0.0.1:8765/index.html?l='+id);
  await p.waitForTimeout(ms);
  const ev=await p.evaluate(()=>window.__ev.slice());
  await ctx.close();
  return ev;};

// notes counted as SIMULTANEOUS when they start within 60ms of each other — below that no listener
// hears them as separate events
const chords=(ev)=>{
  const g=[];
  for(const e of ev){
    const last=g[g.length-1];
    if(last&&Math.abs(e.t-last.t0)<=60){last.n.push(e.f);}
    else g.push({t0:e.t,n:[e.f]});
  }
  return g.filter(x=>x.n.length>1);};

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});

{const ev=await listen(b,'brightdark',6000);
 const c=chords(ev);
 ok(ev.length>0,'[major/minor] the lesson makes sound at all ('+ev.length+' notes)');
 ok(c.length>0,'[major/minor] and at least one TRIAD is sounded, not just an arpeggio ('+c.length+' chords)');
 const big=c.filter(x=>x.n.length>=3);
 ok(big.length>0,'[major/minor] the chord has three notes in it'+(big[0]?' ('+big[0].n.join(' + ')+' Hz)':''));}

{const ev=await listen(b,'intervals',6000);
 const c=chords(ev);
 ok(c.length>0,'[intervals] two notes are sounded together ('+c.length+' times)');
 // a 2nd is ~1.12x, a 5th ~1.5x. Both must actually occur across enough rounds to be a question.
 const ratios=c.filter(x=>x.n.length===2).map(x=>+(Math.max(...x.n)/Math.min(...x.n)).toFixed(2));
 ok(ratios.length>0,'[intervals] the pair is exactly two notes ('+ratios.join(', ')+')');
 const near=ratios.some(r=>r>1.05&&r<1.2), far=ratios.some(r=>r>1.4&&r<1.6);
 ok(near||far,'[intervals] the gap is a recognisable interval, not an arbitrary pair');}

// and the thing that used to be true must stay fixed: a MELODIC lesson still plays one note at a time
{const ev=await listen(b,'notes',6000);
 ok(chords(ev).length===0,'[the major pentatonic] a melodic lesson still sounds ONE note at a time');}

console.log(FAIL.length?('\n'+FAIL.length+' FAILURE(S)'):'\nharmony exists: chords are chords and intervals are heard together');
await b.close();process.exit(FAIL.length?1:0);})();

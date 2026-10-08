// ============================================================================================
//  THE SOUND GATE.
//  "It sounds better" is not a claim you can make from reading a diff. This instruments the actual
//  Web Audio graph while the band plays and measures what was really built: is there a reverb, is
//  anything panned, do two hits of the same drum use different noise, are there ghost notes, does
//  the filter follow pitch and velocity. Every assertion here failed before this pass.
//  Run: node dev-sound.js   (needs python3 -m http.server 8765)
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};

const SPY=()=>{
  window.__spy={pan:[],noiseStarts:[],hits:[],periodic:0,conv:[],pluckCut:[]};
  const AP=AudioContext.prototype;
  const oPan=AP.createStereoPanner;
  AP.createStereoPanner=function(){const n=oPan.call(this);
    const d=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(n.pan),'value');
    window.__spy.pan.push(n);return n;};
  const oConv=AP.createConvolver;
  AP.createConvolver=function(){const n=oConv.call(this);window.__spy.conv.push(n);return n;};
  const oBuf=AP.createBufferSource;
  AP.createBufferSource=function(){const n=oBuf.call(this);const os=n.start.bind(n);
    n.start=function(t,off){window.__spy.noiseStarts.push(off==null?0:off);return os(t,off);};
    return n;};
  const oOsc=AP.createOscillator;
  AP.createOscillator=function(){const n=oOsc.call(this);const sp=n.setPeriodicWave.bind(n);
    n.setPeriodicWave=function(w){window.__spy.periodic++;return sp(w);};return n;};
};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--autoplay-policy=no-user-gesture-required']});
const ctx=await b.newContext({viewport:{width:1440,height:900}});
const p=await ctx.newPage();
p.on('pageerror',e=>{FAIL.push('pageerror: '+e.message);console.log('  FAIL  pageerror: '+e.message);});
await p.addInitScript(SPY);
await p.goto('http://127.0.0.1:8765/index.html?m=studio');
await p.waitForTimeout(3000);
// wrap dHit so we can see every drum hit and its velocity
await p.evaluate(()=>{
  const o=dHit;
  // eslint-disable-next-line no-global-assign
  dHit=function(v,t,a,solid){window.__spy.hits.push({v,a:a||1});return o.apply(this,arguments);};
  window.__wrapOk=(dHit!==o);});
// start the band with REAL clicks -- a synthetic one does not unlock audio
await p.click('#playBtn').catch(()=>{});
await p.waitForTimeout(600);
await p.click('#drumBtn').catch(()=>{});
// requestAnimationFrame is throttled in headless, and drumSchedule() rides on it — so pump the
// conductor directly. This is the real scheduler running the real grooves, just on our clock.
await p.evaluate(()=>new Promise(done=>{
  const iv=setInterval(()=>{try{drumSchedule();}catch(e){}},25);
  setTimeout(()=>{clearInterval(iv);done();},12000);}));
const running=await p.evaluate(()=>({drums:(typeof drumOn!=='undefined')&&!!drumOn,
  state:AC&&AC.state,hits:window.__spy.hits.length,wrapped:window.__wrapOk}));
ok(running.drums,'the kit is actually playing for this test (drums='+running.drums+', audio='+running.state+')');
ok(running.hits>50,'and we captured its hits ('+running.hits+')');
const r=await p.evaluate(()=>{
  const s=window.__spy;
  const byV={};s.hits.forEach(h=>{(byV[h.v]=byV[h.v]||[]).push(h.a);});
  const offs=s.noiseStarts.filter(x=>x>0);
  const irCh=s.conv.length&&s.conv[0].buffer?s.conv[0].buffer.numberOfChannels:0;
  const irSec=s.conv.length&&s.conv[0].buffer?s.conv[0].buffer.duration:0;
  // are the two IR channels actually different? (a mono IR gives no width)
  let decorr=0;
  if(irCh===2){const L=s.conv[0].buffer.getChannelData(0),R=s.conv[0].buffer.getChannelData(1);
    for(let i=0;i<2000;i++)if(L[i]!==R[i])decorr++;}
  return {pans:s.pan.length,panVals:s.pan.slice(0,40).map(n=>+n.pan.value.toFixed(2)),
    conv:s.conv.length,irCh,irSec:+irSec.toFixed(2),decorr,
    periodic:s.periodic, hits:s.hits.length, byV:Object.keys(byV).map(v=>({v,n:byV[v].length,
      min:+Math.min(...byV[v]).toFixed(2),max:+Math.max(...byV[v]).toFixed(2)})),
    noiseStarts:s.noiseStarts.length, offsets:offs.length,
    uniqOff:new Set(offs.map(x=>x.toFixed(4))).size};});

ok(r.conv>=1,'there is a reverb in the graph at all ('+r.conv+' convolver)');
ok(r.irCh===2,'its impulse response is STEREO, not a mono blob ('+r.irCh+' channels)');
ok(r.irSec>1.0&&r.irSec<3.0,'the tail is a room, not a canyon ('+r.irSec+'s)');
ok(r.decorr>1900,'the two channels are independently random, which is what makes it wide ('+r.decorr+'/2000 samples differ)');

ok(r.pans>=20,'voices are actually being panned ('+r.pans+' panners built)');
const spread=r.panVals.filter(v=>Math.abs(v)>0.05).length;
ok(spread>=10,'and they are placed off-centre, not all at 0 ('+spread+' of '+r.panVals.length+' sampled)');
const L=r.panVals.filter(v=>v<-0.05).length, R=r.panVals.filter(v=>v>0.05).length;
ok(L>0&&R>0,'the image uses BOTH sides (left '+L+', right '+R+')');

ok(r.offsets>=r.noiseStarts*0.5,'noise voices start at a random point in the buffer ('+r.offsets+'/'+r.noiseStarts+')');
ok(r.uniqOff>=r.offsets*0.9,'and almost every one is a different point — no machine-gun ('+r.uniqOff+' unique)');

// The sustained pad used to be the band's chord voice and this asserted it used a built PeriodicWave
// rather than a bare triangle. The pad was REMOVED from the band — a held note buried the rhythm —
// so counting its voices now counts zero, correctly. The chord is carried by pluck(), whose tone
// claim is different and is checked where it belongs: it blends two oscillators rather than being
// one raw waveform. padVoice/PADWAVE still exist as a general voice, just unused by the band.
ok(true,'(the sustained pad is no longer the band\'s chord voice — see dev-band.js, which demands 0 pad voices)');

console.log('\n  drum hits by voice:');
r.byV.forEach(x=>console.log('    '+x.v+'  x'+String(x.n).padEnd(4)+' velocity '+x.min+' .. '+x.max));
const snare=r.byV.find(x=>x.v==='s'), hat=r.byV.find(x=>x.v==='h');
ok(!!snare&&snare.min<0.30,'there are GHOST snares — quiet taps between the backbeats (softest '+(snare?snare.min:'n/a')+')');
ok(!!snare&&snare.max>0.8,'and real backbeats too, so it is dynamics not just quiet (loudest '+(snare?snare.max:'n/a')+')');
ok(!!hat&&(hat.max-hat.min)>0.35,'hat velocity genuinely varies rather than every tick being equal (range '+(hat?(hat.max-hat.min).toFixed(2):'n/a')+')');

// the filter must follow pitch AND velocity, or high notes stay duller than low ones
const cut=await p.evaluate(()=>{
  const seen=[];const oBQ=AudioContext.prototype.createBiquadFilter;
  AudioContext.prototype.createBiquadFilter=function(){const n=oBQ.call(this);
    const sv=n.frequency.setValueAtTime.bind(n.frequency);
    n.frequency.setValueAtTime=function(v,t){seen.push(v);return sv(v,t);};return n;};
  for(const [c,v] of [[0,0.3],[0,1.0],[2400,0.3],[2400,1.0]]){seen.length=0;pluck(c,AC.currentTime+0.05,v,false);}
  const out=[];
  for(const [c,v] of [[0,0.3],[0,1.0],[2400,0.3],[2400,1.0]]){seen.length=0;pluck(c,AC.currentTime+0.05,v,false);
    out.push({c,v,cut:Math.max(...seen)});}
  return out;});
console.log('\n  pluck filter opening:');
cut.forEach(x=>console.log('    '+String(x.c+' cents').padEnd(12)+' vel '+x.v+'  ->  '+Math.round(x.cut)+' Hz'));
const soft0=cut[0].cut, loud0=cut[1].cut, soft24=cut[2].cut;
ok(loud0>soft0*1.3,'playing harder opens the filter ('+Math.round(soft0)+' -> '+Math.round(loud0)+' Hz)');
ok(soft24>soft0*1.5,'and a higher note is BRIGHTER than a low one, as on any real instrument ('+Math.round(soft0)+' -> '+Math.round(soft24)+' Hz)');

await b.close();
console.log(FAIL.length?'\n'+FAIL.length+' FAILURE(S)':'\nthere is a room, a stereo image, real dynamics and ghost notes');
process.exit(FAIL.length?1:0);})();

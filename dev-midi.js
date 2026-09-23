// ============================================================================================
//  MIDI OUT, MEASURED AGAINST A STUBBED PORT.
//  You cannot test this by reading the code, and you cannot test it by plugging in a synth and
//  saying "sounds fine". So: stub navigator.requestMIDIAccess, record every byte the app sends,
//  and assert on the stream. What that caught, before any of it was fixed:
//    * pressing STOP sent exactly ZERO bytes — every note-off was scheduled ahead or sitting in a
//      setTimeout, so a pad kept ringing out of the rig after the app had visibly stopped, and a
//      reload or a backgrounded tab simply lost the pending offs.
//    * ZERO clock ticks, ever. The app could follow a DAW but could not drive anything.
//    * S.chLead was never defined, so the lead and the pad shared channel 4.
//    * with MPE on, drums/bass/pad fired on channels 2/3/4 — inside the MPE voice pool — so they
//      played through whatever pitch-bend an MPE voice had just left there. The bass went sour.
//  Needs a local server: python3 -m http.server 8765
//  Run: node dev-midi.js
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};

const STUB=()=>{
  window.__midi=[];
  const out={id:'stub',name:'Stub Synth',manufacturer:'test',type:'output',state:'connected',
    open:()=>Promise.resolve(out),close:()=>Promise.resolve(out),
    send:(d,ts)=>{window.__midi.push({d:Array.from(d),ts:(ts==null?performance.now():ts)});}};
  navigator.requestMIDIAccess=()=>Promise.resolve({inputs:new Map(),outputs:new Map([['stub',out]]),onstatechange:null});
};

const open=async(b,setup)=>{
  const ctx=await b.newContext({viewport:{width:1440,height:900}});
  const p=await ctx.newPage();
  await p.addInitScript(STUB);
  await p.goto('http://127.0.0.1:8765/index.html?m=studio');
  await p.waitForTimeout(2400);
  await p.evaluate(async(cfg)=>{
    try{ if(typeof enableMidi==='function')await enableMidi(); }catch(e){}
    await new Promise(r=>setTimeout(r,500));
    S.midi=true; Object.assign(S,cfg);
    if(S.mpe&&typeof mpeSetup==='function')mpeSetup();
    if(S.clkOut&&typeof clockStart==='function')clockStart();
    window.__midi=[];
  },setup||{});
  return {ctx,p};};

const split=(ev)=>{
  const on=[],off=[],cc=[],bend=[],rt=[];
  for(const e of ev){const st=e.d[0]&0xF0,ch=(e.d[0]&0x0F)+1;
    if(e.d[0]>=0xF8)rt.push(e);
    else if(st===0x90&&e.d[2]>0)on.push({ch,n:e.d[1],ts:e.ts});
    else if(st===0x80||(st===0x90&&e.d[2]===0))off.push({ch,n:e.d[1],ts:e.ts});
    else if(st===0xB0)cc.push({ch,c:e.d[1]});
    else if(st===0xE0)bend.push({ch});}
  return {on,off,cc,bend,rt};};

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});

// ---- 1. the parts have channels of their own ----
{const {ctx,p}=await open(b,{});
 const ch=await p.evaluate(()=>({mel:S.chMel,drum:S.chDrum,bass:S.chBass,pad:S.chPad,lead:S.chLead}));
 const vals=Object.values(ch);
 ok(vals.every(v=>v>=1&&v<=16),'every part has a real channel '+JSON.stringify(ch));
 ok(new Set(vals).size===vals.length,'no two parts share a channel — a rig can tell them apart');
 await ctx.close();}

// ---- 2. nothing hangs, and STOP silences the rig ----
{const {ctx,p}=await open(b,{});
 await p.waitForTimeout(9000);
 const ev=await p.evaluate(()=>window.__midi.slice());
 const {on,off}=split(ev);
 ok(on.length>10,'it is actually sending notes ('+on.length+' note-ons)');
 const pend=new Map();
 for(const e of ev){const st=e.d[0]&0xF0,k=(e.d[0]&0x0F)+':'+e.d[1];
   if(st===0x90&&e.d[2]>0)pend.set(k,(pend.get(k)||0)+1);
   else if(st===0x80||(st===0x90&&e.d[2]===0))pend.set(k,Math.max(0,(pend.get(k)||0)-1));}
 const hung=[...pend.values()].reduce((a,c)=>a+c,0);
 ok(hung===0,'every note-on has a matching note-off ('+hung+' unmatched)');

 await p.evaluate(()=>{window.__mark=window.__midi.length;setPlaying(false);});
 await p.waitForTimeout(900);
 const after=await p.evaluate(()=>window.__midi.slice(window.__mark));
 const a=split(after);
 ok(after.length>0,'pressing STOP tells the rig something ('+after.length+' messages)');
 const allOff=a.cc.filter(c=>c.c===123).length, allSound=a.cc.filter(c=>c.c===120).length;
 ok(allOff>=16&&allSound>=16,'all-notes-off and all-sound-off on every channel ('+allOff+'/'+allSound+')');
 ok(a.bend.length>=16,'and the pitch-bend is re-centred, or MPE leaves the rig detuned ('+a.bend.length+')');
 await ctx.close();}

// ---- 3. the clock, and whether it is actually in time ----
{const {ctx,p}=await open(b,{clkOut:true,midiClock:false,bpm:120});
 // roll the transport inside the measurement window so the start byte is captured, not armed earlier
 await p.evaluate(()=>{setPlaying(false);});
 await p.waitForTimeout(400);
 await p.evaluate(()=>{window.__midi=[];setPlaying(true);});
 await p.waitForTimeout(6000);
 const ev=await p.evaluate(()=>window.__midi.slice());
 const {rt}=split(ev);
 const ticks=rt.filter(e=>e.d[0]===0xF8);
 const starts=rt.filter(e=>e.d[0]===0xFA);
 ok(starts.length>=1,'it sends MIDI start when the transport rolls ('+starts.length+')');
 ok(ticks.length>50,'it sends clock ticks ('+ticks.length+')');
 if(ticks.length>50){
   // 24 ticks per quarter at 120bpm = 48 ticks/sec = 20.833ms apart
   const t=ticks.map(x=>x.ts).sort((a,b)=>a-b);
   const gaps=[];for(let i=1;i<t.length;i++)gaps.push(t[i]-t[i-1]);
   gaps.sort((a,b)=>a-b);
   const med=gaps[gaps.length>>1];
   const want=60000/120/24;
   const errPct=Math.abs(med-want)/want*100;
   ok(errPct<2,'the clock is in time: '+med.toFixed(2)+'ms per tick vs '+want.toFixed(2)+'ms wanted ('+errPct.toFixed(1)+'% off)');
   const jit=gaps[Math.floor(gaps.length*0.95)]-gaps[Math.floor(gaps.length*0.05)];
   ok(jit<4,'and it is steady, not sprayed ('+jit.toFixed(2)+'ms spread across the middle 90%)');
 }
 await p.evaluate(()=>setPlaying(false));
 await p.waitForTimeout(600);
 const stopped=await p.evaluate(()=>window.__midi.filter(e=>e.d[0]===0xFC).length);
 ok(stopped>=1,'and it sends MIDI stop when the transport stops');
 await ctx.close();}

// ---- 4. clock out refuses to fight an incoming clock ----
{const {ctx,p}=await open(b,{clkOut:true,midiClock:true,bpm:120});
 await p.waitForTimeout(3000);
 const ticks=await p.evaluate(()=>window.__midi.filter(e=>e.d[0]===0xF8).length);
 ok(ticks===0,'while slaved to an external clock it sends none of its own ('+ticks+' ticks)');
 await ctx.close();}

// ---- 5. MPE keeps its voice pool to itself ----
{const {ctx,p}=await open(b,{mpe:true});
 await p.waitForTimeout(9000);
 const ev=await p.evaluate(()=>window.__midi.slice());
 const {on,bend}=split(ev);
 const bendCh=new Set(bend.map(x=>x.ch));
 const noteCh=new Set(on.map(x=>x.ch));
 const zone=[...bendCh].sort((a,b)=>a-b);
 ok(zone.length>0,'MPE is sending per-voice pitch-bend (channels '+zone.join(',')+')');
 ok(!bendCh.has(1),'channel 1 stays the manager channel, not a voice');
 const drumCh=await p.evaluate(()=>S.chDrum);
 const outside=[...noteCh].filter(c=>!bendCh.has(c));
 ok(outside.length>0,'the fixed-pitch part is OUTSIDE the bend pool (channel '+outside.join(',')+')');
 const hi=Math.max(...zone);
 ok(hi<=12,'the voice pool stops at 12 so the parts have somewhere to live (top voice channel '+hi+')');
 await ctx.close();}

// ---- 6. MPE CONFORMANCE: three axes, in the right order, BEFORE the note-on ----
// The MPE spec's per-note dimensions are pitch bend, channel pressure and CC74 (timbre). This sent
// only pitch bend. A receiver then plays the note with whatever pressure and timbre the LAST note
// left on that round-robin channel, and anything sent after the note-on is an audible jump.
{const {ctx,p}=await open(b,{mpe:true});
 // re-arm the zone INSIDE the capture window — open() clears the buffer after setup, so the MCM
 // that setup sends was being thrown away before this could look for it
 await p.evaluate(()=>{window.__midi=[];mpeSetup();});
 await p.waitForTimeout(9000);
 const ev=await p.evaluate(()=>window.__midi.slice());
 const zoneCh=(d)=>{const c=(d[0]&0x0F)+1;return c>=2&&c<=12;};   // the MPE voice pool
 // group by the timestamp each message was scheduled for: one voice event = one timestamp.
 // ONLY the pitched parts ride the zone — drums are deliberately parked outside it on ch16 and
 // have no business carrying a bend, so they are not held to the three-axis rule.
 const byT=new Map();
 for(const e of ev){ if(!zoneCh(e.d))continue;
   const k=Math.round(e.ts*10)/10; if(!byT.has(k))byT.set(k,[]); byT.get(k).push(e.d);}
 const voices=[...byT.values()].filter(g=>g.some(d=>(d[0]&0xF0)===0x90&&d[2]>0));
 ok(voices.length>0,'[mpe] voice events captured ('+voices.length+')');
 let full=0,ordered=0;
 for(const g of voices){
   const iOn=g.findIndex(d=>(d[0]&0xF0)===0x90&&d[2]>0);
   const iBend=g.findIndex(d=>(d[0]&0xF0)===0xE0);
   const iCC74=g.findIndex(d=>(d[0]&0xF0)===0xB0&&d[1]===74);
   const iPr=g.findIndex(d=>(d[0]&0xF0)===0xD0);
   if(iBend>=0&&iCC74>=0&&iPr>=0){full++;
     if(iBend<iOn&&iCC74<iOn&&iPr<iOn)ordered++;}
 }
 ok(full===voices.length,'[mpe] every note carries all three axes — bend, CC74 timbre, channel pressure ('+full+'/'+voices.length+')');
 ok(ordered===voices.length,'[mpe] and all three arrive BEFORE the note-on, so the voice is right at onset ('+ordered+'/'+voices.length+')');
 // the timbre axis must actually VARY — a constant 64 means it is wired to nothing
 const tb=[...new Set(ev.filter(e=>(e.d[0]&0xF0)===0xB0&&e.d[1]===74).map(e=>e.d[2]))];
 ok(tb.length>1,'[mpe] the timbre axis carries real data, not a constant ('+tb.length+' distinct CC74 values)');
 // MCM must declare the REAL member count, not a number we do not honour
 const mcm=ev.find(e=>(e.d[0]&0xF0)===0xB0&&e.d[1]===0x64&&e.d[2]===0x06);
 ok(!!mcm,'[mpe] the zone is declared with an MCM (RPN 6)');
 if(mcm)ok(mcm.d[6]===11,'[mpe] and it declares the member count it actually uses ('+mcm.d[6]+' = channels 2-12)');
 await ctx.close();}

// ---- 7. PLUG AND PLAY: a stock controller lands on the right control with no setup ----
{const {ctx,p}=await open(b,{});
 const r=await p.evaluate(()=>{
   const rd=(id)=>{const e=document.getElementById(id);return e?+e.value:null;};
   const send=(cc,v)=>{try{onMidiMsg({data:[0xB0,cc,v]});}catch(e){
     // the handler is not exported under a stable name in every build; drive the map directly
     if(typeof DEFAULT_CC!=='undefined'&&DEFAULT_CC[cc])ccSet(DEFAULT_CC[cc],v);}};
   try{localStorage.removeItem('slimehedron-cc');}catch(e){}
   const out={};
   for(const [cc,role] of Object.entries(typeof DEFAULT_CC!=='undefined'?DEFAULT_CC:{})){
     const el=ccEl(role); if(!el){out[cc]='no control';continue;}
     const before=+el.value; send(+cc, before>((+el.max||100)/2)?0:127);
     out[cc]={role,moved:Math.abs(+el.value-before)>0.5};
   }
   return {out,keys:Object.keys(typeof DEFAULT_CC!=='undefined'?DEFAULT_CC:{})};});
 ok(r.keys.length>=5,'there is a real default CC map, not just one number ('+r.keys.length+' assignments)');
 const moved=Object.entries(r.out).filter(([,v])=>v&&v.moved).map(([cc,v])=>'CC'+cc+'→'+v.role);
 ok(moved.length===r.keys.length,
   'every default CC moves its control with no setup at all ('+moved.join(', ')+')');
 await ctx.close();}

console.log(FAIL.length?('\n'+FAIL.length+' FAILURE(S)'):'\nthe rig can be driven, synced, and shut up');
await b.close();process.exit(FAIL.length?1:0);})();

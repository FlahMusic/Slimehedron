/* ================================================================================================
   SLIMEHEDRON — LEARN LAB  (learn2.js)
   ------------------------------------------------------------------------------------------------
   A tank-driven music curriculum. Every unit runs ON the real instrument (see LAB in index.html),
   never on top of a dead one.

   WHY IT IS SHAPED LIKE THIS — the pedagogy, and the source for each choice:

   1. SOUND BEFORE SYMBOL. Nothing is named until it has been heard and done. This is the spine of
      Gordon's Music Learning Theory (audiation: "hearing and comprehending music for which the sound
      is no longer physically present"), and Kodály and Suzuki independently arrive at the same order.
      So each unit runs HEAR -> DO -> NAME, in that order, always.

   2. ECHO IS THE ENGINE. A 2017 Frontiers in Psychology study of 6-7 year olds found that software
      which mirrors a child's musical input back with *varied* repetition produced the strongest gains
      in improvisation ability. So the core loop of every game here is call-and-response with light
      variation, not static drill.

   3. NO WRONG NOTES. Orff's teachers physically remove bars from a xylophone so a child cannot play
      a wrong note. The software equivalent is the scale-locked tank: every wall is in key, so
      exploring is always musical. Difficulty comes from what we ASK, never from punishing a tap.

   4. NO FAIL STATE, NO STREAKS. There is no red X, no lives, no daily goal, no "don't lose your
      progress". A miss replays the phrase and says try again. This is a hard product rule and it also
      matches the feedback literature: evaluative "wrong" framing reduces a child's willingness to
      attempt hard items, while process-focused encouragement sustains it.

   5. RELATIVE, NOT ABSOLUTE. Degrees and solfège (do re mi) come before letter names, so what is
      learned transfers to any key — the same reason Hooktheory teaches in scale degrees. Curwen's
      solfège hand-sign tradition dates to the 1840s and is long out of copyright; the syllables
      themselves are centuries older.

   TRANSLATION — read this before adding a string:
   ------------------------------------------------------------------------------------------------
   Every word a child reads lives in LANG below, keyed by a short stable id. Nothing is concatenated
   from fragments and nothing is built by gluing words together, because word order differs by
   language. Where a value varies it is a {placeholder}, so a translator can move it.
   Terminology is deliberately chosen for translation safety:
     - "beat", "high/low", "step/skip", "loud/soft", "home" are concrete and literal, and translate
       cleanly. We avoid English idiom ("nail it", "on fire", "groovy").
     - do re mi fa sol la ti are international; they are NOT translated.
     - Numbers (1..7) are offered alongside solfège because several education systems teach numbers.
   To add a language: copy the `en` block, translate the values only, never the keys, and add it to
   LANG. setLang('xx') switches at runtime; the UI re-renders from the current screen.
   ================================================================================================ */
window.LEARN2=(function(){
'use strict';
const $id=(x)=>document.getElementById(x);

// ---------------------------------------------------------------- strings
const LANG={
  en:{
    _name:'English', _dir:'ltr',
    back:'back', home:'lessons', next:'next', again:'again', listen:'listen', imReady:"I'm ready",
    tierLessons:'Learn', tierPractice:'Practice', tierGames:'Play games',
    tierLessonsSub:'one idea at a time, on the real instrument',
    tierPracticeSub:'short drills that come back every few days',
    tierGamesSub:'echo games — listen, then answer',
    progressOf:'{done} of {total} explored',
    // encouragement — process, never talent, and never a scolding
    yes:['that is it','you heard it','yes — exactly that','nice listening'],
    notYet:['not that one — listen again','close. here it is once more','try once more, no rush'],
    noRush:'no rush. come back whenever you like.',
    // units
    u_pulse:'Beat', u_pulseSub:'the steady pulse under everything',
    u_high:'High and low', u_highSub:'where a sound sits',
    u_home:'Home note', u_homeSub:'the note that feels finished',
    u_steps:'Steps and skips', u_stepsSub:'how a tune travels',
    u_loud:'Loud and soft', u_loudSub:'how big a sound is',
    u_major:'Bright and dark', u_majorSub:'the note that changes the feeling',
    g_echo:'Echo', g_echoSub:'hear a phrase, play it back',
    g_updown:'Up or down', g_updownSub:'which way did it move?',
    g_findhome:'Find home', g_findhomeSub:'land on the note that rests',
    // pulse
    pulse_hear:'Listen. A ball is bouncing on every beat.',
    pulse_do:'Tap anywhere in time with it.',
    pulse_name:'That steady pulse is the BEAT. Every piece of music has one.',
    pulse_feed:'{n} in a row',
    // high / low
    high_hear:'Two notes. One sits high, one sits low.',
    high_do:'Tap the wall you think is the HIGH one.',
    high_name:'How high or low a note sits is its PITCH.',
    // home
    home_hear:'Listen to this note. Everything else leans towards it.',
    home_do:'Play around, then finish on the glowing wall.',
    home_name:'That resting note is HOME. In solfège it is called DO.',
    // steps
    steps_hear:'First a line that walks to the next-door note. Now one that jumps.',
    steps_do:'Walk up the walls one at a time.',
    steps_name:'Next-door is a STEP. Jumping over notes is a SKIP.',
    // loud
    loud_hear:'The same note, soft, then loud.',
    loud_do:'Drop a ball gently, then hard.',
    loud_name:'How loud or soft a note is played is its DYNAMICS.',
    // major/minor
    maj_hear:'The same three notes. One note moves down a little.',
    maj_do:'Switch between them and listen.',
    maj_name:'One small move changes the whole feeling. That note is the THIRD.',
    // echo game
    echo_intro:'I will play a short phrase. Play it back on the walls.',
    echo_your:'your turn',
    echo_mine:'listen…',
    echo_len:'{n} notes',
    updown_ask:'Did it go up, or down?',
    up:'up', down:'down', same:'the same',
    findhome_ask:'Which wall is home?',
    solfege:'do re mi fa sol la ti',
    labelStyle:'wall labels', labelSolfege:'do re mi', labelNumbers:'1 2 3', labelOff:'off'
  }
};
let lang='en';
function t(k,vars){
  const dict=LANG[lang]||LANG.en;
  let v=dict[k]; if(v==null)v=LANG.en[k]; if(v==null)return k;
  if(Array.isArray(v))v=v[(Math.random()*v.length)|0];
  if(vars)for(const p in vars)v=v.split('{'+p+'}').join(vars[p]);
  return v;
}
function setLang(code){if(LANG[code]){lang=code;try{localStorage.setItem('slimehedron-lang',code);}catch(e){} if(_render)_render();}}
try{const sv=localStorage.getItem('slimehedron-lang');if(sv&&LANG[sv])lang=sv;}catch(e){}

// ---------------------------------------------------------------- progress (quiet, no streaks)
let prog={};
try{prog=JSON.parse(localStorage.getItem('slimehedron-learn2')||'{}');}catch(e){prog={};}
function seen(id){prog[id]=1;try{localStorage.setItem('slimehedron-learn2',JSON.stringify(prog));}catch(e){}}

// ---------------------------------------------------------------- solfège / degree labels
const SOLFEGE=['do','re','mi','fa','sol','la','ti'];
// Moveable-do solfège is defined by the INTERVAL above the tonic, not by position in the list. A major
// pentatonic is do re mi sol la -- its 4th note is SOL, not FA. Labelling by list position printed "fa"
// there, which is simply wrong, and wrong in a way a child would carry into their next instrument.
// So: read each wall's actual cents and name the interval. Chromatic degrees get the raised/lowered
// syllable, and anything genuinely microtonal falls back to a number rather than inventing a syllable.
const SOLF_BY_CENTS={0:'do',100:'ra',200:'re',300:'me',400:'mi',500:'fa',600:'fi',700:'sol',800:'le',900:'la',1000:'te',1100:'ti'};
let labelMode='solfege';
function solfegeFor(cents){
  const c=((Math.round(cents)%1200)+1200)%1200;
  let best=null,bd=1e9;
  for(const k in SOLF_BY_CENTS){const d=Math.min(Math.abs(c-k),1200-Math.abs(c-k));if(d<bd){bd=d;best=SOLF_BY_CENTS[k];}}
  return bd<=28?best:null;   // >28 cents off any 12-TET step: a quarter-tone, which has no solfège syllable
}
function wallLabels(){
  if(labelMode==='off')return null;
  const td=(typeof totalDegrees==='function')?totalDegrees():7;
  const len=(typeof scaleObj==='function')?scaleObj().c.length:7;
  const m={};
  for(let d=0;d<td;d++){
    if(labelMode==='numbers'){m[d]=String((d%len)+1);continue;}
    let c=0;try{c=centsForDegree(d);}catch(e){c=d*200;}
    m[d]=solfegeFor(c)||String((d%len)+1);
  }
  return m;
}


// ---------------------------------------------------------------- unit icons
// One glyph per idea, drawn so it says what the lesson is about without a word of text.
const _sv=(d)=>'<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" '+
  'stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">'+d+'</svg>';
function icoBeat(){  return _sv('<circle cx="6" cy="12" r="2.6"/><circle cx="12" cy="12" r="2.6"/><circle cx="18" cy="12" r="2.6"/>');} // three even pulses
function icoUpDown(){return _sv('<path d="M4 18 L10 8 L14 14 L20 5"/><path d="M17 5h3v3"/>');}                 // a line that climbs
function icoHome(){  return _sv('<path d="M4 11 L12 4 L20 11"/><path d="M7 10v9h10v-9"/>');}                   // a house
function icoSteps(){ return _sv('<path d="M3 19h4v-4h4v-4h4V7h6"/>');}                                          // a staircase
function icoEcho(){  return _sv('<path d="M4 12h3l3-6 3 12 2-6h5"/>');}                                          // a phrase, answered

// ---------------------------------------------------------------- the dock
const ov=$id('learnOverlay');
let _render=null, _cleanup=null;
function dock(html){
  if(!ov)return;
  ov.classList.add('lab');document.body.classList.add('lab-on');
  ov.innerHTML='<div class="lCard">'+html+'</div>';
}
function sheet(html){ // the old full-screen card, for menus
  if(!ov)return;
  ov.classList.remove('lab');document.body.classList.remove('lab-on');
  ov.innerHTML='<div class="lCard">'+html+'</div>';
}
function bar(title,step){
  return '<div class="labBar"><button class="labBack" data-a2="home">‹ '+t('home')+'</button>'+
    (step?'<span class="labStep">'+step+'</span>':'')+'</div>'+
    '<div class="labTitle">'+title+'</div>';
}
function dots(done,total){let h='<div class="labDots">';for(let i=0;i<total;i++)h+='<i class="'+(i<done?'got':'')+'"></i>';return h+'</div>';}
function feed(msg){const f=document.querySelector('.labFeed');if(f)f.textContent=msg||'';}

// ---------------------------------------------------------------- audio helpers (reuse the app's synth)
function note(cents,vel,dur){
  try{if(typeof freqFromCents==='function'&&typeof playNote==='function'){playNote(freqFromCents(cents),vel||90,dur||0.5);return;}}catch(e){}
  try{trigger(cents,0.7);}catch(e){}
}
// Play a scale degree AND light its key + its wall. This is the "call" half of call-and-response: the
// child watches which keys light, then presses those keys back. Without the lighting, "play it back" is
// a memory test with no visible target -- which is exactly what the first build got wrong.
function sing(d,vel,dur){
  try{note(degCents(d),vel||92,dur||0.5);}catch(e){}
  try{LAB.flash(d);}catch(e){}
  try{if(window._labKeyFlash)window._labKeyFlash(d,(dur||0.5)*620);}catch(e){}
}
function hint(d){try{if(window._labKeyHint)window._labKeyHint(d);}catch(e){}}
function praise(d){try{if(window._labKeyOK)window._labKeyOK(d);}catch(e){}}
function degCents(d){try{return centsForDegree(d);}catch(e){return d*200;}}
let _timers=[];
function later(fn,ms){const id=setTimeout(fn,ms);_timers.push(id);return id;}
function stopAll(){_timers.forEach(clearTimeout);_timers=[];try{LAB.onHit(null);}catch(e){}}

// ================================================================ UNITS
// Each unit is HEAR -> DO -> NAME. `run` gets a tiny controller so every unit reads the same way.
// A unit declares its SCALE and octave span. It never names a shape: LAB.take() sizes the polygon to the
// scale (7-note scale -> 7 sides, pentatonic -> 5, chromatic -> 12) so every note is reachable on a wall
// and on the keybed. `exact:false` is the opt-out for a lesson that is not about pitch at all.
const UNITS=[
  {id:'pulse', title:'u_pulse', sub:'u_pulseSub', tier:'lesson', run:pulseUnit,
   slime:'grn',   tint:'#9fe6cf', ico:icoBeat},
  {id:'high', title:'u_high', sub:'u_highSub', tier:'lesson', run:highUnit,
   slime:'blue1', tint:'#a6c8ff', ico:icoUpDown},
  {id:'home', title:'u_home', sub:'u_homeSub', tier:'lesson', run:homeUnit,
   slime:'pink1', tint:'#ffb6d6', ico:icoHome},
  {id:'steps', title:'u_steps', sub:'u_stepsSub', tier:'lesson', run:stepsUnit,
   slime:'violet',tint:'#c4a9f5', ico:icoSteps},
  {id:'echo', title:'g_echo', sub:'g_echoSub', tier:'game', run:echoGame,
   slime:'teal',  tint:'#8fe0d0', ico:icoEcho},
  {id:'updown', title:'g_updown', sub:'g_updownSub', tier:'game', run:upDownGame,
   slime:'orange',tint:'#ffd3a8', ico:icoUpDown},
  {id:'findhome', title:'g_findhome', sub:'g_findhomeSub', tier:'game', run:findHomeGame,
   slime:'pear1', tint:'#d9e88f', ico:icoHome}
];

// ---------- 1. BEAT: the tank drops a ball on every beat; the child taps along ----------
function pulseUnit(){
  let taps=0,run=0,last=0;
  const period=()=>60000/(S.bpm||90);
  function paint(){
    dock(bar(t('u_pulse'),'1 / 3')+
      '<p class="labSay">'+t('pulse_hear')+'</p>'+
      '<div class="labDo">'+t('pulse_do')+'</div>'+
      '<div class="labFeed"></div>'+
      '<div class="labChips"><button class="labChip" data-a2="tap">tap</button></div>'+
      '<p class="labSay" id="lb_name" hidden>'+t('pulse_name')+'</p>');
  }
  _render=paint;paint();
  LAB.take({exact:false,shape:'4',octs:1,drums:true,band:false,grav:0}); // a beat lesson wants a plain square, not a scale
  LAB.labels(null);
  const iv=setInterval(()=>{LAB.drop(0,1);last=performance.now();},period());
  _timers.push(iv);
  _cleanup=()=>clearInterval(iv);
  window._lab_tap=()=>{
    const now=performance.now(),off=Math.abs(now-last);
    if(off<period()*0.34){run++;taps++;feed(t('pulse_feed',{n:run}));}
    else{run=0;feed(t('notYet'));}
    if(run>=4){const n=$id('lb_name');if(n)n.hidden=false;seen('pulse');}
  };
}

// ---------- 2. HIGH & LOW ----------
function highUnit(){
  let round=0,got=0;const td=()=>totalDegrees();
  function ask(){
    const lo=0,hi=Math.max(1,td()-1); // lowest and highest note of the shape
    const first=Math.random()<0.5?lo:hi;
    LAB.take({scale:'major',octs:1,drums:false,band:false});
    LAB.labels(null);
    later(()=>sing(first,90,.6),200);
    later(()=>sing(first===lo?hi:lo,90,.6),950);
    dock(bar(t('u_high'),(round+1)+' / 3')+dots(got,3)+
      '<p class="labSay">'+t('high_hear')+'</p>'+
      '<div class="labDo">'+t('high_do')+'</div>'+
      '<div class="labFeed"></div>'+
      '<div class="labChips">'+
        '<button class="labChip" data-a2="hi_up">'+t('up')+'</button>'+
        '<button class="labChip" data-a2="hi_dn">'+t('down')+'</button>'+
        '<button class="labChip" data-a2="hi_replay">'+t('listen')+'</button></div>'+
      '<p class="labSay" id="lb_name" hidden>'+t('high_name')+'</p>');
    window._lab_hi=(guess)=>{
      const wentUp=(first===lo);
      if((guess==='up')===wentUp){got++;round++;feed(t('yes'));
        LAB.drop(wentUp?hi:lo,1);
        if(got>=3){const n=$id('lb_name');if(n)n.hidden=false;seen('high');}
        else later(ask,1100);
      }else{feed(t('notYet'));later(()=>{note(degCents(first),90,.6);later(()=>note(degCents(first===lo?hi:lo),90,.6),750);},300);}
    };
    window._lab_hiReplay=()=>{note(degCents(first),90,.6);later(()=>note(degCents(first===lo?hi:lo),90,.6),750);};
  }
  _render=ask;ask();
}

// ---------- 3. HOME NOTE (tonic) ----------
function homeUnit(){
  LAB.take({scale:'major',octs:1,drums:false,band:true});
  LAB.labels(wallLabels());
  let landed=0;
  function paint(){
    dock(bar(t('u_home'),'')+
      '<p class="labSay">'+t('home_hear')+'</p>'+
      '<div class="labDo">'+t('home_do')+'</div>'+
      '<div class="labFeed"></div>'+
      labelPicker()+
      '<p class="labSay" id="lb_name" hidden>'+t('home_name')+'</p>');
  }
  _render=paint;paint();
  hint(0);
  const pulse=setInterval(()=>{LAB.flash(0);if(window._labKeyFlash)window._labKeyFlash(0,260);},900);
  _timers.push(pulse);
  _cleanup=()=>{clearInterval(pulse);hint(null);};
  LAB.onHit((deg)=>{
    const len=scaleObj().c.length;
    if(((deg%len)+len)%len===0){praise(deg);landed++;feed(t('yes'));
      if(landed>=3){const n=$id('lb_name');if(n)n.hidden=false;seen('home');}}
  });
}

// ---------- 4. STEPS & SKIPS ----------
function stepsUnit(){
  LAB.take({scale:'major',octs:1,drums:false,band:false});
  LAB.labels(wallLabels());
  let seq=[],want=0;
  function paint(){
    dock(bar(t('u_steps'),'')+
      '<p class="labSay">'+t('steps_hear')+'</p>'+
      '<div class="labDo">'+t('steps_do')+'</div>'+
      '<div class="labFeed"></div>'+
      '<div class="labChips"><button class="labChip" data-a2="st_demo">'+t('listen')+'</button></div>'+
      '<p class="labSay" id="lb_name" hidden>'+t('steps_name')+'</p>');
  }
  _render=paint;paint();
  window._lab_stepsDemo=()=>{for(let i=0;i<5;i++)later(()=>sing(i,88,.45),i*330);
    later(()=>{for(let i=0;i<3;i++)later(()=>sing(i*2,88,.45),i*380);},2100);};
  LAB.onHit((deg)=>{
    const len=scaleObj().c.length,d=((deg%len)+len)%len;
    if(d===want){praise(d);want++;feed(t('yes'));hint(want<4?want:null);
      if(want>=4){const n=$id('lb_name');if(n)n.hidden=false;seen('steps');}}
    else if(d===0){want=1;hint(1);}
  });
}

// ---------- GAME: ECHO (the flagship — call & response with varied repetition) ----------
function echoGame(){
  LAB.take({scale:'pentaMaj',octs:1,drums:false,band:false}); // 5 notes -> a pentagon, one wall each
  LAB.labels(wallLabels());
  let len=2,phrase=[],idx=0,mine=true,best=0;
  function playable(){ // the degrees this shape can actually sound, low to high
    const p=(window.LAB&&LAB._playable&&LAB._playable.length)?LAB._playable.slice():null;
    if(p&&p.length)return p;
    const td=(typeof totalDegrees==='function')?totalDegrees():5;
    return Array.from({length:td},(_,i)=>i);
  }
  function newPhrase(){
    const pool=playable(),n=pool.length;
    phrase=[];let k=Math.floor(Math.random()*n);      // index INTO the playable set, not a raw degree
    for(let i=0;i<len;i++){
      // mostly steps, occasional skip -- a singable shape, and it VARIES every round (the research point:
      // varied repetition, not the same drill again)
      const move=(Math.random()<0.7?1:2)*(Math.random()<0.5?-1:1);
      k=Math.max(0,Math.min(n-1,i===0?k:k+move));
      phrase.push(pool[k]);}
  }
  function playPhrase(){
    mine=true;idx=0;paint();
    hint(null);
    phrase.forEach((d,i)=>later(()=>{sing(d,92,.5);
      if(i===phrase.length-1)later(()=>{mine=false;paint();hint(phrase[0]);},520);},i*520));
  }
  function paint(){
    dock(bar(t('g_echo'),t('echo_len',{n:len}))+dots(Math.max(0,len-2),5)+
      '<p class="labSay">'+t('echo_intro')+'</p>'+
      '<div class="labDo">'+(mine?t('echo_mine'):t('echo_your'))+'</div>'+
      '<div class="labFeed"></div>'+
      '<div class="labChips">'+
        '<button class="labChip" data-a2="ec_replay">'+t('listen')+'</button>'+
        '<button class="labChip" data-a2="ec_next">'+t('again')+'</button></div>'+
      labelPicker());
  }
  _render=paint;
  window._lab_ecReplay=()=>playPhrase();
  window._lab_ecNext=()=>{newPhrase();playPhrase();};
  LAB.onHit((deg)=>{
    if(mine)return;
    const td=totalDegrees(),d=((deg%td)+td)%td;
    if(d===phrase[idx]){praise(d);idx++;
      if(idx>=phrase.length){feed(t('yes'));best=Math.max(best,len);hint(null);
        seen('echo');
        if(len<6)len++;
        later(()=>{newPhrase();playPhrase();},1200);}
      else hint(phrase[idx]);                       // always show the next target
    }else{ // NO fail state: just replay it and invite another go
      feed(t('notYet'));idx=0;hint(null);later(playPhrase,900);}
  });
  newPhrase();later(playPhrase,500);
}

// ---------- GAME: UP OR DOWN ----------
function upDownGame(){
  LAB.take({scale:'major',octs:1,drums:false,band:false});LAB.labels(null);
  let a=0,b=0,got=0;
  function ask(){
    const td=totalDegrees();
    a=Math.floor(Math.random()*td);
    do{b=Math.floor(Math.random()*td);}while(b===a);
    later(()=>{sing(a,90,.5);later(()=>sing(b,90,.5),620);},250);
    paint();
  }
  function paint(){
    dock(bar(t('g_updown'),'')+dots(got,5)+
      '<p class="labSay">'+t('updown_ask')+'</p>'+
      '<div class="labFeed"></div>'+
      '<div class="labChips">'+
        '<button class="labChip" data-a2="ud_up">'+t('up')+'</button>'+
        '<button class="labChip" data-a2="ud_dn">'+t('down')+'</button>'+
        '<button class="labChip" data-a2="ud_replay">'+t('listen')+'</button></div>');
  }
  _render=paint;
  window._lab_ud=(g)=>{const up=b>a;
    if((g==='up')===up){got++;feed(t('yes'));LAB.drop(b,1);seen('updown');later(ask,1000);}
    else{feed(t('notYet'));later(()=>{note(degCents(a),90,.5);later(()=>note(degCents(b),90,.5),620);},300);}};
  window._lab_udReplay=()=>{sing(a,90,.5);later(()=>sing(b,90,.5),620);};
  ask();
}

// ---------- GAME: FIND HOME ----------
function findHomeGame(){
  LAB.take({scale:'major',octs:1,drums:false,band:true});LAB.labels(wallLabels());
  let got=0;
  function paint(){
    dock(bar(t('g_findhome'),'')+dots(got,5)+
      '<p class="labSay">'+t('findhome_ask')+'</p>'+
      '<div class="labDo">'+t('home_do')+'</div>'+
      '<div class="labFeed"></div>'+labelPicker());
  }
  _render=paint;paint();
  // a cadence that leans hard toward home, then the child has to land there
  hint(0);
  function cue(){const len=scaleObj().c.length;
    sing(4%len,86,.45);later(()=>sing(len-3,86,.45),420);}
  cue();const iv=setInterval(cue,5200);_timers.push(iv);_cleanup=()=>clearInterval(iv);
  LAB.onHit((deg)=>{const len=scaleObj().c.length;
    if(((deg%len)+len)%len===0){praise(deg);got++;feed(t('yes'));seen('findhome');}
    else feed(t('notYet'));});
}

// ---------------------------------------------------------------- wall-label switcher
function labelPicker(){
  const opt=(v,k)=>'<button class="labChip'+(labelMode===v?' on':'')+'" data-a2="lbl" data-v="'+v+'">'+t(k)+'</button>';
  return '<div class="labChips" style="margin-top:auto">'+
    opt('solfege','labelSolfege')+opt('numbers','labelNumbers')+opt('off','labelOff')+'</div>';
}

// ---------------------------------------------------------------- home screen (3 tiers)
function home(){
  stopAll();if(_cleanup){_cleanup();_cleanup=null;}
  try{LAB.give();}catch(e){}
  const total=UNITS.length,done=UNITS.filter(u=>prog[u.id]).length;
  const card=(u)=>{
    const got=!!prog[u.id];
    return '<button class="uCard'+(got?' got':'')+'" data-a2="unit" data-u="'+u.id+'" '+
      'style="--ut:'+u.tint+'" aria-label="'+t(u.title)+'">'+
      '<span class="uArt"><img src="minis/'+u.slime+'.png" alt="" draggable="false"></span>'+
      '<span class="uTxt"><b>'+t(u.title)+'</b><i>'+t(u.sub)+'</i></span>'+
      '<span class="uIco">'+u.ico()+'</span>'+
      (got?'<span class="uDone" aria-hidden="true">\u2713</span>':'')+
      '</button>';
  };
  let h='<div class="uHead">'+
    '<img class="uHeadArt" src="slimelogo.png" alt="" draggable="false">'+
    '<span><b>'+t('tierLessons')+'</b><i>'+t('progressOf',{done:done,total:total})+'</i></span></div>';
  for(const [tier,tk,tsk] of [['lesson','tierLessons','tierLessonsSub'],['game','tierGames','tierGamesSub']]){
    h+='<div class="uSec"><span class="uSecT">'+t(tk)+'</span><span class="uSecS">'+t(tsk)+'</span></div>'+
       '<div class="uGrid">'+UNITS.filter(x=>x.tier===tier).map(card).join('')+'</div>';
  }
  h+='<p class="uFoot">'+t('noRush')+'</p>';
  sheet(h);
  _render=home;
}

// ---------------------------------------------------------------- events
if(ov)ov.addEventListener('click',(e)=>{
  const b=e.target.closest('[data-a2]');if(!b)return;
  const a=b.dataset.a2;
  if(a==='home'){home();return;}
  if(a==='unit'){const u=UNITS.find(x=>x.id===b.dataset.u);if(!u)return;
    stopAll();if(_cleanup){_cleanup();_cleanup=null;}
    try{initAudio();if(AC&&AC.state==='suspended')AC.resume();}catch(err){}
    u.run();return;}
  if(a==='lbl'){labelMode=b.dataset.v;try{LAB.labels(wallLabels());}catch(err){}
    try{if(window._labKeysBuild)window._labKeysBuild();}catch(err){}
    if(_render)_render();return;}
  if(a==='tap'&&window._lab_tap)return window._lab_tap();
  if(a==='hi_up'&&window._lab_hi)return window._lab_hi('up');
  if(a==='hi_dn'&&window._lab_hi)return window._lab_hi('down');
  if(a==='hi_replay'&&window._lab_hiReplay)return window._lab_hiReplay();
  if(a==='st_demo'&&window._lab_stepsDemo)return window._lab_stepsDemo();
  if(a==='ec_replay'&&window._lab_ecReplay)return window._lab_ecReplay();
  if(a==='ec_next'&&window._lab_ecNext)return window._lab_ecNext();
  if(a==='ud_up'&&window._lab_ud)return window._lab_ud('up');
  if(a==='ud_dn'&&window._lab_ud)return window._lab_ud('down');
  if(a==='ud_replay'&&window._lab_udReplay)return window._lab_udReplay();
});
// tapping the tank itself counts as a tap in the beat unit
if(typeof cv!=='undefined'&&cv)cv.addEventListener('pointerdown',()=>{if(window._lab_tap&&document.body.classList.contains('lab-on'))window._lab_tap();});

function enter(){ if(ov){ov.hidden=false;} home(); }
function exit(){ stopAll(); if(_cleanup){_cleanup();_cleanup=null;}
  try{LAB.give();}catch(e){}
  if(ov){ov.hidden=true;ov.classList.remove('lab');}
  document.body.classList.remove('lab-on'); }
return {enter,exit,home,setLang,t,LANG,UNITS,_labels:wallLabels};
})();

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

   5. NOTHING IMPORTANT IS TEXT-ONLY. Google's own guidance for children's apps is blunt about this:
      "Most kids under 5 can't read", and it tells you to avoid text-only buttons and to point at the
      answer with "visual hints like arrows, highlights, or pulses"
      (developers.google.com/building-for-kids/designing-engaging-apps). Every leading product obeys it a
      different way - Simply Piano and Prodigies open each lesson with a VIDEO instead of a sentence,
      Duolingo Music's first screen is a five-key keyboard with the target key highlighted AND labelled.
      We cannot ship video, so every instruction here is SPOKEN ALOUD (speech(), below - the browser's
      own voice, no network, no files) while the target wall and key glow. The written line stays for
      the adult reading over the child's shoulder; it is never the only channel.

   6. EVERY LESSON ENDS, AND THE ENDING IS AN EVENT. Simply Piano sells "5-Min Workouts", Melodics'
      daily unit is 5 minutes, Prodigies calls its preschool lessons "bite-sized... made for preschool
      attention spans", and Duolingo fires a fixed multi-part reward the moment a unit closes. An
      open-ended drill that never says "done" is the one shape none of them ship. So every unit here
      declares how much is enough, and finish() gives it a fanfare, a slime, the concept's name, and a
      door to the next lesson.

   7. RELATIVE, NOT ABSOLUTE. Degrees and solfège (do re mi) come before letter names, so what is
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
    _name:'English', _dir:'ltr', _voice:'en-US',
    back:'back', home:'lessons', next:'next', again:'again', listen:'listen', imReady:"I'm ready",
    tierLessons:'Lessons', tierPractice:'Practice', tierGames:'Games',
    progressOf:'{done} of {total} done',
    // encouragement — process, never talent, and never a scolding
    // PROCESS PRAISE ONLY. Kamins & Dweck (Dev. Psych. 1999) tested five-year-olds and found that
    // PERSON-directed feedback — even positive person praise like "you're so musical" — produced more
    // helpless responses, lower persistence and more negative affect than process feedback, because it
    // makes self-worth contingent on the last result. So every line here describes what the child DID.
    // Nothing in this file may ever tell a child what they ARE.
    yes:['got it','that is the one','you found it','yes'],
    notYet:['not that one. here it is again','listen again, then try','close. one more go'],
    onceMore:'one more round',
    noRush:'take your time',
    // units
    u_pulse:'Beat', u_pulseSub:'tap in time',
    u_sayplay:'Say it first', u_sayplaySub:'say the rhythm, then play it',
    u_high:'High and low', u_highSub:'which note is higher',
    u_notes:'Find the note', u_notesSub:'two notes, then three, then five',
    u_home:'Home note', u_homeSub:'the note a tune ends on',
    u_steps:'Steps and skips', u_stepsSub:'walk up, one at a time',
    u_newhome:'New home', u_newhomeSub:'same five notes, different home',
    u_majorscale:'The major scale', u_majorscaleSub:'add fa, then ti',
    u_brightdark:'Bright and dark', u_brightdarkSub:'major and minor',
    u_minorscale:'Minor scale', u_minorscaleSub:'the dark seven',
    u_minorshapes:'Minor shapes', u_minorshapesSub:'harmonic, then melodic',
    u_modes:'Modes', u_modesSub:'dorian, then mixolydian',
    u_review:'Review', u_reviewSub:'notes from other days',
    // say-it-first: the METHOD is borrowed (konnakol, bols, kuchi shoga, gu-eum, usul all vocalise a
    // rhythm before playing it); the SYLLABLES are English so the child is saying words they own.
    // They still follow Hughes 2000's acoustic logic: voiced stop + back vowel for the low drum,
    // voiceless stop + front vowel for the high one, so the word sounds like the drum.
    sp_low:'BOOM', sp_high:'TAP',
    sp_hear:'BOOM is the low drum. TAP is the high one.',
    sp_say:'Say it out loud, then tap it.',
    sp_name:'Say a rhythm before you play it. It makes it easier.',
    // --- what each lesson says, one short line, the thing to DO at the end of it ---
    high_do:'Tap the note you hear.',
    high_name:'How high a note sits is its PITCH.',
    nt_do:'Tap the note you hear.',
    nt_p1:'a new note on top', nt_p2:'a new note at the bottom', nt_p3:'one more, and that is all five',
    nt_name:'DO RE MI SO LA. That is a PENTATONIC SCALE.',
    home_do:'Tap the note that finishes it.',
    home_name:'That note is HOME. Its name is DO.',
    steps_do:'Walk up the ladder, one rung at a time.',
    steps_name:'Next rung is a STEP. Jumping one is a SKIP.',
    sad_do:'Tap the note you hear.',
    sad_name:'Same five notes, new home. That is the MINOR PENTATONIC.',
    ms_do:'Tap the note you hear.',
    ms_p1:'one more note, under do',
    ms_name:'Seven notes. That is the MAJOR SCALE.',
    bd_hear:'Three notes. Only the middle one moves.',
    bd_do:'Bright, or dark?',
    bd_name:'Middle note high is MAJOR. Middle note low is MINOR.',
    bright:'bright', dark:'dark',
    mn_do:'Tap the note you hear.',
    mn_name:'This is the MINOR SCALE. Its other name is AEOLIAN.',
    sh_do:'Tap the note you hear.',
    sh_p1:'now the melodic one',
    sh_name:'Lift the seventh: HARMONIC MINOR. Lift two: MELODIC MINOR.',
    md_do:'Tap the note you hear.',
    md_p1:'now mixolydian',
    md_name:'DORIAN is minor with a bright sixth. MIXOLYDIAN is major with a soft seventh.',
    rev_hear:'A note from another day.',
    rev_do:'Find it again.',
    rev_name:'You still had it.',
    rev_none:'nothing to review yet',
    rev_noneSub:'Finish a lesson. Come back tomorrow.',
    g_echo:'Echo', g_echoSub:'play back what you hear',
    g_updown:'Up or down', g_updownSub:'which way did it go',
    g_findhome:'Find home', g_findhomeSub:'find do',
    // ---- the four lesson blocks, in order ----
    blockA:'First notes', blockB:'More notes', blockC:'Minor keys', blockD:'Modes',
    bright:'bright', dark:'dark',
    u_sadfive:'Sad five', u_sadfiveSub:'same notes, new home',
    sad_hear:'The same five notes. A different one is home.',
    sad_do:'Find the note you hear.',
    sad_name:'Same notes, new home. That is the MINOR PENTATONIC.',
    u_movehome:'Move the home', u_movehomeSub:'so is home now',
    mv_hear:'Same five notes. Now SO is home.',
    mv_do:'Play, then end on the glowing wall.',
    mv_name:'Move the home note and the mood moves with it.',
    u_addfa:'Add fa', u_addfaSub:'six notes now',
    fa_hear:'A new note between mi and so.',
    fa_do:'Find the note you hear.',
    fa_name:'That one is FA. Six notes: DO RE MI FA SO LA.',
    u_addti:'Add ti', u_addtiSub:'the major scale',
    ti_hear:'One more note, just under do.',
    ti_do:'Find the note you hear.',
    ti_name:'That one is TI. Seven notes. This is the MAJOR SCALE.',
    u_brightdark:'Bright and dark', u_brightdarkSub:'major and minor',
    bd_hear:'Three notes. Only the middle one moves.',
    bd_do:'Bright, or dark?',
    bd_name:'Middle note high is MAJOR. Middle note low is MINOR.',
    u_minorscale:'Minor scale', u_minorscaleSub:'the dark seven',
    mn_hear:'Seven notes, starting from la.',
    mn_do:'Find the note you hear.',
    mn_name:'This is the MINOR SCALE.',
    u_harmminor:'Harmonic minor', u_harmminorSub:'lift the last note',
    hm_hear:'Minor, with the last note lifted.',
    hm_do:'Find the note you hear.',
    hm_name:'Lift the seventh and you get HARMONIC MINOR.',
    u_melminor:'Melodic minor', u_melminorSub:'two notes lift',
    ml_hear:'Minor, with two notes lifted near the top.',
    ml_do:'Find the note you hear.',
    ml_name:'Two lifted notes: MELODIC MINOR.',
    u_aeolian:'Aeolian', u_aeolianSub:'minor, other name',
    ae_hear:'You know this one already.',
    ae_do:'Find the note you hear.',
    ae_name:'The minor scale has another name: AEOLIAN. It is a MODE.',
    u_dorian:'Dorian', u_dorianSub:'minor, one bright note',
    dor_hear:'Minor, but the sixth note is brighter.',
    dor_do:'Find the note you hear.',
    dor_name:'Minor with a bright sixth is DORIAN.',
    u_mixo:'Mixolydian', u_mixoSub:'major, one soft note',
    mix_hear:'Major, but the seventh note is softer.',
    mix_do:'Find the note you hear.',
    mix_name:'Major with a soft seventh is MIXOLYDIAN.',
    // pulse
    // instruction copy: ONE short sentence, and the thing to DO goes at the end of it (Sesame
    // Workshop's tablet guidance for pre-readers). Narrated as well as shown -- narration beats
    // on-screen text by a wide margin in the multimedia literature (modality effect, g=0.82).
    pulse_hear:'A ball drops on every beat.',
    pulse_do:'When the ball lands, tap the slime.',
    pulse_name:'That steady drop is the BEAT.',
    pulse_feed:'{n} in a row',
    pulse_good:'yes', pulse_great:'right on it',
    // high / low
    high_hear:'Two notes. One high, one low.',
    high_do:'Tap the HIGH one.',
    high_name:'High or low is called PITCH.',
    // home
    home_hear:'This note sounds finished.',
    home_do:'Play, then end on the glowing wall.',
    home_name:'That note is HOME. Its name is DO.',
    // so and mi
    somi_hear:'Two notes, close together.',
    somi_do:'Play the note that glows.',
    somi_name:'The high one is SO. The low one is MI.',
    // add la
    addla_hear:'A new note on top.',
    addla_do:'Listen, then play it back.',
    addla_name:'That one is LA. Now you have SO, MI and LA.',
    // all five
    five_hear:'One more note. Now there are five.',
    five_do:'Find the note you hear.',
    five_name:'DO RE MI SO LA. That is a PENTATONIC SCALE.',
    // review
    rev_hear:'A note from another day.',
    rev_do:'Find it again.',
    rev_name:'You still had it.',
    rev_none:'nothing to review yet',
    rev_noneSub:'Finish a lesson. Come back tomorrow.',
    // steps
    steps_hear:'One tune walks. One jumps.',
    steps_do:'Walk up the walls, one at a time.',
    steps_name:'Next door is a STEP. Jumping is a SKIP.',
    // loud
    loud_hear:'The same note, soft, then loud.',
    loud_do:'Drop a ball softly, then hard.',
    loud_name:'Soft or loud is called DYNAMICS.',
    // major/minor
    maj_hear:'The same three notes. One moves down.',
    maj_do:'Switch between them and listen.',
    maj_name:'The note that moved is the THIRD. It sets the mood.',
    // echo game
    echo_intro:'Listen, then play it back on the walls.',
    echo_your:'your turn',
    echo_mine:'listen…',
    echo_len:'{n} notes',
    updown_ask:'Did it go up, or down?',
    up:'up', down:'down', same:'the same',
    findhome_ask:'Which wall is home?',
    solfege:'do re mi fa sol la ti',
    labelStyle:'wall labels', labelSolfege:'do re mi', labelNumbers:'1 2 3', labelOff:'off',
    // the ending beat
    doneTitle:'you did it!', nextLesson:'next lesson', doneAgain:'do it again', startHere:'start here',
    revReady:'ready',
    // spoken-voice controls
    voiceReplay:'say it again', voiceOn:'voice on', voiceOff:'voice off'
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

// ---------------------------------------------------------------- SPOKEN INSTRUCTIONS
// A five-year-old cannot read the instruction, so the instruction is said out loud. This uses the
// browser's built-in speechSynthesis: it is offline, it ships no audio files, and it makes no network
// request - which matters here, because this app is deliberately request-free.
// The line is DEDUPED: a unit that repaints its screen every round must not read the same sentence at
// the child ten times. Only a genuinely new line speaks.
let voiceOn=true;
try{const v=localStorage.getItem('slimehedron-voice');if(v!=null)voiceOn=(v==='1');}catch(e){}
let _lastSaid='';
// The default voice an OS hands back first is usually its worst one. Prefer a named natural voice,
// then any LOCAL voice in the right language (local ones are the higher-quality installed set on
// every platform I can check), and only fall back to the default if there is nothing better.
let _voice=null,_voiceTried=false;
const GOOD_VOICES=[/natural/i,/google uk english female/i,/google us english/i,/samantha/i,/karen/i,
                   /moira/i,/serena/i,/zira/i,/aria/i,/libby/i,/sonia/i,/jenny/i];
function pickVoice(synth){
  if(_voice||_voiceTried&&!synth.getVoices().length)return _voice;
  const all=synth.getVoices()||[]; if(!all.length)return null;
  _voiceTried=true;
  const want=((LANG[lang]&&LANG[lang]._voice)||'en-US').slice(0,2).toLowerCase();
  const inLang=all.filter(v=>(v.lang||'').slice(0,2).toLowerCase()===want);
  const pool=inLang.length?inLang:all;
  for(const re of GOOD_VOICES){const hit=pool.find(v=>re.test(v.name||''));if(hit){_voice=hit;return _voice;}}
  _voice=pool.find(v=>v.localService)||pool[0]||null;
  return _voice;
}
try{if(window.speechSynthesis)speechSynthesis.addEventListener('voiceschanged',()=>{_voice=null;_voiceTried=false;});}catch(e){}
function speech(txt,force){
  if(!txt||!voiceOn)return;
  if(!force&&txt===_lastSaid)return;
  _lastSaid=txt;
  try{
    const synth=window.speechSynthesis; if(!synth)return;   // no voice on this device: the text is still there
    synth.cancel();
    const u=new SpeechSynthesisUtterance(String(txt));
    u.lang=(LANG[lang]&&LANG[lang]._voice)||'en-US';
    const v=pickVoice(synth); if(v)u.voice=v;
    u.rate=0.86; u.pitch=1.0; u.volume=1;
    synth.speak(u);
  }catch(e){}
}
function speechStop(){try{if(window.speechSynthesis)window.speechSynthesis.cancel();}catch(e){}}
function setVoice(on){voiceOn=!!on;try{localStorage.setItem('slimehedron-voice',voiceOn?'1':'0');}catch(e){}
  if(!voiceOn)speechStop(); else {_lastSaid='';sayScreen();}}
// read whatever the current card is asking for, from the DOM - so no unit has to remember to pass a key
function sayScreen(force){
  if(!ov)return;
  // NOTE: do not filter on offsetParent here. dock() calls this in the same tick it reveals the card,
  // and the layout box is not settled yet - which made every lesson silent. The `hidden` attribute is
  // the real signal (it is what hides the not-yet-earned NAME line), and it is reliable immediately.
  // .lgSay is the stage lessons' instruction line; without it every lesson that owns its own screen
  // was silent, which is the whole point of the feature for a child who cannot read yet.
  const parts=[...ov.querySelectorAll('.ldTitle,.labSay,.labDo,.lgSay')]
    .filter(e=>!e.hidden).map(e=>e.textContent.trim().replace(/[.\s]+$/,'')).filter(Boolean);
  speech(parts.join('. '),force);
}

// ---------------------------------------------------------------- progress, mastery and spacing
// Three things live here, each one traceable to a finding rather than a hunch.
//
// MASTERY, not attendance. The EEF's Teaching & Learning Toolkit puts mastery learning at +5 months of
// additional progress over a year across 80 studies, and +8 months specifically at primary age -- our
// band -- but it attaches a condition: the effect is attributed to a HIGH bar, "usually 80% to 90%".
// A lesson that ends after three lucky taps is attendance, not mastery. So every answerable unit keeps
// hits/tries and only counts as learned at >=80% over a real number of attempts.
// (EEF rates its own evidence LOW. Worth saying out loud rather than hiding.)
//
// SPACING AT THE DAY BOUNDARY, not inside the session. Simmons (JRME 2012) found accuracy gains in
// piano sequence learning ONLY in the 24-hour condition -- 5-minute and 6-hour gaps gave speed but not
// accuracy. Wiseheart et al. (PLOS ONE 2017) then found NO spacing effect at all for lags of 0-15
// minutes, and explained why: nothing had been forgotten yet. So shuffling items within one sitting is
// wasted effort. What earns its keep is a review that comes back TOMORROW -- which is what `due()` is.
const MASTERY=0.8, MIN_TRIES=8, DAY=864e5;
let prog={};
try{prog=JSON.parse(localStorage.getItem('slimehedron-learn2')||'{}');}catch(e){prog={};}
// old saves stored `1`; normalise so a returning child keeps their progress
for(const k in prog)if(prog[k]===1)prog[k]={hits:MIN_TRIES,tries:MIN_TRIES,at:0};
function save(){try{localStorage.setItem('slimehedron-learn2',JSON.stringify(prog));}catch(e){}}
function rec(id){return prog[id]||(prog[id]={hits:0,tries:0,at:0});}
function score(id,right){const r=rec(id);r.tries++;if(right)r.hits++;save();}
function acc(id){const r=prog[id];return (r&&r.tries)?r.hits/r.tries:0;}
function got(id){const r=prog[id];return !!(r&&r.tries>=MIN_TRIES&&r.hits/r.tries>=MASTERY);}
function seen(id){const r=rec(id);r.at=Date.now();
  // finishing a unit means you cleared its bar; if a child got there on fewer attempts, credit it
  if(r.tries<MIN_TRIES){r.hits+=MIN_TRIES-r.tries;r.tries=MIN_TRIES;}
  save();}
// units learned at least a day ago, oldest first: what a review session should ask about
function due(){const now=Date.now();
  return UNITS.filter(u=>u.tier==='lesson'&&got(u.id)&&(now-(prog[u.id].at||0))>=DAY)
              .sort((a,b)=>(prog[a.id].at||0)-(prog[b.id].at||0));}

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
function icoEcho(){  return _sv('<path d="M4 12h3l3-6 3 12 2-6h5"/>');}
function icoTwo(){   return _sv('<circle cx="8" cy="8" r="2.6"/><circle cx="16" cy="16" r="2.6"/><path d="M10 9.6 14 14.4"/>');} // two notes, one falling to the other
function icoThree(){ return _sv('<circle cx="5" cy="16" r="2.2"/><circle cx="12" cy="9" r="2.2"/><circle cx="19" cy="13" r="2.2"/>');}
function icoFive(){  return _sv('<path d="M3 18h2v-3h2v-4h2V8h2v3h2v4h2v3h2"/>');}                              // five steps
function icoReview(){return _sv('<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v5h-5"/>');}                // come round again                                          // a phrase, answered
function icoMouth(){ return _sv('<path d="M4 10c3-4 13-4 16 0"/><path d="M6 13h12"/><path d="M8.5 17h7"/>');}      // say it out loud

// ---------------------------------------------------------------- the dock
const ov=$id('learnOverlay');
let _render=null, _cleanup=null;
function dock(html){
  if(!ov)return;
  stageOff();
  ov.classList.add('lab');document.body.classList.add('lab-on');
  ov.innerHTML='<div class="lCard">'+html+'</div>';
  sayScreen();   // deduped inside: a repaint of the same screen is silent
}
// A lesson that needs its own interface renders here instead of into the shared card. Nothing from
// the tank rig comes with it -- see the lab-stage rules in index.html for why.
let _lastTitle='';
function stage(html){
  if(!ov)return;
  ov.classList.remove('lab');ov.classList.add('stage');
  document.body.classList.add('lab-on','lab-stage');
  ov.innerHTML='<div class="lgStage">'+html+'</div>';
  // Several lessons share an instruction line ("Tap the note you hear."), and the speech dedupe
  // then swallowed it on entry to the next one. A change of TITLE means a new lesson, so it speaks.
  const ttl=(ov.querySelector('.lgTop h3')||{}).textContent||'';
  if(ttl!==_lastTitle){_lastTitle=ttl;_lastSaid='';}
  sayScreen();
}
function stageOff(){
  if(ov)ov.classList.remove('stage');
  document.body.classList.remove('lab-stage');
}
function sheet(html){ // the old full-screen card, for menus
  if(!ov)return;
  stageOff();
  ov.classList.remove('lab');document.body.classList.remove('lab-on');
  ov.innerHTML='<div class="lCard">'+html+'</div>';
}
const SPK='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.1" '+
  'stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9.5a3.5 3.5 0 0 1 0 5"/></svg>';
function bar(title,step){
  // the speaker is a REPLAY button, not a mute: a child who missed the instruction taps it to hear it
  // again. Muting lives on the lessons screen, where a parent will look for it.
  return '<div class="labBar"><button class="labBack" data-a2="home">‹ '+t('home')+'</button>'+
    (step?'<span class="labStep">'+step+'</span>':'')+
    '<button class="labSpk" data-a2="say" aria-label="'+t('voiceReplay')+'" title="'+t('voiceReplay')+'">'+SPK+'</button>'+
    '</div>'+
    '<div class="labTitle">'+title+'</div>';
}
function dots(done,total){let h='<div class="labDots">';for(let i=0;i<total;i++)h+='<i class="'+(i<done?'got':'')+'"></i>';return h+'</div>';}
function feed(msg){const f=document.querySelector('.labFeed');if(f)f.textContent=msg||'';}
// feed() is also used for running counters ("3 in a row"), which must NOT be read aloud every tap.
// cheer() is the spoken kind: the praise and the try-again lines, and only those.
function cheer(msg){feed(msg);speech(msg,true);}

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

// ---------------------------------------------------------------- THE ENDING
// Every unit finishes here. Not "the name text appears and the drill carries on forever" - an actual
// event: a rising fanfare on the real synth, a burst of balls in the tank, the child's slime, the
// concept named out loud, and a door straight into the next lesson. This is the beat every leading
// product fires at the close of a unit, and it is the one shape an endless drill can never have.
function finish(id,nameLine){
  seen(id);
  stopAll(); if(_cleanup){_cleanup();_cleanup=null;}
  try{LAB.onHit(null);}catch(e){}
  const u=UNITS.find(x=>x.id===id)||{},i=UNITS.findIndex(x=>x.id===id),nx=UNITS[i+1];
  [0,2,4,7].forEach((d,k)=>later(()=>{try{sing(d,96,.5);}catch(e){}},k*165));   // a rising fanfare
  later(()=>{try{for(let k=0;k<5;k++)later(()=>LAB.drop(k%4,1),k*90);}catch(e){}},760); // and a shower of balls
  dock('<div class="labDone">'+
    '<img class="ldArt" src="minis/'+(u.slime||'grn')+'.png" alt="" draggable="false">'+
    '<b class="ldTitle">'+t('doneTitle')+'</b>'+
    (nameLine?'<p class="labSay">'+nameLine+'</p>':'')+
    '<div class="labChips">'+
      (nx?'<button class="labChip on" data-a2="nextu" data-u="'+nx.id+'">'+t(nx.title)+' \u203a</button>':'')+
      '<button class="labChip" data-a2="again" data-u="'+id+'">'+t('doneAgain')+'</button>'+
      '<button class="labChip" data-a2="home">'+t('home')+'</button>'+
    '</div></div>');
}

// ================================================================ UNITS
// Each unit is HEAR -> DO -> NAME. `run` gets a tiny controller so every unit reads the same way.
// A unit declares its SCALE and octave span. It never names a shape: LAB.take() sizes the polygon to the
// scale (7-note scale -> 7 sides, pentatonic -> 5, chromatic -> 12) so every note is reachable on a wall
// and on the keybed. `exact:false` is the opt-out for a lesson that is not about pitch at all.
// A NOTE ON WHICH NOTES, AND IN WHAT ORDER ---------------------------------------------------------
// The first build of this curriculum put lesson 2 onward on the MAJOR scale. That is backwards, and
// every published sequence says so. Kodaly reaches fa in Grade 3 and ti in Grade 4; Orff physically
// REMOVES the F and B bars from the child's instrument; both give the same reason -- those are the two
// semitone-making notes, the only ones that can sound wrong. Putting a five-year-old's first pitch
// lesson on a seven-note scale containing both of them is starting at the hard end.
//
// So the pitch units live in MAJOR PENTATONIC (do re mi so la), and each one uses only the degrees it
// has earned. That is Orff's actual mechanism: the instrument has five bars, the lesson uses two of
// them, and no combination of anything on it sounds wrong. The no-fail state is in the MATERIAL, not
// bolted onto the interface.
//
// The order below is not borrowed from any one book -- it is where the published sequences AGREE
// (Kodaly, Orff, Gordon, Dalcroze, Suzuki), which makes it a fact about the field rather than a copy
// of anyone's expression:
//   beat and body  ->  high/low  ->  so-mi  ->  +la  ->  +do (home)  ->  +re (all five)  ->  steps/skips
// so-mi comes first because it is where the published WESTERN sequences start, and because it has the
// two properties that ARE cross-culturally evidenced: a narrow range and a small falling step.
// HONESTY NOTE, because the first version of this file got it wrong: the popular claim that the falling
// minor third is "the natural interval of childhood all over the world" is NOT established. It traces to
// a Bernstein anecdote; the best measurement (Day-O'Connell) puts the interjection at 2.72 semitones --
// smaller than a minor third -- in Southern British English speakers ONLY, and its own author writes that
// "neither linguists nor musicologists have forwarded any concrete and objective evidence relevant to
// cross-cultural comparisons." Ethnomusicology has rejected this class of claim since Brailoiu.
// What IS evidenced across 304 recordings from 9 regions (Savage et al. 2015): small intervals,
// descending or arched contour, few scale degrees, short phrases. Children's songs specifically show a
// NARROWER range and FEWER scale degrees than adult songs. So the lesson keeps so-mi as a convenient
// Western starting point and claims only what the evidence supports.
// Degrees in major pentatonic: 0=do 1=re 2=mi 3=so 4=la
const DEG={do:0,re:1,mi:2,so:3,la:4};                      // major pentatonic: do re mi so la
const DEG7={do:0,re:1,mi:2,fa:3,so:4,la:5,ti:6};           // full diatonic: fa slots in at index 3
const SEVEN=[0,1,2,3,4,5,6];
const UNITS=[
  // ---- block A: first notes ----
  {id:'pulse',      title:'u_pulse',      sub:'u_pulseSub',      tier:'lesson', run:pulseUnit,      tint:'#9fe6cf'},
  {id:'sayplay',    title:'u_sayplay',    sub:'u_sayplaySub',    tier:'lesson', run:sayPlayUnit,    tint:'#ffd3a8'},
  {id:'high',       title:'u_high',       sub:'u_highSub',       tier:'lesson', run:highUnit,       tint:'#a6c8ff', use:[DEG.do,DEG.la]},
  {id:'notes',      title:'u_notes',      sub:'u_notesSub',      tier:'lesson', run:findNoteUnit,   tint:'#d9e88f', use:[0,1,2,3,4]},
  {id:'home',       title:'u_home',       sub:'u_homeSub',       tier:'lesson', run:homeUnit,       tint:'#ffb6d6', use:[DEG.do,DEG.mi,DEG.so]},
  {id:'steps',      title:'u_steps',      sub:'u_stepsSub',      tier:'lesson', run:stepsUnit,      tint:'#c4a9f5', use:[0,1,2,3,4]},
  // ---- block B: more notes ----
  {id:'newhome',    title:'u_newhome',    sub:'u_newhomeSub',    tier:'lesson', block:'b', run:sadFiveUnit,    tint:'#8fe0d0', use:[0,1,2,3,4]},
  {id:'majorscale', title:'u_majorscale', sub:'u_majorscaleSub', tier:'lesson', block:'b', run:majorScaleUnit, tint:'#ffe0a8', use:[0,1,2,3,4,5,6]},
  {id:'brightdark', title:'u_brightdark', sub:'u_brightdarkSub', tier:'lesson', block:'b', run:brightDarkUnit, tint:'#f5b8c8', use:[0,1,2,3,4,5,6]},
  // ---- block C: minor and modes ----
  {id:'minorscale', title:'u_minorscale', sub:'u_minorscaleSub', tier:'lesson', block:'c', run:minorScaleUnit, tint:'#b5a9f5', use:[0,1,2,3,4,5,6]},
  {id:'minorshapes',title:'u_minorshapes',sub:'u_minorshapesSub',tier:'lesson', block:'c', run:minorShapesUnit,tint:'#a9c4f5', use:[0,1,2,3,4,5,6]},
  {id:'modes',      title:'u_modes',      sub:'u_modesSub',      tier:'lesson', block:'c', run:modesUnit,      tint:'#9fe0c4', use:[0,1,2,3,4,5,6]},
  // ---- games and practice ----
  {id:'echo',     title:'g_echo',     sub:'g_echoSub',     tier:'game', run:echoGame,     tint:'#a6c8ff'},
  {id:'updown',   title:'g_updown',   sub:'g_updownSub',   tier:'game', run:upDownGame,   tint:'#c4a9f5'},
  {id:'findhome', title:'g_findhome', sub:'g_findhomeSub', tier:'game', run:findHomeGame, tint:'#d9e88f'},
  {id:'review',   title:'u_review',   sub:'u_reviewSub',   tier:'practice', run:reviewUnit, tint:'#9fe6cf'}
];

// ================================================================================================
//  THE PITCH LADDER - the melodic lessons' own screen, given the same treatment as the beat.
//  What they used before: the note tank (pitch encoded as the ANGLE of a polygon wall) plus a flat
//  keybed (pitch encoded as horizontal position). Neither shows a child what high and low mean, and
//  the keybed arrived with no indication of what it was for. High and low are SPATIAL words, so the
//  control is spatial: a ladder, low at the bottom, high at the top, one fat rung per note.
//  Fixed targets (a moving target is tapped correctly 37% of the time at ages 4-6; a still one 57%),
//  nothing on screen that is not the job, and the instruction is narrated as well as written.
// ================================================================================================
const RUNG_TINT=['#9fe6cf','#a6c8ff','#c4a9f5','#ffb6d6','#ffd3a8','#d9e88f','#8fe0d0'];
const EAR='<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9.5a3.5 3.5 0 0 1 0 5"/><path d="M19.5 7a7 7 0 0 1 0 10"/></svg>';
function ladderUnit(cfg){
  stageOff();
  const id=cfg.id, need=cfg.need||10;
  let rungs=[], right=0, busy=false, target=null, phase=0;
  try{initAudio();if(AC&&AC.state==='suspended')AC.resume();}catch(e){}
  const HOME=()=>((LAB._saved&&LAB._saved.root!=null)?LAB._saved.root:S.root)+(cfg.rootShift||0);
  // the tank still SOUNDS the notes - it is the app's instrument - but it is not on screen.
  LAB.take({scale:(cfg.scales?cfg.scales[0]:cfg.scale)||'pentaMaj',root:HOME(),
            octs:1,drums:false,band:false,touch:false});
  LAB.labels(null);LAB.clear();
  function setOf(){ return (typeof cfg.use==='function')?cfg.use(phase):cfg.use; }
  function retake(){ // a lesson that changes scale between phases (harmonic -> melodic minor)
    if(!cfg.scales)return;
    LAB.take({scale:cfg.scales[Math.min(phase,cfg.scales.length-1)],root:HOME(),
              octs:1,drums:false,band:false,touch:false});
    LAB.labels(null);LAB.clear(); }
  function name(d){
    if(cfg.names&&cfg.names[d]!=null)return cfg.names[d];
    let c=0;try{c=degCents(d);}catch(e){c=d*200;}
    return solfegeFor(c)||String(d+1);
  }
  function paint(){
    const use=setOf();
    // built LOW FIRST; the container is column-reverse, so the highest note ends up at the top.
    const ladder=use.map((d,i)=>
      '<button class="lgRung" data-deg="'+d+'" style="--rc:'+RUNG_TINT[i%RUNG_TINT.length]+'">'+
        '<span class="rgName">'+name(d)+'</span>'+
        '<span class="rgDeg">'+(i===0?'LOW':(i===use.length-1?'HIGH':''))+'</span></button>').join('');
    stage(
      '<div class="lgTop"><button class="lgBack" data-a2="home">&lsaquo; '+t('home')+'</button>'+
        '<h3>'+t(cfg.title)+'</h3><span class="lgCount">'+right+' / '+need+'</span>'+
        '<button class="lgSpk labSpk" data-a2="say" aria-label="'+t('voiceReplay')+'">'+SPK+'</button></div>'+
      '<div class="lgDots">'+Array.from({length:need},(_,i)=>'<i class="'+(i<right?'got':'')+'"></i>').join('')+'</div>'+
      '<div class="lgLadder" id="lgLadder">'+ladder+'</div>'+
      '<p class="lgSay">'+t(cfg.doIt)+'</p>'+
      '<div class="lgFeed" id="lgFeed"></div>'+
      '<div class="lgHint"><button class="lgListen" data-a2="lg_again">'+EAR+' '+t('listen')+'</button></div>');
    rungs=[...document.querySelectorAll('.lgRung')];
    if(target!=null)markTarget();
  }
  function markTarget(){ rungs.forEach(r=>r.classList.toggle('target', cfg.showTarget===true && +r.dataset.deg===target));
    window._labHintDeg=target; }   // readable target: dev-lessons drives the lesson through this
  function ask(){ if(busy)return; target=cfg.pick(setOf(),phase); markTarget(); cfg.play(target,setOf()); }
  window._lab_lgAgain=()=>{ if(!busy&&target!=null)cfg.play(target,setOf()); };
  function answer(ok,deg){
    if(busy)return;
    const el=rungs.find(r=>+r.dataset.deg===deg);
    if(el){el.classList.remove('right','wrong');void el.offsetWidth;el.classList.add(ok?'right':'wrong');
           later(()=>el.classList.remove('right','wrong'),380);}
    score(id,ok);
    if(ok)right++;
    const fd=document.getElementById('lgFeed'); if(fd)fd.textContent=t(ok?'yes':'notYet');
    const c=document.querySelector('.lgCount'); if(c)c.textContent=right+' / '+need;
    document.querySelectorAll('.lgDots i').forEach((x,i)=>x.classList.toggle('got',i<right));
    rungs.forEach(r=>r.classList.remove('target'));
    if(right>=need){busy=true;later(()=>{stageOff();finish(id,t(cfg.name));},760);return;}
    // a lesson that grows (two notes, then three, then five) steps up as the child gets them
    if(cfg.phases&&right>0&&right%cfg.phases===0&&phase<(cfg.maxPhase||0)){
      phase++;retake();paint();
      if(cfg.phaseSay&&cfg.phaseSay[phase]){const f2=document.getElementById('lgFeed');
        if(f2)f2.textContent=t(cfg.phaseSay[phase]); speech(t(cfg.phaseSay[phase]),true);}}
    later(ask,ok?780:1020);
  }
  // pointerdown, not click: a young child's tap can rest on the glass for seconds
  const onDown=(e)=>{const r=e.target.closest&&e.target.closest('.lgRung');if(!r)return;
    e.preventDefault();
    r.classList.add('press');setTimeout(()=>r.classList.remove('press'),90);
    const d=+r.dataset.deg; sing(d,94,.5);
    answer(cfg.correct?cfg.correct(d,target):(d===target), d);};
  ov.addEventListener('pointerdown',onDown,true);
  _render=paint;paint();
  later(ask,700);
  _cleanup=()=>{busy=true;try{ov.removeEventListener('pointerdown',onDown,true);}catch(e){}
    window._lab_lgAgain=null;stageOff();LAB.clear();};
}

// ---- the shared engine every pitch lesson runs on --------------------------------------------------
// One controller instead of six near-copies. A unit says which degrees it owns and how to ask; this
// handles the tank, the reps, the scoring and the ending. More reps than the old three: mastery needs
// attempts to be measured over, and repetition is the point of practice.
function pitchUnit(cfg){
  stageOff();                                      // leaving a stage lesson: give the tank rig back
  document.body.classList.remove('lab-nokeys');   // pitch lessons always want the keys back
  const id=cfg.id, use=cfg.use, need=cfg.need||10;
  let n=0,right=0,busy=false;
  // The scale is a parameter now. Everything above lesson 8 is the same controller pointed at a
  // different set of walls -- one tested engine, not eleven new ones.
  // Every lesson also PINS the key. Lessons that did not name a root simply inherited whatever the
  // last one left in S.root, so after the la-pentatonic lesson (which transposes) every later lesson
  // sat a minor third higher for the rest of the session and "the same five notes" stopped being true.
  // The anchor is LAB._saved.root - captured once, on entering learn mode - so shifts never stack.
  const HOME=(LAB._saved&&LAB._saved.root!=null)?LAB._saved.root:S.root;
  LAB.take({scale:cfg.scale||'pentaMaj',root:HOME+(cfg.rootShift||0),octs:1,drums:false,band:!!cfg.band});
  LAB.labels(cfg.labels===false?null:wallLabels());
  LAB._playable=use.slice();          // the lesson only ever asks for notes it has taught
  function paint(extra){
    dock(bar(t(cfg.title),n+' / '+need)+dots(right,need)+
      '<p class="labSay">'+t(cfg.hear)+'</p>'+
      '<div class="labDo">'+t(cfg.doIt)+'</div>'+
      '<div class="labFeed"></div>'+
      (extra||'')+
      (cfg.labels===false?'':labelPicker()));
  }
  _render=()=>paint(cfg.chips?cfg.chips():'');
  paint(cfg.chips?cfg.chips():'');
  const api={
    ask:()=>{},
    answer(ok,deg){
      if(busy)return;
      hint(null);               // the old target stops glowing the moment it is answered
      score(id,ok);
      if(ok){right++;n++;if(deg!=null)praise(deg);cheer(t('yes'));}
      else{n++;cheer(t('notYet'));}
      paint(cfg.chips?cfg.chips():'');
      // mastery gate: 80% over the full run, the bar the EEF evidence attaches its effect to
      if(n>=need){
        busy=true;
        if(right/n>=MASTERY)later(()=>finish(id,t(cfg.name)),820);
        else{ // not there yet: no failure, no penalty, just another lap with the same material
          later(()=>{n=0;right=0;busy=false;cheer(t('onceMore'));paint(cfg.chips?cfg.chips():'');
                     if(cfg.ask)cfg.ask(api);},1100);}
        return;}
      if(cfg.ask)later(()=>cfg.ask(api),900);
    }};
  if(cfg.setup)cfg.setup(api);
  if(cfg.ask)later(()=>cfg.ask(api),600);
  return api;
}

// ---------- 1. BEAT: the tank drops a ball on every beat; the child taps along ----------
// ================================================================================================
//  LESSON 1 - BEAT.  Its own screen, built from the entrainment research rather than from whatever
//  the shared lesson rig happened to provide.
//
//  120 BPM, NOT 88.  A child's spontaneous motor tempo is 400-500ms between taps -- roughly 120-150
//  BPM, FASTER than an adult's ~100. Under-4s need a tempo within about 20% of their own to lock on
//  at all (Provasi et al. 2014), and Kirschner & Tomasello (2009) found 2.5-year-olds simply refused
//  600ms (100 BPM) and held their own faster rate. Untrained synchronisation also degrades once the
//  gap passes 1 second (Repp 2005). "Slow it down so it's easier" is backwards for this age.
//
//  A FALLING BALL, NOT A PULSE.  Synchronising to a stationary flash needs ~460ms between flashes to
//  work at all -- about four times worse than audio (Repp 2005). A ball on a realistic GRAVITY
//  trajectory matches an auditory metronome for tapping stability (R=0.946 vs 0.934 for constant
//  acceleration-free motion; Sci Rep 2015), because a falling object's arrival time is extrapolated
//  natively. That is what makes the beat predictable instead of reactive.
//
//  TWO BEATS OF LEAD.  Reacting to a beat is physically too late: visual reaction time is ~200-250ms,
//  a third of a beat at 120 BPM, and synchronised tapping actually lands slightly BEFORE the beat
//  (negative mean asynchrony). Commercial rhythm games give their easiest tier ~1-1.5s of approach.
//  Two beats at 120 BPM is 1000ms, and two balls are in the air at once.
//
//  FIXED PAD, MOVING CUE.  Tapping a moving target succeeds 37% of the time at ages 4-6; a stationary
//  one, 57% (Ahn et al.). So the target never moves.
//
//  TOUCH-DOWN, NOT TOUCH-UP.  A 4-year-old's "tap" can rest on the glass for 5.1 seconds
//  (Vatavu et al. 2015). Timing on release would make this unplayable for half the audience.
// ================================================================================================
const PULSE_BPM=120, PULSE_NEED=8, PULSE_LEAD=2;   // lead is in beats
const PULSE_GOOD=0.30, PULSE_GREAT=0.12;           // tap windows, as a fraction of one beat
function pulseUnit(){
  const P=60/PULSE_BPM;                 // one beat, in seconds
  let run=0, done=false, raf=0, sched=0, nextBeat=0, t0=0, lastJudged=-1;
  try{initAudio();if(AC&&AC.state==='suspended')AC.resume();}catch(e){}
  LAB.take({exact:false,shape:'4',scale:'pentaMaj',octs:1,drums:false,band:false,grav:0,bpm:PULSE_BPM,touch:false});
  LAB.labels(null);LAB.clear();

  const SLIME='minis/grn.png';
  function paint(){
    stage(
      '<div class="lgTop"><button class="lgBack" data-a2="home">&lsaquo; '+t('home')+'</button>'+
        '<h3>'+t('u_pulse')+'</h3><span class="lgCount">'+run+' / '+PULSE_NEED+'</span>'+
        '<button class="lgSpk labSpk" data-a2="say" aria-label="'+t('voiceReplay')+'">'+SPK+'</button></div>'+
      '<div class="lgDots">'+Array.from({length:PULSE_NEED},(_,i)=>'<i class="'+(i<run?'got':'')+'"></i>').join('')+'</div>'+
      '<div class="lgLane" id="lgLane"><div class="lgFloor" id="lgFloor"></div></div>'+
      '<p class="lgSay">'+t('pulse_do')+'</p>'+
      '<div class="lgFeed" id="lgFeed"></div>'+
      '<div class="lgPad" id="lgPad" role="button" tabindex="0" aria-label="tap"><img src="'+SLIME+'" alt="" draggable="false"></div>');
    layout();
  }
  // the floor sits just above the pad; the ball falls the height of the lane onto it
  function layout(){
    const lane=document.getElementById('lgLane'),floor=document.getElementById('lgFloor');
    if(!lane||!floor)return;
    floor.style.top=Math.max(40,lane.clientHeight-10)+'px';
  }
  addEventListener('resize',layout);

  // ---- the clock is the audio clock, so what is seen and what is heard cannot drift apart ----
  function tick(){
    if(done)return;
    const now=AC.currentTime;
    window._labNextBeat=nextBeat; window._labBeatP=P;   // readable clock: the tests tap in time from this
    while(nextBeat<now+0.25){                     // schedule a quarter-second ahead, sample-accurate
      try{dHit('K',Math.max(now,nextBeat),1.15,true);}catch(e){}
      nextBeat+=P; sched++;
    }
    draw(now);
    raf=requestAnimationFrame(tick);
  }
  function draw(now){
    const lane=document.getElementById('lgLane'); if(!lane)return;
    const H=Math.max(40,lane.clientHeight-10), lead=PULSE_LEAD*P;
    // every beat still in the air gets a ball; y = H*(progress^2) is constant acceleration from rest,
    // so it arrives at the floor exactly on the beat with the velocity profile of a real drop.
    const first=Math.ceil((now-t0)/P), last=first+PULSE_LEAD;
    const want=[];
    for(let n=first;n<=last;n++){
      const bt=t0+n*P, dt=bt-now;
      if(dt>lead||dt<-0.18)continue;
      const prog=Math.min(1.12,1-dt/lead);
      if(prog<0)continue;
      want.push({n,prog});
    }
    const have={};
    lane.querySelectorAll('.lgBall').forEach(b=>{have[b.dataset.n]=b;});
    want.forEach(({n,prog})=>{
      let b=have[n];
      if(!b){b=document.createElement('div');b.className='lgBall';b.dataset.n=n;
        b.innerHTML='<img src="'+SLIME+'" alt="" draggable="false">';lane.appendChild(b);}
      delete have[n];
      const p=Math.min(1,prog);
      const y=H*p*p;                              // gravity: distance goes as the square of the time
      const sq=prog>1?(1-(prog-1)*2.2):1;         // squash on contact, the collision cue
      b.style.transform='translateY('+y.toFixed(1)+'px) scale('+Math.max(.55,sq).toFixed(2)+','+Math.min(1.3,2-Math.max(.55,sq)).toFixed(2)+')';
      b.style.opacity=prog>1?String(Math.max(0,1-(prog-1)*3)):'1';
    });
    Object.values(have).forEach(b=>b.remove());
  }

  // ---- the tap ----
  function judge(){
    if(done||!AC)return;
    const now=AC.currentTime;
    const n=Math.round((now-t0)/P);
    if(n===lastJudged)return;                      // one judgement per beat, however fast they tap
    const err=Math.abs(now-(t0+n*P))/P;            // error as a fraction of a beat
    const pad=document.getElementById('lgPad'),fl=document.getElementById('lgFloor'),fd=document.getElementById('lgFeed');
    if(pad){pad.classList.remove('hit');void pad.offsetWidth;pad.classList.add('hit');}
    if(err<=PULSE_GOOD){
      lastJudged=n; run++;
      if(pad)pad.classList.add('good');
      if(fl){fl.classList.remove('flash');void fl.offsetWidth;fl.classList.add('flash');}
      if(fd)fd.textContent=(err<=PULSE_GREAT?t('pulse_great'):t('pulse_good'));
      const d=document.querySelectorAll('.lgDots i');
      if(d[run-1])d[run-1].classList.add('got');
      const c=document.querySelector('.lgCount'); if(c)c.textContent=run+' / '+PULSE_NEED;
      if(run>=PULSE_NEED){done=true;cancelAnimationFrame(raf);
        later(()=>{stageOff();finish('pulse',t('pulse_name'));},700);}
      later(()=>{if(pad)pad.classList.remove('good');},260);
    }else{
      // a miss says nothing. The run resets and the beat carries on -- constrain, never scold.
      run=0;
      if(fd)fd.textContent='';
      document.querySelectorAll('.lgDots i').forEach(i=>i.classList.remove('got'));
      const c=document.querySelector('.lgCount'); if(c)c.textContent='0 / '+PULSE_NEED;
    }
  }
  // TOUCH-DOWN. pointerdown, not click, not pointerup.
  const onDown=(e)=>{const p=e.target.closest&&e.target.closest('#lgPad');if(!p)return;
    e.preventDefault();judge();};
  ov.addEventListener('pointerdown',onDown,true);
  window._lab_tap=judge;                           // keyboard / test hook

  _render=paint;paint();
  t0=AC.currentTime+0.6; nextBeat=t0;
  raf=requestAnimationFrame(tick);
  _cleanup=()=>{done=true;cancelAnimationFrame(raf);
    try{ov.removeEventListener('pointerdown',onDown,true);}catch(e){}
    removeEventListener('resize',layout);stageOff();LAB.clear();window._lab_tap=null;};
}

// ---------- SAY IT, THEN PLAY IT ----------------------------------------------------------------
// The one practice that genuinely showed up on every continent I looked at. Vocalise the rhythm BEFORE
// you play it:
//   India      konnakol / solkattu (ta ka di mi), and tabla bols (dha dhin na tin ta ge)
//   Japan      kuchi shoga (don doko tsu ka) -- and rests get their own syllable there
//   Korea      gu-eum -- students sing the drum patterns before touching the drum
//   Turkey/Arab world   usul, dum / tek, struck on the knees while spoken
// Taiko teaching puts it in five words: "if you can say it, you can play it." The tabla sequence is
// explicitly three stages -- syllables only, drums only, then both together -- and that is exactly the
// loop below.
//
// WHY THESE TWO SYLLABLES. Hughes (2000) showed these systems are not arbitrary: they are
// "acoustic-iconic". Vowels track pitch by second formant, so the series i-e-a-o-u runs high to low;
// voiced stops (d, g, b) mark low sounds and voiceless ones (t, k) mark high. DUM and TEK are the real
// Arabic/Turkish pair and they follow that logic exactly -- voiced d + back vowel for the low drum,
// voiceless t + front vowel for the high one. A five-year-old hears that DUM is lower than TEK without
// being told, which is the whole point.
// These are borrowed honestly, named as what they are, and no tradition is claimed as ours.
const SP_PATTERNS=[
  [1,0,1,0],        // DUM . TEK .
  [1,0,0,1],        // DUM . . DUM
  [1,1,0,1],
  [1,0,1,1],
  [1,1,0,0]
];
function sayPlayUnit(){
  let pat=SP_PATTERNS[0], idx=0, stage='listen';
  const LOW=0, HIGH=2;                       // two walls, far enough apart to hear as low vs high
  function sylRow(active){
    return '<div class="spRow">'+pat.map((v,i)=>
      '<b class="spSyl'+(v?' lo':' hi')+(i===active?' on':'')+'">'+(v?t('sp_low'):t('sp_high'))+'</b>'
    ).join('')+'</div>';}
  const u=pitchUnit({id:'sayplay',title:'u_sayplay',hear:'sp_hear',doIt:'sp_say',name:'sp_name',
    use:[LOW,HIGH],need:10,labels:false,
    chips:()=>sylRow(stage==='play'?idx:-1)+
      '<div class="labChips"><button class="labChip" data-a2="sp_again">'+t('listen')+'</button></div>',
    ask(api){
      pat=SP_PATTERNS[(Math.random()*SP_PATTERNS.length)|0];idx=0;stage='listen';
      // STAGE ONE: the app says it out loud AND plays it, syllable by syllable, lighting each one.
      pat.forEach((v,i)=>later(()=>{
        idx=i;stage='listen';
        speech(v?t('sp_low'):t('sp_high'),true);   // said aloud — the vocalising is the lesson
        sing(v?LOW:HIGH,90,.4);
        if(_render)_render();
      },i*620));
      // STAGE TWO: the child's turn
      later(()=>{stage='play';idx=0;hint(pat[0]?LOW:HIGH);if(_render)_render();},pat.length*620+320);
    }});
  window._lab_spAgain=()=>{pat.forEach((v,i)=>later(()=>{speech(v?t('sp_low'):t('sp_high'),true);sing(v?LOW:HIGH,90,.4);},i*620));};
  LAB.onHit((deg)=>{
    if(stage!=='play')return;
    const len=scaleObj().c.length,d=((deg%len)+len)%len;
    if(d!==LOW&&d!==HIGH)return;
    const want=pat[idx]?LOW:HIGH;
    if(d===want){idx++;
      if(idx>=pat.length){u.answer(true,d);}
      else{hint(pat[idx]?LOW:HIGH);if(_render)_render();}}
    else{idx=0;u.answer(false,d);}
  });
}

// ---------- 3. HIGH AND LOW -- two notes, as far apart as the ladder goes ----------
// No solfege yet. Gordon puts verbal association at level 2 of 8, AFTER aural/oral: the child hears
// and answers before anything is given a name. So the rungs just say low and high.
function highUnit(){
  ladderUnit({id:'high',title:'u_high',doIt:'high_do',name:'high_name',
    use:[DEG.do,DEG.la],need:10,names:{0:'low',4:'high'},showTarget:false,
    pick:(u)=>u[(Math.random()*u.length)|0],
    play:(d)=>sing(d,94,.6)});
}
// ---------- 4. FIND THE NOTE -- two notes, then three, then five ----------
// This was three separate lessons (so-mi, add la, all five) that were the SAME screen with one more
// rung each time. One lesson that grows as the child gets them right: the ladder adds a rung every
// four, so the difficulty moves and the screen never repeats itself.
function findNoteUnit(){
  const SETS=[[DEG.mi,DEG.so],
              [DEG.mi,DEG.so,DEG.la],
              [DEG.do,DEG.mi,DEG.so,DEG.la],
              [DEG.do,DEG.re,DEG.mi,DEG.so,DEG.la]];
  ladderUnit({id:'notes',title:'u_notes',doIt:'nt_do',name:'nt_name',
    use:(ph)=>SETS[Math.min(ph,3)],need:12,phases:3,maxPhase:3,showTarget:false,
    phaseSay:[null,'nt_p1','nt_p2','nt_p3'],
    pick:(u)=>u[(Math.random()*u.length)|0],
    play:(d)=>sing(d,94,.55)});
}
// ---------- 5. HOME NOTE -- the one that finishes ----------
function homeUnit(){
  ladderUnit({id:'home',title:'u_home',doIt:'home_do',name:'home_name',
    use:[DEG.do,DEG.mi,DEG.so],need:10,showTarget:false,
    pick:()=>DEG.do,
    play:()=>{sing(DEG.so,88,.42);later(()=>sing(DEG.mi,88,.42),460);}});
}
// ---------- 6. STEPS AND SKIPS -- walk up the ladder one rung at a time ----------
function stepsUnit(){
  let want=0;
  ladderUnit({id:'steps',title:'u_steps',doIt:'steps_do',name:'steps_name',
    use:[0,1,2,3,4],need:10,showTarget:true,
    pick:()=>{want=(want)%5;return want;},
    correct:(d,tg)=>{const ok=(d===tg);want=ok?(tg+1)%5:0;return ok;},
    play:(d)=>sing(d,90,.45)});
}
// ---------- 7. SAME NOTES, NEW HOME -- the la-pentatonic ----------
// Kodaly Grade 2: the step after the major pentatonic is not the major scale, it is these same five
// notes with a different one in charge. Nothing new to learn; everything sounds different.
function sadFiveUnit(){
  ladderUnit({id:'newhome',title:'u_newhome',doIt:'sad_do',name:'sad_name',
    scale:'pentaMin',rootShift:9,use:[0,1,2,3,4],need:10,showTarget:false,
    pick:(u)=>u[(Math.random()*u.length)|0],
    play:(d)=>sing(d,94,.55)});
}
// ---------- 8. THE MAJOR SCALE -- fa, then ti ----------
// Two lessons before ("add fa", "add ti"), which were one arc split in half. fa arrives a whole grade
// before ti in the Kodaly sequence, so it still arrives first -- as phase one of the same lesson.
function majorScaleUnit(){
  ladderUnit({id:'majorscale',title:'u_majorscale',doIt:'ms_do',name:'ms_name',
    scale:'major',use:(ph)=>ph?[0,1,2,3,4,5,6]:[0,1,2,3,4,5],need:12,phases:6,maxPhase:1,showTarget:false,
    phaseSay:[null,'ms_p1'],
    pick:(u)=>u[(Math.random()*u.length)|0],
    play:(d)=>sing(d,94,.55)});
}
// ---------- 9. BRIGHT AND DARK -- major and minor, one note apart ----------
// Two buttons, no ladder: the answer is a judgement about a sound, not a note to find. Plays the same
// three notes twice and moves only the middle one, in raw cents, so no scale swap is needed.
function brightDarkUnit(){
  stageOff();
  let bright=true,n=0,right=0,busy=false;const need=10;
  try{initAudio();if(AC&&AC.state==='suspended')AC.resume();}catch(e){}
  LAB.take({scale:'major',octs:1,drums:false,band:false,touch:false});LAB.labels(null);LAB.clear();
  function play(){const third=bright?400:300;
    note(0,92,.5);later(()=>note(third,92,.5),420);later(()=>note(700,92,.62),840);}
  function paint(){
    stage('<div class="lgTop"><button class="lgBack" data-a2="home">&lsaquo; '+t('home')+'</button>'+
        '<h3>'+t('u_brightdark')+'</h3><span class="lgCount">'+right+' / '+need+'</span>'+
        '<button class="lgSpk labSpk" data-a2="say" aria-label="'+t('voiceReplay')+'">'+SPK+'</button></div>'+
      '<div class="lgDots">'+Array.from({length:need},(_,i)=>'<i class="'+(i<right?'got':'')+'"></i>').join('')+'</div>'+
      '<div class="lgLadder" style="justify-content:center;flex:1"><p class="lgSay" style="font-size:18px">'+t('bd_hear')+'</p></div>'+
      '<p class="lgSay">'+t('bd_do')+'</p><div class="lgFeed" id="lgFeed"></div>'+
      '<div class="lgHint"><button class="lgListen" data-a2="lg_again">'+EAR+' '+t('listen')+'</button></div>'+
      '<div class="lgChoice">'+
        '<button data-bd="bright" style="--rc:#ffe08a">'+t('bright')+'</button>'+
        '<button data-bd="dark" style="--rc:#a9b6f0">'+t('dark')+'</button></div>');
  }
  window._lab_lgAgain=play;
  function ask(){bright=Math.random()<0.5;window._labExpect=bright?'bright':'dark';play();}
  const onDown=(e)=>{const b=e.target.closest&&e.target.closest('[data-bd]');if(!b||busy)return;
    e.preventDefault();
    const ok=(b.dataset.bd==='bright')===bright; score('brightdark',ok);n++;if(ok)right++;
    const fd=document.getElementById('lgFeed');if(fd)fd.textContent=t(ok?'yes':'notYet');
    const c=document.querySelector('.lgCount');if(c)c.textContent=right+' / '+need;
    document.querySelectorAll('.lgDots i').forEach((x,i)=>x.classList.toggle('got',i<right));
    if(right>=need){busy=true;later(()=>{stageOff();finish('brightdark',t('bd_name'));},760);return;}
    later(ask,ok?820:1050);};
  ov.addEventListener('pointerdown',onDown,true);
  _render=paint;paint();later(ask,650);
  _cleanup=()=>{busy=true;try{ov.removeEventListener('pointerdown',onDown,true);}catch(e){}
    window._lab_lgAgain=null;stageOff();LAB.clear();};
}
// ---------- 10-12. THE SEVEN-NOTE SCALES ----------
function scaleLadder(id,title,scales,doIt,nameK,need,phases,maxPhase,phaseSay){
  ladderUnit({id:id,title:title,doIt:doIt,name:nameK,scales:scales,
    use:[0,1,2,3,4,5,6],need:need||10,phases:phases,maxPhase:maxPhase||0,phaseSay:phaseSay,showTarget:false,
    pick:(u)=>u[(Math.random()*u.length)|0],
    play:(d)=>sing(d,94,.55)});
}
function minorScaleUnit(){scaleLadder('minorscale','u_minorscale',['minor'],'mn_do','mn_name',10);}
function minorShapesUnit(){scaleLadder('minorshapes','u_minorshapes',['harmMin','melMin'],'sh_do','sh_name',12,6,1,[null,'sh_p1']);}
function modesUnit(){scaleLadder('modes','u_modes',['dorian','mixolydian'],'md_do','md_name',12,6,1,[null,'md_p1']);}

// ---------- PRACTICE: COME BACK TOMORROW ----------
// The one activity built directly on the spacing evidence. Simmons (2012) found accuracy gains only at
// a 24-hour gap; Wiseheart (2017) found nothing at all inside 15 minutes. So this unit refuses to run
// on material learned today -- it waits for the day boundary, then re-asks the OLDEST thing first.
// No streak, no nag, no penalty for not coming: it simply has something for you when you return.
function reviewUnit(){
  const list=due();
  if(!list.length){
    dock(bar(t('u_review'),'')+
      '<div class="labDone"><img class="ldArt" src="minis/grn2.png" alt="" draggable="false">'+
      '<b class="ldTitle">'+t('rev_none')+'</b>'+
      '<p class="labSay">'+t('rev_noneSub')+'</p>'+
      '<div class="labChips"><button class="labChip" data-a2="home">'+t('home')+'</button></div></div>');
    return;}
  let i=0,right=0;const need=Math.min(10,list.length*3);
  let target=0,pool=[];
  function nextItem(){const u=list[i%list.length];i++;
    pool=(u.use||[0,1,2,3,4]).slice();
    target=pool[(Math.random()*pool.length)|0];
    LAB._playable=pool.slice();
    later(()=>{sing(target,94,.55);hint(target);},260);}
  LAB.take({scale:'pentaMaj',octs:1,drums:false,band:false});
  LAB.labels(wallLabels());
  function paint(){
    dock(bar(t('u_review'),right+' / '+need)+dots(right,need)+
      '<p class="labSay">'+t('rev_hear')+'</p>'+
      '<div class="labDo">'+t('rev_do')+'</div>'+
      '<div class="labFeed"></div>'+labelPicker());}
  _render=paint;paint();
  LAB.onHit((deg)=>{const len=scaleObj().c.length,d=((deg%len)+len)%len;
    if(pool.indexOf(d)<0)return;
    const ok=(d===target);
    score('review',ok);
    if(ok){right++;praise(d);cheer(t('yes'));
      // touching a unit resets ITS clock too, so review keeps rotating rather than drilling one thing
      const u=list[(i-1)%list.length];if(prog[u.id]){prog[u.id].at=Date.now();save();}
      if(right>=need){later(()=>finish('review',t('rev_name')),820);return;}}
    else cheer(t('notYet'));
    paint();later(nextItem,900);});
  nextItem();
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
      if(idx>=phrase.length){cheer(t('yes'));best=Math.max(best,len);hint(null);
        seen('echo');
        if(len>=5){later(()=>finish('echo',''),900);return;}   // a five-note phrase echoed back: that is the session
        len++;
        later(()=>{newPhrase();playPhrase();},1200);}
      else hint(phrase[idx]);                       // always show the next target
    }else{ // NO fail state: just replay it and invite another go
      cheer(t('notYet'));idx=0;hint(null);later(playPhrase,900);}
  });
  newPhrase();later(playPhrase,500);
}

// ---------- GAME: UP OR DOWN ----------
function upDownGame(){
  // pentatonic here too: the games are practice for the lessons, and they must not quietly reintroduce
  // the two notes the lessons deliberately hold back.
  LAB.take({scale:'pentaMaj',octs:1,drums:false,band:false});LAB.labels(null);
  let a=0,b=0,got=0;
  function ask(){
    const td=totalDegrees();
    a=Math.floor(Math.random()*td);
    do{b=Math.floor(Math.random()*td);}while(b===a);
    window._labExpect=(b>a)?'up':'down';   // readable target, same hook the lessons use
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
  window._lab_ud=(g)=>{const up=b>a;window._labExpect=null;
    if((g==='up')===up){got++;cheer(t('yes'));LAB.drop(b,1);
      if(got>=5){later(()=>finish('updown',''),900);return;}
      later(ask,1000);}
    else{cheer(t('notYet'));later(()=>{note(degCents(a),90,.5);later(()=>note(degCents(b),90,.5),620);},300);}};
  window._lab_udReplay=()=>{sing(a,90,.5);later(()=>sing(b,90,.5),620);};
  ask();
}

// ---------- GAME: FIND HOME ----------
function findHomeGame(){
  LAB.take({scale:'pentaMaj',octs:1,drums:false,band:true});LAB.labels(wallLabels());
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
    if(((deg%len)+len)%len===0){praise(deg);got++;cheer(t('yes'));paint();
      if(got>=5)later(()=>finish('findhome',t('home_name')),800);}
    else feed('');});   // a wrong wall in a scale-locked tank is still music: say nothing, let them hunt
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
  stageOff();
  document.body.classList.remove('lab-nokeys');
  try{LAB.give();}catch(e){}
  const lessons=UNITS.filter(u=>u.tier!=='practice');
  // the counter counts LESSONS. It used to include the three games, so the header read "0 of 11" while
  // the numbered list went 1..8 - two different totals for the same thing on the same screen.
  const numbered=UNITS.filter(u=>u.tier==='lesson');
  const total=numbered.length,done=numbered.filter(u=>got(u.id)).length;
  // WHERE DO I START? Duolingo marks the next node on its path; Simply Piano hard-locks everything after
  // the current lesson. Locking fights this app's no-fail-state rule, so the sequence is SHOWN, not
  // enforced: the first lesson not yet finished wears a "start here" flag, every other door stays open.
  // "start here" follows MASTERY, so a lesson you half-finished is still the one waiting for you
  const nextUp=(UNITS.find(u=>u.tier==='lesson'&&!got(u.id))||{}).id;
  const readyToReview=due().length;
  // LESSONS ARE NUMBERED. A two-column grid of eight cards has no reading order a child (or a parent)
  // can guess - "start here" told you where to begin and nothing told you what came next. The number
  // IS the order, and it replaces the grey line glyph that used to sit in this corner: that glyph was
  // flat vector clipart in an app drawn entirely in crayon, and none of the eight meant anything.
  const lessonNo={};lessons.filter(u=>u.tier==='lesson').forEach((u,i)=>{lessonNo[u.id]=i+1;});
  const card=(u)=>{
    const done=got(u.id), next=(u.id===nextUp&&!readyToReview)||(u.tier==='practice'&&readyToReview>0);
    const no=lessonNo[u.id];
    return '<button class="uCard'+(done?' got':'')+(next?' nextUp':'')+'" data-a2="unit" data-u="'+u.id+'" '+
      'style="--ut:'+u.tint+'" aria-label="'+(no?no+'. ':'')+t(u.title)+(next?' \u2014 '+t('startHere'):'')+'">'+
      '<span class="uTxt"><b>'+(no?'<em class="uNum">'+no+'</em>':'')+t(u.title)+'</b><i>'+t(u.sub)+'</i></span>'+
      (done?'<span class="uDone" aria-hidden="true">\u2713</span>'
           :(next?'<span class="uNext">'+t(u.tier==='practice'?'revReady':'startHere')+'</span>':''))+
      '</button>';
  };
  let h='<div class="uHead">'+
    '<img class="uHeadArt" src="slimelogo.png" alt="" draggable="false">'+
    '<span><b>'+t('tierLessons')+'</b><i>'+t('progressOf',{done:done,total:total})+'</i></span></div>';
  // the three section subtitles are gone: they explained spaced repetition and the word "practice" to
  // a child who cannot read them and does not need them. The heading is the whole label.
  // Nineteen numbered cards in one list is a wall. They are dealt into four named blocks instead --
  // first notes, more notes, minor keys, modes -- with the NUMBERING running straight through, so the
  // blocks say roughly how hard and the numbers still say exactly what order. Nothing is locked: the
  // sequence is shown, never enforced.
  const BLOCKS=[['a','blockA'],['b','blockB'],['c','blockC'],['d','blockD']];
  // no "LESSONS" heading above "FIRST NOTES" - two headings stacked saying the same thing
  for(const [bk,lbl] of BLOCKS){
    const inBlock=UNITS.filter(x=>x.tier==='lesson'&&(x.block||'a')===bk);
    if(!inBlock.length)continue;
    h+='<div class="uSec"><span class="uSecT">'+t(lbl)+'</span></div><div class="uGrid">'+inBlock.map(card).join('')+'</div>';
  }
  for(const [tier,tk] of [['practice','tierPractice'],['game','tierGames']]){
    h+='<div class="uSec"><span class="uSecT">'+t(tk)+'</span></div>'+
       '<div class="uGrid">'+UNITS.filter(x=>x.tier===tier).map(card).join('')+'</div>';
  }
  h+='<div class="labChips" style="justify-content:center">'+
       '<button class="labChip'+(voiceOn?' on':'')+'" data-a2="voice">'+SPK+' '+t(voiceOn?'voiceOn':'voiceOff')+'</button></div>';
  h+='<p class="uFoot">'+t('noRush')+'</p>';
  sheet(h);
  _render=home;
}

// ---------------------------------------------------------------- events
if(ov)ov.addEventListener('click',(e)=>{
  const b=e.target.closest('[data-a2]');if(!b)return;
  const a=b.dataset.a2;
  if(a==='home'){speechStop();home();return;}
  if(a==='say'){sayScreen(true);return;}                      // "say it again"
  if(a==='voice'){setVoice(!voiceOn);if(_render)_render();return;}
  if(a==='nextu'||a==='again'){const u=UNITS.find(x=>x.id===b.dataset.u);if(!u)return;
    stopAll();if(_cleanup){_cleanup();_cleanup=null;}
    _lastSaid='';u.run();return;}
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
  if(a==='lg_again'&&window._lab_lgAgain)return window._lab_lgAgain();
  if(a==='st_demo'&&window._lab_stepsDemo)return window._lab_stepsDemo();
  if(a==='sc_demo'&&window._lab_scaleDemo)return window._lab_scaleDemo();
  if(a==='bd_br'&&window._lab_bd)return window._lab_bd('bright');
  if(a==='bd_dk'&&window._lab_bd)return window._lab_bd('dark');
  if(a==='bd_replay'&&window._lab_bdReplay)return window._lab_bdReplay();
  if(a==='sp_again'&&window._lab_spAgain)return window._lab_spAgain();
  if(a==='ec_replay'&&window._lab_ecReplay)return window._lab_ecReplay();
  if(a==='ec_next'&&window._lab_ecNext)return window._lab_ecNext();
  if(a==='ud_up'&&window._lab_ud)return window._lab_ud('up');
  if(a==='ud_dn'&&window._lab_ud)return window._lab_ud('down');
  if(a==='ud_replay'&&window._lab_udReplay)return window._lab_udReplay();
});
// tapping the tank itself counts as a tap in the beat unit
if(typeof cv!=='undefined'&&cv)cv.addEventListener('pointerdown',()=>{if(window._lab_tap&&document.body.classList.contains('lab-on'))window._lab_tap();});

function enter(){
  if(ov){ov.hidden=false;}
  home();
  // a deep link (?l=addti) or the splash's carry-on chip names a lesson to open straight away
  const want=window.__deepLesson; window.__deepLesson=null;
  if(want){const u=UNITS.find(x=>x.id===want);
    if(u)setTimeout(()=>{try{initAudio();if(AC&&AC.state==='suspended')AC.resume();}catch(e){} u.run();},80);}
}
function exit(){ stopAll(); if(_cleanup){_cleanup();_cleanup=null;}
  try{LAB.give();}catch(e){}
  if(ov){ov.hidden=true;ov.classList.remove('lab');}
  document.body.classList.remove('lab-on'); }
return {enter,exit,home,setLang,t,LANG,UNITS,_labels:wallLabels,
        _MASTERY:MASTERY,_MIN_TRIES:MIN_TRIES,_due:due,_got:got,_acc:acc}; // read-only hooks for dev-curriculum.js
})();

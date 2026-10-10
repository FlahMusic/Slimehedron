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
     - do re mi fa so la ti are international; they are NOT translated.
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
    _name:'English', _dir:'ltr', _voice:'en-US', home:'lessons', next:'next', again:'again', listen:'listen', imReady:"I'm ready",
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
    // ---- LESSON TITLES ----
    // A title is the CONCEPT'S REAL NAME. Checked against how musictheory.net names its lessons ("Note
    // Duration", "Rest Duration", "Measures and Time Signature", "The Major Scale", "Steps and
    // Accidentals") and against Hoffman Academy, which is aimed squarely at six-year-olds and still
    // says "Half Notes", "Musical Alphabet" and "D Major Pentascale" to them. Children are not damaged
    // by the correct word; they are damaged by never being told it. So: the TITLE is the term, and the
    // SUBTITLE is the plain sentence. "How long?" and "Bright and dark" told a child nothing they could
    // carry to a piano teacher, a band room, or the next app.
    u_pulse:'Steady Beat', u_pulseSub:'find the pulse and tap with it',
    u_sayplay:'Say It, Play It', u_sayplaySub:'say a rhythm before you play it',
    u_howlong:'Long and Short', u_howlongSub:'how long a note is held \u2014 note duration',
    hl_do:'How many counts was that note?',
    hl_name:'A note\u2019s shape tells you how long to hold it. That is its DURATION.',
    note_q:'a QUARTER note \u2014 1 count', note_h:'a HALF note \u2014 2 counts',
    note_dh:'a DOTTED HALF note \u2014 3 counts', note_w:'a WHOLE note \u2014 4 counts',
    note_r:'a QUARTER REST \u2014 1 count of silence',
    u_rest:'Leave a Gap', u_restSub:'silence is written down too \u2014 rests',
    u_make:'Make a Loop', u_makeSub:'four beats of your own',
    mk_do:'Tap the colours. Whatever you play comes back round.',
    mk_clear:'start again', mk_keep:'keep it',
    mk_kept:'Kept it. Make another if you want.',
    mk_tally:'{n} kept',
    mk_done:'all done',
    mk_name:'You made a four-beat loop. Nothing you play here is wrong.',
    u_staff:'Five Lines', u_staffSub:'the ladder, drawn on five lines \u2014 the staff',
    st_do:'Tap the note you hear.',
    u_melody:'Read a Tune', u_melodySub:'play a real tune off the page',
    ml_do:'Play the notes, left to right.',
    ml_name:'You played a tune straight off the page.',
    song_ode:'Ode to Joy',
    st_name:'The STAFF is five lines. A note sits ON a line or IN a space.',
    u_split:'Two in One Beat', u_splitSub:'two sounds in the time of one',
    sb_do:'Two taps where the notes are joined up.',
    sb_name:'Two EIGHTH NOTES fill one beat. Count "1 and".',
    u_tempo:'Fast and Slow', u_tempoSub:'how fast the beat goes \u2014 tempo',
    tp_hear:'Listen.', tp_do:'Was that fast or slow?',
    tp_fast:'fast', tp_slow:'slow',
    tp_name:'TEMPO is how fast the beat goes. It is measured in BPM.',
    u_dynamic:'Loud and Soft', u_dynamicSub:'how loud a note is played \u2014 dynamics',
    dy_hear:'Listen.', dy_do:'Was that loud or soft?',
    dy_loud:'loud', dy_soft:'soft',
    dy_name:'DYNAMICS are how loud you play. Soft is PIANO, loud is FORTE.',
    sh_hear:'Listen to the top of the scale.',
    sh_nat:'natural', sh_harm:'harmonic', sh_mel:'melodic',
    md_hear:'Listen.', md_dor:'Dorian', md_mix:'Mixolydian',
    rs_do:'Play on the notes. Stay silent on the rests.',
    rs_name:'A REST is silence you count. This one lasts 1 beat.',
    u_countbar:'Count to Four', u_countbarSub:'four beats to a measure',
    cb_do:'Tap on the big numbers. Count the small ones.',
    cb_name:'Four beats in a MEASURE. The 4/4 is the TIME SIGNATURE.',
    u_song:'Read a Rhythm', u_songSub:'a real tune, played as its rhythm',
    sg_do:'Tap each note as it lights up.',
    sg_name:'You read the RHYTHM of a real tune off the page.',
    song_hotcross:'Hot Cross Buns', song_mary:'Mary Had a Little Lamb',
    u_high:'High and Low', u_highSub:'high notes and low notes \u2014 pitch',
    u_notes:'Five Notes', u_notesSub:'do re mi so la \u2014 the major pentatonic',
    u_home:'The Home Note', u_homeSub:'the note a melody comes home to \u2014 the tonic',
    u_steps:'Step or Jump', u_stepsSub:'how a melody moves \u2014 steps and skips',
    u_newhome:'A New Home Note', u_newhomeSub:'same five sounds, a new home \u2014 the relative minor',
    u_majorscale:'Seven Notes', u_majorscaleSub:'add fa, then ti \u2014 the major scale',
    u_brightdark:'Bright and Dark', u_brightdarkSub:'one note sets the mood \u2014 major and minor',
    u_intervals:'Two at Once', u_intervalsSub:'two notes together \u2014 intervals',
    iv_hear:'Two notes, sounded together.',
    iv_do:'A 2nd is one step wide. A 5th is much wider. Which was it?',
    iv_name:'The distance between two notes is an INTERVAL.',
    iv_near:'2nd', iv_far:'5th',
    u_minorscale:'Seven Dark Notes', u_minorscaleSub:'the minor scale, also called Aeolian',
    u_minorshapes:'Raise a Note', u_minorshapesSub:'raise the seventh, then the sixth \u2014 harmonic and melodic minor',
    u_modes:'More Scales', u_modesSub:'Dorian and Mixolydian \u2014 modes',
    u_review:'Play It Again', u_reviewSub:'things you learned earlier',
    // say-it-first: the METHOD is borrowed (konnakol, bols, kuchi shoga, gu-eum, usul all vocalise a
    // rhythm before playing it); the SYLLABLES are English so the child is saying words they own.
    // They still follow Hughes 2000's acoustic logic: voiced stop + back vowel for the low drum,
    // voiceless stop + front vowel for the high one, so the word sounds like the drum.
    sp_low:'BOOM', sp_high:'TAP',
    sp_hear:'BOOM is the low drum. TAP is the high one.',
    sp_listen:'Listen. Say it with me.',
    sp_say:'Say it out loud, then tap it out.',
    sp_name:'Saying a rhythm first makes it easier to play. Those words are RHYTHM SYLLABLES.',
    // --- what each lesson says, one short line, the thing to DO at the end of it ---
    high_do:'Tap the note you hear.',
    high_name:'How high or low a note sounds is its PITCH.',
    nt_do:'Tap the note you hear.',
    nt_p1:'a new note on top', nt_p2:'a new note at the bottom', nt_p3:'one more, and that is all five',
    nt_name:'DO RE MI SO LA \u2014 five notes. That is the MAJOR PENTATONIC SCALE.',
    home_do:'Tap the note that finishes it.',
    home_name:'The note a melody rests on is the TONIC. Here it is DO.',
    steps_do:'Go up one note at a time.',
    steps_name:'To the next note is a STEP. Jumping over one is a SKIP.',
    sad_do:'Tap the note you hear.',
    sad_name:'Same five sounds, a new tonic. That is the MINOR PENTATONIC.',
    ms_do:'Tap the note you hear.',
    ms_p1:'one more note, just under do',
    ms_name:'Seven notes. That is the MAJOR SCALE.',
    bd_hear:'A chord of three notes. Only the middle one moves.',
    bd_do:'Major sounds bright. Minor sounds dark. Which was it?',
    bd_name:'The middle note is the THIRD. High third: MAJOR. Low third: MINOR.',
    bright:'major', dark:'minor',
    mn_do:'Tap the note you hear.',
    mn_name:'This is the NATURAL MINOR SCALE. Its mode name is AEOLIAN.',
    sh_do:'Which minor was that?',
    sh_p1:'now raise the sixth as well',
    sh_name:'Raise the seventh: HARMONIC MINOR. Raise the sixth too, going up: MELODIC MINOR.',
    md_do:'Which mode was that?',
    md_p1:'now Mixolydian',
    md_name:'DORIAN is minor with a raised sixth and a low seventh. MIXOLYDIAN is major with a low seventh.',
    g_jam:'Your Turn',
    g_jamSub:'it plays a bit, then you play anything you want',
    jam_mine:'Listen.',
    jam_yours:'Your turn. Play anything.',
    jam_free:'There is no wrong note here.',
    jam_tally:'{n} notes',
    jam_done:'all done',
    jam_name:'You made that up. Nothing you play here is wrong.',
    ex_do:'Play them. Any of them, as many as you like.',
    ex_ready:'ask me questions',
    rev_do:'Play one again.',
    rev_name:'You still had it.',
    rev_ago:'{n} days ago',
    rev_ago1:'yesterday',
    rev_none:'nothing to review yet',
    rev_noneSub:'Finish a lesson. Come back tomorrow.',
    g_echo:'Copy Me', g_echoSub:'play back what you hear',
    echo_name:'Holding a melody in your head and playing it back is EAR TRAINING.',
    g_updown:'Up or Down', g_updownSub:'did the melody rise or fall \u2014 melodic direction',
    updown_hear:'Two notes, one after the other.',
    updown_name:'A melody that rises is moving UP. One that falls is moving DOWN.',
    g_findhome:'Find Home', g_findhomeSub:'land on do \u2014 find the tonic',
    fh_do:'Tap the note that finishes it.',
    fh_name:'The TONIC is DO. Every melody leans towards it.',
    // ---- the four lesson blocks, in order ----
    blockA:'Rhythm and Notation', blockB:'Pitch', blockC:'Scales and Harmony', blockD:'Minor and Modes',
    blockE:'Reading Music',
    // pulse
    // instruction copy: ONE short sentence, and the thing to DO goes at the end of it (Sesame
    // Workshop's tablet guidance for pre-readers). Narrated as well as shown -- narration beats
    // on-screen text by a wide margin in the multimedia literature (modality effect, g=0.82).
    pulse_do:'When the ball lands, tap the slime.',
    pulse_name:'That steady drop is the BEAT.',
    pulse_good:'yes', pulse_great:'right on it',
    // NOTE: a second, older copy of these keys used to sit below this point, left over from the
    // 19-lesson tank curriculum. Being LATER in the object literal, it silently won: three live
    // lessons were telling children to 'end on the glowing wall' and 'walk up the walls' months
    // after the walls were replaced by the ladder. One dictionary, one definition per key.
    // echo game
    echo_mine:'Listen to the little tune.',
    echo_your:'Now tap it back, in order.',
    echo_len:'{n} notes',
    updown_ask:'Did the melody go up, or down?',
    up:'up', down:'down', same:'the same',
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
  // NOTE: do not filter on offsetParent here. stage() calls this in the same tick it draws the screen,
  // and the layout box is not settled yet - which made every lesson silent. The `hidden` attribute is
  // the real signal, and it is reliable immediately.
  // .lgSay is the instruction line every lesson writes its one spoken sentence into; .lgDone is the
  // "you did it" at the end, which is worth hearing as well as seeing.
  const parts=[...ov.querySelectorAll('.lgDone,.lgSay')]
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
// "so", not "sol": every lesson line in this file says SO, and a rung labelled "sol" next to a sentence
// saying SO is two names for one note on one screen. Kodály's own English sequence uses so.
const SOLF_BY_CENTS={0:'do',100:'ra',200:'re',300:'me',400:'mi',500:'fa',600:'fi',700:'so',800:'le',900:'la',1000:'te',1100:'ti'};
let labelMode='solfege';
// Note names are NOT twelve pitch classes -- the fourth degree of F major is Bb, never A#, and a
// piano teacher would wince at the latter. A scale uses each letter once, in order, so the letter
// comes from the DEGREE and the accidental is whatever makes that letter land on the right pitch.
// That is how spelling actually works, and it makes every key come out right for free.
const LTR=['C','D','E','F','G','A','B'];
const LTRSEMI=[0,2,4,5,7,9,11];
// how each tonic is spelled -- flat side of the circle of fifths takes flats, sharp side sharps
const SPELL_MAJ={0:[0,0],1:[1,-1],2:[1,0],3:[2,-1],4:[2,0],5:[3,0],6:[3,1],7:[4,0],8:[5,-1],9:[5,0],10:[6,-1],11:[6,0]};  // pc6 as F# not Gb: avoids Cb, which nobody writes
const SPELL_MIN={0:[0,0],1:[0,1],2:[1,0],3:[2,-1],4:[2,0],5:[3,0],6:[3,1],7:[4,0],8:[4,1],9:[5,0],10:[6,-1],11:[6,0]};
function letterFor(d){
  try{
    const pc=(x)=>((x%12)+12)%12;
    const minor=(typeof isMinorScale==='function')&&isMinorScale();
    const k=(minor?SPELL_MIN:SPELL_MAJ)[pc(S.root)];
    const li=(k[0]+d)%7;                                  // one letter per scale degree, in order
    let acc=pc(Math.round(S.root+degCents(d)/100)-LTRSEMI[li]);
    if(acc>6)acc-=12;                                     // -1 = flat, +1 = sharp
    if(acc<-2||acc>2)return '';                           // not a spellable degree: show nothing
    return LTR[li]+(acc>0?'#'.repeat(acc):acc<0?'b'.repeat(-acc):'');
  }catch(e){return '';}
}
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

// ---------------------------------------------------------------- the lesson screen
// dock() used to live here: a side card pinned next to the tank, which every lesson rendered into.
// Nothing renders into it any more, so it is gone, and with it bar(), dots(), feed(), cheer(), hint()
// and praise() -- all of them helpers for drawing into a card, or for lighting a wall and a keybed
// that a lesson no longer puts on screen.
const ov=$id('learnOverlay');
let _render=null, _cleanup=null;
// Every lesson renders here: its own full screen, with nothing from the tank rig on it.
// See the lab-stage rules in index.html for what that hides and why.
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
// THREE buttons on a lesson screen can all replay SOMETHING, so none of them may wear the same icon.
//   SPK  = "say the instruction again" -> a speech bubble. It repeats WORDS.
//   EAR  = "play the sound again"      -> a note. It repeats MUSIC.
//   the app's own mute (top-left) keeps the speaker-with-waves, which is the one icon everybody
//   already reads as volume. Three speakers on one screen is what this had before, and it was unreadable.
const SPK='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.1" '+
  'stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 7 0 0 1-8 7 9 9 0 0 1-2.6-.37L5 21l1.2-3.6A6.8 6.8 0 0 1 5 12a8 7 0 0 1 8-7 8 7 0 0 1 8 7z"/>'+
  '<path d="M10 11.5h.01M13 11.5h.01M16 11.5h.01"/></svg>';

// ---------------------------------------------------------------- audio helpers (reuse the app's synth)
// This routed through playNote(), which takes a MIDI NOTE NUMBER -- and was handed a FREQUENCY.
// freqFromCents(0) is ~349, playNote's guard is `if(m<12||m>120)return`, so every single call
// returned silently. It never threw, so the catch never fired, and the `return` skipped the
// working fallback underneath. Result: every pitched sound in learn mode was silent -- an ear
// training app that made no sound in its ear training. playSynth IS the voice and it takes a
// frequency, which is what we have.
function note(cents,vel,dur){
  // dur was accepted and thrown away: playSynth had no length parameter, so a whole note and a
  // quarter note sounded identical and the note-duration lesson could not be answered by ear.
  try{if(typeof playSynth==='function'&&typeof freqFromCents==='function'){
    // firm: a lesson's question must never be the 1-in-20 whisper. A child asked to name a note
    // they could not hear is being tested on the app's random number generator.
    playSynth(freqFromCents(cents),vel||90,0.72,dur,true);   // fixed impact, real length, never a dud
    return;}}catch(e){}
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
function degCents(d){try{return centsForDegree(d);}catch(e){return d*200;}}
// A PLAYED NOTE IS AN ANSWER.
// Every ladder lesson asks "which one was that?" and then only accepted a tap on the screen. A child
// with a keyboard plugged in could hear the question, play the note back, and have it count for
// nothing -- the one input that is actually musical was the one input that did not work.
// The active ladder parks its answer handler here; playNote() in index.html feeds this on every
// press from any source (computer keys, MIDI, anything later). Cleared by every unit's _cleanup.
let _noteAnswer=null;
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
  // The ending used to render in the side card, so a lesson that had filled the screen finished in a
  // small panel beside a tank the child never touched. Same screen, all the way through.
  stage('<div class="lgTop"><button class="lgBack" data-a2="home">&lsaquo; '+t('home')+'</button>'+
      '<h3>'+t(u.title||'u_review')+'</h3><span class="lgCount"></span></div>'+
    '<div class="lgLadder" style="justify-content:safe center;flex:1;text-align:center">'+
      '<div><img src="minis/'+(u.slime||'grn')+'.png" alt="" draggable="false" style="width:min(150px,34vw);height:auto">'+
      '<p class="lgDone">'+t('doneTitle')+'</p>'+
      (nameLine?'<p class="lgSay" style="max-width:34ch;margin:6px auto 0">'+nameLine+'</p>':'')+
      '</div></div>'+
    '<div class="lgChoice">'+
      (nx?'<button data-a2="nextu" data-u="'+nx.id+'" style="--rc:#9fe6cf">'+t(nx.title)+' \u203a</button>':'')+
      '<button data-a2="again" data-u="'+id+'" style="--rc:#ffd3a8">'+t('doneAgain')+'</button>'+
    '</div>');
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
  {id:'make',       title:'u_make',       sub:'u_makeSub',       tier:'lesson', run:makeUnit,       tint:'#ffd9f0'},
  {id:'sayplay',    title:'u_sayplay',    sub:'u_sayplaySub',    tier:'lesson', run:sayPlayUnit,    tint:'#ffd3a8'},
  {id:'howlong',    title:'u_howlong',    sub:'u_howlongSub',    tier:'lesson', run:noteValueUnit,  tint:'#ffe0a8'},
  {id:'countbar',   title:'u_countbar',   sub:'u_countbarSub',   tier:'lesson', run:countBarUnit,   tint:'#f5c8a8'},
  {id:'rest',       title:'u_rest',       sub:'u_restSub',       tier:'lesson', run:restUnit,       tint:'#e8dcc8'},
  {id:'song',       title:'u_song',       sub:'u_songSub',       tier:'lesson', run:songUnit,       tint:'#f5b8c8'},
  {id:'split',      title:'u_split',      sub:'u_splitSub',      tier:'lesson', run:splitBeatUnit,  tint:'#c8e8b8'},
  {id:'tempo',      title:'u_tempo',      sub:'u_tempoSub',      tier:'lesson', run:tempoUnit,      tint:'#ffd9b8'},
  {id:'dynamic',    title:'u_dynamic',    sub:'u_dynamicSub',    tier:'lesson', run:dynamicUnit,    tint:'#f5d8e8'},
  {id:'high',       title:'u_high',       sub:'u_highSub',       tier:'lesson', block:'b', run:highUnit,       tint:'#a6c8ff', use:[DEG.do,DEG.la]},
  {id:'notes',      title:'u_notes',      sub:'u_notesSub',      tier:'lesson', block:'b', run:findNoteUnit,   tint:'#d9e88f', use:[0,1,2,3,4]},
  {id:'home',       title:'u_home',       sub:'u_homeSub',       tier:'lesson', block:'b', run:homeUnit,       tint:'#ffb6d6', use:[DEG.do,DEG.mi,DEG.so]},
  {id:'steps',      title:'u_steps',      sub:'u_stepsSub',      tier:'lesson', block:'b', run:stepsUnit,      tint:'#c4a9f5', use:[0,1,2,3,4]},
  // ---- block B: more notes ----
  {id:'newhome',    title:'u_newhome',    sub:'u_newhomeSub',    tier:'lesson', block:'c', run:sadFiveUnit,    tint:'#8fe0d0', use:[0,1,2,3,4]},
  {id:'majorscale', title:'u_majorscale', sub:'u_majorscaleSub', tier:'lesson', block:'c', run:majorScaleUnit, tint:'#ffe0a8', use:[0,1,2,3,4,5,6]},
  {id:'brightdark', title:'u_brightdark', sub:'u_brightdarkSub', tier:'lesson', block:'c', run:brightDarkUnit, tint:'#f5b8c8', use:[0,1,2,3,4,5,6]},
  {id:'intervals',  title:'u_intervals',  sub:'u_intervalsSub',  tier:'lesson', block:'c', run:intervalUnit,   tint:'#bfe0f5', use:[0,1,2,3,4,5,6]},
  // ---- block C: minor and modes ----
  {id:'minorscale', title:'u_minorscale', sub:'u_minorscaleSub', tier:'lesson', block:'d', run:minorScaleUnit, tint:'#b5a9f5', use:[0,1,2,3,4,5,6]},
  {id:'minorshapes',title:'u_minorshapes',sub:'u_minorshapesSub',tier:'lesson', block:'d', run:minorShapesUnit,tint:'#a9c4f5', use:[0,1,2,3,4,5,6]},
  {id:'modes',      title:'u_modes',      sub:'u_modesSub',      tier:'lesson', block:'d', run:modesUnit,      tint:'#9fe0c4', use:[0,1,2,3,4,5,6]},
  // ---- block E: the page ----
  {id:'staff',      title:'u_staff',      sub:'u_staffSub',      tier:'lesson', block:'e', run:staffUnit,      tint:'#ffe8c0'},
  {id:'melody',     title:'u_melody',     sub:'u_melodySub',     tier:'lesson', block:'e', run:melodyUnit,     tint:'#ffd8e0'},
  // ---- games and practice ----
  {id:'echo',     title:'g_echo',     sub:'g_echoSub',     tier:'game', run:echoGame,     tint:'#a6c8ff'},
  {id:'jam',      title:'g_jam',      sub:'g_jamSub',      tier:'game', run:jamUnit,      tint:'#ffd9a8'},
  {id:'updown',   title:'g_updown',   sub:'g_updownSub',   tier:'game', run:upDownGame,   tint:'#c4a9f5'},
  {id:'findhome', title:'g_findhome', sub:'g_findhomeSub', tier:'game', run:findHomeGame, tint:'#d9e88f'},
  {id:'review',   title:'u_review',   sub:'u_reviewSub',   tier:'practice', run:reviewUnit, tint:'#9fe6cf'}
];

// ================================================================================================
//  NOTE VALUES AND READING — the half of the subject this curriculum did not have.
//  Both method books are counting and notation from page one: staff, quarter note, bar lines, a
//  written song, then 4/4, then the half note, then another song. Twelve lessons of ear training had
//  not one note head, not one count and not one bar line in them.
//  The two exercise ideas lifted straight from the books, because they are better than anything I
//  would have invented:
//    * "Colour the circles to show the number of counts. 1 circle = 1 count." Duration becomes a
//      thing you can SEE and COUNT, not a number to remember.
//    * "Play where you see the big counting numbers; count but don't play on the small ones."
//      That teaches a half note without ever saying the word duration.
// ================================================================================================
const NOTEG={ // real notation, drawn properly — this is the one place a vector glyph IS the subject
  // a beamed pair of eighths. Drawn as ONE glyph spanning two cells would need new machinery, so each
  // eighth is its own cell with its own flag — which is also how a child taps them: twice, evenly.
  e:'<svg viewBox="0 0 60 96"><ellipse cx="20" cy="76" rx="15" ry="11" transform="rotate(-20 20 76)" fill="#2f2a44"/><rect x="33" y="14" width="5" height="60" fill="#2f2a44"/><path d="M38 16 q16 8 15 26 q-4-14-15-18z" fill="#2f2a44"/></svg>',
  q:'<svg viewBox="0 0 60 96"><ellipse cx="20" cy="76" rx="15" ry="11" transform="rotate(-20 20 76)" fill="#2f2a44"/><rect x="33" y="14" width="5" height="60" fill="#2f2a44"/></svg>',
  h:'<svg viewBox="0 0 60 96"><ellipse cx="20" cy="76" rx="15" ry="11" transform="rotate(-20 20 76)" fill="none" stroke="#2f2a44" stroke-width="6"/><rect x="33" y="14" width="5" height="60" fill="#2f2a44"/></svg>',
  dh:'<svg viewBox="0 0 74 96"><ellipse cx="20" cy="76" rx="15" ry="11" transform="rotate(-20 20 76)" fill="none" stroke="#2f2a44" stroke-width="6"/><rect x="33" y="14" width="5" height="60" fill="#2f2a44"/><circle cx="50" cy="76" r="5.5" fill="#2f2a44"/></svg>',
  w:'<svg viewBox="0 0 60 96"><ellipse cx="30" cy="60" rx="19" ry="13" transform="rotate(-10 30 60)" fill="none" stroke="#2f2a44" stroke-width="7"/></svg>',
  // THE QUARTER REST. Silence is notated, counted and played -- both books teach it in level one, and
  // this curriculum had none of it: the word "rest" appeared in the source only inside comments. A
  // rhythm course with no silence in it is teaching one half of rhythm and calling it the whole thing.
  r:'<svg viewBox="0 0 60 96"><path d="M19 20 L40 43 L23 58 L42 78" fill="none" stroke="#2f2a44" '+
    'stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>'+
    '<path d="M42 78 Q27 73 25 87 Q34 79 43 88" fill="none" stroke="#2f2a44" stroke-width="6" stroke-linecap="round"/></svg>'
};
const NOTEV={q:1,h:2,dh:3,w:4,r:1,e:0.5};   // e = one eighth: half a beat, two to the count
const NOTEN={q:'note_q',h:'note_h',dh:'note_dh',w:'note_w',r:'note_r'};
const isRest=(k)=>k==='r';

// ---------- 3. HOW LONG IS A NOTE? ----------
// One note on screen. Its beats fill in, one circle per count, in time with a click. Then four
// buttons: how many counts was that? Nothing else on the screen at all.
function noteValueUnit(){
  stageOff();
  const need=10, POOL=['q','h','w','dh'];
  let kind='q', right=0, busy=false, timer=null;
  // ONE ANSWER PER QUESTION. `busy` only went true at the END of a unit, so until then every tap
  // scored: a child could hit 1,2,3,4 and one of them had to be right. That is not an answer, it is
  // a brute force, and it was being written into the progress file as mastery. `armed` is the real
  // gate: a question arms it, the first committed answer disarms it, the next question arms it again.
  let armed=false;
  try{initAudio();if(AC&&AC.state==='suspended')AC.resume();}catch(e){}
  LAB.take({exact:false,shape:'4',scale:'pentaMaj',octs:1,drums:false,band:false,grav:0,bpm:100,touch:false});
  LAB.labels(null);LAB.clear();
  function paint(){
    stage(
      '<div class="lgTop"><button class="lgBack" data-a2="home">&lsaquo; '+t('home')+'</button>'+
        '<h3>'+t('u_howlong')+'</h3><span class="lgCount">'+right+' / '+need+'</span>'+
        '<button class="lgSpk labSpk" data-a2="say" aria-label="'+t('voiceReplay')+'">'+SPK+'</button></div>'+
      '<div class="lgDots">'+Array.from({length:need},(_,i)=>'<i class="'+(i<right?'got':'')+'"></i>').join('')+'</div>'+
      '<div class="lgLadder" style="flex:1;justify-content:safe center;flex-direction:column">'+
        '<div class="lgNote"><div class="lgNoteArt" id="lgArt">'+NOTEG[kind]+'</div>'+
        '<div class="lgCounts" id="lgCnt">'+[1,2,3,4].map(()=>'<i></i>').join('')+'</div></div></div>'+
      '<p class="lgSay">'+t('hl_do')+'</p><div class="lgFeed" id="lgFeed"></div>'+
      '<div class="lgHint"><button class="lgListen" data-a2="lg_again">'+EAR+' '+t('listen')+'</button></div>'+
      '<div class="lgChoice">'+[1,2,3,4].map(n=>
        '<button data-cnt="'+n+'" style="--rc:'+RUNG_TINT[(n-1)%RUNG_TINT.length]+'">'+n+'</button>').join('')+'</div>');
  }
  // The four circles are the BEAT GRID, not the answer. They used to outline exactly n of them the
  // instant the note sounded -- so the whole lesson could be cleared by counting outlines without
  // hearing anything, which a driver proved at 10/10 with the audio ignored. All four now tick past
  // on the pulse; how long the note RINGS against them is the question. (The note only started
  // genuinely ringing for its full length once playSynth gained a hold parameter -- before that a
  // whole note and a quarter note were the same sound, and the outlines were the only real signal.)
  function demo(){
    if(timer)clearInterval(timer);
    const cnt=[...document.querySelectorAll('#lgCnt i')];
    cnt.forEach(c=>c.classList.remove('on','beat'));
    const n=NOTEV[kind], P=600; let b=0;
    try{dHit('K',AC.currentTime,1.15,true);}catch(e){}
    try{note(0,92,n*P/1000*0.95);}catch(e){}         // the note SOUNDS for its full length
    const step=()=>{ if(b<4){cnt[b].classList.add('on');
        if(b>0){try{dHit('h',AC.currentTime,0.5,true);}catch(e){}}
        b++;} else {clearInterval(timer);timer=null;} };
    step(); timer=setInterval(step,P); _timers.push(timer);
  }
  // after the child has committed, show what the answer was -- that is teaching, not leaking
  function reveal(n){ [...document.querySelectorAll('#lgCnt i')].forEach((c,i)=>c.classList.toggle('beat',i<n)); }
  window._lab_lgAgain=demo;
  function ask(){ kind=POOL[(Math.random()*POOL.length)|0]; armed=true; paint(); later(demo,260); }
  const onDown=(e)=>{const b=e.target.closest&&e.target.closest('[data-cnt]');if(!b||busy||!armed)return;
    e.preventDefault();armed=false;
    const ok=(+b.dataset.cnt===NOTEV[kind]);
    score('howlong',ok); if(ok)right++;
    reveal(NOTEV[kind]);                            // now it is safe to show how long it was
    const fd=document.getElementById('lgFeed');
    if(fd)fd.textContent=ok?t(NOTEN[kind]):t('notYet');
    if(ok)speech(t(NOTEN[kind]),true);
    const c=document.querySelector('.lgCount'); if(c)c.textContent=right+' / '+need;
    document.querySelectorAll('.lgDots i').forEach((x,i)=>x.classList.toggle('got',i<right));
    if(right>=need){busy=true;later(()=>{stageOff();finish('howlong',t('hl_name'));},900);return;}
    later(ask,ok?1200:1400);};
  ov.addEventListener('pointerdown',onDown,true);
  _render=paint;ask();
  _cleanup=()=>{_noteAnswer=null;busy=true;if(timer)clearInterval(timer);
    try{ov.removeEventListener('pointerdown',onDown,true);}catch(e){}
    window._lab_lgAgain=null;stageOff();LAB.clear();};
}

// ---------- 4-5. COUNT THE BAR, AND PLAY A SONG ----------
// One engine, two lessons. A row of notes, read left to right, a count under each beat -- BIG on the
// beats you play, small on the ones you only count, exactly as the percussion book prints it. The
// cell you are on lights up, and the child taps as it arrives. Lesson 5 is the same screen with a
// real tune on it, so the lesson ends with a piece rather than a drill.
const BARS={
  count:[['q','q','q','q'],['h','h'],['q','q','h'],['w'],['h','q','q'],['dh','q']],
  // a rest is a beat you COUNT but do not PLAY -- which is exactly what the small counting numbers
  // already mean on this screen, so the notation the books use needs no new machinery here
  rest:[['q','r','q','r'],['q','q','r','q'],['r','q','q','q'],['h','r','q'],['q','r','h'],['q','q','q','r']],
  // SPLIT THE BEAT: one sound per count, then two. This is the pattern under every hi-hat ever
  // programmed, and it is the last thing in the rhythm block a DAW actually needs.
  split:[['q','e','e','q','q'],['e','e','q','e','e','q'],['q','q','e','e','h'],
         ['e','e','e','e','h'],['q','e','e','h'],['e','e','q','q','e','e']],
  song:[ // Hot Cross Buns and Mary Had a Little Lamb: both long out of copyright
    {n:'song_hotcross',bars:[['q','q','h'],['q','q','h']]},
    {n:'song_mary',bars:[['q','q','q','q'],['h','h']]}
  ]
};
function readUnit(cfg){
  stageOff();
  const need=cfg.need||6, P=0.6;
  let seq=[], right=0, busy=false, idx=0, t0=0, raf=0, beatOf=[], total=0, title='';
  try{initAudio();if(AC&&AC.state==='suspended')AC.resume();}catch(e){}
  LAB.take({exact:false,shape:'4',scale:'pentaMaj',octs:1,drums:false,band:false,grav:0,bpm:100,touch:false});
  LAB.labels(null);LAB.clear();
  function build(){
    const pick=cfg.pick(); seq=pick.notes; title=pick.title||'';
    beatOf=[];total=0;
    seq.forEach(k=>{beatOf.push(total);total+=NOTEV[k];});
  }
  function paint(){
    let b=0;
    const cells=seq.map((k,i)=>{
      const v=NOTEV[k], nums=[], rest=isRest(k);
      // EVERY count under a rest is small. The book's own convention already says it: big means play,
      // small means count in silence. A rest is simply a beat where nothing is big.
      if(v<1){ // an eighth: on the beat it takes the number, off the beat it takes "and"
        const onBeat=(Math.abs(b-Math.round(b))<0.01);
        nums.push('<u class="'+(rest?'small':'')+'">'+(onBeat?((Math.round(b)%4)+1):'&')+'</u>');
      } else for(let j=0;j<v;j++)nums.push('<u class="'+((j||rest)?'small':'')+'">'+((b+j)%4+1)+'</u>');
      const newBar=(b>0&&b%4===0);     // a bar line every four counts, drawn where it belongs
      b+=v;
      return '<div class="lgCell'+(newBar?' bar2':'')+(rest?' rest':'')+'" data-i="'+i+'">'+
        NOTEG[k]+'<div>'+nums.join(' ')+'</div></div>';
    }).join('');
    stage(
      '<div class="lgTop"><button class="lgBack" data-a2="home">&lsaquo; '+t('home')+'</button>'+
        '<h3>'+t(cfg.title)+'</h3><span class="lgCount">'+right+' / '+need+'</span>'+
        '<button class="lgSpk labSpk" data-a2="say" aria-label="'+t('voiceReplay')+'">'+SPK+'</button></div>'+
      '<div class="lgDots">'+Array.from({length:need},(_,i)=>'<i class="'+(i<right?'got':'')+'"></i>').join('')+'</div>'+
      (title?'<p class="lgSay" style="font-size:20px;color:#463d66">'+t(title)+'</p>':'')+
      '<div style="flex:1;display:flex;align-items:center"><div class="lgBar" id="lgBar">'+
        '<div class="lgSig" aria-label="four four time"><b>4</b><b>4</b></div>'+cells+'</div></div>'+
      '<p class="lgSay">'+t(cfg.doIt)+'</p><div class="lgFeed" id="lgFeed"></div>'+
      '<div class="lgPad" id="lgPad" role="button" tabindex="0" aria-label="tap"><img src="minis/grn.png" alt="" draggable="false"></div>');
  }
  function run(){
    idx=0; t0=AC.currentTime+0.9;
    const cells=[...document.querySelectorAll('.lgCell')];
    cells.forEach(c=>{c.classList.remove('now','hitok');
      if(c.classList.contains('rest'))c.classList.add('hitok');});   // silence is already correct
    cancelAnimationFrame(raf);
    (function tick(){
      const now=AC.currentTime, beat=(now-t0)/P;
      window._labReadIdx=idx; window._labReadAt=t0+beatOf[idx]*P;
      cells.forEach((c,i)=>c.classList.toggle('now', i===idx));
      if(beat>=total+1){ // the bar finished
        // Every note is its own attempt. Scoring the BAR instead meant a five-bar lesson offered the
        // mastery gate five data points when it needs eight, so the lesson could never be marked learned.
        cells.forEach(c=>score(cfg.id,c.classList.contains('hitok')));
        const all=cells.length&&cells.every(c=>c.classList.contains('hitok'));
        if(all){right++;
          const cc=document.querySelector('.lgCount');if(cc)cc.textContent=right+' / '+need;
          document.querySelectorAll('.lgDots i').forEach((x,i)=>x.classList.toggle('got',i<right));
          const fd=document.getElementById('lgFeed');if(fd)fd.textContent=t('yes');
          if(right>=need){busy=true;later(()=>{stageOff();finish(cfg.id,t(cfg.name));},900);return;}}
        else{const fd=document.getElementById('lgFeed');if(fd)fd.textContent=t('onceMore');}
        later(()=>{build();paint();run();},900);return;}
      // the click track, so there is always a pulse to read against
      const bi=Math.floor(beat);
      if(bi>=0&&bi!==window.__lastBi){window.__lastBi=bi;
        try{dHit(bi%4===0?'K':'h',AC.currentTime,bi%4===0?1.1:0.42,true);}catch(e){}}
      // advance the cursor when its note's time is past
      while(idx<seq.length-1&&beat>=beatOf[idx+1]-Math.min(0.5,NOTEV[seq[idx+1]]*0.6))idx++;
      raf=requestAnimationFrame(tick);})();
  }
  function judge(){
    if(busy)return;
    const cells=[...document.querySelectorAll('.lgCell')];
    const now=AC.currentTime;
    let best=-1,bd=1e9;
    seq.forEach((k,i)=>{const d=Math.abs(now-(t0+beatOf[i]*P));if(d<bd){bd=d;best=i;}});
    const pad=document.getElementById('lgPad');
    if(pad){pad.classList.remove('hit');void pad.offsetWidth;pad.classList.add('hit');}
    const win=P*0.34*Math.min(1,NOTEV[seq[best]]||1);   // an eighth gets a tighter window than a whole note
    if(best>=0&&bd<=win&&cells[best]){
      if(cells[best].classList.contains('rest'))cells[best].classList.remove('hitok');
      else cells[best].classList.add('hitok');}
  }
  const onDown=(e)=>{const p=e.target.closest&&e.target.closest('#lgPad');if(!p)return;e.preventDefault();judge();};
  ov.addEventListener('pointerdown',onDown,true);
  window._lab_tap=judge;
  build();_render=paint;paint();later(run,400);
  _cleanup=()=>{_noteAnswer=null;busy=true;cancelAnimationFrame(raf);
    try{ov.removeEventListener('pointerdown',onDown,true);}catch(e){}
    window._lab_tap=null;stageOff();LAB.clear();};
}
function countBarUnit(){
  readUnit({id:'countbar',title:'u_countbar',doIt:'cb_do',name:'cb_name',need:10,
    pick:()=>({notes:BARS.count[(Math.random()*BARS.count.length)|0]})});
}
// ---------- 5. REST DURATION ----------
// The same reading screen with silence written into the bar. Nothing new to operate: the big/small
// counting convention the percussion book already uses says it -- you count every number, you play
// only the big ones, and under a rest none of them are big.
// ---------- SPLITTING THE BEAT -- the lesson a DAW actually needs ----------
// Every method book stops the primer at the quarter note and so did this course. But two sounds in
// the time of one IS the hi-hat grid, and a child who has only ever counted 1-2-3-4 cannot program
// a beat. Same screen, same click track, same tapping -- the notes are just twice as close.
function splitBeatUnit(){
  readUnit({id:'split',title:'u_split',doIt:'sb_do',name:'sb_name',need:10,
    pick:()=>({notes:BARS.split[(Math.random()*BARS.split.length)|0]})});
}
// ---------- FAST OR SLOW ----------
// Dalla Bella 2001 -- the same paper this course already cites for putting major/minor at lesson 13 --
// found five-year-olds judge music by TEMPO before they can use mode at all. It was the earliest
// discrimination a small child has, and the course did not use it. It is also just "BPM".
function tempoUnit(){
  choiceUnit({id:'tempo',roam:true,title:'u_tempo',hear:'tp_hear',doIt:'tp_do',name:'tp_name',
    scale:'pentaMaj',need:10,
    opts:[{v:'fast',label:'tp_fast',tint:'#ffd3a8'},{v:'slow',label:'tp_slow',tint:'#a6c8ff'}],
    pick:()=>Math.random()<0.5?'fast':'slow',
    play:(v)=>{const gap=(v==='fast')?165:520, n=(v==='fast')?8:4;
      for(let i=0;i<n;i++)later(()=>sing([0,2,3,2][i%4],92,(v==='fast')?0.16:0.46),i*gap);}});
}
// ---------- LOUD OR SOFT ----------
// Every piano method teaches p and f in level one. In a DAW it is the velocity lane, which is the
// single most-edited thing in any piano roll. Same notes both times -- only the playing changes.
function dynamicUnit(){
  choiceUnit({id:'dynamic',roam:true,title:'u_dynamic',hear:'dy_hear',doIt:'dy_do',name:'dy_name',
    scale:'pentaMaj',need:10,
    opts:[{v:'loud',label:'dy_loud',tint:'#ffb6d6'},{v:'soft',label:'dy_soft',tint:'#9fe6cf'}],
    pick:()=>Math.random()<0.5?'loud':'soft',
    play:(v)=>{const vel=(v==='loud')?118:42;
      [0,2,4,2].forEach((d,i)=>later(()=>sing(d,vel,0.42),i*330));}});
}
// ================================================================================================
//  LESSON 2 -- MAKE SOMETHING.
//  This slot is where products in this category die. Hoffman Academy's lesson 1 has 1.4M views and
//  its lesson 2 has 46.9K: ~97% of everyone who arrives never comes back for a second lesson. What
//  the market leader puts in that slot is IMPROVISATION -- before it has even taught the musical
//  alphabet. Drilling a second quiz there is how you get the 97%.
//
//  So lesson 2 is a four-beat looper, and the whole design is three guarantees:
//    * It cannot sound wrong. Five notes of the major pentatonic, which is the Orff trick -- he
//      physically removes the F and B bars so a child's improvising cannot fail. The no-fail state
//      lives in the MATERIAL, not in a forgiving interface.
//    * It cannot be out of time. Every tap snaps to the nearest eighth. A five-year-old's timing is
//      not the thing being taught here; having an idea is.
//    * You hear yourself immediately. The loop never stops, so a tap becomes something that repeats
//      with a band under it within half a second. That is the "I made this" moment, and it is the
//      only reason anyone comes back.
//  No score, no target, no way to lose. You finish when you have kept two loops.
// ================================================================================================
const MAKE_BPM=96, MAKE_SLOTS=8;                  // 4 beats of eighth notes
const MAKE_DEG=[0,1,2,3,4];                        // do re mi so la -- no wrong notes exist here
function makeUnit(){
  stageOff();
  const SLOT=60/MAKE_BPM/2, LOOP=SLOT*MAKE_SLOTS;  // an eighth, and one bar
  let grid=new Array(MAKE_SLOTS).fill(null);       // what the child has put down
  let kept=0, loopAt=0, raf=0, cur=-1, busy=false, bars=0;
  // NO QUOTA. This is the one unit in the whole curriculum where the child makes something up, and
  // it used to say need=2 with a progress counter: make two and you're finished. That is a quiz
  // wearing a sandbox's clothes. Orff's instruments have the F and B bars taken off so nothing can
  // sound wrong; nobody then tells the child they have improvised enough. So: keep as many as you
  // like, the first one counts as having learned it, and the CHILD decides when to leave.
  try{initAudio();if(AC&&AC.state==='suspended')AC.resume();}catch(e){}
  LAB.take({exact:false,shape:'5',scale:'pentaMaj',octs:1,drums:false,band:false,grav:0,bpm:MAKE_BPM,touch:false});
  LAB.labels(null);LAB.clear();

  function paint(){
    const pads=MAKE_DEG.map(d=>
      '<button class="mkPad" data-d="'+d+'" style="--rc:'+degTint(d)+'"></button>').join('');
    const dots=grid.map((g,i)=>
      '<i class="mkSlot'+(g!=null?' on':'')+(i===cur?' now':'')+'"'+(g!=null?' style="--rc:'+degTint(g)+'"':'')+'></i>').join('');
    stage(
      '<div class="lgTop"><button class="lgBack" data-a2="home">&lsaquo; '+t('home')+'</button>'+
        '<h3>'+t('u_make')+'</h3><span class="lgCount">'+(kept?t('mk_tally',{n:kept}):'')+'</span>'+
        '<button class="lgSpk labSpk" data-a2="say" aria-label="'+t('voiceReplay')+'">'+SPK+'</button></div>'+

      '<div class="mkRing" id="mkRing">'+dots+'</div>'+
      '<p class="lgSay">'+t('mk_do')+'</p>'+
      '<div class="mkPads">'+pads+'</div>'+
      '<div class="mkBtns">'+
        '<button class="btn mkClear" data-mk="clear">'+t('mk_clear')+'</button>'+
        '<button class="btn primary mkKeep" data-mk="keep">'+t('mk_keep')+'</button>'+
        (kept?'<button class="btn mkDone" data-mk="done">'+t('mk_done')+'</button>':'')+
        '</div>');
  }

  // Schedule one whole bar at once: the groove, plus whatever the child has put in the grid. Doing
  // it a bar at a time keeps it sample-accurate without a per-frame scheduler fighting the browser.
  function bar(t0){
    for(let i=0;i<MAKE_SLOTS;i++){
      const t=t0+i*SLOT;
      try{
        if(i%4===0)dHit('K',t,i===0?1.15:0.95,true);          // a kick on each beat 1 and 3
        if(i%2===1)dHit('h',t,0.30+Math.random()*0.10);        // light off-beat hats
        if(i===4)dHit('s',t,0.85,true);                        // backbeat
      }catch(e){}
      const d=grid[i];
      if(d!=null){try{note(degCents(d),98,SLOT*1.6);}catch(e){}}
    }
    bars++;
  }
  function tick(){
    if(busy)return;
    const now=AC.currentTime;
    if(now>=loopAt-0.08){bar(loopAt);loopAt+=LOOP;}            // schedule the next bar just before it starts
    const pos=Math.floor(((now-(loopAt-LOOP))/SLOT))%MAKE_SLOTS;
    if(pos!==cur&&pos>=0){cur=pos;
      const dd=document.querySelectorAll('.mkSlot');
      dd.forEach((e,i)=>e.classList.toggle('now',i===cur));}
    raf=requestAnimationFrame(tick);
  }
  const onDown=(e)=>{
    const pad=e.target.closest&&e.target.closest('.mkPad');
    const btn=e.target.closest&&e.target.closest('[data-mk]');
    if(pad&&!busy){
      e.preventDefault();
      const d=+pad.dataset.d;
      // snap to the NEAREST eighth, not the last one -- a tap a hair early still lands where the
      // child meant it, which is the difference between "it works" and "it fights me"
      const now=AC.currentTime, start=loopAt-LOOP;
      let slot=Math.round((now-start)/SLOT)%MAKE_SLOTS;
      if(slot<0)slot+=MAKE_SLOTS;
      grid[slot]=d;
      try{note(degCents(d),104,SLOT*1.6);}catch(e){}            // you hear the tap itself, right now
      pad.classList.remove('hit');void pad.offsetWidth;pad.classList.add('hit');
      paint();
      return;
    }
    if(btn&&!busy){
      e.preventDefault();
      if(btn.dataset.mk==='clear'){grid=new Array(MAKE_SLOTS).fill(null);paint();return;}
      if(btn.dataset.mk==='done'){                             // the child says when they are finished
        busy=true;cancelAnimationFrame(raf);
        later(()=>{stageOff();finish('make',t('mk_name'));},120);return;}
      if(btn.dataset.mk==='keep'){
        if(!grid.some(g=>g!=null))return;                       // nothing made yet: ignore, never scold
        kept++; score('make',true);
        if(kept===1)seen('make');     // one loop made IS the lesson learned. no need to make a second.
        const fd=document.querySelector('.lgSay');if(fd)fd.textContent=t('mk_kept');
        grid=new Array(MAKE_SLOTS).fill(null);
        later(paint,700);
      }
    }
  };
  ov.addEventListener('pointerdown',onDown,true);
  window._lab_mkGrid=()=>grid.slice();      // readable: dev-make proves taps land on the grid
  window._lab_mkTap=(d)=>{const el=document.querySelector('.mkPad[data-d="'+d+'"]');
    if(el)el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));};
  _render=paint;paint();
  loopAt=AC.currentTime+0.25;raf=requestAnimationFrame(tick);
  _cleanup=()=>{_noteAnswer=null;busy=true;cancelAnimationFrame(raf);
    try{ov.removeEventListener('pointerdown',onDown,true);}catch(e){}
    window._lab_mkGrid=null;window._lab_mkTap=null;stageOff();LAB.clear();};
}

function restUnit(){
  readUnit({id:'rest',title:'u_rest',doIt:'rs_do',name:'rs_name',need:10,
    pick:()=>({notes:BARS.rest[(Math.random()*BARS.rest.length)|0]})});
}
function songUnit(){
  readUnit({id:'song',title:'u_song',doIt:'sg_do',name:'sg_name',need:6,
    pick:()=>{const s=BARS.song[(Math.random()*BARS.song.length)|0];
      return {notes:s.bars[0].concat(s.bars[1]||[]),title:s.n};}});
}

// ================================================================================================
//  THE PITCH LADDER - the melodic lessons' own screen, given the same treatment as the beat.
//  What they used before: the note tank (pitch encoded as the ANGLE of a polygon wall) plus a flat
//  keybed (pitch encoded as horizontal position). Neither shows a child what high and low mean, and
//  the keybed arrived with no indication of what it was for. High and low are SPATIAL words, so the
//  control is spatial: a ladder, low at the bottom, high at the top, one fat rung per note.
//  Fixed targets (a moving target is tapped correctly 37% of the time at ages 4-6; a still one 57%),
//  nothing on screen that is not the job, and the instruction is narrated as well as written.
// ================================================================================================
// COLOUR MEANS A NOTE. It used to be indexed by the rung's POSITION on screen, which made it noise:
// #a6c8ff was measured meaning "high", "so", "mi", "re" AND "me" depending which lesson you opened, so
// a child who learned "blue is so" was wrong two lessons later. It is indexed by SCALE DEGREE now, so
// do is one colour in every lesson and every key, and the colour is a second channel that agrees with
// the sound instead of fighting it. (Moveable-do, so it survives the transposition ramp; a fixed
// pitch-class scheme like Boomwhackers would break the moment the key moves.)
const RUNG_TINT=['#9fe6cf','#a6c8ff','#c4a9f5','#ffb6d6','#ffd3a8','#d9e88f','#8fe0d0'];
// Indexed by the DISTANCE FROM THE TONIC, not by the note's position in the scale. Position fails on
// the pentatonic, which skips the fourth: its 4th rung is the fifth of the key, so "rung 4" meant fa
// in one lesson and so in the next. Distance is the thing that actually holds -- and a lowered degree
// keeps its natural's hue, because me and mi are both the third and should look like it.
const SEMI_TINT=[0,1,1,2,2,3,3,4,5,5,6,6];   // do  ra re  me mi  fa fi  so  le la  te ti
function degTint(d){
  let c=0; try{c=degCents(d);}catch(e){c=d*200;}
  const semi=((Math.round(c/100)%12)+12)%12;
  return RUNG_TINT[SEMI_TINT[semi]];
}
const EAR='<svg viewBox="0 0 24 24"><path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.6"/><circle cx="17.5" cy="16" r="2.6"/></svg>';
// THE KEY MOVES. Measured before this went in: "The Major Pentatonic" sounded FIVE distinct pitches
// across sixty answered rounds, for every session, forever. The root was pinned for the whole visit,
// so the ladder's pitches, positions and colours never changed and a child could clear every melodic
// lesson by remembering WHICH SLOT, having never once compared two sounds. The app was using
// moveable-do names on a fixed-pitch instrument, which is the worst of both.
// It is ramped, not switched on: lessons 1-9 hold one key so a beginner has something to anchor to,
// and from the relative-minor lesson onwards the key moves between questions -- by then "the tonic can
// be anywhere" IS the lesson. The range is kept inside a child's comfortable singing register.
// The labels and the colours are scale-relative, so neither moves when the key does; only the sound.
const ROAM=[-5,-4,-3,-2,0,2,3,4,5,7];
// ...and wherever the roam lands, the tonic is pulled back into one singable octave. Two reasons: a
// low tone is genuinely harder to pitch-match, and the lesson's starting key was never fixed in the
// first place -- it inherited whatever the app happened to be left on, so one child got the lesson in
// F and another in B. MIDI 57-69 is A3-A4, inside a child's comfortable range at either end.
const SING_LO=57, SING_HI=69;
const inSingRange=(m)=>{ while(m<SING_LO)m+=12; while(m>SING_HI)m-=12; return m; };
function ladderUnit(cfg){
  stageOff();
  const id=cfg.id, need=cfg.need||10;
  let rungs=[], right=0, busy=false, target=null, phase=0, roamAt=0;
  // ONE ANSWER PER QUESTION. `busy` only went true at the END of a unit, so until then every tap
  // scored: a child could hit 1,2,3,4 and one of them had to be right. That is not an answer, it is
  // a brute force, and it was being written into the progress file as mastery. `armed` is the real
  // gate: a question arms it, the first committed answer disarms it, the next question arms it again.
  let armed=false;
  // ORFF STAGE TWO: EXPLORE.
  // The sequence every one of the big approaches uses is imitate -> explore -> improvise -> compose,
  // and this curriculum did the first one twenty-three times and never the rest. The notes for the
  // lesson are already loaded in the tank by the time the first question fires, so the cheapest
  // honest fix is: let the child play them first. No target, no scoring, no clock. They press the
  // button themselves when they want the questions, which means the questions arrive to a child who
  // already knows what these notes sound like under their own finger.
  let exploring=(cfg.explore!==false);
  let touched=0;   // how many notes they tried before asking for the questions


  try{initAudio();if(AC&&AC.state==='suspended')AC.resume();}catch(e){}
  const HOME=()=>((LAB._saved&&LAB._saved.root!=null)?LAB._saved.root:S.root)+(cfg.rootShift||0);
  // the tank still SOUNDS the notes - it is the app's instrument - but it is not on screen.
  function take(){
    LAB.take({scale:(cfg.scales?cfg.scales[Math.min(phase,cfg.scales.length-1)]:cfg.scale)||'pentaMaj',
              root:inSingRange(HOME()+roamAt),octs:1,drums:false,band:false,touch:false});
    LAB.labels(null);LAB.clear();
    if(cfg.letters)refreshAbc(); }
  function refreshAbc(){
    rungs.forEach(r=>{const el=r.querySelector('.rgAbc');
      if(el)el.textContent=letterFor(+r.dataset.deg);}); }
  take();
  function setOf(){ return (typeof cfg.use==='function')?cfg.use(phase):cfg.use; }
  function retake(){ if(cfg.scales)take(); }   // a lesson that changes scale between phases
  // A single isolated pitch cannot be named without absolute pitch, so a roaming lesson has to hand
  // the child the tonic first. That is how ear training is actually done, and it is what makes the
  // question answerable by ear instead of by memory.
  function reKey(){ if(!cfg.roam)return;
    roamAt=ROAM[(Math.random()*ROAM.length)|0]; take(); }
  function withAnchor(fn){
    // anchor:false for a lesson whose ANSWER is the tonic -- sounding do first would hand it over.
    // Those lessons play a cadence that leans home instead, which is its own anchor.
    if(!cfg.roam||cfg.anchor===false)return fn();
    sing(0,78,.5); later(fn,820); }
  function name(d){
    if(cfg.names&&cfg.names[d]!=null)return cfg.names[d];
    let c=0;try{c=degCents(d);}catch(e){c=d*200;}
    return solfegeFor(c)||String(d+1);
  }
  function paint(){
    const use=setOf();
    // built LOW FIRST; the container is column-reverse, so the highest note ends up at the top.
    const ladder=use.map((d,i)=>
      '<button class="lgRung" data-deg="'+d+'" style="--rc:'+degTint(d)+'">'+
        '<span class="rgName">'+name(d)+'</span>'+
        (cfg.letters?'<span class="rgAbc">'+letterFor(d)+'</span>':'')+
        '<span class="rgDeg">'+(i===0?'LOW':(i===use.length-1?'HIGH':''))+'</span></button>').join('');
    stage(
      '<div class="lgTop"><button class="lgBack" data-a2="home">&lsaquo; '+t('home')+'</button>'+
        '<h3>'+t(cfg.title)+'</h3><span class="lgCount">'+(exploring?'':right+' / '+need)+'</span>'+
        '<button class="lgSpk labSpk" data-a2="say" aria-label="'+t('voiceReplay')+'">'+SPK+'</button></div>'+
      (exploring?'':'<div class="lgDots">'+Array.from({length:need},(_,i)=>'<i class="'+(i<right?'got':'')+'"></i>').join('')+'</div>')+
      '<div class="lgLadder" id="lgLadder">'+ladder+'</div>'+
      '<p class="lgSay">'+t(exploring?'ex_do':cfg.doIt)+'</p>'+
      '<div class="lgFeed" id="lgFeed"></div>'+
      (exploring
        ? '<div class="lgHint"><button class="btn primary lgReady" data-lg="ready">'+t('ex_ready')+'</button></div>'
        : '<div class="lgHint"><button class="lgListen" data-a2="lg_again">'+EAR+' '+t('listen')+'</button></div>'));
    rungs=[...document.querySelectorAll('.lgRung')];
    if(target!=null)markTarget();
  }
  function markTarget(){ rungs.forEach(r=>r.classList.toggle('target', cfg.showTarget===true && +r.dataset.deg===target));
    window._labHintDeg=target; }   // readable target: dev-lessons drives the lesson through this
  function startAsking(){
    if(!exploring)return;
    exploring=false; paint();
    try{window.__exploredFor=(window.__exploredFor||{});window.__exploredFor[id]=touched;}catch(e){}
    later(ask,420);
  }
  window._lab_ready=startAsking;   // readable: dev-explore.js presses it the way a child would
  window._lab_exploring=()=>exploring;
  function ask(){ if(busy)return; reKey(); target=cfg.pick(setOf(),phase); armed=true; markTarget();
    withAnchor(()=>cfg.play(target,setOf())); }
  window._lab_lgAgain=()=>{ if(!busy&&target!=null)withAnchor(()=>cfg.play(target,setOf())); };
  window._labRoam=()=>roamAt;   // readable: dev-curriculum proves the key actually moves
  function answer(ok,deg){
    if(busy||!armed)return;
    armed=false;
    // the due-clock belongs to the ANSWER. resetting it when the question was merely drawn meant a
    // child who looked at a card and wandered off had it filed as reviewed.
    try{if(cfg.onAnswer)cfg.onAnswer();}catch(e){}
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
  const commit=(d,flash)=>{
    if(flash){const r=rungs.find(x=>+x.dataset.deg===d);
      if(r){r.classList.add('press');setTimeout(()=>r.classList.remove('press'),90);}}
    answer(cfg.correct?cfg.correct(d,target):(d===target), d);};
  // playing the note IS answering. the note already sounded under the child's finger, so this does
  // not re-sing it -- it lights the rung they played and scores it exactly like a tap.
  _noteAnswer=(cents)=>{
    if(busy||!armed||!rungs.length)return false;
    // match against THE RUNGS ON SCREEN, octave-agnostic: any C answers "do". A child reaching for
    // mi who lands a few cents off still meant mi; past a quarter-tone they meant something else.
    let best=null,bestGap=1e9;
    for(const r of rungs){const d=+r.dataset.deg;let c;
      try{c=degCents(d);}catch(e){continue;}
      if(!Number.isFinite(c))continue;
      const gap=Math.abs(((cents-c)%1200+1800)%1200-600);
      if(gap<bestGap){bestGap=gap;best=d;}}
    if(best==null||bestGap>50)return false;
    commit(best,true); return true; };
  const onDown=(e)=>{
    const rdy=e.target.closest&&e.target.closest('[data-lg="ready"]');
    if(rdy){e.preventDefault();startAsking();return;}
    const r=e.target.closest&&e.target.closest('.lgRung');if(!r)return;
    e.preventDefault();
    r.classList.add('press');setTimeout(()=>r.classList.remove('press'),90);
    const d=+r.dataset.deg; sing(d,94,.5);
    if(exploring){touched++;return;}    // exploring: the note is the whole point, nothing is scored
    commit(d,false);};
  ov.addEventListener('pointerdown',onDown,true);
  _render=paint;paint();
  if(exploring){ later(()=>{try{cfg.play&&null;}catch(e){}},0); }   // nothing to play yet: their turn first
  else later(ask,700);
  _cleanup=()=>{_noteAnswer=null;busy=true;try{ov.removeEventListener('pointerdown',onDown,true);}catch(e){}
    window._lab_lgAgain=null;stageOff();LAB.clear();};
}

// The tank-and-keybed engine that every lesson used to run on lived here. Every lesson now has a
// screen built for what it teaches, so it has no callers left. Deleted rather than kept 'just in
// case': a second way to render a lesson is a second place for lesson copy to rot unnoticed.

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
  _cleanup=()=>{_noteAnswer=null;done=true;cancelAnimationFrame(raf);
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
// ---------- 2. SAY IT FIRST ----------
// Was the last lesson still running on the tank: a rhythm lesson that arrived with a polygon and a
// solfege keybed on it. The idea is two drums and the words for them, so the screen is two drums and
// the words for them. The pattern is SHOWN as the words before it is heard, high words riding high on
// the line and low words low, so a child who cannot read still sees the shape of it.
function sayPlayUnit(){
  stageOff();
  const need=10, LOW=0, HIGH=2;
  let pat=SP_PATTERNS[0], idx=0, mine=true, right=0, busy=false;
  try{initAudio();if(AC&&AC.state==='suspended')AC.resume();}catch(e){}
  LAB.take({scale:'pentaMaj',octs:1,drums:false,band:false,touch:false});
  LAB.labels(null);LAB.clear();
  function paint(){
    const words=pat.map((v,i)=>{
      const cls=(v?'lo':'hi')+(mine? (i===idx?' on':'') : (i<idx?' done':(i===idx?' on':'')));
      return '<b class="'+cls+'">'+(v?t('sp_low'):t('sp_high'))+'</b>';}).join('');
    stage('<div class="lgTop"><button class="lgBack" data-a2="home">&lsaquo; '+t('home')+'</button>'+
        '<h3>'+t('u_sayplay')+'</h3><span class="lgCount">'+right+' / '+need+'</span>'+
        '<button class="lgSpk labSpk" data-a2="say" aria-label="'+t('voiceReplay')+'">'+SPK+'</button></div>'+
      '<div class="lgDots">'+Array.from({length:need},(_,i)=>'<i class="'+(i<right?'got':'')+'"></i>').join('')+'</div>'+
      '<div class="lgLadder" style="justify-content:safe center;flex:1">'+
        '<p class="lgSay" style="font-size:18px">'+t('sp_hear')+'</p>'+
        '<div class="lgWords">'+words+'</div></div>'+
      '<p class="lgSay">'+t(mine?'sp_listen':'sp_say')+'</p><div class="lgFeed" id="lgFeed"></div>'+
      '<div class="lgHint"><button class="lgListen" data-a2="lg_again">'+EAR+' '+t('listen')+'</button></div>'+
      '<div class="lgChoice">'+
        '<button data-sp="1" style="--rc:#b9aee0">'+t('sp_low')+'</button>'+
        '<button data-sp="0" style="--rc:#9fe6cf">'+t('sp_high')+'</button></div>');
  }
  function play(){                    // said out loud AND played, one word at a time
    mine=true;idx=0;paint();
    pat.forEach((v,i)=>later(()=>{idx=i;paint();
      speech(v?t('sp_low'):t('sp_high'),true);       // the vocalising IS the lesson
      sing(v?LOW:HIGH,90,.4);
      if(i===pat.length-1)later(()=>{mine=false;idx=0;paint();publish();},620);},i*620));
  }
  window._lab_lgAgain=()=>{if(!busy&&!mine)play();};
  window._labSayPat=()=>pat.slice();               // readable targets for the test drivers
  const publish=()=>{window._labExpect=(!mine&&!busy)?(pat[idx]?'low':'high'):null;};
  function ask(){pat=SP_PATTERNS[(Math.random()*SP_PATTERNS.length)|0];later(play,260);}
  const onDown=(e)=>{const b=e.target.closest&&e.target.closest('[data-sp]');if(!b||busy||mine)return;
    e.preventDefault();
    const low=(b.dataset.sp==='1');
    sing(low?LOW:HIGH,92,.4);
    b.classList.remove('right','wrong');void b.offsetWidth;b.classList.add(low===!!pat[idx]?'right':'wrong');
    later(()=>b.classList.remove('right','wrong'),360);
    const fd=document.getElementById('lgFeed');
    if(low!==!!pat[idx]){score('sayplay',false);if(fd)fd.textContent=t('onceMore');
      busy=true;publish();later(()=>{busy=false;play();},900);return;}
    idx++;paint();publish();
    if(idx>=pat.length){score('sayplay',true);right++;
      const f2=document.getElementById('lgFeed');if(f2)f2.textContent=t('yes');
      const c=document.querySelector('.lgCount');if(c)c.textContent=right+' / '+need;
      document.querySelectorAll('.lgDots i').forEach((x,i)=>x.classList.toggle('got',i<right));
      if(right>=need){busy=true;later(()=>{stageOff();finish('sayplay',t('sp_name'));},800);return;}
      busy=true;publish();later(()=>{busy=false;ask();},900);}};
  ov.addEventListener('pointerdown',onDown,true);
  _render=paint;paint();ask();
  _cleanup=()=>{_noteAnswer=null;busy=true;try{ov.removeEventListener('pointerdown',onDown,true);}catch(e){}
    window._lab_lgAgain=null;window._labSayPat=null;window._labExpect=null;stageOff();LAB.clear();};
}

// ---------- 3. HIGH AND LOW -- two notes, as far apart as the ladder goes ----------
// No solfege yet. Gordon puts verbal association at level 2 of 8, AFTER aural/oral: the child hears
// and answers before anything is given a name. So the rungs just say low and high.
function highUnit(){
  ladderUnit({id:'high',title:'u_high',doIt:'high_do',name:'high_name',
    use:[DEG.do,DEG.la],need:10,names:{0:'low',4:'high'},showTarget:false,
    pick:(u)=>u[(Math.random()*u.length)|0],
    play:(d)=>{sing(DEG.mi,80,.42);later(()=>sing(d,94,.6),520);}});  // middle note first, then the one to judge
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
// This lesson asks WHICH do finished the phrase -- the low one or the octave. The phrase therefore
// has to point at one of them. It did not: leanHome took no argument, ignored the target entirely,
// and played a random phrase out of the middle of the ladder, so the child was told "not yet" half
// the time for tapping the right note in the wrong octave. A driver scored 8/14 tapping the bottom
// rung every time -- chance. It was unanswerable by ear, and it was my own doing: I added the octave
// do to stop a child clearing it by always tapping the bottom, and made it a coin flip instead.
// Now the phrase LEANS: it walks down and finishes a step above the low do, or walks up and finishes
// a step below the octave. Direction is the answer, which is what "find home" actually trains.
const LEAN_DOWN=[[DEG.so,DEG.mi,DEG.re],[DEG.mi,DEG.re],[DEG.la,DEG.so,DEG.mi,DEG.re]];
const LEAN_UP  =[[DEG.mi,DEG.so,DEG.la],[DEG.so,DEG.la],[DEG.re,DEG.mi,DEG.so,DEG.la]];
function leanHome(target){
  const up=(target===5);                      // 5 is do an octave up; 0 is the low do
  const set=up?LEAN_UP:LEAN_DOWN;
  const ph=set[(Math.random()*set.length)|0];
  ph.forEach((d,i)=>later(()=>sing(d,88,.42),i*430));
}
function homeUnit(){
  ladderUnit({id:'home',title:'u_home',doIt:'home_do',name:'home_name',
    use:[DEG.do,DEG.mi,DEG.so,5],need:10,showTarget:false,   // 5 = do an octave up: also home
    pick:()=>Math.random()<0.5?DEG.do:5,
    play:leanHome});
}
// ---------- 6. STEPS AND SKIPS -- walk up the ladder one rung at a time ----------
function stepsUnit(){
  let from=2;                                  // start in the middle so both directions are available
  ladderUnit({id:'steps',title:'u_steps',doIt:'steps_do',name:'steps_name',
    use:[0,1,2,3,4],need:10,showTarget:false,
    pick:()=>{const o=[from-2,from-1,from+1,from+2].filter(d=>d>=0&&d<=4);
      return o[(Math.random()*o.length)|0];},  // a step (next rung) or a skip (over one), either way
    correct:(d,tg)=>{const ok=(d===tg);if(ok)from=tg;return ok;},
    play:(d)=>{sing(from,84,.42);later(()=>sing(d,94,.5),500);}});  // where you are, then where to go
}
// ---------- 7. SAME NOTES, NEW HOME -- the la-pentatonic ----------
// Kodaly Grade 2: the step after the major pentatonic is not the major scale, it is these same five
// notes with a different one in charge. Nothing new to learn; everything sounds different.
function sadFiveUnit(){
  ladderUnit({id:'newhome',title:'u_newhome',doIt:'sad_do',name:'sad_name',
    scale:'pentaMin',rootShift:9,use:[0,1,2,3,4],need:10,showTarget:false,roam:true,
    pick:(u)=>u[(Math.random()*u.length)|0],
    play:(d)=>sing(d,94,.55)});
}
// ---------- 8. THE MAJOR SCALE -- fa, then ti ----------
// Two lessons before ("add fa", "add ti"), which were one arc split in half. fa arrives a whole grade
// before ti in the Kodaly sequence, so it still arrives first -- as phase one of the same lesson.
function majorScaleUnit(){
  ladderUnit({id:'majorscale',title:'u_majorscale',doIt:'ms_do',name:'ms_name',
    scale:'major',use:(ph)=>ph?[0,1,2,3,4,5,6]:[0,1,2,3,4,5],need:12,phases:6,maxPhase:1,showTarget:false,roam:true,letters:true,
    phaseSay:[null,'ms_p1'],
    pick:(u)=>u[(Math.random()*u.length)|0],
    play:(d)=>sing(d,94,.55)});
}
// ---------- 9. BRIGHT AND DARK -- major and minor, one note apart ----------
// Two buttons, no ladder: the answer is a judgement about a sound, not a note to find. Plays the same
// three notes twice and moves only the middle one, in raw cents, so no scale swap is needed.
function brightDarkUnit(){
  // the same two-choice screen as up/down: one sound, two big buttons, nothing else
  choiceUnit({id:'brightdark',title:'u_brightdark',hear:'bd_hear',doIt:'bd_do',name:'bd_name',
    scale:'major',need:10,
    opts:[{v:'bright',label:'bright',tint:'#ffe08a'},{v:'dark',label:'dark',tint:'#a9b6f0'}],
    pick:()=>Math.random()<0.5?'bright':'dark',
    art:(v)=>[0,(v==='bright')?4:3,7],
    // Arpeggio FIRST so the moving note is audible on its own, then the same three notes TOGETHER.
    // It used to stop after the arpeggio: the one lesson in the course about a chord never played one,
    // and nowhere in fifteen lessons did two notes sound at the same time.
    play:(v)=>{const third=(v==='bright')?400:300;
      note(0,92,.5);later(()=>note(third,92,.5),420);later(()=>note(700,92,.5),840);
      later(()=>{note(0,86,1.4);note(third,86,1.4);note(700,86,1.4);},1340);}});
}
// ---------- INTERVALS -- the first time two notes are ever heard at once ----------
// It lands right after major/minor because it needs the same ear and because the child already owns
// the idea from "Steps and Skips": this is that idea heard TOGETHER instead of one after the other.
// A major 2nd against a perfect 5th is the widest contrast in the whole subject -- one beats and
// grinds, the other is hollow and open -- so it is the honest place to start naming intervals.
function intervalUnit(){
  choiceUnit({id:'intervals',title:'u_intervals',hear:'iv_hear',doIt:'iv_do',name:'iv_name',
    scale:'major',need:10,
    opts:[{v:'near',label:'iv_near',tint:'#a6c8ff'},{v:'far',label:'iv_far',tint:'#ffd3a8'}],
    pick:()=>Math.random()<0.5?'near':'far',
    art:(v)=>[0,(v==='near')?2:7],
    play:(v)=>{const gap=(v==='near')?200:700;          // a major 2nd, or a perfect 5th
      note(0,88,1.5); note(gap,88,1.5);}});             // sounded AT THE SAME TIME
}
// ---------- 10-12. THE SEVEN-NOTE SCALES ----------
function scaleLadder(id,title,scales,doIt,nameK,need,phases,maxPhase,phaseSay){
  ladderUnit({id:id,title:title,doIt:doIt,name:nameK,scales:scales,
    use:[0,1,2,3,4,5,6],need:need||10,phases:phases,maxPhase:maxPhase||0,phaseSay:phaseSay,showTarget:false,roam:true,letters:true,
    pick:(u)=>u[(Math.random()*u.length)|0],
    play:(d)=>sing(d,94,.55)});
}
function minorScaleUnit(){scaleLadder('minorscale','u_minorscale',['minor'],'mn_do','mn_name',10);}
// The three minor shapes differ by ONE note (the seventh) and then by two (the sixth). Hearing which
// one you are in is the skill; hunting for a rung is not. Same run of notes, three endings.
function minorShapesUnit(){
  choiceUnit({id:'minorshapes',roam:true,title:'u_minorshapes',hear:'sh_hear',doIt:'sh_do',name:'sh_name',
    scale:'minor',need:10,
    opts:[{v:'nat',label:'sh_nat',tint:'#b5a9f5'},{v:'harm',label:'sh_harm',tint:'#ffd3a8'},{v:'mel',label:'sh_mel',tint:'#9fe6cf'}],
    pick:()=>['nat','harm','mel'][(Math.random()*3)|0],
    play:(v)=>{
      // walk up 5-6-7-8. natural: flat 6, flat 7. harmonic: flat 6, RAISED 7 (that big gap is the
      // sound). melodic: raised 6 AND 7, which is why it sounds almost major on the way up.
      const six=(v==='mel')?900:800, sev=(v==='nat')?1000:1100;
      [700,six,sev,1200].forEach((c,i)=>later(()=>note(c,96,0.42),i*370));}});
}
// A mode is a colour, not a note-hunt. Dorian and Mixolydian are each one note away from a scale the
// child already owns, so the question is which one that note makes it sound like.
function modesUnit(){
  choiceUnit({id:'modes',roam:true,title:'u_modes',hear:'md_hear',doIt:'md_do',name:'md_name',
    scale:'major',need:10,
    opts:[{v:'dor',label:'md_dor',tint:'#9fe0c4'},{v:'mix',label:'md_mix',tint:'#ffe0a8'}],
    pick:()=>Math.random()<0.5?'dor':'mix',
    play:(v)=>{
      // dorian = minor with a bright sixth; mixolydian = major with a soft seventh. Play the scale
      // to the note that decides it, then the chord underneath so the colour is unmistakable.
      const sc=(v==='dor')?[0,200,300,500,700,900,1000]:[0,200,400,500,700,900,1000];
      sc.forEach((c,i)=>later(()=>note(c,92,0.3),i*230));
      later(()=>{const th=(v==='dor')?300:400;note(0,84,1.6);note(th,84,1.6);note(700,84,1.6);note(1000,80,1.6);},sc.length*230+180);}});
}

// ================================================================================================
//  THE STAFF -- the one thing a book does that this did not.
//  The course already notated RHYTHM: note heads, stems, bar lines, rests, a 4/4 sign. What it never
//  drew was PITCH, so "Playing from Notation" had the child clap the rhythm of Hot Cross Buns without
//  ever playing the tune. Half a thought.
//  The bridge is already built: the ladder IS a staff. It is vertical, high notes are at the top, one
//  slot per note. A staff is the same picture with five lines. So this block says exactly that -- the
//  ladder you know, drawn the way grown-ups draw it -- and changes nothing else about the job.
//  It sits LAST on purpose. Sound before symbol (Kodaly, Suzuki, Gordon). Twenty lessons of ear work
//  come first; this is where the ear gets a page to write on.
//  Pinned to C major, no roaming, no key signature, no accidentals. Every other lesson roams to stop
//  the child answering from screen position -- here the screen position IS the lesson.
// ================================================================================================
const STAFF_LTR=['C','D','E','F','G','A','B','C'];   // middle C up to the next C: do re mi fa so la ti do
const STAFF_SEMI=[0,2,4,5,7,9,11,12];
// Geometry, in the SVG's own units. 5 lines, 14 apart. Bottom line is E4, so each diatonic step is
// half a line-gap up from it, and middle C lands one ledger line below the staff.
const ST_TOP=30, ST_GAP=14, ST_HALF=7, ST_X0=120, ST_DX=52;
const staffY=(step)=>ST_TOP+4*ST_GAP-(step-2)*ST_HALF;   // step 0 = C4, step 2 = E4 = bottom line
function staffNoteSVG(step,x,cls,fill){
  const y=staffY(step);
  let led='';
  if(step<=0)led='<line class="stLed" x1="'+(x-16)+'" y1="'+staffY(0)+'" x2="'+(x+16)+'" y2="'+staffY(0)+'"/>';
  if(step>=8)led='<line class="stLed" x1="'+(x-16)+'" y1="'+staffY(8)+'" x2="'+(x+16)+'" y2="'+staffY(8)+'"/>';
  // stems go UP (on the right) below the middle line, DOWN (on the left) on or above it
  const up=(step<6);
  const stem='<rect x="'+(up?x+9:x-11)+'" y="'+(up?y-42:y+2)+'" width="3.2" height="42" fill="'+(fill||'#2f2a44')+'"/>';
  return led+'<g class="'+(cls||'')+'">'+stem+
    '<ellipse cx="'+x+'" cy="'+y+'" rx="10.5" ry="8" transform="rotate(-18 '+x+' '+y+')" fill="'+(fill||'#2f2a44')+'"/></g>';
}
// The G-clef, generated rather than hand-tuned. Its whole meaning is that the spiral wraps the G
// line, so that is literally how it is built: a spiral centred on G4, then a sweep up over the top
// of the staff and back down through it to a hook below. Drawing it beats depending on a music font
// being installed, and generating it beats me guessing at bezier handles.
function clefPath(){
  const cx=54, cy=ST_TOP+3*ST_GAP;           // the second line from the bottom = G4
  const pts=[];
  const N=120, TURNS=2.15, R0=2.6, R1=17.5;
  for(let i=0;i<=N;i++){
    const u=i/N, a=Math.PI*0.35+u*TURNS*Math.PI*2, r=R0+(R1-R0)*Math.pow(u,0.88);
    pts.push([cx+Math.cos(a)*r, cy+Math.sin(a)*r]);
  }
  let d='M'+pts[0][0].toFixed(1)+' '+pts[0][1].toFixed(1);
  for(let i=1;i<pts.length;i++)d+=' L'+pts[i][0].toFixed(1)+' '+pts[i][1].toFixed(1);
  const [ex,ey]=pts[pts.length-1];
  // up and over the top of the staff, then straight back down through it, then the tail hook
  const top=ST_TOP-13, bot=ST_TOP+4*ST_GAP+17;
  d+=' C'+(ex-6).toFixed(1)+' '+(ey-26)+' '+(cx-9)+' '+(top+16)+' '+(cx+2)+' '+top;
  d+=' C'+(cx+13)+' '+(top-9)+' '+(cx+21)+' '+(top+13)+' '+(cx+15)+' '+(top+30);
  d+=' L'+(cx+8)+' '+(bot-16);
  d+=' C'+(cx+6)+' '+bot+' '+(cx-11)+' '+(bot+3)+' '+(cx-13)+' '+(bot-8);
  return d;
}
const CLEF='<path class="stClef" d="'+clefPath()+'" fill="none" stroke="#5b4f82" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>';
function staffFrame(inner,w){
  let lines='';
  for(let i=0;i<5;i++){const y=ST_TOP+i*ST_GAP;
    lines+='<line class="stLine" x1="34" y1="'+y+'" x2="'+(w-14)+'" y2="'+y+'"/>';}
  return '<svg class="stSvg" viewBox="18 4 '+(w-24)+' 118" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'+
    lines+CLEF+inner+'</svg>';
}

// ---------- 21. THE STAFF -- hear it, then find it on the lines ----------
function staffUnit(){
  stageOff();
  const need=10; let right=0,busy=false,target=null,hit=null;
  try{initAudio();if(AC&&AC.state==='suspended')AC.resume();}catch(e){}
  // C major, fixed. The ear work is done; this lesson is about the picture.
  LAB.take({scale:'major',root:60,octs:1,drums:false,band:false,touch:false});
  LAB.labels(null);LAB.clear();
  const W=ST_X0+ST_DX*1.2;
  function paint(){
    // one note at a time, dead centre, with every position tappable
    const x=ST_X0;
    let hits='';
    for(let st=0;st<=7;st++){
      const y=staffY(st);
      hits+='<rect class="stHit" data-st="'+st+'" x="'+(x-22)+'" y="'+(y-ST_HALF)+'" width="44" height="'+(ST_HALF*2)+'"/>';
    }
    const note=(target!=null)?staffNoteSVG(target,x,'stNote'+(hit==null?'':(hit?' ok':' no')),'#2f2a44'):'';
    stage(
      '<div class="lgTop"><button class="lgBack" data-a2="home">&lsaquo; '+t('home')+'</button>'+
        '<h3>'+t('u_staff')+'</h3><span class="lgCount">'+right+' / '+need+'</span>'+
        '<button class="lgSpk labSpk" data-a2="say" aria-label="'+t('voiceReplay')+'">'+SPK+'</button></div>'+
      '<div class="lgDots">'+Array.from({length:need},(_,i)=>'<i class="'+(i<right?'got':'')+'"></i>').join('')+'</div>'+
      '<div class="stWrap">'+staffFrame(note+hits,W)+'</div>'+
      '<p class="lgSay">'+t('st_do')+'</p><div class="lgFeed" id="lgFeed"></div>'+
      '<div class="lgHint"><button class="lgListen" data-a2="lg_again">'+EAR+' '+t('listen')+'</button></div>');
  }
  const play=()=>{try{note(STAFF_SEMI[target]*100,94,0.6);}catch(e){}};
  function ask(){hit=null;target=(Math.random()*8)|0;window._labHintDeg=target;paint();later(play,280);}
  window._lab_lgAgain=()=>{if(!busy&&target!=null)play();};
  const onDown=(e)=>{
    const r=e.target.closest&&e.target.closest('.stHit');if(!r||busy||target==null)return;
    e.preventDefault();
    const st=+r.dataset.st, ok=(st===target);
    score('staff',ok); hit=ok;
    if(!ok){ // show where it actually was, then try again -- a wrong answer has to teach something
      target=target; }
    paint();
    const fd=document.getElementById('lgFeed');
    if(fd)fd.textContent=ok?t('yes'):(STAFF_LTR[target]+' — '+t('onceMore'));
    if(ok){right++;
      const c=document.querySelector('.lgCount');if(c)c.textContent=right+' / '+need;
      document.querySelectorAll('.lgDots i').forEach((x,i)=>x.classList.toggle('got',i<right));
      if(right>=need){busy=true;later(()=>{stageOff();finish('staff',t('st_name'));},820);return;}}
    later(ask,ok?760:1250);
  };
  ov.addEventListener('pointerdown',onDown,true);
  _render=paint;ask();
  _cleanup=()=>{_noteAnswer=null;busy=true;try{ov.removeEventListener('pointerdown',onDown,true);}catch(e){}
    window._lab_lgAgain=null;window._labHintDeg=null;stageOff();LAB.clear();};
}

// ---------- 22. READING A MELODY -- the actual "off the page" lesson ----------
// Hot Cross Buns is the first melody in every method there is, and it is mi-re-do: three notes, all
// next to each other, all inside the octave this block just taught. The child reads left to right
// and plays each note by its place on the staff. No click track and no timing window -- reading the
// PITCH is the whole job here, and the rhythm lessons already did rhythm.
// Tunes are stored as PHRASES, not as one long ribbon of notes. A method book never puts fourteen
// notes in front of a beginner; it puts one line. Short phrases also keep the staff wide enough on
// screen to be legible, which a fourteen-note stave is not on a phone.
const TUNES=[
  {n:'song_hotcross', ph:[[2,1,0],[2,1,0],[0,0,0,0],[2,1,0]]},          // mi re do -- the first tune in every method
  {n:'song_mary',     ph:[[2,1,0,1],[2,2,2],[1,1,1],[2,4,4]]},
  {n:'song_ode',      ph:[[2,2,3,4],[4,3,2,1],[0,0,1,2],[1,0,0]]}       // Beethoven, public domain since 1827
];
function melodyUnit(){
  stageOff();
  let tune=null, pi=0, at=0, done=0, busy=false;
  const need=4;                                   // four phrases read clean
  try{initAudio();if(AC&&AC.state==='suspended')AC.resume();}catch(e){}
  LAB.take({scale:'major',root:60,octs:1,drums:false,band:false,touch:false});
  LAB.labels(null);LAB.clear();
  const phrase=()=>tune.ph[pi];
  function build(){tune=TUNES[(Math.random()*TUNES.length)|0];pi=(Math.random()*tune.ph.length)|0;at=0;}
  function paint(){
    const ph=phrase(), n=ph.length, W=ST_X0+ST_DX*(n-1)+56;
    let notes='';
    ph.forEach((st,i)=>{
      const x=ST_X0+i*ST_DX;
      const cls=(i<at)?'stNote done':(i===at?'stNote now':'stNote todo');
      notes+=staffNoteSVG(st,x,cls,(i<at)?'#3f9e78':(i===at?'#2f2a44':'#c9c2dd'));
    });
    // The staff is the thing to READ. The row underneath is the thing to PRESS -- it is the same
    // eight steps as the ladder from every lesson before this, laid on its side and named. That is
    // the whole bridge: you already know the ladder, this is how it is written down.
    const keys=STAFF_LTR.map((L,st)=>
      '<button class="stKey" data-st="'+st+'" style="--rc:'+degTint(Math.min(st,6))+'">'+L+'</button>').join('');
    stage(
      '<div class="lgTop"><button class="lgBack" data-a2="home">&lsaquo; '+t('home')+'</button>'+
        '<h3>'+t('u_melody')+'</h3><span class="lgCount">'+done+' / '+need+'</span>'+
        '<button class="lgSpk labSpk" data-a2="say" aria-label="'+t('voiceReplay')+'">'+SPK+'</button></div>'+
      '<div class="lgDots">'+Array.from({length:need},(_,i)=>'<i class="'+(i<done?'got':'')+'"></i>').join('')+'</div>'+
      '<p class="lgSay" style="font-size:19px;color:#463d66">'+t(tune.n)+'</p>'+
      '<div class="stWrap">'+staffFrame(notes,W)+'</div>'+
      '<p class="lgSay">'+t('ml_do')+'</p><div class="lgFeed" id="lgFeed"></div>'+
      '<div class="stKeys">'+keys+'</div>'+
      '<div class="lgHint"><button class="lgListen" data-a2="lg_again">'+EAR+' '+t('listen')+'</button></div>');
  }
  const hear=()=>{phrase().forEach((st,i)=>later(()=>{try{note(STAFF_SEMI[st]*100,90,0.36);}catch(e){}},i*430));};
  window._lab_lgAgain=()=>{if(!busy)hear();};
  const onDown=(e)=>{
    const k=e.target.closest&&e.target.closest('.stKey');if(!k||busy)return;
    e.preventDefault();
    const st=+k.dataset.st, want=phrase()[at], ok=(st===want);
    score('melody',ok);
    k.classList.remove('right','wrong');void k.offsetWidth;k.classList.add(ok?'right':'wrong');
    const fd=document.getElementById('lgFeed');
    if(ok){
      try{note(STAFF_SEMI[st]*100,96,0.44);}catch(e){}
      at++;
      if(at>=phrase().length){
        done++;busy=true;if(fd)fd.textContent=t('yes');paint();
        if(done>=need){later(()=>{stageOff();finish('melody',t('ml_name'));},950);return;}
        later(()=>{busy=false;build();paint();},1050);return;}
      paint();
    }else{
      try{note(STAFF_SEMI[st]*100,54,0.24);}catch(e){}   // you hear what you picked: that IS the feedback
      if(fd)fd.textContent=t('onceMore');
    }
  };
  ov.addEventListener('pointerdown',onDown,true);
  window._labHintDeg=null;
  build();_render=paint;paint();
  _cleanup=()=>{_noteAnswer=null;busy=true;try{ov.removeEventListener('pointerdown',onDown,true);}catch(e){}
    window._lab_lgAgain=null;stageOff();LAB.clear();};
}

// ---------- PRACTICE: COME BACK TOMORROW ----------
// The one activity built directly on the spacing evidence. Simmons (2012) found accuracy gains only at
// a 24-hour gap; Wiseheart (2017) found nothing at all inside 15 minutes. So this unit refuses to run
// on material learned today -- it waits for the day boundary, then re-asks the OLDEST thing first.
// No streak, no nag, no penalty for not coming: it simply has something for you when you return.
// ---------- IMPROVISE: THE STAGE THAT WAS MISSING ----------
// Orff's sequence is imitate -> explore -> improvise -> compose. This curriculum had imitate
// (twenty-three quiz screens), then explore (added alongside this), then nothing, then compose
// (one loop grid). This is the missing third.
// It is call and response with NO RIGHT ANSWER. The app plays two bars; the child answers with
// whatever they like over the same groove. Orff takes the F and B bars off the instrument so that
// nothing a child plays can sound wrong -- the tank is already scale-locked, so that is free here.
// Nothing is scored, nothing is compared to the call, and the child leaves when they want to.
function jamUnit(){
  stageOff();
  const USE=[0,1,2,3,4];                       // pentatonic: there is no wrong note in it
  let mine=true, rounds=0, played=0, busy=false, raf=0, barAt=0;
  const BPM=96, BEAT=60/BPM, BAR=BEAT*4, CALL=BAR*2;
  try{initAudio();if(AC&&AC.state==='suspended')AC.resume();}catch(e){}
  LAB.take({scale:'pentaMaj',octs:1,drums:false,band:false,touch:false});
  LAB.labels(null);LAB.clear();
  function name(d){let c=0;try{c=degCents(d);}catch(e){c=d*200;}return solfegeFor(c)||String(d+1);}
  function paint(){
    const ladder=USE.map((d,i)=>
      '<button class="lgRung" data-deg="'+d+'" style="--rc:'+degTint(d)+'">'+
        '<span class="rgName">'+name(d)+'</span>'+
        '<span class="rgDeg">'+(i===0?'LOW':(i===USE.length-1?'HIGH':''))+'</span></button>').join('');
    stage('<div class="lgTop"><button class="lgBack" data-a2="home">&lsaquo; '+t('home')+'</button>'+
        '<h3>'+t('g_jam')+'</h3><span class="lgCount">'+(played?t('jam_tally',{n:played}):'')+'</span>'+
        '<button class="lgSpk labSpk" data-a2="say" aria-label="'+t('voiceReplay')+'">'+SPK+'</button></div>'+
      '<div class="lgLadder'+(mine?' lgWait':'')+'" id="lgLadder">'+ladder+'</div>'+
      '<p class="lgSay">'+t(mine?'jam_mine':'jam_yours')+'</p>'+
      '<div class="lgFeed" id="lgFeed">'+(mine?'':t('jam_free'))+'</div>'+
      '<div class="lgHint">'+
        (rounds?'<button class="btn lgDoneJam" data-jam="done">'+t('jam_done')+'</button>':'')+
        '</div>');
  }
  function lightUp(d,ms){const r=document.querySelector('.lgRung[data-deg="'+d+'"]');
    if(!r)return; r.classList.add('target'); later(()=>r.classList.remove('target'),ms||360);}
  // the call: a short phrase the child is NOT asked to copy. It is there to leave a hole.
  function call(){
    mine=true;paint();
    const n=2+((Math.random()*3)|0);
    let k=(Math.random()*USE.length)|0;
    for(let i=0;i<n;i++){
      const mv=(Math.random()<0.7?1:2)*(Math.random()<0.5?-1:1);
      k=Math.max(0,Math.min(USE.length-1,i===0?k:k+mv));
      const d=USE[k];
      later(()=>{sing(d,90,.45);lightUp(d,380);},i*BEAT*1000*0.9);
    }
    later(()=>{mine=false;rounds++;paint();
      window._labJamTurn='child';
      later(()=>{ if(!busy)call(); }, CALL*1000);     // their two bars, then it comes round again
    }, n*BEAT*1000*0.9+260);
  }
  const onDown=(e)=>{
    const dn=e.target.closest&&e.target.closest('[data-jam="done"]');
    if(dn){e.preventDefault();busy=true;cancelAnimationFrame(raf);
      later(()=>{stageOff();finish('jam',t('jam_name'));},120);return;}
    const r=e.target.closest&&e.target.closest('.lgRung');if(!r||busy)return;
    e.preventDefault();
    const d=+r.dataset.deg;
    r.classList.add('press');setTimeout(()=>r.classList.remove('press'),90);
    sing(d,96,.45);
    // NOTHING IS CHECKED. not against the call, not against a target, not at all. The child can
    // play during the call too if they want to - interrupting is allowed, this is a jam.
    played++;
    if(played===1)seen('jam');     // playing one note of your own IS the thing this teaches
    const c=document.querySelector('.lgCount'); if(c)c.textContent=t('jam_tally',{n:played});
    if(played===1||played===4){const el=document.querySelector('.lgHint');if(el&&!el.children.length)paint();}
  };
  ov.addEventListener('pointerdown',onDown,true);
  window._labJam=()=>({mine:mine,played:played,rounds:rounds});
  _render=paint;paint();
  later(call,600);
  _cleanup=()=>{_noteAnswer=null;busy=true;cancelAnimationFrame(raf);
    try{ov.removeEventListener('pointerdown',onDown,true);}catch(e){}
    window._lab_lgAgain=null;stageOff();LAB.clear();};
}

function reviewUnit(){
  stageOff();
  const list=due();
  if(!list.length){
    stage('<div class="lgTop"><button class="lgBack" data-a2="home">&lsaquo; '+t('home')+'</button>'+
        '<h3>'+t('u_review')+'</h3><span class="lgCount"></span>'+
        '<button class="lgSpk labSpk" data-a2="say" aria-label="'+t('voiceReplay')+'">'+SPK+'</button></div>'+
      '<div class="lgLadder" style="justify-content:safe center;flex:1;text-align:center">'+
        '<div><img src="minis/grn2.png" alt="" draggable="false" style="width:120px;height:auto">'+
        '<p class="lgSay" style="font-size:22px;margin-top:10px">'+t('rev_none')+'</p>'+
        '<p class="lgSay">'+t('rev_noneSub')+'</p></div></div>');
    return;}
  // REVIEW ASKS THE QUESTION THE LESSON ASKED.
  // It used to run everything on the pitch ladder with a merged note set, so a rhythm lesson, a
  // staff lesson and a note-length lesson all came back as "find the note" -- the one question none
  // of them taught. A child who learned to clap a bar was tested on hearing an interval.
  // There is no need for a second set of question types: the lesson that taught the thing already
  // asks about it correctly. So review is a SHELF of what is ready to play again, oldest first, and
  // tapping one re-runs that lesson. Finishing it calls finish() as usual, which stamps its clock
  // and rotates it off the shelf.
  const card=(u,i)=>{
    const days=Math.max(1,Math.round((Date.now()-(prog[u.id]&&prog[u.id].at||0))/DAY));
    const ago=days===1?t('rev_ago1'):t('rev_ago',{n:days});   // not "1 days ago"
    return '<button class="uCard" data-a2="unit" data-u="'+u.id+'" style="--ut:'+u.tint+'" '+
      'aria-label="'+t(u.title)+' \u2014 '+ago+'">'+
      '<span class="uTxt"><b>'+t(u.title)+'</b><i>'+ago+'</i></span>'+
      (i===0?'<span class="uNext">'+t('revReady')+'</span>':'')+
      '</button>';
  };
  stage('<div class="lgTop"><button class="lgBack" data-a2="home">&lsaquo; '+t('home')+'</button>'+
      '<h3>'+t('u_review')+'</h3><span class="lgCount">'+list.length+'</span>'+
      '<button class="lgSpk labSpk" data-a2="say" aria-label="'+t('voiceReplay')+'">'+SPK+'</button></div>'+
    '<p class="lgSay">'+t('rev_do')+'</p>'+
    '<div class="uGrid" style="flex:1;align-content:start;overflow:auto">'+
      list.map(card).join('')+'</div>');
  _render=reviewUnit;
  window._labDue=list.map(u=>u.id);   // readable: dev-review.js proves the right kind of question comes back
}

// ---------- GAME: ECHO (the flagship — call & response with varied repetition) ----------
// ================================================================================================
//  THE THREE GAMES - moved off the tank and onto the same screens as the lessons.
//  They were the last place a child met the polygon wall interface: a game called "up or down" that
//  asked the question in a side card while the middle of the screen showed a tank nobody had to touch.
//  A game is practice for a lesson, so it gets the lesson's screen.
// ================================================================================================

// ---------- TWO CHOICES: one screen, used by bright/dark and by up/down ----------
// THE INTERVAL RULER. A two-choice lesson asks a child to judge a DISTANCE between sounds and then
// shows them a blank screen, which is the same failure as the old tank: the thing being judged is
// invisible. This is one octave as thirteen rungs, lit where the notes were. It appears only AFTER
// the answer, so it teaches instead of giving the game away -- the child hears, decides, and then
// SEES the gap they just heard. Same widget for both lessons, because it is the same idea both times.
function ruler(semis){
  let h='';
  for(let i=12;i>=0;i--){
    const on=semis&&semis.indexOf(i)>=0;
    h+='<i class="'+(on?'on':'')+'"'+(on?' style="--rc:'+RUNG_TINT[SEMI_TINT[i%12]]+'"':'')+'></i>';
  }
  return h;
}
function choiceUnit(cfg){
  stageOff();
  const need=cfg.need||10;
  let right=0,busy=false,cur=null;
  // ONE ANSWER PER QUESTION. `busy` only went true at the END of a unit, so until then every tap
  // scored: a child could hit 1,2,3,4 and one of them had to be right. That is not an answer, it is
  // a brute force, and it was being written into the progress file as mastery. `armed` is the real
  // gate: a question arms it, the first committed answer disarms it, the next question arms it again.
  let armed=false;

  try{initAudio();if(AC&&AC.state==='suspended')AC.resume();}catch(e){}
  // PIN THE KEY, like ladderUnit does. A lesson that does not name a root inherits whatever the last
  // one left in S.root, so after the la-pentatonic lesson (which transposes) everything below it sat
  // a minor third low for the rest of the session. The anchor is captured once, on entering learn mode.
  const HOME=((LAB._saved&&LAB._saved.root!=null)?LAB._saved.root:S.root)+(cfg.rootShift||0);
  LAB.take({scale:cfg.scale||'pentaMaj',root:HOME,octs:1,drums:false,band:false,touch:false});
  LAB.labels(null);LAB.clear();
  function paint(){
    stage('<div class="lgTop"><button class="lgBack" data-a2="home">&lsaquo; '+t('home')+'</button>'+
        '<h3>'+t(cfg.title)+'</h3><span class="lgCount">'+right+' / '+need+'</span>'+
        '<button class="lgSpk labSpk" data-a2="say" aria-label="'+t('voiceReplay')+'">'+SPK+'</button></div>'+
      '<div class="lgDots">'+Array.from({length:need},(_,i)=>'<i class="'+(i<right?'got':'')+'"></i>').join('')+'</div>'+
      // column, not the ladder's column-reverse: here the sentence sets up the question and the
      // ruler answers it, so they have to read in that order
      '<div class="lgLadder" style="justify-content:safe center;flex:1;flex-direction:column">'+
        '<p class="lgSay" style="font-size:18px">'+t(cfg.hear)+'</p>'+
        (cfg.art?'<div class="lgRuler" id="lgRuler">'+ruler(null)+'</div>':'')+'</div>'+
      '<p class="lgSay">'+t(cfg.doIt)+'</p><div class="lgFeed" id="lgFeed"></div>'+
      '<div class="lgHint"><button class="lgListen" data-a2="lg_again">'+EAR+' '+t('listen')+'</button></div>'+
      '<div class="lgChoice">'+cfg.opts.map(o=>
        '<button data-ch="'+o.v+'" style="--rc:'+o.tint+'">'+t(o.label)+'</button>').join('')+'</div>');
  }
  window._lab_lgAgain=()=>{if(!busy&&cur!=null)cfg.play(cur);};
  function showArt(v){ const h=document.getElementById('lgRuler');
    // v==null means "clear it" -- passing null THROUGH to cfg.art lit the ruler before the question
    // was answered, which handed the child the answer instead of teaching them anything
    if(h&&cfg.art)h.innerHTML=ruler(v==null?null:cfg.art(v)); }
  let roamAt=0;
  function reKey(){ if(!cfg.roam)return;
    roamAt=ROAM[(Math.random()*ROAM.length)|0];
    LAB.take({scale:cfg.scale||'pentaMaj',root:inSingRange(HOME+roamAt),octs:1,drums:false,band:false,touch:false});
    LAB.labels(null);LAB.clear(); }
  window._labRoam=()=>roamAt;   // readable: dev-earwork proves the key actually moves
  function ask(){reKey();cur=cfg.pick();armed=true;window._labExpect=cur;showArt(null);cfg.play(cur);}
  const onDown=(e)=>{const b=e.target.closest&&e.target.closest('[data-ch]');if(!b||busy||!armed)return;
    e.preventDefault();armed=false;
    const ok=(b.dataset.ch===String(cur)); score(cfg.id,ok); if(ok)right++;
    showArt(cur);   // AFTER the answer, never before: show what that actually was
    const fd=document.getElementById('lgFeed');if(fd)fd.textContent=t(ok?'yes':'notYet');
    const c=document.querySelector('.lgCount');if(c)c.textContent=right+' / '+need;
    document.querySelectorAll('.lgDots i').forEach((x,i)=>x.classList.toggle('got',i<right));
    if(right>=need){busy=true;later(()=>{stageOff();finish(cfg.id,t(cfg.name));},760);return;}
    later(ask,ok?820:1050);};
  ov.addEventListener('pointerdown',onDown,true);
  _render=paint;paint();later(ask,650);
  _cleanup=()=>{_noteAnswer=null;busy=true;try{ov.removeEventListener('pointerdown',onDown,true);}catch(e){}
    window._lab_lgAgain=null;stageOff();LAB.clear();};
}

function upDownGame(){
  // pentatonic here too: a game is practice for the lessons and must not quietly reintroduce the two
  // notes the lessons deliberately hold back.
  choiceUnit({id:'updown',title:'g_updown',hear:'updown_hear',doIt:'updown_ask',name:'updown_name',
    need:10,
    opts:[{v:'up',label:'up',tint:'#9fe6cf'},{v:'down',label:'down',tint:'#a9b6f0'}],
    pick:()=>Math.random()<0.5?'up':'down',
    play:(dir)=>{const lo=1+((Math.random()*2)|0), hi=lo+2;
      const a=(dir==='up')?lo:hi, b=(dir==='up')?hi:lo;
      sing(a,90,.5);later(()=>sing(b,90,.5),620);}});
}

function findHomeGame(){
  // the same job as the home lesson, with all five notes on the ladder instead of three
  ladderUnit({id:'findhome',title:'g_findhome',doIt:'fh_do',name:'fh_name',
    use:[0,1,2,3,4,5],need:10,showTarget:false,roam:true,anchor:false,
    pick:()=>Math.random()<0.5?0:5,           // home is at the bottom AND at the top -- hear which
    play:leanHome});
}

// ---------- ECHO: the ladder, played back in order ----------
// The one game where the answer is a SEQUENCE, so it cannot ride on ladderUnit. Same screen, same
// rungs, same rules: fixed targets, nothing on screen that is not the job, and the phrase is shown
// being played before the child has to repeat it -- a five-year-old cannot hold a tune they never saw.
function echoGame(){
  stageOff();
  const need=5;
  const USE=[0,1,2,3,4];
  let len=2,phrase=[],step=0,right=0,busy=false,mine=true;
  try{initAudio();if(AC&&AC.state==='suspended')AC.resume();}catch(e){}
  LAB.take({scale:'pentaMaj',octs:1,drums:false,band:false,touch:false});
  LAB.labels(null);LAB.clear();
  function name(d){let c=0;try{c=degCents(d);}catch(e){c=d*200;}return solfegeFor(c)||String(d+1);}
  function paint(){
    const ladder=USE.map((d,i)=>
      '<button class="lgRung" data-deg="'+d+'" style="--rc:'+degTint(d)+'">'+
        '<span class="rgName">'+name(d)+'</span>'+
        '<span class="rgDeg">'+(i===0?'LOW':(i===USE.length-1?'HIGH':''))+'</span></button>').join('');
    stage('<div class="lgTop"><button class="lgBack" data-a2="home">&lsaquo; '+t('home')+'</button>'+
        '<h3>'+t('g_echo')+'</h3><span class="lgCount">'+right+' / '+need+'</span>'+
        '<button class="lgSpk labSpk" data-a2="say" aria-label="'+t('voiceReplay')+'">'+SPK+'</button></div>'+
      '<div class="lgDots">'+Array.from({length:need},(_,i)=>'<i class="'+(i<right?'got':'')+'"></i>').join('')+'</div>'+
      '<div class="lgLadder" id="lgLadder">'+ladder+'</div>'+
      '<p class="lgSay">'+t(mine?'echo_mine':'echo_your')+'</p>'+
      '<div class="lgFeed" id="lgFeed">'+t('echo_len',{n:len})+'</div>'+
      '<div class="lgHint"><button class="lgListen" data-a2="lg_again">'+EAR+' '+t('listen')+'</button></div>');
  }
  function lightUp(d,ms){const r=document.querySelector('.lgRung[data-deg="'+d+'"]');
    if(!r)return; r.classList.add('target'); later(()=>r.classList.remove('target'),ms||380);}
  function build(){phrase=[];let k=(Math.random()*USE.length)|0;
    for(let i=0;i<len;i++){const mv=(Math.random()<0.7?1:2)*(Math.random()<0.5?-1:1);
      k=Math.max(0,Math.min(USE.length-1,i===0?k:k+mv));phrase.push(USE[k]);}}
  function play(){ // show AND sound it, one rung at a time
    mine=true;step=0;paint();
    phrase.forEach((d,i)=>later(()=>{sing(d,92,.5);lightUp(d,420);
      if(i===phrase.length-1)later(()=>{mine=false;paint();publish();},560);},i*560));
  }
  window._lab_lgAgain=()=>{if(!busy&&!mine)play();};
  window._labEchoPhrase=()=>phrase.slice();   // readable targets for the test drivers
  const publish=()=>{window._labHintDeg=(!mine&&!busy)?phrase[step]:null;};
  function ask(){build();later(play,320);}
  const onDown=(e)=>{const r=e.target.closest&&e.target.closest('.lgRung');if(!r||busy||mine)return;
    e.preventDefault();
    const d=+r.dataset.deg; sing(d,94,.5);
    r.classList.add('press');setTimeout(()=>r.classList.remove('press'),90);
    const ok=(d===phrase[step]);
    r.classList.remove('right','wrong');void r.offsetWidth;r.classList.add(ok?'right':'wrong');
    later(()=>r.classList.remove('right','wrong'),380);
    const fd=document.getElementById('lgFeed');
    if(!ok){score('echo',false);if(fd)fd.textContent=t('onceMore');busy=true;publish();
      later(()=>{busy=false;play();},900);return;}
    step++;publish();
    if(step>=phrase.length){score('echo',true);right++;
      if(fd)fd.textContent=t('yes');
      const c=document.querySelector('.lgCount');if(c)c.textContent=right+' / '+need;
      document.querySelectorAll('.lgDots i').forEach((x,i)=>x.classList.toggle('got',i<right));
      if(right>=need){busy=true;later(()=>{stageOff();finish('echo',t('echo_name'));},800);return;}
      if(right%2===0&&len<4)len++;                 // one note longer every two rounds, up to four
      busy=true;publish();later(()=>{busy=false;ask();},950);}
  };
  ov.addEventListener('pointerdown',onDown,true);
  _render=paint;paint();ask();
  _cleanup=()=>{_noteAnswer=null;busy=true;try{ov.removeEventListener('pointerdown',onDown,true);}catch(e){}
    window._lab_lgAgain=null;window._labEchoPhrase=null;window._labHintDeg=null;stageOff();LAB.clear();};
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
  // Twenty-three numbered cards in one list is a wall. They are dealt into four named blocks instead --
  // first notes, more notes, minor keys, modes -- with the NUMBERING running straight through, so the
  // blocks say roughly how hard and the numbers still say exactly what order. Nothing is locked: the
  // sequence is shown, never enforced.
  const BLOCKS=[['a','blockA'],['b','blockB'],['c','blockC'],['d','blockD'],['e','blockE']];
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
    _lastSaid='';                                   // say the instruction again on a RE-entry, not just a first one
    u.run();return;}
  if(a==='tap'&&window._lab_tap)return window._lab_tap();
  if(a==='lg_again'&&window._lab_lgAgain)return window._lab_lgAgain();
});

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
// Map a played pitch onto the rung the lesson is asking about, then answer with it. Nearest degree
// within a quarter-tone: a child reaching for "mi" who lands a cent off still meant mi. Outside the
// set, or no lesson listening, it does nothing and the note is just a note.
function noteIn(cents){
  if(!_noteAnswer)return false;
  try{return !!_noteAnswer(cents);}catch(e){return false;}
}
return {enter,exit,home,setLang,t,LANG,UNITS,noteIn,_labels:wallLabels,
        _MASTERY:MASTERY,_MIN_TRIES:MIN_TRIES,_due:due,_got:got,_acc:acc}; // read-only hooks for dev-curriculum.js
})();

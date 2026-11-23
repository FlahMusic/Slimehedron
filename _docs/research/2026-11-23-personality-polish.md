# Personality, intuitiveness, polish: what the evidence says (2026-11-23)

Research only. No code was changed. Words follow `_docs/GLOSSARY.md`. Tags, as in the earlier research files:
**[P]** primary source, read this pass (fetched, or its own text quoted in a search result); **[S]** secondary, or a primary I could only see summarised (standards pages cited from their known text are [S] too);
**[D]** my own derivation or judgement from the cited numbers (check it). **[UNVERIFIED]** means I looked and could not
confirm it. Nothing here was checked against the app; the "how to measure" list says what a suite would assert.

## TLDR: the 20 most actionable patterns

1. **A hand's note sounds within 10 ms of the app getting the touch.** Wessel & Wright put "the acceptable upper bound on
   the computer's audible reaction to gesture at 10 milliseconds" [P](https://arxiv.org/pdf/2010.01570). In a controlled
   test, 10 ms rated no worse than 0 ms; 20 ms did [S](https://www.sciencegate.app/document/10.1525/mp.2018.36.1.109).
2. **Steady beats fast: the delay must not wobble.** Wessel & Wright: variation "should not exceed 1 ms"
   [P](https://arxiv.org/pdf/2010.01570). 10 ms with +-3 ms jitter rated worse than 0 ms, while a steady 10 ms did not
   [S](https://www.sciencegate.app/document/10.1525/mp.2018.36.1.109).
3. **The platform eats part of the budget.** Android touch alone takes 10-35 ms (about 20 ms is typical); 10 ms round trip
   is Google's long-term goal for audio [P](https://android-developers.googleblog.com/2021/03/an-update-on-androids-audio-latency.html).
   So our own code should add at most one audio buffer on top [D].
4. **The picture reacts within 100 ms, or the kid stops feeling "I did that".** 0.1 s is the limit for feeling that you
   are acting on the thing directly [S](https://www.nngroup.com/alertbox/timeframes.html).
5. **Sound and picture stay in sync.** People notice sound that is more than ~45 ms early or ~125 ms late against the
   picture (ITU-R BT.1359) [S](https://www.itu.int/dms_pubrec/itu-r/rec/bt/R-REC-BT.1359-1-199811-I!!PDF-E.pdf). Aim
   well inside that window [D].
6. **Every action has three parts: wind-up, the move, the reaction. Give each "enough time (but no more)".** A fast
   move needs a bigger wind-up (Lasseter, SIGGRAPH 87) [P](https://www.ics.uci.edu/~fowlkes/class/ics162/exercises/lasseter.pdf).
7. **Squash and stretch keep the volume the same.** Width x height stays constant, or the thing looks like it grows or
   shrinks [P](https://www.ics.uci.edu/~fowlkes/class/ics162/exercises/lasseter.pdf).
8. **Loose parts finish after the body, at speeds set by their weight.** Pixar's Wally B. had light antennae that lagged a
   little and heavy, water-balloon feet that lagged a lot; his feet left 1-2 frames apart
   [P](https://www.ics.uci.edu/~fowlkes/class/ics162/exercises/lasseter.pdf).
9. **Juice has a sweet spot.** In a study with 3,018 players, both no juice and extreme juice scored lower than medium or
   high [S](https://arxiv.org/pdf/2208.06155) (Kao 2020, [record](https://dblp.uni-trier.de/rec/journals/entcom/Kao20.html)).
10. **Hitstop: a big hit freezes the action for a moment.** Both sides freeze, a stronger hit freezes longer up to a cap,
    and the shake starts big and shrinks (Sakurai) [S](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/).
11. **Easing is lopsided: things arrive slowing down and leave speeding up.** Mobile UI moves take 195-375 ms, and
    anything "over 400ms may feel too slow" (Material 1) [P](https://m1.material.io/motion/duration-easing.html).
12. **Blink every 3-6 s, at random.** People blink 10-20 times a minute
    [S](https://pmc.ncbi.nlm.nih.gov/articles/PMC3156585); one blink lasts ~285 ms
    [S](https://arxiv.org/pdf/1507.01046). Animators close in 2 frames, hold 1 and open in 3, so the lids shut fast and
    open slower; head turns and new thoughts trigger a blink [S](https://www.bloopanimation.com/blinking-animation/).
13. **Faces must be big and exaggerated.** Children under 6 missed characters' subtle reactions. NN/g recommends
    "exaggerated facial expressions" [P](https://www.nngroup.com/articles/kids-cognition/).
14. **Anything that looks alive gets tapped, so it must answer.** Children expect to tap characters and pictures, and are
    disappointed when nothing happens [P](https://nngroup.com/articles/childrens-websites-usability-issues).
15. **Touch targets are at least 2 cm x 2 cm for young children** (adults: 1 cm)
    [P](https://www.nngroup.com/articles/children-ux-physical-development/), and never smaller than 44 x 44 CSS px
    (WCAG 2.5.5) [S](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html).
16. **Under 5s: tap, swipe and drag only.** No two-handed moves, no precise drops, and one action should work by
    either tap or drag [P](https://www.nngroup.com/articles/children-ux-physical-development/).
17. **No wrong notes when a kid plays alone.** Toca Band's solo spot drops notes that clash with C major
    [P](https://tocaboca.com/for-parents/toca-band). Blob Opera's other blobs "respond to and harmonise your input in
    real time" [P](https://experiments.withgoogle.com/blob-opera).
18. **No scores, timers or levels. Surprises, not promised prizes.** Toca Boca: no rules, scores, timers or levels
    [S](https://tocaboca.helpshift.com/hc/en/16-other-toca-boca-apps/faq/28-a-digital-toy-or-a-game---what-is-the-difference).
    Across 128 studies, expected rewards lowered how much people kept playing by choice (d = -0.28 to -0.40)
    [S](https://pubmed.ncbi.nlm.nih.gov/10589297/).
19. **Child-safe loudness tops out around 75 dBA.** WHO-ITU H.870 "children mode": 75 dB for 40 h a week, and the device
    turns itself down to at most 75 dBA [S](https://who.int/publications/i/item/9789241515276). Toy standards cap
    impulse peaks at 115 dB C-peak [S](https://cdn.standards.iteh.ai/samples/41594/bd99214b1ba14d35b5cafcc8c5409822/ISO-8124-1-2000-Amd-2-2007.pdf).
20. **On a tiny screen: one picture per mode, and the screen changes with every knob turn.** The OP-1 gives each synth
    engine its own drawing, which wiggles to the audio [S](https://en.wikipedia.org/wiki/Teenage_Engineering_OP-1).
    The Pocket Operators were built to work without their screens, so the screens could be "more fun, instead of purely
    functional" [S](https://xlr8r.com/?p=54283).

---

## 1. Game feel and juice for a toy

**Timing numbers**
- **Direct manipulation, 0.1 s.** Nielsen's three limits (0.1 s feels instant, 1 s keeps a train of thought, 10 s
  holds attention) come from Miller 1968
  [S](https://www.nngroup.com/alertbox/timeframes.html). For a toy, 0.1 s is the limit for the
  *visual* reaction to a touch. Sound has a much tighter budget (below).
- **Instrument latency, 10 ms and 1 ms of jitter.** Wessel & Wright (CNMAT, NIME 2001 / CMJ 2002) set 10 ms and measured
  their own systems at ~7 ms. They argue the 1 ms jitter limit from percussionists' flams: timbre changes become audible
  past 1 ms of variation [P](https://arxiv.org/pdf/2010.01570).
- **Measured on players.** Jack, Mehrabi, Stockman & McPherson (Music Perception 2018) tested 0, 10, 10+-3 and 20 ms
  with percussionists and amateurs. 0 ms rated better than 10+-3 ms and 20 ms, and no different from a steady 10 ms
  [S](https://www.sciencegate.app/document/10.1525/mp.2018.36.1.109). McPherson et al. (NIME 2016) found "almost none"
  of the common Arduino-to-Max/Pd setups met the 10 ms / 1 ms guideline [S](https://nime.org/proc/mcpherson2016).
  Musicians can keep in sync with up to ~55 ms by playing early (Dahl & Bresin, cited there) [S]: adults adapt, kids
  tapping a toy probably adapt less [D].
- **Platform floor.** Android: touch latency 10-35 ms, typically ~20 ms. Tap-to-tone is about round trip + 15 ms. Pro
  audio requires 20 ms round trip, and the long-term goal is 10 ms
  [P](https://android-developers.googleblog.com/2021/03/an-update-on-androids-audio-latency.html),
  [S](https://developer.android.com/ndk/guides/audio/audio-latency). Commercial touch devices measured "up to 125ms"
  touch latency in 2013 (Jota et al., CHI 2013) [S](https://dblp.uni-trier.de/rec/conf/chi/JotaNDW13.html). People can
  perceive drag latency down to ~2.4 ms (Ng et al., cited) [S]: a strum trail that lags the finger is visible long
  before a tap feels slow [D].
- **In the browser.** `AudioContext` `latencyHint: "interactive"` is the default; `baseLatency` and `outputLatency` report
  the delay in seconds [S](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency). One author found
  that `outputLatency` reads less than half of the real end-to-end delay
  [S](https://www.lesswrong.com/posts/ooXEzrX7Y9Go6D7st/browser-audio-latency). Measure, don't trust the property [D].
- **Picture vs sound.** Detectable at +45 ms (sound early) / -125 ms (sound late); acceptable to about +90 / -185 ms
  [S](https://www.itu.int/dms_pubrec/itu-r/rec/bt/R-REC-BT.1359-1-199811-I!!PDF-E.pdf). These were measured on
  newsreader clips. A ball hitting a wall is a sharper event, so aim much tighter (+-20 ms) [D]. Sound early is noticed
  sooner than sound late, so when in doubt, draw a hair early [D].
- **Swink's correction cycle (~100 ms "feel", ~240 ms human loop)** is quoted everywhere, but I only saw it secondhand
  [UNVERIFIED] ([review](https://lizengland.com/blog/wp-json/wp/v2/posts/1812),
  [PocketGamer](https://www.pocketgamer.biz/best-of-british-stephen-morris-considers-the-split-second-timings-needed-for-intuitive-controls)).

**Animation principles (primary: Lasseter 1987, from Thomas & Johnston's *Illusion of Life*)**
[P](https://www.ics.uci.edu/~fowlkes/class/ics162/exercises/lasseter.pdf)
- *Squash and stretch*: "no matter how squashed or stretched out a particular object gets, its volume remains constant."
  Stretch along the direction of travel. Stretching a fast object until its frames overlap stops it from strobing (a
  stand-in for motion blur): useful for fast balls at 60 Hz [D].
- *Timing*: spend "enough time (but no more)" on the wind-up, the action and the reaction. Too long and attention
  wanders; too short and the idea is missed.
- *Anticipation*: tells the viewer what comes next. Wally B.'s zip-off lasts 3-4 frames, but the wind-up is long enough to
  read. "If they are not properly prepared for a very fast action, they may miss it completely."
- *Follow-through and overlap*: "Actions very rarely come to a sudden and complete stop." Appendages drag at different
  rates for different masses, and actions overlap instead of stopping between them.
- *Exaggeration*, balanced: "If just one thing is exaggerated in an otherwise lifelike scene, it will stick out." Keep
  one natural thing in the scene as the reference.
- *Slow in and out*, with a warning: interpolating splines overshoot (Luxo Jr.'s base sank under the floor) until the
  extremes are "locked".

**Juice, measured**
- Jonasson & Purho, "Juice it or lose it" (GDC Europe 2012): many small tricks that make a plain game satisfying
  [S](https://gdcvault.com/play/1016487/Juice-It-or-Lose); video: https://www.youtube.com/watch?v=Fy0aCDmgnxg.
  Nijman, "The Art of Screenshake" (2013): 30 small tweaks to a dull shooter. One detail: the Nuclear Throne pistol kicks
  the camera back 6 px and adds 4 to the screenshake [S](https://infovore.org/?p=5275).
- Kao 2020 (Entertainment Computing 34, n = 3,018): none / medium / high / extreme juice; none *and* extreme scored
  lower [S](https://arxiv.org/pdf/2208.06155). Hicks et al., CHI PLAY 2019: visual embellishment raised appeal in every
  game, but helped how competent players felt "only under specific circumstances"
  [S](https://bibtex.github.io/CHI-PLAY-2019-HicksGDA.html). Lesson: juice the meaningful events (a hand's note, a
  chord jackpot, a burst), not everything [D].
- Hitstop (Sakurai, Famitsu column 490 and *Creating Games*): it is a visual effect, separate from the gameplay stun. It
  has a maximum, and the shake decays [S](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/),
  [S](https://www.gonintendo.com/contents/13581-sakurai-s-latest-game-dev-video-features-8-hit-stop-techniques).
  For a music toy, hitstop should freeze the *picture* only (a few frames on a jackpot or burst), never the audio clock
  [D].
- Easing (Material 1, no longer maintained): standard `cubic-bezier(0.4,0,0.2,1)`, entering `(0,0,0.2,1)`, leaving
  `(0.4,0,1,1)`. Mobile: entering 225 ms, leaving 195 ms, big full-screen 375 ms, >400 ms too slow; desktop 150-200 ms
  [P](https://m1.material.io/motion/duration-easing.html). Material 3's current numbers I did not fetch [UNVERIFIED].

## 2. How acclaimed music toys explain themselves without words

- **Toca Boca (Toca Band, Builders):** "no rules, scores, timers or levels"
  [S](https://tocaboca.helpshift.com/hc/en/16-other-toca-boca-apps/faq/28-a-digital-toy-or-a-game---what-is-the-difference).
  The apps are described as "word-free" [S](https://gamesbeat.com/designing-ipad-toys/). In Toca Builders, CEO Björn
  Jeffery says they "wanted to avoid Photoshop-esque menus or abstract icons". Each of the six characters *is* a building
  tool, so kids pick a character, not a button, and "there are no explicit challenges to solve or high scores"
  [P](https://joanganzcooneycenter.org/?p=10255). Toca Band: where a character stands on the stage sets how upbeat it
  plays, and the star spot is solo mode, which removes notes that clash with C major
  [P](https://tocaboca.com/for-parents/toca-band). How they test: "Kids have all the answers. Just put your product in
  their hands and observe." (Emil Ovemar) [S](https://www.pocketgamer.biz/childs-play-free-to-play-is-a-no-no-when-it-comes-to-apps-for-kids-says-toca-bocas-emil-ovemar/).
  Sago Sago (a Toca studio) watches for *speedbumps* (hesitation), *crossed wires* (a control does something
  unexpected), *roadblocks* (the session ends), and emotion (laughing, showing a parent; a "glassy stare" is the bad
  sign) [P](https://joanganzcooneycenter.org/?p=10091).
- **Chrome Music Lab:** made to make music "a bit more accessible to everyone" on the open web
  [P](https://developers.googleblog.com/en/introducing-chrome-music-lab/). Song Maker: "no need to log in", "Anyone can
  instantly hear what you made", shared by link [P](https://blog.google/outreach-initiatives/education/simple-music-making-everyone).
  Kandinsky: draw a circle and it gets a face and sings; triangles are percussion; lines are melody (teacher guides)
  [S](https://sites.google.com/education.nsw.gov.au/tau-cc-world-of-kandinsky/lesson-3-kandinsky-musical-pictures).
  Rhythm: cartoon characters (a drumming monkey) play the grid's pattern on a loop
  [S](https://www.itmedia.co.jp/news/article/2210/22/1221022050/). I found no maker write-up saying the lab avoids words
  on purpose [UNVERIFIED]. Active Theory's "Making Kandinsky" post returned 403.
- **Blob Opera (David Li, Google Arts & Culture 2020):** four characters; drag up/down for pitch, forward/back for the
  vowel; a second model harmonises the rest in real time [P](https://experiments.withgoogle.com/blob-opera). The blobs
  were stretched more than 100 million times [S](https://blog.google/outreach-initiatives/arts-culture/story-behind-blob-opera-world-tour/).
  The lesson: the character is the control, and the music can never sound wrong [D].
- **Patatap (Jono Brandel + Lullatone, 2014):** touch anywhere, or press any key, and you get a sound with its matching
  animation. The space bar changes the colour, sound and shape palette together
  [S](https://www.creativeapplications.net/project/patatap-portable-animation-and-sound-kit-by-jonobr1-and-lullatone).
  The animations came first and the sounds were tuned to them
  [S](https://en.wikipedia.org/wiki/Patatap). Sources disagree on whether keys are fixed or random [UNVERIFIED].
- **Incredibox:** drag a sound icon onto a character. Certain combinations of five sounds unlock a short animated bonus,
  three per version [S](https://en.wikipedia.org/wiki/Incredibox): a hidden reward you find, never one you are promised
  [D].
- **Electroplankton (Toshio Iwai, DS 2005):** a "touchable media art game" [S](https://laboralcentrodearte.org/en/artworks/electroplankton-2/).
  Iwai said the DS's touch screen, microphone and speakers were essential to it
  [S](https://cubed3.com/news/5724/1/c3-exclusive-interview-toshio-iwai-on-nintendo-wiiand-musical-fish.html). A
  widely quoted line about toys being "attractive at first sight" and "instinctively understood" I could not trace to
  a source [UNVERIFIED].
- **Rhythm Heaven:** Tsunku pitched a rhythm game that did not rely on visual cues
  [S](https://en.wikipedia.org/wiki/Rhythm_Heaven_(series)). Iwata Asks calls hitting the exact timing the essence of the
  game, with "a lot of work" on sound and code [S, page failed TLS, seen as a search excerpt](https://iwataasks.nintendo.com/interviews/ds/rhythm-heaven/0/2).
  This backs our "listen first" rounds: judging by ear is a proven design [D].
- **Teenage Engineering:** see section 4.

**Techniques that recur [D, from the above]:** the character is the control (Toca, Blob Opera, Incredibox); every touch
gets sound and picture together (Patatap); the music can't go wrong (Toca solo, Blob harmony); nothing to read, no log-in
(Song Maker); rewards are found, not promised (Incredibox). On idle animations that invite a touch, none of the sources I
read gave numbers; NN/g's finding that kids tap anything that looks alive (section 5) is the nearest evidence.

## 3. Mascot personality: states, blinks, breath, reactions

- **Cute reads as round face, big forehead, big eyes.** Baby-schema faces rated cuter and made adults more motivated to
  look after them (Glocker et al., Ethology 2009, n = 122) [S](https://repository.upenn.edu/cog_neuro_pubs/11).
- **Blink.** Rate: average 17.6/min [S](https://pmc.ncbi.nlm.nih.gov/articles/PMC3156585), 10-20/min in general, and
  3-4/min while reading [S](https://en.wikipedia.org/wiki/Blink). Duration about 283-334 ms
  [S](https://arxiv.org/pdf/1507.01046). Closing is fast and opening slower, and simple ease-in/out curves don't match
  real lids (Disney Research) [S](https://la.disneyresearch.com/wp-content/uploads/Modeling-and-Animating-Eye-Blinks-Paper.pdf).
  Animator recipe: regular blink 2 frames close / 1 hold / 3 open; fast blink 2 / 0 / 3 (anxious, angry); long blink
  3 / 2 / 4 (thinking, a new idea). Blink on fast head turns, and after a long stare "to keep the character alive"
  [S](https://www.bloopanimation.com/blinking-animation/). At 24 fps a regular blink is ~83 + 42 + 125 = 250 ms, which
  matches the measured ~285 ms [D].
- **Breath.** Children at rest breathe 16-30 times a minute (ages 5-12), adults 12-20
  [S](https://www.healthline.com/health/normal-respiratory-rate), [S](https://www.ncbi.nlm.nih.gov/books/NBK537306/):
  a 2-4 s breathing cycle. On a music toy, locking it to one bar (2 s at 120 bpm) is the same speed and on the beat [D].
- **Expressing state.** Anki's Cozmo (animation led by Pixar animator Carlos Baena) has an emotion engine choosing
  happy, calm, brave, confident or scared. It squints and makes sad noises when handled roughly, and plays games with
  itself when bored [S](https://www.therobotreport.com/cozmo-ai-robot-brings-wall-e-to-life/),
  [S](https://en.wikipedia.org/wiki/Cozmo). The animators gave the robot "the same rigor as an animated project"
  [S](https://www.engadget.com/2016-10-14-anki-cozmo-robot.html). Duolingo drives its characters' mouths and
  expressions with a Rive state machine, because hand animation could not scale to 40+ languages
  [S](https://blog.duolingo.com/world-character-visemes). Reading [D]: a small set of named states (idle, listening,
  excited, sleepy, surprised) with set transitions beats one-off animations, and is testable.
- **Reacting to the user.** Exaggerated faces, because under-6s miss subtle ones; 6-year-olds start to read subtle face
  and sound cues, but sound words don't cross cultures ("What does he mean when he says 'Hooo'?")
  [P](https://www.nngroup.com/articles/kids-cognition/). Lasseter's "if a character is sad, make him sadder" is the same
  rule from animation [P](https://www.ics.uci.edu/~fowlkes/class/ics162/exercises/lasseter.pdf).
- **Reacting to the beat.** OP-1 graphics "wiggle in response to the audio" [S](https://en.wikipedia.org/wiki/Teenage_Engineering_OP-1).
  Toca Band's characters play more upbeat further back on the stage [P](https://tocaboca.com/for-parents/toca-band).
  Not found: any study that measured beat-synced character motion [UNVERIFIED].
- **Idle variety.** No primary source gave idle timing numbers (e.g. "a fidget every N s") [UNVERIFIED]. Derivation
  [D]: blink every 3-6 s at random (with the odd double blink), breathe on the bar, a bigger fidget only after several
  seconds without input, and never the same fidget twice in a row.

## 4. Tiny screens and hardware: OP-1, Pocket Operator, Elektron, Game Boy

- **OP-1:** 320 x 160 OLED; each of its synth engines has its own drawing. The effect "punch" is a line drawing of a
  boxer. Four coloured encoders match colours on the screen, and graphics "wiggle" with the audio
  [S](https://en.wikipedia.org/wiki/Teenage_Engineering_OP-1). The UI is mostly line drawings with few solid areas (a
  user says the OLED panel struggles with big solid areas) [S](https://www.elektronauts.com/t/octatrack-mk2-problems-particularly-the-screen/45635?page=4).
  The OP-1 field lists "pop-up info graphics", "smooth knob interpolation" and "encoder click functionality"
  [P](https://teenage.engineering/products/op-1).
- **Pocket Operator:** segment LCDs like 1980s Casio watches [S](https://desirabilitylab.com/backfill/backfill-2024-04-teenage-engineering-pocket-operator).
  Oscar Ahlgren (TE): early prototypes had no screens, so the controls had to work without one, which left the screens
  free to be "more fun, instead of purely functional" [S](https://xlr8r.com/?p=54283). PO-12 guide: the bpm sits in the
  upper right; a lit "rec" symbol means write mode; idle, the display shows only the time
  [P](https://teenage.engineering/guides/po-12).
- **Elektron Digitakt:** 128 x 64 OLED, "crisp" but low resolution, paired with high-resolution endless encoders
  [S](https://www.soundonsound.com/reviews/elektron-digitakt), [S](https://www.bonedo.de/artikel/elektron-digitakt-ii-test/).
  I could not read the manual's "parameter value jump" section [UNVERIFIED].
- **Game Boy:** 160 x 144, 4 shades, 8x8 tiles, at most 10 sprites per line
  [S](https://gbdev.gg8.se/wiki/articles/Game_Boy_Technical_Data). Readability depends on how the 4 shades are spread
  [S].
- **Apple feedback guidance:** pair haptics with sound and picture, keep them short for single events, and save them for
  important moments [S](https://developer.apple.com/design/human-interface-guidelines/playing-haptics).
- **What this suggests for the FM-1's 240 x 240 [D]:** (a) a fixed spot that always says which page you are on (the PO's
  bpm corner); (b) a knob turn always moves something on screen within one frame, with the value animated smoothly
  rather than jumping (OP-1 "smooth knob interpolation"); (c) each of the four knobs has a colour, and its value on the
  panel uses that colour (OP-1); (d) a big value pop-up that fades after a moment ("pop-up info graphics"; the fade time
  is my guess, ~1 s); (e) line art over solid fills on a small panel; (f) a screen that does something cheerful while
  idle (the PO's clock, the minis already hop) and is fun, not only functional.

## 5. Children's UX specifics

- **Motor (NN/g, ages 3-12)** [P](https://www.nngroup.com/articles/children-ux-physical-development/): under 5s have
  very limited fine motor skills; 3-5s can tap, swipe and drag; 9+ can scroll and drag with a mouse; around 11 they
  match adults. Targets **>= 2 cm x 2 cm** for young children; a 5 mm close button defeated 7-year-olds. Precise drops
  frustrate (a 5-year-old in Funny Food). Let tap *or* drag do the same thing. Under 5: no two-handed use, nothing that
  needs a quick response to something on screen. One big button worked for 5-year-olds (Lego Junior). Stray swipes while
  moving between controls changed the view (Roblox). "UIs that exceed the kids' motor ability will discourage them and
  even make them lose confidence in the device."
- **Thinking (NN/g)** [P](https://www.nngroup.com/articles/kids-cognition/): young kids did not understand undo/redo;
  older kids still reached for the eraser. Familiar real objects guide action (a 3-year-old dragged the noodle bag to the
  pot). Animated pictures of the goal taught 6-year-olds how to play. Bare numbers confused 7-year-olds ("What does
  this '2' mean? It's annoying!"); a picture next to the number was suggested. Spoken help that the browser blocked never
  played: never rely on audio for instructions.
- **Websites and apps (NN/g, 125 children, 2001-2018)**
  [P](https://nngroup.com/articles/childrens-websites-usability-issues): kids *like* animation and sound, and expect it
  (two 8-year-olds spent minutes trying to make a page play sound). They tap characters and pictures and expect a
  reaction. They "mine-sweep" the screen. The youngest don't read and older ones scan, so they skip long instructions.
  They use a prominent in-app back button but ignore the browser's. They can't tell ads from content. They shrug off
  slowness as "a bug" and leave.
- **Target sizes, standards:** WCAG 2.2 2.5.8 (AA) 24 x 24 CSS px minimum
  [P](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html); 2.5.5 (AAA) 44 x 44
  [S](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html). Apple 44 pt and Material 48 dp
  [S](https://smashingmagazine.com/2024/07/getting-bottom-minimum-wcag-conformant-interactive-element-size/). 2 cm is
  ~76 CSS px at the nominal 96 px/inch. A phone's CSS px is physically smaller, so 2 cm on a phone needs measuring per
  device [D].
- **Loudness and harshness.** WHO-ITU H.870: children mode 75 dB / 40 h a week, turning itself down to <= 75 dBA, and a
  password-protected parental volume limit [S](https://who.int/publications/i/item/9789241515276),
  [S](https://www.itu.int/dms_pubrec/itu-t/rec/h/T-REC-H.870-202203-I!!SUM-HTM-E.htm). Video games got the same modes
  in H.872 (2025) [S](https://www.aiha.org/news/250313-new-standard-sets-sound-level-guidelines-for-video-game-consoles).
  Toy acoustics (ISO 8124-1 amd. / EN 71-1): impulse <= 115 dB C-peak; close-to-ear continuous 65 dB in the draft. The
  limits differ by edition [S](https://cdn.standards.iteh.ai/samples/41594/bd99214b1ba14d35b5cafcc8c5409822/ISO-8124-1-2000-Amd-2-2007.pdf).
  A web page can't know the device's SPL, but it can cap its own peak level and its share of energy at 2-5 kHz, where the
  ear is most sensitive (see `2026-11-04-mix-levels.md` item 6) [D].
- **Motion and flashing.** Respect `prefers-reduced-motion`
  [S](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion). WCAG 2.3.3: animation set off
  by interaction can be turned off [S](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).
  2.2.2: anything that moves by itself for more than 5 s can be paused
  [S](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html). 2.3.1: no more than 3 flashes a second
  [S](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html). A burst, a jackpot flash and
  a fast strobe-y spin all fall under 2.3.1 [D].
- **No streaks, no nags.** Deci, Koestner & Ryan 1999 (128 experiments): rewards for taking part, finishing or doing well
  all lowered intrinsic motivation (d = -0.40, -0.36, -0.28); per the theory, rewards nobody expected don't
  [S](https://pubmed.ncbi.nlm.nih.gov/10589297/). The finding is disputed (Cameron & Pierce 1994) [S]. The UK Children's
  Code (standard 13) bars nudges that exploit psychological bias and recommends nudges toward wellbeing, such as breaks
  [S](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/13-nudge-techniques/).
  This backs the existing rule: rewards are surprises in the moment (the chord jackpot), never counters to keep up [D].

---

## How to measure it (what a suite could assert)

Thresholds marked [D] are proposals; set them after measuring the current app, per the standards' rule on numbers.

| # | Pattern | Assertion |
|---|---|---|
| 1 | Hand's note latency | Touch event timestamp to the first non-silent sample at the destination (the `dev-realaudio` way) **<= 10 ms + one render quantum**, median over 50 taps, on top of `outputLatency` [D from P] |
| 2 | Jitter | Spread (p95 - p5) of that delay over 50 taps **<= 3 ms**; aim 1 ms [D from P/S]. Taps at random sub-frame offsets, so a frame-quantized path shows up as ~16 ms of spread |
| 3 | Platform check | Log `baseLatency` / `outputLatency`; a tap-along on a real phone (as the Sync setting does) gives the true number. A machine can't measure the speaker [D] |
| 4 | Visual reaction | Touch to the first changed pixel near the touch point **<= 100 ms**, aim one frame (16.7 ms at 60 Hz) [P/D] |
| 5 | Sound/picture sync | A ball's wall-hit flash vs its note onset: **sound no more than 20 ms early, no more than 40 ms late** (inside ITU's +45/-125) [D from P] |
| 6 | Anticipation | A slime action that goes off by itself (burst, reform, key journey) shows a wind-up of **>= 150 ms** first [D]: assert a wind-up state is set before the action |
| 7 | Squash and stretch | Ball/slime scale: **sx x sy stays within +-5%** of rest across a bounce [P rule, D tolerance] |
| 8 | Follow-through | After the mascot (or a mini) stops, its secondary parts keep moving for **>= 2 frames**, and parts of different weight settle at different times [D] |
| 9 | Juice budget | Count simultaneous effects (shake, flash, particles) per event; the burst may have the most, a single ball hit the least. Screenshot review, plus a cap such as **<= 3 effect layers on a normal hit** [D] |
| 10 | Hitstop | If used: picture freeze **<= ~100 ms (6 frames)** and audio scheduling untouched during it: the beat grid timestamps match a run without hitstop [D] |
| 11 | Easing | UI transitions **150-400 ms**; none longer than 400 ms except deliberate story moments; enter uses an ease-out curve [P] |
| 12 | Blink | Over 60 s idle: **10-20 blinks**, gaps random (no two in a row equal, coefficient of variation > 0.2), each blink **150-350 ms**, closing shorter than opening [P/S/D] |
| 13 | Breath | Mascot's idle scale oscillates with a period of **2-4 s** or exactly one bar [D] |
| 14 | Everything alive answers | Tap each character (slime guy, worm, minis, tank) and assert a visible reaction within **100 ms** and no dead targets (the `dev-controls` way, for creatures) [D from P] |
| 15 | Targets | Every touch target in play **>= 44 x 44 CSS px** (existing rule); kid-facing primary targets **>= 2 cm** physical, measured with a device pixel ratio table [P/D] |
| 16 | One gesture, two ways | Each play action that needs a drag also works by tap [P] |
| 17 | No wrong notes | In play, a random-tap fuzz of 500 taps: **100% of sounded pitches are in the key's scale** (or the chord, where the design says so) [D from P] |
| 18 | No streaks | Grep UI copy and storage for streak/count/"come back" patterns; no counter of days or sessions is ever shown [D] |
| 19 | Loudness | Peak at the destination never above **-1 dBFS**; no event raises short-term loudness by more than **~10 LU** within 50 ms (no jump scares) [D]; presence-band check as in `2026-11-04-mix-levels.md` |
| 20 | Flashing | Frame-difference luminance analysis of a burst: **<= 3 flashes in any 1 s** (WCAG 2.3.1) [P] |
| 21 | Reduced motion | With `prefers-reduced-motion: reduce`, shake, hitstop shake and big camera moves are off; the tank still plays [P] |
| 22 | FM-1 knob feedback | Each knob detent changes the screen in the **next frame** (<= 33 ms at 30 fps), the value tweens rather than jumps, the page badge is always visible, the pop-up fades after ~1 s of no turning [D] |
| 23 | Idle invite | With no input, the tap invite / an idle fidget starts after **N s** (set N after watching kids; none of the sources gave a number) and stops for good after the first touch (current rule) [UNVERIFIED number] |

## What I could not verify

Swink's 100 / 240 ms numbers (secondhand only). Iwai's "attractive at first sight" quote (not found). Material 3's
duration tokens (not fetched). The Iwata Asks Rhythm Heaven page (TLS error; search excerpt only). Kao 2020's and Hicks
2019's full results (abstracts / citing papers only). Glocker 2009's effect sizes. Patatap's key mapping. Incredibox's
bonus rules (Wikipedia only). Kandinsky / Rhythm details (teacher guides, not the makers). Any primary source with numbers
for idle-fidget timing or for how long to wait before inviting a touch. How any of this feels on a real phone or on the
FM-1's speaker: machines can't check that; kids have to.

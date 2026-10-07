Be concise. No preamble. No apologies. Just the code/answer. Save tokens but be efficient. You are a
master of modern intuitive UI, web design, and audio tools supporting VST/AU/mobile + pc/mac browsers.

---

# 1. BEFORE YOU TOUCH ANYTHING

- **Do the whole list, in the order given.** Do not stop to ask which item to start with. Do not
  re-ask a question already answered in the request.
- **Read the screen you are about to change.** Screenshot it first. You need the "before".
- **Research before building.** Facts, sources, competitor behaviour — all of it before the first edit,
  never after.

# 2. BEFORE YOU SAY DONE

1. **Evidence, not "should work."** Build output, a test result, or a screenshot of the actual
   user-visible outcome. A proxy metric that doesn't measure the artifact you can see is worthless.
2. **Look at the same screen again.** Compare to the "before". *If there is more on it than there
   was, that is a finding, not a feature.*
3. **Subtraction budget.** A pass that adds a visible control, row, lesson or panel must fold,
   merge or remove one — or state plainly why it couldn't. Surface area is a cost paid by the user
   every single time they open the app.
4. **Run `node dev-loadtest.js`.** `node --check` misses runtime/TDZ load bombs.
5. **Run `node dev-surface.js`.** It fails if a mode grew controls or words without a recorded
   reason. This is the gate that stops "it's worse when I come back."
6. **Say what you could NOT verify.** "Does it sound good", "does it feel smooth on a 120Hz screen",
   "does the TTS voice grate" — name these and hand them to the user's ears and eyes. Never imply
   they're confirmed.
7. **End with the upload/delete list.** Always. Unprompted.

# 3. WHEN TO ASK (and when not to)

**Ask only for:** destructive or irreversible actions · a change of art direction · a genuine
either/or where both paths are expensive and the request doesn't imply one.

**Never ask:** which item on a list the user already gave to do first · whether to keep going ·
permission to do the obvious next step · to re-confirm something stated earlier in the conversation.

Asking about scope is the single biggest waste of the user's money in this project. When genuinely
unsure between two cheap options, **pick the simpler one, do it, and say which you picked.**

# 4. THE FAILURE MODE THIS FILE EXISTS TO STOP

Each pass is locally correct and the product still degrades, because "correct" is measured per-change
and never across the whole. Twelve rows in a settings panel, seventeen lessons, twenty-three test
suites — every one of them justified on the day. **Check the whole, not the diff.**

Corollary: this file is subject to its own rule. It is capped at ~90 lines. Adding a lesson means
compressing or deleting one. Do not let it become a graveyard again — a general rule that fires on
the next unseen case beats a war story about one that already happened.

# 5. REFERENCE — do not re-derive these

**Learn-mode scale ramp.** 23 lessons, 5 blocks: Rhythm and Notation (1–6), Pitch (7–10), Scales and
Harmony (11–14), Minor and Modes (15–17). Order from the Kodály sequence (Holy Names University
Kodály Center), cross-checked against Trinity College London and the DfE Model Music Curriculum.
Three things look wrong and must not be "tidied":
- the step after the major pentatonic is the **minor pentatonic** (same five notes, new tonic) — two
  full grades before the major scale
- **fa arrives a grade before ti**; the major scale is built up, never handed over whole
- modes sit at the ceiling: ABRSM piano has none, the MMC never mentions one Y1–Y9, Trinity puts
  Dorian at G7. Phrygian/Lydian/Locrian deliberately absent — no primary syllabus lists them.
- Major/minor discrimination is reliable at ~6–8 years (Dalla Bella 2001), hence lesson 13 not 2.

**Naming.** A lesson title is the concept's real name (musictheory.net / Hoffman convention); the
subtitle is the plain sentence. "la-pentatonic" is Kodály shop-talk — the world says minor
pentatonic. If a piano teacher wouldn't recognise the word, it's the wrong word.

**Letter names** sit beside the syllable on the seven-note lessons only (`letters:true`), and refresh
when the key roams — the syllable staying put while the letter moves IS the movable-do idea, and it
is what a producer needs to read a piano roll. Spelling comes from the DEGREE, never the pitch class:
one letter per degree in order, accidental chosen to land on the pitch. The 4th of F major is Bb.
Unverified in §5, do not re-cite as fact: Trinity's piano syllabus has no modes at any grade (the
"Dorian at G7" line may be Rock & Pop); and the published Kodály sequence puts modes at Grade 4,
BEFORE the major scale — modes-last is right on ABRSM/MMC grounds, not Kodály ones.

**Copy.** Western terminology, methods from anywhere, no cultural tour in front of the child. One
short sentence per line. If an adult would skim it, a child can't read it. Lessons are numbered.

**The staff block is LAST and pinned to C major** — no roaming, no key signature, no accidentals.
Every other lesson roams so the answer cannot be a screen position; here the screen position IS the
lesson. Geometry lives in `staffY()`: step 0 = middle C on a ledger below, step 2 = E on the bottom
line. Stems go UP below the middle line (step 6 = B) and DOWN on or above it. The clef is generated
as a spiral centred on the G line rather than hand-tuned beziers. `dev-staff.js` checks every note
lands where a musician would read it. Never let staff reading creep earlier — ear first, page last,
or the app becomes a worse musictheory.net and loses the only thing it is best at.

**No camera, no microphone, ever.** That is what lets a school approve the URL without a meeting, and
it is worth more than any feature it rules out (posture checking, "hear the real piano"). The
teachers page says plainly what the app therefore cannot teach.

**Buttons have thickness, not a drop shadow.** `--depth` / `--depthUp` / `--depthIn`: a hard
unblurred bottom edge, a lit top face, a tight contact shadow — and pressing travels DOWN the full
thickness. A big soft blur under a rectangle is the flat "a machine made this" look. No gradient text.

**Sound.** Reverb is a ConvolverNode with a noise-generated stereo IR (nothing is downloaded); drums,
band and lead have separate sends, drums least or the kick turns to mud. Every noise voice starts at a
random offset in one shared 2s buffer — sharing offset 0 is what made fast hats machine-gun. Filter
cutoffs track pitch AND velocity. Ghost snares at 14-28% between the backbeats. Karplus-Strong is NOT
viable: a DelayNode inside a feedback loop is forced to ≥128 samples, so it detunes below ~344Hz.

**Art.** Crayon and coloured pencil end to end. Never swap hand-drawn art for flat vector, geometric
or chart-shaped glyphs. A missing icon means a drawn asset, not an SVG path. Ask before changing art
direction.

**Architecture.** One `index.html`, no build step, bump `sw.js` each deploy, bake data into JS.
One renderer per thing — a second way to draw a lesson is a second place for copy to rot.
One definition per string — a duplicate key later in `LANG` silently wins.
Band patterns are degree-relative tokens, never absolute pitches (that's what lets `keyJourney()`
walk the circle of fifths). Import via `patterns/tools/`, never a runtime MIDI parser.
Sharing a recording means handing over the FILE (audio via the OS share sheet, MIDI per part), never
a payload encoded into a URL: a real 75s jam packed to 1828 chars, and an audio file plays inline in
every messenger while a link is a tap-through. `boot()` lives inside the splash IIFE — anything
deferred out of that scope cannot call it.

# 6. KNOWN TRAPS — one line each, generalised

- **Never let a test assertion drive the design.** Fix the thing, then fix the test.
- **A test that proves it RUNS is not a test that it WORKS.** Measure whether it can be *done*.
- **MEASURE THE OUTPUT, NOT THE CALL.** This is the rule the whole file exists for. Two separate
  silences shipped for ~2 months with 21 suites green: `note()` routed to `playNote()`, which takes a
  MIDI number and got a frequency, so its range guard returned — no throw, no error; and `dHit()`
  threw on a null `drumBus` into a silent `catch`, muting every click track and the whole rhythm
  block. Nothing was "broken" by any test's definition. `dev-realaudio.js` taps the graph at
  `AudioContext.destination` and reads RMS off the actual samples; `dev-controls.js` presses every
  hit-testable control and demands audio, a DOM change or a class change. Those two cannot be
  satisfied by calling something. Add to them; never replace them with a call-counter.
  There are ~117 `catch(e){}` in this codebase. Any one of them can hide a dead dependency, so a
  function must arm its own dependencies (`dHit` now calls `initDrums()` itself) rather than trusting
  a caller to have done it.
- **Headless throttles requestAnimationFrame.** A rAF-driven lesson looks mute in a test for a reason
  that is not the product. Shim rAF to a timer before concluding anything — then if it is still
  silent, it is real. Both suites above do this.
- **A silent failure passes every test you have.** `note()` routed through `playNote()`, which takes a
  MIDI number and was handed a FREQUENCY; its `if(m<12||m>120)return` fired, nothing threw, and every
  pitched sound in learn mode was silent while 21 suites stayed green. `playSynth(freq,…)` is the
  voice. `dev-audible.js` now counts oscillators for every lesson — if something claims to play, it
  has to move air. When wrapping a function to measure it, check the wrapper actually fires: `note`
  and `staffY` live inside learn2's IIFE and cannot be hooked from outside at all.
- **Lesson 2 is where this product category dies** (Hoffman: 1.4M views on lesson 1, 46.9K on lesson
  2). It is a looper, not a quiz, and its three guarantees are load-bearing: pentatonic so nothing
  sounds wrong, snap-to-eighth so nothing is out of time, and the loop never stops so you hear
  yourself inside half a second. Never put a drill in that slot.
- **A lesson clearable by a fixed strategy is a button, not a lesson.** Run the dumb strategy (always
  the bottom rung, always the lit one, always the next one up) and require it to FAIL — `dev-cheat.js`.
  Three lessons shipped passing every other suite while needing no ears at all.
- **An intermittent test failure is an intermittent bug.** Chase it before touching the assertion.
- **Generate a few hundred outputs and take the statistics.** A generator can be architecturally
  correct and sound terrible. ("Has an arch contour" ≠ sounds like anything.)
- **Check it in motion.** An effect that's fine in a still can be unbearable animated, and a
  fixed-step sim drawn without interpolation duplicates frames on any out-of-phase display.
- **Never derive a timebase per frame.** Latch the audio↔wall-clock offset once.
- **Measure the bytes, not the intent** — for MIDI, stub the port and assert on the stream.
- **When visual evidence conflicts with an automated check, the visual wins.** Zoom in before
  explaining it away.
- **A live bug can be a stale upload.** Verify the deployed asset equals the local one — and that
  every file the app references is actually THERE, with a real browser against the real URL.
- **`cache.addAll()` is all-or-nothing.** One 404 in the list silently kills the whole service
  worker: no registration, empty cache, no offline. Add files one at a time and catch each.
- **`navigator.share()` needs the tap still warm.** Any `await` before it spends the activation and
  iOS never opens the sheet. Build what you are sharing BEFORE the click handler runs.
- **Flex `justify-content:center` overflows BOTH ends.** Use `safe center`; put short-viewport
  media blocks at the END of the stylesheet.
- **Micro-timing offsets stay < 0.5 step; downbeat locked to 0; clamp velocity.**
- **Image knockout:** border flood-fill of a colour the subject doesn't share; feather only the
  true edge. A pale subject on a near-matching background is an impossible matte — demand a key colour.
- **A feature that covers a bug is two bugs, and fixing one of them ships something worse.** Play
  mode started its whole band the second the door opened. That hid the fact that touching the tank
  took **1471ms** to make any sound at all — the ball has to fly across the tank to reach a wall, and
  quantize then held the note until the next grid line. A child tapped, heard the band that was
  already going, and nobody ever noticed the tap itself did nothing. Turning the auto-band off on its
  own would have shipped a play mode whose first touch is silent. Measured both, fixed both: the tap
  now rings the nearest wall on contact (63ms), then the band joins 400ms later.
- **Time-to-sound is a number. Assert the number.** "It makes a sound" passes in 1.5 seconds and in
  60ms, and only one of those feels like the child caused it. `dev-firsttouch.js` clicks with a real
  trusted click and fails over 250ms.
- **A hand never gets quantized.** No music software quantizes live input while you play it. Balls
  land on the grid; fingers sound now. That is what `trigger(...,now)` is for.
- **Never clamp a scheduled timestamp up to "now".** `send([0xF8], Math.max(performance.now(), want))`
  collapsed every late tick onto one identical timestamp — 20–51ms of spread in a clock whose spacing
  was otherwise perfect, and the spacing is the only thing a sequencer reads. The Web MIDI spec says a
  past timestamp is sent as soon as possible anyway, so the clamp protected nothing and destroyed the
  timing it existed for. 0.00ms after removing it.
- **Any control whose text changes width drags every control beside it.** The transport label swaps
  "play"/"pause" and the chord chip prints "G", "Bb", "F#m" — both resize, the row is centred, so the
  play button, record button and slime switch slid sideways on every chord change. A child aiming at a
  moving target. Reserve the width of the longest label (`min-width`) and watch real playback across
  several chords demanding exactly ONE x position per control.
- **A flaky check is worse than no check, because you stop believing it.** 3px drift, then 0, then
  3px. The answer was never the tolerance — it was a chip that genuinely changed size. Fix the cause;
  the flake goes with it.
- **A suite that sets up its own state can measure the wrong app.** `dev-fluid` spawned its own balls
  and called a *paused* tank "100% duplicate frames". Paused meaning frozen was correct — so assert
  the freeze too, then start the transport and measure smoothness. Two real assertions out of one
  false alarm.
- **Recover from bad numbers; don't try to prevent them all.** A ball whose x/y goes to NaN matches
  no despawn test (every comparison against NaN is false), so it is never removed and then throws
  inside the renderer on every frame, forever — a dead app from one bad subtraction. Eleven
  hand-placed `isFinite` guards only cover the entry points someone thought of. `sweepBadBalls()`
  runs once per frame, throws out whatever has gone bad, and the app carries on. `dev-revive.js`
  proves it by deliberately poisoning the tank with NaN and Infinity balls and then demanding the
  app still animates, still sounds and still responds to a touch — removing them is not the point,
  surviving them is.
- **A thing that quietly fixes itself is a thing nobody ever fixes.** The sweep COUNTS and logs every
  drop, and the suite fails if normal play drops even one. Self-healing without reporting is just a
  slower version of the silent failure.
- **Report from inside the callee, because the caller's `catch(e){}` cannot be reached from there.**
  ~130 empty catch blocks swallowed dHit() throwing at every single call site for two months.
  Un-silencing 130 sites is a huge diff for a small gain; instead `playSynth`, `pluck` and `dHit`
  report their own silent exits into `window.__oops`. One place to instrument, every call site
  covered. `dev-silence.js` drives all three modes and all 26 lessons and fails if that list is not
  empty — the gate that would have caught the mute on day one.
- **An empty failure list must be PROVEN capable of being non-empty.** `dev-silence.js` first switches
  the synth off on purpose and demands the report appears. Otherwise "no failures" and "nothing can
  write to the list" look identical, which is the same trap as the dead hook.
- **The microtuning is real — verify the tuning, never the label.** Measured at the walls: major gives
  a 400c third, 19-EDO gives 379c (7c flat of a pure 5/4, i.e. better than 12-TET's 14c-sharp 400c),
  Maqam Rast gives a 350c neutral third. `dev-tuning.js` asserts the intervals in cents AND that the
  three tunings differ from each other, so three menu entries that all secretly produce 12-TET cannot
  pass. A scale menu that selects without retuning teaches a child something false.
- **`#scale` is a hidden duplicate; `#scaleTop` is the one on screen.** Test the control a human can
  reach — `getElementById('scale')` returns the hidden one and will tell you the picker is invisible.
  Play mode has no scale picker at all, deliberately (it is the ultra-minimal kids' door).
- **A fader must fade the WHOLE sound.** The percussive tick of every tank note connected straight to
  `master`, bypassing `melBus`, so the triangle mixer's melody corner only ever faded the tonal half
  of a note — the impact kept playing at full level wherever you dragged it. That is most of why the
  mixer "made no sense". Found only because a chord-bed test refused to go silent with every corner
  muted; the leak was the clue, not the noise.
- **The chord bed has its own path to the speakers** (`padBus` → master, with its own reverb send) and
  a fixed level (`PAD_LVL`). It used to run through `bandMix` AND be multiplied by the bass/pad
  crossfader, so harmony vanished when you moved a control that said nothing about chords. The band
  on/off button is still the deliberate switch; a mixer is not a mute. `dev-chordbed.js` proves it by
  dragging the triangle hard to drums with the kit off, then muting `padBus` as a control.
- **Do NOT try to prove an audio routing claim by setting `melBus`/`drumBus`/`master`.gain.value.**
  `applyMix()` rewrites those continuously with `setTargetAtTime`, so the assignment is undone before
  the next measurement. `padBus` is not touched by it. Meter the bus you care about instead.
- **Decoration families must share ONE notion of "someone is already standing there".** Every placer
  avoided the furniture (controls, tank, mixer, worm) but none avoided the OTHER placers: the nappers
  hang in the very band the margin slimes fill, the edge peekers slid along their rails not knowing
  the worm or the band characters existed (83% overlap), and the 4-bar morph-hop could land on a
  friend. Fixed with `decorRects()` + `boxFree()` + one ordered `relayoutDecor()` — the ORDER is the
  fix, because each family only avoids what was placed before it. `dev-crowding.js` counts overlapping
  rectangles across 3 modes × 6 screen sizes, before and after 40 hops.
- **Skipping beats stacking.** When a decoration finds no clear spot, it is left out. One slime fewer
  reads as deliberate; two on top of each other reads as broken.
- **Artwork needs room, not redrawing.** The rhythm tiles are hand-drawn band scenes supplied at
  256px and were shown at 78 — every kit read as the same coloured blob. Nothing about the art was
  changed; it was given ~37% more linear size at every breakpoint (there was vertical headroom on all
  of them) plus a 7% crop of its own dead border. Look at the asset before deciding a picture problem
  is a drawing problem.
- **Children's natural tempo is FASTER than adults', not slower.** Spontaneous motor tempo runs from
  ~200bpm at age 4 down to ~90bpm in elderly adults, and a 19–20-month-old synchronised best with
  140bpm songs (Frontiers in Psychology, 2019). So "this feels fast for a kid" is usually the
  harmonic rhythm, not the tempo — at 80bpm in 4/4, one chord per bar is a chord change every three
  seconds, which reads as restless. Change those two independently.

## The band generator (2026-10-06)

- **`FEELS` is the band's personality, as rules instead of recordings.** One row per rhythm class:
  `grid, seeds, w[16], density, seedOdds, push, ring, dodge, bass{}, fill{}`. `genComp` / `genBass`
  / `genFill` / `bandPlan` build a fresh part every bar from it. Add a genre by adding a row.
- **Why generated and not a pattern library.** A folder of loops is finite — pick the same rhythm
  twice and you hear the same bar twice. And a genre's conventions ("bossa hits 1, &2, 4"; "disco
  bass jumps the octave every eighth") are common practice you can read in any method book, not
  anyone's file, so generating from them means nothing is derived from third-party MIDI. Sources
  are cited in the table header. The old rule still holds: **no .mid ever reaches the browser.**
- **It still speaks the old language.** Comps are 16th step arrays, bass is still R/T/F/O/A degree
  tokens — which is what lets `keyJourney()` walk the circle of fifths without transposing. Nothing
  downstream had to change.
- **Bass holds a 16-bar block; the comp is redrawn every bar.** A bassline that changes every bar is
  not a bassline. That split is roughly how a real rhythm section behaves.
- **`dodge` is a genre decision, not a quality setting.** Jazz (.85) and bossa (.8) weave around the
  bass; disco (.12) and rock (.3) lock to it ON PURPOSE. Measured: the weaving kits land 26–41%
  fewer hits on a bass note than the same seeds would with the bass hidden from them.
- **Measure a generator's STATISTICS, not that it ran.** `dev-band.js` checks distinct-pattern counts
  over 240 bars, per-genre signatures (disco off-beat ≫ on-beat, jazz never touches the e/a, rock
  the reverse), that the five kits' onset histograms differ, that the bass holds then changes, and
  the dodge A/B.
- **A baseline can be unfair and fail a working feature.** The first interlock test compared against
  a uniform baseline and failed all five kits. Chord hits and bass notes both cluster on strong
  beats, so they collide more than random chance even with no dodging. The fair test runs the same
  generator on the SAME seeds with and without the bass handed to it.
- **`pickChord()` takes a CHORD index, never a bar index.** Its quiet-tank fallback indexes a 4-chord
  loop by the number you give it, so holding a chord for 4 bars and asking for `pickChord(bar+4)`
  returned the same chord forever — a 4-bar chord actually lasted 12. `_chordIdx` counts chords.
- **`S.chordBars`** (chord menu, remembered, default 2) is how long an auto chord lasts. Custom
  progressions keep their own per-chord bar counts.

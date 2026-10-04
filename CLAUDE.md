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

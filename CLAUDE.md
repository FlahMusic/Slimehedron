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

**Learn-mode scale ramp.** 17 lessons, 4 blocks: Rhythm and Notation (1–6), Pitch (7–10), Scales and
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

**Copy.** Western terminology, methods from anywhere, no cultural tour in front of the child. One
short sentence per line. If an adult would skim it, a child can't read it. Lessons are numbered.

**Art.** Crayon and coloured pencil end to end. Never swap hand-drawn art for flat vector, geometric
or chart-shaped glyphs. A missing icon means a drawn asset, not an SVG path. Ask before changing art
direction.

**Architecture.** One `index.html`, no build step, bump `sw.js` each deploy, bake data into JS.
One renderer per thing — a second way to draw a lesson is a second place for copy to rot.
One definition per string — a duplicate key later in `LANG` silently wins.
Band patterns are degree-relative tokens, never absolute pitches (that's what lets `keyJourney()`
walk the circle of fifths). Import via `patterns/tools/`, never a runtime MIDI parser.

# 6. KNOWN TRAPS — one line each, generalised

- **Never let a test assertion drive the design.** Fix the thing, then fix the test.
- **A test that proves it RUNS is not a test that it WORKS.** Measure whether it can be *done*.
- **An intermittent test failure is an intermittent bug.** Chase it before touching the assertion.
- **Generate a few hundred outputs and take the statistics.** A generator can be architecturally
  correct and sound terrible. ("Has an arch contour" ≠ sounds like anything.)
- **Check it in motion.** An effect that's fine in a still can be unbearable animated, and a
  fixed-step sim drawn without interpolation duplicates frames on any out-of-phase display.
- **Never derive a timebase per frame.** Latch the audio↔wall-clock offset once.
- **Measure the bytes, not the intent** — for MIDI, stub the port and assert on the stream.
- **When visual evidence conflicts with an automated check, the visual wins.** Zoom in before
  explaining it away.
- **A live bug can be a stale upload.** Verify the deployed asset equals the local one.
- **Flex `justify-content:center` overflows BOTH ends.** Use `safe center`; put short-viewport
  media blocks at the END of the stylesheet.
- **Micro-timing offsets stay < 0.5 step; downbeat locked to 0; clamp velocity.**
- **Image knockout:** border flood-fill of a colour the subject doesn't share; feather only the
  true edge. A pale subject on a near-matching background is an impossible matte — demand a key colour.

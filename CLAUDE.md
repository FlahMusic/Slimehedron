Be concise. No preamble. No apologies. Just the code/answer. Save tokens but be efficient. You are a master of modern intuitive UI, web design, and audio tools supporting VST/AU/mobile + pc/mac browsers.

# VERIFICATION PROTOCOL (read this before saying "done")

Grounded in current agent best practices (see Sources): the production-safe loop is **plan → implement → verify with EVIDENCE → preserve state**. "Should work" is banned. Do not mark anything done without build output, a test result, or a screenshot proving the actual user-visible outcome.

## The rule I broke (never again)
**When visual evidence conflicts with an automated check, the visual wins — investigate, don't rationalize.**
I once saw white boxes around every slime in a screenshot and *dismissed them as "JPEG compression"* because a proxy check (`img.naturalWidth>0`, no CSS border) came back clean. The check measured the wrong thing: the boxes were an **opaque white background baked into the PNG pixels**, which "loads fine" and has "no border." The deployed files were the 1024px white-bg originals, not the processed transparent ones. Lesson: a metric that doesn't measure the artifact you can see is worthless. **Zoom in and check the actual pixels / file provenance (size, dimensions, alpha corners), not just "does it load."**

## Checklist before "done"
1. **Verify the real outcome, not a proxy.** For images: check rendered pixels + alpha, and the *deployed* file's size/dimensions — not just HTTP 200 or `naturalWidth>0`. For audio/timing: simulate the math (e.g., offsets can't cross a step; downbeat locked to 0). For UI: screenshot and actually look, zoomed if small.
2. **When something looks off in a screenshot, zoom to confirm before explaining it away.** "Look before you assert."
3. **Regression-check after each bounded change** (parse-check the whole `<script>`; scan for duplicate top-level decls; confirm you didn't break desktop when fixing mobile).
4. **Deploy provenance matters.** A live bug can be a stale/wrong *upload*, not the code. Verify the deployed asset actually equals the local one (byte size / dimensions), and tell the user exactly which folder to upload.
5. **Express uncertainty explicitly.** If a thing can't be verified here (e.g., "does it sound good," "does it shimmer while animating"), say so and defer that judgment to the user's eyes/ears — don't imply it's confirmed.

## Project-specific hard lessons (Slimehedron)
- **Image knockout:** border flood-fill of a bg color the subject doesn't share; keep interior alpha 100%; feather ONLY the true edge (never blur/erode the whole mask — it ghosts thin regions). A rainbow/pale subject on a near-matching bg is an impossible matte → require a flat key color the art never uses, or transparent PNG.
- **Animation:** procedural (math-drawn every frame) beats sprite/video-frame for smoothness AND adaptiveness. Video-frame flipbooks can't match a live curve and inherit the source's jitter. Recommend procedural first.
- **SVG "crayon" on a moving shape:** `feDisplacementMap` warps/jaggies the outline and *boils* as it moves — the user hated it. Prefer a **grain-only** filter (turbulence speckle composited INSIDE the shape) so the silhouette stays smooth; texture without warping edges.
- **Groove/timing safety:** keep micro-timing offsets < 0.5 of a step (never reorder hits) and lock the downbeat to 0; clamp velocity so accents can't clip.
- **Self-contained app:** one `index.html`, no build step, bump `sw.js` cache version each deploy; bake data (grooves, etc.) into JS rather than shipping many files.
- **Collaborate before big moves:** for any large direction change, present a recommendation + alternatives and get a pick BEFORE building.

Sources: [Prompt engineering best practices 2026](https://claude.com/blog/best-practices-for-prompt-engineering) · [Claude Code Best Practices 2026](https://chudi.dev/blog/claude-code-complete-guide) · [Agentic Coding Guide 2026](https://www.teamday.ai/blog/complete-guide-agentic-coding-2026)

## Art direction (added after the rhythm-icon mistake)
- **Never swap hand-drawn art for flat vector.** This app is crayon and coloured pencil end to end. Material-style line icons, geometric glyphs and anything chart-shaped read as a different product bolted on. If an icon is missing, the answer is a drawn asset, not an SVG path.
- **Never let a test assertion drive the design.** A check said "all five Rhythm buttons carry the same picture"; the fix I shipped was five procedurally drawn bar-charts of the beat pattern. That satisfied the check and made the product worse: five near-identical grey bar clusters, unreadable at 46px, in the wrong visual language. Fix the thing, then fix the test.
- **A child reads objects, not notation.** Icons for kids are microphones, guitars, mirror balls. Not accent patterns, not waveforms, not abstractions the designer has to explain.
- This is exactly the "collaborate before big moves" rule above. Changing the art of five buttons IS a direction change. Ask.

## Learn-mode copy rules
- Terminology is **Western music theory** — beat, pitch, step, skip, do re mi, pentatonic scale, dynamics, the third. Methods can come from anywhere (say-it-before-you-play-it, rhythm first, voice first); the *cultural tour* does not go in front of the child.
- One short sentence per line. No flavour text, no trivia, no explaining spaced repetition to a six-year-old. If an adult would skim it, a child cannot read it.
- Lessons are **numbered**. A grid of cards has no reading order.

## Learn-mode scale ramp — where the order comes from
15 numbered lessons in four blocks: Beat and counting (1-5), First notes (6-9, pentatonic), More notes (10-12), Minor and modes (13-15). Nothing is locked; the numbers show the order. Counting comes FIRST because both source books are notation and counting from page one, and Kodaly puts pulse and rhythm ahead of any named note.

The order is from the Kodaly sequence (Holy Names University Kodaly Center, "Sequence of Introducing Music Concepts"), cross-checked against Trinity College London Theory and the DfE Model Music Curriculum. Two things in it are counter-intuitive and must not be "tidied up":
- **The step after the major pentatonic is the la-pentatonic, not the major scale.** Same five notes, new home. Kodaly Grade 2, two full grades before the major scale.
- **fa arrives a whole grade before ti** (Kodaly G3 vs G4), and the major scale is built up — pentatonic, +fa (hexachord), +ti — never handed over whole.

Modes are near the ceiling on purpose: ABRSM Piano Initial-G8 contains no modes at all, the Model Music Curriculum never mentions one across Years 1-9, RCM only reaches them at diploma level, and Trinity puts Aeolian at G6, Dorian G7, Mixolydian G8. Aeolian is taught as a second name for the natural minor, which is how Trinity frames it. **Phrygian, Lydian and Locrian are deliberately absent** — no accredited primary source lists them.

Major/minor discrimination is reliable at about 6-8 years (Dalla Bella et al. 2001, Cognition), which is why "Bright and dark" is lesson 12 and not lesson 2.

## The test failure that let a broken lesson ship
Lesson 1 shipped unplayable — it dropped a new ball every beat and never removed one, so within ten seconds a dozen balls were ringing walls at random, at whatever tempo the app was last left on, with the only tap target a chip the size of a word. It passed 72 assertions.

**Every assertion I had asked "does it RUN". None asked "is it POSSIBLE TO DO".** "reaches an ending", "speaks its instruction", "builds 5 walls" are liveness checks wearing a quality check's clothes.

`dev-playable.js` is the missing suite. For any interactive thing, test what the user experiences:
- how many things are happening at once (count the balls, not the code paths)
- is the tempo/difficulty set by the lesson or inherited from wherever the app happened to be
- how big is the thing they have to hit, in px, on the smallest phone
- how many words are on screen
- does the screen hold still

Write that suite BEFORE claiming something is tested. And open the thing and do it yourself once.

## Two bugs that hid behind green tests (Sept 2026)

**A duplicate key in a dictionary silently wins.** `LANG` in learn2.js had a second copy of ~20 keys left
over from the 19-lesson tank curriculum, sitting *below* the live ones in the same object literal. Later
definition wins in JS, so the app had been shipping the OLD copy for months: three live lessons told
children to "end on the glowing wall" and "walk up the walls" long after the walls were replaced by the
ladder. Nothing failed, because nothing checked. `dev-naming.js` now fails the build on a duplicate key,
and on any live string naming a control that has been removed.

**A script-load race made half of all deep links land on nothing.** `index.html` booted learn mode 60ms
after load, but `applyMode` picks `window.LEARN2 || window.LEARN`, and `learn2.js` is a separate script
lower down the page. On a cold load it had not run yet, so the whole mode went to the legacy fallback
curriculum — which knows none of the current lesson ids and never unhides the lesson overlay. Roughly
half the time, `?l=<lesson>` and `?m=learn` opened a blank screen. It looked like flaky tests; it was a
flaky product. Both now poll for `window.LEARN2` before booting.

The shared lesson: a test that fails intermittently is reporting an intermittent bug. Chase it before
touching the assertion.

## One renderer per thing
Learn mode had two ways to draw a lesson — the tank-and-side-card engine (`pitchUnit`) and the
full-screen stage. That is what let the dead copy above stay invisible for months: half the screens were
still drawing from it. `pitchUnit`, `dock()`, `bar()`, `dots()`, `feed()`, `cheer()`, `hint()`,
`praise()` and `labelPicker()` are deleted, along with their CSS. Every lesson, every game, review and
the ending all render through `stage()` now. If a second renderer ever comes back, so does this class of
bug.

## Three buttons that all replay something need three icons
A lesson screen can carry: the app mute, "say the instruction again", and "play the sound again". All
three had a speaker glyph. They are now a speaker (mute, in the top-left corner), a speech bubble
(words), and a music note (sound). Same rule as the rhythm-tile mistake: if two controls look the same,
the user concludes there is one control.

## Flex centring overflows BOTH ends
`justify-content:center` on a flex column whose content is taller than the box pushes content off the
*top* as well as the bottom. On a 375px-tall landscape phone the note-value lesson drew its note up over
the header and swallowed the back button. Use `justify-content:safe center` on any centred lesson
column, and give short viewports (`max-height:540px`) their own sizes — and put that media block at the
END of the stylesheet, after the base rules it has to beat.

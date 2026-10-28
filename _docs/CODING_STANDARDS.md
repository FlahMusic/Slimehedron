# Slimehedron coding standards

Judgement calls for a reviewer: a person, an agent, or the `code-review` skill (which reads this file). Anything a
tool can check belongs in a `_dev` suite instead. Words: `_docs/GLOSSARY.md`. Decisions: `_docs/adr/`.
Harvested 2026-10-28 from the retired 849-line `_docs/CLAUDE.md` plus the handoff's trap list; the war stories
behind each rule are in `_docs/retired/CLAUDE.md` and `SLIMEHEDRON-HANDOFF.txt`.

## Before writing code
- **Facts you look up, decisions you ask.** Read the code, run it, screenshot it. Ask Flah only for decisions
  (intent, art direction, an either/or where both paths cost). Ask them in one round, each with a recommended answer.
- Screenshot the screen you are about to change. You need the "before".
- Research before building: facts, sources, how other apps do it. Never after.
- Simplest thing that works. No abstraction nobody asked for. Don't touch code the task doesn't need.
- Never state a guess as a fact. Name what you could not verify (how it sounds, how it feels at 120 Hz).
- Before picking a number (a threshold, a speed, a size), measure the thing it applies to. Example: the chord
  jackpot's "75% chord tones" was a guess, and a full strum of the real walls was 75% chord tones.

## Product rules (do not trade these for a passing test)
- Never change a design to make a test pass. Fix the thing, then fix the test.
- Never replace hand-drawn crayon art with flat vector glyphs. A missing picture is a drawn asset
  (`_docs/ART-BRIEF.md`, `_docs/STYLE_GUIDE.md`). Ask before changing art direction.
- UI copy: short, plain, concrete. Real music words, no flavour text, no "AI words", especially for children.
- **Subtraction budget.** A pass that adds a visible control must fold, merge or remove one, or say plainly why it
  could not. `dev-surface` makes the growth visible; `--accept` must be defended in the reply.
- Play is the kids' room: gestures before buttons. Every touch target is at least 44x44. No streaks, no nags.
- A hand is never quantized (balls land on the grid, fingers sound now). Time-to-sound is a number: assert it.
- Any control whose text changes width must reserve the width of its longest label (or the row slides).
- 2D and 3D must both work; lessons always force the plain tank. Respect `prefers-reduced-motion`, and update the
  count in `accessibility.html` when you add a rule.

## Code
- **Never put a `// comment` in the middle of a one-line statement.** It comments out the rest of the line. Use
  `/* */` inside lines. It has happened six times. `node _dev/dev-syntax.js` after every edit.
- A syntax error in `tank3d.js` fails silently (the canvas fallback draws instead).
- One element per control: move nodes, never clone them. One renderer per thing. One definition per string
  (a duplicate key later in `LANG` silently wins).
- ~130 empty `catch(e){}` blocks can hide a dead dependency. A function arms its own dependencies; audio entry
  points report silent exits into `window.__oops` (`dev-silence` reads it).
- The app moves some controls by itself (MODS sliders, delay fader, key travel, random shape). Undo, song files,
  links and tests must leave those out or pin them.
- Visibility is `el.checkVisibility()`. `offsetParent===null` is not a test (fixed elements), and a closed
  `<details>` still lays out its contents.
- `flex:1` cannot take space back: `flex:1 1 0; min-width:0`. Centred rows overflow both ends: `safe center`.
- A header that gets wider wraps on small phones and pushes the side columns onto the corner menu. After any header
  change, check 360, 375 and 390 px and 1280 / 1440 px desktops (`dev-topbar`, `dev-a11y`, `dev-devices`).
- Physics runs on the fixed 60 Hz tick (`simTick`, `_tickT`); drawing interpolates with `_alpha`. Never derive a
  timebase per frame. Never clamp a scheduled timestamp up to "now".
- Bad numbers are recovered from, not prevented everywhere (`sweepBadBalls`, `dev-revive`).
- Untrusted input (song files, share links, MIDI) goes through `cleanControls` / `cleanExtras` with own-property
  checks and size caps.
- `cache.addAll()` is all-or-nothing: one 404 kills offline. `navigator.share()` needs the tap still warm: build
  what you share before the click, no `await` before the call.

## Tests
- **Measure the output, not the call.** A test that proves a feature RUNS is not a test that it WORKS. Assert what
  a person sees or hears (`dev-realaudio` reads samples at the destination; `dev-controls` presses every control).
- Every new suite is sabotage-tested: break the feature on purpose, list each breakage and the check that caught it.
  An empty failure list must be proven able to be non-empty.
- When a behaviour changes on purpose, grep `_dev/` for suites that assert the OLD behaviour and update them in the
  same pass (2026-10-27: dev-world, dev-3d and dev-crayon all still expected the old play mode).
- An intermittent failure is an intermittent bug. Chase it (see `diagnosing-bugs`) before touching the assertion.
  Before blaming your change, run the suite on the previous commit as a control.
- Pinned-clock tests pin `performance.now`, `beatNow` and `_tickT`; a queued frame can still fire once.
- A suite that screenshots the tank must set `slimehedron-tapped` and the coach keys, or the overlays move under it.
- Generators: run a few hundred outputs and take statistics. Check motion in motion, not in a still.
- When a screenshot disagrees with a check, the screenshot wins. Zoom in before explaining it away.
- Never run ad-hoc Playwright during a sweep (each suite pkills chromium). Never edit the app mid-sweep (the rest of
  the sweep tests different code). Never `pkill` with a pattern that appears in your own command line.

## Shipping
- Never `git push`, never run deploy scripts, never create `.nojekyll`. Flah pushes (ADR 0002).
- Bump `sw.js` on every shipped change. Underscore and dot folders are not published; everything else is.
- A live bug can be a stale upload: check the deployed file equals the local one.
- End every pass with the plain list of files to upload / delete on GitHub.

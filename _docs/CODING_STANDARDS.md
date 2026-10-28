# Slimehedron coding standards

Judgement calls for a reviewer (person, agent, or the `code-review` skill, which reads this file).
Anything a tool can check belongs in a `_dev` suite instead, not here. Vocabulary: `_docs/GLOSSARY.md`.

## Before writing code
- Ask before assuming intent, architecture or requirements. Look facts up in the code yourself; ask Flah only for decisions.
- Simplest thing that works. No abstraction nobody asked for. Don't touch code the task doesn't need.
- Flag uncertainty out loud. Never state a guess as a fact; check sources.

## The product rules (do not trade these for a passing test)
- Never change a design to make a test pass. Fix the thing, then fix the test.
- Never replace hand-drawn crayon art with flat vector glyphs. New art follows `_docs/STYLE_GUIDE.md`.
- UI copy: short, plain, concrete. No flavour text, no "AI words", especially for children.
- 100% synthesized audio, zero external requests, works offline. Nothing is tracked.
- Play is the kids' room: add gestures before buttons. Every touch target is at least 44x44.
- 2D and 3D must both work; lessons always force the plain tank.
- Respect `prefers-reduced-motion` for anything that moves (and update the count in `accessibility.html`).

## Code
- `index.html` is one big inline script. **Never put a `// comment` in the middle of a one-line statement**: it
  comments out the rest of the line. Use `/* */` inside lines. `node _dev/dev-syntax.js` catches the loud cases.
- A syntax error in `tank3d.js` fails silently (the canvas fallback draws). Run `dev-syntax` after every edit.
- One element per control. Move nodes, never clone them (two ids fork the state).
- The app moves some controls by itself (MODS sliders, delay fader, key travel, random shape): anything that compares
  state over time (undo, song files, tests) must leave those out.
- Visibility: use `el.checkVisibility()`. `offsetParent===null` is not a visibility test (fixed elements), and a
  closed `<details>` still lays out its contents.
- `flex:1` cannot take space back: use `flex:1 1 0; min-width:0`.
- Physics runs on the fixed 60 Hz tick (`simTick`, `_tickT`), drawing interpolates with `_alpha`.
- Untrusted input (song files, share links, MIDI) goes through `cleanControls` / `cleanExtras` with own-property checks.

## Tests
- A test that proves a feature RUNS is not a test that it WORKS. Assert what a person sees or hears.
- Every new suite is sabotage-tested: list the breakages tried and which check caught each.
- Pinned-clock tests pin `performance.now`, `beatNow` and `_tickT`; a queued frame can still fire once.
- Before blaming your change for a timing failure, run the same suite on the previous commit as a control.
- Don't run ad-hoc Playwright while a sweep is running (each suite pkills chromium). Never `pkill` with a pattern that
  appears in your own command line.

## Shipping
- Never `git push`, never run deploy scripts, never create `.nojekyll`. Flah pushes.
- Bump `sw.js` on every shipped change. Underscore folders (`_dev`, `_docs`) are not published; anything else is.
- End every pass with the plain list of files to upload / delete on GitHub.

# Many walls (orbs, whole microtonal tunings, a heat-aware renderer)

Status: in-progress. Research: `_docs/research/2026-11-06-many-walls.md`.

## 1. Ask (Flah, 2026-11-06)
"real crazy mathematic almost psychedelic shapes that can support all the tones in microtonal scales, so having a
shit ton of walls ... push this thing to the limits of what would work in a browser ... VST and FM1 firmware as
well. keep these as 3 separate branches of files ... running at the absolute max without throttling and overheating
phones ... modern and futuristic yet playful."

## 2. Decisions (no grill round: Flah asked for questions at the end, one line each)
- Three branches of files = three folders that never edit each other: web (`index.html`, `tank3d.js`), plugin
  (`vst/`), FM-1 (`fm1/`). One git branch (`main`); a git branch per target is a question for Flah.
- New shape family **orb**: N faces from the Fibonacci lattice, N = the tank's note count (12..124), one face per
  note, low notes at the bottom. Studio's shape menu only (play never offers advanced scales).
- New scales, whole tunings: 19-EDO, 24-EDO (quarter tones), 31-EDO, all notes. Drone harmony (no stacked thirds).
- The "junkyard phone" floor is dropped (Flah). The canvas fallback stays (ADR 0004), it is not a speed setting.
- Not this pass: WebGPU/TSL port, GPU goo. Both change how things look and need Flah's eyes.

## 3. Done means
- Studio, 3D: shape "orb (a wall per note)" with 31-EDO x 3 octaves is a 93-face solid; every face plays a different
  note, rising bottom to top; 31-EDO x 4 is 124 faces. Every orb from 12 to 124 faces has exactly N faces.
- Changing scale or range while an orb is up rebuilds it with the new count.
- Curved space works on an orb (it is convex).
- The goo is not clipped by more than 24 planes (no shader with 93 clip planes).
- Render governor: on a screen over 60 Hz, frames draw at most once per physics tick when work is over 50% of
  the frame budget; pixel ratio steps 2 -> 1.5 -> 1.25 -> 1 on sustained work (> 60% of budget for ~1 s) and
  steps back up only after ~5 s under 35%. Never touches LITE's existing rules.
- Plugin core: `tank::solid` builds the same planes and face notes as the web for every seed, grow op and orb
  (numbers within 1e-6 of the web's), with tests.
- FM-1: `fm1/core` has the same solid maths in C99, a host test, and draws a 240x240 frame in 16-row bands.

## 4. Proof
- `dev-orb` (new): face counts for N = 12..124, one note per face, bottom-to-top order, rebuild on scale change,
  curved orb, goo clip count. Sabotage: orb N off by one, faces out of order, clip cap removed.
- `dev-governor` (new): a 120 Hz fake with heavy work halves the draws; dpr steps down and back. Sabotage: no cap.
- `cargo test` (plugin), `make test` style host build for `fm1/` (gcc).

## 5. Changes old behaviour
- None of the existing shapes, scales or the LITE watchdog change. `dev-learnmap` counts SCALES (it reads the length).

## 6. Tickets
1. `issues/01-orbs.md`  2. `issues/02-governor.md`  3. `issues/03-plugin-solids.md`  4. `issues/04-fm1-core.md`

## 7. Not checked by a machine
How a 93-face orb looks turning on a phone; whether 31-EDO walls are tellable apart by ear; heat over 20 minutes on
a real phone (no thermometer in a browser).

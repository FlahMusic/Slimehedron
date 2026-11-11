# Slimehedron on the M-VAVE FM-1 (custom firmware, in progress)

Its own branch of files: nothing here edits `index.html`, `tank3d.js` or `vst/`, and nothing there edits this.
Plan and open questions: `_docs/specs/2026-11-03-fm1-firmware/brief.md`, `_docs/specs/2026-11-06-many-walls/`.

- `core/`: portable C99, no malloc. `solid.c` is the web's solid maths (cube ... orbs, cut / flip / puff, a face per
  note); `draw.c` draws a solid on the 240x240 RGB565 screen in 16-row bands, the way the FM-1's own app paints.
- `host/`: a gcc build for this pc (WSL): `wsl make -C fm1/host check && node fm1/host/check.js` compares every shape
  with the web's numbers (`_dev/solid-ref.json`) and draws `host/orb93.png`.
- `core/space.c`: the web's CURVED space (the hyperbolic tank: walls as arcs of the Poincare disk, the ball step on the
  hyperboloid); `core/drawspace.c` draws it with its mirrored copies, banded. Test: `wsl make -C fm1/host space &&
  node fm1/host/check-space.js` against `_dev/space-ref.json` (rerun `node _dev/space-ref.js` after a change to the
  web's curved space). Sabotaged 4 ways, each caught: the reflection's sign, cosh/sinh swapped, the corner radius,
  the arc direction. Frames: `fm1/host/curved5/6/7.png` (`./spacetest_float render N curvedN.ppm`).
- `core/melody.c`: the auto-notes melody, the same line as the web and the plugin: `wsl make -C fm1/host melody` replays
  the web's golden notes (`vst/slimehedron-core/src/tank/melody_golden.txt`, 6000 notes) and must match every one.
- `core/tank.c` + `core/goo.c` + `core/music.c`: the tank in normal space with its goo, the plugin's headless tank line
  for line. `wsl make -C fm1/host tank && node fm1/host/check-tank.js` runs the plugin's own tank (`host/tankref`, Rust,
  needs `~/.cargo` in WSL) and the C one through `host/scenes.txt`: every hit and every 30th tick must be the same
  double. `TANKDBG=1` makes both print every drop every tick, to find where two runs part.
- The goo has three builds (`core/goo.h`): exact (dense grids), `SH_GOO_HASHED` (the same numbers in 270 KB:
  `node fm1/host/check-tank.js tank_hashed.txt` after `wsl make -C fm1/host goo`) and `SH_GOO_LIGHT`, the device's
  (float, half the drops, 94 KB for the tank): `wsl make -C fm1/host goo-stats && node fm1/host/check-goolight.js`.
- `core/drawtank.c`: the normal tank drawn 2.5D (the web's canvas 3D view) in bands; `core/paint.h` the pixel helpers
  all three renderers share. `wsl make -C fm1/host draw && node fm1/host/check-drawtank.js` checks three camera turns and
  writes `host/tank0..2.png`.
- The port's tickets: `_docs/specs/2026-11-11-fm1-port/spec.md`. The firmware base is SLOOP (Flah 2026-11-11); the
  device build comes with it (ticket 08). Never flash Flah's FM-1 without asking.

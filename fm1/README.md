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
- The port's tickets: `_docs/specs/2026-11-11-fm1-port/spec.md`. The firmware base is SLOOP (Flah 2026-11-11); the
  device build comes with it (ticket 08). Never flash Flah's FM-1 without asking.

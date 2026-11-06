# Slimehedron on the M-VAVE FM-1 (custom firmware, in progress)

Its own branch of files: nothing here edits `index.html`, `tank3d.js` or `vst/`, and nothing there edits this.
Plan and open questions: `_docs/specs/2026-11-03-fm1-firmware/brief.md`, `_docs/specs/2026-11-06-many-walls/`.

- `core/`: portable C99, no malloc. `solid.c` is the web's solid maths (cube ... orbs, cut / flip / puff, a face per
  note); `draw.c` draws a solid on the 240x240 RGB565 screen in 16-row bands, the way the FM-1's own app paints.
- `host/`: a gcc build for this pc (WSL): `wsl make -C fm1/host check && node fm1/host/check.js` compares every shape
  with the web's numbers (`_dev/solid-ref.json`) and draws `host/orb93.png`.
- The device build waits for the firmware base (brief, question 1).

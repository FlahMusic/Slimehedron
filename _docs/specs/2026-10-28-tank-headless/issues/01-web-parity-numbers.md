# 01 The web app's numbers

Status: ready
Spec: `../spec.md` (Done means: parity)

Write `_dev/dev-vstparity.js`. It drives the real app (Playwright, like the other suites) in studio, 3D, at the
spec's start state. Slime on, auto-notes on, key journey pinned (`_keyPinned`), no random shape, MODS still, spin 0.
It runs 200 bars per run, 5 runs, at a sped-up clock if the app allows it without changing the physics (check that
first; otherwise run in real time, ~10 min a run).

It records the five stats from the spec (hits per bar, share within 20 ms of the grid, share of pane hits, gooed
hits' level next to clean ones, fill at bar 64) and writes their means and standard deviations to
`../web-stats.json`.

Done when: the JSON exists, and a sabotage (quantize off) moves "share on grid" outside ± 2 sd. Add it to
`_dev/SUITES.md`.

# 01 The web app's numbers

Status: done (2026-10-28)
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

## Notes (2026-10-28)
- The fast clock is a counter stepped one 60 Hz tick at a time (`performance.now` and `requestAnimationFrame`
  replaced in the page). `SPEEDCHECK=1` runs 3 seeds × 20 bars both ways: hits a bar 9.32 fast vs 9.23 real, on grid
  92.3% vs 92.3%, panes 27.6% vs 27.7%.
- The physics reads three things the 3D draw keeps up, so the fast loop calls them per tick too: the view's slow
  tilt (`viewTick`; the goo and the balls fall toward its "down", `boxGravity`), a healing wall fading back in
  (`wallUpkeep`), and the fill (`measureFill`, every 10 ticks). The lite look is pinned off (it shrinks `partCap`).
- Pinned on top of the ticket: the chord brain is not called (home chord, and it is where the web counts bars), so
  the suite opens and heals walls on its own bar count. Drums and band off. Burst and the 128-bar reform stubbed.
- The web runs are seeded but not bit-reproducible (page timers also draw from `Math.random`). That is fine: the
  numbers are statistics over runs.
- Sabotage: quantize off moves "share on grid" outside the band (see `_dev/SUITES.md`).

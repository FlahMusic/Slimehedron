# 04 The goo (3D) and its cost

Status: done (2026-10-29), except the cost: missed, see 07
Blocked by: 02
Spec: `../spec.md`, ADR 0007, ADR 0008

Port the 3D goo: splashes add particles (`splash`), `fillPhysics` / `gooStep3D` / `gooContain3D` / `gooWake`,
the `_GD` grid with `GOOC`=24, `gooAt3`, the fill measure (pooled particles over `partCap`*0.92), `settleAmt`
gravity, per-ball drag with a random thickness from the `Rng`, gooed hits softer (`goo*0.45`), and beat lock
letting go under the goo. A full tank stays full (no burst: step 2b).

Tests: hits under the goo are quieter and land later than clean ones. Fill rises with hits and stops at full.
**Cost test**: full tank, 1000 ticks, the median of the 20 slowest ≤ 0.25 ms in release (Flah's machine; elsewhere
it only reports). Nothing allocates per tick.

## Notes from ticket 01 (2026-10-28)
- `settleAmt` reads `measuredFill`, which the web updates in the draw every 10 frames (`measureFill`; in 3D: pooled
  drops / (`partCap`*0.92)). Port it as every 10 ticks.
- Gravity's "down" is the camera's: `boxGravity` reads the view matrix `_M`, which `viewTick` turns slowly with the
  tempo (`_phi`, 16 bars to lean in, 16 back; the pointer is 0 with no window). The headless tank runs the same tilt
  clock, or the goo settles somewhere else.

## Notes (2026-10-29)
- `tank/goo.rs`: splash, the song clock (`FILL_BARS` 66, x1.13 in 3D), the lava heart, wake, relax x2, containment,
  the density grid, the fill every 10 ticks. Ball side in `tank/mod.rs`: settle gravity (+ the view's 16-bar lean),
  gooed hits softer (`vel` x(1-goo*0.3), `imp` x(1-goo*0.45)), per-ball thickness from the `Rng`, drag, beat lock lets go.
  One heart, not three (the web computes three and uses one). Colour and ripples are left out (nothing hears them).
- Fill at bar 32: 0.46 on every seed; bar 64: 0.65-0.93 (web 0.85 +- 0.07). It stops at the 1600-drop budget.
- Gooed wall hits are rare: ~3 per 100 bars in the six-wall tank, on the web (dev-vstparity, 100 bars x 5) and here.
  The goo sits in the middle and the notes ring at the walls. So ticket 05's "goo level" parity rests on few hits.
  The softness test uses a triangle (walls nearer the goo) and a fixed velocity: level 0.83, 59 ms off the grid vs 23.
- **Cost: missed.** Full tank (12 balls, 1600 drops), release, Flah's i7-12700H: typical 0.67 ms a tick on a P-core,
  1.1 ms on an E-core; the median of the 20 slowest 1.6 ms or more (OS jitter). The limit is 0.25 ms. 1.0 ms of it is
  the two relax passes (~48k pair checks, ~42k cell looks a tick); a tighter array layout and a small cell hash were
  tried and gained nothing, so the code stays the plain port. `tests/tank_cost.rs` keeps the check, `#[ignore]`d with
  the reason. Next: ticket 07.
- No allocation per tick: proven in `tests/tank_cost.rs` with a counting allocator (step 1 never had one; it lives in
  its own test binary because the core forbids `unsafe`). 40 bars of a filled, playing tank: 0 allocations.
- Tests build at `opt-level 2` (`vst/Cargo.toml`); unoptimized, the goo tests took minutes.
- Sabotaged (each turns a test red): no drag, gooed notes not softer, beat lock ignores the goo, splash adds nothing,
  no song clock, balls feel no goo, no lava squeeze. Not caught: no settle gravity (a whisper, at most 0.09 px a tick;
  only 05's parity might see it).

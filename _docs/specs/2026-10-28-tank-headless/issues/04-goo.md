# 04 The goo (3D) and its cost

Status: ready
Blocked by: 02
Spec: `../spec.md`, ADR 0007, ADR 0008

Port the 3D goo: splashes add particles (`splash`), `fillPhysics` / `gooStep3D` / `gooContain3D` / `gooWake`,
the `_GD` grid with `GOOC`=24, `gooAt3`, the fill measure (pooled particles over `partCap`*0.92), `settleAmt`
gravity, per-ball drag with a random thickness from the `Rng`, gooed hits softer (`goo*0.45`), and beat lock
letting go under the goo. A full tank stays full (no burst: step 2b).

Tests: hits under the goo are quieter and land later than clean ones. Fill rises with hits and stops at full.
**Cost test**: full tank, 1000 ticks, the median of the 20 slowest ≤ 0.25 ms in release (Flah's machine; elsewhere
it only reports). Nothing allocates per tick.

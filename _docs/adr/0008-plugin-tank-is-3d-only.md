# 0008 The plugin ports the 3D tank only

Status: accepted 2026-10-28 (Flah). Spec: `_docs/specs/2026-10-28-tank-headless/spec.md`.

- Studio opens in 3D (ADR 0004), and 3D is a different machine, not a different look: balls have depth, the front
  and back panes play chord tones, and the goo is a 3D grid (`gooAt3`). The 2D tank's goo reads a mask that only
  the drawing code refreshes (`mMask`), which a headless core cannot have.
- So the core ports one tank, the 3D one. Its goo drag keeps a random per-ball thickness, drawn from the seeded RNG
  (ADR 0006), not `Math.random`. This settles the three loose ends of ADR 0007.
- Rules out: a 2D tank in the plugin. Bringing it back means a new ADR plus a headless replacement for `mMask`.

# 12 The box tumbles

Status: done (2026-10-29)
Spec: `../spec.md` (Decisions: test page verdict)

In 3D the view turns the whole box on two axes at once, the way the test page's B did: `_M = Ry(a) * Rx(b)`, `a` one
full turn every 8 bars, `b` at 1/1.618 of that, so a face never comes round the same way twice. By the clock (60 and
120 Hz turn it the same), only while playing. Taps (`screenToBox`) and the goo's gravity (`boxGravity`) read `_M`,
so they follow. Lessons and `prefers-reduced-motion` keep today's still lean. Play and studio both tumble.
`dev-3d` 6b and 8 assert the old lean: they change to the tumble (a full turn in 8 bars, both axes moving, 60 = 120 Hz).
Sabotages: one axis only; turning by frames; tumbling under reduced motion.

## Notes (2026-10-29)
Built as specified (`viewTick`, `TUMBLE_BARS=8`, `_tumble`). dev-3d 6b/8 rewritten; sabotages caught: one axis only,
turning by frames, tumbling under reduced motion. dev-hands 11g held the view still (the tumble carries a planted
seed away within 300 ms; it is planted exactly on the marker, 0.0 px). Targeted runs clean: dev-hands, dev-solid,
dev-portal, dev-space, dev-crayon, dev-fluid, dev-beatlock. dev-3d's depth check failed once in 3 runs (SUITES.md).
Not checked by a machine: how the tumble feels on a phone; the plugin's port (`phi` lean) is now out of date.

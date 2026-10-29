# 04 Real 3D: a test page to compare with today's tank

Status: in-progress
Type: prototype
Blocked by: 01
Spec: `../spec.md` (Decisions: real 3D)

Today the balls bounce off a flat outline plus the two panes, and a solid is a flat slice of itself. The 3D look is
the spin plus a 17-37 degree lean (`viewTick`). Build a throwaway page (`_dev/proto-3d.html`, never shipped): the
same balls fly in all three directions inside a real solid (cube, octahedron, icosahedron), each face its note, the
solid turning on more than one axis, through the app's synth voice. Side by side with today's tank at the same tempo
and key.

Flah compares and decides: keep today's (maybe with more turn), or real 3D. The verdict goes into `../spec.md`. If
real 3D wins, it gets its own spec and ADR, and the plugin's tank copy is redone while it is paused. The page is
deleted either way.

## Notes (2026-10-29)
Correction: in 3D view a solid already runs real 3D physics (`solidSub`: every face a plane, a 3D reflection, its
note). What is not 3D today: the default flat shapes (walls plus two panes that chime chord tones), and the turn
(`rot` spins on one axis; the view only leans 17-37 degrees). So the test page compares those two things.
`_dev/proto-3d.html` (run `python -m http.server 8765` in the repo, open http://127.0.0.1:8765/_dev/proto-3d.html):
two copies of the real app side by side. A is today's. B turns a flat shape N into the solid `prismN` (its front
and back become notes, balls get a real 3D heading) and replaces `viewTick` so the box tumbles on two axes (once
every 4/8/16/32 bars). Taps (`screenToBox`) and the goo's gravity (`boxGravity`) both read `_M`, so they follow.
First look (headless, 80 bpm, hexagon): B plays 7.3 notes a bar with 7 balls and no wall open; it draws cleanly
mid-tumble, icosa too. Waiting on Flah's ears and eyes.

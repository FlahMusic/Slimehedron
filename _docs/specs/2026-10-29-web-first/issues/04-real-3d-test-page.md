# 04 Real 3D: a test page to compare with today's tank

Status: ready
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

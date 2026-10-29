# 13 Ball speed: the middle ground, scaled by the shape's size

Status: ready
Spec: `../spec.md` (Decisions: test page verdict)

Measured at 80 bpm, auto-notes on, 30 s each (3D speed in px a tick / notes a bar): hexagon flat 3.82 / 11.5,
hexagon solid 3.39 / 10.2, cube 3.37 / 16.8, icosa 3.37 / 9.8, tetra 3.33 / 26.2, square 3.76 / 13.6. So at one speed
the shape's size, not the speed, decides how busy it is. Target: 3.6 px a tick in 3D on the hexagon at 80 bpm (the
middle of A and B), scaled by the shape's mean free path (4V/S, Cauchy) against the hexagon's, gently enough that a
small shape never crawls (the rest of the difference is ticket 15's). Still `bpm/80`. Measure again after: speed per
shape and hits per ball a second.

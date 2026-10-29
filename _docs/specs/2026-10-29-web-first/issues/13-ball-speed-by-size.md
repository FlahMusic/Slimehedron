# 13 Ball speed: the middle ground, scaled by the shape's size

Status: done (2026-10-29)
Spec: `../spec.md` (Decisions: test page verdict)

Measured at 80 bpm, auto-notes on, 30 s each (3D speed in px a tick / notes a bar): hexagon flat 3.82 / 11.5,
hexagon solid 3.39 / 10.2, cube 3.37 / 16.8, icosa 3.37 / 9.8, tetra 3.33 / 26.2, square 3.76 / 13.6. So at one speed
the shape's size, not the speed, decides how busy it is. Target: 3.6 px a tick in 3D on the hexagon at 80 bpm (the
middle of A and B), scaled by the shape's mean free path (4V/S, Cauchy) against the hexagon's, gently enough that a
small shape never crawls (the rest of the difference is ticket 15's). Still `bpm/80`. Measure again after: speed per
shape and hits per ball a second.

## Notes (2026-10-29)
`ballSpeed()` = (bpm/80) x 3.6 x `sizeK()`; `sizeK` = sqrt(mean free path / the hexagon's), held to 0.75..1.25, 1 in
lessons and curved space. A flat shape now keeps its 3D speed steady (its drift toward the glass counts). Measured
(dev-3d 10): hexagon flat 3.59, as a solid 3.55, cube 3.06, tetra 2.66 px a tick at 80 bpm; 160 bpm 2.02x.
Sabotages caught: no size factor; the old flat speed (4.16 in 3D); speed not following tempo. Targeted runs clean:
dev-3d, dev-beatlock, dev-hands, dev-solid, dev-space. dev-portal: its colour check now holds the view still (the
tumble moved the holes between finding them and the picture); its [crayon] half is a known flake (SUITES.md).

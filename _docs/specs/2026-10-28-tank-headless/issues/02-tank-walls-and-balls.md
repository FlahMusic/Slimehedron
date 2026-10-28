# 02 Walls, panes and balls

Status: ready
Spec: `../spec.md`

In `slimehedron-core/src/tank/`: a prism with N walls (`buildEdges`), each wall a note in cents. The front and back
panes. Balls with x, y, z and velocity, moved in substeps (`step`: no tunnelling), bounce + `jitter`, the 60 ms
retrigger guard, pane hits (140 ms guard, home-chord tones), steady tempo speed (`ballSpeed`), beat lock
(`beatLock`, `hitTicks`, `gridAhead`) and base spin (`rot`, rebuild keeps the flash). Every random number comes
from the tank's `Rng`. No goo yet (goo density reads 0).

Seam: `Tank::new(settings, seed)`, `tank.tick(clock) -> hits`. Tests red first: a ball fired at a wall hits it
once and reports that wall's cents. Nothing escapes in 10k ticks. Beat lock off spreads the hits off the grid.
Spin moves which wall gets hit. The same seed gives the same hits.

# 02 Walls, panes and balls

Status: done (2026-10-28)
Spec: `../spec.md`

In `slimehedron-core/src/tank/`: a prism with N walls (`buildEdges`), each wall a note in cents. The front and back
panes. Balls with x, y, z and velocity, moved in substeps (`step`: no tunnelling), bounce + `jitter`, the 60 ms
retrigger guard, pane hits (140 ms guard, home-chord tones), steady tempo speed (`ballSpeed`), beat lock
(`beatLock`, `hitTicks`, `gridAhead`) and base spin (`rot`, rebuild keeps the flash). Every random number comes
from the tank's `Rng`. No goo yet (goo density reads 0).

Seam: `Tank::new(settings, seed)`, `tank.tick(clock) -> hits`. Tests red first: a ball fired at a wall hits it
once and reports that wall's cents. Nothing escapes in 10k ticks. Beat lock off spreads the hits off the grid.
Spin moves which wall gets hit. The same seed gives the same hits.

## Notes (2026-10-28)
- Added by Flah's call on walls (spec section 2): `Tank::on_bar()` opens a wall every 8 bars and heals the oldest gap
  every 24; a healing wall fades in at 0.007 a tick and catches balls again above 0.55. Balls that leave through a gap
  and wander 80 px off the canvas are gone.
- Quantize's hold is in the tank too (`qWait`): a hit carries `at_ms` (the ball hit) and `sound_ms` (the next grid
  line if quantize held it, at most 45 ms later), plus `grid_ms` / `hit_grid_ms`, so parity measures what the web
  measures.
- The home chord comes from a port of `chordDegrees` (`music/chord.rs`), checked against the web on 10 scales.
- Same as the web, and not changed: a spinning shape is rebuilt every tick, and the rebuild closes any open wall.
  With the slime on in web studio (spin 14) the walls therefore never stay open. Flagged to Flah, not fixed here.
- Sabotaged (each turns a test red): tick does nothing (7 red), no beat lock, panes off, seed ignored, spin ignored,
  walls never open, tempo ignored, quantize never holds. Not caught, and why: no substeps and no 60 ms retrigger
  guard make no audible difference at these speeds (3.4 px a tick against a 9 px ball); both are kept as ported.

# 02 Walls stay open while the shape spins

Status: done (2026-10-29)
Blocked by: 01
Spec: `../spec.md` (Done means: Walls), brief section 4

`simTick` calls `rebuild()` on every turn step (`index.html`, the `the same walls, turned` loop). `buildEdges` makes
fresh walls (`broken:false`) and `rebuild` empties `_brokenOrder`, so an open wall shuts within a tick. Fix: keep
each wall's `broken` and `reform` across a turn (as `flash` already is), and remap `_brokenOrder` (it holds edge
objects) onto the new walls. A shape change or a reform still starts with every wall shut.

Red first in `dev-hands`: open a wall at spin 14, still open 2 bars later. Sabotage: drop the carry-over.
Flah listens before and after (30 s of each, same seed if possible): the tank gets sparser.

## Notes (2026-10-29)
Done ahead of 01 (Flah asked for the 3D work first, and ticket 15 cannot thin notes while the tank jams). The turn
loop keeps each wall's `broken` / `reform` and remaps `_brokenOrder` onto the new walls. dev-hands 12 (open at spin 14,
still open 2 bars and 86 degrees later; heals on `repairWall`); sabotage (drop the carry-over) caught.
Measured, studio 3D, slime on, spin 14, 16 bars: hexagon 7 balls / 14.4 notes a bar -> 5.6 / 9.4; cube 7 / 17.3 ->
5.5 / 13.1; tetra 7 / 26.9 -> 4.4 / 13.4. Flah: listen to it.

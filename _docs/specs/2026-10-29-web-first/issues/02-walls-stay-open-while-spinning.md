# 02 Walls stay open while the shape spins

Status: ready
Blocked by: 01
Spec: `../spec.md` (Done means: Walls), brief section 4

`simTick` calls `rebuild()` on every turn step (`index.html`, the `the same walls, turned` loop). `buildEdges` makes
fresh walls (`broken:false`) and `rebuild` empties `_brokenOrder`, so an open wall shuts within a tick. Fix: keep
each wall's `broken` and `reform` across a turn (as `flash` already is), and remap `_brokenOrder` (it holds edge
objects) onto the new walls. A shape change or a reform still starts with every wall shut.

Red first in `dev-hands`: open a wall at spin 14, still open 2 bars later. Sabotage: drop the carry-over.
Flah listens before and after (30 s of each, same seed if possible): the tank gets sparser.

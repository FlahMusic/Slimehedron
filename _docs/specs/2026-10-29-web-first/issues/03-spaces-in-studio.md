# 03 Spaces in studio, with the slime on

Status: done (2026-11-02)
Blocked by: 01
Spec: `../spec.md` (Done means: Spaces)

`rollSpace` returns `normal` in every mode but play. Change: on auto, studio rolls like play (1 reform in 3 lands in
portal or curved) while the slime is on, and stays normal while it is off. A shape or space picked by hand (shape
menu, corner menu) is pinned like the key (`_keyPinned`): the reform keeps it.

Check portal and curved both draw and play in 3D (`dev-space` section 3, `dev-portal`). Update `dev-space` 4.,
which asserts the old "studio on auto stays normal". Sabotages: slime off still rolls; a hand pick is swapped at
the reform.

## Notes (2026-11-02)
`rollSpace` now mixes portal / curved into studio while the slime is on (32% of 600 rolled shapes; play's band is
25-42%). A shape picked by hand (the shape menu, the dice, a grow) sets `_shapePinned`: the burst reforms into the same
shape until the slime is switched on again, like the key pin. A space picked by hand already held (`TSPACE.pick`).
The studio corner menu still offers no "auto" space (as before): a hand-picked space there holds until changed.
dev-space 4: four new checks; sabotages caught: studio never mixes, the hand pick ignored, the pin never released.

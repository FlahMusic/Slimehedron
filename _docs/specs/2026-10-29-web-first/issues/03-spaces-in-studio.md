# 03 Spaces in studio, with the slime on

Status: ready
Blocked by: 01
Spec: `../spec.md` (Done means: Spaces)

`rollSpace` returns `normal` in every mode but play. Change: on auto, studio rolls like play (1 reform in 3 lands in
portal or curved) while the slime is on, and stays normal while it is off. A shape or space picked by hand (shape
menu, corner menu) is pinned like the key (`_keyPinned`): the reform keeps it.

Check portal and curved both draw and play in 3D (`dev-space` section 3, `dev-portal`). Update `dev-space` 4.,
which asserts the old "studio on auto stays normal". Sabotages: slime off still rolls; a hand pick is swapped at
the reform.

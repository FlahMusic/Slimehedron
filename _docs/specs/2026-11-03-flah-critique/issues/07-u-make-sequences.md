# 07 u_make: each step plays its own picked note, in time

Status: ready
Spec: `../spec.md`, brief 3.1

Today it plays the first note (or all of them on step 1) and only drums after. Fix: each step plays the note the kid
picked for it, on its step, on loop. Test: render the loop and check the pitch at every step against the picks, and
the timing against the grid. Sabotages: all notes on step 1; the picks ignored.

# 07 u_make: each step plays its own picked note, in time

Status: done (2026-11-05)
Spec: `../spec.md`, brief 3.1

Today it plays the first note (or all of them on step 1) and only drums after. Fix: each step plays the note the kid
picked for it, on its step, on loop. Test: render the loop and check the pitch at every step against the picks, and
the timing against the grid. Sabotages: all notes on step 1; the picks ignored.

Done: playSynth takes a start time (at); the loop schedules each pick at its step. Before, every note of a bar
sounded at the bar's start (the drums had times, the notes did not). dev-learn3 07: three picks, two loops, each
scheduled on its step at its pitch (worst error under 2 ms) and an oscillator starts there.
Not checked by a machine: how it feels to play.

Sabotage caught (dev-learn3 07): the notes without their start time (0 of 3 picks scheduled on a step).

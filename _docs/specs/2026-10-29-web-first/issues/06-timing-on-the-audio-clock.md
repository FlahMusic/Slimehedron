# 06 Timing: everything on the audio clock, hidden tabs, MIDI clock

Status: ready
Blocked by: 01
Spec: `../spec.md` (Done means: Timing)

Move every musical `setTimeout` that 01 lists (the little reward chords, `i*90` / `70*i`) onto
`AudioContext.currentTime`. New suite `dev-hidden`: 10 minutes hidden with Chrome's Efficiency mode on, the band and
MIDI out stay within 5 ms of the grid, no burst on return. MIDI clock out: tick spacing standard deviation under
1 ms on a virtual port.

Sabotage: one reward chord back on `setTimeout`.

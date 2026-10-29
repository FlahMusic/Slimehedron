# 03 Auto-notes: the motif melody

Status: done (2026-10-29)
Blocked by: 02
Spec: `../spec.md`

Port `nextMelodyDeg`, `noDrone`, `setDeg`, `clampDeg`, the motif memory and `autoMelodyNote` (the lean toward the
chosen wall, the gentle speed, the spawn just off-centre, `zInit`). One roll per beat on the DAW clock: 60% on strong
beats and 22% on weak ones, only while there are fewer than 7 balls, and skipped at `MAXBALLS`. The chord stays on
the home chord (spec section 2).

Tests: 1000 melody steps stay inside the range. The answer phrase ends on the tonic and the question on the 5th.
No note repeats 3 times in a row (the drone guard). The spawn rate per bar matches the roll odds within 3 sd.

## Notes (2026-10-29)
- `tank/melody.rs` is the web's melody note for note: `_dev/dev-vstmelody.js` runs the web's own `setDeg`/`noDrone`/
  `nextMelodyDeg` on a recorded random stream (6000 notes, major and pentatonic, two roots) into `melody_golden.txt`,
  and the Rust test replays it. Rerun the script after any change to the web melody.
- The ticket's "the answer ends on the tonic" is a pull, not a rule, in the web too: the last note lands on its target
  58% of the time and within a step 87% (the same degree turns up 15% / 6% elsewhere). The test holds those numbers.
- Tank side: `TankSettings::auto_notes` (on by default, the spec's start state). One roll a beat on the clock, 60% / 22%,
  only under 7 balls (500 seeds, within 3 sd). Every floated note rang its picked wall or a neighbour (214/214; a blind
  throw: about half).
- Sabotaged (each turns a test red): no lean, always roll, no 7-ball gate, auto-notes off, no drone guard, no cadence.

# 03 Auto-notes: the motif melody

Status: ready
Blocked by: 02
Spec: `../spec.md`

Port `nextMelodyDeg`, `noDrone`, `setDeg`, `clampDeg`, the motif memory and `autoMelodyNote` (the lean toward the
chosen wall, the gentle speed, the spawn just off-centre, `zInit`). One roll per beat on the DAW clock: 60% on strong
beats and 22% on weak ones, only while there are fewer than 7 balls, and skipped at `MAXBALLS`. The chord stays on
the home chord (spec section 2).

Tests: 1000 melody steps stay inside the range. The answer phrase ends on the tonic and the question on the 5th.
No note repeats 3 times in a row (the drone guard). The spawn rate per bar matches the roll odds within 3 sd.

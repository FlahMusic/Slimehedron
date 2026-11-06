# 09 Rhythm lessons as a drum grid, ear first

Status: done (2026-11-05)
Spec: `../spec.md`, brief 3.4

Replace the "boom tap" words with a step grid like studio's drum sequencer: kick purple, snare red, hi-hat yellow.
Each round: count in 4-3-2-1 (seen and heard), the pattern plays, the kid places what they heard, NEXT checks.
Right: "Good job!". Wrong: the lane with the mistake turns lilac, "Close, listen and try again!". No pattern twice in a
row; patterns vary and get a bit harder. Checks: right, wrong (lilac lane), skip and back; 20 rounds with no
back-to-back repeat; a count-in before each pattern; colours match the table.

Done: Copy the Beat (id sayplay kept for saved progress, ADR 0013). Rows kick / snare / hi-hat in purple / red /
yellow, one box per beat, boxes 64x52 on a 390 px phone. Listen: 4 clicks and 4 3 2 1, the beat, the playhead on
the column. Check: wrong rows go lilac with "Close, listen and try again!" and the hits stay; right: "Good job!".
Five rounds (Flah 2026-11-05): two with kick and snare, two with the hi-hat, then two drums on one beat; never the
same beat twice in a row (20 rounds checked; 640 different beats in 3000 draws). Studio's step grid and the drum
jam use the same colours. dev-learn3 09: sabotage caught: no lilac on a wrong answer. dev-curriculum 7 rewritten
(it asserted the BOOM/TAP syllables), dev-lessons drives the grid.
Not checked by a machine: whether a 5-year-old reads the grid without help.

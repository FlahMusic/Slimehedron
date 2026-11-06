# The logic pass: where each unit stands (critique ticket 14, 2026-11-05)

Rules: brief section 4 (1 does the thing, 2 hear first, 3 explain once, 4 nothing over a judged sound, 5 no same round
twice running, 6 grid + playhead + count-in, 7 one drum colour code, 8 every button leads somewhere, 9 copy,
10 proof). The audit with line numbers is `units-audit.md`; this file is what was done about it.

## Done for every unit at once
- No voice anywhere (06). Words on screen; the finish line names the concept and, where there is one, the DAW
  element (15, `ui-words.md`).
- Listen first (06): every round judged by ear (20 units) waits for "listen"; answers wait for it; the read units
  (countbar, rest, song, split) start on "listen".
- One feedback pair (rule 2): "Good job!" / "Close, listen and try again!".
- No same round twice running (rule 5, `freshPick`): with 3+ answers never the last one; with two, never three in a
  row. In howlong, every ladder unit, every choice unit, the read units and the staff.
- Back acts on the press (13), so a screen redrawn under a finger cannot swallow it.

## Per unit
| Unit | Done | Still open |
|---|---|---|
| pulse | 4 3 2 1 count-in on the balls (heard as clicks, not judged); a miss no longer resets the count (that was a streak) | grid under the lane |
| make | each pick plays on its step (07) | move to the end of the rhythm block: needs Flah's yes + ADR (it sits at #2 on purpose, retention data) |
| sayplay | rebuilt as Copy the Beat, the drum grid (08, 09, ADR 0013) | |
| howlong | listen first, a lead-in, the note alone (10) | |
| countbar, rest, split | lead-in, 4/4 step grid with a bouncing ball (11) | judge extra taps (a tap on a "small" count is still free) |
| song | same engine as countbar | merge into countbar/rest as their last round (audit) |
| tempo | same number of notes both ways, speed varies per round, a different tune | |
| dynamic | the tune varies per round | |
| rjam | kick / snare / hi-hat pads in the drum colours, a click as the pulse | draw the call on a grid |
| high, notes, home, steps, newhome, majorscale, brightdark, intervals, chords, minorscale, minorshapes, modes | listen first, no repeats | merges: updown into high, findhome into home, intervals into chords; steps as a step/skip choice; minorshapes and modes are cut candidates if a playtest shows kids cannot hear them (Flah's call) |
| staff | listen first, no repeats | the target note is drawn, so "tap the note you hear" is answered by sight; flip it to "see the note, press its key" |
| melody, compose | no change needed for 06-13 | compose: save kept tunes for review |
| echo, updown, findhome | listen first | |
| review | lists every finished unit (today too, under 80% too), with what it taught (12) | kept loops and tunes to replay |

Proof: `dev-learn3` 06-13 and 15, each sabotaged where it says so in its ticket.

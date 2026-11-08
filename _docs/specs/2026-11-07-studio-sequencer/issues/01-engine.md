# 01 Engine: rows, direction, rate, scale lock, notes, MIDI

Status: done (2026-11-07)
Spec: `../spec.md` decisions 3-7, 10-11

Two rows of 8 steps (on, degree 0..14, velocity, drum pick) on the conductor clock (drumSchedule -> seqTick).
Rows A / A->B / A|B; forward / reverse / bounce / random; 1/16, 1/8, 1/4. Pitches are scale degrees (7 = the key
note), so a key or scale change carries the pattern. Notes go through playSynth (with its new start time) on the
melody track and MIDI channel. Found on the way: resume after a pause fired every missed conductor step at once
(~30 drum hits in the past); the conductor re-anchors now (control on the previous commit: the same burst).
Proof: dev-seq 1, 1b, 2, 7. Sabotages caught: bounce repeating its ends, scale lock lost, resume burst.

# 11 Count to four: a lead-in and a bouncing playhead on a 4/4 grid

Status: done (2026-11-05)
Spec: `../spec.md`, brief 3.6

A lead-in before counting starts; a visible playhead bounces along one bar of 4/4 (four beats, the steps inside them),
the same grid look as studio, so it works with the sound low and makes sense later in a DAW. Check: the playhead is on
the right beat at each beat time (screenshot / DOM), and the lead-in comes first.

Done in the shared read engine (countbar, rest, split, and the song as countbar's part 2): it starts on "listen",
every bar has a lead-in bar (four clicks, 4 3 2 1), and a 4/4 step grid under the notation (four steps a beat, like
studio's) with a ball hopping beat to beat (still under prefers-reduced-motion). dev-learn3 11: the ball is on the
right beat at every look (x within 2% of the beat). Sabotage caught: no lead-in.
Still open: a tap on a small count is still free (logic-pass.md).

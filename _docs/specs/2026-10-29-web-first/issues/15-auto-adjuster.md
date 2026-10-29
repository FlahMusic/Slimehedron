# 15 The auto adjuster: each shape its own note speed

Status: ready
Blocked by: 13
Spec: `../spec.md` (Decisions: each shape is 64 bars)

With auto-notes on, each shape gets a target notes a bar from its size: the hexagon's (measured after 02 and 13),
bigger shapes up to +25%, smaller down to -25%. A controller reads notes a bar over the last 4 bars and nudges the
auto-notes' odds (and the ball cap) toward the target; a change starts on a 4-bar phrase line and glides in over
4 bars, so a new shape never lurches. Everything counts bars, so tempo never changes it. The swell (14) lands the
burst on bar 64 whatever the notes do. Proof: notes a bar per shape over 5 seeds inside its band, burst bar per shape
at 60, 90 and 140 bpm, no jump in notes a bar across a reform.

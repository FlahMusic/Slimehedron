# 15 The auto adjuster: each shape its own note speed

Status: done (2026-11-02)
Blocked by: 13
Spec: `../spec.md` (Decisions: each shape is 64 bars)

With auto-notes on, each shape gets a target notes a bar from its size: the hexagon's (measured after 02 and 13),
bigger shapes up to +25%, smaller down to -25%. A controller reads notes a bar over the last 4 bars and nudges the
auto-notes' odds (and the ball cap) toward the target; a change starts on a 4-bar phrase line and glides in over
4 bars, so a new shape never lurches. Everything counts bars, so tempo never changes it. The swell (14) lands the
burst on bar 64 whatever the notes do. Proof: notes a bar per shape over 5 seeds inside its band, burst bar per shape
at 60, 90 and 140 bpm, no jump in notes a bar across a reform.

## Notes (2026-11-02)
Built as THE AUTO ADJUSTER (index.html, before `autoMelodyNote`). What it took, all measured with `dev-autoadjust`
(seeded, two seeds per case, notes a bar over bars 24-48 against the aim):
- The aim: 8 notes a bar on the hexagon, times cbrt(volume / the hexagon's), held to 6..10.
- The knob sets the ROOM (balls allowed in the tank, dithered beat by beat so 1.5 means 1 and 2 by turns), not the
  odds: scaling the odds alone could not thin a tank whose balls never leave (an icosahedron held 7 at the lowest knob).
- Over the room, the oldest of the melody's own balls goes quiet and MELTS into the slime (shrinks away in ~0.6 s, its
  goo sprays into the tank). Sending it out through a gap was tried and failed: in a solid it rarely found the gap,
  and balls piled up to MAXBALLS. Hand-dropped balls and seeds never melt.
- Balls flying off through an open wall no longer count as in the tank (`ballIn`): they made no notes but blocked new
  ones for ~3 s, so the tank fell quiet after every wall opened (bar-by-bar: 3-4 "in" it, 0-3 notes a bar).
- With auto-notes on, one gap at a time, and none in shapes of under 6 walls (a third of a hexagon's rim, or a
  tetrahedron's face, open lost most new notes straight out of it).
- It reads each ball's notes a bar over the last 8 bars, sets the room every 4-bar phrase, glides there over 4 bars,
  and trims slowly for what that misses. A new shape starts from what its physics predicts (ballSpeed x ticks a bar /
  mean free path 4V/S), so its first bars are already near the aim (the tetrahedron opened at 17 a bar before).
Result: hexagon 8.9/8.8 (aim 8), cube 6.3/6.5 (6), tetra 7.1/6.5 (6), icosa 7.7/7.5 (7.1), hexagon at 140 bpm 8.1/7.9.
Not checked by a machine: how a ball melting into the slime looks and sounds; whether the per-shape pace feels right.

# 02 One chord-colour table: key = hue, chord type = shade

Status: ready
Spec: `../spec.md` (Done means: Play), brief 1.2; Flah 2026-11-04: same in play and studio

Find what paints the droplets grey and every place that computes "the chord colour" (droplets, beads, goo, chord chip).
One table: the key's pitch class sets the hue, the chord type sets the shade (major, minor, 7th, add9, dim, ...). Every
user of it reads the same function. A droplet, bead or goo colour never falls below a saturation floor (measure what
grey is first). `dev-play` + `dev-goo3d` checks; sabotages: a droplet left grey; two chords of different type in one
key get the same colour.

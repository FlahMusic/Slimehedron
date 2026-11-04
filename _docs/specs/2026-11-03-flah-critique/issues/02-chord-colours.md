# 02 One chord-colour table: key = hue, chord type = shade

Status: done (2026-11-04)
Spec: `../spec.md` (Done means: Play), brief 1.2; Flah 2026-11-04: same in play and studio

Find what paints the droplets grey and every place that computes "the chord colour" (droplets, beads, goo, chord chip).
One table: the key's pitch class sets the hue, the chord type sets the shade (major, minor, 7th, add9, dim, ...). Every
user of it reads the same function. A droplet, bead or goo colour never falls below a saturation floor (measure what
grey is first). `dev-play` + `dev-goo3d` checks; sabotages: a droplet left grey; two chords of different type in one
key get the same colour.

## Notes (2026-11-04)
THE CHORD COLOUR (index.html): the chord's root picks the hue, round the circle of fifths (auroraHue), and its type picks
the shade (`CHORD_SHADE`: major, minor, 7, maj7, add9, m7, dim, aug, sus); saturation never under 0.45. `chordHSL` /
`chordRGB` / `chordCss` read it; the slime (`liquidColor`), every droplet (tank3d), the beads and the chord bar use it.
Measured first: the per-chord colours were never the grey (the old averaged colours: 0.39 chroma at worst, the table
now 0.40). The grey was the slime FADING between chords in red-green-blue: the halfway point of two far hues is grey
(0.22 chroma live). It now fades round the wheel (`hslMix`): 0.59 at worst over 32 bars, band on and off.
dev-play 5 (chroma, not HSL saturation, which calls a pale wash colourful); sabotages caught: the old straight fade
(0.22), minor shaded like major (two types in one key 0 apart). dev-look3d, dev-gl, dev-goo3d, dev-controls clean.
Not checked by a machine: whether the shades read as "the chord's feel" to a kid.

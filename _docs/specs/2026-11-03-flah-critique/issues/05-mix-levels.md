# 05 The level pass: drums never drown the melody, chords or bass

Status: done (2026-11-05)
Blocked by: research `_docs/research/2026-11-04-mix-levels.md`
Spec: `../spec.md` (Done means: Mix), brief 2.4

Targets from the research (cited). Measure every kit (11) piece by piece and every part (melody, chords, bass) from the
app's own render, the same way (short-term loudness and peak). Fix each kit's piece levels to the targets. New
`dev-mix`: renders each kit with the band and fails when a drum piece beats its margin under the melody.
Sabotages: the old bossa clave level; the jazz ride back. Snares the measurement flags get ticket 04's treatment.

Done: dev-mix (new). Each part alone at the real output, K-weighted, 4 whole bars at 120 bpm with a fill forced in.
Before: drums 2-10 LU ABOVE the melody (industrial +10, rock +9), band +0.2. After (final run, all 11 kits pass): drums
10-15 LU under, every piece 10+ under (soft kits 13+), every loudest 100 ms 3+ under the melody's median (aimed at 5:
it moves +-1.5 LU run to run with the fills and the human feel), bass 8 under, chords 13.5 under, melody 3.5-6 LU over
the whole band. How: KIT_DB is each kit's fader AFTER the drum glue compressor (a cut before it came out a third as
big); PIECE_DB per hit, mostly the kick (the loudest piece in 10 kits of 11) and the fills' toms and congas; BASS_DB -7.5.
Sabotages caught: SAB=clave (the old 0.34: bossa clave -11.3, over the -13 line), SAB=ride (24 ride hits),
SAB=rock (rock trim off: drums +5.1 LU over the melody). Not checked by a machine: how it sounds; the whole app is
quieter now that the drums are down (Flah listens once).

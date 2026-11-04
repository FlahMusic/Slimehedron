# Flah's critique: play mode, the mix, learn mode

Status: ready
Brief (Flah's words, the 10 rules): `brief.md`. Grilled 2026-11-04. Top priority on the web side.
Keep Flah posted in plain words after each ticket.

## 1. Ask
"that whole part is half-assed. Fix it and make it better." (Flah on learn mode, 2026-11-03), plus the play-mode and
mix notes in `brief.md` sections 1-3.

## 2. Decisions
- Play: the slime is on by default, auto-notes off; a bubble "tap to play notes and spin the shapes" that, after the
  first tap, moves just under the tank and stays as the auto-notes toggle.
- Chord colour: key = hue, chord type = shade, one table for droplets, goo and every "chord colour", in play and studio.
  A droplet is never grey.
- Play picks 7ths and add9 too; no "drone" in play (drone scales and specialist options move to an Advanced section
  in studio).
- Jazz kit: hi-hat instead of the ride. Snare lower and stick-like on jazz, plus any kit the mix measurement flags.
  Bossa clave down. Every kit to measured levels (research: `_docs/research/2026-11-04-mix-levels.md`).
- The voice (speechSynthesis) is removed: words on screen, a "listen" button for every sound to be judged.
- Learn units may be merged or cut; `units-audit.md` and this spec say which and why. The Orff order stays.

## 3. Done means
- Play: a fresh visit to play has the slime on and auto-notes off; the bubble shows, and after one tap sits under
  the tank and toggles auto-notes. No droplet, goo or chord colour is ever grey (saturation above a floor), and the
  colour follows the key and chord type.
- Play's chord brain picks 7ths and add9s (counted over many bars); no chord label in play says "drone".
- Mix: for all 11 kits, rendered with the band, every drum piece's loudness stays at least the research-backed margin
  under the melody (numbers in ticket 05); the jazz kit has no ride; the bossa clave meets the margin.
- Learn: u_make plays each step's picked pitch at its step, in time, on loop (rendered and checked). No unit speaks.
  No unit plays anything over a sound the kid must judge. Rhythm units use the drum grid with a count-in and a
  playhead. u_review lists what was learned and replays it. Back from every unit lands on the learn map, loaded.
- Every unit (after merges/cuts) passes a three-way playthrough: right answers, wrong answers, skip and back.

## 4. Proof
- `dev-play` (new): play defaults, bubble -> toggle, colours never grey, chord types in play.
- `dev-mix` (new): per kit, per piece loudness against the melody from the app's own render; sabotaged with the old
  clave level and the jazz ride.
- `dev-learn3` (new): the three-way playthrough per unit, plus u_make's rendered sequence, plus back-to-map from every
  unit; real-renderer screenshots where the look matters.
- Existing suites that assert the old behaviour get updated in the same ticket (grep `_dev/` for auto-notes in play,
  the tap invite, speechSynthesis, the boom-tap units, the jazz ride).

## 5. Changes old behaviour
Glossary ("auto-notes: off in play", "tap invite"), suites on the tap invite and play defaults, any suite that
expects speech, the boom-tap units' suites, and kit tests that expect the jazz ride. Each ticket lists its own.

## 6. Tickets
`issues/01`...`14`. Order: 01-03 play, 04-05 drums and mix, 06 voice, 07-13 the named learn breakages, 14 the logic
pass on every unit (after the audit lands).

## 7. Not checked by a machine
How the new snare and the levels sound (Flah listens once); whether the bubble copy reads right to a kid; whether the
rebuilt lessons feel good to play (Flah's one playthrough).

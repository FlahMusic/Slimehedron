# Third-party attributions — Slimehedron

Slimehedron is © 2026 FlahMusic (Flah), licensed AGPL-3.0-or-later (see `LICENSE` / `NOTICE`).
The following third-party material informed or is included in this project.

---

## Drum / bass / comp rhythm patterns

The five play-mode rhythms (**pop, rock, disco, bossa nova, jazz**) and the pattern
data in `patterns/generated/patterns-generated.js` were derived from open-source MIDI.
Nothing is loaded at runtime — the MIDI was read once, offline, by
`patterns/tools/midi2patterns.py`, and only the resulting step positions ship.

### casio-music-data — Nicholas Opuni
* https://github.com/nicholasopuni31/casio-music-data
* Used for: the pop / rock / disco / bossa / jazz rhythm skeletons, plus 116 drum,
  120 bass and 115 comp loops under `patterns/`.
* License: **no formal license file.** The repository README states:
  *"Feel free to use some of these MIDIs with and for your music, games, and other
  forms of entertainment. But be sure to, when using these MIDIs by editing them,
  give credit when credit is due!"* — this file is that credit.
* These are the author's own MIDI remakes of rhythms from Casio LK/CTK-family
  keyboards. Slimehedron uses extracted step positions, not the MIDI files.

### muted.io drum patterns
* https://muted.io/drum-patterns/
* Used for: 16 reference grooves (rock, funk, jazz swing, bossa nova, samba,
  reggae, disco, blues shuffle, breakbeat, trap and others) under
  `patterns/drums/muted-io/`.
* License: **none stated** on the page or in the site's terms. The patterns
  themselves are standard textbook grooves. Credited here in good faith.

### free-midi-chords — Ludovic Drolez
* https://github.com/ldrolez/free-midi-chords
* Used for: the chord and progression reference set under
  `patterns/chords/free-midi-chords/`.
* License: **MIT** — see `patterns/chords/free-midi-chords/LICENSE-MIT.txt`.

### Omni-84 — Benjamin Dehli
* https://github.com/benjamindehli/Omni-84
* License: **GPL-3.0**. Consulted only, as reference reading for omnichord-style
  auto-strum behaviour. **No Omni-84 code, preset data or samples are included in
  Slimehedron.** (GPL-3.0 and AGPL-3.0 are explicitly compatible under GPLv3 §13,
  so including it would have been permitted — we simply didn't need to.)

### open-lofi — Bilal Tahir
* https://github.com/btahir/open-lofi — CC0-1.0. Evaluated, not used: it is
  rendered audio, not MIDI.

---

## Icons
Play / pause / stop icons on muted.io are Feather Icons (MIT) — noted only because
they appear in that source page, not used here.

---

*Corrections welcome. If you are a rights holder listed above and want an entry
changed or removed, open an issue.*

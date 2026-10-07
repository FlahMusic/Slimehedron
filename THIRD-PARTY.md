# Third-party attributions — Slimehedron

Slimehedron is © 2026 FlahMusic (Flah), licensed **GPL-3.0-or-later** (see `LICENSE` / `NOTICE`).

This file lists only what **actually ships in this repository**. Nothing else is included.

---

## Rhythm pattern data

The five play-mode rhythms and the drum patterns in `index.html` are **step positions** —
arrays of integers naming which 16th-notes a kick, snare or hat lands on, e.g.:

```js
disco:{K:rep([0,4,8,12],4), s:rep([4,12],4), h:rep([0,1,2,4,5,6,8,9,10,12,13,14],4)}
```

That is four-on-the-floor with a backbeat on 2 and 4 — a textbook groove. No audio, no MIDI
files, and no sample data ship with Slimehedron; every sound is synthesized live in the
browser with Web Audio oscillators and noise.

Those step positions were derived offline, on the developer's own machine, by reading
open-source MIDI. The MIDI itself is **not** part of this repository and is not redistributed.
Credit to the sources that informed them:

* **casio-music-data** — Nicholas Opuni · https://github.com/nicholasopuni31/casio-music-data
  The repository has no license file; its README states *"Feel free to use some of these MIDIs
  with and for your music, games, and other forms of entertainment. But be sure to, when using
  these MIDIs by editing them, give credit when credit is due!"* — this entry is that credit.
* **muted.io drum patterns** — https://muted.io/drum-patterns/ · no license stated; the patterns
  consulted are standard textbook grooves. Credited here in good faith.

Casio® is a registered trademark of Casio Computer Co., Ltd. Slimehedron is not affiliated
with, sponsored by, or endorsed by Casio.

---

## Typeface

**Quicksand** — Andrew Paglinawan · https://fonts.google.com/specimen/Quicksand
Licensed under the **SIL Open Font License 1.1**, which expressly permits redistribution and
embedding. Shipped inline in `index.html` as a base64 woff2 (variable, weights 400–700), so
Slimehedron makes **zero external network requests** — no CDN, no IP leak, and it still works
on locked-down school networks.

---

## Artwork

Mascot, background and slime artwork are generated with Midjourney under a paid membership.

---

## The band generator (chords, bass, drum fills)

Added 2026-10-06. The backing band's chord rhythms, basslines and drum fills are **generated at
runtime from rules**, not played back from anybody's pattern files. The rules live in the `FEELS`
table in `index.html` and encode ordinary, documented genre conventions — the kind of thing stated
in any method book or free online lesson:

- bossa nova chord hits on 1, the & of 2 and 4 (and &1, 3, 4 in the second bar), bass root on 1 and
  fifth on 3 — *tunableapp.com, "Bossa Nova Rhythm"*
- jazz comping: the Charleston (1 + &2), its reverse (&1 + 3), Freddie Green four-to-the-bar, the
  Red Garland &2 + &4, and chord anticipation on the & of 4 — *jazz-library.com, "Jazz Comping"*
- disco four-on-the-floor with off-beat open hats — *MusicRadar, "How to program a typical disco
  drum beat"*
- disco bass alternating octaves on eighth notes — *UJAM, "The Ultimate Guide to Nu Disco"*
- drum fills at the end of 8- or 16-bar phrases — *MusicRadar, "Learn how drum fills work"*

**No third-party MIDI, audio or notation was copied, converted or embedded for this.** A rhythmic
convention is a fact about a style, not a protected work; the cited pages are where those facts
were checked, not sources any material was taken from. Nothing here requires attribution — it is
listed for transparency.

The older rule still stands and is unchanged: no `.mid` file is ever shipped to or parsed by the
browser.

---

*Corrections welcome. If you are a rights holder listed above and want an entry changed or
removed, open an issue.*

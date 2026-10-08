# patterns/ — open-source MIDI pattern collection for the slimehedron band

> **THE RAW .MID FILES ARE NOT IN THIS REPO ANY MORE.**
> All 3,469 of them moved to `../../plinky-assets/midi-source/` on 2026-10-08, same folder
> structure. They were only ever offline source: the band reads hardcoded JS step arrays in
> `index.html` and has never opened a MIDI file at runtime (see the table below). Keeping 3,469
> third-party .mid in the repo meant redistributing them from a children's site for no reason.
> What stayed here: this README, `MANIFEST.csv`, `tools/` (the extraction scripts),
> `generated/patterns-generated.js`, and every per-source `LICENSE` / `README-source.md`
> so the licence trail is still complete. To re-extract, point `tools/midi2patterns.py` at
> `../../plinky-assets/midi-source/`.

Pulled 2026-09-02. Rollback backup of everything that existed before this:
`backups/originals-20260902-155143/` (478 original .mid + index.html + learn.js + PATTERNS-BACKUP-v64.js).

---

## how the band generator actually works (the answer to "does it use MIDI?")

**No. It never touches a MIDI file at runtime.** The whole band is a step sequencer
over hardcoded JS arrays in `index.html`. One clock (`drumSchedule()`, ~line 1640)
drives drums, bass, comp and pads off the same 16th grid.

| const | line | shape | what it is |
|---|---|---|---|
| `KITS` | 1131 | `{K:[steps], s:[], h:[], r:[], c:[], C:[]}` | drum hits as 16th-step indices, 64 steps = 4 bars. 10 kits. |
| `KITVOICE` | 1112 | `{lo:'K', mid:'s', hi:'h'}` | which voice plays which role per kit |
| `KITTONE` | — | synthesis params | 909/808/acoustic/brush voicing, not rhythm |
| `PATTERNS` | 1103 | `{lo:[], mid:[], hi:[]}` | odd-meter skeletons (3/4, 6/8, 5/4, 7/8, 9/8) |
| `BASSGROOVES` / `KITBASS` | 1432/1434 | `{step: token}` | bass as **degree tokens**, not pitches: `R` root · `T` third · `F` fifth · `O` octave · `A` stepwise lead-in |
| `BASSPAT` | 1428 | `{step: token}` | bass for the odd meters |
| `COMP_RHY` | 1478 | `[step, step, …]` | comp stab positions, rotated per bar |
| `GROOVES` | 1133 | `{off:[16], vel:[16]}` | micro-timing + velocity "feel" (already baked from a MIDI groove pack) |

The bass being **degree-relative** is the important bit — it's why the bassline
follows `keyJourney()` around the circle of fifths without ever needing transposition.
Any imported bassline has to be converted to those tokens, not to pitches.

## so yes — MIDI can be baked straight into the code, no files shipped

`tools/midi2patterns.py` reads the MIDI **once, offline**, and emits
`generated/patterns-generated.js` in exactly the shapes above. Nothing but a few
KB of integer arrays reaches the browser. Zero runtime parser, zero fetch, zero
bundle cost beyond the numbers.

```
python3 tools/midi2patterns.py > generated/patterns-generated.js
```

Current output: **137 drum kits · 116 bass grooves · 115 comp rhythms**, ~64 KB.

Conversion rules it applies:

* **drums** — GM percussion note → plinky voice (35/36→`K`, 38/40→`s`, hats+cymbals→`h`,
  side-stick/clap/claves→`r`, low toms/congas→`c`, high toms/congas/cowbell→`C`),
  quantized to 16ths, then it picks the **modal bar** (the shape that repeats most)
  so you get the groove and not the demo's intro / fill / ending.
* **bass** — channel 10, per-bar root = that bar's lowest note, then each onset
  becomes `R`/`T`/`F`/`O`/`A` by interval. Beat 1 is forced to `R` so switching
  grooves never jumps.
* **comp** — first melodic channel, modal bar, onsets → step list.
* **grid** — casio files read at tpb/4. muted.io files are notated at double speed
  (their 16-step grid is 8th notes over 2 bars), so those read at tpb/8. Verified
  against muted.io's own on-page step data: the extraction reproduces it exactly.

Spot check — the output is musically right, not mush:

```
01_basic_rock_beat   K[0,8]      s[4,12]  h[0,2,4,6,8,10,12,14]   ← textbook
bossa_nova_1 (casio) K[0,6,8,14] r[0,6]   h[8ths]                 ← real bossa surdo + clave rim
disco_1     (casio)  K[0,4,8,12] r[4,12]  C[2,6,10,14]            ← 4-on-floor + clap + off-beat perc
swing       (casio)  K[0,7,8]    h[0,4,7,8,12,15]                 ← swung ride
```

**Nothing in `index.html` has been changed.** Wiring is a one-liner when you want it:
`Object.assign(KITS, MIDI_KITS)` + the same for `KITBASS`/`COMP_RHY`, plus kit names
in the picker. Say the word and I'll do it and run `dev-loadtest.js`.

`tools/split_casio.py` does the other half: splits each casio multi-track demo into
clean single-role 4-bar MIDI loops, so you also have plain drum and bass .mid files
to drop into a DAW.

---

## folders

```
patterns/
  casio-rhythms/        126 full multi-track casio rhythms (drums+bass+comp+melody)
    other-rhythms/        6 extras
  drums/
    casio/              116 drum-only 4-bar loops split out of the above
    muted-io/            16 rock/funk/jazz/bossa/samba/reggae/trap grooves
  bass/
    casio/              120 bass-only 4-bar loops, by style
  chords/
    free-midi-chords/  2976 MIT chord + progression files (C/Am, F/Dm, G/Em keys;
                            triads, 7ths/9ths, and progressions incl. pop / pop2 /
                            soul / hiphop2 rhythmic variants)
    casio-comp/         115 chord-comp 4-bar loops, by style
    omni-84/              6 DecentSampler presets — REFERENCE ONLY, see license flag
  generated/
    patterns-generated.js   the baked JS arrays
  tools/
    midi2patterns.py    MIDI -> plinky step arrays
    split_casio.py      multi-track -> per-role loops
    make_manifest.py    rebuilds MANIFEST.csv
  MANIFEST.csv          3475 rows: filename | source | license | style | flag | notes
```

---

## license audit

| source | license | verdict |
|---|---|---|
| **ldrolez/free-midi-chords** | **MIT** (LICENSE in repo + README: "All the MIDI files are licensed under the MIT license") | ✅ clean. use freely. |
| **nicholasopuni31/casio-music-data** | **none** | ⚠️ no LICENSE file. README says *"Feel free to use some of these MIDIs with and for your music, games, and other forms of entertainment… give credit when credit is due!"* — a stated grant from the author, but not a formal license. These are also the author's **remakes** of Casio keyboard rhythms, so the underlying arrangements trace back to Casio. Risk is low for step-data extraction (rhythm patterns aren't copyrightable the way a melody is), higher for shipping the .mid files verbatim. **Recommend: ship the extracted step arrays, credit the repo, don't redistribute the .mid.** |
| **muted.io** | **none** | ⚠️ no license on the page, and the linked ToS (termsfeed) has no IP or content-reuse clause at all — only a feedback-assignment clause. The 16 patterns themselves are generic textbook grooves (basic rock, bossa, samba) which aren't protectable as such. **Recommend: same — use the extracted steps, credit the site, don't redistribute the .mid.** |
| **benjamindehli/Omni-84** | **GPL-3.0** | 🚫 **copyleft.** Do NOT copy its preset data or code into plinky — GPL-3.0 would reach your whole file. Its "AutoStrum" isn't a pattern library anyway: it's a `StrumSpeed` float (1–30) driving an LFO rate over per-chord samples. The *technique* — retrigger the chord and stagger adjacent chord tones by a few ms — is reimplementable from scratch, and that's fine. The 6 files here are kept as reading material only. |
| **btahir/open-lofi** | CC0-1.0 | ⏭️ **skipped, deliberately.** Not MIDI at all — 166 Suno-generated mp3 tracks, 554 MB, no stems. You'd need source separation to get anything, and what you'd get is rendered audio, not patterns. CC0 so it's free if you ever want it for listening reference. |

### worth adding later
**Google Magenta Groove MIDI Dataset** — ~1150 real drum performances by session
drummers, with human micro-timing and velocity intact, **CC-BY 4.0** (attribution
required, that's it). That's the ideal feed for extending `GROOVES` with more
`{off, vel}` feels rather than more note placements.

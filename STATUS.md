# Slimehedron — Status Board 🎛️
_Glance here. Newest on top. ✅ done · 🔧 pending · 🎨 art needed_

## ✅ Shipped (v33)
- **REAL band with attitude (for real this time).** Before, the "band" was just a pad blooming once a bar + a bassline — no rhythm to the chords. Now there's a plucky comp instrument that plays **syncopated chord stabs, rotating the rhythm every bar** so no two bars are the same, and **every 4th bar it breaks into a bouncy arp lick** that walks up the chord and steps into the next one. Humanized velocity + the drums' swing. Pad dropped back so the comp sits on top. → Needs your EARS: tell me if it's too busy/too sparse, and if the pluck tone fits.

## ✅ Shipped (v32)
- **MIDI clock = the real deal now.** Ripped out my homemade averaging and dropped in a **DLL (delay-locked loop)** — the exact filter JACK and pro-audio clocks use (Fons Adriaensen's method), plus Michael Tyson's (Loopy Pro) "reset on a confirmed jump" trick. Simulated it against jittery, dropped-tick, ramping, and hard-jump clock streams before shipping: locks a steady tempo to ~0.1 BPM, tracks a live ramp glassy-smooth, ignores glitches, and snaps to genuine tempo jumps within a few ticks. This is the tried-and-true thing the nerds actually use, not a corner-cut.

## ✅ Shipped (v31)
- **Meter-switch safety** — flip to triplet/odd time and the current bar finishes first, THEN it changes on the downbeat. Tempo still follows live per-step. This is the piece you needed before MIDI-syncing to a moving tempo.
- **Rock-solid MIDI clock** — now reads the gap between every tick (not once per beat), smooths it, and throws out glitchy/dropped ticks so one bad reading can't yank tempo. Engine locks tempo every tick for tight sync; the fader repaints calmly (~5x/sec) so the thumb doesn't buzz. Follows a live, second-by-second changing tempo.

## ✅ Shipped (v30)
- License: PolyForm Noncommercial (free for all, only FlahMusic can profit). Link on splash.
- Play default key → **G major** (most popular key) for chord variety. Auto-mode flips major↔minor for mood.
- Dilla feel on drums: kick drags, snare rushes, hats freehand. Bass lays back too.
- **Kick + bass LOCK on beats 1 & 3** (solid); everything else humanized ±10–15%.
- Auto-mode swing slowly breathes over ~2 min; key moves around circle of 5ths every **64 bars**.
- Chords add 7th/9th color on rotating bars (soul comp feel).
- 5 play beats (Pop·Rock·Disco·Bossa·Industrial) + 9 styles in studio. Industrial has a drone bass.
- Play mode: triangle mixer + record shown; circle-of-fifths hidden. White boxes fixed. Band drum icons.

## 🔧 Pending / not fully fleshed out
- **MIDI clock follow** — now a proper DLL (v32), sim-tested clean. Only thing left is a real-hardware sanity check with your DAW on your rig.
- Ear-check pass on all the new Dilla/beat feels (kick drag amount, ghost-note busyness, chord jazziness).

## 🎨 Art needed (learn-mode modal scenes)
- ✅ have: ionian, dorian, phrygian
- ❌ still generate: **lydian, mixolydian, aeolian, locrian** (prompts in STYLE_GUIDE.md §9)
- ❌ then wire all 7 modal scenes into the learn-mode lesson cards

## 🎚️ Where to tweak stuff (for future me)
- Drum patterns / sounds / bass: `KITS`, `KITTONE`, `KITVOICE`, `KITBASS` in index.html
- Feels/swing: `GROOVES` + `GROOVE_DEF` (the "Human" default)
- Dilla per-voice timing: `humanVoice()`
- Default play key: the `boot('play')` block
- Chord color: `bandBar()` (the "7th/9th" line)

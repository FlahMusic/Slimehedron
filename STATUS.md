# Slimehedron — Status Board 🎛️
_Glance here. Newest on top. ✅ done · 🔧 pending · 🎨 art needed_

## ✅ Shipped (v37) — melody engine + studio declutter (part 1)
- **Singable melody engine (both play & studio).** Reverted the fake visual-only balls — balls are REAL again (bounce + sound). Auto-shots are now AIMED at melodically-sensible note-walls, and the line follows composer rules: mostly stepwise, arch contour (one peak per phrase), antecedent/consequent phrasing (question lands on the 5th, answer resolves home to the tonic), motif echoes, resolving leaps, narrow range. Sim-verified: 55% steps, max jump a 3rd, phrases cadence correctly. No more random octave sperg-outs.
- **Wall break-off.** In auto mode a random wall opens every 16 bars (balls pour through the gap, that note goes quiet) → thins busy textures + simplifies the palette. Tonic wall protected; walls reform so it breathes.
- **Groove = one toggle.** Killed the ugly AI-star "Human" chip + the top-right groove-name label. Now a "Groove" checkbox (on by default) = head-bobbin' MPC feel vs robotic sequencer. Variations still there for tweakers, just no name label.
- **Studio declutter (part 1):** 5th "warm" waveform added to the side menu · gravity slider removed → gravity is now automatic (settles gently as the tank fills) · triangle mixer enlarged with readable icons (black 16th-note on top, drum kit bottom-left, band bottom-right) · **side-menu sections are now collapsible** (click a title to fold it; advanced cards start collapsed) = way less scrolling.

## 🔧 Studio overhaul — part 2 (deliberately deferred, needs visual iteration)
These are the RISKY structural changes I won't do blind (they'd rewire ~10 live controls; breaking them bricks studio). Doing them with the site in front of me so I can verify each:
- Remove the entire middle-top control row (redundant with side menu), keeping only the triangle mixer.
- Merge Tempo+BPM into ONE BPM (type + knob, like Play). Remove old drum/band mute + drop-ball buttons. Move pause/record top-right, evenly spaced; fix stacked corner buttons like Play mode.
- New FX card (tape sat + delay + reverb, each with a Mix knob) replacing the inline tape/delay sliders.
- Slime responsive placement: keep slimes off interactive UI; reduce slime count on small screens; fix the broken "windowed" layout.

## ✅ Shipped (v36) — the big one
- **DEAD BUTTONS/SLIMES FIXED (root cause found + verified live).** Rhythm 1 & 2 and the top slimes were buried under the full-width top bars (header, auto-play row, mixer bar) — those bars stretched edge-to-edge with `pointer-events:auto` and ate every click beneath their empty space. Made the bars click-through (only their controls catch clicks) and raised the button columns above them. Tested on the live site with elementFromPoint + a real click — confirmed fixed.
- **Auto-slime melody = a real "vocalist" now.** Killed the chaotic random ball-drop pitches (the abrasive ±octave jumps). Slime mode now SINGS a singable line: ~66% stepwise, some 3rd-skips, rare 4th leaps that resolve by stepping back, strong beats land on chord tones, narrow singing range, phrasing rests. Sim-verified. Balls still fly for the visuals but no longer spray random notes. (Like humming a baby to sleep, per your note.)
- **Drums genuinely distinct + refined (not chiptune).** Rebuilt on 909-style synthesis: kick with a beater-click transient + pitch dive (808 sub option for industrial), snare = noise-crack + tuned body blended per kit (brushy option), and REAL metallic 6-oscillator hi-hats (the classic inharmonic-ratio shimmer) instead of a plain noise tick. Each of the 5 Rhythms has its own character (punchy / big-room / disco / brushy / 808-sub). Whole kit runs through a bus compressor + low-mid EQ so kick/snare/bass sit as a foundation.

## ✅ Shipped (v35) — audio + UI fixes
- **Drums no longer bleep like a Gameboy.** Root cause found: the "rim" voice was a raw square-wave beep and the "conga/tom" was a pure sine — and several kits led their beat with them. Rebuilt both as real drums (woody noise click; tom with a skin-slap attack + pitch drop) and re-voiced every kit to lead with the noisy snare/hat. Should sound like a kit now, not chiptune.
- **Bass plays like a real player.** Was cutting off at a fixed 0.3s → silence on sparse grooves. Now every note sustains until the next one with a legato release tail (no gaps, no jerky cutoffs), pitch GLIDES between nearby notes (smooth walk), and switched to a warmer saw+sine tone. Rhythm 5's drone is now continuous — one held note per bar, overlapping, so the low end never drops out.
- **Mixer triangle enlarged** (~40% bigger) with bigger corner icons — readable on PC + mobile.
- **Floating slimes raised** so their whole faces show (was only their scalp poking out); Gumby lifted too. Bigger peek = bigger click target.
- **Worm side-clipping fixed** — the grain filter's region was too tight and chopped the fat body stroke ("invisible walls"). Widened it.
- **5th oscillator added** ("warm · round", a soft organ tone) so play-mode has 5 Sound buttons matching 5 Rhythm buttons — columns balanced. **"Drum" buttons renamed "Rhythm"** (it's a whole band).

## ✅ Shipped (v34) — microtonal usability
- **Microtonal MIDI-out actually works now.** BIG bug fixed: before, every quarter-tone got rounded to the nearest normal note before leaving — external synths got 12-tone garbage. Now there's a **"MPE microtonal out" toggle** in the MIDI tab; flip it on and Slimehedron sends the TRUE pitch (per-note pitch-bend, the standard Surge XT / Pianoteq / Vital all read). Verified the byte math against the spec. It takes over the MIDI channels only while it's checked — off by default so normal 12-tone gear is unaffected.
  - Note: you do NOT need a fancy MPE controller to PLAY microtonally — that's only about sending OUT. Playing in works on any keyboard.
- **Harmony guardrails for microtonal autoplay (Studio).** Research was blunt: don't force Western triads on these scales — it sounds detuned to normal ears. So each scale now picks its own harmony vocabulary:
  - **Drone** (bayati, slendro, pelog, iwato): warm pedal + a real fifth, arp carries the melody, tonic mostly holds. The pleasant, grandma-safe sound.
  - **Neutral** (maqam rast, neutral 7): root + the scale's own neutral 3rd + 5th — its native colour, no fake major/minor 3rd.
  - **Triad** (everything else): unchanged.
  - Bass follows the same rails — sticks to root+fifth in drone/neutral so the low end never fights the microtones.
- Sim-verified: rast → root+neutral-3rd+5th, bayati/slendro/pelog → root+their natural fifth. All parses clean. → **Needs your EARS** on the actual microtonal feel.

## 🔭 Future ideas (noted, not built)
- **Adaptive on-screen keyboard** that re-labels/re-lays-out per microtonal scale (like Scale Workshop's isomorphic layout). Cool, bigger feature.

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

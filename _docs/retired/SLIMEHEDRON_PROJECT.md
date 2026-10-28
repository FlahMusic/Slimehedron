# Slimehedron — Project Brief

A browser-based, kid-friendly **generative music toy / instrument**. One self-contained file, no build step.

- **File:** `index.html` (~1,400 lines, ~110 KB). Everything — HTML, CSS, JS, audio, visuals — lives in it.
- **Runs as a PWA** (`sw.js` service worker → installable / "Add to Home Screen").
- **Deployed:** GitHub Pages → `flahmusic.github.io`. Upload is manual (no CI).
- **Stack:** vanilla JS + Web Audio API + Canvas 2D + inline SVG. No frameworks, no dependencies.

---

## The core idea

Balls bounce inside a rotating **geometric shape**. Each wall is a **note** in a chosen scale. When a ball hits a wall it:
1. plays a synth note (pitch = that wall's scale degree; velocity = impact angle),
2. spits **splash particles** that fall and **pool as "liquid"** at the bottom.

The **liquid fill level drives the sound** — as it fills, a master low-pass darkens the tone, note envelopes get rounder, and a tempo-synced **echo/reverb wash** swells in. When the shape fills to capacity it **breaks apart at the corners**, balls and particles spill out into open space, then it **reforms into a new shape** and the cycle repeats. It's meant to feel like a living, self-playing instrument.

---

## What's built

**Audio engine (Web Audio):**
- Internal synth: osc + sub osc + filter (LP/HP/BP, resonance clamped Q 0–20) + ADSR.
- Drums: multiple kits, groove patterns, time signatures (4/4…9/8), swing.
- Bass + chord pads that follow the chosen scale (soft triangle pads, low-passed; punchy bass).
- Tape "warmth": gentle global low-pass + tanh saturation (no vibrato).
- Tempo-synced echo (dotted-8th) that swells/fades with the liquid fill level.
- Master low-pass driven by fill + limiter/compressor; light comp+EQ in auto-play.
- MIDI out (per-part channels: melody / drums / bass / pads).
- Recording → currently `MediaRecorder` → IndexedDB (`slimehedron-rec`).

**Scales:** major/minor/modes, pentatonic/blues, world (hirajoshi, hijaz, bhairav…), and **microtonal** (maqam ¼-tones, slendro, pelog, 19-EDO) — exact on the internal synth.

**Visuals (Canvas):** aurora pastel palette; "goo" liquid render (offscreen canvases + blur filter); adaptive quality with a manual **performance** toggle. Cute **slime characters** (DOM SVG): edge peekers (hide/seek), cursor-following "chillers" (desktop), pulsing "sleepers," a **Gumby** easter-egg girl, a ground-dwelling **wiggle worm** metronome buddy, and a splash intro screen (mint slime with glasses = the logo).

**Controls:** always-visible **mixer triangle** (drag to balance melody/drums/keys), an **advanced** bar beside it, and cards for timing, scale, geometry, motion, velocity, synth, filter, output. **Auto-play** ("slime mode") = gentle LFO auto-modulation + auto-spin + auto-rain + 1/16 quantize.

**Current defaults:** 80 BPM, quantize on, velocity randomize on (12–94), full-liquid quality, drums+bass+pads on from first tap. Settings persist in `localStorage` key `slimehedron2`; recordings in IndexedDB.

---

## End goals (build order)

1. **Polished kid-first web toy** — usable by non-readers of any age/language: **symbols over words**, clean/simple, works great on phones (esp. **iOS Safari**).
2. **Phone app** — already a PWA; wrap in **Capacitor** for App Store / Play Store (same codebase).
3. **VST/AU plugin** — a **native C++ (JUCE) rewrite**. The web app is the *design blueprint/reference*: every voice, drum pattern, scale and effect is defined and tuned here, so the plugin is a port, not a redesign. Keeping the audio logic modular helps that translation.

---

## Open issues / next up (as of this brief)

- **iOS Safari recording is broken** — `MediaRecorder` from a Web Audio stream is unreliable on iOS. Needs a rewrite to capture PCM via `ScriptProcessor`/`AudioWorklet` and **encode WAV** manually (works everywhere), then save to IndexedDB + show a playback/share list.
- **iOS Safari liquid looks "bubbly"** — the goo render leans on canvas `filter` (blur/SVG filter), which older iOS Safari doesn't apply, so it shows raw blobs. Needs a **filter-free smooth-liquid fallback** (e.g., render a filled water-level with a wavy surface) when canvas filters aren't supported.
- **Mobile top bar too wordy** — convert the header buttons to **symbol-primary** (icons, minimal text) for the no-reading-required goal.
- **Auto-play control** — turn it into a **sliding toggle whose knob is the glasses-slime logo**, centered at top (slime slides on/off like a switch).
- **Performance/quality toggle** — make it visibly, reliably switch between full and light rendering on mobile.

---

## Working notes for future sessions

- It's **one big HTML file** — changes apply to desktop + mobile together (mobile handled via `@media (max-width:820px)` + `matchMedia` checks). Only gate to one platform when necessary (e.g., cursor-follow slimes are desktop-only — no cursor on touch).
- **No build/test harness.** Validate JS by parsing; the real test is loading it in a browser. Live testing is on the deployed GitHub URL / device.
- Recordings survive settings resets (separate IndexedDB store); bump the `localStorage` key to force new defaults across returning users.

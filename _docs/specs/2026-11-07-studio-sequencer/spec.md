# Studio sequencer: SQ-1 ease, Studio One movement (spec, 2026-11-07)

Status: in-progress. Research: `_docs/research/2026-11-07-step-sequencer.md` (cited; numbers below come from it).

## 1. Ask (Flah, 2026-11-07)
"studio mode sequencing both drums and patterns, inspired by the Korg SQ-1 sequencer. so 2 rows of 8 that you can
either sequence as A/B variations or sequential 16 full length, under the normal pitch/velocity knobs, put some studio
one inspired ways to modulate the pattern, like how you can easily draw or drag modulation in for randomness,
velocity, timing, etc. but make these complex things simplified and fluid all in 3-4 sliders that descibe each
modulation ... the ease of use of SQ-1 and twiddling knobs and hearing shit happens, and the diff knobs for pattern
variations and fwd/rvs etc. look at the way behringer's latesy sequencer knob is, along with arp and scale lock".

## 2. Decisions (made overnight by the agent: Flah to confirm or change; each is one line to undo)
1. **Where.** Studio's Pattern card gets a two-way switch, **drum grid | sequencer**. No new card (subtraction
   budget: the sequencer shares the drum grid's place instead of stacking under it).
2. **Steps.** Two rows of 8 (A over B). Each step: on/off (off = a rest, SQ-1 GATE ON/OFF), a pitch and a velocity.
   **One knob per step**, and a **pitch | velocity** switch turns all 16 knobs into the other lane at once (BCR32's
   mode buttons, Studio One's lane buttons). Drag a knob up/down to set it; **drag sideways across knobs to draw**
   (Studio One's one-gesture lane drawing). Tap = rest on/off. The playhead lights the step playing.
3. **Rows.** **A** (8 steps) / **A→B** (16, SQ-1 ORDER) / **A|B** (A one pass, B the next: variations).
4. **Direction.** forward / reverse / bounce (no repeated ends, BCR32 "Pendulum") / random (never the same step twice
   running, SQ-64 RAND).
5. **Rate.** 1/16, 1/8 (default, the SQ-1's factory 8th), 1/4. Runs on the drum clock, so it is in time with the kit.
6. **Target.** **notes** (the melody synth, the melody mixer track, MIDI out on the melody channel) or **drums** (the
   knob picks the kit piece: kick, snare, rim, closed hat, open hat, low tom, high tom, clap-like clave; the drum
   mixer track, MIDI on the drum channel).
7. **Scale lock, always.** A pitch is a **scale degree**, two octaves (15 degrees) round the key, so the key journey and
   a scale change carry the pattern with them (BCR32's non-destructive scale).
8. **Arp.** One toggle. The knobs keep rhythm, rests and velocity; the pitches come from the chord the band is playing,
   walked in the order the direction sets (forward = up, reverse = down, bounce = up-down, random). No new controls.
9. **Four movement sliders** (0-100 %, each named for what it does, with a short line under it):
   - **chance**: some steps skip this pass. Off-beats down to 40 %, beats to 70 %, step 1 always plays.
   - **humanize**: timing and loudness wobble: up to a quarter of a step (never past 30 ms) and velocity ±24.
   - **wander**: up to a quarter of the notes move 1-2 scale steps for that pass only (nothing stored changes).
   - **repeat**: up to 35 % of steps stutter 2-4 times inside the step, hits at least 30 ms apart, each 15 % softer.
10. **Notes from the sequencer** do not steer the chord brain (like a seed). They are part of a song: song files,
    share links, undo and autosave carry the pattern; incoming patterns are checked (own properties, size caps).
11. **It plays** while the transport plays and its **on** switch is on. It starts off, with a simple pattern ready.

## 3. Done means
- Both row modes, all four directions and all three rates play the right steps at the right times (scheduled
  notes against the drum grid, worst error under 2 ms), rests are silent, velocity reaches the synth.
- A pitch follows the key and the scale: after a key change every step is in the new key at the same degree.
- Target drums plays the picked kit piece per step; target notes plays pitches; MIDI out carries both.
- The arp plays only chord tones of the current chord, in the direction's order.
- The four sliders, over 400 passes each: chance at 100 % gives step 1 400/400 and off-beats 40 ± 5 %; humanize
  never moves a note more than min(¼ step, 30 ms) and stays within velocity ±24; wander changes only in-scale
  pitches, at most 2 degrees, and the stored pattern is unchanged after; repeat hits are never under 30 ms apart.
  At 0 % each slider changes nothing (byte-identical schedule).
- Drag across knobs draws; tap toggles a rest; every knob and button ≥ 44×44 at 360 px; 360/390/1280/1440 px
  layouts hold (dev-topbar, dev-a11y, dev-devices); `dev-surface` growth defended.
- A song file / undo / autosave round-trip gives the identical pattern; a hostile pattern is cleaned.

## 4. Proof
`_dev/dev-seq.js` (new): the engine (rendered schedule), the sliders (statistics), the UI (drag, tap, sizes),
persistence. Each check sabotaged. Existing suites to rerun: dev-daw, dev-hostile, dev-surface, dev-topbar, dev-a11y,
dev-devices, dev-controls, dev-midi.

## 5. Tickets
01 engine (data, clock, rows, direction, rate, scale lock, notes target, MIDI) · 02 the panel (knobs, lanes switch,
draw, tap, playhead, controls) · 03 the four sliders · 04 arp + drums target · 05 songs, undo, autosave, links.

## 6. Not checked by a machine
How it sounds and feels: knob feel on a phone, whether the slider words read right, whether the defaults groove.

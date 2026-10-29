# 0010 The plugin's reverb is the web's noise-built room

Status: accepted 2026-10-29 (Flah). Needed by plugin milestone 5 (effects and master chain).

- The web's reverb is a convolver whose impulse is made from noise at start-up (`index.html`, the
  `reverb: a room, built from noise` block): no recording, nothing downloaded (ADR 0001, synth only).
- The plugin convolves with the same generated impulse, so it sounds like the web app. The impulse's noise comes
  from the seeded random numbers (ADR 0006), so an export comes out the same twice.
- Rules out: a recorded room (breaks synth only) and an algorithmic reverb (cheaper, but sounds different).

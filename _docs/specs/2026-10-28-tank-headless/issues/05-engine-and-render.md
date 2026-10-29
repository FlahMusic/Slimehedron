# 05 The tank plays: engine, WAV, parity

Status: ready
Blocked by: 01, 03, 04
Spec: `../spec.md`

`slimehedron-core/src/engine.rs`: the tank plus the step 1 voices (16), driven by a clock (tempo, playing, song
position in samples). A tick happens every sample_rate/60 samples (kept as a fraction, so it does not drift). A hit
starts its note on its tick's first sample, with the velocity from the hit. Stopped means no ticks. Position 0 after
a stop resets everything to the random seed.

`examples/tank.rs` writes 8 bars to a WAV. Tests: two renders are identical. Stopped means silent after the tails.
Parity: 200 bars × 5 seeds, every stat inside the web's ± 2 sd from `web-stats.json`. The sabotages from spec
section 4 each go red.

## Notes from ticket 02 (2026-10-28)
- A hit carries `sound_ms`: a note quantize held starts on the next grid line (at most 45 ms later), not on its tick.
  The web's queue also plays only one held note per rounded cents on a line.
- Call `Tank::on_bar()` on every bar line of the DAW clock (walls open and heal).

## Notes from tickets 03-04 (2026-10-29)
- The engine can run the goo inline (an offline render does not care about the 0.25 ms); 07 decides how the real-time
  path spreads it. Keep the goo's step behind one call so 07 can move it.
- `TankSettings::default()` has auto-notes on. Read the fill with `tank.goo().fill()`.
- Goo level parity rests on ~3 gooed hits per 100 bars per run, on both sides: expect it to be the noisiest stat.

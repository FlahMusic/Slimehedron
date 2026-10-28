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

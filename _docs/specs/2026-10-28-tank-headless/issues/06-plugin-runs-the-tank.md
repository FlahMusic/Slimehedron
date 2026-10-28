# 06 The tank in Studio One

Status: ready
Blocked by: 05
Spec: `../spec.md`

`slimehedron-plugin`: read the CLAP transport (tempo, playing, song position) each block, feed it to the core
engine, and mix the tank with the direct MIDI voice (unchanged). Update `vst/README.md`.

Tests (CLAP entry point): stopped means no hits. Play from 0 twice gives identical blocks. A tempo change speeds
the balls up within one tick. The step 1b tests still pass. clap-validator: 0 failed.
Not checked by a machine: Flah loads it in Studio One, presses play and stop, and listens.

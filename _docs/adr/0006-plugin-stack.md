# 0006 The plugin: Rust core with zero dependencies, CLAP first, webview UI, Windows first

Status: accepted 2026-10-14. Full plan: `_docs/slimehedron-vst-project.md`.

- `slimehedron-core` has NO dependencies and compiles to WASM, so the website can one day run the same engine.
- Rust owns the physics (the tank IS the sequencer; a DAW can close the window and the music keeps going).
- CLAP first (MIT, native to Rust), VST3 via clap-wrapper. GUI is a webview so the crayon UI is reused, not redrawn.
- MIDI in drives the chord follower (the band follows your chords); every band part goes out on its own MIDI channel.
- Windows only until there is a Mac to build and sign on. Everything in cents (5 of 25 scales are microtonal).
  Seeded RNG, no allocation or locks on the audio thread.
- Rejected: nih-plug (maintenance mode), nice-plug (its GUIs can't carry the look), JUCE (full rewrite).

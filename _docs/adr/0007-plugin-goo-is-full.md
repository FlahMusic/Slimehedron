# 0007 The plugin runs the full goo, not a stand-in

Status: accepted 2026-10-27 (Flah). Plan: `_docs/slimehedron-vst-project.md`.
Amended by ADR 0009 (2026-10-29): the cost fix is the goo one tick late, spread over the audio blocks, not a thread.

- The goo is physics, not decoration: it drags balls off the beat and changes when and how they ring. So the Rust
  core ports the real goo (the same particles and drag as `index.html`) and runs it on the fixed 60 Hz physics tick
  with the balls. The plugin sounds like the web app.
- How smooth it looks is a separate thing: the plugin window draws and interpolates at the screen's rate
  (milestone 3), whichever goo the sound side runs.
- Cost: the goo runs next to the audio. Milestone 2 measures a physics tick against the audio budget before anything
  is built on top; if it does not fit, fix the cost (fewer particles, a cheaper neighbour search, its own thread),
  not the sound.
- Rejected: a cheap drag formula in place of the particles (cheaper, but the plugin would sound different from the web app).

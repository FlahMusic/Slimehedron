# 03 Plugin core: the solid maths
Status: ready
- `vst/slimehedron-core/src/tank/solid.rs`: planes for the seeds, prisms and orbs; cut / flip / puff; faces;
  face notes. No allocation rules apply only to the audio thread: shapes are built off it.
- Proof: cargo tests, red first; a JSON of the web's planes for 10 shapes compared to 1e-6 (`_dev/solid-ref.json`).

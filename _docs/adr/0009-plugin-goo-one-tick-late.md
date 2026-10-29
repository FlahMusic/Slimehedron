# 0009 The plugin's goo runs one tick late, spread over the audio blocks

Status: accepted 2026-10-29 (Flah). Amends ADR 0007's cost line ("its own thread"). Ticket:
`_docs/specs/2026-10-28-tank-headless/issues/07-goo-off-the-tick.md`.

- The full goo costs 0.67 ms a tick on a P-core of Flah's i7-12700H (1.1 ms on an E-core), against a 0.25 ms budget
  (ticket 04). It is not simplified (ADR 0007).
- So the balls feel the goo one tick (16 ms) late, and the goo work for the next tick is cut into slices that run in
  the audio blocks between ticks (about 6 blocks a tick at 128 samples, 48 kHz). No thread: the core stays
  thread-free (it builds to WASM, ADR 0006), and the work runs in the same order every time, so an export comes out
  the same twice.
- Rules out: a goo worker thread in the plugin. Bringing it back means a new ADR.

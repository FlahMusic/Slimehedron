# 07 The goo off the audio thread's tick

Status: ready
Blocked by: 04
Spec: `../spec.md` (Done means: cost), ADR 0007, ADR 0009

A full tank's goo costs 0.67 ms a tick on a P-core of Flah's machine (1.1 ms on an E-core), against a 0.25 ms limit
(ticket 04 notes). The spec says: then the goo moves to its own thread, never simplified. The core must stay free of
threads (it builds to WASM, ADR 0006), and an exported song must come out the same twice.

**Question for Flah:** the balls may feel the goo one tick late (16 ms), so the goo for the next tick can be worked
out while this one plays. Inaudible on paper; ticket 05's parity numbers check it. Then, which way?
- (recommended) **Spread it over the blocks**: no thread. The tick's goo work is cut into slices that run in the audio
  blocks between ticks (about 6 blocks a tick at 128 samples, 48 kHz): ~0.1-0.2 ms a block. Same order of work every
  time, so it is deterministic everywhere, WASM included. Reverses ADR 0007's "its own thread" wording: needs ADR 0009.
- **Its own thread**: a worker steps the goo, the audio thread hands it the balls and takes back the density grid each
  tick, and waits if the worker is late (rare: it has 16 ms for ~1 ms of work). Lives in the plugin, not the core.

Done when: the goo's work per audio block is at most 0.25 ms (the 20 slowest of 1000, release, Flah's machine), the
`tank_cost` check is back on, and 05's parity still holds.

## Answer
Flah, 2026-10-29: spread it over the blocks, one tick late (ADR 0009). Build it when the plugin resumes.

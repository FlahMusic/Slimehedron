# Plugin step 2: the headless tank

Status: ready

## 1. Ask
"VST step 2, the tank headless. goo is settled (ADR 0007). grill only what's still undecided, then /to-spec and
/to-tickets." (Flah, 2026-10-28). The plan: `_docs/slimehedron-vst-project.md` section 5, step 2.

## 2. Decisions (grill 2026-10-28, all Flah's yes)
- **3D tank only** (ADR 0008): a prism (polygon walls plus front and back panes), with the 3D goo.
- **Normal space, base spin** (`S.spin`, default 0, settable). Later steps: solids, portal, curved space, and hands
  (flick, seeds, strum).
- **Fill and goo drag** (ADR 0007). **Burst/reform is not in this step** (its own spec, step 2b): a full tank stays full.
- **Walls open and heal** (Flah, 2026-10-28, after ticket 01 measured it): a wall opens every 8 bars and the oldest
  gap heals every 24, as with the slime on in the web app (`breakWall` / `repairWall`, never the home chord's root
  wall, at most a third of the walls). Without it the tank jams at 7 balls and plays ~16 notes a bar; with it ~9.
  The 128-bar whole-shape burst (`explodeReform`) stays in step 2b.
- **DAW clock**: the tank runs while the DAW plays and freezes when it stops. Tempo comes from the DAW. Play from
  song position 0 resets everything to the random seed. Play from anywhere else carries on.
- **Notes come from auto-notes** (`autoMelodyNote`: the motif melody, one roll per beat, as with the slime on in
  studio). Only the auto-notes part of the slime is ported: no key journey, no spin or shape moves, no MODS.
  **MIDI is unchanged** from step 1b: a key plays the voice directly. It does not pause the melody (unlike the
  web's `manualHold`).
- **A hit sounds on its tick's first sample** (same as the web, up to one tick late). Beat lock (`beatLock`) does
  the steering onto the grid.
- **It runs in both places**: the core renders a WAV, and the CLAP plugin runs the tank in Studio One (no window).
- Derived, not asked: the chord brain is step 4, so the chord stays on the home chord (`curRootDeg` = 0).
  Both the melody and the panes aim at it.
- Derived, not asked: the web's pixel units and constants are kept as they are (720 tank, `BR`=9, `BOXD`=`R`*1.2,
  `GOOC`=24, `ballSpeed`=(bpm/80)*3.4, `MAXBALLS`=12, particle cap ≤1600), so the code ports line for line.
- Start state = studio's defaults: 6 walls, C major (root 60), 2 octaves, 80 bpm (or the DAW's tempo), quantize
  on, swing 0.15.

## 3. Done means
- `cargo run --example tank` (in `vst/`) writes 8 bars at 80 bpm to a WAV, and every note's pitch is a wall of
  C major or a pane tone (how many notes is the parity check's job).
- Same random seed, same settings: two renders are identical down to the sample.
- **Parity with the web**: run each one for 200 bars at the start state, 5 random seeds. The core's mean for each
  of these lands inside the web's mean ± 2 standard deviations (taken from its own 5 runs):
  hits per bar, the share of hits within 20 ms of the grid, the share of pane hits, gooed hits' level next to
  clean ones, and the fill after 64 bars.
- **Cost**: the worst tick with a full tank (12 balls, the particle cap) takes **≤ 0.25 ms**. That is the median of
  the 20 slowest of 1000 ticks, in a release build, on Flah's machine (msi). If it misses, the goo moves to its own
  thread (ADR 0007). It is never simplified.
- Nothing on the audio thread allocates once the tank exists (the same counting-allocator check as step 1).
- **Plugin**: DAW stopped means no new hits. Play from 0 twice gives identical output. A tempo change changes the
  ball speed within one tick. clap-validator still shows 0 failed.

## 4. Proof
- Rust tests in `slimehedron-core` (`tdd`, red first), at **one seam**: the tank engine. You give it a clock
  (tempo, playing, song position) and a block, and you get samples plus hit events back. No test reaches inside the
  physics. Sabotages that each test must catch: no goo drag; no beat lock; pane hits off; random seed ignored; spin
  ignored.
- `_dev/dev-vstparity.js`: plays the web app at the start state with the key, shape and MODS pinned, and writes
  `web-stats.json` into this folder. The core's parity test reads it.
- The plugin tests (CLAP entry point, as in step 1b) cover stop, play from 0 and tempo change.

## 5. Changes old behaviour
No web suite asserts on this (`index.html` is untouched). In the plugin, `engine.rs` gets a tank next to the direct
MIDI voice, so the step 1b tests stay and must still pass. `vst/README.md` "What it does right now" is updated.

## 6. Tickets
`issues/01`...`06`, in order. 01 can run alongside 02–04.

## 7. Not checked by a machine
How the 8 bars sound next to the web app (Flah listens to both). That the plugin loads and follows play/stop in
Studio One. The tick cost on any machine other than Flah's.

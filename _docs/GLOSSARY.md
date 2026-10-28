# Slimehedron glossary

One name per thing. Use these words in code comments, tests, UI copy discussions and prompts, so a person and an
agent mean the same thing. (Format follows the `GLOSSARY.md` convention used by the mattpocock skills:
`grill-with-docs`, `domain-modeling`, `code-review`, `wait-what` read it.)

## Rooms
- **Play**: the kids' door. Ultra-minimal. Tap the tank, pick a sound and a beat.
- **Studio**: the full rig: step grid, mixer, song files, undo, more settings.
- **Learn**: the lessons map and the lessons. A lesson owns the tank while it runs (`LAB`).
- **Tools**: four standalone windows (metronome, circle of fifths, chords, drum machine) that borrow studio's live controls.
- **Splash / doors**: the first screen with learn / play / studio / tools.

## The tank
- **Tank**: the glass shape notes bounce in. Drawn by the canvas (`#cv`) or the GPU (`tank3d.js`, `#cvGL`).
- **Wall**: one side of the shape. Every wall is a note (`edges[i].cents`). Ringing a wall = `LAB.strike(i)`.
- **Shape**: a 2D polygon (prism in 3D) or a **solid** (cube, octahedron...). Grow ops: **cut / puff / flip**.
- **Space**: `normal`, `portal` (two moving **wormholes**), `curved` (hyperbolic). `TSPACE`, not `SPACE` (that name is taken).
- **View**: 3D (default) or 2D. **Look**: glass (default) or crayon. Both are looks, not speed settings.
- **Ball / note**: a bouncing note. It plays when it hits a wall. **Shot** balls (`mute:1`) don't re-play their first hit.
- **Goo / slime liquid**: the particles that fill the tank. When the tank is full it **bursts** and **reforms** into a new shape (~64 bars).
- **Pane**: the front and back glass in 3D. Pane hits play soft chord tones and never feed the chord brain.
- **Spin**: the shape turning on its own axis (`rot`). Base spin is tempo-locked in play; a **flick** adds momentum (`SPINU`).
- **Seed**: hold-to-loop marker. Rings its spot once a bar. Does not feed the chord follower.
- **Strum**: a drag that starts on the rim and rings each wall it passes.
- **Chord jackpot**: the player's own taps/strums in one bar are exactly the sounding chord's tones -> reward.
- **Tap invite**: the pulse on an empty play tank. Gone forever after the first tap.

## The music
- **Key / root**: `S.root` (MIDI note; the key menu shows the pitch class, the octave row sets the register).
- **Scale**: `S.scale`, one of 25, stored in **cents** (five are microtonal).
- **Chord brain**: picks the band's chord each bar (`curRootDeg`). **Chord follower**: `noteFeed()` lets played notes steer it.
- **Key journey**: the slime moves the key every ~90 s (not when pinned, `_keyPinned`).
- **Slime / slime mode**: the auto-jammer switch (`#slimeBig`, `S.slimeMode`): moves key, spin, shapes, sound knobs (**MODS**).
- **Auto-notes**: the slime dropping notes by itself (`#autoNotesBtn`, `S.autoNotes`). Off in play, on in studio.
  It is a melody with motifs (`autoMelodyNote`), and it only runs while the slime is on.
- **Rain**: the old steady note drop (`spawnRain`, `S.rain`). Runs only while the slime is off. Not auto-notes.
- **Band**: bass + comp + pad (+ drums). **Kit**: a drum style (pop, rock, disco, bossa, jazz, ...).
- **Triangle mixer**: `#triMix` (melody / drums / band). **Mixer**: studio's per-part volume/mute/solo (`MIX`).
- **Beat lock**: balls are steered so their hits land on the grid (`beatLock`, `b.tq`).

## The plugin (`vst/`)
- **Core**: `slimehedron-core`, the engine with no dependencies (no plugin, no window). Also builds to WASM.
- **Headless tank**: the tank running in the core with no window: physics, goo and notes, nothing drawn.
- **Tick**: one fixed 60 Hz physics step. In the plugin it is counted in samples, never in screen frames.
- **DAW clock**: the host's tempo, play/stop and song position. The plugin's only clock.
- **Random seed**: the number the plugin's random numbers start from, so a song exports the same twice.
  Not a **Seed** (the hold-to-loop marker).

## The work (how a change gets made: `.claude/CLAUDE.md` has the full loop)
- **Pass**: one round of Flah's requests, from questions to the GitHub upload list.
- **Grill**: the question round before building. Facts the agent looks up itself; decisions go to Flah, all in one
  round, each with a recommended answer. Ends when nothing is silently assumed.
- **Spec**: what "done" means for one feature, written before the code: what a person can do, the numbers it must
  hit, which suites prove it, which old suites it changes. Lives in `_docs/specs/`.
- **Ticket**: one slice of a spec small enough to build and check in one sitting.
- **Prototype**: a throwaway page that answers one "does this feel right" question. Never shipped; its verdict is.
- **Suite**: a `_dev/dev-*.js` check (most drive a real browser). `_dev/SUITES.md` says which to run for what.
- **Gate**: a suite that runs first because it is fast and catches the worst things (`dev-syntax`, `dev-loadtest`).
- **Targeted run**: the suites for the area you changed. **Sweep**: every suite, one at a time, once, at the end.
- **Sabotage test**: break the feature on purpose and confirm the suite goes red. A suite that cannot fail proves nothing.
- **Control run**: the same suite on the previous commit, to tell a regression from a flaky box.
- **Flaky**: fails sometimes on unchanged code. Listed in `_dev/SUITES.md` until someone fixes the cause.
- **Review**: two separate reads of the diff: against `_docs/CODING_STANDARDS.md`, and against the spec.
- **Retro**: after a messy pass, what went wrong and which rule, check or doc stops it next time.
- **ADR**: a decision record in `_docs/adr/`. Reversing one means a new ADR that supersedes it.
- **Handoff**: `SLIMEHEDRON-HANDOFF.txt` (claude.ai project, mirrored in `_docs/`). The running history and state.
- **Retired**: `_docs/retired/`, docs that describe an older app. Never read them as current.

# Slimehedron glossary

One name per thing. Use these words in code comments, tests, UI copy discussions and prompts, so a person and an
agent mean the same thing. (Format follows the `GLOSSARY.md` convention used by the mattpocock skills:
`grill-with-docs`, `domain-modeling`, `code-review`, `wait-what` read it.)

## Rooms
- **Play**: the kids' door. Ultra-minimal. Tap the tank, pick a sound and a beat.
- **Studio**: the full rig: step grid, mixer, song files, undo, more settings.
- **Learn**: the lessons map and the lessons. A lesson owns the tank while it runs (`LAB`). No lesson speaks.
- **Listen first**: a round judged by ear plays nothing until the kid presses "listen" (it pulses); answers wait for it.
- **Part 2**: a lesson folded into another (ADR 0014): it runs straight after its parent's rounds and the lesson ends
  once. Never on the map alone (updown, findhome, intervals, song). **Rounds**: 3 or 5 a lesson, never 10.
- **Copy the Beat**: the drum-grid echo (id `sayplay`, ADR 0013). **Drum colours**: kick purple, snare red, hi-hat
  yellow, in learn and in studio's step grid.
- **Tools**: four standalone windows (metronome, circle of fifths, chords, drum machine) that borrow studio's live controls.
- **Splash / doors**: the first screen with learn / play / studio / tools.

## The tank
- **Tank**: the glass shape notes bounce in. Drawn by the canvas (`#cv`) or the GPU (`tank3d.js`, `#cvGL`).
- **Wall**: one side of the shape. Every wall is a note (`edges[i].cents`). Ringing a wall = `LAB.strike(i)`.
- **Shape**: a 2D polygon (prism in 3D) or a **solid** (cube, octahedron...). Grow ops: **cut / puff / flip**.
- **Orb**: a solid with one face per note (`orbN`, N = the tank's notes, 12..124), faces spread by the golden angle and
  climbing low to high. Picked as "orb" in studio's shape menu; a new scale or range regrows it.
- **Space**: `normal`, `portal` (two **wormholes**, each holding a wall for a bar, then sliding on), `curved` (hyperbolic). `TSPACE`, not `SPACE` (that name is taken). On **auto**, play
  mixes them in on 1 reform in 3; studio does too, but only while the slime is on. A shape or space picked by hand stays.
- **View**: 3D (default) or 2D, a look, not a speed setting. The tank has one render look, glass (ADR 0012); the page's crayon art is
  not a tank look.
- **Ball / note**: a bouncing note. It plays when it hits a wall. **Shot** balls (`mute:1`) don't re-play their first hit.
- **Goo / slime liquid**: the particles that fill the tank. When the tank is full it **bursts** (the goo pours out as a sticky liquid,
  `gooBurstStep`, drawn as one skin, `burstBlobs`) and **reforms** into a new shape (~64 bars).
- **Pane**: the front and back glass in 3D. Pane hits play soft chord tones and never feed the chord brain.
- **Spin**: the shape turning on its own axis (`rot`). Base spin is tempo-locked in play; a **flick** adds momentum (`SPINU`).
- **Seed**: hold-to-loop marker. Rings its spot once a bar. Does not feed the chord follower.
- **Strum**: a drag that starts on the rim and rings each wall it passes.
- **Chord jackpot**: the player's own taps/strums in one bar are exactly the sounding chord's tones -> reward.
- **Tap invite / tap bubble**: "tap to play notes and spin the shapes" on an empty play tank (`#tapInvite`). After the
  first tap it glides to the notes toggle and is gone for good. The slime is already on in play; nothing sounds before a touch.

## The music
- **Key / root**: `S.root` (MIDI note; the key menu shows the pitch class, the octave row sets the register).
- **Scale**: `S.scale`, one of 28, stored in **cents** (eight are microtonal). The FM-1 has those and 24 more (52). A **whole tuning** (19-, 24-, 31-EDO, all
  notes) has every note of an evenly split octave, not a 7-note pick from it.
- **Chord brain**: picks the band's chord each bar (`curRootDeg`). **Chord follower**: `noteFeed()` lets played notes steer it.
- **Key journey**: the slime moves the key every ~90 s (not when pinned, `_keyPinned`).
- **Slime / slime mode**: the auto-jammer switch (`#slimeBig`, `S.slimeMode`): moves key, spin, shapes, sound knobs (**MODS**).
- **Auto-notes**: the slime dropping notes by itself (`#autoNotesBtn`, `S.autoNotes`). Off in play, on in studio. In play the
  toggle sits just under the tank, with the word "notes".
  It is a melody with motifs (`autoMelodyNote`), and it only runs while the slime is on.
- **Rain**: the old steady note drop (`spawnRain`, `S.rain`). Runs only while the slime is off. Not auto-notes.
- **Band**: bass + comp + pad (+ drums). **Kit**: a drum style (pop, rock, disco, bossa, jazz, ...).
- **The mix under the melody**: every part sits under the melody by a measured margin (`dev-mix`). **Kit trim**
  (`KIT_DB`) is a kit's fader after the drum glue compressor; **piece trim** (`PIECE_DB`) is one drum's level per hit.
  A **soft kit** (bossa, jazz) sits further under.
- **Room**: the reverb (`makeRoomIR`): a 1.3 s room whose top dies first, 16 ms pre-delay. **Stage**: where a note sounds
  left to right, the side of its wall (up to +-0.4, low notes centred, the low end mono).
- **Drum bus**: the drums' glue compressor, low-mid body and presence dip (the site's `initDrums`; on the FM-1
  `sl_drum_bus`, each kit's glue measured against the site's).
- **Loop** (FM-1): REC's take of a hand's notes, kept as places in the bar and cents above the key, so it follows the
  key journey. Not a recording of audio (the FM-1 has 1 MB of flash). Not a **Seed**.
- **Wall guard** (FM-1, `s.guard`): the device tank's extra rules so no note sticks to a wall: the site's spinContain,
  a rattle thrown back to the middle, a crawling note melted, the auto adjuster's room. Off, the tank is the plugin's.
- **Splash** (FM-1): the slime guy and his jingle at power-on; then the tank waits for PLAY.
- **Chord follower by hand** (FM-1 `hand_deg`, the site's manualRoot): the chord of the notes a hand played in the last
  1.6 s holds while it plays. A **progression** (CHORDS page, the site's CHORD_MODE) owns the harmony over it.
- **Pattern** (FM-1 DRUMS page): a person's 16-step drum pattern, played by the rhythm's drummer, no fills. Not the
  rhythm's own 4-bar pattern.
- **Page** (FM-1): one button, one job: tank (HOME), song (SCL), mixer (GLO), fx (FX), sound (ENV), chords (EDIT), drums
  (SEQ), MIDI (SAVE). The four knobs are its values, shown on the page's **panel** under the tank. A **view**: the same
  button again shows the page's next four (mixer: levels, pan, delay sends, reverb sends). The three left knobs (SELECT,
  ALGORITHM, PRESETS) are the melody's, bass's and chords' **sounds** on every page.
- **Session** (FM-1): everything set, written to flash by itself 3 s after the music stops, read back at power-on. (SAVE's
  three songs went 2026-11-20; SAVE is the MIDI page.)
- **Site drums** (FM-1, `slime_drums.c`): the site's `dHit` recipes synthesized on the device, piece for piece
  (`check-drums.sh` against the browser's own render). Not SLOOP's drum synth.
- **Popping portals** (FM-1, `s.worm_pop`): four wormholes, bigger than the site's two, each living a bar on a wall, then
  closing and opening on another; a trip ends on the grid. The site's two **gliding** holes are `worm_pop` 0.
- **Page decorations** (FM-1, `slime_ui.c`): the lake (`fm1/host/gen-scene.py`, loaded into RAM under the splash),
  the **minis** (five pastel slimes round the edges, hop on each bar's 1) and the **worm** (the site's wiggle worm,
  bottom right). Drawn under the tank through `st_bg_row`, only where a frame repaints.
- **Pose** (FM-1, `sl_tpose`): the tank as a physics tick left it, kept so the screen draws the tank as the speaker plays
  it (~75 ms behind the plan). Not the splash's `sl_pose` (the slime guy).
- **Triangle mixer**: `#triMix` (melody / drums / band). **Mixer**: studio's per-part volume/mute/solo (`MIX`).
- **Beat lock**: balls are steered so their hits land on the grid (`beatLock`, `b.tq`).
- **Auto adjuster**: gives each shape its own pace with auto-notes on (`AUTO`, `autoRoom`): a notes-a-bar aim from its
  size, a room of balls, and over the room the melody's oldest ball **melts** into the slime. Counts bars, not seconds.
- **Sync**: the one setting that lines up MIDI out and the visuals with what you hear. A tap-along measures your
  speakers' delay (Bluetooth is ~60-120 ms); the setting can also be nudged by hand. Not the MIDI clock.

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

# Which suites to run

Every suite: `node _dev/<name>.js` from the project root, with a server on :8765
(`python3 -m http.server 8765`). One at a time: each one kills chromium when it starts.
Every page a suite opens presses a lesson's pulsing "listen" button the moment it pulses (`listenKid` in
`browser.js`), like a kid who always listens first. `SLIME_LISTEN=wait` turns that off (dev-learn3 does).

## 1. Gates: always first, after every edit (about a second, no browser)
- `dev-syntax`: every script parses (the mid-line `//` trap).
- `dev-loadtest`: the CSS has no swallowed rules.

## 2. Targeted runs: the suites for what you touched (run these right after the change, not at the end)
| You touched | Run |
|---|---|
| the tall phone tank (play, portrait phones: the canvas at 2:3) | dev-tall, dev-phone, dev-devices, dev-hands |
| the worm (and anything that places the page decorations) | dev-worm (always shown, never covered, rests and rises, wiggles: play 1280/1440/phone, studio) |
| the page slimes' pictures or their hops (squish, cheer, beat bounce) | dev-squash (each picture's feet: on one line, never sunk, still on a squash; read from the PNGs' pixels), dev-decor, dev-crowding |
| the triangle mixer | dev-trimix (the knob lands where you press, a tile not a sticker, by the sound column, off the buttons) |
| the header / transport / any control's size | dev-decor (mascots whole, off the tank), dev-topbar, dev-a11y, dev-devices, dev-phone, dev-surface, dev-crowding |
| play mode, the tank gestures, auto-notes | dev-hands, dev-ux, dev-firsttouch, dev-firstfive, dev-controls, dev-guide |
| tank physics, spin, shapes, spaces | dev-hands, dev-space, dev-solid, dev-orb, dev-portal (the holes hold a bar), dev-beatlock, dev-revive, dev-fluid |
| the solid maths (any solid, orbs) | dev-solid, dev-orb, then `node _dev/solid-ref.js` and `cargo test` in `vst/` (the plugin checks against it) |
| auto-notes pace per shape (the auto adjuster) | dev-autoadjust (~4 min, seeded) |
| play mode's first minute (slime on, the tap bubble, the notes toggle under the tank) | dev-play, dev-firsttouch, dev-ux 1 |
| the goo | dev-burst (the burst: a liquid, no dust, clings then drains, one skin; 3 seeded bursts), dev-goocolour (the colour glides: no jumps, no turning back), dev-slimecontrast (SLIME_GL=1: a shade darker than the page, the chord colour wheel), dev-goopro (SLIME_GL=1: wet, volume, colour, the worker), dev-goo3d, dev-goosmooth, dev-goolook, dev-gl |
| the 3D look / GPU tank | dev-gl, dev-look3d, dev-goopro (one look: glass, ADR 0012), dev-3d, dev-shapes, dev-potato |
| the frame loop, render cost, pixel ratio (the render governor) | dev-governor, dev-perfmode, dev-potato, dev-phone, dev-gl |
| harmony, keys, scales, the chord chip | dev-chordtest, dev-harmony, dev-harmony2, dev-world, dev-tuning, dev-band, dev-melody |
| drums, bass, mix, audio | dev-handtime (a hand's note rings in ~4.5 ms, steady to 0.5 ms, even in a busy tank; rendered offline), dev-slimesound (a filling tank: low-passed, not thinned, no louder, softer starts), dev-audiopro (the limiter, the room, the stage, brightness, attack, drum timing), dev-mix (slow, ~25 min for 11 kits; `node _dev/dev-mix.js pop,jazz` for some), dev-drums, dev-bassmix, dev-chordbed, dev-sound, dev-fidelity, dev-realaudio, dev-audible, dev-silence, dev-ceiling |
| studio tools (mixer, undo, song files, step grid) | dev-studiokeys (Space, focus, keys named), dev-daw, dev-declutter, dev-hostile, dev-tools, dev-chords, dev-studiopolish (tabs, segmented rows, tempo drag, mixer colours, first screen), dev-seq |
| share links, recordings, MIDI | dev-midiprompt (no browser MIDI prompt on a first tap; asks only when switched on), dev-ux (section 7), dev-takes, dev-wavtap, dev-midi, dev-midiexport, dev-manualnotes |
| lessons / the map | dev-learn3 (no voice, listen first; runs without the listen-pressing driver), dev-lessons (slow, ~7 min), dev-map, dev-learnmap, dev-curriculum, dev-playable, dev-cheat, dev-answerable, dev-oneanswer, dev-earwork, dev-explore, dev-jam, dev-rjam, dev-make, dev-compose, dev-newunits, dev-review, dev-rest, dev-staff, dev-nolab |
| pages, copy, claims, offline | dev-claims, dev-naming, dev-links, dev-sw, dev-entry, dev-polish, dev-sweep, dev-monkey |
| the tank's physics or auto-notes, when the plugin must match it | dev-vstparity (~6 min; rewrites `_docs/specs/2026-10-28-tank-headless/web-stats.json`, so commit the new numbers with the change). `SPEEDCHECK=1`: fast clock vs real clock. `SABOTAGE=quantoff` passes only if "share on grid" leaves the stored band (the instrument can tell). |
| the web's auto-notes melody (`setDeg` / `noDrone` / `nextMelodyDeg`) | dev-vstmelody (1 s, no browser; rewrites `vst/slimehedron-core/src/tank/melody_golden.txt`, then `cargo test melody` in `vst/` must pass or the plugin's melody has drifted from the web's). |

## 3. The sweep: every suite, once, at the end of a pass, with no edits while it runs
In the cloud workspace: `/root/run.sh <log> -- <suites...>` writes `/tmp/<log>.log`. A full sweep takes 2-3 hours.
Then rerun only what failed. A failure that passes on rerun goes on the flaky list below, with a note.

## Known flaky (fix the cause; until then, rerun and run a control on the previous commit)
- Failing on 6b39647 too (controls 2026-11-07, not from the slime work): `dev-gl` "its clear faces flood with their notes' colours
  when struck" (38.0 -> 37.1 on the control) and `dev-look3d` "a note's rim is clearly darker than its middle" / "its edge
  stands out" / "the rim is its own colour". Not chased yet.
- `dev-sw` served `/root/plinktest` (the cloud box only): it now serves the project folder and passes here.
- `dev-chordbed` "the chords stay audible at every bass/pad crossfader position": read ~0.001-0.006 at position 1 about
  1 run in 2 (2026-11-07: 2 of 4; 2026-11-24: 6 of 15, all on that pass's commits, 0 of 3 on 1490a61, though that pass
  changed nothing the band plays; the mechanism is below). Fixed 2026-11-24: the
  crossfader only sets the bass's level, and a trace of the chord bus itself showed the comp resting 5.7 s (0.0000)
  while the crossfader sat still, so one 6 s window per position read a rest. Each position now keeps the loudest of
  four 3 s windows taken in turn (SAB=xfade, the old bug, fails it).
- `dev-phone` "the key changes on its own over 200 bars": 1 key once (2026-11-25), 2 and 3 on the two reruns; the key
  journey is random and 200 bars is near its floor. Not chased yet.
- Seen in the 2026-11-24 sweep, each red on 1490a61 too (controls), not from that pass: `dev-slimecontrast` 2. [3d] the
  green, 0 px of goo (it needs SLIME_GL=1, a real GPU, as its row says; on software GL the goo is not drawn in time),
  `dev-perfmode` (lite vs full frame cost, 83-100 vs 50-83 ms on both), `dev-potato` curved/portal ratios and "performance
  mode makes 3D cheaper" (both commits), `dev-harmony` (green 4 of 4 in the A/B; two different checks failed once each),
  `dev-beatlock` [2d 6] / [3d 6] "on the grid" (31-43 of 47-56 within 20 ms; on 1490a61 too, not chased: see the
  handoff's slow-device tick cap, a dropped backlog slips beat lock off the grid). Fixed the same day: `dev-3d` "the
  selected button wears the glass rim" (it looked for the old ::before; the rim is a .rim>i child since 585a20c),
  `dev-declutter` "the one in Preferences still switches MIDI out" (headless Chrome refuses MIDI and the app rightly
  turns the switch back off; the suite gives it a stub port, as dev-midi does), `dev-learn3` 07 (a lesson's ring starts
  2 ms after its time since dev-handtime, not 8-25: the window is 1-26 ms).
- `dev-potato`: the curved/portal frame-cost ratios swing between runs on the cloud box (timing noise).
- `dev-bassmix` 4. [play jazz]: live mix level, bass sometimes lands just over the 5 dB window.
- `dev-perfmode`, `dev-harmony`, dev-a11y "chord changed", dev-lessons HOME card: timing.
- `dev-portal` [3d icosa] "comes out of the OTHER hole" (3 of 8 runs on 139ca19, same 11.6 / 40.9 px each time:
  a second, deterministic outcome) and "[glass]/[crayon] each one clearly stands out" (4 of 6 control runs). Not chased yet.
- Failing on 1d535a6 too (controls 2026-11-08): `dev-goolook` (its saved reference is older than the slime overhaul:
  112 % of cells moved, a channel off by 255) and `dev-fluid` "[play] a paused tank is completely still" (37-39
  moving frames). Not chased yet.
- Sweep 2026-11-08/10, passed on rerun: `dev-mix` 4. pop "every hit's loudest 100 ms" (ht -1.6 LU, once), `dev-audiopro` 3.
  "the whole mix is wide but whole" (r 0.961, once; 0.91-0.93 in three runs before it). Not chased yet.
- `dev-governor` "gets to 1 within 5 s" (5019 ms) and "steps back up" (never): failing on 6b39647 too; it reads this
  machine's real frame cost, which never counts as light here. Not chased yet.
- `dev-daw` "mute really silences the drums": 1 run of 3 read the drums at 0.0029 before mute (0.025 otherwise;
  2026-11-08): the 1.4 s window caught them before they started. Not chased yet.
- `dev-goopro` 1. "the main thread spends at most 1.5 ms a frame on the goo": read 3.0 and 3.9 ms p95 in two runs of
  ~10 on 2026-11-08 while other work ran on the box (0.2-0.7 ms otherwise). Not chased yet. (Its old check 3, edge vs
  middle lightness, was removed: it could not fail.)
- `dev-3d` 1. "they travel front to back through the box" (1 in 3 runs on the tumble commit: 2 of 6 balls past 0.8 of depth in 9 s).
- `dev-portal` "each one clearly stands out" (both looks): the saturation behind a hole swings 0.09-0.27 from run to run
  because the holes sit over different parts of the background art (grass vs cloud); about 1 run in 3 fails on any commit
  (control 2026-11-02 on a810fb2 too). Goo and balls are now cleared before the picture. Fixed 2026-11-12: it compares the
  hole with the same spot in the same frame by colour difference (>= 60 of 765; a hole reads 80+, hidden 0), not a
  saturation ratio.
- `dev-mix` 6b "the drums sit at least 6 dB under the melody in the presence band": -5.3 to -6.0 dB on pop, samba and march
  (sweep 2026-11-13, one of three kits on the rerun); a real-time capture sitting on the margin. Not loosened; not chased yet.
- `dev-rest` "playing the notes... FINISHES the lesson" failed from 2026-11-10 (extra taps cost a note) until 2026-11-13: the
  DRIVER tapped up to 700 ms early and tapped a note again every 90 ms; it taps each note once, on time, now.
- `dev-look3d` needs `python3` with PIL (dev-crayon was retired with the crayon look, ADR 0012); on Flah's Windows box `python3` is a Store alias (make a venv shim named python3).
- `dev-gl` (needs SLIME_GL=1; runs on Flah's GPU) "the goo is a real 3D surface": 96-120 triangles some runs (fails 1 in 2; also before the tumble, 7d3f3bb).
- `dev-hands` 3. "a flick keeps it spinning": 0.00 turns a second once (2026-11-02, right after a long run of suites), then 0.77 and 1.14 on reruns; the flick reads pointer timing.
- `dev-goosmooth` 3. "rebuilding the surface" (4 ms): the machine's speed, not the code. 2026-11-23, same code, four
  runs: 2.8 / 5.4 / 4.4 / 3.8 ms, and the physics tick timed in the same runs moves with it (0.4 ms beside 1.9, 0.8 beside
  4.0): whole runs are slower (clock or heat). Its "redrawn on every frame" flake (0 or 149 repeats) was lite mode
  switching on during the software-GL load; the suite pins lite off now.
- Seen 2026-11-21: `dev-solid` [phone studio] "the corner menu ... sits on no control (covers sgCell)" once, green on rerun.
  Fixed 2026-11-23 (each was failing on f8b5849 too): `dev-fluid` pause (play opens playing now; the suite presses pause),
  `dev-goosmooth` repeats (lite mode switched on in the software-GL load; pinned off), `dev-gl` floods (the flash faded on
  the clock before the screenshot landed; held), `dev-goolook` (its plant did not pin the turn or the chord colour; the
  reference re-saved), `dev-crowding` [learn/landscape] (the map's words were not in the keep-out list: an app fix),
  `dev-look3d` rim (it looked for the note where the flat projection put it, not where the tumbling GPU box drew it; it
  finds the roundest blob now). dev-look3d finds python as python3, py or python (with Pillow).
- `dev-hands` 1. "tap it and the slime plays notes" (1 in 7 s once) and 3. "a quarter turn" (97 degrees sits on the 0.12 rad edge).
- Fixed 2026-10-27: `dev-crayon` (the tap invite faded in over its frozen frames) and `dev-portal` GL visibility.

## Writing a new suite
- The header comment says, in plain words, what a person sees or hears that it checks.
- Sabotage it: break the feature on purpose a few different ways; every break must turn it red. Write down which.
- Set `slimehedron-coach`, `slimehedron-coach-studio` and `slimehedron-tapped` unless the hints are what you test.
- Add it to the table above.

# Slimehedron on the FM-1: the port (2026-11-11)

Status: in-progress

Flah, 2026-11-11: "start prep for FM1 ver in separate folder, just keep most we can including noneuclidian visuals".
Answers to the brief's questions (`_docs/specs/2026-11-03-fm1-firmware/brief.md` section 8), "stick with recommended":
1. Fork SLOOP (Felucca family: open hardware layer, dual-core audio, browser preview).
2. The control map in brief section 5, as is; tune by hand on the device later.
3. The goo: lighter but real (fewer drops; it still slows balls and softens notes).
4. Sounds: synth only, from the FM-1 firmware's own engines (brief 3c); the sample kits and SAMPLE presets off.
5. (Does Flah own an FM-1, on V15?) Still open. Nothing is flashed without asking, whatever the answer.

Everything lives in `fm1/` (C99, no malloc, a host build that tests every piece against numbers lifted from the web
app). Nothing here edits `index.html`, `tank3d.js` or `vst/`.

## Done means (for the whole port)
The brief's section 6 numbers, measured in fm1-emu: no audio underruns at the worst case, a key sounds in the next
audio block, a steady >= 30 fps at the worst case, >= 1.5x real time at the lowest clock, flash fits with room for a
song, RAM high-water pinned. Every core piece matches the web's numbers in the host build (double), and the device
(float) build within a stated tolerance.

## Facts found 2026-11-13 (primary sources; the earlier "RP2350" in this spec was a guess and is wrong)
- The FM-1 is a **JieLi AC791N**: two 32-bit **pi32v2** cores at 240 MHz, a 240x240 SPI LCD (12 MHz SPI), stock flash a Puya
  part (units since autumn 2026 ship a different part). RAM and flash sizes: not published. Source: the fm1-emu README
  (https://github.com/joakimeriksson/fm1-emu).
- **fm1-emu** (MIT, Joakim Eriksson) runs FM-1 firmwares unchanged in the browser and natively:
  https://joakimeriksson.github.io/fm1-emu/ ; `?package=URL` loads a `.fwsc` from any https site with CORS, `?fw=` a Hub
  firmware; `FM1_STRICT=1` adds cycle counts and LCD timing. This is the bench for tickets 08/09 (no device needed).
- **SLOOP** (GPL-3.0-only, https://github.com/isod89/sloop-fm1) builds with the JieLi AC79 SDK (Apache-2.0,
  gitee.com/Jieli-Tech/fw-AC79_AIoT_SDK, tag AC79NN_SDK_V1.2.1_2023-12-13) and JieLi's clang 4.0.1 pi32v2 toolchain
  (`tools/get_toolchain.sh`; Linux native, macOS via Docker; Windows via WSL `INSTALL-SLOOP.bat`). Output: `build/*.bin` +
  `loader/ota.bin` packed as `.fwsc`. Install from a browser (Chrome/Edge, WebMIDI) at https://isod89.github.io/sloop-fm1/ ;
  rescue: hold OCT- while switching on. Its DSP also builds to WASM (Emscripten) for a browser preview.
- Felucca's wiki warns M-VAVE's updater can revert a unit to official V15.

## Tickets
| # | Ticket | Status |
|---|---|---|
| 01 | Solids: planes, faces, cut/flip/puff, orbs (`core/solid.c`), banded renderer (`core/draw.c`) | done (00354f4, 69e746a) |
| 02 | CURVED SPACE: the hyperbolic tank, walls as arcs, the ball step (`core/space.c`), and its look with the mirrored copies (`core/drawspace.c`) | done (this pass) |
| 03 | PORTAL SPACE: two wormholes gliding round the walls with the beat; a ball drawn in and spat out (web: wormPlace, wormEnter, wormExit, wormPull) | done (this pass): the web's dev-portal checks as numbers |
| 04 | The tank tick in normal space: 2D plus depth, walls as notes, beat lock, quantize hold, auto-notes, open walls (`core/tank.c`, `core/music.c`) | done (this pass): every number the plugin's |
| 05 | 2.5D look for normal and portal space: front and back outline, near faces tinted, z-sized balls with floor shadows, banded, redraw only changed bands | normal and portal space done (this pass, `core/drawtank.c`); redrawing only changed bands open (needs fm1-emu to be worth measuring) |
| 06 | Music logic: the auto-notes melody (`core/melody.c`: the web's 6000 golden notes note for note, every random number used; sabotaged 3 ways) | melody done; the chord brain and pane chords open |
| 07 | The goo, lighter but real: a capped particle count plus a level; it must still slow balls and soften notes | done (this pass): the light goo, 94 KB, plays like the plugin's by statistics |
| 08a | THE BRIDGE on the host: the tank plays SLOOP's engines through SLOOP's own DSP sources, microtonal (`fm1/firmware/slime.c`, `host/slimehost.c`) | done (2026-11-14): 20 checks, sabotaged 4 ways |
| 08b | The device build: JieLi toolchain + 3 SDK files in WSL, stock SLOOP 2.8.5 built and booted in fm1-emu on BOTH flash parts | done (2026-11-15): stock 2.8.5 builds (571,820 B) and boots in fm1-emu on the P25Q80 and the UC25HQ80, keys sound |
| 08c | Make room | first cut done (2026-11-15): pool 334,756 of 344,064 B with the tank in, flash 385,384 of 581,564 B (see below) |
| 08d | The tank on the device | it runs and plays in fm1-emu (2026-11-15), in the audio interrupt, software doubles. Open: single-precision on the chip's float unit, the worst case (full goo, 12 balls), off the interrupt |
| 08e | The screen: drawtank / drawspace / draw into SLOOP's LCD path, sending only changed bands (a full frame is 77 ms of SPI) | open |
| 09a | Sounds by measurement (brief 3c): melody, pane chime, bass, pad, comp and the 11 kits matched to web renders | open |
| 09b | The band: the chord brain and pane chords in C (ticket 06's rest), bass on track 2, pad/comp on track 3, drums from the web's patterns | open |
| 09c | Controls and LEDs (brief section 5) on SLOOP's input layer; chord-tone key LEDs | open |

## Ticket 02 (curved space), as built
- `_dev/space-ref.js` lifts the web's own curved-space code out of `index.html` and runs it in node (sound and
  splashes stubbed), writing `_dev/space-ref.json`: curved 3- to 8-gons, their walls, 18 ball flights of 900 ticks.
- `fm1/host/check-space.js` (`wsl make -C fm1/host space && node fm1/host/check-space.js`):
  1. corners where the web puts them (the same tiling k, radius), 2. every wall's hyperboloid normal and arc,
  3. the same walls hit at the same ticks: the double build the WHOLE flight (all 379 bounces, the path to 1e-6), the
     float build the first 4 bounces (chaotic billiards: float rounding parts the flights at the 6th at the earliest).
- Sabotaged 4 ways, each caught: the reflection's sign, cosh and sinh swapped, the corner radius, the arc direction.
- The look: the tank and its first ring of mirrored copies (each in its wall's colour), balls shrinking toward the
  rim. 0.35-0.46 ms a frame on the host; the device is to be measured in fm1-emu (ticket 08). The second ring of
  copies is left out, as in the web's lighter look (it would cost ~76 KB of RAM).
- NOT CHECKED BY A MACHINE: whether the frames read well on the real 240x240 screen (`fm1/host/curved*.png`).

## Ticket 04 (the tank tick), as built
- `core/tank.c` is the plugin's headless tank (`vst/slimehedron-core/src/tank/mod.rs`) line for line, with its goo
  (`core/goo.c`, from `goo.rs`), scales, home chord and seeded random numbers (`core/music.c`), and the melody.
- The reference is the plugin itself: `fm1/host/tankref` (a tiny Rust program, outside `vst/`, that depends on the core
  by path) runs the scenes in `fm1/host/scenes.txt`; `fm1/host/tanktest` runs the C tank through the same scenes.
  Both print every hit and, every 30 ticks, the balls, the open walls and the goo. `wsl make -C fm1/host tank && node
  fm1/host/check-tank.js`: 5 scenes (6/5/12/3/8 walls; major, pentatonic, 19-EDO all, minor, dorian; spin, chaos,
  quantize off, swing off, fixed velocity, auto-notes off; 80-140 bpm; 12-72 bars, the goo filled to 0.9):
  1,879 hits and 818 snapshots, every number the same double.
- Both are built in WSL so they share glibc's maths. One function is not glibc's: Rust's `f64::cbrt` is correctly
  rounded (glibc's is up to two ulps off, e.g. cbrt(51)), so `goo.c` rounds its cube root exactly (checked against
  Rust over 6000 inputs). sin, cos, exp, ln, log2, atan2 and hypot were checked over 20000 inputs: identical.
- Sabotaged 4 ways, each caught: beat lock's steer rate (5 scenes red), the goo's gravity (6 checks), walls not pulled
  onto the home chord (4), quantize waiting 50 ms not 45 (4). (A first try, beat lock's 1.22 clamp, changed nothing:
  the target is already chosen within 0.22, so that clamp never bites. Not a useful sabotage, kept out.)
- Cost on this pc: ~0.2 ms a tick averaged over 24,515 ticks (printing included). RAM: 924 KB, nearly all the goo's
  two grids (the neighbour grid 403 KB, the density grid 255 KB). The chip is a JieLi AC791N (see Facts below; its RAM is not published), so ticket 07's light goo is a
  must, not a nicety: a hashed neighbour list and a coarser density grid in float, checked by statistics (notes a bar,
  fill curve, how much the goo slows a ball) against this exact one.
- Still double. The device's float build (and whether the tank can stay double: the pi32v2 core's float support is not published: measure in fm1-emu)
  is measured in fm1-emu (ticket 08).
- The chord brain is not in the plugin's tank yet (the home chord stays the key's), so it is not here either.

## Ticket 07 (the light goo), as built
- `core/goo.c` has three builds. Default: the plugin's goo exactly, dense grids (the tank 903 KB). `-DSH_GOO_HASHED`:
  the same goo with both grids hashed into small bucket tables; a bucket's chain, kept to its own cell, gives the same
  pairs in the same order and the same sums in the same order, so it still matches the plugin to the last bit
  (`node fm1/host/check-tank.js tank_hashed.txt`, 1,879 hits) in 270 KB. `-DSH_GOO_LIGHT` (the device): hashed,
  float (built with `-fsingle-precision-constant`), half the drops at 2^(1/3) the size (the same volume, so the same fill
  and the same thickness), 3 drops a splash instead of 5 (5 made the light goo end fuller in sparse scenes: 0.99
  against 0.91). 94 KB for the whole tank; ~1.7x faster than the exact build on this pc.
- `fm1/host/check-goolight.js` (`wsl make -C fm1/host goo-stats`): 16 seeds over three shapes (6 walls 72 bars,
  3 walls 40 bars, 8 walls spinning 48 bars), the exact goo against the light one. Measured: fill means within 0.024
  (allowed 0.05), notes a bar within 5% (12%), the late/early ball speed within 0.005 (0.02), gooed notes softer
  (impact 0.40 against 0.77 clean; the plugin 0.45 against 0.78), the tank in 128 KB.
- Sabotaged 4 ways: a light splash keeping 5 (caught: fill 0.079 off), density by area instead of volume (7 checks),
  the full drop count (caught: ball slowdown), drops growing half as fast (NOT caught: they reach full size in ~1.7 s
  instead of ~0.9 s, which no bar-level statistic sees; left as is rather than tightening a tolerance to catch it).
- Not measured yet: the light goo's time on the AC791N (ticket 08, fm1-emu), and how it looks (ticket 05 draws it).

## Ticket 05 (the 2.5D look, normal space), as built
- `core/drawtank.c`: the web's canvas 3D view (draw3D, P3, drawBalls3D) at 240 px, in 16-row bands: the box through
  the web's camera (P3, CAM 1000; `st_tumble` is the web's play/studio turn, Ry(a)*Rx(b)), the lilac back pane with
  the balls' shadows, each wall a glass pane in its note's colour (lit when struck), the corner rails, the back rim, the
  goo (pooled drops mint, a shade darker than the page; spray fainter), the balls far to near (a near ball bigger, a far
  one hazier), the front rim on top. An open wall is not drawn.
- `core/paint.h`: the pixel helpers the three renderers share (colours, a polygon's span and a line's pixels on one
  row). draw.c and drawspace.c moved onto it; their frames are byte-identical to before (orb93, icosa.cut, curved 5/6/7).
- `wsl make -C fm1/host draw` (then `node fm1/host/check-drawtank.js` for PNGs, 2x): the studio scene played 40 bars
  on the light goo (fill 0.58), drawn from three camera turns. Checks: banded = whole (no seams); each wall's front edge
  shows its note's colour, from the tank's degrees (edges under 10 px, seen edge-on, skipped); each ball shows its colour
  at its projected centre (balls under a rim, a rail or a nearer ball skipped); a near ball drawn bigger; the goo shows.
  0.19-0.29 ms a frame on this pc; the view 22 KB, the band 7.5 KB.
- Sabotaged 3 ways, each caught: drops near a band's top left out (seams), each wall in the next note's colour (rim;
  the first version compared the pixel with the view's own colour and missed it, so it now asks the tank), no
  perspective (near/far size).
- NOT CHECKED BY A MACHINE: whether it reads well on the real screen (`fm1/host/tank0..3.png`), the goo's look (a hard
  mint mass; the web blurs its blobs), the speed on the AC791N.

## Ticket 03 (portal space), as built
- `core/tank.c`: the web's wormPlace, wormTick, wormAt, wormEnter, wormExit and wormPull for the 3D box (settings
  `space = SH_SPACE_PORTAL`). Two holes rest mid-wall and glide to a neighbouring wall on every beat (the slide in the
  first 60% of the beat, eased; mostly the same way round; never both to one wall; drifting front to back), shrinking to
  slip round corners and making room for each other on one wall. A ball meeting a hole is gone for half a beat
  (240-520 ms) and comes out of the other one at its speed, its heading across the wall carried over, ringing that wall.
  Near a hole a ball heading for its wall bends toward it. Off (normal space) it takes no random numbers, so the normal
  tank still matches the plugin number for number (check-tank, both goo builds).
- The plugin has no portal space, so there is nothing to match number for number: `fm1/host/portaltest.c`
  (`wsl make -C fm1/host portal`) runs the web's own checks (`_dev/dev-portal.js` 2-6) as numbers: holes on a wall and
  inside it, open at rest (84 px), never overlapping; in silently, never lost, out of the OTHER hole 10.5 px off its wall,
  heading away at the same speed, inside the tank, ringing its wall; a bounce anywhere else; the glide (4927 px moved in
  the first 60% of the beats against 10 in the rest, 6 walls visited, 13.6 px the largest step a tick, 29 of 84 px at a
  corner); 14 s busy: no ball lost, 2 trips among 56 wall notes.
- Sabotaged 4 ways, each caught: out of the same hole, gliding all beat long, no ball ever going in, the wrong speed out.
- The look (`drawtank.c`): each hole a disc on its wall's plane in the web's colours (deep purple rimmed pink, deep
  blue rimmed teal), a ball inside one not drawn. drawtanktest: two drawn, each standing out against the same frame with
  them hidden (colour change 1.18 and 1.22; sabotaged: holes barely drawn, caught), none in a normal tank.
- Left out (visual only): the ball's spiral in and its swell out (wormView), the holes' pulse before a spit.

## Ticket 08a (the bridge), as built 2026-11-14
- Base pinned: SLOOP 2.8.5, commit bac9c05 (`fm1/firmware/SLOOP_PIN`), the first SLOOP that knows the UC25HQ80 flash of
  units sold from late 2026 (research: `_docs/research/2026-11-14-fm1-firmware-base.md`). SLOOP is not vendored: `fm1/firmware/`
  holds only our files, built on top of a checkout (`build-host.sh` refuses any other commit).
- `fm1/firmware/slime.c` (GPL-3.0-only, as SLOOP): included into SLOOP's unity build after seq.c, changes no SLOOP file.
  Once per 32-sample control block it runs the tank's 60 Hz ticks off the sample count and plays each hit on synth
  track 1 at the moment the tank says it sounds. A wall's cents go to the nearest MIDI note and the rest into the
  voice's `fine` (SLOOP's own unison/TUNE factor). A note waits while SLOOP fades a track to a new preset.
- `sh fm1/firmware/check-host.sh` (WSL, gcc + python3 only): 3 scenes of 32 bars (major 6 walls, 19-EDO 12 walls,
  pentatonic 5 walls): every hit a note (290 / 295 / 293), none dropped, none later than one block (0.73 ms), 9.1-9.2
  notes a bar, peak -5.2 dB, 150-180x real time on this pc with the light goo; the tank 99,224 B. Pitch: every degree of
  31-EDO, 19-EDO, 24-EDO and major within 1.4 cents on KALIMBA, GLOCKEN, SOFT KEYS, SUB BASS; without the fine pitch
  48 cents out (the check can tell).
- Sabotaged 4 ways, each caught: the note queue cut to 2 (dropped), notes fired from a stale time (late), the fine pitch
  at half strength (24 cents), the fine pitch off (48 cents).
- Not checked: detuned or inharmonic presets (SINE PAD, SAW PAD, FM6, PHYS bars) confuse the pitch meter, so they are
  not in the check; FM6 read exact octaves off, which is the meter. How it sounds: `~/fm1w/out/song-*.wav`, nobody has
  listened. Note length (110 ms), velocity and the goo's softening are placeholders for ticket 09a.
- BLOCKED (08b): `tools/get_toolchain.sh` (JieLi's compiler from pkgman.jieliapp.com) and the SDK clone from gitee were
  stopped by the session's permission check. Flah runs them once, or allows them:
  `wsl -e bash -lc 'cd ~/fm1w/sloop-fm1 && tools/get_toolchain.sh && git clone --depth 1 --branch AC79NN_SDK_V1.2.1_2023-12-13 https://gitee.com/Jieli-Tech/fw-AC79_AIoT_SDK.git ~/fw-AC79_AIoT_SDK'`
- Changed by a fact: the brief's ">= 30 fps" needs partial redraw. fm1-emu times a full frame at ~77 ms of SPI.

## Tickets 08b-08d (the device build), as built 2026-11-15
- Flah ran the downloads (JieLi toolchain 20260730.1, clang 4.0.1; the AC79 SDK tag). `fm1-emu`'s batch runner builds with
  cargo in WSL (`fm1-live` needs ALSA headers, not installed, so no STRICT cycle counts yet). The runner is ~40x slower
  than real time on this pc: 9 emulated seconds take about 6 minutes.
- `sh fm1/firmware/build-device.sh` (WSL): copies the pinned checkout to `~/fm1w/slime-fw` without `assets/samples-cc0`
  (synth only: the recordings were 234 KB of a flash window with 10 KB free), applies `patch_sloop.py` (8 exact-text
  changes, each must match once), compiles `fm1/core` with JieLi's clang and links it with the toolchain's libm, libc
  and compiler-rt. SLOOP's own build checks all pass.
- RAM, measured: the punch-in effects' ring 65,536 -> 2,048 B and the SLICER's recordings 32,768 -> 2,048 B make room for
  the tank (those two effects have nothing to chew on now; nothing else changes). The spectrogram's picture moved to the
  low SRAM, and the device keeps 32 hits a tick, not 64 (`SH_MAXHITS`, 72 B each). RAM is 512 KB in all (app.ld).
- In fm1-emu, UC25HQ80 flash, 9 s, no key touched: the tank starts by itself and plays KALIMBA on track 1 from 2 s on
  (peaks up to -11 dB), 1,521 audio halves (none missing), SLOOP's screen alive and showing the preset. The audio
  interrupt takes 23.1% of core 0 against 12.5% for stock SLOOP idling: about 10 points for the tank plus its voices,
  with the goo still nearly empty. THE WORST CASE IS NOT MEASURED (full goo, 12 balls: minutes of emulated time).
- Float, measured with the compiler: the default target has no float unit (every float and double operation is a
  library call). JieLi's own SDK builds this chip with `-mcpu=r3 -mfprev1`; with those flags single-precision becomes
  machine instructions and only doubles stay library calls. So the device tank should be single-precision. Not yet
  tried: whether fm1-emu runs those instructions, and SLOOP itself is built without them.
- `-fsingle-precision-constant` is not supported by this clang, so the light goo's constants are doubles on the device
  for now (slower, same sound).
- NOT CHECKED: nobody has listened to `~/fm1w/out/slime-uc.wav`; the P25Q80 run of our build (stock was run on both);
  saving and updating with our build on either flash; anything on a real FM-1. Nothing has been flashed.

## The tank on the screen, drums, levels (2026-11-15, second pass)
Flah: owns one of the NEWER FM-1s (UC25HQ80 flash). "Get rid of anything that looks like sloop", keep its sound engine,
fx and params; do the dB testing yourself from the site's levels; nobody listens to renders.
- `fm1/firmware/slime_ui.c` replaces SLOOP's groovebox UI in the main loop (`patch_sloop.py`, 12 exact changes): the
  screen is the tank only (drawtank.c, 2.5D, 16-row bands sent while the next is painted, in SLOOP's old canvas memory),
  the boot screen says slimehedron. SLOOP's UI code is compiled but not called and the linker drops most of it
  (image 309,268 B). Still SLOOP's on purpose: the update-mode messages, the updater, the USB rescue, the web editor.
- Panel, first cut: keys = their note in the tank's scale at once + a ball; PLAY run/stand still; SELECT walls 3..12;
  ALGORITHM normal/portal space; PRESETS the melody's sound (8 synthesized: KALIMBA, MARIMBA, GLOCKEN, MUSIC BOX, SOFT
  KEYS, HARP, THUMB PNO, FM PLUCK); KNOB 1 tempo; KNOB 2 spin; HOME a new shape; MASTER volume. LEDs: PLAY, and the key
  nearest a note that rings. Not mapped yet: SCL (key/scale), FX, SEQ (kits), OCT, REC, SAVE, KNOB 3-4.
- The slime's cycle: after 64 bars or a full tank the shape reforms (walls from a list, 1 in 3 portal space, as the
  web's auto). No burst animation yet; curved space and the solids are in `fm1/core` but not wired to the screen.
- Drums: the web's own pop pattern (index.html KITS.pop, the masks checked against its lists) on SLOOP's synthesized
  80S kit, on the tank's swung grid. The other 10 kits, the bass, the chords and the chord brain: not ported (09b).
- Levels, by the site's rules (`_dev/dev-mix.js`) with the same K-weighted meter in the host bench: melody track 104,
  drums 28 (SLOOP's stock 100 put the drums 0.4-1.0 LU under the melody; the rule is at least 6). Measured on three
  scenes: drums 7.5-8.4 LU under, the mix -19.2 / -19.8 / -21.4 LUFS (site -18.8, window -21..-15), peak -5.2 dBFS:
  SLOOP's master limiter holds it there, so the slow sparse scene cannot be pushed into the window by a fader.
  `check-host.sh` is 33 checks now; the mix check is sabotaged (stock drum level: red).
- In fm1-emu (UC25HQ80, 7 s, three keys pressed at 5.2-5.6 s): the tank on the screen with struck walls lit, balls, the
  first goo, more balls after the key presses (`fm1/firmware/emu-tank.png`, frames at 3.0 / 5.0 / 6.9 s); 1,177 audio
  halves, none missing; audio interrupt 20.2% of core 0.
- THE OPEN PROBLEM: frame rate. The emulator counted 310 LCD transfers in 7 s; if that is one per band (15 a frame,
  not confirmed) the screen runs at about 3-4 frames a second. The draw is all software floating point on this build.
  Next: build with `-mcpu=r3 -mfprev1` (the chip's single-precision unit) and make the tank and the draw single-
  precision; then send only bands that changed.
- NOT CHECKED: anything on the real FM-1 (nothing flashed); saving, the updater and the rescue with our build; the old
  P25Q80 flash with our build; knobs and buttons other than three note keys; LEDs; the worst case (full goo, 12 balls);
  how it sounds.

## The usable test build (2026-11-16): FPU, the band, the conductor, the look
Flah: "fix the chip float shit", import the auto-play with the fills per rhythm, research the top firmwares (CoralFlower,
the Serum clone), studio only, a usable build to test tonight. The file: `_fm1-firmware/slimehedron-fm1.fwsc`,
installed with `_fm1-firmware/INSTALL-ON-FM1.bat` (SLOOP's own installer page, on localhost). `_fm1-firmware/HOW-TO.txt`.
- FPU: the whole image is built `-mcpu=r3 -mfprev1 -ffp-contract=off` (JieLi's SDK and X0X do); the tank is a
  single-precision copy made at build time (`floatify.py`: double -> float, literals get `f`, libm -> its float twins,
  sqrt -> a bit-trick + 2 Newton steps, worst error 5e-7, since the FPU has none and libm's loop was 46% of the time).
  The float tank plays like the double one (7.29 against 7.48 notes a bar over 10 seeds, within one SD). The panel's
  SPI at 60 MHz (X0X's measured setting); only the tank's box is resent. fm1-emu STRICT: 3.5 -> ~37 fps, empty tank.
- The band (`fm1/core/band.c`, tables generated from index.html by `fm1/host/gen-band.js`): the 11 rhythms, the fill
  windows (genFill), the bass (genBass, voice-led, lead-ins), the keyboard player (genComp, block / arp / broken, the
  bar-4 lick, the push), the genre's chord changes, the key journey. `node fm1/host/check-band.js` runs the site's own JS
  beside the C: 9,752 drum hits, 704 chord rhythms, 44 bass figures identical (sabotaged: red). Found on the way, in the
  SITE: drumSchedule passes bandPlan the bar inside the 4-bar loop (barI 0..3), so the site's bass figure never changes
  in a session and its chord rhythm repeats every 4 bars, against its own comment ("mix it up every 16 bars"). The
  device follows the comment (the global bar). Fixed on the site too, 2026-11-16 (sw v168, dev-band 4b).
  genComp's s.filter(k=>k!==clash[(rng()*clash.length)|0]) drew once per hit (none or several dropped): fixed in both.
- Sounds (all synthesized, SLOOP's engines): melody KALIMBA (8 to pick), bass MONO BASS, chords RHODES; each rhythm on
  the SLOOP kit closest to the site's KITTONE style (pop 909, rock 80S, disco DISCO, bossa / samba LATIN, conga AFRO,
  jazz JAZZ, march VINTAGE, chip CHIP, beep ARCADE, industrial INDUSTR). Picked by name and style, not by ear.
- Levels by the site's rules (`fm1/firmware/levels.sh`, K-weighted as dev-mix.js): all 11 rhythms pass; the mix
  -18.5..-19.2 LUFS (site -18.8); per-rhythm trims as KIT_DB (jazz's drums were 16.4 LU under). Sabotaged 3 ways.
- THE CONDUCTOR. With the tank ticking in the audio interrupt, a 160 s STRICT run (the goo filling) measured a 17.8 ms
  worst half against a 5.8 ms deadline and 2,975 missed deadlines: clicks. The tank and the band now run 45 ms ahead in
  the main loop (between every band of the screen) and queue each note's block; the interrupt only plays what is due;
  a hand's key still sounds at once from the interrupt. The host bench gives the same notes as before (290/295/293).
- The quarter goo (`SH_GOO_DIV=4`: 400 drops at 4^(1/3) the size, one drop a splash) passes every statistic against the
  plugin's exact goo (fill within 0.033, 8.02 against 7.97 notes a bar, the slowdown, the softening); 56 KB.
- Look: balls 1.35x (legible at 240 px); the slime takes the chord's colour on the walls' wheel; the wheel turns with
  the key; a reform BURSTS (the old slime and balls fly out and fade over 0.6 s); labels in plain words for every change.
- Panel (INSTALL.txt): all 13 controls pressed in one STRICT run, each label and effect seen in its frame
  (OCT+ / OCT- are OCTUP / OCTDN in fm1-emu's scripts: a first run used the wrong name and looked broken).
- Final 160 s STRICT worst case on this build: ~25 fps on average (worst frame 241 ms, when the goo is busiest), the audio interrupt's worst half 49% of its deadline, 1 deadline missed, 3 notes later than one block (0.73 ms), the tank tick 4.8 ms mean / 15 ms worst.
- NOT CHECKED BY A MACHINE: anything on a real FM-1 (nothing flashed); how it sounds (no one listened; the levels are
  measured, the timbres picked by name); tearing on the real panel (fm1-emu does not model the panel's refresh; X0X saw
  some at 60 MHz); saving (nothing to save yet); the old P25Q80 flash with this build; MIDI in and out.
- Left out: curved space and the solids on screen (in fm1/core, not wired); the chord follower and pane chords; the
  site's groove micro-timing and humanize knobs; song save; the 6 other synth sounds per part.

## Controls, the FX page, the humanized drummer (2026-11-16, later)
Flah: a usability pass; an fx page per part (bass / melody / drums), the standard fx the FM-1 firmwares use, simple
but powerful, merged dials, no wasted knobs; plenty of presets; the drums humanized like the site; test the slime.
- Research, from source: SLOOP gives every part a DJ filter, DIST, chorus / delay / reverb sends and an INSERT (soft,
  hard, fold, fuzz, crush, phaser, flanger, chorus: three values and a mix); its drum track a filter, an insert and
  delay / reverb sends but no DIST. CoralFlower lists filter, drive, chorus, phaser, delay, reverb. So the FX page is
  that chain: K1 FILTER (one bipolar knob), K2 DRIVE (drums: PUNCH, the kick ducking the band, since drums have no
  DIST), K3 ECHO, K4 SPACE, SELECT CHARACTER (the insert), ALGORITHM AMOUNT (depth + mix + intensity merged: a crush
  loses bits and rate together), PRESETS one of 14 fx presets. Echo time and room size are global (MIX page).
- Pages: HOME (tempo, spin, rhythm, key; shape, space, melody sound), FX (cycles the 4 parts), SOUND = EDIT (the 4
  parts' sounds, note length, chord length 1/2/4 bars, 9 sound sets), MIX = GLO (4 part levels down to off, swing,
  echo time, room size). Buttons kept to their printed meaning: OCT is the keyboard's octave (it had been the key),
  SEQ the band, ARP auto-notes, LFO the slime; REC, ENV and SAVE are left unmapped rather than misused. A page keeps
  its name at the top; the bottom line names its four knobs. All pages driven in fm1-emu strict, each label checked.
  Found there: the filter's centre detent snapped |f| < 3 to open, so single clicks never left it (fixed: it stops
  only when crossing the middle).
- Sounds: 10 melody, 8 bass, 8 chord presets, each trimmed to its part's default by measurement (all within 1.5 dB,
  check-host). Pads (GLASS PAD -40, WARM PAD -42, JAZZ ORGAN -39 LUFS against RHODES -26) never open on short stabs:
  left out. Found: AFRO KEYS listed on the wrong engine silently played that engine's first preset (FAT BASS):
  `slimehost soundcheck` now fails on any name its engine lacks. SOFT KEYS needed -21 half-dB (the limiter squeezes it).
- FX presets: every one on every part within 6 dB of the part's own sound (check-host); telephone first took the
  drums 12.7 dB down, then 6.2: eased to 20 / 30 / 40.
- The drummer (fm1/core/band.c, tables generated from the site's KITFEEL and SIMPLE): humanBeat's drift, humanVoice's
  velocity and timing (the beat locked, nothing past 22 ms), accFor's accents, genreShift (jazz's swung 8ths, bossa's
  lilt), the Human groove's breath, ghost snares and hats (fewer on SIMPLE kits, jazz only on the "&"), the pickup
  into each phrase. The site's pattern and fills are still matched note for note (ghosts are tagged and left out of
  that comparison). check-band.js adds 7 humanize checks over 256 bars per kit; sabotaged 2 ways (beat unlocked, no
  cap). Early hits need a lead: everything the conductor queues sounds 30 ms after its grid time (hands: at once).
  Jazz's and bossa's drums re-trimmed after it (the feel softened them: 14.7 and 11.1 LU under -> 10.8, 10.2).
- The slime, end to end (fm1/firmware/auto-check.sh, 168 bars, pop / rock / jazz): chords last exactly 2 bars from the
  rhythm's own progressions; the key moves at bars 40 / 80 / 120 / 160 (90 s), a fifth each, in 52..64; a crash on
  each move for pop and rock, none for jazz; every melody, bass and chord note in the key it sounds in (0 of ~3,000
  outside). Sabotaged 2 ways. Found on the way: the harmony log was written before the key moved (a log bug, not music).
- Sweep: every fm1 host suite green (solids, curved space, melody 6000 notes, the tank against the plugin, the goos,
  drawing, portals, band, levels, auto, check-host). fm1-emu strict 160 s: ~24 fps, audio 49% of its deadline at worst,
  0 late notes. Not checked by a machine: how any of it sounds; the real panel; MIDI.

## The site's drums, FM sounds, speaker rails (2026-11-18)

- **Site kits.** `fm1/host/gen-kits.js` turns the site's KITTONE and dHit voices into SLOOP drum-synth kits (SH POP ..
  SH INDUS, `slime_kits.py`), `patch_kits.py` puts them in SLOOP's generator, SLOOP's own `level_drumkits.py` levels
  their lanes (`slime_kit_levels.json`). check-host renders each kick dry: end pitch within 20% of KITTONE `ke`, -60 dB
  within 70..110% of `kd` (11/11; sabotage: the pop kick an octave up -> FAIL "ends at 96 Hz (site 48)"). The first
  measurement read 600-790 ms decays: that was the drum room (G_DRREV) on the tail, not the voice (SL_DRY=1).
- **FM patches** (`slime_fm6.py`, appended to Felucca's 8 by patch_sloop.py, slots F9..F12): SH TINE (Yamaha FM 101
  part 5, E.PIANO tine as DX7 alg 5), SH BASS (part 5's two-op bass + part 6's ratio-1.01 modulator; carrier sustain
  raised to 85/80 after measuring 16 LU under the part at the article's 70/55), SH HARP (part 6, HARP 1 as alg 3),
  SH BELL (Chowning 1973, c:m 1:1.4, index lowered so the fundamental stays strongest + a short ratio-3.5 strike).
  check-host: the strongest partial is the note's own at three octaves, degrees within 6 cents (sabotage: the bell at
  full index -> strongest partial 3.21x, FAIL). Trims measured (+14 dB for the bass on FM6). `fm6_poll()` now runs in
  our main loop: SLOOP calls it from ui_input, which this firmware does not run, so no FM6 patch could have loaded (none of our sounds used FM6 before).
- **Rails.** check-host 9: every fx knob, every fader +6, the biggest room, each character, filter shut / high-passed,
  the FM set: peak <= -5.0 dBFS (measured -5.21), <= -14 LUFS (worst -16.38), last 8 bars <= 3 dB over bars 9..16.
  Sabotaged: LIM_T at full scale (13/13 FAIL, peak -1.11), a loop gain over 1 in the echo (FAIL on loudness).
- **Knobs.** SLOOP's `accel()` (after JIANT FM) on tempo, spin, the fx knobs (now 1 value a detent slow), faders,
  note length, room size. Lists never accelerate.
- **Device** (fm1-emu strict 160 s): default ~24 fps, audio 55% worst, 0 late notes; dx set (three FM6 parts) ~16 fps,
  60%, 0 late notes. SLOOP already splits voices onto core 1 (units_split). Not checked by a machine: how the FM
  sounds and the kits sound; the knob feel on the real panel.

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

## Tickets
| # | Ticket | Status |
|---|---|---|
| 01 | Solids: planes, faces, cut/flip/puff, orbs (`core/solid.c`), banded renderer (`core/draw.c`) | done (00354f4, 69e746a) |
| 02 | CURVED SPACE: the hyperbolic tank, walls as arcs, the ball step (`core/space.c`), and its look with the mirrored copies (`core/drawspace.c`) | done (this pass) |
| 03 | PORTAL SPACE: two wormholes gliding round the walls with the beat; a ball drawn in and spat out (web: wormPlace, wormEnter, wormExit, wormPull) | open |
| 04 | The tank tick in normal space: 2D plus depth, walls as notes, beat lock, quantize hold (blueprint: the Rust core and `web-stats.json`) | open |
| 05 | 2.5D look for normal and portal space: front and back outline, near faces tinted, z-sized balls with floor shadows, banded, redraw only changed bands | open |
| 06 | Music logic: the auto-notes melody (`core/melody.c`: the web's 6000 golden notes note for note, every random number used; sabotaged 3 ways) | melody done; the chord brain and pane chords open |
| 07 | The goo, lighter but real: a capped particle count plus a level; it must still slow balls and soften notes | open |
| 08 | Firmware base: fork SLOOP, its toolchain (Docker), fm1-emu as the bench; the CPU budget per sound and golden render hashes (Felucca's discipline) | open |
| 09 | Controls and LEDs (brief section 5), sounds from the FM-1's engines (brief 3c) | open |

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

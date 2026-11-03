# Slimehedron for the M-VAVE FM-1 (custom firmware)

Status: needs-info (grill Flah on section 8 first, then /to-spec and /to-tickets)
Written 2026-11-03 by Cowork from Flah's ask. Facts were read from the source of `m-vave/fm1_open` (V14) and
`hugelton/Felucca` (1.x), and from the pages in Sources. CHECK = not verified, measure before trusting.

## 1. The ask (Flah, 2026-11-03)
Studio mode as custom firmware for the FM-1. Push the hardware to its limits without it feeling sluggish. Keep the
advanced geometry (solids, portal, curved), drawn flattened, "2.5D": reads as a 3D object, drawn in 2D. Map the
important controls to the FM-1's own knobs and buttons; where the panel already has the right control (MASTER =
master volume), use it as is. Learn from the other firmwares. High-quality synthesized audio. Verify in an emulator.

**Priority:** a side track. The web-first pass (`../2026-10-29-web-first/`) still comes first. This lives in its own
folder `fm1/`. Never touch `index.html` or `vst/` from here.

## 2. The hardware (from the SDK source, not from reviews)
- JieLi AC791N (WL82), two pi32v2 cores. Clock: 240 MHz per fm1-emu, "360 MHz DSP" per Felucca's docs. CHECK which.
- RAM: about 511 KB internal (`RAM0_SIZE` in `fm1_open/sdk/config/linker.ld.in`), no SDRAM. Flash: 1 MiB, single
  bank, and it is the tight one.
- Audio: 44.1 kHz (hardware 44118 Hz), 24-bit stereo out, 128-frame blocks per interrupt (~2.9 ms per block).
  Mono speaker plus a 3.5 mm out. No usable audio input.
- Screen: 240×240 RGB565. The official app paints it in 16-row bands through a 7.5 KB DMA buffer
  (`app/screen.c`), so no full frame buffer is needed (a full one would be 115 KB).
- Controls: 27 note keys (F3 to G5), 14 buttons, 7 endless encoders, 1 MASTER pot (an ADC), an LED per key and
  button. Buttons (enum in `fm1_open/app/screen.c`): OCT−, OCT+, FX, SCL, ENV, LFO, EDIT, GLO, HOME, SAVE, ARP, SEQ,
  PLAY, REC. Encoders: index 0 is the select knob, 2 to 5 are K1 to K4, 6 is the one HOME+turn uses. CHECK which
  printed label each index is, against the device and `screen.c`.
- MIDI: DIN (TRS) in, USB and BLE in and out, clock in.
- Stock is 12-voice FM. Community firmwares run 8 to 14 voices.

## 3. What to build on (don't reinvent the wheel)
- **Base: `m-vave/fm1_open`** (official). Windows build (`build.bat`), JieLi toolchain 2.5.3 (free installer link
  in its README), and a browser preview built from the same C sources via WASI. App licence: GPL-3.0 with the FM1 SDK
  linking exception. The FM engine is a closed binary; we bring our own voices, so check early whether our audio
  path can bypass or replace `fm1_engine_render` cleanly. If it can't, fall back to Felucca's open hardware layer
  (`felucca-bsp`, MPL-2.0; its toolchain is Linux-only, run through Docker).
- **Copy Felucca's discipline, not its code:**
  - one portable C core with a host build (browser, desktop) for tests;
  - a CPU budget per sound in instructions per sample (`tests/cpu_baseline.txt`, fails at +25%);
  - golden render hashes, so a sound change is always deliberate;
  - a one-core vs two-core regression test;
  - UBSan-clean integer audio (`docs/signed-audio-arithmetic.md`).
- **Licence check:** Slimehedron is GPL-3.0-or-later, so it can be combined with GPL-3.0-only code; the result
  ships as GPL-3.0-only. Keep the SDK terms and THIRD_PARTY notices.
- **Recovery exists:** the `MvaveFM1Unbricker` tool (Windows/Linux) and the FM-1 Transporter (an RP2040 on the USB
  lines). Don't rely on them; see section 7.

## 4. The port (what comes along, what changes)
- **Engine in C, from the web app.** The Rust core can't target pi32v2, so it is a blueprint only (its tests and
  `web-stats.json` say what "right" sounds like). Port the same pieces:
  - walls = notes in cents, plus the per-track tuning hook for microtonal scales;
  - the 60 Hz tick, beat lock, quantize hold, auto-notes melody, and pane chords;
  - the synth voice: triangle + sub, PolyBLEP, RBJ filter with Q capped at 12, the hold envelope;
  - drums, bass and pad from Slimehedron's own synthesized voices.
  If the budget won't hold the band, use the SDK's `drum808` / `bass303` first and say so.
- **Physics and drawing on separate cores.** Audio in the ISR on core 0; the tank tick and the screen on core 1
  (Felucca already does dual-core). The audio thread never waits on the screen.
- **2.5D look.** Yes, it saves a lot:
  - The web tank is already a 2D slice with depth (balls move between two panes), so the physics stays 2D plus z.
    That's the cheap part.
  - Draw with a fixed oblique or isometric projection: the front outline, the back outline offset up and to the
    side, and the edges joining them. The near faces get a flat tint, the far ones a darker tint.
  - Ball size and brightness follow z, and each ball gets a shadow dot on the floor. Spin turns the outline;
    solids, portal and curved keep their web maths and just get projected.
  - It saves flash because shapes are vertex lists (bytes) instead of bitmaps or textures. It saves CPU and RAM
    because there's no 3D transform per pixel and no depth buffer, and it draws in 16-row bands.
  - Honest note: pixels, not geometry, are what cost on this chip. Redraw only the bands that changed.
- **Goo:** the web's 1,600-drop fluid won't fit. Try a capped particle count on core 1 plus a liquid level, then
  measure. The goo slows balls and softens notes, so a fake that only looks right is not allowed.
- **Crayon art** cannot come along at 240×240 / 1 MiB. Use the app's palette and line style, never flat stock
  icons. Show Flah screens before committing to a look.

## 5. Controls (proposal; Flah confirms)
- MASTER pot: master volume (as stock).
- 27 keys: play the walls' notes; a press fires a ball (the web's `playNote` + `shootBall`); MIDI in does the same.
- PLAY: play/stop. OCT− / OCT+: octave. REC: later (record a loop).
- SCL: key and scale page (that's what stock SCL is). ARP: auto-notes on/off. LFO: the slime's auto moves (spin,
  shape changes). ENV: envelope. EDIT: sound (wave, filter). FX: delay / reverb / tape. GLO: tempo, swing,
  quantize, MIDI. SEQ: drums and band (kit, on/off). HOME: the tank. SAVE: save.
- Select encoder: shape (polygon / solid). Encoder 6: space (normal / portal / curved).
- K1 to K4 on HOME: tempo, spin, note density (auto-notes odds), band level. On any other page, K1 to K4 are that
  page's four settings, same as stock.
- LEDs light the keys that are chord tones of the sounding chord.

## 6. "Not sluggish", as numbers (the spec fills in the targets after measuring)
- Audio: zero underruns at the worst case (12 balls, full goo, band on, heaviest space).
- Control to sound: a key press sounds in the next audio block (≤ 3 ms + one block).
- Screen: a steady frame rate at the worst case (≥ 30 fps, measure first, then set the target).
- Headroom: the worst case runs ≥ 1.5× faster than real time in fm1-emu at the lowest clock it allows.
- Flash fits with room for a saved song. Pin the RAM high-water mark in a test.
- MIDI: clock in follows ±1 BPM jumps, and no stuck notes on unplug.

## 7. How it gets checked (no hardware risk)
- **fm1-emu** (joakimeriksson): runs the REAL firmware binary on an emulated AC791N, CPU clock selectable
  (240/320/400 MHz), headless batch runner with WAV output, screenshots and memory dumps. This is the test bench.
  Every number in section 6 comes from it. Sabotage each check.
- **fm1_open's browser preview / the M-VAVE workbench** for quick looks and to show Flah.
- **A host build of the C engine** for unit tests and the golden hashes (Felucca's pattern).
- **Never flash Flah's FM-1** without asking him first. Before that first flash: he updates to official V15, backs
  up presets, uses a direct data cable, and the unbricker is downloaded and ready.

## 8. Questions for Flah (one round, recommended answers)
1. Base on the official SDK (Windows-native) or on Felucca's open hardware layer? Recommended: official, unless our
   audio can't bypass its closed engine.
2. The control map in section 5: OK as is? Recommended: yes, then tune by hand on the device.
3. Goo on the FM-1: lighter but real (fewer drops), or off with a toggle? Recommended: lighter but real.
4. Band: Slimehedron's own synth drums/bass/pad, falling back to the SDK's 808/303 only if they don't fit?
   Recommended: yes.
5. Do you own an FM-1 now, and is it on V15?

## Sources
- https://github.com/m-vave/fm1_open (README, `sdk/include/fm1.h`, `fm1_block.h`, `app/board/*`, `app/screen.c`, linker)
- https://github.com/hugelton/Felucca (BUILDING.md, docs/ARCHITECTURE.md, docs/PLUGINS.md, tests/cpu_baseline.txt)
- https://github.com/joakimeriksson/fm1-emu/wiki
- https://thesynthsource.com/fm1-custom-firmware-install-guide/
- https://github.com/aroum/fm1-custom-fw
- https://github.com/AL-255/FM-1-RE
- https://github.com/Quixotic7/MvaveFM1Unbricker ; https://github.com/kurogedelic/FM-1-transporter
- https://www.synthtopia.com/content/2026/07/13/m-vave-introduces-fm-1-fm-pocket-synthesizer/

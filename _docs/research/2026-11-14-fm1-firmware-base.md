# FM-1 firmware: the base, the newer units, what to learn from (2026-11-14)

Asked by Flah: an FM-1 branch of Slimehedron that works on the latest units, uses the device's own sound engines, 2.5D.
Everything here was read from the page or the source named. "Not published" means nobody states it; do not fill it in.

## The "latest chip model" is a flash change, not a new CPU
- CPU, every unit: JieLi AC791N, two pi32v2 cores, 240 MHz (fm1-emu README).
- Units sold from late 2026 (mostly AliExpress; an M-VAVE logo under the screen per one report) carry a **UC25HQ80**
  flash, JEDEC 0xB36014, in place of the Puya P25Q80, 0x856014: same size, same commands (SLOOP commit bac9c05,
  hal/fm1_flash_id.h; Felucca 1.8.2 release notes).
- A firmware that only knows the Puya part cannot save on a new unit (everything stays in RAM, "flash error") and its
  update loader refuses to install. Fixed in **SLOOP 2.8.5**, Felucca 1.8.2, Clipper 1.3.1; older ones are not safe there.
- So: our base must be SLOOP >= 2.8.5, its flash driver, update loader and USB rescue stay untouched, and both parts are
  tested in fm1-emu (`?chip=uc25hq80` swaps the flash in).
- Official firmware is at V16 (SLOOP README names V16 for going back to stock; V15 through Clipper's installer).
- m-bootloader (jvitkauskas) is "little tested" on the new flash and one unit did not start after it: not used.

## The base: SLOOP 2.8.5 (isod89/sloop-fm1, GPL-3.0-only, commit bac9c05, 2026-11-03)
Read from its source, cloned to WSL (~/fm1w/sloop-fm1):
- A unity build: firmware/src/felucca.c includes every .c; everything is static. A new file is one #include.
- 12 engines: ANALOG, DIGITAL (4-op FM), PHASE, LOFI, SAMPLE, VOICE, TRIO, WHEEL, GRAIN, FM6, PHYS, NOISE. 8 voices
  shared by 3 synth tracks; alone an engine gets 8, FM6 6, VOICE 4, GRAIN and PHYS 3. Drums: 6 voices, 32 synthesised
  kits (tools/gen_drumkits.py) plus sampled ones.
- Audio: 44.1 kHz, control blocks of 32 samples (CTL, 0.73 ms), half buffers of 256 frames (5.8 ms).
- Both cores render since 2.7; a unit whose core 1 misreads falls back to one core (DUALCORE.md, 2.8.3).
- RAM (RAM.md, DUALCORE.md): a 96 KiB RAM region, a 344 KB pool that is 334 KB full (a 59 KB screen canvas, a 1.49 s
  delay line, four project slots), 29.5 KB of low SRAM. **Our tank is 99 KB (measured, light goo): it does not fit
  beside the whole groovebox.** Something of SLOOP's has to go: the four project slots and the arranger first.
- Pitch: notes are MIDI numbers at 1/16 semitone, plus a per-voice `fine` factor (voice.c: 1 cent = 2.367 units) that
  unison detune and TUNE use. That is our microtonal hook; no SLOOP source changes.
- Host build with no toolchain: firmware/host/preview.c (the DSP and sequencer for its browser preview). gcc turns
  SLOOP's own memset loop into a memset call that calls itself (SLOOP says "the GCC build does not finish on Linux");
  `-fno-tree-loop-distribute-patterns` and no _FORTIFY_SOURCE fix it.
- Device build: JieLi clang 4.0.1 for pi32v2 (tools/get_toolchain.sh, from pkgman.jieliapp.com) and three files of the
  AC79 SDK (Apache-2.0, gitee.com/Jieli-Tech/fw-AC79_AIoT_SDK tag AC79NN_SDK_V1.2.1_2023-12-13). Linux x86-64 native.

## The bench: fm1-emu (joakimeriksson/fm1-emu, MIT)
- Runs firmware binaries unchanged; M-VAVE V13 and V15 and the community firmwares run in it.
- `fm1-live --fwsc FILE`, `--shot`, `--bench`; `FM1_BENCH_KEYS` scripts keys (`ms:id`), encoders (`ms:eN:clicks`) and MIDI.
- `FM1_STRICT=1`: measured cycles per instruction on both cores, misaligned access faults, LCD at the real SPI clock.
  **A full 240x240 frame takes about 77 ms at 12 MHz**: 13 fps at most if every pixel is sent. The brief's ">= 30 fps"
  is only reachable by sending the bands that changed (our renderers already draw in 16-row bands).
- Clock options 120..400 MHz; most firmwares run 3-6x real time in it.

## Others worth reading (not copied)
- Felucca (hugelton, GPL-3.0-only; engines MIT, hardware layer MPL-2.0): the original; CPU budget and golden-hash tests.
- X0X (charlesvestal/fm1-x0x) and Melodee (keremimo/melodee): the second core's start-up; X0X's hardening against
  units whose core 1 misreads.
- sloop-lab (andrerezemini): the dual-core render split and the RAM map work above.
- JIANT (juanjiant-bit): knob acceleration and glide. Clipper (isod89/clipper-fm1): installer with a way back to stock.
- FM-1-transporter (kurogedelic): recovery for a unit that no longer starts. The Firmware Hub rescue tool says it
  works on the new flash and tells you to take a full flash backup first.

## Answered since (2026-11-16, from source and measurement)
- **Float: single precision in hardware, double in software.** `-mcpu=r3 -mfprev1` (JieLi's SDK flags) turns float
  maths into FPU instructions; doubles stay compiler-rt calls. X0X (charlesvestal/fm1-x0x, tools/build.py) builds its
  whole firmware this way and ships on hardware; fm1-emu decodes the FPU (docs/isa-notes.md, 1,464 probe cases).
- **The FPU has no square root**: JieLi's r3 libm `sqrtf` is a software loop; it was 46% of our busy time in fm1-emu's
  profile. X0X writes its own (`fm_sqrtf`, firmware/src/dsp/fastmath.h); so do we (floatify.py).
- **The panel's SPI runs at 60 MHz** (`LCD_BAUD 0`, ~44 MHz effective measured on an FM-1: X0X firmware/src/lcd.c,
  which also says Felucca's 12 MHz took 23 ms for a 240x72 strip and tore). ST7789 is rated to ~62 MHz.
- RAM layout from app.ld: a 96 KiB RAM region, a 336 KB pool, 31.75 KB of low SRAM, a 15.7 KB no-init region.

## The top firmwares, read for quality (2026-11-16)
- **Shrub** (Xfer Records / Steve Duda, free beta 2026-11-13, not open source): a stripped-down Serum: two wavetable
  oscillators + sub, a Serum 2 filter, OTT / reverb / delay, Serum 1 patches. Duda: no poly filters, all voices share one
  stereo filter driven by the newest voice; quality is "reduced" from the plugin. Takeaway for us: on this chip even Xfer
  shares one filter across voices, so a shared-bus design is the norm, not a corner cut. (synthanatomy.com, 2026-11)
- **CoralFlower** (FicusFicusov, GPL-3.0, after ChoralRoot and Felucca): one key -> a chord + a bass line, ~60 sounds
  from a VA and an FM engine (Melodee's), six effects in a user order, Departure Mono font. Same shape of instrument as
  ours (chords and bass follow the player); its chord and voicing rules are not documented, so nothing copied.
- **No Man's Sky FM** (hericdk, GPL-3.0, on SLOOP 2.7.1): the only other 3D firmware; its own README says the 3D flight
  "can still lose frames" and its flash is "nearly full" (it moved samples to lower rates). Takeaway: 3D on this chip
  needs the FPU, the fast SPI and partial redraw; we have all three.
- **X0X** (charlesvestal): the reference for speed: FPU on, 60 MHz SPI, the DSP at -O2, its own fast maths, the second
  core hardened against units that misread.

## Still not known
- How it sounds and feels on a real FM-1 (nothing flashed). fm1-emu STRICT models cycles, flash-cache misses and the
  LCD's clock, but not the analog output or the panel's own refresh (tearing).

## Sources
- https://github.com/isod89/sloop-fm1 (README, BUILDING.md, DUALCORE.md, RAM.md, firmware/src at bac9c05)
- https://github.com/joakimeriksson/fm1-emu (README)
- https://github.com/hugelton/Felucca (README; release v1.8.2)
- https://github.com/jvitkauskas/m-bootloader ; https://thefirmwarehub.com/tools/rescue/
- https://github.com/isod89/clipper-fm1 ; https://github.com/juanjiant-bit/JIANT
- https://pianoandsynth.com/m-vave-fm-1-custom-firmware-collection/
- https://github.com/charlesvestal/fm1-x0x (tools/build.py, firmware/src/lcd.c, firmware/src/dsp/fastmath.h at 512c0da)
- https://github.com/FicusFicusov/CoralFlower (README at 46790b9)
- https://github.com/hericdk/nomanskyFM (README at 8ba4833)
- https://synthanatomy.com/2026/11/xfer-records-shrub-serum-for-m-vave-fm-1-before-gta-6.html
- https://github.com/joakimeriksson/fm1-emu docs/isa-notes.md ("The FPU and the community firmwares")

## FM patch sources (2026-11-18)

Our FM patches are written from documented technique, never copied banks (DX7 ROM licensing is unestablished; Felucca:
"no factory ROM data of any instrument"):
- Yamaha, "FM 101" series, yamahasynth.com: Part Five "Expanding Your Sound" (E.PIANO tine, two-operator bass) and Part
  Six "Complex Systems" (BASS 2's ratio-1.01 modulator, HARP 1).
- J. Chowning, "The Synthesis of Complex Audio Spectra by Means of Frequency Modulation", JAES 21(7), 1973 (bells, 1:1.4).
- Knob acceleration: SLOOP 2.7 ui_input.c accel(), after JIANT FM by juanjiant-bit (github.com/juanjiant-bit/JIANT, GPL-3.0).

## Shrub (2026-11-18)

- Xfer's SHRUB (shrub.audio, guide 1.0 for firmware 1.13): (c) 2026 Xfer Inc., all rights reserved; no source, no repo
  (searched GitHub and the press: synthtopia.com 2026-11-15, musicradar.com, matrixsynth.com). Its binary is not read.
- From its guide: two wavetable oscillators with up to 8 unison voices each, one shared paraphonic filter, a 7-slot fx
  rack (hyper/dimension, distortion, flanger, phaser, chorus, delay, compressor as single band or 3-band OTT, reverb,
  EQ, filter), a CPU governor stealing voices smoothly, 1% steps on a slow turn and big jumps on a flick, REC from the
  next bar with a 4-click count-in, auto-save a couple of seconds after editing stops, a ~3 ms fade on preset load.
- The site's own drum glue, measured in the browser (drumComp.reduction, 4 bars at 120 bpm, each kit alone):
  the most reduction pop 1.8, rock 4.2, disco 2.5, bossa 1.3, jazz 0.1, samba 1.9, conga 0.5, march 2.0, chip 0.9,
  beep 0.2, industrial 3.1 dB; bus peaks -9.3 -6.2 -7.5 -10.1 -15.6 -9.3 -13.6 -9.1 -13.1 -15.7 -6.8 dBFS.

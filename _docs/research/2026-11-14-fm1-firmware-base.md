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

## Not known (measure, do not assume)
- RAM and flash sizes are not published by anyone; the brief's "511 KB / 1 MiB" came from fm1_open's linker script.
- Whether pi32v2 has hardware float. The tank is double on the host; its cost on the device is unmeasured.
- The tank's time per tick and a frame's time on the device: fm1-emu STRICT, once the device build exists.

## Sources
- https://github.com/isod89/sloop-fm1 (README, BUILDING.md, DUALCORE.md, RAM.md, firmware/src at bac9c05)
- https://github.com/joakimeriksson/fm1-emu (README)
- https://github.com/hugelton/Felucca (README; release v1.8.2)
- https://github.com/jvitkauskas/m-bootloader ; https://thefirmwarehub.com/tools/rescue/
- https://github.com/isod89/clipper-fm1 ; https://github.com/juanjiant-bit/JIANT
- https://pianoandsynth.com/m-vave-fm-1-custom-firmware-collection/

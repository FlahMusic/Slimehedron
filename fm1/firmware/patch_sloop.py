#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Slimehedron for the FM-1: the few changes SLOOP's own files need, applied to a COPY of the pinned checkout.
   patch_sloop.py COPY_DIR
Each change replaces one exact piece of text that must be there exactly once, so a new SLOOP that moved it stops the
build here instead of building something else. Everything else we add is our own files (slime.c, fm1/core)."""
import sys
from pathlib import Path

ROOT = Path(sys.argv[1])


def sub(rel, old, new):
    p = ROOT / rel
    s = p.read_text(encoding="utf-8")
    if s.count(old) != 1:
        sys.exit(f"patch_sloop: {rel}: expected once, found {s.count(old)} times: {old[:60]!r}")
    p.write_text(s.replace(old, new), encoding="utf-8")


# RAM. The tank (light goo) is 99 KB and SLOOP's pool has 10 KB free (measured: pool 333,900 of 344,064 B). Two buffers
# of features Slimehedron does not have give it room: the punch-in effects' ring (65,536 B) and the SLICER insert's
# recordings (32,768 B). Both stay in the build, short, so no code path changes: the effects just have nothing to chew.
sub("firmware/src/punch.c", "#define PUNCH_N 32768u", "#define PUNCH_N 2048u    /* slimehedron: was 32768u (64 KB) */")
sub("firmware/src/slicer.c", "#define SL_LEN 4096u ", "#define SL_LEN 256u   /* slimehedron: was 4096u (32 KB) */ ")

# .. and the spectrogram visualiser's picture (3,456 B) moves to the SRAM below the RAM region, which has 6.6 KB free.
sub("firmware/src/ui_vis.c", 'static uint8_t vis_sg[VIS_SG_H][VIS_SG_W] __attribute__((section(".pool")));',
    'static uint8_t vis_sg[VIS_SG_H][VIS_SG_W] __attribute__((section(".lowram")));   /* slimehedron: was .pool */')

# The tank runs off the audio clock: once per mixed block, before SLOOP reads its own events.
sub("firmware/src/fx.c", "static void events_block(uint32_t n);",
    "static void events_block(uint32_t n);\nstatic void slime_hook(uint32_t n);                      /* slimehedron: slime.c */")
sub("firmware/src/fx.c", "    events_block(n);\n    duck_block(", "    slime_hook(n);\n    events_block(n);\n    duck_block(")
sub("firmware/src/felucca.c", '#include "audio.c"\n', '#include "slime.c"            /* slimehedron: the tank plays the engines */\n#include "audio.c"\n')

# The screen and the panel are ours: SLOOP's groovebox UI is compiled but never called, its logo never drawn.
sub("firmware/src/felucca.c", '#include "main.c"', '#include "slime_ui.c"         /* slimehedron: the tank on the screen */\n#include "main.c"')
sub("firmware/src/main.c", "    sloop_splash();", "    slime_splash();")
sub("firmware/src/main.c", "        ui_input();\n        felucca_dbg.stage = 2;\n        ui_leds();\n        ui_draw();\n", "        slime_ui();\n")
sub("firmware/src/main.c", "            ui_input();\n#if FELUCCA_OTA", "            slime_poll();\n#if FELUCCA_OTA")

# The build: our include paths, our objects and the toolchain's maths libraries on the link line.
sub("tools/build.py", '    flags = [*CFLAGS, "-Ifirmware/hal", "-Ifirmware/src", "-Ibuild/gen"]\n    for flag in',
    '    flags = [*CFLAGS, "-Ifirmware/hal", "-Ifirmware/src", "-Ibuild/gen", *os.environ.get("SLIME_CFLAGS", "").split()]\n    for flag in')
sub("tools/build.py", 'OUT / "fm1_cpu1.o", OUT / "felucca.o", "-o", elf)',
    'OUT / "fm1_cpu1.o", OUT / "felucca.o", *os.environ.get("SLIME_LINK", "").split(), "-o", elf)')
# The image check reads the disassembly for loads of chip-ROM addresses (0xFFC00000..). JieLi's FPU libm (r3) holds
# integer constants in that range (__ieee754_logf: 0xffcf5c30, an arithmetic constant), and objdump without --mcpu=r3
# cannot decode the FPU instructions around them. Those functions are the toolchain's; every other line is still checked.
sub("tools/build.py",
    "    for ln in dis.splitlines():     # nothing may call or load an address in the chip ROM\n        mm = LINE.match(ln)\n        if not mm:\n            continue\n",
    "    fn = ''\n    for ln in dis.splitlines():     # nothing may call or load an address in the chip ROM\n"
    "        mh = re.match(r'^([A-Za-z_][\\w.]*):\\s*$', ln)\n        if mh:\n            fn = mh.group(1)\n"
    "        mm = LINE.match(ln)\n        if not mm or fn.startswith('__ieee754_'):   # slimehedron: JieLi's libm (see patch_sloop.py)\n            continue\n")
print("patch_sloop: 13 changes applied")

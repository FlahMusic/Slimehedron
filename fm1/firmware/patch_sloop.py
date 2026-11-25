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
# FM patches of our own (slime_fm6.py: written from documented technique, cited there), after Felucca's eight, with
# their slot names and a preset each. (Slots after the factory ones are the user bank: they move up by four.)
FM6 = (Path(__file__).parent / "slime_fm6.py").read_text(encoding="utf-8").rstrip("\n")
g = ROOT / "tools/gen_fm6_patches.py"
s = g.read_text(encoding="utf-8")
start = s.index("PATCHES = [")
end = s.index("\n]\n", start)
g.write_text(s[:end] + "\n" + FM6 + s[end:], encoding="utf-8")
sub("firmware/src/eng_fm6.c", '{"F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", ',
    '{"F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13", "F14", ')
sub("firmware/src/eng_fm6.c", '    {"NYLON PICK", {0, 0, 0, 0, 0, 0, 0, 7}, {0, 0, 127, 0}, 0, 0, FX(0, 20, 35, 30)},\n',
    '    {"NYLON PICK", {0, 0, 0, 0, 0, 0, 0, 7}, {0, 0, 127, 0}, 0, 0, FX(0, 20, 35, 30)},\n'
    '    {"SH TINE", {0, 0, 0, 0, 0, 0, 0, 8}, {0, 0, 127, 0}, 0, 0, FX(0, 30, 20, 35)},    /* slimehedron: slime_fm6.py */\n'
    '    {"SH BASS", {0, 0, 0, 0, 0, 0, 0, 9}, {0, 0, 127, 0}, 0, 1, FX(0, 0, 0, 10)},\n'
    '    {"SH HARP", {0, 0, 0, 0, 0, 0, 0, 10}, {0, 0, 127, 0}, 0, 0, FX(0, 10, 20, 40)},\n'
    '    {"SH BELL", {0, 0, 0, 0, 0, 0, 0, 11}, {0, 0, 127, 0}, 0, 0, FX(0, 10, 25, 60)},\n'
    '    {"SMOOTH EP", {0, 0, 0, 0, 0, 0, 0, 12}, {0, 0, 127, 0}, 0, 0, FX(0, 40, 18, 34)},   /* the chords: through the chorus */\n'
    '    {"DX BASS", {0, 0, 0, 0, 0, 0, 0, 13}, {0, 0, 127, 0}, 0, 1, FX(0, 0, 0, 8)},\n')
# Analog sounds of our own (2026-11-25; recipes: _docs/research/2026-11-25-fm1-famous-sounds.md 3, 4.2, 4.3), after SLOOP's:
#   BIG MONO    the 80s mono-synth bass pluck (the "Thriller" recipes: saws a few cents apart, the cutoff low, resonance
#               and envelope about half, a short decay). SLOOP's one envelope moves the amplitude and the filter together,
#               so the pluck is the sustain's distance under the peak: measured, the top (over 500 Hz) falls 10 dB in
#               150 ms while the level drops 2 (MONO BASS, as it was: no sweep at all)
#   POLY BRASS  the OB-Xa "Jump" recipe (MusicRadar): two saws +-5 cents, cutoff half, resonance 42%, the envelope 83%
#               onto the filter, a short attack, sustain 76%, release 19%
#   DREAM STAB  a Juno-style chord stab ("Take On Me" was a Juno-60, SOS): two saws a little apart, the filter fairly
#               open, a quick decay to a held body, deep into the chorus (SLOOP's bus: 0.41 Hz; the Juno's mode I 0.51)
sub("firmware/src/eng_analog.c", '    {"SINE PAD", {3, 10, 64, 4, 90, 0, 0, 32}, {80, 90, 118, 90}, 0, 0, FX(0, 60, 20, 65)},\n',
    '    {"SINE PAD", {3, 10, 64, 4, 90, 0, 0, 32}, {80, 90, 118, 90}, 0, 0, FX(0, 60, 20, 65)},\n'
    '    {"BIG MONO", {0, 3, 50, 0, 20, 45, 40, 64}, {0, 66, 60, 20}, 63, 1, FX(0, 0, 0, 4), XP(P_TRANS + 1, -24)},   /* slimehedron: patch_sloop.py */\n'
    '    {"POLY BRASS", {0, 10, 64, 0, 64, 53, 10, 64}, {4, 70, 97, 24}, 53, 0, FX(0, 20, 18, 30)},\n'
    '    {"DREAM STAB", {0, 14, 64, 0, 76, 20, 0, 64}, {0, 68, 70, 44}, 30, 0, FX(0, 80, 22, 40)},\n')
# SLOOP's own autosave of its working project would write the flash behind our back (it never knows we are playing:
# its transport stays stopped); Slimehedron keeps its own session (slime_ui.c, SAVE)
sub("firmware/src/main.c", "        autosave_tick();                                /* the working project into flash, when quiet */",
    "        /* slimehedron: SLOOP's autosave_tick() is not called (slime_ui.c sl_session_tick keeps ours) */")
# The drum bus (slime.c sl_drum_bus: the site's glue, body and presence dip) on the drum track's block, left / right
# and the two sends, after its filter: the drum track always takes its buffered path for it
NL = chr(10)
sub("firmware/src/fx.c", "static void slime_hook(uint32_t n);                      /* slimehedron: slime.c */",
    "static void slime_hook(uint32_t n);                      /* slimehedron: slime.c */" + NL +
    "static void sl_drum_bus(int32_t *l, int32_t *r, int32_t *v, int32_t *d, uint32_t n);   /* slimehedron: slime.c */" + NL +
    "static uint8_t sl_drum_bus_on;" + NL +
    "static void sl_sd_block(int32_t *l, int32_t *r, int32_t *v, int32_t *d, uint32_t n);   /* slimehedron: slime_drums.c */" + NL + "static uint8_t sl_sd_on;")
# .. and the site's own drums (slime_drums.c) into the same buffers, after SLOOP's drum voices, before the insert
sub("firmware/src/fx.c", "        slicer_drums(dl, dr, dv, dd, n);" + NL + "        drum_insert(dl, dr, dv, dd, n);",
    "        slicer_drums(dl, dr, dv, dd, n);" + NL + "        sl_sd_block(dl, dr, dv, dd, n);   /* slimehedron */" + NL + "        drum_insert(dl, dr, dv, dd, n);")
sub("firmware/src/fx.c", "    if (flt || (n <= CTL && (TDRUM->p[P_ITYPE] | TDRUM->ins_run))) {   /* .. or its INSERT: left, right, the sends */",
    "    if (flt || (n <= CTL && (TDRUM->p[P_ITYPE] | TDRUM->ins_run | sl_drum_bus_on | sl_sd_on))) {   /* .. or its INSERT, the drum bus, the site's drums */")
sub("firmware/src/fx.c", "            tflt_run(f, &fc, dd, n, 3);" + NL + "        }" + NL + "        for (i = 0; i < n; i++) {" + NL + "            mx->l[i] += dl[i];",
    "            tflt_run(f, &fc, dd, n, 3);" + NL + "        }" + NL + "        if (sl_drum_bus_on)" + NL +
    "            sl_drum_bus(dl, dr, dv, dd, n);   /* slimehedron */" + NL +
    "        for (i = 0; i < n; i++) {" + NL + "            mx->l[i] += dl[i];")
# The boot: SLOOP holds its logo 900 ms, then clears to black. Ours is the splash (slime_ui.c), animated in the main loop
# with the sound running (its jingle), so the page's colour stays up and the main loop starts at once (2026-11-18)
sub("firmware/src/main.c", "    fm1_delay_ms(900);                                  /* (the logo stays a moment) */" + NL +
    "    lcd_fill(0, 0, 240, 240, C_BLACK);" + NL,
    "    /* slimehedron: no wait and no black screen here: the splash runs in the main loop (slime_ui.c) */" + NL)
# The keys are ours (slime.c sl_key: the note snapped into the scale, a ball, the loop, the chords). SLOOP's own keyboard
# kept running inside its sequencer and played every key AGAIN, raw and chromatic, on the selected track and out over
# MIDI: C# in C major sounded C# and C together, and a 31-EDO key's microtone was buried under a semitone (found
# 2026-11-18 by midi-check.sh: each key went out twice, once on channel 1 unbent)
sub("firmware/src/seq.c", "    keyboard_block();" + NL + "    drum_audition_poll();",
    "    /* slimehedron: keyboard_block() not called: the keys are slime.c's */" + NL + "    drum_audition_poll();")
# The delay in STEREO, PING-PONG (2026-11-20, Flah: the fx "top of the line"): SLOOP's tempo delay comes back in the
# middle. One line, two taps: the left hears it at one delay, the right at two, and only the right's goes round again,
# with the feedback squared, so the echoes fall left, right, left, right, each by REPEATS as before. No more memory (a
# second line would be 128 KB). When two delays do not fit the line (a 1/4 dotted under 61 bpm), the mono delay as before.
sub("firmware/src/fx.c", """        x = dly_buf[(fx.dly_w - dl) & (DLY_LEN - 1u)];
        fx.dly_lp += mulq15(x - fx.dly_lp, col);
        dly_buf[fx.dly_w & (DLY_LEN - 1u)] =
            (int16_t)clamp((dly_in[i] >> 1) + mulq15(fx.dly_lp, fb), -32768, 32767);
        fx.dly_w++;
        x = mulq15(x << 1, dmix);
        yl += x;
        yr += x;""", """        if (2u * dl < DLY_LEN) {                        /* slimehedron: PING-PONG, one line, two taps (patch_sloop.py) */
            int32_t xl = dly_buf[(fx.dly_w - dl) & (DLY_LEN - 1u)], xr = dly_buf[(fx.dly_w - 2u * dl) & (DLY_LEN - 1u)];
            fx.dly_lp += mulq15(xr - fx.dly_lp, col);
            dly_buf[fx.dly_w & (DLY_LEN - 1u)] =
                (int16_t)clamp((dly_in[i] >> 1) + mulq15(mulq15(fx.dly_lp, fb), fb), -32768, 32767);
            fx.dly_w++;
            yl += mulq15(xl << 1, dmix);
            yr += mulq15(mulq15(xr << 1, fb), dmix);
        } else {
        x = dly_buf[(fx.dly_w - dl) & (DLY_LEN - 1u)];
        fx.dly_lp += mulq15(x - fx.dly_lp, col);
        dly_buf[fx.dly_w & (DLY_LEN - 1u)] =
            (int16_t)clamp((dly_in[i] >> 1) + mulq15(fx.dly_lp, fb), -32768, 32767);
        fx.dly_w++;
        x = mulq15(x << 1, dmix);
        yl += x;
        yr += x;
        }""")
print("patch_sloop: 25 changes applied")

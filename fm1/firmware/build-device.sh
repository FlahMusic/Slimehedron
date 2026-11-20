#!/bin/sh
# Slimehedron for the FM-1: the device build (WSL / Linux x86-64). Makes ~/fm1w/slime-fw/build/felucca.fwsc.
#   sh fm1/firmware/build-device.sh
# Needs: the pinned SLOOP checkout (SLOOP, default ~/fm1w/sloop-fm1), JieLi's toolchain (~/.jieli/toolchain,
# SLOOP's tools/get_toolchain.sh), the AC79 SDK (~/fw-AC79_AIoT_SDK), python3 with Pillow.
# The checkout is never changed: it is copied, the copy is patched (patch_sloop.py) and built.
# The copy leaves out assets/samples-cc0: Slimehedron is 100% synthesized, and the recordings are 283 KB of a flash
# window that has 10 KB free (measured on stock 2.8.5: image 571,820 B of 581,564).
# NEVER install the result on a real FM-1 without Flah saying so. It is for fm1-emu.
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
SLOOP="${SLOOP:-$HOME/fm1w/sloop-fm1}"
WORK="${WORK:-$HOME/fm1w/slime-fw}"
TC="${JIELI_TOOLCHAIN:-$HOME/.jieli/toolchain}"
PIN="$(cut -d' ' -f1 "$HERE/SLOOP_PIN")"
GOT="$(git -C "$SLOOP" rev-parse --short=7 HEAD)"
[ "$GOT" = "$PIN" ] || { echo "SLOOP is at $GOT, this was written against $PIN"; exit 1; }
[ -x "$TC/pi32v2/bin/clang" ] || { echo "no JieLi toolchain at $TC"; exit 1; }

rm -rf "$WORK"; mkdir -p "$WORK"
(cd "$SLOOP" && tar cf - --exclude=.git --exclude=./build --exclude=./assets/samples-cc0 .) | (cd "$WORK" && tar xf -)
python3 "$HERE/patch_sloop.py" "$WORK"
python3 "$HERE/patch_kits.py" "$WORK/tools"           # the site's own drum kits, synthesized (gen-kits.js)
mkdir -p "$WORK/firmware/slime" "$WORK/build/slime"
cp "$HERE/slime.c" "$HERE/slime_drums.c" "$HERE/slime_ui.c" "$WORK/firmware/slime/"
cp "$HERE"/../core/*.c "$HERE"/../core/*.h "$WORK/firmware/slime/"
# single precision for the chip's FPU (floatify.py says why), and the FPU switched on for EVERY unit, SLOOP's too, as
# JieLi's SDK and X0X (a shipping FM-1 firmware) build: one float ABI across the whole image
python3 "$HERE/floatify.py" "$WORK/firmware/slime"
FPU="-mcpu=r3 -mfprev1 -ffp-contract=off"

# our core at -O2 (it runs every tick and every frame; the flash has room), with the device's light goo
OBJS=""
for f in tank music melody goo drawtank band; do
  "$TC/pi32v2/bin/clang" -target pi32v2 $FPU -O2 -ffunction-sections -std=c99 -DSH_GOO_LIGHT -DSH_GOO_DIV=16 -DSH_MAXHITS=32 ${SLIME_CORE_FLAGS:-} \
    -I"$TC/pi32v2/include" -c "$WORK/firmware/slime/$f.c" -o "$WORK/build/slime/$f.o"
  OBJS="$OBJS build/slime/$f.o"
done
LIB="${SLIME_LIBDIR:-$TC/pi32v2/lib/r3}"   # the r3 (FPU) build of libm / libc
mkdir -p "$WORK/build/slime/lib"; cp "$LIB/libm.a" "$LIB/libc.a" "$LIB/libcompiler-rt.a" "$WORK/build/slime/lib/"
# LCD_BAUD 0: the panel's SPI at 60 MHz (~44 MHz measured on an FM-1 by X0X, firmware/src/lcd.c; ST7789 <= ~62 MHz).
# SLOOP's 4 (12 MHz) takes ~77 ms to send a whole screen; the tank redraws the whole screen every frame.
export SLIME_CFLAGS="$FPU -DLCD_BAUD=0u -Ifirmware/slime -DSH_GOO_LIGHT -DSH_GOO_DIV=16 -DSH_MAXHITS=32 -DSL_DEVICE=1"
export SLIME_LINK="$OBJS --gc-sections build/slime/lib/libm.a build/slime/lib/libc.a build/slime/lib/libcompiler-rt.a"
cd "$WORK" && JIELI_TOOLCHAIN="$TC" sh build.sh
OUTDIR="$(cd "$HERE/../.." && pwd)/_fm1-firmware"; mkdir -p "$OUTDIR" && cp "$WORK/build/felucca.fwsc" "$OUTDIR/slimehedron-fm1.fwsc" && echo "package -> _fm1-firmware/slimehedron-fm1.fwsc"

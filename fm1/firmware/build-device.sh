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
mkdir -p "$WORK/firmware/slime" "$WORK/build/slime"
cp "$HERE/slime.c" "$WORK/firmware/slime/"
cp "$HERE"/../core/*.c "$HERE"/../core/*.h "$WORK/firmware/slime/"

# our core, compiled as SLOOP compiles its own file (-Os, sections), with the device's light goo
OBJS=""
for f in tank music melody goo; do
  "$TC/pi32v2/bin/clang" -target pi32v2 -Os -ffunction-sections -std=c99 -DSH_GOO_LIGHT -DSH_MAXHITS=32 ${SLIME_CORE_FLAGS:-} \
    -I"$TC/pi32v2/include" -c "$WORK/firmware/slime/$f.c" -o "$WORK/build/slime/$f.o"
  OBJS="$OBJS build/slime/$f.o"
done
LIB="${SLIME_LIBDIR:-$TC/pi32v2/lib}"
mkdir -p "$WORK/build/slime/lib"; cp "$LIB/libm.a" "$LIB/libc.a" "$LIB/libcompiler-rt.a" "$WORK/build/slime/lib/"
export SLIME_CFLAGS="-Ifirmware/slime -DSH_GOO_LIGHT -DSH_MAXHITS=32 -DSL_DEVICE=1"
export SLIME_LINK="$OBJS --gc-sections build/slime/lib/libm.a build/slime/lib/libc.a build/slime/lib/libcompiler-rt.a"
cd "$WORK" && JIELI_TOOLCHAIN="$TC" sh build.sh

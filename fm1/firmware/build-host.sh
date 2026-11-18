#!/bin/sh
# Slimehedron for the FM-1: the host bench (run in WSL / Linux). Needs gcc and python3, nothing else.
#   SLOOP=~/fm1w/sloop-fm1 sh fm1/firmware/build-host.sh
# SLOOP is a checkout of https://github.com/isod89/sloop-fm1 at the commit in fm1/firmware/SLOOP_PIN (not vendored
# here: it is GPL-3.0-only and 24 MB; this folder holds only our files, which sit on top of it).
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
SLOOP="${SLOOP:-$HOME/fm1w/sloop-fm1}"
PIN="$(cat "$HERE/SLOOP_PIN" | cut -d' ' -f1)"
[ -d "$SLOOP/firmware/src" ] || { echo "no SLOOP checkout at $SLOOP (git clone https://github.com/isod89/sloop-fm1)"; exit 1; }
GOT="$(git -C "$SLOOP" rev-parse --short=7 HEAD)"
[ "$GOT" = "$PIN" ] || { echo "SLOOP is at $GOT, this was written against $PIN: check the bridge still fits, then update SLOOP_PIN"; exit 1; }
GEN="$SLOOP/build/gen"; OUT="${OUT:-$HOME/fm1w/out}"
mkdir -p "$GEN" "$OUT"
for p in tables:felucca_tables samples:felucca_samples drumkits:felucca_drumkits fm6_patches:felucca_fm6; do
  s="${p%%:*}"; h="${p##*:}"
  [ -f "$GEN/$h.h" ] || (cd "$SLOOP" && python3 "tools/gen_$s.py" "$GEN/$h.h")
done
# the site's drum kits in SLOOP's kit header, as on the device (patch_kits.py on a copy of the generator)
KG="$OUT/kitgen"; rm -rf "$KG"; mkdir -p "$KG/tools" "$KG/gen"
cp "$SLOOP/tools/gen_drumkits.py" "$SLOOP/tools/drumkit_levels.json" "$KG/tools/"
python3 "$HERE/patch_kits.py" "$KG/tools" >/dev/null && python3 "$KG/tools/gen_drumkits.py" "$KG/gen/felucca_drumkits.h" >/dev/null
CC="${CC:-cc}"
CORE="$HERE/../core"
# the tank with the device's light goo (float, half the drops): what the FM-1 will run
$CC -std=c99 -O2 -DSH_GOO_LIGHT -DSH_GOO_DIV=4 -fsingle-precision-constant -c -o "$OUT/goo_light.o" "$CORE/goo.c"
for f in tank music melody band; do $CC -std=c99 -O2 -DSH_GOO_LIGHT -DSH_GOO_DIV=4 -c -o "$OUT/$f.o" "$CORE/$f.c"; done
# SLOOP's sources as SLOOP builds them for its own host tests (-fwrapv -fno-strict-aliasing, warnings off).
# gcc must not turn SLOOP's own memset loop (libc.c) back into a call to memset, or it calls itself for ever
# (SLOOP's preview test says "the GCC build of this adapter does not finish on Linux": this is why).
$CC -O1 -fwrapv -fno-strict-aliasing -fno-tree-loop-distribute-patterns -U_FORTIFY_SOURCE -D_FORTIFY_SOURCE=0 -w -DSH_GOO_LIGHT -DSH_GOO_DIV=4 -I"$KG/gen" -I"$GEN" -I"$SLOOP/firmware/src" -I"$SLOOP/firmware/host" -I"$CORE" \
  "$HERE/host/slimehost.c" "$OUT/tank.o" "$OUT/music.o" "$OUT/melody.o" "$OUT/band.o" "$OUT/goo_light.o" -lm -o "$OUT/slimehost"
echo "built $OUT/slimehost"
# the device's single-precision tank (floatify.py on copies of fm1/core and slime.c), the same bench around it
F="$OUT/float"; rm -rf "$F"; mkdir -p "$F/core" "$F/host"
cp "$CORE"/*.c "$CORE"/*.h "$F/core/"; cp "$HERE/slime.c" "$F/"; cp "$HERE/host/slimehost.c" "$F/host/"
python3 "$HERE/floatify.py" "$F/core" >/dev/null; python3 "$HERE/floatify.py" "$F" >/dev/null
for f in tank music melody goo band; do $CC -std=c99 -O2 -DSH_GOO_LIGHT -DSH_GOO_DIV=4 -c -o "$F/$f.o" "$F/core/$f.c"; done
$CC -O1 -fwrapv -fno-strict-aliasing -fno-tree-loop-distribute-patterns -U_FORTIFY_SOURCE -D_FORTIFY_SOURCE=0 -w -DSH_GOO_LIGHT -DSH_GOO_DIV=4 -I"$KG/gen" -I"$GEN" -I"$SLOOP/firmware/src" -I"$SLOOP/firmware/host" -I"$F/core"   "$F/host/slimehost.c" "$F/tank.o" "$F/music.o" "$F/melody.o" "$F/goo.o" "$F/band.o" -lm -o "$OUT/slimehost_f"
echo "built $OUT/slimehost_f (single precision)"

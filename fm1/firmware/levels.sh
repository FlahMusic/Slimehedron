#!/bin/sh
# Slimehedron for the FM-1: every part alone and the band together, per rhythm, measured the way the site's dev-mix.js
# measures (K-weighted, ungated, 32 bars) and judged by its rules:
#   drums >= 6 LU under the melody (bossa, jazz: 9); bass 3..10 under; chords >= 3 under; the melody -1.5..+2.5 LU about
#   the band (the FM-1's own, 2026-11-25: the site says >= 1 over; Flah found the melody "jarring", and a hand's keys play at
#   100, louder than this stand-in, so the melody heard is ~1-2 LU over what it reads here)
#   (bass + chords + drums together); the whole mix -21..-15 LUFS, peak under -0.9 dBFS.
#   sh fm1/firmware/levels.sh [kits...]      (after build-host.sh)   env SL_DLVL / SL_BLVL / SL_CLVL try other faders
set -eu
# (the melody here is the bench's stand-in player, the tank's auto-notes, a constant ~8 notes a bar: the device has no
#  auto-notes, its melody is a hand's. Wall HP, on in the device's tank, lets the stand-in's notes fall out (0.9 LU fewer):
#  the parts are judged against the same steady player as before, so the walls stay whole here. 2026-11-25)
export SL_WALLHP=0
B="${OUT:-$HOME/fm1w/out}/slimehost"; W="${OUT:-$HOME/fm1w/out}/lv.wav"
KITS="${*:-pop rock disco bossa jazz samba conga march chip beep industrial}"
lu() { "$B" song "$W" 32 major 6 100 7 1 KALIMBA | tr ' ' '\n' | awk 'p{print;exit} $0=="lufs"{p=1}'; }
M=$(SL_ONLY=mel lu)
FAILS=0
for k in $KITS; do
  export SL_KIT=$k
  D=$(SL_ONLY=drums lu); BS=$(SL_ONLY=bass lu); C=$(SL_ONLY=comp lu); BAND=$(SL_MEL=0 lu)
  L="$("$B" song "$W" 32 major 6 100 7 1 KALIMBA)"; A=$(echo "$L" | tr ' ' '\n' | awk 'p{print;exit} $0=="lufs"{p=1}')
  P=$(echo "$L" | tr ' ' '\n' | awk 'p{print;exit} $0=="peak_db"{p=1}')
  soft=6; [ "$k" = bossa ] || [ "$k" = jazz ] && soft=9
  r=$(awk -v m="$M" -v d="$D" -v b="$BS" -v c="$C" -v n="$BAND" -v a="$A" -v p="$P" -v s="$soft" 'BEGIN{
    f=""; if (m-d < s) f=f" drums"; if (m-b < 3 || m-b > 10) f=f" bass"; if (m-c < 3) f=f" chords"; if (m-n < -1.5 || m-n > 2.5) f=f" band";
    if (a < -21 || a > -15 || p >= -0.9) f=f" mix";
    printf "%s|melody %.1f  drums -%.1f  bass -%.1f  chords -%.1f  band -%.1f LU  | mix %.1f LUFS peak %.1f", (f==""?"PASS":"FAIL"f), m, m-d, m-b, m-c, m-n, a, p}')
  case "$r" in PASS*) echo "  PASS  [$k] ${r#*|}";; *) echo "  FAIL  [$k] ${r%%|*}: ${r#*|}"; FAILS=$((FAILS + 1));; esac
done
[ "$FAILS" = 0 ] && echo "levels: every rhythm sits as the site's mix rules say" || { echo "$FAILS FAILURE(S)"; exit 1; }

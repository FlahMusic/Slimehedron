#!/bin/sh
# Slimehedron for the FM-1: checks of the bridge on the host bench (WSL / Linux).
#   SLOOP=~/fm1w/sloop-fm1 sh fm1/firmware/check-host.sh
# 1. the tank plays SLOOP's synth: every hit becomes a note, none dropped, none late, a sane number a bar, audible, not clipped
# 2. every wall sounds at its own pitch, microtonal scales too (within 3 cents; SLOOP's pitch grain is 1/4096 of a note)
# 3. the pitch check can fail: with the fine pitch switched off (SL_NOFINE=1) 31-EDO must be more than 40 cents out
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="${OUT:-$HOME/fm1w/out}"
sh "$HERE/build-host.sh" >/dev/null
B="$OUT/slimehost"; FAILS=0
ok() { if [ "$1" = 1 ]; then echo "  PASS  $2"; else echo "  FAIL  $2"; FAILS=$((FAILS + 1)); fi; }
num() { echo "$1" | tr ' ' '\n' | awk -v k="$2" 'p{print;exit} $0==k{p=1}'; }
t() { awk "BEGIN{print (($1)?1:0)}"; }

for scene in "major 6 100 7" "edo19all 12 120 3" "pentaMaj 5 80 11"; do
  set -- $scene
  L="$("$B" song "$OUT/song-$1.wav" 32 "$1" "$2" "$3" "$4" 1 KALIMBA)"
  hits=$(num "$L" hits); notes=$(num "$L" notes); pb=$(num "$L" per_bar); late=$(num "$L" late); dr=$(num "$L" dropped)
  rms=$(num "$L" rms_db); pk=$(num "$L" peak_db); xr=$(num "$L" x_realtime)
  ok "$(t "$hits > 0 && $hits == $notes && $dr == 0")" "[$1, $2 walls, $3 bpm] every hit is a note, none dropped ($notes of $hits)"
  ok "$(t "$late == 0")" "[$1] no note later than one control block (0.73 ms): $late late"
  ok "$(t "$pb >= 4 && $pb <= 16")" "[$1] a playable number of notes a bar ($pb; the web's studio start state is 8.0)"
  ok "$(t "$rms > -50 && $pk < -1")" "[$1] audible and not clipped (rms $rms dB, peak $pk dB)"
  ok "$(t "$xr > 20")" "[$1] tank + synth far faster than real time on this pc (${xr}x; the device is measured in fm1-emu)"
done

for p in "edo31 1 KALIMBA" "edo19all 1 GLOCKEN" "edo24 2 SOFT KEYS" "major 0 SUB BASS"; do
  set -- $p; sc=$1; e=$2; shift 2
  w=$("$B" pitch "$sc" "$e" "$*" | tail -1 | awk '{print $2}')
  ok "$(t "$w < 3 && $w > -3")" "[$sc on $*] every degree within 3 cents of its wall (worst $w)"
done
w=$(SL_NOFINE=1 "$B" pitch edo31 1 KALIMBA | tail -1 | awk '{print $2}')
ok "$(t "$w > 40 || $w < -40")" "the pitch check can tell: without the fine pitch 31-EDO is $w cents out"

echo
[ "$FAILS" = 0 ] && echo "fm1 bridge: clean" || { echo "$FAILS FAILURE(S)"; exit 1; }

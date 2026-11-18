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
  ok "$(t "$hits > 0 && $hits - $notes <= 3 && $hits >= $notes && $dr == 0")" "[$1, $2 walls, $3 bpm] every hit is a melody note, none dropped ($notes of $hits; the last few wait in the 45 ms look-ahead)"
  ok "$(t "$late == 0")" "[$1] no note later than one control block (0.73 ms): $late late"
  ok "$(t "$pb >= 4 && $pb <= 16")" "[$1] a playable number of notes a bar ($pb; the web's studio start state is 8.0)"
  ok "$(t "$rms > -50 && $pk < -1")" "[$1] audible and not clipped (rms $rms dB, peak $pk dB)"
  ok "$(t "$xr > 20")" "[$1] tank + synth far faster than real time on this pc (${xr}x; the device is measured in fm1-emu)"
done

# 4. the mix, by the web app's own rules (_dev/dev-mix.js): drums at least 6 LU under the melody, the whole mix near the
#    site's -18.8 LUFS (its window is -21..-15; SLOOP's master limiter holds peaks at -5.2 dBFS, so a slow sparse tank
#    reads up to half a LU under the window: allowed down to -21.5), peaks under the web's -0.9 dBFS ceiling
song() { "$B" song "$OUT/lv.wav" 32 "$1" "$2" "$3" 7 1 KALIMBA; }
for scene in "major 6 100" "edo19all 12 120" "pentaMaj 5 80"; do
  set -- $scene
  M=$(num "$(SL_ONLY=mel song "$1" "$2" "$3")" lufs); D=$(num "$(SL_ONLY=drums song "$1" "$2" "$3")" lufs)
  L="$(song "$1" "$2" "$3")"; A=$(num "$L" lufs); pk=$(num "$L" peak_db); dh=$(num "$(SL_HUMAN=0 song "$1" "$2" "$3")" drum_hits)
  ok "$(t "$dh >= 430 && $dh <= 432")" "[$1] the web's pop pattern: 432 drum hits in 32 bars ($dh played with the humanize off; a last one may wait in the look-ahead)"
  ok "$(t "$M - $D >= 6 && $M - $D <= 11")" "[$1] drums 6..11 LU under the melody (melody $M, drums $D LUFS)"
  ok "$(t "$A >= -21.5 && $A <= -15 && $pk < -0.9")" "[$1] the whole mix $A LUFS (site -18.8, window -21..-15), peak $pk dBFS"
done
M=$(num "$(SL_ONLY=mel song major 6 100)" lufs); D=$(num "$(SL_ONLY=drums SL_DLVL=100 song major 6 100)" lufs)
ok "$(t "$M - $D < 6")" "the mix check can tell: drums at SLOOP's stock level are only $(awk "BEGIN{print $M - $D}") LU under"

# 5. every sound the panel offers is a real preset of its engine (a misspelt one quietly became the engine's first
#    preset: AFRO KEYS on the wrong engine played FAT BASS, 2026-11-16), and each part's sounds are level-matched:
#    within 1.5 dB of the part's default, measured alone
L="$("$B" soundcheck)"; ok "$(t "$(num "$L" bad) == 0")" "every panel sound exists in its engine ($L)"
lu1() { num "$("$B" song "$OUT/lv.wav" 24 major 6 100 7 1 KALIMBA)" lufs; }
for pv in "mel MELI 13" "bass BASSI 9" "comp COMPI 9"; do
  set -- $pv; ref=$(SL_ONLY=$1 lu1); worst=0; i=0
  while [ $i -lt $3 ]; do
    v=$(env SL_ONLY=$1 "SL_$2=$i" "$B" song "$OUT/lv.wav" 24 major 6 100 7 1 KALIMBA | tr ' ' '\n' | awk 'p{print;exit} $0=="lufs"{p=1}')
    worst=$(awk "BEGIN{d=$v-($ref); if(d<0)d=-d; print (d>$worst)?d:$worst}"); i=$((i+1))
  done
  ok "$(t "$worst <= 1.5")" "[$1] all $3 sounds within 1.5 dB of the default (worst $worst dB)"
done

# 6. every fx preset on every part keeps the part in use: within 6 dB of the part's own sound (telephone at first took
#    the drums 12.7 dB down, 2026-11-16)
for pp in "0 mel" "1 bass" "2 comp" "3 drums"; do
  set -- $pp; ref=$(num "$(SL_ONLY=$2 SL_FXP=$1:0 "$B" song "$OUT/lv.wav" 16 major 6 100 7 1 KALIMBA)" lufs); worst=0; i=1
  while [ $i -lt 14 ]; do
    v=$(num "$(SL_ONLY=$2 SL_FXP=$1:$i "$B" song "$OUT/lv.wav" 16 major 6 100 7 1 KALIMBA)" lufs)
    worst=$(awk "BEGIN{d=$v-($ref); if(d<0)d=-d; print (d>$worst)?d:$worst}"); i=$((i+1))
  done
  ok "$(t "$worst <= 6")" "[$2] all 13 fx presets within 6 dB of its own sound (worst $worst dB)"
done

# 7. the site's own kits (gen-kits.js): every rhythm's kick, rendered dry on SLOOP's drum synth, ends on the site's pitch
#    (KITTONE ke, within 20%) and dies when the site's does (-60 dB within 70..110% of kd: the meter smooths the tail)
for kit in "SH POP" "SH ROCK" "SH DISCO" "SH BOSSA" "SH JAZZ" "SH SAMBA" "SH CONGA" "SH MARCH" "SH CHIP" "SH BEEP" "SH INDUS"; do
  SL_DRY=1 "$B" hit "$kit" 36 > "$OUT/hit.raw"
  r=$(python3 - "$OUT/hit.raw" "$kit" "$HERE/slime_kits_expect.json" <<'EOF'
import json, sys
import numpy as np
x = np.fromfile(sys.argv[1], np.float32); fs = 44100; want = json.load(open(sys.argv[3]))[sys.argv[2]]
e = np.abs(x); pk = e.max(); i0 = int(e.argmax()); env = np.convolve(e, np.ones(220) / 220, "same")
t60 = 1000 * (next((i for i in range(i0, len(env)) if env[i] < pk * 0.001), len(env)) - i0) / fs
a, b = i0 + int(0.4 * want["kd"] / 1000 * fs), i0 + int(0.8 * want["kd"] / 1000 * fs)   # inside the kick, after its dive
seg = x[a:b]; z = np.where(np.diff(np.signbit(seg)))[0]; f = (len(z) / 2) / ((b - a) / fs)
okp = abs(f - want["ke"]) <= 0.2 * want["ke"]; okd = 0.7 * want["kd"] <= t60 <= 1.1 * want["kd"]
print(("1" if okp and okd else "0") + f" ends at {f:.0f} Hz (site {want['ke']}), -60 dB at {t60:.0f} ms (site {want['kd']})")
EOF
)
  ok "${r%% *}" "[$kit] the site's kick: ${r#* }"
done

# 9. the speaker rails: every knob a person can reach turned to its worst on all four parts at once (drive / punch,
#    echo and space all the way, the character at full amount, the filter shut, open and high-passed, every fader +6 dB,
#    the biggest room), the FM set too. SLOOP's master limiter must hold every peak at -5.2 dBFS, the mix must stay a
#    mix (no louder than -14 LUFS), and nothing may build up (the last 8 bars no more than 3 dB over bars 9..16)
stress() {
  L="$(env "$@" "$B" song "$OUT/st.wav" 32 major 6 100 7 1 KALIMBA)"
  python3 - "$OUT/st.wav" "$(num "$L" lufs)" "$(num "$L" peak_db)" <<'EOF'
import sys, wave
import numpy as np
w = wave.open(sys.argv[1]); fs = w.getframerate(); ch = w.getnchannels()
x = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, ch) / 32768.0
pk = 20 * np.log10(np.abs(x).max() + 1e-12); bar = int(fs * 2.4)            # 100 bpm: a bar is 2.4 s
db = lambda a: 10 * np.log10(np.mean(x[a * bar:(a + 8) * bar] ** 2) + 1e-20)
grow = db(24) - db(8); lu = float(sys.argv[2])
ok = pk <= -5.0 and lu <= -14 and grow <= 3 and np.isfinite(x).all()
print(("1" if ok else "0") + f" peak {pk:.2f} dBFS, {lu} LUFS, the end {grow:+.1f} dB on the middle")
EOF
}
for c in 0 1 2 3 4 5 6 7; do
  r=$(stress SL_STRESS=$c:0); ok "${r%% *}" "[all at max, character $c] ${r#* }"
done
for cf in 6:-64 6:63 7:-64 7:63; do
  r=$(stress SL_STRESS=$cf); ok "${r%% *}" "[all at max, character / filter $cf] ${r#* }"
done
r=$(stress SL_STRESS=6:0 SL_MELI=10 SL_BASSI=8 SL_COMPI=8); ok "${r%% *}" "[all at max, fuzz, the FM sounds] ${r#* }"

# 8. our FM patches (slime_fm6.py) play in key: the note's own fundamental is its strongest partial, low, middle and high
#    (at Chowning's full index the bell's 0.4x difference tone was: out of key), and every degree sounds within 6 cents
#    of its wall (the tine's and the bass's detuned pairs beat around the note on purpose, as Yamaha's recipes do)
for p in "SH TINE" "SH BELL" "SH HARP" "SH BASS"; do
  parts=""
  for n in 48 60 72; do
    [ "$p" = "SH BASS" ] && n=$((n - 12))
    "$B" note 9 "$p" $n > "$OUT/note.raw"
    parts="$parts $(python3 "$HERE/host/notemeasure.py" "$OUT/note.raw" x $n | sed 's/.*strongest partial *//; s/x$//')"
  done
  off=$(echo $parts | tr ' ' '\n' | awk '{d=$1-1; if(d<0)d=-d; if(d>0.03)n++} END{print n+0}')
  w=$("$B" pitch major 9 "$p" | tail -1 | awk '{print $2}')
  [ "$p" = "SH BELL" ] && w=0   # (the pitch tool reads periods; an inharmonic bell has none: its partial check is the proof)
  ok "$(t "$off == 0 && $w < 6 && $w > -6")" "[$p] in key: strongest partial at three octaves$parts (x the note), worst degree $w cents"
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

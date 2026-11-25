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
M=$(num "$(SL_ONLY=mel song major 6 100)" lufs); D=$(num "$(SL_ONLY=drums SL_DLVL=127 song major 6 100)" lufs)
ok "$(t "$M - $D < 6")" "the mix check can tell: drums at the top of their level are only $(awk "BEGIN{print $M - $D}") LU under"

# 5. every sound the panel offers is a real preset of its engine (a misspelt one quietly became the engine's first
#    preset: AFRO KEYS on the wrong engine played FAT BASS, 2026-11-16), and each part's sounds are level-matched:
#    within 1.5 dB of the part's default, measured alone
L="$("$B" soundcheck)"; ok "$(t "$(num "$L" bad) == 0")" "every panel sound exists in its engine ($L)"
lu1() { num "$("$B" song "$OUT/lv.wav" 24 major 6 100 7 1 KALIMBA)" lufs; }
for pv in "mel MELI $(num "$L" mel)" "bass BASSI $(num "$L" bass)" "comp COMPI $(num "$L" comp)"; do   # (the lists' own lengths: 9 stood here after they grew)
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

# 7. every rhythm's kick (the site's recipe, slime_drums.c; every piece against the site's own render: check-drums.sh),
#    rendered dry, ends on the site's pitch (KITTONE ke, within 20%) and dies when the site's does: -60 dB within
#    70..110% of kd + 20 ms (the site holds its ramp's end until it stops the oscillator 20 ms later: its own pop kick,
#    rendered in the browser, reaches -60 dB at 360 ms for kd 340). The engine's own output (slimehost sdhit): through the
#    bench's master the short kicks gain a -58..-62 dB tail of the master's own (march 246 ms against the engine's 219
#    and the site's 218, measured 2026-11-20); the whole path is check-drums.sh's
ki=0
for kit in "SH POP" "SH ROCK" "SH DISCO" "SH BOSSA" "SH JAZZ" "SH SAMBA" "SH CONGA" "SH MARCH" "SH CHIP" "SH BEEP" "SH INDUS"; do
  "$B" sdhit $ki 36 > "$OUT/hit.raw"; ki=$((ki + 1))
  r=$(python3 - "$OUT/hit.raw" "$kit" "$HERE/slime_kits_expect.json" <<'EOF'
import json, sys
import numpy as np
x = np.fromfile(sys.argv[1], np.float32); fs = 44100; want = json.load(open(sys.argv[3]))[sys.argv[2]]
e = np.abs(x); pk = e.max(); i0 = int(e.argmax()); env = np.convolve(e, np.ones(220) / 220, "same")
t60 = 1000 * (next((i for i in range(i0, len(env)) if env[i] < pk * 0.001), len(env)) - i0) / fs
a, b = i0 + int(0.4 * want["kd"] / 1000 * fs), i0 + int(0.8 * want["kd"] / 1000 * fs)   # inside the kick, after its dive
seg = x[a:b]; z = np.where(np.diff(np.signbit(seg)))[0]; f = (len(z) / 2) / ((b - a) / fs)
okp = abs(f - want["ke"]) <= 0.2 * want["ke"]; okd = 0.7 * (want["kd"] + 20) <= t60 <= 1.1 * (want["kd"] + 20)
print(("1" if okp and okd else "0") + f" ends at {f:.0f} Hz (site {want['ke']}), -60 dB at {t60:.0f} ms (site {want['kd'] + 20})")
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

# 10. the loop (REC, slime.c sl_loop_*): a hand's phrase recorded after the count-in comes back on every pass at its own
#     time (within 3 blocks, 2.2 ms) and pitch, nothing else plays; an overdubbed note joins it; the count-in clicks only
#     the beats still ahead (REC on the 7th sixteenth: two); the loop follows the key journey (its notes move with the key)
L="$OUT/loop.log"
SL_MEL=0 SL_LOOPTEST=1 SL_HLOG="$L" "$B" song "$OUT/lt.wav" 16 major 6 100 7 1 KALIMBA >/dev/null
r=$(python3 "$HERE/host/loopcheck.py" "$L" 38.4 100); ok "${r%% *}" "[loop] ${r#* }"
ok "$(t "$(grep -c '^C ' "$L") == 2")" "[loop] the count-in clicks the beats still ahead: $(grep -c '^C ' "$L") clicks (want 2)"
SL_MEL=0 SL_LOOPTEST=2 SL_HLOG="$L" "$B" song "$OUT/lt.wav" 16 major 6 100 7 1 KALIMBA >/dev/null
r=$(python3 "$HERE/host/loopcheck.py" "$L" 38.4 100 dub); ok "${r%% *}" "[loop, overdub] ${r#* }"
SL_JOURNEY=1 SL_MEL=0 SL_LOOPTEST=1 SL_HLOG="$L" "$B" song "$OUT/lt.wav" 64 major 6 100 7 1 KALIMBA >/dev/null
r=$(python3 - "$L" <<'EOF'
import sys
root, notes, moved = 60, {}, 0
for ln in open(sys.argv[1]):
    w = ln.split()
    if w[0] == "B": root = int(w[3]); moved |= w[4] == "1"
    elif w[0] == "N" and w[2] == "0": notes.setdefault(root, set()).add(int(w[3]) - root)
rel = [sorted(v) for v in notes.values()]
ok = moved and len(notes) >= 2 and all(r == rel[0] for r in rel)
print(("1" if ok else "0") + f" keys {sorted(notes)}: the phrase above each key {rel}")
EOF
)
ok "${r%% *}" "[loop, key journey] ${r#* }"

# 11. the drum bus (slime.c sl_drum_bus, the site's initDrums): every kit's glue takes off what the site's does on its
#     loudest hit (within 1 dB of the browser's measurement), the presence dip takes 4.5..10 dB out of 2.8-5.6 kHz (4.5:
#     the site's own drums, 2026-11-20, put disco's and jazz's hats above the band, where the same filter cuts less:
#     4.9 there; with the dip off, SL_NOPRES, the bus takes 0.06..1.05 on pop rock disco jazz industrial: below), and
#     the drums sit at least 6 dB under the melody there (the site's dev-mix 6b)
SITE_GR="pop:1.8 rock:4.2 disco:2.5 bossa:1.3 jazz:0.1 samba:1.9 conga:0.5 march:2.0 chip:0.9 beep:0.2 industrial:3.1"
mp=$(num "$(SL_ONLY=mel "$B" song "$OUT/g.wav" 16 major 6 100 7 1 KALIMBA)" pres_db)
for kg in $SITE_GR; do
  k=${kg%%:*}; want=${kg##*:}
  L1="$(SL_KIT=$k SL_ONLY=drums "$B" song "$OUT/g.wav" 16 major 6 100 7 1 KALIMBA)"
  p0=$(num "$(SL_KIT=$k SL_ONLY=drums SL_DRUMBUS=0 "$B" song "$OUT/g.wav" 16 major 6 100 7 1 KALIMBA)" pres_db)
  gr=$(num "$L1" glue_worst_db); p1=$(num "$L1" pres_db)
  ok "$(t "($gr + $want) <= 1 && ($gr + $want) >= -1 && $p0 - $p1 >= 4.5 && $p0 - $p1 <= 10 && $mp - $p1 >= 6")" \
     "[$k drum bus] glue $gr dB (site -$want), presence $(awk "BEGIN{printf \"%.1f\", $p0 - $p1}") dB down, $(awk "BEGIN{printf \"%.1f\", $mp - $p1}") dB under the melody"
done
p0=$(num "$(SL_KIT=industrial SL_ONLY=drums SL_DRUMBUS=0 "$B" song "$OUT/g.wav" 16 major 6 100 7 1 KALIMBA)" pres_db)
p1=$(num "$(SL_NOPRES=1 SL_KIT=industrial SL_ONLY=drums "$B" song "$OUT/g.wav" 16 major 6 100 7 1 KALIMBA)" pres_db)
ok "$(t "$p0 - $p1 < 4.5")" "the presence check can tell: the bus without its dip takes only $(awk "BEGIN{printf \"%.2f\", $p0 - $p1}") dB (industrial, the most glue)"

# 8. our FM patches (slime_fm6.py) play in key: the strongest partial is a whole harmonic of the note, low, middle and
#    high (at Chowning's full index the bell's 0.4x difference tone was not: out of key), the note's own fundamental is
#    there once it settles (at most 10 dB under the loudest partial: a patch pitched an octave wrong has nothing there),
#    nothing out of key louder than -25 dB under the loudest partial (the bell excepted: inharmonic on purpose),
#    and every degree sounds within 6 cents of its wall, octaves apart allowed (the tine's and the bass's detuned pairs
#    beat around the note on purpose, as Yamaha's recipes do). (2026-11-25: the strongest partial may be the 2nd: DX7
#    E.PIANO 1 itself is 2.00x at C5, and BASS 1's pluck passes its fundamental through a null at ~200 ms, so the pitch
#    tool reads DX BASS an octave up; the fundamental check is what catches a real octave error. FM_SAB=PRESET:FILE.155
#    puts another voice in that preset's place: the sabotage)
for p in "SH TINE" "SH BELL" "SH HARP" "SH BASS" "SMOOTH EP" "DX BASS"; do
  parts=""; funds=""; unders=""; offks=""
  for n in 48 60 72; do
    case "$p" in *BASS) n=$((n - 12));; esac
    if [ "${FM_SAB:-}" ] && [ "${FM_SAB%%:*}" = "$p" ]; then "$B" vnote "${FM_SAB#*:}" $n > "$OUT/note.raw"; else "$B" note 9 "$p" $n > "$OUT/note.raw"; fi
    m="$(python3 "$HERE/host/notemeasure.py" "$OUT/note.raw" x $n)"
    parts="$parts $(echo "$m" | sed 's/.*strongest partial *//; s/x$//')"
    funds="$funds $(echo "$m" | sed 's/.*fundamental late *//; s/ dB.*//')"
    unders="$unders $(echo "$m" | sed 's/.*octave under *//; s/ dB.*//')"
    offks="$offks $(echo "$m" | sed 's/.*off key *//; s/ dB.*//')"
  done
  offkey=$(echo $offks | tr ' ' '
' | awk '$1 > -25 {n++} END{print n+0}')   # (a partial out of key: a fifth at -12 in the sabotage)
  [ "$p" = "SH BELL" ] && offkey=0   # (Chowning's 1:1.4 bell is inharmonic on purpose: -11 dB)
  low=$(echo $unders | tr ' ' '\n' | awk '$1 > -25 {n++} END{print n+0}')   # (an octave low: its fundamental there)
  off=$(echo $parts | tr ' ' '\n' | awk '{k=int($1+0.5); d=$1-k; if(d<0)d=-d; if(k<1 || d>0.03*k)n++} END{print n+0}')
  nofund=$(echo $funds | tr ' ' '\n' | awk '$1 < -10 {n++} END{print n+0}')
  w=$(SL_PITCHDRY=1 "$B" pitch major 9 "$p" | tail -1 | awk '{print $2}')   # (dry: its own delay return was in the reading, 3.98 cents
                                                                          # on the harp, 6.10 once the delay ping-ponged; dry 0.72)
  [ "$p" = "SH BELL" ] && w=0   # (the pitch tool reads periods; an inharmonic bell has none: its partial check is the proof)
  w=$(awk -v w="$w" 'BEGIN{a=(w<0?-w:w); a-=int(a/1200+0.5)*1200; print (w<0?-a:a)}')   # (octaves apart: the fundamental check)
  ok "$(t "$off == 0 && $nofund == 0 && $low == 0 && $offkey == 0 && $w < 6 && $w > -6")" "[$p] in key: strongest partial at three octaves$parts (x the note), the fundamental$funds dB, an octave under$unders dB, off key$offks dB, worst degree $w cents"
done

for p in "edo31 1 KALIMBA" "edo19all 1 GLOCKEN" "edo24 2 SOFT KEYS" "major 0 SUB BASS"; do
  set -- $p; sc=$1; e=$2; shift 2
  w=$("$B" pitch "$sc" "$e" "$*" | tail -1 | awk '{print $2}')
  ok "$(t "$w < 3 && $w > -3")" "[$sc on $*] every degree within 3 cents of its wall (worst $w)"
done
w=$(SL_NOFINE=1 "$B" pitch edo31 1 KALIMBA | tail -1 | awk '{print $2}')
ok "$(t "$w > 40 || $w < -40")" "the pitch check can tell: without the fine pitch 31-EDO is $w cents out"

# 12. a hand steers the chords (the site's noteManual / manualRoot): F A C on every beat of bars 4..11 -> the band on IV
#     for bars 5..12, the auto chords after; over a progression (ii-V-I) the hand only jams: the progression keeps going
SL_HANDTEST=1 SL_HLOG="$OUT/hand.log" "$B" song "$OUT/hand.wav" 20 major 6 100 7 1 KALIMBA > /dev/null
set -- $(awk '$1=="B"{b=$2; c=$3; if (b>=5 && b<=12) {n++; if (c==3) iv++} if (b>=14 && c!=3) after++} END{print n+0, iv+0, after+0}' "$OUT/hand.log")
ok "$(t "$1 == 8 && $2 == 8 && $3 > 0")" "[hand] F A C played: the band on IV for $2 of $1 bars, then moves on ($3 bars off IV after)"
SL_HANDTEST=2 SL_HLOG="$OUT/hand2.log" "$B" song "$OUT/hand2.wav" 20 major 6 100 7 1 KALIMBA > /dev/null
seq2=$(awk '$1=="B" && $2>=4 && $2<=11 {printf "%s", $3}' "$OUT/hand2.log")
# 12b. too few notes (Flah 2026-11-25: "if not enough note information ... base it off the lowest note last 2 bars"): a low
#      E and a high C on every beat of bars 4..11, two notes only: the band on iii (the lowest, E) for bars 5..12, not on
#      I (the site's triad fit alone: C with its 3rd). Over a 2-bar window (the site's 1.6 s)
SL_HANDTEST=3 SL_HLOG="$OUT/hand3.log" "$B" song "$OUT/hand3.wav" 20 major 6 100 7 1 KALIMBA > /dev/null
set -- $(awk '$1=="B"{b=$2; c=$3; if (b>=5 && b<=12) {n++; if (c==2) iii++}} END{print n+0, iii+0}' "$OUT/hand3.log")
ok "$(t "$1 == 8 && $2 == 8")" "[hand, two notes] a low E and a high C: the band on iii, the lowest note, for $2 of $1 bars"

case "140014001400" in *"$seq2"*) r=$([ ${#seq2} = 8 ] && echo 1 || echo 0) ;; *) r=0 ;; esac
ok "$r" "[hand over a progression] ii V I I, a chord a bar, whatever the hand plays (degrees $seq2)"

# 13. the scales (SONG page, KNOB 4): every one is in the core, and every key and MIDI note (128 of them, in 13 keys)
#     lands on one of its degrees, reaching all of a 7-note scale's notes in an octave of keys and each step of a whole
#     tuning (sabotaged 2026-11-20: an id misspelt: "missing 1"; the snap taken out: 48 scales bad)
r="$("$B" scales | tail -1)"
ok "$(echo "$r" | grep -q " missing 0 bad 0" && echo 1 || echo 0)" "[scales] $r: every key in the scale, in every key"

# 14. the delay in stereo, ping-pong (patch_sloop.py): a click into the delay bus comes back left, right, left, right,
#     one delay apart, each echo REPEATS (0.505 here) times the one before, within 10%; the mono delay before: every
#     echo in the middle
r=$("$B" echo | awk '$1=="delay"{d=$2} $1=="echo"{n++; s[n]=$3; t[n]=$2; v[n]=($3=="L")?$4:$5}
  END{ok=n>=5; for(i=1;i<=n;i++){ if(s[i]!=(i%2?"L":"R")) ok=0; if(t[i]!=i*d) ok=0; if(i>1 && (v[i]/v[i-1]<0.45 || v[i]/v[i-1]>0.56)) ok=0 }
       printf "%d %d echoes, %s ... (each %.3f of the last)", ok, n, s[1] s[2] s[3] s[4], (n>1?v[2]/v[1]:0)}')
ok "${r%% *}" "[delay] ping-pong: ${r#* }"

# 15. the slime muffles the sound as the goo rises (slime.c sl_slime_morph, the site's masterFilt morph made gentler; Flah
#     2026-11-25: "not too much and accurate to the visual"): the melody alone, the tank held empty and just under the
#     burst (SL_FILL 0 / 0.88, as dev-slimesound holds the site's): over 4 kHz down at least 5 dB and at most 14 (the site
#     takes its whole mix to 1.4 kHz), under 400 Hz within 1 dB (low-passed, not thinned), not louder (+0.3 LU at most).
#     The chords too (the bass and the drums keep the groove: they must not move). The control: the slime off, a full tank
#     changes nothing (within 1 dB): the muffle is the slime's.
H="$HERE/host"
for who in mel comp bass; do
  SL_ONLY=$who SL_FILL=0 "$B" song "$OUT/e.wav" 16 major 6 100 7 1 KALIMBA > /dev/null
  SL_ONLY=$who SL_FILL=0.88 "$B" song "$OUT/f.wav" 16 major 6 100 7 1 KALIMBA > /dev/null
  set -- $(python3 "$H/muffle.py" "$OUT/e.wav" "$OUT/f.wav" | awk '{print $4, $9, $17}')
  if [ "$who" = bass ]; then ok "$(t "$1 > -1 && $1 < 1 && $2 > -1 && $2 < 1")" "[slime muffle] the bass keeps its sound at a full tank (over 4 kHz $1 dB, under 400 Hz $2 dB)"
  else ok "$(t "$1 <= -5 && $1 >= -14 && $2 > -1 && $2 < 1 && $3 <= 0.3")" "[slime muffle, $who] a full tank: over 4 kHz $1 dB, under 400 Hz $2 dB, level $3 LU"; fi
done
SL_NOSLIME=1 SL_ONLY=mel SL_FILL=0.88 "$B" song "$OUT/f.wav" 16 major 6 100 7 1 KALIMBA > /dev/null
SL_NOSLIME=1 SL_ONLY=mel SL_FILL=0 "$B" song "$OUT/e.wav" 16 major 6 100 7 1 KALIMBA > /dev/null
set -- $(python3 "$H/muffle.py" "$OUT/e.wav" "$OUT/f.wav" | awk '{print $4}')
ok "$(t "$1 > -1 && $1 < 1")" "[slime muffle] the slime off: a full tank leaves the melody as it is (over 4 kHz $1 dB)"

# 16. the swing (the DRUMS page, Flah 2026-11-25: the drums felt "very rigid"): the band's odd 16ths land late by what the
#     knob says: at 0 only the drummer's humanize (under 6 ms), at 50% nearly a triplet (30..50 ms at 100 bpm), measured on
#     the drums' own onsets (host/onsets.py). Sabotage: a swing that never reaches the band reads ~3 ms at 50%.
for sw in 0 0.5; do
  SL_SWING=$sw SL_KIT=pop SL_ONLY=drums "$B" song "$OUT/sw.wav" 8 major 6 100 7 1 KALIMBA > /dev/null
  late=$(python3 "$HERE/host/onsets.py" "$OUT/sw.wav" 100 | sed 's/.*odd late by *//; s/ ms.*//')
  if [ "$sw" = 0 ]; then ok "$(t "$late > -6 && $late < 6")" "[swing 0] the odd 16ths on the grid: $late ms (the humanize only)"
  else ok "$(t "$late >= 30 && $late <= 50")" "[swing 50%] the odd 16ths $late ms late (a 16th is 150 ms at 100 bpm: nearly a triplet)"; fi
done

# 17. an FM sound's envelope on the ENV page (slime.c sl_fm_env_apply; Flah 2026-11-25: the chords' page "just says FM ...
#     useless"): the knobs move SMOOTH EP's carriers: attack at 100% starts it 6 dB+ softer (10..40 ms), sustain 100%
#     holds it 2 dB+ louder (0.7..0.9 s, the key held), release 100% rings 20 dB+ longer after the key is let go
lv() { "$B" note 9 "SMOOTH EP" 60 80 > "$OUT/fe.raw"; python3 -c "
import numpy as np; x=np.fromfile('$OUT/fe.raw',np.float32); s=x[int($1*44100):int($2*44100)]; print('%.1f' % (20*np.log10(np.sqrt((s**2).mean())+1e-9)))"; }
a0=$(SL_FMENV="64 64 64 64" lv 0.01 0.04); a1=$(SL_FMENV="127 64 64 64" lv 0.01 0.04)
s0=$(SL_FMENV="64 64 64 64" lv 0.7 0.9); s1=$(SL_FMENV="64 64 127 64" lv 0.7 0.9)
r0=$(SL_FMENV="64 64 64 64" lv 1.1 1.3); r1=$(SL_FMENV="64 64 64 127" lv 1.1 1.3)
ok "$(t "$a0 - $a1 >= 6 && $s1 - $s0 >= 2 && $r1 - $r0 >= 20")" "[fm envelope] attack $a0 -> $a1 dB, sustain $s0 -> $s1 dB, release $r0 -> $r1 dB"

echo
[ "$FAILS" = 0 ] && echo "fm1 bridge: clean" || { echo "$FAILS FAILURE(S)"; exit 1; }

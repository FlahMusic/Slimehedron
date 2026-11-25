#!/bin/sh
# Slimehedron for the FM-1: PROJECTS (REC) in fm1-emu STRICT, on the newer UC25HQ80 flash, a blank flash file:
#   run 1: PLAY, notes; REC (the page), KNOB 2 to "save", HOLD REC 1.3 s while the music plays: the project saved;
#          the tempo turned up on SONG; REC, KNOB 2 to "load", HOLD REC: the tempo back
#   1. the save is written while the music plays (1 write, code 0) and the load puts the saved tempo back
#   2. GAPLESS: around the save (9.6..11.0 s) the sound never goes dead (no run of 3 ms+ of zeros) and no half of the
#      audio buffer plays twice (a late DMA loops the last half), against a control stretch (7.0..8.4 s) with neither;
#      0 notes late
#   3. run 2, the same flash, powered on again: the slot is there (1 project found)
# Sabotage: SLIME_EXTRA=-DSL_SAB_ERASE=1 sh build-device.sh (the save through SLOOP's st_save, which erases while
# playing: ~50 ms of silence) must fail 2.   sh fm1/firmware/project-check.sh   (after build-device.sh)
set -eu
FW="${FW:-$HOME/fm1w/slime-fw/build/felucca.fwsc}"
EMU="${EMU:-$HOME/fm1w/fm1-emu}"
O="${OUT:-$HOME/fm1w/out}/proj"
ELF="$(dirname "$FW")/felucca.elf"
R="$HOME/local/root"; export LD_LIBRARY_PATH="$R/usr/lib/x86_64-linux-gnu"
rm -rf "$O"; mkdir -p "$O"
K="5000:PLAY,5090:PLAY^"
for i in 0 1 2 3 4 5 6 7; do t=$((5600 + i * 300)); K="$K,$t:n$((i * 2)),$((t + 150)):n$((i * 2))^"; done
K="$K,${PK_KEYS:-8600:REC,8690:REC^,9000:e3:1,9600:REC,10900:REC^,11400:SCL,11490:SCL^,11900:e2:3,12900:REC,12990:REC^,13300:e3:-1,13700:REC,15000:REC^}"   # (PK_KEYS: another script, to find a late note's cause)
cd "$EMU"
FM1_STRICT=1 FM1_NO_PLAY=1 FM1_DUMPRAM="$O/run1.ram" FM1_BENCH_KEYS="$K" ./target/release/fm1-live --fwsc "$FW" --flash-chip uc25hq80 \
  --flash "$O/flash.bin" --midi none --shot 16000 --lcd-only --record "$O/rec" > "$O/run1.log" 2>&1 || { tail -20 "$O/run1.log"; exit 1; }
FM1_STRICT=1 FM1_NO_PLAY=1 FM1_DUMPRAM="$O/run2.ram" FM1_BENCH_KEYS="" ./target/release/fm1-live --fwsc "$FW" --flash-chip uc25hq80 \
  --flash "$O/flash.bin" --midi none --shot 7000 --lcd-only > "$O/run2.log" 2>&1 || { tail -20 "$O/run2.log"; exit 1; }
D1=$(python3 "$HOME/fm1w/cmp/ramvar.py" "$ELF" "$O/run1.ram" sl_pjdbg 7)
G1=$(python3 "$HOME/fm1w/cmp/ramvar.py" "$ELF" "$O/run1.ram" sl_dbg 4)
D2=$(python3 "$HOME/fm1w/cmp/ramvar.py" "$ELF" "$O/run2.ram" sl_pjdbg 7)
python3 - "$O" "$D1" "$D2" "$G1" <<'PY'
import re, sys
import numpy as np
o, d1, d2, g1 = sys.argv[1], [int(x) for x in sys.argv[2].split()], [int(x) for x in sys.argv[3].split()], [int(x) for x in sys.argv[4].split()]
fails = 0
def ok(c, m):
    global fails
    print(("  PASS  " if c else "  FAIL  ") + m); fails += 0 if c else 1
late, missed = g1[3] & 0xFF, g1[1] >> 16                # (sl_dbg: notes late; audio deadlines missed, the boot's one included)
a = np.frombuffer(open(o + "/rec/audio.raw", "rb").read(), "<i2").reshape(-1, 2).astype(int); fs = 44118
def zero_run(t0, t1):                                   # the longest run of dead zeros (ms)
    s = (np.abs(a[int(t0 * fs):int(t1 * fs)]).max(axis=1) == 0).astype(int)
    best = cur = 0
    for v in s:
        cur = cur + 1 if v else 0; best = max(best, cur)
    return best * 1000.0 / fs
def repeats(t0, t1, h=256):                             # halves of the buffer played twice, sample for sample (not silence)
    seg = a[int(t0 * fs):int(t1 * fs)]; n = 0
    for i in range(h, len(seg) - h, 1):
        if i % 32: continue
        b0, b1 = seg[i - h:i], seg[i:i + h]
        if np.abs(b1).max() > 50 and np.array_equal(b0, b1): n += 1
    return n
ok(d1[0] == 1 and d1[2] == 0 and d1[1] == 1 and d1[3] == d1[5] and d1[6] != d1[5], f"1. saved while playing ({d1[0]} write, code {d1[2]}) and loaded back ({d1[1]} load: tempo {d1[6]} -> {d1[3]}, saved at {d1[5]})")
zs, zc, rs, rc = zero_run(9.6, 11.0), zero_run(7.0, 8.4), repeats(9.6, 11.0), repeats(7.0, 8.4)
ok(zs < 3.0 and rs == 0 and zc < 3.0 and rc == 0 and late == 0 and missed <= 1,
   f"2. gapless: around the save the longest dead run {zs:.1f} ms, {rs} repeated halves (control {zc:.1f} ms, {rc}); {late} notes late, {missed} deadline missed (the boot's)")
ok(d2[4] == 1, f"3. powered on again: {d2[4]} project found")
print("projects: saved while playing, without a gap, and kept" if not fails else f"{fails} failed")
sys.exit(1 if fails else 0)
PY

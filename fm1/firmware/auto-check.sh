#!/bin/sh
# Slimehedron for the FM-1: the slime on, 168 bars at 100 bpm, three rhythms (host bench, after build-host.sh).
# Checks the auto harmony as the site does it:
#   1. a chord lasts 2 bars (S.chordBars), never runs long by repeating itself (a chord = its key + its degree)
#   2. every chord is one of the rhythm's own progressions (FEELS.progs), or home
#   3. the key journey moves every keyJourneyBars (90 s snapped to 8 bars: 40 at 100 bpm), a fifth at a time (+-7,
#      folded into 52..64), at a chord's end
#   4. a crash marks each key move on the styles that crash (CRASH_ON_KEY), and only then; jazz never crashes
#   5. after each move EVERY note (melody, bass, chords) is in the new key's scale
#   sh fm1/firmware/auto-check.sh        SAB=nojourney / SAB=stuck (sabotage: the check must go red)
set -eu
OUT="${OUT:-$HOME/fm1w/out}"; B="$OUT/slimehost"; FAILS=0
for kit in pop rock jazz; do
  J=1; [ "${SAB:-}" = nojourney ] && J=""
  env ${J:+SL_JOURNEY=1} SL_KIT=$kit SL_HLOG="$OUT/hlog-$kit.txt" "$B" song "$OUT/auto.wav" 168 major 6 100 7 1 KALIMBA > /dev/null
  python3 - "$OUT/hlog-$kit.txt" "$kit" "${SAB:-}" <<'EOF' || FAILS=$((FAILS + 1))
import sys
log, kit, sab = sys.argv[1], sys.argv[2], sys.argv[3]
PROGS = {'pop': [[0,4,5,3],[5,3,0,4],[0,5,3,4],[0,3,0,4]], 'rock': [[0,3,4,3],[0,6,3,0],[0,0,3,4],[5,3,0,4]],
         'jazz': [[0,5,1,4],[1,4,2,5],[1,4,0,0],[0,1,4,0]]}
MAJOR = {0, 2, 4, 5, 7, 9, 11}
CRASHES = {'pop': True, 'rock': True, 'jazz': False}
bars, notes, crashes = [], [], 0
for ln in open(log):
    p = ln.split()
    if p[0] == 'B': bars.append((int(p[1]), int(p[2]), int(p[3]), int(p[4])))
    elif p[0] == 'N': notes.append((int(p[1]), int(p[2]), int(p[3]), int(p[4])))
    elif p[0] == 'D' and int(p[2]) == 49: crashes += 1
if sab == 'stuck': bars = [(b, 0, r, m) for b, c, r, m in bars]
fails = []
def ok(c, m):
    print(('  PASS  ' if c else '  FAIL  ') + f'[{kit}] ' + m)
    if not c: fails.append(m)
ids = [(r, c) for b, c, r, m in bars]
runs, last, n = [], None, 0
for x in ids:
    if x == last: n += 1
    else:
        if last is not None: runs.append(n)
        last, n = x, 1
runs = runs[1:]
ok(len(runs) > 30 and max(runs) <= 2 and sum(runs) / len(runs) > 1.8,
   f'a chord lasts 2 bars and never runs long ({len(runs)} chords, runs {min(runs)}..{max(runs)}, mean {sum(runs)/len(runs):.2f})')
allowed = {d for pr in PROGS[kit] for d in pr} | {0}
ok(all(c in allowed for b, c, r, m in bars), f'every chord is one of {kit}\'s own progressions ({sorted(set(c for b, c, r, m in bars))} within {sorted(allowed)})')
moves = [(b, r) for b, c, r, m in bars if m]
roots = [r for b, c, r, m in bars]
steps = [abs(roots[i] - roots[i - 1]) for i in range(1, len(roots)) if roots[i] != roots[i - 1]]
ok(len(moves) == 4 and all(abs(moves[i][0] - 40 * (i + 1)) <= 2 for i in range(len(moves))),
   f'the key moves every 40 bars, about 90 s (at bars {[b for b, r in moves]})')
ok(all(s in (5, 7) for s in steps) and all(52 <= r <= 64 for r in roots), f'a fifth at a time, kept in 52..64 (roots {sorted(set(roots))}, steps {steps})')
ok(crashes == (len(moves) if CRASHES[kit] else 0), f'a crash on each key move where the style crashes ({crashes} crashes, {len(moves)} moves)')
# every note in the key it sounds in: the root at the note's time (the B line logged at the conductor's sim time, the
# note sounds up to 75 ms later; a note within half a bar of a move is skipped, it may belong to either key)
LAT = 41 + 62
bt = [(b, r) for b, c, r, m in bars]
ms_block = 32000 / 44100
bar_blocks = 2400 / ms_block
out = 0; checked = 0
for clk, trk, note, fine in notes:
    bar = (clk - LAT) / bar_blocks
    i = min(int(bar), len(bt) - 1)
    if any(abs(bar - b) < 0.5 for b, r in moves): continue
    root = bt[i][1]
    checked += 1
    if (note - root) % 12 not in MAJOR or fine != 0: out += 1
ok(checked > 1000 and out == 0, f'every note is in the key it sounds in, through {len(moves)} key moves ({checked} notes, {out} outside)')
sys.exit(1 if fails else 0)
EOF
done
echo
[ "$FAILS" = 0 ] && echo "auto: the slime's chords and key journey are intact" || { echo "$FAILS RHYTHM(S) FAILED"; exit 1; }

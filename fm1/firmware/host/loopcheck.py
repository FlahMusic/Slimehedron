#!/usr/bin/env python3
"""The loop (REC) from a slimehost log (SL_LOOPTEST): every hand note comes back on each pass of the loop at its own
time (within 3 blocks, 2.2 ms) and its own pitch, nothing else plays on the melody track, and an overdubbed note joins.
    loopcheck.py LOG SECONDS_OF_SONG BPM [DUB]          prints: 1|0 and the numbers"""
import sys
hands, plays, loop = [], [], None
for ln in open(sys.argv[1]):
    w = ln.split()
    if w[0] == "H": hands.append((int(w[1]), float(w[2])))
    elif w[0] == "N" and w[2] == "0": plays.append((int(w[1]), int(w[3])))
    elif w[0] == "L": loop = (int(w[1]), int(w[2]), int(w[3]))
end = int(float(sys.argv[2]) * 44100 / 32)
if not loop or not hands:
    print("0 no loop closed (hands %d)" % len(hands)); sys.exit()
L = loop[0] * 240.0 / float(sys.argv[3]) * 44100 / 32     # (the bar is 3307.5 blocks at 100 bpm: not rounded)
want = []
for h, c in hands:
    j = 1
    while h + j * L < end - 200:
        want.append((h + round(j * L), 60 + round(c / 100))); j += 1
got, used, miss = 0, set(), []
for t, n in want:
    m = [i for i, (pt, pn) in enumerate(plays) if i not in used and abs(pt - t) <= 3 and pn == n]
    if m: used.add(m[0]); got += 1
    else: miss.append((t, n))
extra = len(plays) - len(used)
dub = len(sys.argv) > 4
ok = got == len(want) and extra == 0 and len(want) > 0 and (not dub or len(hands) == 6)
print(("1" if ok else "0") + f" loop of {loop[0]} bars, {len(hands)} hand notes, {got} of {len(want)} replays on time and in tune, {extra} stray" + (f"; first miss {miss[0]}" if miss else ""))

#!/bin/sh
# Slimehedron for the FM-1: power-on in fm1-emu STRICT (after build-device.sh). Flah 2026-11-18: a slime guy splash with a
# jingle, then the tank, and nothing plays until PLAY; 2026-11-21: headphones slide onto his head, a twinkly melody into
# a big open 7th chord, the name, the fade. A key is pressed stopped at 5.0 s, PLAY at 6.5 s.
#   sh fm1/firmware/boot-check.sh
# 1. the splash shows (seafoam pixels on screen at 1.5 s) and is gone by 4.5 s (the tank, "press play")
# 2. the headphones come down onto his head (their pink cushions on screen at 1.5 s, none at 0.6 s), his little synth
#    drops into his hands (its dark screen at 2.0 s, in front of him; none at 0.6 s), and the stars pop with the twinkle
#    (gold pixels at 1.8 s, none at 0.6 s)
# 3. the jingle plays: the twinkle (peaks over 3000 between 1.2 and 2.1 s) and the chord (between 2.2 and 3.6 s)
# 4. then silence until a key (every sample under 100 from 4.4 to 5.0 s): nothing plays by itself
# 5. stopped, a key plays its note (a peak over 1000 from 5.0 to 5.6 s) and drops no ball into the still tank (a run to
#    6.0 s with the same key: the tank's ball count, sl_mdbg[5], is 0)
# 6. PLAY starts the music (peaks over 3000 from 7.5 s)
# 7. the page round the tank (2026-11-21): the lake's sky in the top left (blue pixels at 8 s), the pink mini slime in
#    its corner, the worm bottom right (saturated pastel pixels), a new colour on him a beat later (8.0 s against 8.7 s)
#    Sabotaged 2026-11-21: the lake layer off (the lake, minis and worm checks red), the worm off (the worm check red).
# 8. the minis answer a hand (2026-11-23, slime_minis.h): a key while it plays (7.9 s, clear of the bar's ripples) makes
#    exactly ONE mini hop within 150 ms (the bar's 1 moves all five); with no key (7.70 against 7.86 s) none moves
set -eu
FW="${FW:-$HOME/fm1w/slime-fw/build/felucca.fwsc}"
EMU="${EMU:-$HOME/fm1w/fm1-emu}"
O="${OUT:-$HOME/fm1w/out}/boot"
R="$HOME/local/root"; export LD_LIBRARY_PATH="$R/usr/lib/x86_64-linux-gnu"
rm -rf "$O"; mkdir -p "$O"
cd "$EMU"
FM1_STRICT=1 FM1_NO_PLAY=1 FM1_BENCH_KEYS="5000:n7,5200:n7^,6500:PLAY,6590:PLAY^,7900:n0,7990:n0^" ./target/release/fm1-live --fwsc "$FW" --flash-chip uc25hq80 \
  --midi none --shot 10000 --lcd-only --record "$O/rec" > "$O/emu.log" 2>&1 || { tail -20 "$O/emu.log"; exit 1; }
FM1_STRICT=1 FM1_NO_PLAY=1 FM1_DUMPRAM="$O/stopped.ram" FM1_BENCH_KEYS="5000:n7,5200:n7^" ./target/release/fm1-live --fwsc "$FW" --flash-chip uc25hq80   --midi none --shot 6000 --lcd-only > "$O/emu2.log" 2>&1 || { tail -20 "$O/emu2.log"; exit 1; }
NB=$(python3 "$HOME/fm1w/cmp/ramvar.py" "$(dirname "$FW")/felucca.elf" "$O/stopped.ram" sl_mdbg 8 | awk '{print $6}')
python3 - "$O" "$NB" <<'EOF'
import os, sys
import numpy as np
from PIL import Image
o = sys.argv[1]; fails = 0
def ok(c, m):
    global fails
    print(("  PASS  " if c else "  FAIL  ") + m); fails += 0 if c else 1
fr = sorted(f for f in os.listdir(o + "/rec") if f.endswith(".ppm"))
def frame(ms): return np.asarray(Image.open(o + "/rec/" + fr[min(len(fr) - 1, ms // 16)]).convert("RGB")).astype(int)
def count(ms, rgb, tol=8, rows=None):
    a = frame(ms)
    if rows: a = a[rows[0]:rows[1]]
    return int(((abs(a[..., 0] - rgb[0]) < tol) & (abs(a[..., 1] - rgb[1]) < tol) & (abs(a[..., 2] - rgb[2]) < tol)).sum())
s1, s2 = count(1500, (143, 228, 196)), count(4500, (143, 228, 196))   # the slime's body (RGB565 0x8F38)
ok(s1 > 3000, f"the splash shows at 1.5 s ({s1} seafoam pixels)")
ok(s2 < 50, f"and is gone by 4.5 s ({s2})")
h0, h1 = count(600, (255, 109, 181), 14), count(1500, (255, 109, 181), 14)   # the cushions (0xFB76)
ok(h0 < 20 and h1 > 200, f"the headphones come down onto his head ({h0} cushion pixels at 0.6 s, {h1} at 1.5 s)")
f0, f1 = count(600, (33, 32, 66), 10), count(2000, (33, 32, 66), 10, (110, 160))   # the synth's screen (0x2108), at his tummy
ok(f0 < 10 and f1 > 60, f"his synth drops into his hands ({f0} screen pixels at 0.6 s, {f1} at 2.0 s in front of him)")
def warm(ms): a = frame(ms); return int(((a[..., 0] > 220) & (a[..., 1] > 150) & (a[..., 2] < 170)).sum())   # gold stars (0xFE47), fading into the page
g0, g = warm(600), warm(1800)
ok(g0 == 0 and g > 10, f"stars pop with the twinkle ({g0} gold pixels at 0.6 s, {g} at 1.8 s)")
a = np.abs(np.frombuffer(open(o + "/rec/audio.raw", "rb").read(), "<i2").astype(int)); fs = 44118
pk = lambda t0, t1: int(a[int(t0 * fs) * 2:int(t1 * fs) * 2].max())
tw, ch, q, k, m = pk(1.2, 2.1), pk(2.2, 3.6), pk(4.4, 5.0), pk(5.0, 5.6), pk(7.5, 10.0)
ok(tw > 3000 and ch > 3000, f"the jingle: the twinkle (peak {tw}, 1.2..2.1 s) and the chord (peak {ch}, 2.2..3.6 s)")
ok(q < 100, f"then nothing plays by itself (peak {q} from 4.4 to 5.0 s)")
ok(k > 1000, f"stopped, a key plays its note (peak {k} from 5.0 to 5.6 s)")
nb = int(sys.argv[2])
ok(nb == 0, f"and drops no ball into the still tank ({nb} balls in it at 6.0 s)")
ok(m > 3000, f"PLAY starts the music (peak {m} from 7.5 s)")
f8, f87 = frame(8000), frame(8700)
sky = int(((f8[18:50, 0:60, 2] - f8[18:50, 0:60, 0]) > 20).sum())
pink = count(8000, (255, 178, 222), 22, (28, 50))
def worm(a):
    w = a[214:240, 192:232].reshape(-1, 3); sat = (w.max(axis=1) - w.min(axis=1)) > 60
    return int(sat.sum()), (w[sat].mean(axis=0) if sat.sum() else np.zeros(3))
n8, c8 = worm(f8); n87, c87 = worm(f87)
ok(sky > 800 and pink > 40, f"the lake behind the tank ({sky} sky pixels top left) and the minis ({pink} pink pixels at the top-left one)")
ok(n8 > 60 and np.abs(c8 - c87).sum() > 20, f"the worm bottom right ({n8} pixels of him), a new colour a beat later (moved {np.abs(c8 - c87).sum():.0f})")
AT = [(20, 38), (220, 42), (18, 214), (52, 228), (150, 230)]   # SL_MINI_AT (slime_ui.c)
def box(a, i): x, y = AT[i]; return a[max(0, y - 20):min(240, y + 13), max(0, x - 12):min(240, x + 13)]
def moved(t0, t1): return [i for i in range(5) if np.abs(box(frame(t1), i) - box(frame(t0), i)).sum() > 300]
mk, m0 = moved(7860, 8020), moved(7700, 7860)
ok(len(mk) == 1 and not m0, f"the minis answer a hand: a key moves {len(mk)} mini (#{mk}), no key moves {len(m0)}")
print("power-on behaves" if not fails else f"{fails} failed")
sys.exit(1 if fails else 0)
EOF

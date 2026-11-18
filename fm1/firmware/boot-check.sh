#!/bin/sh
# Slimehedron for the FM-1: power-on in fm1-emu STRICT (after build-device.sh). Flah 2026-11-18: a slime guy splash with a
# jingle, then the tank, and nothing plays until PLAY. PLAY is pressed at 5.5 s.
#   sh fm1/firmware/boot-check.sh
# 1. the splash shows (seafoam pixels on screen at 1.5 s) and is gone by 4.5 s (the tank, "press play")
# 2. the jingle plays (peaks over 3000 between 0.5 and 2.5 s)
# 3. then silence until PLAY (every sample under 100 from 4.0 to 5.5 s): nothing plays by itself
# 4. PLAY starts the music (peaks over 3000 from 6.5 s)
set -eu
FW="${FW:-$HOME/fm1w/slime-fw/build/felucca.fwsc}"
EMU="${EMU:-$HOME/fm1w/fm1-emu}"
O="${OUT:-$HOME/fm1w/out}/boot"
R="$HOME/local/root"; export LD_LIBRARY_PATH="$R/usr/lib/x86_64-linux-gnu"
rm -rf "$O"; mkdir -p "$O"
cd "$EMU"
FM1_STRICT=1 FM1_NO_PLAY=1 FM1_BENCH_KEYS="5500:PLAY,5590:PLAY^" ./target/release/fm1-live --fwsc "$FW" --flash-chip uc25hq80 \
  --midi none --shot 9000 --lcd-only --record "$O/rec" > "$O/emu.log" 2>&1 || { tail -20 "$O/emu.log"; exit 1; }
python3 - "$O" <<'EOF'
import os, sys
import numpy as np
from PIL import Image
o = sys.argv[1]; fails = 0
def ok(c, m):
    global fails
    print(("  PASS  " if c else "  FAIL  ") + m); fails += 0 if c else 1
fr = sorted(f for f in os.listdir(o + "/rec") if f.endswith(".ppm"))
def seafoam(ms):   # the slime's body colour (142, 230, 196 in RGB565: 140..148, 224..232, 192..200)
    a = np.asarray(Image.open(o + "/rec/" + fr[min(len(fr) - 1, ms // 16)]).convert("RGB")).astype(int)
    return int(((abs(a[..., 0] - 143) < 8) & (abs(a[..., 1] - 228) < 8) & (abs(a[..., 2] - 196) < 8)).sum())
s1, s2 = seafoam(1500), seafoam(4500)
ok(s1 > 3000, f"the splash shows at 1.5 s ({s1} seafoam pixels)")
ok(s2 < 50, f"and is gone by 4.5 s ({s2})")
a = np.abs(np.frombuffer(open(o + "/rec/audio.raw", "rb").read(), "<i2").astype(int)); fs = 44118
pk = lambda t0, t1: int(a[int(t0 * fs) * 2:int(t1 * fs) * 2].max())
j, q, m = pk(0.5, 2.5), pk(4.0, 5.5), pk(6.5, 9.0)
ok(j > 3000, f"the jingle plays (peak {j} between 0.5 and 2.5 s)")
ok(q < 100, f"then nothing plays until PLAY (peak {q} from 4.0 to 5.5 s)")
ok(m > 3000, f"PLAY starts the music (peak {m} from 6.5 s)")
print("power-on behaves" if not fails else f"{fails} failed")
sys.exit(1 if fails else 0)
EOF

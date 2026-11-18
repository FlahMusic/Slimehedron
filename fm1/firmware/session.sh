#!/bin/sh
# Slimehedron for the FM-1: a whole session in fm1-emu STRICT, as a person would play it (host/session.py: every
# button and encoder, the double taps, a loop recorded and overdubbed, songs saved and loaded), then the FM-1 powered
# off and on again on the same flash: the session must come back. After build-device.sh.
#   sh fm1/firmware/session.sh            -> ~/fm1w/out/session/: session.wav (what it played), sheet.png (the screen
#                                            at each step, captioned), reboot.png, and the numbers on stdout
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
FW="${FW:-$HOME/fm1w/slime-fw/build/felucca.fwsc}"
EMU="${EMU:-$HOME/fm1w/fm1-emu}"
O="${OUT:-$HOME/fm1w/out}/session"
TC="${JIELI_TOOLCHAIN:-$HOME/.jieli/toolchain}"
R="$HOME/local/root"; export LD_LIBRARY_PATH="$R/usr/lib/x86_64-linux-gnu"
ELF="$(dirname "$FW")/felucca.elf"
A="$("$TC/common/bin/objdump" -t "$ELF" | awk '$NF=="sl_dbg"{print $1}')"
rm -rf "$O"; mkdir -p "$O"
python3 "$HERE/host/session.py" keys "$O/keys.txt" > "$O/marks.txt"
END=$(awk '$1=="END"{print $2}' "$O/marks.txt")
cd "$EMU"
FM1_STRICT=1 FM1_NO_PLAY=1 FM1_DUMP="$A" FM1_BENCH_KEYS="@$O/keys.txt" ./target/release/fm1-live --fwsc "$FW" --flash-chip uc25hq80 \
  --flash "$O/flash.bin" --midi none --shot "$END" --lcd-only --record "$O/rec" > "$O/run.log" 2>&1 || { tail -20 "$O/run.log"; exit 1; }
# the power cycle: the same flash, no keys, 6 s
FM1_STRICT=1 FM1_NO_PLAY=1 FM1_DUMP="$A" FM1_BENCH_KEYS="" ./target/release/fm1-live --fwsc "$FW" --flash-chip uc25hq80 \
  --flash "$O/flash.bin" --midi none --shot 9000 --lcd-only --record "$O/rec2" > "$O/run2.log" 2>&1 || { tail -20 "$O/run2.log"; exit 1; }
python3 - "$O" <<'EOF'
import os, re, struct, sys, wave
import numpy as np
from PIL import Image, ImageDraw
o = sys.argv[1]
def dump(log):
    d = re.search(r"dump 0x[0-9a-f]+: ([0-9a-f]+) ([0-9a-f]+) ([0-9a-f]+) ([0-9a-f]+)", open(log).read())
    return [int(x, 16) for x in d.groups()] if d else [0, 0, 0, 0]
w = dump(o + "/run.log")
print(f"frames {w[0] & 0xFFFF}, worst frame {w[0] >> 16} ms; audio worst half {w[1] & 0xFFFF} us of 5805, deadlines missed {w[1] >> 16}; "
      f"notes late {w[3] & 0xFF}; fps over 5 s windows: worst {((w[3] >> 8) & 0xFFF) / 10}, last {(w[3] >> 20) / 10}")
for ln in open(o + "/run.log"):
    if ln.startswith("flash:") or "fault" in ln or "halt" in ln: print(ln.strip())
# the audio: a WAV to listen to, its loudness (BS.1770 K-weighting, gated) and its peaks
a = np.frombuffer(open(o + "/rec/audio.raw", "rb").read(), "<i2").reshape(-1, 2).astype(np.float64) / 32768
fs = 44118
with wave.open(o + "/session.wav", "wb") as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(fs); f.writeframes((a * 32767).astype("<i2").tobytes())
from scipy.signal import lfilter
def kw(x):
    import math
    f0, G, Q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
    K = math.tan(math.pi * f0 / fs); Vh = 10 ** (G / 20); Vb = Vh ** 0.4996667741545416; a0 = 1 + K / Q + K * K
    b1 = [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0]; a1 = [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
    f0, Q = 38.13547087602444, 0.5003270373238773; K = math.tan(math.pi * f0 / fs)
    b2 = [1, -2, 1]; a2 = [1, 2 * (K * K - 1) / (1 + K / Q + K * K), (1 - K / Q + K * K) / (1 + K / Q + K * K)]
    return lfilter(b2, a2, lfilter(b1, a1, x))
y = np.stack([kw(a[:, 0]), kw(a[:, 1])], 1)
blk = int(0.4 * fs); hop = int(0.1 * fs)
L = np.array([-0.691 + 10 * np.log10((y[i:i + blk] ** 2).mean(0).sum() + 1e-20) for i in range(0, len(y) - blk, hop)])
g = L[L > -70]; g = g[g > -0.691 + 10 * np.log10(np.mean(10 ** ((g + 0.691) / 10))) - 10]
lufs = -0.691 + 10 * np.log10(np.mean(10 ** ((g + 0.691) / 10)))
pk = 20 * np.log10(np.abs(a).max() + 1e-12)
quiet = [i * 0.5 for i in range(int(len(a) / fs * 2)) if np.abs(a[int(i * fs / 2):int((i + 1) * fs / 2)]).max() < 1e-3]
print(f"session.wav: {len(a) / fs:.1f} s, {lufs:.1f} LUFS (the site: -18.8), peak {pk:.1f} dBFS; silent half-seconds: {len(quiet)}"
      + (f" (first at {quiet[0]} s)" if quiet else ""))
# the screen at each step, captioned
marks = [ln.split(None, 1) for ln in open(o + "/marks.txt") if not ln.startswith("END")]
fr = sorted(f for f in os.listdir(o + "/rec") if f.endswith(".ppm"))
cols = 6; rows = (len(marks) + cols - 1) // cols
sheet = Image.new("RGB", (cols * 240, rows * 262), (255, 255, 255)); dr = ImageDraw.Draw(sheet)
for i, (ms, what) in enumerate(marks):
    k = min(len(fr) - 1, int(ms) // 16)
    sheet.paste(Image.open(o + "/rec/" + fr[k]).convert("RGB"), ((i % cols) * 240, (i // cols) * 262))
    dr.text(((i % cols) * 240 + 4, (i // cols) * 262 + 244), f"{int(ms) / 1000:.1f}s  {what.strip()}", fill=(0, 0, 0))
sheet.save(o + "/sheet.png")
fr2 = sorted(f for f in os.listdir(o + "/rec2") if f.endswith(".ppm"))
pick = [fr2[min(len(fr2) - 1, int(ms / 16))] for ms in (1600, 2200, 4000, 8800)]
s2 = Image.new("RGB", (240 * 4, 240))
for i, f in enumerate(pick): s2.paste(Image.open(o + "/rec2/" + f).convert("RGB"), (240 * i, 0))
s2.save(o + "/reboot.png")
w2 = dump(o + "/run2.log")
a2 = np.frombuffer(open(o + "/rec2/audio.raw", "rb").read(), "<i2")
print(f"after the power cycle: frames {w2[0] & 0xFFFF}, audio peak {20 * np.log10(np.abs(a2).max() / 32768 + 1e-12):.1f} dBFS; sheet.png, reboot.png in {o}")
EOF

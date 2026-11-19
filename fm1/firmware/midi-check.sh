#!/bin/sh
# Slimehedron for the FM-1: MIDI in and out in fm1-emu STRICT, with USB on (after build-device.sh).
#   sh fm1/firmware/midi-check.sh
# Run 1 (major): PLAY at 4.3 s, a note into the DIN jack (C2) at 6 s, a panel key (F3) at 7 s, a computer's MIDI clock at
#   120 bpm over USB from 8 s to 12 s, its STOP at 12.5 s, START at 13.5 s, a panic (CC 123) at 15.9 s.
# Run 2 (31-note scale: the SONG page's scale knob), PLAY; then notes go out with their bends.
# Run 3 (31-note scale, stopped, the melody's fx dry: its chorus smears the pitch): three keys up from the root, one at a
#   time: the audio's pitch steps by 31-EDO's 38.7 cents.
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
FW="${FW:-$HOME/fm1w/slime-fw/build/felucca.fwsc}"
ELF="$(dirname "$FW")/felucca.elf"
EMU="${EMU:-$HOME/fm1w/fm1-emu}"
O="${OUT:-$HOME/fm1w/out}/midi"
R="$HOME/local/root"; export LD_LIBRARY_PATH="$R/usr/lib/x86_64-linux-gnu"
rm -rf "$O"; mkdir -p "$O"
# the computer's clock: 120 bpm = a tick every 20.833 ms, 8.0 .. 12.0 s; STOP, START, the panic
python3 - "$O/usb.txt" <<'EOF'
import sys
ev = ["%d:f8" % round(8000 + i * 1000 / 48) for i in range(int(4000 * 48 / 1000))]
ev += ["12500:fc", "13500:fa", "15900:b07b00"]
open(sys.argv[1], "w").write(";".join(ev))
EOF
cd "$EMU"
run() {   # NAME KEYS MS [USB]
  U="${4:-}"; FM1_STRICT=1 FM1_NO_PLAY=1 FM1_DUMPRAM="$O/$1.ram" FM1_BENCH_KEYS="$2" FM1_USB_SEND="${U:+@$U}" ./target/release/fm1-live --fwsc "$FW" \
    --flash-chip uc25hq80 --midi none --usb --shot "$3" --lcd-only --record "$O/$1" > "$O/$1.log" 2>&1 || { tail -20 "$O/$1.log"; exit 1; }
}
run one "4300:PLAY,4390:PLAY^,6000:m902464,6300:m802400,7000:n0,7100:n0^" 16000 "$O/usb.txt"
SCL="4400:SCL,4460:SCL^,5000:e5:-1,5600:SCL,5660:SCL^,"   # (the SONG page's scale knob, one click left of major: 31-edo; back to the tank)
run two "${SCL}9000:PLAY,9090:PLAY^" 20000
run three "3900:FX,3960:FX^,4100:e6:1,4300:HOME,4360:HOME^,${SCL}9000:n7,9500:n7^,10000:n8,10500:n8^,11000:n9,11500:n9^" 12500
python3 - "$O" "$ELF" <<'EOF'
import os, re, sys, struct, subprocess
import numpy as np
o, elf = sys.argv[1], sys.argv[2]; fails = 0
def ok(c, m):
    global fails
    print(("  PASS  " if c else "  FAIL  ") + m); fails += 0 if c else 1
def sym(name):
    for ln in subprocess.run([os.path.expanduser("~/.jieli/toolchain/common/bin/objdump"), "-t", elf], capture_output=True, text=True).stdout.splitlines():
        p = ln.split()
        if p and p[-1] == name: return int(p[0], 16)
def words(run, name, n):
    d = open(f"{o}/{run}.ram", "rb").read(); a = sym(name) - 0x1C00000
    return struct.unpack("<%dI" % n, d[a:a + 4 * n])
def out(run):   # the MIDI the FM-1 sent: (ms, [bytes])
    r = []
    for ln in open(f"{o}/{run}.log"):
        m = re.match(r"\[\s*(\d+) ms\] usb in:\s+(.*)", ln)
        if m: r.append((int(m.group(1)), [int(x, 16) for x in m.group(2).split()]))
    return r
M = out("one")
st = lambda m, lo, hi: [b for t, b in M if lo <= t < hi]
ok(any(b[0] == 0xFA for b in st(M, 4300, 4500)), "PLAY sends START")
f8 = len([b for b in st(M, 5000, 7000) if b[0] == 0xF8]); bpm = words("one", "sl_mdbg", 8)
ok(abs(f8 - 24 * 90 / 60 * 2) <= 3, f"and the clock, 24 a beat: {f8} ticks in 2 s at 90 bpm (want 72)")
chans = {b[0] for b in st(M, 4300, 7900) if b[0] & 0xF0 == 0x90}
ok({0x90, 0x91, 0x92, 0x99} <= chans, "the melody, bass, chords and drums go out on channels 1, 2, 3, 10 (" + " ".join("%x" % c for c in sorted(chans)) + ")")
ok(not any(b[:2] == [0x90, 0x24] for b in st(M, 5900, 7000)), "a note from the jack (C2) plays but is not echoed back out")
ok(any(b[:2] == [0x90, 0x35] for b in st(M, 7000, 7100)), "a panel key (F3) goes out on channel 1")
offs = {(b[0] & 15, b[1]) for b in st(M, 4300, 16000) if b[0] & 0xF0 == 0x80 or (b[0] & 0xF0 == 0x90 and b[2] == 0)}
ons = [(b[0] & 15, b[1]) for b in st(M, 4300, 11000) if b[0] & 0xF0 == 0x90 and b[2]]
ok(all(x in offs for x in ons), f"every note that went out was ended ({len(ons)} notes)")
ok(not any(b[0] == 0xF8 for b in st(M, 8500, 12000)), "a clock coming in: ours stops (it follows instead)")
print("   MIDI in counted:", bpm[0], "out:", bpm[1], "realtime out:", bpm[2], "tempo at the end:", bpm[3])
ok(bpm[3] == 120, f"it took the computer's tempo: {bpm[3]} bpm (sent 120)")
ok(not any(b[0] & 0xF0 == 0x90 and b[2] for b in st(M, 12700, 13500)), "the computer's STOP stops it (no notes 12.7 .. 13.5 s)")
ok(any(b[0] & 0xF0 == 0x90 and b[2] for b in st(M, 13600, 15800)), "its START starts it again")
ok(bpm[4] == 1 and bpm[5] <= 1, f"the panic (CC 123) empties the tank ({bpm[5]} notes in it after)")
N = out("two"); bends = [b for t, b in N if b[0] & 0xF0 == 0xE0 and t >= 9000]
mel = {b[0] & 15 for b in bends if 10 <= b[0] & 15 <= 15}; com = {b[0] & 15 for b in bends if 3 <= b[0] & 15 <= 8}
ok(len(mel) >= 3, "31-EDO: the melody's notes go out with their own bends, round channels 11..16 (" + ",".join(str(c + 1) for c in sorted(mel)) + ")")
ok(len(com) >= 3, "and the chords' round channels 4..9 (" + ",".join(str(c + 1) for c in sorted(com)) + ")")
pairs = 0; good = 0
for i in range(len(N) - 1):
    a, b = N[i][1], N[i + 1][1]
    if a[0] & 0xF0 == 0xE0 and b[0] & 0xF0 == 0x90: pairs += 1; good += (a[0] & 15) == (b[0] & 15)
ok(pairs > 10 and good == pairs, f"each bend is on its note's own channel, just before it ({good} of {pairs})")
# 3: the keys' pitch, 31-EDO: root, +1, +2 steps
a = np.frombuffer(open(f"{o}/three/audio.raw", "rb").read(), "<i2").reshape(-1, 2)[:, 0].astype(float); fs = 44118
def f0(t0):
    x = a[int((t0 + 0.04) * fs):int((t0 + 0.34) * fs)]; x = x - x.mean()
    if len(x) < 1000 or np.abs(x).max() < 50: return 0
    n = 1 << 18; X = np.abs(np.fft.rfft(x * np.hanning(len(x)), n)); f = np.fft.rfftfreq(n, 1 / fs)
    lo = (f > 150) & (f < 1200); k = np.argmax(X * lo)
    return f[k]
fr = [f0(t) for t in (9.0, 10.0, 11.0)]
c = [1200 * np.log2(fr[i + 1] / fr[i]) if fr[i] and fr[i + 1] else 0 for i in range(2)]
ok(all(abs(x - 1200 / 31) < 4 for x in c), "31-EDO keys: each key one step up, %.1f and %.1f cents (want 38.7; %.1f %.1f %.1f Hz)" % (c[0], c[1], *fr))
print("MIDI and the microtones behave" if not fails else f"{fails} failed")
sys.exit(1 if fails else 0)
EOF

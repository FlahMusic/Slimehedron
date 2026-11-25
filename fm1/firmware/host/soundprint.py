#!/usr/bin/env python3
"""How a note sounds over time, as numbers, and how far two notes are apart.
  soundprint.py A.raw MIDI                one note (slimehost note ENG "PRESET" MIDI > A.raw): its print
  soundprint.py A.raw B.raw MIDI          two notes: both prints and the distance

A print is the note's level in third-octave bands (63 Hz .. 12.5 kHz) at eight moments after it starts (10 ms .. 1.2 s),
each file normalised to its own loudest band, so a print says the TIMBRE and how it moves (a tine's bite fading, a bass's
bark closing), not the level (the parts' trims set that). Bands more than 50 dB under the peak count as 50 dB under (noise).
The distance is the RMS of the dB differences over every band and moment: 0 the same sound; ~3 dB a close copy (two
renders of one patch through two velocity curves); 10+ another instrument.
Also: the attack (to 90% of the peak, ms), the decay (-20 dB, ms) and the brightness (spectral centroid / fundamental) at
20 ms and at 400 ms."""
import sys
import numpy as np

FS = 44100
MOMENTS = (0.01, 0.03, 0.06, 0.1, 0.2, 0.4, 0.7, 1.2)
CENTRES = [63 * 2 ** (k / 3) for k in range(24)]          # 63 Hz .. 12.7 kHz
FLOOR = -50.0


def load(path):
    x = np.fromfile(path, np.float32)
    e = np.abs(x)
    start = int(np.argmax(e > e.max() * 0.02))           # the note's start (the render may lead with silence)
    return x[start:], x


def bands(x, at, n=2048):
    a = int(at * FS)
    seg = x[a:a + n]
    if len(seg) < n:
        seg = np.pad(seg, (0, n - len(seg)))
    s = np.abs(np.fft.rfft(seg * np.hanning(n))) ** 2
    f = np.fft.rfftfreq(n, 1 / FS)
    out = []
    for c in CENTRES:
        lo, hi = c / 2 ** (1 / 6), c * 2 ** (1 / 6)
        out.append(s[(f >= lo) & (f < hi)].sum() + 1e-20)
    return 10 * np.log10(np.array(out))


def fingerprint(x):
    p = np.array([bands(x, t) for t in MOMENTS])
    p -= p.max()
    return np.maximum(p, FLOOR)


def facts(x, midi):
    f0 = 440 * 2 ** ((midi - 69) / 12)
    env = np.convolve(np.abs(x), np.ones(221) / 221, "same")
    pk = env.max(); ip = int(np.argmax(env))
    att = 1000 * int(np.argmax(env > pk * 0.9)) / FS
    dec = next((i for i in range(ip, len(env)) if env[i] < pk * 0.1), len(env))

    def centroid(at, n=4096):
        a = int(at * FS); seg = x[a:a + n]
        if len(seg) < n: seg = np.pad(seg, (0, n - len(seg)))
        s = np.abs(np.fft.rfft(seg * np.hanning(n))) ** 2; f = np.fft.rfftfreq(n, 1 / FS)
        return (s * f).sum() / (s.sum() + 1e-20) / f0
    return att, 1000 * (dec - ip) / FS, centroid(0.02), centroid(0.4)


def show(name, x, midi):
    p = fingerprint(x)
    att, dec, c0, c1 = facts(x, midi)
    print(f"{name}: attack {att:5.1f} ms  -20 dB after {dec:6.0f} ms  brightness {c0:4.1f}x -> {c1:4.1f}x")
    print("        " + " ".join(f"{int(c):>5d}" if c < 1000 else f"{c / 1000:>4.1f}k" for c in CENTRES))
    for t, row in zip(MOMENTS, p):
        print(f"{1000 * t:5.0f}ms " + " ".join(f"{v:5.0f}" for v in row))
    return p


if __name__ == "__main__":
    if len(sys.argv) == 3:
        show(sys.argv[1], load(sys.argv[1])[0], int(sys.argv[2]))
    else:
        midi = int(sys.argv[3])
        a = show(sys.argv[1], load(sys.argv[1])[0], midi)
        b = show(sys.argv[2], load(sys.argv[2])[0], midi)
        d = a - b
        print(f"distance {np.sqrt((d ** 2).mean()):.1f} dB  (early, to 100 ms: {np.sqrt((d[:4] ** 2).mean()):.1f}; "
              f"late: {np.sqrt((d[4:] ** 2).mean()):.1f})")

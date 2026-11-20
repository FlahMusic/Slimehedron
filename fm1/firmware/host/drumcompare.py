#!/usr/bin/env python3
"""The FM-1's drum hit against the site's (fm1/host/site-hits.js), both 1 s of float32 mono:
   drumcompare.py FM1.raw SITE.raw LABEL
Both are set to the same peak first (the levels are the mix's job: check-host.sh's mix checks), then:
  env   the shape in time: 5 ms RMS frames in dB, the mean distance over the frames where either is above -45 dB
  spec  the colour: the energy in 1/3-octave bands 40 Hz..16 kHz over the hit, each band in dB against its loudest, the
        mean distance over the bands where either is above -35 dB
  t30   how long each takes to fall 30 dB from its loudest frame (ms)
Prints one line: LABEL env D spec D t30 FM1 SITE."""
import sys
import numpy as np

FS = 44100


def load(p):
    x = np.fromfile(p, np.float32).astype(np.float64)
    pk = np.abs(x).max()
    return x / pk if pk > 0 else x


def frames(x):
    n = int(0.005 * FS)
    m = len(x) // n
    r = np.sqrt((x[:m * n].reshape(m, n) ** 2).mean(axis=1) + 1e-20)
    return 20 * np.log10(r)


def bands(x):
    sp = np.abs(np.fft.rfft(x)) ** 2
    fr = np.fft.rfftfreq(len(x), 1 / FS)
    out = []
    f = 40.0
    while f < 16000:
        lo, hi = f / 2 ** (1 / 6), f * 2 ** (1 / 6)
        out.append(sp[(fr >= lo) & (fr < hi)].sum() + 1e-20)
        f *= 2 ** (1 / 3)
    b = 10 * np.log10(np.array(out))
    return b - b.max()


def t30(e):
    i0 = int(e.argmax())
    k = next((i for i in range(i0, len(e)) if e[i] < e[i0] - 30), len(e))
    return 5 * (k - i0)


a, b = load(sys.argv[1]), load(sys.argv[2])
# line them up on the onset (the first sample over 10% of the peak): the bench's hit starts a block in
oa = int(np.argmax(np.abs(a) > 0.1)); ob = int(np.argmax(np.abs(b) > 0.1))
a = a[max(0, oa - 64):]; b = b[max(0, ob - 64):]
n = min(len(a), len(b)); a, b = a[:n], b[:n]
ea, eb = frames(a), frames(b)
ea -= ea.max(); eb -= eb.max()
live = (ea > -45) | (eb > -45)
env = float(np.abs(np.maximum(ea, -60) - np.maximum(eb, -60))[live].mean())
ba, bb = bands(a), bands(b)
lb = (ba > -35) | (bb > -35)
spec = float(np.abs(np.maximum(ba, -50) - np.maximum(bb, -50))[lb].mean())
if not (np.isfinite(env) and np.isfinite(spec)):   # (a hit that blew up or never sounded: a failure, never a 0)
    env = spec = 99.0
print(f"{sys.argv[3]} env {env:.2f} spec {spec:.2f} t30 {t30(ea)} {t30(eb)}")

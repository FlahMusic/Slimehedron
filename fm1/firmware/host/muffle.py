#!/usr/bin/env python3
"""The slime muffles the sound (slime.c sl_slime_morph): two renders of the same song, the tank held empty and full
(slimehost song with SL_FILL), each a 16-bit stereo WAV. Prints, over the second half (the muffle has settled):
energy over 4 kHz (dB, full against empty), under 400 Hz (dB), the spectral centroid (Hz, both), and the K-weighted
level difference (BS.1770's curve, as levels.sh).      muffle.py EMPTY.wav FULL.wav"""
import sys
import numpy as np

FS = 44100


def load(p):
    b = open(p, "rb").read()
    i = b.find(b"data") + 8
    x = np.frombuffer(b[i:], np.int16).astype(np.float64) / 32768.0
    x = x[: len(x) // 2 * 2].reshape(-1, 2).mean(axis=1)
    return x[len(x) // 2:]


def kweight(x):
    # BS.1770's two stages (48 kHz coefficients re-derived for 44.1 as slimehost does: shelf +4 dB at 1682 Hz, HP 38 Hz)
    from math import tan, pi, sqrt
    def biquad(b, a, x):
        y = np.zeros_like(x); x1 = x2 = y1 = y2 = 0.0
        for n in range(len(x)):
            v = b[0] * x[n] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2
            x2, x1, y2, y1 = x1, x[n], y1, v; y[n] = v
        return y
    A = 10 ** (4 / 40); w = 2 * pi * 1681.97 / FS; c = np.cos(w); al = np.sin(w) / 2 * sqrt(2); q = 2 * sqrt(A) * al
    a0 = (A + 1) - (A - 1) * c + q
    sh = ([A * ((A + 1) + (A - 1) * c + q) / a0, -2 * A * ((A - 1) + (A + 1) * c) / a0, A * ((A + 1) + (A - 1) * c - q) / a0],
          [1, 2 * ((A - 1) - (A + 1) * c) / a0, ((A + 1) - (A - 1) * c - q) / a0])
    K = tan(pi * 38.13 / FS); d = 1 + K / 0.5 + K * K
    hp = ([1 / d, -2 / d, 1 / d], [1, 2 * (K * K - 1) / d, (1 - K / 0.5 + K * K) / d])
    y = biquad(*hp, biquad(*sh, x))
    return 10 * np.log10((y ** 2).mean() + 1e-20)


def spectrum(x):
    n = 8192; acc = None
    for a in range(0, len(x) - n, n // 2):
        s = np.abs(np.fft.rfft(x[a:a + n] * np.hanning(n))) ** 2
        acc = s if acc is None else acc + s
    return acc, np.fft.rfftfreq(n, 1 / FS)


e, f = load(sys.argv[1]), load(sys.argv[2])
se, fr = spectrum(e); sf, _ = spectrum(f)
hi = 10 * np.log10(sf[fr > 4000].sum() / se[fr > 4000].sum())
lo = 10 * np.log10(sf[fr < 400].sum() / se[fr < 400].sum())
ce = (se * fr).sum() / se.sum(); cf = (sf * fr).sum() / sf.sum()
k = kweight(f[: FS * 8]) - kweight(e[: FS * 8])
print(f"over 4 kHz {hi:+.1f} dB  under 400 Hz {lo:+.1f} dB  centroid {ce:.0f} -> {cf:.0f} Hz  level {k:+.1f} LU")

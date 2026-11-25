#!/usr/bin/env python3
"""One held note (slimehost note ENG "PRESET" MIDI > FILE): its peak, its decay to -40 dB, its brightness early and
late (spectral centroid as a multiple of the fundamental), how harmonic it is (the share of energy within 3% of a
whole-number partial), and its pitch error.     notemeasure.py FILE LABEL MIDI"""
import sys
import numpy as np

x = np.fromfile(sys.argv[1], np.float32); fs = 44100; midi = int(sys.argv[3]); f0 = 440 * 2 ** ((midi - 69) / 12)
e = np.abs(x); pk = e.max(); i0 = int(np.argmax(e > pk * 0.1))
env = np.convolve(e, np.ones(441) / 441, "same")
t40 = next((i for i in range(int(np.argmax(env)), len(env)) if env[i] < env.max() * 0.01), len(env))


def spec(a, n=8192):
    seg = x[a:a + n]
    if len(seg) < n: seg = np.pad(seg, (0, n - len(seg)))
    s = np.abs(np.fft.rfft(seg * np.hanning(n))) ** 2
    return s, np.fft.rfftfreq(n, 1 / fs)


def centroid(a):
    s, f = spec(a)
    return (s * f).sum() / (s.sum() + 1e-20) / f0


s, f = spec(i0 + int(0.05 * fs), 32768)    # (0.74 s: 1.3 Hz a bin. At 8192, 5.4 Hz, wider than 3% of a C3: a detuned
                                            # pair's peak read 1.03x and a C2 bass's partials missed their 3% windows)
h = f / f0; near = np.abs(h - np.round(h)) < 0.03 * np.maximum(1, np.round(h)) / np.maximum(1, np.round(h)) * 1
harm = s[(np.abs(h - np.round(h)) * f0 < 0.03 * f0) & (np.round(h) >= 1)].sum() / (s[h > 0.5].sum() + 1e-20)
peakbin = f[np.argmax(s * (f > 0.4 * f0))]
# the loudest partial that is NOT a harmonic of the note (more than 4% off every whole multiple), under the loudest one
# (dB): one carrier of three pushed a fifth out of key reads -12; the right patch -60 or less. Only to 6 kHz: the hiss
# of a quiet top is no partial
offk = (np.abs(h - np.round(h)) > 0.04 * np.maximum(1, np.round(h))) & (h > 0.4) & (f < 6000)
offh = 10 * np.log10(s[offk].max() / (s[(h > 0.4) & (f < 6000)].max() + 1e-20) + 1e-20)
# the fundamental once the note has settled (0.4 s in, the key still held): its level against the loudest partial (dB, 0 = it
# is the loudest). A note pitched an octave wrong has nothing at the note's own frequency: far under
s2, f2 = spec(i0 + int(0.4 * fs))
fund = 10 * np.log10(s2[(f2 > f0 * 0.97) & (f2 < f0 * 1.03)].max() / (s2[f2 > 0.4 * f0].max() + 1e-20) + 1e-20)
# .. and an octave under the note (a patch pitched an octave low has its fundamental there; a right one nothing)
under = 10 * np.log10(s2[(f2 > f0 * 0.485) & (f2 < f0 * 0.515)].max() / (s2[f2 > 0.4 * f0].max() + 1e-20) + 1e-20)
print(f"{sys.argv[2]:16s} peak {20 * np.log10(pk + 1e-9):6.1f} dB  -40 dB at {1000 * (t40 - i0) / fs:5.0f} ms  "
      f"bright {centroid(i0 + int(0.01 * fs)):4.1f}x -> {centroid(i0 + int(0.4 * fs)):4.1f}x  harmonic {100 * harm:3.0f}%  "
      f"off key {offh:5.1f} dB  octave under {under:5.1f} dB  fundamental late {fund:5.1f} dB  strongest partial {peakbin / f0:4.2f}x")

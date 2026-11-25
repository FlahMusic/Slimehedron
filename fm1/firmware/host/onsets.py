#!/usr/bin/env python3
"""Where the drums land against a straight 16th grid (check-host 16, the swing): every hit's onset (its click, 12 dB over
the moment before), the even and the odd 16ths' mean offset and spread (ms).      onsets.py WAV BPM"""
import sys, numpy as np
b = open(sys.argv[1], "rb").read(); i = b.find(b"data") + 8
x = np.frombuffer(b[i:], np.int16).astype(float).reshape(-1, 2).mean(1); fs = 44100; bpm = float(sys.argv[2])
hp = np.diff(x, prepend=0)                                  # (the hats and snares: their clicks)
e = np.convolve(hp ** 2, np.ones(64) / 64, "same"); e = 10 * np.log10(e + 1e-9)
step = 15.0 / bpm * fs; on = []
k = int(fs * 0.5)
while k < len(e) - 1:
    if e[k] > e[k - 64] + 12 and e[k] > np.max(e) - 45: on.append(k); k += int(step * 0.5)
    else: k += 8
on = np.array(on) / fs * 1000.0; s_ms = 15000.0 / bpm
t0 = on[0]; rel = on - t0; idx = np.round(rel / s_ms).astype(int); off = rel - idx * s_ms
ev = off[idx % 2 == 0]; od = off[idx % 2 == 1]
print(f"{len(on)} hits; even 16ths {ev.mean():+.1f} ms (sd {ev.std():.1f}), odd 16ths {od.mean():+.1f} ms (sd {od.std():.1f}); odd late by {od.mean() - ev.mean():.1f} ms of a {s_ms:.0f} ms 16th")

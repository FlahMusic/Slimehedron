#!/usr/bin/env python3
"""One drum hit (slimehost hit KIT NOTE > FILE): its peak, its decay to -60 dB, its pitch 150-250 ms in, its centroid.
   hitmeasure.py FILE LABEL"""
import sys
import numpy as np

x = np.fromfile(sys.argv[1], np.float32)
fs = 44100
e = np.abs(x)
pk = e.max()
i0 = int(e.argmax())
env = np.convolve(e, np.ones(220) / 220, "same")
t60 = next((i for i in range(i0, len(env)) if env[i] < pk * 0.001), len(env))
seg = x[int(0.15 * fs):int(0.25 * fs)]
z = np.where(np.diff(np.signbit(seg)))[0]
f = (len(z) / 2) / 0.1 if len(z) > 2 else 0
sp = np.abs(np.fft.rfft(x[i0:i0 + 4096] * np.hanning(len(x[i0:i0 + 4096]))))
fr = np.fft.rfftfreq(len(x[i0:i0 + 4096]), 1 / fs)
cen = (sp * fr).sum() / (sp.sum() + 1e-12)
print(f"{sys.argv[2]:22s} peak {20 * np.log10(pk + 1e-9):6.1f} dBFS  to -60 dB {1000 * (t60 - i0) / fs:5.0f} ms  "
      f"pitch 150-250 ms {f:5.0f} Hz  centroid {cen:6.0f} Hz")

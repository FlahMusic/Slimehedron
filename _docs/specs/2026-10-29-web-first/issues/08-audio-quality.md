# 08 Audio: lossless takes, true peak, no crackles, iPhone on silent

Status: ready
Blocked by: 01
Spec: `../spec.md` (Done means: Audio)

The WAV take stays PCM from the AudioWorklet tap, at the device's own rate, 24-bit or 32-bit float (fix it if 01
finds otherwise; say "lossless" only where it is true). True peak of the loudest kit's export ≤ -1 dBTP (`dev-ceiling`
on the file, not the meter). Worst case on the MSI: no underruns in 5 minutes; if 01 finds crackles, cut nodes per
note or garbage first. iPhone silent switch: start a looping silent `<audio>` on the first tap (the known
workaround), plus `navigator.audioSession` where it exists.

Sabotages: export resampled to 44.1 kHz; the silent-audio start removed. Flah checks his iPhone with the switch on
silent.

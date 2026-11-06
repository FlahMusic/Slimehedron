# 02 Render governor: run hard, stay cool
Status: done
- Measure the work in each frame (sim + draw ms). Over 60 Hz screens: skip a draw when no new physics tick ran and
  work is over 50% of the frame. Pixel ratio ladder 2 / 1.5 / 1.25 / 1 with hysteresis (down after ~1 s over 60%,
  up after ~5 s under 35%). `PressureObserver('thermals')` when available: 'serious'/'critical' step down at once.
- Proof: `dev-governor` + sabotage. Targeted: dev-gl, dev-perfmode, dev-potato, dev-phone.

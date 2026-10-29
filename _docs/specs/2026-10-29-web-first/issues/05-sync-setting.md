# 05 One Sync setting: tap-along, MIDI out and visuals

Status: ready
Blocked by: 01
Spec: `../spec.md` (Done means: Sync), brief section 5 Timing

`clockLatch()` maps audio time to `performance.now()` for MIDI timestamps without the output latency, so outboard
gear likely plays early (01 measures it). One control in studio settings: a tap-along (tap with the click for a few
bars; the median offset is the delay) plus a nudge by hand. It shifts MIDI out timestamps and the visuals that
follow the beat (`beatNow`). Saved per device. No control in play. No explainer text (ADR 0011).

New suite `dev-sync`: a fake tap stream with a known delay is measured within 5 ms; MIDI out timestamps move by the
setting. Sabotage: the setting shifts nothing. Flah's check: MIDI out to a synth, recorded back in, lines up.

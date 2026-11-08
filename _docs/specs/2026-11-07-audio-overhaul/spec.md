# Audio overhaul, part 1: the master, the room, the stage (2026-11-07)

Status: done

Flah: "lets amp this up and give a real professional graphic and audio overhaul ... quality over quantity".
Research: `_docs/research/2026-11-07-audio-overhaul.md` (Costello, Dattorro, Jot/Smith, Freeverb, SoundFont 2,
EBU R128 / BS.1770, Web Audio spec + Chromium source; its numbers were measured in headless Chromium).

Decisions taken on the research's recommended answers while Flah slept (on the morning list, each a one-line revert):
1. The melody is placed by where its wall is (pan up to +-0.4 of the shape's width, low notes centred; +-0.3 left
   the mix at r 0.96-0.97, over the 0.95 line). The bass and kick stay centre.
2. The reverb is a room with a 1.3 s mid (not a plate).
3. The compressors' fixed 6 ms delay: the drums are scheduled 6 ms early so they land with the melody.

## What changes

1. **A limiter that limits.** `lim.knee` was never set, so it sat at the 30 dB default: a 0 dBFS sine came out at
   -0.2 dBFS and the hard clip did all the ceiling work. `knee=0`, `outVol` trimmed by the node's own makeup gain
   (+4.78 dB) so the loudness under the threshold is unchanged. The clip stays at 0.891: with a real limiter in front
   of it the true peak of a stress run is -2.6 dBTP, and the clip is a safety net that no longer fires.
2. **A real room.** The reverb IR was noise times `(1-x)^2.4`: every band decays alike (4k/500 Hz ratio 1.02, real
   rooms 0.5-0.75), the early decay sounds like a 3 s room, and it is cut off at 1.7 s. New: per-octave noise with
   its own decay (the top dies first), 12-20 ms pre-delay so a pluck's attack stays dry, sparse early reflections,
   independent L/R, a buffer long enough that nothing is cut off. Wet loudness matched to the old one.
3. **A stage.** The melody, bass and echo were mono. A note pans toward the wall it came from (+-0.4), fading to
   centre for low notes; everything under ~150 Hz stays mono. An equal-power panner drops a mono note 3 dB at the
   middle, so a placed note is fed +3 dB (it is as loud as before).
4. **Hit strength is brightness.** A harder hit is brighter, a softer one darker (SoundFont 2's slope: 2.4 octaves
   across the velocity range), anchored on the everyday note (the middle of the velocity range in use) so the colour
   the mix was levelled on stays. Unanchored, the typical ball (velocity ~53) came out an octave darker and every kit's
   drums rose over the melody in the presence band (`dev-mix` 6b went red in 6 kits). Applies when the filter is on (the default).
   With the filter off a sine has nothing to darken, and the other waves stay as they were (not built: a velocity
   lowpass there, if a listen says it is wanted).
5. **No click on a soft attack.** The ring layer's attack has a 4 ms floor and is an S-curve (the tick keeps its snap).
6. **Drums land with the melody.** Drums pass one more compressor (6 ms each, fixed): scheduled 6 ms earlier.

## Done means (numbers, from the research's section 5)

1. Stress render (all parts, top velocity, loudest kit, slime on): true peak (4x oversampled) <= -1.0 dBTP; at most
   0.1 % of samples within 0.01 of the clip; a 0 dBFS sine through `lim` comes out <= -2.5 dBFS; whole mix stays
   -21..-15 LUFS and within +-1 LU of before (`dev-mix` 7).
2. IR: 0.45 <= T20(4k)/T20(500) <= 0.80; |EDT/T20 - 1| <= 0.25 at 500 Hz (was 1.34); the first sample above -40 dB
   of the peak comes >= 8 ms in; |r(L,R)| <= 0.2; the decay curve at the buffer's end is <= -55 dB.
3. A wall at x = +0.8: L/R level difference >= 2.5 dB toward +x, mirrored at -0.8. Whole mix: r(L,R) 0.3..0.95;
   r below 150 Hz >= 0.95.
4. Velocity 110 vs 35 (cutoff 0.6, the sustain): >= 6 dB more energy over 2 kHz for the hard hit (measured 8.3;
   with the feature off -0.3).
5. A 220 Hz sine note, tick muted: energy above 2 kHz in its first 10 ms <= -46 dB (a straight 1 ms ramp: -38; the
   S-curve: -51 to -53).
6. The drum path's extra delay (an impulse each way: 5.98 ms) equals what a kick is sent early by, within 1 ms.

## Suites

New: `dev-audiopro` (checks 1-6, sabotaged). Existing ones that measure the old sound: `dev-mix` (levels relative to
the melody: panning and brightness change the melody's loudness, rerun all kits), `dev-realaudio`, `dev-fidelity`,
`dev-sound`, `dev-audible`, `dev-silence`, `dev-chordbed`, `dev-bassmix`, `dev-drums`, `dev-latency` if present.

## Not checked by a machine

How the new room sounds, and whether panned notes feel like they come from their wall (headphones and a phone
speaker).

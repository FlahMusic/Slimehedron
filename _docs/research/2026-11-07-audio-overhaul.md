# Audio overhaul: reverb IR, stereo field, voice design, master bus (2026-11-07)

Research only. No app file was changed. Words follow `_docs/GLOSSARY.md`. Tags: **[P]** primary source, read this pass;
**[S]** secondary, or a primary I could only see quoted; **[D]** my own derivation or measurement (check it).
**UNVERIFIED** means I looked and could not confirm it in a primary source. App facts are from `index.html` in the
working tree (HEAD `367f932` plus uncommitted edits): master chain ~2696-2760, melody voice ~2815-2852, pads ~3925-3950,
drum pans ~3160-3249. The **[M]** numbers were measured this pass in headless Chromium (Playwright `OfflineAudioContext`)
or in plain node, with throwaway scripts outside the repo.

## TLDR (recommendations first)

1. **The "limiter" is not limiting.** `lim` sets threshold -8.5, ratio 16, attack 3 ms, but never sets `knee`, so
   it keeps the spec default of **30 dB** [P 1]. Measured with those exact settings: a steady 0 dBFS sine comes out at
   **-0.21 dBFS**, and a -40 dBFS sine comes out at -39.65 (+0.35 dB of automatic makeup gain) [M]. So `lim` adds
   0.35 dB and squeezes less than 0.6 dB. The hard clip at 0.891 does all the ceiling work. With `knee=0` the same
   node holds 0 dBFS in to **-3.0 dBFS out**, already in the first 2 ms (the 6 ms lookahead catches it), but it then
   adds **+4.8 dB** of makeup gain that cannot be turned off [M][P 1, 2]. **Set `knee=0` and take ~4.8 dB off `outVol`**
   so `dev-mix` 7 (-21..-15 LUFS) still passes. Then the clip only catches rare overs.
2. **The clip overshoots -1 dBTP.** A 5 kHz tone driven into `outClip` (4x oversampling) measured **-0.72 dBFS sample
   peak and -0.69 dBTP** [M]. That is because the 4x down-sampling filter rings past the clip. With no oversampling it
   was -1.00 dBFS sample but **-0.29 dBTP** [M]. EBU R128 says the true peak "shall not exceed -1 dBTP" [P 3]. FabFilter
   says hard clipping "can introduce inter-sample peaks" [P 4]. **Lower `CEIL` to 0.85 (-1.4 dBFS)**, or keep 0.891 and
   rely on item 1 so the clip almost never fires. Then test the true peak, not the sample peak (`dev-mix` reads samples).
3. **Every compressor adds 6 ms of delay.** The spec builds each `DynamicsCompressorNode` around a fixed 0.006 s
   look-ahead DelayNode [P 1], and Chromium sets `kPreDelay = 0.006f` [P 2]. Measured: two compressors in series delay
   an impulse by **12.0 ms** [M]. The melody passes 2 (`slimeComp` and `lim`) and the drums pass 3 (`drumComp` as
   well). **So the drums sound 6 ms after the melody**, and everything sounds 12 ms after it is scheduled [D from the
   routing at ~2944 and ~2758]. Small, but it is a fixed number: add it to the **Sync** offset, and decide whether the
   drums need a 6 ms head start.
4. **The reverb has no high-frequency damping, and its real decay is ~2.4 s, not 1.7 s.** The current IR is white
   noise times `(1-x)^2.4`. Every octave from 250 Hz to 8 kHz measures the same T20, about **2.4 s**, and the EDT is about
   **3.1 s** [M]. The buffer stops at 1.7 s, so the tail is cut off rather than decaying. Real rooms, plates and good
   reverbs decay faster at the top [P 5, 6, 7]. **Build the IR per band: each octave of noise gets its own exponential
   decay.** Add a 10-20 ms pre-delay and a few early reflections (recipe in section 1). Aim for **T(4 kHz)/T(500 Hz)
   = 0.5-0.75** and EDT within 25% of T20.
5. **Stereo: low end centred, melody gently placed.** Correction to the brief: the app is not all mono. Drums use
   `panTo` (StereoPanner, -0.34..+0.34), pads spread chord tones over +/-0.45 with +/-6 cent oscillator pairs, and the
   reverb IR has two independent channels. The **melody, its tick, the bass and the echo are mono**. Mixing practice
   centres sources below about **200 Hz** and the lead, and pans brighter sources wider [P 8]. Proposal: pan each
   melody note by its wall's x, up to **+/-0.3**, narrower for low notes (this is a decision for Flah, see the end).
   Keep the kick, bass, sub and anything under 150 Hz in the centre.
6. **Brightness should follow how hard a note is hit.** In the melody voice, `v` and `imp` set the level and the tick,
   but the filter cutoff ignores them. The SoundFont 2 default is "MIDI Note-On Velocity to Filter Cutoff" with
   **-2400 cents** (two octaves darker at the softest hit) [P 9]. Copy it: cutoff = base x 2^(-2(1-v)).
7. **Click floor for the tonal layer.** The default `S.atk` is 0.001 s and is linear. The tick layer is meant to click,
   but the sine/triangle layer should not. Use a **3-5 ms** minimum attack on the ring layer only [D]. Releases are
   fine: they ramp to 0.0001 before `stop()` [code ~2848].
8. **Loudness: keep -18 LUFS +/-2, true peak at or below -1 dBTP.** AES TD1004 gave -16..-20 LUFS for streaming
   [S 10]. Spotify normalises to -14 (Quiet: -19) and asks for "below -1dB TP" [P 11]. EBU R128 gives -23 LUFS and -1
   dBTP for broadcast [P 3]. The app's -18.9 already sits inside the TD1004 window. Do not chase loudness.
9. **Unison:** the JP-8000 supersaw spreads 6 side saws over about **+/-3 cents at 10% of the knob, +/-18 at 50% and
   +/-34 to +/-200 at 100%** (computed from Szabo's fitted curve) [S 12][D]. For a kids' lead, 2 oscillators at
   +/-5..8 cents is the cheap version, and the pads already do it. Only add it to saw/square melody sounds, and only
   if the CPU budget allows (each note is one more OscillatorNode).
10. **Five measurable changes with tests and thresholds are in section 5.** Order: limiter + true peak, IR per band,
    stereo placement with a mono-safe low end, velocity to brightness, attack floor.

---

## 1. Reverb IR generated offline

**What the sources say**
- RT60 "is often measured in different frequency bands"; RT60 "falls above ~2kHz, due to absorption of high
  frequencies by air"; "at 10 kHz, reverb time can't be higher than 1.25 seconds or so" (Costello, slides 5 and 15)
  [P 5]. Chamber-music rooms are about **1-1.4 s**, concert halls **1.7-2.3 s** (best about 1.9-2.0 s), and the bass RT
  "can be half again as long" (slides 8-9) [P 5].
- Plates: "when reverb time is adjusted, the lower midrange and low frequency RT60s increase, but the high frequency
  RT60 stays pretty much the same" (slide 21) [P 5]. EMT250 decays ran 0.4-4.5 s (slide 29) [P 5].
- ValhallaRoom's "High Mult" sets treble decay as a multiple of DECAY. "0.5X or less will result in a more natural
  decay" [S 6: seen in a search excerpt; the page returned 403 to my fetch].
- **Air alone** (ISO 9613-1 equations, 20 C, 50% RH, computed): 2.7 dB/km at 500 Hz, 29.7 at 4 kHz, 105 at 8 kHz
  [D, UNVERIFIED that I copied the equations exactly]. In Sabine's formula the air term gives
  T_hf/T_mid = 1/(1 + 24.8*m*T), whatever the room size. That makes the 4 kHz/500 Hz ratio **0.92 at 0.5 s, 0.78 at
  1.7 s and 0.75 at 2 s** [D]. Soft furnishings take the top down further. So **0.5-0.75 is a natural target**, and
  the current 1.0 is not.
- **Dattorro plate** (JAES 1997, Table 1): decay 0.50, **damping 0.0005** (a one-pole lowpass inside the tank),
  bandwidth 0.9995 (a one-pole on the input), excursion 16 samples at 29761 Hz [P 7]. "The damping filters cause high
  frequencies to decay within the tank more quickly than low frequencies" (sec. 1.3.5). Modulation runs "at a rate on
  the order of 1 Hz, and at a peak excursion of about 8 samples" (footnote 14) to break up "audible modes". Stereo
  comes from different output taps (Table 2) [P 7].
- **Freeverb** (Jezar 2000): 8 lowpass-feedback combs plus 4 allpasses per channel. The right channel's delays are the
  left's plus `stereospread = 23` samples [P 13, 14]. `scaledamp 0.4`, `initialdamp 0.5`, so the comb lowpass
  coefficient is 0.2. `scaleroom 0.28`, `offsetroom 0.7`, `initialroom 0.5`, so the feedback is 0.84 [P 14].
- **Jot / FDN** (Smith, PASP): the per-sample loss is G = 10^(-3/N60). High-frequency poles should be "more damped
  than the low-frequency poles", by putting a lowpass G(z) in each delay line, and "H_i(z) is merely first order"
  is enough [P 15, 16]. All four designs do the same thing: **a lowpass inside the decay**, so the top dies first.
- **ConvolverNode normalises by default.** The spec's `calculateNormalizationScale` uses `GainCalibration = 0.00125`
  and the IR's power [P 1]. A new IR therefore changes the wet level, so compare the wet loudness before and after.

**Measured: current IR vs. proposed recipe** [M, node, Schroeder backward integration, octave bandpass x2]

| IR | T20 at 250/500/1k/2k/4k/8k Hz (s) | EDT 500 Hz | T(4k)/T(500) | L/R corr. |
|---|---|---|---|---|
| current `(1-x)^2.4`, 1.7 s | 2.32 / 2.36 / 2.39 / 2.38 / 2.41 / 2.38 | 3.16 s | **1.02** | 0.003 |
| proposed recipe below | 1.51 / 1.35 / 1.28 / 1.02 / 0.81 / 0.57 | 1.41 s | **0.60** | 0.016 |

The current envelope is not exponential: it falls slowly at first and then plunges at the end of the buffer. So the
ear hears a ~3 s room (EDT) that is cut off at 1.7 s [M].

**Recipe (pure JS, run once at audio start, ~1.7 s x 2 channels)** [D, built and measured above]
1. Pre-delay: leave the first **12-20 ms** at zero. Reflection paths in a 3-8 m room arrive ~5-20 ms after the
   direct sound (path difference / 343 m/s) [D]. It keeps the pluck's attack dry and clear.
2. For each channel (its own random seed, so L and R are independent): for each octave band (125 Hz ... 16 kHz),
   make white noise, bandpass it (RBJ biquad, Q 1.41, run twice), and multiply by exp(-6.908 t / RT_band). Add a
   4 ms fade-in. Sum the bands.
3. Band RT60s: a medium room/plate around a 1.3 s mid. 125: 1.6, 250: 1.5, 500: 1.4, 1k: 1.3, 2k: 1.0, 4k: 0.75,
   8k: 0.5, 16k: 0.35 s. (Because the bands overlap, the measured 4k/500 ratio is 0.60, not the designed 0.54.) The
   380 Hz pre-highpass stays, so the long bass RT costs nothing.
4. Early reflections: 6-10 single-sample taps between 5 and 60 ms after the pre-delay, random sign, amplitude
   0.5*exp(-t/50 ms), with different times per channel. This replaces the `(1+0.6*exp(-45x))` bump.
5. Length: make the buffer at least 1.05 x the longest band RT, so nothing is cut off. Keep `normalize` on and
   match the wet loudness to the old IR with `rvbWet`.
6. Modulation: none is needed. A noise IR has no resonant modes to smear, and modulation exists to break up the modes
   of recursive networks [P 5 slide 28, P 7 sec. 1.3.7] [D].
- A cheaper alternative is one noise run through a one-pole lowpass whose cutoff falls over time. It is harder to
  hit exact band RTs with it, and harder to test [D].

## 2. Stereo field

- **Low end centred.** "sources with frequency content below a certain threshold should be fixed in the centre ...
  there is little or no directional information below 200Hz". The paper's auto-panner centres any track with a
  spectral centroid under **200 Hz** (Mansbridge, Finn & Reiss, AES 133, sec. 2.2, 3.5.4) [P 8]. Ableton's Utility
  has "Bass Mono" with a cutoff "between 50-500 Hz" (Live 12 manual, 29.40) [P 17]. The default is UNVERIFIED.
- **Panning conventions** [P 8 sec. 2.1, 2.7, 2.8]: "sources with higher frequency content are progressively panned
  further towards the extremes": kick in the centre, snare and toms close on either side, cymbals widest. The lead
  sits in the centre. "hard panning of sources is unnecessary". Left and right should carry about the same level in
  each band (sec. 2.4-2.5). The app's drum pans already follow this (kick and bass centre, snare -0.10, hats +0.24,
  toms +/-0.3) [code].
- **The melody has a position for free.** Every wall has an x. Mapping x to `pan = 0.3*x` (narrowed to 0.1 for notes
  under ~200 Hz) uses the tank as the stage. It breaks the "lead in the centre" norm on purpose, which is why it is a
  decision for Flah. The echo could be ping-ponged instead of mono [D].
- **Haas widening and its limits.** A delayed copy fuses with the original up to the echo threshold. Reported
  thresholds run "from 2 to 100 ms or more". They are about 5 ms for transients, 7-8 ms for piano tones, and
  "5-10 ms for a single stimulus ... to 15-30 ms or more" after repetition (Brown, Stecker & Tollin 2015) [P 18].
  Summed to mono, a copy delayed by d puts notches at f = (2k+1)/(2d): a 10 ms Haas notches 50, 150, 250 Hz ...
  [D]. iZotope's Stereoize Mode I is exactly this: "a delayed copy of the mid channel ... injects it into the side
  channel", which is mono-safe because it goes into S, not into L or R alone [P 19]. **Prefer detuned unison or the
  side-channel trick to a plain L/R Haas delay**, and never use either below 200 Hz.
- **Detuned pairs in mono:** two oscillators a few cents apart beat slowly when summed. That is ordinary chorus, not
  a static comb [D]. The pads' +/-6 cent pair is 12 cents (0.7%) apart, so at 440 Hz it beats about 3 times a
  second in mono [D].
- **How to measure** [P 19, 20]: correlation +1 means L = R and -1 means opposite phase. "Values that dip briefly below
  zero do not necessarily represent serious problems ... prolonged negative readings indicate issues with mono
  compatibility." A vectorscope trace that is "taller than it is wide" is the normal case [P 20].
- **Targets** [D]: Pearson r(L,R) of the master over 8+ bars between **0.3 and 0.95**; r below 150 Hz **>= 0.95**;
  fewer than **1%** of 400 ms windows with r < 0. **Mono fold-down loss** (loudness of (L+R)/2 vs. the stereo mix)
  **<= 1.5 LU**. For reference, r = 0 loses 3 dB and r = 1 loses 0. Side/mid energy ratio between -15 and -6 dB.

## 3. Voice design with cheap oscillators

- **Supersaw (Szabo 2010 thesis, KTH, via a SuperCollider port of its fitted coefficients)** [S 12]: 7 saws, side
  offsets x D(knob) = -0.110, -0.063, -0.020, 0, +0.020, +0.062, +0.107, with D an 11th-order polynomial. Converted
  to cents [D]: knob 0.1 gives about +/-3, 0.25 +/-9, 0.5 +/-18, 0.75 +/-45, and 1.0 -202/+177 for the outer pair.
  Mix: centre gain 0.998 - 0.554*mix, side gain -0.738*mix^2 + 1.284*mix + 0.044. The curve is very non-linear: the
  usable "lush" zone is +/-10-25 cents.
- **Other manuals:** DeepMind 12 detune range 0-50 cents [S, manual mirror]. Serum's unison detune is a +/- offset
  "only applicable when unison is enabled", up to 16 voices; its range default (2 semitones) is UNVERIFIED (from a
  course transcript). For the app: **pads at +/-6 cents (already), and a saw lead at +/-5-8 cents with 2 voices** [D].
- **Velocity to brightness:** SoundFont 2.01 sec. 8.4.2: velocity to Initial Filter Cutoff, amount -2400 cents,
  linear, so the softest hit is two octaves darker. Sec. 8.4.1: velocity to attenuation is 960 cB on a concave curve
  [P 9]. MPE uses CC74 for timbre (the app already sends it). **The melody voice should move `f.frequency` with `v`
  (and `imp`)**. With the filter off, crossfade a little of a brighter wave instead [D].
- **Filter envelope:** the app ramps from `top` to `base` over A+D. That is the conventional pluck shape. Scale the
  amount (`fenv`) by velocity, the same way [D].
- **Anti-click:** a ramp of length tau spreads click energy over about 1/tau Hz (1 ms is ~1 kHz wide, 5 ms ~200 Hz)
  [D]. Psychoacoustic work finds that offsets click less than onsets (the critical decay time is about a third of the
  critical rise time) [S, J. Acoust. Soc. Jpn 36(5), abstract only]. So use **3-5 ms minimum attack** on the ring
  layer (keep the tick as the deliberate transient), and **>= 10 ms** to the release floor before `stop()`. The current
  release already meets that.

## 4. Master bus

- **DynamicsCompressorNode per spec** [P 1 sec. 1.19]: threshold default -24 (range -100..0), knee 30 (0..40), ratio 12
  (1..20), attack .003, release .25. Attack is "the amount of time (in seconds) to reduce the gain by 10dB". It has
  "Fixed look-ahead (this means that an DynamicsCompressorNode adds a fixed latency to the signal chain)" (a 0.006 s
  DelayNode in the internal graph). Makeup gain is computed automatically: apply the curve to 1.0, invert it, raise
  it to the power 0.6.
- **Chromium** [P 2]: `kPreDelay = 0.006f`; knee 30 dB is an "Exponential curve for the knee"; attack has a 1 ms floor
  (`std::max(0.001f, attack_time)`); release is adaptive (`kReleaseZone1..4 = 0.09, 0.16, 0.42, 0.98`); post-gain is
  `powf(1 / Saturate(1, k), 0.6f)`. The node has no `makeupGain` attribute in Chromium today [M].
- **What that means for `lim`** [M]:

| input dBFS | -40 | -18 | -8.5 | -6 | -3 | 0 |
|---|---|---|---|---|---|---|
| out, knee 30 (current) | -39.65 | -17.65 | -8.15 | -5.70 | -2.88 | **-0.21** |
| out, knee 0 | -35.22 | -13.22 | -3.72 | -3.50 | -3.27 | **-3.01** |

- **Hard clip vs. limiter.** A clip is instant and adds harmonics plus inter-sample peaks [P 4]. FabFilter recommends
  "4x oversampling in combination with a minimum lookahead time of 0.1 ms" to keep inter-sample peaks "within a range
  of 0.1 dB", and preventing overshoot rather than repairing it [P 4]. Our order should be: limiter (does the work,
  6 ms lookahead) -> clip as a safety net set under the true-peak ceiling [D].
- **True peak:** BS.1770-5 Annex 2 measures true peak at an "oversampled sampling rate of at least 192 kHz" (4x at
  48 kHz), in dB TP [P 21]. Loudness: 400 ms blocks with 75% overlap, gates at -70 LKFS and -10 LU [P 21].
- **Targets:** TD1004 (2015) -16..-20 LUFS [S 10]. TD1008 (2021), which replaces it, gives about -16 for music [S 10].
  Spotify -14 LUFS, Quiet -19, true peak below -1 dBTP (-2 if louder than -14) [P 11]. Apple Sound Check at about -16
  LUFS is UNVERIFIED (no Apple page found). EBU R128: -23 LUFS +/-1 LU, true peak -1 dBTP max [P 3 items h, m].

## 5. The five highest-impact measurable changes (all testable headless)

Run each in the page (`OfflineAudioContext`, or a recorder at the destination the way `dev-realaudio` does). Each must
be sabotage-tested: the sabotage named under each test must turn it red.

1. **Real limiter + true-peak ceiling** (`knee=0`, ~-4.8 dB on `outVol`, `CEIL` 0.85, or a clip that seldom fires).
   - Test A: a stress render (all parts, top velocity, loudest kit, slime on, 16 bars). **True peak (4x windowed-sinc)
     <= -1.0 dBTP**. The fraction of samples within 0.01 of CEIL is **<= 0.1%**.
   - Test B: integrated LUFS still in -21..-15 (`dev-mix` 7) and within **+/-1 LU** of before.
   - Test C (static curve): a 0 dBFS steady sine through `lim` comes out <= -2.5 dBFS.
   - Sabotage: knee back to 30 (C goes red), CEIL back to 0.891 (A goes red), drop the outVol trim (B goes red).
2. **IR per band** (section 1 recipe).
   - Read `rvb.buffer`, filter it into octaves (Q 1.41 twice), Schroeder-integrate, and fit T20 from -5 to -25 dB.
     **0.45 <= T20(4k)/T20(500) <= 0.80**; **|EDT/T20 - 1| <= 0.25** at 500 Hz (current: 1.34);
     the first sample above -40 dB of the peak comes **>= 8 ms** in; **|r(L,R)| <= 0.2**; the Schroeder curve at the
     buffer end is **<= -55 dB** (no cut-off tail); the wet-only loudness of a fixed test phrase is within **+/-1.5 LU**
     of the old IR.
   - Sabotage: equal band RTs (ratio 1.0), the same seed for L and R (r = 1), pre-delay 0, the old power envelope.
3. **Melody placed by wall x, low end mono-safe** (if Flah says yes).
   - Strike a wall at x = +0.8: **L/R level difference >= 2.5 dB toward +x**, and mirrored at -0.8.
   - Whole mix over 8 bars: **r(L,R) between 0.3 and 0.95**; **r below 150 Hz >= 0.95**; **< 1%** of 400 ms windows
     negative; mono fold-down loss **<= 1.5 LU**.
   - Sabotage: pan the bass to 0.5 (low-band r goes red), invert one channel of the reverb (negative windows go red),
     pan multiplier 0 (the placement check goes red).
4. **Velocity to brightness.**
   - The same pitch at v = 1.0 and v = 0.3, filter on, loudness-matched: **spectral centroid ratio >= 1.4**, and **energy
     above 4 kHz >= 6 dB higher** for the hard hit.
   - Sabotage: a fixed cutoff makes the ratio about 1.0.
5. **Attack floor on the ring layer** (3-5 ms; the tick untouched).
   - Render one 220 Hz sine note with the tick muted. **Energy above 4 kHz in the first 10 ms <= -40 dB** relative to
     the note's 220 Hz band. In the last 5 ms before `stop()`, **RMS <= -60 dB** relative to the peak.
   - Sabotage: attack back to 1 ms (the first check goes red); stop at `relStart` (the second goes red).
- **Also worth a check (not in the top five):** the 6 ms drum vs. melody skew. Send an impulse through `melBus` and
  `drumBus` and assert they reach the destination **within 1 ms** of each other, or that the known offset is applied.

## Open decisions for Flah (each with a recommendation)

1. Pan the melody by wall x (+/-0.3), or keep the lead dead centre? **Recommend: pan, narrow, low notes centred.**
2. Reverb character: room (bass-heavy, HF ratio about 0.6) or plate (bright and dense, HF fixed)? **Recommend: a room
   at a 1.3 s mid, as in the recipe.** A plate fits the "glass tank" look too.
3. Compensate the 12 ms compressor delay in Sync, and give the drums 6 ms back? **Recommend: yes to both. It is a
   fixed number.**

What a machine cannot check here: how the new room sounds, and whether panned notes feel like they come from the
wall (both need a listen on headphones and on a phone speaker).

## Sources
1. W3C Web Audio API (Editor's Draft), sec. 1.19 DynamicsCompressorNode (defaults, look-ahead, makeup gain);
   ConvolverNode `calculateNormalizationScale`. https://webaudio.github.io/web-audio-api/#DynamicsCompressorNode
2. Chromium source, `third_party/blink/renderer/platform/audio/dynamics_compressor.cc` (kPreDelay, knee, release
   zones, post-gain). https://chromium.googlesource.com/chromium/src/+/refs/heads/main/third_party/blink/renderer/platform/audio/dynamics_compressor.cc
3. EBU R 128 (Loudness normalisation and permitted maximum level), recommends h) and m). https://tech.ebu.ch/docs/r/r128.pdf
4. FabFilter Pro-L 2 help, "True peak limiting". https://www.fabfilter.com/help/pro-l/using/truepeaklimiting
5. S. Costello (Valhalla DSP), "1000 Years of Reverbs", AES 2015 talk, slides 5, 8, 9, 15, 21, 28, 29.
   https://valhalladsp.com/wp-content/uploads/2015/06/aes2015reverbpresentation.pdf
6. Valhalla DSP, "ValhallaRoom: The Late controls" (High Mult); search excerpt only (403). https://valhalladsp.com/?p=781
7. J. Dattorro, "Effect Design Part 1: Reverberator and Other Filters", JAES 45(9) 1997, Table 1, sec. 1.3.5-1.3.7,
   Table 2. https://ccrma.stanford.edu/~dattorro/EffectDesignPart1.pdf
8. Mansbridge, Finn, Reiss, "An Autonomous System for Multitrack Stereo Pan Positioning", AES 133rd Conv. 2012, sec.
   2.1-2.8, 3.5.4. https://joshreiss.github.io/documents/2012/MansbridgeFinnReiss-AES133-Autonomoussystemformultitrackstereopositioning.pdf
9. SoundFont 2.01 Technical Specification, sec. 8.4.1-8.4.2 (default modulators). https://www.synthfont.com/sfspec24.pdf
10. AES TD1004 / TD1008 via Production Expert and Grimm Audio (secondary). https://www.pro-tools-expert.com/production-expert-1/aes-update-loudness-recommendations-for-audio-only-streaming ;
    https://www.grimmaudio.com/news/aes-td1008-ends-the-loudness-war/
11. Spotify for Artists, "Loudness normalization". https://support.spotify.com/us/artists/article/loudness-normalization/
12. A. Szabo, "How to Emulate the Super Saw" (KTH 2010), via a SuperCollider port of its coefficients (secondary).
    https://gist.github.com/audionerd/fe50790b7601cba65ddd855caffb05ad
13. J.O. Smith, PASP, "Freeverb". https://ccrma.stanford.edu/~jos/pasp/Freeverb.html
14. Freeverb `tuning.h` (Jezar, 2000, public domain; GitHub mirror). https://raw.githubusercontent.com/sinshu/freeverb/master/Components/tuning.h
15. J.O. Smith, PASP, "Achieving Desired Reverberation Times". https://ccrma.stanford.edu/~jos/pasp/Achieving_Desired_Reverberation_Times.html
16. J.O. Smith, PASP, "Damping Filters for Reverberation Delay Lines" (cites Jot & Chaigne 1991, Moorer 1979).
    https://ccrma.stanford.edu/~jos/pasp/Damping_Filters_Reverberation_Delay.html
17. Ableton Live 12 Reference Manual, 29.40 Utility (Bass Mono, Width). https://www.ableton.com/en/manual/live-audio-effect-reference/
18. Brown, Stecker, Tollin, "The Precedence Effect in Sound Localization", JARO 16(1) 2015 (echo thresholds).
    https://pmc.ncbi.nlm.nih.gov/articles/PMC4310855
19. iZotope Ozone 9 Help, Imager (Stereoize Mode I, correlation meter). https://s3.amazonaws.com/izotopedownloads/docs/ozone9/en/imager/index.html
20. iZotope Insight 2 Help, Sound Field (correlation, vectorscope). https://s3.amazonaws.com/izotopedownloads/docs/insight200/en/sound-field/index.html
21. ITU-R BS.1770-5 (2023), gating sec. and Annex 2 (true peak). https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.1770-5-202311-I!!PDF-E.pdf

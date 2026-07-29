# Slimehedron VST Port

## Overview
Web-based gravity sequencer (single HTML file, Web Audio API) → native VST3 plugin via Rust + nih-plug

## Core Audio Architecture

### State Object (S)
All parameters centralized in one object:
- **Transport:** bpm, div (note length), triplet, dotted, swing, quantize
- **Scale:** root, scale type, octave span
- **Geometry:** shape (triangle-octagon), spin, chaos, speed, gravity
- **Velocity:** velRand (randomize), velFix (fixed amount), velMin, velMax
- **Synth Voice:** wave (sine/tri/saw/square), sub (sub-bass level)
- **ADSR Envelope:** atk, dec, sus, rel (in seconds, 0.001-0.28 range)
- **Filter:** type (lowpass/highpass/bandpass), cut (cutoff 0-1), res (resonance 0-1), fenv (filter envelope 0-1)
- **Output:** vol (0.55), delay, warmth (tape saturation)

### Synth Voice Chain (per note)
1. **Oscillator** - OscillatorNode (S.wave type)
   - Frequency set from grid position + scale
   - Slight random detune (±4 cents)
   - Pitch ramp: settle onto target in 40ms
2. **Sub-bass** (optional) - Triangle oscillator at freq/2
3. **Filter** - BiquadFilterNode (S.filt type)
   - Cutoff envelope: attack to S.fenv peak, then decay back to S.cut
   - Q (resonance) = S.res * 12 (capped at 12 for safety)
4. **ADSR Gain Envelope**
   - Attack: S.atk (linear ramp to peak velocity)
   - Decay: S.dec (linear ramp to sustain)
   - Sustain: S.sus (level held)
   - Release: S.rel (exponential decay to silence)
   - Peak velocity varies by impact and physics

### Master Audio Chain
```
[Melody Bus] ─┐
[Drums Bus]  ──→ [Master Gain] → [Delay FX] → [Master LP] → [Master HP] → [EQ] → [Compressor] → [Tape Stage] → [Limiter] → Output
[Bass Bus]   ─┘
```

**Tape Stage** (subtle character, no AudioWorklet):
- Waveshaper (tanh saturation, normalized curve)
- Wow/flutter LFOs (0.5Hz + 6.3Hz modulating 4ms delay)
- Hiss (white noise, filtered to 3.2kHz, quiet)

## Implementation Strategy: Rust + nih-plug

### Framework Stack
- **Plugin SDK:** nih-plug (MIT licensed, zero cost)
- **DSP:** `dasp` or `fundsp` for oscillators/filters
- **GUI:** `vizia` (nih-plug's built-in UI framework)
- **Build:** cargo + nih-plugin-template
- **Target:** VST3, Windows x64 (WSL compatible)

### Port Mapping: Web Audio API → Rust
| Web Audio | Rust Equivalent |
|-----------|-----------------|
| OscillatorNode | wavetable synthesis or simple math (sin/tri/saw) |
| BiquadFilterNode | biquad filter coefficients (cookbook equations) |
| GainNode | simple multiplication |
| DynamicsCompressor | peak detector + envelope follower |
| WaveShaper curve | lookup table (same tanh curve, 1024 samples) |
| DelayNode + feedback | circular buffer + interpolation |
| BufferSource + loop | wavetable playback |

### Phase 1: Core Synth Engine
1. **State struct** matching S object (all params as floats 0-1 normalized)
2. **Oscillator** - sine/tri/saw/square wavetables
3. **Filter** - biquad lowpass/highpass/bandpass
4. **ADSR envelope generator**
5. **Voice allocator** - polyphony (max 8 voices)

### Phase 2: Master Chain
1. Delay line with feedback
2. Master filters (LP + HP)
3. Compressor (peak detection)
4. Tape saturation (waveshaper)
5. Limiter at output

### Phase 3: Sequencer & Physics
1. **Grid/geometry engine** - reproduce edge-building logic
2. **Gravity simulation** - ball physics matching web version
3. **Note trigger logic** - when ball hits grid edge, calc note from position
4. **Tempo sync** - BPM-aware scheduling

### Phase 4: UI & Parameters
1. **nih-plug parameters** - expose all S values as VST params
2. **Vizia UI** - recreate essential controls (not full visual clone)
   - BPM, waveform, ADSR, filter, geometry
   - Shape selector, gravity slider
3. **MIDI I/O** - note in, CC for params

## Code Organization (Current HTML)
- **Lines 403-412:** State object definition
- **Lines 419-459:** Audio context init, master chain setup
- **Lines 489-517:** Single synth voice creation + envelope
- **Lines 559-582:** Drum synthesis (separate kit)
- **Lines 650-668:** Bass + chord pad synths
- **Lines 470-476:** Frequency math, scale/root note calculations

## Key Implementation Details

### Pitch Calculation
```
- Root note: S.root (MIDI 0-127, default 60 = middle C)
- Grid position → cents offset → frequency via log scale
- freqFromCents(cents) = 440 * 2^((S.root + cents/100 - 69) / 12)
```

### Envelope Timing
```
- A (attack) = (S.atk + random*0.1) * easing
- D (decay) = (S.dec + random*0.2) * easing * shorten
- S (sustain) = S.sus + random*0.2
- R (release) = (S.rel + random*0.8) * easing * shorten
```

### Filter Envelope
```
- If S.fenv > 0: start at cutoff+fenv, decay to cutoff over A+D time
- Else: static at base cutoff
- Resonance capped: Q = min(12, S.res * 12) for safety
```

## Constraints & Notes
- **Polyphony:** No hard limit, but ~8-12 simultaneous voices reasonable
- **CPU:** Native audio code will be 10-100x faster than Web Audio
- **Buffer size:** nih-plug handles this; use 256-512 sample blocks
- **Thread safety:** All synth logic in audio thread, params synced via atomic floats
- **No breaking changes:** Preserve all S parameter ranges and meanings

## What to Ignore (Web-Specific)
- Canvas visualization (not needed for plugin)
- IndexedDB recording
- PWA/service worker stuff
- Mobile touch handling
- Browser detection

## First Step
Map the synth voice creation (lines 489-517) to Rust pseudo-code.
Then implement a basic oscillator + ADSR in nih-plug template.
Test with a VST host (reaper, ableton, etc) on Windows.

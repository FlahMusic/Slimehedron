# Slimehedron Weekly Tech Scan

## 2026-08-25

- **sfizz-webaudio** (MIT/GPL) – SFZ sampler as WebAudio library; WASM-based. Adds acoustic sample layers without bloat. **Medium** integration. Risk: bundle size, but offline-safe.
- **Wasm Audio Worklets (Emscripten)** – Zero GC pauses now guaranteed; Rust+WASM is community standard for synthesis. Slimehedron's vanilla JS is still lean; **Hard** to migrate, marginal gain.
- **Sevish Scale Workshop** – Free web tool for .scl/.kbm design; reference only, no integration needed.
- **MTS-ESP** – Strongest microtonal system but plugin-only (C/C++); no browser impl. Compatibility goal for future.
- **Tone.js / Elementary / RNBO** – No August 2026 announcements. Stable baseline.

Nothing urgent. WASM stabilizing as audio DSP standard. Single-file vanilla JS + Web Audio API remains sound for Slimehedron's scope.

## 2026-08-26

- **JSPI (JavaScript Promise Integration)** – Phase 4 in 2026; lets Wasm await async web APIs without blocking audio thread. **Easy** integration if you need async MIDI polling. Risk: none; purely opt-in.
- **Wasm 3.0 (SIMD, Memory64, WasmGC, Relaxed SIMD)** – AudioWorklet DSP now achieves 85–95% native speed; sets the bar higher for vanilla JS. Slimehedron is comfortably ahead of obsolescence; no action needed.
- **mpe.js** – Open-source MPE parser for Web MIDI. Simplifies MPE note-state tracking if Slimehedron adds MPE input. **Easy** drop-in. Risk: none.
- **Surge XT tuning guide + 182 .scl/.kbm presets** – Community gold standard for microtonal ref files; helpful for future Slimehedron scale library. No code integration; valuable as asset bundle.
- **Faust web component (`<faust-editor>`)** – Not for embedding in Slimehedron; useful for documenting DSP logic. Risk-free to mention in docs.
- **Web Audio Conference (Paris, 2026)** – No session notes yet; check wac.ircam.fr post-event for emerging patterns.

**Summary:** No breaking changes. Wasm ecosystem consolidating around AudioWorklet + Rust/C++ DSP. Slimehedron's vanilla JS approach remains pragmatic for single-file PWA. JSPI + mpe.js are future-ready optionals if you add async MIDI or deeper MPE support later. Keep eye on Faust/RNBO for educational partnerships.

## 2026-09-02

- **Tone.js 15.5.12** (MIT) – Latest "next" version (May 2026). Stable Web Audio framework; no breaking changes vs. baseline. Reference for API patterns but no Slimehedron integration needed.
- **SuperSonic (SuperCollider in browser)** – scsynth running as AudioWorklet (WASM). Powerful synthesis engine but heavyweight (educational use, not embeddable). Benchmark: modern WASM synthesis is fast but adds bundle size.
- **Bitwig Studio 6.1 (Aug 2026)** – Granular playback mode; desktop-only. Mindful: Slimehedron's generative slime band already covers algorithmic texture; no feature gap.
- **start-audio-worklet, audio-worklet-stream, wave-worklet** – Small utility libs for AudioWorklet setup/recording. **Easy** drop-in helpers if Slimehedron adds recording. Risk: negligible; minimal dependencies.
- **MIDI Surf** (open source) – Free browser-based MIDI controller with offline PWA mode. Reference design for custom MIDI UI if needed; no code to adopt (separate tool).
- **Scale Workshop** (active 2026) – Still the gold standard for .scl/.kbm design and export. Community-maintained by xenharmonic-devs. Asset library remains valuable for future scale packs.

**Summary:** September week is quiet on urgent fronts. Tone.js stable; WASM synthesis now commodity (no blocker for vanilla JS parity). New AudioWorklet libs are convenience, not necessity. Scale Workshop's microtonal export chain still unsurpassed. No breaking changes. Slimehedron positioned well.

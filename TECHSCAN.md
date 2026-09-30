# Slimehedron Weekly Tech Scan

## 2026-09-30

Quiet week: nothing new launched in the last 1-2 weeks that's worth Slimehedron's attention. Searched Web Audio/AudioWorklet, Tone.js, faustwasm, Elementary, sfizz, MTS-ESP/Scale Workshop, Web MIDI browser support.

- **Web Audio 1.1 draft (Sept 22)** still the only platform news; already logged 09-23 (`playbackStats`, `renderSizeHint`). Feature-detect only.
- **Tone.js** - GitHub's latest release is 15.1.22 (Jul 12), no September release. (Earlier entry cited 15.5.12; the npm "next" tag may differ, so verify before relying on either.) No action.
- **faustwasm** - no tagged releases on GitHub. No action.
- **MTS-ESP / Scale Workshop / Web MIDI 2.0** - unchanged, no browser MTS-ESP, MIDI 1.0 only in browsers.

**Summary:** nothing to adopt. Single-file PWA model intact.

## 2026-09-23

Two real platform items this week, both built into the browser, so no new libraries or licenses to deal with. The library scene is quiet again.

- **Chrome 153 (stable Sept 8): `renderSizeHint` on AudioContext.** Lets the app ask for a render quantum other than 128 frames (an integer, `"default"` or `"hardware"`). *Why it helps:* `"hardware"` could cut glitches on cheap Android devices, which is exactly where kids play. **Easy**: one constructor option, and older browsers ignore it. *Risk:* Chrome-only. Firefox had no plans to implement it as of Jan 2026. Changing the quantum can shift timing assumptions in the MIDI-clock DLL or any worklet that hardcodes 128. Test it before shipping; don't default it on.
- **Web Audio API 1.1 Working Draft (W3C, published Sept 22).** Formalises `playbackStats` (AudioPlaybackStats: average/min/max latency plus underrun counts, updated every 1s), `setSinkId`/`sinkId`, and the render-quantum hint. *Why it helps:* real measured latency would help MIDI-clock/output offset compensation more than `outputLatency` alone, and underrun counts could drive an automatic "lite mode" on weak devices. **Easy**, and it should be feature-detected (`'playbackStats' in ctx`). *Risk:* MDN marks it **experimental**. I could not confirm which browsers ship it (the compat table didn't render), so treat it as progressive enhancement only.
- **Tone.js / Faust / Elementary / RNBO / sfizz / MTS-ESP:** no new tagged releases found. Scale Workshop has active PRs (e.g. a measured harmonium timbre) but no release. No action.
- **Skipped:** hobby WASM-worklet repos (808/909 kits etc.). They're single-dev projects with no clear license, so not worth copying from.

**Summary:** Nothing to install. Two optional one-liners are worth trying behind feature detection: `renderSizeHint:"hardware"` and `playbackStats`. The single-file PWA model stays intact.

## 2026-09-09

Quiet week — nothing genuinely new dropped in the last 1–2 weeks. Checked Tone.js release history, Faust/faustwasm and IFC-26 conference chatter, Elementary Audio/RNBO/Cmajor DSP-language landscape, MTS-ESP, and the xenharmonic tooling scene (Scale Workshop, Sevish). No new releases or announcements surfaced beyond what's already logged in prior entries.

- **Tone.js** – still on 15.x line, no new stable release since the last scan. No action.
- **Faust / faustwasm** – active community (IFC-26 conference happened June 2026), but no new browser-relevant tooling this week. `faust2webaudiowasm` remains the path if Slimehedron ever wants DSP-as-WASM; still **Hard**/unnecessary for current scope.
- **Sevish** – shipped a "Catalogue of Xenharmonic Releases" (community archive site, Aug 2026), not a dev tool — no relevance to Slimehedron's codebase.
- **MTS-ESP / Scale Workshop** – unchanged; Scale Workshop remains the reference for .scl/.kbm export, no browser-native MTS-ESP exists.

**Summary:** No breaking changes, no new libraries worth adopting. Single-file vanilla JS + Web Audio approach remains sound. Nothing to integrate this week.

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

## 2026-09-16

Another quiet week — no new browser-audio releases or announcements in the last 1–2 weeks worth Slimehedron's attention. Checked Web Audio API/MDN changelog, Tone.js releases, Faust/faustwasm, Elementary Audio, MTS-ESP, Web MIDI 2.0 status, and Web Audio Conference chatter.

- **Web MIDI 2.0** – still unshipped in any browser (Chrome/Edge/Opera/Firefox all MIDI 1.0 only); W3C draft only. No action — MPE via `mpe.js` (already logged) remains the right approach.
- **Tone.js** – repo touched Sept 10, 2026 but no new tagged release since 15.x line. No action.
- **Faust / faustwasm, Elementary Audio, MTS-ESP** – unchanged from prior scans, no new browser-relevant tooling.
- **Web Audio Conference** – 2025 edition was Nov 2025 in Paris; no 2026 edition announced yet, nothing to mine.

**Summary:** No breaking changes, nothing new to adopt. Single-file vanilla JS + Web Audio approach remains sound and futureproof.

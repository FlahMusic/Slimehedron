# Slimehedron VST — port plan

**Status:** planning. Rust installed on the MSI (2026-10-12). Nothing scaffolded yet.
**Last refreshed:** 2026-10-12. The previous version of this doc was written in July and is
superseded — its line numbers pointed into a file that has since roughly doubled, it predated the
chord brain, the per-kit drum tones, the groove engine and the goo-lag quantizer, and it assumed a
GUI decision that has now been reversed.

---

## 1. Scope

**Studio mode, whole, inside a DAW — with the visual style intact.** Not a stripped-down synth with
knobs. The crayon art, the slime tank, the layout: it looks like Slimehedron or it is not
Slimehedron. UI may be adjusted where a DAW window genuinely needs it, but a person moving from the
browser to the plugin should not feel they have changed app.

Out of scope: learn mode, play mode's kid-facing shell, the lesson engine, the splash.

---

## 2. The architecture decision that everything else follows from

The app today is one thing: HTML that draws AND Web Audio that sounds, both on one thread, both
driven by the same `requestAnimationFrame` loop. A plugin cannot work that way, for two reasons that
are not negotiable:

1. **A DAW can close the plugin window and the music must keep playing.** If the tank lives in the
   UI, closing the window stops the sequencer.
2. **The host owns the clock.** The DAW hands the plugin a block of samples and a transport
   position. Timing has to come from that, not from a browser animation frame.

So the line is drawn here:

```
      RUST (audio thread)                    WEBVIEW (UI thread)
  ┌────────────────────────────┐        ┌──────────────────────────┐
  │ synth voices, drums, band  │        │ the crayon art           │
  │ effects, limiter           │        │ the tank canvas          │
  │ THE TANK PHYSICS           │ ─────► │ the controls             │
  │ note scheduling            │ state  │ (draws what Rust reports)│
  │ host transport sync        │ ◄───── │                          │
  └────────────────────────────┘ edits  └──────────────────────────┘
```

**The physics moves to Rust.** That is the single biggest change from the web app and the thing most
likely to be got wrong if nobody writes it down: the tank is not a visual effect that happens to
make noise, it IS the sequencer, so it belongs on the side that owns time. The webview receives ball
positions each frame and draws them. It sends user intent back (a tap, a slider move).

This is also what makes the UI port cheap: the drawing code (`draw`, `drawBalls`, `drawParticles`,
`softBlobs`, `drawShape`, the whole crayon CSS) is already a pure function of state. It stops
*computing* the state and starts *being handed* it.

---

## 3. The stack — researched 2026-10-12, not assumed

### Verdict

| layer | choice | why |
|---|---|---|
| plugin format | **CLAP**, wrapped to VST3/AU/AAX by **clap-wrapper** | one implementation, every format |
| GUI | **webview** (HTML/CSS/canvas) via **wxp** | the existing UI is already HTML/canvas — this is the only route that keeps the art |
| template | **WRAC** (`novonotes/wrac-plugin-template`, MIT) | CLAP + wxp + clap-wrapper already wired, incl. the dev standalone host |
| DSP + physics | **our own crates**, no framework dependency | so none of the above can strand us |

### What was considered and why it lost

- **nih-plug** — the July plan named it. It is now **in maintenance mode** per its own README.
  Framework is ISC; its VST3 bindings are GPLv3 (fine — Slimehedron is GPL-3.0-or-later).
- **nice-plug** (`RustAudio/nice-plug`, Codeberg) — the community fork of nih-plug, now the
  recommended Rust plugin toolkit. ISC, active (last commit 2026-09-14, ~2.5k commits, 13 releases).
  Its README calls itself **experimental** and says to expect bugs after recent large changes.
  GUI-agnostic over baseview, with egui / iced / slint(WIP) / vizia integrations.
  **Lost on one point only: none of those toolkits can render this app's look without redrawing the
  entire thing by hand.** That is months of work to arrive somewhere worse.
- **A native GUI toolkit (egui / iced / vizia)** — same problem. These draw boxes and knobs well.
  They do not draw a hand-crayoned tank full of metaball goo without a full re-implementation.
- **JUCE / C++** — the industry default, and a complete rewrite in a language this project has none
  of. No.

### The risks, named

- **wxp is alpha** (`0.1.0-alpha.x`), API still stabilising, breaking changes expected between
  releases. NovoNotes say they run it in production across 15k+ users of their own plugins.
- **WRAC says plainly** it is "an implementation example and starting point, not a general-purpose
  framework" and will not provide API backwards compatibility or migration support.
- **Mitigation, and it is the whole reason for the crate split below:** wxp and WRAC touch nothing
  but the window and the IPC. Every line of DSP, physics and musical logic lives in crates that do
  not know a plugin exists. If wxp breaks or dies, we replace a window, not an app.
- AUv3 support in WRAC is incomplete. AAX needs Avid's SDK. Neither is day-one.
- Linux has no AU; macOS builds need a Mac. Windows VST3 + CLAP is the first target.

### Licensing — clear now

VST3 SDK was **relicensed by Steinberg to MIT** (Oct 2025, SDK 3.8), replacing the old
GPLv3-or-proprietary dual licence. Nothing to sign, no conflict with GPL-3.0-or-later. CLAP is MIT.
WRAC and wxp are MIT. nice-plug is ISC. There is no licensing obstacle anywhere on this path.

---

## 4. What is actually in the engine today

Inventory taken from `index.html` on 2026-10-12 (~636KB, ~290 functions). **Function names, not line
numbers** — the old doc's line numbers rotted within weeks.

### Web Audio nodes in use (every one of these becomes hand-written DSP)

| node | count | becomes |
|---|---|---|
| `createGain` | 45 | a multiply |
| `createBiquadFilter` | 21 | RBJ cookbook biquad |
| `createOscillator` | 17 | wavetable / polyblep |
| `createBufferSource` | 7 | sample playback (noise, tick) |
| `createDynamicsCompressor` | 3 | peak detector + envelope follower |
| `createWaveShaper` | 2 | lookup table (tape sat + the output clamp) |
| `createDelay` | 2 | circular buffer + interpolation |
| `createConvolver` | 1 | the reverb — see note below |
| `createStereoPanner` | 1 | equal-power pan |
| `createPeriodicWave` | 1 | additive table |
| `createScriptProcessor` | 1 | the WAV recorder tap — **not needed in a plugin**, the host records |

**The convolver is the one to think about.** A convolution reverb is an FFT partitioned convolution
in Rust — real work, and there are crates for it. Alternative: an algorithmic reverb (FDN) that
sounds close enough. Decide when we get there; it is late in the order.

### Subsystems, by the names they have in the code

- **Voice:** `playSynth` (osc + sub + filter + ADSR + the `firm` flag), `freqFromCents`, `cutHz`,
  `setOscWave`, `velForHit`, `trigger`. Polyphony cap `MAXBALLS=12`.
- **Drums:** `dHit`, `initDrums`, `drumSchedule`, `drumSPB`/`drumBar`/`drumStepDur`, `humanVoice`
  (per-instrument micro-timing + velocity feel), `DRUMN` (6 voices: K s h r C c),
  **`KITTONE` — 11 kits** (pop, rock, disco, bossa, industrial, chip, conga, beep, march, samba,
  jazz), each with its own synthesis constants.
- **Band:** `bandPlan`, `genComp`, `genBass`, `genFill`, `pickOnsets`, `pickArtic`, `bandBar`,
  `bassNote`, `padVoice`, `pluck`, `advanceHarmony`. Buses: `melBus`, `bandBus`, `padBus`, `drumBus`.
- **Chord brain:** `pickChord`, `cmChordCents`, `chordDegrees`, `wallDegrees`, `pcToNearestDeg`,
  `chordName`, `cmSave`/`cmLoad`/`cmActive`, `keyJourney`. This is the thing that makes it sound
  musical and it is pure arithmetic — it ports almost literally.
- **Scales:** `SCALES` — **25 of them**, including microtonal ones (maqamRast, maqamBayati, slendro,
  pelog, neutral7, edo19). `centsForDegree`, `totalDegrees`, `snapToScale`. All cents-based, so it
  survives the port unchanged; MPE already exists (`mpeSetup`, `mpeSend`) for true microtonal out.
- **Groove:** `GROOVES`, `activeGroove`, `feelFor`, `drumTriplet`, swing + quantize in `S`.
- **Physics:** `step`, `simTick`, `bounceInside`, `buildEdges`, `rebuild`, `computeSegs`, `segHit`,
  `spawn`, `shootBall`, `fillPhysics`, `relaxParticles`, `sweepBadBalls`, `breakWall`/`repairWall`,
  `explodeReform`. Fixed 60Hz timestep with render interpolation — **that design carries straight
  over to a plugin**, it is already decoupled from the frame rate.
- **The goo:** `measureFill`, `gooAt`, `settleAmt`, `feedLiquidHue` — the liquid both looks like
  something and *damps the balls*, so it is physics, not decoration. It has to move to Rust with the
  rest.
- **Master chain:** `master` → `tapeShaper` (tanh + wow/flutter + hiss) → `lim`
  (DynamicsCompressor) → `outClip` (hard clamp at 0.891) → out. Plus `rvb`, `dly`.
- **MIDI:** `sendMidiAt`, `midiMsg`, `clockStart`/`clockStop`/`clockSchedule`, `mpeSetup`. In a
  plugin most of this becomes the host's job — and MIDI **out** becomes a plugin note output, which
  is a better version of the same feature.
- **State:** `S` — ~40 keys (transport, scale, geometry, velocity, synth, ADSR, filter, mix, fx).
  Every one of these is a candidate plugin parameter the DAW can automate.

### What gets dropped

Service worker / PWA, IndexedDB recordings (`recDB`, `wavBlob`, `startPCM` — the host records),
the splash, mobile touch handling, the share sheet, browser detection, learn mode entirely.

---

## 5. Plan

### Crates

```
vst/
  Cargo.toml                  workspace
  slimehedron-core/           NO plugin deps, NO webview deps
    src/synth/                voice, drums, band, effects
    src/music/                scales, chord brain, groove
    src/tank/                 geometry, physics, goo
    src/engine.rs             one struct: feed it a block, get samples + events
  slimehedron-plugin/         CLAP. owns params, host transport, audio callback
  slimehedron-ui/             the webview: HTML/CSS/canvas lifted from index.html
```

`slimehedron-core` has no dependency on any plugin or GUI crate. Two reasons: the alpha-framework
risk above, and **it compiles to WASM**, which means the website can eventually run the same engine.
One synth, not two that drift.

### Order of work

1. **One note out of Reaper.** `slimehedron-core` with a single voice (osc + filter + ADSR), the
   CLAP wrapper, no UI, no physics. The whole point is proving the chain end to end.
2. **The tank, headless.** Physics + geometry + note triggering in `core`, driven by the host clock.
   Still no UI — a test that renders 8 bars to a WAV and we listen to it.
3. **The webview shows up.** wxp window, the existing canvas drawing code lifted over, state
   streamed from Rust. First time it looks like Slimehedron.
4. **The band and the kits.** Chord brain, bass, comp, 11 drum kits, grooves.
5. **Effects and the master chain.** Tape, delay, reverb, limiter, the output clamp.
6. **Parameters and automation.** `S` keys exposed as CLAP params so a DAW can automate them.
7. **Formats.** clap-wrapper → VST3. Then AU on a Mac if we want it.

Milestone 1 is a weekend. Milestones 2–3 are where the project is really decided.

---

## 6. Open decisions

- **Does the plugin make its own notes, or can it also be played?** It is a generative instrument;
  accepting MIDI in to seed or steer it is a design question, not a technical one.
- **Reverb:** convolution (faithful, more work) or algorithmic (close, cheap).
- **The goo:** full fluid in the audio thread, or simplified. It affects the sound (it damps balls),
  so "turn it off" is not free.
- **Mac?** Needs a Mac to build and sign. Windows-first either way.

---

## 7. Sources for the stack decision

- Steinberg VST3 → MIT: <https://librearts.org/2025/11/steinberg-relicenses-vst3-and-asio/>
- nih-plug (maintenance mode, per README): <https://github.com/robbert-vdh/nih-plug>
- nice-plug: <https://codeberg.org/RustAudio/nice-plug>
- WRAC plugin template (MIT): <https://github.com/novonotes/wrac-plugin-template>
- wxp (MIT, alpha): <https://github.com/novonotes/wxp>
- clap-wrapper: <https://crates.io/crates/clap-wrapper>

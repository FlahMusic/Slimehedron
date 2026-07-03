# slimehedron sound engine v2 — the raindrop plan

*written jul 3, 2026 · audited against index.html as of today*

## north star

an organic raindrop-in-a-barrel instrument. no two drops sound the same. the fill level is the slow macro (register, wash, dreaminess); each individual hit is the fast micro (tick vs ring, plucky vs airy). kid-simple on the surface, physically honest underneath, runs smooth on old phones. triangle wave stays the tonal heart — it's the most pleasant cheap waveform there is and it's already the default.

## what's actually in the engine today (audit)

- each note = one triangle oscillator (+ optional sub osc), lowpass filter with envelope, ADSR morphed by fill level. velocity only changes loudness. no transient layer, no per-hit variation. this is why it reads as "basic arp."
- "echo" = a single tempo-synced feedback delay (dotted eighth). there is **no reverb** anywhere.
- the echo slider defaults to **0**, not 100 — but the fill level silently adds up to **+0.4 wet** and pushes feedback from **0.2 → 0.48** as the shape fills (line ~595). feedback near 0.5 on a dotted-eighth compounds over bars into the wash that drowns the melody. **the fill boost is the culprit, not the slider.**
- both wet and fill-boost are linear, so perceived wash ramps way too fast.

## the physics (verified, sources at bottom)

- a drop hitting water makes **two sounds**: a short broadband impact "tick," then — only sometimes — a tonal "ring" a few milliseconds later, when the collapsing crater pinches off an air bubble underwater. the bubble's volume oscillation is what makes the musical tone (confirmed for dripping taps in a 2018 Nature Scientific Reports paper).
- bubble size sets the pitch via **Minnaert resonance**: small clean drops (0.8–1.2mm) ring high, 13–25kHz; bigger drops entrain irregular bubbles ringing anywhere from 2–10kHz, and many big drops trap no bubble at all — quieter, just splash.
- so in nature: **pitch and character are functions of impact geometry**, and not every drop rings. that's the whole design blueprint. (we transpose the frequencies down into musical range, obviously — the *relationships* are what we steal, not the kHz.)

## engine changes

### 1. tame the echo (the immediate fix)
- cut the fill-driven wet boost from +0.4 to **+0.22 max**, and make it ease in with a squared curve (barely anything below half-full, blooms near the top — matches how the ear hears wash).
- cap feedback at **0.35** absolute (currently reaches 0.48). feedback and wet capped independently, like the other claude said.
- square-taper the echo slider itself so the front half is subtle.
- result: melody stays legible even at high fill; the wash becomes a bloom instead of soup.

### 2. two-layer droplet voice (the character fix)
- **tick**: 5–15ms burst of filtered noise through a bandpass tracking the note frequency (~2–3 octaves up, wide Q). this is the "half slime" part of the character — we tune the noise color so it's ours, not a stock rain sample. no samples, no downloads, works offline in the PWA.
- **ring**: the existing triangle body, started a stochastic **8–25ms after** the tick — that tiny gap is the crater-collapse delay and it's what makes it read as liquid instead of synth.
- a slight downward pitch glide on the ring's first 40ms (real bubbles sharpen/settle as they stabilize — a tiny bend sells it hard).

### 3. velocity → timbre (physics does the expressiveness)
- fast/hard hits = big drop: more tick, shorter darker ring, splashier.
- slow/soft hits = small clean drop: quiet tick, longer airy resonant ring.
- rare (~5%) hits are "dud drops" — mostly tick, almost no ring, slightly quiet. NOT silent (silence confuses kids), just a soft thud. this irregularity is what real rain does.

### 4. per-hit jitter (kills the arp feeling)
- ±4 cents detune, ±15% envelope length, ±10% tick/ring balance, per hit. tiny numbers, huge effect.

### 5. tape color stage (the nostalgia layer)
one shared chain on the master bus, before the limiter (so recordings inherit it, subtly):
- gentle **tanh soft-clip waveshaper** (saturation)
- soft high-shelf rolloff around 10kHz (tape's rounded top)
- **wow & flutter**: a ~3ms delay whose time is wiggled by two slow LFOs (0.5Hz wow ±0.4ms, 6Hz flutter, tiny) — the standard cheap technique, this is how the lightweight plugins do it too
- optional hiss: looped noise buffer at very low gain
- exposed as one kid-named knob in the advanced bar (e.g. "warmth"), default low-but-on. never enough to smear recordings.
- **why not a full SP-1200/MPC sim**: true sample-rate crunch needs an AudioWorklet (JS on the audio thread — exactly what stutters on old phones). the tanh+rolloff+wow chain gets 90% of the cassette feel with native nodes at ~zero cost. worklet crunch can be a later toggle if we ever want it.

### 6. autoplay gets organic
slime mode additionally wanders **ball speed / chaos variance** inside a gentle bounded range. velocity variety then drives the tick/ring physics for free — "some notes plucky, some airy" without a separate randomizer bolted on.

## performance budget (poor-kids-old-phones rule)

- native Web Audio nodes only. no convolver, no AudioWorklet. these run as optimized native code on the audio thread — fine on a 2015 android.
- per-voice cost adds one buffer-source + one bandpass + one gain (noise buffer allocated **once** and shared). trivial.
- graceful degrade: above 24 active voices, skip the tick layer.
- master tape chain is fixed cost (6 nodes total) no matter how many voices.
- voice cap stays at 32.

## what stays untouched

drums, MIDI out, recording chain, fill→filter morph, burst/reform logic, all UI outside the one new "warmth" knob. echo slider keeps its name.

## sources

- [The sound produced by a dripping tap is driven by resonant oscillations of an entrapped air bubble — Nature Scientific Reports (2018)](https://www.nature.com/articles/s41598-018-27913-0)
- [Sound emission from oscillating bubbles trapped by drop-impact craters — arXiv (2025)](https://arxiv.org/html/2512.09336)
- [Listening to Raindrops — NASA Earth Observatory](https://earthobservatory.nasa.gov/features/Rain/rain_2.php) (drizzle 13–25kHz, bubble ~230μm ≈ 14kHz peak)
- [Underwater Sound Radiation from Large Raindrops — DTIC](https://apps.dtic.mil/sti/tr/pdf/ADA245632.pdf) (type I ~15kHz vs type II 2–10kHz drops)
- [Wow and Flutter — Baby Audio blog](https://babyaud.io/blog/wow-and-flutter) (LFO-modulated delay technique; hysteresis solvers too CPU-heavy)
- [VHS Audio Effect Generator (Web Audio)](https://acestep.io/vhs-audio-effect-generator) (waveshaper + tilt EQ + modulated delay chain, all native nodes)

# Tank perfection: research notes (2026-11-02)

Research only. No code was changed. Words follow `_docs/GLOSSARY.md`. Each claim is tagged **[P]** (primary source,
read this pass), **[S]** (secondary, or a primary I could only see quoted by someone else) or **[D]** (my own derivation
or arithmetic from the cited numbers; check it). App facts come from the code as of commit `21eb702`.

## TLDR: the numbers that matter most

1. **One melodic line stays one line** (van Noorden 1975 [P]): fission boundary is about **1 semitone** at 100-400 ms per note; temporal coherence boundary is **Ic = 0.15 x (T - 100)** semitones (T = ms between onsets, valid ~100-200 ms). At 16ths at 120 bpm (125 ms) a jump over **~4 semitones** can split the line in two.
2. **Random-order notes**: listeners hear coherence only at **5-10 tones/s**. An ascending scale holds together up to **20 tones/s** (Schouten, quoted in van Noorden [P]). Tapping along tops out at **~8-10 Hz (100-125 ms)** (Repp 2006 [S]).
3. **Max 3 voices**: with similar timbres, listeners lose count of the voices going **from 3 to 4** (Huron 1989 [S]). Keep independent melodic layers at 3 or fewer.
4. **Audio vs picture of a wall hit**: detectable at **+45 ms (sound early) / -125 ms (sound late)**, acceptable to **+90 / -185 ms**. The broadcast target is **+25 / -100 ms** (ITU-R BT.1359-1 [P]). Sound early hurts more than sound late.
5. **Scheduling**: a JS timer every **25 ms** with **100 ms** lookahead on the audio clock (Wilson [P]). Tone.js defaults to **lookAhead 0.1 s, updateInterval 0.05 s** and a Worker clock (source [P]).
6. **Render quantum** is **128 frames** (2.67 ms at 48 kHz). The spec now allows `renderSizeHint` and exposes `playbackStats.underrunEvents`, a direct glitch counter a test can read (spec [P]).
7. **Each source node plays once** (`start()` twice throws InvalidStateError [P]). So you make nodes per note. GainNode is "very cheap to create and connect". Avoid HRTF panners and convolvers per voice ("very expensive"). The compressor adds **6 ms** of lookahead (Adenot [P]).
8. **Fixed tick**: accumulator plus `alpha = acc/dt`, and clamp frame time (Fiedler uses **0.25 s**) [P]. The tap must be picked against the **same interpolated pose that was drawn**.
9. **Tunneling** in a turning box: a wall point moves **omega x r per tick**. Conservative advancement bounds the motion as `|v|dt + |omega| r_max dt < distance` (Catto 2013 [P]). Rotation causes "glancing" misses even in Box2D.
10. **Tumble speed now** [D from `index.html:6059-6064`]: about **26 deg/s at 120 bpm** and **44 deg/s at 200 bpm**. Because of the `secBar` floor of 0.2 s it can reach **~225 deg/s**. Sickness from a full-field drum peaks at **60 deg/s** (Hu 1989; Ji 2009 [P]). Cap the tumble at **<= 45 deg/s** by our own judgement; a phone shows a small field of view, not a drum.
11. **Avoid 0.2-0.4 Hz** in-and-out optical flow (zoom or dolly pulses) (Diels & Howarth 2013 [S]). A 2-bar pulse at 120 bpm is **0.25 Hz**, which is inside that band.
12. **WCAG**: motion that starts by itself and runs over **5 s** needs a pause (2.2.2, Level **A**) [P]. Nothing may flash more than **3 times per second** (2.3.1) [P], which matters for the burst. Interaction motion must be possible to turn off (2.3.3 AAA) [P].
13. **Real drops merge in milliseconds**: water at R = 1 mm reaches full neck in **~1.4 ms** [D from Paulsen 2011 P]. For goo to *read* as goo, pick a viscous merge time **tau_v = mu R / sigma** of about **100-300 ms** (honey-to-syrup look). Stokes speed scales with **r^2**, so double size means 4x fall speed.
14. **Goo cost**: the three.js MarchingCubes addon is CPU JS over res^3 cells. The app's **40^3 = 64,000 cells** with maxPolyCount 90,000 is about **1.8 MB** of field data [D]. Screen-space fluid ran **64k particles at 17.5 ms** on a 2008 desktop GPU at quarter-res smoothing (van der Laan 2009 [P]). No primary phone numbers exist, so measure `gooMs`.
15. **Curved and portal space**: HyperRogue draws the Poincare disk by default and stores points on the Minkowski hyperboloid. Klein is p=0 and Poincare p=1 of one projection family [P]. Valve's portals recurse **once**; deeper layers are copies of layer 2 [P].

---

## 1. Musical physics: keeping a physics note generator musical

### 1a. What existing tools actually do

- **Chrome Music Lab** (Apache-2.0) [P] has no physics or bouncing experiment. The folders are arpeggios, chords,
  harmonics & strings, melodymaker, pianoroll, soundspinner, soundwaves and spectrogram
  (https://github.com/googlecreativelab/chrome-music-lab). Melody Maker quantizes everything to a Tone.js
  `Sequence(callback, steps, '8n')` grid
  (https://github.com/googlecreativelab/chrome-music-lab/blob/master/melodymaker/app/sound/Sequencer.js). Its voice
  caps are fixed and small: melody `PolySynth(3)`, harmony `PolySynth(2)`, `stealVoices = false`. A live tap plays at
  `'+0.01'` (10 ms ahead) rather than waiting for the grid, and a lookahead override `0.05` is commented out
  (https://github.com/googlecreativelab/chrome-music-lab/blob/master/melodymaker/app/sound/Player.js) [P].
  Lesson: **grid for the machine, now for the hand**. That matches the app's rule "a hand is never quantized".
- **Tone.js** defaults [P]: `lookAhead: 0.1`, `updateInterval: 0.05` (the setter makes it lookAhead/2) and
  `clockSource: "worker"` (https://github.com/Tonejs/Tone.js/blob/dev/Tone/core/context/Context.ts). `PolySynth`
  has `maxPolyphony: 32` and past that it **drops** the note with a "Max polyphony exceeded" warning
  (https://github.com/Tonejs/Tone.js/blob/dev/Tone/instrument/PolySynth.ts).
- **Ableton Bouncy Notes** (Dillon Bastan, Inspired by Nature) [P]: "a gravity-based MIDI sequencer ... a ball is
  dropped onto the corresponding note on the device's piano roll, where it will then bounce in place, up or down,
  sending out a new MIDI note wherever it hits". You can set the key and limit the range
  (https://www.ableton.com/en/packs/inspired-nature/). The Ableton page says nothing about quantize or tempo sync.
  A third-party blog says balls "bounce in time with the DAW"
  (https://abletoncookup.beehiiv.com/p/granular-synthesis-ableton) [S, unverified]. **Emit** in the same pack adds
  "walls for them to bounce off, and friction" [P].
- **Bloom** (Eno/Chilvers) [P]: the official page lists only "12 different mood settings", "Adjustable delay",
  "Evolve when idle" and "Shake to clear". It says nothing about scale, quantize or the loop engine
  (https://generativemusic.com/bloom.html). The mechanics are not documented in any primary source I found.
- **Rozeta (Bram Bos)**: I could not find a module called "Bounce". The suite has *Particles* and *Collider*. A news
  write-up says only that Collider is "less random and more predictable" than Particles
  (https://synthanatomy.com/2018/01/the-latest-update-of-rozeta-sequencer-suite-features-a-brand-new-midi-hadron-collider-auv3-plugin.html) [S].
  The developer's manual was not reachable. **Patatap / Elastic Drums**: no primary source on their timing; not used here.

### 1b. Collision-to-grid timing (what to do, with sources for each piece)

- **Two clocks** [P] (Chris Wilson, https://web.dev/articles/audio-scheduling): `setTimeout` "can easily be skewed by
  tens of milliseconds or more". A callback due at ~270 ms ran at ~320 ms. The OS audio buffer is "low single digits
  of milliseconds to around 50ms". Recipe: "100ms of 'lookahead' time, with intervals set to 25ms". The cost: a tempo
  change takes "a tenth of a second" to land.
- **Predict, don't detect** [D]. Inside a convex tank the next wall hit is analytic. For wall plane i (normal n_i,
  offset d_i), `t_i = (d_i - n_i.p) / (n_i.v)` over walls with `n_i.v > 0`; the next hit is `min t_i`. That is a
  sub-tick time, so the note can be scheduled at `audioTime(hit)` instead of the tick on which the overlap was found.
  The fixed tick alone quantizes a hit to +-8.3 ms (half of 16.7 ms), which is 1/3 of Hirsh's ~20 ms order threshold
  (below). Beat lock (`b.tq`) is the steering form of the same idea: scale speed so `min t_i` lands on a grid line.
  Under rotation the plane moves, so `t_i` must use the wall's velocity (section 2b) or it drifts.
- **Perceptual timing thresholds** (what "on the grid" must mean):
  - Order of two onsets needs ~**17-20 ms** (Hirsh 1959, JASA 31:759) [S:
    https://hearinghealthmatters.org/pathways-society/2023/temporal-ordering-hirsh-revisited]. Hirsh's ranges, as
    retold: 1-20 ms phase, 20-100 ms pattern, >= 100 ms separate events [S].
  - Tapping along: the upper rate limit for sound is ~**100-125 ms IOI** and the lower one ~**1800 ms (0.56 Hz)**
    (Repp 2006, Adv. Cogn. Psychol. 2:163; https://doaj.org/article/dc3f29b3977e4adf8dfe9aa998eb40de) [S, abstract
    via DOAJ, full text not read].
  - Audio vs video sync [P] (ITU-R BT.1359-1,
    https://www.itu.int/dms_pubrec/itu-r/rec/bt/R-REC-BT.1359-1-199811-I!!PDF-E.pdf): detectability "+45 ms to -125
    ms", acceptability "+90 ms to -185 ms" (positive = sound early). The end-to-end target zone is "+25 ms and -100 ms".
    Between "just detectable" and "acceptable" there is ~45 ms when sound is early and ~60 ms when it is late.
    Use this for the wall flash vs the note, and for the Sync setting.

### 1c. Note density and streaming (van Noorden 1975, primary, read this pass)

Source: L.P.A.S. van Noorden, *Temporal coherence in the perception of tone sequences*, PhD, TH Eindhoven 1975,
https://pure.tue.nl/ws/files/3389175/152538.pdf. All quotes below are from the thesis (p. numbers from the text layer).

- **Two boundaries.** "Temporal coherence boundary" (TCB): above it you always hear two streams. "Fission boundary"
  (FB): below it you always hear one. Between them it depends on what the listener attends to.
- **FB**: "In the medium range [T ~ 0.1-0.4 s] the fission boundary is practically independent of T at about 1
  semitone". It shifts up at very short and very long T.
- **TCB**: "can be approximated to by the equation Ic = 0.15 (T-100), where the tone interval is expressed in
  semitones and T in ms. The slope is thus roughly 15 semitones per 0.1 second". It was measured over 48 ms <= T <= 200 ms.
  It has a knee at T ~ 100 ms; below that it is "horizontal ... only a small tone interval above the fission boundary".
- **Random-interval sequences** (closest to balls hitting walls) gave TCBs "surprisingly close" to the alternating ones (ch. 5).
- Schouten (1962, quoted): an ascending scale stays coherent "up to a tempo of at least 20 tones per second". Random
  order needs "5 - 10 tones per second". At 2 tones/s even an octave-displaced tone can be placed again.
- Prior streaming studies all used "about 8 - 10 tones per second". Melody musicology: "Small tone intervals (1 to 3
  semitones) give strong melodic coherence" and "Small intervals occur much more often than large ones" (Fucks 1962).
- Roll effect: below ~80 ms per tone a level difference alone can split the sequence.
- **What this gives the app** [D]: max leap for guaranteed one-stream hearing is 0.15 x (IOI - 100) semitones.
  - At 120 bpm, 16ths are 125 ms, so the max leap is **3.75 semitones**.
  - Triplet 8ths (167 ms) give **10 st**.
  - 8ths (250 ms) are beyond the measured range: a leap of about an octave is fine.
  - Below 100 ms IOI keep steps <= 2 st, or the line becomes a "ripply" blur (van Noorden's "fusion" at 20 tones/s).

### 1d. How many lines a listener follows

- Huron 1989, "Voice denumerability in polyphonic music of homogeneous timbres", Music Perception 6(4):361-382
  [S, abstract via https://labs.sonicfield.org/library/voice-denumerability-in-polyphonic-music-of-homogeneous-timbres].
  Accuracy "drops markedly at the point where a three-voice texture is augmented to four voices". Entries are heard
  better than exits, and outer voices better than inner ones.
- **App rule** [D]: melody (auto-notes or balls) + bass + one more line = 3. The pad and the pane chord tones should
  be texture, not lines. A new voice should come in on the top or bottom, not in the middle.

### 1e. Melodic contour rules for auto-notes (`autoMelodyNote`)

- **Pitch proximity**: small steps dominate (van Noorden ch. 1, above [P]).
- **Post-skip reversal is mostly regression to the mean**: skips land near the ends of the range, and from there the
  melody can only turn back (von Hippel & Huron 2000, Music Perception 18:59) [S, abstract mirror:
  https://labs.sonicfield.org/library/why-do-skips-precede-reversals-the-effect-of-tessitura-on-melodic-structure].
  Implementation [D]: pull each note toward the centre of a fixed range (a tessitura of about a 10th) rather than
  coding "reverse after a leap". The reversals then come out by themselves.
- **Arch contour**: Huron 1996 ("The melodic arch in Western folksongs", Computing in Musicology 10:3-23) used the
  first / middle-mean / last pitch of each phrase. Convex (arch) phrases were the most common in the Essen collection
  [S, via https://arxiv.org/pdf/2604.13119 and a Spanish replication; percentages not verified].

---

## 2. Fixed timestep, moving colliders, picking

### 2a. Fix your timestep (Glenn Fiedler [P], https://gafferongames.com/post/fix_your_timestep/)

- Loop: `accumulator += frameTime; while (accumulator >= dt) { integrate(state, t, dt); accumulator -= dt; t += dt; }`.
- Draw: `alpha = accumulator / dt; state = current*alpha + previous*(1-alpha)`, with slerp for quaternions.
- Clamp: `if (frameTime > 0.25) frameTime = 0.25`. "Spiral of death": being behind makes the update simulate more
  steps, which puts it further behind. Fixes: leave headroom, or clamp the max steps per frame, which makes the game
  slow down under load.
- Determinism: only a fully fixed dt is reproducible. Across machines, float results match only "yes, if..." (same
  compiler/architecture, strict settings) (https://gafferongames.com/post/floating_point_determinism/) [P]. That
  article says nothing about browsers. For the plugin's Random seed and two identical exports, test exact replay on one
  machine only.
- App [D]: the tank already uses `simTick`/`_tickT`/`_alpha` (CODING_STANDARDS). The tumble integrates with `vdt` in
  `viewTick` (`index.html:6064`). If `vdt` is per frame, the tumble is the one per-frame timebase left. Check it
  against the "never derive a timebase per frame" rule.

### 2b. Moving and rotating colliders, tunneling (Erin Catto, GDC 2013 [P], https://box2d.org/files/ErinCatto_ContinuousCollision_GDC2013.pdf)

- Tunneling: "If you ignore the missed collision you can get tunneling. In this case the ball falls out of the world."
- Choices: ray casts, linear shape casts ("ignores rotation"), conservative advancement ("considers rotation and is
  accurate"), and speculative contacts (risk: "ghost collisions", restitution needs special handling).
- Conservative advancement: "the maximal motion along the distance vector must be less than the distance between the
  shapes ... linear and angular velocities ... radius scalars that are the maximum distance between a point on the
  shape and its centroid". Worst case: halving the gap doubles the iterations, and that can reach "hundreds of iterations".
- Rotation: "the current algorithm can miss some rotational collisions ... 'glancing collisions'". Failure fallback:
  "revert to discrete collision".
- **For a ball inside a convex turning tank** [D]:
  - A wall point at distance r from the spin axis moves `|omega| r` per second. Closing speed per tick is
    `(|v_ball| + |omega| R_max) / 60`.
  - Example: R_max = 300 px, omega = 44 deg/s (0.77 rad/s) gives 3.8 px/tick from the wall, plus the ball's 3.6
    px/tick (ticket 13), so **~7.4 px/tick**.
  - Safe if that is < ball radius + wall thickness. Otherwise substep that tick.
  - A container has one cheap guard a free body lacks: after each tick, a ball with signed distance > 0 to any face
    plane (in the tank's local frame) is outside and can be put back (cf. `sweepBadBalls`).
  - Do the collision in the tank's local frame. Rotate p and v by the inverse tank rotation, and add `-omega x p` to v
    so the wall's motion is included in the bounce.

### 2c. Picking a 3D point under a finger in a turning box

- three.js `Mesh.raycast` moves the ray into object space: `_inverseMatrix.copy(matrixWorld).invert();
  _ray.copy(raycaster.ray).applyMatrix4(_inverseMatrix)`. It first rejects with a bounding-sphere test
  (https://github.com/mrdoob/three.js/blob/dev/src/objects/Mesh.js) [P]. `Raycaster.setFromCamera` takes NDC in
  [-1, 1] [S: docs page index only; signature from source and common use].
- Fast moves: browsers coalesce pointer moves. `getCoalescedEvents()` gives "all un-coalesced position changes"
  (https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents) [P]. Use it for strums across walls.
- Touch latency: commercial devices "can have latency up to 125 ms", and dragging performance falls as latency rises
  (Jota et al. CHI 2013, https://doi.org/10.1145/2470654.2481317) [S, abstract only. The well-known "users notice
  ~1-10 ms" figures from Ng et al. UIST 2012 are **not verified** here].
- **Rule** [D, the same idea as Valve's lag compensation; Valve's wiki page returned 403 so that is unverified]: pick
  against the pose the user *saw*. That is the interpolated matrix of the last drawn frame (the `_alpha` pose), not the
  newest physics pose. At 26 deg/s and r = 300 px a 33 ms mismatch is ~4.5 px; at 225 deg/s it is ~39 px, almost a
  44 px target.

---

## 3. Liquids that read right

### 3a. Physics numbers

- **Inertial coalescence** (Paulsen, Burton & Nagel, PRL 106:114501, 2011, https://arxiv.org/abs/1012.1298) [P]:
  neck radius `r = D0 (gamma A / rho)^(1/4) tau^(1/2)` with D0 ~ 1.62. **Viscous**: `r = C0 (gamma tau / mu)` with
  C0 ~ 1, so the neck grows at the capillary speed gamma/mu. The crossover comes "more than 3 decades" later than the
  old prediction (2 us vs 0.7 ns for salt water). Viscous length `l_v = mu^2/(rho gamma)`.
  Eggers, Lister & Stone 1999 (JFM 401:293; https://arxiv.org/abs/physics/9903017) [S, abstract]: the motion is
  "always viscously dominated at early times".
- **Merge time to a full neck (r = A)** [D from the two laws above]:
  - Inertial: `tau_i ~ 0.38 sqrt(rho A^3 / gamma)`. Water (rho 1000, gamma 0.072 N/m, textbook value, not fetched)
    at A = 1 mm gives **~1.4 ms**; at 5 mm, **~16 ms**. Too fast to see at 60 Hz.
  - Viscous: `tau_v ~ mu A / gamma`. With gamma = 0.07 N/m and A = 1 mm: mu = 1 Pa.s gives **14 ms**, mu = 10 Pa.s
    **0.14 s**, mu = 30 Pa.s **0.43 s**.
  - So a merge that *reads* as slime (100-300 ms, 6-18 ticks) means the goo behaves like a 7-20 Pa.s liquid at mm
    scale. Viscosities for honey or slime are not sourced here; real slime is viscoelastic.
- **Stokes drag** (textbook, Stokes 1851; no URL fetched): terminal speed `v = (2/9) (rho_p - rho_f) g r^2 / mu`.
  Speed goes with **r^2**, so double the size gives 4x the speed. This only holds at low Reynolds number (Re << 1),
  which is the "slow goo" regime. "A big bead slides faster than a small one" (`index.html:4934`) is right, and the
  ratio should be quadratic, not linear.
- Ohnesorge `Oh = mu / sqrt(rho gamma R)` [D, the standard definition; equal to sqrt(l_v/R) from Paulsen]. Oh >> 1
  means a syrupy merge with no wobble; Oh << 1 means fast merges that ring. Slime look = Oh >> 1, so damp the shape
  wobble after a merge.

### 3b. SPH vs particles + metaballs vs screen space

- SPH for games (Muller, Charypar & Gross, SCA 2003, https://diglib.eg.org/handle/10.2312/SCA.SCA03.154-159) [S,
  abstract]: the surface came from point splatting or marching cubes.
- **Marching cubes cost** [P, van der Laan 2009, below]: grid surfaces show "grid discretization artifacts in
  frame-to-frame coherence ... as the grid is static and does not move with the fluid". Rosenberg & Birdwell's
  optimized MC was "real-time performance for up to 3000 particles" and "quite blobby". SPH needs "at least 10000
  particles for the simulation to look realistic". NVIDIA (Green, GDC 2010) calls MC "very expensive"
  (https://developer.download.nvidia.com/presentations/2010/gdc/Direct3D_Effects.pdf) [P].
- **Screen-space fluid rendering** (van der Laan, Green & Sainz, I3D 2009,
  https://wstahw.win.tue.nl/edu/2IV05/andrei/particle_rendering/provided/p91-van_der_laan.pdf) [P]:
  - Pipeline: point-sprite sphere depth, then smooth the depth by curvature flow, then additive thickness, then a
    composite with Fresnel and refraction.
  - Test rig: GeForce 8800GTS 512, 1024x768, **64,000 particles**. Frame times:
    | Smoothing | Corridor | Logo |
    |---|---|---|
    | Bilateral Gaussian | 18.1 ms | 22.7 ms |
    | Quarter res, 15 iterations | **17.5 ms** | 23.3 ms |
    | Half res, 40 iterations | 19.6 ms | 28.6 ms |
    | Full res, 100 iterations | 50.0 ms | 50.0 ms |
    | Foam + noise | 30.0 ms | not given |
  - Half or quarter res "can look better than full resolution from close up". Gaussian filter radius is clamped to
    ~**50 px** in screen space (Green GDC 2010).
- **three.js MarchingCubes addon** [P, https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/MarchingCubes.js]:
  - It runs on the CPU in JS. It allocates `field`, `normal_cache` (x3) and `palette` (x3) Float32Arrays of `size^3`,
    and vertex buffers of `maxPolyCount*3`.
  - `addBall` writes `strength/(r^2) - subtract` into a cube of radius `size*sqrt(strength/subtract)` cells. The
    cost per lump is about (2r)^3 cells.
  - App: `GRES = lite?32:40`, `MarchingCubes(GRES, ..., 90000)` (`tank3d.js:443-446`). At 40 that is 64,000 cells
    and ~1.8 MB of float fields [D]. At 32 it is 32,768 cells. It is rebuilt every frame (lite: every 2nd).
- **WebGL on a phone at 60 fps**: **no primary measurements found**. The app's own `gooMs` counter is the only real
  data. Screen-space rendering needs float render targets plus several full-screen passes. On phones that is
  fill-rate-bound, so quarter-res smoothing (as in the paper) is the only setting likely to fit [D, unverified on devices].

### 3c. How games fake goo (primary material is thin)

- **Portal 2 gel**: the Valve Developer Community wiki says gel "flows out of droppers in blobs, or in packets of blobs
  as bombs". A worldspawn key caps paint blobs, which "should NOT exceed 250"
  (https://developer.valvesoftware.com/wiki/Gel_(Portal_2), https://developer.valvesoftware.com/wiki/Max_number_of_blobs)
  [S: pages returned 403 to fetch; text is from search snippets]. No official account of the renderer internals was found.
- **LocoRoco**: Kouno's concept was soft round creatures "that fall and merge when they collide". The physics load is
  why the PSP was chosen (https://blog.playstation.com/?p=190985, https://mcvuk.com/?p=150026) [S]. No implementation
  details (springs or particles) were found in primary sources.
- **Splatoon**: developer interviews cover ink as gameplay ("dive", not "hide"). Producer Nogami: make spraying "feel
  really really good, including how the ink splashes, looks, and sounds" [S, via news write-ups of Iwata Asks]. No
  rendering technique is published.
- **World of Goo**: no primary technical source found this pass.
- Takeaway [D]: every case caps the blob count (Valve: 250) and sells "liquid" through merge-on-contact, sound and
  surface shading, not through simulation accuracy.

---

## 4. Motion comfort and readability of a tumbling object

### 4a. Rotation speed and sickness

- **Hu, Stern, Vasey & Koch 1989** (Aviat. Space Environ. Med. 60, https://ntrs.nasa.gov/citations/19890051217) [P,
  abstract]: optokinetic drum at 15/30/60/90 deg/s, 60 subjects. "All subjects experienced vection". Symptoms rose with
  speed up to 60 deg/s.
- **Ji, So & Cheung 2009** (Human Factors, https://www.ieda.ust.hk/dfaculty/so/pdf/Ji-et-al-2009-HumanFactors.PDF)
  [P, full text read]:
  - They restate Hu et al. as an "inverted U-shaped relationship", with "VIMS severity peaked when the stimuli
    rotated at 60 degrees per second (dps) in the yaw axis".
  - With vection suppressed, sickness still "increased and peaked in the 60-dps condition". With OKN suppressed, it
    rose monotonically from 0 to 34 dps.
  - Display: a **200 x 50 deg** wide-field screen. Exposures of **30 min**.
- **Diels & Howarth 2013** (Human Factors 55:595,
  https://repository.lboro.ac.uk/articles/journal_contribution/Frequency_characteristics_of_visually_induced_motion_sickness/9346865)
  [S, abstract]: fore-aft optical flow from 0.025 to 1.6 Hz. Sickness peaked at **0.2-0.4 Hz**, and they advise
  avoiding that band.
- **Field of view caveat** [D]: a 6.1" phone at 30 cm covers about 13 x 28 deg. A tank inside it is smaller still.
  The studies above filled 200 deg. They give an upper bound on concern, not a threshold for an object on a phone.
  No primary study of small-FOV object rotation was found.
- **App now** [D, `index.html:6059-6064`]:
  - The upright axis turns 360 deg per `TUMBLE_BARS=8` bars; the second axis is 1/1.618 as fast.
  - In 4/4 that is about 22.5 + 13.9 deg/s (~**26 deg/s** combined) at 120 bpm, and ~**44 deg/s** at 200 bpm.
  - `Math.max(0.2, secBar)` lets it reach ~225 deg/s at absurd tempos.
  - Spin (`rot`) and a flick (`SPINU`) add more on top.

### 4b. WCAG and the OS switch

- 2.3.3 Animation from Interactions (AAA): "Motion animation triggered by interaction can be disabled, unless ...
  essential". Vestibular reactions include "dizziness, nausea and headaches"
  (https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) [P].
- 2.2.2 Pause, Stop, Hide (**Level A**): content that "starts automatically, (2) lasts more than five seconds, and (3)
  is presented in parallel with other content" needs a pause / stop / hide, unless "essential"
  (https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) [P]. The play button covers this if it stops the tumble.
- 2.3.1 Three Flashes (Level A): no more than "three times in any one second". A general flash is a 10% luminance swing
  with the darker state below 0.80, inside an area limit of 0.006 sr (a "341 x 256 pixel rectangle" at 1024x768)
  (https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html) [P]. This applies to the burst
  and to beat-synced wall flashes: 16ths at 120 bpm is 8 Hz.
- `prefers-reduced-motion: reduce` maps to: Windows 11 Settings > Accessibility > Visual Effects > Animation Effects;
  macOS Reduce motion; iOS Settings > Accessibility > Motion; Android 9+ "Remove animations". "Scaling or panning
  large objects can be vestibular motion triggers"
  (https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) [P].

### 4c. Keeping a tumbling solid readable

- Wanger, Ferwerda & Greenberg 1992 (IEEE CG&A 12(3):44) [S, abstract
  https://en-cg-web.coecis.cornell.edu/pubs/1992/WFG92.html]: **shadows and perspective** helped most with *position*
  tasks. **Motion** and orthographic projection helped most with *orientation* tasks.
- Rule for the app [D]: the tumble itself is a depth cue (motion parallax). A cast shadow or contact shadow on a floor
  plane tells you where the ball is. Depth fog (HyperEngine uses `FogInvDist`, below) tells you near from far.
- Nintendo or other first-party game-UI motion guidance: **nothing primary found**.

---

## 5. Non-Euclidean real-time spaces

- **HyperRogue** (Kopczynski, Celinska & Ctrnact, Bridges 2017, https://archive.bridgesmathart.org/2017/bridges2017-9.pdf) [P]:
  - "The game displays its world in the Poincare model by default". Internally it uses the Minkowski hyperboloid.
    Klein (p=0), Poincare (p=1) and Gans are views of the hyperboloid from (0,0,-p).
  - Legibility tools: in the Temple of Cthulhu "every sixth horocycle is marked". The band model shows your whole path
    as one straight band.
  - A loop A->B->C->A leaves "the map ... rotated" (holonomy), and players "quickly learn that it is practically
    impossible to reach a location they have been before". So in curved space a turning tank compounds disorientation.
- Kopczynski & Celinska-Kopczynska 2020, *Real-time visualization in non-isotropic geometries*
  (https://arxiv.org/abs/2002.09533) [P, abstract only]: geodesic rendering of the other Thurston geometries; not needed here.
- **Hyperbolica / HyperEngine** (CodeParade, MIT, https://github.com/HackerPoet/HyperEngine, `HyperEngine.pdf`) [P]:
  - It replaces Unity's "rendering, physics, and coordinate system".
  - Coordinates: "Poincare Coordinates: The primary coordinate system ... used in GyroVectors". Klein is "mostly an
    intermediate step". GyroVectors are "an isometry ... location and rotation", composed with "+".
  - Tile maps are pre-generated offline "for performance reasons ... double-precision".
  - Unity physics is disabled for `WarpCollider`s. There is a global `Fog` / `FogInvDist`, plus draw-distance radii
    in Poincare units.
  - App comparison [D]: `tank3d.js:252` cuts curved faces "flat in Klein coordinates". That matches the HyperEngine
    split: Klein for straight walls, Poincare or gyrovector for motion.
- **Portal rendering** (Kircher & Kohli, Valve, via CS50 "Portal Problems" notes,
  https://cs50.harvard.edu/games/2018/notes/11/) [S, lecture notes of a first-party talk]:
  - Texture approach: "Separate textures per portal view (recursion gets big fast)". Stencil approach: "Renders entire
    frame in the back buffer; no texture memory needed".
  - Recursion is real once: "all further 'layers' ... were fake - merely copies of the second layer".
  - Portals act as "Clip Planes" so a body halfway through draws only one side.
  - The WebGL stencil buffer is "at least 8 bits" when requested
    (https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext) [P]. The app requests
    `stencil:true` (`tank3d.js:23`).

---

## 6. Web Audio performance

- **Render quantum** [P, spec https://webaudio.github.io/web-audio-api/]:
  - `renderSizeHint` "default" means 128 frames. "hardware" lets the UA pick. Integers must be supported from 1 to 6x
    the sample rate (§2.5).
  - `latencyHint` defaults to "interactive" ("lowest audio output latency possible without glitching").
  - New `AudioContext.playbackStats` (`AudioPlaybackStats`) has `underrunDuration`, `underrunEvents` and
    `averageLatency`/`min`/`max`. Browser support is **not verified**; feature-detect it.
- **Budget**: "approximately 2.67ms @ 48KHz" per callback (https://web.dev/articles/profiling-web-audio-apps-in-chrome)
  [P]; "only 3ms at ... 44.1Khz" (https://developer.chrome.com/blog/audio-worklet-design-pattern) [P].
  - Glitch causes: render work over budget; **GC on the worklet thread "synchronously ... can block rendering"**;
    jittery device callbacks (Linux/PulseAudio).
  - In worklet mode the AudioWorklet thread renders everything and "doesn't have real-time priority".
  - Chrome DevTools shows "Render capacity" in % (Web Audio panel).
- **Node churn** [P, Paul Adenot (Firefox Web Audio), https://padenot.github.io/web-audio-perf/]:
  - Source nodes are one-shot: `start()` twice throws `InvalidStateError` "even if the node is no longer running"
    (https://developer.mozilla.org/en-US/docs/Web/API/AudioScheduledSourceNode/start) [P].
  - GainNode: "very cheap to create and connect". Fixed gain is "essentially free" in Gecko; automated gain costs more
    everywhere. He suggests swapping in a fresh envelope gain rather than piling automation onto one param: a 140 bpm
    kick adds "280 events ... by minute", and non-Gecko engines scan event lists linearly.
  - BiquadFilter: "relatively cheap (five multiplication and four additions per sample)", 2 frames of latency.
  - Convolver and HRTF panner: "very expensive". A moving HRTF source can run "four convolvers". Equal-power panner is
    "rather cheap"; StereoPanner is cheaper still.
  - DynamicsCompressor: "fixed look-ahead of six milliseconds".
  - A DelayNode stays alive until its buffer is flushed.
  - Oscillator: wavetables; changing frequency can force "new tables". k-rate params are computed once per 128 frames.
  - Output latency (2013-era numbers): ~10 ms on Windows WASAPI, "a few milliseconds" on macOS/iOS, 30-40 ms on Linux
    Pulse, and Android from 12.5 ms up to **150 ms** on cheap devices.
- **AudioWorklet vs node graph** [P, Chrome blogs above]: a worklet must process "128 frames at a time". WASM
  "generates no garbage". Messaging is "suboptimal for real-time audio" (allocation), so use SharedArrayBuffer plus
  Atomics. A worklet is worth it only if per-note node churn shows up as GC or capacity spikes. The built-in nodes run
  natively and allocate no JS garbage per sample.
- **Measured node or voice limits on mobile**: **no primary measurements found**. Tone.js caps at 32 voices by
  default and drops the extras [P]. Chrome Music Lab used 3+2 voices with no stealing [P]. Measure it ourselves (tests below).

---

## Tests we could write

Each test: what to assert, the number, and where the number comes from. Suite names are suggestions; check
`_dev/SUITES.md` for an existing home first.

1. **Hit-to-note timing** (dev-realaudio style). Over 500 wall hits with beat lock on, |audio onset - grid time| <=
   **3 ms** for 95% and <= **8.3 ms** for every hit. Source: the tick half-period [D]; Hirsh order threshold ~20 ms [S].
   Sabotage: schedule at the tick instead of the analytic hit time; it must fail the 3 ms bound.
2. **Wall flash vs sound**. Visual hit frame vs audio onset (with Sync applied) within **+25 / -100 ms**. Fail if
   sound comes more than **45 ms early**. Source: ITU-R BT.1359-1 [P].
3. **Stream coherence of auto-notes**. Over 300 generated bars, for every consecutive pair with IOI in 100-200 ms,
   |interval| <= **0.15 x (IOI - 100)** semitones in >= 95% of pairs. With IOI < 100 ms, |interval| <= 2 st. Source:
   van Noorden 1975 [P].
4. **Note rate per stream**. In any 1 s window the melody stream (auto-notes plus balls, not drums) has <= **10
   onsets**, and <= **8** when the intervals are random (not stepwise). Source: Schouten via van Noorden [P]; Repp
   100-125 ms limit [S].
5. **Voice count**. At most **3** simultaneous pitched lines that move independently (melody, bass, one comp line).
   The pad and pane chords count as one texture. Source: Huron 1989 [S].
6. **Tessitura pull**. Over 1,000 auto-notes, the share of reversals after a leap of 5 st or more is >= 70%, and the
   pitch stays within one 10th for >= 90% of notes. Source: von Hippel & Huron 2000 [S]. The 70% / 90% targets are
   ours: measure the current generator first, per CODING_STANDARDS.
7. **No tunneling**. 20,000 ticks at max tempo, max flick and 64 balls: **0** balls end a tick with signed distance >
   0 outside any face. Log the max closing speed in px/tick and assert it is < ball radius + wall thickness, or that
   substeps ran. Source: Catto 2013 [P] plus the derivation in 2b.
8. **Spiral of death**. With rendering throttled to 10 fps, sim ticks per real second stay within **+-1%** of 60, or
   the clamp engages (frame time <= **0.25 s**) and ticks per frame stay <= the cap. Source: Fiedler [P].
9. **Tap picks what was drawn**. Pin the clock; with the box at 44 deg/s, a tap at a drawn wall's screen centre hits
   that wall 100% of the time, and the 3D point lies within **2 px** (reprojected) of the drawn surface. Source:
   three.js raycast [P] plus rule 2c [D].
10. **Tumble cap**. Over the whole tempo range, tumble angular speed (both axes, excluding a user flick) <= **45
    deg/s**. Reduced motion means **0**. Source: Hu 1989 / Ji 2009 peak at 60 deg/s [P]; the 45 cap is our judgement.
11. **No provocative pulse**. No camera zoom or dolly oscillation with amplitude > 2% of view size at **0.2-0.4 Hz**
    at any tempo. Source: Diels & Howarth 2013 [S].
12. **Flash rule**. The burst and the wall flashes: count luminance swings >= 10% over a 341x256-equivalent area; <=
    **3 per second**. Source: WCAG 2.3.1 [P].
13. **Pause covers motion**. After stop, tumble, goo and ball motion are still within 1 frame. Source: WCAG 2.2.2 [P].
14. **Droplet merge time**. Measure ticks from first contact to one lump. Median **6-18 ticks** (100-300 ms) and
    stable across tempo. Source: viscous scaling tau_v = mu A / gamma from Paulsen 2011 [P]; the target band is a
    design choice.
15. **Drop speed scaling**. A bead of radius 2r falls or slides at **4x +-20%** the speed of radius r in the slow
    regime. Source: Stokes law [textbook].
16. **Goo budget**. `gooMs` p95 <= **4 ms** on desktop and <= **8 ms** on lite (half of a 16.7 ms frame). Source: frame
    budget [D]; no primary phone numbers exist.
17. **No audio underruns**. On browsers with `playbackStats`, `underrunEvents` delta == **0** over 60 s of the densest
    preset (64 balls, slime on, drums). Otherwise use DevTools render capacity < **70%**. Source: Web Audio spec [P];
    Chrome profiling article [P]. The 70% is our margin.
18. **Node churn bounded**. Live AudioNode count (a test hook counting `create*` minus disconnected) stays below a
    fixed ceiling over 10 min and returns to baseline 2 s after stop. No param carries > 1,000 pending automation
    events. Source: Adenot [P].
19. **Scheduler lead**. Every note's `when` >= `currentTime + 0.005` at the moment it is set, and the scheduler
    lookahead >= the 95th-percentile main-thread stall seen in the run. Source: Wilson [P] (100 ms / 25 ms reference).

## Open / unverified

- **Rozeta "Bounce"** is not found. Particles and Collider exist, but how they time notes is undocumented in reachable
  sources. Bloom, Patatap, Elastic Drums and World of Goo have no primary technical source.
- **Bouncy Notes quantize**: only a third-party blog says it bounces "in time with the DAW".
- **Hirsh 20 ms, Repp 100-125 ms, Huron 3-to-4 voices, von Hippel & Huron, Huron arch**: abstracts or retellings
  only. The full papers were not read.
- **Touch latency thresholds** (Ng 2012 "~1-10 ms"; Jota 2013 tapping numbers) are not verified.
- **Small-FOV rotation sickness**: every number found is for wide-field (~200 deg) displays. No data on children.
- **Portal 2 gel renderer internals, Splatoon ink, LocoRoco soft bodies**: no first-party technical talk was found.
  Valve wiki pages returned 403 to fetch.
- **Mobile Web Audio voice limits and WebGL goo cost on phones**: no primary measurements. Tests 16-18 would produce our own.
- **`AudioContext.playbackStats` / `renderSizeHint` browser support**: in the spec; shipping status not checked.
- **Physical constants** (water surface tension 0.072 N/m, viscosities of honey and slime) are textbook values not
  fetched this pass. Real slime is viscoelastic (shear-thinning), so the Newtonian merge laws are a guide only.
- **Is the tumble on the fixed tick?** `viewTick` integrates with `vdt`. Not traced to see whether that is per frame
  or per tick (2a).

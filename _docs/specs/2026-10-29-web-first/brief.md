# Web first: perfect the tank, the music, the look, the timing

Status: done (grilled 2026-10-29; the spec is `spec.md`, tickets in `issues/`)
Written 2026-10-29 by Cowork from Flah's ask. Facts below were checked in the code (index.html at 7668b1d) or
against the sources listed at the bottom. Anything marked CHECK is not verified yet: measure it before you trust it.

## 1. The ask (Flah, 2026-10-29)
"switch over priority to the website version so we can perfect the actual tank and musical part and visual bugs
smoothed out and to perfection. I want this thing to look so good you'd think Nintendo had a hand in making it.
That intuitive and modern and sleek with high quality audio lossless and rock solid midi timing and versatility for
diff setups. Look into any barriers of the nerdy side that we might come across that we haven't addressed or tested."

## 2. Why the plugin waits
The plugin (`vst/`) is a copy of the web tank's behaviour, checked note for note (`dev-vstparity`, `dev-vstmelody`).
Every change to how the web tank plays after the copy means redoing the copy. So:
1. Perfect the tank on the web (physics, auto-notes, goo, walls, spin, how it sounds and looks).
2. Lock it: rerun `dev-vstparity` and `dev-vstmelody`, commit the new numbers.
3. Then the plugin resumes at tickets 05 / 06 / 07 of `../2026-10-28-tank-headless/`.
Web work that does not touch how the tank plays (lessons, menus, art, copy, layout) never affects the plugin.
The plugin's state is frozen at 7668b1d (tickets 01-04 done, 07 waiting on Flah, 05/06 ready). Do not touch `vst/`.

## 3. Order of work
1. **Grill** (one round, numbered, each with a recommended answer). Questions in section 7.
2. **Measure before changing**: run the barrier checklist (section 5). For each line: is it handled, is there a
   suite that proves it, and what number does it hit on Flah's MSI (Chrome, Windows) and on a phone. Write the
   results into the spec as the "before".
3. **Tank and music fixes**, starting with the wall bug (section 4).
4. **The look and feel pass** (section 6).
5. **Lock the tank** (section 2, step 2), then the handoff says the plugin can resume.

## 4. Known bug to fix first
Spinning closes every open wall. `simTick` calls `rebuild()` each tick while `S.spin` is not 0, and `buildEdges`
makes fresh walls (`broken:false`, `_brokenOrder=[]`). Checked 2026-10-28 in studio, slime on (spin 14):
`breakWall()` opens a wall and 300 ms later it is shut. So the drain never works while the shape turns (play always
turns); the tank fills to 7 balls and stays there. Measured at spin 0 with walls shut: ~16 notes a bar instead of
~7 to 9. Fix: a rebuild keeps each wall's `broken` / `reform` (it already keeps `flash`). This changes how the web
sounds (sparser), so Flah listens before and after, and `dev-vstparity` numbers get rerun (it pins spin 0, so its
stored numbers may not move; check).

## 5. Barrier checklist (things music-app developers hit; most are not tested here yet)

### Timing
- **Scheduling on the audio clock.** Notes must be scheduled on `AudioContext.currentTime` with a lookahead, never
  fired from a timer (web.dev "A tale of two clocks": 25 ms timer, ~100 ms lookahead as a starting point). The
  drums/band already do this (`drumSchedule`). CHECK nothing musical still fires from `setTimeout` (grep shows
  a few little reward chords played note by note with `setTimeout(...,i*90)` / `70*i`; list every one and decide).
- **MIDI out lines up with the audio you hear.** `clockLatch()` maps audio time to `performance.now()` for MIDI
  timestamps, but does not add the output latency (`AC.outputLatency` is read in only 2 places; `getOutputTimestamp`
  is not used). If so, outboard gear plays EARLY by the output latency (tens of ms; far more on Bluetooth). CHECK
  with a loopback recording (MIDI out to a synth back into the line in, or a virtual port), and decide with Flah
  whether to add a MIDI offset setting (DAWs have one).
- **Reported latency lies on Bluetooth.** Browsers do not expose reliable end-to-end latency; Firefox's
  `outputLatency` read less than half the real figure (jefftk measurement). Bluetooth headphones are ~60-120 ms.
  If anything depends on latency (the goo pulse uses it in `beatNow`), a tap-along calibration beats the number.
- **Background tabs.** Chrome runs timers in a hidden tab at most once a second and later on a budget, unless the
  tab is playing audible audio (Chrome blog). The app keeps a worker heartbeat (`update()` every 16 ms while hidden).
  CHECK: 10 minutes hidden, with Chrome's Efficiency mode on, the band and MIDI out stay on the grid (no drift, no
  burst when it comes back).
- **Stuck notes.** A key held while the tab is switched can lose its note-off. CHECK that hiding/blur sends
  note-offs for everything held (MIDI in and out) and that `allNotesOff` runs on `pagehide`.
- **MIDI clock out jitter.** Receivers lock a PLL to the clock; jitter makes them drift (E-RM's measurement:
  even a DAW as clock master gave a beat offset with a 2-3 ms standard deviation and peaks to 9 ms). Our clock out is
  timestamped (`clockSchedule`). CHECK the timestamps' spacing in a long run (a number: standard deviation of the
  tick interval) and the received clock on real gear or a virtual port.

### MIDI devices and setups
- **Permission.** Since Chrome 124 ALL Web MIDI access asks for permission, not only SysEx. A denied prompt cannot be
  asked again from the page: the person has to change site settings. No `SecurityError` handling found in the code:
  CHECK what the app shows when it is denied, and show plain help.
- **Browsers.** Chrome / Edge / Opera yes; Firefox desktop from 108; Firefox Android no; Safari (Mac and iPhone)
  no native support per caniuse. (One 2026 blog claims iPadOS 17.4+ and Safari 18+: unverified and contradicts
  caniuse. Test on a device before saying anything.) The MIDI controls must explain themselves where it is missing.
- **Windows single-client ports.** With older Windows MIDI drivers one app holds a port: if Studio One has the
  keyboard open, the browser may not get it (and the other way round). Windows MIDI Services makes every port
  multi-client and is rolling out to Windows 11 in phases (Microsoft, Feb 2026). CHECK what the app says when a port
  will not open.
- **Hot-plug.** `statechange` is handled in one place. CHECK plugging and unplugging a keyboard mid-song (no crash,
  no stuck note, the menu updates).
- **Audio unlock.** Browsers keep audio silent until a click/tap/key. A session started from a MIDI keyboard may
  be silent until the first click. CHECK and fix the first-note experience.
- **Bluetooth MIDI** adds ~15-40 ms on its own. Say "use USB for timing" somewhere a person will see it, if at all.

### Audio quality
- **Lossless recording is already PCM.** Takes come from an AudioWorklet tap into WAV, not MediaRecorder. Keep it
  that way: MediaRecorder only records PCM in Chrome/Edge 135+ and Safari Tech Preview, Firefox not at all (addpipe).
  CHECK the WAV's bit depth and sample rate (no resampling, the device's own rate, 24-bit or 32-bit float) and that
  "lossless" is only claimed where it is true.
- **Glitches (crackles).** At 48 kHz the audio thread has ~2.67 ms per render quantum; garbage collection and too many
  nodes are the usual causes (web.dev profiling guide). The synth makes new nodes per note. CHECK on the MSI and a
  phone with Audion / about://tracing at the worst case (12 balls, band, full goo): render capacity and underruns, as
  numbers.
- **iPhone silent switch.** iOS Safari mutes Web Audio when the ringer switch is on silent; `<audio>` elements still
  play. No handling found (`navigator.audioSession` is not used; it is experimental per MDN). The known workaround is a
  looping silent `<audio>` started on the first tap. CHECK on a real iPhone; a kid with a muted phone hears nothing.
- **Clipping.** The master clamps at 0.891 and `dev-ceiling` exists. CHECK true peak on a WAV export of the loudest
  kit, not only the live meter.

## 6. "Like Nintendo had a hand in it" (what that means in checks, not adjectives)
From Nintendo's own talk on the Switch menu (CEDEC 2018): simple rows and grids; a sound paired with every movement;
animations as short as possible while still felt; fewer confirm steps; text where an icon is unclear; remove
friction before adding delight; a light, instant home screen. Sakurai on hit-stop: a brief freeze on contact
makes a hit feel more forceful. Turn these into measured rules for the spec:
- Every tap answers with sight AND sound within one frame of the input (assert time-to-sound, as `dev-hands` does).
- No dropped frames on the MSI at 120 Hz and on a mid phone at 60 Hz during the worst case (a number per device).
- One motion language: the same easing and durations everywhere (list them, then enforce in a suite).
- No layout jumps (CLS-style check on every room change).
- Nothing new is drawn as flat vector glyphs: the crayon art stays (standing rule). Ask before changing art direction.

## 7. Questions for Flah (the grill)
1. Ticket 07 (plugin goo too slow): A chop the goo work across audio blocks (recommended) / B a helper thread.
   Only needed when the plugin resumes; record the answer now.
2. Reverb for the plugin: real-room recording (convolution) / math room (algorithmic) / later.
3. The wall bug (section 4): fix it so walls stay open while spinning? Recommended yes; it makes the tank sparser.
4. What does "perfect" mean for the tank to you, in plain words: what bugs you today when you play it? (list them)
5. Your setups to test against: which phone(s), browser(s), MIDI keyboard / interface, headphones (wired or
   Bluetooth), and do you run Studio One and the website at the same time with one keyboard?
6. MIDI out offset: add a setting to nudge MIDI earlier/later to line up with outboard gear? Recommended yes, if the
   loopback test shows an offset.

## Sources
- https://web.dev/articles/audio-scheduling (lookahead scheduling)
- https://developer.chrome.com/blog/background_tabs (timer throttling, audible-audio exemption)
- https://developer.chrome.com/blog/web-midi-permission-prompt (Chrome 124 permission)
- https://caniuse.com/midi (browser support)
- https://www.jefftk.com/p/browser-audio-latency (measured latency, unreliable reported latency)
- https://web.dev/profiling-web-audio-apps-in-chrome (render capacity, GC glitches)
- https://blog.addpipe.com/record-high-quality-audio-in-safari-with-alac-and-pcm-support-via-mediarecorder/
- https://developer.mozilla.org/docs/Web/API/AudioSession/type ; https://adactio.com/journal/19929 ;
  https://www.audjust.com/blog/unmute-web-audio-on-ios (iOS silent switch)
- https://www.e-rm.de/data/E-RM_report_Jitter_02_14_EN.pdf (MIDI clock jitter; written by a clock vendor)
- https://blogs.windows.com/windowsexperience/2026/02/17/making-music-with-midi-just-got-a-real-boost-in-windows-11/
- https://midee.app/blog/playing-your-midi-keyboard-in-the-browser/ (Bluetooth MIDI, stuck notes; its Safari claim
  is unverified)
- https://nintendowire.com/news/2018/08/22/nintendo-talks-about-the-design-of-the-switchs-os-at-cedec-2018/
- https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/

## 8. Grill answers (2026-10-29)
4. Flah: the tank must turn in 3D "enough", the notes must interact in 3D, and non-euclidean spaces must be in the
   mix. Clean up weird visual clutter, bugs and redundant tank controls in studio settings.
   Facts checked in the code: a flat shape (the default hexagon) is a 2D polygon plus depth between the two panes
   (balls have z, the panes play chord tones). A solid (cube, icosa...) in 3D view already runs real 3D physics:
   every face is a plane, a ball reflects off it in 3D and plays its note (`solidSub`, `solid3D()`); only 2D view
   uses the solid's middle slice. (Corrected 2026-10-29: round 2 first said a solid was always a slice.) The 3D look is the spin plus a
   view lean of 17-37 degrees that breathes over 32 bars (`viewTick`, TILT 0.3 + 0.34 swing). Non-euclidean spaces
   (portal, curved) only come in on their own in play, on 1 reform in 3 (`rollSpace`); studio on auto is always
   normal (`index.html` rollSpace, and the mode switch at the `auto only mixes spaces in play` line).
5. Flah: phone + PC; Chrome and Safari; standard MIDI keyboards (KeyStep 37 class); phone speaker or PC direct, line
   in, sometimes Bluetooth. Studio One runs separately for now. Wants MIDI devices to work from the web, iPad too.
   Fact: no iPad/iPhone browser has Web MIDI (caniuse: iOS Safari unsupported through 27.2; every iOS browser is
   WebKit). Workaround apps exist (e.g. "MIDI Web Browser"). Sources: https://caniuse.com/midi ,
   https://www.supersimplepiano.com/blog/web-midi-browser-compatibility-2026 (vendor blog, secondary).

Round 2 (Flah): 1 yes (ADR 0009). 2 yes (ADR 0010). 3 yes. 6 yes, merged with 10 into one Sync setting. 7 yes, a
test page first; Flah compares it with today before anything is committed. 8 yes, but only while the slime is on; a
shape or space picked by hand stays put. 9 no explainers: "just make the options available and make sure the shit
actually works as intended" (ADR 0011). 10 yes. 11 yes: screenshots and a proposal first, nothing removed until OK'd.

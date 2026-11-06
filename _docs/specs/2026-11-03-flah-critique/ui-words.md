# The app's words against the standard ones (critique ticket 15)

Flah (2026-11-04): "we arent reinventing the wheel, just making industry and theory standard stuff easy to understand".
Each row: the word the app shows, the word DAWs or theory books use, where the app shows it, and what was done.
Checked 2026-11-04 against the shipped labels (`index.html` titles and buttons, `learn2.js` LANG).

Sources:
- [A] Ableton Live 12 manual: Arrangement View (6.1 "beat-time ruler ... bars-beats-sixteenths", 6.3 "transport
  controls", "insert marker", 6.6 "loop brace"), https://www.ableton.com/en/manual/arrangement-view/ ; Editing MIDI
  (10.2.1 "grid snapping", 10.5.11 "Quantize", 10.5.12 "Velocity Editor", 10.1 "piano ruler", 10.6 "Scale Mode"),
  https://www.ableton.com/en/manual/editing-midi/ ; Mixing (18.1 "Volume", "Pan", "Track Activator ... mute",
  "Solo"), https://www.ableton.com/en/manual/mixing/ ; Recording (19.4 "metronome", 19.6 "count-in"),
  https://www.ableton.com/en/manual/recording-new-clips/
- [F] FL Studio manual: Channel Rack ("Each button (step) in the grid represents a 16th note", "pattern", "swing"),
  https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/channelrack.htm ; toolbar ("Tempo ...
  BPM", "Metronome ... Plays a click at each beat", "Recording Count-in", "Play/Pause", "Stop", "Record"),
  https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/toolbar_panels.htm
- [L] Logic Pro User Guide, Step Sequencer: rows for "drum kit pieces", a "step grid" where "active steps play the
  sound in their row header", patterns of 12-64 steps,
  https://support.apple.com/guide/logicpro/step-sequencer-overview-lgcp39acefc9/mac
- [T] Open Music Theory / Puget Sound Music Theory for the 21st Century (chapters 1.1 Pitch, 1.3 Octave Registers,
  2.2 The Major Scale, 3.1 Minor Scales, 4.1 Time Signature, 4.2 Durational Symbols, 4.4 Meter, 5.1 Intervals,
  6.1 Triads, 8.1 Seventh Chords), https://musictheory.pugetsound.edu/mt21c/MusicTheory.html

| Concept | App word now | Standard word | Where | Done |
|---|---|---|---|---|
| tempo | tempo (BPM) | Tempo, BPM [A][F] | header knob, studio | same |
| beat / bar | beat, bar, "beats in a bar" | bars-beats-sixteenths [A]; meter, time signature [T] | studio ruler, learn | same; lessons end naming bar and time signature |
| step grid | step sequencer, grid, step | step grid, steps, rows [L]; Channel Rack steps [F] | studio step grid, learn Copy the Beat | same; learn's rhythm lessons now use one (tickets 09, 11) |
| row per drum | kick, snare, hi-hat... | rows for drum kit pieces [L] | studio, learn | drum colour code: kick purple, snare red, hi-hat yellow, both places |
| playhead | (a lit step) | insert marker [A] ("playhead" in other DAWs: not checked here) | studio, learn | learn's grids now have one (tickets 09, 11) |
| loop | loop, "Make a Loop" | loop brace, looping [A] | learn | Make a Loop ends on LOOP |
| quantize | quantize ("snap notes onto the beat") | Quantize [A] | studio | same |
| grid size | grid ("how the bar is divided") | grid setting 1/16 [A] | studio | same; Two in One Beat ends on "a step grid set to 1/8" |
| swing / groove | swing, Groove ("human feel") | swing [F]; Groove Pool [A] | studio | same |
| velocity | **loudness** (step mode) | Velocity, Velocity Editor [A] | studio step grid | **changed to "velocity"** (same width, 8 letters); Loud or Soft ends on VELOCITY |
| chance | chance | note probability (Live 11+ calls it Chance: UNVERIFIED, not in the manual pages read here) | studio step grid | same |
| metronome / count-in | count-in in learn | Metronome, Count-in [A][F] | learn | every rhythm round counts in 4 3 2 1; Steady Beat ends on METRONOME |
| transport | play / pause, record | Play/Pause, Stop, Record [F]; transport controls [A] | header | same |
| mixer | mixer, mute, solo, volume | Volume, Pan, Mute (Track Activator), Solo [A] | studio | same |
| triangle mixer | melody / drums / band corners | (no DAW equivalent) | play, studio | kid-friendly control, kept: it is a three-way balance, which a fader set cannot show in one gesture |
| key / scale | key, scale, scale lock | key [T]; Scale Mode [A] | header, studio | same |
| octave | octaves (tank span) | octave [T] | studio | same |
| pitch up | High and Low, the ladder | piano ruler, higher notes higher [A] | learn | High and Low ends on "In a piano roll, higher notes sit higher up" |
| note length | quarter, half, whole... | durational symbols [T] | learn How Long | ends on DURATION and the piano roll's longer bar |
| chord | chord, 7th, maj7, m7, add9, sus4 | triads, seventh chords [T] | chord chip | names added in ticket 03 |
| slime / auto-notes | slime, notes | (no standard word: an auto-jammer) | play, studio | app's own words, kept: they name the app's own feature (glossary) |
| band | band | (accompaniment) | play, studio | kept: plain and a kid can read it |

Kid-friendly words that stay, and why: "slime" and "notes" name features no DAW has; "band" is plainer than
"accompaniment"; the triangle mixer has no DAW twin. Everything a DAW has uses the DAW's word.

# Step sequencer: SQ-1 layout, macros, arp and scale lock, for a kids' 2x8 sequencer (2026-11-07)

Research only. No code was changed. Words follow `_docs/GLOSSARY.md`. Tags: **[P]** primary source (manual or the
maker's own page), read this pass; **[S]** secondary, used only to find a primary; **[D]** my own derivation or
judgement from the cited numbers (check it). **UNVERIFIED** = I looked and could not confirm. App facts are from
`index.html` at commit `46a7879`.

## TLDR

1. **Korg SQ-1** = 2 rows (A, B) x 8 steps, one knob and one button per step, **8 sequencer modes**: ALTERNATE,
   ORDER (A then B = 1x16), PARALLEL TURN (both rows, reverse at the last step = pendulum), PARALLEL ORDER, CV/DUTY
   (B row = gate length of A), CV/SLIDE (B row = glide of A), CV/DUTY RANDOM, RANDOM [P]. Step buttons do one of four
   jobs: **GATE ON/OFF, ACTIVE STEP (skip), SLIDE, STEP JUMP** [P]. Step resolution 1/4, 1/8 or 1/16 [P].
   Scale: **LINEAR, MINOR, MAJOR, CHROMA** per row [P]. MIDI: notes **48-108**, velocity fixed at **64** (0x40) [P].
   No swing, no probability, no ratchet [P, by absence]. Over MIDI, SLIDE does nothing and LINEAR acts as CHROMA [P].
2. **Behringer's newest step sequencer** is the **BCR32** (on sale Sept 2026 per a retailer [S]; manual dated
   2026-04-06 [P]): 32 encoders, one per step, 4 tracks, a mode button remaps all 32 knobs to **pitch / velocity
   (0-127, default 100) / mute / delay (-5..+5) / length / skip** [P]. Directions **Forward, Backward, Pendulum,
   "Pip 0" (pendulum repeating the end steps), Random** [P]. Non-destructive **scale lock**, 14 scales + user [P].
   No per-step probability documented. Newest keyboard-sequencer: **JAM** (2026): ratchet **2-4**, gate
   **10/20/40/60/80 %**, swing **off or 54-80 %**, arp up/down/up-down (+1 octave)/as played/random, 30-240 bpm [P].
   Newest classic clone: **BQ-10** (SQ-10 clone, 2x8 + 8, 8 run modes, 20-500 bpm) [P].
3. **Probability** is 0-100 % per step everywhere it exists: KeyStep Pro (0-100 %), Ableton Live (0-100 %, arrows
   step 10 %), Behringer RS-9 (0-100 %), Korg SQ-64 (**100 % down to 5 %**, plus "every Nth cycle") [P].
4. **Timing shift** per step is about **+/-50 % of a step** in three products: KeyStep Pro **-49..+50 %**, SQ-64
   **-50..+49 %**, Studio Pro Pattern "Delay" **+/-50 %** [P]. Ableton's Humanize moves notes **up to 1/4 of a grid
   division** either way [P]. That quarter-step is the right "humanize" ceiling; +/-50 % is an edit, not a feel [D].
5. **Ratchet / repeat** counts: JAM **2-4**, Crave **up to 4**, SQ-64 **2-16** with FLAT / DOWN / UP velocity
   shapes, Studio Pro repeats spaced **equally inside one step** (4 repeats on 1/16 = four 1/64s) [P].
6. **Arp conventions**: up, down, up-down with and without repeated end notes (Arturia "Inclusive" / "Exclusive"),
   random, as played; octave range **1-4** (KeyStep up to 4, KeyStep Pro -1..+3, JAM +1); gate **10-90 %**
   (KeyStep) [P]. Swing on Arturia: **50 % (straight) to 75 %** [P].
7. **Scale lock** comes in two kinds: quantize the knob as it turns (KeyStep Pro pitch encoder steps "only through the
   notes that belong to the scale"; SQ-64 quantizes the sequence) and **non-destructive** remap (BCR32: "programmed
   notes ... temporarily adjusted", reversible) [P]. The app's scales are in cents and the key moves on its own, so
   store steps as **scale degrees** and remap live [D].
8. **Studio Pro** (Studio One was renamed; manual v8.2) Pattern Editor has **Velocity / Repeat / Delay /
   Probability** lanes you drag across in one gesture; Gate **100 % default, 200 % max**; Accent **30 % default**;
   Steps **2-64** [P]. Ableton Live has per-note **Chance** and a **Velocity Deviation** range picked fresh on every
   play [P].
9. **Proposal (section 6)**: one knob per step that is pitch, or loudness after a "pitch | loud" switch (BCR32's
   pattern); rows play as **A, A->B (16), or A/B every other pass**; direction **forward / back / bounce / wander**,
   where wander is Arturia's 50/25/25 walk; **arp reuses the direction control** and pulls pitches from the chord
   brain. Four macros, each 0-100 %: **chance** (off-beats down to 40 %, beats to 70 %, step 1 never drops),
   **humanize** (up to +/-25 % of a step and at most +/-30 ms, velocity +/-24), **wander/mutate** (up to 25 % of
   steps move +/-1..2 scale degrees for that pass only), **repeat** (up to 35 % of steps ratchet x2..x4, each hit
   at least 30 ms apart).
10. Every macro number in section 6 is a judgement inside the documented hardware ranges, not a measured kid
    preference. It needs one listen and a generator check (a few hundred passes, statistics) before shipping.

---

## 1. Korg SQ-1 (2x8 analogue/MIDI step sequencer, 2015)

Sources:
- Owner's Manual, multi-language foldout, dated 2024-11-07 on the download page, "Published 03/2024" in the print
  footer [P]. License page: https://www.korg.com/us/support/download/manual/0/436/2017/ ; file:
  https://cdn.korg.com/us/support/download/files/bbfeff342894daac1ecf1c3e087b5b67.pdf (English section, "The SQ-1's
  controls, connectors, and functions").
- FAQ / Tips PDF [P]: https://www.korg.com/us/support/download/manual/0/436/2303/ (file
  https://cdn.korg.com/us/support/download/files/8b8a7a7cd058590597aa8f8812e28cd3.pdf). It names the mode icons.
- MIDI Implementation rev 1.00, 2015-02-27 [P]: https://www.korg.com/us/support/download/manual/0/436/2726/
- Specifications page [P]: https://www.korg.com/us/products/dj/sq_1/specifications.php

**Layout.** The product page calls it "a compact step sequencer with 2 x 8 steps" [P, korg.com product page]. Manual:
"Step knobs: These specify the value for each step of channel A and channel B." "Step buttons: These edit the
parameter that's specified by the MODE button." Global knobs: **SPEED** ("Controls the speed at which the sequencer
runs") and **DUTY** ("Adjusts the duty cycle of the gate signal. Higher values make the notes sound longer.") [P,
manual]. The manual prints the modes as icons; the FAQ gives the names [P, FAQ "When I connect the SQ-1 via SYNC..."].

**Sequencer modes** (manual text, FAQ names) [P]:

| Mode | Manual says |
|---|---|
| ALTERNATE | "Channel A and channel B run alternately in units of one step" (A1 B1 A2 B2...) |
| ORDER | "The steps run in the order of channel A -> channel B" (one 16-step line) |
| PARALLEL TURN | "Channel A and channel B run in parallel, and reverse direction at the last step" (pendulum) |
| PARALLEL ORDER | "Channel A and channel B run in parallel" (two 8-step lines) |
| CV/DUTY | "Only channel A runs ... Use channel B to control the duty cycle of the gate signal" |
| CV/SLIDE | "Only channel A runs ... Channel B controls how smoothly the values for each step of channel A are connected" |
| CV/DUTY RANDOM | "The steps of channel A run randomly ... Use channel B to control the duty cycle" |
| RANDOM | "The steps of channel A and channel B run randomly" |

So on the SQ-1, row B is either a second melody, the second half of a 16-step line, or a per-step **gate length** /
**glide** lane for row A. The spec page lists them as "ALTERNATE, ORDER, PARALLEL TURN, PARALLEL ORDER, CV/DUTY,
CV/SLIDE, CV/DUTY RADOM [sic], RANDOM" [P].

**Step modes** (MODE/CLEAR button cycles them) [P, manual]:
- GATE ON/OFF: "Steps that are off (button unlit) do not output a signal ... during playback." (a rest)
- ACTIVE STEP: "Steps that are off ... are disabled, and are excluded from the sequence." (a skip: the loop gets shorter)
- SLIDE: "If this is on (button lit up), the pitch or value changes smoothly from one step to the next."
- STEP JUMP: "If the sequencer is running, pressing a step button will cause the sequencer jump immediately to that
  step. If the sequencer is stopped, pressing a step button ... makes the sequencer start running from that step."
- Reset (FUNCTION + MODE): "GATE ON/OFF: all steps on, ACTIVE STEP: all steps on, SLIDE: all steps off".
- FAQ tip: with STEP JUMP, holding a stopped step's button sounds that step while you turn its knob [P, FAQ "Tips"].
  That is the "hold a step to hear it while tuning it" gesture.

**Gate time.** One global DUTY knob, or per step from row B in CV/DUTY modes ("the setting of this knob is ignored,
and the duty cycle is controlled by channel B") [P, manual]. No numeric range given. **UNVERIFIED.**

**Tempo / clock.** SPEED knob; the bpm range is not in the manual, FAQ or spec page. **UNVERIFIED.** Step resolution
"quarter notes, eighth notes, sixteenth notes" set at power-on [P, manual "Sequence step resolution"]; factory
"8th note / SYNC X2" [P, FAQ]. SYNC OUT is "a 5V pulse that's 15 ms long at the beginning of each step" [P, manual].
It receives MIDI clock/start/stop over USB and sends clock when master [P, MIDI Implementation 1-2, 2-2].

**Swing.** Not mentioned anywhere in the manual, FAQ or spec page. The SQ-1 has no swing [P, by absence].

**Scale / quantize.** Per row, "CV A BEHAVIOR, CV B BEHAVIOR": "LINEAR: ... output without any adjustment. MINOR:
... adjusted to a minor scale ... MAJOR: ... adjusted to a major scale ... CHROMA: ... adjusted to a chromatic
scale" [P, manual]. Factory: LINEAR [P, FAQ]. The knob's range is set by CV RANGE 1 V / 2 V / 5 V (= 1, 2, 5
octaves) or 8 V Hz/V (= 3 octaves) [P, FAQ "The CV RANGE 1V, 2V, and 5V correspond..."]; factory 1 V, i.e. **one
octave per knob sweep** [P, FAQ factory settings].

**MIDI.** Note On is sent with **velocity 0x40 (64)**, note range **kk: 48 ~ 108** [P, MIDI Implementation 1-1].
There is no per-step velocity. Row B transmits on MIDI channel A+1 [P, FAQ]. "Even if CV BEHAVIOR is set to LINEAR,
the MIDI OUT operates the same as the CHROMA setting" and "the SLIDE parameter is not used for MIDI OUT" [P, FAQ].

**What a web toy should take from it [D]:** knob-per-step is the whole UI; mode switch, not menus; rest (gate off)
and skip (active step) are different things, and kids need only the rest; ORDER and PARALLEL TURN are the two modes
with an obvious musical meaning (one long line; bounce).

## 2. Behringer: which sequencer is newest, and what it does

Candidates found (2025-2026), newest first:
- **BCR32** (4-track, 32-encoder controller/sequencer, ZAQ Audio "Zaquencer" firmware). Manual file is dated
  2026-04-06 [P]. Retailer listings say "available since September 2026" (Thomann) and "estimated December 2026"
  (Sweetwater) [S]. Product page: https://www.behringer.com/en/products/0715-AAW
- **JAM** (32-key controller with a 64-step polyphonic sequencer and arp; page footer "(c) 2026"; launch date not
  on the page). https://www.behringer.com/en/products/0715-AAU [P]. A follow-on to SWING [S, dubspot].
- **BQ-10** (Eurorack clone of the Korg SQ-10; announced Nov 2025 [S, musicradar/synthanatomy]).
  https://www.behringer.com/en/products/0718-ABC [P]
- Not dedicated sequencers: STEPS (Stages clone, Jan 2025), D Mini, Mini Pops 7 (synths/drums with sequencers) [S].

I could not find a Behringer news page that ranks these by date. **"BCR32 is the newest" rests on the manual date
plus retailer dates. Treat it as likely, not proven.**

### 2.1 BCR32 (the closest match to "a knob per step")

Manual: https://cdn-media.empowertribe.com/611d8696b95f80f8c46dbecd816d0b65/Manual_BE_0715-AAW_BCR32_A4_WW_2026-04-06_Rev1.pdf
(English, "ZAQ MODE" pp. 18-20 and "ZAQ GLOBAL" pp. 20-22) [P].

- **Encoder workflow.** "Each encoder (25-56) represents a step in the sequence from step 1 (encoder 25) to step 32
  (encoder 56)." Mode buttons remap all 32 encoders at once: NOTE PITCH, NOTE VELOCITY ("Default is 100. Range is
  0-127."), NOTE MUTE (toggle), NOTE DELAY, NOTE LENGTH, MIDI CTRL 1/2, CHORD, STEP SKIP, SEQ START, SEQ LENGTH,
  SEQ OFFSET [P, ZAQ MODE 5-17]. Holding EDIT/GLOBAL while turning any encoder "will adjust all steps until they
  reach their maximum or minimum value" (a global offset) [P].
- **Delay (micro-timing).** "at center there is no delay; turning the encoder counter-clockwise (CCW) introduces a
  negative delay (-1 to -5), which would put the note ahead of the beat, while turning it clockwise (CW) introduces
  a positive delay ... (1 to 5)" [P, item 8]. The size of one unit is not stated. **UNVERIFIED.**
- **Length.** 16 values from 96th notes to 4 beats, default 32nd [P, item 9].
- **Direction.** "Forward (default), Backward, Pip 0 (Pendulum with first and last steps repeated), Random,
  Pendulum" [P, item 20].
- **Shuffle.** Even steps or odd steps, values 0/16/33/50/66/83 [P, item 19] (units not stated).
- **Scale lock.** Off (default), User, Major, Minor, Dorian, Phrygian, Lydian, Mixolydian, Locrian, Whole Tone,
  Minor 7th, Diminished 7th, Octatonic W-H, Octatonic H-W, Major Pentatonic, Minor Pentatonic, ... ; base note C-B.
  "SCALE and SCALE BASE are usually non-destructive to notes that are programmed. Instead, they cause the programmed
  notes to be temporarily adjusted to the selected scale and base." A two-button combo makes it permanent [P, ZAQ
  GLOBAL 30-31].
- **Random.** A WAVE GEN (random, sine, triangle, saw, ramp, rectangle; gain 0-100, rate 1-32) can be applied to
  pitch, velocity, mute, delay or length [P, item 12]. That is its "mutate". Drum tracks: hold INST SEL + WAVE GEN
  puts a drum "on random steps" [P].
- **Ratchet.** Only as a per-track assignable MIDI-control lane ("off, delay, ratchet, program change ...") [P, ZAQ
  GLOBAL 49-56]; count range not stated. **UNVERIFIED.** Note Repeat in the mixer: 96th to 1/4 notes [P].
- **Not documented:** per-step probability, accent, slide, arpeggiator. Tempo 30-300 bpm [P, ZAQ GLOBAL 25].
- The product page adds: "Each of four tracks takes pitch, velocity, length and timing for every step." "Playback
  can run backward, as a pendulum or at random." "A scale setting keeps the notes in key." [P, product page]

### 2.2 JAM (keyboard + 64-step sequencer + arp)

All from https://www.behringer.com/en/products/0715-AAU [P]; no manual was posted there this pass.
- "Sequence up to 64 steps"; "64-step polyphonic sequencing".
- Arp/sequence orders: "up, down, up and down, each with an optional additional octave, notes in order played or
  random".
- "Set a ratchet count of two to four on any step."
- Gate: "the first five keys set gate length to 10%, 20%, 40%, 60% or 80%"; "pressing 10% and 20% together introduces
  a random gate".
- Swing: "off or one of ten values from 54% to 80%".
- "TEMPO sets sequencer and arpeggiator tempo from 30 to 240 bpm"; note values "1/4 note to 1/32 note triplet".
- Not on the page: probability, accent, slide, scale lock (only a chord memory).

### 2.3 BQ-10 (SQ-10 clone: the SQ-1's big ancestor)

Product page (above) and Quick Start Guide
https://cdn-media.empowertribe.com/5568fe1d07f4493cba5ee9c696526e8b/QSG_BE_0718-ABC_BQ-10_WW.pdf, English p. 17 [P]:
- Rows A and B, 8 steps each, plus row C (8 steps of CV). Clock "from 20 bpm to 500 bpm". PORTAMENTO A/B knobs,
  one DUTY knob.
- SEQUENCE MODE, 8 positions: 1 Loop reverse stepped ("Sequence A steps followed by sequence B in reverse order"),
  2 Continuous reverse ("A in normal order, B in reverse"), 3 Three channel, 4 A/B Single Stepped, 5 A/B Continuous,
  6 A/B Single ("Sequence A runs, followed by B then stops"), 7 A/B Alternate ("Plays step 1 from A, then step 1 from
  B, then step 2 from A etc."), 8 Random ("Plays steps at random from A and B").
- No probability, ratchet, accent or scale lock (it is an analogue CV design) [P, by absence].

### 2.4 Other Behringer pages that fill the gaps
- RS-9 drum sequencer: per-step probability "from 0% (will not trigger) to 100% (will always trigger)"; "Put a
  ratchet on any step"; flam; accents [P, https://www.behringer.com/en/products/0720-ACY].
- Crave: "ratchets that split a step into up to 4 hits"; arp "plays them in one of 8 orders"; "Play a pattern in
  reverse"; glide time 0-2 s [P, https://www.behringer.com/en/products/0718-AAJ].

## 3. DAW editors: Studio Pro (ex-Studio One) and Ableton Live

### 3.1 Fender Studio Pro 8.2 Pattern Editor

`s1manual.presonus.com` now 301-redirects to `fenderstudiopromanual.fender.com`; the page says Fender Studio Pro
version 8.2 [P]. Page: https://fenderstudiopromanual.fender.com/en/Content/Editing_Topics/Patterns.htm

- **Lanes.** "Along the top of this Automation window are the Velocity, Repeat, Delay, and Probability buttons."
  "You can adjust the columns individually or drag the cursor across the row and edit many of them in a single
  gesture." (Section "Velocity, Repeats, Delay, and Probability") [P]. That is one bar per step and one lane per
  property, picked by a button: the same pattern as BCR32's mode buttons.
- **Repeat.** "the number of repeats to apply to each note in the selected lane"; "All repeats on a note are spaced
  equidistantly within the span of the note resolution of the Pattern"; "a value of 4 repeats on a note in a pattern
  with 1/16th-note resolution results in four 1/64th-notes being played." Maximum not stated: **UNVERIFIED**
  (a third-party guide says 2-8 [S], not used).
- **Delay (humanize).** "This is a great way to humanize a Pattern: Click the Delay button and select a value between
  +/- 50% for one or more Steps." A negative delay cannot apply to the first step [P].
- **Probability.** "the percentage of probability that each note in the selected lane will play"; "Lower settings
  cause notes to be canceled in greater numbers, creating interesting variations" [P]. Range not printed
  (percentage implies 0-100) [D].
- **Pattern-wide settings.** Steps "between 2 and 64"; resolution 1/2 to 1/64 incl. triplet/dotted; Swing default 0 %;
  Gate "Defaults to 100% ... with a maximum value of 200%"; Accent "Defaults to 30%" [P, "Creating Patterns"].
- **Variations.** "Each Pattern can hold an unlimited number of Variations ... different note data, and ... differing
  Step lengths and note resolutions." [P] Variations are made by hand; nothing generates them.
- **Operations.** "Shift Lane: Shifts the notes ... to the right by one step ... the notes re-appear on the left
  side." "Fill Lane: Adds notes to every available step" [P].
- **Note editor actions** (https://fenderstudiopromanual.fender.com/en/Content/Editing_Topics/Action_Menu.htm) [P]:
  Randomize Notes ("a variable amount of pitch, velocity, or note length randomization", can follow a chosen
  Scale); Thin out Notes (Simplify "deletes notes that are less aligned to the grid first. Notes on the first beat
  of a measure are deleted last"; Randomly delete; Grid); Fill with Notes; Apply Scale. The page gives no numeric
  ranges. **UNVERIFIED:** the slider ranges.

### 3.2 Ableton Live 12 MIDI editor and MIDI effects

https://www.ableton.com/en/manual/editing-midi/ [P]
- **10.5.13 Editing Probabilities**: "To change a MIDI note's probability value between 0-100%, click and drag on the
  note's probability marker"; arrow keys change it "+/-10%"; probabilities can be randomized within a range (example
  "will range from 25-75%"). **10.5.13.1 Probability Groups**: "Play All" and "Play One" ("only one note in the group
  is played at a time").
- **10.5.12 Editing Velocities**: "The Velocity Deviation slider can be used to set a range for each note's velocity.
  Velocity values are then chosen randomly from within the specified range each time a note is played." Positive and
  negative values are allowed. Randomize button: "randomly increased or decreased by a value between zero and the
  number shown in the slider".
- **10.5.9.7 Humanize**: "adds a variation to note starts times", "up to a quarter of a grid division before or after
  the original note position".
- **10.5.9.2 Fit to Scale**: "Notes are adjusted to the closest scale degree".

https://www.ableton.com/en/manual/live-midi-effect-reference/ [P]
- **30.1 Arpeggiator**: styles include Up, Down, Converge, Diverge, Play Order, Chord Trigger, Random, Random Other,
  Random Once; "Gate values above 100% result in notes that overlap"; Distance "sets the transposition in semitones
  or scale degrees"; Steps "how many times the pattern is transposed"; Retrigger Off / Note / Beat.
- **30.6 Random**: Chance "how likely it is that an incoming note's pitch will be randomly altered"; "Choices ...
  ranging from 1 to 24".
- **30.8 Velocity**: "a Random value of 50 shifts the velocities up or down by up to 50".

## 4. Arpeggiator and scale-lock conventions in hardware

**Arturia KeyStep** (manual v1.1.2, https://dl.arturia.net/products/keystep/manual/KeyStep_Manual_1_1_2_EN.pdf) [P]:
- "eight arpeggiator Modes: Up, Down, Inclusive, Exclusive, Random, Order, Up x2, and Down x2" (sec. 2.2.2, p. 13).
- Inclusive: "low to high, then from high to low, repeating the high note and low note"; Exclusive: the same
  "without repeating the high note and low note" (5.3.4-5.3.5, p. 34). Random can be "totally random, a
  random-but-repeating pattern, or 'brownian' motion" (5.3.6). Order: "in the order they were played" (5.3.7).
- Arp octaves: "repeat the arpeggiation up or down by up to four octaves" (5.3.10, p. 35).
- Gate: "10% being the shortest time and 90% being the longest" (3.3.1, p. 19). Swing: "11 different settings ...
  Off (no swing, or 50%) through ... (53-75%)" (3.3.2, p. 19). Rate "30-240 bpm" (1.2.1.4).

**Arturia KeyStep Pro** (manual v2.5.2, https://dl.arturia.net/products/keystep-pro/manual/keystep-pro_Manual_2_5_2_EN.pdf;
page numbers are PDF pages) [P]:
- Per step, five encoders: Pitch, Gate, Velocity, Time Shift, Randomness. Pitch: "if you have selected a scale ...
  it will only step through the notes that belong to the scale" (4.2.10.1). Time Shift: "The range is -49% to +50%
  of a step" (4.2.10.4). Randomness: "the probability that it will trigger, from 0% to 100%"; in Arp mode "it
  introduces random notes into your arpeggio" (4.2.10.5) (all PDF p. 46).
- Sequence directions: Fwd, Rand, Walk, where Walk is "a 50% chance it will play the next step, a 25% chance it will
  play the current step again and a 25% chance it will play the previous step" (Shift functions, PDF p. 55-56).
- Arp: "seven ways: up, down, exclusive pendulum, inclusive pendulum, random, in the order you played them or
  polyphonically" (PDF p. 55); Arp Octave -1, 0, +1, +2, +3 (PDF p. 56).
- Scales: "six different scales (major, minor, dorian, mixolydian, harmonic minor or blues)" plus 2 user scales;
  scale applies to keyboard, sequence and arp together (PDF p. 56). Transpose is "intelligent": "no 'outside notes'
  will play".
- Swing: 25 settings, 50 % straight to "The maximum Swing setting is 75%" (PDF p. 38).
- Velocity guide: "0 to 50 or so are soft, velocities of about 50 to 100 are medium, and a velocity above 100 is
  loud" (4.2.10.3).

**Korg SQ-64** (Owner's Manual v1, multi-language,
https://cdn.korg.com/jp/support/download/files/306afb88f1e1ec63aeb9e072648f94d5.pdf, English pp. 14-18) [P]:
- Directions: REVERSE; BOUNCE ("replay steps in reverse order after playing the last step"); STOCH. ("the next step
  will be decided randomly among four choices: one forward, skip one forward, one backwards, or repeat same step");
  RAND. ("randomly determines the next step from all steps") (p. 14).
- Per step (gate mode, p. 16): length "0~100%, TIE ON, SLIDE 1~100%"; start offset "[-50%...+49%]"; probability
  "PROB100%~5%" or an alternation ("the step is only played on the first of three cycles"); slices (ratchet)
  "1(OFF), 2FLAT-16FLAT, 2DOWN-16DOWN, 2UP-16UP"; rotate steps.
- Pitch mode (p. 17): PARAM2 "MONO, CHORD, ARP"; arp rate "1X, 2X, 3X, 4X"; scale "EQUAL, MAJOR, MINOR... MAJ.
  PENTA" with root C..B; "pitches of the sequence will be quantized to the selected scale."
- Modulation mode (p. 18): "probability of a random variation of the modulation values [0%-100%]" and "range of random
  modulation value variations [0%-100%]"; modulation can be sent as velocity. This is the clearest hardware
  precedent for a "mutate" macro with two numbers: how often, and how far.

**Conventions [D]:** the common core is up, down, up-down, random, as played, with 1-4 octaves; gate 10-90 % of a step
on keyboards; swing 50-75 % (Arturia) or up to 80 % (JAM); scale lock always quantizes to the nearest/next scale note,
and the better designs keep the stored value and remap (BCR32, KeyStep Pro "intelligent transpose").

## 5. App facts that shape the proposal

- Studio already has a step grid, but it is a drum grid: "rows = kit pieces, columns = steps" (`index.html:1305`,
  `#stepGrid`). No melodic step sequencer or arpeggiator control exists (the only "arpeggio" hits are band comp
  comments, `index.html:3760`, `3851`, `3913`, `3954`).
- Scales live in cents (`S.scale`, 25 scales, 5 microtonal; glossary). The key moves by itself (key journey), and the
  chord brain picks a chord each bar (`curRootDeg`). So pitches must be stored as **scale degrees** relative to
  `S.root`, never MIDI numbers, or the key journey breaks them [D].
- Standards that bind: touch targets at least 44x44; subtraction budget (a new visible control must fold one); never
  clamp a scheduled timestamp up to "now" (`_docs/CODING_STANDARDS.md`).

## 6. Proposal: a kids' 2x8 sequencer (short)

All numbers are [D] judgements inside the documented ranges above. Nothing here was tested on a child.

**Layout.** Two rows of 8 step knobs (A over B). On a 360 px phone, 8 knobs leave about 45 px each, right at the
44 px floor, so the knobs touch (hit areas can overlap the drawn knob) and labels go above the row [D]. Tap a knob = rest on/off (SQ-1 GATE ON/OFF).
Hold a knob = hear that step while turning it (SQ-1 STEP JUMP tip). The playhead lights the current knob.

**One knob, two jobs.** A two-way switch **pitch | loud** remaps all 16 knobs (BCR32 mode buttons, Studio Pro lane
buttons).
- pitch: snaps to **scale degrees**, range **15 degrees** (two octaves of a 7-note scale, centred on `S.root`). The
  SQ-1's factory sweep is one octave; one octave is too narrow for a tune with a leap [D]. Store the degree; remap
  live on key or scale change (BCR32 non-destructive scale). Scale lock is always on; there is no "off" in play.
- loud: 3 detents, **soft 45 / medium 80 / loud 112** (MIDI-style 0-127), from KeyStep Pro's soft < 50 < medium <
  100 < loud. SQ-1 sends a flat 64; BCR32 defaults to 100.

**Rows.** One 3-way control: **A** (8 steps) / **A->B** (16 steps, SQ-1 ORDER) / **A/B** (A one pass, B the next:
"answer" variations). SQ-1 ALTERNATE (A1 B1 A2 B2) and PARALLEL are left out: hard to hear as two ideas [D].

**Direction** (4 icons): **forward**, **back**, **bounce** (pendulum without repeating the end steps: 8 steps -> a
14-step loop, Arturia "Exclusive" / BCR32 "Pendulum"), **wander** (KeyStep Pro Walk: 50 % next, 25 % same, 25 %
back). Wander instead of pure random because it keeps neighbouring notes together, so the tune is still
recognisable [D]. If Flah wants true random, use SQ-64 RAND with "never the same step twice in a row" [D].

**Arp** (one toggle, no new controls): the knobs keep rhythm, rests and loudness; pitches come from the chord the
chord brain is playing (`curRootDeg`), walked in the order the **direction** control already sets (forward = up,
back = down, bounce = up-down exclusive, wander = random walk). Range 1 octave; a long-press gives 2 (JAM: "optional
additional octave"). Arp gate fixed at 60 % of a step (inside JAM 10-80 % and KeyStep 10-90 %) [D]. Reusing
direction for the arp order pays the subtraction budget [D].

**Four macro sliders, 0-100 %.** Each one = one kind of change, shown as a plain word.

| Macro | What it does each pass | Mapping at slider s (0..1) | Grounding |
|---|---|---|---|
| **chance** | some steps skip this pass | P(play) = 1 - 0.6*s on off-beat steps, 1 - 0.3*s on beat steps; **step 1 always plays**. At 100 %: off-beats 40 %, beats 70 % | Probability is 0-100 % on KeyStep Pro, Ableton, RS-9; SQ-64 floors at 5 %. Studio Pro "Simplify" drops off-grid notes first and beat 1 last |
| **humanize** | timing and loudness wobble | onset offset = U(-1,1) * s * 0.25 * stepMs, capped at +/-30 ms; velocity += U(-1,1) * s * 24, clamped 1..127 | Ableton Humanize max = 1/4 grid division; hardware shift is +/-50 % but that is an edit; Ableton Velocity "Random 50" = +/-50 |
| **wander** (mutate) | a few notes move to a nearby scale note, this pass only | P(step changes) = 0.25*s; move +/-1 degree, or +/-2 when s > 0.5; with P = 0.1*s two neighbouring steps swap instead. Nothing stored changes | SQ-64 "probability of a random variation 0-100 %" + "range 0-100 %"; Ableton Random Chance/Choices; BCR32 scale is non-destructive |
| **repeat** | some notes stutter (ratchet) | P(step ratchets) = 0.35*s; count 2 when s < 0.5, 2-3 when s < 0.8, else 2-4; hits spaced equally inside the step, each hit >= 30 ms apart (drop the count until true); each repeat 15 % softer (SQ-64 "DOWN") | JAM 2-4, Crave up to 4, SQ-64 2-16; Studio Pro spacing rule |

At 120 bpm in 1/16 steps (125 ms a step), humanize at 100 % gives at most +/-31 ms, so the 30 ms cap holds; at
1/8 steps (250 ms) the cap binds at +/-30 ms instead of +/-62 ms [D]. A 4-hit ratchet at 1/16, 120 bpm is 31 ms apart:
allowed; at 150 bpm it is 25 ms, so it drops to 3 hits [D].

**Timing rule.** Early offsets (negative humanize) need a scheduler look-ahead of at least 0.25 step. Never clamp an
early note up to "now"; schedule it early or drop the offset (`_docs/CODING_STANDARDS.md`, Code) [D].

**What a suite should assert [D]:** over 400 passes with chance at 100 %, step 1 plays 400/400, off-beats play
40 +/- 5 %; with wander at 100 %, every changed pitch is in `S.scale` and at most 2 degrees away, and the stored
pattern is identical after; humanize never moves an onset more than min(0.25 step, 30 ms); a ratchet's hits are
never closer than 30 ms. Sabotage each one.

## 7. Not verified

- SQ-1 tempo range and DUTY range (not in any Korg document I found).
- BCR32: size of one "delay" unit, ratchet count range, launch date on Behringer's own site, the scale list after
  "Minor Pentatonic" (the PDF text cut off at "Inverted ...").
- JAM: no manual was posted on its page; everything is from the product page.
- Studio Pro: maximum repeat count, swing and accent maximums, Randomize Notes slider ranges.
- Whether "newest Behringer step sequencer" is BCR32 or JAM: Behringer lists no dates on either page.
- How any of section 6 sounds or feels for a child. Needs a listen and a hands-on try (prototype candidate).

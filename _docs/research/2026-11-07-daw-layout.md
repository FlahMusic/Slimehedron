# DAW layout conventions for studio: transport, browser, inspector, mixer, step editors, beginner apps (2026-11-07)

Research only. No code was changed. Words follow `_docs/GLOSSARY.md`. Tags: **[P]** primary source (the maker's own
manual or shipped app), read this pass; **[D]** my own derivation or judgement (check it). **UNVERIFIED** means I looked
and could not confirm it in a primary source. App facts come from `index.html` in the working tree (HEAD `46a7879` plus
uncommitted edits): the header at lines ~2152-2194, `#studioBar` built at ~9457-9524 and ~10177-10185, the `<aside>` at
~2340-2500, the mixer rows at ~10144-10158, and the mixer CSS at ~1375-1388.

Manual versions read: Fender Studio Pro **8.2** (Studio One was renamed, and its "Song page" is now the **Session
page**), Ableton Live **12**, Logic Pro for Mac (the current guide lists Logic Pro **13**), GarageBand for Mac and for
iPad (current guides), and the FL Studio online manual (current).

## TLDR (recommendations first)

1. **What we have is already a DAW, folded into one column.** Our header plus `#studioBar` is the **control bar /
   transport**. The Pattern card is the **editor** (Logic's Step Sequencer, Studio Pro's Pattern Editor, FL's Channel
   Rack). The Mixer card is the **console**. The Song card is the **File menu / browser of saved things**. The Timing
   card is a piece of the **inspector**. "More settings" is **Smart Controls plus the instrument editor**. Every DAW
   below keeps the editor and the mixer one click from the arrange area, and hides the instrument guts behind a
   button [P, section 1]. **Keep the column order Pattern, Mixer, Song, Timing, more settings.** Change one thing:
   Timing's last visible row is Groove, a feel setting, so it belongs with the pattern [D].
2. **Mute / solo colours: copy Apple.** Logic and GarageBand both say "The Mute button turns blue" and "The Solo button
   turns yellow" [P]. Ours are mute **pink** and solo **yellow** (`index.html` ~1381-1382). Make mute a blue or lilac
   tone in our palette. Keep the words "mute" and "solo" on the buttons, because the HIG says "Convey information with
   more than color alone" [P]. Keep the order mute then solo (Logic, GarageBand and Studio Pro all list Mute before
   Solo) [P]. Our order already matches. I could not confirm Ableton's or Studio Pro's colours in their manuals
   (UNVERIFIED). Ableton's "mute" is in fact an inverted **Track Activator** that you turn *off* to mute [P]. Don't
   copy that: it confuses children [D].
3. **A transport strip in DAW order.** Logic puts "Rewind, Forward, Stop, Play, and Record buttons to the left of the
   LCD, and the Cycle, Replace, Autopunch, Solo, and Click (Metronome) buttons to the right". The centre display shows
   "tempo, key, and time signature", and the master volume sits "to the right of the Metronome and Count-in buttons"
   [P]. In Studio Pro, Key, Transpose, Tempo and Metronome sit side by side, and "the Metronome button is to the left
   of the Master Volume fader" [P]. **Proposed order: undo/redo | play, record | tempo (number + TAP), time sig, key |
   volume last.** Studio has **no metronome** today. Every DAW here has one on the transport, and Tools already has
   one. That is a decision for Flah (see the questions at the end).
4. **One tempo control on screen.** In studio the header's `#tempoDial` knob and the strip's `#bpmNum` + TAP both seem
   to be visible (the CSS gives `body.mode-studio #volTop` a style but does not hide `#tempoDial`). That is two tempo
   controls on one screen, and no DAW here has two. Confirm this with a screenshot (UNVERIFIED: no browser was run).
   If it holds, fold the knob in studio. That also pays the **subtraction budget** for a metronome toggle [D].
5. **Pattern XY pad = GarageBand Drummer's XY pad, axis for axis.** GarageBand: "The farther right you place the puck,
   the more complex the sound becomes; the higher you place the puck, the louder the sound plays." Smart Drums on iPad:
   "the farther right ... the more complex its part; the higher ... the louder" [P]. Our `#padWrap` is LOUD up, SOFT
   down, SIMPLE left, COMPLEX right, so it already **is** the convention. Keep it exactly like this.
6. **Our sequencer words are the DAW words.** Logic's Step Sequencer edit modes are "On/Off", "Velocity", "Chance",
   "Offset", "Gate", "Note"..., and its playback modes include Forward, Backward, Ping-Pong, Pendulum and Random [P].
   Ableton's lanes are "Velocity and Chance" [P]. Studio Pro's lanes are "Velocity, Repeat, Delay, and Probability"
   [P]. Our drum grid's **on / off - velocity - chance** and the sequencer's **chance / repeat** match. Keep them.
   One clash: there are **three human-feel controls** (the sequencer's "humanize" slider, the drum grid's "Humanize"
   fold, and Timing's "Groove — human feel"). Name them so they read as one family, or merge them [D].
7. **Macros: 4 is right for kids.** Ableton shows "eight Macro Control knobs ... by default", up to 16 [P]. Studio Pro
   gives "eight knobs, eight buttons, and two X/Y control pads" per channel [P]. Logic/GarageBand **Smart Controls**
   are "a simplified set of visual controls" with labels "to help you understand which aspect of the sound each one
   affects" [P]. Our 4 labelled sequencer sliders plus 1 XY pad is the kid-size version of the same idea [D]. **Keep
   the one-line explanation under each slider.** That is exactly what Smart Controls do.
8. **Beginner apps hide by default, reveal on use, and show one hint at a time.** Logic has a "Simplified mode" that
   "streamlines tools and menus" (10.7 guide) [P]. The HIG says put "controls that people are most likely to use at
   the top ... with more advanced functionality hidden by default" [P]. Ableton Learning Music's first lesson is a
   **4-lane** drum grid (Kick, Clap, Closed Hat, Open Hat) with **one** tip ("playstop"). Later lessons switch on
   other tips (record, ...) [P, shipped page config]. Chrome Music Lab Song Maker puts **8** controls on its main bar
   (Play, melody instrument, rhythm instrument, Tempo, Mic, Settings, Undo, Save). It folds six more (Length, Beats per
   bar, Split beats into, Scale, Start on, Range) behind **Settings** [P, shipped bundle]. **Our "more settings" fold
   is the right pattern. Keep instrument / filter / ADSR / velocity / geometry in it.**
9. **Colour per part, not per control.** GarageBand: "each track type ... has a standard color" [P]. Logic: track colours
   "reflect the track type" by default, and changing one "also changes the color of the corresponding channel strip"
   [P]. Studio Pro: "Applying a color to a Track will color all Events on that Track" [P]. **Give melody, drums, bass
   and chords one fixed colour each.** Use it on the mixer row's name, that part's active steps in the drum grid or
   sequencer, and the matching triangle-mixer corner [D]. Logic's step states: "Active steps appear highlighted ...
   inactive steps appear darker" [P]. Step on = the part colour, full strength. Step off = dark or empty.
10. **Touch numbers to assert:** Apple says at least **44x44 pt** ("a button needs a hit region of at least 44x44 pt"),
    plus about **12 pt** of padding around bezelled controls [P]. Android/Google says at least **48dp x 48dp** [P]. The
    repo rule is 44 (CODING_STANDARDS). The mixer buttons are already `min-height:44px;min-width:44px` (~1380). Section
    5 lists the checks for a suite.

## 1. Where each DAW puts things (quotes)

### Transport (play / stop / record / loop / metronome / tempo / time signature / key)

| App | Where | What it holds (quoted) |
|---|---|---|
| Studio Pro 8.2 | **Bottom**: "The Transport Bar is located at the bottom of the Session page" [P1] | Controls "left to right": Previous/Next Marker, Rewind/Fast Forward, Return to Zero, Stop, Play, Record, Loop [P2]. "the Metronome button is to the left of the Master Volume fader and meter". The metronome "is globally disengaged by default" [P3]. "Timing" sits "next to the Key, Transpose, Tempo and Metronome button" [P3]. The toolbar at the **top** holds the edit tools: "arrange view mouse controls, quantize, macros, zooming" [P1]. |
| Ableton Live 12 | Control Bar at the top (its position is not stated in the text, UNVERIFIED; the manual pictures it) | "The Control Bar is where you'll find Live's transport and tempo controls, as well as ... Live's scale and MIDI settings". Its nine sections, in order: Browser Options; **Tempo Settings and Metronome** ("tempo and time signature, customizing the metronome"); **Scale Settings**; Follow and Arrangement Position; **Transport Controls**; Automation and Capture MIDI; **Arrangement Loop**; MIDI and CPU; View Selector [P4]. Tempo: "the Tap Tempo button ... Click ... once every beat" [P5]. |
| Logic Pro | **Top**: control bar | "Rewind, Forward, Stop, Play, and Record buttons to the left of the LCD, and the Cycle, Replace, Autopunch, Solo, and Click (Metronome) buttons to the right of the LCD" [P6]. "In the center of the control bar is the LCD, which shows the playhead position and the project tempo, key, and time signature." The Master Volume slider "appears to the right of the Metronome and Count-in buttons" [P7]. |
| GarageBand Mac | **Top**: control bar | "Includes the transport controls ... buttons to show and hide the different areas" [P8]. Tempo and key are set "in the LCD", and "By default, new projects are in the key of C major" [P9][P10]. |
| FL Studio | **Top**: Toolbar ("by default, is located at the top of the screen") [P11] | Transport panel: **Pat/Song** mode, Play/Pause, Stop, Record. "Tempo (larger digits) ... 10 - 522 BPM", plus a Tap tool. Time signature is set in Project General Settings, not on the transport. Metronome (Ctrl+M) is a toolbar icon [P11]. |

**Pattern [D]:** play, stop and record always sit together. Tempo, time signature and key sit together, next to the
position display. The metronome sits beside tempo (Ableton) or near master volume (Logic, Studio Pro). Master volume
goes at an **end** of the bar (right end in Logic and Studio Pro).

### Browser (sounds) and inspector (settings of the selected thing)

- **Studio Pro:** the Browser opens "beside the Arranger" from a button on the Transport Bar (F5) [P1]. Its exact side
  is not stated in the text (UNVERIFIED; the screenshots show the right). The Inspector is toggled by "the 'i'
  button, located to the left, below the Arrange view" (F4) [P12]. The Pattern Inspector holds "Audition Notes",
  "Editor Follows Cursor" and the Variations list [P13].
- **Ableton:** the browser holds "the Core Library of sounds ... presets and samples ... devices ... your Sets" [P4].
  The text does not give its side (UNVERIFIED; it is on the left in the manual's figures). Detail views (Clip / Device)
  are stacked, with toggles "in the bottom-right corner" [P4].
- **Logic:** Browser: "You can choose a sound category from the sidebar on the left"; open with **B** or the control
  bar button [P14]. Inspector: "parameters for selected regions, tracks, and other items ... depend on the type of item
  selected". It holds the Region inspector, the Track inspector and two "inspector channel strips" (I) [P15].
- **GarageBand Mac:** Library: "Categories appear on the left, and patches for the selected category appear on the
  right". For Drummer tracks "you can choose drum genres and drummers in the Library" [P16].
- **FL Studio:** "The browser can be detached to a separate window or docked on the right side". It also says the
  Browser location is "usually left of the screen" and that it "can be docked to either the left or right side" [P17].

**Pattern [D]:** there is a sound browser on one side, a context inspector beside the arrange area, and editors and
the mixer **below** it, each behind a toggle. Our single right-hand column stacks that same "below" content
vertically. Our "browser" is small (the kit select, the voice / waveform, Song open), and it is fine that it has no
card of its own.

### Mixer (channel strip order, mute / solo / arm)

- **Ableton:** in Session View "the mixer section appears below the track's scenes". The strip's controls, in the order
  the manual lists them: Meter, **Volume**, **Pan**, **Track Activator** (mute: "To mute the track's output, turn off
  the Track Activator switch"), **Solo** ("solos the track by muting all other tracks"), **Arm** [P18].
- **Studio Pro:** "All Channels feature a horizontal panner and vertical volume fader below the I/O-selection display".
  For Mute/Solo, "press [M] for Mute or [S] for Solo". "Soloing silences all except" the soloed channels. The Solo
  button "is green when Solo Safe is engaged". There is an option **Dim Solo**: "lower the volume of non-soloed tracks
  instead of completely muting them", at -6/-12/-18/-24 [P19]. The Console opens "below the Arranger" (F3) [P1].
- **Logic:** strip parts from top to bottom include Pan/Balance knob, Peak level, Volume fader, Level meter, then
  Record Enable / Input Monitoring [P20]. Mute "turns blue"; Solo "turns yellow. The Mute buttons of all unsoloed
  channel strips flash blue" [P21]. Track header default: "Mute, Solo, Record Enable, and Input Monitoring buttons"
  [P22]. The Mixer "opens below the Tracks area or as a separate window" (X) [P23].
- **GarageBand Mac:** track header "Record Enable, Mute, and Solo" [P24]. "The Solo button turns yellow, and the Mute
  buttons of all unsoloed tracks flash blue" [P25]. On iPad the track controls are Mute, Solo, Track Volume, Track Pan,
  then Compressor, Treble, Bass [P26].
- **FL Studio:** each Channel Rack row "From left to right are: Mute, Pan, Volume, Mixer Track destination, Channel
  button ... and Step Sequencer buttons" [P27]. Mixer: "Mute Switch - Left-click to mute/un-mute ... Right-Click to
  solo". Solo is a gesture on the mute LED, not a separate button [P28].

**Pattern [D]:** mute comes before solo everywhere it is listed. Solo means "silence the others". The volume is the big
control. Pan is everywhere, but our mixer has no pan, which is fine for kids. Ours is `name | mute | solo | volume |
value` (~10146), which matches a GarageBand / Logic track header. **Keep it.** Our `.quiet` dimming of silenced rows
(~1383) is our version of Logic's "flash blue" on the unsoloed mutes. Keep that too.

### Step sequencers / pattern editors and their lanes

- **Studio Pro Patterns:** default "16 Steps in length, with 1/16th-note Resolution". Steps run "2 and 64". Swing
  "Defaults to 0%", Gate "Defaults to 100% ... maximum value of 200%", Accent "Defaults to 30%". The automation lanes
  have "Velocity, Repeat, Delay, and Probability buttons", and Delay is "+/- 50%". The drum lanes have "[M] and [S]
  buttons on each lane". Steps are "blue columns" that you can "drag the cursor across the row and edit many of them in
  a single gesture" [P13].
- **Logic Step Sequencer:** "appears in the Editors working area below the Tracks area". Row headers hold "Mute and
  Solo buttons, a Row Assignment pop-up menu, Rotate buttons" [P29]. Edit modes: "On/Off ... Active steps appear
  highlighted in the step grid, while inactive steps appear darker"; "Chance: ... the probability that the step plays";
  "Offset ... –50 to +50 percent"; "Velocity ... 1 to 127"; "Note ... –12 to 12 semitones"; "Octave"; "Gate"; "Skip"
  [P30]. Playback modes: "Forward, Backward, Ping-Pong, Pendulum, Wander, Shuffle, Random" [P31].
- **Ableton:** "Below the MIDI Note Editor you will find Velocity and Chance Editor lanes ... only the Velocity Editor is
  shown by default". Chance is "between 0-100%" [P32]. Ableton has no dedicated step sequencer in the manual pages read.
- **FL Studio Channel Rack:** up to "512 steps". The Graph Editor (Ctrl+K) edits per step "Note, Velocity, Release,
  Fine Pitch, Mod X, Mod Y and Shift". Global Swing affects "every second step" [P27].

**Our fit [D]:** the drum grid's tap modes (on / off, velocity, chance) are Logic's edit-mode selector with three
choices. The sequencer's direction set (→ ← ↔ ?) is a subset of Logic's playback modes. Its "velocity" knob page is
Studio Pro's velocity lane. Showing only Velocity by default and hiding Chance is exactly what Ableton does. We could
follow it by making `on / off` the default and keeping `chance` one tap away, which we already do.

### Macro knobs / Smart Controls

- **Ableton:** "It is possible to use up to 16 Macro Controls in a Rack. When creating a new Rack, eight Macro Control
  knobs are shown by default" [P33].
- **Studio Pro:** "There are eight knobs, eight buttons, and two X/Y control pads available for each Channel". You open
  them from the Channel Editor's "Macro Controls" view [P34].
- **Logic:** Smart Controls let you "view and adjust the most important parameters of the selected track, without
  opening the Mixer or individual plug-in windows ... Screen controls are labeled to make their functions easier to
  understand" [P35]. GarageBand uses the same wording [P36].

### Undo / redo

None of these DAWs puts undo on the transport. All use the Edit menu plus a history list. Logic: "Edit > Undo (or press
Command-Z)", with up to "200" steps and an Undo History window [P37]. GarageBand: Edit > Undo / Redo [P38]. Studio Pro:
"Edit/History" [P39]. Ableton: an "Undo History" in the View menu [P40]. FL Studio is the exception: the toolbar has an
icon, "Undo (Ctrl+Z) / History – Undo last command" [P11]. Song Maker (for kids) puts **Undo** on its main bar [P41].
**[D]:** for children with no menu bar, the visible undo / redo buttons at the strip's left (~10178) are right (FL
Studio and Song Maker do the same). Keep them.

## 2. Colour conventions

- **Mute / solo:** Logic, mute "turns blue", solo "turns yellow" [P21]. GarageBand, solo "turns yellow", unsoloed
  mutes "flash blue" [P25]. Studio Pro, Solo Safe "is green" [P19]. The normal Studio Pro mute / solo colours are not
  in the text (UNVERIFIED). Ableton: the manual does not name colours (UNVERIFIED). It does say a group's Solo "will
  appear half colored" when a nested track is soloed [P18]. FL Studio uses one mute LED with solo as a gesture [P28].
- **Tracks / parts:** GarageBand, "each track type (audio, MIDI, Drummer) has a standard color" [P42]. Logic, by
  default "track colors reflect the track type", and the colour carries to the Mixer strip [P43]. Studio Pro, a 128-
  colour palette, and "Applying a color to a Track will color all Events on that Track". There is also a "Colorize
  Channel Strips" option ("Normally the color only shows on the channel labels") [P44][P19]. Ableton, an "auto-
  assigning track colors" switch and "Reduced Automatic Colors" [P45]. FL Studio, "Color selected ... Gradient /
  Random" for channel buttons, "Useful for grouping instrument types/sections" [P27].
- **Steps:** Logic, active = highlighted, inactive = darker [P30]. Studio Pro, automation steps are "blue columns"
  [P13].
- **Rule:** HIG, "Convey information with more than color alone" [P46]. Our mute / solo buttons carry words, and
  `#volMute` swaps in a red slash. That already meets this rule.

## 3. How beginner apps stay familiar but not overwhelming

- **Logic Simplified mode** (10.7 guide, older version): "a simplified mode that streamlines tools and menus across the
  app". "if you are familiar with GarageBand, you will find a direct match for most GarageBand features". Complete mode
  adds lists, the Step Editor, screensets, extra track header controls "including On/Off buttons, Hide buttons, track
  numbers, and color bars" [P47]. The current (13) guide no longer shows this page at the URLs I tried (UNVERIFIED for
  13).
- **Smart Controls** are the beginner face of the instrument: "a simplified set of visual controls ... to quickly modify
  the sound ... without having to edit individual channel strip or plug-in settings" [P48].
- **GarageBand Drummer / Smart Drums** turn a whole drum part into one puck on one XY pad (complex → right, louder → up),
  with a **Dice** button: "Tap the Dice button ... to try out different grooves" [P49][P50].
- **HIG progressive disclosure:** "Use a disclosure control to hide details until they're relevant ... Place controls
  that people are most likely to use at the top ... with more advanced functionality hidden by default" [P51].
- **Ableton Learning Music** (shipped lesson config): the first lesson, "Make beats", shows "This grid shows the 'inside'
  of a musical pattern. You can click in the grid boxes ...". It has 4 lanes, tempo 98, `data-tip='playstop'`, and the
  only hint is "Click this button to start and stop playback". Later lessons switch on other tips: "Play with beats" has
  `data-tip='record'` [P52][P53]. One new idea per screen.
- **Chrome Music Lab Song Maker** (shipped bundle): the main bar is Play/Stop, a melody instrument (Marimba, Piano,
  Strings, Woodwind, Synth), a rhythm instrument (Electronic, Blocks, Kit, Conga), Tempo, Mic, Settings, Undo, Save:
  **8 controls**. Settings folds Length (default 4 bars, 1-16), Beats per bar, Split beats into, Scale (Major /
  Pentatonic / Chromatic), Start on (C, Middle), Range (default 2 octaves, 1-3) [P41]. The bundle's HTML default for
  "Beats per bar" is `value=2`. The runtime default may differ (UNVERIFIED).
- **Defaults are musical, not neutral:** C major (GarageBand [P10]), metronome off (Studio Pro [P3]), a 16-step 1/16
  pattern (Studio Pro [P13]), 8 macros shown (Ableton [P33]).

## 4. Recommendations for studio

**Column order (keep, with one move) [D]:**
1. **Pattern** (= the editor: Logic's Step Sequencer / FL's Channel Rack). It stays first because it is what you make
   the song with. Inside it: pad → tabs (drum grid | sequencer) → the grid → its few options.
2. **Mixer** (= the console). Second, because Logic, Studio Pro and Ableton all put the mixer directly under the
   editing area.
3. **Song** (save / open / share = the File menu). Every DAW keeps this off the main surface. It is fine low in the
   column.
4. **Timing**: the grid row is already hidden (CSS ~452), which leaves quantize + Groove. **Fold Groove into the Pattern
   card** next to the drum grid's Humanize (both are "feel"), and leave quantize where it is or move it under more
   settings. That is one card fewer on the first screen [D].
5. **more settings** (= Smart Controls + instrument editor): Key & Scale range, Geometry, Instrument, Delay, Velocity,
   ADSR, filter. Keep it folded. This is Logic's Simplified / Complete split.

**Grouping and names [D]:**
- The transport is one strip in DAW order: `undo redo | ▶ ● | tempo [TAP] | time sig (step) | key (scale) | kit | …
  | volume`. Today play and record live in the header and tempo / key in `#studioBar`. If they cannot share a row
  on phones, keep that split, but keep the left-to-right order.
- Use the DAW word where one exists. The app already does this: "velocity" (the title even says "the DAW word"),
  "chance" (Ableton, Logic), "time sig", "step", "solo", "mute", "quantize", "groove". Don't rename these.
- One name per human-feel control (see TLDR 6).
- The triangle mixer is **melody / drums / band**, and the Mixer card is **melody / drums / bass / chords**. Both are on
  screen in studio. Glossary: band = bass + comp + pad. Make the triangle's "band" corner and the mixer's bass + chords
  rows share one colour family, so the overlap reads as one thing [D].

**Conventions to adopt [D]:**
- Mute blue / lilac, solo yellow, words kept, dim the rows you can't hear (already done).
- One fixed colour per part, applied to the mixer name, the active steps, and the triangle corner.
- Volume at the right end of the transport (Logic, Studio Pro).
- A metronome toggle **if** Flah wants it. Off by default, like Studio Pro.

**Keep our own spin:** the tank stays the arrange area (it plays where a DAW shows regions). The slime switch is our
"Drummer + Dice" (GarageBand's auto-groove button sits right beside its grid [P50], so a big slime switch beside the
transport is familiar). The SQ-1 sequencer and the XY pad already line up with Smart Drums / Drummer.

## 5. Measurable checks for a suite (extend `dev-surface` / `dev-a11y`, or a new `dev-studiolayout`)

1. **Touch:** every visible control in `#studioBar`, `header`, `#mixRows`, `#seqPanel` and `#drumEditor` has a hit box
   **≥ 44 x 44 CSS px** (HIG 44 pt [P54], repo rule). Report the smallest.
2. **Spacing:** gap between neighbouring bezelled controls ≥ 4 px, aiming at HIG "about 12 points of padding" [P46].
   Measure first, then set the threshold to today's minimum (standards: measure before picking a number).
3. **One of each:** exactly **1** visible tempo control and **1** visible key control in studio at 390 px and 1280 px
   (checks TLDR 4).
4. **First screen budget:** `dev-surface` studio baseline is **22 controls / 26 words**
   (`_dev/surface-baseline.json`). Assert that the reorder does not raise either. Song Maker's main bar has 8 controls
   [P41]. Our transport strip alone should stay **≤ 12** visible controls at 390 px (proposal [D]). Note that
   `dev-surface`'s visibility test uses `offsetParent`, which CODING_STANDARDS says is not a visibility test. Use
   `checkVisibility()` in any new check.
5. **Order:** in the mixer row DOM, mute comes before solo, and solo before volume. In the strip, undo comes before
   tempo, and tempo before key. Volume is the last group.
6. **Colours:** a pressed `.mixM` has a hue in the blue band and a pressed `.mixS` a hue in the yellow band (computed
   background). Pressed and unpressed differ by more than colour (the text stays, or the inset shadow changes) [P46].
7. **Fold:** on a fresh profile, `#advReveal` is closed, and nothing inside it is `checkVisibility()`-visible.
8. **Words:** every card heading is ≤ 2 words. Every sequencer macro has one help line ≤ 8 words (today:
   "some steps skip, each time round" = 6) [D].
9. **Sabotage:** swap mute/solo order, give one button 40 px, and show a second tempo control. Each must go red.

## Questions for Flah (decisions, one round)

1. Add a **metronome / click** toggle to the studio transport (off by default), paid for by folding the header tempo
   knob in studio? **Recommended: yes**, once a screenshot confirms both tempo controls show.
2. Mute colour: **blue/lilac (Apple convention, recommended)** or keep pink?
3. Fold **Groove** into the Pattern card and drop the Timing card from the first screen? **Recommended: yes.**
4. One fixed colour per part (melody / drums / bass / chords) across mixer, grids and triangle? **Recommended: yes.**
   The colour picks are an art-direction call.

## What could not be checked by a machine here

No browser was run. The duplicate tempo control, the current pixel sizes and the colours are read from markup and CSS,
not screenshots. I could not confirm Ableton's and Studio Pro's mute/solo colours, or the Browser's side in Ableton
and Studio Pro, in their manuals' text. Logic 13 Simplified mode is unconfirmed (only the 10.7 page loads).

## Sources

- [P1] Studio Pro, Session page: https://fenderstudiopromanual.fender.com/en/Content/Pages_Topics/Session.htm
- [P2] Studio Pro, Transport Controls: https://fenderstudiopromanual.fender.com/en/Content/Fundamentals_Topics/Transport_Controls.htm
- [P3] Studio Pro, Metronome Control: https://fenderstudiopromanual.fender.com/en/Content/Recording_Topics/Metronome_Control.htm
- [P4] Ableton Live 12, Live Concepts: https://www.ableton.com/en/live-manual/12/live-concepts/
- [P5] Ableton Live 12, Audio Clips, Tempo and Warping (Tap Tempo): https://www.ableton.com/en/live-manual/12/audio-clips-tempo-and-warping/
- [P6] Logic, Control playback with the transport buttons: https://support.apple.com/guide/logicpro/control-playback-with-the-transport-buttons-lgcp0b07c0c9/mac
- [P7] Logic, Customize the control bar: https://support.apple.com/guide/logicpro/customize-the-control-bar-lgcp5bdd6d9d/mac
- [P8] GarageBand Mac, Main window: https://support.apple.com/guide/garageband/the-garageband-main-window-gbnd7f48d68b/mac
- [P9] GarageBand Mac, Set the tempo: https://support.apple.com/guide/garageband/set-the-tempo-gbnd8eff7615/mac
- [P10] GarageBand Mac, Set the key and scale: https://support.apple.com/guide/garageband/set-the-key-and-scale-gbndefa7343f/mac
- [P11] FL Studio, Toolbar Panels: https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/toolbar_panels.htm
- [P12] Studio Pro, Track and Event Inspectors: https://fenderstudiopromanual.fender.com/en/Content/Editing_Topics/Track_and_Event_Inspectors.htm
- [P13] Studio Pro, Patterns: https://fenderstudiopromanual.fender.com/en/Content/Editing_Topics/Patterns.htm
- [P14] Logic, Browser interface: https://support.apple.com/guide/logicpro/browser-interface-lgcpe9cc40af/mac
- [P15] Logic, Inspector interface: https://support.apple.com/guide/logicpro/inspector-interface-lgcpe9cc3b1d/mac
- [P16] GarageBand Mac, Library: https://support.apple.com/guide/garageband/library-gbnddf60c8c8/mac
- [P17] FL Studio, Browser: https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/browser.htm
- [P18] Ableton Live 12, Mixing: https://www.ableton.com/en/live-manual/12/mixing/
- [P19] Studio Pro, The Console: https://fenderstudiopromanual.fender.com/en/Content/Mixing_Topics/The_Console.htm
- [P20] Logic, Channel strip controls: https://support.apple.com/guide/logicpro/channel-strip-controls-lgcpbc219210/mac
- [P21] Logic, Mute and solo channel strips: https://support.apple.com/guide/logicpro/mute-and-solo-channel-strips-lgcpbc21a09d/mac
- [P22] Logic, Track header overview: https://support.apple.com/guide/logicpro/track-header-overview-lgcpe53c68af/mac
- [P23] Logic, Mixer interface: https://support.apple.com/guide/logicpro/mixer-interface-lgcpe9cc43f6/mac
- [P24] GarageBand Mac, Intro to track headers: https://support.apple.com/guide/garageband/intro-to-track-headers-gbnd6143101c/mac
- [P25] GarageBand Mac, Solo tracks: https://support.apple.com/guide/garageband/solo-tracks-gbnd1157ae2a/mac
- [P26] GarageBand iPad, Use the track controls: https://support.apple.com/guide/garageband-ipad/use-the-track-controls-chs175dc411/ipados
- [P27] FL Studio, Channel Rack & Step Sequencer: https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/channelrack.htm
- [P28] FL Studio, Mixer: https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/mixer.htm
- [P29] Logic, Step Sequencer overview: https://support.apple.com/guide/logicpro/step-sequencer-overview-lgcp39acefc9/mac
- [P30] Logic, Use Step Sequencer edit modes: https://support.apple.com/guide/logicpro/use-edit-modes-lgcpf8b9a06c/mac
- [P31] Logic, Step Sequencer inspector: https://support.apple.com/guide/logicpro/step-sequencer-inspector-lgcp8efada20/mac
- [P32] Ableton Live 12, Editing MIDI: https://www.ableton.com/en/live-manual/12/editing-midi/
- [P33] Ableton Live 12, Instrument, Drum and Effect Racks: https://www.ableton.com/en/live-manual/12/instrument-drum-and-effect-racks/
- [P34] Studio Pro, Channel Overview and Editor: https://fenderstudiopromanual.fender.com/en/Content/Mixing_Topics/Channel%20Overview%20and%20Editor.htm
- [P35] Logic, Smart Controls interface: https://support.apple.com/guide/logicpro/smart-controls-interface-lgcp91601243/mac
- [P36] GarageBand Mac, Intro to Smart Controls: https://support.apple.com/guide/garageband/smart-controls-overview-gbndfd8fa312/mac
- [P37] Logic, Undo and redo edits: https://support.apple.com/guide/logicpro/undo-and-redo-edits-lgcp1dbd67ab/mac
- [P38] GarageBand Mac, Undo and redo: https://support.apple.com/guide/garageband/undo-and-redo-edits-in-garageband-gbnd674b44b9/mac
- [P39] Studio Pro, Undo History: https://fenderstudiopromanual.fender.com/en/Content/Editing_Topics/Undo_History.htm
- [P40] Ableton Live 12, Managing Files and Sets (Undo History): https://www.ableton.com/en/live-manual/12/managing-files-and-sets/
- [P41] Chrome Music Lab Song Maker, the shipped app (page + `client/build/Main.js`, read 2026-11-07): https://musiclab.chromeexperiments.com/Song-Maker/
- [P42] GarageBand Mac, Change track colors: https://support.apple.com/guide/garageband/change-track-colors-gbnd2232c1ee/mac
- [P43] Logic, Change track colors: https://support.apple.com/guide/logicpro/change-track-colors-lgcp7a5a5423/mac
- [P44] Studio Pro, Custom Colors: https://fenderstudiopromanual.fender.com/en/Content/Setup_Topics/Custom_Colors.htm
- [P45] Ableton Live 12, First Steps (Theme & Colors): https://www.ableton.com/en/live-manual/12/first-steps/
- [P46] Apple HIG, Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility
- [P47] Logic 10.7, Use the complete set of Logic Pro features: https://support.apple.com/guide/logicpro/use-the-complete-set-of-logic-pro-features-lgcp5cbf192f/10.7/mac/11.0
- [P48] Logic, Main window interface: https://support.apple.com/guide/logicpro/main-window-interface-lgcpe9cc403a/mac
- [P49] GarageBand Mac, Edit Drummer regions: https://support.apple.com/guide/garageband/edit-drummer-regions-gbndcaf22b29/mac
- [P50] GarageBand iPad, Play the Smart Drums: https://support.apple.com/guide/garageband-ipad/play-the-smart-drums-chs3928318c/ipados
- [P51] Apple HIG, Disclosure controls: https://developer.apple.com/design/human-interface-guidelines/disclosure-controls
- [P52] Ableton Learning Music, Make beats: https://learningmusic.ableton.com/make-beats/make-beats.html
- [P53] Ableton Learning Music, Play with beats: https://learningmusic.ableton.com/make-beats/play-with-beats.html
- [P54] Apple HIG, Buttons ("a hit region of at least 44x44 pt"): https://developer.apple.com/design/human-interface-guidelines/buttons
- [P55] Android Developers, Make apps more accessible ("at least 48dpx48dp"): https://developer.android.com/guide/topics/ui/accessibility/apps
- Studio Pro, Pages (four pages: Start, Session, Mastering, Show): https://fenderstudiopromanual.fender.com/en/Content/Pages_Topics/Chapter-Pages.htm
- Material Design 3's own site renders with JavaScript and could not be read as text. The 48dp figure is cited from
  Google's Android page [P55] instead (Material site wording UNVERIFIED).

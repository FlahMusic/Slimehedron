# DAW keyboard shortcuts, shortcut discoverability, WCAG 2.1.4 and first-use checks for studio (2026-11-08)

Research only. No app code was changed and no browser was run (a sweep was running). Words follow `_docs/GLOSSARY.md`.
Tags: **[P]** primary source (the maker's manual, the W3C, NN/g, or a shipped app), read this pass; **[D]** my own
derivation or judgement (check it); **UNVERIFIED** means I looked and could not confirm it in a primary source. App
facts come from `index.html` at HEAD `91d3fa2`: the global key handler at lines 7861-7881, the keyboard instrument at
7078-7096 and 7298-7302, the tank's own keys at 8136-8163, undo/redo at 10279-10294, focus CSS at 181-1996.

## TLDR (recommendations first)

1. **Only three shortcuts are truly universal: Space = play/stop, Cmd/Ctrl+Z = undo, Shift+Cmd/Ctrl+Z (or Ctrl+Y) =
   redo.** All five DAWs bind Space to start/stop [P1][P3][P8][P11][P16], and so does Song Maker [P18]. **S = solo
   the selected track** is in all five as well. Record is **R** in GarageBand, Logic and FL Studio, but F9 in Ableton
   and numpad * in Studio Pro. Metronome, loop, return-to-start and zoom have **no** shared key. **Tap tempo has no
   default key** in any of them (section 1).
2. **Studio's Space breaks the one universal rule.** Space drops a ball and can only *start* playback
   (`setPlaying(true)`, 7876). It never stops. **Recommended: in studio, Space = play/stop (`#playBtn`); the ball moves
   to Enter. In play, keep Space = ball.** Learn is unchanged.
3. **Four bugs in the global handler (7863), found by reading the code, not run:** (a) no modifier check, so
   **Ctrl/Cmd+A toggles the slime and Ctrl/Cmd+D toggles drums** (on top of select-all / bookmark); (b) **Shift drops
   a ball**, so every Shift+Tab (moving focus backwards) spawns one; (c) Space/Enter call `preventDefault()` for any
   focused element except SELECT/INPUT/TEXTAREA. That can stop a focused native `<button>` from activating on
   Enter/Space, and it drops a ball on each Enter while tabbing (UNVERIFIED in a browser); (d) ↑/↓ change tempo
   even when a button or step cell has focus. Fix: skip when a modifier other than Shift is held, drop Shift as a
   ball key, and only take Space/Enter/arrows when focus is on `body` or the tank.
4. **WCAG 2.1.4 (Level A) applies to A, D, Z, X, `?`, M and S** ("letter ... punctuation, number, or symbol
   characters") [P19]. Today A and D are global, with no off switch and no focus scope, so they **fail 2.1.4** [D].
   Space, Enter, Shift and the arrows are none of those character kinds, so 2.1.4 does not cover them [D]. Fix with
   one **"letter keys" on/off switch** (technique G217 [P20]). Also take Ableton's rule: when keyboard play is on,
   **Shift+letter is the shortcut** [P8].
5. **Keyboard play already matches the DAWs: Z/X = octave down/up** (GarageBand, Logic, Ableton) [P2][P6][P8].
   One thing is missing: all three put **velocity on C/V** [P2][P6][P8]. Ours plays everything at velocity 100
   (7870). Add C/V. Our A-row-white / W-row-black layout is the same idea [D].
6. **Make shortcuts discoverable the DAW way.** Logic's help tags show the key [P7]. Ableton's Info View names
   whatever you hover and is toggled with `?` [P9]. FL Studio's Hint Bar describes the control under the cursor
   [P17]. Studio Pro prints the whole list from Help > Keyboard Shortcuts [P14]. **For us:** put the key in every
   `title` ("play / stop (space)") and in `aria-keyshortcuts` (0 uses today). Add a **`?` shortcut sheet** built from
   the same table the handler reads. Also open the sheet from the existing corner menu, because tooltips never show
   on touch [P24] and native `title` tooltips are outside WCAG 1.4.13 [P21].
7. **Keep R off the keyboard** (the comment at 7861 is a deliberate choice: "no hotkey to fat-finger mid-take").
   Show "record: button only" in the sheet. **K for metronome** only if studio gets a metronome (Apple's key; there
   is no consensus) [P1][P3].
8. **M / S mute and solo the focused mixer row.** Being focus-scoped satisfies 2.1.4 ("only active when that
   component has focus") [P19] and matches GarageBand, Logic and Studio Pro [P1][P3][P13].
9. **First-use numbers to assert:** first sound within **0.1 s** of the first gesture (NN/g "feel ... instantaneously"
   [P23]); play state visible in the same frame (heuristic 1 [P22]); every studio edit undoable (heuristic 3 tip
   "Undo and Redo" [P22]); focus ring visible on every focusable control (2.4.7 AA [P19]). Section 4 lists 14 checks
   for a new `dev-keys` suite.
10. **Decisions for Flah** are at the end (5 questions, each with a recommendation).

## 1. What the DAWs bind (quotes)

| Action | GarageBand Mac [P1][P2] | Logic Pro [P3]-[P6] | Ableton Live 12 [P8] | Studio Pro 8 [P11]-[P14] | FL Studio [P16] |
|---|---|---|---|---|---|
| Play/stop | "Start or stop playback" **Space bar** | "Play or Stop" **Space bar** | "Play from Start Marker/Stop" **Space** | "Play by hitting the spacebar ... also works to stop" | "Start/Stop Playback" **Space** |
| Record | "Start and stop recording" **R** | "Record" **R** (also numpad *) | "Record" **F9** | "pressing [*] on the numeric keypad" | "Switch On/Off recording" **R** |
| Undo | Command-Z (GarageBand table) | "Edit > Undo (or press Command-Z)" | **Ctrl Z / Cmd Z** | Edit/History; key not in manual text (UNVERIFIED) | "Undo/Redo last edit" **Ctrl/Cmd+Z** |
| Redo | "Redo" **Shift-Command-Z** | "Edit > Redo (or press Shift-Command-Z)" | **Ctrl Y / Cmd Shift Z** | UNVERIFIED | same Ctrl/Cmd+Z toggles; "Undo step-by-step" Ctrl+Alt+Z |
| Metronome | "Turn the metronome click on/off" **K** | "Toggle Metronome Click" **K** | "Toggle Metronome" **O** | "press [C] ... to globally engage and disengage the metronome" | "Toggle metronome" **Ctrl/Cmd+M** |
| Loop / cycle | "Turn Cycle mode on/off" **C** | "Toggle Cycle Mode" **C** | "Toggle Loop Brace" **Ctrl/Cmd L** | "toggle looping by pressing [/]" | (Pattern/Song mode is **L**) |
| To start | "Go to the beginning" **Return** | "Go to Beginning" **Return** | "Move Insert Marker to Beginning" **Home** | "zero the transport by pressing [,]" | "Move playback marker to start" **Home** |
| Tap tempo | not listed | no default in the Global table | the Tap Tempo button "can be key or MIDI mapped" [P10]: no default | not found (UNVERIFIED) | Tap is a toolbar tool [P17]; no key listed |
| Mute sel. | "Mute/Unmute the selected track" **M** | "Toggle Channel Strip Mute" **M** | none; tracks 1-8 on F1-F8 | "press [M] for Mute or [S] for Solo ... selected Channels" | channels 1-10 on keys 1...0; Playlist "Alt+M" |
| Solo sel. | "Solo/Unsolo the selected track" **S** | "Toggle Channel Strip Solo" **S** | "Solo Selected Tracks" **S** | **S** (same quote) | Mixer "Solo Current track" **S** |
| Zoom | "Horizontal zoom in/out" **Cmd-Right/Left** | (track zoom Option-Cmd-arrows) | **+ / -** (time ruler) | not read | **PgUp/PgDn** |

Keyboard as instrument:

- **GarageBand:** "Musical Typing (or press Command-K)"; "Move down or up by octaves: Press Z or X"; "Lower or raise
  the velocity: Press C or V"; "Turn sustain on or off: Press Tab"; pitch bend 1/2, modulation 3-8 [P2].
- **Logic:** the same words: "Press Z or X to move down or up by octaves. Press C or V to lower or raise the velocity"
  [P6].
- **Ableton:** "Computer MIDI Keyboard" **M**; "Octave Range Up/Down **X and Z** keys"; "Incoming Note Velocity
  Up/Down **C and V** keys"; "Single letter shortcuts can still be used when the Computer MIDI Keyboard is active by
  adding Shift, e.g., Shift S to solo a track" [P8].
- **FL Studio:** "Toggle typing keypad to piano keypad" **Ctrl/Cmd+T**; "Single key shortcuts will only work when
  'Typing keyboard to piano' (Ctrl/Cmd+T) is OFF" [P16].
- **Song Maker** (shipped bundle): Space toggles play and its default is prevented everywhere. Arrows move the grid
  cursor, Enter or `.` toggles a note, Backspace or `,` deletes, Escape hides the cursor. These keys only work when
  the target is the grid, `body`, or the MIDI/mic buttons (`allowKeypress`). A first Tab adds a `user-is-tabbing`
  class that turns on the focus rings [P18]. There is no undo key.

**What a DAW user will expect from a small web DAW [D]:** Space play/stop (5/5 plus Song Maker), Cmd/Ctrl+Z and
redo (all of them; it is also the OS convention), and S for solo (5/5, but it needs a "selected" track). R is
likely (3/5). Everything else varies by vendor, so nobody will miss it.

## 2. Our keys today, the conflicts, and a proposed map

**Today (read from code):** the global `keydown` handler (7863) runs in **every room** and only skips SELECT, INPUT
and TEXTAREA targets. While keyboard play (`kbOn`) is on, or always in learn, letters from `KEYMAP` are notes, Z/X
step `kbOct` from -3 to +3, and those keys return early (7865-7872). Otherwise Space, Enter, ShiftLeft and ShiftRight
drop a ball, throttled to one every 110 ms, and start playback. **A** clicks `#slimeBig`, **D** clicks `#drumBtn`, and
**↑/↓** change the tempo by 2. Undo/redo is a separate capture-phase handler: studio only, Ctrl/Cmd required, Alt
excluded, text boxes keep their own undo (10291-10294). The undo buttons' titles already name the key ("undo
(ctrl+z)", 10284). The focused tank (`#cv`) owns arrows, `[ ]`, Enter/Space and Shift+Enter, and it calls
`stopPropagation()` (8144-8163). The XY pad and humanize knobs do the same for arrows (8100-8120).

**Conflicts [D]:**
- Space never stops playback, against 5/5 DAWs.
- Ctrl/Cmd+A and Ctrl/Cmd+D reach the A/D branch (no modifier guard). The undo handler catches only Z/Y.
- Shift is a modifier key. Using it as a ball key fires on Shift+Tab, Shift+arrows and on capital letters.
- Enter on a focused button: the window handler calls `preventDefault()`. In the DOM, a cancelled keydown cancels the
  button's Enter activation (UNVERIFIED here, so test it). Song Maker avoids this with `allowKeypress`.
- ↑/↓ on a focused step cell, mixer button or `<details>` summary changes the tempo and blocks scrolling.
- A and D fail WCAG 2.1.4 (see section 3). In learn, letters are always notes with no off switch. That is arguably a
  2.1.4 case too [D].
- In keyboard play, A is the note C and D is E, so the slime and drum keys disappear with no way back. Ableton's
  Shift rule fixes this.

**Proposed map** ("focus-free" = only when focus is on `body` or the tank wrapper; never on a control):

| Key | Studio | Play | Learn | Why |
|---|---|---|---|---|
| Space | **play / stop** (`#playBtn`) | drop a ball (as now) | as now | 5/5 DAWs [P1][P3][P8][P11][P16]; play keeps the toy |
| Enter | drop a ball (focus-free) | drop a ball (focus-free) | as now | the ball needs a key, and Enter is free in studio [D] |
| Shift (alone) | nothing | nothing | nothing | modifier; Shift+Tab must not make sound |
| Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z, Ctrl+Y | undo / redo (as now) | n/a | n/a | Apple, Ableton [P5][P8] |
| A / D | slime / drums (focus-free, no modifiers, obeys the letter-keys switch) | same | n/a | keep our own keys, made 2.1.4-safe |
| Shift+A / Shift+D | slime / drums while keyboard play is on | same | n/a | Ableton's "adding Shift" rule [P8] |
| ↑ / ↓ | tempo ±2 (focus-free only) | same | n/a | no DAW uses arrows for tempo; keep but scope it [D] |
| Z / X, C / V | octave, **velocity** (keyboard play) | same | same | GarageBand, Logic, Ableton [P2][P6][P8] |
| M / S | mute / solo the **focused mixer row** | n/a | n/a | M/S in 3/5 and S in 5/5; focus-scoped = 2.1.4 OK |
| ? | open the shortcut sheet (Esc closes) | same | same | Ableton `?` = Info View [P9] |
| K | metronome, **only if** one is added | n/a | n/a | Apple's K [P1][P3]; no consensus |
| R | **none** (record stays button-only) | none | none | the existing decision at 7861; it still sits in the sheet |

## 3. Discoverability, and what WCAG 2.2 requires

**How DAWs surface keys [P]:** Logic: "If you've turned on help tags ... when a help tag displays a command, it also
shows the corresponding key command" [P7]. Logic also has a Key Commands window (Option-K) where "all can be freely
reassigned" [P7]. Ableton: "The Info View displays the name and function of whatever element of the UI that you hover
over ... show or hide the Info View by ... using the ? key" [P9], plus Key Map Mode (Cmd/Ctrl K) [P8]. FL Studio: "If
you place your cursor over any control a short description of it will appear here" (Hint Bar) [P17]. Studio Pro: "A
complete list of key commands is always available via Help/Keyboard Shortcuts", which opens as an HTML page, and a
Keyboard Mapping Scheme can "select from keyboard maps for several DAWs" [P14].

**Tooltips [P]:** NN/g: "we recommend text labels for all icons ... the least you can do is provide your users with a
descriptive tooltip"; "Tooltips that appear only on mouse hover are inaccessible for users that rely on keyboards";
"They are not normally available on touchscreens"; "keep it brief" [P24]. WCAG 1.4.13 (AA) covers custom tooltips
("dismiss ... without moving pointer hover or keyboard focus", hoverable, persistent). It excludes "browser tooltips
created through use of the HTML title attribute" [P21]. **[D]:** our tooltips are all `title` (99 in index.html), so
1.4.13 does not bite. It also means keyboard and touch users never see them. The `?` sheet is the real
discoverability path. One table (key, action, room, element id) should drive the handler, the `title` suffix,
`aria-keyshortcuts` and the sheet, so they cannot drift apart. Show `⌘` on Mac and `ctrl` elsewhere.

**WCAG 2.2 text [P19]:**
- **2.1.4 Character Key Shortcuts (A):** "If a keyboard shortcut is implemented in content using only letter
  (including upper- and lower-case letters), punctuation, number, or symbol characters, then at least one of the
  following is true: Turn off ... Remap ... to include one or more non-printable keyboard keys (e.g., Ctrl, Alt) ...
  Active only on focus: The keyboard shortcut for a user interface component is only active when that component has
  focus." The Understanding doc adds that "keyboard users may trigger them accidentally", and that "an unintentionally
  spoken word can become a sequence of single-key commands" for speech input. `?` (Shift+/) still counts: "What
  matters is that a shortcut relies on a printable character". The sufficient technique is **G217** "Providing a
  mechanism to allow users to remap or turn off character key shortcuts" [P20]. The doc does not say whether Space
  counts (UNVERIFIED; by the SC's wording, it does not [D]).
- **2.1.1 Keyboard (A):** "All functionality ... operable through a keyboard interface". **2.1.2 No Keyboard Trap
  (A).** So never bind Tab (GarageBand's Tab = sustain would trap focus on the web) [D].
- **2.4.7 Focus Visible (AA):** "a mode of operation where the keyboard focus indicator is visible". **2.4.11 Focus
  Not Obscured (Minimum) (AA):** "not entirely hidden due to author-created content". **2.4.13 Focus Appearance
  (AAA):** a 2 CSS px perimeter at 3:1 contrast.
- **1.4.2 Audio Control (A):** audio that plays automatically for more than 3 s needs pause/stop or its own volume.
  The tank's own mute and volume cover this.

**Our focus CSS [D]:** 12 `:focus-visible` rules cover specific elements (`#cv`, `.sgCell`, `select`, `.hzKnob`, the
lesson cards...). There is no general `button:focus-visible`. `.btn.on` and `.btn.big.on` set `outline:none`
(1668, 1994), so a pressed toggle (drums on, slime on) may show **no focus ring** (UNVERIFIED without a browser:
this is a 2.4.7 risk). Song Maker's `user-is-tabbing` class is the old way to do what `:focus-visible` does now.

## 4. First-use heuristics and checks a headless test can assert

**Heuristics [P22]:** #1 "keep users informed about what is going on, through appropriate feedback within a
reasonable amount of time". #3 "emergency exit", with the tip "Undo and Redo". #6 "making elements, actions, and
options visible". #7 "Shortcuts — hidden from novice users — may speed up the interaction for the expert user", with
the tip "accelerators like keyboard shortcuts and touch gestures". **Time limits [P23]:** "0.1 second is about the
limit for having the user feel that the system is reacting instantaneously"; 1.0 s keeps the "flow of thought"; 10 s
holds attention. **Browser rule [P25]:** an AudioContext made before a user gesture "will be created in the
'suspended' state" and needs "resume() after the user gesture". So "first sound" means time from the **first
gesture**, never from page load.

**Our fit [D]:** studio's empty state is not empty (the slime starts in G major, ~9735). The first gesture is the
sound, which is right. Play waits for a touch behind the tap invite. Undo exists in studio only.

**Checks for a new `dev-keys` suite** (Playwright, each measured first and its threshold set from the measurement;
`checkVisibility()` for visibility; set `slimehedron-tapped` and the coach keys):
1. **Space in studio** toggles `S.playing` true→false→true, and the ball count does not change.
2. **Space in play** adds exactly 1 ball per press (presses ≥ 110 ms apart), and never stops playback.
3. **Enter on a focused button** (`#drumBtn`, `#undoBtn`, a mixer M) fires exactly 1 `click` and spawns 0 balls.
4. **Shift+Tab** through 10 controls spawns 0 balls.
5. **Modifier guard:** Ctrl+A, Ctrl+D, Meta+A, Meta+D leave `S.slimeMode` and drums unchanged.
6. **2.1.4:** with the letter-keys switch off, A, D, M, S and `?` change nothing (diff of `S` plus the DOM `aria-pressed`
   values). With keyboard play on, A plays a note and Shift+A toggles the slime.
7. **Velocity:** keyboard play, press V 3 times, then A: the scheduled note velocity is higher than at default (read it
   from the note event or MIDI out). C lowers it. Z/X still move the octave from -3 to +3.
8. **Arrows scoped:** with a step cell focused, ↑ leaves `S.bpm` unchanged. With `body` focused, ↑ adds 2.
9. **Shortcut truth:** every entry in the key table has an element whose `aria-keyshortcuts` and `title` name that
   key, and the `?` sheet lists exactly the table's rows (set equality). `?` opens the sheet, Esc closes it, and
   focus returns to where it was.
10. **Icon-only buttons:** every visible `button` whose text has no letters has a non-empty accessible name
    (`aria-label`) and a `title`. Report the count (today the undo/redo titles pass; `#playBtn`'s title has no key).
11. **Focus visible (2.4.7):** Tab through studio at 1280 px. For each focused element, the computed outline width
    is > 0, or the box-shadow differs from the unfocused state. Include `.btn.on` toggles. **Not obscured
    (2.4.11):** `elementFromPoint` at the focused rect's centre is the element or inside it.
12. **Time to first sound:** on a fresh studio page, send a real Space keydown and read samples at the destination
    tap (as `dev-realaudio` does). The time to the first block above -60 dBFS must be ≤ the measured baseline, aiming
    at 100 ms plus the reported `outputLatency` [P23]. Same for the first tap on the play tank.
13. **Play state visible:** within 1 frame of Space, `#playBtn`'s label or `aria-pressed` matches `S.playing`.
14. **Undo safety:** for each of N studio edits (step on, tempo, kit, key, mixer mute), Ctrl+Z restores the
    `extras()` snapshot exactly, and Ctrl+Shift+Z re-applies it.
**Sabotage (must go red):** remove the modifier guard (5), put Shift back as a ball key (4), drop `aria-keyshortcuts`
from `#playBtn` (9), add `.btn:focus{outline:none}` (11), make Space call `setPlaying(true)` only (1).

## Questions for Flah (decisions, one round)

1. In studio, **Space = play/stop** and the ball moves to Enter (play keeps Space = ball)? **Recommended: yes.**
2. **R for record?** The DAWs mostly say yes, but the code says no on purpose. **Recommended: keep it button-only**,
   and list it in the sheet.
3. Where does the **letter-keys on/off** switch live? **Recommended: inside the `?` sheet** (no new first-screen
   control, so no subtraction-budget cost). Default on. Plus Shift+letter while keyboard play is on.
4. **M / S on the focused mixer row?** **Recommended: yes** (focus-scoped, so 2.1.4-safe).
5. **C / V velocity** in keyboard play? **Recommended: yes**, shown on the existing `#kbMap` row next to Z/X.

## What could not be checked by a machine here

No browser was run. Bugs 3(c) and 3(d), and the `.btn.on` focus ring, come from reading the code. Studio Pro's undo
and redo keys and its zoom/tap keys are not in the manual pages I read. The Apple HIG "Keyboards" page renders with
JavaScript and could not be read as text, so nothing here is quoted from it (UNVERIFIED). Logic's tap tempo was
checked only against the Global Commands table (no row matched "Tap").

## Sources

- [P1] GarageBand Mac, Main window shortcuts: https://support.apple.com/guide/garageband/main-window-shortcuts-gbnd58362a62/mac
- [P2] GarageBand Mac, Play software instruments (Musical Typing): https://support.apple.com/guide/garageband/gbndd5278cd1/mac
- [P3] Logic Pro, Key commands for Global Commands: https://support.apple.com/guide/logicpro/global-commands-lgcp02bf31b6/mac
- [P4] Logic Pro, Use transport key commands: https://support.apple.com/guide/logicpro/use-transport-key-commands-lgcp2814a670/mac
- [P5] Logic Pro, Undo and redo edits: https://support.apple.com/guide/logicpro/undo-and-redo-edits-lgcp1dbd67ab/mac
- [P6] Logic Pro, Use musical typing: https://support.apple.com/guide/logicpro/use-musical-typing-lgcp3bcb92d1/mac
- [P7] Logic Pro, Key commands overview: https://support.apple.com/guide/logicpro/key-commands-overview-lgcp32e85cd9/mac
- [P8] Ableton Live 12, Live Keyboard Shortcuts: https://www.ableton.com/en/live-manual/12/live-keyboard-shortcuts/
- [P9] Ableton Live 12, First Steps (2.2.2 Info View): https://www.ableton.com/en/live-manual/12/first-steps/
- [P10] Ableton Live 12, Audio Clips, Tempo and Warping: https://www.ableton.com/en/live-manual/12/audio-clips-tempo-and-warping/
- [P11] Studio Pro, Transport Controls: https://fenderstudiopromanual.fender.com/en/Content/Fundamentals_Topics/Transport_Controls.htm
- [P12] Studio Pro, Metronome Control: https://fenderstudiopromanual.fender.com/en/Content/Recording_Topics/Metronome_Control.htm
- [P13] Studio Pro, The Console: https://fenderstudiopromanual.fender.com/en/Content/Mixing_Topics/The_Console.htm
- [P14] Studio Pro, Key Commands: https://fenderstudiopromanual.fender.com/en/Content/Fundamentals_Topics/Key_Commands.htm
- [P15] Studio Pro, Undo History: https://fenderstudiopromanual.fender.com/en/Content/Editing_Topics/Undo_History.htm
- [P16] FL Studio, Keyboard & Mouse Shortcuts: https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/basics_shortcuts.htm
- [P17] FL Studio, Toolbar Panels (Hint Bar, Tap): https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/toolbar_panels.htm
- [P18] Chrome Music Lab Song Maker, shipped bundle `client/build/Main.js` (read 2026-11-08): https://musiclab.chromeexperiments.com/Song-Maker/
- [P19] W3C, WCAG 2.2 Recommendation: https://www.w3.org/TR/WCAG22/
- [P20] W3C, Understanding SC 2.1.4 Character Key Shortcuts: https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html
- [P21] W3C, Understanding SC 1.4.13 Content on Hover or Focus: https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html
- [P22] NN/g, 10 Usability Heuristics (updated 2024-01-30): https://www.nngroup.com/articles/ten-usability-heuristics/
- [P23] NN/g, Response Times: The 3 Important Limits: https://www.nngroup.com/articles/response-times-3-important-limits/
- [P24] NN/g, Tooltip Guidelines: https://www.nngroup.com/articles/tooltip-guidelines/
- [P25] Chrome for Developers, Autoplay policy: https://developer.chrome.com/blog/autoplay
- Apple HIG, Keyboards (could not be read as text): https://developer.apple.com/design/human-interface-guidelines/keyboards

# slimehedron design journal

*Running log of design decisions with their pedagogical backing. Newest entries at the bottom.
Citations are to canonical works; where a claim comes from product precedent rather than research, it says so.*

---

## 2026-07-17 · overnight iteration session

### Entry 1 — Curriculum gap analysis: rhythm was missing
Audit of the learn syllabus (piano → chords → intervals → modes) against scholastic
sequences revealed the classic gap: **no rhythm course**. Both the Kodály sequence
(experience rhythm and song before symbols — see Choksy, *The Kodály Method*) and
Gordon's Music Learning Theory (Gordon, *Learning Sequences in Music*, 2007: audiation
of steady beat precedes rhythmic literacy) put **steady-beat competency first**, before
any pitch or harmony work. Top scholastic programs (Music Together, MYC, Orff-based
curricula) all open with pulse.

**Change:** new course **"rhythm — feel the beat"** inserted as lesson 1. A metronome
ticks; the child taps a big slime pad *with* the tick; on-beat taps fill eight dots.
No penalty for off-beat taps — feedback is "listen… tap WITH the tick" (curiosity, not
shame — consistent with our no-assessment stance and with findings that unassessed
digital music play sustains engagement longer).

**New order:** rhythm → piano → intervals → chords → modes.
Rationale: pulse first (Kodály/Gordon), pitch-space map second, then intervals as the
atoms, chords as molecules of harmony, modes as the capstone. This is a **spiral
curriculum** shape (Bruner, *The Process of Education*, 1960): each level revisits
sound/listening at greater depth.

### Entry 2 — Progress visibility on the course menu
Panes now show progress dots (●●○○○). Backing: goal-gradient effect — effort increases
as visible progress approaches a goal (Hull 1932; Kivetz, Urminsky & Zheng 2006, JMR);
product precedent: Duolingo's path. Dots are **recognition, not grades** — nothing is
locked, nothing can be failed, consistent with the guide's no-assessment principle.

### Entry 3 — First-run guided intro (play mode)
Three coach bubbles on first visit only: (1) tap the shape → note, (2) the auto-play
switch, (3) the mixer triangle. ≤30 seconds, advances on the child's own action,
skippable, never returns. Backing: Mayer's multimedia **signaling principle** (Mayer,
*Multimedia Learning*, 2009) — guide attention to essential material; and CML's
zero-setup adoption pattern (instantly musical, no manual).

### Entry 4 — Word economy (ongoing rule)
All instructional copy follows Mayer's **coherence principle** (2009): extra words
depress learning. Rule of the house: real music/audio terms only, one clause of plain
language around them, translator-proof grammar.

### Entry 5 — Mobile parity fix
Pixel piano exceeded small-phone width once ghost keys landed (~396px). Fixed by
scaling the piano block on narrow viewports rather than reflowing keys (keeps black-key
geometry exact). Verified by arithmetic (8×33px whites + 2 ghosts + borders) — device
lab pass still owed.

### Entry 6 — Verification log (this session)
- learn.js v4: full `node --check` pass on deployed file; rhythm timing window
  unit-tested (±110ms, wraps across the beat boundary so early taps count).
- index: head script parse-verified through the main loop; coach block verified
  standalone; CSS/markup additions grep-confirmed on disk.
- Backups: `learn-*-v4rhythm.js`, `index-*-nightShift.html` (timestamped, tail-verified).
- Owed when a live browser is available: device-lab pass (real touch latency on the
  rhythm pad; iOS audio), and screenshot review of the five-pane learn menu.

### Entry 7 — Play-mode density & the key journey (2026-07-19)
Screenshot review showed play mode with a dead 340px right column (the sidebar's cards
hide in play, but the column remained) — violating the full-bleed-canvas pattern of
CML/Toca-class products (the play surface IS the interface; edges belong to characters).
**Changes:** (1) sidebar fully collapses until a recording exists (`hasTakes` class),
stage takes the room; (2) two new right-edge peeker slimes balance the cast;
(3) **key + scale selectors join the always-visible bar** — tonality is a primary
creative choice, not an advanced setting; (4) **fresh installs roll a random friendly
key/scale** (11 roots × 6 scales) instead of defaulting to C major — variability of
first experience is a replay driver (product precedent: roguelike onboarding, Toca's
randomized starting rooms); (5) **the key journey**: with auto-play on, every 16 bars
the key steps the **circle of fifths** (up a 5th or up a 4th, occasionally shifting
among six related modes) — nearest-neighbor modulation keeps flow (common-practice
voice-leading: adjacent keys share 6 of 7 tones) while making the generative stream
endlessly non-repeating. A toast names each new key — passive theory exposure.
Verified: full index syntax pass on disk; 24-step modulation simulation stayed in
range and visited 11 of 12 keys. Journey ticks on the band's bar clock (band on).
Backups: `index-20260719-233218-playmode.html`, `learn-20260719-233218.js`.

### Entry 16 — Keybed docking, studio chord window, door copy (2026-07-22)
**Ball velocity — not changed.** Verified `ballSpeed()=(S.bpm/80)*3.4` is byte-identical
across every backup and bpm default is 80. Base speed is purely tempo-driven; the perceived
speed-up is the tempo slider and/or the MAXBALLS=12 cap making motion easier to track.
**Studio chord-progression window was missing.** The `#chordPill` (current + next chord)
only shows while `bandOn`. On boot, play auto-enables slime+drums+band but studio booted
bare — so the pill never appeared there. Fix: studio boot now starts drums+band (no
auto-slime — you drive it), so the chord window is live from bar 1, matching the "full"
promise. Play unchanged.
**Keybed no longer covers the tank.** It was fixed bottom-center over the canvas. Now:
lowered to bottom:12px, and toggling it adds `body.kb-open`, which gives `#stage` a
padding-bottom (150px desktop / 215px touch). Because the canvas is `max-height:100%` in a
border-box flex stage, it shrinks upward and the keybed gets its own reserved strip below —
verified 142px clearance in-browser, zero overlap. The ⌨ toggle lifts above the keybed too.
**Studio door copy** "the whole studio!" → "make anything" (matches the short, active voice
of "have fun!" / "explore new ideas!").
Backup: index-20260722-212229-kbdock-studioband.html.

### Entry 15 — Touch keybed + Safari MIDI grace (2026-07-22)
**Playable on-screen keybed.** The kbMap was reference-only; now every pad is a real key —
`pointerdown` on `b[data-k]` routes through the same `playNote()` path as a physical keypress
(multi-touch = chords, verified A/D/G → MIDI 60/64/67 in-browser). Z/X pads shift octave with
a live readout.
**Mobile shows note names, not letters.** Physical-key letters mean nothing on a touchscreen,
so `@media (pointer:coarse)` hides the `.kl` letter span and promotes the note name (C, C♯…),
and grows pads to 40×46px — a proper finger target.
**Repositioned bottom-LEFT** (`env(safe-area-inset-bottom)` aware). The back button is
top-left, so bottom-left is clear — no longer overlaps studio's bottom-right advanced panel.
**Double-tap zoom killed** via `touch-action:manipulation` on html/body (canvas keeps its own
`touch-action:none`), so the pads stop fighting the finger on iOS Safari.
**Safari "MIDI not available" fixed.** iOS/Safari has no Web MIDI API; the auto-enable-on-first-
gesture was firing a toast. Now feature-gated (`HAS_MIDI`): if absent, no auto-attempt, no
toast — the MIDI rows dim with "not supported in this browser" and point users at the on-screen
keyboard, which works everywhere. Chrome/Edge/Opera keep full MIDI in/out + hot-plug.
Backup: index-20260722-201036-touchkeys-safarimidi.html.

### Entry 14 — iOS recording, hair removal, filter-safety (2026-07-22)
**Slime hair removed.** The girl/teacher slimes had brown hair rects splaying behind the
body (`opt.girl` block + `H='#8a5a3a'`). Flah: "looks like shit." Gone entirely — slimes
are hairless; the girl marker is the pink bow alone, teachers keep cap + round glasses.
Verified visually in-browser across all 5 variants (plain, cap, cap+bow, bow, celebrate).
**iOS recording overhaul (the #1 reported blocker).** MediaRecorder off a
MediaStreamDestination writes silent/corrupt files on iOS Safari. Now: detect iOS (or any
browser lacking MediaRecorder) → capture raw PCM via ScriptProcessor tapped off the master
limiter (silent gain sink keeps it pumping on iOS), encode 16-bit stereo WAV inline (no
lib), same IndexedDB persist + playback/share list. WAV encoder verified with ffprobe:
pcm_s16le, 44100Hz, stereo, header byte-exact. Desktop keeps MediaRecorder (webm/mp4);
take list now derives extension per-take so old + new takes both export correctly.
**Filter rendering — already safe, one gap closed.** The liquid metaball never used
`ctx.filter` blur; it's a low-res canvas upscaled with bilinear smoothing + composite ops,
so it renders identically on iOS (no SVG-mask fallback needed). The only real filter gap was
CSS `backdrop-filter` missing its `-webkit-` prefix on ~8 surfaces (cards, buttons, overlay)
— added, so the frosted glass survives on older iOS Safari instead of flattening.
**Icon header — already icon-first**; added `aria-label`s to every icon button + the ⌨ pill
so screen readers name them (title alone isn't a reliable accessible name).
Backup: index-20260722-165830-ioswav-nohair.html.

### Entry 13 — Play becomes the kids' room + polyphony cap (2026-07-21)
The earlier declutter was too timid — play still looked like a DAW. Decision (with Flah):
play IS the kids mode; studio is where you go nuts. Research basis: young children engage
through immediate cause-and-effect and instant per-touch feedback; tempo and volume are the
only parameters reliably perceivable pre-10, and parameter menus suppress engagement
(consistent across early-childhood music-app studies and expert app reviews). So play now
shows exactly: ▶ play, drop-ball (enlarged — it's the main toy), 🎲 new shape (kids-only
button, always jumps to a DIFFERENT shape), clear, the slime auto-play switch, and the
stage. The entire control bar (mixer, kit, key/scale, voice, tempo, swing, FX) plus
drums/band/record buttons and perf/pixel toggles are hidden in play — same engine,
zero homework. Studio is unchanged.
**Polyphony cap (MAXBALLS=12).** Kids spam the drop button; unbounded balls turned it into
noise. Classic polysynths ran 4–8 voices; auditory-streaming research says listeners track
at most ~3–4 independent lines (Bregman 1990, *Auditory Scene Analysis*; Huron 2001,
*Tone and Voice*) and textures past ~10 concurrent events perceptually fuse. Cap = 12 with
oldest-ball recycling at every spawn point (rain, drop, MIDI/keyboard shots) — spamming
now *changes the texture* instead of stacking chaos, so trolling stays musical.
Backup: index-20260721-203700-kidsplay.html.

### Entry 12 — Full pass: play declutter, performance input, piano curriculum, scene/melody expansion (2026-07-21)
**Play-mode declutter.** The bar had quietly re-absorbed studio features. Play now hides
swing (auto-play wobbles it anyway) on all sizes; on phones it also hides keys/voice/FX/
scale-lock. Mobile play bar = triangle · kit · key · tempo. (Mayer's coherence principle:
extraneous elements measurably reduce learning; same logic applies to a play surface.)
**Performance input.** Any keyboard/MIDI note in play/studio: sound fires ON the press
(zero latency), a muted ball simultaneously shoots from the geometry's center at the wall
owning that pitch (~100ms flight, first impact flashes/splashes without re-triggering, then
the ball is a normal citizen). Auto ball-dropping halts instantly on human input
(`manualHold`); slime mode reclaims the stage at the next geometry reset. Instrument
logic: the performer's note IS the event — the visual chases it, never the reverse.
**Learn plays through your keys.** Lessons accept computer-keyboard letters (auto-enabled,
Ableton home-row layout) and MIDI input; far octaves fold onto the visible keybed. Rhythm
lessons treat any note as a tap. On phones the lesson keybed is full-size and scrollable
instead of shrunken (Fitts's law: targets must be finger-sized).
**Piano is now an 8-lesson course** (find the keys → major scales on white roots by
circle-of-fifths order C G F D A E B → natural minor from A → black-root majors
B♭ E♭ A♭ D♭ G♭ → black-root minors C♯ F♯ G♯ E♭ B♭ → major/minor pentatonic → the seven
modes as white-key rotations). Guided glowing-key runner, W/H formula shown, payoff run +
jingle per scale. Correct terminology, minimal words.
**Melody bank.** 22 base entries × 3 rhythmic feels (steady/lilt/brisk) ≈ 9–12 audible
variants per mode; PD additions: Frère Jacques, Mary Had a Little Lamb, When the Saints,
Scarborough (trad reading), Greensleeves (trad reading), + mode-defining patterns
(Andalusian cadence line, etc.). "Again" now replays the identical take — ear training
requires an invariant stimulus.
**Scene engine v2.** 160×120 (4× the pixels), 36-component sprite library, 7 genuinely
distinct compositions per mode (49 total), each with a resident slime; seeded micro-
variation inside each composition. Associations follow standard film-scoring practice
(pastoral ionian, folk/sea dorian, iberian phrygian, dreamlike lydian, festive mixolydian,
melancholy aeolian, unstable locrian). All 49 rendered and visually inspected in-browser.
Backups: index/learn-20260721-165649-fullpass. Dev tool: preview-scenes.html renders the
full 49-scene proof sheet.

### Entry 11 — Playable input: computer keyboard + MIDI in (2026-07-20)
Added deliberate note entry alongside the generative ball mechanic.
- **Computer keyboard** uses the DAW-standard layout (Ableton/Logic/FL all share it):
  home row A S D F G H J K L ; ' = white keys, W E T Y U O P = black keys, **Z/X = octave
  down/up**. A ⌨ toggle flips letters between shortcuts and instrument so existing
  hotkeys (A/D/R) aren't lost. An on-screen map shows the layout and lights each key.
- **Scale lock** (checkbox "scale", on by default) snaps every played note into the
  chosen key/scale. Unit-tested: chromatic input in C major returns only white-key
  names; in D dorian it returns that mode's tones; unlocking passes semitones through.
- **MIDI input** implemented to spec against the Web MIDI standard patterns used by
  established open-source browser instruments: `requestMIDIAccess()`, **hot-plug via
  `access.onstatechange`** (USB devices appear/vanish live), per-device message hooks,
  **channel filter with omni** (mirrors the existing output channel mapping), note-on
  with velocity-0 treated as note-off, and CC1 (mod wheel) mapped to filter cutoff.
- **Clock sync**: 0xF8 timing clocks averaged over 24 intervals → BPM (verified exact
  at 90/120/140), 0xFA/0xFB start-continue and 0xFC stop drive the transport.
- All input paths funnel through one `playNote()` — synth voice, chord-brain feed,
  MIDI echo out, and a wall flash for visual feedback.
Backup: index-20260720-202204-keys-midiin.html.

### Entry 10 — Mobile bug round (2026-07-20)
Three defects reported from device screenshots; all real, all mine:
1. **The flicker (root cause found).** The liquid renderer chose between "settled pool"
   and "goo blobs" from a *bare threshold* (`pooledN>=18 && settle>=0.85`) evaluated
   every frame. Near the boundary it oscillated — smooth, chunky, smooth — exactly the
   glitch in the capture. Fixed with **hysteresis**: the state latches; entering pool
   mode needs 18 drops @0.85 settle, leaving requires falling to 12 @0.55. Simulated a
   wobbling fill across 300 frames: **24 look-changes → 1**. Also, the adaptive
   LITE-mode drop now announces itself ("performance mode on") — a silent render
   change reads as a bug, which is a UX defect regardless of intent.
2. **Mobile cast decimated.** Phones were hard-limited to 2 peekers and zero chillers
   (an old "keep small screens clean" rule that outlived the layout). Now phones get
   7 peekers plus 4 edge-parked chillers (bobbing, no cursor physics since touch has
   no cursor). Desktop unchanged.
3. **Gumby redesign.** Hair removed entirely (it read as a wig, not hair). She is now
   smaller (52px), peeks only her head above the edge until clicked, wears the blue
   bow, and is orbited by three hand-drawn **blue monarch butterflies** (SVG, replacing
   the emoji). "Gumby is love" bubble reduced from scale 2.4 → 1.15.
Verified: full index syntax pass on disk; hysteresis simulation; backup
`index-20260720-113641-mobilefix.html`.

### Entry 9 — Designer-review fixes round (2026-07-20)
Expert-review findings executed (cameo feature scrapped per direction — reward too
distant, art too small to hide anything in):
- **Celebrations now sound and sparkle.** Win jingle (major arpeggio on the lesson
  voice) + confetti burst on every session-complete screen. Silent finish lines were
  the cheapest miss in the product.
- **The whole cast celebrates the burst.** At 85% fill every on-screen slime goes
  wide-eyed (anticipation); at burst they all squish and cheer for ~2.4s, including
  the switch-knob slime. The app's climax finally reads as a climax.
- **Rhythm course**: warm woodblock metronome replaces the 820Hz beeper; a 4-dot
  meter cycle shows the strong ONE (meter, not just pulse — Kodály); the on-beat
  window widens to ±150ms on touch devices so device latency isn't blamed on the kid.
- **Piano course**: ends with the scale climbing as an audible payoff, then a new
  black-keys bridge (♯ up / ♭ down, enharmonic C♯=D♭) BEFORE chords — closing the
  sequencing gap where accidentals appeared unintroduced.
- **Chords course activated**: the note that moved now glows on the keys, and
  pressing it confirms — the lesson's one concept is now visible and touchable.
- **Intervals**: session-capped at 7 rounds (research band) with its own celebration.
- **Learn home**: "continue · {course} ▸" resume chip. **Splash**: tap anywhere
  resumes the last mode; cards switch. "the full enchilada" → "the whole studio!"
  (translator-safe).
Backups: learn-20260720-095024-v7polish.js, index-20260720-095024-party.html.

### Entry 8b — CML source comparison: engine upgrades (2026-07-20)
Compared against Chrome Music Lab's implementation (open-source; Tone.js + recorded
instrument samples). Findings & actions:
- **Their per-note quality is samples, not better synthesis.** Adopting Tone.js or
  sample libraries would cost bundle size and offline capability for little gain over
  our scheduler. Rejected wholesale adoption; noted a future option: one small
  CC-licensed piano octave for learn mode if ever desired (~300KB tradeoff).
- **Fixed lesson voice (shipped).** CML teaching tools use stable friendly timbres;
  ours previously played whatever studio patch was left behind. Learn mode now has a
  dedicated mallet voice (additive partials 1/4/9.2, pitch-scaled decay — the marimba
  recipe) used by the pixel piano, jams, backings and rhythm pad. Zero bytes, stable
  class-to-class.
- **Voice-led pads (shipped).** Band chords moved in root position (leaps); now each
  pad voice moves to its nearest octave of the new chord tone — common-tone/nearest-
  tone voice leading. Simulated over progressions: all voice moves ≤600 cents (was up
  to 900+). Audibly smoother accompaniment; standard part-writing practice.
- **Roadmap (not built):** circle-of-fifths wheel visual (their Arpeggios) — pairs
  perfectly with our key journey; circular beat-cycle visual for the rhythm course
  (their Rhythm experiment teaches meter as a loop); Song-Maker-style shareable grid
  as a future creation surface.
Backups: index-20260720-092347-voicelead.html, learn-20260720-092347-v6voice.js.

### Entry 8 — Match game: sessions, difficulty, contrast (2026-07-20)
Field feedback: mode scenes too hard to tell apart at entry level, and no session end
("it just keeps going"). Fixes, research-grounded:
- **Session caps.** Assessment-length guidance converges on 5–10 items for children
  (7 often cited as the sweet spot; longer risks cognitive fatigue), and ear-training
  practice specifically warns that ears fatigue in long sessions. → easy 5 · medium 7 ·
  hard 10 rounds, chosen on a difficulty screen before play.
- **Contrast-aware choices.** New brightness scale (lydian→locrian, standard
  accidentals ordering). Easy rounds only offer options ≥4 brightness steps apart
  (e.g., major vs phrygian) — maximum mood contrast; medium ≥2; hard allows neighbors
  (dorian vs minor). Verified per-mode decoy pools by simulation. Easy sessions always
  use the iconic song (most tellable); riffs enter at medium+.
- **A real finish line.** Round counter ("3 of 7") in the header; final correct answer
  offers "finish ▸" → a completion screen (celebrating slime, sticker recap, again /
  trickier / back). Closure + optional escalation = the ending the session lacked.
Backups: `learn-20260720-000106-v5sessions.js`. Full syntax pass on deployed file.
Added SYLLABUS.md: scope & sequence mapped to the National Core Arts Standards anchor
processes (Creating / Performing / Responding / Connecting) — the alignment language
US school buyers and edtech investors look for.

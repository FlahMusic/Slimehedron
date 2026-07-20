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

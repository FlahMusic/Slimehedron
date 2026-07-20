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

### Entry 7 — Syllabus document for external review
Added SYLLABUS.md: scope & sequence mapped to the National Core Arts Standards anchor
processes (Creating / Performing / Responding / Connecting) — the alignment language
US school buyers and edtech investors look for.

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

### Entry 40 — License finalized + ko-fi wired (2026-07-30)
- Flah added GitHub's canonical AGPL via the license picker AND dropped the full text locally as LICENSE.txt
  (661 lines, verified real AGPL-3.0). Now 3 non-conflicting files: LICENSE.txt (legal text), LICENSE.md
  (plain-english explainer, updated to point at LICENSE.txt), NOTICE (boilerplate). deploy.bat force-push is now
  safe — LICENSE.txt lives locally so it won't be wiped.
- Wired ko-fi: splash "☕ support" link → https://ko-fi.com/flahmusic (was github placeholder).
- dev-test green. Ready to deploy.

### Entry 39 — AGPL-3.0 license + copyright notices + donation-ready credit (2026-07-29)
- Locked down IP. Repo had NO license = legal limbo (can't enforce). Added AGPL-3.0: free forever, but anyone
  who copies/modifies/web-hosts it MUST keep it open-source + credit Flah — blocks scammers reskinning/selling it.
- Files: LICENSE.md (plain-language terms + AGPL ref + explicit "donations are NOT a sale, don't affect license"),
  NOTICE (standard AGPL copyright boilerplate). Added AGPL copyright header comment to index.html, landing.html,
  learn.js (travels with the single-file app when copied). Splash now shows quiet "© 2026 FlahMusic · free & open ·
  source · ☕ support" line — support link is a PLACEHOLDER (github) to swap for Ko-fi/GitHub Sponsors.
- Confirmed for Flah: donations/coffee money do NOT nullify AGPL (Sonic Pi/Blender model — free code + tip jar).
- Still need (manual, told Flah): (1) add the exact full AGPL text as a file named LICENSE via GitHub's
  "Add file → license picker" (canonical text, can't fetch in sandbox). (2) make a Ko-fi or GitHub Sponsors
  account, swap the spSupport href. (3) optional later: register with US Copyright Office (~$65) for max remedies.
- Social/GTM answers given: YouTube Shorts #1 for new/education accounts (highest small-account reach + evergreen
  search tail), TikTok #2, skip Reels. Post native video not links; human framing not ads; r/musiceducation +
  music-teacher FB groups for niche. dev-test green. Backup: index-*-agpl.

### Entry 38 — Live QA pass, footer overlap fix (2026-07-29)
- Viewed live landing + app splash in browser (desktop 1440 + mobile 390). App mode-select splash = clean,
  demo-ready (big glasses slime, 3 clear doors, share top-right sits well). Landing hero clean.
- BUG found: landing footer "made with ♥…" was position:absolute bottom:14px → collided/overlapped the trust
  chips when content height ≈ viewport (amateur-hour look). Fixed: footer → normal flow (margin-top:30px) so it
  can never overlap; body stays flex-centered. Only remaining absolute els are decorative floaties (corners,
  pointer-events:none — can't collide). Backup: landing-v6-footerfix-*.
- TODO Flah: redeploy so the footer fix goes live.

### Entry 37 — Landing polish + share moved into the app (2026-07-29)
- Flah scrutiny pass. Fixes: (1)+(2) tagline "music is meant for everyone." kept but was pure vibe/no info —
  added concrete sub-line "a free way for kids of any age to play and learn music" so a teacher SEES it teaches.
  (3) "free forever" chip → "free" (forever read as unprovable/salesy). Removed the word "toy" everywhere
  (meta description too) — positioned as a learning app, not a toy.
- Killed the weird hidden copy-blurb (invisible text you paste elsewhere — amateur, nobody does that).
- Share button: removed from landing (you share AFTER trying, not before), added a quiet 🔗 share button to the
  APP top-right (mirrors ← back, hidden in learn mode, icon-only on phone). Uses navigator.share (native sheet)
  on mobile, copy-link fallback on desktop. Share text calls it "a free music app where kids learn as they play."
- Domain: Flah will spend ~$8 on a .org later, not yet — pinned for when we circle back (CNAME → same GH Pages).
- Verified: landing checks pass, app share checks pass, dev-test green. Backups: index-*-preshare, landing-v5-*.

### Entry 36 — Landing v3: gutted to one screen, less purple, trust-by-showing (2026-07-29)
- Flah: v2 "reads like a scammy AI course-funnel, way too much text, too purple, doesn't sound like me
  (lowercase, no fluff)." Researched what actually signals legit vs scam: 94% of first impression is VISUAL
  (Stanford web-credibility), formed in ~50ms — design quality + a real working product beat text promises.
- Rebuilt: ONE screen, no scroll-to-convince, no <section> funnel. Lowercase everything ("tap to make music.
  no wrong notes. just fun."). ~25 visible words. One big "play free" button. 5 tiny trust chips
  (no login/no ads/works offline/no data/free). Strongest trust move: a LIVE embedded preview of the actual
  app (iframe, pointer-events off, whole card links to play) — proof it's a real touchable toy, which a scam
  site can't fake. Used 1 preview not 3 (3 live audio-app iframes = heavy, would kill the "loads fast" signal).
- Palette de-purpled: mint (#3fb894) is now the primary accent + button; purple demoted to one decor slime.
  Vibrant 4-corner pastel wash (mint/peach/pink/lav) instead of purple soup. Kept real slime art + floaties.
- SW/manifest/offline all still intact. Backups: landing-v1-soulless-*, landing-v2-toomuch-*.

### Entry 35 — Landing page redesign (real soul) + offline/PWA + GTM answers (2026-07-29)
- Flah: v1 landing "looked like AI made it in seconds, no soul" — no slimes, wrong font. Rebuilt:
  Quicksand font (matches app), REAL slimeSVG art embedded (sheen/blush/^_^ faces, hero wears the glasses),
  4 floating drifting decor slimes, bouncy spring hovers, offline callout. Benchmarked vs Chrome Music Lab
  (playful minimal) + Sonic Pi (trust markers + clear get-it path); landed between the two.
- OFFLINE was already built: sw.js (service worker) + manifest.json + SW registration in index.html = app is
  already an installable PWA that works offline. Added landing.html + mascot to SW cache, bumped v7→v8,
  registered SW + linked manifest on landing.html so install/offline works from the landing page too.
  This IS the "braindead one-click, works on a cracked old iPhone offline" answer — open once, it self-installs,
  "Add to Home Screen" makes it an app icon. No app store, no account.
- GTM answers given: MIDI = NOT a landing headline (jargon, scares parents) — keep as small studio-card line.
  The page IS the pitch (paste link, page sells, they click Play — Flah's not in the loop). Social: ONE video
  account (TikTok OR YT Shorts), 3 real clips > 5 empty logo profiles; don't make FB/IG shells.
- All soul + offline checks pass. Backup of soulless v1: backups/landing-v1-soulless-*.
- TODO Flah: deploy.bat pushes landing.html + sw.js v8 live.

### Entry 34 — Landing page for teacher/parent distribution (2026-07-29)
- Built landing.html (repo root): hero w/ mascot, "Play free — no sign-up" CTA → index.html, trust badges
  (free / no login / no ads / NO DATA COLLECTED / any browser), 3-doors + what-they-learn cards, a copy-to-
  clipboard "for teachers" blurb, and a 60-sec "how to share" step list. App palette (#b388f0 accent). Validated
  structurally (links, claims, copy button, og:image all present).
- GTM research logged: free kids-music tools spread via TEACHERS + parents, not ads/investors — Chrome Music Lab
  (living-room side project → teacher FB groups + TpT), Sonic Pi (postdoc project → millions, Patreon-funded),
  Blob Opera (delight-driven). Slimehedron is built for this exact lane; web toy IS the product for Flah's
  "free for kids everywhere" goal. Blocker was a teacher-facing front page — now built.
- Domain guidance given: Porkbun ~$8/yr .org flat renewal, Cloudflare ~$8.50 .org at-cost (transfer-in only).
  Recommend a .org for a free-education vibe; point it at GitHub Pages via CNAME (no re-hosting needed).
- TODO Flah: deploy.bat to push landing.html live, then it's at flahmusic.github.io/Slimehedron/landing.html.

### Entry 33 — Chord course: staged curriculum + play-to-proceed gate (2026-07-29)
- **Problem:** chord lessons only SHOWED + played a chord, then "next" — passive, and only root-position triads.
- **Rebuilt as a method-book progression (12 chords, hardest last):**
  triads (C major, C minor) → inversions (maj 1st/2nd, min 1st) → suspended (sus2, sus4) →
  7th chords (maj7, min7, dominant 7) → colour (augmented, diminished). Stages are labeled + contiguous.
- **Play-to-proceed gate:** you must PLAY the chord (press all its tones on the keybed — touch/keys/MIDI) before
  "next" unlocks. Right tones flash green, wrong flash red (same keyFX as the scale game). Progress credit
  (prog.ch) now only counts chords actually played, not just heard. Two-octave keybed so inversions/7ths fit.
  Finishing all 12 fires winJingle + a daily star. Updated grownups() + crsProg counters 9→12.
- **Verified:** learn.js syntax OK, dev-test green; sim confirms 12 chords, correct difficulty order
  (triads→inversions→suspended→7th→colour), contiguous stages, and the gate clears ONLY when every tone is
  pressed (dupes/wrong notes don't block). Backup: index/learn-20260729-224731-chordcourse.

### Entry 32 — Circle of fifths wheel, chord-name cleanup, key-pin rule (2026-07-29)
- **Killed the `F~` / everything-sus4 garbage.** Old chordName stacked SCALE degrees {rd,rd+2,rd+4} and named
  the interval — in pentatonic that's gapped, so it read sus4/sus2, and microtonal read `~`. Rewrote it to
  name by real semitone intervals: clean major/m/dim/aug, generic "sus", and a BARE root name for anything
  off-grid (never a cryptic symbol). Verified C major → `C Dm Em F G Am Bdim` exactly.
- **Chord follower is now STUDIO-ONLY.** Removed from play mode entirely (kids don't know what F♯m means and it
  confused the display). noteManual + bandBar skip chord-chasing when S.mode==='play'; the chord pill is force-
  hidden in play.
- **Circle of fifths wheel = the key indicator.** New SVG wheel (#cofWheel), 12 nodes in true fifths order
  (C G D A E B F♯ C♯ G♯ D♯ A♯ F — verified each step is +7 semis). Current key glows; on a key shift it draws a
  soft arc from old→new node so kids SEE the fifth-step travel (research: COF works for kids as a wordless visual
  roadmap, not as a labeled theory chart — so play strips all sharps/flats/chord text). Play HIDES the wordy
  "5 notes/oct…" scale note too. Studio: same wheel but CLICKABLE — click a key → sets root + pins it.
- **Slime key-pin rule.** New _keyPinned flag. Slime rotates the key every 16 bars along the circle of fifths
  (±a fifth, scale unchanged) BY DEFAULT. If the user picks a key/scale via menu OR clicks the wheel → pinned,
  rotation stops indefinitely. Toggling slime OFF→ON un-pins and resumes rotation. _keyProgrammatic guard keeps
  keyJourney's own auto-moves (and boot setup) from tripping the pin. Play slime stays on pentatonic (casual);
  studio slime rides chromatic but still walks fifths so it never jumps around atonally.
- **Verified:** dev-test green; sims confirm diatonic names, fifths order, nearest-octave click math, and the
  full pin lifecycle (auto-rotate → user pin stops it → re-toggle resumes). Backup: index-20260729-222935-cof-wheel.
- TODO for Flah: eyeball the wheel glow/trail + studio click on device after deploy.bat.

### Entry 31 — Ball tunneling fix: high-octave shots flew through walls (2026-07-29)
- **Bug:** on mobile, high-octave touchpad shots (fired at sp=R/7, fast) sometimes flew clean through the
  geometry and still triggered a note — self-fixed on shape reset. TWO root causes:
  1. `step()` moved the ball a full frame of velocity then checked walls only at the new position — a fast
     ball could leap from inside to fully past a wall in one frame (classic tunneling).
  2. The wall-bounce loop was gated behind `if(inPoly())`. Once a ball's center crossed the wall plane,
     inPoly read "outside" and the bounce was SKIPPED entirely — so it kept going.
- **Fix (two defenses):**
  1. **Substep** the integrate+collide: move ≤ half a ball-radius per micro-step (up to 8), re-checking
     geometry each time. Device-independent (based on velocity, not framerate).
  2. **Unconditional wall bounce:** reflect off any wall within BR that the ball is moving OUT of,
     independent of inPoly. Finite-segment span test (t in [-0.05,1.05]) keeps corners open for the
     fresh-shape escape behavior. inPoly now only decides genuine off-screen despawn.
- **Verified:** sim of 400 fast balls fired at random angles from center of a box — OLD logic escaped
  400/400, NEW escaped 0/400. dev-test green. Backup: index-20260729-221302-tunnelfix.

### Entry 30 — Semitone chord detect, per-kit grooves, keybed fit, zoom lock (2026-07-29)
- **Chord detection fixed for pentatonic (& any scale).** manualRoot stacked SCALE degrees {r,r+2,r+4} —
  wrong in a 5-note scale, so E-A-C never became A minor. Rewrote it to detect the root in real SEMITONES
  (fit major/minor triad {root,+3/+4,+7}), then map back to the nearest scale degree. Responds to 1 note
  or 3. Sim: E-A-C→A minor ✓, single A→A ✓. noteManual now stores pitch class.
- **Each drum kit gets its own bass groove** (KITBASS, 2 grooves/kit, rotate every 16 bars) — chip bouncy,
  conga latin-tumbao, bossa syncopated, rock driving 8ths, electro pumping — so the backing isn't monotonous.
- **Mobile keybed fits** now (starts at C, no side-scroll): keys shrink to `min(42px, (100vw-74)/11)`,
  overflow hidden. The old "starts at D" was just overflow scrolling to the middle.
- **Double-tap zoom locked** (iOS ignores user-scalable=no): JS `gesturestart` + `touchend` double-tap
  preventer, excluding real controls so buttons/lessons still work — feels native.
Passed dev-test. Backup: index-20260729-212429-chorddetect-kitgrooves.

### Entry 29 — Kid-friendly modulation, mode names, kb-button fix (2026-07-29)
- **Keyboard button hidden in learn** (`.mode-learn #kbBtn{display:none}`) — it overlapped the compose
  scene cards; learn has its own lesson piano + letter-keys already work there.
- **Real mode names on the learn cards** (match + compose): now show the mode name (ionian, dorian…) as
  the bold title with the friendly description under it — teaches the real vocabulary.
- **Play-mode modulation reworked to be ear-friendly** (per Flah's spec): base = **A minor pentatonic**
  (the no-wrong-notes scale), and keyJourney now moves the root exactly ONE circle-of-fifths step (±a
  fifth) every 16 bars, SCALE UNCHANGED — familiar finger shape, only the home note moves, never a random
  or atonal jump. Sim: A→D→G→C… all verified as fifth-neighbours, in a comfy octave.
Passed dev-test. Backup: index/learn-20260729-211511-pentmod-modenames.

### Entry 28 — Modal melodies audit + warm voice (2026-07-29)
Research (cited): canonical PD teaching tunes exist for only 4 modes — ionian (Ode to Joy etc.),
dorian (Scarborough Fair + Drunken Sailor), mixolydian (Old Joe Clark), aeolian (Greensleeves +
God Rest Ye). Phrygian lives in flamenco, and lydian/locrian have NO famous PD songs (lydian's famous
examples = Simpsons/Jetsons = copyrighted; locrian ≈ no repertoire). Compositions are PD (no attribution);
recordings carry separate copyright — real audio needs CC0 (Musopen: 1800 CC0/CC-BY-SA recordings).
Pedagogy (Kodály/Orff): pentatonic BEFORE modes; modes are advanced — our capstone placement is correct.
- **Warmed the demo voice** (lessonNote): dropped the metallic 9.2× partial + clicky 4ms attack; now
  harmonic 2×/3× partials, 14ms soft attack, gentle lowpass, slight detune = soft music-box, not a beep.
  This is the main anti-"cheesy" fix.
- **Honest labels**: real famous tunes show their name; the 3 modes with none now show "the sound of X"
  (a flavor phrase, not a fake song title).
Bank now: major 4 songs, dorian 2, phrygian 1, mixo 1, minor 2, lydian 0, locrian 0 (+flavor phrases).
Proposed next (needs greenlight): Musopen CC0 real-instrument audio for the 4 song-modes.
Backup: learn/index-20260729-173434-modemelody-voice.

### Entry 27 — Simply-Piano-style grading: scale game + parent view (2026-07-29)
CEO gap #2 (no performance grading) → built it, in the Simply-Piano lesson shape.
- **Color feedback**: every played key flashes green (right) / red (wrong) in the piano lessons.
- **Scale game** (`scaleGame`): after the guided glow-runner, "play it yourself ▸" starts a graded,
  no-hints round — play the scale bottom-to-top; a wrong note WAITS for the correct one (SP-style),
  and you're scored 1–3 ⭐ by mistakes (0=3⭐, 1–2=2⭐, 3+=1⭐). Best stars saved per lesson (prog.pg);
  a win also feeds the daily streak. This is the "C-major / X-scale check" — you learn the notes and
  find out if you got it. Grading sim verified.
- **Parent tracking** (`grownups`): a "📊 for grown-ups" button on the learn home → a summary of what
  the child learned (streak, per-course progress, scale-game stars) — the trust/dashboard layer.
- Deploy confirmed working end-to-end (fetched live index.html: streak/bass/worm/tempo/heart all present).
  deploy.bat fixed (git identity auto-set). dev-test.js self-test gate all green.
Backup: index/learn-20260729-171916-scalegame.

### Entry 26 — Daily streak / goal / reward — the retention loop (2026-07-29)
CEO-scout gap #1 (no reason to return) → built the come-back-tomorrow loop.
- `window.slimeStar()` on any win (a burst in play, throttled 2.5s; every learn win via winJingle in
  learn.js). First star of a new day advances the streak (yesterday → continue, gap → reset to 1);
  daily goal = 3 stars → one-time celebration (slimeParty + jingle + toast). All localStorage, no account.
- Streak greets the kid on the splash doors: "🔥 N days · today ⭐⭐☆" — validated rendering live.
- Verified 3 ways: Date-boundary sim (advance/hold/reset/celebrate-once all correct), dev-loadtest (LOAD OK),
  live badge render.
Also delivered a full critical CEO scouting report (verdict: strong toy/brand + unique mechanic + real
curriculum = on-par-or-ahead creatively; gaps = retention [now fixed], performance-grading, grown-up layer,
art-cohesion, distribution/name). Remaining action items ranked in the report.
Backup: index-20260729-145030-streak-loop.html.

### Entry 25 — Drop concave shapes, worm z-fix, bass rework (2026-07-25)
- **Heart + star removed** (concave → balls trap in the pockets, goo mask fills notches weird). Kept the
  fundamental convex set: polygons 3–12 + rhombus/trapezoid/parallelogram. KIDCYCLE + studio pool + select
  updated (rounded-first for kids).
- **Drum buttons un-clickable = the worm.** It was `z-index:51` (ABOVE the z40 candy buttons) with
  `pointer-events:auto`, so its tall transparent box covered the right column and ate clicks (the
  "only dead-center" symptom). Fix: worm → `z-index:6` (behind buttons) + moved beside the column
  (right:124 desktop / 52 mobile) so it dances aside; `.psCol` set `pointer-events:none` with `.psBtn`
  `pointer-events:auto` so column gaps don't eat clicks either.
- **Bass rework (was root-spam + erratic octave drops):** voice-leading keeps the bass in a low register
  moving by the smallest step (sim: ≤400-cent leaps over a jumpy progression). 4 rotating 4/4 grooves
  (StudyBass/Yamaha shapes: roots+fifths, root-fifth-octave country walk, triad arpeggio, driving eighths
  w/ a stepwise lead-in) rotate every 16 bars; all land on the root at beat 1 so switches never jump.
  Added third/lead-in tokens (in-scale). Odd time sigs keep their patterns + get voice-leading.
Passed dev-loadtest. Backup: index-20260725-143346-noheart-bass-wormfix.html.

### Entry 24 — Named-shape NaN fix (the "freeze") + tempo pill + slime crowd (2026-07-25)
- **Root of the heart→hexagon + "froze/no burst":** `commitReform` and `shapeArea` did
  `parseInt(S.shape)` — `parseInt('heart')` = NaN, so committing any named shape set S.shape=NaN
  (rendered as the hexagon fallback) and made shapeArea/partCap NaN so the tank never burst again.
  Confirmed live in console (`parseInt('heart')`→NaN, curShape stuck). Fixes: buildEdges now stores a
  real shoelace `_area`; shapeArea returns it (works for heart/star/etc, never NaN); commitReform keeps
  named shapes as strings. Sim: heart/star/all shapes now yield finite area → burst correctly.
- **Freeze-proofing:** couldn't reproduce a hard throw via scripting (500 mixed note+reshape ticks
  clean), so made it defensive — the rAF loop wraps `update()` and `draw()` in try/catch (one bad tick
  can never kill the loop = never "frozen while the worm keeps moving"), and the fixed-timestep guards
  `now`/`dt`/`_acc` against NaN so it can't permanently stall. Any future throw now logs to console.
- **Tempo pill:** moved from far-right (riding the Clear button) to centered under the dice row;
  turtle/rabbit bumped 17→24px; slime toggle dropped below it so they don't stack.
- **Slime crowd rework:** was hiding all side chillers in play (only 2 visible). Now `fillMargins()`
  computes a crowd in the space BETWEEN the side candy buttons and the tank (reserves the button
  column, recomputes on resize). Wide desktop = a full crowd; phones skip the too-tight margins and let
  the tank-edge peekers carry it (no clutter/overlap).
Passed dev-loadtest. Backup: index-20260725-135531-shapefix-tempo-slimes.html.

### Entry 23 — Editable BPM field + one tempo brain (2026-07-23)
- **Typed tempo (studio):** DAW-standard editable number box (Ableton/Logic convention — type or drag,
  shows 2 decimals) next to the tempo slider. Sliders stay whole-number (coarse); the box does the fine
  0.01 tuning. Clamps 40–220, garbage → 80.
- **One tempo brain, `setBpm()`:** slider drag, typed box, turtle/rabbit, arrow keys, AND MIDI clock all
  route through it. It sets S.bpm (2-decimal), the tempo-synced DELAY (dotted-8th = 60/bpm*0.75, glided
  via setTargetAtTime 150ms so no crunch), and syncs every control. Removed the old duplicate mirror
  handlers + bindRange. Sim-verified: 120→0.375s delay, 128.50 keeps decimals, clamps, delay tracks tempo
  incl. MIDI clock. Passed dev-loadtest (LOAD OK).
Backup: index-20260723-091821-tempo-numbox.html.

### Entry 22 — Fixed-timestep physics + play tempo + slime/button overlap (2026-07-23)
- **Ball speed now device-independent.** Physics ran once per drawn frame, so a 30fps phone moved balls
  half as fast as a 60fps desktop (and 144Hz ran too fast). Split the tick into `simTick()` and drove it
  from a **fixed-timestep accumulator** (60 Hz, max 5 catch-up ticks, backlog dropped on stall). Audio
  stays per-frame (already time-based). Sim: 60/30/144fps all → ~300 ticks / 5s. Ball-hit note timing now
  matches across devices too.
- **Play tempo control** (mobile + desktop): 🐢 slider 🐰 — the standard kids-music tempo metaphor
  (turtle=slow, rabbit=fast; metronome is the grown-up symbol). Glass pill under Clear, top-right, synced
  with #bpm and #bpmTop three-ways.
- **Side slimes no longer block the candy buttons:** `.mode-play #slimes .chill{display:none}` — the
  side-parked chillers step aside in play (the wave/drum buttons are the new side decoration); peekers
  around the tank stay.
- Verified via dev-loadtest.js (LOAD OK) + timestep sim before shipping.
Backup: index-20260723-090939-fixedstep-tempo-slimefix.html.

### Entry 21 — Capacitor app scaffold + native MIDI bridge (2026-07-22)
Decision: app-wrap (Capacitor) over VST — reuses the whole web app verbatim AND fixes the mobile-MIDI
wall (WKWebView has no Web MIDI, same as Safari; native CoreMIDI bridges around it). VST/AU stays the
parked Rust pro-product.
- Web bones get ONE tiny hook: `window.slimeMidiIn = d => midiMsg(d)` — a wrapper feeds MIDI bytes in;
  no-op in a browser.
- New `app/` subfolder = Capacitor project (verified CLI 8.4.2 installs clean): `capacitor.config.json`
  (io.flahmusic.slimehedron), `package.json`, `www/` (copy of index/learn/sw/manifest/icons +
  `midi-bridge.js`, script tag appended to the www copy only — source index.html stays clean).
- `native-midi/NativeMidiPlugin.swift` = iOS CoreMIDI input plugin (UMP reader, auto-connects all
  sources, hot-plug via MIDIClient notify) → `notifyListeners("midi",{bytes})`.
- `native-midi/midi-bridge.js` = JS shim: `Capacitor.Plugins.NativeMidi` → `window.slimeMidiIn`.
- README has exact build steps (npm i → cap add ios/android → drag Swift in → run). Android Kotlin
  plugin noted as the parallel follow-up. Full iOS build/test needs the user's Mac + Xcode (sandbox
  can't compile native).

Research (Bar & Neta / curve-appeal literature): young kids prefer round, curved, symmetric shapes
(safety instinct); circle is the ideal, but our mechanic needs walls-as-notes. So: near-round high-sided
polygons + the culturally-beloved heart & star lead the PLAY cycle (KIDCYCLE = heart,12,star,8,6,10,5,rhombus).
- `shapeVerts()` registry: numbers 3–12 = regular polygons; names = heart (parametric curve, 18 pts),
  star (5-point), rhombus, trapezoid, parallelogram. Add a case → new shape, no other wiring.
- **Concave-safe collision**: inward normals now set by centroid direction (correct for star/heart since
  their centroid sees every wall's interior side), and ball containment switched to ray-casting
  point-in-polygon (`inPoly`) so spikes and the heart dip behave. Sim-verified: star tip inside, star
  notch outside, heart body inside, heart dip outside, square normals inward.
- Shape select gains ♥ ★ ◆ ▱ ▰; studio random pool includes them; play leads with rounded/loved shapes.
- Left ELI5 "tweak me" comments on shapeVerts/KIDCYCLE for the human.
Backup: index-20260722-234126-shapes-heartstar.html.

### Entry 19 — Unified division menu + play-mode candy buttons (2026-07-22)
- **One division menu (studio):** the word-based feel dropdown + the numeric subdivision segment +
  the dotted/triplet toggles collapsed into a single `#divSel`: 1/2, 1/4, 1/8, 1/8T, 1/16, 1/16T, 1/32
  (T = triplet). It drives the note grid (S.div) AND the drum feel together; old rows hidden but kept
  for save/load compat. No more numbers-vs-words confusion.
- **Play mode side candy buttons** (fill the empty side space, desktop + mobile): LEFT = 4 glossy
  pastel oscillator-wave buttons (sine/tri/saw/square, each a soft SVG wave in its own pastel), RIGHT =
  4 drum-kit buttons (drum icon + pastel number 1–4 = chiptune/conga/bossa/rock; tap again to stop).
  All round (24px radius), inset+drop shadow gloss, sheen overlay, backdrop blur — matches the logo
  language, zero sharp corners. Verified the glass/gloss look in-browser.
Backup: index-20260722-232808-division-candybtns.html.

### Entry 18 — Direct chord override, transport decouple, chromatic, shapes, pop drama (2026-07-22)
- **MIDI clock stops hijacking the transport.** Arps (MiniFreak etc.) blast Start/Stop on every
  phrase, which was start/stopping the whole app. Now clock = TEMPO ONLY: 0xFA/0xFB/0xFC no longer
  touch play/pause. Only the top pause stops it — drums/band vibe out when you stop playing.
- **Chord follow is now a DIRECT override, not a histogram guess.** Human notes (MIDI or on-screen
  keys) record scale-degrees; `manualRoot()` triad-matches {r,r+2,r+4} to what you actually played and
  flips the chord ON the keypress (not next bar). Verified: C-E-G→C, E-G-B→Em, F-A-C→F. While you're
  playing, pickChord's weighted roulette is bypassed entirely and keyJourney won't drift the key —
  physical input owns the harmony (incl. under slime mode). Auto resumes ~1.6s after hands off.
- **Chromatic is studio's default** (all 12 notes — no "major scale BS off the rip"); still selectable
  everywhere (it was already in SCALES).
- **Shapes:** removed circle (no walls = no notes, killed the vibe). Now triangle→dodecagon (3–12),
  teaching every regular polygon. Manual shots now fire on each note's OWN radial angle so they SPLAY
  evenly around the tank instead of clumping to one side on triangles/squares.
- **Burst pop drama back:** walls kick out hard on the finale (kick 2.6–4.8 + spin), then reel home
  fast (~0.45s free-fly, then strong pull) into the breathing collidable cage — dramatic AND no tunnel gap.
- **"even" → "straight"** (the real musical term; triplet stays triplet). Studio gets it straight.
Backup: index-20260722-230807-chordoverride-shapes.html.

### Entry 17 — MIDI persistence + learn, clock de-jitter, always-live cage, UI cleanup (2026-07-22)
- **MIDI device retained** across pages/refresh: saved by device NAME (index shuffles) in
  localStorage `slimehedron-midi` {dev,ch,clk,on}; channel/clock/on-state restored too. Set once, done.
- **Clock-sync fader de-jittered**: incoming clock BPM now EMA-smoothed (0.7/0.3) + a ±2 deadband
  + 300ms throttle before the fader moves. Sim: arpeggiator wobble that moved the thumb ~16×/sec
  now moves it ~1.3×/sec and settles; a real 120→160 change still tracks.
- **MIDI Learn** (studio, under clock sync): "＋ assign CC" → click any slider/select (dashed
  highlight) → wiggle a knob to bind it; mappings listed with ✕ remove, saved in `slimehedron-cc`.
  CC scales to each control's min/max (ranges) or option count (selects); CC1 still defaults to
  cutoff until mapped. Verified: CC0/127 → tempo 40/220, CC127 → 5-option select idx 4.
- **"straight" → "even"** (feel dropdown); triplet → "triplet swing" for clarity.
- **Removed the ⚡ perf and ▦ pixel checkboxes** from the header on all pages (unintuitive; auto-perf
  still engages on sustained slow frames). window.PIX pinned false.
- **Always-live geometry cage**: walls no longer shatter into short half-shards with gaps. Each edge
  becomes ONE full-length collidable wall that jostles/rotates loosely near the boundary during break
  (sim: stays within ~9–41px of R, never a hole) and glides home on reform — so notes bounce in every
  state (fill/break/reform), no more tunnelling through the "spawning" shape.
Backup: index-20260722-224846-midilearn-cage.html.

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

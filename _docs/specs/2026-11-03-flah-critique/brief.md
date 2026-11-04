# Flah's critique, 2026-11-03: play mode, the mix, and ALL of learn mode

Status: done (grilled 2026-11-04; spec.md and issues/)
Written by Cowork from Flah's voice notes. His words are quoted where the tone matters. Unit ids are from
`learn2.js`. Flah's verdict on learn mode: "that whole part is half-assed. Fix it and make it better."
Priority: this goes ahead of everything else on the web side. The FM-1 side track stays where it is
(`../2026-11-03-fm1-firmware/brief.md`).
Keep Flah posted with a short plain-words status after each ticket.

## 1. Play mode
1. **Slime on by default in play, with auto-notes OFF.**
   - Show a small bubble: "tap to play notes and spin the shapes". Plain words, no other copy.
   - On the first tap, the bubble moves to just below the tank and stays there as the auto-notes toggle.
   - This changes what the glossary and old suites say ("auto-notes: off in play", the tap invite). Update both in
     the same pass.
2. **Grey droplets are wrong.** The slime particles that splash off a wall should take a colour from the sounding
   chord, never grey.
   - Each key has its own hue, and the chord's quality sets the shade (major, minor, 7th, add9, ...).
   - One table, used by the droplets, the goo and anything else that shows "the chord colour".
3. **Richer chords in play:** add 7ths and add9 (and similar normal chords) to what play mode can pick.
4. **No "drone" in play.** "G drone" means nothing to a kid. Play mode uses normal chord names only. The drone
   harmony (`harm:'drone'` scales) and other specialist options go to an Advanced section in studio.

## 2. Drums and the mix
1. **Jazz kit:** the ride sounds like a note. Replace it with the hi-hat.
2. **Snare:** tune it a bit lower and give it a stick / rimshot character (Flah: "with some like sticks"). CHECK
   which kits this means: start with jazz, then any kit where the snare is high and thin.
3. **Bossa clave is far too loud.** Flah: "overwhelmed everything".
4. **A level pass on every kit and every part.** Melody, chords and bass must never be drowned by drums.
   - Research how mixes balance a lead against drums (sources, not guesses).
   - Then measure each kit's pieces and each part's loudness (LUFS / RMS per stem, from the app's own WAV tap) and
     set targets, e.g. drums no louder than X dB relative to the melody. Fix every kit to them.
   - Add a suite that renders each kit with the band and fails if a drum piece beats the target. Sabotage it with the
     old clave level.

## 3. Learn mode, the specific breakages
1. **The sequence lesson (second unit, `u_make`) doesn't sequence.**
   - It plays the first note, or all the notes at once on the first step.
   - Every other step plays only the drums and ignores the note the kid picked. You only hear notes while playing
     them by hand.
   - Fix: each step plays its own picked note in time, on loop. Add a test that renders the loop and checks the right
     pitch at each step.
2. **The voice.** "Atrocious", "a kid can't understand four words".
   - The current voice is the browser's built-in `speechSynthesis`, and it sounds different on every device.
   - It also spells capitals out ("TAP" read as letters, so "BOOM TAP" comes out wrong).
   - And it talks over the very sound the kid is told to listen to.
   - Decision in section 6. Until a better voice exists: no auto-play voice anywhere, and "listen" is a button the kid
     presses when ready.
3. **Say and play (`u_sayplay`).**
   - It re-explains on every round, and skipping the voice doesn't stick: it resets.
   - Explain once, then drill a few rounds with no talking. A skip lasts for the whole unit.
4. **Rebuild the rhythm lessons ("boom tap") as a drum grid, ear first.**
   - Use a step grid like the studio drum sequencer, not floating "boom tap" words.
   - Lanes: kick = purple, snare = red, hi-hat = yellow.
   - Each round:
     1. Count in 4-3-2-1 (visible and audible).
     2. The pattern plays.
     3. The kid places what they heard on the grid.
     4. NEXT checks it.
   - Right answer: "Good job!". Wrong: the lane with the mistake turns lilac, with "Close, listen and try again!".
   - No round repeats the same pattern. Flah: "doing boom tap tap boom 10 times in a row". Patterns vary and get a
     bit harder.
5. **Long and short (`u_howlong`):** the voice plays over the first note, so the length can't be heard. No voice
   over notes, nothing auto-plays, and the kid presses "listen" when ready.
6. **Count to four (`u_countbar`):** no time to get ready, and it relies on hearing a small metronome.
   - Add a lead-in.
   - Add a visual playhead that bounces along a 4/4 grid (one bar, four beats, and the steps inside them), so it works
     with the sound low.
   - Teach the grid so it makes sense later in a DAW.
7. **Play it again (`u_review`) shows nothing** after doing lessons. It must show what was learned and let the kid
   replay it.
8. **Back from a lesson leads to a dead, half-loaded play screen.** Back always goes to the learn map, fully loaded.
   Test it from every unit.

## 4. The logic pass: every learn unit (33), against these rules
Go unit by unit. For each one, write in the spec what it teaches, what the kid does, what's wrong, and the fix. The
rules come from Flah's callouts:
1. **It does the musical thing it claims.** A sequence plays the notes in order, a rhythm plays the rhythm, a
   replay replays.
2. **Hear first, then do.** Play the target, the kid answers, then check. Feedback: "Good job!" or
   "Close, listen and try again!", with the mistake highlighted in lilac.
3. **Explain once.** Later rounds drill without talking. A skip is remembered for the whole unit.
4. **Nothing ever sounds over a sound the kid must judge.** No auto-play; "listen" is a button.
5. **No identical rounds back to back.** Each round varies, and the difficulty climbs gently.
6. **Everything rhythmic has a visible grid and playhead, and a count-in.** It must work on mute. The same grid
   look as studio, so it carries over to a DAW.
7. **One drum colour code everywhere:** kick purple, snare red, hi-hat yellow.
8. **Every button leads somewhere real:** back, next, skip, replay. No dead screens.
9. **Copy:** short, plain, no capitals-as-sound tricks ("TAPTAP"), no flavour text.
10. **Proof per unit:** a suite plays it like a kid three ways (right answers, wrong answers, skip and back) and checks
    what is heard and seen. Use real-renderer screenshots. "It runs" is not a pass.
Units that can't meet the rules get merged or cut, and the spec says which and why. The Orff order stays (imitate →
explore → improvise → compose; `_docs` has the pedagogy notes).

## 5. Done means
- Every item in sections 1-3 fixed, each with a check that fails on the old behaviour.
- The section 4 table complete for all 33 units, every unit passing its three-way playthrough.
- The mix suite green on all 11 kits.
- Flah does one listen and one playthrough of learn mode, and signs off.

## 6. Questions for Flah (one round, recommended answers)
1. **The voice.** A: remove it (text on screen, a "listen" button for sounds). B: replace it with natural-sounding
   pre-recorded lines, made once with a high-quality open-source voice and shipped as small audio files, offline
   (CHECK the voice model's licence; it adds files to the app). C: you record the lines yourself.
   Recommended: A now, then B or C later if it's missed.
2. **Snare.** Lower and stick-like on the jazz kit only, or every kit with a thin snare? Recommended: jazz, plus any
   kit the mix measurement flags.
3. **Chord colours.** Key = hue and chord type = shade, same in play and studio? Recommended: yes.
4. **Learn units that fail the rules:** fix them all, or allowed to merge and cut weak ones? Recommended: allowed to
   merge or cut, the spec says which.

## 7. Answers (Flah, 2026-11-04)
1. A: the voice is removed; words on screen, and a "listen" button for every sound the kid must judge.
2. The snare goes lower and more stick-like on the jazz kit, plus any kit the mix measurement flags.
3. Yes: key = hue, chord type = shade, the same in play and studio.
4. Weak units may be merged or cut; the spec says which and why.

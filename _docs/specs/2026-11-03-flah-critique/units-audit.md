# Learn mode: every unit against the brief's 10 rules

Status: ready (input for the spec of `brief.md` section 4). Read-only audit, 2026-11-04, no code changed.
Sources: `learn2.js` (cited `L:n`), `index.html` (cited `ix:n`), `brief.md` sections 3-4. Rules are `R1`..`R10` as
numbered in brief section 4. Anything not provable from the code is marked UNVERIFIED. `ix:` numbers are from the
working copy of 2026-11-04, which another session was editing at the time: search the named function if a number is off.

**Unit count: 33** (`UNITS`, L:579-618): 29 with `tier:'lesson'`, 3 `tier:'game'`, 1 `tier:'practice'`. The map's
"Lessons N of 23" counts the 23 lessons that are not free play (`FREE_PLAY`, L:2282, L:2288).

## A. Shared engines (most rows point here)

| Engine | Used by | Facts that break rules |
|---|---|---|
| **Voice**: `stage()` -> `sayScreen()` -> `speech()` (L:448-457, L:325-335, L:307-320) | every unit | Every repaint reads all `.lgSay`/`.lgDone` text aloud, deduped only against the LAST thing spoken (L:309). Any other `speech()` call (L:709, L:1149, L:1391) overwrites `_lastSaid`, so the next repaint re-reads the whole instruction. `_lastSaid` is cleared on every unit entry (L:2393, L:2397) and on title change (L:456). No per-unit skip exists. Voice on/off is one chip on the map only (L:2361, L:2390), saved in localStorage (L:322). `index.html` never touches `speechSynthesis` (grep: 0 hits), so the app's mute does not silence it (UNVERIFIED on device, but nothing in code links them). |
| **Auto-play after paint** | all scored units | The sound to judge starts 260-420 ms after the repaint that starts the voice: howlong L:701, ladder L:1121 + L:1125, choice L:2157 + L:2156, staff L:1654, read L:824 + L:779, echo L:2244 + L:2237, sayplay L:1389-1392. So the voice talks over the first sound (R4). Only melody (L:1725) and compose (L:1979) wait for a "listen" press. |
| **Feedback copy** | all scored units | Right = random from `['got it','that is the one','you found it','yes']` (L:79), wrong = `notYet` (L:80) or `onceMore` (L:81). No "Good job!" / "Close, listen and try again!". Wrong marks: rung shake (`.lgRung.wrong`, ix:979), pink outline `#d4718f` (ix:951). Nothing is lilac anywhere (R2). After a wrong answer most engines move to a NEW question instead of a retry: ladder L:1150, choice L:2176, howlong L:713, staff L:1670, read L:799. |
| **`ladderUnit`** (L:1044-1186) | high, notes, home, steps, newhome, majorscale, minorscale, findhome | Explore first (free play, "ask me questions" L:1110, Orff stage 2: good). Then "tap the note you hear". Target picked at random with replacement (e.g. L:1427), so identical rounds back to back are common (R5). Wrong: shake on the tapped rung for 380 ms, the right rung is never shown (L:1136-1137). Rung tags `LOW` / `HIGH` in capitals (L:1100). |
| **`choiceUnit`** (L:2104-2182) | tempo, dynamic, brightdark, intervals, chords, minorshapes, modes, updown | Explore first (press each answer to hear it, L:2164). Then 2-3 big buttons. Plays both the `hear` and `doIt` lines aloud on entry (two `.lgSay`, L:2136 + L:2138). Fixed stimuli: several units have only 2-4 distinct sounds (R5). Ruler revealed after the answer (L:2171): good. |
| **`readUnit`** (L:740-828) | countbar, rest, split, song | Rhythm notation, count numbers under each note, current cell lit, a click track, tap the slime pad. **No count-in**: beat 0 is the first note to tap (`t0=now+0.9`, L:779; click only for `bi>=0`, L:801-803). **Never plays the rhythm first** (R2). **No listen button** (paint L:767-776 has none). Click is fired from `requestAnimationFrame` at `AC.currentTime` (L:802-803), not scheduled ahead, so it jitters with frame rate. The lit cell moves up to 0.5 beat EARLY (L:805) while the tap window is 0.34 beat (L:816): a child who obeys "Tap each note as it lights up" (L:134) taps ~300 ms early on a quarter note and misses. Extra taps are never penalised (judge only marks the nearest onset, L:813-819), so mashing the pad passes any bar without rests. A miss draws a new random bar (L:799). |
| **Drum sounds / colours** | pulse, howlong, read*, make, rjam | Voices are `dHit` codes (ix:3018): `K` kick, `s` snare, `h` hat, `c`/`C` low/high tom (ix:3040). No unit has kick/snare/hat lanes. No colour code anywhere: rjam pads use note colours `degTint(0/2/4)` = mint `#9fe6cf`, lilac `#c4a9f5`, yellow-green `#d9e88f` (L:1856, L:1016-1025); sayplay buttons lavender `#b9aee0` / mint `#9fe6cf` (L:1385-1386); studio's step grid paints every lane the same purple-mint gradient (ix:1295). R7 fails everywhere it applies. |
| **Ending** `finish()` (L:521-540) | all but review | Fanfare starts at 0 ms (L:526) and the voice reads "you did it! + name line" over it (L:529-534). Name lines are full of capitals (BEAT, DURATION, QUARTER, STAFF, TEMPO, BPM, ...: L:95-188). Buttons: next unit by ARRAY order (L:525, L:537), again (L:538), back (L:529). |

## B. The table (array order, L:579-618)

`Orff` = imitate / explore / improvise / compose. Verdict: keep, fix (one line), merge, cut.

| # | id | Title | Claims to teach | What the kid does (code) | How it checks | Rules broken (cites) | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | pulse | Steady Beat | the beat | Slime balls fall on a 120 BPM kick (L:1251-1290); tap the pad as one lands (L:1293) | Tap within 0.30 beat of a beat (L:1221, L:1301); 8 in a row, a miss resets to 0 (L:1314); never calls `score()` | R4 voice reads the instruction over the kicks (L:1326 paint, beat at +0.6 s L:1327). R6 no grid, no count-in (ball is a visual lead only). R9 "BEAT" caps in name (L:250). | **keep/fix**: silent start, a 4-3-2-1 count-in on the ball lane, drop the run reset (count total hits). Orff: imitate. |
| 2 | make | Make a Loop | four beats of your own | 5 note pads; a tap snaps to the nearest of 8 eighth slots (L:953-958); loop with kick/hat/snare (L:924-936); keep / start again / all done | Nothing scored; "keep" counts a loop (L:970-973) | **R1: the loop does not sequence.** `bar()` schedules drums at each slot time but calls `note(...)` for every filled slot in the same loop (L:933); `note()` -> `playSynth(freq,vel,imp,hold,firm)` has no start time and starts at `AC.currentTime` (ix:2687, ix:2698). So every picked note sounds at once ~80 ms before beat 1 (L:940). R6 ring of 8 dots, no beats/lanes, no count-in (L:912, L:985). R4 voice over the loop. R8 "keep it" with an empty grid does nothing, silently (L:971). | **fix**: give `playSynth` (or a lesson wrapper) a start time and schedule each slot's note at `t0+i*SLOT`; test the rendered loop's pitch per step. Move to the END of block A (Orff: compose). |
| 3 | sayplay | Say It, Play It | say a rhythm before playing it | Watches BOOM/TAP words light up while each is spoken and played (L:1388-1394), then taps BOOM / TAP buttons in order (L:1399-1414) | Each tap vs `pat[idx]`; a wrong tap replays the same pattern (L:1406-1407); 10 patterns | **R1** "BOOM is the low drum" but it plays pitched synth notes `sing(0)` / `sing(2)` (L:1366, L:1392), not drums. **R4** speaks each word over its own sound (L:1391). **R3** re-explains every round (see C3). **R5** 5 patterns at random with replacement (L:1352-1358, L:1398): 1 in 5 back-to-back repeat. **R6** no grid/playhead timing, no count-in; timing is not checked at all, only order. **R7** lavender/mint (L:1385-1386). **R9** BOOM/TAP caps (L:157), spoken (L:1391). | **fix (rebuild)**: the brief's drum grid echo: kick/snare/hat lanes (purple/red/yellow), count-in, pattern plays, kid places hits, NEXT checks, lilac lane on a mistake, no repeat and slowly harder. Orff: imitate. |
| 4 | howlong | Long and Short | note duration | One note picture; a note rings for 1-4 counts over 4 ticking circles (L:686-697); pick 1/2/3/4 | Button == `NOTEV[kind]` (L:704); one answer per question (L:662); 10 right | **R4** auto-plays 260 ms after the repaint that speaks (L:701); after every correct answer it speaks the note name (L:709), which resets the dedupe, so the instruction is re-read over the next note too. **R5** 4 kinds at random, same pitch every time (L:656, L:692). **R6** circles exist but no count-in: kick on beat 1 together with the note (L:691-692). **R9** "a QUARTER note" etc. spoken (L:96-98). | **fix**: no voice, a "listen" button, count-in before the note, no same kind twice in a row. |
| 5 | countbar | Count to Four | four beats to a bar | `readUnit` with 6 fixed bars (L:727, L:829-832): tap the pad on each note | Every note onset hit within the window (see A, readUnit); 10 clean bars | **R1** "tap on the big numbers, count the small ones" (L:131) but a tap on a small number is never penalised (L:813-819), and mashing passes. **R2** never plays the bar first. **R6** no count-in (L:779-803), no bouncing playhead on a 4/4 step grid. **R4** voice over the first bar. **R5** 6 bars at random (L:831). R8 no listen. | **fix**: the brief's 4/4 grid with a playhead, count-in, hear the bar first, judge extra taps. Same grid as the rebuilt sayplay. |
| 6 | rest | Leave a Gap | rests | `readUnit`, 6 bars with quarter rests (L:730, L:991-994) | Rest cells start correct; a tap near one un-marks it (L:782, L:818) | Same as countbar (R2, R4, R5, R6, R8). Cursor-early bug (L:805) applies. | **fix**: same engine as countbar, rests shown as empty grid steps. |
| 7 | song | Read a Rhythm | a real tune, played as its rhythm | `readUnit` on 2 bars of Hot Cross Buns or Mary (L:735-738, L:995-998) | As countbar; 6 clean bars | **R1** the tune is never heard: `readUnit` only plays clicks. **R5** 2 songs at random: 50% identical rounds (L:997). R2, R4 (title line is `.lgSay`, L:772, re-spoken when the song changes), R6, R8 as countbar. | **merge into countbar/rest** as their last round, playing the real melody on the grid first. One engine, one less stone. |
| 8 | split | Two in One Beat | eighth notes | `readUnit`, 6 bars with eighths (L:733-734, L:841-844) | As countbar; eighth window 0.10 s (L:816) | As countbar. Cursor runs 0.3 beat early on an eighth vs a 0.17-beat window (L:805, L:816): following "as it lights up" misses. | **fix**: same grid engine at eighth steps. |
| 9 | tempo | Fast and Slow | tempo | Hears 8 fast or 4 slow notes (L:854-855), picks fast / slow | Button == pick; 10 right; key roams (L:850) | **R4** voice over the first sound (A). **R5** 2 fixed patterns (L:853-855). **R1** fast also has twice the notes and shorter notes (L:854), so it can be answered by count. **R9** "BPM" caps in name (L:120). | **keep/fix**: same note count both ways, vary BPM pairs per round, listen button. Move to just after pulse (ear first, easiest). |
| 10 | dynamic | Loud and Soft | dynamics | Hears do-mi-so-mi at vel 118 or 42 (L:865-866), picks loud / soft | Button == pick; key roams | R4, R5 (2 fixed stimuli, L:864-866). R9 "PIANO", "FORTE" caps (L:124). Whether vel 42 is clearly soft after the mix bus: UNVERIFIED. | **keep/fix**: listen button, vary the phrase per round. |
| 11 | rjam | Your Turn: Drums | improvising a beat | Groove loops (L:1870-1886); app plays 5-8 random tom/hat hits (L:1889-1899); kid taps low/high/shake (L:1904-1918) | Nothing (by design) | **R4/R3** each turn repaints and speaks "Listen. Then it is your turn." over the call, every round (L:1890, L:1862). **R6** 8-dot playhead (L:1857) but the call's hits are not drawn on it; no count-in. **R7** pads are toms + hat in note colours (L:1846, L:1856). | **fix**: kick/snare/hat pads in purple/red/yellow on the same grid, draw the call on it, voice once. Orff: improvise (before make). |
| 12 | high | High and Low | pitch | Ladder of 2 rungs "low" / "high" (L:1426); hears mi then do or la (L:1428) | Rung == target | R4 first question (A). **R5** 2 targets at random: 50% repeats (L:1427). R9 `LOW`/`HIGH` caps tags (L:1100). | **keep/fix**: no repeats, listen button. Absorb `updown` as phase 2. |
| 13 | notes | Five Notes | major pentatonic | Ladder grows 2 -> 3 -> 4 -> 5 rungs every 3 right (L:1435-1443); tap the note you hear | Rung == target; 12 right | **R4** phase lines are spoken (L:1149) and the next note plays 780 ms later (L:1150), over the voice. R5 random targets. | **keep/fix**: phase change is shown, not spoken; no repeats. |
| 14 | home | The Home Note | the tonic | Phrase leans down or up (L:1454-1461); tap low do or high do (L:1465) | Rung == target; mi/so are rungs that are never right | R4, R5 (2 targets x 3 phrases). | **keep/fix**: absorb `findhome` (more phrases, roaming key) as phase 2. |
| 15 | steps | Step or Jump | steps and skips | Hears "from" then target (L:1476); taps the target rung | Rung == target (L:1475) | **R1** never asks step vs skip; it is find-the-note again. The line "Go up one note at a time." (L:170) contradicts targets that go down or skip (L:1473). R4, R5. | **fix**: two buttons "step" / "skip" (choice engine), ruler shows the gap after. |
| 16 | jam | Your Turn: Five Notes | improvising | App plays 2-4 notes with rungs lit (L:1801-1815), then a 2-bar turn, repeat | Nothing | **R3/R4** "Listen. Then it is your turn." / "Your turn. Play anything." alternate, so both are spoken every round, the first over the call (L:1802, L:1792). **R1** comments promise "the same groove" (L:1762-1763) but no groove is scheduled (no `dHit` in L:1766-1839); the turn length is invisible. | **fix**: voice once, a soft drum groove plus a visible turn bar. Orff: improvise. |
| 17 | newhome | A New Home Note | relative minor | Ladder in minor pentatonic, root shifted +9, key roams with do first (L:1481-1486) | Rung == target | **R1** "same five sounds" but rungs relabel as do me fa so te (`solfegeFor` on the new root, L:1088-1091; `pentaMin` = 0,300,500,700,1000, ix:2485), and the roam moves the pitches anyway (L:1081-1082). R4, R5. | **fix**: first play the major five, then the same five with la as home, same labels; then quiz. |
| 18 | majorscale | Seven Notes | major scale | Ladder 6 then 7 rungs with letters (L:1490-1496) | Rung == target; 12 right | R4 (phase line spoken L:1149 then note), R5. | **keep/fix**: no voice over the note, no repeats. |
| 19 | brightdark | Bright and Dark | major / minor | Hears an arpeggio then the chord (L:1510-1512); picks major / minor | Button == pick | **R4** two lines (L:177-178) spoken on entry, ~5 s, over a 2.7 s sound. **R5** exactly 2 sounds, no roam (L:1502-1505). | **keep/fix**: roam the key and vary the inversion, listen button. |
| 20 | intervals | Two at Once | intervals | Hears a 2nd or a 5th together (L:1525-1526); picks | Button == pick | R4, **R5** 2 fixed sounds, no roam (L:1520-1523). | **merge into chords** ("how many notes", then "how wide"): same screen, both have 2-3 fixed stimuli. |
| 21 | chords | Three at Once | chords | Hears 1, 2 or 3 notes on the same bottom note (L:2034-2039); picks one/two/three | Button == pick | **R5** 3 fixed sounds, always the same bottom note (L:2035-2038). R4. R9 name says "The band plays them behind you the whole time" (L:224) but learn turns the band off (L:2126). | **keep/fix**: vary root and voicing; take `intervals` as phase 2. |
| 22 | jammaj | Your Turn: Seven Notes | improvising, major | `jamUnit` with 7 notes (L:603) | Nothing | As jam. | **fix** as jam. |
| 23 | minorscale | Seven Dark Notes | natural minor | 7-rung ladder, letters, roam (L:1535) | Rung == target | R4, R5. | **keep/fix**. |
| 24 | minorshapes | Raise a Note | harmonic / melodic minor | Hears scale degrees 5-6-7-8 in a roaming key (L:1546-1547), picks one of 3 | Button == pick | R4. No tonic is played before the 4 notes (choice engine has no anchor, L:2151-2156), so the answer must come from interval shape alone. R5 3 stimuli. | **fix**: play the tonic and the lower half first. Candidate to **cut** if a playtest shows kids cannot hear it (decision for Flah). |
| 25 | modes | More Scales | Dorian / Mixolydian | Hears a 7-note scale then a 7th chord (L:1559-1561), picks one | Button == pick | R4, R5 (2 stimuli). Copy is grown-up theory (L:188). | **keep/fix**, same candidate-cut note as minorshapes. |
| 26 | jammin | Your Turn: Dark Notes | improvising, minor | `jamUnit` minor (L:608) | Nothing | As jam. | **fix** as jam. |
| 27 | staff | Five Lines | the staff | A note is drawn on the staff and plays (L:1643, L:1653-1654); tap a line or space | Tapped position == target | **R1** the target note is drawn BEFORE the answer (L:1643; `.stNote` has no hidden state, ix:952-959), so "Tap the note you hear" (L:108) is a tap on the visible note; no listening or reading needed. R4, R5 (8 positions). | **fix**: hear it with nothing drawn, place it, then show it. Or flip it: see the note, press its key. |
| 28 | melody | Read a Tune | reading a melody | Staff phrase; press letter keys left to right (L:1700-1745) | Key == next note | R5: Hot Cross Buns has 3 identical phrases out of 4 (L:1687), random pick (L:1699). Wrong = quiet wrong note + "one more round", no lilac (L:1742-1743). Good: no auto-play, listen button (L:1722, L:1725). | **keep/fix**: no same phrase twice in a row. |
| 29 | compose | Write a Tune | composing | Press letters, notes go on the staff, hear it, keep (L:1946-2005) | Nothing (needs 3+ notes to keep) | Kept tunes are thrown away (L:1993), so review can never replay them. R9 "Press a letter" for pre-readers (L:212). | **keep/fix**: save kept tunes for review. Orff: compose. |
| 30 | echo | Copy Me | ear training | App plays 2-4 notes with rungs lit (L:2236-2240); kid taps them back | Each tap == phrase[step]; a wrong tap replays the same phrase (L:2253-2254); 5 right, longer every 2 (L:2261) | **R3/R4** the two lines alternate, so each round re-speaks "Listen to the little tune." over the tune (L:2237, L:2227). | **keep/fix**: voice once. Move next to `notes` (imitate). |
| 31 | updown | Up or Down | melodic direction | Hears 2 notes (L:2191-2193), picks up / down | Button == pick | R4, **R5** 4 possible sounds, no roam (L:2190-2191). | **merge into high** as phase 2 (same idea: pitch direction). |
| 32 | findhome | Find Home | the tonic | Same job as home with 6 rungs and a roaming key (L:2196-2202) | Rung == target | Duplicate of home (same `leanHome`, L:2201). R4, R5. | **merge into home** as phase 2. |
| 33 | review | Play It Again | things learned earlier | A shelf of due lessons; tap one to re-run the whole lesson (L:2043-2080) | Nothing itself | **R1/R8** shows nothing on the day you learn (see C4); the empty screen is a dead end with only back (L:2046-2054). Replays whole lessons, never what the kid made. | **fix**: show every finished unit at once (no 24 h wait, no 80% gate for listing), plus kept loops and tunes to replay. |

Proposed count after merges: 33 -> 29 (song, intervals, updown, findhome folded in). No straight cuts; minorshapes and
modes are the cut candidates if they fail a playtest.

## C. The specific flags

**C1. Voice auto-play, every call site.** `speech()` L:307. Callers: `sayScreen()` from every `stage()` (L:457),
`setVoice(true)` (L:323), the "say it again" button (L:2389), howlong right answer (L:709), ladder phase change
(L:1149), sayplay per word (L:1391). Over a sound the kid must judge: howlong (L:701), every ladder unit's first
question (L:1121), every phase change (L:1149-1150), every choice unit's first question (L:2157), staff (L:1654),
read units' first bar (L:824), sayplay every word (L:1391), echo / jam / rjam every call (L:2237, L:1802, L:1890),
finish over the fanfare (L:526-529). Capitals are read by the browser voice: whether it spells "TAP" / "BPM" as
letters depends on the device (UNVERIFIED; brief says it does).

**C2. Rounds that can repeat identically**: every `pick` uses `Math.random()` with replacement, and no engine
remembers the last round. Worst: chords (3 sounds, L:2031), brightdark / intervals (2 each, no roam), high (2
targets), song (2 songs), melody (Hot Cross Buns phrases 1, 2, 4 are the same, L:1687), sayplay (5 patterns).

**C3. How sayplay's "skip" resets.** There is no skip control in the code. Within a round, `play()` repaints
(L:1389-1390), which speaks the full instruction, then `speech(word,true)` (L:1391) cancels it and becomes
`_lastSaid`. When the kid's turn starts, the line changes to "Say it out loud, then tap it out." and is spoken in
full (L:1393 -> L:1382). Next round the line changes back, so it is spoken again. So every round re-explains, and
nothing remembers a skip: `_lastSaid` is cleared on every entry (L:2393, L:2397) and is the only state. The only
lasting control is the map's voice chip (L:2361), which is all-or-nothing. A tap during the demo is ignored
(`mine` guard, L:1399), so the kid cannot skip the demo either.

**C4. Why review shows nothing.** `due()` (L:367-369) lists only units that are (a) `tier:'lesson'`, (b) `got()`:
8+ tries AND 80%+ right (L:361), and (c) last finished 24 h+ ago. (c) means a same-day check is always empty, and
the empty card literally says "Come back tomorrow" (L:233). (b) is worse: `seen()` tops up tries only when there
were fewer than 8 (L:364), so a child who finished with, say, 10 right in 16 tries (62%) is never "got": the lesson
never shows on the shelf and never gets a tick on the map (L:2326). Read units score every note (L:791), so they
fall under 80% easily. Games are excluded by (a). Kept loops (L:975) and tunes (L:1993) are not saved anywhere.

**C5. Does u_make schedule each step's note?** No (row 2). Drums yes (`dHit(v,t,...)` takes a time, ix:3018);
notes no (`playSynth` has no time argument, ix:2687, starts at ix:2698). `_dev/dev-make.js` counts oscillators
(lines 15-17), which proves the notes run, not when: the CODING_STANDARDS "measure the output, not the call" case.

**C6. Back, next, skip, replay.** Lesson back = `data-a2="home"` (e.g. L:668) -> click handler L:2388 ->
`speechStop(); home()` -> runs the unit cleanup, `LAB.give()`, draws the map (L:2310-2364). So in code, back goes
to the map. The map's own top-left "← back" (`#exitMode`, hidden on lesson screens by ix:846) wipes the saved mode
and reloads to the splash (ix:6776). The app makes no history entries (no `pushState`/`popstate` in `index.html`),
so a phone's back button leaves the page. **Flah's "dead, half-loaded play screen" could not be reproduced from the
code: UNVERIFIED.** Leads: (1) the phone/browser back button (not wired); (2) units that rebuild `innerHTML`
while the kid's finger is down (sayplay every 620 ms, L:1390; echo, jam, rjam on each turn) can swallow the back
`click`, because the pressed node is gone at release (UNVERIFIED, browser-specific); (3) `LAB.give()` clicks the
real drum/band buttons to restore them (ix:7052-7053), which can start the transport (ix:6612, ix:6638) behind the
map. Needs a browser repro from every unit (brief 3.8). Other dead ends: read units have no listen button (L:767);
review's empty card (L:2046); finish's "next" follows array order, so compose -> echo and findhome -> review
(L:525). make's "keep it" on an empty grid does nothing (L:971).

**C7. Rhythmic units with no grid / playhead / count-in.** pulse (ball, no grid), sayplay (no timing at all),
howlong (circles, no count-in), countbar / rest / song / split (notation and a lit cell, no count-in, early cursor),
make and rjam (8-dot ring, no beat numbers, no lanes, no count-in). None looks like studio's step grid
(ix:1275-1308). None works on mute except pulse and the read units' lit cell.

**C8. ALL-CAPS sound words.** `sp_low:'BOOM'`, `sp_high:'TAP'` (L:157), spoken (L:1391) and inside the spoken
`sp_hear` (L:158). Rung tags `LOW`/`HIGH` (L:1100, L:1787, L:2221). Note names `QUARTER`, `HALF`, `DOTTED HALF`,
`WHOLE`, `QUARTER REST` (L:96-98), spoken (L:709). The concept word is in caps in every `_name` line (L:95-241),
spoken at the end. No "TAPTAP" string exists in the code.

## D. Proposed order (Orff kept inside each block: imitate -> explore -> improvise -> compose)

- **Rhythm** (one drum-grid engine, ear first): pulse, tempo, dynamic, sayplay (rebuilt as the drum-grid echo),
  countbar (+song), howlong, rest, split, rjam, make.
  Today make sits at #2 on purpose (comment L:869-884, retention data). Moving it to the end of the block undoes
  that choice, so it needs Flah's yes and an ADR.
- **Pitch**: high (+updown), notes, echo, home (+findhome), steps, jam.
- **Scales and harmony**: newhome, majorscale, brightdark, chords (+intervals), jammaj.
- **Minor and modes**: minorscale, minorshapes, modes, jammin.
- **Reading**: staff, melody, compose.
- **review**: one stone, always shows what has been finished.

## E. Not checked by a machine here

- R10 (a three-way playthrough per unit): no suite does right / wrong / skip-and-back per unit today. Existing learn
  suites to update when behaviour changes: `dev-make`, `dev-lessons`, `dev-curriculum`, `dev-earwork`,
  `dev-explore`, `dev-review`, `dev-learnmap`, `dev-jam`, `dev-rjam`, `dev-compose`, `dev-staff`, `dev-audible`
  (which of them assert the old behaviour: not grepped line by line, UNVERIFIED).
- How any of this sounds (voice quality, vel 42 loudness, whether the early cursor feels early): UNVERIFIED.
- The dead play screen after back (C6): UNVERIFIED.

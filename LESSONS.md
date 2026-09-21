# Learn mode — one spec per lesson

Fifteen numbered lessons in four blocks, plus three games and a review. Down from nineteen: everything
that was two screens doing the same job with one more note on it is now one lesson that grows.

**The rule this file exists to enforce:** a lesson gets the interface its idea needs. Not the shared
one. The note tank encoded pitch as the angle of a polygon wall; a keybed encoded it as horizontal
position. Neither shows a child what *high* and *low* mean, and neither had any business in a lesson
about the beat. If a widget does not teach the thing, it is not on the screen.

As of this pass that rule holds with no exceptions: **the tank engine (`pitchUnit`) has been deleted.**
Nothing in learn mode renders into the side card any more — not the games, not review, not the ending.

## The five screens

| Screen | Built by | Used by | What it is |
|---|---|---|---|
| **Drop lane** | `pulseUnit` | 1 | A ball falls under gravity onto a floor line and squashes. One fixed pad underneath. Nothing else. |
| **Two drums** | `sayPlayUnit` | 2 | The pattern spelled out as the words you say — BOOM low on the line, TAP high — then two big drum pads to play it back on. |
| **Note values** | `noteValueUnit` | 3 | One big drawn note and four count circles that fill as it sounds. Four answer buttons. |
| **Bar reading** | `readUnit` | 4, 5 | A row of drawn notes read left to right, a 4/4 badge, bar lines every four counts, one **big** count per note played and small counts for the beats only held. A cursor walks it; one big tap pad. |
| **Pitch ladder** | `ladderUnit` | 6–11, 13–15, findhome, review | One fat rung per note, low at the bottom, high at the top. A listen button. Nothing else. |
| **Two choices** | `choiceUnit` | 12, up-or-down | Two big buttons. Used when the answer is a judgement about a sound, not a note to find. |

Echo is the one game with its own controller, because its answer is a *sequence* — but it is the same
ladder, the same rungs and the same rules.

## The numbers, and where they come from

| Decision | Value | Why |
|---|---|---|
| Beat tempo | **120 BPM** | A child's spontaneous motor tempo is 400–500 ms between taps (~120–150 BPM) — *faster* than an adult's ~100. Under-4s need a tempo within ~20% of their own to lock on at all. Slowing down makes it harder, not easier. |
| Beat cue | **falling ball, not a pulse** | Synchronising to a stationary flash needs ~460 ms between flashes to work — about 4× worse than audio. A ball on a realistic gravity path matches an auditory metronome (R = 0.946). |
| Lead time | **2 beats (1000 ms)** | Visual reaction time is ~200–250 ms — a third of a beat at 120 BPM. A beat presented only when it arrives cannot be hit. Commercial rhythm games give their easiest tier 1–1.5 s of approach. |
| Timing window | **±30% of a beat** | The one validated child-facing rhythm game starts deducting at ±1/6 of a beat, for ages 7–13, and 6–11 year olds are substantially more variable than adults. |
| Reading tempo | **100 BPM (0.6 s/beat)** | Slower than the beat lesson on purpose: reading a symbol and then acting on it is not the same task as entraining to a pulse. |
| Target | **fixed, ≥96 px** | Tapping a *moving* target succeeds 37% of the time at ages 4–6; a stationary one, 57%. |
| Input | **pointerdown** | A 4-year-old's tap can rest on the glass for 5.1 seconds. Timing on release is unplayable. |
| Instruction | **one line, narrated, task at the end** | Narration beats on-screen text (modality effect, g = 0.82). Removing extraneous material is the single best-evidenced thing in the multimedia literature (g = 1.00). |
| Reps per lesson | **≥10 scored attempts** | The mastery gate needs 8 attempts at 80% before it calls anything learned. The reading lessons score every **note**, not every bar — scoring the bar gave a five-bar lesson five data points and it could never be marked done. |

## Block A — beat and counting

Counting comes before pitch. Both source books are notation and counting from page one, and both
published Kodály sequences put pulse and rhythm ahead of any named note.

**1. Beat** · `?l=pulse` · drop lane
Teaches: there is a steady pulse under music, and you can feel where it lands.
Screen: a ball falls on every beat onto a dashed floor; one big slime pad below it.
Task: tap the pad when the ball lands. Eight in a row. A miss resets the run and says nothing.

**2. Say it first** · `?l=sayplay` · two drums
Teaches: saying a rhythm before you play it makes it easier. BOOM is the low drum, TAP is the high one.
The method is borrowed (konnakol, bols, kuchi shōga, gu-eum and usul all do this); the syllables are
English so the child is saying words they already own, and they still follow the acoustic logic —
voiced stop + back vowel low, voiceless stop + front vowel high.
The pattern is **shown as words** before it is heard, high words riding high on the line, so a child
who cannot read still sees the shape of it.

**3. How long?** · `?l=howlong` · note values
Teaches: a note tells you how long to hold it. Quarter = 1, half = 2, dotted half = 3, whole = 4.
This is the book's colour-the-circles exercise: one circle per count, filling in as the note sounds.

**4. Count the bar** · `?l=countbar` · bar reading
Teaches: four counts in a bar — FOUR FOUR TIME. Play on the big numbers, count the small ones.
That big/small convention is the percussion book's, verbatim.

**5. Play a song** · `?l=song` · bar reading
Teaches: you can read a written tune and play it. Hot Cross Buns and Mary Had a Little Lamb, both long
out of copyright. The block ends on a piece rather than a drill.

## Block B — first notes

**6. High and low** · `?l=high` · ladder, 2 rungs
Teaches: notes sit high or low. That is PITCH.
The rungs say **low** and **high**, not solfège — the child hears and answers before anything is named.

**7. Find the note** · `?l=notes` · ladder, grows 2 → 3 → 4 → 5
Teaches: so and mi, then la, then do, then re. **One new note per phase, never two.**
Was three lessons. The ladder adds a rung every three correct answers.
Ends on: DO RE MI SO LA — a PENTATONIC SCALE.

**8. Home note** · `?l=home` · ladder, 3 rungs
Teaches: one note finishes a tune. That is DO.
A phrase leans towards home and stops; the child lands it. The target is *not* shown — that is the exercise.

**9. Steps and skips** · `?l=steps` · ladder, 5 rungs
Teaches: next rung is a STEP, jumping one is a SKIP.

## Block C — more notes

**10. New home** · `?l=newhome` · ladder, 5 rungs, la-pentatonic
Teaches: the same five notes with a different one in charge sound completely different. The MINOR PENTATONIC.
Kodály Grade 2 — **this, not the major scale, is what comes after the major pentatonic.** Nothing new
to learn; everything sounds new.

**11. The major scale** · `?l=majorscale` · ladder, 6 → 7 rungs
Teaches: FA, then TI. Seven notes.
fa arrives a whole grade before ti in the Kodály sequence, so it still arrives first — as phase one.

**12. Bright and dark** · `?l=brightdark` · two choices
Teaches: major and minor are one note apart.
Plays the same three notes twice and moves only the middle one. Sits here and not at lesson 2 because
reliable major/minor discrimination arrives around ages 6–8.

## Block D — minor and modes

**13. Minor scale** · `?l=minorscale` · ladder, 7 rungs
Teaches: the MINOR SCALE. Its other name is AEOLIAN.

**14. Minor shapes** · `?l=minorshapes` · ladder, harmonic → melodic
Teaches: lift the seventh and you get HARMONIC MINOR; lift two and you get MELODIC MINOR.

**15. Modes** · `?l=modes` · ladder, dorian → mixolydian
Teaches: DORIAN is minor with a bright sixth. MIXOLYDIAN is major with a soft seventh.
At the ceiling on purpose — Trinity puts Dorian at Grade 7 and Mixolydian at Grade 8, ABRSM's piano
syllabus contains no modes at all, and the UK Model Music Curriculum never mentions one from Year 1 to
Year 9. Phrygian, Lydian and Locrian are deliberately absent: no primary-level syllabus lists them.

## Games and review

All three moved off the tank in this pass. A game is practice for a lesson, so it gets the lesson's screen.

**Echo** · `?l=echo` · ladder, sequence
The phrase is played *and shown* one rung at a time before the child repeats it — a five-year-old
cannot play back a tune they never saw. Grows 2 → 4 notes.

**Up or down** · `?l=updown` · two choices
Two notes, one after the other. Which way did it go.

**Find home** · `?l=findhome` · ladder, 5 rungs
The home lesson with all five notes on the ladder instead of three.

**Review** · `?l=review` · ladder
The rungs are the union of every due lesson's notes, so the ladder does not change shape mid-session.
What rotates is where each question comes from: one note from each due lesson in turn.

## Rules any new lesson has to keep

1. **One idea. One screen. One job.** If it is not teaching the idea, it is not on screen.
2. **No borrowed widget** unless the idea genuinely needs it.
3. **One new thing at a time.** A phase adds one note, not two.
4. **No fail state.** A wrong answer repeats the question. Nothing is taken away to create a motive.
5. **Narrate the instruction**, one line, with the thing to do at the end of it.
6. **Fixed targets, ≥44 px, registered on pointerdown.**
7. **One definition per string.** A second copy of a key later in `LANG` silently wins — that is how
   three live lessons spent months telling children to tap a "glowing wall" that had been replaced by
   the ladder. `dev-naming.js` fails the build on a duplicate now.
8. **`dev-playable.js` must pass** — it measures whether the lesson can be *done*, not whether it runs.

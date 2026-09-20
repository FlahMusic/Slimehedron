# Learn mode — one spec per lesson

Twelve lessons, down from nineteen. Everything that was two screens doing the same job with one more
note on it is now one lesson that grows.

**The rule this file exists to enforce:** a lesson gets the interface its idea needs. Not the shared
one. The note tank encodes pitch as the angle of a polygon wall; a keybed encodes it as horizontal
position. Neither shows a child what *high* and *low* mean, and neither has any business in a lesson
about the beat. If a widget does not teach the thing, it is not on the screen.

## The three screens

| Screen | Used by | What it is |
|---|---|---|
| **Drop lane** | 1 | A ball falls under gravity onto a floor line and squashes. One fixed pad underneath. Nothing else. |
| **Pitch ladder** | 3–8, 10–12 | One fat rung per note, low at the bottom, high at the top. A listen button. Nothing else. |
| **Two choices** | 9 | Two big buttons. Used when the answer is a judgement about a sound, not a note to find. |

Lesson 2 still runs on the syllable strip; it is the next one due a stage of its own.

## The numbers, and where they come from

| Decision | Value | Why |
|---|---|---|
| Beat tempo | **120 BPM** | A child's spontaneous motor tempo is 400–500 ms between taps (~120–150 BPM) — *faster* than an adult's ~100. Under-4s need a tempo within ~20% of their own to lock on at all. Slowing down makes it harder, not easier. |
| Beat cue | **falling ball, not a pulse** | Synchronising to a stationary flash needs ~460 ms between flashes to work — about 4× worse than audio. A ball on a realistic gravity path matches an auditory metronome (R = 0.946). |
| Lead time | **2 beats (1000 ms)** | Visual reaction time is ~200–250 ms — a third of a beat at 120 BPM. A beat presented only when it arrives cannot be hit. Commercial rhythm games give their easiest tier 1–1.5 s of approach. |
| Timing window | **±30% of a beat** (±150 ms) | The one validated child-facing rhythm game starts deducting at ±1/6 of a beat, for ages 7–13, and 6–11 year olds are substantially more variable than adults. |
| Target | **fixed, ≥96 px** | Tapping a *moving* target succeeds 37% of the time at ages 4–6; a stationary one, 57%. |
| Input | **pointerdown** | A 4-year-old's tap can rest on the glass for 5.1 seconds. Timing on release is unplayable. |
| Instruction | **one line, narrated, task at the end** | Narration beats on-screen text (modality effect, g = 0.82). Removing extraneous material is the single best-evidenced thing in the multimedia literature (g = 1.00). |

## The twelve

### Block A — first notes

**1. Beat** · `?l=pulse` · drop lane
Teaches: there is a steady pulse under music, and you can feel where it lands.
Screen: a ball falls on every beat onto a dashed floor; one big slime pad below it. No tank, no keys, no chrome.
Task: tap the pad when the ball lands. Eight in a row. A miss resets the run and says nothing.

**2. Say it first** · `?l=sayplay` · syllable strip
Teaches: saying a rhythm before you play it makes it easier. BOOM is the low drum, TAP is the high one.
The method is borrowed (konnakol, bols, kuchi shōga, gu-eum, usul all do this); the syllables are English so the child is saying words they already own, and they still follow the acoustic logic — voiced stop + back vowel low, voiceless stop + front vowel high.

**3. High and low** · `?l=high` · ladder, 2 rungs
Teaches: notes sit high or low. That is PITCH.
The rungs say **low** and **high**, not solfège — the child hears and answers before anything is given a name.

**4. Find the note** · `?l=notes` · ladder, grows 2 → 3 → 4 → 5
Teaches: so and mi, then la, then do, then re. **One new note per phase, never two.**
Was three lessons. The ladder adds a rung every three correct answers, so the screen never repeats itself.
Ends on: DO RE MI SO LA — a PENTATONIC SCALE.

**5. Home note** · `?l=home` · ladder, 3 rungs
Teaches: one note finishes a tune. That is DO.
A phrase leans towards home and stops; the child lands it. The target is *not* shown — that is the whole exercise.

**6. Steps and skips** · `?l=steps` · ladder, 5 rungs
Teaches: next rung is a STEP, jumping one is a SKIP.
The target walks up the ladder; a wrong rung sends it back to the bottom.

### Block B — more notes

**7. New home** · `?l=newhome` · ladder, 5 rungs, la-pentatonic
Teaches: the same five notes with a different one in charge sound completely different. That is the MINOR PENTATONIC.
Kodály Grade 2 — **this, not the major scale, is what comes after the major pentatonic.** Nothing new to learn; everything sounds new.

**8. The major scale** · `?l=majorscale` · ladder, 6 → 7 rungs
Teaches: FA, then TI. Seven notes.
fa arrives a whole grade before ti in the Kodály sequence, so it still arrives first — as phase one of the same lesson.

**9. Bright and dark** · `?l=brightdark` · two choices
Teaches: major and minor are one note apart.
Plays the same three notes twice and moves only the middle one. Sits at lesson 9 and not lesson 2 because reliable major/minor discrimination arrives around ages 6–8.

### Block C — minor and modes

**10. Minor scale** · `?l=minorscale` · ladder, 7 rungs
Teaches: the MINOR SCALE. Its other name is AEOLIAN.

**11. Minor shapes** · `?l=minorshapes` · ladder, harmonic → melodic
Teaches: lift the seventh and you get HARMONIC MINOR; lift two and you get MELODIC MINOR.

**12. Modes** · `?l=modes` · ladder, dorian → mixolydian
Teaches: DORIAN is minor with a bright sixth. MIXOLYDIAN is major with a soft seventh.
These are at the ceiling on purpose — Trinity puts Dorian at Grade 7 and Mixolydian at Grade 8, ABRSM's piano syllabus contains no modes at all, and the UK Model Music Curriculum never mentions one from Year 1 to Year 9. Phrygian, Lydian and Locrian are deliberately absent: no primary-level syllabus lists them.

## Rules any new lesson has to keep

1. **One idea. One screen. One job.** If it is not teaching the idea, it is not on screen.
2. **No borrowed widget** unless the idea genuinely needs it.
3. **One new thing at a time.** A phase adds one note, not two.
4. **No fail state.** A wrong answer repeats the question. Nothing is taken away to create a motive.
5. **Narrate the instruction**, one line, with the thing to do at the end of it.
6. **Fixed targets, ≥44 px, registered on pointerdown.**
7. **`dev-playable.js` must pass** — it measures whether the lesson can be *done*, not whether it runs.

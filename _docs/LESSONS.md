# Learn mode — one spec per lesson

Seventeen numbered lessons in four blocks, plus three games and a review.

**The rule this file exists to enforce:** a lesson gets the interface its idea needs. Not the shared
one. The note tank encoded pitch as the angle of a polygon wall; a keybed encoded it as horizontal
position. Neither shows a child what *high* and *low* mean, and neither had any business in a lesson
about the beat. If a widget does not teach the thing, it is not on the screen. The tank engine
(`pitchUnit`) has been deleted; nothing renders into a side card any more.

## Naming

**A lesson title is the concept's real name. The subtitle is the plain sentence.**

Checked against how [musictheory.net](https://www.musictheory.net/lessons) names its lessons — *Note
Duration, Rest Duration, Measures and Time Signature, The Major Scale, The Minor Scales, Scale
Degrees, Steps and Accidentals* — and against [Hoffman
Academy](https://app.hoffmanacademy.com/lessons/piano/unit-1/), which is aimed squarely at
six-year-olds and still says *Musical Alphabet*, *Half Notes*, *Rhythm Dictation* and *D Major
Pentascale* to them. Children are not harmed by the correct word. They are harmed by never being
told it, and then arriving at a piano teacher with a private vocabulary nobody else uses.

So: *How long?* → **Note Duration**. *New home* → **The Relative Minor**. *Bright and dark* →
**Major and Minor**. *Up or down* → **Melodic Direction**.

One term retired on purpose: **la-pentatonic**. It is Kodály-internal shorthand — you will find it on
[kodalyhub](https://kodalyhub.com/presto/item/la-pentatonic-scale) and in the
[BKA musicianship levels](https://kodaly.org.uk/wp-content/uploads/2015/01/MUSICIANSHIP-LEVELS-3-4.pdf)
and essentially nowhere else. The rest of the world, including
[Wikipedia](https://en.wikipedia.org/wiki/Pentatonic_scale), says **minor pentatonic**. So do we.

## The six screens

| Screen | Built by | Used by | What it is |
|---|---|---|---|
| **Drop lane** | `pulseUnit` | 1 | A ball falls under gravity onto a floor line and squashes. One fixed pad underneath. |
| **Two drums** | `sayPlayUnit` | 2 | The pattern spelled out as the words you say — BOOM low on the line, TAP high — then two big pads. |
| **Note values** | `noteValueUnit` | 3 | One big drawn note and four count circles that fill as it sounds. Four answer buttons. |
| **Bar reading** | `readUnit` | 4, 5, 6 | Drawn notes read left to right, a 4/4 badge, bar lines every four counts, one **big** count per note played and small counts for beats only held. A cursor walks it; one big tap pad. |
| **Pitch ladder** | `ladderUnit` | 7–12, 15–17, find the tonic, review | One fat rung per note, low at the bottom, high at the top. A listen button. |
| **Two choices** | `choiceUnit` | 13, 14, melodic direction | Two big buttons, plus an **interval ruler** that lights up *after* the answer to show the gap just heard. |

Call and Response is the one game with its own controller, because its answer is a *sequence* — but
it is the same ladder, the same rungs and the same rules.

## The two things that make this ear training and not slot memory

Both were measured failures. Both were silent — the app looked and behaved correctly while teaching
the wrong skill. `dev-earwork.js` exists to stop either coming back.

**The key moves.** Measured before the fix: *The Major Pentatonic* sounded **five distinct pitches
across sixty answered rounds**, every session, forever. The root was pinned to `LAB._saved.root` for
the whole visit, so pitches, positions and colours were all constant and a child could clear every
melodic lesson by remembering *which slot*, having never once compared two sounds. The app was using
moveable-do naming on a fixed-pitch instrument, which is the worst of both.

It is **ramped, not switched on**: lessons 1–10 hold one key so a beginner has something to anchor to;
from *The Relative Minor* onward the key moves between questions, which is the point by then. A
roaming lesson **sounds the tonic first** — a single isolated pitch cannot be named without absolute
pitch, so without a reference the question has no answer. Lessons whose answer *is* the tonic (Find
the Tonic) play a cadence instead, or the anchor would hand over the answer. Whatever key it lands
in, the tonic is pulled back inside MIDI 57–69 (A3–A4) — a low tone is genuinely harder to pitch-match,
and the starting key was never fixed in the first place, it inherited whatever the app was left on.

**Colour means a note.** Measured before the fix: `#a6c8ff` meant *high*, *so*, *mi*, *re* **and**
*me* depending which screen you opened, because the tint was indexed by the rung's position. A free
channel wired to noise, teaching a wrong association a child then has to unlearn. It is indexed by
**distance from the tonic** now — not scale position, which fails on the pentatonic (it skips the
fourth, so its fourth rung is the fifth of the key). A lowered degree keeps its natural's hue: me and
mi are both the third and should look like it.

## The numbers, and where they come from

| Decision | Value | Why |
|---|---|---|
| Beat tempo | **120 BPM** | A child's spontaneous motor tempo is 400–500 ms between taps (~120–150 BPM) — *faster* than an adult's ~100. Slowing down makes it harder, not easier. |
| Beat cue | **falling ball, not a pulse** | Synchronising to a stationary flash needs ~460 ms between flashes to work — about 4× worse than audio. A ball on a realistic gravity path matches an auditory metronome (R = 0.946). |
| Lead time | **2 beats (1000 ms)** | Visual reaction time is ~200–250 ms — a third of a beat at 120 BPM. A beat presented only when it arrives cannot be hit. |
| Timing window | **±30% of a beat** | The one validated child-facing rhythm game starts deducting at ±1/6 of a beat, for ages 7–13; 6–11 year olds are substantially more variable than adults. |
| Reading tempo | **100 BPM (0.6 s/beat)** | Reading a symbol and then acting on it is not the same task as entraining to a pulse. |
| Roaming range | **MIDI 57–69** | One singable octave, A3–A4, comfortable at either end. |
| Target | **fixed, ≥96 px** | Tapping a *moving* target succeeds 37% of the time at ages 4–6; a stationary one, 57%. |
| Input | **pointerdown** | A 4-year-old's tap can rest on the glass for 5.1 seconds. |
| Instruction | **one line, narrated, task at the end** | Narration beats on-screen text (modality effect, g = 0.82). Removing extraneous material is the best-evidenced thing in the multimedia literature (g = 1.00). |
| Reps per lesson | **≥10 scored attempts** | The mastery gate needs 8 attempts at 80%. The reading lessons score every **note**, not every bar. |

## Block A — Rhythm and Notation

Counting comes before pitch. Both source books are notation and counting from page one, and both
published Kodály sequences put pulse and rhythm ahead of any named note.

**1. Steady Beat** · `?l=pulse` · drop lane
There is a steady pulse under music and you can feel where it lands. A ball falls on every beat onto a
dashed floor; one big slime pad below it. Eight in a row. A miss resets the run and says nothing.

**2. Rhythm Syllables** · `?l=sayplay` · two drums
Saying a rhythm before you play it makes it easier. BOOM is the low drum, TAP is the high one. The
method is borrowed (konnakol, bols, kuchi shōga, gu-eum and usul all do this); the syllables are
English so the child is saying words they already own, and they still follow the acoustic logic —
voiced stop + back vowel low, voiceless stop + front vowel high. The pattern is **shown as words**
before it is heard, high words riding high on the line.

**3. Note Duration** · `?l=howlong` · note values
Quarter = 1, half = 2, dotted half = 3, whole = 4. The book's colour-the-circles exercise: one circle
per count, filling in as the note sounds.

**4. Measures and Time** · `?l=countbar` · bar reading
Four beats in a measure — that is 4/4. Play on the big numbers, count the small ones. That big/small
convention is the percussion book's, verbatim.

**5. Rest Duration** · `?l=rest` · bar reading
A rest is silence you count. Nothing new to operate: under a rest, *none* of the counting numbers are
big, which is the same convention already on screen. `dev-rest.js` proves the silence matters —
playing straight through the rests does not complete the lesson.

**6. Playing from Notation** · `?l=song` · bar reading
Hot Cross Buns and Mary Had a Little Lamb, both long out of copyright. The block ends on a piece
rather than a drill.

## Block B — Pitch

**7. Pitch** · `?l=high` · ladder, 2 rungs
The rungs say **low** and **high**, not solfège — the child hears and answers before anything is named.

**8. The Major Pentatonic** · `?l=notes` · ladder, grows 2 → 3 → 4 → 5
so and mi, then la, then do, then re. **One new note per phase, never two.** Ends on DO RE MI SO LA.

**9. The Tonic** · `?l=home` · ladder, 3 rungs
The note a melody rests on. A phrase leans towards it and stops; the child lands it. The target is
*not* shown — that is the exercise.

**10. Steps and Skips** · `?l=steps` · ladder, 5 rungs

## Block C — Scales and Harmony

**11. The Relative Minor** · `?l=newhome` · ladder, 5 rungs, minor pentatonic · **key roams**
The same five sounds with a different one as tonic. Kodály Grade 2 — this, not the major scale, is
what comes after the major pentatonic. Nothing new to learn; everything sounds new.

**12. The Major Scale** · `?l=majorscale` · ladder, 6 → 7 rungs · **key roams**
fa, then ti. fa arrives a whole grade before ti in the Kodály sequence, so it still arrives first.

**13. Major and Minor** · `?l=brightdark` · two choices
The third sets the quality. Plays the three notes as an arpeggio *and then as a chord* — before this
pass the one lesson in the course about a chord never played one. Sits here and not at lesson 2
because reliable major/minor discrimination arrives around ages 6–8.

**14. Intervals** · `?l=intervals` · two choices
The first time two notes are ever heard at the same time. A major 2nd against a perfect 5th is the
widest contrast in the subject — one beats and grinds, the other is hollow and open. The ruler lights
after the answer so the child hears the gap, decides, then sees it.

## Block D — Minor and Modes

**15. The Minor Scale** · `?l=minorscale` · ladder, 7 rungs · **key roams**
Natural minor. Its mode name is Aeolian.

**16. Harmonic and Melodic Minor** · `?l=minorshapes` · ladder · **key roams**

**17. Modes** · `?l=modes` · ladder, Dorian → Mixolydian · **key roams**
At the ceiling on purpose — Trinity puts Dorian at Grade 7 and Mixolydian at Grade 8, ABRSM's piano
syllabus contains no modes at all, and the UK Model Music Curriculum never mentions one from Year 1
to Year 9. Phrygian, Lydian and Locrian are deliberately absent: no primary-level syllabus lists them.

## Games and review

**Call and Response** · `?l=echo` · ladder, sequence
The phrase is played *and shown* one rung at a time before the child repeats it — a five-year-old
cannot play back a tune they never saw. Grows 2 → 4 notes.

**Melodic Direction** · `?l=updown` · two choices

**Find the Tonic** · `?l=findhome` · ladder, 5 rungs · **key roams, no tonic anchor**

**Review** · `?l=review` · ladder
Rungs are the union of every due lesson's notes, so the ladder does not change shape mid-session.
What rotates is where each question comes from.

## Rules any new lesson has to keep

1. **One idea. One screen. One job.**
2. **No borrowed widget** unless the idea genuinely needs it.
3. **One new thing at a time.** A phase adds one note, not two.
4. **No fail state.** A wrong answer repeats the question. Nothing is taken away to create a motive.
5. **Narrate the instruction**, one line, with the thing to do at the end of it.
6. **Fixed targets, ≥44 px, registered on pointerdown.**
7. **One definition per string.** A second copy of a key later in `LANG` silently wins — that is how
   three live lessons spent months telling children to tap a "glowing wall" that had been replaced by
   the ladder. `dev-naming.js` fails on a duplicate.
8. **The title is the real term.** If a piano teacher would not recognise the word, it is the wrong word.
9. **Colour is information, never decoration.** One hue per scale degree. `dev-earwork.js` enforces it.
10. **`dev-playable.js`, `dev-rest.js`, `dev-harmony2.js` and `dev-earwork.js` must pass** — they measure
    whether the lesson can be *done* and whether it teaches the thing it claims to.

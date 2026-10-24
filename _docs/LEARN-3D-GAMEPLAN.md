# Slimehedron: learn mode + 3D tank gameplan
Written 2026-10-24. Decisions are Flah's (2026-10-24): crayon-drawn 3D, a lessons map with a dotted path, and practice on side paths.

## What is wrong now (seen in screenshots, phone 390px and desktop 1440px, both renderers)

### 3D tank
- It is clean CG glass sitting in a crayon world: thin pastel gradient edges and milky flat faces. Nothing about it looks drawn, and that clash is what reads as "generated".
- Balls are about 8px dots with no character. Every other moving thing in the app is a slime with a face.
- The goo barely shows: two small blobs on a phone.
- A strike flashes a wall for a moment, but the tank has no weight. There is no outline, no shading direction and no paper.

### Learn mode
- The lessons home is 29 text cards in a list, in five sections. There is no picture, no character, no sense of a journey, and tinted pastel cards that all look alike.
- The lesson screens drop the art completely: a flat gradient, generic rounded slabs ("so HIGH / mi LOW"), a white "lessons" pill and a chat-bubble icon. On desktop it is a 520px column in empty space.
- Everything rests on reading English. The voice helps, but the screen alone does not explain itself.
- The free-play units (make a loop, rhythm jam, jam x3, compose) sit on the main line between taught lessons, so "practice" and "lesson" look identical.

## What the good paid apps do (sources at the end)
- Incredibox: you drag sound icons onto characters. Mute, solo and swap work by touching the character. Combos unlock little animations. Near-zero text. About 2M sales.
- Toca Band: drag characters onto a stage. The row you put one in IS its intensity, so the layout is the control.
- Loopimal: drag blocks into slots under a dancing animal, and a cursor loops across them. Criticised for not saving, not previewing a block on tap, and not stopping the cursor. We already do all three.
- Duolingo Music: a path you walk, starting at middle C with labelled keys and adding notes per module. Criticised as repetitive and like a rhythm game later on, with no chords, scales or accidentals. We already teach those.
- The pattern across all of them: characters carry the meaning, touch gives instant sound, the structure is visible as a place you move through, and a wrong answer is never punished.

## Part A: the crayon 3D tank ("drawn, not rendered")
All our own shader code on top of three.js (MIT, already vendored). No new library.
1. Crayon outline on every edge. Thicker strokes in a deeper shade of the wall colour, with a waxy broken texture along the stroke. Line boil: stroke wobble re-seeds 8 times a second (the classic hand-animation boil). It freezes when the OS asks for reduced motion.
2. Faces get hatching, not glass. A pastel fill at low opacity plus diagonal crayon hatching whose density follows the light (darker side, more strokes), plus paper grain in screen space. A strike floods the face solid colour and fades back.
3. Balls become slime drops: toon-shaded in 2-3 bands, a dark crayon rim from a fresnel term (reads as an outline), a white highlight, and about 25% bigger on screen.
4. Goo gets the same toon bands, rim and grain, so it reads as a drawn blob.
5. A switch in the corner menu (look: glass / crayon) and ?look=crayon. Glass stays the default until Flah has seen both on a real phone.
Later:
- Paper texture sampled from the existing crayon background art, instead of procedural grain.
- Hand-drawn faces on the goo hearts, using the slime face art he already has.
- A pencil "sketch-in" when a new shape appears.
Tests: a crayon screenshot differs from glass in edge darkness and texture variance. Boil changes pixels between seeds and is frozen under reduced motion. Every existing 3D suite passes in both looks.

## Part B: the lessons map (a world map you walk along)
1. The 29-card list becomes a map that scrolls down the screen. The taught lessons are stepping stones on one winding path of dots. Dots you have walked are solid; dots ahead are faint.
2. The slime mascot (existing art) stands on your next lesson. When you finish one, it hops dot by dot to the next stone: the "follow along" feel.
3. PRACTICE ON SIDE PATHS. The no-wrong-answer units (make a loop, rhythm jam, jam, major jam, minor jam, compose) and the three games each sit at the end of a short side path branching off the lesson they belong to. They are a playground, not a test: no right/wrong, no score, nothing on the main path waits on them.
4. The five blocks become regions of the map with their name on a sign. The block colour tints the ground under its stones.
5. Nothing is ever locked (the app's no-fail rule). The path shows an order, it does not enforce one. No streaks, no lives, no timers.
6. Words shrink to a short title under each stone. The voice reads the title on focus; tapping the stone opens the lesson.
7. Practice review (spaced repetition) is a stone by the start that lights up when something is due.
Tests: every unit is reachable from the map, the mascot sits on the first unfinished lesson, side paths hold only the free-play units, nothing is locked, keyboard and screen reader can walk the whole map, and phone/tablet/desktop layouts do not overflow.

## Part C: lesson screens (next round)
- Bring the crayon world in: the play-mode background art behind every lesson, the slime characters as the note rungs (do, re, mi each a slime colour), and one consistent top bar that matches the rest of the app.
- Desktop: use the width. Two columns (the thing to touch + what you hear), not a 520px strip.
- Show before tell: each lesson opens with the thing playing and the character demonstrating, and the sentence comes second (spoken). Text never carries meaning alone.
- Feedback without "wrong": a miss makes the slime wobble and replay the target, and a hit makes it bounce and add a dot to the path.
- Optional, vetted: VexFlow (MIT) or abcjs (MIT) only if the hand-made staff can no longer keep up. pitchy (MIT, depends on fft.js) for a sing-along lesson, with the mic used on device only and never recorded or sent.

## Part D: no words needed to learn (Flah, 2026-10-24: "any means necessary")
- Flah generates the art in Midjourney and Claude picks, cuts out, crops and wires it. The brief is _docs/ART-BRIEF.md: the style rules, one base prompt, the slimelogo.png sref, and every picture with a file ID.
- Raw picks go in plinky/_art_in/. Finished, cut-out files go in art/. A picture is used as soon as its ID is listed in MAP_ART (learn2.js). Until then the words stay; they are never swapped for flat glyphs.
- The rule for every screen: the pose says it. A child should be able to do the lesson with the sound on and the captions hidden.
- Lessons are shown before they are told: the thing plays, a slime demonstrates, and a pointing slime (p_tap) shows where to touch. The spoken line comes second.
- Feedback is a reaction, never a verdict. A hit makes the slime jump (p_yay) and adds a dot. A miss makes it tilt its head (p_hmm) and replay the target. No red, no X, no score.
- Note slimes do..ti: height is pitch (low = wide and short, high = small and tall), in the seven colours the app already uses.
- Test to add when the art lands: run every lesson with all text hidden (a CSS switch), and a scripted "child" that only follows the pointing slime must still complete it.

## Status 2026-10-24
- Part A, the crayon 3D look, is BUILT as a prototype: corner menu "look: glass / crayon", or ?look=crayon. Glass stays the default until Flah picks. dev-crayon.js: 11 checks; 4 of 5 sabotages caught (removing only the paper grain is still covered by the hatching). The canvas fallback has no crayon look yet.
- Part B, the lessons map, is BUILT with stand-ins (numbered stones, slimelogo as the walker). dev-map.js: 4 sabotages, all caught.
- Parts C and D are waiting on art batches 1 and 4.

## Licences checked (npm registry, 2026-10-24)
| Library | Licence | Notes |
|---|---|---|
| three | MIT | 0.186.1, already vendored |
| postprocessing | Zlib | 6.39.5; not needed, our own passes are enough |
| roughjs | MIT | 4.6.6; hand-drawn lines; not needed, the SVG displacement filter does it in our own code |
| vexflow | MIT | 5.0.0 |
| abcjs | MIT | 6.7.2 |
| pitchy | MIT | 4.1.0; depends on fft.js |
| three-custom-shader-material | MIT | 6.4.0; not needed |
| @pmndrs/vanilla | MIT | 1.25.0; pulls meshline and glsl-noise; not needed |

Rule: nothing is added to the app without a full read of the code, its licence, its dependencies, and confirmation that it makes no network calls.

## Sources
- Incredibox: https://en.wikipedia.org/wiki/Incredibox
- Toca Band review: https://www.gamezebo.com/reviews/toca-band-review/
- Loopimal review: https://www.commonsense.org/education/reviews/loopimal-by-yatatoy
- Duolingo Music, four months in: https://www.techradar.com/computing/websites-apps/ive-been-using-duolingo-music-for-4-months-alongside-actual-piano-lessons-heres-what-i-found
- Hand-drawn look in three.js (hatching, outlines, line art): https://discourse.threejs.org/t/how-to-write-shaders-to-reproduce-the-hand-drawn-style-of-this-old-map/44980

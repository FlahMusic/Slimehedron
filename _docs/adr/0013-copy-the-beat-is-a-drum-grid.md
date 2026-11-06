# 0013 The rhythm echo is a drum grid, not spoken syllables

Status: accepted 2026-11-04 (Flah's critique, brief 3.3-3.4). Spec: `_docs/specs/2026-11-03-flah-critique/spec.md`.

- Lesson 3 was "Say It, Play It": BOOM and TAP words, spoken by the browser's voice and then tapped, after the oral
  traditions that say a rhythm before playing it (konnakol, kuchi shoga, gu-eum, dum/tek; Hughes 2000 for the
  syllable sounds). `dev-curriculum` 7 asserted the syllables.
- Flah (2026-11-03): replace the "boom tap" words with a step grid like studio's drum sequencer, kick purple, snare red,
  hi-hat yellow; count in 4-3-2-1, the pattern plays, the kid places what they heard, check. Right: "Good job!";
  wrong: the lane with the mistake turns lilac, "Close, listen and try again!". No pattern twice in a row. It
  explained itself every round, its "drums" were pitched notes, and it played "boom tap tap boom 10 times in a row".
- The voice is gone everywhere (critique ticket 06), which removes the "say" half anyway.
- So the unit (id `sayplay`, kept for saved progress) is "Copy the Beat": one row per drum, one box per beat, real
  drum names. It teaches the view a kid will meet in every drum machine and DAW. `dev-learn3` 09 checks it.
- Rules out: rhythm syllables as the lesson's material. Bringing them back needs a new ADR.

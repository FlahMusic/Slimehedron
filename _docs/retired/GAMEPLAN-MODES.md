# slimehedron — Play / Learn / Studio gameplan

*(drafted 2026-07-15 — the "three doors" plan)*

## the one-liner
One engine, three doors. Same physics, same audio, same slimes — the MODE only changes
what UI is visible and whether a guided activity is running. No forks, no separate builds.

---

## 1. Mode select on the splash — yes, and here's why it's free

The splash already exists because browsers require a tap to unlock audio. That tap
becomes the choice. Three big cards, slime mascot on each:

- **PLAY** — mint slime bouncing a ball. "just make noise" (default, biggest card)
- **LEARN** — lavender slime with tiny glasses. "60-second music adventures"
- **STUDIO** — pink slime with headphones. "the full machine"

Rules:
- Remembers last choice (localStorage), auto-highlights it next visit.
- Mode pill in the header — switch anytime WITHOUT reload (it's just UI flags).
- Deep links for teachers: `?mode=learn&lesson=3` opens straight into an activity.
- Kid taps PLAY and is making sound in <2 seconds. Never gate the fun behind reading.

## 2. What each mode shows (feature flags, not forks)

| | PLAY | LEARN | STUDIO |
|---|---|---|---|
| canvas + balls + goo | ✓ | ✓ | ✓ |
| transport buttons | ✓ | ✓ | ✓ |
| auto-play slime | ✓ | off during activities | ✓ |
| triangle mixer | ✓ | when a lesson needs it | ✓ |
| drum/voice/tempo/swing/fx bar | simplified (tempo + voice only) | lesson-controlled | full |
| right panel (ADSR, filter, MIDI…) | hidden | hidden | full |
| chord pill | ✓ | ✓ + explains itself | ✓ |
| record + MIDI export | simple record | ✓ | full |
| lesson overlay | — | ✓ | — |

Implementation: `S.mode` + a `applyMode()` that toggles CSS classes on body
(`mode-play`, `mode-learn`, `mode-studio`). Everything else is display rules.

## 3. Learn mode — the CML playbook, applied

What makes Chrome Music Lab work in classrooms (per teacher writeups):
1. **instantly musical** — sound within seconds, zero reading required to start
2. **visual-first** — color = pitch, shape = sound; works for pre-readers & ELL kids
3. **create within constraints** — "make a melody using only these 3 notes" beats lectures
4. **science hooks** — every concept grounded in something you can SEE happen
5. **teacher-remixable** — simple enough that teachers build 50+ lesson plans on top

We have unfair advantages CML doesn't: a chord brain that listens, real physics,
one integrated instrument instead of 14 disconnected toys, and MIDI out.

### the lesson arc (each = one 60–90 second activity, no text walls)
1. **pulse** — tap balls to the drum. tempo slider = heartbeat, feel fast/slow.
2. **subdivision** — 1/4 vs 1/16 rain. see the grid, hear the density.
3. **swing** — the swing slime. straight vs swung A/B. "which one dances?"
4. **major vs minor** — same melody, two scales. "which one is the sad one?"
5. **THE MOOD MACHINE (the 7 modes)** — see section 4. flagship lesson.
6. **chords** — chord pill spotlight. build the liquid, watch chords follow YOUR notes.
7. **envelope** — ADSR as slime physiology: attack = how fast he jumps, release = how long he waves goodbye. drag the 4 knobs, watch a slime act it out.
8. **waveforms** — already built (∿ △ ⊿ ⊓). A/B guessing game: hear it, pick the shape.
9. **time signatures** — 3/4 waltz vs 4/4 march. count with the accent flashes.
10. **fx school** — delay slime echoes, tape warmth. hands on the real faders.

Completion = a slime sticker on the splash (local only, no accounts, no cloud).

## 4. The Mood Machine — Flah's mode/scene idea (verdict: NOT dumb, build it)

This is film-scoring pedagogy — professionals literally learn modes by scoring scenes.
Nobody has made it for kids. CML doesn't touch modes at all. It's the gap in the market.

**Direction A — guess (ear training):** app jams in a mode → kid picks which of 2–3
scenes it matches. sunny meadow? rainy window? spooky woods? no wrong-answer buzzer —
wrong picks get "hmm, listen again" and a replay.

**Direction B — create (scoring):** show ONE scene → kid picks scale + tempo + voice
to score it. no wrong answers at all, just "does it feel right to YOU?" then reveal
what the pros usually pick and why ("lydian floats because of that raised 4th ✨").

Scene→mode starter map (pastel pixel-art scenes, hand-built SVG in slime style,
NOT runtime-generated — 8-bit vibe, one slime cameo hidden in each):
- **ionian/major** — sunny meadow, kite, picnic
- **dorian** — cool detective slime walking in the rain, neon reflections
- **phrygian** — desert dunes, snake-charmer market
- **lydian** — floating islands, stardust, dream sky
- **mixolydian** — beach bonfire jam, road trip window
- **aeolian/minor** — rainy window, lost mitten
- **locrian** — wobbly haunted house (play it for laughs — even adults think locrian is cursed)

A/B on mobile, A/B/C on desktop. Scales already support all 7 modes in the engine — this
lesson is UI + scenes + a picker, not new audio code.

## 5. Free without looking cheap

Research (2026): the #1 complaints on music-learning apps are subscription traps
(trials silently converting to $140–170/yr), paywalled content mid-lesson, and
progress-blocking bugs. Parents are TIRED. Free-with-no-catch is not a weakness —
it's the exact product the complaint threads are begging for. CML itself is free and
nobody calls it cheap, because polish signals quality, not price tags.

Quality signals to ship with:
- real domain + a 30-second trailer (the goo demos itself)
- a one-page "for grown-ups" letter: who made it, why it's free, what data it takes (none)
- teacher packet PDF (lesson-plan style, like the CML ecosystem)
- "no ads · no accounts · no subscriptions · works offline" as a *badge*, said proudly
- optional later, never gating learning: one-time "supporter pack" of cosmetic slime
  skins, or plain donations. revenue can also come from Poki-style portal licensing of
  the PLAY mode only.

## 6. Build order

1. **mode scaffolding** — splash cards, S.mode, applyMode() CSS flags, header pill (small)
2. **play mode diet** — hide studio clutter behind the flag (small)
3. **lesson overlay component** — one reusable "activity card" UI: instruction line,
   big visual, A/B buttons, replay, done-sticker (medium)
4. **lessons 1–4** on the overlay (medium)
5. **Mood Machine** — 7 scenes + guess & create directions (the big one, worth it)
6. **lessons 6–10** (medium)
7. teacher packet + grown-ups page (writing, not code)

Sources: midnightmusic.com CML lesson ecosystem, mrhenrysmusicworld.com, westmusic.com
(create-within-constraints method), pianoers.com + unstar.app 2026 reviews (subscription
complaints), poki developer program docs.

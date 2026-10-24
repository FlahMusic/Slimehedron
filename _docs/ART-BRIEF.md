# Slimehedron art brief: pictures instead of words

Goal: a kid who can't read and doesn't speak English can still learn everything. Every place the app uses a word to explain something gets a slime doing that thing instead. Words stay as small captions until the pictures land; nothing gets swapped for flat clip-art.

## The look we're matching (your own art is the reference)
Use **slimelogo.png** (the crayon guy with glasses) as `--sref`. **mixslime_drum.png** is the model for a slime doing something with a prop.

Every pick has to pass this:
1. **One hand.** Oil pastel / wax crayon on white paper, visible grain, wobbly edges, soft pastel colour. Kill anything glossy, airbrushed, 3D-rendered or vector-clean.
2. **One body.** A rounded onigiri / gumdrop blob, two dot eyes (or ^ ^ when happy), a tiny mouth, pink blush. Stubby nub arms only when holding something. No hair, no nose, no teeth, no fingers, no shoes.
3. **One idea per picture.** One slime, one action, at most one prop. If you shrink it to a 48px thumbnail and can't tell what it's doing, reroll.
4. **Nothing else.** Plain white background, no scenery, no sparkles, no text, no fake handwriting, no frames.
5. **Slop tells to reject:** shiny anime eyes with highlights, perfect symmetry, ultra-fine texture, extra limbs, a sticker outline, a drop shadow, a gradient background, background clutter.

The paid apps that do this well (Incredibox, Toca Band) all work the same way: the character's pose *is* the instruction. That's the bar: the pose says it.

## Midjourney settings
Paste the base, swap `[SCENE]`, keep the tail the same for every image:

```
[SCENE], cute slime character shaped like a soft rounded gumdrop, tiny kawaii face with two small dark dot eyes, small smile and pink blush cheeks, hand-drawn with oil pastel and wax crayon on white paper, visible crayon grain, slightly wobbly edges, soft pastel colors, children's picture book illustration, plain white background, centered, nothing else in frame --sref <slimelogo url> --sw 250 --ar 1:1 --no text, letters, numbers, words, signature, watermark, glossy, shiny, 3D render, gradient background, sparkles, hair, nose, teeth, fingers, scenery
```

- If `--sw 250` drifts toward photoreal, push it up to 400. If every slime comes out identical, drop it to 150.
- For the mascot (the glasses guy), also add your version's character/omni reference with slimelogo.png. In V7 that's `--oref`. I haven't checked the exact name on your version, so look in the docs if it errors.

**Files:** name each pick with the ID below (e.g. `map_hop1.png`) and drop the full-size PNGs into a new folder `plinky/_art_in/`. The underscore keeps it off the website. I'll cut out the white, crop, size them for phone and desktop, and wire them in.

## Batch 1: the lessons map (I'm building this now)
| ID | [SCENE] |
|---|---|
| map_hop1 | the green slime with round black glasses crouching, about to jump, side view |
| map_hop2 | the green slime with round black glasses mid-jump in the air, side view, happy ^ ^ eyes |
| map_stone | a flat round pastel stepping stone seen from slightly above, empty top, no slime |
| map_stone_done | a flat round pastel stepping stone with a small crayon star drawn on top, no slime |
| map_play | a tiny round grassy island with a little drum and a toy xylophone on it, no slime |
| land_rhythm | a big friendly drum standing like a landmark, no slime |
| land_notes | a little tree with five bells hanging from it, no slime |
| land_major | a smiling crayon sun, no slime |
| land_minor | a sleepy crayon moon, no slime |
| land_page | a rolled-out paper scroll with five lines and a few round notes on it |

## Batch 2: one picture per lesson (it goes on that lesson's stone, and is the lesson's "title")
| ID | [SCENE] |
|---|---|
| l_pulse | a mint slime tapping a little drum with one nub arm, eyes closed, feeling the beat |
| l_make | a pink slime placing four small round beads in a row |
| l_sayplay | a peach slime with its mouth open saying "ta", next to a little drum |
| l_howlong | two slimes, one holding a very long ribbon and one holding a tiny short ribbon |
| l_countbar | a lavender slime holding up four little round stones in a row |
| l_rest | a blue slime asleep on a pillow with a tiny musical rest symbol beside it |
| l_song | a slime reading a small open picture book of rhythm dots |
| l_split | one big round bead next to two small beads that fit into the same space |
| l_tempo | a slime riding a snail next to a slime running fast with speed lines |
| l_dynamic | a slime shouting with a big open mouth next to a slime whispering with a tiny mouth |
| l_rjam | a slime happily drumming with both nub arms, little notes flying |
| l_high | a tiny slime standing on top of a tall ladder and a big slime at the bottom |
| l_notes | five small slimes in a row in five pastel colors, each a step taller than the last |
| l_home | a slime arriving at a little round house with a door |
| l_steps | a slime walking up small stairs next to a slime jumping over a gap |
| l_jam | a slime dancing with a toy xylophone |
| l_newhome | a slime with a suitcase arriving at a second little house painted in a darker color |
| l_majorscale | seven small slimes in a row in seven pastel colors, each a step taller |
| l_brightdark | a slime in warm sunshine next to a slime under a cozy moon |
| l_intervals | two slimes singing together, holding nub arms |
| l_chords | three slimes stacked on top of each other like a totem, all singing |
| l_jammaj | a slime dancing under a smiling sun with a xylophone |
| l_minorscale | seven slimes in a row in cool dusky colors under a moon |
| l_minorshapes | a slime lifting one step of a staircase up higher |
| l_modes | a slime holding up three different colored lanterns |
| l_jammin | a slime dancing under a sleepy moon with a xylophone |
| l_staff | a slime climbing a ladder that has exactly five rungs |
| l_melody | a slime reading notes on a paper scroll and singing |
| l_compose | a slime drawing round notes on paper with a big crayon |
| g_echo | two slimes facing each other, the second one copying the first one's pose |
| g_updown | a slime on one end of a seesaw going up |
| g_findhome | a slime looking around for its little house, a dotted trail behind it |
| u_review | a slime looking back fondly over its shoulder at a trail of stars |

## Batch 3: the "do this" poses (lessons explain themselves with these)
| ID | [SCENE] |
|---|---|
| p_listen | a slime cupping one nub arm to its side, listening carefully, eyes closed |
| p_sing | a slime singing with its mouth open, one note above it |
| p_tap | a slime pointing down with one nub arm, as if saying "tap here" |
| p_yay | a slime jumping with joy, ^ ^ eyes |
| p_hmm | a slime tilting its head, curious, one eyebrow-free questioning look, not sad |
| p_again | a slime walking in a little circle, a curved arrow drawn in crayon behind it |
| p_watch | a slime watching wide-eyed, sitting still |

## Batch 4: the 7 note slimes (one per note, the colours already used everywhere in the app)
Low notes are wide and short; high notes are small and tall. Height = pitch, so a kid gets it before anyone names a note.

| ID | [SCENE] |
|---|---|
| n_do | a wide short mint green slime (#9fe6cf) |
| n_re | a sky blue slime (#a6c8ff), a little taller |
| n_mi | a lavender slime (#c4a9f5), a little taller again |
| n_fa | a pink slime (#ffb6d6), medium height |
| n_so | a peach slime (#ffd3a8), tall |
| n_la | a lime green slime (#d9e88f), taller |
| n_ti | a small tall aqua slime (#8fe0d0), on tiptoe |

## Batch 5: studio controls that are words today
| ID | [SCENE] | replaces |
|---|---|---|
| c_mute | a slime asleep with "z" shapes drawn as little curls, not letters | mute |
| c_solo | a slime alone in a round spotlight | solo |
| c_loud | a slime shouting | loudness mode |
| c_chance | a slime juggling a single die | chance mode |
| c_onoff | a slime pressing a big round button | on/off mode |
| c_save | a slime hugging a little treasure box | save song |
| c_open | a slime peeking out of an open treasure box | open song |
| c_undo | a slime walking backwards, looking over its shoulder | undo |
| c_redo | a slime walking forwards, the same slime mirrored | redo |
| c_clear | a slime sweeping with a little broom | clear |
| c_slow | a slime riding a snail | slow |
| c_fast | a slime running with speed lines | fast |
| c_mixer | three slimes standing on three little stools of different heights | mixer |

Start with Batch 1 + Batch 4 (the map needs them first). Send me 2–4 options for each and I'll say which ones hold together as a set before you do the rest. Consistency across the whole set matters more than any single great picture.

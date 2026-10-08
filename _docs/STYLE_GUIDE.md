# Slimehedron — Art Style Guide & Asset Spec

The one rule: **every new asset must look like it came from the same crayon box as the last one.**
Consistency is what turns "charming indie" into "shippable product." Lock these and don't drift.

---

## 1. The look, in one line

Soft hand-drawn **children's crayon / colored-pencil** art — chunky rounded shapes, visible waxy
grain, a slightly rough hand-drawn outline, simple happy faces. **Matte, never glossy. Warm, never
corporate.** Think storybook, not UI.

---

## 2. Locked palette (exact hex — do not invent new hues)

Body colors (the slime/character families):

| name   | hex       | use |
|--------|-----------|-----|
| mint   | `#9fe6cf` | green family |
| pear   | `#c8e690` | yellow-green family |
| sky    | `#a6c8ff` | blue family |
| lav    | `#c4a9f5` | violet family |
| pink   | `#ffb6d6` | pink family |
| peach  | `#ffc0a8` | warm accent |
| yellow | `#ffe39c` | warm accent |

Ink & detail:

| use | hex |
|-----|-----|
| face strokes / eyes / smile | `#5a4f78` (soft plum-charcoal) |
| deeper face / bold outline  | `#3d3756` |
| blush cheeks | `#ff8fbe` at ~55% opacity |

Background sky gradient (fallback behind the art): `#c6f2e3 → #ffe1c2 → #ffd6e9`.

**Rule:** a character's outline = a darker tone of *its own body color* (not pure black). Faces use the
plum-charcoal above, never black.

---

## 3. Shape & proportion rules (so faces line up in code)

- **Silhouette:** one soft rounded-triangle / dome blob. No limbs, no hair, no accessories (bows are
  a special-case exception, see Gumby).
- **Face sits in the UPPER-CENTER third**, roughly: eyes at ~38–45% down, centered; mouth just below.
- **Eyes:** two closed upward-curved `^ ^` happy eyes by default (see expression frames below).
  Small, calm, friendly. Never large anime eyes on the default frame.
- **Cheeks:** two soft pink blush ovals under the eyes.
- **Mouth:** tiny gentle upward curve. Content, not manic.
- **Outline weight:** consistent, medium-bold, continuous all the way around (this matters for
  clean background removal — see §6).
- **Texture:** even crayon grain across the whole body. Same grain density every time.

---

## 4. Expression frames (REQUIRED for every character)

Every character needs **3 frames, same body, only the face changes** — this is what makes them
animate in-app (idle → click reaction). Name them `<name>.png`, `<name>2.png`, `<name>3.png`:

1. **`<name>.png` — happy (default):** closed `^ ^` eyes, tiny smile, blush.
2. **`<name>2.png` — surprise (click reaction):** big round open eyes, small `o` mouth, blush.
3. **`<name>3.png` — blink / content:** softly closed downward-lash eyes, calm smile, blush.

Generate all 3 in one sitting with the same style reference + seed so the body stays identical.

---

## 5. Midjourney recipe (V8.2 — current as of Aug 2026)

**Style lock is the whole game.** Use a **style reference** pointing at an existing on-model asset so
every new thing inherits the crayon look. Use `--sref` (keeps V8.2's aesthetics). Do **not** use
`--oref` for style — Omni Reference silently runs in V7 and loses the V8.2 look; only reach for
`--oref` when you need to lock a *specific character's face* across images.

**Reusable prompt block** (fill in the `[SUBJECT]`):

```
[SUBJECT], soft hand-drawn children's crayon and colored-pencil texture, waxy grain, chunky
rounded shapes, continuous bold hand-drawn outline, simple happy face with closed "^ ^" eyes,
small soft pink blush cheeks and a tiny smile, matte finish, wholesome storybook illustration,
soft pastel palette, single centered character, flat solid background
--style raw --ar 1:1 --sref [URL-TO-ON-MODEL-IMAGE] --sw 300 --sv 6
--no gloss, shine, 3d render, vector, gradient sheen, drop shadow, hard rim light, photorealism,
text, watermark, hands, feet, glasses
```

Parameter notes (current):
- `--sref [url]` — **style reference.** Point it at a live on-model asset (e.g. your `grn.png` once
  it's deployed). This is what enforces consistency.
- `--sw 300` — **style weight** (0–1000, default 100). ~250–400 = strong crayon lock without
  copying the exact subject. Lower it toward 150 if the reference is dominating the new subject.
- `--sv 6` — style-reference version (default; 4 is a softer alternative).
- `--style raw` — stops MJ's auto-beautifying so it stays flat and childlike.
- `--ar 1:1` — square. (For the caterpillar/worm strip, generate the character square; motion frames
  come from a short clip, not the aspect ratio.)
- `--no ...` — kills the glossy/3D/vector drift that clashes with crayon.
- Optional `--oref [url] --ow 400` — ONLY if you must keep the *same face* across a set (locks the
  character, runs in V7).

---

## 6. Background rule (so I can cut it out cleanly — learned the hard way)

The caterpillar came out see-through because its **pale body colors were nearly the same color as its
pink background** — an impossible cutout. Never again. Two safe options:

- **Best:** a **transparent PNG** if your tool can export alpha (no keying needed).
- **Otherwise:** a **flat, solid background in a color that appears NOWHERE on the character**, and a
  **continuous bold outline** around every part.
  - Mostly-saturated character (like a rainbow worm) → plain **white** works, *as long as* the
    outline is bold and unbroken so white can't leak into pale spots.
  - Character with white/cream/pale areas → **don't use white or pink.** Use a flat mid-tone the art
    never uses, e.g. slate `#C9D6E3` or a neutral gray.
- Always **one flat color, no gradient, no textured paper, no shadow** behind the subject.

Then hand it to me and I'll knock the background out losslessly (keeping interior alpha at 100% — no
blurring/eroding the whole mask, which was the other half of the caterpillar bug).

---

## 7. Do / Don't

**Do:** crayon grain, matte pastels, rounded chunky shapes, bold self-colored outline, simple calm
faces, flat solid background, 3 expression frames, same style-ref every time.

**Don't:** glossy/vector/3D shading, hard rim light or drop shadows, tiny fussy detail, pure-black
outlines, anime eyes on the default frame, busy/textured/gradient backgrounds, mixing line weights or
grain density between assets, generating a character with no style reference.

---

## 8. Per-mode SCENE prompts (matched to each mode's music)

These generate the **background/scene art** for each mode. They use the same crayon style reference,
but at a **lower `--sw` (~120)** — for a *scene* we want the crayon texture and palette to transfer,
NOT for MJ to force everything into a slime shape (that's what a high `--sw` does). Each scene's mood
is written to match what that mode actually *sounds* like (see the music notes under each).

> **Reference image used:** the on-model green slime.
> `--sref https://cdn.discordapp.com/attachments/991688319769530389/1539376402086887595/grn.png?ex=6a86177e&is=6a84c5fe&hm=6fbe3ad61b230df9b26f052c9ae67795d120be8ed8509deadb9ace10b1a59ee1&`
>
> ⚠️ **This is a Discord CDN link and it EXPIRES** (the `ex=/is=/hm=` are a timed signature). Midjourney
> must be able to fetch it at run time. For a permanent reference, host it on your site and use
> `https://flahmusic.github.io/Slimehedron/minis/grn.png` instead.

Generate each at `--ar 16:9` for desktop and again at `--ar 9:16` for mobile.

### PLAY — "have fun!"  (music: A-minor pentatonic, ~80 BPM w/ light swing, soft triangle pads, self-playing jam; warm, cozy, no-wrong-notes)
```
a cozy sunlit crayon meadow at soft golden hour, gentle rolling pastel-green hills, fluffy clouds,
tiny wildflowers and a few drifting sparkles, warm safe joyful mood, a couple of cute rounded crayon
slimes bouncing and making music together, the feeling of a no-wrong-notes pentatonic lullaby-jam —
warm and wistful but bright, soft hand-drawn children's crayon and colored-pencil texture, waxy grain,
matte, wholesome storybook, pastel palette
--style raw --ar 16:9 --sref https://cdn.discordapp.com/attachments/991688319769530389/1539376402086887595/grn.png?ex=6a86177e&is=6a84c5fe&hm=6fbe3ad61b230df9b26f052c9ae67795d120be8ed8509deadb9ace10b1a59ee1& --sw 120 --sv 6
--no gloss, shine, 3d render, vector, gradient sheen, drop shadow, text, watermark
```

### STUDIO — "make anything"  (music: chromatic / all 12 notes, band follows YOU, ~80 BPM; open, experimental, boundless)
```
a dreamy twilight crayon studio-world where anything feels possible, dusky lavender-and-teal sky
brushed with a soft aurora and scattered stars, floating musical shapes and colorful ribbons of sound
swirling through the air, curious boundless imaginative mood, one crayon slime freely conducting the
swirling colors, the feeling of an open all-twelve-notes sandbox, soft hand-drawn children's crayon and
colored-pencil texture, waxy grain, matte, wholesome storybook, richer saturated pastels
--style raw --ar 16:9 --sref https://cdn.discordapp.com/attachments/991688319769530389/1539376402086887595/grn.png?ex=6a86177e&is=6a84c5fe&hm=6fbe3ad61b230df9b26f052c9ae67795d120be8ed8509deadb9ace10b1a59ee1& --sw 120 --sv 6
--no gloss, shine, 3d render, vector, gradient sheen, drop shadow, text, watermark
```

### LEARN — "the building blocks of music"  (music: quiet & lesson-driven — scales, rhythm course ~90 BPM; calm, focused, encouraging)
```
a calm bright crayon morning meadow-classroom, soft mint-and-cream sky, clean tidy and uncluttered,
gentle sunlight, one friendly crayon slime beside a few simple music shapes — a little staff, a scale
of stepping-stones, a couple of floating notes, focused patient encouraging safe-to-try mood, quiet and
clear like a gentle first lesson, soft hand-drawn children's crayon and colored-pencil texture, waxy
grain, matte, wholesome storybook, gentle pastel palette
--style raw --ar 16:9 --sref https://cdn.discordapp.com/attachments/991688319769530389/1539376402086887595/grn.png?ex=6a86177e&is=6a84c5fe&hm=6fbe3ad61b230df9b26f052c9ae67795d120be8ed8509deadb9ace10b1a59ee1& --sw 120 --sv 6
--no gloss, shine, 3d render, vector, gradient sheen, drop shadow, clutter, text, watermark
```

---

## 9. Modal scene prompts (learn mode — one per musical mode)

Each of the 7 diatonic modes has its own emotional color. These prompts put the slimes in a scene that
*feels* like the mode, crayon-styled and locked to your art via `--sref`. Scenes use a lower `--sw`
(~110) so the crayon texture transfers without forcing the whole scene into a slime shape. Render
`--ar 16:9` (desktop) and again `--ar 9:16` (mobile). Swap the sref URL to taste (grn = cheerful,
bo = bright/rainbow, violet = moody).

Sref URLs: `https://flahmusic.github.io/Slimehedron/minis/grn.png` · `.../violet.png` · `.../bo.png`

### Ionian (Major) — pure, bright, resolved, joyful
```
a sunny crayon meadow parade, cute rounded crayon slimes marching happily with balloons and little
flags under a clear blue sky, everything bright resolved and wholesome, pure childlike joy, soft
hand-drawn Crayola crayon and colored-pencil texture, waxy grain, matte, storybook, pastel palette
--style raw --ar 3:2 --sref https://flahmusic.github.io/Slimehedron/minis/grn.png --sw 110 --sv 6
--no gloss, 3d, vector, shadow, dark, text, watermark
```

### Dorian — cool, hopeful-but-wistful, jazzy, sophisticated
```
a cozy crayon rooftop at blue-hour after light rain, a couple of crayon slimes sitting by warm little
cafe lights and a steaming cup, cool teal-and-amber mood, hopeful and wistful and a touch jazzy, calm
sophistication, soft hand-drawn Crayola crayon and colored-pencil texture, waxy grain, matte, storybook
--style raw --ar 3:2 --sref https://flahmusic.github.io/Slimehedron/minis/bo.png --sw 110 --sv 6
--no gloss, 3d, vector, harsh shadow, text, watermark
```

### Phrygian — dark, exotic, tense, Spanish/flamenco
```
a crayon slime by a flickering campfire at night in a warm desert, dramatic firelit shadows, deep
indigo sky, exotic and mysterious and a little tense like a flamenco night, brave but wary mood, soft
hand-drawn Crayola crayon and colored-pencil texture, waxy grain, matte, storybook
--style raw --ar 3:2 --sref https://flahmusic.github.io/Slimehedron/minis/violet.png --sw 110 --sv 6
--no gloss, 3d, vector, cheerful, bright daylight, text, watermark
```

### Lydian — dreamy, floaty, magical wonder
```
crayon slimes floating among soft clouds and drifting stars in a surreal pastel dreamscape, gentle
bubbles and glowing wisps, weightless magical wonder, wide-eyed awe, everything light and lifting and
a little unreal, soft hand-drawn Crayola crayon and colored-pencil texture, waxy grain, matte, storybook
--style raw --ar 3:2 --sref https://flahmusic.github.io/Slimehedron/minis/bo.png --sw 110 --sv 6
--no gloss, 3d, vector, heavy shadow, dark, text, watermark
```

### Mixolydian — bluesy, groovy, laid-back adventure
```
crayon slimes on a laid-back porch jam at golden hour, one with a tiny guitar, warm dusty sunset light,
easygoing bluesy groovy road-trip mood, playful and adventurous but relaxed, soft hand-drawn Crayola
crayon and colored-pencil texture, waxy grain, matte, storybook
--style raw --ar 3:2 --sref https://flahmusic.github.io/Slimehedron/minis/grn.png --sw 110 --sv 6
--no gloss, 3d, vector, harsh shadow, text, watermark
```

### Aeolian (Natural Minor) — tender, melancholic, wistful
```
a single crayon slime gazing out a rainy window at a big soft moon, gentle blue-violet melancholy,
quiet wistful tenderness, a cozy kind of sad, raindrops on glass, soft hand-drawn Crayola crayon and
colored-pencil texture, waxy grain, matte, storybook
--style raw --ar 3:2 --sref https://flahmusic.github.io/Slimehedron/minis/violet.png --sw 110 --sv 6
--no gloss, 3d, vector, bright, cheerful, text, watermark
```

### Locrian — unstable, eerie, unresolved (the rare one)
```
cute crayon slimes on tilted little floating islands in a foggy off-kilter dreamscape, everything
slightly crooked and unresolved, pale eerie mist, gently unsettling but still adorable, precarious and
strange, soft hand-drawn Crayola crayon and colored-pencil texture, waxy grain, matte, storybook
--style raw --ar 3:2 --sref https://flahmusic.github.io/Slimehedron/minis/violet.png --sw 110 --sv 6
--no gloss, 3d, vector, warm, sunny, stable horizon, text, watermark
```

---

## 10. File & delivery conventions

- Square source, transparent or flat-solid background per §6.
- Deliver into `slime imgs/mini slimes/` (characters) or `slime imgs/caterpillar/` (motion).
- Name by family + frame: `blue1.png / blue2.png / blue3.png`.
- I optimize on ingest: knock out bg → crop → **180px** for decorative minis (plenty for retina at
  their display size) → add to `minis/` → register color → balance the layout.
- Keep total decorative-slime payload lean; resize is lossless-for-quality, palette-quantize is not
  (it banded the rainbow), so we resize, we don't quantize gradients.

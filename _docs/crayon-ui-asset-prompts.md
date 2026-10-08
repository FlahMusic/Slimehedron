# Crayon UI Assets — Midjourney Prompts (for swapping into the app)

Goal: generate a few **reusable crayon-drawn UI pieces** as PNGs. I wire them into the CSS so they replace the
current clean buttons/cards at the SAME sizes/positions — you just generate + drop the files in `slime imgs/`.

**Why these specific shapes:** CSS uses `border-image` (9-slice) to stretch a frame without distorting the
corners. So each frame must be: a crayon-drawn **rounded-rectangle OUTLINE**, **transparent center**, **transparent
background**, corners clearly in the four corners. That lets one small PNG become any button size, crisp corners.

For every prompt: **transparent background (PNG), centered, no drop shadow, flat, no text.**
Add `--sref <your base slime url>` to keep the same crayon hand as your slimes.

Your sref URL:
`https://media.discordapp.net/attachments/991688319769530389/1532611921591664651/flahobino_poorly_drawn_with_mistakes_hand_drawn_kids_crayola_cr_62fa528c-2540-445d-92d6-3e6c9f74e582.png`

---

## 1. Button frame — mint/green (the primary "play/share" buttons)
Save as: `slime imgs/btn-green.png`
```
a single rounded-rectangle button shape hand-drawn in kids crayon, filled with a solid pastel seafoam-green
waxy crayon scribble, a slightly darker green wobbly crayon outline, rounded corners, thick childlike strokes,
visible crayon grain and paper texture inside the fill, centered on a fully transparent background, flat, no
shadow, no text, poorly drawn with mistakes, crayola crayon style --ar 3:2 --sref https://media.discordapp.net/attachments/991688319769530389/1532611921591664651/flahobino_poorly_drawn_with_mistakes_hand_drawn_kids_crayola_cr_62fa528c-2540-445d-92d6-3e6c9f74e582.png
```

## 2. Button frame — white/neutral (the plain buttons: drums, new shape, etc.)
Save as: `slime imgs/btn-white.png`
```
a single rounded-rectangle button shape hand-drawn in kids crayon, filled with a soft off-white / very pale
lavender waxy crayon scribble, a pastel purple wobbly crayon outline, rounded corners, thick childlike strokes,
visible crayon grain, centered on a fully transparent background, flat, no shadow, no text, poorly drawn with
mistakes, crayola crayon style --ar 3:2 --sref https://media.discordapp.net/attachments/991688319769530389/1532611921591664651/flahobino_poorly_drawn_with_mistakes_hand_drawn_kids_crayola_cr_62fa528c-2540-445d-92d6-3e6c9f74e582.png
```

## 3. Button frame — pink/warn (the "clear" button)
Save as: `slime imgs/btn-pink.png`
```
a single rounded-rectangle button shape hand-drawn in kids crayon, filled with a soft pastel pink waxy crayon
scribble, a rosy wobbly crayon outline, rounded corners, thick childlike strokes, visible crayon grain,
centered on a fully transparent background, flat, no shadow, no text, poorly drawn with mistakes, crayola
crayon style --ar 3:2 --sref https://media.discordapp.net/attachments/991688319769530389/1532611921591664651/flahobino_poorly_drawn_with_mistakes_hand_drawn_kids_crayola_cr_62fa528c-2540-445d-92d6-3e6c9f74e582.png
```

## 4. Candy square — the big side buttons (74×74 rounded squares)
Make ONE per color: green, lavender, peach, pink. Save as `slime imgs/candy-green.png`, `candy-lav.png`, etc.
```
a single rounded square tile hand-drawn in kids crayon, filled edge-to-edge with a solid pastel [COLOR] waxy
crayon scribble, a slightly darker wobbly crayon outline, big rounded corners, thick childlike strokes, visible
crayon grain and paper texture, centered on a fully transparent background, flat, no shadow, no text, poorly
drawn with mistakes, crayola crayon style --ar 1:1 --sref https://media.discordapp.net/attachments/991688319769530389/1532611921591664651/flahobino_poorly_drawn_with_mistakes_hand_drawn_kids_crayola_cr_62fa528c-2540-445d-92d6-3e6c9f74e582.png
```
(swap `[COLOR]` for: seafoam green / lavender purple / peach orange / pink)

## 5. Card / panel frame (the streak pill, the frosted cards)
Save as: `slime imgs/card-frame.png`
```
a single large rounded-rectangle frame hand-drawn in kids crayon, only the OUTLINE drawn as a wobbly pastel
lavender crayon border, the entire center completely empty and transparent, rounded corners, thick childlike
crayon strokes with grain, on a fully transparent background, no fill, no shadow, no text, poorly drawn with
mistakes, crayola crayon style --ar 3:2 --sref https://media.discordapp.net/attachments/991688319769530389/1532611921591664651/flahobino_poorly_drawn_with_mistakes_hand_drawn_kids_crayola_cr_62fa528c-2540-445d-92d6-3e6c9f74e582.png
```

## 6. Paper texture tile (subtle grain over the whole play area — optional)
Save as: `slime imgs/paper.png`
```
a seamless subtle off-white paper texture with faint crayon grain and soft tooth, very light and low contrast,
tileable, no pattern or objects, no text, flat scan of blank sketchbook paper --ar 1:1 --tile
```

---

## After you generate them
Drop the PNGs into `slime imgs/` with the filenames above, tell me which ones you made, and I'll:
- wire `#1–3` into `.btn` / `.btn.green` / `.btn.warn` via `border-image` (auto-fits every button size)
- wire `#4` into the `.psBtn` candy buttons per color
- wire `#5` into cards/pills, `#6` as a faint global grain
- test that text/icons stay perfectly readable on top, and that it only affects play mode (or wherever you want)

## Tips for good frames
- Run each 3–4 times; pick the one with the **cleanest transparent center** and **even corners**.
- If a fill looks too noisy, add `simple, minimal, clean`. If corners look uneven, add `symmetrical rounded corners`.
- Keep them LOW detail — they get stretched, so busy grain turns to mush. Think "one flat crayon swatch."
- Generate at high res (default v6/v7 is fine); I'll handle sizing in CSS.

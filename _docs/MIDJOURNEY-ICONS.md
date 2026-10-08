# Slimehedron icon prompts

Art target: `band.png` and `minis/*.png` — crayon / coloured-pencil on paper, wobbly outline,
blush cheeks, closed-arc smiling eyes, no shading, no gradients.

Params checked against Midjourney's current parameter list (Sept 2026): `--ar`, `--s`, `--raw`,
`--no`, `--sref`, `--v`. `--cref` is gone; `--oref` replaced it, then the Edit Model replaced that
in V8.X. **I don't know which version your account is on** — if `--raw` errors, use `--style raw`.

## How to run these so the five match

1. Render **pop** first. Upscale the one you like.
2. Copy that image's URL.
3. Run the other four with `--sref <that url>` pasted on the end. That locks the style.
4. Ask for white background, then knock the white out — the buttons sit on a coloured tile.
5. Export square, 256px, name them `kit-pop.png` … `kit-jazz.png`.

---

## STYLE BLOCK — paste at the end of every subject line

```
children's crayon and coloured-pencil drawing, soft waxy strokes, visible paper tooth, wobbly hand-drawn outline, pastel colours, no shading, no gradients, flat plain white background, one centred subject, bold simple silhouette that still reads at 48 pixels --ar 1:1 --raw --s 80 --no text, letters, numbers, words, watermark, signature, frame, border, drop shadow, 3d, gloss, vector, flat design, photo
```

---

## The five rhythm buttons

**pop**
```
a smiling round yellow slime blob with closed-arc eyes and pink blush cheeks singing into a handheld microphone, one small star beside it, [STYLE BLOCK]
```

**rock**
```
a smiling round red slime blob with closed-arc eyes and pink blush cheeks holding a small electric guitar, one tiny lightning bolt beside it, [STYLE BLOCK]
```

**disco**
```
a smiling round violet slime blob with closed-arc eyes and pink blush cheeks standing under a small mirror ball, a few tiny sparkles, [STYLE BLOCK]
```

**bossa**
```
a smiling round teal slime blob with closed-arc eyes and pink blush cheeks holding a small nylon-string acoustic guitar, one palm leaf beside it, [STYLE BLOCK]
```

**jazz**
```
a smiling round deep blue slime blob with closed-arc eyes and pink blush cheeks playing a small saxophone, three tiny sparkles, [STYLE BLOCK]
```

### Why an instrument and not a drum pattern

A six-year-old reads objects, not notation. A microphone, a guitar, a mirror ball and a sax are
five different silhouettes at 46px. Five drum patterns are five grey scribbles.

---

## Also worth replacing — the three splash doors

Same problem, smaller: `learn`, `play` and `studio` currently carry thin grey line icons
(an eighth note, a hexagon, two faders) on a crayon watercolour page. Your call — say the word
and I'll wire these in.

**learn**
```
a smiling round green slime blob with round black glasses, closed-arc eyes and pink blush cheeks, holding a small open book, [STYLE BLOCK]
```

**play**
```
a smiling round green slime blob with closed-arc eyes and pink blush cheeks bouncing a small ball inside a hexagon outline, [STYLE BLOCK]
```

**studio**
```
a smiling round green slime blob with closed-arc eyes and pink blush cheeks behind a small mixing desk with three faders, [STYLE BLOCK]
```

---

## One more thing about those five tiles

The five rhythm tiles are all pale blue-grey right now (`#e6f2ff`, `#efe6ff`, `#e7e8ff`,
`#eef1f6`, `#e4e7ee`). The wave rail on the other side is mint / lilac / orange / pink — much
easier to tell apart. If you want, I'll brighten the rhythm tints to match the slime colours
above, so each button carries colour + object + word. Not doing it without a yes.

# Slimehedron — new slime prompt pack

Goal: generate MORE colored slimes that match the existing crayon ones exactly, so they slot
straight into the app. Each character needs **3 expression frames** (happy / blink / surprise)
so click-reactions animate. Keep the shape, face, and texture identical across every color — only
the color changes.

---

## 0) How to use your existing slimes as an image reference

After you push, your slimes are live and their URLs are the reference images. Grab one by
right-clicking a slime on the live site → **Copy image address**. Likely paths:

- https://flahmusic.github.io/minis/grn.png
- https://flahmusic.github.io/minis/violet.png
- https://flahmusic.github.io/minis/bo.png

(if that 404s, it's a project repo: add `/Slimehedron/` → `https://flahmusic.github.io/Slimehedron/minis/grn.png`)

In an image tool that accepts a reference image (Midjourney `--sref` / image prompt, or "style
reference" upload), attach `grn.png` and use the per-color prompts below. That locks the texture,
shape, and face to your originals.

---

## 1) STYLE BLOCK — paste this into EVERY prompt (this is the ref point)

```
a cute rounded-triangle slime blob character, hand-drawn children's crayon / colored-pencil
texture with soft grainy strokes and a slightly rough hand-drawn outline, simple happy face:
two closed upward-curved "^ ^" eyes, small soft pink blush cheeks, tiny gentle smile, no glasses,
no limbs, no hair. flat plain PURE WHITE background, centered, single character, soft pastel
palette, wholesome and friendly, storybook illustration, subtle paper grain. NOT glossy, NOT 3D,
NOT vector, no gradient shine, no drop shadow.
```

Negative / avoid: `glossy, shiny, 3d render, vector, sharp clean lines, photo, realistic,
dark background, text, watermark, glasses, hands, feet`.

Square 1:1, 1024×1024, transparent or pure-white background (white is fine — I knock it out).

---

## 2) COLORS to add (each in the style block above)

Swap the `{COLOR}` line into the style block. Suggested palette that complements your green + violet
without clashing (soft, evenly spaced around the wheel):

- **peach / soft coral** — `body a warm soft peach-coral crayon color`
- **butter yellow** — `body a soft buttery pastel yellow crayon color`
- **sky blue** — `body a gentle pastel sky-blue crayon color`
- **bubblegum pink** — `body a soft bubblegum pastel pink crayon color`
- **mint teal** (lighter than your green) — `body a pale mint-teal crayon color`
- **lavender** (lighter than your violet) — `body a soft lavender crayon color`

Keep each one clearly ONE hue so the app reads them as distinct families.

---

## 3) THREE FRAMES per color (for the animation)

Generate the SAME slime, same color, in three expressions. Name them `<color>.png`,
`<color>2.png`, `<color>3.png` to match the existing naming.

**Frame 1 — happy (default), file `<color>.png`:**
```
[STYLE BLOCK] ... face: two closed upward-curved "^ ^" happy eyes, tiny smile, pink blush cheeks.
```

**Frame 2 — surprise (the click reaction), file `<color>2.png`:**
```
[STYLE BLOCK] ... face: two big round open surprised eyes (small dark pupils, wide), tiny "o" mouth,
pink blush cheeks. same body shape and color as frame 1.
```

**Frame 3 — blink / content, file `<color>3.png`:**
```
[STYLE BLOCK] ... face: two gently closed content eyes (soft downward-curved lashes), calm little
smile, pink blush cheeks. same body shape and color as frame 1.
```

Consistency tip: generate all 3 frames in ONE session / with the same seed + the `grn.png` image
reference so the body stays identical and only the eyes change.

---

## 4) Wiring them in (what to send me)

Drop the finished PNGs (white or transparent bg both fine) into `slime imgs/mini slimes/` like the
others. Tell me the color name, and I'll: knock out the background, resize, add them to `minis/`,
register the color in the `MINI` table + `HEX2CHAR` map, and weave them into the placement so the
distribution stays balanced (no color clustering).

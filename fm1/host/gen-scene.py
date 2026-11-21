#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""THE FM-1'S BACKGROUND: a sunny lake in a forest, Game Boy Color pixels, painted in Bob Ross's order (sky, clouds,
mountains, the far shore, the water and its reflections, happy little trees closing round it, the near bank), then put
out of focus and washed toward the page's lilac so the tank stays the thing you look at (Flah 2026-11-21: "a nice
gameboy color style sunny forest-enclosed bob ross coded stylized chiptune lake art in the background just faded so its
out of focus from the main tank"). Our own picture, made here from shapes: no image is copied. Painted at 120 x 120
(the GBC look), doubled to the FM-1's 240 x 240, blurred, washed, and quantised to 256 colours: one byte a pixel.
   gen-scene.py OUT.h [PREVIEW.png]       writes the C header (SL_SCENE, SL_SCENE_PAL, native RGB565) and a preview"""
import random
import sys
from PIL import Image, ImageDraw, ImageFilter

random.seed(21)
W = 120
im = Image.new("RGB", (W, W))
px = im.load()
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def dith(x, y, t, steps):        # an ordered-dither step of a gradient: the GBC way to shade a sky
    v = t * steps + (BAYER[y % 4][x % 4] / 16.0 - 0.5)
    return max(0, min(steps, round(v))) / steps


HORIZON = 60
SKY_TOP, SKY_LOW = (110, 176, 238), (255, 232, 182)
for y in range(HORIZON + 1):   # (the horizon row too: left black, the water mirrored it as a dark line)
    for x in range(W):
        px[x, y] = lerp(SKY_TOP, SKY_LOW, dith(x, y, y / (HORIZON - 1), 6))
d = ImageDraw.Draw(im)
# the sun, its glow, a few short rays
SX, SY = 90, 20
for r, c in ((15, (255, 240, 196)), (12, (255, 232, 150)), (9, (255, 214, 92))):
    d.ellipse((SX - r, SY - r, SX + r, SY + r), fill=c)
for a in range(0, 360, 45):
    import math
    for k in range(17, 21):
        x, y = SX + round(k * math.cos(math.radians(a))), SY + round(k * math.sin(math.radians(a)))
        if 0 <= x < W and 0 <= y < W: px[x, y] = (255, 236, 160)


def cloud(cx, cy, s):            # a puffy pixel cloud: three bumps on a flat base, a soft shadow under
    for dx, dy, r in ((-6, 1, 5), (0, -2, 6), (6, 1, 5), (11, 3, 3), (-10, 3, 3)):
        d.ellipse((cx + (dx - r) * s, cy + (dy - r) * s, cx + (dx + r) * s, cy + (dy + r) * s), fill=(250, 250, 255))
    d.rectangle((cx - 12 * s, cy + 3 * s, cx + 13 * s, cy + 5 * s), fill=(230, 232, 248))


cloud(24, 16, 1); cloud(58, 9, 0.8); cloud(108, 40, 0.6)


def ridge(peaks, base, col, snow):   # a mountain range: straight-ish slopes between peaks, snow on the tops
    pts = sorted(peaks)
    for x in range(W):
        for i in range(len(pts) - 1):
            if pts[i][0] <= x <= pts[i + 1][0]:
                t = (x - pts[i][0]) / max(1, pts[i + 1][0] - pts[i][0]); h = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t
                h += random.choice((0, 0, 0, 1, -1)) * 0.6
                for y in range(int(h), base):
                    c = col
                    if snow and h < 31 and y < h + (31 - h) * 0.5 + 1: c = (250, 250, 255) if (y - h) < (31 - h) * 0.35 else (214, 218, 242)   # (the peaks only)
                    elif (x + y) % 7 == 0: c = lerp(col, (255, 255, 255), 0.12)
                    px[x, y] = c
                break


ridge([(-4, 40), (18, 30), (34, 38), (52, 22), (70, 36), (88, 28), (104, 38), (124, 32)], HORIZON, (150, 150, 204), True)
ridge([(-4, 50), (14, 44), (30, 50), (46, 42), (64, 52), (82, 45), (100, 51), (124, 46)], HORIZON, (112, 124, 176), False)


def pine(cx, base, h, dark, light, trunk=True):   # a happy little tree: stacked triangles, lit on the sun's side, a trunk
    if trunk: d.rectangle((cx - 1, base - 3, cx, base), fill=(110, 76, 58))
    tiers = max(3, h // 6)
    for i in range(tiers):
        ty = base - 3 - i * (h - 4) / tiers; w = (tiers - i) * h / (tiers * 2.6) + 2
        d.polygon([(cx - w, ty), (cx + w, ty), (cx, ty - (h - 4) / tiers - 3)], fill=dark)
        d.polygon([(cx, ty), (cx + w, ty), (cx, ty - (h - 4) / tiers - 3)], fill=light)


# the far shore: a band of small pines along the horizon
for x in range(-2, W + 2, 4):
    pine(x + random.randint(-1, 1), HORIZON + 2, random.randint(7, 11), (58, 116, 92), (84, 146, 104), False)
# the water: the sky, the mountains and the far trees mirrored, bluer and lighter, rippled, with sun glints
WATER_END = 96
src = im.copy().load()
for y in range(HORIZON + 1, WATER_END):
    m = 2 * HORIZON - y + 1
    sh = (1 if (y // 2) % 3 == 0 else -1 if (y // 2) % 3 == 1 else 0) * (1 + (y - HORIZON) // 14)
    for x in range(W):
        c = src[min(W - 1, max(0, x + sh)), max(0, m)]
        c = lerp(c, (120, 178, 228), 0.38)
        if (x * 7 + y * 13) % 29 == 0 and y < HORIZON + 22: c = lerp(c, (255, 255, 255), 0.5)   # a ripple's highlight
        if abs(x - SX) < 6 - (y - HORIZON) // 8 and (y + x) % 3 == 0: c = lerp(c, (255, 240, 180), 0.7)   # the sun's path on the water
        px[x, y] = c
# the near bank: sand at the water, then grass (dithered), flowers, rocks
for y in range(WATER_END, W):
    for x in range(W):
        if y < WATER_END + 3: px[x, y] = (238, 220, 160) if (x + y) % 5 else (226, 204, 140)
        else: px[x, y] = lerp((126, 200, 104), (92, 166, 84), dith(x, y, (y - WATER_END) / (W - WATER_END), 4))
for _ in range(46):
    x, y = random.randint(2, W - 3), random.randint(WATER_END + 5, W - 2)
    c = random.choice(((255, 168, 200), (255, 236, 120), (255, 255, 255), (196, 160, 255)))
    px[x, y] = c; px[x, y - 1] = lerp(c, (255, 255, 255), 0.4)
for cx, cy, r in ((14, 102, 4), (104, 104, 3), (60, 112, 2)):
    d.ellipse((cx - r, cy - r * 0.7, cx + r, cy + r * 0.7), fill=(150, 150, 168)); px[cx - 1, cy - 1] = (196, 196, 210)
# the forest closing round the lake: big pines down both sides, overlapping, from the back to the front
for side in (0, 1):
    for i in range(11):
        base = 70 + i * 4 + random.randint(-2, 2)
        x = (random.randint(0, 15) if side == 0 else random.randint(W - 16, W - 1)) + (-6 + i if side == 0 else 6 - i) // 3
        h = int(14 + i * 1.6) + random.randint(-2, 2)
        dark = lerp((40, 104, 74), (30, 86, 60), i / 14); light = lerp((70, 148, 92), (58, 132, 80), i / 14)
        pine(x, base, h, dark, light)
# bushes at the bottom corners
for cx, cy in ((6, 116), (18, 119), (110, 117), (100, 120)):
    d.ellipse((cx - 8, cy - 6, cx + 8, cy + 6), fill=(70, 150, 88)); d.ellipse((cx - 5, cy - 6, cx + 3, cy), fill=(98, 176, 104))

# doubled to 240 (the GBC's chunky pixels), out of focus, washed toward the page's lilac (0xF7BF: 247 247 255)
big = im.resize((240, 240), Image.NEAREST).filter(ImageFilter.GaussianBlur(1.6))
PAGE = (247, 247, 255)
big = Image.blend(big, Image.new("RGB", (240, 240), PAGE), 0.42)
q = big.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
pal = q.getpalette()[:768]
idx = list(q.get_flattened_data() if hasattr(q, "get_flattened_data") else q.getdata())
if len(sys.argv) > 2: q.convert("RGB").save(sys.argv[2])


def rgb565(r, g, b): return ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3)


n = len(pal) // 3
L = ["/* GENERATED by fm1/host/gen-scene.py: the background's lake, 240 x 240, a palette index a pixel (256 colours,",
     " * RGB565 native). Our own picture, made from shapes there; regenerate rather than edit. GPL-3.0-or-later. */",
     "#ifndef SL_SCENE_H", "#define SL_SCENE_H", "#include <stdint.h>",
     "static const uint16_t SL_SCENE_PAL[256] = {" + ", ".join("0x%04X" % rgb565(*pal[3 * i:3 * i + 3]) for i in range(n)) + ", 0" * (256 - n) + "};",
     "static const uint8_t SL_SCENE[240 * 240] = {"]
for r in range(240):
    L.append("  " + ",".join(str(v) for v in idx[r * 240:(r + 1) * 240]) + ",")
L += ["};", "#endif", ""]
open(sys.argv[1], "w").write("\n".join(L))
print("scene: %d colours, %d bytes" % (n, 240 * 240))

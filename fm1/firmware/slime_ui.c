/* SPDX-License-Identifier: GPL-3.0-only */
/* Slimehedron for the FM-1: the screen and the panel. Replaces SLOOP's groovebox UI in the main loop (patch_sloop.py:
 * ui_input / ui_leds / ui_draw are no longer called). The screen is the tank and nothing else: drawn 2.5D by
 * fm1/core/drawtank.c in 16-row bands, each band sent while the next is painted.
 *
 * Panel (the pages: the PAGES map below):
 *   keys      their note in the tank's scale, now (a hand is never quantized), and a ball into the tank
 *   PLAY      everything runs / stands still              HOME   the tank (from any page)
 *   ARP       the arp on / off, and its page              LFO    the slime: key journey, reforms, swing, muffle
 *   REC       a loop of the hand's notes                  OCT- / OCT+  the keyboard's octave (both: the middle)
 *   SELECT / ALGORITHM / PRESETS  the melody's / bass's / chords' sound          MASTER  volume
 * LEDs: PLAY, ARP, LFO, SEQ, REC show their state; a key glows when the melody rings its note.
 * A change shows its new value in plain words at the top of the screen for 1.5 s.
 * The main loop never writes the tank: it leaves requests (slime.c) for the audio interrupt, which owns it. It READS
 * the tank while the interrupt may be moving it, so a frame can show a ball a tick ahead of a wall: seen, never stored. */
#include "drawtank.h"
float sinf(float), floorf(float);           /* the toolchain's libm (SLOOP itself links none) */

#define SL_BAND_PX (240u * 16u)
_Static_assert(sizeof(st_view) + 2u * SL_BAND_PX * 2u + 8u <= sizeof cv_px, "the view and two bands live in SLOOP's canvas");
static uint32_t sl_frames;
static volatile uint32_t sl_frame_ms;       /* how long the last frame took (for fm1-emu's memory dump) */
static volatile uint32_t sl_px;             /* pixels sent in the last frame (a whole screen is 57,600) */
/* for fm1-emu (emu-check.sh dumps these 4 words): frames drawn, the worst frame (ms), the audio interrupt's worst half
 * (us, of a 5,805 us deadline: SLOOP's own audio_max_us, the tank and the band included), deadlines missed */
static volatile uint32_t sl_dbg[4];
/* where a frame's time goes (fm1_ticks, summed; fm1-emu reads it from a RAM dump): the main loop's polls (the conductor:
 * the tank and the band), preparing the view, drawing the bands, packing and sending them, the last wait for the panel */
static volatile struct { uint32_t frames, poll, prep, draw, pack, sync, px; } sl_prof;
static volatile uint16_t sl_fpsw[64];       /* the frame rate (x10) of each 5 s window after the splash, in order */
static volatile uint32_t sl_fpsw_n;
#define SL_MARGIN 8

static uint16_t *sl_strip(uint32_t k) { return cv_px + (k & 1u) * SL_BAND_PX; }

/* colour, here (SLOOP has its own mix565, so fm1/core/paint.h stays out of the unity build) */
static uint16_t sl_hsv565(float h, float s, float v)
{
    float r, g, b, f, p, q, t;
    int i;
    h -= floorf(h); h *= 6.0f; i = (int)h; f = h - (float)i;
    p = v * (1.0f - s); q = v * (1.0f - s * f); t = v * (1.0f - s * (1.0f - f));
    switch (i % 6) { case 0: r = v; g = t; b = p; break; case 1: r = q; g = v; b = p; break; case 2: r = p; g = v; b = t; break;
                     case 3: r = p; g = q; b = v; break; case 4: r = t; g = p; b = v; break; default: r = v; g = p; b = q; }
    return (uint16_t)(((int)(r * 31.0f + 0.5f) << 11) | ((int)(g * 63.0f + 0.5f) << 5) | (int)(b * 31.0f + 0.5f));
}
static uint16_t sl_blend(uint16_t a, uint16_t b, float t)   /* a toward b by t */
{
    int ar = a >> 11, ag = (a >> 5) & 63, ab = a & 31, br = b >> 11, bg = (b >> 5) & 63, bb = b & 31;
    return (uint16_t)(((int)((float)ar + (float)(br - ar) * t) << 11) | ((int)((float)ag + (float)(bg - ag) * t) << 5) | (int)((float)ab + (float)(bb - ab) * t));
}

/* THE BURST (the site: a full tank bursts and reforms as a new shape). At a reform the old slime and balls fly out
 * from the middle and fade over 0.6 s while the new shape starts playing. Drawn over the bands, screen space. */
#define SL_BURST_MS 600u
#define SL_BURST_N (SH_GOO_MAXD + SH_BALLCAP)
static struct { int16_t x, y, vx, vy; uint8_t r; uint16_t c; } sl_bp[SL_BURST_N];
static int sl_bn;
static uint32_t sl_burst_t0;
static void sl_on_reform(void)              /* (slime.c's sl_start_shape calls it; the view still shows the old tank) */
{
    const st_view *v = (const st_view *)((((uintptr_t)(cv_px + 2u * SL_BAND_PX)) + 7u) & ~(uintptr_t)7u);
    int i;
    sl_bn = 0;
    for (i = 0; i < v->nd + v->nb && sl_bn < SL_BURST_N; i++) {
        int ball = i >= v->nd, k = ball ? i - v->nd : i;
        float x = ball ? v->x[k] : v->dx[k], y = ball ? v->y[k] : v->dy[k], r = ball ? v->r[k] : v->dr[k];
        float dx = x - 120.0f, dy = y - 120.0f, d = sqrtf(dx * dx + dy * dy) + 1.0f, sp = 140.0f + (float)((i * 37) % 120);   /* px a second */
        sl_bp[sl_bn].x = (int16_t)x; sl_bp[sl_bn].y = (int16_t)y;
        sl_bp[sl_bn].vx = (int16_t)(dx / d * sp); sl_bp[sl_bn].vy = (int16_t)(dy / d * sp - 40.0f);
        sl_bp[sl_bn].r = (uint8_t)(r < 1.0f ? 1 : r > 12.0f ? 12 : r);
        sl_bp[sl_bn].c = ball ? v->bc[k] : v->goo;
        sl_bn++;
    }
    sl_burst_t0 = fm1_ms;
}
static int sl_bursting(void) { return sl_bn > 0 && fm1_ms - sl_burst_t0 < SL_BURST_MS; }
static void sl_burst_band(uint16_t *b, int y0)   /* the flying drops on rows y0..y0+15 of a native-order band */
{
    float t = (float)(fm1_ms - sl_burst_t0) * 0.001f, a = 1.0f - t / (SL_BURST_MS * 0.001f);
    int i;
    if (a <= 0.0f) return;
    for (i = 0; i < sl_bn; i++) {
        float cx = (float)sl_bp[i].x + (float)sl_bp[i].vx * t, cy = (float)sl_bp[i].y + (float)sl_bp[i].vy * t + 160.0f * t * t;
        float r = (float)sl_bp[i].r * (0.6f + 0.6f * a);
        int ya = (int)(cy - r), yb = (int)(cy + r), y;
        if (yb < y0 || ya > y0 + 15) continue;
        for (y = ya < y0 ? y0 : ya; y <= yb && y <= y0 + 15; y++) {
            float dy = (float)y + 0.5f - cy, hw = r * r - dy * dy;
            int xa, xb, x;
            if (hw <= 0.0f) continue;
            hw = sqrtf(hw); xa = (int)(cx - hw); xb = (int)(cx + hw);
            if (xa < 0) xa = 0;
            if (xb > 239) xb = 239;
            for (x = xa; x <= xb; x++) b[(y - y0) * 240 + x] = sl_blend(b[(y - y0) * 240 + x], sl_bp[i].c, 0.85f * a);
        }
    }
}
static st_view *sl_view(void)
{
    uintptr_t p = (uintptr_t)(cv_px + 2u * SL_BAND_PX);
    return (st_view *)((p + 7u) & ~(uintptr_t)7u);
}

#include "slime_scene.h"   /* the background's lake (fm1/host/gen-scene.py) */
#define SL_PAGE_BG 0xF7BFu                  /* the page's pale lilac (the tank's page, the splash's) */
UI_SMALL static void slime_splash(void)     /* power-on, before the sound starts: the page's colour, the slime drops in next */
{
    lcd_fill(0, 0, 240, 240, SL_PAGE_BG);
}

/* THE SPLASH (Flah 2026-11-18: "a characteristic little seafoam green slime guy with glasses as the initial boot splash
 * screen ... say Slimehedron, then fade into the main mode"; 2026-11-21: "headphones slide down onto his head and then
 * the intro music plays", "a little FM1 of his own fall down into his hands to play on with us", "from chillin face
 * relaxed to surprised and then excited", "he has no arms tho ... keep it cute and lighthearted, nintendo like"). Drawn
 * here, pixel by pixel, no picture stored. The timeline (ms, and the jingle's: slime.c SL_JINGLE):
 *   0..380     he drops in and lands with a squash and a wobble (a soft thud); chilling: eyes half shut, a small smile
 *   420..900   headphones slide down onto his head, a little past and back (a hi-hat's "tss" as they click on); he sees
 *              them coming at 600: surprised, eyes wide, a little "o"
 *   700..1100  a little synth of his own drops into his hands, held in front of him (a woody tok as it lands)
 *   1100       excited: happy ^^ eyes, a big open smile, a hop
 *   1160..1960 a twinkle up and down C major 7, a note every 100 ms, a star popping round him with each; he bobs
 *   2100       the open C major 7: SLIMEHEDRON rises, a glint crosses his glasses
 *   3600..4100 it all fades into the tank
 * Any button or key skips to the fade. The synth is a little mini-keyboard, no maker's name on it. */
#define SL_SPLASH_MS 4100u                  /* from the drop to the end of the fade */
#define SL_FADE_MS 500u
#define SL_SP_HP0 420.0f                    /* the headphones set off */
#define SL_SP_HP1 900.0f                    /* and are on */
#define SL_SP_SEE 600.0f                    /* he sees them coming */
#define SL_SP_FM0 700.0f                    /* the synth drops */
#define SL_SP_FM1 1100.0f                   /* and is in his hands: excited */
#define SL_SP_TW 1160.0f                    /* the first twinkle */
#define SL_SP_CHORD 2100.0f                 /* the chord, the name */
#define SL_SP_NSTAR 9
static const uint8_t SL_STAR[SL_SP_NSTAR][2] = {{58, 78}, {184, 64}, {34, 122}, {206, 116}, {78, 42}, {166, 36}, {44, 160}, {198, 162}, {120, 22}};
static uint32_t sl_splash_t0;               /* fm1_ms when it began (0: not yet) */
static uint8_t sl_splash_done, sl_skip;
static uint32_t sl_skip_at;
static uint8_t sl_title[32][240] __attribute__((section(".pool")));   /* the name's coverage, 0..15 (FONT_L, drawn once) */
static int sl_splashing(void) { return !sl_splash_done; }
static float sl_ease(float x) { x = x < 0.0f ? 0.0f : x > 1.0f ? 1.0f : x; return x * x * (3.0f - 2.0f * x); }
static uint16_t sl_bl(uint16_t a, uint16_t b, uint32_t k)   /* a toward b by k / 32 (fm1/core/paint.h blend565) */
{
    uint32_t A = (a | ((uint32_t)a << 16)) & 0x07E0F81Fu, B = (b | ((uint32_t)b << 16)) & 0x07E0F81Fu;
    uint32_t r = ((B * k + A * (32u - k)) >> 5) & 0x07E0F81Fu;
    return (uint16_t)(r | (r >> 16));
}
static uint32_t sl_k(float t) { int k = (int)(t * 32.0f + 0.5f); return (uint32_t)(k < 0 ? 0 : k > 32 ? 32 : k); }
static float sl_back(float t0, float t1, float t, float from)   /* an ease-out-back drop: from px above to 0 (a touch past, then back) */
{
    float q;
    if (t < t0) return from;
    if (t >= t1) return 0.0f;
    q = (t - t0) / (t1 - t0) - 1.0f;
    return from * -(2.4f * q * q * q + 1.4f * q * q);
}
/* this frame's pose: where he is, how squashed, what shows */
typedef struct { float cx, cy, W, H, glint, title, alpha, shadow, hp, fm, star[SL_SP_NSTAR]; int mood; } sl_pose;   /* mood: 0 chill, 1 surprised, 2 excited */
static sl_pose sl_splash_pose(uint32_t ms)
{
    sl_pose p;
    const float ground = 150.0f, W0 = 56.0f, H0 = 50.0f, t = (float)ms;
    float s = 0.0f, up = 0.0f, bob = 0.0f;
    int i;
    if (t < 380.0f) { float q = t / 380.0f; up = 190.0f * (1.0f - q * q); s = -0.12f * q; }   /* falling, a touch stretched */
    else { float u = (t - 380.0f) / 1000.0f; s = 0.30f * expf(-u * 7.5f) * cosf(u * 31.0f); }   /* landed: squash, wobble */
    if (t > SL_SP_HP1) { float v = (t - SL_SP_HP1) / 1000.0f; s += 0.13f * expf(-v * 9.0f) * cosf(v * 30.0f); }   /* the headphones land */
    if (t > SL_SP_FM1) { float v = (t - SL_SP_FM1) / 1000.0f; s += 0.10f * expf(-v * 9.0f) * cosf(v * 30.0f); }   /* the synth lands */
    p.hp = sl_back(SL_SP_HP0, SL_SP_HP1, t, -240.0f);    /* the headphones: px above where they sit (0: on his head) */
    p.fm = sl_back(SL_SP_FM0, SL_SP_FM1, t, -260.0f);    /* the synth: px above where he holds it */
    if (t > SL_SP_FM1 && t < SL_SP_FM1 + 260.0f) up += 9.0f * sinf((t - SL_SP_FM1) * (3.14159265f / 260.0f));   /* a happy hop */
    if (t > SL_SP_TW) { float b = (t - SL_SP_TW) * (6.2831853f / 400.0f); bob = 2.5f * sinf(b - 6.2831853f * floorf(b / 6.2831853f)); }   /* nodding along */
    p.W = W0 * (1.0f + s); p.H = H0 * (1.0f - s);
    p.cx = 120.0f; p.cy = ground - p.H * 0.92f - up + bob;
    p.shadow = 1.0f - (up / 190.0f);
    p.mood = t < SL_SP_SEE ? 0 : t < SL_SP_FM1 ? 1 : 2;
    p.glint = t > SL_SP_CHORD && t < SL_SP_CHORD + 500.0f ? (t - SL_SP_CHORD) / 500.0f : -1.0f;
    p.title = sl_ease((t - SL_SP_CHORD) / 450.0f);
    p.alpha = 1.0f - sl_ease((t - (float)(SL_SPLASH_MS - SL_FADE_MS)) / (float)SL_FADE_MS);
    for (i = 0; i < SL_SP_NSTAR; i++) {                    /* each twinkle's star: pops in, fades over half a second */
        float a = t - (SL_SP_TW + 100.0f * (float)i);
        p.star[i] = a < 0.0f || a > 500.0f ? 0.0f : 1.0f - a / 500.0f;
    }
    return p;
}
static void sl_title_render(void)           /* the name in SLOOP's large capitals, as coverage */
{
    static const char *const NAME = "SLIMEHEDRON";
    int32_t w = text_w(&FONT_L, NAME), x, y;
    cv_begin(240, 32, 0);
    cv_oy = 0;
    cv_text(120 - w / 2, 0, &FONT_L, NAME, 0xFFFFu);
    for (y = 0; y < 32; y++)
        for (x = 0; x < 240; x++) sl_title[y][x] = (uint8_t)(((swap16(cv_px[y * 240 + x]) >> 5) & 63u) >> 2);
}
/* his little synth, at (u, v) px from its top left (64 x 26): a pale case with a dark outline, a tiny screen with the
 * tank's hexagon glowing on it, four knobs, a row of mini keys. Returns the colour, or 0 outside it */
static uint16_t sl_synth_px(float u, float v)
{
    static const uint16_t CASE = 0xEF5Du, EDGE = 0x3186u, SCR = 0x2108u, HEX = 0x9FB9u, KNOB = 0x6B4Du, KEYW = 0xFFFFu, KEYB = 0x2104u;
    float cu = u < 5.0f ? 5.0f - u : u > 59.0f ? u - 59.0f : 0.0f, cv = v < 5.0f ? 5.0f - v : v > 21.0f ? v - 21.0f : 0.0f;
    float rc = cu * cu + cv * cv, du, dv, k;
    if (u < 0.0f || u >= 64.0f || v < 0.0f || v >= 26.0f || rc > 25.0f) return 0;
    if (rc > 13.0f || u < 1.0f || u > 63.0f || v < 1.0f || v > 25.0f) return EDGE;   /* the outline, rounded corners */
    if (u > 6.0f && u < 26.0f && v > 4.0f && v < 14.0f) {                             /* the screen: the tank's hexagon */
        du = u - 16.0f; dv = (v - 9.0f) * 1.15f; k = (du < 0.0f ? -du : du) * 0.5f + (dv < 0.0f ? -dv : dv) * 0.866f;
        if (k > 2.6f && k < 3.8f) return HEX;
        return SCR;
    }
    for (k = 0.0f; k < 4.0f; k += 1.0f) {                                             /* four knobs */
        du = u - (34.0f + k * 7.5f); dv = v - 8.5f;
        if (du * du + dv * dv < 7.0f) return du + dv < -1.5f ? 0xBDF7u : KNOB;
    }
    if (v > 16.0f && v < 24.0f && u > 3.0f && u < 61.0f) {                           /* the keys: fourteen white, the black between */
        float w = (u - 3.0f) / 58.0f * 14.0f, f = w - (float)(int)w;
        int n = (int)w % 7;
        if (v < 20.5f && ((f > 0.72f && n != 2 && n != 6) || (f < 0.28f && n != 0 && n != 3))) return KEYB;   /* (after C D, F G A: twos and threes) */
        return f < 0.07f ? 0xAD55u : KEYW;
    }
    return CASE;
}
/* one native-order band (rows y0..y0+15) of the splash, over what is there by p.alpha (1: all splash) */
static void sl_splash_band(uint16_t *b, int y0, const sl_pose *p)
{
    static const uint16_t BODY = 0x8F38u, RIM = 0x4E31u, LINE = 0x2BEDu, LENS = 0x3970u, PINK = 0xFD18u, GLOW = 0xBF7Du, SHADE = 0xC5DBu,
                          HPB = 0x4A6Bu, HPHI = 0x7BB2u, HPC = 0xFB76u, STAR = 0xFE47u, MOUTH = 0x5129u, TONGUE = 0xF2D3u;
    uint32_t ka = sl_k(p->alpha), kt = sl_k(p->title), ks = (uint32_t)(4.0f + 10.0f * p->shadow);
    float iW = 1.0f / p->W, iH = 1.0f / p->H, sx = p->W / 56.0f, sy = p->H / 50.0f;
    float ex = 20.0f * sx, ey = p->cy - 4.0f * sy, lr = 14.5f * (sx + sy) * 0.5f;    /* the eyes (lenses): off the middle, radius */
    float iSh = 1.0f / (p->W * (0.6f + 0.5f * p->shadow)), i1x = 1.0f / (7.0f * sx), i1y = 1.0f / (8.0f * sy), i2x = 1.0f / (5.0f * sx), i2y = 1.0f / (6.0f * sy);
    float bx0 = p->cx - p->W * 1.05f, bx1 = p->cx + p->W * 1.05f, by0 = p->cy - p->H * 1.05f, by1 = p->cy + p->H * 1.25f;   /* his box */
    /* the headphones: a band over the top of his head (an ellipse ring, its upper part) and a cup on each side, hp px up */
    float hcy = p->cy + 0.05f * p->H + p->hp, hrx = p->W * 1.06f, hry = p->H * 1.18f, ihx = 1.0f / hrx, ihy = 1.0f / hry;
    float cupx = p->W * 1.0f, cupy = hcy - 0.02f * p->H, icx = 1.0f / (8.0f * sx), icy = 1.0f / (13.0f * sy);
    float hy0 = hcy - hry - 4.0f, hy1 = cupy + 14.0f * sy;
    float fx0 = p->cx - 32.0f, fy0 = p->cy + 0.36f * p->H + p->fm;                     /* the synth, held in front of his tummy */
    int r, x, i;
    if (!ka) return;
    for (r = 0; r < 16; r++) {
        int y = y0 + r;
        float yc = (float)y + 0.5f, dy = (yc - p->cy) * iH, gy = yc - 92.0f, sy2 = (yc - 153.0f) * (1.0f / 6.0f), dy2 = dy * dy;
        float rry = dy < 0.0f ? dy2 : dy2 * dy2, d1y = (yc - (p->cy + 0.86f * p->H)) * i1y, d2y = (yc - (p->cy + 0.92f * p->H)) * i2y;
        float hdy = (yc - hcy) * ihy, cdy = (yc - cupy) * icy;
        int inrow = yc > by0 && yc < by1, glowrow = gy * gy < 95.0f * 95.0f, shrow = sy2 * sy2 < 1.0f, hprow = p->hp > -230.0f && yc > hy0 && yc < hy1;
        int fmrow = yc >= fy0 && yc < fy0 + 26.0f;
        uint16_t *row = b + r * 240;
        for (x = 0; x < 240; x++) {
            float xc = (float)x + 0.5f, rr = 2.0f;
            uint16_t c = SL_PAGE_BG;
            if (glowrow) { float gx = xc - 120.0f, g2 = (gx * gx + gy * gy) * (1.0f / (95.0f * 95.0f)); if (g2 < 1.0f) c = sl_bl(c, GLOW, (uint32_t)(7.0f * (1.0f - g2))); }   /* a soft mint glow */
            if (shrow) { float sx2 = (xc - p->cx) * iSh; if (sx2 * sx2 + sy2 * sy2 < 1.0f) c = sl_bl(c, SHADE, ks); }   /* his shadow (smaller while he is in the air) */
            if (inrow && xc > bx0 && xc < bx1) {
                float dx = (xc - p->cx) * iW;
                rr = dx * dx + rry;                                                              /* a dome on a soft flat bottom */
                if (rr > 0.75f) {   /* two drips hanging off his base */
                    float d1x = (xc - (p->cx - 0.62f * p->W)) * i1x, d2x = (xc - (p->cx + 0.48f * p->W)) * i2x;
                    float q1 = d1x * d1x + d1y * d1y, q2 = d2x * d2x + d2y * d2y;
                    if (q1 < 1.0f && 0.75f + 0.25f * q1 < rr) rr = 0.75f + 0.25f * q1;
                    if (q2 < 1.0f && 0.75f + 0.25f * q2 < rr) rr = 0.75f + 0.25f * q2;
                }
            }
            if (rr < 1.0f) {
                float dx = (xc - p->cx) * iW;
                float hx = dx + 0.42f, hy = dy + 0.52f, h = hx * hx * 2.2f + hy * hy * 3.0f;
                c = BODY;
                if (rr > 0.80f) c = sl_bl(BODY, RIM, sl_k((rr - 0.80f) * 3.2f));                 /* rounder toward the rim */
                if (rr > 0.93f) c = sl_bl(c, LINE, sl_k((rr - 0.93f) * 11.0f));                  /* a soft outline */
                if (h < 0.10f) c = sl_bl(c, 0xFFFFu, sl_k(0.75f * (1.0f - h / 0.10f)));          /* the shine, top left */
                {   /* the face: glasses, eyes, a mouth, rosy cheeks, as he feels */
                    float lx = xc - (p->cx - ex), rx = xc - (p->cx + ex), ly = yc - ey;
                    float dl = lx * lx + ly * ly, dr2 = rx * rx + ly * ly, d = dl < dr2 ? dl : dr2, ox = dl < dr2 ? lx : rx;
                    float L2 = lr * lr, Li = (lr - 3.0f) * (lr - 3.0f);
                    float cx1 = xc - (p->cx - 0.56f * p->W), cx2 = xc - (p->cx + 0.56f * p->W), cyy = (yc - (p->cy + 0.26f * p->H)) / 4.0f;
                    if ((cx1 * cx1) / 49.0f + cyy * cyy < 1.0f || (cx2 * cx2) / 49.0f + cyy * cyy < 1.0f) c = sl_bl(c, PINK, p->mood == 2 ? 22u : 14u);
                    if (d < Li) {                                                                /* inside a lens */
                        float px2 = ox - 1.0f * sx, py2 = ly - 2.0f * sy;
                        c = sl_bl(c, 0xFFFFu, 12u);
                        if (p->mood == 2) {                                                      /* excited: happy ^^ eyes */
                            float ax2 = px2 < 0.0f ? -px2 : px2, v = py2 - 0.85f * ax2 + 1.6f;   /* (the arch's top in the middle) */
                            if (ax2 < 5.5f && v > -1.4f && v < 1.4f) c = LENS;
                        } else {
                            float pr = p->mood == 1 ? 10.0f : 22.0f;                             /* surprised: small pupils, wide eyes */
                            if (px2 * px2 + py2 * py2 < pr) c = (px2 + 1.6f) * (px2 + 1.6f) + (py2 + 1.8f) * (py2 + 1.8f) < 2.4f ? 0xFFFFu : 0x18C3u;
                            if (p->mood == 0 && py2 < 0.3f) {                                    /* chilling: lids half down */
                                c = sl_bl(BODY, 0xFFFFu, 8u);
                                if (py2 > -0.9f && px2 * px2 < 36.0f) c = LENS;
                            }
                        }
                        if (p->glint >= 0.0f) { float g = (ox + ly) / (2.0f * lr) + 1.0f - p->glint * 2.4f; if (g > -0.10f && g < 0.10f) c = sl_bl(c, 0xFFFFu, 24u); }
                    } else if (d < L2) c = LENS;                                                 /* the rims */
                    if (yc > ey - 2.6f && yc < ey + 0.6f && xc > p->cx - ex + lr - 1.0f && xc < p->cx + ex - lr + 1.0f) c = LENS;   /* the bridge */
                    {   /* the arms, back to his sides */
                        float ax = xc < p->cx ? (p->cx - ex - lr) - xc : xc - (p->cx + ex + lr);
                        if (ax > -1.0f && ax < 9.0f * sx && yc > ey - 2.4f - ax * 0.15f && yc < ey + 0.2f - ax * 0.15f && rr < 0.95f) c = LENS;
                    }
                    {   /* the mouth: a small smile, an "o", a big open grin */
                        float mx = xc - p->cx, my = yc - (p->cy + 6.0f * sy), m = mx * mx + my * my;
                        if (p->mood == 0) {
                            float R1 = 7.0f * sx;
                            if (my > 2.5f && m < (R1 + 1.1f) * (R1 + 1.1f) && m > (R1 - 1.1f) * (R1 - 1.1f)) c = LENS;
                        } else if (p->mood == 1) {
                            float oy = my - 6.0f * sy, o2 = mx * mx + oy * oy * 1.3f;
                            if (o2 < 16.0f) c = o2 < 7.0f ? MOUTH : LENS;
                        } else {
                            float R1 = 10.0f * sx;
                            if (my > 1.5f && m < (R1 + 1.0f) * (R1 + 1.0f)) c = m > (R1 - 0.6f) * (R1 - 0.6f) ? LENS : (my > R1 * 0.55f ? TONGUE : MOUTH);
                        }
                    }
                }
            }
            if (fmrow && xc >= fx0 && xc < fx0 + 64.0f) {                                     /* his synth, in front of him */
                uint16_t s2 = sl_synth_px(xc - fx0, yc - fy0);
                if (s2) c = s2;
            }
            if (hprow) {                                                                         /* the headphones, over him */
                float hdx = (xc - p->cx) * ihx, e = hdx * hdx + hdy * hdy, cdl = (xc - (p->cx - cupx)) * icx, cdr = (xc - (p->cx + cupx)) * icx;
                float ql = cdl * cdl + cdy * cdy, qr = cdr * cdr + cdy * cdy, q = ql < qr ? ql : qr;
                if (hdy < -0.05f && e > 0.86f && e < 1.0f) c = e < 0.91f ? HPHI : HPB;          /* the band, a lighter edge inside */
                if (q < 1.0f) c = q < 0.45f ? HPC : (q < 0.62f ? sl_bl(HPC, HPB, 16u) : HPB);   /* a cup: pink cushion, dark shell */
            }
            if (kt && y >= 176 && y < 208) {                                                     /* the name, rising in */
                int ty = y - 176 + (int)(8.0f * (1.0f - p->title));
                if (ty >= 0 && ty < 32 && sl_title[ty][x]) c = sl_bl(c, 0x7AF5u, (uint32_t)sl_title[ty][x] * 2u * kt / 32u);
            }
            row[x] = ka >= 32u ? c : sl_bl(row[x], c, ka);
        }
        for (i = 0; i < SL_SP_NSTAR; i++) {                                                     /* the stars: a twinkle's cross */
            int sxs = SL_STAR[i][0], sys = SL_STAR[i][1], d = y - sys, ad = d < 0 ? -d : d, arm, k;
            if (p->star[i] <= 0.0f || ad > 8) continue;
            arm = ad ? (ad == 1 ? 3 : 0) : 8;                                                    /* (the row through it: the long arm) */
            k = (int)(p->star[i] * (float)(ka) * (float)(9 - ad) / 9.0f);
            if (ad >= 2) { if (sxs >= 0 && sxs < 240) row[sxs] = sl_bl(row[sxs], STAR, (uint32_t)(k > 32 ? 32 : k)); continue; }
            for (x = sxs - arm; x <= sxs + arm; x++) if (x >= 0 && x < 240) {
                int kk = k * (9 - (x > sxs ? x - sxs : sxs - x)) / 9;
                row[x] = sl_bl(row[x], STAR, (uint32_t)(kk > 32 ? 32 : kk < 0 ? 0 : kk));
            }
        }
    }
}

/* the label: what just changed, in plain words, at the top of the screen */
static char sl_label[40];
static uint32_t sl_label_until;
static uint8_t sl_label_shown;              /* drawn last frame: its rows must be repainted once it goes */
static void sl_say(const char *a, const char *b)
{
    uint32_t i = 0, j = 0;
    while (a[j] && i < sizeof sl_label - 1u) sl_label[i++] = a[j++];
    for (j = 0; b && b[j] && i < sizeof sl_label - 1u; j++) sl_label[i++] = b[j];
    sl_label[i] = 0;
    for (j = 0; j < i; j++) if (sl_label[j] >= 'A' && sl_label[j] <= 'Z') sl_label[j] = (char)(sl_label[j] + 32);   /* plain words */
    sl_label_until = fm1_ms + 1500u;
}
static const char *const SL_NOTE[12] = {"c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"};
static int32_t sl_wrap(int32_t v, int32_t d, int32_t n) { return ((v + d) % n + n) % n; }
static char *sl_num(char *b, int32_t v)     /* a signed number into b (b holds 8) */
{
    char t[8]; int32_t n = 0, i = 0, neg = v < 0;
    uint32_t u = (uint32_t)(neg ? -v : v);
    do { t[n++] = (char)('0' + u % 10u); u /= 10u; } while (u && n < 6);
    if (neg) b[i++] = '-';
    while (n) b[i++] = t[--n];
    b[i] = 0;
    return b;
}
static void sl_say_num(const char *a, int32_t v, const char *unit)
{
    char b[24]; uint32_t i = 0, j = 0; char n[8];
    sl_num(n, v);
    while (n[j] && i < 15u) b[i++] = n[j++];
    for (j = 0; unit && unit[j] && i < 23u; j++) b[i++] = unit[j];
    b[i] = 0;
    sl_say(a, b);
}

/* THE PAGES (2026-11-18, the MPC pass. Flah: "theres no dedicated mixer page but a way to change the same setting in 5
 * diff places", "having to tap a button to change scale seems annoying af, you cant dedicate a page somewhere to make all
 * the tuning and scale and tempo in one spot? think in mpc or daw terms"). One button, one page, one job; every setting
 * lives in exactly one place; an encoder means the same kind of thing on every page: SELECT picks WHAT the page works on
 * (a part, a chord, a lane), the four knobs are its values (named, with their values, on the page's panel), ALGORITHM and
 * PRESETS are the page's two extras. A page's button again: back to the tank.
 *   HOME  TANK    walls  spin  portals  -                          (the tank alone, full size)
 *   SCL   SONG    tempo  rhythm  key  scale (all 52)  | chord every  key pinned  shape every
 *   GLO   MIXER   levels | pan | delay sends | reverb sends (the four parts); keys: 4 white mute, the next 4 solo
 *   FX    FX      filter (left low-pass, right high-pass)  drive  effect  amount, for melody | bass | chords | drums;
 *                 then the returns: delay time, repeats, room, bright
 *   ENV   SOUND   attack  decay  sustain  release, for melody | bass | chords (an FM sound: its carriers, 50% as made)
 *   EDIT  CHORDS  root  type  bars  how many  | how many  famous  shift
 *   SEQ   DRUMS   lane  fill  shift  mine / the rhythm's | kit  tune  decay  swing
 *   SAVE  MIDI    the four parts' channels | in channel, clock in, notes out, clock out
 *   ARP   ARP     pattern  rate  octaves  gate (the button: the arp on / off)
 * The three knobs on the left: the melody's, the bass's and the chords' SOUND, on every page.
 * ARP: the arp on / off and its page; LFO: the slime on / off; OCT- / OCT+ the keyboard's octave; PLAY, REC, SAVE. */
/* PAGES, as a DAW or an MPC has them: one button, one job, and the same button again steps through the page's views
 * (HOME: back to the tank). The three knobs on the left are the three sounds on every page (Flah 2026-11-20: "make all
 * the 3 knobs on the left next to master just control presets for the 3 parts"), so a page has the four knobs only. */
enum { PG_HOME, PG_SONG, PG_MIX, PG_FX, PG_SOUND, PG_CHORDS, PG_DRUMS, PG_MIDI, PG_ARP, PG_N };
static uint8_t sl_page, sl_pview;
static const uint8_t SL_NVIEW[PG_N] = {1, 2, 4, 5, 3, 2, 2, 2, 1};
static const char *const SL_VIEW_NAME[PG_N][5] = {
    {"tank"}, {"song", "song: harmony"}, {"mixer: levels", "mixer: pan", "mixer: delay sends", "mixer: reverb sends"},
    {"fx: melody", "fx: bass", "fx: chords", "fx: drums", "fx: delay, reverb"},
    {"sound: melody", "sound: bass", "sound: chords"}, {"chords", "chords: all"},   /* ("length, glide" went: Flah 2026-11-25 "makes zero sense") */
    {"drums: pattern", "drums: kit"}, {"midi: channels", "midi: in, clock"}, {"arp"}};
static uint8_t sl_fx_part;                  /* FX: the part sl_fx_turn works on (the FX view; the mixer's pan and sends) */
static uint8_t sl_snd_part;                 /* SOUND: 1..3 the part sl_env_turn works on */
static uint8_t sl_cm_sel, sl_lane, sl_famous;
static uint8_t sl_dfill[SH_PLANES];          /* DRUMS: each lane's last fill */
static uint32_t sl_len(const char *s) { uint32_t n = 0; while (s[n]) n++; return n; }
static const char *const SL_DTIME[9] = {"1/4", "1/8", "1/16", "1/32", "1/8 t", "1/16 t", "1/8 .", "1/16 .", "1/4 ."};

static int sl_white(uint32_t k) { uint32_t pc = (53u + k) % 12u; return pc == 0u || pc == 2u || pc == 4u || pc == 5u || pc == 7u || pc == 9u || pc == 11u; }
static int sl_step_of_key(uint32_t k) { uint32_t i, s = 0; if (!sl_white(k)) return -1; for (i = 0; i < k; i++) s += (uint32_t)sl_white(i); return (int)s; }
static int sl_lane_of_key(uint32_t k) { uint32_t i, s = 0; if (sl_white(k)) return -1; for (i = 0; i < k; i++) s += (uint32_t)!sl_white(i); return s < SH_PLANES ? (int)s : -1; }
static char *sl_cat(char *d, const char *s, const char *end) { while (*s && d < end) *d++ = *s++; *d = 0; return d; }
static void sl_chord_name(char *b, uint32_t i)   /* "D min7": the chord's note (as the key stands) and its kind */
{
    char *e = b + 11;
    b[0] = 0;
    sl_cat(sl_cat(b, SL_NOTE[(uint32_t)(sl_root + sl_band.cm_root[i % SH_CM_MAX]) % 12u], e), SH_CQ_NAME[sl_band.cm_qual[i % SH_CM_MAX] % SH_NCQ], e);
}
/* the top line at the tank, playing (Flah 2026-11-25: "at the top of the general interface, it should say what key and
 * scale you're in, and also what chord is currently being jammed on"): "c major - a min". The chord: a progression's own
 * (its name, as the CHORDS page shows it), else the band's chord this bar, its root from the scale and its kind the
 * scale's own triad there (the band may colour it with a 7th: the name says the triad) */
static void sl_status_line(char *b, uint32_t cap)
{
    char c[12], *e = b + cap - 1u;
    b[0] = 0;
    sl_cat(sl_cat(sl_cat(b, SL_NOTE[sl_root % 12], e), " ", e), SL_SCALE_SHORT[sl_scale % SL_NSCALE], e);
    if (sl_band.cm_n && sl_band.cm_cur >= 0) sl_chord_name(c, (uint32_t)sl_band.cm_cur);
    else {
        const sh_scale *sc = sl_tank.s.scale;
        int semis = sc ? (int)(sh_cents_for_degree(sc, sl_bar.chord) / 100.0f + 0.5f) : 0;
        c[0] = 0;
        if (sc && sc->n <= 12) sl_cat(sl_cat(c, SL_NOTE[(uint32_t)(sl_root + semis) % 12u], c + 11), SH_CQ_NAME[sh_band_cq_for(sc, ((semis % 12) + 12) % 12) % SH_NCQ], c + 11);
    }
    if (c[0]) sl_cat(sl_cat(b + sl_len(b), " - ", e), c, e);
}
static void sl_pct(char *b, int32_t v, int32_t max) { char n[8]; sl_cat(sl_cat(b, sl_num(n, v * 100 / max), b + 7), "%", b + 7); }
static const char *sl_filter_word(int32_t f) { return f < -2 ? "low-pass " : f > 2 ? "high-pass " : "open"; }
static uint32_t sl_gate_ms = 110u;          /* the melody's note length (the TANK page) */

/* THE PANEL: what a page shows under the (smaller) tank, made from the state each frame and drawn only when it changed */
typedef struct { char name[10], val[12]; int8_t bar; uint8_t mark; } sl_pcol;   /* bar: -1 none, else 0..100; mark: 1 picked, 2 off */
typedef struct {
    uint8_t page, view;
    char head[40], ex[2][32];               /* the top line (the page, its view); a line of what the view is about */
    sl_pcol c[4];
    uint16_t pat[SH_PLANES]; uint8_t lane, step, pat_on;      /* DRUMS: the grid */
    uint8_t cm_n, cm_sel, cm_cur; char cm[SH_CM_MAX][12];       /* CHORDS: the slots */
} sl_panel;
static sl_panel sl_pm, sl_pm_drawn;
static void sl_col(sl_pcol *c, const char *name, const char *val, int bar, int mark)
{
    sl_cat(c->name, name, c->name + sizeof c->name - 1u); sl_cat(c->val, val, c->val + sizeof c->val - 1u);
    c->bar = (int8_t)(bar < -1 ? -1 : bar > 100 ? 100 : bar); c->mark = (uint8_t)mark;
}
static void sl_db_txt(char *b, int32_t m) { char n[8]; if (m <= SL_MIX_OFF) sl_cat(b, "off", b + 11); else { char *p = b; if (m > 0) p = sl_cat(p, "+", b + 11); p = sl_cat(p, sl_num(n, m / 2), b + 11); sl_cat(p, " db", b + 11); } }
static int sl_env_fm(uint32_t part) { return sl_snd_entry(part, sl_snd_of[part])->eng == 9u; }   /* FM6: its own envelopes */
static void sl_env_read(uint32_t part)       /* the part's envelope as its sound left it (an FM sound: 50% each, its own) */
{
    static const uint8_t P[5] = {P_ATK, P_DEC, P_SUS, P_REL, P_GLIDE};
    uint32_t i;
    for (i = 0; i < 5u; i++) sl_env_v[part][i] = (uint8_t)(sl_env_fm(part) && i < 4u ? 64 : clamp(trk[part].p[P[i]], 0, 127));
}
static void sl_onoff(sl_pcol *c, const char *name, int on, const char *yes, const char *no) { sl_col(c, name, on ? yes : no, -1, on ? 0 : 2); }
static void sl_ch_txt(char *b, uint32_t ch, const char *zero) { char n[8]; b[0] = 0; if (ch == 0xFFu) sl_cat(b, zero, b + 11); else sl_cat(b, sl_num(n, (int32_t)ch + 1), b + 11); }
static void sl_panel_build(sl_panel *m)
{
    char b[24], n[8];
    uint32_t i, v = sl_pview;
    memset(m, 0, sizeof *m);
    m->page = sl_page; m->view = (uint8_t)v;
    sl_cat(m->head, SL_VIEW_NAME[sl_page][v % SL_NVIEW[sl_page]], m->head + 39);
    if (SL_NVIEW[sl_page] > 1u) {                          /* "song 1/2": the page's button again, the next view */
        char *e = m->head + sl_len(m->head);
        e = sl_cat(e, "  ", m->head + 39); e = sl_cat(e, sl_num(n, (int32_t)v + 1), m->head + 39); e = sl_cat(e, "/", m->head + 39);
        sl_cat(e, sl_num(n, SL_NVIEW[sl_page]), m->head + 39);
    }
    if (sl_page == PG_SONG && v == 0u) {
        sl_col(&m->c[0], "tempo", sl_num(n, song.g[G_BPM]), (song.g[G_BPM] - 40) * 100 / 160, 0);
        sl_col(&m->c[1], "rhythm", sh_band_kit_name(sl_kit), -1, 0);   /* (2026-11-25: up here by the tempo; swing went to DRUMS) */
        sl_col(&m->c[2], "key", SL_NOTE[sl_root % 12], -1, 0);
        sl_col(&m->c[3], "scale", SL_SCALE_SHORT[sl_scale % SL_NSCALE], (int)((sl_scale % SL_NSCALE) * 100u / (SL_NSCALE - 1u)), 0);
        sl_cat(m->ex[0], SL_SCALE_NAME[sl_scale % SL_NSCALE], m->ex[0] + sizeof m->ex[0] - 1u);   /* (the scale's whole name, across) */
    } else if (sl_page == PG_SONG) {
        b[0] = 0; sl_cat(sl_cat(b, sl_num(n, sl_band.chord_bars), b + 11), sl_band.chord_bars == 1 ? " bar" : " bars", b + 11); sl_col(&m->c[0], "chord", b, -1, 0);
        sl_col(&m->c[1], "key", sl_pinned ? "pinned" : "moves", -1, 0);
        b[0] = 0; if (SL_CYCLE[sl_cycle]) sl_cat(b, sl_num(n, SL_CYCLE[sl_cycle]), b + 11); else sl_cat(b, "stays", b + 11); sl_col(&m->c[2], "shape", b, -1, 0);
        sl_col(&m->c[3], "", "", -1, 2);
    } else if (sl_page == PG_MIX) {
        int any = sl_solo[0] | sl_solo[1] | sl_solo[2] | sl_solo[3];
        for (i = 0; i < 4u; i++) {
            int off = sl_mute[i] || (any && !sl_solo[i]) || sl_mix[i] <= SL_MIX_OFF;
            const sl_fx *f = &sl_fxs[i];
            b[0] = 0;
            if (v == 0u) {
                if (sl_solo[i]) sl_cat(b, "solo", b + 11); else if (sl_mute[i]) sl_cat(b, "mute", b + 11); else sl_db_txt(b, sl_mix[i]);
                sl_col(&m->c[i], SL_PART_NAME[i], b, (sl_mix[i] - SL_MIX_OFF) * 100 / (12 - SL_MIX_OFF), off ? 2 : 0);
            } else if (v == 1u) {
                if (!f->pan) sl_cat(b, "mid", b + 11); else { sl_cat(b, f->pan < 0 ? "L" : "R", b + 11); sl_cat(b + 1, sl_num(n, f->pan < 0 ? -f->pan : f->pan), b + 11); }
                sl_col(&m->c[i], SL_PART_NAME[i], b, 50 + f->pan * 50 / 64, off ? 2 : 0);
            } else {
                int32_t s = v == 2u ? f->echo : f->space;
                sl_pct(b, s, 127); sl_col(&m->c[i], SL_PART_NAME[i], b, s * 100 / 127, off ? 2 : 0);
            }
        }
        sl_cat(m->ex[0], "keys: mute 1-4, solo 5-8", m->ex[0] + sizeof m->ex[0] - 1u);
    } else if (sl_page == PG_FX) {
        if (v >= 4u) {
            sl_col(&m->c[0], "delay", SL_DTIME[song.g[G_DTIME] % 9], -1, 0);
            b[0] = 0; sl_pct(b, song.g[G_DFDBK], 120); sl_col(&m->c[1], "repeats", b, song.g[G_DFDBK] * 100 / 120, 0);
            b[0] = 0; sl_pct(b, song.g[G_RSIZE], 127); sl_col(&m->c[2], "room", b, song.g[G_RSIZE] * 100 / 127, 0);
            b[0] = 0; sl_pct(b, 127 - song.g[G_RDAMP], 127); sl_col(&m->c[3], "bright", b, (127 - song.g[G_RDAMP]) * 100 / 127, 0);
        } else {
            const sl_fx *f = &sl_fxs[v];
            b[0] = 0; if (!f->filt) sl_cat(b, "open", b + 11); else { sl_cat(b, f->filt < 0 ? "lp " : "hp ", b + 11); sl_cat(b + 3, sl_num(n, f->filt < 0 ? -f->filt : f->filt), b + 11); }
            sl_col(&m->c[0], "filter", b, 50 + f->filt * 50 / 64, 0);
            b[0] = 0; sl_pct(b, f->drive, 127); sl_col(&m->c[1], v == SL_P_DRUMS ? "punch" : "drive", b, f->drive * 100 / 127, 0);
            sl_col(&m->c[2], "effect", SL_CHAR[f->ctype % SL_NCHAR].name, -1, 0);
            b[0] = 0; if (f->ctype) sl_pct(b, f->camt, 127); else sl_cat(b, "-", b + 11); sl_col(&m->c[3], "amount", b, f->ctype ? f->camt * 100 / 127 : -1, 0);
        }
    } else if (sl_page == PG_SOUND && v < 3u) {
        static const char *const W[4] = {"atk", "dec", "sus", "rel"};   /* (the hardware words: the full ones touch at 240 px) */
        if (!sl_env_on[v]) sl_env_read(v);                 /* (an FM sound too: its carriers' shape, 50% = as made) */
        for (i = 0; i < 4u; i++) { b[0] = 0; sl_pct(b, sl_env_v[v][i], 127); sl_col(&m->c[i], W[i], b, sl_env_v[v][i] * 100 / 127, 0); }
        sl_cat(m->ex[0], sl_snd_entry(v, sl_snd_of[v])->name, m->ex[0] + sizeof m->ex[0] - 1u);
    } else if (sl_page == PG_CHORDS) {
        uint32_t c = sl_cm_sel % SH_CM_MAX;
        m->cm_n = (uint8_t)sl_band.cm_n; m->cm_sel = (uint8_t)c; m->cm_cur = (uint8_t)(sl_band.cm_cur < 0 ? 0xFF : sl_band.cm_cur);
        for (i = 0; i < (uint32_t)sl_band.cm_n && i < SH_CM_MAX; i++) sl_chord_name(m->cm[i], i);
        if (v == 0u) {
            sl_col(&m->c[0], "chord", sl_num(n, (int32_t)c + 1), -1, 0);
            sl_col(&m->c[1], "root", c < (uint32_t)sl_band.cm_n ? SL_NOTE[(uint32_t)(sl_root + sl_band.cm_root[c]) % 12u] : "-", -1, 0);
            sl_col(&m->c[2], "type", c < (uint32_t)sl_band.cm_n ? (sl_band.cm_qual[c] ? SH_CQ_NAME[sl_band.cm_qual[c] % SH_NCQ] : "major") : "-", -1, 0);
            b[0] = 0; if (c < (uint32_t)sl_band.cm_n) { sl_cat(b, sl_num(n, sl_band.cm_bars[c]), b + 11); sl_cat(b + sl_len(b), sl_band.cm_bars[c] == 1 ? " bar" : " bars", b + 11); } else sl_cat(b, "-", b + 11);
            sl_col(&m->c[3], "bars", b, -1, 0);
        } else {
            sl_col(&m->c[0], "chords", sl_band.cm_n ? sl_num(n, sl_band.cm_n) : "slime", -1, 0);
            sl_col(&m->c[1], "famous", SH_FAMOUS[sl_famous % SH_NFAMOUS].name, -1, 0);
            sl_col(&m->c[2], "shift", "< >", -1, 0);
            sl_col(&m->c[3], "", "", -1, 2);
        }
    } else if (sl_page == PG_DRUMS && v == 0u) {
        static const char *const FILL[6] = {"-", "16ths", "8ths", "3rds", "beats", "halves"};
        memcpy(m->pat, sl_band.pat, sizeof m->pat); m->lane = sl_lane; m->pat_on = (uint8_t)sl_band.pat_on;
        m->step = (uint8_t)(sl_run ? sl_step % 16u : 0xFFu);
        sl_col(&m->c[0], "lane", SH_PLANE_NAME[sl_lane % SH_PLANES], -1, 0);
        sl_col(&m->c[1], "fill", FILL[sl_dfill[sl_lane % SH_PLANES] % 6u], -1, 0);
        sl_col(&m->c[2], "shift", "< >", -1, 0);
        sl_col(&m->c[3], "pattern", sl_band.pat_on ? "mine" : "rhythm", -1, 0);
    } else if (sl_page == PG_DRUMS) {                      /* the kit: the site's own drums, any rhythm's sound, tuned, longer or shorter */
        int32_t t = sd_tune;
        sl_col(&m->c[0], "kit", sd_tone == 0xFFu ? "rhythm" : sh_band_kit_name(sd_tone), -1, 0);
        b[0] = 0; if (t > 0) sl_cat(b, "+", b + 11); sl_cat(b + sl_len(b), sl_num(n, t), b + 11); sl_col(&m->c[1], "tune", b, 50 + t * 50 / 12, 0);
        b[0] = 0; sl_pct(b, sd_decay * 100 / 8, 100); sl_col(&m->c[2], "decay", b, (sd_decay - 4) * 100 / 12, 0);
        b[0] = 0; sl_pct(b, (int32_t)(sl_swing * 100.0 + 0.5), 100); sl_col(&m->c[3], "swing", b, (int)(sl_swing * 200.0), 0);   /* (was "feel": the
                                                           * drummer's humanize on / off, "i literally don't even hear any difference": Flah) */
        sl_cat(m->ex[0], sd_tone == 0xFFu ? "each rhythm plays its own kit" : "every rhythm plays this kit", m->ex[0] + sizeof m->ex[0] - 1u);
    } else if (sl_page == PG_ARP) {                        /* ARP: the band's chords one note at a time */
        sl_col(&m->c[0], "pattern", SL_ARP_PAT_NAME[sl_arp_pat % SL_ARP_NPAT], -1, 0);
        sl_col(&m->c[1], "rate", SL_ARP_RATE[sl_arp_rate % SL_ARP_NRATE].name, (int)(sl_arp_rate * 100u / (SL_ARP_NRATE - 1u)), 0);
        b[0] = 0; sl_cat(b, sl_num(n, sl_arp_oct), b + 11); sl_cat(b + sl_len(b), sl_arp_oct == 1 ? " oct" : " octs", b + 11); sl_col(&m->c[2], "octaves", b, (sl_arp_oct - 1) * 50, 0);
        b[0] = 0; sl_pct(b, sl_arp_gate, 100); sl_col(&m->c[3], "gate", b, sl_arp_gate, 0);
        sl_cat(m->ex[0], sl_arp_on ? "on: chords one note at a time" : "off: ARP turns it on", m->ex[0] + sizeof m->ex[0] - 1u);
    } else if (sl_page == PG_MIDI && v == 0u) {            /* each part's channel out (the drums' channel in plays the kit) */
        for (i = 0; i < 4u; i++) { sl_ch_txt(b, sl_mch[i] > 15u ? 0xFFu : sl_mch[i], "off"); sl_col(&m->c[i], SL_PART_NAME[i], b, -1, sl_mch[i] > 15u ? 2 : 0); }
        sl_cat(m->ex[0], "each part's channel out", m->ex[0] + sizeof m->ex[0] - 1u);
    } else if (sl_page == PG_MIDI) {
        sl_ch_txt(b, sl_min_ch ? sl_min_ch - 1u : 0xFFu, "all"); sl_col(&m->c[0], "in", b, -1, 0);
        sl_onoff(&m->c[1], "sync", sl_mclk_in, "follow", "own");        /* (a clock coming in: followed, or not) */
        sl_onoff(&m->c[2], "notes", sl_mo_en, "out", "off");
        sl_onoff(&m->c[3], "clock", sl_mclk_out, "out", "off");
        sl_cat(m->ex[0], "in: jack + usb  out: usb", m->ex[0] + sizeof m->ex[0] - 1u);
    }
}

static void sl_fx_turn(int32_t knob, int32_t d)
{
    sl_fx *f = &sl_fxs[sl_fx_part % 4u];
    if (knob == 0) {
        int32_t was = f->filt, now = clamp(was + d, -64, 63);
        if ((was > 0 && now < 0) || (was < 0 && now > 0)) now = 0;   /* crossing the middle stops at open (a detent) */
        f->filt = (int8_t)now;
        sl_say_num(sl_filter_word(f->filt), f->filt < 0 ? -f->filt : f->filt, 0);
        if (!f->filt) sl_say("filter open", 0);
    } else if (knob == 1) {
        f->drive = (uint8_t)clamp((int32_t)f->drive + d, 0, 127);
        sl_say_num(sl_fx_part == SL_P_DRUMS ? "punch " : "drive ", f->drive * 100 / 127, "%");
    } else if (knob == 2) {
        f->ctype = (uint8_t)sl_wrap(f->ctype, d, (int32_t)SL_NCHAR);
        if (f->ctype && !f->camt) f->camt = 64;
        sl_say("character: ", SL_CHAR[f->ctype].name);
    } else if (knob == 3) {
        f->camt = (uint8_t)clamp((int32_t)f->camt + d, 0, 127);
        if (f->ctype) sl_say_num("amount ", f->camt * 100 / 127, "%"); else sl_say("character off", 0);
    } else if (knob == 4) {
        f->pan = (int8_t)clamp(f->pan + d, -64, 63);
        if (!f->pan) sl_say("pan: the middle", 0); else sl_say_num(f->pan < 0 ? "pan left " : "pan right ", f->pan < 0 ? -f->pan : f->pan, 0);
    } else if (knob == 5) {
        f->echo = (uint8_t)clamp((int32_t)f->echo + d, 0, 127);
        sl_say_num("delay send ", f->echo * 100 / 127, "%");
    } else if (knob == 6) {
        f->space = (uint8_t)clamp((int32_t)f->space + d, 0, 127);
        sl_say_num("reverb send ", f->space * 100 / 127, "%");
    }
    sl_fxp[sl_fx_part % 4u] = 0xFF;                        /* (a preset no more: your own) */
    sl_fx_apply(sl_fx_part % 4u);
}
static void sl_mix_turn(uint32_t part, int32_t d)
{
    sl_mix[part] = (int8_t)clamp(sl_mix[part] + d, SL_MIX_OFF, 12);
    slime_levels();
    if (sl_mix[part] <= SL_MIX_OFF) sl_say(SL_PART_NAME[part], " off");
    else { char b[16]; uint32_t i = 0, j = 0; const char *p = SL_PART_NAME[part];
           while (p[j] && i < 8u) b[i++] = p[j++]; b[i++] = ' '; b[i] = 0;
           sl_say_num(b, sl_mix[part] / 2, " db"); }
}
/* SOUND: a part's envelope (an FM sound keeps its own: its operators are its envelope) */
static void sl_env_turn(uint32_t knob, int32_t d)
{
    static const char *const W[5] = {"attack ", "decay ", "sustain ", "release ", "glide "};
    uint32_t p, lo = sl_snd_part - 1u, hi = sl_snd_part - 1u;
    int said = 0;
    for (p = lo; p <= hi; p++) {
        if (!sl_env_on[p]) { sl_env_read(p); sl_env_on[p] = 1; }
        sl_env_v[p][knob] = (uint8_t)clamp((int32_t)sl_env_v[p][knob] + d, 0, 127);
        sl_env_put(p);
        if (!said) { sl_say_num(W[knob], sl_env_v[p][knob] * 100 / 127, "%"); said = 1; }
    }
}

/* THE SESSION. What a person set up, kept in the FM-1's flash by itself, as the site remembers where you were: the
 * sounds, the rhythm, the key, the scale, the tempo, the shape, the fx, the mix, the chords, the drums, the MIDI page and
 * the loop. SLOOP's storage (storage.c: two copies, a torn write leaves the old one) in one of SLOOP's project objects,
 * which this firmware does not otherwise use. A flash erase silences the audio while it runs (felucca.c), so it is
 * written when stopped, 3 s after the last change, and read back at power-on. (SAVE's three songs went 2026-11-20: Flah
 * "idk what save does or where that saves shit to"; SAVE is the MIDI page.) */
#define SL_SONG_MAGIC 0x534C4D35u   /* "SLM5" (2026-11-25: the sound lists, the arp; SLM4: 52 scales, the MIDI page, the drums' kit) */
typedef struct {
    uint32_t magic, size;
    uint8_t snd[3], kit, scale, walls, space, slime, arp_on, arp_pat, arp_rate, arp_oct, arp_gate, mute[4], solo[4], busy, cycle, pinned, chord_bars, dtime, rsize, dfdbk, rdamp, dcolor;
    int8_t root, spin, octave, mix[4];
    uint16_t bpm, gate_ms;
    uint8_t swing100, fxp[4], env_on[3], env[3][5];
    sl_fx fx[4];
    uint8_t loop_bars, pad;
    uint8_t cm_n, cm_root[SH_CM_MAX], cm_qual[SH_CM_MAX], cm_bars[SH_CM_MAX], pat_on, human;   /* CHORDS, DRUMS */
    uint16_t pat[SH_PLANES];
    uint8_t mch[4], min_ch, mclk_in, mo_en, mclk_out, dtone, ddecay; int8_t dtune;   /* the MIDI page; the drums' kit */
    uint16_t loop_n;
    sl_lev loop[SL_LOOP_MAX];
    uint32_t sum;
} sl_song;
_Static_assert(sizeof(sl_song) <= ST_PAYLOAD_MAX, "a song fits one flash object");
static sl_song sl_sbuf;
static uint32_t sl_song_hash(const sl_song *g) { return proj_hash(g, sizeof *g - 4u); }
UI_SMALL static void sl_song_take(sl_song *g)
{
    uint32_t p;
    memset(g, 0, sizeof *g);
    g->magic = SL_SONG_MAGIC; g->size = sizeof *g;
    for (p = 0; p < 3u; p++) { g->snd[p] = sl_snd_of[p]; g->env_on[p] = sl_env_on[p]; memcpy(g->env[p], sl_env_v[p], 5); }
    g->kit = sl_kit; g->scale = sl_scale; g->walls = sl_walls; g->space = sl_space;
    g->slime = sl_slime; g->arp_on = sl_arp_on; g->arp_pat = sl_arp_pat; g->arp_rate = sl_arp_rate; g->arp_oct = sl_arp_oct; g->arp_gate = sl_arp_gate; memcpy(g->mute, sl_mute, 4); memcpy(g->solo, sl_solo, 4); g->busy = sl_dens; g->cycle = sl_cycle; g->pinned = sl_pinned;
    g->dfdbk = (uint8_t)song.g[G_DFDBK]; g->rdamp = (uint8_t)song.g[G_RDAMP]; g->dcolor = (uint8_t)song.g[G_DCOLOR];
    g->chord_bars = (uint8_t)sl_band.chord_bars; g->dtime = (uint8_t)song.g[G_DTIME]; g->rsize = (uint8_t)song.g[G_RSIZE];
    g->root = (int8_t)sl_root; g->spin = sl_spin; g->octave = sl_octave; g->bpm = (uint16_t)song.g[G_BPM]; g->gate_ms = (uint16_t)sl_gate_ms;
    g->swing100 = (uint8_t)(sl_swing * 100.0 + 0.5);
    for (p = 0; p < 4u; p++) { g->mix[p] = sl_mix[p]; g->fxp[p] = sl_fxp[p]; g->fx[p] = sl_fxs[p]; }
    g->cm_n = (uint8_t)sl_band.cm_n; memcpy(g->cm_root, sl_band.cm_root, SH_CM_MAX); memcpy(g->cm_qual, sl_band.cm_qual, SH_CM_MAX); memcpy(g->cm_bars, sl_band.cm_bars, SH_CM_MAX);
    g->pat_on = (uint8_t)sl_band.pat_on; g->human = (uint8_t)sl_band.human; memcpy(g->pat, sl_band.pat, sizeof g->pat);
    memcpy(g->mch, sl_mch, 4); g->min_ch = sl_min_ch; g->mclk_in = sl_mclk_in; g->mo_en = sl_mo_en; g->mclk_out = sl_mclk_out;
    g->dtone = sd_tone; g->ddecay = sd_decay; g->dtune = sd_tune;
    if (sl_loop_state == SL_LOOP_PLAY) {
        fm1_irq_off(); g->loop_bars = sl_loop_bars; g->loop_n = sl_loop_n; memcpy(g->loop, sl_loop_ev, sl_loop_n * sizeof g->loop[0]); fm1_irq_on();
    }
    g->sum = sl_song_hash(g);
}
UI_SMALL static int sl_song_ok(const sl_song *g) { return g->magic == SL_SONG_MAGIC && g->size == sizeof *g && g->sum == sl_song_hash(g); }
UI_SMALL static void sl_song_put(const sl_song *g)   /* (requests, as a hand's: the sounds load in the audio interrupt) */
{
    uint32_t p;
    for (p = 0; p < 3u; p++) {
        sl_snd_req[p] = (uint8_t)(g->snd[p] % sl_snd_count(p));
        sl_env_on[p] = g->env_on[p]; memcpy(sl_env_v[p], g->env[p], 5);
    }
    sl_kit_req = g->kit; sl_scale_req = (uint8_t)(g->scale % SL_NSCALE);
    sl_root_req = (int8_t)(clamp(g->root, 48, 71) - sl_root);
    sl_walls = (uint8_t)clamp(g->walls, 3, 12); sl_space = g->space ? 1u : 0u; sl_reform_req = 1;
    sl_slime = g->slime ? 1u : 0u; sl_arp_on = g->arp_on ? 1u : 0u; sl_arp_pat = (uint8_t)(g->arp_pat % SL_ARP_NPAT);
    sl_arp_rate = (uint8_t)(g->arp_rate % SL_ARP_NRATE); sl_arp_oct = (uint8_t)clamp(g->arp_oct, 1, 3); sl_arp_gate = (uint8_t)clamp(g->arp_gate, 10, 100);
    for (p = 0; p < 4u; p++) { sl_mute[p] = g->mute[p] ? 1u : 0u; sl_solo[p] = g->solo[p] ? 1u : 0u; }
    sl_dens = (uint8_t)(g->busy % 5u); sl_cycle = (uint8_t)(g->cycle % 4u);
    song.g[G_DFDBK] = (int16_t)clamp(g->dfdbk, 0, 120); song.g[G_RDAMP] = (int16_t)clamp(g->rdamp, 0, 127); song.g[G_DCOLOR] = (int16_t)clamp(g->dcolor, 0, 127);
    sl_pinned = g->pinned ? 1u : 0u;
    sl_band.chord_bars = g->chord_bars == 1u || g->chord_bars == 4u ? g->chord_bars : 2u;
    song.g[G_DTIME] = (int16_t)(g->dtime % 9u); song.g[G_RSIZE] = (int16_t)clamp(g->rsize, 0, 127);
    song.g[G_BPM] = (int16_t)clamp(g->bpm, 40, 200);
    sl_spin = (int8_t)clamp(g->spin, -100, 100); sl_octave = (int8_t)clamp(g->octave, -2, 2);
    sl_gate_ms = (uint32_t)clamp(g->gate_ms, 40, 600); sl_gate_blocks = sl_ms_to_block((double)sl_gate_ms);
    sl_swing = g->swing100 > 50u ? 0.5 : g->swing100 / 100.0;
    for (p = 0; p < 4u; p++) {
        sl_mix[p] = (int8_t)clamp(g->mix[p], SL_MIX_OFF, 12); sl_fxs[p] = g->fx[p]; sl_fxp[p] = g->fxp[p];
        if (sl_fxs[p].ctype >= SL_NCHAR) sl_fxs[p].ctype = 0;
        if (p == SL_P_DRUMS || sl_fxp[p]) sl_fx_apply(p);  /* (a synth part on its sound's own fx reads them when it loads) */
    }
    for (p = 0; p < 4u; p++) sl_mch[p] = (uint8_t)(g->mch[p] > 15u ? 16u : g->mch[p]);
    sl_min_ch = (uint8_t)(g->min_ch % 17u); sl_mclk_in = g->mclk_in ? 1u : 0u; sl_mo_en = g->mo_en ? 1u : 0u; sl_mclk_out = g->mclk_out ? 1u : 0u;
    sd_tone = (uint8_t)(g->dtone < 11u ? g->dtone : 0xFFu); sd_decay = (uint8_t)clamp(g->ddecay, 4, 16); sd_tune = (int8_t)clamp(g->dtune, SD_TUNE_MIN, 12);   /* (an older session's -12 comes back as -2) */
    {   /* the progression and the pattern (checked: a song is read from flash) */
        uint32_t i;
        sl_band.cm_n = g->cm_n <= SH_CM_MAX ? g->cm_n : 0; sl_band.cm_i = 0; sl_band.cm_left = 0;
        for (i = 0; i < SH_CM_MAX; i++) { sl_band.cm_root[i] = (int8_t)(((g->cm_root[i] % 12) + 12) % 12); sl_band.cm_qual[i] = (uint8_t)(g->cm_qual[i] % SH_NCQ); sl_band.cm_bars[i] = g->cm_bars[i] == 2u || g->cm_bars[i] == 4u ? g->cm_bars[i] : 1u; }
        sl_band.pat_on = g->pat_on ? 1 : 0; sl_band.human = g->human ? 1 : 0; memcpy(sl_band.pat, g->pat, sizeof g->pat);
    }
    slime_levels();
    fm1_irq_off();
    sl_loop_clear();
    if (g->loop_bars && g->loop_n && g->loop_n <= SL_LOOP_MAX && g->loop_bars <= 8u) {
        memcpy(sl_loop_ev, g->loop, g->loop_n * sizeof g->loop[0]);
        sl_loop_n = g->loop_n; sl_loop_bars = g->loop_bars; sl_loop_at = (uint8_t)(g->loop_bars - 1u); sl_loop_state = SL_LOOP_PLAY;
    }
    fm1_irq_on();
}
static uint32_t sl_changed_ms, sl_auto_hash;   /* the last hand on the panel; what the session in flash holds */
static uint8_t sl_restored;                    /* the session has been read back (after the splash): only then is one written */
UI_SMALL static int sl_song_read(uint32_t obj)
{
    if (!flash_ok || st_load(obj, &sl_sbuf, sizeof sl_sbuf) != (int)sizeof sl_sbuf || !sl_song_ok(&sl_sbuf)) return 0;
    sl_song_put(&sl_sbuf);
    return 1;
}
#define SL_OBJ_SESSION (OBJ_PROJECT0 + 3u)
UI_SMALL static void sl_session_tick(void)   /* main loop: the session into flash, stopped and quiet, 3 s after a change */
{
    static uint32_t checked;
    if (sl_run || !flash_ok || !sl_restored || fm1_ms - sl_changed_ms < 3000u || fm1_ms - checked < 1000u) return;
    checked = fm1_ms;
    sl_song_take(&sl_sbuf);
    if (sl_sbuf.sum == sl_auto_hash || !audio_quiet()) return;
    if (st_save(SL_OBJ_SESSION, &sl_sbuf, sizeof sl_sbuf) == 0) sl_auto_hash = sl_sbuf.sum;
}

/* TAPS. A button with a second job does it on a double tap (a second press within 300 ms); its first job then waits
 * those 300 ms, so it never fires as well. PLAY acts at once (its double tap: from the top). */
#define SL_TAP_MS 300u
static uint32_t sl_tap_t[NB];
static uint32_t sl_tap_wait;                 /* bit b: button b's first job is waiting for a second tap */
static int sl_tap2(uint32_t b, uint32_t pressed)   /* this press is a double tap */
{
    if (!(pressed & (1u << panel.btn[b]))) return 0;
    if (((sl_tap_wait >> b) & 1u) && fm1_ms - sl_tap_t[b] < SL_TAP_MS) { sl_tap_wait &= ~(1u << b); return 1; }
    sl_tap_wait |= 1u << b; sl_tap_t[b] = fm1_ms;
    return 0;
}
static int sl_tap1(uint32_t b)               /* the first job's time has come (no second tap) */
{
    if (((sl_tap_wait >> b) & 1u) && fm1_ms - sl_tap_t[b] >= SL_TAP_MS) { sl_tap_wait &= ~(1u << b); return 1; }
    return 0;
}

static void sl_goto(uint8_t pg)              /* a page's button: its page (its first view), or pressed on it: the next view */
{
    if (sl_page != pg) { sl_page = pg; sl_pview = 0; }
    else sl_pview = (uint8_t)((sl_pview + 1u) % SL_NVIEW[pg]);
    sl_say(SL_VIEW_NAME[sl_page][sl_pview], 0);
}
static void slime_poll(void)                /* often: nothing a hand does waits for a frame */
{
    uint32_t rel, pressed = fm1_input_edges(&rel), keys = fm1_input_note_edges();
#define SL_PRESSED(b) (pressed & (1u << panel.btn[b]))
    if (keys && sl_page == PG_DRUMS && sl_pview == 0u) {    /* DRUMS: the white keys are steps, the black ones lanes; no notes */
        uint32_t k;
        for (k = 0; k < 27u; k++) if ((keys >> k) & 1u) {
            int s = sl_step_of_key(k), l = sl_lane_of_key(k);
            if (s >= 0 && s < 16) { sl_band.pat[sl_lane % SH_PLANES] ^= (uint16_t)(1u << s); sl_band.pat_on = 1; }
            else if (l >= 0) sl_lane = (uint8_t)l;
        }
        keys = 0;
    }
    if (keys && sl_page == PG_MIX) {                       /* MIXER: white keys 1-4 mute, 5-8 solo (the rest still play) */
        uint32_t k;
        for (k = 0; k < 27u; k++) if ((keys >> k) & 1u) {
            int s = sl_step_of_key(k);
            if (s < 0 || s > 7) continue;
            if (s < 4) { sl_mute[s] = (uint8_t)!sl_mute[s]; sl_say(SL_PART_NAME[s], sl_mute[s] ? " muted" : " on"); }
            else { sl_solo[s - 4] = (uint8_t)!sl_solo[s - 4]; sl_say(SL_PART_NAME[s - 4], sl_solo[s - 4] ? " solo" : " solo off"); }
            keys &= ~(1u << k);
        }
        slime_levels();
    }
    if (keys && sl_page == PG_CHORDS) {                    /* CHORDS: a key sets the chord picked to its note, then the next */
        uint32_t k;
        const sh_scale *sc = sh_scale_by_id(SL_SCALES[sl_scale % SL_NSCALE]);
        for (k = 0; k < 27u; k++) if ((keys >> k) & 1u) {
            int semis = ((53 + (int)k - sl_root) % 12 + 12) % 12;
            if (sl_cm_sel >= sl_band.cm_n) { if (!sl_band.cm_n) { sl_band.cm_i = 0; sl_band.cm_left = 0; } sl_band.cm_n = sl_cm_sel + 1; }
            sl_band.cm_root[sl_cm_sel] = (int8_t)semis; sl_band.cm_qual[sl_cm_sel] = (uint8_t)sh_band_cq_for(sc, semis);
            if (!sl_band.cm_bars[sl_cm_sel]) sl_band.cm_bars[sl_cm_sel] = 1;
            sl_cm_sel = (uint8_t)((sl_cm_sel + 1u) % SH_CM_MAX);
        }
    }
    if (keys) {
        fm1_irq_off(); sl_key_req |= keys; fm1_irq_on();
    }
    if (pressed) sl_changed_ms = fm1_ms;
    if ((pressed || keys) && sl_splash_t0 && !sl_splash_done && !sl_skip) { sl_skip = 1; sl_skip_at = fm1_ms; }   /* a hand: on to the fade */
    /* ---- the buttons: the same on every page ---- */
    {   /* PLAY: at once; a double tap: from the top (the band's bar 1, the loop's bar 1) */
        static uint32_t last;
        if (SL_PRESSED(B_PLAY)) {
            if (fm1_ms - last < SL_TAP_MS) { sl_run = 1; sl_step = 0; sl_loop_at = (uint8_t)(sl_loop_bars ? sl_loop_bars - 1u : 0u); sl_say("from the top", 0); }
            else {
                static uint8_t told;
                sl_run = (uint8_t)!sl_run; sl_say(sl_run ? "play" : "stop", 0);
                if (sl_run && !told) { told = 1; sl_say("keys drop notes in", 0); sl_label_until = fm1_ms + 2500u; }   /* (once: stopped,
                                                           * a key only plays its note; playing, it drops a note into the tank) */
            }
            last = fm1_ms;
        }
    }
    if (SL_PRESSED(B_HOME) && sl_page != PG_HOME) { sl_page = PG_HOME; sl_pview = 0; sl_say("tank", 0); }   /* (its "new shape"
                                                           * at the tank went 2026-11-21: it did what KNOB 1, walls, does) */
    if (SL_PRESSED(B_SCL)) sl_goto(PG_SONG);
    if (SL_PRESSED(B_GLO)) sl_goto(PG_MIX);
    if (SL_PRESSED(B_FX)) sl_goto(PG_FX);
    if (SL_PRESSED(B_ENV)) sl_goto(PG_SOUND);
    if (SL_PRESSED(B_EDIT)) sl_goto(PG_CHORDS);
    if (SL_PRESSED(B_SEQ)) sl_goto(PG_DRUMS);
    if (SL_PRESSED(B_ARP)) {                               /* ARP: the band's chords arpeggiated, on / off, and its page (Flah 2026-11-25;
                                                            * the auto-notes went: "this device has a built-in keyboard") */
        sl_arp_on = (uint8_t)!sl_arp_on; sl_page = PG_ARP; sl_pview = 0; slime_levels();
        sl_say("arp ", sl_arp_on ? "on" : "off");
    }
    if (SL_PRESSED(B_LFO)) { sl_slime = (uint8_t)!sl_slime; sl_swing_hand = 0; sl_say("slime ", sl_slime ? "on" : "off"); }   /* (a new slime session: the
                                                           * swing breathes again until the knob is turned) */
    /* REC: the loop (count-in, take, close; overdub on a playing loop); a double tap: the loop cleared */
    if (sl_tap2(B_REC, pressed)) { sl_loop_clear(); sl_say("loop cleared", 0); }
    if (sl_tap1(B_REC)) {
        uint8_t was = sl_loop_state;
        if (!sl_run && was == SL_LOOP_OFF) sl_run = 1;     /* (the site: recording starts the music) */
        sl_loop_press();
        sl_say(was == SL_LOOP_OFF ? "rec: count-in" : was == SL_LOOP_ARMED ? "rec off" : was == SL_LOOP_REC ? "loop closes at the bar" :
               sl_loop_dub ? "overdub: play over the loop" : "overdub off", 0);
    }
    if (SL_PRESSED(B_SAVE)) sl_goto(PG_MIDI);              /* SAVE: the MIDI page (the session saves itself) */
    if (SL_PRESSED(B_OCTDN) || SL_PRESSED(B_OCTUP)) {      /* the keyboard's octave, as on any synth; both: back to the middle */
        uint32_t both = (1u << panel.btn[B_OCTDN]) | (1u << panel.btn[B_OCTUP]);
        if ((fm1_in.buttons & both) == both) sl_octave = 0;
        else sl_octave = (int8_t)clamp(sl_octave + (SL_PRESSED(B_OCTUP) ? 1 : -1), -2, 2);
        sl_say_num("octave ", sl_octave, 0);
    }
    /* ---- the encoders. The three on the left are the three sounds, on every page: SELECT the melody's, ALGORITHM the
     * bass's, PRESETS the chords' (Flah 2026-11-20). The four knobs are the page's view. Every knob over a range
     * accelerates (SLOOP's accel(), after JIANT FM): a slow turn is one step, a fast one sweeps; lists step one at a time ---- */
    {
        int32_t k1 = panel_enc(EN_K1), k2 = panel_enc(EN_K2), k3 = panel_enc(EN_K3), k4 = panel_enc(EN_K4);
        int32_t snd[3], v = sl_pview;
        uint32_t p;
        snd[0] = panel_enc(EN_SELECT); snd[1] = panel_enc(EN_ALGO); snd[2] = panel_enc(EN_PRESET);
        for (p = 0; p < 3u; p++) if (snd[p]) {
            uint32_t i = (uint32_t)sl_wrap(sl_snd_req[p] != 0xFFu ? sl_snd_req[p] : sl_snd_of[p], snd[p], (int32_t)sl_snd_count(p));
            sl_snd_req[p] = (uint8_t)i; sl_env_on[p] = 0;
            sl_say(p == 0 ? "melody: " : p == 1 ? "bass: " : "chords: ", sl_snd_entry(p, i)->name);
        }
        if (sl_page == PG_HOME) {                          /* TANK: the instrument */
            if (k1) { sl_walls = (uint8_t)clamp((int32_t)sl_walls + k1, 3, 12); sl_reform_req = 1; sl_hand_shape = 1; sl_say_num("walls ", sl_walls, 0); }
            if (k2) { sl_spin = (int8_t)clamp(sl_spin + accel(EN_K2, k2, 51) * 4, -100, 100); if (sl_spin) sl_say_num("spin ", sl_spin, 0); else sl_say("spin off", 0); }
            if (k3) { sl_space = (uint8_t)(k3 > 0); sl_reform_req = 1; sl_hand_shape = 1; sl_say(sl_space ? "portals on" : "portals off", 0); }
            /* (knob 4, "notes a bar", went 2026-11-25: with no auto-notes it only set how many of your notes the tank kept;
             * it stays the site's 8) */
        } else if (sl_page == PG_SONG && v == 0) {         /* SONG: tempo, rhythm, key, scale */
            if (k1) { int32_t t = clamp(song.g[G_BPM] + accel(EN_K1, k1, 161), 40, 200); song.g[G_BPM] = (int16_t)t; sl_say_num("tempo ", t, 0); }
            if (k2) { sl_kit_req = (uint8_t)sl_wrap(sl_kit_req != 0xFFu ? sl_kit_req : sl_kit, k2, sh_band_nkits()); sl_say("rhythm: ", sh_band_kit_name(sl_kit_req)); }
            if (k3) { int32_t nr = clamp(sl_root + k3, 48, 71); sl_root_req = (int8_t)(nr - sl_root); sl_say("key: ", SL_NOTE[nr % 12]); }
            if (k4) { sl_scale_req = (uint8_t)sl_wrap(sl_scale_req != 0xFFu ? sl_scale_req : sl_scale, k4, (int32_t)SL_NSCALE); sl_say("scale: ", SL_SCALE_NAME[sl_scale_req]); }
        } else if (sl_page == PG_SONG) {                   /* SONG 2: the harmony's pace, the key, the shape's life */
            if (k1) { static const uint8_t CB[3] = {1, 2, 4}; int32_t at = sl_band.chord_bars >= 4 ? 2 : sl_band.chord_bars >= 2 ? 1 : 0;
                      sl_band.chord_bars = CB[clamp(at + (k1 > 0 ? 1 : -1), 0, 2)]; sl_say_num("a chord every ", sl_band.chord_bars, sl_band.chord_bars == 1 ? " bar" : " bars"); }
            if (k2) { sl_pinned = (uint8_t)(k2 > 0); sl_say("key: ", sl_pinned ? "pinned" : "moves with the slime"); }
            if (k3) { sl_cycle = (uint8_t)clamp(sl_cycle + k3, 0, 3); if (SL_CYCLE[sl_cycle]) sl_say_num("new shape every ", SL_CYCLE[sl_cycle], " bars"); else sl_say("the shape stays", 0); }
        } else if (sl_page == PG_MIX) {                    /* MIXER: the four parts' levels, pans, delay sends, reverb sends */
            int32_t kk[4];
            kk[0] = k1; kk[1] = k2; kk[2] = k3; kk[3] = k4;
            for (p = 0; p < 4u; p++) if (kk[p]) {
                int32_t a = accel((uint32_t)(EN_K1 + p), kk[p], v == 0 ? 53 : 128);
                if (v == 0) sl_mix_turn(p, a);
                else { uint8_t was = sl_fx_part; sl_fx_part = (uint8_t)p; sl_fx_turn(v == 1 ? 4 : v == 2 ? 5 : 6, a); sl_fx_part = was; }
            }
        } else if (sl_page == PG_FX) {                     /* FX: a part's filter, drive, effect, amount; or the returns */
            if (v >= 4) {
                if (k1) { song.g[G_DTIME] = (int16_t)sl_wrap(song.g[G_DTIME], k1, 9); sl_say("delay time ", SL_DTIME[song.g[G_DTIME]]); }
                if (k2) { song.g[G_DFDBK] = (int16_t)clamp(song.g[G_DFDBK] + accel(EN_K2, k2, 121), 0, 120); sl_say_num("delay repeats ", song.g[G_DFDBK] * 100 / 120, "%"); }
                if (k3) { song.g[G_RSIZE] = (int16_t)clamp(song.g[G_RSIZE] + accel(EN_K3, k3, 128), 0, 127); sl_say_num("reverb room ", song.g[G_RSIZE] * 100 / 127, "%"); }
                if (k4) { song.g[G_RDAMP] = (int16_t)clamp(song.g[G_RDAMP] - accel(EN_K4, k4, 128), 0, 127); sl_say_num("reverb bright ", (127 - song.g[G_RDAMP]) * 100 / 127, "%"); }
            } else {
                sl_fx_part = (uint8_t)v;
                if (k1) sl_fx_turn(0, accel(EN_K1, k1, 128));
                if (k2) sl_fx_turn(1, accel(EN_K2, k2, 128));
                if (k3) sl_fx_turn(2, k3);
                if (k4) sl_fx_turn(3, accel(EN_K4, k4, 128));
            }
        } else if (sl_page == PG_SOUND && v < 3) {         /* SOUND: a part's envelope (its sound: the knob on the left) */
            sl_snd_part = (uint8_t)(v + 1);
            if (k1) sl_env_turn(0, accel(EN_K1, k1, 128));
            if (k2) sl_env_turn(1, accel(EN_K2, k2, 128));
            if (k3) sl_env_turn(2, accel(EN_K3, k3, 128));
            if (k4) sl_env_turn(3, accel(EN_K4, k4, 128));
        } else if (sl_page == PG_CHORDS) {                 /* CHORDS: a slot's chord; or the whole progression */
            const sh_scale *sc = sh_scale_by_id(SL_SCALES[sl_scale % SL_NSCALE]);
            uint32_t c, i;
            if (v == 0) {
                if (k1) sl_cm_sel = (uint8_t)sl_wrap(sl_cm_sel, k1, sl_band.cm_n > 0 ? (sl_band.cm_n < SH_CM_MAX ? sl_band.cm_n + 1 : SH_CM_MAX) : 1);
                c = sl_cm_sel % SH_CM_MAX;
                if ((k2 || k3 || k4) && sl_band.cm_n <= (int)c) {   /* turning a chord that is not there yet: the progression grows */
                    for (i = (uint32_t)sl_band.cm_n; i <= c; i++) { sl_band.cm_root[i] = 0; sl_band.cm_qual[i] = (uint8_t)sh_band_cq_for(sc, 0); sl_band.cm_bars[i] = 1; }
                    if (!sl_band.cm_n) { sl_band.cm_i = 0; sl_band.cm_left = 0; }
                    sl_band.cm_n = (int)c + 1;
                }
                if (k2) { int r = sl_wrap(sl_band.cm_root[c], k2, 12); sl_band.cm_root[c] = (int8_t)r; sl_band.cm_qual[c] = (uint8_t)sh_band_cq_for(sc, r); }
                if (k3) sl_band.cm_qual[c] = (uint8_t)sl_wrap(sl_band.cm_qual[c], k3, SH_NCQ);
                if (k4) { static const uint8_t BB[3] = {1, 2, 4}; int at = sl_band.cm_bars[c] >= 4 ? 2 : sl_band.cm_bars[c] >= 2 ? 1 : 0;
                          sl_band.cm_bars[c] = BB[clamp(at + (k4 > 0 ? 1 : -1), 0, 2)]; sl_say_num("bars: ", sl_band.cm_bars[c], 0); }
                if (k1) sl_say_num("chord ", (int32_t)c + 1, 0);
                if (k2 || k3) { char b[12]; sl_chord_name(b, c); sl_say("chord: ", b); }
            } else {
                if (k1) {                                  /* how many chords: 0 gives the harmony back to the slime */
                    int was = sl_band.cm_n, n = clamp(was + k1, 0, SH_CM_MAX);
                    for (i = (uint32_t)was; i < (uint32_t)n; i++) { sl_band.cm_root[i] = 0; sl_band.cm_qual[i] = (uint8_t)sh_band_cq_for(sc, 0); sl_band.cm_bars[i] = 1; }
                    if (!was && n) { sl_band.cm_i = 0; sl_band.cm_left = 0; }
                    sl_band.cm_n = n;
                    if (sl_cm_sel >= n && n) sl_cm_sel = (uint8_t)(n - 1);
                    if (n) sl_say_num("chords: ", n, 0); else sl_say("chords: the slime's", 0);
                }
                if (k2) {                                  /* the site's famous progressions, in this key */
                    int minor = sc && sc->n == 7 && sc->cents[2] > 250.0f && sc->cents[2] < 350.0f;
                    sl_famous = (uint8_t)sl_wrap(sl_famous, k2, SH_NFAMOUS);
                    sh_band_cm_famous(&sl_band, sl_famous, minor, 1);
                    sl_cm_sel = 0;
                    sl_say("chords: ", SH_FAMOUS[sl_famous].name);
                }
                if (k3 && sl_band.cm_n) {                  /* the whole progression up or down a semitone */
                    for (i = 0; i < (uint32_t)sl_band.cm_n; i++) sl_band.cm_root[i] = (int8_t)sl_wrap(sl_band.cm_root[i], k3, 12);
                    sl_say(k3 > 0 ? "all up a semitone" : "all down a semitone", 0);
                }
            }
        } else if (sl_page == PG_DRUMS && v == 0) {        /* DRUMS: my pattern (the keys: white the steps, black the lanes) */
            uint32_t L;
            if (k1) { sl_lane = (uint8_t)sl_wrap(sl_lane, k1, SH_PLANES); sl_say("lane: ", SH_PLANE_NAME[sl_lane]); }
            L = sl_lane % SH_PLANES;
            if (k2) {                                      /* fill: the lane on every 16th, 8th, 3rd 16th, beat, half bar, or empty */
                static const uint8_t EVERY[6] = {0, 1, 2, 3, 4, 8};
                uint32_t s, m = 0;
                sl_dfill[L] = (uint8_t)sl_wrap(sl_dfill[L], k2, 6);
                for (s = 0; EVERY[sl_dfill[L]] && s < 16u; s += EVERY[sl_dfill[L]]) m |= 1u << s;
                sl_band.pat[L] = (uint16_t)m; sl_band.pat_on = 1;
            }
            if (k3) {                                      /* shift: the lane a 16th later / earlier, round the bar */
                uint32_t q = sl_band.pat[L], r = (uint32_t)(((k3 % 16) + 16) % 16);
                sl_band.pat[L] = (uint16_t)(((q << r) | (q >> (16u - r))) & 0xFFFFu);
            }
            if (k4) {                                      /* mine or the rhythm's; mine starts from the rhythm's bar when empty */
                uint32_t any = 0;
                for (L = 0; L < SH_PLANES; L++) any |= sl_band.pat[L];
                if (k4 > 0 && !any) sh_band_pat_from_kit(&sl_band);
                sl_band.pat_on = (int)(k4 > 0); sl_say("drums: ", sl_band.pat_on ? "my pattern" : "the rhythm's");
            }
        } else if (sl_page == PG_DRUMS) {                  /* DRUMS 2: the kit */
            if (k1) { int32_t t = sd_tone == 0xFFu ? -1 : (int32_t)sd_tone; t = sl_wrap(t + 1, k1, 12) - 1;
                      sd_tone = (uint8_t)(t < 0 ? 0xFF : t); sl_say("kit: ", t < 0 ? "the rhythm's own" : sh_band_kit_name(t)); }
            if (k2) { sd_tune = (int8_t)clamp(sd_tune + k2, SD_TUNE_MIN, 12); sl_say_num("tune ", sd_tune, " semitones"); }
            if (k3) { sd_decay = (uint8_t)clamp((int32_t)sd_decay + k3, 4, 16); sl_say_num("decay ", sd_decay * 100 / 8, "%"); }
            if (k4) { double sw = sl_swing + accel(EN_K4, k4, 21) * 0.025; sl_swing = sw < 0.0 ? 0.0 : sw > 0.5 ? 0.5 : sw; sl_swing_hand = 1;
                      sl_say_num("swing ", (int32_t)(sl_swing * 100.0 + 0.5), "%"); }
        } else if (sl_page == PG_ARP) {                    /* ARP: pattern, rate, octaves, gate */
            if (k1) { sl_arp_pat = (uint8_t)sl_wrap(sl_arp_pat, k1, SL_ARP_NPAT); sl_say("arp: ", SL_ARP_PAT_NAME[sl_arp_pat]); }
            if (k2) { sl_arp_rate = (uint8_t)clamp((int32_t)sl_arp_rate + (k2 > 0 ? 1 : -1), 0, (int32_t)SL_ARP_NRATE - 1); slime_levels(); sl_say("arp rate ", SL_ARP_RATE[sl_arp_rate].name); }
            if (k3) { sl_arp_oct = (uint8_t)clamp((int32_t)sl_arp_oct + (k3 > 0 ? 1 : -1), 1, 3); sl_say_num("arp over ", sl_arp_oct, sl_arp_oct == 1 ? " octave" : " octaves"); }
            if (k4) { sl_arp_gate = (uint8_t)clamp((int32_t)sl_arp_gate + accel(EN_K4, k4, 19) * 5, 10, 100); sl_say_num("arp gate ", sl_arp_gate, "%"); }
        } else if (sl_page == PG_MIDI && v == 0) {         /* MIDI: each part's channel out, 1..16 or off */
            int32_t kk[4];
            kk[0] = k1; kk[1] = k2; kk[2] = k3; kk[3] = k4;
            for (p = 0; p < 4u; p++) if (kk[p]) {
                sl_mch[p] = (uint8_t)sl_wrap(sl_mch[p] > 15u ? 16 : sl_mch[p], kk[p], 17);
                if (sl_mch[p] > 15u) sl_say(SL_PART_NAME[p], " out: off"); else { char b[16]; b[0] = 0; sl_cat(sl_cat(b, SL_PART_NAME[p], b + 15), " ch ", b + 15); sl_say_num(b, sl_mch[p] + 1, 0); }
            }
        } else if (sl_page == PG_MIDI) {                   /* MIDI 2: in, the clock, out */
            if (k1) { sl_min_ch = (uint8_t)sl_wrap(sl_min_ch, k1, 17); if (sl_min_ch) sl_say_num("midi in: channel ", sl_min_ch, 0); else sl_say("midi in: ", "every channel"); }
            if (k2) { sl_mclk_in = (uint8_t)(k2 > 0); sl_say("clock in: ", sl_mclk_in ? "follow" : "ignore"); }
            if (k3) { sl_mo_en = (uint8_t)(k3 > 0); sl_say("notes out: ", sl_mo_en ? "on" : "off"); }
            if (k4) { sl_mclk_out = (uint8_t)(k4 > 0); sl_say("clock out: ", sl_mclk_out ? "on" : "off"); }
        }
        if (k1 | k2 | k3 | k4 | snd[0] | snd[1] | snd[2]) sl_changed_ms = fm1_ms;
    }
#undef SL_PRESSED
    fm6_poll();                             /* FM6: a part's patch loads when its preset asks (SLOOP calls this from its own
                                             * ui_input, which this firmware does not run: without it no FM patch ever loaded) */
    slime_conduct();                        /* the music, ahead of the audio clock (slime.c) */
    {   /* the session as it was left (power-on), once the splash is over; the loop's news on the screen */
        static uint8_t last_state, last_count;
        if (!sl_restored && sl_conducting && !sl_splashing()) {
            sl_restored = 1;
            if (sl_song_read(SL_OBJ_SESSION)) { sl_auto_hash = sl_sbuf.sum; sl_say("welcome back", 0); }
        }
        if (sl_loop_countin != last_count) { last_count = sl_loop_countin; if (last_count) sl_say_num("rec in ", last_count, 0); }
        if (sl_loop_state != last_state) {
            if (sl_loop_state == SL_LOOP_REC) sl_say("rec: play now", 0);
            else if (sl_loop_state == SL_LOOP_PLAY && last_state == SL_LOOP_REC) sl_say_num("loop: ", sl_loop_bars, sl_loop_bars == 1u ? " bar" : " bars");
            else if (sl_loop_state == SL_LOOP_OFF && last_state == SL_LOOP_REC) sl_say("no notes: no loop", 0);
            last_state = sl_loop_state;
        }
    }
    sl_session_tick();
}

/* THE PANEL'S DRAWING: rows SL_PANEL_Y..239 under the lifted tank, a band at a time into cv_px (SLOOP's text draws there).
 * Drawn only when what it shows changed (sl_pm against sl_pm_drawn): a turn of a knob, a step of the drums' playhead */
#define SL_PANEL_Y 160
static uint16_t sl_part_col(uint32_t p)
{
    static const uint16_t C[4] = {RGB(96, 196, 160), RGB(104, 144, 228), RGB(222, 122, 184), RGB(238, 152, 80)};
    return C[p % 4u];
}
static void sl_rect(uint16_t *b, int y0, int x, int y, int w, int h, uint16_t c)   /* a filled box, clipped to the band */
{
    int r, i, ya = y < y0 ? y0 : y, yb = y + h > y0 + 16 ? y0 + 16 : y + h;
    if (x < 0) { w += x; x = 0; }
    if (x + w > 240) w = 240 - x;
    for (r = ya; r < yb; r++) for (i = 0; i < w; i++) b[(r - y0) * 240 + x + i] = c;
}
static void sl_text(int y0, int cx, int y, int maxw, const char *s, uint16_t c)   /* centred on cx, cut to maxw px */
{
    char t[32];
    uint32_t n = 0;
    while (s[n] && n < sizeof t - 1u) { t[n] = s[n]; n++; }
    t[n] = 0;
    while (n > 1u && text_w(&FONT_S, t) > maxw) t[--n] = 0;
    if (y + 16 <= y0 || y >= y0 + 16) return;
    cv_w = 240; cv_h = 16; cv_oy = -y0;
    cv_text(cx - text_w(&FONT_S, t) / 2, y, &FONT_S, t, swap16(c));
    cv_oy = 0;
}
static void sl_panel_band(uint16_t *b, int y0)
{
    const sl_panel *m = &sl_pm;
    const uint16_t BGP = RGB(234, 230, 250), DIM = RGB(150, 136, 196), STRONG = RGB(70, 54, 140), TRACK = RGB(214, 208, 238),
                   PICK = RGB(222, 216, 246), SL_ACC = RGB(140, 110, 220);
    uint32_t i, c;
    sl_rect(b, y0, 0, y0, 240, 16, BGP);
    if (m->page == PG_DRUMS && m->view == 0u) {            /* the grid: 8 lanes x 16 steps, the playing step lit */
        for (i = 0; i < SH_PLANES; i++) {
            int y = SL_PANEL_Y + 2 + (int)i * 8;
            uint16_t on = sl_part_col(3);
            if (i == m->lane) sl_rect(b, y0, 0, y - 1, 240, 8, PICK);
            for (c = 0; c < 16u; c++) {
                int x = (int)c * 15, hit = (m->pat[i] >> c) & 1u;
                uint16_t col = hit ? (m->pat_on ? (i == m->lane ? STRONG : on) : DIM) : (c % 4u == 0u ? RGB(200, 192, 230) : TRACK);
                if (c == m->step && hit) col = RGB(255, 255, 255);
                sl_rect(b, y0, x + 1, y, 13, 6, col);
            }
        }
        if (m->step < 16u) sl_rect(b, y0, (int)m->step * 15, SL_PANEL_Y, 15, 2, SL_ACC);
        {   /* (the lane's name gets more room: "OPEN HAT" was cut to "OPEN HA" in 58 px; fill and shift are short) */
            static const uint8_t CX[4] = {40, 110, 160, 210}, W[4] = {78, 56, 44, 58};
            for (c = 0; c < 4u; c++) sl_text(y0, CX[c], 224, W[c], m->c[c].val, STRONG);
        }
        return;
    }
    if (m->page == PG_CHORDS) {                            /* the progression's slots: picked filled, playing underlined */
        for (i = 0; i < SH_CM_MAX; i++) {
            int x = (int)(i % 4u) * 60, y = SL_PANEL_Y + 2 + (int)(i / 4u) * 18;
            if (i < m->cm_n) {
                sl_rect(b, y0, x + 2, y, 56, 16, i == m->cm_sel ? SL_ACC : TRACK);
                if (i == m->cm_cur) sl_rect(b, y0, x + 6, y + 15, 48, 2, STRONG);
                sl_text(y0, x + 30, y, 54, m->cm[i], i == m->cm_sel ? RGB(255, 255, 255) : STRONG);
            } else if (i == m->cm_n || (i == m->cm_sel)) {
                sl_rect(b, y0, x + 2, y, 56, 16, i == m->cm_sel ? PICK : BGP);
                sl_text(y0, x + 30, y, 54, "+", DIM);
            }
        }
        for (c = 0; c < 4u; c++) { sl_text(y0, (int)c * 60 + 30, 200, 58, m->c[c].name, DIM); sl_text(y0, (int)c * 60 + 30, 218, 58, m->c[c].val, STRONG); }
        return;
    }
    /* the others: a line of what the view is about, then a column a knob: its name, its value, its bar (levels: a fader) */
    sl_text(y0, 120, SL_PANEL_Y + 1, 232, m->ex[0], DIM);
    sl_rect(b, y0, 8, SL_PANEL_Y + 18, 224, 1, TRACK);
    for (c = 0; c < 4u; c++) {
        const sl_pcol *k = &m->c[c];
        int x = (int)c * 60;
        uint16_t acc = m->page == PG_MIX || m->page == PG_MIDI ? sl_part_col(c) : SL_ACC;
        if (k->mark == 1u) sl_rect(b, y0, x + 2, SL_PANEL_Y + 20, 56, 60, PICK);
        sl_text(y0, x + 30, SL_PANEL_Y + 21, 58, k->name, DIM);
        if (m->page == PG_MIX && m->view == 0u) {          /* a fader: filled from the bottom */
            int h = 22, f = k->bar < 0 ? 0 : k->bar * h / 100;
            sl_rect(b, y0, x + 25, SL_PANEL_Y + 38, 10, h, TRACK);
            sl_rect(b, y0, x + 25, SL_PANEL_Y + 38 + h - f, 10, f, k->mark == 2u ? DIM : acc);
            sl_text(y0, x + 30, SL_PANEL_Y + 62, 58, k->val, k->mark == 2u ? DIM : STRONG);
        } else {
            sl_text(y0, x + 30, SL_PANEL_Y + 40, 58, k->val, k->mark == 2u ? DIM : STRONG);
            if (k->bar >= 0) {
                sl_rect(b, y0, x + 8, SL_PANEL_Y + 62, 44, 5, TRACK);
                sl_rect(b, y0, x + 8, SL_PANEL_Y + 62, 44 * k->bar / 100, 5, acc);
            }
        }
    }
}

/* THE TANK AS IT SOUNDS (slime.c sl_pose): the pose of the tick whose notes the speaker is playing, ~10 ms ahead (the
 * frame reaches the glass after it is drawn), put into the tank for the drawing and taken out again straight after.
 * The walls (and the holes on them) turned back by the difference in their turn, each ball where it was then (a ball
 * born since is not shown yet), each wall's flash as it was: a bounce is seen when it is heard. */
#define SL_POSE_LEAD 14u                    /* blocks (10 ms) */
static sh_wall sl_wsave[SH_MAXWALLS];
static sh_worm sl_hsave[SH_NWORM];
static struct { double x, y, z; int warp; } sl_bsave[SH_BALLCAP];
static uint8_t sl_pose_on;
static volatile int32_t sl_pose_lag;        /* (a readout for fm1-emu, FM1_DUMPRAM + ramvar.py: the blocks between the plan and the pose drawn) */
static void sl_rot2(double *x, double *y, double cx, double cy, float c, float s)
{
    double dx = *x - cx, dy = *y - cy;
    *x = cx + dx * c - dy * s; *y = cy + dx * s + dy * c;
}
static void sl_pose_apply(void)
{
    uint32_t w = sl_pose_w, i, now = sl_clock + SL_POSE_LEAD;
    const sl_tpose_t *p = 0;
    int k, j;
    float d, c, sn;
    sl_pose_on = 0;
    if (!sl_run || !w) return;
    for (i = 0; i < SL_POSE_N && i < w; i++) {
        const sl_tpose_t *q = &sl_tpose[(w - 1u - i) % SL_POSE_N];
        if ((int32_t)(now - q->at) >= 0) { p = q; break; }
    }
    if (!p || p->n != sl_tank.n) return;
    sl_pose_on = 1;
    sl_pose_lag = (int32_t)(sl_tpose[(w - 1u) % SL_POSE_N].at - p->at);
    d = p->rot - (float)sl_tank.rot; c = cosf(d); sn = sinf(d);
    for (k = 0; k < sl_tank.n; k++) {
        sh_wall *e = &sl_tank.walls[k];
        double nx = e->nx, ny = e->ny;
        sl_wsave[k] = *e;
        sl_rot2(&e->ax, &e->ay, SH_TCX, SH_TCY, c, sn); sl_rot2(&e->bx, &e->by, SH_TCX, SH_TCY, c, sn);
        e->nx = nx * c - ny * sn; e->ny = nx * sn + ny * c;
        e->flash = p->flash[k];
    }
    for (k = 0; k < SH_NWORM; k++) {
        sh_worm *P = &sl_tank.worm[k];
        double a = P->n[0], b = P->n[1], t0 = P->t1[0], t1 = P->t1[1];
        sl_hsave[k] = *P;
        sl_rot2(&P->x, &P->y, 0.0, 0.0, c, sn);
        P->n[0] = a * c - b * sn; P->n[1] = a * sn + b * c; P->t1[0] = t0 * c - t1 * sn; P->t1[1] = t0 * sn + t1 * c;
    }
    for (k = 0; k < sl_tank.nb; k++) {
        sh_ball *b = &sl_tank.balls[k];
        sl_bsave[k].x = b->x; sl_bsave[k].y = b->y; sl_bsave[k].z = b->z; sl_bsave[k].warp = b->warp;
        b->warp = 1;                                       /* (born since: not shown yet) */
        for (j = 0; j < p->nb; j++)
            if (p->b[j].id == b->id) { b->x = p->b[j].x; b->y = p->b[j].y; b->z = p->b[j].z; b->warp = p->b[j].warp; break; }
    }
}
static void sl_pose_restore(void)
{
    int k;
    if (!sl_pose_on) return;
    for (k = 0; k < sl_tank.n; k++) sl_tank.walls[k] = sl_wsave[k];
    for (k = 0; k < SH_NWORM; k++) sl_tank.worm[k] = sl_hsave[k];
    for (k = 0; k < sl_tank.nb; k++) { sh_ball *b = &sl_tank.balls[k]; b->x = sl_bsave[k].x; b->y = sl_bsave[k].y; b->z = sl_bsave[k].z; b->warp = sl_bsave[k].warp; }
    sl_pose_on = 0;
}

/* THE PAGE AROUND THE TANK (Flah 2026-11-21: "my dancing worm that jiggles to the beat from the site", "little mini
 * pastel colored slimes decorating the background", "a nice gameboy color style sunny forest-enclosed bob ross coded
 * stylized chiptune lake art in the background just faded so its out of focus", "just make em background objects ...
 * not a strain on the tank fps", "preload all that up ... during the splash"). Three layers under the tank, drawn only
 * where a frame already repaints (the tank's box, the label) plus the worm's and a hopping slime's own small patch:
 *   the lake: fm1/host/gen-scene.py's picture (240 x 240, 256 colours, out of focus), copied from flash into RAM while
 *             the splash plays (st_draw_band reads RAM, not the slower flash, every row)
 *   the slimes: five pastel minis round the edges, drawn once into RAM at the splash; they hop on each bar's 1 (the
 *             site's motes: a ripple, 26 ms apart)
 *   the worm: the site's (index.html "wiggle worm"): 14 points up a spine with a wave climbing it, a fat pastel body with
 *             rings, a face; bottom right, his head always poking up and wiggling to the tempo; every 12 bars he rests
 *             4 (only his head and neck out) and rises to dance 8, the 4th and 8th of those in double time with a ^^
 *             face; a new hue each beat, glided to. Stopped, he keeps the tempo, resting. Not drawn under a page's panel. */
static uint8_t sl_scene[240 * 240] __attribute__((section(".pool")));
static uint16_t sl_scene_pal[256];
static uint8_t sl_scene_ready;
#define SL_NMINI 5
#define SL_MW 22
#define SL_MH 18
#include "slime_minis.h"
static const int16_t SL_MINI_AT[SL_NMINI][2] = {{20, 38}, {220, 42}, {18, 214}, {52, 228}, {150, 230}};   /* their middles */
static const uint16_t SL_MINI_COL[SL_NMINI] = {0xFD9Bu, 0xCDDFu, 0xFE53u, 0xAEFFu, 0xFFB3u};   /* pink, lavender, peach, sky, lemon */
static uint16_t sl_mini_px[SL_NMINI][SL_MH][SL_MW] __attribute__((section(".pool")));
static uint8_t sl_mini_a[SL_NMINI][SL_MH][SL_MW] __attribute__((section(".pool")));   /* 0..32 */
static int8_t sl_mini_hop[SL_NMINI];        /* px up now */
static void sl_mini_render(void)            /* each mini: a dome on a flat bottom, a shine, two happy ^ ^ eyes, a smile (the mascot's
                                             * shape, no glasses). (The eyes were dots of 1.3 px: at this size they read as -_-,
                                             * Flah 2026-11-25: "should instead be a happy ^_^ face") */
{
    uint32_t i, x, y;
    for (i = 0; i < SL_NMINI; i++)
        for (y = 0; y < SL_MH; y++)
            for (x = 0; x < SL_MW; x++) {
                float dx = ((float)x + 0.5f - 11.0f) / 10.0f, dy = ((float)y + 0.5f - 11.0f) / 9.0f, rr = dx * dx + (dy < 0.0f ? dy * dy : dy * dy * dy * dy);
                uint16_t c = SL_MINI_COL[i];
                uint8_t a = 0;
                if (rr < 1.0f) {
                    float hx = dx + 0.45f, hy = dy + 0.5f;
                    a = 32;
                    if (rr > 0.78f) c = sl_bl(c, 0x6B4Du, sl_k((rr - 0.78f) * 2.2f));           /* a soft darker rim */
                    if (hx * hx * 2.2f + hy * hy * 3.0f < 0.10f) c = sl_bl(c, 0xFFFFu, 20u);   /* the shine */
                    {
                        float ex = (float)x + 0.5f - 11.0f, ey = (float)y + 0.5f - 10.0f;
                        float e1 = ex + 3.5f, e2 = ex - 3.5f, a1 = e1 < 0 ? -e1 : e1, a2 = e2 < 0 ? -e2 : e2;   /* eyes: a ^ each, */
                        if ((a1 < 2.0f && (ey - (a1 - 1.3f)) * (ey - (a1 - 1.3f)) < 0.36f) ||   /* the arc's peak up, its ends down */
                            (a2 < 2.0f && (ey - (a2 - 1.3f)) * (ey - (a2 - 1.3f)) < 0.36f)) c = 0x3186u;
                        else { float my = (float)y + 0.5f - 11.5f, m = ex * ex + my * my; if (my > 0.4f && m < 7.0f && m > 2.6f) c = 0x3186u; }   /* smile */
                    }
                } else if (rr < 1.18f && dy > 0.3f) { c = 0x8410u; a = 6; }                    /* a faint shadow under */
                sl_mini_px[i][y][x] = c; sl_mini_a[i][y][x] = a;
            }
}
static void sl_scene_load(void)             /* the splash's first frame: the picture into RAM, the minis drawn */
{
    memcpy(sl_scene, SL_SCENE, sizeof sl_scene);
    memcpy(sl_scene_pal, SL_SCENE_PAL, sizeof sl_scene_pal);
    sl_mini_render();
    sl_scene_ready = 1;
}
/* the worm, this frame */
#define SL_WN 14
static struct {
    float x[SL_WN], y[SL_WN];               /* the spine, base to head (screen px) */
    float beat, rise, hue;
    int dbl, on;
    uint16_t body, ring, hi, edge;
    int32_t x0, y0, x1, y1;                 /* his box */
} sl_wm;
static uint16_t sl_hsl(float h, float s, float l)   /* hue in turns, to RGB565 */
{
    float hh = (h - floorf(h)) * 6.0f, m2 = hh - 2.0f * floorf(hh * 0.5f);
    float l2 = 2.0f * l - 1.0f, m1 = m2 - 1.0f, c = (1.0f - (l2 < 0.0f ? -l2 : l2)) * s, x = c * (1.0f - (m1 < 0.0f ? -m1 : m1)), m = l - c * 0.5f, r = 0, g = 0, b = 0;
    if (hh < 1.0f) { r = c; g = x; } else if (hh < 2.0f) { r = x; g = c; } else if (hh < 3.0f) { g = c; b = x; }
    else if (hh < 4.0f) { g = x; b = c; } else if (hh < 5.0f) { r = x; b = c; } else { r = c; b = x; }
    return (uint16_t)(((uint32_t)((r + m) * 31.0f + 0.5f) << 11) | ((uint32_t)((g + m) * 63.0f + 0.5f) << 5) | (uint32_t)((b + m) * 31.0f + 0.5f));
}
static void sl_worm_frame(float dt_ms)
{
    static float wbeat, hue_now = 150.0f / 360.0f;
    const float bpm = (float)song.g[G_BPM], L = 96.0f, WX = 210.0f, k = 0.42f;   /* his length (px), where he stands, site units to px */
    float bt, u, wig, sw, amp;
    int bar, cyc, up, i;
    if (sl_run) {                                          /* the band's beat, as it sounds (the plan runs ~75 ms ahead) */
        double len = 15000.0 / (double)bpm;
        bt = (float)(((double)sl_step - sl_step_left / len) / 4.0) - 0.075f * bpm / 60.0f;
        wbeat = bt;
    } else { wbeat += dt_ms * bpm / 60000.0f; bt = wbeat; }   /* stopped: he keeps the tempo, resting */
    {   int party = sl_party_on(fm1_ms, sl_burst_t0, sl_bn);   /* a burst: he comes up quick and dances double time */
        bar = (int)floorf(bt / 4.0f); cyc = ((bar % 12) + 12) % 12; up = (sl_run && cyc >= 4) || party;
        sl_wm.rise += ((up ? 1.0f : 0.0f) - sl_wm.rise) * (party ? 0.16f : 0.045f) * (dt_ms / 16.7f > 3.0f ? 3.0f : dt_ms / 16.7f);
        sl_wm.dbl = (up && (((cyc - 4) & 3) == 3)) || party; }
    {   /* a new pastel hue each beat, glided to */
        float t = (150.0f + floorf(bt) * 40.0f) / 360.0f, dh;
        t -= floorf(t); dh = t - hue_now; dh -= floorf(dh + 0.5f);
        hue_now += dh * 0.16f; hue_now -= floorf(hue_now);
        sl_wm.body = sl_hsl(hue_now, 0.68f, 0.72f); sl_wm.ring = sl_hsl(hue_now, 0.42f, 0.56f);
        sl_wm.hi = sl_hsl(hue_now, 0.75f, 0.85f); sl_wm.edge = sl_hsl(hue_now, 0.40f, 0.50f);
    }
    u = bt * (sl_wm.dbl ? 2.0f : 1.0f); wig = 0.22f + 0.78f * sl_wm.rise;
    {   float a = u * 3.14159265f; a -= 6.2831853f * floorf(a / 6.2831853f); sw = sinf(a); }
    if (sl_wm.dbl) sw = (sw < 0.0f ? -1.0f : 1.0f) * powf(sw < 0.0f ? -sw : sw, 0.6f);
    amp = (sl_wm.dbl ? 48.0f : 34.0f) * wig;
    {
        float base = 244.0f + (1.0f - sl_wm.rise) * L * 0.62f;   /* resting: only his head and neck out */
        sl_wm.x0 = 239; sl_wm.x1 = 0; sl_wm.y0 = 239; sl_wm.y1 = 239;
        for (i = 0; i < SL_WN; i++) {
            float f = (float)i / (float)(SL_WN - 1), a1 = u * 3.14159265f - f * 3.6f, a2 = u * 3.14159265f * 0.5f;
            float wave, hip;
            a1 -= 6.2831853f * floorf(a1 / 6.2831853f); a2 -= 6.2831853f * floorf(a2 / 6.2831853f);
            wave = sinf(a1) * (8.0f + 16.0f * f) * (0.28f + 0.72f * f) * wig;
            hip = sinf(a2) * 7.0f * (1.0f - f) * (sl_wm.dbl ? 1.7f : 1.0f) * wig;
            sl_wm.x[i] = WX + (sw * powf(f, 1.3f) * amp * 0.6f + wave + hip) * k;
            sl_wm.y[i] = base - f * L;
            if (sl_wm.x[i] - 12.0f < (float)sl_wm.x0) sl_wm.x0 = (int32_t)(sl_wm.x[i] - 12.0f);
            if (sl_wm.x[i] + 12.0f > (float)sl_wm.x1) sl_wm.x1 = (int32_t)(sl_wm.x[i] + 12.0f);
        }
        sl_wm.y0 = (int32_t)(sl_wm.y[SL_WN - 1] - 13.0f);
        if (sl_wm.x1 > 239) sl_wm.x1 = 239;
        if (sl_wm.y0 < 0) sl_wm.y0 = 0;
    }
    sl_wm.on = sl_wm.y0 < 239;
}
/* the minis' hops: every other one on the downbeats (1, 3), the rest on the backbeats (2, 4) */
static void sl_minis_frame(void)   /* the beat's hops, a hand's mini, a burst's party (slime_minis.h, host/minitest.c) */
{
    static uint32_t last_beat = 0xFFFFFFFFu, down_t0, back_t0, hand_seen, hand_t0[SL_NMINI];
    static int hand_last = -1;
    uint32_t i, beat = sl_step / 4u, hn = sl_hand_n;
    if (sl_run && beat != last_beat) { last_beat = beat; if (beat % 2u == 0u) down_t0 = fm1_ms + 75u; else back_t0 = fm1_ms + 75u; }   /* (as it sounds) */
    if (hn != hand_seen) {                                 /* a hand played: its mini hops now (a hand is never late) */
        hand_seen = hn;
        hand_last = sl_mini_for_note((double)sl_hand_c, SL_MINI_AT, SL_NMINI, hand_last);
        hand_t0[hand_last] = fm1_ms ? fm1_ms : 1u;
    }
    for (i = 0; i < SL_NMINI; i++)
        sl_mini_hop[i] = (int8_t)sl_mini_hop_px(fm1_ms, (int)i, i % 2u ? back_t0 : down_t0, hand_t0[i], sl_burst_t0, sl_bn);
}
/* the row under the tank: the lake, the minis, the worm (st_draw_band calls it for every row it fills) */
static uint8_t sl_decor_page;               /* a page's panel is up: the worm and the bottom minis are under it */
static uint8_t sl_worm_tick;                /* this frame the worm moves (every other one) */
static void sl_bg_row(uint16_t *row, int y, int xlo, int xhi)
{
    const uint8_t *s = sl_scene + y * 240;
    int x, i;
    for (x = xlo; x <= xhi; x++) row[x] = sl_scene_pal[s[x]];
    for (i = 0; i < SL_NMINI; i++) {                       /* the minis */
        int my0 = SL_MINI_AT[i][1] - 11 - sl_mini_hop[i], mx0 = SL_MINI_AT[i][0] - 11, sy = y - my0, a, b2;
        if (sy < 0 || sy >= SL_MH || (sl_decor_page && SL_MINI_AT[i][1] > SL_PANEL_Y - 12)) continue;
        a = mx0 < xlo ? xlo : mx0; b2 = mx0 + SL_MW - 1 > xhi ? xhi : mx0 + SL_MW - 1;
        for (x = a; x <= b2; x++) { uint8_t al = sl_mini_a[i][sy][x - mx0]; if (al) row[x] = al >= 32u ? sl_mini_px[i][sy][x - mx0] : sl_bl(row[x], sl_mini_px[i][sy][x - mx0], al); }
    }
    if (sl_wm.on && !sl_decor_page && y >= sl_wm.y0 && y <= sl_wm.y1) {
        /* the worm: his spine runs up the screen, so a row crosses it once: the spine's x there and the body's half-width
         * across the row (R over the spine's lean), a round cap over his head. (A distance to every segment, each pixel,
         * cost the frame rate half: session.sh 13.9 fps at worst, 2026-11-21) */
        float yc = (float)y + 0.5f, R = 9.0f, hx = sl_wm.x[SL_WN - 1], hy = sl_wm.y[SL_WN - 1], cx, hw, bs, inv;
        int a = sl_wm.x0 < xlo ? xlo : sl_wm.x0, b2 = sl_wm.x1 > xhi ? xhi : sl_wm.x1, j;
        if (yc < hy) {                                                                         /* over his head: the cap */
            float dy = hy - yc;
            if (dy >= R) return;
            cx = hx; hw = sqrtf(R * R - dy * dy); bs = (float)(SL_WN - 1);
        } else {
            for (j = 0; j < SL_WN - 1 && !(sl_wm.y[j + 1] <= yc && yc <= sl_wm.y[j]); j++) {}
            if (j >= SL_WN - 1) return;                                                        /* (under the screen) */
            {
                float dy = sl_wm.y[j] - sl_wm.y[j + 1], t = (sl_wm.y[j] - yc) / dy, sl = (sl_wm.x[j + 1] - sl_wm.x[j]) / dy;
                cx = sl_wm.x[j] + (sl_wm.x[j + 1] - sl_wm.x[j]) * t; hw = R * sqrtf(1.0f + sl * sl); bs = (float)j + t;
            }
        }
        if (cx - hw > (float)b2 + 1.0f || cx + hw < (float)a) return;
        inv = R / hw;
        for (x = a; x <= b2; x++) {
            float xc = (float)x + 0.5f, bdx = xc - cx, d = (bdx < 0.0f ? -bdx : bdx) * inv, ringp = bs + 0.5f;
            uint16_t c;
            if (d >= R) continue;
            c = sl_wm.body;
            if (bdx < -R * 0.2f && d < R * 0.72f) c = sl_bl(c, sl_wm.hi, sl_k(0.55f * (1.0f - d / (R * 0.72f))));   /* lit from the left, round */
            if (ringp - floorf(ringp) < 0.11f && bs < (float)(SL_WN - 3)) c = sl_bl(c, sl_wm.ring, 8u);   /* his rings, faint (the site's: 30%) */
            if (d > R - 1.3f) c = sl_bl(c, sl_wm.edge, 16u);                                   /* a soft edge */
            if (yc > hy - R && yc < hy + R) {   /* the face, on his head */
                float fx = (xc - hx) * 0.8f, fy = (yc - (hy + 0.5f)) * 0.8f;   /* (the site's face, 1.25x) */
                if (sl_wm.dbl) {                                                               /* ^^ and an open mouth */
                    float ax2 = fx + 3.0f < 0.0f ? -(fx + 3.0f) : fx + 3.0f, bx2 = fx - 3.0f < 0.0f ? -(fx - 3.0f) : fx - 3.0f;
                    if ((ax2 < 2.0f && fy + 1.5f + ax2 * 0.8f > -0.6f && fy + 1.5f + ax2 * 0.8f < 0.6f) ||
                        (bx2 < 2.0f && fy + 1.5f + bx2 * 0.8f > -0.6f && fy + 1.5f + bx2 * 0.8f < 0.6f)) c = 0x3186u;
                    if (fy > 1.0f && fy < 4.0f && fx * fx < (4.0f - fy) * 3.0f) c = 0x3186u;
                } else {
                    if ((fx + 3.0f) * (fx + 3.0f) + (fy + 1.2f) * (fy + 1.2f) < 1.6f || (fx - 3.0f) * (fx - 3.0f) + (fy + 1.2f) * (fy + 1.2f) < 1.6f) c = 0x3186u;
                    { float m = fx * fx + (fy - 0.6f) * (fy - 0.6f); if (fy > 1.2f && m < 7.0f && m > 3.0f) c = 0x3186u; }
                }
            }
            row[x] = c;
        }
    }
}

/* a decoration's own patch, outside the tank's box: only the background (no tank pixel falls there: running the tank's
 * renderer on those rows cost as much as drawing the tank's own rows again, whatever their width, because it walks every
 * wall and drop a row; the decorations took the worst 5 s window from 25.9 to 19 fps, 2026-11-21) */
static void sl_patch(st_view *v, int32_t x0, int32_t y0, int32_t x1, int32_t y1, uint32_t *nb, uint16_t bg, int panel, uint32_t *px)
{
    uint32_t k, r, i, w, ry0, ry1;
    x0 = clamp(x0, 0, 239) & ~1; x1 = clamp(x1, 0, 239) | 1; y0 = clamp(y0, 16, 239); y1 = clamp(y1, 0, 239);   /* (not the label's row) */
    if (panel && y1 >= SL_PANEL_Y) y1 = SL_PANEL_Y - 1;
    if (x1 <= x0 || y1 < y0) return;
    w = (uint32_t)(x1 - x0 + 1);
    for (k = (uint32_t)y0 / 16u; k <= (uint32_t)y1 / 16u; k++) {
        uint16_t *b = sl_strip((*nb)++);
        ry0 = k * 16u < (uint32_t)y0 ? (uint32_t)y0 - k * 16u : 0u; ry1 = k * 16u + 15u > (uint32_t)y1 ? (uint32_t)y1 - k * 16u : 15u;
        (void)v;
        for (r = ry0; r <= ry1; r++) {
            uint16_t *row = b + r * 240u;
            if (st_bg_row) st_bg_row(row, (int)(k * 16u + r), (int)x0, (int)x1); else for (i = (uint32_t)x0; i <= (uint32_t)x1; i++) row[i] = bg;
        }
        for (r = 0; r <= ry1 - ry0; r++) {                 /* packed big-endian, as the frame's bands */
            const uint16_t *s16 = b + (ry0 + r) * 240u + (uint32_t)x0;
            uint16_t *d16 = b + r * w;
            for (i = 0; i < w; i++) d16[i] = (uint16_t)((s16[i] >> 8) | (s16[i] << 8));
        }
        lcd_blit((uint32_t)x0, k * 16u + ry0, w, ry1 - ry0 + 1u, b);
        *px += w * (ry1 - ry0 + 1u);
    }
}

/* a patch less what the tank's box already repainted this frame (bx0..bx1 x by0..by1): up to four strips (the box is
 * often most of the screen wide, and the worm and the minis mostly inside its columns: drawn twice, they cost the
 * worst 5 s window a quarter of its frames in session.sh, 25.9 -> 19.3 fps) */
static void sl_patch_out(st_view *v, int32_t x0, int32_t y0, int32_t x1, int32_t y1, int32_t bx0, int32_t by0, int32_t bx1, int32_t by1,
                         uint32_t *nb, uint16_t bg, int panel, uint32_t *px)
{
    int32_t ix0 = x0 > bx0 ? x0 : bx0, ix1 = x1 < bx1 ? x1 : bx1;
    if (bx1 < bx0 || by1 < by0 || ix1 < ix0 || y1 < by0 || y0 > by1) { sl_patch(v, x0, y0, x1, y1, nb, bg, panel, px); return; }   /* (apart) */
    if (x0 < bx0) sl_patch(v, x0, y0, bx0 - 1, y1, nb, bg, panel, px);                  /* left of the box */
    if (x1 > bx1) sl_patch(v, bx1 + 1, y0, x1, y1, nb, bg, panel, px);                  /* right of it */
    if (y0 < by0) sl_patch(v, ix0, y0, ix1, by0 - 1, nb, bg, panel, px);                 /* above it, in its columns */
    if (y1 > by1) sl_patch(v, ix0, by1 + 1, ix1, y1, nb, bg, panel, px);                 /* below it */
}

static void slime_ui(void)
{
    static const uint16_t BG = 0xF7BF;      /* the page's pale lilac (under the lake, before it is loaded) */
    st_view *v = sl_view();
    float M[9], t = (float)fm1_ms * 0.001f;
    uint32_t k, i, t0 = fm1_ms, tk = fm1_ticks();
    static uint8_t ever_played;
    sl_pose sp = {0};
    int splash = 0;
    slime_poll();
    if (!sl_splash_t0) {                                   /* the first frame: the splash begins, the page's decorations load
                                                            * under it (the splash covers the screen until its fade) */
        sl_title_render(); sl_splash_t0 = fm1_ms; sl_boot_ms = fm1_ms;
        sl_scene_load(); st_bg_row = sl_bg_row;
    }
    if (!sl_splash_done) {
        uint32_t ms = fm1_ms - sl_splash_t0;
        if (sl_skip) { uint32_t f = SL_SPLASH_MS - SL_FADE_MS + (fm1_ms - sl_skip_at); if (f > ms) ms = f; }
        if (ms >= SL_SPLASH_MS) sl_splash_done = 1; else { sp = sl_splash_pose(ms); splash = 1; }
    }
    if (sl_run) ever_played = 1;
    if (sl_page == PG_DRUMS)                              /* DRUMS: the lane's steps on the white keys (the one playing blinks), the
                                                           * lane picked on its black key */
        for (k = 0; k < 27u; k++) {
            int s = sl_step_of_key(k), l = sl_lane_of_key(k), on;
            if (s >= 0) { on = s < 16 && ((sl_band.pat[sl_lane % SH_PLANES] >> s) & 1u); if (sl_run && (uint32_t)s == sl_step % 16u) on = !on; }
            else on = l == (int)sl_lane;
            fm1_led_key(14u + k, on);
        }
    else
        for (k = 0; k < 27u; k++) {                        /* (MIXER: the first 4 white keys lit for each part heard, the next 4 for a solo) */
            int s = sl_page == PG_MIX ? sl_step_of_key(k) : -1, any = sl_solo[0] | sl_solo[1] | sl_solo[2] | sl_solo[3];
            if (s >= 0 && s < 4) fm1_led_key(14u + k, !sl_mute[s] && !(any && !sl_solo[s]));
            else if (s >= 4 && s < 8) fm1_led_key(14u + k, sl_solo[s - 4]);
            else fm1_led_key(14u + k, (int32_t)(sl_lit_until[k] - fm1_ms) > 0);
        }
    /* the buttons: each page's lit while you are on it; ARP the arp, LFO the slime; PLAY blinks until it is first pressed */
    for (k = 0; k < 14u; k++) fm1_led_key(k, (k == panel.btn[B_PLAY] && (sl_run || (!ever_played && !splash && ((fm1_ms >> 9) & 1u)))) ||
                                             (k == panel.btn[B_ARP] && sl_arp_on) || (k == panel.btn[B_LFO] && sl_slime) ||
                                             (k == panel.btn[B_HOME] && sl_page == PG_HOME) || (k == panel.btn[B_SCL] && sl_page == PG_SONG) ||
                                             (k == panel.btn[B_GLO] && sl_page == PG_MIX) || (k == panel.btn[B_FX] && sl_page == PG_FX) ||
                                             (k == panel.btn[B_ENV] && sl_page == PG_SOUND) || (k == panel.btn[B_EDIT] && sl_page == PG_CHORDS) ||
                                             (k == panel.btn[B_SEQ] && sl_page == PG_DRUMS) ||
                                             (k == panel.btn[B_REC] && (sl_loop_state == SL_LOOP_PLAY ? !sl_loop_dub || ((fm1_ms >> 7) & 1u) :
                                                                        sl_loop_state != SL_LOOP_OFF && ((fm1_ms >> 8) & 1u))));
    /* (REC: blinks for the count-in and the take, quick while overdubbing, steady while the loop plays) */
    /* THE CAMERA, round the box in three dimensions (Flah 2026-11-20: "it rotates too evenly, maybe add some wobble and
     * more dimension"). It was two sines, the yaw and the pitch, one speed each: an even, repeating sway. Now each axis
     * is three sines at speeds no whole ratio apart (it never comes round the same way twice), the view also rolls (the
     * horizon tips), the camera is closer (more perspective: the back of the box at ~68% of the front, was ~74%; the frame 8% smaller so a near corner at the widest yaw stays on the screen), and
     * every beat kicks a springy nod and roll that rings out, harder on the bar's 1: on the beat as it SOUNDS (the
     * conductor plans ~75 ms ahead of the speaker). */
    {
        static uint32_t last_beat = 0xFFFFFFFFu, jolt_at, jolt_on;
        static float jolt_amp;
        float j = 0.0f, ph[8], yaw, pitch, roll;
        static const float W[8] = {0.31f, 0.71f, 1.93f, 0.23f, 0.57f, 1.37f, 0.17f, 0.83f}, P0[8] = {0.0f, 1.3f, 0.4f, 1.0f, 2.1f, 0.7f, 0.0f, 0.4f};
        uint32_t i, beat = sl_step / 4u;
        for (i = 0; i < 8u; i++) {                         /* (each angle kept within a turn: a sine of a big one takes libm's
                                                            * slow reduction, minutes in) */
            float x = t * W[i] + P0[i];
            ph[i] = x - 6.2831853f * floorf(x / 6.2831853f);
        }
        if (sl_run && beat != last_beat) {                 /* a beat planned: its kick lands when it sounds */
            last_beat = beat; jolt_at = fm1_ms + 75u; jolt_on = 1; jolt_amp = (sl_step % 16u) < 4u ? 1.0f : 0.5f;
        }
        if (!sl_run) last_beat = 0xFFFFFFFFu;
        if (jolt_on && (int32_t)(fm1_ms - jolt_at) >= 0) {   /* a damped spring: 3.1 wobbles a second, gone in ~0.6 s */
            float u = (float)(fm1_ms - jolt_at) * 0.001f;
            if (u > 0.9f) jolt_on = 0;
            else { float q = 19.478f * u; q -= 6.2831853f * floorf(q / 6.2831853f); j = jolt_amp * expf(-u * 6.0f) * sinf(q); }
        }
        yaw = 0.55f * sinf(ph[0]) + 0.22f * sinf(ph[1]) + 0.07f * sinf(ph[2]);
        pitch = 0.30f + 0.20f * sinf(ph[3]) + 0.09f * sinf(ph[4]) + 0.04f * sinf(ph[5]) + 0.06f * j;
        roll = 0.11f * sinf(ph[6]) + 0.05f * sinf(ph[7]) + 0.035f * j;
        st_tumble3(yaw, pitch, roll, M);
        st_set_cam(760.0f);
    }
    /* the tank: the whole screen on its own page; lifted and smaller over another page's panel */
    if (sl_page != PG_HOME && !splash) st_set_frame(120.0f, 84.0f, ST_K * 0.55f); else st_set_frame(120.0f, 120.0f, ST_K * 0.92f);
    sl_prof.poll += fm1_ticks() - tk; tk = fm1_ticks();
    {
        /* the walls' colour wheel turns with the key (the key journey shows), and the slime takes the colour of the chord
         * the band is on: its root wall's hue, deeper, so it reads as colour, not a grey mass ("not colorblind": Flah) */
        float hue0 = (float)(sl_root % 12) / 12.0f;
        int td = sl_tank.s.scale ? sl_tank.s.scale->n * sl_tank.s.octs : 7;
        sl_pose_apply();                                   /* the tank as the speaker plays it */
        st_view_prepare(v, &sl_tank, M, hue0, 0);
        sl_pose_restore();
        v->goo = sl_hsv565(hue0 + (td > 0 ? (float)sl_band.chord / (float)td : 0.0f), 0.62f, 0.86f);
        for (k = 0; k < (uint32_t)v->nb; k++) { v->r[k] *= 1.35f; v->sr[k] *= 1.3f; }   /* notes that read on 240 px */
    }
    sl_prof.prep += fm1_ticks() - tk; tk = fm1_ticks();
    {
        /* Only the tank's box changes; the page around it is one colour. Send the box, joined with last frame's box
         * (so what moved out of it is painted over), and nothing else. The top line (the label) and a page's panel are
         * sent only when what they show changes (sent every frame, a page was a whole screen a frame: 28 fps in fm1-emu
         * STRICT, 2026-11-18). Each band sends its own columns. A new page: the whole screen once. */
        static int32_t px0 = 0, py0 = 0, px1 = 239, py1 = 239;   /* last frame's box: the whole screen at first */
        static char lab_drawn[sizeof sl_label];
        static uint8_t last_page = 0xFF;
        int32_t x0 = 239, x1 = 0, y0, y1, r, nb = 0, full = 0, panel = sl_page != PG_HOME && !splash, panel_need = 0;
        uint8_t lab_need;
        uint32_t px = 0;
        for (k = 0; k < (uint32_t)v->n; k++) {
            float a = v->fx[k] < v->bx[k] ? v->fx[k] : v->bx[k], c = v->fx[k] > v->bx[k] ? v->fx[k] : v->bx[k];
            if (a < (float)x0) x0 = (int32_t)a;
            if (c > (float)x1) x1 = (int32_t)c;
        }
        x0 -= SL_MARGIN; x1 += SL_MARGIN;                        /* a ball or a lit rim can stand a little proud */
        y0 = (int32_t)v->pymin - SL_MARGIN; y1 = (int32_t)v->pymax + SL_MARGIN;
        if (sl_page != last_page && !splash) {               /* the tank moves only between the tank and a page: then the whole screen */
            if ((sl_page == PG_HOME) != (last_page == PG_HOME)) full = 1;
            last_page = sl_page;
        }
        if (v->n < 3 || splash || full || sl_bursting() || (sl_bn && fm1_ms - sl_burst_t0 < SL_BURST_MS + 100u)) { x0 = 0; x1 = 239; y0 = 0; y1 = 239; full = 1; }
        {
            int32_t ux0 = x0 < px0 ? x0 : px0, ux1 = x1 > px1 ? x1 : px1, uy0 = y0 < py0 ? y0 : py0, uy1 = y1 > py1 ? y1 : py1;
            px0 = x0; px1 = x1; py0 = y0; py1 = y1;
            x0 = clamp(ux0, 0, 239); x1 = clamp(ux1, 0, 239); y0 = clamp(uy0, 0, 239); y1 = clamp(uy1, 0, 239);
            x0 &= ~1; x1 |= 1;                                   /* even columns: the packing below moves two pixels a word */
            if (panel && y1 >= SL_PANEL_Y) y1 = SL_PANEL_Y - 1;  /* (the panel's rows are its own) */
        }
        if (panel) { sl_panel_build(&sl_pm); panel_need = full || memcmp(&sl_pm, &sl_pm_drawn, sizeof sl_pm) != 0; }
        {   /* the worm and the minis, this frame (drawn by st_draw_band's rows: sl_bg_row) */
            static uint32_t last_ms;
            float dt = last_ms ? (float)(fm1_ms - last_ms) : 16.7f;
            last_ms = fm1_ms;
            static float acc;
            sl_decor_page = (uint8_t)panel;
            acc += dt;
            sl_worm_tick = (uint8_t)!sl_worm_tick;
            if (sl_worm_tick) { sl_worm_frame(acc); acc = 0.0f; }   /* (30 Hz, as the site draws him: half his cost) */
            sl_minis_frame();
        }
        {   /* the top line: what just changed (1.5 s), else the page and what SELECT picked; at the tank, stopped: "press play" */
            uint8_t on = !splash;                          /* (always a line: what changed, the page, "press play", or the key, scale and chord) */
            uint32_t q;
            if (on && (int32_t)(sl_label_until - fm1_ms) <= 0) {
                if (panel) { for (q = 0; q < sizeof sl_label - 1u && sl_pm.head[q]; q++) sl_label[q] = sl_pm.head[q]; sl_label[q] = 0; }
                else if (!sl_run) { const char *pp = "press play"; for (q = 0; pp[q]; q++) sl_label[q] = pp[q]; sl_label[q] = 0; }
                else sl_status_line(sl_label, sizeof sl_label);
            }
            if (!on) sl_label[0] = 0;
            for (q = 0; q < sizeof sl_label && sl_label[q] == lab_drawn[q] && sl_label[q]; q++) {}
            lab_need = full || sl_label[q] != lab_drawn[q] || (on && y0 < 16);
            sl_label_shown = on;
        }
        for (k = 0; k < 15u; k++) {
            int pband = panel && (int32_t)(k * 16u) >= SL_PANEL_Y;
            int in_box = !pband && (int32_t)(k * 16u) <= y1 && (int32_t)(k * 16u + 15u) >= y0;
            int whole = (k == 0u && lab_need) || (pband && panel_need);   /* this band all across */
            uint32_t ry0, ry1, rows, bx0 = (uint32_t)x0, bx1 = (uint32_t)x1, w;
            uint16_t *b;
            if (!in_box && !whole) continue;
            if (whole) { bx0 = 0; bx1 = 239; ry0 = 0; ry1 = 15; }
            else { ry0 = k * 16u < (uint32_t)y0 ? (uint32_t)y0 - k * 16u : 0u; ry1 = k * 16u + 15u > (uint32_t)y1 ? (uint32_t)y1 - k * 16u : 15u; }
            rows = ry1 - ry0 + 1u; w = bx1 - bx0 + 1u;
            b = sl_strip((uint32_t)nb++);                      /* (the other band may still be on its way to the panel) */
            if (((k == 0u && sl_label_shown) || pband) && b != cv_px) { lcd_sync(); b = cv_px; nb++; }   /* (cv_text draws into cv_px) */
            if (pband) { lcd_sync(); sl_panel_band(b, (int)(k * 16u)); }
            else {
                if (!splash || sp.alpha < 1.0f) st_draw_band(v, (int)(k * 16u), 16, b, BG, (int)bx0, (int)bx1);   /* (the splash alone covers it all) */
                if (splash) sl_splash_band(b, (int)(k * 16u), &sp);
                else if (sl_bursting()) sl_burst_band(b, (int)(k * 16u));
            }
            if (k == 0u && sl_label_shown) {                   /* SLOOP's font into this band */
                cv_w = 240; cv_h = 16; cv_oy = 0;
                cv_text(120 - text_w(&FONT_S, sl_label) / 2, 0, &FONT_S, sl_label, swap16(RGB(90, 72, 150)));   /* (the band is
                                                   * swapped to the panel's order below; cv_text writes swapped already) */
            }
            if (k == 0u && whole) memcpy(lab_drawn, sl_label, sizeof lab_drawn);
            sl_prof.draw += fm1_ticks() - tk; tk = fm1_ticks();
            for (r = 0; r < (int32_t)rows; r++) {             /* the columns, packed (the panel takes one window), big-endian,
                                                               * two pixels a word (bx0 even, w even: every row 4-byte aligned) */
                const uint16_t *s16 = b + (ry0 + (uint32_t)r) * 240u + bx0;
                uint16_t *d16 = b + (uint32_t)r * w;
                if (((uintptr_t)b & 3u) == 0u) {               /* (cv_px is a uint16_t array: 4-aligned is not promised) */
                    const uint32_t *s = (const uint32_t *)s16;
                    uint32_t *d = (uint32_t *)d16;
                    for (i = 0; i < w / 2u; i++) { uint32_t q = s[i]; d[i] = ((q & 0xFF00FF00u) >> 8) | ((q & 0x00FF00FFu) << 8); }
                } else
                    for (i = 0; i < w; i++) d16[i] = (uint16_t)((s16[i] >> 8) | (s16[i] << 8));
            }
            lcd_blit(bx0, k * 16u + ry0, w, rows, b);
            px += w * rows;
            sl_prof.pack += fm1_ticks() - tk; tk = fm1_ticks();
            slime_poll();
            sl_prof.poll += fm1_ticks() - tk; tk = fm1_ticks();
        }
        if (!splash && !full) {                              /* the decorations' own patches, where the tank's box did not reach */
            static int32_t wx0 = 239, wy0 = 239, wx1 = 0, wy1 = 0;
            static int8_t hop_was[SL_NMINI];
            uint32_t q;
            if (sl_wm.on && !panel && sl_worm_tick) {           /* the worm, when he moved: his box now and last time's (what he left) */
                sl_patch_out(v, sl_wm.x0 < wx0 ? sl_wm.x0 : wx0, sl_wm.y0 < wy0 ? sl_wm.y0 : wy0, sl_wm.x1 > wx1 ? sl_wm.x1 : wx1, 239, x0, y0, x1, y1, (uint32_t *)&nb, BG, panel, &px);
                wx0 = sl_wm.x0; wy0 = sl_wm.y0; wx1 = sl_wm.x1; wy1 = sl_wm.y1;
            }
            for (q = 0; q < SL_NMINI; q++)                      /* a mini mid-hop, or just landed */
                if (sl_mini_hop[q] || hop_was[q]) {
                    sl_patch_out(v, SL_MINI_AT[q][0] - 11, SL_MINI_AT[q][1] - 17, SL_MINI_AT[q][0] + 11, SL_MINI_AT[q][1] + 7, x0, y0, x1, y1, (uint32_t *)&nb, BG, panel, &px);
                    hop_was[q] = sl_mini_hop[q];
                }
        }
        if (panel_need) sl_pm_drawn = sl_pm;
        sl_px = px;
    }
    lcd_sync();
    sl_prof.sync += fm1_ticks() - tk;
    sl_frames++; sl_prof.frames++; sl_prof.px += sl_px;
    sl_frame_ms = fm1_ms - t0;
    {   /* packed for fm1-emu's 4-word dump: frames | worst frame ms; audio worst half us | deadlines missed;
         * the tank tick's worst us | its mean us; the goo's drops at the worst tick */
        static uint32_t worst;
        if (sl_frames > 30u && sl_frame_ms > worst) worst = sl_frame_ms;
        sl_dbg[0] = (sl_frames & 0xFFFFu) | (worst << 16);
        sl_dbg[1] = (audio_max_us & 0xFFFFu) | (felucca_dbg.late << 16);
        sl_dbg[2] = (sl_tick_us_max & 0xFFFFu) | ((sl_tick_n ? sl_tick_us_sum / sl_tick_n : 0u) << 16);
        {   /* the frame rate over each 5 s after the splash: the worst window, and the last one (x10) */
            static uint32_t win_t, win_f, fps_min = 0xFFFu, fps_last;
            if (splash || !win_t) { win_t = fm1_ms; win_f = sl_frames; }
            else if (fm1_ms - win_t >= 5000u) {
                fps_last = (sl_frames - win_f) * 10000u / (fm1_ms - win_t);
                sl_fpsw[sl_fpsw_n++ % 64u] = (uint16_t)fps_last;   /* (every window, for fm1-emu's RAM dump) */
                if (fps_last < fps_min) fps_min = fps_last;
                win_t = fm1_ms; win_f = sl_frames;
            }
            /* notes late (> 1 block, to 255) | the worst 5 s window's fps x10 | the last one's (2026-11-18: was the reform's ms) */
            sl_dbg[3] = (sl_stat.late > 255u ? 255u : sl_stat.late) | ((fps_min & 0xFFFu) << 8) | ((fps_last & 0xFFFu) << 20);
        }
    }
}

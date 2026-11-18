/* SPDX-License-Identifier: GPL-3.0-only */
/* Slimehedron for the FM-1: the screen and the panel. Replaces SLOOP's groovebox UI in the main loop (patch_sloop.py:
 * ui_input / ui_leds / ui_draw are no longer called). The screen is the tank and nothing else: drawn 2.5D by
 * fm1/core/drawtank.c in 16-row bands, each band sent while the next is painted.
 *
 * Panel (studio):
 *   keys      their note in the tank's scale, now (a hand is never quantized), and a ball into the tank
 *   PLAY      everything runs / stands still              HOME   a new shape (on the next downbeat)
 *   ARP       auto-notes: the slime drops notes by itself SEQ    the drums on / off
 *   LFO       the slime: key journey, reforms             REC    the band (bass and chords) on / off
 *   SCL       the next scale                              OCT- / OCT+  the key down / up a semitone
 *   SELECT    the shape: 3..12 walls                      ALGORITHM  space: normal / portal
 *   PRESETS   the melody's sound                          KNOB 1 tempo   KNOB 2 spin   KNOB 3 rhythm   KNOB 4 scale
 *   MASTER    volume (SLOOP's main loop, unchanged)
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

#define SL_PAGE_BG 0xF7BFu                  /* the page's pale lilac (the tank's page, the splash's) */
UI_SMALL static void slime_splash(void)     /* power-on, before the sound starts: the page's colour, the slime drops in next */
{
    lcd_fill(0, 0, 240, 240, SL_PAGE_BG);
}

/* THE SPLASH (Flah 2026-11-18: "a characteristic little seafoam green slime guy with glasses as the initial boot splash
 * screen, with a cool sound playing kinda like when u start a gamecube or gameboy color type shit. and say Slimehedron,
 * then fade into the main mode"). Drawn here, pixel by pixel, no picture stored: the slime drops in, lands with a squash
 * and a wobble (the jingle's bloop: slime.c SL_JINGLE), a glint crosses his glasses, the name comes up under him, he
 * blinks, and it all fades into the tank. Any button or key skips to the fade. */
#define SL_SPLASH_MS 3300u                  /* from the drop to the end of the fade */
#define SL_FADE_MS 500u
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
/* this frame's pose: where he is, how squashed, what shows */
typedef struct { float cx, cy, W, H, glint, title, blink, alpha, shadow; } sl_pose;
static sl_pose sl_splash_pose(uint32_t ms)
{
    sl_pose p;
    const float ground = 150.0f, W0 = 56.0f, H0 = 50.0f, t = (float)ms;
    float s = 0.0f, up = 0.0f;
    if (t < 420.0f) { float q = t / 420.0f; up = 190.0f * (1.0f - q * q); s = -0.12f * q; }   /* falling, a touch stretched */
    else { float u = (t - 420.0f) / 1000.0f; s = 0.30f * expf(-u * 7.5f) * cosf(u * 31.0f); }   /* landed: squash, wobble */
    p.W = W0 * (1.0f + s); p.H = H0 * (1.0f - s);
    p.cx = 120.0f; p.cy = ground - p.H * 0.92f - up;
    p.shadow = 1.0f - (up / 190.0f);
    p.glint = t > 900.0f && t < 1400.0f ? (t - 900.0f) / 500.0f : -1.0f;
    p.title = sl_ease((t - 950.0f) / 450.0f);
    p.blink = t > 2050.0f && t < 2190.0f ? 1.0f : 0.0f;
    p.alpha = 1.0f - sl_ease((t - (float)(SL_SPLASH_MS - SL_FADE_MS)) / (float)SL_FADE_MS);
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
/* one native-order band (rows y0..y0+15) of the splash, over what is there by p.alpha (1: all splash) */
static void sl_splash_band(uint16_t *b, int y0, const sl_pose *p)
{
    static const uint16_t BODY = 0x8F38u, RIM = 0x4E31u, LINE = 0x2BEDu, LENS = 0x3970u, PINK = 0xFD18u, GLOW = 0xBF7Du, SHADE = 0xC5DBu;
    uint32_t ka = sl_k(p->alpha), kt = sl_k(p->title), ks = (uint32_t)(4.0f + 10.0f * p->shadow);
    float iW = 1.0f / p->W, iH = 1.0f / p->H, sx = p->W / 56.0f, sy = p->H / 50.0f;
    float ex = 20.0f * sx, ey = p->cy - 4.0f * sy, lr = 14.5f * (sx + sy) * 0.5f;    /* the eyes (lenses): off the middle, radius */
    float iSh = 1.0f / (p->W * (0.6f + 0.5f * p->shadow)), i1x = 1.0f / (7.0f * sx), i1y = 1.0f / (8.0f * sy), i2x = 1.0f / (5.0f * sx), i2y = 1.0f / (6.0f * sy);
    float bx0 = p->cx - p->W * 1.05f, bx1 = p->cx + p->W * 1.05f, by0 = p->cy - p->H * 1.05f, by1 = p->cy + p->H * 1.25f;   /* his box */
    int r, x;
    if (!ka) return;
    for (r = 0; r < 16; r++) {
        int y = y0 + r;
        float yc = (float)y + 0.5f, dy = (yc - p->cy) * iH, gy = yc - 92.0f, sy2 = (yc - 153.0f) * (1.0f / 6.0f), dy2 = dy * dy;
        float rry = dy < 0.0f ? dy2 : dy2 * dy2, d1y = (yc - (p->cy + 0.86f * p->H)) * i1y, d2y = (yc - (p->cy + 0.92f * p->H)) * i2y;
        int inrow = yc > by0 && yc < by1, glowrow = gy * gy < 95.0f * 95.0f, shrow = sy2 * sy2 < 1.0f;
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
                {   /* the face: glasses, eyes, a smile, rosy cheeks */
                    float lx = xc - (p->cx - ex), rx = xc - (p->cx + ex), ly = yc - ey;
                    float dl = lx * lx + ly * ly, dr2 = rx * rx + ly * ly, d = dl < dr2 ? dl : dr2, ox = dl < dr2 ? lx : rx;
                    float L2 = lr * lr, Li = (lr - 3.0f) * (lr - 3.0f);
                    float cx1 = xc - (p->cx - 0.56f * p->W), cx2 = xc - (p->cx + 0.56f * p->W), cyy = (yc - (p->cy + 0.26f * p->H)) / 4.0f;
                    if ((cx1 * cx1) / 49.0f + cyy * cyy < 1.0f || (cx2 * cx2) / 49.0f + cyy * cyy < 1.0f) c = sl_bl(c, PINK, 14u);
                    if (d < Li) {                                                                /* inside a lens */
                        float px2 = ox - 1.0f * sx, py2 = ly - 2.0f * sy;
                        c = sl_bl(c, 0xFFFFu, 12u);
                        if (p->blink > 0.0f) { if (py2 > -1.2f && py2 < 1.2f && px2 > -5.0f && px2 < 5.0f) c = LENS; }
                        else if (px2 * px2 + py2 * py2 < 22.0f) c = (px2 + 1.6f) * (px2 + 1.6f) + (py2 + 1.8f) * (py2 + 1.8f) < 2.4f ? 0xFFFFu : 0x18C3u;
                        if (p->glint >= 0.0f) { float g = (ox + ly) / (2.0f * lr) + 1.0f - p->glint * 2.4f; if (g > -0.10f && g < 0.10f) c = sl_bl(c, 0xFFFFu, 24u); }
                    } else if (d < L2) c = LENS;                                                 /* the rims */
                    if (yc > ey - 2.6f && yc < ey + 0.6f && xc > p->cx - ex + lr - 1.0f && xc < p->cx + ex - lr + 1.0f) c = LENS;   /* the bridge */
                    {   /* the arms, back to his sides */
                        float ax = xc < p->cx ? (p->cx - ex - lr) - xc : xc - (p->cx + ex + lr);
                        if (ax > -1.0f && ax < 9.0f * sx && yc > ey - 2.4f - ax * 0.15f && yc < ey + 0.2f - ax * 0.15f && rr < 0.95f) c = LENS;
                    }
                    {   /* the smile: the bottom of a ring */
                        float mx = xc - p->cx, my = yc - (p->cy + 6.0f * sy), m = mx * mx + my * my, R1 = 9.0f * sx;
                        if (my > 2.0f && m < (R1 + 1.2f) * (R1 + 1.2f) && m > (R1 - 1.2f) * (R1 - 1.2f)) c = LENS;
                    }
                }
            }
            if (kt && y >= 172 && y < 204) {                                                     /* the name, rising in */
                int ty = y - 172 + (int)(8.0f * (1.0f - p->title));
                if (ty >= 0 && ty < 32 && sl_title[ty][x]) c = sl_bl(c, 0x7AF5u, (uint32_t)sl_title[ty][x] * 2u * kt / 32u);
            }
            row[x] = ka >= 32u ? c : sl_bl(row[x], c, ka);
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
static const char *sl_scale_word(uint32_t i)
{
    static const char *const W[SL_NSCALE] = {"major", "minor", "pentatonic", "minor pentatonic", "dorian", "mixolydian", "19 notes", "31 notes"};
    return W[i % SL_NSCALE];
}
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

/* THE PAGES. HOME is the tank as you play it; FX, SOUND and MIX are one button each (the FM-1's own FX, EDIT and GLO),
 * and every page uses all seven encoders for things that belong together. FX steps through the parts, melody -> bass ->
 * chords -> drums -> back home; HOME always comes home (and, at home, makes a new shape). The bottom row names the four
 * knobs on every page but home, so nothing has to be remembered. */
enum { PG_HOME, PG_FX, PG_SOUND, PG_MIX, PG_ENV, PG_CHORDS, PG_DRUMS };
static uint8_t sl_page, sl_fx_part;
static const char *const SL_FOOT[7][4] = {
    {"tempo", "spin", "rhythm", "key"}, {"filter", "drive", "delay", "reverb"},
    {"melody", "bass", "chords", "kit"}, {"melody", "bass", "chords", "drums"},
    {"attack", "decay", "sustain", "release"},
    {"root", "chord", "bars", "how many"}, {"lane", "fill", "shift", "pattern"},
};
static uint8_t sl_env_part;                 /* the NOTES page's part: melody, bass, chords */

/* CHORDS (EDIT, double tap): a progression of up to 8 chords, the site's chord progression panel (CHORD_MODE): it owns
 * the harmony while it has chords; how many = 0 gives it back to the slime. A key sets the chord picked to its note and
 * moves on to the next; PRESETS deals one of the site's famous progressions in this key. Names as the keys call them.
 * DRUMS (GLO, double tap): a person's drum pattern, the site's step grid: the 16 white keys are the 16 steps of the lane
 * picked, a black key picks a lane; the keys' lights show the lane, the step playing blinks. */
static uint8_t sl_cm_sel, sl_lane, sl_famous;
static const char *const SL_ROMAN[12] = {"I", "bII", "II", "bIII", "III", "IV", "#IV", "V", "bVI", "VI", "bVII", "VII"};
static int sl_white(uint32_t k) { uint32_t pc = (53u + k) % 12u; return pc == 0u || pc == 2u || pc == 4u || pc == 5u || pc == 7u || pc == 9u || pc == 11u; }
static int sl_step_of_key(uint32_t k) { uint32_t i, s = 0; if (!sl_white(k)) return -1; for (i = 0; i < k; i++) s += (uint32_t)sl_white(i); return (int)s; }
static int sl_lane_of_key(uint32_t k) { uint32_t i, s = 0; if (sl_white(k)) return -1; for (i = 0; i < k; i++) s += (uint32_t)!sl_white(i); return s < SH_PLANES ? (int)s : -1; }
static char *sl_cat(char *d, const char *s, const char *end) { while (*s && d < end) *d++ = *s++; *d = 0; return d; }
static void sl_chord_name(char *b, uint32_t i)   /* "D m7": the chord's note (as the key stands) and its kind */
{
    char *e = b + 11;
    b[0] = 0;
    sl_cat(sl_cat(b, SL_NOTE[(uint32_t)(sl_root + sl_band.cm_root[i % SH_CM_MAX]) % 12u], e), SH_CQ_NAME[sl_band.cm_qual[i % SH_CM_MAX] % SH_NCQ], e);
}
static void sl_chords_title(void)            /* the progression, or the chord picked when it does not fit */
{
    char *p = sl_label, *end = sl_label + sizeof sl_label - 1u, b[12];
    uint32_t i;
    if (!sl_band.cm_n) { sl_cat(sl_label, "chords: the slime's", end); return; }
    for (i = 0; i < (uint32_t)sl_band.cm_n; i++) { sl_chord_name(b, i); if (i) p = sl_cat(p, " ", end); p = sl_cat(p, b, end); }
    if (p - sl_label > 24) {
        char n[8];
        p = sl_cat(sl_label, "chord ", end); p = sl_cat(p, sl_num(n, sl_cm_sel + 1), end); p = sl_cat(p, ": ", end);
        sl_chord_name(b, sl_cm_sel); sl_cat(p, b, end);
    }
}
static void sl_drums_title(void)             /* the lane and its 16 steps: "kick x...x...x...x..." */
{
    char *p = sl_cat(sl_label, SH_PLANE_NAME[sl_lane % SH_PLANES], sl_label + sizeof sl_label - 1u);
    uint32_t s;
    if (!sl_band.pat_on) { sl_cat(p, ": the rhythm's", sl_label + sizeof sl_label - 1u); return; }
    *p++ = ' ';
    for (s = 0; s < 16u && p < sl_label + sizeof sl_label - 1u; s++) *p++ = (sl_band.pat[sl_lane % SH_PLANES] >> s) & 1u ? 'x' : '.';
    *p = 0;
}
static void sl_page_say(void)
{
    if (sl_page == PG_FX) sl_say("fx: ", SL_PART_NAME[sl_fx_part]);
    else if (sl_page == PG_SOUND) sl_say("sound", 0);
    else if (sl_page == PG_MIX) sl_say("mix", 0);
    else if (sl_page == PG_ENV) sl_say("notes: ", SL_PART_NAME[sl_env_part]);
    else if (sl_page == PG_CHORDS) sl_say("chords", 0);
    else if (sl_page == PG_DRUMS) sl_say("drums: my pattern", 0);
    else sl_say("home", 0);
}
static void sl_page_title(void)              /* the page's name, held at the top while you are on it */
{
    const char *t = sl_page == PG_FX ? SL_PART_NAME[sl_fx_part] : sl_page == PG_ENV ? SL_PART_NAME[sl_env_part] : sl_page == PG_SOUND ? "sound" : sl_page == PG_MIX ? "mix" : "press play";   /* (home: only while stopped) */
    uint32_t i = 0, j = 0;
    const char *pre = sl_page == PG_FX ? "fx: " : sl_page == PG_ENV ? "notes: " : "";
    if (sl_page == PG_CHORDS) { sl_chords_title(); return; }
    if (sl_page == PG_DRUMS) { sl_drums_title(); return; }
    while (pre[j] && i < sizeof sl_label - 1u) sl_label[i++] = pre[j++];
    for (j = 0; t[j] && i < sizeof sl_label - 1u; j++) sl_label[i++] = t[j];
    sl_label[i] = 0;
}
static const char *sl_filter_word(int32_t f) { return f < -2 ? "low-pass " : f > 2 ? "high-pass " : "open"; }
static uint32_t sl_gate_ms = 110u;          /* the melody's note length */

static void sl_fx_turn(int32_t knob, int32_t d)
{
    sl_fx *f = &sl_fxs[sl_fx_part];
    if (knob == 0) {
        int32_t was = f->filt, now = clamp(was + d, -64, 63);
        if ((was > 0 && now < 0) || (was < 0 && now > 0)) now = 0;   /* crossing the middle stops at open (a detent) */
        f->filt = (int8_t)now;                             /* (a first try snapped |f| < 3 to 0: single clicks never left it) */
        sl_say_num(sl_filter_word(f->filt), f->filt < 0 ? -f->filt : f->filt, 0);
        if (!f->filt) sl_say("filter open", 0);
    } else if (knob == 1) {
        f->drive = (uint8_t)clamp((int32_t)f->drive + d, 0, 127);
        sl_say_num(sl_fx_part == SL_P_DRUMS ? "punch " : "drive ", f->drive * 100 / 127, "%");
    } else if (knob == 2) {
        f->echo = (uint8_t)clamp((int32_t)f->echo + d, 0, 127);
        sl_say_num("delay ", f->echo * 100 / 127, "%");
    } else if (knob == 3) {
        f->space = (uint8_t)clamp((int32_t)f->space + d, 0, 127);
        sl_say_num("reverb ", f->space * 100 / 127, "%");
    } else if (knob == 4) {                                /* SELECT: the character */
        f->ctype = (uint8_t)sl_wrap(f->ctype, d, (int32_t)SL_NCHAR);
        if (f->ctype && !f->camt) f->camt = 64;
        sl_say("character: ", SL_CHAR[f->ctype].name);
    } else if (knob == 5) {                                /* ALGORITHM: its amount */
        char b[16];
        const char *nm = f->ctype ? SL_CHAR[f->ctype].name : "character off";
        uint32_t i = 0;
        f->camt = (uint8_t)clamp((int32_t)f->camt + d, 0, 127);
        while (nm[i] && i < 13u) { b[i] = nm[i]; i++; }
        b[i++] = ' '; b[i] = 0;                            /* ("chorus 100%", not "chorus100%") */
        if (f->ctype) sl_say_num(b, f->camt * 100 / 127, "%"); else sl_say(nm, 0);
    }
    sl_fxp[sl_fx_part] = 0xFF;                             /* (a preset no more: your own) */
    sl_fx_apply(sl_fx_part);
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


/* NOTES (ENV): a part's envelope. Its shapes, after the site's sound settings (attack, decay, sustain, release): the
 * sound's own, then five a person knows by name. An FM sound keeps its own (its operators are its envelope). */
#define SL_NENVP 6u
static const struct { const char *name; uint8_t v[5]; } SL_ENVP[SL_NENVP] = {
    {"the sound's own", {0}}, {"pluck", {0, 40, 0, 30, 0}}, {"keys", {2, 70, 70, 45, 0}}, {"soft", {40, 70, 100, 70, 0}},
    {"pad", {80, 90, 110, 95, 0}}, {"stab", {0, 25, 0, 20, 0}},
};
static int sl_env_fm(uint32_t part) { return sl_snd_entry(part, sl_snd_of[part])->eng == 9u; }   /* FM6: its own envelopes */
static void sl_env_read(uint32_t part)       /* the part's envelope as its sound left it */
{
    static const uint8_t P[5] = {P_ATK, P_DEC, P_SUS, P_REL, P_GLIDE};
    uint32_t i;
    for (i = 0; i < 5u; i++) sl_env_v[part][i] = (uint8_t)clamp(trk[part].p[P[i]], 0, 127);
}
static void sl_env_turn(uint32_t knob, int32_t d)
{
    static const char *const W[5] = {"attack ", "decay ", "sustain ", "release ", "glide "};
    uint32_t p = sl_env_part;
    if (sl_env_fm(p)) { sl_say("fm sound: ", "its own envelope"); return; }
    if (!sl_env_on[p]) { sl_env_read(p); sl_env_on[p] = 1; }
    sl_env_v[p][knob] = (uint8_t)clamp((int32_t)sl_env_v[p][knob] + d, 0, 127);
    sl_env_put(p);
    sl_say_num(W[knob], sl_env_v[p][knob] * 100 / 127, "%");
}

/* SONGS (SAVE). What a person set up, kept in the FM-1's flash: three songs and the last session. A song is the sounds,
 * the rhythm, the key, the scale, the tempo, the shape, the fx, the mix, the notes and the loop. SLOOP's storage
 * (storage.c: two copies, a torn write leaves the old one) in SLOOP's four project objects, which this firmware does not
 * otherwise use. A flash erase silences the audio while it runs (felucca.c), so a write waits for the music to stop,
 * as SLOOP's own SAVE does ("STOP BEFORE SAVE"); the session is written when stopped, 3 s after the last change, like
 * the site's own memory of where you were (and read back at power-on). */
#define SL_SONG_MAGIC 0x534C4D32u   /* "SLM2" (2026-11-18: + the chord progression and the drum pattern; an SLM1 song is not read) */
#define SL_NSONG 3u
typedef struct {
    uint32_t magic, size;
    uint8_t snd[3], kit, drumkit, scale, walls, space, slime, autoN, band, drums, pinned, chord_bars, dtime, rsize;
    int8_t root, spin, octave, mix[4];
    uint16_t bpm, gate_ms;
    uint8_t swing100, fxp[4], env_on[3], env[3][5];
    sl_fx fx[4];
    uint8_t loop_bars, pad;
    uint8_t cm_n, cm_root[SH_CM_MAX], cm_qual[SH_CM_MAX], cm_bars[SH_CM_MAX], pat_on, human;   /* CHORDS, DRUMS */
    uint16_t pat[SH_PLANES];
    uint16_t loop_n;
    sl_lev loop[SL_LOOP_MAX];
    uint32_t sum;
} sl_song;
_Static_assert(sizeof(sl_song) <= ST_PAYLOAD_MAX, "a song fits one flash object");
static sl_song sl_sbuf;
static uint8_t sl_slot;                      /* the song SAVE writes and a double SAVE reads: 0..2 */
static uint32_t sl_song_hash(const sl_song *g) { return proj_hash(g, sizeof *g - 4u); }
UI_SMALL static void sl_song_take(sl_song *g)
{
    uint32_t p;
    memset(g, 0, sizeof *g);
    g->magic = SL_SONG_MAGIC; g->size = sizeof *g;
    for (p = 0; p < 3u; p++) { g->snd[p] = sl_snd_of[p]; g->env_on[p] = sl_env_on[p]; memcpy(g->env[p], sl_env_v[p], 5); }
    g->kit = sl_kit; g->drumkit = (uint8_t)TDRUM->p[P_E0]; g->scale = sl_scale; g->walls = sl_walls; g->space = sl_space;
    g->slime = sl_slime; g->autoN = sl_auto; g->band = sl_band_on; g->drums = sl_drums_on; g->pinned = sl_pinned;
    g->chord_bars = (uint8_t)sl_band.chord_bars; g->dtime = (uint8_t)song.g[G_DTIME]; g->rsize = (uint8_t)song.g[G_RSIZE];
    g->root = (int8_t)sl_root; g->spin = sl_spin; g->octave = sl_octave; g->bpm = (uint16_t)song.g[G_BPM]; g->gate_ms = (uint16_t)sl_gate_ms;
    g->swing100 = (uint8_t)(sl_tank.s.swing * 100.0 + 0.5);
    for (p = 0; p < 4u; p++) { g->mix[p] = sl_mix[p]; g->fxp[p] = sl_fxp[p]; g->fx[p] = sl_fxs[p]; }
    g->cm_n = (uint8_t)sl_band.cm_n; memcpy(g->cm_root, sl_band.cm_root, SH_CM_MAX); memcpy(g->cm_qual, sl_band.cm_qual, SH_CM_MAX); memcpy(g->cm_bars, sl_band.cm_bars, SH_CM_MAX);
    g->pat_on = (uint8_t)sl_band.pat_on; g->human = (uint8_t)sl_band.human; memcpy(g->pat, sl_band.pat, sizeof g->pat);
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
    sl_slime = g->slime ? 1u : 0u; sl_auto = g->autoN ? 1u : 0u; sl_band_on = g->band ? 1u : 0u; sl_drums_on = g->drums ? 1u : 0u;
    sl_pinned = g->pinned ? 1u : 0u;
    sl_band.chord_bars = g->chord_bars == 1u || g->chord_bars == 4u ? g->chord_bars : 2u;
    song.g[G_DTIME] = (int16_t)(g->dtime % 9u); song.g[G_RSIZE] = (int16_t)clamp(g->rsize, 0, 127);
    song.g[G_BPM] = (int16_t)clamp(g->bpm, 40, 200);
    sl_spin = (int8_t)clamp(g->spin, -100, 100); sl_octave = (int8_t)clamp(g->octave, -2, 2);
    sl_gate_ms = (uint32_t)clamp(g->gate_ms, 40, 600); sl_gate_blocks = sl_ms_to_block((double)sl_gate_ms);
    sl_tank.s.swing = g->swing100 > 50u ? 0.5 : g->swing100 / 100.0;
    for (p = 0; p < 4u; p++) {
        sl_mix[p] = (int8_t)clamp(g->mix[p], SL_MIX_OFF, 12); sl_fxs[p] = g->fx[p]; sl_fxp[p] = g->fxp[p];
        if (sl_fxs[p].ctype >= SL_NCHAR) sl_fxs[p].ctype = 0;
        if (p == SL_P_DRUMS || sl_fxp[p]) sl_fx_apply(p);  /* (a synth part on its sound's own fx reads them when it loads) */
    }
    if (g->drumkit >= DRUM_SAMPLED && g->drumkit < DRUM_USR) TDRUM->p[P_E0] = g->drumkit;
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
UI_SMALL static int sl_song_write(uint32_t obj)
{
    sl_song_take(&sl_sbuf);
    return flash_ok && st_save(obj, &sl_sbuf, sizeof sl_sbuf) == 0;
}
UI_SMALL static int sl_song_read(uint32_t obj)
{
    if (!flash_ok || st_load(obj, &sl_sbuf, sizeof sl_sbuf) != (int)sizeof sl_sbuf || !sl_song_ok(&sl_sbuf)) return 0;
    sl_song_put(&sl_sbuf);
    return 1;
}
#define SL_OBJ_SONG(i) (OBJ_PROJECT0 + (i))
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

static void slime_poll(void)                /* often: nothing a hand does waits for a frame */
{
    uint32_t rel, pressed = fm1_input_edges(&rel), keys = fm1_input_note_edges();
    int32_t d;
#define SL_PRESSED(b) (pressed & (1u << panel.btn[b]))
    if (keys && sl_page == PG_DRUMS) {                     /* DRUMS: the white keys are steps, the black ones lanes; no notes */
        uint32_t k;
        for (k = 0; k < 27u; k++) if ((keys >> k) & 1u) {
            int s = sl_step_of_key(k), l = sl_lane_of_key(k);
            if (s >= 0 && s < 16) { sl_band.pat[sl_lane % SH_PLANES] ^= (uint16_t)(1u << s); if (!sl_band.pat_on) sl_band.pat_on = 1; }
            else if (l >= 0) sl_lane = (uint8_t)l;
        }
        sl_drums_title(); sl_label_until = fm1_ms + 1500u;
        keys = 0;
    }
    if (keys && sl_page == PG_CHORDS) {                    /* CHORDS: a key sets the chord picked to its note, then the next */
        uint32_t k;
        const sh_scale *sc = sh_scale_by_id(SL_SCALES[sl_scale % SL_NSCALE]);
        for (k = 0; k < 27u; k++) if ((keys >> k) & 1u) {
            int semis = ((53 + (int)k - sl_root) % 12 + 12) % 12;
            if (sl_cm_sel >= sl_band.cm_n) { sl_band.cm_n = sl_cm_sel + 1; sl_band.cm_bars[sl_cm_sel] = 1; }
            sl_band.cm_root[sl_cm_sel] = (int8_t)semis; sl_band.cm_qual[sl_cm_sel] = (uint8_t)sh_band_cq_for(sc, semis);
            if (!sl_band.cm_bars[sl_cm_sel]) sl_band.cm_bars[sl_cm_sel] = 1;
            sl_cm_sel = (uint8_t)((sl_cm_sel + 1u) % SH_CM_MAX);
        }
        sl_chords_title(); sl_label_until = fm1_ms + 1500u;
    }
    if (keys) {
        fm1_irq_off(); sl_key_req |= keys; fm1_irq_on();
    }
    if (pressed) sl_changed_ms = fm1_ms;
    if ((pressed || keys) && sl_splash_t0 && !sl_splash_done && !sl_skip) { sl_skip = 1; sl_skip_at = fm1_ms; }   /* a hand: on to the fade */
    /* ---- buttons: the same on every page ---- */
    {   /* PLAY: at once; a double tap: from the top (the band's bar 1, the loop's bar 1) */
        static uint32_t last;
        if (SL_PRESSED(B_PLAY)) {
            if (fm1_ms - last < SL_TAP_MS) { sl_run = 1; sl_step = 0; sl_loop_at = (uint8_t)(sl_loop_bars ? sl_loop_bars - 1u : 0u); sl_say("from the top", 0); }
            else { sl_run = (uint8_t)!sl_run; sl_say(sl_run ? "play" : "stop", 0); }
            last = fm1_ms;
        }
    }
    if (SL_PRESSED(B_HOME)) {
        if (sl_page != PG_HOME) { sl_page = PG_HOME; sl_say("home", 0); }
        else {                                             /* at home: a NEW shape, never the same walls again */
            static const uint8_t SHAPES[7] = {6, 5, 8, 3, 7, 4, 12};
            static uint8_t at;
            uint8_t w = sl_walls;
            while (SHAPES[at % 7u] == w) at++;
            sl_walls = SHAPES[at++ % 7u];
            sl_reform_req = 1; sl_say("new shape", 0);
        }
    }
    if (SL_PRESSED(B_FX)) {                                /* FX: melody -> bass -> chords -> drums -> home */
        if (sl_page != PG_FX) { sl_page = PG_FX; sl_fx_part = 0; }
        else if (++sl_fx_part >= SL_NPARTS) { sl_page = PG_HOME; sl_fx_part = 0; }
        sl_page_say();
    }
    /* EDIT: the sound page; a double tap: CHORDS. GLO: the mix page; a double tap: DRUMS (my pattern). Again: home */
    if (sl_tap2(B_EDIT, pressed)) { sl_page = sl_page == PG_CHORDS ? PG_HOME : PG_CHORDS; sl_page_say(); }
    if (sl_tap1(B_EDIT)) { sl_page = sl_page == PG_SOUND ? PG_HOME : PG_SOUND; sl_page_say(); }
    if (sl_tap2(B_GLO, pressed)) { sl_page = sl_page == PG_DRUMS ? PG_HOME : PG_DRUMS; sl_page_say(); }
    if (sl_tap1(B_GLO)) { sl_page = sl_page == PG_MIX ? PG_HOME : PG_MIX; sl_page_say(); }
    if (SL_PRESSED(B_ARP)) { sl_auto = (uint8_t)!sl_auto; sl_say("auto-notes ", sl_auto ? "on" : "off"); }
    /* LFO: the slime on / off; a double tap: the key pinned (the slime goes on, the key journey stops: the site's key lock) */
    if (sl_tap2(B_LFO, pressed)) { sl_pinned = (uint8_t)!sl_pinned; sl_say("key ", sl_pinned ? "pinned" : "free to move"); }
    if (sl_tap1(B_LFO)) { sl_slime = (uint8_t)!sl_slime; sl_say("slime ", sl_slime ? "on" : "off"); }
    /* SEQ: the band (drums, bass, chords) on / off; a double tap: the drums alone (the site's drums and band buttons) */
    if (sl_tap2(B_SEQ, pressed)) {
        uint8_t alone = (uint8_t)!(sl_drums_on && !sl_band_on);
        sl_drums_on = 1; sl_band_on = (uint8_t)!alone; sl_say(alone ? "drums alone" : "band on", 0);
    }
    if (sl_tap1(B_SEQ)) {
        uint8_t on = (uint8_t)!(sl_drums_on || sl_band_on);
        sl_drums_on = sl_band_on = on; sl_say("band ", on ? "on" : "off");
    }
    /* SCL: the next scale; a double tap: the one before */
    if (sl_tap2(B_SCL, pressed)) { sl_scale_req = (uint8_t)sl_wrap(sl_scale, -1, (int32_t)SL_NSCALE); sl_say("scale: ", sl_scale_word(sl_scale_req)); }
    if (sl_tap1(B_SCL)) { sl_scale_req = (uint8_t)sl_wrap(sl_scale, 1, (int32_t)SL_NSCALE); sl_say("scale: ", sl_scale_word(sl_scale_req)); }
    /* REC: the loop (count-in, take, close; overdub on a playing loop); a double tap: the loop cleared */
    if (sl_tap2(B_REC, pressed)) { sl_loop_clear(); sl_say("loop cleared", 0); }
    if (sl_tap1(B_REC)) {
        uint8_t was = sl_loop_state;
        if (!sl_run && was == SL_LOOP_OFF) sl_run = 1;     /* (the site: recording starts the music) */
        sl_loop_press();
        sl_say(was == SL_LOOP_OFF ? "rec: count-in" : was == SL_LOOP_ARMED ? "rec off" : was == SL_LOOP_REC ? "loop closes at the bar" :
               sl_loop_dub ? "overdub: play over the loop" : "overdub off", 0);
    }
    /* SAVE: tap, the song is saved (stopped: a flash write silences the audio); a double tap, the song comes back;
     * held, PRESETS picks the song (1..3) */
    {
        static uint8_t turned, up_wait;
        static uint32_t up_t;
        if (SL_PRESSED(B_SAVE)) turned = 0;
        if (rel & (1u << panel.btn[B_SAVE])) {
            if (turned) turned = 0;
            else if (up_wait && fm1_ms - up_t < SL_TAP_MS) {
                up_wait = 0;
                if (sl_song_read(SL_OBJ_SONG(sl_slot))) sl_say_num("loaded song ", sl_slot + 1, 0); else sl_say_num("empty: song ", sl_slot + 1, 0);
            } else { up_wait = 1; up_t = fm1_ms; }
        }
        if (up_wait && fm1_ms - up_t >= SL_TAP_MS) {
            up_wait = 0;
            if (sl_run) sl_say("stop, then save", 0);
            else if (sl_song_write(SL_OBJ_SONG(sl_slot))) sl_say_num("saved song ", sl_slot + 1, 0);
            else sl_say("not saved", 0);
        }
        if (fm1_in.buttons & (1u << panel.btn[B_SAVE])) {
            if ((d = panel_enc(EN_PRESET)) != 0) { sl_slot = (uint8_t)sl_wrap(sl_slot, d, (int32_t)SL_NSONG); turned = 1; sl_say_num("song ", sl_slot + 1, 0); }
        }
    }
    /* ENV: the NOTES page (each press: melody -> bass -> chords -> home) */
    if (SL_PRESSED(B_ENV)) {
        if (sl_page != PG_ENV) { sl_page = PG_ENV; sl_env_part = 0; }
        else if (++sl_env_part >= 3u) { sl_page = PG_HOME; sl_env_part = 0; }
        sl_page_say();
    }
    if (SL_PRESSED(B_OCTDN) || SL_PRESSED(B_OCTUP)) {      /* the keyboard's octave, as on any synth; both: back to the middle */
        uint32_t both = (1u << panel.btn[B_OCTDN]) | (1u << panel.btn[B_OCTUP]);
        if ((fm1_in.buttons & both) == both) sl_octave = 0;
        else sl_octave = (int8_t)clamp(sl_octave + (SL_PRESSED(B_OCTUP) ? 1 : -1), -2, 2);
        sl_say_num("octave ", sl_octave, 0);
    }
    /* ---- the encoders, by page ----
     * Every knob over a range accelerates: SLOOP's accel() (ui_input.c, after JIANT FM by juanjiant-bit, GPL-3.0): a slow
     * turn is one value a detent (fine tuning live), a fast one sweeps up to x16, a reversal never jumps, and SLOOP's
     * MENU KNOB ACCEL OFF setting is honoured. Lists (sounds, kits, presets, walls) step one at a time. */
    if (sl_page == PG_HOME) {
        if ((d = panel_enc(EN_K1)) != 0) { int32_t v = clamp(song.g[G_BPM] + accel(EN_K1, d, 161), 40, 200); song.g[G_BPM] = (int16_t)v; sl_say_num("tempo ", v, 0); }
        if ((d = panel_enc(EN_K2)) != 0) { sl_spin = (int8_t)clamp(sl_spin + accel(EN_K2, d, 51) * 4, -100, 100); if (sl_spin) sl_say_num("spin ", sl_spin, 0); else sl_say("spin off", 0); }
        if ((d = panel_enc(EN_K3)) != 0) { sl_kit_req = (uint8_t)sl_wrap(sl_kit, d, sh_band_nkits()); sl_say("rhythm: ", sh_band_kit_name(sl_kit_req)); }
        if ((d = panel_enc(EN_K4)) != 0) {
            int32_t nr = clamp(sl_root + d, 48, 71);
            sl_root_req = (int8_t)(nr - sl_root);
            sl_say("key: ", SL_NOTE[nr % 12]);
        }
        if ((d = panel_enc(EN_SELECT)) != 0) { sl_walls = (uint8_t)clamp((int32_t)sl_walls + d, 3, 12); sl_reform_req = 1; sl_say_num("walls ", sl_walls, 0); }
        if ((d = panel_enc(EN_ALGO)) != 0) { sl_space = (uint8_t)(d > 0); sl_reform_req = 1; sl_say(sl_space ? "portals on" : "portals off", 0); }
        if ((d = panel_enc(EN_PRESET)) != 0) {
            uint32_t i = (uint32_t)sl_wrap(sl_snd_of[SL_P_MEL], d, (int32_t)SL_NMEL);
            sl_snd_req[SL_P_MEL] = (uint8_t)i; sl_env_on[SL_P_MEL] = 0; sl_say("melody: ", SL_MEL_SND[i].name);
        }
    } else if (sl_page == PG_FX) {
        if ((d = panel_enc(EN_K1)) != 0) sl_fx_turn(0, accel(EN_K1, d, 128));
        if ((d = panel_enc(EN_K2)) != 0) sl_fx_turn(1, accel(EN_K2, d, 128));
        if ((d = panel_enc(EN_K3)) != 0) sl_fx_turn(2, accel(EN_K3, d, 128));
        if ((d = panel_enc(EN_K4)) != 0) sl_fx_turn(3, accel(EN_K4, d, 128));
        if ((d = panel_enc(EN_SELECT)) != 0) sl_fx_turn(4, d);
        if ((d = panel_enc(EN_ALGO)) != 0) sl_fx_turn(5, accel(EN_ALGO, d, 128));
        if ((d = panel_enc(EN_PRESET)) != 0) {
            uint32_t i = (uint32_t)sl_wrap(sl_fxp[sl_fx_part] == 0xFF ? 0 : sl_fxp[sl_fx_part], d, (int32_t)SL_NFXP);
            sl_fx_preset(sl_fx_part, i);
            sl_say("fx: ", SL_FXP[i].name);
        }
    } else if (sl_page == PG_SOUND) {
        int32_t p;
        for (p = 0; p < 3; p++)
            if ((d = panel_enc((uint32_t)(EN_K1 + p))) != 0) {
                uint32_t i = (uint32_t)sl_wrap(sl_snd_of[p], d, (int32_t)sl_snd_count((uint32_t)p));
                sl_snd_req[p] = (uint8_t)i; sl_env_on[p] = 0; sl_say(p == 0 ? "melody: " : p == 1 ? "bass: " : "chords: ", sl_snd_entry((uint32_t)p, i)->name);
            }
        if ((d = panel_enc(EN_K4)) != 0) {                 /* the drum kit: any of SLOOP's synthesized kits (a new rhythm brings its own) */
            uint32_t n = DRUM_USR - DRUM_SAMPLED, cur = (uint32_t)TDRUM->p[P_E0] - DRUM_SAMPLED;
            uint32_t i = (uint32_t)sl_wrap((int32_t)(cur < n ? cur : 0u), d, (int32_t)n);
            TDRUM->p[P_E0] = (int16_t)(DRUM_SAMPLED + i);
            sl_say("kit: ", DRUM_KIT_NAMES[DRUM_SAMPLED + i]);
        }
        if ((d = panel_enc(EN_SELECT)) != 0) {             /* the melody's note length */
            sl_gate_ms = (uint32_t)clamp((int32_t)sl_gate_ms + accel(EN_SELECT, d, 29) * 20, 40, 600);
            sl_gate_blocks = sl_ms_to_block((double)sl_gate_ms);
            sl_say_num("note length ", (int32_t)sl_gate_ms, " ms");
        }
        if ((d = panel_enc(EN_ALGO)) != 0) {               /* how long one chord lasts: 1, 2 or 4 bars (the site's chordBars) */
            static const uint8_t CB[3] = {1, 2, 4};
            int32_t at = sl_band.chord_bars >= 4 ? 2 : sl_band.chord_bars >= 2 ? 1 : 0;
            sl_band.chord_bars = CB[clamp(at + (d > 0 ? 1 : -1), 0, 2)];
            sl_say_num("chord every ", sl_band.chord_bars, sl_band.chord_bars == 1 ? " bar" : " bars");
        }
        if ((d = panel_enc(EN_PRESET)) != 0) {             /* a sound set: melody, bass and chords that suit each other */
            static uint8_t set;
            set = (uint8_t)sl_wrap(set, d, (int32_t)SL_NSET);
            sl_snd_req[0] = SL_SETS[set].mel; sl_snd_req[1] = SL_SETS[set].bass; sl_snd_req[2] = SL_SETS[set].comp;
            sl_env_on[0] = sl_env_on[1] = sl_env_on[2] = 0;
            sl_say("sounds: ", SL_SETS[set].name);
        }
    } else if (sl_page == PG_CHORDS) {                    /* CHORDS: the progression */
        const sh_scale *sc = sh_scale_by_id(SL_SCALES[sl_scale % SL_NSCALE]);
        int32_t d1 = panel_enc(EN_K1), d2 = panel_enc(EN_K2), d3 = panel_enc(EN_K3), d4 = panel_enc(EN_K4);
        int32_t ds = panel_enc(EN_SELECT), da = panel_enc(EN_ALGO), dp = panel_enc(EN_PRESET);
        uint32_t c, i;
        char b[12];
        if (ds) { sl_cm_sel = (uint8_t)sl_wrap(sl_cm_sel, ds, sl_band.cm_n > 0 ? sl_band.cm_n : 1); }
        c = sl_cm_sel % SH_CM_MAX;
        if ((d1 || d2 || d3) && sl_band.cm_n <= (int)c) {     /* turning a chord that is not there yet: the progression grows */
            for (i = (uint32_t)sl_band.cm_n; i <= c; i++) { sl_band.cm_root[i] = 0; sl_band.cm_qual[i] = (uint8_t)sh_band_cq_for(sc, 0); sl_band.cm_bars[i] = 1; }
            if (!sl_band.cm_n) { sl_band.cm_i = 0; sl_band.cm_left = 0; }
            sl_band.cm_n = (int)c + 1;
        }
        if (d1) { int r = sl_wrap(sl_band.cm_root[c], d1, 12); sl_band.cm_root[c] = (int8_t)r; sl_band.cm_qual[c] = (uint8_t)sh_band_cq_for(sc, r); }
        if (d2) sl_band.cm_qual[c] = (uint8_t)sl_wrap(sl_band.cm_qual[c], d2, SH_NCQ);
        if (d3) { static const uint8_t BB[3] = {1, 2, 4}; int at = sl_band.cm_bars[c] >= 4 ? 2 : sl_band.cm_bars[c] >= 2 ? 1 : 0;
                  sl_band.cm_bars[c] = BB[clamp(at + (d3 > 0 ? 1 : -1), 0, 2)]; }
        if (ds || d1 || d2 || d3) {
            char n[8], t[24], *p;
            sl_chord_name(b, c);
            p = sl_cat(t, sl_num(n, (int32_t)c + 1), t + 23); p = sl_cat(p, ": ", t + 23); p = sl_cat(p, b, t + 23);
            p = sl_cat(p, ", ", t + 23); p = sl_cat(p, sl_num(n, sl_band.cm_bars[c]), t + 23); sl_cat(p, sl_band.cm_bars[c] == 1 ? " bar" : " bars", t + 23);
            sl_say("chord ", t);
        }
        if (d4) {                                          /* how many chords: 0 gives the harmony back to the slime */
            int was = sl_band.cm_n, n = clamp(was + d4, 0, SH_CM_MAX);
            for (i = (uint32_t)was; i < (uint32_t)n; i++) { sl_band.cm_root[i] = 0; sl_band.cm_qual[i] = (uint8_t)sh_band_cq_for(sc, 0); sl_band.cm_bars[i] = 1; }
            if (!was && n) { sl_band.cm_i = 0; sl_band.cm_left = 0; }
            sl_band.cm_n = n;
            if (sl_cm_sel >= n && n) sl_cm_sel = (uint8_t)(n - 1);
            if (n) sl_say_num("chords: ", n, 0); else sl_say("chords: the slime's", 0);
        }
        if (da && sl_band.cm_n) {                          /* ALGORITHM: the whole progression up or down a semitone */
            for (i = 0; i < (uint32_t)sl_band.cm_n; i++) sl_band.cm_root[i] = (int8_t)sl_wrap(sl_band.cm_root[i], da, 12);
            sl_chords_title(); sl_label_until = fm1_ms + 1500u;
        }
        if (dp) {                                          /* PRESETS: the site's famous progressions, in this key */
            int minor = sc && sc->n == 7 && sc->cents[2] > 250.0f && sc->cents[2] < 350.0f;
            sl_famous = (uint8_t)sl_wrap(sl_famous, dp, SH_NFAMOUS);
            sh_band_cm_famous(&sl_band, sl_famous, minor, 1);
            sl_cm_sel = 0;
            sl_say("chords: ", SH_FAMOUS[sl_famous].name);
        }
    } else if (sl_page == PG_DRUMS) {                     /* DRUMS: my pattern */
        int32_t d1 = panel_enc(EN_K1), d2 = panel_enc(EN_K2), d3 = panel_enc(EN_K3), d4 = panel_enc(EN_K4);
        int32_t ds = panel_enc(EN_SELECT), da = panel_enc(EN_ALGO), dp = panel_enc(EN_PRESET);
        static uint8_t fill[SH_PLANES];
        uint32_t L;
        if (d1 || ds) sl_lane = (uint8_t)sl_wrap(sl_lane, d1 ? d1 : ds, SH_PLANES);
        L = sl_lane % SH_PLANES;
        if (d2) {                                          /* fill: the lane on every 16th, 8th, 3rd 16th, beat, half bar, or empty */
            static const uint8_t EVERY[6] = {0, 1, 2, 3, 4, 8};
            uint32_t s, m = 0;
            fill[L] = (uint8_t)sl_wrap(fill[L], d2, 6);
            for (s = 0; EVERY[fill[L]] && s < 16u; s += EVERY[fill[L]]) m |= 1u << s;
            sl_band.pat[L] = (uint16_t)m; sl_band.pat_on = 1;
        }
        if (d3) {                                          /* shift: the lane a 16th later / earlier, round the bar */
            uint32_t p = sl_band.pat[L], r = (uint32_t)(((d3 % 16) + 16) % 16);
            sl_band.pat[L] = (uint16_t)(((p << r) | (p >> (16u - r))) & 0xFFFFu);
        }
        if (d4) sl_band.pat_on = (int)(d4 > 0);           /* the pattern: mine, or the rhythm's own */
        if (da) { sl_band.human = (int)(da > 0); sl_say("feel: ", sl_band.human ? "the drummer's" : "exact"); }
        if (dp) {                                          /* PRESETS: the rhythm's own bar to start from, or a clean grid */
            if (dp > 0) { sh_band_pat_from_kit(&sl_band); sl_say("drums: from the rhythm", 0); }
            else { for (L = 0; L < SH_PLANES; L++) sl_band.pat[L] = 0; sl_say("drums: cleared", 0); }
            sl_band.pat_on = 1;
        }
        if (d1 || ds || d2 || d3 || d4) { sl_drums_title(); sl_label_until = fm1_ms + 1500u; }
    } else if (sl_page == PG_ENV) {                       /* NOTES: the part's envelope */
        uint32_t q;
        for (q = 0; q < 4u; q++) if ((d = panel_enc(EN_K1 + q)) != 0) sl_env_turn(q, accel(EN_K1 + q, d, 128));
        if ((d = panel_enc(EN_SELECT)) != 0) { sl_env_part = (uint8_t)sl_wrap(sl_env_part, d, 3); sl_page_say(); }
        if ((d = panel_enc(EN_ALGO)) != 0) sl_env_turn(4, accel(EN_ALGO, d, 128));
        if ((d = panel_enc(EN_PRESET)) != 0) {
            static uint8_t at[3];
            uint32_t p = sl_env_part;
            at[p] = (uint8_t)sl_wrap(at[p], d, (int32_t)SL_NENVP);
            if (sl_env_fm(p)) sl_say("fm sound: ", "its own envelope");
            else if (!at[p]) { sl_env_on[p] = 0; sl_snd_req[p] = sl_snd_of[p]; sl_say("notes: ", SL_ENVP[0].name); }
            else { memcpy(sl_env_v[p], SL_ENVP[at[p]].v, 5); sl_env_on[p] = 1; sl_env_put(p); sl_say("notes: ", SL_ENVP[at[p]].name); }
        }
    } else {                                               /* MIX */
        int32_t p;
        for (p = 0; p < 4; p++) if ((d = panel_enc((uint32_t)(EN_K1 + p))) != 0) sl_mix_turn((uint32_t)p, accel((uint32_t)(EN_K1 + p), d, 53));
        if ((d = panel_enc(EN_SELECT)) != 0) {             /* swing: the tank's grid and the band together */
            double sw = sl_tank.s.swing + d * 0.025;
            sl_tank.s.swing = sw < 0.0 ? 0.0 : sw > 0.5 ? 0.5 : sw;
            sl_say_num("swing ", (int32_t)(sl_tank.s.swing * 100.0 + 0.5), "%");
        }
        if ((d = panel_enc(EN_ALGO)) != 0) {               /* the echo's time, in note values (SLOOP's N_DLY) */
            static const char *const T[9] = {"1/4", "1/8", "1/16", "1/32", "1/8 triplet", "1/16 triplet", "1/8 dotted", "1/16 dotted", "1/4 dotted"};
            song.g[G_DTIME] = (int16_t)sl_wrap(song.g[G_DTIME], d, 9);
            sl_say("delay time ", T[song.g[G_DTIME]]);
        }
        if ((d = panel_enc(EN_PRESET)) != 0) {             /* the room: small .. a hall */
            song.g[G_RSIZE] = (int16_t)clamp(song.g[G_RSIZE] + accel(EN_PRESET, d, 32) * 4, 0, 127);
            sl_say_num("reverb size ", song.g[G_RSIZE] * 100 / 127, "%");
        }
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

static void slime_ui(void)
{
    static const uint16_t BG = 0xF7BF;      /* the page's pale lilac */
    st_view *v = sl_view();
    float M[9], t = (float)fm1_ms * 0.001f;
    uint32_t k, i, t0 = fm1_ms, tk = fm1_ticks();
    static uint8_t ever_played;
    sl_pose sp = {0};
    int splash = 0;
    slime_poll();
    if (!sl_splash_t0) { sl_title_render(); sl_splash_t0 = fm1_ms; sl_boot_ms = fm1_ms; }   /* the first frame: the splash begins */
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
    else for (k = 0; k < 27u; k++) fm1_led_key(14u + k, (int32_t)(sl_lit_until[k] - fm1_ms) > 0);
    /* PLAY blinks until it is first pressed: nothing plays until then */
    for (k = 0; k < 14u; k++) fm1_led_key(k, (k == panel.btn[B_PLAY] && (sl_run || (!ever_played && !splash && ((fm1_ms >> 9) & 1u)))) || (k == panel.btn[B_ARP] && sl_auto) ||
                                             (k == panel.btn[B_LFO] && sl_slime) || (k == panel.btn[B_SEQ] && (sl_drums_on || sl_band_on)) ||
                                             (k == panel.btn[B_FX] && sl_page == PG_FX) || (k == panel.btn[B_EDIT] && (sl_page == PG_SOUND || sl_page == PG_CHORDS)) ||
                                             (k == panel.btn[B_GLO] && (sl_page == PG_MIX || sl_page == PG_DRUMS)) || (k == panel.btn[B_HOME] && sl_page == PG_HOME) ||
                                             (k == panel.btn[B_ENV] && sl_page == PG_ENV) ||
                                             (k == panel.btn[B_REC] && (sl_loop_state == SL_LOOP_PLAY ? !sl_loop_dub || ((fm1_ms >> 7) & 1u) :
                                                                        sl_loop_state != SL_LOOP_OFF && ((fm1_ms >> 8) & 1u))));
    /* (REC: blinks for the count-in and the take, quick while overdubbing, steady while the loop plays) */
    /* the camera sways slowly round the box, as the web's tumbling tank does */
    {   /* (each angle kept within a turn: a sine of a big one takes libm's slow reduction, minutes in) */
        float a = t * 0.31f, b = t * 0.23f + 1.0f;
        a -= 6.2831853f * floorf(a / 6.2831853f); b -= 6.2831853f * floorf(b / 6.2831853f);
        st_tumble(0.5f * sinf(a), 0.3f + 0.2f * sinf(b), M);
    }
    sl_prof.poll += fm1_ticks() - tk; tk = fm1_ticks();
    {
        /* the walls' colour wheel turns with the key (the key journey shows), and the slime takes the colour of the chord
         * the band is on: its root wall's hue, deeper, so it reads as colour, not a grey mass ("not colorblind": Flah) */
        float hue0 = (float)(sl_root % 12) / 12.0f;
        int td = sl_tank.s.scale ? sl_tank.s.scale->n * sl_tank.s.octs : 7;
        st_view_prepare(v, &sl_tank, M, hue0, 0);
        v->goo = sl_hsv565(hue0 + (td > 0 ? (float)sl_band.chord / (float)td : 0.0f), 0.62f, 0.86f);
        for (k = 0; k < (uint32_t)v->nb; k++) { v->r[k] *= 1.35f; v->sr[k] *= 1.3f; }   /* notes that read on 240 px */
    }
    sl_prof.prep += fm1_ticks() - tk; tk = fm1_ticks();
    {
        /* Only the tank's box changes; the page around it is one colour. Send the box, joined with last frame's box
         * (so what moved out of it is painted over), and nothing else: about half the pixels of a whole screen.
         * The top line (the label) and the bottom one (the knob names) are sent on their own, and only when what
         * they say changes, or the box reaches into them (2026-11-18: sent every frame they made the FX page a whole
         * screen a frame, 28 fps in fm1-emu STRICT). Each band sends its own columns. */
        static int32_t px0 = 0, py0 = 0, px1 = 239, py1 = 239;   /* last frame's box: the whole screen at first */
        static char lab_drawn[sizeof sl_label];
        static uint8_t foot_drawn = 0xFF;                       /* the page whose knob names are on screen (0xFF: none) */
        int32_t x0 = 239, x1 = 0, y0, y1, r, nb = 0, full = 0;
        uint8_t lab_need, foot_need, foot;
        uint32_t px = 0;
        for (k = 0; k < (uint32_t)v->n; k++) {
            float a = v->fx[k] < v->bx[k] ? v->fx[k] : v->bx[k], c = v->fx[k] > v->bx[k] ? v->fx[k] : v->bx[k];
            if (a < (float)x0) x0 = (int32_t)a;
            if (c > (float)x1) x1 = (int32_t)c;
        }
        x0 -= SL_MARGIN; x1 += SL_MARGIN;                        /* a ball or a lit rim can stand a little proud */
        y0 = (int32_t)v->pymin - SL_MARGIN; y1 = (int32_t)v->pymax + SL_MARGIN;
        if (v->n < 3 || splash || sl_bursting() || (sl_bn && fm1_ms - sl_burst_t0 < SL_BURST_MS + 100u)) { x0 = 0; x1 = 239; y0 = 0; y1 = 239; full = 1; }
        {
            int32_t ux0 = x0 < px0 ? x0 : px0, ux1 = x1 > px1 ? x1 : px1, uy0 = y0 < py0 ? y0 : py0, uy1 = y1 > py1 ? y1 : py1;
            px0 = x0; px1 = x1; py0 = y0; py1 = y1;
            x0 = clamp(ux0, 0, 239); x1 = clamp(ux1, 0, 239); y0 = clamp(uy0, 0, 239); y1 = clamp(uy1, 0, 239);
            x0 &= ~1; x1 |= 1;                                   /* even columns: the packing below moves two pixels a word */
        }
        {   /* the label: a page keeps its name up; stopped at home, "press play" */
            uint8_t on = !splash && ((int32_t)(sl_label_until - fm1_ms) > 0 || sl_page != PG_HOME || !sl_run);
            uint32_t q;
            if (on && (int32_t)(sl_label_until - fm1_ms) <= 0) sl_page_title();
            if (!on) sl_label[0] = 0;
            for (q = 0; q < sizeof sl_label && sl_label[q] == lab_drawn[q] && sl_label[q]; q++) {}
            lab_need = full || sl_label[q] != lab_drawn[q] || (on && y0 < 16);
            sl_label_shown = on;
            foot = sl_page != PG_HOME && !splash;
            foot_need = full || (foot ? foot_drawn != sl_page || y1 >= 224 : foot_drawn != 0xFF);
        }
        for (k = 0; k < 15u; k++) {
            int in_box = (int32_t)(k * 16u) <= y1 && (int32_t)(k * 16u + 15u) >= y0;
            int whole = (k == 0u && lab_need) || (k == 14u && foot_need);   /* this band all across */
            uint32_t ry0, ry1, rows, bx0 = (uint32_t)x0, bx1 = (uint32_t)x1, w;
            uint16_t *b;
            if (!in_box && !whole) continue;
            if (whole) { bx0 = 0; bx1 = 239; ry0 = 0; ry1 = 15; }
            else { ry0 = k * 16u < (uint32_t)y0 ? (uint32_t)y0 - k * 16u : 0u; ry1 = k * 16u + 15u > (uint32_t)y1 ? (uint32_t)y1 - k * 16u : 15u; }
            rows = ry1 - ry0 + 1u; w = bx1 - bx0 + 1u;
            b = sl_strip((uint32_t)nb++);                      /* (the other band may still be on its way to the panel) */
            if (((k == 0u && sl_label_shown) || (k == 14u && foot)) && b != cv_px) { lcd_sync(); b = cv_px; nb++; }   /* (cv_text draws into cv_px) */
            if (!splash || sp.alpha < 1.0f) st_draw_band(v, (int)(k * 16u), 16, b, BG, (int)bx0, (int)bx1);   /* (the splash alone covers it all) */
            if (splash) sl_splash_band(b, (int)(k * 16u), &sp);
            else if (sl_bursting()) sl_burst_band(b, (int)(k * 16u));
            if (k == 14u && foot) {                            /* the bottom row: the four knobs' names */
                uint32_t q;
                cv_w = 240; cv_h = 16; cv_oy = 0;
                for (q = 0; q < 4u; q++) {
                    const char *n = SL_FOOT[sl_page][q];
                    cv_text((int32_t)(30u + 60u * q) - text_w(&FONT_S, n) / 2, 0, &FONT_S, n, swap16(RGB(120, 104, 170)));
                }
                foot_drawn = sl_page;
            } else if (k == 14u && whole) foot_drawn = 0xFF;
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
                if (fps_last < fps_min) fps_min = fps_last;
                win_t = fm1_ms; win_f = sl_frames;
            }
            /* notes late (> 1 block, to 255) | the worst 5 s window's fps x10 | the last one's (2026-11-18: was the reform's ms) */
            sl_dbg[3] = (sl_stat.late > 255u ? 255u : sl_stat.late) | ((fps_min & 0xFFFu) << 8) | ((fps_last & 0xFFFu) << 20);
        }
    }
}

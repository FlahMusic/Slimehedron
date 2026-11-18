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

UI_SMALL static void slime_splash(void)
{
    lcd_fill(0, 0, 240, 240, RGB(246, 244, 255));
    cv_begin(240, 20, RGB(246, 244, 255));
    cv_text(120 - text_w(&FONT_S, "slimehedron") / 2, 0, &FONT_S, "slimehedron", RGB(120, 96, 190));
    cv_blit(0, 110);
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
enum { PG_HOME, PG_FX, PG_SOUND, PG_MIX };
static uint8_t sl_page, sl_fx_part;
static const char *const SL_FOOT[4][4] = {
    {"tempo", "spin", "rhythm", "key"}, {"filter", "drive", "echo", "space"},
    {"melody", "bass", "chords", "kit"}, {"melody", "bass", "chords", "drums"},
};
static void sl_page_say(void)
{
    if (sl_page == PG_FX) sl_say("fx: ", SL_PART_NAME[sl_fx_part]);
    else if (sl_page == PG_SOUND) sl_say("sound", 0);
    else if (sl_page == PG_MIX) sl_say("mix", 0);
    else sl_say("home", 0);
}
static void sl_page_title(void)              /* the page's name, held at the top while you are on it */
{
    const char *t = sl_page == PG_FX ? SL_PART_NAME[sl_fx_part] : sl_page == PG_SOUND ? "sound" : "mix";
    uint32_t i = 0, j = 0;
    const char *pre = sl_page == PG_FX ? "fx: " : "";
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
        sl_say_num("echo ", f->echo * 100 / 127, "%");
    } else if (knob == 3) {
        f->space = (uint8_t)clamp((int32_t)f->space + d, 0, 127);
        sl_say_num("space ", f->space * 100 / 127, "%");
    } else if (knob == 4) {                                /* SELECT: the character */
        f->ctype = (uint8_t)sl_wrap(f->ctype, d, (int32_t)SL_NCHAR);
        if (f->ctype && !f->camt) f->camt = 64;
        sl_say("character: ", SL_CHAR[f->ctype].name);
    } else if (knob == 5) {                                /* ALGORITHM: its amount */
        f->camt = (uint8_t)clamp((int32_t)f->camt + d, 0, 127);
        sl_say_num(f->ctype ? SL_CHAR[f->ctype].name : "character off ", f->ctype ? f->camt * 100 / 127 : 0, "%");
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

static void slime_poll(void)                /* often: nothing a hand does waits for a frame */
{
    uint32_t rel, pressed = fm1_input_edges(&rel), keys = fm1_input_note_edges();
    int32_t d;
#define SL_PRESSED(b) (pressed & (1u << panel.btn[b]))
    if (keys) {
        fm1_irq_off(); sl_key_req |= keys; fm1_irq_on();
    }
    /* ---- buttons: the same on every page ---- */
    if (SL_PRESSED(B_PLAY)) { sl_run = (uint8_t)!sl_run; sl_say(sl_run ? "play" : "stop", 0); }
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
    if (SL_PRESSED(B_EDIT)) { sl_page = sl_page == PG_SOUND ? PG_HOME : PG_SOUND; sl_page_say(); }
    if (SL_PRESSED(B_GLO)) { sl_page = sl_page == PG_MIX ? PG_HOME : PG_MIX; sl_page_say(); }
    if (SL_PRESSED(B_ARP)) { sl_auto = (uint8_t)!sl_auto; sl_say("auto-notes ", sl_auto ? "on" : "off"); }
    if (SL_PRESSED(B_LFO)) { sl_slime = (uint8_t)!sl_slime; sl_say("slime ", sl_slime ? "on" : "off"); }
    if (SL_PRESSED(B_SEQ)) {                               /* the band: drums, bass and chords together */
        uint8_t on = (uint8_t)!(sl_drums_on || sl_band_on);
        sl_drums_on = sl_band_on = on; sl_say("band ", on ? "on" : "off");
    }
    if (SL_PRESSED(B_SCL)) { sl_scale_req = (uint8_t)sl_wrap(sl_scale, 1, (int32_t)SL_NSCALE); sl_say("scale: ", sl_scale_word(sl_scale_req)); }
    if (SL_PRESSED(B_OCTDN) || SL_PRESSED(B_OCTUP)) {      /* the keyboard's octave, as on any synth */
        sl_octave = (int8_t)clamp(sl_octave + (SL_PRESSED(B_OCTUP) ? 1 : -1), -2, 2);
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
        if ((d = panel_enc(EN_ALGO)) != 0) { sl_space = (uint8_t)(d > 0); sl_reform_req = 1; sl_say(sl_space ? "portals" : "normal space", 0); }
        if ((d = panel_enc(EN_PRESET)) != 0) {
            uint32_t i = (uint32_t)sl_wrap(sl_snd_of[SL_P_MEL], d, (int32_t)SL_NMEL);
            sl_snd_req[SL_P_MEL] = (uint8_t)i; sl_say("melody: ", SL_MEL_SND[i].name);
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
                sl_snd_req[p] = (uint8_t)i; sl_say(p == 0 ? "melody: " : p == 1 ? "bass: " : "chords: ", sl_snd_entry((uint32_t)p, i)->name);
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
            sl_say("sounds: ", SL_SETS[set].name);
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
            sl_say("echo time ", T[song.g[G_DTIME]]);
        }
        if ((d = panel_enc(EN_PRESET)) != 0) {             /* the room: small .. a hall */
            song.g[G_RSIZE] = (int16_t)clamp(song.g[G_RSIZE] + accel(EN_PRESET, d, 32) * 4, 0, 127);
            sl_say_num("room size ", song.g[G_RSIZE] * 100 / 127, "%");
        }
    }
#undef SL_PRESSED
    fm6_poll();                             /* FM6: a part's patch loads when its preset asks (SLOOP calls this from its own
                                             * ui_input, which this firmware does not run: without it no FM patch ever loaded) */
    slime_conduct();                        /* the music, ahead of the audio clock (slime.c) */
}

static void slime_ui(void)
{
    static const uint16_t BG = 0xF7BF;      /* the page's pale lilac */
    st_view *v = sl_view();
    float M[9], t = (float)fm1_ms * 0.001f;
    uint32_t k, i, t0 = fm1_ms;
    slime_poll();
    for (k = 0; k < 27u; k++) fm1_led_key(14u + k, (int32_t)(sl_lit_until[k] - fm1_ms) > 0);
    for (k = 0; k < 14u; k++) fm1_led_key(k, (k == panel.btn[B_PLAY] && sl_run) || (k == panel.btn[B_ARP] && sl_auto) ||
                                             (k == panel.btn[B_LFO] && sl_slime) || (k == panel.btn[B_SEQ] && (sl_drums_on || sl_band_on)) ||
                                             (k == panel.btn[B_FX] && sl_page == PG_FX) || (k == panel.btn[B_EDIT] && sl_page == PG_SOUND) ||
                                             (k == panel.btn[B_GLO] && sl_page == PG_MIX) || (k == panel.btn[B_HOME] && sl_page == PG_HOME));
    /* the camera sways slowly round the box, as the web's tumbling tank does */
    st_tumble(0.5f * sinf(t * 0.31f), 0.3f + 0.2f * sinf(t * 0.23f + 1.0f), M);
    {
        /* the walls' colour wheel turns with the key (the key journey shows), and the slime takes the colour of the chord
         * the band is on: its root wall's hue, deeper, so it reads as colour, not a grey mass ("not colorblind": Flah) */
        float hue0 = (float)(sl_root % 12) / 12.0f;
        int td = sl_tank.s.scale ? sl_tank.s.scale->n * sl_tank.s.octs : 7;
        st_view_prepare(v, &sl_tank, M, hue0, 0);
        v->goo = sl_hsv565(hue0 + (td > 0 ? (float)sl_band.chord / (float)td : 0.0f), 0.62f, 0.86f);
        for (k = 0; k < (uint32_t)v->nb; k++) { v->r[k] *= 1.35f; v->sr[k] *= 1.3f; }   /* notes that read on 240 px */
    }
    {
        /* Only the tank's box changes; the page around it is one colour. Send the box, joined with last frame's box
         * (so what moved out of it is painted over), and nothing else: about half the pixels of a whole screen.
         * The panel's SPI is the limit at this frame rate (fm1-emu STRICT: on the wire ~40% of the time). */
        static int32_t px0 = 0, py0 = 0, px1 = 239, py1 = 239;   /* last frame's box: the whole screen at first */
        int32_t x0 = 239, x1 = 0, y0, y1, w, r, nb = 0;
        for (k = 0; k < (uint32_t)v->n; k++) {
            float a = v->fx[k] < v->bx[k] ? v->fx[k] : v->bx[k], c = v->fx[k] > v->bx[k] ? v->fx[k] : v->bx[k];
            if (a < (float)x0) x0 = (int32_t)a;
            if (c > (float)x1) x1 = (int32_t)c;
        }
        x0 -= SL_MARGIN; x1 += SL_MARGIN;                        /* a ball or a lit rim can stand a little proud */
        y0 = (int32_t)v->pymin - SL_MARGIN; y1 = (int32_t)v->pymax + SL_MARGIN;
        if (v->n < 3 || sl_bursting() || (sl_bn && fm1_ms - sl_burst_t0 < SL_BURST_MS + 100u)) { x0 = 0; x1 = 239; y0 = 0; y1 = 239; }
        {   /* the label's rows join the box while it shows, and once more after, to paint it away */
            uint8_t on = (int32_t)(sl_label_until - fm1_ms) > 0 || sl_page != PG_HOME;   /* a page keeps its name up */
            static uint8_t foot_shown;
            uint8_t foot = sl_page != PG_HOME;
            if (on && (int32_t)(sl_label_until - fm1_ms) <= 0) sl_page_title();
            if (on || sl_label_shown) { y0 = 0; x0 = 0; x1 = 239; }
            if (foot || foot_shown) { y1 = 239; x0 = 0; x1 = 239; }
            sl_label_shown = on; foot_shown = foot;
        }
        {
            int32_t ux0 = x0 < px0 ? x0 : px0, ux1 = x1 > px1 ? x1 : px1, uy0 = y0 < py0 ? y0 : py0, uy1 = y1 > py1 ? y1 : py1;
            px0 = x0; px1 = x1; py0 = y0; py1 = y1;
            x0 = clamp(ux0, 0, 239); x1 = clamp(ux1, 0, 239); y0 = clamp(uy0, 0, 239); y1 = clamp(uy1, 0, 239);
        }
        w = x1 - x0 + 1;
        for (k = (uint32_t)y0 / 16u; k * 16u <= (uint32_t)y1; k++) {
            uint16_t *b = sl_strip((uint32_t)nb++);   /* (the other band may still be on its way to the panel) */
            uint32_t ry0 = k * 16u < (uint32_t)y0 ? (uint32_t)y0 - k * 16u : 0u, ry1 = k * 16u + 15u > (uint32_t)y1 ? (uint32_t)y1 - k * 16u : 15u;
            uint32_t rows = ry1 - ry0 + 1u;
            st_draw_band(v, (int)(k * 16u), 16, b, BG);
            if (sl_bursting()) sl_burst_band(b, (int)(k * 16u));
            if (k == 14u && sl_page != PG_HOME) {             /* the bottom row: the four knobs' names (cv_text needs cv_px) */
                uint32_t q;
                if (b != cv_px) { lcd_sync(); b = cv_px; st_draw_band(v, (int)(k * 16u), 16, b, BG); if (sl_bursting()) sl_burst_band(b, (int)(k * 16u)); nb++; }
                cv_w = 240; cv_h = 16; cv_oy = 0;
                for (q = 0; q < 4u; q++) {
                    const char *n = SL_FOOT[sl_page][q];
                    cv_text((int32_t)(30u + 60u * q) - text_w(&FONT_S, n) / 2, 0, &FONT_S, n, swap16(RGB(120, 104, 170)));
                }
            }
            if (k == 0u && sl_label_shown && b == cv_px) {   /* SLOOP's font into this band (cv_text draws into cv_px) */
                cv_w = 240; cv_h = 16; cv_oy = 0;
                cv_text(120 - text_w(&FONT_S, sl_label) / 2, 0, &FONT_S, sl_label, swap16(RGB(90, 72, 150)));   /* (the band is
                                                   * swapped to the panel's order below; cv_text writes swapped already) */
            }
            for (r = 0; r < (int32_t)rows; r++) {             /* the box's columns, packed (the panel takes one window) */
                const uint16_t *s = b + (ry0 + (uint32_t)r) * 240u + (uint32_t)x0;
                uint16_t *d = b + (uint32_t)r * (uint32_t)w;
                for (i = 0; i < (uint32_t)w; i++) d[i] = (uint16_t)((s[i] >> 8) | (s[i] << 8));   /* big-endian */
            }
            lcd_blit((uint32_t)x0, k * 16u + ry0, (uint32_t)w, rows, b);
            slime_poll();
        }
        sl_px = (uint32_t)(w * (y1 - y0 + 1));
    }
    lcd_sync();
    sl_frames++;
    sl_frame_ms = fm1_ms - t0;
    {   /* packed for fm1-emu's 4-word dump: frames | worst frame ms; audio worst half us | deadlines missed;
         * the tank tick's worst us | its mean us; the goo's drops at the worst tick */
        static uint32_t worst;
        if (sl_frames > 30u && sl_frame_ms > worst) worst = sl_frame_ms;
        sl_dbg[0] = (sl_frames & 0xFFFFu) | (worst << 16);
        sl_dbg[1] = (audio_max_us & 0xFFFFu) | (felucca_dbg.late << 16);
        sl_dbg[2] = (sl_tick_us_max & 0xFFFFu) | ((sl_tick_n ? sl_tick_us_sum / sl_tick_n : 0u) << 16);
        sl_dbg[3] = (sl_stat.late & 0xFFFFu) | ((sl_reform_us_max / 1000u) << 16);   /* notes late (> 1 block) | the slowest reform, ms */
    }
}

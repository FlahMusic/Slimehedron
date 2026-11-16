/* SPDX-License-Identifier: GPL-3.0-only */
/* Slimehedron for the FM-1: the screen and the panel. Replaces SLOOP's groovebox UI in the main loop (patch_sloop.py:
 * ui_input / ui_leds / ui_draw are no longer called). The screen is the tank and nothing else: drawn 2.5D by
 * fm1/core/drawtank.c in 16-row bands, each band sent while the next is painted.
 *
 * Panel (brief section 5, first cut):
 *   keys      their note in the tank's scale, now, and a ball into the tank
 *   PLAY      the tank runs / stands still
 *   SELECT    the shape: 3..12 walls            ALGORITHM  space: normal / portal
 *   PRESETS   the melody's sound (SL_SOUND)     KNOB 1     tempo        KNOB 2  spin
 *   HOME      a new shape now
 *   MASTER    volume (SLOOP's main loop, unchanged)
 * LEDs: PLAY while running; a key glows when a wall near its note rings.
 * The main loop never writes the tank: it leaves requests (slime.c) for the audio interrupt, which owns it. It READS
 * the tank while the interrupt may be moving it, so a frame can show a ball a tick ahead of a wall: seen, never stored. */
#include "drawtank.h"
float sinf(float);                          /* the toolchain's libm (SLOOP itself links none) */

#define SL_BAND_PX (240u * 16u)
_Static_assert(sizeof(st_view) + 2u * SL_BAND_PX * 2u + 8u <= sizeof cv_px, "the view and two bands live in SLOOP's canvas");
static uint32_t sl_frames;
static volatile uint32_t sl_frame_ms;       /* how long the last frame took (for fm1-emu's memory dump) */
static volatile uint32_t sl_px;             /* pixels sent in the last frame (a whole screen is 57,600) */
#define SL_MARGIN 8

static uint16_t *sl_band(uint32_t k) { return cv_px + (k & 1u) * SL_BAND_PX; }
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

static void slime_poll(void)                /* often: nothing a hand does waits for a frame */
{
    uint32_t rel, pressed = fm1_input_edges(&rel), keys = fm1_input_note_edges();
    int32_t d;
    if (keys) {
        fm1_irq_off(); sl_key_req |= keys; fm1_irq_on();
    }
    if (pressed & (1u << panel.btn[B_PLAY])) sl_run = (uint8_t)!sl_run;
    if (pressed & (1u << panel.btn[B_HOME])) sl_reform_req = 1;
    if ((d = panel_enc(EN_K1)) != 0) song.g[G_BPM] = (int16_t)clamp(song.g[G_BPM] + d, 40, 200);
    if ((d = panel_enc(EN_K2)) != 0) sl_spin = (int8_t)clamp(sl_spin + d * 4, -100, 100);
    if ((d = panel_enc(EN_SELECT)) != 0) { sl_walls = (uint8_t)clamp((int32_t)sl_walls + d, 3, 12); sl_reform_req = 1; }
    if ((d = panel_enc(EN_ALGO)) != 0) { sl_space = (uint8_t)(d > 0); sl_reform_req = 1; }
    if ((d = panel_enc(EN_PRESET)) != 0) sl_sound_req = (uint8_t)(((int32_t)sl_sound + d % (int32_t)SL_NSOUND + (int32_t)SL_NSOUND) % (int32_t)SL_NSOUND);
    panel_enc(EN_K3); panel_enc(EN_K4);     /* (not used yet: their turns are not kept for later) */
}

static void slime_ui(void)
{
    static const uint16_t BG = 0xF7BF;      /* the page's pale lilac */
    st_view *v = sl_view();
    float M[9], t = (float)fm1_ms * 0.001f;
    uint32_t k, i, t0 = fm1_ms;
    slime_poll();
    for (k = 0; k < 27u; k++) fm1_led_key(14u + k, (int32_t)(sl_lit_until[k] - fm1_ms) > 0);
    for (k = 0; k < 14u; k++) fm1_led_key(k, k == panel.btn[B_PLAY] && sl_run);
    /* the camera sways slowly round the box, as the web's tumbling tank does */
    st_tumble(0.5f * sinf(t * 0.31f), 0.3f + 0.2f * sinf(t * 0.23f + 1.0f), M);
    st_view_prepare(v, &sl_tank, M, 0.0f, 0);
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
        if (v->n < 3) { x0 = 0; x1 = 239; y0 = 0; y1 = 239; }
        {
            int32_t ux0 = x0 < px0 ? x0 : px0, ux1 = x1 > px1 ? x1 : px1, uy0 = y0 < py0 ? y0 : py0, uy1 = y1 > py1 ? y1 : py1;
            px0 = x0; px1 = x1; py0 = y0; py1 = y1;
            x0 = clamp(ux0, 0, 239); x1 = clamp(ux1, 0, 239); y0 = clamp(uy0, 0, 239); y1 = clamp(uy1, 0, 239);
        }
        w = x1 - x0 + 1;
        for (k = (uint32_t)y0 / 16u; k * 16u <= (uint32_t)y1; k++) {
            uint16_t *b = sl_band((uint32_t)nb++);   /* (the other band may still be on its way to the panel) */
            uint32_t ry0 = k * 16u < (uint32_t)y0 ? (uint32_t)y0 - k * 16u : 0u, ry1 = k * 16u + 15u > (uint32_t)y1 ? (uint32_t)y1 - k * 16u : 15u;
            uint32_t rows = ry1 - ry0 + 1u;
            st_draw_band(v, (int)(k * 16u), 16, b, BG);
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
}

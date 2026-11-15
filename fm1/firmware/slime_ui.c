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
    for (k = 0; k < 15u; k++) {
        uint16_t *b = sl_band(k);           /* (the other band may still be on its way to the panel) */
        st_draw_band(v, (int)(k * 16u), 16, b, BG);
        for (i = 0; i < SL_BAND_PX; i++) b[i] = (uint16_t)((b[i] >> 8) | (b[i] << 8));   /* the panel reads big-endian */
        lcd_blit(0, k * 16u, 240, 16, b);
        slime_poll();
    }
    lcd_sync();
    sl_frames++;
    sl_frame_ms = fm1_ms - t0;
}

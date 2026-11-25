/* THE MINIS ANSWER, AND THE CAST CELEBRATES A BURST (2026-11-23, Flah: "the personality and the general intuitiveness
 * and polish"; children tap whatever looks alive and are let down when nothing happens, NN/g, _docs/research/
 * 2026-11-23-personality-polish.md). Pure: slime_ui.c draws with it, host/minitest.c checks it.
 *   - on the beat they hop in turn (Flah 2026-11-25: "have them all alternate jumping on the down beat and back beat ...
 *     more animation subtlely"): every other mini on beats 1 and 3, the rest on 2 and 4, 300 ms, 4 px (the caller
 *     hands each its own beat's start). Was: the bar's 1, a ripple 26 ms apart, 440 ms, 5 px
 *   - a key a hand plays makes ONE mini hop at once, 320 ms, 6 px: the one on its side of the screen, low notes left,
 *     high notes right, by the note's place in its octave (a scale run walks across them)
 *   - a burst (a full tank, a real one: 8 flying drops or more, not the first empty shape) is a party for 3 s: two big
 *     hops each, 60 ms apart (9 px, then 7), and the worm comes up to dance in double time (the site: slimeParty)
 * A hop is the highest of the three. Times are ms (fm1_ms); a start time of 0 means "never". */
#ifndef SLIME_MINIS_H
#define SLIME_MINIS_H
#include <stdint.h>   /* (no math.h: the device's toolchain has none; sinf comes from the firmware, as slime_ui.c uses it) */

#define SL_PARTY_MS 3000u
#define SL_PARTY_MIN_DROPS 8

static int sl_party_on(uint32_t now, uint32_t burst_t0, int drops)
{
    return burst_t0 && drops >= SL_PARTY_MIN_DROPS && (uint32_t)(now - burst_t0) < SL_PARTY_MS;
}

/* which mini answers a hand's note: the one nearest the note's place across the screen (x 16..224 over an octave);
 * a near tie (within 12 px) goes to the one the last note did not take, so two neighbours share a run */
static int sl_mini_for_note(double cents, const int16_t at[][2], int n, int last)
{
    int c = (int)(cents < 0.0 ? cents - 0.5 : cents + 0.5), f = ((c % 1200) + 1200) % 1200;
    int want = 16 + f * 208 / 1200, bd = 1 << 30, i, best = 0;
#define SL_ABS(v) ((v) < 0 ? -(v) : (v))
    for (i = 0; i < n; i++) { int d = SL_ABS(at[i][0] - want); if (d < bd) { bd = d; best = i; } }   /* the nearest */
    if (best == last)                                                  /* it took the last note: a near neighbour takes this one */
        for (i = 0; i < n; i++) if (i != best && SL_ABS(at[i][0] - want) < bd + 12) return i;
#undef SL_ABS
    return best;
}

static int sl_hop_arc(int32_t t, int32_t len, float px)
{
    return (t >= 0 && t < len) ? (int)(px * sinf((float)t * (3.14159265f / (float)len)) + 0.5f) : 0;
}

/* mini i's hop now (px up): beat_t0 its own beat's start (the downbeat's or the backbeat's) */
static int sl_mini_hop_px(uint32_t now, int i, uint32_t beat_t0, uint32_t hand_t0, uint32_t burst_t0, int drops)
{
    int h = 0, k;
    if (beat_t0) { k = sl_hop_arc((int32_t)(now - beat_t0), 300, 4.0f); if (k > h) h = k; }
    if (hand_t0) { k = sl_hop_arc((int32_t)(now - hand_t0), 320, 6.0f); if (k > h) h = k; }
    if (sl_party_on(now, burst_t0, drops)) {
        int32_t t = (int32_t)(now - burst_t0) - i * 60;
        k = sl_hop_arc(t, 560, 9.0f); if (k > h) h = k;
        k = sl_hop_arc(t - 700, 560, 7.0f); if (k > h) h = k;
    }
    return h;
}
#endif

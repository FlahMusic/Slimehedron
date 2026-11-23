/* Host test: the minis answer a hand, and the cast celebrates a burst (firmware/slime_minis.h, which slime_ui.c draws
 * with). The FM-1's own minis (SL_MINI_AT in slime_ui.c, copied here: the check fails if they drift apart, see MINI_AT).
 *   1. a hand's note makes the mini on its side hop: the root (0 cents) a left one, a fifth (700) the middle one, a
 *      seventh (1100) the right one; a run up the scale reaches at least 4 of the 5 minis
 *   2. a hand's hop is up at once (>= 4 px 80 ms after the note, 6 at its top) and gone by 320 ms
 *   3. a burst with drops is a party: every mini hops at least 8 px within the first 0.9 s and again (>= 6 px) after
 *      0.7 s; the party lasts 3 s; an "empty" reform (fewer than 8 drops: the first shape) is no party
 *   4. the bar's 1 still ripples (5 px, 26 ms apart), and nothing hops when nothing happened
 *   minitest            prints PASS / FAIL, exit 1 on a failure (sabotage: -DSAB_PITCH, -DSAB_PARTY) */
#include <stdio.h>
#include <string.h>
#include <math.h>
#include "../firmware/slime_minis.h"
static const int16_t MINI_AT[5][2] = {{20, 38}, {220, 42}, {18, 214}, {52, 228}, {150, 230}};
static int fails;
static void ok(int c, const char *m) { printf("%s%s\n", c ? "  PASS  " : "  FAIL  ", m); fails += !c; }
int main(void)
{
    char m[256];
    int last = -1, a0 = sl_mini_for_note(0, MINI_AT, 5, last), a7 = sl_mini_for_note(700, MINI_AT, 5, -1), a11 = sl_mini_for_note(1100, MINI_AT, 5, -1);
#ifdef SAB_PITCH
    a0 = a7 = a11 = 0;
#endif
    snprintf(m, sizeof m, "1. the root takes a left mini (x %d), the fifth the middle (x %d), the seventh a right one (x %d)", MINI_AT[a0][0], MINI_AT[a7][0], MINI_AT[a11][0]);
    ok(MINI_AT[a0][0] < 60 && MINI_AT[a7][0] > 100 && MINI_AT[a7][0] < 200 && MINI_AT[a11][0] > 200, m);
    {   static const int MAJOR[] = {0, 200, 400, 500, 700, 900, 1100, 1200};
        int seen[5] = {0}, n = 0, i;
        for (i = 0; i < 8; i++) { int k = sl_mini_for_note(MAJOR[i], MINI_AT, 5, last); last = k; seen[k] = 1; }
#ifdef SAB_PITCH
        memset(seen, 0, sizeof seen); seen[0] = 1;
#endif
        for (i = 0; i < 5; i++) n += seen[i];
        snprintf(m, sizeof m, "   a run up the scale walks across them (%d of 5 minis)", n); ok(n >= 4, m); }
    {   uint32_t t0 = 10000; int h80 = sl_mini_hop_px(t0 + 80, 2, 0, t0, 0, 0), top = 0, after = sl_mini_hop_px(t0 + 330, 2, 0, t0, 0, 0), t;
        for (t = 0; t < 320; t += 5) { int h = sl_mini_hop_px(t0 + t, 2, 0, t0, 0, 0); if (h > top) top = h; }
        snprintf(m, sizeof m, "2. a hand's hop is up at once (%d px at 80 ms, %d at its top) and gone by 330 ms (%d)", h80, top, after);
        ok(h80 >= 4 && top == 6 && after == 0, m); }
    {   uint32_t b = 20000; int i, lo1 = 99, lo2 = 99, empty = 0, late = 0;
        int drops = 40;
#ifdef SAB_PARTY
        drops = 0;
#endif
        for (i = 0; i < 5; i++) { int t, h1 = 0, h2 = 0;
            for (t = 0; t < 900; t += 5) { int h = sl_mini_hop_px(b + t, i, 0, 0, b, drops); if (h > h1) h1 = h; }
            for (t = 700 + i * 60; t < 1600; t += 5) { int h = sl_mini_hop_px(b + t, i, 0, 0, b, drops); if (h > h2) h2 = h; }
            if (h1 < lo1) lo1 = h1;
            if (h2 < lo2) lo2 = h2;
            { int t2; for (t2 = 0; t2 < 1500; t2 += 5) { int h = sl_mini_hop_px(b + t2, i, 0, 0, b, 3); if (h > empty) empty = h; } } }
        late = sl_party_on(b + 3100, b, drops) || !sl_party_on(b + 2900, b, drops);
        snprintf(m, sizeof m, "3. a burst is a party: every mini hops %d px+ in 0.9 s and %d px+ again; on 2.9 s, off 3.1 s (%s); an empty reform hops %d", lo1, lo2, late ? "no" : "yes", empty);
        ok(lo1 >= 8 && lo2 >= 6 && !late && empty == 0, m); }
    {   uint32_t t0 = 30000; int h0 = 0, h4 = 0, t, quiet = 0;
        for (t = 0; t < 440; t += 2) { int a = sl_mini_hop_px(t0 + t, 0, t0, 0, 0, 0), c = sl_mini_hop_px(t0 + t, 4, t0, 0, 0, 0); if (a > h0) h0 = a; if (c > h4) h4 = c; }
        for (t = 0; t < 5000; t += 7) { int i; for (i = 0; i < 5; i++) quiet |= sl_mini_hop_px(60000 + t, i, 0, 0, 0, 0); }
        snprintf(m, sizeof m, "4. the bar's 1 still ripples (%d px, the last one %d px, 104 ms behind) and nothing hops by itself (%d)", h0, h4, quiet);
        ok(h0 == 5 && h4 == 5 && sl_mini_hop_px(t0 + 104, 4, t0, 0, 0, 0) == 0 && quiet == 0, m); }
    printf(fails ? "%d FAILURE(S)\n" : "the minis answer and the cast celebrates\n", fails);
    return fails ? 1 : 0;
}

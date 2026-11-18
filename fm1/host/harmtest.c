/* Host test of the band's other harmony owners and a person's drum pattern (fm1/core/band.c, 2026-11-18):
 *   1  a hand's notes name a chord (the site's manualRoot): F A C -> IV, D F A -> ii, one note -> that note's degree
 *   2  a hand playing holds ITS chord: every bar's chord is the hand's, the chords' notes are that chord's, the key never
 *      moves while it plays; the hand gone, the auto chords come back
 *   3  a progression entered (the site's CHORD_MODE, its FAMOUS ii-V-I in C): bar by bar D m7, G 7, C maj7, C maj7, the
 *      chords' notes exactly those chords' tones, the bass on their roots, thirds and fifths (or a half step under the
 *      next root), and it loops; a progression owns the harmony over a hand
 *   4  in a minor key the dice recolour the tonic and the IV minor (cmRandomProg)
 *   5  a person's drum pattern: exactly its hits, every bar, no fills, no ghost notes
 * Prints PASS / FAIL; exit 1 on a fail.   harmtest */
#include <stdio.h>
#include <math.h>
#include "../core/band.h"

static int fails = 0;
static void ok(int c, const char *m) { printf("  %s  %s\n", c ? "PASS" : "FAIL", m); if (!c) fails++; }
static int pc(double cents) { return ((int)lround(cents / 100.0) % 12 + 12) % 12; }

int main(void) {
  static sh_band B; static sh_band_bar O; char m[300];
  const sh_scale *maj = sh_scale_by_id("major"), *minr = sh_scale_by_id("minor");
  /* 1 */
  { uint8_t iv[3] = {5, 9, 0}, ii[3] = {2, 5, 9}, one[2] = {7, 7};
    int a = sh_band_hand_root(maj, iv, 3), b = sh_band_hand_root(maj, ii, 3), c = sh_band_hand_root(maj, one, 2);
    snprintf(m, sizeof m, "1  F A C names IV (%d), D F A names ii (%d), G G names V (%d)", a, b, c); ok(a == 3 && b == 1 && c == 4, m); }
  /* 2 */
  { sh_band_init(&B, 0, 99u); B.journey = 4; int held = 1, tones = 1, moved = 0, back = 0;
    for (int bar = 0; bar < 12; bar++) {
      B.hand_deg = 3; sh_band_next_bar(&B, maj, &O);
      if (O.chord != 3) held = 0;
      if (O.key_moved) moved = 1;
      { int hasF = 0, hasD = 0; for (int i = 0; i < O.nc; i++) { int p = pc(O.comp[i].cents); if (p == 5) hasF = 1; if (p == 2 && !(bar % 4 == 3 && i == O.nc - 1)) hasD = 1; }
        if (O.nc && (!hasF || hasD)) tones = 0; }
    }
    B.hand_deg = -1; for (int bar = 0; bar < 8; bar++) { sh_band_next_bar(&B, maj, &O); if (O.chord != 3) back = 1; }
    ok(held, "2  a hand on IV: every bar's chord is IV (12 bars)");
    ok(tones, "   and the chords are built on F (every bar has F; none has ii's D)");
    ok(!moved, "   the key journey waits while a hand plays");
    ok(back, "   the hand gone, the auto chords move on again"); }
  /* 3 */
  { sh_band_init(&B, 0, 7u); sh_band_cm_famous(&B, 0, 0, 1);
    static const int ROOT[4] = {2, 7, 0, 0}; static const int TONES[4][4] = {{2, 5, 9, 0}, {7, 11, 2, 5}, {0, 4, 7, 11}, {0, 4, 7, 11}};
    int roots = 1, exact = 1, bassok = 1, loops = 1, seen[4][4] = {{0}};
    for (int bar = 0; bar < 12; bar++) {
      B.hand_deg = 5;                                    /* a hand jamming: the progression still owns the harmony */
      sh_band_next_bar(&B, maj, &O);
      int i = bar % 4;
      if (B.cm_cur != i) roots = 0;
      if (bar >= 4 && B.cm_cur != (bar % 4)) loops = 0;
      for (int k = 0; k < O.nc; k++) { int p = pc(O.comp[k].cents), in = 0;
        for (int t = 0; t < 4; t++) if (p == TONES[i][t]) { in = 1; seen[i][t] = 1; }
        if (!in && p != ROOT[(i + 1) % 4]) exact = 0; }   /* (the push and bar 4's last note: the next root, early) */
      for (int k = 0; k < O.nb; k++) { int p = pc(O.bass[k].cents), nxt = ROOT[(i + 1) % 4];
        if (p != TONES[i][0] && p != TONES[i][1] && p != TONES[i][2] && p != (nxt + 11) % 12) bassok = 0; }
    }
    for (int i = 0; i < 4; i++) for (int t = 0; t < 4; t++) if (!seen[i][t]) exact = 0;
    ok(roots, "3  ii-V-I in C, a chord a bar: Dm7 G7 Cmaj7 Cmaj7, in that order (a hand playing over it)");
    ok(exact, "   the chords play only those tones (or the next root, pushed early), and every tone of each turns up");
    ok(bassok, "   the bass on each chord's root, third or fifth, or a half step under the next root");
    ok(loops, "   and it loops"); }
  /* 4 */
  { sh_band_init(&B, 0, 7u); sh_band_cm_famous(&B, 1, 1, 1);   /* I-vi-ii-V, Imaj7 first */
    snprintf(m, sizeof m, "4  in a minor key the dice make the tonic minor (I maj7 -> %s)", SH_CQ_NAME[B.cm_qual[0]]);
    ok(B.cm_qual[0] == 4, m);
    sh_band_cm_famous(&B, 1, 0, 1); ok(B.cm_qual[0] == 3, "   in a major key it stays maj7");
    ok(sh_band_cq_for(maj, 2) == 1 && sh_band_cq_for(maj, 11) == 5 && sh_band_cq_for(minr, 3) == 0, "   a new chord takes its scale's own quality: D in C minor-ish (m), B dim, Eb in C minor major"); }
  /* 5 */
  { sh_band_init(&B, 1, 3u); B.pat_on = 1; for (int L = 0; L < SH_PLANES; L++) B.pat[L] = 0;
    B.pat[0] = 0x0101; B.pat[1] = 0x1010; B.pat[2] = 0x5555;   /* kick 1 and 3, snare 2 and 4, hats on the 8ths */
    int exact = 1, fill = 0, total = 0;
    for (int bar = 0; bar < 16; bar++) {
      sh_band_next_bar(&B, maj, &O); if (O.fill) fill = 1;
      uint16_t got[3] = {0, 0, 0};
      for (int i = 0; i < O.nd; i++) { int n = O.drum[i].note; total++;
        if (n == 36) got[0] |= 1u << O.drum[i].step; else if (n == 38) got[1] |= 1u << O.drum[i].step; else if (n == 42) got[2] |= 1u << O.drum[i].step; else exact = 0;
        if (O.drum[i].kind != 0) exact = 0; }
      if (got[0] != 0x0101 || got[1] != 0x1010 || got[2] != 0x5555) exact = 0;
    }
    snprintf(m, sizeof m, "5  a pattern of kick 1 & 3, snare 2 & 4, 8th hats: exactly those %d hits over 16 bars, nothing else", total); ok(exact && total == 16 * 12, m);
    ok(!fill, "   no fills"); }
  printf(fails ? "%d failed\n" : "the band follows a hand, a progression and a pattern\n", fails);
  return fails ? 1 : 0;
}

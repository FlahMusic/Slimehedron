/* fm1/host/check-band.js runs this and the web's own band code (index.html) and compares them line for line:
 *   D kit bar step note   every drum hit of the bar (the pattern, the fill window, genFill)
 *   B kit block tokens    genBass's figure for a 16-bar block
 *   C kit bar mask        genComp's chord rhythm with bandPlan's seed, dodging the block's bass figure
 * plus, for every kit over 64 bars of major, 31-EDO and pentatonic: no chord or bass note outside the scale. */
#include <stdio.h>
#include <math.h>
#include "../core/band.h"
uint32_t sh_band_test_comp(int kit, uint32_t salt, uint32_t bar, uint32_t avoid);
void sh_band_test_bass(int kit, uint32_t salt, uint32_t block, uint8_t *tok);
static int in_scale(const sh_scale *sc, double c) {
  double m = fmod(fmod(c, 1200.0) + 1200.0, 1200.0);
  for (int i = 0; i < sc->n; i++) { double d = fabs(m - sc->cents[i]); if (d < 0.01 || fabs(d - 1200.0) < 0.01) return 1; }
  return 0;
}
int main(void) {
  const uint32_t SALT = 123456789u;
  static sh_band B; static sh_band_bar O;
  for (int k = 0; k < sh_band_nkits(); k++) {
    sh_band_init(&B, k, SALT);
    for (uint32_t bar = 0; bar < 64; bar++) {
      sh_band_next_bar(&B, sh_scale_by_id("major"), &O);
      for (int i = 0; i < O.nd; i++) printf("D %d %u %d %d\n", k, bar, O.drum[i].step, O.drum[i].note);
    }
    for (uint32_t blk = 0; blk < 4; blk++) {
      uint8_t tok[16]; uint32_t avoid = 0;
      sh_band_test_bass(k, SALT, blk, tok);
      printf("B %d %u ", k, blk);
      for (int i = 0; i < 16; i++) { putchar(tok[i] ? tok[i] : '.'); if (tok[i]) avoid |= 1u << i; }
      putchar('\n');
      for (uint32_t bar = blk * 16; bar < blk * 16 + 16; bar++) printf("C %d %u %u\n", k, bar, sh_band_test_comp(k, SALT, bar, avoid));
    }
  }
  const char *scs[3] = {"major", "edo31", "pentaMaj"};
  int bad = 0, notes = 0;
  for (int si = 0; si < 3; si++) for (int k = 0; k < sh_band_nkits(); k++) {
    const sh_scale *sc = sh_scale_by_id(scs[si]);
    sh_band_init(&B, k, SALT + (uint32_t)k);
    for (int bar = 0; bar < 64; bar++) {
      sh_band_next_bar(&B, sc, &O);
      for (int i = 0; i < O.nc; i++) { notes++; if (!in_scale(sc, O.comp[i].cents)) bad++; }
      for (int i = 0; i < O.nb; i++) { notes++; if (!in_scale(sc, O.bass[i].cents)) bad++; }
    }
  }
  printf("S %d %d\n", notes, bad);
  return 0;
}

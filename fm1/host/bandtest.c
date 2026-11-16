/* fm1/host/check-band.js runs this and the web's own band code (index.html) and compares them line for line:
 *   D kit bar step note   every drum hit of the bar (the pattern, the fill window, genFill)
 *   B kit block tokens    genBass's figure for a 16-bar block
 *   C kit bar mask        genComp's chord rhythm with bandPlan's seed, dodging the block's bass figure
 * plus, for every kit over 64 bars of major, 31-EDO and pentatonic: no chord or bass note outside the scale. */
#include <stdio.h>
#include <math.h>
#include "../core/band.h"
#include "../core/band_tables.h"
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
      for (int i = 0; i < O.nd; i++)   /* the site's pattern, fills and crashes; ghosts and pickups are humanize (H lines) */
        if (O.drum[i].kind == 0) printf("D %d %u %d %d\n", k, bar, O.drum[i].step, O.drum[i].note);
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
  /* HUMANIZE, per kit over 256 bars at 100 bpm (a 16th = 150 ms), against the site's rules:
   *   H kit onbeat_max_ms drift_max_ms ghosts_per_bar ghost_bad pickups_per_bar swing8_ms kick_vel_sd hat_vel_sd */
  for (int k = 0; k < sh_band_nkits(); k++) {
    const sh_kitfeel *kf = &SH_KITFEEL[k];
    double onb = 0, drift = 0, ks = 0, kq = 0, hs = 0, hq = 0, sw = -1; int kn = 0, hn = 0, ghosts = 0, gbad = 0, picks = 0;
    sh_band_init(&B, k, SALT); B.step_ms = 150.0; B.bpm = 100.0; B.swmod = 0.6;
    for (int bar = 0; bar < 256; bar++) {
      sh_band_next_bar(&B, sh_scale_by_id("major"), &O);
      for (int i = 0; i < O.nd; i++) {
        const sh_dhit *d = &O.drum[i]; int s = d->step;
        double genre = (kf->sw8 > 0 && s % 4 == 2) ? kf->sw8 * 0.667 * 150.0 : (kf->sw16 > 0 && s % 2 == 1) ? kf->sw16 * 0.333 * 150.0 : 0.0;
        double groove = (s % 2 == 1) ? 0.025 * 0.6 * 150.0 : 0.0, human = d->nudge - genre - groove;
        if (s % 4 == 0 && fabs(d->nudge) > onb) onb = fabs(d->nudge);
        if (fabs(human) > drift) drift = fabs(human);
        if (s % 4 == 2 && kf->sw8 > 0 && d->kind == 0) sw = genre;
        if (d->kind == 1) { ghosts++; if (s % 4 == 0 || s == 4 || s == 12 || (kf->ghost_and && s % 4 != 2)) gbad++; }
        if (d->kind == 2) picks++;
        if (d->kind == 0 && d->note == 36 && s != 0 && s != 8 && !(O.fill && s >= 16 - SH_FEEL[k].fill_len)) { ks += d->vel; kq += (double)d->vel * d->vel; kn++; }
        if (d->kind == 0 && d->note == 42 && s % 4 == 0) { hs += d->vel; hq += (double)d->vel * d->vel; hn++; }
      }
    }
    double ksd = kn > 1 ? sqrt(kq / kn - (ks / kn) * (ks / kn)) : 0, hsd = hn > 1 ? sqrt(hq / hn - (hs / hn) * (hs / hn)) : 0;
    printf("H %d %.3f %.3f %.3f %d %.3f %.1f %.2f %.2f %d\n", k, onb, drift, ghosts / 256.0, gbad, picks / 256.0, sw, ksd, hsd, kf->simple);
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

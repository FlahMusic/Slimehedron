/* Host test: a bounce is heard when it is seen (Flah 2026-11-20: "we want each note bounce to be on time with the sound
 * output, so if its quantized just slow the note speed where needed to make it all work that way mathematically and
 * look organic"). The device's tank (the guard, the FM-1's portals, auto-notes, quantize) through the shapes and spins
 * the FM-1 makes, 32 bars each. For every wall note:
 *   gap   how long after the ball touches the wall the note sounds (quantize holds an early one for the next grid line,
 *         up to SH_QWAIT 45 ms: a bounce seen before it is heard). The screen draws the tank as it sounds (slime_ui.c
 *         sl_pose), so the gap is the only part left of a bounce out of step with its note.
 *   grid  how far the note is from a grid line (the timing on the arps: tight)
 *   steer how hard beat lock bends a ball's speed to put its bounce on a line (tq: 1 = the tempo's own speed)
 * Measured 2026-11-20 with the web's rules (a note up to 40 ms after a line counted as on it, beat lock 0.8..1.22):
 * 95.8% heard within a tick, 40.3% on a grid line (the worst 78 ms off). The FM-1's (tank.c: on the line just passed,
 * beat lock 0.7..1.4 every tick): 97.2% within a tick, 90.4% on a line, the speed 8% off the tempo's on average.
 *   synctest [MIN_SYNC MIN_GRID]   with them: both shares must reach them (check: 0.95 0.85; sabotaged: the web's rules
 *                                  fail the grid at 40%)   */
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include "../core/tank.h"

static sh_tank T;

int main(int argc, char **argv) {
  double want = argc > 1 ? atof(argv[1]) : -1, want_g = argc > 2 ? atof(argv[2]) : 0;
  static const int WALLS[] = {3, 4, 5, 6, 8, 12};
  static const double SPIN[] = {0, 30, 100};
  const double bpm = 100.0, bar = 240000.0 / bpm;
  long notes = 0, within = 0, ongrid = 0, held = 0; double gsum = 0, gmax = 0, gridmax = 0, tqlo = 9, tqhi = 0, tqdev = 0; long tqn = 0;
  static double gaps[400000]; long ng = 0;
  for (int wi = 0; wi < 6; wi++) for (int si = 0; si < 3; si++) for (int seed = 1; seed <= 2; seed++) {
    sh_tank_settings s = sh_tank_defaults();
    s.walls = WALLS[wi]; s.spin = SPIN[si]; s.space = seed == 2 ? SH_SPACE_PORTAL : SH_SPACE_NORMAL; s.auto_notes = 1;
    s.guard = 1; s.worm_pop = 1; s.worm_hold = 8; s.quantize = 1;
    sh_tank_init(&T, s, (uint64_t)(wi * 31 + si * 7 + seed)); sh_tank_start(&T, 0);
    double next_bar = bar;
    for (long k = 0; k * SH_FIXED < 32 * bar; k++) {
      double now = k * SH_FIXED;
      int nh = sh_tank_tick(&T, now, bpm, 1);
      if (now >= next_bar) { sh_tank_on_bar(&T); next_bar += bar; }
      for (int i = 0; i < T.nb; i++) { double q = T.balls[i].tq; if (q < tqlo) tqlo = q; if (q > tqhi) tqhi = q; tqdev += fabs(q - 1.0); tqn++; }
      for (int h = 0; h < nh; h++) {
        const sh_hit *x = &T.hits[h];
        if (x->pane || x->goo > 0.0) continue;       /* (a pane's chime and a gooed note: not a wall's bounce on the grid) */
        double gap = fabs(x->sound_ms - x->at_ms);   /* (the FM-1 may sound it on a line just before its touch) */
        notes++; gsum += gap; if (gap > gmax) gmax = gap; if (gap > 0.01) held++;
        if (gap < SH_FIXED + 0.01) within++;
        if (x->grid_ms < 1.0) ongrid++;
        if (x->grid_ms > gridmax) gridmax = x->grid_ms;
        if (ng < 400000) gaps[ng++] = gap;
      }
    }
  }
  /* the 95th percentile of the gap */
  long above = 0; double p95 = 0; for (double g = 0; g < 60; g += 0.5) { above = 0; for (long i = 0; i < ng; i++) if (gaps[i] > g) above++; if (above <= ng / 20) { p95 = g; break; } }
  double share = (double)within / (double)(notes ? notes : 1);
  printf("synctest: %ld wall notes; heard within a tick (16.7 ms) of the bounce: %.1f%%; held at all: %.1f%%; gap mean %.1f ms, 95%% under %.1f, worst %.1f\n",
         notes, 100 * share, 100.0 * held / (notes ? notes : 1), gsum / (notes ? notes : 1), p95, gmax);
  printf("          on a grid line (within 1 ms): %.1f%% (worst %.1f ms off); beat lock's steer: speed %.2f..%.2f of the tempo's, %.1f%% off it on average\n",
         100.0 * ongrid / (notes ? notes : 1), gridmax, tqlo, tqhi, 100 * tqdev / (tqn ? tqn : 1));
  if (want < 0) return 0;
  double gs = (double)ongrid / (double)(notes ? notes : 1);
  printf(share >= want ? "  PASS  at least %.0f%% heard within a tick of their bounce\n" : "  FAIL  under %.0f%% heard within a tick of their bounce\n", 100 * want);
  printf(gs >= want_g ? "  PASS  at least %.0f%% on a grid line\n" : "  FAIL  under %.0f%% on a grid line\n", 100 * want_g);
  return share >= want && gs >= want_g ? 0 : 1;
}

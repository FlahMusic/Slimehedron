/* Host test: WALL HP, the FM-1's (tank.c s.wall_hp; Flah 2026-11-25: "all the walls have, like, HP. So, like, after, you
 * know, like, so many hits, the wall will break for a little bit to allow notes to fall through. And shapes with less walls
 * will have higher HP"; asked: it opens 2 bars, the notes that go through fall out and are gone, then it heals).
 * The device's tank (the light goo, the guard on, wall_hp 48) in every shape, still and turning, auto-notes playing
 * (a stand-in for a hand), 64 bars at 100 bpm:
 *   1. each wall's HP is 48 / walls: a triangle 16, a square 12, a hexagon 8, an octagon 6, 12 walls 4
 *   2. a wall breaks on its HP-th note since it was last whole, never sooner (later only when a third of the walls are
 *      already open or only 2 would be left standing: then it holds on its last hit)
 *   3. it stays open 2 bars (4800 ms at 100 bpm, within a tick), then heals whole
 *   4. walls do break, notes do fall out through them, and every note that leaves is gone (none comes back in)
 *   walltest            HP0=1: wall_hp 0 (the plugin's walls on their 8-bar clock): must FAIL
 * Exit 1 on a fail. */
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include "../core/tank.h"

static sh_tank T;

int main(void) {
  static const int WALLS[] = {3, 4, 6, 8, 12};
  static const double SPIN[] = {0, 60};
  const double bpm = 100.0, bar = 240000.0 / bpm;
  int fails = 0;
  long breaks_all = 0, early_all = 0, late_ok = 0, open_bad = 0, fell_all = 0, hp_bad = 0, came_back = 0;
  double open_min = 1e9, open_max = 0;
  for (int wi = 0; wi < 5; wi++) for (int si = 0; si < 2; si++) {
    sh_tank_settings s = sh_tank_defaults();
    s.walls = WALLS[wi]; s.spin = SPIN[si]; s.auto_notes = 1; s.guard = 1; s.wall_hp = getenv("HP0") ? 0 : 48;
    sh_tank_init(&T, s, (uint64_t)(wi * 101 + si * 7 + 3));
    sh_tank_start(&T, 0.0);
    int full = (int)floor(48.0 / WALLS[wi] + 0.5); if (full < 2) full = 2;
    for (int w = 0; w < T.n; w++) if (T.walls[w].hp != full) hp_bad++;
    int hits[SH_MAXWALLS] = {0}, was[SH_MAXWALLS] = {0}, brk[SH_MAXWALLS] = {0}; double broke_at[SH_MAXWALLS];
    long breaks = 0; double next_bar = bar;
    long ticks = (long)(64 * bar / SH_FIXED);
    uint32_t outside_ids[64]; int n_out = 0;
    for (long k = 0; k < ticks; k++) {
      double now = k * SH_FIXED;
      int pre[SH_MAXWALLS];
      for (int w = 0; w < T.n; w++) pre[w] = T.walls[w].broken;
      int nh = sh_tank_tick(&T, now, bpm, 1);
      for (int h = 0; h < nh; h++) { const sh_hit *x = &T.hits[h]; if (!x->pane && x->wall >= 0 && !pre[x->wall]) hits[x->wall]++; }   /* (whole when it rang: a
                                                          * healing wall's notes cost nothing; the breaking note itself counts) */
      if (now >= next_bar) { sh_tank_on_bar(&T); next_bar += bar; }
      for (int w = 0; w < T.n; w++) {
        int b = T.walls[w].broken && T.walls[w].reform == 0.0;
        if (b && !was[w]) {                                 /* it broke this tick */
          breaks++; broke_at[w] = now;
          if (hits[w] < full) early_all++; else if (hits[w] > full) late_ok++;
        }
        if (!b && was[w]) {                                 /* its 2 bars are up: it starts to heal */
          double open = now - broke_at[w];
          if (open < open_min) open_min = open;
          if (open > open_max) open_max = open;
          if (fabs(open - 2.0 * bar) > SH_FIXED * 1.5) open_bad++;
        }
        if (brk[w] && !T.walls[w].broken) hits[w] = 0;     /* whole again: count afresh */
        brk[w] = T.walls[w].broken;
        was[w] = b;
      }
      /* a note outside the tank (it left through a break) must never be back inside it */
      for (int i = 0; i < n_out; i++) {
        for (int q = 0; q < T.nb; q++) if (T.balls[q].id == outside_ids[i] && !T.balls[q].warp && sh_tank_inside(&T, T.balls[q].x, T.balls[q].y)) came_back++; }
      n_out = 0;
      for (int q = 0; q < T.nb && n_out < 64; q++) {       /* (truly out: 2 radii past a wall's line, not a corner's grazing slip) */
        double dmin = 1e9; const sh_ball *B = &T.balls[q];
        for (int w = 0; w < T.n; w++) { double d = (B->x - T.walls[w].ax) * T.walls[w].nx + (B->y - T.walls[w].ay) * T.walls[w].ny; if (d < dmin) dmin = d; }
        if (!B->warp && dmin < -2.0 * SH_BR) outside_ids[n_out++] = B->id; }
    }
    printf("walls %2d spin %3.0f: HP %2d, %3ld breaks, %3u notes fell out, %2d balls now\n", WALLS[wi], SPIN[si], full, breaks, T.fell, T.nb);
    breaks_all += breaks; fell_all += T.fell;
  }
  #define OK(c, ...) do { int c_ = (c); printf("  %s  ", c_ ? "PASS" : "FAIL"); printf(__VA_ARGS__); printf("\n"); if (!c_) fails++; } while (0)
  OK(hp_bad == 0, "1. each wall's HP is 48 / walls (16 12 8 6 4 for 3 4 6 8 12 walls): %ld walls otherwise", hp_bad);
  OK(breaks_all >= 20 && early_all == 0, "2. %ld breaks, none before its HP-th note (%ld early; %ld held on their last hit by the cap)", breaks_all, early_all, late_ok);
  OK(open_bad == 0 && open_min < 1e8, "3. open 2 bars (%.0f ms) each time: %.0f..%.0f ms (%ld off by more than a tick)", 2.0 * bar, open_min, open_max, open_bad);
  OK(fell_all > 0 && came_back == 0, "4. notes fall out through the breaks and are gone: %ld fell, %ld came back in", fell_all, came_back);
  printf(fails ? "FAILED: %d\n" : "wall HP: the walls break on their own hits, open 2 bars, and let notes fall out\n", fails);
  return fails ? 1 : 0;
}

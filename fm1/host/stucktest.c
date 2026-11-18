/* Host test: no note gets stuck ringing a wall (Flah 2026-11-18: "it made a cube and the arp melody started freakin out,
 * the notes arent floating off the wall sometimes and getting stuck in a corner and just actuating non stop").
 * The device's tank (the light goo, its settings) through every shape the FM-1 makes, three spins, both spaces, with
 * auto-notes and a hand throwing a ball every 3 s, for 120 bars with the slime off (the shape never reforms: the goo
 * fills and stays full, the worst case).
 *   STUCK  one ball ringing 12 or more notes inside 2 s (six a second, held: what Flah heard was one ball at the 60 ms
 *          limit, sixteen a second, on and on). Must be 0 with the guard on.
 *   burst  one ball ringing 6 notes inside 1 s (a corner's double or triple bounce in a small, fast-spinning shape can).
 *          At most 6 over all 72 scenes (measured 2026-11-18: 3; with the rattle throw off, 108; with a long push
 *          ringing every tick, 10).
 *   outside  ball-ticks a note spends outside the tank while every wall is shut: at most one in 100,000 (measured: 48
 *          of about 10 million, notes slipping out at a still square's open corners, as on the site; with the spinning
 *          walls not pushing notes back in, 148,300)
 *   density  NOHANDS=1 (auto-notes alone): each shape and spin keeps 4..10 notes a bar (measured: 5.1..8.4; without the
 *          room, the web's auto adjuster, up to 15.7 in a triangle)
 *   stucktest [GUARD [HOLD]]     GUARD 1 (default): the FM-1's wall guard on; 0: off (the plugin's tank, to see it fail)
 *   STUCK_TRACE=1                print the first notes of each scene's first few stuck balls
 * Prints one line per scene and a verdict; exit 1 if any note got stuck with the guard on. */
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include "../core/tank.h"

static sh_tank T;
#define NID 4096
#define RING 12
static double ring[NID][RING];   /* each ball's last twelve sounding notes (ms) */
static int rn[NID];
static double flag_s[NID], flag_b[NID];

int main(int argc, char **argv) {
  int guard = argc > 1 ? atoi(argv[1]) : 1, hold = argc > 2 ? atoi(argv[2]) : 8;
  static const int WALLS[] = {3, 4, 5, 6, 8, 12};
  static const double SPIN[] = {0, 30, 100};
  const double bpm = 100.0, bar = 240000.0 / bpm;
  long stuck_all = 0, burst_all = 0, out_all = 0, bt_all = 0, scenes = 0; double dens[6][3] = {{0}};
  for (int wi = 0; wi < 6; wi++) for (int si = 0; si < 3; si++) for (int sp = 0; sp < 2; sp++) for (int seed = 1; seed <= 2; seed++) {
    sh_tank_settings s = sh_tank_defaults();
    s.walls = WALLS[wi]; s.spin = SPIN[si]; s.space = sp ? SH_SPACE_PORTAL : SH_SPACE_NORMAL; s.auto_notes = 1;
    s.guard = guard; s.worm_hold = hold;
    sh_tank_init(&T, s, (uint64_t)(seed * 7919 + wi * 31 + si * 7 + sp));
    sh_tank_start(&T, 0.0);
    for (int i = 0; i < NID; i++) { rn[i] = 0; flag_s[i] = flag_b[i] = -1e9; }
    long stuck = 0, burst = 0, out = 0, notes = 0, maxb = 0; double next_bar = bar, next_hand = 3000.0;
    long ticks = (long)(120 * bar / SH_FIXED);
    for (long k = 0; k < ticks; k++) {
      double now = k * SH_FIXED;
      if (now >= next_hand && !getenv("NOHANDS")) { sh_tank_add_ball(&T); next_hand += 3000.0; }
      int nh = sh_tank_tick(&T, now, bpm, 1);
      for (int h = 0; h < nh; h++) {
        const sh_hit *x = &T.hits[h];
        if (x->pane) continue;
        notes++;
        uint32_t id = x->ball % NID;
        double *r = ring[id];
        r[rn[id] % RING] = x->at_ms; rn[id]++;
        double t12 = rn[id] >= RING ? r[rn[id] % RING] : -1e9, t6 = rn[id] >= 6 ? r[(rn[id] + RING - 6) % RING] : -1e9;
        if (x->at_ms - t6 < 1000.0 && x->at_ms - flag_b[id] > 1000.0) { burst++; flag_b[id] = x->at_ms; }
        if (x->at_ms - t12 < 2000.0 && x->at_ms - flag_s[id] > 2000.0) {
          stuck++; flag_s[id] = x->at_ms;
          if (getenv("STUCK_TRACE") && stuck <= 3) {
            printf("  stuck: ball %u at %.0f ms on wall %d, its last twelve notes at", x->ball, x->at_ms, x->wall);
            for (int q = 0; q < RING; q++) printf(" %.0f", r[(rn[id] + q) % RING]);
            printf("\n");
          }
        }
      }
      if (now >= next_bar) { sh_tank_on_bar(&T); next_bar += bar; }
      if (T.nb > maxb) maxb = T.nb;
      { int open = 0; for (int w = 0; w < T.n; w++) if (T.walls[w].broken && T.walls[w].reform < 0.55) open = 1;   /* a note outside a closed tank */
        bt_all += T.nb; if (!open) for (int b = 0; b < T.nb; b++) if (!T.balls[b].warp && !sh_tank_inside(&T, T.balls[b].x, T.balls[b].y)) out++; }
    }
    printf("walls %2d spin %3.0f %-6s seed %d: %5ld notes (%4.1f a second), goo %.2f, %2d balls (most %2ld), thrown %4u, melted %3u, bursts %3ld, outside %4ld, STUCK %ld\n",
           WALLS[wi], SPIN[si], sp ? "portal" : "normal", seed, notes, notes / (ticks * SH_FIXED / 1000.0), sh_goo_fill(&T.goo), T.nb, maxb,
           T.thrown, T.melted, burst, out, stuck);
    stuck_all += stuck; burst_all += burst; out_all += out; scenes++;
    dens[wi][si] += notes / 120.0 / 4.0;   /* (two seeds, two spaces) */
  }
  int hands = !getenv("NOHANDS"), bad_s = stuck_all > 0, bad_b = hands && burst_all > 6, bad_o = out_all * 100000 > bt_all, bad_d = 0;
  double dlo = 1e9, dhi = 0;
  for (int wi = 0; wi < 6; wi++) for (int si = 0; si < 3; si++) { if (dens[wi][si] < dlo) dlo = dens[wi][si]; if (dens[wi][si] > dhi) dhi = dens[wi][si]; }
  if (!hands) bad_d = dlo < 4.0 || dhi > 10.0;
  printf("  %s  no note stuck ringing a wall: %ld\n", bad_s ? "FAIL" : "PASS", stuck_all);
  if (hands) printf("  %s  at most 6 bursts of six notes in a second: %ld\n", bad_b ? "FAIL" : "PASS", burst_all);
  printf("  %s  notes stay in a shut tank, spinning or not: %ld of %ld ball-ticks outside (at most one in 100,000)\n",
         bad_o ? "FAIL" : "PASS", out_all, bt_all);
  if (!hands) printf("  %s  the auto-notes alone keep 4..10 notes a bar in every shape and spin (the site aims at ~8): %.1f..%.1f\n",
                     bad_d ? "FAIL" : "PASS", dlo, dhi);
  printf("%s over %ld scenes, 120 bars each (guard %s%s)\n", bad_s || bad_b || bad_o || bad_d ? "FAIL" : "PASS", scenes, guard ? "on" : "off",
         hands ? ", a hand every 3 s" : ", auto-notes alone");
  return guard && (bad_s || bad_b || bad_o || bad_d) ? 1 : 0;
}

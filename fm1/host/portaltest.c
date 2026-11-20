/* Host test of portal space in the FM-1 core (core/tank.c), the web's own checks (_dev/dev-portal.js) as numbers:
 *   2  both holes lie on a wall, inside it, open at rest, and never overlap
 *   3  a ball that meets a hole goes in silently, is never lost, and comes out of the OTHER hole: just off its wall,
 *      heading away from it, at the speed it went in, inside the tank, ringing the wall it came out of
 *   4  anywhere else a ball bounces and rings, as always
 *   5  the holes slide in the first part of each beat and rest in the rest, visit more than one wall, glide (never
 *      jump), and shrink to slip round a corner
 *   6  a busy portal tank: no ball ever lost, some go through, most notes are plain bounces
 *   0  normal space has no holes (and stays the plugin's, number for number: check-tank.js)
 *   8  the FM-1's own (s.worm_pop): four holes, wider than the web's, more notes through them, each popping open on
 *      walls of its own (never moving while open), every one on its wall, every trip out of ANOTHER hole and its note
 *      on a grid line. Sabotaged 2026-11-20: the trip not timed (11 of 148 on the grid), the closing safeguards off
 *      (139 moves while open), the web's size (78 px against 82, 17.9% through)
 * Prints PASS/FAIL; exit 1 on a fail.   portaltest */
#include <stdio.h>
#include <math.h>
#include "../core/tank.h"

static sh_tank T; static int fails = 0;
static void ok(int c, const char *m) { printf("  %s  %s\n", c ? "PASS" : "FAIL", m); if (!c) fails++; }
static long tick = 0;
static int step1(double bpm) { int n = sh_tank_tick(&T, tick * SH_FIXED, bpm, 1); tick++; return n; }
static sh_tank_settings portal(void) { sh_tank_settings s = sh_tank_defaults(); s.space = SH_SPACE_PORTAL; s.auto_notes = 0; s.chaos = 0; return s; }
static double beat_frac(double bpm) { double b = tick * SH_FIXED / 60000.0 * bpm; return b - floor(b); }

int main(void) {
  char m[300];
  /* ---- 0: normal space has none */
  { sh_tank_settings s = sh_tank_defaults(); s.auto_notes = 0; sh_tank_init(&T, s, 1); sh_tank_start(&T, 0); tick = 0;
    for (int i = 0; i < 300; i++) step1(80);
    ok(!T.worm_on && T.worm[0].rad == 0 && T.worm[1].rad == 0, "0  a normal tank has no wormholes"); }
  /* ---- 2: on the walls, inside them, open at rest, apart */
  const double bpm = 60;
  sh_tank_init(&T, portal(), 3); sh_tank_start(&T, 0); tick = 0;
  for (int i = 0; i < 150; i++) step1(bpm);
  while (beat_frac(bpm) < 0.7) step1(bpm);   /* at rest */
  { double off = 0, rmin = 1e9; int inside = 1;
    for (int i = 0; i < 2; i++) { const sh_worm *P = &T.worm[i]; const sh_wall *e = &T.walls[P->wall];
      double d = fabs((P->x + SH_TCX - e->ax) * e->nx + (P->y + SH_TCY - e->ay) * e->ny), ex = e->bx - e->ax, ey = e->by - e->ay;
      double u = ((P->x + SH_TCX - e->ax) * ex + (P->y + SH_TCY - e->ay) * ey) / (ex * ex + ey * ey);
      if (d > off) off = d;
      if (u < 0 || u > 1) inside = 0;
      if (P->rad < rmin) rmin = P->rad; }
    snprintf(m, sizeof m, "2  both holes lie on a wall, inside it (%.2f px off at most)", off); ok(off < 0.6 && inside, m);
    snprintf(m, sizeof m, "   both are open at rest (%.0f px at least; a ball is %.0f)", rmin, SH_BR); ok(rmin > SH_BR * 1.4, m); }
  { double apart = 1e9;
    for (int i = 0; i < 8 * 60; i++) { step1(bpm); const sh_worm *A = &T.worm[0], *B = &T.worm[1];
      double d = sqrt((A->x - B->x) * (A->x - B->x) + (A->y - B->y) * (A->y - B->y) + (A->z - B->z) * (A->z - B->z)) - A->rad - B->rad;
      if (d < apart) apart = d; }
    snprintf(m, sizeof m, "   and over 8 beats they never overlap (%.1f px between their rims at the closest)", apart); ok(apart >= 0, m); }
  /* ---- 3: in one, out of the other */
  while (beat_frac(bpm) < 0.62 || beat_frac(bpm) > 0.66) step1(bpm);
  { const sh_worm *A = &T.worm[0]; double sp = (bpm / 80.0) * 3.4, z = A->z / SH_TBOXD + 0.5;
    sh_tank_add_ball_at(&T, SH_TCX + A->x + A->n[0] * 24, SH_TCY + A->y + A->n[1] * 24, z, -A->n[0] * sp, -A->n[1] * sp, 0.0);
    int went = 0, noteIn = 0, lost = 0, out = 0, outNote = 0; double outCents = 0, across = 0, along = 0, head = 0, spOut = 0; int insideT = 0; sh_worm Bq = T.worm[1];
    for (int i = 0; i < 400 && !out; i++) {
      int was = T.balls[T.nb - 1].warp, nh = step1(bpm); if (T.nb != 1) lost = 1;
      const sh_ball *b = &T.balls[0];
      if (!was && b->warp) { went = 1; noteIn = nh; }
      if (was && !b->warp) { out = 1; Bq = T.worm[1];
        for (int k = 0; k < nh; k++) if (!T.hits[k].pane) { outNote++; outCents = T.hits[k].cents; }
        double rx = b->x - SH_TCX - Bq.x, ry = b->y - SH_TCY - Bq.y, rz = (b->z - 0.5) * SH_TBOXD - Bq.z;
        along = rx * Bq.n[0] + ry * Bq.n[1] + rz * Bq.n[2];
        double ax = rx - along * Bq.n[0], ay = ry - along * Bq.n[1], az = rz - along * Bq.n[2]; across = sqrt(ax * ax + ay * ay + az * az);
        spOut = sqrt(b->vx * b->vx + b->vy * b->vy); head = (b->vx * Bq.n[0] + b->vy * Bq.n[1]) / spOut;
        insideT = sh_tank_inside(&T, b->x, b->y); } }
    snprintf(m, sizeof m, "3  a ball that meets a hole goes in, silently (%d notes as it went)", noteIn); ok(went && noteIn == 0, m);
    ok(!lost, "   and it is never lost: the tank still holds it the whole time");
    snprintf(m, sizeof m, "   it comes out of the OTHER hole (%.1f px from its middle, %.1f px out from its wall)", across, along);
    ok(out && across < Bq.rad && fabs(along - (SH_BR + 1.5)) < SH_BR, m);
    snprintf(m, sizeof m, "   heading away from that wall (%.2f), at the speed it went in at (%.2f vs %.2f)", head, spOut, sp);
    ok(out && head > 0.5 && fabs(spOut - sp) < sp * 0.05, m);
    ok(out && insideT, "   inside the tank");
    snprintf(m, sizeof m, "   ringing the wall it came out of (%d note, %.0f cents; the wall %.0f)", outNote, outCents, Bq.cents);
    ok(outNote >= 1 && fabs(outCents - Bq.cents) < 0.01, m); }
  /* ---- 4: anywhere else, a bounce */
  { T.nb = 0; while (beat_frac(bpm) < 0.62 || beat_frac(bpm) > 0.66) step1(bpm);
    int w = 0; while (w == T.worm[0].wall || w == T.worm[1].wall) w++;
    const sh_wall *e = &T.walls[w]; double mx = (e->ax + e->bx) / 2, my = (e->ay + e->by) / 2, sp = (bpm / 80.0) * 3.4;
    sh_tank_add_ball_at(&T, mx + e->nx * 24, my + e->ny * 24, 0.5, -e->nx * sp, -e->ny * sp, 0.0);
    int warped = 0, note = 0, turned = 0;
    for (int i = 0; i < 40; i++) { int nh = step1(bpm); if (T.balls[0].warp) warped = 1;
      for (int k = 0; k < nh; k++) if (T.hits[k].wall == w) note = 1;
      if (T.balls[0].vx * e->nx + T.balls[0].vy * e->ny > 0) turned = 1; }
    ok(!warped && turned && note, "4  anywhere else on the walls a ball bounces and rings, as always"); T.nb = 0; }
  /* ---- 5: the glide */
  { double early = 0, late = 0, maxStep = 0, rmax = fmin(84.0, SH_TBOXD * 0.24), cornerMin = 1e9; int seen[2][SH_MAXWALLS] = { { 0 } };
    double px[2], py[2], pz[2]; int pw[2];
    for (int i = 0; i < 2; i++) { px[i] = T.worm[i].x; py[i] = T.worm[i].y; pz[i] = T.worm[i].z; pw[i] = T.worm[i].wall; }
    for (int i = 0; i < 8 * 60; i++) { double f = beat_frac(bpm); step1(bpm);
      for (int h = 0; h < 2; h++) { const sh_worm *P = &T.worm[h];
        double d = sqrt((P->x - px[h]) * (P->x - px[h]) + (P->y - py[h]) * (P->y - py[h]) + (P->z - pz[h]) * (P->z - pz[h]));
        if (f < 0.6) early += d; else late += d;
        if (d > maxStep) maxStep = d;
        if (P->wall != pw[h] && P->rad < cornerMin) cornerMin = P->rad;
        seen[h][P->wall] = 1; px[h] = P->x; py[h] = P->y; pz[h] = P->z; pw[h] = P->wall; } }
    int v0 = 0, v1 = 0; for (int w = 0; w < SH_MAXWALLS; w++) { v0 += seen[0][w]; v1 += seen[1][w]; }
    snprintf(m, sizeof m, "5  the holes slide in the first part of each beat and rest in the rest (%.0f px vs %.0f px)", early, late); ok(early > late * 4, m);
    snprintf(m, sizeof m, "   over 8 beats each visits more than one wall (%d, %d)", v0, v1); ok(v0 >= 2 && v1 >= 2, m);
    snprintf(m, sizeof m, "   gliding, not jumping (largest move in one tick %.1f px)", maxStep); ok(maxStep < rmax * 0.6, m);
    snprintf(m, sizeof m, "   and a hole shrinks to slip round a corner (down to %.0f of %.0f px where it changes wall)", cornerMin, rmax); ok(cornerMin < rmax * 0.35, m); }
  /* ---- 7: the FM-1's holes rest two bars (s.worm_hold 8: Flah 2026-11-18, "they dont stay long enough before moving") */
  { sh_tank_settings s = portal(); s.worm_hold = 8; sh_tank_init(&T, s, 5); sh_tank_start(&T, 0); tick = 0;
    for (int i = 0; i < 60; i++) step1(bpm);
    int moves = 0, pw = T.worm[0].wall; double last = -1, gap = 1e9, still = 0, total = 0, px = T.worm[0].x, py = T.worm[0].y;
    for (int i = 0; i < 32 * 60; i++) { step1(bpm); const sh_worm *P = &T.worm[0];
      double b = tick * SH_FIXED / 60000.0 * bpm, d = hypot(P->x - px, P->y - py);
      if (P->wall != pw) { if (last >= 0 && b - last < gap) gap = b - last; last = b; moves++; pw = P->wall; }
      total += 1; if (d < 1e-6) still += 1; px = P->x; py = P->y; }
    snprintf(m, sizeof m, "7  worm_hold 8: over 32 beats a hole changes wall %d times, at least %.1f beats apart", moves, gap); ok(moves >= 3 && moves <= 4 && gap > 7.5, m);
    snprintf(m, sizeof m, "   and stands still %.0f%% of the time (the glide is the first 0.6 of a beat in 8)", 100 * still / total); ok(still / total > 0.85, m); }
  /* ---- 6: busy */
  { sh_tank_settings s = portal(); s.chaos = 0.12; sh_tank_init(&T, s, 9); sh_tank_start(&T, 0); tick = 0;
    for (int i = 0; i < 8; i++) sh_tank_add_ball(&T);
    int lost = 0, warps = 0, hits = 0; int was[SH_BALLCAP] = { 0 };
    for (int i = 0; i < 14 * 60; i++) { int nh = step1(80); if (T.nb != 8) lost = 1;
      for (int k = 0; k < nh; k++) if (!T.hits[k].pane) hits++;
      for (int k = 0; k < T.nb; k++) { if (T.balls[k].warp && !was[k]) warps++; was[k] = T.balls[k].warp; } }
    snprintf(m, sizeof m, "6  14 s of a busy portal tank: every ball still there at every look (%d balls)", T.nb); ok(!lost && T.nb == 8, m);
    snprintf(m, sizeof m, "   some went through a wormhole (%d)", warps); ok(warps >= 1, m);
    snprintf(m, sizeof m, "   and most notes are plain bounces (%d trips, %d wall notes)", warps, hits); ok(warps < hits * 0.4, m); }
  /* ---- 8: the FM-1's portals (s.worm_pop, Flah 2026-11-20: bigger, on more walls, popping in and out, chaotic, the
   *         timing tight). The same busy tank (8 balls, 140 bpm, a minute) in the web's two gliding holes and in the pop
   *         mode, with the device's worm_hold 8. (140: the web's trip, half a beat held to at least 240 ms, is then off the
   *         grid; at 80 bpm it is two sixteenths and lands on the grid by itself, so a trip not timed passed: sabotaged) */
  { int trips[2] = { 0, 0 }, hits[2] = { 0, 0 }, lostAny = 0, offWall = 0, sameWall = 0, popMoves = 0, openMoves = 0, exits = 0, onGrid = 0,
        otherHole = 0, seenW[SH_NWORM][SH_MAXWALLS] = { { 0 } }, nbad = 0; double radSum[2] = { 0, 0 }, radN[2] = { 0, 0 }, worstGrid = 0;
    for (int pop = 0; pop < 2; pop++) {
      sh_tank_settings s = portal(); s.chaos = 0.12; s.worm_hold = 8; s.worm_pop = pop; s.walls = 6;
      sh_tank_init(&T, s, 21); sh_tank_start(&T, 0); tick = 0;
      for (int i = 0; i < 8; i++) sh_tank_add_ball(&T);
      int was[SH_BALLCAP] = { 0 }, wa[SH_BALLCAP] = { 0 }, pw[SH_NWORM]; double pr[SH_NWORM];
      for (int h = 0; h < SH_NWORM; h++) { pw[h] = T.worm[h].wall; pr[h] = T.worm[h].rad; }
      for (int i = 0; i < 60 * 60; i++) {
        int nh = step1(140); if (T.nb != 8) lostAny = 1;
        for (int k = 0; k < nh; k++) if (!T.hits[k].pane) hits[pop]++;
        for (int h = 0; h < T.worm_n; h++) { const sh_worm *P = &T.worm[h];
          if (P->rad > SH_BR * 1.2) { radSum[pop] += P->rad; radN[pop] += 1; }
          if (!pop) continue;
          seenW[h][P->wall < 0 ? 0 : P->wall] = 1;
          if (P->wall != pw[h] && pw[h] >= 0) { popMoves++; if (pr[h] > SH_BR) openMoves++; }   /* it may only move while closed */
          for (int j = 0; j < h; j++) if (T.worm[j].wall == P->wall && P->rad > SH_BR && T.worm[j].rad > SH_BR) sameWall++;
          if (P->rad > SH_BR) { const sh_wall *e = &T.walls[P->wall];
            double d = fabs((P->x + SH_TCX - e->ax) * e->nx + (P->y + SH_TCY - e->ay) * e->ny); if (d > 0.6) offWall++; }
          pw[h] = P->wall; pr[h] = P->rad; }
        for (int k = 0; k < T.nb; k++) {
          const sh_ball *b = &T.balls[k];
          if (b->warp && !was[k]) { trips[pop]++; wa[k] = b->wa; }
          if (pop && !b->warp && was[k]) {                   /* it came out: its note on a grid line, out of another hole */
            exits++;
            for (int q = 0; q < nh; q++) if (T.hits[q].ball == b->id && !T.hits[q].pane) {   /* on a line, and the ball shows a tick before it at most */
              double g = T.hits[q].grid_ms + (T.hits[q].sound_ms - T.hits[q].at_ms);
              if (T.hits[q].grid_ms < 0.5 && T.hits[q].sound_ms - T.hits[q].at_ms < SH_FIXED + 0.01) onGrid++;
              if (g > worstGrid) worstGrid = g; }
            { double best = 1e9; int hb = -1; for (int h = 0; h < T.worm_n; h++) { double dx = b->x - SH_TCX - T.worm[h].x, dy = b->y - SH_TCY - T.worm[h].y, d = dx * dx + dy * dy; if (d < best) { best = d; hb = h; } }
              if (hb != wa[k]) otherHole++; } }
          was[k] = b->warp; } } }
    int walls4 = 1; for (int h = 0; h < SH_NWORM; h++) { int v = 0; for (int w = 0; w < SH_MAXWALLS; w++) v += seenW[h][w]; if (v < 4) walls4 = 0; }
    double r0 = radSum[0] / fmax(radN[0], 1), r1 = radSum[1] / fmax(radN[1], 1), rate0 = (double)trips[0] / fmax(hits[0] + trips[0], 1), rate1 = (double)trips[1] / fmax(hits[1] + trips[1], 1);
    (void)nbad;
    snprintf(m, sizeof m, "8  the FM-1's holes: %d of them, open to a %.0f px radius on average (the web's two: %.0f)", SH_NWORM, r1, r0); ok(r1 > r0 * 1.3, m);
    snprintf(m, sizeof m, "   a minute of a busy tank: %.1f%% of the notes go through (the web's: %.1f%%), every ball still there", 100 * rate1, 100 * rate0);
    ok(rate1 > rate0 * 2 && !lostAny, m);
    snprintf(m, sizeof m, "   each hole lives on at least 4 different walls, popping (%d moves, %d while it was open), never two open on one wall (%d)", popMoves, openMoves, sameWall);
    ok(walls4 && popMoves >= 40 && openMoves == 0 && sameWall == 0, m);
    snprintf(m, sizeof m, "   every open hole lies on its wall (%d ticks off it)", offWall); ok(offWall == 0, m);
    snprintf(m, sizeof m, "   a ball comes out ON THE GRID: %d of %d exits' notes on a grid line, the ball within a tick of it (the worst %.1f ms)", onGrid, exits, worstGrid); ok(exits >= 20 && onGrid == exits, m);
    snprintf(m, sizeof m, "   out of another hole than it went in: %d of %d", otherHole, exits); ok(otherHole * 10 >= exits * 9, m); }
  /* ---- 9: the FM-1's holes on a triangle and a square: a hole fewer than the walls open (2, 3), every hole always on a
   *         real wall (four holes on three walls left one on walls[-1]: notes out of the tank, stucktest 2026-11-20) */
  { int bad = 0, over = 0, lost = 0;
    for (int w = 3; w <= 4; w++) {
      sh_tank_settings s = portal(); s.walls = w; s.worm_pop = 1; s.worm_hold = 8; s.spin = 100; s.chaos = 0.12; s.guard = 1;   /* (the device: the guard on) */
      sh_tank_init(&T, s, 33); sh_tank_start(&T, 0); tick = 0;
      for (int i = 0; i < 8; i++) sh_tank_add_ball(&T);
      for (int i = 0; i < 20 * 60; i++) {
        int open = 0; step1(140); if (T.nb != 8) lost = 1;
        for (int h = 0; h < T.worm_n; h++) { if (T.worm[h].wall < 0 || T.worm[h].wall >= T.n) bad++; if (T.worm[h].rad > SH_BR) open++; }
        if (open > w - 1) over++;
        for (int k = 0; k < T.nb; k++) if (!T.balls[k].warp && !sh_tank_inside(&T, T.balls[k].x, T.balls[k].y)) bad++; } }
    snprintf(m, sizeof m, "9  a triangle and a square: every hole on a real wall and every ball inside (%d ticks wrong), at most a hole fewer than the walls open (%d ticks over)", bad, over);
    ok(bad == 0 && over == 0 && !lost, m); }
  printf(fails ? "FAILED: %d\n" : "the FM-1 tank's wormholes behave like the web's, and the FM-1's own are bigger and on the grid\n", fails);
  return fails ? 1 : 0;
}

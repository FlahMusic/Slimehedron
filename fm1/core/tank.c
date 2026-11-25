/* The tank in normal space. See tank.h. Mirrors vst/slimehedron-core/src/tank/mod.rs line for line (keep the order of
 * every sum and product: the host test compares the plugin's numbers exactly). */
#include <math.h>
#include "tank.h"

#define TAU       6.283185307179586
#define PI        3.141592653589793
#define FRAC_PI_2 1.5707963267948966

static double rnd(sh_tank *t) { return sh_rng_f(&t->rng); }
static void room_bar(sh_tank *t);
static double rnd_cb(void *ctx) { return sh_rng_f((sh_rng *)ctx); }
static double fmin2(double a, double b) { return a < b ? a : b; }
static double fmax2(double a, double b) { return a > b ? a : b; }
static double fclamp(double x, double lo, double hi) { return x < lo ? lo : x > hi ? hi : x; }

sh_tank_settings sh_tank_defaults(void) {
  sh_tank_settings s = { 6, sh_scale_by_id("major"), 2, 0.0625, 0.15, 1, 0.0, 0.12, 1, 100, 12, 94, 1, SH_SPACE_NORMAL, 1, 0, 0, 1.0, 0 };   /* (worm_pop 0, guard 0, worm_max 0) */
  return s;
}

static int total_degrees(const sh_tank *t) { return t->s.scale->n * t->s.octs; }
static double cents_for_degree(const sh_tank *t, int d) { return (double)sh_cents_for_degree(t->s.scale, d); }
static double ball_speed(const sh_tank *t) { return (t->bpm / 80.0) * 3.4; }

/* grid step c's length in ms (swing: the even steps lean long, the odd ones short) */
static double tick_interval(const sh_tank *t, uint64_t c) {
  double beat = 60.0 / t->bpm;
  double d = t->s.div * 4.0 * beat;
  if (t->s.swing > 0.01) d *= c % 2 == 0 ? 1.0 + t->s.swing * 0.5 : 1.0 - t->s.swing * 0.5;
  return d * 1000.0;
}

/* walls ascend round the shape, two of every three pulled onto the home chord (the web's wallDegrees) */
static void wall_degrees(const sh_tank *t, int n, int td, int *out) {
  int len = t->s.scale->n, ct[3], k = sh_home_chord(t->s.scale, ct), prev = -1;
  for (int i = 0; i < n; i++) {
    int d = (int)round((double)i / (double)n * (double)td), best = -1, bd = 99;
    for (int c = d - 1; c <= d + 1; c++) {
      if (c < 0 || c >= td || c <= prev) continue;
      int m = ((c % len) + len) % len, tri = 0;
      for (int j = 0; j < k; j++) if (ct[j] == m) tri = 1;
      if (!tri) continue;
      int dist = c > d ? c - d : d - c;
      if (dist < bd) { bd = dist; best = c; }
    }
    if (best >= 0) d = best;
    if (d < prev) d = prev;
    if (d >= td) d = td - 1;
    out[i] = d; prev = d;
  }
}

/* the web's buildEdges for a plain polygon, turned by rot; a spinning rebuild keeps each wall's flash and closes gaps */
static void rebuild(sh_tank *t, int keep_flash) {
  int n = t->s.walls;
  double c = cos(t->rot), s = sin(t->rot);
  for (int i = 0; i < n; i++) {
    double a = -FRAC_PI_2 + (double)i * 2.0 * PI / (double)n;
    double px = SH_TR * cos(a), py = SH_TR * sin(a);
    t->vx[i] = SH_TCX + (px * c - py * s); t->vy[i] = SH_TCY + (px * s + py * c);
  }
  int degs[SH_MAXWALLS]; wall_degrees(t, n, total_degrees(t), degs);
  double cx = 0.0, cy = 0.0;
  for (int i = 0; i < n; i++) { cx += t->vx[i]; cy += t->vy[i]; }
  cx /= (double)n; cy /= (double)n;
  for (int i = 0; i < n; i++) {
    double ax = t->vx[i], ay = t->vy[i], bx = t->vx[(i + 1) % n], by = t->vy[(i + 1) % n];
    double nx = -(by - ay), ny = bx - ax;
    double len = sqrt(nx * nx + ny * ny); if (len == 0.0) len = 1.0;
    nx /= len; ny /= len;
    if (nx * (cx - ax) + ny * (cy - ay) < 0.0) { nx = -nx; ny = -ny; }
    double flash = keep_flash ? t->walls[i].flash : 0.0;
    sh_wall *e = &t->walls[i];
    e->ax = ax; e->ay = ay; e->bx = bx; e->by = by; e->nx = nx; e->ny = ny;
    e->deg = degs[i]; e->cents = cents_for_degree(t, degs[i]); e->flash = flash; e->broken = 0; e->reform = 0.0;
  }
  t->n = n;
  t->broken_n = 0;
}

void sh_tank_init(sh_tank *t, sh_tank_settings s, uint64_t seed) {
  t->s = s;
  if (t->s.walls < 3) t->s.walls = 3;
  if (t->s.walls > SH_MAXWALLS) t->s.walls = SH_MAXWALLS;
  sh_rng_init(&t->rng, seed);
  for (int i = 0; i < SH_MAXWALLS; i++) t->walls[i].flash = 0.0;
  t->n = 0; t->rot = 0.0; t->rot_v = 0.0; t->nb = 0; t->nh = 0;
  t->bpm = 80.0; t->playing = 1; t->now = 0.0; t->last_tick = 0.0; t->tick_count = 0;
  t->broken_n = 0; t->wall_bars = 0; t->last_break = -INFINITY; t->home_root_deg = 0;
  sh_melody_init(&t->melody); t->has_mel_next = 0; t->mel_next = 0.0; t->mel_step_n = 0; t->aim_deg = -1;
  t->phi = 0.0; t->next_id = 1; t->thrown = t->melted = 0;
  t->room = 7; t->a_hits = t->a_bticks = t->r_n = 0;
  if (t->s.worm_hold < 1) t->s.worm_hold = 1;
  t->worm_on = 0; t->worm_key = -1; t->worm_beat = 0; t->worm_open = 0.0;
  t->worm_n = t->s.worm_pop ? SH_NWORM : 2;
  for (int i = 0; i < SH_NWORM; i++) { sh_worm *P = &t->worm[i]; P->rad = P->want = P->suck = P->spit = P->pre = 0.0; P->wall = -1; P->from = P->at = 0; P->dir = 1; P->za = P->zb = 0.0; P->x = P->y = P->z = 0.0; P->tt = 0.5; P->life = -1; }
  rebuild(t, 0);
  /* a regular polygon: its area, and the way from the middle to a wall's midpoint */
  double n = (double)t->n;
  double area = 0.5 * n * SH_TR * SH_TR * sin(TAU / n);
  double room = INFINITY;
  for (int i = 0; i < t->n; i++) {
    const sh_wall *e = &t->walls[i];
    room = fmin2(room, hypot((e->ax + e->bx) / 2.0 - SH_TCX, (e->ay + e->by) / 2.0 - SH_TCY));
  }
  sh_goo_init(&t->goo, area, room);
}

void sh_tank_start(sh_tank *t, double now_ms) { t->last_tick = now_ms; t->now = now_ms; t->has_mel_next = 0; }

int sh_tank_inside(const sh_tank *t, double x, double y) {
  int inside = 0, j = t->n - 1;
  for (int i = 0; i < t->n; i++) {
    double xi = t->vx[i], yi = t->vy[i], xj = t->vx[j], yj = t->vy[j];
    if ((yi > y) != (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    j = i;
  }
  return inside;
}

int sh_tank_add_ball_at(sh_tank *t, double x, double y, double z, double vx, double vy, double vz) {
  if (t->nb >= SH_BALLCAP) return 0;
  sh_ball *b = &t->balls[t->nb++];
  b->x = x; b->y = y; b->z = z; b->vx = vx; b->vy = vy; b->vz = vz; b->tq = 1.0; b->tg = 0.0; b->bl = 0; b->wb = -1;
  b->last_hit = -INFINITY; b->last_pane = -INFINITY; b->pane_n = 0; b->visc = 0.0; b->warp = 0; b->spit = -INFINITY;
  b->id = t->next_id++; b->rat_n = 0; b->still = 0; b->sw_wall = -1; b->sw_t = -INFINITY; b->autob = 0;
  return 1;
}

int sh_tank_add_ball(sh_tank *t) {
  double a = rnd(t) * TAU;
  double r0 = SH_TR * 0.3 * rnd(t);
  double sp = ball_speed(t);
  double vz = 0.003 + rnd(t) * 0.004;
  return sh_tank_add_ball_at(t, SH_TCX + cos(a) * r0, SH_TCY + sin(a) * r0, 0.02, cos(a) * sp, sin(a) * sp, vz);
}

static void break_wall(sh_tank *t) {
  if (t->now - t->last_break < 650.0) return;
  t->last_break = t->now;
  int n = t->n, live = 0;
  for (int i = 0; i < n; i++) if (!t->walls[i].broken) live++;
  int broken_now = n - live, lim = (int)floor((double)n * 0.34); if (lim < 1) lim = 1;
  if (broken_now >= lim || live <= 3) return;
  int len = t->s.scale->n, root = ((t->home_root_deg % len) + len) % len;
  /* don't open the tonic wall: the harmony stays grounded */
  int cand = 0;
  for (int i = 0; i < n; i++) if (!t->walls[i].broken && sh_deg_of(t->s.scale, t->walls[i].cents) != root) cand++;
  int pool = cand > 0 ? cand : live;
  int pick = (int)(rnd(t) * (double)pool), k = 0;
  for (int i = 0; i < n; i++) {
    const sh_wall *e = &t->walls[i];
    int ok = cand > 0 ? (!e->broken && sh_deg_of(t->s.scale, e->cents) != root) : !e->broken;
    if (!ok) continue;
    if (k == pick) {
      t->walls[i].broken = 1; t->walls[i].reform = 0.0;
      if (t->broken_n < SH_MAXWALLS) t->broken_order[t->broken_n++] = i;
      break;
    }
    k++;
  }
}

static void repair_wall(sh_tank *t) {
  if (t->broken_n == 0) return;
  int i = t->broken_order[0];
  for (int k = 1; k < t->broken_n; k++) t->broken_order[k - 1] = t->broken_order[k];
  t->broken_n--;
  if (!t->walls[i].broken) return;
  t->walls[i].reform = 0.001;
}

void sh_tank_on_bar(sh_tank *t) {
  t->wall_bars++;
  if (t->s.guard) room_bar(t);
  if (t->wall_bars % 8 == 0) break_wall(t);
  if (t->wall_bars % 24 == 0) repair_wall(t);
}

static double vel_for_hit(sh_tank *t) {
  if (t->s.vel_rand) { double lo = t->s.vel_min, hi = t->s.vel_max; return round(lo + rnd(t) * (hi - lo)); }
  return (double)t->s.vel_fix;
}

/* the level, and whether quantize holds the note for the next grid line */
static void trigger(sh_tank *t, double cents, double imp, double goo, int pane, int wall, double now, uint32_t ball) {
  double vel = round(vel_for_hit(t) * (1.0 - goo * 0.3));
  if (pane) vel = fmax2(round(vel * 0.62), 1.0);
  double ti = tick_interval(t, t->tick_count), prev = t->last_tick, next = t->last_tick + ti;
  int held = t->s.quantize && goo == 0.0 && now - prev > SH_QLATE && next - now <= SH_QWAIT;
  double sound = held ? next : now;
  /* the FM-1 (the guard on): a note touched within a tick after a grid line sounds ON the line, and one touched more than
   * a tick before it waits for it (the device plans its notes ~75 ms ahead of the speaker, so a few ms before "now" is
   * still to come for the speaker; the web counts up to 40 ms late as on time). Beat lock puts nearly every bounce within
   * a tick of a line, so the note is heard as the bounce is seen (synctest.c) */
  if (t->s.guard && t->s.quantize && goo == 0.0) {
    if (now - prev <= SH_FIXED + 0.5) sound = prev;
    else if (next - now <= SH_QWAIT) sound = next;
  }
  if (t->nh < SH_MAXHITS) {
    sh_hit *h = &t->hits[t->nh++];
    h->cents = cents; h->vel = (int)fclamp(vel, 1.0, 127.0); h->imp = imp; h->goo = goo; h->pane = pane; h->wall = wall;
    h->at_ms = now; h->sound_ms = sound;
    h->grid_ms = fmin2(fabs(sound - prev), fabs(next - sound));
    h->hit_grid_ms = fmin2(fabs(now - prev), fabs(next - now));
    h->ball = ball;
  }
}

/* knock a bouncing ball a little off its angle; its speed stays */
static void jitter(sh_tank *t, sh_ball *b) {
  if (t->s.chaos <= 0.0) return;
  double sp = sqrt(b->vx * b->vx + b->vy * b->vy);
  double a = atan2(b->vy, b->vx) + (rnd(t) - 0.5) * t->s.chaos * 2.2;
  b->vx = cos(a) * sp; b->vy = sin(a) * sp;
}

/* down, as the leaning box feels it: x, y, z per unit */
static void gravity(const sh_tank *t, double gv[3]) {
  double ux = cos(t->phi), uy = sin(t->phi);
  double th = 0.3 + 0.34 * (0.5 - 0.5 * cos(t->phi * 0.5));   /* 16 bars to lean all the way in, 16 back */
  double c = cos(th), s = sin(th), k = 1.0 - c;
  gv[0] = ux * uy * k; gv[1] = c + uy * uy * k; gv[2] = -ux * s;
}

/* the front and back panes: the back plays the chord's root, the front a chord tone an octave up */
static void hit_pane(sh_tank *t, sh_ball *b, int back, double now) {
  if (now - b->last_pane < 140.0) return;
  b->last_pane = now;
  if (!sh_tank_inside(t, b->x, b->y)) return;
  int rd = t->home_root_deg; double c;
  if (back) c = cents_for_degree(t, rd);
  else { b->pane_n++; c = cents_for_degree(t, rd + (b->pane_n % 2 == 1 ? 2 : 4)) + 1200.0; }
  trigger(t, c, 0.35, 0.0, 1, -1, now, b->id);
  sh_goo_splash(&t->goo, b->x, b->y, back ? 0.97 : 0.03, 0.0, -1.0, &t->rng);
}

/* ---- PORTAL SPACE (the web's wormPlace, wormTick, wormAt, wormEnter, wormExit, wormPull) ----
 * Two round wormholes, each on a wall. On every beat each glides to a neighbouring wall (the slide takes the first 60%
 * of the beat, eased, then it rests), shrinking to slip round the corner. A ball that meets one is drawn in, gone for
 * half a beat, and the OTHER hole (wherever it has got to) spits it out at the same speed, its heading carried across,
 * ringing the wall it comes out of. Near a hole a ball heading for its wall bends toward it. The goo stays put. */
#define WORM_MAX fmin2(84.0, SH_TBOXD * 0.24)   /* a hole's full radius, px: about one wall hit in eight goes through */
static double smooth01(double x) { x = fclamp(x, 0.0, 1.0); return x * x * (3 - 2 * x); }
/* b in rests (worm_hold beats each): the glide takes the first 0.6 of a beat, eased, then it rests the rest */
static double worm_glide(double b, int hold) { double f = b - floor(b), k = fmin2(1.0, f * (double)hold / 0.6); return k * k * (3 - 2 * k); }
static double worm_dur(const sh_tank *t) { return fmax2(240.0, fmin2(520.0, 30000.0 / t->bpm)); }   /* half a beat */
static int worm_next(sh_tank *t, sh_worm *P, int other) {
  int n = t->n; if (n < 2) return P->at;
  int nb[2] = { (P->at + 1) % n, (P->at + n - 1) % n }, pick[2], np = 0;
  for (int i = 0; i < 2; i++) if (nb[i] != other) pick[np++] = nb[i];
  if (!np) { pick[0] = nb[0]; pick[1] = nb[1]; np = 2; }
  int fwd = (P->at + P->dir + n) % n, has = 0;
  for (int i = 0; i < np; i++) if (pick[i] == fwd) has = 1;
  if (has && rnd(t) < 0.75) return fwd;
  P->dir = -P->dir; int back = (P->at + P->dir + n) % n;
  for (int i = 0; i < np; i++) if (pick[i] == back) return back;
  return pick[0];
}
/* a point on the walls for a hole gliding from the middle of wall from to the middle of wall at (k = 0..1 of the way) */
static void worm_place(sh_tank *t, sh_worm *P, double k) {
  int n = t->n, A = P->from, B = P->at; const sh_wall *ea = &t->walls[A % n], *eb = &t->walls[B % n], *e; double tt;
  int fwd = (A + 1) % n == B % n, back = (A + n - 1) % n == B % n;
  if (A == B || (!fwd && !back)) { e = eb; tt = 0.5; }
  else if (k < 0.5) { e = ea; tt = fwd ? 0.5 + k : 0.5 - k; }
  else { e = eb; tt = fwd ? k - 0.5 : 1.5 - k; }
  double L = hypot(e->bx - e->ax, e->by - e->ay); if (L == 0.0) L = 1.0;
  P->x = e->ax + (e->bx - e->ax) * tt - SH_TCX; P->y = e->ay + (e->by - e->ay) * tt - SH_TCY; P->z = P->za + (P->zb - P->za) * k;
  P->n[0] = e->nx; P->n[1] = e->ny; P->n[2] = 0.0; P->t1[0] = (e->bx - e->ax) / L; P->t1[1] = (e->by - e->ay) / L; P->t1[2] = 0.0;
  P->wall = (int)(e - t->walls); P->cents = e->cents;
  double lim = fmin2(fmin2(tt * L, (1 - tt) * L), SH_TBOXD / 2 - fabs(P->z));
  double room = fmin2(WORM_MAX, lim * 0.92 + 0.001);
  P->want = e->broken ? 0.0 : room * smooth01(lim / (room * 1.2));
}
/* ---- the FM-1's portals (worm_pop; Flah 2026-11-20: "the portals are too small for most notes to even make it through,
 * and add them to more of the walls, have them come in and out on diff walls not just opposite side of each other ...
 * more fun and chaotic while still keeping the timing on the arps tight"). SH_NWORM holes, each half again as wide as
 * the web's (up to 0.36 of the box's depth, 126 px), each living a few beats on one wall, then closing and popping open
 * on a random wall no other hole is on (the lives staggered, so some are always open). A ball that goes in comes out of
 * another open hole, picked at random, ON A GRID LINE: its trip is timed to end on the first sixteenth at least 180 ms
 * away, and the note it rings coming out is held onto that line by quantize. */
#define WORM_POP_MAX fmin2(126.0, SH_TBOXD * 0.36)
static double worm_life_beats(const sh_tank *t) { return fmax2(2.0, (double)t->s.worm_hold * 0.5); }
static void worm_pop_place(sh_tank *t, sh_worm *P, double open) {
  int n = t->n; const sh_wall *e = &t->walls[P->at % n]; double tt = P->tt;
  double L = hypot(e->bx - e->ax, e->by - e->ay); if (L == 0.0) L = 1.0;
  P->x = e->ax + (e->bx - e->ax) * tt - SH_TCX; P->y = e->ay + (e->by - e->ay) * tt - SH_TCY; P->z = P->zb;
  P->n[0] = e->nx; P->n[1] = e->ny; P->n[2] = 0.0; P->t1[0] = (e->bx - e->ax) / L; P->t1[1] = (e->by - e->ay) / L; P->t1[2] = 0.0;
  P->wall = P->at % n; P->cents = e->cents;
  double lim = fmin2(fmin2(tt * L, (1 - tt) * L), SH_TBOXD / 2 - fabs(P->z));
  P->want = e->broken ? 0.0 : fmin2(WORM_POP_MAX, lim * 0.92 + 0.001) * open;
}
static void worm_pop_move(sh_tank *t, int i) {   /* a new life: a random wall no other hole is on (and not its last) */
  sh_worm *P = &t->worm[i]; int n = t->n, free_w[SH_MAXWALLS], nf = 0;
  int open_n = n - 1 < t->worm_n ? n - 1 : t->worm_n;   /* (the shut ones do not count) */
  for (int w = 0; w < n; w++) { int used = w == P->at && n > open_n + 1; for (int j = 0; j < open_n; j++) if (j != i && t->worm[j].at == w) used = 1;
    if (!used && !t->walls[w].broken) free_w[nf++] = w; }
  if (nf) P->at = free_w[(int)(rnd(t) * nf) % nf];
  P->from = P->at; P->tt = 0.4 + rnd(t) * 0.2; P->za = P->zb = (rnd(t) * 2 - 1) * 0.1 * SH_TBOXD;   /* (near the middle: room to open wide) */
}
static void worm_pop_tick(sh_tank *t, double now, int on) {
  double life = worm_life_beats(t), beats = now / 60000.0 * t->bpm;
  /* at most a hole fewer than the walls is open (a triangle: 2, a square: 3), so a hole always has a free wall to go to;
   * the rest stay shut, each still on a wall (a hole on walls[-1]: the triangle's ball out of the tank, stucktest) */
  int open_n = t->n - 1 < t->worm_n ? t->n - 1 : t->worm_n;
  if (t->s.worm_max > 0 && open_n > t->s.worm_max) open_n = t->s.worm_max;
  if (t->worm_key != t->n) { t->worm_key = t->n; for (int i = 0; i < t->worm_n; i++) { t->worm[i].at = i % t->n; t->worm[i].life = -1; t->worm[i].tt = 0.5; t->worm[i].za = t->worm[i].zb = 0.0; } }
  for (int i = 0; i < t->worm_n; i++) { sh_worm *P = &t->worm[i];
    if (i >= open_n) { if (P->at < 0 || P->at >= t->n) P->at = i % t->n; worm_pop_place(t, P, 0.0); continue; }
    double b = beats / life + (double)i / (double)t->worm_n; int64_t lb = (int64_t)floor(b); double f = b - floor(b);
    double edge = 0.3 / life;   /* a third of a beat to open, and to close (done a third of a beat before its life ends) */
    if (P->at < 0 || (lb != P->life && P->rad < SH_BR)) { P->life = lb; worm_pop_move(t, i); }   /* it moves only when shut */
    double open = lb != P->life ? 0.0 : smooth01(f / edge) * smooth01((1.0 - edge - f) / edge);
    if (on) worm_pop_place(t, P, open); else P->want = 0.0; }
}
/* the first grid line at least 180 ms from now: when a trip through a hole ends */
static double worm_grid_end(const sh_tank *t, double now) {
  double g = t->last_tick; uint64_t c = t->tick_count;
  for (int k = 0; k < 64 && g < now + 180.0; k++) g += tick_interval(t, c++);
  return g;
}
/* the hole a ball goes out of: another open one, at random (none: -1, it backs out of its own) */
static int worm_pick_out(sh_tank *t, int in) {
  int c[SH_NWORM], nc = 0;
  for (int j = 0; j < t->worm_n; j++) if (j != in && t->worm[j].want >= SH_BR * 1.6 && t->worm[j].rad >= SH_BR * 1.2) c[nc++] = j;
  return nc ? c[(int)(rnd(t) * nc) % nc] : -1;
}
/* once a tick, before the balls move: are there wormholes, where are they, how open */
static void worm_tick(sh_tank *t, double now) {
  int on = t->s.space == SH_SPACE_PORTAL; t->worm_on = on;
  t->worm_open += ((on ? 1.0 : 0.0) - t->worm_open) * 0.06; if (!on && t->worm_open < 0.01) t->worm_open = 0.0;
  if (!on && t->worm_open == 0.0) { for (int i = 0; i < t->worm_n; i++) { t->worm[i].rad = 0.0; t->worm[i].suck *= 0.9; t->worm[i].spit *= 0.9; } return; }
  if (t->s.worm_pop) {
    worm_pop_tick(t, now, on);
    for (int i = 0; i < t->worm_n; i++) { sh_worm *P = &t->worm[i]; P->rad += (P->want * t->worm_open - P->rad) * 0.25; P->suck *= 0.9; P->spit *= 0.93; P->pre = 0.0; }
    for (int i = 0; i < t->nb; i++) { const sh_ball *bl = &t->balls[i]; if (!bl->warp || bl->wb < 0) continue;
      double left = bl->wt0 + bl->wdur - now; sh_worm *Q = &t->worm[bl->wb];
      if (left < 160) Q->pre = fmax2(Q->pre, fmin2(1.0, 1 - left / 160)); }
    return;
  }
  double b = now / 60000.0 * t->bpm / (double)t->s.worm_hold; int64_t fb = (int64_t)floor(b); int n = t->n;
  if (t->worm_key != n) { t->worm_key = n; t->worm_beat = fb;   /* a new shape: the two holes start on opposite sides */
    for (int i = 0; i < 2; i++) { sh_worm *P = &t->worm[i]; P->from = P->at = i == 0 ? 0 : (n / 2 < n - 1 ? n / 2 : n - 1); P->dir = i ? -1 : 1; P->za = P->zb = (i ? -0.12 : 0.12) * SH_TBOXD; } }
  if (fb != t->worm_beat) { int64_t d = fb - t->worm_beat; int steps = (int)(d < 0 ? -d : d); if (steps > 4) steps = 4; t->worm_beat = fb;
    for (int s = 0; s < steps; s++) for (int i = 0; i < 2; i++) { sh_worm *P = &t->worm[i];   /* a new beat: each sets off for a neighbour */
      P->from = P->at; P->za = P->zb; P->at = worm_next(t, P, t->worm[1 - i].at); P->zb = (rnd(t) * 2 - 1) * 0.26 * SH_TBOXD; } }
  double k = worm_glide(b, t->s.worm_hold);
  for (int i = 0; i < 2; i++) { if (on) worm_place(t, &t->worm[i], k); else t->worm[i].want = 0.0; }
  sh_worm *A = &t->worm[0], *B = &t->worm[1];   /* the two never overlap: on the same wall they make room */
  double dx = A->x - B->x, dy = A->y - B->y, dz = A->z - B->z, d = sqrt(dx * dx + dy * dy + dz * dz);
  if (d < A->want + B->want + 6) { double s = A->want + B->want; double kk = fmax2(0.0, (d - 6) / (s != 0.0 ? s : 1.0)); A->want *= kk; B->want *= kk; }
  for (int i = 0; i < 2; i++) { sh_worm *P = &t->worm[i]; P->rad += (P->want * t->worm_open - P->rad) * 0.25; P->suck *= 0.9; P->spit *= 0.93; P->pre = 0.0; }
  for (int i = 0; i < t->nb; i++) { const sh_ball *bl = &t->balls[i]; if (!bl->warp) continue;   /* the far hole swells a moment before it spits */
    double left = bl->wt0 + bl->wdur - now; sh_worm *Q = &t->worm[bl->wb];
    if (left < 160) Q->pre = fmax2(Q->pre, fmin2(1.0, 1 - left / 160)); }
}
/* is a ball touching wall idx at box-local (x, y, z) inside one of the holes on it? */
static sh_worm *worm_at(sh_tank *t, int idx, double x, double y, double z) {
  if (!t->worm_on) return 0;
  for (int i = 0; i < t->worm_n; i++) { sh_worm *P = &t->worm[i]; if (P->rad < SH_BR * 1.2 || P->wall != idx) continue;
    double dx = x - P->x, dy = y - P->y, dz = z - P->z, dn = dx * P->n[0] + dy * P->n[1] + dz * P->n[2];
    double ax = dx - dn * P->n[0], ay = dy - dn * P->n[1], az = dz - dn * P->n[2], m = P->rad - SH_BR * 0.3;
    if (ax * ax + ay * ay + az * az < m * m) return P; }
  return 0;
}
/* in: the ball leaves the tank's physics until it comes out of the other hole */
static void worm_enter(sh_tank *t, sh_ball *b, sh_worm *P, double vx, double vy, double vz, double now) {
  b->warp = 1; b->wa = (int)(P - t->worm); b->wt0 = now; b->wdur = worm_dur(t); b->wb = 1 - b->wa;
  if (t->s.worm_pop) { b->wb = worm_pick_out(t, b->wa); b->wdur = worm_grid_end(t, now) - now; }   /* out of another, on the grid */
  b->wc[0] = P->x; b->wc[1] = P->y; b->wc[2] = P->z;
  for (int j = 0; j < 3; j++) { b->wn[j] = P->n[j]; b->wt1[j] = P->t1[j]; }
  b->wv[0] = vx; b->wv[1] = vy; b->wv[2] = vz; b->wspd = sqrt(vx * vx + vy * vy + vz * vz); if (b->wspd == 0.0) b->wspd = ball_speed(t);
  P->suck = 1.0;
  if (P->wall >= 0) t->walls[P->wall].flash = fmax2(t->walls[P->wall].flash, 0.5);
}
/* out: carried across, A's frame to B's, and spat out of B along its wall's inward normal. 0 = not yet (B opening) */
static int worm_exit(sh_tank *t, sh_ball *b, int force, double now) {
  if (t->s.worm_pop && t->worm_on && (b->wb < 0 || t->worm[b->wb].rad < SH_BR * 1.2)) b->wb = worm_pick_out(t, b->wa);   /* its hole closed: another */
  sh_worm *Q = &t->worm[b->wb < 0 ? b->wa : b->wb], back;
  if (t->s.worm_pop && (b->wb < 0 || !t->worm_on)) {   /* none open: back out of its own hole, where that is NOW (the walls
                                                        * turn while it is away: where it went in may be outside them by
                                                        * now; stucktest: 568 ball-ticks outside a shut tank) */
    back = t->worm[b->wa]; back.rad = SH_BR * 2; back.wall = -1; back.cents = NAN; back.spit = 0; Q = &back; }
  if (!force && !t->s.worm_pop && t->worm_on && Q->rad < SH_BR * 1.6 && now - b->wt0 < b->wdur + 700) return 0;   /* B squeezing round a corner */
  if (!t->worm_on || Q->rad < SH_BR * 1.2) {   /* no other hole: back out of the one it went in */
    back.x = b->wc[0]; back.y = b->wc[1]; back.z = b->wc[2]; for (int j = 0; j < 3; j++) { back.n[j] = b->wn[j]; back.t1[j] = b->wt1[j]; }
    back.rad = SH_BR * 2; back.wall = -1; back.cents = NAN; back.spit = 0; Q = &back; }
  /* the 3D box's side walls carry the heading across only: depth keeps its own speed, between the panes */
  double v0 = b->wv[0], v1 = b->wv[1], spd = sqrt(v0 * v0 + v1 * v1); if (spd == 0.0) spd = b->wspd;
  double a = -(v0 * b->wn[0] + v1 * b->wn[1]), c1 = v0 * b->wt1[0] + v1 * b->wt1[1], A2 = fmax2(a, 0.55 * spd), off = SH_BR + 1.5;
  double o0 = A2 * Q->n[0] + c1 * Q->t1[0], o1 = A2 * Q->n[1] + c1 * Q->t1[1], o2 = A2 * Q->n[2] + c1 * Q->t1[2];
  double ol = sqrt(o0 * o0 + o1 * o1 + o2 * o2); if (ol == 0.0) ol = 1.0;
  b->x = SH_TCX + Q->x + Q->n[0] * off; b->y = SH_TCY + Q->y + Q->n[1] * off;
  b->z = fclamp((Q->z + Q->n[2] * off) / SH_TBOXD + 0.5, 0.03, 0.97);
  b->vx = o0 / ol * spd; b->vy = o1 / ol * spd; b->vz = b->wv[2] / SH_TBOXD;
  b->warp = 0; b->spit = now; b->last_hit = now;
  Q->spit = 1.0;
  if (Q->wall >= 0) t->walls[Q->wall].flash = 1.0;
  if (!isnan(Q->cents)) trigger(t, Q->cents, 0.85, 0.0, 0, Q->wall, now, b->id);   /* it rings the wall it comes out of */
  sh_goo_splash(&t->goo, b->x, b->y, b->z, Q->n[0], Q->n[1], &t->rng);
  return 1;
}
/* a hole pulls: within a couple of its radii a ball heading for its wall bends toward it */
static void worm_pull(const sh_tank *t, sh_ball *b, double ts) {
  if (!t->worm_on) return;
  double X = b->x - SH_TCX, Y = b->y - SH_TCY, Z = (b->z - 0.5) * SH_TBOXD;
  for (int i = 0; i < t->worm_n; i++) { const sh_worm *P = &t->worm[i]; if (P->rad < SH_BR * 1.2) continue;
    double reach = P->rad * 2.6, dx = P->x - X, dy = P->y - Y, dz = P->z - Z, d = sqrt(dx * dx + dy * dy + dz * dz);
    if (d >= reach || d < 1) continue;
    double vz = b->vz * SH_TBOXD, sp = sqrt(b->vx * b->vx + b->vy * b->vy + vz * vz); if (sp == 0.0) sp = 1.0;
    double head = -(b->vx * P->n[0] + b->vy * P->n[1] + vz * P->n[2]) / sp; if (head <= 0) continue;
    double f = (1 - d / reach) * (1 - d / reach) * head * ts * 0.16;
    b->vx += dx / d * f; b->vy += dy / d * f; b->vz = (vz + dz / d * f) / SH_TBOXD; }
}

/* how far inside wall q (its inward plane, a ball radius in) a ball flying straight is after tt ticks, seen from a
 * shape turning w a tick */
static double room_at(const double q[3], double x0, double y0, const sh_ball *b, double w, double tt) {
  double x = x0 + b->vx * tt, y = y0 + b->vy * tt, a = -w * tt, ca = cos(a), sa = sin(a);
  return q[2] - (q[0] * (x * ca - y * sa) + q[1] * (x * sa + y * ca));
}

/* ticks until this ball next makes a note, flying straight; a spinning shape is walked in its turning frame */
static double hit_ticks(const sh_tank *t, const sh_ball *b) {
  double best = INFINITY;
  if (b->vz != 0.0) {
    double tt = b->vz < 0.0 ? b->z / (-b->vz * b->tq) : (1.0 - b->z) / (b->vz * b->tq);
    if (tt >= 0.0) best = tt;
  }
  double x0 = b->x - SH_TCX, y0 = b->y - SH_TCY;
  double q[SH_MAXWALLS][3]; int m = 0;
  for (int i = 0; i < t->n; i++) {
    const sh_wall *e = &t->walls[i];
    if (e->broken && e->reform < 0.55) continue;
    q[m][0] = -e->nx; q[m][1] = -e->ny; q[m][2] = -((e->ax - SH_TCX) * e->nx + (e->ay - SH_TCY) * e->ny) - SH_BR;
    m++;
  }
  double w = t->rot_v;
  if (fabs(w) < 1e-6) {
    for (int k = 0; k < m; k++) {
      double vn = q[k][0] * b->vx + q[k][1] * b->vy;
      if (vn <= 1e-6) continue;
      double tt = (q[k][2] - (q[k][0] * x0 + q[k][1] * y0)) / vn;
      if (tt >= 0.0 && tt < best) best = tt;
    }
    return best;
  }
  double prev[SH_MAXWALLS];
  for (int k = 0; k < m; k++) prev[k] = room_at(q[k], x0, y0, b, w, 0.0);
  const double DT = 4.0;
  if (t->s.guard) {   /* the device: the same walk, the turn stepped by one rotation (a sine and a cosine a ball, not one a
                       * wall a step: fm1-emu STRICT, 12 turning walls, 6.3 ms a tick before, 2026-11-18) */
    double c1 = cos(-w * DT), s1 = sin(-w * DT), ca = 1.0, sa = 0.0;
    for (double tt = DT; tt <= fmin2(best, 320.0); tt += DT) {
      double nca = ca * c1 - sa * s1; sa = ca * s1 + sa * c1; ca = nca;
      double x = x0 + b->vx * tt, y = y0 + b->vy * tt, rx = x * ca - y * sa, ry = x * sa + y * ca;
      for (int k = 0; k < m; k++) {
        double r = q[k][2] - (q[k][0] * rx + q[k][1] * ry);
        if (prev[k] > 0.0 && r <= 0.0) { double hit = tt - DT * r / (r - prev[k]); if (hit < best) best = hit; }
        prev[k] = r;
      }
    }
    return best;
  }
  for (double tt = DT; tt <= fmin2(best, 320.0); tt += DT) {
    for (int k = 0; k < m; k++) {
      double r = room_at(q[k], x0, y0, b, w, tt);
      if (prev[k] > 0.0 && r <= 0.0) { double hit = tt - DT * r / (r - prev[k]); if (hit < best) best = hit; }
      prev[k] = r;
    }
  }
  return best;
}

/* BEAT LOCK: steer a ball's speed a little (never more than about a fifth) so its next note lands on a grid line */
static void beat_lock(const sh_tank *t, sh_ball *b, double now) {
  double goo_here = sh_goo_density(&t->goo, b->x, b->y, b->z);   /* a ball in the goo is not steered */
  if (!t->s.quantize || !t->playing || goo_here > 0.3) { b->tq += (1.0 - b->tq) * 0.2; b->tg = 0.0; return; }
  b->bl++;
  if (b->bl % 2 == 1) return;   /* every other tick is plenty (every tick on the FM-1 put the 16-ball tank's physics level with its drawing) */
  double tq = b->tq, n = hit_ticks(t, b);
  if (!(n < 1e5)) { b->tq = tq + (1.0 - tq) * 0.2; b->tg = 0.0; return; }
  if (n < 4.0) return;          /* too close to steer smoothly: hold course */
  double left = n * SH_FIXED, t_hit = now + left;
  double cnt = fmin2(2.0 + ceil((left * 1.4) / fmax2(tick_interval(t, t->tick_count), 30.0)), 400.0);
  int count = (int)cnt;
#define WANT(g) (tq * left / fmax2((g) - now, 1.0))
  /* the FM-1 bends further (0.7..1.4 of the tempo's speed, the web 0.8..1.22) and harder, so a bounce lands within a tick
   * of a grid line; the bend still eases in over a few ticks, a ball drifting faster or slower, never jumping */
  const double reach = t->s.guard ? 0.4 : 0.22, lo = t->s.guard ? 0.7 : 0.8, hi = t->s.guard ? 1.4 : 1.22, gain = t->s.guard ? 0.42 : 0.35;   /* (0.42 every other tick: 0.5 there threw a corner rattle too many, stucktest 7 bursts) */
  double tg = (b->tg != 0.0 && b->tg > now + SH_FIXED * 3.0 && fabs(WANT(b->tg) - 1.0) < reach) ? b->tg : 0.0;
  if (tg == 0.0) {
    double bd = 1e9, g = t->last_tick; uint64_t c = t->tick_count;
    for (int i = 0; i < count; i++) {
      g += tick_interval(t, c); c++;
      if (g <= now + SH_FIXED * 2.0) continue;
      double w = WANT(g), d = fabs(log(w));
      if (fabs(w - 1.0) < reach && d < bd) { bd = d; tg = g; }
      if (g > t_hit + left) break;
    }
  }
  if (tg == 0.0) { b->tq = tq + (1.0 - tq) * 0.2; return; }
  b->tg = tg;
  b->tq = tq + (fclamp(WANT(tg), lo, hi) - tq) * gain;
#undef WANT
}

/* a gentle, floaty ball, leaned toward the wall that plays the melody's next note (the web's autoMelodyNote) */
static void auto_melody_note(sh_tank *t, int strong) {
  int len = t->s.scale->n, root = t->home_root_deg;
  int deg = sh_melody_next(&t->melody, strong, len, root, rnd_cb, &t->rng);
  double cents = cents_for_degree(t, deg);
  int td = total_degrees(t);
  int oct = (int)floor(cents / 1200.0), top = (int)ceil((double)td / (double)len) - 1;
  if (oct > top) oct = top;
  if (oct < 0) oct = 0;
  int dd = oct * len + sh_deg_of(t->s.scale, cents); if (dd > td - 1) dd = td - 1;   /* the note-wall we lean toward */
  t->aim_deg = dd;
  double ang = t->rot - FRAC_PI_2 + (((double)dd + 0.5) / (double)td) * TAU + (rnd(t) - 0.5) * 1.4;
  double sp = ball_speed(t) * (0.45 + rnd(t) * 0.3);
  double r0 = SH_TR * 0.14 * rnd(t);
  if (t->nb >= SH_MAXBALLS) return;   /* full: skip this note, the open walls let old ones go */
  double vz = 0.003 + rnd(t) * 0.004;
  if (sh_tank_add_ball_at(t, SH_TCX + cos(ang) * r0, SH_TCY + sin(ang) * r0, 0.02, cos(ang) * sp, sin(ang) * sp, vz)) t->balls[t->nb - 1].autob = 1;
}

/* the room (the guard): the auto balls in the tank; the oldest melts into the goo, quietly */
static int auto_count(const sh_tank *t) { int k = 0; for (int i = 0; i < t->nb; i++) if (t->balls[i].autob && !t->balls[i].warp) k++; return k; }
static void melt_oldest_auto(sh_tank *t) {
  for (int i = 0; i < t->nb; i++) {
    const sh_ball *b = &t->balls[i];
    if (!b->autob || b->warp) continue;
    sh_goo_splash(&t->goo, b->x, b->y, b->z, 0.0, -1.0, &t->rng);
    for (int k = i + 1; k < t->nb; k++) t->balls[k - 1] = t->balls[k];
    t->nb--; t->melted++;
    return;
  }
}
/* once a bar: each auto ball's notes a bar in THIS shape at THIS tempo, over the last 8 bars, and the room that makes
 * the web's aim of about 8 notes a bar (more in a big shape, fewer in a small one: autoAim) */
static void room_bar(sh_tank *t) {
  t->r_hits[t->r_n % 8u] = t->a_hits; t->r_bticks[t->r_n % 8u] = t->a_bticks; t->r_n++;
  t->a_hits = t->a_bticks = 0;
  if (t->r_n < 4u || t->r_n % 4u) return;
  uint32_t m = t->r_n < 8u ? t->r_n : 8u; double h = 0.0, bt = 0.0;
  for (uint32_t i = 0; i < m; i++) { h += t->r_hits[i]; bt += t->r_bticks[i]; }
  double bar_ticks = 240000.0 / fmax2(t->bpm, 1.0) / SH_FIXED, ball_bars = bt / bar_ticks;
  if (ball_bars < 1.0 || h <= 0.0) return;
  double area = 0.0; for (int i = 0; i < t->n; i++) { int j = (i + 1) % t->n; area += t->vx[i] * t->vy[j] - t->vx[j] * t->vy[i]; }
  double hex = 1.5 * sqrt(3.0) * SH_TR * SH_TR, aim = 8.0 * fclamp(cbrt(fabs(area) * 0.5 / hex), 0.75, 1.25) * (t->s.busy > 0.0 ? t->s.busy : 1.0);
  int room = (int)(aim / (h / ball_bars) + 0.5);
  t->room = room < 1 ? 1 : room > 7 ? 7 : room;
}

/* the slime's auto-notes: one roll a beat, a strong beat every other one, only while the air is fairly clear */
static void auto_notes(sh_tank *t, double now) {
  double beat = 60000.0 / fmax2(t->bpm, 40.0);
  double next = (t->has_mel_next && now - t->mel_next <= beat * 4.0) ? t->mel_next : now;   /* (re)start without a burst */
  while (now >= next) {
    int strong = t->mel_step_n % 2 == 0;
    if (t->s.guard) { int a = auto_count(t); if (a > t->room) melt_oldest_auto(t); else if (a < t->room && t->nb < 7) { double roll = rnd(t); if (roll < (strong ? 0.6 : 0.22)) auto_melody_note(t, strong); } }
    else if (t->nb < 7) { double roll = rnd(t); if (roll < (strong ? 0.6 : 0.22)) auto_melody_note(t, strong); }
    t->mel_step_n++;
    next += beat;
  }
  t->has_mel_next = 1; t->mel_next = next;
}

/* THE GUARD (s.guard, the FM-1): does this wall hit ring? Two that don't: a note that has slowed to a crawl (under a
 * fifth of the tempo's speed: it sank in a full goo, nothing to strike with), and a rattle (a third wall hit inside
 * 250 ms, or a fourth inside 600 ms, at 100 bpm: wedged in a corner), which instead throws the note back toward the
 * middle at the tempo's speed, so it floats off the wall instead of ringing it sixteen times a second (stucktest.c).
 * sp_in: its speed before the hit. */
static int guard_silent(sh_tank *t, sh_ball *b, double sp_in, double now) {
  double ts = ball_speed(t), win = 100.0 / fmax2(t->bpm, 40.0);
  b->rat[b->rat_n % 4u] = now; b->rat_n++;
  if ((b->rat_n >= 4u && now - b->rat[b->rat_n % 4u] < 600.0 * win) || (b->rat_n >= 3u && now - b->rat[(b->rat_n + 1u) % 4u] < 250.0 * win)) {
    double a = atan2(SH_TCY - b->y, SH_TCX - b->x) + (rnd(t) - 0.5) * 0.8;
    b->vx = cos(a) * ts; b->vy = sin(a) * ts; b->rat_n = 0; b->still = 0; t->thrown++;
    return 1;
  }
  return sp_in < 0.2 * ts;
}

/* the web's spinContain: after the shape turns by w (radians), a wall that swept into a note pushes it back inside and
 * throws it with the speed that part of the wall moves at; a note a corner swept past is brought back in */
static void spin_contain(sh_tank *t, double w, double now) {
  double ts = ball_speed(t); int open = 0;
  for (int i = 0; i < t->n; i++) if (t->walls[i].broken && t->walls[i].reform < 0.55) open = 1;
  for (int bi = 0; bi < t->nb; bi++) {
    sh_ball *b = &t->balls[bi];
    if (b->warp) continue;
    for (int wi = 0; wi < t->n; wi++) {
      const sh_wall *e = &t->walls[wi];
      if (e->broken && e->reform < 0.55) continue;
      double dist = (b->x - e->ax) * e->nx + (b->y - e->ay) * e->ny;
      if (dist >= SH_BR) continue;
      double ex = e->bx - e->ax, ey = e->by - e->ay, l2 = ex * ex + ey * ey; if (l2 == 0.0) l2 = 1.0;
      double tt = ((b->x - e->ax) * ex + (b->y - e->ay) * ey) / l2;
      if (tt < -0.15 || tt > 1.15) continue;
      double cx = b->x - dist * e->nx - SH_TCX, cy = b->y - dist * e->ny - SH_TCY, ux = -w * cy, uy = w * cx;
      double vn = (b->vx - ux) * e->nx + (b->vy - uy) * e->ny, sp_in = sqrt(b->vx * b->vx + b->vy * b->vy);
      b->x += (SH_BR - dist) * e->nx; b->y += (SH_BR - dist) * e->ny;
      int pushing = b->sw_wall == wi && now - b->sw_t < 300.0;   /* the same wall still pushing it: one long push, one note */
      b->sw_wall = wi; b->sw_t = now;
      if (vn < 0.0) {
        b->vx -= 2.0 * vn * e->nx; b->vy -= 2.0 * vn * e->ny; t->walls[wi].flash = 1.0;
        if (!pushing && !guard_silent(t, b, sp_in, now) && now - b->last_hit > 60.0) {
          b->last_hit = now; if (b->autob) t->a_hits++;
          trigger(t, e->cents, fmin2(fabs(vn) / (ts == 0.0 ? 1.0 : ts), 1.0), 0.0, 0, wi, now, b->id);
          sh_goo_splash(&t->goo, b->x, b->y, b->z, e->nx, e->ny, &t->rng);
        }
      }
    }
    if (!open && !sh_tank_inside(t, b->x, b->y))
      for (int i = 0; i < 8 && !sh_tank_inside(t, b->x, b->y); i++) { b->x = SH_TCX + (b->x - SH_TCX) * 0.9; b->y = SH_TCY + (b->y - SH_TCY) * 0.9; }
  }
}

static void step(sh_tank *t, double now) {
  int k = 0;
  for (int i = 0; i < t->nb; i++) {
    const sh_ball *b = &t->balls[i];
    if (isfinite(b->x) && isfinite(b->y) && isfinite(b->vx) && isfinite(b->vy)) t->balls[k++] = *b;
  }
  t->nb = k;
  if (t->nb > SH_MAXBALLS) { int any = 0; for (int i = 0; i < t->n; i++) if (t->walls[i].broken) any = 1; if (!any) break_wall(t); }
  /* gravity: a whisper, just enough drift that a full tank feels a touch heavier, never a fall */
  double g = sh_goo_settle(&t->goo) * 0.09, ts = ball_speed(t), gy = g * 0.55;
  for (int bi = t->nb - 1; bi >= 0; bi--) {
    sh_ball b = t->balls[bi];
    if (b.warp) {   /* in the other dimension: no physics until the far hole spits it out */
      if (!t->worm_on || now - b.wt0 >= b.wdur || (t->s.worm_pop && b.wt0 + b.wdur - now < SH_FIXED))   /* (pop: on the tick before its grid line,
                                                                                         * so quantize holds its note onto the line) */
        worm_exit(t, &b, !t->worm_on, now);
      t->balls[bi] = b; continue; }
    b.vy += gy;
    if (b.vy > ts * 1.6) b.vy = ts * 1.6;
    /* substep so a fast ball can never leap past a wall: at most half a radius per micro-step */
    double dist0 = sqrt(b.vx * b.vx + b.vy * b.vy), sc = ceil(dist0 / (SH_BR * 0.5));
    int sub = !(sc >= 1.0) ? 1 : sc > 8.0 ? 8 : (int)sc;
    double isub = 1.0 / (double)sub;
    int killed = 0, warped = 0;
    for (int s = 0; s < sub; s++) {
      b.x += b.vx * isub; b.y += b.vy * isub;
      int hit_wall = 0;
      for (int wi = 0; wi < t->n; wi++) {
        sh_wall e = t->walls[wi];
        if (e.broken && e.reform < 0.55) continue;
        double dist = (b.x - e.ax) * e.nx + (b.y - e.ay) * e.ny;
        if (dist >= SH_BR) continue;
        double ex = e.bx - e.ax, ey = e.by - e.ay;
        double l2 = ex * ex + ey * ey; if (l2 == 0.0) l2 = 1.0;
        double tt = ((b.x - e.ax) * ex + (b.y - e.ay) * ey) / l2;
        if (!(tt >= -0.05 && tt <= 1.05)) continue;   /* past a corner: corners stay open to escape */
        double vn = b.vx * e.nx + b.vy * e.ny;
        if (vn < 0.0 && t->worm_on) {   /* a wormhole on this wall: in it goes */
          sh_worm *W = worm_at(t, wi, b.x - SH_TCX - dist * e.nx, b.y - SH_TCY - dist * e.ny, (b.z - 0.5) * SH_TBOXD);
          if (W) { worm_enter(t, &b, W, b.vx, b.vy, b.vz * SH_TBOXD, now); hit_wall = 1; break; } }
        if (vn < 0.0) {
          double sp_in = t->s.guard ? sqrt(b.vx * b.vx + b.vy * b.vy) : 0.0;
          hit_wall = 1;
          b.vx -= 2.0 * vn * e.nx; b.vy -= 2.0 * vn * e.ny;
          jitter(t, &b);
          b.x += (SH_BR - dist) * e.nx; b.y += (SH_BR - dist) * e.ny;
          t->walls[wi].flash = 1.0;
          if (t->s.guard && guard_silent(t, &b, sp_in, now)) continue;
          if (now - b.last_hit > 60.0) {
            b.last_hit = now;
            /* a goo-slathered hit rings softer and rounder */
            double gd = sh_goo_density(&t->goo, b.x, b.y, b.z);
            int under = gd > 0.3;
            double depth = under ? fmin2((gd - 0.3) / 0.6, 1.0) : 0.0;
            if (under && b.visc == 0.0) b.visc = 0.80 + rnd(t) * 0.12;
            double goo = under ? fmin2((0.35 + 0.65 * depth) * ((1.0 - b.visc) / 0.2), 1.0) : 0.0;
            double imp = fmin2(fabs(vn) / (ts == 0.0 ? 1.0 : ts), 1.0) * (1.0 - goo * 0.45);
            trigger(t, e.cents, imp, goo, 0, wi, now, b.id);
            if (b.autob) t->a_hits++;
            sh_goo_splash(&t->goo, b.x, b.y, b.z, e.nx, e.ny, &t->rng);   /* the note's drops join the pool */
          }
        }
      }
      if (b.warp) { warped = 1; break; }
      /* a ball that truly left through an open gap and wandered off is gone */
      if (!hit_wall && !sh_tank_inside(t, b.x, b.y) && (b.x < -80.0 || b.x > SH_TW + 80.0 || b.y < -80.0 || b.y > SH_TH + 80.0)) {
        killed = 1; break;
      }
    }
    if (killed) { for (int i = bi + 1; i < t->nb; i++) t->balls[i - 1] = t->balls[i]; t->nb--; continue; }
    if (warped) { t->balls[bi] = b; continue; }
    /* the third dimension: between the front and the back pane */
    if (b.vz != 0.0) {
      if (g > 0.0) { double gv[3]; gravity(t, gv); b.vx += gv[0] * gy; b.vz += gv[2] * gy / SH_TBOXD; }   /* the tilted box leans balls toward a pane */
      b.vz = fclamp(b.vz, -0.012, 0.012);
      if (fabs(b.vz) < 0.0015) b.vz = b.vz < 0.0 ? -0.0015 : 0.0015;   /* never parked against the glass */
      b.z += b.vz * b.tq;
      if (b.z < 0.0) { b.z = -b.z; b.vz = -b.vz; hit_pane(t, &b, 0, now); }
      else if (b.z > 1.0) { b.z = 2.0 - b.z; b.vz = -b.vz; hit_pane(t, &b, 1, now); }
    }
    /* steady tempo speed, give or take beat lock's little steer onto the grid */
    worm_pull(t, &b, ts);
    beat_lock(t, &b, now);
    double tsb = ts * b.tq;
    double sp = sqrt(b.vx * b.vx + b.vy * b.vy); if (sp == 0.0) sp = 1.0;
    double kk = (tsb / sp) * (1.0 - g) + g;
    b.vx *= kk; b.vy *= kk;
    if (g > 0.0) { b.vx *= 1.0 - g * 0.06; b.vy *= 1.0 - g * 0.015; }   /* they land and settle instead of skating */
    /* a ball wading through the goo drags at its own rate, deeper = thicker */
    double gd = sh_goo_density(&t->goo, b.x, b.y, b.z);
    if (gd > 0.3) {
      if (b.visc == 0.0) b.visc = 0.68 + rnd(t) * 0.16;
      double depth = fmin2((gd - 0.3) / 0.6, 1.0);
      double drag = fmax2(1.0 - (1.0 - b.visc) * (0.8 + 1.3 * depth), 0.55);
      b.vx *= drag; b.vy *= drag;
      if (b.vz != 0.0) b.vz *= drag;
    }
    if (t->s.guard) {   /* a note that has crawled for 1.5 s has come to rest: it melts into the goo, room for a new one */
      if (sqrt(b.vx * b.vx + b.vy * b.vy) < 0.2 * ts) b.still++; else b.still = 0;
      if (b.still > 90u) {
        sh_goo_splash(&t->goo, b.x, b.y, b.z, 0.0, -1.0, &t->rng);
        for (int i = bi + 1; i < t->nb; i++) t->balls[i - 1] = t->balls[i];
        t->nb--; t->melted++;
        continue;
      }
    }
    t->balls[bi] = b;
  }
}

int sh_tank_tick(sh_tank *t, double now_ms, double bpm, int playing) {
  t->nh = 0;
  t->playing = playing;
  if (!playing) return 0;   /* the clock stopped: the tank is frozen */
  t->bpm = fmax2(bpm, 1.0);
  double now = now_ms;
  t->now = now;
  /* the grid: drift-free, re-anchors if it fell far behind */
  double ti = tick_interval(t, t->tick_count);
  if (now - t->last_tick >= ti) { t->last_tick = now - t->last_tick > ti * 3.0 ? now : t->last_tick + ti; t->tick_count++; }
  /* base spin: the same walls, turned; a struck one keeps its flash */
  if (t->s.spin != 0.0) { double d = t->s.spin * 0.0003; t->rot += d;
    if (t->s.guard && (t->rot > PI || t->rot < -PI)) t->rot -= TAU * floor((t->rot + PI) / TAU);   /* the device: one turn (a sine of a
                                                         * big angle takes libm's slow reduction; the plugin's keeps counting) */
    rebuild(t, 1); t->rot_v = d; if (t->s.guard) spin_contain(t, d, now); }
  else t->rot_v = 0.0;
  if (t->s.auto_notes) auto_notes(t, now);
  if (t->s.guard) t->a_bticks += (uint32_t)auto_count(t);
  worm_tick(t, now);
  step(t, now);
  sh_goo_step(&t->goo, now, t->bpm, t->walls, t->n, t->balls, t->nb, &t->rng);
  /* the view leans round once every 16 bars (the balls' gravity reads it) */
  t->phi += TAU * (SH_FIXED / 1000.0) / (16.0 * fmax2(4.0 * 60.0 / t->bpm, 0.2));
  /* a healing wall fades back in */
  for (int i = 0; i < t->n; i++) {
    sh_wall *e = &t->walls[i];
    if (e->broken && e->reform > 0.0) { e->reform = fmin2(e->reform + 0.007, 1.0); if (e->reform >= 1.0) { e->broken = 0; e->reform = 0.0; } }
    e->flash *= 0.86;
  }
  return t->nh;
}

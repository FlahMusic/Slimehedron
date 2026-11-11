/* The tank in normal space. See tank.h. Mirrors vst/slimehedron-core/src/tank/mod.rs line for line (keep the order of
 * every sum and product: the host test compares the plugin's numbers exactly). */
#include <math.h>
#include "tank.h"

#define TAU       6.283185307179586
#define PI        3.141592653589793
#define FRAC_PI_2 1.5707963267948966

static double rnd(sh_tank *t) { return sh_rng_f(&t->rng); }
static double rnd_cb(void *ctx) { return sh_rng_f((sh_rng *)ctx); }
static double fmin2(double a, double b) { return a < b ? a : b; }
static double fmax2(double a, double b) { return a > b ? a : b; }
static double fclamp(double x, double lo, double hi) { return x < lo ? lo : x > hi ? hi : x; }

sh_tank_settings sh_tank_defaults(void) {
  sh_tank_settings s = { 6, sh_scale_by_id("major"), 2, 0.0625, 0.15, 1, 0.0, 0.12, 1, 100, 12, 94, 1, SH_SPACE_NORMAL };
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
  t->phi = 0.0;
  t->worm_on = 0; t->worm_key = -1; t->worm_beat = 0; t->worm_open = 0.0;
  for (int i = 0; i < 2; i++) { sh_worm *P = &t->worm[i]; P->rad = P->want = P->suck = P->spit = P->pre = 0.0; P->wall = -1; P->from = P->at = 0; P->dir = 1; P->za = P->zb = 0.0; P->x = P->y = P->z = 0.0; }
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
  b->x = x; b->y = y; b->z = z; b->vx = vx; b->vy = vy; b->vz = vz; b->tq = 1.0; b->tg = 0.0; b->bl = 0;
  b->last_hit = -INFINITY; b->last_pane = -INFINITY; b->pane_n = 0; b->visc = 0.0; b->warp = 0; b->spit = -INFINITY;
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
  if (t->wall_bars % 8 == 0) break_wall(t);
  if (t->wall_bars % 24 == 0) repair_wall(t);
}

static double vel_for_hit(sh_tank *t) {
  if (t->s.vel_rand) { double lo = t->s.vel_min, hi = t->s.vel_max; return round(lo + rnd(t) * (hi - lo)); }
  return (double)t->s.vel_fix;
}

/* the level, and whether quantize holds the note for the next grid line */
static void trigger(sh_tank *t, double cents, double imp, double goo, int pane, int wall, double now) {
  double vel = round(vel_for_hit(t) * (1.0 - goo * 0.3));
  if (pane) vel = fmax2(round(vel * 0.62), 1.0);
  double ti = tick_interval(t, t->tick_count), prev = t->last_tick, next = t->last_tick + ti;
  int held = t->s.quantize && goo == 0.0 && now - prev > SH_QLATE && next - now <= SH_QWAIT;
  double sound = held ? next : now;
  if (t->nh < SH_MAXHITS) {
    sh_hit *h = &t->hits[t->nh++];
    h->cents = cents; h->vel = (int)fclamp(vel, 1.0, 127.0); h->imp = imp; h->goo = goo; h->pane = pane; h->wall = wall;
    h->at_ms = now; h->sound_ms = sound;
    h->grid_ms = fmin2(fabs(sound - prev), fabs(next - sound));
    h->hit_grid_ms = fmin2(fabs(now - prev), fabs(next - now));
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
  trigger(t, c, 0.35, 0.0, 1, -1, now);
  sh_goo_splash(&t->goo, b->x, b->y, back ? 0.97 : 0.03, 0.0, -1.0, &t->rng);
}

/* ---- PORTAL SPACE (the web's wormPlace, wormTick, wormAt, wormEnter, wormExit, wormPull) ----
 * Two round wormholes, each on a wall. On every beat each glides to a neighbouring wall (the slide takes the first 60%
 * of the beat, eased, then it rests), shrinking to slip round the corner. A ball that meets one is drawn in, gone for
 * half a beat, and the OTHER hole (wherever it has got to) spits it out at the same speed, its heading carried across,
 * ringing the wall it comes out of. Near a hole a ball heading for its wall bends toward it. The goo stays put. */
#define WORM_MAX fmin2(84.0, SH_TBOXD * 0.24)   /* a hole's full radius, px: about one wall hit in eight goes through */
static double smooth01(double x) { x = fclamp(x, 0.0, 1.0); return x * x * (3 - 2 * x); }
static double worm_glide(double b) { double f = b - floor(b), k = fmin2(1.0, f / 0.6); return k * k * (3 - 2 * k); }
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
/* once a tick, before the balls move: are there wormholes, where are they, how open */
static void worm_tick(sh_tank *t, double now) {
  int on = t->s.space == SH_SPACE_PORTAL; t->worm_on = on;
  t->worm_open += ((on ? 1.0 : 0.0) - t->worm_open) * 0.06; if (!on && t->worm_open < 0.01) t->worm_open = 0.0;
  if (!on && t->worm_open == 0.0) { for (int i = 0; i < 2; i++) { t->worm[i].rad = 0.0; t->worm[i].suck *= 0.9; t->worm[i].spit *= 0.9; } return; }
  double b = now / 60000.0 * t->bpm; int64_t fb = (int64_t)floor(b); int n = t->n;
  if (t->worm_key != n) { t->worm_key = n; t->worm_beat = fb;   /* a new shape: the two holes start on opposite sides */
    for (int i = 0; i < 2; i++) { sh_worm *P = &t->worm[i]; P->from = P->at = i == 0 ? 0 : (n / 2 < n - 1 ? n / 2 : n - 1); P->dir = i ? -1 : 1; P->za = P->zb = (i ? -0.12 : 0.12) * SH_TBOXD; } }
  if (fb != t->worm_beat) { int64_t d = fb - t->worm_beat; int steps = (int)(d < 0 ? -d : d); if (steps > 4) steps = 4; t->worm_beat = fb;
    for (int s = 0; s < steps; s++) for (int i = 0; i < 2; i++) { sh_worm *P = &t->worm[i];   /* a new beat: each sets off for a neighbour */
      P->from = P->at; P->za = P->zb; P->at = worm_next(t, P, t->worm[1 - i].at); P->zb = (rnd(t) * 2 - 1) * 0.26 * SH_TBOXD; } }
  double k = worm_glide(b);
  for (int i = 0; i < 2; i++) { if (on) worm_place(t, &t->worm[i], k); else t->worm[i].want = 0.0; }
  sh_worm *A = &t->worm[0], *B = &t->worm[1];   /* the two never overlap: on the same wall they make room */
  double dx = A->x - B->x, dy = A->y - B->y, dz = A->z - B->z, d = sqrt(dx * dx + dy * dy + dz * dz);
  if (d < A->want + B->want + 6) { double s = A->want + B->want; double kk = fmax2(0.0, (d - 6) / (s != 0.0 ? s : 1.0)); A->want *= kk; B->want *= kk; }
  for (int i = 0; i < 2; i++) { sh_worm *P = &t->worm[i]; P->rad += (P->want * t->worm_open - P->rad) * 0.25; P->suck *= 0.9; P->spit *= 0.93; P->pre = 0.0; }
  for (int i = 0; i < t->nb; i++) { const sh_ball *bl = &t->balls[i]; if (!bl->warp) continue;   /* the far hole swells a moment before it spits */
    double left = bl->wt0 + bl->wdur - now; sh_worm *Q = &t->worm[1 - bl->wa];
    if (left < 160) Q->pre = fmax2(Q->pre, fmin2(1.0, 1 - left / 160)); }
}
/* is a ball touching wall idx at box-local (x, y, z) inside one of the holes on it? */
static sh_worm *worm_at(sh_tank *t, int idx, double x, double y, double z) {
  if (!t->worm_on) return 0;
  for (int i = 0; i < 2; i++) { sh_worm *P = &t->worm[i]; if (P->rad < SH_BR * 1.2 || P->wall != idx) continue;
    double dx = x - P->x, dy = y - P->y, dz = z - P->z, dn = dx * P->n[0] + dy * P->n[1] + dz * P->n[2];
    double ax = dx - dn * P->n[0], ay = dy - dn * P->n[1], az = dz - dn * P->n[2], m = P->rad - SH_BR * 0.3;
    if (ax * ax + ay * ay + az * az < m * m) return P; }
  return 0;
}
/* in: the ball leaves the tank's physics until it comes out of the other hole */
static void worm_enter(sh_tank *t, sh_ball *b, sh_worm *P, double vx, double vy, double vz, double now) {
  b->warp = 1; b->wa = (int)(P - t->worm); b->wt0 = now; b->wdur = worm_dur(t);
  b->wc[0] = P->x; b->wc[1] = P->y; b->wc[2] = P->z;
  for (int j = 0; j < 3; j++) { b->wn[j] = P->n[j]; b->wt1[j] = P->t1[j]; }
  b->wv[0] = vx; b->wv[1] = vy; b->wv[2] = vz; b->wspd = sqrt(vx * vx + vy * vy + vz * vz); if (b->wspd == 0.0) b->wspd = ball_speed(t);
  P->suck = 1.0;
  if (P->wall >= 0) t->walls[P->wall].flash = fmax2(t->walls[P->wall].flash, 0.5);
}
/* out: carried across, A's frame to B's, and spat out of B along its wall's inward normal. 0 = not yet (B opening) */
static int worm_exit(sh_tank *t, sh_ball *b, int force, double now) {
  sh_worm *Q = &t->worm[1 - b->wa], back;
  if (!force && t->worm_on && Q->rad < SH_BR * 1.6 && now - b->wt0 < b->wdur + 700) return 0;   /* B squeezing round a corner */
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
  if (!isnan(Q->cents)) trigger(t, Q->cents, 0.85, 0.0, 0, Q->wall, now);   /* it rings the wall it comes out of */
  sh_goo_splash(&t->goo, b->x, b->y, b->z, Q->n[0], Q->n[1], &t->rng);
  return 1;
}
/* a hole pulls: within a couple of its radii a ball heading for its wall bends toward it */
static void worm_pull(const sh_tank *t, sh_ball *b, double ts) {
  if (!t->worm_on) return;
  double X = b->x - SH_TCX, Y = b->y - SH_TCY, Z = (b->z - 0.5) * SH_TBOXD;
  for (int i = 0; i < 2; i++) { const sh_worm *P = &t->worm[i]; if (P->rad < SH_BR * 1.2) continue;
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
  if (b->bl % 2 == 1) return;   /* every other tick is plenty */
  double tq = b->tq, n = hit_ticks(t, b);
  if (!(n < 1e5)) { b->tq = tq + (1.0 - tq) * 0.2; b->tg = 0.0; return; }
  if (n < 4.0) return;          /* too close to steer smoothly: hold course */
  double left = n * SH_FIXED, t_hit = now + left;
  double cnt = fmin2(2.0 + ceil((left * 1.4) / fmax2(tick_interval(t, t->tick_count), 30.0)), 400.0);
  int count = (int)cnt;
#define WANT(g) (tq * left / fmax2((g) - now, 1.0))
  double tg = (b->tg != 0.0 && b->tg > now + SH_FIXED * 3.0 && fabs(WANT(b->tg) - 1.0) < 0.22) ? b->tg : 0.0;
  if (tg == 0.0) {
    double bd = 1e9, g = t->last_tick; uint64_t c = t->tick_count;
    for (int i = 0; i < count; i++) {
      g += tick_interval(t, c); c++;
      if (g <= now + SH_FIXED * 2.0) continue;
      double w = WANT(g), d = fabs(log(w));
      if (fabs(w - 1.0) < 0.22 && d < bd) { bd = d; tg = g; }
      if (g > t_hit + left) break;
    }
  }
  if (tg == 0.0) { b->tq = tq + (1.0 - tq) * 0.2; return; }
  b->tg = tg;
  b->tq = tq + (fclamp(WANT(tg), 0.8, 1.22) - tq) * 0.35;
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
  sh_tank_add_ball_at(t, SH_TCX + cos(ang) * r0, SH_TCY + sin(ang) * r0, 0.02, cos(ang) * sp, sin(ang) * sp, vz);
}

/* the slime's auto-notes: one roll a beat, a strong beat every other one, only while the air is fairly clear */
static void auto_notes(sh_tank *t, double now) {
  double beat = 60000.0 / fmax2(t->bpm, 40.0);
  double next = (t->has_mel_next && now - t->mel_next <= beat * 4.0) ? t->mel_next : now;   /* (re)start without a burst */
  while (now >= next) {
    int strong = t->mel_step_n % 2 == 0;
    if (t->nb < 7) { double roll = rnd(t); if (roll < (strong ? 0.6 : 0.22)) auto_melody_note(t, strong); }
    t->mel_step_n++;
    next += beat;
  }
  t->has_mel_next = 1; t->mel_next = next;
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
      if (!t->worm_on || now - b.wt0 >= b.wdur) worm_exit(t, &b, !t->worm_on, now);
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
          hit_wall = 1;
          b.vx -= 2.0 * vn * e.nx; b.vy -= 2.0 * vn * e.ny;
          jitter(t, &b);
          b.x += (SH_BR - dist) * e.nx; b.y += (SH_BR - dist) * e.ny;
          t->walls[wi].flash = 1.0;
          if (now - b.last_hit > 60.0) {
            b.last_hit = now;
            /* a goo-slathered hit rings softer and rounder */
            double gd = sh_goo_density(&t->goo, b.x, b.y, b.z);
            int under = gd > 0.3;
            double depth = under ? fmin2((gd - 0.3) / 0.6, 1.0) : 0.0;
            if (under && b.visc == 0.0) b.visc = 0.80 + rnd(t) * 0.12;
            double goo = under ? fmin2((0.35 + 0.65 * depth) * ((1.0 - b.visc) / 0.2), 1.0) : 0.0;
            double imp = fmin2(fabs(vn) / (ts == 0.0 ? 1.0 : ts), 1.0) * (1.0 - goo * 0.45);
            trigger(t, e.cents, imp, goo, 0, wi, now);
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
  if (t->s.spin != 0.0) { double d = t->s.spin * 0.0003; t->rot += d; rebuild(t, 1); t->rot_v = d; }
  else t->rot_v = 0.0;
  if (t->s.auto_notes) auto_notes(t, now);
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

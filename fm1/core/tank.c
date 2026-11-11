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
  sh_tank_settings s = { 6, sh_scale_by_id("major"), 2, 0.0625, 0.15, 1, 0.0, 0.12, 1, 100, 12, 94, 1 };
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
  b->last_hit = -INFINITY; b->last_pane = -INFINITY; b->pane_n = 0; b->visc = 0.0;
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
    b.vy += gy;
    if (b.vy > ts * 1.6) b.vy = ts * 1.6;
    /* substep so a fast ball can never leap past a wall: at most half a radius per micro-step */
    double dist0 = sqrt(b.vx * b.vx + b.vy * b.vy), sc = ceil(dist0 / (SH_BR * 0.5));
    int sub = !(sc >= 1.0) ? 1 : sc > 8.0 ? 8 : (int)sc;
    double isub = 1.0 / (double)sub;
    int killed = 0;
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
      /* a ball that truly left through an open gap and wandered off is gone */
      if (!hit_wall && !sh_tank_inside(t, b.x, b.y) && (b.x < -80.0 || b.x > SH_TW + 80.0 || b.y < -80.0 || b.y > SH_TH + 80.0)) {
        killed = 1; break;
      }
    }
    if (killed) { for (int i = bi + 1; i < t->nb; i++) t->balls[i - 1] = t->balls[i]; t->nb--; continue; }
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

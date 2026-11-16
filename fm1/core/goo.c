/* The goo. See goo.h. Mirrors vst/slimehedron-core/src/tank/goo.rs line for line (keep the order of every sum and
 * product: the host test compares the plugin's numbers exactly). */
#include <math.h>
#include "goo.h"
#include "tank.h"

#define PR        SH_GOO_PR
#define GRAV      0.17      /* the goo's gravity, straight down the tank */
#define GOO_IN    10.0      /* the goo keeps this far inside the glass */
#define GOO_SHARE 0.065     /* how much of the tank a full goo takes up */
#define GOOC      24.0      /* the density grid's cell */
#define FILL_BARS 66.0      /* the shape's song: bars to fill */
#define CELL      (2.0 * PR)
#define TAU       6.283185307179586
#define DS        SH_GOO_DS /* a drop's size against the plugin's (1 but in the light goo) */
#if defined(SH_GOO_LIGHT) && SH_GOO_DIV == 4
#define SPLASH    1         /* drops a hit throws: 5 / 4 = 1.25, rounded DOWN: 2 ended the busy studio scene fuller (0.97 against 0.91) and played 21% fewer notes */
#elif defined(SH_GOO_LIGHT)
#define SPLASH    3         /* drops a hit throws: the plugin's 5 for drops twice the volume, rounded up */
#else
#define SPLASH    5
#endif

/* the per-drop maths runs in greal: double to match the plugin, float in the light goo */
#ifdef SH_GOO_LIGHT
#define GSQRT  sqrtf
#define GSIN   sinf
#define GFLOOR floorf
#define GCBRT  cbrtf
#else
#define GSQRT  sqrt
#define GSIN   sin
#define GFLOOR floor
#define GCBRT  cbrt_exact
#endif

/* the 13 neighbour cells "after" a cell (dz, then dy, then dx, from -1): each pair of drops is met once */
static const int HALF_SHELL[13][3] = {
  {1, 0, 0}, {-1, 1, 0}, {0, 1, 0}, {1, 1, 0},
  {-1, -1, 1}, {0, -1, 1}, {1, -1, 1}, {-1, 0, 1}, {0, 0, 1}, {1, 0, 1}, {-1, 1, 1}, {0, 1, 1}, {1, 1, 1},
};

#ifndef SH_GOO_LIGHT
/* (2m+1)^3 against x's mantissa shifted by sh bits, exactly, in 32-bit limbs: <0, 0, >0 */
static int cube_cmp(uint64_t m, uint64_t mx, int sh) {
  uint32_t M[2] = { (uint32_t)(2 * m + 1), (uint32_t)((2 * m + 1) >> 32) }, S[4] = { 0 }, C[6] = { 0 }, X[8] = { 0 };
  for (int i = 0; i < 2; i++) { uint64_t c = 0; for (int j = 0; j < 2; j++) { uint64_t v = (uint64_t)M[i] * M[j] + S[i + j] + c; S[i + j] = (uint32_t)v; c = v >> 32; } S[i + 2] += (uint32_t)c; }
  for (int i = 0; i < 4; i++) { uint64_t c = 0; for (int j = 0; j < 2; j++) { uint64_t v = (uint64_t)S[i] * M[j] + C[i + j] + c; C[i + j] = (uint32_t)v; c = v >> 32; } if (i + 2 < 6) C[i + 2] += (uint32_t)c; }
  uint32_t A[8] = { 0 };
  for (int i = 0; i < 6; i++) A[i] = C[i];
  if (sh < 0) {   /* shift the cube instead */
    int q = -sh / 32, r = -sh % 32; uint32_t B[8] = { 0 };
    for (int i = 7; i >= 0; i--) { uint64_t v = (i - q >= 0 ? (uint64_t)A[i - q] << r : 0) | (r && i - q - 1 >= 0 ? (uint64_t)A[i - q - 1] >> (32 - r) : 0); B[i] = (uint32_t)v; }
    for (int i = 0; i < 8; i++) A[i] = B[i];
    sh = 0;
  }
  int q = sh / 32, r = sh % 32; uint32_t xl[3] = { (uint32_t)mx, (uint32_t)(mx >> 32), 0 };
  for (int i = 0; i < 8; i++) {
    uint64_t lo = i - q >= 0 && i - q < 3 ? (uint64_t)xl[i - q] << r : 0, hi = r && i - q - 1 >= 0 && i - q - 1 < 3 ? (uint64_t)xl[i - q - 1] >> (32 - r) : 0;
    X[i] = (uint32_t)(lo | hi);
  }
  for (int i = 7; i >= 0; i--) if (A[i] != X[i]) return A[i] < X[i] ? -1 : 1;
  return 0;
}
/* is the true cube root of x above the midpoint between a and the next double up? (x, a > 0, normal) */
static int root_above_mid(double a, double x) {
  int ea, ex; double fa = frexp(a, &ea), fx = frexp(x, &ex);
  uint64_t ma = (uint64_t)ldexp(fa, 53), mx = (uint64_t)ldexp(fx, 53);
  /* mid = (2ma+1) * 2^(ea-54), mid^3 = (2ma+1)^3 * 2^(3ea-162); x = mx * 2^(ex-53) */
  int sh = (ex - 53) - (3 * ea - 162);   /* compare (2ma+1)^3 with mx * 2^sh */
  return cube_cmp(ma, mx, sh) < 0;
}
/* The cube root rounded correctly, as Rust's f64::cbrt is (glibc's can be two ulps off: cbrt(51); the heart's size
 * reads it and the host test compares the plugin's numbers exactly). Walks from glibc's answer until the true root
 * lies between the midpoints either side. Positive inputs only (the goo takes cbrt of a drop count). */
static double cbrt_exact(double x) {
  double y = cbrt(x);
  for (int i = 0; i < 8 && root_above_mid(y, x); i++) y = nextafter(y, INFINITY);
  for (int i = 0; i < 8 && !root_above_mid(nextafter(y, -INFINITY), x); i++) y = nextafter(y, -INFINITY);
  return y;
}
#endif

static sh_grid grid_new(double cell) {
  double span = 2.0 * SH_TR * 1.3 + 4.0 * cell;
  sh_grid g; g.nx = (int)ceil(span / cell) + 2; g.nz = (int)ceil((SH_TBOXD + 4.0 * cell) / cell) + 2;
  g.ox = SH_TCX - span / 2.0; g.oy = SH_TCY - span / 2.0; g.oz = -SH_TBOXD / 2.0 - 2.0 * cell; g.cell = cell;
  return g;
}
static int clampcell(double v, double o, int n, double cell) {
  double a = floor((v - o) / cell); return a < 0.0 ? 0 : a >= (double)n ? n - 1 : (int)a; }
#ifdef SH_GOO_HASHED
/* a cell's bucket; a bucket can hold several cells, so every chain is walked checking the cell itself */
static int hkey(int a, int b, int c, int n) { return (int)(((uint32_t)a * 73856093u ^ (uint32_t)b * 19349663u ^ (uint32_t)c * 83492791u) & (uint32_t)(n - 1)); }
static int same(const int16_t *c, int a, int b, int z) { return c[0] == a && c[1] == b && c[2] == z; }
#else
static int gkey(const sh_grid *g, int a, int b, int c) { return (c * g->nx + b) * g->nx + a; }
#endif

void sh_goo_init(sh_goo *g, double area, double room) {
  g->room[0] = room; g->room[1] = room; g->room[2] = SH_TBOXD / 2.0;
  double c = area * SH_TBOXD * GOO_SHARE / 3300.0;
  g->cap = (int)floor((c < 1600.0 ? c : 1600.0) / (DS * DS * DS));   /* the light goo: half as many, each twice the volume */
  if (g->cap > SH_GOO_MAXCAP) g->cap = SH_GOO_MAXCAP;
  if (g->cap < 0) g->cap = 0;
  g->max = g->cap * 2 + 16; g->n = 0;
  g->fill_beats = 0.0; g->measured_fill = 0.0; g->ticks = 0;
  g->has_lava = 0; g->lava_beat = 0; g->axis[0] = 1.0; g->axis[1] = 0.0; g->axis[2] = 0.0; g->kick = 0.0;
  g->heart[0] = g->heart[1] = g->heart[2] = 0.0; g->core = 0.0;
  g->rg = grid_new(CELL); g->gd = grid_new(GOOC);
#ifndef SH_GOO_HASHED
  for (int i = 0; i < SH_GOO_GD_MAX; i++) g->dens[i] = 0.0;
#endif
  g->dens_n = 0;
}

double sh_goo_fill(const sh_goo *g) { return g->measured_fill; }
double sh_goo_settle(const sh_goo *g) { double s = (g->measured_fill - 0.22) / 0.28; return s < 0.0 ? 0.0 : s > 1.0 ? 1.0 : s; }
int sh_goo_pooled(const sh_goo *g) { int k = 0; for (int i = 0; i < g->n; i++) if (g->d[i].pooled) k++; return k; }

void sh_goo_splash(sh_goo *g, double x, double y, double z, double inx, double iny, sh_rng *rng) {
  int feed = 0; for (int i = 0; i < g->n; i++) if (!g->d[i].fade) feed++;
  double al = g->fill_beats / 4.0 / (FILL_BARS * 1.13); if (al > 1.0) al = 1.0;
  double allowance = al * (double)g->cap;
  double kf = floor(allowance - (double)feed); kf = kf < 0.0 ? 0.0 : kf > SPLASH ? SPLASH : kf;
  int keep = (int)kf;
  for (int i = 0; i < SPLASH; i++) {
    if (i >= keep && (double)g->n >= (double)g->cap * 1.15) break;   /* spray that only fades is capped too */
    if (g->n == g->max) break;
    double sp = 1.4 + sh_rng_f(rng) * 2.6;
    double tx = -iny, ty = inx;
    double tang = (sh_rng_f(rng) - 0.5) * 3.6;
    double px = x + (sh_rng_f(rng) - 0.5) * 8.0;
    double py = y + (sh_rng_f(rng) - 0.5) * 8.0;
    sh_drop *p = &g->d[g->n++];
    p->x = px; p->y = py; p->z = z; p->vx = inx * sp + tx * tang; p->vy = iny * sp + ty * tang; p->vz = 0.0;
    p->r = 2.0 * DS; p->age = 0; p->pooled = 0; p->fade = i >= keep;
  }
}

double sh_goo_density(const sh_goo *g, double x, double y, double z) {
  if (g->dens_n == 0) return 0.0;
  const sh_grid *G = &g->gd;
  long long cx = (long long)floor((x - G->ox) / GOOC), cy = (long long)floor((y - G->oy) / GOOC);
  long long cz = (long long)floor(((z - 0.5) * SH_TBOXD - G->oz) / GOOC);
  double s = 0.0;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) for (int k = -1; k <= 1; k++) {
    long long a = cx + i, b = cy + j, c = cz + k;
    if (a < 0 || b < 0 || c < 0 || a >= G->nx || b >= G->nx || c >= G->nz) continue;
#ifdef SH_GOO_HASHED
    double sc = 0.0;   /* this cell's volume, summed in drop order as the dense grid adds it */
    for (int d = g->dhead[hkey((int)a, (int)b, (int)c, SH_GOO_DHASH)]; d != -1; d = g->dnext[d])
      if (same(g->dcell[d], (int)a, (int)b, (int)c)) { const sh_drop *p = &g->d[d]; sc += p->r * p->r * p->r; }
    s += sc;
#else
    s += g->dens[gkey(G, (int)a, (int)b, (int)c)];
#endif
  }
  double v = s * 4.18879 / (27.0 * GOOC * GOOC * GOOC) * 1.9;
  return v < 1.0 ? v : 1.0;
}

static void measure(sh_goo *g) {
  double m = (double)g->cap * 0.92; if (m < 1.0) m = 1.0;
  double f = (double)sh_goo_pooled(g) / m; g->measured_fill = f < 1.0 ? f : 1.0;
}

/* the lava lamp: a fresh squeeze axis on every new beat, the heart's centre on its own slow cycle */
static double lava(sh_goo *g, double beats, int pooled_n, sh_rng *rng) {
  int64_t fb = (int64_t)floor(beats);
  if (!g->has_lava || g->lava_beat != fb) {
    int first = !g->has_lava;
    g->has_lava = 1; g->lava_beat = fb;
    if (!first) {
      int down = ((fb % 4) + 4) % 4 == 0;
      double m = (double)g->cap * 0.9; if (m < 1.0) m = 1.0;
      double fill = (double)pooled_n / m; if (fill > 1.0) fill = 1.0;
      double z = sh_rng_f(rng) * 2.0 - 1.0;
      double a = sh_rng_f(rng) * TAU;
      double s = sqrt(1.0 - z * z);
      g->axis[0] = s * cos(a); g->axis[1] = s * sin(a); g->axis[2] = z;
      g->kick = (0.5 + 0.5 * fill) * (down ? 1.35 : 1.0) * (0.8 + sh_rng_f(rng) * 0.4);
    }
  }
  double w = 0.09, cr = g->core + GOO_IN + PR;
  double amp[3]; static const double F[3] = { 0.42, 0.5, 0.42 };
  for (int k = 0; k < 3; k++) { double a = g->room[k] * F[k], b = g->room[k] - cr; if (b < 0.0) b = 0.0; amp[k] = a < b ? a : b; }
  g->heart[0] = amp[0] * sin(beats * w); g->heart[1] = amp[1] * sin(beats * w * 0.63); g->heart[2] = amp[2] * sin(beats * w * 1.21);
  return beats - (double)fb;
}

/* keep one drop inside the prism, GOO_IN in from the glass; an open wall lets the goo through */
static void contain(sh_drop *p, const sh_wall *walls, int nw) {
  greal r = p->r + GOO_IN;
  for (int it = 0; it < 3; it++) {
    greal x = p->x, y = p->y;
    for (int i = 0; i < nw; i++) {
      const sh_wall *e = &walls[i];
      if (e->broken) continue;
      greal ax = (greal)e->ax, ay = (greal)e->ay, nx = (greal)e->nx, ny = (greal)e->ny;
      greal dist = (p->x - ax) * nx + (p->y - ay) * ny;
      if (dist < r) {
        p->x += (r - dist) * nx; p->y += (r - dist) * ny;
        greal vn = p->vx * nx + p->vy * ny;
        if (vn < 0.0) { p->vx -= 1.7 * vn * nx; p->vy -= 1.7 * vn * ny; }
      }
    }
    if (p->x == x && p->y == y) break;
  }
  greal m = r / SH_TBOXD;
  if (p->z < m) { p->z = m; if (p->vz < 0.0) p->vz *= -0.4; }
  else if (p->z > 1.0 - m) { p->z = 1.0 - m; if (p->vz > 0.0) p->vz *= -0.4; }
}

/* a ball moving through the goo shoves it aside and drags a little along */
static void wake(sh_goo *g, const sh_ball *balls, int nb) {
  greal reach = SH_BR + PR + 6.0;
  for (int bi = 0; bi < nb; bi++) {
    const sh_ball *b = &balls[bi];
    if (b->warp) continue;   /* a ball in a wormhole is not in the tank */
    greal bx = (greal)b->x, by = (greal)b->y, bz = (greal)b->z, bvx = (greal)b->vx, bvy = (greal)b->vy;
    greal vz = (greal)b->vz * SH_TBOXD;
    for (int i = 0; i < g->n; i++) {
      sh_drop *p = &g->d[i];
      if (!p->pooled) continue;
      greal dx = p->x - bx; if (dx > reach || dx < -reach) continue;
      greal dy = p->y - by; if (dy > reach || dy < -reach) continue;
      greal dz = (p->z - bz) * SH_TBOXD; if (dz > reach || dz < -reach) continue;
      greal d = GSQRT(dx * dx + dy * dy + dz * dz); if (d == 0.0) d = 1.0;
      if (d >= reach) continue;
      greal f = 1.0 - (d / reach) * (d / reach);
      p->vx += bvx * 0.22 * f + dx / d * f * 1.2;
      p->vy += bvy * 0.22 * f + dy / d * f * 1.2;
      p->vz += vz * 0.22 * f + dz / d * f * 1.2;
    }
  }
}

static void pair(sh_goo *g, int i, int j) {
  sh_drop p = g->d[i], q = g->d[j];
  greal dx = q.x - p.x, dy = q.y - p.y, dz = (q.z - p.z) * SH_TBOXD;
  greal d2 = dx * dx + dy * dy + dz * dz, min = p.r + q.r;
  if (d2 < min * min && d2 > 1e-8) {
    greal d = GSQRT(d2), push = (min - d) / 2.0;
    dx /= d; dy /= d; dz /= d;
    p.x -= dx * push; p.y -= dy * push; p.z -= dz * push / SH_TBOXD;
    q.x += dx * push; q.y += dy * push; q.z += dz * push / SH_TBOXD;
    greal rvx = (p.vx - q.vx) * 0.25, rvy = (p.vy - q.vy) * 0.25, rvz = (p.vz - q.vz) * 0.25;
    p.vx -= rvx; p.vy -= rvy; p.vz -= rvz;
    q.vx += rvx; q.vy += rvy; q.vz += rvz;
    g->d[i] = p; g->d[j] = q;
  }
}

/* drops push apart and trade a little speed, so the goo slumps like a liquid; binned once per pass */
static void relax(sh_goo *g) {
  int n = g->n; if (n == 0) return;
  const sh_grid *G = &g->rg;
#ifdef SH_GOO_HASHED
  /* the same pairs in the same order as the dense grid: a bucket's chain, kept to its own cell, is that cell's list */
  for (int k = 0; k < SH_GOO_HASH; k++) g->head[k] = -1;
  for (int i = 0; i < n; i++) {
    const sh_drop *p = &g->d[i];
    int a = clampcell(p->x, G->ox, G->nx, G->cell), b = clampcell(p->y, G->oy, G->nx, G->cell);
    int c = clampcell((p->z - 0.5) * SH_TBOXD, G->oz, G->nz, G->cell);
    int k = hkey(a, b, c, SH_GOO_HASH);
    g->next[i] = g->head[k]; g->head[k] = (int16_t)i;
    g->cells[i][0] = (int16_t)a; g->cells[i][1] = (int16_t)b; g->cells[i][2] = (int16_t)c;
  }
  for (int i = 0; i < n; i++) {
    int ca = g->cells[i][0], cb = g->cells[i][1], cc = g->cells[i][2];
    for (int j = g->next[i]; j != -1; j = g->next[j]) if (same(g->cells[j], ca, cb, cc)) pair(g, i, j);
    for (int o = 0; o < 13; o++) {
      int gx = ca + HALF_SHELL[o][0], gy = cb + HALF_SHELL[o][1], gz = cc + HALF_SHELL[o][2];
      if (gx < 0 || gy < 0 || gz < 0 || gx >= G->nx || gy >= G->nx || gz >= G->nz) continue;
      for (int j = g->head[hkey(gx, gy, gz, SH_GOO_HASH)]; j != -1; j = g->next[j]) if (same(g->cells[j], gx, gy, gz)) pair(g, i, j);
    }
  }
#else
  int len = G->nx * G->nx * G->nz;
  for (int k = 0; k < len; k++) g->head[k] = -1;
  for (int i = 0; i < n; i++) {
    const sh_drop *p = &g->d[i];
    int a = clampcell(p->x, G->ox, G->nx, G->cell), b = clampcell(p->y, G->oy, G->nx, G->cell);
    int c = clampcell((p->z - 0.5) * SH_TBOXD, G->oz, G->nz, G->cell);
    int k = gkey(G, a, b, c);
    g->next[i] = g->head[k]; g->head[k] = i;
    g->cells[i][0] = a; g->cells[i][1] = b; g->cells[i][2] = c;
  }
  for (int i = 0; i < n; i++) {
    int ca = g->cells[i][0], cb = g->cells[i][1], cc = g->cells[i][2];
    for (int j = g->next[i]; j != -1; j = g->next[j]) pair(g, i, j);
    for (int o = 0; o < 13; o++) {
      int gx = ca + HALF_SHELL[o][0], gy = cb + HALF_SHELL[o][1], gz = cc + HALF_SHELL[o][2];
      if (gx < 0 || gy < 0 || gz < 0 || gx >= G->nx || gy >= G->nx || gz >= G->nz) continue;
      for (int j = g->head[gkey(G, gx, gy, gz)]; j != -1; j = g->next[j]) pair(g, i, j);
    }
  }
#endif
}

/* the density grid the balls feel: each pooled drop's volume in its cell */
static void build_density(sh_goo *g) {
  const sh_grid *G = &g->gd;
#ifdef SH_GOO_HASHED
  for (int k = 0; k < SH_GOO_DHASH; k++) { g->dhead[k] = -1; g->dtail[k] = -1; }
#else
  int len = G->nx * G->nx * G->nz;
  for (int k = 0; k < len; k++) g->dens[k] = 0.0;
#endif
  g->dens_n = 0;
  for (int i = 0; i < g->n; i++) {
    const sh_drop *p = &g->d[i];
    if (!p->pooled) continue;
    greal a = GFLOOR((p->x - (greal)G->ox) / GOOC), b = GFLOOR((p->y - (greal)G->oy) / GOOC);
    greal c = GFLOOR(((p->z - 0.5) * SH_TBOXD - (greal)G->oz) / GOOC);
    if (a < 0.0 || b < 0.0 || c < 0.0 || a >= G->nx || b >= G->nx || c >= G->nz) continue;
#ifdef SH_GOO_HASHED
    /* appended at the tail, so a cell's drops are summed in drop order, as the dense grid adds them */
    int k = hkey((int)a, (int)b, (int)c, SH_GOO_DHASH);
    g->dnext[i] = -1; g->dcell[i][0] = (int16_t)a; g->dcell[i][1] = (int16_t)b; g->dcell[i][2] = (int16_t)c;
    if (g->dtail[k] < 0) g->dhead[k] = (int16_t)i; else g->dnext[g->dtail[k]] = (int16_t)i;
    g->dtail[k] = (int16_t)i;
#else
    g->dens[gkey(G, (int)a, (int)b, (int)c)] += p->r * p->r * p->r;
#endif
    g->dens_n++;
  }
}

static void step3d(sh_goo *g, double now_ms, double bpm, const sh_wall *walls, int nw, const sh_ball *balls, int nb, sh_rng *rng) {
  int pooled_n = sh_goo_pooled(g);
  double phase = lava(g, now_ms / 60000.0 * bpm, pooled_n, rng);
  double env = exp(-phase * 10.0);   /* the squeeze, sharp on the beat and gone before the next */
  g->core = 8.5 * DS * GCBRT((double)(pooled_n > 1 ? pooled_n : 1));   /* a packed heart of that many drops */
  greal h0 = (greal)g->heart[0], h1 = (greal)g->heart[1], h2 = (greal)g->heart[2], kick = (greal)g->kick, core = (greal)g->core;
  const greal axis[3] = { (greal)g->axis[0], (greal)g->axis[1], (greal)g->axis[2] };
  greal t = (greal)(now_ms * 0.001), envg = (greal)env;
  for (int i = 0; i < g->n; i++) {
    sh_drop *p = &g->d[i];
    p->age++;
    if (!p->pooled && !p->fade && (p->age > 40 || (p->age > 10 && GSQRT(p->vx * p->vx + p->vy * p->vy + p->vz * p->vz) < 1.2))) p->pooled = 1;
    if (p->pooled) {
      if (p->r < PR) p->r += 0.12 * DS;
      greal rx = p->x - SH_TCX - h0, ry = p->y - SH_TCY - h1, rz = (p->z - 0.5) * SH_TBOXD - h2;
      greal d = GSQRT(rx * rx + ry * ry + rz * rz); if (d == 0.0) d = 1.0;
      greal c = core * 0.75;
      if (d > c) { greal k = 0.012 * (d - c) / d; p->vx -= rx * k; p->vy -= ry * k; p->vz -= rz * k; }
      if (env > 0.01) {   /* the beat: a sharp stretch along its axis, a squeeze across it, a breath out */
        greal ka = kick * envg;
        greal al = rx * axis[0] + ry * axis[1] + rz * axis[2];
        greal sx = axis[0] * al, sy = axis[1] * al, sz = axis[2] * al;
        p->vx += ka * (0.045 * sx - 0.024 * (rx - sx) + 0.01 * rx);
        p->vy += ka * (0.045 * sy - 0.024 * (ry - sy) + 0.01 * ry);
        p->vz += ka * (0.045 * sz - 0.024 * (rz - sz) + 0.01 * rz);
      }
      p->vx += 0.035 * GSIN(t * 1.3 + p->y * 0.035);   /* a slow shimmer: never a perfect ball */
      p->vy += 0.035 * GSIN(t * 1.1 + p->z * SH_TBOXD * 0.035);
      p->vz += 0.035 * GSIN(t * 0.9 + p->x * 0.035);
      p->vy += GRAV * 0.1;                            /* nearly afloat, like wax in warm oil */
      p->vx *= 0.88; p->vy *= 0.88; p->vz *= 0.88;
    } else {
      p->vy += GRAV; p->vx *= 0.985; p->vy *= 0.992; p->vz *= 0.96;   /* spray still flies and falls */
    }
    p->x += p->vx; p->y += p->vy; p->z += p->vz / SH_TBOXD;
    contain(p, walls, nw);
  }
  wake(g, balls, nb);
  relax(g);
  relax(g);
  for (int i = 0; i < g->n; i++) contain(&g->d[i], walls, nw);
  build_density(g);
}

void sh_goo_step(sh_goo *g, double now_ms, double bpm, const sh_wall *walls, int nw, const sh_ball *balls, int nb, sh_rng *rng) {
  g->fill_beats = (g->n > 0 || nb > 0) ? g->fill_beats + bpm / 3600.0 : 0.0;
  int k = 0;   /* spray that only splashed has flown: gone, in place */
  for (int i = 0; i < g->n; i++) if (!(g->d[i].fade && g->d[i].age > 34)) g->d[k++] = g->d[i];
  g->n = k;
  step3d(g, now_ms, bpm, walls, nw, balls, nb, rng);
  g->ticks++;
  if (g->ticks % 10 == 0) measure(g);
}

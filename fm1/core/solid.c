/* Real solids, ported line for line from index.html (seedPlanes .. solidFaceDegrees). See solid.h. */
#include "solid.h"
#include <math.h>
#include <string.h>
#include <stdlib.h>

#define PHI 1.618033988749895
#define PI  3.141592653589793

static real vlen(const real a[3]) { return (real)sqrt((double)(a[0] * a[0] + a[1] * a[1] + a[2] * a[2])); }
static void vnorm(real a[3]) { real l = vlen(a); if (l == 0) l = 1; a[0] /= l; a[1] /= l; a[2] /= l; }
static real vdot(const real a[3], const real b[3]) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
static void vcross(const real a[3], const real b[3], real o[3]) {
  o[0] = a[1] * b[2] - a[2] * b[1]; o[1] = a[2] * b[0] - a[0] * b[2]; o[2] = a[0] * b[1] - a[1] * b[0];
}
static real dist(const real a[3], const real b[3]) {
  real d[3] = { a[0] - b[0], a[1] - b[1], a[2] - b[2] }; return vlen(d);
}

/* one face's outline: a big square in plane i, clipped by every other plane */
static void face_of(const sh_plane *P, int np, int i, sh_face *out) {
  sh_fpt a[SH_MAXFV], b[SH_MAXFV]; int na = 4, nb, j, k;
  const real *n = P[i].n, d = P[i].d, size = (real)(SH_R * 8);
  real u[3], w[3], c[3] = { n[0] * d, n[1] * d, n[2] * d };
  real ax[3] = { 1, 0, 0 }, ay[3] = { 0, 1, 0 };
  vcross(n, fabs((double)n[0]) < 0.9 ? ax : ay, u); vnorm(u); vcross(n, u, w);
  const real sq[4][2] = { { size, size }, { -size, size }, { -size, -size }, { size, -size } }; /* ccw from outside */
  for (k = 0; k < 4; k++) { for (j = 0; j < 3; j++) a[k].p[j] = c[j] + u[j] * sq[k][0] + w[j] * sq[k][1]; a[k].t = -1; }
  for (j = 0; j < np && na; j++) {
    if (j == i) continue;
    nb = 0;
    for (k = 0; k < na; k++) {
      const sh_fpt *A = &a[k], *B = &a[(k + 1) % na];
      real da = vdot(P[j].n, A->p) - P[j].d, db = vdot(P[j].n, B->p) - P[j].d, t;
      if (da <= (real)1e-7) {
        if (nb < SH_MAXFV) b[nb++] = *A;
        if (db > (real)1e-7 && nb < SH_MAXFV) { t = da / (da - db); for (int m = 0; m < 3; m++) b[nb].p[m] = A->p[m] + (B->p[m] - A->p[m]) * t; b[nb++].t = j; }
      } else if (db <= (real)1e-7 && nb < SH_MAXFV) {
        t = da / (da - db); for (int m = 0; m < 3; m++) b[nb].p[m] = A->p[m] + (B->p[m] - A->p[m]) * t; b[nb++].t = A->t;
      }
    }
    memcpy(a, b, sizeof(sh_fpt) * (size_t)nb); na = nb;
  }
  /* drop the slivers clipping leaves where three or more planes meet at one corner */
  out->n = 0;
  for (k = 0; k < na; k++) {
    if (out->n && dist(out->v[out->n - 1].p, a[k].p) <= (real)0.05) out->v[out->n - 1].t = a[k].t;
    else out->v[out->n++] = a[k];
  }
  while (out->n > 1 && dist(out->v[0].p, out->v[out->n - 1].p) <= (real)0.05) out->n--;
  if (out->n < 3) out->n = 0;
}

void sh_solid_faces(sh_solid *s) { for (int i = 0; i < s->np; i++) face_of(s->pl, s->np, i, &s->f[i]); }

static int vert_at(sh_solid *s, const real p[3]) {
  for (int i = 0; i < s->nv; i++) if (dist(s->v[i].p, p) < (real)0.5) return i;
  if (s->nv >= SH_MAXV) return SH_MAXV - 1;
  sh_vert *v = &s->v[s->nv]; memcpy(v->p, p, sizeof v->p); v->nnb = 0; return s->nv++;
}
static void link(sh_vert *v, int b) {
  for (int i = 0; i < v->nnb; i++) if (v->nb[i] == b) return;
  if (v->nnb < SH_MAXNB) v->nb[v->nnb++] = b;
}
void sh_solid_verts(sh_solid *s) {
  int ids[SH_MAXFV];
  s->nv = 0;
  for (int i = 0; i < s->np; i++) {
    const sh_face *f = &s->f[i];
    for (int k = 0; k < f->n; k++) ids[k] = vert_at(s, f->v[k].p);
    for (int k = 0; k < f->n; k++) { int a = ids[k], b = ids[(k + 1) % f->n]; if (a != b) { link(&s->v[a], b); link(&s->v[b], a); } }
  }
}

/* faces + corners of the current planes */
static void shape_of(sh_solid *s) { sh_solid_faces(s); sh_solid_verts(s); }

static void scale_solid(sh_solid *s, real rt) {
  shape_of(s);
  real r = 0; for (int i = 0; i < s->nv; i++) { real l = vlen(s->v[i].p); if (l > r) r = l; }
  real k = r > 0 ? rt / r : 1;
  for (int i = 0; i < s->np; i++) s->pl[i].d *= k;
}

static void flip(sh_solid *s) {
  real rho = (real)SH_SOLID_R; int n = 0;
  shape_of(s);
  for (int i = 0; i < s->nv && n < SH_MAXP; i++) {
    sh_plane *q = &s->tmp[n++]; memcpy(q->n, s->v[i].p, sizeof q->n); vnorm(q->n); q->d = rho * rho / vlen(s->v[i].p);
  }
  memcpy(s->pl, s->tmp, sizeof(sh_plane) * (size_t)n); s->np = n;
  scale_solid(s, (real)SH_SOLID_R);
}

static void cut(sh_solid *s) {
  shape_of(s);
  for (int i = 0; i < s->nv && s->np < SH_MAXP; i++) {
    const sh_vert *v = &s->v[i]; real n[3] = { v->p[0], v->p[1], v->p[2] }, sum = 0; vnorm(n);
    for (int k = 0; k < v->nnb; k++) {
      const real *u = s->v[v->nb[k]].p;
      real m[3] = { v->p[0] + (u[0] - v->p[0]) / 3, v->p[1] + (u[1] - v->p[1]) / 3, v->p[2] + (u[2] - v->p[2]) / 3 };
      sum += vdot(n, m);
    }
    if (v->nnb) { sh_plane *q = &s->pl[s->np++]; memcpy(q->n, n, sizeof n); q->d = sum / v->nnb; }
  }
  scale_solid(s, (real)SH_SOLID_R);
}

static void add_unit(sh_solid *s, real x, real y, real z) {
  sh_plane *q = &s->pl[s->np++]; q->n[0] = x; q->n[1] = y; q->n[2] = z; vnorm(q->n); q->d = 1;
}

static int seed(sh_solid *s, const char *name, size_t len) {
  const real P = (real)PHI; s->np = 0;
  if (len == 5 && !strncmp(name, "tetra", 5)) { add_unit(s, 1, 1, 1); add_unit(s, 1, -1, -1); add_unit(s, -1, 1, -1); add_unit(s, -1, -1, 1); }
  else if (len == 4 && !strncmp(name, "cube", 4)) { add_unit(s, 1, 0, 0); add_unit(s, -1, 0, 0); add_unit(s, 0, 1, 0); add_unit(s, 0, -1, 0); add_unit(s, 0, 0, 1); add_unit(s, 0, 0, -1); }
  else if (len == 4 && !strncmp(name, "octa", 4)) { for (int a = 1; a >= -1; a -= 2) for (int b = 1; b >= -1; b -= 2) for (int c = 1; c >= -1; c -= 2) add_unit(s, a, b, c); }
  else if (len == 6 && !strncmp(name, "dodeca", 6)) {
    for (int a = 1; a >= -1; a -= 2) for (int bi = 0; bi < 2; bi++) { real b = bi ? -P : P; add_unit(s, 0, a, b); add_unit(s, a, b, 0); add_unit(s, b, 0, a); }
  } else if (len == 5 && !strncmp(name, "icosa", 5)) {
    for (int a = 1; a >= -1; a -= 2) for (int b = 1; b >= -1; b -= 2) for (int c = 1; c >= -1; c -= 2) add_unit(s, a, b, c);
    for (int ai = 0; ai < 2; ai++) for (int bi = 0; bi < 2; bi++) { real a = ai ? -1 / P : 1 / P, b = bi ? -P : P; add_unit(s, 0, a, b); add_unit(s, a, b, 0); add_unit(s, b, 0, a); }
  } else if (len > 3 && !strncmp(name, "orb", 3)) {
    int N = atoi(name + 3); if (N < SH_ORB_MINF) N = SH_ORB_MINF; if (N > SH_ORB_MAXF) N = SH_ORB_MAXF;
    /* the Fibonacci lattice: point i at height 1-(2i+1)/N, turned by the golden angle; i = 0 at the BOTTOM (y down) */
    const double ga = PI * (3 - sqrt(5.0));
    for (int i = 0; i < N; i++) { double y = 1 - (2.0 * i + 1) / N, r = sqrt(1 - y * y), a = i * ga; add_unit(s, (real)(r * cos(a)), (real)y, (real)(r * sin(a))); }
  } else if (len > 5 && !strncmp(name, "prism", 5)) {
    int N = atoi(name + 5); if (N < 3) N = 6;
    for (int i = 0; i < N; i++) {
      double a = -PI / 2 + (i + 0.5) * 2 * PI / N; sh_plane *q = &s->pl[s->np++];
      q->n[0] = (real)cos(a); q->n[1] = (real)sin(a); q->n[2] = 0; vnorm(q->n); q->d = (real)(cos(PI / N) * SH_R);
    }
    s->pl[s->np].n[0] = 0; s->pl[s->np].n[1] = 0; s->pl[s->np].n[2] = 1; s->pl[s->np++].d = (real)(SH_BOXD / 2);
    s->pl[s->np].n[0] = 0; s->pl[s->np].n[1] = 0; s->pl[s->np].n[2] = -1; s->pl[s->np++].d = (real)(SH_BOXD / 2);
    return 0;   /* the box the 3D tank already is: not rescaled */
  } else return -1;
  scale_solid(s, (real)SH_SOLID_R);
  return 0;
}

int sh_solid_build(sh_solid *s, const char *name) {
  const char *dot = strchr(name, '.');
  if (seed(s, name, dot ? (size_t)(dot - name) : strlen(name))) return -1;
  while (dot) {
    const char *op = dot + 1; dot = strchr(op, '.'); size_t l = dot ? (size_t)(dot - op) : strlen(op);
    if (l == 3 && !strncmp(op, "cut", 3)) cut(s);
    else if (l == 4 && !strncmp(op, "flip", 4)) flip(s);
    else if (l == 4 && !strncmp(op, "puff", 4)) { flip(s); cut(s); flip(s); }
    else return -1;
  }
  /* keep only planes that really make a face */
  sh_solid_faces(s);
  int n = 0; for (int i = 0; i < s->np; i++) if (s->f[i].n >= 3) { s->pl[n] = s->pl[i]; s->f[n] = s->f[i]; n++; }
  s->np = n;
  sh_solid_verts(s);
  return 0;
}

/* low (big y, y is down) to high; ties round the middle, as the web sorts */
static const sh_plane *sort_pl;
static int by_height(const void *x, const void *y) {
  int a = *(const int *)x, b = *(const int *)y;
  const real *A = sort_pl[a].n, *B = sort_pl[b].n;
  double k = (double)B[1] - (double)A[1];
  if (k == 0) k = atan2((double)A[2], (double)A[0]) - atan2((double)B[2], (double)B[0]);
  return k < 0 ? -1 : k > 0 ? 1 : (a - b);   /* a - b: stable, like the web's sort */
}
void sh_orb_degrees(const sh_solid *s, int td, int *deg) {
  int idx[SH_MAXP];
  for (int i = 0; i < s->np; i++) idx[i] = i;
  sort_pl = s->pl; qsort(idx, (size_t)s->np, sizeof(int), by_height);
  for (int j = 0; j < s->np; j++) { int d = j * td / s->np; deg[idx[j]] = d < td - 1 ? d : td - 1; }
}

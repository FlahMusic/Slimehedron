/* Slimehedron for the FM-1: curved space (GPL-3.0-or-later). See space.h. Every step mirrors the web's code line for
 * line (index.html: hypCorner, hP, mdot, curveEdges, hypSub), so a difference in the reference test is a real one. */
#include <math.h>
#include "space.h"

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

static real mdot(const real *a, const real *b) { return -a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
/* a disk point -> its point on the hyperboloid */
static void hp(real x, real y, real *P) { real r2 = x * x + y * y, D = 1 - r2; P[0] = (1 + r2) / D; P[1] = 2 * x / D; P[2] = 2 * y / D; }

real sp_hyp_corner(int N, real uv, int *k) {
  real best = uv, bd = 9; int bk = 0;
  for (int kk = 3; kk <= 24; kk++) {
    real c = (real)(1 / tan(M_PI / N) / tan(M_PI / kk)); if (c <= (real)1.0001) continue;
    real u = (real)tanh(acosh(c) / 2), d = (real)fabs(u - uv);
    if (d < bd) { bd = d; best = u; bk = kk; }
  }
  if (k) *k = bk;
  return best;
}

int sp_curve_build(sp_tank *t, const real *xy, int n) {
  if (n < 3 || n > SP_MAXW) return -1;
  real cx = 0, cy = 0; for (int i = 0; i < n; i++) { cx += xy[2 * i]; cy += xy[2 * i + 1]; } cx /= n; cy /= n;
  real Pc[3]; hp(cx, cy, Pc);
  t->n = n;
  for (int i = 0; i < n; i++) {
    sp_wall *e = &t->w[i]; int j = (i + 1) % n;
    e->ax = xy[2 * i]; e->ay = xy[2 * i + 1]; e->bx = xy[2 * j]; e->by = xy[2 * j + 1];
    real A[3], B[3]; hp(e->ax, e->ay, A); hp(e->bx, e->by, B);
    real c0 = A[1] * B[2] - A[2] * B[1], c1 = A[2] * B[0] - A[0] * B[2], c2 = A[0] * B[1] - A[1] * B[0];   /* Euclidean cross, then J */
    real Nv[3] = { -c0, c1, c2 }; real mm = mdot(Nv, Nv); real nn = (real)sqrt(mm > (real)1e-12 ? mm : (real)1e-12);
    for (int q = 0; q < 3; q++) Nv[q] /= nn;
    if (mdot(Pc, Nv) < 0) for (int q = 0; q < 3; q++) Nv[q] = -Nv[q];
    for (int q = 0; q < 3; q++) e->N[q] = Nv[q];
    e->r = 0; e->cx = e->cy = 0; e->a0 = e->a1 = 0; e->ccw = 0;
    if (fabs(Nv[0]) > 1e-6) {   /* the wall's circle: centre (N1,N2)/N0, radius sqrt(|c|^2 - 1) */
      real ccx = Nv[1] / Nv[0], ccy = Nv[2] / Nv[0], q2 = ccx * ccx + ccy * ccy - 1;
      e->cx = ccx; e->cy = ccy; e->r = (real)sqrt(q2 > 0 ? q2 : 0);
      e->a0 = (real)atan2(e->ay - ccy, e->ax - ccx);
      real a1 = (real)atan2(e->by - ccy, e->bx - ccx), d = a1 - e->a0;
      while (d > M_PI) d -= (real)(2 * M_PI);
      while (d < -M_PI) d += (real)(2 * M_PI);
      e->a1 = e->a0 + d; e->ccw = d < 0;
    }
  }
  return 0;
}

int sp_curve_regular(sp_tank *t, int N, real u, real rot) {
  real xy[2 * SP_MAXW]; if (N < 3 || N > SP_MAXW) return -1;
  for (int i = 0; i < N; i++) { real a = (real)(-M_PI / 2 + i * 2 * M_PI / N), x = u * (real)cos(a), y = u * (real)sin(a);
    real c = (real)cos(rot), s = (real)sin(rot); xy[2 * i] = x * c - y * s; xy[2 * i + 1] = x * s + y * c; }
  return sp_curve_build(t, xy, N);
}

int sp_hyp_step(const sp_tank *t, sp_ball *b, real isub, real br, int *hit) {
  *hit = -1;
  real sp = (real)sqrt(b->vx * b->vx + b->vy * b->vy), ux = b->x, uy = b->y, r2 = ux * ux + uy * uy;
  if (!(r2 < (real)0.995)) return 1;                      /* at the rim: it has gone to infinity */
  real D = 1 - r2, P[3] = { (1 + r2) / D, 2 * ux / D, 2 * uy / D }, V[3];
  if (sp > (real)1e-9) {
    real wx = b->vx / sp, wy = b->vy / sp, uw = ux * wx + uy * wy;
    V[0] = 2 * uw / D; V[1] = wx + 2 * ux * uw / D; V[2] = wy + 2 * uy * uw / D;
    real ds = 2 * sp * isub, ch = (real)cosh(ds), sh = (real)sinh(ds), P2[3], V2[3];
    for (int q = 0; q < 3; q++) { P2[q] = ch * P[q] + sh * V[q]; V2[q] = sh * P[q] + ch * V[q]; }
    for (int q = 0; q < 3; q++) { P[q] = P2[q]; V[q] = V2[q]; }
  } else { V[0] = 0; V[1] = 1; V[2] = 0; }
  real sr = (real)sinh(2 * br); int outside = 0;
  for (int i = 0; i < t->n; i++) {
    const real *Nw = t->w[i].N; real d = mdot(P, Nw);
    if (d < -sr) outside = 1;
    if (d >= sr || d < -3 * sr) continue;
    int inSpan = 1; for (int j = 0; j < t->n; j++) { if (j == i) continue; if (mdot(P, t->w[j].N) < -sr) { inSpan = 0; break; } }
    if (!inSpan) continue;
    real vn = mdot(V, Nw); if (vn >= 0) continue;
    for (int q = 0; q < 3; q++) V[q] -= 2 * vn * Nw[q];
    if (d < 0) for (int q = 0; q < 3; q++) P[q] -= 2 * d * Nw[q];
    *hit = i; outside = 0;
  }
  P[0] = (real)sqrt(1 + P[1] * P[1] + P[2] * P[2]);       /* back onto the hyperboloid (rounding drift) */
  real pv = mdot(P, V); for (int q = 0; q < 3; q++) V[q] += pv * P[q];   /* and the heading onto its tangent plane */
  real qd = 1 + P[0], nx = P[1] / qd, ny = P[2] / qd;
  if (outside && nx * nx + ny * ny > (real)0.9) return 1;  /* left through a gap and nearly at the rim: gone */
  real dx = V[1] / qd - P[1] * V[0] / (qd * qd), dy = V[2] / qd - P[2] * V[0] / (qd * qd), dl = (real)sqrt(dx * dx + dy * dy);
  if (!(dl > 0)) dl = 1;
  b->x = nx; b->y = ny; if (sp > (real)1e-9) { b->vx = sp * dx / dl; b->vy = sp * dy / dl; }
  return 0;
}

real sp_ball_scale(real x, real y) { real s = 1 - x * x - y * y; return s > (real)0.08 ? s : (real)0.08; }

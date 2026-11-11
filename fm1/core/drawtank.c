/* The banded normal-space tank renderer. See drawtank.h. */
#include <math.h>
#include "drawtank.h"
#include "paint.h"

#define MID (SH_SCREEN / 2.0f)

void st_tumble(float a, float b, float M[9]) {   /* the web's _M = Ry(a) * Rx(b) */
  float ca = cosf(a), sa = sinf(a), cb = cosf(b), sb = sinf(b);
  M[0] = ca; M[1] = sa * sb; M[2] = sa * cb;
  M[3] = 0;  M[4] = cb;      M[5] = -sb;
  M[6] = -sa; M[7] = ca * sb; M[8] = ca * cb;
}

/* the web's P3: box-local (x, y in tank px; z 0 the front glass .. 1 the back) to the screen; *s = the scale there */
static void p3(const float M[9], double x, double y, double z, float *sx, float *sy, float *s) {
  float cx = (float)(x - SH_TCX), cy = (float)(y - SH_TCY), cz = (float)(z * SH_TBOXD - SH_TBOXD / 2.0);
  float wx = M[0] * cx + M[1] * cy + M[2] * cz, wy = M[3] * cx + M[4] * cy + M[5] * cz, wz = M[6] * cx + M[7] * cy + M[8] * cz + (float)(SH_TBOXD / 2.0);
  float f = ST_CAM / (ST_CAM + wz);
  *sx = MID + wx * f * ST_K; *sy = MID + wy * f * ST_K; *s = f * ST_K;
}

void st_view_prepare(st_view *v, const sh_tank *t, const float M[9], float hue0, const float *ballHue) {
  int td = t->s.scale->n * t->s.octs; float s;
  v->n = t->n; v->pymin = 1e9f; v->pymax = -1e9f;
  for (int i = 0; i < t->n; i++) {
    const sh_wall *e = &t->walls[i];
    p3(M, e->ax, e->ay, 0.0, &v->fx[i], &v->fy[i], &s);
    p3(M, e->ax, e->ay, 1.0, &v->bx[i], &v->by[i], &s);
    float lo = v->fy[i] < v->by[i] ? v->fy[i] : v->by[i], hi = v->fy[i] < v->by[i] ? v->by[i] : v->fy[i];
    if (lo < v->pymin) v->pymin = lo;
    if (hi > v->pymax) v->pymax = hi;
    float lit = (float)e->flash * 1.4f; v->lit[i] = lit > 1 ? 1 : lit;   /* a struck wall glows, then fades */
    v->wc[i] = pastel(hue0 + (td > 0 ? (float)e->deg / (float)td : 0), 0.38f + 0.3f * v->lit[i], 0.97f);
    v->open[i] = e->broken && !(e->reform > 0);                          /* an open gap is not drawn */
  }
  v->nb = t->nb;
  for (int i = 0; i < t->nb; i++) {
    const sh_ball *b = &t->balls[i];
    p3(M, b->x, b->y, b->z, &v->x[i], &v->y[i], &s);
    v->r[i] = (float)SH_BR * s * 1.5f; v->z[i] = (float)b->z;            /* a touch bigger than the web's: 240 px */
    p3(M, b->x, b->y, 1.0, &v->sx[i], &v->sy[i], &s);                    /* its shadow on the back pane */
    v->sx[i] += 3.0f * ST_K; v->sy[i] += 5.0f * ST_K; v->sr[i] = (float)SH_BR * s * 1.05f;
    v->bc[i] = pastel(ballHue ? ballHue[i] : hue0 + 0.618f * (float)i, 0.6f, 0.98f);
    int k = i; while (k > 0 && v->z[v->order[k - 1]] < v->z[i]) { v->order[k] = v->order[k - 1]; k--; }   /* far first */
    v->order[k] = i;
  }
  v->nd = 0;
  for (int k = 0; k < t->goo.n && v->nd < SH_GOO_MAXD; k++) {
    const sh_drop *p = &t->goo.d[k];
    p3(M, p->x, p->y, p->z, &v->dx[v->nd], &v->dy[v->nd], &s);
    v->dr[v->nd] = (float)p->r * s * (p->pooled ? 1.0f : 0.7f); v->dpool[v->nd] = p->pooled; v->nd++;
  }
  v->goo = pastel(0.42f, 0.42f, 0.86f);    /* mint, a shade darker than the page (look question 6) */
  v->pane = pastel(0.72f, 0.17f, 0.99f);   /* the lilac back glass */
}

/* a disc's pixels on one row: the body (the rest of the arguments) paints each pixel px (ddx: its offset from the centre) */
#define DISC_ROW(cx, cy, rad, yc, ...) do { float dy_ = (yc) - (cy), R_ = (rad); if (dy_ * dy_ < R_ * R_) { \
    float hw_ = sqrtf(R_ * R_ - dy_ * dy_); int x0_ = (int)ceilf((cx) - hw_ - 0.5f), x1_ = (int)floorf((cx) + hw_ - 0.5f); \
    x0_ = x0_ < 0 ? 0 : x0_; x1_ = x1_ >= SH_SCREEN ? SH_SCREEN - 1 : x1_; \
    for (int px = x0_; px <= x1_; px++) { float ddx = px + 0.5f - (cx); (void)ddx; __VA_ARGS__ } } } while (0)

void st_draw_band(const st_view *v, int y0, int rows, uint16_t *buf, uint16_t bg) {
  static int dl[SH_GOO_MAXD]; int nd = 0;   /* the drops that reach this band */
  for (int k = 0; k < v->nd; k++) if (v->dy[k] + v->dr[k] >= (float)y0 && v->dy[k] - v->dr[k] <= (float)(y0 + rows)) dl[nd++] = k;
  const uint16_t shade = rgb565(0.24f, 0.14f, 0.43f), white = 0xFFFF;
  for (int r = 0; r < rows; r++) {
    uint16_t *row = buf + r * SH_SCREEN; float yc = (float)(y0 + r) + 0.5f;
    for (int x = 0; x < SH_SCREEN; x++) row[x] = bg;
    if (yc < v->pymin - 3 || yc > v->pymax + 3) continue;   /* nothing of the box on this row */
    paint_poly_row(v->bx, v->by, v->n, yc, row, v->pane, 0.25f);                                  /* the back pane */
    for (int i = 0; i < v->nb; i++) DISC_ROW(v->sx[i], v->sy[i], v->sr[i], yc, row[px] = mix565(row[px], shade, 0.15f););
    for (int i = 0; i < v->n; i++) { int j = (i + 1) % v->n; if (v->open[i]) continue;            /* the side walls, glass */
      float qx[4] = { v->fx[i], v->fx[j], v->bx[j], v->bx[i] }, qy[4] = { v->fy[i], v->fy[j], v->by[j], v->by[i] };
      paint_poly_row(qx, qy, 4, yc, row, v->wc[i], 0.16f + 0.3f * v->lit[i]); }
    for (int i = 0; i < v->n; i++) paint_seg_row(v->fx[i], v->fy[i], v->bx[i], v->by[i], 1.0f, yc, row, white, 0.55f);   /* rails */
    for (int i = 0; i < v->n; i++) { int j = (i + 1) % v->n; if (!v->open[i]) paint_seg_row(v->bx[i], v->by[i], v->bx[j], v->by[j], 1.1f, yc, row, v->wc[i], 0.7f); }
    for (int q = 0; q < nd; q++) { int k = dl[q];                                                  /* the goo, then its spray */
      DISC_ROW(v->dx[k], v->dy[k], v->dr[k], yc, row[px] = v->dpool[k] ? mix565(row[px], v->goo, 0.92f) : mix565(row[px], v->goo, 0.6f);); }
    for (int o = 0; o < v->nb; o++) { int i = v->order[o]; float R = v->r[i], hz = 1.0f - 0.3f * v->z[i];   /* balls, far first */
      DISC_ROW(v->x[i], v->y[i], R, yc, { float hx = ddx + R * 0.35f, hy = (yc - v->y[i]) + R * 0.4f;
        float l = 1.0f - (hx * hx + hy * hy) / (R * R * 1.6f);
        row[px] = mix565(row[px], mix565(v->bc[i], white, l > 0 ? l * 0.55f : 0), hz); }); }
    for (int i = 0; i < v->n; i++) { int j = (i + 1) % v->n; if (!v->open[i])                      /* the front rim on top */
      paint_seg_row(v->fx[i], v->fy[i], v->fx[j], v->fy[j], 1.4f, yc, row, v->wc[i], 0.9f); }
  }
}

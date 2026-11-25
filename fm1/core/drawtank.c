/* The banded normal-space tank renderer. See drawtank.h. */
#include <math.h>
#include "drawtank.h"
#include "paint.h"

#define MID (SH_SCREEN / 2.0f)
/* where the tank sits and how big (st_set_frame): the middle of the screen at ST_K, or lifted and smaller over a page's
 * panel */
static float g_cx = MID, g_cy = MID, g_k = ST_K, g_cam = ST_CAM;
void st_set_frame(float cx, float cy, float k) { g_cx = cx; g_cy = cy; g_k = k; }
void st_set_cam(float cam) { g_cam = cam > 300.0f ? cam : 300.0f; }
void (*st_bg_row)(uint16_t *row, int y, int xlo, int xhi);   /* the page under the tank (0: a plain colour) */

void st_tumble(float a, float b, float M[9]) {   /* the web's _M = Ry(a) * Rx(b) */
  float ca = cosf(a), sa = sinf(a), cb = cosf(b), sb = sinf(b);
  M[0] = ca; M[1] = sa * sb; M[2] = sa * cb;
  M[3] = 0;  M[4] = cb;      M[5] = -sb;
  M[6] = -sa; M[7] = ca * sb; M[8] = ca * cb;
}
void st_tumble3(float a, float b, float c, float M[9]) {   /* Rz(c) * Ry(a) * Rx(b): the tumble, then the view rolled (the
                                                            * horizon tips; a roll on the box's side is only its spin) */
  float T[9], cc = cosf(c), sc = sinf(c);
  st_tumble(a, b, T);
  for (int j = 0; j < 3; j++) { M[j] = cc * T[j] - sc * T[3 + j]; M[3 + j] = sc * T[j] + cc * T[3 + j]; M[6 + j] = T[6 + j]; }
}

/* the web's P3: box-local (x, y in tank px; z 0 the front glass .. 1 the back) to the screen; *s = the scale there */
static void p3(const float M[9], double x, double y, double z, float *sx, float *sy, float *s) {
  float cx = (float)(x - SH_TCX), cy = (float)(y - SH_TCY), cz = (float)(z * SH_TBOXD - SH_TBOXD / 2.0);
  float wx = M[0] * cx + M[1] * cy + M[2] * cz, wy = M[3] * cx + M[4] * cy + M[5] * cz, wz = M[6] * cx + M[7] * cy + M[8] * cz + (float)(SH_TBOXD / 2.0);
  float f = g_cam / (g_cam + wz);
  *sx = g_cx + wx * f * g_k; *sy = g_cy + wy * f * g_k; *s = f * g_k;
}

/* a polygon's edges (the horizontal ones never cross a row centre: left out) */
static void poly_make(st_poly *p, const float *x, const float *y, int n, uint16_t col, float alpha) {
  p->n = 0; p->ylo = 1e9f; p->yhi = -1e9f; p->col = col; p->k = (uint8_t)k32(alpha);
  for (int i = 0; i < n && p->n < ST_PMAX; i++) { int j = (i + 1) % n; float x0 = x[i], y0 = y[i], x1 = x[j], y1 = y[j];
    if (y0 == y1) continue;
    if (y0 > y1) { float q = x0; x0 = x1; x1 = q; q = y0; y0 = y1; y1 = q; }
    st_edge *e = &p->e[p->n++]; e->y0 = y0; e->y1 = y1; e->x0 = x0; e->sl = (x1 - x0) / (y1 - y0);
    if (y0 < p->ylo) p->ylo = y0;
    if (y1 > p->yhi) p->yhi = y1; }
}
/* a line w px wide, its constants for seg_row */
static void seg_make(st_seg *s, float ax, float ay, float bx, float by, float w, uint16_t col, float alpha) {
  float dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy, wi = w - 1.0f; if (L2 < 1e-6f) L2 = 1e-6f;
  s->ax = ax; s->ay = ay; s->dx = dx; s->dy = dy; s->iL2 = 1.0f / L2; s->idy = (dy > 1e-3f || dy < -1e-3f) ? 1.0f / dy : 0.0f;
  { float iL = 1.0f / sqrtf(L2); s->nx = dy * iL; s->ny = -dx * iL; }
  s->ylo = (ay < by ? ay : by) - w; s->yhi = (ay < by ? by : ay) + w;
  s->w = w; s->w2 = w * w; s->wi2 = wi > 0.0f ? wi * wi : -1.0f; s->alpha = alpha; s->col = col; s->k = (uint8_t)k32(alpha);
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
    {   /* wall HP: a wall fades as its hits run out (to 40% on its last), a healing one fades back in */
      float f = 1.0f;
      if (t->s.wall_hp) { int full = sh_tank_wall_hp_full(t); f = e->broken ? (float)e->reform : 0.4f + 0.6f * (float)(e->hp - 1) / (float)(full > 1 ? full - 1 : 1); }
      v->hpf[i] = f < 0.0f ? 0.0f : f > 1.0f ? 1.0f : f; }
  }
  for (int i = 0; i < t->n; i++) { int j = (i + 1) % t->n; float a = v->fy[i], b = v->fy[j], c = v->by[i], d = v->by[j];
    float lo = a < b ? a : b, hi = a < b ? b : a; lo = c < lo ? c : lo; lo = d < lo ? d : lo; hi = c > hi ? c : hi; hi = d > hi ? d : hi;
    v->wy0[i] = lo - 1.0f; v->wy1[i] = hi + 1.0f; }
  for (int h = 0; h < SH_NWORM; h++) {   /* a wormhole: a disc in its wall's plane, across the wall and front to back */
    const sh_worm *P = &t->worm[h]; v->hn[h] = 0;
    if (!t->worm_on || h >= t->worm_n || P->rad < SH_BR) continue;
    for (int k = 0; k < ST_HOLE; k++) { float a = 6.2831853f * (float)k / ST_HOLE, c = cosf(a) * (float)P->rad, sn = sinf(a) * (float)P->rad;
      p3(M, SH_TCX + P->x + P->t1[0] * c, SH_TCY + P->y + P->t1[1] * c, (P->z + sn) / SH_TBOXD + 0.5, &v->hx[h][k], &v->hy[h][k], &s); }
    v->hy0[h] = 1e9f; v->hy1[h] = -1e9f;
    for (int k = 0; k < ST_HOLE; k++) { if (v->hy[h][k] < v->hy0[h]) v->hy0[h] = v->hy[h][k]; if (v->hy[h][k] > v->hy1[h]) v->hy1[h] = v->hy[h][k]; }
    v->hy0[h] -= 2.0f; v->hy1[h] += 2.0f;
    v->hn[h] = ST_HOLE; }
  v->hrim[0] = rgb565(255 / 255.0f, 156 / 255.0f, 207 / 255.0f); v->hdeep[0] = rgb565(122 / 255.0f, 69 / 255.0f, 200 / 255.0f);   /* the web's WORMC */
  v->hrim[1] = rgb565(134 / 255.0f, 232 / 255.0f, 214 / 255.0f); v->hdeep[1] = rgb565(47 / 255.0f, 116 / 255.0f, 196 / 255.0f);
  v->hrim[2] = rgb565(255 / 255.0f, 214 / 255.0f, 120 / 255.0f); v->hdeep[2] = rgb565(176 / 255.0f, 96 / 255.0f, 40 / 255.0f);    /* (the FM-1's other two) */
  v->hrim[3] = rgb565(196 / 255.0f, 170 / 255.0f, 255 / 255.0f); v->hdeep[3] = rgb565(84 / 255.0f, 60 / 255.0f, 170 / 255.0f);
  v->nb = 0;
  for (int bi = 0; bi < t->nb; bi++) {
    const sh_ball *b = &t->balls[bi];
    if (b->warp) continue;   /* in the other dimension: not drawn */
    int i = v->nb++;
    p3(M, b->x, b->y, b->z, &v->x[i], &v->y[i], &s);
    v->r[i] = (float)SH_BR * s * 1.5f; v->z[i] = (float)b->z;            /* a touch bigger than the web's: 240 px */
    p3(M, b->x, b->y, 1.0, &v->sx[i], &v->sy[i], &s);                    /* its shadow on the back pane */
    v->sx[i] += 3.0f * g_k; v->sy[i] += 5.0f * g_k; v->sr[i] = (float)SH_BR * s * 1.05f;
    v->bc[i] = pastel(ballHue ? ballHue[b - t->balls] : hue0 + 0.618f * (float)(b - t->balls), 0.6f, 0.98f);
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
  /* once a frame: the polygons' edges and the lines' constants (st_seg, st_poly) */
  poly_make(&v->back, v->bx, v->by, v->n, v->pane, 0.25f);
  v->nside = 0;
  for (int i = 0; i < v->n; i++) { int j = (i + 1) % v->n;
    float qx[4] = { v->fx[i], v->fx[j], v->bx[j], v->bx[i] }, qy[4] = { v->fy[i], v->fy[j], v->by[j], v->by[i] };
    if (v->open[i]) { v->side[i].n = 0; v->side[i].ylo = 1e9f; v->side[i].yhi = -1e9f; continue; }
    poly_make(&v->side[i], qx, qy, 4, v->wc[i], (0.16f + 0.3f * v->lit[i]) * v->hpf[i]); }
  v->nside = v->n;
  for (int h = 0; h < SH_NWORM; h++) {   /* a hole: its rim (the outline grown 1.3 px), then its inside (shrunk 1.3 px) */
    v->hole[h][0].n = v->hole[h][1].n = 0; v->hole[h][0].ylo = v->hole[h][1].ylo = 1e9f; v->hole[h][0].yhi = v->hole[h][1].yhi = -1e9f;
    if (!v->hn[h]) continue;
    float cx = 0, cy = 0, rs = 0, ox[ST_HOLE], oy[ST_HOLE], ix[ST_HOLE], iy[ST_HOLE];
    for (int k = 0; k < ST_HOLE; k++) { cx += v->hx[h][k]; cy += v->hy[h][k]; }
    cx /= ST_HOLE; cy /= ST_HOLE;
    for (int k = 0; k < ST_HOLE; k++) rs += sqrtf((v->hx[h][k] - cx) * (v->hx[h][k] - cx) + (v->hy[h][k] - cy) * (v->hy[h][k] - cy));
    rs = rs / ST_HOLE; if (rs < 2.0f) rs = 2.0f;
    for (int k = 0; k < ST_HOLE; k++) { float go = 1.0f + 1.3f / rs, gi = 1.0f - 1.3f / rs;
      ox[k] = cx + (v->hx[h][k] - cx) * go; oy[k] = cy + (v->hy[h][k] - cy) * go;
      ix[k] = cx + (v->hx[h][k] - cx) * gi; iy[k] = cy + (v->hy[h][k] - cy) * gi; }
    poly_make(&v->hole[h][0], ox, oy, ST_HOLE, v->hrim[h], 0.9f);
    poly_make(&v->hole[h][1], ix, iy, ST_HOLE, v->hdeep[h], 0.85f);
  }
  v->nunder = v->nover = 0;
  for (int i = 0; i < v->n; i++) seg_make(&v->under[v->nunder++], v->fx[i], v->fy[i], v->bx[i], v->by[i], 1.0f, 0xFFFF, 0.55f);   /* rails */
  for (int i = 0; i < v->n; i++) { int j = (i + 1) % v->n; if (v->open[i]) continue;
    seg_make(&v->under[v->nunder++], v->bx[i], v->by[i], v->bx[j], v->by[j], 1.1f, v->wc[i], 0.7f * v->hpf[i]);            /* back edges */
    seg_make(&v->over[v->nover++], v->fx[i], v->fy[i], v->fx[j], v->fy[j], 1.4f, v->wc[i], 0.9f * v->hpf[i]); }              /* the front rim */
}

/* a polygon's inside on row yc, columns xlo..xhi, even-odd */
static void poly_row(const st_poly *p, float yc, uint16_t *row, int xlo, int xhi) {
  if (yc < p->ylo || yc >= p->yhi) return;
  float xs[ST_PMAX]; int nx = 0;
  for (int i = 0; i < p->n; i++) { const st_edge *e = &p->e[i]; if (yc >= e->y0 && yc < e->y1) xs[nx++] = e->x0 + (yc - e->y0) * e->sl; }
  for (int a = 1; a < nx; a++) { float kk = xs[a]; int b = a - 1; while (b >= 0 && xs[b] > kk) { xs[b + 1] = xs[b]; b--; } xs[b + 1] = kk; }
  for (int a = 0; a + 1 < nx; a += 2) { int x0 = (int)ceilf(xs[a] - 0.5f), x1 = (int)floorf(xs[a + 1] - 0.5f);
    x0 = x0 < xlo ? xlo : x0; x1 = x1 > xhi ? xhi : x1;
    for (int px = x0; px <= x1; px++) row[px] = blend565(row[px], p->col, p->k); }
}
/* the pixels on row yc within w of a line, columns xlo..xhi, the last pixel feathered (paint.h's paint_seg_row, its
 * constants from st_seg) */
static void seg_row(const st_seg *s, float yc, uint16_t *row, int xlo, int xhi) {
  if (yc < s->ylo || yc > s->yhi) return;
  float tl = 0.0f, th = 1.0f;
  if (s->idy != 0.0f) { float t0 = (yc - s->w - s->ay) * s->idy, t1 = (yc + s->w - s->ay) * s->idy; if (t0 > t1) { float q = t0; t0 = t1; t1 = q; }
    tl = t0 > 0.0f ? t0 : 0.0f; th = t1 < 1.0f ? t1 : 1.0f; if (tl > th) return; }
  float xa = s->ax + s->dx * tl, xb = s->ax + s->dx * th, lo = xa < xb ? xa : xb, hi = xa < xb ? xb : xa;
  int x0 = (int)(lo - s->w), x1 = (int)(hi + s->w) + 1;
  x0 = x0 < xlo ? xlo : x0; x1 = x1 > xhi ? xhi : x1;
  /* the distance to the line is linear along the row: one add a pixel (the stretch past an end is at most w: a line is
   * 1..1.4 px wide; the projection with its clamp and square root cost a seventh of a busy frame, fm1-emu 2026-11-18) */
  float v = ((float)x0 + 0.5f - s->ax) * s->nx + (yc - s->ay) * s->ny;
  for (int px = x0; px <= x1; px++, v += s->nx) { float d = v < 0.0f ? -v : v;
    if (d < s->w) row[px] = blend565(row[px], s->col, d < s->w - 1.0f ? s->k : k32(s->alpha * (s->w - d))); }
}

/* a disc's pixels on one row, columns xlo..xhi: the body paints each pixel px (ddx: its offset from the centre) */
#define DISC_ROW(cx, cy, rad, yc, ...) do { float dy_ = (yc) - (cy), R_ = (rad); if (dy_ * dy_ < R_ * R_) { \
    float hw_ = sqrtf(R_ * R_ - dy_ * dy_); int x0_ = (int)ceilf((cx) - hw_ - 0.5f), x1_ = (int)floorf((cx) + hw_ - 0.5f); \
    x0_ = x0_ < xlo ? xlo : x0_; x1_ = x1_ > xhi ? xhi : x1_; \
    for (int px = x0_; px <= x1_; px++) { float ddx = px + 0.5f - (cx); (void)ddx; __VA_ARGS__ } } } while (0)

/* THE GOO AS ONE SLIME (Flah 2026-11-25: "it pretty much just looks like ... a bunch of balls together instead of an
 * actual cohesive slime type object ... the density and the circularness ... of each individual particle is just wrong").
 * Each drop was its own see-through disc: overlaps stacked darker and every drop kept its own round edge. Now a metaball
 * field: each drop adds (1 - d^2 / R^2)^2 out to R = GOO_REACH (1.6) x its radius, and one surface is drawn where the sum passes
 * GOO_T: neighbours flow into one body, the fill is even, the edge soft (anti-aliased over GOO_SOFT of the field) with a
 * darker rim, so it reads as one object. GOO_T is where a lone drop's surface falls on its own radius (1 - 1/REACH^2)^2,
 * so a single drop looks the size it did. Spray (drops not yet pooled, "the dot particles of slime that come off of the
 * notes") counts 0.45: alone it is a small bead (about a third of a drop's size), it shows whole only as it joins the
 * slime. Cost (fm1-emu, 40 keys over 20 s): worst 5 s window 36.2 fps against 41.0 with the discs (no square root a
 * row, only the columns the band's goo can reach cleared: 32.3 before those two). */
#define GOO_REACH 1.6f
#define GOO_T 0.371f             /* (1 - 1 / 1.6^2)^2 */
#define GOO_SOFT 0.22f
void st_draw_band(const st_view *v, int y0, int rows, uint16_t *buf, uint16_t bg, int xlo, int xhi) {
  static int dl[SH_GOO_MAXD]; int nd = 0;   /* the drops whose field reaches this band (and these columns) */
  static float acc[SH_SCREEN];
  if (xlo < 0) xlo = 0;
  if (xhi > SH_SCREEN - 1) xhi = SH_SCREEN - 1;
  int bx0 = xhi + 1, bx1 = xlo - 1;          /* the columns the band's goo can touch: only those are cleared and read */
  for (int k = 0; k < v->nd; k++) { float R = v->dr[k] * GOO_REACH;
    if (v->dy[k] + R >= (float)y0 && v->dy[k] - R <= (float)(y0 + rows) && v->dx[k] + R >= (float)xlo && v->dx[k] - R <= (float)(xhi + 1)) {
      int a = (int)(v->dx[k] - R), b = (int)(v->dx[k] + R) + 1;
      if (a < bx0) bx0 = a;
      if (b > bx1) bx1 = b;
      dl[nd++] = k; } }
  if (bx0 < xlo) bx0 = xlo;
  if (bx1 > xhi) bx1 = xhi;
  const uint16_t shade = rgb565(0.24f, 0.14f, 0.43f), white = 0xFFFF;
  const uint16_t rim = blend565(v->goo, shade, 12u);   /* the slime's edge: its own colour, deeper */
  for (int r = 0; r < rows; r++) {
    uint16_t *row = buf + r * SH_SCREEN; float yc = (float)(y0 + r) + 0.5f;
    if (st_bg_row) st_bg_row(row, y0 + r, xlo, xhi); else for (int x = xlo; x <= xhi; x++) row[x] = bg;
    if (yc < v->pymin - 3 || yc > v->pymax + 3) continue;   /* nothing of the box on this row */
    poly_row(&v->back, yc, row, xlo, xhi);                                                               /* the back pane */
    for (int i = 0; i < v->nb; i++) DISC_ROW(v->sx[i], v->sy[i], v->sr[i], yc, row[px] = blend565(row[px], shade, 5u););
    for (int i = 0; i < v->nside; i++) poly_row(&v->side[i], yc, row, xlo, xhi);                         /* the side walls, glass */
    for (int i = 0; i < v->nunder; i++) seg_row(&v->under[i], yc, row, xlo, xhi);                        /* rails, back edges */
    for (int h = 0; h < SH_NWORM; h++) if (v->hn[h]) { poly_row(&v->hole[h][0], yc, row, xlo, xhi); poly_row(&v->hole[h][1], yc, row, xlo, xhi); }   /* wormholes */
    if (nd) {                                                                                           /* the goo: one surface */
      int gx0 = xhi + 1, gx1 = xlo - 1;
      for (int px = bx0; px <= bx1; px++) acc[px] = 0.0f;
      for (int q = 0; q < nd; q++) { int k = dl[q]; float R = v->dr[k] * GOO_REACH, ir2 = 1.0f / (R * R), w = v->dpool[k] ? 1.0f : 0.45f;
        float dy = yc - v->dy[k]; if (dy * dy >= R * R) continue;
        int a = (int)ceilf(v->dx[k] - R - 0.5f), b = (int)floorf(v->dx[k] + R - 0.5f);   /* (the box: no square root; the field ends itself) */
        if (a < xlo) a = xlo;
        if (b > xhi) b = xhi;
        if (a > b) continue;
        if (a < gx0) gx0 = a;
        if (b > gx1) gx1 = b;
        { float dx = (float)a + 0.5f - v->dx[k], base = 1.0f - dy * dy * ir2;     /* (the distance stepped, not remade) */
          for (int px = a; px <= b; px++, dx += 1.0f) { float q2 = base - dx * dx * ir2; if (q2 > 0.0f) acc[px] += q2 * q2 * w; } } }
      for (int px = gx0; px <= gx1; px++) { float f = acc[px] - GOO_T; if (f <= 0.0f) continue;
        float e = f / GOO_SOFT;                                       /* 0 at the surface .. 1 a little inside it */
        uint16_t col = e < 1.0f ? blend565(rim, v->goo, k32(e)) : v->goo;
        if (f > GOO_SOFT * 2.0f) { float g = (f - GOO_SOFT * 2.0f) * 0.35f; col = blend565(col, white, k32(g > 0.25f ? 0.25f : g)); }   /* a sheen where it is thick */
        row[px] = blend565(row[px], col, k32(e < 1.0f ? 0.35f + 0.55f * e : 0.9f)); } }
    for (int o = 0; o < v->nb; o++) { int i = v->order[o]; float R = v->r[i]; uint32_t kz = k32(1.0f - 0.3f * v->z[i]);   /* balls, far first */
      float il = 0.55f / (R * R * 1.6f), hy = (yc - v->y[i]) + R * 0.4f, hy2 = hy * hy;
      DISC_ROW(v->x[i], v->y[i], R, yc, { float hx = ddx + R * 0.35f, l = 0.55f - (hx * hx + hy2) * il;
        row[px] = blend565(row[px], l > 0 ? blend565(v->bc[i], white, k32(l)) : v->bc[i], kz); }); }
    for (int i = 0; i < v->nover; i++) seg_row(&v->over[i], yc, row, xlo, xhi);                          /* the front rim on top */
  }
}

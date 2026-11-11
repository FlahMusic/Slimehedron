/* The banded curved-tank renderer. See drawspace.h. */
#include <math.h>
#include "drawspace.h"
#include "paint.h"

/* the tank's outline in the disk: each wall's arc as SP_ARCK points (a straight wall: its first corner) */
static int outline(const sp_tank *t, float *x, float *y) {
  int n = 0;
  for (int i = 0; i < t->n; i++) { const sp_wall *e = &t->w[i];
    for (int k = 0; k < SP_ARCK; k++) {
      if (e->r > 0) { float a = (float)e->a0 + ((float)e->a1 - (float)e->a0) * k / SP_ARCK;
        x[n] = (float)e->cx + cosf(a) * (float)e->r; y[n] = (float)e->cy + sinf(a) * (float)e->r; }
      else { float f = (float)k / SP_ARCK; x[n] = (float)e->ax + ((float)e->bx - (float)e->ax) * f; y[n] = (float)e->ay + ((float)e->by - (float)e->ay) * f; }
      n++; } }
  return n;
}
static void to_screen(sp_poly *p, const float *x, const float *y, int n, float rot, const sp_view *v) {
  float c = cosf(rot), s = sinf(rot); p->n = n; p->ymin = 1e9f; p->ymax = -1e9f;
  for (int i = 0; i < n; i++) { float X = x[i] * c - y[i] * s, Y = x[i] * s + y[i] * c;
    p->x[i] = v->cx + X * v->rd; p->y[i] = v->cy + Y * v->rd;
    p->ymin = p->y[i] < p->ymin ? p->y[i] : p->ymin; p->ymax = p->y[i] > p->ymax ? p->y[i] : p->ymax; }
}

void sp_view_prepare(sp_view *v, const sp_tank *t, float rot, const float *hue, const sp_ball *balls, int nb, float ballR, const float *ballHue) {
  v->cx = SH_SCREEN / 2.0f; v->cy = SH_SCREEN / 2.0f; v->rd = SH_SCREEN * 0.49f;
  float x[SP_PTS] = { 0 }, y[SP_PTS] = { 0 }, ex[SP_PTS], ey[SP_PTS]; int n = outline(t, x, y);
  to_screen(&v->tank, x, y, n, rot, v); v->tank.fill = pastel(0.72f, 0.06f, 1.0f); v->tank.edge = pastel(0.72f, 0.35f, 0.75f); v->tank.alpha = 0.55f;
  v->ne = 0;
  for (int i = 0; i < t->n; i++) { const sp_wall *e = &t->w[i]; if (!(e->r > 0)) continue;
    for (int k = 0; k < n; k++) {   /* inversion in the wall's circle (the web's invPts) */
      float dx = x[k] - (float)e->cx, dy = y[k] - (float)e->cy, d2 = dx * dx + dy * dy; if (!(d2 > 0)) d2 = 1;
      float q = (float)(e->r * e->r) / d2; ex[k] = (float)e->cx + dx * q; ey[k] = (float)e->cy + dy * q; }
    sp_poly *p = &v->echo[v->ne++]; to_screen(p, ex, ey, n, rot, v);
    p->fill = pastel(hue[i], 0.45f, 1.0f); p->edge = pastel(hue[i], 0.55f, 0.85f); p->alpha = 0.22f; }
  v->nb = nb > SP_MAXB ? SP_MAXB : nb;
  for (int i = 0; i < v->nb; i++) { float c = cosf(rot), s = sinf(rot), X = (float)balls[i].x * c - (float)balls[i].y * s, Y = (float)balls[i].x * s + (float)balls[i].y * c;
    v->bx[i] = v->cx + X * v->rd; v->by[i] = v->cy + Y * v->rd; v->br[i] = ballR * v->rd * (float)sp_ball_scale(balls[i].x, balls[i].y) * 2.2f;   /* drawn bigger than its physics size (the web: 1.3x), more at 240 px */
    v->bc[i] = pastel(ballHue ? ballHue[i] : 0.8f, 0.65f, 0.95f); }
}

/* one polygon on one row: its inside blended in, then its outline about edgeW px wide */
static void fill_row(const sp_poly *p, float yc, uint16_t *row, float edgeW) {
  if (yc < p->ymin - edgeW || yc > p->ymax + edgeW) return;
  paint_poly_row(p->x, p->y, p->n, yc, row, p->fill, p->alpha);
  for (int i = 0; i < p->n; i++) { int j = (i + 1) % p->n; paint_seg_row(p->x[i], p->y[i], p->x[j], p->y[j], edgeW, yc, row, p->edge, 0.9f); }
}

void sp_draw_band(const sp_view *v, int y0, int rows, uint16_t *buf, uint16_t bg) {
  for (int r = 0; r < rows; r++) { uint16_t *row = buf + r * SH_SCREEN; float yc = y0 + r + 0.5f;
    for (int x = 0; x < SH_SCREEN; x++) row[x] = bg;
    for (int i = 0; i < v->ne; i++) fill_row(&v->echo[i], yc, row, 1.0f);   /* the echoes first, faint */
    fill_row(&v->tank, yc, row, 1.6f);                                      /* then the tank over them */
    for (int i = 0; i < v->nb; i++) { float dy = yc - v->by[i], R = v->br[i]; if (dy * dy > R * R) continue;
      float hw = sqrtf(R * R - dy * dy); int x0 = (int)(v->bx[i] - hw), x1 = (int)(v->bx[i] + hw);
      x0 = x0 < 0 ? 0 : x0; x1 = x1 >= SH_SCREEN ? SH_SCREEN - 1 : x1;
      for (int x = x0; x <= x1; x++) { float dx = x + 0.5f - v->bx[i], hx = dx + R * 0.35f, hy = dy + R * 0.4f;   /* a lit sphere: a highlight up-left */
        float lit = 1.0f - (hx * hx + hy * hy) / (R * R * 1.6f); row[x] = mix565(v->bc[i], 0xFFFF, lit > 0 ? lit * 0.55f : 0); } }
  }
}

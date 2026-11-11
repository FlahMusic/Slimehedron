/* The banded curved-tank renderer. See drawspace.h. */
#include <math.h>
#include "drawspace.h"
#include "draw.h"   /* SH_SCREEN */

/* the same two small colour helpers as draw.c (kept static there) */
static uint16_t rgb565(float r, float g, float b) {
  int R = (int)(r * 31.0f + 0.5f), G = (int)(g * 63.0f + 0.5f), B = (int)(b * 31.0f + 0.5f);
  R = R < 0 ? 0 : R > 31 ? 31 : R; G = G < 0 ? 0 : G > 63 ? 63 : G; B = B < 0 ? 0 : B > 31 ? 31 : B;
  return (uint16_t)((R << 11) | (G << 5) | B);
}
static void hsv(float h, float s, float v, float *r, float *g, float *b) {
  h -= floorf(h); h *= 6.0f; int i = (int)h; float f = h - (float)i, p = v * (1 - s), q = v * (1 - s * f), t = v * (1 - s * (1 - f));
  switch (i % 6) { case 0: *r = v; *g = t; *b = p; break; case 1: *r = q; *g = v; *b = p; break; case 2: *r = p; *g = v; *b = t; break;
    case 3: *r = p; *g = q; *b = v; break; case 4: *r = t; *g = p; *b = v; break; default: *r = v; *g = p; *b = q; }
}
static uint16_t pastel(float h, float s, float v) { float r, g, b; hsv(h, s, v, &r, &g, &b); return rgb565(r, g, b); }
static uint16_t mix565(uint16_t a, uint16_t b, float t) {   /* a toward b by t */
  int ar = a >> 11, ag = (a >> 5) & 63, ab = a & 31, br = b >> 11, bg = (b >> 5) & 63, bb = b & 31;
  return (uint16_t)(((int)(ar + (br - ar) * t) << 11) | ((int)(ag + (bg - ag) * t) << 5) | (int)(ab + (bb - ab) * t));
}

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

/* even-odd fill of one polygon on one row, blended over the row; and its outline, about 2 px wide */
static void fill_row(const sp_poly *p, float yc, uint16_t *row, float edgeW) {
  if (yc < p->ymin - edgeW || yc > p->ymax + edgeW) return;
  float xs[SP_PTS]; int nx = 0;
  for (int i = 0; i < p->n; i++) { int j = (i + 1) % p->n; float y0 = p->y[i], y1 = p->y[j];
    if ((y0 <= yc && y1 > yc) || (y1 <= yc && y0 > yc)) xs[nx++] = p->x[i] + (yc - y0) / (y1 - y0) * (p->x[j] - p->x[i]); }
  for (int a = 1; a < nx; a++) { float k = xs[a]; int b = a - 1; while (b >= 0 && xs[b] > k) { xs[b + 1] = xs[b]; b--; } xs[b + 1] = k; }
  for (int a = 0; a + 1 < nx; a += 2) { int x0 = (int)ceilf(xs[a] - 0.5f), x1 = (int)floorf(xs[a + 1] - 0.5f);
    x0 = x0 < 0 ? 0 : x0; x1 = x1 >= SH_SCREEN ? SH_SCREEN - 1 : x1;
    for (int x = x0; x <= x1; x++) row[x] = mix565(row[x], p->fill, p->alpha); }
  /* the outline: each segment, the pixels within edgeW of it on this row */
  for (int i = 0; i < p->n; i++) { int j = (i + 1) % p->n; float ax = p->x[i], ay = p->y[i], bx = p->x[j], by = p->y[j];
    if ((ay < yc - edgeW && by < yc - edgeW) || (ay > yc + edgeW && by > yc + edgeW)) continue;
    float lo = ax < bx ? ax : bx, hi = ax < bx ? bx : ax; int x0 = (int)(lo - edgeW), x1 = (int)(hi + edgeW) + 1;
    x0 = x0 < 0 ? 0 : x0; x1 = x1 >= SH_SCREEN ? SH_SCREEN - 1 : x1;
    float dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy; if (L2 < 1e-6f) L2 = 1e-6f;
    for (int x = x0; x <= x1; x++) { float px = x + 0.5f, t = ((px - ax) * dx + (yc - ay) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      float qx = ax + dx * t - px, qy = ay + dy * t - yc, d = sqrtf(qx * qx + qy * qy);
      if (d < edgeW) row[x] = mix565(row[x], p->edge, d < edgeW - 1 ? 0.9f : 0.9f * (edgeW - d)); } }
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

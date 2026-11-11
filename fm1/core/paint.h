/* Slimehedron for the FM-1: the pixel helpers every banded renderer shares (GPL-3.0-or-later).
 * RGB565 colours, a pastel from hue/saturation/value, a blend, and two row painters: a polygon's span on one row
 * (even-odd, so a concave outline fills right) and a line's pixels on one row, about w px wide. A renderer calls
 * them row by row inside its band, so nothing needs a frame buffer. All static inline: no extra file to link. */
#ifndef SH_PAINT_H
#define SH_PAINT_H
#include <math.h>
#include <stdint.h>
#include "draw.h"   /* SH_SCREEN */

static inline uint16_t rgb565(float r, float g, float b) {
  int R = (int)(r * 31.0f + 0.5f), G = (int)(g * 63.0f + 0.5f), B = (int)(b * 31.0f + 0.5f);
  R = R < 0 ? 0 : R > 31 ? 31 : R; G = G < 0 ? 0 : G > 63 ? 63 : G; B = B < 0 ? 0 : B > 31 ? 31 : B;
  return (uint16_t)((R << 11) | (G << 5) | B);
}
static inline void hsv(float h, float s, float v, float *r, float *g, float *b) {
  h -= floorf(h); h *= 6.0f; int i = (int)h; float f = h - (float)i, p = v * (1 - s), q = v * (1 - s * f), t = v * (1 - s * (1 - f));
  switch (i % 6) { case 0: *r = v; *g = t; *b = p; break; case 1: *r = q; *g = v; *b = p; break; case 2: *r = p; *g = v; *b = t; break;
    case 3: *r = p; *g = q; *b = v; break; case 4: *r = t; *g = p; *b = v; break; default: *r = v; *g = p; *b = q; }
}
static inline uint16_t pastel(float h, float s, float v) { float r, g, b; hsv(h, s, v, &r, &g, &b); return rgb565(r, g, b); }
static inline uint16_t mix565(uint16_t a, uint16_t b, float t) {   /* a toward b by t */
  int ar = a >> 11, ag = (a >> 5) & 63, ab = a & 31, br = b >> 11, bg = (b >> 5) & 63, bb = b & 31;
  return (uint16_t)(((int)(ar + (br - ar) * t) << 11) | ((int)(ag + (bg - ag) * t) << 5) | (int)(ab + (bb - ab) * t));
}

/* a polygon's inside on the row at height yc (pixel centres), blended over the row by alpha; even-odd */
static inline void paint_poly_row(const float *x, const float *y, int n, float yc, uint16_t *row, uint16_t fill, float alpha) {
  float xs[64]; int nx = 0;
  for (int i = 0; i < n && nx < 64; i++) { int j = (i + 1) % n; float y0 = y[i], y1 = y[j];
    if ((y0 <= yc && y1 > yc) || (y1 <= yc && y0 > yc)) xs[nx++] = x[i] + (yc - y0) / (y1 - y0) * (x[j] - x[i]); }
  for (int a = 1; a < nx; a++) { float k = xs[a]; int b = a - 1; while (b >= 0 && xs[b] > k) { xs[b + 1] = xs[b]; b--; } xs[b + 1] = k; }
  for (int a = 0; a + 1 < nx; a += 2) { int x0 = (int)ceilf(xs[a] - 0.5f), x1 = (int)floorf(xs[a + 1] - 0.5f);
    x0 = x0 < 0 ? 0 : x0; x1 = x1 >= SH_SCREEN ? SH_SCREEN - 1 : x1;
    for (int px = x0; px <= x1; px++) row[px] = mix565(row[px], fill, alpha); }
}
/* the pixels on row yc within w of the segment (ax, ay)-(bx, by), blended by alpha, the last pixel feathered */
static inline void paint_seg_row(float ax, float ay, float bx, float by, float w, float yc, uint16_t *row, uint16_t col, float alpha) {
  if ((ay < yc - w && by < yc - w) || (ay > yc + w && by > yc + w)) return;
  float lo = ax < bx ? ax : bx, hi = ax < bx ? bx : ax; int x0 = (int)(lo - w), x1 = (int)(hi + w) + 1;
  x0 = x0 < 0 ? 0 : x0; x1 = x1 >= SH_SCREEN ? SH_SCREEN - 1 : x1;
  float dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy; if (L2 < 1e-6f) L2 = 1e-6f;
  for (int px = x0; px <= x1; px++) { float cx = px + 0.5f, t = ((cx - ax) * dx + (yc - ay) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    float qx = ax + dx * t - cx, qy = ay + dy * t - yc, d = sqrtf(qx * qx + qy * qy);
    if (d < w) row[px] = mix565(row[px], col, d < w - 1 ? alpha : alpha * (w - d)); }
}

#endif

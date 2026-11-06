/* The banded solid renderer. See draw.h. */
#include "draw.h"
#include <math.h>

#define CAMD   (3.0f * (float)SH_R)            /* camera distance in front of the middle: a mild perspective */
#define FOCAL  (110.0f / (float)SH_SOLID_R)    /* a solid's corners reach ~110 px from the screen's middle */

static uint16_t rgb565(float r, float g, float b) {
  int R = (int)(r * 31.0f + 0.5f), G = (int)(g * 63.0f + 0.5f), B = (int)(b * 31.0f + 0.5f);
  R = R < 0 ? 0 : R > 31 ? 31 : R; G = G < 0 ? 0 : G > 63 ? 63 : G; B = B < 0 ? 0 : B > 31 ? 31 : B;
  return (uint16_t)((R << 11) | (G << 5) | B);
}
/* pastel hue wheel: h 0..1, s, v */
static void hsv(float h, float s, float v, float *r, float *g, float *b) {
  h -= floorf(h); h *= 6.0f; int i = (int)h; float f = h - (float)i, p = v * (1 - s), q = v * (1 - s * f), t = v * (1 - s * (1 - f));
  switch (i % 6) { case 0: *r = v; *g = t; *b = p; break; case 1: *r = q; *g = v; *b = p; break; case 2: *r = p; *g = v; *b = t; break;
    case 3: *r = p; *g = q; *b = v; break; case 4: *r = t; *g = p; *b = v; break; default: *r = v; *g = p; *b = q; }
}

void sh_view_prepare(sh_view *v, const sh_solid *s, const float rot[9], const int *deg, int td, const float *flash, float hue0) {
  /* light from up-left-front (y is down, z points away from you) */
  const float L[3] = { -0.40f, -0.62f, -0.68f };
  v->nf = 0;
  for (int i = 0; i < s->np; i++) {
    const sh_face *f = &s->f[i];
    if (f->n < 3) continue;
    const float *m = rot; float n[3], c[3] = { 0, 0, 0 };
    for (int j = 0; j < 3; j++) n[j] = m[j * 3] * (float)s->pl[i].n[0] + m[j * 3 + 1] * (float)s->pl[i].n[1] + m[j * 3 + 2] * (float)s->pl[i].n[2];
    sh_vface *o = &v->f[v->nf]; o->n = f->n; o->ymin = 1e9f; o->ymax = -1e9f;
    for (int k = 0; k < f->n; k++) {
      float p[3];
      for (int j = 0; j < 3; j++) p[j] = m[j * 3] * (float)f->v[k].p[0] + m[j * 3 + 1] * (float)f->v[k].p[1] + m[j * 3 + 2] * (float)f->v[k].p[2];
      c[0] += p[0]; c[1] += p[1]; c[2] += p[2];
      float w = FOCAL * CAMD / (CAMD + p[2]);
      o->x[k] = SH_SCREEN / 2 + p[0] * w; o->y[k] = SH_SCREEN / 2 + p[1] * w;
      if (o->y[k] < o->ymin) o->ymin = o->y[k];
      if (o->y[k] > o->ymax) o->ymax = o->y[k];
    }
    c[0] /= (float)f->n; c[1] /= (float)f->n; c[2] /= (float)f->n;
    /* seen only if it faces the camera at (0,0,-CAMD) */
    if (n[0] * c[0] + n[1] * c[1] + n[2] * (c[2] + CAMD) >= 0) continue;
    float lit = -(n[0] * L[0] + n[1] * L[1] + n[2] * L[2]); if (lit < 0) lit = 0;
    float fl = flash ? flash[i] : 0, r, g, b;
    hsv(hue0 + (td > 0 ? (float)deg[i] / (float)td : 0), 0.42f - 0.25f * fl, 0.62f + 0.33f * lit + 0.25f * fl, &r, &g, &b);
    o->fill = rgb565(r, g, b);
    o->edge = rgb565(r * 0.55f, g * 0.55f, b * 0.65f);
    v->nf++;
  }
}

void sh_draw_band(const sh_view *v, int y0, int rows, uint16_t *buf, uint16_t bg) {
  for (int i = 0; i < SH_SCREEN * rows; i++) buf[i] = bg;
  for (int fi = 0; fi < v->nf; fi++) {
    const sh_vface *f = &v->f[fi];
    if (f->ymax < (float)y0 || f->ymin > (float)(y0 + rows)) continue;   /* not in this band */
    for (int r = 0; r < rows; r++) {
      float y = (float)(y0 + r) + 0.5f, xl = 1e9f, xr = -1e9f;
      if (y < f->ymin || y > f->ymax) continue;
      for (int k = 0; k < f->n; k++) {     /* a convex outline crosses a row in one span */
        int k2 = (k + 1) % f->n; float ya = f->y[k], yb = f->y[k2];
        if ((ya <= y && yb > y) || (yb <= y && ya > y)) {
          float x = f->x[k] + (y - ya) * (f->x[k2] - f->x[k]) / (yb - ya);
          if (x < xl) xl = x;
          if (x > xr) xr = x;
        }
      }
      if (xl > xr) continue;
      int a = (int)ceilf(xl - 0.5f), b = (int)floorf(xr - 0.5f);
      if (a < 0) a = 0;
      if (b > SH_SCREEN - 1) b = SH_SCREEN - 1;
      uint16_t *row = buf + r * SH_SCREEN;
      for (int x = a; x <= b; x++) row[x] = f->fill;
      if (a <= b) { row[a] = f->edge; row[b] = f->edge; }   /* the rims: a face reads as a pane */
    }
  }
}

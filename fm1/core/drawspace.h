/* Slimehedron for the FM-1: draws the curved tank on the 240x240 RGB565 screen in 16-row bands (GPL-3.0-or-later).
 * The web's curved look (index.html: drawHorizon, echoPolys): the tank's walls are arcs of the Poincare disk, and the
 * tank is mirrored across each of its own walls (a circle inversion), so copies of it shrink toward the rim like an
 * Escher circle print; each copy wears the colour of the wall that made it. The web's lighter look leaves out the
 * second ring of copies, and so does this one (it would cost ~76 KB of points). Balls shrink toward the rim, the way
 * a fixed size does in curved space. sp_view_prepare() once a frame, sp_draw_band() per band, like sh_draw_band(). */
#ifndef SH_DRAWSPACE_H
#define SH_DRAWSPACE_H
#include <stdint.h>
#include "space.h"

#define SP_ARCK  10                     /* points per wall arc, the web's 10 (6 left teeth on the mirrored copies' far edges) */
#define SP_PTS   (SP_MAXW * SP_ARCK)    /* points of one outline */
#define SP_MAXB  16                     /* balls drawn */

typedef struct { float x[SP_PTS], y[SP_PTS]; int n; float ymin, ymax; uint16_t fill, edge; float alpha; } sp_poly;
typedef struct {
  sp_poly tank, echo[SP_MAXW]; int ne;  /* the tank and its first ring of mirrored copies */
  float bx[SP_MAXB], by[SP_MAXB], br[SP_MAXB]; uint16_t bc[SP_MAXB]; int nb;
  float cx, cy, rd;                     /* the disk on screen: centre and radius, px */
} sp_view;

/* rot: the tank's spin (radians). hue[i]: wall i's note colour (0..1 round the wheel). balls: nb balls, ballR their
 * radius (disk units) and ballHue their colours. */
void sp_view_prepare(sp_view *v, const sp_tank *t, float rot, const float *hue, const sp_ball *balls, int nb, float ballR, const float *ballHue);
void sp_draw_band(const sp_view *v, int y0, int rows, uint16_t *buf, uint16_t bg);

#endif

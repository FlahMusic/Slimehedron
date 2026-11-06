/* Slimehedron for the FM-1: draws a solid on the 240x240 RGB565 screen in 16-row bands (GPL-3.0-or-later).
 * The FM-1 has no frame buffer to spare (a full one is 115 KB of ~511 KB), so the stock app paints the screen in
 * bands through a 7.5 KB DMA buffer. This does the same: sh_view_prepare() once a frame (turn, project, shade every
 * face), then sh_draw_band() per band. A convex solid needs no depth sort: only the faces turned toward you are
 * seen, and none of those can cover another. */
#ifndef SH_DRAW_H
#define SH_DRAW_H
#include <stdint.h>
#include "solid.h"

#define SH_SCREEN 240
#define SH_BAND   16

typedef struct { float x[SH_MAXFV], y[SH_MAXFV]; int n; float ymin, ymax; uint16_t fill, edge; } sh_vface;
typedef struct { sh_vface f[SH_MAXP]; int nf; } sh_view;

/* rot: a 3x3 turn (row major) applied to the solid. deg/td: each face's note (its colour). flash: 0..1 per face
 * (a face just rung glows), NULL for none. hue0: a turn of the colour wheel (0..1), for the slow colour drift. */
void sh_view_prepare(sh_view *v, const sh_solid *s, const float rot[9], const int *deg, int td, const float *flash, float hue0);
/* paint rows y0 .. y0+rows-1 into buf (SH_SCREEN * rows pixels), over bg */
void sh_draw_band(const sh_view *v, int y0, int rows, uint16_t *buf, uint16_t bg);

#endif

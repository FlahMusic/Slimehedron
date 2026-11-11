/* Slimehedron for the FM-1: draws the tank in normal space, 2.5D, on the 240x240 RGB565 screen in bands
 * (GPL-3.0-or-later). The web's canvas 3D view (index.html: draw3D, P3, drawBalls3D, drawGoo3D) at 240 px: the box
 * seen through a turning camera, its back pane in lilac glass with the balls' shadows on it, each wall a glass pane in
 * its note's colour (lit when struck), the corner rails, the goo inside, the balls back to front (a near ball is
 * bigger, a far one hazier), then the front rim in the walls' colours on top. An open wall is not drawn.
 * st_view_prepare() once a frame (project everything), st_draw_band() per band, like sh_draw_band(). */
#ifndef SH_DRAWTANK_H
#define SH_DRAWTANK_H
#include <stdint.h>
#include "tank.h"

#define ST_K    0.30f      /* web px to FM-1 px: the web's 720 px tank, R 300, drawn ~90 px from the middle */
#define ST_CAM  1000.0f    /* the web's camera distance (the back of the box shows at ~74% size) */

typedef struct {
  float fx[SH_MAXWALLS], fy[SH_MAXWALLS], bx[SH_MAXWALLS], by[SH_MAXWALLS];   /* each corner at the front and the back */
  uint16_t wc[SH_MAXWALLS]; float lit[SH_MAXWALLS]; uint8_t open[SH_MAXWALLS]; int n;
  float x[SH_BALLCAP], y[SH_BALLCAP], r[SH_BALLCAP], z[SH_BALLCAP], sx[SH_BALLCAP], sy[SH_BALLCAP], sr[SH_BALLCAP];
  uint16_t bc[SH_BALLCAP]; int order[SH_BALLCAP], nb;                         /* balls, drawn back to front */
  float dx[SH_GOO_MAXD], dy[SH_GOO_MAXD], dr[SH_GOO_MAXD]; uint8_t dpool[SH_GOO_MAXD]; int nd;
  uint16_t goo, pane;
  float pymin, pymax;      /* the box's rows on screen */
} st_view;

/* M: the camera's turn (3x3, row major: the web's _M); st_tumble makes the web's play/studio turn from two angles.
 * hue0: a turn of the colour wheel; ballHue: nb hues (0..1), or NULL for a hue by ball. */
void st_tumble(float a, float b, float M[9]);
void st_view_prepare(st_view *v, const sh_tank *t, const float M[9], float hue0, const float *ballHue);
void st_draw_band(const st_view *v, int y0, int rows, uint16_t *buf, uint16_t bg);

#endif

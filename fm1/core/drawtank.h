/* Slimehedron for the FM-1: draws the tank in normal space, 2.5D, on the 240x240 RGB565 screen in bands
 * (GPL-3.0-or-later). The web's canvas 3D view (index.html: draw3D, P3, drawBalls3D, drawGoo3D) at 240 px: the box
 * seen through a turning camera, its back pane in lilac glass with the balls' shadows on it, each wall a glass pane in
 * its note's colour (lit when struck), the corner rails, the goo inside, the balls back to front (a near ball is
 * bigger, a far one hazier), then the front rim in the walls' colours on top. An open wall is not drawn. In portal
 * space the two wormholes lie on their walls (pink and teal, the web's), and a ball inside one is not drawn.
 * st_view_prepare() once a frame (project everything), st_draw_band() per band, like sh_draw_band(). */
#ifndef SH_DRAWTANK_H
#define SH_DRAWTANK_H
#include <stdint.h>
#include "tank.h"

#define ST_K    0.30f      /* web px to FM-1 px: the web's 720 px tank, R 300, drawn ~90 px from the middle */
#define ST_CAM  1000.0f    /* the web's camera distance (the back of the box shows at ~74% size) */
#define ST_HOLE 14         /* points round a wormhole's rim (20 cost a quarter of a frame in fm1-emu; 14 still reads round at 240 px) */

/* Everything a row needs is worked out once a frame (2026-11-18: the per-row divisions were a fifth of a frame on the
 * chip): a line's slope, its inverse length, the rows it can touch; a polygon's edges with their slopes. */
typedef struct { float ax, ay, dx, dy, iL2, idy, ylo, yhi, w, w2, wi2, alpha, nx, ny; uint16_t col; uint8_t k; } st_seg;   /* nx, ny: the unit normal */
typedef struct { float y0, y1, x0, sl; } st_edge;                            /* y0 < y1; x at y0; dx per row */
#define ST_PMAX (SH_MAXWALLS > ST_HOLE ? SH_MAXWALLS : ST_HOLE)
typedef struct { st_edge e[ST_PMAX]; int n; float ylo, yhi; uint16_t col; uint8_t k; } st_poly;

typedef struct {
  st_poly back, side[SH_MAXWALLS], hole[SH_NWORM][2]; int nside;                    /* the back pane; the walls; each hole's rim, inside */
  st_seg under[2 * SH_MAXWALLS], over[SH_MAXWALLS]; int nunder, nover;       /* rails and back edges; the front rim on top */
  float fx[SH_MAXWALLS], fy[SH_MAXWALLS], bx[SH_MAXWALLS], by[SH_MAXWALLS];   /* each corner at the front and the back */
  float wy0[SH_MAXWALLS], wy1[SH_MAXWALLS];                                 /* each side wall's rows (a row past them skips it) */
  uint16_t wc[SH_MAXWALLS]; float lit[SH_MAXWALLS]; uint8_t open[SH_MAXWALLS]; int n;
  float x[SH_BALLCAP], y[SH_BALLCAP], r[SH_BALLCAP], z[SH_BALLCAP], sx[SH_BALLCAP], sy[SH_BALLCAP], sr[SH_BALLCAP];
  uint16_t bc[SH_BALLCAP]; int order[SH_BALLCAP], nb;                         /* balls, drawn back to front */
  float dx[SH_GOO_MAXD], dy[SH_GOO_MAXD], dr[SH_GOO_MAXD]; uint8_t dpool[SH_GOO_MAXD]; int nd;
  float hx[SH_NWORM][ST_HOLE], hy[SH_NWORM][ST_HOLE], hy0[SH_NWORM], hy1[SH_NWORM]; int hn[SH_NWORM]; uint16_t hrim[SH_NWORM], hdeep[SH_NWORM];   /* the wormholes, on their walls */
  uint16_t goo, pane;
  float pymin, pymax;      /* the box's rows on screen */
} st_view;

/* M: the camera's turn (3x3, row major: the web's _M); st_tumble makes the web's play/studio turn from two angles.
 * hue0: a turn of the colour wheel; ballHue: nb hues (0..1), or NULL for a hue by ball. */
void st_tumble(float a, float b, float M[9]);
void st_tumble3(float a, float b, float c, float M[9]);   /* with a roll about the view axis */
void st_set_cam(float cam);                                /* the camera's distance (ST_CAM: the web's) */
/* the tank's middle on the screen and its scale (web px to screen px; ST_K is the whole screen's) */
void st_set_frame(float cx, float cy, float k);
void st_view_prepare(st_view *v, const sh_tank *t, const float M[9], float hue0, const float *ballHue);
/* rows y0.. of the band into buf (240 wide); only columns xlo..xhi are painted (the rest is left as it was) */
void st_draw_band(const st_view *v, int y0, int rows, uint16_t *buf, uint16_t bg, int xlo, int xhi);

#endif

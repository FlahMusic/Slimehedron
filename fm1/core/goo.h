/* Slimehedron for the FM-1: the goo (GPL-3.0-or-later).
 * The plugin's goo (vst/slimehedron-core/src/tank/goo.rs, itself the web's splash / fillPhysics / gooStep3D / lavaTick /
 * gooContain3D / gooWake / relax3D / gooAt3) line for line: every wall hit splashes five drops, the ones the music
 * clock allows join the goo (a shape fills in about 64 bars), the pooled drops gather into one soft heart squeezed on
 * every beat, a ball shoves the goo aside, and the goo slows the balls and softens their notes (sh_goo_density).
 * This is the full goo, to match the plugin number for number on the host. Ticket 07 makes the device's lighter one:
 * the grids below are ~1.1 MB here. No malloc: everything lives in the struct. */
#ifndef SH_GOO_H
#define SH_GOO_H
#include <stdint.h>
#include "music.h"

#define SH_GOO_MAXCAP 1600                    /* the most drops a full goo holds */
#define SH_GOO_MAXD   (SH_GOO_MAXCAP * 2 + 16)
#define SH_GOO_PR     8.0                     /* a drop's full radius */
#define SH_GOO_RG_MAX (57 * 57 * 31)          /* the neighbour grid (cell = 2 drop radii) over the 720 px tank */
#define SH_GOO_GD_MAX (39 * 39 * 21)          /* the density grid (24 px cells) */

struct sh_wall; struct sh_ball;

typedef struct {
  double x, y, z, vx, vy, vz, r;   /* z: 0 = front pane, 1 = back pane */
  uint32_t age;
  uint8_t pooled, fade;            /* part of the goo / spray past the music clock's allowance, gone soon */
} sh_drop;

typedef struct { int nx, nz; double ox, oy, oz, cell; } sh_grid;

typedef struct {
  sh_drop d[SH_GOO_MAXD]; int n, max;
  int cap;                          /* the drop budget for this shape (the web's partCap) */
  double room[3];                   /* how far the heart may wander from the middle (gooRoom) */
  double fill_beats, measured_fill;
  uint64_t ticks;
  int has_lava; int64_t lava_beat; double axis[3], kick, heart[3], core;
  sh_grid rg; int32_t head[SH_GOO_RG_MAX], next[SH_GOO_MAXD]; int cells[SH_GOO_MAXD][3];
  sh_grid gd; double dens[SH_GOO_GD_MAX]; int dens_n;
} sh_goo;

/* An empty tank: area = the shape's area (px^2), room = the shortest way from the middle to a wall. */
void   sh_goo_init(sh_goo *g, double area, double room);
/* Five drops off a hit at (x, y, z), thrown along the wall's inward normal (inx, iny). */
void   sh_goo_splash(sh_goo *g, double x, double y, double z, double inx, double iny, sh_rng *rng);
/* How thick the goo is round a point, 0..1. */
double sh_goo_density(const sh_goo *g, double x, double y, double z);
/* One physics tick. */
void   sh_goo_step(sh_goo *g, double now_ms, double bpm, const struct sh_wall *walls, int nw,
                   const struct sh_ball *balls, int nb, sh_rng *rng);
/* How full the tank reads, 0..1, and how heavy the goo is (0 floats, 1 settles). */
double sh_goo_fill(const sh_goo *g);
double sh_goo_settle(const sh_goo *g);
int    sh_goo_pooled(const sh_goo *g);

#endif

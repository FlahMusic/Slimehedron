/* Slimehedron for the FM-1: the goo (GPL-3.0-or-later).
 * The plugin's goo (vst/slimehedron-core/src/tank/goo.rs, itself the web's splash / fillPhysics / gooStep3D / lavaTick /
 * gooContain3D / gooWake / relax3D / gooAt3) line for line: every wall hit splashes five drops, the ones the music
 * clock allows join the goo (a shape fills in about 64 bars), the pooled drops gather into one soft heart squeezed on
 * every beat, a ball shoves the goo aside, and the goo slows the balls and softens their notes (sh_goo_density).
 * Three builds:
 *   (default)          the plugin's goo exactly: dense grids over the whole tank (~1.1 MB with the tank). Host only.
 *   -DSH_GOO_HASHED    the same goo and the same numbers, its two grids hashed into small bucket tables (the pairs
 *                      and the sums come out in the same order, so it still matches the plugin exactly).
 *   -DSH_GOO_LIGHT     the device's goo (Flah 2026-11-11: "lighter but real"): hashed, float, half the drops at
 *                      2^(1/3) the size (the same volume, so it fills in the same bars and feels as thick).
 *                      Build it with -fsingle-precision-constant so its maths stays single precision.
 * No malloc: everything lives in the struct. */
#ifndef SH_GOO_H
#define SH_GOO_H
#include <stdint.h>
#include "music.h"

#ifdef SH_GOO_LIGHT
#ifndef SH_GOO_HASHED
#define SH_GOO_HASHED
#endif
typedef float greal;
/* SH_GOO_DIV: the plugin's drops per light drop (2, the light goo; the FM-1 build uses 4: fm1-emu STRICT measured the
 * 2-goo's tick at 4.8 ms mean, 11 ms worst a minute in, too much for 60 ticks a second on the chip). Each drop is
 * DIV^(1/3) the size, so DIV times fewer hold the same volume: the goo fills in the same bars and is as thick. */
#ifndef SH_GOO_DIV
#define SH_GOO_DIV 2
#endif
#if SH_GOO_DIV == 2
#define SH_GOO_DS     1.2599210498948732   /* 2^(1/3) */
#elif SH_GOO_DIV == 4
#define SH_GOO_DS     1.5874010519681994   /* 4^(1/3) */
#elif SH_GOO_DIV == 16
#define SH_GOO_DS     2.5198420997897464   /* 16^(1/3): the FM-1 since 2026-11-18 (a hundred drops: "the goo lags") */
#else
#error "SH_GOO_DIV: 2, 4 or 16"
#endif
#define SH_GOO_MAXCAP (1600 / SH_GOO_DIV)
#else
typedef double greal;
#define SH_GOO_DS     1.0
#define SH_GOO_MAXCAP 1600                  /* the most drops a full goo holds */
#endif
#define SH_GOO_MAXD   (SH_GOO_MAXCAP * 2 + 16)
#define SH_GOO_PR     (8.0 * SH_GOO_DS)     /* a drop's full radius */
#define SH_GOO_RG_MAX (57 * 57 * 31)        /* the dense neighbour grid (cell = 2 drop radii) over the 720 px tank */
#define SH_GOO_GD_MAX (39 * 39 * 21)        /* the dense density grid (24 px cells) */
#define SH_GOO_HASH   1024                  /* hashed: buckets for the neighbour grid */
#define SH_GOO_DHASH  512                   /* hashed: buckets for the density grid */

struct sh_wall; struct sh_ball;

typedef struct {
  greal x, y, z, vx, vy, vz, r;    /* z: 0 = front pane, 1 = back pane */
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
  sh_grid rg, gd;
#ifdef SH_GOO_HASHED
  int16_t head[SH_GOO_HASH], next[SH_GOO_MAXD], cells[SH_GOO_MAXD][3];                 /* drops by neighbour cell */
  int16_t dhead[SH_GOO_DHASH], dtail[SH_GOO_DHASH], dnext[SH_GOO_MAXD], dcell[SH_GOO_MAXD][3];   /* pooled, by density cell */
#else
  int32_t head[SH_GOO_RG_MAX], next[SH_GOO_MAXD]; int cells[SH_GOO_MAXD][3];
  double dens[SH_GOO_GD_MAX];
#endif
  int dens_n;
  double credit;                    /* SH_GOO_DIV 16: the share of a drop each hit has earned (5 / 16 a hit) */
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

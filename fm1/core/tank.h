/* Slimehedron for the FM-1: the tank in normal space (GPL-3.0-or-later).
 * The plugin's headless tank (vst/slimehedron-core/src/tank/mod.rs, itself the web's step(): the 3D prism, a polygon
 * pushed back into a box with a front and a back pane) line for line. Every wall is a note; a ball ringing a wall is a
 * hit. The auto-notes melody floats balls in toward the wall it wants, beat lock steers each ball's speed so its next
 * note lands on the grid, quantize holds a note that lands just short of a grid line, a wall opens every 8 bars and
 * heals 24 later, and the goo fills the tank and slows the balls.
 * One seam: sh_tank_init with settings and a seed, sh_tank_tick once per 60 Hz physics step with the clock, which
 * returns that tick's hits; sh_tank_on_bar at every bar line. The web's pixel units are kept (a 720 px tank, R 300).
 * Checked against the plugin by fm1/host/check-tank.js, number for number. All double for now (the device's float
 * question is ticket 08's, measured in fm1-emu). No malloc. */
#ifndef SH_TANK_H
#define SH_TANK_H
#include <stdint.h>
#include "music.h"
#include "melody.h"
#include "goo.h"

#define SH_TW       720.0
#define SH_TH       720.0
#define SH_TCX      (SH_TW / 2.0)
#define SH_TCY      (SH_TH / 2.0)
#define SH_TR       300.0                 /* corner radius */
#define SH_BR       9.0                   /* ball radius */
#define SH_TBOXD    (SH_TR * 1.2)         /* depth, front pane to back pane */
#define SH_FIXED    (1000.0 / 60.0)       /* one physics tick, ms */
#define SH_MAXBALLS 12                    /* most balls the auto-notes keep in the air */
#define SH_BALLCAP  (SH_MAXBALLS + 4)     /* most balls at all */
#define SH_QLATE    40.0                  /* a hit this soon after a grid line counts as on it (ms) */
#define SH_QWAIT    45.0                  /* the most a held note waits for the next grid line (ms) */
#define SH_MAXWALLS 16
#ifndef SH_MAXHITS
#define SH_MAXHITS  64                    /* hits kept from one tick (the device build keeps 32: 72 B each) */
#endif

typedef struct {
  int walls; const sh_scale *scale; int octs;
  double div, swing; int quantize;
  double spin;                    /* -100..100; turns spin * 0.0003 radians a tick */
  double chaos;                   /* how far a bounce knocks a ball off its angle */
  int vel_rand; int vel_fix, vel_min, vel_max;
  int auto_notes;
  int space;                      /* SH_SPACE_NORMAL, or SH_SPACE_PORTAL: two wormholes glide round the walls */
} sh_tank_settings;
#define SH_SPACE_NORMAL 0
#define SH_SPACE_PORTAL 1

/* studio with the slime on, at the plugin's start state */
sh_tank_settings sh_tank_defaults(void);

typedef struct {
  double cents; int vel;
  double imp, goo;                /* how hard (0..1), how gooed-up the ball was (0..1) */
  int pane, wall;                 /* a front/back pane chime; which wall (-1 for a pane) */
  double at_ms, sound_ms;         /* when the ball hit; when the note sounds (the next grid line if held) */
  double grid_ms, hit_grid_ms;    /* how far the note, and the hit, are from the nearest grid line */
} sh_hit;

typedef struct sh_wall {
  double ax, ay, bx, by, nx, ny;  /* corners; unit normal into the tank */
  int deg; double cents, flash;
  int broken; double reform;      /* an open gap (silent, balls pour through); healing 0..1, catches again past 0.55 */
} sh_wall;

typedef struct sh_ball {
  double x, y, z, vx, vy, vz;     /* z: 0 = front pane, 1 = back pane */
  double tq, tg;                  /* beat lock's speed factor (0.8..1.22) and the grid line it aims at (0 = none) */
  uint32_t bl;
  double last_hit, last_pane; uint32_t pane_n;
  double visc;                    /* how thick a goo this ball tolerates (0 = not met it yet) */
  /* in a wormhole (portal space): which hole it went into, when, for how long, and the frame it is carried across in */
  int warp, wa; double wt0, wdur, wc[3], wn[3], wt1[3], wv[3], wspd;
  double spit;                    /* when it last came out of one (the draw swells it back), or -inf */
} sh_ball;

/* a wormhole (portal space): it rests mid-wall and glides to a neighbouring wall on every beat */
typedef struct {
  double x, y, z, n[3], t1[3];    /* where it is (box-local, from the middle), its wall's inward normal, along the wall */
  double rad, want, cents;        /* how open it is, how open it is going to be (px), its wall's note */
  int wall, from, at, dir;        /* its wall now; the walls it is gliding from and to; which way round it tends */
  double za, zb;                  /* its depth gliding from, to */
  double suck, spit, pre;         /* for the draw: just swallowed a ball, just spat one, about to */
} sh_worm;

typedef struct {
  sh_tank_settings s;
  sh_rng rng;
  sh_wall walls[SH_MAXWALLS]; double vx[SH_MAXWALLS], vy[SH_MAXWALLS]; int n;
  double rot, rot_v;
  sh_ball balls[SH_BALLCAP]; int nb;
  sh_hit hits[SH_MAXHITS]; int nh;
  double bpm; int playing; double now;
  double last_tick; uint64_t tick_count;
  int broken_order[SH_MAXWALLS], broken_n;
  uint64_t wall_bars; double last_break;
  int home_root_deg;
  sh_melody melody; int has_mel_next; double mel_next; uint64_t mel_step_n;
  int aim_deg;
  double phi;                     /* the view's slow lean: the balls fall toward its "down" as the goo grows heavy */
  int worm_on, worm_key; int64_t worm_beat; double worm_open; sh_worm worm[2];   /* portal space */
  sh_goo goo;
} sh_tank;

void sh_tank_init(sh_tank *t, sh_tank_settings s, uint64_t seed);
/* play from here: the grid starts on this moment */
void sh_tank_start(sh_tank *t, double now_ms);
/* one 60 Hz step; returns the hit count, the hits in t->hits */
int  sh_tank_tick(sh_tank *t, double now_ms, double bpm, int playing);
/* one bar has passed: a wall opens every 8 bars, the oldest gap heals every 24 */
void sh_tank_on_bar(sh_tank *t);
/* a ball from the middle in a random direction at the tempo's speed; 0 = the tank is full */
int  sh_tank_add_ball(sh_tank *t);
int  sh_tank_add_ball_at(sh_tank *t, double x, double y, double z, double vx, double vy, double vz);
int  sh_tank_inside(const sh_tank *t, double x, double y);

#endif

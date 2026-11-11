/* Slimehedron for the FM-1: curved space (GPL-3.0-or-later).
 * The web app's CURVED tank (index.html, THREE SPACES: hypCorner, curveEdges, hypSub) in C99 with no malloc: the
 * hyperbolic plane drawn as a Poincare disk. A wall is a true straight line of that space (on screen an arc that meets
 * the rim at right angles); a ball flies along the space's own straight lines and bounces by an exact Lorentz
 * reflection. Physics runs on the hyperboloid, where a straight line is cosh/sinh, and is drawn in the disk.
 * Units: DISK units (the disk's radius is 1, y down like the web's screen), so nothing depends on the screen size.
 * Checked against the web's own numbers (_dev/space-ref.json, made by _dev/space-ref.js) by fm1/host/check-space.js.
 * Build with -DSH_REAL=double on the host to compare; the device uses float. */
#ifndef SH_SPACE_H
#define SH_SPACE_H
#include "solid.h"   /* real */

#define SP_MAXW 16          /* walls of a curved shape (the web's regular shapes go to 12) */
#define SP_UV   0.74        /* how far toward the rim the corners sit (HYP.UV) */

typedef struct {
  real N[3];                /* the wall's unit normal on the hyperboloid (Minkowski), pointing into the tank */
  real ax, ay, bx, by;      /* its two corners, in the disk */
  real cx, cy, r;           /* its circle in the disk (r = 0: a diameter, drawn straight) */
  real a0, a1; int ccw;     /* the arc from corner a to corner b, the way the web's canvas draws it */
} sp_wall;

typedef struct { sp_wall w[SP_MAXW]; int n; } sp_tank;
typedef struct { real x, y, vx, vy; } sp_ball;   /* position and velocity in the disk (velocity per tick) */

/* The corner radius in the disk for a regular N-gon that tiles the plane (k meet at a corner), nearest uv. *k = that k. */
real sp_hyp_corner(int N, real uv, int *k);
/* A regular N-gon (spin rot, radians; the web's first corner is at the top) with its corners at radius u. 0 = ok. */
int  sp_curve_regular(sp_tank *t, int N, real u, real rot);
/* The walls from any convex corner list in the disk (n corners, xy pairs). 0 = ok, -1 = too many walls. */
int  sp_curve_build(sp_tank *t, const real *xy, int n);
/* One sub-step (isub of a tick; the web runs 2 of 0.5 at most speeds) of a ball of radius br (disk units).
 * Returns 1 when the ball has gone to the rim (infinity), else 0. *hit = the wall it bounced off, or -1. */
int  sp_hyp_step(const sp_tank *t, sp_ball *b, real isub, real br, int *hit);
/* How big a ball looks where it is: a fixed size in curved space shrinks toward the rim (the web's ballScale). */
real sp_ball_scale(real x, real y);

#endif

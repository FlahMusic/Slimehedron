/* Slimehedron for the FM-1: real solids (GPL-3.0-or-later).
 * The same maths as the web app's REAL SOLIDS block (index.html) and the plugin's tank/solid.rs, in C99 with no
 * malloc: a solid is a set of face planes, the shape is everything inside all of them, every face is a note.
 * Checked against the web's numbers (_dev/solid-ref.json) by fm1/host/check.js.
 * Units are the web's: px, centred, y DOWN, z toward the back. Build with -DSH_REAL=double on the host to compare
 * to 1e-5; the device uses float. */
#ifndef SH_SOLID_H
#define SH_SOLID_H

#ifndef SH_REAL
#define SH_REAL float
#endif
typedef SH_REAL real;

#define SH_R        300.0          /* the web's corner radius */
#define SH_BOXD     (SH_R * 1.2)
#define SH_SOLID_R  (SH_R * 0.95)
#define SH_ORB_MINF 12
#define SH_ORB_MAXF 124             /* 31-EDO over 4 octaves */
#define SH_MAXP     160             /* planes while growing (cut adds one per corner): orb124, icosa.cut.cut (92) */
#define SH_MAXFV    16              /* corners of one face outline while clipping (an orb face has 5-7) */
#define SH_MAXV     320             /* corners of a solid (orb124 has 244) */
#define SH_MAXNB    12              /* edges at one corner */

typedef struct { real n[3]; real d; } sh_plane;
typedef struct { real p[3]; int t; } sh_fpt;
typedef struct { sh_fpt v[SH_MAXFV]; int n; } sh_face;
typedef struct { real p[3]; int nb[SH_MAXNB]; int nnb; } sh_vert;

/* One solid and its scratch: about 67 KB in float (the device), plus 23 KB for the view and a 7.5 KB band (measured, host build). Keep ONE, statically. */
typedef struct {
  sh_plane pl[SH_MAXP]; int np;
  sh_face  f[SH_MAXP];
  sh_vert  v[SH_MAXV];  int nv;
  sh_plane tmp[SH_MAXP];
} sh_solid;

/* Build the planes for a name ("cube", "orb93", "icosa.cut.flip", "prism6"). 0 = ok, -1 = not a solid name. */
int  sh_solid_build(sh_solid *s, const char *name);
/* Fill s->f from s->pl (an empty outline, n = 0, for a plane that makes no face). */
void sh_solid_faces(sh_solid *s);
/* Fill s->v from s->f. */
void sh_solid_verts(sh_solid *s);
/* An orb's notes: deg[i] for plane i, one per face, bottom to top, out of td degrees. */
void sh_orb_degrees(const sh_solid *s, int td, int *deg);

#endif

/* Slimehedron for the FM-1: the auto-notes melody (GPL-3.0-or-later).
 * The web app's singing line (index.html: nextMelodyDeg, noDrone, setDeg), number for number, the same as the plugin's
 * tank/melody.rs: a 4-bar question, a 4-bar answer, an arch over each, strong beats on chord tones, weak beats on
 * passing steps, a leap that resolves, a motif echoed in the answer, no note three times, no a-b-a-b trill.
 * Random numbers come in through a callback, so a test can replay the web's own stream (vst/.../melody_golden.txt,
 * written by _dev/dev-vstmelody.js) and get the same notes back. No floats in the state; plain C99, no malloc. */
#ifndef SH_MELODY_H
#define SH_MELODY_H
#include <stdint.h>

typedef struct {
  int has_deg, deg, last_leap, contour;
  uint64_t step16;
  int motif[8], motif_n;
  int has_prev, prev; unsigned run;
  int hist[8], hist_n;
} sh_melody;

typedef double (*sh_rand_fn)(void *ctx);   /* 0 <= r < 1 */

void sh_melody_init(sh_melody *m);
/* The next note, as a scale degree across all octaves. n = the scale's length, root = the chord's root degree. */
int  sh_melody_next(sh_melody *m, int strong, int n, int root, sh_rand_fn rnd, void *ctx);

#endif

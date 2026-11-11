/* Host test of the FM-1 core's tank against the plugin's: runs the scenes in scenes.txt and prints the same lines as
 * tankref (the plugin's tank, fm1/host/tankref): every hit, and every 30 ticks the balls, the open walls and the goo.
 * fm1/host/check-tank.js compares the two.   tanktest SCENES */
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include "../core/tank.h"

static sh_tank T;   /* ~1.6 MB with the full goo: static, not on the stack */

int main(int argc, char **argv) {
  if (argc < 2) { fprintf(stderr, "tanktest SCENES\n"); return 2; }
  FILE *f = fopen(argv[1], "r"); if (!f) { perror(argv[1]); return 2; }
  printf("# sizeof(sh_tank) %zu\n", sizeof T);   /* the RAM the tank takes, for check-goolight.js */
  char line[512];
  while (fgets(line, sizeof line, f)) {
    char name[64], scale[64]; int walls, octs, quant, velr, autn; double spin, chaos, swing, bpm; unsigned long long seed; int bars;
    if (line[0] == '#' || sscanf(line, "%63s %d %63s %d %lf %lf %d %lf %d %d %lf %llu %d", name, &walls, scale, &octs, &spin,
        &chaos, &quant, &swing, &velr, &autn, &bpm, &seed, &bars) != 13) continue;
    sh_tank_settings s = sh_tank_defaults();
    s.walls = walls; s.scale = sh_scale_by_id(scale); s.octs = octs; s.spin = spin; s.chaos = chaos; s.quantize = quant;
    s.swing = swing; s.vel_rand = velr; s.auto_notes = autn;
    if (!s.scale) { fprintf(stderr, "unknown scale %s\n", scale); return 2; }
    printf("scene %s\n", name);
    sh_tank_init(&T, s, seed);
    sh_tank_start(&T, 0.0);
    if (!autn) for (int i = 0; i < 5; i++) sh_tank_add_ball(&T);
    double bar_ms = 240000.0 / bpm, next_bar = bar_ms;
    for (unsigned long long i = 0; (double)i * SH_FIXED < (double)bars * bar_ms; i++) {
      double now = (double)i * SH_FIXED;
      int nh = sh_tank_tick(&T, now, bpm, 1);
      for (int k = 0; k < nh; k++) { const sh_hit *h = &T.hits[k];
        printf("h %llu %.17g %d %.17g %.17g %d %d %.17g %.17g %.17g %.17g\n", i, h->cents, h->vel, h->imp, h->goo, h->pane,
          h->wall, h->at_ms, h->sound_ms, h->grid_ms, h->hit_grid_ms); }
      if (now >= next_bar) { sh_tank_on_bar(&T); next_bar += bar_ms; }
      if (getenv("TANKDBG")) for (int k = 0; k < T.goo.n; k++) { const sh_drop *p = &T.goo.d[k];
        printf("d %llu %d %.17g %.17g %.17g %.17g %.17g %.17g %.17g\n", i, k, p->x, p->y, p->z, p->vx, p->vy, p->vz, p->r); }
      if (i % 30 == 0) {
        printf("s %llu %d", i, T.nb);
        for (int k = 0; k < T.nb; k++) { const sh_ball *b = &T.balls[k];
          printf(" %.17g %.17g %.17g %.17g %.17g %.17g %.17g", b->x, b->y, b->z, b->vx, b->vy, b->vz, b->tq); }
        printf(" w ");
        for (int k = 0; k < T.n; k++) printf("%s%d%.17g", k ? "," : "", T.walls[k].broken, T.walls[k].reform);
        double sx = 0, sy = 0, sz = 0; int np = 0;
        for (int k = 0; k < T.goo.n; k++) { sx += T.goo.d[k].x; sy += T.goo.d[k].y; sz += T.goo.d[k].z; if (T.goo.d[k].pooled) np++; }
        printf(" g %d %d %d %.17g %.17g %.17g %.17g\n", T.goo.cap, T.goo.n, np, sh_goo_fill(&T.goo), sx, sy, sz);
      }
    }
  }
  fclose(f);
  return 0;
}

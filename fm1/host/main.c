/* Host build of the FM-1 core (not on the device). Two jobs:
 *   solidtest dump              every reference shape's planes, corners, edges and orb notes, for check.js
 *   solidtest render NAME TD F  one 240x240 frame drawn band by band, written as a PPM, with the time it took */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#include "../core/solid.h"
#include "../core/draw.h"

static sh_solid S;   /* one, static: the device has no heap to spare */
static sh_view V;
static const char *NAMES[] = { "tetra", "cube", "octa", "dodeca", "icosa", "prism3", "prism6", "prism12", "cube.cut", "icosa.cut",
  "cube.flip", "cube.puff", "octa.cut", "dodeca.flip", "tetra.cut.flip", "orb12", "orb21", "orb31", "orb62", "orb93", "orb124" };

static void turn(float ax, float ay, float m[9]) {   /* tilt about x, then turn about y */
  float cx = cosf(ax), sx = sinf(ax), cy = cosf(ay), sy = sinf(ay);
  float r[9] = { cy, 0, sy,  sx * sy, cx, -sx * cy,  -cx * sy, sx, cx * cy };
  memcpy(m, r, sizeof r);
}

int main(int argc, char **argv) {
  if (argc >= 2 && !strcmp(argv[1], "dump")) {
    printf("{");
    for (size_t i = 0; i < sizeof NAMES / sizeof *NAMES; i++) {
      if (sh_solid_build(&S, NAMES[i])) { fprintf(stderr, "cannot build %s\n", NAMES[i]); return 1; }
      int e = 0; for (int k = 0; k < S.nv; k++) e += S.v[k].nnb;
      printf("%s\"%s\":{\"verts\":%d,\"edges\":%d,\"planes\":[", i ? "," : "", NAMES[i], S.nv, e / 2);
      for (int k = 0; k < S.np; k++) printf("%s[%.9g,%.9g,%.9g,%.9g]", k ? "," : "", (double)S.pl[k].n[0], (double)S.pl[k].n[1], (double)S.pl[k].n[2], (double)S.pl[k].d);
      printf("],\"deg\":");
      if (!strncmp(NAMES[i], "orb", 3)) { int d[SH_MAXP]; sh_orb_degrees(&S, 21, d); printf("["); for (int k = 0; k < S.np; k++) printf("%s%d", k ? "," : "", d[k]); printf("]"); }
      else printf("null");
      printf("}");
    }
    printf("}\n");
    return 0;
  }
  if (argc >= 5 && !strcmp(argv[1], "render")) {
    int td = atoi(argv[3]), deg[SH_MAXP];
    if (sh_solid_build(&S, argv[2])) { fprintf(stderr, "not a solid: %s\n", argv[2]); return 1; }
    sh_orb_degrees(&S, td, deg);   /* (any solid: one note per face, bottom to top) */
    static uint16_t screen[SH_SCREEN * SH_SCREEN], band[SH_SCREEN * SH_BAND];
    float m[9]; turn(0.45f, 0.6f, m);
    const int FRAMES = 200;
    clock_t t0 = clock();
    for (int fr = 0; fr < FRAMES; fr++) {
      turn(0.45f, 0.6f + fr * 0.01f, m);
      sh_view_prepare(&V, &S, m, deg, td, NULL, 0.0f);
      for (int y = 0; y < SH_SCREEN; y += SH_BAND) {
        sh_draw_band(&V, y, SH_BAND, band, 0x18c6);
        if (fr == FRAMES - 1) memcpy(screen + y * SH_SCREEN, band, sizeof band);
      }
    }
    double ms = 1000.0 * (double)(clock() - t0) / CLOCKS_PER_SEC / FRAMES;
    FILE *f = fopen(argv[4], "wb"); if (!f) return 1;
    fprintf(f, "P6\n%d %d\n255\n", SH_SCREEN, SH_SCREEN);
    for (int i = 0; i < SH_SCREEN * SH_SCREEN; i++) {
      uint16_t c = screen[i]; unsigned char px[3] = { (unsigned char)((c >> 11) * 255 / 31), (unsigned char)(((c >> 5) & 63) * 255 / 63), (unsigned char)((c & 31) * 255 / 31) };
      fwrite(px, 1, 3, f);
    }
    fclose(f);
    printf("%s: %d faces, %d seen, %.3f ms a frame on this pc, solid %zu bytes + view %zu bytes + band %zu bytes\n",
           argv[2], S.np, V.nf, ms, sizeof S, sizeof V, sizeof band);
    return 0;
  }
  fprintf(stderr, "usage: solidtest dump | solidtest render NAME TD OUT.ppm\n");
  return 2;
}

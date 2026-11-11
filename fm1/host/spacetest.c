/* Host build of the FM-1 core's curved space (not on the device). check-space.js feeds it one line per ball on stdin:
 *   N x y vx vy br        a regular curved N-gon (corners where the web puts them), one ball, in disk units
 * and it flies that ball the way the reference did (900 ticks, 2 sub-steps of 0.5), printing one JSON line each:
 *   {"N":..,"walls":[[N0,N1,N2,cx,cy,r,a0,a1,ccw],..],"path":[[x,y,vx,vy] every 30 ticks, or null when gone],"hits":[[tick,sub,wall],..]} */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include "../core/space.h"
#include "../core/drawspace.h"
#include "../core/draw.h"

static sp_tank T;
static sp_view VW;
static uint16_t BAND[SH_SCREEN * SH_BAND], FRAME[SH_SCREEN * SH_SCREEN];

/* spacetest render N OUT.ppm: a curved N-gon with four balls flown 140 ticks, one frame drawn band by band */
static int render(int N, const char *out) {
  int k; real u = sp_hyp_corner(N, (real)SP_UV, &k); if (sp_curve_regular(&T, N, u, 0)) return 1;
  sp_ball b[4] = { { 0.1, 0.05, 0.010, 0.004 }, { -0.2, 0.1, -0.006, 0.009 }, { 0.05, -0.25, 0.008, -0.007 }, { -0.1, -0.1, -0.009, -0.005 } };
  for (int t = 0; t < 140; t++) for (int i = 0; i < 4; i++) for (int s = 0; s < 2; s++) { int h; sp_hyp_step(&T, &b[i], (real)0.5, (real)0.0254, &h); }
  float hue[SP_MAXW], bh[4] = { 0.05f, 0.33f, 0.58f, 0.83f }; for (int i = 0; i < N; i++) hue[i] = (float)i / N;
  clock_t c0 = clock(); int reps = 50;
  for (int r = 0; r < reps; r++) { sp_view_prepare(&VW, &T, 0.2f, hue, b, 4, 0.0254f, bh);
    for (int y = 0; y < SH_SCREEN; y += SH_BAND) { sp_draw_band(&VW, y, SH_BAND, BAND, 0xF7BF); memcpy(FRAME + y * SH_SCREEN, BAND, sizeof BAND); } }
  fprintf(stderr, "curved %d-gon (k %d): %.3f ms a frame on this pc (host, -O2)\n", N, k, 1000.0 * (clock() - c0) / CLOCKS_PER_SEC / reps);
  FILE *f = fopen(out, "wb"); if (!f) return 1; fprintf(f, "P6 %d %d 255\n", SH_SCREEN, SH_SCREEN);
  for (int i = 0; i < SH_SCREEN * SH_SCREEN; i++) { uint16_t p = FRAME[i]; unsigned char rgb[3] = { (unsigned char)((p >> 11) * 255 / 31), (unsigned char)(((p >> 5) & 63) * 255 / 63), (unsigned char)((p & 31) * 255 / 31) }; fwrite(rgb, 1, 3, f); }
  fclose(f); return 0;
}

int main(int argc, char **argv) {
  if (argc >= 4 && !strcmp(argv[1], "render")) return render(atoi(argv[2]), argv[3]);
  int N; double x, y, vx, vy, br;
  while (scanf("%d %lf %lf %lf %lf %lf", &N, &x, &y, &vx, &vy, &br) == 6) {
    int k; real u = sp_hyp_corner(N, (real)SP_UV, &k);
    if (sp_curve_regular(&T, N, u, 0)) { fprintf(stderr, "bad N %d\n", N); return 1; }
    printf("{\"N\":%d,\"k\":%d,\"u\":%.12g,\"walls\":[", N, k, (double)u);
    for (int i = 0; i < T.n; i++) { const sp_wall *w = &T.w[i];
      printf("%s[%.12g,%.12g,%.12g,%.12g,%.12g,%.12g,%.12g,%.12g,%d]", i ? "," : "", (double)w->N[0], (double)w->N[1], (double)w->N[2],
        (double)w->cx, (double)w->cy, (double)w->r, (double)w->a0, (double)w->a1, w->ccw); }
    printf("],\"path\":[");
    sp_ball b = { (real)x, (real)y, (real)vx, (real)vy }; int np = 0, gone = 0;
    char hits[65536]; int hl = 0, nh = 0; hits[0] = 0;
    for (int t = 0; t < 900 && !gone; t++) {
      for (int s = 0; s < 2; s++) { int h; if (sp_hyp_step(&T, &b, (real)0.5, (real)br, &h)) { gone = 1; break; }
        if (h >= 0 && hl < (int)sizeof hits - 40) hl += snprintf(hits + hl, sizeof hits - hl, "%s[%d,%d,%d]", nh++ ? "," : "", t, s, h); }
      if (gone) { printf("%snull", np++ ? "," : ""); break; }
      if (t % 30 == 29) printf("%s[%.12g,%.12g,%.12g,%.12g]", np++ ? "," : "", (double)b.x, (double)b.y, (double)b.vx, (double)b.vy);
    }
    printf("],\"hits\":[%s]}\n", hits);
  }
  return 0;
}

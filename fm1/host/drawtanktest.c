/* Host test of the normal-space tank renderer (core/drawtank.c), on the device's light goo.
 * Plays a scene until the goo is about half full, then draws it from three camera turns, band by band, and checks:
 *   seams   a frame drawn in 16-row bands is the same, pixel for pixel, as one drawn in a single 240-row band
 *   rim     each wall's front edge shows its note's colour (the rim is drawn last, so nothing covers it)
 *   balls   each ball shows its colour at its projected centre, and a near ball is drawn bigger than a far one
 *   goo     the goo shows (mint pixels) once the tank is half full
 *   time    ms a frame on this pc
 * Writes tankN.ppm (node fm1/host/check-drawtank.js makes PNGs). Prints PASS/FAIL; exit 1 on a fail.
 *   drawtanktest OUTDIR */
#include <stdio.h>
#include <string.h>
#include <time.h>
#include <math.h>
#include "../core/drawtank.h"
#include "../core/paint.h"

static sh_tank T; static st_view V; static uint16_t BAND[SH_SCREEN * SH_BAND], FRAME[SH_SCREEN * SH_SCREEN], WHOLE[SH_SCREEN * SH_SCREEN];
static int fails = 0;
static void ok(int c, const char *m) { printf("  %s  %s\n", c ? "PASS" : "FAIL", m); if (!c) fails++; }

static void rgb(uint16_t p, float *r, float *g, float *b) { *r = (p >> 11) / 31.0f; *g = ((p >> 5) & 63) / 63.0f; *b = (p & 31) / 31.0f; }
static float hue_of(uint16_t p) {
  float r, g, b; rgb(p, &r, &g, &b); float mx = r > g ? (r > b ? r : b) : (g > b ? g : b), mn = r < g ? (r < b ? r : b) : (g < b ? g : b), d = mx - mn;
  if (d < 1e-4f) return -1;
  float h = mx == r ? (g - b) / d : mx == g ? 2 + (b - r) / d : 4 + (r - g) / d; h /= 6; return h < 0 ? h + 1 : h;
}
static float hue_gap(float a, float b) { float d = a - b; d -= floorf(d); return d > 0.5f ? 1 - d : d; }

int main(int argc, char **argv) {
  const char *out = argc > 1 ? argv[1] : ".";
  sh_tank_settings s = sh_tank_defaults();
  sh_tank_init(&T, s, 4); sh_tank_start(&T, 0.0);
  double bar = 3000.0, next = bar;
  for (long i = 0; i < 180L * 40; i++) { double now = i * SH_FIXED; sh_tank_tick(&T, now, 80.0, 1); if (now >= next) { sh_tank_on_bar(&T); next += bar; } }
  printf("after 40 bars: %d balls, %d drops, fill %.2f\n", T.nb, T.goo.n, sh_goo_fill(&T.goo));
  const float turns[3][2] = { { 0.5f, 0.3f }, { 1.3f, 0.9f }, { 2.4f, 1.7f } };
  float bh[SH_BALLCAP]; for (int i = 0; i < SH_BALLCAP; i++) bh[i] = 0.05f + 0.11f * (float)i;
  const uint16_t bg = 0xF7BF;
  for (int f = 0; f < 3; f++) {
    float M[9]; st_tumble(turns[f][0], turns[f][1], M);
    clock_t c0 = clock(); int reps = 40;
    for (int k = 0; k < reps; k++) { st_view_prepare(&V, &T, M, 0.0f, bh);
      for (int y = 0; y < SH_SCREEN; y += SH_BAND) { st_draw_band(&V, y, SH_BAND, BAND, bg); memcpy(FRAME + y * SH_SCREEN, BAND, sizeof BAND); } }
    double ms = 1000.0 * (clock() - c0) / CLOCKS_PER_SEC / reps;
    st_draw_band(&V, 0, SH_SCREEN, WHOLE, bg);
    char m[200];
    snprintf(m, sizeof m, "turn %d: drawn in 16-row bands, the frame is the same as drawn whole (%.3f ms a frame on this pc)", f, ms);
    ok(!memcmp(FRAME, WHOLE, sizeof FRAME), m);
    int bad = 0, seen = 0;
    for (int i = 0; i < V.n; i++) { int j = (i + 1) % V.n; if (V.open[i]) continue;
      float mx = (V.fx[i] + V.fx[j]) / 2, my = (V.fy[i] + V.fy[j]) / 2; int px = (int)mx, py = (int)my;
      if (px < 0 || py < 0 || px >= SH_SCREEN || py >= SH_SCREEN) continue;
      if (hypotf(V.fx[j] - V.fx[i], V.fy[j] - V.fy[i]) < 10) continue;   /* seen edge-on: a sliver under its neighbours' lines */
      float want = (float)T.walls[i].deg / (float)(T.s.scale->n * T.s.octs);   /* its note, from the tank: not the view's own colour */
      seen++; if (hue_gap(hue_of(FRAME[py * SH_SCREEN + px]), want) > 0.04f) bad++; }
    snprintf(m, sizeof m, "turn %d: every wall's front edge shows its note's colour (%d of %d off)", f, bad, seen);
    ok(seen >= 3 && bad == 0, m);
    int bbad = 0, bseen = 0; float rmin = 1e9f, rmax = 0, zmin = 1, zmax = 0;
    for (int i = 0; i < V.nb; i++) { int px = (int)V.x[i], py = (int)V.y[i];
      if (px < 0 || py < 0 || px >= SH_SCREEN || py >= SH_SCREEN) continue;
      int nearRim = 0;   /* the rim and the rails are drawn over the balls: skip a ball they cross */
      for (int e = 0; e < V.n; e++) { int j = (e + 1) % V.n; float ax = V.fx[e], ay = V.fy[e], bx = V.fx[j], by = V.fy[j];
        float dx = bx - ax, dy = by - ay, t = ((px + 0.5f - ax) * dx + (py + 0.5f - ay) * dy) / (dx * dx + dy * dy + 1e-6f); t = t < 0 ? 0 : t > 1 ? 1 : t;
        float qx = ax + dx * t - px - 0.5f, qy = ay + dy * t - py - 0.5f; if (qx * qx + qy * qy < 9) nearRim = 1;
        dx = V.bx[e] - ax; dy = V.by[e] - ay; t = ((px + 0.5f - ax) * dx + (py + 0.5f - ay) * dy) / (dx * dx + dy * dy + 1e-6f); t = t < 0 ? 0 : t > 1 ? 1 : t;
        qx = ax + dx * t - px - 0.5f; qy = ay + dy * t - py - 0.5f; if (qx * qx + qy * qy < 9) nearRim = 1; }
      for (int o = 0; o < V.nb; o++) { int k = V.order[o]; if (k == i || V.z[k] >= V.z[i]) continue;   /* a nearer ball over it */
        float dx = V.x[k] - V.x[i], dy = V.y[k] - V.y[i]; if (dx * dx + dy * dy < (V.r[k] + 1) * (V.r[k] + 1)) nearRim = 1; }
      if (V.r[i] < rmin) rmin = V.r[i];
      if (V.r[i] > rmax) rmax = V.r[i];
      if (V.z[i] < zmin) zmin = V.z[i];
      if (V.z[i] > zmax) zmax = V.z[i];
      if (nearRim) continue;
      bseen++; if (hue_gap(hue_of(FRAME[py * SH_SCREEN + px]), hue_of(V.bc[i])) > 0.08f) bbad++; }
    snprintf(m, sizeof m, "turn %d: each ball shows its colour where it is (%d of %d off)", f, bbad, bseen);
    ok(bseen >= 2 && bbad == 0, m);
    snprintf(m, sizeof m, "turn %d: a near ball is drawn bigger than a far one (radius %.2f..%.2f px over depth %.2f..%.2f)", f, rmin, rmax, zmin, zmax);
    ok(zmax - zmin < 0.3f || rmax > rmin * 1.05f, m);
    int goo = 0; for (int p = 0; p < SH_SCREEN * SH_SCREEN; p++) if (hue_gap(hue_of(FRAME[p]), hue_of(V.goo)) < 0.03f) goo++;
    snprintf(m, sizeof m, "turn %d: the goo shows (%d mint pixels at fill %.2f)", f, goo, sh_goo_fill(&T.goo));
    ok(sh_goo_fill(&T.goo) < 0.3 || goo > 300, m);
    char path[512]; snprintf(path, sizeof path, "%s/tank%d.ppm", out, f);
    FILE *fp = fopen(path, "wb"); if (!fp) return 2; fprintf(fp, "P6 %d %d 255\n", SH_SCREEN, SH_SCREEN);
    for (int p = 0; p < SH_SCREEN * SH_SCREEN; p++) { uint16_t q = FRAME[p]; unsigned char c[3] = { (unsigned char)((q >> 11) * 255 / 31), (unsigned char)(((q >> 5) & 63) * 255 / 63), (unsigned char)((q & 31) * 255 / 31) }; fwrite(c, 1, 3, fp); }
    fclose(fp);
  }
  printf("view %zu bytes, band %zu bytes\n", sizeof V, sizeof BAND);
  printf(fails ? "FAILED: %d\n" : "the tank draws right from every turn\n", fails);
  return fails ? 1 : 0;
}

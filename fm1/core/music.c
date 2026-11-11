/* Scales and the home chord. See music.h. Mirrors music/scales.rs and music/chord.rs line for line. */
#include <math.h>
#include <string.h>
#include "music.h"

#define S(id, ...) { id, (const float[]){ __VA_ARGS__ }, (int)(sizeof((const float[]){ __VA_ARGS__ }) / sizeof(float)) }
static const sh_scale SCALES[] = {
  S("chromatic", 0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100),
  S("major", 0, 200, 400, 500, 700, 900, 1100),
  S("minor", 0, 200, 300, 500, 700, 800, 1000),
  S("dorian", 0, 200, 300, 500, 700, 900, 1000),
  S("phrygian", 0, 100, 300, 500, 700, 800, 1000),
  S("lydian", 0, 200, 400, 600, 700, 900, 1100),
  S("mixolydian", 0, 200, 400, 500, 700, 900, 1000),
  S("locrian", 0, 100, 300, 500, 600, 800, 1000),
  S("pentaMaj", 0, 200, 400, 700, 900),
  S("pentaMin", 0, 300, 500, 700, 1000),
  S("blues", 0, 300, 500, 600, 700, 1000),
  S("harmMin", 0, 200, 300, 500, 700, 800, 1100),
  S("melMin", 0, 200, 300, 500, 700, 900, 1100),
  S("wholeTone", 0, 200, 400, 600, 800, 1000),
  S("hirajoshi", 0, 200, 300, 700, 800),
  S("inSen", 0, 100, 500, 700, 1000),
  S("iwato", 0, 100, 500, 600, 1000),
  S("hijaz", 0, 100, 400, 500, 700, 800, 1000),
  S("bhairav", 0, 100, 400, 500, 700, 800, 1100),
  S("maqamRast", 0, 200, 350, 500, 700, 900, 1050),
  S("maqamBayati", 0, 150, 300, 500, 700, 800, 1000),
  S("slendro", 0, 240, 480, 720, 960),
  S("pelog", 0, 120, 270, 540, 670, 785, 1050),
  S("neutral7", 0, 150, 300, 450, 600, 750, 900),
  S("edo19", 0, 189, 379, 505, 695, 884, 1074),
  S("edo19all", 0, 63.16f, 126.32f, 189.47f, 252.63f, 315.79f, 378.95f, 442.11f, 505.26f, 568.42f, 631.58f, 694.74f,
    757.89f, 821.05f, 884.21f, 947.37f, 1010.53f, 1073.68f, 1136.84f),
  S("edo24", 0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000,
    1050, 1100, 1150),
  S("edo31", 0, 38.71f, 77.42f, 116.13f, 154.84f, 193.55f, 232.26f, 270.97f, 309.68f, 348.39f, 387.1f, 425.81f,
    464.52f, 503.23f, 541.94f, 580.65f, 619.35f, 658.06f, 696.77f, 735.48f, 774.19f, 812.9f, 851.61f, 890.32f,
    929.03f, 967.74f, 1006.45f, 1045.16f, 1083.87f, 1122.58f, 1161.29f),
};
#undef S

const sh_scale *sh_scale_by_id(const char *id) {
  for (unsigned i = 0; i < sizeof SCALES / sizeof SCALES[0]; i++) if (!strcmp(SCALES[i].id, id)) return &SCALES[i];
  return 0;
}

static int div_euclid(int a, int b) { int q = a / b; if (a % b < 0) q += b > 0 ? -1 : 1; return q; }
static int rem_euclid(int a, int b) { int r = a % b; return r < 0 ? r + (b < 0 ? -b : b) : r; }
static double frem_euclid(double a, double b) { double r = fmod(a, b); return r < 0.0 ? r + fabs(b) : r; }

float sh_cents_for_degree(const sh_scale *s, int deg) {
  if (s->n == 0) return 0.0f;
  return s->cents[rem_euclid(deg, s->n)] + 1200.0f * (float)div_euclid(deg, s->n);
}

int sh_deg_of(const sh_scale *s, double cents) {
  long long c = (long long)round(cents), m = c % 1200; if (m < 0) m += 1200;
  double rem = (double)m, bd = 1e9; int idx = 0;
  for (int i = 0; i < s->n; i++) {
    double a = fabs((double)s->cents[i] - rem), d = a < 1200.0 - a ? a : 1200.0 - a;
    if (d < bd) { bd = d; idx = i; }
  }
  return idx;
}

static const int RATIOS[33][2] = {
  {1, 1}, {16, 15}, {12, 11}, {11, 10}, {10, 9}, {9, 8}, {8, 7}, {7, 6}, {13, 11}, {6, 5}, {11, 9}, {16, 13}, {5, 4},
  {9, 7}, {13, 10}, {4, 3}, {11, 8}, {7, 5}, {10, 7}, {16, 11}, {3, 2}, {14, 9}, {11, 7}, {8, 5}, {13, 8}, {18, 11},
  {5, 3}, {12, 7}, {7, 4}, {16, 9}, {11, 6}, {15, 8}, {2, 1},
};

double sh_dyad_weight(double cents) {
  double x = frem_euclid(cents, 1200.0), best = 0.0;
  for (int i = 0; i < 33; i++) {
    int n = RATIOS[i][0], d = RATIOS[i][1];
    double c = 1200.0 * log2((double)n / (double)d), w = 1.0 / sqrt((double)(n * d));
    double a = fabs(x - c), b = fabs(x - c + 1200.0), e = fabs(x - c - 1200.0);
    double dd = a < b ? a : b; if (e < dd) dd = e;
    if (dd > 60.0) continue;
    double v = w * exp(-(dd * dd) / 450.0);
    if (v > best) best = v;
  }
  return best;
}

int sh_home_chord(const sh_scale *s, int out[3]) {
  int len = s->n < 32 ? s->n : 32;
  if (len == 0) { out[0] = 0; return 1; }
  int idx[32]; double w[32], x[32];
  for (int i = 0; i < len; i++) { idx[i] = i; w[i] = sh_dyad_weight((double)s->cents[i]); x[i] = frem_euclid((double)s->cents[i], 1200.0); }
  for (int i = 1; i < len; i++) for (int j = i; j > 0 && w[idx[j - 1]] < w[idx[j]]; j--) { int t = idx[j - 1]; idx[j - 1] = idx[j]; idx[j] = t; }
  int picked[3] = { 0 }, n = 1;
  static const double GAPS[2] = { 230.0, 150.0 };
  for (int g = 0; g < 2 && n < 3; g++) {
    for (int k = 0; k < len && n < 3; k++) {
      int r = idx[k], dup = 0, spaced = 1;
      for (int p = 0; p < n; p++) if (picked[p] == r) dup = 1;
      if (dup) continue;
      for (int p = 0; p < n; p++) { double d = fabs(x[r] - x[picked[p]]); if ((d < 1200.0 - d ? d : 1200.0 - d) < GAPS[g]) spaced = 0; }
      if (spaced) picked[n++] = r;
    }
  }
  for (int i = 1; i < n; i++) for (int j = i; j > 0 && picked[j - 1] > picked[j]; j--) { int t = picked[j - 1]; picked[j - 1] = picked[j]; picked[j] = t; }
  for (int i = 0; i < n; i++) out[i] = picked[i];
  return n;
}

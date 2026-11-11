/* The auto-notes melody. See melody.h. Mirrors vst/slimehedron-core/src/tank/melody.rs line for line. */
#include <math.h>
#include <stdlib.h>
#include "melody.h"

static int js_round(double x) { return (int)floor(x + 0.5); }   /* JavaScript's Math.round: halves go up, below zero too */
static int sgn(int x) { return (x > 0) - (x < 0); }

void sh_melody_init(sh_melody *m) {
  m->has_deg = 0; m->deg = 0; m->last_leap = 0; m->step16 = 0; m->contour = 1; m->motif_n = 0;
  m->has_prev = 0; m->prev = 0; m->run = 0; m->hist_n = 0;
}

/* clamp AND write back, and turn the line around at the floor or the ceiling */
static int set_deg(sh_melody *m, int d, int lo, int hi) {
  if (d < lo) { d = lo + 1; m->contour = 1; } else if (d > hi) { d = hi - 1; m->contour = -1; }
  m->has_deg = 1; m->deg = d; return d;
}

/* the drone and trill guards */
static int no_drone(sh_melody *m, int d, int lo, int hi, int mid) {
  if (m->has_prev && d == m->prev) { m->run++; if (m->run >= 2) { d = set_deg(m, d + (d > mid ? -1 : 1), lo, hi); m->run = 0; } }
  else m->run = 0;
  int n = m->hist_n; const int *h = m->hist;
  if (n >= 3 && d == h[n - 2] && h[n - 1] == h[n - 3] && d != h[n - 1]) d = set_deg(m, d + (d > mid ? -2 : 2), lo, hi);   /* a-b-a-b caught at the third a */
  if (m->hist_n == 8) { for (int i = 0; i < 7; i++) m->hist[i] = m->hist[i + 1]; m->hist_n = 7; }
  m->hist[m->hist_n++] = d;
  m->has_prev = 1; m->prev = d;
  return d;
}

int sh_melody_next(sh_melody *m, int strong, int n, int root, sh_rand_fn rnd, void *ctx) {
  if (!m->has_deg) { m->has_deg = 1; m->deg = n + root; }   /* start in the middle octave, on the tonic */
  int center = n + root, lo = center - js_round(n * 0.8), hi = center + js_round(n * 0.9);
  int chord[3] = { root, (root + 2) % n, (root + 4) % n };
  int pos = (int)(m->step16 % 32), phrase = (int)((m->step16 / 32) % 2);   /* 0 = question, 1 = answer */
  m->step16++;
  int peak = hi - 1 < center + js_round(n * 0.6) ? hi - 1 : center + js_round(n * 0.6);
  double t_arc = pos < 20 ? pos / 20.0 : (1.0 - (pos - 20) / 12.0 > 0 ? 1.0 - (pos - 20) / 12.0 : 0.0);
  int aim = js_round(center + (peak - center) * t_arc), d0 = m->deg;
  if (d0 < aim) m->contour = 1; else if (d0 > aim) m->contour = -1;
  /* cadence: the answer walks home to the tonic, the question to the 5th, paced to land on the last step */
  if (pos >= 24) {
    int target = phrase == 1 ? center : center + (chord[2] - root), left = 32 - pos, d = target - d0;
    m->last_leap = 0;
    if (abs(d) >= left) { int st = abs(d) - left + 1; set_deg(m, d0 + sgn(d) * (2 < st ? 2 : st), lo, hi); }
    else if (d != 0) set_deg(m, d0 + sgn(d), lo, hi);
    else if (left > 2) { int s = rnd(ctx) < 0.5 ? -1 : 1; int w = 2 + (rnd(ctx) < 0.5 ? 1 : 0); set_deg(m, d0 + s * w, lo, hi); }
    else { int s = rnd(ctx) < 0.5 ? 1 : -1; set_deg(m, d0 + s, lo, hi); }
    return no_drone(m, m->deg, lo, hi, center);
  }
  /* a recent leap resolves by stepping back the other way */
  if (m->last_leap != 0) { int dir = m->last_leap > 0 ? -1 : 1; m->last_leap = 0; return no_drone(m, set_deg(m, d0 + dir, lo, hi), lo, hi, center); }
  /* the answer phrase sometimes echoes the question's shape */
  if (phrase == 1 && m->motif_n > 0 && rnd(ctx) < 0.5) {
    int mv = m->motif[pos % m->motif_n];
    if (mv != 0) return no_drone(m, set_deg(m, d0 + mv, lo, hi), lo, hi, center);
  }
  int up = m->contour > 0 ? 1 : -1;
  if (strong) {   /* a chord tone, never the one we are on, leaning with the arch, not bouncing straight back */
    int has = 0, best = 0; double bd = 1e9; int base = js_round((double)center / n) * n;
    for (int o = -1; o <= 1; o++) for (int c = 0; c < 3; c++) {
      int cand = base + chord[c] + o * n; if (cand == d0) continue;
      int dist = abs(cand - d0); if (dist > 5) continue;
      double back = (m->hist_n >= 2 && cand == m->hist[m->hist_n - 2]) ? 2.2 : 0.0;
      double score = dist + (sgn(cand - d0) == up ? 0.0 : 1.6) + back;
      if (score < bd) { bd = score; best = cand; has = 1; } }
    set_deg(m, has ? best : d0 + up, lo, hi);
  } else {        /* a passing step mostly, a 3rd skip sometimes, a rare leap that resolves next note */
    double r = rnd(ctx); int step;
    if (r < 0.66) step = up * (rnd(ctx) < 0.72 ? 1 : -1);
    else if (r < 0.9) step = up * (rnd(ctx) < 0.7 ? 2 : -2);
    else { m->last_leap = up * 3; step = up * 3; }
    set_deg(m, d0 + step, lo, hi);
  }
  int d = m->deg;
  if (phrase == 0) {
    if (m->motif_n == 8) { for (int i = 0; i < 7; i++) m->motif[i] = m->motif[i + 1]; m->motif_n = 7; }
    m->motif[m->motif_n++] = d - center;
  }
  return no_drone(m, d, lo, hi, center);
}

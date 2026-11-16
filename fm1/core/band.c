/* Slimehedron for the FM-1: the band (GPL-3.0-or-later). See band.h. Each function names the web function it ports. */
#include <math.h>
#include <string.h>
#include "band.h"
#include "band_tables.h"

/* the web's mulberry32: a small seeded generator, seeded per (bar, kit) so a part is stable while it plays */
typedef struct { uint32_t a; } mb32;
static double mb_next(mb32 *m) {
  uint32_t t;
  m->a += 0x6D2B79F5u; t = m->a;
  t = (t ^ (t >> 15)) * (1u | t);
  t = (t + ((t ^ (t >> 7)) * (61u | t))) ^ t;
  return (double)(t ^ (t >> 14)) / 4294967296.0;
}
static mb32 mb_seed(uint32_t a) { mb32 m; m.a = a; return m; }
static uint32_t kit_hash(int kit) {               /* _kitHash of the kit's name */
  const char *k = SH_KIT_NAME[kit]; uint32_t h = 0;
  for (; *k; k++) h = h * 31u + (uint8_t)*k;
  return h;
}

int sh_band_nkits(void) { return SH_NKITS; }
const char *sh_band_kit_name(int kit) { return SH_KIT_NAME[(kit % SH_NKITS + SH_NKITS) % SH_NKITS]; }
int sh_band_kit_by_name(const char *name) {
  for (int k = 0; k < SH_NKITS; k++) if (!strcmp(SH_KIT_NAME[k], name)) return k;
  return 0;
}

void sh_band_init(sh_band *b, int kit, uint32_t salt) {
  memset(b, 0, sizeof *b);
  b->kit = (kit % SH_NKITS + SH_NKITS) % SH_NKITS; b->salt = salt;
  b->prog = (int)(salt % 4u);                     /* the web: progIdx starts anywhere, not always on the first */
  b->bass_block = -1; b->journey = 0; b->hum = salt ^ 0x51EDu;
}
void sh_band_set_kit(sh_band *b, int kit) { b->kit = (kit % SH_NKITS + SH_NKITS) % SH_NKITS; b->bass_block = -1; }

/* pickOnsets: n distinct 16ths by weight, pushed away from what the bass already plays */
static int pick_onsets(const uint8_t *w, int n, mb32 *r, uint32_t avoid, double dodge, uint8_t *out) {
  int pi[16], k, m = 0, no = 0; double pw[16], keep = 1.0 - 0.9 * dodge;
  for (int i = 0; i < 16; i++) if (w[i] > 0) { pi[m] = i; pw[m] = w[i] * (((avoid >> i) & 1u) ? keep : 1.0); m++; }
  for (k = 0; k < n && m > 0; k++) {
    double tot = 0, x; int i;
    for (i = 0; i < m; i++) tot += pw[i];
    x = mb_next(r) * tot;
    for (i = 0; i < m; i++) { x -= pw[i]; if (x <= 0) break; }
    if (i >= m) i = m - 1;
    out[no++] = (uint8_t)pi[i];
    for (; i < m - 1; i++) { pi[i] = pi[i + 1]; pw[i] = pw[i + 1]; }
    m--;
  }
  for (int a = 1; a < no; a++) for (int c = a; c > 0 && out[c - 1] > out[c]; c--) { uint8_t t = out[c]; out[c] = out[c - 1]; out[c - 1] = t; }
  return no;
}

/* genComp: one bar of chord rhythm, as a bit per 16th */
static uint32_t gen_comp(const sh_feel *f, mb32 *r, uint32_t avoid) {
  uint8_t on[16]; int n;
  uint32_t hits = 0;
  if (mb_next(r) < f->seed_odds) {                /* the genre's own rhythm, played straight */
    int s = (int)(mb_next(r) * f->nseeds);
    for (int i = 0; i < f->seed_n[s]; i++) hits |= 1u << f->seeds[s][i];
    if (__builtin_popcount(hits) > 2 && mb_next(r) < f->dodge) {   /* thin out where the bass is busy (never the 1) */
      uint32_t clash = hits & avoid & ~1u; int nc = __builtin_popcount(clash);
      /* the web writes s.filter(k=>k!==clash[(rng()*clash.length)|0]): the draw is INSIDE the filter, a new one for
       * every hit of the seed (in order), each hit dropped if it equals the clash its own draw picked. Kept as is. */
      if (nc) {
        uint8_t cl[16]; int ncl = 0; uint32_t keep = 0;
        for (int i = 0; i < 16; i++) if ((clash >> i) & 1u) cl[ncl++] = (uint8_t)i;
        for (int i = 0; i < 16; i++) if ((hits >> i) & 1u) { int pick = (int)(mb_next(r) * ncl); if (i != cl[pick]) keep |= 1u << i; }
        hits = keep;
      }
    }
    if (mb_next(r) < 0.35 && pick_onsets(f->w, 1, r, avoid, f->dodge, on) == 1) hits |= 1u << on[0];   /* one ornament */
    return hits;
  }
  n = f->density[0] + (int)(mb_next(r) * (f->density[1] - f->density[0] + 1));
  n = pick_onsets(f->w, n, r, avoid, f->dodge, on);
  for (int i = 0; i < n; i++) hits |= 1u << on[i];
  return hits ? hits : 1u;
}

/* genBass: the bass figure for a 16-bar block, in the web's tokens (R root, T third, F fifth, O octave) */
static void gen_bass(const sh_feel *f, mb32 *r, uint8_t *tok) {
  uint8_t on[16]; int n, no;
  memset(tok, 0, 16); tok[0] = 'R';
  n = f->bdensity[0] + (int)(mb_next(r) * (f->bdensity[1] - f->bdensity[0] + 1)) - 1;
  if (n < 1) n = 1;
  no = pick_onsets(f->bw, n, r, 0, 0.5, on);
  for (int i = 0; i < no; i++) {
    double x;
    if (on[i] == 0) continue;
    x = mb_next(r);
    tok[on[i]] = x < f->boct ? 'O' : x < f->boct + 0.34 ? 'F' : x < f->boct + 0.5 ? 'T' : 'R';
  }
}

static double cents_deg(const sh_scale *sc, int d) { return (double)sh_cents_for_degree(sc, d); }
/* degNear: the scale degree nearest `target` cents over the root */
static int deg_near(const sh_scale *sc, double target) {
  int best = 0; double bd = 1e9;
  for (int i = 0; i < sc->n; i++) { double d = fabs((double)sc->cents[i] - target); if (d < bd) { bd = d; best = i; } }
  return best;
}
/* the web's harmony mode, by the scale's size: 7 notes stack thirds with genre colour; whole tunings (more than 12
 * notes: 19-, 24-, 31-EDO) take root and fifth only (the drone guardrail); the rest stack scale steps (as the web's
 * 'triad' does for pentatonics and the like) */
static int harm_drone(const sh_scale *sc) { return sc->n > 12; }

static void push_c(sh_band_bar *o, int step, double cents, double a, int len) {
  if (o->nc >= SH_BAND_MAXC || step > 15) return;
  int v = (int)(a * 127.0 + 0.5); if (v < 1) v = 1; if (v > 127) v = 127;
  o->comp[o->nc].step = (uint8_t)step; o->comp[o->nc].cents = cents; o->comp[o->nc].vel = (uint8_t)v; o->comp[o->nc].len = (uint8_t)len;
  o->nc++;
}
static void push_d(sh_band_bar *o, int step, int note, double a) {
  if (o->nd >= SH_BAND_MAXD) return;
  int v = (int)(a * 96.0 + 0.5); if (v < 1) v = 1; if (v > 127) v = 127;
  o->drum[o->nd].step = (uint8_t)step; o->drum[o->nd].note = (uint8_t)note; o->drum[o->nd].vel = (uint8_t)v; o->nd++;
}

/* advanceHarmony's auto chords: the genre's own progression, one chord per 2 bars (S.chordBars), never the same chord
 * twice in a row, a new progression every 16 bars; the key journey (slime on) moves the key where a chord ends and
 * lands on the new key's home chord */
static void advance_harmony(sh_band *b, const sh_scale *sc, sh_band_bar *o) {
  const sh_feel *f = &SH_FEEL[b->kit];
  int n = sc->n > 0 ? sc->n : 7;
  o->key_moved = 0;
  if (b->journey > 0 && ++b->since_key >= (uint32_t)b->journey && b->hold <= 0) {
    b->since_key = 0; o->key_moved = 1; b->next = 0; b->key_crash = 1;
  }
  if (b->bar % 16u == 0u && b->bar) b->prog = (b->prog + 1) % 4;
  if (b->hold > 0) { b->hold--; }
  else {
    int idx, cur = b->bar == 0 ? f->progs[b->prog][0] : b->next, nx, guard = 0;
    idx = (int)((b->bar / 2u + 1u) % 4u);
    nx = f->progs[b->prog][idx];
    while (((nx % n) + n) % n == ((cur % n) + n) % n && ++guard < 4) nx = f->progs[b->prog][(idx + guard) % 4];
    b->chord = ((cur % n) + n) % n; b->next = ((nx % n) + n) % n; b->hold = 1;
  }
  if (harm_drone(sc)) { b->chord = 0; b->next = 0; }   /* a whole tuning stays on its home (the drone) */
  b->last_chord_bar = b->hold == 0;
  o->chord = b->chord; o->next = b->next;
}

/* bandBar's chord: degrees -> cents, with the genre's colour, voice-led to the last voicing */
static int chord_cents(sh_band *b, const sh_scale *sc, double *out) {
  const sh_feel *f = &SH_FEEL[b->kit];
  int n = sc->n, rd = b->chord, deg[4], nd = 3;
  mb32 r = mb_seed(b->salt ^ (b->bar * 2246822519u) ^ 0x7777u);
  if (harm_drone(sc)) { deg[0] = rd; deg[1] = rd + deg_near(sc, 700.0); nd = 2; }
  else {
    deg[0] = rd; deg[1] = rd + 2; deg[2] = rd + 4;
    if (n == 7) {                                  /* a 7th, a 9th or a sus4, always from the scale */
      double x = mb_next(&r), a = f->seventh, c2 = a + f->ninth, c3 = c2 + f->sus;
      if (f->v7 && rd == 4) deg[nd++] = rd + 6;
      else if (x < a) deg[nd++] = rd + 6;
      else if (x < c2) { int st = (int)lround(cents_deg(sc, rd + 1) - cents_deg(sc, rd)) / 100; if (st == 2) deg[nd++] = rd + 1; }
      else if (x < c3) deg[1] = rd + 3;
    }
  }
  for (int i = 0; i < nd; i++) {
    double base = cents_deg(sc, deg[i]);         /* (sh_cents_for_degree carries degrees past the octave) */
    if (b->npadv > i) {                           /* the nearest octave to what this voice played last */
      double best = base, bd = 1e9;
      for (int o = -1; o <= 1; o++) { double c2 = base + 1200.0 * o; if (c2 < -1300) continue; double dd = fabs(c2 - b->padv[i]); if (dd < bd) { bd = dd; best = c2; } }
      base = best;
    }
    out[i] = base;
  }
  for (int i = 0; i < nd; i++) b->padv[i] = out[i];
  b->npadv = nd;
  return nd;
}

/* the drummer: the kit's 4-bar pattern, the fill window at a phrase end (genFill), the crash where the key moved */
static void drums(sh_band *b, sh_band_bar *o) {
  const sh_feel *f = &SH_FEEL[b->kit];
  int k = b->kit, pb = (int)(b->bar % 4u), from = 16 - f->fill_len;
  int lo = SH_KIT_LMH[k][0], mid = SH_KIT_LMH[k][1], hi = SH_KIT_LMH[k][2];
  o->fill = ((b->bar + 1u) % f->fill_every) == 0u;
  for (int s = 0; s < 16; s++) {
    int in_fill = o->fill && s >= from;
    for (int v = 0; v < SH_NDV; v++) {
      if (!((SH_KIT_STEPS[k][v] >> (16 * pb + s)) & 1ull)) continue;
      int anchor = v == lo && (s == 0 || s == 8);
      if (in_fill && !anchor) continue;            /* the fill owns this space */
      b->hum = b->hum * 1664525u + 1013904223u;
      double hum = 1.0 + ((double)(b->hum >> 8) / 16777216.0 * 2.0 - 1.0) * 0.08;
      double a = anchor ? (s == 0 ? 1.25 : 1.12) : (s == 0 ? 1.25 : 1.0) * hum;
      if (v == 2 || v == 3 || v == 8) a *= 0.8;     /* hats and ride sit under the backbeat */
      push_d(o, s, SH_DV_NOTE[v], a);
    }
    if (in_fill) {                                 /* genFill */
      mb32 r = mb_seed(b->salt ^ (b->bar * 97u) ^ ((uint32_t)s * 7919u));
      double frac = (double)(s - from) / (double)(f->fill_len > 1 ? f->fill_len - 1 : 1), q;
      if (mb_next(&r) < 0.5 + 0.45 * frac) {
        q = mb_next(&r);
        if (SH_TOM_FILL[k]) push_d(o, s, frac >= 1.0 ? SH_GM_LT : (q < 0.3 ? SH_DV_NOTE[mid] : (frac < 0.5 ? SH_GM_HT : SH_GM_LT)), 0.55 + 0.45 * frac);
        else push_d(o, s, SH_DV_NOTE[q < 0.6 ? mid : (q < 0.85 ? hi : lo)], 0.5 + 0.5 * frac);
      }
    }
  }
  if (b->key_crash) { b->key_crash = 0; if (SH_CRASH_ON_KEY[k]) push_d(o, 0, SH_GM_CRASH, 0.95); }
}

/* the bass player: the block's figure, each note held to the next, a stepwise lead-in into the next chord */
static void bass(sh_band *b, const sh_scale *sc, sh_band_bar *o) {
  const sh_feel *f = &SH_FEEL[b->kit];
  int n = sc->n, block = (int)(b->bar / 16u), drone = harm_drone(sc);
  uint8_t tok[16];
  if (b->bass_block != block) {
    mb32 r = mb_seed(b->salt ^ ((uint32_t)block * 40503u) ^ kit_hash(b->kit));
    gen_bass(f, &r, b->bass_tok); b->bass_block = block;
  }
  memcpy(tok, b->bass_tok, 16);
  if (!strcmp(SH_KIT_NAME[b->kit], "industrial")) {   /* the drone bass: one note a bar, the 5th on bar 4 */
    memset(tok, 0, 16); tok[0] = (b->bar % 4u == 3u) ? 'F' : 'R';
  } else if (b->last_chord_bar && !tok[14]) {
    mb32 r = mb_seed(b->salt ^ (b->bar * 31337u));
    if (mb_next(&r) < f->bapproach) tok[14] = 'A';
  }
  for (int s = 0; s < 16; s++) {
    if (!tok[s]) continue;
    int g = 1; while (s + g < 16 && !tok[s + g]) g++;
    int deg = b->chord, oct = 0, fifth = drone ? deg_near(sc, 700.0) : 4;
    if (tok[s] == 'F') deg = b->chord + fifth;
    else if (tok[s] == 'T') deg = drone ? b->chord : b->chord + 2;
    else if (tok[s] == 'O') oct = 1;
    else if (tok[s] == 'A') deg = drone ? b->chord : b->next + n - 1;
    double c = cents_deg(sc, deg) + 1200.0 * oct;
    if (b->has_last_bass && tok[s] != 'O') {      /* the smallest step from the last note, within a 6th below to a 5th above */
      double best = c, bd = 1e9;
      for (int k2 = -1; k2 <= 1; k2++) { double cc = c + 1200.0 * k2; if (cc < -800 || cc > 700) continue; double dd = fabs(cc - b->last_bass); if (dd < bd) { bd = dd; best = cc; } }
      c = best;
    }
    b->last_bass = c; b->has_last_bass = 1;
    if (o->nb < SH_BAND_MAXB) {
      int v = (s == 0 || s == 8) ? 112 : 96;
      o->bass[o->nb].step = (uint8_t)s; o->bass[o->nb].len = (uint8_t)(strcmp(SH_KIT_NAME[b->kit], "industrial") ? g : 16);
      o->bass[o->nb].cents = c; o->bass[o->nb].vel = (uint8_t)v; o->nb++;
    }
  }
}

/* bandComp: the keyboard player */
static void comp(sh_band *b, const sh_scale *sc, sh_band_bar *o, uint32_t bass_steps) {
  const sh_feel *f = &SH_FEEL[b->kit];
  double tones[4]; int nt = chord_cents(b, sc, tones), len = f->ring ? 4 : 2;
  mb32 r = mb_seed(b->salt ^ (b->bar * 40503u) ^ kit_hash(b->kit));
  if (b->bar % 4u == 3u) {                        /* bar 4: the lead-in lick, the hand-off into the next phrase */
    double s[4]; int pos[6] = {0, 2, 4, 6, 9, 12};
    memcpy(s, tones, sizeof s);
    for (int a = 1; a < nt; a++) for (int c = a; c > 0 && s[c - 1] > s[c]; c--) { double t = s[c]; s[c] = s[c - 1]; s[c - 1] = t; }
    double run[6] = {s[0], s[1 % nt], s[2 % nt], s[nt - 1] + 1200.0, s[2 % nt], s[1 % nt]};
    for (int i = 0; i < 6; i++) push_c(o, pos[i], run[i], 0.55 + mb_next(&r) * 0.25, 2);
    push_c(o, 15, (double)sh_cents_for_degree(sc, b->next), 0.7, 2);
    return;
  }
  mb32 rc = mb_seed(b->salt ^ (b->bar * 2654435761u) ^ kit_hash(b->kit));
  uint32_t hits = gen_comp(f, &rc, bass_steps);
  int inv = nt ? (int)(b->bar % (uint32_t)nt) : 0;   /* rotate the voicing: a new top note each bar */
  double v[4]; for (int i = 0; i < nt; i++) v[i] = i + inv < nt ? tones[i + inv] : tones[i + inv - nt] + 1200.0;
  double x = mb_next(&r), tot = f->artic[0] + f->artic[1] + f->artic[2], pick = x * (tot > 0 ? tot : 1);
  int mode = pick < f->artic[0] ? 0 : pick < f->artic[0] + f->artic[1] ? 1 : 2;   /* block, arp, broken */
  if (mode == 1) {
    double d = mb_next(&r), seq[8]; int ns = 0;
    if (d < 0.38) for (int i = 0; i < nt; i++) seq[ns++] = v[i];
    else if (d < 0.72) for (int i = nt - 1; i >= 0; i--) seq[ns++] = v[i];
    else { for (int i = 0; i < nt; i++) seq[ns++] = v[i]; for (int i = nt - 2; i >= 1; i--) seq[ns++] = v[i]; }
    uint32_t ks = hits;
    if (f->arp_fill && mb_next(&r) < 0.55) ks = 0x5555u;   /* straight 8ths right across the bar: the disco sound */
    int i = 0; for (int s = 0; s < 16; s++) if ((ks >> s) & 1u) push_c(o, s, seq[i++ % ns], 0.42 + mb_next(&r) * 0.26, 2);
  } else if (mode == 2) {
    int i = 0; for (int s = 0; s < 16; s++) if ((hits >> s) & 1u) {
      if (i++ == 0) push_c(o, s, v[0], 0.62 + mb_next(&r) * 0.18, len);
      else for (int t = 1; t < nt; t++) push_c(o, s, v[t], 0.40 + mb_next(&r) * 0.22, len);
    }
  } else {
    for (int s = 0; s < 16; s++) if ((hits >> s) & 1u) { double a = 0.45 + mb_next(&r) * 0.3; for (int t = 0; t < nt; t++) push_c(o, s, v[t], a, len); }
  }
  if (mb_next(&r) < f->push && b->next != b->chord && !((hits >> 14) & 1u))   /* the push: the next chord early, on the & of 4 */
    push_c(o, 14, (double)sh_cents_for_degree(sc, b->next), 0.5, 2);
}

void sh_band_next_bar(sh_band *b, const sh_scale *sc, sh_band_bar *o) {
  uint32_t bass_steps = 0;
  o->nd = o->nb = o->nc = 0;
  advance_harmony(b, sc, o);
  drums(b, o);
  bass(b, sc, o);
  for (int i = 0; i < 16; i++) if (b->bass_tok[i]) bass_steps |= 1u << i;   /* bandPlan: the comp dodges the bass FIGURE */
  comp(b, sc, o, bass_steps);
  b->bar++;
}

#ifdef SH_BAND_TEST
/* for fm1/host/check-band.js: the generators alone, with the seeds bandPlan gives them */
uint32_t sh_band_test_comp(int kit, uint32_t salt, uint32_t bar, uint32_t avoid) {
  mb32 r = mb_seed(salt ^ (bar * 2654435761u) ^ kit_hash(kit)); return gen_comp(&SH_FEEL[kit], &r, avoid);
}
void sh_band_test_bass(int kit, uint32_t salt, uint32_t block, uint8_t *tok) {
  mb32 r = mb_seed(salt ^ (block * 40503u) ^ kit_hash(kit)); gen_bass(&SH_FEEL[kit], &r, tok);
}
#endif

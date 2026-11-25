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
  b->chord_bars = 2; b->chord_i = 0;                       /* S.chordBars: how long one chord lasts (1, 2 or 4) */
  b->human = 1; b->step_ms = 150.0; b->bpm = 100.0; b->swmod = 0.6; b->last_ghost = -9; b->hr = salt ^ 0xA5A5F00Du;
  b->hand_deg = -1; b->cm_cur = b->cm_next = -1;
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
      /* drop ONE of the hits that land on the bass (never the 1). The site had the draw inside s.filter(...), a new one
       * per hit, so it could drop none or several; fixed in both on 2026-11-16 (a foundational bug: the same line in the
       * site's genComp and here, check-band.js keeps them equal) */
      if (nc) { int pick = (int)(mb_next(r) * nc); for (int i = 0; i < 16; i++) if ((clash >> i) & 1u) { if (!pick--) { hits &= ~(1u << i); break; } } }
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

/* ---- THE HARMONY'S OTHER OWNERS and A PERSON'S DRUM PATTERN (2026-11-18; see band.h) ---- */
const uint8_t SH_PLANE_V[SH_PLANES] = {0, 1, 2, 3, 4, 6, 7, 8};
const char *const SH_PLANE_NAME[SH_PLANES] = {"kick", "snare", "hi hat", "open hat", "rim", "conga", "tom", "ride"};   /* ("hi hat": Flah 2026-11-25) */
/* the site's CQUAL, in its CQUAL_ORDER */
/* (min, not m: the FM-1's font has capitals only, and AM7 would read as A major 7) */
const char *const SH_CQ_NAME[SH_NCQ] = {"", "min", "7", "maj7", "min7", "dim", "aug", "sus2", "sus4", "6", "min6", "min7b5", "dim7", "9", "maj9", "min9", "7sus4", "add9"};
const uint8_t SH_CQ_IV[SH_NCQ][5] = {
  {0, 4, 7, 255, 255}, {0, 3, 7, 255, 255}, {0, 4, 7, 10, 255}, {0, 4, 7, 11, 255}, {0, 3, 7, 10, 255}, {0, 3, 6, 255, 255},
  {0, 4, 8, 255, 255}, {0, 2, 7, 255, 255}, {0, 5, 7, 255, 255}, {0, 4, 7, 9, 255}, {0, 3, 7, 9, 255}, {0, 3, 6, 10, 255},
  {0, 3, 6, 9, 255}, {0, 4, 7, 10, 14}, {0, 4, 7, 11, 14}, {0, 3, 7, 10, 14}, {0, 5, 7, 10, 255}, {0, 4, 7, 14, 255},
};
enum { CQ_MAJ, CQ_MIN, CQ_7, CQ_MAJ7, CQ_M7, CQ_DIM, CQ_AUG, CQ_SUS2, CQ_SUS4, CQ_6, CQ_M6, CQ_M7B5, CQ_DIM7, CQ_9, CQ_MAJ9, CQ_M9, CQ_7SUS4, CQ_ADD9 };
/* the site's FAMOUS (its dice pool: "jazzy + cool-pop only"), word for word */
const sh_famous SH_FAMOUS[SH_NFAMOUS] = {
  {"ii-V-I", 4, {1, 4, 0, 0}, {CQ_M7, CQ_7, CQ_MAJ7, CQ_MAJ7}},
  {"I-vi-ii-V", 4, {0, 5, 1, 4}, {CQ_MAJ7, CQ_M7, CQ_M7, CQ_7}},
  {"iii-vi-ii-V", 4, {2, 5, 1, 4}, {CQ_M7, CQ_M7, CQ_M7, CQ_7}},
  {"autumn leaves", 8, {1, 4, 0, 3, 6, 2, 5, 5}, {CQ_M7, CQ_7, CQ_MAJ7, CQ_MAJ7, CQ_M7B5, CQ_7, CQ_MIN, CQ_MIN}},
  {"minor ii-V-i", 4, {1, 4, 0, 0}, {CQ_M7B5, CQ_7, CQ_MIN, CQ_MIN}},
  {"montgomery-ward", 4, {0, 3, 1, 4}, {CQ_MAJ7, CQ_MAJ7, CQ_M7, CQ_7}},
  {"coltrane-ish", 4, {0, 5, 3, 1}, {CQ_MAJ7, CQ_7, CQ_MAJ7, CQ_7}},
  {"royal road", 4, {3, 4, 2, 5}, {CQ_MAJ7, CQ_7, CQ_M7, CQ_M7}},
  {"50s ballad", 4, {0, 5, 1, 4}, {CQ_MAJ7, CQ_M7, CQ_M7, CQ_7}},
  {"neo-soul I-IV", 4, {0, 3, 0, 3}, {CQ_MAJ9, CQ_MAJ9, CQ_MAJ9, CQ_MAJ9}},
  {"backdoor ii-V", 4, {1, 4, 3, 0}, {CQ_M7, CQ_7, CQ_M7, CQ_MAJ7}},
  {"andalusian", 4, {0, 6, 5, 4}, {CQ_MIN, CQ_MAJ, CQ_MAJ7, CQ_7}},
  {"epic minor", 4, {0, 3, 5, 4}, {CQ_MIN, CQ_M7, CQ_MAJ7, CQ_7}},
  {"lofi loop", 4, {0, 2, 5, 4}, {CQ_MAJ7, CQ_M7, CQ_M7, CQ_7SUS4}},
  {"kiss from a rose", 4, {5, 3, 0, 4}, {CQ_MIN, CQ_MAJ7, CQ_MAJ7, CQ_7}},
  {"turnaround", 4, {0, 5, 1, 4}, {CQ_MAJ7, CQ_7, CQ_M7, CQ_7}},
  {"bossa cool", 4, {0, 1, 4, 0}, {CQ_MAJ7, CQ_M7, CQ_7, CQ_MAJ7}},
  {"dorian vamp", 4, {0, 3, 0, 3}, {CQ_M7, CQ_7, CQ_M7, CQ_7}},
  {"jazz blues", 4, {0, 3, 0, 4}, {CQ_7, CQ_7, CQ_7, CQ_7}},
  {"sus-pop dream", 4, {0, 4, 5, 3}, {CQ_ADD9, CQ_7SUS4, CQ_M7, CQ_MAJ7}},
};
static const uint8_t MAJSTEP[7] = {0, 2, 4, 5, 7, 9, 11};
/* cmRandomProg's transposition: the steps of the major scale on the key; a minor key's tonic and IV lean minor */
void sh_band_cm_famous(sh_band *b, int which, int minor_key, int bars) {
  const sh_famous *f = &SH_FAMOUS[((which % SH_NFAMOUS) + SH_NFAMOUS) % SH_NFAMOUS];
  b->cm_n = f->n; b->cm_i = 0; b->cm_left = 0; b->cm_cur = b->cm_next = -1;
  for (int i = 0; i < f->n; i++) {
    int q = f->qual[i], st = f->step[i];
    if (minor_key) { if (st == 0 && (q == CQ_MAJ || q == CQ_MAJ7)) q = q == CQ_MAJ7 ? CQ_M7 : CQ_MIN; if (st == 3 && q == CQ_MAJ) q = CQ_MIN; }
    b->cm_root[i] = (int8_t)MAJSTEP[st % 7]; b->cm_qual[i] = (uint8_t)q; b->cm_bars[i] = (uint8_t)(bars < 1 ? 1 : bars);
  }
}
/* pcToNearestDeg: the scale degree nearest a pitch class (semitones over the key) */
static int deg_of_semis(const sh_scale *sc, int semis) {
  int want = ((semis % 12) + 12) % 12, best = 0; double bd = 1e9;
  for (int i = 0; i < sc->n; i++) { double c = sc->cents[i] / 100.0, d = fabs(c - want); if (12.0 - d < d) d = 12.0 - d; if (d < bd) { bd = d; best = i; } }
  return best;
}
int sh_band_cq_for(const sh_scale *sc, int semis) {   /* stacked thirds on the scale: which triad sits on this root */
  int d = -1;
  for (int i = 0; i < sc->n; i++) if ((int)lround(sc->cents[i] / 100.0) % 12 == ((semis % 12) + 12) % 12 && fabs(sc->cents[i] - lround(sc->cents[i] / 100.0) * 100.0) < 1.0) d = i;
  if (d < 0 || sc->n != 7) return CQ_MAJ;
  int t = ((int)lround((sh_cents_for_degree(sc, d + 2) - sh_cents_for_degree(sc, d)) / 100.0));
  int f = ((int)lround((sh_cents_for_degree(sc, d + 4) - sh_cents_for_degree(sc, d)) / 100.0));
  return f == 6 ? CQ_DIM : f == 8 ? CQ_AUG : t == 3 ? CQ_MIN : CQ_MAJ;
}
/* manualRoot: fit a major or minor triad to the pitch classes played; the root must be one of them (unless one note was
 * played over and over), the root itself and the latest note each get a vote; then the nearest scale degree */
int sh_band_hand_root(const sh_scale *sc, const uint8_t *pcs, int n) {
  int set[12] = {0}, single = 1, last, best_pc, r, t;
  double bs = -1;
  if (n <= 0) return -1;
  for (int i = 0; i < n; i++) { set[pcs[i] % 12] = 1; if (pcs[i] % 12 != pcs[0] % 12) single = 0; }
  last = pcs[n - 1] % 12; best_pc = last;
  for (r = 0; r < 12; r++) {
    if (!single && !set[r]) continue;
    for (t = 3; t <= 4; t++) {
      double s = set[r] + set[(r + t) % 12] + set[(r + 7) % 12];
      if (set[r]) s += 0.7;
      if (r == last) s += 0.3;
      if (s > bs) { bs = s; best_pc = r; }
    }
  }
  return deg_of_semis(sc, best_pc);
}
/* the progression's chord i as cents over the key: its exact tones (cmChordCents) */
static int cm_tones(const sh_band *b, int i, double *out) {
  int n = 0;
  for (int k = 0; k < 5 && SH_CQ_IV[b->cm_qual[i] % SH_NCQ][k] != 255; k++) out[n++] = (double)(((b->cm_root[i] % 12) + 12) % 12 + SH_CQ_IV[b->cm_qual[i] % SH_NCQ][k]) * 100.0;
  return n;
}
static double cm_root_cents(const sh_band *b, int i) { return (double)(((b->cm_root[i] % 12) + 12) % 12) * 100.0; }

static void push_c(sh_band_bar *o, int step, double cents, double a, int len) {
  if (o->nc >= SH_BAND_MAXC || step > 15) return;
  o->comp[o->nc].nudge = 0.0;
  int v = (int)(a * 127.0 + 0.5); if (v < 1) v = 1; if (v > 127) v = 127;
  o->comp[o->nc].step = (uint8_t)step; o->comp[o->nc].cents = cents; o->comp[o->nc].vel = (uint8_t)v; o->comp[o->nc].len = (uint8_t)len;
  o->nc++;
}
static void push_dk(sh_band_bar *o, int step, int note, double a, int kind, double nudge) {
  if (o->nd >= SH_BAND_MAXD) return;
  if (a > 1.9) a = 1.9;                                      /* dHit's clamp */
  int v = (int)(a * 96.0 + 0.5); if (v < 1) v = 1; if (v > 127) v = 127;
  o->drum[o->nd].step = (uint8_t)step; o->drum[o->nd].note = (uint8_t)note; o->drum[o->nd].vel = (uint8_t)v;
  o->drum[o->nd].kind = (uint8_t)kind; o->drum[o->nd].nudge = nudge; o->nd++;
}
static void push_d(sh_band_bar *o, int step, int note, double a) { push_dk(o, step, note, a, 0, 0.0); }

/* ---- HUMANIZE: the site's (index.html: HUMAN, humanBeat, humanVoice, KITFEEL, accFor, genreShift, the ghost block,
 * the Human groove). Its rule: THE BEAT NEVER MOVES (every quarter note on the grid; nothing drifts more than a
 * quarter of a step or 22 ms). The random draws are the drummer's own, not the site's Math.random. */
static double hr_next(sh_band *b) { mb32 m = mb_seed(b->hr); double x = mb_next(&m); b->hr = m.a; return x; }
static int h_group(int v) { return v == 0 ? 0 : (v == 1 || v == 4) ? 1 : (v == 2 || v == 3 || v == 8) ? 2 : 3; }   /* K, s / r, hats, the rest */
static void human_beat(sh_band *b, int bar_start) {          /* humanBeat: once a beat, every part takes a small step */
  for (int g = 0; g < 4; g++) { double d = b->drift[g] * 0.6 + (hr_next(b) - 0.5) * 0.012; b->drift[g] = d < -0.009 ? -0.009 : d > 0.009 ? 0.009 : d; }
  if (bar_start) { double s = b->swell * 0.5 + (hr_next(b) - 0.5) * 0.1; b->swell = s < -0.08 ? -0.08 : s > 0.08 ? 0.08 : s; }
}
/* humanVoice: a velocity factor, and a time offset (ms) that is 0 on the beat */
static double human_voice(sh_band *b, int v, int s, double *ms) {
  const sh_kitfeel *kf = &SH_KITFEEL[b->kit];
  int g = h_group(v);
  double velVar = g == 2 ? 0.22 : g == 0 ? 0.05 : g == 3 ? 0.18 : 0.12, bias = g == 0 ? 0.004 : g == 1 ? -0.003 : 0.0;
  double wob = g == 2 ? 0.005 : g == 0 ? 0.0012 : g == 3 ? 0.004 : 0.002, dk = kf->dyn / 0.4, tk = kf->time / 0.3;
  double vv = ((hr_next(b) * 2.0 - 1.0) * velVar + b->swell) * dk; vv = vv < -0.45 ? -0.45 : vv > 0.45 ? 0.45 : vv;
  double ts = 100.0 / (b->bpm > 60.0 ? b->bpm : 60.0); if (ts > 1.5) ts = 1.5;
  double t = (bias + (hr_next(b) * 2.0 - 1.0) * wob + b->drift[g]) * tk * ts;
  double cap = 0.25 * b->step_ms / 1000.0; if (cap > 0.022) cap = 0.022;
  *ms = (s % 4 == 0) ? 0.0 : 1000.0 * (t < -cap ? -cap : t > cap ? cap : t);
  return 1.0 + vv;
}
/* accFor: what the style leans on, and a drummer's hand on the hats (the beat 1, the "&" 0.8, the 16ths 0.62) */
static double acc_for(int kit, int v, int s) {
  double m = SH_KITFEEL[kit].acc[v][s] / 100.0;
  if (v == 2 || v == 3 || v == 8) m *= (s % 4 == 0) ? 1.0 : (s % 2 == 0) ? 0.8 : 0.62;
  return m;
}
/* genreShift (ms): jazz's swung 8ths (the "&" two-thirds of the way through the beat), bossa's lilt on the 16ths */
static double genre_shift(const sh_band *b, int s) {
  const sh_kitfeel *kf = &SH_KITFEEL[b->kit];
  if (kf->sw8 > 0 && s % 4 == 2) return kf->sw8 * 0.667 * b->step_ms;
  if (kf->sw16 > 0 && s % 2 == 1) return kf->sw16 * 0.333 * b->step_ms;
  return 0.0;
}
/* the Human groove (the site's default feel): a 2.5% nudge on the off-16ths, breathing with swmod */
static double groove_off(const sh_band *b, int s) { return (s % 2 == 1) ? 0.025 * b->swmod * b->step_ms : 0.0; }

/* advanceHarmony's auto chords: the genre's own progression, one chord per 2 bars (S.chordBars), never the same chord
 * twice in a row, a new progression every 16 bars; the key journey (slime on) moves the key where a chord ends and
 * lands on the new key's home chord */
static void advance_harmony(sh_band *b, const sh_scale *sc, sh_band_bar *o) {
  const sh_feel *f = &SH_FEEL[b->kit];
  int n = sc->n > 0 ? sc->n : 7;
  o->key_moved = 0;
  if (b->cm_n > 0) {                                     /* CHORD_MODE: the progression owns the harmony (no key journey) */
    if (b->cm_n > SH_CM_MAX) b->cm_n = SH_CM_MAX;
    if (b->cm_left <= 0) { int i = b->cm_i % b->cm_n; b->cm_cur = i; b->cm_left = b->cm_bars[i] ? b->cm_bars[i] : 1; b->cm_i = (i + 1) % b->cm_n; }
    b->cm_left--;
    b->cm_next = b->cm_i % b->cm_n;
    b->last_chord_bar = b->cm_left <= 0;
    b->chord = deg_of_semis(sc, b->cm_root[b->cm_cur]); b->next = deg_of_semis(sc, b->cm_root[b->cm_next]);
    o->chord = b->chord; o->next = b->next;
    return;
  }
  b->cm_cur = b->cm_next = -1;
  if (b->hand_deg >= 0) {                                /* manualRoot: a hand playing holds ITS chord, no lag, no journey */
    b->chord = b->next = ((b->hand_deg % n) + n) % n;
    b->last_chord_bar = b->hold == 0;
    o->chord = b->chord; o->next = b->next;
    return;
  }
  if (b->journey > 0 && ++b->since_key >= (uint32_t)b->journey && b->hold <= 0) {
    b->since_key = 0; o->key_moved = 1; b->next = 0; b->key_crash = 1;
  }
  if (b->bar % 16u == 0u && b->bar) b->prog = (b->prog + 1) % 4;
  if (b->hold > 0) { b->hold--; }
  else {
    int idx, cur = b->bar == 0 ? f->progs[b->prog][0] : b->next, nx, guard = 0;
    idx = (b->chord_i + 1) % 4;                           /* (counted in chords, not bars: the site's _chordIdx) */
    b->chord_i++;
    nx = f->progs[b->prog][idx];
    while (((nx % n) + n) % n == ((cur % n) + n) % n && ++guard < 4) nx = f->progs[b->prog][(idx + guard) % 4];
    b->chord = ((cur % n) + n) % n; b->next = ((nx % n) + n) % n; b->hold = (b->chord_bars > 0 ? b->chord_bars : 2) - 1;
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
  if (b->cm_cur >= 0) {                            /* a progression's chord: its exact tones (cmChordCents), voice-led */
    double c[5]; int m = cm_tones(b, b->cm_cur, c);
    for (int i = 0; i < m; i++) {
      double best = c[i], bd = 1e9;
      if (b->npadv > i) for (int o = -1; o <= 1; o++) { double c2 = c[i] + 1200.0 * o; double dd = fabs(c2 - b->padv[i]); if (dd < bd) { bd = dd; best = c2; } }
      out[i] = best;
    }
    for (int i = 0; i < m; i++) b->padv[i] = out[i];
    b->npadv = m;
    return m;
  }
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

/* a person's pattern, played by the same drummer: the style's accents and timing, every bar the same, no fills, no
 * ghost notes (what was entered is what plays); the crash where the key moved stays */
static void drums_pattern(sh_band *b, sh_band_bar *o) {
  int k = b->kit;
  o->fill = 0;
  for (int s = 0; s < 16; s++) {
    if (b->human && s % 4 == 0) human_beat(b, s == 0);
    for (int L = 0; L < SH_PLANES; L++) {
      if (!((b->pat[L] >> s) & 1u)) continue;
      int v = SH_PLANE_V[L];
      b->hum = b->hum * 1664525u + 1013904223u;
      double hum = 1.0 + ((double)(b->hum >> 8) / 16777216.0 * 2.0 - 1.0) * 0.08 * (b->human ? SH_KITFEEL[k].dyn / 0.4 : 1.0);
      double a = (s == 0 ? 1.25 : 1.0) * hum, nudge = 0.0;
      if (b->human) {
        double acc = acc_for(k, v, s);
        a *= acc > 0.0 ? acc : 1.0;
        nudge = groove_off(b, s) + genre_shift(b, s);
        if (s % 4 != 0) { double hm; a *= human_voice(b, v, s, &hm); nudge += hm; }
      } else if (v == 2 || v == 3 || v == 8) a *= 0.8;
      push_dk(o, s, SH_DV_NOTE[v], a, 0, nudge);
    }
  }
  if (b->key_crash) { b->key_crash = 0; if (SH_CRASH_ON_KEY[k]) push_d(o, 0, SH_GM_CRASH, 0.95); }
}

/* the drummer: the kit's 4-bar pattern, the fill window at a phrase end (genFill), the crash where the key moved */
static void drums(sh_band *b, sh_band_bar *o) {
  if (b->pat_on) { drums_pattern(b, o); return; }
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
      double hum = 1.0 + ((double)(b->hum >> 8) / 16777216.0 * 2.0 - 1.0) * 0.08 * (b->human ? SH_KITFEEL[k].dyn / 0.4 : 1.0);
      double a = anchor ? (s == 0 ? 1.25 : 1.12) : (s == 0 ? 1.25 : 1.0) * hum, nudge = 0.0;
      if (b->human) {
        a *= acc_for(k, v, s);
        nudge = groove_off(b, s) + genre_shift(b, s);
        if (!anchor) { double hm; a *= human_voice(b, v, s, &hm); nudge += hm; }   /* anchors stay locked (dHit solid) */
      } else if (v == 2 || v == 3 || v == 8) a *= 0.8;
      push_dk(o, s, SH_DV_NOTE[v], a, 0, nudge);
    }
    if (in_fill) {                                 /* genFill */
      mb32 r = mb_seed(b->salt ^ (b->bar * 97u) ^ ((uint32_t)s * 7919u));
      double frac = (double)(s - from) / (double)(f->fill_len > 1 ? f->fill_len - 1 : 1), q;
      if (mb_next(&r) < 0.5 + 0.45 * frac) {
        q = mb_next(&r);
        int fv = SH_TOM_FILL[k] ? -1 : (q < 0.6 ? mid : (q < 0.85 ? hi : lo));
        int fnote = SH_TOM_FILL[k] ? (frac >= 1.0 ? SH_GM_LT : (q < 0.3 ? SH_DV_NOTE[mid] : (frac < 0.5 ? SH_GM_HT : SH_GM_LT))) : SH_DV_NOTE[fv];
        double fa = SH_TOM_FILL[k] ? 0.55 + 0.45 * frac : 0.5 + 0.5 * frac, fn = 0.0;
        if (b->human) { double hm; fa *= human_voice(b, fv < 0 ? 7 : fv, s, &hm); fn = groove_off(b, s) + genre_shift(b, s) + hm; }
        push_dk(o, s, fnote, fa, 0, fn);
      }
    }
  }
  if (b->key_crash) { b->key_crash = 0; if (SH_CRASH_ON_KEY[k]) push_d(o, 0, SH_GM_CRASH, 0.95); }
  if (!b->human) return;
  /* GHOST NOTES (the site's ghost block): quiet snare taps (14..28%) off the beat and off the backbeat, never twice in a
   * row, never in a fill, jazz only on the "&"; a soft off-beat hat between the loud hits. SIMPLE kits get fewer. And
   * the pickup: the busy kits' two snare taps into the next phrase (bar 4, the last two 16ths). */
  const sh_kitfeel *kf = &SH_KITFEEL[k];
  int simple = kf->simple, hi_is_hat = SH_DV_NOTE[hi] == 42;
  for (int s = 0; s < 16; s++) {
    int in_fill = o->fill && s >= from, on_beat = s % 4 == 0, back = s == 4 || s == 12;
    int where = kf->ghost_and ? (s % 4 == 2) : 1, mid_on = (int)((SH_KIT_STEPS[k][mid] >> (16 * pb + s)) & 1ull);
    if (s % 4 == 0) human_beat(b, s == 0);
    if (!on_beat && !back && where && !in_fill && !mid_on && b->last_ghost != s - 1 &&
        hr_next(b) < kf->ghost * (simple ? 0.28 : 0.55)) {
      double hm, a = (0.14 + hr_next(b) * 0.14) * human_voice(b, mid, s, &hm);
      push_dk(o, s, SH_DV_NOTE[mid], a, 1, groove_off(b, s) + genre_shift(b, s) + hm);
      b->last_ghost = s;
    }
    int hat_on = (int)((SH_KIT_STEPS[k][2] >> (16 * pb + s)) & 1ull);
    if (hi_is_hat && kf->ghost_hat && s % 2 == 1 && !in_fill && !hat_on && hr_next(b) < kf->ghost * (simple ? 0.4 : 0.63)) {
      double hm, a = (0.11 + hr_next(b) * 0.09) * human_voice(b, 2, s, &hm);
      push_dk(o, s, 42, a, 1, groove_off(b, s) + genre_shift(b, s) + hm);
    }
    if (!simple && pb == 3 && s >= 14) {
      double hm, a = (0.45 + (s - 14) * 0.18) * human_voice(b, mid, s, &hm);
      push_dk(o, s, SH_DV_NOTE[mid], a, 2, groove_off(b, s) + genre_shift(b, s) + hm);
    }
  }
  b->last_ghost -= 16;                                     /* (the next bar's 1 is not "right after" this bar's 16th) */
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
    if (b->cm_cur >= 0) {                         /* a progression's chord: its own root, third and fifth; a half step under the next */
      const uint8_t *iv = SH_CQ_IV[b->cm_qual[b->cm_cur] % SH_NCQ];
      double r0 = cm_root_cents(b, b->cm_cur);
      c = tok[s] == 'F' ? r0 + iv[2] * 100.0 : tok[s] == 'T' ? r0 + iv[1] * 100.0 : tok[s] == 'A' ? cm_root_cents(b, b->cm_next) - 100.0 : r0;
      c += 1200.0 * oct;
    }
    if (b->has_last_bass && tok[s] != 'O') {      /* the smallest step from the last note, within a 6th below to a 5th above */
      double best = c, bd = 1e9;
      for (int k2 = -1; k2 <= 1; k2++) { double cc = c + 1200.0 * k2; if (cc < -800 || cc > 700) continue; double dd = fabs(cc - b->last_bass); if (dd < bd) { bd = dd; best = cc; } }
      c = best;
    }
    b->last_bass = c; b->has_last_bass = 1;
    if (o->nb < SH_BAND_MAXB) {
      int v = (s == 0 || s == 8) ? 112 : 96;
      o->bass[o->nb].step = (uint8_t)s; o->bass[o->nb].len = (uint8_t)(strcmp(SH_KIT_NAME[b->kit], "industrial") ? g : 16);
      o->bass[o->nb].cents = c; o->bass[o->nb].vel = (uint8_t)v;
      o->bass[o->nb].nudge = b->human ? ((s == 0 || s == 8) ? 0.0 : 12.0) + genre_shift(b, s) : 0.0;   /* bassNote: +12 ms off the anchors */
      o->nb++;
    }
  }
}

/* bandComp: the keyboard player */
static void comp(sh_band *b, const sh_scale *sc, sh_band_bar *o, uint32_t bass_steps) {
  const sh_feel *f = &SH_FEEL[b->kit];
  double tones[5]; int nt = chord_cents(b, sc, tones), len = f->ring ? 4 : 2;
  double nxc = b->cm_cur >= 0 ? cm_root_cents(b, b->cm_next) : (double)sh_cents_for_degree(sc, b->next);   /* the next chord's root */
  mb32 r = mb_seed(b->salt ^ (b->bar * 40503u) ^ kit_hash(b->kit));
  if (b->bar % 4u == 3u) {                        /* bar 4: the lead-in lick, the hand-off into the next phrase */
    double s[5]; int pos[6] = {0, 2, 4, 6, 9, 12};
    memcpy(s, tones, sizeof s);
    for (int a = 1; a < nt; a++) for (int c = a; c > 0 && s[c - 1] > s[c]; c--) { double t = s[c]; s[c] = s[c - 1]; s[c - 1] = t; }
    double run[6] = {s[0], s[1 % nt], s[2 % nt], s[nt - 1] + 1200.0, s[2 % nt], s[1 % nt]};
    for (int i = 0; i < 6; i++) push_c(o, pos[i], run[i], 0.55 + mb_next(&r) * 0.25, 2);
    push_c(o, 15, nxc, 0.7, 2);
    return;
  }
  mb32 rc = mb_seed(b->salt ^ (b->bar * 2654435761u) ^ kit_hash(b->kit));
  uint32_t hits = gen_comp(f, &rc, bass_steps);
  int inv = nt ? (int)(b->bar % (uint32_t)nt) : 0;   /* rotate the voicing: a new top note each bar */
  double v[5]; for (int i = 0; i < nt; i++) v[i] = i + inv < nt ? tones[i + inv] : tones[i + inv - nt] + 1200.0;
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
    push_c(o, 14, nxc, 0.5, 2);
}

void sh_band_next_bar(sh_band *b, const sh_scale *sc, sh_band_bar *o) {
  uint32_t bass_steps = 0;
  o->nd = o->nb = o->nc = 0;
  advance_harmony(b, sc, o);
  drums(b, o);
  bass(b, sc, o);
  for (int i = 0; i < 16; i++) if (b->bass_tok[i]) bass_steps |= 1u << i;   /* bandPlan: the comp dodges the bass FIGURE */
  comp(b, sc, o, bass_steps);
  if (b->human)                                            /* bandComp: "the chords swing with the drums" */
    for (int i = 0; i < o->nc; i++) { int s = o->comp[i].step; o->comp[i].nudge = (s % 2 == 1 ? 0.025 * b->step_ms : 0.0) + genre_shift(b, s); }
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

/* the rhythm's own first bar as a person's pattern (DRUMS, PRESETS): a place to start from */
void sh_band_pat_from_kit(sh_band *b) {
  for (int L = 0; L < SH_PLANES; L++) b->pat[L] = (uint16_t)(SH_KIT_STEPS[b->kit][SH_PLANE_V[L]] & 0xFFFFu);
}

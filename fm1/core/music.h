/* Slimehedron for the FM-1: scales, the home chord, the random numbers (GPL-3.0-or-later).
 * The same tables and maths as the plugin's core (vst/slimehedron-core/src: music/scales.rs, music/chord.rs, rng.rs),
 * which lifted them from the web app's SCALES, dyadWeight / chordDegrees and its seeded Math.random stand-in.
 * Cents are floats, as in the plugin (eight scales are microtonal: a semitone table cannot hold them). No malloc. */
#ifndef SH_MUSIC_H
#define SH_MUSIC_H
#include <stdint.h>

typedef struct { const char *id; const float *cents; int n; } sh_scale;

/* A scale by its web id ("major", "edo19all", ...), or 0. */
const sh_scale *sh_scale_by_id(const char *id);
/* Cents for a degree across all octaves (degree n is the octave), the web's centsForDegree. */
float sh_cents_for_degree(const sh_scale *s, int deg);
/* The scale degree (0..n-1) nearest a pitch, ignoring the octave (the web's degOf). */
int   sh_deg_of(const sh_scale *s, double cents);
/* How consonant an interval above the tonic is, 0..1. */
double sh_dyad_weight(double cents);
/* The home chord as sorted degree offsets, up to three (the tonic is always in). Returns how many. */
int   sh_home_chord(const sh_scale *s, int out[3]);

/* xorshift64*, the plugin's Rng: a seeded stream so a song plays the same twice and a test can replay it. */
typedef struct { uint64_t s; } sh_rng;
static inline void sh_rng_init(sh_rng *r, uint64_t seed) { r->s = seed ? seed : 0x9E3779B97F4A7C15ull; }
static inline uint64_t sh_rng_u64(sh_rng *r) {
  uint64_t x = r->s; x ^= x >> 12; x ^= x << 25; x ^= x >> 27; r->s = x; return x * 0x2545F4914F6CDD1Dull; }
/* 0 <= r < 1, never 1 (top 24 bits over 2^24, as a float, the same contract as Math.random) */
static inline double sh_rng_f(sh_rng *r) { return (double)((float)(sh_rng_u64(r) >> 40) / 16777216.0f); }

#endif

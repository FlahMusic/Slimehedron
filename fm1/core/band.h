/* Slimehedron for the FM-1: the band (GPL-3.0-or-later). The web's drummer, bass player and keyboard player
 * (index.html: the drum loop in drumSchedule, genFill, genBass, genComp, bandComp, advanceHarmony's auto chords),
 * as a plan made once per bar: which drum hits, bass notes and chord notes fall on which 16th of it.
 * Pure: no sound, no clock. The firmware (fm1/firmware/slime.c) plays the plan on the FM-1's engines.
 * The tables (patterns, feels) are the site's own, generated: band_tables.h (fm1/host/gen-band.js). */
#ifndef SH_BAND_H
#define SH_BAND_H
#include <stdint.h>
#include "music.h"

#define SH_BAND_MAXD 64
#define SH_BAND_MAXB 16
#define SH_BAND_MAXC 48

/* a drum hit: GM note; kind 0 the pattern, a fill or a crash (the site's, note for note: check-band.js), 1 a ghost
 * note, 2 the phrase pickup (humanize); nudge: ms off its 16th (the groove, the style's swing, the drummer's drift) */
typedef struct { uint8_t step, note, vel, kind; double nudge; } sh_dhit;
typedef struct { uint8_t step, len, vel; double cents, nudge; } sh_bnote;  /* a pitched note: cents over its part's root */

typedef struct {
  sh_dhit drum[SH_BAND_MAXD]; int nd;
  sh_bnote bass[SH_BAND_MAXB]; int nb;   /* cents over the bass root (the key's note between E2 and D#3) */
  sh_bnote comp[SH_BAND_MAXC]; int nc;   /* cents over the key's root (the tank's) */
  int chord, next;                       /* this bar's chord and the next one, as scale degrees (0 = home) */
  int fill;                              /* this bar ends a phrase with a fill */
  int key_moved;                         /* the key journey moved the key on this bar (the caller transposes) */
} sh_band_bar;

typedef struct {
  int kit; uint32_t salt;
  uint32_t bar;                          /* bars played */
  int prog, hold, chord, next, last_chord_bar;
  int chord_bars, chord_i;               /* bars a chord lasts (the site's S.chordBars, 2); chords played */
  double padv[4]; int npadv;             /* the keyboard's last voicing (voice leading) */
  double last_bass; int has_last_bass;
  int bass_block; uint8_t bass_tok[16];  /* the bass figure, held for 16 bars: 0 none, 'R' 'T' 'F' 'O' */
  int key_crash;
  int journey;                           /* move the key every this many bars (0 = never: the slime is off) */
  uint32_t since_key;
  uint32_t hum;                          /* the drummer's velocity wobble */
  /* HUMANIZE (the site's humanVoice / humanBeat / ghost notes / genreShift / the Human groove): on by default */
  int human; double step_ms, bpm, swmod; /* set by the caller each bar: a 16th in ms, the tempo, the groove's breath 0..1 */
  double drift[4], swell; int last_ghost; uint32_t hr;
} sh_band;

void sh_band_init(sh_band *b, int kit, uint32_t salt);
void sh_band_set_kit(sh_band *b, int kit);
/* plan the next bar (advances the harmony one bar) */
void sh_band_next_bar(sh_band *b, const sh_scale *sc, sh_band_bar *out);
const char *sh_band_kit_name(int kit);
int sh_band_nkits(void);
int sh_band_kit_by_name(const char *name);

#endif

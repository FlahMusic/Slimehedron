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
#define SH_CM_MAX 8                            /* chords in a progression a person enters */
#define SH_PLANES 8                            /* lanes in a drum pattern a person enters */

/* a drum hit: GM note; kind 0 the pattern, a fill or a crash (the site's, note for note: check-band.js), 1 a ghost
 * note, 2 the phrase pickup (humanize); nudge: ms off its 16th (the groove, the style's swing, the drummer's drift) */
typedef struct { uint8_t step, note, vel, kind; double nudge; } sh_dhit;
typedef struct { uint8_t step, len, vel; double cents, nudge, gate; } sh_bnote;  /* a pitched note: cents over its part's root;
                                                                            * gate: the bass's share of len it rings (the bounce) */

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
  double padv[5]; int npadv;             /* the keyboard's last voicing (voice leading) */
  double last_bass; int has_last_bass;
  int bass_block; uint8_t bass_tok[16];  /* the bass figure, held for 16 bars: 0 none, 'R' 'T' 'F' 'O' */
  int key_crash;
  int journey;                           /* move the key every this many bars (0 = never: the slime is off) */
  uint32_t since_key;
  uint32_t hum;                          /* the drummer's velocity wobble */
  /* HUMANIZE (the site's humanVoice / humanBeat / ghost notes / genreShift / the Human groove): on by default */
  int human; double step_ms, bpm, swmod; /* set by the caller each bar: a 16th in ms, the tempo, the groove's breath 0..1 */
  double drift[4], swell; int last_ghost; uint32_t hr;
  /* THE HARMONY'S OTHER OWNERS (the site's advanceHarmony, in its order): a progression a person entered (CHORD_MODE:
   * it owns the harmony, a hand jams over it), then a hand playing (manualRoot: the chord of the notes played in the
   * last 1.6 s), then the auto chords. Set by the caller before each sh_band_next_bar. */
  int hand_deg;                          /* the hand's chord, a scale degree; -1: no hand */
  int cm_n, cm_i, cm_left;               /* the progression's chords (0: none), the next one, bars left on this one */
  int8_t cm_root[SH_CM_MAX]; uint8_t cm_qual[SH_CM_MAX], cm_bars[SH_CM_MAX];   /* root: semitones over the key; SH_CQ_* */
  int cm_cur, cm_next;                   /* the chord sounding and the one after (indexes; -1 none) */
  /* A DRUM PATTERN a person entered (the site's step grid): a bit per 16th per lane; it replaces the rhythm's own,
   * played by the same drummer (accents and timing), without the fills and ghost notes */
  int pat_on; uint16_t pat[SH_PLANES];
} sh_band;
/* the pattern's lanes, as the drummer's voices (SH_DV_NOTE): kick, snare, hat, open hat, rim, conga, low tom, ride */
extern const uint8_t SH_PLANE_V[SH_PLANES];
extern const char *const SH_PLANE_NAME[SH_PLANES];
/* the chord qualities a progression can use (the site's CQUAL_ORDER), as semitones over the root */
#define SH_NCQ 18
extern const char *const SH_CQ_NAME[SH_NCQ];
extern const uint8_t SH_CQ_IV[SH_NCQ][5];   /* intervals, 0xFF ends */
/* the site's FAMOUS progressions (the dice): [step 0..6 of the major scale, quality] x up to 8 */
#define SH_NFAMOUS 20
typedef struct { const char *name; uint8_t n; uint8_t step[8], qual[8]; } sh_famous;
extern const sh_famous SH_FAMOUS[SH_NFAMOUS];
/* a famous progression into the band (transposed to the key: semitones over the key), each chord `bars` long */
void sh_band_cm_famous(sh_band *b, int which, int minor_key, int bars);
/* the diatonic quality of a chord on root `semis` over the key in this scale (maj / min / dim, or maj off the scale) */
int sh_band_cq_for(const sh_scale *sc, int semis);
/* the hand's chord from recent pitch classes (the site's manualRoot): pcs[] relative to the key (0..11), the last one
 * played last; returns a scale degree, -1 if none */
int sh_band_hand_root(const sh_scale *sc, const uint8_t *pcs, int n);
/* the rhythm's own first bar into the pattern (a place to start from) */
void sh_band_pat_from_kit(sh_band *b);

void sh_band_init(sh_band *b, int kit, uint32_t salt);
void sh_band_set_kit(sh_band *b, int kit);
/* plan the next bar (advances the harmony one bar) */
void sh_band_next_bar(sh_band *b, const sh_scale *sc, sh_band_bar *out);
const char *sh_band_kit_name(int kit);
int sh_band_nkits(void);
int sh_band_kit_by_name(const char *name);

#endif

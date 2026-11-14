/* SPDX-License-Identifier: GPL-3.0-only */
/* Slimehedron for the FM-1: the bridge between the tank (fm1/core, ours) and SLOOP's sound engines (isod89/sloop-fm1,
 * GPL-3.0-only, a Felucca fork). SLOOP is a unity build; this file is included after seq.c and before mix time, and
 * touches no SLOOP source: it only calls trk_note_on / trk_note_off and writes a started voice's `fine`.
 *
 * What it does, once per control block (CTL samples, slime_block): runs the tank's 60 Hz ticks off the SAMPLE count
 * (never a screen frame), and turns each hit into a note on synth track SL_TRK_MEL at the moment the tank says it
 * sounds (sound_ms: the next grid line when quantize held it), in the wall's exact pitch.
 *
 * Microtonal pitch: SLOOP's notes are MIDI numbers. A wall's cents go to the nearest MIDI note, and the rest (up to
 * +-50 cents) into voice_t.fine, the per-voice fine factor SLOOP's unison detune and TUNE already use (voice.c: 1 cent
 * = 2.367 units, "1 ct = 2.367"). Measured by fm1/firmware/host/slimehost.c `pitch`. */
#include "tank.h"

#define SL_TRK_MEL 0u            /* the tank's melody and the pane chimes */
#define SL_NQ 24u                /* notes waiting for their moment, and notes waiting for their note-off */

typedef struct { uint8_t on, trk, note, vel; int16_t fine; uint32_t at; } sl_ev;   /* at: in control blocks */

static sh_tank sl_tank;
static sl_ev sl_on_q[SL_NQ], sl_off_q[SL_NQ];
static uint32_t sl_blocks;       /* control blocks since slime_start */
static uint32_t sl_ticks;        /* tank ticks run */
static double sl_next_bar_ms;
static int sl_root = 60;         /* the key: MIDI note of the scale's degree 0 */
static uint32_t sl_gate_blocks;  /* how long a tank note holds its key down */
static struct { uint32_t hits, notes, late, dropped; int32_t worst_late_blocks; } sl_stat;

/* a factory preset onto a synth track: what ui.c apply_preset_to writes, without the UI's bookkeeping */
static void sl_preset(track_t *t, uint32_t engine, uint32_t pi)
{
    static const uint8_t FX_DEF[4] = {0, 24, 28, 36};
    const engine_t *e = ENGINES[engine % NENGINES];
    const preset_t *pr;
    uint32_t i;
    sound_change(t);
    t->eng_req = (uint8_t)(engine % NENGINES);
    for (i = 0; i < P_E0; i++) t->p[i] = TP[i].def;
    for (i = 0; i < 8u; i++) t->p[P_E0 + i] = e->edit[i].def;
    if (!e->npresets) return;
    pi %= e->npresets;
    pr = &e->presets[pi];
    t->preset = (uint8_t)pi;
    for (i = 0; i < 8u; i++) t->p[P_E0 + i] = (int16_t)pr->e[i];
    t->p[P_ATK] = pr->env[0]; t->p[P_DEC] = pr->env[1]; t->p[P_SUS] = pr->env[2]; t->p[P_REL] = pr->env[3];
    t->p[P_ED_FLT] = pr->fenv;
    t->p[P_ED_FX] = preset_trim(engine % NENGINES, pi);
    t->p[P_VOICE] = pr->mono ? V_LEGATO : V_POLY;
    for (i = 0; i < 4u; i++) t->p[P_DIST + i] = (int16_t)(pr->fx[i] ? pr->fx[i] - 1 : FX_DEF[i]);
    preset_extras(t->p, pr);
}
/* the preset called `name` on `engine`, or -1 */
static int sl_preset_named(uint32_t engine, const char *name)
{
    const engine_t *e = ENGINES[engine % NENGINES];
    uint32_t i, k;
    for (i = 0; i < e->npresets; i++) {
        for (k = 0; name[k] && e->presets[i].name[k] == name[k]; k++) {}
        if (!name[k] && !e->presets[i].name[k]) return (int)i;
    }
    return -1;
}

/* a note in exact cents above the key: the nearest MIDI note, the rest as the voice's fine factor */
static void sl_split(double cents, int *note, int *fine)
{
    double semis = cents / 100.0;
    int n = (int)(semis < 0 ? semis - 0.5 : semis + 0.5);
    double rest = cents - 100.0 * n;                       /* -50..50 cents */
    *note = sl_root + n;
    *fine = (int)(rest * 2.367 + (rest < 0 ? -0.5 : 0.5));
}
/* SLOOP is fading a track to a new engine or preset: a note now would wait in its own list and lose its fine pitch */
static int sl_busy(uint32_t ti)
{
    const track_t *t = &trk[ti % NPART];
    return t->xf_on || t->eng_req != t->engine || t->pold;
}
static void sl_note_on(uint32_t ti, int note, int vel, int fine)
{
    track_t *t = &trk[ti % NPART];
    uint32_t i, before = vage;
    if (note < 0 || note > 127) return;
    trk_note_on(t, (uint32_t)note, (uint32_t)clamp(vel, 1, 127));
    if (fine)
        for (i = 0; i < NVOICE; i++)                       /* the voice(s) that note just started */
            if (t->v[i].active && t->v[i].note == note && t->v[i].age > before)
                t->v[i].fine += fine;
    sl_stat.notes++;
}
static int sl_push(sl_ev *q, sl_ev e)
{
    uint32_t i;
    for (i = 0; i < SL_NQ; i++)
        if (!q[i].on) { q[i] = e; q[i].on = 1; return 1; }
    sl_stat.dropped++;
    return 0;
}
static uint32_t sl_ms_to_block(double ms) { return (uint32_t)(ms * (FS / 1000.0) / CTL + 0.5); }

static void slime_start(sh_tank_settings s, uint64_t seed, int root_midi)
{
    memset(sl_on_q, 0, sizeof sl_on_q);
    memset(sl_off_q, 0, sizeof sl_off_q);
    memset(&sl_stat, 0, sizeof sl_stat);
    sl_root = root_midi;
    sl_blocks = sl_ticks = 0;
    sl_gate_blocks = sl_ms_to_block(110.0);
    sh_tank_init(&sl_tank, s, seed);
    sh_tank_start(&sl_tank, 0.0);
    sl_next_bar_ms = 240000.0 / (double)song.g[G_BPM];
}

/* once per control block, before the block is mixed */
static void slime_block(void)
{
    double now_ms = (double)sl_blocks * CTL * 1000.0 / FS, bpm = (double)song.g[G_BPM];
    uint32_t i;
    while ((double)sl_ticks * SH_FIXED <= now_ms) {
        double tick_ms = (double)sl_ticks * SH_FIXED;
        int k, nh = sh_tank_tick(&sl_tank, tick_ms, bpm, 1);
        for (k = 0; k < nh; k++) {
            const sh_hit *h = &sl_tank.hits[k];
            sl_ev e = {0};
            int note, fine;
            sl_split(h->cents, &note, &fine);
            e.trk = SL_TRK_MEL; e.note = (uint8_t)clamp(note, 0, 127); e.fine = (int16_t)fine;
            e.vel = (uint8_t)clamp(h->pane ? h->vel / 2 : h->vel, 1, 127);
            e.at = sl_ms_to_block(h->sound_ms);
            sl_stat.hits++;
            sl_push(sl_on_q, e);
        }
        if (tick_ms >= sl_next_bar_ms) { sh_tank_on_bar(&sl_tank); sl_next_bar_ms += 240000.0 / bpm; }
        sl_ticks++;
    }
    for (i = 0; i < SL_NQ; i++)                            /* note-offs first: the same key may come straight back */
        if (sl_off_q[i].on && sl_off_q[i].at <= sl_blocks) {
            trk_note_off(&trk[sl_off_q[i].trk % NPART], sl_off_q[i].note);
            sl_off_q[i].on = 0;
        }
    for (i = 0; i < SL_NQ; i++)
        if (sl_on_q[i].on && sl_on_q[i].at <= sl_blocks && !sl_busy(sl_on_q[i].trk)) {
            sl_ev e = sl_on_q[i], off;
            int32_t late = (int32_t)(sl_blocks - e.at);
            if (late > 1) {     /* (one block, 0.73 ms, is the clock's own grain) */
                sl_stat.late++; if (late > sl_stat.worst_late_blocks) sl_stat.worst_late_blocks = late; }
            sl_on_q[i].on = 0;
            sl_note_on(e.trk, e.note, e.vel, e.fine);
            off = e; off.at = sl_blocks + sl_gate_blocks;
            sl_push(sl_off_q, off);
        }
    sl_blocks++;
}

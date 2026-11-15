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

/* 99 KB: on the device it lives in SLOOP's .pool (zeroed at boot), never in the 96 KiB RAM region */
static sh_tank sl_tank __attribute__((section(".pool")));
static sl_ev sl_on_q[SL_NQ], sl_off_q[SL_NQ];
static uint32_t sl_blocks;       /* control blocks since slime_start */
static uint32_t sl_ticks;        /* tank ticks run */
static double sl_next_bar_ms;
static int sl_root = 60;         /* the key: MIDI note of the scale's degree 0 */
static uint32_t sl_gate_blocks;  /* how long a tank note holds its key down */
static struct { uint32_t hits, notes, late, dropped; int32_t worst_late_blocks; } sl_stat;

/* The drums: the web's own pattern for its pop kit (index.html KITS.pop: 64 sixteenth steps, 4 bars), on SLOOP's drum
 * voices through one of its SYNTHESIZED kits. Steps follow the tank's grid (the same swing), so drums and balls agree. */
static const uint16_t SL_POP[4][4] = {     /* per bar: kick, snare, closed hat, open hat; bit s = step s */
    {0x0441, 0x1010, 0x5555, 0x0000}, {0x0441, 0x1010, 0x9555, 0x4000}, {0x0441, 0x1010, 0x5555, 0x0000}, {0x0441, 0x1410, 0x1555, 0x4000},
};
static const uint8_t SL_DRUM_NOTE[4] = {36, 38, 42, 46};   /* General MIDI: kick, snare, closed hat, open hat */
static uint8_t sl_mel_on = 1, sl_drums_on = 1;
static uint32_t sl_step; static double sl_next_step_ms;
static struct { uint32_t drum_hits; } sl_dstat;
static void sl_drum_kit(const char *name)                  /* a synthesized kit by its name */
{
    uint32_t i, k;
    for (i = DRUM_SAMPLED; i < DRUM_USR; i++) {
        for (k = 0; name[k] && DRUM_KIT_NAMES[i][k] == name[k]; k++) {}
        if (!name[k] && !DRUM_KIT_NAMES[i][k]) { TDRUM->p[P_E0] = (int16_t)i; return; }
    }
}

/* The mix, set by measurement (fm1/firmware/check-host.sh): see slime_levels() below. */
static void slime_levels(void);

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
    sl_step = 0; sl_next_step_ms = 0.0;
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
            if (sl_mel_on) sl_push(sl_on_q, e);
        }
        if (tick_ms >= sl_next_bar_ms) { sh_tank_on_bar(&sl_tank); sl_next_bar_ms += 240000.0 / bpm; }
        sl_ticks++;
    }
    while (sl_next_step_ms <= now_ms) {                    /* the drums, a sixteenth at a time */
        uint32_t st = sl_step % 64u, bar = st / 16u, l;
        double len = 15000.0 / bpm, sw = sl_tank.s.swing;
        if (sl_drums_on)
            for (l = 0; l < 4u; l++)
                if ((SL_POP[bar][l] >> (st % 16u)) & 1u) { drum_on(SL_DRUM_NOTE[l], l == 2u ? 80u : 110u); sl_dstat.drum_hits++; }
        if (sw > 0.01) len *= (sl_step % 2u == 0u) ? 1.0 + sw * 0.5 : 1.0 - sw * 0.5;
        sl_next_step_ms += len;
        sl_step++;
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

/* Levels. Targets are the web app's own (_dev/dev-mix.js, _docs/research/2026-11-04-mix-levels.md): the whole mix
 * -21..-15 LUFS (the site sits at -18.8), peaks under -0.9 dBFS, the drums at least 6 LU under the melody.
 * The numbers below were found by measuring the host bench, not by ear. */
#ifndef SL_MEL_LEVEL
#define SL_MEL_LEVEL 104          /* SLOOP's own default: above it the master limiter (peak -5.2 dBFS) gives nothing back */
#define SL_DRUM_LEVEL 28          /* measured: the pop pattern 7.5..8.4 LU under the melody (at 100 it was 0.4 under) */
#endif
static void slime_levels(void)
{
    trk[SL_TRK_MEL].p[P_LEVEL] = SL_MEL_LEVEL;
    song.g[G_DRLVL] = SL_DRUM_LEVEL;
}
#ifdef SL_DEVICE
double floor(double);                       /* the toolchain's libm */
/* ------------------------------------------------------------------ the device ---
 * SLOOP's mixer calls slime_hook before each block it mixes (patch_sloop.py), in the audio interrupt. The main loop
 * (slime_ui.c) never touches the tank: it leaves requests here and the hook carries them out between ticks. */
#define SL_NSOUND 8u
static const struct { uint8_t eng; const char *name; } SL_SOUND[SL_NSOUND] = {   /* the melody's sounds, all synthesized */
    {1, "KALIMBA"}, {1, "MARIMBA"}, {1, "GLOCKEN"}, {1, "MUSIC BOX"}, {2, "SOFT KEYS"}, {1, "HARP"}, {10, "THUMB PNO"}, {1, "FM PLUCK"},
};
static volatile uint32_t sl_key_req;        /* note keys pressed (bit k = key k, F3 up) */
static volatile uint8_t sl_run = 1;         /* PLAY: the tank moves */
static volatile uint8_t sl_reform_req;      /* a new shape now */
static volatile uint8_t sl_sound_req = 0xFF;/* a melody sound (index into SL_SOUND) */
static volatile uint8_t sl_walls = 6, sl_space, sl_sound;
static volatile int8_t sl_spin;
static volatile uint32_t sl_lit_until[27];  /* key LEDs: fm1_ms until which key k glows (a wall near its note rang) */
static uint8_t sl_started, sl_was_run = 1;
static uint32_t sl_bars, sl_seed = 7;
static volatile uint32_t sl_reforms;

static void sl_start_shape(void)
{
    sh_tank_settings s = sh_tank_defaults();
    s.walls = sl_walls; s.space = sl_space ? SH_SPACE_PORTAL : SH_SPACE_NORMAL; s.spin = (double)sl_spin;
    slime_start(s, sl_seed++, sl_root);
    sl_bars = 0;
    sl_reforms++;
}
/* a key: its own note now (a hand is never quantized), in the tank's scale, and a ball into the tank */
static void sl_key(uint32_t k)
{
    const sh_scale *sc = sl_tank.s.scale;
    double want = ((double)(53 + (int)k) - (double)sl_root) * 100.0, oct = floor(want / 1200.0), in = want - oct * 1200.0, best = 0, bd = 1e9;
    int d, note, fine;
    for (d = 0; d <= sc->n; d++) {
        double c = d == sc->n ? 1200.0 : (double)sc->cents[d], a = c > in ? c - in : in - c;
        if (a < bd) { bd = a; best = c; }
    }
    sl_split(oct * 1200.0 + best, &note, &fine);
    {
        sl_ev off = {0};
        sl_note_on(SL_TRK_MEL, note, 100, fine);
        off.trk = SL_TRK_MEL; off.note = (uint8_t)clamp(note, 0, 127); off.at = sl_blocks + sl_gate_blocks;
        sl_push(sl_off_q, off);
    }
    sh_tank_add_ball(&sl_tank);
    sl_lit_until[k] = fm1_ms + 140u;
}
static void slime_hook(uint32_t n)
{
    uint32_t k, keys, notes0;
    if (!sl_started) {
        sl_started = 1;
        sl_sound_req = 0;
        sl_start_shape();
    }
    if (sl_sound_req != 0xFFu && !sl_busy(SL_TRK_MEL)) {
        int pi = sl_preset_named(SL_SOUND[sl_sound_req % SL_NSOUND].eng, SL_SOUND[sl_sound_req % SL_NSOUND].name);
        sl_sound = sl_sound_req % SL_NSOUND;
        sl_preset(&trk[SL_TRK_MEL], SL_SOUND[sl_sound].eng, pi < 0 ? 0 : (uint32_t)pi);
        sl_sound_req = 0xFF;
    }
    if (sl_reform_req) { sl_reform_req = 0; sl_start_shape(); }
    sl_tank.s.spin = (double)sl_spin;
    keys = sl_key_req;
    if (keys) {
        fm1_irq_off(); sl_key_req &= ~keys; fm1_irq_on();
        for (k = 0; k < 27u; k++)
            if ((keys >> k) & 1u) sl_key(k);
    }
    if (!sl_run) {                                         /* stopped: what rings is let go, the tank stands still */
        if (sl_was_run)
            for (k = 0; k < SL_NQ; k++) {
                if (sl_off_q[k].on) trk_note_off(&trk[sl_off_q[k].trk % NPART], sl_off_q[k].note);
                sl_off_q[k].on = sl_on_q[k].on = 0;
            }
        sl_was_run = 0;
        return;
    }
    sl_was_run = 1;
    notes0 = sl_stat.notes;
    for (k = 0; k < n; k += CTL) {
        double bar0 = sl_next_bar_ms;
        slime_block();
        if (sl_next_bar_ms != bar0) sl_bars++;
    }
    if (sl_stat.notes != notes0) {                         /* light the key nearest the last note that rang */
        for (k = 0; k < NVOICE; k++) {
            const voice_t *v = &trk[SL_TRK_MEL].v[k];
            if (v->active && v->gate && v->note >= 53u && v->note < 80u) sl_lit_until[v->note - 53u] = fm1_ms + 140u;
        }
    }
    /* the slime's own cycle (the web: the tank fills, bursts and reforms as a new shape, about every 64 bars) */
    if (sl_bars >= 64u || sh_goo_fill(&sl_tank.goo) > 0.97) {
        static const uint8_t SHAPES[8] = {6, 5, 8, 3, 7, 4, 12, 6};
        sl_walls = SHAPES[sl_seed % 8u];
        sl_space = (uint8_t)(sl_seed % 3u == 2u);          /* 1 reform in 3 is portal space, as the web's auto */
        sl_start_shape();
    }
}
#endif

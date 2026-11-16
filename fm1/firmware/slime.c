/* SPDX-License-Identifier: GPL-3.0-only */
/* Slimehedron for the FM-1: the bridge between Slimehedron (fm1/core: the tank, the band) and SLOOP's sound engines
 * (isod89/sloop-fm1, GPL-3.0-only, a Felucca fork). SLOOP is a unity build; this file is included before audio.c and
 * touches no SLOOP source: it calls trk_note_on / trk_note_off / drum_on and writes a started voice's `fine`.
 *
 * Once per control block (CTL samples, slime_block), off the SAMPLE count (never a screen frame):
 *  - the tank's 60 Hz ticks; each hit becomes a note on track 1 when the tank says it sounds (the next grid line if
 *    quantize held it), in the wall's exact pitch;
 *  - the band (fm1/core/band.c, the site's drummer, bass player and keyboard player, note for note): a plan per bar,
 *    played a sixteenth at a time: drums on SLOOP's drum voices, bass on track 2, chords on track 3.
 * The band keeps its own clock across shape reforms; a reform waits for the next downbeat and restarts the tank's
 * grid on it, so the balls' beat lock and the band stay on one grid.
 *
 * Microtonal pitch: SLOOP's notes are MIDI numbers. A note's cents go to the nearest MIDI note, and the rest (up to
 * +-50 cents) into voice_t.fine, the per-voice fine factor SLOOP's unison detune and TUNE already use (voice.c: 1 cent
 * = 2.367 units). Measured by host/slimehost.c `pitch`. */
#include "tank.h"
#include "band.h"

#define SL_TRK_MEL 0u            /* the tank's melody and the pane chimes */
#define SL_TRK_BASS 1u
#define SL_TRK_COMP 2u
#define SL_TRK_DRUM 0xFFu        /* a queued drum hit (drum_on), not a synth track */
#define SL_NQ 64u                /* notes waiting for their moment, and notes waiting for their note-off */
/* THE CONDUCTOR (2026-11-16). The tank and the band are simulated AHEAD of the audio clock, in the main loop, and queue
 * every note with its exact block; the audio interrupt only fires what is due. With the tank ticking inside the audio
 * interrupt, fm1-emu STRICT measured a 17.8 ms worst half against a 5.8 ms deadline and 2,975 missed deadlines over
 * 160 s, once the goo filled. The site does the same (drumSchedule's look-ahead). 45 ms covers the longest gap between
 * two calls of the scheduler (it runs between every band of the screen and while the main loop waits). */
#define SL_AHEAD_BLOCKS 62u      /* 45 ms */

typedef struct { uint8_t on, trk, note, vel; int16_t fine; uint32_t at, hold; } sl_ev;   /* at, hold: blocks */

/* 99 KB: on the device it lives in SLOOP's .pool (zeroed at boot), never in the 96 KiB RAM region */
static sh_tank sl_tank __attribute__((section(".pool")));
static sh_band sl_band;
static sh_band_bar sl_bar;
static sl_ev sl_on_q[SL_NQ], sl_off_q[SL_NQ];
static volatile uint32_t sl_clock;   /* audio control blocks since boot: never reset (the interrupt counts it) */
static uint32_t sl_sim;          /* the block the conductor has simulated up to (runs ahead of sl_clock) */
static uint32_t sl_tick_us_max, sl_tick_goo_at_max, sl_tick_us_sum, sl_tick_n;
#ifdef SL_DEVICE
#define SL_LOCK() fm1_irq_off()  /* the main loop fills the queue the audio interrupt empties */
#define SL_UNLOCK() fm1_irq_on()
#else
#define SL_LOCK() ((void)0)
#define SL_UNLOCK() ((void)0)
#endif
static uint32_t sl_blocks;       /* control blocks since the tank (re)started: its own clock */
static uint32_t sl_ticks;        /* tank ticks run */
static double sl_next_bar_ms;
static int sl_root = 60;         /* the key: MIDI note of the scale's degree 0 (the web keeps it in 52..64) */
static uint32_t sl_gate_blocks;  /* how long a tank note holds its key down */
static struct { uint32_t hits, notes, mel_notes, drums_played, late, dropped, drum_hits, bass_notes, comp_notes, fills, bars; int32_t worst_late_blocks; } sl_stat;
static uint8_t sl_mel_on = 1, sl_drums_on = 1, sl_band_on = 1;
static uint32_t sl_step;         /* band sixteenths since the band started */
static double sl_step_left;      /* ms to the band's next sixteenth */
static uint8_t sl_reform_at_bar; /* a reform waiting for the next downbeat */
static void (*sl_reform_fn)(void);

/* a synthesized drum kit by its name (DRUM_KIT_NAMES: SLOOP's generated kits sit between the sampled and the user ones) */
static void sl_drum_kit(const char *name)
{
    uint32_t i, k;
    for (i = DRUM_SAMPLED; i < DRUM_USR; i++) {
        for (k = 0; name[k] && DRUM_KIT_NAMES[i][k] == name[k]; k++) {}
        if (!name[k] && !DRUM_KIT_NAMES[i][k]) { TDRUM->p[P_E0] = (int16_t)i; return; }
    }
}
/* each of the site's rhythms on the FM-1 kit closest to its character (the site's KITTONE style: 909 / acoustic /
 * brush / 808 / chip / stick), in band_tables.h order: pop rock disco bossa jazz samba conga march chip beep industrial */
static const char *const SL_KIT_SOUND[11] = {"909", "80S", "DISCO", "LATIN", "JAZZ", "LATIN", "AFRO", "VINTAGE", "CHIP", "ARCADE", "INDUSTR"};

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
static void sl_sound_on(uint32_t ti, uint32_t engine, const char *name)
{
    int pi = sl_preset_named(engine, name);
    sl_preset(&trk[ti % NPART], engine, pi < 0 ? 0u : (uint32_t)pi);
}

/* a note in exact cents above `root`: the nearest MIDI note, the rest as the voice's fine factor */
static void sl_split_at(int root, double cents, int *note, int *fine)
{
    double semis = cents / 100.0;
    int n = (int)(semis < 0 ? semis - 0.5 : semis + 0.5);
    double rest = cents - 100.0 * n;                       /* -50..50 cents */
    *note = root + n;
    *fine = (int)(rest * 2.367 + (rest < 0 ? -0.5 : 0.5));
}
static void sl_split(double cents, int *note, int *fine) { sl_split_at(sl_root, cents, note, fine); }
/* the web's bassRootMidi: the key's note between E2 and D#3, whatever the key */
static int sl_bass_root(void) { int r = sl_root - 12; while (r > 51) r -= 12; while (r < 40) r += 12; return r; }

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
    if (ti == SL_TRK_MEL) sl_stat.mel_notes++;
    if (fine)
        for (i = 0; i < NVOICE; i++)                       /* the voice(s) that note just started */
            if (t->v[i].active && t->v[i].note == note && t->v[i].age > before)
                t->v[i].fine += fine;
    sl_stat.notes++;
}
/* the note-off queue: the audio interrupt's alone */
static int sl_push_off(sl_ev e)
{
    uint32_t i;
    for (i = 0; i < SL_NQ; i++)
        if (!sl_off_q[i].on) { sl_off_q[i] = e; sl_off_q[i].on = 1; return 1; }
    sl_stat.dropped++;
    return 0;
}
/* the note queue: the conductor (main loop) fills it, the audio interrupt empties it */
static int sl_queue(sl_ev e)
{
    uint32_t i;
    int done = 0;
    SL_LOCK();
    for (i = 0; i < SL_NQ; i++)
        if (!sl_on_q[i].on) { sl_on_q[i] = e; sl_on_q[i].on = 1; done = 1; break; }
    SL_UNLOCK();
    if (!done) sl_stat.dropped++;
    return done;
}
static uint32_t sl_ms_to_block(double ms) { return ms <= 0 ? 0u : (uint32_t)(ms * (FS / 1000.0) / CTL + 0.5); }
/* a pitched note queued for block `at`, held `hold` blocks */
static void sl_play_at(uint32_t ti, int root, double cents, int vel, uint32_t at, uint32_t hold)
{
    int note, fine;
    sl_ev e = {0};
    sl_split_at(root, cents, &note, &fine);
    if (note < 0 || note > 127) return;
    e.trk = (uint8_t)ti; e.note = (uint8_t)note; e.vel = (uint8_t)clamp(vel, 1, 127); e.fine = (int16_t)fine;
    e.at = at; e.hold = hold ? hold : 1u;
    sl_queue(e);
}
/* a pitched note NOW, from the audio interrupt (a hand on a key: never quantized, never queued) */
static void sl_play_now(uint32_t ti, int root, double cents, int vel, uint32_t hold)
{
    int note, fine;
    sl_ev off = {0};
    if (sl_busy(ti)) return;
    sl_split_at(root, cents, &note, &fine);
    if (note < 0 || note > 127) return;
    sl_note_on(ti, note, vel, fine);
    off.trk = (uint8_t)ti; off.note = (uint8_t)note; off.at = sl_clock + (hold ? hold : 1u);
    sl_push_off(off);
}

/* the tank (re)starts: its grid starts now. The queues are left alone: what rings is let go on time. */
static void slime_start(sh_tank_settings s, uint64_t seed, int root_midi)
{
    sl_root = root_midi;
    sl_blocks = sl_ticks = 0;
    sl_gate_blocks = sl_ms_to_block(110.0);
    sh_tank_init(&sl_tank, s, seed);
    sh_tank_start(&sl_tank, 0.0);
    sl_next_bar_ms = 240000.0 / (double)song.g[G_BPM];
}
/* the band starts (once): its clock, its kit, its sounds */
static void slime_band_start(int kit, uint32_t salt)
{
    sh_band_init(&sl_band, kit, salt);
    sl_drum_kit(SL_KIT_SOUND[sl_band.kit % 11]);
    sl_step = 0; sl_step_left = 0.0;
    slime_levels();
}
static void slime_set_kit(int kit)
{
    sh_band_set_kit(&sl_band, kit);
    sl_drum_kit(SL_KIT_SOUND[sl_band.kit % 11]);
    slime_levels();
}
/* the web's keyJourneyBars: about 90 s, snapped to an 8-bar phrase, 16..64 bars */
static int sl_journey_bars(double bpm)
{
    int want = (int)(90.0 / (240.0 / bpm) / 8.0 + 0.5) * 8;
    return want < 16 ? 16 : want > 64 ? 64 : want;
}

/* one band sixteenth: plan the bar on its 1, then play what falls on this step */
static void sl_band_step(double step_ms)
{
    uint32_t s = sl_step % 16u;
    int i;
    if (s == 0) {
        if (sl_reform_at_bar && sl_reform_fn) { sl_reform_at_bar = 0; sl_reform_fn(); }   /* the tank's grid restarts here */
        sh_band_next_bar(&sl_band, sl_tank.s.scale, &sl_bar);
        sl_stat.bars++;
        if (sl_bar.fill) sl_stat.fills++;
        if (sl_bar.key_moved) {                            /* the key journey: a fifth up or down, kept in 52..64 */
            int nr = sl_root + ((sl_band.bar / 7u) % 2u ? 7 : -7);
            while (nr < 52) nr += 12;
            while (nr > 64) nr -= 12;
            sl_root = nr;
        }
    }
    if (sl_drums_on)
        for (i = 0; i < sl_bar.nd; i++)
            if (sl_bar.drum[i].step == s) {
                sl_ev e = {0};
                e.trk = SL_TRK_DRUM; e.note = sl_bar.drum[i].note; e.vel = sl_bar.drum[i].vel; e.at = sl_sim;
                sl_queue(e);
                sl_stat.drum_hits++;
            }
    if (sl_band_on) {
        for (i = 0; i < sl_bar.nb; i++)
            if (sl_bar.bass[i].step == s) {
                sl_play_at(SL_TRK_BASS, sl_bass_root(), sl_bar.bass[i].cents, sl_bar.bass[i].vel, sl_sim, sl_ms_to_block(step_ms * sl_bar.bass[i].len * 0.95));
                sl_stat.bass_notes++;
            }
        for (i = 0; i < sl_bar.nc; i++)
            if (sl_bar.comp[i].step == s) {
                sl_play_at(SL_TRK_COMP, sl_root, sl_bar.comp[i].cents, sl_bar.comp[i].vel, sl_sim, sl_ms_to_block(step_ms * sl_bar.comp[i].len));
                sl_stat.comp_notes++;
            }
    }
}

/* THE CONDUCTOR: one control block of music at block sl_sim (ahead of the audio clock): the band's sixteenths, the
 * tank's ticks, every note queued for its block. The main loop runs it (slime_schedule); the host bench too. */
static void slime_block(void)
{
    const double block_ms = CTL * 1000.0 / FS;
    double now_ms = (double)sl_blocks * block_ms, bpm = (double)song.g[G_BPM];
    while (sl_step_left <= 0.0) {                          /* the band, a sixteenth at a time (the tank's swing) */
        double len = 15000.0 / bpm, sw = sl_tank.s.swing;
        if (sw > 0.01) len *= (sl_step % 2u == 0u) ? 1.0 + sw * 0.5 : 1.0 - sw * 0.5;
        sl_band_step(len);
        if (sl_blocks == 0) now_ms = 0.0;                  /* (a reform just restarted the tank's clock) */
        sl_step_left += len;
        sl_step++;
    }
    while ((double)sl_ticks * SH_FIXED <= now_ms) {
        double tick_ms = (double)sl_ticks * SH_FIXED;
#ifdef SL_DEVICE
        uint32_t tk0 = fm1_ticks();
#endif
        int k, nh = sh_tank_tick(&sl_tank, tick_ms, bpm, 1);
#ifdef SL_DEVICE
        {   /* the tick's cost on the chip (emu-check.sh reads it): the worst, the goo's size then, the running sum */
            uint32_t us = (fm1_ticks() - tk0) / FM1_TICKS_PER_US;
            sl_tick_us_sum += us; sl_tick_n++;
            if (us > sl_tick_us_max) { sl_tick_us_max = us; sl_tick_goo_at_max = (uint32_t)sl_tank.goo.n; }
        }
#endif
        for (k = 0; k < nh; k++) {
            const sh_hit *h = &sl_tank.hits[k];
            sl_ev e = {0};
            int note, fine;
            sl_split(h->cents, &note, &fine);
            e.trk = SL_TRK_MEL; e.note = (uint8_t)clamp(note, 0, 127); e.fine = (int16_t)fine;
            e.vel = (uint8_t)clamp(h->pane ? h->vel / 2 : h->vel, 1, 127);
            e.at = sl_sim + sl_ms_to_block(h->sound_ms - now_ms); e.hold = sl_gate_blocks;
            sl_stat.hits++;
            if (sl_mel_on) sl_queue(e);
        }
        if (tick_ms >= sl_next_bar_ms) { sh_tank_on_bar(&sl_tank); sl_next_bar_ms += 240000.0 / bpm; }
        sl_ticks++;
    }
    sl_step_left -= block_ms;
    sl_blocks++;
    sl_sim++;
}
/* the conductor catches up to `ahead` blocks past the audio clock (never further back than now: after a stop or a long
 * stall it picks up from now, at the same place in the bar, rather than playing every missed note at once) */
static void slime_schedule(uint32_t ahead)
{
    uint32_t now = sl_clock;
    if ((int32_t)(sl_sim - now) < 0) sl_sim = now;
    while ((int32_t)(sl_sim - (now + ahead)) < 0)
        slime_block();
}
/* THE AUDIO SIDE, once per control block in the audio interrupt: what is due sounds, what has rung is let go */
static void slime_play_block(void)
{
    uint32_t i;
    for (i = 0; i < SL_NQ; i++)                            /* note-offs first: the same key may come straight back */
        if (sl_off_q[i].on && (int32_t)(sl_clock - sl_off_q[i].at) >= 0) {
            trk_note_off(&trk[sl_off_q[i].trk % NPART], sl_off_q[i].note);
            sl_off_q[i].on = 0;
        }
    for (i = 0; i < SL_NQ; i++)
        if (sl_on_q[i].on && (int32_t)(sl_clock - sl_on_q[i].at) >= 0 && (sl_on_q[i].trk == SL_TRK_DRUM || !sl_busy(sl_on_q[i].trk))) {
            sl_ev e = sl_on_q[i], off;
            int32_t late = (int32_t)(sl_clock - e.at);
            if (late > 1) {     /* (one block, 0.73 ms, is the clock's own grain) */
                sl_stat.late++; if (late > sl_stat.worst_late_blocks) sl_stat.worst_late_blocks = late; }
            sl_on_q[i].on = 0;
            if (e.trk == SL_TRK_DRUM) { drum_on(e.note, e.vel); sl_stat.drums_played++; continue; }
            sl_note_on(e.trk, e.note, e.vel, e.fine);
            off = e; off.at = sl_clock + e.hold;
            sl_push_off(off);
        }
    sl_clock++;
}

/* Levels. Targets are the web app's own (_dev/dev-mix.js, _docs/research/2026-11-04-mix-levels.md): the whole mix
 * -21..-15 LUFS (the site sits at -18.8), peaks under -0.9 dBFS; drums at least 6 LU under the melody, the bass 3..10
 * under, the chords at least 3 under, the melody at least 1 LU over the whole band. Found by measuring (check-host.sh). */
#ifndef SL_MEL_LEVEL
#define SL_MEL_LEVEL 104
#define SL_BASS_LEVEL 76          /* measured: 4.2..7.8 LU under the melody (levels.sh) */
#define SL_COMP_LEVEL 70          /* measured: at 80 the chords were only 0.9..2.2 LU under the melody (the rule: >= 3) */
#endif
/* per rhythm, as the site's KIT_DB: the drums' level (G_DRLVL is a linear gain, 28 put pop 8.7 LU under the melody),
 * aimed at ~8.5 LU under (bossa, jazz, the soft kits: ~10), and the bass in fader steps (~0.45 dB each).
 * Order: pop rock disco bossa jazz samba conga march chip beep industrial. Measured 2026-11-16: at 28 for all, jazz's
 * drums sat 16.4 under (barely there), march / chip 11.3, industrial 7.1; jazz's sparse bass 10.6 (the rule: <= 10). */
static const uint8_t SL_KIT_DRLVL[11] = {28, 28, 26, 26, 58, 31, 31, 38, 39, 28, 24};
static const int8_t SL_KIT_BASS[11] = {0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0};
static void slime_levels(void)
{
    int k = sl_band.kit % 11;
    trk[SL_TRK_MEL].p[P_LEVEL] = SL_MEL_LEVEL;
    trk[SL_TRK_BASS].p[P_LEVEL] = (int16_t)(SL_BASS_LEVEL + SL_KIT_BASS[k]);
    trk[SL_TRK_COMP].p[P_LEVEL] = SL_COMP_LEVEL;
    song.g[G_DRLVL] = SL_KIT_DRLVL[k];
}
/* the band's sounds (synthesized): the web's bass is a round body with a 2nd-5th harmonic layer so a small speaker
 * still carries it; its keyboard player plucks short chords */
static void slime_band_sounds(void)
{
    sl_sound_on(SL_TRK_BASS, 0, "MONO BASS");
    sl_sound_on(SL_TRK_COMP, 1, "RHODES");
}

#ifdef SL_DEVICE
double floor(double);                       /* the toolchain's libm */
/* ------------------------------------------------------------------ the device ---
 * SLOOP's mixer calls slime_hook before each block it mixes (patch_sloop.py), in the audio interrupt. The main loop
 * (slime_ui.c) never touches the tank or the band: it leaves requests here and the hook carries them out. */
#define SL_NSOUND 8u
static const struct { uint8_t eng; const char *name; } SL_SOUND[SL_NSOUND] = {   /* the melody's sounds, all synthesized */
    {1, "KALIMBA"}, {1, "MARIMBA"}, {1, "GLOCKEN"}, {1, "MUSIC BOX"}, {2, "SOFT KEYS"}, {1, "HARP"}, {10, "THUMB PNO"}, {1, "FM PLUCK"},
};
#define SL_NSCALE 8u
static const char *const SL_SCALES[SL_NSCALE] = {"major", "minor", "pentaMaj", "pentaMin", "dorian", "mixolydian", "edo19all", "edo31"};
static volatile uint32_t sl_key_req;        /* note keys pressed (bit k = key k, F3 up) */
static volatile uint8_t sl_run = 1;         /* PLAY: the tank moves */
static volatile uint8_t sl_reform_req;      /* a new shape (at the next downbeat) */
static volatile uint8_t sl_sound_req = 0xFF;/* a melody sound (index into SL_SOUND) */
static volatile uint8_t sl_kit_req = 0xFF, sl_scale_req = 0xFF;
static volatile int8_t sl_root_req;         /* the key moved by hand: semitones */
static volatile uint8_t sl_walls = 6, sl_space, sl_sound, sl_kit, sl_scale, sl_slime = 1, sl_auto = 1;
static volatile int8_t sl_spin;
static volatile uint32_t sl_lit_until[27];  /* key LEDs: fm1_ms until which key k glows (a wall near its note rang) */
static volatile uint32_t sl_beat_ms;        /* the band's last downbeat (the screen pulses on it) */
static uint8_t sl_started, sl_was_run = 1;
static uint32_t sl_bars_shape, sl_seed = 7;
static volatile uint32_t sl_reforms;

static uint32_t sl_reform_us_max;
static void sl_start_shape(void)
{
#ifdef SL_DEVICE
    uint32_t t0 = fm1_ticks();
#endif
    sh_tank_settings s = sh_tank_defaults();
    s.walls = sl_walls; s.space = sl_space ? SH_SPACE_PORTAL : SH_SPACE_NORMAL; s.spin = (double)sl_spin;
    s.scale = sh_scale_by_id(SL_SCALES[sl_scale % SL_NSCALE]);
    s.auto_notes = sl_auto;
    slime_start(s, sl_seed++, sl_root);
    sl_bars_shape = 0;
    sl_reforms++;
#ifdef SL_DEVICE
    { uint32_t us = (fm1_ticks() - t0) / FM1_TICKS_PER_US; if (us > sl_reform_us_max) sl_reform_us_max = us; }
#endif
}
/* a key, in the audio interrupt: its own note now (a hand is never quantized), in the tank's scale; the ball it throws
 * is the conductor's to add (the tank belongs to the main loop) */
static volatile uint8_t sl_ball_req;
static void sl_key(uint32_t k)
{
    const sh_scale *sc = sh_scale_by_id(SL_SCALES[sl_scale % SL_NSCALE]);
    double want = ((double)(53 + (int)k) - (double)sl_root) * 100.0, oct = floor(want / 1200.0), in = want - oct * 1200.0, best = 0, bd = 1e9;
    int d;
    for (d = 0; d <= sc->n; d++) {
        double c = d == sc->n ? 1200.0 : (double)sc->cents[d], a = c > in ? c - in : in - c;
        if (a < bd) { bd = a; best = c; }
    }
    sl_play_now(SL_TRK_MEL, sl_root, oct * 1200.0 + best, 100, sl_gate_blocks ? sl_gate_blocks : 151u);
    sl_ball_req++;
    sl_lit_until[k] = fm1_ms + 140u;
}
/* THE AUDIO INTERRUPT'S PART (SLOOP's mixer calls it before each block it mixes): sounds chosen, keys, what is due */
static void slime_hook(uint32_t n)
{
    uint32_t k, keys;
    if (!sl_started) {                                     /* the sounds and the levels (the tank and the band: the conductor) */
        sl_started = 1;
        sl_sound_req = 0;
        slime_levels();
        slime_band_sounds();
    }
    if (sl_sound_req != 0xFFu && !sl_busy(SL_TRK_MEL)) {
        sl_sound = sl_sound_req % SL_NSOUND;
        sl_sound_on(SL_TRK_MEL, SL_SOUND[sl_sound].eng, SL_SOUND[sl_sound].name);
        sl_sound_req = 0xFF;
    }
    keys = sl_key_req;
    if (keys) {
        sl_key_req &= ~keys;                               /* (we are the interrupt: the main loop only ORs bits in, irq off) */
        for (k = 0; k < 27u; k++)
            if ((keys >> k) & 1u) sl_key(k);
    }
    if (!sl_run) {                                         /* stopped: what rings is let go, everything stands still */
        if (sl_was_run)
            for (k = 0; k < SL_NQ; k++) {
                if (sl_off_q[k].on) trk_note_off(&trk[sl_off_q[k].trk % NPART], sl_off_q[k].note);
                sl_off_q[k].on = sl_on_q[k].on = 0;
            }
        sl_was_run = 0;
        sl_clock += n / CTL;
        return;
    }
    sl_was_run = 1;
    for (k = 0; k < n; k += CTL)
        slime_play_block();
    for (k = 0; k < NVOICE; k++) {                         /* light the key of each note the melody rings */
        const voice_t *v = &trk[SL_TRK_MEL].v[k];
        if (v->active && v->gate && v->note >= 53u && v->note < 80u) sl_lit_until[v->note - 53u] = fm1_ms + 140u;
    }
}
/* THE CONDUCTOR (main loop: slime_poll calls it between every band of the screen): the tank and the band, ahead */
static uint8_t sl_conducting;
static void slime_conduct(void)
{
    uint32_t bars0;
    if (!sl_started) return;                               /* (the audio side sets the sounds up first) */
    if (!sl_conducting) {
        sl_conducting = 1;
        sl_reform_fn = sl_start_shape;
        slime_band_start(0, 0x5EED1234u);
        sl_start_shape();
        sl_sim = sl_clock;
    }
    if (sl_kit_req != 0xFFu) { sl_kit = (uint8_t)(sl_kit_req % (uint32_t)sh_band_nkits()); slime_set_kit(sl_kit); sl_kit_req = 0xFF; }
    if (sl_scale_req != 0xFFu) { sl_scale = sl_scale_req % SL_NSCALE; sl_scale_req = 0xFF; sl_reform_at_bar = 1; }
    if (sl_root_req) {
        int nr = sl_root + sl_root_req; sl_root_req = 0;
        sl_root = nr < 48 ? 48 : nr > 71 ? 71 : nr;
    }
    if (sl_reform_req) { sl_reform_req = 0; sl_reform_at_bar = 1; }
    while (sl_ball_req) { sl_ball_req--; sh_tank_add_ball(&sl_tank); }
    sl_band.journey = sl_slime ? sl_journey_bars((double)song.g[G_BPM]) : 0;
    sl_tank.s.spin = (double)sl_spin;
    sl_tank.s.auto_notes = sl_auto;
    if (!sl_run) return;
    bars0 = sl_stat.bars;
    slime_schedule(SL_AHEAD_BLOCKS);
    if (sl_stat.bars != bars0) { sl_bars_shape += sl_stat.bars - bars0; sl_beat_ms = fm1_ms; }
    /* the slime's own cycle (the web: the tank fills, bursts and reforms as a new shape): after 64 bars or a full tank,
     * at the next downbeat. Slime off: the shape stays (a shape picked by hand stays, as on the site). */
    if (sl_slime && !sl_reform_at_bar && (sl_bars_shape >= 64u || sh_goo_fill(&sl_tank.goo) > 0.97)) {
        static const uint8_t SHAPES[8] = {6, 5, 8, 3, 7, 4, 12, 6};
        sl_walls = SHAPES[sl_seed % 8u];
        sl_space = (uint8_t)(sl_seed % 3u == 2u);          /* 1 reform in 3 is portal space, as the web's auto */
        sl_reform_at_bar = 1;
        sl_bars_shape = 0;
    }
}
#endif

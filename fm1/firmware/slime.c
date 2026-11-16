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
double sin(double), floor(double);         /* libm (the toolchain's on the device; floatify makes them sinf, floorf) */

#ifndef SL_LOG
#define SL_LOG(...) ((void)0)    /* the host bench logs the harmony and the melody (auto-check.sh) */
#endif
#define SL_TRK_MEL 0u           /* the tank's melody and the pane chimes */
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
/* everything the conductor queues (the band and the tank, together) sounds this much after its grid time, so a drum the
 * humanize puts early (a snare leaning in, the drummer's drift: at most 22 ms, band.c) still lands where it should.
 * A hand on a key is not delayed: it sounds at once. */
#define SL_LAT_BLOCKS 41u        /* 30 ms */

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
/* a block on the conductor's timeline: now (sl_sim) + the latency + a nudge in ms (the humanize, early or late) */
static uint32_t sl_at(double nudge_ms)
{
    int32_t nb = (int32_t)(nudge_ms * (FS / 1000.0) / CTL + (nudge_ms < 0 ? -0.5 : 0.5));
    if (nb < -(int32_t)SL_LAT_BLOCKS) nb = -(int32_t)SL_LAT_BLOCKS;
    return sl_sim + SL_LAT_BLOCKS + (uint32_t)nb;
}
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
        {   /* the drummer's tempo and the Human groove's breath (the site: 0.5 + 0.5 sin(t * 0.08) with the slime on, else 0.6) */
            double t = (double)sl_clock * CTL / FS;
            sl_band.step_ms = step_ms / (1.0 + ((sl_step % 2u == 0u) ? sl_tank.s.swing * 0.5 : 0.0));   /* (the unswung 16th) */
            sl_band.bpm = (double)song.g[G_BPM];
            sl_band.swmod = sl_band.journey > 0 ? 0.5 + 0.5 * sin(t * 0.08) : 0.6;
        }
        sh_band_next_bar(&sl_band, sl_tank.s.scale, &sl_bar);
        sl_stat.bars++;
        if (sl_bar.fill) sl_stat.fills++;
        if (sl_bar.key_moved) {                            /* the key journey: a fifth up or down, kept in 52..64 */
            int nr = sl_root + ((sl_band.bar / 7u) % 2u ? 7 : -7);
            while (nr < 52) nr += 12;
            while (nr > 64) nr -= 12;
            sl_root = nr;
        }
        SL_LOG("B %u %d %d %d %d\n", sl_band.bar - 1u, sl_bar.chord, sl_root, sl_bar.key_moved, sl_band.kit);   /* (the key this bar plays in) */
    }
    if (sl_drums_on)
        for (i = 0; i < sl_bar.nd; i++)
            if (sl_bar.drum[i].step == s) {
                sl_ev e = {0};
                e.trk = SL_TRK_DRUM; e.note = sl_bar.drum[i].note; e.vel = sl_bar.drum[i].vel; e.at = sl_at(sl_bar.drum[i].nudge);
                sl_queue(e);
                sl_stat.drum_hits++;
            }
    if (sl_band_on) {
        for (i = 0; i < sl_bar.nb; i++)
            if (sl_bar.bass[i].step == s) {
                sl_play_at(SL_TRK_BASS, sl_bass_root(), sl_bar.bass[i].cents, sl_bar.bass[i].vel, sl_at(sl_bar.bass[i].nudge), sl_ms_to_block(step_ms * sl_bar.bass[i].len * 0.95));
                sl_stat.bass_notes++;
            }
        for (i = 0; i < sl_bar.nc; i++)
            if (sl_bar.comp[i].step == s) {
                sl_play_at(SL_TRK_COMP, sl_root, sl_bar.comp[i].cents, sl_bar.comp[i].vel, sl_at(sl_bar.comp[i].nudge), sl_ms_to_block(step_ms * sl_bar.comp[i].len));
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
            e.at = sl_at(h->sound_ms - now_ms > 0 ? h->sound_ms - now_ms : 0.0); e.hold = sl_gate_blocks;
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
            if (e.trk == SL_TRK_DRUM) { drum_on(e.note, e.vel); sl_stat.drums_played++; SL_LOG("D %u %u\n", sl_clock, e.note); continue; }
            sl_note_on(e.trk, e.note, e.vel, e.fine);
            SL_LOG("N %u %u %u %d\n", sl_clock, e.trk, e.note, e.fine);
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
static const uint8_t SL_KIT_DRLVL[11] = {28, 28, 26, 29, 92, 31, 31, 38, 39, 28, 24};   /* (2026-11-16, humanize on: jazz's feel took its drums to 14.7 under, bossa's to 11.1) */
static const int8_t SL_KIT_BASS[11] = {0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0};
static int8_t sl_mix[4];                    /* the MIX page: each part against its measured level, in fader steps (~0.5 dB);
                                             * SL_MIX_OFF and below: that part off */
#define SL_MIX_OFF (-40)
static void slime_levels(void)
{
    int k = sl_band.kit % 11, p;
    static const uint16_t DB_Q12[17] = {4096, 3866, 3649, 3444, 3251, 3069, 2896, 2734, 2580, 2436, 2299, 2170, 2048, 1933, 1825, 1722, 1626};   /* -0.5 dB steps */
    trk[SL_TRK_MEL].p[P_LEVEL] = (int16_t)clamp(SL_MEL_LEVEL + sl_mix[0], 0, 127);
    trk[SL_TRK_BASS].p[P_LEVEL] = (int16_t)clamp(SL_BASS_LEVEL + SL_KIT_BASS[k] + sl_mix[1], 0, 127);
    trk[SL_TRK_COMP].p[P_LEVEL] = (int16_t)clamp(SL_COMP_LEVEL + sl_mix[2], 0, 127);
    {   /* the drums' level is a linear gain: their fader steps as ~0.5 dB, up to +6 dB */
        int32_t g = SL_KIT_DRLVL[k], m = sl_mix[3];
        if (m > 0) g = g * (m >= 12 ? 8192 : 4096 + m * 341) / 4096;
        else if (m < 0) { int32_t q = 4096; while (m < -16) { q = q * 1626 / 4096; m += 16; } g = g * (q * DB_Q12[-m] / 4096) / 4096; }
        song.g[G_DRLVL] = (int16_t)clamp(g, 0, 127);
    }
    for (p = 0; p < 4; p++) {                              /* off: the part's own mute */
        track_t *t = p == 3 ? TDRUM : &trk[p];
        t->p[P_MUTE] = sl_mix[p] <= SL_MIX_OFF;
    }
}
/* the band's sounds (synthesized): the web's bass is a round body with a 2nd-5th harmonic layer so a small speaker
 * still carries it; its keyboard player plucks short chords */
static void sl_part_sound(uint32_t part, uint32_t i);
static void slime_band_sounds(void)
{
    sl_part_sound(SL_TRK_BASS, 0);                         /* MONO BASS */
    sl_part_sound(SL_TRK_COMP, 0);                         /* RHODES */
}

/* ------------------------------------------------------------------ the parts: sounds, mix, fx ---
 * Four parts, as the site's triangle mixer and studio mixer have them: the melody (the tank), the bass, the chords, the
 * drums. Each synth part picks from a short list of SLOOP's synthesized presets, level-matched by MEASUREMENT: every
 * entry's trim (half dB, into P_ED_FX on top of SLOOP's own) brings it to its part's default, measured alone over 24 bars
 * (2026-11-16, levels.sh's meter). Pads (GLASS PAD -40, WARM PAD -42, JAZZ ORGAN -39 LUFS against RHODES -26) never open
 * on the band's short chord stabs and are left out, as the site took its pad bed out. */
enum { SL_P_MEL, SL_P_BASS, SL_P_COMP, SL_P_DRUMS, SL_NPARTS };
static const char *const SL_PART_NAME[SL_NPARTS] = {"melody", "bass", "chords", "drums"};
typedef struct { uint8_t eng; int8_t trim; const char *name; } sl_snd;
#define SL_NMEL 10u
#define SL_NBASS 8u
#define SL_NCOMP 8u
static const sl_snd SL_MEL_SND[SL_NMEL] = {
    {1, 0, "KALIMBA"}, {1, 0, "MARIMBA"}, {1, 0, "GLOCKEN"}, {1, 1, "MUSIC BOX"}, {1, 1, "CELESTA"}, {1, -1, "HARP"},
    {1, 0, "FM PLUCK"}, {10, -2, "THUMB PNO"}, {2, -21, "SOFT KEYS"}, {3, 8, "GAME LEAD"},
};
static const sl_snd SL_BASS_SND[SL_NBASS] = {
    {0, 0, "MONO BASS"}, {0, 1, "SUB BASS"}, {0, 0, "FUNK BASS"}, {0, -2, "SAW BASS"}, {1, -2, "FM BASS"}, {1, 4, "BASS GTR"},
    {2, -8, "CZ BASS"}, {3, 0, "GB BASS"},
};
static const sl_snd SL_COMP_SND[SL_NCOMP] = {
    {1, 0, "RHODES"}, {1, 5, "M1 PIANO"}, {1, 8, "WURLI"}, {1, 7, "DX RHODES"}, {2, -10, "SOFT KEYS"}, {6, 3, "80S POLY"},
    {1, 4, "AFRO KEYS"}, {3, 8, "CHIP CHORD"},
};
static uint8_t sl_snd_of[3];                /* each synth part's sound, an index into its list */
/* the sound sets (SOUND page, PRESETS): three sounds that suit each other */
#define SL_NSET 9u
static const struct { const char *name; uint8_t mel, bass, comp; } SL_SETS[SL_NSET] = {
    {"slime", 0, 0, 0}, {"glass", 2, 1, 1}, {"wood", 1, 2, 6}, {"chip", 9, 7, 7}, {"music box", 3, 1, 2},
    {"fm", 6, 4, 3}, {"harp", 5, 5, 4}, {"retro", 4, 3, 5}, {"thumb", 7, 6, 0},
};
static const sl_snd *sl_snd_entry(uint32_t part, uint32_t i)
{
    return part == SL_P_MEL ? &SL_MEL_SND[i % SL_NMEL] : part == SL_P_BASS ? &SL_BASS_SND[i % SL_NBASS] : &SL_COMP_SND[i % SL_NCOMP];
}
static uint32_t sl_snd_count(uint32_t part) { return part == SL_P_MEL ? SL_NMEL : part == SL_P_BASS ? SL_NBASS : SL_NCOMP; }

/* THE FX, per part (the FX page). The chain SLOOP already gives every part, as the community firmwares put it on a
 * panel (SLOOP / Felucca: FILTER, DIST, CHORUS / DELAY / REVERB sends and an INSERT; CoralFlower: filter, drive, chorus,
 * phaser, delay, reverb): six dials folded into the four knobs and two encoders that say what they do:
 *   FILTER  one knob, low-pass left .. open .. high-pass right (SLOOP's DJ filter, P_TFLT)
 *   DRIVE   the part's distortion (P_DIST); the drums have none, so theirs is PUNCH: the kick pumping the band (DUCK)
 *   ECHO    the send to the tempo delay; SPACE the send to the reverb (their time and size: the MIX page)
 *   CHARACTER + AMOUNT  the INSERT: chorus, phaser, flanger, crush, warm, fuzz, fold; AMOUNT moves its depth, its mix
 *           and its intensity together (a crush loses bits and sample rate at once; a chorus deepens and gets wetter) */
typedef struct { int8_t filt; uint8_t drive, echo, space, ctype, camt; } sl_fx;
#define SL_NCHAR 8u
static const struct { const char *name; uint8_t it; } SL_CHAR[SL_NCHAR] = {   /* SLOOP's IT_ order: OFF SOFT HARD FOLD FUZZ CRUSH PHASER FLANGER CHORUS */
    {"off", 0}, {"chorus", 8}, {"phaser", 6}, {"flanger", 7}, {"crush", 5}, {"warm", 1}, {"fuzz", 4}, {"fold", 3},
};
#define SL_NFXP 14u
static const struct { const char *name; sl_fx fx; } SL_FXP[SL_NFXP] = {   /* filt drive echo space character amount */
    {"sound", {0, 0, 0, 0, 0, 0}},           /* (the sound's own sends, as its preset brought them: filled in at load) */
    {"dry", {0, 0, 0, 0, 0, 0}},
    {"room", {0, 0, 0, 40, 0, 0}},
    {"hall", {0, 0, 10, 85, 0, 0}},
    {"dub echo", {-18, 0, 70, 30, 0, 0}},
    {"slapback", {0, 10, 45, 15, 0, 0}},
    {"wide", {0, 0, 15, 35, 1, 80}},
    {"tape", {-10, 20, 20, 25, 1, 30}},
    {"phase", {0, 0, 0, 30, 2, 70}},
    {"jet", {0, 0, 10, 20, 3, 75}},
    {"lofi", {-24, 0, 10, 20, 4, 70}},
    {"telephone", {20, 30, 0, 10, 5, 40}},   /* (38 / 45 / 60 took the drums 12.7 dB down; 26 / 45 still 6.2) */
    {"underwater", {-46, 0, 30, 60, 2, 50}},
    {"crunch", {6, 70, 0, 15, 6, 55}},
};
static sl_fx sl_fxs[SL_NPARTS];
static uint8_t sl_fxp[SL_NPARTS];           /* each part's last fx preset (0: the sound's own) */

/* the INSERT's three values and its mix from one AMOUNT (0..127), by the kind of character */
static void sl_insert_of(uint32_t ch, uint32_t a, int16_t *p)
{
    uint32_t it = SL_CHAR[ch % SL_NCHAR].it;
    p[P_ITYPE] = (int16_t)(a ? it : 0u);
    if (it == 5u) {                                        /* CRUSH: fewer bits and a lower rate together */
        p[P_IA] = (int16_t)(127 - a * 108 / 127);           /* 16 bits .. 3 */
        p[P_IB] = (int16_t)(127 - a * 80 / 127);            /* 44 k .. ~2 k */
        p[P_IC] = 96; p[P_IMIX] = 127;
    } else if (it >= 6u) {                                 /* PHASER / FLANGER / CHORUS: deeper and wetter together */
        p[P_IA] = (int16_t)(it == 8u ? 30 : 44);            /* a slow sweep */
        p[P_IB] = (int16_t)a;
        p[P_IC] = (int16_t)(it == 7u ? a * 3 / 5 : a / 4);  /* the flanger's jet, a touch of feedback elsewhere */
        p[P_IMIX] = (int16_t)(40 + a * 87 / 127);
    } else if (it) {                                       /* WARM / FUZZ / FOLD: more drive, the level held */
        p[P_IA] = (int16_t)a; p[P_IB] = 96; p[P_IC] = (int16_t)(96 - a / 12); p[P_IMIX] = 127;   /* (a / 5 took the drums 6.6 dB down on fuzz) */
    }
}
/* a part's fx onto SLOOP's parameters */
static void sl_fx_apply(uint32_t part)
{
    const sl_fx *f = &sl_fxs[part % SL_NPARTS];
    track_t *t = part == SL_P_DRUMS ? TDRUM : &trk[part];
    t->p[P_TFLT] = f->filt;
    sl_insert_of(f->ctype, f->ctype ? f->camt : 0u, t->p);
    if (part == SL_P_DRUMS) {
        song.g[G_DUCK] = f->drive;                          /* PUNCH */
        song.g[G_DRDLY] = f->echo;
        song.g[G_DRREV] = f->space;
    } else {
        t->p[P_DIST] = f->drive; t->p[P_DLY] = f->echo; t->p[P_REV] = f->space;
    }
}
/* the part's fx as they stand on the track (the sound's own sends, after a sound loads with fx preset 0) */
static void sl_fx_read(uint32_t part)
{
    sl_fx *f = &sl_fxs[part % SL_NPARTS];
    const track_t *t = part == SL_P_DRUMS ? TDRUM : &trk[part];
    f->filt = (int8_t)t->p[P_TFLT]; f->ctype = 0; f->camt = 0;
    if (part == SL_P_DRUMS) { f->drive = (uint8_t)song.g[G_DUCK]; f->echo = (uint8_t)song.g[G_DRDLY]; f->space = (uint8_t)song.g[G_DRREV]; }
    else { f->drive = (uint8_t)t->p[P_DIST]; f->echo = (uint8_t)t->p[P_DLY]; f->space = (uint8_t)t->p[P_REV]; }
}
static void sl_fx_preset(uint32_t part, uint32_t pi)
{
    pi %= SL_NFXP;
    sl_fxp[part % SL_NPARTS] = (uint8_t)pi;
    if (pi == 0u) {                                        /* the sound's own: reload the sound's sends */
        if (part == SL_P_DRUMS) { song.g[G_DUCK] = GP[G_DUCK].def; song.g[G_DRDLY] = GP[G_DRDLY].def; song.g[G_DRREV] = GP[G_DRREV].def; TDRUM->p[P_TFLT] = 0; TDRUM->p[P_ITYPE] = 0; }
        else { const sl_snd *s = sl_snd_entry(part, sl_snd_of[part]); int pi2 = sl_preset_named(s->eng, s->name); const preset_t *pr = &ENGINES[s->eng]->presets[pi2 < 0 ? 0 : pi2];
               static const uint8_t FX_DEF[4] = {0, 24, 28, 36}; track_t *t = &trk[part];
               for (uint32_t i = 0; i < 4u; i++) t->p[P_DIST + i] = (int16_t)(pr->fx[i] ? pr->fx[i] - 1 : FX_DEF[i]);
               t->p[P_TFLT] = 0; t->p[P_ITYPE] = 0; }
        sl_fx_read(part);
        return;
    }
    sl_fxs[part % SL_NPARTS] = SL_FXP[pi].fx;
    sl_fx_apply(part);
}
/* a synth part's sound: SLOOP's preset, its measured trim, then its fx again (a preset brings its own sends) */
static void sl_part_sound(uint32_t part, uint32_t i)
{
    const sl_snd *s = sl_snd_entry(part, i);
    sl_snd_of[part] = (uint8_t)(i % sl_snd_count(part));
    sl_sound_on(part, s->eng, s->name);
    trk[part].p[P_ED_FX] = (int16_t)(trk[part].p[P_ED_FX] + s->trim);
    if (sl_fxp[part] == 0u) sl_fx_read(part);
    else sl_fx_apply(part);
    slime_levels();                                        /* (SLOOP's preset loader put the level back to its default) */
}

#ifdef SL_DEVICE
/* ------------------------------------------------------------------ the device ---
 * SLOOP's mixer calls slime_hook before each block it mixes (patch_sloop.py), in the audio interrupt. The main loop
 * (slime_ui.c) owns the tank, the band, the fx and the mix (the conductor); sound changes go through the interrupt,
 * where SLOOP's preset fade expects them. */
#define SL_NSCALE 8u
static const char *const SL_SCALES[SL_NSCALE] = {"major", "minor", "pentaMaj", "pentaMin", "dorian", "mixolydian", "edo19all", "edo31"};
static volatile uint32_t sl_key_req;        /* note keys pressed (bit k = key k, F3 up) */
static volatile uint8_t sl_run = 1;         /* PLAY: everything moves */
static volatile uint8_t sl_reform_req;      /* a new shape (at the next downbeat) */
static volatile uint8_t sl_snd_req[3] = {0xFF, 0xFF, 0xFF};   /* a part's new sound (an index into its list) */
static volatile uint8_t sl_kit_req = 0xFF, sl_scale_req = 0xFF;
static volatile int8_t sl_root_req;         /* the key moved by hand: semitones */
static volatile int8_t sl_octave;           /* OCT- / OCT+: the keyboard's octave, -2..2 */
static volatile uint8_t sl_walls = 6, sl_space, sl_kit, sl_scale, sl_slime = 1, sl_auto = 1;
static volatile int8_t sl_spin;
static volatile uint32_t sl_lit_until[27];  /* key LEDs: fm1_ms until which key k glows (the melody rang its note) */
static volatile uint32_t sl_beat_ms;        /* the band's last downbeat */
static uint8_t sl_started, sl_was_run = 1;
static uint32_t sl_bars_shape, sl_seed = 7;
static volatile uint32_t sl_reforms;

static uint32_t sl_reform_us_max;
static void sl_on_reform(void);          /* slime_ui.c: the burst */
static void sl_start_shape(void)
{
#ifdef SL_DEVICE
    uint32_t t0 = fm1_ticks();
#endif
    sh_tank_settings s = sh_tank_defaults();
    s.walls = sl_walls; s.space = sl_space ? SH_SPACE_PORTAL : SH_SPACE_NORMAL; s.spin = (double)sl_spin;
    s.scale = sh_scale_by_id(SL_SCALES[sl_scale % SL_NSCALE]);
    s.auto_notes = sl_auto;
    sl_on_reform();
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
    double want = ((double)(53 + (int)k + 12 * sl_octave) - (double)sl_root) * 100.0, oct = floor(want / 1200.0), in = want - oct * 1200.0, best = 0, bd = 1e9;
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
        sl_part_sound(SL_P_MEL, 0);                        /* KALIMBA, MONO BASS, RHODES: the "slime" sound set */
        slime_band_sounds();
        sl_fx_preset(SL_P_DRUMS, 0);
        slime_levels();
    }
    for (k = 0; k < 3u; k++)                               /* a part's new sound, once SLOOP's last fade is done */
        if (sl_snd_req[k] != 0xFFu && !sl_busy(k)) { sl_part_sound(k, sl_snd_req[k]); sl_snd_req[k] = 0xFF; }
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

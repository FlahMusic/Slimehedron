/* SPDX-License-Identifier: GPL-3.0-only */
/* Host bench for the bridge (fm1/firmware/slime.c): SLOOP's own DSP and sequencer sources (its browser-preview
 * adapter, firmware/host/preview.c) with the tank on top, on this pc. No FM-1, no JieLi toolchain.
 *   slimehost song  OUT.wav BARS SCALE WALLS BPM SEED ENGINE "PRESET"   the tank playing; prints one line of numbers
 *   slimehost pitch SCALE ENGINE "PRESET"       every degree of the scale alone: wanted Hz, measured Hz, cents off
 *   slimehost presets                           every engine's preset names
 * Build: fm1/firmware/build-host.sh */
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <time.h>
#define __attribute__(x)
#include "preview.c"
static FILE *sl_hlog;                       /* SL_HLOG=FILE: the harmony and every note (auto-check.sh) */
#define SL_LOG(...) do { if (sl_hlog) fprintf(sl_hlog, __VA_ARGS__); } while (0)
#include "../slime.c"

static void wav_head(FILE *f, uint32_t frames)
{
    uint32_t n = frames * 4u, v;
    uint16_t s;
    fwrite("RIFF", 1, 4, f); v = 36u + n; fwrite(&v, 4, 1, f); fwrite("WAVEfmt ", 1, 8, f);
    v = 16; fwrite(&v, 4, 1, f); s = 1; fwrite(&s, 2, 1, f); s = 2; fwrite(&s, 2, 1, f);
    v = FS; fwrite(&v, 4, 1, f); v = FS * 4u; fwrite(&v, 4, 1, f); s = 4; fwrite(&s, 2, 1, f); s = 16; fwrite(&s, 2, 1, f);
    fwrite("data", 1, 4, f); fwrite(&n, 4, 1, f);
}
static void setup(uint32_t engine, const char *preset, int bpm)
{
    int pi;
    preview_init();
    preview_render();
    song.g[G_BPM] = (int16_t)bpm;
    pi = sl_preset_named(engine, preset);
    if (pi < 0) { fprintf(stderr, "no preset \"%s\" on engine %u\n", preset, engine); exit(2); }
    sl_preset(&trk[SL_TRK_MEL], engine, (uint32_t)pi);
}

/* Loudness as the web's mix suite measures it (_dev/dev-mix.js): the mono mix through the two K-weighting filters of
 * ITU-R BS.1770 (a +4 dB high shelf at 1682 Hz, a high-pass at 38 Hz), ungated, mean square, -0.691. */
typedef struct { double b0, b1, b2, a1, a2, x1, x2, y1, y2; } biq;
static double biq_run(biq *f, double x)
{
    double y = f->b0 * x + f->b1 * f->x1 + f->b2 * f->x2 - f->a1 * f->y1 - f->a2 * f->y2;
    f->x2 = f->x1; f->x1 = x; f->y2 = f->y1; f->y1 = y;
    return y;
}
static biq k_shelf(void)
{
    double A = pow(10.0, 4.0 / 40.0), w = 2.0 * M_PI * 1681.97 / FS, c = cos(w), al = sin(w) / 2.0 * sqrt(2.0), q = 2.0 * sqrt(A) * al;
    double a0 = (A + 1) - (A - 1) * c + q;
    biq f = {A * ((A + 1) + (A - 1) * c + q) / a0, -2 * A * ((A - 1) + (A + 1) * c) / a0, A * ((A + 1) + (A - 1) * c - q) / a0,
             2 * ((A - 1) - (A + 1) * c) / a0, ((A + 1) - (A - 1) * c - q) / a0, 0, 0, 0, 0};
    return f;
}
static biq bandpass(double f0, double q)   /* RBJ band-pass, 0 dB at the centre (WebAudio's 'bandpass') */
{
    double w = 2.0 * 3.14159265358979 * f0 / FS, al = sin(w) / (2.0 * q), a0 = 1.0 + al;
    biq b = {al / a0, 0.0, -al / a0, -2.0 * cos(w) / a0, (1.0 - al) / a0, 0, 0, 0, 0};
    return b;
}
static biq k_hp(void)
{
    double w = 2.0 * M_PI * 38.13 / FS, c = cos(w), al = sin(w) / (2.0 * 0.5), a0 = 1 + al;
    biq f = {(1 + c) / 2 / a0, -(1 + c) / a0, (1 + c) / 2 / a0, -2 * c / a0, (1 - al) / a0, 0, 0, 0, 0};
    return f;
}

/* the pitch of a steady tone: the lag where it best matches itself (parabola through the peak) */
static double pitch_hz(const float *x, int n)
{
    int lag, best = 0, lo = FS / 2500, hi = FS / 40;
    static double ac[2048];
    double bv = -1e30, d;
    if (hi > 2047) hi = 2047;
    for (lag = lo - 1; lag <= hi + 1; lag++) {
        double s = 0; int i;
        for (i = 0; i + lag < n; i++) s += (double)x[i] * x[i + lag];
        ac[lag] = s / (n - lag);
    }
    for (lag = lo; lag <= hi; lag++)
        if (ac[lag] > ac[lag - 1] && ac[lag] >= ac[lag + 1] && ac[lag] > bv * 1.02) { bv = ac[lag]; best = lag; }
    if (!best) return 0;
    d = (ac[best - 1] - ac[best + 1]) / (2.0 * (ac[best - 1] - 2.0 * ac[best] + ac[best + 1]));
    return FS / (best + d);
}


/* SL_LOOPTEST=1 (song): a hand records a loop (slime.c sl_loop_*). REC at the 7th sixteenth of bar 3, five notes in
 * the take at their own times, REC again late in the take's second bar: a 2-bar loop. The log (SL_HLOG) has the hands
 * (H block cents), the loop closing (L bars bar_blocks notes) and what plays back (N block track note fine).
 * SL_LOOPTEST=2: the same, and REC once more on the playing loop for one more note (an overdub) */
static void loop_script(int mode)
{
    static int phase, k;
    static uint32_t B, bb;
    static const double AT[5] = {0.1, 0.37, 0.55, 1.25, 1.8}, C[5] = {0, 400, 700, 1200, 200};
    uint32_t now = sl_clock;
    if (phase == 0 && sl_stat.bars >= 3 && sl_step % 16u == 6u) { sl_loop_press(); phase = 1; }
    else if (phase == 1 && sl_loop_state == SL_LOOP_REC) { B = sl_db[(sl_db_n - 1u) & 3u].block; bb = sl_db[(sl_db_n - 1u) & 3u].bar_blocks; phase = 2; }
    else if (phase == 2) {
        if (k < 5 && (int32_t)(now - (B + (uint32_t)(AT[k] * bb))) >= 0) { sl_hand(C[k], 100); k++; }
        if ((int32_t)(now - (B + (uint32_t)(1.9 * bb))) >= 0) { sl_loop_press(); phase = 3; }
    } else if (phase == 3 && mode == 2 && (int32_t)(now - (B + 5u * bb)) >= 0) { sl_loop_press(); phase = 4; }   /* dub on */
    else if (phase == 4 && (int32_t)(now - (B + (uint32_t)(5.3 * bb))) >= 0) { sl_hand(900, 90); phase = 5; }
    else if (phase == 5 && (int32_t)(now - (B + (uint32_t)(5.6 * bb))) >= 0) { sl_loop_press(); phase = 6; }   /* dub off */
}

/* SL_HANDTEST=1 (song): a hand plays F A C (IV in C major) on every beat of bars 4..11, then stops: the band must take IV
/* (the chord F A C on every beat) while the hand plays (slime.c sl_hand_deg, band.c hand_deg) and move on after. SL_HANDTEST=2: the same over a
 * progression (ii-V-I): the progression keeps the harmony */
static void hand_script(int mode)
{
    static uint32_t last_step = 0xFFFFFFFFu;
    static const double C[3] = {500, 900, 0};
    if (mode == 2 && sl_stat.bars == 0 && sl_band.cm_n == 0) sh_band_cm_famous(&sl_band, 0, 0, 1);
    if (sl_step == last_step) return;
    last_step = sl_step;
    if (sl_stat.bars >= 4 && sl_stat.bars < 12 && sl_step % 4u == 1u) { sl_hand(C[0], 100); sl_hand(C[1], 96); sl_hand(C[2], 92); }   /* a chord, strummed */
}

int main(int argc, char **argv)
{
    if (argc >= 2 && !strcmp(argv[1], "presets")) {
        uint32_t e, i;
        preview_init();
        for (e = 0; e < NENGINES; e++) {
            printf("%u %s:", e, ENGINES[e]->name);
            for (i = 0; i < ENGINES[e]->npresets; i++) printf(" [%s]", ENGINES[e]->presets[i].name);
            printf("\n");
        }
        return 0;
    }
    if (argc >= 2 && !strcmp(argv[1], "soundcheck")) {   /* every sound the panel offers exists in its engine: no silent fallback */
        uint32_t p, i, bad = 0, n = 0;
        preview_init();
        for (p = 0; p < 3u; p++) for (i = 0; i < sl_snd_count(p); i++) { const sl_snd *s = sl_snd_entry(p, i); n++;
            if (sl_preset_named(s->eng, s->name) < 0) { printf("missing %s on engine %u\n", s->name, s->eng); bad++; } }
        for (i = 0; i < 11u; i++) {                       /* each rhythm's kit is one of SLOOP's synthesized kits */
            uint32_t k, j;
            n++;
            for (k = DRUM_SAMPLED; k < DRUM_USR; k++) {
                for (j = 0; SL_KIT_SOUND[i][j] && DRUM_KIT_NAMES[k][j] == SL_KIT_SOUND[i][j]; j++) {}
                if (!SL_KIT_SOUND[i][j] && !DRUM_KIT_NAMES[k][j]) break;
            }
            if (k == DRUM_USR) { printf("missing kit %s\n", SL_KIT_SOUND[i]); bad++; }
        }
        printf("sounds %u bad %u mel %u bass %u comp %u\n", n, bad, SL_NMEL, SL_NBASS, SL_NCOMP);   /* (check-host 5 loops over the counts) */
        return bad ? 1 : 0;
    }
    if (argc >= 4 && !strcmp(argv[1], "vnote")) {       /* vnote VOICE MIDI [VEL]: any DX7-layout voice (155 bytes, or a
                                                         * single-voice SysEx, 163) on FM6, held 1 s, 3 s, mono f32: a
                                                         * patch measured against another (soundprint.py) without a build */
        static float buf[FS * 3];
        uint8_t v[200];
        uint32_t i, k, n;
        FILE *f = fopen(argv[2], "rb");
        int midi = atoi(argv[3]), vel = argc >= 5 ? atoi(argv[4]) : 100;
        if (!f) { fprintf(stderr, "no file %s\n", argv[2]); return 2; }
        n = (uint32_t)fread(v, 1, sizeof v, f); fclose(f);
        if (!(n == FP_SIZE || (n == FP_SIZE + 8u && v[0] == 0xF0 && v[1] == 0x43))) { fprintf(stderr, "%u bytes: not a voice\n", n); return 2; }
        setup(9, "TINE EP", 100);
        trk[0].p[P_DLY] = 0; trk[0].p[P_REV] = 0; trk[0].p[P_CHOR] = 0;
        for (i = 0; i < 64 && sl_busy(0); i++) preview_render();
        for (i = 0; i < 8; i++) { fm6_poll(); preview_render(); }
        memcpy(fm6_patch[0], n == FP_SIZE ? v : v + 6, FP_SIZE);
        fm6_pgen[0]++;
        for (i = 0; i < 4; i++) preview_render();
        sl_note_on(0, midi, vel, 0);
        for (i = 0; i < FS * 3; i += CTL) {
            float *o;
            if (i <= FS && i + CTL > FS) trk_note_off(&trk[0], (uint32_t)midi);   /* (let go at 1 s, the block it falls in: "i == FS / 2" never matched, a note was held all 3 s; notemeasure reads to 0.8 s) */
            o = preview_render();
            for (k = 0; k < CTL && i + k < FS * 3; k++) buf[i + k] = o[2 * k] + o[2 * k + 1];
        }
        fwrite(buf, sizeof buf, 1, stdout);
        return 0;
    }
    if (argc >= 5 && !strcmp(argv[1], "note")) {        /* note ENGINE "PRESET" MIDI [VEL]: held 1 s, 3 s rendered, mono f32 */
        static float buf[FS * 3];
        uint32_t i, k;
        setup((uint32_t)atoi(argv[2]), argv[3], 100);
        for (i = 0; i < 64 && sl_busy(0); i++) preview_render();   /* (the preset's fade first: it sets the values again) */
        if (getenv("SL_PE")) {   /* a preset tried before it is written: "E0 .. E7 / A D S R / FENV" (slime_presets.py's order) */
            int e[13], c = sscanf(getenv("SL_PE"), "%d %d %d %d %d %d %d %d / %d %d %d %d / %d", &e[0], &e[1], &e[2], &e[3],
                                  &e[4], &e[5], &e[6], &e[7], &e[8], &e[9], &e[10], &e[11], &e[12]);
            if (c != 13) { fprintf(stderr, "SL_PE: 13 numbers\n"); return 2; }
            for (i = 0; i < 8u; i++) trk[0].p[P_E0 + i] = (int16_t)e[i];
            trk[0].p[P_ATK] = (int16_t)e[8]; trk[0].p[P_DEC] = (int16_t)e[9]; trk[0].p[P_SUS] = (int16_t)e[10]; trk[0].p[P_REL] = (int16_t)e[11];
            trk[0].p[P_ED_FLT] = (int16_t)e[12];
        }
        trk[0].p[P_DLY] = 0; trk[0].p[P_REV] = 0; trk[0].p[P_CHOR] = 0;   /* the voice alone */
        for (i = 0; i < 64 && sl_busy(0); i++) preview_render();
        for (i = 0; i < 8; i++) { fm6_poll(); preview_render(); }        /* (an FM6 patch loads in the main loop) */
        sl_note_on(0, atoi(argv[4]), argc >= 6 ? atoi(argv[5]) : 100, 0);
        for (i = 0; i < FS * 3; i += CTL) {
            float *o;
            if (i <= FS && i + CTL > FS) trk_note_off(&trk[0], (uint32_t)atoi(argv[4]));   /* (let go at 1 s, the block it falls in: "i == FS / 2" never matched, a note was held all 3 s; notemeasure reads to 0.8 s) */
            o = preview_render();
            for (k = 0; k < CTL && i + k < FS * 3; k++) buf[i + k] = o[2 * k] + o[2 * k + 1];
        }
        fwrite(buf, sizeof buf, 1, stdout);
        return 0;
    }
    if (argc >= 2 && !strcmp(argv[1], "echo")) {        /* echo: one click into the delay bus (1/8 at 100 bpm, repeats 60%),
                                                          * the echoes it comes back as: each one's side, time and level */
        static int32_t cin[CTL], din[CTL], rin[CTL], wl[CTL], wr[CTL];
        uint32_t i, k, dl, at = 0; int32_t last = 0;
        preview_init(); preview_render();
        song.g[G_BPM] = 100; song.g[G_DTIME] = 1; song.g[G_DFDBK] = 72; song.g[G_DMIX] = 127; song.g[G_DCOLOR] = 127;
        dl = delay_samples();
        printf("delay %u samples\n", dl);
        for (i = 0; i < FS * 3u; i += CTL) {
            for (k = 0; k < CTL; k++) { cin[k] = rin[k] = 0; din[k] = i + k == 0 ? 20000 : 0; wl[k] = wr[k] = 0; }
            fx_buses(cin, din, rin, wl, wr, CTL);
            for (k = 0; k < CTL; k++) {
                int32_t a = wl[k] < 0 ? -wl[k] : wl[k], b = wr[k] < 0 ? -wr[k] : wr[k];
                if ((a > 300 || b > 300) && i + k > at + dl / 2u) { printf("echo %u %s %d %d\n", i + k, a > b ? "L" : "R", a, b); at = i + k; last = a > b ? a : b; }
            }
        }
        (void)last;
        return 0;
    }
    if (argc >= 4 && !strcmp(argv[1], "sdhit")) {       /* sdhit KITINDEX NOTE: the site's drum engine alone (no SLOOP
                                                          * chain), 1 s, mono float32: what slime_drums.c itself makes */
        static float buf[FS], l[CTL], r[CTL];
        uint32_t i, k;
        sd_hit((uint32_t)atoi(argv[3]), 110.0f / 96.0f, (uint32_t)atoi(argv[2]), 60);
        for (i = 0; i < FS; i += CTL) {
            for (k = 0; k < CTL; k++) l[k] = r[k] = 0.0f;
            sd_render(l, r, CTL);
            for (k = 0; k < CTL && i + k < FS; k++) buf[i + k] = l[k] + r[k];
        }
        fwrite(buf, sizeof buf, 1, stdout);
        return 0;
    }
    if (argc >= 2 && !strcmp(argv[1], "scales")) {      /* scales: every scale on the SONG page is in the core, every key and
                                                          * MIDI note lands on one of its degrees, in every key; a 7-note
                                                          * scale's keys reach all 7, a whole tuning steps one note a key */
        uint32_t i, bad = 0, missing = 0;
        int root, m, d;
        for (i = 0; i < SL_NSCALE; i++) {
            const sh_scale *sc = sh_scale_by_id(SL_SCALES[i]);
            uint32_t seen = 0, off = 0;
            if (!sc) { printf("missing %s\n", SL_SCALES[i]); missing++; continue; }
            for (root = 52; root <= 64; root++)
                for (m = 0; m < 128; m++) {
                    double c = sl_snap_cents(sc, m, root), in = fmod(fmod(c, 1200.0) + 1200.0, 1200.0);
                    int hit = -1;
                    for (d = 0; d < sc->n; d++) if (fabs(in - sc->cents[d]) < 0.01 || fabs(in - sc->cents[d] - 1200.0) < 0.01) hit = d;
                    if (hit < 0) off++; else if (root == 60 && m >= 60 && m < 72 + (sc->n > 12 ? sc->n : 0)) seen |= 1u << (hit & 31);
                }
            if (off || seen != (sc->n >= 32 ? 0xFFFFFFFFu : (1u << sc->n) - 1u)) { printf("bad %s off %u seen %08x of %d\n", SL_SCALES[i], off, seen, sc->n); bad++; }
        }
        printf("scales %u missing %u bad %u\n", SL_NSCALE, missing, bad);
        return missing || bad;
    }
    if (argc >= 4 && !strcmp(argv[1], "hit")) {         /* hit KIT NOTE: one drum hit, 1 s, mono float32 on stdout */
        static float buf[FS];
        uint32_t i, k;
        preview_init(); preview_render();
        sl_drum_kit(argv[2]); song.g[G_DRLVL] = getenv("SL_HITLVL") ? (int16_t)atoi(getenv("SL_HITLVL")) : 100;   /* (SL_HITLVL: under the master's limiter) */
        {   /* the site's drums play the band's kit: "pop" .. "industrial" or "SH POP" .. "SH INDUS"; the ride in C */
            static const char *const NM[11] = {"pop", "rock", "disco", "bossa", "jazz", "samba", "conga", "march", "chip", "beep", "industrial"};
            uint32_t j;
            for (j = 0; j < 11u; j++) if (!strcmp(argv[2], NM[j]) || !strcmp(argv[2], SL_KIT_SOUND[j])) { sl_band.kit = j; sl_drum_kit(SL_KIT_SOUND[j]); }
            sl_root = 60;
            if (getenv("SL_SITEDRUMS")) sl_sd_on = (uint8_t)atoi(getenv("SL_SITEDRUMS"));   /* 0: SLOOP's drum synth, as before */
        }
        if (getenv("SL_DRY")) { song.g[G_DRREV] = 0; song.g[G_DRDLY] = 0; sl_drum_bus_on = 0; }   /* the hit alone, no room */
        if (getenv("SL_HITDBG")) fprintf(stderr, "itype %d tflt %d ins_run %d\n", TDRUM->p[P_ITYPE], TDRUM->p[P_TFLT], TDRUM->ins_run);
        sl_drum_hit((uint32_t)atoi(argv[3]), 110);
        for (i = 0; i < FS; i += CTL) { float *o = preview_render(); for (k = 0; k < CTL && i + k < FS; k++) buf[i + k] = o[2 * k] + o[2 * k + 1]; }
        fwrite(buf, sizeof buf, 1, stdout);
        return 0;
    }
    if (argc >= 5 && !strcmp(argv[1], "pitch")) {
        const sh_scale *sc = sh_scale_by_id(argv[2]);
        static float mono[FS];
        int deg, worst_i = 0; double worst = 0;
        if (!sc) { fprintf(stderr, "unknown scale\n"); return 2; }
        for (deg = 0; deg <= sc->n; deg++) {
            double cents = sh_cents_for_degree(sc, deg), want = 440.0 * pow(2.0, (60 - 69) / 12.0 + cents / 1200.0), got, off;
            int note, fine, i, n = 0;
            setup((uint32_t)atoi(argv[3]), argv[4], 100);
            if (getenv("SL_PITCHDRY")) { trk[SL_TRK_MEL].p[P_DLY] = 0; trk[SL_TRK_MEL].p[P_REV] = 0; }   /* (the voice without its echoes)*/
            sl_root = 60;
            sl_split(cents, &note, &fine);
            if (getenv("SL_NOFINE")) fine = 0;
            for (i = 0; i < 64 && sl_busy(SL_TRK_MEL); i++) preview_render();   /* the preset's fade-in first */
            sl_note_on(SL_TRK_MEL, note, 100, fine);
            for (i = 0; i < FS * 3 / 2; i += CTL) {       /* 1.5 s held; the last second is measured */
                float *o = preview_render(); int k;
                if (i >= FS / 2) for (k = 0; k < CTL && n < FS; k++) mono[n++] = o[2 * k] + o[2 * k + 1];
            }
            got = pitch_hz(mono, n);
            off = got > 0 ? 1200.0 * log2(got / want) : 9999.0;
            printf("deg %d cents %.2f note %d fine %d want %.3f got %.3f off %.2f\n", deg, cents, note, fine, want, got, off);
            if (fabs(off) > fabs(worst)) { worst = off; worst_i = deg; }
        }
        printf("worst %.2f cents at degree %d\n", worst, worst_i);
        return 0;
    }
    if (argc >= 10 && !strcmp(argv[1], "song")) {
        int bars = atoi(argv[3]), bpm = atoi(argv[6]);
        uint32_t frames = (uint32_t)((double)bars * 240.0 / bpm * FS) / CTL * CTL, i, k;
        sh_tank_settings s = sh_tank_defaults();
        FILE *f = fopen(argv[2], "wb");
        double sum = 0, peak = 0, ksum = 0, psum = 0; clock_t t0; biq ks = k_shelf(), kh = k_hp(), p1 = bandpass(3960.0, 1.41), p2 = bandpass(3960.0, 1.41);
        if (!f) { perror(argv[2]); return 2; }
        s.scale = sh_scale_by_id(argv[4]); s.walls = atoi(argv[5]);
        s.guard = getenv("SL_GUARD") ? atoi(getenv("SL_GUARD")) : 1; s.worm_hold = 8;   /* the tank as the device runs it (slime.c sl_start_shape) */
        if (!s.scale) { fprintf(stderr, "unknown scale\n"); return 2; }
        setup((uint32_t)atoi(argv[8]), argv[9], bpm);
        slime_band_sounds();
        if (getenv("SL_BASSND")) { char e[16]; int k = 0; const char *v = getenv("SL_BASSND"); while (v[k] && v[k] != ':' && k < 15) { e[k] = v[k]; k++; } e[k] = 0; if (v[k] == ':') sl_sound_on(SL_TRK_BASS, (uint32_t)atoi(e), v + k + 1); }
        if (getenv("SL_COMPSND")) { char e[16]; int k = 0; const char *v = getenv("SL_COMPSND"); while (v[k] && v[k] != ':' && k < 15) { e[k] = v[k]; k++; } e[k] = 0; if (v[k] == ':') sl_sound_on(SL_TRK_COMP, (uint32_t)atoi(e), v + k + 1); }
        if (getenv("SL_MELI")) sl_part_sound(SL_P_MEL, (uint32_t)atoi(getenv("SL_MELI")));    /* a part's sound by its index: the trims */
        if (getenv("SL_BASSI")) sl_part_sound(SL_P_BASS, (uint32_t)atoi(getenv("SL_BASSI")));
        if (getenv("SL_COMPI")) sl_part_sound(SL_P_COMP, (uint32_t)atoi(getenv("SL_COMPI")));
        for (k = 0; k < 64 && (sl_busy(0) || sl_busy(1) || sl_busy(2)); k++) preview_render();   /* the presets' fade-ins */
        for (k = 0; k < 8; k++) { fm6_poll(); preview_render(); }   /* an FM6 part's patch loads in the main loop, as on the device */
        slime_band_start(getenv("SL_KIT") ? sh_band_kit_by_name(getenv("SL_KIT")) : 0, (uint32_t)strtoul(argv[7], 0, 10) * 2654435761u);
        if (getenv("SL_STRESS")) {   /* every knob a person can reach, at its worst: CHARACTER:FILTER (all four parts) */
            int c = atoi(getenv("SL_STRESS")), fl = atoi(strchr(getenv("SL_STRESS"), ':') + 1), p;
            for (p = 0; p < 4; p++) {
                sl_fx f = {(int8_t)fl, 127, 127, 127, (uint8_t)c, 127};
                sl_fxs[p] = f; sl_fx_apply((uint32_t)p); sl_mix[p] = 12;
            }
            song.g[G_RSIZE] = 127; slime_levels();
        }
        if (getenv("SL_FXP")) { int p = atoi(getenv("SL_FXP")), i = atoi(strchr(getenv("SL_FXP"), ':') + 1); sl_fx_preset((uint32_t)p, (uint32_t)i); }   /* PART:PRESET */
        if (getenv("SL_HUMAN")) sl_band.human = atoi(getenv("SL_HUMAN"));
        if (getenv("SL_JOURNEY")) sl_band.journey = sl_journey_bars((double)bpm);   /* the slime on: the key journey */
        if (getenv("SL_HLOG")) sl_hlog = fopen(getenv("SL_HLOG"), "w");
        if (getenv("SL_MEL")) sl_mel_on = (uint8_t)atoi(getenv("SL_MEL"));
        if (getenv("SL_DRUMS")) sl_drums_on = (uint8_t)atoi(getenv("SL_DRUMS"));
        if (getenv("SL_BAND")) sl_band_on = (uint8_t)atoi(getenv("SL_BAND"));
        slime_levels();
        if (getenv("SL_MLVL")) trk[SL_TRK_MEL].p[P_LEVEL] = (int16_t)atoi(getenv("SL_MLVL"));
        if (getenv("SL_DLVL")) song.g[G_DRLVL] = (int16_t)atoi(getenv("SL_DLVL"));
        if (getenv("SL_BLVL")) trk[SL_TRK_BASS].p[P_LEVEL] = (int16_t)atoi(getenv("SL_BLVL"));
        if (getenv("SL_CLVL")) trk[SL_TRK_COMP].p[P_LEVEL] = (int16_t)atoi(getenv("SL_CLVL"));
        if (getenv("SL_ONLY")) {                           /* one part alone: mel, drums, bass, comp */
            const char *o = getenv("SL_ONLY");
            sl_mel_on = !strcmp(o, "mel"); sl_drums_on = !strcmp(o, "drums");
            sl_band_on = !strcmp(o, "bass") || !strcmp(o, "comp");
            if (!strcmp(o, "bass")) trk[SL_TRK_COMP].p[P_MUTE] = 1;
            if (!strcmp(o, "comp")) trk[SL_TRK_BASS].p[P_MUTE] = 1;
        }
        if (getenv("SL_TRIM")) trk[SL_TRK_MEL].p[P_ED_FX] = (int16_t)(trk[SL_TRK_MEL].p[P_ED_FX] + atoi(getenv("SL_TRIM")));
        if (getenv("SL_GAIN")) song.master_q12 = (uint32_t)atoi(getenv("SL_GAIN"));
        if (getenv("SL_NOPRES")) { sl_pres_db = 0.0f; sl_bus_init = 0; }   /* (the presence dip off, the bus made again: check-host 11 must fail) */
        if (getenv("SL_DRUMBUS")) sl_drum_bus_on = (uint8_t)atoi(getenv("SL_DRUMBUS"));   /* 0: the drums without the site's bus */
        if (getenv("SL_GLUEMEAS")) sl_glue_scale = 1e6f;   /* the glue out of reach: the bus's own peak */
        slime_start(s, strtoull(argv[7], 0, 10), 60);
        wav_head(f, frames);
        t0 = clock();
        for (i = 0; i < frames; i += CTL) {
            float *o; int16_t pcm[CTL * 2];
            if (getenv("SL_LOOPTEST")) loop_script(atoi(getenv("SL_LOOPTEST")));
            if (getenv("SL_HANDTEST")) hand_script(atoi(getenv("SL_HANDTEST")));
            slime_schedule(SL_AHEAD_BLOCKS);      /* the conductor, ahead; then the audio side, as on the device */
            if (i % (CTL * 32u) == 0u)            /* the slime's muffle, 43 times a second (slime_conduct: 50) */
                sl_slime_morph(!getenv("SL_NOSLIME"), getenv("SL_FILL") ? atof(getenv("SL_FILL")) : sh_goo_fill(&sl_tank.goo),
                               i ? CTL * 32u * 1000u / FS : 0u);   /* (SL_FILL: the tank held at that fill, as dev-slimesound holds the site's) */
            if (i % (CTL * 32u) == 0u && !getenv("SL_SWING")) sl_swing_tick(!getenv("SL_NOSLIME"), (uint32_t)((double)i * 1000.0 / FS));
            if (getenv("SL_SWING")) sl_swing_want = atof(getenv("SL_SWING"));   /* (a swing held: the onset check) */
            slime_play_block();
            o = preview_render();
            for (k = 0; k < CTL; k++) { double m = biq_run(&kh, biq_run(&ks, (o[2 * k] + o[2 * k + 1]) * 0.5)), q = biq_run(&p2, biq_run(&p1, (o[2 * k] + o[2 * k + 1]) * 0.5)); ksum += m * m; psum += q * q; }
            for (k = 0; k < CTL * 2; k++) { double v = o[k]; sum += v * v; if (fabs(v) > peak) peak = fabs(v); pcm[k] = (int16_t)(v * 32767.0f); }
            fwrite(pcm, sizeof pcm, 1, f);
        }
        fclose(f);
        {
            double secs = (double)frames / FS, cpu = (double)(clock() - t0) / CLOCKS_PER_SEC;
            printf("lufs %.2f mlvl %d dlvl %d drum_hits %u bass_notes %u comp_notes %u fills %u kit %s ", -0.691 + 10.0 * log10(ksum / frames + 1e-20),
                   trk[SL_TRK_MEL].p[P_LEVEL], song.g[G_DRLVL], sl_stat.drums_played, sl_stat.bass_notes, sl_stat.comp_notes, sl_stat.fills,
                   sh_band_kit_name(sl_band.kit));
            printf("bars %d hits %u notes %u per_bar %.2f late %u worst_late_ms %.2f dropped %u rms_db %.1f peak_db %.1f "
                   "x_realtime %.0f tank_bytes %zu goo_fill %.2f\n", bars, sl_stat.hits, sl_stat.mel_notes,
                   (double)sl_stat.mel_notes / bars, sl_stat.late, sl_stat.worst_late_blocks * CTL * 1000.0 / FS, sl_stat.dropped,
                   10.0 * log10(sum / (frames * 2.0) + 1e-20), 20.0 * log10(peak + 1e-10), secs / (cpu > 0 ? cpu : 1e-9),
                   sizeof sl_tank, sh_goo_fill(&sl_tank.goo));
            printf("glue_peak_db %.2f glue_worst_db %.2f pres_db %.2f\n", 20.0 * log10(sl_glue_peak / 32767.0 + 1e-12), sl_glue_worst, 10.0 * log10(psum / frames + 1e-20));
        }
        return 0;
    }
    fprintf(stderr, "slimehost song|pitch|presets ...\n");
    return 2;
}

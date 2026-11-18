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
        for (i = 0; i < SL_NSET; i++) if (SL_SETS[i].mel >= SL_NMEL || SL_SETS[i].bass >= SL_NBASS || SL_SETS[i].comp >= SL_NCOMP) { printf("set %s out of range\n", SL_SETS[i].name); bad++; }
        for (i = 0; i < 11u; i++) {                       /* each rhythm's kit is one of SLOOP's synthesized kits */
            uint32_t k, j;
            n++;
            for (k = DRUM_SAMPLED; k < DRUM_USR; k++) {
                for (j = 0; SL_KIT_SOUND[i][j] && DRUM_KIT_NAMES[k][j] == SL_KIT_SOUND[i][j]; j++) {}
                if (!SL_KIT_SOUND[i][j] && !DRUM_KIT_NAMES[k][j]) break;
            }
            if (k == DRUM_USR) { printf("missing kit %s\n", SL_KIT_SOUND[i]); bad++; }
        }
        printf("sounds %u bad %u\n", n, bad);
        return bad ? 1 : 0;
    }
    if (argc >= 4 && !strcmp(argv[1], "hit")) {         /* hit KIT NOTE: one drum hit, 1 s, mono float32 on stdout */
        static float buf[FS];
        uint32_t i, k;
        preview_init(); preview_render();
        sl_drum_kit(argv[2]); song.g[G_DRLVL] = 100;
        if (getenv("SL_DRY")) { song.g[G_DRREV] = 0; song.g[G_DRDLY] = 0; }   /* the hit alone, no room */
        drum_on((uint32_t)atoi(argv[3]), 110);
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
        double sum = 0, peak = 0, ksum = 0; clock_t t0; biq ks = k_shelf(), kh = k_hp();
        if (!f) { perror(argv[2]); return 2; }
        s.scale = sh_scale_by_id(argv[4]); s.walls = atoi(argv[5]);
        if (!s.scale) { fprintf(stderr, "unknown scale\n"); return 2; }
        setup((uint32_t)atoi(argv[8]), argv[9], bpm);
        slime_band_sounds();
        if (getenv("SL_BASSND")) { char e[16]; int k = 0; const char *v = getenv("SL_BASSND"); while (v[k] && v[k] != ':' && k < 15) { e[k] = v[k]; k++; } e[k] = 0; if (v[k] == ':') sl_sound_on(SL_TRK_BASS, (uint32_t)atoi(e), v + k + 1); }
        if (getenv("SL_COMPSND")) { char e[16]; int k = 0; const char *v = getenv("SL_COMPSND"); while (v[k] && v[k] != ':' && k < 15) { e[k] = v[k]; k++; } e[k] = 0; if (v[k] == ':') sl_sound_on(SL_TRK_COMP, (uint32_t)atoi(e), v + k + 1); }
        if (getenv("SL_MELI")) sl_part_sound(SL_P_MEL, (uint32_t)atoi(getenv("SL_MELI")));    /* a part's sound by its index: the trims */
        if (getenv("SL_BASSI")) sl_part_sound(SL_P_BASS, (uint32_t)atoi(getenv("SL_BASSI")));
        if (getenv("SL_COMPI")) sl_part_sound(SL_P_COMP, (uint32_t)atoi(getenv("SL_COMPI")));
        for (k = 0; k < 64 && (sl_busy(0) || sl_busy(1) || sl_busy(2)); k++) preview_render();   /* the presets' fade-ins */
        slime_band_start(getenv("SL_KIT") ? sh_band_kit_by_name(getenv("SL_KIT")) : 0, (uint32_t)strtoul(argv[7], 0, 10) * 2654435761u);
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
        slime_start(s, strtoull(argv[7], 0, 10), 60);
        wav_head(f, frames);
        t0 = clock();
        for (i = 0; i < frames; i += CTL) {
            float *o; int16_t pcm[CTL * 2];
            slime_schedule(SL_AHEAD_BLOCKS);      /* the conductor, ahead; then the audio side, as on the device */
            slime_play_block();
            o = preview_render();
            for (k = 0; k < CTL; k++) { double m = biq_run(&kh, biq_run(&ks, (o[2 * k] + o[2 * k + 1]) * 0.5)); ksum += m * m; }
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
        }
        return 0;
    }
    fprintf(stderr, "slimehost song|pitch|presets ...\n");
    return 2;
}

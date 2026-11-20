/* SPDX-License-Identifier: GPL-3.0-only */
/* Slimehedron for the FM-1: THE SITE'S DRUMS, synthesized as the site makes them (index.html: dHit, metal, hiss,
 * KITTONE, PIECE_DB, KIT_DB, initDrums).
 * Flah 2026-11-20: "the drum sounds barely sound like my drums off the site". Before this the FM-1 played SLOOP's drum
 * synth with each kit's numbers copied in (gen-kits.js): one recipe for every piece. The site's pieces are each their
 * own recipe of layers: the kick a sine diving in pitch plus a low-passed noise click (the beater), the snare band-passed
 * noise plus a falling triangle body (and a stick's click on the jazz kit), the hats six detuned squares through a
 * band-pass and a high-pass with an airy noise layer, the open hat choked by the next hat, the ride three sine partials
 * tuned to the key, the crash metal and a long bright hiss, toms a falling sine with the drumhead's 1.59x mode and a stick
 * thump, congas a falling triangle and a slap, the clave a 2.5 kHz ping. Every hit's noise is new (the site starts its
 * noise buffer anywhere: no two hits alike), every piece sits where the site pans it, each kit's pieces at the site's
 * PIECE_DB, the kit at its KIT_DB after the glue.
 * Each layer is a WebAudio node chain here as arithmetic: exponentialRampToValueAtTime(v1, t1) from v0 is a multiplier a
 * sample, (v1 / v0)^(1 / samples); setTargetAtTime(0, t, tau) is exp(-1 / (tau fs)); the biquads are the RBJ cookbook's
 * (WebAudio's own). Runs in the drum track's block (fx.c mix_drums, patch_sloop.py), on the second core where the drums
 * render: the site's bus follows (slime.c sl_drum_bus).
 * THE COST (fm1-emu STRICT, the 160 s session): written as above, a layer a sample, the audio missed its deadline 1,683
 * times (its worst half 7,141 us of 5,805). Now each layer renders a block at a time in a loop of its own (no test of its
 * kind a sample), a hat's squares are their harmonics as recursive sines set up once a hit (it was a division a
 * harmonic a sample), the crash's squares plain (polyBLEP cost a frame rate of 10 with a long decay), a layer that has
 * died away stops, and the hit's own set-up calls no libm (cosf, sinf, expf live in flash; on the second core they cost
 * a cache miss each). session.sh after: worst audio half 89% of its deadline, 0 late notes. */
#define SD_NV 12                            /* voices at once (a busy bar with fills: ~8) */
#define SD_NL 4                             /* layers a voice */
#define SD_FS ((float)FS)
typedef struct { float b0, b1, b2, a1, a2, z1, z2; } sd_bq;
enum { SD_OFF, SD_SINE, SD_TRI, SD_SQR, SD_METAL, SD_NOISE };
typedef struct {
    uint8_t type, nf; int8_t mp;            /* METAL: its harmonics in sd_mp[mp] (a hat's), or -1: six plain squares (the crash's) */
    float ph[6], dph[6];                    /* phase 0..1 and its step (METAL: six squares) */
    float fmul; uint32_t fn;                /* the pitch ramp: a multiplier a sample, for fn samples */
    float g, gm;                            /* the level and its multiplier a sample */
    float att, atk;                         /* a linear attack: samples left, the step */
    float tgt;                              /* the attack's end level */
    uint32_t rn, sn;                        /* the ramp's samples left, then held there until the source stops (WebAudio) */
    sd_bq f[2];
} sd_layer;
typedef struct { uint8_t on, hat; float pl, pr, choke; uint32_t t, life; sd_layer L[SD_NL]; } sd_voice;   /* hat: 1 closed, 2 open */
static sd_voice sd_v[SD_NV];
/* a hat's six squares as the harmonics each has under Nyquist (WebAudio's squares are band-limited): 4 / pi / k for the
 * k-th odd harmonic, at most 12 between the six; a few at once (a closed hat, an open one ringing, one stolen) */
#define SD_NMP 4u
#define SD_MPN 12u
static struct { uint8_t used, np; float y1[SD_MPN], y2[SD_MPN], c2[SD_MPN]; } sd_mp[SD_NMP];   /* each harmonic a recursive sine:
                                                     * y = 2 cos(w) y1 - y2, two operations a sample (its pitch never moves) */
static void sd_voice_free(sd_voice *v) { uint32_t i; for (i = 0; i < SD_NL; i++) if (v->L[i].type == SD_METAL && v->L[i].mp >= 0) sd_mp[v->L[i].mp].used = 0; v->on = 0; }
static uint32_t sd_rng = 0x2545F491u;
static float sd_noise(void) { sd_rng = sd_rng * 1664525u + 1013904223u; return (float)(int32_t)sd_rng * (1.0f / 2147483648.0f); }

/* the site's kits (KITTONE): st 0 909, 1 acoustic, 2 brush, 3 808, 4 chip, 5 stick; kick start / end Hz, decay, level,
 * click; snare noise Hz, decay, body Hz, noise mix; hat Hz, decay, metal; crash and tom tuning */
typedef struct { uint8_t st; float kf, ke, kd, kv, kc, sf, sd, sb, sn, hf, hd, hm, cy, tm; } sd_kit;
static const sd_kit SD_KIT[11] = {   /* pop rock disco bossa jazz samba conga march chip beep industrial (band_tables.h's order) */
    {0, 150, 48, 0.34f, 1.00f, 0.9f, 1900, 0.12f, 185, 0.70f, 8000, 0.030f, 0.50f, 1.00f, 1.00f},
    {1, 120, 44, 0.50f, 1.05f, 0.7f, 1500, 0.19f, 170, 0.85f, 6500, 0.050f, 0.35f, 0.96f, 0.90f},
    {0, 125, 42, 0.30f, 1.08f, 1.0f, 2100, 0.09f, 195, 0.60f, 9200, 0.070f, 0.70f, 1.05f, 1.05f},
    {2, 170, 56, 0.24f, 0.82f, 0.4f, 2400, 0.09f, 205, 0.90f, 8600, 0.030f, 0.40f, 0.95f, 1.08f},
    {5, 135, 50, 0.28f, 0.70f, 0.3f, 1500, 0.12f, 170, 0.62f, 7800, 0.045f, 0.30f, 0.88f, 1.12f},
    {0, 160, 50, 0.22f, 0.85f, 0.6f, 2200, 0.07f, 200, 0.70f, 9200, 0.030f, 0.50f, 1.02f, 1.10f},
    {0, 150, 45, 0.30f, 0.85f, 0.5f, 1800, 0.09f, 190, 0.70f, 7500, 0.030f, 0.40f, 1.00f, 1.10f},
    {1, 140, 55, 0.20f, 0.95f, 0.8f, 2600, 0.07f, 210, 0.85f, 7000, 0.020f, 0.30f, 1.00f, 1.00f},
    {4, 210, 75, 0.14f, 0.72f, 0.5f, 2700, 0.05f, 240, 0.50f, 9500, 0.020f, 0.20f, 1.20f, 1.25f},
    {4, 185, 62, 0.18f, 0.78f, 0.4f, 2300, 0.06f, 215, 0.50f, 9000, 0.024f, 0.30f, 1.15f, 1.20f},
    {3,  90, 34, 0.60f, 1.15f, 1.2f, 3000, 0.06f, 220, 0.55f, 11000, 0.025f, 0.90f, 1.15f, 0.85f},
};
/* PIECE_DB (dB a piece; 0 where the site has none), in the pieces' order below, and KIT_DB (the kit after its glue) */
enum { SDP_K, SDP_S, SDP_H, SDP_O, SDP_R, SDP_CL, SDP_LC, SDP_HC, SDP_Y, SDP_X, SDP_LT, SDP_HT, SDP_N };
static const int8_t SD_PIECE_DB[11][SDP_N] = {   /* x2: half dB */
    {-27, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -13}, {-26, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -8}, {-29, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -15},
    {-21, 0, 0, 0, 0, -10, 0, 0, 0, 0, 0, 0}, {-31, -2, 0, -12, 0, 0, 0, 0, 0, 0, 0, 0}, {-26, 0, 0, 0, 0, 0, -26, -22, 0, 0, 0, 0},
    {-28, 0, 0, 0, 0, 0, -28, -19, 0, 0, 0, 0}, {-31, -10, 0, 0, 0, 0, 0, 0, 0, 0, -22, -24}, {-37, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
    {-30, 0, 0, 0, 0, 0, 0, -13, 0, 0, 0, 0}, {-26, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
};
static const float SD_KIT_DB[11] = {-15.0f, -20.0f, -16.6f, -16.2f, -6.6f, -13.1f, -12.9f, -10.4f, -9.1f, -12.4f, -21.3f};
/* the DRUMS page's own controls over the kit: its tone (one of the 11), tune (semitones), decay (x 0.5 .. 2) */
static volatile uint8_t sd_tone = 0xFF;      /* 0xFF: the rhythm's own kit */
static volatile int8_t sd_tune;              /* -12..12 */
static volatile uint8_t sd_decay = 8;        /* 4..16: x decay / 8 */

/* a^b without libm in the audio path (slime.c). The per-sample multipliers are a^(1/samples), within a few 1e-4 of 1,
 * raised to the 10,000th power over a hit: sl_exp2's cubic (0.6%) made every hit die in 15 ms (check-drums.sh, the
 * first run). ln a from sl_log2 (0.005 out in log2, a 0.3% error in the decay TIME), then e^y by its series, exact
 * for the tiny y a per-sample step has */
static float sd_pow(float a, float b)
{
    float y = b * sl_log2(a) * 0.69314718f;
    if (y > -0.05f && y < 0.05f) return 1.0f + y * (1.0f + y * (0.5f + y * (1.0f / 6.0f)));
    return sl_exp2(y * 1.44269504f);
}
static float sd_poly(float ph)   /* a sine from the triangle: sin(pi x / 2) by its 5th-order polynomial (within 1e-4; the cubic before: 3%, a 2.5 kHz clave rang its 3rd harmonic) */
{
    float x = ph < 0.5f ? ph * 4.0f - 1.0f : 3.0f - ph * 4.0f, x2 = x * x;
    return x * (1.5707963f + x2 * (-0.6459640f + x2 * 0.0796926f));
}
static float sd_sin(float turns) { turns += 0.25f; turns -= (float)(int32_t)turns; return sd_poly(turns); }   /* sin(2 pi turns), 0 <= turns */
static void sd_bq_set(sd_bq *q, int type, float f0, float Q)   /* RBJ: 0 low-pass, 1 high-pass, 2 band-pass (0 dB peak) */
{
    float tw = (f0 < SD_FS * 0.45f ? f0 : SD_FS * 0.45f) / SD_FS, c = sd_sin(tw + 0.25f), al = sd_sin(tw) / (2.0f * Q), a0 = 1.0f + al;
    if (type == 0) { q->b0 = (1.0f - c) / 2.0f / a0; q->b1 = (1.0f - c) / a0; q->b2 = q->b0; }
    else if (type == 1) { q->b0 = (1.0f + c) / 2.0f / a0; q->b1 = -(1.0f + c) / a0; q->b2 = q->b0; }
    else { q->b0 = al / a0; q->b1 = 0.0f; q->b2 = -al / a0; }
    q->a1 = -2.0f * c / a0; q->a2 = (1.0f - al) / a0; q->z1 = q->z2 = 0.0f;
}
static float sd_bq_run(sd_bq *q, float x) { float y = q->b0 * x + q->z1; q->z1 = q->b1 * x - q->a1 * y + q->z2; q->z2 = q->b2 * x - q->a2 * y; return y; }
#define SD_Q_DEF 1.1220185f                 /* WebAudio's low / high-pass Q is in dB: its default 1 dB is 10^(1/20) */

static sd_voice *sd_new(float pan)
{
    uint32_t i, best = 0, bt = 0;
    sd_voice *v;
    for (i = 0; i < SD_NV; i++) { if (!sd_v[i].on) { best = i; break; } if (sd_v[i].t > bt) { bt = sd_v[i].t; best = i; } }   /* (full: the oldest) */
    v = &sd_v[best];
    if (v->on) sd_voice_free(v);
    memset(v, 0, sizeof *v);
    v->on = 1; v->choke = 1.0f;
    pan = pan < -1.0f ? -1.0f : pan > 1.0f ? 1.0f : pan;
    v->pl = sd_sin((pan + 1.0f) * 0.125f + 0.25f); v->pr = sd_sin((pan + 1.0f) * 0.125f);   /* StereoPannerNode, mono in: equal power */
    return v;
}
/* a layer: type, start Hz (0 for noise), end Hz and the seconds to get there (exponentialRamp), level, the seconds to
 * fall to 0.001 (exponentialRamp; a negative decay: setTargetAtTime's tau) */
static sd_layer *sd_layer_add(sd_voice *v, int type, float f0, float f1, float fdur, float lvl, float dec)
{
    sd_layer *L = 0;
    uint32_t i, life;
    for (i = 0; i < SD_NL; i++) if (v->L[i].type == SD_OFF) { L = &v->L[i]; break; }
    if (!L || lvl <= 0.0f) return 0;
    L->type = (uint8_t)type; L->g = lvl; L->mp = -1;
    if (dec > 0.0f) { L->gm = sd_pow(0.001f / lvl, 1.0f / (dec * SD_FS)); L->rn = (uint32_t)(dec * SD_FS); life = L->rn + (uint32_t)(0.02f * SD_FS); }   /* (the site stops its sources 20 ms after) */
    else { float y = -1.0f / (-dec * SD_FS); L->gm = 1.0f + y * (1.0f + y * (0.5f + y * (1.0f / 6.0f))); L->rn = life = (uint32_t)(-dec * 7.0f * SD_FS); }   /* e^y, y tiny; stopped at 7 tau */
    if (type != SD_NOISE) {
        L->dph[0] = f0 / SD_FS;
        L->ph[0] = 0.25f;                     /* WebAudio's sine and triangle start at 0, rising (from -1: a click on every hit) */
        if (fdur > 0.0f && f1 > 0.0f) { L->fn = (uint32_t)(fdur * SD_FS); L->fmul = sd_pow(f1 / f0, 1.0f / (fdur * SD_FS)); }
        else { L->fn = 0; L->fmul = 1.0f; }
    }
    L->sn = life;
    if (life > v->life) v->life = life;
    return L;
}
static void sd_attack(sd_layer *L, float sec)  /* a linear ramp up to the layer's level first (the ride, the clave) */
{
    L->tgt = L->g; L->att = sec * SD_FS; L->atk = L->g / (L->att > 1.0f ? L->att : 1.0f); L->g = 0.0001f;
}
static void sd_metal(sd_layer *L, float f0)   /* the 808's six squares at inharmonic ratios */
{
    static const float R[6] = {1.0f, 1.34f, 1.61f, 1.87f, 2.03f, 2.45f};
    uint32_t i, j, np = 0, m;
    L->type = SD_METAL; L->mp = -1;
    for (i = 0; i < 6; i++) { L->dph[i] = f0 * R[i] / SD_FS; L->ph[i] = sd_noise() * 0.5f + 0.5f; }
    for (i = 0; i < 6; i++) for (j = 1u; (float)j * f0 * R[i] < SD_FS * 0.5f; j += 2u) np++;
    if (np > SD_MPN) return;                   /* a low one (the crash's, 390 Hz: dozens): plain squares */
    for (m = 0; m < SD_NMP && sd_mp[m].used; m++) {}
    if (m == SD_NMP) return;                   /* (none free: plain squares) */
    sd_mp[m].used = 1; sd_mp[m].np = 0; L->mp = (int8_t)m;
    for (i = 0; i < 6; i++)
        for (j = 1u; (float)j * f0 * R[i] < SD_FS * 0.5f; j += 2u) {
            uint32_t k = sd_mp[m].np++;
            float ph = L->ph[i] * (float)j, w = L->dph[i] * (float)j, amp = 1.2732395f / (float)j;
            ph -= (float)(int32_t)ph;
            sd_mp[m].c2[k] = 2.0f * sd_sin(w + 0.25f);      /* 2 cos(w), held inside +-2: the polynomial's 1e-4 past -1 near Nyquist (bossa's 21.5 kHz) made the recursion grow without end */
            if (sd_mp[m].c2[k] < -1.99999f) sd_mp[m].c2[k] = -1.99999f;
            if (sd_mp[m].c2[k] > 1.99999f) sd_mp[m].c2[k] = 1.99999f;
            sd_mp[m].y1[k] = amp * sd_sin(ph);              /* the last sample, and the one before */
            sd_mp[m].y2[k] = amp * sd_sin(ph + 1.0f - w);
        }
}
static void sd_floor(sd_layer *L, float lvl, float fl, float dec) { if (L) L->gm = sd_pow(fl / lvl, 1.0f / (dec * SD_FS)); }   /* metal / hiss fall to 0.0006 */
static void sd_filter(sd_layer *L, int type, float f0, float Q) { if (L && L->nf < 2) sd_bq_set(&L->f[L->nf++], type, f0, Q); }
static float sd_jit(float x) { return x * sd_noise(); }   /* +-x, uniformly (the site's Math.random()*2x - x) */

/* the hi-hat's choke group (hatChoke): a new hat stops the open one ringing, time constant 12 ms */
static void sd_choke(void)
{
    uint32_t i;
    float y = -1.0f / (0.012f * SD_FS), k = 1.0f + y * (1.0f + y * (0.5f + y * (1.0f / 6.0f)));   /* e^y */
    for (i = 0; i < SD_NV; i++) if (sd_v[i].on && sd_v[i].hat == 2) sd_v[i].choke = k;
}

/* one hit: a General MIDI note (the site's DRUMN), its accent a (the site's a: vel / 96, up to 1.9) */
static void sd_hit(uint32_t note, float a, uint32_t kit, int key_pc)
{
    const sd_kit *T = &SD_KIT[(sd_tone != 0xFF ? sd_tone : kit) % 11u];
    float tn = sd_pow(2.0f, (float)sd_tune / 12.0f), dk = (float)sd_decay / 8.0f, pdb = 0.0f;
    int piece = note == 36u ? SDP_K : note == 38u || note == 40u || note == 39u ? SDP_S : note == 42u || note == 44u ? SDP_H : note == 46u ? SDP_O :
                note == 37u ? SDP_R : note == 75u ? SDP_CL : note == 62u || note == 64u ? SDP_LC : note == 63u ? SDP_HC : note == 51u || note == 53u || note == 59u ? SDP_Y :
                note == 49u || note == 57u ? SDP_X : note == 41u || note == 43u || note == 45u ? SDP_LT : note == 47u || note == 48u || note == 50u ? SDP_HT : -1;
    sd_voice *v;
    sd_layer *L;
    if (piece < 0) return;
    if (a > 1.9f) a = 1.9f;
    pdb = (float)SD_PIECE_DB[kit % 11u][piece] * 0.5f;
    a *= sd_pow(10.0f, pdb / 20.0f);
    switch (piece) {
    case SDP_K: {                              /* 909: a sine body diving in pitch, a beater click (808: a slow, deep dive) */
        float dive = T->st == 3 ? T->kd * dk * 0.6f : (T->kd * dk * 0.35f < 0.12f ? T->kd * dk * 0.35f : 0.12f);
        v = sd_new(0.0f);
        sd_layer_add(v, SD_SINE, T->kf * tn, T->ke * tn, dive, 0.85f * a * T->kv, T->kd * dk);
        if (T->kc > 0.05f && (L = sd_layer_add(v, SD_NOISE, 0, 0, 0, 0.5f * a * T->kc, 0.012f)) != 0) sd_filter(L, 0, T->st == 1 ? 3200.0f : 5500.0f, SD_Q_DEF);
        break; }
    case SDP_S: {                              /* the snares' noise and the shell's body (brush: high-passed, airier) */
        v = sd_new(-0.10f + sd_jit(0.05f));
        if ((L = sd_layer_add(v, SD_NOISE, 0, 0, 0, 0.4f * a * T->sn, T->sd * dk)) != 0) sd_filter(L, T->st == 2 ? 1 : 2, T->sf * tn, T->st == 2 ? 0.7f : 1.1f);
        sd_layer_add(v, SD_TRI, T->sb * tn, T->sb * tn * 0.6f, T->sd * dk * 0.7f, 0.26f * a * (1.0f - T->sn * 0.6f), T->sd * dk * 0.8f);
        if (T->st == 5 && (L = sd_layer_add(v, SD_NOISE, 0, 0, 0, 0.32f * a, 0.007f)) != 0) sd_filter(L, 2, 3200.0f, 1.4f);   /* the stick */
        break; }
    case SDP_R:                                /* rim: a woody tick, a tiny pitched knock under it */
        v = sd_new(0.26f + sd_jit(0.07f));
        if ((L = sd_layer_add(v, SD_NOISE, 0, 0, 0, 0.3f * a, 0.028f)) != 0) sd_filter(L, 2, 2100.0f * tn, 2.4f);
        sd_layer_add(v, SD_TRI, 420.0f * tn, 210.0f * tn, 0.02f, 0.16f * a, 0.03f);
        break;
    case SDP_H: {                              /* the closed hat: metal and air under one envelope */
        float d = T->hd * dk, pan = 0.22f + sd_jit(0.12f);
        sd_choke();
        v = sd_new(pan); v->hat = 1;
        if (T->hm > 0.05f && (L = sd_layer_add(v, SD_NOISE, 0, 0, 0, 0.16f * a * T->hm * 0.5f, d)) != 0) {
            sd_metal(L, T->hf * 0.5f); sd_filter(L, 2, T->hf * 0.85f, 0.9f); sd_filter(L, 1, T->hf, SD_Q_DEF);
            sd_floor(L, 0.16f * a, 0.001f, d); }       /* (one envelope, 0.16 a -> 0.001, over both layers' own levels) */
        if ((L = sd_layer_add(v, SD_NOISE, 0, 0, 0, 0.16f * a * (1.0f - T->hm * 0.4f), d)) != 0) { sd_filter(L, 1, T->hf, SD_Q_DEF); sd_floor(L, 0.16f * a, 0.001f, d); }
        break; }
    case SDP_O: {                              /* the open hat: the same metal left to ring; the next hat chokes it */
        float d = (0.34f + T->hd * 2.0f) * dk;
        sd_choke();
        v = sd_new(0.24f + sd_jit(0.05f)); v->hat = 2;
        if ((L = sd_layer_add(v, SD_NOISE, 0, 0, 0, 0.05f * a * (0.5f + T->hm), d)) != 0) {
            sd_metal(L, T->hf * 0.5f); sd_filter(L, 2, T->hf * 0.85f, 0.7f); sd_filter(L, 1, T->hf * 0.92f, SD_Q_DEF); sd_floor(L, 0.05f * a * (0.5f + T->hm), 0.0006f, d); }
        if ((L = sd_layer_add(v, SD_NOISE, 0, 0, 0, 0.05f * a, d + 0.05f)) != 0) { sd_filter(L, 1, T->hf, SD_Q_DEF); sd_floor(L, 0.05f * a, 0.0006f, d + 0.05f); }
        break; }
    case SDP_Y: {                              /* the ride: a small bell tuned to the key, 880..1760 Hz, and the stick */
        float f0 = 440.0f * sd_pow(2.0f, (float)(((key_pc % 12) + 12) % 12 - 9) / 12.0f);
        static const float RL[3][3] = {{1, 0.034f, 0.085f}, {2, 0.011f, 0.045f}, {3, 0.005f, 0.028f}};
        uint32_t i;
        while (f0 < 880.0f) f0 *= 2.0f;
        while (f0 >= 1760.0f) f0 *= 0.5f;
        v = sd_new(-0.28f);
        for (i = 0; i < 3u; i++)
            if ((L = sd_layer_add(v, SD_SINE, f0 * RL[i][0], 0, 0, RL[i][1] * a * (i ? (a < 1.4f ? a : 1.4f) : 1.0f), -RL[i][2] * dk)) != 0) sd_attack(L, 0.002f);
        if ((L = sd_layer_add(v, SD_NOISE, 0, 0, 0, 0.014f * a, 0.008f)) != 0) { sd_filter(L, 1, 1800.0f, SD_Q_DEF); sd_filter(L, 0, 4200.0f, SD_Q_DEF); sd_floor(L, 0.014f * a, 0.0006f, 0.008f); }   /* the stick tip */
        break; }
    case SDP_X:                                /* the crash: metal and a long bright hiss */
        v = sd_new(0.34f);
        if ((L = sd_layer_add(v, SD_NOISE, 0, 0, 0, 0.06f * a, 1.7f * dk)) != 0) { sd_metal(L, 390.0f * T->cy); sd_filter(L, 2, 6200.0f * T->cy, 0.7f); sd_filter(L, 1, 3600.0f * T->cy, SD_Q_DEF); sd_floor(L, 0.06f * a, 0.0006f, 1.7f * dk); }
        if ((L = sd_layer_add(v, SD_NOISE, 0, 0, 0, 0.13f * a, 1.9f * dk)) != 0) { sd_filter(L, 1, 3800.0f * T->cy, SD_Q_DEF); sd_filter(L, 0, 12500.0f, SD_Q_DEF); sd_floor(L, 0.13f * a, 0.0006f, 1.9f * dk); }
        break;
    case SDP_LT: case SDP_HT: {                /* toms: a drumhead settling onto its note, its 1.59x mode, the stick */
        float f = (piece == SDP_LT ? 98.0f : 156.0f) * T->tm * tn, dur = (piece == SDP_LT ? 0.5f : 0.38f) * dk;
        v = sd_new(piece == SDP_LT ? -0.32f : 0.16f);
        sd_layer_add(v, SD_SINE, f * 1.45f, f, 0.07f, 0.5f * a, dur);
        sd_layer_add(v, SD_SINE, f * 1.59f * 1.3f, f * 1.59f, 0.06f, 0.16f * a, dur * 0.3f);
        if ((L = sd_layer_add(v, SD_NOISE, 0, 0, 0, 0.18f * a, 0.025f)) != 0) sd_filter(L, 2, 1100.0f, 0.8f);
        break; }
    case SDP_LC: case SDP_HC: {                /* congas: a skin slap and its "dow" */
        float f0 = (piece == SDP_HC ? 300.0f : 210.0f) * tn;
        v = sd_new((piece == SDP_HC ? -0.34f : 0.30f) + sd_jit(0.06f));
        sd_layer_add(v, SD_TRI, f0 * 1.18f, f0 * 0.68f, 0.10f, 0.55f * a, 0.17f * dk);
        if ((L = sd_layer_add(v, SD_NOISE, 0, 0, 0, 0.16f * a, 0.03f)) != 0) sd_filter(L, 2, f0 * 3.0f, 1.0f);
        break; }
    case SDP_CL:                               /* the clave: a 2.5 kHz ping that dies at once */
        v = sd_new(0.12f);
        if ((L = sd_layer_add(v, SD_SINE, 2500.0f * tn, 0, 0, 0.17f * a, 0.06f)) != 0) { L->gm = sd_pow(0.0008f / (0.17f * a + 1e-6f), 1.0f / (0.06f * SD_FS)); sd_attack(L, 0.0008f); }
        if ((L = sd_layer_add(v, SD_NOISE, 0, 0, 0, 0.1f * a, 0.008f)) != 0) sd_filter(L, 2, 3200.0f, 2.0f);
        break;
    }
}
/* render: every voice into dl / dr, float, the site's own scale (1.0 = full) */
/* one layer, a block: its source, its filters, its level (a block at a time, each step in a loop of its own) */
static float sd_tmp[CTL];
static void sd_layer_block(sd_layer *L, float *acc, uint32_t n)
{
    uint32_t i, k, m = n < L->sn ? n : L->sn;
    float g = L->g;
    if (L->type == SD_NOISE) for (i = 0; i < m; i++) sd_tmp[i] = sd_noise();
    else if (L->type == SD_METAL && L->mp >= 0) {     /* a hat: its harmonics */
        uint32_t np = sd_mp[L->mp].np;
        float *y1 = sd_mp[L->mp].y1, *y2 = sd_mp[L->mp].y2, *c2 = sd_mp[L->mp].c2;
        for (i = 0; i < m; i++) sd_tmp[i] = 0.0f;
        for (k = 0; k < np; k++) {
            float a = y1[k], b = y2[k], c = c2[k];
            for (i = 0; i < m; i++) { float y = c * a - b; b = a; a = y; sd_tmp[i] += y; }
            y1[k] = a; y2[k] = b;
        }
    } else if (L->type == SD_METAL) {                 /* the crash: six plain squares (at ~400 Hz their harmonics fall as 1 / n:
                                                       * what folds back over Nyquist is the 57th on, 35 dB down, and its band-
                                                       * pass keeps 3.6..6.2 kHz; the polyBLEP ones cost the crash's 2 s a
                                                       * frame rate of 10 in session.sh with a long decay) */
        for (i = 0; i < m; i++) sd_tmp[i] = 0.0f;
        for (k = 0; k < 6u; k++) {
            float p = L->ph[k], d = L->dph[k];
            for (i = 0; i < m; i++) { p += d; if (p >= 1.0f) p -= 1.0f; sd_tmp[i] += p < 0.5f ? 1.0f : -1.0f; }
            L->ph[k] = p;
        }
    } else {                                          /* a sine, a triangle, a square, its pitch falling */
        float p = L->ph[0], d = L->dph[0], fm = L->fmul;
        uint32_t fn = L->fn;
        for (i = 0; i < m; i++) {
            p += d; if (p >= 1.0f) p -= 1.0f;
            if (fn) { d *= fm; fn--; }
            sd_tmp[i] = L->type == SD_SINE ? sd_poly(p) : L->type == SD_TRI ? (p < 0.5f ? p * 4.0f - 1.0f : 3.0f - p * 4.0f) : (p < 0.5f ? 1.0f : -1.0f);
        }
        L->ph[0] = p; L->dph[0] = d; L->fn = fn;
    }
    for (k = 0; k < L->nf; k++) {
        sd_bq *q = &L->f[k];
        float b0 = q->b0, b1 = q->b1, b2 = q->b2, a1 = q->a1, a2 = q->a2, z1 = q->z1, z2 = q->z2;
        for (i = 0; i < m; i++) { float x = sd_tmp[i], y = b0 * x + z1; z1 = b1 * x - a1 * y + z2; z2 = b2 * x - a2 * y; sd_tmp[i] = y; }
        q->z1 = z1; q->z2 = z2;
    }
    if (L->att > 0.0f) {                              /* (an attack: the ride, the clave, a tick) */
        for (i = 0; i < m; i++) {
            acc[i] += sd_tmp[i] * g;
            if (L->att > 0.0f) { g += L->atk; L->att -= 1.0f; if (L->att <= 0.0f) g = L->tgt; }
            else if (L->rn) { g *= L->gm; L->rn--; }
        }
    } else {
        float gm = L->gm;
        uint32_t rn = L->rn;
        for (i = 0; i < m; i++) { acc[i] += sd_tmp[i] * g; if (rn) { g *= gm; rn--; } }
        L->rn = rn;
    }
    L->g = g; L->sn -= m;
    if (!L->sn || (g < 1e-6f && !L->rn)) {            /* stopped (its source's stop), or gone under hearing */
        if (L->type == SD_METAL && L->mp >= 0) sd_mp[L->mp].used = 0;
        L->type = SD_OFF;
    }
}
static float sd_vacc[CTL];
static void sd_render(float *dl, float *dr, uint32_t n)
{
    uint32_t vi, i, li, live;
    for (vi = 0; vi < SD_NV; vi++) {
        sd_voice *v = &sd_v[vi];
        float ch = 1.0f, pl, pr;
        if (!v->on) continue;
        for (i = 0; i < n; i++) sd_vacc[i] = 0.0f;
        live = 0;
        for (li = 0; li < SD_NL; li++) if (v->L[li].type != SD_OFF) { sd_layer_block(&v->L[li], sd_vacc, n); live = 1; }
        if (v->choke < 1.0f) {                        /* the open hat, choked */
            for (i = 0; i < n; i++) { ch *= v->choke; sd_vacc[i] *= ch; }
            for (li = 0; li < SD_NL; li++) v->L[li].g *= ch;
            if (ch < 0.001f) live = 0;
        }
        pl = v->pl; pr = v->pr;
        for (i = 0; i < n; i++) { dl[i] += sd_vacc[i] * pl; dr[i] += sd_vacc[i] * pr; }
        v->t += n;
        if (!live || v->t > v->life) sd_voice_free(v);
    }
}
/* the hits the audio interrupt (core 0) asked for this block, played by the drum render (core 1): handed over before the
 * render starts, so no lock (the job hand-over is the barrier) */
#define SD_Q 16u
static volatile uint8_t sd_qn;
static struct { uint8_t note; float a; } sd_q[SD_Q];
static void sd_queue_hit(uint32_t note, uint32_t vel) { if (sd_qn < SD_Q) { sd_q[sd_qn].note = (uint8_t)note; sd_q[sd_qn].a = (float)vel / 96.0f; sd_qn++; } }
/* the drum track's block (fx.c mix_drums, patch_sloop.py: after SLOOP's own drum voices, before the drum track's insert,
 * filter and the site's bus): the hits asked for, then every voice, at SD_K mix units for the site's 1.0 (+10 dB over
 * 0 dBFS: SLOOP's own kits peaked +2..+5 dBFS here, the site's -6..-16, so the insert and the filter see what they saw),
 * through the drum track's own LEVEL, mute / solo fade, PAN and reverb / delay sends exactly as SLOOP's drum voices go
 * (drums.c drums_mix), and the kit's trim (the site's KIT_DB). The site trims after its glue; here the glue's threshold is
 * measured on the trimmed kit (slime.c SD_GLUE_THR), which a compressor cannot tell apart. */
#define SD_K 103621.0f
static float sd_bl[CTL], sd_br[CTL];
static uint8_t sl_sd_on = 1;                 /* the site's drums (0: SLOOP's drum synth with the site's kit numbers, as before) */
static void sl_sd_block(int32_t *l, int32_t *r, int32_t *v, int32_t *d, uint32_t n)
{
    uint32_t i, q = sd_qn;
    if (!sl_sd_on || n > CTL) return;
    for (i = 0; i < q; i++) sd_hit(sd_q[i].note, sd_q[i].a, sl_band.kit, sl_root);
    sd_qn = 0;
    for (i = 0; i < n; i++) sd_bl[i] = sd_br[i] = 0.0f;
    sd_render(sd_bl, sd_br, n);
    {
        int32_t pan = trk[TRK_DRUM].p[P_PAN], gl = 4096 - (pan > 0 ? pan * 64 : 0), gr = 4096 + (pan < 0 ? pan * 64 : 0);
        float lvl = (float)expr_gain(song.g[G_DRLVL] * 200, TRK_DRUM) * (SD_K / 32767.0f) * sl_exp2((SD_KIT_DB[sl_band.kit % 11u] - SD_KIT_DB[0]) * 0.16609640f);   /* the kit's trim (KIT_DB, against pop's): the bus's threshold is measured on it */
        float sr = (float)send_thr(song.g[G_DRREV] * 258, thr_rev) / 32767.0f, sdl = (float)send_thr(song.g[G_DRDLY] * 258, thr_dly) / 32767.0f;
        float kl = lvl * (float)gl / 4096.0f, kr = lvl * (float)gr / 4096.0f;
        for (i = 0; i < n; i++) {
            float fade = (float)(32767 - drums.a0 - (((drums.a1 - drums.a0) * (int32_t)i) >> CTL_LOG2)) / 32767.0f;   /* mute / solo */
            float a = sd_bl[i] * fade, b = sd_br[i] * fade, m = (a + b) * 0.5f * lvl;
            l[i] += (int32_t)(a * kl); r[i] += (int32_t)(b * kr);
            if (sr > 0.0f) v[i] += (int32_t)(m * sr);
            if (sdl > 0.0f) d[i] += (int32_t)(m * sdl);
        }
    }
}

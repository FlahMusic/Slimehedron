//! One note. Oscillator (+ optional sub) → filter → envelope, exactly the chain `playSynth` builds.

use super::{Adsr, AdsrSettings, Biquad, FilterKind, Osc, Wave};
use crate::rng::Rng;

#[derive(Debug, Clone, Copy)]
pub struct VoiceSettings {
    pub wave: Wave,
    /// Sub oscillator level, 0..1. A triangle an octave down, as in the web app.
    pub sub: f32,
    pub filter: FilterKind,
    pub filter_on: bool,
    /// Cutoff 0..1, mapped to Hz by `cut_hz`.
    pub cut: f32,
    /// Resonance 0..1; the filter caps the resulting Q at 12.
    pub res: f32,
    /// Filter envelope amount 0..1 — the cutoff starts up here and falls to `cut` over A+D.
    pub fenv: f32,
    pub adsr: AdsrSettings,
}

impl Default for VoiceSettings {
    fn default() -> Self {
        Self {
            wave: Wave::Triangle,
            sub: 0.0,
            filter: FilterKind::Lowpass,
            filter_on: true,
            cut: 0.78,
            res: 0.0,
            fenv: 0.0,
            adsr: AdsrSettings::default(),
        }
    }
}

/// `cutHz` from the web app: a 0..1 knob mapped exponentially across the audible range.
pub fn cut_hz(cut: f32) -> f32 {
    let c = cut.clamp(0.0, 1.0);
    60.0 * (18_000.0f32 / 60.0).powf(c)
}

#[derive(Debug, Clone)]
pub struct Voice {
    sr: f32,
    osc: Osc,
    sub: Osc,
    filt: Biquad,
    env: Adsr,
    set: VoiceSettings,
    sub_level: f32,
    // pitch settle: the web app starts a note 2% sharp and slides onto pitch over 40ms, which is
    // what makes it read as a struck bubble rather than a beep
    target_hz: f32,
    settle_t: f32,
    settle_len: f32,
    // the filter envelope sweeps over attack+decay
    f_from: f32,
    f_to: f32,
    f_t: f32,
    f_len: f32,
    active: bool,
}

impl Voice {
    pub fn new(sr: f32) -> Self {
        Self {
            sr,
            osc: Osc::new(sr, Wave::Triangle),
            sub: Osc::new(sr, Wave::Triangle),
            filt: Biquad::new(sr),
            env: Adsr::new(sr),
            set: VoiceSettings::default(),
            sub_level: 0.0,
            target_hz: 440.0,
            settle_t: 0.0,
            settle_len: 0.04,
            f_from: 1000.0,
            f_to: 1000.0,
            f_t: 0.0,
            f_len: 0.1,
            active: false,
        }
    }

    pub fn is_active(&self) -> bool {
        self.active
    }

    /// Start a note.
    ///
    /// `vel` is 0..127. `imp` is impact 0..1 — how head-on the hit was; harder hits decay quicker
    /// and glow less, which is the raindrop model the web app uses. `firm` means a PERSON did this
    /// on purpose (a tap, a key, a lesson's question) and must never get the random quiet "dud"
    /// that the rain texture relies on.
    pub fn trigger(&mut self, freq: f32, vel: f32, imp: f32, firm: bool, s: VoiceSettings, rng: &mut Rng) {
        let freq = if freq.is_finite() && freq > 0.0 { freq } else { 440.0 };
        let vel = if vel.is_finite() { vel.clamp(0.0, 127.0) } else { 90.0 };
        let imp = imp.clamp(0.0, 1.0);
        self.set = s;

        // ~1 in 20 drops traps no bubble and comes out at 16% level. Lovely for rain. Fatal on a
        // note someone MEANT, so `firm` skips it.
        let dud = !firm && rng.next_f32() < 0.05;
        let ej = 0.85 + rng.next_f32() * 0.3; // per-hit envelope jitter, no two drops alike
        let shorten = 1.15 - imp * 0.4; // harder hits decay quicker

        let adsr = AdsrSettings {
            attack: (s.adsr.attack * ej).max(0.001),
            decay: (s.adsr.decay * ej * shorten).max(0.001),
            sustain: s.adsr.sustain.clamp(0.0001, 1.0),
            release: (s.adsr.release * ej * shorten).max(0.02),
            hold: s.adsr.hold,
        };

        let v = vel / 127.0;
        let peak = v * 0.42 * (if dud { 0.16 } else { 1.0 }) * (1.0 - imp * 0.18);

        self.osc.wave = s.wave;
        self.osc.set_phase(rng.next_f32());
        self.sub.wave = Wave::Triangle;
        self.sub.set_phase(rng.next_f32());
        self.sub_level = s.sub.clamp(0.0, 1.0) * 1.3;

        // ±4 cents of detune per note
        let detune = (rng.next_f32() * 8.0 - 4.0) / 100.0;
        self.target_hz = freq * 2f32.powf(detune / 12.0);
        self.settle_t = 0.0;
        self.settle_len = 0.04;

        let base = cut_hz(s.cut);
        let top = cut_hz((s.cut + s.fenv).min(1.0));
        self.f_from = if s.fenv > 0.0 { top } else { base };
        self.f_to = base;
        self.f_t = 0.0;
        self.f_len = (adsr.attack + adsr.decay).max(0.001);
        self.filt.reset();
        self.filt.set(s.filter, self.f_from, (s.res * 12.0).max(0.05));

        self.env.trigger(adsr, peak);
        self.active = true;
    }

    /// One sample.
    pub fn next(&mut self) -> f32 {
        if !self.active {
            return 0.0;
        }
        let dt = 1.0 / self.sr;

        // settle onto pitch: starts 2% sharp, exponential glide over 40ms
        self.settle_t = (self.settle_t + dt).min(self.settle_len);
        let k = self.settle_t / self.settle_len;
        let hz = self.target_hz * (1.02f32).powf(1.0 - k);
        self.osc.set_freq(hz);
        self.sub.set_freq(hz * 0.5);

        let mut x = self.osc.next();
        if self.sub_level > 0.0 {
            x += self.sub.next() * self.sub_level;
        }

        if self.set.filter_on {
            // retune the filter as the envelope sweeps; once per sample is cheap at these sizes
            self.f_t = (self.f_t + dt).min(self.f_len);
            let f = self.f_t / self.f_len;
            let hz = self.f_from + (self.f_to - self.f_from) * f;
            self.filt.set(self.set.filter, hz, (self.set.res * 12.0).max(0.05));
            x = self.filt.next(x);
        }

        let g = self.env.next();
        if !self.env.is_active() {
            self.active = false;
        }
        x * g
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rng::Rng;

    const SR: f32 = 48_000.0;

    fn render(freq: f32, vel: f32, firm: bool, s: VoiceSettings, seed: u64) -> Vec<f32> {
        let mut rng = Rng::new(seed);
        let mut v = Voice::new(SR);
        v.trigger(freq, vel, 0.5, firm, s, &mut rng);
        let mut out = Vec::new();
        for _ in 0..(SR as usize * 3) {
            out.push(v.next());
            if !v.is_active() {
                break;
            }
        }
        out
    }

    fn peak(v: &[f32]) -> f32 {
        v.iter().fold(0.0f32, |a, b| a.max(b.abs()))
    }

    #[test]
    fn a_note_makes_a_sound_and_then_stops() {
        let v = render(440.0, 100.0, true, VoiceSettings::default(), 1);
        assert!(peak(&v) > 0.05, "the voice was silent (peak {})", peak(&v));
        assert!(v.len() < SR as usize * 3, "the voice never ended");
        assert!(v.last().unwrap().abs() < 0.001, "it ended loud: {}", v.last().unwrap());
    }

    #[test]
    fn it_plays_the_pitch_it_was_given() {
        // measured by zero crossings, after the 40ms pitch settle has finished
        let s = VoiceSettings {
            adsr: AdsrSettings { attack: 0.01, decay: 0.01, sustain: 0.9, release: 0.1, hold: 1.0 },
            filter_on: false,
            ..VoiceSettings::default()
        };
        let v = render(440.0, 110.0, true, s, 7);
        let start = (SR * 0.1) as usize;
        let end = (SR * 1.0) as usize;
        let seg = &v[start..end.min(v.len())];
        let mut rising = 0usize;
        for w in seg.windows(2) {
            if w[0] < 0.0 && w[1] >= 0.0 {
                rising += 1;
            }
        }
        let hz = rising as f32 / (seg.len() as f32 / SR);
        // ±4 cents of detune is ±0.25Hz at 440; allow a couple of Hz for the window edges
        assert!((hz - 440.0).abs() < 3.0, "played {}Hz instead of 440", hz);
    }

    #[test]
    fn a_firm_note_is_never_a_whisper() {
        // THE BUG THIS EXISTS FOR. The dud (16% level) multiplied with a low velocity floor gave
        // about -44dB — silence to a child in a room — one deliberate tap in twenty. A person's
        // press cannot dud. Run enough seeds that a 5% chance would certainly show up.
        let s = VoiceSettings::default();
        let mut worst = f32::MAX;
        for seed in 0..200u64 {
            let p = peak(&render(440.0, 100.0, true, s, seed));
            worst = worst.min(p);
        }
        assert!(worst > 0.1, "a deliberate note came out at peak {}", worst);
    }

    #[test]
    fn a_bouncing_ball_still_can_dud() {
        // The rain texture depends on it, so it must still happen when firm is false.
        let s = VoiceSettings::default();
        let mut quietest = f32::MAX;
        for seed in 0..400u64 {
            quietest = quietest.min(peak(&render(440.0, 100.0, false, s, seed)));
        }
        assert!(quietest < 0.1, "no ball ever dudded; the rain model is gone (quietest {})", quietest);
    }

    #[test]
    fn louder_velocity_is_louder() {
        let s = VoiceSettings::default();
        let soft = peak(&render(440.0, 30.0, true, s, 3));
        let loud = peak(&render(440.0, 120.0, true, s, 3));
        assert!(loud > soft * 2.0, "velocity did nothing: {} vs {}", soft, loud);
    }

    #[test]
    fn the_sub_adds_an_octave_below() {
        let mut s = VoiceSettings::default();
        s.filter_on = false;
        s.adsr = AdsrSettings { attack: 0.01, decay: 0.01, sustain: 0.9, release: 0.1, hold: 0.5 };
        let dry = peak(&render(220.0, 100.0, true, s, 5));
        s.sub = 1.0;
        let wet = peak(&render(220.0, 100.0, true, s, 5));
        assert!(wet > dry, "the sub oscillator added nothing ({} vs {})", dry, wet);
    }

    #[test]
    fn a_closed_filter_actually_darkens_it() {
        let mut s = VoiceSettings::default();
        s.adsr = AdsrSettings { attack: 0.01, decay: 0.01, sustain: 0.9, release: 0.1, hold: 0.5 };
        s.wave = Wave::Sawtooth;
        s.cut = 1.0;
        let open = render(220.0, 110.0, true, s, 11);
        s.cut = 0.15;
        let shut = render(220.0, 110.0, true, s, 11);
        let hf = |v: &[f32]| v.windows(2).map(|w| (w[1] - w[0]).powi(2)).sum::<f32>();
        assert!(hf(&shut) < hf(&open) * 0.5, "closing the filter changed nothing");
    }

    #[test]
    fn nothing_it_produces_is_a_bad_number() {
        let s = VoiceSettings { cut: 2.0, res: 9.0, fenv: 5.0, sub: 3.0, ..VoiceSettings::default() };
        let v = render(0.0, f32::NAN, true, s, 2); // bad freq and velocity on purpose
        assert!(!v.is_empty());
        for x in &v {
            assert!(x.is_finite() && x.abs() < 4.0, "voice produced {}", x);
        }
    }
}

//! The envelope, shaped exactly like the one in `playSynth`.
//!
//! Not a textbook ADSR: the web app ramps LINEARLY to the peak and then linearly down to the
//! sustain level, holds for a time the caller gives it, and only the release is exponential. The
//! hold is the part that matters musically — it was a flat 0.05s once, which made a whole note and
//! a quarter note sound identical and left the note-duration lesson teaching nothing by ear.

#[derive(Debug, Clone, Copy)]
pub struct AdsrSettings {
    pub attack: f32,
    pub decay: f32,
    pub sustain: f32,
    pub release: f32,
    /// Seconds to SIT at the sustain level before the release starts.
    pub hold: f32,
}

impl Default for AdsrSettings {
    fn default() -> Self {
        Self { attack: 0.01, decay: 0.08, sustain: 0.5, release: 0.25, hold: 0.05 }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Stage {
    Idle,
    Attack,
    Decay,
    Hold,
    Release,
}

#[derive(Debug, Clone)]
pub struct Adsr {
    sr: f32,
    s: AdsrSettings,
    stage: Stage,
    level: f32,
    t: f32,
    peak: f32,
}

impl Adsr {
    pub fn new(sr: f32) -> Self {
        Self { sr, s: AdsrSettings::default(), stage: Stage::Idle, level: 0.0, t: 0.0, peak: 1.0 }
    }

    pub fn trigger(&mut self, s: AdsrSettings, peak: f32) {
        // Floors match the web app: attack and decay can never be zero (an instant ramp is a
        // click), release never shorter than 20ms, sustain never actually zero.
        self.s = AdsrSettings {
            attack: s.attack.max(0.001),
            decay: s.decay.max(0.001),
            sustain: s.sustain.clamp(0.0001, 1.0),
            release: s.release.max(0.02),
            hold: s.hold.max(0.05),
        };
        self.peak = peak;
        self.stage = Stage::Attack;
        self.level = 0.0;
        self.t = 0.0;
    }

    pub fn is_active(&self) -> bool {
        self.stage != Stage::Idle
    }

    pub fn next(&mut self) -> f32 {
        let dt = 1.0 / self.sr;
        match self.stage {
            Stage::Idle => return 0.0,
            Stage::Attack => {
                self.t += dt;
                let f = (self.t / self.s.attack).min(1.0);
                self.level = self.peak * f;
                if f >= 1.0 {
                    self.stage = Stage::Decay;
                    self.t = 0.0;
                }
            }
            Stage::Decay => {
                self.t += dt;
                let f = (self.t / self.s.decay).min(1.0);
                self.level = self.peak * (1.0 - f * (1.0 - self.s.sustain));
                if f >= 1.0 {
                    self.stage = Stage::Hold;
                    self.t = 0.0;
                }
            }
            Stage::Hold => {
                self.t += dt;
                self.level = self.peak * self.s.sustain;
                if self.t >= self.s.hold {
                    self.stage = Stage::Release;
                    self.t = 0.0;
                }
            }
            Stage::Release => {
                self.t += dt;
                // exponential to 0.0001 over the release time, same as the web app's
                // exponentialRampToValueAtTime target
                let f = (self.t / self.s.release).min(1.0);
                let start = self.peak * self.s.sustain;
                self.level = start * (0.0001f32 / start.max(1e-6)).powf(f);
                if f >= 1.0 {
                    self.stage = Stage::Idle;
                    self.level = 0.0;
                }
            }
        }
        self.level
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SR: f32 = 48_000.0;

    fn run(s: AdsrSettings) -> Vec<f32> {
        let mut e = Adsr::new(SR);
        e.trigger(s, 1.0);
        let mut v = Vec::new();
        for _ in 0..(SR as usize * 4) {
            v.push(e.next());
            if !e.is_active() {
                break;
            }
        }
        v
    }

    #[test]
    fn it_rises_holds_and_falls_to_silence() {
        let s = AdsrSettings { attack: 0.05, decay: 0.05, sustain: 0.5, release: 0.1, hold: 0.2 };
        let v = run(s);
        let peak_at = (0.05 * SR) as usize;
        assert!((v[peak_at] - 1.0).abs() < 0.02, "did not reach the peak: {}", v[peak_at]);
        let sustain_at = (0.05 * SR + 0.05 * SR + 0.1 * SR) as usize;
        assert!((v[sustain_at] - 0.5).abs() < 0.02, "sustain was {}", v[sustain_at]);
        assert!(*v.last().unwrap() < 0.01, "it never got quiet: {}", v.last().unwrap());
    }

    #[test]
    fn hold_actually_changes_the_length() {
        // The bug this exists to prevent: a whole note and a quarter note sounding identical.
        let short = run(AdsrSettings { hold: 0.05, ..AdsrSettings::default() }).len();
        let long = run(AdsrSettings { hold: 1.0, ..AdsrSettings::default() }).len();
        let diff = long as f32 - short as f32;
        assert!(
            (diff - 0.95 * SR).abs() < SR * 0.05,
            "a 0.95s longer hold made the note {}s longer",
            diff / SR
        );
    }

    #[test]
    fn a_zero_attack_does_not_click() {
        // asking for 0 gets the floor, not an instant jump
        let v = run(AdsrSettings { attack: 0.0, ..AdsrSettings::default() });
        assert!(v[0] < 0.9, "the envelope jumped straight to full on sample 0: {}", v[0]);
    }

    #[test]
    fn it_is_monotonic_where_it_should_be() {
        let s = AdsrSettings { attack: 0.1, decay: 0.1, sustain: 0.4, release: 0.2, hold: 0.1 };
        let v = run(s);
        let a_end = (0.1 * SR) as usize;
        for w in v[..a_end].windows(2) {
            assert!(w[1] >= w[0] - 1e-6, "attack went backwards");
        }
        let r_start = v.len() - (0.2 * SR) as usize;
        for w in v[r_start..].windows(2) {
            assert!(w[1] <= w[0] + 1e-6, "release went up");
        }
    }

    #[test]
    fn every_sample_is_a_real_number() {
        for s in [
            AdsrSettings { attack: 0.0, decay: 0.0, sustain: 0.0, release: 0.0, hold: 0.0 },
            AdsrSettings { attack: 1e9, decay: 1e9, sustain: 2.0, release: 1e9, hold: 1e9 },
        ] {
            let mut e = Adsr::new(SR);
            e.trigger(s, 1.0);
            for _ in 0..10_000 {
                let x = e.next();
                assert!(x.is_finite() && (0.0..=1.01).contains(&x), "envelope produced {}", x);
            }
        }
    }
}

//! Oscillator. Naive shapes with PolyBLEP on the discontinuous ones.
//!
//! Web Audio's OscillatorNode is band-limited, so a saw from the browser has no aliasing. A naive
//! saw in a plugin does, and it is the single most obvious "this sounds cheap" tell. PolyBLEP is
//! the cheapest fix that actually works: it rounds the corner of each discontinuity by exactly the
//! amount that cancels the aliasing.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Wave {
    Sine,
    Triangle,
    Sawtooth,
    Square,
}

impl Wave {
    pub fn from_id(s: &str) -> Wave {
        match s {
            "triangle" => Wave::Triangle,
            "sawtooth" | "saw" => Wave::Sawtooth,
            "square" => Wave::Square,
            _ => Wave::Sine,
        }
    }
}

#[derive(Debug, Clone)]
pub struct Osc {
    phase: f32, // 0..1
    inc: f32,
    sr: f32,
    pub wave: Wave,
}

/// PolyBLEP correction at a discontinuity. `t` is phase 0..1, `dt` is the phase increment.
fn poly_blep(t: f32, dt: f32) -> f32 {
    if t < dt {
        let x = t / dt;
        x + x - x * x - 1.0
    } else if t > 1.0 - dt {
        let x = (t - 1.0) / dt;
        x * x + x + x + 1.0
    } else {
        0.0
    }
}

impl Osc {
    pub fn new(sr: f32, wave: Wave) -> Self {
        Self { phase: 0.0, inc: 0.0, sr, wave }
    }

    pub fn set_freq(&mut self, hz: f32) {
        self.inc = (hz / self.sr).clamp(0.0, 0.5);
    }

    /// Start somewhere other than zero. Every voice starting at phase 0 makes stacked notes click
    /// together on the attack.
    pub fn set_phase(&mut self, p: f32) {
        self.phase = p.rem_euclid(1.0);
    }

    pub fn next(&mut self) -> f32 {
        let t = self.phase;
        let dt = self.inc;
        let out = match self.wave {
            Wave::Sine => (t * std::f32::consts::TAU).sin(),
            Wave::Triangle => {
                // integrate a square for a band-limited-ish triangle; the naive version is already
                // gentle enough that the extra cost is not worth it at these pitches
                4.0 * (t - 0.5).abs() - 1.0
            }
            Wave::Sawtooth => {
                let naive = 2.0 * t - 1.0;
                naive - poly_blep(t, dt)
            }
            Wave::Square => {
                let naive = if t < 0.5 { 1.0 } else { -1.0 };
                naive + poly_blep(t, dt) - poly_blep((t + 0.5).rem_euclid(1.0), dt)
            }
        };
        self.phase += dt;
        if self.phase >= 1.0 {
            self.phase -= 1.0;
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SR: f32 = 48_000.0;

    /// Count zero crossings to measure the frequency actually produced — not "the setter ran".
    fn measured_hz(wave: Wave, hz: f32) -> f32 {
        let mut o = Osc::new(SR, wave);
        o.set_freq(hz);
        let n = SR as usize; // one second
        let mut prev = o.next();
        let mut rising = 0usize;
        for _ in 1..n {
            let s = o.next();
            if prev < 0.0 && s >= 0.0 {
                rising += 1;
            }
            prev = s;
        }
        rising as f32
    }

    #[test]
    fn every_shape_runs_at_the_frequency_it_was_given() {
        for w in [Wave::Sine, Wave::Triangle, Wave::Sawtooth, Wave::Square] {
            let got = measured_hz(w, 440.0);
            assert!((got - 440.0).abs() <= 1.0, "{:?} ran at {}Hz, not 440", w, got);
        }
    }

    #[test]
    fn output_stays_inside_the_rails() {
        // A voice that leaves this range will clip the master before the limiter ever sees it.
        for w in [Wave::Sine, Wave::Triangle, Wave::Sawtooth, Wave::Square] {
            let mut o = Osc::new(SR, w);
            o.set_freq(220.0);
            for _ in 0..(SR as usize / 10) {
                let s = o.next();
                assert!(s.is_finite() && s.abs() <= 1.2, "{:?} produced {}", w, s);
            }
        }
    }

    #[test]
    fn the_saw_is_band_limited() {
        // The point of PolyBLEP. Play a high saw and compare the energy above Nyquist/2 against a
        // naive saw: aliasing folds down as loud junk, so the corrected one must be quieter up there.
        let hz = 4000.0;
        let n = 4096usize;
        let mut blep = Osc::new(SR, Wave::Sawtooth);
        blep.set_freq(hz);
        let corrected: Vec<f32> = (0..n).map(|_| blep.next()).collect();

        let mut phase = 0.0f32;
        let inc = hz / SR;
        let naive: Vec<f32> = (0..n)
            .map(|_| {
                let s = 2.0 * phase - 1.0;
                phase += inc;
                if phase >= 1.0 { phase -= 1.0; }
                s
            })
            .collect();

        // crude high-band energy: first difference emphasises high frequencies
        let hf = |v: &[f32]| -> f32 {
            v.windows(2).map(|w| (w[1] - w[0]).powi(2)).sum::<f32>() / (v.len() as f32)
        };
        let (a, b) = (hf(&corrected), hf(&naive));
        assert!(a < b, "polyblep saw was not smoother than the naive one ({} vs {})", a, b);
    }
}

//! Biquad filter — RBJ cookbook coefficients, the same maths BiquadFilterNode uses.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FilterKind {
    Lowpass,
    Highpass,
    Bandpass,
}

impl FilterKind {
    pub fn from_id(s: &str) -> FilterKind {
        match s {
            "highpass" => FilterKind::Highpass,
            "bandpass" => FilterKind::Bandpass,
            _ => FilterKind::Lowpass,
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct Biquad {
    b0: f32, b1: f32, b2: f32, a1: f32, a2: f32,
    z1: f32, z2: f32,
    sr: f32,
}

impl Biquad {
    pub fn new(sr: f32) -> Self {
        let mut f = Self { sr, ..Default::default() };
        f.set(FilterKind::Lowpass, sr * 0.25, 0.707);
        f
    }

    pub fn set(&mut self, kind: FilterKind, cutoff_hz: f32, q: f32) {
        // Clamp hard. The web app caps resonance at Q=12 and calls it "kid-safe: can never scream
        // or squeal" — that cap is a product decision, not a numerical one, so it comes along.
        let q = q.clamp(0.05, 12.0);
        let nyq = self.sr * 0.5;
        let f0 = cutoff_hz.clamp(10.0, nyq * 0.99);
        let w0 = std::f32::consts::TAU * f0 / self.sr;
        let (sin_w0, cos_w0) = w0.sin_cos();
        let alpha = sin_w0 / (2.0 * q);

        let (b0, b1, b2, a0, a1, a2) = match kind {
            FilterKind::Lowpass => {
                let b1 = 1.0 - cos_w0;
                (b1 * 0.5, b1, b1 * 0.5, 1.0 + alpha, -2.0 * cos_w0, 1.0 - alpha)
            }
            FilterKind::Highpass => {
                let b1 = -(1.0 + cos_w0);
                ((1.0 + cos_w0) * 0.5, b1, (1.0 + cos_w0) * 0.5, 1.0 + alpha, -2.0 * cos_w0, 1.0 - alpha)
            }
            FilterKind::Bandpass => {
                // constant 0dB peak gain, which is what Web Audio's bandpass does
                (alpha, 0.0, -alpha, 1.0 + alpha, -2.0 * cos_w0, 1.0 - alpha)
            }
        };
        self.b0 = b0 / a0;
        self.b1 = b1 / a0;
        self.b2 = b2 / a0;
        self.a1 = a1 / a0;
        self.a2 = a2 / a0;
    }

    pub fn reset(&mut self) {
        self.z1 = 0.0;
        self.z2 = 0.0;
    }

    #[inline]
    pub fn next(&mut self, x: f32) -> f32 {
        // transposed direct form II: one multiply-add chain, no history array
        let y = self.b0 * x + self.z1;
        self.z1 = self.b1 * x - self.a1 * y + self.z2;
        self.z2 = self.b2 * x - self.a2 * y;
        y
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SR: f32 = 48_000.0;

    /// RMS of a sine at `hz` after passing through the filter, relative to its RMS going in.
    /// This measures what the filter DOES, not that it ran.
    fn gain_at(kind: FilterKind, cutoff: f32, q: f32, hz: f32) -> f32 {
        let mut f = Biquad::new(SR);
        f.set(kind, cutoff, q);
        let n = 24_000usize;
        let mut phase = 0.0f32;
        let inc = std::f32::consts::TAU * hz / SR;
        let mut sum_in = 0.0f32;
        let mut sum_out = 0.0f32;
        for i in 0..n {
            let x = phase.sin();
            phase += inc;
            let y = f.next(x);
            if i > n / 4 {
                // let the filter settle before measuring
                sum_in += x * x;
                sum_out += y * y;
            }
        }
        (sum_out / sum_in).sqrt()
    }

    #[test]
    fn a_lowpass_passes_low_and_stops_high() {
        let below = gain_at(FilterKind::Lowpass, 1000.0, 0.707, 100.0);
        let above = gain_at(FilterKind::Lowpass, 1000.0, 0.707, 10_000.0);
        assert!(below > 0.9, "a lowpass ate the low end (gain {})", below);
        assert!(above < 0.05, "a lowpass let 10kHz through (gain {})", above);
        assert!(below > above * 10.0);
    }

    #[test]
    fn a_highpass_does_the_opposite() {
        let below = gain_at(FilterKind::Highpass, 1000.0, 0.707, 100.0);
        let above = gain_at(FilterKind::Highpass, 1000.0, 0.707, 10_000.0);
        assert!(above > 0.9, "a highpass ate the top (gain {})", above);
        assert!(below < 0.05, "a highpass let 100Hz through (gain {})", below);
    }

    #[test]
    fn a_bandpass_keeps_the_middle() {
        let at = gain_at(FilterKind::Bandpass, 1000.0, 2.0, 1000.0);
        let low = gain_at(FilterKind::Bandpass, 1000.0, 2.0, 60.0);
        let high = gain_at(FilterKind::Bandpass, 1000.0, 2.0, 16_000.0);
        assert!(at > 0.8, "bandpass did not pass its own centre (gain {})", at);
        assert!(low < 0.2 && high < 0.2, "bandpass skirts too wide ({} / {})", low, high);
    }

    #[test]
    fn cutoff_is_about_minus_three_db_at_the_corner() {
        let g = gain_at(FilterKind::Lowpass, 1000.0, 0.707, 1000.0);
        assert!((g - 0.707).abs() < 0.06, "corner gain was {} not ~0.707", g);
    }

    #[test]
    fn resonance_cannot_scream() {
        // The web app caps Q at 12 "kid-safe: can never scream or squeal". Ask for 100 and the
        // filter must still be sane.
        let g = gain_at(FilterKind::Lowpass, 1000.0, 100.0, 1000.0);
        assert!(g.is_finite() && g < 15.0, "resonance ran away: gain {}", g);
    }

    #[test]
    fn it_never_produces_a_bad_number() {
        let mut f = Biquad::new(SR);
        for (k, c, q) in [
            (FilterKind::Lowpass, 0.0, 0.0),
            (FilterKind::Highpass, 1e9, 1e9),
            (FilterKind::Bandpass, -5.0, -1.0),
        ] {
            f.set(k, c, q);
            f.reset();
            for i in 0..1000 {
                let y = f.next(if i % 2 == 0 { 1.0 } else { -1.0 });
                assert!(y.is_finite(), "filter produced {} for kind {:?}", y, k);
            }
        }
    }
}

//! Scale tables, lifted verbatim from the web app's `SCALES` object.
//!
//! Everything is in CENTS, not semitones, on purpose: five of these scales are microtonal
//! (the two maqams, neutral7, slendro, 19-EDO) and a semitone-based table cannot hold them.
//! The web app has always been cents-based and MPE exists so external synths get the true
//! pitch; the port keeps that rather than rounding the world to 12.

#[derive(Debug, Clone, Copy)]
pub struct Scale {
    pub id: &'static str,
    pub name: &'static str,
    /// Cents above the tonic, one entry per degree.
    pub cents: &'static [f32],
}

pub static SCALES: &[Scale] = &[
    Scale { id: "chromatic", name: "Chromatic", cents: &[0.0, 100.0, 200.0, 300.0, 400.0, 500.0, 600.0, 700.0, 800.0, 900.0, 1000.0, 1100.0] },
    Scale { id: "major", name: "Major (Ionian)", cents: &[0.0, 200.0, 400.0, 500.0, 700.0, 900.0, 1100.0] },
    Scale { id: "minor", name: "Natural Minor", cents: &[0.0, 200.0, 300.0, 500.0, 700.0, 800.0, 1000.0] },
    Scale { id: "dorian", name: "Dorian", cents: &[0.0, 200.0, 300.0, 500.0, 700.0, 900.0, 1000.0] },
    Scale { id: "phrygian", name: "Phrygian", cents: &[0.0, 100.0, 300.0, 500.0, 700.0, 800.0, 1000.0] },
    Scale { id: "lydian", name: "Lydian", cents: &[0.0, 200.0, 400.0, 600.0, 700.0, 900.0, 1100.0] },
    Scale { id: "mixolydian", name: "Mixolydian", cents: &[0.0, 200.0, 400.0, 500.0, 700.0, 900.0, 1000.0] },
    Scale { id: "locrian", name: "Locrian", cents: &[0.0, 100.0, 300.0, 500.0, 600.0, 800.0, 1000.0] },
    Scale { id: "pentaMaj", name: "Major Pentatonic", cents: &[0.0, 200.0, 400.0, 700.0, 900.0] },
    Scale { id: "pentaMin", name: "Minor Pentatonic", cents: &[0.0, 300.0, 500.0, 700.0, 1000.0] },
    Scale { id: "blues", name: "Blues", cents: &[0.0, 300.0, 500.0, 600.0, 700.0, 1000.0] },
    Scale { id: "harmMin", name: "Harmonic Minor", cents: &[0.0, 200.0, 300.0, 500.0, 700.0, 800.0, 1100.0] },
    Scale { id: "melMin", name: "Melodic Minor", cents: &[0.0, 200.0, 300.0, 500.0, 700.0, 900.0, 1100.0] },
    Scale { id: "wholeTone", name: "Whole Tone", cents: &[0.0, 200.0, 400.0, 600.0, 800.0, 1000.0] },
    Scale { id: "hirajoshi", name: "Hirajoshi (Japan)", cents: &[0.0, 200.0, 300.0, 700.0, 800.0] },
    Scale { id: "inSen", name: "In Sen (Japan)", cents: &[0.0, 100.0, 500.0, 700.0, 1000.0] },
    Scale { id: "iwato", name: "Iwato (Japan)", cents: &[0.0, 100.0, 500.0, 600.0, 1000.0] },
    Scale { id: "hijaz", name: "Hijaz (Arabic)", cents: &[0.0, 100.0, 400.0, 500.0, 700.0, 800.0, 1000.0] },
    Scale { id: "bhairav", name: "Bhairav (India)", cents: &[0.0, 100.0, 400.0, 500.0, 700.0, 800.0, 1100.0] },
    Scale { id: "maqamRast", name: "Maqam Rast ¼-tone", cents: &[0.0, 200.0, 350.0, 500.0, 700.0, 900.0, 1050.0] },
    Scale { id: "maqamBayati", name: "Maqam Bayati ¼-tone", cents: &[0.0, 150.0, 300.0, 500.0, 700.0, 800.0, 1000.0] },
    Scale { id: "slendro", name: "Slendro (5-EDO ~Java)", cents: &[0.0, 240.0, 480.0, 720.0, 960.0] },
    Scale { id: "pelog", name: "Pelog (Java approx)", cents: &[0.0, 120.0, 270.0, 540.0, 670.0, 785.0, 1050.0] },
    Scale { id: "neutral7", name: "Neutral 7 (¼-tones)", cents: &[0.0, 150.0, 300.0, 450.0, 600.0, 750.0, 900.0] },
    Scale { id: "edo19", name: "19-EDO Major", cents: &[0.0, 189.0, 379.0, 505.0, 695.0, 884.0, 1074.0] },
    Scale { id: "edo19all", name: "19-EDO, all 19", cents: &[0.0, 63.16, 126.32, 189.47, 252.63, 315.79, 378.95, 442.11, 505.26, 568.42, 631.58, 694.74, 757.89, 821.05, 884.21, 947.37, 1010.53, 1073.68, 1136.84] },
    Scale { id: "edo24", name: "24-EDO ¼-tones, all 24", cents: &[0.0, 50.0, 100.0, 150.0, 200.0, 250.0, 300.0, 350.0, 400.0, 450.0, 500.0, 550.0, 600.0, 650.0, 700.0, 750.0, 800.0, 850.0, 900.0, 950.0, 1000.0, 1050.0, 1100.0, 1150.0] },
    Scale { id: "edo31", name: "31-EDO, all 31", cents: &[0.0, 38.71, 77.42, 116.13, 154.84, 193.55, 232.26, 270.97, 309.68, 348.39, 387.1, 425.81, 464.52, 503.23, 541.94, 580.65, 619.35, 658.06, 696.77, 735.48, 774.19, 812.9, 851.61, 890.32, 929.03, 967.74, 1006.45, 1045.16, 1083.87, 1122.58, 1161.29] },
];

pub fn by_id(id: &str) -> Option<&'static Scale> {
    SCALES.iter().find(|s| s.id == id)
}

impl Scale {
    pub fn degrees(&self) -> usize { self.cents.len() }

    /// Cents for a degree, wrapping into higher octaves the same way `centsForDegree` does.
    pub fn cents_for_degree(&self, deg: i32) -> f32 {
        let n = self.cents.len() as i32;
        if n == 0 { return 0.0; }
        let oct = deg.div_euclid(n);
        let i = deg.rem_euclid(n) as usize;
        self.cents[i] + 1200.0 * oct as f32
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_scale_starts_on_the_tonic_and_climbs() {
        for s in SCALES {
            assert_eq!(s.cents[0], 0.0, "{} does not start at 0 cents", s.id);
            for w in s.cents.windows(2) {
                assert!(w[1] > w[0], "{} is not in ascending order", s.id);
            }
            assert!(*s.cents.last().unwrap() < 1200.0, "{} reaches or passes the octave", s.id);
        }
    }

    #[test]
    fn the_microtonal_ones_really_are_microtonal() {
        // If these ever round to whole semitones the port has quietly thrown away the thing
        // that makes them those scales.
        for id in ["maqamRast", "maqamBayati", "neutral7", "slendro", "edo19", "edo19all", "edo24", "edo31"] {
            let s = by_id(id).expect(id);
            let off_grid = s.cents.iter().any(|c| (c % 100.0).abs() > 1.0);
            assert!(off_grid, "{} has no quarter-tones left in it", id);
        }
    }

    #[test]
    fn major_is_the_major_scale() {
        let s = by_id("major").unwrap();
        assert_eq!(s.cents, &[0.0, 200.0, 400.0, 500.0, 700.0, 900.0, 1100.0]);
    }

    #[test]
    fn degrees_wrap_into_the_next_octave() {
        let s = by_id("major").unwrap();
        assert_eq!(s.cents_for_degree(0), 0.0);
        assert_eq!(s.cents_for_degree(7), 1200.0);
        assert_eq!(s.cents_for_degree(8), 1400.0);
        assert_eq!(s.cents_for_degree(-1), -100.0); // ti below the tonic
    }
}

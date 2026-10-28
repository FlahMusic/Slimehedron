//! A scale's home chord, in any tuning. Ported from the web app's `dyadWeight` / `chordDegrees`.
//!
//! "Degrees 0, 2 and 4" is a 12-notes-per-octave assumption: in a 5-note gamelan scale or a quarter-tone maqam it
//! picks three arbitrary notes. So every interval is scored against small whole-number ratios (the simpler the
//! ratio the stronger the pull, weighted 1/sqrt(n*d), smeared with a 15-cent gaussian), and the home chord is the
//! tonic plus the best-scoring degrees that sit far enough apart to read as a chord and not a cluster.

const RATIOS: [(u32, u32); 33] = [
    (1, 1), (16, 15), (12, 11), (11, 10), (10, 9), (9, 8), (8, 7), (7, 6), (13, 11), (6, 5), (11, 9), (16, 13), (5, 4),
    (9, 7), (13, 10), (4, 3), (11, 8), (7, 5), (10, 7), (16, 11), (3, 2), (14, 9), (11, 7), (8, 5), (13, 8), (18, 11),
    (5, 3), (12, 7), (7, 4), (16, 9), (11, 6), (15, 8), (2, 1),
];

/// How consonant an interval above the tonic is, 0..1.
pub fn dyad_weight(cents: f64) -> f64 {
    let x = cents.rem_euclid(1200.0);
    let mut best = 0.0f64;
    for &(n, d) in RATIOS.iter() {
        let c = 1200.0 * (n as f64 / d as f64).log2();
        let w = 1.0 / ((n * d) as f64).sqrt();
        let dd = (x - c).abs().min((x - c + 1200.0).abs()).min((x - c - 1200.0).abs());
        if dd > 60.0 { continue; }
        let v = w * (-(dd * dd) / 450.0).exp();
        if v > best { best = v; }
    }
    best
}

/// The home chord as scale-degree offsets (0..len-1), sorted. Up to three of them; the tonic is always in.
/// Returns how many were written into `out`.
pub fn home_chord(scale_cents: &[f32], out: &mut [usize; 3]) -> usize {
    let len = scale_cents.len().min(32);
    if len == 0 { out[0] = 0; return 1; }
    // rank by weight, highest first; a stable sort, like the web's Array.sort on the same keys
    let mut idx = [0usize; 32];
    let mut w = [0f64; 32];
    let mut x = [0f64; 32];
    for i in 0..len { idx[i] = i; w[i] = dyad_weight(scale_cents[i] as f64); x[i] = (scale_cents[i] as f64).rem_euclid(1200.0); }
    // insertion sort (stable) on weight, descending
    for i in 1..len { let mut j = i; while j > 0 && w[idx[j - 1]] < w[idx[j]] { idx.swap(j - 1, j); j -= 1; } }
    let mut picked = [0usize; 3];
    let mut n = 1; picked[0] = 0;
    for gap in [230.0, 150.0] {
        for &r in idx[..len].iter() {
            if n >= 3 { break; }
            if picked[..n].contains(&r) { continue; }
            let spaced = picked[..n].iter().all(|&p| { let d = (x[r] - x[p]).abs(); d.min(1200.0 - d) >= gap });
            if spaced { picked[n] = r; n += 1; }
        }
        if n >= 3 { break; }
    }
    picked[..n].sort_unstable();
    out[..n].copy_from_slice(&picked[..n]);
    n
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::music::scales::by_id;

    fn chord(id: &str) -> Vec<usize> { let mut o = [0; 3]; let n = home_chord(by_id(id).unwrap().cents, &mut o); o[..n].to_vec() }

    #[test]
    fn twelve_tone_scales_get_their_triad() {
        // the web app's own check: every 12-TET scale returns the triad it always had
        assert_eq!(chord("major"), vec![0, 2, 4]);
        assert_eq!(chord("minor"), vec![0, 2, 4]);
        assert_eq!(chord("pentaMaj"), vec![0, 2, 3]); // C E G in C D E G A
    }

    #[test]
    fn a_maqam_gets_its_neutral_third() {
        // rast: 0 200 350 500 700 ... -> tonic, the 350-cent neutral third, the fifth
        assert_eq!(chord("maqamRast"), vec![0, 2, 4]);
    }

    #[test]
    fn matches_the_web_app_on_every_kind_of_scale() {
        // read off the web app's chordDegrees() on 2026-10-28
        for (id, want) in [("iwato", vec![0, 2, 4]), ("wholeTone", vec![0, 2, 4]), ("slendro", vec![0, 3, 4]),
                           ("chromatic", vec![0, 4, 7]), ("blues", vec![0, 1, 4]), ("hirajoshi", vec![0, 2, 3])] {
            assert_eq!(chord(id), want, "{}", id);
        }
    }
}

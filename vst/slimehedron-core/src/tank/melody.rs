//! The auto-notes melody: the web app's singing line (`nextMelodyDeg`, `noDrone`, `setDeg`), ported number for
//! number. A 4-bar question, a 4-bar answer, an arch over each, strong beats on chord tones, weak beats on passing
//! steps, a leap that resolves, a motif echoed in the answer, and two guards: no note three times, no a-b-a-b trill.
//!
//! The random numbers come in through `rand`, so the tank feeds it its seeded `Rng` and a test can replay the web
//! app's own stream (`melody_golden.txt`, written by `_dev/dev-vstmelody.js`) and get the same notes back.

/// The singer's memory between notes (the web's `_melDeg`, `_melStep16`, `_melMotif`, ...). Fixed-size: no allocation.
#[derive(Debug, Clone)]
pub struct Melody {
    deg: Option<i32>,
    last_leap: i32,
    step16: u64,
    contour: i32,
    motif: [i32; 8],
    motif_n: usize,
    prev: Option<i32>,
    run: u32,
    hist: [i32; 8],
    hist_n: usize,
}

impl Default for Melody {
    fn default() -> Self { Melody::new() }
}

impl Melody {
    pub fn new() -> Self {
        Melody { deg: None, last_leap: 0, step16: 0, contour: 1, motif: [0; 8], motif_n: 0, prev: None, run: 0, hist: [0; 8], hist_n: 0 }
    }

    /// Clamp AND write back, and turn the line around when it hits the floor or the ceiling.
    fn set_deg(&mut self, mut d: i32, lo: i32, hi: i32) -> i32 {
        if d < lo { d = lo + 1; self.contour = 1; } else if d > hi { d = hi - 1; self.contour = -1; }
        self.deg = Some(d);
        d
    }

    /// The drone and trill guards.
    fn no_drone(&mut self, mut d: i32, lo: i32, hi: i32, mid: i32) -> i32 {
        if Some(d) == self.prev {
            self.run += 1;
            if self.run >= 2 { d = self.set_deg(d + if d > mid { -1 } else { 1 }, lo, hi); self.run = 0; }
        } else { self.run = 0; }
        let n = self.hist_n;
        let h = &self.hist;
        if n >= 3 && d == h[n - 2] && h[n - 1] == h[n - 3] && d != h[n - 1] {
            d = self.set_deg(d + if d > mid { -2 } else { 2 }, lo, hi); // a-b-a-b caught at the third a: skip out of it
        }
        if self.hist_n == 8 { self.hist.copy_within(1..8, 0); self.hist_n = 7; }
        self.hist[self.hist_n] = d;
        self.hist_n += 1;
        self.prev = Some(d);
        d
    }

    /// The next note, as a scale degree across all octaves. `n` is the scale's length, `root` the chord's root degree.
    pub fn next_deg(&mut self, strong: bool, n: i32, root: i32, rand: &mut impl FnMut() -> f64) -> i32 {
        self.deg.get_or_insert(n + root); // start in the middle octave, on the tonic
        let center = n + root;
        let lo = center - js_round(n as f64 * 0.8);
        let hi = center + js_round(n as f64 * 0.9);
        let chord = [root, (root + 2) % n, (root + 4) % n];
        let pos = (self.step16 % 32) as i32;
        let phrase = (self.step16 / 32) % 2; // 0 = question, 1 = answer
        self.step16 += 1;
        let peak = (hi - 1).min(center + js_round(n as f64 * 0.6));
        let t_arc = if pos < 20 { pos as f64 / 20.0 } else { (1.0 - (pos - 20) as f64 / 12.0).max(0.0) };
        let aim = js_round(center as f64 + (peak - center) as f64 * t_arc);
        let d0 = self.deg.unwrap();
        if d0 < aim { self.contour = 1; } else if d0 > aim { self.contour = -1; }
        // cadence: the answer walks home to the tonic, the question to the 5th, paced to land on the last step
        if pos >= 24 {
            let target = if phrase == 1 { center } else { center + (chord[2] - root) };
            let left = 32 - pos;
            let d = target - d0;
            self.last_leap = 0;
            if d.abs() >= left { self.set_deg(d0 + d.signum() * 2.min(d.abs() - left + 1), lo, hi); }
            else if d != 0 { self.set_deg(d0 + d.signum(), lo, hi); }
            else if left > 2 {
                let s = if rand() < 0.5 { -1 } else { 1 };
                let w = 2 + if rand() < 0.5 { 1 } else { 0 };
                self.set_deg(d0 + s * w, lo, hi);
            } else {
                let s = if rand() < 0.5 { 1 } else { -1 };
                self.set_deg(d0 + s, lo, hi);
            }
            let d = self.deg.unwrap();
            return self.no_drone(d, lo, hi, center);
        }
        // a recent leap resolves by stepping back the other way
        if self.last_leap != 0 {
            let dir = if self.last_leap > 0 { -1 } else { 1 };
            self.last_leap = 0;
            let d = self.set_deg(d0 + dir, lo, hi);
            return self.no_drone(d, lo, hi, center);
        }
        // the answer phrase sometimes echoes the question's shape
        if phrase == 1 && self.motif_n > 0 && rand() < 0.5 {
            let mv = self.motif[pos as usize % self.motif_n];
            if mv != 0 {
                let d = self.set_deg(d0 + mv, lo, hi);
                return self.no_drone(d, lo, hi, center);
            }
        }
        let up = if self.contour > 0 { 1 } else { -1 };
        if strong {
            // a chord tone, never the one we are on, leaning with the arch, not bouncing straight back
            let (mut best, mut bd) = (None, 1e9);
            let base = js_round(center as f64 / n as f64) * n;
            for o in -1..=1 {
                for &ct in &chord {
                    let cand = base + ct + o * n;
                    if cand == d0 { continue; }
                    let dist = (cand - d0).abs();
                    if dist > 5 { continue; }
                    let back = if self.hist_n >= 2 && cand == self.hist[self.hist_n - 2] { 2.2 } else { 0.0 };
                    let score = dist as f64 + if (cand - d0).signum() == up { 0.0 } else { 1.6 } + back;
                    if score < bd { bd = score; best = Some(cand); }
                }
            }
            self.set_deg(best.unwrap_or(d0 + up), lo, hi);
        } else {
            // a passing step mostly, a 3rd skip sometimes, a rare leap that resolves next note
            let r = rand();
            let step = if r < 0.66 { up * if rand() < 0.72 { 1 } else { -1 } }
                else if r < 0.9 { up * if rand() < 0.7 { 2 } else { -2 } }
                else { self.last_leap = up * 3; up * 3 };
            self.set_deg(d0 + step, lo, hi);
        }
        let d = self.deg.unwrap();
        if phrase == 0 {
            if self.motif_n == 8 { self.motif.copy_within(1..8, 0); self.motif_n = 7; }
            self.motif[self.motif_n] = d - center;
            self.motif_n += 1;
        }
        self.no_drone(d, lo, hi, center)
    }
}

/// JavaScript's `Math.round` (halves go up, also below zero), which the web melody's arithmetic relies on.
fn js_round(x: f64) -> i32 { (x + 0.5).floor() as i32 }

#[cfg(test)]
mod tests {
    use super::*;

    const MAJOR: i32 = 7;

    fn rng_stream(seed: u64) -> impl FnMut() -> f64 {
        let mut r = crate::Rng::new(seed);
        move || r.next_f32() as f64
    }

    #[test]
    fn melody_matches_the_web_note_for_note() {
        let g = include_str!("melody_golden.txt");
        let lines: Vec<&str> = g.lines().collect();
        assert!(lines.len() >= 12, "melody_golden.txt is incomplete: run node _dev/dev-vstmelody.js");
        for set in lines.chunks(4) {
            let head: Vec<&str> = set[0].split(' ').collect();
            let n = match head[1] { "major" => 7, "pentaMaj" => 5, s => panic!("unknown scale {}", s) };
            let root: i32 = head[3].parse().unwrap();
            let strong: Vec<bool> = set[1].split(' ').skip(1).map(|x| x == "1").collect();
            let want: Vec<i32> = set[2].split(' ').skip(1).map(|x| x.parse().unwrap()).collect();
            let rands: Vec<f64> = set[3].split(' ').skip(1).map(|x| x.parse().unwrap()).collect();
            let mut it = rands.iter();
            let mut rand = || *it.next().expect("the port asked for more random numbers than the web did");
            let mut m = Melody::new();
            for (i, (&s, &w)) in strong.iter().zip(&want).enumerate() {
                let got = m.next_deg(s, n, root, &mut rand);
                assert_eq!(got, w, "{}: note {} is degree {}, the web sang {}", set[0], i, got, w);
            }
            assert!(it.next().is_none(), "{}: the port used fewer random numbers than the web", set[0]);
        }
    }

    #[test]
    fn a_thousand_notes_stay_in_the_singing_range() {
        // C major, home chord: the middle octave's tonic is degree 7, the range 1..13 (about an octave and a half)
        let mut m = Melody::new();
        let mut rand = rng_stream(3);
        for i in 0..1000 {
            let d = m.next_deg(i % 2 == 0, MAJOR, 0, &mut rand);
            assert!((1..=13).contains(&d), "note {} is degree {}, outside 1..13", i, d);
        }
    }

    #[test]
    fn no_note_sounds_three_times_in_a_row() {
        let mut m = Melody::new();
        let mut rand = rng_stream(4);
        let d: Vec<i32> = (0..10_000).map(|i| m.next_deg(i % 2 == 0, MAJOR, 0, &mut rand)).collect();
        for w in d.windows(3) { assert!(!(w[0] == w[1] && w[1] == w[2]), "a drone: {:?}", w); }
    }

    #[test]
    fn the_question_ends_on_the_fifth_and_the_answer_on_the_tonic() {
        // 32 notes a phrase. Over 500 question/answer pairs, how often each phrase's last note is its target, against
        // how often that degree turns up anywhere else in the phrase.
        let mut m = Melody::new();
        let mut rand = rng_stream(5);
        let (mut q5, mut a1, mut q5n, mut a1n, mut q_near, mut a_near) = (0, 0, 0, 0, 0, 0);
        for _ in 0..500 {
            let d: Vec<i32> = (0..64).map(|i| m.next_deg(i % 2 == 0, MAJOR, 0, &mut rand)).collect();
            if d[31] == 11 { q5 += 1; }
            if d[63] == 7 { a1 += 1; }
            if (d[31] - 11).abs() <= 1 { q_near += 1; }
            if (d[63] - 7).abs() <= 1 { a_near += 1; }
            q5n += d[..24].iter().filter(|&&x| x == 11).count();
            a1n += d[32..56].iter().filter(|&&x| x == 7).count();
        }
        let (qb, ab) = (q5n as f64 / (500.0 * 24.0), a1n as f64 / (500.0 * 24.0));
        eprintln!("question last on the 5th {}/500 (within 1: {}), elsewhere {:.0}%; answer last on the tonic {}/500 (within 1: {}), elsewhere {:.0}%",
            q5, q_near, qb * 100.0, a1, a_near, ab * 100.0);
        // measured on the port (note for note the web's melody, see the golden test): on target 58%, within a step
        // 87%, the same degree elsewhere 15% (the 5th) and 6% (the tonic). The cadence is a pull, not a rule.
        assert!(q5 as f64 / 500.0 > qb * 3.0, "the question does not head for the 5th");
        assert!(a1 as f64 / 500.0 > ab * 3.0, "the answer does not head home");
        assert!(q_near >= 400 && a_near >= 400, "too many phrases ended more than a step from their target");
    }
}

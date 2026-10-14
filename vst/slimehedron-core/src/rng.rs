//! A tiny deterministic RNG.
//!
//! The web app calls `Math.random()` for detune, envelope jitter and the dud roll. A plugin cannot:
//! the audio thread must not allocate or lock, and a test that cannot reproduce a note cannot prove
//! anything about it. xorshift64* is three instructions and passes the only bar that matters here —
//! it does not visibly repeat over a musical phrase.

#[derive(Debug, Clone)]
pub struct Rng(u64);

impl Rng {
    pub fn new(seed: u64) -> Self {
        // a zero state is a fixed point for xorshift, so never allow it
        Rng(if seed == 0 { 0x9E37_79B9_7F4A_7C15 } else { seed })
    }

    #[inline]
    pub fn next_u64(&mut self) -> u64 {
        let mut x = self.0;
        x ^= x >> 12;
        x ^= x << 25;
        x ^= x >> 27;
        self.0 = x;
        x.wrapping_mul(0x2545_F491_4F6C_DD1D)
    }

    /// 0.0 .. 1.0, never 1.0 — the same contract as `Math.random()`.
    #[inline]
    pub fn next_f32(&mut self) -> f32 {
        // top 24 bits over 2^24: exactly representable, uniform, no rounding to 1.0
        ((self.next_u64() >> 40) as f32) / 16_777_216.0
    }
}

impl Default for Rng {
    fn default() -> Self {
        Rng::new(0x1234_5678_9ABC_DEF0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_stays_in_range() {
        let mut r = Rng::new(1);
        for _ in 0..100_000 {
            let x = r.next_f32();
            assert!((0.0..1.0).contains(&x), "rng produced {}", x);
        }
    }

    #[test]
    fn it_is_reproducible() {
        // without this, no test of the voice means anything
        let a: Vec<f32> = (0..64).scan(Rng::new(7), |r, _| Some(r.next_f32())).collect();
        let b: Vec<f32> = (0..64).scan(Rng::new(7), |r, _| Some(r.next_f32())).collect();
        assert_eq!(a, b);
    }

    #[test]
    fn different_seeds_give_different_streams() {
        let a: Vec<f32> = (0..32).scan(Rng::new(7), |r, _| Some(r.next_f32())).collect();
        let b: Vec<f32> = (0..32).scan(Rng::new(8), |r, _| Some(r.next_f32())).collect();
        assert_ne!(a, b);
    }

    #[test]
    fn it_is_roughly_flat() {
        // ten buckets over a million draws; a broken shift shows up as an empty or doubled bucket
        let mut r = Rng::new(42);
        let mut bucket = [0usize; 10];
        for _ in 0..1_000_000 {
            bucket[(r.next_f32() * 10.0) as usize % 10] += 1;
        }
        for (i, n) in bucket.iter().enumerate() {
            assert!(
                (*n as f32 - 100_000.0).abs() < 5_000.0,
                "bucket {} held {} of 1,000,000",
                i,
                n
            );
        }
    }

    #[test]
    fn a_zero_seed_still_works() {
        let mut r = Rng::new(0);
        let a = r.next_f32();
        let b = r.next_f32();
        assert!(a != b, "a zero seed froze the generator");
    }
}

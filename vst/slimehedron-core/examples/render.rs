//! Hear the port with no plugin tooling at all.
//!
//!     cargo run --example render
//!
//! Writes `slimehedron-render.wav` in the current directory: a phrase in a scale, then the same
//! phrase with the chord follower watching a left hand play C - Am - F - G, so the melody moves
//! with the chords instead of ignoring them. If that second half sounds harmonically wrong, the
//! follower is wrong, and no amount of plugin plumbing will fix it.

use std::fs::File;
use std::io::{BufWriter, Write};

use slimehedron_core::music::{freq_from_cents, scales, ChordFollower};
use slimehedron_core::synth::{AdsrSettings, Voice, VoiceSettings, Wave};
use slimehedron_core::Rng;

const SR: f32 = 48_000.0;
const ROOT: f32 = 60.0; // middle C
const STEP: f32 = 0.3; // seconds between note starts

fn main() -> std::io::Result<()> {
    let scale = scales::by_id("major").expect("major scale");
    let set = VoiceSettings {
        wave: Wave::Triangle,
        sub: 0.25,
        cut: 0.72,
        res: 0.15,
        fenv: 0.18,
        adsr: AdsrSettings { attack: 0.006, decay: 0.12, sustain: 0.45, release: 0.35, hold: 0.22 },
        ..VoiceSettings::default()
    };

    let mut rng = Rng::new(0x5111_E000_u64);
    let mut mix = Mix::new();

    // ---- part one: a plain phrase, no chords -------------------------------------------------
    let tune = [0i32, 2, 4, 2, 0, 4, 7, 4];
    let mut at = 0.0f32;
    for &deg in &tune {
        let hz = freq_from_cents(ROOT, scale.cents_for_degree(deg));
        mix.note(at, hz, 100.0, set, &mut rng);
        at += STEP;
    }
    at += 0.6;

    // ---- part two: the same phrase over a left hand ------------------------------------------
    // C, Am, F, G: what a kid noodling actually plays. The melody transposes onto each chord.
    let chords: [(&str, [u8; 3]); 4] =
        [("C", [0, 4, 7]), ("Am", [9, 0, 4]), ("F", [5, 9, 0]), ("G", [7, 11, 2])];

    let mut now_ms = 0u64;
    for (name, pcs) in chords {
        let mut follow = ChordFollower::new();
        for pc in pcs {
            follow.played(pc, now_ms);
        }
        let deg = follow.root_degree(now_ms, ROOT as i32, scale.cents).unwrap_or(0) as i32;
        println!("{:>3} -> scale degree {}", name, deg);
        for &d in &tune[..4] {
            let hz = freq_from_cents(ROOT, scale.cents_for_degree(deg + d));
            mix.note(at, hz, 96.0, set, &mut rng);
            at += STEP;
        }
        now_ms += 1200;
    }

    let out = mix.finish(at + 1.0);
    let path = "slimehedron-render.wav";
    write_wav(path, &out)?;
    println!("wrote {} ({:.1}s, {} samples)", path, out.len() as f32 / SR, out.len());
    Ok(())
}

/// Notes overlap. A note's release has to ring into the next one, so everything is summed into a
/// single buffer at a sample offset rather than appended.
struct Mix {
    buf: Vec<f32>,
}

impl Mix {
    fn new() -> Self {
        Mix { buf: Vec::new() }
    }

    fn note(&mut self, at_secs: f32, hz: f32, vel: f32, set: VoiceSettings, rng: &mut Rng) {
        let mut v = Voice::new(SR);
        v.trigger(hz, vel, 0.4, true, set, rng);
        let start = (at_secs * SR) as usize;
        let mut i = 0usize;
        while v.is_active() && i < (SR as usize * 4) {
            let s = v.next() * 0.55;
            let at = start + i;
            if at >= self.buf.len() {
                self.buf.resize(at + 1, 0.0);
            }
            self.buf[at] += s;
            i += 1;
        }
    }

    fn finish(mut self, secs: f32) -> Vec<f32> {
        let want = (secs * SR) as usize;
        if self.buf.len() < want {
            self.buf.resize(want, 0.0);
        }
        // soft safety clamp, same job as the web app's outClip
        for s in self.buf.iter_mut() {
            *s = s.clamp(-0.891, 0.891);
        }
        self.buf
    }
}

fn write_wav(path: &str, samples: &[f32]) -> std::io::Result<()> {
    let data_bytes = samples.len() as u32 * 2;
    let mut f = BufWriter::new(File::create(path)?);
    f.write_all(b"RIFF")?;
    f.write_all(&(36 + data_bytes).to_le_bytes())?;
    f.write_all(b"WAVEfmt ")?;
    f.write_all(&16u32.to_le_bytes())?;
    f.write_all(&1u16.to_le_bytes())?; // PCM
    f.write_all(&1u16.to_le_bytes())?; // mono
    f.write_all(&(SR as u32).to_le_bytes())?;
    f.write_all(&((SR as u32) * 2).to_le_bytes())?; // byte rate
    f.write_all(&2u16.to_le_bytes())?; // block align
    f.write_all(&16u16.to_le_bytes())?;
    f.write_all(b"data")?;
    f.write_all(&data_bytes.to_le_bytes())?;
    for s in samples {
        let v = (s.clamp(-1.0, 1.0) * 32_767.0) as i16;
        f.write_all(&v.to_le_bytes())?;
    }
    f.flush()
}

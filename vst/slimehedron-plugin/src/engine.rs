//! The part of the plugin that makes sound. Plain safe Rust: no CLAP types in here, so it can be
//! tested without a host, and the FFI file stays nothing but plumbing.
//!
//! Milestone 1b on purpose: MIDI notes in, the ported synth voice out. No tank, no band, no
//! parameters. A held key does not sustain yet -- the voice plays its own envelope, the same way a
//! ball hitting a wall does in the web app. Note-off arrives with the tank work.

use slimehedron_core::music::freq_from_cents;
use slimehedron_core::synth::{AdsrSettings, Voice, VoiceSettings, Wave};
use slimehedron_core::Rng;

/// The web app caps the tank at 12 balls. A keyboard player can hold more than that, so a little
/// headroom; the oldest voice is reused when all are busy.
pub const VOICES: usize = 16;

pub struct Engine {
    sr: f32,
    voices: Vec<Voice>,
    next: usize,
    rng: Rng,
    set: VoiceSettings,
}

impl Engine {
    /// Allocates. Call from `activate`, never from the audio thread.
    pub fn new(sample_rate: f32) -> Self {
        Self {
            sr: sample_rate,
            voices: (0..VOICES).map(|_| Voice::new(sample_rate)).collect(),
            next: 0,
            rng: Rng::new(0x5111_E000),
            // the same patch the render example uses, so the plugin and the WAV sound alike
            set: VoiceSettings {
                wave: Wave::Triangle,
                sub: 0.25,
                cut: 0.72,
                res: 0.15,
                fenv: 0.18,
                adsr: AdsrSettings { attack: 0.006, decay: 0.12, sustain: 0.45, release: 0.35, hold: 0.22 },
                ..VoiceSettings::default()
            },
        }
    }

    /// `key` is a MIDI note number, `vel` is 0..1 as CLAP sends it.
    pub fn note_on(&mut self, key: i16, vel: f32) {
        if !(0..=127).contains(&key) {
            return;
        }
        // a free voice if there is one, otherwise steal the next in line
        let slot = (0..VOICES)
            .map(|i| (self.next + i) % VOICES)
            .find(|&i| !self.voices[i].is_active())
            .unwrap_or(self.next);
        self.next = (slot + 1) % VOICES;
        let hz = freq_from_cents(key as f32, 0.0);
        // firm = true: a person played this on purpose, so it can never be the quiet "dud"
        let set = self.set;
        self.voices[slot].trigger(hz, (vel.clamp(0.0, 1.0) * 127.0).max(1.0), 0.4, true, set, &mut self.rng);
    }

    /// Mix every active voice into `out`, adding to what is there.
    pub fn render(&mut self, out: &mut [f32]) {
        for v in self.voices.iter_mut().filter(|v| v.is_active()) {
            for s in out.iter_mut() {
                *s += v.next();
            }
        }
    }

    /// Stop everything at once. Voice is a plain struct, so this does not allocate.
    pub fn reset(&mut self) {
        let sr = self.sr;
        for v in self.voices.iter_mut() {
            *v = Voice::new(sr);
        }
    }
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;

    pub const SR: f32 = 48_000.0;

    /// Goertzel power of one frequency: how much of `hz` is in the signal.
    pub fn power(x: &[f32], hz: f32) -> f32 {
        let w = 2.0 * std::f32::consts::PI * hz / SR;
        let c = 2.0 * w.cos();
        let (mut s1, mut s2) = (0.0f32, 0.0f32);
        for &v in x {
            let s = v + c * s1 - s2;
            s2 = s1;
            s1 = s;
        }
        s1 * s1 + s2 * s2 - c * s1 * s2
    }

    #[test]
    fn a_note_is_the_pitch_that_was_asked_for() {
        // not "it made a sound": the strongest partial must be the note's own fundamental
        for (key, hz) in [(57i16, 220.0f32), (60, 261.63), (69, 440.0), (72, 523.25)] {
            let mut e = Engine::new(SR);
            e.note_on(key, 0.8);
            let mut buf = vec![0.0f32; 9600];
            e.render(&mut buf);
            let body = &buf[2400..]; // skip the 40ms pitch settle
            let p = power(body, hz);
            for other in [hz * 0.94, hz * 1.06, hz * 1.5] {
                assert!(p > power(body, other) * 20.0, "key {key}: {hz}Hz is not dominant over {other}Hz");
            }
        }
    }

    #[test]
    fn silence_until_a_note_and_silence_after_it_ends() {
        let mut e = Engine::new(SR);
        let mut buf = vec![0.0f32; 4800];
        e.render(&mut buf);
        assert!(buf.iter().all(|&s| s == 0.0), "it made noise with no note");
        e.note_on(60, 1.0);
        let mut buf = vec![0.0f32; SR as usize * 3];
        e.render(&mut buf);
        let peak = buf.iter().fold(0.0f32, |a, &s| a.max(s.abs()));
        assert!(peak > 0.1, "the note is too quiet to hear: peak {peak}");
        assert!(buf[buf.len() - 100..].iter().all(|&s| s.abs() < 1e-4), "the note never ended");
    }

    #[test]
    fn a_soft_key_is_quieter_than_a_hard_one() {
        let peak = |vel| {
            let mut e = Engine::new(SR);
            e.note_on(60, vel);
            let mut b = vec![0.0f32; 9600];
            e.render(&mut b);
            b.iter().fold(0.0f32, |a, &s| a.max(s.abs()))
        };
        assert!(peak(0.25) < peak(1.0) * 0.5);
    }

    #[test]
    fn a_chord_plays_every_note() {
        let mut e = Engine::new(SR);
        for k in [60i16, 64, 67] {
            e.note_on(k, 0.8);
        }
        let mut b = vec![0.0f32; 9600];
        e.render(&mut b);
        let body = &b[2400..];
        for hz in [261.63f32, 329.63, 392.0] {
            assert!(power(body, hz) > power(body, 300.0) * 10.0, "{hz}Hz missing from the chord");
        }
    }

    #[test]
    fn more_notes_than_voices_does_not_panic_or_go_silent() {
        let mut e = Engine::new(SR);
        for k in 40..80 {
            e.note_on(k, 0.7);
        }
        let mut b = vec![0.0f32; 4800];
        e.render(&mut b);
        assert!(b.iter().any(|&s| s.abs() > 0.01));
    }
}

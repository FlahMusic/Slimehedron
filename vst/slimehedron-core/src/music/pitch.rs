//! Pitch maths. Cents in, hertz out, same as the web app.

/// `freqFromCents` from index.html: a MIDI root plus an offset in cents.
///
/// The web app is cents-based everywhere because five of its scales are microtonal; rounding to
/// semitones here would quietly delete them.
pub fn freq_from_cents(root_midi: f32, cents: f32) -> f32 {
    440.0 * 2f32.powf((root_midi + cents / 100.0 - 69.0) / 12.0)
}

/// Pitch class (0..11) of a root + cents offset, the way `noteManual` computes it.
pub fn pitch_class(root_midi: i32, cents: f32) -> u8 {
    (((root_midi + (cents / 100.0).round() as i32) % 12 + 12) % 12) as u8
}

/// Nearest MIDI note and the leftover cents — what MPE needs to send true microtonal pitch.
pub fn midi_and_bend(root_midi: f32, cents: f32) -> (u8, f32) {
    let exact = root_midi + cents / 100.0;
    let note = exact.round();
    (note.clamp(0.0, 127.0) as u8, (exact - note) * 100.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn close(a: f32, b: f32, tol: f32) -> bool { (a - b).abs() <= tol }

    #[test]
    fn a440_is_a440() {
        assert!(close(freq_from_cents(69.0, 0.0), 440.0, 0.001));
    }

    #[test]
    fn middle_c_is_middle_c() {
        // 261.6256 Hz is C4 in 12-TET at A440.
        assert!(close(freq_from_cents(60.0, 0.0), 261.6256, 0.01));
    }

    #[test]
    fn an_octave_up_doubles_it() {
        let a = freq_from_cents(60.0, 0.0);
        let b = freq_from_cents(60.0, 1200.0);
        assert!(close(b / a, 2.0, 0.0001));
    }

    #[test]
    fn a_fifth_really_is_a_fifth() {
        let a = freq_from_cents(60.0, 0.0);
        let b = freq_from_cents(60.0, 700.0);
        // 700 cents is the tempered fifth: 1.4983, not the just 1.5.
        assert!(close(b / a, 1.4983, 0.001), "ratio was {}", b / a);
    }

    #[test]
    fn a_quarter_tone_is_not_a_semitone() {
        // The whole reason this file speaks cents.
        let a = freq_from_cents(60.0, 0.0);
        let q = freq_from_cents(60.0, 50.0);
        let s = freq_from_cents(60.0, 100.0);
        assert!(q > a && q < s, "a quarter tone did not land between the two semitones");
    }

    #[test]
    fn pitch_classes_wrap() {
        assert_eq!(pitch_class(60, 0.0), 0);     // C
        assert_eq!(pitch_class(60, 400.0), 4);   // E
        assert_eq!(pitch_class(60, 1200.0), 0);  // C again
        assert_eq!(pitch_class(60, -100.0), 11); // B below
    }

    #[test]
    fn mpe_bend_carries_the_leftover_cents() {
        let (note, bend) = midi_and_bend(60.0, 50.0);
        assert_eq!(note, 61);                      // nearest semitone
        assert!(close(bend, -50.0, 0.01), "bend was {}", bend); // and we are 50 cents under it
    }
}

//! The chord follower: work out what chord a person is playing and hand the band its new root.
//!
//! This is a direct port of `manualRoot` / `manualActive` / `noteManual` from index.html. In the
//! web app a human playing OWNS the harmony — the bass, the comp and the pads retune to whatever
//! they are playing, live, so improvising over the generator stays in key instead of fighting it.
//! That behaviour is the reason MIDI in exists on the plugin at all, so it is ported first and
//! tested against real chords rather than "the function returned something".
//!
//! Two rules carried over from the web app, both deliberate:
//!   * a locked custom progression OWNS the harmony — played notes jam OVER it, they do not steer
//!     it. The caller enforces this (`cmActive()` in the web app); this module just answers.
//!   * notes older than the window are ignored, so letting go returns control to the generator.

/// How long a played note keeps steering the harmony. 1600ms in the web app.
pub const WINDOW_MS: u64 = 1600;

/// Most recent notes a human played, newest last.
#[derive(Debug, Default, Clone)]
pub struct ChordFollower {
    notes: Vec<Played>,
    window_ms: u64,
    cap: usize,
}

#[derive(Debug, Clone, Copy)]
struct Played {
    pc: u8,
    at_ms: u64,
}

impl ChordFollower {
    pub fn new() -> Self {
        // 16 notes is the web app's cap: enough for a two-hand voicing, short enough that a long
        // run does not keep a note alive past its welcome.
        Self { notes: Vec::new(), window_ms: WINDOW_MS, cap: 16 }
    }

    pub fn with_window(window_ms: u64) -> Self {
        Self { window_ms, ..Self::new() }
    }

    /// A human played a note. `pc` is its pitch class (0..11).
    pub fn played(&mut self, pc: u8, at_ms: u64) {
        self.notes.push(Played { pc: pc % 12, at_ms });
        if self.notes.len() > self.cap {
            self.notes.remove(0);
        }
    }

    pub fn clear(&mut self) {
        self.notes.clear();
    }

    /// Is a human currently steering the harmony?
    pub fn active(&self, now_ms: u64) -> bool {
        self.notes
            .last()
            .map(|n| now_ms.saturating_sub(n.at_ms) < self.window_ms)
            .unwrap_or(false)
    }

    /// The root pitch class of what is being played, or None if nothing recent.
    ///
    /// Scores every one of the twelve possible roots by how much of a major or minor triad built on
    /// it is actually present, with two tie-breaks: a root you played yourself outweighs one merely
    /// implied, and your most recent note outweighs an older one. With a single note held, every
    /// root is a candidate — one note implies a chord, and the generator should pick the one that
    /// note sits best in.
    pub fn root_pc(&self, now_ms: u64) -> Option<u8> {
        let recent: Vec<u8> = self
            .notes
            .iter()
            .filter(|n| now_ms.saturating_sub(n.at_ms) < self.window_ms)
            .map(|n| n.pc)
            .collect();
        if recent.is_empty() {
            return None;
        }
        let last = *recent.last().unwrap();
        let mut held = [false; 12];
        for pc in &recent {
            held[*pc as usize] = true;
        }
        let single = held.iter().filter(|h| **h).count() == 1;

        let mut best_pc = last;
        let mut best = -1.0f32;
        for r in 0u8..12 {
            if !single && !held[r as usize] {
                continue; // the root has to be a note you actually played
            }
            for third in [3u8, 4u8] {
                let mut s = 0.0f32;
                for iv in [0u8, third, 7u8] {
                    if held[((r + iv) % 12) as usize] {
                        s += 1.0;
                    }
                }
                if held[r as usize] {
                    s += 0.7; // you played the root itself
                }
                if r == last {
                    s += 0.3; // and your latest note gets a say
                }
                if s > best {
                    best = s;
                    best_pc = r;
                }
            }
        }
        Some(best_pc)
    }

    /// The root mapped onto the nearest degree of the running scale, which is what the bass and
    /// pads actually voice. `scale_cents` is the scale table; `root_midi` is the key.
    pub fn root_degree(&self, now_ms: u64, root_midi: i32, scale_cents: &[f32]) -> Option<usize> {
        let target = self.root_pc(now_ms)?;
        if scale_cents.is_empty() {
            return None;
        }
        let root0 = ((root_midi % 12) + 12) % 12;
        let mut best_deg = 0usize;
        let mut best_d = 99i32;
        for (i, c) in scale_cents.iter().enumerate() {
            let deg_pc = (((root0 + (c / 100.0).round() as i32) % 12) + 12) % 12;
            let a = (deg_pc - target as i32 + 12) % 12;
            let b = (target as i32 - deg_pc + 12) % 12;
            let d = a.min(b);
            if d < best_d {
                best_d = d;
                best_deg = i;
            }
        }
        Some(best_deg)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::music::scales;

    // C=0 D=2 E=4 F=5 G=7 A=9 B=11
    fn play(chord: &[u8]) -> ChordFollower {
        let mut f = ChordFollower::new();
        for (i, pc) in chord.iter().enumerate() {
            f.played(*pc, 1000 + i as u64); // all within the window
        }
        f
    }

    #[test]
    fn c_major_triad_is_rooted_on_c() {
        assert_eq!(play(&[0, 4, 7]).root_pc(1100), Some(0));
    }

    #[test]
    fn a_minor_triad_is_rooted_on_a() {
        assert_eq!(play(&[9, 0, 4]).root_pc(1100), Some(9));
    }

    #[test]
    fn g_major_is_rooted_on_g_even_though_it_shares_two_notes_with_e_minor() {
        // G B D vs E G B — the shared pair is exactly the case a naive "lowest note" would get wrong.
        assert_eq!(play(&[7, 11, 2]).root_pc(1100), Some(7));
    }

    #[test]
    fn f_major_is_rooted_on_f() {
        assert_eq!(play(&[5, 9, 0]).root_pc(1100), Some(5));
    }

    #[test]
    fn d_minor_is_rooted_on_d() {
        assert_eq!(play(&[2, 5, 9]).root_pc(1100), Some(2));
    }

    #[test]
    fn inversions_still_find_the_root() {
        // first inversion of C major: E G C. The lowest note is E, the root is still C.
        assert_eq!(play(&[4, 7, 0]).root_pc(1100), Some(0));
        // second inversion: G C E.
        assert_eq!(play(&[7, 0, 4]).root_pc(1100), Some(0));
    }

    #[test]
    fn one_note_still_picks_a_root() {
        // A single note implies a chord; the follower is allowed to choose a root you did not play.
        let r = play(&[0]).root_pc(1100);
        assert!(r.is_some(), "a held note steered nothing");
    }

    #[test]
    fn letting_go_hands_the_harmony_back() {
        let f = play(&[0, 4, 7]);
        assert!(f.active(1100), "should still be steering a moment later");
        assert!(!f.active(1100 + WINDOW_MS), "should have let go after the window");
        assert_eq!(f.root_pc(1100 + WINDOW_MS), None, "stale notes kept steering");
    }

    #[test]
    fn a_new_chord_takes_over_from_the_old_one() {
        let mut f = ChordFollower::new();
        for (i, pc) in [0u8, 4, 7].iter().enumerate() { f.played(*pc, 1000 + i as u64); }
        assert_eq!(f.root_pc(1100), Some(0));
        // ...a second later they move to F major. The C major notes are now out of the window.
        let t = 1000 + WINDOW_MS;
        for (i, pc) in [5u8, 9, 0].iter().enumerate() { f.played(*pc, t + i as u64); }
        assert_eq!(f.root_pc(t + 100), Some(5), "the band did not follow the change");
    }

    #[test]
    fn the_root_lands_on_a_real_degree_of_the_running_scale() {
        let major = scales::by_id("major").unwrap();
        // In C major, playing G major should land the band on degree 4 (so = the fifth).
        let f = play(&[7, 11, 2]);
        assert_eq!(f.root_degree(1100, 60, major.cents), Some(4));
        // Playing A minor should land on degree 5 (la = the sixth).
        let f = play(&[9, 0, 4]);
        assert_eq!(f.root_degree(1100, 60, major.cents), Some(5));
    }

    #[test]
    fn it_works_in_a_pentatonic_too() {
        // The web app's note says "works in ANY scale — pentatonic too". A pentatonic has no
        // degree for every pitch class, so the root has to snap to the NEAREST one and must not
        // fall over.
        let penta = scales::by_id("pentaMaj").unwrap();
        let f = play(&[5, 9, 0]); // F major, and there is no F in a C major pentatonic
        let d = f.root_degree(1100, 60, penta.cents);
        assert!(d.is_some(), "the pentatonic case returned nothing");
        assert!(d.unwrap() < penta.cents.len(), "degree out of range");
    }
}

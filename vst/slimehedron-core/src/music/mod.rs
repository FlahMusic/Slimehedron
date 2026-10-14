//! Music theory. Pure arithmetic, no audio — this is the half of Slimehedron that ports literally.

pub mod chord_follow;
pub mod pitch;
pub mod scales;

pub use chord_follow::ChordFollower;
pub use pitch::{freq_from_cents, midi_and_bend, pitch_class};
pub use scales::{Scale, SCALES};

//! The melody voice, ported from `playSynth` in index.html.
//!
//! Web Audio builds this out of nodes the browser owns. A plugin owns nothing, so every node
//! becomes code here: the oscillator, the biquad, the envelope. The shape is kept deliberately
//! faithful — the detune, the pitch settle, the envelope jitter and the `firm` flag are all part of
//! why the web app sounds the way it does, and dropping them would make this a different synth that
//! happens to play the same notes.

pub mod adsr;
pub mod biquad;
pub mod osc;
pub mod voice;

pub use adsr::{Adsr, AdsrSettings};
pub use biquad::{Biquad, FilterKind};
pub use osc::{Osc, Wave};
pub use voice::{Voice, VoiceSettings};

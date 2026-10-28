//! The Slimehedron engine, with nothing attached to it.
//!
//! This crate is the part of Slimehedron that is neither a browser nor a plugin: the synth voice,
//! the scale tables, the chord follower. It has **no dependencies**, knows nothing about CLAP,
//! VST3, wry, or Web Audio, and never allocates on the audio path once a voice exists.
//!
//! That is deliberate and it is the whole risk mitigation for the port. The plugin wrapper
//! (`wxp` / `clap-wrapper`) is young, and if it stops being the right choice, only the wrapper
//! crate gets thrown away — this one keeps working, including as a WASM build for the web app.
//!
//! ```
//! use slimehedron_core::{Rng, music::scales, synth::{Voice, VoiceSettings}, music::freq_from_cents};
//!
//! let scale = scales::by_id("pentaMaj").unwrap();
//! let mut rng = Rng::new(1);
//! let mut v = Voice::new(48_000.0);
//! v.trigger(freq_from_cents(60.0, scale.cents_for_degree(2)), 100.0, 0.4, true,
//!           VoiceSettings::default(), &mut rng);
//! let first = v.next();
//! assert!(first.is_finite());
//! ```

#![forbid(unsafe_code)]

pub mod music;
pub mod rng;
pub mod synth;
pub mod tank;

pub use rng::Rng;

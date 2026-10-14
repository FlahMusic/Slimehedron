# Slimehedron plugin (work in progress)

Milestone 1b: a CLAP instrument. Play notes into it, the Slimehedron synth voice comes out.
No tank, no band, no window, no knobs yet.

## Build it (Windows)

Needs Rust (already installed) with the Visual Studio C++ build tools. Open a terminal in this
folder (`C:\flah plugins\plinky\vst`):

    cargo build --release -p slimehedron-plugin

That makes `target\release\slimehedron_plugin.dll`. A CLAP plugin is that same file with a
`.clap` name.

## Put it where Studio One looks

CLAP plugins go in `C:\Program Files\Common Files\CLAP` (the folder the CLAP standard names).
Writing there needs an admin terminal:

    mkdir "C:\Program Files\Common Files\CLAP"
    copy /Y target\release\slimehedron_plugin.dll "C:\Program Files\Common Files\CLAP\Slimehedron.clap"

Then in Studio One: put an instrument track down, find **Slimehedron** (vendor FlahMusic) in the
browser, play notes. If it doesn't show up, rescan plugins in Studio One's options.

Studio One added CLAP in version 7.0. On anything older it will not appear.

## What it does right now

- Takes notes as CLAP notes or plain MIDI.
- Plays each one on the same voice the web app uses (triangle + sub, filter sweep, the 40ms
  pitch settle, the per-note detune).
- Up to 16 notes at once.
- A held key does NOT sustain yet. Each note plays its own short envelope, like a ball hitting a
  wall. Note-off comes with the tank work.

## Tests

    cargo test

The plugin tests load it through the same entry point a DAW uses, send a note, and check that the
sound starts on the right sample and that its strongest frequency is the note that was played.

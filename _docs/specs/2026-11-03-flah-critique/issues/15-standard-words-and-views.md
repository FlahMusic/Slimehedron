# 15 Intuitive UI: standard music words and views, taught in small blocks

Status: ready
Spec: `../spec.md` (Decisions); Flah 2026-11-04: "we arent reinventing the wheel, just making industry and theory
standard stuff easy to understand by breaking down the blocks of understanding into core concepts, but they should
still be taught in a way that applies and helps build understanding of context that you would see in a DAW or
professional music software"

1. List every concept the app shows or teaches (tempo, bar, beat, step, grid, playhead, loop, quantize, swing, key,
   scale, chord, octave, velocity, mixer, mute / solo, transport, metronome / click, MIDI, ...) with: the word the app
   uses now, the word DAWs and theory books use (cite: e.g. Ableton / Logic / FL manuals, a theory text), and where it
   appears. Write it as a table in `../ui-words.md`.
2. Use the standard word wherever the app's own word differs and a kid can still read it (e.g. "tempo (BPM)", "bar",
   "beat"); say plainly where a kid-friendly word stays and why.
3. Views carry over: rhythm is always a step grid with a playhead and a bar/beat ruler (as in a DAW's drum sequencer),
   pitch goes up (as in a piano roll), the transport is play / stop / record in the usual places and icons.
4. Learn mode teaches each concept as one small block, in the order a DAW user needs them, and names the DAW element
   at the end of the block ("this is the grid you'll see in every music program").
Check: `ui-words.md` complete and cited; a suite greps the shown labels for the old words that were replaced; the
learn units that teach a concept end on the standard word. Subtraction budget applies.

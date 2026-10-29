# 07 MIDI works on every setup

Status: ready
Blocked by: 01
Spec: `../spec.md` (Done means: MIDI), ADR 0011

No stuck notes: hiding the tab, blur and `pagehide` send note-offs for everything held, in and out (`allNotesOff`).
Unplugging mid-chord, hot-plug (the menu updates within 1 s), a denied permission (Chrome 124+ asks for all MIDI)
and a port another app holds (older Windows drivers are single-client) never throw and never freeze. The first key
on a MIDI keyboard starts the audio where the browser allows it. No help text (ADR 0011).

Extend `dev-midi` with a fake `requestMIDIAccess` for each case. Sabotages: no note-off on `pagehide`; a denied
permission throws. Flah's device check: KeyStep 37 by USB and through his interface on the PC, and whatever his
phone and iPad can reach.

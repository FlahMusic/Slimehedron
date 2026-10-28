# Which suites to run

Every suite: `node _dev/<name>.js` from the project root, with a server on :8765
(`python3 -m http.server 8765`). One at a time: each one kills chromium when it starts.

## 1. Gates: always first, after every edit (about a second, no browser)
- `dev-syntax`: every script parses (the mid-line `//` trap).
- `dev-loadtest`: the CSS has no swallowed rules.

## 2. Targeted runs: the suites for what you touched (run these right after the change, not at the end)
| You touched | Run |
|---|---|
| the header / transport / any control's size | dev-topbar, dev-a11y, dev-devices, dev-phone, dev-surface, dev-crowding |
| play mode, the tank gestures, auto-notes | dev-hands, dev-ux, dev-firsttouch, dev-firstfive, dev-controls, dev-guide |
| tank physics, spin, shapes, spaces | dev-hands, dev-space, dev-solid, dev-portal, dev-beatlock, dev-revive, dev-fluid |
| the goo | dev-goo3d, dev-goosmooth, dev-goolook, dev-gl |
| the 3D look / GPU tank | dev-gl, dev-look3d, dev-crayon, dev-3d, dev-shapes, dev-potato |
| harmony, keys, scales, the chord chip | dev-chordtest, dev-harmony, dev-harmony2, dev-world, dev-tuning, dev-band, dev-melody |
| drums, bass, mix, audio | dev-drums, dev-bassmix, dev-chordbed, dev-sound, dev-fidelity, dev-realaudio, dev-audible, dev-silence, dev-ceiling |
| studio tools (mixer, undo, song files, step grid) | dev-daw, dev-declutter, dev-hostile, dev-tools, dev-chords |
| share links, recordings, MIDI | dev-ux (section 7), dev-takes, dev-wavtap, dev-midi, dev-midiexport, dev-manualnotes |
| lessons / the map | dev-lessons (slow, ~7 min), dev-map, dev-learnmap, dev-curriculum, dev-playable, dev-cheat, dev-answerable, dev-oneanswer, dev-earwork, dev-explore, dev-jam, dev-rjam, dev-make, dev-compose, dev-newunits, dev-review, dev-rest, dev-staff, dev-nolab |
| pages, copy, claims, offline | dev-claims, dev-naming, dev-links, dev-sw, dev-entry, dev-polish, dev-sweep, dev-monkey |

## 3. The sweep: every suite, once, at the end of a pass, with no edits while it runs
In the cloud workspace: `/root/run.sh <log> -- <suites...>` writes `/tmp/<log>.log`. A full sweep takes 2-3 hours.
Then rerun only what failed. A failure that passes on rerun goes on the flaky list below, with a note.

## Known flaky (fix the cause; until then, rerun and run a control on the previous commit)
- `dev-potato`: the curved/portal frame-cost ratios swing between runs on the cloud box (timing noise).
- `dev-bassmix` 4. [play jazz]: live mix level, bass sometimes lands just over the 5 dB window.
- `dev-perfmode`, `dev-harmony`, dev-a11y "chord changed", dev-lessons HOME card: timing.
- Fixed 2026-10-27: `dev-crayon` (the tap invite faded in over its frozen frames) and `dev-portal` GL visibility.

## Writing a new suite
- The header comment says, in plain words, what a person sees or hears that it checks.
- Sabotage it: break the feature on purpose a few different ways; every break must turn it red. Write down which.
- Set `slimehedron-coach`, `slimehedron-coach-studio` and `slimehedron-tapped` unless the hints are what you test.
- Add it to the table above.

# Web first: perfect the tank, the music, the look, the timing

Status: ready
Brief (facts, the barrier checklist, sources): `brief.md`. Grilled 2026-10-29. The plugin waits (do not touch `vst/`).

## 1. Ask
"switch over priority to the website version so we can perfect the actual tank and musical part and visual bugs
smoothed out and to perfection. I want this thing to look so good you'd think Nintendo had a hand in making it.
That intuitive and modern and sleek with high quality audio lossless and rock solid midi timing and versatility for
diff setups." (Flah, 2026-10-29)
"Make sure its rotating on a 3d plane enough and that the notes interact on a 3d plane effectively, also i wanted
non-euclidian geometries in the mix as well [...] clean up any weird visual UI clutter or bugs or redundant [...]
that controls tank as well in studio settings if needed." (grill answer 4)

## 2. Decisions (grill 2026-10-29, Flah)
- **Walls stay open while the shape spins** (the wall bug, brief section 4). The tank gets sparser; Flah listens
  before and after.
- **Real 3D gets a test page first** (ticket 04). Balls fly in all three directions and bounce off a solid's real
  faces, each face a note. Flah compares it with today's tank before anything is committed. If it wins, it gets its
  own spec and ADR, and the plugin's tank copy (tickets 01-04 of the tank-headless spec) is redone while it is paused.
- **Spaces in studio**: on auto, studio mixes in portal and curved spaces only while the slime is on (1 reform in 3,
  as play). A shape or space picked by hand stays put: the slime's reform does not swap it. Derived, not asked: the
  hand pick works like the key pin (`_keyPinned`).
- **One Sync setting**: a tap-along measures the speakers' delay and shifts MIDI out and the visuals to match; it can
  also be nudged by hand. This is the MIDI offset (question 6) and the Bluetooth delay (question 10) in one control.
- **MIDI: every option works, nothing explains itself** (ADR 0011). No help text about browsers, permissions,
  Bluetooth or busy ports. Every path is tested instead.
- **Studio tank controls**: screenshots and a cut/merge proposal first. Nothing is removed until Flah OKs it.
- Flah's setups: phone and PC; Chrome and Safari; standard MIDI keyboards (KeyStep 37 class) by USB or through an
  interface; phone speaker, PC direct, line in, sometimes Bluetooth; iPad wanted. Studio One runs on its own for now.
- Plugin decisions recorded now, built later: the goo one tick late over the audio blocks (ADR 0009), the reverb is
  the web's noise-built room (ADR 0010).

## 3. Done means
Numbers marked "after 01" are set from ticket 01's measurements (the "before"), never guessed.
- **Walls**: with the slime on and spin 14, a wall `breakWall()` opens is still open 2 bars later (until
  `repairWall` heals it). Notes a bar with the walls working, at spin 14, land inside the spin-0 range measured with
  open walls (~7-9; exact range after 01).
- **Spaces**: in studio on auto with the slime on, 25-42% of 600 rolled shapes land in portal or curved (the same
  band `dev-space` uses for play). Slime off: 0%. A hand-picked shape or space survives 3 reforms.
- **Timing**: nothing musical fires from `setTimeout`/`setInterval` (every note is scheduled on
  `AudioContext.currentTime`). 10 minutes in a hidden tab with Chrome's Efficiency mode on: the band and MIDI out
  stay within 5 ms of the grid, and no burst of notes when the tab comes back. The MIDI clock out's tick spacing
  has a standard deviation under 1 ms on a virtual port (DAWs measured 2-3 ms, E-RM).
- **Sync**: after the tap-along on wired output, MIDI out to a synth recorded back in lines up with the app's own
  audio within 5 ms (loopback). One control in studio settings, none in play.
- **MIDI**: zero stuck notes after: tab hidden mid-chord, window blur, `pagehide`, unplugging the keyboard
  mid-chord. A denied permission, a busy port and a hot-plug never throw into `window.__oops` and never freeze the
  page; the device menu updates within 1 s of a plug or unplug. The first key on a MIDI keyboard makes sound with
  no click first, wherever the browser allows it (after 01: which browsers do).
- **Audio**: the WAV take is the device's own sample rate, no resampling, 24-bit or 32-bit float (after 01: which
  it is now). True peak of a WAV export of the loudest kit ≤ -1 dBTP. Worst case (12 balls, band, full goo) on the
  MSI: no underruns in 5 minutes (render capacity numbers after 01). An iPhone on silent plays sound after the
  first tap.
- **Look and feel** (brief section 6): every tap answers with sight and sound within one frame. Dropped frames
  in the worst case at 120 Hz on the MSI and 60 Hz on Flah's phone: after 01. One motion language: every
  transition uses the listed easings and durations. No layout jump on any room change (CLS 0).
- **Locked**: `dev-vstparity` and `dev-vstmelody` rerun on the final tank and committed; the handoff says the
  plugin can resume.

## 4. Proof
- Ticket 01 writes the "before" for every line of brief section 5 into `before.md` (this folder): handled or not,
  which suite proves it, the number on the MSI (Chrome, Windows) and on Flah's phone.
- Extended suites: `dev-hands` (walls open while turning), `dev-space` (studio spaces), `dev-midi` (stuck notes,
  hot-plug, denied permission, busy port, first note), `dev-takes` / `dev-wavtap` (bit depth, rate),
  `dev-ceiling` (true peak on the export). New: `dev-sync` (tap-along and loopback offset), `dev-motion` (easings,
  durations, layout jumps), `dev-hidden` (10 minutes hidden, Efficiency mode).
- Sabotages (each must go red): rebuild resets `broken` again; studio rolls spaces with the slime off; a hand pick
  gets swapped at reform; a reward chord back on `setTimeout`; no note-offs on `pagehide`; Sync shifts nothing; WAV
  resampled to 44.1 kHz; a new transition with its own easing.

## 5. Changes old behaviour
- `dev-space` 4. asserts "studio on auto stays normal" (line ~139): becomes "stays normal with the slime off,
  mixes 1 in 3 with it on".
- The wall fix changes how the tank sounds with the shape turning (sparser). `dev-vstparity` pins spin 0, so its
  stored numbers may not move: rerun and check (ticket 11).
- Whatever ticket 09's proposal removes, once Flah OKs it: `dev-controls`, `dev-surface` and `dev-topbar` are
  updated in the same pass.

## 6. Tickets
`issues/01`...`11`. 01 first (it sets the numbers). 02, 03, 04, 09 can start right after 01. 11 is last.

## 7. Not checked by a machine
How the sparser tank sounds (02). Whether real 3D feels better (04, Flah decides). MIDI on real gear: KeyStep 37
by USB and through an interface, Bluetooth headphones, an iPad, an iPhone on silent (01, 05, 07, 08 on Flah's
devices). Whether it looks like Nintendo had a hand in it (10, screenshots and Flah's eyes).

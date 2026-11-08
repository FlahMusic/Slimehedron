# Studio polish pass (2026-11-07)

Status: done

Flah: "polish the UI ... comparisons to how studio one ableton etc. lays their stuff out, we want it to be familiar but
not overwhelming but have our own spin ... make sure the graphics arent barebones ... colors to match our palette of
pastel". Research: `_docs/research/2026-11-07-daw-layout.md` (Studio Pro 8.2, Ableton 12, Logic, GarageBand, FL).

Flah was asleep for the decision round, so the research's four recommended answers were taken. Each is one CSS or
markup move to undo, and each is on the morning list:
1. No metronome added (the "two tempo controls" the research suspected is not real: a screenshot at 390 and 1280 shows
   only `#bpmNum`, so there is nothing to fold to pay for one). Left for Flah.
2. Mute pressed = periwinkle (Logic / GarageBand: "The Mute button turns blue"); solo stays yellow; words stay.
3. Groove moves into the Pattern card (it is the pattern's feel). Timing (quantize, dotted) goes under "more settings".
   One card fewer on the first screen.
4. One colour per part: melody pink, drums peach, bass mint, chords sky. On the mixer row's name and on the
   sequencer's knob arcs (notes = melody, drums = drums).

## What a person can do / see

- The sequencer tab shows the sequencer only. The drum grid (and its revert) shows only on the drum grid tab.
  (Bug found by screenshot: `#drumEditor{display:flex}` beat the `hidden` attribute.)
- Option rows (rows, way, step, knobs, length, tap) read as one segmented control each, like Logic's / Studio Pro's
  mode switches, not loose pills.
- Tempo: drag the number up/down to change it (Ableton, Studio Pro, Logic all drag tempo), wheel works, typing
  works, no native spinner arrows. TAP looks like the other buttons.
- The mixer: a colour chip per part, mute periwinkle when pressed.

## Done means (numbers)

1. Sequencer tab: `#drumEditor` and `#stepRevert` are not `checkVisibility()`-visible; drum grid tab: both are, and
   `#seqPanel` is not.
2. Each segmented row: its buttons sit 2 px apart at most inside one rounded track, every button >= 44 px tall.
3. Tempo: dragging the number up 40 px raises the tempo by 8-12 BPM; down lowers it; clamped to the input's
   min/max; the `input` change reaches `S.bpm` (the transport hears it). No spin buttons (`::-webkit-inner-spin-button`
   hidden). `#sbTap` font weight equals the other strip buttons'.
4. Mixer: a pressed `.mixM` background hue is in 200-260 deg (blue / periwinkle); a pressed `.mixS` in 40-60 deg.
   Each row's name has its part colour, and the four differ by >= 30 deg of hue.
5. First screen: `dev-surface` studio count does not go up (baseline 22 controls / 26 words); the Timing card is not
   visible until "more settings" opens; `#grooveT` is inside the Pattern card.
6. 360, 390, 1280, 1440 px: no horizontal page scroll; `dev-topbar`, `dev-a11y`, `dev-devices` pass.

## Suites

New: `dev-studiopolish` (the six checks above, sabotaged). Existing suites that may assert the old layout: grep
`_dev/` for `grooveT`, `Timing`, `mixM`, `deMode`, `sbTap`, `drumEditor` and update in the same pass.

## Not checked by a machine

Whether the periwinkle / part colours look right next to the crayon art; how the tempo drag feels on a touch screen.

## Proof

`dev-studiopolish` 24 checks pass. Sabotaged 6 ways, each caught: the tap-mode handler matching every row (2),
the drum grid not hidden (1), no segmented tracks (3), tempo drag twice as fast (4), mute back to pink (5), Timing
back on the first screen (6). Targeted: dev-seq, dev-daw, dev-declutter, dev-surface, dev-topbar, dev-a11y,
dev-devices, dev-phone, dev-crowding, dev-ux, dev-controls, dev-tools, dev-hostile, dev-polish all pass.

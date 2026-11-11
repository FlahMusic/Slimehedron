# Studio keys (2026-11-10)

Status: done

Flah: "continue working on overhaul and perfection passes on UI and usability"; earlier, studio should be "familiar but
not overwhelming". Found by reading the key handler: in studio, Space dropped a ball. Every DAW starts and stops the
transport on Space:
- Ableton Live 12 manual, 42.20 Transport: "Play from Start Marker/Stop: Space"
  (https://www.ableton.com/en/live-manual/12/live-keyboard-shortcuts/)
- GarageBand for Mac, main window shortcuts: "Start or stop playback: Space bar"
  (https://support.apple.com/guide/garageband/gbnd58362a62/mac)

## What changes
1. Studio: Space plays and pauses (the play button's own path). Enter and Shift still drop balls there; play keeps
   Space as a ball (the kids' room keeps its toy).
2. A control reached with the keyboard answers Space and Enter itself (WCAG 2.1.1). Before, the global handler
   swallowed Space on every focused button. After a mouse click leaves a button focused, Space is the transport again.
   How focus arrived is tracked (`_kbFocusEl`): `:focus-visible` cannot tell, a key press turns it on for any focus.
3. The keys are named: play "(space)" in studio only, drums "(D)", the slime "(A)", the tempo box says it drags.
4. (Already true, now asserted: the sequencer's "on" with the transport stopped starts it, in `seqSetOn`.)

## Done means
`dev-studiokeys`: 12 checks; sabotaged 5 ways, each caught (no Space transport, a keyboard-focused button losing
Space, `:focus-visible` instead of how focus arrived, `seqSetOn` not starting the transport, drums' key not named).

## For Flah
WCAG 2.2 SC 2.1.4 (Character Key Shortcuts): a single-letter shortcut must be possible to turn off or remap, or work only
on focus. A (the slime) and D (drums) are global single letters. Options: a "keyboard shortcuts" switch in Preferences,
or make them Shift+A / Shift+D (Ableton's way while its computer keyboard plays notes). Recommended: Shift+letter.

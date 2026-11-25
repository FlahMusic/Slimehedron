# FM-1 play pass (2026-11-25)

Status: in-progress (tickets 1-6 done 2026-11-25: 3a45bd5, a879e9d, aeba418, f8f73d2; 7 not started)

Flah tested the 10:40 build on the FM-1 and dictated notes (verbatim in the session; the decisions below were asked in one
round with recommended answers). The point of the device, in his words: "a more organic and flowing kind of free form way
of making music and turning it more into a form of play".

## Decisions (Flah, 2026-11-25)

- Wall HP: a wall breaks after so many hits, opens for **2 bars**, notes that pass through **fall out and are gone**, then
  it heals with full HP. Fewer walls = tougher: 12 walls 4 hits, hexagon 8, square 12, triangle 16 (HP = 48 / walls).
- ARP: a page with four knobs (pattern, rate, octaves, gate); the ARP button toggles it on / off; it arpeggiates **the
  band's chords**. Auto-notes are **removed** from the FM-1 entirely (it has keys).
- Shapes: **true polyhedra now** (cube, octahedron, ... orbs) with 3D bounces, not the prism's "hamster wheel".
- Chord follower: the site's all-notes logic over the **last 2 bars**, if it really is the site's logic and accurate;
  with too few notes, the **lowest note of the last 2 bars** as the root (fallback).

## Tickets (in order: small and sure first)

1. **Drums page**: "feel" -> **swing** (audible; the site's grooves), the "hat" lane shown as **hi hat** (not cut off),
   congas fixed or the kit tune floored at **-2** (+12 is fine), **portals far less often**.
2. **No auto-notes**; the ARP page arpeggiating the band's chords.
3. **Top line**: key, scale, the chord now; the chord follower (site logic over 2 bars + the lowest-note fallback).
   The scales easy to find (all 52 are in: modes, phrygian and phrygian dominant, Japanese, maqam ...).
4. **Swing / organic feel** in the band: measure the FM-1's hit timing against the site's before changing anything.
5. **Wall HP** (core/tank.c, device only, behind a setting so the plugin parity stays exact).
6. **The goo looks like one slime**, not "a bunch of balls" (density, roundness): screenshots in fm1-emu.
7. **True polyhedra** on the device (core/solid.c already has the web's solids maths; 3D physics + drawing + fps).
   Also: the FM6 chords cost the heaviest stretch 8 fps (session.sh 17.7 worst window): the frame budget, together.

## Done means

- Each ticket: a check that fails on the old behaviour (host bench or fm1-emu), sabotaged; check-host, levels, boot-check,
  session.sh green; fm1-emu fps no worse than now (default 43.9 worst window) unless the ticket says so.
- Not checkable by a machine: how swing feels, how the goo looks to Flah, whether the solids read as "cool shapes".

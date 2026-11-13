# A taller play tank on phones (look question 4)

Status: done (2026-11-12). Flah: "just look yourself and if it looks not fucked up then push it": the prototype read as the same tank turning, so it shipped.

Flah 2026-11-11: yes to "a 1.5x stretch on portrait phones, play mode only". Measured first: on a 390x844 phone the
canvas is a 362 px square (the screen's width) centred in a 715 px tall stage, and the hexagon is 298 x 290 px. A
regular shape is capped by the width, so the only way to "twice as tall" is to stretch the SPACE: the shape spins as
before and the space it spins in is 1.5x taller, so a hexagon squashes and unsquashes as it turns (a rigid tall shape
would need 1.5x the width, which a phone does not have).

That is a "does it feel right" question, so a throwaway prototype comes before the app: `_dev/proto/tall-tank.html`
(serve the repo, open it on a phone or at 860 px wide: left today, right stretched 1.5x, both spinning with balls).

## For Flah
Does the stretched one read as the same tank, turning? If yes: it gets built in play on portrait phones only, with
physics, goo and the 3D renderer following the stretch, and the plugin tripwire rerun (dev-vstparity, dev-vstmelody).
If no: the tank stays square (the stage's spare height goes to a little more room around it).

## As built (2026-11-12)
One CSS rule: on a portrait phone (`max-width:820px`, play mode) `#cv` is shown at `aspect-ratio:2/3`. The canvas keeps
its 720x720 tank coordinates, so the physics, the goo, the spaces and the plugin's numbers are untouched (no tripwire run
needed: the tank plays exactly as before; only its picture is 1.5x taller). Every screen-to-tank mapping already goes
through the canvas rect per axis (the pointer at index.html `(cx-r.left)*(W/r.width)`, `tankToScreen`, the GL canvas's
`place()`), and the GL camera keeps its square aspect while its canvas is 2:3, which is the stretch. Curved space is
drawn stretched too (an ellipse at infinity); its physics is still the hyperbolic plane. Measured on 390x844: the canvas
362x543, 76% of the stage's height, at the top of the stage (centred, the notes toggle under the tank landed on the
mixer's keys sticker; at the top it clears the mixer by 15 px). `_dev/dev-tall.js` (6 checks). The list below was the plan before the view-only
route was found; none of it was needed.

## What the build would have touched (the plan before)
`shapeVerts` (stretch after the spin), the stage's canvas size on portrait phones (720 x 1080 px), the goo's fill
area, `stageHalfW`, the 3D view's box (tank3d.js), the 2D echoes and the portal/curved spaces (curved stays round: a
stretched Poincare disk is no longer the hyperbolic plane, so curved space would not stretch). Suites: dev-phone,
dev-devices, dev-hands, dev-fluid, dev-3d, dev-space, plus a new check that the tank fills at least 50 % of the stage's
height on a 390x844 phone.

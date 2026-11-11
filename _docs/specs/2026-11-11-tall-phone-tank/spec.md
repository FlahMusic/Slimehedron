# A taller play tank on phones (look question 4)

Status: needs-info (a prototype for Flah to look at first)

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

## What the build would touch (so the size is known)
`shapeVerts` (stretch after the spin), the stage's canvas size on portrait phones (720 x 1080 px), the goo's fill
area, `stageHalfW`, the 3D view's box (tank3d.js), the 2D echoes and the portal/curved spaces (curved stays round: a
stretched Poincare disk is no longer the hyperbolic plane, so curved space would not stretch). Suites: dev-phone,
dev-devices, dev-hands, dev-fluid, dev-3d, dev-space, plus a new check that the tank fills at least 50 % of the stage's
height on a 390x844 phone.

# 14 The goo: small droplets that coagulate, a slime that swells

Status: done (2026-10-29)
Spec: `../spec.md` (Decisions: the goo)

Today each hit throws 5 drops of about one ball's volume each (a drop is ~3300 px^3, a ball 3054), and the renderer
draws landed drops as lumps sized by their spread (`tank3d.js` LUMPS: at least `PR*1.6`, `1.18*spread+PR*1.1`), so a
few drops by a wall become a blob ~3x a ball's width. New: a hit throws 3-5 droplets totalling about a third of the
ball's volume, drawn at their true size (r ~ 4 px). Landed droplets bead and slide toward the slime, merging on
contact (volume kept: r = cube root). A droplet that joins the slime is eaten: the slime swells by the bar clock's
allowance, so it is full at bar ~60-64 of the shape's 64 (`FILL_BARS`), at any tempo. Lumps are drawn by the volume
they hold, not by spread. 2D view gets the same droplet sizes. Proof: droplet radius in flight, lump radius against
its volume, fill at bar 32 and 64, frame cost. Sabotages: lumps by spread again; drops a ball's size; no swell.

## Notes (2026-10-29)
Built in 3D (`splash`, `dropStep3D`, THE SPRAY in index.html; `tank3d.js` draws a droplet at its true size and caps a
lump at 1.35x the packed size of the drops it holds). A hit: 3-5 droplets, 33% of a ball's volume, biggest 4.3 px
radius. Beads slide home at 0.4 px a tick at 4 px (Stokes: faster as they grow), pull together within 3x their
radii, merge with volume kept; the slime eats them and swells by the bar clock, or by itself each beat (12% of what
it is behind). At most 80 droplets. The first try (0.15 px a tick, 160 droplets) looked like confetti in the
screenshot at bar 6; tuned from that. 2D view is unchanged.
dev-goo3d section 10 (spray size and volume, merges, eaten into slime, nothing made or lost) and section 9 (a quiet
tank and a tank silent from bar 8 still burst at ~64 bars). Section 1 now counts droplets as goo and checks they
stay inside the glass too. Sabotages caught: drops a ball's size; no merging; no self-swell (silent tank: 120 bars).
Not caught by a machine: the lump size cap (renderer; screenshots only), and how it feels.

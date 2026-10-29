# 14 The goo: small droplets that coagulate, a slime that swells

Status: ready
Spec: `../spec.md` (Decisions: the goo)

Today each hit throws 5 drops of about one ball's volume each (a drop is ~3300 px^3, a ball 3054), and the renderer
draws landed drops as lumps sized by their spread (`tank3d.js` LUMPS: at least `PR*1.6`, `1.18*spread+PR*1.1`), so a
few drops by a wall become a blob ~3x a ball's width. New: a hit throws 3-5 droplets totalling about a third of the
ball's volume, drawn at their true size (r ~ 4 px). Landed droplets bead and slide toward the slime, merging on
contact (volume kept: r = cube root). A droplet that joins the slime is eaten: the slime swells by the bar clock's
allowance, so it is full at bar ~60-64 of the shape's 64 (`FILL_BARS`), at any tempo. Lumps are drawn by the volume
they hold, not by spread. 2D view gets the same droplet sizes. Proof: droplet radius in flight, lump radius against
its volume, fill at bar 32 and 64, frame cost. Sabotages: lumps by spread again; drops a ball's size; no swell.

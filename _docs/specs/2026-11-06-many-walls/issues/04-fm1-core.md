# 04 FM-1: portable core for the shapes
Status: ready (base firmware is still Flah's pick, brief section 8)
- `fm1/core/solid.c|h`: the same maths in C99, floats, no malloc after start. `fm1/core/draw.c`: visible faces
  only (convex: no sort), flat shaded, RGB565, drawn in 16-row bands into a 7.5 KB buffer.
- `fm1/host/`: gcc build, a test of face counts against `_dev/solid-ref.json`, and a 240x240 PNG/PPM of an orb.

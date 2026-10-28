# 0004 3D is the default view; 2D is a look, not a performance mode

Status: accepted 2026-10-15

- One tank, two views. Physics lives in the box's own frame; the side walls are the 2D shape pushed back, so every
  wall keeps its note and every lesson still works. Lessons always use the plain tank.
- Build everything to work in 2D too. 3D adds, never replaces.
- 2D and 3D cost about the same per frame, so 2D is offered as a look in the corner menu, not as a speed setting.
  The real fallback (no WebGL, lost context, slow frames) is the canvas 3D draw.

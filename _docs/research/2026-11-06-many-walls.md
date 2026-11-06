# Many walls: shapes with a wall per microtonal note, run hard without cooking a phone (2026-11-06)

Tags as in `2026-11-02-tank-perfection.md`: **[P]** primary, **[S]** secondary, **[D]** my own derivation (check it).
App facts from the code at `7ec61dc`.

## TLDR
1. **Any number of walls, always a real solid** [D]: put N points on a sphere with the Fibonacci (golden-angle)
   lattice, and make each point a face plane (normal = the point, distance = 1). The intersection of half-spaces is
   always convex, so the physics' rule "inside means n.p <= d for every plane" holds as is. The lattice is close to
   equal-area for any N (González 2010 [P], arXiv 0912.4540), so no wall is much smaller than another.
2. **Pitch reads as height for free** [D]: the lattice climbs from one pole to the other as i goes up, and the app
   already orders faces bottom to top (`solidFaceDegrees`). One face per note means the spiral IS the scale.
3. **The tank is already non-Euclidean in 3D** [D, `tank3d.js:253`]: curved solids are cut flat in Klein coordinates
   and every corner carried to the Poincare ball. In the Klein ball a hyperbolic plane is a flat plane (geodesics are
   straight lines [S], https://proceedings.mlr.press/v282/mao26a.html). So every new solid is also a curved solid
   with no new maths.
4. **WebGPU is everywhere that matters now** [S]: Safari 26 on iOS/iPadOS, Chrome 121+ on Android (Vulkan GPUs), and
   Chrome/Edge 144, Firefox 141 on desktop (web.dev, https://web.dev/blog/webgpu-supported-major-browsers). But
   three.js's `WebGPURenderer` does not run `onBeforeCompile` materials (the manual [P],
   https://threejs.org/manual/en/webgpurenderer.html), and `tank3d.js` uses it for the glass, goo and crayon looks.
   Compute work also never runs on its WebGL2 fallback [S]. So a move is a port of every material to TSL, not a
   switch. Not this pass.
5. **Heat is the limit, not peak speed** [S]: work per second is the heat. 60 fps costs about twice what 30 does
   (Unity profiling guide, https://unity.com/how-to/best-practices-for-profiling-game-performance), and a screen
   refreshing faster than the game needs adds power for nothing (Android, https://developer.android.com/games/optimize/power).
   The app's physics is a fixed 60 Hz tick, so on a 120 Hz phone half the frames draw the same tick, interpolated.
6. **The web can't read the temperature** [S]: `thermalState` is native only; infer it from frame times
   (https://abratabia.com/mobile-browser-performance/battery-and-thermal.php). The Compute Pressure API
   (`PressureObserver`, Chrome 125+, secure contexts) has a `thermals` source on some systems; MDN says not Baseline
   (https://developer.mozilla.org/docs/Web/API/PressureObserver). Use it when `knownSources` has it, frame times always.
7. **Frame interval alone misses heat** [D]: a phone holding 16.7 ms while working 14 ms of it is about to throttle,
   and the app's watchdog (`loop()`, slow = an average over 46 ms) only acts once it already has. Measure the work
   inside a frame (sim + draw) as a share of the frame, and step quality down before the interval slips.

## What limits the wall count today
- `SOLID_MAXF = 62` (grow buttons). Notes past that "stop being tellable apart". For a whole microtonal octave that's
  the point: 31-EDO x 2 octaves is 62, x 3 is 93.
- The microtonal scales are 7-note subsets (`maqamRast`, `neutral7`, `edo19` ...). No scale has every note of its EDO.
- The goo is clipped by one three.js clip plane per face (`gooClip`). Each plane is a shader uniform and a distinct
  plane count is a distinct shader program. WebGL2 only promises 224 fragment uniform vectors
  (https://registry.khronos.org/webgl/specs/latest/2.0/, MAX_FRAGMENT_UNIFORM_VECTORS) [P], and the physical material
  already uses many. Past ~24 faces the goo should be held by the physics' inset, the way curved space already is.
- `solidFaces` is O(N^2) plane clips and runs every frame while a solid morphs (900 ms). At N = 124 that is ~110k
  vertex clips a frame [D]; measure it (`dev-shapes` timing) before trusting it on a phone.

## The goo is the real cost
`tank3d.js:549`: the marching-cubes skin is ~10 MB of position, normal and colour sent to the GPU every frame, built
on the CPU. The proven cheaper route is to draw the lumps straight on the GPU: ray-march the metaball field in a
fragment shader at reduced resolution (the screen-space idea in van der Laan 2009 [P], cited in the 11-02 notes).
That moves the work to the GPU, where a phone has more headroom, and sends ~31 lump positions a frame instead of
10 MB. It changes how the goo looks, so it needs `dev-goolook` and Flah's eyes. Next pass.

## The plugin and the FM-1
- Plugin (`vst/`): the core ports the prism tank only (ADR 0008: "Not in this step: ... solids"). The GUI is a
  webview (ADR 0006), so drawing comes from the web code; the core needs the solid maths for the physics. Pure
  functions: port with tests, numbers checked against the web.
- FM-1 (`_docs/specs/2026-11-03-fm1-firmware/brief.md`): 240x240 RGB565, ~511 KB RAM, no GPU, banded 7.5 KB DMA.
  A 93-face orb at 240 px is about 8 px a face [D]: draw it as filled flat faces sorted back to front (painter's
  order is exact for a convex solid: draw only the faces facing the camera, no sort needed) in 16-row bands.
  The geometry is the same C as the plugin's maths. Base firmware is still Flah's call (brief section 8).

## Sources
- González, Á. 2010, Measurement of areas on a sphere using Fibonacci and latitude-longitude lattices, Math. Geosci.
  42(1) 49-64, https://arxiv.org/abs/0912.4540
- https://web.dev/blog/webgpu-supported-major-browsers ; https://appdevelopermagazine.com/webgpu-in-ios-26/
- https://threejs.org/manual/en/webgpurenderer.html ; https://www.utsubo.com/blog/webgpu-threejs-migration-guide
- https://developer.mozilla.org/docs/Web/API/PressureObserver ; https://developer.chrome.com/docs/web-platform/compute-pressure
- https://unity.com/how-to/best-practices-for-profiling-game-performance ; https://developer.android.com/games/optimize/power
- https://abratabia.com/mobile-browser-performance/battery-and-thermal.php
- https://proceedings.mlr.press/v282/mao26a.html (Klein model: straight geodesics)

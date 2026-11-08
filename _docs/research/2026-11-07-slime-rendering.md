# Slime rendering: why the goo looks like N64 slop and what a modern goo needs (2026-11-07)

Research only. No code was changed. Words follow `_docs/GLOSSARY.md`. Tags: **[P]** primary source (spec, paper, the
maker's own docs or source), read this pass; **[S]** secondary, used only to find a primary or where no primary
exists; **[M]** measured by me this pass; **[D]** my own derivation or judgement from the cited facts (check it).
**UNVERIFIED** = I looked and could not confirm. App facts come from `tank3d.js` / `index.html` at `46a7879`
(plus the uncommitted working tree). Vendored three.js is **r186** (`__THREE__="186"` in `vendor/three-slime.js`).

## TLDR

**The verdict.** The goo looks cheap for five reasons you can see in the code: (1) the grid is coarse. At a full pool
one cell is about **17.7 px**, and a goo drop is 10 px across (`PR3`). (2) The surface is built from **at most 40
round lumps**, so it reads as a bunch of beads. (3) The material is **matte wax**: roughness 0.5, env reflections at
0.22, and an emissive glow in the vertex colour that flattens the shading. (4) The colour is **the same brightness
everywhere**, so thin necks and thick cores look alike and nothing tells you how deep it is. (5) Drops in flight are
**flat 2D sprites** with a painted highlight, sitting next to a 3D mesh. Good-looking liquid in the literature and in
shipped games comes from a smooth surface, a sharp specular highlight with Fresnel, and **colour that depends on
thickness** (Beer-Lambert), plus some faked translucency. More polygons alone do not get you there. [D, from the
sources below]

**The recipe (stage 1, one sitting, keeps MarchingCubes):**
1. **Resolution**: `GRES` 64 on desktop (lite 40). At a full pool that is a cell of 11 px instead of 17.7 px.
   Move the field fill and the polygonising into a **Web Worker**. MarchingCubes needs no DOM: it ran in plain
   Node this pass [M]. At 64, the stock code costs **~7.4 ms of CPU a frame** on an i7-12700H [M], which is too much
   for the main thread at 120 Hz.
2. **Material** (`MeshPhysicalMaterial`, no `transmission`, see why in section 1.4): `roughness:0.15, metalness:0,
   ior:1.4, specularIntensity:1, clearcoat:1, clearcoatRoughness:0.06, envMapIntensity:1.0, sheen:0.2,
   sheenRoughness:0.5, sheenColor:<chord colour, lighter>`. Cut the vertex-colour emissive from 0.34 to about 0.10.
   Its job (keeping the pastel bright) moves to the translucency term in step 4.
3. **Thickness colour**: a back-face depth prepass of the goo (a few thousand triangles). The front pass reads it:
   `t = backDepth - frontDepth` (px). Then `absorb = 1 - exp(-t/40)`, colour = `mix(thinTint, deepTint, absorb)`,
   alpha = `0.6 + 0.4*absorb`. This is the method of GPU Gems ch.16 and Green's GDC 2010 thickness shading. Thin
   edges come out pale and see-through, cores come out rich.
4. **Translucency**: the Barré-Brisebois/Bouchard GDC 2011 term, as three.js already ships it in
   `SubsurfaceScatteringShader`: `distortion 0.2, power 3, scale 1.5, ambient 0.15`. Its thickness input is
   `1 - absorb` and it is tinted in the chord colour. Light then glows through thin goo the way a gummy candy does.
5. **Lighting**: keep the RoomEnvironment PMREM and NeutralToneMapping (already there). The key light makes **one**
   small sharp highlight. The env map gives the soft window reflections.
6. **Drops** become `InstancedMesh(IcosahedronGeometry(1,1))` (80 triangles each) in the **same goo material**. No
   more sprites.
7. **Motion**: in the vertex shader, push each vertex along its normal by a 3D noise, amplitude about 0.8 px,
   wavelength about 25 px, speed about 0.6 Hz, and turn it off under `prefers-reduced-motion`. Each lump also
   squashes and stretches with its velocity, keeping its volume, and an impact gives a damped spring wobble
   (about 4 Hz, damping 0.3).
8. **Colour**: the hue stays exactly the chord's (`LQH.h`, as now). Only lightness and saturation move with
   thickness. The test: the mean hue of the goo on screen sits within 0.03 of `liqHSL[0]`.

**Stage 2, only if stage 1 is still not "pro"**: drop the triangles. Bake the same lumps into a 96³ `R16F`
`Data3DTexture` and raymarch it in a fragment shader on a proxy box (the pattern of three.js's
`webgl_volume_perlin`). Use tricubic-filtered gradients (GPU Gems 2 ch.20) for silk-smooth normals, true thickness
from marching on to the exit point, `gl_FragDepth` so balls sort correctly, and clip planes as uniforms. Section 2
compares the options and has the cost estimates.

**Don't**: three.js `transmission` over our transparent canvas. The goo would turn see-through-grey wherever no
opaque object is behind it (section 1.4). Screen-space fluid rendering (Alice, Green 2010) is built for 10k+
particles and sees only the front surface. We have tens of lumps, it would add 4-6 render passes, and it buys us
little.

---

## 0. How the goo is built now (from the code)

- **The field**: `T.MarchingCubes(GRES, gooMat, false, true, 90000)` with `isolation=60`. `GRES = lite?32:40`
  (`tank3d.js:444-447`). The vendored copy is patched with `mc.bounds`, so only the cells the lumps reach get
  polygonised (`tank3d.js:540`, vendor `this.update`). The field box is fitted around the goo: half-size `fitH`
  runs from 70 px up to `SX = R*1.18 = 354 px` (`R=300`, `index.html:4721`). So **cell = 2*fitH/GRES = 3.5 px
  for a small pool, 17.7 px for a full one (22 px in lite)**. A goo drop has radius `PR3=10` px
  (`index.html:5109`). [D from code]
- **The lumps**: k-means groups the pooled drops into `K = clamp(round(1.25*sqrt(pooled)), 4, 40)` lumps (24 in
  lite). Each lump is one metaball, `b/d² - 24`, written straight into `mc.field` by `addLump` (`tank3d.js:477-485`).
  Each lump is a sphere, so the skin is a union of up to 40 spheres. [code]
- **Normals**: stock three.js MarchingCubes takes **central differences of the field on the grid**
  (`normal_cache[q] = field[q-1] - field[q+1]`, the same on y and z) and interpolates them along each cut edge. There
  is no smoothing pass. The optional `blur()` is never called [P: [MarchingCubes.js](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/MarchingCubes.js)]
  (the vendored copy matches this, and `blur` is in it). So the normals are only as smooth as a 2-cell stencil on
  a 17.7 px grid. [D]
- **Colour**: `liquidColor()` (`index.html:3684`) eases `liqHSL` toward the chord's colour (`chordHSL`), mixed
  between this chord and the next across the bar. `gooUpdate` clamps the result to a candy pastel (s ≥ 0.6,
  l 0.6-0.74), nudges each lump's hue ±0.07 by its own notes, and **rescales every vertex to one brightness**
  (`tank3d.js:530-547`). The goo has **no lightness variation from geometry**, only from lighting. [code]
- **Material**: `MeshPhysicalMaterial{vertexColors, roughness:0.5, clearcoat:0.3, clearcoatRoughness:0.3,
  envMapIntensity:0.22, opacity:0.92, transparent, DoubleSide}` plus the `fresnel()` patch with `em=0.34` (adds
  vertex colour × 0.34 as emission) and `cap` (back faces painted a flat `vColor*0.82`) (`tank3d.js:103-106`). The
  comment says it on purpose: "THE GOO IS WAX, NOT WET GLASS: no white sheen". [code]
- **Lights/env**: `scene.environment = PMREM(RoomEnvironment, 0.04)`, a hemisphere light 1.1, a key directional 1.7,
  a rim directional 0.9, `NeutralToneMapping` at exposure 1.05, light fog (`tank3d.js:28-36`). [code]
- **Drops in flight**: `pointsSystem(dropMat, 900, 5)`, round point sprites with a painted highlight offset to the
  top left (`tank3d.js:85-89, 657-658`). [code]
- **Canvas**: `alpha:true`, clear colour alpha 0. The page (sky, art) shows **through** the WebGL canvas
  (`tank3d.js:23-25`). This matters for transmission (section 1.4). [code]
- **Existing suites for the goo**: `dev-goo3d`, `dev-goosmooth`, `dev-goolook` (has a saved signature in
  `goolook-ref.json`, so it **asserts the old look**), `dev-gl` (asserts triangle counts) (`_dev/SUITES.md:21`).

## 1. What makes real-time liquid read as high quality

### 1.1 A smooth surface and smooth normals
- van der Laan, Green, Sainz (I3D 2009) put it plainly: particles drawn as spheres give "an unrealistic jelly-like
  appearance". Marching cubes has "grid discretization artifacts in frame-to-frame coherence ... as the grid is
  static and does not move with the fluid. This is especially visible when using low resolution grids". They say
  a real-time MC fluid with up to 3000 particles "look[s] quite blobby" [P: [van der Laan et al. 2009](https://wstahw.win.tue.nl/edu/2IV05/andrei/particle_rendering/provided/p91-van_der_laan.pdf)].
  Our goo has both problems: spheres (the lumps) on a coarse static grid. (The fitted box only moves when the goo
  leaves it, which is good for frame-to-frame stability.) [D]
- They smooth with **curvature flow**, "similar to surface tension in fluids which is responsible for the formation
  of water drops and puddles". More iterations give a smoother surface. Their figure shows 0 / 40 / 60 iterations
  [P: same paper]. So **surface tension equals low curvature variation**. In world space, the cheap version is a
  softer, wider kernel (lumps that overlap more) plus enough grid resolution to show it. [D]
- Normals from a smooth field are what make highlights flow. Sigg & Hadwiger: tricubic B-spline filtering "yields
  continuous first-order and second-order derivatives", and "the gradient of the volume is often used as a surface
  normal for shading". Their isosurface figure compares trilinear and tricubic Phong shading. Tricubic costs **8
  trilinear fetches instead of 64** [P: [GPU Gems 2 ch.20](https://developer.nvidia.com/gpugems/gpugems2/part-iii-high-quality-rendering/chapter-20-fast-third-order-texture-filtering)].
  This only applies if the field lives in a 3D texture (stage 2).
- For raymarched SDFs: Quilez's **tetrahedron normal** takes 4 field evaluations (central differences take 6) and
  is unbiased. Choose `h` close to the pixel footprint to avoid aliasing. WebGL compilers may inline `f()` 4 times
  and crash, which a loop trick avoids [P: [iq, normalsSDF](https://iquilezles.org/articles/normalsSDF/)].

### 1.2 A physically based material (the exact three.js parameters, r186)
All quotes from [P: [three.js MeshPhysicalMaterial docs](https://threejs.org/docs/pages/MeshPhysicalMaterial.html)]:
- **Cost**: "`MeshPhysicalMaterial` has a higher performance cost, per pixel, than other three.js materials. Most
  effects are disabled by default, and add cost as they are enabled. For best results, always specify an
  environment map".
- `roughness` 0..1. `ior` default 1.5, range 1.0-2.333. `specularIntensity` 0..1 ("When set to zero, the model is
  effectively Lambertian"). `specularColor` tints F0.
- `clearcoat` 0..1, "a thin translucent layer over the base layer". `clearcoatRoughness` 0..1.
- `sheen` 0..1, `sheenColor` (default black), `sheenRoughness` (default 1).
- `iridescence` 0..1, `iridescenceIOR` 1.0-2.333 (default 1.3). `iridescenceThicknessRange` is **deprecated since
  r187** in favour of `iridescenceThicknessMinimum/Maximum`. We are on r186, and `glassFor` uses the old name, so
  watch for this on the next three.js bump.
- `transmission` 0..1: "When transmission is non-zero, `opacity` should be set to `1`". `thickness` is "given in
  the coordinate space of the mesh" (0 = thin-walled). `attenuationColor` is "The color that white light turns into
  due to absorption when reaching the attenuation distance". `attenuationDistance` is "given in world space units,
  and must be greater than zero". `dispersion` works only with transmission.
- **Scale gotcha for us** [D]: the goo mesh is scaled by `fitH` (70-354), and three.js multiplies the refraction
  ray by the model scale (`normalize(refractionVector) * thickness * modelScale`) [P: [transmission_pars_fragment](https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderChunk/transmission_pars_fragment.glsl.js)].
  So `thickness` would have to be `px / fitH` and change every time the box refits. `attenuationDistance` is in
  world (box px) units.
- **Values for a wet, glossy slime** [D, from the parameter semantics above]: roughness **0.12-0.2** (one tight
  highlight; 0.5 smears it into the wax look we have). ior **1.33-1.45**, which is water to gel; F0 =
  ((ior-1)/(ior+1))² = 0.02-0.034. clearcoat **1** with clearcoatRoughness **0.04-0.08** (the wet film that gives
  a sharp glint over a slightly softer body). envMapIntensity **0.8-1.2** (0.22 kills the reflections that say
  "wet"). Optional sheen **0.15-0.3** with a lighter chord colour (a soft velvety rim, like a gummy). Skip
  iridescence: it reads as soap film or oil, not slime.
- **Readability caution from a shipped game**: Nintendo moved Splatoon 2's ink to "物理ベースシェーディング"
  (physically based shading) because Splatoon 1's ink looked "のっぺり" (flat) and "not like ink". With PBR,
  shaded ink went dark, and the team colours got hard to tell apart. Raising the specular made squids diving into
  ink hard to see. They put playability first [P: [Nintendo recruiting interview, Ueda](https://www.nintendo.co.jp/jobs/keyword/51.html)].
  For us [D]: the chord colour is information for a child. Keep a lightness floor (the hemisphere light, wrap
  lighting, translucency) so the shadow side of the goo never goes muddy, and keep the highlight small.

### 1.3 Environment reflections and Fresnel
- Green (GDC 2010) and the Alice fluid build the final look from layers, shown one by one: diffuse N·L, **wrapped
  diffuse `(N·L)*0.5+0.5`**, specular, Fresnel, cubemap reflection, cubemap reflection × Fresnel, then everything
  together [P: [Alice: Madness Returns fluid article, NVIDIA](https://developer.download.nvidia.com/tools/docs/Fluid_Rendering_Alice.pdf);
  [Green GDC 2010 slides](https://developer.download.nvidia.com/presentations/2010/gdc/Direct3D_Effects.pdf)].
- three.js does Fresnel and env reflection inside MeshPhysicalMaterial (`EnvironmentBRDF`, PMREM roughness mips)
  once `scene.environment` is set, which it already is [P: transmission_pars_fragment above, which uses
  `EnvironmentBRDF`; app code]. Our custom `fresnel()` patch raises **alpha** at grazing angles. For goo it should
  stay small (or zero), because the physical Fresnel already brightens the rim with reflection. [D]
- `RoomEnvironment` gives soft box lights: good for glossy goo without downloading an HDR. The PMREM sigma 0.04
  blurs it a little. Raise envMapIntensity rather than adding a second env. [D]

### 1.4 Refraction of what is behind: why NOT three.js transmission here
- How three.js does it: when transmissive objects exist, `renderTransmissionPass` renders the **background and the
  opaque list** into a per-camera render target: HalfFloat when it can, **MSAA `Math.max(4, capabilities.samples)`**,
  `generateMipmaps:true`, sized `viewport × transmissionResolutionScale` (default 1). The doc comment says lowering
  that scale "can result in significant performance improvements". DoubleSide transmissive objects get an extra
  back-face render [P: [WebGLRenderer.js](https://github.com/mrdoob/three.js/blob/dev/src/renderers/WebGLRenderer.js)].
  **Transparent objects (our glass, panes, trails) are not in that target**, so the goo could refract only balls
  and anything else opaque. [P, D]
- **The blocker** [D from the shader source]: the transmitted sample's alpha feeds the output alpha.
  `material.transmissionAlpha = mix(material.transmissionAlpha, transmitted.a, material.transmission)`
  [P: [transmission_fragment](https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderChunk/transmission_fragment.glsl.js)],
  and `getIBLVolumeRefraction` returns `vec4((1-F)*attenuatedColor, 1-(1-transmittedLight.a)*transmittanceFactor)`
  [P: transmission_pars_fragment]. Our canvas clears to alpha 0 and the page shows through it. So wherever no
  opaque object sits behind the goo, the transmitted rgb is 0 and the alpha is about `1 - transmittance`: the goo
  turns into a **dark, see-through film** over the pale page. The chord colour, the one thing the goo must carry,
  is lost. To use real transmission you would need an opaque backdrop inside the 3D scene. UNVERIFIED in a
  browser; a 10-minute test would settle it.
- glTF agrees that transmission is "infinitely-thin materials with no refraction, scattering, or dispersion", and
  that clients should "aim to display at least opaque objects through a transmissive material" [P: [KHR_materials_transmission](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_transmission/README.md)].
  `KHR_materials_volume` adds Beer-Lambert: `σt = -log(c)/d`, `T(x) = e^(-σt·x) = c^(x/d)`, and "Computing
  volumetric effects with a thickness map is a lossy process" [P: [KHR_materials_volume](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_volume/README.md)].
  `KHR_materials_diffuse_transmission` (Release Candidate) is the glTF answer for "dense, optically thick objects
  like wax candles" [P: [KHR_materials_diffuse_transmission](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_diffuse_transmission/README.md)].
  That is closer to slime than glass transmission. I did not check whether three.js r186 supports it (UNVERIFIED).
- **So**: do the **Beer-Lambert colour ourselves** from a measured thickness (1.5) and blend with ordinary alpha.
  If an opaque note sits behind the goo, an optional small screen-space offset of a copy of the opaque pass,
  `uv + N.xy*thickness*k` (Green's 2D refraction trick: `tex2D(bgSampler, texcoord+N.xy*thickness)`), would bend
  it [P: Green slides]. That is stage-2 polish.

### 1.5 Thickness: the cue that sells "volume"
- Green: "shade fluid as semiopaque using thickness through volume to attenuate color", "Beer's Law: Light decays
  exponentially with distance. Use different constant k for each color channel: I = exp(-kd)". He generates
  thickness by additive splats (low resolution is fine) [P: Green slides]. van der Laan: thickness "is used to
  attenuate the color and transparency of the fluid" [P: paper].
- GPU Gems ch.16 (Green): thickness = exit depth minus entry depth from depth maps, `s = d_o - d_i`, then
  `exp(-si * sigma_t)` [P: [GPU Gems ch.16](https://developer.nvidia.com/gpugems/gpugems/part-iii-materials/chapter-16-real-time-approximations-subsurface-scattering)].
- **Our version** [D]: render the goo mesh once with `side:BackSide` into a depth target (half resolution is
  enough; a few thousand triangles). The front pass then computes `t = linearDepth(back) - linearDepth(front)` in
  px. Where the glass clips the back away (goo pressed on the glass), clamp `t` to the distance to the glass
  plane, which `glassList()` already has. With `t`, the per-channel absorption `T = c^(t/d)` is the glTF formula
  above, with `c` = the chord colour (linear) and `d` ≈ 30-50 px (a drop is 20 px across, so one drop gives a light
  tint and a full pool a deep one).

### 1.6 Subsurface scattering approximations
- **Wrap lighting** (GPU Gems ch.16): `wrap_diffuse = max(0, (dot(L,N) + wrap) / (1 + wrap))`, wrap 0..1, plus a
  tint near the terminator [P: GPU Gems ch.16]. Alice used half-Lambert, `(N·L)*0.5+0.5` [P: Alice article].
- **Fast translucency** (Barré-Brisebois & Bouchard, DICE, GDC 2011; Frostbite 2 / Battlefield 3). three.js ships
  it as `SubsurfaceScatteringShader` with the comment "Based on GDC 2011 – Approximating Translucency for a Fast,
  Cheap and Convincing Subsurface Scattering Look". The code:
  `scatteringHalf = normalize(L + N*thicknessDistortion); scatteringDot = pow(saturate(dot(V, -scatteringHalf)),
  thicknessPower) * thicknessScale; scatteringIllu = (scatteringDot + thicknessAmbient) * thickness;
  directDiffuse += scatteringIllu * thicknessAttenuation * lightColor`. Defaults: distortion 0.1, power 2, scale
  10, ambient 0, attenuation 0.1. The example uses distortion 0.1, ambient 0.4, attenuation 0.8, power 2, scale 16
  [P: [SubsurfaceScatteringShader.js](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/shaders/SubsurfaceScatteringShader.js),
  [webgl_materials_subsurface_scattering](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_materials_subsurface_scattering.html)].
  The original gets thickness from inverted, inward-facing AO [S: [Poh 2025, comparison paper](https://bentobaux.github.io/assets/research/realtime-subsurface-scattering/paper.pdf);
  the talk page [colinbarrebrisebois.com](https://colinbarrebrisebois.com/2011/03/07/gdc-2011-approximating-translucency-for-a-fast-cheap-and-convincing-subsurface-scattering-look/)
  has no formulas]. **Ours** [D]: thickness input = `1 - absorb` from 1.5 (thin = glows), and the rim light (already
  behind the tank at (500,-200,-600)) makes a backlit glow through thin goo.

### 1.7 Highlights, caustics, shadows
- A single tight highlight comes from low roughness plus one strong directional light (Green and Alice use
  Blinn-Phong specular; van der Laan "a Phong specular highlight" [P]). The env map gives broad reflections and the
  key light gives the glint. [D]
- **Caustics**: Green: "Refractive caustics are generated when light shines through a transparent and refractive
  material". The method is to refract from the light's view and splat; it "Can be used during surface shading to
  perturb normal" [P: Green slides]. **Coloured shadows**: "Since fluid is translucent, we expect it to cast
  coloured shadows", done by rendering thickness from the light [P: Green slides]. For us [D]: the tank has no
  floor to catch them. The cheap version is to tint the existing `shadowMat` point shadows in the chord colour and
  add a faint bright spot in the middle (a fake focus). Low priority.

## 2. Alternatives to marching cubes

| technique | how | quality | cost | fit for 20-200 drops + a pool in a glass box, WebGL2 + three.js r186 |
|---|---|---|---|---|
| **MarchingCubes, CPU (now)** | field on a grid, triangles, three.js lighting | polygonal at low res. "Grid discretization artifacts" [P van der Laan] | O(res³) CPU, measured below | OK up to res ~64 if moved to a worker. Keeps all three.js lighting, clipping and depth for free [D] |
| **Raymarch a baked 3D texture** | lumps → `Data3DTexture` (R16F), proxy box, march + refine | as smooth as the filter. Tricubic gives C² normals [P GPU Gems 2] | per pixel: steps + gradient fetches; field upload 96³×2 B = 1.7 MB a frame [D] | **Best stage 2.** three.js has the pattern: `webgl_volume_perlin` (128³ R8, 200 steps, 4 bisection refinements, central-difference normals) [P: [example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_volume_perlin.html)]. You must do clip planes, depth and lighting yourself [D] |
| **Raymarch analytic smin of spheres** | sphere tracing `smin` over N lumps | perfect silhouette, analytic blend; iq's `smin` k = the blend thickness in distance units [P: [iq smin](https://iquilezles.org/articles/smin/)] | steps × N per pixel (≈32×40 = 1280 sphere evaluations) [D] | Good for ≤ ~16 lumps. Too heavy at 40 on phones without tile culling [D]. Note: the quadratic/cubic smin are **not associative** (blend order matters). "the Exponential and the Circular Geometrical can be blended in any order" [P iq], so use exponential for many lumps |
| **Screen-space fluid** (van der Laan 2009, Green 2010, Alice) | sphere depth splats → bilateral blur or curvature flow → normals from depth → shade. Plus a thickness pass | very smooth, with view-dependent LOD | 1024×768, 8800GTS, 64k particles: **17.5 ms** quarter-res 15 iterations, **19.6** half 40, **50.0** full 100; bilateral Gaussian 18.1 ms [P: paper Table 1]. Filter capped at "e.g. 50 pixels" [P: Green] | Poor fit: "Only generates surface closest to camera" [P Green]. 4-6 extra passes in three.js. Babylon.js ships one (since 5.36.0, "implementing the method described in an NVIDIA GDC 2010 presentation") [P: [Babylon fluid renderer](https://doc.babylonjs.com/features/featuresDeepDive/particles/fluid_renderer)]; three.js has none [D] |
| **GPU marching cubes** | geometry shader / stream-out (GPU Gems 3 ch.1: 32³-cell blocks, 6-sample gradient normals; ~260 blocks/s on an 8800 with the best method) [P: [GPU Gems 3 ch.1](https://developer.nvidia.com/gpugems/gpugems3/part-i-geometry/chapter-1-generating-complex-procedural-terrains-using-gpu)] | as MC, at higher res | GPU | WebGL2 has no geometry or compute shaders. Only realistic with WebGPU (`WebGPURenderer`), which would be a renderer swap [D] |

**Choice** [D]: stage 1 keeps MC (cheapest change, all three.js features keep working). Stage 2 is the 3D-texture
raymarch. The lumps already make a small, temporally smooth field, which is exactly what a 3D texture wants.

## 3. How games make goo look good (sourced only)
- **Alice: Madness Returns** (Spicy Horse + NVIDIA, 2011): the black goop is SPH with "over 10,000" particles,
  rendered screen-space: sphere depth sprites, a "two pass bilateral filter that preserves sharp discontinuities",
  normals from depth differences, then diffuse / wrapped diffuse / specular / Fresnel / cubemap layers, and a
  thickness pass drawn "using additive blending (no depth test)" at low resolution. They chose this because MC
  "will not produce the desired detail while keeping the frame rate at playable levels" [P: Alice article].
- **Portal 2 gels**: the same NVIDIA article sets Alice against them: "the fluid in Alice ... does not become a decal
  when it hits the ground", which implies Portal 2's gel lands as a decal [P: Alice article]. Valve's wiki says gel
  splats use paintmaps scaled by the lightmap scale [S: search snippet of
  [Valve Developer Wiki, Gel (Portal 2)](https://developer.valvesoftware.com/wiki/Gel_(Portal_2)); the page
  returned 403 to me, UNVERIFIED]. I found no Valve talk on the falling blobs' rendering (UNVERIFIED).
- **Splatoon 1 → 2**: flat ink became physically based shading, then was tuned back for readability (team colour
  in shadow, highlights hiding squids) [P: Nintendo interview, section 1.2].
- **Claybook** (Second Order, GDC 2018): "a GPU-based clay and fluid simulator ... signed distance field
  modelling, and ray traced visuals", 60 fps on that generation's consoles [P: [GDC Vault abstract](https://gdcvault.com/play/1025030/Advanced-Graphics-Techniques-Tutorial-GPU)].
  This is proof that SDF raymarched goo ships, but the details are in the talk video, which I did not read
  (UNVERIFIED).
- **Slime Rancher**: no rendering talk found. The art director says the "weird blobby effect on Slime Rancher
  shadows comes from manipulating the primary lit shader within HDRP" [S: [Unity case study](https://unity.com/resources/slime-rancher-2)].
  Popovich's GDC 2017 talk is about emergent storytelling [S: [GDC Vault](https://gdcvault.com/play/1024296/A-Thousand-Tiny-Tales-Emergent)].
  Nothing usable on the slime material (UNVERIFIED).

## 4. Performance budgets

### 4.1 MarchingCubes cost vs resolution [M]
Stock three.js MarchingCubes from the vendored r186, run in Node 30 frames (5 warm-up dropped) on an **i7-12700H**.
40 balls (`addBall`, strength 0.35, subtract 12, isolation 60), **full grid, no `bounds`**:

| res | reset | 40 × addBall | update (polygonise) | triangles | total CPU |
|---|---|---|---|---|---|
| 32 | 0.07 ms | 0.30 | 0.53 | 2.8k | 0.9 ms |
| 40 | 0.11 | 0.60 | 1.18 | 4.4k | 1.9 |
| 56 | 0.32 | 1.61 | 3.00 | 8.6k | 4.9 |
| 64 | 0.52 | 2.50 | 4.42 | 11.3k | 7.4 |
| 80 | 1.01 | 5.07 | 8.29 | 17.7k | 14.4 |
| 96 | 1.88 | 8.45 | 13.68 | 25.4k | 24.0 |
| 128 | 6.77 | 34.87 | 57.73 | 45.3k | 99 |

- The scan visits `(size-2)³` cells whether they hold goo or not, and the default `maxPolyCount` is 10000 [P:
  MarchingCubes.js]. Cost grows with res³, as the table shows. The app's own `addLump` (stiffer kernel, no
  per-call Color) and `bounds` cut the first and last columns. The app's real numbers are in `gl.stats().gooMs`
  and `window.__gooT`; measure those in the browser before and after (Node's V8 is close to Chrome's, but this is
  not the browser number).
- The upstream example's GUI allows res 14-100 (default 28) and 1-50 blobs [P: [webgl_marchingcubes](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_marchingcubes.html)].
- Budget [D]: at 120 Hz a frame is 8.3 ms. Goo on the main thread should stay ≤ ~2 ms, which today's res 40 with
  bounds meets. Res 64 needs the worker: post the lump list (40 × 5 floats) and get back transferable position,
  normal and colour buffers, one frame late. The `gooUpdate` easing already hides a one-frame lag. GPU cost of
  11k triangles is trivial; upload of the used range only is already done (`tank3d.js:552`).

### 4.2 Transmission pass cost [P + D]
One extra render of background + opaque objects per camera per frame into a HalfFloat 4×MSAA target with a full
mip chain, plus a back-face re-render of DoubleSide transmissive meshes [P: WebGLRenderer.js].
`transmissionResolutionScale = 0.5` quarters the fill [P: same]. On our scene the opaque list is small (balls), so
the cost is mostly fill + resolve + mips at full canvas size. That is cheap on a laptop. But see section 1.4: it
does not give the look we want.

### 4.3 Raymarch cost per pixel [D, UNVERIFIED until measured]
- 3D-texture march: ~48-64 steps + 4 bisection + 8 fetches for a tricubic gradient (or 6 for central differences)
  ≈ **70-80 texture fetches per covered pixel**. If the goo covers 40% of a 720² CSS tank at dpr 2 (≈ 830k px),
  that is ≈ 60M fetches a frame, ≈ 3.6 G/s at 60 Hz. Fine on a laptop dGPU, heavy on a phone. **Half-resolution
  goo + bilateral upsample** (van der Laan found half and quarter res "can look better than full resolution from
  close up" because it is smooth [P]) or empty-space skipping (start the march at the lumps' bounding spheres)
  brings it down 4×.
- Analytic smin: ≈ 32 steps × 40 lumps × ~10 flops ≈ 13k flops a pixel, ≈ 10 GFLOP a frame at 830k px, ≈ 640
  GFLOP/s at 60 Hz. Too much for phones without per-tile lump lists.
- GPU timing in the app: `EXT_disjoint_timer_query_webgl2`, a `TIME_ELAPSED_EXT` query around the goo draw,
  discarded when `GPU_DISJOINT_EXT` is set [P: [Khronos registry](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/)].

## 5. Recommended recipe in detail

**Stage 1: same mesh, new skin (one sitting per item; tickets if built)**
1. `GRES = lite ? 40 : 64`. Cap the cell at about 11 px at the biggest `fitH`. Field fill + `update()` go into a
   Worker (MarchingCubes is DOM-free [M]). Main thread: post lumps, swap in the returned buffers.
   Fallback: if no Worker, keep 40 on the main thread.
2. Make the lumps' blend softer, so the skin reads as one body, not beads: raise the lump radius overlap (`1.18 ×
   spread + 1.1 PR3` → try `1.3 × spread + 1.3 PR3`) or ease `LSUB` from 24 toward 16. Check against the CORE3
   cap so a few drops by the glass still don't swell. [D: tune by screenshot]
3. `gooMat`: `roughness 0.15, ior 1.4, specularIntensity 1, clearcoat 1, clearcoatRoughness 0.06,
   envMapIntensity 1.0, sheen 0.2, sheenRoughness 0.5, sheenColor = chord colour lightened 30%`. The `fresnel()`
   patch keeps `cap`, drops `em` to about 0.10, and sets `edge` 0.
4. **Thickness prepass**: a `WebGLRenderTarget` at half size with a depth texture. Render the goo with
   `side:BackSide` and a depth-only material each frame, before the main render (same clip planes). In the goo
   shader (onBeforeCompile, `opaque_fragment`): read back depth, `t` in px, `absorb = 1 - exp(-t/40)`.
   `diffuseColor.rgb = mix(thin, deep, absorb)`, where thin = chord HSL with l+0.10, s-0.05 and deep = l-0.15,
   s+0.10 (same hue). `diffuseColor.a = 0.6 + 0.4*absorb`.
5. **Translucency term** (in the lights loop via `RE_Direct`, as `SubsurfaceScatteringShader` does): distortion 0.2,
   power 3, scale 1.5, ambient 0.15, attenuation 0.6, thickness = `(1-absorb) * chordColour`.
6. **Drops**: `InstancedMesh(IcosahedronGeometry(1,1), gooMat-variant, 900)` with an instance colour and scale
   `p.r`. The spray's fade goes to an instance alpha attribute. Up to 900 × 80 = 72k triangles [D].
7. **Motion**: in the vertex shader, `position += normal * 0.8 * snoise(position/25 + uT*0.6)` (px, the box frame).
   Each lump gets an ellipsoid scale along its eased velocity, `1 + 0.15*min(1,|v|/vmax)` (perpendicular axes
   `1/sqrt` of that, so volume is kept), and a damped spring on its radius kicked by a wall hit or burst (about
   4 Hz, damping ratio 0.3). Under `prefers-reduced-motion`: noise 0, spring off.
8. **Colour rule**: hue = `LQH.h` (and the existing ±0.07 per-lump nudge). Thickness changes lightness and
   saturation only. Keep the pastel floor so the shadow side stays readable (the Splatoon lesson).

**Stage 2: the raymarched volume (only if stage 1 is judged not enough)**
- Fill a `Data3DTexture(96³, RedFormat, HalfFloatType, LinearFilter)` from the same `addLump` (on the worker, 1.7 MB
  a frame), or splat lumps slice by slice on the GPU.
- Proxy: a `BoxGeometry` at the fitted field box, `side:BackSide`, a custom `ShaderMaterial`. Slab test, march 48
  steps, 4 bisections, tricubic gradient (8 fetches), test the glass planes as uniforms (`n·p ≤ d`; cap at 24 as
  now), write `gl_FragDepth`.
- Shading in the same shader: env via three.js's own `textureCubeUV(envMap, dir, roughness)` (present in r186
  [code: vendor]) with the PMREM texture as the uniform, GGX key light, Fresnel (Schlick, F0 0.028), and Beer
  thickness from marching on to the exit point. That gives true thickness for free, with no prepass.
- Half-resolution render target + upsample if the timer query says it is over budget.

## 6. Checks for a test suite (all numbers to be measured on the current build first, then the thresholds set)
The standards say "measure before picking a number". So run each check on today's goo, record it, and set the
threshold between old and new.
1. **Silhouette smoothness**: dev-goolook's fixed PLANT. Render goo-only (balls and glass hidden) at 720², take the
   alpha mask, trace the outer contour, resample every 3 px, and measure the turning angle. Assert the **max
   corner angle** and the **count of corners > 15°** go down from today's (facets show as spikes; a smooth curve
   has none).
2. **Mesh normal smoothness** (headless, from `mc.normalArray`): the p95 angle between adjacent triangles' face
   normals, at the same PLANT and a full pool. Report res 40 vs 64.
3. **Shading continuity**: in the goo region, the p99 of the 2nd derivative of luminance (Laplacian) away from
   the silhouette. Faceting gives ridges.
4. **Specular**: at least one highlight blob with luminance ≥ 0.92 inside the goo mask, covering 0.2-3% of goo
   pixels (a glint, not a sheen).
5. **Thickness cue**: the mean L* of the outer 4-px ring of the goo minus the core's ≥ +6, and the ring's alpha <
   the core's.
6. **Hue held**: circular mean hue of goo pixels within 0.03 of `liqHSL[0]`, mean saturation ≥ 0.45. Run it for
   three chords (warm, cool, minor).
7. **Drops match the pool**: the mean hue of droplet pixels equals the pool's within 0.03.
8. **Cost**: `gl.stats().gooMs` p95 on the main thread ≤ 2 ms (≤ 0.5 ms with the worker). The goo draw's GPU time
   via `EXT_disjoint_timer_query_webgl2` ≤ 2 ms at 1440² on Flah's laptop. `dev-governor` and `dev-goosmooth`
   still green.
9. **Clip**: `gooOut().reach` and `__gooClipN` unchanged (dev-orb, dev-goo3d).
10. **Reduced motion**: with the media query emulated, two frames at the same tick give identical goo vertex
    positions (no wobble).
11. **Screenshot pair**: before and after PNGs of the same PLANT for Flah (the screenshot wins over the numbers).
    Then `dev-goolook --save` only after Flah accepts the look.
12. **Sabotage**: set roughness back to 0.5 (check 4 goes red), force `absorb=0.5` (check 5), GRES 24 (checks
    1-2), and hue + 0.2 (check 6).

**Suites that assert the old look and must change in the same pass**: `dev-goolook` (the reference signature),
`dev-gl` (triangle counts 96-120), `dev-goosmooth` (cost thresholds, if the worker changes what is timed),
possibly `dev-look3d` and `dev-3d` if they read goo pixels (grep before building).

## 7. What I could not verify
- How any of this looks or feels: no browser render was done this pass.
- The transmission alpha problem (section 1.4) is read from the shader source, not seen on screen.
- The raymarch costs (4.3) are arithmetic, not measured. The MC table is Node on one CPU, not Chrome.
- Portal 2 gel rendering details, Claybook's slides, and Slime Rancher's slime material.
- Whether three.js r186 implements `KHR_materials_diffuse_transmission`.

## Sources
- van der Laan, Green, Sainz, "Screen Space Fluid Rendering with Curvature Flow", I3D 2009, pp. 91-98: https://wstahw.win.tue.nl/edu/2IV05/andrei/particle_rendering/provided/p91-van_der_laan.pdf
- Green, "Screen Space Fluid Rendering for Games", GDC 2010: https://developer.download.nvidia.com/presentations/2010/gdc/Direct3D_Effects.pdf
- Green, Tonge, Sainz, Johnston, Schoemehl, "Fluid Simulation in Alice: Madness Returns", NVIDIA: https://developer.download.nvidia.com/tools/docs/Fluid_Rendering_Alice.pdf
- Green, GPU Gems ch.16 "Real-Time Approximations to Subsurface Scattering": https://developer.nvidia.com/gpugems/gpugems/part-iii-materials/chapter-16-real-time-approximations-subsurface-scattering
- Sigg & Hadwiger, GPU Gems 2 ch.20 "Fast Third-Order Texture Filtering": https://developer.nvidia.com/gpugems/gpugems2/part-iii-high-quality-rendering/chapter-20-fast-third-order-texture-filtering
- Geiss, GPU Gems 3 ch.1 "Generating Complex Procedural Terrains Using the GPU": https://developer.nvidia.com/gpugems/gpugems3/part-i-geometry/chapter-1-generating-complex-procedural-terrains-using-gpu
- Quilez, "Smooth minimum": https://iquilezles.org/articles/smin/ ; "Normals for an SDF": https://iquilezles.org/articles/normalsSDF/
- three.js MeshPhysicalMaterial docs: https://threejs.org/docs/pages/MeshPhysicalMaterial.html
- three.js source: MarchingCubes.js https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/MarchingCubes.js ; WebGLRenderer.js https://github.com/mrdoob/three.js/blob/dev/src/renderers/WebGLRenderer.js ; transmission_fragment https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderChunk/transmission_fragment.glsl.js ; transmission_pars_fragment https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderChunk/transmission_pars_fragment.glsl.js ; opaque_fragment https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderChunk/opaque_fragment.glsl.js ; SubsurfaceScatteringShader https://github.com/mrdoob/three.js/blob/dev/examples/jsm/shaders/SubsurfaceScatteringShader.js
- three.js examples: webgl_marchingcubes https://github.com/mrdoob/three.js/blob/dev/examples/webgl_marchingcubes.html ; webgl_materials_physical_transmission https://github.com/mrdoob/three.js/blob/dev/examples/webgl_materials_physical_transmission.html ; webgl_materials_subsurface_scattering https://github.com/mrdoob/three.js/blob/dev/examples/webgl_materials_subsurface_scattering.html ; webgl_volume_perlin https://github.com/mrdoob/three.js/blob/dev/examples/webgl_volume_perlin.html
- Khronos glTF: KHR_materials_transmission https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_transmission/README.md ; KHR_materials_volume https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_volume/README.md ; KHR_materials_diffuse_transmission https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_diffuse_transmission/README.md
- Khronos WebGL EXT_disjoint_timer_query_webgl2: https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/
- Barré-Brisebois & Bouchard, GDC 2011 (talk page): https://colinbarrebrisebois.com/2011/03/07/gdc-2011-approximating-translucency-for-a-fast-cheap-and-convincing-subsurface-scattering-look/ ; described in Poh 2025: https://bentobaux.github.io/assets/research/realtime-subsurface-scattering/paper.pdf
- Nintendo recruiting interview (Splatoon ink): https://www.nintendo.co.jp/jobs/keyword/51.html
- GDC Vault, Claybook (Aaltonen 2018): https://gdcvault.com/play/1025030/Advanced-Graphics-Techniques-Tutorial-GPU
- Babylon.js Fluid Renderer: https://doc.babylonjs.com/features/featuresDeepDive/particles/fluid_renderer
- Unity, Slime Rancher 2 case study: https://unity.com/resources/slime-rancher-2 ; GDC Vault, Slime Rancher talk: https://gdcvault.com/play/1024296/A-Thousand-Tiny-Tales-Emergent
- Valve Developer Wiki, Gel (Portal 2) (403 to me; snippet only): https://developer.valvesoftware.com/wiki/Gel_(Portal_2)

# 01 Orbs: a wall per note
Status: done
- `seedPlanes('orbN')`: Fibonacci lattice, N planes. `isSolidName` takes `orb\d+`. Menu value `orb` resolves to
  `orb` + clamp(totalDegrees(), 12, 124) in `buildEdges`, so scale/range changes rebuild it.
- `solidFaceDegrees` maps an orb's faces one note each (no chord-tone snapping), bottom to top.
- Scales `edo19all`, `edo24`, `edo31` (drone harmony), in the Advanced group; same table in `vst/` scales.rs.
- `tank3d.js` `gooClip`: no clip planes past 24 faces (physics inset holds the goo, as in curved space).
- Proof: `dev-orb` + sabotage. Targeted: dev-solid, dev-shapes, dev-space, dev-gl (if GPU), dev-learnmap.

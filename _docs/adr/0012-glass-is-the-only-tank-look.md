# 0012 Glass is the only tank look (the crayon tank look is removed)

Status: accepted 2026-11-03 (Flah), built 2026-11-07. Look questions: `_docs/specs/2026-10-29-web-first/look-questions.md`.

- The GPU tank had two looks: glass (the default) and crayon (the tank drawn like the page's art), switched by a
  "look" row in the tank's corner view menu, shown only in 3D with the graphics-card renderer, plus `?look=` and the
  saved `slimehedron-look`.
- Flah (2026-11-03): "i dont even see a crayon/glass toggle? if this isnt used just forget the crayon shit and focus
  on optimizing this to look clean".
- So the tank has one look, glass. The look row, `?look=`, the saved setting and the crayon branch of the renderer go.
  A saved or linked `look=crayon` is ignored (glass draws). The crayon art of the PAGE (the sky, the stickers, the
  mascots, the map, the slime art) is not this decision: it stays (STYLE_GUIDE, ART-BRIEF).
- Rules out: a second tank look without a new ADR. `dev-crayon` and the crayon cases in other suites are retired or
  turned into "glass only" checks in the same pass.

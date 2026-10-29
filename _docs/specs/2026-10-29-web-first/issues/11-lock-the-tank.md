# 11 Lock the tank for the plugin

Status: ready
Blocked by: 02, 03, 04 (and 04's follow-up spec, if real 3D wins)
Spec: `../spec.md` (Done means: Locked), brief section 2

Rerun `dev-vstparity` (rewrites `../../2026-10-28-tank-headless/web-stats.json`) and `dev-vstmelody` (rewrites the
golden file in `vst/slimehedron-core/src/tank/`, the one write into `vst/` this spec allows) on the final tank.
Commit the new numbers, and say in the handoff's open block that the plugin can resume at tickets 05 / 07 / 06.

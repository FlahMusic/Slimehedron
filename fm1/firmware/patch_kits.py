#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Slimehedron for the FM-1: puts the site's drum kits (slime_kits.py, from fm1/host/gen-kits.js) into a COPY of SLOOP's
tools/gen_drumkits.py, at the end of its KITS list, as text (SLOOP's level_drumkits.py reads the kit names from that
file's text), and their measured lane levels (slime_kit_levels.json) into its drumkit_levels.json.
   patch_kits.py TOOLS_DIR"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).parent
tools = Path(sys.argv[1])
gen = tools / "gen_drumkits.py"
s = gen.read_text(encoding="utf-8")
if "SLIMEHEDRON" not in s:
    start = s.index("KITS = [")
    end = s.index("\n]\n", start)
    s = s[:end] + "\n" + (HERE / "slime_kits.py").read_text(encoding="utf-8").rstrip("\n") + s[end:]
    gen.write_text(s, encoding="utf-8")
lv = HERE / "slime_kit_levels.json"
if lv.exists():
    p = tools / "drumkit_levels.json"
    d = json.loads(p.read_text()) if p.exists() else {}
    d.update(json.loads(lv.read_text()))
    p.write_text(json.dumps(d, indent=1) + "\n")
print("patch_kits: the site's kits are in", gen)

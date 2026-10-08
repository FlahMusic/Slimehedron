#!/usr/bin/env python3
"""Emit MANIFEST.csv (one row per file) + MANIFEST.md (source/license summary)."""
import os, csv, glob, sys, json, re
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from midi2patterns import style_of

SRC = {
 'casio-rhythms':    ('casio-music-data (github: nicholasopuni31)', 'NO FORMAL LICENSE — README grants use w/ credit', 'FLAG'),
 'drums/casio':      ('casio-music-data (github: nicholasopuni31)', 'NO FORMAL LICENSE — README grants use w/ credit', 'FLAG'),
 'bass/casio':       ('casio-music-data (github: nicholasopuni31)', 'NO FORMAL LICENSE — README grants use w/ credit', 'FLAG'),
 'chords/casio-comp':('casio-music-data (github: nicholasopuni31)', 'NO FORMAL LICENSE — README grants use w/ credit', 'FLAG'),
 'drums/muted-io':   ('muted.io/drum-patterns', 'UNCLEAR — no license stated on site or in ToS', 'FLAG'),
 'chords/free-midi-chords': ('ldrolez/free-midi-chords', 'MIT', 'OK'),
 'chords/omni-84':   ('benjamindehli/Omni-84', 'GPL-3.0 — COPYLEFT, do not copy into plinky', 'FLAG'),
}
rows=[]
for rel,(src,lic,flag) in SRC.items():
    base=os.path.join(ROOT,rel)
    for p in sorted(glob.glob(os.path.join(base,'**','*'), recursive=True)):
        if not os.path.isfile(p): continue
        ext=os.path.splitext(p)[1].lower()
        if ext not in ('.mid','.midi','.dspreset','.json'): continue
        name=os.path.basename(p)
        note=''
        if rel.startswith('drums'): note='4-bar drum loop, GM percussion'
        elif rel.startswith('bass'): note='4-bar bassline, ch10 extracted from casio rhythm'
        elif rel=='chords/casio-comp': note='4-bar chord comp, first melodic channel'
        elif rel=='casio-rhythms': note='full multi-track casio rhythm demo (drums+bass+comp+melody)'
        elif rel=='chords/free-midi-chords': note='chord / progression, key folder in path'
        elif rel=='chords/omni-84': note='DecentSampler preset — REFERENCE ONLY, GPL-3.0'
        rows.append({'filename':os.path.relpath(p,ROOT).replace('\\','/'),'source':src,'license':lic,
                     'style':style_of(name),'flag':flag,'notes':note})
with open(os.path.join(ROOT,'MANIFEST.csv'),'w',newline='',encoding='utf-8') as f:
    w=csv.DictWriter(f,fieldnames=['filename','source','license','style','flag','notes']); w.writeheader(); w.writerows(rows)
from collections import Counter
by_src=Counter(r['source'] for r in rows); by_style=Counter(r['style'] for r in rows)
print(len(rows),'rows'); print(dict(by_src)); print(dict(by_style))

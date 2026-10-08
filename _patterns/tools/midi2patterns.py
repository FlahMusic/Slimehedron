#!/usr/bin/env python3
"""
midi2patterns.py — turn open-source MIDI into plinky's native step-array pattern data.

The slimehedron band engine does NOT read MIDI at runtime. It sequences hardcoded
JS arrays (KITS / KITBASS / COMP_RHY). This script reads MIDI files ONCE, offline,
and emits those arrays so nothing but a few KB of numbers ships to the browser.

  drums -> {K:[steps], s:[], h:[], r:[], c:[], C:[]}   64 steps = 4 bars of 16ths
  bass  -> {step:'R'|'T'|'F'|'O'|'A'}                  degree tokens, key-relative
  comp  -> [step, step, ...]                           16th positions of chord stabs

usage: python3 midi2patterns.py > ../generated/patterns-generated.js
"""
import mido, os, sys, json, collections, glob, re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
STEPS_PER_BAR = 16

# ---- GM percussion -> plinky's 6 drum voices -------------------------------
# K=kick  s=snare  h=hat/cymbal  r=rim/clap  c=low perc/tom  C=high perc/tom
GM = {}
for n in (35,36):                      GM[n]='K'
for n in (38,40):                      GM[n]='s'
for n in (37,39,75,76,77):             GM[n]='r'
for n in (42,44,46,49,51,52,53,55,57,59,69,70,54,58,71,72,73,74,78,79,80,81): GM[n]='h'
for n in (41,43,45,61,64,66,68,84,86,87): GM[n]='c'
for n in (47,48,50,56,60,62,63,65,67,82,83,85): GM[n]='C'

def q(tick, tpb, div=4.0):
    """quantize an absolute tick to the nearest 16th step index.
    div=4 -> a 16th is tpb/4 ticks (normal). Single-track drum loops from muted.io
    are notated at double speed (their written quarter is a musical half), so those
    read on div=8 or every groove comes out as unplayable double-time."""
    return int(round(tick / (tpb / div)))

def abs_events(track):
    t = 0; out = []
    for msg in track:
        t += msg.time
        if msg.type == 'note_on' and msg.velocity > 0:
            out.append((t, msg.note, msg.velocity, msg.channel))
    return out

def collect(mid, div=None):
    """all note-ons as (step, note, vel, channel), quantized to 16ths"""
    tpb = mid.ticks_per_beat
    raw = []
    for tr in mid.tracks:
        raw.extend(abs_events(tr))
    if div is None:
        chs = set(ch for _, _, _, ch in raw)
        drum_only = len(chs) == 1 and 9 not in chs and all(n in GM for _, n, _, _ in raw)
        div = 8.0 if drum_only else 4.0
    return sorted((q(t, tpb, div), n, v, ch) for t, n, v, ch in raw)

def bars_of(events, pred):
    """group matching events into {bar_index: set/list of (step_in_bar, note)}"""
    bars = collections.defaultdict(list)
    for st, n, v, ch in events:
        if not pred(n, ch): continue
        bars[st // STEPS_PER_BAR].append((st % STEPS_PER_BAR, n, v))
    return bars

def modal_bar_index(bars, key_fn):
    """the bar whose shape repeats most often = the style's groove, not the intro/fill"""
    if not bars: return None
    sig = {b: key_fn(v) for b, v in bars.items()}
    counts = collections.Counter(sig.values())
    if not counts: return None
    win, _ = counts.most_common(1)[0]
    for b in sorted(bars):
        if sig[b] == win: return b
    return None

# ---- drums ------------------------------------------------------------------
def is_drum_only(ev):
    """single-channel files (muted.io) put GM drum notes on ch0 — treat those as drums"""
    chs = set(ch for _, _, _, ch in ev)
    if len(chs) != 1 or 9 in chs: return False
    return all(35 <= n <= 87 and n in GM for _, n, _, _ in ev)

def drum_pattern(mid, bars_wanted=4):
    ev = collect(mid)
    dch = 9 if any(ch == 9 for _, _, _, ch in ev) else (list(set(c for _,_,_,c in ev))[0] if is_drum_only(ev) else 9)
    bars = bars_of(ev, lambda n, ch: ch == dch)
    if not bars: return None
    shape = lambda v: tuple(sorted(set((s, GM.get(n)) for s, n, _ in v if GM.get(n))))
    start = modal_bar_index(bars, shape)
    if start is None: return None
    out = {k: [] for k in 'KshrcC'}
    keys = sorted(bars)
    for i in range(bars_wanted):
        b = start + i
        if b not in bars: b = keys[(keys.index(start) + i) % len(keys)]
        for s, n, _ in bars[b]:
            v = GM.get(n)
            if v: out[v].append(s + STEPS_PER_BAR * i)
    return {k: sorted(set(x)) for k, x in out.items()}

# ---- bass -------------------------------------------------------------------
TOK = {0: 'R', 3: 'T', 4: 'T', 7: 'F'}
def bass_pattern(mid, bars_wanted=2):
    ev = collect(mid)
    # prefer channel 10 (casio's bass part); else the lowest-average pitched melodic channel
    cands = collections.defaultdict(list)
    for st, n, v, ch in ev:
        if ch != 9: cands[ch].append(n)
    if not cands: return None
    ch = 10 if 10 in cands else min(cands, key=lambda c: sum(cands[c]) / len(cands[c]))
    bars = bars_of(ev, lambda n, c: c == ch)
    if not bars: return None
    shape = lambda v: tuple(sorted(set(s for s, _, _ in v)))
    start = modal_bar_index(bars, shape)
    if start is None: return None
    keys = sorted(bars)
    if is_drum_only(ev): return None
    grooves = []
    for i in range(bars_wanted):
        b = start + i
        if b not in bars: b = keys[(keys.index(start) + i) % len(keys)]
        notes = sorted(bars[b])
        if not notes: continue
        root = min(n for _, n, _ in notes)          # bar root = its lowest note
        pat, seen = {}, set()
        for s, n, _ in notes:
            if s in seen: continue                  # monophonic: first note per step wins
            seen.add(s)
            iv = (n - root) % 12
            tok = TOK.get(iv, 'A')
            if iv == 0 and n > root: tok = 'O'
            pat[s] = tok
        if pat and 0 in pat: pat[0] = 'R'           # always land the root on beat 1
        if pat: grooves.append(pat)
    return grooves or None

# ---- comp -------------------------------------------------------------------
def comp_pattern(mid):
    ev = collect(mid)
    if is_drum_only(ev): return None
    chs = set(ch for _, _, _, ch in ev if ch not in (9, 10))
    if not chs: return None
    ch = min(chs)
    bars = bars_of(ev, lambda n, c: c == ch)
    if not bars: return None
    shape = lambda v: tuple(sorted(set(s for s, _, _ in v)))
    b = modal_bar_index(bars, shape)
    if b is None: return None
    return sorted(set(s for s, _, _ in bars[b]))

# ---- style tagging ----------------------------------------------------------
STYLE = [('bossa',['bossa']),('samba',['samba','batucada']),('jazz',['jazz','swing','bebop','big band','dixie','shuffle blues']),
         ('latin',['salsa','mambo','cha','rumba','tango','cumbia','merengue','bolero','beguine','calypso','reggae','ska','soca']),
         ('rock',['rock','metal','punk','surf','boogie','blues']),('funk',['funk','soul','disco','motown','r&b','rnb']),
         ('pop',['pop','ballad','beat','dance','techno','house','edm','trance','euro','8 beat','16 beat']),
         ('hiphop',['hip','trap','breakbeat','downtempo','lo-fi','lofi']),
         ('country',['country','bluegrass','folk','waltz','polka','march','gospel'])]
def style_of(name):
    l = name.lower()
    for tag, keys in STYLE:
        if any(k in l for k in keys): return tag
    return 'other'

def slug(name):
    return re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')

# ---- run --------------------------------------------------------------------
def scan(paths, source, license_):
    kits, bass, comp, meta = {}, {}, {}, {}
    for p in sorted(paths):
        name = os.path.splitext(os.path.basename(p))[0]
        key = slug(name)
        try: mid = mido.MidiFile(p)
        except Exception: continue
        d = drum_pattern(mid); b = bass_pattern(mid); c = comp_pattern(mid)
        if not (d and any(d.values())): continue
        kits[key] = d
        if b: bass[key] = b
        if c: comp[key] = c
        meta[key] = {'name': name, 'style': style_of(name), 'source': source, 'license': license_}
    return kits, bass, comp, meta

def js(o): return json.dumps(o, separators=(',', ':'))

if __name__ == '__main__':
    casio = glob.glob(os.path.join(ROOT, 'casio-rhythms', '*.mid')) + \
            glob.glob(os.path.join(ROOT, 'casio-rhythms', 'other-rhythms', '*.mid'))
    muted = glob.glob(os.path.join(ROOT, 'drums', 'muted-io', '*.mid'))
    K1, B1, C1, M1 = scan(casio, 'casio-music-data', 'no-formal-license/credit-requested')
    K2, B2, C2, M2 = scan(muted, 'muted.io', 'UNCLEAR')
    K = {**K1, **K2}; B = {**B1, **B2}; C = {**C1, **C2}; M = {**M1, **M2}
    print('/* AUTO-GENERATED by patterns/tools/midi2patterns.py — do not hand-edit.')
    print('   %d drum kits · %d bass grooves · %d comp rhythms, extracted from MIDI' % (len(K), len(B), len(C)))
    print('   into plinky\'s native step-array format. No MIDI is loaded at runtime. */')
    print('const MIDI_KITS=' + js(K) + ';')
    print('const MIDI_BASS=' + js(B) + ';')
    print('const MIDI_COMP=' + js(C) + ';')
    print('const MIDI_META=' + js(M) + ';')
    print('if(typeof module!=="undefined")module.exports={MIDI_KITS,MIDI_BASS,MIDI_COMP,MIDI_META};')
    sys.stderr.write('kits=%d bass=%d comp=%d\n' % (len(K), len(B), len(C)))

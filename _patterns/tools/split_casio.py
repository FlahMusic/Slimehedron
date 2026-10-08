#!/usr/bin/env python3
"""Split casio multi-track rhythm MIDIs into per-role single-track loops.
ch9 -> drums/casio/  ch10 -> bass/casio/  first chord ch -> chords/casio-comp/
Each output is the modal (most-repeated) 4 bars, so you get the groove, not the
intro/fill/ending of the demo."""
import mido, os, glob, collections, re, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC  = glob.glob(os.path.join(ROOT,'casio-rhythms','*.mid')) + glob.glob(os.path.join(ROOT,'casio-rhythms','other-rhythms','*.mid'))
OUT  = {'drums': os.path.join(ROOT,'drums','casio'),
        'bass':  os.path.join(ROOT,'bass','casio'),
        'comp':  os.path.join(ROOT,'chords','casio-comp')}
for d in OUT.values(): os.makedirs(d, exist_ok=True)

def events(mid, ch):
    tpb=mid.ticks_per_beat; out=[]
    for tr in mid.tracks:
        t=0
        for m in tr:
            t+=m.time
            if m.type in ('note_on','note_off') and m.channel==ch: out.append((t,m))
    return sorted(out,key=lambda x:x[0]), tpb

def modal_start(evs,tpb):
    bar=tpb*4; bars=collections.defaultdict(list)
    for t,m in evs:
        if m.type=='note_on' and m.velocity>0: bars[t//bar].append((t%bar,m.note))
    if not bars: return None
    sig={b:tuple(sorted(set(v))) for b,v in bars.items()}
    win=collections.Counter(sig.values()).most_common(1)[0][0]
    for b in sorted(bars):
        if sig[b]==win: return b
    return None

def write(evs,tpb,start,path,bars=4):
    bar=tpb*4; a=start*bar; b=a+bars*bar
    sel=[(t-a,m) for t,m in evs if a<=t<b]
    if not any(m.type=='note_on' and m.velocity>0 for _,m in sel): return False
    out=mido.MidiFile(ticks_per_beat=tpb); tr=mido.MidiTrack(); out.tracks.append(tr)
    last=0
    for t,m in sel:
        n=m.copy(time=int(t-last)); tr.append(n); last=t
    tr.append(mido.MetaMessage('end_of_track',time=max(0,int(bars*bar-last))))
    out.save(path); return True

def slug(s): return re.sub(r'[^A-Za-z0-9]+','-',s).strip('-')

n={'drums':0,'bass':0,'comp':0}
for p in sorted(SRC):
    name=slug(os.path.splitext(os.path.basename(p))[0])
    try: mid=mido.MidiFile(p)
    except Exception: continue
    chans=set(m.channel for tr in mid.tracks for m in tr if m.type=='note_on' and m.velocity>0)
    plan=[('drums',9),('bass',10)]
    comp=[c for c in sorted(chans) if c not in (9,10)]
    if comp: plan.append(('comp',comp[0]))
    for role,ch in plan:
        if ch not in chans: continue
        evs,tpb=events(mid,ch); s=modal_start(evs,tpb)
        if s is None: continue
        if write(evs,tpb,s,os.path.join(OUT[role],f'{name}.mid')): n[role]+=1
print(n)

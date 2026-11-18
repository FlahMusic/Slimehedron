#!/usr/bin/env python3
"""A whole session on the FM-1 in fm1-emu, as a person would play it: every button, every encoder, the double taps, a
loop recorded and overdubbed, songs saved and loaded, the session kept over a power cycle.
    session.py keys OUTFILE      the key script (fm1-live FM1_BENCH_KEYS @FILE) and, on stdout, the moments to look at
Times are ms of firmware time (the boot takes ~1.3 s). Encoders: e0 SELECT, e1 ALGORITHM, e2..e5 KNOB 1..4, e6 PRESETS."""
import sys

ev, marks = [], []


def press(t, b, hold=90):
    ev.append(f"{t}:{b}"); ev.append(f"{t + hold}:{b}^")


def turn(t, e, n):
    ev.append(f"{t}:e{e}:{n}")


def mark(t, what):
    marks.append((t + 260, what))           # (the label shows for 1.5 s; 260 ms after the action)


def note(t, n, hold=160):
    ev.append(f"{t}:n{n}"); ev.append(f"{t + hold}:n{n}^")


# 0. power-on: the splash (the slime drops in, the jingle, the name, the fade), then it waits for PLAY
for ms, what in ((620, "splash: he drops in"), (1500, "splash: the name"), (3300, "splash: the fade"), (4300, "stopped: press play")):
    marks.append((ms, what))
t = 4600
note(t, 7); note(t + 400, 11); mark(t + 400, "keys play while stopped"); t += 1400
# 1. the sound: SOUND page, the "wood" set, home (set up before PLAY)
press(t, "EDIT"); mark(t, "sound page"); t += 700
turn(t, 6, 2); mark(t, "sound set: wood"); t += 1200
turn(t, 0, 3); mark(t, "note length +60 ms"); t += 1200
turn(t, 1, 1); mark(t, "chord every 4 bars"); t += 1200
press(t, "EDIT"); mark(t, "home"); t += 900
# 2. home knobs: tempo, spin, rhythm, key, walls, space, melody sound
turn(t, 2, 10); mark(t, "tempo 110"); t += 1200
turn(t, 3, 3); mark(t, "spin"); t += 1200
turn(t, 4, 2); mark(t, "rhythm: disco"); t += 1200
turn(t, 5, -3); mark(t, "key down 3"); t += 1200
turn(t, 0, 1); mark(t, "walls (stopped: at once)"); t += 1500
press(t, "PLAY"); mark(t, "play"); t += 2500
# 3. FX page: the melody's hall, the bass's filter, the chords' chorus, the drums' punch
press(t, "FX"); mark(t, "fx: melody"); t += 700
turn(t, 6, 3); mark(t, "fx preset: hall"); t += 1200
press(t, "FX"); mark(t, "fx: bass"); t += 700
turn(t, 2, -12); mark(t, "bass low-pass"); t += 1200
press(t, "FX"); mark(t, "fx: chords"); t += 700
turn(t, 0, 1); mark(t, "character: chorus"); t += 900
turn(t, 1, 10); mark(t, "chorus amount"); t += 1200
press(t, "FX"); mark(t, "fx: drums"); t += 700
turn(t, 3, 15); mark(t, "drums punch"); t += 1200
press(t, "FX"); mark(t, "home again"); t += 900
# 4. NOTES page (ENV): the melody plucky, the bass with a little glide
press(t, "ENV"); mark(t, "notes: melody"); t += 700
turn(t, 6, 1); mark(t, "notes: pluck"); t += 1200
press(t, "ENV"); mark(t, "notes: bass"); t += 700
turn(t, 1, 8); mark(t, "glide"); t += 1200
press(t, "ENV"); press(t + 500, "ENV"); mark(t + 500, "back home"); t += 1400
# 5. MIX: the bass up 2 dB, the room a little bigger, swing
press(t, "GLO"); mark(t, "mix page"); t += 700
turn(t, 3, 4); mark(t, "bass +2 dB"); t += 1200
turn(t, 0, 2); mark(t, "swing"); t += 1200
turn(t, 6, 3); mark(t, "reverb size"); t += 1200
press(t, "GLO"); t += 900
# 6. REC: a loop. Count-in, then a phrase over two bars (110 bpm: a bar is 2.18 s), REC to close it
press(t, "REC"); mark(t + 300, "rec: count-in")
rec0 = t
t += 5200                                  # the count-in lands within two bars
for k, n in enumerate([7, 9, 11, 14, 11, 9, 12, 7]):
    note(t + k * 540, n);
mark(t + 100, "rec: playing in")
t += 8 * 540 + 200
press(t, "REC"); mark(t, "loop closes at the bar"); t += 6000
mark(t, "loop playing")
# 7. double taps: the key pinned, the drums alone and back, the scale and back, octave
press(t, "LFO", 60); press(t + 150, "LFO", 60); mark(t + 150, "key pinned"); t += 1500
press(t, "SEQ", 60); press(t + 150, "SEQ", 60); mark(t + 150, "drums alone"); t += 4500
press(t, "SEQ", 60); press(t + 150, "SEQ", 60); mark(t + 150, "band on"); t += 2500
press(t, "SCL"); mark(t + 300, "scale: minor"); t += 4400
press(t, "SCL", 60); press(t + 150, "SCL", 60); mark(t + 150, "scale back: major"); t += 4400
press(t, "OCTUP"); mark(t, "octave 1"); t += 800
ev.append(f"{t}:OCTDN"); ev.append(f"{t + 40}:OCTUP"); ev.append(f"{t + 200}:OCTDN^"); ev.append(f"{t + 220}:OCTUP^")
mark(t + 40, "both octave buttons: 0"); t += 1200
# 8. overdub: two notes more into the playing loop
press(t, "REC"); mark(t + 300, "overdub on"); t += 900
note(t, 16); note(t + 700, 18); t += 1600
press(t, "REC"); mark(t + 300, "overdub off"); t += 3000
# 9. auto-notes off and on, a new shape
press(t, "ARP"); mark(t, "auto-notes off"); t += 4000
press(t, "ARP"); mark(t, "auto-notes on"); t += 1500
press(t, "HOME"); mark(t, "new shape"); t += 6000
# 10. songs: stop, save song 1; hold SAVE + PRESETS: song 2 (no save); double SAVE: empty; back to 1, load it
press(t, "PLAY"); mark(t, "stop"); t += 2500
press(t, "SAVE"); mark(t + 300, "saved song 1"); t += 2500
ev.append(f"{t}:SAVE"); turn(t + 200, 6, 1); ev.append(f"{t + 600}:SAVE^"); mark(t + 200, "song 2"); t += 1500
press(t, "SAVE", 60); press(t + 150, "SAVE", 60); mark(t + 150, "empty: song 2"); t += 2000
ev.append(f"{t}:SAVE"); turn(t + 200, 6, -1); ev.append(f"{t + 600}:SAVE^"); mark(t + 200, "song 1"); t += 1500
press(t, "SAVE", 60); press(t + 150, "SAVE", 60); mark(t + 150, "loaded song 1"); t += 2000
# 11. play from the top; let it run; stop; the session saves itself 3 s later
press(t, "PLAY", 60); press(t + 150, "PLAY", 60); mark(t + 150, "from the top"); t += 20000
mark(t, "the song, running")
press(t, "PLAY"); mark(t, "stop (the session saves)"); t += 6000
END = t
open(sys.argv[2], "w").write(",".join(ev))
for m, w in marks:
    print(m, w)
print("END", END)

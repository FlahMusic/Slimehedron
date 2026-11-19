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
# 1. SONG (SCL), set up stopped: tempo, swing, key, scale, rhythm, a chord every 4 bars, the key pinned and free again
press(t, "SCL"); mark(t, "song page"); t += 900
turn(t, 2, 10); mark(t, "tempo"); t += 1100
turn(t, 3, 2); mark(t, "swing"); t += 1100
turn(t, 4, -3); mark(t, "key down 3"); t += 1100
turn(t, 5, 2); mark(t, "scale: dorian"); t += 1100
turn(t, 0, 2); mark(t, "rhythm: disco"); t += 1100
turn(t, 1, 1); mark(t, "a chord every 4 bars"); t += 1100
turn(t, 6, 1); mark(t, "key pinned"); t += 1100
turn(t, 6, -1); mark(t, "key moves again"); t += 1100
# 2. SOUND (ENV): the "wood" set for all three, the melody's attack and release, the bass's glide
press(t, "ENV"); mark(t, "sound page"); t += 900
turn(t, 6, 2); mark(t, "sounds: wood"); t += 1200
turn(t, 0, 1); mark(t, "sound: melody"); t += 900
turn(t, 2, 4); mark(t, "melody attack"); t += 1000
turn(t, 5, 3); mark(t, "melody release"); t += 1000
turn(t, 0, 1); mark(t, "sound: bass"); t += 900
turn(t, 1, 6); mark(t, "bass glide"); t += 1000
press(t, "ENV"); mark(t, "back to the tank"); t += 900
# 3. TANK (HOME): walls, spin, portals on and off, note length, notes a bar, how long a shape lives
turn(t, 2, 1); mark(t, "walls (stopped: at once)"); t += 1300
turn(t, 3, 3); mark(t, "spin"); t += 1000
turn(t, 4, 1); mark(t, "portals on"); t += 1300
turn(t, 4, -1); mark(t, "portals off"); t += 1300
turn(t, 5, 3); mark(t, "note length"); t += 1000
turn(t, 0, 1); mark(t, "notes a bar: 12"); t += 1000
turn(t, 1, 1); mark(t, "new shape every 128 bars"); t += 1000
press(t, "PLAY"); mark(t, "play"); t += 2500
# 4. FX: the melody's hall, the bass's filter, the chords' chorus and pan, the drums' punch, the returns
press(t, "FX"); mark(t, "fx: melody"); t += 800
turn(t, 6, 3); mark(t, "fx preset: hall"); t += 1200
turn(t, 0, 1); mark(t, "fx: bass"); t += 800
turn(t, 2, -12); mark(t, "bass low-pass"); t += 1100
turn(t, 0, 1); mark(t, "fx: chords"); t += 800
turn(t, 4, 1); mark(t, "effect: chorus"); t += 900
turn(t, 5, 10); mark(t, "chorus amount"); t += 1000
turn(t, 1, -12); mark(t, "chords pan left"); t += 1000
turn(t, 0, 1); mark(t, "fx: drums"); t += 800
turn(t, 3, 15); mark(t, "drums punch"); t += 1100
turn(t, 0, 1); mark(t, "fx: the returns"); t += 800
turn(t, 3, 5); mark(t, "delay repeats"); t += 1000
turn(t, 4, 5); mark(t, "reverb room"); t += 1000
press(t, "FX"); mark(t, "back to the tank"); t += 900
# 5. MIXER (GLO): the bass up, the chords' strip: delay and reverb sends; bass muted and back, the drums soloed and back
press(t, "GLO"); mark(t, "mixer"); t += 900
turn(t, 3, 4); mark(t, "bass +2 db"); t += 1100
turn(t, 0, 2); mark(t, "strip: chords"); t += 900
turn(t, 1, 5); mark(t, "chords delay send"); t += 1000
turn(t, 6, 5); mark(t, "chords reverb send"); t += 1000
note(t, 2); mark(t, "bass muted (key 2)"); t += 2500
note(t, 2); mark(t, "bass back"); t += 1500
note(t, 12); mark(t, "drums solo (key 12)"); t += 3500
note(t, 12); mark(t, "solo off"); t += 1500
press(t, "GLO"); mark(t, "back to the tank"); t += 900
# 6. REC: a loop. Count-in, then a phrase over two bars, REC to close it
press(t, "REC"); mark(t + 300, "rec: count-in")
t += 5200                                  # the count-in lands within two bars
for k, n in enumerate([7, 9, 11, 14, 11, 9, 12, 7]):
    note(t + k * 540, n);
mark(t + 100, "rec: playing in")
t += 8 * 540 + 200
press(t, "REC"); mark(t, "loop closes at the bar"); t += 6000
mark(t, "loop playing")
# 7. the octave; overdub two notes
press(t, "OCTUP"); mark(t, "octave 1"); t += 800
ev.append(f"{t}:OCTDN"); ev.append(f"{t + 40}:OCTUP"); ev.append(f"{t + 200}:OCTDN^"); ev.append(f"{t + 220}:OCTUP^")
mark(t + 40, "both octave buttons: 0"); t += 1200
press(t, "REC"); mark(t + 300, "overdub on"); t += 900
note(t, 16); note(t + 700, 18); t += 1600
press(t, "REC"); mark(t + 300, "overdub off"); t += 3000
# 8. CHORDS (EDIT): a famous progression, chord 3 picked, a key sets it to F
press(t, "EDIT"); mark(t, "chords page"); t += 900
turn(t, 6, 1); mark(t, "chords: I-vi-ii-V"); t += 1500
turn(t, 0, 2); mark(t, "chord 3 picked"); t += 900
note(t, 12); mark(t, "a key: chord 3 is F"); t += 1500
press(t, "EDIT"); mark(t, "tank: the progression plays"); t += 4500
# 9. DRUMS (SEQ): from the rhythm, the hat lane on 8ths, a step off
press(t, "SEQ"); mark(t, "drums page"); t += 900
turn(t, 6, 1); mark(t, "drums: from the rhythm"); t += 1200
turn(t, 0, 2); mark(t, "lane: hat"); t += 900
turn(t, 2, 2); mark(t, "fill: hat on 8ths"); t += 1200
note(t, 2); mark(t, "a step off (key 2)"); t += 1500
press(t, "SEQ"); mark(t, "tank: my pattern plays"); t += 4500
# 10. auto-notes off and on, the slime off and on, a new shape
press(t, "ARP"); mark(t, "auto-notes off"); t += 3000
press(t, "ARP"); mark(t, "auto-notes on"); t += 1500
press(t, "LFO"); mark(t, "slime off"); t += 1500
press(t, "LFO"); mark(t, "slime on"); t += 1500
press(t, "HOME"); mark(t, "new shape"); t += 6000
# 11. songs: stop, save song 1; hold SAVE + PRESETS: song 2 (no save); double SAVE: empty; back to 1, load it
press(t, "PLAY"); mark(t, "stop"); t += 2500
press(t, "SAVE"); mark(t + 300, "saved song 1"); t += 2500
ev.append(f"{t}:SAVE"); turn(t + 200, 6, 1); ev.append(f"{t + 600}:SAVE^"); mark(t + 200, "song 2"); t += 1500
press(t, "SAVE", 60); press(t + 150, "SAVE", 60); mark(t + 150, "empty: song 2"); t += 2000
ev.append(f"{t}:SAVE"); turn(t + 200, 6, -1); ev.append(f"{t + 600}:SAVE^"); mark(t + 200, "song 1"); t += 1500
press(t, "SAVE", 60); press(t + 150, "SAVE", 60); mark(t + 150, "loaded song 1"); t += 2000
# 12. play from the top; let it run; stop; the session saves itself 3 s later
press(t, "PLAY", 60); press(t + 150, "PLAY", 60); mark(t + 150, "from the top"); t += 20000
mark(t, "the song, running")
press(t, "PLAY"); mark(t, "stop (the session saves)"); t += 6000
END = t
open(sys.argv[2], "w").write(",".join(ev))
for m, w in marks:
    print(m, w)
print("END", END)

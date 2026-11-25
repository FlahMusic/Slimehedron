#!/usr/bin/env python3
"""A whole session on the FM-1 in fm1-emu, as a person would play it: every button, every encoder, every page's views,
the double taps, a loop recorded and overdubbed, the session kept over a power cycle.
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


# 0. power-on: the splash (the slime drops in, headphones on, the twinkle with its stars, the chord and the name, the
#    fade), then it waits for PLAY; keys play their notes while stopped (no ball: the tank waits)
for ms, what in ((560, "splash: he drops in"), (980, "splash: headphones"), (1700, "splash: the twinkle"), (2700, "splash: the name"),
                 (3900, "splash: the fade"), (4700, "stopped: press play")):
    marks.append((ms, what))
t = 5000
note(t, 7); note(t + 400, 11); mark(t + 400, "keys play while stopped (no ball)"); t += 1400
# 1. SONG (SCL), set up stopped: tempo, swing, key, scale; SCL again: the rhythm, a chord every 4 bars, the key pinned
#    and free again, a new shape every 128 bars
press(t, "SCL"); mark(t, "song page"); t += 900
turn(t, 2, 10); mark(t, "tempo"); t += 1100
turn(t, 3, 2); mark(t, "swing"); t += 1100
turn(t, 4, -3); mark(t, "key down 3"); t += 1100
turn(t, 5, 2); mark(t, "scale: dorian"); t += 1100
press(t, "SCL"); mark(t, "song 2/2: rhythm"); t += 900
turn(t, 2, 2); mark(t, "rhythm: disco"); t += 1100
turn(t, 3, 1); mark(t, "a chord every 4 bars"); t += 1100
turn(t, 4, 1); mark(t, "key pinned"); t += 1100
turn(t, 4, -1); mark(t, "key moves again"); t += 1100
turn(t, 5, 1); mark(t, "new shape every 128 bars"); t += 1100
# 2. the three sounds, on the left knobs (any page): SELECT the melody's, ALGORITHM the bass's, PRESETS the chords'
turn(t, 0, 1); mark(t, "melody sound +1"); t += 1200
turn(t, 1, 2); mark(t, "bass sound +2"); t += 1200
turn(t, 6, 1); mark(t, "chords sound +1"); t += 1200
# 3. SOUND (ENV): the melody's attack and release; ENV x3: the note length, the bass's glide
press(t, "ENV"); mark(t, "sound: melody"); t += 900
turn(t, 2, 4); mark(t, "melody attack"); t += 1000
turn(t, 5, 3); mark(t, "melody release"); t += 1000
press(t, "ENV"); press(t + 300, "ENV"); press(t + 600, "ENV"); mark(t + 600, "sound 4/4: length, glide"); t += 1500
turn(t, 2, 3); mark(t, "note length"); t += 1000
turn(t, 4, 6); mark(t, "bass glide"); t += 1000
press(t, "HOME"); mark(t, "back to the tank"); t += 900
# 4. TANK (HOME): walls, spin, portals on and off, notes a bar
turn(t, 2, 1); mark(t, "walls (stopped: at once)"); t += 1300
turn(t, 3, 3); mark(t, "spin"); t += 1000
turn(t, 4, 1); mark(t, "portals on"); t += 1300
turn(t, 4, -1); mark(t, "portals off"); t += 1300
turn(t, 5, 1); mark(t, "notes a bar: 12"); t += 1000
press(t, "PLAY"); mark(t, "play"); t += 2500
# 5. FX: the melody's effect; FX: the bass's filter; FX: the chords' chorus; FX: the drums' punch; FX: the returns
press(t, "FX"); mark(t, "fx: melody"); t += 800
turn(t, 4, 1); mark(t, "melody effect"); t += 1000
press(t, "FX"); mark(t, "fx: bass"); t += 800
turn(t, 2, -12); mark(t, "bass low-pass"); t += 1100
press(t, "FX"); mark(t, "fx: chords"); t += 800
turn(t, 4, 1); mark(t, "effect: chorus"); t += 900
turn(t, 5, 10); mark(t, "chorus amount"); t += 1000
press(t, "FX"); mark(t, "fx: drums"); t += 800
turn(t, 3, 15); mark(t, "drums punch"); t += 1100
press(t, "FX"); mark(t, "fx: delay, reverb"); t += 800
turn(t, 3, 5); mark(t, "delay repeats"); t += 1000
turn(t, 4, 5); mark(t, "reverb room"); t += 1000
press(t, "HOME"); mark(t, "back to the tank"); t += 900
# 6. MIXER (GLO): the bass up; GLO: the chords panned left; GLO: their delay send; GLO: their reverb send; the keys:
#    the bass muted and back, the drums soloed and back
press(t, "GLO"); mark(t, "mixer: levels"); t += 900
turn(t, 3, 4); mark(t, "bass +2 db"); t += 1100
press(t, "GLO"); mark(t, "mixer: pan"); t += 900
turn(t, 4, -12); mark(t, "chords pan left"); t += 1000
press(t, "GLO"); mark(t, "mixer: delay sends"); t += 900
turn(t, 4, 5); mark(t, "chords delay send"); t += 1000
press(t, "GLO"); mark(t, "mixer: reverb sends"); t += 900
turn(t, 4, 5); mark(t, "chords reverb send"); t += 1000
note(t, 2); mark(t, "bass muted (key 2)"); t += 2500
note(t, 2); mark(t, "bass back"); t += 1500
note(t, 12); mark(t, "drums solo (key 12)"); t += 3500
note(t, 12); mark(t, "solo off"); t += 1500
press(t, "HOME"); mark(t, "back to the tank"); t += 900
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
# 8. CHORDS (EDIT): EDIT: a famous progression; EDIT: back to the slots, chord 3 picked, a key sets it to F
press(t, "EDIT"); mark(t, "chords page"); t += 900
press(t, "EDIT"); mark(t, "chords 2/2: all"); t += 900
turn(t, 3, 1); mark(t, "chords: I-vi-ii-V"); t += 1500
press(t, "EDIT"); mark(t, "chords 1/2"); t += 900
turn(t, 2, 2); mark(t, "chord 3 picked"); t += 900
note(t, 12); mark(t, "a key: chord 3 is F"); t += 1500
press(t, "HOME"); mark(t, "tank: the progression plays"); t += 4500
# 9. DRUMS (SEQ): my pattern from the rhythm, the hat lane on 8ths, a step off; SEQ: the kit: rock's, tuned down, longer
press(t, "SEQ"); mark(t, "drums: pattern"); t += 900
turn(t, 5, 1); mark(t, "pattern: mine (from the rhythm)"); t += 1200
turn(t, 2, 2); mark(t, "lane: hat"); t += 900
turn(t, 3, 2); mark(t, "fill: hat on 8ths"); t += 1200
note(t, 2); mark(t, "a step off (key 2)"); t += 1500
press(t, "SEQ"); mark(t, "drums: kit"); t += 900
turn(t, 2, 2); mark(t, "kit: rock's"); t += 1200
turn(t, 3, -2); mark(t, "tune -2"); t += 1000
turn(t, 4, 3); mark(t, "decay longer"); t += 1000
press(t, "HOME"); mark(t, "tank: my pattern plays"); t += 4500
# 9b. MIDI (SAVE): the melody on channel 2; SAVE: the clock out off and on again
press(t, "SAVE"); mark(t, "midi: channels"); t += 900
turn(t, 2, 1); mark(t, "melody: channel 2"); t += 1000
press(t, "SAVE"); mark(t, "midi: in, clock"); t += 900
turn(t, 5, -1); mark(t, "clock out off"); t += 1000
turn(t, 5, 1); mark(t, "clock out on"); t += 1000
press(t, "HOME"); mark(t, "back to the tank"); t += 900
# 10. the arp on (its page: a pattern, the rate) and off, the slime off and on, a new shape
press(t, "ARP"); mark(t, "arp on"); t += 900
turn(t, 2, 1); mark(t, "arp: random"); t += 900
turn(t, 3, 2); mark(t, "arp rate 1/16"); t += 1800
press(t, "ARP"); mark(t, "arp off"); t += 1500
press(t, "LFO"); mark(t, "slime off"); t += 1500
press(t, "LFO"); mark(t, "slime on"); t += 1500
turn(t, 2, 1); mark(t, "walls +1 (a new shape)"); t += 6000
# 12. play from the top; let it run; stop; the session saves itself 3 s later
press(t, "PLAY", 60); press(t + 150, "PLAY", 60); mark(t + 150, "from the top"); t += 20000
mark(t, "the song, running")
press(t, "PLAY"); mark(t, "stop (the session saves)"); t += 6000
END = t
open(sys.argv[2], "w").write(",".join(ev))
for m, w in marks:
    print(m, w)
print("END", END)

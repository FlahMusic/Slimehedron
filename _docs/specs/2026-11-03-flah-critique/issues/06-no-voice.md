# 06 No voice: words on screen and a "listen" button

Status: done (2026-11-04)
Spec: `../spec.md` (Done means: Learn), brief 3.2; Flah 2026-11-04: option A

Remove every speechSynthesis call in learn mode (and anywhere else). The words it said stay on screen. Any sound the
kid must judge plays only when they press "listen" (one button style everywhere, at least 44x44). No sound ever starts
by itself over another. Check: speechSynthesis is never called while every unit is played through; nothing sounds
before "listen" in a judged round. Sabotage: one speak() left in.

Done: speechSynthesis is gone from learn2.js (engine, the map's voice switch, the 15 "say it again" buttons, the
strings). A round judged by ear waits for "listen" (needListen): the button pulses, an answer before it is ignored and
nudges the button, and the next round waits again. Read units (countbar, rest, song, split) start on "listen" too.
Every other suite gets a driver that presses a pulsing listen button at once (listenKid in _dev/browser.js);
SLIME_LISTEN=wait turns it off. dev-learn3 06 (new): 20 units wait, silence before listen, no early answers, nothing
spoken. Sabotages caught: a speak() left in, the staff auto-playing again, howlong's answer gate removed.
Updated: dev-lessons ("never speaks", no voice buttons; it asserted the opposite).
Not checked by a machine: how the pulse reads to a kid.

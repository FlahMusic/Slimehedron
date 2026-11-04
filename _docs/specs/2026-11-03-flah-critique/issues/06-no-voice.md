# 06 No voice: words on screen and a "listen" button

Status: ready
Spec: `../spec.md` (Done means: Learn), brief 3.2; Flah 2026-11-04: option A

Remove every speechSynthesis call in learn mode (and anywhere else). The words it said stay on screen. Any sound the
kid must judge plays only when they press "listen" (one button style everywhere, at least 44x44). No sound ever starts
by itself over another. Check: speechSynthesis is never called while every unit is played through; nothing sounds
before "listen" in a judged round. Sabotage: one speak() left in.

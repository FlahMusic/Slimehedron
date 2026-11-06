# 13 Back from a lesson always lands on the learn map, loaded

Status: done (2026-11-05)
Spec: `../spec.md`, brief 3.8

Back from every unit goes to the learn map, fully loaded (never a half-loaded play screen). Check: from every unit,
back shows the map with its units drawn and no play-mode controls.

Done: back acts on the press (a redraw between press and release could swallow it), and from all 31 units on
the map, pressed mid-sound, back shows the whole map with nothing playing behind it (dev-learn3 13: no sound in 1.5 s,
drums and band off). The audit could not reproduce Flah's dead screen from the code; the redraw-under-the-finger
lead was real (Copy the Beat redrew every beat until this pass).
Sabotage caught (run on a copy): the band left playing behind the map (6 sounds in 1.5 s). A break of only the
on-press handler was NOT caught, because the click still reaches home(): the outcome is checked, not the handler.

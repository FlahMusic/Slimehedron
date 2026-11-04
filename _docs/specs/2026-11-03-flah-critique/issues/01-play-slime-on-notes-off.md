# 01 Play: slime on, auto-notes off, the bubble becomes the toggle

Status: done (2026-11-04)
Spec: `../spec.md` (Done means: Play), brief 1.1

A fresh visit to play: the slime is on, auto-notes off. A small bubble says "tap to play notes and spin the shapes".
On the first tap it moves to just under the tank and stays there as the auto-notes toggle (same element, moved).
Update the glossary ("auto-notes: off in play", "tap invite") and every suite that asserts the old play defaults or
the tap invite. Check 360/375/390 px and desktop (dev-topbar, dev-a11y): the toggle is at least 44x44 and covers no
control. New `dev-play` checks; sabotages: slime off by default; the bubble never moves; it moves but does nothing.

## Notes (2026-11-04)
The slime switches on at load in play (silent: auto-notes off, the band still waits for the first touch). `#tapInvite`
is now a worded bubble; on the first tap it glides to `#notesSlot`, just below the tank (under the canvas when the stage
has room: at 90% of the canvas it sat on the rim and caught the strum), and `#autoNotesBtn` (moved, not cloned, with the
word "notes") stays there. Its header spot is held at its own width so nothing after it moves between rooms, and it
follows a room change at once (a half-second timer raced dev-topbar). Found on the way: `#playBtn` reserved 98 px but
"pause" is 103.3 px; it reserves 104 now (play opening playing made the bar shift 3-5 px).
dev-play (new, 22 checks); sabotages caught: slime off at the start, the toggle never shown, the bubble never leaving.
Updated: dev-firsttouch (slime on, still silent), dev-ux 1 (the bubble leaves after its glide), dev-hands 1 (the
toggle in play is under the tank) and 6 (the swipe from a known turn, view held still). Glossary updated.
Not checked by a machine: whether the bubble's words read right to a kid.

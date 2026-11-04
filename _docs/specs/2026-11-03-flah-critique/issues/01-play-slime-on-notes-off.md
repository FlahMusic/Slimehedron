# 01 Play: slime on, auto-notes off, the bubble becomes the toggle

Status: ready
Spec: `../spec.md` (Done means: Play), brief 1.1

A fresh visit to play: the slime is on, auto-notes off. A small bubble says "tap to play notes and spin the shapes".
On the first tap it moves to just under the tank and stays there as the auto-notes toggle (same element, moved).
Update the glossary ("auto-notes: off in play", "tap invite") and every suite that asserts the old play defaults or
the tap invite. Check 360/375/390 px and desktop (dev-topbar, dev-a11y): the toggle is at least 44x44 and covers no
control. New `dev-play` checks; sabotages: slime off by default; the bubble never moves; it moves but does nothing.

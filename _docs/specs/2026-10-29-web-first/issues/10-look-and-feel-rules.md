# 10 Look and feel: measured rules

Status: ready
Blocked by: 01
Spec: `../spec.md` (Done means: Look and feel), brief section 6

Turn brief section 6 into checks:
- every tap answers with sight and sound within one frame (time-to-sound, as `dev-hands` does)
- dropped frames in the worst case stay at or under the targets set from 01
- one motion language: the easings and durations 01 listed, cut to a short set, enforced by a new `dev-motion`
  (fails on an unlisted easing or duration)
- no layout jump on any room change (CLS 0)

The crayon art stays; anything about art direction goes to Flah first. Sabotages: a transition with its own easing;
a room change that shifts the header.

# Idea, not built: share a jam by link

Lifted from _dev/dev-share.js on 2026-10-08 before deleting it. That suite tested
`jamPack` / `jamUnpack` / `jamBar` — none of which exist in index.html, so it could only
ever fail. The sharing that DOES ship is sharing a RECORDING FILE (covered by dev-takes.js).

The spec it encoded, worth keeping:

> THE SHARE GATE.
> A share button that "works" is a button that fires without throwing. That is not the test.
> The test is: does a link made on one machine reproduce the SAME JAM on another machine, is it
> short enough to survive a text message, and does the fallback fire when the clipboard is denied.

If this gets built, the test is already written in git history.

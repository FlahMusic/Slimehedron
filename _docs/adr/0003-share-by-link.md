# 0003 Share what you made as a link (in the # of the URL)

Status: accepted 2026-10-27. Supersedes the 2026-10-08 rule "sharing a recording means handing over the FILE,
never a payload encoded into a URL" (from the old `_docs/CLAUDE.md`, now in `_docs/retired/`).

- The song snapshot (+ room, look, which parts are on) is deflated and base64url'd into `#s=` (~750-900 chars).
  The `#` part never reaches a server, so ADR 0001 still holds.
- Opening a link goes through the same checks as a song file (`cleanControls` / `cleanExtras`), caps the size and
  the decompression, is undoable in studio, and is removed from the address bar once applied.
- Recordings are still shared as files (audio via the share sheet, MIDI per part). Both exist.

Why the reversal: the 2026-09-23 market research found share-by-URL was the single feature that made Song Maker
assignable in classrooms, and Flah picked it. The old objection (a 75 s jam was 1828 chars) was about encoding a
performance; this encodes the setup, which is small.

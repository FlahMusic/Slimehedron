# 0001 100% synthesized, offline, nothing tracked, no camera or microphone

Status: accepted (2026-09)

- Every sound is Web Audio synthesis. No samples, no downloads, zero external requests; it works offline (PWA).
- No accounts, no analytics, no camera, no microphone, ever.

Why: a school can approve one URL without a meeting (no PII = no COPPA/FERPA paperwork), it runs on a filtered
Chromebook, and the licence stays clean (GPL-3.0-or-later). This is worth more than any feature it rules out
(posture checking, "hear the real piano", cloud saves).

Rules out: sample packs, CDNs, fonts or scripts from another host, mic input, any server.

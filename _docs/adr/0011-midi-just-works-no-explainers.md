# 0011 MIDI: every option works, nothing explains itself

Status: accepted 2026-10-29 (Flah). Spec: `_docs/specs/2026-10-29-web-first/spec.md`.

- Flah: "dont tell them anything, anyone advanced enough to mess with MIDI can figure it out. just make the options
  available and make sure the shit actually works as intended."
- So the app adds no help text, notes or warnings about MIDI (browser support, permissions, Bluetooth latency,
  ports held by another app). Instead every MIDI path is tested to work: devices in and out, hot-plug, a denied
  permission, a port that will not open, the first note from a key. A failure never breaks the app or leaves a
  note stuck; the menu simply shows what is there.
- Fact on record (2026-10-29): no iPhone/iPad browser has Web MIDI (caniuse: iOS Safari unsupported through 27.2;
  every iOS browser is WebKit), so the web app cannot see a keyboard there. MIDI on the iPad comes through apps that
  add Web MIDI, or the plugin later.
- Rules out: MIDI explainer copy. Bringing it back needs a new ADR.

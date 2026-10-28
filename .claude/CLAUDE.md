# Slimehedron: read me first

<!-- Lives at .claude/CLAUDE.md (Claude Code loads it every session; a dot folder is never published).
     _docs/CLAUDE.project.md is an identical copy: after any edit here, copy the whole file over it. -->

Slimehedron is a free, GPL, 100% synthesized browser music toy and children's music-theory app (play / studio / learn),
plus a Rust audio-plugin port in `vst/`. Everything ships from this repo on GitHub Pages. Flah owns it.

Where the truth is (in this order):
1. The code. 2. `_docs/SLIMEHEDRON-HANDOFF.txt` (state + history, newest pass at the bottom of section 7).
3. The words and rules below. 4. `_docs/adr/` (decisions; never undo one without a new ADR).
Anything in `_docs/retired/` describes an older app. Never treat it as current.

@../_docs/GLOSSARY.md
@../_docs/CODING_STANDARDS.md

## How a pass runs (and which mattpocock skill does each step)

0. **Load the context**: read the handoff's newest pass, `_dev/SUITES.md`, and the ADRs for the area.
1. **Grill** (`/grill-with-docs`, or `grill-me` for small things). Look facts up yourself. Ask Flah only decisions,
   in ONE round, numbered, each with a recommended answer. New words go into the glossary; a decision that is hard
   to explain from the code, or that reverses an old one, becomes an ADR. Skip this only for a pure bug fix.
2. **Prototype** (`prototype`) only when the open question is "does it feel right" (a gesture, a speed, a look) and
   a throwaway page can answer it faster than the app. The prototype is deleted; its verdict goes in the spec.
3. **Spec** (`/to-spec`, into `_docs/specs/`) for anything bigger than one sitting. "Done means" has NUMBERS, and it
   lists which existing suites assert the old behaviour. **Tickets** (`/to-tickets`) when it has 3+ separable parts.
4. **Build** one ticket at a time. After every edit: `node _dev/dev-syntax.js` and `node _dev/dev-loadtest.js`.
   For logic you can test without a browser (the Rust core, pure functions): `tdd`, red first.
5. **Prove it**: write or extend the suite for the feature, then sabotage it (break the feature 3+ ways; each must
   go red). Run the targeted suites for the area (`_dev/SUITES.md`) right away, not at the end. Look at screenshots.
6. **Bugs and flakes** (`diagnosing-bugs`): first build a check that fails on the bug, then fix. Never loosen a
   threshold to make a flake pass; run a control on the previous commit.
7. **Sweep** once at the end, with no edits while it runs. Rerun only the failures.
8. **Review** (`/code-review` against the last commit): standards and spec, two separate reports. Fix, re-run gates.
9. **Ship**: bump `sw.js`, commit (never push), update the handoff (repo copy AND the claude.ai project copy), then
   end the reply with the plain list of files to upload / delete on GitHub. Say what could not be checked by a machine.
10. **Retro** (`retro`) after a pass that went sideways: turn each repeated mistake into a check, a rule here, or a
   standards line. A rule that fired once is a note; a mistake that happened twice gets a check.

Also: `/improve-codebase-architecture` every couple of weeks as suggestions only (`index.html` is one ~860 KB
file); `/handoff` when a session ends mid-task; `research` for "find out how other apps do X" (cite sources).
Sandcastle (unattended agents in Docker) is for the Rust port later, not the web app.

## Hard rules
- Never `git push`, never run deploy scripts, never create `.nojekyll`, never ask for a GitHub token.
- Git in Flah's synced folder leaves `.git/*.lock` files (deletes are blocked there): rename them
  (`mv .git/HEAD.lock .git/stale-head-lock`), never ask for folder-wide delete permission to clear one.
- Docs for agents go in `_docs/` or `.claude/`, never as `.md` in the repo root (the root is published).
- Voice for replies: short, lowercase, casual (Adam Friedland), TLDR not report. Facts triple-checked and sourced.

## Agent skills

### Issue tracker

Local markdown: one folder per feature in `_docs/specs/`, `spec.md` plus `issues/NN-slug.md`. See `_docs/agents/issue-tracker.md`.

### Triage labels

No labels: one `Status:` line per file (`needs-info` / `ready` / `in-progress` / `done`). See `_docs/agents/triage-labels.md`.

### Domain docs

Single-context: `_docs/GLOSSARY.md` and `_docs/adr/`. See `_docs/agents/domain.md`.

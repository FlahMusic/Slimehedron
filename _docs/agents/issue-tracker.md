# Issue tracker: local markdown in `_docs/specs/`

Specs and tickets for this repo are markdown files in `_docs/specs/` (underscore folder: in git, never published).
No GitHub issues. Agents never push, so a ticket only reaches GitHub when Flah uploads it.

## Conventions

- One feature per folder: `_docs/specs/YYYY-MM-DD-short-name/`
- The spec is `_docs/specs/YYYY-MM-DD-short-name/spec.md` (sections: `_docs/specs/README.md`)
- Tickets are one file each: `_docs/specs/YYYY-MM-DD-short-name/issues/NN-slug.md`, numbered from `01`, never one
  combined tickets file
- Each spec and ticket has a `Status:` line near the top (states: `triage-labels.md`)
- Comments and history go at the bottom of the file under `## Comments`

## When a skill says "publish to the issue tracker"

Create the file under `_docs/specs/YYYY-MM-DD-short-name/` (make the folder if needed). Use today's date and the
glossary's words in the name.

## When a skill says "fetch the relevant ticket"

Read the file at the path given. Flah normally passes the path or the ticket number.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `_docs/specs/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `_docs/specs/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body.
  A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); the `Status:` line uses
  `in-progress` for claimed and `done` for resolved.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `done`.
- **Frontier**: scan `issues/` for files that are not `done`, unblocked, and not `in-progress`; first by number wins.
- **Claim**: set `Status: in-progress` and save before any work.
- **Resolve**: append the answer under `## Answer`, set `Status: done`, then add a pointer (gist + path) to the
  map's Decisions-so-far in `map.md`.

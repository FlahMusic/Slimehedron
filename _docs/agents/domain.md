# Domain docs

How the engineering skills read this repo's domain docs. Single context (one glossary, one ADR folder). Both live
in `_docs/`, not the repo root, because the root is published.

## Before exploring, read these

- **`_docs/GLOSSARY.md`**: the words. Use them in tickets, test names, comments and proposals.
- **`_docs/adr/`**: the ADRs that touch the area you are about to work in.
- Never read `_docs/retired/` as current: it describes an older app.

If a file is missing, proceed silently. `/domain-modeling` (via `/grill-with-docs` or
`/improve-codebase-architecture`) adds terms and ADRs when they get settled.

## Use the glossary's vocabulary

When your output names a domain thing (a ticket title, a hypothesis, a test name), use the glossary's word. If the
thing is not in the glossary, either you are inventing language the project does not use (reconsider) or there is
a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an ADR, say so plainly instead of silently overriding it:

> _Contradicts ADR 0007 (the plugin runs the full goo), but worth reopening because..._

Reversing an ADR means a new ADR that supersedes it.

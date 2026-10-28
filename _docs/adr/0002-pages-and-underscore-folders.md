# 0002 GitHub Pages; underscore folders are private; Flah pushes

Status: accepted

- The site is GitHub Pages straight from the repo root. Jekyll skips folders starting with `_` (and dot folders),
  which is the ONLY thing keeping `_dev`, `_docs`, `_patterns`, `_art_in` off the public site.
- Never create `.nojekyll` (it would publish all of those). Markdown in the repo root gets published as a page.
- Agents never `git push` and never run deploy scripts. Flah uploads/pushes. Every pass ends with the plain list
  of files to upload / delete on GitHub.
- Agent instructions live in `.claude/CLAUDE.md` (a dot folder), not a root `CLAUDE.md`, for the same reason.
- No custom domain until the app is done (`_docs/DOMAIN-MOVE.md` has the steps for when it is).

# Slimehedron — Handoff for Next Chat

_Read this first. Everything lives in files on disk, so you can pick up cold. Chat history is not needed._

---

## 1. What Slimehedron is
A free, source-available (**PolyForm Noncommercial**), kid-friendly browser music toy.
- **Live:** https://flahmusic.github.io/Slimehedron/  (GitHub Pages)
- **Files:** `C:\flah plugins\plinky\`
  - `index.html` — the whole app (vanilla JS + Web Audio + Canvas, single file)
  - `learn.js` — music-theory lessons
  - `sw.js` — PWA service worker; **bump the `const C='slimehedron-vNN'` version every deploy** or the browser serves stale cache
  - `minis/` — background slime PNGs · `slime imgs/` — original art sources
  - `bg-desktop.jpg` / `bg-mobile.jpg` — backgrounds
  - `PATTERNS-BACKUP-v64.js` — rollback snapshot of all generative-band pattern data
- **Three modes:** learn (lessons) · play (kid sandbox) · studio (power mode)
- **Goal:** most powerful music toy possible, wrapped cute enough for a toddler, deep as the ocean. **NO streaks / guilt / addiction dark-patterns — ever.**
- Current build: **v64** (in `sw.js`).

## 2. How the user (Flah) works
- Blunt, casual, lowercase, curses. Wants short answers. **Triple-check facts, never guess/hallucinate, always cite sources.** Only top-tier sources — NOT Reddit/forums.
- Ask before big/destructive changes. Simplest solution first. Don't touch unrelated code. Flag uncertainty.
- **He pushes files to GitHub manually.** Your local edits aren't live until he pushes + hard-refreshes. After editing, tell him exactly which files to push and to hard-refresh (Ctrl+Shift+R / Safari equivalent).
- He tests on **iPhone Safari** — mobile matters a lot. Desktop currently looks good; make mobile-only changes when he flags mobile.

## 3. Hard-won gotchas (don't relearn these the hard way)
- **CSS rule-order trap:** the mobile `@media` block sits BEFORE the base component styles in the file, so an equal-specificity base rule (e.g. `.slimeswitch{width:150px}`) OVERRIDES a mobile rule that came earlier. Fix by ID-scoping the mobile rule (`#autoRow .slimeswitch{...}`) or `!important`. This bit us repeatedly.
- **Service-worker stale cache:** the live site kept showing old builds even when the file on the server was new. Always bump `sw.js` version, and when verifying live, clear caches + unregister SW first, then hard-reload.
- **Slime z-index:** background slimes are `z-index:12`; ALL UI is 30+. A slime can never cover/block a control. Keep it that way — UI always wins.
- **Verify by measuring, not eyeballing:** the browser pane reports a scaled/odd viewport, so trust `getBoundingClientRect()` numbers and pixel analysis over screenshots. Screenshots are for the human's eyes; measurements are for correctness.
- **Audio can't be heard by the agent** — verify audio changes by reading the gain/graph math, and ask Flah to ear-check.
- **Volume is kid-safe:** master slider maps 0–100 → 0–0.85 gain; final limiter at −8.5 dBFS. Don't undo that.

## 4. OUTSTANDING TASKS

### Task 89 — Re-crop `bg-mobile.jpg` from a lighter/starry area (NEEDS SHELL/bash)
**Why:** the mixer sits bottom-center in play mode; the current mobile bg has heavy colored crayon bushes there, clashing with the mixer's slime icons. Flah wants lighter colors / white space + some stars behind the mixer.

**Source to crop from:** `slime imgs/iphone.png` (816×1456, the clean untouched original). Its **middle band (~40–65% down)** is exactly right: light green fading to white, scattered crayon stars (orange/yellow/blue/pink), a couple soft pastel clouds — no heavy bushes.

**How to do it (Python + Pillow via bash):**
```python
from PIL import Image
im = Image.open('slime imgs/iphone.png')      # 816 x 1456
W,H = im.size
# We want a portrait 816x1456-ish output where the LIGHT/STARRY mid-band lands
# in the BOTTOM ~third (where the mixer sits). Simplest: shift the crop window UP
# so the busy bottom bushes fall off-frame and the light starry middle occupies the lower area.
# Crop a tall window starting higher up, then resize to the mobile aspect (816x1456):
crop = im.crop((0, 0, W, int(H*0.72)))         # drop the busy bottom bushes (~last 28%)
crop = crop.resize((816,1456), Image.LANCZOS)  # stretch light-starry region to fill
crop.save('bg-mobile.jpg', quality=90)
```
Then **preview it** (composite the mixer area) and tweak the crop fraction (0.72) until the bottom-center where the mixer lands is light + starry, not heavy color. Confirm on a 375px-wide mobile screenshot in play mode. NOTE: current `bg-mobile.jpg` was previously edited (a white cloud haze was painted in) — recropping from `iphone.png` gives a clean start. Bump `sw.js` after.

### The MIDI Pattern Collection task (NEEDS SHELL/bash — git clone, downloads)
Flah's full instructions are below in §6. It requires cloning repos and organizing MIDI files into `C:\flah plugins\plinky\patterns\`. Back up first (already done: `PATTERNS-BACKUP-v64.js`). Deliver the folder structure + a manifest (filename | source | license | style | notes). Prioritize MIT / Creative Commons / public domain; flag anything without clear licensing.

**Both tasks are blocked in the previous chat because bash/shell permission was denied there and it's per-chat.** In THIS fresh chat, the first bash command should prompt Allow — approve it and both unblock.

## 5. Recently finished (context, don't redo)
- Custom chord-progression mode (studio+play): +add chords (root+quality dropdowns), per-chord bar length, dice = famous progression transposed to key, "follow" overrides the auto circle-of-fifths transpose, localStorage-saved. Panel styled lime→lilac. "add" button (was "ok").
- Circle-of-fifths wheel: bigger, sharp+flat labels, moved clear of Sound-1 button.
- Bass audibility on phone speakers: added a missing-fundamental harmonic layer (triangle, bandpass ~250–520Hz) + a ~120Hz mid-bass EQ on the band bus. (Research: missing-fundamental / phantom fundamental.)
- Groove sub-styles made audible (timing signatures on Soft/Punchy/Backbeat).
- Slime crops re-done from white-bg sources (halos removed); `white` family scrapped from the pool — leave it out.
- Fluid layout for any browser zoom (clamp/vmin).
- Big mobile overhaul: transport as the very-top centered row, back→`←` arrow, share/clear on a 2nd row, slime toggle shrunk + raised, wheel centered+shrunk above the tank, chords button visible, side icons shrunk, slime keep-out radius around the mixer, slimes spread across the page + shrunk. **This is live as of v64 — Flah may still be fine-tuning it; get a fresh screenshot before changing mobile.**

## 6. Flah's MIDI task (verbatim, for the shell-enabled run)
Pull & organize open-source MIDI patterns for the generative band. Targets: drum, bass, chord/comp across rock, pop, jazz, bossa nova + Casio-inspired rhythms. Priority sources in order:
1. **casio-music-data** — https://github.com/nicholasopuni31/casio-music-data → clone the `RYTHMDAT` folder (120+ Casio rhythm MIDIs). Check repo license.
2. **free-midi-chords** (MIT) — https://github.com/ldrolez/free-midi-chords → clone; grab drum/bass/hiphop folders.
3. **muted.io drum patterns** — https://muted.io/drum-patterns/ → download rock/pop/jazz/bossa MIDIs (check site terms).
4. **Omni-84** — https://github.com/benjamindehli/Omni-84 → omnichord-style strum/chord logic (DecentSampler format; may need conversion).
5. **open-lofi** (public domain) — https://github.com/btahir/open-lofi → 150+ lo-fi tracks for chord/bass reference.

Output structure: `patterns/casio-rhythms/`, `patterns/drums/`, `patterns/chords/`, `patterns/bass/`, `patterns/reference/`. Deliver a **manifest** (CSV or MD): filename | source | license | style | notes. Prioritize MIT/CC/public-domain; flag unclear licenses.

## 7. New skills Flah added (use them when relevant)
The account now has a large plugin/skill library installed. Most useful for this project:
- **modern-web-guidance** (`modern-web-guidance:modern-web-guidance`) — **run this FIRST for any HTML/CSS/client-JS task.** It surfaces current best practices (modals, container queries, `:has()`, view transitions, Core Web Vitals, filesystem/USB/WebAudio APIs). Training data goes stale on web APIs; this keeps you current. Directly relevant to all the Slimehedron UI/audio work.
- **modern-web-guidance:chrome-extensions** — if we ever wrap Slimehedron as an extension.
- **engineering:code-review / debug / testing-strategy** — for reviewing the big index.html before a deploy, or chasing a specific bug/regression.
- **skill-creator** — to package a repeatable Slimehedron workflow (e.g., "deploy checklist: bump sw.js, verify parse, hard-refresh") into a reusable skill.
- **design:accessibility-review / design-critique** — kid-app UX + a11y passes (contrast, touch-target size) on the mobile layout.
- **product-management:brainstorm / write-spec** — for planning new features (e.g., the MIDI-remix engine) before building.
- Media/doc skills available if needed: `docx`, `pdf`, `xlsx`, `pptx` (e.g., the MIDI manifest could be an xlsx).
- There are many connector-backed skills (legal/marketing/sales/CRM) that are NOT relevant here — ignore unless Flah asks.

**Optimization tip for the next chat:** before touching UI/CSS, invoke `modern-web-guidance` once to load current patterns; before a deploy, bump `sw.js`, run a JS parse check, and have Flah hard-refresh. Verify layout by measuring element rects, not by trusting screenshots.

---
_Snapshot: build v64. Backup: PATTERNS-BACKUP-v64.js. Two tasks pending, both need shell: (1) bg-mobile recrop, (2) MIDI collection._

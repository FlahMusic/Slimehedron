# FM-1 projects on REC: how the other firmwares save, load and delete

Date: 2026-11-25. Question (Flah): make REC "projects": save everything into slots, flip through them with a knob,
load one, delete easily, maybe tap vs hold. "Have a good hard think on how other firmwares are handling load/saving
projects on fm1 and maybe take a page from there."

Local checkouts read in WSL: `~/fm1w/sloop-fm1`, `~/fm1w/slime-fw`, `~/fm1w/CoralFlower`, `~/fm1w/nomanskyFM`,
`~/fm1w/fm1-x0x`. Paths below are relative to those. Anything marked **(inference)** is ours, not read anywhere.

## TL;DR

- Every FM-1 firmware uses the same Felucca storage (`storage.c`): one object = an A/B pair of 4 KB sectors, payload
  up to 3840 B, the header written last so a torn write keeps the old copy. **An erase turns interrupts off and
  silences the audio for ~45-50 ms**, so SLOOP, X0X and we only write when stopped.
- **CoralFlower solved saving while playing**: keep the next copy *already erased* (erase it in a quiet moment), then
  a save is only page programs (~1 ms each, timed just after an audio half renders), no audible gap.
- Gestures in the wild: **hold to commit** (stock FM-1 SAVE hold, CoralFlower hold SAVE 1 s, SLOOP REC hold ring,
  JIANT hold OCT+ 1 s with a filling bar, Shrub "KEEP HOLDING", OP-XY hold M4 = delete); **turn-twice / press-twice
  confirm** (SLOOP GO knobs "AGAIN: SAVE" within 1.5 s, SLOOP SAVE+key again within 3 s, Felucca OCT+ OCT+); the
  screen always **names what the gesture will do** before it does it.
- Recommendation: REC opens a PROJECTS page; KNOB 1 picks the slot (8), the screen shows what is in it; **hold REC
  1 s = do it** (load / save, picked on KNOB 2); delete is the same hold, 2 s, on a used slot. Saves while playing
  via CoralFlower's pre-erased copy, or "saves when you stop" as a first step.

## 1. Each FM-1 firmware

### Stock M-VAVE firmware (V15/V16)

| | |
|---|---|
| Save | **Press and hold SAVE**: "saves any pending changes (voice parameters, effect settings, sequencer patterns, global settings)", SAVE LED lights, "Preset Saved" shows (manual p.8) |
| Slots | 128 voices; 16 sequencer patterns, picked with KNOB 1 in SEQ, "stored in flash memory" (manual p.8-9) |
| Load | turning the preset / pattern knob (no separate load) |
| Delete / reset | GLO page 2, KNOB 1 "Reset Patches": a confirmation screen, **turn KNOB 4 to confirm, KNOB 1 again to cancel** (manual p.7) |
| Global save | GLO page 2, KNOB 2 "Globe Save" (turn) |
| REC | sequencer record only (manual p.9) |

Source: M-VAVE FM-1 user manual PDF, https://m.media-amazon.com/images/I/A1WOydif9HL.pdf (text extracted locally,
English part lines ~230-325). Projects as such do not exist on the stock firmware.

### SLOOP (isod89/sloop-fm1, the base of slime-fw)

| | |
|---|---|
| What is a slot | a **section** A-D = a whole loop: 4 tracks (sounds, patterns, kit, locks, nudges), tempo, swing, key, texture, drum tune/decay (`firmware/src/project.c:460-484` proj_capture; `GUIDE.md:619`). Settings of the FM-1 (sync, MIDI, lights) are not in it (`GUIDE.md:621`) |
| Slots | 4 sections (`project.c:3`, `storage.c:27` OBJ_PROJECT0..+3), 32 user sounds (`upreset.c:3-7`), one working project autosaved (OBJ_AUTOSAVE) |
| Save (fast) | **SAVE held + white key 5-8** = save into A-D; over a used one, **the key again within 3 s** ("AGAIN: …") (`ui_layers.c:397-406`, `GUIDE.md:464`) |
| Load (fast) | SAVE held + key 1-4: playing, from the next bar; stopped, at once (`GUIDE.md:462`) |
| Save / load / erase (page) | SAVE > SECTION page: **KNOB 1 the slot**, KNOB 2 ERASE, KNOB 3 LOAD, KNOB 4 SAVE as **GO knobs: one detent shows "AGAIN: SAVE", a second within ~1.5 s does it** (`ui_input.c:523-552, 563-575`; `GUIDE.md:21, 629, 634`) |
| Delete | ERASE (GO) writes an object of 0 bytes, read back as "EMPTY"; stopped only; no undo (`project.c:602-633`; `GUIDE.md:615`) |
| REC hold | REC acts on press; held 0.7 s the press is undone and a ring fills for 1.3 s more; held to the end clears the track, let go early = nothing (`ui_input.c:1018-1067`, `ui_layers.c:1055`) |
| Screen | title-line messages: "AGAIN: SAVE", "SAVED SECTION A", "EMPTY SECTION B", "STOP BEFORE SAVE" (`project.c:583-600, 672-688`) |
| While playing | page SAVE/LOAD/ERASE refused ("STOP BEFORE …", `project.c:586, 612, 676`). SAVE+key stores **into RAM at once** and writes flash when stopped, quiet and untouched 1.5 s (`project.c:1119-1145, 1207-1215`); `.noinit` RAM survives a reset, not a power-off (`project.c:3-4`) |
| Autosave | the working project, when stopped, nothing sounding, 2.5 s untouched, at most every 20 s (`project.c:690-726`) |

### slime-fw (SLOOP patched for Slimehedron) and our own FM-1 code today

- Storage is SLOOP's unchanged (`diff -q` of the two `firmware/src` trees: only eng_analog, eng_fm6, felucca, fx,
  main, punch, seq, slicer, ui_vis differ). SLOOP's `autosave_tick()` is not called (`fm1/firmware/patch_sloop.py:88-91`).
- Our **session** (`fm1/firmware/slime_ui.c:635-742`): one `sl_song` (magic "SLM5": sounds, env, kit, scale, walls,
  space, slime, arp, mute/solo, mix, fx, delay/reverb, bpm, swing, root, spin, octave, chords, drum pattern, MIDI page,
  drum tone; `:641-656`) in `OBJ_PROJECT0 + 3` (`:733`), written when **stopped** (`sl_run == 0`), 3 s after the last
  press, audio quiet (`:734-742`), read back after the splash ("welcome back", `:997`).
- **Free right now: `OBJ_PROJECT0 .. +2`** (three A/B pairs, 0x97000..0x9CFFF): they held the "SAVE 3 songs" of
  commit `5f32d5d` (2026-11-18), removed 2026-11-20 because Flah: "idk what save does or where that saves shit to"
  (`slime_ui.c:639-640`). That old UI was SAVE tap = save, double tap = load, SAVE held + PRESETS = pick 1-3
  (`git show 5f32d5d:fm1/firmware/slime_ui.c` lines 431-454). **Lesson: invisible gestures with no page lost him.**
- `sl_song` size: ~0.9 KB with the unused 128-note loop array, ~0.17 KB without it (our arithmetic from the struct,
  not measured; it is `_Static_assert`ed <= ST_PAYLOAD_MAX at `:657`).
- REC today does nothing (`slime_ui.c:837-839`).

### CoralFlower (FicusFicusov, fork of ChoralRoot/Felucca)

| | |
|---|---|
| What is saved | sounds (user sounds, 32 slots, `core.h:106`), 8 patterns A-H + a song (`cf_seqd.c:16`), settings, unsaved sound edits, the drum machine (`storage.c:21-51`) |
| Save a sound | SAVE opens the SAVE screen; **K1 SAVE AS New/Replace, K2 LETTER, K3 CHAR (name), K4 ACTION Save/Delete**; **hold SAVE 1 s** commits; a tap goes HOME (nothing saved) (`cf_ui.c:260-278, 1004-1009, 1213-1231`) |
| Delete | the same screen, K4 ACTION = Delete (your sounds only), hold SAVE 1 s; "Deleted …" (`cf_ui.c:1097-1120`) |
| Patterns | no explicit save: the sequencer saves itself, only changed chunks (`cf_sequi.c:268-292`); SEL held 3 s clears a track, "counted down on the screen" (`cf_sequi.c:834-835`) |
| Factory reset | hold SAVE 3 s on its page; let go early = "Hold SAVE 3 seconds" (`cf_ui.c:107, 839-845`) |
| REC | tap records a new pattern after a count-in, **held 1 s = undo** (`cf_ui.c:976-977, 1017-1018`; `README.md` "REC on the main screen records…") |
| Storage trick | **saves while the audio plays**: a log of entries/deltas after the record, appended into erased space, **no erase** (`storage.c:123-140`); `ST_NOERASE` = "no erase (the audio plays): 1 back if only one would make room" (`storage.c:359`); copies known blank are tracked (`storage.c:176-189`, `st_check_blank` `:492-516`); erases happen in quiet moments (`st_tidy`, `:518-535`; quiet = 1.5 s no change + 1 s nothing sounding, `cf_settings.c:26-27`) |
| Audio cost | erase "about 45 ms of silence" (`storage.c:130`); page program IRQs-off "about 1 ms", started right after the audio ISR renders a half, "well inside the 2.1 ms that audio.c's DMA forgives" (`storage_hw.c:46-56`) |

### nomanskyFM

SLOOP 2.6 base (`firmware/SLOOP-BASE.txt`) merged up to 2.8.4 (`README.md:52`): SLOOP's SAVE SECTION A-D unchanged,
project format "FUN7" adds the recorded punch-in FX (`firmware/firmware/src/project.c:27`; `README.md:62`). Storage
identical to SLOOP's (`storage.c:27`). No game-state saves found (only SLOOP's `st_save` callers). Nothing new to borrow.

### fm1-x0x (charlesvestal)

| | |
|---|---|
| Slots | **one project** (sound, 32 patterns, song, knob motion, tempo, settings); more = backup files over USB (`docs/MANUAL.md` "Back up your project", ~725-735) |
| Save | **SAVE tap saves everything**; a grey dot = unsaved changes (`MANUAL.md:130, 657-660`) |
| While playing | "X0X never saves while playing… if you press SAVE while it plays, it says SAVES WHEN STOPPED and saves when you stop" (`MANUAL.md` Saving; `src/app/ui.c:1340-1358`) |
| Autosave | stopped, untouched 4 s, at most every 20 s, "AUTOSAVED" (`ui.c:4659-4690`); only changed objects written (`app/project.c:1-11`) |
| Patterns | white key on HOME / PRESETS picks; **hold SAVE = copy, white key = paste; asks first over notes**; hold SAVE + REC = clear the part (`MANUAL.md:419-436`) |
| Storage | own magic "X0X0"; patterns + song + motion packed with lz into 4 objects, a CRC over the stream so a torn multi-object save falls back to the previous copies; "MEMORY FULL: NOT SAVED" (`src/storage.c:15-24`, `app/project.c:1-11`) |
| Screen | "Hold any button: what it does" help cards (`MANUAL.md:165, 225`) |

### Felucca (hugelton) - from its wiki, not its code

- 4 projects + a separate autosave ("RESTORE LAST": written when stopped, untouched 10 s, at most once a minute).
  https://raw.githubusercontent.com/wiki/hugelton/Felucca/Menu.md
- Save a sound: "stop, tap SAVE, pick a slot with KNOB 1, then OCT+ and OCT+ again (name it with the keys)"; "On
  action pages and in dialogs, OCT+ does it and OCT- goes back"; hold SAVE = undo.
  https://raw.githubusercontent.com/wiki/hugelton/Felucca/Controls.md
- CLEAR ALL: "OCT+ asks, then OCT+ again". Not read: Felucca's code for projects.

### JIANT FM (juanjiant-bit, Felucca fork) - from its README only

- 8 projects ("LIBRARY shows the eight projects as tiles with their sections A-D as coloured chips"); README also says
  the current version keeps six and "songs 7 and 8 no longer open". PROJECTS page: "KNOB 1 picks a project without
  opening it", LOAD opens, ERASE empties, SAVE writes. Other projects are "read from their flash headers, one per
  frame".
- Erase a section: "ERASE SECT B?", OCT+ confirms, stopped only. TOOLS: "hold OCT+ a second to do it (a bar fills;
  no dialog, UNDO as before)". "REC held alone = UNDO".
- https://raw.githubusercontent.com/juanjiant-bit/JIANT/main/README.md (284 KB; we read ~200 KB of it via a summarizer;
  quotes not checked against the code).

### Xfer Shrub (closed source) - from its guide

- "Press SAVE. The save page shows **the slot it will save into, the name, and what's in that slot now**", then SAVE
  again. "SAVE opens on the **first free INIT slot**, so you don't overwrite the original by accident"; your own preset
  "opens on its own slot". Any other section button leaves without saving.
- Load: the name shows while turning, "the sound loads once you stop turning", with a ~3 ms fade.
- Unsaved edits: "EDITED / TURN AGAIN". Clear all lanes: "CLEAR ALL? KEEP HOLDING", "let go and nothing is cleared".
- Autosaves the current sound "a couple of seconds after you stop changing things". Projects: none.
- https://shrub.audio/guide/ (fetched via summarizer; not verified on a device).

## 2. SLOOP's storage API (what we build on)

| | |
|---|---|
| Layout | each object = A/B pair of 4096 B sectors; header 32 B at 0, side record 64..255, payload from 256 (`storage.c:3-9, 17-20, 155-164`) |
| Max payload | `ST_PAYLOAD_MAX` = 4096 - 256 = **3840 B** (`storage.c:20`); `st_buf` is the main loop's scratch (`:68-70`) |
| Objects | `OBJ_SETTINGS, OBJ_PROJECT0..+3, OBJ_UPRESET0..+1, OBJ_AUTOSAVE, OBJ_FM6BANK` = **9 objects** (`storage.c:27`); map in `storage.c:22-26, 55-66`. Adding one = an enum entry + a sector pair in `st_sector` + inside `FL_STORE_OK` (`hal/fm1_flash.h:38-55`) |
| API | `st_load(obj, dst, max)` -> length or -1 (`:141-153`); `st_save / st_save2 / st_save3` (`:175-232`); `st_side_load` (`:165-173`); `st_xip` (read in place, `:117-139`) |
| Commit | save writes the **other** copy: erase, program payload in 256 B pages, side record, header last with seq+1, then read back the whole record (`:177-227`). Load picks the valid copy with the highest seq (`:92-115`). **The previous version stays in the other sector until the next save** |
| Delete | SLOOP's convention: `st_save(obj, p, 0)`, a 0-byte object reads as empty (`project.c:602-617`) |
| Erase timing | `fl_erase4k_quiet`: interrupts off, audio buffer zeroed, then erase (`felucca.c:102-112`); SLOOP: "a flash erase stops the audio ~50 ms" (`project.c:605, 691`); driver waits up to 500 ms ("generic NOR max 400 ms", `hal/fm1_flash.h:172-186`) |
| Program timing | per 256 B page, IRQs off, waits up to 10 ms ("generic NOR max 3 ms", `fm1_flash.h:188-203`); CoralFlower measured ~1 ms (`storage_hw.c:47-49`) |
| Reads | 256 B IRQ-off windows, "audio keeps up" (`felucca.c:81-95`): **loading is safe while playing** |
| Safe while audio runs? | read: yes. save: **no** as written (always erases). Wear: each save erases one sector of the pair; NOR endurance not checked for the FM-1's parts (`fm1_flash_id.h` lists them) |

## 3. Conventions from other grooveboxes

- **Elektron (Digitakt)**: FUNC+YES = temporary pattern save, FUNC+NO = revert to it; project save/load is a menu
  (SETTINGS > PROJECT, "Save Project opens a project selection screen where you choose a slot"). Secondhand: forum
  quotes of the manual, https://www.elektronauts.com/t/am-i-missing-something-on-saving-projects/202310 and
  https://davetron5000.github.io/synth-docs/synths/elektron-digitakt.html. Official PDF host did not resolve for us.
- **Teenage Engineering EP-133**: "hold (main) and one of the pads (1-9)" picks a project
  (https://teenage.engineering/guides/ep-133/get-started); erase = while stopped, hold MAIN + ERASE + the pad
  (search snippet of TE's guide, not opened).
- **TE OP-XY**: autosave on by default; M2 save (makes a version), shift+M2 save as; **hold M1 = new, hold M4 =
  delete** (https://teenage.engineering/guides/op-xy/project). Pattern: destructive = hold.
- **Polyend Tracker**: opening another project with edits asks "Do you want to save the changes to 'xxxx'" (Save /
  Don't Save); Delete is a screen button. From search snippets of the official manual only (the PDF link 404'd).
- Common thread: browse is free and harmless; the destructive step needs a second deliberate act (hold, or press
  again), and the screen names the slot and the act first. Undo after the fact (OP-XY versions, Elektron revert,
  SLOOP/CoralFlower/JIANT undo) is preferred over dialogs.

## 4. Recommendation for Slimehedron's REC **(inference throughout)**

**The page.** REC = a PROJECTS page, like every other button ("Page: one button, one job", glossary). The tank keeps
playing. The panel shows the slot big: number, and what is in it (key + scale, bpm, shape, kit: e.g. "3  D dorian 96
cube rock"), or "empty". Slots never need names (no keyboard naming; summaries come free from the data, as JIANT reads
headers per frame).

**Knobs.** KNOB 1 = slot 1-8 (opens on the slot last loaded/saved; with none, the first empty one, as Shrub).
KNOB 2 = what REC does: **load / save / delete** (delete only offered on a used slot; empty slot: save only).
KNOB 3/4: free. Optional: white keys 1-8 jump to a slot while on the page.

**The one gesture.** **Hold REC to do it** (CoralFlower's hold SAVE 1 s, SLOOP's ring, JIANT's filling bar): the
panel says "hold REC: save 3", a ring fills, done at **1.0 s** for load/save, **2.0 s** for delete (SLOOP's REC clear
is 0.7 + 1.3 = 2.0 s). Let go early = nothing. Tap REC on the page = back to the tank. No "are you sure" screens.

**Undo instead of confirm.** A save over a used slot and a delete both leave the old version in the pair's other
sector (storage writes the other copy). A "take it back" (read the non-current copy and re-commit it) is a few lines
on `st_head/st_body`. Loading replaces the session, but the session object still holds "where you were" until it
autosaves, so a "back" slot is cheap too. Pick one; not both.

**Flash and playing.** Loading: any time (reads are IRQ-safe; `sl_song_put` already goes through requests).
Saving/deleting: step 1 = X0X's rule, "saves when you stop" (the panel says so, the slot shows a pending dot, written
by the same quiet check as `sl_session_tick`). Step 2 = CoralFlower's trick: in quiet moments, erase each slot's
spare copy ahead; a save while playing is then ~5 page programs of ~1 ms each, each started right after an audio half
renders. Needs a `st_put(..., ST_NOERASE)`-style path and a "blank" bitmap; measure it in fm1-emu strict (0 late,
worst window) before trusting "no gap".

**Slots and storage.** 8 slots fits one row of keys and JIANT's count. Two ways, both inside flash we already own:
(a) a project struct without the loop array (~170 B) and **all 8 in `OBJ_PROJECT0`** (one save rewrites the bank;
A/B keeps the old bank on a torn write) - no new flash; or (b) one object per slot, which needs 5 more sector pairs:
the user-sample area 0xA0000..0xDBFFF is the obvious room but we have **not** checked that Slimehedron never uses it
(installer, SLOOP sample engine), so (a) first. `OBJ_PROJECT0+1/+2` stay spare. The session stays its own object.

**Autosave.** Unchanged: the session is "where you were", projects are what you kept on purpose. After a load, the
session saves the loaded state when stopped as now. Show "edited" on the panel when the session differs from the
loaded slot (X0X's dot), so it is clear a save is needed.

## Not verified

- How any of this feels in hand (1 s vs 0.7 s hold), and whether Flah reads the page without a manual.
- CoralFlower's no-gap save on *our* audio load (they measured theirs; ours runs heavier drums and the tank).
- NOR endurance of the FM-1's flash parts; Felucca/JIANT/Shrub behaviour beyond their docs; Elektron, EP-133 erase
  and Polyend text from search snippets or forum quotes, not the manuals themselves.

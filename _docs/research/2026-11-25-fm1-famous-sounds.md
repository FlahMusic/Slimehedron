# FM-1 presets: famous 80s EP, bass and chord sounds (research, 2026-11-25)

For the FM-1 preset redesign: CHORDS becomes a smooth DX electric piano, plus big BASS and synthy CHORD sounds.
The FM-1's 6-op engine is msfa (Dexed's core), so **DX7 voice numbers drop straight in**: same algorithm table
([Dexed `source/msfa/fm_core.cc`](https://github.com/asb2m10/dexed/blob/master/source/msfa/fm_core.cc)), same
0-99 ranges. Our own `fm1/firmware/slime_fm6.py` already builds a tine from Yamaha's FM 101 article (see 1.3).

**How the DX7 facts below were got.** No Yamaha web page prints the original DX7 E.PIANO 1 sheet (FM 101 Part
Five is a Montage FM-X rebuild, see 1.3). So the factory ROM banks were decoded directly, as REFERENCES to measure our
own patches against (`rom1a.syx` / `rom1b.syx` / `rom2b.syx` from
[yamahablackboxes.com/patches/dx7/factory/](https://yamahablackboxes.com/patches/dx7/factory/rom1a.syx), unpacked per
[Dexed `doc/sysex-format.txt`](https://github.com/asb2m10/dexed/blob/master/doc/sysex-format.txt); the E.PIANO 1
decode matches MiniDexed's [`src/voices.c`](https://github.com/probonopd/MiniDexed/blob/main/src/voices.c) voice 11).
**This file keeps only their structure** (algorithm, which operator does what, ratios, feedback): Yamaha's rights
notice forbids "Copying or distributing ... any Programmed Sounds" (section 5), so their full parameter sheets (every
envelope and level) are not written here, and the banks themselves live only in a scratch folder, never in the repo.

Key: ratio = coarse x (1 + fine/100); OL = output level (one step = **0.75 dB**: msfa, "scaled in units of 0.7526 dB",
[Dx7Envelope wiki](https://github.com/google/music-synthesizer-for-android/blob/master/wiki/Dx7Envelope.wiki));
KVS = key velocity sensitivity (0-7).

---

## 1. Electric piano

### 1.1 DX7 E.PIANO 1 (ROM1A #11), decoded

Algorithm 5 = three 2-op pairs, 2->1, 4->3, 6->5, feedback on OP6 (carriers 1, 3, 5)
([fm_core.cc](https://github.com/asb2m10/dexed/blob/master/source/msfa/fm_core.cc)). Feedback 6. Osc key sync OFF.
No vibrato or tremolo.

| OP | role | ratio |
|---|---|---|
| 1, 3, 5 | carriers | 1.00 (1 and 5 detuned a little, opposite ways) |
| 2 | **tine** (mod of 1) | **14.00**, the most velocity-sensitive operator, the fastest decay |
| 4 | body (mod of 3) | 1.00, velocity-sensitive |
| 6 | bark (mod of 5, with the feedback) | 1.00, velocity-sensitive, detuned against 5 |

What each part does: the ratio-14 modulator is the bell "tine" and fades first; with its high velocity sensitivity
soft notes have almost no tine. The 1:1 modulators add the velocity "bark". The detuned pairs beat slowly (a built-in
chorus). Nothing sustains: the note dies away like a struck tine. (The same structure as FM 101's rebuild, 1.3.) Sound On Sound's Martin Russ states the general rule: a modulator's output
level sets brightness, carriers set loudness; and for an EP "we want the velocity to change the tone and not just the
level" ([SOS Jul 1988, "Practically FM" part 3](https://www.muzines.co.uk/articles/practically-fm/3945)).

### 1.2 Yamaha's own variants (same ROM set), decoded

| voice | how it differs from E.PIANO 1 |
|---|---|
| E.PIANO 3 (1B #4) | a much quieter, less velocity-sensitive tine (~20 dB down); 2.00 and 3.00 body modulators |
| E.PIANO 4 (1B #5) | lower feedback; the tine's modulator holds a little instead of dying |
| E.PIANO 2 (1B #3) | another algorithm: an 11.00 tine and a 0.51 modulator, "Rhodes-ish" with a sub growl |

Dexed's bundled SynprezFM banks (see 5) have related ones: `SynprezFM_02` #24 "E.-PIANO" is E.PIANO 1 a little
brighter with light vibrato; `SynprezFM_08` #1 "DL RHODES4" drops the ratio-14 tine for a quiet ~7.5 modulator.
(Decoded from [`assets/builtin_pgm.zip`](https://github.com/asb2m10/dexed/blob/master/assets/builtin_pgm.zip).)

### 1.3 Yamaha's FM 101 rebuild (what slime_fm6.py's SH TINE uses)

[FM 101 Part Five](https://yamahasynth.com/learn/synth-programming/fm-101-part-five-expanding-your-sound/) rebuilds
"the classic E.PIANO1 'tine' piano sound first made famous in the original DX7" on a Montage (FM-X algorithm 67,
feedback 6): modulators at OL 81 / 91 with Lvl/Vel +6, the ratio-14 modulator at **OL 60, Lvl/Vel +7**, detunes +7 /
-7 / +3, Time/Key 3 everywhere, D3 break point with Lvl/Key 19. Same recipe as the ROM; different envelope units.

### 1.4 Making it "smooth and chill"

No high-trust source gives a "smooth EP" recipe in numbers. What the sources do support:
- Modulator OL = brightness (Russ, [SOS 1988](https://www.muzines.co.uk/articles/practically-fm/3945)); each OL step
  is 0.75 dB of modulation ([msfa wiki](https://github.com/google/music-synthesizer-for-android/blob/master/wiki/Dx7Envelope.wiki)).
- Yamaha's own softer variants turn the tine down and make it less velocity-sensitive (E.PIANO 3) or lower the feedback (E.PIANO 4).
- Chorus helps: Russ "adding chorus enhances the result"; Reverb Machine: DX patches "need extra chorus, delay and
  reverb", e.g. chorus at 25% mix for a Rhodes-like DX EP
  ([Reverb Machine, Exploring the DX7 pt 2](https://reverbmachine.com/blog/exploring-the-yamaha-dx7-pt2/)).
- Attack Magazine's FM EP: tine-pair modulation "20-50 range gives us the best results", start at 30
  ([attackmagazine.com](https://attackmagazine.com/technique/tutorials/fm-electric-piano/2)) (their synth's scale, not DX7's).

**Starting point to try (our inference, unverified by ear):** the tine 6-9 dB quieter and less velocity-sensitive,
the body modulator a little lower, the feedback lower, the detuned pairs kept, no LFO, then Juno-style chorus (section
4.1 numbers). Hard hits keep some bell; soft playing becomes a round sine-ish tone.

### 1.5 Songs (verified vs folklore)

| claim | source | status |
|---|---|---|
| E.PIANO 1 used by Whitney Houston, Chicago, Phil Collins, Luther Vandross, Billy Ocean, Celine Dion, George Michael | [Wikipedia DX7](https://en.wikipedia.org/wiki/Yamaha_DX7) citing FACT, Guardian; [FACT 2016](http://www.factmag.com/2016/09/15/14-most-important-synths/) names Collins, Vandross, Ocean | **Reported** by press; no session interview found per song |
| On 40% of 1986 Billboard Hot 100 #1s, 40% country, 60% R&B | Wikipedia citing the Economist (2020); MusicRadar quotes 39 / 40 / 61% | **Folklore-ish**: original study not named anywhere I found |
| Twin Peaks theme | Kinny Landrum: "a Yamaha DX-7 and TX-7 were used for all the electric piano sounds" ([Reverb Machine](https://reverbmachine.com/blog/exploring-the-yamaha-dx7-pt2/)) | **DX7 verified by interview; "E.PIANO 1" itself is analysis** |
| Whitney "Saving All My Love", "Greatest Love of All", "I Have Nothing" | Reverb Machine own analysis; notes debate (DX7 vs Rhodes vs both) | **Folklore / by ear** |
| Super Mario 64 "Dire, Dire Docks" | [MusicRadar Dexed](https://www.musicradar.com/news/fantastic-free-synths-dexed); Reverb Machine says "similar to E.Piano 1", edited | **By ear** |

---

## 2. FM basses

### 2.1 DX7 BASS 1 (ROM1A #15), decoded

Algorithm 16 = one carrier (OP1) with three modulator branches: OP2, OP4->OP3, OP6(FB)->OP5
([fm_core.cc](https://github.com/asb2m10/dexed/blob/master/source/msfa/fm_core.cc)). **Feedback 7, osc key sync ON,
transpose -12**, LFO off. Every operator at ratio 0.50 except two high modulators, **5.00** (on OP3's branch) and
**9.00** (OP6, the feedback one), both velocity-sensitive and dropping fast.

Why it punches: carrier at ratio 0.5 + transpose -12 puts the fundamental two octaves down; the high-ratio modulators
make a bright velocity "pluck" that dies in a fraction of a second, leaving the carrier's lower sustain; key sync ON
resets phase so every note starts the same; strong rate scaling shortens the envelopes up the keyboard.

### 2.2 Other factory basses, decoded (short)

| voice | algorithm | shape |
|---|---|---|
| BASS 2 (1A #16) | 17, feedback high | ratios near 0.5 and 1.0 set slightly sharp so they beat: the "Take My Breath Away" bass |
| BASS 3 / BASS 4 (1B #31-32) | 17 | variations of BASS 2 |
| SYN-BASS 1 (2B #15) | 3 (two 3-op stacks), transpose -24 | ratios 1.00-2.00, one stack detuned; sustained, analog-like |
| SYN-BASS 2 (2B #16) | 9 | 2.00 / 0.50 mixes, detuned; sustained |

### 2.3 TX81Z LatelyBass / DX27-DX100 Solid Bass (4-op)

- LatelyBass: TX81Z preset, "one of the most popular presets in synthesizer history" (Wikipedia, *citation needed*)
  ([Wikipedia TX81Z](https://en.wikipedia.org/wiki/Yamaha_TX81Z)). Name origin: **no source found** (any Stevie
  Wonder "Lately" link is folklore).
- Solid Bass: DX27 patch PB 01, "also shared by" FB-01, DX21, DX100 ([Wikipedia DX27](https://en.wikipedia.org/wiki/Yamaha_DX27), uncited).
- **Parameters (medium trust):** no Yamaha sheet found. The one published, readable patch is ROLI's SOUL example by
  Cesare Ferrari ([LatelyBass.soul](https://github.com/soul-lang/SOUL/blob/master/examples/patches/TX/LatelyBass/LatelyBass.soul)),
  an emulation with no LFO, detune or level scaling:

| op | wave | level | ratio | feedback | AR D1R D1L D2R RR (TX 0-31 / 0-15) | KVS | RS |
|---|---|---|---|---|---|---|---|
| 1 carrier | sine | 99 | 0.5 | - | 31 9 0 0 8 | 0 | 1 |
| 2 (mod of 1) | sine | 74 | 0.5 | - | 31 9 0 0 8 | 1 | 1 |
| 3 (mod of 2) | **W5** (double-speed sine, first half only) | 71 | 1.0 | - | 31 17 0 0 8 | 1 | 1 |
| 4 (mod of 2) | sine | 79 | 1.0 | **7** | 31 16 3 7 8 | 3 | 0 |

  Played an octave down (voice allocator -12). **FM-1 caveat:** msfa is sine-only; TX81Z W5 can't be copied exactly
  (an approximation, e.g. a ratio-2 modulator, is our guess). Dexed imports 4-op DX21/27/100 sysex
  ([README](https://github.com/asb2m10/dexed/blob/master/README.md)), not TX81Z waveforms.
- Yamaha's own FM bass advice (reface DX): "medium-to-quick envelopes with a moderate sustain", "velocity control of
  the total brightness", and carrier ratio 2.00 instead of 1.00 for "big bottom end"
  ([Manny's Modulation Manifesto: Bass Sounds](https://yamahasynth.com/learn/synth-programming/basics-of-fm-synthesis-lesson-5-new/)).

### 2.4 Bass songs (verified vs folklore)

| claim | source | status |
|---|---|---|
| "Danger Zone" (Loggins) bass line on DX7 | [Wikipedia](https://en.wikipedia.org/wiki/Danger_Zone_(song)): "performed on a Yamaha DX7"; FACT: BASS 1 | **DX7 reported; preset = FACT only** |
| "Take On Me" (a-ha) uses BASS 1 | [FACT](http://www.factmag.com/2016/09/15/14-most-important-synths/); Reverb Machine (own analysis, "15-Bass 1 run through chorus") | **Folklore-ish.** [SOS Classic Tracks](http://www.soundonsound.com/sos/mar11/articles/classic-tracks-0311.htm) names a DX7 in the studio but never says what played the bass |
| "She's Fresh" (Kool & the Gang) uses BASS 1 | FACT only | **Unverified** |
| "What's Love Got to Do With It" bass = BASS 1 | Reverb Machine analysis | **By ear** |
| "Take My Breath Away" (Berlin) main riff = BASS 2 | [MusicRadar Dexed](https://www.musicradar.com/news/fantastic-free-synths-dexed); Reverb Machine "unmistakably" DX7 | **Widely reported, no interview found** |
| LatelyBass on Madonna "Vogue"; Babyface ran two detuned TX81Zs on it | [MusicRadar top 10 presets](https://www.musicradar.com/news/tech/the-top-10-classic-synth-presets-and-where-you-can-hear-them-637677) ("said to be"); Wikipedia (*citation needed*) | **Folklore** |

---

## 3. 80s analog / VA basses (for a saw/square/sub + 1 LP filter engine)

| sound | oscillators | filter | envelopes | source / status |
|---|---|---|---|---|
| "Thriller"-style Minimoog bass (Computer Music recipe) | saw 16' + square 16' detuned "a few cents" (~50%) + saw 8' (~70%) | cutoff ~3/10, emphasis ~3/10, env amount ~40% | filter attack near 0 ("too far will veer off into the 70s"), decay short (10 o'clock) | [MusicRadar](https://musicradar.com/how-to/recreate-thriller-synth-minimoog) |
| "Thriller" bass, other account | detuned saw + square | cutoff **150 Hz**, resonance ~half | decay **~100 ms** | [MusicRadar Thriller sounds](https://www.musicradar.com/news/thriller-synth-sounds), says the synth was an **ARP 2600** (Anthony Marinelli). **Synth disputed** (Minimoog vs ARP 2600) |
| Juno "synthwave" bass (Roland) | saw max, square 0, **sub 60-70%** | cutoff 20%, env +30-50%, velocity 20-30% | filter A0 D71 S0 R71; amp A0 D0 S100% R31; chorus off | [Roland articles](https://articles.roland.com/sound-design-creating-juno-basses/) (modern JUNO-X scale) |
| Juno acid bass (Roland) | square, 8' | freq 23, reso 204 (0-255), env high | A0 S0 R5, mono, portamento ~20% legato | same |
| "Sweet Dreams" bass sequence | Roland **SH-101** | (no settings) | | [SOS Classic Tracks](https://www.soundonsound.com/techniques/classic-tracks-eurythmics-sweet-dreams): "The drum computer was triggering a sequence into the Roland SH-101". **Verified (interview)** |
| "Blue Monday" bass | **Moog Source** + home-made Powertran sequencer | (patch lost) | | [Wikipedia Moog Source](https://en.wikipedia.org/wiki/Moog_Source) (uncited line); Roger Lyons quoted via [Red Bull](https://redbull.com/gb-en/7-classic-songs-made-with-moog-synths) (seen only in a search summary). **Reported, weakly sourced**; recreations are guesses |
| "Billie Jean" bass | Louis Johnson bass guitar, Minimoog enters with the chords; Marinelli hears 3 synths + bass guitar | | | [MusicRadar](https://www.musicradar.com/news/thriller-synth-sounds). **Partly verified** |

Common thread (reading of the recipes): saw (+ square or sub an octave down), cutoff low, envelope amount 30-50%,
filter decay ~100-300 ms, no filter attack, amp full sustain, mono, chorus off or narrow (Reverb Machine keeps the
"Take On Me" bass chorus narrow "to keep the track's mono power").

---

## 4. Synth chords, pads and stabs

### 4.1 Juno-60 chorus (measured)

From recordings of a real Juno-60 ([pendragon-andyh/Juno60, Chorus](https://github.com/pendragon-andyh/Juno60/blob/master/Chorus/README.md)):
one triangle LFO, two 256-stage BBD lines, right channel's modulation inverted (180 degrees).

| mode | rate | delay min-max | output |
|---|---|---|---|
| I | **0.513 Hz** | 1.66-5.35 ms | stereo |
| II | **0.863 Hz** | 1.66-5.35 ms | stereo |
| I+II | 9.75 Hz | 3.3-3.7 ms | mono (Leslie-like) |

Service notes label I/II/I+II as 0.5 / 0.83 / "1" Hz (Juno-6: 0.4 / 0.67 / 8.06 Hz). A ~12 dB low-pass sits before the
BBDs (KVR thread cited there). Pad recipe on TAL-U-NO-LX: saw + sub, amp A~6 D~10 S~8 R~7 (of 10), cutoff ~7 reso ~2,
env amount 3 inverted, chorus I ([MusicRadar](https://www.musicradar.com/how-to/how-to-create-an-80s-juno-style-pad-sound)).

### 4.2 Brass stabs

| sound | recipe | source / status |
|---|---|---|
| DX7 **BRASS 1** (ROM1A #1), structure | Alg 22: a 0.50 pair (OP2->OP1) under three 1.00 carriers fed by one feedback modulator (OP6, the "filter"), whose slow attack is the brass swell; the carriers a few cents apart; light vibrato. | ROM1A, decoded (section 0) |
| Minimoog brass (Gordon Reid) | saw 4' at mixer 5/10, cutoff closed (-5), contour amount 6.5/10, emphasis 2/10, keyboard tracking 100%. **Filter A 600 ms D 800 ms S 5/10**, amp A 100 ms S 10. The slow filter attack lets harmonics enter "over about half a second", like real brass | [SOS Jun 2001 Synth Secrets](https://www.soundonsound.com/techniques/brass-synthesis-minimoog) |
| SH-101 brass (Reid) | saw only, VCF near 0, touch of resonance, env near max, key follow just under 100%, ADSR ~20/50/50/20%, VCA on gate | [SOS Jul 2001](https://www.soundonsound.com/techniques/roland-sh101-arp-axxe-brass-synthesis) |
| "Jump" (Van Halen), OB-Xa | Recreation (Dune CM): saws, osc 1 -5 cents / osc 2 +5 cents and +1 octave, 24 dB LP cutoff 50%, reso 42%, filter env ~83%, filter A 12% S 76% R 19%, amp A 7% R 24%, plus reverb. OB-Xa voices drift apart in tuning: "massive chords" | [MusicRadar Jump at 40](https://www.musicradar.com/news/van-halens-Jump-at-40-how-the-most-famous-keyboard-riff-of-all-time-was-created-and-how-you-can-too). Synth: "performed on an Oberheim OB-Xa" ([Wikipedia](https://en.wikipedia.org/wiki/Jump_(Van_Halen_song)) citing Guitar World). **Reported**; Reverb.com says the video shows an OB-Xa but the 1983 studio part may have been an OB-X (via search summary; reverb.com blocked direct reading) |
| "Sweet Dreams" lead/strings | Oberheim OB-X "soft string sound that we managed to cut off so it made it more attacking" | [SOS Classic Tracks](https://www.soundonsound.com/techniques/classic-tracks-eurythmics-sweet-dreams). **Verified (interview)** |

### 4.3 Other chord colours

| sound | recipe | source / status |
|---|---|---|
| "Take On Me" riff | Roland Juno-60 "provided the song's main theme" | [SOS Classic Tracks](http://www.soundonsound.com/sos/mar11/articles/classic-tracks-0311.htm). **Verified (interview)**. Reverb Machine hears DX7 SYN-LEAD 3 doubled on it (analysis) |
| "Thriller" verse pad | Jupiter-8 (2 detuned saws, cutoff ~650 Hz, light LFO) + CS-80 (1 saw, lower cutoff) | [MusicRadar](https://www.musicradar.com/news/thriller-synth-sounds); synths per Marinelli; settings "likely" |
| "Billie Jean" chord stab | CS-80, single saw, LP ~**305 Hz**, soft attack/decay opening the filter; 3 CS-80 patches + vocal oohs | [MusicRadar](https://www.musicradar.com/news/thriller-synth-sounds), [MusicRadar stack](https://musicradar.com/news/billie-jean-chord-stack-synths). Who played it is disputed (Boddicker vs Wolfer) |
| PPG "Choir" (digital vocal-bell chord) | PPG Wave 2.2/2.3 preset; Depeche Mode "See You" | [MusicRadar top 10 presets](https://www.musicradar.com/news/tech/the-top-10-classic-synth-presets-and-where-you-can-hear-them-637677). No numbers |
| FM bell-chords on the FM-1 | ROM1A has E.PIANO/brass/bell hybrids to start from (2B #19 E.P-BRS BC, 4B #13 PIANO-BRS, 4B #14 BRS-CHIME) | names from the decoded banks |

No source was found that ties a specific EP or chord sound to a "Lately" record; the only well-sourced "Lately"
sound is the TX81Z bass.

---

## 5. Licensing (short)

- **Dexed's repo does not ship the DX7 factory ROMs.** Its built-in bank `assets/builtin_pgm.zip` holds
  `Dexed_01.syx` plus `SynprezFM_01..32.syx` (listed from the zip); `source/PluginData.cpp` unzips them on first run
  and loads `Dexed_01.syx` at startup ([PluginData.cpp](https://github.com/asb2m10/dexed/blob/master/source/PluginData.cpp)).
  Dexed_01 is not ROM1A (its voices are "Say Again.", "LAURIE", ...). Dexed is GPL v3; msfa "stays on the Apache 2.0
  license" ([README](https://github.com/asb2m10/dexed/blob/master/README.md)). MusicRadar: Dexed "is capable of
  loading original Yamaha DX7 preset files" the user installs ([MusicRadar](https://www.musicradar.com/news/fantastic-free-synths-dexed)).
- **MiniDexed does ship ROM1A**: `src/voices.c` is the 32 ROM1A voices (BRASS 1 ... E.PIANO 1 ...) as C arrays
  ([voices.c](https://github.com/probonopd/MiniDexed/blob/main/src/voices.c)); its `getsysex.sh` downloads ROM3A-4B
  and the VRC carts from yamahablackboxes.com, with the ROM1A-2B lines commented out. No licence statement for the
  voice data was found in its README, which calls Yamaha "a well-known Japanese manufacturer".
- **Yamaha's stated position** ([Proprietary Rights Notice](https://usa.yamaha.com/about_yamaha/proprietary_rights_notice/)):
  owners may use "Programmed Sounds" (incl. VOICES) in compositions, performances and recordings, "regardless of
  whether ... for profit"; prohibited: "Making copies of Yamaha's Programmed Sounds and making them commercially
  available or sharing them over the Internet with third parties" and "Copying or distributing ... any Programmed Sounds."
- **Is patch data copyrightable?** No court case found. Forum and non-lawyer opinions split between "just settings"
  and "a program" ([KVR thread](https://www.kvraudio.com/forum/viewtopic.php?p=6715255)). Unsettled.
- **So (our recommendation, not legal advice):** don't put ROM1A bytes in the GPL firmware. Build our own patches
  from the published structure (algorithm, ratios, which operator does what) with our own numbers, and cite the
  source in a comment, as `slime_fm6.py` already does.

## Could not verify
- Any original Yamaha parameter sheet page for E.PIANO 1 (the ROM data is the sheet).
- LatelyBass's true parameters (only an emulation's patch); the name's origin.
- How any proposed "smooth" tweak sounds: needs a render and an ear.
- The Guardian and Economist articles behind Wikipedia's E.PIANO 1 claims (blocked here); reverb.com's "Jump" page (403).

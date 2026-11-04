# Mix levels: how loud the drums may sit against the melody (2026-11-04)

Research only. No code was changed. Words follow `_docs/GLOSSARY.md`. Tags: **[P]** primary source, read this pass;
**[S]** secondary, or a primary I could only see quoted; **[D]** my own derivation or judgement from the cited numbers
(check it). App facts are from `index.html` at commit `84b6a2f`.

## TLDR: proposed test thresholds (all LU = dB of K-weighted loudness, each part rendered alone at the real output)

1. **Measure** each part alone through the real output chain (the way `dev-bassmix` step 4 already does), per kit, over
   8+ bars. Use BS.1770 K-weighting (two biquads, exact coefficients at 48 kHz) and an *ungated* mean over the same span
   for every part, plus a fast 100 ms window for single drum pieces [D, from BS.1770-5 and Tech 3341, sec. 2].
2. **Melody is the loudest part**, by at least **3 LU** over every other part, every kit. Adult mixes put the lead
   vocal about **7 LU** above the next loudest part (bass) [D from De Man et al. 2014, P].
3. **Drum bus** (all pieces together): fail if louder than **melody - 6 LU** in pop/rock/disco-type kits, and than
   **melody - 9 LU** in soft kits (bossa, jazz, lo-fi). Aim for -9 / -12. Adult mixes average about -6.4 [D]; the
   extra 3 dB is a margin for children [D]; the soft-kit offset is judgement, not sourced.
4. **Any one drum piece** (clave, ride, hat, rim, shaker, conga, snare, kick): fail if louder than **melody - 10 LU**
   (soft kits: **-13**). In adult mixes each drum track sat **10-14 LU** under the vocal [P].
5. **Transients**: each piece's loudest 100 ms window must sit at least **3 LU** under the melody's median 100 ms
   loudness while it plays. A 400 ms meter reads a 60 ms click up to ~4 dB lower than the ear hears it [D].
6. **Presence band** (2.8-5.6 kHz octave, where the ear is most sensitive): drum bus at least **6 dB** under the melody
   in that band, as a smoke alarm. Mix ratings fell as the share of 4 kHz energy rose (weak, r = -0.21) [P] [D].
7. **Bass** in the normal mix: between **melody - 10** and **melody - 3 LU** (adults: about -7 +/- 3) [D]. This is
   a different check from `dev-bassmix` 4, which points the triangle at the bass.
8. **Melody vs the whole band** (bass + chords + drums summed): at least **+1 LU** (the pop norm since ~1975), aim for
   +4 [P/S, D].
9. **Ride must not be a note**: real cymbals have hundreds of inharmonic modes [P]. The app's ride is three sines at
   1:2:3 on the tonic, so it is a pitched note by design (`index.html:3081-3096`). Check that its pitch strength stays low [D].
10. Every source gives means with about +/-3 LU spread; **none gives numbers for bossa, jazz, lo-fi or kids' music**.
    Report per kit, then Flah listens once.

---

## 1. Measured stem levels in real mixes

**De Man, Leonard, King & Reiss, ISMIR 2014**, "An analysis and evaluation of audio features for multitrack music
mixtures" [P] (https://archives.ismir.net/ismir2014/paper/000293.pdf). This is the only study I found that measured
per-instrument loudness in finished mixes.
- 8 songs, each mixed by 8 McGill MMus engineers. Second verse + chorus only. Each track was rendered alone through
  the unchanged signal path. Loudness was BS.1770 with Pestana's multitrack tweak (280 ms window, +10 dB pre-filter
  gain), relative to the whole mix.
- Loudness relative to the mix (Table 2 / Fig. 1): kick **-13.15 LU** (sd 3.9), snare **-16.78** (sd 4.6), other drums
  (overheads, toms, room) **-12.68** (sd 2.8), bass **-9.50** (sd 2.9), lead vocal **-2.65** (sd 1.3). The text says:
  "the vocal is significantly louder than the other elements", with a "target loudness of about -3 LU relative to the
  overall mix". No other pair of elements differed significantly.
- Caveat: the snare reads low because the overheads also carry it ("crosstalk between the drum microphones").
- Caveat: in the extracted table the column headings and values do not line up for the bass and vocal columns. I took
  vocal = -2.65 because the text gives -2.7 +/- 1.6 and the figure orders "kick snare rest vocal bass". Check the PDF.
- [D] Gaps against the vocal: kick 10.5, snare 14.1, other drums 10.0, bass 6.9 LU. If the three drum groups add as
  uncorrelated power, all drums together come to about -9.1 LU of the mix, which is **~6.4 LU under the vocal**.
  (They are partly correlated through the overheads, so the true sum could be up to ~2 dB higher.)
- Crest factors (peak over RMS) were much higher for drum tracks than for vocal and bass (1 s window: roughly 10-17
  for drums vs 4-5 for bass/vocal, units as in Table 2), and every track's crest factor went *up* in the mix.
- Engineer choice changed the level of bass, snare and other drums significantly; the vocal level barely moved.

**Gerdes & Siedenburg, JASA Express Letters 3, 043201 (2023)**, "Lead-vocal level in recordings of popular music
1946-2020", DOI 10.1121/10.0017773 [S: abstract and press only; full text 403'd]
(https://acoustics.org/lead-vocal-tracks-in-popular-music-go-quiet/, https://uol.de/en/news/article/singing-has-become-quieter).
- Lead vocal vs everything else (lead-to-accompaniment ratio, LAR): about **+5 dB** before the trend, falling to
  about **+1 dB** by ~1975, flat since. Stems came from source separation (vocals, bass, drums, other).
- Country > rap > pop > rock (about 0) > metal (negative). Solo artists sit higher than bands.
- I could not read the loudness model or the per-genre numbers.

**Pestana & Reiss, AES 53rd Conf. 2014**, "Intelligent audio production strategies informed by best practices"
[S, via https://www.sageaudio.com/articles/testing-new-academic-research-improved-vocal-production; the QMUL PDF 404'd]:
the vocal should be "equal in loudness to the rest of the mix". That agrees with Gerdes' ~+1 dB.

**Wichern et al., AES 139 (2015)** (https://www.aes.org/e-lib/browse.cfm?elib=17928) [S, abstract]: automatic level
setting from instrument-dependent loudness targets; listeners preferred the simplest energy-based loudness model over
psychoacoustic models with masking. So a plain K-weighted meter is a defensible test, not a shortcut.

## 2. What engineers say (no numbers)

- **Mike Senior, SOS, June 2009** [P] (https://www.soundonsound.com/sound-advice/q-whats-best-order-mixing): "start
  your mix with the most important track and then add in successively less important tracks", because tracks mask
  each other; important tracks added late are hard to get clear, "a common problem for those who only introduce their
  lead vocal track right at the end".
- **Senior, Mix Rescue: jazz trio, SOS, April 2008** [P] (https://www.soundonsound.com/techniques/mix-rescue-jazz-trio):
  "The cymbals were already quite prominent in the mix", so he cut 2.5 dB with a high shelf at 2.5 kHz. No level for
  drums against piano or bass.
- **Steve Smith (drummer)** [S] (https://vitalinformation.com/news/drumtalk/equipment.htm): jazz ride cymbals should
  blend with an upright bass and not be too loud.
- Bossa nova teaching sources [S]: the part is usually a cross-stick on the snare rim that imitates a clave, played
  "lightly", heel down (https://www.rockdrummingsystem.com/underground/drum-lessons/bossa-nova.php,
  https://www.ujam.com/tutorials/how-to-make-bossa-nova/). None gives a level.
- I found **no** published dB guidance for percussion against the melody from a working engineer. Mixing Secrets'
  "Building the raw balance" chapter is the likely place, but I could not read it.

## 3. How to measure

- **ITU-R BS.1770-5 (Nov 2023)** [P] (https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.1770-5-202311-I!!PDF-E.pdf):
  K-weighting = stage 1 shelf (head model) + stage 2 high-pass, coefficients given **for 48 kHz only**. Gating blocks
  of 400 ms with 75% overlap; absolute gate -70 LKFS, relative gate -10 dB. +1 dB of signal = +1 LKFS.
  [D] From Table 1 the shelf's high-frequency gain is (b0-b1+b2)/(1-a1+a2) = 5.425/3.423 = **+4.0 dB**. That is all the
  extra weight the meter gives the 2-5 kHz region.
- **EBU Tech 3341 (v3, rev. Nov 2023)** [P] (https://tech.ebu.ch/docs/tech/tech3341.pdf): Momentary = sliding
  rectangular **0.4 s** window, Short-term = **3 s**, both ungated; integrated uses the two gates.
- **Stems are not what BS.1770 was tuned for.** Pestana & Barbosa found it inconsistent for single multitrack sources
  and proposed a **280 ms** block and **+10 dB** on the shelf; Fenton & Lee and Fenton (AES 145, 2018) proposed
  per-instrument filter sets that listeners preferred [P, as summarised in Steinmetz & Reiss, pyloudnorm, AES 2021,
  https://joshreiss.github.io/documents/2021/21076.pdf; Fenton: https://pure.hud.ac.uk/en/publications/automixing-of-multitrack-material-using-modified-loudness-models/].
- [D] Practical rules for our suite:
  - Render the `OfflineAudioContext` at **48000 Hz** and use an `IIRFilterNode` with the exact Table 1/2 coefficients.
    Then no filter re-derivation is needed.
  - Compare parts with an **ungated mean over the same time span**. The relative gate is computed per stem, so a sparse
    part (clave hits with gaps) would lose its gaps and read louder than a continuous part.
  - Melody: use a scripted or seeded melody (auto-notes are random), so the level is stable between runs.
  - Take the **median over several seeds** and keep the per-kit numbers in the output, like `dev-bassmix` prints.

## 4. Why a click can drown a melody at a modest average level

- **Loudness integration is shorter than the meter.** For sounds under ~200 ms, perceived loudness follows the energy
  summed over roughly **50-200 ms** (Buus et al.; Zwislocki) [S] (https://core.ac.uk/download/13742834.pdf,
  https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.785093/pdf). [D] A 400 ms block spreads
  a 60 ms hit over 400 ms; an ear window of ~150 ms spreads it over 150. That is 10log10(400/150) = **~4 dB** of
  under-reading. Hence the 100 ms window in threshold 5.
- **Forward masking.** A loud sound raises the threshold for what follows: the onset effect lasts about 20 ms, the
  offset about 100 ms, and short maskers (<200 ms) mask more [S] (https://en.wikipedia.org/wiki/Auditory_masking,
  https://portal.fis.tum.de/en/publications/on-the-dependence-of-forward-masking-on-masker-duration/). A clave on
  every melody onset sits right in that window.
- **Most sensitive band.** The ear is "most sensitive between 2 and 5 kHz", mostly from ear-canal resonance [S]
  (https://en.wikipedia.org/wiki/Equal-loudness_contour). The current standard is **ISO 226:2023**, which differs from
  2003 by at most 0.6 dB [S] (https://webstore.ansi.org/preview-pages/ISO/preview_ISO+226-2023.pdf). I could not read
  the Annex B table, so I give no dB figure for how much more sensitive 2.5 kHz is than the melody's register.
- **Mix ratings and 4 kHz.** In De Man et al., AES 138 (2015) [P]
  (https://joshreiss.github.io/documents/2015/DeMan%20Reiss%20-%20AES138.pdf), mixes with a higher share of energy in
  the 4 kHz octave were rated lower (Pearson r = -0.207, p = .042; Spearman and Kendall not significant). This is weak
  evidence, which is why threshold 6 is only a smoke alarm.
- **Crest factor.** Drum tracks have 2-4x the crest factor of vocal and bass (section 1). Equal LU therefore means much
  higher peaks, and peaks are what read as "hits".

## 5. Cymbals that sound like notes

- Gordon Reid, "Analysing Metallic Percussion", SOS Synth Secrets, May 2002 [P]
  (https://www.soundonsound.com/techniques/analysing-metallic-percussion): a struck cymbal has "hundreds of energised
  modes"; "the frequencies produced by a real cymbal are far from harmonic"; when hit hard "the cymbal's spectrum is,
  in essence, noise". Energy sits at a few hundred Hz first, then "rings at a few kHz".
- App fact: the ride (`index.html:3081-3096`) is three **sines at f0, 2f0, 3f0**, with f0 = the key's tonic placed at
  880-1760 Hz. A 1:2:3 series is a harmonic tone, so it is heard as a note at the tonic. The comment says so ("A sine
  bell has a clear pitch (real cymbals do not)"). That matches Flah's "sounds like a note".
- [D] Test idea: the ride stem's normalised autocorrelation peak (pitch strength) stays under ~0.3, or its partials are
  not integer multiples. No source gives a number here; tune it by ear.

## 6. Children

- **Leibold & Buss 2019**, "Masked Speech Recognition in School-Age Children", Frontiers in Psychology [P]
  (https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6733920/): young school-age children need **5-10 dB** more SNR than
  adults against two competing talkers. Against steady noise, 5-16-year-olds need about **2.3 dB** more. Corbin et al.
  (quoted there) found **~7 dB** (two-talker) and **~3 dB** (speech-shaped noise) for ages 5-10. Adult-like results
  usually arrive at **9-10 years**.
- [D] Drums are noise-like and rhythmic, not speech, so the steady-noise end (about 2-3 dB) is the closer analogue. That
  is the **3 dB kids' margin** in thresholds 3 and 8. This transfers a speech result to music; no study tests it.
- "Discrimination of Simultaneous Melodies" (JRME 1999, n = 73) [S, abstract]
  (https://www.sciencegate.app/document/10.2307/3345716): about 70% of first graders heard two melodies (75% correct),
  against over 95% of fifth graders (97% correct). The upper-register melody and the trumpet (vs piano) were picked
  first. Stream segregation keeps developing into adolescence [S]
  (https://pmc.ncbi.nlm.nih.gov/articles/PMC10963424).
- Hearing-impaired listeners prefer a louder lead vocal and sparser mixes (Benjamin & Siedenburg, JASA 2023,
  DOI 10.1121/10.0020269) [S] (https://hearingreview.com/hearing-loss/hearing-loss-prevention/music-entertainment/why-hard-of-hearing-music-fans-prefer-a-different-sound).
- I found **no** source on mix levels for children's or educational music. "The melody must stay loudest" rests on
  adult mix data (section 1), Senior's priority rule, and the children's SNR data above.

## 7. App facts that bear on the complaint (not sources, just the code)

- Clave (`index.html:3115-3127`): a **2500 Hz sine**, peak gain **0.34 x a**, gone in 60 ms, plus a 3.2 kHz noise tick.
  It sits in the ear's most sensitive band and lasts shorter than any loudness meter's window. The ride's loudest
  partial peaks at **0.034 x a**, so the clave voice is **20 dB** hotter before the drum bus (raw voice gains only).
- Bossa pattern (`index.html:2847`): clave on 5 sixteenths a bar plus 8 hats and 4 kicks. The comment says it was
  given the clave rather than a rim click "so a child can pick it out", and the kit title says "listen for the clave".
  This is a design tension: the signature sound has to be findable and still sit under the melody. Thresholds 4-5 allow
  that if it is distinct in timbre rather than loud.
- `dev-bassmix` 4 already renders each part alone at the real output, so it is the template for thresholds 1-4.

## Open / unverified

- **No numbers for soft genres.** The soft-kit offsets (-9 drum bus, -13 per piece) are my judgement. A real fix:
  measure stems of reference recordings (e.g. MedleyDB or Cambridge-MT jazz/bossa multitracks) with the same meter.
- ISMIR 2014: 8 songs, one school, pop/rock/jazz mix; the table layout problem in section 1. Gerdes 2023: per-genre
  values and the loudness model not read (403).
- Pestana & Reiss 2014 "vocal = rest of mix" seen only second-hand.
- The 3 dB children's margin carries a speech-in-noise result over to music. No study measured it for melody vs drums.
- The ~4 dB transient under-reading (threshold 5) and the 6 dB presence-band rule (threshold 6) are arithmetic and
  judgement, not measurements. Sabotage them, then listen.
- ISO 226:2023 Annex B values not read (paywalled), so there is no sourced dB figure for 2.5 kHz vs the melody register.
- No measured spectrum of real claves found. Our clave's 2.5 kHz is the app's own choice.
- Phone speakers (no lows, a peak around 2-4 kHz on many models) would push drums *up* against the melody. Not
  measured here; `dev-bassmix` has a phone-speaker model to reuse.
- How it sounds: none of this replaces Flah listening once at the end.

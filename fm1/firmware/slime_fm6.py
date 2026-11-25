    # ---- Slimehedron's FM patches (fm1/firmware/slime_fm6.py, inserted by patch_sloop.py). No factory ROM data of any
    # instrument: each is written from DOCUMENTED technique, cited. Montage FM-X times (0..99, longer = slower) are read
    # as DX7 rates 99 - time; its levels as is; Lvl/Vel as key velocity sensitivity; Time/Key as rate scaling; detune
    # +-7 as 14 / 0 (7 = centre); break points in DX7 numbering (C3 = 39).
    # SH TINE: Yamaha, "FM 101, Part Five: Expanding Your Sound" (yamahasynth.com): the E.PIANO 1 tine rebuilt as three
    # modulator / carrier pairs, a ratio-14 modulator for the bite, detune +-7 for the beating, feedback 6. DX7
    # algorithm 5 is that structure (6 -> 5, 4 -> 3, 2 -> 1, feedback on 6).
    ("SH TINE", voice("SH TINE", 5, [
        op(r=(99, 34, 34, 74), l=(99, 75, 0, 0), ol=99, det=10, kvs=2, rs=3),          # carrier (its Op6)
        op(r=(99, 69, 53, 84), l=(99, 75, 0, 0), ol=60, fc=14, kvs=7, rs=3),          # the ratio-14 bite (Op5)
        op(r=(99, 29, 29, 59), l=(99, 95, 0, 0), ol=99, det=0, rs=3),                 # carrier (Op4 = Op2)
        op(r=(99, 41, 31, 59), l=(99, 95, 0, 0), ol=91, det=14, kvs=6, rs=3),         # modulator (Op3)
        op(r=(99, 29, 29, 59), l=(99, 95, 0, 0), ol=99, det=0, rs=3),                 # carrier (Op2)
        op(r=(99, 43, 33, 59), l=(99, 95, 0, 0), ol=81, det=14, kvs=6, rs=3, bp=41, ld=19, rd=19)],   # feedback (Op1)
        fb=6, lpms=0)),
    # SH BASS: Yamaha, "FM 101, Part Five" (the two-operator bass: carrier times 0/13/52/96/46 levels 99/70/55/0,
    # modulator level 76 times 0/0/59/51/95 levels 97/78/38/0) with "Part Six: Complex Systems"'s slightly sharp
    # modulator (ratio 1.01, level 77, times 0/10/31/83/90 levels 99/74/0/0) on a second carrier: the pitch ambiguity
    # the article names as typical of synth bass. The carriers hold at a fuller level than the article's (85 / 80, not
    # 70 / 55): the band holds its bass notes, and at 55 a held note sat 16 LU under the bass part (measured, slimehost)
    # while the modulators still decay, so the bark fades and the body stays.
    ("SH BASS", voice("SH BASS", 5, [
        op(r=(86, 47, 30, 53), l=(99, 85, 80, 0), ol=99, kvs=2, rs=3),
        op(r=(99, 40, 48, 4), l=(97, 78, 38, 0), ol=76, kvs=1),
        op(r=(86, 47, 30, 53), l=(99, 85, 80, 0), ol=88, det=14, kvs=2, rs=3),
        op(r=(89, 68, 16, 9), l=(99, 74, 0, 0), ol=77, ff=1, kvs=2, rs=4),
        op(ol=0),
        op(ol=0)],
        fb=0, lpms=0)),
    # SH HARP: Yamaha, "FM 101, Part Six": HARP 1, an attack stack (a feedback modulator at ratio 2 -> a modulator -> a
    # carrier) and a body stack (three operators, key-scaled to tame the top), feedback 7. DX7 algorithm 3 is two
    # three-operator stacks with feedback on 6.
    ("SH HARP", voice("SH HARP", 3, [
        op(r=(99, 37, 54, 39), l=(99, 70, 0, 0), ol=99, kvs=7, rs=3),                 # body carrier (Op8)
        op(r=(99, 45, 99, 38), l=(99, 70, 0, 0), ol=77, kvs=3, rs=3, bp=52, ld=8, lc=3),   # (Op7)
        op(r=(99, 53, 55, 43), l=(99, 70, 0, 0), ol=89, kvs=0, rs=3, bp=58, rd=37),    # (Op6)
        op(r=(99, 39, 58, 38), l=(99, 70, 0, 0), ol=99, kvs=7, rs=3),                 # attack carrier (Op5)
        op(r=(99, 57, 99, 24), l=(99, 70, 0, 0), ol=57, kvs=4, rs=3),                 # (Op4)
        op(r=(99, 66, 49, 36), l=(94, 79, 0, 0), ol=88, fc=2, kvs=1, rs=6)],          # feedback, ratio 2 (Op3)
        fb=7, lpms=0)),
    # SH BELL: J. Chowning, "The Synthesis of Complex Audio Spectra by Means of Frequency Modulation" (JAES, 1973):
    # a bell is a carrier : modulator ratio of 1 : 1.4 (an inharmonic spectrum) with the modulation decaying with the
    # sound, so the tone mellows as it dies. Two such pairs (and a short ratio-3.5 strike, the glassy attack), the second detuned a little for the shimmer. The index is
    # kept low enough that the carrier stays the loudest partial (at Chowning's full index the 0.4x difference tone
    # was, measured: a bell an octave and a bit under its wall, out of key)
    ("SH BELL", voice("SH BELL", 5, [
        op(r=(99, 28, 22, 30), l=(99, 70, 0, 0), ol=99, kvs=2, rs=2),
        op(r=(99, 36, 26, 30), l=(99, 55, 0, 0), ol=72, ff=40, kvs=3, rs=2),
        op(r=(99, 28, 22, 30), l=(99, 70, 0, 0), ol=92, det=10, kvs=2, rs=2),
        op(r=(99, 36, 26, 30), l=(99, 55, 0, 0), ol=68, ff=40, det=10, kvs=3, rs=2),
        op(r=(99, 45, 30, 30), l=(99, 50, 0, 0), ol=82, kvs=3, rs=2),                 # the strike: a third pair,
        op(r=(99, 62, 40, 40), l=(99, 20, 0, 0), ol=80, fc=3, ff=17, kvs=5, rs=2)],    # ratio 3.5, gone in a moment
        fb=0, lpms=0)),
    # SMOOTH EP (2026-11-25, Flah: the chords' default "the e piano sound of dx7, nice and smooth and chill"): DX7
    # E.PIANO 1's published structure (algorithm 5: three pairs; a ratio-14 tine, two 1:1 velocity "bark" modulators,
    # the pairs detuned against each other; _docs/research/2026-11-25-fm1-famous-sounds.md 1.1), on SH TINE's numbers
    # (FM 101's rebuild, above), then moved by measurement (soundprint.py: third-octave bands at eight moments, three
    # octaves, three velocities) towards a SOFTER E.PIANO 1: its tine 6 dB down and less velocity-sensitive, its feedback
    # 4, as Yamaha's own E.PIANO 3 / 4 soften it. Held-out notes land 0.8..3.1 dB from that sound (E.PIANO 1 itself is
    # 4.5..6 from it). No factory data: the factory voice was only rendered and listened to by the meter, and no
    # operator was let within 3 of the factory one in every rate, level and velocity (the fit's guard).
    # (its three carriers 6 steps (4.5 dB) under the fit's 99 / 99 / 95, the level given back as the part's trim: at full
    # output a chord drove SLOOP's DRIVE, which clips before any trim, so hard that the "crunch" fx took it 9.3 dB down
    # (check-host 6: within 6). The carriers only set the loudness: the sound is the same)
    ("SMOOTH EP", voice("SMOOTH EP", 5, [
        op(r=(99, 45, 34, 74), l=(99, 84, 0, 0), ol=93, det=10, kvs=2, rs=3),
        op(r=(99, 63, 38, 84), l=(99, 81, 0, 0), ol=60, fc=14, kvs=3, rs=3),
        op(r=(99, 20, 20, 59), l=(99, 95, 0, 0), ol=93, det=0, kvs=1, rs=3),
        op(r=(99, 62, 21, 59), l=(99, 89, 0, 0), ol=91, det=14, kvs=6, rs=3),
        op(r=(99, 29, 29, 59), l=(99, 96, 0, 0), ol=89, det=0, rs=3),
        op(r=(99, 31, 17, 59), l=(99, 92, 0, 0), ol=84, det=14, kvs=7, rs=3, bp=41, ld=19, rd=19)],
        fb=3, lpms=0)),
    # DX BASS (2026-11-25, Flah: synth basses "spectacular"): DX7 BASS 1's published structure (algorithm 16: one
    # carrier at 0.5 under three branches, a 5.00 and a 9.00 modulator that pluck and die fast, feedback 7, key sync;
    # research 2.1: the 80s FM bass of "Danger Zone", reported), every envelope started from SH BASS's (FM 101) and moved
    # by measurement towards BASS 1 re-voiced for the band: an octave up (it sounds at the band's note, as every bass
    # here does), a fuller held body, a softer bark. The band's notes, held out: 1.2..3.0 dB from it; its top falls
    # -9 -> -36 dB in 450 ms (the pluck). The same guard: no operator within 3 of the factory one.
    ("DX BASS", voice("DX BASS", 16, [
        op(r=(86, 34, 21, 53), l=(99, 92, 83, 0), ol=99, fc=0, kvs=2, rs=3),
        op(r=(99, 40, 42, 4), l=(97, 90, 38, 0), ol=74, fc=0),
        op(r=(86, 65, 24, 53), l=(99, 85, 62, 0), ol=88, fc=0, rs=3),
        op(r=(89, 56, 44, 9), l=(99, 86, 0, 0), ol=79, fc=5, kvs=7, rs=4),
        op(r=(86, 71, 36, 53), l=(99, 87, 79, 0), ol=70, fc=0, kvs=7, rs=3),
        op(r=(89, 62, 41, 9), l=(99, 84, 0, 0), ol=77, fc=9, kvs=2, rs=4)],
        fb=7, lpms=0, trnsp=36)),

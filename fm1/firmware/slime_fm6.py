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

#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-only
# Slimehedron for the FM-1: THE SITE'S DRUMS, hit for hit. Every kit's every piece (11 x 12) from the device's drum engine
# (slimehost_f sdhit: the single-precision build of slime_drums.c, nothing after it) against the same hit from the site's
# own dHit in the browser (fm1/host/site-hits.js), both at the same peak (the levels are check-host.sh's job); and the pop
# kit's 12 again through the whole device path (slimehost_f hit: the band's queue, the drum track, the mix, the master),
# which must still be the site's (a kit's trim puts a loud one into the bench master's limiter and a quiet one onto its
# noise floor: that is the mix, not the drum):
#   env   the shape in time (5 ms frames, dB): every hit within 4 dB, all of them 1.5 on average
#   spec  the colour (1/3 octaves, dB): every hit within 4.5 dB, all of them 1.5 on average
# Measured (2026-11-20): worst env 2.5 (conga's slap), worst spec 3.5 (disco's clave: the site's own 8 ms noise burst
# moves its bands up to 5 dB from one render to the next), means 0.40 and 0.85. The site against itself (two renders,
# the noise new): env up to 0.84, spec up to 1.7. SLOOP's drum synth with the site's numbers (the FM-1 before): env
# 12..58 dB, spec 15..42 dB. Sabotaged: SLOOP's drums on the path; the oscillators from -1 (a click); the metal 15 dB
# down; the decays by sl_exp2's cubic (every hit dead in 15 ms): each fails.
#   sh check-drums.sh SITEHITS_DIR          (in WSL; the dir from: node fm1/host/site-hits.js DIR, on the host)
#   SL_SITEDRUMS=0 sh check-drums.sh DIR    (sabotage: SLOOP's drum synth, as before: must fail)
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
SITE="${1:?the site hits dir (node fm1/host/site-hits.js DIR)}"
B="${B:-$HOME/fm1w/out/slimehost_f}"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
ki=0
for k in pop rock disco bossa jazz samba conga march chip beep industrial; do
  for n in 36 38 42 46 37 75 62 63 51 49 45 50; do
    [ -f "$SITE/$k-$n.raw" ] || { echo "no $SITE/$k-$n.raw: run node fm1/host/site-hits.js first"; exit 1; }
    "$B" sdhit $ki "$n" > "$T/h.raw"
    python3 "$HERE/host/drumcompare.py" "$T/h.raw" "$SITE/$k-$n.raw" "$k-$n"
    if [ "$k" = pop ]; then                                    # (30: under the bench master's limiter)
      SL_HITLVL=30 SL_DRY=1 "$B" hit "$k" "$n" > "$T/h.raw"
      python3 "$HERE/host/drumcompare.py" "$T/h.raw" "$SITE/$k-$n.raw" "path:$k-$n"
    fi
  done
  ki=$((ki + 1))
done > "$T/all.txt"
awk '
  { n++; e += $3; s += $5; if ($3 > 4) { be++; print "  FAIL  " $1 " env " $3 " dB (the shape in time)" } if ($5 > 4.5) { bs++; print "  FAIL  " $1 " spec " $5 " dB (the colour)" }
    if ($3 > we) { we = $3; wn = $1 } if ($5 > ws) { ws = $5; wsn = $1 } }
  END { me = e / n; ms = s / n
    printf "  %s  %d hits, every one within 4 dB in time and 4.5 dB in colour (worst %s %.2f, %s %.2f)\n", (be + bs) ? "FAIL" : "PASS", n, wn, we, wsn, ws
    printf "  %s  on average %.2f dB in time, %.2f dB in colour (<= 1.5 each)\n", (me <= 1.5 && ms <= 1.5) ? "PASS" : "FAIL", me, ms
    if (be + bs || me > 1.5 || ms > 1.5) { print "drums: FAILED"; exit 1 } print "drums: the site'"'"'s, hit for hit" }' "$T/all.txt"

#!/bin/sh
# Slimehedron for the FM-1: serves SLOOP's own web installer around a firmware package, on this pc only.
#   sh fm1/firmware/install-site.sh [FILE.fwsc]     (default: _fm1-firmware/slimehedron-fm1.fwsc)
# or double-click _fm1-firmware/INSTALL-ON-FM1.bat. Then http://localhost:8766/webapp/installer/ in Chrome or Edge
# (Web MIDI needs one of them, and localhost). The page says SLOOP: it is SLOOP's installer (the update path, the
# backup, the way back to stock are SLOOP's, untouched). Ctrl+C stops the page.
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
WORK="${WORK:-$HOME/fm1w/slime-fw}"          # the patched SLOOP copy build-device.sh made (its web/ tools)
FW="${1:-$ROOT/_fm1-firmware/slimehedron-fm1.fwsc}"
SITE="$HOME/fm1w/site"
[ -f "$FW" ] || { echo "no $FW: run build-device.sh first"; exit 1; }
[ -d "$WORK/web" ] || { echo "no $WORK: run build-device.sh first"; exit 1; }
rm -rf "$SITE"
(cd "$WORK" && python3 web/make_site.py "$FW" dev "$SITE")
echo
echo "open http://localhost:8766/webapp/installer/ in Chrome or Edge, plug the FM-1 in with a data cable, follow the page."
echo "back up first (the page offers it). Ctrl+C here when done."
python3 -m http.server 8766 --bind 127.0.0.1 --directory "$SITE"

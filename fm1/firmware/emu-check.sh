#!/bin/sh
# Slimehedron for the FM-1: the built firmware in fm1-emu's STRICT mode (measured cycles per instruction on both cores,
# flash-cache misses, the LCD at its real SPI clock, misaligned accesses fault), on the newer UC25HQ80 flash.
#   sh fm1/firmware/emu-check.sh [MS] [KEYS]       (after build-device.sh; KEYS in fm1-live's FM1_BENCH_KEYS form)
# Prints the frame rate, the audio interrupt's share, the audio level over time, and writes a contact sheet of the
# screen to ~/fm1w/out/emu-sheet.png. Needs fm1-live built (see the spec: ALSA unpacked locally, no root).
set -eu
MS="${1:-8000}"
KEYS="${2:-}"
FW="${FW:-$HOME/fm1w/slime-fw/build/felucca.fwsc}"
EMU="${EMU:-$HOME/fm1w/fm1-emu}"
OUT="${OUT:-$HOME/fm1w/out}"
TC="${JIELI_TOOLCHAIN:-$HOME/.jieli/toolchain}"
R="$HOME/local/root"; export LD_LIBRARY_PATH="$R/usr/lib/x86_64-linux-gnu"
ELF="$(dirname "$FW")/felucca.elf"
addr() { "$TC/common/bin/objdump" -t "$ELF" | awk -v s="$1" '$NF==s{print $1}'; }
A="$(addr sl_frames)"
rm -rf "$OUT/rec"
cd "$EMU"
FM1_STRICT=1 FM1_NO_PLAY=1 FM1_DUMP="$A" FM1_BENCH_KEYS="$KEYS" ./target/release/fm1-live --fwsc "$FW" --flash-chip uc25hq80 \
  --midi none --shot "$MS" --lcd-only --record "$OUT/rec" > "$OUT/emu.log" 2>&1 || { tail -20 "$OUT/emu.log"; exit 1; }
grep -E "fault|EMU_MSG|crash" "$OUT/emu.log" && echo "  (see $OUT/emu.log)"
python3 - "$OUT" "$MS" <<'EOF'
import os, re, struct, sys
out, ms = sys.argv[1], int(sys.argv[2])
log = open(out + "/emu.log").read()
d = re.search(r"dump 0x[0-9a-f]+: ([0-9a-f]+) ([0-9a-f]+) ([0-9a-f]+)", log)
frames, fms, px = (int(x, 16) for x in d.groups()) if d else (0, 0, 0)
lcd = re.search(r"LCD: on the wire (\d+)%", log); isr = re.search(r"(\d+)% of instructions in ISRs", log)
a = open(out + "/rec/audio.raw", "rb").read(); s = struct.unpack("<%dh" % (len(a) // 2), a); q = 22059 * 2
peaks = [max(map(abs, s[i:i + q])) for i in range(0, len(s), q)]
print(f"frames {frames} in {ms} ms (the first ~1.3 s is the boot); last frame {fms} ms; pixels sent {px} of 57600")
print(f"LCD on the wire {lcd.group(1) if lcd else '?'}%, ISR share (last 40 ms) {isr.group(1) if isr else '?'}%")
print("audio peak per 0.5 s:", peaks)
try:
    from PIL import Image
    fs = sorted(f for f in os.listdir(out + "/rec") if f.endswith(".ppm"))
    pick = [fs[int(i * (len(fs) - 1) / 5)] for i in range(6)] if len(fs) >= 6 else fs
    sheet = Image.new("RGB", (240 * len(pick), 240))
    for i, f in enumerate(pick):
        sheet.paste(Image.open(out + "/rec/" + f).convert("RGB"), (240 * i, 0))
    sheet.save(out + "/emu-sheet.png"); print("sheet:", out + "/emu-sheet.png", "frames", pick)
except Exception as e:
    print("no sheet:", e)
EOF

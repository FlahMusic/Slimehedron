#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Slimehedron for the FM-1: the single-precision copy of the tank, for the device.
   floatify.py DIR      rewrites every .c / .h in DIR in place (DIR is always a COPY: build-device.sh, check-host.sh)

Why: the FM-1's FPU (JieLi pi32v2, -mcpu=r3 -mfprev1) does single precision only; every `double` operation is a
compiler-rt library call of a few hundred instructions. fm1/core is written in double so the host build matches the
plugin number for number (fm1/host/check-tank.js). The device gets this mechanical copy instead:
  1. `double` -> `float`
  2. every floating literal gets an `f` (clang 4 has no -fsingle-precision-constant, and `x * 0.5` with a float x would
     otherwise be done in double)
  3. libm calls -> their float versions (sin -> sinf ...), which JieLi's r3 libm has
  4. sqrt -> sh_sqrtf (PRELUDE below): the r3 libm's sqrtf is a bit-by-bit software loop (the FPU has no square root)
     and was 46% of the busy time in fm1-emu's profile (2026-11-16). A bit-trick estimate and two Newton steps on the
     FPU, worst relative error 5e-7 over 1e-6..1e7 (the same idea as X0X's fm_sqrtf, firmware/src/dsp/fastmath.h)
check-host.sh builds the host bench from the same copy and checks it still plays like the double tank."""
import re
import sys
from pathlib import Path

MATH = ("sin cos tan asin acos atan atan2 sinh cosh tanh exp exp2 log log2 log10 pow floor ceil round trunc "
        "fabs fmod hypot cbrt fmin fmax copysign nextafter").split()
CALL = re.compile(r"\b(" + "|".join(MATH) + r")(\s*\()")
# a decimal floating literal: 1.5  .5  1.  1e9  1.5e-3  (not already suffixed, not part of an identifier or hex)
LIT = re.compile(r"(?<![\w.])((?:\d+\.\d*|\.\d+)(?:[eE][-+]?\d+)?|\d+[eE][-+]?\d+)(?![\w.])")


SQRT = re.compile(r"\bsqrtf?(\s*\()")
PRELUDE = """#ifndef SH_FAST_SQRT
#define SH_FAST_SQRT
#include <stdint.h>
static inline float sh_sqrtf(float x) {   /* floatify.py: the FPU has no square root */
  union { float f; uint32_t u; } b; float y;
  if (!(x > 0.0f)) return 0.0f;
  b.f = x; b.u = 0x1fbd1df5u + (b.u >> 1); y = b.f;
  y = 0.5f * (y + x / y);
  return 0.5f * (y + x / y);
}
#endif
"""


def convert_code(code):
    code = re.sub(r"\bdouble\b", "float", code)
    code = SQRT.sub(lambda m: "sh_sqrtf" + m.group(1), code)
    code = CALL.sub(lambda m: m.group(1) + "f" + m.group(2), code)
    return LIT.sub(lambda m: m.group(1) + "f", code)


def convert(src):
    """convert code only: leave comments, strings and preprocessor #include lines alone"""
    out, i, n = [], 0, len(src)
    tok = re.compile(r'//[^\n]*|/\*.*?\*/|"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|^[ \t]*#[ \t]*include[^\n]*', re.S | re.M)
    for m in tok.finditer(src):
        out.append(convert_code(src[i:m.start()]))
        out.append(m.group(0))
        i = m.end()
    out.append(convert_code(src[i:]))
    return "".join(out)


def main():
    d = Path(sys.argv[1])
    files = sorted(list(d.glob("*.c")) + list(d.glob("*.h")))
    for p in files:
        p.write_text(PRELUDE + convert(p.read_text(encoding="utf-8")), encoding="utf-8")
    print(f"floatify: {len(files)} files in {d} are single precision")


if __name__ == "__main__":
    main()

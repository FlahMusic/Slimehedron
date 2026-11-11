// The tank's 2.5D frames (three camera turns, and portal space) as PNGs to look at (`wsl make -C fm1/host draw` writes tank0..3.ppm and runs the
// checks; this turns the frames into tank0..3.png, scaled 2x so a 240 px screen is readable on a monitor).
// No PNG library: a stored-zlib writer, the same as check-space.js.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = buf => { let c = -1; for (const x of buf) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
let n = 0;
for (const f of ['tank0', 'tank1', 'tank2', 'tank3']) {
  const p = path.join(__dirname, f + '.ppm'); if (!fs.existsSync(p)) continue;
  const b = fs.readFileSync(p), h = b.toString('latin1', 0, 20).split(/\s+/), w = +h[1], ht = +h[2], off = b.length - w * ht * 3, S = 2;
  const W = w * S, H = ht * S, raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0;
    for (let x = 0; x < W; x++) b.copy(raw, y * (W * 3 + 1) + 1 + x * 3, off + ((y / S | 0) * w + (x / S | 0)) * 3, off + ((y / S | 0) * w + (x / S | 0)) * 3 + 3); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 2;
  fs.writeFileSync(path.join(__dirname, f + '.png'), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
  n++;
}
console.log(n + ' frames written as PNG (fm1/host/tank0..3.png)');

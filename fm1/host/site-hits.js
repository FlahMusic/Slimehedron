// SPDX-License-Identifier: GPL-3.0-or-later
// THE SITE'S DRUM HITS, as the browser makes them: every kit's every piece rendered through the site's own dHit (index.html)
// in an OfflineAudioContext, dry (straight out, no bus, no room), at the FM-1 bench's accent (velocity 110: a = 110 / 96),
// the key C (the ride is tuned to it), no humanize. Written as raw float32 mono (left + right, as slimehost's "hit"
// writes its own), 1 s each, for fm1/firmware/check-drums.sh to measure the FM-1's against.
//   node fm1/host/site-hits.js OUTDIR        (needs the local server: python -m http.server 8765, from the project root)
const fs = require('fs'), path = require('path');
const { launch } = require('../../_dev/browser');
const OUT = process.argv[2] || path.join(require('os').tmpdir(), 'slime-site-hits');
const KITS = ['pop', 'rock', 'disco', 'bossa', 'jazz', 'samba', 'conga', 'march', 'chip', 'beep', 'industrial'];
const PIECES = { K: 36, s: 38, h: 42, o: 46, r: 37, cl: 75, c: 62, C: 63, y: 51, x: 49, lt: 45, ht: 50 };   // the site's DRUMN
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await launch(); const p = await (await b.newContext()).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html?m=studio'); await p.waitForTimeout(2000);
  for (const kit of KITS) {
    const got = await p.evaluate(async ([kit, pieces]) => {
      const res = {};
      for (const v of Object.keys(pieces)) {
        AC = new OfflineAudioContext(2, 44100, 44100); NB = null;          // the site's noise buffer, made anew on this context
        drumBus = AC.createGain(); drumBus.connect(AC.destination);         // dry: no glue, no EQ, no trim, no room
        drumKit = kit; S.root = 60; _ohChoke = null;
        dHit(v, 0, 110 / 96, true);
        const buf = await AC.startRendering(), l = buf.getChannelData(0), r = buf.getChannelData(1), m = new Float32Array(l.length);
        for (let i = 0; i < l.length; i++) m[i] = l[i] + r[i];
        const u8 = new Uint8Array(m.buffer); let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
        res[v] = btoa(s);
      }
      return res;
    }, [kit, PIECES]);
    for (const v in got) fs.writeFileSync(path.join(OUT, `${kit}-${PIECES[v]}.raw`), Buffer.from(got[v], 'base64'));
  }
  await b.close();
  if (errs.length) { console.log('page errors: ' + errs.join(' | ')); process.exit(1); }
  console.log(`site hits: ${KITS.length} kits x ${Object.keys(PIECES).length} pieces in ${OUT}`);
})();

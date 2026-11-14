// The device's light goo against the plugin's exact one, by statistics (`wsl make -C fm1/host goo-stats`, then
// `node fm1/host/check-goolight.js`). The light goo is float, with half the drops at 2^(1/3) the size, so it cannot
// match number for number; it must play the same: the same fill curve, the same notes a bar, balls slowed as much,
// notes softened the same way, in a fraction of the memory. Both run the 16 seeds in scenes-goo.txt (three shapes).
// Tolerances, from the measured runs (2026-11-11): fill means differ by at most 0.024 (allowed 0.05), notes a bar 5%
// (12%), the late/early ball speed 0.005 (0.02); seed to seed, notes a bar alone spread 5.5..11.3 in one shape.
const fs = require('fs'), path = require('path');
const FAIL = []; const ok = (c, m) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m); if (!c) FAIL.push(m); };
const BARS = { studio: 72, tri: 40, oct: 48 };
function read(f) {
  const o = {}; let cur, bytes = 0;
  for (const l of fs.readFileSync(path.join(__dirname, f), 'utf8').trim().split('\n')) {
    if (l.startsWith('# sizeof(sh_tank) ')) { bytes = +l.split(' ')[2]; continue; }
    if (l.startsWith('scene ')) { cur = o[l.slice(6)] = { hits: 0, nG: 0, impG: 0, nC: 0, impC: 0, fills: [], speeds: [] }; continue; }
    const a = l.split(' ');
    if (a[0] === 'h') { cur.hits++; if (+a[6]) continue; if (+a[5] > 0) { cur.nG++; cur.impG += +a[4]; } else { cur.nC++; cur.impC += +a[4]; } }
    else if (a[0] === 's') { const nb = +a[2]; let sp = 0; for (let k = 0; k < nb; k++) sp += Math.hypot(+a[3 + k * 7 + 3], +a[3 + k * 7 + 4]);
      cur.fills.push(+a[a.indexOf('g') + 4]); cur.speeds.push(nb ? sp / nb : NaN); }
  }
  return { scenes: o, bytes };
}
const mean = a => { const b = a.filter(Number.isFinite); return b.reduce((x, y) => x + y, 0) / b.length; };
const at = (a, f) => a[Math.min(a.length - 1, Math.floor(a.length * f))];
const E = read('goo_exact.txt'), L = read('goo_light.txt');
const fam = {}; for (const n of Object.keys(E.scenes)) (fam[n.replace(/\d+$/, '')] = fam[n.replace(/\d+$/, '')] || []).push(n);
const soft = { E: [0, 0, 0, 0], L: [0, 0, 0, 0] };
for (const [f, ns] of Object.entries(fam)) {
  const m = (S, fn) => mean(ns.map(n => fn(S.scenes[n])));
  const fills = [0.25, 0.5, 0.75, 1].map(q => [m(E, s => at(s.fills, q)), m(L, s => at(s.fills, q))]);
  const worst = Math.max(...fills.map(([e, l]) => Math.abs(e - l)));
  ok(worst <= 0.05, `${f}: the light goo fills like the plugin's (quarters ${fills.map(([e, l]) => e.toFixed(2) + '/' + l.toFixed(2)).join(' ')}; worst ${worst.toFixed(3)})`);
  const he = m(E, s => s.hits / BARS[f]), hl = m(L, s => s.hits / BARS[f]);
  ok(Math.abs(hl - he) / he <= 0.12, `${f}: the same notes a bar (${he.toFixed(2)} plugin, ${hl.toFixed(2)} light)`);
  const slow = S => m(S, s => { const k = Math.floor(s.speeds.length / 4); return mean(s.speeds.slice(-k)) / mean(s.speeds.slice(1, k)); });
  const se = slow(E), sl = slow(L), every = ns.every(n => { const s = L.scenes[n], k = Math.floor(s.speeds.length / 4); return mean(s.speeds.slice(-k)) < mean(s.speeds.slice(1, k)); });
  ok(every && Math.abs(se - sl) <= 0.02, `${f}: the goo slows the balls as much (late/early speed ${se.toFixed(3)} plugin, ${sl.toFixed(3)} light; slower late in every light run: ${every})`);
  for (const [k, S] of [['E', E], ['L', L]]) for (const n of ns) { const s = S.scenes[n]; soft[k][0] += s.nG; soft[k][1] += s.impG; soft[k][2] += s.nC; soft[k][3] += s.impC; }
}
const sr = k => [soft[k][0], soft[k][1] / Math.max(1, soft[k][0]), soft[k][3] / soft[k][2]];
const [ne, ie, ce] = sr('E'), [nl, il, cl] = sr('L');
ok(nl >= 5 && il < 0.8 * cl, `a note from deep in the light goo still rings softer (${nl} of them, impact ${il.toFixed(2)} against ${cl.toFixed(2)} clean; the plugin: ${ne}, ${ie.toFixed(2)} against ${ce.toFixed(2)})`);
ok(L.bytes > 0 && L.bytes <= 128 * 1024, `the light tank is small (${(L.bytes / 1024).toFixed(0)} KB, the exact one ${(E.bytes / 1024).toFixed(0)} KB; the chip's RAM is not published)`);
console.log(FAIL.length ? `FAILED: ${FAIL.length}` : 'the light goo plays like the plugin\'s, in a fraction of the memory');
process.exit(FAIL.length ? 1 : 0);

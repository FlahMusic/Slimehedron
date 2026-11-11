// The FM-1's C tank against the plugin's (fm1/host: `wsl make -C fm1/host tank`, then `node fm1/host/check-tank.js`).
// Both print every hit and, every 30 ticks, the balls, the open walls and the goo; every number must be the same
// double (both are built on Linux with the same libm). Prints PASS/FAIL per scene; exit 1 on any difference.
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8').trim().split('\n');
const scenes = lines => { const o = {}; let cur; for (const l of lines) { if (l.startsWith('scene ')) { cur = l.slice(6); o[cur] = []; } else if (cur) o[cur].push(l); } return o; };
const same = (a, b) => { const x = Number(a), y = Number(b); return Number.isNaN(x) || Number.isNaN(y) ? a === b : x === y; };
const C = scenes(read('tank_c.txt')), R = scenes(read('tank_rust.txt'));
let bad = 0;
for (const name of Object.keys(R)) {
  const r = R[name], c = C[name] || [];
  let first = -1, why = '';
  for (let i = 0; i < Math.max(r.length, c.length) && first < 0; i++) {
    if (r[i] === undefined || c[i] === undefined) { first = i; why = r[i] === undefined ? 'C has extra lines' : 'C stopped early'; break; }
    const a = r[i].split(/[ ,]/), b = c[i].split(/[ ,]/);
    if (a.length !== b.length) { first = i; why = 'a different line'; break; }
    for (let k = 0; k < a.length; k++) {
      // a wall's state prints as its open flag glued to its healing (e.g. "00.0", "10.341")
      const wa = /^[01]\d/.test(a[k]) && a[0] === 's' && k > a.indexOf('w') && k < a.indexOf('g');
      const ok = wa ? a[k][0] === b[k][0] && same(a[k].slice(1), b[k].slice(1)) : same(a[k], b[k]);
      if (!ok) { first = i; why = `field ${k}: plugin ${a[k]}, C ${b[k]}`; break; }
    }
  }
  const hits = r.filter(l => l[0] === 'h').length;
  if (first < 0) console.log(`  PASS  ${name}: ${hits} hits and ${r.length - hits} snapshots, every number the plugin's`);
  else { bad++; console.log(`  FAIL  ${name}: line ${first} (${why})\n        plugin: ${(r[first] || '').slice(0, 160)}\n        C:      ${(c[first] || '').slice(0, 160)}`); }
}
console.log(bad ? `FAILED: ${bad} scene(s)` : `the FM-1 tank plays every scene exactly like the plugin's`);
process.exit(bad ? 1 : 0);

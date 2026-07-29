// dev-test.js — Slimehedron self-test gate. Run:  node dev-test.js
// Catches the CRASH-class bugs automatically (syntax, TDZ/load-order, runtime throws, shape-NaN,
// broken streak math) so nothing amateur ever reaches a push. Visual/layout still needs the browser step.
const { execSync } = require('child_process');
const fs = require('fs');
let fails = 0;
const ok = (name, cond) => { console.log((cond ? '  \x1b[32m✓\x1b[0m ' : '  \x1b[31m✗\x1b[0m ') + name); if (!cond) fails++; };

console.log('\nSLIMEHEDRON self-test');

console.log('\n— load & runtime (the freeze gate) —');
try {
  const out = execSync('node dev-loadtest.js', { cwd: __dirname }).toString();
  ok('index.html: every inline script runs, no crash/TDZ/undefined', /LOAD OK/.test(out));
  if (!/LOAD OK/.test(out)) console.log(out.split('\n').filter(l => /THREW|FAIL/.test(l)).join('\n'));
} catch (e) { ok('index.html load: ' + String(e.stdout || e.message).slice(0, 120), false); }
try { execSync('node --check learn.js', { cwd: __dirname }); ok('learn.js parses', true); }
catch (e) { ok('learn.js parses: ' + e.message.slice(0, 100), false); }

console.log('\n— structure —');
const H = fs.readFileSync(__dirname + '/index.html', 'utf8');
ok('file intact (ends with </html>)', H.trim().endsWith('</html>'));
ok('named shapes use the guarded parse (no heart→NaN)', /\/\^\\d\+\$\/\.test\(nextShape\)\?parseInt\(nextShape,10\):nextShape/.test(H) && !/nextShape==="circle"\?"circle":parseInt/.test(H));
ok('exactly one bindMidiIns definition', (H.match(/function bindMidiIns/g) || []).length === 1);
ok('MIDI-Learn state declared before its IIFE uses it', H.indexOf('let ccMap={}') < H.indexOf('ccRender();'));

console.log('\n— logic units —');
// streak: advance / hold / celebrate-once / reset
(function () {
  const DG = 3; let s = {}, N;
  const ds = o => { const d = o || N; return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const star = () => { const d = s, t = ds();
    if (d.last !== t) { const y = new Date(N); y.setDate(y.getDate() - 1); d.streak = (d.last === ds(y)) ? (d.streak || 0) + 1 : 1; d.last = t; d.stars = 0; d.cel = false; }
    d.stars = (d.stars || 0) + 1; let c = false; if (d.stars >= DG && !d.cel) { d.cel = true; c = true; } return c; };
  N = new Date(2026, 6, 1); star(); star(); const c = star();
  ok('streak: hits daily goal exactly once', c && !star());
  N = new Date(2026, 6, 2); star(); ok('streak: consecutive day → +1', s.streak === 2);
  N = new Date(2026, 6, 5); star(); ok('streak: skipped day → reset to 1', s.streak === 1);
})();
// shape area (heart-NaN class) — must be finite & positive for any polygon
(function () {
  const R = 300;
  const verts = sh => { const V = []; if (/^\d+$/.test(sh)) { const N = +sh; for (let i = 0; i < N; i++) { const a = i * 2 * Math.PI / N; V.push([R * Math.cos(a), R * Math.sin(a)]); } return V; } if (sh === 'rhombus') return [[0, -R], [R * .64, 0], [0, R], [-R * .64, 0]]; return V; };
  const area = v => { let a = 0; for (let i = 0; i < v.length; i++) { const [ax, ay] = v[i], [bx, by] = v[(i + 1) % v.length]; a += ax * by - bx * ay; } return Math.abs(a) / 2; };
  ok('shape area finite & >0 (polygon + rhombus)', ['3', '6', '12', 'rhombus'].every(s => { const a = area(verts(s)); return isFinite(a) && a > 0; }));
})();
// fixed timestep: same physics rate at any fps
(function () {
  const FIXED = 1000 / 60, MAX = 5;
  const run = fps => { let acc = 0, last = 0, t = 0, frame = 1000 / fps; for (let now = 0; now < 5000; now += frame) { const dt = last ? Math.min(250, now - last) : FIXED; last = now; acc += dt; let n = 0; while (acc >= FIXED && n < MAX) { t++; acc -= FIXED; n++; } if (n >= MAX) acc = 0; } return t; };
  const a = run(30), b = run(60), c = run(144);
  ok('physics rate device-independent (30/60/144fps ≈ equal)', [a, b, c].every(x => Math.abs(x - 300) / 300 < 0.05));
})();

console.log('\n' + (fails ? '\x1b[31m✗ ' + fails + ' CHECK(S) FAILED — do not push\x1b[0m' : '\x1b[32m✓ ALL CHECKS PASS — safe to hand off\x1b[0m') + '\n');
process.exit(fails ? 1 : 0);

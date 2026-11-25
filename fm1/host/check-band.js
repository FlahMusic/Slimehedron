// Slimehedron for the FM-1: the band port (fm1/core/band.c) against the web's own code (index.html), line for line.
//   wsl make -C fm1/host band && node fm1/host/check-band.js
// SAB=1 runs it against a deliberately wrong web (genFill's busier-at-the-end ramp removed): it must go red.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..', '..');
let src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (process.env.SAB) src = src.replace('if(r()>=0.5+0.45*frac)return null;', 'if(r()>=0.5)return null;');
if (process.env.SAB === 'funk') src = src.replace('const fk=b.funk||0;', 'const fk=0;');
const grab = (re, w) => { const m = src.match(re); if (!m) throw new Error('not in index.html: ' + w); return m[0]; };
const code = [grab(/function rep\(base,bars\)\{[^\n]*\}/, 'rep'), grab(/function bars\(\.\.\.b\)\{[^\n]*\}/, 'bars'),
  grab(/const KITS=\{[\s\S]*?\n\};/, 'KITS'), grab(/const KITVOICE=\{[^\n]*\n[^\n]*\};/, 'KITVOICE'),
  grab(/const FEELS=\{[\s\S]*?\n\};/, 'FEELS'), grab(/const FEEL_DEFAULT=\{[\s\S]*?\};/, 'FEEL_DEFAULT'),
  grab(/function feelFor\(kit\)\{[^\n]*\}/, 'feelFor'), grab(/function _kitHash\(k\)\{[^\n]*\}/, '_kitHash'),
  grab(/function genFill\(kit,barI,inBar\)\{[\s\S]*?\n\}/, 'genFill'), grab(/const TOM_FILL=\{[^}]*\};/, 'TOM_FILL'),
  grab(/function mulberry32\(a\)\{[^\n]*\n[^\n]*\}/, 'mulberry32'), grab(/function pickOnsets\([\s\S]*?\n\}/, 'pickOnsets'),
  grab(/function genComp\([\s\S]*?\n\}/, 'genComp'), grab(/function genBass\([\s\S]*?\n\}/, 'genBass'),
  'return {KITS,KITVOICE,feelFor,_kitHash,genFill,mulberry32,genComp,genBass};'].join('\n');
const SALT = 123456789;
const W = new Function('_bandSalt', code)(SALT);
const ORDER = ['pop', 'rock', 'disco', 'bossa', 'jazz', 'samba', 'conga', 'march', 'chip', 'beep', 'industrial'];
// 2026-11-20: the site's own DRUMN (index.html), every piece its own note: the FM-1 plays the site's drum recipes itself now
// (fm1/firmware/slime_drums.c), so the clave is not the rim and the high conga is not a tom (they shared 37 and 43 before)
const GM = { K: 36, s: 38, h: 42, o: 46, r: 37, cl: 75, c: 62, C: 63, y: 51, ht: 50, lt: 45, x: 49 };
const want = [];
ORDER.forEach((kit, k) => {
  const pat = W.KITS[kit], fl = W.feelFor(kit).fill, lo = W.KITVOICE[kit].lo;
  for (let g = 0; g < 64; g++) {
    const pb = g % 4, fillBar = ((g + 1) % fl.every) === 0, from = 16 - fl.len;
    for (let s = 0; s < 16; s++) {
      for (const v of ['K', 's', 'h', 'o', 'r', 'cl', 'c', 'C', 'y']) {
        if (!(pat[v] || []).includes(16 * pb + s)) continue;
        const anchor = v === lo && (s === 0 || s === 8);
        if (fillBar && s >= from && !anchor) continue;
        want.push(`D ${k} ${g} ${s} ${GM[v]}`);
      }
      if (fillBar && s >= from) { const f = W.genFill(kit, g, s); if (f) want.push(`D ${k} ${g} ${s} ${GM[f.v]}`); }
    }
  }
  for (let blk = 0; blk < 4; blk++) {
    const tok = W.genBass(W.feelFor(kit), W.mulberry32((SALT ^ (blk * 40503) ^ W._kitHash(kit)) | 0), false);
    let line = ''; for (let i = 0; i < 16; i++) line += tok[i] || '.';
    want.push(`B ${k} ${blk} ${line}`);
    const avoid = new Set(Object.keys(tok).map(Number));
    for (let bar = blk * 16; bar < blk * 16 + 16; bar++) {
      const hits = W.genComp(W.feelFor(kit), W.mulberry32((SALT ^ Math.imul(bar, 2654435761) ^ W._kitHash(kit)) | 0), avoid);
      let m = 0; for (const h of hits) m |= (1 << h);
      want.push(`C ${k} ${bar} ${m >>> 0}`);
    }
  }
});
const wslPath = '/mnt/c' + root.replace(/^[A-Za-z]:/, '').replace(/\\/g, '/') + '/fm1/host/bandtest';
const got = execFileSync('wsl', ['-e', wslPath]).toString().trim().split('\n');
const S = got.pop().split(' ');
const H = got.filter(l => l[0] === 'H').map(l => l.split(' ').slice(1).map(Number));
for (let i = got.length - 1; i >= 0; i--) if (got[i][0] === 'H') got.splice(i, 1);
const FAIL = []; const ok = (c, m) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m); if (!c) FAIL.push(m); };
let first = -1;
for (let i = 0; i < Math.max(want.length, got.length); i++) if (want[i] !== got[i]) { first = i; break; }
const n = c => want.filter(l => l[0] === c).length;
ok(first < 0, `every drum hit, chord rhythm and bass figure is the web's: ${n('D')} drum hits, ${n('C')} comp bars, ${n('B')} bass figures, 11 kits` +
  (first < 0 ? '' : ` (first difference at line ${first}: web "${want[first]}", C "${got[first]}")`));
{ // the funk (2026-11-25, Flah: "wheres the funk, groove, velocity, bounce"): ghosts and octave pops in the funky kits'
  // figures (the site's genBass, FEELS bass.funk), on both sides (the lines above are equal); SAB=funk zeroes it: red
  const B = want.filter(l => l[0] === 'B'), fig = k => B.filter(l => l.split(' ')[1] === String(k)).map(l => l.split(' ')[3]).join('');
  const ghosts = ['pop', 'disco', 'samba'].map(kit => (fig(ORDER.indexOf(kit)).match(/g/g) || []).length);
  ok(ghosts.every(g => g >= 2), `the bass has its funk: ghost notes in pop, disco and samba's figures (${ghosts.join(', ')} in 4 blocks each)`); }
ok(+S[1] > 1000 && +S[2] === 0, `no chord or bass note outside the scale (major, 31-EDO, pentatonic: ${S[1]} notes, ${S[2]} outside)`);
// HUMANIZE (H lines): the site's rules, per kit over 256 bars at 100 bpm
// H kit onbeat_max_ms drift_max_ms ghosts_per_bar ghost_bad pickups_per_bar swing8_ms kick_vel_sd hat_vel_sd simple
const NAMES = ['pop', 'rock', 'disco', 'bossa', 'jazz', 'samba', 'conga', 'march', 'chip', 'beep', 'industrial'];
ok(H.length === 11 && H.every(h => h[1] === 0), 'humanize: THE BEAT NEVER MOVES (every quarter note at 0 ms, all 11 kits)');
ok(H.every(h => h[2] <= 22.0001), 'humanize: nothing drifts more than 22 ms (worst ' + Math.max(...H.map(h => h[2])).toFixed(1) + ' ms)');
ok(H.every(h => h[4] === 0) && H.every(h => h[3] > 0), 'humanize: every kit gets ghost notes, never on the beat or the backbeat, jazz only on the "&" (' + H.map(h => NAMES[h[0]] + ' ' + h[3].toFixed(1)).join(', ') + ' a bar)');
ok(H[1][3] > 2 * H[0][3], 'humanize: the busy kits ghost more than the simple ones (rock ' + H[1][3].toFixed(2) + ' against pop ' + H[0][3].toFixed(2) + ' a bar)');
ok(H.every(h => h[9] ? h[5] === 0 : Math.abs(h[5] - 0.5) < 1e-9), 'humanize: a two-tap pickup into every phrase on the busy kits, none on the simple ones');
ok(Math.abs(H[4][6] - 85.0) < 0.6, 'humanize: jazz swings its eighths, the "&" two-thirds through the beat (+' + H[4][6] + ' ms of a 150 ms 16th)');
const both = H.filter(h => h[7] > 0 && h[8] > 5);
ok(both.length >= 4 && both.every(h => h[7] < h[8]), 'humanize: the kick stays steadier than the hats (' + both.map(h => NAMES[h[0]] + ' ' + h[7].toFixed(1) + '/' + h[8].toFixed(1)).join(', ') + ')');
console.log(FAIL.length ? FAIL.length + ' FAILURE(S)' : "band: the web's band, note for note");
process.exit(FAIL.length ? 1 : 0);

// Slimehedron for the FM-1: the band port (fm1/core/band.c) against the web's own code (index.html), line for line.
//   wsl make -C fm1/host band && node fm1/host/check-band.js
// SAB=1 runs it against a deliberately wrong web (genFill's busier-at-the-end ramp removed): it must go red.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..', '..');
let src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (process.env.SAB) src = src.replace('if(r()>=0.5+0.45*frac)return null;', 'if(r()>=0.5)return null;');
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
const GM = { K: 36, s: 38, h: 42, o: 46, r: 37, cl: 37, c: 63, C: 43, y: 51, ht: 48, lt: 43, x: 49 };
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
const FAIL = []; const ok = (c, m) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m); if (!c) FAIL.push(m); };
let first = -1;
for (let i = 0; i < Math.max(want.length, got.length); i++) if (want[i] !== got[i]) { first = i; break; }
const n = c => want.filter(l => l[0] === c).length;
ok(first < 0, `every drum hit, chord rhythm and bass figure is the web's: ${n('D')} drum hits, ${n('C')} comp bars, ${n('B')} bass figures, 11 kits` +
  (first < 0 ? '' : ` (first difference at line ${first}: web "${want[first]}", C "${got[first]}")`));
ok(+S[1] > 1000 && +S[2] === 0, `no chord or bass note outside the scale (major, 31-EDO, pentatonic: ${S[1]} notes, ${S[2]} outside)`);
console.log(FAIL.length ? FAIL.length + ' FAILURE(S)' : "band: the web's band, note for note");
process.exit(FAIL.length ? 1 : 0);

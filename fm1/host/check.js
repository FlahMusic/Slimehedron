// Compares the FM-1 core's solids (fm1/host/dump_*.json, from `make check`) with the web's (_dev/solid-ref.json).
// double must match to 1e-5; float (what the device runs) must have the same faces, corners and notes, planes to 2e-2 (in any order).
//   wsl make -C fm1/host check && node fm1/host/check.js
const fs=require('fs'),path=require('path');
const ref=JSON.parse(fs.readFileSync(path.join(__dirname,'../../_dev/solid-ref.json'),'utf8')).shapes;
let bad=0;const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)bad++;};
for(const [kind,tol] of [['double',1e-5],['float',2e-2]]){
  const got=JSON.parse(fs.readFileSync(path.join(__dirname,'dump_'+kind+'.json'),'utf8'));
  const off=[];let worst=0;
  for(const [n,r] of Object.entries(ref)){const g=got[n];
    if(!g){off.push(n+' missing');continue;}
    if(g.planes.length!==r.planes.length){off.push(n+' '+g.planes.length+' planes, web '+r.planes.length);continue;}
    if(g.verts!==r.verts||g.edges!==r.edges)off.push(n+' corners/edges '+g.verts+'/'+g.edges+', web '+r.verts+'/'+r.edges);
    // float can find corners in another order, so a cut lists the same planes in another order: match each to its nearest
    g.planes.forEach((p,i)=>{const q=kind==='double'?[r.planes[i]]:r.planes;worst=Math.max(worst,Math.min(...q.map(w=>Math.max(...p.map((x,j)=>Math.abs(x-w[j]))))));});
    if(r.deg&&JSON.stringify(g.deg)!==JSON.stringify(r.deg))off.push(n+' notes differ');}
  ok(off.length===0,kind+': every shape has the web\'s faces, corners, edges and orb notes'+(off.length?' ('+off.slice(0,4).join('; ')+')':' ('+Object.keys(ref).length+' shapes)'));
  ok(worst<tol,kind+': planes within '+tol+' of the web (worst '+worst.toExponential(2)+')');}
// the test frames, as PNG for a person to look at (PPM -> PNG, no packages)
const zlib=require('zlib');
for(const f of ['orb93','icosa_cut']){const p=path.join(__dirname,f+'.ppm');if(!fs.existsSync(p))continue;
  const b=fs.readFileSync(p),h=b.toString('latin1',0,20).split(/\s+/),w=+h[1],ht=+h[2],off=b.length-w*ht*3;
  const raw=Buffer.alloc((w*3+1)*ht);for(let y=0;y<ht;y++){raw[y*(w*3+1)]=0;b.copy(raw,y*(w*3+1)+1,off+y*w*3,off+(y+1)*w*3);}
  const crcT=new Int32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c;});
  const crc=(buf)=>{let c=-1;for(const x of buf)c=crcT[(c^x)&255]^(c>>>8);return (c^-1)>>>0;};
  const chunk=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c]);};
  const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(ht,4);ih[8]=8;ih[9]=2;
  fs.writeFileSync(path.join(__dirname,f+'.png'),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));}
console.log(bad?'\n'+bad+' FAILED':'\nfm1 core matches the web');process.exit(bad?1:0);

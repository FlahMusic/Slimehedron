// ============================================================================================
//  The FM-1 core's curved space against the web's own numbers (_dev/space-ref.json, made by node _dev/space-ref.js
//  from index.html). For every curved 3- to 8-gon:
//    1. the corners sit where the web puts them (the same tiling k, the same radius)
//    2. every wall's hyperboloid normal and its arc in the disk (centre, radius, start and end angles, direction)
//    3. three balls flown 900 ticks each: the same walls hit in the same order at the same ticks, and the same path up to
//       there. The double build matches the WHOLE flight (all 379 bounces, the path to 1e-6), from starts kept to the last
//       bit. Bouncing in curved space is chaotic, so float's rounding parts its flights from the web's after a few
//       bounces (measured 2026-11-11: at the 6th at the earliest): the float (device) build is held to the first 4
//  Run (from the repo root): wsl make -C fm1/host space && node fm1/host/check-space.js
//  Sabotage notes are in fm1/README.md.
// ============================================================================================
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const ref=JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','_dev','space-ref.json'),'utf8'));
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const run=(bin)=>{let input='';const order=[];
  for(const N of Object.keys(ref.shapes))ref.shapes[N].flights.forEach((f,i)=>{input+=[N,...[f.start.x,f.start.y,f.start.vx,f.start.vy].map(v=>v.toPrecision(17)),ref.brDisk].join(' ')+'\n';order.push([N,i]);});
  const exe=path.join(__dirname,bin),isWin=process.platform==='win32';
  const out=isWin?execFileSync('wsl',['-e','bash','-c','cd "$(wslpath \''+__dirname.replace(/\\/g,'/')+'\')" && ./'+bin],{input,encoding:'utf8'})
                 :execFileSync(exe,[],{input,encoding:'utf8'});
  const lines=out.trim().split('\n').map(l=>JSON.parse(l));return order.map(([N,i],k)=>({N,i,got:lines[k]}));};
const close=(a,b,tol)=>Math.abs(a-b)<=tol;
for(const [bin,tol,bounces] of [['spacetest_double',1e-7,Infinity],['spacetest_float',2e-3,4]]){
  const tag0=bin.replace('spacetest_',''),res=run(bin);let cornerBad=[],wallBad=[],hitBad=[],pathBad=[];
  for(const {N,i,got} of res){const R=ref.shapes[N],F=R.flights[i];
    if(i===0){if(got.k!==R.k||!close(got.u,R.u,tol))cornerBad.push(N+': k '+got.k+'/'+R.k+' u '+got.u+'/'+R.u);
      R.walls.forEach((w,j)=>{const g=got.walls[j],a=w.arc;
        const okN=w.N.every((v,q)=>close(v,g[q],tol*10)),okA=a?(close(a.cx,g[3],tol*10)&&close(a.cy,g[4],tol*10)&&close(a.r,g[5],tol*10)&&close(a.a0,g[6],tol*10)&&close(a.a1,g[7],tol*10)&&(a.ccw?1:0)===g[8]):g[5]===0;
        if(!okN||!okA)wallBad.push(N+'/'+j);});}
    const want=F.hits.slice(0,bounces),have=got.hits.slice(0,want.length);
    if(JSON.stringify(want)!==JSON.stringify(have))hitBad.push(N+'.'+i+' first diff at bounce '+want.findIndex((h,k)=>JSON.stringify(h)!==JSON.stringify(have[k]))+' of '+want.length);
    if(tag0==='double'){const until=want.length?want[want.length-1][0]:900;   // the path, sampled every 30 ticks, up to the last checked bounce
      const bad=F.path.findIndex((p,k)=>{if((k+1)*30>until)return false;const g=got.path[k];if(p===null||g===null)return p!==g;return !p.every((v,q)=>close(v,g[q],1e-6));});
      if(bad>=0)pathBad.push(N+'.'+i+' at '+((bad+1)*30)+' ticks');}}
  const tag=bin.replace('spacetest_','');
  ok(cornerBad.length===0,'['+tag+'] 1. the corners sit where the web puts them, 3- to 8-gons'+(cornerBad.length?' ('+cornerBad.join('; ')+')':''));
  ok(wallBad.length===0,'['+tag+'] 2. every wall: its hyperboloid normal and its arc in the disk'+(wallBad.length?' (off: '+wallBad.join(' ')+')':''));
  ok(hitBad.length===0,'['+tag+'] 3. the same walls hit at the same ticks, '+(bounces===Infinity?'every bounce':'the first '+bounces+' bounces')+' of 18 flights'+(hitBad.length?' ('+hitBad.slice(0,3).join('; ')+')':''));
  if(tag0==='double')ok(pathBad.length===0,'['+tag+'] 3. and the same path up to there, to 1e-6 of the disk'+(pathBad.length?' ('+pathBad.slice(0,3).join('; ')+')':''));}
// the frames 'spacetest_float render N curvedN.ppm' drew, as PNGs to look at (no PNG library: a stored-zlib writer)
{const zlib=require('zlib');
 for(const f of ['curved5','curved6','curved7']){const p=path.join(__dirname,f+'.ppm');if(!fs.existsSync(p))continue;
  const b=fs.readFileSync(p),h=b.toString('latin1',0,20).split(/\s+/),w=+h[1],ht=+h[2],off=b.length-w*ht*3;
  const raw=Buffer.alloc((w*3+1)*ht);for(let y=0;y<ht;y++){raw[y*(w*3+1)]=0;b.copy(raw,y*(w*3+1)+1,off+y*w*3,off+(y+1)*w*3);}
  const crcT=new Int32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c;});
  const crc=(buf)=>{let c=-1;for(const x of buf)c=crcT[(c^x)&255]^(c>>>8);return (c^-1)>>>0;};
  const chunk=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c]);};
  const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(ht,4);ih[8]=8;ih[9]=2;
  fs.writeFileSync(path.join(__dirname,f+'.png'),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));}}
console.log(FAIL.length?'\n'+FAIL.length+' FAILURE(S)':'\nthe FM-1 core flies curved space the way the web does');process.exit(FAIL.length?1:0);

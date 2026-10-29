// ============================================================================================
//  THE PLUGIN'S AUTO-NOTES MELODY, NOTE FOR NOTE AGAINST THE WEB APP'S.
//  Lifts the web app's own melody code (setDeg, noDrone, nextMelodyDeg) out of index.html, runs it in node on a
//  recorded stream of random numbers, and writes the stream, the strong/weak beats and every degree it sang to
//  vst/slimehedron-core/src/tank/melody_golden.txt. The Rust port replays the same stream and must sing the same
//  degrees (cargo test melody_matches_the_web_note_for_note). Rerun this after any change to the web melody.
//  No server, no browser. Run from the project root: node _dev/dev-vstmelody.js
// ============================================================================================
const fs=require('fs');
const src=fs.readFileSync('index.html','utf8');
const a=src.indexOf('let _melDeg=null'),b=src.indexOf('function clampDeg');
if(a<0||b<0||b<a){console.log('  FAIL  could not find the melody code in index.html');process.exit(1);}
const code=src.slice(a,b);
const SCALES={major:[0,200,400,500,700,900,1100],pentaMaj:[0,200,400,700,900]};
const out=[];
for(const [name,root,steps] of [['major',0,3000],['pentaMaj',0,1500],['major',2,1500]]){
  let seed=987654321+root*7+name.length;const stream=[];
  const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;const r=seed/2147483648;stream.push(r);return r;};
  const run=new Function('Math','scaleObj','curRootDeg','steps',
    code+'\nconst degs=[],strong=[];for(let i=0;i<steps;i++){const s=(i%2===0)||(i%7===3);strong.push(s?1:0);degs.push(nextMelodyDeg(s));}return {degs,strong};');
  const M=Object.create(Math);M.random=rnd;
  const r=run(M,()=>({c:SCALES[name]}),root,steps);
  out.push('scale '+name+' root '+root,'strong '+r.strong.join(' '),'degs '+r.degs.join(' '),'rand '+stream.map(x=>String(x)).join(' '));
  console.log('  PASS  '+name+' root '+root+': '+steps+' notes, '+stream.length+' random numbers');
}
fs.writeFileSync('vst/slimehedron-core/src/tank/melody_golden.txt',out.join('\n')+'\n');
console.log('  wrote vst/slimehedron-core/src/tank/melody_golden.txt');

// ============================================================================================
//  DOES IT EVEN PARSE? The cheapest check there is, so it runs FIRST and in about a second.
//  The trap it exists for: a `// comment` dropped into the middle of a one-line statement comments out the
//  rest of that line. Six times in two passes (Oct 2026) it silently killed a whole <script>: the app loads a
//  blank tank, or the GPU tank never loads and the canvas fallback draws instead, and nothing says why.
//  Checks every inline <script> in every shipped page, plus learn2.js, sw.js and tank3d.js (an ES module).
//  No server, no browser. Run from the project root: node _dev/dev-syntax.js
// ============================================================================================
const fs=require('fs'),path=require('path'),os=require('os'),{execFileSync}=require('child_process');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const PAGES=['index.html','privacy.html','accessibility.html','teachers/index.html'].filter(f=>fs.existsSync(f));
const where=(src,idx)=>src.slice(0,idx).split('\n').length;
for(const f of PAGES){const src=fs.readFileSync(f,'utf8');
  const re=/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g;let m,n=0;
  while((m=re.exec(src))){n++;const attrs=m[1],code=m[2];if(/type=["']?(application\/ld\+json|importmap|text\/template)/.test(attrs))continue;
    const line=where(src,m.index);
    if(/type=["']?module/.test(attrs)){const t=path.join(os.tmpdir(),'syntax-'+process.pid+'.mjs');fs.writeFileSync(t,code);
      let e=null;try{execFileSync(process.execPath,['--check',t],{stdio:'pipe'});}catch(x){e=String(x.stderr||x).split('\n').slice(0,4).join(' ');}
      fs.unlinkSync(t);ok(!e,f+' module script at line '+line+' parses'+(e?': '+e:''));continue;}
    let e=null;try{new Function(code);}catch(x){e=x.message;}
    ok(!e,f+' script #'+n+' (line '+line+', '+code.split('\n').length+' lines) parses'+(e?': '+e:''));}}
for(const [f,mod] of [['learn2.js',false],['sw.js',false],['tank3d.js',true]]){if(!fs.existsSync(f))continue;
  let t=f,e=null;if(mod){t=path.join(os.tmpdir(),'syntax-'+process.pid+'.mjs');fs.copyFileSync(f,t);}
  try{execFileSync(process.execPath,['--check',t],{stdio:'pipe'});}catch(x){e=String(x.stderr||x).split('\n').slice(0,4).join(' ');}
  if(mod)fs.unlinkSync(t);
  ok(!e,f+' parses'+(e?': '+e:''));}
console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S) -- nothing else is worth running until these parse':'everything parses'));
process.exit(FAIL.length?1:0);

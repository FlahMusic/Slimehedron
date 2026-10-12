// ============================================================================================
//  THE PAGES THAT MAKE CHECKABLE CLAIMS HAVE TO BE TELLING THE TRUTH.
//  privacy.html invites a school's IT person to grep the source and says what they will find.
//  accessibility.html prints how many checks the suite runs and how many pass. Both were written
//  once and then the app moved: the suite grew from 33 checks to 35, the stylesheet grew from 13
//  reduced-motion rules to 16, the layout drift it called "0-1px" was 6px, and the privacy page
//  told you to search for `fetch` and promised no matches while sw.js contained three.
//  A page that invites you to check it and fails is worse than one that says nothing, so the
//  numbers on those pages are asserted here against the code, every run.
//  Run: node _dev/dev-claims.js
// ============================================================================================
const fs=require('fs'),path=require('path');
const R=(f)=>fs.readFileSync(path.resolve(__dirname,'..',f),'utf8');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m)};

const priv=R('privacy.html'), a11y=R('accessibility.html');
const SHIPPED=['index.html','learn2.js','sw.js','landing.html','privacy.html','accessibility.html','teachers/index.html'];

// ---- 1. the words privacy.html tells you to search for ----
// A bare word match is not enough: `fetchpriority` contains "fetch" and is an HTML attribute, not a
// call. Match the CALL, which is what the claim is actually about.
const callsOf=(word)=>{
  const out={};
  for(const f of SHIPPED){
    if(f==='privacy.html')continue;                 // the page naming the words is not evidence
    const src=R(f);
    const n=(src.match(new RegExp('(?<![A-Za-z0-9_$.])'+word+'\\s*\\(','g'))||[]).length;
    if(n)out[f]=n;
  }
  return out;
};
for(const w of ['XMLHttpRequest','sendBeacon','getUserMedia']){
  const hits=callsOf(w);
  ok(Object.keys(hits).length===0,
     'privacy.html can still promise no '+w+' anywhere'+(Object.keys(hits).length?' (found in '+JSON.stringify(hits)+')':''));
}
{
  const hits=callsOf('fetch');
  const files=Object.keys(hits);
  const onlySW=files.length===0||(files.length===1&&files[0]==='sw.js');
  ok(onlySW,'the only fetch() in the app is the offline cache'+(onlySW?'':' — now also in '+files.join(', ')));
  ok(/sw\.js/.test(priv)&&/fetch/.test(priv),
     'and privacy.html says so out loud instead of promising there are none');
  // The failure to catch is a sentence that lists `fetch` among the words it promises have no
  // matches. Matching on "the three ways a web page sends data out" alone was too broad: the honest
  // rewrite says "two of the three ways", which contains that phrase and is correct.
  // Splitting into sentences was too clever: "There are no matches." IS its own sentence, so the
  // list of words it refers to sits in the sentence BEFORE it and the check never saw `fetch`.
  // Look at the run-up instead - the words the promise is about are always just before it.
  const i=priv.indexOf('There are no matches');
  const runup=i<0?'':priv.slice(Math.max(0,i-220),i);
  const covered=/<code>fetch<\/code>/.test(runup);
  ok(i>=0&&!covered,
     'and the "no matches" promise no longer covers fetch'+(covered?' :: "'+runup.replace(/<[^>]+>/g,'').trim().slice(-110)+'"':''));
}
// ---- 2. no third-party origin is fetched by anything that ships ----
{
  const bad=[];
  for(const f of SHIPPED){
    const src=R(f);
    for(const m of src.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)){
      const host=m[1].toLowerCase();
      if(/^(github\.com|www\.gnu\.org|flahmusic\.github\.io|ko-fi\.com|docs\.github\.com|creativecommons\.org|en\.wikipedia\.org|www\.w3\.org|127\.0\.0\.1|localhost)$/.test(host))continue;
      // a link a person clicks is fine; a URL loaded by the page is not
      const at=m.index, around=src.slice(Math.max(0,at-90),at);
      if(/src\s*=\s*["']?$|href\s*=\s*["']?$|url\(\s*$|import\s*\(\s*["']?$/.test(around)){
        if(/href\s*=\s*["']?$/.test(around))continue;   // an ordinary outbound link
        bad.push(f+' loads '+host);
      }
    }
  }
  ok(bad.length===0,'nothing that ships loads a file from anyone else\'s server'+(bad.length?': '+bad.join(', '):''));
}
// ---- 3. accessibility.html prints real numbers ----
{
  const idx=R('index.html');
  const rm=(idx.match(/prefers-reduced-motion/g)||[]).length;
  const claimed=/respected<\/strong> in (\d+) places/.exec(a11y);
  ok(!!claimed,'accessibility.html states a reduced-motion count');
  if(claimed)ok(+claimed[1]===rm,'and it is the real count ('+(claimed?claimed[1]:'?')+' claimed, '+rm+' in the stylesheet)');
}
{
  // the a11y suite's own check count, read out of the suite rather than out of a memory
  const suite=R('_dev/dev-a11y.js');
  const calls=(suite.match(/(?<![A-Za-z0-9_$])ok\s*\(/g)||[]).length;
  const claims=[...a11y.matchAll(/(\d+)\s+checks(?:,\s*(\d+)\s+passing)?/g)].map(m=>+m[1]);
  const runs=/runs (\d+) checks and all (\d+) pass/.exec(a11y);
  ok(claims.length>0,'accessibility.html states how many checks the suite runs');
  // the suite loops over lists, so the literal ok() count is a FLOOR, not the total. Assert the page
  // never claims FEWER than the file can possibly produce, and never claims a number out of the air.
  const minClaim=Math.min(...claims);
  ok(minClaim>=calls,'and does not claim fewer checks than the suite literally contains ('+minClaim+' claimed, '+calls+' ok() calls in the file)');
  ok(!!runs&&runs[1]===runs[2],'the page does not claim more passes than checks');
  const consistent=new Set(claims).size===1;
  ok(consistent,'every number on the page agrees with every other one ('+[...new Set(claims)].join(' / ')+')');
}
// ---- 4. dates ----
{
  const dates=[...a11y.matchAll(/Last updated (\d+ \w+ \d{4})/g)].map(m=>m[1])
    .concat([...priv.matchAll(/Last updated (\d+ \w+ \d{4})/g)].map(m=>m[1]));
  ok(dates.length>=2,'both pages carry a last-updated date ('+dates.join(' | ')+')');
}
console.log(FAIL.length?('\n'+FAIL.length+' FAILED — a page is claiming something the code does not back up'):'\nthe checkable pages check out');
process.exit(FAIL.length?1:0);

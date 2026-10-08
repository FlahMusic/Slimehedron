// ============================================================================================
//  NAMING + CLUTTER GUARD
//   1. ONE NAME PER PARAMETER. The key select was labelled "KEY" on the strip and "root" in the panel
//      — two names for one control is how a user concludes there are two controls.
//   2. ONE PLACE PER PARAMETER. Studio showed key, scale and volume in both the strip and the panel.
//   3. DAW-STANDARD VOCABULARY where a word is needed. No invented jargon ("subdivision" is nobody's
//      term for the grid), no numbering that names nothing ("Sound 3" over "saw").
//   4. PLAY MODE READS WITHOUT READING. Every control a child touches carries a glyph or an image.
//  Run: node dev-naming.js        (needs a server on :8765)
// ============================================================================================
const {chromium}=require('playwright');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};

// Terms a musician already knows. Anything user-facing outside this list has to earn its place.
const DAW_OK=new Set(['tempo','tap','time sig','key','scale','kit','grid','quantize','groove','swing',
  'shuffle','straight','backbeat','late','early','last step','revert','volume','delay','range','octave',
  'waveform','sine','triangle','saw','square','random','sub bass','clear','pause','play','record','chords',
  'dotted notes','send midi out','internal synth','advanced','randomize','back','shape','spin','tri','sqr','rnd']);
// Terms this app invents on purpose, because the thing itself is not a DAW thing.
const OWN_WORDS=new Set(['auto-rain','rain rate','random shape','randomness','rebuild after (sec)','slime',
  'pop','rock','disco','bossa','jazz','learn','play','studio','share slimehedron','colour-blind mode']);
// card HEADINGS name a group of controls rather than a parameter — all standard DAW section names,
// plus "geometry", which is this app's own thing because no DAW has a tank to shape.
const HEADINGS=new Set(['pattern','timing','groove — human feel','key & scale','geometry','instrument',
  'mixer ⏻','mixer','sound','drums','band','advanced']);

// ---- 0. ONE DEFINITION PER STRING. Static, and first, because it is the cheapest bug to ship and the
// most expensive to notice: a second copy of a key later in the dictionary silently wins, so the app
// shows copy nobody has read in months. This is how three lessons ended up telling children to tap a
// "glowing wall" that had been replaced by a ladder.
{const fs=require('fs');const src=fs.readFileSync('learn2.js','utf8');
 const a=src.indexOf('const LANG='),z=src.indexOf('let lang=');
 const blk=src.slice(a,z),seen={},dup=[];
 for(const m of blk.matchAll(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/gm)){
   if(seen[m[1]])dup.push(m[1]); else seen[m[1]]=1;}
 ok(dup.length===0,'no lesson string is defined twice'+(dup.length?': '+[...new Set(dup)].join(', '):''));
 // and no live copy may point at a control that is not on the screen any more
 const GONE=/glowing wall|on the walls|up the walls|next door|the tank|polygon/i;
 const bad=[...blk.matchAll(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*'((?:[^'\\]|\\.)*)'/gm)]
   .filter(m=>GONE.test(m[2])).map(m=>m[1]+': "'+m[2]+'"');
 ok(bad.length===0,'no lesson names a control that was removed'+(bad.length?': '+bad.join(' | '):''));}

(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
 const open=async(mode,open_aside)=>{const ctx=await b.newContext({viewport:{width:1600,height:1000}});const p=await ctx.newPage();
   await p.goto('http://127.0.0.1:8765/index.html');await p.waitForTimeout(500);
   await p.click(`.modeCard[data-m="${mode}"]`);await p.waitForTimeout(2200);
   if(open_aside)await p.evaluate(()=>{const a=document.querySelector('aside');if(a)a.classList.add('open');});
   await p.waitForTimeout(500);return {ctx,p};};

 // ---- 1 + 2. no parameter appears twice on screen, under any name ----
 for(const mode of ['play','studio']){
   const {ctx,p}=await open(mode,true);
   const r=await p.evaluate(()=>{
     const vis=e=>e&&e.offsetParent!==null&&getComputedStyle(e).visibility!=='hidden';
     // controls that write the SAME app state, keyed by what they control
     const PAIRS=[['key','#root','#keyTop'],['scale','#scale','#scaleTop'],
                  ['volume','#vol','#volPlay'],['tempo','#bpm','#bpmNum'],['grid','#divSeg','#divSel']];
     const dupes=[];
     for(const [name,a,c] of PAIRS){
       const A=document.querySelector(a),C=document.querySelector(c);
       if(vis(A)&&vis(C))dupes.push(name);}
     return dupes;});
   ok(r.length===0,'['+mode+'] no parameter is on screen in two places at once'+(r.length?': '+r.join(', '):''));
   await ctx.close();}

 // ---- 3. vocabulary ----
 {const {ctx,p}=await open('studio',true);
  const words=await p.evaluate(()=>{
    const vis=e=>e&&e.offsetParent!==null;
    const out=new Set();
    document.querySelectorAll('aside label,.sbLbl,h2,.psLbl,#studioBar .sbLbl').forEach(e=>{
      if(!vis(e))return;const t=(e.innerText||'').trim().toLowerCase().replace(/\s+/g,' ');
      if(t&&t.length<30)out.add(t);});
    return [...out];});
  const unknown=words.filter(w=>!DAW_OK.has(w)&&!OWN_WORDS.has(w)&&!HEADINGS.has(w)&&!/^[\d/.]+$/.test(w));
  ok(unknown.length===0,'every studio label is either a DAW term or a deliberate one'+(unknown.length?': '+unknown.join(', '):''));
  // the specific regressions we fixed, named so they cannot quietly return
  const bad=await p.evaluate(()=>{
    const t=document.body.innerText.toLowerCase();
    return ['subdivision','octave span'].filter(w=>t.includes(w));});
  ok(bad.length===0,'retired terms stay retired'+(bad.length?': '+bad.join(', '):''));
  await ctx.close();}

 // ---- 4. play mode must read without reading ----
 {const {ctx,p}=await open('play',false);
  const r=await p.evaluate(()=>{
    const vis=e=>e&&e.offsetParent!==null;
    const noGlyph=[],labels=[];
    document.querySelectorAll('#psWaves .psBtn,#psDrums .psBtn,header .btngroup button:not(#hdrChord),#clearBtn,#chordBtn').forEach(e=>{
      if(!vis(e))return;
      // a picture is a picture however it is drawn: an svg, an img, a ::before glyph, a child element
      // that IS the glyph (the record dot), or a glyph character sitting in the label text.
      const txt=e.innerText||'';
      const hasArt=!!(e.querySelector('svg,img,#recDot,.ss-knob')
        ||getComputedStyle(e,'::before').content!=='none'
        ||/[\u2190-\u2BFF\u1F300-\u1FAFF\u25A0-\u25FF\u2600-\u27BF]/u.test(txt));
      if(!hasArt)noGlyph.push((e.id||e.className)+' \u201c'+txt.trim().slice(0,14)+'\u201d');});
    document.querySelectorAll('.psLbl').forEach(e=>{if(vis(e))labels.push(e.innerText.trim());});
    return {noGlyph,labels};});
  ok(r.noGlyph.length===0,'every control a child touches carries a glyph or image'+(r.noGlyph.length?': '+r.noGlyph.join(', '):''));
  const numbered=r.labels.filter(l=>/\d/.test(l));
  ok(numbered.length===0,'no side button is labelled by a number that names nothing'+(numbered.length?': '+numbered.join(', '):''));
  const twoLine=r.labels.filter(l=>l.includes('\n'));
  ok(twoLine.length===0,'each side button has ONE label, not a stacked pair'+(twoLine.length?': '+twoLine.length+' stacked':''));
  ok(r.labels.length>=10,'the side columns still label every button ('+r.labels.length+')');
  await ctx.close();}

 // ---- A LABEL SET TO font-size:0 IS NOT A LABEL ----------------------------------------
 // This is how the rails lost their names: .psLbl once held "Sound 3" over a child .psSub holding
 // "saw", and the phone rule zeroed the parent's own text node. The refactor merged them into one
 // span and the rule stayed, so every phone showed five unlabelled icons while a display/visibility
 // check like the one above happily called them visible. Measure what RENDERS, not what exists.
 for(const [tag,w,h] of [['phone',393,852],['small phone',375,667],['tiny',320,568],['tablet',744,1133]]){
   const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:true,isMobile:true,deviceScaleFactor:1});
   const p=await ctx.newPage();
   await p.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1')}catch(e){}});
   await p.goto('file://'+__dirname+'/index.html');await p.waitForTimeout(400);
   await p.tap('.modeCard[data-m="play"]');await p.waitForTimeout(1600);
   const r=await p.evaluate(()=>{const out=[];
     document.querySelectorAll('.psLbl').forEach(e=>{const c=getComputedStyle(e),q=e.getBoundingClientRect();
       if(c.display==='none'||c.visibility==='hidden')return;
       out.push({t:e.innerText.trim(),fs:parseFloat(c.fontSize),h:Math.round(q.height)});});
     return out;});
   const shown=r.filter(x=>x.fs>=10&&x.h>=9);
   ok(shown.length>=10,'['+tag+'] every rail button shows a name you can read ('+shown.length+'/'+r.length+
      (shown.length<10?', smallest '+Math.min.apply(null,r.map(x=>x.fs))+'px':'')+')');
   await ctx.close();}

 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'naming is consistent and nothing is on screen twice'));
 process.exit(FAIL.length?1:0);})();

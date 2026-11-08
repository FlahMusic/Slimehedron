// ============================================================================================
//  THE SLIME STAYS A SHADE DARKER THAN WHAT IS BEHIND IT (Flah 2026-11-03, look question 6: "a pale green slime almost
//  disappears on the green grass"; answer: yes). Measured 2026-11-08: the page behind the tank is relative luminance
//  0.77-0.88 on a desktop (10th to 50th percentile), white on a phone. "A shade darker" = at least 1.5:1 against the
//  darkest of it, so the slime's colour is held at or under 0.48.
//    1. every chord colour the slime can take (12 keys x 10 chord types) is at or under 0.48, with its hue and
//       saturation unchanged (only the brightest are deepened); the 12 keys spread round the colour wheel
//    2. drawn: the brightest chord colours (found from the table, not guessed), planted as a pool in play, 2D and 3D,
//       come out at least 1.4:1 darker than the page behind the tank (median goo pixel vs median background pixel),
//       and so does the brightest green (Flah's case: green slime on green grass); in 3D a colour that stands out by
//       hue (a yellow on the mint page) needs 1.2:1 (see the note at the check)
//  Needs a local server: python -m http.server 8765. Run from the project root: node _dev/dev-slimecontrast.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const init=()=>{try{for(const k of ['slimehedron-coach','slimehedron-coach-studio','slimehedron-tapped'])localStorage.setItem(k,'1');}catch(e){}};

(async()=>{const b=await launch({args:['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist']});
 // ---- 1. the table ----
 let worst=null;
 {const ctx=await b.newContext({viewport:{width:1280,height:900}});await ctx.addInitScript(init);const p=await ctx.newPage();
  await p.goto('http://127.0.0.1:8765/index.html?m=play&view=2d');await p.waitForTimeout(2500);
  const t=await p.evaluate(()=>{const lin=v=>{v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4);},Y=c=>0.2126*lin(c[0])+0.7152*lin(c[1])+0.0722*lin(c[2]);
    const rows=[];for(let pc=0;pc<12;pc++)for(const q of Object.keys(CHORD_SHADE)){const raw=chordHSLPQ(pc,q),sh=typeof slimeShade==='function'?slimeShade(raw):raw;
      rows.push({pc,q,raw,sh,yr:Y(hslRGB(raw[0],raw[1],raw[2])),ys:Y(hslRGB(sh[0],sh[1],sh[2]))});}
    // the case Flah saw: a green slime on the green grass (the page behind the tank is mint, hue ~150): the brightest
    // chord colour with a hue of 90-170 deg
    const deg=h=>((h%1)+1)%1*360,green=rows.filter(r=>deg(r.raw[0])>=90&&deg(r.raw[0])<=170).sort((a,b)=>b.yr-a.yr)[0]||rows[0];
    rows.sort((a,b)=>b.yr-a.yr);return {green:{pc:green.pc,q:green.q,raw:green.raw,yr:+green.yr.toFixed(3),g:1},max:Math.max(...rows.map(r=>r.ys)),same:rows.every(r=>Math.abs(r.raw[0]-r.sh[0])<1e-9&&Math.abs(r.raw[1]-r.sh[1])<1e-9),
      top:rows.slice(0,3).map(r=>({pc:r.pc,q:r.q,raw:r.raw,yr:+r.yr.toFixed(3)})),fn:typeof slimeShade==='function'};});
  ok(t.fn&&t.max<=0.48,'1. every chord colour the slime can take is at or under 0.48 luminance (brightest '+t.max.toFixed(3)+'; the table\'s own brightest: '+t.top.map(r=>r.yr).join(', ')+')');
  ok(t.same,'1. only the lightness moves: hue and saturation are the chord\'s');
  // the chord wheel itself: the 12 keys round the fifths, spread round the hue circle (auroraHue is in degrees; handed
  // to hslRGB, which works in turns, 7 keys of 12 came out red, 2026-11-04 to 11-08)
  const hw=await p.evaluate(()=>{const hs=[];for(let pc=0;pc<12;pc++){const c=hslRGB(...chordHSLPQ(pc,'major')),r=c[0]/255,g=c[1]/255,b=c[2]/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;
    let h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;hs.push(((h*60)+360)%360);}hs.sort((a,b)=>a-b);
    let gap=360;for(let i=0;i<12;i++)gap=Math.min(gap,((hs[(i+1)%12]-hs[i])+360)%360);return {gap,hs:hs.map(Math.round)};});
  ok(hw.gap>=10,'1. the 12 keys\' chord colours spread round the wheel, at least 10 deg apart (the table\'s own closest pair is 14; closest '+hw.gap.toFixed(0)+': '+hw.hs.join(' ')+')');
  worst=[t.green,...t.top.slice(0,2)];await ctx.close();}
 // ---- 2. drawn, in 2D and 3D ----
 for(const view of ['2d','3d']){
  const ctx=await b.newContext({viewport:{width:1280,height:900}});await ctx.addInitScript(init);const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html?m=play&view='+view+'&space=normal');await p.waitForTimeout(3500);
  for(const w of worst){
   const r=await p.evaluate(async(w)=>{window.chordHSL=()=>w.raw.slice();liqHSL=null;   // the slime takes this chord's colour
     const sel=document.getElementById('shape');if(sel){sel.value='6';sel.dispatchEvent(new Event('change'));}
     await new Promise(r=>setTimeout(r,500));fillState='fill';particles.length=0;const n=Math.round(partCap()*0.5);
     let sd=777;const rnd=()=>((sd=sd*1103515245+12345&0x7fffffff)/0x7fffffff),g=()=>{let u=0;for(let k=0;k<3;k++)u+=rnd();return u/3-0.5;};
     for(let i=0;i<n;i++)particles.push({x:CX+g()*R*0.5,y:CY+g()*R*0.4,z:0.5+g()*0.5,vx:0,vy:0,vz:0,r:PR3,hue:0.8,pooled:true,age:80});
     if(!S.playing)setPlaying(true);await new Promise(r=>setTimeout(r,2500));S.playing=false;await new Promise(r=>setTimeout(r,400));
     const lin=v=>{v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4);},Y=(a,b2,c)=>0.2126*lin(a)+0.7152*lin(b2)+0.0722*lin(c);
     // the whole stage as the eye sees it: the page's background behind, then whichever tank canvas is showing
     const gl=typeof GLV!=='undefined'&&GLV.api&&VIEW.d3?GLV.api.canvas:null,cv=document.getElementById('cv'),src=gl||cv;if(gl)GLV.api.render();
     const rr=src.getBoundingClientRect(),W=src.width,H=src.height,o=document.createElement('canvas');o.width=W;o.height=H;const x=o.getContext('2d');x.drawImage(src,0,0);
     const d=x.getImageData(0,0,W,H).data,lq=liqRGB;
     // goo pixels: opaque, and their hue near the liquid's; background: transparent canvas pixels, read from a screenshot later
     const toH=(r,g,b)=>{const mx=Math.max(r,g,b),mn=Math.min(r,g,b),dd=mx-mn;if(!dd)return [0,0];let h=mx===r?((g-b)/dd)%6:mx===g?(b-r)/dd+2:(r-g)/dd+4;return [((h*60)+360)%360,dd/255];};
     const lh=toH(lq[0],lq[1],lq[2])[0],G=[];
     for(let i=0;i<W*H;i+=3){const k=i*4;if(d[k+3]<230)continue;const [h,c]=toH(d[k],d[k+1],d[k+2]);const dh=Math.min(Math.abs(h-lh),360-Math.abs(h-lh));if(c>0.15&&dh<25)G.push(Y(d[k],d[k+1],d[k+2]));}
     G.sort((a,b)=>a-b);return {n:G.length,goo:G.length?G[G.length>>1]:1,box:{x:rr.left+rr.width*0.3,y:rr.top+rr.height*0.3,width:rr.width*0.4,height:rr.height*0.4},liq:lq.map(v=>v|0)};},w);
   // the page behind the tank, with the tank canvases hidden
   await p.evaluate(()=>{for(const id of ['cv','cvGL'])if(document.getElementById(id))document.getElementById(id).style.visibility='hidden';});
   const png=await p.screenshot({clip:r.box});
   const bg=await p.evaluate(async(b64)=>{const im=new Image();im.src='data:image/png;base64,'+b64;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);const d=x.getImageData(0,0,c.width,c.height).data;
     const lin=v=>{v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4);},L=[];for(let i=0;i<d.length;i+=16)L.push(0.2126*lin(d[i])+0.7152*lin(d[i+1])+0.0722*lin(d[i+2]));L.sort((a,b)=>a-b);return L[L.length>>1];},png.toString('base64'));
   await p.evaluate(()=>{for(const id of ['cv','cvGL'])if(document.getElementById(id))document.getElementById(id).style.visibility='';S.playing=true;});
   // 1.4:1 for the green on the green page, and everywhere in 2D. In 3D a colour whose hue already stands out (a yellow
   // on mint) needs 1.2:1: the wet skin's light draws it ~2x its base, and holding a yellow's base low enough for 1.4
   // turned it mustard (screenshots 2026-11-08: base 0.30 -> 1.41:1 and olive, base 0.36 -> 1.24:1 and still candy)
   const cr=(bg+0.05)/(r.goo+0.05),need=(w.g||view==='2d')?1.4:1.2;
   ok(r.n>2000&&cr>=need,'2. ['+view+'] '+(w.g?'the green, ':'')+w.q+' in key '+w.pc+' (needs '+need+':1; rgb '+r.liq.join(',')+'): the slime is '+cr.toFixed(2)+':1 darker than the page behind it (goo '+r.goo.toFixed(3)+', page '+bg.toFixed(3)+', '+r.n+' px)');}
  ok(errs.length===0,'['+view+'] no page errors ('+errs.slice(0,2).join(' | ')+')');
  await ctx.close();}
 await b.close();
 console.log(FAIL.length?'\n'+FAIL.length+' FAILURE(S)':'\nthe slime stands out from the page, in every chord colour');process.exit(FAIL.length?1:0);})();

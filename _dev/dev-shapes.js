// ============================================================================================
//  THE CORNER MENU SPEAKS IN PICTURES — and grow / back make sense to someone who cannot read.
//    1. every choice (3D/2D, glass/crayon, auto/normal/portal/curved) shows a picture, not just a word
//    2. each grow button shows THE SHAPE YOU WILL GET: its picture has exactly that solid's edges
//       (tetra 6, cube 12, octa 12, dodeca 30, icosa 30, and the grown ones counted from the geometry)
//    3. pressing one grows the tank into that shape, and the "now" picture becomes the picture that
//       was on the button: what you saw is what you got
//    4. "back" undoes one grow step, and is greyed out when there is nothing to go back to
//    5. nothing can be pressed in the middle of a grow; every picture stays inside its box
//  Needs a local server: python3 -m http.server 8765
//  Run from the project root: node _dev/dev-shapes.js
// ============================================================================================
const {launch}=require('./browser');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
(async()=>{const b=await launch();
 const ctx=await b.newContext({viewport:{width:1200,height:900}});
 await ctx.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');}catch(e){}});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://127.0.0.1:8765/index.html?m=play&view=3d&space=normal');await p.waitForTimeout(2500);
 await p.evaluate(()=>{const t=document.getElementById('randShapeT');if(t&&t.classList.contains('on'))t.click();
   const s=document.getElementById('shape');s.value='cube';s.dispatchEvent(new Event('change'));fillState='fill';});
 await p.waitForTimeout(600);
 await p.click('#spaceBtn');await p.waitForTimeout(300);
 // ---- 1. pictures on every choice ----
 const pics=await p.evaluate(()=>[...document.querySelectorAll('#spaceMenu [data-view],#spaceMenu [data-look],#spaceMenu [data-space]')]
   .filter(b=>!b.hidden&&b.offsetParent!==null||b.closest('#lookRow')&&!b.closest('#lookRow').hidden)
   .map(b=>({k:b.dataset.view||b.dataset.look||b.dataset.space,pic:!!b.querySelector('svg.smPic path,svg.smPic rect'),word:(b.querySelector('.smWord')||{}).textContent})));
 ok(pics.length>=6&&pics.every(x=>x.pic),'every choice in the corner menu shows a picture ('+pics.map(x=>x.k+(x.pic?'':'(none)')).join(', ')+')');
 ok(pics.every(x=>x.word&&x.word.length<9),'with the word small underneath, for whoever can read it');
 const distinct=await p.evaluate(()=>new Set([...document.querySelectorAll('#spaceMenu [data-space] svg')].map(s=>s.innerHTML)).size);
 ok(distinct===4,'auto, normal, portal and curved all look different ('+distinct+' different pictures)');
 // ---- 2. a grow picture IS the shape ----
 const edges=await p.evaluate(()=>{const count=n=>{const d=window._solidPic(n);const m=d.match(/M[\d. ]+L[\d. ]+/g);return m?m.length:0;};
   const real=n=>{const F=solidFaces(solidPlanes(n));const S=new Set();F.forEach(f=>{for(let k=0;k<f.length;k++){const a=f[k].p,b=f[(k+1)%f.length].p;
     S.add([a,b].map(q=>q.map(x=>Math.round(x)).join(',')).sort().join('|'));}});return S.size;};
   const out={};for(const n of ['tetra','cube','octa','dodeca','icosa','cube.cut','cube.flip','cube.puff','tetra.cut.flip'])out[n]=[count(n),real(n)];return out;});
 const want={tetra:6,cube:12,octa:12,dodeca:30,icosa:30};
 ok(Object.keys(want).every(n=>edges[n][0]===want[n]),'the five seed pictures have the right number of edges ('+Object.keys(want).map(n=>n+' '+edges[n][0]).join(', ')+')');
 ok(Object.keys(edges).every(n=>edges[n][0]===edges[n][1]),'and every grown picture has exactly as many edges as the real solid ('+Object.keys(edges).map(n=>n+' '+edges[n].join('/')).join(', ')+')');
 const inBox=await p.evaluate(()=>[...document.querySelectorAll('#spaceMenu svg.smPic *')].every(el=>{   // geometry only, not opacities or widths
   const nums=[];for(const k of ['d','cx','cy','x','y'])if(el.getAttribute(k))nums.push(...(el.getAttribute(k).match(/-?\d*\.?\d+/g)||[]).map(Number));
   const w=+(el.getAttribute('x')||0)+ +(el.getAttribute('width')||0),h=+(el.getAttribute('y')||0)+ +(el.getAttribute('height')||0);
   return nums.every(v=>v>=-0.5&&v<=36.5)&&w<=36.5&&h<=36.5;}));
 ok(inBox,'every picture stays inside its box');
 // ---- 3. press cut: the tank grows, and the "now" picture becomes the one that was on the button ----
 const before=await p.evaluate(()=>({btn:document.querySelector('#growBar [data-grow="cut"] svg').outerHTML,now:document.getElementById('smNow').innerHTML,back:document.querySelector('#growBar [data-grow="back"]').disabled}));
 ok(before.back===true,'"back" is greyed out on a shape that has not grown yet');
 await p.click('#growBar [data-grow="cut"]');await p.waitForTimeout(150);
 const mid=await p.evaluate(()=>[...document.querySelectorAll('#growBar button')].every(b=>b.disabled));
 ok(mid,'nothing in the shape row can be pressed while it is growing');
 await p.waitForTimeout(1800);
 const after=await p.evaluate(()=>({shape:String(S.shape),solid:SOLID.name,now:document.getElementById('smNow').innerHTML,back:document.querySelector('#growBar [data-grow="back"]').disabled}));
 ok(after.shape==='cube.cut'&&after.solid==='cube.cut','pressing cut grows the cube into the cut cube ('+after.shape+')');
 ok(after.now===before.btn,'and the "now" picture is the picture that was on the button: what you saw is what you got');
 ok(after.back===false,'"back" can be pressed now');
 // ---- 4. back undoes one step ----
 const backPic=await p.evaluate(()=>document.querySelector('#growBar [data-grow="back"] svg').outerHTML);
 await p.click('#growBar [data-grow="back"]');await p.waitForTimeout(1900);
 const back=await p.evaluate(()=>({shape:String(S.shape),solid:SOLID.name,now:document.getElementById('smNow').innerHTML}));
 ok(back.shape==='cube'&&back.solid==='cube','back takes the cut cube back to the cube ('+back.shape+')');
 ok(back.now===backPic&&back.now===before.now,'and its picture showed exactly that cube');
 // a flat shape's box can grow, and back takes it home to the box
 await p.keyboard.press('Escape');
 await p.evaluate(()=>{const s=document.getElementById('shape');s.value='6';s.dispatchEvent(new Event('change'));fillState='fill';});await p.waitForTimeout(500);
 await p.click('#spaceBtn');await p.waitForTimeout(250);
 await p.click('#growBar [data-grow="flip"]');await p.waitForTimeout(1900);
 const f1=await p.evaluate(()=>String(S.shape));
 await p.click('#growBar [data-grow="back"]');await p.waitForTimeout(1900);
 const f2=await p.evaluate(()=>({shape:String(S.shape),walls:edges.length}));
 ok(f1==='prism6.flip'&&f2.shape==='prism6'&&f2.walls===6,'a hexagon box grows and comes back to a six-sided box ('+f1+' -> '+f2.shape+', '+f2.walls+' walls)');
 ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'shapes pass clean'));
 process.exit(FAIL.length?1:0);})();

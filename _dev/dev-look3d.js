// ============================================================================================
//  HOW THE 3D TANK LOOKS, MEASURED ON THE GPU (this suite turns WebGL on itself).
//    1. the goo is ONE CANDY, not mud: even fed every colour at once and a grey pool colour, the colours it
//       is drawn in stay close in hue, clearly coloured (saturated) and pastel-light — in glass (the one look, ADR 0012)
//    2. a note has a clean edge: on the pale page a ball's rim is clearly darker than its middle, in its
//       own colour, so it never melts into the background
//  Needs a local server: python3 -m http.server 8765, and python3 with Pillow.
//  Run from the project root: node _dev/dev-look3d.js
// ============================================================================================
process.env.SLIME_GL='1';
const {launch}=require('./browser');
const {execFileSync}=require('child_process');const fs=require('fs'),os=require('os'),path=require('path');
// python by any of its names: Windows has no python3 unless it came from the Store (its alias only opens the Store);
// a python.org install answers to py and python. The first that runs with Pillow is used.
const PYBIN=(()=>{for(const [c,pre] of [['python3',[]],['py',['-3']],['python',[]]]){try{execFileSync(c,[...pre,'-c','import PIL'],{stdio:'ignore'});return [c,pre];}catch(e){}}
  console.log('  FAIL  needs python 3 with Pillow (winget install -e --id Python.Python.3.12, then py -m pip install pillow)');process.exit(1);})();
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'look3d-'));
// luminance in a disc of radius a..b around (cx,cy) in an image
const PY=`import sys,json,math,colorsys
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGB');W,H=im.size
px=im.load()
# the note: the ROUNDEST solid blob of saturated colour in the tank (walls are long thin lines; a difference of two
# pictures caught the walls' glow too). Its middle is the blob's centroid, its radius from its area; the rim darkens
# toward the page, so the blob is a little smaller than the drawn ball (grown 8%)
x0,y0,x1,y1=[int(float(v)) for v in sys.argv[2:6]]
x0,y0,x1,y1=max(0,x0),max(0,y0),min(W,x1),min(H,y1)
sat={}
for y in range(y0,y1):
  for x in range(x0,x1):
    R,G,B=px[x,y];h,l,s2=colorsys.rgb_to_hls(R/255,G/255,B/255)
    if s2>0.4 and 0.3<l<0.85:sat[(x,y)]=1
seen=set();best=None
for q in list(sat):
  if q in seen:continue
  st=[q];seen.add(q);comp=[]
  while st:
    a=st.pop();comp.append(a)
    for d in ((1,0),(-1,0),(0,1),(0,-1)):
      b=(a[0]+d[0],a[1]+d[1])
      if b in sat and b not in seen:seen.add(b);st.append(b)
  n=len(comp)
  if n<60 or n>4000:continue
  xs=[c[0] for c in comp];ys=[c[1] for c in comp];w=max(xs)-min(xs)+1;hh=max(ys)-min(ys)+1
  roundness=n/(math.pi*(max(w,hh)/2)**2)
  if roundness>0.6 and min(w,hh)/max(w,hh)>0.7 and (best is None or roundness>best[0]):best=(roundness,sum(xs)/n,sum(ys)/n,math.sqrt(n/math.pi)*1.08)
if best:_,cx,cy,r=best
else:cx=cy=r=0
def ring(a,b):
  s=0;n=0;sat=0
  for y in range(int(cy-b)-1,int(cy+b)+2):
    for x in range(int(cx-b)-1,int(cx+b)+2):
      d=math.hypot(x-cx,y-cy)
      if a<=d<=b and 0<=x<W and 0<=y<H:
        R,G,B=px[x,y];s+=0.299*R+0.587*G+0.114*B;mx=max(R,G,B);mn=min(R,G,B);sat+=(mx-mn)/255;n+=1
  return [s/max(1,n),sat/max(1,n)]
print(json.dumps({'mid':ring(0,r*0.35),'rim':ring(r*0.72,r*0.92),'bg':ring(r*1.6,r*2.0),'at':[round(cx),round(cy),round(r,1)]}))`;

(async()=>{const b=await launch();
 const ctx=await b.newContext({viewport:{width:1000,height:800}});
 await ctx.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');}catch(e){}window.__glKeep=true;});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://127.0.0.1:8765/index.html?m=play&view=3d&space=normal');await p.waitForTimeout(3500);
 ok(await p.evaluate(()=>!!(window.__gl&&window.__gl.api)),'the GPU tank is running');
 // ---- 1. one candy, not mud ----
 for(const look of ['glass']){
  const g=await p.evaluate(async look=>{const sb=startBreak;startBreak=()=>{};fillState='fill';particles.length=0;
    liqRGB[0]=150;liqRGB[1]=140;liqRGB[2]=128;                       // a muddy pool colour: what averaging many notes gives
    for(let i=0;i<500;i++)particles.push({x:CX+(Math.random()-0.5)*R*1.2,y:CY+(Math.random()-0.5)*R*1.2,z:Math.random(),vx:0,vy:0,vz:0,r:8,hue:Math.random(),pooled:true,age:80});
    for(let i=0;i<4;i++)window.__gl.api.render();await new Promise(r=>setTimeout(r,500));window.__gl.api.render();   /* the skin comes back from goo-worker.js a moment later */
    const c=window.__gl.api.gooColors();startBreak=sb;particles.length=0;return c;},look);
  ok(g&&g.spread<0.2,'['+look+'] fed every colour at once, the goo is still one candy (hue spread '+(g?g.spread.toFixed(3):'?')+')');
  ok(g&&g.sat>0.45,'['+look+'] and it is clearly coloured, not grey (saturation '+(g?g.sat.toFixed(2):'?')+')');
  // light, but a shade darker than the page behind it (look question 6, 2026-11-08: the old floor here was 0.55, and a
  // bright chord colour is now deepened to stand out; the saturation check above still keeps it from going muddy;
  // measured 2026-11-08 on this muddy input: 0.49)
  ok(g&&g.light>0.4&&g.light<0.88,'['+look+'] and light, not dark (lightness '+(g?g.light.toFixed(2):'?')+')');}
 // ---- 1b. a note squashes when it hits a wall, in a normal tank and in portal space ----
 const sq=async(space)=>p.evaluate(async space=>{window.setSpace(space);const s=document.getElementById('shape');s.value='6';s.dispatchEvent(new Event('change'));
   window.setSpace(space);fillState='fill';particles.length=0;balls.length=0;S.chaos=0;
   // each one starts just inside the glass and heads straight at it (software GL draws a few frames a second here)
   for(let i=0;i<4;i++){const ang=i*Math.PI/2+0.3;spawn(CX+Math.cos(ang)*R*0.62,CY+Math.sin(ang)*R*0.62);const B=balls[balls.length-1];B.z=B.pz=0.5;B.vz=0;B.vx=ballSpeed()*Math.cos(ang);B.vy=ballSpeed()*Math.sin(ang);}
   if(!S.playing)setPlaying(true);window.__gl.api.squash();
   // wait until the balls have reached the glass and come off it (or gone through it): software GL is slow here
   const v0=balls.map(b=>[b.vx,b.vy]),t0=performance.now();let k=0;
   while(performance.now()-t0<15000){await new Promise(r=>setTimeout(r,250));k=Math.max(k,window.__gl.api.squash());
     const turned=balls.slice(0,4).filter((b,i)=>v0[i]&&b.vx*v0[i][0]+b.vy*v0[i][1]<0).length,far=balls.slice(0,4).filter(b=>Math.hypot(b.x-CX,b.y-CY)<R*0.5).length;
     if(turned>=2)break;}return {k:Math.max(k,window.__gl.api.squash()),space:edges._space,n:balls.length,b0:balls[0]?[Math.round(balls[0].x),Math.round(balls[0].y),balls[0].vx.toFixed(1)]:null,shape:String(S.shape),gl:!!window.__gl.api,look:window.__gl.api.look};},space);
 const sN=await sq('normal'),sP=await sq('portal');
 ok(sN.k>0.15,'a note squashes when it hits a wall (flattened by up to '+(sN.k*100).toFixed(0)+'%'+(sN.k>0.15?'':', '+JSON.stringify(sN))+')');
 ok(sP.space==='portal'&&sP.k>0.15,'in portal space too: only the two wormholes take a note in, the rest of the glass still bounces (and squashes) it ('+(sP.k*100).toFixed(0)+'%)');
 await p.evaluate(()=>{window.setSpace('normal');balls.length=0;});
 // ---- 2. a note has a clean edge ----

 // (the note is FOUND in the picture: the 3D box tumbles, and it was looked for where the flat projection P3 puts it,
 // ~130 px from where the GPU drew it, so from then on this read the empty page: 'rim lighter than middle'. The view is
 // held still too, as dev-gl does. 2026-11-23)
 const shot=await p.evaluate(()=>{try{setPlaying(false);}catch(e){}_reduced=true;particles.length=0;balls.length=0;window.requestAnimationFrame=()=>0;const T0=performance.now();performance.now=()=>T0;   /* (pinned: one still picture) */
   spawn(CX,CY);const B=balls[0];B.vx=B.vy=0;B.x=B.px=CX;B.y=B.py=CY;B.z=B.pz=0.15;B.hue=0.58;B.trail.length=0;
   window.__gl.api.render();window.__gl.api.render();
   const g=document.getElementById('cvGL').getBoundingClientRect();return {x:g.left,y:g.top,r:g.right,b:g.bottom};});   // (the tank's box: the note is found inside it, below)
 const f=path.join(TMP,'ball.png');await p.screenshot({path:f});
 const m=JSON.parse(execFileSync(PYBIN[0],[...PYBIN[1],'-c',PY,f,String(shot.x),String(shot.y),String(shot.r),String(shot.b)]).toString());
 if(process.env.KEEP)console.log('   ball at',JSON.stringify(shot),'shot',f);
 ok(m.at[2]>=5,'the note is found where it is drawn (at '+m.at[0]+', '+m.at[1]+', radius '+m.at[2]+' px)');
 ok(m.mid[0]-m.rim[0]>18,'a note\'s rim is clearly darker than its middle (luminance '+m.mid[0].toFixed(0)+' -> '+m.rim[0].toFixed(0)+')');
 ok(m.bg[0]-m.rim[0]>45,'so its edge stands out from the pale page (page '+m.bg[0].toFixed(0)+', rim '+m.rim[0].toFixed(0)+')');
 ok(m.rim[1]>0.25,'and the rim is its own colour, not grey (saturation '+m.rim[1].toFixed(2)+')');
 ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'look3d pass clean'));
 process.exit(FAIL.length?1:0);})();

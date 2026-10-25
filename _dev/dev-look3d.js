// ============================================================================================
//  HOW THE 3D TANK LOOKS, MEASURED ON THE GPU (this suite turns WebGL on itself).
//    1. the goo is ONE CANDY, not mud: even fed every colour at once and a grey pool colour, the colours it
//       is drawn in stay close in hue, clearly coloured (saturated) and pastel-light — in glass and crayon
//    2. a note has a clean edge: on the pale page a ball's rim is clearly darker than its middle, in its
//       own colour, so it never melts into the background
//  Needs a local server: python3 -m http.server 8765, and python3 with Pillow.
//  Run from the project root: node _dev/dev-look3d.js
// ============================================================================================
process.env.SLIME_GL='1';
const {launch}=require('./browser');
const {execFileSync}=require('child_process');const fs=require('fs'),os=require('os'),path=require('path');
const FAIL=[];const ok=(c,m)=>{console.log((c?'  PASS  ':'  FAIL  ')+m);if(!c)FAIL.push(m);};
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'look3d-'));
// luminance in a disc of radius a..b around (cx,cy) in an image
const PY=`import sys,json,math
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGB');W,H=im.size;cx,cy,r=float(sys.argv[2]),float(sys.argv[3]),float(sys.argv[4])
px=im.load()
def ring(a,b):
  s=0;n=0;sat=0
  for y in range(int(cy-b)-1,int(cy+b)+2):
    for x in range(int(cx-b)-1,int(cx+b)+2):
      d=math.hypot(x-cx,y-cy)
      if a<=d<=b and 0<=x<W and 0<=y<H:
        R,G,B=px[x,y];s+=0.299*R+0.587*G+0.114*B;mx=max(R,G,B);mn=min(R,G,B);sat+=(mx-mn)/255;n+=1
  return [s/max(1,n),sat/max(1,n)]
print(json.dumps({'mid':ring(0,r*0.35),'rim':ring(r*0.72,r*0.92),'bg':ring(r*1.6,r*2.0)}))`;

(async()=>{const b=await launch();
 const ctx=await b.newContext({viewport:{width:1000,height:800}});
 await ctx.addInitScript(()=>{try{localStorage.setItem('slimehedron-coach','1');}catch(e){}window.__glKeep=true;});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://127.0.0.1:8765/index.html?m=play&view=3d&space=normal');await p.waitForTimeout(3500);
 ok(await p.evaluate(()=>!!(window.__gl&&window.__gl.api)),'the GPU tank is running');
 // ---- 1. one candy, not mud ----
 for(const look of ['glass','crayon']){
  const g=await p.evaluate(look=>{window.setLook3D(look);const sb=startBreak;startBreak=()=>{};fillState='fill';particles.length=0;
    liqRGB[0]=150;liqRGB[1]=140;liqRGB[2]=128;                       // a muddy pool colour: what averaging many notes gives
    for(let i=0;i<500;i++)particles.push({x:CX+(Math.random()-0.5)*R*1.2,y:CY+(Math.random()-0.5)*R*1.2,z:Math.random(),vx:0,vy:0,vz:0,r:8,hue:Math.random(),pooled:true,age:80});
    for(let i=0;i<4;i++)window.__gl.api.render();const c=window.__gl.api.gooColors();startBreak=sb;particles.length=0;return c;},look);
  ok(g&&g.spread<0.2,'['+look+'] fed every colour at once, the goo is still one candy (hue spread '+(g?g.spread.toFixed(3):'?')+')');
  ok(g&&g.sat>0.45,'['+look+'] and it is clearly coloured, not grey (saturation '+(g?g.sat.toFixed(2):'?')+')');
  ok(g&&g.light>0.55&&g.light<0.88,'['+look+'] and pastel-light, not dark or muddy (lightness '+(g?g.light.toFixed(2):'?')+')');}
 // ---- 1b. a note squashes when it hits a wall, and not when it slips through a glued (portal) side ----
 const sq=async(space)=>p.evaluate(async space=>{window.setLook3D('glass');window.setSpace(space);const s=document.getElementById('shape');s.value='6';s.dispatchEvent(new Event('change'));
   window.setSpace(space);fillState='fill';particles.length=0;balls.length=0;S.chaos=0;
   // each one starts just inside the glass and heads straight at it (software GL draws a few frames a second here)
   for(let i=0;i<4;i++){const ang=i*Math.PI/2+0.3;spawn(CX+Math.cos(ang)*R*0.62,CY+Math.sin(ang)*R*0.62);const B=balls[balls.length-1];B.z=B.pz=0.5;B.vz=0;B.vx=ballSpeed()*Math.cos(ang);B.vy=ballSpeed()*Math.sin(ang);}
   if(!S.playing)setPlaying(true);window.__gl.api.squash();
   // wait until the balls have reached the glass and come off it (or gone through it): software GL is slow here
   const v0=balls.map(b=>[b.vx,b.vy]),t0=performance.now();let k=0;
   while(performance.now()-t0<15000){await new Promise(r=>setTimeout(r,250));k=Math.max(k,window.__gl.api.squash());
     const turned=balls.slice(0,4).filter((b,i)=>v0[i]&&b.vx*v0[i][0]+b.vy*v0[i][1]<0).length,far=balls.slice(0,4).filter(b=>Math.hypot(b.x-CX,b.y-CY)<R*0.5).length;
     if(turned>=2||(space==='portal'&&far>=2&&performance.now()-t0>3000))break;}return {k:Math.max(k,window.__gl.api.squash()),space:edges._space,n:balls.length,b0:balls[0]?[Math.round(balls[0].x),Math.round(balls[0].y),balls[0].vx.toFixed(1)]:null,shape:String(S.shape),gl:!!window.__gl.api,look:window.__gl.api.look};},space);
 const sN=await sq('normal'),sP=await sq('portal');
 ok(sN.k>0.15,'a note squashes when it hits a wall (flattened by up to '+(sN.k*100).toFixed(0)+'%'+(sN.k>0.15?'':', '+JSON.stringify(sN))+')');
 ok(sP.space==='portal'&&sP.k<0.02,'and does not when it slips through a glued side (portal: '+(sP.k*100).toFixed(0)+'%)');
 await p.evaluate(()=>{window.setSpace('normal');balls.length=0;});
 // ---- 2. a note has a clean edge ----
 await p.evaluate(()=>window.setLook3D('glass'));
 const shot=await p.evaluate(()=>{try{setPlaying(false);}catch(e){}particles.length=0;balls.length=0;window.requestAnimationFrame=()=>0;
   spawn(CX,CY);const B=balls[0];B.vx=B.vy=0;B.x=B.px=CX;B.y=B.py=CY;B.z=B.pz=0.15;B.hue=0.58;B.trail.length=0;
   window.__gl.api.render();window.__gl.api.render();
   const s=P3(CX,CY,0.15),c=document.getElementById('cv').getBoundingClientRect(),k=c.width/W;
   return {x:c.left+s[0]*k,y:c.top+s[1]*k,r:BR*s[2]*window.__gl.api.noteScale*k};});
 const f=path.join(TMP,'ball.png');await p.screenshot({path:f});
 const m=JSON.parse(execFileSync('python3',['-c',PY,f,String(shot.x),String(shot.y),String(shot.r)]).toString());
 if(process.env.KEEP)console.log('   ball at',JSON.stringify(shot),'shot',f);
 ok(m.mid[0]-m.rim[0]>18,'a note\'s rim is clearly darker than its middle (luminance '+m.mid[0].toFixed(0)+' -> '+m.rim[0].toFixed(0)+')');
 ok(m.bg[0]-m.rim[0]>45,'so its edge stands out from the pale page (page '+m.bg[0].toFixed(0)+', rim '+m.rim[0].toFixed(0)+')');
 ok(m.rim[1]>0.25,'and the rim is its own colour, not grey (saturation '+m.rim[1].toFixed(2)+')');
 ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
 await b.close();
 console.log('\n'+(FAIL.length?FAIL.length+' FAILURE(S)':'look3d pass clean'));
 process.exit(FAIL.length?1:0);})();

// ============================================================================================
//  THE 3D TANK ON THE GRAPHICS CARD  (Slimehedron, GPL-3.0-or-later)
//  three.js (MIT, vendored in vendor/three-slime.js) draws the same tank the physics already runs:
//  nothing here moves a ball or plays a note. It READS the app's own state every frame -- balls,
//  edges, particles, the box tilt _M, the spin rot -- straight from the page's globals, and draws it
//  as real glass, real light and a real volume of goo.
//
//  The camera is built to match P3() exactly (a pinhole CAM px in front of the front glass, focal
//  length CAM px), so a ball drawn here sits on the same pixel the canvas view would draw it, and a
//  tap un-projected by screenToBox() still lands where the finger is.
//
//  Box-local coordinates, as in the physics: x right, y DOWN, z 0 (front glass) .. 1 (back glass),
//  centred so (CX,CY,0.5) is the origin. The box group's matrix is S * [M | t] with S = diag(1,-1,-1),
//  which turns P3's screen-style axes into three.js's (y up, camera looking down -z).
// ============================================================================================
import * as T from './vendor/three-slime.js';

export function start(){
  const stage=document.getElementById('stage');
  const glc=document.createElement('canvas');glc.id='cvGL';glc.setAttribute('aria-hidden','true');
  stage.insertBefore(glc,cv);
  let renderer;
  try{renderer=new T.WebGLRenderer({canvas:glc,antialias:true,alpha:true,powerPreference:'high-performance'});}
  catch(e){glc.remove();throw e;}
  renderer.setClearColor(0x000000,0);
  renderer.localClippingEnabled=true;   // the goo is clipped to the glass it sits in
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=1.05;   // keeps the pastels true
  const scene=new T.Scene();
  const pm=new T.PMREMGenerator(renderer);
  scene.environment=pm.fromScene(new T.RoomEnvironment(),0.04).texture;          // reflections, built in code: nothing downloaded
  scene.fog=new T.Fog(0xf1ecfb,CAM+BOXD*0.3,CAM+BOXD*7);   // AERIAL PERSPECTIVE: the far side of the tank sits in a faint haze. Kept light: a thick white fog washed every colour out
  pm.dispose();
  scene.add(new T.HemisphereLight(0xffffff,0xd9c9ff,1.1));
  const key=new T.DirectionalLight(0xffffff,1.7);key.position.set(-420,620,900);scene.add(key);
  const rim=new T.DirectionalLight(0xe6dcff,0.9);rim.position.set(500,-200,-600);scene.add(rim);
  const camera=new T.PerspectiveCamera(2*Math.atan((H/2)/CAM)*180/Math.PI,W/H,20,8000);
  camera.position.set(0,0,CAM);camera.lookAt(0,0,0);

  const box=new T.Group();box.matrixAutoUpdate=false;scene.add(box);   // box-local frame
  const spin=new T.Group();box.add(spin);                              // the shape's own turn (rot)
  const HALF=BOXD/2,zl=d=>d*BOXD-HALF;                                // depth 0..1 -> local z

  // ---------- materials ----------
  let lite=!!LITE;
  // GLASS IS CLEAR FACE-ON AND BRIGHT AT A GLANCING ANGLE (Fresnel). Opacity alone makes a flat tint;
  // this raises it toward the edges of each pane the way real glass catches light at its edges.
  // em: a material that carries vertex or instance colours also GLOWS a little in them, so a pastel stays a
  // pastel under the lights instead of going grey-white. Each variant gets its own program key: three.js
  // caches shaders by the onBeforeCompile SOURCE, which is the same text whatever numbers the closure holds.
  const fresnel=(m,edge,em,cap)=>{em=em||0;m.onBeforeCompile=sh=>{let f=sh.fragmentShader;
      // cap: where the glass clips the goo you look into it from inside; paint that inside a flat goo colour, so a cut reads as goo pressed flat on the glass, not a hollow shell
      if(cap)f=f.replace('#include <opaque_fragment>','if(!gl_FrontFacing)outgoingLight=vColor.rgb*0.82;\n#include <opaque_fragment>');
      if(edge)f=f.replace('#include <opaque_fragment>','diffuseColor.a=clamp(diffuseColor.a+pow(1.0-abs(dot(normal,normalize(vViewPosition))),3.0)*'+edge.toFixed(2)+',0.0,1.0);\n#include <opaque_fragment>');
      if(em)f=f.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )\ntotalEmissiveRadiance+=vColor.rgb*'+em.toFixed(2)+';\n#endif');
      sh.fragmentShader=f;};
    m.customProgramCacheKey=()=>'slime-fr'+edge+'-em'+em+(cap?'-cap':'');return m;};
  const glassFor=(col)=>fresnel(new T.MeshPhysicalMaterial({color:col,metalness:0,roughness:0.06,
    clearcoat:1,clearcoatRoughness:0.04,iridescence:0.7,iridescenceIOR:1.32,iridescenceThicknessRange:[180,520],
    specularIntensity:1,envMapIntensity:1.8,transparent:true,opacity:0.2,side:T.DoubleSide,depthWrite:false,
    emissive:col,emissiveIntensity:0.25}),0.6);
  const paneMat=fresnel(new T.MeshPhysicalMaterial({color:0xe2d4ff,roughness:0.18,clearcoat:1,envMapIntensity:1,
    transparent:true,opacity:0.3,side:T.DoubleSide,depthWrite:false,emissive:0xcdb8ff,emissiveIntensity:0}),0.3);
  const frontMat=new T.MeshPhysicalMaterial({color:0xffffff,roughness:0.02,clearcoat:1,iridescence:0.4,
    envMapIntensity:1.6,transparent:true,opacity:0.05,side:T.DoubleSide,depthWrite:false,emissive:0xffffff,emissiveIntensity:0});
  // glowing rims and soft points: our own small shaders (unlit, so they read as light)
  const rimMat=new T.ShaderMaterial({transparent:true,depthWrite:false,
    uniforms:{uT:{value:0}},
    vertexShader:`attribute vec3 color;attribute float dash;varying vec3 vC;varying float vD;
      void main(){vC=color;vD=dash;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform float uT;varying vec3 vC;varying float vD;
      void main(){float a=1.0;if(vD>=0.0){float f=fract(vD/23.0-uT*0.9);if(f>0.55)discard;}
        gl_FragColor=vec4(vC,a);
        #include <colorspace_fragment>
      }`});
  const ptVert=`attribute float size;attribute vec4 col;varying vec4 vC;uniform float uScale;
    void main(){vC=col;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=size*uScale/-mv.z;gl_Position=projectionMatrix*mv;}`;
  // a ball's trail: soft dots in its own colour, blended normally. The old additive glow added light to a pale
  // page, which turned every ball's halo into a white ring.
  const trailMat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uScale:{value:1}},
    vertexShader:ptVert,fragmentShader:`varying vec4 vC;void main(){vec2 p=gl_PointCoord*2.0-1.0;float r=dot(p,p);if(r>1.0)discard;
      gl_FragColor=vec4(vC.rgb,vC.a*(1.0-r));
      #include <colorspace_fragment>
      }`});
  const dropMat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uScale:{value:1}},
    vertexShader:ptVert,fragmentShader:`varying vec4 vC;void main(){vec2 p=gl_PointCoord*2.0-1.0;float r=dot(p,p);if(r>1.0)discard;
      float a=vC.a*smoothstep(1.0,0.55,r);vec3 c=vC.rgb+vec3(0.35)*smoothstep(0.5,0.0,length(p+vec2(0.35,0.35)));gl_FragColor=vec4(c,a);
      #include <colorspace_fragment>
      }`});
  const shadowMat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uScale:{value:1}},
    vertexShader:ptVert,fragmentShader:`varying vec4 vC;void main(){vec2 p=gl_PointCoord*2.0-1.0;float r=dot(p,p);if(r>1.0)discard;
      gl_FragColor=vec4(vC.rgb,vC.a*(1.0-r)*(1.0-r));
      #include <colorspace_fragment>
      }`});
  const ballMat=fresnel(new T.MeshPhysicalMaterial({roughness:0.3,metalness:0,clearcoat:0.6,clearcoatRoughness:0.07,envMapIntensity:0.25,
    emissive:0x000000}),0,0.28);   // a mirror coat ringed every ball in white: kept soft, and it glows in its own colour
  // A NOTE YOU CAN SEE. The silhouette darkens into a deeper shade of the ball's own colour, so a pale note on
  // the pale page has a clean edge; the clearcoat is tight, so the light makes one small sharp glint, not a sheen.
  {const prev=ballMat.onBeforeCompile;ballMat.onBeforeCompile=sh=>{prev(sh);sh.fragmentShader=sh.fragmentShader.replace('#include <opaque_fragment>',
    'float bR=1.0-abs(dot(normalize(normal),normalize(vViewPosition)));vec3 bK=outgoingLight*0.6;bK=clamp(mix(vec3(dot(bK,vec3(0.299,0.587,0.114))),bK,1.5),0.0,1.0);'+
    'outgoingLight=mix(outgoingLight,bK,smoothstep(0.3,0.6,bR)*0.85);\n#include <opaque_fragment>');};
   const k0=ballMat.customProgramCacheKey;ballMat.customProgramCacheKey=()=>k0()+'-ballrim';}
  // THE GOO IS WAX, NOT WET GLASS: no white sheen, a soft coat, and a glow in its own colour from inside, like a
  // lava lamp. Both sides are drawn so where the glass cuts it the goo looks pressed against the glass, not hollow.
  const gooMat=fresnel(new T.MeshPhysicalMaterial({vertexColors:true,roughness:0.5,metalness:0,clearcoat:0.3,clearcoatRoughness:0.3,
    envMapIntensity:0.22,transparent:true,opacity:0.92,depthWrite:true,side:T.DoubleSide}),0,0.34,true);
  const shardMat=new T.MeshPhysicalMaterial({roughness:0.08,clearcoat:1,iridescence:0.6,envMapIntensity:1.4,
    transparent:true,opacity:0.55,side:T.DoubleSide,depthWrite:false,emissive:0xffffff,emissiveIntensity:0.15});

  // ---------- THE CRAYON LOOK: the same tank, drawn instead of rendered ----------
  // The rest of the app is crayon on paper; clean CG glass in the middle of it read as something else. This
  // look keeps every bit of the 3D (the shape, the depth, the light direction) and draws it the way the art
  // is drawn: waxy broken strokes on the edges, diagonal hatching that gets denser on the shadow side, paper
  // grain, toon-banded balls and goo with a dark crayon rim. The strokes re-seed 8 times a second (the
  // "line boil" of hand-drawn animation) and hold still when the system asks for reduced motion.
  // All of it is our own shader code on top of three.js's own materials.
  let CRAY=false;
  const noteScale=()=>CRAY?1.5:1.3;   // how much bigger a note is drawn than the ball the physics moves (it reads at a glance)
  const CR={seed:{value:0},px:{value:1}};
  const reduceMotion=(()=>{try{return matchMedia('(prefers-reduced-motion: reduce)');}catch(e){return {matches:false};}})();
  const CR_GLSL=`uniform float uSeed;uniform float uPx;
    float crH(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
    float crN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
      return mix(mix(crH(i),crH(i+vec2(1.0,0.0)),f.x),mix(crH(i+vec2(0.0,1.0)),crH(i+vec2(1.0,1.0)),f.x),f.y);}
    float crGrain(vec2 q){return crN(q*0.9)*0.45+crN(q*0.21+3.1)*0.55;}
    float crHatch(vec2 q,float ang,float sp){vec2 d=vec2(cos(ang),sin(ang));
      float s=dot(q,d)+5.0*crN(q*0.025+uSeed*1.7);float f=abs(fract(s/sp)-0.5)*2.0;
      return smoothstep(0.62,0.12,f)*(0.45+0.55*crN(q*vec2(0.06,0.42)+uSeed));}`;
  // crayonize(m, {hatch, rim, spot, cap}): hatch = how much shading turns into strokes, rim = the dark outline
  // at the silhouette, spot = a toon highlight, cap = paint clipped insides flat (the goo)
  const crayonize=(m,o)=>{o=o||{};m.onBeforeCompile=sh=>{sh.uniforms.uSeed=CR.seed;sh.uniforms.uPx=CR.px;
      let f=sh.fragmentShader.replace('#include <common>','#include <common>\n'+CR_GLSL);
      let inj='vec2 crQ=gl_FragCoord.xy/uPx;float crL=dot(outgoingLight,vec3(0.299,0.587,0.114));float crG=crGrain(crQ);\n';
      // hatching follows how lit the surface is RELATIVE TO ITS OWN COLOUR (a pale wall in shade still gets strokes):
      // a light layer of strokes everywhere, like a face coloured in with crayon, denser and cross-hatched in shadow
      if(o.hatch)inj+='float crA0=max(dot(diffuseColor.rgb,vec3(0.299,0.587,0.114)),0.05);float crB0=crL/crA0;'+
        'float crS=max(crHatch(crQ,0.785,7.0)*(0.35+0.65*smoothstep(1.05,0.6,crB0)),crHatch(crQ,-0.785,9.5)*smoothstep(0.8,0.45,crB0));\n'+
        'outgoingLight=mix(outgoingLight,pow(outgoingLight,vec3(1.9))*0.9,crS*'+o.hatch.toFixed(2)+');diffuseColor.a=clamp(diffuseColor.a+crS*0.42*'+o.hatch.toFixed(2)+',0.0,1.0);\n';
      inj+='outgoingLight*=mix(0.9,1.05,crG);'+(o.body?'':'diffuseColor.a=clamp(diffuseColor.a*mix(0.72,1.12,crG),0.0,1.0);')+'\n';
      // toon: the light falls into three flat bands of the surface's own colour, like crayon pressed light, medium, hard
      if(o.toon)inj+='float crA=max(dot(diffuseColor.rgb,vec3(0.299,0.587,0.114)),0.05);float crB=crL/crA;outgoingLight=diffuseColor.rgb*(crB<0.35?0.84:(crB<0.75?0.97:1.1));\n';
      if(o.rim)inj+='float crR=1.0-abs(dot(normalize(normal),normalize(vViewPosition)));vec3 crK=outgoingLight*0.62;crK=clamp(mix(vec3(dot(crK,vec3(0.299,0.587,0.114))),crK,1.7),0.0,1.0);'+
        'outgoingLight=mix(outgoingLight,crK,smoothstep(0.55,0.8,crR+(crG-0.5)*0.14)*'+o.rim.toFixed(2)+');\n';
      if(o.spot)inj+='outgoingLight+=vec3(0.55)*smoothstep(0.9,0.96,dot(normalize(normal),normalize(vec3(-0.45,0.55,0.9))));\n';
      if(o.cap)inj='if(!gl_FrontFacing)outgoingLight=vColor.rgb*0.82;\n'+inj;
      sh.fragmentShader=f.replace('#include <opaque_fragment>',inj+'#include <opaque_fragment>');};
    m.customProgramCacheKey=()=>'slime-cr'+(o.hatch||0)+'-'+(o.rim||0)+(o.spot?'s':'')+(o.cap?'c':'')+(o.toon?'t':'')+(o.body?'b':'');return m;};
  const crayGlassFor=(col)=>crayonize(new T.MeshStandardMaterial({roughness:1,metalness:0,envMapIntensity:0.15,color:col,emissive:col,emissiveIntensity:0.18,
    transparent:true,opacity:0.24,side:T.DoubleSide,depthWrite:false}),{hatch:0.55});
  const crayPane=crayonize(new T.MeshStandardMaterial({roughness:1,metalness:0,envMapIntensity:0.15,color:0xe8dcff,emissive:0xcdb8ff,emissiveIntensity:0,transparent:true,opacity:0.3,
    side:T.DoubleSide,depthWrite:false}),{hatch:0.4});
  const crayFront=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.02,side:T.DoubleSide,depthWrite:false});
  const crayBall=crayonize(new T.MeshStandardMaterial({roughness:1,metalness:0,envMapIntensity:0.1,}),{toon:true,rim:1,spot:true,body:true});
  const crayGoo=crayonize(new T.MeshStandardMaterial({roughness:1,metalness:0,envMapIntensity:0.1,vertexColors:true,transparent:true,opacity:0.94,depthWrite:true,side:T.DoubleSide}),{toon:true,rim:0.75,cap:true,body:true});
  const craySolid=(side)=>crayonize(new T.MeshStandardMaterial({roughness:1,metalness:0,envMapIntensity:0.15,vertexColors:true,transparent:true,side,depthWrite:false,emissive:0xffffff,emissiveIntensity:0.0}),{hatch:side===T.FrontSide?0.5:0.3});
  // the edges: the same beams, each corner nudged a pixel or two on every boil, waxy and broken along the stroke
  const crayRim=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uT:{value:0},uSeed:CR.seed,uPx:CR.px},
    vertexShader:`attribute vec3 color;attribute float dash;uniform float uSeed;varying vec3 vC;varying float vD;
      float jh(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719))+uSeed*7.13)*43758.5453);}
      void main(){vC=color;vD=dash;vec3 p=position+(vec3(jh(position),jh(position+1.3),jh(position+2.7))-0.5)*2.4;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
    fragmentShader:CR_GLSL+`uniform float uT;varying vec3 vC;varying float vD;
      void main(){if(vD>=0.0){float f=fract(vD/23.0-uT*0.9);if(f>0.55)discard;}
        vec2 q=gl_FragCoord.xy/uPx;float g=crN(q*0.42+uSeed)*0.55+crN(q*1.6)*0.45;
        if(g<0.2)discard;                                   // the paper showing through the wax
        gl_FragColor=vec4(pow(vC,vec3(1.5))*0.85,smoothstep(0.2,0.45,g));
        #include <colorspace_fragment>
      }`});
  const crayW=()=>CRAY?1.7:1;   // crayon strokes are a little heavier than glass rims

  // a square beam from a to b, w thick, written into position / dash arrays (dash -1 = solid)
  function beamTo(P,D,a,b,w,dashFrom){const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],L=Math.hypot(dx,dy,dz)||1,d=[dx/L,dy/L,dz/L];
    let u=Math.abs(d[2])>0.9?[1,0,0]:[-d[1],d[0],0];const ul=Math.hypot(...u);u=u.map(v=>v/ul*w/2);
    const v=[d[1]*u[2]-d[2]*u[1],d[2]*u[0]-d[0]*u[2],d[0]*u[1]-d[1]*u[0]];
    const q=(p,s,t)=>[p[0]+u[0]*s+v[0]*t,p[1]+u[1]*s+v[1]*t,p[2]+u[2]*s+v[2]*t],cs=[[1,1],[-1,1],[-1,-1],[1,-1]];
    for(let k=0;k<4;k++){const [s0,t0]=cs[k],[s1,t1]=cs[(k+1)%4],A=q(a,s0,t0),B=q(a,s1,t1),C2=q(b,s1,t1),D2=q(b,s0,t0);
      P.push(...A,...B,...C2,...A,...C2,...D2);const df=dashFrom==null||dashFrom<0?-1:dashFrom,da=df,db=df<0?-1:df+L;D.push(da,da,db,da,db,db);}
    return L;}
  // ---------- the glass box (rebuilt only when the shape changes) ----------
  let walls=[],wallKey='',rims=null,rimCol=null,backPane=null,frontPane=null,horizon=null;
  const HUE=new T.Color();
  function hueCol(t,s,l,out){return (out||new T.Color()).setHSL(auroraHue(t)/360,s,l);}
  // PASTEL GLASS. Every wall and face is tinted its own note's pastel, and its edges are a deeper shade of the
  // same colour, so the shape reads at a glance and every side is told apart. (Near-white pearl glass was tried
  // and dropped: you could barely tell what the shape was.) A STRIKE floods it with the full note colour,
  // which then fades back to its pastel.
  const NOTEC=new T.Color();
  function glassCol(t,lit,out,restS,restL){hueCol(t,restS==null?0.6:restS,restL==null?0.8:restL,out);hueCol(t,0.88,0.62,NOTEC);return out.lerp(NOTEC,Math.min(1,lit));}
  function baseOutline(){   // the shape un-turned (rot 0), box-local, as [x,y] points per wall
    const c=Math.cos(-rot),s=Math.sin(-rot),un=(x,y)=>{const dx=x-CX,dy=y-CY;return [dx*c-dy*s,dx*s+dy*c];};
    return edges.map(e=>(e.pts||[[e.ax,e.ay],[e.bx,e.by]]).map(([x,y])=>un(x,y)));}
  function disposeObj(o){if(!o)return;spin.remove(o);box.remove(o);if(o.geometry)o.geometry.dispose();}
  function buildBox(){
    for(const w of walls){disposeObj(w);w.material.dispose();}walls=[];
    disposeObj(rims);disposeObj(backPane);disposeObj(frontPane);disposeObj(horizon);horizon=null;
    const per=baseOutline(),outline=[];per.forEach(p=>{for(let k=0;k<p.length-1;k++)outline.push(p[k]);});
    // side walls: one strip per wall, front to back
    per.forEach((pts,i)=>{const pos=[];for(let k=0;k<pts.length-1;k++){const [ax,ay]=pts[k],[bx,by]=pts[k+1];
        pos.push(ax,ay,zl(0), bx,by,zl(0), bx,by,zl(1),  ax,ay,zl(0), bx,by,zl(1), ax,ay,zl(1));}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.computeVertexNormals();
      const m=new T.Mesh(g,(CRAY?crayGlassFor:glassFor)(hueCol(edges[i].hue,0.75,0.66)));m.renderOrder=2;spin.add(m);walls.push(m);});
    // back and front panes: a fan from the middle (every shape the tank uses is star-shaped about it)
    const fan=(z)=>{const pos=[];for(let k=0;k<outline.length;k++){const a=outline[k],b=outline[(k+1)%outline.length];pos.push(0,0,z,a[0],a[1],z,b[0],b[1],z);}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.computeVertexNormals();return g;};
    backPane=new T.Mesh(fan(zl(1)),CRAY?crayPane:paneMat);backPane.renderOrder=0;spin.add(backPane);
    frontPane=new T.Mesh(fan(zl(0)),CRAY?crayFront:frontMat);frontPane.renderOrder=6;spin.add(frontPane);
    // rims: glowing beams along the front and back outlines and down every real corner
    const P=[],Cc=[],D=[],beam=(a,b,w,dashFrom)=>{   // a,b: [x,y,z]; a square beam w thick
      const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],L=Math.hypot(dx,dy,dz)||1,d=[dx/L,dy/L,dz/L];
      let u=Math.abs(d[2])>0.9?[1,0,0]:[-d[1],d[0],0];const ul=Math.hypot(...u);u=u.map(v=>v/ul*w/2);
      const v=[d[1]*u[2]-d[2]*u[1],d[2]*u[0]-d[0]*u[2],d[0]*u[1]-d[1]*u[0]].map(x=>x/(w/2)*w/2);
      const q=(p,s,t)=>[p[0]+u[0]*s+v[0]*t,p[1]+u[1]*s+v[1]*t,p[2]+u[2]*s+v[2]*t];
      const cs=[[1,1],[-1,1],[-1,-1],[1,-1]];
      for(let k=0;k<4;k++){const [s0,t0]=cs[k],[s1,t1]=cs[(k+1)%4];
        const A=q(a,s0,t0),B=q(a,s1,t1),C2=q(b,s1,t1),D2=q(b,s0,t0);
        P.push(...A,...B,...C2,...A,...C2,...D2);
        const da=dashFrom<0?-1:dashFrom,db=dashFrom<0?-1:dashFrom+L;D.push(da,da,db,da,db,db);}
      return L;};
    const owner=[];
    per.forEach((pts,i)=>{const portal=!!edges[i].twin;let run=0;
      for(let k=0;k<pts.length-1;k++){const a=pts[k],b=pts[k+1];
        const n0=P.length,cw=crayW();run+=beam([a[0],a[1],zl(0)],[b[0],b[1],zl(0)],5.5*cw,portal?run:-1);
        beam([a[0],a[1],zl(1)],[b[0],b[1],zl(1)],3*cw,-1);
        if(k===0)beam([a[0],a[1],zl(0)],[a[0],a[1],zl(1)],2.2*cw,-1);
        for(let j=n0;j<P.length;j+=3)owner.push(i);}});   // one owner per VERTEX
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));
    rimCol=new Float32Array(P.length);g.setAttribute('color',new T.BufferAttribute(rimCol,3));
    g.setAttribute('dash',new T.Float32BufferAttribute(D,1));g.userData.owner=owner;
    rims=new T.Mesh(g,CRAY?crayRim:rimMat);rims.renderOrder=7;spin.add(rims);
    if(edges._space==='curved')buildHorizon();}
  // curved space: the rim of the disk at the front and back, and the mirrored echoes beyond the walls
  function buildHorizon(){horizon=new T.Group();
    const ring=(z,rr)=>{const pos=[];for(let k=0;k<=96;k++){const a=k/96*Math.PI*2;pos.push(Math.cos(a)*rr,Math.sin(a)*rr,z);}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));return g;};
    horizon.add(new T.Line(ring(zl(0),HYP.RD),new T.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0.85})));
    horizon.add(new T.Line(ring(zl(1),HYP.RD),new T.LineBasicMaterial({color:0xd8c6ff,transparent:true,opacity:0.5})));
    const ech=window.__echoPolys?window.__echoPolys():null;
    if(ech){const segs=(list,z)=>{const pos=[];for(const pts of list)for(let k=0;k<pts.length;k++){const a=pts[k],b=pts[(k+1)%pts.length];
          pos.push(a[0]-CX,a[1]-CY,z,b[0]-CX,b[1]-CY,z);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));return g;};
      for(const L of ech.lvl1)horizon.add(new T.LineSegments(segs([L.pts],zl(0)),new T.LineBasicMaterial({color:hueCol(L.hue,0.2,0.8),transparent:true,opacity:0.45})));
      if(ech.lvl2.length)horizon.add(new T.LineSegments(segs(ech.lvl2,zl(0)),new T.LineBasicMaterial({color:0xb79cf0,transparent:true,opacity:0.3})));}
    spin.add(horizon);}

  // ---------- a REAL SOLID: every face a pane of glass in its note's colour ----------
  // Drawn twice, inside faces first and outside faces last: for a convex shape that is the right order
  // for see-through glass from every angle, with the balls and the goo in between.
  const solidMat=(side)=>fresnel(new T.MeshPhysicalMaterial({vertexColors:true,metalness:0,roughness:0.07,clearcoat:1,clearcoatRoughness:0.05,
    iridescence:0.6,iridescenceIOR:1.3,envMapIntensity:1.7,transparent:true,side,depthWrite:false,emissive:0xffffff,emissiveIntensity:0.0}),side===T.FrontSide?0.5:0.25,0.3);
  const solidInGlass=solidMat(T.BackSide),solidOutGlass=solidMat(T.FrontSide),craySolidIn=craySolid(T.BackSide),craySolidOut=craySolid(T.FrontSide);
  const solidIn=new T.Mesh(new T.BufferGeometry(),solidInGlass),solidOut=new T.Mesh(solidIn.geometry,solidOutGlass);
  solidIn.renderOrder=1;solidOut.renderOrder=6;solidIn.frustumCulled=solidOut.frustumCulled=false;spin.add(solidIn);spin.add(solidOut);
  let skyBall=null,solidRims=null,solidKey='',solidFaceOf=null,solidCol=null,solidRimCol=null,solidRimOwner=null;
  // curved space: a face is flat in Klein coordinates, so it is cut into small flat triangles there and
  // every corner is carried to the Poincare ball: the faces come out as the true curved surfaces
  function buildSolid(){
    const F=solidFaces(SOLID.planes),pos=[],own=[],curved=edges._space==='curved',K=HKR(),RB=HYP.RD;
    const M=curved?(p)=>{const u=kleinToBall([p[0]/K,p[1]/K,p[2]/K]);return [u[0]*RB,u[1]*RB,u[2]*RB];}:(p)=>p;
    const SUB=curved?5:1,lerp3=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
    F.forEach((f,i)=>{if(f.length<3)return;const c=[0,0,0];for(const v of f){c[0]+=v.p[0];c[1]+=v.p[1];c[2]+=v.p[2];}c[0]/=f.length;c[1]/=f.length;c[2]/=f.length;
      for(let k=0;k<f.length;k++){const a=f[k].p,b=f[(k+1)%f.length].p;
        // the fan triangle (c, a, b), split into SUB x SUB little triangles
        const pt=(i1,j1)=>M(lerp3(lerp3(c,a,i1/SUB),lerp3(c,b,i1/SUB),i1?j1/i1:0));
        for(let r=0;r<SUB;r++)for(let q=0;q<=r;q++){const A=pt(r,q),B=pt(r+1,q),C=pt(r+1,q+1);pos.push(...A,...B,...C);own.push(i,i,i);
          if(q<r){const A2=pt(r,q),B2=pt(r+1,q+1),C2=pt(r,q+1);pos.push(...A2,...B2,...C2);own.push(i,i,i);}}}});
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.computeVertexNormals();
    solidCol=new Float32Array(own.length*4);g.setAttribute('color',new T.BufferAttribute(solidCol,4));solidFaceOf=own;
    solidIn.geometry.dispose();solidIn.geometry=g;solidOut.geometry=g;
    // rims: each edge once, as a glowing beam
    if(solidRims){spin.remove(solidRims);solidRims.geometry.dispose();}
    const P=[],D=[],ow=[],seen=new Set(),key=(a,b)=>{const r=v=>v.map(x=>Math.round(x)).join(',');const A=r(a),B=r(b);return A<B?A+'|'+B:B+'|'+A;};
    F.forEach((f,i)=>{for(let k=0;k<f.length;k++){const a=f[k].p,b=f[(k+1)%f.length].p,kk=key(a,b);if(seen.has(kk))continue;seen.add(kk);
      const n0=P.length,ES=curved?8:1;for(let e=0;e<ES;e++)beamTo(P,D,M(lerp3(a,b,e/ES)),M(lerp3(a,b,(e+1)/ES)),4.4*crayW());for(let j=n0;j<P.length;j+=3)ow.push(i);}});
    // the edge of hyperbolic space itself: a faint glass sphere at infinity
    if(curved&&!skyBall){skyBall=new T.Mesh(new T.SphereGeometry(RB,48,32),fresnel(new T.MeshPhysicalMaterial({color:0xe6dcff,roughness:0.1,clearcoat:1,
      iridescence:0.5,transparent:true,opacity:0.03,side:T.BackSide,depthWrite:false,envMapIntensity:1.2}),0.35));skyBall.renderOrder=0;box.add(skyBall);}
    if(skyBall)skyBall.visible=curved;
    const rg=new T.BufferGeometry();rg.setAttribute('position',new T.Float32BufferAttribute(P,3));
    solidRimCol=new Float32Array(P.length);rg.setAttribute('color',new T.BufferAttribute(solidRimCol,3));rg.setAttribute('dash',new T.Float32BufferAttribute(D,1));
    solidRimOwner=ow;solidRims=new T.Mesh(rg,CRAY?crayRim:rimMat);solidRims.renderOrder=7;solidRims.frustumCulled=false;spin.add(solidRims);}
  function updateSolid(ph,now){const td=totalDegrees()||1,col=solidCol,own=solidFaceOf;let last=-1,r=0,g=0,b=0,a=0;
    for(let t=0;t<own.length;t++){const i=own[t];if(i!==last){last=i;const fl=Math.min(1,(SOLID.flash[i]||0)*1.4),
        tw=edges._space==='portal'&&SOLID.twin&&SOLID.twin[i]>=0;
        glassCol((SOLID.deg[i]||0)/td+ph,fl,HUE,0.6,0.8);r=HUE.r;g=HUE.g;b=HUE.b;
        a=(tw?0.1+0.06*(0.5+0.5*Math.sin(now*0.004+i)):0.2)+fl*0.35;}
      const j=t*4;col[j]=r;col[j+1]=g;col[j+2]=b;col[j+3]=a;}
    solidIn.geometry.attributes.color.needsUpdate=true;
    last=-1;const rc=solidRimCol,ro=solidRimOwner;
    for(let t=0;t<ro.length;t++){const i=ro[t];if(i!==last){last=i;const fl=Math.min(1,(SOLID.flash[i]||0)*1.4+formGlow*0.6);glassCol((SOLID.deg[i]||0)/td+ph,fl,HUE,0.68,0.66);}
      const j=t*3;rc[j]=HUE.r;rc[j+1]=HUE.g;rc[j+2]=HUE.b;}
    solidRims.geometry.attributes.color.needsUpdate=true;}

  // ---------- balls, trails, spray, shadows ----------
  const MAXB=40;
  const ballMesh=new T.InstancedMesh(new T.SphereGeometry(1,32,20),ballMat,MAXB);ballMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  ballMesh.count=0;ballMesh.renderOrder=3;ballMesh.frustumCulled=false;box.add(ballMesh);
  for(let i=0;i<MAXB;i++)ballMesh.setColorAt(i,HUE.set(0xffffff));
  function pointsSystem(mat,max,order){const g=new T.BufferGeometry();
    const pos=new Float32Array(max*3),size=new Float32Array(max),col=new Float32Array(max*4);
    g.setAttribute('position',new T.BufferAttribute(pos,3).setUsage(T.DynamicDrawUsage));
    g.setAttribute('size',new T.BufferAttribute(size,1).setUsage(T.DynamicDrawUsage));
    g.setAttribute('col',new T.BufferAttribute(col,4).setUsage(T.DynamicDrawUsage));
    g.setDrawRange(0,0);const p=new T.Points(g,mat);p.frustumCulled=false;p.renderOrder=order;box.add(p);
    let n=0;return {pos,size,col,max,
      reset(){n=0;},add(x,y,z,s,r,gg,b,a){if(n>=max)return;const i=n++;pos[i*3]=x;pos[i*3+1]=y;pos[i*3+2]=z;size[i]=s;col[i*4]=r;col[i*4+1]=gg;col[i*4+2]=b;col[i*4+3]=a;},
      done(){g.setDrawRange(0,n);for(const k of ['position','size','col'])g.attributes[k].needsUpdate=true;},get n(){return n;}};}
  const shadows=pointsSystem(shadowMat,MAXB,1),trails=pointsSystem(trailMat,MAXB*8,4),drops=pointsSystem(dropMat,900,5);

  // ---------- the goo: a real volume (marching cubes over the goo drops, at their real depths) ----------
  // The physics holds every drop inside the shape (gooContain3D); the soft surface drawn round them is also
  // CLIPPED to the glass, so not one pixel of goo can show through a wall or a face.
  let GRES=lite?32:40,mc=null,mcEvery=lite?3:2,mcTick=0;   // rebuilt every 2nd frame (3rd when slow): it moves slowly, the eye cannot tell
  const SX=R*1.18;   // the field spans the whole tank, curved space included, the same on every axis
  function makeGoo(){if(mc){box.remove(mc);mc.geometry.dispose();}
    mc=new T.MarchingCubes(GRES,CRAY?crayGoo:gooMat,false,true,90000);mc.isolation=60;mc.renderOrder=2;mc.frustumCulled=false;
    mc.position.set(0,0,0);mc.scale.set(SX,SX,SX);box.add(mc);}
  makeGoo();
  const GC=new T.Color(),LQ=new T.Color(),LQH={h:0,s:0,l:0},cells=new Map();
  function glassList(){const glass=[];   // [nx,ny,nz,d]: inside is n.p <= d, box-local px
    if(edges._space!=='curved'){
      if(edges._solid){const c=Math.cos(rot),s=Math.sin(rot);for(const pl of SOLID.planes){const q=pl.n;glass.push([q[0]*c-q[1]*s,q[0]*s+q[1]*c,q[2],pl.d]);}}
      else{for(const e of edges){if(!e.broken)glass.push([-e.nx,-e.ny,0,-((e.ax-CX)*e.nx+(e.ay-CY)*e.ny)]);}glass.push([0,0,1,HALF],[0,0,-1,HALF]);}}
    return glass;}
  // test hook: how far the goo's skin reaches past the glass BEFORE the clip (px), and how many clip planes hold it
  function gooOut(){if(!mc||!mc.count)return null;const g=glassList(),pa=mc.positionArray;let worst=-1e9;
    for(let i=0;i<mc.count;i++){const x=pa[i*3]*fitH+fitC[0],y=pa[i*3+1]*fitH+fitC[1],z=pa[i*3+2]*fitH+fitC[2];for(const q of g)worst=Math.max(worst,q[0]*x+q[1]*y+q[2]*z-q[3]);}
    return {reach:worst,clip:(mc.material.clippingPlanes||[]).length,glass:g.length};}
  // THE FIELD FOLLOWS THE GOO. The marching-cubes grid is fitted round the goo each time (snapped to whole cells
  // so it does not shimmer as it moves), so a small blob gets a fine grid and stays smooth instead of coming
  // out as faceted beads, and a big one still fits. Lumps are binned at a couple of grid cells each.
  let fitH=SX,fitC=[0,0,0];
  function gooUpdate(){
    if(++mcTick%mcEvery)return;
    mc.reset();cells.clear();
    if(!particles.length){mc.update();return;}
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,z0=1e9,z1=-1e9,any=false;
    for(const p of particles){if(!p.pooled)continue;any=true;const x=p.x-CX,y=p.y-CY,z=zl(p.z==null?0.5:p.z);
      if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;if(z<z0)z0=z;if(z>z1)z1=z;}
    if(!any){mc.update();return;}
    const want=Math.min(SX,Math.max(70,Math.ceil((Math.max(x1-x0,y1-y0,z1-z0)/2+44)/24)*24));
    fitH=want>fitH?want:(want<fitH*0.7?want:fitH);   // grow at once, shrink only when it is well worth it
    const cell=2*fitH/GRES;fitC=[Math.round((x0+x1)/2/cell)*cell,Math.round((y0+y1)/2/cell)*cell,Math.round((z0+z1)/2/cell)*cell];
    mc.position.set(fitC[0],fitC[1],fitC[2]);mc.scale.set(fitH,fitH,fitH);
    const bin=Math.max(10,cell*2.4),MAX=lite?220:520;
    LQ.setRGB(liqRGB[0]/255,liqRGB[1]/255,liqRGB[2]/255,T.SRGBColorSpace);   // the pool colour is a CSS (sRGB) colour
    // THE POOL'S COLOUR IS AN AVERAGE OF NOTES, and an average of colours goes grey-brown. Keep its hue (the chord's)
    // and give it back a clean pastel's saturation and lightness, so the goo reads as candy, not mud.
    LQ.getHSL(LQH,T.SRGBColorSpace);LQH.s=Math.max(LQH.s,0.6);LQH.l=Math.min(0.74,Math.max(0.6,LQH.l));   // judged as the eye sees it (sRGB): a candy pastel, light but with body
    GC.setHSL(LQH.h,Math.max(0.55,LQH.s*0.95),Math.min(0.8,LQH.l+(CRAY?0.04:0)),T.SRGBColorSpace);const gTop=Math.max(GC.r,GC.g,GC.b);   // the brightness every lump is given
    for(let i=0;i<particles.length;i++){const p=particles[i];if(!p.pooled)continue;
      const z=zl(p.z==null?0.5:p.z),k=(Math.floor(p.x/bin)+256)*262144+(Math.floor(p.y/bin)+256)*512+(Math.floor(z/bin)+256);let c=cells.get(k);
      if(!c){c={x:0,y:0,z:0,n:0,hx:0,hy:0};cells.set(k,c);}
      c.x+=p.x;c.y+=p.y;c.z+=z;c.n++;const a=(p.hue||0)*Math.PI*2;c.hx+=Math.cos(a);c.hy+=Math.sin(a);}
    // how far a point is from the glass (px, positive inside): a lump near a wall is drawn smaller, so the
    // skin comes up to the glass instead of through it and the clip below rarely has anything to cut
    const glass=glassList(),F=2*fitH;
    let n=0;
    for(const c of cells.values()){if(n++>MAX)break;
      const x=c.x/c.n-CX,y=c.y/c.n-CY,z=c.z/c.n,h=((Math.atan2(c.hy,c.hx)/(Math.PI*2))+1)%1;
      let rad=Math.max(PR*1.5,bin*Math.min(0.95,0.5+0.13*Math.cbrt(c.n)));   // neighbours' fields overlap well: one smooth skin, not a heap of beads
      let room=1e9;for(const g of glass)room=Math.min(room,g[3]-(g[0]*x+g[1]*y+g[2]*z));
      rad=Math.min(rad,Math.max(bin*0.25,room/1.3));
      const lh=LQH.h+0.07*Math.sin(h*6.2832),ll=Math.min(0.8,LQH.l+(CRAY?0.04:0)+0.05*Math.cos(h*6.2832));
      GC.setHSL(((lh%1)+1)%1,Math.max(0.55,LQH.s*0.95),ll,T.SRGBColorSpace);   // one candy in the chord's colour, each lump nudged a little warmer or cooler by its own notes (blending the notes' own hues went grey)   // lava-lamp pastels: the chord's colour, swirled with the notes the goo is made of
      const rr=rad/F;
      mc.addBall(0.5+(x-fitC[0])/F,0.5+(y-fitC[1])/F,0.5+(z-fitC[2])/F,rr*rr*(mc.isolation+12),12,GC);}
    mc.update();
    // THE GOO'S TRUE COLOUR. MarchingCubes adds each lump's colour times a falloff and never divides by it, and the
    // skin sits between a coloured cell and an empty one, so every colour came out at the skin dim and greyed (and
    // overshot where lumps overlapped). Each vertex is scaled back to the brightness the lumps were given; its hue
    // and saturation are kept.
    const ca=mc.colorArray,tm=gTop;
    for(let i=0,L=mc.count*3;i<L;i+=3){const m=Math.max(ca[i],ca[i+1],ca[i+2]);if(m>1e-5){const k=tm/m;ca[i]*=k;ca[i+1]*=k;ca[i+2]*=k;}}}
  // the glass the goo is clipped to, in world space: a solid's faces, or the prism's walls and two panes.
  // Curved space has curved glass, which a flat clip cannot follow: there the physics' inset holds it.
  const clip=[];let clipN=0;
  // (a plane is {normal, constant}, all three.js reads from one; the box matrix is a pure turn plus a move, so
  // a normal turns with it and the constant follows from one point on the plane)
  const P0=new T.Vector3();
  function clipPlane(nx,ny,nz,k){let pl=clip[clipN];if(!pl){pl={normal:new T.Vector3(),constant:0};clip[clipN]=pl;}clipN++;
    P0.set(-nx*k,-ny*k,-nz*k).applyMatrix4(box.matrix);pl.normal.set(nx,ny,nz).transformDirection(box.matrix);pl.constant=-pl.normal.dot(P0);}
  function gooClip(fill,solid){clipN=0;
    if(fill&&edges._space!=='curved'){
      if(solid){const c=Math.cos(rot),s=Math.sin(rot);
        for(const pl of SOLID.planes){const n=pl.n;clipPlane(-(n[0]*c-n[1]*s),-(n[0]*s+n[1]*c),-n[2],pl.d);}}   // keep n.p <= d
      else{for(const e of edges){if(e.broken)continue;clipPlane(e.nx,e.ny,0,-((e.ax-CX)*e.nx+(e.ay-CY)*e.ny));}   // keep the inside of each wall
        clipPlane(0,0,1,HALF);clipPlane(0,0,-1,HALF);}}
    const want=clip.slice(0,clipN);mc.material.clippingPlanes=want;}

  // ---------- the shards and debris while the shape is broken open ----------
  const MAXS=40,shardMesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),shardMat,MAXS);shardMesh.count=0;shardMesh.frustumCulled=false;box.add(shardMesh);
  const tmpM=new T.Matrix4(),tmpQ=new T.Quaternion(),tmpV=new T.Vector3(),tmpS=new T.Vector3(),ZA=new T.Vector3(0,0,1);

  // ---------- sizing: the GL canvas sits exactly on the tank canvas ----------
  let lastW=0,lastH=0,dpr=1;
  function place(){const s=stage.getBoundingClientRect(),c=cv.getBoundingClientRect();
    glc.style.left=(c.left-s.left)+'px';glc.style.top=(c.top-s.top)+'px';glc.style.width=c.width+'px';glc.style.height=c.height+'px';
    const want=Math.min(window.devicePixelRatio||1,lite?1:2);
    if(Math.round(c.width)!==lastW||Math.round(c.height)!==lastH||want!==dpr){lastW=Math.round(c.width);lastH=Math.round(c.height);dpr=want;
      renderer.setPixelRatio(dpr);renderer.setSize(Math.max(1,lastW),Math.max(1,lastH),false);}
    // gl_PointSize: a point of world size s at depth d covers s*f/d device px, f = (height px / 2) / tan(fov/2)
    trailMat.uniforms.uScale.value=dropMat.uniforms.uScale.value=shadowMat.uniforms.uScale.value=(lastH*dpr/2)/Math.tan(camera.fov*Math.PI/360);}
  try{new ResizeObserver(place).observe(cv);}catch(e){}
  place();

  const SM=new T.Matrix4();
  function setBoxMatrix(){const M=_M;
    SM.set(M[0],M[1],M[2],0,  -M[3],-M[4],-M[5],0,  -M[6],-M[7],-M[8],-HALF,  0,0,0,1);box.matrix.copy(SM);box.matrixWorldNeedsUpdate=true;}

  let t0=performance.now(),cpuMs=0;
  function render(){
    const a0=performance.now(),now=a0,ph=now*0.000012;
    place();setBoxMatrix();spin.rotation.z=rot;
    CR.px.value=dpr;CR.seed.value=reduceMotion.matches?1:(Math.floor(now/125)%997)+1;   // line boil: 8 new strokes a second, still when motion is reduced
    const fill=fillState==="fill";
    const solid=!!edges._solid;
    const k=String(S.shape)+'|'+edges.length+'|'+(edges._space||'')+'|'+edges.map(e=>e.deg).join(',');
    if(!solid&&k!==wallKey){wallKey=k;buildBox();}
    if(solid){const sk=SOLID.name+'|'+SOLID.planes.length+'|'+(edges._space||'')+'|'+(SOLID.from?now:'')+'|'+SOLID.deg.join(',');if(sk!==solidKey){solidKey=sk;buildSolid();}updateSolid(ph,now);}
    solidIn.visible=solidOut.visible=solid&&fill;if(solidRims)solidRims.visible=solid&&fill;if(skyBall)skyBall.visible=solid&&fill&&edges._space==='curved';
    if(solid){wallKey='';for(const w of walls)w.visible=false;}
    // walls: colour drifts with the wheel, a strike lights the wall, a broken wall is gone or fading back
    for(let i=0;i<walls.length;i++){const e=edges[i],m=walls[i].material;if(!e)continue;
      const lit=Math.min(1,(e.flash||0)*1.4),gone=e.broken?(e.reform||0):1;
      glassCol(e.hue+ph,lit,m.color,0.6,0.8);glassCol(e.hue+ph,lit,m.emissive,0.6,0.78);
      m.emissiveIntensity=0.22+lit*0.8+(e.twin?0.12*(0.5+0.5*Math.sin(now*0.004+i)):0);
      m.opacity=(e.twin?0.12:(lite?0.32:0.24))*gone+lit*0.25;walls[i].visible=!solid&&fill&&gone>0.02;}
    if(rims&&!solid){const own=rims.geometry.userData.owner,col=rimCol;
      let last=-1;for(let t=0;t<own.length;t++){const e=edges[own[t]];if(!e)continue;
        if(own[t]!==last){last=own[t];const lit=Math.min(1,(e.flash||0)*1.4+formGlow*0.6),gone=e.broken?(e.reform||0):1;
          glassCol(e.hue+ph,lit,HUE,0.68,0.66);HUE.multiplyScalar(gone);}
        const j=t*3;col[j]=HUE.r;col[j+1]=HUE.g;col[j+2]=HUE.b;}
      rims.geometry.attributes.color.needsUpdate=true;rims.visible=fill;}
    if(rims&&solid)rims.visible=false;rimMat.uniforms.uT.value=crayRim.uniforms.uT.value=(now-t0)/1000;
    if(backPane){backPane.visible=fill&&!solid;const bm=backPane.material;bm.opacity=0.22+_pane.back*0.35;bm.emissiveIntensity=_pane.back*0.8;}
    if(frontPane){frontPane.visible=fill&&!solid;const fm=frontPane.material;fm.opacity=(CRAY?0.02:0.05)+_pane.front*0.22;if(!CRAY)fm.emissiveIntensity=_pane.front*0.5;}
    if(horizon)horizon.visible=fill&&!solid;
    // balls
    shadows.reset();trails.reset();drops.reset();
    let n=0;
    for(const b of balls){if(n>=MAXB)break;
      let bx=lerpX(b),by=lerpY(b),bz=(b.pz==null?(b.z||0):b.pz+((b.z||0)-b.pz)*_alpha);
      if(b.px!=null&&Math.hypot(b.x-b.px,b.y-b.py)>BR*2.2){bx=b.x;by=b.y;bz=b.z||0;}
      const r=BR*ballScale(bx,by,bz)*noteScale(),x=bx-CX,y=by-CY,z=zl(bz),under=fill&&gooAt(b.x,b.y,b.z)>0.3;
      tmpM.makeScale(r,r,r).setPosition(x,y,z);ballMesh.setMatrixAt(n,tmpM);
      HUE.setHSL(b.hue,under?0.7:0.86,under?0.52:0.6,T.SRGBColorSpace);ballMesh.setColorAt(n,HUE);   // balls wear their raw hue, as in 2D. In sRGB, as the 2D sprite does: set in linear light the same numbers came out washed-out pastel
      const tl=b.trail.length;for(let i=0;i<tl;i++){const t=b.trail[i],f=i/tl;
        trails.add(t[0]-CX,t[1]-CY,zl(t[2]||0),r*(0.5+1.1*f),HUE.r,HUE.g,HUE.b,f*0.32);}
      if(fill&&!solid)shadows.add(x+3,y+5,zl(0.995),r*(2.6-1.0*bz),0.42,0.3,0.62,0.02+0.12*bz*bz);   // a soft lilac shadow on the back glass: darker and smaller the closer the ball is to it
      else if(fill&&solid&&edges._space!=='curved'){   // a solid: a soft shadow straight down on whichever face is underneath
        const G=boxGravity(),c=Math.cos(rot),sn=Math.sin(rot);let best=1e9,bn=null;
        for(const pl of SOLID.planes){const n=pl.n,nx=n[0]*c-n[1]*sn,ny=n[0]*sn+n[1]*c,nd=nx*G[0]+ny*G[1]+n[2]*G[2];
          if(nd<=0.05)continue;const t=(pl.d-(nx*x+ny*y+n[2]*z))/nd;if(t>0&&t<best){best=t;bn=1;}}
        if(bn){const sx=x+G[0]*best,sy=y+G[1]*best,sz=z+G[2]*best,fade=Math.max(0,1-best/(SOLID_R*1.6));
          shadows.add(sx,sy,sz,r*(2.2+best/60),0.22,0.13,0.4,0.28*fade);}}
      n++;}
    ballMesh.count=n;ballMesh.instanceMatrix.needsUpdate=true;if(ballMesh.instanceColor)ballMesh.instanceColor.needsUpdate=true;
    // spray that has not landed yet: little droplets at their own depth
    for(const p of particles){if(p.pooled)continue;hueCol(p.hue||0,0.7,0.62,HUE);
      drops.add(p.x-CX,p.y-CY,zl(p.z==null?0.5:p.z),5.2,HUE.r,HUE.g,HUE.b,0.95);}
    shadows.done();trails.done();drops.done();
    gooClip(fill,solid);gooUpdate();mc.visible=particles.length>0;
    // broken open: the walls are loose glass slabs
    if(!fill){const segs=curSegs||[];let m=0;
      for(const s of segs){if(m>=MAXS)break;const mx=(s.ax+s.bx)/2-CX,my=(s.ay+s.by)/2-CY,L=Math.hypot(s.bx-s.ax,s.by-s.ay);
        tmpQ.setFromAxisAngle(ZA,Math.atan2(s.by-s.ay,s.bx-s.ax));tmpS.set(Math.max(1,L),6,BOXD*0.92);tmpV.set(mx,my,0);
        tmpM.compose(tmpV,tmpQ,tmpS);shardMesh.setMatrixAt(m,tmpM);shardMesh.setColorAt(m,hueCol(s.hue||0,0.7,0.7,HUE));m++;}
      shardMesh.count=m;shardMesh.instanceMatrix.needsUpdate=true;if(shardMesh.instanceColor)shardMesh.instanceColor.needsUpdate=true;}
    else shardMesh.count=0;
    cpuMs=performance.now()-a0;
    renderer.render(scene,camera);}

  function setLook(v){const c=v==='crayon';if(c===CRAY)return;CRAY=c;
    wallKey='';solidKey='';                                      // rebuild the glass in the new look on the next frame
    ballMesh.material=CRAY?crayBall:ballMat;
    solidIn.material=CRAY?craySolidIn:solidInGlass;solidOut.material=CRAY?craySolidOut:solidOutGlass;
    if(mc)mc.material=CRAY?crayGoo:gooMat;}
  function setLite(v){v=!!v;if(v===lite)return;lite=v;GRES=lite?32:40;mcEvery=lite?3:2;makeGoo();place();}
  let lost=false;
  glc.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;if(window.__glLost)window.__glLost();},false);
  function show(v){glc.style.display=v?'block':'none';}
  // test hook: the colours the goo is actually drawn in (its vertex colours): how far apart the hues spread
  // (circular, in turns), and the mean saturation and lightness
  function gooColors(){if(!mc||!mc.count)return null;const ca=mc.colorArray,h={h:0,s:0,l:0},C=new T.Color();let sx=0,sy=0,ss=0,sl=0,n=0;
    for(let i=0;i<mc.count;i+=7){C.setRGB(ca[i*3],ca[i*3+1],ca[i*3+2]);C.getHSL(h,T.SRGBColorSpace);sx+=Math.cos(h.h*6.2832)*h.s;sy+=Math.sin(h.h*6.2832)*h.s;ss+=h.s;sl+=h.l;n++;}
    return {spread:1-Math.hypot(sx,sy)/Math.max(1e-6,ss),sat:ss/n,light:sl/n,n};}
  return {render,setLite,setLook,show,canvas:glc,gooOut,gooColors,get noteScale(){return noteScale();},get look(){return CRAY?'crayon':'glass';},get lost(){return lost;},
    stats(){const i=renderer.info;return {calls:i.render.calls,tris:i.render.triangles,cpuMs,goo:mc?mc.count:0,gres:GRES,lite};}};
}

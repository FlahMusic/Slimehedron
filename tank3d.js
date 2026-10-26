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
  try{renderer=new T.WebGLRenderer({canvas:glc,antialias:true,alpha:true,stencil:true,powerPreference:'high-performance'});/* stencil: a wormhole's throat is only seen through its mouth */}
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
    per.forEach((pts,i)=>{const portal=false;let run=0;
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
    // (no rings at the rim any more: they drew a circle round every curved shape. The echoes stay.)
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
    // (the faint glass sphere at infinity drew a big circle round every curved solid; Flah: take it out)
    if(skyBall)skyBall.visible=curved;
    const rg=new T.BufferGeometry();rg.setAttribute('position',new T.Float32BufferAttribute(P,3));
    solidRimCol=new Float32Array(P.length);rg.setAttribute('color',new T.BufferAttribute(solidRimCol,3));rg.setAttribute('dash',new T.Float32BufferAttribute(D,1));
    solidRimOwner=ow;solidRims=new T.Mesh(rg,CRAY?crayRim:rimMat);solidRims.renderOrder=7;solidRims.frustumCulled=false;spin.add(solidRims);}
  function updateSolid(ph,now){const td=totalDegrees()||1,col=solidCol,own=solidFaceOf;let last=-1,r=0,g=0,b=0,a=0;
    for(let t=0;t<own.length;t++){const i=own[t];if(i!==last){last=i;const fl=Math.min(1,(SOLID.flash[i]||0)*1.4);
        glassCol((SOLID.deg[i]||0)/td+ph,fl,HUE,0.6,0.8);r=HUE.r;g=HUE.g;b=HUE.b;
        a=0.2+fl*0.35;}
      const j=t*4;col[j]=r;col[j+1]=g;col[j+2]=b;col[j+3]=a;}
    solidIn.geometry.attributes.color.needsUpdate=true;
    last=-1;const rc=solidRimCol,ro=solidRimOwner;
    for(let t=0;t<ro.length;t++){const i=ro[t];if(i!==last){last=i;const fl=Math.min(1,(SOLID.flash[i]||0)*1.4+formGlow*0.6);glassCol((SOLID.deg[i]||0)/td+ph,fl,HUE,0.68,0.66);}
      const j=t*3;rc[j]=HUE.r;rc[j+1]=HUE.g;rc[j+2]=HUE.b;}
    solidRims.geometry.attributes.color.needsUpdate=true;}

  // ---------- balls, trails, spray, shadows ----------
  const MAXB=40;
  // A NOTE SQUASHES WHEN IT HITS. Read straight from the motion, so every kind of wall (a prism's, a solid's face,
  // the front and back glass, a curved wall) does it and a portal (no change of direction) does not: when a ball's
  // heading turns sharply between two frames it bounced, and the bounce's normal is the change in its velocity.
  // It flattens along that normal and swells across it for a tenth of a second, then springs back.
  const SQ=new WeakMap(),SQT=120;let sqMax=0;
  function noteMatrix(b,x,y,z,r,now){let st=SQ.get(b);const vx=b.vx||0,vy=b.vy||0,vz=(b.vz||0)*BOXD;
    if(!st){st={vx,vy,vz,t:-1e9,n:[0,0,1]};SQ.set(b,st);}
    const pv=Math.hypot(st.vx,st.vy,st.vz),cv=Math.hypot(vx,vy,vz);
    if(pv>0.2&&cv>0.2&&(vx*st.vx+vy*st.vy+vz*st.vz)/(pv*cv)<0.8){const dx=vx/cv-st.vx/pv,dy=vy/cv-st.vy/pv,dz=vz/cv-st.vz/pv,dl=Math.hypot(dx,dy,dz)||1;
      st.n=[dx/dl,dy/dl,dz/dl];st.t=now;}
    st.vx=vx;st.vy=vy;st.vz=vz;
    const a=now-st.t;if(a>=SQT||reduceMotion.matches){tmpM.makeScale(r,r,r).setPosition(x,y,z);return;}
    const k=0.34*(1-a/SQT)*(1-a/SQT),n=st.n,sn=r*(1-k),sp=r*(1+k*0.5);sqMax=Math.max(sqMax,k);
    const t0=Math.abs(n[2])<0.9?[0,0,1]:[1,0,0];let u=[n[1]*t0[2]-n[2]*t0[1],n[2]*t0[0]-n[0]*t0[2],n[0]*t0[1]-n[1]*t0[0]];const ul=Math.hypot(...u);u=u.map(q=>q/ul);
    const w=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]];
    tmpM.set(u[0]*sp,w[0]*sp,n[0]*sn,x, u[1]*sp,w[1]*sp,n[1]*sn,y, u[2]*sp,w[2]*sp,n[2]*sn,z, 0,0,0,1);}
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

  // ---------- THE WORMHOLES (portal space; the physics is PORTAL SPACE in index.html) ----------
  // Each hole is a flat disc lying on its wall, drawn entirely by its own shader: a whirlpool whose arms wind
  // into the middle, rings that keep rushing inward (that is what makes it read as a tunnel and not a sticker),
  // a bright event-horizon rim, a soft glow round it, and -- right at the bottom -- the OTHER hole's colour:
  // you can see through to where it comes out. When a ball goes in, the hole spins up and glows; when the far
  // hole spits one out it swells and throws a ring of light. A few motes keep spiralling into each hole.
  // The crayon look draws the same thing in flat crayon bands with hatching, boiling with the rest.
  const WK=1.75;   // the disc mesh is this many times the hole's radius: the rim, its glow and the spit ring live outside it
  const wormMat=(rimHex,deepHex)=>new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,
    uniforms:{uT:{value:0},uOpen:{value:0},uSuck:{value:0},uSpit:{value:0},uPre:{value:0},uCray:{value:0},uSeed:CR.seed,uPx:CR.px,
      uRim:{value:new T.Color(rimHex)},uDeep:{value:new T.Color(deepHex)},uFar:{value:new T.Color(0xffffff)}},
    vertexShader:`varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:CR_GLSL+`uniform float uT,uOpen,uSuck,uSpit,uPre,uCray;uniform vec3 uRim,uDeep,uFar;varying vec2 vP;
      void main(){const float K=${WK.toFixed(2)};vec2 p=vP*K;float r=length(p);if(r>K)discard;
        float a=atan(p.y,p.x),rr=r/(1.0+0.24*uSpit+0.2*uPre);   // swells as it is about to spit, and as it spits
        float tun=log(max(rr,0.012));                                   // tunnel depth: equal steps here look like equal steps down the hole
        float sw=a*3.0+tun*5.2-uT*(2.3+4.0*uSuck);                      // three arms winding in
        float arms=0.5+0.5*sin(sw),rings=0.5+0.5*sin(tun*10.0+uT*(5.5+8.0*uSuck));
        float hole=1.0-smoothstep(0.95,1.02,rr);
        vec3 deep=mix(uDeep,uFar,smoothstep(0.55,0.04,rr)*0.9);          // the far side, glimpsed at the bottom
        vec3 col=mix(uRim,deep,smoothstep(0.98,0.28,rr));
        col=mix(col,col*0.62+uRim*0.5,arms*0.6*smoothstep(1.0,0.12,rr));
        col*=0.78+0.22*rings;
        col*=1.0-0.32*exp(-pow((rr-0.84)/0.11,2.0));                     // the lip's shadow: the inside drops away under it
        float rim=exp(-pow((rr-1.0)/0.065,2.0));
        col=mix(col,uRim*1.12+0.14,rim*0.85);
        float halo=step(1.0,rr)*(1.0-smoothstep(1.0,K,rr));
        float w=uSpit>0.01?exp(-pow((rr-(1.0+(1.0-uSpit)*0.62))/0.075,2.0))*uSpit:0.0;   // the ring a spit throws
        col=mix(col,uRim*1.15+0.22,w);
        float al=hole*mix(0.42,0.9,smoothstep(0.55,0.97,rr))+rim*0.9+halo*halo*0.3*(1.0+1.6*uSuck+uSpit)+w*0.9;   // see-through in the middle: the throat is behind it
        if(uCray>0.5){vec2 q=gl_FragCoord.xy/uPx;float g=crGrain(q);
          col=floor(col*4.0+g*0.55)/4.0+0.04;                              // pressed in flat crayon bands
          float h=max(crHatch(q,0.785,6.5)*arms,crHatch(q,-0.785,8.0)*smoothstep(0.7,0.2,rr))*hole;
          col=mix(col,pow(col,vec3(1.8))*0.85,h*0.7);
          float edge=rr+(crN(vec2(a*2.6,uSeed*3.1))-0.5)*0.07;           // a wobbly hand-drawn lip
          al=(1.0-smoothstep(0.96,1.0,edge))*mix(0.78,1.08,g)+exp(-pow((edge-1.0)/0.05,2.0))*0.95+w*0.8+halo*0.18;
          if(g<0.16&&rr>0.98)discard;}
        gl_FragColor=vec4(col,clamp(al,0.0,1.0)*uOpen);
        #include <colorspace_fragment>
      }`});
  const wormMeshes=[wormMat(0xff9ccf,0x7a45c8),wormMat(0x86e8d6,0x2f74c4)].map(m=>{const me=new T.Mesh(new T.PlaneGeometry(2,2),m);
    me.matrixAutoUpdate=false;me.renderOrder=5;me.frustumCulled=false;me.visible=false;box.add(me);return me;});
  wormMeshes[0].material.uniforms.uFar.value.copy(wormMeshes[1].material.uniforms.uRim.value);
  wormMeshes[1].material.uniforms.uFar.value.copy(wormMeshes[0].material.uniforms.uRim.value);
  // THE THROAT: a real funnel behind each mouth, narrowing as it goes away from the tank, so you look DOWN a tunnel
  // that has depth and parallax from every angle (a flat disc alone read as a sticker on the wall). Rings flow down
  // it, the arms wind round it, and at the bottom it glows in the other hole's colour. It is cut by a STENCIL to
  // the mouth: you only ever see it through the hole, never sticking out of the tank (drawn plainly it looked like
  // a horn bolted onto the glass).
  const throatGeo=(()=>{const A=48,L=18,pos=[],uv=[],idx=[];
    for(let j=0;j<=L;j++){const v=j/L,r=1-0.84*Math.pow(v,0.62),d=-2.6*v;
      for(let i=0;i<=A;i++){const u=i/A,a=u*Math.PI*2;pos.push(Math.cos(a)*r,Math.sin(a)*r,d);uv.push(u,v);}}
    for(let j=0;j<L;j++)for(let i=0;i<A;i++){const a=j*(A+1)+i,b=a+A+1;idx.push(a,b,a+1,a+1,b,b+1);}
    const cap=pos.length/3;pos.push(0,0,-2.6);uv.push(0.5,1);
    for(let i=0;i<A;i++){idx.push(cap,L*(A+1)+i,L*(A+1)+i+1);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);return g;})();
  const throatMat=(src)=>new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:src.uniforms,
    vertexShader:`varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:CR_GLSL+`uniform float uT,uOpen,uSuck,uSpit,uCray;uniform vec3 uRim,uDeep,uFar;varying vec2 vU;
      void main(){float u=vU.x,v=vU.y;
        float arms=0.5+0.5*sin(u*18.8496+v*7.5-uT*(2.3+4.0*uSuck)),rings=0.5+0.5*sin(v*17.0-uT*(5.5+8.0*uSuck));   // rings run DOWN the throat
        vec3 col=mix(uRim,uDeep,smoothstep(0.0,0.55,v));col=mix(col,uFar*1.1+0.08,smoothstep(0.6,1.0,v));
        col=mix(col,col*0.6+uRim*0.5,arms*0.5*(1.0-v));col*=0.72+0.28*rings;
        float al=(0.5+0.35*arms)*(1.0-0.2*v)+smoothstep(0.92,1.0,v)*0.4;
        if(uCray>0.5){vec2 q=gl_FragCoord.xy/uPx;float g=crGrain(q);col=floor(col*4.0+g*0.55)/4.0+0.04;
          col=mix(col,pow(col,vec3(1.8))*0.85,crHatch(q,0.785,6.5)*arms*0.6);al*=mix(0.7,1.1,g);}
        gl_FragColor=vec4(col,clamp(al,0.0,1.0)*uOpen);
        #include <colorspace_fragment>
      }`});
  // stencil values: 519 ALWAYS, 514 EQUAL, 7681 REPLACE, 7680 KEEP (three.js's constants, as numbers: the bundle does not export them)
  const throats=wormMeshes.map((w,i)=>{const m=throatMat(w.material);m.stencilWrite=true;m.stencilRef=i+1;m.stencilFunc=514;m.stencilFail=m.stencilZFail=m.stencilZPass=7680;
    const me=new T.Mesh(throatGeo,m);me.matrixAutoUpdate=false;me.renderOrder=4.5;me.frustumCulled=false;me.visible=false;box.add(me);return me;});
  const mouthMask=wormMeshes.map((w,i)=>{const m=new T.MeshBasicMaterial({colorWrite:false,depthWrite:false,side:T.DoubleSide});
    m.stencilWrite=true;m.stencilRef=i+1;m.stencilFunc=519;m.stencilZPass=7681;m.stencilFail=m.stencilZFail=7680;
    const me=new T.Mesh(new T.CircleGeometry(0.97,64),m);me.matrixAutoUpdate=false;me.renderOrder=4.4;me.frustumCulled=false;me.visible=false;box.add(me);return me;});
  // a hole on a wall you see nearly edge-on is only a sliver, so each one also has a soft GLOW that faces you whatever
  // the angle, just inside the glass, and its motes swirl in a little cone standing out of the hole into the tank
  const wormGlowMat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uScale:{value:1}},
    vertexShader:ptVert,fragmentShader:`varying vec4 vC;void main(){vec2 p=gl_PointCoord*2.0-1.0;float r=dot(p,p);if(r>1.0)discard;
      gl_FragColor=vec4(vC.rgb,vC.a*pow(1.0-r,1.6));
      #include <colorspace_fragment>
      }`});
  const wormGlow=pointsSystem(wormGlowMat,2,5);
  const motes=pointsSystem(dropMat,64,5),WMC=[new T.Color(0xffc4e2),new T.Color(0xb6f4ea)],WGC=[new T.Color(0xff86c4),new T.Color(0x5fd9c6)];
  const WB=new T.Matrix4(),WX=new T.Vector3(),WY=new T.Vector3(),WZ=new T.Vector3();
  function wormBasis(n,t1,c,sc){WZ.set(n[0],n[1],n[2]);WX.set(t1[0],t1[1],t1[2]);WY.crossVectors(WZ,WX);
    WB.makeBasis(WX.multiplyScalar(sc),WY.multiplyScalar(sc),WZ.multiplyScalar(sc));WB.setPosition(c[0],c[1],c[2]);return WB;}
  const camL=new T.Vector3(),invBox=new T.Matrix4();
  function drawWorms(now,fill){const W=window.__worm;motes.reset();wormGlow.reset();
    invBox.copy(box.matrix).invert();camL.set(0,0,CAM).applyMatrix4(invBox);   // the camera, in the box's own frame
    const on=!!W&&fill&&W.open>0.01&&edges._space==='portal';
    const da=-(typeof _rotV==='number'?_rotV:0)*(1-(typeof _alpha==='number'?_alpha:1)),dc=Math.cos(da),ds=Math.sin(da),rz=v=>[v[0]*dc-v[1]*ds,v[0]*ds+v[1]*dc,v[2]];   // turned with the glass, between ticks
    for(let i=0;i<2;i++){const me=wormMeshes[i],P0=on?W.P[i]:null;
      const P=P0?Object.assign({},P0,(()=>{const q=rz([P0.x,P0.y,P0.z]);return {x:q[0],y:q[1],z:q[2],n:rz(P0.n),t1:rz(P0.t1)};})()):null;
      if(!P||P.rad<1.5){me.visible=false;throats[i].visible=false;mouthMask[i].visible=false;continue;}
      const z=P.z,c=[P.x+P.n[0]*1.2,P.y+P.n[1]*1.2,z+P.n[2]*1.2];
      // the throat always runs AWAY from you: out through the wall when you look at the hole from inside the tank,
      // into the tank when you look at it from outside (a solid's near face). Either way you look down into it,
      // and a hole on a near face is drawn over that face's glass so the glass does not grey it out.
      const facing=(camL.x-P.x)*P.n[0]+(camL.y-P.y)*P.n[1]+(camL.z-z)*P.n[2]<0,nn=facing?[-P.n[0],-P.n[1],-P.n[2]]:P.n;
      const th=throats[i],mk=mouthMask[i],sc=P.rad*(1+0.2*(P.spit||0));th.matrix.copy(wormBasis(nn,P.t1,[P.x,P.y,z],sc));th.matrixWorldNeedsUpdate=true;th.visible=true;
      th.renderOrder=facing?6.6:4.5;mk.renderOrder=facing?6.5:4.4;me.renderOrder=facing?6.7:5;
      mk.matrix.copy(wormBasis(P.n,P.t1,[P.x+P.n[0]*0.6,P.y+P.n[1]*0.6,z+P.n[2]*0.6],sc));mk.matrixWorldNeedsUpdate=true;mk.visible=true;
      me.matrix.copy(wormBasis(P.n,P.t1,c,P.rad*WK));me.matrixWorldNeedsUpdate=true;me.visible=true;
      const u=me.material.uniforms;u.uT.value=reduceMotion.matches?0:now/1000;u.uOpen.value=Math.min(1,W.open*1.2);
      u.uSuck.value=Math.max(P.suck||0,(P.pre||0)*0.6);u.uSpit.value=P.spit||0;u.uPre.value=P.pre||0;u.uCray.value=CRAY?1:0;
      const vx=camL.x-P.x,vy=camL.y-P.y,vz=camL.z-z,vl=Math.hypot(vx,vy,vz)||1,edgeOn=1-Math.abs((vx*P.n[0]+vy*P.n[1]+vz*P.n[2])/vl);   // 1 = seen side-on
      const gl=0.4+0.3*edgeOn+0.35*Math.max(P.suck||0,P.spit||0,P.pre||0);   // the more side-on the hole, the more its glow has to say where it is
      wormGlow.add(P.x+P.n[0]*P.rad*0.3,P.y+P.n[1]*P.rad*0.3,z+P.n[2]*P.rad*0.3,P.rad*(2.4+0.8*edgeOn)*(1+0.25*(P.spit||0)),WGC[i].r,WGC[i].g,WGC[i].b,Math.min(0.85,gl)*Math.min(1,W.open*1.2));
      if(!reduceMotion.matches&&!lite)for(let k=0;k<14;k++){   // motes spiralling in
        const pr=(now/1000*0.5+k*0.618)%1,ang=k*2.3998+pr*3.2+now/1000*0.9,rr=P.rad*(1.55-1.35*pr),cs=Math.cos(ang),sn=Math.sin(ang),hh=P.rad*0.7*(1-pr)*(1-pr);
        motes.add(c[0]+(P.t1[0]*cs+WY.x/(P.rad*WK)*sn)*rr+P.n[0]*hh,c[1]+(P.t1[1]*cs+WY.y/(P.rad*WK)*sn)*rr+P.n[1]*hh,c[2]+(P.t1[2]*cs+WY.z/(P.rad*WK)*sn)*rr+P.n[2]*hh,
          3.6*(1-pr*0.6),WMC[i].r,WMC[i].g,WMC[i].b,Math.sin(pr*Math.PI)*0.85);}}
    motes.done();wormGlow.done();}

  // ---------- the goo: a real volume (marching cubes over the goo drops, at their real depths) ----------
  // The physics holds every drop inside the shape (gooContain3D); the soft surface drawn round them is also
  // CLIPPED to the glass, so not one pixel of goo can show through a wall or a face.
  // THE GOO IS REBUILT EVERY FRAME, FROM LUMPS THAT MOVE SMOOTHLY. It used to be rebuilt every 2nd frame (3rd when
  // slow) from drops binned into grid cells: a drop crossing a cell line moved a whole lump at once, the fitted
  // grid snapped by a cell, the drops were drawn where the last 60 Hz tick left them (not between ticks, like the
  // balls) -- all of which read as choppy. Now (see LUMPS below) the surface is built from a few dozen lumps that
  // follow the goo continuously, so it is cheap enough to rebuild on every frame.
  let GRES=lite?32:40,mc=null,mcEvery=lite?2:1,mcTick=0,gooMs=0,gooAvg=0;
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
  // THE LUMPS. A few dozen of them share the goo out between them (each drop belongs to the lump nearest it; a lump
  // sits at the middle of its drops and is as big as their spread) -- k-means, one step per frame, carried from
  // frame to frame. Each lump EASES toward where its drops are (time-based, so 60, 90 or 120 Hz look the same), so
  // the surface flows instead of stepping. A lump with no drops shrinks to nothing; a new one grows from nothing at
  // a drop. Nothing ever appears or vanishes in one frame. Drops are read BETWEEN physics ticks (_alpha).
  const LUMPS=[];let lastGoo=0;
  let fitH=SX,fitC=[0,0,0];
  function gooPos(p,o){const a=(typeof _alpha==='number')?_alpha:1,z=p.z==null?0.5:p.z;
    if(p.ox==null){o[0]=p.x-CX;o[1]=p.y-CY;o[2]=zl(z);return o;}
    o[0]=p.ox+(p.x-p.ox)*a-CX;o[1]=p.oy+(p.y-p.oy)*a-CY;o[2]=zl(p.oz+(z-p.oz)*a);return o;}
  const _q=[0,0,0],_alive=[],_live=[];
  // ONE LUMP INTO THE FIELD. Same field as MarchingCubes.addBall (strength/d^2 - sub, in grid units), written
  // straight into its arrays: addBall reaches 2.45x a lump's radius, takes a square root and a smoothstep for
  // every cell it touches and makes a new Color per call -- 6 ms a frame for 31 lumps here, the whole budget.
  // A stiffer falloff (sub 24, not 12) reaches 1.87x, and the colour weight is the field value itself (the
  // colours are rescaled to one brightness after the build anyway). Same surface where a lump stands alone.
  const LSUB=24,BB=[0,0,0,0,0,0];   // BB: the box of cells the lumps reach, so only those get polygonized (mc.bounds)
  function addLump(x,y,z,rr,col){const S=mc.size,S2=mc.size2,F=mc.field,P=mc.palette,b=rr*rr*(mc.isolation+LSUB),reach=S*Math.sqrt(b/LSUB);
    const cx=z*S,cy=y*S,cz=x*S;   // (z, y, x) = slowest to fastest axis, as addBall lays them out
    const z0=Math.max(1,Math.floor(cx-reach)),z1=Math.min(S-1,Math.floor(cx+reach)),y0=Math.max(1,Math.floor(cy-reach)),y1=Math.min(S-1,Math.floor(cy+reach)),
          x0=Math.max(1,Math.floor(cz-reach)),x1=Math.min(S-1,Math.floor(cz+reach)),inv=1/S,cr=col.r,cg=col.g,cb=col.b;
    if(z0<BB[0])BB[0]=z0;if(z1>BB[1])BB[1]=z1;if(y0<BB[2])BB[2]=y0;if(y1>BB[3])BB[3]=y1;if(x0<BB[4])BB[4]=x0;if(x1>BB[5])BB[5]=x1;
    for(let k=z0;k<z1;k++){const dz=k*inv-z,dz2=dz*dz,bk=S2*k;
      for(let j=y0;j<y1;j++){const dy=j*inv-y,dyz=dy*dy+dz2,bj=bk+S*j;
        for(let i=x0;i<x1;i++){const dx=i*inv-x,v=b/(1e-6+dx*dx+dyz)-LSUB;
          if(v>0){const q=bj+i;F[q]+=v;const c=q*3;P[c]+=cr*v;P[c+1]+=cg*v;P[c+2]+=cb*v;}}}}}
  let _glass=null;
  function gooUpdate(){_glass=null;
    const g0=performance.now(),now=g0,dt=Math.min(100,lastGoo?now-lastGoo:16.7);lastGoo=now;
    const ease=(tau)=>1-Math.exp(-dt/tau);
    let pooled=0;for(const p of particles)if(p.pooled)pooled++;
    const K=pooled?Math.max(4,Math.min(lite?24:40,Math.round(Math.sqrt(pooled)*1.25))):0;
    // grow the set to K, at drops that are furthest from any lump (so new lumps cover what is not covered yet)
    const aliveN=()=>{let c=0;for(const L of LUMPS)if(!L.dying)c++;return c;};
    if(pooled){let tries=0;while(aliveN()<K&&tries++<K*2){
      let best=null,bd=-1;for(let t=0;t<12;t++){const p=particles[(Math.random()*particles.length)|0];if(!p||!p.pooled)continue;gooPos(p,_q);
        let d=1e18;for(const L of LUMPS){if(L.dying)continue;const dx=_q[0]-L.tx,dy=_q[1]-L.ty,dz=_q[2]-L.tz;d=Math.min(d,dx*dx+dy*dy+dz*dz);}
        if(d>bd){bd=d;best=[_q[0],_q[1],_q[2]];}}
      if(!best)break;LUMPS.push({x:best[0],y:best[1],z:best[2],tx:best[0],ty:best[1],tz:best[2],r:0,tr:PR*1.5,hx:1,hy:0,h:0,n:0,dying:false,sx:0,sy:0,sz:0,s2:0,shx:0,shy:0});}}
    // too many: the emptiest ones shrink away
    let alive=_alive;alive.length=0;for(const L of LUMPS)if(!L.dying)alive.push(L);
    if(alive.length>K){alive.sort((a,b)=>a.n-b.n);for(let i=0;i<alive.length-K;i++)alive[i].dying=true;
      alive.length=0;for(const L of LUMPS)if(!L.dying)alive.push(L);}
    // one k-means step: every drop to its nearest lump
    for(const L of LUMPS){L.n=0;L.sx=L.sy=L.sz=L.s2=0;L.shx=L.shy=0;}
    if(alive.length)for(const p of particles){if(!p.pooled)continue;gooPos(p,_q);let bL=null,bd=1e18;
      for(const L of alive){const dx=_q[0]-L.tx,dy=_q[1]-L.ty,dz=_q[2]-L.tz,d=dx*dx+dy*dy+dz*dz;if(d<bd){bd=d;bL=L;}}
      bL.n++;bL.sx+=_q[0];bL.sy+=_q[1];bL.sz+=_q[2];bL.s2+=bd;const a=(p.hue||0)*6.2832;bL.shx+=Math.cos(a);bL.shy+=Math.sin(a);}
    const glass=_glass||(_glass=glassList()),kp=ease(55),kr=ease(90);
    for(let i=LUMPS.length-1;i>=0;i--){const L=LUMPS[i];
      if(L.n>0&&!L.dying){L.tx=L.sx/L.n;L.ty=L.sy/L.n;L.tz=L.sz/L.n;
        // as big as its drops' spread, and always big enough to overlap its neighbours: one skin, not beads
        L.tr=Math.max(PR*1.6,1.18*Math.sqrt(L.s2/L.n)+PR*1.1);L.hx+=(L.shx/L.n-L.hx)*kr;L.hy+=(L.shy/L.n-L.hy)*kr;}
      else L.tr=0;
      let room=1e9;for(const g of glass)room=Math.min(room,g[3]-(g[0]*L.tx+g[1]*L.ty+g[2]*L.tz));
      const tr=Math.min(L.tr,Math.max(PR*0.5,room/1.3));   // near the glass a lump is drawn smaller, so the skin meets the glass
      L.x+=(L.tx-L.x)*kp;L.y+=(L.ty-L.y)*kp;L.z+=(L.tz-L.z)*kp;L.r+=(tr-L.r)*kr;
      if((L.dying||L.n===0)&&L.r<0.6)LUMPS.splice(i,1);}
    const tA=performance.now();mc.reset();const tB=performance.now();
    const live=_live;live.length=0;for(const L of LUMPS)if(L.r>0.6)live.push(L);
    if(!live.length){mc.update();gooMs=performance.now()-g0;return;}
    // the field box: fitted round the lumps, but it only MOVES when the goo is about to leave it, and only grows at
    // once / shrinks when it is well worth it -- so the sampling grid stands still while the goo flows through it
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,z0=1e9,z1=-1e9;
    for(const L of live){const e=L.r*1.9;x0=Math.min(x0,L.x-e);x1=Math.max(x1,L.x+e);y0=Math.min(y0,L.y-e);y1=Math.max(y1,L.y+e);z0=Math.min(z0,L.z-e);z1=Math.max(z1,L.z+e);}
    const want=Math.min(SX,Math.max(70,Math.ceil(Math.max(x1-x0,y1-y0,z1-z0)/2/24)*24+24));
    const out=x0<fitC[0]-fitH||x1>fitC[0]+fitH||y0<fitC[1]-fitH||y1>fitC[1]+fitH||z0<fitC[2]-fitH||z1>fitC[2]+fitH;
    if(out||want>fitH||want<fitH*0.6){fitH=Math.max(want,out?fitH:0);if(want<fitH*0.6)fitH=want;fitH=Math.min(SX,fitH);
      const cell=2*fitH/GRES;fitC=[Math.round((x0+x1)/2/cell)*cell,Math.round((y0+y1)/2/cell)*cell,Math.round((z0+z1)/2/cell)*cell];}
    mc.position.set(fitC[0],fitC[1],fitC[2]);mc.scale.set(fitH,fitH,fitH);
    LQ.setRGB(liqRGB[0]/255,liqRGB[1]/255,liqRGB[2]/255,T.SRGBColorSpace);   // the pool colour is a CSS (sRGB) colour
    // THE POOL'S COLOUR IS AN AVERAGE OF NOTES, and an average of colours goes grey-brown. Keep its hue (the chord's)
    // and give it back a clean pastel's saturation and lightness, so the goo reads as candy, not mud.
    LQ.getHSL(LQH,T.SRGBColorSpace);LQH.s=Math.max(LQH.s,0.6);LQH.l=Math.min(0.74,Math.max(0.6,LQH.l));   // judged as the eye sees it (sRGB): a candy pastel, light but with body
    GC.setHSL(LQH.h,Math.max(0.55,LQH.s*0.95),Math.min(0.8,LQH.l+(CRAY?0.04:0)),T.SRGBColorSpace);const gTop=Math.max(GC.r,GC.g,GC.b);   // the brightness every lump is given
    const F=2*fitH;BB[0]=BB[2]=BB[4]=1e9;BB[1]=BB[3]=BB[5]=-1;
    for(const L of live){const h=((Math.atan2(L.hy,L.hx)/6.2832)+1)%1;
      const lh=LQH.h+0.07*Math.sin(h*6.2832),ll=Math.min(0.8,LQH.l+(CRAY?0.04:0)+0.05*Math.cos(h*6.2832));
      GC.setHSL(((lh%1)+1)%1,Math.max(0.55,LQH.s*0.95),ll,T.SRGBColorSpace);   // one candy in the chord's colour, each lump nudged a little warmer or cooler by its own notes (blending the notes' own hues went grey)
      addLump(0.5+(L.x-fitC[0])/F,0.5+(L.y-fitC[1])/F,0.5+(L.z-fitC[2])/F,L.r/F,GC);}
    const lim=mc.size-2;mc.bounds=[Math.max(1,BB[0]-1),Math.min(lim,BB[1]+1),Math.max(1,BB[2]-1),Math.min(lim,BB[3]+1),Math.max(1,BB[4]-1),Math.min(lim,BB[5]+1)];
    const tC=performance.now();mc.update();const tD=performance.now();window.__gooT=[tA-g0,tB-tA,tC-tB,tD-tC,live.length,fitH,GRES];
    // THE GOO'S TRUE COLOUR. MarchingCubes adds each lump's colour times a falloff and never divides by it, and the
    // skin sits between a coloured cell and an empty one, so every colour came out at the skin dim and greyed (and
    // overshot where lumps overlapped). Each vertex is scaled back to the brightness the lumps were given; its hue
    // and saturation are kept.
    const ca=mc.colorArray,tm=gTop;
    for(let i=0,L=mc.count*3;i<L;i+=3){const m=Math.max(ca[i],ca[i+1],ca[i+2]);if(m>1e-5){const k=tm/m;ca[i]*=k;ca[i+1]*=k;ca[i+2]*=k;}}
    // UPLOAD ONLY WHAT WAS BUILT. MarchingCubes flags its whole buffers for upload on every rebuild: room for 90,000
    // triangles, about 10 MB across position, normal and colour, sent to the graphics card every frame for a skin of
    // a few thousand triangles. That bandwidth, not the maths, was most of what made the goo heavy. Only the part in use
    // goes up now (the draw range already stops at mc.count).
    const g=mc.geometry,nUsed=mc.count*3;for(const k of ['position','normal','color']){const at=g.getAttribute(k);if(at){at.clearUpdateRanges();at.addUpdateRange(0,Math.max(3,nUsed));}}
    gooMs=performance.now()-g0;gooAvg+=(gooMs-gooAvg)*0.05;}
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
    trailMat.uniforms.uScale.value=dropMat.uniforms.uScale.value=shadowMat.uniforms.uScale.value=wormGlowMat.uniforms.uScale.value=(lastH*dpr/2)/Math.tan(camera.fov*Math.PI/360);}
  // placed when something moved it, not every frame: reading the layout every frame forces the browser to work out
  // the whole page's layout first whenever anything on it changed, which is a hitch waiting to happen
  let placeDirty=true,placeN=0;const dirty=()=>{placeDirty=true;};
  try{new ResizeObserver(dirty).observe(cv);new ResizeObserver(dirty).observe(stage);}catch(e){}
  addEventListener('resize',dirty);addEventListener('orientationchange',dirty);addEventListener('scroll',dirty,true);
  place();

  const SM=new T.Matrix4();
  function setBoxMatrix(){const M=_M;
    SM.set(M[0],M[1],M[2],0,  -M[3],-M[4],-M[5],0,  -M[6],-M[7],-M[8],-HALF,  0,0,0,1);box.matrix.copy(SM);box.matrixWorldNeedsUpdate=true;}

  let t0=performance.now(),cpuMs=0;
  function render(){
    const a0=performance.now(),now=a0,ph=now*0.000012;
    if(placeDirty||++placeN%30===0){placeDirty=false;place();}setBoxMatrix();   // (and twice a second anyway, in case something shifted it)
    // the shape's turn, drawn BETWEEN physics ticks like the balls are: the spin steps 60 times a second, and on a
    // 90/120 Hz screen drawing it as-is turned the glass in little stutters while the balls glided
    spin.rotation.z=rot-(typeof _rotV==='number'?_rotV:0)*(1-(typeof _alpha==='number'?_alpha:1));
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
      m.emissiveIntensity=0.22+lit*0.8;
      m.opacity=(lite?0.32:0.24)*gone+lit*0.25;walls[i].visible=!solid&&fill&&gone>0.02;}
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
      const wv=window.wormView?wormView(b,now):null;if(wv&&wv.hide){if(SQ.has(b))SQ.delete(b);continue;}   // in the other dimension: not here at all
      let r=BR*ballScale(bx,by,bz)*noteScale(),x=bx-CX,y=by-CY,z=zl(bz);const under=fill&&gooAt(b.x,b.y,b.z)>0.3;
      if(wv&&wv.x!=null){x=wv.x;y=wv.y;z=wv.z;}
      noteMatrix(b,x,y,z,r,now);
      if(wv){const nn=wv.n;let t1=Math.abs(nn[2])<0.9?[-nn[1],nn[0],0]:[1,0,0];const l=Math.hypot(...t1);t1=t1.map(q=>q/l);
        WZ.set(nn[0],nn[1],nn[2]).multiplyScalar(r*wv.sx);WX.set(t1[0],t1[1],t1[2]);WY.crossVectors(WZ,WX).normalize().multiplyScalar(r*wv.sy);WX.multiplyScalar(r*wv.sy);
        tmpM.makeBasis(WX,WY,WZ);tmpM.setPosition(x,y,z);}   // stretched along the hole's axis, shrinking in / swelling out
      ballMesh.setMatrixAt(n,tmpM);
      HUE.setHSL(b.hue,under?0.7:0.86,under?0.52:0.6,T.SRGBColorSpace);ballMesh.setColorAt(n,HUE);   // balls wear their raw hue, as in 2D. In sRGB, as the 2D sprite does: set in linear light the same numbers came out washed-out pastel
      const tl=wv?0:b.trail.length;for(let i=0;i<tl;i++){const t=b.trail[i],f=i/tl;
        trails.add(t[0]-CX,t[1]-CY,zl(t[2]||0),r*(0.5+1.1*f),HUE.r,HUE.g,HUE.b,f*0.32);}
      if(fill&&!solid&&!wv)shadows.add(x+3,y+5,zl(0.995),r*(2.6-1.0*bz),0.42,0.3,0.62,0.02+0.12*bz*bz);   // a soft lilac shadow on the back glass: darker and smaller the closer the ball is to it
      else if(fill&&solid&&!wv&&edges._space!=='curved'){   // a solid: a soft shadow straight down on whichever face is underneath
        const G=boxGravity(),c=Math.cos(rot),sn=Math.sin(rot);let best=1e9,bn=null;
        for(const pl of SOLID.planes){const n=pl.n,nx=n[0]*c-n[1]*sn,ny=n[0]*sn+n[1]*c,nd=nx*G[0]+ny*G[1]+n[2]*G[2];
          if(nd<=0.05)continue;const t=(pl.d-(nx*x+ny*y+n[2]*z))/nd;if(t>0&&t<best){best=t;bn=1;}}
        if(bn){const sx=x+G[0]*best,sy=y+G[1]*best,sz=z+G[2]*best,fade=Math.max(0,1-best/(SOLID_R*1.6));
          shadows.add(sx,sy,sz,r*(2.2+best/60),0.22,0.13,0.4,0.28*fade);}}
      n++;}
    ballMesh.count=n;ballMesh.instanceMatrix.needsUpdate=true;if(ballMesh.instanceColor)ballMesh.instanceColor.needsUpdate=true;
    // spray that has not landed yet: little droplets at their own depth
    for(const p of particles){if(p.pooled)continue;hueCol(p.hue||0,0.7,0.62,HUE);gooPos(p,_q);
      drops.add(_q[0],_q[1],_q[2],5.2,HUE.r,HUE.g,HUE.b,p.fade?0.95*Math.max(0,1-p.age/34):0.95);}   // spray that will not join the goo fades as it flies
    shadows.done();trails.done();drops.done();drawWorms(now,fill);
    gooClip(fill,solid);if(!(++mcTick%(gooAvg>6?Math.max(2,mcEvery):mcEvery)))gooUpdate();mc.visible=particles.length>0;
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
  function setLite(v){v=!!v;if(v===lite)return;lite=v;GRES=lite?32:40;mcEvery=lite?2:1;makeGoo();place();}
  let lost=false;
  glc.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;if(window.__glLost)window.__glLost();},false);
  function show(v){glc.style.display=v?'block':'none';}
  // test hook: the colours the goo is actually drawn in (its vertex colours): how far apart the hues spread
  // (circular, in turns), and the mean saturation and lightness
  function gooColors(){if(!mc||!mc.count)return null;const ca=mc.colorArray,h={h:0,s:0,l:0},C=new T.Color();let sx=0,sy=0,ss=0,sl=0,n=0;
    for(let i=0;i<mc.count;i+=7){C.setRGB(ca[i*3],ca[i*3+1],ca[i*3+2]);C.getHSL(h,T.SRGBColorSpace);sx+=Math.cos(h.h*6.2832)*h.s;sy+=Math.sin(h.h*6.2832)*h.s;ss+=h.s;sl+=h.l;n++;}
    return {spread:1-Math.hypot(sx,sy)/Math.max(1e-6,ss),sat:ss/n,light:sl/n,n};}
  return {render,setLite,setLook,show,canvas:glc,gooOut,gooColors,get noteScale(){return noteScale();},squash(){const m=sqMax;sqMax=0;return m;},get look(){return CRAY?'crayon':'glass';},get lost(){return lost;},
    gooBuild(){gooUpdate();return gooMs;},
    worms(){return wormMeshes.map(m=>({on:m.visible,at:[m.matrix.elements[12],m.matrix.elements[13],m.matrix.elements[14]].map(Math.round),size:Math.round(Math.hypot(m.matrix.elements[0],m.matrix.elements[1],m.matrix.elements[2])),open:m.material.uniforms.uOpen.value}));},   // test hook: the two wormholes as drawn   // test hook: rebuild the goo's surface alone (no drawing), and how long it took
    gooShape(){if(!mc||!mc.count)return null;const pa=mc.positionArray;let sx=0,sy=0,sz=0,x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;const n=mc.count;
      for(let i=0;i<n;i++){const x=pa[i*3]*fitH+fitC[0],y=pa[i*3+1]*fitH+fitC[1],z=pa[i*3+2]*fitH+fitC[2];sx+=x;sy+=y;sz+=z;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
      return {c:[sx/n,sy/n,sz/n],w:x1-x0,h:y1-y0,n,fitH,lumps:LUMPS.length};},   // test hook: where the goo's surface is (box px): its middle and its size
    stats(){const i=renderer.info;return {calls:i.render.calls,tris:i.render.triangles,cpuMs,goo:mc?mc.count:0,gres:GRES,lite,gooMs,gooAvg,lumps:LUMPS.length};}};
}

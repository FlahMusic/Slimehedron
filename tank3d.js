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
  const ballMat=fresnel(new T.MeshPhysicalMaterial({roughness:0.34,metalness:0,clearcoat:0.35,clearcoatRoughness:0.2,envMapIntensity:0.3,
    emissive:0x000000}),0,0.28);   // a mirror coat ringed every ball in white: kept soft, and it glows in its own colour
  // THE GOO IS WAX, NOT WET GLASS: no white sheen, a soft coat, and a glow in its own colour from inside, like a
  // lava lamp. Both sides are drawn so where the glass cuts it the goo looks pressed against the glass, not hollow.
  const gooMat=fresnel(new T.MeshPhysicalMaterial({vertexColors:true,roughness:0.5,metalness:0,clearcoat:0.3,clearcoatRoughness:0.3,
    envMapIntensity:0.22,transparent:true,opacity:0.92,depthWrite:true,side:T.DoubleSide}),0,0.34,true);
  const shardMat=new T.MeshPhysicalMaterial({roughness:0.08,clearcoat:1,iridescence:0.6,envMapIntensity:1.4,
    transparent:true,opacity:0.55,side:T.DoubleSide,depthWrite:false,emissive:0xffffff,emissiveIntensity:0.15});

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
      const m=new T.Mesh(g,glassFor(hueCol(edges[i].hue,0.75,0.66)));m.renderOrder=2;spin.add(m);walls.push(m);});
    // back and front panes: a fan from the middle (every shape the tank uses is star-shaped about it)
    const fan=(z)=>{const pos=[];for(let k=0;k<outline.length;k++){const a=outline[k],b=outline[(k+1)%outline.length];pos.push(0,0,z,a[0],a[1],z,b[0],b[1],z);}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.computeVertexNormals();return g;};
    backPane=new T.Mesh(fan(zl(1)),paneMat);backPane.renderOrder=0;spin.add(backPane);
    frontPane=new T.Mesh(fan(zl(0)),frontMat);frontPane.renderOrder=6;spin.add(frontPane);
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
        const n0=P.length;run+=beam([a[0],a[1],zl(0)],[b[0],b[1],zl(0)],5.5,portal?run:-1);
        beam([a[0],a[1],zl(1)],[b[0],b[1],zl(1)],3,-1);
        if(k===0)beam([a[0],a[1],zl(0)],[a[0],a[1],zl(1)],2.2,-1);
        for(let j=n0;j<P.length;j+=3)owner.push(i);}});   // one owner per VERTEX
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));
    rimCol=new Float32Array(P.length);g.setAttribute('color',new T.BufferAttribute(rimCol,3));
    g.setAttribute('dash',new T.Float32BufferAttribute(D,1));g.userData.owner=owner;
    rims=new T.Mesh(g,rimMat);rims.renderOrder=7;spin.add(rims);
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
  const solidIn=new T.Mesh(new T.BufferGeometry(),solidMat(T.BackSide)),solidOut=new T.Mesh(solidIn.geometry,solidMat(T.FrontSide));
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
      const n0=P.length,ES=curved?8:1;for(let e=0;e<ES;e++)beamTo(P,D,M(lerp3(a,b,e/ES)),M(lerp3(a,b,(e+1)/ES)),4.4);for(let j=n0;j<P.length;j+=3)ow.push(i);}});
    // the edge of hyperbolic space itself: a faint glass sphere at infinity
    if(curved&&!skyBall){skyBall=new T.Mesh(new T.SphereGeometry(RB,48,32),fresnel(new T.MeshPhysicalMaterial({color:0xe6dcff,roughness:0.1,clearcoat:1,
      iridescence:0.5,transparent:true,opacity:0.03,side:T.BackSide,depthWrite:false,envMapIntensity:1.2}),0.35));skyBall.renderOrder=0;box.add(skyBall);}
    if(skyBall)skyBall.visible=curved;
    const rg=new T.BufferGeometry();rg.setAttribute('position',new T.Float32BufferAttribute(P,3));
    solidRimCol=new Float32Array(P.length);rg.setAttribute('color',new T.BufferAttribute(solidRimCol,3));rg.setAttribute('dash',new T.Float32BufferAttribute(D,1));
    solidRimOwner=ow;solidRims=new T.Mesh(rg,rimMat);solidRims.renderOrder=7;solidRims.frustumCulled=false;spin.add(solidRims);}
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
    mc=new T.MarchingCubes(GRES,gooMat,false,true,90000);mc.isolation=60;mc.renderOrder=2;mc.frustumCulled=false;
    mc.position.set(0,0,0);mc.scale.set(SX,SX,SX);box.add(mc);}
  makeGoo();
  const GC=new T.Color(),LQ=new T.Color(),cells=new Map();
  function glassList(){const glass=[];   // [nx,ny,nz,d]: inside is n.p <= d, box-local px
    if(edges._space!=='curved'){
      if(edges._solid){const c=Math.cos(rot),s=Math.sin(rot);for(const pl of SOLID.planes){const q=pl.n;glass.push([q[0]*c-q[1]*s,q[0]*s+q[1]*c,q[2],pl.d]);}}
      else{for(const e of edges){if(!e.broken)glass.push([-e.nx,-e.ny,0,-((e.ax-CX)*e.nx+(e.ay-CY)*e.ny)]);}glass.push([0,0,1,HALF],[0,0,-1,HALF]);}}
    return glass;}
  // test hook: how far the goo's skin reaches past the glass BEFORE the clip (px), and how many clip planes hold it
  function gooOut(){if(!mc||!mc.count)return null;const g=glassList(),pa=mc.positionArray;let worst=-1e9;
    for(let i=0;i<mc.count;i++){const x=pa[i*3]*fitH+fitC[0],y=pa[i*3+1]*fitH+fitC[1],z=pa[i*3+2]*fitH+fitC[2];for(const q of g)worst=Math.max(worst,q[0]*x+q[1]*y+q[2]*z-q[3]);}
    return {reach:worst,clip:(gooMat.clippingPlanes||[]).length,glass:g.length};}
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
    LQ.setRGB(liqRGB[0]/255,liqRGB[1]/255,liqRGB[2]/255);
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
      hueCol(h,0.8,0.68,GC).lerp(LQ,0.42);   // lava-lamp pastels: the chord's colour, swirled with the notes the goo is made of
      const rr=rad/F;
      mc.addBall(0.5+(x-fitC[0])/F,0.5+(y-fitC[1])/F,0.5+(z-fitC[2])/F,rr*rr*(mc.isolation+12),12,GC);}
    mc.update();}
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
    const want=clip.slice(0,clipN);gooMat.clippingPlanes=want;}

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
    if(rims&&solid)rims.visible=false;rimMat.uniforms.uT.value=(now-t0)/1000;
    if(backPane){backPane.visible=fill&&!solid;paneMat.opacity=0.22+_pane.back*0.35;paneMat.emissiveIntensity=_pane.back*0.8;}
    if(frontPane){frontPane.visible=fill&&!solid;frontMat.opacity=0.05+_pane.front*0.22;frontMat.emissiveIntensity=_pane.front*0.5;}
    if(horizon)horizon.visible=fill&&!solid;
    // balls
    shadows.reset();trails.reset();drops.reset();
    let n=0;
    for(const b of balls){if(n>=MAXB)break;
      let bx=lerpX(b),by=lerpY(b),bz=(b.pz==null?(b.z||0):b.pz+((b.z||0)-b.pz)*_alpha);
      if(b.px!=null&&Math.hypot(b.x-b.px,b.y-b.py)>BR*2.2){bx=b.x;by=b.y;bz=b.z||0;}
      const r=BR*ballScale(bx,by,bz),x=bx-CX,y=by-CY,z=zl(bz),under=fill&&gooAt(b.x,b.y,b.z)>0.3;
      tmpM.makeScale(r,r,r).setPosition(x,y,z);ballMesh.setMatrixAt(n,tmpM);
      HUE.setHSL(b.hue,under?0.7:0.88,under?0.52:0.58);ballMesh.setColorAt(n,HUE);   // balls wear their raw hue, as in 2D
      const tl=b.trail.length;for(let i=0;i<tl;i++){const t=b.trail[i],f=i/tl;
        trails.add(t[0]-CX,t[1]-CY,zl(t[2]||0),r*(0.5+1.1*f),HUE.r,HUE.g,HUE.b,f*0.32);}
      if(fill&&!solid)shadows.add(x+3,y+5,zl(0.995),r*2.6,0.24,0.14,0.42,0.22);
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

  function setLite(v){v=!!v;if(v===lite)return;lite=v;GRES=lite?32:40;mcEvery=lite?3:2;makeGoo();place();}
  let lost=false;
  glc.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;if(window.__glLost)window.__glLost();},false);
  function show(v){glc.style.display=v?'block':'none';}
  return {render,setLite,show,canvas:glc,gooOut,get lost(){return lost;},
    stats(){const i=renderer.info;return {calls:i.render.calls,tris:i.render.triangles,cpuMs,goo:mc?mc.count:0,gres:GRES,lite};}};
}

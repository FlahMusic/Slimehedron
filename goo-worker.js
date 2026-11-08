// ============================================================================================
//  THE GOO'S SKIN, BUILT ON ANOTHER CORE  (Slimehedron, GPL-3.0-or-later)
//  tank3d.js decides where the goo's lumps are and what colour they are, every frame; this worker turns them into the
//  surface (the field, then marching cubes) and sends the triangles back. On the main thread that was 3-4 ms a frame
//  at a 40-cell grid, and the finer 60-cell grid that makes the skin smooth (2026-11-07, the slime overhaul) cost
//  6-13 ms, too much next to everything else in a frame. Here it costs the main thread a copy. The skin it sends
//  back is one frame behind the lumps, which nobody can see on a slow liquid.
//  Same field as tank3d.js's addLump (strength / d^2 - LSUB, in grid units); keep the two in step.
// ============================================================================================
import * as T from './vendor/three-slime.js';
const LSUB=16;
let mc=null,res=0;
function addLump(x,y,z,rr,cr,cg,cb,BB){const S=mc.size,S2=mc.size2,F=mc.field,P=mc.palette,b=rr*rr*(mc.isolation+LSUB),reach=S*Math.sqrt(b/LSUB);
  const cx=z*S,cy=y*S,cz=x*S;   // (z, y, x) = slowest to fastest axis, as MarchingCubes lays them out
  const z0=Math.max(1,Math.floor(cx-reach)),z1=Math.min(S-1,Math.floor(cx+reach)),y0=Math.max(1,Math.floor(cy-reach)),y1=Math.min(S-1,Math.floor(cy+reach)),
        x0=Math.max(1,Math.floor(cz-reach)),x1=Math.min(S-1,Math.floor(cz+reach)),inv=1/S;
  if(z0<BB[0])BB[0]=z0;if(z1>BB[1])BB[1]=z1;if(y0<BB[2])BB[2]=y0;if(y1>BB[3])BB[3]=y1;if(x0<BB[4])BB[4]=x0;if(x1>BB[5])BB[5]=x1;
  for(let k=z0;k<z1;k++){const dz=k*inv-z,dz2=dz*dz,bk=S2*k;
    for(let j=y0;j<y1;j++){const dy=j*inv-y,dyz=dy*dy+dz2,bj=bk+S*j;
      for(let i=x0;i<x1;i++){const dx=i*inv-x,v=b/(1e-6+dx*dx+dyz)-LSUB;
        if(v>0){const q=bj+i;F[q]+=v;const c=q*3;P[c]+=cr*v;P[c+1]+=cg*v;P[c+2]+=cb*v;}}}}}
// SURFACE TENSION. The goo is built from up to 40 lumps, and a fine grid draws every one of them: a cloud of lobes, not
// one body. Real goo pulls itself round. A box blur of the field (and of its colour, so the skin's colour stays true),
// run twice along each axis inside the lumps' box, melts the lobes together the way surface tension does (the volume
// version of the smoothing in van der Laan, Green & Sainz 2009). The total amount of goo is kept; the skin rounds off.
const BR=2,BITER=1;let tmp=new Float32Array(0);
function blurAxis(A,comps,S,S2,b,axis){const st=axis===0?1:axis===1?S:S2,n=(axis===0?b[5]-b[4]:axis===1?b[3]-b[2]:b[1]-b[0])+1;
  if(tmp.length<n*comps)tmp=new Float32Array(n*comps);const w=1/(2*BR+1);
  const [o0a,o0b,o1a,o1b]=axis===0?[b[0],b[1],b[2],b[3]]:axis===1?[b[0],b[1],b[4],b[5]]:[b[2],b[3],b[4],b[5]];
  for(let p=o0a;p<=o0b;p++)for(let q=o1a;q<=o1b;q++){
    const base=axis===0?S2*p+S*q+b[4]:axis===1?S2*p+q+S*b[2]:S*p+q+S2*b[0];
    for(let c=0;c<comps;c++){let acc=0;
      for(let i=-BR;i<=BR;i++){const k=Math.min(n-1,Math.max(0,i));acc+=A[(base+k*st)*comps+c];}
      for(let i=0;i<n;i++){tmp[i*comps+c]=acc*w;const ia=Math.min(n-1,i+BR+1),ir=Math.max(0,i-BR);acc+=A[(base+ia*st)*comps+c]-A[(base+ir*st)*comps+c];}}
    for(let i=0;i<n;i++)for(let c=0;c<comps;c++)A[(base+i*st)*comps+c]=tmp[i*comps+c];}}
self.onmessage=e=>{const m=e.data,t0=performance.now();
  if(!mc||res!==m.res){mc=new T.MarchingCubes(m.res,new T.MeshBasicMaterial(),false,true,90000);mc.isolation=60;res=m.res;}
  mc.reset();const BB=[1e9,-1,1e9,-1,1e9,-1],L=m.lumps;
  for(let i=0;i<L.length;i+=7)addLump(L[i],L[i+1],L[i+2],L[i+3],L[i+4],L[i+5],L[i+6],BB);
  if(L.length){const S=mc.size,pad=BR*BITER,lo=1,hi=S-2,b=[Math.max(lo,BB[0]-pad),Math.min(hi,BB[1]+pad),Math.max(lo,BB[2]-pad),Math.min(hi,BB[3]+pad),Math.max(lo,BB[4]-pad),Math.min(hi,BB[5]+pad)];
    for(let it=0;it<BITER;it++)for(let ax=0;ax<3;ax++)blurAxis(mc.field,1,S,mc.size2,b,ax);
    BB[0]=b[0];BB[1]=b[1];BB[2]=b[2];BB[3]=b[3];BB[4]=b[4];BB[5]=b[5];}
  const lim=mc.size-2;mc.bounds=L.length?[Math.max(1,BB[0]-1),Math.min(lim,BB[1]+1),Math.max(1,BB[2]-1),Math.min(lim,BB[3]+1),Math.max(1,BB[4]-1),Math.min(lim,BB[5]+1)]:[1,1,1,1,1,1];
  mc.update();
  const n=mc.count,ca=mc.colorArray,c=m.col;
  for(let i=0;i<n*3;i+=3){ca[i]=c[0];ca[i+1]=c[1];ca[i+2]=c[2];}   // one colour, the chord's: the shading gives the variation (the blurred field outruns the per-lump colours)
  const pos=mc.positionArray.slice(0,n*3),nor=mc.normalArray.slice(0,n*3),col=ca.slice(0,n*3);
  self.postMessage({res:m.res,n,pos,nor,col,fit:m.fit,ms:performance.now()-t0},[pos.buffer,nor.buffer,col.buffer]);};

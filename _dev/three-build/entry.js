// The three.js pieces the 3D tank uses, bundled into vendor/three-slime.js.
// Rebuild (from a folder with three@0.186.1 and esbuild installed):
//   npx esbuild entry.js --bundle --minify --format=esm --legal-comments=none \
//     --banner:js="$(cat banner.txt)" --outfile=../../vendor/three-slime.js
// then:  python3 patch-mc-bounds.py ../../vendor/three-slime.js   (lets the goo polygonize only the cells it fills)
export {WebGLRenderer,Scene,PerspectiveCamera,Group,Fog,Mesh,InstancedMesh,BufferGeometry,BufferAttribute,
  Float32BufferAttribute,SphereGeometry,IcosahedronGeometry,BoxGeometry,PlaneGeometry,CircleGeometry,TorusGeometry,
  MeshPhysicalMaterial,MeshStandardMaterial,MeshBasicMaterial,ShaderMaterial,LineBasicMaterial,
  LineSegments,Line,Points,PointsMaterial,Color,Matrix4,Vector3,Vector2,Quaternion,Object3D,
  DirectionalLight,AmbientLight,HemisphereLight,PointLight,PMREMGenerator,CanvasTexture,
  SRGBColorSpace,ACESFilmicToneMapping,AgXToneMapping,NeutralToneMapping,DoubleSide,FrontSide,BackSide,
  AdditiveBlending,NormalBlending,CustomBlending,OneFactor,OneMinusSrcAlphaFactor,SrcAlphaFactor,DynamicDrawUsage,MathUtils,REVISION} from 'three';
export {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
export {MarchingCubes} from 'three/examples/jsm/objects/MarchingCubes.js';

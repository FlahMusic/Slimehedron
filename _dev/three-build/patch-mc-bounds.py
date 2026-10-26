# One small patch to the bundled MarchingCubes, applied AFTER the esbuild step (see entry.js):
# update() may be given a box of cells to polygonize (mc.bounds = [z0,z1,y0,y1,x0,x1], grid indices,
# end exclusive) instead of the whole grid. The goo only ever fills part of its grid, and walking every
# empty cell was most of the cost of rebuilding the goo each frame. Without mc.bounds it behaves exactly
# as stock three.js. Idempotent: running it twice changes nothing.
#   python3 patch-mc-bounds.py ../../vendor/three-slime.js
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
old = 'this.update=function(){this.count=0;let y=this.size-2;for(let T=1;T<y;T++){let x=this.size2*T,b=(T-this.halfsize)/this.halfsize;for(let S=1;S<y;S++){let w=x+this.size*S,p=(S-this.halfsize)/this.halfsize;for(let E=1;E<y;E++){'
new = 'this.update=function(){this.count=0;let y=this.size-2,__b=this.bounds;for(let T=__b?__b[0]:1;T<(__b?__b[1]:y);T++){let x=this.size2*T,b=(T-this.halfsize)/this.halfsize;for(let S=__b?__b[2]:1;S<(__b?__b[3]:y);S++){let w=x+this.size*S,p=(S-this.halfsize)/this.halfsize;for(let E=__b?__b[4]:1;E<(__b?__b[5]:y);E++){'
if new in s:
    print('already patched'); sys.exit(0)
assert s.count(old) == 1, 'MarchingCubes.update not found - three.js changed, re-check the patch'
open(p, 'w', encoding='utf-8').write(s.replace(old, new))
print('patched')

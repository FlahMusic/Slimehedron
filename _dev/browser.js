// ============================================================================================
//  WHERE IS CHROMIUM?
//  Every suite hard-coded /opt/pw-browsers/chromium-1194/chrome-linux/chrome, which exists in the
//  cloud container and nowhere else -- so none of these 46 tests could be run on the machine the
//  app is actually developed on. One place decides now.
//  Order: an explicit override, then the container's pinned build, then whatever Playwright
//  installed for itself, then the system browser. If none of those exist it says so in a sentence
//  that tells you what to do, instead of a stack trace about a missing file.
//  Use: const {launch}=require('./browser'); const b=await launch();
// ============================================================================================
const fs=require('fs');
const path=require('path');

function findExecutable(){
  // 1. an explicit override always wins: SLIME_CHROME=/path/to/chrome node _dev/dev-x.js
  if(process.env.SLIME_CHROME&&fs.existsSync(process.env.SLIME_CHROME))return process.env.SLIME_CHROME;
  // 2. the cloud container's pinned build, and any other version sitting beside it
  const pw=process.env.PLAYWRIGHT_BROWSERS_PATH||'/opt/pw-browsers';
  const candidates=[];
  try{
    for(const d of fs.readdirSync(pw)){
      if(!/^chromium/.test(d))continue;
      candidates.push(
        path.join(pw,d,'chrome-linux','chrome'),
        path.join(pw,d,'chrome-win','chrome.exe'),
        path.join(pw,d,'chrome-mac','Chromium.app','Contents','MacOS','Chromium'));
    }
  }catch(e){}
  // 3. a normal Playwright install (Windows, mac, or a dev's own linux box)
  const home=process.env.USERPROFILE||process.env.HOME||'';
  for(const base of [path.join(home,'AppData','Local','ms-playwright'),
                     path.join(home,'.cache','ms-playwright'),
                     path.join(home,'Library','Caches','ms-playwright')]){
    try{ for(const d of fs.readdirSync(base)){
      if(!/^chromium/.test(d))continue;
      candidates.push(
        path.join(base,d,'chrome-win','chrome.exe'),
        path.join(base,d,'chrome-linux','chrome'),
        path.join(base,d,'chrome-mac','Chromium.app','Contents','MacOS','Chromium'));
    } }catch(e){}
  }
  // 4. the browser already on the machine
  candidates.push(
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser');
  for(const c of candidates) if(c&&fs.existsSync(c))return c;
  return null;                                  // let Playwright try its own default
}

const EXEC=findExecutable();

async function launch(opts){
  const {chromium}=require('playwright');
  // WebGL in software (SwiftShader) is ALLOWED, so a suite can switch the graphics-card tank on. It is OFF by
  // default (see SLIME_GL below): drawn in software it takes ~240ms a frame here, which would turn every
  // suite's physics into slow motion, and that slowness is this machine, not the app.
  const args=['--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader'];
  const o=Object.assign({args},opts||{});
  if(EXEC)o.executablePath=EXEC;
  try{
    const br=await chromium.launch(o);
    // SLIME_VIEW=3d runs ANY suite against the 3D tank: every new page starts with the 3D view switched
    // on, exactly as if the person had picked it in the tank's corner menu. Unset = the 3D default.
    // SLIME_SPACE=portal|curved|normal does the same for the space.
    //   SLIME_VIEW=2d node _dev/dev-devices.js     SLIME_SPACE=curved node _dev/dev-band.js
    // SLIME_GL=1 lets the 3D tank load its graphics-card renderer (dev-gl.js sets it); otherwise every page
    // gets window.__noGL and the canvas draws the 3D tank, which is the same tank and the same physics.
    const view=(process.env.SLIME_VIEW||'').toLowerCase(),space=(process.env.SLIME_SPACE||'').toLowerCase(),gl=process.env.SLIME_GL==='1';
    {const nc=br.newContext.bind(br);
      br.newContext=async(...a)=>{const c=await nc(...a);
        await c.addInitScript(([v,sp,g])=>{try{if(!g)window.__noGL=true;if(v)localStorage.setItem('slimehedron-view3d',v);if(sp)localStorage.setItem('slimehedron-space',sp);}catch(e){}},
          [view==='3d'?'1':view==='2d'?'0':'',['normal','portal','curved'].includes(space)?space:'',gl]);return c;};}
    return br;
  }catch(err){
    console.error('\n  Could not start a browser for the tests.');
    console.error('  Tried: '+(EXEC||'Playwright\'s own default (nothing else was found)'));
    console.error('  Fix it with either:');
    console.error('    npx playwright install chromium');
    console.error('    SLIME_CHROME="C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe" node _dev/dev-x.js');
    console.error('  (and run the suites from the PROJECT ROOT, not from inside _dev)\n');
    throw err;
  }
}

module.exports={launch,EXEC,findExecutable};

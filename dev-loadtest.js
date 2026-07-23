// Execute index.html's inline script under a DOM/WebAudio stub to catch LOAD-TIME errors (TDZ, undefined refs).
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
// grab every inline <script> (skip external src=)
const scripts=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
// ---- stubs ----
const noop=()=>{};
function fakeEl(){return new Proxy(function(){},{
  get(t,p){
    if(p==='style')return new Proxy({},{get:()=>'',set:()=>true});
    if(p==='classList')return {add:noop,remove:noop,toggle:()=>false,contains:()=>false};
    if(p==='dataset')return {};
    if(p==='value')return '0'; if(p==='min')return '0'; if(p==='max')return '100';
    if(p==='checked')return false; if(p==='selectedIndex')return 0;
    if(p==='options')return []; if(p==='children')return []; if(p==='parentNode')return fakeEl();
    if(p==='addEventListener'||p==='removeEventListener'||p==='dispatchEvent'||p==='appendChild'||p==='prepend'||p==='remove'||p==='setAttribute'||p==='removeAttribute'||p==='insertAdjacentHTML'||p==='click'||p==='focus'||p==='scrollTo')return noop;
    if(p==='querySelector'||p==='closest')return ()=>fakeEl();
    if(p==='querySelectorAll'||p==='getElementsByTagName')return ()=>[];
    if(p==='getContext')return ()=>ctxStub();
    if(p==='getBoundingClientRect')return ()=>({top:0,left:0,width:100,height:100,bottom:100,right:100});
    if(p==='toDataURL')return ()=>'data:';
    if(p==='width'||p==='height'||p==='offsetLeft'||p==='offsetTop'||p==='offsetWidth'||p==='offsetHeight'||p==='clientWidth'||p==='clientHeight')return 100;
    if(p==='innerHTML'||p==='textContent'||p==='className'||p==='id'||p==='tagName'||p==='src')return '';
    if(p==='hidden')return false; if(p==='firstChild')return fakeEl();
    if(p==='cloneNode')return ()=>fakeEl();
    return fakeEl();
  },
  set(){return true;}, apply(){return fakeEl();}
});}
function ctxStub(){return new Proxy({},{get(t,p){
  if(p==='canvas')return fakeEl();
  if(p==='createLinearGradient'||p==='createRadialGradient')return ()=>({addColorStop:noop});
  if(p==='getImageData')return ()=>({data:new Uint8ClampedArray(4*36*36)});
  if(p==='measureText')return ()=>({width:10});
  return noop;
},set(){return true;}});}
global.window=global; 
global.document={getElementById:()=>fakeEl(),createElement:()=>fakeEl(),createElementNS:()=>fakeEl(),
  querySelector:()=>fakeEl(),querySelectorAll:()=>[],addEventListener:noop,removeEventListener:noop,
  body:fakeEl(),head:fakeEl(),documentElement:fakeEl(),readyState:'complete',
  createTextNode:()=>fakeEl(),getElementsByTagName:()=>[]};
global.navigator={userAgent:'node',maxTouchPoints:0,requestMIDIAccess:undefined,canShare:()=>false,serviceWorker:{register:()=>Promise.resolve()},mediaDevices:{}};
global.localStorage={_d:{},getItem(k){return this._d[k]||null;},setItem(k,v){this._d[k]=v;},removeItem(k){delete this._d[k];}};
global.performance={now:()=>Date.now()};
global.requestAnimationFrame=noop;global.cancelAnimationFrame=noop;
global.addEventListener=noop;global.removeEventListener=noop;global.matchMedia=()=>({matches:false,addListener:noop,addEventListener:noop});
global.setTimeout=(f)=>{try{typeof f==='function'&&f();}catch(e){}return 0;};global.clearTimeout=noop;global.setInterval=()=>0;global.clearInterval=noop;
global.AudioContext=global.webkitAudioContext=function(){return new Proxy({currentTime:0,sampleRate:44100,state:'running',destination:fakeEl()},{get(t,p){if(p in t)return t[p];return ()=>ctxStub();}});};
global.Image=function(){return fakeEl();};global.Blob=function(){};global.URL={createObjectURL:()=>'blob:',revokeObjectURL:noop};
global.indexedDB={open:()=>({})};global.fetch=()=>Promise.resolve({});
global.innerWidth=1200;global.innerHeight=800;global.devicePixelRatio=1;global.scrollTo=()=>{};global.getComputedStyle=()=>({getPropertyValue:()=>'#9fe6cf'});
global.LEARN={enter:noop,exit:noop,noteIn:noop};
global.PointerEvent=global.Event=function(){return {};};
let ok=true;
scripts.forEach((s,i)=>{try{(0,eval)(s);}catch(e){ok=false;console.log('SCRIPT',i,'THREW:',e.constructor.name,'-',e.message,'\n   at',(e.stack||'').split('\n')[1]);}});
console.log(ok?'LOAD OK — every inline script executed with no runtime error':'LOAD FAILED (see above)');

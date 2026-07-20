// ================= slimehedron LEARN MODE =================
// four courses on colored panes · pixel-art scene generator (7 seeded looks per mode) ·
// iconic public-domain melodies · never the same track twice in a row.
window.LEARN=(function(){
  'use strict';
  const $id=x=>document.getElementById(x);
  const lf=()=>$id('lFeed');

  // ============ shared: the pixel piano ============
  const PN={0:'C',2:'D',4:'E',5:'F',7:'G',9:'A',11:'B',12:'C',14:'D',16:'E'};
  const WK=[0,2,4,5,7,9,11,12], BK=[[1,0],[3,1],[6,3],[8,4],[10,5]];
  function pianoHTML(labels){
    const strip=i=>{const c=degRGB(i%7);return `<i class="kclr" style="background:rgb(${c[0]|0},${c[1]|0},${c[2]|0})"></i>`;};
    const w=WK.map((s,i)=>`<div class="pxW" data-s="${s}"><span>${labels&&labels[s]!=null?labels[s]:''}</span>${strip(i)}</div>`).join('');
    const gw=[[14,8],[16,9]].map(([s,i])=>`<div class="pxW gh" data-s="${s}"><span></span>${strip(i%7)}</div>`).join('');
    const b=BK.map(([s,wi])=>`<div class="pxB" data-s="${s}" style="left:${wi*33+21}px"></div>`).join('');
    const gb=[[13,7],[15,8]].map(([s,wi])=>`<div class="pxB gh" data-s="${s}" style="left:${wi*33+21}px"></div>`).join('');
    return `<div class="pxPiano"><div class="pxKeys">${w}${gw}${b}${gb}</div></div>`;
  }
  function lessonNote(freq,vel,dur){if(!AC)return;const t=AC.currentTime,v=(vel||96)/127*0.5;
    [[1,1],[4,0.25],[9.2,0.07]].forEach(([m,a])=>{const o=AC.createOscillator(),g=AC.createGain();
      o.type='sine';o.frequency.value=freq*m;
      const d=(dur||0.9)/Math.sqrt(m);
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v*a,t+0.004);
      g.gain.exponentialRampToValueAtTime(0.0001,t+d);
      o.connect(g);g.connect(typeof melBus!=='undefined'&&melBus?melBus:AC.destination);o.start(t);o.stop(t+d+0.05);});}
  function pianoPlay(s,vel){const f=440*Math.pow(2,(60+s-69)/12);lessonNote(f,vel||96);}
  function decorate(tones){const wrap=ov.querySelector('.pxKeys');if(!wrap)return;
    wrap.querySelectorAll('.pxSlM').forEach(e=>e.remove());
    wrap.querySelectorAll('[data-s]').forEach(k=>k.classList.toggle('hl',tones.includes(+k.dataset.s)));
    tones.forEach((s,i)=>{const k=wrap.querySelector(`[data-s="${s}"]`);if(!k)return;
      const d=document.createElement('div');d.className='pxSlM';
      d.style.left=(k.offsetLeft+(k.classList.contains('pxB')?-5:1))+'px';
      d.style.animationDelay=(i*0.13)+'s';
      d.innerHTML=pixSlime(['#9fe6cf','#c4a9f5','#ffb6d6','#ffd3a8'][i%4],'happy');
      wrap.appendChild(d);});}
  let onKey=null;
  function setLC(c){try{localStorage.setItem('slimehedron-lastcourse',c);}catch(e){}}


  // ============ wordless lesson icons ============
  function icoKeys(marks,arc){let k='';
    for(let i=0;i<7;i++){const on=marks.includes(i);
      k+=`<rect x="${2+i*6}" y="10" width="6" height="20" fill="${on?'#ffd3a8':'#fff'}" stroke="#5a4f78" stroke-width="1.6"/>`;
      if(on)k+=`<rect x="${3.5+i*6}" y="23" width="3" height="4" fill="#9fe6cf" stroke="#5a4f78" stroke-width="0.9"/>`;}
    let a='';if(arc)a=`<path d="M ${5+marks[0]*6} 10 Q ${(10+(marks[0]+marks[1])*6)/2} 2 ${5+marks[1]*6} 10" fill="none" stroke="#b388f0" stroke-width="2.4" stroke-linecap="round"/>`;
    return `<svg class="crsIco" viewBox="0 0 44 34">${k}${a}</svg>`;}
  const icoModes=`<svg class="crsIco" viewBox="0 0 44 34" shape-rendering="crispEdges">
    <rect x="2" y="4" width="18" height="26" fill="#aee3ff" stroke="#5a4f78" stroke-width="1.6"/><rect x="6" y="8" width="6" height="6" fill="#ffe39c"/><rect x="4" y="24" width="14" height="4" fill="#93d97b"/>
    <rect x="24" y="4" width="18" height="26" fill="#31406b" stroke="#5a4f78" stroke-width="1.6"/><rect x="27" y="8" width="2" height="5" fill="#8fa8d9"/><rect x="32" y="13" width="2" height="5" fill="#8fa8d9"/><rect x="37" y="7" width="2" height="5" fill="#8fa8d9"/></svg>`;


  // ============ course 0: rhythm — steady beat first (Kodaly/Gordon sequence) ============
  let rhIv=null,rhLast=0,rhGood=0,rhBpm=90;
  function rhStop(){if(rhIv){clearInterval(rhIv);rhIv=null;}}
  let rhBeat=-1;const RHWIN=('ontouchstart' in window)?150:110; // wider window on touch: forgive the DEVICE's latency, not the child's
  function rhTickSound(acc){if(!AC)return;const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();
    o.type='sine';o.frequency.setValueAtTime(acc?1850:1450,t);o.frequency.exponentialRampToValueAtTime(acc?1400:1100,t+0.03);
    g.gain.setValueAtTime(acc?0.5:0.32,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.07);
    o.connect(g);g.connect(typeof melBus!=='undefined'&&melBus?melBus:AC.destination);o.start(t);o.stop(t+0.09);} // woodblock, not beeper
  function rhTick(){rhLast=performance.now();rhBeat=(rhBeat+1)%4;rhTickSound(rhBeat===0);
    const m=$id('rhMeter');if(m)m.textContent=[0,1,2,3].map(i=>i===rhBeat?(i===0?'\u25c9':'\u25cf'):'\u25cb').join('');
    const pad=$id('rhPad');if(pad){pad.classList.add('pulse');setTimeout(()=>pad.classList.remove('pulse'),140);}}
  function rhDots(){const d=$id('rhDots');if(d)d.textContent='\u25cf'.repeat(Math.min(8,rhGood))+'\u25cb'.repeat(Math.max(0,8-rhGood));}
  function rhythmCourse(bpm){stopJam();rhGood=0;rhBpm=bpm||90;rhBeat=-1;setLC('rhythm');
    ov.innerHTML=`<div class="lCard"><h3>rhythm</h3>
      <p class="lSub">tap WITH the tick.</p>
      <div id="rhPad">${pixSlime('#9fe6cf','happy')}</div>\n      <div id="rhMeter"></div>
      <div class="lStickers" id="rhDots"></div>
      <div class="lFeed" id="lFeed"></div>
      <div class="lRow"><button class="btn" data-a="home">\u2039 back</button></div></div>`;
    rhDots();onKey=null;
    if(AC&&AC.state==='suspended')AC.resume();
    rhIv=setInterval(rhTick,60000/rhBpm);rhTick();}
  function rhTap(){const per=60000/rhBpm,t=performance.now();
    const d=(t-rhLast)%per,off=Math.min(d,per-d);
    lessonNote(130.81,110,0.5);
    if(off<RHWIN){rhGood++;if((prog.r|0)<rhGood){prog.r=rhGood;saveP();}rhDots();
      lf().textContent='with the beat.';
      if(rhGood>=8){rhStop();lf().textContent=rhBpm<120?'you ARE the beat. now faster \u2192':'steady at every speed. that is tempo.';
        const row=ov.querySelector('.lRow');
        if(rhBpm<120){const b=document.createElement('button');b.className='btn primary';b.textContent='faster \u25b8';b.dataset.a='rhfast';row.prepend(b);}
        else{const b=document.createElement('button');b.className='btn primary';b.textContent='next: the piano \u25b8';b.dataset.a='crs';b.dataset.c='piano';row.prepend(b);}}}
    else lf().textContent='listen\u2026 tap WITH the tick.';}
  // ============ course 1: the piano ============
  const HINT={0:'left of the 2 black keys',2:'between the 2 black keys',4:'right of the 2 black keys',
    5:'left of the 3 black keys',7:'in the 3 — left side',9:'in the 3 — right side',
    11:'right of the 3 black keys',12:'left of the NEXT 2 black keys →'};
  let pIdx=0,pFound={};
  function pianoCourse(){stopJam();setLC('piano');pIdx=0;pFound={};pianoView();}
  function pianoView(){const t=WK[pIdx];
    ov.innerHTML=`<div class="lCard"><h3>the piano</h3>
      <p class="lSub">${pIdx===0?'this is one octave. find C — '+HINT[0]+'.':'find '+PN[t]+'.'}</p>
      ${pianoHTML(pFound)}
      <div class="lFeed" id="lFeed"></div>
      <div class="lRow"><button class="btn" data-a="home">‹ back</button></div></div>`;
    onKey=s=>{pianoPlay(s);
      if(s===t){pFound[s]=PN[s];decorate([s]);if((prog.p|0)<pIdx+1){prog.p=pIdx+1;saveP();}
        if(pIdx<WK.length-1){lf().textContent=`yes — ${PN[s]}.`;pIdx++;setTimeout(pianoView,850);}
        else{onKey=null;lf().textContent='same name — one octave higher. the picture repeats forever →';
          WK.forEach((ws,i)=>setTimeout(()=>pianoPlay(ws,88),600+i*170)); // the payoff: hear your whole scale climb
          const b=document.createElement('button');b.className='btn primary';b.textContent='next: black keys ▸';b.dataset.a='pblacks';
          ov.querySelector('.lRow').prepend(b);}}
      else lf().textContent=(PN[s]?PN[s]:'a black key')+`. ${PN[t]} is ${HINT[t]}.`;};}

  function pianoBlacks(){stopJam();setLC('piano');
    ov.innerHTML=`<div class="lCard"><h3>the black keys</h3>
      <p class="lSub">the in-between notes. \u266f means one up. \u266d means one down. try them.</p>
      ${pianoHTML(PN)}
      <div class="lFeed" id="lFeed">C\u266f sits between C and D — the same key is also D\u266d.</div>
      <div class="lRow"><button class="btn primary" data-a="crs" data-c="chords">next: chords \u25b8</button><button class="btn" data-a="home">\u2039 back</button></div></div>`;
    decorate([1,3,6,8,10]);onKey=s=>pianoPlay(s);}
  // ============ course 2: chords ============
  const CHORDS=[
    ['C major','bright and happy',[0,4,7],'C · E · G'],
    ['C minor','middle note down one key — now it is sad',[0,3,7],'C · E♭ · G'],
    ['C sus4','middle note up to F — it wants to move',[0,5,7],'C · F · G'],
    ['C sus2','middle note down to D — open sky',[0,2,7],'C · D · G'],
    ['C diminished','minor + top note down — spooky',[0,3,6],'C · E♭ · G♭'],
    ['C augmented','major + top note up — like a dream',[0,4,8],'C · E · G♯'],
    ['C major 7','major + one more note — warm jazz',[0,4,7,11],'C · E · G · B'],
    ['C minor 7','minor + one more note — smooth',[0,3,7,10],'C · E♭ · G · B♭'],
    ['C7','major + a low 7 — blues power',[0,4,7,10],'C · E · G · B♭']
  ];
  let cIdx=0;
  function chordCourse(i){stopJam();cIdx=Math.max(0,Math.min(CHORDS.length-1,i||0));
    const[name,desc,tones,spell]=CHORDS[cIdx];
    ov.innerHTML=`<div class="lCard"><h3>chords · ${name}</h3>
      <p class="lSub">${desc}.</p>
      ${pianoHTML(PN)}
      <div class="lFeed">${spell}</div>
      <div class="lRow">
        <button class="btn primary" data-a="strum">▸ hear it</button>
        ${cIdx>0?`<button class="btn" data-a="crs" data-c="chords" data-i="${cIdx-1}">◂</button>`:''}
        ${cIdx<CHORDS.length-1?`<button class="btn primary" data-a="crs" data-c="chords" data-i="${cIdx+1}">next ▸</button>`:''}
        <button class="btn" data-a="home">‹ back</button></div></div>`;
    if((prog.ch|0)<cIdx+1){prog.ch=cIdx+1;saveP();}
    decorate(tones);setLC('chords');
    const prev=cIdx>0?CHORDS[cIdx-1][2]:null;
    const moved=prev?tones.filter(x=>!prev.includes(x)):[];
    moved.forEach(s=>{const k=ov.querySelector(`.pxKeys [data-s="${s}"]`);if(k)k.classList.add('chg');});
    onKey=s=>{pianoPlay(s);if(moved.includes(s))lf().textContent=CHORDS[cIdx][3]+' — that is the note that moved.';};}
  function strum(){const tones=CHORDS[cIdx][2];
    tones.forEach((s,i)=>setTimeout(()=>pianoPlay(s,92),i*150));
    setTimeout(()=>tones.forEach(s=>pianoPlay(s,80)),tones.length*150+520);}

  // ============ course 3: intervals ============
  const IVS=[[2,'2nd','neighbors'],[4,'3rd','sweet'],[5,'4th','a jump'],[7,'5th','strong'],
    [9,'6th','warm'],[11,'7th','leaning'],[12,'octave','same name, higher']];
  let ivRound=0,ivAns=null,ivSess=0;
  function ivPool(){return ivRound<4?[IVS[0],IVS[3]]:ivRound<8?[IVS[0],IVS[1],IVS[3],IVS[6]]:IVS;}
  function ivPlay(){pianoPlay(0,90);setTimeout(()=>pianoPlay(ivAns[0],90),650);}
  function ivEnd(){stopJam();winJingle();
    ov.innerHTML=`<div class="lCard"><h3>session complete</h3>
      <div class="confetti">${Array.from({length:13},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div>
      <div style="width:96px;height:96px;margin:10px auto">${pixSlime('#ffd3a8','wow',{cap:1})}</div>
      <div class="lFeed">7 distances heard. good ears.</div>
      <div class="lRow"><button class="btn primary" data-a="crs" data-c="intervals">again \u25b8</button><button class="btn" data-a="home">\u2039 back</button></div></div>`;}
  function ivCourse(cont){stopJam();setLC('intervals');
    if(!cont)ivSess=0;
    if(ivSess>=7){ivEnd();return;}
    ivSess++;ivRound++;
    const pool=ivPool();ivAns=pool[Math.floor(Math.random()*pool.length)];
    let opts=[...pool].sort(()=>Math.random()-0.5).slice(0,Math.min(3,pool.length));
    if(!opts.includes(ivAns))opts[Math.floor(Math.random()*opts.length)]=ivAns;
    ivPlay();
    ov.innerHTML=`<div class="lCard"><h3>intervals \u00b7 ${ivSess} of 7</h3>
      <p class="lSub">two notes — how far apart?</p>
      ${pianoHTML(PN)}
      <div class="lRow">${opts.map(o=>`<button class="btn" data-a="ivpick" data-s="${o[0]}">${o[1]} · ${o[2]}</button>`).join('')}</div>
      <div class="lFeed" id="lFeed"></div>
      <div class="lRow"><button class="btn" data-a="ivplay">↻ again</button><button class="btn" data-a="home">‹ back</button></div></div>`;
    decorate([0]);onKey=s=>pianoPlay(s);}
  function ivPick(s){const f=lf();
    if(s===ivAns[0]){decorate([0,ivAns[0]]);prog.iv=(prog.iv|0)+1;saveP();
      f.textContent=`yes — a ${ivAns[1]}.`;
      const nx=document.createElement('button');nx.className='btn primary';
      nx.textContent=ivSess>=7?'finish ▸':'next ▸';nx.dataset.a='crs';nx.dataset.c='intervals';nx.dataset.i='1';
      ov.querySelector('.lRow').prepend(nx);}
    else{const g=IVS.find(v=>v[0]===s);
      f.textContent=`that was a ${g[1]}. listen again.`;
      setTimeout(()=>{pianoPlay(0,80);setTimeout(()=>pianoPlay(s,80),550);},100);
      setTimeout(ivPlay,1800);}}

  // ============ course 4: the seven modes ============
  const M7=[
   {k:'major',n:'ionian (major)',scene:'sunny meadow',feel:'bright and happy',ch:4,cam:[82,57]},
   {k:'dorian',n:'dorian',scene:'twilight forest',feel:'cool and mysterious',ch:5,cam:[58,50]},
   {k:'phrygian',n:'phrygian',scene:'desert oasis',feel:'far away and dramatic',ch:1,cam:[36,61]},
   {k:'lydian',n:'lydian',scene:'floating islands',feel:'floating and curious',ch:3,cam:[48,37]},
   {k:'mixolydian',n:'mixolydian',scene:'vintage carnival',feel:'warm and playful',ch:6,cam:[78,57]},
   {k:'minor',n:'aeolian (minor)',scene:'rainy city',feel:'quiet and sad',ch:5,cam:[22,58]},
   {k:'locrian',n:'locrian',scene:'fractured mirror',feel:'strange and uneasy',ch:4,cam:[46,52]}
  ];

  // ---------- pixel-art scene generator: real pixels, dithered skies, shaded sprites, 7 seeds per mode ----------
  function RNG(seed){let a=seed;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
  const PXW=96,PXH=72;
  function bandSky(c,ramp){const n=ramp.length,bh=Math.ceil(PXH/n);
    ramp.forEach((col,i)=>{c.fillStyle=col;c.fillRect(0,i*bh,PXW,bh);});
    for(let i=1;i<n;i++){const y=i*bh;c.fillStyle=ramp[i-1];
      for(let x=0;x<PXW;x++){if((x+i)%2===0)c.fillRect(x,y,1,1);if((x+i)%4===1)c.fillRect(x,y+1,1,1);}}}
  function hills(c,base,amp,ph,ramp){for(let x=0;x<PXW;x++){
    const y=Math.round(base+Math.sin(x/16+ph)*amp);
    c.fillStyle=ramp[0];c.fillRect(x,y,1,2);
    c.fillStyle=ramp[1];c.fillRect(x,y+2,1,6);
    c.fillStyle=ramp[2];c.fillRect(x,y+8,1,PXH-y-8);}}
  function disc(c,cx,cy,r,core,edge){for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){const d=x*x+y*y;
    if(d<=r*r){c.fillStyle=(d>(r-1.3)*(r-1.3))?edge:core;c.fillRect(cx+x,cy+y,1,1);}}}
  function pine(c,tx,ty,h,cols){for(let r=0;r<h;r++){const w=1+(r*0.75|0);
    c.fillStyle=cols[1];c.fillRect(tx-w,ty+r,w*2+1,1);
    c.fillStyle=cols[0];c.fillRect(tx-w,ty+r,1,1);
    c.fillStyle=cols[2];c.fillRect(tx+w,ty+r,1,1);}
    c.fillStyle='#4a3626';c.fillRect(tx-1,ty+h,2,3);}
  function slimePx(c,x,y,fill){const rows=[[3,2],[2,4],[1,6],[1,6],[0,8],[0,8],[0,8],[1,6]];
    rows.forEach((rw,i)=>{c.fillStyle=fill;c.fillRect(x+rw[0],y+i,rw[1],1);});
    c.fillStyle='rgba(44,39,73,.45)';rows.forEach((rw,i)=>{c.fillRect(x+rw[0],y+i,1,1);c.fillRect(x+rw[0]+rw[1]-1,y+i,1,1);});
    c.fillRect(x+3,y,2,1);c.fillRect(x+1,y+7,6,1);
    c.fillStyle='#3c3456';c.fillRect(x+2,y+3,1,1);c.fillRect(x+5,y+3,1,1);c.fillRect(x+3,y+5,2,1);
    c.fillStyle='rgba(255,255,255,.8)';c.fillRect(x+2,y+1,1,1);}
  function stars(c,rnd,n,yMax,col){for(let i=0;i<n;i++){c.fillStyle=col;
    c.fillRect((rnd()*PXW)|0,(rnd()*yMax)|0,1,1);}}
  const GEN={
   major:(c,rnd)=>{bandSky(c,['#7ec8f7','#93d4f9','#aadffb','#c9edff']);
     const sx=20+(rnd()*56|0);disc(c,sx,14+(rnd()*6|0),7,'#ffd98a','#f5b74f');
     for(let i=0;i<3;i++){const cx=(rnd()*80|0)+8,cy=8+(rnd()*18|0);c.fillStyle='#ffffff';
       c.fillRect(cx-5,cy,10,2);c.fillRect(cx-3,cy-1,6,1);c.fillRect(cx-2,cy+2,5,1);}
     hills(c,44+(rnd()*5|0),3+rnd()*2,rnd()*6,['#a5e58c','#8ed474','#74b95c']);
     hills(c,56+(rnd()*4|0),2.5,rnd()*6,['#8ed474','#79c261','#5fa04a']);
     for(let i=0;i<5;i++){const fx=(rnd()*88|0)+4,fy=58+(rnd()*10|0);
       c.fillStyle=['#ffb6d6','#fff','#ffe39c'][i%3];c.fillRect(fx,fy,2,2);c.fillStyle='#fff';c.fillRect(fx,fy,1,1);}
     slimePx(c,78,52,'#9fe6cf');},
   dorian:(c,rnd)=>{bandSky(c,['#2e2753','#3b3266','#4c4180','#5d5199']);
     disc(c,64+(rnd()*20|0),12+(rnd()*5|0),6,'#f2e8cc','#d8cba6');
     stars(c,rnd,8,26,'#cfc4ef');
     const n=3+(rnd()*2|0);for(let i=0;i<n;i++){const tx=10+(rnd()*76|0);pine(c,tx,20+(rnd()*14|0),16+(rnd()*8|0),['#3f7a60','#25543f','#173629']);}
     c.fillStyle='#1c1738';c.fillRect(0,62,PXW,10);
     for(let i=0;i<4;i++){c.fillStyle='#ffe39c';c.fillRect((rnd()*88|0)+4,38+(rnd()*20|0),1,1);}
     c.fillStyle='#ffe39c';c.fillRect(56,49,2,2);c.fillRect(61,49,2,2);},
   phrygian:(c,rnd)=>{bandSky(c,['#1d1a40','#272252','#332c66']);
     stars(c,rnd,12,30,'#efe8ff');
     const mx=62+(rnd()*22|0);disc(c,mx,12,6,'#f4ead0','#d8cba6');disc(c,mx-4,10,6,'#1d1a40','#1d1a40');
     hills(c,38+(rnd()*4|0),3,rnd()*6,['#efd0a0','#e0bd85','#c9a366']);
     hills(c,54+(rnd()*4|0),2.5,rnd()*6,['#dcb87e','#cfa96e','#b28e55']);
     const px2=64+(rnd()*16|0);c.fillStyle='#6d4c33';c.fillRect(px2,30,2,12);
     c.fillStyle='#3f8a5f';c.fillRect(px2-6,28,6,2);c.fillRect(px2+2,28,7,2);c.fillRect(px2-4,25,4,2);c.fillRect(px2+2,25,5,2);c.fillStyle='#2e6b47';c.fillRect(px2-6,30,5,1);c.fillRect(px2+3,30,5,1);
     c.fillStyle='#9fe6cf';c.fillRect(28,60,18,5);c.fillStyle='#c9f2e4';c.fillRect(30,60,4,1);c.fillRect(40,62,3,1);
     c.fillStyle='#3c3456';c.fillRect(33,61,1,1);c.fillRect(38,61,1,1);c.fillRect(35,63,2,1);},
   lydian:(c,rnd)=>{bandSky(c,['#c6aff0','#d6bff5','#e7d3fa','#f7e6ff']);
     stars(c,rnd,7,60,'#ffffff');
     const isl=(ix,iy,w)=>{c.fillStyle='#9ade82';c.fillRect(ix-w,iy,w*2,3);c.fillStyle='#b7ec9e';c.fillRect(ix-w,iy,w*2,1);
       for(let r=0;r<6;r++){const ww=(w-1)*(1-r/6)|0;c.fillStyle=r<3?'#a97c55':'#7d5539';c.fillRect(ix-ww,iy+3+r,ww*2,1);}
       c.fillStyle='#6cb055';c.fillRect(ix-w,iy+2,2,2);c.fillRect(ix+w-2,iy+2,2,2);};
     isl(24+(rnd()*10|0),20+(rnd()*6|0),13);isl(70+(rnd()*10|0),46+(rnd()*8|0),10);
     c.fillStyle='#ffffff';c.fillRect(10,58,12,2);c.fillRect(60,10,10,2);
     slimePx(c,44,32,'#9fe6cf');},
   mixolydian:(c,rnd)=>{bandSky(c,['#ff9f68','#ffb27a','#ffc793','#ffdcae']);
     const wx=18+(rnd()*8|0),wy=28;c.strokeStyle='#a86a8a';c.lineWidth=1;
     c.beginPath();c.arc(wx,wy,13,0,7);c.stroke();
     for(let i=0;i<6;i++){const a=i*Math.PI/3+rnd()*0.3;c.beginPath();c.moveTo(wx,wy);c.lineTo(wx+Math.cos(a)*13,wy+Math.sin(a)*13);c.stroke();
       c.fillStyle='#c98aa8';c.fillRect(wx+Math.cos(a)*13-1,wy+Math.sin(a)*13-1,3,3);}
     c.fillStyle='#e0a866';c.fillRect(0,56,PXW,16);c.fillStyle='#c98f52';c.fillRect(0,64,PXW,8);
     const tx=56+(rnd()*8|0);
     for(let r=0;r<16;r++){const w=8+r;c.fillStyle=(r<3)?'#ea6f80':'#ff8f9e';c.fillRect(tx-w/2|0,40+r,w,1);}
     for(let s=0;s<3;s++){c.fillStyle='#fff2e8';c.fillRect(tx-8+s*7,44,3,12);}
     c.fillStyle='#9fe6cf';c.fillRect(tx-1,34,4,3);c.fillStyle='#e0576f';c.fillRect(tx-1,34,1,6);
     slimePx(c,74,52,'#9fe6cf');c.fillStyle='#ffb6d6';disc(c,86,44,3,'#ffb6d6','#ea6f80');c.fillStyle='#ea6f80';c.fillRect(85,47,1,6);},
   minor:(c,rnd)=>{bandSky(c,['#1b2340','#222c50','#2a3660']);
     const sk=(depth,col)=>{let x=0;while(x<PXW){const w=8+(rnd()*10|0),h=20+(rnd()*22|0);
       c.fillStyle=col;c.fillRect(x,PXH-8-h,w,h);
       if(depth){for(let wy=0;wy<h-4;wy+=5)for(let wx2=2;wx2<w-2;wx2+=4){if(rnd()<0.28){c.fillStyle='#ffdf8a';c.fillRect(x+wx2,PXH-8-h+wy+2,2,2);c.fillStyle=col;}}}
       x+=w+2;}};
     sk(false,'#12182e');sk(true,'#0c1122');
     c.fillStyle='#8fa8d9';for(let i=0;i<10;i++){const rx=(rnd()*PXW)|0,ry=(rnd()*40)|0;c.fillRect(rx,ry,1,3);c.fillRect(rx-1,ry+3,1,2);}
     c.fillStyle='#0a0e1e';c.fillRect(0,PXH-8,PXW,8);
     c.fillStyle='rgba(255,223,138,.25)';c.fillRect(30,PXH-7,10,2);c.fillRect(66,PXH-6,8,2);
     c.fillStyle='#ffb6d6';c.fillRect(17,46,12,2);c.fillRect(19,44,8,2);c.fillStyle='#ea6f80';c.fillRect(22,48,1,5);
     slimePx(c,18,53,'#9fe6cf');},
   locrian:(c,rnd)=>{bandSky(c,['#363a61','#424772','#4f5483','#5d6294']);
     for(let i=0;i<6;i++){const sx2=6+(rnd()*76|0),sy=6+(rnd()*50|0),w=10+(rnd()*14|0),h=8+(rnd()*12|0);
       c.fillStyle=['#cfe0ff','#aebfe8','#8fa0cf'][i%3];c.globalAlpha=0.55;
       c.beginPath();c.moveTo(sx2,sy+h*0.3);c.lineTo(sx2+w*0.6,sy);c.lineTo(sx2+w,sy+h*0.6);c.lineTo(sx2+w*0.3,sy+h);c.closePath();c.fill();
       c.globalAlpha=1;c.fillStyle='#e8eeff';c.fillRect(sx2+(w*0.6|0),sy,1,2);}
     c.strokeStyle='rgba(232,238,255,.8)';c.lineWidth=1;
     c.beginPath();c.moveTo(48+(rnd()*8|0),0);c.lineTo(44,28);c.lineTo(52,52);c.lineTo(46,PXH);c.stroke();
     c.beginPath();c.moveTo(0,40);c.lineTo(30,44);c.lineTo(64,38);c.lineTo(PXW,46);c.stroke();
     slimePx(c,38,48,'#9fe6cf');c.fillStyle='#363a61';c.fillRect(46,46,2,12);slimePx(c,50,50,'#9fe6cf');},
  };
  const SCACHE={};
  function sceneURL(i,v){const key=i+'_'+v;if(SCACHE[key])return SCACHE[key];
    const cv2=document.createElement('canvas');cv2.width=PXW;cv2.height=PXH;const c=cv2.getContext('2d');
    GEN[M7[i].k](c,RNG(4200+i*77+v*13));
    return SCACHE[key]=cv2.toDataURL();}
  function sceneIMG(i,v,extra){return `<div style="position:relative">
    <img src="${sceneURL(i,v||0)}" style="width:100%;display:block;image-rendering:pixelated;border-radius:12px" alt="">
    ${extra?`<svg viewBox="0 0 96 72" style="position:absolute;inset:0;width:100%;height:100%">${extra}</svg>`:''}</div>`;}

  // ---------- iconic public-domain melodies (traditional / pre-1830 comps; two originals labeled ours) ----------
  const MEL={
   major:{t:'ode to joy',seq:[[2,1],[2,1],[3,1],[4,1],[4,1],[3,1],[2,1],[1,1],[0,1],[0,1],[1,1],[2,1],[2,1.5],[1,.5],[1,2]]},
   dorian:{t:'drunken sailor',seq:[[7,.5],[7,.5],[7,.5],[7,.5],[7,.5],[7,.5],[7,.5],[7,.5],[6,.5],[6,.5],[6,.5],[6,.5],[6,.5],[6,.5],[6,.5],[6,.5],[7,.5],[7,.5],[7,.5],[7,.5],[7,.5],[8,.5],[9,.5],[10,.5],[11,1],[7,1.5]]},
   phrygian:{t:'sakura sakura',seq:[[3,1],[3,1],[4,2],[3,1],[3,1],[4,2],[3,1],[4,1],[5,1],[4,1],[3,1],[4,.5],[3,.5],[1,2],[0,2]]},
   lydian:{t:'cloud waltz (ours)',seq:[[0,1],[2,1],[4,1],[3,2],[4,1],[6,1],[4,1],[3,2],[2,1],[3,1],[4,1],[2,1],[0,2]]},
   mixolydian:{t:'old joe clark',seq:[[4,.5],[4,.5],[4,1],[5,.5],[6,1],[6,.5],[5,.5],[4,.5],[2,1],[1,.5],[2,.5],[4,1],[6,1],[4,2]]},
   minor:{t:'god rest ye merry gentlemen',seq:[[0,1],[0,1],[4,1],[4,1],[3,1],[2,1],[1,1],[0,1],[1,1],[2,1],[3,1],[4,1],[2,1],[1,1],[0,2]]},
   locrian:{t:'the wobble house (ours)',seq:[[0,1],[1,1],[0,1],[4,1],[3,1],[4,.5],[3,.5],[1,1],[0,1],[4,2],[0,2]]}
  };
  let jamT=[],loopIv=null,prevScale=null,lastAud=''; // lastAud = "modeIdx:kind" — the never-twice-in-a-row memory
  function setModeScale(k){if(!prevScale)prevScale={s:S.scale,r:S.root};S.scale=k;S.root=60;}
  function stopJam(){rhStop();jamT.forEach(clearTimeout);jamT=[];if(loopIv){clearInterval(loopIv);loopIv=null;}
    if(prevScale){S.scale=prevScale.s;S.root=prevScale.r;prevScale=null;}}
  function jn(deg,dt,vel){jamT.push(setTimeout(()=>{if(!AC)return;const c=centsForDegree(deg);
    lessonNote(freqFromCents(c),vel||84);},dt));}
  function playTune(i){stopJam();setModeScale(M7[i].k);lastAud=i+':t';
    const m=MEL[M7[i].k],step=310;let t=240;
    jn(0,20,58);jn(4,20,46);
    m.seq.forEach(([d,l],ix)=>{jn(d,t,84+(ix%4===0?10:0));t+=l*step;});
    jn(0,t+80,56);jn(4,t+80,44);}
  function playRiff(i){stopJam();setModeScale(M7[i].k);lastAud=i+':r';
    const ch=M7[i].ch,step=300;
    jn(0,20,64);jn(4,20,52);
    [0,2,4,ch,4,2,ch,0,2,4,ch,4,7,ch,4,0].forEach((d,ix)=>jn(d,240+ix*step,80+(ix%4===0?12:0)));}
  function playJam(i,mode){ // mode 2=song, 1=riff, else pick — but NEVER the exact same track twice in a row
    let k=mode===2?'t':mode===1?'r':(Math.random()<0.55?'t':'r');
    if((i+':'+k)===lastAud)k=(k==='t')?'r':'t';
    (k==='t'?playTune:playRiff)(i);}
  function startBacking(i){stopJam();setModeScale(M7[i].k);
    const beat=()=>{jn(0,20,58);jn(4,640,44);jn(0,1280,50);jn(2,1900,40);};
    beat();loopIv=setInterval(beat,2560);}
  let prog={g:{},cam:{}};try{prog=Object.assign(prog,JSON.parse(localStorage.getItem('slimehedron-learn')||'{}'));}catch(e){}
  const saveP=()=>{try{localStorage.setItem('slimehedron-learn',JSON.stringify(prog));}catch(e){}};
  let rounds=0,lastAns=-1;
  function stickers(){return '<div class="lStickers">'+M7.map(m=>`<span class="lStk${(prog.g[m.k]|0)>=3?' got':''}" title="${m.n}">${(prog.g[m.k]|0)>=3?'●':'○'}</span>`).join('')+'</div>';}
  // difficulty: choices per round, session length (research: 5-10 items; ears fatigue fast), and
  // how CONTRASTING the options must be. brightness order: lydian>major>mixolydian>dorian>minor>phrygian>locrian
  const BRIGHT=[2,0,-2,3,1,-1,-3]; // per M7 index
  const DIFFS={easy:{ch:2,len:5,gap:4,song:1},med:{ch:3,len:7,gap:2,song:0.65},hard:{ch:4,len:10,gap:1,song:0.45}};
  let diff='easy',sessN=0;
  function matchMenu(){stopJam();ov.innerHTML=`<div class="lCard">
    <h3>match</h3>
    <p class="lSub">how tricky?</p>
    <div class="lBtns">
      <button class="btn big" data-a="startsess" data-d="easy" style="background:linear-gradient(150deg,#d2f5e8,#e8fbf4)">easy \u00b7 \u25cf\u25cb\u25cb \u00b7 5 rounds</button>
      <button class="btn big" data-a="startsess" data-d="med" style="background:linear-gradient(150deg,#ffe9d9,#fff4ea)">medium \u00b7 \u25cf\u25cf\u25cb \u00b7 7 rounds</button>
      <button class="btn big" data-a="startsess" data-d="hard" style="background:linear-gradient(150deg,#ffd9e5,#ffedf4)">hard \u00b7 \u25cf\u25cf\u25cf \u00b7 10 rounds</button>
    </div>
    <div class="lRow"><button class="btn" data-a="crs" data-c="modes">\u2039 back</button></div></div>`;}
  function winJingle(){[0,400,700,1200,1600,1200].forEach((c,i)=>setTimeout(()=>lessonNote(261.63*Math.pow(2,c/1200),104,0.8),i*95));}
  function sessEnd(){stopJam();const D=DIFFS[diff];winJingle();
    ov.innerHTML=`<div class="lCard"><h3>session complete</h3>
      <div class="confetti">${Array.from({length:13},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div>
      <div style="width:96px;height:96px;margin:10px auto">${pixSlime('#9fe6cf','wow',{cap:1})}</div>
      <div class="lFeed">${D.len} sounds matched. good ears.</div>
      ${stickers()}
      <div class="lRow">
        <button class="btn primary" data-a="startsess" data-d="${diff}">again \u25b8</button>
        ${diff!=='hard'?`<button class="btn" data-a="startsess" data-d="${diff==='easy'?'med':'hard'}">trickier \u25b8</button>`:''}
        <button class="btn" data-a="crs" data-c="modes">\u2039 back</button></div></div>`;}
  function mHome(){stopJam();setLC('modes');onKey=null;ov.innerHTML=`<div class="lCard">
    <h3>the seven modes</h3>
    <p class="lSub">every mode is a mood.</p>
    <div class="lBtns">
      <button class="btn primary big" data-a="listen">▸ listen — the seven moods</button>
      <button class="btn big" data-a="matchmenu">? match — sound to scene</button>
      <button class="btn big" data-a="mcreate">♪ compose — score a scene</button>
    </div>${stickers()}
    <div class="lRow"><button class="btn" data-a="home">‹ back</button></div></div>`;}
  function listen(i){i=i||0;stopJam();playTune(i);const m=M7[i];
    ov.innerHTML=`<div class="lCard"><h3>${i+1} of 7 · ${m.n}</h3>
      <div class="lBig">${sceneIMG(i,Math.floor(Math.random()*7))}</div>
      <div class="lFeed">"${MEL[m.k].t}" — ${m.feel}</div>
      <div class="lRow">${i>0?'<button class="btn" data-a="listen" data-i="'+(i-1)+'">◂</button>':''}
      <button class="btn" data-a="replay" data-i="${i}" data-r="2">↻ again</button>
      ${i<6?'<button class="btn primary" data-a="listen" data-i="'+(i+1)+'">next ▸</button>':'<button class="btn primary" data-a="crs" data-c="modes">done</button>'}</div></div>`;}
  function guess(){stopJam();rounds++;const D=DIFFS[diff];
    let ans=Math.floor(Math.random()*7);
    if(ans===lastAns)ans=(ans+1+Math.floor(Math.random()*6))%7;
    lastAns=ans;
    // decoys must CONTRAST at easy levels: far-apart brightness only, tightening as difficulty rises
    let pool=[];for(let c=0;c<7;c++)if(c!==ans&&Math.abs(BRIGHT[c]-BRIGHT[ans])>=D.gap)pool.push(c);
    if(pool.length<D.ch-1)for(let c=0;c<7;c++)if(c!==ans&&!pool.includes(c))pool.push(c); // relax if the matrix runs dry
    pool.sort(()=>Math.random()-0.5);
    const opts=[ans,...pool.slice(0,D.ch-1)].sort(()=>Math.random()-0.5);
    const rf=Math.random()<D.song?2:1; // easy sessions always get the song — the most tellable version
    playJam(ans,rf);
    ov.innerHTML=`<div class="lCard"><h3>${sessN+1} of ${D.len}</h3>
      <p class="lSub">which scene fits the sound?</p>
      <div class="lScenes">${opts.map(o=>`<div class="lScene" data-pick="${o}" data-ans="${ans}">${sceneIMG(o,Math.floor(Math.random()*7))}<b>${M7[o].scene}</b></div>`).join('')}</div>
      <div class="lFeed" id="lFeed"></div>
      <div class="lRow"><button class="btn" data-a="replay" data-i="${ans}" data-r="${rf}">\u21bb again</button><button class="btn" data-a="crs" data-c="modes">\u2039 back</button></div></div>`;}
  function pick(el){const p=+el.dataset.pick,a=+el.dataset.ans,f=lf();
    if(p===a){const k=M7[a].k;prog.g[k]=(prog.g[k]|0)+1;saveP();
      f.textContent=`yes — ${M7[a].n}. ${M7[a].feel}.`;
      ov.querySelectorAll('.lScene').forEach(s=>{if(+s.dataset.pick!==a)s.classList.add('dim');});
      const row=ov.querySelector('.lRow');
      sessN++;
      const nx=document.createElement('button');nx.className='btn primary';
      if(sessN>=DIFFS[diff].len){nx.textContent='finish \u25b8';nx.dataset.a='sessend';}
      else{nx.textContent='next \u25b8';nx.dataset.a='guess';}
      row.prepend(nx);
    }else{f.textContent=`this scene sounds ${M7[p].feel}. listen again.`;el.classList.add('dim');playJam(a);}} // replay auto-flips song/riff — never the same twice
  function mcreate(pickI){stopJam();
    if(pickI==null){ov.innerHTML=`<div class="lCard"><h3>compose</h3>
      <p class="lSub">pick a scene. every key fits.</p>
      <div class="lScenes">${M7.map((m,i)=>`<div class="lScene" data-cre="${i}">${sceneIMG(i,Math.floor(Math.random()*7))}<b>${m.scene}</b></div>`).join('')}</div>
      <div class="lRow"><button class="btn" data-a="crs" data-c="modes">‹ back</button></div></div>`;return;}
    const m=M7[pickI];startBacking(pickI);
    const keys=[0,1,2,3,4,5,6,7].map(d=>{const c=degRGB(d%7);
      return `<button class="pKey" data-deg="${d}" style="background:rgb(${(c[0]+(255-c[0])*.3)|0},${(c[1]+(255-c[1])*.3)|0},${(c[2]+(255-c[2])*.3)|0})">${d+1}</button>`;}).join('');
    ov.innerHTML=`<div class="lCard"><h3>${m.n}</h3>
      <div class="lBig">${sceneIMG(pickI,Math.floor(Math.random()*7))}</div>
      <div class="pPiano">${keys}</div>
      <div class="lFeed">play the picture.</div>
      <div class="lRow"><button class="btn" data-a="mcreate">other scenes</button><button class="btn" data-a="crs" data-c="modes">‹ back</button></div></div>`;}

  // ============ course menu ============
  const icoBeat=`<svg class="crsIco" viewBox="0 0 44 34"><circle cx="22" cy="17" r="5" fill="#ffd3a8" stroke="#5a4f78" stroke-width="1.6"/><circle cx="22" cy="17" r="10" fill="none" stroke="#b388f0" stroke-width="2" opacity=".7"/><circle cx="22" cy="17" r="15" fill="none" stroke="#b388f0" stroke-width="2" opacity=".35"/></svg>`;
  const PANES=[
    ['rhythm','linear-gradient(150deg,#d2f5e8,#e8fbf4)',icoBeat,34,0,'#9fe6cf'],
    ['piano','linear-gradient(150deg,#e7dbff,#f3edff)',icoKeys([]),44,1,'#c4a9f5'],
    ['intervals','linear-gradient(150deg,#ffe9d9,#fff4ea)',icoKeys([0,4],1),52,0,'#ffd3a8'],
    ['chords','linear-gradient(150deg,#cfe2ff,#e9f2ff)',icoKeys([0,2,4]),60,1,'#a6c8ff'],
    ['modes','linear-gradient(150deg,#ffe0ee,#fff0f7)',icoModes,68,0,'#ffb6d6']
  ];
  function crsProg(c){const T={rhythm:[prog.r|0,8],piano:[prog.p|0,8],intervals:[Math.min(prog.iv|0,10),10],chords:[prog.ch|0,9],modes:[M7.filter(m=>(prog.g[m.k]|0)>=3).length,7]}[c];
    const f=Math.round(5*Math.min(1,T[0]/T[1]));
    return `<span class="crsDots">${'\u25cf'.repeat(f)}${'\u25cb'.repeat(5-f)}</span>`;}
  const ov=document.createElement('div');ov.id='learnOverlay';ov.hidden=true;document.body.appendChild(ov);
  function home(){stopJam();onKey=null;let lc='';try{lc=localStorage.getItem('slimehedron-lastcourse')||'';}catch(e){}
    ov.innerHTML=`<div class="lCard">
    <h3>learn</h3>
    ${lc?`<div class="lRow" style="margin-bottom:10px"><button class="btn primary" data-a="crs" data-c="${lc}">continue \u00b7 ${lc} \u25b8</button></div>`:''}
    <div class="lBtns">${PANES.map(p=>`<div class="crsPane" data-a="crs" data-c="${p[0]}" style="background:${p[1]}">
      ${p[2]}<span style="flex:1"><b>${p[0]}</b>${crsProg(p[0])}</span><span class="crsSl" style="width:${p[3]}px;height:${p[3]}px">${pixSlime(p[5],'happy',{cap:1,girl:p[4]})}</span></div>`).join('')}
    </div></div>`;}
  ov.addEventListener('pointerdown',e=>{
    if(e.target.closest('#rhPad')){rhTap();return;}
    const pk=e.target.closest('.pKey');
    if(pk){const c=centsForDegree(+pk.dataset.deg);lessonNote(freqFromCents(c),96);
      pk.style.transform='translateY(3px)';setTimeout(()=>pk.style.transform='',90);return;}
    const key=e.target.closest('.pxW,.pxB');
    if(key&&onKey)onKey(+key.dataset.s);
    else if(key)pianoPlay(+key.dataset.s);});
  ov.addEventListener('click',e=>{
    const sc=e.target.closest('.lScene[data-pick]');if(sc){pick(sc);return;}
    const cr=e.target.closest('.lScene[data-cre]');if(cr){mcreate(+cr.dataset.cre);return;}
    const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a;
    if(a==='home')home();
    else if(a==='crs'){const c=b.dataset.c;
      if(c==='rhythm')rhythmCourse();else if(c==='piano')pianoCourse();else if(c==='chords')chordCourse(+(b.dataset.i||0));
      else if(c==='intervals')ivCourse(!!b.dataset.i);else mHome();}
    else if(a==='rhfast')rhythmCourse(126);
    else if(a==='pblacks')pianoBlacks();
    else if(a==='strum')strum();
    else if(a==='ivpick')ivPick(+b.dataset.s);else if(a==='ivplay')ivPlay();
    else if(a==='listen')listen(+(b.dataset.i||0));else if(a==='replay')playJam(+b.dataset.i,+(b.dataset.r||0));
    else if(a==='matchmenu')matchMenu();
    else if(a==='startsess'){diff=b.dataset.d||'easy';sessN=0;guess();}
    else if(a==='sessend')sessEnd();
    else if(a==='guess')guess();else if(a==='mcreate')mcreate();});
  function enter(){
    if(S.slimeMode)$id('slimeBig').click();if(drumOn)$id('drumBtn').click();if(bandOn)$id('bandBtn').click();
    balls.length=0;initAudio();if(AC&&AC.state==='suspended')AC.resume();if(!S.playing)setPlaying(true);
    ov.hidden=false;home();}
  function exit(){stopJam();onKey=null;ov.hidden=true;}
  return {enter,exit};
})();
// (no auto-enter on load: the three doors always come first)

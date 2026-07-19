// ================= slimehedron LEARN MODE =================
// four courses on colored panes, taught by capped slime teachers who grow with the difficulty.
// language rule: real music terms, simplest possible sentences — built to translate cleanly.
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
    const gw=[[14,8],[16,9]].map(([s,i])=>`<div class="pxW gh" data-s="${s}"><span></span>${strip(i%7)}</div>`).join(''); // the next octave peeks in — the picture repeats
    const b=BK.map(([s,wi])=>`<div class="pxB" data-s="${s}" style="left:${wi*33+21}px"></div>`).join('');
    const gb=[[13,7],[15,8]].map(([s,wi])=>`<div class="pxB gh" data-s="${s}" style="left:${wi*33+21}px"></div>`).join('');
    return `<div class="pxPiano"><div class="pxKeys">${w}${gw}${b}${gb}</div></div>`;
  }
  function pianoPlay(s,vel){const f=440*Math.pow(2,(60+s-69)/12);playSynth(f,vel||96,0.7);}
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

  // ============ wordless lesson icons: pressed keys tell the story ============
  function icoKeys(marks,arc){let k='';
    for(let i=0;i<7;i++){const on=marks.includes(i);
      k+=`<rect x="${2+i*6}" y="10" width="6" height="20" fill="${on?'#ffd3a8':'#fff'}" stroke="#5a4f78" stroke-width="1.6"/>`;
      if(on)k+=`<rect x="${3.5+i*6}" y="23" width="3" height="4" fill="#9fe6cf" stroke="#5a4f78" stroke-width="0.9"/>`;}
    let a='';if(arc)a=`<path d="M ${5+marks[0]*6} 10 Q ${(10+(marks[0]+marks[1])*6)/2} 2 ${5+marks[1]*6} 10" fill="none" stroke="#b388f0" stroke-width="2.4" stroke-linecap="round"/>`;
    return `<svg class="crsIco" viewBox="0 0 44 34">${k}${a}</svg>`;}
  const icoModes=`<svg class="crsIco" viewBox="0 0 44 34" shape-rendering="crispEdges">
    <rect x="2" y="4" width="18" height="26" fill="#aee3ff" stroke="#5a4f78" stroke-width="1.6"/><rect x="6" y="8" width="6" height="6" fill="#ffe39c"/><rect x="4" y="24" width="14" height="4" fill="#93d97b"/>
    <rect x="24" y="4" width="18" height="26" fill="#31406b" stroke="#5a4f78" stroke-width="1.6"/><rect x="27" y="8" width="2" height="5" fill="#8fa8d9"/><rect x="32" y="13" width="2" height="5" fill="#8fa8d9"/><rect x="37" y="7" width="2" height="5" fill="#8fa8d9"/></svg>`;

  // ============ course 1: the piano ============
  const HINT={0:'left of the 2 black keys',2:'between the 2 black keys',4:'right of the 2 black keys',
    5:'left of the 3 black keys',7:'in the 3 — left side',9:'in the 3 — right side',
    11:'right of the 3 black keys',12:'left of the NEXT 2 black keys →'};
  let pIdx=0,pFound={};
  function pianoCourse(){stopJam();pIdx=0;pFound={};pianoView();}
  function pianoView(){const t=WK[pIdx];
    ov.innerHTML=`<div class="lCard"><h3>the piano</h3>
      <p class="lSub">${pIdx===0?'this is one octave. find C — '+HINT[0]+'.':'find '+PN[t]+'.'}</p>
      ${pianoHTML(pFound)}
      <div class="lFeed" id="lFeed"></div>
      <div class="lRow"><button class="btn" data-a="home">menu</button></div></div>`;
    onKey=s=>{pianoPlay(s);
      if(s===t){pFound[s]=PN[s];decorate([s]);
        if(pIdx<WK.length-1){lf().textContent=`yes — ${PN[s]}.`;pIdx++;setTimeout(pianoView,850);}
        else{onKey=null;lf().textContent='same name — one octave higher. the picture repeats forever →';
          const b=document.createElement('button');b.className='btn primary';b.textContent='next: chords ▸';b.dataset.a='crs';b.dataset.c='chords';
          ov.querySelector('.lRow').prepend(b);}}
      else lf().textContent=(PN[s]?PN[s]:'a black key')+`. ${PN[t]} is ${HINT[t]}.`;};}

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
        <button class="btn" data-a="home">menu</button></div></div>`;
    decorate(tones);onKey=null;}
  function strum(){const tones=CHORDS[cIdx][2];
    tones.forEach((s,i)=>setTimeout(()=>pianoPlay(s,92),i*150));
    setTimeout(()=>tones.forEach(s=>pianoPlay(s,80)),tones.length*150+520);}

  // ============ course 3: intervals ============
  const IVS=[[2,'2nd','neighbors'],[4,'3rd','sweet'],[5,'4th','a jump'],[7,'5th','strong'],
    [9,'6th','warm'],[11,'7th','leaning'],[12,'octave','same name, higher']];
  let ivRound=0,ivAns=null;
  function ivPool(){return ivRound<4?[IVS[0],IVS[3]]:ivRound<8?[IVS[0],IVS[1],IVS[3],IVS[6]]:IVS;}
  function ivPlay(){pianoPlay(0,90);setTimeout(()=>pianoPlay(ivAns[0],90),650);}
  function ivCourse(){stopJam();ivRound++;
    const pool=ivPool();ivAns=pool[Math.floor(Math.random()*pool.length)];
    let opts=[...pool].sort(()=>Math.random()-0.5).slice(0,Math.min(3,pool.length));
    if(!opts.includes(ivAns))opts[Math.floor(Math.random()*opts.length)]=ivAns;
    ivPlay();
    ov.innerHTML=`<div class="lCard"><h3>intervals</h3>
      <p class="lSub">two notes — how far apart?</p>
      ${pianoHTML(PN)}
      <div class="lRow">${opts.map(o=>`<button class="btn" data-a="ivpick" data-s="${o[0]}">${o[1]} · ${o[2]}</button>`).join('')}</div>
      <div class="lFeed" id="lFeed"></div>
      <div class="lRow"><button class="btn" data-a="ivplay">↻ again</button><button class="btn" data-a="home">menu</button></div></div>`;
    decorate([0]);onKey=s=>pianoPlay(s);}
  function ivPick(s){const f=lf();
    if(s===ivAns[0]){decorate([0,ivAns[0]]);
      f.textContent=`yes — a ${ivAns[1]}.`;
      const nx=document.createElement('button');nx.className='btn primary';nx.textContent='next ▸';nx.dataset.a='crs';nx.dataset.c='intervals';
      ov.querySelector('.lRow').prepend(nx);}
    else{const g=IVS.find(v=>v[0]===s);
      f.textContent=`that was a ${g[1]}. listen again.`;
      setTimeout(()=>{pianoPlay(0,80);setTimeout(()=>pianoPlay(s,80),550);},100);
      setTimeout(ivPlay,1800);}}

  // ============ course 4: the seven modes — the mood machine ============
  const M7=[
   {k:'major',n:'ionian (major)',scene:'sunny meadow',feel:'bright and happy',ch:4,cam:[137,94]},
   {k:'dorian',n:'dorian',scene:'twilight forest',feel:'cool and mysterious',ch:5,cam:[97,84]},
   {k:'phrygian',n:'phrygian',scene:'desert oasis',feel:'far away and dramatic',ch:1,cam:[60,100]},
   {k:'lydian',n:'lydian',scene:'floating islands',feel:'floating and curious',ch:3,cam:[80,62]},
   {k:'mixolydian',n:'mixolydian',scene:'vintage carnival',feel:'warm and playful',ch:6,cam:[130,96]},
   {k:'minor',n:'aeolian (minor)',scene:'rainy city',feel:'quiet and sad',ch:5,cam:[36,97]},
   {k:'locrian',n:'locrian',scene:'fractured mirror',feel:'strange and uneasy',ch:4,cam:[78,86]}
  ];
  // illustrated scenes: layered vector art with gradients — same brush as the rest of the app, and a slime hidden in every one
  const blob=(x,y,s,fill)=>`<path transform="translate(${x} ${y}) scale(${s})" d="M0 -8 C-7 -8 -9 -2 -9 1 C-9 6 -4 7 0 7 C4 7 9 6 9 1 C9 -2 7 -8 0 -8 Z" fill="${fill}"/>`;
  const face=(x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})"><circle cx="-3" cy="-1" r="1.1" fill="#3c3456"/><circle cx="3" cy="-1" r="1.1" fill="#3c3456"/><path d="M-2 2 q2 1.8 4 0" fill="none" stroke="#3c3456" stroke-width="1.1" stroke-linecap="round"/></g>`;
  const ART={
   major:`<defs><linearGradient id="mA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd3ff"/><stop offset="1" stop-color="#e3f6ff"/></linearGradient><radialGradient id="mB"><stop offset="0" stop-color="#fff3b0"/><stop offset="1" stop-color="#fff3b000"/></radialGradient></defs>
    <rect width="160" height="120" fill="url(#mA)"/><circle cx="128" cy="26" r="28" fill="url(#mB)"/><circle cx="128" cy="26" r="13" fill="#ffe37a"/>
    <ellipse cx="42" cy="24" rx="17" ry="6" fill="#fff" opacity=".95"/><ellipse cx="55" cy="20" rx="10" ry="5" fill="#fff" opacity=".95"/><ellipse cx="86" cy="38" rx="12" ry="4.5" fill="#fff" opacity=".8"/>
    <path d="M0 78 Q40 62 80 76 T160 72 V120 H0 Z" fill="#a8e08a"/><path d="M0 94 Q50 82 100 94 T160 90 V120 H0 Z" fill="#8ed474"/>
    <g><circle cx="30" cy="99" r="2.8" fill="#ffb6d6"/><circle cx="30" cy="99" r="1.1" fill="#fff"/><circle cx="72" cy="106" r="2.8" fill="#fff"/><circle cx="72" cy="106" r="1.1" fill="#ffe37a"/><circle cx="110" cy="101" r="2.8" fill="#ffd3e7"/><circle cx="110" cy="101" r="1.1" fill="#fff"/></g>
    ${blob(137,96,1.15,'#9fe6cf')}${face(137,95,1.15)}`,
   dorian:`<defs><linearGradient id="dA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#332a5c"/><stop offset="1" stop-color="#6b5b9e"/></linearGradient><radialGradient id="dB"><stop offset="0" stop-color="#f6ecce"/><stop offset="1" stop-color="#f6ecce00"/></radialGradient></defs>
    <rect width="160" height="120" fill="url(#dA)"/><circle cx="124" cy="26" r="24" fill="url(#dB)"/><circle cx="124" cy="26" r="11" fill="#f4ead0"/>
    <path d="M20 118 L38 58 L56 118 Z" fill="#1d4136"/><path d="M62 118 L84 42 L106 118 Z" fill="#163629"/><path d="M108 118 L128 66 L148 118 Z" fill="#1d4136"/>
    <ellipse cx="80" cy="112" rx="90" ry="14" fill="#241f4d" opacity=".8"/>
    <circle cx="46" cy="88" r="1.6" fill="#ffe39c" opacity=".95"/><circle cx="66" cy="72" r="1.3" fill="#ffe39c" opacity=".8"/><circle cx="118" cy="92" r="1.5" fill="#ffe39c" opacity=".9"/>
    <circle cx="94" cy="84" r="2" fill="#ffe39c"/><circle cx="101" cy="84" r="2" fill="#ffe39c"/>`,
   phrygian:`<defs><linearGradient id="pA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#241f4d"/><stop offset="1" stop-color="#4a3f7a"/></linearGradient></defs>
    <rect width="160" height="120" fill="url(#pA)"/>
    <circle cx="120" cy="24" r="12" fill="#f4ead0"/><circle cx="115" cy="21" r="11" fill="#2a2454"/>
    <circle cx="30" cy="18" r="1.4" fill="#fff"/><circle cx="60" cy="10" r="1" fill="#fff"/><circle cx="90" cy="22" r="1.2" fill="#fff"/><circle cx="146" cy="40" r="1" fill="#fff"/><circle cx="14" cy="42" r="1" fill="#fff"/>
    <path d="M0 70 Q50 56 90 70 T160 66 V120 H0 Z" fill="#e0bd85"/><path d="M0 92 Q60 78 120 94 T160 88 V120 H0 Z" fill="#cfa96e"/>
    <path d="M104 88 Q102 66 108 56" fill="none" stroke="#7a5a3e" stroke-width="4" stroke-linecap="round"/>
    <path d="M108 56 Q94 50 86 56 M108 56 Q104 42 112 38 M108 56 Q120 44 130 48 M108 56 Q122 56 132 62" fill="none" stroke="#3f8a5f" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="60" cy="101" rx="20" ry="7" fill="#9fe6cf" opacity=".9"/><circle cx="54" cy="100" r="1" fill="#fff"/><circle cx="67" cy="102" r=".8" fill="#fff"/>
    <circle cx="56" cy="101" r="1.2" fill="#3c3456"/><circle cx="64" cy="101" r="1.2" fill="#3c3456"/><path d="M58 103 q2 1.6 4 0" fill="none" stroke="#3c3456" stroke-width="1" stroke-linecap="round"/>`,
   lydian:`<defs><linearGradient id="lA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9b3f5"/><stop offset="1" stop-color="#ffd9ef"/></linearGradient></defs>
    <rect width="160" height="120" fill="url(#lA)"/>
    <circle cx="26" cy="20" r="1.4" fill="#fff"/><circle cx="140" cy="16" r="1.6" fill="#fff"/><circle cx="120" cy="52" r="1.1" fill="#fff"/><circle cx="40" cy="66" r="1.2" fill="#fff"/>
    <g><ellipse cx="44" cy="38" rx="26" ry="7" fill="#8ed474"/><path d="M22 40 Q44 66 66 40 Z" fill="#b98a63"/><ellipse cx="44" cy="36" rx="26" ry="6" fill="#a8e08a"/></g>
    <g><ellipse cx="122" cy="80" rx="21" ry="6" fill="#8ed474"/><path d="M104 82 Q122 102 140 82 Z" fill="#a97c55"/><ellipse cx="122" cy="78" rx="21" ry="5" fill="#a8e08a"/></g>
    <ellipse cx="86" cy="20" rx="13" ry="4" fill="#fff" opacity=".85"/>
    ${blob(80,62,1.1,'#9fe6cf')}${face(80,61,1.1)}
    <circle cx="70" cy="52" r="1" fill="#fff"/><circle cx="91" cy="70" r="1" fill="#fff"/>`,
   mixolydian:`<defs><linearGradient id="xA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc98f"/><stop offset="1" stop-color="#ffe9d0"/></linearGradient></defs>
    <rect width="160" height="120" fill="url(#xA)"/>
    <g opacity=".55" stroke="#a86a8a" fill="none"><circle cx="36" cy="52" r="26" stroke-width="2.5"/><path d="M36 26 V78 M10 52 H62 M18 34 L54 70 M54 34 L18 70" stroke-width="2"/></g>
    <g fill="#a86a8a" opacity=".6"><circle cx="36" cy="26" r="3"/><circle cx="62" cy="52" r="3"/><circle cx="10" cy="52" r="3"/><circle cx="36" cy="78" r="3"/><circle cx="18" cy="34" r="3"/><circle cx="54" cy="70" r="3"/></g>
    <path d="M70 60 Q106 40 142 60 L134 104 Q106 110 78 104 Z" fill="#ff8f9e"/>
    <path d="M84 58 L88 105 M100 52 L102 107 M116 52 L118 107 M130 58 L132 104" stroke="#fff4ec" stroke-width="7"/>
    <path d="M70 60 Q106 40 142 60" fill="none" stroke="#e0576f" stroke-width="5" stroke-linecap="round"/>
    <path d="M106 46 V34 L118 39 L106 44" fill="#9fe6cf" stroke="#e0576f" stroke-width="1.5"/>
    <path d="M78 104 Q106 112 134 104" fill="none" stroke="#e0576f" stroke-width="4" stroke-linecap="round"/>
    ${blob(130,98,1.1,'#9fe6cf')}${face(130,97,1.1)}
    <circle cx="143" cy="76" r="6" fill="#ffb6d6"/><path d="M143 82 Q140 90 135 94" fill="none" stroke="#e0576f" stroke-width="1.2"/>`,
   minor:`<defs><linearGradient id="aA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f2749"/><stop offset="1" stop-color="#3a4a78"/></linearGradient></defs>
    <rect width="160" height="120" fill="url(#aA)"/>
    <g fill="#141b33"><rect x="8" y="52" width="22" height="68"/><rect x="34" y="34" width="26" height="86"/><rect x="64" y="58" width="20" height="62"/><rect x="88" y="26" width="30" height="94"/><rect x="122" y="46" width="24" height="74"/></g>
    <g fill="#ffe39c"><rect x="40" y="44" width="4" height="5"/><rect x="50" y="60" width="4" height="5"/><rect x="94" y="38" width="4" height="5"/><rect x="106" y="54" width="4" height="5"/><rect x="96" y="78" width="4" height="5"/><rect x="128" y="56" width="4" height="5"/><rect x="14" y="66" width="4" height="5"/><rect x="70" y="70" width="4" height="5"/></g>
    <g stroke="#9db8e8" stroke-width="1.2" stroke-linecap="round" opacity=".55"><path d="M22 8 L18 26"/><path d="M52 2 L48 20"/><path d="M84 10 L80 28"/><path d="M118 4 L114 22"/><path d="M146 12 L142 30"/><path d="M66 30 L62 48"/><path d="M134 30 L130 46"/></g>
    <rect x="0" y="112" width="160" height="8" fill="#10162a"/><ellipse cx="100" cy="114" rx="12" ry="2" fill="#ffe39c" opacity=".25"/><ellipse cx="44" cy="115" rx="9" ry="2" fill="#ffe39c" opacity=".2"/>
    <path d="M24 92 Q36 80 48 92" fill="#ffb6d6" stroke="#e0576f" stroke-width="1.4"/><path d="M36 92 V102" stroke="#e0576f" stroke-width="1.6"/>
    ${blob(36,102,.95,'#9fe6cf')}${face(36,101,.95)}`,
   locrian:`<defs><linearGradient id="oA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#343a63"/><stop offset="1" stop-color="#5c6497"/></linearGradient></defs>
    <rect width="160" height="120" fill="url(#oA)"/>
    <g stroke="#e8f0ff" stroke-width="1"><polygon points="30,18 62,30 44,64 18,50" fill="#cfe2ff" opacity=".38"/><polygon points="70,10 104,22 92,54 66,40" fill="#dfe9ff" opacity=".3"/><polygon points="112,30 148,40 136,80 106,66" fill="#cfe2ff" opacity=".42"/><polygon points="22,72 56,84 40,112 14,100" fill="#dfe9ff" opacity=".3"/><polygon points="98,80 134,92 120,116 92,106" fill="#cfe2ff" opacity=".36"/></g>
    <path d="M80 0 L74 40 L84 78 L76 120" fill="none" stroke="#fff" stroke-width="1" opacity=".7"/>
    <path d="M0 60 L40 66 L80 58 L120 70 L160 62" fill="none" stroke="#fff" stroke-width=".8" opacity=".4"/>
    <g transform="translate(70 86)"><path d="M0 -8 C-7 -8 -9 -2 -9 1 C-9 6 -4 7 0 7 L0 -8 Z" fill="#9fe6cf"/><circle cx="-3.5" cy="-1" r="1.2" fill="#3c3456"/></g>
    <g transform="translate(88 90)"><path d="M0 -8 C7 -8 9 -2 9 1 C9 6 4 7 0 7 L0 -8 Z" fill="#9fe6cf"/><circle cx="3.5" cy="-1" r="1.2" fill="#3c3456"/></g>`
  };
  const sceneSVG=(i,extra)=>`<svg viewBox="0 0 160 120" style="width:100%;display:block;border-radius:12px">${ART[M7[i].k]}${extra||''}</svg>`;
  let jamT=[],loopIv=null,prevScale=null;
  function setModeScale(k){if(!prevScale)prevScale={s:S.scale,r:S.root};S.scale=k;S.root=60;}
  function stopJam(){jamT.forEach(clearTimeout);jamT=[];if(loopIv){clearInterval(loopIv);loopIv=null;}
    if(prevScale){S.scale=prevScale.s;S.root=prevScale.r;prevScale=null;}}
  function jn(deg,dt,vel){jamT.push(setTimeout(()=>{if(!AC)return;const c=centsForDegree(deg);
    playSynth(freqFromCents(c),vel||84,0.6);noteFeed(c);},dt));}
  function playJam(i){stopJam();setModeScale(M7[i].k);
    const ch=M7[i].ch,step=300;
    jn(0,20,64);jn(4,20,52);
    [0,2,4,ch,4,2,ch,0,2,4,ch,4,7,ch,4,0].forEach((d,ix)=>jn(d,240+ix*step,80+(ix%4===0?12:0)));}
  function startBacking(i){stopJam();setModeScale(M7[i].k);
    const beat=()=>{jn(0,20,58);jn(4,640,44);jn(0,1280,50);jn(2,1900,40);};
    beat();loopIv=setInterval(beat,2560);}
  let prog={g:{},cam:{}};try{prog=Object.assign(prog,JSON.parse(localStorage.getItem('slimehedron-learn')||'{}'));}catch(e){}
  const saveP=()=>{try{localStorage.setItem('slimehedron-learn',JSON.stringify(prog));}catch(e){}};
  let rounds=0;
  function stickers(){return '<div class="lStickers">'+M7.map(m=>`<span class="lStk${(prog.g[m.k]|0)>=3?' got':''}" title="${m.n}">${(prog.g[m.k]|0)>=3?'●':'○'}</span>`).join('')+'</div>';}
  function mHome(){stopJam();onKey=null;ov.innerHTML=`<div class="lCard">
    <h3>the seven modes</h3>
    <p class="lSub">every mode is a mood.</p>
    <div class="lBtns">
      <button class="btn primary big" data-a="listen">▸ listen — the seven moods</button>
      <button class="btn big" data-a="guess">? match — sound to scene</button>
      <button class="btn big" data-a="mcreate">♪ compose — score a scene</button>
    </div>${stickers()}
    <div class="lRow"><button class="btn" data-a="home">◂ all lessons</button></div></div>`;}
  function listen(i){i=i||0;stopJam();playJam(i);const m=M7[i];
    ov.innerHTML=`<div class="lCard"><h3>${i+1} of 7 · ${m.n}</h3>
      <div class="lBig">${sceneSVG(i)}</div>
      <div class="lFeed">${m.scene} — ${m.feel}</div>
      <div class="lRow">${i>0?'<button class="btn" data-a="listen" data-i="'+(i-1)+'">◂</button>':''}
      <button class="btn" data-a="replay" data-i="${i}">↻ again</button>
      ${i<6?'<button class="btn primary" data-a="listen" data-i="'+(i+1)+'">next ▸</button>':'<button class="btn primary" data-a="crs" data-c="modes">done</button>'}</div></div>`;}
  function guess(){stopJam();rounds++;
    const n=rounds<4?2:rounds<7?3:4;
    const ans=Math.floor(Math.random()*7);
    const opts=[ans];while(opts.length<n){const c=Math.floor(Math.random()*7);if(!opts.includes(c))opts.push(c);}
    opts.sort(()=>Math.random()-0.5);
    playJam(ans);
    ov.innerHTML=`<div class="lCard"><h3>round ${rounds}</h3>
      <p class="lSub">which scene fits the sound?</p>
      <div class="lScenes">${opts.map(o=>`<div class="lScene" data-pick="${o}" data-ans="${ans}">${sceneSVG(o)}<b>${M7[o].scene}</b></div>`).join('')}</div>
      <div class="lFeed" id="lFeed"></div>
      <div class="lRow"><button class="btn" data-a="replay" data-i="${ans}">↻ again</button><button class="btn" data-a="crs" data-c="modes">menu</button></div></div>`;}
  function pick(el){const p=+el.dataset.pick,a=+el.dataset.ans,f=lf();
    if(p===a){const k=M7[a].k;prog.g[k]=(prog.g[k]|0)+1;saveP();
      f.textContent=`yes — ${M7[a].n}. ${M7[a].feel}.`;
      ov.querySelectorAll('.lScene').forEach(s=>{if(+s.dataset.pick!==a)s.classList.add('dim');});
      const row=ov.querySelector('.lRow');
      if(prog.g[k]===3){const b=document.createElement('button');b.className='btn';b.textContent='find the hidden slime';b.dataset.a='cameo';b.dataset.i=a;row.prepend(b);}
      const nx=document.createElement('button');nx.className='btn primary';nx.textContent='next ▸';nx.dataset.a='guess';row.prepend(nx);
    }else{f.textContent=`this scene sounds ${M7[p].feel}. listen again.`;el.classList.add('dim');playJam(a);}}
  function cameo(i){const m=M7[i];
    ov.innerHTML=`<div class="lCard"><h3>${m.scene}</h3>
      <div class="lBig">${sceneSVG(i,`<circle cx="${m.cam[0]}" cy="${m.cam[1]}" r="14" fill="none" stroke="#fff" stroke-width="2.4"><animate attributeName="r" values="14;18;14" dur="1.2s" repeatCount="indefinite"/></circle>`)}</div>
      <div class="lFeed">you found the hidden slime.</div>
      <div class="lRow"><button class="btn primary" data-a="guess">keep matching ▸</button><button class="btn" data-a="crs" data-c="modes">menu</button></div></div>`;}
  function mcreate(pickI){stopJam();
    if(pickI==null){ov.innerHTML=`<div class="lCard"><h3>compose</h3>
      <p class="lSub">pick a scene. every key fits.</p>
      <div class="lScenes">${M7.map((m,i)=>`<div class="lScene" data-cre="${i}">${sceneSVG(i)}<b>${m.scene}</b></div>`).join('')}</div>
      <div class="lRow"><button class="btn" data-a="crs" data-c="modes">menu</button></div></div>`;return;}
    const m=M7[pickI];startBacking(pickI);
    const keys=[0,1,2,3,4,5,6,7].map(d=>{const c=degRGB(d%7);
      return `<button class="pKey" data-deg="${d}" style="background:rgb(${(c[0]+(255-c[0])*.3)|0},${(c[1]+(255-c[1])*.3)|0},${(c[2]+(255-c[2])*.3)|0})">${d+1}</button>`;}).join('');
    ov.innerHTML=`<div class="lCard"><h3>${m.n}</h3>
      <div class="lBig">${sceneSVG(pickI)}</div>
      <div class="pPiano">${keys}</div>
      <div class="lFeed">play the picture.</div>
      <div class="lRow"><button class="btn" data-a="mcreate">other scenes</button><button class="btn" data-a="crs" data-c="modes">menu</button></div></div>`;}

  // ============ course menu: colored panes, wordless icons, growing teachers ============
  const PANES=[ // [course, pane color, icon, mascot px, girl?, mascot fill]
    ['piano','linear-gradient(150deg,#d2f5e8,#e8fbf4)',icoKeys([]),36,0,'#9fe6cf'],
    ['chords','linear-gradient(150deg,#e7dbff,#f3edff)',icoKeys([0,2,4]),46,1,'#c4a9f5'],
    ['intervals','linear-gradient(150deg,#ffe9d9,#fff4ea)',icoKeys([0,4],1),56,0,'#ffd3a8'],
    ['modes','linear-gradient(150deg,#ffe0ee,#fff0f7)',icoModes,66,1,'#ffb6d6']
  ];
  const ov=document.createElement('div');ov.id='learnOverlay';ov.hidden=true;document.body.appendChild(ov);
  function home(){stopJam();onKey=null;ov.innerHTML=`<div class="lCard">
    <h3>learn</h3>
    <div class="lBtns">${PANES.map(p=>`<div class="crsPane" data-a="crs" data-c="${p[0]}" style="background:${p[1]}">
      ${p[2]}<b>${p[0]}</b><span class="crsSl" style="width:${p[3]}px;height:${p[3]}px">${pixSlime(p[5],'happy',{cap:1,girl:p[4]})}</span></div>`).join('')}
    </div></div>`;}
  ov.addEventListener('pointerdown',e=>{
    const pk=e.target.closest('.pKey');
    if(pk){const c=centsForDegree(+pk.dataset.deg);playSynth(freqFromCents(c),96,0.7);noteFeed(c);
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
      if(c==='piano')pianoCourse();else if(c==='chords')chordCourse(+(b.dataset.i||0));
      else if(c==='intervals')ivCourse();else mHome();}
    else if(a==='strum')strum();
    else if(a==='ivpick')ivPick(+b.dataset.s);else if(a==='ivplay')ivPlay();
    else if(a==='listen')listen(+(b.dataset.i||0));else if(a==='replay')playJam(+b.dataset.i);
    else if(a==='guess')guess();else if(a==='mcreate')mcreate();
    else if(a==='cameo')cameo(+b.dataset.i);});
  function enter(){
    if(S.slimeMode)$id('slimeBig').click();if(drumOn)$id('drumBtn').click();if(bandOn)$id('bandBtn').click();
    balls.length=0;initAudio();if(AC&&AC.state==='suspended')AC.resume();if(!S.playing)setPlaying(true);
    ov.hidden=false;home();}
  function exit(){stopJam();onKey=null;ov.hidden=true;}
  return {enter,exit};
})();
if(S.mode==='learn')LEARN.enter();

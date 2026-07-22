// ================= slimehedron LEARN MODE =================
// four courses on colored panes · pixel-art scene generator (7 seeded looks per mode) ·
// iconic public-domain melodies · never the same track twice in a row.
window.LEARN=(function(){
  'use strict';
  const $id=x=>document.getElementById(x);
  const lf=()=>$id('lFeed');

  // ============ shared: the pixel piano ============
  const PN={0:'C',2:'D',4:'E',5:'F',7:'G',9:'A',11:'B',12:'C',14:'D',16:'E',17:'F',19:'G',21:'A',23:'B',24:'C'};
  const WK=[0,2,4,5,7,9,11,12], BK=[[1,0],[3,1],[6,3],[8,4],[10,5]];
  const WK2=[0,2,4,5,7,9,11,12,14,16,17,19,21,23,24],
        BK2=[[1,0],[3,1],[6,3],[8,4],[10,5],[13,7],[15,8],[18,10],[20,11],[22,12]];
  function pianoHTML(labels,two){ // two octaves for scale lessons — a scale starting on B needs the room
    const wk=two?WK2:WK,bk=two?BK2:BK;
    const strip=i=>{const c=degRGB(i%7);return `<i class="kclr" style="background:rgb(${c[0]|0},${c[1]|0},${c[2]|0})"></i>`;};
    const w=wk.map((s,i)=>`<div class="pxW" data-s="${s}"><span>${labels&&labels[s]!=null?labels[s]:''}</span>${strip(i)}</div>`).join('');
    const gw=two?'':[[14,8],[16,9]].map(([s,i])=>`<div class="pxW gh" data-s="${s}"><span></span>${strip(i%7)}</div>`).join('');
    const b=bk.map(([s,wi])=>`<div class="pxB" data-s="${s}" style="left:${wi*33+21}px"></div>`).join('');
    const gb=two?'':[[13,7],[15,8]].map(([s,wi])=>`<div class="pxB gh" data-s="${s}" style="left:${wi*33+21}px"></div>`).join('');
    return `<div class="pxPiano${two?' two':''}"><div class="pxKeys">${w}${gw}${b}${gb}</div></div>`;
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
  // ---- the piano: eight lessons, correct names, guided by a glowing key ----
  const FORM={maj:{iv:[0,2,4,5,7,9,11,12],f:'W · W · H · W · W · W · H'},
    min:{iv:[0,2,3,5,7,8,10,12],f:'W · H · W · W · H · W · W'},
    pmaj:{iv:[0,2,4,7,9,12],f:'five notes — no half steps anywhere'},
    pmin:{iv:[0,3,5,7,10,12],f:'five notes — the blues lives here'}};
  const PLESSONS=[
    {t:'find the keys'},
    {t:'major scales · white keys',iv:FORM.maj,kind:'major',roots:[0,7,5,2,9,4,11],lbl:{0:'C',7:'G',5:'F',2:'D',9:'A',4:'E',11:'B'}},
    {t:'minor scales · white keys',iv:FORM.min,kind:'natural minor',roots:[9,4,2,0,7,5,11],lbl:{9:'A',4:'E',2:'D',0:'C',7:'G',5:'F',11:'B'}},
    {t:'major scales · black keys',iv:FORM.maj,kind:'major',roots:[10,3,8,1,6],lbl:{10:'B♭',3:'E♭',8:'A♭',1:'D♭',6:'G♭'}},
    {t:'minor scales · black keys',iv:FORM.min,kind:'natural minor',roots:[1,6,8,3,10],lbl:{1:'C♯',6:'F♯',8:'G♯',3:'E♭',10:'B♭'}},
    {t:'major pentatonic',iv:FORM.pmaj,kind:'major pentatonic',roots:[0,7,5,2,9],lbl:{0:'C',7:'G',5:'F',2:'D',9:'A'}},
    {t:'minor pentatonic',iv:FORM.pmin,kind:'minor pentatonic',roots:[9,4,2,0,7],lbl:{9:'A',4:'E',2:'D',0:'C',7:'G'}},
    {t:'the seven modes',modes:1}];
  const MODESL=[['C ionian (major)',0,[0,2,4,5,7,9,11,12]],['D dorian',2,[0,2,3,5,7,9,10,12]],
    ['E phrygian',4,[0,1,3,5,7,8,10,12]],['F lydian',5,[0,2,4,6,7,9,11,12]],
    ['G mixolydian',7,[0,2,4,5,7,9,10,12]],['A aeolian (minor)',9,[0,2,3,5,7,8,10,12]],['B locrian',11,[0,1,3,5,6,8,10,12]]];
  function pianoMenu(){stopJam();setLC('piano');onKey=null;prog.pl=prog.pl||{};
    const rows=PLESSONS.map((L,i)=>{const tot=i===0?1:(L.modes?7:L.roots.length),done=Math.min(prog.pl[i]|0,tot);
      const f=done?Math.max(1,Math.round(5*done/tot)):0;
      return `<button class="btn big" data-a="${i===0?'pkeys':'plsn'}" data-l="${i}" data-r="0" style="display:flex;justify-content:space-between;gap:10px;text-align:left"><span>${i+1} · ${L.t}</span><span class="crsDots">${'●'.repeat(f)}${'○'.repeat(5-f)}</span></button>`;}).join('');
    ov.innerHTML=`<div class="lCard"><h3>the piano</h3>
      <p class="lSub">eight lessons. play by touch, computer keys, or a MIDI keyboard.</p>
      <div class="lBtns">${rows}</div>
      <div class="lRow"><button class="btn" data-a="home">‹ back</button></div></div>`;}
  function pianoCourse(){pianoMenu();}
  function scaleLesson(li,ri){stopJam();setLC('piano');prog.pl=prog.pl||{};ri=ri||0;
    const L=PLESSONS[li],tot=L.modes?7:L.roots.length;
    const root=L.modes?MODESL[ri][1]:L.roots[ri];
    const name=L.modes?MODESL[ri][0]:L.lbl[root]+' '+L.kind;
    const ivs=L.modes?MODESL[ri][2]:L.iv.iv;
    const seq=ivs.map(v=>root+v);let step=0;
    const chip=j=>L.modes?MODESL[j][0].replace(/ \(.*/,''):L.lbl[L.roots[j]];
    ov.innerHTML=`<div class="lCard"><h3>${L.t}</h3>
      <p class="lSub"><b>${name}</b> — ${L.modes?'the same white keys — a new home base':L.iv.f}</p>
      <div class="lRow" style="flex-wrap:wrap;justify-content:center">${Array.from({length:tot},(_,j)=>
        `<button class="btn${j===ri?' primary':''}" data-a="plsn" data-l="${li}" data-r="${j}">${chip(j)}</button>`).join('')}</div>
      ${pianoHTML(null,1)}
      <div class="lFeed" id="lFeed">climb the glowing keys, bottom to top.</div>
      <div class="lRow"><button class="btn" data-a="pmenu">‹ lessons</button></div></div>`;
    const glow=s=>{ov.querySelectorAll('.pxKeys .nxt').forEach(k=>k.classList.remove('nxt'));
      if(s>=0){const k=ov.querySelector(`.pxKeys [data-s="${s}"]`);if(k)k.classList.add('nxt');}};
    glow(seq[0]);
    onKey=s=>{pianoPlay(s);
      if(s===seq[step]){const k=ov.querySelector(`.pxKeys [data-s="${s}"]`);if(k)k.classList.add('hl');
        step++;
        if(step>=seq.length){onKey=null;glow(-1);
          prog.pl[li]=Math.max(prog.pl[li]|0,ri+1);saveP();
          lf().textContent=name+'. hear it whole —';
          seq.forEach((ss,ix)=>setTimeout(()=>pianoPlay(ss,88),480+ix*150)); // the payoff run
          const row=ov.querySelector('.lRow'),b=document.createElement('button');b.className='btn primary';
          if(ri<tot-1){b.textContent=chip(ri+1)+' ▸';b.dataset.a='plsn';b.dataset.l=li;b.dataset.r=ri+1;}
          else if(li<PLESSONS.length-1){winJingle();b.textContent='next lesson ▸';b.dataset.a='plsn';b.dataset.l=li+1;b.dataset.r=0;}
          else{winJingle();b.textContent='all eight done ▸';b.dataset.a='pmenu';}
          row.prepend(b);}
        else glow(seq[step]);}
      else lf().textContent=(PN[s]||'in between')+' — the glowing key comes next.';};}
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
      <div class="lRow"><button class="btn primary" data-a="plsn" data-l="1" data-r="0">next: major scales \u25b8</button><button class="btn" data-a="pmenu">\u2039 lessons</button></div></div>`;
    prog.pl=prog.pl||{};prog.pl[0]=1;saveP(); // lesson 1 complete: keys found, black keys met
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
   {k:'major',n:'ionian (major)',scene:'bright & sunny',feel:'bright and happy',ch:4},
   {k:'dorian',n:'dorian',scene:'cool folk night',feel:'cool and mysterious',ch:5},
   {k:'phrygian',n:'phrygian',scene:'desert night',feel:'far away and dramatic',ch:1},
   {k:'lydian',n:'lydian',scene:'dreamy & floating',feel:'floating and curious',ch:3},
   {k:'mixolydian',n:'mixolydian',scene:'warm festival',feel:'warm and playful',ch:6},
   {k:'minor',n:'aeolian (minor)',scene:'grey & rainy',feel:'quiet and sad',ch:5},
   {k:'locrian',n:'locrian',scene:'strange & shifting',feel:'strange and uneasy',ch:4}
  ];

  // ---------- pixel-art scene generator: real pixels, dithered skies, shaded sprites, 7 seeds per mode ----------
  function RNG(seed){let a=seed;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
  const PXW=160,PXH=120; // scene canvas v2: double the pixel budget = real detail room
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
  // ---------- scene engine v2: component sprite library + 7 DISTINCT compositions per mode ----------
  // compositions follow standard scoring associations: pastoral ionian, folk/sea dorian,
  // iberian/desert phrygian, dreamlike lydian, festive mixolydian, melancholy aeolian, unstable locrian.
  const CP={
   sky(c,ramp){const n=ramp.length,bh=Math.ceil(PXH/n);
    ramp.forEach((col,i)=>{c.fillStyle=col;c.fillRect(0,i*bh,PXW,bh);});
    for(let i=1;i<n;i++){const y=i*bh;c.fillStyle=ramp[i-1];
     for(let x=0;x<PXW;x++){if((x+i)%2===0)c.fillRect(x,y,1,1);if((x*7+i)%4===1)c.fillRect(x,y+1,1,1);}}},
   stars(c,rnd,n,ym,col){for(let i=0;i<n;i++){const x=(rnd()*PXW)|0,y=(rnd()*ym)|0;c.fillStyle=col;c.fillRect(x,y,1,1);
    if(rnd()<.3){c.fillRect(x-1,y,1,1);c.fillRect(x+1,y,1,1);c.fillRect(x,y-1,1,1);c.fillRect(x,y+1,1,1);}}},
   disc(c,cx,cy,rr,core,edge){for(let y=-rr;y<=rr;y++)for(let x=-rr;x<=rr;x++){const d=x*x+y*y;
    if(d<=rr*rr){c.fillStyle=d>(rr-1.6)*(rr-1.6)?edge:core;c.fillRect(cx+x,cy+y,1,1);}}},
   sun(c,cx,cy,rr){CP.disc(c,cx,cy,rr+3,'rgba(255,240,170,.35)','rgba(255,240,170,.2)');CP.disc(c,cx,cy,rr,'#ffe37a','#f0b944');},
   moon(c,cx,cy,rr){CP.disc(c,cx,cy,rr,'#f4ead0','#cbbd97');},
   crescent(c,cx,cy,rr,bg){CP.disc(c,cx,cy,rr,'#f4ead0','#cbbd97');CP.disc(c,cx-Math.ceil(rr*.45),cy-2,rr,bg,bg);},
   cloud(c,cx,cy,s,col){col=col||'#fff';c.fillStyle=col;c.fillRect(cx-s,cy,s*2,3);c.fillRect(cx-s+2,cy-2,s*2-4,2);c.fillRect(cx-s+1,cy+3,s*2-2,1);},
   hills(c,base,amp,ph,ramp){for(let x=0;x<PXW;x++){const y=Math.round(base+Math.sin(x/22+ph)*amp);
    c.fillStyle=ramp[0];c.fillRect(x,y,1,2);c.fillStyle=ramp[1];c.fillRect(x,y+2,1,9);c.fillStyle=ramp[2];c.fillRect(x,y+11,1,PXH-y-11);}},
   water(c,base,rnd,ramp){c.fillStyle=ramp[1];c.fillRect(0,base,PXW,PXH-base);c.fillStyle=ramp[0];c.fillRect(0,base,PXW,2);
    for(let i=0;i<26;i++){c.fillStyle=i%2?ramp[0]:ramp[2];c.fillRect((rnd()*PXW)|0,(base+3+rnd()*(PXH-base-6))|0,3+(rnd()*5|0),1);}},
   pine(c,tx,ty,h,cols){for(let q=0;q<h;q++){const w=1+(q*0.62|0);
    c.fillStyle=cols[1];c.fillRect(tx-w,ty+q,w*2+1,1);c.fillStyle=cols[0];c.fillRect(tx-w,ty+q,1,1);c.fillStyle=cols[2];c.fillRect(tx+w,ty+q,1,1);}
    c.fillStyle='#4a3626';c.fillRect(tx-1,ty+h,3,4);},
   tree(c,tx,ty,s,cols){CP.disc(c,tx,ty,s,cols[0],cols[1]);CP.disc(c,tx-s+2,ty+1,(s*0.6)|0,cols[1],cols[1]);c.fillStyle='#6d4c33';c.fillRect(tx-1,ty+s-1,3,6);},
   flowers(c,rnd,n,y0,y1){const cols=['#ffb6d6','#fff','#ffe37a','#ffd3e7','#c4a9f5'];
    for(let i=0;i<n;i++){const x=(rnd()*(PXW-6)|0)+3,y=(y0+rnd()*(y1-y0))|0,col=cols[i%5];
     c.fillStyle=col;c.fillRect(x-1,y,3,1);c.fillRect(x,y-1,1,3);c.fillStyle='#fff';c.fillRect(x,y,1,1);}},
   house(c,x,y,cols){c.fillStyle=cols[0];c.fillRect(x,y,18,12);c.fillStyle=cols[1];
    for(let q=0;q<6;q++)c.fillRect(x-2+q,y-6+q,22-q*2,1);
    c.fillStyle='#ffe37a';c.fillRect(x+3,y+4,4,4);c.fillRect(x+12,y+4,4,4);c.fillStyle='#5a4f78';c.fillRect(x+8,y+5,3,7);},
   kite(c,x,y,col){c.fillStyle=col;c.fillRect(x-3,y,7,1);c.fillRect(x-2,y-2,5,5);c.fillRect(x,y-3,1,7);
    c.strokeStyle='#8a7bb0';c.lineWidth=1;c.beginPath();c.moveTo(x,y+4);c.lineTo(x-6,y+16);c.stroke();
    c.fillStyle='#ffb6d6';c.fillRect(x-3,y+8,2,2);c.fillRect(x-5,y+12,2,2);},
   rainbow(c,cx,base){const cols=['#ff9e9e','#ffce8f','#fff3a1','#a8e08a','#9ecbff','#c4a9f5'];
    cols.forEach((col,i)=>{const rr=46-i*3;c.strokeStyle=col;c.lineWidth=3;c.beginPath();c.arc(cx,base,rr,Math.PI,0);c.stroke();});},
   tent(c,tx,ty,w,h,cols){for(let q=0;q<h;q++){const ww=(w*(0.4+0.6*q/h))|0;
    c.fillStyle=q<3?cols[1]:cols[0];c.fillRect(tx-ww,ty+q,ww*2,1);}
    for(let s=-2;s<=2;s++){c.fillStyle='#fff4ec';c.fillRect(tx+s*((w/3)|0)-1,ty+h-9,3,9);}
    c.fillStyle='#9fe6cf';c.fillRect(tx-1,ty-4,4,3);},
   ferris(c,wx,wy,rr){c.strokeStyle='#a86a8a';c.lineWidth=2;c.beginPath();c.arc(wx,wy,rr,0,7);c.stroke();
    for(let i=0;i<8;i++){const a=i*Math.PI/4;c.beginPath();c.moveTo(wx,wy);c.lineTo(wx+Math.cos(a)*rr,wy+Math.sin(a)*rr);c.stroke();
     c.fillStyle=['#ffb6d6','#9fe6cf','#ffe37a','#a6c8ff'][i%4];c.fillRect(wx+Math.cos(a)*rr-2,wy+Math.sin(a)*rr-2,4,4);}
    c.fillStyle='#8a5a70';c.fillRect(wx-6,wy+rr,4,PXH-wy-rr);c.fillRect(wx+3,wy+rr,4,PXH-wy-rr);},
   balloon(c,x,y,col){CP.disc(c,x,y,6,col,'rgba(0,0,0,.13)');c.fillStyle='#8a6a4a';c.fillRect(x-2,y+8,5,4);
    c.strokeStyle='#8a6a4a';c.lineWidth=1;c.beginPath();c.moveTo(x-4,y+4);c.lineTo(x-2,y+8);c.moveTo(x+4,y+4);c.lineTo(x+2,y+8);c.stroke();},
   fire(c,x,y){c.fillStyle='#6d4c33';c.fillRect(x-6,y+3,12,2);c.fillStyle='#ff9e5e';c.fillRect(x-3,y-2,6,5);
    c.fillStyle='#ffe37a';c.fillRect(x-1,y-5,3,6);c.fillStyle='#fff3b0';c.fillRect(x,y-3,1,3);},
   skyline(c,rnd,base,col,win){let x=0;while(x<PXW){const w=10+(rnd()*16|0),h=18+(rnd()*34|0);
    c.fillStyle=col;c.fillRect(x,base-h,w,h);
    if(win)for(let wy=3;wy<h-4;wy+=6)for(let wx=3;wx<w-3;wx+=5)if(rnd()<0.3){c.fillStyle='#ffdf8a';c.fillRect(x+wx,base-h+wy,2,3);c.fillStyle=col;}
    x+=w+2;}},
   rain(c,rnd,n){c.strokeStyle='rgba(160,190,240,.55)';c.lineWidth=1;
    for(let i=0;i<n;i++){const x=(rnd()*PXW)|0,y=(rnd()*90)|0;c.beginPath();c.moveTo(x,y);c.lineTo(x-2,y+7);c.stroke();}},
   snow(c,rnd,n){c.fillStyle='#fff';for(let i=0;i<n;i++)c.fillRect((rnd()*PXW)|0,(rnd()*PXH)|0,2,2);},
   palm(c,x,y){c.fillStyle='#6d4c33';for(let i=0;i<14;i++)c.fillRect(x+Math.round(Math.sin(i/5)*3),y+i,3,1);
    c.fillStyle='#3f8a5f';[[-9,-2],[-6,-5],[0,-7],[6,-5],[9,-2]].forEach(([dx,dy])=>{c.fillRect(x+dx,y+dy,Math.abs(dx)||4,2);});
    c.fillStyle='#2e6b47';c.fillRect(x-7,y-1,5,1);c.fillRect(x+4,y-1,5,1);},
   island(c,ix,iy,w){c.fillStyle='#b7ec9e';c.fillRect(ix-w,iy,w*2,2);c.fillStyle='#8ed474';c.fillRect(ix-w,iy+2,w*2,3);
    for(let q=0;q<7;q++){const ww=((w-2)*(1-q/7))|0;c.fillStyle=q<3?'#a97c55':'#7d5539';c.fillRect(ix-ww,iy+5+q,ww*2,1);}
    c.fillStyle='#6cb055';c.fillRect(ix-w,iy+4,3,3);c.fillRect(ix+w-3,iy+4,3,3);},
   bubbles(c,rnd,n){for(let i=0;i<n;i++){const x=(rnd()*PXW)|0,y=(rnd()*PXH)|0,rr=2+(rnd()*3|0);
    c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=1;c.beginPath();c.arc(x,y,rr,0,7);c.stroke();
    c.fillStyle='rgba(255,255,255,.8)';c.fillRect(x-1,y-rr+1,1,1);}},
   aurora(c,rnd){const cols=['#9fe6cf','#c4a9f5','#a6c8ff'];
    for(let b=0;b<3;b++){c.fillStyle=cols[b];c.globalAlpha=.3;
     for(let x=0;x<PXW;x++){const y=14+b*7+Math.sin(x/17+b*2)*6;c.fillRect(x,y|0,1,9);}c.globalAlpha=1;}},
   shards(c,rnd,n){for(let i=0;i<n;i++){const sx=6+(rnd()*(PXW-40)|0),sy=6+(rnd()*(PXH-40)|0),w=14+(rnd()*20|0),h=12+(rnd()*16|0);
    c.fillStyle=['#cfe0ff','#aebfe8','#8fa0cf'][i%3];c.globalAlpha=.55;
    c.beginPath();c.moveTo(sx,sy+h*.3);c.lineTo(sx+w*.6,sy);c.lineTo(sx+w,sy+h*.6);c.lineTo(sx+w*.3,sy+h);c.closePath();c.fill();c.globalAlpha=1;
    c.fillStyle='#e8eeff';c.fillRect(sx+(w*.6|0),sy,2,3);}},
   lighthouse(c,x,base){c.fillStyle='#fff';c.fillRect(x-4,base-30,9,30);c.fillStyle='#e0576f';c.fillRect(x-4,base-26,9,5);c.fillRect(x-4,base-14,9,5);
    c.fillStyle='#ffe37a';c.fillRect(x-3,base-36,7,5);c.fillStyle='#5a4f78';c.fillRect(x-5,base-38,11,2);},
   swing(c,x,base){c.strokeStyle='#8a6a4a';c.lineWidth=2;c.beginPath();c.moveTo(x-12,base);c.lineTo(x,base-24);c.lineTo(x+12,base);c.stroke();
    c.beginPath();c.moveTo(x-5,base-22);c.lineTo(x-5,base-8);c.moveTo(x+5,base-22);c.lineTo(x+5,base-8);c.stroke();
    c.fillStyle='#7c65c9';c.fillRect(x-7,base-8,14,2);},
   crooked(c,x,base){c.save();c.translate(x,base);c.rotate(-0.12);
    c.fillStyle='#3a3457';c.fillRect(-12,-34,24,34);c.fillStyle='#2c2749';for(let q=0;q<8;q++)c.fillRect(-15+q,-42+q,30-q*2,1);
    c.fillStyle='#ffdf8a';c.fillRect(-7,-26,5,6);c.fillStyle='#151228';c.fillRect(3,-16,6,16);c.restore();},
   stairsUp(c,x,y,n,dir){c.fillStyle='#8fa0cf';for(let i=0;i<n;i++)c.fillRect(x+i*7*dir,y-i*5,8,4);},
   eclipse(c,cx,cy,rr){CP.disc(c,cx,cy,rr+2,'rgba(255,230,150,.5)','rgba(255,230,150,.2)');CP.disc(c,cx,cy,rr,'#1a1533','#0f0c22');},
   boat(c,x,y){c.fillStyle='#8a5a3a';c.fillRect(x-9,y,18,4);c.fillStyle='#6d4c33';c.fillRect(x-9,y,18,1);
    c.fillStyle='#5a4f78';c.fillRect(x,y-14,1,14);c.fillStyle='#fff';for(let q=0;q<10;q++)c.fillRect(x+1,y-14+q,(10-q)*0.9|0,1);},
   leaves(c,rnd,n){const cols=['#e0906a','#d97742','#ffcf7a'];
    for(let i=0;i<n;i++){c.fillStyle=cols[i%3];c.fillRect((rnd()*PXW)|0,(rnd()*PXH)|0,2,2);}},
   pond(c,x,y,w){c.fillStyle='#57c9a5';c.fillRect(x-w,y,w*2,6);c.fillStyle='#9fe6cf';c.fillRect(x-w+2,y,5,1);c.fillRect(x+2,y+3,4,1);},
   lights(c,rnd,y,n){const cols=['#ffe37a','#ffb6d6','#9fe6cf','#a6c8ff'];
    for(let i=0;i<n;i++){const x=8+i*((PXW-16)/n),yy=y+Math.sin(i*1.1)*3;
     c.fillStyle='#8a7bb0';c.fillRect(x|0,yy|0,1,1);c.fillStyle=cols[i%4];c.fillRect(x|0,(yy+1)|0,2,2);}},
   slime(c,x,y,fill,s){s=s||2;const rows=[[3,2],[2,4],[1,6],[1,6],[0,8],[0,8],[0,8],[1,6]];
    rows.forEach((rw,i)=>{c.fillStyle=fill;c.fillRect(x+rw[0]*s,y+i*s,rw[1]*s,s);});
    c.fillStyle='rgba(44,39,73,.45)';rows.forEach((rw,i)=>{c.fillRect(x+rw[0]*s,y+i*s,s,s);c.fillRect(x+(rw[0]+rw[1]-1)*s,y+i*s,s,s);});
    c.fillRect(x+3*s,y,2*s,s);c.fillRect(x+1*s,y+7*s,6*s,s);
    c.fillStyle='#3c3456';c.fillRect(x+2*s,y+3*s,s,s);c.fillRect(x+5*s,y+3*s,s,s);c.fillRect(x+3*s,y+5*s,2*s,s);
    c.fillStyle='rgba(255,255,255,.85)';c.fillRect(x+2*s,y+1*s,s,s);}
  };
  const SKYS={day:['#7ec8f7','#93d4f9','#aadffb','#c9edff'],dusk:['#2e2753','#3b3266','#4c4180','#5d5199'],
   night:['#1d1a40','#272252','#332c66','#3d3573'],sunset:['#ff9f68','#ffb27a','#ffc793','#ffdcae'],
   storm:['#1b2340','#222c50','#2a3660','#33406e'],lav:['#c6aff0','#d6bff5','#e7d3fa','#f7e6ff'],
   void:['#363a61','#424772','#4f5483','#5d6294'],autumn:['#f2b98a','#f5c9a0','#f8d9b8','#fbe9d2'],
   winter:['#3a4668','#46527a','#525e8c','#5e6a9e']};
  const GRN=['#a5e58c','#8ed474','#74b95c'],GRN2=['#8ed474','#79c261','#5fa04a'],
   SAND=['#efd0a0','#e0bd85','#c9a366'],SAND2=['#dcb87e','#cfa96e','#b28e55'],
   DGRN=['#3f7a60','#25543f','#173629'],XDGRN=['#2a2a3e','#1c1c2e','#101020'],
   WAT=['#dff4ff','#6db5dd','#bfe8fa'],WATN=['#8fa8d9','#37477c','#5c74b5'],
   GREY=['#8f9bb5','#77839d','#5f6b85'],TRE=['#8ed474','#5fa04a'],ORN=['#e0906a','#b25a3a'],
   SNOWP=['#dfe9f6','#c3d2ea','#9fb2d4'],MINT='#9fe6cf',PNK='#ffb6d6',PCH='#ffd3a8',LILA='#c4a9f5';
  const R={
   major:[ // pastoral ionian: meadow, beach, kite hill, village, rainbow, orchard picnic, sunflower noon
    (c,r)=>{CP.sky(c,SKYS.day);CP.sun(c,28,20,9);CP.cloud(c,96,14,7);CP.cloud(c,132,26,5);CP.hills(c,70,5,1,GRN);CP.hills(c,88,4,3,GRN2);CP.tree(c,118,62,9,TRE);CP.flowers(c,r,26,94,116);CP.slime(c,134,92,MINT);},
    (c,r)=>{CP.sky(c,SKYS.day);CP.sun(c,124,16,8);CP.cloud(c,40,20,6);CP.water(c,62,r,WAT);CP.hills(c,96,3,2,SAND);CP.boat(c,52,56);CP.palm(c,24,84);CP.slime(c,116,96,PCH);},
    (c,r)=>{CP.sky(c,SKYS.day);CP.cloud(c,30,16,7);CP.cloud(c,120,10,5);CP.hills(c,62,6,2,GRN);CP.hills(c,84,4,0,GRN2);CP.kite(c,100,24,'#e0576f');CP.flowers(c,r,10,92,112);CP.slime(c,58,74,MINT);},
    (c,r)=>{CP.sky(c,SKYS.day);CP.sun(c,134,14,6);CP.hills(c,58,4,1,GRN2);CP.house(c,26,72,['#ffd9b0','#e0576f']);CP.house(c,66,80,['#cfe2ff','#7c65c9']);CP.house(c,110,74,['#ffe1ec','#e08aae']);CP.flowers(c,r,14,98,116);CP.slime(c,140,94,MINT);},
    (c,r)=>{CP.sky(c,SKYS.day);CP.rain(c,r,10);CP.rainbow(c,80,72);CP.cloud(c,26,20,7);CP.cloud(c,124,16,6);CP.hills(c,74,5,1,GRN);CP.slime(c,24,88,MINT);},
    (c,r)=>{CP.sky(c,SKYS.day);CP.sun(c,140,12,6);CP.tree(c,30,54,10,TRE);CP.tree(c,80,48,12,TRE);CP.tree(c,128,56,9,TRE);CP.hills(c,86,3,4,GRN2);CP.tent(c,56,86,13,18,[PNK,'#e08aae']);CP.slime(c,86,96,LILA);},
    (c,r)=>{CP.sky(c,SKYS.day);CP.sun(c,80,18,11);CP.hills(c,72,3,4,GRN);CP.flowers(c,r,44,80,116);CP.slime(c,28,90,MINT);CP.slime(c,120,94,PCH);}],
   dorian:[ // folk/sea dorian: twilight pines, night sail, misty lake, stone keep, camp, foggy pines, north shore
    (c,r)=>{CP.sky(c,SKYS.dusk);CP.crescent(c,120,16,6,'#2e2753');CP.stars(c,r,8,30,'#cfc4ef');CP.pine(c,26,36,22,DGRN);CP.pine(c,60,30,26,DGRN);CP.pine(c,104,40,20,DGRN);CP.pine(c,140,34,24,DGRN);c.fillStyle='#1c1738';c.fillRect(0,100,PXW,20);c.fillStyle='#ffe39c';c.fillRect(46,80,2,2);c.fillRect(90,72,2,2);CP.slime(c,116,86,LILA);},
    (c,r)=>{CP.sky(c,SKYS.night);CP.moon(c,124,18,7);CP.stars(c,r,14,44,'#efe8ff');CP.water(c,64,r,WATN);CP.boat(c,64,68);CP.slime(c,56,58,MINT,1);CP.slime(c,20,100,MINT);},
    (c,r)=>{CP.sky(c,SKYS.dusk);CP.crescent(c,30,14,5,'#2e2753');CP.pine(c,110,30,16,DGRN);CP.pine(c,134,26,18,DGRN);CP.water(c,76,r,WATN);c.globalAlpha=.35;c.fillStyle='#cfd6ee';c.fillRect(0,60,PXW,7);c.fillRect(20,70,110,5);c.globalAlpha=1;CP.slime(c,30,58,MINT);},
    (c,r)=>{CP.sky(c,SKYS.night);CP.stars(c,r,12,40,'#cfc4ef');c.fillStyle='#525a78';c.fillRect(24,52,20,48);c.fillRect(96,46,20,54);c.fillStyle='#6b7391';c.fillRect(48,66,44,34);[24,36,96,108].forEach(tx=>{c.fillStyle='#525a78';c.fillRect(tx-2,44,10,8);});c.fillStyle='#ffe39c';c.fillRect(54,78,5,6);c.fillRect(102,60,4,5);c.fillStyle='#e0576f';c.fillRect(33,34,6,4);c.fillRect(31,34,2,12);c.fillStyle='#3a4258';c.fillRect(0,100,PXW,20);CP.slime(c,72,86,MINT);},
    (c,r)=>{CP.sky(c,SKYS.dusk);CP.stars(c,r,10,36,'#cfc4ef');CP.pine(c,20,28,20,DGRN);CP.pine(c,142,32,18,DGRN);CP.tent(c,52,80,14,20,['#8ed4b4','#5fae8e']);CP.fire(c,96,96);CP.slime(c,116,90,MINT);},
    (c,r)=>{CP.sky(c,SKYS.storm);CP.pine(c,30,30,24,XDGRN);CP.pine(c,66,24,28,XDGRN);CP.pine(c,110,34,22,XDGRN);CP.pine(c,140,28,24,XDGRN);c.globalAlpha=.3;c.fillStyle='#cfd6ee';c.fillRect(0,52,PXW,9);c.fillRect(0,74,PXW,6);c.globalAlpha=1;c.fillStyle='#141a30';c.fillRect(0,102,PXW,18);CP.slime(c,80,88,LILA);},
    (c,r)=>{CP.sky(c,SKYS.night);CP.stars(c,r,16,40,'#efe8ff');CP.crescent(c,36,14,6,'#1d1a40');CP.hills(c,58,4,1,GREY);CP.water(c,74,r,WATN);CP.boat(c,112,68);CP.slime(c,20,60,MINT);}],
   phrygian:[ // iberian/desert phrygian: oasis, bazaar, canyon sunset, caravan, night market, red towers, star pool
    (c,r)=>{CP.sky(c,SKYS.night);CP.stars(c,r,14,34,'#efe8ff');CP.crescent(c,120,14,6,'#1d1a40');CP.hills(c,48,4,2,SAND);CP.hills(c,68,3,5,SAND2);CP.palm(c,118,44);CP.pond(c,52,96,14);CP.slime(c,80,86,PCH);},
    (c,r)=>{CP.sky(c,SKYS.night);CP.crescent(c,28,14,6,'#1d1a40');CP.stars(c,r,10,30,'#efe8ff');CP.tent(c,52,66,17,28,['#e0576f','#b23e57']);CP.tent(c,108,72,14,22,['#7c65c9','#5a4aa0']);CP.lights(c,r,58,9);c.fillStyle='#8a6a4a';c.fillRect(0,102,PXW,18);CP.slime(c,132,88,MINT);},
    (c,r)=>{CP.sky(c,SKYS.sunset);CP.sun(c,30,22,8);CP.skyline(c,r,104,'#a8573f',false);c.fillStyle='#8a4632';c.fillRect(0,104,PXW,16);CP.slime(c,20,90,PCH);},
    (c,r)=>{CP.sky(c,SKYS.night);CP.stars(c,r,16,36,'#efe8ff');CP.moon(c,80,16,6);CP.hills(c,54,5,1,SAND2);CP.hills(c,76,4,4,SAND);CP.tent(c,120,52,8,12,['#c9a366','#a8825a']);c.fillStyle='#b28e55';[30,42,54,66].forEach((fx,i)=>c.fillRect(fx,96+(i%2)*3,2,1));CP.slime(c,84,84,MINT);},
    (c,r)=>{CP.sky(c,SKYS.night);CP.crescent(c,134,12,5,'#1d1a40');CP.house(c,20,70,['#c98a5f','#a8623f']);CP.house(c,62,76,['#b27852','#8a5238']);CP.house(c,106,70,['#d9a06a','#b27842']);CP.lights(c,r,62,11);c.fillStyle='#6a4a34';c.fillRect(0,100,PXW,20);CP.slime(c,140,88,PCH);},
    (c,r)=>{CP.sky(c,SKYS.sunset);CP.sun(c,116,18,7);CP.skyline(c,r,88,'#b25a3a',false);CP.skyline(c,r,110,'#8a4632',false);CP.slime(c,26,94,MINT);},
    (c,r)=>{CP.sky(c,SKYS.night);CP.stars(c,r,22,50,'#efe8ff');CP.hills(c,60,4,3,SAND2);CP.pond(c,80,86,20);c.fillStyle='#fff';c.fillRect(74,88,1,1);c.fillRect(88,90,1,1);CP.palm(c,34,60);CP.slime(c,118,80,PCH);}],
   lydian:[ // dreamlike lydian: islands, bubbles, aurora, star garden, cloud kingdom, moon lake, balloon isles
    (c,r)=>{CP.sky(c,SKYS.lav);CP.stars(c,r,7,60,'#ffffff');CP.island(c,44,28,15);CP.island(c,112,60,11);CP.cloud(c,140,14,6);CP.cloud(c,20,80,6);CP.slime(c,36,10,MINT);},
    (c,r)=>{CP.sky(c,SKYS.lav);CP.bubbles(c,r,16);CP.cloud(c,30,26,7);CP.cloud(c,120,70,6);CP.slime(c,72,48,MINT);},
    (c,r)=>{CP.sky(c,SKYS.night);CP.aurora(c,r);CP.stars(c,r,12,50,'#efe8ff');CP.pine(c,30,80,16,XDGRN);CP.pine(c,130,76,18,XDGRN);c.fillStyle='#101426';c.fillRect(0,102,PXW,18);CP.slime(c,80,86,LILA);},
    (c,r)=>{CP.sky(c,SKYS.night);CP.stars(c,r,20,60,'#efe8ff');CP.crescent(c,124,14,6,'#1d1a40');CP.hills(c,80,3,2,['#3d5a4a','#2c4436','#1c2e24']);CP.flowers(c,r,20,92,114);CP.slime(c,40,84,MINT);},
    (c,r)=>{CP.sky(c,SKYS.lav);CP.cloud(c,40,68,9);CP.cloud(c,80,72,10);CP.cloud(c,124,66,8);CP.house(c,70,44,['#ffe1ec','#c98ab0']);CP.cloud(c,80,58,10);CP.slime(c,102,32,PNK);},
    (c,r)=>{CP.sky(c,SKYS.night);CP.moon(c,80,20,9);CP.stars(c,r,10,40,'#efe8ff');CP.water(c,64,r,WATN);c.globalAlpha=.4;c.fillStyle='#f4ead0';c.fillRect(76,66,8,50);c.globalAlpha=1;CP.slime(c,20,84,MINT);},
    (c,r)=>{CP.sky(c,SKYS.lav);CP.island(c,52,40,13);CP.balloon(c,112,26,PNK);CP.balloon(c,134,48,MINT);CP.cloud(c,24,20,6);CP.slime(c,46,24,PCH);}],
   mixolydian:[ // festive mixolydian: carnival, campfire, balloon fiesta, barn dance, fair row, beach bonfire, golden road
    (c,r)=>{CP.sky(c,SKYS.sunset);CP.ferris(c,42,42,22);CP.tent(c,116,74,20,26,['#ea6f80','#c94f62']);CP.lights(c,r,30,12);c.fillStyle='#c98f52';c.fillRect(0,100,PXW,20);CP.slime(c,142,88,MINT);},
    (c,r)=>{CP.sky(c,SKYS.night);CP.stars(c,r,16,44,'#efe8ff');CP.pine(c,24,30,22,DGRN);CP.pine(c,140,36,20,DGRN);CP.tent(c,48,76,14,20,['#a6c8ff','#7c9fd9']);CP.fire(c,92,94);CP.slime(c,112,88,MINT);CP.slime(c,66,92,PCH);},
    (c,r)=>{CP.sky(c,SKYS.sunset);CP.balloon(c,40,26,'#e0576f');CP.balloon(c,84,44,MINT);CP.balloon(c,124,20,'#ffe37a');CP.hills(c,84,5,2,GRN2);CP.slime(c,20,92,MINT);},
    (c,r)=>{CP.sky(c,SKYS.dusk);CP.stars(c,r,8,30,'#cfc4ef');CP.house(c,54,62,['#e0576f','#8a3a4a']);c.fillStyle='#ffe37a';c.fillRect(60,66,7,8);CP.lights(c,r,56,10);CP.fire(c,116,96);CP.slime(c,124,86,PCH);},
    (c,r)=>{CP.sky(c,SKYS.sunset);CP.tent(c,30,78,14,20,[PNK,'#e08aae']);CP.tent(c,74,72,16,26,[MINT,'#6fbfa4']);CP.tent(c,120,78,14,20,[LILA,'#9a7fd9']);CP.lights(c,r,64,12);c.fillStyle='#c98f52';c.fillRect(0,100,PXW,20);CP.slime(c,146,90,MINT);},
    (c,r)=>{CP.sky(c,SKYS.dusk);CP.stars(c,r,10,34,'#cfc4ef');CP.water(c,66,r,WATN);c.fillStyle='#d9b98a';c.fillRect(0,96,PXW,24);CP.fire(c,44,100);CP.slime(c,66,96,MINT);},
    (c,r)=>{CP.sky(c,SKYS.sunset);CP.sun(c,80,26,8);CP.skyline(c,r,64,'#6a4a5a',false);CP.hills(c,72,4,1,SAND2);c.fillStyle='#77839d';for(let y2=100;y2<120;y2+=2){const w2=8+(y2-100)*1.6;c.fillRect((80-w2/2)|0,y2,w2|0,2);}c.fillStyle='#ffe37a';c.fillRect(79,102,2,3);c.fillRect(79,110,2,4);CP.slime(c,112,98,PCH);}],
   minor:[ // melancholy aeolian: rainy city, autumn park, grey harbor, dusk swing, snow lane, moon ruins, window rain
    (c,r)=>{CP.sky(c,SKYS.storm);CP.skyline(c,r,108,'#12182e',true);CP.rain(c,r,26);c.fillStyle='#0a0e1e';c.fillRect(0,108,PXW,12);c.fillStyle='rgba(255,223,138,.25)';c.fillRect(46,110,12,2);c.fillRect(104,112,9,2);CP.slime(c,18,92,MINT);},
    (c,r)=>{CP.sky(c,SKYS.autumn);CP.tree(c,48,52,12,ORN);CP.tree(c,118,60,9,['#d97742','#a8552e']);CP.leaves(c,r,22);CP.hills(c,86,3,1,['#d9a06a','#c08850','#a06e3c']);CP.swing(c,88,100);CP.slime(c,20,90,PCH);},
    (c,r)=>{CP.sky(c,SKYS.storm);CP.water(c,70,r,WATN);CP.lighthouse(c,118,70);CP.rain(c,r,14);CP.boat(c,40,64);CP.slime(c,138,92,MINT);},
    (c,r)=>{CP.sky(c,SKYS.dusk);CP.stars(c,r,6,26,'#cfc4ef');CP.crescent(c,130,14,6,'#2e2753');CP.hills(c,80,3,2,['#5c8a68','#487052','#35543d']);CP.swing(c,76,96);CP.slime(c,96,90,LILA);},
    (c,r)=>{CP.sky(c,SKYS.winter);CP.snow(c,r,44);CP.house(c,58,70,['#8fa0cf','#6b7ba8']);CP.pine(c,24,52,18,SNOWP);CP.pine(c,132,56,16,SNOWP);c.fillStyle='#eef3fb';c.fillRect(0,100,PXW,20);CP.slime(c,110,88,MINT);},
    (c,r)=>{CP.sky(c,SKYS.night);CP.moon(c,36,16,7);CP.stars(c,r,12,36,'#efe8ff');CP.skyline(c,r,104,'#0c1122',false);c.fillStyle='#0a0e1e';c.fillRect(0,104,PXW,16);CP.slime(c,132,90,LILA);},
    (c,r)=>{CP.sky(c,SKYS.storm);CP.rain(c,r,20);CP.house(c,56,60,['#4a5578','#39425f']);c.fillStyle='#2c3350';c.fillRect(0,102,PXW,18);CP.slime(c,96,88,MINT);}],
   locrian:[ // unstable locrian: mirror shards, crooked house, eclipse plain, stairs to nowhere, upside isles, thorn pines, glitch void
    (c,r)=>{CP.sky(c,SKYS.void);CP.shards(c,r,7);c.strokeStyle='rgba(232,238,255,.8)';c.lineWidth=1;c.beginPath();c.moveTo(78,0);c.lineTo(72,48);c.lineTo(86,86);c.lineTo(76,PXH);c.stroke();c.beginPath();c.moveTo(0,66);c.lineTo(50,72);c.lineTo(106,62);c.lineTo(PXW,76);c.stroke();CP.slime(c,40,84,MINT);CP.slime(c,102,88,MINT);},
    (c,r)=>{CP.sky(c,SKYS.night);CP.stars(c,r,14,40,'#cfc4ef');CP.crooked(c,84,102);CP.pine(c,24,60,16,XDGRN);CP.pine(c,140,64,14,XDGRN);c.fillStyle='#151228';c.fillRect(0,102,PXW,18);CP.slime(c,30,88,LILA);},
    (c,r)=>{CP.sky(c,['#242849','#2e3356','#383e63','#42496f']);CP.eclipse(c,80,26,9);CP.hills(c,82,3,0,['#2c3050','#232640','#1a1d30']);CP.slime(c,118,86,MINT);},
    (c,r)=>{CP.sky(c,SKYS.void);CP.stars(c,r,10,50,'#cfd6ee');CP.stairsUp(c,26,92,8,1);CP.stairsUp(c,132,64,6,-1);CP.slime(c,58,64,MINT);},
    (c,r)=>{CP.sky(c,['#5d6294','#4f5483','#424772','#363a61']);CP.stars(c,r,16,110,'#cfd6ee');CP.island(c,56,26,12);CP.island(c,110,74,10);CP.bubbles(c,r,8);CP.slime(c,52,10,LILA);},
    (c,r)=>{CP.sky(c,SKYS.night);CP.crescent(c,128,12,5,'#1d1a40');CP.pine(c,20,40,26,XDGRN);CP.pine(c,48,34,30,XDGRN);CP.pine(c,84,44,24,XDGRN);CP.pine(c,116,36,28,XDGRN);CP.pine(c,144,46,22,XDGRN);c.fillStyle='#0c0c18';c.fillRect(0,104,PXW,16);CP.slime(c,66,90,MINT,1);},
    (c,r)=>{CP.sky(c,SKYS.void);for(let i=0;i<12;i++){c.fillStyle=['#4f5483','#2c3050','#6a70a3'][i%3];c.fillRect((r()*PXW)|0,(r()*PXH)|0,4+(r()*20|0),2);}CP.eclipse(c,118,22,6);CP.shards(c,r,3);CP.slime(c,68,58,MINT);}]
  };
  const SCACHE={};
  function sceneURL(i,v){const key=i+'_'+v;if(SCACHE[key])return SCACHE[key];
    const cv2=document.createElement('canvas');cv2.width=PXW;cv2.height=PXH;const c=cv2.getContext('2d');
    R[M7[i].k][(v||0)%7](c,RNG(4200+i*77+v*131)); // 7 DISTINCT compositions per mode, seeded micro-variation inside each
    return SCACHE[key]=cv2.toDataURL();}
  function sceneIMG(i,v,extra){return `<div style="position:relative">
    <img src="${sceneURL(i,v||0)}" style="width:100%;display:block;image-rendering:pixelated;border-radius:12px" alt="">
    ${extra?`<svg viewBox="0 0 160 120" style="position:absolute;inset:0;width:100%;height:100%">${extra}</svg>`:''}</div>`;}

  // ---------- iconic public-domain melodies (traditional / pre-1830 comps; two originals labeled ours) ----------
  // ---------- melody bank: iconic public-domain tunes + the characteristic patterns theory teachers drill.
  // each entry plays in 3 feels (steady / lilt / brisk) — so every mode owns 9-12 audible variants,
  // and "again" in a quiz repeats the exact same take (that's ear training, not a jukebox).
  const MELS={
   major:[
    {t:'ode to joy',seq:[[2,1],[2,1],[3,1],[4,1],[4,1],[3,1],[2,1],[1,1],[0,1],[0,1],[1,1],[2,1],[2,1.5],[1,.5],[1,2]]},
    {t:'frère jacques',seq:[[0,1],[1,1],[2,1],[0,1],[0,1],[1,1],[2,1],[0,1],[2,1],[3,1],[4,2],[2,1],[3,1],[4,2],[4,.5],[5,.5],[4,.5],[3,.5],[2,1],[0,1],[0,2]]},
    {t:'mary had a little lamb',seq:[[2,1],[1,1],[0,1],[1,1],[2,1],[2,1],[2,2],[1,1],[1,1],[1,2],[2,1],[4,1],[4,2],[2,1],[1,1],[0,1],[1,1],[2,1],[2,1],[2,1],[1,1],[1,1],[2,1],[1,1],[0,2]]},
    {t:'when the saints go marching in',seq:[[0,1],[2,1],[3,1],[4,3],[0,1],[2,1],[3,1],[4,3],[0,1],[2,1],[3,1],[4,1],[2,1],[0,1],[2,1],[1,3]]}],
   dorian:[
    {t:'drunken sailor',seq:[[7,.5],[7,.5],[7,.5],[7,.5],[7,.5],[7,.5],[7,.5],[7,.5],[6,.5],[6,.5],[6,.5],[6,.5],[6,.5],[6,.5],[6,.5],[6,.5],[7,.5],[7,.5],[7,.5],[7,.5],[7,.5],[8,.5],[9,.5],[10,.5],[11,1],[7,1.5]]},
    {t:'scarborough air (trad.)',seq:[[0,1.5],[0,.5],[4,2],[4,1],[5,1],[4,2],[2,1],[3,.5],[2,.5],[1,1],[0,2]]},
    {t:'dorian groove (pattern)',seq:[[0,1],[2,.5],[3,.5],[4,1],[5,1],[4,1],[3,.5],[2,.5],[0,1],[5,1],[4,1],[0,2]]}],
   phrygian:[
    {t:'sakura sakura',seq:[[3,1],[3,1],[4,2],[3,1],[3,1],[4,2],[3,1],[4,1],[5,1],[4,1],[3,1],[4,.5],[3,.5],[1,2],[0,2]]},
    {t:'andalusian fall (pattern)',seq:[[7,1],[6,1],[5,1],[4,1],[7,1],[6,1],[5,1],[4,2],[5,.5],[6,.5],[5,1],[4,2]]},
    {t:'phrygian gate (pattern)',seq:[[0,.5],[1,.5],[0,.5],[1,.5],[0,1],[3,1],[1,1],[0,1],[4,1],[1,1],[0,2]]}],
   lydian:[
    {t:'cloud waltz (ours)',seq:[[0,1],[2,1],[4,1],[3,2],[4,1],[6,1],[4,1],[3,2],[2,1],[3,1],[4,1],[2,1],[0,2]]},
    {t:'lift-off (pattern)',seq:[[0,1],[2,1],[3,1],[4,2],[3,1],[4,1],[6,1],[7,2],[6,1],[4,1],[3,1],[4,2]]},
    {t:'floating steps (pattern)',seq:[[4,1],[3,1],[4,1],[7,1],[4,1],[3,1],[2,1],[3,1],[4,1],[0,2]]}],
   mixolydian:[
    {t:'old joe clark',seq:[[4,.5],[4,.5],[4,1],[5,.5],[6,1],[6,.5],[5,.5],[4,.5],[2,1],[1,.5],[2,.5],[4,1],[6,1],[4,2]]},
    {t:'back porch (pattern)',seq:[[4,.5],[5,.5],[6,1],[4,1],[2,1],[4,1],[6,1],[4,1],[2,.5],[1,.5],[0,2]]},
    {t:'flat-seven turn (pattern)',seq:[[0,1],[2,1],[4,1],[6,1],[4,1],[2,1],[6,1],[4,1],[2,1],[0,2]]}],
   minor:[
    {t:'god rest ye merry gentlemen',seq:[[0,1],[0,1],[4,1],[4,1],[3,1],[2,1],[1,1],[0,1],[1,1],[2,1],[3,1],[4,1],[2,1],[1,1],[0,2]]},
    {t:'greensleeves air (trad.)',seq:[[7,1],[9,1],[10,1.5],[11,.5],[12,1],[11,1],[10,1],[8,1.5],[6,.5],[8,1],[7,2]]},
    {t:'la lament (pattern)',seq:[[4,1],[3,1],[2,1],[0,1],[2,1],[3,1],[2,1],[1,1],[0,2],[4,1],[3,1],[2,2]]}],
   locrian:[
    {t:'the wobble house (ours)',seq:[[0,1],[1,1],[0,1],[4,1],[3,1],[4,.5],[3,.5],[1,1],[0,1],[4,2],[0,2]]},
    {t:'unstable steps (pattern)',seq:[[0,1],[4,1],[1,1],[4,1],[0,.5],[1,.5],[0,1],[4,1],[1,1],[0,2]]},
    {t:'tritone tumble (pattern)',seq:[[4,1],[3,1],[4,1],[0,1],[6,1],[4,1],[1,1],[0,1],[4,1],[0,2]]}]
  };
  const FEELNM=['steady','lilt','brisk'];
  let jamT=[],loopIv=null,prevScale=null,lastAud='',_sel=null,_cap=''; // _sel = last exact take, _cap = caption for the UI
  function setModeScale(k){if(!prevScale)prevScale={s:S.scale,r:S.root};S.scale=k;S.root=60;}
  function stopJam(){rhStop();jamT.forEach(clearTimeout);jamT=[];if(loopIv){clearInterval(loopIv);loopIv=null;}
    if(prevScale){S.scale=prevScale.s;S.root=prevScale.r;prevScale=null;}}
  function jn(deg,dt,vel){jamT.push(setTimeout(()=>{if(!AC)return;const c=centsForDegree(deg);
    lessonNote(freqFromCents(c),vel||84);},dt));}
  function playTune(i,fix){stopJam();setModeScale(M7[i].k);lastAud=i+':t';
    const bank=MELS[M7[i].k];let ei,fi;
    if(fix&&_sel&&_sel.i===i){ei=_sel.ei;fi=_sel.fi;} // "again" = the SAME take
    else{let g=0;do{ei=(Math.random()*bank.length)|0;fi=(Math.random()*3)|0;g++;}
      while(g<9&&_sel&&_sel.i===i&&_sel.ei===ei&&_sel.fi===fi);} // never the same take twice in a row
    _sel={i,ei,fi};const e=bank[ei];
    _cap='“'+e.t+'”'+(fi?' · '+FEELNM[fi]:'');
    const step=fi===2?230:310;let t=240;
    jn(0,20,58);jn(4,20,46);
    e.seq.forEach(([d,l],ix)=>{const dur=fi===1?l*(ix%2===0?1.32:0.68):l; // lilt: long-short pairs
      jn(d,t,84+(ix%4===0?10:0));t+=dur*step;});
    jn(0,t+80,56);jn(4,t+80,44);}
  function playRiff(i){stopJam();setModeScale(M7[i].k);lastAud=i+':r';
    const ch=M7[i].ch,step=300;
    jn(0,20,64);jn(4,20,52);
    [0,2,4,ch,4,2,ch,0,2,4,ch,4,7,ch,4,0].forEach((d,ix)=>jn(d,240+ix*step,80+(ix%4===0?12:0)));}
  function playJam(i,mode,fix){ // mode 2=song, 1=riff, else pick; fix=repeat the exact same take
    let k=mode===2?'t':mode===1?'r':(Math.random()<0.55?'t':'r');
    if(!fix&&k==='r'&&(i+':r')===lastAud)k='t';
    if(k==='t')playTune(i,fix);else playRiff(i);}
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
      <div class="lFeed">${_cap} — ${m.feel}</div>
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
    onKey=s=>{ // computer/MIDI keys land on the nearest scale degree — every key still fits
      let bd=1e9,bg=0;for(let d=0;d<8;d++){const df=Math.abs(centsForDegree(d)-s*100);if(df<bd){bd=df;bg=d;}}
      lessonNote(freqFromCents(centsForDegree(bg)),96);
      const pk2=ov.querySelector(`.pKey[data-deg="${bg}"]`);
      if(pk2){pk2.style.transform='translateY(3px)';setTimeout(()=>pk2.style.transform='',90);}};
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
  function crsProg(c){const T={rhythm:[prog.r|0,8],piano:[Object.keys(prog.pl||{}).length,8],intervals:[Math.min(prog.iv|0,10),10],chords:[prog.ch|0,9],modes:[M7.filter(m=>(prog.g[m.k]|0)>=3).length,7]}[c];
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
      if(c==='rhythm')rhythmCourse();else if(c==='piano')pianoMenu();else if(c==='chords')chordCourse(+(b.dataset.i||0));
      else if(c==='intervals')ivCourse(!!b.dataset.i);else mHome();}
    else if(a==='pmenu')pianoMenu();
    else if(a==='pkeys'){pIdx=0;pFound={};pianoView();}
    else if(a==='plsn')scaleLesson(+b.dataset.l,+(b.dataset.r||0));
    else if(a==='rhfast')rhythmCourse(126);
    else if(a==='pblacks')pianoBlacks();
    else if(a==='strum')strum();
    else if(a==='ivpick')ivPick(+b.dataset.s);else if(a==='ivplay')ivPlay();
    else if(a==='listen')listen(+(b.dataset.i||0));else if(a==='replay')playJam(+b.dataset.i,+(b.dataset.r||0),true);
    else if(a==='matchmenu')matchMenu();
    else if(a==='startsess'){diff=b.dataset.d||'easy';sessN=0;guess();}
    else if(a==='sessend')sessEnd();
    else if(a==='guess')guess();else if(a==='mcreate')mcreate();});
  function enter(){
    if(S.slimeMode)$id('slimeBig').click();if(drumOn)$id('drumBtn').click();if(bandOn)$id('bandBtn').click();
    balls.length=0;initAudio();if(AC&&AC.state==='suspended')AC.resume();if(!S.playing)setPlaying(true);
    ov.hidden=false;home();}
  function exit(){stopJam();onKey=null;ov.hidden=true;}
  function noteIn(m,vel){ // notes from the computer keyboard or a MIDI keyboard land IN the lesson
    if(AC&&AC.state==='suspended')AC.resume();
    if($id('rhPad')){rhTap();return;} // rhythm lesson: any key is a tap
    let s=m-60;while(s<0)s+=12;while(s>24)s-=12; // fold far octaves onto the visible keys
    if(onKey)onKey(s);else lessonNote(440*Math.pow(2,(60+s-69)/12),vel||96);}
  return {enter,exit,noteIn,_scene:(i,v)=>sceneURL(i,v)};
})();
// (no auto-enter on load: the three doors always come first)

// ================= slimehedron LEARN MODE =================
// four small courses, one pixel piano, zero grades. loaded after the main script,
// borrows the live synth (playSynth), the color wheel (degRGB) and the pixel slimes (pixSlime).
window.LEARN=(function(){
  'use strict';
  const $id=x=>document.getElementById(x);
  const lf=()=>$id('lFeed');

  // ============ shared: the pixel piano ============
  const PN={0:'C',2:'D',4:'E',5:'F',7:'G',9:'A',11:'B',12:'C'};
  const WK=[0,2,4,5,7,9,11,12], BK=[[1,0],[3,1],[6,3],[8,4],[10,5]]; // black: [semitone, after-white-index]
  function pianoHTML(labels){
    const w=WK.map(s=>`<div class="pxW" data-s="${s}"><span>${labels&&labels[s]!=null?labels[s]:''}</span></div>`).join('');
    const b=BK.map(([s,wi])=>`<div class="pxB" data-s="${s}" style="left:${wi*36+25}px"></div>`).join('');
    return `<div class="pxPiano"><div class="pxKeys">${w}${b}</div></div>`;
  }
  function pianoPlay(s,vel){const f=440*Math.pow(2,(60+s-69)/12);playSynth(f,vel||96,0.7);}
  function decorate(tones){const wrap=ov.querySelector('.pxKeys');if(!wrap)return;
    wrap.querySelectorAll('.pxSlM').forEach(e=>e.remove());
    wrap.querySelectorAll('[data-s]').forEach(k=>k.classList.toggle('hl',tones.includes(+k.dataset.s)));
    tones.forEach((s,i)=>{const k=wrap.querySelector(`[data-s="${s}"]`);if(!k)return;
      const d=document.createElement('div');d.className='pxSlM';
      d.style.left=(k.offsetLeft+(k.classList.contains('pxB')?-4:2))+'px';
      d.style.animationDelay=(i*0.13)+'s';
      d.innerHTML=pixSlime(['#9fe6cf','#c4a9f5','#ffb6d6','#ffd3a8'][i%4],'happy');
      wrap.appendChild(d);});}
  let onKey=null; // the active course decides what a key press means

  // ============ course 1: the piano — where notes live ============
  const HINT={0:'just left of the TWO black keys',2:'right between the two black keys',4:'just right of the two black keys',
    5:'just left of the THREE black keys',7:'inside the three — left side',9:'inside the three — right side',
    11:'just right of the three black keys',12:'left of the next two black keys — the pattern repeats'};
  let pIdx=0,pFound={};
  function pianoCourse(){stopJam();pIdx=0;pFound={};pianoView();}
  function pianoView(){const t=WK[pIdx];
    ov.innerHTML=`<div class="lCard"><h3>the piano · where the notes live</h3>
      <p class="lSub">${pIdx===0?'seven note names, repeating across the whole piano. find C — it sits '+HINT[0]+'.':'find '+PN[t]+' — '+HINT[t]+'.'}</p>
      ${pianoHTML(pFound)}
      <div class="lFeed" id="lFeed"></div>
      <div class="lRow"><button class="btn" data-a="home">menu</button></div></div>`;
    onKey=s=>{pianoPlay(s);
      if(s===t){pFound[s]=PN[s];decorate([s]);
        if(pIdx<WK.length-1){lf().textContent=`that's ${PN[s]}.`;pIdx++;setTimeout(pianoView,850);}
        else{onKey=null;lf().textContent='that C again — one octave higher. seven names, repeating forever. you know the whole map now.';
          const b=document.createElement('button');b.className='btn primary';b.textContent='next: build chords ▸';b.dataset.a='crs';b.dataset.c='chords';
          ov.querySelector('.lRow').prepend(b);}}
      else lf().textContent=(PN[s]?`that one is ${PN[s]}`:'that is a black key — sharps and flats, coming soon')+`. ${PN[t]} is ${HINT[t]}.`;};}

  // ============ course 2: chords — three notes, one mood ============
  const CHORDS=[
    ['C major','the home chord — bright and settled',[0,4,7],'three notes stacked in thirds: C · E · G. almost every song you know starts here.'],
    ['C minor','slide the MIDDLE note down one key — the mood clouds over',[0,3,7],'C · E♭ · G. one small move, a whole new feeling.'],
    ['C sus4','push the middle note UP to F instead — floating, unresolved',[0,5,7],'no third at all: the chord holds its breath until it lands back on major.'],
    ['C sus2','or pull the middle down to D — open and airy',[0,2,7],'also thirdless: wide open sky.'],
    ['C diminished','minor, then the TOP note drops too — tiptoe music',[0,3,6],'every gap is small. composers use it for suspense.'],
    ['C augmented','major, then the top note RISES — dreamlike, off balance',[0,4,8],'every gap is wide. like floating up stairs that are not there.'],
    ['C major 7','major plus one more third on top — cozy and jazzy',[0,4,7,11],'four notes now: the 7th softens everything it touches.'],
    ['C minor 7','minor plus a 7th — smooth and thoughtful',[0,3,7,10],'the sound of rainy-day jazz records.'],
    ['C7 (dominant)','major plus a FLAT 7th — the engine that wants to move',[0,4,7,10],'blues and rock run on this chord. it always pushes to the next one.']
  ];
  let cIdx=0;
  function chordCourse(i){stopJam();cIdx=Math.max(0,Math.min(CHORDS.length-1,i||0));
    const[name,desc,tones,extra]=CHORDS[cIdx];
    ov.innerHTML=`<div class="lCard"><h3>chords ${cIdx+1}/${CHORDS.length} · ${name}</h3>
      <p class="lSub">${desc}.</p>
      ${pianoHTML(PN)}
      <div class="lFeed">${extra}</div>
      <div class="lRow">
        <button class="btn primary" data-a="strum">▸ hear it</button>
        ${cIdx>0?`<button class="btn" data-a="crs" data-c="chords" data-i="${cIdx-1}">◂</button>`:''}
        ${cIdx<CHORDS.length-1?`<button class="btn primary" data-a="crs" data-c="chords" data-i="${cIdx+1}">next chord ▸</button>`:''}
        <button class="btn" data-a="home">menu</button></div></div>`;
    decorate(tones);onKey=null;}
  function strum(){const tones=CHORDS[cIdx][2];
    tones.forEach((s,i)=>setTimeout(()=>pianoPlay(s,92),i*150));       // rolled, so each note is heard joining
    setTimeout(()=>tones.forEach(s=>pianoPlay(s,80)),tones.length*150+520);} // then all together

  // ============ course 3: intervals — the space between notes ============
  const IVS=[[2,'2nd','next-door neighbors'],[4,'3rd','the sweet step'],[5,'4th','a confident leap'],
    [7,'5th','the strong stride'],[9,'6th','a warm reach'],[11,'7th','leaning, almost home'],[12,'octave','same name, higher home']];
  let ivRound=0,ivAns=null;
  function ivPool(){return ivRound<4?[IVS[0],IVS[3]]:ivRound<8?[IVS[0],IVS[1],IVS[3],IVS[6]]:IVS;}
  function ivPlay(){pianoPlay(0,90);setTimeout(()=>pianoPlay(ivAns[0],90),650);}
  function ivCourse(){stopJam();ivRound++;
    const pool=ivPool();ivAns=pool[Math.floor(Math.random()*pool.length)];
    let opts=[...pool].sort(()=>Math.random()-0.5).slice(0,Math.min(3,pool.length));
    if(!opts.includes(ivAns))opts[Math.floor(Math.random()*opts.length)]=ivAns;
    ivPlay();
    ov.innerHTML=`<div class="lCard"><h3>intervals · round ${ivRound}</h3>
      <p class="lSub">an interval is the distance between two notes. both start from C — how far did the second one go?</p>
      ${pianoHTML(PN)}
      <div class="lRow">${opts.map(o=>`<button class="btn" data-a="ivpick" data-s="${o[0]}">${o[1]} · ${o[2]}</button>`).join('')}</div>
      <div class="lFeed" id="lFeed"></div>
      <div class="lRow"><button class="btn" data-a="ivplay">↻ hear it again</button><button class="btn" data-a="home">menu</button></div></div>`;
    decorate([0]);onKey=s=>pianoPlay(s);} // free exploration allowed while thinking — that IS ear training
  function ivPick(s){const f=lf();
    if(s===ivAns[0]){decorate([0,ivAns[0]]); // reveal: two slimes standing the distance apart
      f.textContent=`yes — C up to ${PN[ivAns[0]]||'the black key'} is a ${ivAns[1]}: ${ivAns[2]}.`;
      const row=ov.querySelector('.lRow');
      const nx=document.createElement('button');nx.className='btn primary';nx.textContent='next round ▸';nx.dataset.a='crs';nx.dataset.c='intervals';row.prepend(nx);}
    else{const g=IVS.find(v=>v[0]===s);
      f.textContent=`that would be a ${g[1]} — ${g[2]}. listen once more.`;
      setTimeout(()=>{pianoPlay(0,80);setTimeout(()=>pianoPlay(s,80),550);},100); // play THEIR guess so the difference is audible
      setTimeout(ivPlay,1800);}} // then the real one

  // ============ course 4: the seven modes — the mood machine ============
  const M7=[
   {k:'major',n:'ionian (major)',scene:'sunny meadow',feel:'bright and settled',ch:4,cam:[13,10]},
   {k:'dorian',n:'dorian',scene:'twilight forest',feel:'cool and mysterious',ch:5,cam:[8.8,10.8]},
   {k:'phrygian',n:'phrygian',scene:'desert oasis',feel:'dramatic and far away',ch:1,cam:[5.8,13]},
   {k:'lydian',n:'lydian',scene:'floating islands',feel:'floating and curious',ch:3,cam:[8.5,9.4]},
   {k:'mixolydian',n:'mixolydian',scene:'vintage carnival',feel:'warm and playful',ch:6,cam:[13.9,10.1]},
   {k:'minor',n:'aeolian (minor)',scene:'rainy city',feel:'quiet and thoughtful',ch:5,cam:[15.1,11.6]},
   {k:'locrian',n:'locrian',scene:'fractured mirror',feel:'unstable and eerie',ch:4,cam:[4,13.4]}
  ];
  const ART={
   major:[[0,0,16,11,'#aee3ff'],[12,1,3,3,'#ffe39c'],[2,2,4,1,'#fff'],[3,1,2,1,'#fff'],[8,3,3,1,'#fff'],[0,11,16,5,'#93d97b'],[2,12,1,1,'#ffb6d6'],[6,13,1,1,'#fff0cf'],[10,13,1,1,'#ffd3e7'],[4,14,1,1,'#fff'],[12,9,3,2,'#9fe6cf'],[12.6,9.5,.5,.5,'#5a4f78'],[13.9,9.5,.5,.5,'#5a4f78'],[13,10.3,1,.3,'#5a4f78']],
   dorian:[[0,0,16,16,'#4d3f77'],[12,2,2,2,'#fff0cf'],[1,6,3,7,'#274b3d'],[2,4,1,2,'#274b3d'],[6,7,4,6,'#2f5d4a'],[7,5,2,2,'#2f5d4a'],[12,8,3,5,'#274b3d'],[0,13,16,3,'#1e2f45'],[8.2,10.5,.6,.6,'#ffe39c'],[9.4,10.5,.6,.6,'#ffe39c']],
   phrygian:[[0,0,16,9,'#3a3358'],[2,2,.6,.6,'#fff'],[6,1,.5,.5,'#fff'],[13,3,.6,.6,'#fff'],[10,2,.4,.4,'#fff'],[4,4,.4,.4,'#fff'],[0,9,16,7,'#e6c78e'],[0,12,16,4,'#d6af70'],[11,6,1,4,'#8a6a4a'],[9,5,2,1,'#4a9f6f'],[12,5,2,1,'#4a9f6f'],[10,4,1,1,'#4a9f6f'],[12,4,1,1,'#4a9f6f'],[4,12,4,2,'#9fe6cf'],[5,12.5,.5,.5,'#fff'],[4.8,13,.4,.4,'#5a4f78'],[6.6,13,.4,.4,'#5a4f78']],
   lydian:[[0,0,16,16,'#d9c6ff'],[1,3,3,1,'#fff'],[11,2,3,1,'#fff'],[13,13,2,1,'#fff'],[8,2,.5,.5,'#fff'],[3,6,6,1,'#93d97b'],[4,7,4,2,'#b98a63'],[9,11,5,1,'#93d97b'],[10,12,3,1.5,'#b98a63'],[7.6,8.8,1.8,1.4,'#9fe6cf'],[7.9,9.2,.4,.4,'#5a4f78'],[8.8,9.2,.4,.4,'#5a4f78']],
   mixolydian:[[0,0,16,10,'#ffd9a8'],[3,6,10,5,'#ff8a8a'],[4,6,1,5,'#fff6ec'],[6,6,1,5,'#fff6ec'],[8,6,1,5,'#fff6ec'],[10,6,1,5,'#fff6ec'],[5,4,6,1,'#e0576f'],[4,5,8,1,'#e0576f'],[7.5,2.4,.3,1.6,'#5a4f78'],[7.8,2.4,1.2,.8,'#9fe6cf'],[0,11,16,5,'#e8b471'],[13,9.4,1.8,1.6,'#9fe6cf'],[13.3,9.8,.4,.4,'#5a4f78'],[14.2,9.8,.4,.4,'#5a4f78']],
   minor:[[0,0,16,16,'#31406b'],[1,7,3,9,'#222c4e'],[5,5,3,11,'#1a2340'],[9,8,3,8,'#222c4e'],[13,6,2,10,'#1a2340'],[2,8,.7,.7,'#ffe39c'],[6,7,.7,.7,'#ffe39c'],[6,9.4,.7,.7,'#ffe39c'],[10,9.4,.7,.7,'#ffe39c'],[13.6,7.6,.7,.7,'#ffe39c'],[3,1,.3,2,'#8fa8d9'],[7,2.4,.3,2,'#8fa8d9'],[11,.6,.3,2,'#8fa8d9'],[14,3,.3,2,'#8fa8d9'],[5,3.4,.3,2,'#8fa8d9'],[9,1.4,.3,2,'#8fa8d9'],[14.6,10.5,1,2.4,'#9fe6cf'],[14.8,11,.35,.35,'#5a4f78'],[15.4,11,.35,.35,'#5a4f78']],
   locrian:[[0,0,16,16,'#454a73'],[2,2,4,1,'#cfe2ff'],[3,4,1,4,'#b8cdf5'],[9,2.6,1,5,'#cfe2ff'],[11,7,4,1,'#b8cdf5'],[5,9,1,4,'#a9bce8'],[12,10.6,1,3,'#cfe2ff'],[7,12,3,1,'#b8cdf5'],[7.8,0,.35,16,'#2c3357'],[0,7.8,16,.35,'#2c3357'],[3,13,1.1,1,'#9fe6cf'],[4.5,13.4,.8,.8,'#9fe6cf'],[5.7,13.1,.6,.6,'#9fe6cf'],[3.3,13.3,.35,.35,'#5a4f78']]
  };
  const px=a=>a.map(r=>`<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" fill="${r[4]}"/>`).join('');
  const sceneSVG=(i,extra)=>`<svg viewBox="0 0 16 16" shape-rendering="crispEdges" style="width:100%;display:block;border-radius:10px">${px(ART[M7[i].k])}${extra||''}</svg>`;
  // modal jams: generated live by the synth, leaning on each mode's character tone
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
  // progress: local recognition only, never grades
  let prog={g:{},cam:{}};try{prog=Object.assign(prog,JSON.parse(localStorage.getItem('slimehedron-learn')||'{}'));}catch(e){}
  const saveP=()=>{try{localStorage.setItem('slimehedron-learn',JSON.stringify(prog));}catch(e){}};
  let rounds=0;
  function stickers(){return '<div class="lStickers">'+M7.map(m=>`<span class="lStk${(prog.g[m.k]|0)>=3?' got':''}" title="${m.n} — match it 3 times">${(prog.g[m.k]|0)>=3?'●':'○'}</span>`).join('')+'</div>';}
  function mHome(){stopJam();onKey=null;ov.innerHTML=`<div class="lCard">
    <h3>the seven modes</h3>
    <p class="lSub">every mode is a mood. the same seven notes, started from a different place, change how music feels.</p>
    <div class="lBtns">
      <button class="btn primary big" data-a="listen">listen — a tour of the seven moods</button>
      <button class="btn big" data-a="guess">match — which scene fits the sound?</button>
      <button class="btn big" data-a="mcreate">compose — score a scene yourself</button>
    </div>${stickers()}
    <div class="lRow"><button class="btn" data-a="home">◂ all courses</button></div></div>`;}
  function listen(i){i=i||0;stopJam();playJam(i);const m=M7[i];
    ov.innerHTML=`<div class="lCard"><h3>${i+1} of 7 · ${m.n}</h3>
      <div class="lBig">${sceneSVG(i)}</div>
      <div class="lFeed">${m.scene} — ${m.feel}</div>
      <div class="lRow">${i>0?'<button class="btn" data-a="listen" data-i="'+(i-1)+'">◂ back</button>':''}
      <button class="btn" data-a="replay" data-i="${i}">↻ hear it again</button>
      ${i<6?'<button class="btn primary" data-a="listen" data-i="'+(i+1)+'">next ▸</button>':'<button class="btn primary" data-a="crs" data-c="modes">done — seven moods, seven modes</button>'}</div></div>`;}
  function guess(){stopJam();rounds++;
    const n=rounds<4?2:rounds<7?3:4;
    const ans=Math.floor(Math.random()*7);
    const opts=[ans];while(opts.length<n){const c=Math.floor(Math.random()*7);if(!opts.includes(c))opts.push(c);}
    opts.sort(()=>Math.random()-0.5);
    playJam(ans);
    ov.innerHTML=`<div class="lCard"><h3>round ${rounds} · listen</h3>
      <p class="lSub">which scene fits this sound?</p>
      <div class="lScenes">${opts.map(o=>`<div class="lScene" data-pick="${o}" data-ans="${ans}">${sceneSVG(o)}<b>${M7[o].scene}</b></div>`).join('')}</div>
      <div class="lFeed" id="lFeed"></div>
      <div class="lRow"><button class="btn" data-a="replay" data-i="${ans}">↻ hear it again</button><button class="btn" data-a="crs" data-c="modes">menu</button></div></div>`;}
  function pick(el){const p=+el.dataset.pick,a=+el.dataset.ans,f=lf();
    if(p===a){const k=M7[a].k;prog.g[k]=(prog.g[k]|0)+1;saveP();
      f.textContent=`yes — that's ${M7[a].n}. ${M7[a].feel}.`;
      ov.querySelectorAll('.lScene').forEach(s=>{if(+s.dataset.pick!==a)s.classList.add('dim');});
      const row=ov.querySelector('.lRow');
      if(prog.g[k]===3){const b=document.createElement('button');b.className='btn';b.textContent='find the hidden slime';b.dataset.a='cameo';b.dataset.i=a;row.prepend(b);}
      const nx=document.createElement('button');nx.className='btn primary';nx.textContent='next round ▸';nx.dataset.a='guess';row.prepend(nx);
    }else{f.textContent=`not this one — ${M7[p].scene} would sound ${M7[p].feel}. listen again.`;el.classList.add('dim');playJam(a);}}
  function cameo(i){const m=M7[i];
    ov.innerHTML=`<div class="lCard"><h3>${m.scene}</h3>
      <div class="lBig">${sceneSVG(i,`<circle cx="${m.cam[0]}" cy="${m.cam[1]}" r="2" fill="none" stroke="#fff" stroke-width="0.35"><animate attributeName="r" values="2;2.6;2" dur="1.2s" repeatCount="indefinite"/></circle>`)}</div>
      <div class="lFeed">there — a slime lives in every scene. you found this one.</div>
      <div class="lRow"><button class="btn primary" data-a="guess">keep matching ▸</button><button class="btn" data-a="crs" data-c="modes">menu</button></div></div>`;}
  function mcreate(pickI){stopJam();
    if(pickI==null){ov.innerHTML=`<div class="lCard"><h3>compose</h3>
      <p class="lSub">choose a scene. the keys will only play notes from its mode — every choice you make belongs.</p>
      <div class="lScenes">${M7.map((m,i)=>`<div class="lScene" data-cre="${i}">${sceneSVG(i)}<b>${m.scene}</b></div>`).join('')}</div>
      <div class="lRow"><button class="btn" data-a="crs" data-c="modes">menu</button></div></div>`;return;}
    const m=M7[pickI];startBacking(pickI);
    const keys=[0,1,2,3,4,5,6,7].map(d=>{const c=degRGB(d%7);
      return `<button class="pKey" data-deg="${d}" style="background:rgb(${(c[0]+(255-c[0])*.3)|0},${(c[1]+(255-c[1])*.3)|0},${(c[2]+(255-c[2])*.3)|0})">${d+1}</button>`;}).join('');
    ov.innerHTML=`<div class="lCard"><h3>${m.n}</h3>
      <div class="lBig">${sceneSVG(pickI)}</div>
      <div class="pPiano">${keys}</div>
      <div class="lFeed">every key belongs to ${m.n} — play what the scene feels like. composers all write it differently.</div>
      <div class="lRow"><button class="btn" data-a="mcreate">other scenes</button><button class="btn" data-a="crs" data-c="modes">menu</button></div></div>`;}

  // ============ course menu + overlay plumbing ============
  const ov=document.createElement('div');ov.id='learnOverlay';ov.hidden=true;document.body.appendChild(ov);
  function home(){stopJam();onKey=null;ov.innerHTML=`<div class="lCard">
    <h3>learn</h3>
    <p class="lSub">real music theory in small steps — the same words musicians use, taught by slimes.</p>
    <div class="lBtns">
      <button class="btn big" data-a="crs" data-c="piano">1 · the piano — where the notes live</button>
      <button class="btn big" data-a="crs" data-c="chords">2 · chords — three notes, one mood</button>
      <button class="btn big" data-a="crs" data-c="intervals">3 · intervals — the space between notes</button>
      <button class="btn primary big" data-a="crs" data-c="modes">4 · the seven modes — moods and scenes</button>
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
  function enter(){ // clear the desk: lessons drive the sound, not the physics
    if(S.slimeMode)$id('slimeBig').click();if(drumOn)$id('drumBtn').click();if(bandOn)$id('bandBtn').click();
    balls.length=0;initAudio();if(AC&&AC.state==='suspended')AC.resume();if(!S.playing)setPlaying(true);
    ov.hidden=false;home();}
  function exit(){stopJam();onKey=null;ov.hidden=true;}
  return {enter,exit};
})();
if(S.mode==='learn')LEARN.enter(); // if the last session ended in learn, reopen the classroom

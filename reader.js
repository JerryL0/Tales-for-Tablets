// Reading controls and five reusable activity types; no external dependencies.
let current = null, page = 0, audioContext, speechToken = 0;
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let paused = motionQuery.matches, muted = false;
let progress = {};
try {
  const stored = JSON.parse(localStorage.getItem('tales-progress-v2') || '{}');
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) progress = stored;
} catch {}
const all = s => [...document.querySelectorAll(s)];
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const chapterNow = () => current.pages[page];
let state;
function save() {
  try { localStorage.setItem('tales-progress-v2', JSON.stringify(progress)); } catch {}
}
function tone(finish = false) {
  if (muted) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume();
    (finish ? [392, 523, 659] : [440]).forEach((hz, i) => {
      const o = audioContext.createOscillator(), g = audioContext.createGain();
      const t = audioContext.currentTime + i * .13;
      o.frequency.value = hz;
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(.06, t + .02);
      g.gain.exponentialRampToValueAtTime(.0001, t + .25);
      o.connect(g); g.connect(audioContext.destination); o.start(t); o.stop(t + .27);
    });
  } catch {}
}
function stopVoice() {
  speechToken++;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  if ($('#readAloud')) $('#readAloud').textContent = 'Read this chapter aloud';
  all('.speaking').forEach(p => p.classList.remove('speaking'));
}
function narrate() {
  if (!('speechSynthesis' in window)) { feedback('This browser does not provide narration. You can read the passage together.'); return; }
  if (muted) { feedback('Turn sound on in the header to listen to this chapter.'); return; }
  if (window.speechSynthesis.speaking) { stopVoice(); return; }
  const token = ++speechToken;
  const parts = [chapterNow().title, ...chapterNow().paragraphs];
  $('#readAloud').textContent = 'Stop reading aloud';
  function speak(i) {
    if (token !== speechToken) return;
    all('.speaking').forEach(p => p.classList.remove('speaking'));
    if (i === parts.length) { stopVoice(); return; }
    const paragraph = all('.passage p')[i - 1];
    paragraph?.classList.add('speaking');
    const u = new SpeechSynthesisUtterance(parts[i]);
    u.lang = 'en-US'; u.rate = .86;
    u.onend = () => speak(i + 1);
    u.onerror = () => { if (token === speechToken) stopVoice(); };
    window.speechSynthesis.speak(u);
  }
  speak(0);
}
function renderBooks() {
  $('#books').innerHTML = stories.map((s, i) => '<article class="book"><div class="cover">' + art(s.id) +
    '<span class="tag">8 chapters with interactive scenes</span></div><div class="book-info"><div class="book-meta"><span>' +
    s.category + '</span><span>' + s.age + '</span></div><h3>' + s.title + '</h3><p>' + s.desc +
    '</p><button data-book="' + i + '">' + (progress[s.id]?.finished ? 'Read this book again' : progress[s.id] ? 'Continue reading' : 'Open this book') +
    '<span>↗</span></button></div></article>').join('');
  all('[data-book]').forEach(b => b.onclick = () => openBook(Number(b.dataset.book)));
}
function home() {
  stopVoice(); current = null;
  $('#reader').hidden = true; $('#library').hidden = false;
  renderBooks(); window.scrollTo(0, 0);
}
function openBook(i) {
  current = stories[i];
  const saved = progress[current.id];
  page = saved?.finished ? 0 : clamp(Number.isInteger(saved?.page) ? saved.page : 0, 0, current.pages.length - 1);
  $('#library').hidden = true; $('#reader').hidden = false;
  renderPage(); window.scrollTo(0, 0);
}
const instructions = {
  match: 'Drag each object onto its matching place in the picture. You can also select an object, then tap its destination.',
  travel: 'Guide the character through the numbered landmarks in order. Drag across the scene, tap a destination, or use the arrow controls.',
  reveal: 'Brush across the covered patches to discover what is underneath. You can also tap a patch several times to clear it.',
  adjust: 'Move the slider slowly and watch how the scene changes. Find the green band, then leave the control there.',
  sequence: 'Read the passage for clues, then use the controls in the order the story describes. Watch the scene change after each step.'
};
function renderPage(focus = true) {
  stopVoice();
  state = { done: new Set(), selected: null, step: 0, x: 12, y: 76, complete: false, brush: [0,0,0,0] };
  progress[current.id] = { page, finished: false }; save();
  const p = chapterNow();
  $('#reader').innerHTML = '<div class="reader-top"><button id="backLibrary">← Library</button><label class="chapter-select">Chapter <select id="chapters" aria-label="Choose chapter">' +
    current.pages.map((c, i) => '<option value="' + i + '"' + (i === page ? ' selected' : '') + '>' + (i+1) + '. ' + c.title + '</option>').join('') +
    '</select></label><button id="motion" aria-pressed="' + paused + '">' + (paused ? 'Resume animation' : 'Pause animation') +
    '</button></div><div class="chapter-heading"><span class="eyebrow">' + current.title + ' · Chapter ' + (page+1) + ' of 8</span><h1 tabindex="-1" id="chapterTitle">' +
    p.title + '</h1></div><section class="reading-spread"><div class="play-column"><div class="activity-world ' +
    current.id + ' mode-' + p.mode + (paused ? ' paused' : '') + '" id="world"><div class="environment">' + environment(current.id) +
    '</div><div class="atmosphere" aria-hidden="true">' + Array.from({length:10},(_,i)=>'<i style="--i:'+i+'"></i>').join('') +
    '</div><div class="play-stage" id="stage" aria-label="Interactive scene"></div><div class="scene-caption" id="sceneCaption">' +
    activityCaption(p) + '</div></div><div class="activity-controls" id="controls"></div><div class="activity-help"><p id="instructions">' +
    instructions[p.mode] + '</p><button id="resetActivity">↻ Reset activity</button></div><div class="feedback" role="status" aria-live="polite" id="feedback"></div></div>' +
    '<div class="reading-column"><button class="read-aloud" id="readAloud">Read this chapter aloud</button><div class="passage">' +
    p.paragraphs.map(t=>'<p>'+t+'</p>').join('') + '</div></div></section><div class="reader-bottom"><button id="previous"' +
    (page===0?' disabled':'') + '>← Previous chapter</button><span class="page-count">' + (page+1) +
    ' / 8</span><button class="primary" id="next">' + (page===7?'Finish reading':'Continue reading') + ' →</button></div>';
  $('#backLibrary').onclick = home;
  $('#previous').onclick = () => { if (page>0) {page--;renderPage();} };
  $('#next').onclick = () => { if(page<7){page++;renderPage();}else finish(); };
  $('#chapters').onchange = e => { page = Number(e.target.value); renderPage(); };
  $('#readAloud').onclick = narrate;
  $('#resetActivity').onclick = () => { renderPage(false); $('#resetActivity').focus(); };
  $('#motion').onclick = () => {
    paused = !paused; $('#world').classList.toggle('paused', paused);
    $('#motion').setAttribute('aria-pressed', String(paused));
    $('#motion').textContent = paused ? 'Resume animation' : 'Pause animation';
  };
  ({match:setupMatch,travel:setupTravel,reveal:setupReveal,adjust:setupAdjust,sequence:setupSequence})[p.mode](p);
  if(focus) { $('#chapterTitle').focus({preventScroll:true}); window.scrollTo(0,0); }
}
function activityCaption(p) {
  return ({match:'Find a place for each object in the scene.',travel:'Follow the landmarks in order.',reveal:'Look beneath the covering.',adjust:'Watch what changes as you adjust the control.',sequence:'Use the story to work out what happens first.'})[p.mode];
}
function feedback(text) { if($('#feedback')) $('#feedback').textContent = text; }
function completeActivity() {
  if(state.complete) return;
  state.complete = true; tone(true);
  $('#world').classList.add('resolved');
  $('#sceneCaption').textContent = 'You can reset the scene to explore it again.';
  feedback(chapterNow().result);
}
// Simple original SVG environments keep interactive objects separate from decorative scenery.
function environment(id) {
  const space = '<rect width="600" height="440" fill="#343252"/><g fill="#fff0be">' +
    Array.from({length:27},(_,i)=>'<circle cx="'+((i*97)%600)+'" cy="'+((i*53)%350)+'" r="'+(i%3+1)+'"/>').join('') +
    '</g><circle cx="495" cy="80" r="46" fill="#e5c6a0"/><circle cx="480" cy="65" r="9" fill="#cab198"/><circle cx="510" cy="93" r="13" fill="#cab198"/><path d="M0 380Q140 320 300 385T600 370V440H0" fill="#bd7f70"/><path d="M0 415Q200 355 400 420T600 398V440H0" fill="#dda486"/>';
  const forest = '<rect width="600" height="440" fill="#c5d4ae"/><circle cx="420" cy="75" r="55" fill="#f4df9d"/><path d="M0 300Q200 240 400 310T600 280V440H0" fill="#8fa778"/><path d="M0 350Q220 300 430 370T600 325V440H0" fill="#78936c"/><path d="M300 270Q120 340 340 440H470Q220 340 330 270" fill="#a7d3d8"/><g fill="#866c53"><path d="M30 0h35l20 440H20zM530 0h30l25 440h-60z"/></g><g fill="#6f916b"><circle cx="40" cy="35" r="110"/><circle cx="560" cy="20" r="105"/></g><g fill="#aec192"><circle cx="120" cy="15" r="75"/><circle cx="470" cy="0" r="64"/></g>';
  const sea = '<rect width="600" height="440" fill="#58949f"/><path d="M40 0l100 440h70L110 0M400 0L300 440h80L470 0" fill="#cce9cf" opacity=".2"/><path d="M0 370Q200 335 400 390T600 350V440H0" fill="#dfcda4"/><g fill="none" stroke="#477b6b" stroke-width="13" stroke-linecap="round"><path d="M40 440Q0 350 50 290M60 440Q110 360 80 310M550 440Q500 330 550 260M565 440Q610 330 585 290"/></g><g fill="#dc9a89"><ellipse cx="390" cy="405" rx="45" ry="22"/><ellipse cx="440" cy="417" rx="28" ry="16"/></g><g class="swimming-fish" fill="#efd074"><path d="M90 160q25-25 50 0-25 25-50 0l-17 15v-30z"/><circle cx="128" cy="157" r="2" fill="#354559"/></g>';
  return '<svg viewBox="0 0 600 440" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'+({space,forest,sea})[id]+'</svg>';
}
function setupMatch(p) {
  const rocket = current.id==='space' && page===1;
  $('#stage').innerHTML = (rocket?'<div class="rocket-body" aria-hidden="true"></div>':'') + p.items.map((x,i)=>
    '<button class="place" data-place="'+i+'" style="left:'+x[2]+'%;top:'+x[3]+'%" aria-label="Place selected object: '+x[1]+'"><span class="place-symbol">'+x[0]+'</span><small>'+x[1]+'</small></button>').join('');
  // Reverse the tray so matching is spatial rather than a row of identical-order choices.
  $('#controls').innerHTML = '<div class="object-tray" aria-label="Objects to place">'+p.items.map((x,i)=>({x,i})).reverse().map(({x,i})=>
    '<button class="piece" data-piece="'+i+'" aria-pressed="false"><span>'+x[0]+'</span><small>'+x[1].replace(' shelf','').replace(' hollow','').replace(' compartment','')+'</small></button>').join('')+'</div>';
  all('[data-place]').forEach(b=>b.onclick=()=>placeSelected(Number(b.dataset.place)));
  all('[data-piece]').forEach(b=>{
    const index=Number(b.dataset.piece);
    b.onclick=()=>selectPiece(index);
    let origin=null, moved=false, suppress=false;
    b.addEventListener('click',e=>{if(suppress){e.stopImmediatePropagation();suppress=false;}},true);
    b.onpointerdown=e=>{
      if(b.disabled)return;
      origin={x:e.clientX,y:e.clientY};moved=false;b.setPointerCapture(e.pointerId);
    };
    b.onpointermove=e=>{
      if(!origin)return;
      const dx=e.clientX-origin.x,dy=e.clientY-origin.y;
      if(Math.hypot(dx,dy)>7)moved=true;
      if(moved){b.style.transform='translate('+dx+'px,'+dy+'px)';b.classList.add('dragging');}
    };
    b.onpointerup=e=>{
      if(!origin)return;
      if(moved){
        suppress=true;selectPiece(index);
        const destination=all('[data-place]').find(slot=>{const r=slot.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;});
        if(destination)placeSelected(Number(destination.dataset.place));
        else feedback('The object needs a place in the picture. Match its shape and label, or select it and tap a destination.');
      }
      origin=null;b.style.transform='';b.classList.remove('dragging');
    };
    b.onpointercancel=()=>{origin=null;b.style.transform='';b.classList.remove('dragging');};
  });
}
function selectPiece(i) {
  if(state.done.has(i))return;
  state.selected=i;
  all('[data-piece]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.piece)===i)));
  feedback('Choose where to place '+chapterNow().items[i][1].toLowerCase()+'.');
}
function placeSelected(destination) {
  const i=state.selected;
  if(i===null){feedback('First select an object from the tray below the scene.');return;}
  if(i!==destination){feedback('That place is for '+chapterNow().items[destination][1].toLowerCase()+'. Try matching the selected object to its label.');return;}
  state.done.add(i);state.selected=null;tone();
  const slot=$('[data-place="'+i+'"]');slot.classList.add('filled');slot.setAttribute('aria-label',chapterNow().items[i][1]+' is in place');
  const piece=$('[data-piece="'+i+'"]');piece.disabled=true;piece.setAttribute('aria-pressed','false');
  feedback(chapterNow().items[i][1]+' is in place. '+state.done.size+' of '+chapterNow().items.length+' objects have been placed.');
  if(state.done.size===chapterNow().items.length)completeActivity();
}
const waypoints = [[30,28],[56,66],[82,26]];
function actorArt() {
  if(current.id==='space')return '<svg viewBox="0 0 80 100" aria-hidden="true"><path class="flame" d="M24 72l16 28 16-28" fill="#efb84e"/><path d="M22 49L5 83l24-7M58 49l17 34-24-7" fill="#d87e70"/><path d="M22 77V36Q23 16 40 3q17 13 18 33v41z" fill="#fff1cf"/><path d="M23 32Q25 14 40 3q15 11 17 29" fill="#d87e70"/><circle cx="40" cy="49" r="12" fill="#7facc0" stroke="#d3b478" stroke-width="4"/></svg>';
  if(current.id==='forest')return '<svg viewBox="0 0 100 90" aria-hidden="true"><path d="M60 72Q100 86 96 30L74 56" fill="#bc7148"/><ellipse cx="43" cy="63" rx="26" ry="22" fill="#cf8957"/><path d="M16 43L10 4l29 17 23-2L85 4l-8 43-31 22z" fill="#dc925d"/><path d="M19 40l27 18 29-18-12 22H31z" fill="#f7e7c7"/><circle cx="31" cy="36" r="3"/><circle cx="62" cy="36" r="3"/><path d="M42 49h10l-5 7" fill="#433d3e"/></svg>';
  return '<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M23 40L3 24v47l25-15" fill="#d7a752"/><ellipse cx="66" cy="49" rx="48" ry="30" fill="#f2c567"/><path d="M67 19V8h18" fill="none" stroke="#ddb05e" stroke-width="8"/><circle cx="78" cy="48" r="18" fill="#6e9bab" stroke="#ffdf99" stroke-width="5"/><circle cx="39" cy="49" r="6" fill="#c59645"/></svg>';
}
function setupTravel(p) {
  $('#stage').innerHTML='<svg class="route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M12 76L30 28L56 66L82 26"/></svg>'+
    waypoints.map((xy,i)=>'<button class="landmark" data-stop="'+i+'" style="left:'+xy[0]+'%;top:'+xy[1]+'%" aria-label="Travel to '+p.stops[i]+'"><b>'+(i+1)+'</b><span>'+p.stops[i]+'</span></button>').join('')+
    '<button class="traveller" id="traveller" style="left:12%;top:76%" aria-label="Steer with arrow keys" aria-describedby="instructions">'+actorArt()+'</button>';
  $('#controls').innerHTML='<div class="steering"><span>Steer through each landmark</span><div>'+[['←',-5,0,'left'],['↑',0,-5,'up'],['↓',0,5,'down'],['→',5,0,'right']].map(x=>'<button data-dx="'+x[1]+'" data-dy="'+x[2]+'" aria-label="Steer '+x[3]+'">'+x[0]+'</button>').join('')+'</div></div>';
  all('[data-dx]').forEach(b=>b.onclick=()=>moveActor(state.x+Number(b.dataset.dx),state.y+Number(b.dataset.dy)));
  all('[data-stop]').forEach(b=>b.onclick=()=>{const xy=waypoints[Number(b.dataset.stop)];moveActor(...xy);});
  const stage=$('#stage');let dragging=false;
  const at=e=>{const r=stage.getBoundingClientRect();moveActor((e.clientX-r.left)/r.width*100,(e.clientY-r.top)/r.height*100);};
  stage.onpointerdown=e=>{if(e.target.closest('.landmark'))return;dragging=true;stage.setPointerCapture(e.pointerId);at(e);};
  stage.onpointermove=e=>{if(dragging)at(e);};
  stage.onpointerup=stage.onpointercancel=()=>{dragging=false;};
  $('#traveller').onkeydown=e=>{
    const delta={ArrowLeft:[-5,0],ArrowRight:[5,0],ArrowUp:[0,-5],ArrowDown:[0,5]}[e.key];
    if(delta){e.preventDefault();moveActor(state.x+delta[0],state.y+delta[1]);}
  };
}
function moveActor(x,y) {
  state.x=clamp(x,8,92);state.y=clamp(y,12,86);
  $('#traveller').style.left=state.x+'%';$('#traveller').style.top=state.y+'%';
  if(state.step>=waypoints.length)return;
  const target=waypoints[state.step];
  if(Math.hypot(state.x-target[0],state.y-target[1])<10){
    $('[data-stop="'+state.step+'"]').classList.add('visited');
    tone();state.step++;
    if(state.step===waypoints.length)completeActivity();
    else feedback('You reached '+chapterNow().stops[state.step-1]+'. Now guide the character to '+chapterNow().stops[state.step]+'.');
  } else if(waypoints.some((v,i)=>i>state.step&&Math.hypot(state.x-v[0],state.y-v[1])<10)){
    feedback('Visit '+chapterNow().stops[state.step]+' first, following the numbered route.');
  }
}
function setupReveal(p) {
  $('#stage').innerHTML='<div class="discovery-grid">'+p.items.map((x,i)=>'<button class="discovery" data-discovery="'+i+'" aria-label="Brush covered patch '+(i+1)+'"><span class="find-icon">'+x[0]+'</span><span class="find-name">'+x[1]+'</span><span class="dust" aria-hidden="true">'+(current.id==='forest'?'🍂':current.id==='sea'?'≋':'∿')+'</span></button>').join('')+'</div>';
  $('#controls').innerHTML='<p class="control-description">Sweep your finger across a patch, or press it four times to brush it clear.</p>';
  all('[data-discovery]').forEach(b=>{
    const i=Number(b.dataset.discovery);let last=null,moved=false,suppress=false;
    b.onclick=()=>{if(suppress){suppress=false;return;}brush(i,25);};
    b.onpointerdown=e=>{last=[e.clientX,e.clientY];moved=false;b.setPointerCapture(e.pointerId);};
    b.onpointermove=e=>{
      if(!last)return;
      const distance=Math.hypot(e.clientX-last[0],e.clientY-last[1]);
      if(distance>5){moved=true;brush(i,distance*.28);last=[e.clientX,e.clientY];}
    };
    b.onpointerup=()=>{suppress=moved;last=null;};
    b.onpointercancel=()=>{last=null;};
  });
}
function brush(i,amount) {
  if(state.done.has(i))return;
  state.brush[i]=clamp(state.brush[i]+amount,0,100);
  const b=$('[data-discovery="'+i+'"]');
  b.style.setProperty('--cleared',state.brush[i]/100);
  if(state.brush[i]===100){
    state.done.add(i);b.classList.add('uncovered');b.setAttribute('aria-label',chapterNow().items[i][1]+' uncovered');
    tone();feedback('You uncovered '+chapterNow().items[i][1].toLowerCase()+'. Look for the shapes beneath the other patches.');
    if(state.done.size===chapterNow().items.length)completeActivity();
  }
}
function setupAdjust(p) {
  const kind=current.id;
  $('#stage').innerHTML='<div class="experiment '+kind+'"><div class="experiment-source" aria-hidden="true">'+(kind==='forest'?'🚿':kind==='space'?'☀️':'🔦')+'</div><div class="light-beam" aria-hidden="true"></div><div class="experiment-subject" aria-hidden="true">'+(kind==='space'?'▦':p.subject)+'</div><div class="experiment-neighbour" aria-hidden="true">'+(kind==='forest'?'🌷':kind==='sea'?'🐠':'📡')+'</div><div class="experiment-meter"><span id="meterLabel"></span><div class="meter-track"><i id="meterFill"></i></div></div></div>';
  $('#controls').innerHTML='<label class="range-label" for="experimentRange">'+p.label+'</label><div class="range-wrapper"><div class="target-band" aria-hidden="true"></div><input id="experimentRange" type="range" min="0" max="100" value="10" step="1" aria-describedby="rangeHint"></div><div class="range-endpoints"><span>Less</span><output id="rangeValue">10%</output><span>More</span></div><p class="control-description" id="rangeHint">The green band marks a useful setting between 60% and 75%. You can keep experimenting after finding it.</p>';
  $('#experimentRange').oninput=e=>adjustScene(Number(e.target.value),true);
  adjustScene(10,false);
}
function adjustScene(value,interactive) {
  $('#world').style.setProperty('--amount',value/100);
  $('#world').style.setProperty('--angle',(value-50)+'deg');
  $('#rangeValue').textContent=value+'%';
  const balanced=value>=60&&value<=75;
  $('#meterFill').style.width=value+'%';
  $('#meterFill').style.background=balanced?'#80af81':value>75?'#d8946c':'#a5b7ca';
  $('#meterLabel').textContent=current.id==='forest'?(value<60?'The soil is still dry.':balanced?'The soil is evenly damp.':'The soil is becoming too wet.'):current.id==='space'?(value<60?'The panel needs more light.':balanced?'The panel is aligned with the light.':'The panel has turned past the light.'):value<60?'The reef is still hard to see.':balanced?'The gentle beam reveals the reef.':'The beam is too bright.';
  if(interactive&&balanced)completeActivity();
  else if(interactive&&state.complete)feedback($('#meterLabel').textContent+' You can move the control back to the green band.');
}
function setupSequence(p) {
  $('#stage').innerHTML='<div class="sequence-scene"><div class="sequence-actor">'+actorArt()+'</div><div class="sequence-pieces">'+p.items.map((x,i)=>'<div class="sequence-object" data-sequence-object="'+i+'"><span>'+x[0]+'</span><small>'+x[1]+'</small></div>').join('')+'</div><div class="sequence-water" aria-hidden="true"></div></div>';
  const order=[2,0,3,1].filter(i=>i<p.items.length);
  $('#controls').innerHTML='<div class="sequence-controls">'+order.map(i=>'<button data-sequence="'+i+'"><span>'+p.items[i][0]+'</span>'+p.items[i][1]+'</button>').join('')+'</div>';
  all('[data-sequence]').forEach(b=>b.onclick=()=>runStep(Number(b.dataset.sequence)));
}
function runStep(i) {
  if(state.complete||i<state.step)return;
  if(i!==state.step){feedback('Before that, '+chapterNow().items[state.step][1].toLowerCase()+'. You can find the order in the passage.');return;}
  state.step++;tone();
  $('[data-sequence="'+i+'"]').disabled=true;
  $('[data-sequence-object="'+i+'"]').classList.add('acted');
  $('#world').style.setProperty('--step',state.step);
  feedback(chapterNow().items[i][1]+' is finished. What does the story describe next?');
  if(state.step===chapterNow().items.length)completeActivity();
}
function finish() {
  stopVoice();progress[current.id]={page:0,finished:true};save();
  $('#reader').innerHTML='<section class="book-ending"><div class="ending-cover">'+art(current.id)+'</div><div><span class="eyebrow">You have reached the end of '+current.title+'</span><h1 tabindex="-1" id="endTitle">What would you like to explore again?</h1><p>You can return to any chapter to reread the story and experiment with its scene, or choose another book from the library.</p><button class="primary" id="moreBooks">Return to the library</button><button class="read-aloud" id="again">Read from the beginning</button></div></section>';
  $('#moreBooks').onclick=home;$('#again').onclick=()=>{page=0;renderPage();};$('#endTitle').focus();window.scrollTo(0,0);
}
$('#sound').onclick=()=>{
  muted=!muted;$('#sound').setAttribute('aria-pressed',String(!muted));
  $('#sound').innerHTML=(muted?'♩':'♫')+' <span>Sound '+(muted?'off':'on')+'</span>';
  if(muted){stopVoice();audioContext?.suspend();}else tone();
};
$('.brand').onclick=e=>{e.preventDefault();home();};
$('#libraryNav').onclick=home;
$('#grownups').onclick=()=>$('#note').showModal();
$('.close').onclick=$('.close-note').onclick=()=>$('#note').close();
renderBooks();


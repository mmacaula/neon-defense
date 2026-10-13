// ============ UI & input ============
const $ = id => document.getElementById(id);
const stage = $('stage'), shopEl = $('shop'), overlay = $('overlay');

function updateHUD(){
  $('hudMoney').textContent = fmt(Math.floor(S.money));
  $('hudLives').textContent = Math.max(0,S.lives);
  $('hudWave').textContent = S.wave;
  $('hudScore').textContent = fmt(S.score);
  const cw=$('callWave');
  if(S.phase!=='playing'){ cw.style.display='none'; }
  else if(S.waveActive){ cw.style.display='none'; }
  else {
    cw.style.display='';
    const cd = S.wave>0 && S.nextTimer>0 ? ' ('+Math.ceil(S.nextTimer)+'s)' : '';
    $('cwBonus').textContent = (S.wave===0?'#1':'+'+(15+S.wave*3))+cd;
  }
  document.querySelectorAll('.card').forEach(el=>{
    el.classList.toggle('poor', S.money < TOWERS[el.dataset.key].cost);
  });
}
function buildShop(){
  shopEl.innerHTML='';
  for(const k of TKEYS){
    const T=TOWERS[k];
    const el=document.createElement('div');
    el.className='card'; el.dataset.key=k; el.style.setProperty('--gl',T.color);
    el.title = `${T.name} — $${T.cost}. ${T.ds}.` + (T.air?' Hits air units. Does not slow or splash.':' Ground only.');
    el.innerHTML = `<canvas width="88" height="88"></canvas>
      <div class="meta"><div class="nm">${T.name}</div><div class="cost">$${T.cost}</div><div class="ds">${T.ds}</div></div>
      <div class="key">${T.hotkey}</div>`;
    const ic=el.querySelector('canvas').getContext('2d');
    ic.scale(2,2);
    drawTowerShape(ic,k,22,21,-Math.PI/2,0,0.95,false);
    el.addEventListener('click',()=>{ initAudio(); selectShop(S.sel===k?null:k); });
    shopEl.appendChild(el);
  }
}
function selectShop(k){
  S.sel=k; if(k) S.towerSel=null, hideTowerPanel();
  document.querySelectorAll('.card').forEach(el=>el.classList.toggle('sel', el.dataset.key===k));
}

// ---------- tower panel ----------
function showTowerPanel(t){
  S.towerSel=t;
  const p=$('towerPanel'), T=TOWERS[t.key], st=T.levels[t.level], next=T.levels[t.level+1];
  p.querySelector('.dot').style.background=T.color;
  p.querySelector('.tx').textContent = `${T.name} · Lv ${t.level+1}`;
  let rows='';
  if(t.key==='frost') rows = `Slow <b>${Math.round(st.slow*100)}%</b> · Aura <b>${Math.round(st.dps)}</b>/s<br>Range <b>${st.range}</b>`;
  else if(t.key==='flame') rows = `Cone <b>${Math.round(st.dps)}</b>/s · Burn <b>${st.burn}</b>/s<br>Range <b>${st.range}</b>`;
  else if(t.key==='cannon') rows = `Dmg <b>${st.dmg}</b> · Splash <b>${st.splash}</b><br>Range <b>${st.range}</b> · ${st.rate}/s`;
  else if(t.key==='tesla') rows = `Dmg <b>${st.dmg}</b> · Chain <b>${st.chain}</b><br>Range <b>${st.range}</b> · ${st.rate}/s`;
  else rows = `Dmg <b>${st.dmg}</b> · Rate <b>${st.rate}</b>/s<br>Range <b>${st.range}</b>${T.air?' · hits air':''}`;
  $('tpStats').innerHTML=rows;
  const up=$('tpUpgrade');
  if(next){ up.style.display=''; up.textContent=`⬆ Upgrade $${next.cost}`; up.disabled=S.money<next.cost;
    up.style.opacity=S.money<next.cost?0.45:1; }
  else { up.style.display='none'; }
  $('tpSell').textContent = `Sell $${Math.floor(t.invested*0.7)}`;
  p.classList.remove('hidden');
  const rect=cv.getBoundingClientRect(), sc=rect.width/W;
  let px=cv.offsetLeft + t.x*sc+24, py=cv.offsetTop + t.y*sc-60;
  px=clamp(px,8,rect.width+cv.offsetLeft-222); py=clamp(py,8,rect.height+cv.offsetTop-150);
  p.style.left=px+'px'; p.style.top=py+'px';
}
function hideTowerPanel(){ S.towerSel=null; $('towerPanel').classList.add('hidden'); }
$('tpUpgrade').addEventListener('click',()=>{
  const t=S.towerSel; if(!t) return;
  const next=TOWERS[t.key].levels[t.level+1]; if(!next) return;
  if(S.money<next.cost){ sfx.deny(); toast('Not enough money',true); return; }
  S.money-=next.cost; t.invested+=next.cost; t.level++;
  sfx.up(); updateHUD(); showTowerPanel(t);
});
$('tpSell').addEventListener('click',()=>{
  const t=S.towerSel; if(!t) return;
  const back=Math.floor(t.invested*0.7);
  S.money+=back; S.towers=S.towers.filter(x=>x!==t);
  floatText(t.x,t.y-14,'+$'+back,'#ffd35a');
  sfx.sell(); hideTowerPanel(); updateHUD();
});

// ---------- helpers ----------
function canPlace(c,r){
  if(c<0||r<0||c>=COLS||r>=ROWS) return false;
  if(S.map.cells.has(c+','+r)) return false;
  return !S.towers.some(t=>t.c===c&&t.r===r);
}
function banner(txt){ const b=$('banner'); b.textContent=txt; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
function toast(msg,bad){ const el=document.createElement('div'); el.className='toast '+(bad?'bad':'good'); el.textContent=msg;
  $('toasts').appendChild(el); setTimeout(()=>el.remove(),2100); }

// ---------- canvas input ----------
function evtCell(ev){
  const rect=cv.getBoundingClientRect();
  const x=(ev.clientX-rect.left)*(W/rect.width), y=(ev.clientY-rect.top)*(H/rect.height);
  return { x, y, c:Math.floor(x/CELL), r:Math.floor(y/CELL) };
}
cv.addEventListener('mousemove',ev=>{
  const p=evtCell(ev); S.mouse={x:p.x,y:p.y};
  S.hoverCell=(p.c>=0&&p.r>=0&&p.c<COLS&&p.r<ROWS)?{c:p.c,r:p.r}:null;
});
cv.addEventListener('mouseleave',()=>{ S.hoverCell=null; });
cv.addEventListener('contextmenu',ev=>{ ev.preventDefault(); selectShop(null); hideTowerPanel(); });
cv.addEventListener('pointerdown',ev=>{
  if(ev.button!==0 || S.phase!=='playing') return;
  initAudio();
  const p=evtCell(ev);
  if(S.sel){
    const T=TOWERS[S.sel];
    if(!canPlace(p.c,p.r)){ sfx.deny(); toast('Can\'t build there',true); return; }
    if(S.money<T.cost){ sfx.deny(); toast('Not enough money',true); return; }
    S.money-=T.cost;
    const {x,y}=cellCenter(p.c,p.r);
    S.towers.push({key:S.sel,c:p.c,r:p.r,x,y,angle:-Math.PI/2,cool:0,level:0,invested:T.cost,aimOk:false});
    sfx.place(); updateHUD();
    if(!ev.shiftKey && ev.pointerType!=='touch') selectShop(null);
    return;
  }
  const hit=S.towers.find(t=>dist(t.x,t.y,p.x,p.y)<20);
  if(hit){ showTowerPanel(hit); sfx.coin(); }
  else hideTowerPanel();
});
window.addEventListener('keydown',ev=>{
  if(ev.key===' '){ ev.preventDefault(); if(S.phase==='playing') togglePause(); return; }
  const k=ev.key.toLowerCase();
  if(k==='escape'){ selectShop(null); hideTowerPanel(); return; }
  if(S.phase!=='playing') return;
  const tk=TKEYS.find(key=>TOWERS[key].hotkey===ev.key);
  if(tk){ initAudio(); selectShop(S.sel===tk?null:tk); return; }
  if(k==='n' && !S.waveActive) callWave();
  if(k==='u' && S.towerSel) $('tpUpgrade').click();
  if(k==='x' && S.towerSel) $('tpSell').click();
});

// ---------- buttons ----------
function callWave(){
  if(S.phase!=='playing' || S.waveActive) return;
  initAudio();
  if(S.wave>0){ const b=15+S.wave*3; S.money+=b; floatText(S.map.base.x,S.map.base.y-30,'+'+b+' early bonus','#7dffb0'); }
  startWave(); updateHUD();
}
$('callWave').addEventListener('click',callWave);
$('btnSpeed').addEventListener('click',()=>{ S.speed = S.speed===1?2:S.speed===2?3:1; setSpeedUI(); });
function setSpeedUI(){ $('btnSpeed').textContent = S.paused?'⏸':'▶ '+S.speed+'×'; }
function togglePause(){ S.paused=!S.paused; $('btnPause').textContent=S.paused?'▶':'⏸'; setSpeedUI(); if(!S.paused) last=performance.now(); }
$('btnPause').addEventListener('click',togglePause);
$('btnSound').addEventListener('click',()=>{ S.muted=!S.muted; $('btnSound').textContent=S.muted?'🔇':'🔊'; if(master) master.gain.value=S.muted?0:0.32; });
$('btnMenu').addEventListener('click',showMenu);

// ---------- save / load ----------
const SAVE_KEY='neon-de…e-v1';
function saveGame(quiet){
  if(S.phase!=='playing' || !S.map) return;
  const snap = { v:1, map:S.mapIdx, money:Math.round(S.money), lives:S.lives, score:S.score,
    waveDone: S.waveActive ? Math.max(0,S.wave-1) : S.wave,
    towers: S.towers.map(t=>[t.key,t.c,t.r,t.level,Math.round(t.invested)]) };
  try{
    localStorage.setItem(SAVE_KEY, JSON.stringify(snap));
    if(!quiet){ toast('Game saved ✓', false); sfx.coin(); }
  }catch(e){ if(!quiet) toast('Storage blocked — play the hosted version to save', true); }
}
function getSave(){
  try{ const d=localStorage.getItem(SAVE_KEY); if(!d) return null; const s=JSON.parse(d); return (s && s.v===1) ? s : null; }
  catch(e){ return null; }
}
function loadGame(snap){
  if(!snap) return;
  resetGame(snap.map);
  S.money=snap.money; S.lives=snap.lives; S.score=snap.score; S.wave=snap.waveDone;
  for(const [k,c,r,l,inv] of snap.towers){
    if(!canPlace(c,r)) continue;
    const p=cellCenter(c,r);
    S.towers.push({key:k,c,r,x:p.x,y:p.y,angle:-Math.PI/2,cool:0,level:l,invested:inv,aimOk:false});
  }
  S.phase='playing'; updateHUD();
}
$('btnSave').addEventListener('click',()=>{ initAudio(); saveGame(false); });
window.addEventListener('beforeunload',()=>{ if(S.phase==='playing') saveGame(true); });

// ---------- overlay / menu / game over ----------
function showMenu(){
  S.phase='menu'; hideTowerPanel(); selectShop(null);
  $('ovTitle').textContent='NEON DEFENSE';
  $('ovSub').textContent='Pick a battlefield. Hold the line.';
  $('finalStats').innerHTML='';
  $('bestLine').textContent = S.best? 'Best score: '+fmt(S.best) : '';
  const maps=$('maps'); maps.innerHTML='';
  const snap = getSave();
  if(snap && Number.isFinite(snap.map)){
    const el=document.createElement('div'); el.className='mapcard';
    el.style.borderColor='rgba(120,255,170,.45)';
    const cvr=document.createElement('canvas'); cvr.width=420; cvr.height=176;
    el.appendChild(cvr);
    el.insertAdjacentHTML('beforeend',`<div class="mn">Resume<span class="diff Easy">Wave ${snap.waveDone}</span></div><div class="md">${MAPS[snap.map].name} · ${snap.towers.length} towers · $${fmt(snap.money)}</div>`);
    el.addEventListener('click',()=>{ initAudio(); loadGame(getSave()); overlay.classList.add('hidden'); banner('RESUMED'); });
    ((canvas,idx)=>requestAnimationFrame(()=>drawMapPreview(canvas.getContext('2d'),idx)))(cvr, snap.map);
    maps.appendChild(el);
  }
  MAPS.forEach((m,i)=>{
    const el=document.createElement('div'); el.className='mapcard';
    const cvp=document.createElement('canvas'); cvp.width=420; cvp.height=176;
    el.appendChild(cvp);
    el.insertAdjacentHTML('beforeend',`<div class="mn">${m.name}<span class="diff ${m.diff}">${m.diff}</span></div><div class="md">${['A classic winding road.','The road coils to the core.','Full zigzag. Nowhere to breathe.'][i]}</div>`);
    el.addEventListener('click',()=>{ initAudio(); resetGame(i); overlay.classList.add('hidden'); banner('DEFEND THE CORE'); });
    ((canvas, idx) => requestAnimationFrame(()=>drawMapPreview(canvas.getContext('2d'), idx)))(cvp, i);
    maps.appendChild(el);
  });
  overlay.classList.remove('hidden');
  updateHUD();
}
function drawMapPreview(g,i){
  g.fillStyle='#0b1128'; g.fillRect(0,0,420,176);
  const m=buildMap(i);
  g.save(); g.scale(420/W,176/H);
  g.lineJoin='round'; g.lineCap='round';
  g.strokeStyle='rgba(120,160,255,.5)'; g.lineWidth=26; strokePath(g,m.pts);
  g.strokeStyle='#39477f'; g.lineWidth=16; strokePath(g,m.pts);
  const s=m.pts[0], b=m.base;
  g.fillStyle='#57e389'; g.beginPath(); g.arc(clamp(s.x,14,W),s.y,10,0,TAU); g.fill();
  g.fillStyle='#7ab8ff'; g.beginPath(); g.arc(b.x,b.y,11,0,TAU); g.fill();
  g.restore();
}
function gameOver(){
  S.phase='over'; sfx.over();
  if(S.score>S.best){ S.best=S.score; try{localStorage.setItem('neon-defense-best',''+S.best)}catch(e){} }
  setTimeout(()=>{
    $('ovTitle').textContent='CORE DESTROYED';
    $('ovSub').textContent='The line has fallen.';
    $('finalStats').innerHTML=`Survived to <b>Wave ${S.wave}</b> · Score <b>${fmt(S.score)}</b> · Kills <b>${S.kills}</b>`;
    $('bestLine').textContent='Best score: '+fmt(S.best);
    const maps=$('maps'); maps.innerHTML='';
    const btn=document.createElement('div');
    btn.style.cssText='font-size:17px';
    btn.innerHTML='<button class="btn hot" style="font-size:16px;padding:12px 30px">↻ Retry</button> <button class="btn" style="font-size:16px;padding:12px 30px">Maps</button>';
    const [retry,mapsBtn]=btn.querySelectorAll('button');
    retry.onclick=()=>{ resetGame(S.mapIdx); overlay.classList.add('hidden'); };
    mapsBtn.onclick=showMenu;
    maps.appendChild(btn);
    overlay.classList.remove('hidden');
  }, 900);
}

// ---------- main loop ----------
let last=performance.now(), hudAcc=0;
function loop(now){
  requestAnimationFrame(loop);
  let dt=(now-last)/1000; last=now;
  dt=Math.min(dt,0.05);
  if(S.phase==='playing' && !S.paused){
    update(dt*S.speed);
    hudAcc+=dt;
    if(hudAcc>0.25){ hudAcc=0; updateHUD(); }
  }
  render();
}
window.__td={S, resetGame, startWave, TOWERS, ENEMIES, saveGame, getSave, loadGame};
buildShop(); showMenu(); updateHUD();
requestAnimationFrame(loop);

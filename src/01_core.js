'use strict';
// ============ NEON DEFENSE — core ============
window.addEventListener('error', e => { (window.__errs = window.__errs||[]).push(e.message + ' @' + e.lineno + ':' + e.colno); });

const W = 960, H = 600, CELL = 40, COLS = 24, ROWS = 15;
const TAU = Math.PI * 2;
const clamp = (v,a,b)=>v<a?a:v>b?b:v;
const lerp = (a,b,t)=>a+(b-a)*t;
const dist = (x1,y1,x2,y2)=>Math.hypot(x2-x1,y2-y1);
const rnd = (a=1,b)=>b===undefined?Math.random()*a:a+Math.random()*(b-a);
const pick = a=>a[(Math.random()*a.length)|0];
function mulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
const fmt = n => n>=1000 ? (n/1000).toFixed(n>=10000?0:1)+'k' : ''+Math.round(n);

// ---------- maps ----------
const MAPS = [
  { name:'Serpentine', diff:'Easy',
    path:[[0,3],[6,3],[6,11],[12,11],[12,3],[18,3],[18,8],[23,8]] },
  { name:'The Spiral', diff:'Medium',
    path:[[0,1],[21,1],[21,13],[2,13],[2,5],[17,5],[17,9],[7,9],[7,7],[12,7]] },
  { name:'Zigzag Run', diff:'Hard',
    path:[[0,12],[4,12],[4,2],[8,2],[8,12],[12,12],[12,2],[16,2],[16,12],[20,12],[20,3],[23,3]] },
];

function buildMap(idx){
  const m = MAPS[idx];
  const wp = m.path.map(([c,r])=>({x:c*CELL+CELL/2, y:r*CELL+CELL/2, c, r}));
  // extend spawn/exit stubs off-board
  const a=wp[0], b=wp[1], dx=Math.sign(b.c-a.c)||0, dy=Math.sign(b.r-a.r)||0;
  const spawn={x:a.x-dx*CELL*1.6, y:a.y-dy*CELL*1.6};
  const z=wp[wp.length-1], y2=wp[wp.length-2];
  const ex=Math.sign(z.c-y2.c)||0, ey=Math.sign(z.r-y2.r)||0;
  const exit={x:z.x+ex*CELL*1.6, y:z.y+ey*CELL*1.6};
  const pts=[spawn, ...wp.map(p=>({x:p.x,y:p.y})), exit];
  // rasterize path cells
  const cells=new Set();
  for(let i=0;i<wp.length-1;i++){
    let [c1,r1]=[wp[i].c,wp[i].r], [c2,r2]=[wp[i+1].c,wp[i+1].r];
    const sc=Math.sign(c2-c1), sr=Math.sign(r2-r1);
    let c=c1,r=r1; cells.add(c+','+r);
    while(c!==c2||r!==r2){ c+=sc; r+=sr; cells.add(c+','+r); }
  }
  // total length
  let len=0; for(let i=1;i<pts.length;i++) len+=dist(pts[i-1].x,pts[i-1].y,pts[i].x,pts[i].y);
  return { idx, name:m.name, diff:m.diff, pts, cells, base:wp[wp.length-1], spawn, exit, len };
}

// ---------- state ----------
const S = {
  phase:'menu', mapIdx:0, map:null,
  money:0, lives:0, score:0, wave:0, speed:1, paused:false, muted:false,
  enemies:[], towers:[], bullets:[], parts:[], texts:[], bolts:[], tracers:[], booms:[],
  spawnQueue:[], spawnTimer:0, waveActive:false, nextTimer:0,
  sel:null, towerSel:null, hoverCell:null, mouse:{x:-100,y:-100},
  shake:0, time:0, kills:0, flameSnd:0, best:0,
};
try{ S.best = +(localStorage.getItem('neon-defense-best')||0); }catch(e){}

function resetGame(mapIdx, diff){
  S.mapIdx=mapIdx; S.map=buildMap(mapIdx);
  S.diff = diff || 'normal';
  const d = DIFFS.find(x=>x.key===S.diff) || DIFFS[1];
  S.money=Math.round(240*d.cash/10)*10; S.lives=d.lives; S.score=0; S.wave=0; S.speed=1; S.paused=false;
  S.enemies=[]; S.towers=[]; S.bullets=[]; S.parts=[]; S.texts=[]; S.bolts=[]; S.tracers=[]; S.booms=[];
  S.spawnQueue=[]; S.spawnTimer=0; S.waveActive=false; S.nextTimer=0;
  S.sel=null; S.towerSel=null; S.kills=0; S.phase='playing';
  paintBg();
  updateHUD(); buildShop(); hideTowerPanel(); setSpeedUI();
}

// ---------- audio (synth, no assets) ----------
let AC=null, master=null, flameGain=null, flameSrc=null;
function initAudio(){
  if(AC) return;
  try{
    AC = new (window.AudioContext||window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.32; master.connect(AC.destination);
    const len = AC.sampleRate*1;
    const buf = AC.createBuffer(1, len, AC.sampleRate);
    const d = buf.getChannelData(0); for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
    flameSrc = buf;
    flameGain = AC.createGain(); flameGain.gain.value=0;
    const bp = AC.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=560; bp.Q.value=0.7;
    const s = AC.createBufferSource(); s.buffer=buf; s.loop=true; s.connect(bp); bp.connect(flameGain); flameGain.connect(master); s.start();
  }catch(e){ AC=null; }
}
function tone(freq,dur,type='square',vol=0.08,slide=0){
  if(!AC||S.muted) return;
  const o=AC.createOscillator(), g=AC.createGain();
  o.type=type; o.frequency.value=freq;
  if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide), AC.currentTime+dur);
  g.gain.setValueAtTime(vol, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime+dur);
  o.connect(g); g.connect(master); o.start(); o.stop(AC.currentTime+dur+0.02);
}
function noiseHit(dur,vol,freq,type='lowpass'){
  if(!AC||S.muted) return;
  const s=AC.createBufferSource(); s.buffer=flameSrc;
  const f=AC.createBiquadFilter(); f.type=type; f.frequency.value=freq;
  const g=AC.createGain(); g.gain.setValueAtTime(vol,AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime+dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(); s.stop(AC.currentTime+dur+0.02);
}
const sfx = {
  shoot:  ()=>tone(760,0.05,'square',0.035,-380),
  sniper: ()=>{ tone(180,0.16,'sawtooth',0.09,-120); noiseHit(0.1,0.06,2400,'highpass'); },
  boom:   ()=>{ noiseHit(0.5,0.22,300); tone(70,0.4,'sine',0.14,-30); },
  zap:    ()=>tone(1250,0.09,'sawtooth',0.05,-900),
  place:  ()=>{ tone(520,0.08,'triangle',0.1,220); tone(780,0.12,'triangle',0.08,180); },
  sell:   ()=>{ tone(620,0.07,'triangle',0.09,-200); tone(420,0.1,'triangle',0.08,-160); },
  up:     ()=>{ tone(520,0.07,'triangle',0.1,240); setTimeout(()=>tone(700,0.09,'triangle',0.1,260),70); },
  coin:   ()=>{ tone(1100,0.06,'triangle',0.05,200); tone(1500,0.08,'triangle',0.04,150); },
  hurt:   ()=>{ noiseHit(0.3,0.2,180); tone(90,0.25,'sawtooth',0.1,-40); },
  waveGo: ()=>{ tone(300,0.12,'sawtooth',0.07,300); setTimeout(()=>tone(450,0.14,'sawtooth',0.07,320),110); },
  deny:   ()=>tone(160,0.12,'square',0.07,-60),
  over:   ()=>{ tone(220,0.4,'sawtooth',0.1,-140); setTimeout(()=>tone(140,0.7,'sawtooth',0.1,-90),250); },
};

// ---------- pre-rendered background ----------
let bgCanvas=null;
function paintBg(){
  bgCanvas = document.createElement('canvas'); bgCanvas.width=W; bgCanvas.height=H;
  const g = bgCanvas.getContext('2d');
  const grd = g.createLinearGradient(0,0,W,H);
  grd.addColorStop(0,'#0d1330'); grd.addColorStop(0.55,'#0b1026'); grd.addColorStop(1,'#0e1230');
  g.fillStyle=grd; g.fillRect(0,0,W,H);
  // faint grid
  g.strokeStyle='rgba(120,150,255,0.05)'; g.lineWidth=1;
  for(let c=0;c<=COLS;c++){ g.beginPath(); g.moveTo(c*CELL+.5,0); g.lineTo(c*CELL+.5,H); g.stroke(); }
  for(let r=0;r<=ROWS;r++){ g.beginPath(); g.moveTo(0,r*CELL+.5); g.lineTo(W,r*CELL+.5); g.stroke(); }
  const rng = mulberry32(S.mapIdx*999+7);
  // decorations on free cells
  for(let c=0;c<COLS;c++) for(let r=0;r<ROWS;r++){
    if(S.map.cells.has(c+','+r)) continue;
    const q = rng();
    const x=c*CELL+CELL/2 + (rng()-0.5)*14, y=r*CELL+CELL/2+(rng()-0.5)*14;
    if(q<0.055){ // tree
      g.fillStyle='rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x,y+9,8,3,0,0,TAU); g.fill();
      g.fillStyle='#1d5c46'; g.beginPath(); g.moveTo(x,y-12); g.lineTo(x+8,y+7); g.lineTo(x-8,y+7); g.closePath(); g.fill();
      g.fillStyle='#28795c'; g.beginPath(); g.moveTo(x,y-12); g.lineTo(x+8,y+7); g.lineTo(x,y+7); g.closePath(); g.fill();
    } else if(q<0.095){ // rock
      g.fillStyle='rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x,y+5,8,3,0,0,TAU); g.fill();
      g.fillStyle='#2c3763'; g.beginPath(); g.ellipse(x,y,7,5.4,rng()*2,0,TAU); g.fill();
      g.fillStyle='#3a4778'; g.beginPath(); g.ellipse(x-1.6,y-1.6,4,3,rng()*2,0,TAU); g.fill();
    } else if(q<0.115){ // crystal glow
      g.fillStyle='rgba(110,140,255,.14)'; g.beginPath(); g.arc(x,y,9,0,TAU); g.fill();
      g.fillStyle='#5f7adf'; g.beginPath(); g.moveTo(x,y-6); g.lineTo(x+4,y); g.lineTo(x,y+6); g.lineTo(x-4,y); g.closePath(); g.fill();
    }
  }
  // path: outline then road
  const pts=S.map.pts;
  g.lineJoin='round'; g.lineCap='round';
  g.strokeStyle='rgba(90,130,255,.16)'; g.lineWidth=36;
  strokePath(g,pts); 
  g.strokeStyle='#222c55'; g.lineWidth=30; strokePath(g,pts);
  g.strokeStyle='#2a3668'; g.lineWidth=24; strokePath(g,pts);
  g.strokeStyle='rgba(10,14,30,.5)'; g.lineWidth=2;
  g.setLineDash([]);
  // spawn portal + base pad
  const sp=pts[0], bs=S.map.base;
  g.fillStyle='rgba(70,255,160,.10)'; g.beginPath(); g.arc(clamp(sp.x,10,W), sp.y, 26,0,TAU); g.fill();
  g.fillStyle='rgba(120,160,255,.10)'; g.beginPath(); g.arc(bs.x, bs.y, 30,0,TAU); g.fill();
}
function strokePath(g,pts){ g.beginPath(); g.moveTo(pts[0].x,pts[0].y); for(let i=1;i<pts.length;i++) g.lineTo(pts[i].x,pts[i].y); g.stroke(); }

// ============ rendering ============
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const DPR = Math.min(2, window.devicePixelRatio||1);
cv.width = W*DPR; cv.height = H*DPR; ctx.scale(DPR,DPR);
const vignette = document.createElement('canvas'); vignette.width=W; vignette.height=H;
{
  const vg=vignette.getContext('2d');
  const rad=vg.createRadialGradient(W/2,H/2,H*0.45,W/2,H/2,H*0.95);
  rad.addColorStop(0,'rgba(0,0,0,0)'); rad.addColorStop(1,'rgba(2,4,12,.42)');
  vg.fillStyle=rad; vg.fillRect(0,0,W,H);
}

function drawTowerShape(g, key, x, y, angle, level, s=1, firing=false, rec=0){
  const T=TOWERS[key], C=T.color;
  g.save(); g.translate(x,y); g.scale(s,s);
  // pad
  g.fillStyle='rgba(0,0,0,.35)'; g.beginPath(); g.arc(0,2.5,16,0,TAU); g.fill();
  g.fillStyle='#1a2347'; g.beginPath(); g.arc(0,0,15,0,TAU); g.fill();
  g.strokeStyle='rgba(150,180,255,.25)'; g.lineWidth=1.5; g.stroke();
  // level pips
  for(let i=0;i<3;i++){
    g.beginPath(); g.arc(-8+i*8, 12.5, 1.8, 0, TAU);
    g.fillStyle = i<=level ? C : 'rgba(255,255,255,.12)'; g.fill();
  }
  g.rotate(angle);
  const glow = firing? 1:0;
  g.shadowColor=C; g.shadowBlur=glow?12:5;
  if(key==='gun'){
    g.fillStyle='#2b3a6b'; rr(g,-7,-7,14,14,4); g.fill();
    g.fillStyle=C; rr(g,2,-2.6,14,5.2,2); g.fill();
    if(level>=1){ rr(g,-10,-2.2,6,4.4,2); g.fillStyle=C; g.fill(); }
    if(level>=2){ g.fillStyle='#fff'; rr(g,13,-1.4,4,2.8,1.4); g.fill(); }
  } else if(key==='sniper'){
    g.fillStyle='#33315c'; rr(g,-8,-6,16,12,4); g.fill();
    g.fillStyle=C; rr(g,4,-1.8,20,3.6,1.8); g.fill();
    if(level>=1){ g.fillStyle='#fff'; rr(g,-1,-4,7,2.4,1.2); g.fill(); }
    if(level>=2){ g.fillStyle=C; rr(g,-11,-2,5,4,2); g.fill(); }
  } else if(key==='cannon'){
    g.fillStyle='#40305c'; g.beginPath(); g.arc(0,0,10,0,TAU); g.fill();
    g.fillStyle=C; rr(g,-rec*3,-5,17,10,4); g.fill();
    g.fillStyle='#241a38'; g.beginPath(); g.arc(15,0,4.4,0,TAU); g.fill();
    if(level>=1){ g.fillStyle=C; g.beginPath(); g.arc(0,0,4.4,0,TAU); g.fill(); }
    if(level>=2){ g.strokeStyle=C; g.lineWidth=2; g.beginPath(); g.arc(0,0,12.5,0.6,Math.PI*2-0.6); g.stroke(); }
  } else if(key==='frost'){
    g.fillStyle='#1d3a63'; g.beginPath(); g.arc(0,0,11,0,TAU); g.fill();
    g.rotate(-angle); // crystals don't rotate
    const pul = 1+Math.sin(S.time*3)*0.12;
    g.strokeStyle=C; g.lineWidth=2; g.shadowBlur=10;
    for(let i=0;i<6;i++){ const a=i*TAU/6 + S.time*0.8;
      g.beginPath(); g.moveTo(0,0); g.lineTo(Math.cos(a)*9*pul, Math.sin(a)*9*pul); g.stroke(); }
    g.fillStyle='#eaf7ff'; g.beginPath(); g.arc(0,0,3.4,0,TAU); g.fill();
    g.rotate(angle);
  } else if(key==='flame'){
    g.fillStyle='#5c2417'; rr(g,-9,-8,17,16,5); g.fill();
    g.fillStyle='#ff7a3c'; rr(g,3,-4,12,8,3); g.fill();
    g.fillStyle='#ffd166'; g.beginPath(); g.arc(15,0,3.2,0,TAU); g.fill();
    g.fillStyle='#8f2f14'; g.beginPath(); g.arc(-5,-11,4,0,TAU); g.fill(); g.beginPath(); g.arc(4,-11,4,0,TAU); g.fill();
    if(level>=1){ g.fillStyle='#ffb05a'; rr(g,3,-6.4,12,2.4,1.2); g.fill(); }
    if(level>=2){ g.fillStyle='#ff5a3c'; g.beginPath(); g.arc(15,0,1.8+Math.sin(S.time*20)*0.7,0,TAU); g.fill(); }
  } else if(key==='tesla'){
    g.fillStyle='#2c1d54'; g.beginPath(); g.arc(0,0,10,0,TAU); g.fill();
    g.rotate(-angle);
    g.strokeStyle=C; g.lineWidth=2.4; g.shadowBlur=10;
    g.beginPath(); g.arc(0,0,7,0.4,Math.PI-0.4); g.stroke();
    g.beginPath(); g.arc(0,0,7,Math.PI+0.4,TAU-0.4); g.stroke();
    g.fillStyle='#efe2ff'; g.beginPath(); g.arc(0,0,3,0,TAU); g.fill();
    if(level>=1){ g.strokeStyle='#e6d2ff'; g.beginPath(); g.arc(0,0,4.2,S.time*4,S.time*4+2); g.stroke(); }
    g.rotate(angle);
  }
  g.restore();
}
function rr(g,x,y,w,h,r){ g.beginPath(); g.roundRect ? g.roundRect(x,y,w,h,r) : g.rect(x,y,w,h); }

function render(){
  const g=ctx;
  g.save();
  if(S.shake>0) g.translate(rnd(-S.shake,S.shake)*0.5, rnd(-S.shake,S.shake)*0.5);
  if(bgCanvas) g.drawImage(bgCanvas,0,0); else { g.fillStyle='#0d1330'; g.fillRect(-20,-20,W+40,H+40); }

  // animated flow dashes on path
  g.save();
  g.strokeStyle='rgba(120,160,255,.20)'; g.lineWidth=3; g.setLineDash([4,26]);
  g.lineDashOffset = -S.time*55; g.lineCap='round';
  strokePath(g, S.map?S.map.pts:[{x:0,y:0}]);
  g.restore();

  if(S.phase!=='menu' && S.map){
    // spawn portal
    const sp=S.map.pts[0], px=clamp(sp.x,12,W-4), py=sp.y;
    g.save(); g.translate(px,py);
    for(let i=0;i<3;i++){
      const rr2 = 10+i*6+Math.sin(S.time*3+i)*2;
      g.strokeStyle=`rgba(70,255,160,${0.35-i*0.1})`; g.lineWidth=2.4;
      g.beginPath(); g.arc(0,0,rr2, S.time*(i%2?2:-2), S.time*(i%2?2:-2)+4); g.stroke();
    }
    g.restore();
    // base core
    const bs=S.map.base;
    g.save(); g.translate(bs.x,bs.y);
    const pulse=1+Math.sin(S.time*2.4)*0.07;
    const grad=g.createRadialGradient(0,0,2,0,0,26*pulse);
    grad.addColorStop(0,'rgba(140,180,255,.9)'); grad.addColorStop(0.4,'rgba(90,130,255,.45)'); grad.addColorStop(1,'rgba(90,130,255,0)');
    g.fillStyle=grad; g.beginPath(); g.arc(0,0,26*pulse,0,TAU); g.fill();
    g.fillStyle='#16214a'; g.beginPath();
    for(let i=0;i<6;i++){ const a=i*TAU/6+S.time*0.4; const R=13; g.lineTo(Math.cos(a)*R,Math.sin(a)*R); }
    g.closePath(); g.fill(); g.strokeStyle='#7ab8ff'; g.lineWidth=2; g.stroke();
    g.fillStyle='#cfe4ff'; g.font='800 13px system-ui'; g.textAlign='center'; g.textBaseline='middle';
    g.fillText(Math.max(0,S.lives), 0, 1);
    g.restore();

    // frost auras (under towers)
    for(const t of S.towers){ if(t.key!=='frost') continue;
      const st=TOWERS.frost.levels[t.level];
      const pul=0.5+0.5*Math.sin((t.pulse||0));
      g.strokeStyle=`rgba(160,215,255,${0.16+pul*0.14})`; g.lineWidth=2;
      g.beginPath(); g.arc(t.x,t.y,st.range*(0.94+pul*0.06),0,TAU); g.stroke();
      g.fillStyle='rgba(140,200,255,.045)'; g.beginPath(); g.arc(t.x,t.y,st.range,0,TAU); g.fill();
    }
    // flame cones
    for(const t of S.towers){ if(t.key!=='flame' || !t.fireNow) continue;
      const st=TOWERS.flame.levels[t.level], half=Math.PI/5.4;
      const fl = 0.75+Math.sin(S.time*30+t.x)*0.1;
      const grad=g.createRadialGradient(t.x,t.y,6,t.x,t.y,st.range*fl);
      grad.addColorStop(0,'rgba(255,230,140,.75)'); grad.addColorStop(0.45,'rgba(255,120,60,.4)'); grad.addColorStop(1,'rgba(255,60,40,0)');
      g.fillStyle=grad;
      g.beginPath(); g.moveTo(t.x,t.y); g.arc(t.x,t.y,st.range*fl,t.angle-half,t.angle+half); g.closePath(); g.fill();
    }

    // booms
    for(const b of S.booms){
      const k=1-b.t/0.28;
      g.strokeStyle=`rgba(255,170,90,${b.t/0.28})`; g.lineWidth=3;
      g.beginPath(); g.arc(b.x,b.y,b.r*(0.4+k*0.8),0,TAU); g.stroke();
    }
    // enemies
    for(const e of S.enemies) drawEnemy(g,e);
    // towers
    for(const t of S.towers) drawTowerShape(g, t.key, t.x, t.y, t.angle, t.level, 1, t.fireNow, t.recoil||0);
    // bullets
    for(const b of S.bullets){
      if(b.arc){
        g.save(); g.translate(b.x,b.y-(b.z||0));
        g.fillStyle='rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(0,(b.z||0),4,2,0,0,TAU); g.fill();
        g.fillStyle='#ffb05a'; g.shadowColor='#ff8d5a'; g.shadowBlur=8;
        g.beginPath(); g.arc(0,0,4.6,0,TAU); g.fill(); g.restore();
      } else {
        g.fillStyle=b.color; g.shadowColor=b.color; g.shadowBlur=7;
        g.beginPath(); g.arc(b.x,b.y,b.r,0,TAU); g.fill(); g.shadowBlur=0;
      }
    }
    // tracers
    for(const tr of S.tracers){
      g.strokeStyle=`rgba(255,233,160,${tr.t/0.09})`; g.lineWidth=1.8;
      g.beginPath(); g.moveTo(tr.x1,tr.y1); g.lineTo(tr.x2,tr.y2); g.stroke();
    }
    // lightning bolts
    for(const bo of S.bolts){
      g.strokeStyle=`rgba(210,170,255,${Math.min(1,bo.t/0.07)})`; g.lineWidth=2.2;
      g.shadowColor='#c78dff'; g.shadowBlur=10;
      g.beginPath();
      for(let i=1;i<bo.pts.length;i++){
        const p0=bo.pts[i-1], p1=bo.pts[i];
        g.moveTo(p0.x,p0.y);
        const segs=4;
        for(let j=1;j<=segs;j++){
          const tseg=j/segs;
          const jx=(j<segs)?rnd(-6,6):0, jy=(j<segs)?rnd(-6,6):0;
          g.lineTo(lerp(p0.x,p1.x,tseg)+jx, lerp(p0.y,p1.y,tseg)+jy);
        }
      }
      g.stroke(); g.shadowBlur=0;
    }
    // particles
    for(const p of S.parts){
      const k=1-p.t/p.life;
      g.globalAlpha=k;
      if(p.flame||p.ice){ g.fillStyle=p.color; g.beginPath(); g.arc(p.x,p.y,p.size*k,0,TAU); g.fill(); }
      else { g.fillStyle=p.color; g.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size); }
    }
    g.globalAlpha=1;

    // placement ghost
    if(S.sel && S.hoverCell){
      const T=TOWERS[S.sel], st=T.levels[0];
      const {x,y}=cellCenter(S.hoverCell.c, S.hoverCell.r);
      const ok = canPlace(S.hoverCell.c,S.hoverCell.r) && S.money>=T.cost;
      g.fillStyle = ok? 'rgba(120,255,170,.14)':'rgba(255,90,110,.16)';
      g.fillRect(S.hoverCell.c*CELL,S.hoverCell.r*CELL,CELL,CELL);
      g.strokeStyle = ok? 'rgba(120,255,170,.8)':'rgba(255,90,110,.8)';
      g.lineWidth=2; g.strokeRect(S.hoverCell.c*CELL+1,S.hoverCell.r*CELL+1,CELL-2,CELL-2);
      g.strokeStyle='rgba(150,190,255,.4)'; g.setLineDash([6,6]); g.lineDashOffset=-S.time*30;
      g.beginPath(); g.arc(x,y,st.range,0,TAU); g.stroke(); g.setLineDash([]);
      g.globalAlpha=0.65; drawTowerShape(g,S.sel,x,y,-Math.PI/2,0,1,false); g.globalAlpha=1;
    }
    // selected tower range
    if(S.towerSel){
      const t=S.towerSel, st=TOWERS[t.key].levels[t.level];
      g.strokeStyle=TOWERS[t.key].color; g.globalAlpha=0.6; g.setLineDash([7,7]); g.lineDashOffset=-S.time*30; g.lineWidth=2;
      g.beginPath(); g.arc(t.x,t.y,st.range,0,TAU); g.stroke();
      g.setLineDash([]); g.globalAlpha=1;
    }
  }

  if(!S.map) { g.restore(); return; }
  // hover hint when no tower selected
  if(!S.sel && !S.towerSel && S.hoverCell && canPlace(S.hoverCell.c,S.hoverCell.r)){
    g.strokeStyle='rgba(255,255,255,.08)'; g.lineWidth=1.5;
    g.strokeRect(S.hoverCell.c*CELL+2,S.hoverCell.r*CELL+2,CELL-4,CELL-4);
  }

  // paused veil
  if(S.paused && S.phase==='playing'){
    g.fillStyle='rgba(6,9,22,.55)'; g.fillRect(-20,-20,W+40,H+40);
    g.fillStyle='#e8eeff'; g.font='800 34px system-ui'; g.textAlign='center'; g.textBaseline='middle';
    g.shadowColor='#7ab8ff'; g.shadowBlur=18;
    g.fillText('⏸ PAUSED', W/2, H/2); g.shadowBlur=0;
  }

  // vignette
  g.drawImage(vignette, 0, 0);

  // float texts
  g.font='800 12.5px system-ui'; g.textAlign='center';
  for(const tx of S.texts){
    const k=tx.t/tx.life;
    g.globalAlpha=1-k; g.fillStyle=tx.color;
    g.fillText(tx.txt, tx.x, tx.y-k*22);
  }
  g.globalAlpha=1;
  g.restore();
}

function cellCenter(c,r){ return {x:c*CELL+CELL/2, y:r*CELL+CELL/2}; }

function drawEnemy(g,e){
  const D=e.def;
  g.save(); g.translate(e.x,e.y);
  if(D.flying){ g.translate(0, -10 - Math.sin(e.wob)*2.5);
    g.fillStyle='rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(0,15+Math.sin(e.wob)*2, e.r*0.9, 3.4,0,0,TAU); g.fill(); }
  const flash = e.hitT>0;
  const col = flash ? '#ffffff' : D.color;
  g.shadowColor=D.color; g.shadowBlur=8;
  g.fillStyle=col;
  if(D.shape==='hex'){ g.beginPath(); for(let i=0;i<6;i++){ const a=e.wob*0.3+i*TAU/6; g.lineTo(Math.cos(a)*e.r,Math.sin(a)*e.r);} g.closePath(); g.fill();
    g.fillStyle='rgba(0,0,0,.3)'; g.beginPath(); g.arc(0,0,e.r*0.45,0,TAU); g.fill(); }
  else if(D.shape==='tri'){ const a=e.wob*0; g.rotate(aimAngle(e)); g.beginPath(); g.moveTo(e.r*1.4,0); g.lineTo(-e.r,e.r*0.9); g.lineTo(-e.r,-e.r*0.9); g.closePath(); g.fill(); }
  else if(D.shape==='box'){ g.rotate(aimAngle(e)); g.fillStyle=col; rr(g,-e.r,-e.r*0.85,e.r*2,e.r*1.7,4); g.fill();
    g.fillStyle='rgba(0,0,0,.35)'; rr(g,-e.r*0.5,-e.r*0.9,e.r,e.r*1.8,3); g.fill(); }
  else if(D.shape==='dot'){ g.beginPath(); g.arc(0,0,e.r,0,TAU); g.fill(); }
  else if(D.shape==='fly'){ g.beginPath(); g.arc(0,0,e.r,0,TAU); g.fill();
    g.strokeStyle='rgba(200,240,255,.9)'; g.lineWidth=1.6;
    const ra=e.wob*3; g.beginPath(); g.ellipse(0,0,e.r+5,e.r*0.35,ra,0,TAU); g.stroke();
    g.fillStyle='#0a0e1f'; g.beginPath(); g.arc(e.r*0.35,0,2.6,0,TAU); g.fill(); }
  else if(D.shape==='boss'){
    for(let i=0;i<8;i++){ const a=i*TAU/8+S.time; g.fillStyle=`rgba(199,141,255,${0.5+0.3*Math.sin(S.time*4+i)})`;
      g.beginPath(); g.arc(Math.cos(a)*(e.r+7),Math.sin(a)*(e.r+7),3.4,0,TAU); g.fill(); }
    g.fillStyle=col; g.beginPath(); g.arc(0,0,e.r,0,TAU); g.fill();
    g.fillStyle='#2a1140'; g.beginPath(); g.arc(0,0,e.r*0.55,0,TAU); g.fill();
    g.fillStyle='#ff4d6d'; g.beginPath(); g.arc(0,0,e.r*0.28+Math.sin(S.time*6)*2,0,TAU); g.fill(); }
  g.shadowBlur=0;
  // frost tint
  if(e.slow<0.99){ g.fillStyle='rgba(120,200,255,.35)'; g.beginPath(); g.arc(0,0,e.r+1,0,TAU); g.fill(); }
  // health bar
  if(e.hp<e.maxHp){
    const w=Math.max(16,e.r*2.4), k=clamp(e.hp/e.maxHp,0,1);
    g.fillStyle='rgba(0,0,0,.55)'; rr(g,-w/2,-e.r-9,w,4,2); g.fill();
    g.fillStyle= k>0.5?'#57e389':k>0.25?'#ffd35a':'#ff5d7a';
    rr(g,-w/2,-e.r-9,w*k,4,2); g.fill();
  }
  g.restore();
}
function aimAngle(e){
  const t=e.wp[e.wpi]; if(!t) return 0;
  return Math.atan2(t.y-e.y, t.x-e.x);
}

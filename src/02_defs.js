// ============ definitions & simulation ============
const TOWERS = {
  gun:    { name:'Gunner',  cost:50,  color:'#5ad1ff', hotkey:'1', air:true,  ds:'Rapid single-target',
    levels:[ {dmg:8,  rate:2.6, range:112},
             {dmg:14, rate:2.9, range:124, cost:45},
             {dmg:24, rate:3.3, range:138, cost:90} ] },
  sniper: { name:'Sniper',  cost:120, color:'#ffd35a', hotkey:'2', air:true,  ds:'Long range, huge hit',
    levels:[ {dmg:55, rate:0.62, range:255},
             {dmg:95, rate:0.70, range:280, cost:95},
             {dmg:175,rate:0.80, range:305, cost:170} ] },
  cannon: { name:'Cannon',  cost:110, color:'#ff8d5a', hotkey:'3', air:false, ds:'Splash damage',
    levels:[ {dmg:34, rate:0.85, range:135, splash:56},
             {dmg:58, rate:0.95, range:148, splash:66, cost:90},
             {dmg:100,rate:1.05, range:162, splash:78, cost:160} ] },
  frost:  { name:'Cryo',    cost:90,  color:'#9fd8ff', hotkey:'4', air:false, ds:'Slows & chills (aura)',
    levels:[ {dps:5,  slow:0.42, range:95},
             {dps:9,  slow:0.56, range:106, cost:70},
             {dps:15, slow:0.72, range:120, cost:130} ] },
  flame:  { name:'Flamer',  cost:100, color:'#ff5a3c', hotkey:'5', air:false, ds:'Cone of fire + burn',
    levels:[ {dps:30, range:88,  burn:12},
             {dps:52, range:97,  burn:20, cost:85},
             {dps:88, range:108, burn:34, cost:150} ] },
  tesla:  { name:'Tesla',   cost:150, color:'#c78dff', hotkey:'6', air:true,  ds:'Chain lightning, zaps air',
    levels:[ {dmg:20, rate:1.15, range:125, chain:3},
             {dmg:34, rate:1.30, range:140, chain:4, cost:115},
             {dmg:58, rate:1.45, range:156, chain:5, cost:195} ] },
};
const TKEYS = Object.keys(TOWERS);

const ENEMIES = {
  grunt:  { name:'Grunt',  hp:62,   spd:58,  reward:8,   r:10, color:'#ff9d5c', shape:'hex' },
  runner: { name:'Runner', hp:34,   spd:112, reward:7,   r:8,  color:'#ffe066', shape:'tri' },
  tank:   { name:'Tank',   hp:300,  spd:36,  reward:22,  r:14, color:'#9aa7c7', shape:'box', armor:5 },
  swarm:  { name:'Swarm',  hp:18,   spd:92,  reward:3,   r:6,  color:'#ff6d8a', shape:'dot' },
  fly:    { name:'Drone',  hp:52,   spd:78,  reward:10,  r:9,  color:'#7de8ff', shape:'fly', flying:true },
  boss:   { name:'BOSS',   hp:2300, spd:26,  reward:150, r:20, color:'#c78dff', shape:'boss', boss:true },
};

function waveScale(n){ return 1 + (n-1)*0.21 + Math.pow(n,1.55)*0.012; }

const DIFFS=[
  { key:'easy',      name:'Easy',      hp:0.85, spd:0.95, cash:1.25, lives:25, reward:1.1,  score:0.8  },
  { key:'normal',    name:'Normal',    hp:1,    spd:1,    cash:1,    lives:20, reward:1,    score:1    },
  { key:'hard',      name:'Hard',      hp:1.45, spd:1.12, cash:0.85, lives:12, reward:0.85, score:1.4  },
  { key:'nightmare', name:'Nightmare', hp:2.1,  spd:1.25, cash:0.7,  lives:8,  reward:0.7,  score:2    },
];
function D(){ return DIFFS.find(d=>d.key===S.diff) || DIFFS[1]; }

function buildWave(n){
  const g=[];
  const hpS = waveScale(n);
  const add=(type,count,gap,delay=0)=>g.push({type,count,gap,delay,t:delay,spawned:0,hpS});
  add('grunt', 4+Math.floor(n*1.4), 0.72);
  if(n>=2) add('runner', 3+n, 0.4, 2.4);
  if(n>=4) add('swarm', 6+n, 0.22, 4);
  if(n>=5) add('tank', Math.floor(n/3), 1.6, 5.5);
  if(n>=6 && n%2===0) add('fly', 2+Math.floor(n/3), 0.85, 3.2);
  if(n%10===0) add('boss', Math.floor(n/10), 3.2, 2);
  return g;
}

function spawnEnemy(typeKey, hpS){
  const t = ENEMIES[typeKey];
  const pts = S.map.pts;
  const hp = t.hp * (t.boss ? hpS*1.15 : hpS) * D().hp;
  let wp;
  if(t.flying){ wp=[{x:pts[0].x,y:pts[0].y},{x:S.map.base.x,y:S.map.base.y}]; }
  else wp=pts;
  S.enemies.push({ key:typeKey, def:t, hp, maxHp:hp, x:wp[0].x, y:wp[0].y,
    wpi:1, wp, speed:t.spd*D().spd, r:t.r, progress:0, slow:1, burn:null, dead:false,
    wob:rnd(TAU), hitT:0 });
}

function startWave(){
  S.wave++;
  S.spawnQueue = buildWave(S.wave);
  S.spawnTimer = 0; S.waveActive = true; S.nextTimer = 0;
  banner(S.wave%10===0 ? '⚠ WAVE '+S.wave+' — BOSS' : 'WAVE '+S.wave);
  if(S.wave===1) setTimeout(()=>toast('Keys: 1-6 pick tower · U upgrade · X sell · N wave · Space pause · F speed · S save', false), 1200);
  if(S.wave===2) setTimeout(()=>toast('Tip: towers near corners hit enemies twice as long', false), 1200);
  sfx.waveGo(); updateHUD();
}

function damageEnemy(e, amt){
  if(e.dead) return;
  if(e.def.armor) amt = Math.max(1, amt - e.def.armor);
  e.hp -= amt; e.hitT = 0.12;
  if(e.hp<=0) killEnemy(e);
}
function killEnemy(e){
  e.dead = true;
  const reward = Math.round(e.def.reward * (1 + S.wave*0.04) * D().reward);
  S.money += reward; S.score += Math.round(reward*2*D().score); S.kills++;
  floatText(e.x, e.y-e.r-6, '+'+reward, '#ffd35a');
  const n = e.def.boss ? 34 : 10;
  for(let i=0;i<n;i++) burst(e.x,e.y,e.def.color, e.def.boss?3:1.6);
  if(e.def.boss){ S.shake=Math.max(S.shake,10); sfx.boom(); }
  if((S.kills%7)===0) sfx.coin();
  updateHUD();
}
function leakEnemy(e){
  e.dead = true;
  const dmg = e.def.boss ? 5 : 1;
  S.lives -= dmg; S.shake = Math.max(S.shake, 6);
  floatText(S.map.base.x, S.map.base.y-24, '-'+dmg+' ❤', '#ff5d7a');
  for(let i=0;i<8;i++) burst(S.map.base.x, S.map.base.y, '#ff5d7a', 2);
  sfx.hurt(); updateHUD();
  if(S.lives<=0) gameOver();
}

function enemiesInRadius(x,y,r,ground=true){
  const out=[];
  for(const e of S.enemies){ if(e.dead) continue; if(ground && e.def.flying) continue;
    if(dist(x,y,e.x,e.y) <= r + e.r) out.push(e); }
  return out;
}
function findTarget(t, range, air){
  let best=null, bp=-1;
  for(const e of S.enemies){
    if(e.dead) continue;
    if(e.def.flying && !air) continue;
    const d = dist(t.x,t.y,e.x,e.y);
    if(d <= range + e.r && e.progress > bp){ best=e; bp=e.progress; }
  }
  return best;
}

// ---------- particles / texts ----------
function burst(x,y,color,scale=1.4){
  S.parts.push({x,y,vx:rnd(-70,70)*scale,vy:rnd(-110,20)*scale,life:rnd(0.25,0.6),t:0,color,size:rnd(1.5,3.4)*scale,g:160});
}
function flameP(x,y,ang,spd){
  S.parts.push({x,y,vx:Math.cos(ang)*spd+rnd(-16,16),vy:Math.sin(ang)*spd+rnd(-16,16),
    life:rnd(0.2,0.42),t:0,color:pick(['#ffd166','#ff9a3c','#ff5a3c','#ff3d2e']),size:rnd(2,4.6),g:-60,flame:true});
}
function frostP(x,y){
  S.parts.push({x:x+rnd(-8,8),y:y+rnd(-8,8),vx:rnd(-8,8),vy:rnd(-30,-8),life:rnd(0.3,0.7),t:0,color:'#bfe8ff',size:rnd(1,2.4),g:-20,ice:true});
}
function floatText(x,y,txt,color){ S.texts.push({x,y,txt,color,t:0,life:0.9}); }

// ---------- update ----------
function update(dt){
  S.time += dt;
  S.shake = Math.max(0, S.shake - dt*22);

  // spawn queue
  if(S.waveActive){
    let pending=false;
    for(const g of S.spawnQueue){
      if(g.spawned>=g.count) continue;
      pending=true;
      g.t -= dt;
      if(g.t<=0){ g.t=g.gap; g.spawned++; spawnEnemy(g.type, g.hpS); }
    }
    if(!pending && S.enemies.length===0){
      S.waveActive=false; S.nextTimer=14;
      const bonus=20+S.wave*4; S.money+=bonus; floatText(S.map.base.x,S.map.base.y-30,'+'+bonus+' wave bonus','#7dffb0');
      if(window.saveGame) saveGame(true);
      updateHUD();
    }
  } else if(S.phase==='playing' && S.wave>0){
    S.nextTimer -= dt;
    if(S.nextTimer<=0) startWave();
  }

  // enemies
  for(const e of S.enemies){
    if(e.dead) continue;
    e.slow = 1; // reset each frame; frost auras reapply
  }
  for(const e of S.enemies){
    if(e.dead) continue;
    if(e.burn){ e.burn.t-=dt; damageEnemy(e, e.burn.dps*dt); if(e.burn.t<=0) e.burn=null;
      if(Math.random()<dt*14) flameP(e.x+rnd(-e.r,e.r), e.y-e.r*0.4, -Math.PI/2+rnd(-0.5,0.5), rnd(20,55)); }
    if(e.dead) continue;
    if(e.hitT>0) e.hitT-=dt;
    e.wob += dt*6;
    const tgt = e.wp[e.wpi];
    if(!tgt){ leakEnemy(e); continue; }
    const dx=tgt.x-e.x, dy=tgt.y-e.y, d=Math.hypot(dx,dy);
    const step = e.speed * e.slow * dt;
    if(d<=step){ e.x=tgt.x; e.y=tgt.y; e.wpi++; }
    else { e.x+=dx/d*step; e.y+=dy/d*step; }
    e.progress += step;
  }
  S.enemies = S.enemies.filter(e=>!e.dead);

  // towers
  S.flameSnd = 0;
  for(const t of S.towers){
    const st = TOWERS[t.key].levels[t.level];
    t.fireNow = false;
    if(t.key==='frost'){
      t.pulse = (t.pulse||0) + dt*2.2;
      const hit = enemiesInRadius(t.x,t.y,st.range,true);
      for(const e of hit){
        e.slow = Math.min(e.slow, 1-st.slow);
        damageEnemy(e, st.dps*dt);
        if(Math.random()<dt*4) frostP(e.x,e.y);
      }
      continue;
    }
    const target = findTarget(t, st.range, TOWERS[t.key].air);
    if(target){
      const want = Math.atan2(target.y-t.y, target.x-t.x);
      let da = ((want - t.angle + Math.PI*3)%TAU) - Math.PI;
      t.angle += clamp(da, -dt*9, dt*9);
      t.aimOk = Math.abs(da) < 0.22;
    } else t.aimOk=false;
    t.cool = Math.max(0, (t.cool||0)-dt);
    if(t.recoil) t.recoil = Math.max(0, t.recoil - dt*6);

    if(t.key==='flame'){
      if(target && t.aimOk){
        t.fireNow=true; S.flameSnd++;
        const half=Math.PI/5.4;
        for(const e of enemiesInRadius(t.x,t.y,st.range,true)){
          const a = Math.atan2(e.y-t.y, e.x-t.x);
          let da = ((a - t.angle + Math.PI*3)%TAU) - Math.PI;
          if(Math.abs(da)<half){
            damageEnemy(e, st.dps*dt);
            if(e.burn){ e.burn.dps=Math.max(e.burn.dps,st.burn); e.burn.t=Math.max(e.burn.t,2); }
            else e.burn={dps:st.burn,t:2};
          }
        }
        if(Math.random()<dt*60){
          const a=t.angle+rnd(-half,half), sp=rnd(120,st.range*1.6);
          flameP(t.x+Math.cos(t.angle)*14, t.y+Math.sin(t.angle)*14, a, sp);
        }
      }
      continue;
    }
    if(!target || !t.aimOk || t.cool>0) continue;
    t.cool = 1/st.rate;

    if(t.key==='gun'){
      S.bullets.push({x:t.x+Math.cos(t.angle)*15, y:t.y+Math.sin(t.angle)*15, tgt:target, spd:430, dmg:st.dmg, color:TOWERS.gun.color, r:3, home:true});
      sfx.shoot();
    } else if(t.key==='sniper'){
      damageEnemy(target, st.dmg);
      S.tracers.push({x1:t.x+Math.cos(t.angle)*16, y1:t.y+Math.sin(t.angle)*16, x2:target.x, y2:target.y, t:0.09, color:'#ffe9a0'});
      for(let i=0;i<5;i++) burst(target.x,target.y,'#ffd35a',1.2);
      floatText(target.x,target.y-target.r-10,''+fmt(st.dmg),'#ffe9a0');
      sfx.sniper();
    } else if(t.key==='cannon'){
      const d=dist(t.x,t.y,target.x,target.y);
      S.bullets.push({arc:true, sx:t.x, sy:t.y, tx:target.x, ty:target.y, u:0, T:0.18+d/320, dmg:st.dmg, splash:st.splash, color:TOWERS.cannon.color});
      t.recoil=1;
    } else if(t.key==='tesla'){
      const hitSet=new Set(); let src={x:t.x,y:t.y}; let dmg=st.dmg; const pts=[{x:t.x,y:t.y}];
      for(let j=0;j<st.chain;j++){
        let best=null,bd=1e9;
        for(const e of S.enemies){ if(e.dead||hitSet.has(e)) continue;
          const dd=dist(src.x,src.y,e.x,e.y); if(dd<(j===0?st.range:96)+e.r && dd<bd){bd=dd;best=e;} }
        if(!best) break;
        hitSet.add(best); pts.push({x:best.x,y:best.y}); src=best;
        damageEnemy(best, dmg); dmg*=0.72;
      }
      if(pts.length>1){ S.bolts.push({pts, t:0.14}); sfx.zap(); }
    }
  }
  if(flameGain && AC) flameGain.gain.value = S.muted?0:Math.min(0.05, S.flameSnd*0.016);

  // bullets
  for(const b of S.bullets){
    if(b.arc){
      b.u += dt/b.T;
      if(b.u>=1){
        b.done=true; S.booms.push({x:b.tx,y:b.ty,r:b.splash,t:0.28});
        for(const e of enemiesInRadius(b.tx,b.ty,b.splash,true)) damageEnemy(e, b.dmg*(0.55+0.45*(1-Math.min(1,dist(b.tx,b.ty,e.x,e.y)/b.splash))));
        for(let i=0;i<14;i++) burst(b.tx,b.ty,pick(['#ffb05a','#ff7a3c','#ffd166']),2);
        S.shake=Math.max(S.shake,4); sfx.boom();
      } else {
        b.x=lerp(b.sx,b.tx,b.u); b.y=lerp(b.sy,b.ty,b.u);
        b.z=Math.sin(Math.PI*b.u)*(40+dist(b.sx,b.sy,b.tx,b.ty)*0.12);
      }
      continue;
    }
    if(b.tgt.dead){ b.done=true; continue; }
    const dx=b.tgt.x-b.x, dy=b.tgt.y-b.y, d=Math.hypot(dx,dy);
    const step=b.spd*dt;
    if(d<=step+b.tgt.r){ damageEnemy(b.tgt,b.dmg); for(let i=0;i<3;i++) burst(b.x,b.y,b.color,1); b.done=true; }
    else { b.x+=dx/d*step; b.y+=dy/d*step; }
  }
  S.bullets = S.bullets.filter(b=>!b.done);
  for(const p of S.parts){ p.t+=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=p.g*dt; }
  S.parts = S.parts.filter(p=>p.t<p.life);
  for(const tx of S.texts) tx.t+=dt;
  S.texts = S.texts.filter(tx=>tx.t<tx.life);
  for(const bo of S.bolts) bo.t-=dt;
  S.bolts = S.bolts.filter(b=>b.t>0);
  for(const tr of S.tracers) tr.t-=dt;
  S.tracers = S.tracers.filter(t=>t.t>0);
  for(const bm of S.booms) bm.t-=dt;
  S.booms = S.booms.filter(b=>b.t>0);
}

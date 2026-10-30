/* Z crystals share the special equipment slot with Mega Stones. */
G.ZMoves = (() => {
  const COOLDOWN = 5, MAX_CHARGES=3, BULLET_TIME = 0.1, TAU = Math.PI * 2;
  const KINDS = ['projectile', 'melee', 'beam', 'orbit', 'chain', 'dash', 'meteor', 'boomerang', 'nova', 'aura', 'mine', 'turret', 'trail', 'cone'];
  // Dedicated Z power avoids inheriting incompatible per-hit damage scales
  // from pellets, rapid fields and single heavy attacks. Attack/type/critical
  // and ability damage modifiers still go through the normal combat pipeline.
  const power = m => 1200 * (1 + .4 * (Math.max(1,Math.min(5,m.lvl||1))-1)) * (m.evolved?1.6:1);
  const CAPS = {projectile:1.1,melee:1.1,beam:1.1,orbit:1.05,chain:1,dash:1.1,meteor:1.1,boomerang:1.1,nova:.95,aura:1,mine:1.1,turret:1.15,trail:1.05,cone:1.1};
  const TYPES = Object.keys(G.U.TYPE_COLOR);
  const state = p => p.zState || (p.zState = { type: null, phase: 'ready', charges:1, rewards:new Set(), cooldown: 0, elapsed: 0, casts: [], guard: 0 });
  const hasStone = p => !!(p && p.zState && TYPES.includes(p.zState.type));
  const selecting = p => hasStone(p) && state(p).phase === 'choose' && !p.dead;
  const busy = p => hasStone(p) && !p.dead && ['choose', 'cast'].includes(state(p).phase);
  const dashing = p => busy(p) && state(p).casts.some(e => e.m.kind === 'dash' && e.t < 0.5);
  const immune = p => busy(p) || !!(p && p.zState && state(p).guard > 0);
  const cooldownFor = p => !p.remote && G.Dev?.zShortCooldown ? 2 : COOLDOWN;
  const all = () => G.Game ? G.Game.everyone().filter(p => p && !p.dead) : [];
  const enemies = () => G.EnemyMgr.all().filter(e => !e.dead);
  const timeFactor = () => all().some(selecting) ? BULLET_TIME : 1;
  const matches = (p, m) => hasStone(p) && m.type === state(p).type && KINDS.includes(m.kind);
  const eligible = (p, i) => (p.slots[i]||[]).filter(m => matches(p, m));
  function owns(save, type, dex) { return TYPES.includes(type) && (dex == null ? !!save?.zStones?.[type] : G.ZAccess.allowed(save,dex)); }
  function grant(save, type) {
    if (!TYPES.includes(type)) return false;
    save.zStones ||= {}; save.zStones[type] ||= { at: Date.now(), from: 'dev' };
    for(const d of Object.keys(save.owned||{}))G.ZAccess.unlock(save,d,'dev');return true;
  }
  function equip(save, dex, type) {
    if (!G.DEX_BY[dex] || type && !owns(save, type, dex)) return false;
    save.zEquipped ||= {}; save.zEquipped[dex] = type || null;
    if (type) { save.megaEquipped ||= {}; save.megaEquipped[dex] = null; save.activeEquipped ||= {}; save.activeEquipped[dex]=null; }
    return true;
  }
  function normalize(save) {
    G.ZAccess?.normalize(save);
    for (const key of ['zStones', 'zEquipped']) if (!save[key] || typeof save[key] !== 'object' || Array.isArray(save[key])) save[key] = {};
    for (const type of Object.keys(save.zStones)) if (!TYPES.includes(type) || !save.zStones[type] || typeof save.zStones[type] !== 'object' || Array.isArray(save.zStones[type])) delete save.zStones[type];
    for (const dex of Object.keys(save.zEquipped)) {
      const type = save.zEquipped[dex];
      if (!G.DEX_BY[dex] || type !== null && !owns(save, type, dex)) delete save.zEquipped[dex];
      else if (type && save.megaEquipped) save.megaEquipped[dex] = null;
    }
  }
  function init(p, save) {
    const type = save?.zEquipped?.[p.ivDex || p.dex];
    if (owns(save, type, p.ivDex || p.dex)) {
      state(p).type = type; p.activeItem=null;
      if (p.megaState) p.megaState.id = null;
      if (p.item) p.equip(null);
    }
  }
  function arm(p) {
    if (!hasStone(p) || p.dead || G.Game.state !== 'playing' || p.remote) return false;
    const s = state(p);
    if (s.phase === 'choose') { s.phase = 'ready'; return true; }
    if (s.phase !== 'ready' || !G.Abilities.canCast(p)) return false;
    if(!(s.charges>0)){G.UI.toast(G.T('No quedan cargas Z.'));return false;}
    if (!p.slots.some((g, i) => eligible(p, i).length)) { G.UI.toast(G.T('No hay movimientos Z compatibles.')); return false; }
    s.phase = 'choose'; s.elapsed = 0;
    G.Projectiles.clearOrbs(p); G.Combat.clearFields(p);
    p.anim.play('Charge'); G.Audio.sfx('select'); return true;
  }
  // The half-plane aim uses a circular sliding window; line attacks score their actual corridors.
  function aim(p, m) {
    const es = enemies(), bosses = es.filter(e => e.boss).sort((a,b) => G.U.dist2(p.x,p.y,a.x,a.y)-G.U.dist2(p.x,p.y,b.x,b.y));
    if (bosses.length) return Math.atan2(bosses[0].y-p.y,bosses[0].x-p.x);
    if (!es.length) return p.aim || 0;
    const angles = es.map(e => (Math.atan2(e.y-p.y,e.x-p.x)+TAU)%TAU).sort((a,b)=>a-b);
    if (['projectile','boomerang','cone','mine','trail','turret','nova','aura','orbit','meteor','chain'].includes(m.kind)) {
      const a = angles.concat(angles.map(v=>v+TAU)); let best=0, angle=angles[0], end=0;
      for (let start=0;start<angles.length;start++) {
        end=Math.max(end,start); while(end<start+angles.length && a[end]-a[start]<=Math.PI+1e-8) end++;
        if(end-start>best){best=end-start;angle=(a[start]+a[end-1])/2;}
      }
      return angle;
    }
    const width = m.kind === 'dash' ? (m.width||34)*5 : m.width*4;
    const length = m.radius * (m.kind === 'dash' ? 10 : 99);
    let best=-1, angle=p.aim||0;
    const candidates=[];
    for(const e of es){const a=Math.atan2(e.y-p.y,e.x-p.x),d=Math.hypot(e.x-p.x,e.y-p.y),off=Math.asin(Math.min(1,(width/2+e.r)/Math.max(1e-8,d)));
      candidates.push(a,a-off+1e-8,a+off-1e-8);
      if(d>length+e.r){const cap=Math.acos((length+e.r)/d);candidates.push(a-cap-1e-8,a+cap+1e-8);}}
    for(const a of candidates){let count=0;for(const e of es) if(onLine(p.x,p.y,a,length,width,e))count++;
      if(count>best){best=count;angle=a;}}
    return angle;
  }
  function onLine(x,y,a,len,width,e) {
    const dx=e.x-x,dy=e.y-y,along=dx*Math.cos(a)+dy*Math.sin(a);
    return along>=-e.r && along<=len+e.r && Math.abs(-dx*Math.sin(a)+dy*Math.cos(a))<=width/2+e.r;
  }
  const duration = m => ({ melee:2.2, beam:3, orbit:5, chain:5, dash:0.5, meteor:3.4,boomerang:2.4,nova:2.2,aura:4,mine:2.6,turret:5.3,trail:4,cone:3 }[m.kind] || Math.max(1.2,m.life||1.4));
  function entry(p, learned, ghost=false, angle=null) {
    let m=G.Abilities.move(p,{...learned});
    return { m, learned, ghost, vis:G.VFX.forMove(m), seed:Math.random()*100,
      x:p.x,y:p.y, angle:angle??aim(p,m), atk:p.attackFor ? p.attackFor(m) : p.atk, t:0, prev:0, next:0, pulses:0,
      duration:duration(m), budget:power(m)*(p.attackFor ? p.attackFor(m) : p.atk), damage:new Map(), groups:new Set(),
      hits:new Set(), rounds:[new Set(),new Set(),new Set()], orbitHits:new Map(), falls:[] };
  }
  function choose(p,i) {
    if(!selecting(p)) return false;
    const ms=eligible(p,i); if(!ms.length)return false;
    const s=state(p);if(!(s.charges>0))return false;s.charges--;p.active=i;s.phase='cast';s.elapsed=0;s.ppSlot=p.slots[i].slice();s.casts=ms.map(m=>entry(p,m));
    p.anim.play('Charge');
    if(G.Coop.active && G.Coop.zCast)G.Coop.zCast(p,ms,s.casts.map(e=>e.angle));
    tick(p,0); return true;
  }
  function cancel(p) {
    if(!p?.zState)return;
    const s=state(p);s.casts=[];s.ppSlot=null;s.phase='cooldown';s.cooldown=cooldownFor(p);
  }
  function reserve(cast,target,amount,group) {
    if(cast.ghost||target.dead)return 0;
    const key=group==null?null:group+':'+target.id;
    if(key&&cast.groups.has(key))return 0;
    const used=cast.damage.get(target.id)||0;
    const allowed=Math.max(0,Math.min(amount,cast.budget*CAPS[cast.m.kind]-used));
    if(allowed<=1e-8)return 0;
    if(key)cast.groups.add(key);
    cast.damage.set(target.id,used+allowed);return allowed;
  }
  function projectileDamage(shot,target) {return shot.zCast?reserve(shot.zCast,target,shot.dmg,shot.zGroup):shot.dmg;}
  function hit(p,e,cast,fraction=1,extra={},group) {
    if(cast.ghost || e.dead)return;
    const m={...cast.m,...extra};
    const dmg=reserve(cast,e,cast.budget*fraction,group);
    if(dmg>0)G.Combat.zHit(p,e,dmg,m);
  }
  function shot(p,e,x,y,a,{fraction=.55,size=5,speed=3,life=e.m.life||1.4,group,homing=0,target=null}={}) {
    const m=e.m,sp=(m.speed||300)*speed;
    G.Projectiles.spawn({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,dmg:e.budget*fraction,
      r:(m.size||6)*size,life,pierce:(m.pierce||0)+999,color:G.U.TYPE_COLOR[m.type],vis:e.vis,owner:p,ghost:e.ghost,
      friendly:true,hits:new Set(),burn:m.burn||0,poison:m.poison||0,slow:m.slow||0,knock:m.knock||0,homing,homingTarget:target,
      mtype:m.type,moveKind:m.kind,moveId:m.id,damageClass:m.damageClass,evolved:!!m.evolved,zMove:true,zCast:e,zGroup:group,visualScale:((m.size||6)>=8?1.5:1)*size});
  }
  function projectile(p,e) {
    const m=e.m,col=G.U.TYPE_COLOR[m.type];
    const focus=priority(e.x,e.y,1200);
    for(let i=0;i<8;i++){
      const a=e.angle+(i/7-.5)*Math.PI*2/3;
      const guided=(i===3||i===4)&&focus;
      shot(p,e,e.x,e.y,a,{homing:guided?6:0,target:guided||null});
    }
    G.FX.ring(e.x,e.y,10,100,col,.5,6);
  }
  function sweep(p,e) {
    const radius=e.m.radius*3;
    for(let round=0;round<3;round++){
      const start=round*.4,end=(round+1)*.4;
      if(e.t<start || e.prev>end)continue;
      e.slashRounds ||= new Set();
      if(!e.slashRounds.has(round)){
        e.slashRounds.add(round);
        G.FX.slash(p.x,p.y-G.LIFT*.5,e.angle,radius,TAU,G.U.TYPE_COLOR[e.m.type],{...e.vis,visualScale:3});
      }
      const a0=Math.max(0,(e.prev-start)/.4)*TAU,a1=Math.min(1,(e.t-start)/.4)*TAU;
      for(const target of G.EnemyMgr.queryCircle(p.x,p.y,radius)){
        const a=(Math.atan2(target.y-p.y,target.x-p.x)-e.angle+TAU*2)%TAU;
        if(!e.rounds[round].has(target.id) && a>=a0-1e-8 && a<=a1+1e-8){e.rounds[round].add(target.id);hit(p,target,e,.2);}
      }
    }
    if(e.t>=2.2-1e-8&&!e.finalDone){
      e.finalDone=true;
      G.FX.ring(p.x,p.y,8,e.m.radius*4.5,G.U.TYPE_COLOR[e.m.type],.5,12);
      G.FX.slash(p.x,p.y-G.LIFT*.5,e.angle,e.m.radius*4.5,TAU,G.U.TYPE_COLOR[e.m.type],{...e.vis,visualScale:4.5});
      for(const target of G.EnemyMgr.queryCircle(p.x,p.y,e.m.radius*4.5))hit(p,target,e,.5);
    }
  }
  function beam(p,e) {
    G.FX.sp('impact',e.vis.pal,e.x+Math.cos(e.angle)*10,e.y-G.LIFT+Math.sin(e.angle)*10,{life:.12,scale:4});
    for(const target of enemies())if(onLine(e.x,e.y,e.angle,e.m.radius*99,e.m.width*4,target))hit(p,target,e,1.1/6);
  }
  function chain(p,e) {
    let cur=priority(p.x,p.y,800),x=p.x,y=p.y-G.LIFT;
    for(let n=0;n<(e.m.count||1)+20 && cur;n++){
      const nextX=cur.x,nextY=cur.y;
      const ty=nextY-cur.bodyH*.5;
      G.FX.beam(x,y,Math.atan2(ty-y,nextX-x),Math.hypot(nextX-x,ty-y),10,G.U.TYPE_COLOR[e.m.type],e.vis);
      hit(p,cur,e,.1,{slow:G.Abilities.suppressEffects(p)?0:.8},'chain:'+e.pulses);
      let next=null,dist=e.m.radius**2;
      for(const target of G.EnemyMgr.queryCircle(nextX,nextY,e.m.radius)){
        if(target===cur || target.dead)continue;const d=G.U.dist2(nextX,nextY,target.x,target.y);
        if(d<dist){dist=d;next=target;}
      }
      x=nextX;y=ty;cur=next;
    }
  }
  function orbit(p,e) {
    const m=e.m,n=Math.max(1,m.count|0);
    // The inner vortex covers its center as well: enlarged/evolved rings must
    // not create a safe hole around the almost immobile caster.
    e.corePulse ||= 0;
    while(e.corePulse<10&&e.corePulse*.5<=e.t+1e-8){
      pulseArea(p,e,p.x,p.y,Math.max(m.radius*.75+m.size*2.5,m.radius*1.5-m.size*2.5),.125,'orbit:core:'+e.corePulse,
        {slow:G.Abilities.suppressEffects(p)?0:.8});e.corePulse++;
    }
    for(let layer=0;layer<1;layer++)for(let i=0;i<n;i++){
      const a=i/n*TAU+e.t*Math.abs(m.speed)*(layer===0?3:-2);
      const r=m.radius*(layer===0?1.5:.75),x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r*.7;
      for(const target of G.EnemyMgr.queryCircle(x,y,m.size*2.5)){
        const key=layer+':'+target.id;
        if(e.t-(e.orbitHits.get(key)??-99)<.5-1e-8)continue;
        e.orbitHits.set(key,e.t);hit(p,target,e,layer===0?.1:.125,{slow:layer===1&&!G.Abilities.suppressEffects(p)?.8:m.slow||0});
      }
    }
  }
  function landing(x,y,r,fallback) {
    if((!G.World.arenaContains||G.World.arenaContains(x,y,r))&&G.World.isFree(x,y,r))return [x,y];
    for(let radius=16;radius<=512;radius+=16)for(let i=0;i<32;i++){
      const a=i/32*TAU,px=x+Math.cos(a)*radius,py=y+Math.sin(a)*radius;
      if((!G.World.arenaContains||G.World.arenaContains(px,py,r))&&G.World.isFree(px,py,r))return [px,py];
    }
    return fallback;
  }
  function dash(p,e) {
    const m=e.m,progress=Math.min(1,e.t/.5);
    if(e.dashLength===undefined){
      const desired=m.radius*10,end=G.World.limitArenaDash?G.World.limitArenaDash(e.x,e.y,e.x+Math.cos(e.angle)*desired,e.y+Math.sin(e.angle)*desired,p.r):null;
      e.dashLength=end?Math.hypot(end[0]-e.x,end[1]-e.y):desired;
    }
    const length=e.dashLength;
    const x=e.x+Math.cos(e.angle)*length*progress,y=e.y+Math.sin(e.angle)*length*progress;
    // Emit the original move's streak sprites along the swept path, enlarged with its width.
    e.trailAt ||= 0;
    while(e.trailAt<=length*progress){
      G.FX.sp(e.vis.proj||'streak',e.vis.pal,e.x+Math.cos(e.angle)*e.trailAt,e.y+Math.sin(e.angle)*e.trailAt-G.LIFT*.6,
        {life:.22,angle:e.angle,scale:5});e.trailAt+=22*5;
    }
    if(progress>=1&&!e.landingFx){e.landingFx=true;G.FX.slash(x,y-G.LIFT*.5,e.angle,34*5,2.2,G.U.TYPE_COLOR[m.type],{...e.vis,visualScale:5});}
    if(!e.ghost){
      const px=e.x+Math.cos(e.angle)*length*Math.min(1,e.prev/.5),py=e.y+Math.sin(e.angle)*length*Math.min(1,e.prev/.5);
      p.x=x;p.y=y;
      for(const target of enemies())if(!e.hits.has(target.id)&&onLine(px,py,e.angle,Math.hypot(x-px,y-py),(m.width||34)*5,target)){
        e.hits.add(target.id);hit(p,target,e,1.1/1.5,{zCrit:true});
      }
      if(progress>=1){[p.x,p.y]=landing(x,y,p.r,[e.x,e.y]);state(p).guard=2;}
    }
  }
  function meteor(p,e) {
    const m=e.m;
    while(e.pulses<30 && e.next<=e.t+1e-8){
      const near=enemies().filter(t=>G.U.dist2(p.x,p.y,t.x,t.y)<600**2),target=G.U.pick(near);
      e.meteorFraction ??= .02*Math.max(1,Math.min(10,near.length));
      e.falls.push({x:target?target.x:p.x+G.U.rand(-200,200),y:target?target.y:p.y+G.U.rand(-150,150),at:e.next+.5});
      e.pulses++;e.next=e.pulses*.1;
    }
    for(const f of e.falls)if(!f.hit&&f.at<=e.t+1e-8){
      f.hit=true;G.FX.ring(f.x,f.y,8,m.radius*3,G.U.TYPE_COLOR[m.type],.4,6);
      G.FX.burst(f.x,f.y-6,G.U.TYPE_COLOR[m.type],12,170);
      for(const target of G.EnemyMgr.queryCircle(f.x,f.y,m.radius*3))hit(p,target,e,e.meteorFraction);
    }
    e.falls=e.falls.filter(f=>!f.hit);
    if(e.t>=3.4-1e-8&&!e.finalDone){
      e.finalDone=true;G.FX.ring(e.x,e.y,8,600,G.U.TYPE_COLOR[m.type],.5,10);
      for(const target of G.EnemyMgr.queryCircle(e.x,e.y,600))hit(p,target,e,.5);
    }
  }
  function priority(x,y,range) {
    const near=enemies().filter(t=>G.U.dist2(x,y,t.x,t.y)<=range*range);
    near.sort((a,b)=>(!!b.boss-!!a.boss)||G.U.dist2(x,y,a.x,a.y)-G.U.dist2(x,y,b.x,b.y));
    return near[0]||null;
  }
  function pulseArea(p,e,x,y,r,fraction,group,extra={}) {
    G.FX.ring(x,y,8,r,G.U.TYPE_COLOR[e.m.type],.35,4);
    for(const target of G.EnemyMgr.queryCircle(x,y,r))hit(p,target,e,fraction,extra,group);
  }
  function boomerang(p,e) {
    const reach=Math.max(300,e.m.radius*2.2),width=e.m.size*6;
    e.booms=[];
    for(let i=0;i<3;i++){
      const a=e.angle+(i-1)*.45;
      for(let pass=0;pass<2;pass++){
        const start=pass*1.2,end=start+1.2;
        if(e.t<start||e.prev>end)continue;
        const f=t=>Math.max(0,Math.min(1,(t-start)/1.2));
        const d0=reach*(pass?1-f(e.prev):f(e.prev)),d1=reach*(pass?1-f(e.t):f(e.t));
        const x=e.x+Math.cos(a)*d0,y=e.y+Math.sin(a)*d0;
        for(const target of enemies())if(onLine(x,y,a+(pass?Math.PI:0),Math.abs(d1-d0),width,target))
          hit(p,target,e,.55,{},'return:'+pass);
      }
      const d=reach*(e.t<1.2?e.t/1.2:1-(e.t-1.2)/1.2);
      e.booms.push({x:e.x+Math.cos(a)*d,y:e.y+Math.sin(a)*d,a:a+(e.t>=1.2?Math.PI:0)});
    }
  }
  function nova(p,e) {
    const n=Math.max(16,Math.min(24,e.m.count||16));
    for(let i=0;i<n;i++)shot(p,e,e.x,e.y,e.angle+i/n*TAU,
      {fraction:.95/3,size:3,speed:2,life:1.1,group:'nova:'+e.pulses});
    G.FX.ring(e.x,e.y,10,250,G.U.TYPE_COLOR[e.m.type],.5,5);
  }
  function aura(p,e) {
    const r=Math.max(200,e.m.radius*2.5);
    pulseArea(p,e,e.x,e.y,r,1/8,'aura:'+e.pulses,{slow:G.Abilities.suppressEffects(p)?0:Math.max(.5,e.m.slow||0)});
    for(let i=0;i<8;i++){
      const a=i/8*TAU+e.pulses*.4;
      G.FX.sp(e.vis.aura||e.vis.proj,e.vis.pal,e.x+Math.cos(a)*r*.7,e.y+Math.sin(a)*r*.7-G.LIFT,{life:.5,scale:2,vy:-30});
    }
  }
  function mines(p,e) {
    if(!e.nodes){
      const target=priority(e.x,e.y,650),x=target?.x??e.x+Math.cos(e.angle)*200,y=target?.y??e.y+Math.sin(e.angle)*200;
      e.center={x,y};e.nodes=Array.from({length:6},(_,i)=>({x:x+Math.cos(i/6*TAU)*90,y:y+Math.sin(i/6*TAU)*90,at:.7+i*.25}));
    }
    const r=Math.max(150,e.m.radius*2);
    for(const node of e.nodes)if(!node.done&&e.t>=node.at-1e-8){
      node.done=true;pulseArea(p,e,node.x,node.y,r,.12,'mine:'+node.at);
      G.FX.burst(node.x,node.y-6,G.U.TYPE_COLOR[e.m.type],12,170);
    }
    if(e.t>=2.6-1e-8&&!e.finalDone){e.finalDone=true;pulseArea(p,e,e.center.x,e.center.y,r*1.5,.5,'mine:final');}
  }
  function turret(p,e) {
    e.nodes ||= Array.from({length:3},(_,i)=>({x:e.x+Math.cos(e.angle+i/3*TAU)*70,y:e.y+Math.sin(e.angle+i/3*TAU)*70}));
    for(const node of e.nodes){
      const target=priority(node.x,node.y,900);if(!target)continue;
      const a=Math.atan2(target.y-node.y,target.x-node.x);
      shot(p,e,node.x,node.y,a,{fraction:1/24,size:3,speed:2,life:1.6,homing:4,target});
      G.FX.sp('impact',e.vis.pal,node.x,node.y-G.LIFT,{life:.15,scale:2});
    }
  }
  function trail(p,e) {
    e.nodes ||= Array.from({length:5},(_,i)=>({x:e.x+Math.cos(e.angle)*i*100,y:e.y+Math.sin(e.angle)*i*100}));
    for(const node of e.nodes){
      pulseArea(p,e,node.x,node.y,Math.max(120,e.m.radius*3),.13,'trail:'+e.pulses);
      G.FX.sp(e.vis.aura||e.vis.proj,e.vis.pal,node.x,node.y-4,{life:.5,scale:2,vy:-20});
    }
  }
  function cone(p,e) {
    const n=Math.max(9,Math.min(15,(e.m.count||8)|1));
    for(let i=0;i<n;i++)shot(p,e,e.x,e.y,e.angle+(i/(n-1)-.5)*Math.PI/2,
      {fraction:.19,size:3,speed:2,life:.8,group:'cone:'+e.pulses});
  }
  function tick(p,dt) {
    if(!hasStone(p))return;
    const s=state(p);s.guard=Math.max(0,s.guard-dt);
    if(p.dead){if(s.phase==='cast'||s.phase==='choose')cancel(p);return;}
    if(!p.remote&&s.phase==='cooldown'){s.cooldown=Math.max(0,Math.min(s.cooldown,cooldownFor(p))-dt);if(s.cooldown<=1e-8){s.cooldown=0;s.phase='ready';}}
    if(s.phase!=='cast'&&!s.casts.length)return;
    s.elapsed+=dt;
    for(const e of s.casts){
      if(e.done)continue;
      e.prev=e.t;e.t=Math.min(e.duration,e.t+dt);
      if(e.m.kind==='projectile'&&!e.pulses){projectile(p,e);e.pulses=1;}
      if(e.m.kind==='melee')sweep(p,e);
      if(e.m.kind==='beam'||e.m.kind==='chain'){
        const limit=e.m.kind==='beam'?6:10;
        while(e.pulses<limit&&e.next<=e.t+1e-8){if(e.m.kind==='beam')beam(p,e);else chain(p,e);e.pulses++;e.next=e.pulses*.5;}
      }
      if(e.m.kind==='orbit')orbit(p,e);
      if(e.m.kind==='dash')dash(p,e);
      if(e.m.kind==='meteor')meteor(p,e);
      if(e.m.kind==='boomerang')boomerang(p,e);
      if(e.m.kind==='mine')mines(p,e);
      const timed={nova:[3,.5,nova],aura:[8,.5,aura],turret:[10,.4,turret],trail:[8,.5,trail],cone:[6,.4,cone]}[e.m.kind];
      if(timed)while(e.pulses<timed[0]&&e.next<=e.t+1e-8){timed[2](p,e);e.pulses++;e.next=e.pulses*timed[1];}
      if(e.t>=e.duration-1e-8)e.done=true;
    }
    if(s.casts.length&&s.casts.every(e=>e.done)){
      for(const e of s.casts)if(e.learned)e.learned.t=Math.max(e.learned.t||0,e.learned.cd*p.cdMul);
      if(!p.remote&&G.MovePP)G.MovePP.restore(p,s.ppSlot);
      s.ppSlot=null;
      s.casts=[];if(!p.remote){s.phase='cooldown';s.cooldown=cooldownFor(p);}
    }
  }
  function sync(p,packed) {
    if(!p.remote)return;
    if(!Array.isArray(packed)){if(p.zState){p.zState.type=null;p.zState.casts=[];p.zState.guard=0;}return;}
    const [type,phase,cooldown,charges]=packed;
    if(!TYPES.includes(type)){if(p.zState){p.zState.type=null;p.zState.casts=[];}return;}
    const s=state(p),next=['ready','choose','cast','cooldown'].includes(phase)?phase:'ready';
    if(s.type!==type||next!=='cast'){s.casts=[];s.elapsed=0;}
    s.type=type;s.phase=next;
    s.cooldown=Number.isFinite(cooldown)?Math.max(0,Math.min(COOLDOWN,cooldown)):0;
    s.charges=Number.isInteger(charges)?Math.max(0,Math.min(MAX_CHARGES,charges)):1;
    if(p.megaState)p.megaState.id=null;
  }
  function remoteCast(p,spec,angles) {
    if(!hasStone(p)||!Array.isArray(spec)||!Array.isArray(angles))return false;
    const casts=[];
    for(let i=0;i<Math.min(4,spec.length);i++){
      const [id,lvl,evolved]=spec[i]||[],def=G.Moves.BY_ID[id];
      if(!def||!matches(p,def)||!Number.isFinite(angles[i]))return false;
      const m=G.Moves.instance(id,Math.max(1,Math.min(def.maxLvl,Number(lvl)||1)));if(evolved)G.Moves.evolve(m);
      casts.push(entry(p,m,true,angles[i]));
    }
    if(!casts.length)return false;
    const s=state(p);s.phase='cast';s.casts=casts;s.elapsed=0;tick(p,0);return true;
  }
  function draw(ctx) {
    for(const p of all()){
      if(!busy(p))continue;
      const s=state(p),color=G.U.TYPE_COLOR[s.type],pulse=.5+.5*Math.sin(performance.now()/85);
      ctx.save();ctx.strokeStyle=color;ctx.lineWidth=4;ctx.globalAlpha=.4+pulse*.5;
      ctx.beginPath();ctx.ellipse(p.x,p.y,34+pulse*9,22+pulse*6,0,0,TAU);ctx.stroke();
      ctx.strokeStyle='#fff3ac';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,48+pulse*7,31+pulse*5,0,0,TAU);ctx.stroke();
      for(const e of s.casts){
        if(e.done)continue;
        const m=e.m;ctx.strokeStyle=color;ctx.fillStyle=color;ctx.globalAlpha=1;
        if(m.kind==='beam'){
          const range=G.Camera.outerRadius()+m.width*4+80;
          const along=((G.Camera.x??p.x)-e.x)*Math.cos(e.angle)+((G.Camera.y??p.y)-e.y)*Math.sin(e.angle);
          const from=Math.max(0,along-range),len=Math.min(m.radius*99,along+range);
          if(len>from)G.FX.drawBeam(ctx,{x:e.x,y:e.y-G.LIFT,angle:e.angle,from,len,width:m.width*4,
            pal:e.vis.pal,shape:e.vis.beam,t:0,life:1,seed:e.seed,visualScale:4,precise:true});
        }
        if(m.kind==='melee'){
          if(e.t<=1.2){const a=e.angle+e.t/.4*TAU;
            G.FX.drawSlash(ctx,{x:p.x,y:p.y-G.LIFT*.5,angle:a-.35,radius:m.radius*3,arc:.7,pal:e.vis.pal,t:0,life:.22});
          }else if(!e.done){const charge=Math.min(1,e.t-1.2);ctx.globalAlpha=.15+charge*.45;ctx.lineWidth=3+charge*6;
            ctx.beginPath();ctx.arc(p.x,p.y-G.LIFT,m.radius*4.5,0,TAU);ctx.stroke();
            ctx.strokeStyle='#fff7c0';ctx.beginPath();ctx.arc(p.x,p.y-G.LIFT,12+charge*m.radius*2,0,TAU);ctx.stroke();}
        }
        if(m.kind==='orbit')for(let layer=0;layer<2;layer++)for(let i=0;i<Math.max(1,m.count|0);i++){
          const a=i/Math.max(1,m.count|0)*TAU+e.t*Math.abs(m.speed)*(layer===0?3:-2),r=m.radius*(layer===0?1.5:.75);
          G.Projectiles.drawSprite(ctx,{x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r*.7,r:m.size*2.5,visualScale:(m.size>=8?1.5:1)*2.5,orb:true,oa:a,t:e.t,vis:e.vis});
        }
        if(m.kind==='meteor')for(const f of e.falls){
          G.FX.drawMeteor(ctx,{x:f.x,y:f.y,t:.5-(f.at-e.t),fall:.5,vis:e.vis,visualScale:3});
        }
        if(m.kind==='meteor'&&e.t>=2.9)G.FX.drawMeteor(ctx,{x:e.x,y:e.y,t:e.t-2.9,fall:.5,vis:e.vis,visualScale:10});
        if(m.kind==='boomerang')for(const node of e.booms||[])
          G.Projectiles.drawSprite(ctx,{x:node.x,y:node.y,vx:Math.cos(node.a),vy:Math.sin(node.a),r:m.size*3,visualScale:3,t:e.t,life:e.duration,vis:e.vis});
        if(m.kind==='turret'&&e.t<4.2)for(const node of e.nodes||[])
          G.VFX.draw(ctx,e.vis.proj,e.vis.pal,node.x,node.y-16+Math.sin(e.t*8)*3,{scale:3,alpha:Math.min(1,(4.2-e.t)*4),frame:Math.floor(e.t*12)});
      }
      ctx.restore();
    }
  }
  function drawGround(ctx) {
    for(const p of all())if(busy(p))for(const e of state(p).casts){
      if(e.done)continue;
      if(e.m.kind==='meteor')for(const f of e.falls)G.FX.drawMeteorShadow(ctx,
        {x:f.x,y:f.y,t:.5-(f.at-e.t),fall:.5,r:e.m.radius*3,col:G.U.TYPE_COLOR[e.m.type]});
      if(e.m.kind==='meteor'&&e.t>=2.9)G.FX.drawMeteorShadow(ctx,{x:e.x,y:e.y,t:e.t-2.9,fall:.5,r:600,col:G.U.TYPE_COLOR[e.m.type]});
      if(['mine','trail','aura','turret'].includes(e.m.kind)){
        ctx.save();const col=G.U.TYPE_COLOR[e.m.type];ctx.fillStyle=col;ctx.strokeStyle=col;
        if(e.m.kind==='aura'){
          ctx.globalAlpha=.1;ctx.beginPath();ctx.ellipse(e.x,e.y,Math.max(200,e.m.radius*2.5),Math.max(200,e.m.radius*2.5)*.7,0,0,TAU);ctx.fill();
        }
        for(const node of e.nodes||[]){
          if(e.m.kind==='mine'&&node.done)continue;
          const r=e.m.kind==='trail'?Math.max(120,e.m.radius*3):e.m.kind==='mine'?Math.max(150,e.m.radius*2):30;
          ctx.globalAlpha=e.m.kind==='mine'?.08:.18;ctx.beginPath();ctx.ellipse(node.x,node.y,r,r*.62,0,0,TAU);ctx.fill();
          ctx.globalAlpha=.55;ctx.lineWidth=2;ctx.stroke();
          if(e.m.kind==='mine'){ctx.globalAlpha=1;G.VFX.draw(ctx,e.vis.proj,e.vis.pal,node.x,node.y-4,{scale:2.5,alpha:.8+.2*Math.sin(e.t*15),frame:Math.floor(e.t*8)});}
        }
        ctx.restore();
      }
      if(e.m.kind==='orbit'){
        ctx.save();ctx.fillStyle='rgba(0,0,0,.25)';
        for(let layer=0;layer<2;layer++)for(let i=0;i<Math.max(1,e.m.count|0);i++){
          const a=i/Math.max(1,e.m.count|0)*TAU+e.t*Math.abs(e.m.speed)*(layer===0?3:-2),r=e.m.radius*(layer===0?1.5:.75);
          ctx.beginPath();ctx.ellipse(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r*.7,e.m.size*.9,e.m.size*.38,0,0,TAU);ctx.fill();
        }
        ctx.restore();
      }
    }
  }
  function drawStone(ctx,x,y,size,type) {
    ctx.save();ctx.fillStyle=G.U.TYPE_COLOR[type];ctx.strokeStyle='#fff0a0';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(x+size*.5,y);ctx.lineTo(x+size*.9,y+size*.5);ctx.lineTo(x+size*.5,y+size);ctx.lineTo(x+size*.1,y+size*.5);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.font='bold '+Math.round(size*.6)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText('Z',x+size/2,y+size*.54);ctx.restore();
  }
  function grantCharge(p,key){
    if(!hasStone(p))return false;
    const s=state(p);s.rewards||=new Set();if(s.rewards.has(key))return false;s.rewards.add(key);
    if(s.rewards.size>512)s.rewards.delete(s.rewards.values().next().value);
    if(p.remote){G.Coop.zAward?.(p,key);return true;}
    const before=s.charges;s.charges=Math.min(MAX_CHARGES,s.charges+1);
    if(s.charges>before)G.FX.dmgText(p.x,p.y-p.bodyH,'+1 Z','#fff3a1');return s.charges>before;
  }
  function grantTeamCharge(key){
    if(G.Coop.active&&!G.Coop.isHost)return false;
    let granted=false;
    // Include downed teammates: their charges remain available after revival.
    for(const p of G.Game?.everyone?.()||[])granted=grantCharge(p,key)||granted;
    return granted;
  }
  function onKill(e){
    if(G.Coop.active&&!G.Coop.isHost)return;
    if(e.boss){grantTeamCharge('boss:'+e.id);return;}
    const chance=e.elite?.05:(G.MonProgression?.captureChance(e)||.002);
    if(Math.random()<chance){
      if(G.Coop.active)grantTeamCharge('kill:'+e.id);
      else grantCharge(e.lastAttacker,'kill:'+e.id);
    }
  }
  let eventN=0;
  function eventReward(){if(G.Coop.active&&!G.Coop.isHost)return;const key='event:'+(++eventN);if(Math.random()<.8)grantTeamCharge(key);}
  function debugCharge(p){if(!G.Dev?.canUse()||!hasStone(p)||busy(p))return false;G.Game.debugMark();state(p).charges=MAX_CHARGES;state(p).phase='ready';state(p).cooldown=0;return true;}
  return { COOLDOWN,MAX_CHARGES,BULLET_TIME,KINDS,TYPES,state,hasStone,selecting,busy,dashing,immune,timeFactor,matches,eligible,
    power,CAPS,projectileDamage,grantCharge,grantTeamCharge,onKill,eventReward,
    owns,grant,equip,normalize,init,arm,choose,cancel,aim,landing,tick,sync,remoteCast,draw,drawGround,drawStone,debugCharge };
})();

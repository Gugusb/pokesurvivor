/* ============ combat.js — ejecución de movimientos y colisiones ============
 * All learned slots run in parallel; the selected slot uses full derived stats. Cada `kind` tiene aquí su
 * implementación. Todos los ataques dañan también los objetos destructibles
 * del escenario (rocas, cofres, hierba alta).
 *
 * Todo ocurre en el plano del suelo: (x, y) son pies / sombra.
 *
 * Cooperativo: cada ordenador ejecuta los ataques de SU jugador. Los de los
 * compañeros llegan por la red y se repiten como "fantasma" (ghostCast): se
 * ven igual, pero no hacen daño aquí (ya lo hizo su dueño).
 *
 * Lo que se queda en el mapa un rato (minas, meteoros que caen, torretas,
 * charcos del rastro) vive en `fields` y se actualiza/dibuja aquí.
 */
G.Combat = (() => {
  let ghost = false;
  let fields = [];
  let copyId=0;

  // ---------------- ejecutar el movimiento activo ----------------

  function tick(dt, pl, now) {
    if(G.MovePP)G.MovePP.tick(pl,dt);
    if (G.ZMoves) { const locked = G.ZMoves.busy(pl); G.ZMoves.tick(pl, dt); if (locked || G.ZMoves.busy(pl)) return; }
    if (pl.dead) return;
    if(G.SquadAssault&&!G.SquadAssault.canAttack(pl)){for(const m of pl.moves)m.t=Math.max(0,m.t-dt*rateFor(pl,m));return;}
    if (!G.Abilities.canCast(pl)) {
      for (const m of pl.moves) m.t = Math.max(0, m.t - dt * rateFor(pl,m));
      G.Projectiles.clearOrbs(pl); return;
    }
    const primary=pl.activeGroup();
    // Resolve the primary group first when sharing reserve PP or single-use effects.
    for(const m of [...primary,...pl.moves.filter(m=>!primary.includes(m))])tickMove(dt,pl,m,now);
  }

  const rateFor=(pl,m)=>(G.LeaderAbilities?.rate(pl,m)||1)*(G.TrainerTalents?.rate(pl)||1)*G.Abilities.cooldownRate(pl,m)/(G.SquadTraits?.cooldown(pl)||1)*(G.Mega?G.Mega.cooldownRate(pl,m):1)/(pl.agilityCooldownFor?.(m)||pl.agilityCooldown||1)/(G.Items?.cooldownFactor(pl)||1)/(G.Specialization?.stats(m).cooldown||1);
  function tickMove(dt, pl, m, now) {
    const cooldownRate = rateFor(pl,m);
    m.t -= dt * cooldownRate;
    if(m.kind==='beam'&&fields.some(f=>f.kind==='bondbeam'&&f.owner===pl&&f.source===m&&!f.gone))return;
    const wanted=!G.MoveControl||G.MoveControl.wants(pl,m);
    if(m.kind==='orbit'){
      let refill=false;
      if(!wanted&&!G.MoveControl.sustaining(pl,m)){for(const shot of G.Projectiles.all().filter(s=>s.orb&&s.owner===pl&&s.mid===m.id))G.Projectiles.remove(shot);m.t=Math.max(0,m.t);return;}
      // One PP sustains one cooldown cycle; no charge per frame or per orb hit.
      if(m.t<=0){
        if(G.MovePP&&!G.MovePP.consume(pl,m)){
          for(const shot of G.Projectiles.all().filter(s=>s.orb&&s.owner===pl&&s.mid===m.id))G.Projectiles.remove(shot);
          m.t=0;return;
        }
        m.t=Math.max(.05,m.cd*pl.cdMul)*G.Abilities.onCast(pl,m)*(G.SquadBonds?.sustain(pl,m)||1);
        m.typeCastId=G.TypeBonds?.cast(pl,m)||0;if(pl.dead)return;
        pl.cast(m);G.MoveControl?.cast(pl,m);G.Items?.onCast(pl,m);
        refill=true;extras(pl,m,m.t/cooldownRate);
      }
      orbit(pl,m,dt,now,false,refill);return;
    }
    if (m.t > 0||!wanted) return;
    // Los ataques que necesitan blanco esperan a tenerlo (no gastes animación al aire).
    const manual=G.Targeting?.manual(pl),preview=G.SquadBonds?.move(pl,G.Specialization?.move(pl,m)||m)||m,traitPreview=G.TypeBonds?.move(pl,preview)||preview,squadPreview=G.SquadTraits?.move(pl,traitPreview)||traitPreview,finalPreview=G.TrainerTalents?.move(pl,squadPreview)||squadPreview,leaderPreview=G.LeaderAbilities?.move(pl,finalPreview)||finalPreview,castReach=G.SquadAssault?.controls(pl)?leaderPreview.radius||reach(leaderPreview):reach(leaderPreview),target=manual&&m.kind==='chain'?G.Targeting.forward(pl,castReach):pl.target;
    if (needsTarget(m) && !(manual&&m.kind!=='chain') && !(target && G.U.dist(pl.x, pl.y, target.x, target.y) <= castReach+(G.SquadAssault?.controls(pl)&&m.kind==='melee'?target.r||0:0))) {
      m.t = 0.05;
      return;
    }
    if(G.MovePP&&!G.MovePP.consume(pl,m)){m.t=0;return;}
    m.t = Math.max(0.05, m.cd * pl.cdMul) * G.Abilities.onCast(pl, m);
    m.typeCastId=G.TypeBonds?.cast(pl,m)||0;if(pl.dead)return;
    G.MoveControl?.cast(pl,m);G.Items?.onCast(pl,m);
    // Snapshot this cast's real interval, including its one-time cooldown penalty.
    const castCooldown = m.t / cooldownRate;
    perform(pl,m,castCooldown);
    extras(pl,m,castCooldown);
    m.castAt = performance.now();
  }
  function perform(pl,m,cd,secondary=false){
    pl.cast(m);
    if(G.Coop.active)G.Coop.cast(pl,m,secondary?cd:0);
    run(pl,secondary?{...m,extraCast:true}:m,cd);
  }
  function extras(pl,m,cd){
    const q=G.Specialization?.stats(m);if(!q)return;
    if(q.double){const aim=pl.aim;pl.aim=aim+.12;perform(pl,m,cd,true);pl.aim=aim;}
    if(q.echo&&Math.random()<q.echo)fields.push({kind:'repeat',owner:pl,m:{...m},aim:pl.aim,t:0,wait:cd/2,cd});
  }

  function run(pl, m, castCooldown) {
    if(m.kind==='orbit'){fields.push({kind:'orbitcopy',owner:pl,m:{...m,orbitKey:m.id+':'+(++copyId)},ghost,t:0,life:Math.max(.05,castCooldown||m.cd)});return;}
    if(G.Specialization)m=G.Specialization.move(pl,m);
    if (G.Mega) G.Mega.particles(pl);
    if (G.Mega) m = G.Mega.move(pl, m);
    if(G.SquadBonds)m=G.SquadBonds.move(pl,m);
    if(G.TypeBonds)m=G.TypeBonds.move(pl,m);
    if(G.SquadTraits)m=G.SquadTraits.move(pl,m);
    m = G.Abilities.move(pl, m);m=G.TrainerTalents?.move(pl,m)||m;m=G.LeaderAbilities?.move(pl,m)||m;
    switch (m.kind) {
      case 'projectile': fireProjectiles(pl, m); break;
      case 'melee':      melee(pl, m); break;
      case 'beam':       beam(pl, m); break;
      case 'nova':       nova(pl, m); break;
      case 'aura':       aura(pl, m); break;
      case 'buff':       buff(pl, m); break;
      case 'boomerang':  boomerang(pl, m); break;
      case 'chain':      chain(pl, m); break;
      case 'mine':       mines(pl, m); break;
      case 'meteor':     meteors(pl, m); break;
      case 'turret':     turret(pl, m); break;
      case 'dash':       dash(pl, m, castCooldown); if(G.Specialization?.stats(m).shock){const r=120,col=(m.bondColor||G.U.TYPE_COLOR[m.type]);G.FX.ring(pl.x,pl.y,8,r,col,.35,3);if(!ghost)blast({owner:pl,m,ghost:false,x:pl.x,y:pl.y,dmg:m.dmg*(pl.attackFor?pl.attackFor(m):pl.atk),col},r,.2);} break;
      case 'trail':      trailPatch(pl, m); break;
      case 'cone':       cone(pl, m); break;
    }
  }

  const TARGETED = ['melee', 'beam', 'projectile', 'boomerang', 'chain', 'meteor', 'dash', 'cone'];
  function needsTarget(m) { return TARGETED.includes(m.kind); }
  function reach(m) {
    if (m.kind === 'melee') return m.radius + 30;
    if (m.kind === 'beam') return m.radius + 20;
    if (m.kind === 'boomerang') return m.radius + 40;
    if (m.kind === 'chain') return 280*(m.typeReachFactor||1);
    if (m.kind === 'meteor') return 340*(m.typeReachFactor||1)*(m.bondPlacement||1);
    if (m.kind === 'dash') return m.radius + 60;
    if (m.kind === 'cone') return m.speed * m.life + 30;
    return 520;
  }

  function payload(m) {
    return { burn: m.burn || 0, poison: m.poison || 0, slow: m.slow || 0, knock: m.knock || 0, mtype: m.type, moveKind: m.kind, moveId: m.id, damageClass:m.damageClass, evolved:!!m.evolved, phaseWalls:!!m.phaseWalls,leaderBounce:m.leaderBounce||0, specMove:m,bondPierceGrowth:m.bondPierceGrowth||0,bondDamageContributions:m.bondDamageContributions,visualScale:m.bondVisualScale,bondScale:m.bondScale||1,typeCastId:m.typeCastId||0 };
  }

  /** Tabla de tipos × clima para un ataque de tipo `type` contra `e`. */
  function typeK(type, e, pl,m) {const k=G.Abilities.outgoingType(pl,type,e.types),j=G.LeaderJohto?.typeFactor(pl,type,e,k)??k;return (G.LeaderHoenn?.typeFactor(pl,type,e,j,m)??j)*G.Weather.mult(type);}

  function counterTackle(pl, attacker) {
    if (G.ZMoves && G.ZMoves.busy(pl)) return;
    const m = G.Moves.instance('tackle', 1), aim = pl.aim;
    if (attacker) pl.aim = Math.atan2(attacker.y - pl.y, attacker.x - pl.x);
    try { pl.cast(m); if (G.Coop.active) G.Coop.cast(pl, m); run(pl, m); }
    finally { pl.aim = aim; }
  }

  function fireProjectiles(pl, m) {
    const col = (m.bondColor||G.U.TYPE_COLOR[m.type]);
    const vis = G.VFX.forMove(m);
    const n = Math.max(1, m.count | 0);
    const spread = m.spread || 0;
    for (let i = 0; i < n; i++) {
      const off = n === 1 ? 0 : (i / (n - 1) - 0.5) * spread * n;
      const a = pl.aim + off + G.U.rand(-0.03, 0.03);
      G.Projectiles.spawn(Object.assign({
        x: pl.x + Math.cos(a) * 3, y: pl.y + Math.sin(a) * 3,
        vx: Math.cos(a) * m.speed, vy: Math.sin(a) * m.speed,
        dmg: m.dmg * (pl.attackFor ? pl.attackFor(m) : pl.atk), r: m.size, life: m.life,
        pierce: m.pierce | 0, color: col, homing: m.homing || 0,
        hits: new Set(), vis, ghost, owner: pl
      }, payload(m)));
    }
    G.FX.spark(pl.x + Math.cos(pl.aim) * pl.r, pl.y - G.LIFT + Math.sin(pl.aim) * pl.r,
               col, Math.cos(pl.aim), Math.sin(pl.aim), 3);
  }

  function nova(pl, m) {
    const col = (m.bondColor||G.U.TYPE_COLOR[m.type]);
    const vis = G.VFX.forMove(m);
    const n = Math.max(3, m.count | 0);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.2832 + G.U.rand(-0.06, 0.06);
      G.Projectiles.spawn(Object.assign({
        x: pl.x + Math.cos(a) * 3, y: pl.y + Math.sin(a) * 3,
        vx: Math.cos(a) * m.speed, vy: Math.sin(a) * m.speed,
        dmg: m.dmg * (pl.attackFor ? pl.attackFor(m) : pl.atk), r: m.size, life: m.life,
        pierce: m.pierce | 0, color: col, homing: m.homing || 0,
        hits: new Set(), vis, ghost, owner: pl
      }, payload(m)));
    }
    G.FX.ring(pl.x, pl.y, pl.r, pl.r * 4, col, 0.3, 3);
  }

  function inArc(px, py, x, y, aim, half) {
    const a = Math.atan2(y - py, x - px);
    return Math.abs(((a - aim + Math.PI * 3) % 6.2832) - Math.PI) <= half;
  }

  function melee(pl, m) {
    const col = (m.bondColor||G.U.TYPE_COLOR[m.type]);
    const half = Math.min(m.arc, 6.2832) / 2;
    G.FX.slash(pl.x, pl.y - G.LIFT * 0.5, pl.aim, m.radius, m.arc, col, G.VFX.forMove(m));
    if (ghost) return;

    const near=G.EnemyMgr.queryCircle(pl.x,pl.y,m.radius).filter(e=>!e.dead);
    for (const e of near) {
      if (!inArc(pl.x, pl.y, e.x, e.y, pl.aim, half)) continue;
      hit(pl, e, m.dmg * (pl.attackFor ? pl.attackFor(m) : pl.atk), col, e.x - pl.x, e.y - pl.y, m.knock || 0, m);
    }
    for (const p of G.World.propsInCircle(pl.x, pl.y, m.radius)) {
      if (inArc(pl.x, pl.y, p.x, p.y, pl.aim, half)) G.World.damageProp(p, m.dmg * (pl.attackFor ? pl.attackFor(m) : pl.atk), col);
    }
  }

  function beam(pl, m,visualOnly=false) {
    if(m.bondSustain&&!m.bondPulse&&!ghost&&!visualOnly){
      const source=pl.moves.find(s=>s.id===m.id),target=pl.target;
      if(!source||!target||target.dead)return;
      fields.push({kind:'bondbeam',owner:pl,source,target,m:{...m},wait:.5});
      beam(pl,{...m,bondPulse:true,bondDamageKind:'beam',dmg:m.dmg*.5*m.bondScale});return;
    }
    const col = (m.bondColor||G.U.TYPE_COLOR[m.type]);
    const w = m.width;
    const ca = Math.cos(pl.aim), sa = Math.sin(pl.aim);

    // El rayo se corta en la primera pared.
    let len = m.radius;
    for (let d = 8; d < m.radius; d += 8) {
      if ((G.World.arenaContains&&!G.World.arenaContains(pl.x+ca*d,pl.y+sa*d,0))||(!m.phaseWalls&&G.World.isWall(pl.x + ca * d, pl.y + sa * d))) { len = d; break; }
    }
    G.FX.beam(pl.x, pl.y - G.LIFT, pl.aim, len, w, col, G.VFX.forMove(m));
    if (ghost||visualOnly) return;
    G.Camera.kick(0.08);

    const mx = pl.x + ca * len / 2, my = pl.y + sa * len / 2;
    const onBeam = (x, y, r) => {
      const px = x - pl.x, py = y - pl.y;
      const along = px * ca + py * sa;
      if (along < -r || along > len + r) return false;
      return Math.abs(-px * sa + py * ca) <= w / 2 + r;
    };
    let beamTargets=0;for (const e of G.EnemyMgr.queryCircle(mx, my, len / 2 + w).sort((a,b)=>G.U.dist2(pl.x,pl.y,a.x,a.y)-G.U.dist2(pl.x,pl.y,b.x,b.y))) {
      if (onBeam(e.x, e.y, e.r)) hit(pl, e, (1+Math.min(.4,beamTargets++*(m.leaderBeamRamp||0)))*m.dmg * (pl.attackFor ? pl.attackFor(m) : pl.atk), col, ca, sa, 0, m);
    }
    for (const p of G.World.propsInCircle(mx, my, len / 2 + w)) {
      if (onBeam(p.x, p.y, p.r)) G.World.damageProp(p, m.dmg * (pl.attackFor ? pl.attackFor(m) : pl.atk), col);
    }
  }

  function aura(pl, m) {
    const col = (m.bondColor||G.U.TYPE_COLOR[m.type]);
    G.FX.ring(pl.x, pl.y, m.radius * 0.5, m.radius, col, 0.28, 2);
    const vis = G.VFX.forMove(m);
    if (vis.aura) {
      for (let i = 0; i < 5; i++) {
        const a = Math.random() * 6.2832, r = m.radius * G.U.rand(0.45, 1);
        const x = pl.x + Math.cos(a) * r, y = pl.y + Math.sin(a) * r * 0.8 - G.LIFT * 0.5;
        // Hierba Lazo tira hacia ti; veneno y sombras suben; el resto gira.
        const v = vis.inward ? [-Math.cos(a) * r * 2.2, -Math.sin(a) * r * 1.8]
                : vis.rise ? [G.U.rand(-10, 10), -55]
                : [-Math.sin(a) * 70, Math.cos(a) * 55];
        G.FX.sp(vis.aura, vis.pal, x, y, { vx: v[0], vy: v[1], life: 0.42,
          spin: G.VFX.spins(vis.aura) ? G.U.rand(-6, 6) : 0 });
      }
    }
    if (ghost) return;
    let healed = 0;
    for (const e of G.EnemyMgr.queryCircle(pl.x, pl.y, m.radius)) {
      hit(pl, e, m.dmg * (pl.attackFor ? pl.attackFor(m) : pl.atk), col, e.x - pl.x, e.y - pl.y, 0, m);
      if (m.drain) healed += m.drain;
    }
    for (const p of G.World.propsInCircle(pl.x, pl.y, m.radius)) G.World.damageProp(p, m.dmg * (pl.attackFor ? pl.attackFor(m) : pl.atk), col);
    if (healed > 0) pl.heal(Math.min(healed, 6));
  }

  function buff(pl, m) {
    const squad=G.Squad?.active&&G.Squad.actors().includes(pl),targets=squad?G.Squad.buffTargets(pl):[pl];
    const col = (m.bondColor||G.U.TYPE_COLOR[m.type]);
    const vis = G.VFX.forMove(m);
    for(const target of targets){
      target.addBuff(m.stat,m.amount*(squad?.3:1)*(G.ExpeditionGrowth?.buffFactor(pl,m)||1),m.dur,m.stacks|0);
      G.FX.ring(target.x,target.y,target.r*2.4,target.r*1.1,col,.35,2.5);
      for (let i = 0; i < 3; i++) {
        G.FX.sp(vis.buff || 'arrow',vis.pal,target.x+G.U.rand(-target.r*1.4,target.r*1.4),target.y-G.U.rand(0,target.bodyH*.8),{vy:-70,life:.6});
      }
    }
    if(targets.length)G.Audio.sfx('hit',{kind:'buff',type:m.type});
  }

  // ---------------- familias nuevas (2026-10-10) ----------------

  /** Bumerán: sale hacia el enemigo, se para y vuelve a ti golpeando a la ida y a la vuelta. */
  function boomerang(pl, m) {
    const col = (m.bondColor||G.U.TYPE_COLOR[m.type]), vis = G.VFX.forMove(m);
    const n = Math.max(1, m.count | 0), spread = m.spread || 0.5;
    const out = m.radius / m.speed;                       // segundos de ida
    for (let i = 0; i < n; i++) {
      const a = pl.aim + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread * Math.min(n, 3));
      G.Projectiles.spawn(Object.assign({
        x: pl.x, y: pl.y, vx: Math.cos(a) * m.speed, vy: Math.sin(a) * m.speed,
        dmg: m.dmg * (pl.attackFor ? pl.attackFor(m) : pl.atk), r: m.size, life: out * 4 + 1.5, pierce: 999, color: col,
        hits: new Set(), vis, ghost, owner: pl, boom: out, bsp: m.speed * 1.1
      }, payload(m)));
    }
  }

  /** Cadena: golpea a un enemigo y salta a los siguientes más cercanos (cada salto, algo menos). */
  function chain(pl, m) {
    const col = (m.bondColor||G.U.TYPE_COLOR[m.type]), vis = G.VFX.forMove(m);
    let cur = G.Targeting&&(ghost||G.Targeting.manual(pl))?G.Targeting.forward(pl,reach(m)):pl.target && !pl.target.dead && pl.target.hurt ? pl.target : G.Projectiles.nearest(G.EnemyMgr.all(), pl.x, pl.y, reach(m));
    if (!cur) return;
    if(m.bondChain&&!ghost){
      const f={kind:'bondchain',owner:pl,m:{...m},target:cur,x:pl.x,y:pl.y-G.LIFT,k:1,done:new Set(),left:Math.max(1,m.count|0),wait:0};
      chainStep(f);if(f.left>0&&f.target){f.wait=.12;fields.push(f);}return;
    }
    let fx = pl.x, fy = pl.y - G.LIFT, k = 1;
    const done = new Set();
    const n = Math.max(1, m.count | 0);
    for (let i = 0; i < n && cur; i++) {
      done.add(cur.id);
      const tx = cur.x, ty = cur.y - cur.bodyH * 0.5;
      G.FX.beam(fx, fy, Math.atan2(ty - fy, tx - fx), Math.hypot(tx - fx, ty - fy), 10, col, vis);
      if (!ghost) {
        // Infortunio: más daño a quien ya sufre un estado.
        const hex = m.hex && (cur.burn > 0 || cur.poison > 0 || cur.slow > 0) ? m.hex : 1;
        hit(pl, cur, m.dmg * (pl.attackFor ? pl.attackFor(m) : pl.atk) * k * hex, col, tx - fx, ty - fy, 0, m);
      }
      k *= m.leaderChainRamp?1+m.leaderChainRamp:.85;k=Math.min(k,1.4);
      fx = tx; fy = ty;
      let best = null, bd = m.radius * m.radius;
      for (const e of G.EnemyMgr.queryCircle(cur.x, cur.y, m.radius)) {
        if (done.has(e.id)) continue;
        const d = G.U.dist2(cur.x, cur.y, e.x, e.y);
        if (d < bd) { bd = d; best = e; }
      }
      cur = best;
    }
    if (!ghost) G.Camera.kick(0.05);
  }
  function chainStep(f){
    const {owner:pl,m}=f;let cur=f.target;
    if(cur&&(cur.dead||f.done.has(cur.id)))cur=G.EnemyMgr.queryCircle(cur.x,cur.y,m.radius).filter(e=>!e.dead&&!f.done.has(e.id)).sort((a,b)=>G.U.dist2(cur.x,cur.y,a.x,a.y)-G.U.dist2(cur.x,cur.y,b.x,b.y))[0];
    if(!cur){f.left=0;return;}
    const x=cur.x,y=cur.y-cur.bodyH*.5,col=(m.bondColor||G.U.TYPE_COLOR[m.type]);f.done.add(cur.id);
    G.FX.beam(f.x,f.y,Math.atan2(y-f.y,x-f.x),Math.hypot(x-f.x,y-f.y),10,col,G.VFX.forMove(m));
    const hex=m.hex&&(cur.burn>0||cur.poison>0||cur.slow>0)?m.hex:1;
    hit(pl,cur,m.dmg*(pl.attackFor?pl.attackFor(m):pl.atk)*f.k*hex,col,x-f.x,y-f.y,0,m);
    if(!G.Abilities.suppressEffects(pl)){if(cur.boss)cur.applySlow(.5,Math.min(.25,.1*m.bondScale));else cur.freezeT=Math.max(cur.freezeT||0,Math.min(.25,.1*m.bondScale));}
    f.x=x;f.y=y;f.k*=m.leaderChainRamp?1+m.leaderChainRamp:.85;f.k=Math.min(f.k,1.4);f.left--;f.target=G.EnemyMgr.queryCircle(cur.x,cur.y,m.radius).filter(e=>!e.dead&&!f.done.has(e.id)).sort((a,b)=>G.U.dist2(cur.x,cur.y,a.x,a.y)-G.U.dist2(cur.x,cur.y,b.x,b.y))[0]||null;
  }

  /** Minas: se quedan en el suelo y estallan cuando un enemigo las pisa. */
  function mines(pl, m) {
    const col = (m.bondColor||G.U.TYPE_COLOR[m.type]), vis = G.VFX.forMove(m);
    const n = Math.max(1, m.count | 0);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.2832, d = n === 1 ? 0 : G.U.rand(18, 46);
      fields.push({ kind: 'mine', owner: pl, ghost, m, col, vis, x: pl.x + Math.cos(a) * d, y: pl.y + Math.sin(a) * d * 0.8,
                    t: 0, arm: 0.35, life: m.dur || 7,leaderUses:m.leaderMineUses||1, r: m.radius, dmg: m.dmg * (pl.attackFor ? pl.attackFor(m) : pl.atk) });
    }
    // Como mucho unas pocas por jugador: las más viejas se van.
    const mine = fields.filter(f => f.kind === 'mine' && f.owner === pl && f.m.id===m.id && !!f.m.extraCast===!!m.extraCast && !f.gone);
    for (const f of mine.slice(0, Math.max(0, mine.length - Math.min(G.EconomyConfig.classBonds.summon.maxPerMove,Math.floor((4+n*2)*(m.bondQuantity||1)))))) f.gone = true;
  }

  /** Meteoros: caen del cielo sobre enemigos cercanos (la sombra avisa dónde). */
  function meteors(pl, m) {
    const col = (m.bondColor||G.U.TYPE_COLOR[m.type]), vis = G.VFX.forMove(m);
    const n = Math.max(1, m.count | 0);
    const manual=G.Targeting?.manual(pl),front=e=>Math.cos(Math.atan2(e.y-pl.y,e.x-pl.x)-pl.aim)>=.5;
    const near = G.EnemyMgr.queryCircle(pl.x, pl.y, reach(m)).filter(e => !e.dead&&(!manual||front(e)));
    G.U.shuffle ? G.U.shuffle(near) : near.sort(() => Math.random() - 0.5);
    for (let i = 0; i < n; i++) {
      const e = near[i];
      const x = e ? e.x + G.U.rand(-8, 8)*(m.bondPlacement||1) : pl.x + (manual?Math.cos(pl.aim)*180:0)+G.U.rand(manual?-45:-140,manual?45:140)*(m.bondPlacement||1);
      const y = e ? e.y + G.U.rand(-6, 6)*(m.bondPlacement||1) : pl.y + (manual?Math.sin(pl.aim)*180:0)+G.U.rand(manual?-45:-110,manual?45:110)*(m.bondPlacement||1);
      fields.push({ kind: 'meteor', owner: pl, ghost, m, col, vis, x, y, t: -i * 0.09, fall: .5*(m.delay||1)*(m.bondArea?G.EconomyConfig.classBonds.area.windupMultiplier:1), baseR:m.radius, r: m.radius, dmg: m.dmg * (pl.attackFor ? pl.attackFor(m) : pl.atk) });
    }
  }

  /** Torreta: deja algo en el suelo que dispara solo un rato. */
  function turret(pl, m) {
    const col = (m.bondColor||G.U.TYPE_COLOR[m.type]), vis = G.VFX.forMove(m);
    const a = pl.aim + Math.PI + G.U.rand(-0.6, 0.6);
    fields.push({ kind: 'turret', owner: pl, ghost, m, col, vis, x: pl.x + Math.cos(a) * 26, y: pl.y + Math.sin(a) * 20,
                  t: 0, life: m.dur || 6, shotT: 0.3, dmg: m.dmg * (pl.attackFor ? pl.attackFor(m) : pl.atk) });
    const mine = fields.filter(f => f.kind === 'turret' && f.owner === pl && f.m.id===m.id && !!f.m.extraCast===!!m.extraCast && !f.gone);
    for (const f of mine.slice(0, Math.max(0, mine.length - Math.min(G.EconomyConfig.classBonds.summon.maxPerMove,Math.floor(Math.max(1,m.count|0)*(m.bondQuantity||1)))))) f.gone = true;
    G.FX.ring(pl.x, pl.y, 4, 30, col, 0.3, 2);
  }

  /** Embestida: cruzas como un rayo hacia el enemigo y golpeas a todo lo del camino. */
  function dash(pl, m, castCooldown) {
    const col = (m.bondColor||G.U.TYPE_COLOR[m.type]), vis = G.VFX.forMove(m);
    const ca = Math.cos(pl.aim), sa = Math.sin(pl.aim);
    const sx = pl.x, sy = pl.y;
    let len = 0;
    for (let d = 8; d <= m.radius; d += 8) {
      const x=sx+ca*d,y=sy+sa*d;
      if(G.World.arenaContains&&!G.World.arenaContains(x,y,pl.r))break;
      const free=G.World.isFree(x,y,pl.r*.8,true);
      if(!free&&!m.phaseWalls)break;
      if(free)len=d;
    }
    // Estela: varias copias del golpe a lo largo del recorrido.
    for (let d = 0; d <= len; d += 22) G.FX.sp(vis.proj || 'streak', vis.pal, sx + ca * d, sy + sa * d - G.LIFT * 0.6, { life: 0.22, angle: pl.aim });
    G.FX.slash(sx + ca * len, sy + sa * len - G.LIFT * 0.5, pl.aim, m.width||34, 2.2, col, vis);
    if (ghost) return;
    pl.x = sx + ca * len; pl.y = sy + sa * len;
    G.World.collide(pl);
    if (!G.Abilities.suppressEffects(pl)) {
      if (len > 0) pl.grantDashGuard(castCooldown);
      if (G.Mega && G.Mega.active(pl)) pl.megaDashGuard = 0.6;
    }
    G.LeaderJohto?.dashed(pl,m,sx,sy,castCooldown||m.cd);
    const w = m.width || 34;
    const mx = sx + ca * len / 2, my = sy + sa * len / 2;
    for (const e of G.EnemyMgr.queryCircle(mx, my, len / 2 + w)) {
      if (segDist2(sx, sy, pl.x, pl.y, e.x, e.y) <= (w / 2 + e.r) ** 2) hit(pl, e, m.dmg * (pl.attackFor ? pl.attackFor(m) : pl.atk), col, ca, sa, m.knock || 0, m);
    }
    for (const p of G.World.propsInCircle(mx, my, len / 2 + w)) {
      if (segDist2(sx, sy, pl.x, pl.y, p.x, p.y) <= (w / 2 + p.r) ** 2) G.World.damageProp(p, m.dmg * (pl.attackFor ? pl.attackFor(m) : pl.atk), col);
    }
    G.Camera.kick(0.12);
  }

  /** Rastro: vas dejando charcos que dañan a lo que pasa por encima. */
  function trailPatch(pl, m) {
    const col = (m.bondColor||G.U.TYPE_COLOR[m.type]), vis = G.VFX.forMove(m);
    // Parado no deja uno nuevo encima del anterior (sólo de vez en cuando).
    const last = pl.lastPatch;
    if (!m.extraCast && last && G.U.dist2(last.x, last.y, pl.x, pl.y) < (m.radius * 0.9) ** 2 && last.t < 1) return;
    let x=pl.x,y=pl.y;const windup=m.bondArea?G.EconomyConfig.classBonds.area.windupSeconds:0;
    if(m.bondArea){
      const c=G.EconomyConfig.classBonds.area,full=m.radius*c.maxRadiusMultiplier,max=Math.max(c.trailPlacementBase,full)*(m.bondPlacement||1),min=Math.min(max*.9,full*c.trailMinDistanceMultiplier);
      let placed=false;for(let i=0;i<c.placementAttempts;i++){const a=Math.random()*Math.PI*2,d=Math.sqrt(G.U.rand(min*min,max*max)),tx=pl.x+Math.cos(a)*d,ty=pl.y+Math.sin(a)*d;
        if(G.World.isFree(tx,ty,1,true)){x=tx;y=ty;placed=true;break;}
      }
      if(!placed)return;
    }
    const f = { kind: 'patch', owner: pl, ghost, m, col, vis, x, y, t: 0, windup, life: (m.dur || 3)+windup, baseR:m.radius, r: m.radius,
                tick: 0, dmg: m.dmg * (pl.attackFor ? pl.attackFor(m) : pl.atk) };
    fields.push(f);
    if(!m.extraCast)pl.lastPatch = f;
    const mine = fields.filter(o => o.kind === 'patch' && o.owner === pl && o.m.id===m.id && !!o.m.extraCast===!!m.extraCast && !o.gone);
    for (const o of mine.slice(0, Math.max(0, mine.length - 18))) o.gone = true;
  }

  /** Abanico corto: muchos disparos rápidos que no llegan lejos (aliento, chorro...). */
  function cone(pl, m) {
    const col = (m.bondColor||G.U.TYPE_COLOR[m.type]), vis = G.VFX.forMove(m);
    const n = Math.max(2, m.count | 0), arc = m.arc || 0.9;
    for (let i = 0; i < n; i++) {
      const a = pl.aim + (i / (n - 1) - 0.5) * arc + G.U.rand(-0.05, 0.05);
      const sp = m.speed * G.U.rand(0.85, 1.1);
      G.Projectiles.spawn(Object.assign({
        x: pl.x + Math.cos(a) * 4, y: pl.y + Math.sin(a) * 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        dmg: m.dmg * (pl.attackFor ? pl.attackFor(m) : pl.atk), r: m.size, life: m.life * G.U.rand(0.85, 1.05), pierce: m.pierce | 0, color: col,
        hits: new Set(), vis, ghost, owner: pl
      }, payload(m)));
    }
    G.FX.spark(pl.x + Math.cos(pl.aim) * pl.r, pl.y - G.LIFT + Math.sin(pl.aim) * pl.r, col, Math.cos(pl.aim), Math.sin(pl.aim), 5);
  }

  /** Daño de un campo (mina, meteoro, charco) a todo lo que hay en su círculo. */
  function blast(f, r, k = 1) {
    if (f.ghost) return;
    const pl = f.owner, m = f.m;
    for (const e of G.EnemyMgr.queryCircle(f.x, f.y, r)) hit(pl, e, f.dmg * k, f.col, e.x - f.x, e.y - f.y, m.knock || 0, m);
    for (const p of G.World.propsInCircle(f.x, f.y, r)) G.World.damageProp(p, f.dmg * k, f.col);
  }

  function updateFields(dt) {
    for (let i = fields.length - 1; i >= 0; i--) {
      const f = fields[i];
      if(f.kind==='bondbeam'){
        const {owner:pl,source,target,m}=f;
        if(f.gone||pl.dead||!G.Squad?.deployed().includes(pl)||!pl.moves.includes(source)||G.SquadBonds?.stats(pl,source).tier!==7||!G.Abilities.canCast(pl)||G.ZMoves?.busy(pl)||target.dead||G.U.dist2(pl.x,pl.y,target.x,target.y)>(m.radius+target.r)**2){fields.splice(i,1);continue;}
        const aim=pl.aim;pl.aim=Math.atan2(target.y-pl.y,target.x-pl.x);
        let blocked=false;for(let d=8;d<Math.hypot(target.x-pl.x,target.y-pl.y);d+=8)if((G.World.arenaContains&&!G.World.arenaContains(pl.x+Math.cos(pl.aim)*d,pl.y+Math.sin(pl.aim)*d,0))||(!m.phaseWalls&&G.World.isWall(pl.x+Math.cos(pl.aim)*d,pl.y+Math.sin(pl.aim)*d))){blocked=true;break;}
        if(blocked){pl.aim=aim;fields.splice(i,1);continue;}
        f.visual=(f.visual||0)-dt;if(f.visual<=0){beam(pl,{...m,bondPulse:true},true);f.visual=.1;}
        f.wait-=dt;
        while(f.wait<=0){
          if(!G.MovePP.spend(pl,source)){f.gone=true;break;}
          f.wait+=.5;beam(pl,{...m,bondPulse:true,dmg:m.dmg*.5*m.bondScale});
          if(target.dead){f.gone=true;break;}
        }
        pl.aim=aim;if(f.gone)fields.splice(i,1);continue;
      }
      if(f.kind==='bondchain'){
        if(f.owner.dead||!G.Squad?.deployed().includes(f.owner)){fields.splice(i,1);continue;}
        f.wait-=dt;while(f.wait<=0&&f.left>0&&f.target){chainStep(f);f.wait+=.12;}
        if(f.left<=0||!f.target)fields.splice(i,1);continue;
      }
      if(f.kind==='repeat'){
        if(f.owner.dead){fields.splice(i,1);continue;}
        if(G.ZMoves?.busy(f.owner))continue;
        f.t+=dt;if(f.t>=f.wait){fields.splice(i,1);const aim=f.owner.aim;f.owner.aim=f.aim;perform(f.owner,f.m,f.cd,true);f.owner.aim=aim;}continue;
      }
      f.t += dt;
      if(f.kind==='orbitcopy'){
        if(f.owner.dead||f.t>=f.life||G.ZMoves?.busy(f.owner)){for(const shot of G.Projectiles.all().filter(p=>p.orb&&p.owner===f.owner&&p.mid===f.m.orbitKey))G.Projectiles.remove(shot);fields.splice(i,1);continue;}
        orbit(f.owner,f.m,dt,f.t,f.ghost,!f.started);f.started=true;continue;
      }
      if (f.gone || !f.owner || (f.life && f.t >= f.life && f.kind !== 'mine')) { fields.splice(i, 1); continue; }
      if(f.m.bondArea){const t=f.kind==='meteor'?f.t/f.fall:(f.t-(f.windup||0))/(f.life-(f.windup||0));f.r=f.baseR*(1+(G.EconomyConfig.classBonds.area.maxRadiusMultiplier-1)*G.U.clamp(t,0,1));if(f.kind==='meteor')f.visualScale=f.r/f.baseR;}
      if (f.kind === 'mine') {
        const armed = f.t >= f.arm;
        const trig = armed && G.EnemyMgr.queryCircle(f.x, f.y, 14).length > 0;
        if (trig || f.t >= f.life) {
          G.FX.ring(f.x, f.y, 4, f.r, f.col, 0.3, 4);
          G.FX.burst(f.x, f.y - 6, f.col, 10, 150);
          if (G.Camera.sees(f.x, f.y, 40)) G.Audio.sfx('hit',{kind:f.m.kind,type:f.m.type});
          if(f.m.leaderParasite&&trig){for(const e of G.EnemyMgr.queryCircle(f.x,f.y,f.r))G.LeaderAbilities?.hit(f.owner,e,{...f.m,kind:'mine'},1,false,false);}else blast(f, f.r, trig ? 1 : 0.5);
          if(trig&&f.leaderUses>1){f.leaderUses--;f.arm=f.t+1;}else fields.splice(i, 1);
        }
      } else if (f.kind === 'meteor') {
        if (f.t >= f.fall) {
          G.FX.ring(f.x, f.y, 4, f.r, f.col, 0.35, 4);
          G.FX.burst(f.x, f.y - 6, f.col, 12, 170);
          if (G.Camera.sees(f.x, f.y, 40)) { G.Audio.sfx('hit',{kind:f.m.kind,type:f.m.type}); G.Camera.kick(0.12); }
          blast(f, f.r);
          fields.splice(i, 1);
        }
      } else if (f.kind === 'turret') {
        f.shotT -= dt;
        if (f.shotT <= 0) {
          const m = f.m;
          const targets=G.EnemyMgr.queryCircle(f.x,f.y,m.range||300).filter(e=>!e.dead).sort((a,b)=>G.U.dist2(f.x,f.y,a.x,a.y)-G.U.dist2(f.x,f.y,b.x,b.y)).slice(0,m.bondTargets||1);
          f.shotT=targets.length?(m.rate||.6):.15;
          for(const tg of targets){
            const a=Math.atan2(tg.y-f.y,tg.x-f.x);
            G.Projectiles.spawn(Object.assign({x:f.x,y:f.y,vx:Math.cos(a)*(m.speed||300),vy:Math.sin(a)*(m.speed||300),dmg:f.dmg,r:m.size||6,life:1.4,pierce:m.pierce|0,color:f.col,hits:new Set(),vis:f.vis,ghost:f.ghost,owner:f.owner},payload(m)));f.kick=.12;
          }
        }
        if (f.kick > 0) f.kick -= dt;
      } else if (f.kind === 'patch') {
        if(f.t<(f.windup||0))continue;
        f.tick -= dt;
        if (f.tick <= 0) { f.tick = 0.5; blast(f, f.r); }
        if (f.vis.aura && Math.random() < dt * 3 && G.Camera.sees(f.x, f.y, 20)) {
          G.FX.sp(f.vis.aura, f.vis.pal, f.x + G.U.rand(-f.r, f.r) * 0.6, f.y - 4, { vy: -40, life: 0.4 });
        }
      }
    }
  }

  /** Lo de los campos que va en el suelo (debajo de los Pokémon). */
  function drawGroundFields(ctx) {
    const now = performance.now() / 1000;
    for (const f of fields) {
      if(['repeat','orbitcopy','bondbeam','bondchain'].includes(f.kind))continue;
      if (!G.Camera.sees(f.x, f.y, 60)) continue;
      ctx.save();
      if (f.kind === 'patch') {
        const a = Math.min(1, (f.life - f.t) * 2, f.t * 6);
        ctx.globalAlpha = 0.32 * a;
        ctx.fillStyle = f.col;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, f.r * 0.62, 0, 0, 6.2832); ctx.fill();
        ctx.globalAlpha = 0.5 * a;
        ctx.strokeStyle = f.col; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * 0.8, f.r * 0.5, 0, 0, 6.2832); ctx.stroke();
      } else if (f.kind === 'mine') {
        const armed = f.t >= f.arm, blink = armed && Math.sin(now * 8 + f.x) > 0.3;
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = f.col;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * 0.45, f.r * 0.28, 0, 0, 6.2832); ctx.fill();
        ctx.globalAlpha = 1;
        G.VFX.draw(ctx, f.vis.proj, f.vis.pal, f.x, f.y - 4, { scale: 1, alpha: blink ? 1 : 0.75, frame: 0 });
      } else if (f.kind === 'meteor') {
        G.FX.drawMeteorShadow(ctx,f);
      } else if (f.kind === 'turret') {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(f.x, f.y, 11, 4.5, 0, 0, 6.2832); ctx.fill();
      }
      ctx.restore();
    }
  }

  /** Lo de los campos que va por encima (meteoros cayendo, torretas). */
  function drawAirFields(ctx) {
    const now = performance.now() / 1000;
    for (const f of fields) {
      if(['repeat','orbitcopy','bondbeam','bondchain'].includes(f.kind))continue;
      if (!G.Camera.sees(f.x, f.y, 200)) continue;
      if (f.kind === 'meteor' && f.t > 0) {
        G.FX.drawMeteor(ctx,f);
      } else if (f.kind === 'turret') {
        const fade = Math.min(1, (f.life - f.t) * 2, f.t * 5);
        const bob = Math.sin(now * 4 + f.x) * 2 - (f.kick > 0 ? 2 : 0);
        G.VFX.draw(ctx, f.vis.proj, f.vis.pal, f.x, f.y - 16 + bob, { scale: 1.5, alpha: fade, frame: Math.floor(now * 8) });
      }
    }
  }

  function clearFields(owner) { fields = owner ? fields.filter(f => f.owner !== owner) : []; }

  function orbit(pl, m, dt, now, isGhost = false, refill = false) {
    const rehit=m.remoteRehit||Math.max(.12,m.cd)*pl.cdMul/rateFor(pl,m);
    if(G.Specialization)m=G.Specialization.move(pl,m);
    if (G.Mega) m = G.Mega.move(pl, m);
    if(G.SquadBonds)m=G.SquadBonds.move(pl,m);
    if(G.TypeBonds)m=G.TypeBonds.move(pl,m);
    if(G.SquadTraits)m=G.SquadTraits.move(pl,m);
    m = G.Abilities.move(pl, m);m=G.TrainerTalents?.move(pl,m)||m;m=G.LeaderAbilities?.move(pl,m)||m;
    const col = (m.bondColor||G.U.TYPE_COLOR[m.type]);
    const want=Math.max(1,m.count|0),mid=m.orbitKey||m.id,conf=G.EconomyConfig.classBonds.orbit;
    const mine=p=>p.orb&&p.owner===pl&&p.mid===mid;
    let orbs=G.Projectiles.all().filter(mine);
    // Tier six replenishes a complete ring only on a successful cooldown/PP cast.
    // Detached shots belong to prior casts and never occupy replenishment slots.
    if(m.bondLaunch&&refill){for(const p of orbs)G.Projectiles.remove(p);orbs=[];}
    if(!m.bondLaunch||refill){
      const relayout=orbs.length!==want,anchor=m.orbitKey&&G.Projectiles.all().find(p=>p.orb&&p.owner===pl&&p.mid===m.id);
      const base=orbs[0]?.oa??(anchor?anchor.oa+.12:now*m.speed);
      for(const p of orbs.slice(want))G.Projectiles.remove(p);
      for(let i=orbs.length;i<want;i++)G.Projectiles.spawnOrb({owner:pl,ghost:isGhost,mid,orbitSlot:i,x:pl.x,y:pl.y,r:m.size,color:col,vis:G.VFX.forMove(m),dmg:m.dmg*(pl.attackFor?pl.attackFor(m):pl.atk),oa:base+i/want*Math.PI*2,orad:m.radius,ospeed:m.speed,rehit,...payload(m)});
      if(relayout)G.Projectiles.all().filter(mine).forEach((p,i)=>{p.oa=base+i/want*Math.PI*2;p.x=pl.x+Math.cos(p.oa)*m.radius;p.y=pl.y+Math.sin(p.oa)*m.radius*.7;});
    }
    const search=m.radius*conf.launchRangeMultiplier;
    const launchTargets=m.bondLaunch&&!isGhost?G.EnemyMgr.all().filter(e=>!e.dead&&G.U.dist2(pl.x,pl.y,e.x,e.y)<=search*search):[];
    for(const p of G.Projectiles.all().filter(mine)){
      Object.assign(p,payload(m));p.dmg=m.dmg*(pl.attackFor?pl.attackFor(m):pl.atk);p.orad=m.radius;p.ospeed=m.speed;p.rehit=rehit;p.r=m.size;p.color=col;p.vis=G.VFX.forMove(m);
      if(m.bondLaunch&&!isGhost){
        const target=G.Projectiles.nearest(launchTargets,p.x,p.y,Infinity);
        if(target){const a=Math.atan2(target.y-p.y,target.x-p.x),tangent=p.oa+Math.sign(p.ospeed||1)*Math.PI/2,offset=Math.atan2(Math.sin(tangent-a),Math.cos(tangent-a));Object.assign(p,{orb:false,bondOrbitShot:true,curveAim:a,curveOffset:offset,curveSeconds:conf.curveSeconds,curveSpeed:conf.launchSpeed,ignoreTerrain:true,homing:0,vx:Math.cos(a)*conf.launchSpeed,vy:Math.sin(a)*conf.launchSpeed,t:0,life:conf.flightSeconds,pierce:conf.launchPierce,hits:new Set(),phits:new Set(),dmg:p.dmg*conf.launchDamage,bondDamageContributions:[...(p.bondDamageContributions||[]),['orbit',conf.launchDamage]]});}
      }
    }

    // Animación de concentración de vez en cuando, para que se note vivo.
    if(isGhost){
      pl.orbCastT = (pl.orbCastT || 0) - dt;
      if (pl.orbCastT <= 0) { pl.orbCastT = 1.6; pl.cast({ ...m, cd: 1.6 }); }
    }
  }

  /** Repite el ataque de un compañero sólo para verlo (sin daño). */
  function ghostCast(pl, id, lvl, aim, evolved, orbitLife=0) {
    const def = G.Moves.BY_ID[id];
    if (!def || def.kind === 'orbit'&&!orbitLife) return;
    const m = G.Moves.instance(id, lvl);
    if (evolved) G.Moves.evolve(m);
    m.specializations=G.Specialization?.ids(G.Specialization.find(pl,id)).slice()||[];
    m.extraCast=orbitLife>0;
    pl.aim = aim;
    ghost = true;
    try {
      pl.cast(m);
      run(pl, m,orbitLife);
    } finally { ghost = false; }
  }

  /** Orbes de un compañero que tiene activo un movimiento de órbita (sólo visual). */
  function ghostOrbit(pl, dt, now) {
    if (G.ZMoves && G.ZMoves.busy(pl)) { G.Projectiles.clearOrbs(pl); return; }
    const list=pl.remoteOrbits??(pl.activeMove()?.kind==='orbit'?[pl.activeMove()]:[]),alive=pl.dead?[]:list;
    const ids=new Set(alive.map(m=>m.id));
    for(const shot of G.Projectiles.all().filter(p=>p.orb&&p.owner===pl&&!String(p.mid).includes(':')&&!ids.has(p.mid)))G.Projectiles.remove(shot);
    for(const m of alive)orbit(pl,{...m,specializations:G.Specialization?.ids(G.Specialization.find(pl,m.id))||[]},dt,now,true);
  }

  // Golpe crítico (Mejoras → Golpe Crítico): x1,5 de daño, número naranja y grande.
  const isCrit = (pl,m,e) => {const chance=Math.min(1,(pl.critChance||0)+(G.LeaderAbilities?.crit(pl,m,e)||0)+(G.ExpeditionGrowth?.crit(pl)||0)+(G.SquadTraits?.crit(pl)||0)+(G.TrainerTalents?.crit(pl)||0)+(G.Items?.critBonus(pl)||0)+(G.Specialization?.stats(m).crit||0));return !ghost&&chance>0&&Math.random()<chance;};
  const critMul=(pl,m,e)=>G.Abilities.critMultiplier(pl)+(G.LeaderAbilities?.critMultiplier(pl,m)||0)+(G.ExpeditionGrowth?.critDamage(pl)||0)+(G.Items?.critDamage(pl)||0)+(G.Specialization?.stats(m).critDamage||0)+(e?G.TypeBonds?.critBonus(pl,e)||0:0);
  function hit(pl, e, dmg, col, dx, dy, knock, m) {
    const k = typeK(m.type, e, pl,m);
    const crit = m.zCrit ||G.TypeBonds?.forceCrit(pl,e)|| isCrit(pl,m,e);
    dmg *= k * (crit ? critMul(pl,m,e) : 1);
    const dealt = e.hurt(dmg, col, dx, dy, knock, crit ? 'crit' : G.Types.label(G.Abilities.outgoingType(pl, m.type, e.types)), ghost ? null : pl, {...m,leaderCrit:crit,typeBondCritApplied:true}) || 0;
    if (!ghost) pl.onDealt(dealt);
    pl.dmgDealt += dealt;
    if (m.burn) e.applyBurn(m.burn, pl,!!m.leaderGenerated);
    if (m.poison) e.applyPoison(m.poison, pl,!!m.leaderGenerated);
    if (m.slow) e.applySlow(m.slow, m.zMove ? 2 : 1.2);if(m.leaderStun){G.LeaderAbilities?._z.stun(e,m.leaderStun);}if(m.johtoExtendStun)G.LeaderJohto?.extendStun(e,m.johtoExtendStun);if(m.johtoSmash)e.shield=0;
    if(!ghost)G.SquadBonds?.afterHit(pl,e,m,dealt);
  }

  // ---------------- colisiones ----------------

  /** Distancia² del punto (cx, cy) al segmento (ax, ay)-(bx, by). */
  function segDist2(ax, ay, bx, by, cx, cy) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let t = l2 ? ((cx - ax) * dx + (cy - ay) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = ax + dx * t - cx, qy = ay + dy * t - cy;
    return qx * qx + qy * qy;
  }

  // Earliest swept-circle contact, so zero-pierce orbit shots hit the first body on their path.
  function contactTime(sx,sy,x,y,e,r){
    const dx=x-sx,dy=y-sy,fx=sx-e.x,fy=sy-e.y,rr=r+e.r,c=fx*fx+fy*fy-rr*rr;
    if(c<=0)return 0;const a=dx*dx+dy*dy;if(!a)return Infinity;
    const b=fx*dx+fy*dy,d=b*b-a*c;if(d<0)return Infinity;
    const t=(-b-Math.sqrt(d))/a;return t>=0&&t<=1?t:Infinity;
  }

  function resolve(dt, pl, now) {
    const projectiles = G.Projectiles.all();

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      if(![p.x,p.y,p.r,p.dmg].every(Number.isFinite)||p.r<=0){G.Projectiles.remove(p);continue;}


      // --- disparos enemigos: paredes y objetos sólidos dan cobertura ---
      if (!p.friendly) {
        if (G.World.projectileBlock(p.x, p.y, p.r)) {
          G.FX.burst(p.x, p.y - G.LIFT, p.color, 5, 70);
          G.Projectiles.remove(p);
          continue;
        }
        const victim=(G.Squad?.active?G.Squad.actors():[pl]).find(o=>!o.dead&&G.U.dist2(p.x,p.y,o.x,o.y)<(p.r+o.r)**2);
        if (victim) {
          victim.hurt(p.dmg, p.mtype, false, { kind: 'ranged', enemy: p.sourceId && G.EnemyMgr.get(p.sourceId) });
          G.FX.burst(p.x, p.y - G.LIFT, p.color, 7, 110);
          G.Projectiles.remove(p);
        }
        continue;
      }

      // --- disparos de jugadores ---
      // Orbes de un compañero: sólo se ven.
      if (p.ghost) continue;
      if(p.phaseWalls&&!p.ignoreTerrain&&G.World.arenaContains&&!G.World.arenaContains(p.x,p.y,p.r)){G.Projectiles.remove(p);continue;}
      if (!p.orb && !p.zMove && !p.phaseWalls && !p.ignoreTerrain) {
        const block = G.World.projectileBlock(p.x, p.y, p.r);
        if (block === 'wall' || (block && !block.destructible)) {
          if(p.leaderBounce>0){p.leaderBounce--;p.leaderBounced=true;const bx=G.World.projectileBlock(p.px??p.x,p.y,p.r);if(bx)p.vy*=-1;else p.vx*=-1;p.x=p.px??p.x;p.y=p.py??p.y;const k=p.leaderBouncedOnce?1:1.5;p.vx*=k;p.vy*=k;p.leaderBouncedOnce=true;continue;}
          G.FX.burst(p.x, p.y - G.LIFT, p.color, 5, 80);
          G.Projectiles.remove(p);
          continue;
        }
      }

      // Objetos del escenario (rocas, cofres, hierba).
      let consumed = false;
      for (const prop of p.ignoreTerrain?[]:G.World.propsInCircle(p.x, p.y, p.r)) {
        if (p.orb) {
          const k = 'p' + prop.id, last = p.hitLog.get(k) || -99;
          if (now - last < p.rehit) continue;
          p.hitLog.set(k, now);
          G.World.damageProp(prop, p.dmg, p.color);
          continue;
        }
        if (p.phits.has(prop.id)) continue;
        p.phits.add(prop.id);
        if (!p.ghost) G.World.damageProp(prop, p.dmg, p.color);
        // La hierba no frena; lo sólido sí gasta perforación.
        if (prop.solid && !p.zMove && !p.phaseWalls) {
          if (p.pierce > 0) {G.SquadBonds?.onPierce(p);p.pierce--;}
          else { consumed = true; break; }
        }
      }
      if (consumed) {
        G.FX.burst(p.x, p.y - G.LIFT, p.color, 5, 80);
        G.Projectiles.remove(p);
        continue;
      }

      // Enemigos. Colisión BARRIDA: se comprueba todo el tramo recorrido en este
      // fotograma, no sólo el punto final. Un Impactrueno avanza 8 unidades por
      // fotograma: sin esto atravesaba a los enemigos pegados al jugador, que
      // eran inmunes a todos los movimientos de proyectil.
      const sx = p.orb || p.px == null ? p.x : p.px, sy = p.orb || p.py == null ? p.y : p.py;
      const half = Math.hypot(p.x - sx, p.y - sy) / 2;
      const candidates=G.EnemyMgr.queryCircle((sx+p.x)/2,(sy+p.y)/2,half+p.r);
      if(p.bondOrbitShot)candidates.sort((a,b)=>contactTime(sx,sy,p.x,p.y,a,p.r)-contactTime(sx,sy,p.x,p.y,b,p.r));
      for (const e of candidates) {
        if (segDist2(sx, sy, p.x, p.y, e.x, e.y) > (p.r + e.r) * (p.r + e.r)) continue;
        if (p.orb) {
          const last = p.hitLog.get(e.id) || -99;
          if (now - last < p.rehit) continue;
          p.hitLog.set(e.id, now);
          // Las órbitas duran toda la partida: se olvidan los golpes viejos.
          if (p.hitLog.size > 300) for (const [k, t] of p.hitLog) if (now - t > p.rehit) p.hitLog.delete(k);
        } else {
          if (p.hits.has(e.id)) continue;
          p.hits.add(e.id);
        }

        // Disparo fantasma de un compañero: choca y se ve, pero no daña.
        if (p.ghost) {
          G.FX.sp('impact', p.vis ? p.vis.pal : 'normal', e.x, e.y - e.bodyH * 0.5, { life: 0.12, scale: 1 });
          if (p.pierce > 0) { p.pierce--; continue; }
          G.FX.burst(p.x, p.y - G.LIFT, p.color, 5, 80);
          G.Projectiles.remove(p);
          break;
        }

        const owner=p.owner||pl;
        const raw = G.ZMoves ? G.ZMoves.projectileDamage(p,e) : p.dmg;
        if(p.bondOrbitShot)p.pierce=Math.max(0,G.EconomyConfig.classBonds.orbit.launchPierce-(p.hits.size-1));
        if(raw<=0){if(p.bondOrbitShot&&p.pierce===0){G.Projectiles.remove(p);break;}continue;}
        const crit=p.specMove?.zCrit||p.specMove?.hoennBurnCrit&&e.burn>0||p.specMove?.hoennPoisonCrit&&e.poison>0||p.specMove?.johtoCritOnStun&&e.classStunT>0||p.back&&p.specMove?.leaderReturnCrit||G.TypeBonds?.forceCrit(owner,e)||isCrit(owner,p.specMove,e);
        const k = (p.back?(p.specMove?.leaderReturn||1):1) * (p.mtype ? typeK(p.mtype, e, owner,p.specMove) : 1) * (crit ? critMul(owner,p.specMove,e) : 1);
        const dealt = e.hurt(raw * k, p.color, p.vx || (e.x - owner.x), p.vy || (e.y - owner.y), p.knock,
               crit ? 'crit' : p.mtype ? G.Types.label(G.Abilities.outgoingType(owner, p.mtype, e.types)) : null, owner, {leaderGenerated:!!p.specMove?.leaderGenerated,leaderCrit:crit,leaderReturning:!!p.back,leaderBounced:!!p.leaderBounced, id: p.moveId, type: p.mtype, kind: p.moveKind || (p.orb ? 'orbit' : 'projectile'), damageClass:p.damageClass, evolved:!!p.evolved,typeCastId:p.typeCastId||0,johtoBaton:!!p.specMove?.johtoBaton,leaderTrue:!!p.specMove?.leaderTrue,hoennZ:!!p.specMove?.hoennZ,hoennExecute:p.specMove?.hoennExecute,hoennShieldCut:p.specMove?.hoennShieldCut,hoennSoften:p.specMove?.hoennSoften,hoennSpdefZero:p.specMove?.hoennSpdefZero,hoennTeamAttack:p.specMove?.hoennTeamAttack,hoennPen:p.specMove?.hoennPen,typeBondSecondary:!!p.typeBondSecondary,noDragonCount:!!p.noDragonCount,typeBondCritApplied:true,bondDamageContributions:p.bondDamageContributions,bondDamageKind:p.bondDamageKind }) || 0;
        if (Math.random() < 0.5) G.FX.sp('impact', p.vis ? p.vis.pal : 'normal', e.x, e.y - e.bodyH * 0.5, { life: 0.12, scale: 1 });
        owner.dmgDealt += dealt;
        owner.onDealt(dealt);
        if (p.burn) e.applyBurn(p.burn, owner,!!p.specMove?.leaderGenerated);
        if (p.poison) e.applyPoison(p.poison, owner,!!p.specMove?.leaderGenerated);
        if (p.slow) e.applySlow(p.slow);if(p.specMove?.leaderStun)G.LeaderAbilities?._z.stun(e,p.specMove.leaderStun);if(p.specMove?.johtoExtendStun)G.LeaderJohto?.extendStun(e,p.specMove.johtoExtendStun);if(p.specMove?.johtoSmash)e.shield=0;
        G.SquadBonds?.afterHit(owner,e,p.specMove||{kind:p.moveKind},dealt);if(p.back&&p.specMove?.leaderReturnPull&&!e.boss){const dx=owner.x-e.x,dy=owner.y-e.y,d=Math.hypot(dx,dy)||1;e.kx+=dx/d*100;e.ky+=dy/d*100;}

        if (!p.orb) {
          if (p.pierce > 0) { G.SquadBonds?.onPierce(p);p.pierce--; }
          else {
            G.FX.burst(p.x, p.y - G.LIFT, p.color, 5, 80);
            G.Projectiles.remove(p);
            break;
          }
        }
      }
    }

    // --- contacto enemigo <-> jugador ---
    const bodies=G.Squad?.active?G.Squad.actors():[pl];
    for(const body of bodies){
    const pl=body;
    if (pl.dead) continue;
    for (const e of G.EnemyMgr.queryCircle(pl.x, pl.y, pl.r + 40)) {
      if (G.U.dist2(e.x, e.y, pl.x, pl.y) > (e.r + pl.r) * (e.r + pl.r)) continue;
      if (e.touchCd > 0 || e.freezeT>0 || e.classStunT>0 || e.behavior === 'thief') continue;
      e.touchCd = 0.55;
      G.TypeBonds?.contact(pl,e);if(e.dead)continue;
      e.strike(pl);
      const landed = pl.hurt(G.Abilities.enemyDamage(e, e.dmg), e.atkType, false, { kind: 'contact', enemy: e });
      if (landed && pl.hasItem('rockyhelmet')) e.hurt((15 + pl.level * 4)*.2*G.Items.count(pl,'rockyhelmet'), '#9aa6b5', e.x - pl.x, e.y - pl.y, 16*G.Items.count(pl,'rockyhelmet'), null, pl);
      const [nx, ny] = G.U.norm(e.x - pl.x, e.y - pl.y);
      e.kx += nx * 150; e.ky += ny * 150;
    }
    }
  }

  return { reach, tick, resolve, ghostCast, ghostOrbit, counterTackle, updateFields, drawGroundFields, drawAirFields, clearFields,
           leaderCast(pl,m){run(pl,m,Math.max(.15,m.cd||1));},
           zHit(pl, e, dmg, m) { hit(pl,e,dmg,(m.bondColor||G.U.TYPE_COLOR[m.type]),e.x-pl.x,e.y-pl.y,m.knock||0,{...m,zMove:true}); },
           get fieldCount() { return fields.length; } };
})();

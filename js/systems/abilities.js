/* Efectos de habilidades. Sólo la medalla equipada participa en la run. */
G.Abilities = (() => {
  const PRESSURE_RADIUS = 240;
  const has = (p, ability) => !!p && p.ability === ability;
  const players = () => G.Game ? G.Game.everyone().filter(p => p && !p.dead) : [];
  const WEATHER = { sandstream: 'sand', drizzle: 'rain', drought: 'sun' };
  const DEBUFFS = ['slow', 'burn', 'poison', 'static', 'unnerve', 'fear'];
  function state(p) {
    return p.abilityState || (p.abilityState = { safeTime: 0, naturalReady: true, weatherTime: 0,
      casts: 0, confidence: [], haste: 0, hasteT: 0, sturdyUsed: false, stage: 0, kills: new Set(), phaseInside: false, phaseT: 0,
      contactCd: 0, telepathyCd: 0, kindleT: 0, sandTick: 0, justiceT: 0,
      growthAtk: 0, growthSpeed: 0, growthCooldown: 0, defenseFactor: 1 });
  }
  const buffDuration = (p, dur) => dur * (has(p, 'clearbody') ? 1.5 : 1);
  const attackBonus = p => state(p).growthAtk + (has(p, 'justified') && state(p).justiceT > 0 ? 0.4 :
    has(p, 'moxie') ? state(p).confidence.length * 0.1 : has(p, 'flashfire') && state(p).kindleT > 0 ? 0.5 : 0);
  const speedBonus = p => has(p, 'lightmetal') || has(p, 'sandveil') ? state(p).haste * 0.2 : 0;
  const cooldownRate = (p, m) => 1 + state(p).growthCooldown + (has(p, 'prankster') && m.kind === 'buff' ? 0.15 : 0) +
    (has(p, 'sandforce') && weatherActive('sand') ? 0.25 : 0);
  const electricField = () => players().some(p => has(p, 'transistor'));
  const fieldDamage = type => type === 'electric' && electricField() ? 1.1 : 1;
  const suppressEffects = p => has(p, 'sheerforce');
  function move(p, m) {
    if (!suppressEffects(p) || m.kind === 'buff') return m;
    return { ...m, burn: 0, poison: 0, slow: 0, knock: 0, drain: 0 };
  }
  function onLevel(p) {
    const s = state(p);
    if (has(p, 'intrepidsword')) s.growthAtk += 0.02;
    if (has(p, 'dauntlessshield')) s.defenseFactor *= 0.99;
    if (!has(p, 'download')) return;
    const baseHp = G.MonProgression ? G.MonProgression.stats(p.monStage || p.dex).hp : p.mon.hp;
    const hpScale = G.Mega && G.Mega.active(p) ? G.Mega.HP : 1;
    // Compare dimensionless permanent growth, never raw HP against speed or temporary buffs.
    const scores = [p.maxHp / hpScale / baseHp, p.atkMul + s.growthAtk,
      p.spdMul + s.growthSpeed, (1 + s.growthCooldown) / p.cdMul,
      1 / ((1 - Math.min(0.8, p.dmgReduce)) * s.defenseFactor)];
    const lowest = Math.min(...scores), ties = scores.map((v, i) => v <= lowest + 1e-8 ? i : -1).filter(i => i >= 0);
    const pick = G.U.pick(ties);
    if (pick === 0) p.addMaxHp(baseHp * 0.02);
    if (pick === 1) s.growthAtk += 0.02;
    if (pick === 2) s.growthSpeed += 0.02;
    if (pick === 3) s.growthCooldown += 0.02;
    if (pick === 4) s.defenseFactor *= 0.98;
    s.downloadLast = ['hp', 'atk', 'spd', 'cd', 'def'][pick];
  }
  const weatherActive = kind => !!(G.Weather.current && G.Weather.current.kind === kind && !weatherSuppressed());
  const debuffImmune = p => has(p, 'hydration') && weatherActive('rain');
  const slowImmune = p => debuffImmune(p) || has(p, 'naturalcure') && state(p).naturalReady;
  const xpFactor = p => has(p, 'slowstart') ? 0.7 : 1;
  const levelChoices = p => has(p, 'slowstart') && Math.random() < 0.5 ? 2 : 1;
  const projectileSpeed = p => has(p, 'victorystar') ? 1.3 : 1;
  const outgoingType = (p, type, types) => has(p, 'multitype') ? 1 : type ? G.Types.mult(type, types) : 1;
  const outgoingDamage = (p, attack = {}, bypass = false) => 1 + (p && p.damageBonus || 0) + (G.Items?.damageBonus(p)||0) + (has(p, 'multitype') ? 0.2 : 0) +
    (G.Mega ? G.Mega.damage(p) - 1 : 0) + (attack.kind && attack.kind !== 'buff' && has(p, 'sheerforce') ? 0.15 : 0) +
    (bypass && attack.kind === 'melee' && has(p, 'unseenfist') ? 0.2 : 0) + (fieldDamage(attack.type) - 1);
  const weatherSuppressed = () => players().some(p => has(p, 'airlock'));
  const enemyDamage = (e, dmg, kind='contact') => {
    const mon=e && G.DEX_BY[e.dex], max=mon && Math.max(mon.atk,mon.spa??mon.atk);
    const power=max>0?(kind==='contact'||kind==='melee'?mon.atk:(mon.spa??mon.atk))/max:1;
    return dmg * power * (e && e.repelT > 0 ? 0.75 : e && e.fearT > 0 ? 0.8 : 1);
  };
  const critMultiplier = p => has(p, 'airlock') && !(G.Weather.hasWeather && G.Weather.hasWeather()) ? 2.25 : 1.5;
  function canCast(p) {
    return !(has(p, 'levitate') && G.World.overlapsSolid && G.World.overlapsSolid(p.x, p.y, p.r));
  }
  function updatePhase(p, dt = 0) {
    if (!has(p, 'levitate')) return;
    const s = state(p), inside = !!(G.World.overlapsSolid && G.World.overlapsSolid(p.x, p.y, p.r));
    s.phaseT = Math.max(0, (s.phaseT || 0) - dt);
    if (s.phaseT < 1e-8) s.phaseT = 0;
    if (inside !== s.phaseInside) { s.phaseInside = inside; s.phaseT = 0.3; }
  }
  function movementFactor(p) {
    if (!has(p, 'levitate')) return 1;
    updatePhase(p);
    const s = state(p); return s.phaseT > 0 ? 0.3 : s.phaseInside ? 0.5 : 1;
  }
  function onDamage(p) {
    const s = state(p); s.safeTime = 0; s.naturalReady = false;
    if (has(p, 'lightmetal')) grantHaste(p);
  }
  function grantHaste(p) { const s = state(p); s.haste = Math.min(3, s.haste + 1); s.hasteT = buffDuration(p, 5); }
  function resetStage(p, stage) {
    const s = state(p);
    if (s.stage !== stage) { s.stage = stage; s.sturdyUsed = false; }
  }
  function saveLethal(p) {
    const s = state(p);
    if (!has(p, 'sturdy') || s.sturdyUsed) return false;
    s.sturdyUsed = true; p.hp = 1; p.heal(p.maxHp * 0.5);
    show(p, '¡Robustez!', '#ffcb3d'); return true;
  }
  function onCast(p, m) {
    if (!has(p, 'truant')) return 1;
    const s = state(p); s.casts = (s.casts + 1) % 4;
    if (s.casts !== 0) return 1;
    p.heal(p.maxHp * 0.05); return 2;
  }
  function onKill(p, id) {
    if (!p || p.dead || !has(p, 'moxie')) return;
    if (G.Coop.active && p !== G.Game.player) { if (G.Coop.abilityKill) G.Coop.abilityKill(p, id); return; }
    const s = state(p);
    if (s.kills.has(id)) return;
    s.kills.add(id);
    if (s.confidence.length >= 5) s.confidence.shift();
    s.confidence.push(buffDuration(p, 3));
  }
  function equipped(save, dex) {
    const id = save && save.abilityEquipped && save.abilityEquipped[dex];
    const def = G.AbilityDefs.BY_ID[id];
    return def && def.dex === dex && G.AbilityDefs.owns(save, dex, def.ability) ? def.ability : null;
  }
  function equip(save, dex, id) {
    if (id) {
      const def = G.AbilityDefs.BY_ID[id];
      if (!def || def.dex !== dex || !G.AbilityDefs.owns(save, dex, def.ability)) return false;
    }
    save.abilityEquipped = save.abilityEquipped || {};
    save.abilityEquipped[dex] = id || null;
    return true;
  }
  function pressure(e) {
    return players().some(p => has(p, 'pressure') && G.U.dist2(p.x, p.y, e.x, e.y) <= PRESSURE_RADIUS ** 2) ? 0.8 : 1;
  }
  function slowStrength(factor) {
    const k = players().some(p => has(p, 'synchronize')) ? 1.1 : 1;
    return Math.min(0.95, Math.max(0, factor) * k);
  }
  function slowFactor(e, environmental = 1) {
    const raw = 1 - (1 - (e.slow || 0)) * (e.staticT > 0 ? 0.9 : 1) * (e.repelT > 0 ? 0.5 : 1) * environmental;
    return 1 - slowStrength(raw);
  }
  function show(p, text, color) { if (G.FX) G.FX.dmgText(p.x, p.y - (p.bodyH || 0) - 10, text, color); }
  function beforeHurt(p, source) {
    if (source.kind === 'ranged' && has(p, 'snowcloak') && Math.random() < 0.1) {
      show(p, '¡Evasión!', '#d8f1ff');
      if (!(p.snowHealCd > 0)) { p.heal(p.maxHp * 0.05); p.snowHealCd = 1; }
      return false;
    }
    if (source.kind === 'contact' && has(p, 'static') && source.enemy && source.enemy.staticT > 0 && Math.random() < 0.25) {
      show(p, '¡Fallo!', '#ffd23f');
      return false;
    }
    return true;
  }
  function damageFactor(p, source, type = null) {
    if (G.ZMoves && G.ZMoves.immune(p)) return 0;
    const factor = state(p).defenseFactor;
    if (has(p, 'multitype')) return factor * 0.8;
    if (has(p, 'telepathy') && type && p.mon.types.includes(type)) return factor * 0.5;
    return factor * (has(p, 'multiscale') && p.hp >= p.maxHp &&
      ['contact', 'ranged', 'attack'].includes(source.kind) ? 0.5 : 1);
  }
  function applyEffect(e, kind, value, owner = null) {
    if (!e || e.dead) return;
    if (kind === 'static') e.staticT = 2;
    if (kind === 'unnerve') e.unnerveT = 3;
    if (kind === 'fear') e.fearT = 3;
    if (kind === 'repel') e.repelT = 3;
    if (kind === 'slow') e.applySlow(0.2, 3);
    if (kind === 'burn') e.applyBurn(1, owner);
    if (kind === 'poison') e.applyPoison(1, owner);
    if (kind === 'flamebody') {
      e.abilityBurn = { remaining: 5, tick: e.abilityBurn ? e.abilityBurn.tick : 1, total: value, owner };
      if (owner && !e.boss) { const [nx, ny] = G.U.norm(e.x - owner.x, e.y - owner.y); e.kx += nx * 220; e.ky += ny * 220; }
    }
  }
  function sendEffect(p, e, kind, value = 0) {
    applyEffect(e, kind, value, p);
    if (e.remote) G.Coop.toHost(['ab', e.id, kind, value]);
  }
  function fireballDamage(p) {
    const ember = p.moves.find(m => m.id === 'ember') || G.Moves.instance('ember', 1);
    return ember.dmg * (p.attackFor ? p.attackFor(ember) : p.atk);
  }
  function afterHurt(p, source, type = null) {
    const s = state(p);
    if (has(p, 'justified') && type && G.Types.mult(type, p.mon.types) > 1) s.justiceT = buffDuration(p, 5);
    if (has(p, 'flashfire') && type === 'fire') s.kindleT = 5;
    if (has(p, 'telepathy') && type && p.mon.types.includes(type) && s.telepathyCd <= 0 && p.hp > 0) {
      s.telepathyCd = 1; p.heal(p.maxHp * 0.05);
    }
    const e = source.enemy;
    if (source.kind !== 'contact' || p.hp <= 0) return;
    if (has(p, 'static') && e && !e.dead) sendEffect(p, e, 'static');
    if (s.contactCd > 0) return;
    if (has(p, 'flamebody')) {
      s.contactCd = 1;
      for (const enemy of G.EnemyMgr.queryCircle(p.x, p.y, 120)) sendEffect(p, enemy, 'flamebody', fireballDamage(p));
      if (G.FX) G.FX.ring(p.x, p.y, 5, 120, '#ff9a4d', 0.3, 4);
    }
    if (has(p, 'roughskin')) { s.contactCd = 1; G.Combat.counterTackle(p, e); }
  }
  function onHit(p, e, attack = {}) {
    if (!e || e.dead || e.hp <= 0) return;
    if (has(p, 'unnerve')) sendEffect(p, e, 'unnerve');
    if (has(p, 'intimidate') && attack.kind === 'melee') sendEffect(p, e, 'repel');
    if (has(p, 'serenegrace') && Math.random() < 0.1) sendEffect(p, e, G.U.pick(DEBUFFS));
  }
  function reflectSlow(p, factor) {
    if (!has(p, 'synchronize') || p.dead || !(factor > 0) || p.syncCd > 0) return;
    p.syncCd = 3;
    if (G.Coop.active && !G.Coop.isHost) {
      G.Coop.toHost(['as', Math.min(0.95, factor)]);
    } else {
      for (const e of G.EnemyMgr.all()) if (!e.dead) e.applySlow(factor, 3);
    }
    show(p, '¡Sincronía!', '#ff8ad8');
  }
  function playerTick(p, dt) {
    updatePhase(p, dt);
    const s = state(p), before = s.safeTime;
    s.safeTime += dt;
    s.confidence = s.confidence.map(t => t - dt).filter(t => t > 1e-8);
    s.hasteT = Math.max(0, s.hasteT - dt); if (!s.hasteT) s.haste = 0;
    for (const key of ['contactCd', 'telepathyCd', 'kindleT', 'justiceT']) s[key] = Math.max(0, s[key] - dt);
    if (has(p, 'sandveil') && weatherActive('sand')) {
      s.sandTick -= dt;
      while (s.sandTick <= 1e-8) { grantHaste(p); s.sandTick += 1; }
    } else s.sandTick = 0;
    if (has(p, 'naturalcure') && s.safeTime >= 20) s.naturalReady = true;
    if (slowImmune(p)) p.slowT = 0;
    if (has(p, 'regenerator')) {
      const active = Math.max(0, s.safeTime - 5) - Math.max(0, before - 5);
      if (active > 0) p.heal(p.maxHp * 0.05 * active);
    }
    if (has(p, 'icebody') && G.Weather.current && G.Weather.current.kind === 'snow' && !weatherSuppressed()) p.heal(p.maxHp * 0.03 * dt);
    if (WEATHER[p.ability]) {
      s.weatherTime += dt;
      if (s.weatherTime >= 40) {
        s.weatherTime %= 40;
        if (G.Coop.active && !G.Coop.isHost) G.Coop.toHost(['aw', WEATHER[p.ability]]);
        else G.Weather.debugStart(WEATHER[p.ability], 20);
      }
    }
    p.snowHealCd = Math.max(0, (p.snowHealCd || 0) - dt);
    p.syncCd = Math.max(0, (p.syncCd || 0) - dt);
    const terrain = p.inLiquid ? G.World.liquidEffect(p.mon.types).slow || 1 : 1;
    const weather = G.Weather.speedFor(p.mon.types);
    const trap = p.slowT > 0 ? 0.5 : 1;
    reflectSlow(p, slowImmune(p) ? 0 : 1 - terrain * weather * trap);
  }
  function enemyTick(e, dt) {
    // El anfitrión calcula el drenaje global una vez, incluso con varios Darkrai.
    const nightmare = players().find(p => has(p, 'baddreams'));
    let environmental = G.Weather.speedFor(e.types || []);
    if (!e.flying && !e.legend && !e.judge && G.World.isLiquid(e.x, e.y)) {
      const le = G.World.liquidEffect(e.types || []);
      if (!le.dmg && le.slow) environmental *= le.slow < 0.5 ? 0.45 : 0.55;
    }
    if (nightmare && slowFactor(e, environmental) < 1) {
      const active = environmental < 1 ? dt : Math.min(dt, Math.max(e.slow > 0 ? e.slowT || 0 : 0, e.staticT || 0));
      e.nightmareTick = (e.nightmareTick == null ? 1 : e.nightmareTick) - active;
      while (e.nightmareTick <= 1e-8 && !e.dead) { e.nightmareTick += 1; e.hurt(e.hp * 0.05, '#a878dc', 0, 0, 0, null, nightmare); }
    } else e.nightmareTick = 1;
    e.staticT = Math.max(0, (e.staticT || 0) - dt);
    e.unnerveT = Math.max(0, (e.unnerveT || 0) - dt);
    e.fearT = Math.max(0, (e.fearT || 0) - dt);
    e.repelT = Math.max(0, (e.repelT || 0) - dt);
    const b = e.abilityBurn;
    if (!b) return;
    const active = Math.min(dt, b.remaining);
    b.remaining -= active; b.tick -= active;
    while (b.tick <= 1e-8 && !e.dead) {
      b.tick += 1;
      e.hurt(b.total / 5, '#ff9a4d', 0, 0, 0, null, b.owner);
    }
    if (b.remaining <= 1e-8 || e.dead) e.abilityBurn = null;
  }
  function healEnemy(e, amount) {
    if (!e.dead) e.hp = Math.min(e.maxHp, e.hp + Math.max(0, amount) * (e.unnerveT > 0 ? 0.5 : 1));
  }
  function status(p) {
    if (!p || !p.ability) return '';
    const s = state(p), def = G.AbilityDefs.medalsFor(p.dex).find(m => m.ability === p.ability);
    const name = def ? G.T(def.name) : p.ability;
    if (has(p, 'moxie')) return name + ' ×' + s.confidence.length;
    if (has(p, 'lightmetal') || has(p, 'sandveil')) return name + ' ×' + s.haste + ' · ' + Math.ceil(s.hasteT) + 's';
    if (has(p, 'flashfire')) return name + (s.kindleT > 0 ? ' · ' + G.T('Combustión') + ' +50% · ' + Math.ceil(s.kindleT) + 's' : '');
    if (has(p, 'justified')) return name + (s.justiceT > 0 ? ' · ' + G.T('Justicia') + ' · ' + Math.ceil(s.justiceT) + 's' : '');
    if (has(p, 'hydration')) return name + (debuffImmune(p) ? ' ✓' : '');
    if (has(p, 'naturalcure')) return name + (s.naturalReady ? ' ✓' : ' · ' + Math.ceil(Math.max(0, 20 - s.safeTime)) + 's');
    if (has(p, 'regenerator')) return name + (s.safeTime >= 5 ? ' ✓' : ' · ' + Math.ceil(5 - s.safeTime) + 's');
    if (has(p, 'sturdy')) return name + ' · ' + G.T(s.sturdyUsed ? 'Agotada' : 'Disponible');
    if (has(p, 'truant')) return name + ' · ' + s.casts + '/3';
    if (WEATHER[p.ability]) return name + ' · ' + Math.ceil(40 - s.weatherTime) + 's';
    if (has(p, 'levitate')) return name + (canCast(p) ? ' ✓' : ' · ' + G.T('Sin lanzar movimientos')) + ' · ' + Math.round(movementFactor(p) * 100) + '%';
    if (has(p, 'airlock')) return name + ' · ' + G.T(G.Weather.hasWeather() ? 'Clima anulado' : 'Crítico ×2,25');
    return name;
  }
  return { has, equipped, equip, state, buffDuration, attackBonus, speedBonus, slowImmune, debuffImmune, weatherActive, weatherSuppressed,
           xpFactor, levelChoices, projectileSpeed, outgoingType, outgoingDamage, cooldownRate, fieldDamage, move, suppressEffects, onLevel,
           enemyDamage, critMultiplier, canCast, updatePhase, movementFactor, onDamage, resetStage, saveLethal, onCast, onKill, WEATHER, DEBUFFS, status,
           pressure, slowStrength, slowFactor, beforeHurt, damageFactor, afterHurt,
           onHit, applyEffect, fireballDamage, reflectSlow, playerTick, enemyTick, healEnemy, PRESSURE_RADIUS };
})();

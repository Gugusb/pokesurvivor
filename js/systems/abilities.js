/* Efectos de habilidades. Sólo la medalla equipada participa en la run. */
G.Abilities = (() => {
  const PRESSURE_RADIUS = 240;
  const has = (p, ability) => !!p && p.ability === ability;
  const players = () => G.Game ? G.Game.everyone().filter(p => p && !p.dead) : [];
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
    const raw = 1 - (1 - (e.slow || 0)) * (e.staticT > 0 ? 0.9 : 1) * environmental;
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
  function applyEffect(e, kind, value) {
    if (!e || e.dead) return;
    if (kind === 'static') e.staticT = 2;
    if (kind === 'unnerve') e.unnerveT = 3;
    if (kind === 'flamebody') e.abilityBurn = { remaining: 5, tick: e.abilityBurn ? e.abilityBurn.tick : 1, total: value };
  }
  function sendEffect(p, e, kind, value = 0) {
    applyEffect(e, kind, value);
    if (e.remote) G.Coop.toHost(['ab', e.id, kind, value]);
  }
  function fireballDamage(p) {
    const ember = p.moves.find(m => m.id === 'ember') || G.Moves.instance('ember', 1);
    return ember.dmg * p.atk;
  }
  function afterHurt(p, source) {
    const e = source.enemy;
    if (source.kind !== 'contact' || !e || e.dead) return;
    if (has(p, 'static')) sendEffect(p, e, 'static');
    if (has(p, 'flamebody') && Math.random() < 0.3) sendEffect(p, e, 'flamebody', fireballDamage(p));
  }
  function onHit(p, e) { if (has(p, 'unnerve')) sendEffect(p, e, 'unnerve'); }
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
    p.snowHealCd = Math.max(0, (p.snowHealCd || 0) - dt);
    p.syncCd = Math.max(0, (p.syncCd || 0) - dt);
    const terrain = p.inLiquid ? G.World.liquidEffect(p.mon.types).slow || 1 : 1;
    const weather = G.Weather.speedFor(p.mon.types);
    const trap = p.slowT > 0 ? 0.5 : 1;
    reflectSlow(p, 1 - terrain * weather * trap);
  }
  function enemyTick(e, dt) {
    e.staticT = Math.max(0, (e.staticT || 0) - dt);
    e.unnerveT = Math.max(0, (e.unnerveT || 0) - dt);
    const b = e.abilityBurn;
    if (!b) return;
    const active = Math.min(dt, b.remaining);
    b.remaining -= active; b.tick -= active;
    while (b.tick <= 1e-8 && !e.dead) {
      b.tick += 1;
      e.hurt(b.total / 5, '#ff9a4d');
    }
    if (b.remaining <= 1e-8 || e.dead) e.abilityBurn = null;
  }
  function healEnemy(e, amount) {
    if (!e.dead) e.hp = Math.min(e.maxHp, e.hp + Math.max(0, amount) * (e.unnerveT > 0 ? 0.5 : 1));
  }
  return { has, equipped, equip, pressure, slowStrength, slowFactor, beforeHurt, afterHurt,
           onHit, applyEffect, fireballDamage, reflectSlow, playerTick, enemyTick, healEnemy, PRESSURE_RADIUS };
})();

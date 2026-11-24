/* Boss-only burst resistance. All clocks use simulated combat time. */
G.BossCombat = (() => {
  const enabled = e => e.boss && !e.judge && !e.remote && e.spawnTime >= 480;
  const innateEnabled = e => !!(e && e.boss && !e.remote && (G.Difficulty?.current || 1) > 3);
  function innateMax() {
    const cycle = G.Expedition?.active ? (G.Expedition.run?.cycle || 1) : 1;
    return cycle >= 3 ? 1000 : cycle === 2 ? 300 : 100;
  }
  function innate(e) {
    if (!innateEnabled(e)) return null;
    if (!e.innateShield) {
      const max = innateMax();
      e.innateShield = { max, hp: max, state: 'active', stunT: 0, charge: 0 };
    }
    return e.innateShield;
  }
  function rateMul(e) {
    const s = innate(e);
    return s && s.state === 'active' ? 1.4 : 1;
  }
  function state(e) {
    return e.bossGuard || (e.bossGuard = { load: 0, budget: e.maxHp * .18, leech: e.maxHp * .05, resistance: 0 });
  }
  function tick(e, dt) {
    if (!e.boss || e.remote) return;
    const is = innate(e);
    if (is && dt > 0) {
      if (is.state === 'stunned') {
        is.stunT = Math.max(0, is.stunT - dt);
        e.classStunT = Math.max(e.classStunT || 0, is.stunT);
        if (is.stunT <= 0) { is.state = 'charging'; is.charge = 0; }
      } else if (is.state === 'charging') {
        is.charge = Math.min(is.max, is.charge + 10 * dt);
        if (is.charge >= is.max) {
          is.charge = 0; is.hp = is.max; is.state = 'active';
          G.FX?.ring?.(e.x, e.y, e.r, e.r * 2.5, '#6be6ff', .4, 3);
        }
      }
    }
    const s = state(e);
    s.load *= Math.exp(-Math.max(0, dt) / 1.5);
    s.budget = Math.min(e.maxHp * .18, s.budget + e.maxHp * .14 * dt);
    s.leech = Math.min(e.maxHp * .05, s.leech + e.maxHp * .05 * dt);
    s.resistance = Math.max(0, Math.min(.85, (s.load / e.maxHp - .08) / (s.load / e.maxHp + .16)));
  }
  function onHitPlayer(e, target, hpLost) {
    if (!e || e.dead || !(hpLost > 0)) return;
    const is = innate(e);
    if (!is || is.state !== 'charging') return;
    const gain = is.max * (target && target.isSquadMember ? 0.2 : 0.4);
    is.charge = Math.min(is.max, is.charge + gain);
    if (is.charge >= is.max) {
      is.charge = 0; is.hp = is.max; is.state = 'active';
      G.FX?.ring?.(e.x, e.y, e.r, e.r * 2.5, '#6be6ff', .4, 3);
    }
  }
  function damage(e, amount, attack = null) {
    const is = innate(e);
    if (is) {
      if (is.state === 'active') {
        const typeMult = attack?.type && G.Types ? G.Types.mult(attack.type, e.types) : 1;
        if (typeMult <= 1.05) amount *= 0.4;
        const bloomMult = (attack?.kind === 'nova' || attack?.kind === 'aura' || G.SquadBonds?.group?.(attack?.kind) === 'bloom') ? 2.5 : 1;
        is.hp = Math.max(0, is.hp - typeMult * bloomMult);
        if (is.hp <= 0) {
          is.hp = 0; is.state = 'stunned'; is.stunT = 8; is.charge = 0;
          e.classStunT = Math.max(e.classStunT || 0, 8);
          G.FX?.ring?.(e.x, e.y, e.r, e.r * 3.5, '#7de3ff', .5, 4);
          G.Audio?.sfx?.('boss');
        }
      } else if (is.state === 'stunned') {
        amount *= 1.2;
      }
    }
    if (!enabled(e)) return amount;
    if (!e.ai) e.bossInit();
    let opening = 0;
    // Split a threshold-crossing hit so even a huge first hit reaches fury.
    if (!e.ai.fury && e.hp - amount <= e.maxHp * .5) {
      opening = Math.max(0, e.hp - e.maxHp * .5);
      e.enrage();
    }
    if (!e.ai.fury) return amount;
    const s = state(e), incoming = Math.max(0, amount - opening);
    s.load = Math.min(e.maxHp * 1.5, s.load + incoming);
    const rate = s.load / e.maxHp;
    s.resistance = Math.max(0, Math.min(.85, (rate - .08) / (rate + .16)));
    const dealt = Math.min(incoming * (1 - s.resistance), s.budget);
    s.budget -= dealt;
    return opening + dealt;
  }
  function leech(e, damage, playerMaxHp) {
    if (!e || !e.legend || e.dead || !(damage > 0) || !(playerMaxHp > 0)) return 0;
    if (e.remote) { if (G.Coop.bossLeech) G.Coop.bossLeech(e, damage); return 0; }
    const s = state(e);
    const rawHeal = Math.min(e.maxHp - e.hp, e.maxHp * .03,
      e.maxHp * .1 * Math.min(1, damage / playerMaxHp), s.leech);
    const heal=rawHeal*(e.unnerveT>0?.5:1);
    if (heal <= 0) return 0;
    s.leech -= rawHeal; e.hp += heal;
    G.FX.ring(e.x, e.y, e.r, e.r * 1.7, '#77edb5', .35, 3);
    return heal;
  }
  return { enabled, innateEnabled, innate, rateMul, tick, damage, onHitPlayer, leech };
})();

/* Boss-only burst resistance. All clocks use simulated combat time. */
G.BossCombat = (() => {
  const enabled = e => e.boss && !e.judge && !e.remote && e.spawnTime >= 480;
  function state(e) {
    return e.bossGuard || (e.bossGuard = { load: 0, budget: e.maxHp * .18, leech: e.maxHp * .05, resistance: 0 });
  }
  function tick(e, dt) {
    if (!e.boss || e.remote) return;
    const s = state(e);
    s.load *= Math.exp(-Math.max(0, dt) / 1.5);
    s.budget = Math.min(e.maxHp * .18, s.budget + e.maxHp * .14 * dt);
    s.leech = Math.min(e.maxHp * .05, s.leech + e.maxHp * .05 * dt);
    s.resistance = Math.max(0, Math.min(.85, (s.load / e.maxHp - .08) / (s.load / e.maxHp + .16)));
  }
  function damage(e, amount) {
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
  return { enabled, tick, damage, leech };
})();

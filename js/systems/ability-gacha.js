/* Gacha de Kanto: las seis especies de cinco estrellas dan medallas individuales. */
G.AbilityGacha = (() => {
  let forced = null;
  function costOf(save, n) {
    return (n === 1 || n === 10) && Number.isFinite(save.abilityGems) && save.abilityGems >= n ? n : null;
  }
  function pool(rarity) { return G.Gacha.pool(rarity, 1); }
  function roll(min = 1) {
    const rates = G.Gacha.RATES.filter(([r]) => r >= min);
    let n = Math.random() * rates.reduce((sum, [, w]) => sum + w, 0);
    for (const [r, w] of rates) { n -= w; if (n <= 0) return r; }
    return 5;
  }
  function pull(save, n) {
    const cost = costOf(save, n);
    if (!cost) return null;
    save.abilityGems -= cost;
    save.abilityMedals = save.abilityMedals || {};
    save.abilityEquipped = save.abilityEquipped || {};
    save.abilityPity = save.abilityPity || {};
    save.shiny = save.shiny || {};
    const out = [];
    for (let i = 0; i < n; i++) {
      save.abilityPity[1] = (save.abilityPity[1] || 0) + 1;
      const forcedDef = i === 0 && forced && G.Dev && G.Dev.canUse() ? G.AbilityDefs.BY_ID[forced] : null;
      const rarity = forcedDef || save.abilityPity[1] >= G.Gacha.PITY_5 ? 5
        : n === 10 && i === 9 && !out.some(r => r.rarity >= 4) ? roll(4) : roll();
      if (rarity === 5) save.abilityPity[1] = 0;
      let mon = forcedDef ? G.DEX_BY[forcedDef.dex] : G.U.pick(pool(rarity));
      const medals = G.AbilityDefs.medalsFor(mon.dex);
      let isNew, refund = 0, shiny = false, medal = null;
      if (medals.length) {
        medal = forcedDef || G.U.pick(medals);
        if (forcedDef) forced = null;
        isNew = !save.abilityMedals[medal.id];
        if (isNew) {
          save.abilityMedals[medal.id] = { at: Date.now(), from: 'ability-gacha' };
          if (save.abilityEquipped[mon.dex] === undefined) save.abilityEquipped[mon.dex] = medal.id;
        } else refund = 300;
      } else {
        shiny = G.Sprites.hasShiny(mon.dex) && Math.random() < G.Gacha.SHINY_RATE;
        if (shiny && save.shiny[mon.dex]) {
          const missing = pool(rarity).filter(p => !G.AbilityDefs.medalsFor(p.dex).length && G.Sprites.hasShiny(p.dex) && !save.shiny[p.dex]);
          if (missing.length) mon = G.U.pick(missing); else shiny = false;
        }
        isNew = !(shiny ? save.shiny[mon.dex] : save.owned[mon.dex]);
        if (shiny && isNew) save.shiny[mon.dex] = { at: Date.now(), from: 'ability-gacha' };
        if (!save.owned[mon.dex]) save.owned[mon.dex] = { at: Date.now(), from: 'ability-gacha' };
        if (!isNew) refund = G.Gacha.REFUND[rarity] * (shiny ? 3 : 1);
      }
      save.coins += refund;
      out.push({ dex: mon.dex, rarity, shiny, isNew, refund, medal: medal && medal.id });
    }
    save.stats.abilityPulls = (save.stats.abilityPulls || 0) + n;
    return out;
  }
  return { costOf, pool, pull, debugMedal(id) { if (G.Dev && G.Dev.canUse() && G.AbilityDefs.BY_ID[id]) forced = id; }, clearDebug() { forced = null; } };
})();

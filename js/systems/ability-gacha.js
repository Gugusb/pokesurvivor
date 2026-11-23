/* Gacha de habilidades: regiones disponibles; garantía independiente por región. */
G.AbilityGacha = (() => {
  let forced = null;
  function costOf(save, n) {
    return [1,10,100].includes(n) && Number.isFinite(save.abilityGems) && save.abilityGems >= n ? n : null;
  }
  const GENS = [...new Set(G.AbilityDefs.SPECIES.map(dex => G.DEX_BY[dex].gen))].sort((a, b) => a - b);
  function pool(rarity, gen = 1) { return GENS.includes(gen) ? G.Gacha.pool(rarity, gen) : []; }
  function roll(min = 1) {
    const rates = G.Gacha.RATES.filter(([r]) => r >= min);
    let n = Math.random() * rates.reduce((sum, [, w]) => sum + w, 0);
    for (const [r, w] of rates) { n -= w; if (n <= 0) return r; }
    return 5;
  }
  function pull(save, n, gen = 1) {
    if (!GENS.includes(gen)) return null;
    const cost = costOf(save, n);
    if (!cost) return null;
    save.abilityGems -= cost;
    save.abilityMedals = save.abilityMedals || {};
    save.abilityEquipped = save.abilityEquipped || {};
    save.abilityPity = save.abilityPity || {};
    save.shiny = save.shiny || {};
    const out = [];
    for (let i = 0; i < n; i++) {
      save.abilityPity[gen] = (save.abilityPity[gen] || 0) + 1;
      const candidate = i === 0 && forced && G.Dev && G.Dev.canUse() ? G.AbilityDefs.BY_ID[forced] : null;
      const forcedDef = candidate && G.DEX_BY[candidate.dex].gen === gen ? candidate : null;
      const rarity = forcedDef || save.abilityPity[gen] >= G.Gacha.PITY_5 ? 5
        : n>=10 && (i+1)%10===0 && !out.slice(i-9,i).some(r=>r.rarity>=4) ? roll(4) : roll();
      if (rarity === 5) save.abilityPity[gen] = 0;
      let mon = forcedDef ? G.DEX_BY[forcedDef.dex] : G.U.pick(pool(rarity, gen));
      const medals = G.AbilityDefs.medalsFor(mon.dex);
      let isNew, refund = 0, shiny = false, medal = null, ivUp = false;
      if (medals.length) {
        medal = forcedDef || G.U.pick(medals);
        if (forcedDef) forced = null;
        isNew = !save.abilityMedals[medal.id];
        if (isNew) {
          save.abilityMedals[medal.id] = { at: Date.now(), from: 'ability-gacha' };
          if (!medal.leader && save.abilityEquipped[mon.dex] === undefined) save.abilityEquipped[mon.dex] = medal.id;
        } else refund = medal.leader ? G.Gacha.REFUND[rarity] : 300;
      } else {
        const inv = G.DB.grantInvitation(mon.dex, save);
        ivUp = inv.ivUp;
        isNew = !inv.owned && inv.count === 1;
        if (inv.owned) refund = inv.convertedCoins;
      }
      save.coins += refund;
      out.push({ dex: mon.dex, rarity, shiny: false, invitation: !medal && !save.owned?.[mon.dex], isNew, refund, medal: medal && medal.id, ivUp });
    }
    save.stats.abilityPulls = (save.stats.abilityPulls || 0) + n;
    return out;
  }
  return { GENS, costOf, pool, pull, debugMedal(id) { if (G.Dev && G.Dev.canUse() && G.AbilityDefs.BY_ID[id]) forced = id; }, clearDebug() { forced = null; } };
})();

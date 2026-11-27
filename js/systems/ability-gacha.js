/* Gacha de habilidades (Gen 1–9): 2% medalla de capitán familiar (peso igual por familia) + 98% invitación con Bola Dorada. */
G.AbilityGacha = (() => {
  const MEDAL_RATE = 0.02;
  let forced = null;
  let forceGolden = 0;

  function costOf(save, n) {
    return [1, 10, 100].includes(n) && Number.isFinite(save.abilityGems) && save.abilityGems >= n ? n : null;
  }

  function familyMedals(gen = 1) {
    return (G.AbilityDefs?.LIST || []).filter(m => m.leader && G.DEX_BY[m.dex]?.gen === gen);
  }

  function gens() {
    const set = new Set((G.AbilityDefs?.LIST || []).filter(m => m.leader && G.DEX_BY[m.dex]).map(m => G.DEX_BY[m.dex].gen));
    if (!set.size) return G.Gacha.BANNERS.map(b => b.gen);
    return [...set].sort((a, b) => a - b);
  }

  function pool(rarity, gen = 1) {
    return gens().includes(gen) ? G.Gacha.pool(rarity, gen) : [];
  }

  function poolNear(rarity, gen) {
    for (const d of [0, -1, 1, -2, 2, -3, 3, -4, 4]) {
      const r = rarity + d;
      if (r < 1 || r > 5) continue;
      const p = G.Gacha.pool(r, gen);
      if (p.length) return { rarity: r, list: p };
    }
    return { rarity, list: G.DEX.filter(p => p.gen === gen && !!G.SPRITE_META?.[p.dex]) };
  }

  function roll(min = 1) {
    const rates = G.Gacha.RATES.filter(([r]) => r >= min);
    let n = Math.random() * rates.reduce((sum, [, w]) => sum + w, 0);
    for (const [r, w] of rates) { n -= w; if (n <= 0) return r; }
    return 5;
  }

  function pull(save, n, gen = 1) {
    if (!gens().includes(gen)) return null;
    const cost = costOf(save, n);
    if (!cost) return null;
    save.abilityGems -= cost;
    save.abilityMedals = save.abilityMedals || {};
    save.abilityVouchers = save.abilityVouchers || {};
    save.abilityEquipped = save.abilityEquipped || {};
    save.abilityPity = save.abilityPity || {};
    save.shiny = save.shiny || {};

    const famMedals = familyMedals(gen);
    const out = [];
    for (let i = 0; i < n; i++) {
      save.abilityPity[gen] = (save.abilityPity[gen] || 0) + 1;
      const candidate = i === 0 && forced && G.Dev && G.Dev.canUse() ? G.AbilityDefs.BY_ID[forced] : null;
      const forcedDef = candidate && candidate.leader && G.DEX_BY[candidate.dex]?.gen === gen ? candidate : null;
      const hitMedal = !!forcedDef || (famMedals.length > 0 && Math.random() < MEDAL_RATE);

      if (hitMedal) {
        const medal = forcedDef || G.U.pick(famMedals);
        if (forcedDef) forced = null;
        const mon = G.DEX_BY[medal.dex];
        const alreadyOwned = !!(G.LeaderMedals?.unlocked(medal.dex, save) || save.abilityMedals[medal.id]);
        let isNew = false, voucher = null;
        if (!alreadyOwned) {
          save.abilityMedals[medal.id] = { at: Date.now(), from: 'ability-gacha' };
          isNew = true;
        } else {
          save.abilityVouchers[medal.id] = (save.abilityVouchers[medal.id] || 0) + 1;
          voucher = medal.id;
        }
        out.push({
          dex: mon.dex, rarity: 5, shiny: false, goldenBall: false,
          invitation: false, isNew, refund: 0, medal: medal.id, voucher, ivUp: false
        });
        continue;
      }

      // 98%: Pokémon Invitation from this generation (preserves 0.1% Golden Ball & 70-pull 5★ pity)
      let want;
      if (save.abilityPity[gen] >= G.Gacha.PITY_5) want = 5;
      else if (n >= 10 && (i + 1) % 10 === 0 && !out.slice(i - 9, i).some(r => r.rarity >= 4)) want = roll(4);
      else want = roll();
      const { rarity, list } = poolNear(want, gen);
      if (rarity === 5) save.abilityPity[gen] = 0;
      const mon = G.U.pick(list);
      const goldenBall = forceGolden > 0 ? (forceGolden--, true) : Math.random() < G.Gacha.GOLDEN_BALL_RATE;
      let shiny = false, isNew = false, refund = 0, ivUp = false, ivRaised = [], invitation = false;

      if (goldenBall) {
        shiny = !!(G.Sprites?.hasShiny?.(mon.dex)) && Math.random() < G.Gacha.GOLDEN_SHINY_RATE;
        const gRes = shiny
          ? G.DB.grantShiny(mon.dex, 'golden-ball', save)
          : G.DB.grantFamily(mon.dex, 'golden-ball', save);
        isNew = !!gRes?.isNew || !!gRes?.shinyNew;
        ivUp = !!gRes?.ivUp;
        ivRaised = gRes?.ivRaised || [];
        if (gRes?.convertedCoins) refund = gRes.convertedCoins;
        if (!isNew && !refund) {
          refund = G.Gacha.REFUND[rarity];
          save.coins += refund;
        }
      } else {
        const inv = G.DB.grantInvitation(mon.dex, save);
        ivUp = !!inv.ivUp;
        ivRaised = inv.ivRaised || [];
        if (inv.owned) {
          refund = inv.convertedCoins;
          isNew = false;
        } else {
          invitation = true;
          isNew = inv.count === 1;
        }
      }

      if (shiny) save.stats.shinies = (save.stats.shinies || 0) + 1;
      out.push({
        dex: mon.dex, rarity, shiny, goldenBall, invitation, isNew, refund,
        medal: null, voucher: null, ivUp, ivRaised, invites: save.invites?.[mon.dex] || 0
      });
    }
    save.stats.abilityPulls = (save.stats.abilityPulls || 0) + n;
    return out;
  }

  return {
    MEDAL_RATE,
    get GENS() { return gens(); },
    gens,
    familyMedals,
    costOf,
    pool,
    pull,
    debugMedal(id) { if (G.Dev && G.Dev.canUse() && G.AbilityDefs.BY_ID[id]) forced = id; },
    debugForceGolden(n = 1) { forceGolden = n; },
    clearDebug() { forced = null; forceGolden = 0; }
  };
})();

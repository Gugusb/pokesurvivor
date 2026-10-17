/* Individual values, evolution chains and deferred wild captures. */
G.MonProgression = (() => {
  /* Generated from all available PokeAPI evolution chains. PATHS keeps one
     deterministic route per species so branching families can follow the
     selected Pokédex target while every run starts at the chain root. */
  const CHAINS = G.EVOLUTION_CHAINS || {
    1: [1, 2, 3], 4: [4, 5, 6], 7: [7, 8, 9], 25: [25, 26]
  };
  const PATHS = G.EVOLUTION_PATHS || CHAINS;
  const chainBy = {};
  for (const [key, chain] of Object.entries(PATHS)) {
    for (const dex of chain) chainBy[dex] = chain;
    chainBy[+key] = chain;
  }
  const pathFor = dex => PATHS[dex] || chainBy[dex] || [dex];
  const rootFor = dex => pathFor(dex)[0];
  const ivMod = iv => 0.75 + 0.65 * Math.pow(Math.max(0, Math.min(30, iv - 1)) / 30, 2);
  const values = dex => G.DB.ivOf(dex) || [16, 16, 16];
  const stats = (dex, ivs = values(dex)) => {
    const p = G.DEX_BY[dex], v = ivs.map(ivMod);
    return { hp: p.hp * v[0], atk: p.atk * v[1], spd: p.spd * v[2] };
  };
  function stageFor(dex, level, selectedPath) {
    const chain = selectedPath || pathFor(dex); if (!chain) return dex;
    const i = Math.min(chain.length - 1, level >= 15 ? chain.length - 1 : level >= 6 ? Math.min(1, chain.length - 1) : 0);
    return chain[i];
  }
  function captureChance(enemy) { return enemy && (enemy.boss || enemy.legend) ? 0.05 : 0.002; }
  function tryCapture(enemy, run) {
    if (!enemy || enemy.judge || enemy.remote || Math.random() >= captureChance(enemy)) return false;
    run.pendingCaptures ||= [];
    if (!run.pendingCaptures.some(c => c.dex === enemy.dex)) run.pendingCaptures.push({ dex: enemy.dex });
    return true;
  }
  function commitCaptures(save, run) {
    const out = [];
    for (const c of run?.pendingCaptures || []) {
      const fresh = !G.DB.owns(c.dex); G.DB.grant(c.dex, 'capture');
      out.push({ dex: c.dex, isNew: fresh });
    }
    if (out.length) G.DB.commit(true);
    return out;
  }
  return { CHAINS, PATHS, chainBy, pathFor, rootFor, ivMod, values, stats, stageFor, captureChance, tryCapture, commitCaptures };
})();

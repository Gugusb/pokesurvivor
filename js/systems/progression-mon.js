/* Individual values, evolution chains and deferred wild captures. */
G.MonProgression = (() => {
  const CHAINS = {
    1: [1, 2, 3], 4: [4, 5, 6], 7: [7, 8, 9], 25: [25, 26],
    133: [133, 134, 135, 136, 196, 197, 470, 471, 700],
    147: [147, 148, 149], 155: [155, 156, 157], 158: [158, 159, 160],
    252: [252, 253, 254], 255: [255, 256, 257], 258: [258, 259, 260]
  };
  const chainBy = {};
  for (const chain of Object.values(CHAINS)) for (const dex of chain) chainBy[dex] = chain;
  const ivMod = iv => 0.75 + 0.65 * Math.pow(Math.max(0, Math.min(30, iv - 1)) / 30, 2);
  const values = dex => G.DB.ivOf(dex) || [16, 16, 16];
  const stats = (dex, ivs = values(dex)) => {
    const p = G.DEX_BY[dex], v = ivs.map(ivMod);
    return { hp: p.hp * v[0], atk: p.atk * v[1], spd: p.spd * v[2] };
  };
  function stageFor(dex, level) {
    const chain = chainBy[dex]; if (!chain) return dex;
    const i = Math.min(chain.length - 1, Math.floor(Math.max(0, level - 1) / 3));
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
  return { CHAINS, chainBy, ivMod, values, stats, stageFor, captureChance, tryCapture, commitCaptures };
})();

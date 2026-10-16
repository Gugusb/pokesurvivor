/* Eight-star difficulty; four stars is the original combat balance. */
G.Difficulty = (() => {
  const WIN = 20 * 60;
  let current = 4;
  const level = n => Number.isInteger(n) && n >= 1 && n <= 8 ? n : 1;
  const map = x => x && typeof x === 'object' && !Array.isArray(x) ? x : {};
  const seconds = x => Number.isFinite(x) && x > 0 ? x : 0;
  const factors = (n = current) => ({ hp: 1.05 ** (level(n) - 4), dmg: 1.03 ** (level(n) - 4) });
  function unlocked(s) {
    let n = 1;
    while (n < 8 && s.difficulty?.cleared?.[n]) n++;
    return n;
  }
  function normalize(s) {
    const d = map(s.difficulty), cleared = {};
    for (let n = 1; n <= 8; n++) if (d.cleared?.[n] === true) cleared[n] = true;
    s.difficulty = { selected: level(d.selected), cleared };
    s.difficulty.selected = Math.min(s.difficulty.selected, unlocked(s));
    const records = {};
    for (const [dex, rows] of Object.entries(map(s.difficultyRecords))) {
      if (G.DEX_BY[dex]?.dex !== +dex) continue;
      const result = {};
      for (let n = 1; n <= 8; n++) {
        const r = map(rows?.[n]), best = seconds(r.best);
        if (best) result[n] = { best, won: r.won === true && best > WIN };
      }
      if (Object.keys(result).length) records[dex] = result;
    }
    s.difficultyRecords = records;
  }
  function merge(a, b) {
    const out = { difficulty: { selected: a.difficulty?.selected ?? b.difficulty?.selected, cleared: {} }, difficultyRecords: {} };
    for (const s of [a, b]) {
      for (let n = 1; n <= 8; n++) if (s.difficulty?.cleared?.[n] === true) out.difficulty.cleared[n] = true;
      for (const [dex, rows] of Object.entries(map(s.difficultyRecords))) {
        if (G.DEX_BY[dex]?.dex !== +dex) continue;
        const dest = out.difficultyRecords[dex] ||= {};
        for (let n = 1; n <= 8; n++) {
          const r = map(rows?.[n]); if (!seconds(r.best)) continue;
          const old = dest[n] || {};
          dest[n] = { best: Math.max(seconds(old.best), r.best), won: old.won === true || r.won === true };
        }
      }
    }
    normalize(out); return out;
  }
  function select(s, n) {
    if (level(n) !== n || n > unlocked(s)) return false;
    s.difficulty.selected = n; return true;
  }
  function partyLevel(s, members) {
    return Math.min(s.difficulty?.selected || 1, ...members.map(m => level(m.difficultyLimit)));
  }
  function begin(s, dex, requested) {
    current = requested == null ? Math.min(s.difficulty?.selected || 1, unlocked(s)) : level(requested);
    return { stars: current, dex, victory: false, eligible: current <= unlocked(s) };
  }
  function record(s, run, time, alive, clean) {
    if (!run || !run.eligible || !clean || !seconds(time) || !G.DEX_BY[run.dex]) return false;
    const rows = s.difficultyRecords[run.dex] ||= {};
    const old = rows[run.stars] || { best: 0, won: false };
    const win = alive && time > WIN;
    rows[run.stars] = { best: Math.max(old.best, time), won: old.won || win };
    if (win) { s.difficulty.cleared[run.stars] = true; run.victory = true; }
    return win;
  }
  function highest(s, dex) {
    const rows = s.difficultyRecords?.[dex] || {};
    for (let n = 8; n >= 1; n--) if (rows[n]?.best > 0) return { stars: n, best: rows[n].best };
    return null;
  }
  function frame(s, dex) {
    const rows = s.difficultyRecords?.[dex] || {};
    if (Array.from({ length: 8 }, (_, i) => rows[i + 1]?.won).every(Boolean)) return 'ruby';
    if (rows[5]?.won) return 'emerald';
    return Object.values(rows).some(r => r.won) ? 'gold' : '';
  }
  return { WIN, level, factors, normalize, merge, unlocked, select, partyLevel, begin, record, highest, frame,
    get current() { return current; } };
})();

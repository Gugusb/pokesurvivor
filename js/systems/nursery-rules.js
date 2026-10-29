/* Shared pairing and offspring rules. Timers and rewards are server-owned. */
G.NurseryRules = (() => {
  const HOURS = {
    1: 6,
    2: 5,
    3: 2,
    4: 3,
    5: 4,
    6: 5,
    7: 4,
    8: 6,
    9: 6,
    10: 8,
    11: 7,
    12: 5,
    13: 6,
    14: 10,
    15: 12,
  };
  const groups = (dex) => G.EGG_GROUPS[dex] || [];
  function compatible(a, b, friend = false) {
    const x = groups(a),
      y = groups(b);
    if (!x.length || !y.length) return false;
    if (x.includes(13) || y.includes(13)) return true;
    if (x.includes(15) || y.includes(15))
      return friend && x.includes(15) && y.includes(15);
    return x.some((g) => y.includes(g));
  }
  function duration(a, b, friend = false) {
    if (!compatible(a, b, friend)) return null;
    const x = groups(a),
      y = groups(b),
      shared = x.includes(13)
        ? y
        : y.includes(13)
          ? x
          : x.filter((g) => y.includes(g));
    return Math.min(12, ...shared.map((g) => HOURS[g])) * 3600000;
  }
  function offspring(a, b, friend, rng = Math.random) {
    a=G.MonProgression.normalizeIV(a);b=G.MonProgression.normalizeIV(b);
    const iv = Array.from({ length: 8 }, () => 1 + Math.floor(rng() * 31)),
      indices = [0, 1, 2, 3, 4, 5, 6, 7];
    for (let i = 7; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const inherited = indices.slice(0, friend ? 2 : 1);
    for (const i of inherited) iv[i] = (rng() < 0.5 ? a : b)[i];
    return { iv, inherited };
  }
  return { groups, compatible, duration, offspring, HOURS };
})();

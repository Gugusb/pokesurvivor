/* Family-wide Z permission. Collection acquisition is the single entry point. */
G.ZAccess = (() => {
  const root = (dex) => (G.EVOLUTION_PATHS?.[dex] || [Number(dex)])[0];
  const TYPES = [
    "normal",
    "fire",
    "water",
    "electric",
    "grass",
    "ice",
    "fighting",
    "poison",
    "ground",
    "flying",
    "psychic",
    "bug",
    "rock",
    "ghost",
    "dragon",
    "dark",
    "steel",
    "fairy",
  ];
  function normalize(s) {
    for (const k of ["zAccess", "zDuplicates"])
      if (!s[k] || typeof s[k] !== "object" || Array.isArray(s[k])) s[k] = {};
    for (const k of Object.keys(s.zDuplicates)) {
      const n = s.zDuplicates[k];
      if (
        !G.DEX_BY[k] ||
        root(k) !== Number(k) ||
        !Number.isSafeInteger(n) ||
        n < 0
      )
        delete s.zDuplicates[k];
      else s.zDuplicates[k] = Math.min(6, n);
    }
    for (const k of Object.keys(s.zAccess))
      if (!G.DEX_BY[k] || root(k) !== Number(k) || !s.zAccess[k])
        delete s.zAccess[k];
    // Preserve the capabilities of old development crystals once, not forever.
    if (!s.zAccessMigrated) {
      if (TYPES.some((t) => s.zStones?.[t]))
        for (const d of Object.keys(s.owned || {})) unlock(s, d, "legacy");
      s.zAccessMigrated = true;
    }
    for (const [d, n] of Object.entries(s.zDuplicates))
      if (n >= 6) unlock(s, d, "duplicates");
  }
  function unlock(s, dex, from = "dev") {
    if (!G.DEX_BY[dex]) return false;
    s.zAccess ||= {};
    const r = root(dex),
      fresh = !s.zAccess[r];
    s.zAccess[r] ||= { at: Date.now(), from };
    return fresh;
  }
  const allowed = (s, dex) => !!s?.zAccess?.[root(dex)];
  function acquired(s, dex, rng = Math.random) {
    normalize(s);
    const familyOwned = Object.keys(s.owned || {}).some(
      (d) => root(d) === root(dex),
    );
    if (!familyOwned) return false;
    const r = root(dex);
    s.zDuplicates[r] = Math.min(6, (s.zDuplicates[r] || 0) + 1);
    return (
      !allowed(s, dex) &&
      (s.zDuplicates[r] >= 6 || rng() < 0.2) &&
      unlock(s, dex, "duplicates")
    );
  }
  function merge(a, b) {
    const s = {
      ...a,
      zAccess: { ...b.zAccess, ...a.zAccess },
      zDuplicates: { ...a.zDuplicates },
    };
    for (const [d, n] of Object.entries(b.zDuplicates || {}))
      s.zDuplicates[d] = Math.max(n, s.zDuplicates[d] || 0);
    normalize(s);
    return {
      zAccess: s.zAccess,
      zDuplicates: s.zDuplicates,
      zAccessMigrated: true,
    };
  }
  return { root, TYPES, normalize, unlock, allowed, acquired, merge };
})();

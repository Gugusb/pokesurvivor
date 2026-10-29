"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm");
const ROOT = path.resolve(__dirname, "..");
// Reuse the game's progression rules; none of this context is exposed to HTTP.
const ctx = vm.createContext({
  G: { I18n: { add() {}, addChinese() {} } },
  window: {},
  console,
  Date,
  Math,
  Set,
  Map,
  JSON,
});
for (const f of [
  "js/data/pokedex.js",
  "js/data/evolutions.js",
  "js/data/egg-groups.js",
  "js/data/mega-forms.js",
  "js/data/mega-types.js",
  "js/systems/z-access.js",
  "js/systems/nursery-rules.js",
  "js/data/abilities.js",
  "js/systems/progression-mon.js",
  "js/systems/difficulty.js",
  "js/systems/offline.js",
  "js/core/db.js",
]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, {
    filename: f,
  });
}
const G = ctx.G,
  clone = (x) => JSON.parse(JSON.stringify(x));
function fresh(name) {
  const s = clone(G.DB.fresh(name));
  G.Offline.stamp(s);
  return s;
}
function safeObject(x, depth = 0) {
  if (depth > 25) throw new Error("Save nesting too deep");
  if (typeof x === "number" && !Number.isFinite(x))
    throw new Error("Invalid number");
  if (x && typeof x === "object")
    for (const [k, v] of Object.entries(x)) {
      if (["__proto__", "constructor", "prototype"].includes(k))
        throw new Error("Invalid field");
      safeObject(v, depth + 1);
    }
}
function sanitize(input, old, name) {
  if (!input || Array.isArray(input) || typeof input !== "object")
    throw new Error("Invalid save");
  safeObject(input);
  const s = Object.assign(fresh(name), clone(input));
  for (const k of [
    "stats",
    "tickets",
    "profile",
    "abilityMedals",
    "abilityEquipped",
    "megaStones",
    "megaEquipped",
    "zStones",
    "zEquipped",
  ])
    if (!s[k] || typeof s[k] !== "object" || Array.isArray(s[k]))
      throw new Error("Invalid " + k);
  for (const v of Object.values(s.stats))
    if (typeof v === "number" && (!Number.isFinite(v) || v < 0 || v > 1e12))
      throw new Error("Invalid statistics");
  s.profile = {
    title:
      typeof s.profile.title === "string" ? s.profile.title.slice(0, 40) : "",
    favs: Array.isArray(s.profile.favs)
      ? s.profile.favs
          .filter((f) => f && G.DEX_BY[f.dex])
          .slice(0, 3)
          .map((f) => ({ dex: f.dex, shiny: !!f.shiny }))
      : [],
  };
  for (const k of ["coins", "abilityGems"])
    if (!Number.isSafeInteger(s[k]) || s[k] < 0 || s[k] > 1e8)
      throw new Error("Invalid currency");
  for (const k of ["t1", "t10"])
    if (
      !Number.isSafeInteger(s.tickets?.[k]) ||
      s.tickets[k] < 0 ||
      s.tickets[k] > 1e7
    )
      throw new Error("Invalid tickets");
  for (const k of ["owned", "shiny"]) {
    if (!s[k] || typeof s[k] !== "object" || Array.isArray(s[k]))
      throw new Error("Invalid collection");
    for (const [d, v] of Object.entries(s[k])) {
      if (!G.DEX_BY[d] || !v || typeof v !== "object")
        throw new Error("Invalid species");
      if (
        v.iv &&
        (!Array.isArray(v.iv) ||
          ![3,6,8].includes(v.iv.length) ||
          v.iv.some((n) => !Number.isInteger(n) || n < 1 || n > 31))
      )
        throw new Error("Invalid IV");
      if (k === 'owned') {
        const iv=G.MonProgression.normalizeIV(v.iv), before=G.MonProgression.normalizeIV(old.owned?.[d]?.iv);
        v.iv=iv.map((n,i)=>Math.max(n,before[i]));
      }
    }
  }
  if (s.partner != null && (!G.DEX_BY[s.partner] || !s.owned[s.partner]))
    throw new Error("Partner not owned");
  s.name = name;
  s.updated = Date.now();
  s.created = old.created;
  s.v = old.v;
  // Achievement authority is independent of client saves and account deletion.
  s.difficultyRecords = clone(old.difficultyRecords);
  s.difficulty = {
    ...clone(old.difficulty),
    selected: Math.min(
      G.Difficulty.level(s.difficulty?.selected),
      G.Difficulty.unlocked(old),
    ),
  };
  s.offline = clone(old.offline);
  Object.assign(s,G.ZAccess.merge(s,old));
  for(const [d,type] of Object.entries(s.zEquipped))
    if(!G.DEX_BY[d] || type!==null && (!G.ZAccess.TYPES.includes(type)||!G.ZAccess.allowed(s,d)))delete s.zEquipped[d];
  G.Offline.stamp(s);
  return s;
}
function record(s, run, t, alive, clean) {
  const r = { stars: run.stars, dex: run.dex, eligible: clean, victory: false };
  return G.Difficulty.record(s, r, t, alive, clean);
}
module.exports = { ROOT, G, fresh, sanitize, clone, record };

/* Import PokéAPI's species egg groups; no runtime request to a third party. */
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm");
const root = path.join(__dirname, ".."),
  ctx = vm.createContext({ G: {} });
vm.runInContext(
  fs.readFileSync(path.join(root, "js/data/pokedex.js"), "utf8"),
  ctx,
);
const groups = {};
for (const row of fs
  .readFileSync(
    path.join(__dirname, "cache/eggs/pokemon_egg_groups.csv"),
    "utf8",
  )
  .trim()
  .split(/\r?\n/)
  .slice(1)) {
  const [dex, group] = row.split(",").map(Number);
  (groups[dex] ||= []).push(group);
}
const data = Object.fromEntries(
  ctx.G.DEX.map((p) => {
    if (!groups[p.dex]) throw Error("Missing egg groups: " + p.dex);
    return [p.dex, groups[p.dex]];
  }),
);
fs.writeFileSync(
  path.join(root, "js/data/egg-groups.js"),
  "/* PokéAPI pokemon_egg_groups.csv, imported 2026-10-20. See assets/EGG_GROUPS_LICENSE.txt. */\nG.EGG_GROUPS = " +
    JSON.stringify(data) +
    ";\n",
);
fs.copyFileSync(
  path.join(__dirname, "cache/eggs/LICENSE.md"),
  path.join(root, "assets/EGG_GROUPS_LICENSE.txt"),
);
console.log(
  "Egg groups imported for " + Object.keys(data).length + " species.",
);

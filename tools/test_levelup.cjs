// Real move catalogue and reward generator, with deterministic randomness.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.join(__dirname, '..'), noop = () => {};
function setup() {
  const s = { G: {}, Math: Object.create(Math), WeakMap, Set, Map, console };
  s.window = s;
  vm.createContext(s);
  for (const f of ['js/core/util.js', 'js/data/moves.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), s);
  s.G.FX = { ring: noop, burst: noop }; s.G.Audio = { sfx: noop }; s.G.Progress = { event: noop };
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/systems/levelup.js'), 'utf8').replace(
    'return { offer, STATS, evolutionOffer };', 'return { offer, STATS, evolutionOffer, _candidates: candidates, _draw: draw };'), s);
  let seed = 271828;
  s.Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  s.player = (ids = ['ember']) => ({
    mon: { types: ['fire'] }, moves: ids.map(id => s.G.Moves.instance(id)), slots: ids.map(id => [id]), maxMoves: 4,
    statsTaken: {}, banned: new Set(), x: 0, y: 0, bodyH: 20,
    hasMove(id) { return this.moves.some(m => m.id === id); },
    addMove(id) { this.moves.push(s.G.Moves.instance(id)); this.slots.push([id]); },
    addMaxHp: noop, heal: noop
  });
  return s;
}

test('complete pools preserve learnset, bans, slot/buff limits and capped stats', () => {
  const s = setup(), p = s.player(), L = s.G.LevelUp;
  let cards = L._candidates(p);
  assert.equal(cards.filter(c => c.type === 'new').length, s.G.Moves.poolFor(p.mon).length - 1);
  assert.ok(cards.some(c => c.category === 'buff')); assert.equal(cards.filter(c => c.type === 'stat').length, 9);
  p.banned.add('tackle'); p.moves.push(s.G.Moves.instance('swords-dance'), s.G.Moves.instance('harden'));
  p.statsTaken.spd = 8; cards = L._candidates(p);
  assert.ok(!cards.some(c => c.key === 'new:tackle' || c.type === 'new' && c.category === 'buff' || c.key === 'stat:spd'));
  p.slots.length = 4; assert.ok(!L._candidates(p).some(c => c.type === 'new'));
});

test('learned move weights rise with level, while ready ultimate evolution is downweighted and never forced', () => {
  const s = setup(), p = s.player(), L = s.G.LevelUp, m = p.moves[0], weights = [];
  for (let lv = 1; lv < m.def.maxLvl; lv++) {
    weights.push(L._candidates(p).find(c => c.key === 'up:ember').w); s.G.Moves.levelUp(m);
  }
  assert.equal(weights[0], 2); assert.ok(weights.every((w, i) => !i || w > weights[i - 1]));
  assert.ok(!L._candidates(p).some(c => c.type === 'up')); assert.ok(!L._candidates(p).some(c => c.type === 'evo'));
  p.statsTaken.atk = 1;
  assert.equal(L._candidates(p).find(c => c.type === 'evo').w, 0.75);
  s.Math.random = () => 0.99;
  assert.ok(L.offer(p).every(c => c.type === 'stat')); assert.ok(L.offer(p).every(c => c.type === 'stat'));
});

test('available categories roll 5:3:2 independent of the number of cards in each pool', () => {
  const s = setup(), L = s.G.LevelUp, pool = [];
  for (const [category, n] of [['attack', 30], ['buff', 2], ['stat', 9]])
    for (let i = 0; i < n; i++) pool.push({ category, w: 1 });
  const counts = { attack: 0, buff: 0, stat: 0 };
  for (let i = 0; i < 30000; i++) counts[L._draw(pool).category]++;
  for (const [k, expected] of [['attack', .5], ['stat', .3], ['buff', .2]])
    assert.ok(Math.abs(counts[k] / 30000 - expected) < .012, JSON.stringify(counts));
  const withoutBuff = pool.filter(c => c.category !== 'buff');
  s.Math.random = () => .62; assert.equal(L._draw(withoutBuff).category, 'attack');
  s.Math.random = () => .63; assert.equal(L._draw(withoutBuff).category, 'stat');
});

test('ultimate rarity also lowers actual draw chance when it is the only output card in a full build', () => {
  const s = setup(), p = s.player(), L = s.G.LevelUp;
  p.slots.length = 4; s.Math.random = () => .5;
  while (p.moves[0].lvl < 4) s.G.Moves.levelUp(p.moves[0]);
  assert.equal(L.offer(p, 1)[0].type, 'up');
  s.G.Moves.levelUp(p.moves[0]); p.statsTaken.atk = 1;
  assert.equal(L.offer(p, 1)[0].type, 'stat');
});

test('two consecutive displays cannot miss a learned upgrade, including rerolls at the same level', () => {
  const s = setup(), p = s.player(), L = s.G.LevelUp; p.level = 2; s.Math.random = () => .99;
  assert.ok(L.offer(p).every(c => c.type === 'stat'));
  const rerolled = L.offer(p); assert.equal(p.level, 2); assert.ok(rerolled.some(c => c.key === 'up:ember'));
  assert.ok(L.offer(p).every(c => c.type === 'stat'));
  p.level++; assert.ok(L.offer(p).some(c => c.type === 'up'));
  const fresh = s.player(); assert.ok(L.offer(fresh).every(c => c.type === 'stat'));
});

test('guarantee works with full or fused slots, and a buff upgrade counts as learned', () => {
  const s = setup(), p = s.player(['swords-dance']), L = s.G.LevelUp;
  p.slots = Array.from({ length: 4 }, () => []); s.Math.random = () => .99;
  L.offer(p); assert.ok(L.offer(p).some(c => c.key === 'up:swords-dance'));
  const q = s.player(['ember', 'tackle', 'harden', 'agility', 'dragon-dance']);
  q.slots = [[q.moves[0], q.moves[1]], [q.moves[2]], [q.moves[3]], [q.moves[4]]];
  L.offer(q); assert.ok(L.offer(q).some(c => c.type === 'up'));
});

test('all-maxed exception ends stale misses and resumes safely when a new move is learned', () => {
  const s = setup(), p = s.player(), L = s.G.LevelUp; s.Math.random = () => .99;
  L.offer(p);
  while (s.G.Moves.levelUp(p.moves[0])) {}
  assert.ok(L.offer(p).every(c => c.type !== 'up'));
  p.addMove('tackle'); assert.ok(L.offer(p).every(c => c.type === 'stat'));
  assert.ok(L.offer(p).some(c => c.key === 'up:tackle'));
});

test('long seeded runs yield three unique legal cards and never two upgrade misses', () => {
  const s = setup(), p = s.player(['ember', 'swords-dance']), L = s.G.LevelUp; let missed = false;
  for (let i = 0; i < 2000; i++) {
    const cards = L.offer(p), hit = cards.some(c => c.type === 'up');
    assert.equal(cards.length, 3); assert.equal(new Set(cards.map(c => c.key)).size, 3);
    assert.ok(!(missed && !hit)); missed = !hit;
  }
  const up = L._candidates(p).find(c => c.key === 'up:ember'); up.apply(p); assert.equal(p.moves[0].lvl, 2);
  const fresh = L._candidates(p).find(c => c.type === 'new'); fresh.apply(p); assert.ok(p.hasMove(fresh.key.slice(4)));
  assert.deepEqual(Array.from(L.offer(p, 0)), []);
});

test('ready evolution and prerequisite stat cards still apply their real effects', () => {
  const s = setup(), p = s.player(), L = s.G.LevelUp;
  while (s.G.Moves.levelUp(p.moves[0])) {}
  const stat = L._candidates(p).find(c => c.key === 'stat:atk'); assert.equal(stat.w, 2);
  p.atkMul = 1; stat.apply(p); assert.equal(p.statsTaken.atk, 1); assert.equal(p.atkMul, 1.1);
  const evo = L._candidates(p).find(c => c.key === 'evo:ember'); evo.apply(p);
  assert.equal(p.moves[0].evolved, true); assert.ok(!L._candidates(p).some(c => c.type === 'evo' || c.type === 'up'));
});

test('real level-up UI reroll uses the same guarantee and still consumes its existing reroll allowance', () => {
  const s = setup(), p = s.player(), G = s.G, nodes = new Map();
  const node = () => ({ children: [], classList: { add: noop, remove: noop, toggle: noop }, dataset: {},
    appendChild(c) { this.children.push(c); }, set innerHTML(v) { this.children = []; this.html = v; } });
  s.document = { createElement: node, getElementById:()=>null };
  const heading=node();heading.insertAdjacentElement=noop;
  G.UI = { $: id => { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); }, show: noop, hide: noop };
  G.UI.$('lvl-num').parentElement=heading;G.T=s=>s;
  G.Icons = { html: () => '' }; G.Game = { player: p };
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/ui/run-ui.js'), 'utf8'), s);
  s.Math.random = () => .99;
  G.RunUI.showLevelUp(2, G.LevelUp.offer(p), noop);
  assert.ok(nodes.get('cards').children.every(c => !c.html.includes('Nv.')));
  G.RunUI.reroll(); assert.equal(p.rerolls, 1);
  assert.ok(nodes.get('cards').children.some(c => c.html.includes('Nv.1')));
  const cards = nodes.get('cards').children; G.RunUI.reroll(); assert.equal(p.rerolls, 1);
  assert.equal(nodes.get('cards').children, cards);
});

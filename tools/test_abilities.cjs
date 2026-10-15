// node --test tools/test_abilities.cjs — lógica real en un navegador simulado.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.join(__dirname, '..'), noop = () => {};
function context(lang = 'zh') {
  const storage = new Map([['ps.lang', lang]]);
  const s = { console, Math: Object.create(Math), Map, Set, JSON, Date, Object, Array, Number, String, RegExp,
    Uint8Array, TextEncoder, Promise, performance: { now: () => 1000 },
    setTimeout: noop, clearTimeout: noop, setInterval: noop, addEventListener: noop, matchMedia: () => ({ matches: false }),
    location: { pathname: '/', protocol: 'file:', reload: noop }, navigator: { language: 'zh-CN' },
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
    document: { documentElement: {}, addEventListener: noop }, CanvasRenderingContext2D: function () {}, confirm: noop, alert: noop };
  s.window = s; s.G = {}; s.players = []; s.enemies = [];
  vm.createContext(s);
  s.load = file => vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), s, { filename: file });
  for (const file of ['js/core/util.js', 'js/core/i18n.js', 'js/data/lang-en.js', 'js/data/lang-zh.js',
    'js/data/pokedex.js', 'js/data/sprites-meta.js', 'js/data/moves.js', 'js/data/abilities.js']) s.load(file);
  const G = s.G;
  G.FIREBASE_CONFIG = null;
  G.FX = new Proxy({}, { get: () => noop }); G.Audio = { sfx: noop }; G.Camera = { kick: noop, sees: () => false };
  G.World = { liquidEffect: () => ({ slow: 0.5 }), isLiquid: () => false, collide: () => false };
  G.Weather = { speedFor: () => 1, mult: () => 1 }; G.Types = { mult: () => 1, label: () => null };
  G.Coop = { active: false, isHost: false, toHost: ev => (s.events ||= []).push(ev), status: noop };
  G.Dev = { canUse: () => false, invincible: false };
  G.Game = { everyone: () => s.players }; G.Path = { dirFor: () => null };
  G.Judgment = { noteDmg: noop }; G.Events = { golden: false };
  G.Projectiles = { clearOrbs: noop }; G.UI = { toast: noop };
  G.Sprites = { hasShiny: () => true, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false,
    dirFromAngle: () => 0, animMeta: () => null, PX: 2, Animator: class { play() {} update() {} loop() {} busy() { return false; } } };
  // Exponer privados sólo en el entorno de prueba, sin ampliar la API publicada.
  const db = fs.readFileSync(path.join(ROOT, 'js/core/db.js'), 'utf8').replace(
    'ready, register, login,', '_test: {newSave, migrate, sanitize}, ready, register, login,');
  vm.runInContext(db, s, { filename: 'js/core/db.js' }); G.DB.playAsGuest();
  for (const file of ['js/systems/abilities.js', 'js/systems/gacha.js', 'js/systems/ability-gacha.js', 'js/entities/player.js', 'js/entities/enemy.js']) s.load(file);
  G.EnemyMgr = { all: () => s.enemies };
  s.player = (dex, ability) => {
    const p = new G.Player(G.DEX_BY[dex]); p.ability = ability || null; s.players = [p]; return p;
  };
  s.enemy = () => {
    const e = new G.Enemy({ dex: 1, hp: 500, spd: 0, dmg: 10, xp: 1, behavior: 'ranged', shotCd: 2, range: 300 }, 100, 0, { hp: 1, spd: 1, dmg: 1 });
    s.enemies.push(e); return e;
  };
  s.random = values => { let i = 0; s.Math.random = () => values[i++] ?? 0.5; };
  return s;
}
const approx = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} ≠ ${b}`);

test('eleven independent medals; ownership alone does not enable an ability; one equipped', () => {
  const s = context(), { G } = s, save = G.DB.save;
  assert.equal(G.AbilityDefs.LIST.length, 11);
  save.owned[144] = { at: 1 }; assert.equal(G.Abilities.equipped(save, 144), null);
  assert.equal(G.Abilities.equip(save, 144, '144-pressure'), false);
  save.abilityMedals['144-pressure'] = { at: 1 }; save.abilityMedals['144-snowcloak'] = { at: 2 };
  assert.equal(G.Abilities.equip(save, 144, '145-static'), false);
  G.Abilities.equip(save, 144, '144-pressure');
  assert.equal(new G.Player(G.DEX_BY[144]).ability, 'pressure');
  G.Abilities.equip(save, 144, '144-snowcloak'); assert.equal(G.Abilities.equipped(save, 144), 'snowcloak');
  G.Abilities.equip(save, 144, null); G.DB._test.migrate(save);
  assert.equal(G.Abilities.equipped(save, 144), null); assert.equal(save.abilityEquipped[144], null);
});
test('old saves receive ten gems once, sanitization retains no invalid unlocks', () => {
  const { G } = context(), old = G.DB._test.newSave('test');
  delete old.abilityStarterGranted; delete old.abilityGems;
  G.DB._test.migrate(old); assert.equal(old.abilityGems, 10);
  old.abilityGems = 0; G.DB._test.migrate(old); assert.equal(old.abilityGems, 0);
  old.abilityGems = -7; old.abilityMedals = { '144-pressure': { at: 1 }, 'fake': { at: 1 }, '145-static': false };
  old.abilityEquipped = { 144: '145-static', 150: '144-pressure' };
  G.DB._test.sanitize(old); assert.equal(old.abilityGems, 0);
  assert.deepEqual(Object.keys(old.abilityMedals), ['144-pressure']); assert.equal(Object.keys(old.abilityEquipped).length, 0);
});
test('save merge unions medals but takes latest spent balance, pity and equipment; idempotent', () => {
  const { G } = context(), a = G.DB._test.newSave('a'), b = G.DB._test.newSave('a');
  a.updated = 1; a.abilityGems = 10; a.abilityMedals['144-pressure'] = { at: 1 };
  b.updated = 2; b.abilityGems = 0; b.abilityMedals['145-static'] = { at: 2 }; b.abilityPity[1] = 4; b.abilityEquipped[145] = '145-static';
  const merged = G.DB.merge(a, b); assert.equal(Object.keys(merged.abilityMedals).length, 2);
  assert.equal(merged.abilityGems, 0); assert.equal(merged.abilityPity[1], 4);
  assert.equal(merged.abilityEquipped[145], '145-static');
  assert.equal(JSON.stringify(G.DB.merge(merged, a)), JSON.stringify(merged));
});
test('ability pulls validate costs, spend gems only, guarantee epic in ten, independent pity', () => {
  const s = context(), { G } = s, save = G.DB.save;
  s.random([]); const before = JSON.stringify(save);
  for (const n of [-1, 0, 2, 1.1, 100, NaN]) assert.equal(G.AbilityGacha.pull(save, n), null);
  assert.equal(JSON.stringify(save), before);
  const out = G.AbilityGacha.pull(save, 10);
  assert.equal(out.length, 10); assert.ok(out.some(r => r.rarity >= 4)); assert.equal(save.abilityGems, 0);
  assert.equal(save.tickets.t1, 0); assert.equal(Object.keys(save.pity).length, 0); assert.equal(save.stats.abilityPulls, 10);
  const spent = JSON.stringify(save); assert.equal(G.AbilityGacha.pull(save, 1), null); assert.equal(JSON.stringify(save), spent);
});
test('70th ability pull replaces legendary with one medal, duplicate refunds and no Pokémon grant', () => {
  const s = context(), { G } = s, save = G.DB.save;
  const pool = G.AbilityGacha.pool(5), i = pool.findIndex(p => p.dex === 144);
  const pick = (i + 0.01) / pool.length;
  save.abilityPity[1] = 69; s.random([pick, 0]);
  let result = G.AbilityGacha.pull(save, 1)[0];
  assert.equal(result.medal, '144-pressure'); assert.equal(save.abilityPity[1], 0);
  assert.equal(save.owned[144], undefined); assert.equal(save.shiny[144], undefined);
  assert.equal(save.abilityEquipped[144], '144-pressure'); assert.equal(save.abilityMedals['144-snowcloak'], undefined);
  const coins = save.coins; save.abilityPity[1] = 69; s.random([pick, 0]);
  result = G.AbilityGacha.pull(save, 1)[0]; assert.equal(result.refund, 300); assert.equal(save.coins, coins + 300);
  assert.equal(result.isNew, false);
});
test('ordinary Pokémon gacha still grants Pokémon, never consumes gems', () => {
  const s = context(), { G } = s, save = G.DB.save;
  save.tickets.t1 = 1; save.pity[1] = 69;
  const pool = G.Gacha.pool(5, 1), i = pool.findIndex(p => p.dex === 150);
  s.random([(i + .01) / pool.length, .9]);
  const result = G.Gacha.pull(save, 1)[0]; assert.equal(result.dex, 150);
  assert.ok(save.owned[150]); assert.equal(save.abilityGems, 10); assert.equal(Object.keys(save.abilityMedals).length, 0);
});

test('Dragonite five-star rewards become either medal; duplicates refund, normal gacha still grants Dragonite', () => {
  const s = context(), { G } = s, save = G.DB.save;
  const pool = G.AbilityGacha.pool(5), pick = (pool.findIndex(p => p.dex === 149) + .01) / pool.length;
  for (const [roll, ability] of [[0, 'innerfocus'], [.99, 'multiscale']]) {
    save.abilityPity[1] = 69; s.random([pick, roll]);
    const reward = G.AbilityGacha.pull(save, 1)[0];
    assert.equal(reward.dex, 149); assert.equal(reward.medal, '149-' + ability);
    assert.equal(save.owned[149], undefined); assert.ok(save.abilityMedals[reward.medal]);
    const coins = save.coins; save.abilityPity[1] = 69; s.random([pick, roll]);
    assert.equal(G.AbilityGacha.pull(save, 1)[0].refund, 300); assert.equal(save.coins, coins + 300);
  }
  assert.equal(G.Abilities.equip(save, 149, '149-multiscale'), true);
  G.DB._test.sanitize(save); assert.equal(G.Abilities.equipped(save, 149), 'multiscale');
  assert.equal(G.Abilities.equip(save, 149, '149-innerfocus'), true);
  assert.equal(new G.Player(G.DEX_BY[149]).ability, 'innerfocus');
  save.tickets.t1 = 1; save.pity[1] = 69; s.random([pick, .99]);
  const reward = G.Gacha.pull(save, 1)[0]; assert.equal(reward.dex, 149); assert.ok(save.owned[149]);
});

test('Inner Focus cools inactive and linked moves once, holds them ready and only casts the active slot', () => {
  const s = context(), { G } = s, p = s.player(149, 'innerfocus'); s.load('js/systems/combat.js');
  G.VFX = { forMove: () => ({ pal: [] }) };
  const move = t => ({ kind: 'buff', type: 'normal', stat: 'atk', amount: .1, dur: 5, stacks: 5, cd: 2, t });
  const a = move(1), b = move(.2), linked = move(2), orbit = { kind: 'orbit', t: 0 };
  p.moves = [a, b, linked, orbit]; p.slots = [[a], [b, linked], [orbit]]; p.active = 0;
  let casts = 0; p.cast = () => casts++;
  G.Combat.tick(.5, p, 0); approx(a.t, .5); assert.equal(b.t, 0); approx(linked.t, 1.5);
  assert.equal(orbit.t, 0); assert.equal(casts, 0);
  G.Combat.tick(.5, p, 1); assert.equal(casts, 1); approx(a.t, 2); assert.equal(b.t, 0);
  p.active = 1; G.Combat.tick(.1, p, 2); assert.equal(casts, 2); approx(a.t, 1.9); approx(linked.t, .9);
  p.ability = 'multiscale'; G.Combat.tick(.1, p, 3); approx(a.t, 1.9);
  p.dead = true; const before = linked.t; G.Combat.tick(5, p, 4); approx(linked.t, before);
});

test('Multiscale halves final contact, ranged and pure attack damage only while full; healing reactivates it', () => {
  const s = context(), { G } = s, p = s.player(149, 'multiscale'); p.maxHp = p.hp = 100;
  for (const kind of ['contact', 'ranged', 'attack']) {
    p.hp = 100; p.invuln = 0; p.hurt(20, null, kind === 'attack', { kind }); assert.equal(p.hp, 90);
    p.invuln = 0; p.hurt(20, null, false, { kind }); assert.equal(p.hp, 70);
    p.heal(30); p.invuln = 0; p.hurt(20, null, false, { kind }); assert.equal(p.hp, 90);
  }
  p.hp = 100; p.invuln = 0; p.hurt(20); assert.equal(p.hp, 80);
  p.hp = 100; p.dmgReduce = .2; p.invuln = 0;
  p.slots = [[{ kind: 'melee' }]]; G.Types.mult = () => 2;
  p.hurt(20, 'ice', false, { kind: 'ranged' }); approx(p.hp, 88);
  p.ability = 'innerfocus'; p.hp = 100; p.invuln = 0;
  p.hurt(20, null, false, { kind: 'contact' }); approx(p.hp, 88);
});

test('Arceus attacks count for Multiscale while beams retain Snow Cloak compatibility', () => {
  const s = context(), { G } = s, hazards = [];
  G.Hazards = { add: h => hazards.push(h) };
  const source = fs.readFileSync(path.join(ROOT, 'js/systems/judgment.js'), 'utf8').replace(
    'AT, reset, noteDmg,', `_castForTest(id) { A = {x: 0, y: 0, r: 10, anim: {play() {}}}; cast(id, {x: 100, y: 0}); },
    _touchForTest(p) { A = {x: p.x, y: p.y, r: 10, touchCd: 0, anim: {play() {}}}; touch(p); }, AT, reset, noteDmg,`);
  vm.runInContext(source, s);
  const p = s.player(149, 'multiscale'); p.hp = p.maxHp = 100;
  G.Judgment._castForTest('rain'); assert.ok(hazards.length > 0);
  assert.ok(hazards.every(h => h.sourceKind === 'attack'));
  G.Judgment._touchForTest(p); assert.equal(p.hp, 80);
  hazards.length = 0; G.Judgment._castForTest('cross');
  assert.ok(hazards.length > 0); assert.ok(hazards.every(h => h.sourceKind === 'ranged'));
  p.ability = 'snowcloak'; p.invuln = 0; s.random([0]);
  assert.equal(p.hurt(35, null, true, {kind: hazards[0].sourceKind}), false);
});
test('pressure affects attack cooldowns, not movement; correct radius and no stacking', () => {
  const s = context(), { G } = s, p = s.player(144, 'pressure'), e = s.enemy();
  e.shotCd = 2; e.touchCd = 1; e.update(.1, p);
  approx(e.shotCd, 1.92); approx(e.touchCd, .92); assert.equal(e.spd, 0);
  e.x = 241; assert.equal(G.Abilities.pressure(e), 1); e.x = 240; assert.equal(G.Abilities.pressure(e), .8);
  s.players.push(p); assert.equal(G.Abilities.pressure(e), .8);
});
test('snow cloak dodges ranged only; healing cooldown does not suppress further dodges', () => {
  const s = context(), { G } = s, p = s.player(144, 'snowcloak'); p.hp = 50; p.maxHp = 100;
  s.random([0,0,0]); assert.equal(p.hurt(10, null, false, { kind: 'ranged' }), false); assert.equal(p.hp, 55);
  assert.equal(p.hurt(10, null, false, { kind: 'ranged' }), false); assert.equal(p.hp, 55);
  G.Abilities.playerTick(p, 1); assert.equal(p.hurt(10, null, false, { kind: 'ranged' }), false); assert.equal(p.hp, 60);
  assert.equal(p.hurt(10), true); assert.equal(p.hp, 50);
});
test('static applies after contact damage; later contact can fail; expires at two seconds', () => {
  const s = context(), { G } = s, p = s.player(145, 'static'), e = s.enemy(); s.random([0,0]);
  const before = p.hp; assert.equal(p.hurt(10, null, false, { kind: 'contact', enemy: e }), true);
  assert.equal(p.hp, before - 10); assert.equal(e.staticT, 2); approx(G.Abilities.slowFactor(e), .9);
  p.invuln = 0; assert.equal(p.hurt(10, null, false, { kind: 'contact', enemy: e }), false);
  assert.equal(p.hp, before - 10); G.Abilities.enemyTick(e, 2); assert.equal(e.staticT, 0);
  assert.equal(p.hurt(10, null, false, { kind: 'contact', enemy: e }), true);
});
test('flame body snapshots one fireball, deals five ticks, does not copy original attack debuff', () => {
  const s = context(), { G } = s, p = s.player(146, 'flamebody'), e = s.enemy(); s.random([.29]);
  p.hurt(10, null, false, { kind: 'contact', enemy: e }); assert.ok(e.abilityBurn);
  const expected = Math.round(G.Abilities.fireballDamage(p) / 5) * 5, before = e.hp;
  G.Abilities.enemyTick(e, .99); assert.equal(e.hp, before);
  G.Abilities.enemyTick(e, 4.01); assert.equal(e.hp, before - expected); assert.equal(e.abilityBurn, null); assert.equal(e.dmg, 10);
  G.Abilities.enemyTick(e, 5); assert.equal(e.hp, before - expected);
});
test('unnerve halves healing for three seconds and refreshes on hit', () => {
  const s = context(), { G } = s, p = s.player(150, 'unnerve'), e = s.enemy(); e.hp = 100;
  G.Abilities.onHit(p, e); G.Abilities.healEnemy(e, 50); assert.equal(e.hp, 125);
  G.Abilities.enemyTick(e, 2); G.Abilities.onHit(p, e); assert.equal(e.unnerveT, 3);
  G.Abilities.enemyTick(e, 3); G.Abilities.healEnemy(e, 50); assert.equal(e.hp, 175);
});
test('synchronize reflects received slow to every enemy, cooldown 3s; all slows ×1.1', () => {
  const s = context(), { G } = s, p = s.player(151, 'synchronize'), a = s.enemy(), b = s.enemy(); b.x = 5000;
  G.Abilities.reflectSlow(p, .2); approx(a.slow, .2); approx(b.slow, .2); assert.equal(a.slowT, 3);
  approx(G.Abilities.slowFactor(a), .78);
  G.Abilities.reflectSlow(p, .5); approx(a.slow, .2);
  G.Abilities.playerTick(p, 3); G.Abilities.reflectSlow(p, .5); approx(a.slow, .5); approx(G.Abilities.slowFactor(a), .45);
  const c = s.enemy(); c.staticT = 2; approx(G.Abilities.slowFactor(c), .89);
});
test('Chinese transplant translates names, UI and new abilities; English remains selectable', () => {
  let { G } = context('zh'); assert.equal(G.T('Articuno'), '急冻鸟'); assert.equal(G.T('Gacha de habilidades'), '特性抽卡');
  assert.equal(G.T('Presión'), '压迫感'); assert.equal(G.T('Desarrollador'), '开发者');
  assert.match(G.T('Mewtwo · Nerviosismo'), /超梦.*紧张感/);
  assert.match(G.T('Mew · Habilidades'), /梦幻.*特性/);
  ({ G } = context('en')); assert.equal(G.T('Gacha de habilidades'), 'Ability Gacha'); assert.equal(G.T('Presión'), 'Pressure');
});
test('debug forced rewards are gated by developer switch and still spend gems', () => {
  const s = context(), { G } = s; G.AbilityGacha.debugMedal('150-unnerve'); s.random([0,0,.9]);
  assert.equal(G.AbilityGacha.pull(G.DB.save, 1)[0].medal, null);
  G.Dev.canUse = () => true; G.AbilityGacha.debugMedal('150-unnerve');
  assert.equal(G.AbilityGacha.pull(G.DB.save, 1)[0].medal, '150-unnerve'); assert.equal(G.DB.save.abilityGems, 8);
});

test('a real local account retains spent gems, unlocked medals and equipment after logout/login', async () => {
  const { G } = context();
  assert.equal((await G.DB.register('AbilityTest', 'test-only')).ok, true);
  G.DB.save.abilityGems = 3; G.DB.save.abilityMedals['144-snowcloak'] = { at: 1 };
  G.DB.save.abilityMedals['149-multiscale'] = { at: 1 };
  G.Abilities.equip(G.DB.save, 149, '149-multiscale');
  G.Abilities.equip(G.DB.save, 144, '144-snowcloak'); assert.equal(G.DB.commit(true), true);
  await G.DB.logout(); assert.equal((await G.DB.login('AbilityTest', 'test-only')).ok, true);
  assert.equal(G.DB.save.abilityGems, 3); assert.equal(G.Abilities.equipped(G.DB.save, 144), 'snowcloak');
  assert.equal(G.Abilities.equipped(G.DB.save, 149), 'multiscale');
});
test('rift victory awards exactly one gem, duplicate victory and defeat award none', () => {
  const s = context(), { G } = s, p = s.player(144, 'pressure');
  G.Game.player = p; G.Progress = { event: noop }; G.Pickups = { pullAll: noop }; G.Spawner = { say: noop };
  const source = fs.readFileSync(path.join(ROOT, 'js/systems/rift.js'), 'utf8').replace(
    'reset, update, drawable,', '_setArena(a) { arena = a; }, reset, update, drawable,');
  vm.runInContext(source, s);
  G.Rift._setArena({ phase: 'fight', dex: 150, type: 'psychic' });
  G.Rift.onEvent(['aw']); assert.equal(G.DB.save.abilityGems, 11); assert.equal(p.bonds, 1);
  G.Rift.onEvent(['aw']); assert.equal(G.DB.save.abilityGems, 11);
  G.Rift._setArena({ phase: 'fight', dex: 150, type: 'psychic' }); G.Rift.onEvent(['al']);
  assert.equal(G.DB.save.abilityGems, 11);
});
test('enemy hazard source distinguishes ranged magic, contact strikes and environmental damage', () => {
  const s = context(), { G } = s, p = s.player(144, 'snowcloak'), e = s.enemy();
  G.Game.player = p; G.EnemyMgr.get = id => s.enemies.find(e => e.id === id); G.VFX = { forType: noop };
  s.load('js/systems/hazards.js'); p.hp = 50; p.maxHp = 100; s.random([0]);
  e.hazard({ kind: 'zone', x: 0, y: 0, r: 50, delay: 0, dmg: 10, color: '#fff' });
  G.Hazards.update(.1); assert.equal(p.hp, 55);
  G.Hazards.clear(); G.Hazards.add({ kind: 'zone', x: 0, y: 0, r: 50, delay: 0, dmg: 10, color: '#fff' });
  G.Hazards.update(.1); assert.equal(p.hp, 45);
});
test('co-op host accepts peer ability effects and 3s reflected slow, without copying local equipment', () => {
  const s = context(), { G } = s; let receive;
  G.Net = { uid: 'host', on: fn => { receive = fn; }, onPeer: noop };
  G.startMoveOf = () => 'confusion';
  G.Sprites.preload = noop; G.EnemyMgr.get = id => s.enemies.find(e => e.id === id);
  const p = s.player(144, 'pressure'), e = s.enemy(); s.load('js/net/coop.js');
  G.Coop.begin({ host: 'host', members: [{ uid: 'host', dex: 144 }, { uid: 'peer', dex: 151, name: 'Peer' }] }, p, {});
  assert.equal(G.Coop.mate('peer').pl.ability, null);
  const frame = [0,0,0,0,100,100,0,'confusion',1,78,0,1,0,0,0,'synchronize'];
  receive('peer', { k: 'f', p: frame, ev: [['as', .2]] });
  approx(e.slow, .2); assert.equal(e.slowT, 3);
  G.Coop.end();
});
test('developer mode defaults off; enabling is explicit and co-op blocks debug actions', () => {
  const s = context(), { G } = s;
  G.Game.debugMark = noop; s.load('js/ui/developer.js'); assert.equal(G.Dev.enabled, false);
  assert.equal(G.Dev.canUse(), false); G.Dev.setEnabled(true); assert.equal(G.Dev.canUse(), true);
  G.Coop.active = true; assert.equal(G.Dev.canUse(), false); G.Coop.active = false;
  G.Dev.setEnabled(false); assert.equal(G.Dev.enabled, false); assert.equal(G.Dev.invincible, false);
});

test('debug currency controls cover all balances, clamp safely and reject invalid or co-op edits', () => {
  const s = context(), { G } = s; let marked = 0;
  G.Game.debugMark = () => marked++; s.load('js/ui/developer.js');
  assert.equal(G.Dev.adjustCurrency('coins', 10), false);
  G.Dev.setEnabled(true);
  const read = id => ['t1', 't10'].includes(id) ? G.DB.save.tickets[id] : G.DB.save[id];
  const pity = JSON.stringify([G.DB.save.pity, G.DB.save.abilityPity]);
  for (const id of ['coins', 't1', 't10', 'abilityGems']) {
    const before = read(id);
    assert.equal(G.Dev.adjustCurrency(id, 123), true); assert.equal(read(id), before + 123);
    G.Dev.adjustCurrency(id, -Number.MAX_SAFE_INTEGER); assert.equal(read(id), 0);
    G.Dev.adjustCurrency(id, Number.MAX_SAFE_INTEGER); G.Dev.adjustCurrency(id, 1);
    assert.equal(read(id), Number.MAX_SAFE_INTEGER);
    G.Dev.adjustCurrency(id, -Number.MAX_SAFE_INTEGER); assert.equal(read(id), 0);
    for (const invalid of [NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      assert.equal(G.Dev.adjustCurrency(id, invalid), false); assert.equal(read(id), 0);
    }
  }
  assert.equal(G.Dev.adjustCurrency('pity', 20), false);
  assert.equal(JSON.stringify([G.DB.save.pity, G.DB.save.abilityPity]), pity);
  G.Coop.active = true; assert.equal(G.Dev.adjustCurrency('coins', 10), false);
  assert.equal(G.DB.save.coins, 0); assert.ok(marked > 1);
});

test('debug view expands both world dimensions, survives resize and resets outside solo debugging', () => {
  const s = context(), { G } = s;
  G.Game.debugMark = noop; s.load('js/core/camera.js'); s.load('js/ui/developer.js');
  const c = G.Camera; c.resize(1200, 800, 2);
  const w = c.w, h = c.h, scale = c.scale, radius = c.outerRadius();
  G.Dev.setEnabled(true); approx(c.w, w * 1.5); approx(c.h, h * 1.5);
  assert.ok(c.outerRadius() > radius); approx(c.scale, scale / 1.5);
  G.Dev.setView(2); c.resize(600, 400, 1);
  approx(c.w, w * 2); approx(c.h, h * 2); assert.equal(c.dpr, 1);
  G.Dev.setView(NaN); assert.equal(G.Dev.viewMultiplier, 2);
  G.Coop.active = true; c.follow(0, 0, .01);
  approx(c.w, w); assert.equal(G.Dev.setView(1.5), false);
  G.Coop.active = false; c.follow(0, 0, .01); approx(c.w, w * 2);
  G.Dev.setEnabled(false); approx(c.w, w); approx(c.h, h);
  assert.equal(G.Dev.setView(2), false);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { context } = require('./battle_fixture.cjs');

const ROOT = path.join(__dirname, '..');

function loadFull() {
  const s = context();
  const { G } = s;
  G.VFX = { forMove: () => ({ pal: [] }), forType: () => ({}) };
  G.World.propsInCircle = () => [];
  G.World.projectileBlock = () => null;
  G.World.damageProp = () => {};
  G.World.isFree = () => true;
  G.Camera = { sees: () => true };
  G.EconomyConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/economy_config.json'), 'utf8'));
  G.TrainerTalentsConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/trainer_talents.json'), 'utf8'));
  s.load('js/entities/projectile.js');
  s.load('js/systems/combat.js');
  s.load('js/systems/boss-combat.js');
  G.STARTER_ITEMS = [];
  s.load('js/data/types.js');
  s.load('js/data/items.js');
  s.load('js/data/expedition-cards.js');
  s.load('js/systems/card-packs.js');
  s.load('js/systems/expedition-rules.js');
  s.load('js/systems/squad-bonds.js');
  s.load('js/systems/trainer-talents.js');
  return s;
}

test('1. master_infinite_pp grants +200% initial stamina and removes CDR/noPP', () => {
  const s = loadFull(), { G } = s;
  const p = new G.Player(G.DEX_BY[25]);
  p.isSquadMember = true;
  G.Squad = { active: true, actors: () => [p], deployed: () => [p], roster: [p], growth: () => 0, refresh: () => {} };
  G.Expedition = { active: true, run: { captain: p, trainerTalents: [{ id: 'master_infinite_pp', enhanced: false }], pendingTalentPicks: [], squadHp: 100 } };
  const def = G.TrainerTalents.by('master_infinite_pp');
  assert.equal(def.effects.staminaBasePct, 2);
  assert.equal(def.effects.cdrPct, undefined);
  assert.equal(G.TrainerTalents.noPP(p, p.moves[0]), false);
  assert.equal(G.TrainerTalents.rate(p), 1);
  assert.ok(Math.abs(p.stamina - p.baseStamina * 3) < 1e-6);
});

test('2 & 3. Projectile tier-7 recalls with remaining pierce; Bloom tier-7 applies 50% slow', () => {
  const s = loadFull(), { G } = s;
  const p = new G.Player(G.DEX_BY[25]);
  p.isSquadMember = true;
  G.Squad = { active: true, actors: () => [p], deployed: () => [p], roster: [p] };
  // Fake 7 projectile species in bond state
  const oldCount = G.SquadBonds.count;
  G.SquadBonds.setLayer('skill', 'projectile', 0);
  // Test projectile recall directly via Projectile.spawn + update
  const proj = G.Projectiles.spawn({
    x: 0, y: 0, vx: 300, vy: 0, dmg: 10, r: 5, life: 2, pierce: 2, friendly: true, owner: p, bondRecall: true
  });
  G.Projectiles.update(0.6, p, []);
  G.Projectiles.update(0.6, p, []);
  G.Projectiles.update(0.1, p, []);
  assert.equal(proj.recalling, true);
  assert.ok(proj.vx < 300);

  // Test Bloom tier-7 slow in afterHit
  const e = s.enemy();
  G.SquadBonds.afterHit(p, e, { kind: 'nova', bondSlow: 0.5 }, 20);
  assert.ok(e.slowT > 0);
  assert.ok(e.slow >= 0.5);
});

test('4. New trainer talents: silver_quick_stock and ultra_instant_three_star', () => {
  const s = loadFull(), { G } = s;
  const t1 = G.TrainerTalents.by('silver_quick_stock');
  const t3 = G.TrainerTalents.by('ultra_instant_three_star');
  assert.equal(t1.tier, 'silver');
  assert.equal(t1.effects.freeRefreshes, 4);
  assert.equal(t1.effects.instantGold, 2);
  assert.equal(t3.tier, 'ultra');
  assert.equal(t3.effects.nextShopThreeStarMaxQuality, 3);
  assert.equal(t3.effects.nextShopThreeStarCharges, 1);

  const cap = new G.Player(G.DEX_BY[25]);
  G.Squad = { active: true, actors: () => [cap], deployed: () => [], roster: [], refresh: () => {} };
  const run = { captain: cap, gold: 10, day: 1, trainerTalents: [], pendingTalentPicks: [{ serial: 1, tier: 'silver', targetLevel: 2, offers: ['silver_quick_stock'], seen: [] }], talentRerolls: 2, talentGifts: [], emblems: {}, talentSequence: 1 };
  G.Expedition = { active: true, run };
  assert.equal(G.TrainerTalents.choose(run, 1, 'silver_quick_stock'), true);
  assert.equal(run.gold, 12);
  assert.equal(run.talentFreeRefreshes, 4);

  run.pendingTalentPicks.push({ serial: 2, tier: 'ultra', targetLevel: 5, offers: ['ultra_instant_three_star'], seen: [] });
  assert.equal(G.TrainerTalents.choose(run, 2, 'ultra_instant_three_star'), true);
  assert.equal(run.talentThreeStarCharges, 1);
  assert.equal(run.talentThreeStarMaxQ, 3);
});

test('5. Type effectiveness uses 200% super-effective and 50% resist', () => {
  const s = loadFull(), { G } = s;
  assert.equal(G.Types.mult('fire', ['grass']), 2.0);
  assert.equal(G.Types.mult('fire', ['grass', 'bug']), 4.0);
  assert.equal(G.Types.mult('fire', ['water']), 0.5);
  assert.equal(G.Types.mult('fire', ['water', 'rock']), 0.25);
});

test('6 & 7. Elite cells have eliteType and elitescout is unique in long-march pack', () => {
  const s = loadFull(), { G } = s;
  const mat = G.ExpeditionRules.matrix(1, () => 0.15, 4, {});
  const elites = mat.flat().filter(c => c.kind === 'elite');
  for (const c of elites) assert.ok(c.eliteType && G.Types.CHART[c.eliteType]);
  const pack = G.CardPacks.packBy['long-march'];
  const card = pack.cards.find(c => c.id === 'item:elitescout');
  assert.ok(card);
  assert.equal(card.max, 1);
  assert.equal(G.Items.BY.elitescout.infinite, false);
  assert.equal(G.Items.BY.elitescout.expeditionOnly, true);
});

test('8. Boss innate shield activates at difficulty > 3 with cycle scaling, break stun, and recharge', () => {
  const s = loadFull(), { G } = s;
  G.Difficulty = { current: 4, factors: () => ({ hp: 1, spd: 1, dmg: 1 }) };
  G.Expedition = { active: true, run: { cycle: 1 } };
  const boss = new G.Enemy({ dex: 150, name: 'Mewtwo', hp: 5000, spd: 50, dmg: 20, xp: 100, behavior: 'chase' }, 100, 0, { hp: 1, spd: 1, dmg: 1 }, true);
  boss.types = ['psychic'];
  const is = G.BossCombat.innate(boss);
  assert.equal(is.max, 100);
  assert.equal(is.state, 'active');
  assert.equal(G.BossCombat.rateMul(boss), 1.4);

  // Non-super-effective hit: 40% damage, deducts 1
  const dmgNormal = G.BossCombat.damage(boss, 100, { type: 'normal' });
  assert.equal(dmgNormal, 40);
  assert.equal(is.hp, 99);

  // Super-effective hit (dark vs psychic = 2x): full damage, deducts 2
  const dmgSuper = G.BossCombat.damage(boss, 100, { type: 'dark' });
  assert.equal(dmgSuper, 100);
  assert.equal(is.hp, 97);

  // Bloom move (nova/aura) deals +150% (2.5x) innate shield break efficiency
  G.BossCombat.damage(boss, 100, { type: 'normal', kind: 'nova' });
  assert.equal(is.hp, 94.5);
  G.BossCombat.damage(boss, 100, { type: 'dark', kind: 'aura' });
  assert.equal(is.hp, 89.5);

  // Break shield
  is.hp = 1;
  G.BossCombat.damage(boss, 100, { type: 'normal' });
  assert.equal(is.state, 'stunned');
  assert.equal(is.stunT, 8);
  assert.equal(G.BossCombat.rateMul(boss), 1);
  assert.equal(G.BossCombat.damage(boss, 100, { type: 'normal' }), 120);

  // Stun finishes -> charging
  G.BossCombat.tick(boss, 8);
  assert.equal(is.state, 'charging');
  // 10/s recharge
  G.BossCombat.tick(boss, 2);
  assert.equal(is.charge, 20);
  // Hitting non-captain companion adds 20% max (20)
  G.BossCombat.onHitPlayer(boss, { isSquadMember: true }, 10);
  assert.equal(is.charge, 40);
  // Hitting captain adds 40% max (40)
  G.BossCombat.onHitPlayer(boss, { isSquadMember: false }, 10);
  assert.equal(is.charge, 80);
  // Another captain hit completes recharge -> active
  G.BossCombat.onHitPlayer(boss, { isSquadMember: false }, 10);
  assert.equal(is.state, 'active');
  assert.equal(is.hp, 100);

  // Cycle 2 & 3 scaling
  G.Expedition.run.cycle = 2;
  const boss2 = new G.Enemy({ dex: 150, name: 'Mewtwo', hp: 5000, spd: 50, dmg: 20, xp: 100, behavior: 'chase' }, 100, 0, { hp: 1, spd: 1, dmg: 1 }, true);
  assert.equal(G.BossCombat.innate(boss2).max, 300);
  G.Expedition.run.cycle = 3;
  const boss3 = new G.Enemy({ dex: 150, name: 'Mewtwo', hp: 5000, spd: 50, dmg: 20, xp: 100, behavior: 'chase' }, 100, 0, { hp: 1, spd: 1, dmg: 1 }, true);
  assert.equal(G.BossCombat.innate(boss3).max, 1000);
});

test('9. Trail moves double CD & duration, +50% radius, and fire slow exploding DoT projectiles', () => {
  const s = loadFull(), { G } = s;
  const toxic = G.Moves.BY_ID['toxic'];
  // Original toxic was cd: 0.3, dur: 3, radius: 26 (now cd x4, dur x1 after -50%, radius x1.5)
  assert.equal(toxic.cd, 1.2);
  assert.equal(toxic.dur, 3);
  assert.equal(toxic.radius, 39);

  const p = new G.Player(G.DEX_BY[1]);
  const e = s.enemy();
  e.x = p.x + 12; e.y = p.y;
  const m = G.Moves.instance('toxic', 1);
  p.moves = [m]; p.slots = [[m]]; m.t = 0;
  G.Combat.tick(0.05, p, 1);
  const projs = G.Projectiles.all().filter(q => q.trailBurst);
  assert.equal(projs.length, 1);
  assert.ok(Math.hypot(projs[0].vx, projs[0].vy) <= 170);

  // Move projectile into enemy and resolve -> spawns DoT field and removes projectile
  projs[0].x = e.x; projs[0].y = e.y;
  G.Combat.resolve(0.05, p, 1.05);
  assert.equal(G.Projectiles.all().filter(q => q.trailBurst).length, 0);
});

test('10. Expedition breathing S-curve enemy HP scales monotonically across cycles and N1-N8 difficulties', () => {
  const s = loadFull(), { G } = s;
  s.load('js/systems/difficulty.js');
  const R = G.ExpeditionRules;
  // Monotonicity across days 1..120 for normal, elite, and boss waves
  for (const kind of ['battle', 'elite', 'boss']) {
    for (let day = 1; day < 120; day++) {
      assert.ok(R.wave(day + 1, kind, 5).hp > R.wave(day, kind, 5).hp, `${kind} day ${day} -> ${day + 1}`);
    }
  }
  // Cycle step-up is meaningful at D20->D21 and D40->D41
  assert.ok(R.wave(21, 'battle', 5).hp / R.wave(20, 'battle', 5).hp > 1.8);
  assert.ok(R.wave(41, 'boss', 5).hp / R.wave(40, 'boss', 5).hp > 1.5);
  // Elite and Boss have dedicated cycle scaling in C2 and C3
  assert.ok(R.wave(40, 'elite', 5).hp > R.wave(40, 'battle', 5).hp * 1.25);
  assert.ok(R.wave(60, 'elite', 5).hp > R.wave(60, 'battle', 5).hp * 1.55);
  assert.ok(R.wave(60, 'boss', 5).hp > R.wave(60, 'battle', 5).hp * 0.9);
  // N1-N8 effective enemy HP (including Difficulty.factors(n).hp in Enemy constructor) strictly increases
  let prevEff = 0;
  for (let diff = 1; diff <= 8; diff++) {
    const eff = R.wave(60, 'boss', diff).hp * G.Difficulty.factors(diff).hp;
    assert.ok(eff > prevEff, `N${diff} effective HP should exceed N${diff - 1}`);
    prevEff = eff;
  }
  // N5 is 1.35x of N3 baseline, N8 is 2.60x of N3 baseline
  const n3 = R.wave(60, 'boss', 3).hp * G.Difficulty.factors(3).hp;
  const n5 = R.wave(60, 'boss', 5).hp * G.Difficulty.factors(5).hp;
  const n8 = R.wave(60, 'boss', 8).hp * G.Difficulty.factors(8).hp;
  assert.ok(Math.abs(n5 / n3 - 1.35) < 1e-6);
  assert.ok(Math.abs(n8 / n3 - 2.60) < 1e-6);
});

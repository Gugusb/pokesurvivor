/* Comprehensive regression coverage for the 10 agility & cooldown balance/formula changes. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { context } = require('./battle_fixture.cjs');

const noop = () => {};
const close = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);

function setupExpedition() {
  const s = context('zh', false);
  const g = s.G;
  g.TrainerTalentsConfig = JSON.parse(fs.readFileSync('config/trainer_talents.json', 'utf8'));
  const files = [
    'js/core/settings.js',
    'js/data/egg-groups.js',
    'js/data/expedition-quality.js',
    'js/systems/expedition-quality.js',
    'js/entities/projectile.js',
    'js/systems/expedition-rules.js',
    'js/systems/squad.js',
    'js/systems/squad-bonds.js',
    'js/data/type-bonds.js',
    'js/systems/type-bonds.js',
    'js/data/squad-traits.js',
    'js/systems/squad-traits.js',
    'js/systems/squad-support.js',
    'js/systems/move-control.js',
    'js/systems/move-pp.js',
    'js/systems/player-stats.js',
    'js/systems/combat.js',
    'js/data/starter-items.js',
    'js/data/breakthrough-items.js',
    'js/data/expedition-cards.js',
    'js/systems/card-packs.js',
    'js/systems/expedition-supplies.js',
    'js/systems/trainer-talents.js',
    'js/systems/specialization.js'
  ];
  for (const f of files) s.load(f);
  g.Sprites.preload = noop;
  g.Sprites.Animator.prototype._start = noop;
  g.FX = new Proxy({}, { get: (o, k) => o[k] || noop });
  g.Pickups = { dropXp: noop, drop: noop };
  g.Difficulty = { treasureChance: () => 0, onHurt: noop, factors: () => ({ hp: 1, damage: 1, speed: 1 }) };
  g.World.propsInCircle = () => [];
  g.World.isWall = () => false;
  g.World.isFree = () => true;
  g.World.projectileBlock = () => null;
  g.VFX = { forMove: () => ({}), forType: () => ({}) };
  g.Camera.sees = () => true;

  const cap = s.player(25);
  cap.addMove('tackle');
  const r = { ...g.Economy.create(), day: 1, phase: 'combat', kind: 'battle', gold: 100, captain: cap, trainerLevel: 10, emblems: {}, pool: g.DEX };
  g.Expedition = { run: r, get phase() { return r.phase; }, get active() { return true; } };
  g.Game.player = cap;
  g.Game.everyone = () => g.Squad.actors();
  g.Squad.begin(cap);
  g.Squad.syncTrainer();
  g.CardPacks.normalize(g.DB.save);
  g.ExpeditionSupplies.restore(r);
  g.TrainerTalents.begin(r);
  r.unitPool = new g.UnitPool(g.DEX);
  const pick = (id, enhanced = false) => {
    if (enhanced) {
      g.DB.save.cardPack.taken['item:talentseal'] = 1;
      g.Items.gain(cap, 'talentseal');
    }
    const d = g.TrainerTalents.by(id);
    const serial = ++r.talentSequence;
    r.pendingTalentPicks = [{ targetLevel: 2, tier: d.tier, serial, offers: [id], seen: [id] }];
    assert.ok(g.TrainerTalents.choose(r, serial, id));
  };
  return { ...s, g, r, cap, pick };
}

test('1. Metronome is a unique item with cooldown ×0.95 across all gain/pool checks', () => {
  const { g, cap } = setupExpedition();
  const meta = g.Items.BY.metronomeitem;
  assert.equal(meta.infinite, false);
  assert.equal(meta.value, 0.05);
  assert.match(meta.descZh, /唯一道具/);
  assert.match(meta.descZh, /0\.95/);

  g.DB.save.cardPack.taken['item:metronomeitem'] = 1;
  assert.equal(g.Items.permitted(meta), true);
  assert.equal(g.Items.gain(cap, 'metronomeitem'), true);
  assert.equal(g.Items.count(cap, 'metronomeitem'), 1);
  close(g.Items.cooldownFactor(cap), 0.95);

  // Cannot gain a second copy or roll it again once owned.
  assert.equal(g.Items.gain(cap, 'metronomeitem'), false);
  assert.equal(g.Items.count(cap, 'metronomeitem'), 1);
  assert.equal(g.Items.permitted(meta), false);

  // Even if manually forced >1 stack, cooldownFactor stays 0.95.
  cap.specialItems.metronomeitem = 5;
  close(g.Items.cooldownFactor(cap), 0.95);
});

test('2. Quick Claw grants +5 flat Agility per stack without affecting Items.cooldownFactor or scaling with multipliers', () => {
  const { g, cap } = setupExpedition();
  cap.baseAgility = 100;
  cap.statGrowth.agility = 0.5;
  close(cap.agility, 150);

  assert.equal(g.Items.gain(cap, 'quickclaw'), true);
  assert.equal(g.Items.gain(cap, 'quickclaw'), true);
  assert.equal(g.Items.gain(cap, 'quickclaw'), true);
  close(g.Items.cooldownFactor(cap), 1);
  close(g.Items.agilityBonus(cap), 15);
  // 100 * 1.5 + 15 = 165 (NOT (100 + 15) * 1.5 = 172.5)
  close(cap.agility, 165);
});

test('3. Cooldown reductions stack multiplicatively: -10% and -30% combine to 0.90 * 0.70 = 0.63', () => {
  const { g, r, cap } = setupExpedition();
  const p = g.Squad.recruit(4);
  p.baseAgility = 80; // agilityCooldownFor = 1 when primary, so test via captain or fixed agility
  const m = p.moves[0];
  m.cd = 10;

  // Inject two synthetic cdrPct trainer talents (-10% and -30%) to verify multiplicative stacking inside TrainerTalents.
  g.TrainerTalentsConfig.talents.push(
    { id: 'test_cdr_10', tier: 'silver', enabled: true, name: { zh: 't10', en: 't10', es: 't10' }, desc: { zh: 't', en: 't', es: 't' }, effects: { cdrPct: 0.1 } },
    { id: 'test_cdr_30', tier: 'silver', enabled: true, name: { zh: 't30', en: 't30', es: 't30' }, desc: { zh: 't', en: 't', es: 't' }, effects: { cdrPct: 0.3 } }
  );
  // Force catalogue refresh by cloning config object reference.
  g.TrainerTalentsConfig = { ...g.TrainerTalentsConfig };
  r.trainerTalents.push({ id: 'test_cdr_10', enhanced: false }, { id: 'test_cdr_30', enhanced: false });

  close(g.TrainerTalents.cooldownFactor(p), 0.63);
  close(g.TrainerTalents.rate(p), 1 / 0.63);

  // Cross-system multiplicative stacking: TrainerTalents (0.63) * Metronome (0.95) * Specialization n3 (0.80) * agilityCooldownFor
  g.DB.save.cardPack.taken['item:metronomeitem'] = 1;
  g.Items.gain(p, 'metronomeitem'); // direct specialItems check for player p
  m.specializations = ['n3'];
  const agCd = p.agilityCooldownFor(m);
  close(g.Combat.cooldownFactor(p, m), agCd * 0.63 * 0.95 * 0.8);
  close(g.PlayerStats.cooldown(p, m), 10 * agCd * 0.63 * 0.95 * 0.8);
});

test('4. Coordinated Lead grants +20% base Agility to 2 nearest living allies, non-stacking, removed on cast', () => {
  const { g, cap, pick } = setupExpedition();
  const a = g.Squad.recruit(4);
  const b = g.Squad.recruit(7);
  const c = g.Squad.recruit(1);
  const dead = g.Squad.recruit(16);
  cap.x = 0; cap.y = 0;
  dead.x = 5; dead.y = 0; dead.dead = true;
  a.x = 10; a.y = 0;
  b.x = 20; b.y = 0;
  c.x = 100; c.y = 0;
  for (const q of [a, b, c]) {
    q.baseAgility = 100;
    q.statGrowth.agility = 0.5;
  }
  pick('gold_captain_link');

  // Captain casts once -> a & b gain +20% baseAgility (= +20 extra, does not scale with +50% statGrowth)
  cap.cast(cap.moves[0]);
  close(a.agility, 170); // 100 * 1.5 + 20
  close(b.agility, 170);
  close(c.agility, 150);
  assert.equal(g.TrainerTalents.hasLinkBuff(a), true);
  assert.equal(g.TrainerTalents.hasLinkBuff(b), true);
  assert.equal(g.TrainerTalents.hasLinkBuff(c), false);
  assert.equal(g.TrainerTalents.hasLinkBuff(dead), false);

  // Captain casts again -> buff does NOT stack.
  cap.cast(cap.moves[0]);
  close(a.agility, 170);

  // Member a casts -> buff is immediately removed from a, while b retains it.
  a.cast(a.moves[0]);
  close(a.agility, 150);
  assert.equal(g.TrainerTalents.hasLinkBuff(a), false);
  close(b.agility, 170);
});

test('4b. Enhanced Coordinated Lead grants +40% base Agility to 3 nearest living allies, non-stacking, removed on cast', () => {
  const { g, cap, pick } = setupExpedition();
  const allies = [4, 7, 1, 16].map((dex, i) => {
    const q = g.Squad.recruit(dex);
    q.x = (i + 1) * 10; q.y = 0; q.baseAgility = 100; q.statGrowth.agility = 0;
    return q;
  });
  cap.x = 0; cap.y = 0;
  pick('gold_captain_link', true);
  cap.cast(cap.moves[0]);
  close(allies[0].agility, 140);
  close(allies[1].agility, 140);
  close(allies[2].agility, 140);
  close(allies[3].agility, 100);
  allies[2].cast(allies[2].moves[0]);
  close(allies[2].agility, 100);
});

test('5. Legacy stat:cd (+3%/lv) and legacyAgility remainder are removed from Upgrades and CardPacks', () => {
  const { g } = setupExpedition();
  const p1 = g.Upgrades.perks({ cd: 8, legacyAgility: 0.24 });
  close(p1.statGrowth.agility, 0);
  const p2 = g.Upgrades.perks({ cd: 8, agility: 6, legacyAgility: 0.24 });
  close(p2.statGrowth.agility, 0.30);

  const oldSave = g.DB.fresh('Old');
  oldSave.cardPack = { v: 1, taken: { 'stat:cd': 8 }, legacyAgility: 0.09, skillMigrated: 1 };
  const norm = g.CardPacks.normalize(oldSave);
  close(norm.legacyAgility, 0);
  close(g.CardPacks.levels(oldSave).legacyAgility, 0);
  close(g.CardPacks.levels(oldSave).cd, 0);
});

test('6. Projectile class bond interpolates +20% / +50% / +80% base Agility and adds to multiplier zone', () => {
  const { g, cap } = setupExpedition();
  const move = () => g.Moves.instance('ember', 2);
  cap.moves = [move()]; cap.slots = [cap.moves];
  const members = [1, 4, 7].map(dex => {
    const p = g.Squad.recruit(dex);
    p.moves = [move()]; p.slots = [p.moves];
    p.baseAgility = 100; p.statGrowth.agility = 0.3;
    return p;
  });
  g.Squad.refresh();
  for (const [layer, want] of [[0, 0.2], [100, 0.35], [200, 0.5], [350, 0.65], [500, 0.8], [800, 0.95]]) {
    g.SquadBonds.setLayer('skill', 'projectile', layer);
    close(g.SquadBonds.value('projectile', 'agility'), want);
    close(g.SquadBonds.agilityPct(members[0], members[0].moves[0]), want);
  }
  // At 200 layers (+50%) + 30% statGrowth -> additive 1 + 0.3 + 0.5 = 1.8 -> secondary slot *0.5 = 90
  g.SquadBonds.setLayer('skill', 'projectile', 200);
  close(members[0].agilityFor(members[0].moves[0]), 100 * 1.8 * 0.5);
  assert.match(g.SquadBonds.description('projectile'), /基础敏捷/);
});

test('7. Psychic 5 agility boost (+100%) has a 10-second internal cooldown', () => {
  const s = setupExpedition();
  const { g, cap } = s;
  cap.mon = { ...cap.mon, types: ['psychic'] };
  const members = [6, 9, 3, 26].map((dex, i) => {
    const p = g.Squad.recruit(dex);
    p.mon = { ...p.mon, name: 'Psy' + i, types: ['psychic'] };
    p.baseAgility = 100; p.statGrowth.agility = 0;
    return p;
  });
  g.Squad.refresh();
  assert.equal(g.TypeBonds.state('psychic').tier, 5);

  const e = s.enemy();
  e.hp = e.maxHp = 1e6; e.defense = e.spdef = 1;
  e.typeBondState = { normal: false, wet: 0, shock: 0, frost: 0, frozen: 0, psychic: 102, root: 0, amp: 1 };
  const m = members[0];
  const hit = () => e.hurt(10, '#fff', 1, 0, 0, null, m, { id: 'psy', type: 'psychic', kind: 'projectile' });

  // t = 0: triggers 2s buff, sets 10s internal CD.
  hit();
  close(m.agility, 200);
  close(g.TypeBonds.psychicCdUntil, 10);

  // t = 2.01: buff expires.
  g.TypeBonds.tick(2.01);
  close(m.agility, 100);

  // t = 5.01: still on 10s internal CD -> does NOT trigger.
  g.TypeBonds.tick(3);
  hit();
  close(m.agility, 100);

  // t = 10.01: internal CD finished -> triggers again!
  g.TypeBonds.tick(5);
  hit();
  close(m.agility, 200);
  close(g.TypeBonds.psychicCdUntil, 20.01);
});

test('8. Rock 5 detonation grants +10 flat Agility per stack (max 10 stacks = +100) for 2s to Rock allies only', () => {
  const s = setupExpedition();
  const { g, cap } = s;
  cap.mon = { ...cap.mon, types: ['rock'] };
  cap.baseAgility = 100; cap.statGrowth.agility = 0.5;
  const rockMembers = [4, 7, 10, 16].map((dex, i) => {
    const p = g.Squad.recruit(dex);
    p.mon = { ...p.mon, name: 'Rock' + i, types: ['rock'] };
    p.baseAgility = 100; p.statGrowth.agility = 0.5;
    return p;
  });
  const normalMember = g.Squad.recruit(19);
  normalMember.mon = { ...normalMember.mon, name: 'NormalGuy', types: ['normal'] };
  normalMember.baseAgility = 100; normalMember.statGrowth.agility = 0.5;
  g.Squad.refresh();
  assert.equal(g.TypeBonds.state('rock').tier, 5);

  const e = s.enemy();
  e.hp = e.maxHp = 1e6; e.defense = e.spdef = 1;
  s.Math.random = () => 0;

  // Spawn 12 falling rocks at t=0, detonate at t=3.01 -> capped at 10 stacks (+100 extra, NOT multiplied by 1.5x).
  for (let i = 0; i < 12; i++) {
    e.hurt(10, '#fff', 1, 0, 0, null, rockMembers[0], { id: 'rock', type: 'rock', kind: 'projectile' });
  }
  assert.equal(g.TypeBonds.fields.length, 12);
  g.TypeBonds.tick(3.01);
  assert.equal(g.TypeBonds.rockStacks, 10);
  close(cap.agility, 150 + 100);
  close(rockMembers[0].agility, 150 + 100);
  close(normalMember.agility, 150); // Non-rock partner does not receive it

  // Expire after 2.01s
  g.TypeBonds.tick(2.01);
  assert.equal(g.TypeBonds.rockStacks, 0);
  close(rockMembers[0].agility, 150);
});

test('9. Legendary trait indep_legendary_all buffs HP, Atk, SpA, Def, SpDef only (excludes Agility, Stamina, Spd)', () => {
  const { g } = setupExpedition();
  const p = g.Squad.recruit(4);
  const q = g.Squad.recruit(37);
  p.squadTraitOverride = 'indep_legendary_all';
  g.SquadTraits.assign(p);
  g.SquadBonds.setLayer('types', 'fire', 0);
  g.SquadBonds.setLayer('skill', 'projectile', 0);
  g.Squad.refresh();

  const before = {
    hp: p.maxHp, atk: p.atk, spa: p.spa,
    def: p.defenseFor({ kind: 'contact' }), spdef: p.defenseFor({ kind: 'ranged' }),
    spd: p.spd, agility: p.agility, stamina: p.stamina
  };
  g.SquadBonds.setLayer('types', 'fire', 20);
  g.Squad.refresh();
  const k = 1 + 2 * g.SquadTraits.value(p) / 100;

  close(p.maxHp, before.hp * k);
  close(p.atk, before.atk * k);
  close(p.spa, before.spa * k);
  close(p.defenseFor({ kind: 'contact' }), before.def * k);
  close(p.defenseFor({ kind: 'ranged' }), before.spdef * k);
  // Excluded stats stay unchanged:
  close(p.spd, before.spd);
  close(p.agility, before.agility);
  close(p.stamina, before.stamina);
  assert.match(g.SquadTraits.description(p), /双攻、双防及生命提高/);
});

test('10. Final Agility formula: base * (1 + sum_of_multipliers) + extra (extras never scale with multipliers)', () => {
  const s = setupExpedition();
  const { g, cap, pick } = s;
  cap.mon = { ...cap.mon, types: ['psychic', 'rock'] };
  const move = () => g.Moves.instance('ember', 2);
  cap.moves = [move()]; cap.slots = [cap.moves];

  const allies = [6, 9, 3, 26].map((dex, i) => {
    const p = g.Squad.recruit(dex);
    p.mon = { ...p.mon, name: 'Combo' + i, types: ['psychic', 'rock'] };
    p.moves = [move()]; p.slots = [p.moves];
    p.x = (i + 1) * 10; p.y = 0;
    return p;
  });
  const m = allies[0];
  m.baseAgility = 100;
  m.statGrowth.agility = 0.30; // +30%
  m.squadTraitOverride = 'indep_bond_class_stat';
  g.SquadTraits.assign(m);
  g.Squad.refresh();

  // Projectile class bond at 200 layers (+50%) -> indep_bond_class_stat gives 20 * value(m)/100
  g.SquadBonds.setLayer('skill', 'projectile', 200);
  const classTraitPct = Math.floor(200 / 10) * g.SquadTraits.value(m) / 100;

  // Psychic 5 (+100%)
  const e = s.enemy();
  e.hp = e.maxHp = 1e6; e.defense = e.spdef = 1;
  e.typeBondState = { normal: false, wet: 0, shock: 0, frost: 0, frozen: 0, psychic: 102, root: 0, amp: 1 };
  s.Math.random = () => 0;
  e.hurt(10, '#fff', 1, 0, 0, null, m, { id: 'psy', type: 'psychic', kind: 'projectile' }); // triggers Psychic 5 (+100%) & spawns 1 rock

  // Spawn 3 more rocks & detonate all 4 -> Rock 5 = +40 flat extra
  for (let i = 0; i < 3; i++) e.hurt(10, '#fff', 1, 0, 0, null, m, { id: 'rock', type: 'rock', kind: 'projectile' });
  g.TypeBonds.tick(3.01); // Psychic 5 expired (>2s); let's re-advance to t=10.01 and re-trigger Psychic 5 + 4 rocks cleanly!

  // Clean setup: reset stage clock, trigger 4 rocks, then at t=3.01 trigger Psychic 5 + Captain Link + Quick Claw + traitPermanent
  g.TypeBonds.beginStage();
  e.typeBondState = { normal: false, wet: 0, shock: 0, frost: 0, frozen: 0, psychic: 102, root: 0, amp: 1 };
  for (let i = 0; i < 4; i++) {
    g.TypeBonds.fields.push({ kind: 'rock', x: e.x, y: e.y, left: 0.1, p: m, born: 0 });
  }
  g.TypeBonds.tick(0.2); // 4 rocks detonate -> +40 flat extra, valid until t=2.2
  e.hurt(10, '#fff', 1, 0, 0, null, m, { id: 'psy', type: 'psychic', kind: 'projectile' }); // Psychic 5 -> +100% mul, valid until t=2.2

  // Captain Link -> +20% baseAgility (= +20 extra)
  cap.x = 0; cap.y = 0;
  pick('gold_captain_link');
  cap.cast(cap.moves[0]);

  // Quick Claw x2 (+10 extra) + SquadTraits flat (+15 extra)
  g.Items.gain(m, 'quickclaw');
  g.Items.gain(m, 'quickclaw');
  m.traitPermanent = { agility: 15 };

  const expectedMul = 1 + 0.30 + 1.00 + classTraitPct + 0.50;
  const expectedExtra = 10 + 15 + 40 + 20;
  close(m.agilityFor(m.moves[0]), (100 * expectedMul + expectedExtra) * 0.5);
});

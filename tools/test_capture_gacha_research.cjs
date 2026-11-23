const test = require('node:test');
const assert = require('node:assert/strict');
const { context } = require('./battle_fixture.cjs');

function setup() {
  const s = context('zh', false), G = s.G;
  G.Sprites.preload = () => {};
  s.load('js/systems/z-access.js');
  s.load('js/data/starter-items.js');
  s.load('js/data/breakthrough-items.js');
  s.load('js/data/expedition-cards.js');
  s.load('js/systems/card-packs.js');
  s.load('js/systems/capture.js');
  s.load('js/systems/research.js');
  s.load('js/systems/expedition-rules.js');
  return { s, G };
}

test('fainted Pokémon capture respects per-battle caps, Arceus exclusion, and family/shiny unlocks', () => {
  const { s, G } = setup();
  const save = G.DB.save;
  G.Capture.reset();
  // Normal: max 1
  s.Math.random = () => 0;
  assert.equal(G.Capture.trySpawn({ dex: 1, name: 'Bulbasaur', x: 10, y: 10 }), true);
  assert.equal(G.Capture.trySpawn({ dex: 4, name: 'Charmander', x: 20, y: 20 }), false);
  // Elite: max 3
  for (let i = 0; i < 3; i++) assert.equal(G.Capture.trySpawn({ dex: 25, name: 'Pikachu', elite: true, x: i * 10, y: 0 }), true);
  assert.equal(G.Capture.trySpawn({ dex: 25, name: 'Pikachu', elite: true, x: 40, y: 0 }), false);
  // Arceus excluded; Boss max 1
  assert.equal(G.Capture.trySpawn({ dex: 493, name: 'Arceus', boss: true, expeditionArceus: true, x: 0, y: 0 }), false);
  assert.equal(G.Capture.trySpawn({ dex: 150, name: 'Mewtwo', boss: true, shiny: true, x: 0, y: 0 }), true);
  assert.equal(G.Capture.trySpawn({ dex: 151, name: 'Mew', boss: true, x: 0, y: 0 }), false);

  // Capture shiny Bulbasaur -> unlocks entire family + shiny for all family forms
  s.random([0]);
  const res = G.Capture.attempt('ultraball', { dex: 1, shiny: true, cat: 'normal' }, save);
  assert.equal(res.caught, true);
  assert.ok(save.owned[1] && save.owned[2] && save.owned[3]);
  assert.ok(save.shiny[1] && save.shiny[2] && save.shiny[3]);

  // Legacy in-run capture is disabled
  assert.equal(G.MonProgression.captureChance({ dex: 1, boss: true }), 0);
  assert.equal(G.MonProgression.tryCapture({ dex: 1 }, {}), false);
});

test('gacha issues Invitations, updates inviteIVs, converts on ownership, and 0.1% Golden Ball grants permanent + 20% shiny', () => {
  const { G } = setup();
  const save = G.DB.save;
  save.tickets.t1 = 10;
  save.coins = 0;
  // Pull non-golden invitation
  G.Gacha.debugForceGolden(0);
  const r1 = G.Gacha.pull(save, 1, 1)[0];
  assert.equal(r1.goldenBall, false);
  assert.equal(r1.shiny, false);
  if (!save.owned[r1.dex]) {
    assert.equal(r1.invitation, true);
    assert.ok(save.invites[r1.dex] >= 1);
    assert.ok(save.inviteIVs[r1.dex]);
    assert.equal(G.DB.consumeInvitation(r1.dex, save), true);
  }
  // Golden ball guarantees permanent ownership
  G.Gacha.debugForceGolden(1);
  const r2 = G.Gacha.pull(save, 1, 1)[0];
  assert.equal(r2.goldenBall, true);
  assert.ok(save.owned[r2.dex]);
  // Invitations for already owned dex convert to coins
  const beforeCoins = save.coins;
  const invRes = G.DB.grantInvitation(r2.dex, save);
  assert.equal(invRes.owned, true);
  assert.ok(save.coins > beforeCoins);
});

test('ZAccess duplicate unlocking is removed and breakthrough pack merged into beginner', () => {
  const { G } = setup();
  const save = G.DB.save;
  G.DB.grant(1, 'capture');
  assert.equal(G.ZAccess.acquired(save, 1), false);
  assert.equal(G.ZAccess.allowed(save, 1), false);
  assert.equal(G.CardPacks.packs.length, 2); // beginner + long-march
  assert.equal(G.CardPacks.packBy.breakthrough, undefined);
  assert.ok(!G.CardPacks.cards.some(c => c.kind === 'z'));
  assert.ok(G.CardPacks.packBy.beginner.cards.some(c => c.id === 'speed:3'));
});

test('expedition matrix has exactly 1 rift per cycle and Research unlocks titles/avatars only when owned', () => {
  const { G } = setup();
  const save = G.DB.save;
  const m = G.ExpeditionRules.matrix(1);
  const rifts = m.flat().filter(c => c.kind === 'rift');
  assert.equal(rifts.length, 1);

  // Research locked when not owned (e.g. dex 150)
  G.Research.recordBattle({ captain: { dex: 150, level: 10 }, kills: 200, kind: 'boss', arceus: true }, true, save);
  assert.equal(G.Research.claim(150, 'battles', save), false);

  // Grant dex 4 (Charmander) and complete tasks
  G.DB.grantFamily(4, 'capture', save);
  for (let i = 0; i < 3; i++) G.Research.recordBattle({ captain: { dex: 4, level: 20 }, kills: 60, kind: 'boss', arceus: i === 0 }, true, save);
  assert.equal(G.Research.claim(4, 'battles', save), true);
  assert.equal(G.Research.claim(4, 'kills', save), true);
  assert.ok(save.avatars.includes(4));
  assert.ok(save.titles.length >= 1);
});

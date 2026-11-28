const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const { createApp } = require('../server/server.cjs');

function loadClientEnv() {
  const ctx = vm.createContext({
    G: {
      I18n: { lang: 'zh', add() {}, addChinese() {} },
      T: s => s,
      UI: { refreshCoins() {}, toast() {} },
      Sprites: { hasShiny: () => true },
      Audio: { sfx() {} },
      Dev: { canUse: () => true },
      Ranking: { periodIds: () => ({ d: '2026-11-27', w: '2026-W48' }) }
    },
    window: {},
    document: { getElementById: () => ({ classList: { contains: () => true } }) },
    performance: { now: () => 0 },
    console, Date, Math, Set, Map, JSON
  });
  for (const f of [
    'js/core/util.js',
    'js/data/pokedex.js',
    'js/data/sprites-meta.js',
    'js/data/evolutions.js',
    'js/data/egg-groups.js',
    'js/data/moves.js',
    'js/data/mega-forms.js',
    'js/data/mega-types.js',
    'js/systems/z-access.js',
    'js/systems/equipment.js',
    'js/systems/nursery-rules.js',
    'js/data/abilities.js',
    'js/data/leader-medals.js',
    'js/systems/progression-mon.js',
    'js/systems/expedition-rules.js',
    'js/systems/difficulty.js',
    'js/systems/league-rank.js',
    'js/systems/failure-protection.js',
    'js/systems/offline.js',
    'js/data/upgrades.js',
    'js/data/items.js',
    'js/data/starter-items.js',
    'js/data/breakthrough-items.js',
    'js/data/expedition-cards.js',
    'js/systems/card-packs.js',
    'js/systems/save-sync.js',
    'js/core/db.js',
    'js/systems/gacha.js',
    'js/systems/ability-gacha.js',
    'js/systems/research.js',
    'js/data/missions.js',
    'js/data/achievements.js',
    'js/systems/progress.js',
    'js/systems/exchange.js'
  ]) {
    vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
  }
  ctx.G.LeaderAbilitiesConfig = require('./leader_config.cjs').read(process.cwd());
  ctx.G.LeaderMedals.install();
  return ctx.G;
}

test('AbilityGacha covers all 9 gens, 2% equal-weight family medals, 98% invitations w/ Golden Ball, and duplicate vouchers', () => {
  const G = loadClientEnv();
  assert.deepEqual(Array.from(G.AbilityGacha.GENS), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(G.AbilityGacha.MEDAL_RATE, 0.02);
  assert.equal(G.AbilityGacha.familyMedals(9).length, 52);
  assert.equal(G.AbilityGacha.familyMedals(8).length, 44);
  assert.equal(G.AbilityGacha.familyMedals(1).length, 74);

  const save = G.DB.fresh('tester');
  save.abilityGems = 50;

  // Force a Gen 9 medal twice: first unlocks medal, second grants voucher
  const m9 = G.AbilityGacha.familyMedals(9)[0];
  G.AbilityGacha.debugMedal(m9.id);
  const r1 = G.AbilityGacha.pull(save, 1, 9);
  assert.equal(r1.length, 1);
  assert.equal(r1[0].medal, m9.id);
  assert.equal(r1[0].isNew, true);
  assert.equal(r1[0].voucher, null);
  assert.ok(save.abilityMedals[m9.id]);

  G.AbilityGacha.debugMedal(m9.id);
  const r2 = G.AbilityGacha.pull(save, 1, 9);
  assert.equal(r2[0].medal, m9.id);
  assert.equal(r2[0].isNew, false);
  assert.equal(r2[0].voucher, m9.id);
  assert.equal(r2[0].refund, 0);
  assert.equal(save.abilityVouchers[m9.id], 1);

  // Force Golden Ball on non-medal pull (set Math.random > 0.02)
  const oldRand = Math.random;
  Math.random = () => 0.5;
  try {
    G.AbilityGacha.debugForceGolden(1);
    const r3 = G.AbilityGacha.pull(save, 1, 9);
    assert.equal(r3[0].goldenBall, true);
    assert.equal(r3[0].medal, null);
  } finally { Math.random = oldRand; }
});

test('League Coins are awarded by Research (+200), League Rank milestones (R2-R8 + p1), and Achievements (50-200)', () => {
  const G = loadClientEnv();
  const save = G.DB.fresh('tester');
  save.owned[25] = { at: 1, from: 'starter' };
  G.DB.guestStart?.();

  // Research task claim (+200)
  const origOwns = G.DB.owns;
  const origCommit = G.DB.commit;
  G.DB.owns = d => !!save.owned[d];
  G.DB.commit = () => true;
  try {
    save.research[172] = { battles: 3, kills: 150, bosses: 3, wins: 1, maxLv: 20, claimed: {} };
    assert.equal(G.Research.claim(25, 'battles', save), true);
    assert.equal(save.leagueCoins, 200);
    assert.equal(G.Research.claim(25, 'battles', save), false); // idempotent
    assert.equal(save.leagueCoins, 200);
  } finally { G.DB.owns = origOwns; G.DB.commit = origCommit; }

  // League Rank milestones: R2..R8 + protocol 1
  const s2 = G.DB.fresh('ranker');
  for (let i = 0; i < 7; i++) {
    G.LeagueRank.settle(s2, { day: 60, arceus: true, squadHp: 80, stars: 8, leagueTier: i + 1 }, { id: 'run_rank_tier_' + i, clean: true, alive: true, stars: 8 });
  }
  assert.equal(G.LeagueRank.view(s2).tier, 8);
  assert.equal(s2.leagueCoins, 1000 + 1500 + 3000 + 4000 + 5000 + 6000 + 8000);
  // Protocol 1 clear awards 10000
  G.LeagueRank.settle(s2, { day: 60, arceus: true, squadHp: 80, stars: 8, leagueTier: 8 }, { id: 'run_protocol_01', clean: true, alive: true, stars: 8 });
  assert.equal(s2.leagueCoins, 1000 + 1500 + 3000 + 4000 + 5000 + 6000 + 8000 + 10000);
  // Re-syncing is idempotent
  assert.equal(G.LeagueRank.syncRewards(s2).granted, 0);

  // Achievements carry 50-200 League Coins
  for (const a of G.AchDefs.LIST) {
    assert.ok(a.reward.leagueCoins >= 50 && a.reward.leagueCoins <= 200, a.id);
  }
});

test('Server Exchange API enforces min prices, sorts ascending, unlocks voucher medal immediately, and supports cancel', async () => {
  const app = createApp({ dbFile: ':memory:' });
  await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  const port = app.server.address().port;
  const base = `http://127.0.0.1:${port}`;

  async function req(method, p, body, cookie) {
    const res = await fetch(base + p, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json', 'X-PS-Client': '1' } : {}),
        ...(cookie ? { Cookie: cookie } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const setCookie = res.headers.get('set-cookie')?.split(';')[0] || cookie;
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data, cookie: setCookie };
  }

  try {
    // Register seller and buyer
    const sReg = await req('POST', '/api/register', { name: 'SellerOne', pass: 'password123' });
    assert.equal(sReg.status, 201);
    const bReg = await req('POST', '/api/register', { name: 'BuyerTwo', pass: 'password123' });
    assert.equal(bReg.status, 201);

    // Seed seller with voucher + gems + balls AND an invited-only partner (not permanently owned yet)
    const medalId = '906-leader_protean_flower_trick';
    const sellerSave = structuredClone(sReg.data.save);
    sellerSave.invites = { 906: 1 };
    sellerSave.partner = 906;
    sellerSave.abilityGems = 5;
    sellerSave.pokeballs = { pokeball: 5, greatball: 3, ultraball: 2 };
    sellerSave.abilityVouchers = { [medalId]: 2 };
    const sUp = await req('POST', '/api/save', { rev: sReg.data.rev, operation: 'seed-s', base: sReg.data.save, save: sellerSave }, sReg.cookie);
    assert.equal(sUp.status, 200);

    const buyerSave = structuredClone(bReg.data.save);
    buyerSave.leagueCoins = 10000;
    const bUp = await req('POST', '/api/save', { rev: bReg.data.rev, operation: 'seed-b', base: bReg.data.save, save: buyerSave }, bReg.cookie);
    assert.equal(bUp.status, 200);

    // Reject below minimum prices
    assert.equal((await req('POST', '/api/exchange/list', { itemKey: 'abilityGem', price: 99 }, sReg.cookie)).status, 400);
    assert.equal((await req('POST', '/api/exchange/list', { itemKey: 'pokeball', price: 49 }, sReg.cookie)).status, 400);
    assert.equal((await req('POST', '/api/exchange/list', { itemKey: 'greatball', price: 199 }, sReg.cookie)).status, 400);
    assert.equal((await req('POST', '/api/exchange/list', { itemKey: 'ultraball', price: 999 }, sReg.cookie)).status, 400);
    assert.equal((await req('POST', '/api/exchange/list', { itemKey: 'voucher:' + medalId, price: 1999 }, sReg.cookie)).status, 400);

    // List two gems at 300 and 150 (test ascending sort & category minPrice)
    const l1 = await req('POST', '/api/exchange/list', { itemKey: 'abilityGem', price: 300 }, sReg.cookie);
    assert.equal(l1.status, 200);
    assert.equal(l1.data.save.abilityGems, 4);
    const l2 = await req('POST', '/api/exchange/list', { itemKey: 'abilityGem', price: 150 }, sReg.cookie);
    assert.equal(l2.status, 200);
    const lv = await req('POST', '/api/exchange/list', { itemKey: 'voucher:' + medalId, price: 2500 }, sReg.cookie);
    assert.equal(lv.status, 200);
    assert.equal(lv.data.save.abilityVouchers[medalId], 1);

    // Browse market
    const mkt = await req('GET', '/api/exchange', null, bReg.cookie);
    assert.equal(mkt.status, 200);
    const gemCat = mkt.data.categories.find(c => c.itemKey === 'abilityGem');
    assert.equal(gemCat.minPrice, 150);
    assert.equal(gemCat.count, 2);
    const gemList = mkt.data.listings.filter(x => x.itemKey === 'abilityGem');
    assert.deepEqual(gemList.map(x => x.price), [150, 300]);
    assert.equal(gemList[0].sellerName, 'SellerOne');

    // Seller cannot buy own listing
    assert.equal((await req('POST', '/api/exchange/buy', { id: l2.data.listing.id }, sReg.cookie)).status, 400);

    // Buyer buys cheaper gem (150) and voucher (2500 -> unlocks medal immediately!)
    const buyGem = await req('POST', '/api/exchange/buy', { id: l2.data.listing.id }, bReg.cookie);
    assert.equal(buyGem.status, 200);
    assert.equal(buyGem.data.save.leagueCoins, 9850);
    assert.equal(buyGem.data.save.abilityGems, 11);

    const buyV = await req('POST', '/api/exchange/buy', { id: lv.data.listing.id }, bReg.cookie);
    assert.equal(buyV.status, 200);
    assert.equal(buyV.data.save.leagueCoins, 7350);
    assert.ok(buyV.data.save.abilityMedals[medalId]);
    assert.equal(buyV.data.save.abilityVouchers?.[medalId], undefined);

    // Buying already-sold listing returns 404
    assert.equal((await req('POST', '/api/exchange/buy', { id: lv.data.listing.id }, bReg.cookie)).status, 404);

    // Seller cancels remaining gem listing -> gem returned, seller received 150 + 2500 League Coins
    const cancel = await req('POST', '/api/exchange/cancel', { id: l1.data.listing.id }, sReg.cookie);
    assert.equal(cancel.status, 200);
    assert.equal(cancel.data.save.abilityGems, 4);
    assert.equal(cancel.data.save.leagueCoins, 2650);
  } finally {
    app.close();
  }
});

/* Regression tests for Player Custom Namecard system and League Rank one-time rewards (coins, R4+ titles, R7/R8 frames). */
const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { G, fresh, sanitize } = require('../server/domain.cjs');
const { createApp } = require('../server/server.cjs');

function setRankPoints(s, points, protocol = 0) {
  s.leagueRank = { v: 1, results: {} };
  let rem = points, idx = 1;
  while (rem > 0) {
    const award = Math.min(3, rem);
    s.leagueRank.results['run_star_' + String(idx++).padStart(4, '0')] = { kind: 'stars', award, hp: 90, at: idx * 1000 };
    rem -= award;
  }
  for (let p = 1; p <= protocol; p++) {
    s.leagueRank.results['run_prot_' + String(p).padStart(4, '0')] = { kind: 'protocol', award: 1, hp: 90, at: 100000 + p * 1000 };
  }
}

test('LeagueRank one-time milestones grant coins (R2-R8+P1), titles (R4-R8+P1), and avatar frames (R7-R8)', () => {
  const s = fresh('RankTester');
  // R1: no milestones yet
  assert.equal(G.LeagueRank.view(s).tier, 1);
  assert.equal(G.LeagueRank.unlockedTitles(s).length, 0);
  assert.equal(G.LeagueRank.unlockedFrames(s).length, 0);

  // Reach R4 (9 points): coins R2(1000)+R3(1500)+R4(3000)=5500, title R4 only, no frames
  setRankPoints(s, 9);
  assert.equal(G.LeagueRank.view(s).tier, 4);
  const r4 = G.LeagueRank.syncRewards(s);
  assert.equal(r4.granted, 1000 + 1500 + 3000);
  assert.equal(s.leagueCoins, 5500);
  assert.deepEqual(Array.from(G.LeagueRank.unlockedTitles(s), t => t.id), ['rank:r4']);
  assert.deepEqual(Array.from(G.LeagueRank.unlockedFrames(s), f => f.id), []);

  // Idempotent repeat call grants 0 extra coins
  assert.equal(G.LeagueRank.syncRewards(s).granted, 0);
  assert.equal(s.leagueCoins, 5500);

  // Reach R7 (18 points): adds R5(4000)+R6(5000)+R7(6000)=15000, titles R4..R7, frame rank_r7
  setRankPoints(s, 18);
  assert.equal(G.LeagueRank.view(s).tier, 7);
  const r7 = G.LeagueRank.syncRewards(s);
  assert.equal(r7.granted, 4000 + 5000 + 6000);
  assert.deepEqual(Array.from(G.LeagueRank.unlockedTitles(s), t => t.id), ['rank:r4', 'rank:r5', 'rank:r6', 'rank:r7']);
  assert.deepEqual(Array.from(G.LeagueRank.unlockedFrames(s), f => f.id), ['rank_r7']);

  // Reach R8 + P1 (21 points + 1 protocol): adds R8(8000)+P1(10000)=18000, titles R4..R8+P1, frames rank_r7+rank_r8
  setRankPoints(s, 21, 1);
  assert.equal(G.LeagueRank.view(s).tier, 8);
  assert.equal(G.LeagueRank.view(s).protocol, 1);
  const r8 = G.LeagueRank.syncRewards(s);
  assert.equal(r8.granted, 8000 + 10000);
  assert.equal(s.leagueCoins, 1000 + 1500 + 3000 + 4000 + 5000 + 6000 + 8000 + 10000);
  assert.deepEqual(Array.from(G.LeagueRank.unlockedTitles(s), t => t.id), ['rank:r4', 'rank:r5', 'rank:r6', 'rank:r7', 'rank:r8', 'rank:p1']);
  assert.deepEqual(Array.from(G.LeagueRank.unlockedFrames(s), f => f.id), ['rank_r7', 'rank_r8']);
});

test('Namecard normalization blocks forged locked cosmetics and accepts unlocked rank/type/preset customizations', () => {
  const old = fresh('Forger');
  old.owned[25] = { at: 1, iv: Array(8).fill(15) };
  old.partner = 25;

  // Attempt to forge R8 frame, R7 title, R8 background, and Gold badge border while R1
  const forged = JSON.parse(JSON.stringify(old));
  forged.profile = {
    title: 'rank:r7',
    avatarType: 'trainer',
    avatarId: 'tr_master',
    avatarFrame: 'rank_r8',
    bg: 'celestial_hall',
    bgExplicit: true,
    nameplate: 'type:electric',
    nameplateEdge: 'corner',
    showcase: 'league_rank',
    badgeFrame: 'gold',
    partnerDex: 25,
    partnerShiny: false,
    favs: [{ dex: 25, shiny: false }]
  };
  const out1 = sanitize(forged, old, 'Forger');
  assert.equal(out1.profile.title, '');
  assert.equal(out1.profile.avatarType, 'pokemon'); // tr_master rejected
  assert.equal(out1.profile.avatarFrame, 'none');   // rank_r8 rejected
  assert.equal(out1.profile.bg, 'none');            // celestial_hall rejected
  assert.equal(out1.profile.badgeFrame, 'auto');    // gold rejected
  assert.equal(out1.profile.nameplate, 'type:electric'); // elemental type plates are free for everyone
  assert.equal(out1.profile.showcase, 'league_rank');

  // Now promote old save to R8 -> all R7/R8 cosmetics accepted cleanly!
  setRankPoints(old, 21, 0);
  const legit = JSON.parse(JSON.stringify(old));
  legit.profile = {
    ...forged.profile,
    presets: [{
      title: 'rank:r8',
      avatarType: 'trainer',
      avatarId: 'tr_master',
      avatarFrame: 'rank_r8',
      bg: 'celestial_hall',
      nameplate: 'prism_aurora',
      nameplateEdge: 'double',
      showcase: 'dex',
      badgeFrame: 'gold',
      partnerDex: 25,
      partnerShiny: false
    }, null, null]
  };
  const out2 = sanitize(legit, old, 'Forger');
  assert.equal(out2.profile.title, 'rank:r7');
  assert.equal(out2.profile.avatarType, 'trainer');
  assert.equal(out2.profile.avatarId, 'tr_master');
  assert.equal(out2.profile.avatarFrame, 'rank_r8');
  assert.equal(out2.profile.bg, 'celestial_hall');
  assert.equal(out2.profile.badgeFrame, 'gold');
  assert.equal(out2.profile.presets[0].avatarFrame, 'rank_r8');
  assert.equal(out2.profile.presets[0].nameplate, 'prism_aurora');
});

test('Server /api/profile returns customized Namecard payload including League Rank and persists edits across saves', async t => {
  const app = createApp({ dbFile: ':memory:', stunUrls: 'none' });
  t.after(() => app.close());
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  const base = 'http://127.0.0.1:' + app.server.address().port;

  const reg = await fetch(base + '/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-PS-Client': '1' },
    body: JSON.stringify({ name: 'CardHero', pass: 'secret-namecard-pass' })
  });
  assert.equal(reg.status, 201);
  const cookie = reg.headers.get('set-cookie').split(';')[0];
  const regData = await reg.json();
  const uid = regData.user.uid;

  // Load current save via /api/me, customize namecard (unlocked items), and save to server via POST /api/save
  const loadRes = await fetch(base + '/api/session', { headers: { Cookie: cookie } });
  assert.equal(loadRes.status, 200);
  const loaded = await loadRes.json();
  const save = loaded.save;
  save.owned[1] = { at: Date.now(), iv: Array(8).fill(20) };
  save.partner = 1;
  save.profile = {
    ...save.profile,
    avatarType: 'trainer',
    avatarId: 'tr_girl',
    nameplate: 'type:grass',
    nameplateEdge: 'corner',
    showcase: 'type:grass',
    badgeFrame: 'auto',
    partnerDex: 1,
    partnerShiny: false
  };
  const putRes = await fetch(base + '/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-PS-Client': '1' },
    body: JSON.stringify({ rev: loaded.rev, save })
  });
  assert.equal(putRes.status, 200);

  // Fetch public profile and verify namecard + leagueRank fields
  const profRes = await fetch(base + '/api/profile?uid=' + encodeURIComponent(uid), { headers: { Cookie: cookie } });
  assert.equal(profRes.status, 200);
  const prof = await profRes.json();
  assert.equal(prof.leagueRank.tier, 1);
  assert.ok(prof.namecard);
  assert.equal(prof.namecard.leagueRank.tier, 1);
  assert.equal(prof.namecard.avatarType, 'trainer');
  assert.equal(prof.namecard.avatarId, 'tr_girl');
  assert.equal(prof.namecard.nameplate, 'type:grass');
  assert.equal(prof.namecard.showcase.id, 'type:grass');
  assert.equal(prof.namecard.partnerDex, 1);
  assert.equal(prof.namecard.badges.length, 6);
});

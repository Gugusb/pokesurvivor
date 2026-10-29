/* Isolated nursery, gifts and family-Z rules; never opens server/data. */
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  { once } = require("node:events");
const { randomUUID, randomBytes, createHash } = require("node:crypto");
const { createApp } = require("../server/server.cjs"),
  { G, fresh, sanitize } = require("../server/domain.cjs");
const copy = (x) => JSON.parse(JSON.stringify(x));
async function fixture(t) {
  let clock = Date.UTC(2026, 9, 20, 1),
    roll = 0.99;
  const app = createApp({
    dbFile: ":memory:",
    now: () => clock,
    rewardRandom: () => roll,
    stunUrls: "none",
  });
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  t.after(() => app.close());
  const base = "http://127.0.0.1:" + app.server.address().port;
  function account(name) {
    const uid = randomUUID(),
      token = randomBytes(32).toString("hex"),
      s = fresh(name);
    s.partner = 6;
    for (const d of [4, 6, 9, 132, 150, 151, 248])
      s.owned[d] = { iv: [10, 20, 30], at: clock, from: "fixture" };
    app.db
      .prepare(
        "INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)",
      )
      .run(uid, name, name.toLowerCase(), "unused", "unused", clock);
    app.db
      .prepare("INSERT INTO saves(uid,payload) VALUES(?,?)")
      .run(uid, JSON.stringify(s));
    app.db
      .prepare("INSERT INTO sessions VALUES(?,?,?)")
      .run(
        createHash("sha256").update(token).digest("hex"),
        uid,
        clock + 30 * 864e5,
      );
    return { uid, cookie: "ps_session=" + token };
  }
  function friends(a, b) {
    const [x, y] = [a.uid, b.uid].sort();
    app.db.prepare("INSERT INTO friends VALUES(?,?,?,1)").run(x, y, a.uid);
  }
  async function api(a, route, body) {
    const response = await fetch(base + "/api" + route, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        cookie: a.cookie,
        ...(body === undefined
          ? {}
          : { "content-type": "application/json", "x-ps-client": "1" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    return { status: response.status, ...data };
  }
  async function ok(a, route, b) {
    const r = await api(a, route, b);
    assert.equal(r.status, 200, JSON.stringify(r));
    return r;
  }
  const a = account("NurseryOwner"),
    b = account("NurseryFriend"),
    c = account("NurseryVisitor");
  friends(a, b);
  friends(a, c);
  friends(b, c);
  return {
    app,
    api,
    ok,
    a,
    b,
    c,
    account,
    friends,
    tick: (ms) => (clock += ms),
    roll: (v) => (roll = v),
  };
}
test("egg groups cover all 966 playable species; Undiscovered and Ditto follow custom permissions", () => {
  for (const mon of G.DEX)
    assert.ok(G.NurseryRules.groups(mon.dex).length, mon.dex);
  assert.equal(G.NurseryRules.compatible(150, 151), false);
  assert.equal(G.NurseryRules.compatible(150, 151, true), true);
  assert.equal(G.NurseryRules.compatible(150, 132), true);
  assert.equal(G.NurseryRules.compatible(132, 132), true);
  assert.equal(G.NurseryRules.compatible(6, 9), true);
  assert.equal(G.NurseryRules.compatible(6, 150, true), false);
  for (const [a, b, friend] of [
    [6, 9, false],
    [150, 151, true],
    [150, 132, false],
  ])
    assert.ok(G.NurseryRules.duration(a, b, friend) <= 12 * 3600000);
});
test("ordinary offspring inherit one distinct stat; friend offspring inherit two; the rest are random", () => {
  for (let n = 0; n < 100; n++)
    for (const friend of [false, true]) {
      const result = G.NurseryRules.offspring([3, 4, 5], [27, 28, 29], friend);
      assert.equal(result.inherited.length, friend ? 2 : 1);
      assert.equal(new Set(result.inherited).size, result.inherited.length);
      for (const i of result.inherited)
        assert.ok(
          [
            [3, 27],
            [4, 28],
            [5, 29],
          ][i].includes(result.iv[i]),
        );
      assert.ok(
        result.iv.every((v) => Number.isInteger(v) && v >= 1 && v <= 31),
      );
    }
});
test("Z acquisition counts family duplicates, guarantees the sixth, and retains unlocks through merges", () => {
  const s = fresh("ZFixture");
  assert.equal(
    G.ZAccess.acquired(s, 133, () => 0.99),
    false,
  );
  assert.equal(s.zDuplicates[133], undefined);
  s.owned[133] = { iv: [1, 1, 1] };
  for (let i = 1; i <= 5; i++) {
    assert.equal(
      G.ZAccess.acquired(s, i === 1 ? 134 : 133, () => 0.99),
      false,
    );
    assert.equal(s.zDuplicates[133], i);
  }
  assert.equal(
    G.ZAccess.acquired(s, 135, () => 0.99),
    true,
  );
  assert.ok(G.ZAccess.allowed(s, 196));
  assert.equal(s.zDuplicates[133], 6);
  const old = fresh("ZFixture"),
    merged = G.ZAccess.merge(old, s);
  assert.ok(merged.zAccess[133]);
  assert.equal(merged.zDuplicates[133], 6);
  const round = sanitize({ ...s, zAccess: {}, zDuplicates: {} }, s, "ZFixture");
  assert.ok(G.ZAccess.allowed(round, 134));
  const early = fresh("ZFixture");
  early.owned[4] = { iv: [1, 1, 1] };
  assert.equal(
    G.ZAccess.acquired(early, 6, () => 0.19),
    true,
  );
});
test("co-op routes are disabled by default while social and nursery remain available", async (t) => {
  const f = await fixture(t);
  assert.equal((await f.ok(f.a, "/health")).coopEnabled, false);
  for (const route of [
    "/room/create",
    "/room/join",
    "/room/invite",
    "/room/start",
  ])
    assert.equal((await f.api(f.a, route, {})).status, 403);
  assert.equal((await f.ok(f.a, "/social")).friends.length, 2);
  assert.ok(await f.ok(f.a, "/nursery"));
});
test("nursery runs without pausing, rejects early/foreign claims and inherits the starting snapshots", async (t) => {
  const f = await fixture(t),
    room = await f.ok(f.a, "/nursery/primary", { dex: 6 });
  const started = await f.ok(f.a, "/nursery/start", {
    dex: 9,
    epoch: room.epoch,
  });
  const id = started.hatch.id;
  assert.equal(
    (await f.api(f.a, "/nursery/primary", { dex: null })).status,
    409,
  );
  assert.equal(
    (await f.api(f.a, "/nursery/claim", { id, rev: 1 })).status,
    409,
  );
  assert.equal(
    (await f.api(f.b, "/nursery/claim", { id, rev: 1 })).status,
    404,
  );
  const state = await f.ok(f.a, "/session");
  state.save.owned[6].iv = [31, 31, 31];
  state.save.owned[9].iv = [31, 31, 31];
  const saved = await f.ok(f.a, "/save", { save: state.save, rev: state.rev });
  f.tick(12 * 3600000);
  const ready = await f.ok(f.a, "/nursery");
  assert.equal(ready.hatch.id, id);
  const claim = await f.ok(f.a, "/nursery/claim", { id, rev: saved.rev });
  assert.equal(claim.report.dex, 6);
  assert.equal(claim.report.inherited.length, 1);
  for (const i of claim.report.inherited)
    assert.equal(claim.report.iv[i], [10, 20, 30][i]);
  assert.deepEqual(claim.save.owned[6].iv, [31, 31, 31]);
  const replay = await f.ok(f.a, "/nursery/claim", { id, rev: saved.rev });
  assert.equal(replay.alreadyClaimed, true);
  assert.equal(replay.rev, claim.rev);
  assert.equal((await f.ok(f.a, "/nursery")).hatch, null);
  await f.ok(f.a, "/nursery/primary", { dex: null });
});
test("friend invites persist, invalidate on withdrawal, and non-invited visits cannot start hatching", async (t) => {
  const f = await fixture(t);
  let room = await f.ok(f.a, "/nursery/primary", { dex: 150 });
  assert.equal((await f.ok(f.b, "/nursery?owner=" + f.a.uid)).invited, false);
  assert.equal(
    (
      await f.api(f.b, "/nursery/start", {
        owner: f.a.uid,
        dex: 151,
        epoch: room.epoch,
      })
    ).status,
    403,
  );
  await f.ok(f.a, "/nursery/invite", { uid: f.b.uid });
  assert.equal((await f.ok(f.b, "/social")).nurseryInvites.length, 1);
  await f.ok(f.a, "/nursery/primary", { dex: null });
  assert.equal((await f.ok(f.b, "/social")).nurseryInvites.length, 0);
  room = await f.ok(f.a, "/nursery/primary", { dex: 150 });
  assert.equal((await f.ok(f.b, "/nursery?owner=" + f.a.uid)).invited, false);
  assert.equal(
    (await f.api(f.a, "/nursery/start", { dex: 151, epoch: room.epoch }))
      .status,
    400,
  );
  await f.ok(f.a, "/nursery/invite", { uid: f.b.uid });
  const started = await f.ok(f.b, "/nursery/start", {
    owner: f.a.uid,
    dex: 151,
    epoch: room.epoch,
  });
  assert.ok(started.hatch.friend);
  assert.equal(started.hatch.ends - started.hatch.started, 12 * 3600000);
  // The guest can run their own nursery concurrently, but not a second friend's.
  const own = await f.ok(f.b, "/nursery/primary", { dex: 6 });
  await f.ok(f.b, "/nursery/start", { dex: 9, epoch: own.epoch });
  const other = await f.ok(f.c, "/nursery/primary", { dex: 6 });
  await f.ok(f.c, "/nursery/invite", { uid: f.b.uid });
  assert.equal(
    (
      await f.api(f.b, "/nursery/start", {
        owner: f.c.uid,
        dex: 9,
        epoch: other.epoch,
      })
    ).status,
    409,
  );
  f.tick(12 * 3600000);
  const host = await f.ok(f.a, "/session"),
    guest = await f.ok(f.b, "/session");
  const a = await f.ok(f.a, "/nursery/claim", {
      id: started.hatch.id,
      rev: host.rev,
    }),
    b = await f.ok(f.b, "/nursery/claim", {
      id: started.hatch.id,
      rev: guest.rev,
    });
  assert.equal(a.report.dex, 150);
  assert.equal(b.report.dex, 150);
  assert.equal(a.report.inherited.length, 2);
  assert.equal(b.report.inherited.length, 2);
  assert.equal(a.save.owned[150].from, "fixture");
  assert.equal((await f.ok(f.b, "/nursery")).participating.length, 0);
});
test('friend shiny inheritance uses the other parent only and freezes both states at hatch start', async t => {
  for (const [ownerShiny, guestShiny] of [[true,false],[false,true],[true,true],[false,false]]) {
    await t.test(`owner=${ownerShiny}, guest=${guestShiny}`, async t => {
      const f=await fixture(t);
      function setShiny(user,dex,on) {
        const s=JSON.parse(f.app.db.prepare('SELECT payload FROM saves WHERE uid=?').get(user.uid).payload);
        if(on)s.shiny[dex]={at:1,from:'fixture'};else delete s.shiny[dex];
        f.app.db.prepare('UPDATE saves SET payload=? WHERE uid=?').run(JSON.stringify(s),user.uid);
      }
      setShiny(f.a,6,ownerShiny);setShiny(f.b,9,guestShiny);
      const room=await f.ok(f.a,'/nursery/primary',{dex:6});
      assert.equal(room.shiny,ownerShiny);
      await f.ok(f.a,'/nursery/invite',{uid:f.b.uid});
      const started=await f.ok(f.b,'/nursery/start',{owner:f.a.uid,dex:9,epoch:room.epoch,shiny:true,a_shiny:!ownerShiny,b_shiny:!guestShiny});
      assert.equal(started.hatch.shiny,ownerShiny);assert.equal(started.hatch.partnerShiny,guestShiny);
      // Changing the live collection cannot change the already-started egg.
      setShiny(f.a,6,!ownerShiny);setShiny(f.b,9,!guestShiny);
      assert.equal((await f.ok(f.a,'/nursery')).hatch.shiny,ownerShiny);
      f.tick(12*3600000);f.roll(.019999999);
      const host=await f.ok(f.a,'/session'),guest=await f.ok(f.b,'/session');
      const a=await f.ok(f.a,'/nursery/claim',{id:started.hatch.id,rev:host.rev});
      const b=await f.ok(f.b,'/nursery/claim',{id:started.hatch.id,rev:guest.rev});
      assert.equal(a.report.shiny,guestShiny);assert.equal(b.report.shiny,ownerShiny);
      if(guestShiny)assert.ok(a.save.shiny[6]);
      if(ownerShiny)assert.equal(b.save.shiny[6].from,'nursery');else assert.equal(b.save.shiny[6],undefined);
      assert.equal(b.report.inherited.length,2);assert.deepEqual(b.save.owned[6].iv,[10,20,30].map((v,i)=>Math.max(v,b.report.iv[i])));
      f.roll(0);
      const replay=await f.ok(f.b,'/nursery/claim',{id:started.hatch.id,rev:guest.rev,shiny:true});
      assert.equal(replay.alreadyClaimed,true);assert.deepEqual(replay.report,b.report);assert.equal(replay.rev,b.rev);
      assert.deepEqual(replay.save.shiny,b.save.shiny);assert.deepEqual(replay.save.zDuplicates,b.save.zDuplicates);
    });
  }
});

test('the exact 2% boundary does not inherit shiny and a later low roll cannot reroll the claim', async t => {
  const f=await fixture(t),s=JSON.parse(f.app.db.prepare('SELECT payload FROM saves WHERE uid=?').get(f.a.uid).payload);
  s.shiny[6]={at:1,from:'fixture'};f.app.db.prepare('UPDATE saves SET payload=? WHERE uid=?').run(JSON.stringify(s),f.a.uid);
  const room=await f.ok(f.a,'/nursery/primary',{dex:6});await f.ok(f.a,'/nursery/invite',{uid:f.b.uid});
  const run=await f.ok(f.b,'/nursery/start',{owner:f.a.uid,dex:9,epoch:room.epoch});
  f.tick(12*3600000);f.roll(.02);const guest=await f.ok(f.b,'/session');
  const result=await f.ok(f.b,'/nursery/claim',{id:run.hatch.id,rev:guest.rev});
  assert.equal(result.report.shiny,false);assert.equal(result.save.shiny[6],undefined);
  f.roll(0);const repeat=await f.ok(f.b,'/nursery/claim',{id:run.hatch.id,rev:guest.rev});
  assert.deepEqual(repeat.report,result.report);assert.equal(repeat.rev,result.rev);
});

test('own hatches never inherit shiny and never erase existing shiny records', async t => {
  const f=await fixture(t),s=JSON.parse(f.app.db.prepare('SELECT payload FROM saves WHERE uid=?').get(f.a.uid).payload);
  s.shiny[6]={at:123,from:'fixture'};s.shiny[9]={at:456,from:'fixture'};
  f.app.db.prepare('UPDATE saves SET payload=? WHERE uid=?').run(JSON.stringify(s),f.a.uid);
  const room=await f.ok(f.a,'/nursery/primary',{dex:6}),run=await f.ok(f.a,'/nursery/start',{dex:9,epoch:room.epoch});
  f.tick(12*3600000);f.roll(0);const owner=await f.ok(f.a,'/session');
  const result=await f.ok(f.a,'/nursery/claim',{id:run.hatch.id,rev:owner.rev});
  assert.equal(result.report.shiny,false);assert.deepEqual(result.save.shiny,s.shiny);assert.equal(result.report.inherited.length,1);
});

test("hatching is atomic under concurrent starts and claims, and rejects stale save revisions", async (t) => {
  const f = await fixture(t),
    room = await f.ok(f.a, "/nursery/primary", { dex: 6 });
  const starts = await Promise.all([
    f.api(f.a, "/nursery/start", { dex: 9, epoch: room.epoch }),
    f.api(f.a, "/nursery/start", { dex: 4, epoch: room.epoch }),
  ]);
  assert.deepEqual(starts.map((v) => v.status).sort(), [200, 409]);
  const h = starts.find((v) => v.hatch).hatch;
  f.tick(12 * 3600000);
  assert.equal(
    (await f.api(f.a, "/nursery/claim", { id: h.id, rev: 9999 })).status,
    409,
  );
  const a = await f.ok(f.a, "/session"),
    responses = await Promise.all([
      f.api(f.a, "/nursery/claim", { id: h.id, rev: a.rev }),
      f.api(f.a, "/nursery/claim", { id: h.id, rev: a.rev }),
    ]);
  assert.ok(responses.every((v) => v.status === 200));
  assert.equal(responses.filter((v) => v.alreadyClaimed).length, 1);
  assert.equal(responses[0].rev, responses[1].rev);
});
test("rare Mega drops match the evolution family and nursery acquisition increments Z duplicate progress", async (t) => {
  const f = await fixture(t);
  f.roll(0.001);
  const room = await f.ok(f.a, "/nursery/primary", { dex: 6 }),
    run = await f.ok(f.a, "/nursery/start", { dex: 4, epoch: room.epoch });
  f.tick(12 * 3600000);
  const a = await f.ok(f.a, "/session"),
    claim = await f.ok(f.a, "/nursery/claim", { id: run.hatch.id, rev: a.rev });
  assert.ok(claim.report.mega);
  assert.ok(claim.save.megaStones[claim.report.mega]);
  assert.equal(G.MEGA_FORMS.find((v) => v.id === claim.report.mega).dex, 6);
  assert.ok(claim.report.zUnlocked);
  assert.ok(G.ZAccess.allowed(claim.save, 4));
  assert.equal(claim.save.zDuplicates[4], 1);
});
test("free gifts persist for offline friends, reveal rewards only on claim, and never pay twice", async (t) => {
  const f = await fixture(t);
  f.roll(0.1);
  const before = await f.ok(f.a, "/session");
  await f.ok(f.a, "/gifts/send", { uid: f.b.uid });
  const after = await f.ok(f.a, "/session");
  assert.deepEqual(after.save, before.save);
  assert.equal(after.rev, before.rev);
  assert.equal((await f.api(f.a, "/gifts/send", { uid: f.b.uid })).status, 409);
  const social = await f.ok(f.b, "/social"),
    gift = social.gifts.inbox[0];
  assert.equal("reward" in gift, false);
  assert.equal(
    (await f.api(f.c, "/gifts/claim", { id: gift.id, rev: 1 })).status,
    404,
  );
  const b = await f.ok(f.b, "/session");
  const first = await f.ok(f.b, "/gifts/claim", { id: gift.id, rev: b.rev });
  assert.equal(first.save.coins, b.save.coins + first.report.coins);
  const second = await f.ok(f.b, "/gifts/claim", { id: gift.id, rev: b.rev });
  assert.equal(second.alreadyClaimed, true);
  assert.equal(second.save.coins, first.save.coins);
  assert.equal((await f.ok(f.b, "/social")).gifts.inbox.length, 0);
});
test("daily gifts allow ten distinct friends, reset at Beijing midnight, and give all three reward types", async (t) => {
  const f = await fixture(t),
    friends = [f.b, f.c];
  for (let i = 0; i < 9; i++) {
    const p = f.account("GiftFriend" + i);
    f.friends(f.a, p);
    friends.push(p);
  }
  for (let i = 0; i < 10; i++)
    await f.ok(f.a, "/gifts/send", { uid: friends[i].uid });
  assert.equal(
    (await f.api(f.a, "/gifts/send", { uid: friends[10].uid })).status,
    409,
  );
  assert.equal((await f.ok(f.a, "/social")).gifts.sent.length, 10);
  f.tick(15 * 3600000);
  f.roll(0.7);
  await f.ok(f.a, "/gifts/send", { uid: f.b.uid });
  f.tick(24 * 3600000);
  f.roll(0.9);
  await f.ok(f.a, "/gifts/send", { uid: f.b.uid });
  const social = await f.ok(f.b, "/social"),
    reports = [];
  let rev = (await f.ok(f.b, "/session")).rev;
  for (const gift of social.gifts.inbox) {
    const r = await f.ok(f.b, "/gifts/claim", { id: gift.id, rev });
    rev = r.rev;
    reports.push(r.report);
  }
  assert.ok(reports.some((r) => r.tickets === 1));
  assert.ok(reports.some((r) => r.gems === 1));
});
test("unfriending revokes nursery access but does not delete an already running pairing", async (t) => {
  const f = await fixture(t),
    room = await f.ok(f.a, "/nursery/primary", { dex: 6 });
  await f.ok(f.a, "/nursery/invite", { uid: f.b.uid });
  const h = await f.ok(f.b, "/nursery/start", {
    owner: f.a.uid,
    dex: 9,
    epoch: room.epoch,
  });
  await f.ok(f.a, "/friends/remove", { uid: f.b.uid });
  assert.equal((await f.api(f.b, "/nursery?owner=" + f.a.uid)).status, 403);
  assert.equal((await f.ok(f.b, "/social")).nurseryInvites.length, 0);
  f.tick(12 * 3600000);
  const s = await f.ok(f.b, "/session");
  assert.equal(
    (await f.ok(f.b, "/nursery/claim", { id: h.hatch.id, rev: s.rev })).report
      .dex,
    6,
  );
});
test("nursery parents, invitations, snapshots, deadlines and gifts survive a database reopen", () => {
  const fs = require("node:fs"),
    os = require("node:os"),
    path = require("node:path"),
    { openStore } = require("../server/store.cjs");
  const dir = fs.mkdtempSync(
      path.join(os.tmpdir(), "pokesurvivor-nursery-test-"),
    ),
    file = path.join(dir, "isolated.sqlite");
  let db;
  try {
    db = openStore(file);
    for (const uid of ["host", "guest"])
      db.prepare(
        "INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)",
      ).run(uid, uid, uid, "unused", "unused", 1);
    db.prepare("INSERT INTO nursery_rooms VALUES(?,?,?)").run(
      "host",
      150,
      "epoch",
    );
    db.prepare("INSERT INTO nursery_invites VALUES(?,?,?,?)").run(
      "host",
      "guest",
      "epoch",
      1,
    );
    db.prepare(
      "INSERT INTO nursery_hatches(id,owner,guest,dex,partner,a,b,started,ends) VALUES(?,?,?,?,?,?,?,?,?)",
    ).run(
      "hatch",
      "host",
      "guest",
      150,
      151,
      "[1,2,3]",
      "[4,5,6]",
      1,
      43200001,
    );
    db.prepare(
      "INSERT INTO gifts(id,sender,recipient,day,at,reward) VALUES(?,?,?,?,?,?)",
    ).run("gift", "host", "guest", 1, 1, '{"gems":1}');
    db.exec('ALTER TABLE nursery_hatches DROP COLUMN a_shiny; ALTER TABLE nursery_hatches DROP COLUMN b_shiny');
    db.close();
    db = openStore(file);
    assert.equal(db.prepare("SELECT dex FROM nursery_rooms").get().dex, 150);
    assert.equal(
      db.prepare("SELECT epoch FROM nursery_invites").get().epoch,
      "epoch",
    );
    assert.equal(
      db.prepare("SELECT ends FROM nursery_hatches").get().ends,
      43200001,
    );
    assert.equal(
      db.prepare("SELECT a FROM nursery_hatches").get().a,
      "[1,2,3]",
    );
    assert.equal(db.prepare("SELECT claimed FROM gifts").get().claimed, 0);
    assert.equal(db.prepare('SELECT a_shiny,b_shiny FROM nursery_hatches').get().a_shiny,0);
    assert.equal(db.prepare('SELECT a_shiny,b_shiny FROM nursery_hatches').get().b_shiny,0);
  } finally {
    db?.close();
    assert.ok(
      path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep),
    );
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test('deleting an account cannot replenish another player’s gift quota or revoke an already sent gift',async t=>{
  const f=await fixture(t),{hashPassword}=require('../server/server.cjs'),password='isolated-delete-fixture-password',hash=await hashPassword(password);
  f.app.db.prepare('UPDATE users SET pass=? WHERE uid IN (?,?)').run(hash,f.a.uid,f.b.uid);
  await f.ok(f.a,'/gifts/send',{uid:f.b.uid});await f.ok(f.a,'/gifts/send',{uid:f.c.uid});
  const gift=(await f.ok(f.c,'/social')).gifts.inbox[0];
  await f.ok(f.b,'/account/delete',{pass:password});
  assert.equal((await f.ok(f.a,'/social')).gifts.sent.length,2);
  for(let i=0;i<8;i++){const p=f.account('QuotaFriend'+i);f.friends(f.a,p);await f.ok(f.a,'/gifts/send',{uid:p.uid});}
  const extra=f.account('QuotaOverflow');f.friends(f.a,extra);
  assert.equal((await f.api(f.a,'/gifts/send',{uid:extra.uid})).status,409);
  await f.ok(f.a,'/account/delete',{pass:password});
  const c=await f.ok(f.c,'/session'),claimed=await f.ok(f.c,'/gifts/claim',{id:gift.id,rev:c.rev});
  assert.ok(claimed.report.coins||claimed.report.tickets||claimed.report.gems);
});

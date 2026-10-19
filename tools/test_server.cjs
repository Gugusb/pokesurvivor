"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { once } = require("node:events"),
  { WebSocket } = require("../server/node_modules/ws");
const { createApp } = require("../server/server.cjs"),
  { G } = require("../server/domain.cjs");
async function fixture(t) {
  let clock = Date.now();
  const app = createApp({ dbFile: ":memory:", now: () => clock });
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  t.after(() => app.close());
  const base = "http://127.0.0.1:" + app.server.address().port;
  async function request(route, b, cookie, extra = {}) {
    const r = await fetch(base + "/api" + route, {
      method: b === undefined ? "GET" : "POST",
      headers: {
        ...(b === undefined
          ? {}
          : { "Content-Type": "application/json", "X-PS-Client": "1" }),
        ...(cookie ? { Cookie: cookie } : {}),
        ...extra,
      },
      body: b === undefined ? undefined : JSON.stringify(b),
    });
    return {
      status: r.status,
      data: await r.json(),
      cookie: r.headers.get("set-cookie")?.split(";")[0],
    };
  }
  async function account(name) {
    const r = await request("/register", {
      name,
      pass: "test-only-strong-password",
    });
    assert.equal(r.status, 201);
    return { ...r.data, cookie: r.cookie };
  }
  async function seed(a, dex = 133) {
    const r = await request("/session", undefined, a.cookie),
      s = r.data.save;
    s.owned[dex] = { at: clock, from: "starter", iv: [1, 1, 1] };
    s.partner = dex;
    const p = await request("/save", { save: s, rev: r.data.rev }, a.cookie);
    assert.equal(p.status, 200);
    return p.data;
  }
  async function run(
    a,
    stars,
    { double = false, dirty = false, end = true } = {},
  ) {
    const start = await request(
      "/run/start",
      { dex: 133, stars, mode: "s", clean: !dirty },
      a.cookie,
    );
    assert.equal(start.status, 200, JSON.stringify(start.data));
    let seconds = 0,
      result;
    while (seconds < 1201) {
      const dt = Math.min(60, 1201 - seconds);
      clock += dt * 1000;
      seconds += dt;
      result = await request(
        "/run/beat",
        {
          id: start.data.id,
          t: seconds,
          speed: double ? 2 : 1,
          alive: true,
          clean: !dirty,
        },
        a.cookie,
      );
      assert.equal(result.status, 200, JSON.stringify(result.data));
    }
    if (end)
      result = await request(
        "/run/end",
        {
          id: start.data.id,
          t: 1201,
          speed: 1,
          alive: false,
          clean: !dirty,
          lv: 60,
          kills: 1000,
        },
        a.cookie,
      );
    assert.equal(result.status, 200);
    return { ...result.data, id: start.data.id };
  }
  function connect(a) {
    return new WebSocket(base.replace("http:", "ws:") + "/ws", {
      headers: { Cookie: a.cookie },
    });
  }
  return {
    app,
    base,
    request,
    account,
    seed,
    run,
    connect,
    tick: (ms) => {
      clock += ms;
    },
  };
}
test("own accounts: password hashing, HttpOnly session, recovery rotation and revoked sessions", async (t) => {
  const f = await fixture(t),
    a = await f.account("AuthTester");
  assert.ok(a.recovery.length >= 32);
  const u = f.app.db.prepare("SELECT * FROM users WHERE uid=?").get(a.user.uid);
  assert.notEqual(u.pass, "test-only-strong-password");
  assert.notEqual(u.recovery, a.recovery);
  assert.equal(
    (await f.request("/login", { name: "AuthTester", pass: "wrong" })).status,
    401,
  );
  const r = await f.request("/recover", {
    name: "AuthTester",
    pass: "new-test-only-password",
    recovery: a.recovery,
  });
  assert.equal(r.status, 200);
  assert.notEqual(r.data.recovery, a.recovery);
  assert.equal((await f.request("/session", undefined, a.cookie)).status, 401);
  assert.equal(
    (
      await f.request("/recover", {
        name: "AuthTester",
        pass: "another-test-password",
        recovery: a.recovery,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request("/login", {
        name: "AuthTester",
        pass: "new-test-only-password",
      })
    ).status,
    200,
  );
});
test("save versions prevent overwrites; server medals, receipts and offline cursor cannot be forged", async (t) => {
  const f = await fixture(t),
    a = await f.account("SaveTester");
  const v = await f.seed(a);
  v.save.difficulty.cleared = { 1: true, 2: true, 8: true };
  v.save.difficulty.cashouts = { 1: { coins: 1e8, at: Date.now() } };
  v.save.difficultyRecords = { 133: { 8: { won: true, best: 9999 } } };
  v.save.offline.seen = 1;
  const r = await f.request("/save", { rev: v.rev, save: v.save }, a.cookie);
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.save.difficulty.cleared, {});
  assert.deepEqual(r.data.save.difficultyRecords, {});
  assert.deepEqual(r.data.save.difficulty.cashouts, {});
  assert.ok(r.data.save.offline.seen > 1);
  assert.equal(
    (await f.request("/save", { rev: v.rev, save: v.save }, a.cookie)).status,
    409,
  );
  const latest = await f.request("/session", undefined, a.cookie);
  latest.data.save.coins = -1;
  assert.equal(
    (
      await f.request(
        "/save",
        { rev: latest.data.rev, save: latest.data.save },
        a.cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request(
        "/run/start",
        { dex: 133, stars: 8, clean: true },
        a.cookie,
      )
    ).status,
    400,
  );
});
test("all eight medals propagate to the entire branched family and count each species separately", async (t) => {
  const f = await fixture(t),
    a = await f.account("MedalTester");
  await f.seed(a);
  for (let stars = 1; stars <= 8; stars++) await f.run(a, stars);
  const r = await f.request("/ranking?board=completion", undefined, a.cookie),
    family = G.MonProgression.familyFor(133);
  assert.equal(r.data.me.score, family.length);
  assert.equal(family.length, 9);
  const s = (await f.request("/session", undefined, a.cookie)).data.save;
  for (const d of family)
    for (let n = 1; n <= 8; n++)
      assert.equal(s.difficultyRecords[d][n].won, true);
  assert.equal(s.difficultyRecords[134][8].best, 0);
  const times = await f.request("/ranking?board=survival", undefined, a.cookie);
  assert.equal(times.data.me.t, 1201);
  assert.equal(times.data.me.dex, 133);
});
test("clock checks cannot accumulate request tolerance; only clean normal solo eight-star times qualify", async (t) => {
  const f = await fixture(t),
    a = await f.account("ClockTester");
  await f.seed(a);
  const start = await f.request(
    "/run/start",
    { dex: 133, stars: 1, clean: true },
    a.cookie,
  );
  const beat = (t) =>
    f.request(
      "/run/beat",
      { id: start.data.id, t, alive: true, clean: true },
      a.cookie,
    );
  assert.equal((await beat(3)).status, 200);
  assert.equal((await beat(6)).status, 400);
  f.tick(121000);
  assert.equal((await beat(4)).status, 409);
  for (let stars = 1; stars <= 7; stars++) await f.run(a, stars);
  await f.run(a, 8, { double: true });
  assert.equal(
    (await f.request("/ranking?board=survival", undefined, a.cookie)).data.me,
    null,
  );
  await f.run(a, 8, { dirty: true });
  assert.equal(
    (await f.request("/ranking?board=survival", undefined, a.cookie)).data.me,
    null,
  );
  await f.run(a, 8);
  assert.equal(
    (await f.request("/ranking?board=survival", undefined, a.cookie)).data.me.t,
    1201,
  );
});
test("victory cashout is atomic and once per account and difficulty", async (t) => {
  const f = await fixture(t),
    a = await f.account("BonusTester");
  await f.seed(a);
  const r = await f.run(a, 1, { end: false });
  const data = {
    id: r.id,
    t: 1201,
    alive: true,
    clean: true,
    speed: 1,
    coins: 100,
  };
  const [x, y] = await Promise.all([
    f.request("/run/bonus", data, a.cookie),
    f.request("/run/bonus", data, a.cookie),
  ]);
  assert.equal(x.status, 200);
  assert.equal(y.status, 200);
  assert.equal(x.data.extra + y.data.extra, 100);
  const s = (await f.request("/session", undefined, a.cookie)).data.save;
  assert.equal(s.coins, 700);
  assert.equal(s.difficulty.cashouts[1].coins, 200);
});
test("solo death after twenty minutes preserves victory even before the next heartbeat; ending twice is idempotent", async (t) => {
  const f = await fixture(t),
    a = await f.account("LateDeathTester");
  await f.seed(a);
  const start = await f.request(
    "/run/start",
    { dex: 133, stars: 1, clean: true },
    a.cookie,
  );
  let time = 0;
  while (time < 1190) {
    const dt = Math.min(60, 1190 - time);
    f.tick(dt * 1000);
    time += dt;
    assert.equal(
      (
        await f.request(
          "/run/beat",
          { id: start.data.id, t: time, alive: true, clean: true },
          a.cookie,
        )
      ).status,
      200,
    );
  }
  f.tick(11000);
  const payload = { id: start.data.id, t: 1201, alive: false, clean: true };
  const r = await f.request("/run/end", payload, a.cookie);
  assert.equal(r.data.save.difficulty.cleared[1], true);
  const repeat = await f.request("/run/end", payload, a.cookie);
  assert.equal(repeat.status, 200);
  assert.equal(repeat.data.alreadyEnded, true);
});
test("admin permissions and bans are outside the save, reject login and cannot be self-cleared", async (t) => {
  const f = await fixture(t),
    admin = await f.account("AdminTester"),
    a = await f.account("BanTester");
  f.app.db
    .prepare("UPDATE users SET role='admin' WHERE uid=?")
    .run(admin.user.uid);
  assert.equal(
    (await f.request("/admin/users", undefined, a.cookie)).status,
    403,
  );
  assert.equal(
    (
      await f.request(
        "/admin/ban",
        { uid: a.user.uid, ban: true },
        admin.cookie,
      )
    ).status,
    200,
  );
  assert.equal((await f.request("/session", undefined, a.cookie)).status, 401);
  assert.equal(
    (
      await f.request("/login", {
        name: "BanTester",
        pass: "test-only-strong-password",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await f.request("/recover", {
        name: "BanTester",
        pass: "new-password-only",
        recovery: a.recovery,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request("/register", {
        name: "BanTester",
        pass: "new-password-only",
      })
    ).status,
    409,
  );
});
test("room membership is invitation-only, capacity is enforced, start and sender identities are server-authoritative", async (t) => {
  const f = await fixture(t),
    a = await f.account("RoomHost"),
    b = await f.account("RoomGuest"),
    c = await f.account("RoomOutsider");
  await f.seed(a);
  await f.seed(b);
  await f.seed(c);
  const room = (await f.request("/room/create", {}, a.cookie)).data.room;
  assert.equal(
    (await f.request("/room/join", { id: room.id }, c.cookie)).status,
    403,
  );
  await f.request("/friends/request", { name: "RoomGuest" }, a.cookie);
  assert.equal(
    (await f.request("/friends/accept", { uid: b.user.uid }, a.cookie)).status,
    403,
  );
  await f.request("/friends/accept", { uid: a.user.uid }, b.cookie);
  await f.request("/room/invite", { uid: b.user.uid }, a.cookie);
  assert.equal(
    (await f.request("/room/join", { id: room.id }, b.cookie)).status,
    200,
  );
  const wa = f.connect(a),
    wb = f.connect(b);
  await Promise.all([once(wa, "open"), once(wb, "open")]);
  t.after(() => {
    wa.terminate();
    wb.terminate();
  });
  assert.equal(
    (await f.request("/room/start", { difficulty: 1 }, b.cookie)).status,
    403,
  );
  const started = await f.request("/room/start", { difficulty: 8 }, a.cookie);
  assert.equal(started.status, 200);
  assert.equal(started.data.cfg.difficulty, 1);
  const got = new Promise((resolve) =>
    wa.on("message", (raw) => {
      const m = JSON.parse(raw);
      if (m.k === "net" && m.msg.k === "f") resolve(m);
    }),
  );
  wb.send(
    JSON.stringify({
      k: "net",
      to: a.user.uid,
      from: c.user.uid,
      msg: { k: "f", ev: [] },
    }),
  );
  assert.equal((await got).from, b.user.uid);
  wb.send(
    JSON.stringify({ k: "net", to: c.user.uid, msg: { k: "f", ev: [] } }),
  );
  await once(wb, "close");
  assert.equal(f.app.rooms.get(room.id).members.size, 2);
});
test("HTTP method/origin checks, unauthenticated API and private static paths", async (t) => {
  const f = await fixture(t);
  assert.equal((await f.request("/session")).status, 401);
  assert.equal((await f.request("/logout")).status, 405);
  assert.equal(
    (
      await f.request(
        "/register",
        { name: "CrossOrigin", pass: "test-password" },
        null,
        { Origin: "https://evil.example" },
      )
    ).status,
    403,
  );
  for (const name of [
    "/server/data/game.sqlite",
    "/server/package.json",
    "/functions/index.js",
    "/.git/config",
  ])
    assert.equal((await fetch(f.base + name)).status, 404);
  assert.equal((await fetch(f.base + "/dev.html")).status, 200);
});
test("room capacity is checked atomically before the fifth member can join", async (t) => {
  const f = await fixture(t),
    host = await f.account("CapacityHost");
  await f.seed(host);
  const room = (await f.request("/room/create", {}, host.cookie)).data.room;
  for (let i = 1; i <= 4; i++) {
    const a = await f.account("CapacityPeer" + i);
    await f.seed(a);
    await f.request(
      "/friends/request",
      { name: "CapacityPeer" + i },
      host.cookie,
    );
    await f.request("/friends/accept", { uid: host.user.uid }, a.cookie);
    const invite = await f.request(
      "/room/invite",
      { uid: a.user.uid },
      host.cookie,
    );
    if (i <= 3) {
      assert.equal(invite.status, 200);
      assert.equal(
        (await f.request("/room/join", { id: room.id }, a.cookie)).status,
        200,
      );
    } else {
      assert.equal(invite.status, 403);
      assert.equal(
        (await f.request("/room/join", { id: room.id }, a.cookie)).status,
        403,
      );
    }
  }
  assert.equal(f.app.rooms.get(room.id).members.size, 4);
});

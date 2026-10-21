"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { once } = require("node:events"),
  { WebSocket } = require("../server/node_modules/ws");
const { createApp } = require("../server/server.cjs"),
  { G } = require("../server/domain.cjs");
function message(socket, test) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("message", receive);
      reject(new Error("WebSocket message timed out"));
    }, 3000);
    function receive(raw) {
      const value = JSON.parse(raw);
      if (test(value)) {
        clearTimeout(timer);
        socket.off("message", receive);
        resolve(value);
      }
    }
    socket.on("message", receive);
  });
}
const SDP = "v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n";
async function handshake(wa, wb, room, a, b, attempt = "testattempt123") {
  let got = message(
    wb,
    (m) => m.k === "signal" && m.description?.type === "offer",
  );
  wa.send(
    JSON.stringify({
      k: "signal",
      room: room.id,
      to: b.user.uid,
      from: "forged",
      attempt,
      description: { type: "offer", sdp: SDP },
    }),
  );
  assert.equal((await got).from, a.user.uid);
  got = message(
    wa,
    (m) => m.k === "signal" && m.description?.type === "answer",
  );
  wb.send(
    JSON.stringify({
      k: "signal",
      room: room.id,
      to: a.user.uid,
      attempt,
      description: { type: "answer", sdp: SDP },
    }),
  );
  await got;
  got = message(
    wa,
    (m) => m.k === "room" && m.room?.ready?.includes(b.user.uid),
  );
  wa.send(
    JSON.stringify({
      k: "signal",
      room: room.id,
      to: b.user.uid,
      attempt,
      ready: true,
    }),
  );
  wb.send(
    JSON.stringify({
      k: "signal",
      room: room.id,
      to: a.user.uid,
      attempt,
      ready: true,
    }),
  );
  await got;
}
async function fixture(t) {
  let clock = Date.now();
  const app = createApp({coopEnabled:true, dbFile: ":memory:", now: () => clock });
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  t.after(() => app.close());
  const base = "http://127.0.0.1:" + app.server.address().port;
  const versions = new Map();
  async function request(route, b, cookie, extra = {}) {
    if (["/presence", "/run/beat"].includes(route) && b && !("rev" in b))
      b = { ...b, rev: versions.get(cookie) };
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
    const value = {
      status: r.status,
      data: await r.json(),
      cookie: r.headers.get("set-cookie")?.split(";")[0],
    };
    if (value.data.rev) versions.set(value.cookie || cookie, value.data.rev);
    return value;
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
    { double = false, dirty = false, end = true, duration = 1201 } = {},
  ) {
    const start = await request(
      "/run/start",
      { dex: 133, stars, mode: "s", clean: !dirty },
      a.cookie,
    );
    assert.equal(start.status, 200, JSON.stringify(start.data));
    let seconds = 0,
      result;
    if (double) {
      const speed = await request('/run/beat', {id:start.data.id,t:0,speed:2,alive:true,clean:!dirty}, a.cookie);
      assert.equal(speed.status,200);
    }
    while (seconds < duration) {
      const dt = Math.min(60, duration - seconds);
      clock += dt * 1000 / (double ? 2 : 1);
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
          t: duration,
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
test("clock checks retain their budget; clean eight-star runs count at normal and double speed", async (t) => {
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
  assert.equal((await f.request('/ranking?board=survival',undefined,a.cookie)).data.me,null);
  await f.run(a, 8, { double: true, duration: 1400 });
  assert.equal((await f.request('/ranking?board=survival',undefined,a.cookie)).data.me.t,1400);
  await f.run(a, 8, { dirty: true, double: true, duration: 1600 });
  assert.equal((await f.request('/ranking?board=survival',undefined,a.cookie)).data.me.t,1400);
  await f.run(a, 8);
  assert.equal((await f.request('/ranking?board=survival',undefined,a.cookie)).data.me.t,1400);
  await f.run(a, 8, {duration:1500});
  assert.equal((await f.request('/ranking?board=survival',undefined,a.cookie)).data.me.t,1500);
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
test("room membership, authenticated P2P signaling, bilateral readiness and start permissions are server-authoritative", async (t) => {
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
  assert.equal(
    (await f.request("/room/start", { difficulty: 1 }, a.cookie)).status,
    409,
  );
  await handshake(wa, wb, room, a, b);
  const started = await f.request("/room/start", { difficulty: 8 }, a.cookie);
  assert.equal(started.status, 200);
  assert.equal(started.data.cfg.difficulty, 1);
  assert.equal(started.data.cfg.transport, "p2p");
  let relayed = 0;
  wa.on("message", (raw) => {
    const m = JSON.parse(raw);
    if (m.k === "net" && m.msg.k === "f") relayed++;
  });
  const closing = once(wb, "close");
  wb.send(
    JSON.stringify({
      k: "net",
      to: a.user.uid,
      from: c.user.uid,
      msg: { k: "f", ev: [] },
    }),
  );
  await closing;
  assert.equal(relayed, 0);
  assert.equal(f.app.traffic.battleFramesRejected, 1);
  assert.equal(f.app.rooms.get(room.id).members.size, 2);
});

test("P2P signaling rejects outsider targets, guest offers, stale ready and oversized payloads", async (t) => {
  const f = await fixture(t),
    a = await f.account("SignalHost"),
    b = await f.account("SignalGuest"),
    c = await f.account("SignalOther");
  await f.seed(a);
  await f.seed(b);
  await f.seed(c);
  const r = {
    id: "signal-room",
    host: a.user.uid,
    open: true,
    members: new Map([
      [a.user.uid, { uid: a.user.uid }],
      [b.user.uid, { uid: b.user.uid }],
    ]),
    links: new Map(),
  };
  f.app.rooms.set(r.id, r);
  let wa = f.connect(a),
    wb = f.connect(b);
  await Promise.all([once(wa, "open"), once(wb, "open")]);
  t.after(() => {
    wa.terminate();
    wb.terminate();
  });
  await handshake(wa, wb, r, a, b);
  const got = message(
    wb,
    (m) => m.k === "signal" && m.description?.type === "offer",
  );
  wa.send(
    JSON.stringify({
      k: "signal",
      room: r.id,
      to: b.user.uid,
      attempt: "newattempt123",
      description: { type: "offer", sdp: SDP },
    }),
  );
  await got;
  wb.send(
    JSON.stringify({
      k: "signal",
      room: r.id,
      to: a.user.uid,
      attempt: "testattempt123",
      ready: true,
    }),
  );
  const synced = message(wa, (m) => m.k === "signal" && m.candidate);
  wb.send(
    JSON.stringify({
      k: "signal",
      room: r.id,
      to: a.user.uid,
      attempt: "newattempt123",
      candidate: {
        candidate: "candidate:1 1 udp 1 127.0.0.1 5000 typ host",
        sdpMid: "0",
        sdpMLineIndex: 0,
        padding: "not-forwarded",
      },
    }),
  );
  const forwarded = await synced;
  assert.equal(forwarded.candidate.padding, undefined);
  assert.equal(r.links.get(b.user.uid).ready.size, 0);
  let closing = once(wb, "close");
  wb.send(
    JSON.stringify({
      k: "signal",
      room: r.id,
      to: a.user.uid,
      attempt: "newattempt123",
      description: { type: "offer", sdp: SDP },
    }),
  );
  await closing;
  wb = f.connect(b);
  await once(wb, "open");
  closing = once(wb, "close");
  wb.send(
    JSON.stringify({
      k: "signal",
      room: r.id,
      to: c.user.uid,
      attempt: "newattempt123",
      candidate: { candidate: "candidate:1" },
    }),
  );
  await closing;
  closing = once(wa, "close");
  wa.send(
    JSON.stringify({
      k: "signal",
      room: r.id,
      to: b.user.uid,
      attempt: "newattempt123",
      description: { type: "offer", sdp: SDP + "x".repeat(17000) },
    }),
  );
  await closing;
});

test("P2P handshakes have a byte quota, no TURN config, and routine presence/heartbeats return compact progress", async (t) => {
  const f = await fixture(t),
    a = await f.account("CompactHost"),
    b = await f.account("CompactGuest");
  await f.seed(a);
  await f.seed(b);
  const health = (await f.request("/health")).data;
  assert.equal(health.transport, "p2p");
  assert.equal(health.relay, false);
  const start = await f.request(
    "/run/start",
    { dex: 133, stars: 1, clean: true },
    a.cookie,
  );
  f.tick(10000);
  const beat = await f.request(
    "/run/beat",
    { id: start.data.id, t: 10, clean: true, alive: true, speed: 1 },
    a.cookie,
  );
  assert.equal(beat.status, 200);
  assert.equal(beat.data.save, undefined);
  assert.ok(beat.data.progress.offline);
  assert.ok(JSON.stringify(beat.data).length < 2000);
  const presence = await f.request("/presence", {}, a.cookie);
  assert.equal(presence.data.save, undefined);
  assert.ok(JSON.stringify(presence.data).length < 1000);
  assert.equal(
    (await f.request("/presence", { rev: beat.data.rev }, a.cookie)).status,
    409,
  );
  assert.equal(
    (
      await f.request(
        "/run/beat",
        {
          id: start.data.id,
          t: 10,
          clean: true,
          alive: true,
          speed: 1,
          rev: beat.data.rev,
        },
        a.cookie,
      )
    ).status,
    409,
  );
  const r = {
    id: "quota-room",
    host: a.user.uid,
    open: true,
    members: new Map([
      [a.user.uid, { uid: a.user.uid }],
      [b.user.uid, { uid: b.user.uid }],
    ]),
    links: new Map(),
  };
  f.app.rooms.set(r.id, r);
  const wa = f.connect(a),
    wb = f.connect(b);
  const hello = message(wa, (m) => m.k === "hello");
  await Promise.all([once(wa, "open"), once(wb, "open")]);
  t.after(() => {
    wa.terminate();
    wb.terminate();
  });
  assert.ok((await hello).iceServers.every((s) => /^stuns?:/.test(s.urls)));
  const closing = once(wa, "close");
  for (let i = 0; i < 10; i++)
    wa.send(
      JSON.stringify({
        k: "signal",
        room: r.id,
        to: b.user.uid,
        attempt: "quotaattempt" + i,
        description: { type: "offer", sdp: SDP + "a".repeat(15000) },
      }),
    );
  await closing;
  assert.ok(f.app.traffic.signalingBytes <= 98304);
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

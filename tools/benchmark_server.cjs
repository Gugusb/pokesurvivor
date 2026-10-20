/* Disposable local benchmark. Does not access live accounts or databases. */
"use strict";
const { createApp } = require("../server/server.cjs"),
  { fresh } = require("../server/domain.cjs");
const { WebSocket } = require("../server/node_modules/ws"),
  { randomUUID, createHash } = require("node:crypto"),
  { once } = require("node:events");
const { monitorEventLoopDelay, performance } = require("node:perf_hooks");
if (require('../server/server.cjs').VERSION !== '0.15.0') {
  console.error('This relay benchmark is retained for v0.15.0. Use node tools/benchmark_p2p.cjs 100 on the P2P version.');
  process.exit(1);
}
const clients = Math.max(4, Math.min(400, Number(process.argv[2]) || 100)),
  seconds = 8;
(async () => {
  const app = createApp({coopEnabled:true, dbFile: ":memory:" }),
    start = Date.now(),
    ids = [],
    cookies = [];
  app.db.exec("BEGIN");
  const user = app.db.prepare(
      "INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)",
    ),
    save = app.db.prepare("INSERT INTO saves(uid,payload) VALUES(?,?)"),
    score = app.db.prepare("INSERT INTO completion_scores VALUES(?,?,?)");
  const payload = JSON.stringify(fresh("Benchmark"));
  for (let i = 0; i < 10000; i++) {
    const uid = randomUUID();
    ids.push(uid);
    user.run(uid, "Bench" + i, "bench" + i, "unused", "unused", start);
    save.run(uid, payload);
    score.run(uid, i % 100, start);
    if (i < clients) {
      const token = randomUUID();
      cookies.push("ps_session=" + token);
      app.db
        .prepare("INSERT INTO sessions VALUES(?,?,?)")
        .run(
          createHash("sha256").update(token).digest("hex"),
          uid,
          start + 864e5,
        );
    }
  }
  app.db.exec("COMMIT");
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  const base = "http://127.0.0.1:" + app.server.address().port,
    ws = [];
  let bytes = 0,
    frames = 0;
  const lag = monitorEventLoopDelay({ resolution: 10 });
  lag.enable();
  for (let i = 0; i < clients; i++) {
    const socket = new WebSocket(base.replace("http:", "ws:") + "/ws", {
      headers: { Cookie: cookies[i] },
    });
    socket.on("message", (raw) => {
      const m = JSON.parse(raw);
      if (m.k === "net") {
        bytes += raw.length;
        frames++;
      }
    });
    ws.push(socket);
    await once(socket, "open");
  }
  for (let i = 0; i < clients; i += 4) {
    const group = ids.slice(i, Math.min(i + 4, clients));
    const room = {
      id: "bench" + i,
      host: group[0],
      open: false,
      members: new Map(
        group.map((uid) => [uid, { uid, name: "Benchmark", dex: 133 }]),
      ),
    };
    app.rooms.set(room.id, room);
  }
  const api = [];
  for (let i = 0; i < 50; i++) {
    const at = performance.now();
    const r = await fetch(base + "/api/ranking?board=completion", {
      headers: { Cookie: cookies[0] },
    });
    await r.json();
    if (!r.ok) throw new Error("Ranking benchmark failed");
    api.push(performance.now() - at);
  }
  const began = performance.now(),
    cpu = process.cpuUsage(),
    padding = "x".repeat(5000);
  const timer = setInterval(() => {
    for (let i = 0; i < clients; i += 4)
      for (let j = i + 1; j < Math.min(i + 4, clients); j++) {
        ws[i].send(
          JSON.stringify({
            k: "net",
            to: ids[j],
            msg: { k: "f", ev: [], padding },
          }),
        );
        ws[j].send(
          JSON.stringify({ k: "net", to: ids[i], msg: { k: "f", ev: [] } }),
        );
      }
  }, 100);
  await new Promise((r) => setTimeout(r, seconds * 1000));
  clearInterval(timer);
  await new Promise((r) => setTimeout(r, 100));
  lag.disable();
  const elapsed = (performance.now() - began) / 1000,
    used = process.cpuUsage(cpu);
  api.sort((a, b) => a - b);
  console.log(
    JSON.stringify(
      {
        accounts: 10000,
        connections: clients,
        seconds: elapsed.toFixed(1),
        receivedFrames: frames,
        relayOutboundMbps: +((bytes * 8) / elapsed / 1e6).toFixed(2),
        rankingP95ms: +api[Math.floor(api.length * 0.95)].toFixed(2),
        eventLoopP99ms: +(lag.percentile(99) / 1e6).toFixed(2),
        rssMiB: +(process.memoryUsage().rss / 1024 / 1024).toFixed(1),
        processCpuCores: +((used.user + used.system) / 1e6 / elapsed).toFixed(
          2,
        ),
      },
      null,
      2,
    ),
  );
  for (const socket of ws) socket.terminate();
  await app.close();
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});

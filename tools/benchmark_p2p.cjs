/* P2P control-plane benchmark; disposable accounts and no real WebRTC/NAT. */
const { createApp } = require("../server/server.cjs"),
  { fresh } = require("../server/domain.cjs");
const { WebSocket } = require("../server/node_modules/ws"),
  { randomUUID, createHash } = require("node:crypto"),
  { once } = require("node:events");
const { monitorEventLoopDelay, performance } = require("node:perf_hooks");
const clients = Math.max(4, Math.min(400, Number(process.argv[2]) || 100)),
  seconds = 8;
(async () => {
  const app = createApp({ dbFile: ":memory:", stunUrls: "none" }),
    ids = [],
    cookies = [],
    sockets = [];
  let receivedBytes = 0,
    signalingReady = 0,
    presenceBytes = 0;
  try {
    const created = Date.now(),
      s = fresh("Benchmark");
    s.partner = 133;
    s.owned[133] = { at: created, from: "fixture", iv: [1, 1, 1] };
    const payload = JSON.stringify(s);
    app.db.exec("BEGIN");
    const user = app.db.prepare(
        "INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)",
      ),
      save = app.db.prepare("INSERT INTO saves(uid,payload) VALUES(?,?)"),
      score = app.db.prepare("INSERT INTO completion_scores VALUES(?,?,?)");
    for (let i = 0; i < 10000; i++) {
      const uid = randomUUID();
      ids.push(uid);
      user.run(uid, "Bench" + i, "bench" + i, "unused", "unused", created);
      save.run(uid, payload);
      score.run(uid, i % 100, created);
      if (i < clients) {
        const token = randomUUID();
        cookies.push("ps_session=" + token);
        app.db
          .prepare("INSERT INTO sessions VALUES(?,?,?)")
          .run(
            createHash("sha256").update(token).digest("hex"),
            uid,
            created + 864e5,
          );
      }
    }
    app.db.exec("COMMIT");
    app.server.listen(0, "127.0.0.1");
    await once(app.server, "listening");
    const base = "http://127.0.0.1:" + app.server.address().port;
    const lag = monitorEventLoopDelay({ resolution: 10 });
    lag.enable();
    const began = performance.now(),
      cpu = process.cpuUsage();
    for (let i = 0; i < clients; i++) {
      const ws = new WebSocket(base.replace("http:", "ws:") + "/ws", {
        headers: { Cookie: cookies[i] },
      });
      sockets.push(ws);
      ws.on("message", (raw) => {
        receivedBytes += raw.length;
        const m = JSON.parse(raw);
        if (m.k === "signal" && m.description?.type === "offer") {
          ws.send(
            JSON.stringify({
              k: "signal",
              room: m.room,
              to: m.from,
              attempt: m.attempt,
              description: {
                type: "answer",
                sdp: "v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n",
              },
            }),
          );
          ws.send(
            JSON.stringify({
              k: "signal",
              room: m.room,
              to: m.from,
              attempt: m.attempt,
              ready: true,
            }),
          );
        } else if (m.k === "signal" && m.description?.type === "answer") {
          ws.send(
            JSON.stringify({
              k: "signal",
              room: m.room,
              to: m.from,
              attempt: m.attempt,
              ready: true,
            }),
          );
          signalingReady++;
        }
      });
      await once(ws, "open");
    }
    for (let i = 0; i < clients; i += 4) {
      const group = ids.slice(i, Math.min(i + 4, clients)),
        r = {
          id: "bench" + i,
          host: group[0],
          open: true,
          members: new Map(
            group.map((uid) => [uid, { uid, name: "Benchmark", dex: 133 }]),
          ),
          links: new Map(),
        };
      app.rooms.set(r.id, r);
      for (let j = 1; j < group.length; j++)
        sockets[i].send(
          JSON.stringify({
            k: "signal",
            room: r.id,
            to: group[j],
            attempt: "bench-attempt-" + i + "-" + j,
            description: {
              type: "offer",
              sdp: "v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n",
            },
          }),
        );
    }
    const ranking = [];
    for (let i = 0; i < 50; i++) {
      const at = performance.now(),
        r = await fetch(base + "/api/ranking?board=completion", {
          headers: { Cookie: cookies[0] },
        });
      await r.json();
      if (!r.ok) throw Error("Ranking benchmark failed");
      ranking.push(performance.now() - at);
    }
    const presence = [];
    for (let i = 0; i < clients; i++) {
      const at = performance.now(),
        r = await fetch(base + "/api/presence", {
          method: "POST",
          headers: {
            Cookie: cookies[i],
            "Content-Type": "application/json",
            "X-PS-Client": "1",
          },
          body: '{"rev":1}',
        }),
        raw = await r.text();
      if (!r.ok) throw Error("Presence benchmark failed");
      presenceBytes += Buffer.byteLength(raw);
      presence.push(performance.now() - at);
    }
    const before = app.traffic.signalingMessages,
      steadyStart = performance.now();
    await new Promise((r) => setTimeout(r, seconds * 1000));
    lag.disable();
    const elapsed = (performance.now() - began) / 1000,
      used = process.cpuUsage(cpu);
    ranking.sort((a, b) => a - b);
    presence.sort((a, b) => a - b);
    console.log(
      JSON.stringify(
        {
          accounts: 10000,
          connections: clients,
          handshakes: signalingReady,
          handshakeSignalingMessages: app.traffic.signalingMessages,
          steadySeconds: +((performance.now() - steadyStart) / 1000).toFixed(1),
          steadySignalingMessages: app.traffic.signalingMessages - before,
          battleFramesRelayed: 0,
          averageWebSocketOutboundMbps: +(
            (receivedBytes * 8) /
            elapsed /
            1e6
          ).toFixed(4),
          averagePresenceBytes: Math.round(presenceBytes / clients),
          rankingP95ms: +ranking[Math.floor(ranking.length * 0.95)].toFixed(2),
          presenceP95ms:
            +presence[Math.floor(presence.length * 0.95)].toFixed(2),
          eventLoopP99ms: +(lag.percentile(99) / 1e6).toFixed(2),
          rssMiB: +(process.memoryUsage().rss / 1024 / 1024).toFixed(1),
          processCpuCores: +((used.user + used.system) / 1e6 / elapsed).toFixed(
            2,
          ),
          scope:
            "Synthetic signaling only; no NAT, battle simulation or cloud capacity claim",
        },
        null,
        2,
      ),
    );
  } finally {
    for (const ws of sockets) ws.terminate();
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

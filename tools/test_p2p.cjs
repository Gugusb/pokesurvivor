const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs"),
  path = require("node:path");
async function fixture(t) {
  const sockets = [],
    pcs = [],
    frames = [],
    modes = [];
  class Channel {
    constructor() {
      this.label = "battle-v2";
      this.ordered = true;
      this.readyState = "connecting";
      this.bufferedAmount = 0;
      this.sent = [];
    }
    send(s) {
      this.sent.push(s);
    }
    close() {
      this.readyState = "closed";
      this.onclose?.();
    }
    open() {
      this.readyState = "open";
      this.onopen();
    }
  }
  class RTC {
    constructor(config) {
      this.config = config;
      this.connectionState = "new";
      this.signalingState = "stable";
      pcs.push(this);
    }
    createDataChannel() {
      return (this.dc = new Channel());
    }
    async createOffer() {
      return {
        type: "offer",
        sdp: "v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n",
      };
    }
    async setLocalDescription(d) {
      this.localDescription = { ...d, toJSON: () => d };
      this.signalingState = "have-local-offer";
    }
    async setRemoteDescription(d) {
      this.remoteDescription = d;
      this.signalingState = "stable";
    }
    async addIceCandidate() {}
    async getStats() {
      return new Map();
    }
    close() {
      this.connectionState = "closed";
    }
  }
  class WS {
    static OPEN = 1;
    static CONNECTING = 0;
    constructor() {
      this.readyState = 0;
      this.bufferedAmount = 0;
      this.sent = [];
      sockets.push(this);
    }
    open() {
      this.readyState = 1;
      this.onopen();
      this.onmessage({
        data: JSON.stringify({
          k: "hello",
          protocol: 2,
          transport: "p2p",
          iceServers: [
            { urls: "stun:example.test" },
            { urls: "turn:forbidden.test" },
          ],
        }),
      });
    }
    send(s) {
      this.sent.push(JSON.parse(s));
    }
    close() {
      this.readyState = 3;
      this.onclose?.({ code: 1000 });
    }
  }
  const G = {
    Server: { user: { uid: "host" }, text: (a, b, c) => c },
    Coop: { active: false },
    UI: { toast() {} },
  };
  const context = vm.createContext({
    G,
    WebSocket: WS,
    RTCPeerConnection: RTC,
    TextEncoder,
    crypto: require("node:crypto").webcrypto,
    performance,
    location: { protocol: "http:", host: "localhost" },
    addEventListener() {},
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "../js/net/p2p.js"), "utf8"),
    context,
  );
  t.after(() => G.SelfNet.disconnect());
  G.Net.on((from, msg) => frames.push({ from, msg }));
  G.Net.onPeer((uid, mode) => modes.push({ uid, mode }));
  G.SelfNet.connect();
  G.SelfNet.setRoom({
    id: "testroom",
    host: "host",
    isHost: true,
    open: true,
    members: [{ uid: "host" }, { uid: "guest" }],
  });
  sockets[0].open();
  for (let i = 0; i < 12; i++) await Promise.resolve();
  return { G, sockets, pcs, frames, modes, dc: pcs[0].dc, context };
}
test("P2P uses only STUN and authenticates offers through signaling without battle fallback", async (t) => {
  const f = await fixture(t);
  assert.deepEqual(
    Array.from(f.pcs[0].config.iceServers, (s) => s.urls),
    ["stun:example.test"],
  );
  assert.equal(f.G.Net.send("guest", { k: "f", ev: [] }), false);
  assert.ok(f.sockets[0].sent.every((m) => m.k === "signal"));
  assert.equal(f.G.Net.stats.relaySent, 0);
  f.dc.open();
  assert.equal(f.G.Net.mode("guest"), "direct");
  assert.equal(f.G.Net.send("outsider", { k: "f" }), false);
  assert.equal(f.G.Net.send("guest", { k: "start" }), false);
  assert.ok(f.sockets[0].sent.some((m) => m.ready === true));
  assert.ok(f.G.Net.send("guest", { k: "f", ev: [] }));
});
test("large ordered combat frames are chunked and reassembled once with peer-bound identity", async (t) => {
  const f = await fixture(t);
  f.dc.open();
  const frame = {
    k: "f",
    from: "forged",
    ev: [["large", "宝可梦".repeat(18000)]],
  };
  assert.ok(f.G.Net.send("guest", frame));
  const parts = f.dc.sent.map(JSON.parse);
  assert.ok(parts.length > 2);
  assert.ok(parts.every((p) => p.k === "part" && p.data.length <= 12000));
  for (const raw of f.dc.sent) f.dc.onmessage({ data: raw });
  assert.equal(f.frames.length, 1);
  assert.equal(f.frames[0].from, "guest");
  assert.equal(f.frames[0].msg.ev[0][1], frame.ev[0][1]);
  f.dc.onmessage({ data: JSON.stringify({ k: "start", host: "forged" }) });
  assert.equal(f.frames.length, 1);
});
test("incomplete, oversized and reordered chunks cannot deliver partial gameplay", async (t) => {
  const f = await fixture(t);
  f.dc.open();
  for (const m of [
    { k: "part", id: 1, i: 1, n: 2, data: "{}" },
    { k: "part", id: 2, i: 0, n: 999999, data: "x" },
    { k: "part", id: 3, i: 0, n: 2, data: "x".repeat(12001) },
  ])
    f.dc.onmessage({ data: JSON.stringify(m) });
  assert.equal(f.frames.length, 0);
  assert.equal(
    f.G.Net.send("guest", { k: "f", text: "x".repeat(524289) }),
    false,
  );
  assert.equal(f.G.Net.stats.relaySent, 0);
});
test("backpressure triggers bounded recovery without sending a combat frame on WebSocket", async (t) => {
  const f = await fixture(t);
  f.dc.open();
  f.dc.bufferedAmount = 2e6;
  assert.equal(f.G.Net.send("guest", { k: "f", ev: [] }), false);
  assert.equal(f.G.Net.mode("guest"), "connecting");
  assert.ok(f.sockets[0].sent.every((m) => m.k === "signal"));
  assert.equal(f.G.Net.stats.relaySent, 0);
});
test("stale signaling and non-host start messages are ignored; room exit closes every peer", async (t) => {
  const f = await fixture(t);
  f.dc.open();
  f.sockets[0].onmessage({
    data: JSON.stringify({
      k: "net",
      from: "outsider",
      msg: { k: "start", host: "outsider", protocol: 2 },
    }),
  });
  f.sockets[0].onmessage({
    data: JSON.stringify({
      k: "signal",
      room: "another-room",
      from: "guest",
      attempt: "oldattempt",
      description: { type: "answer", sdp: "forged" },
    }),
  });
  await Promise.resolve();
  assert.equal(f.frames.length, 0);
  assert.equal(f.pcs[0].remoteDescription, undefined);
  f.G.SelfNet.setRoom(null);
  assert.equal(f.G.Net.peers().length, 0);
  assert.equal(f.dc.readyState, "closed");
  assert.equal(f.G.Net.open_, false);
});

test("compact authoritative progress merges preserve local spending and previously received records", async (t) => {
  const f = await fixture(t),
    G = f.G;
  f.context.document = { addEventListener() {} };
  G.DB = {
    save: {
      coins: 100,
      difficulty: { selected: 1, cleared: {} },
      difficultyRecords: {},
      offline: { seen: 1 },
    },
    onLeave() {},
    serverApply(s) {
      this.save = JSON.parse(JSON.stringify(s));
    },
  };
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "../js/net/server-client.js"), "utf8"),
    f.context,
  );
  G.Server.accept({ rev: 1, save: JSON.parse(JSON.stringify(G.DB.save)) });
  G.DB.save.coins = 55;
  G.Server.accept({
    rev: 2,
    progress: {
      difficulty: { selected: 1, cleared: { 1: true } },
      records: { 133: { 1: { won: true, best: 1201 } } },
      offline: { seen: 2 },
    },
  });
  assert.equal(G.DB.save.coins, 55);
  assert.equal(G.DB.save.difficultyRecords[133][1].won, true);
  assert.equal(G.DB.save.difficulty.cleared[1], true);
  G.Server.accept({ rev: 3, progress: { offline: { seen: 3 } } });
  assert.equal(G.DB.save.coins, 55);
  assert.equal(G.DB.save.difficultyRecords[133][1].best, 1201);
  assert.equal(G.DB.save.offline.seen, 3);
});

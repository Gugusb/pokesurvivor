/* Authenticated signaling only. Battle frames never fall back to the server.
 * Host-star WebRTC DataChannels retain ordered delivery for combat events.
 * Chunking stays below SCTP message limits; queues and reconnects are bounded. */
G.SelfNet = (() => {
  const PROTOCOL = 2,
    CONNECT_MS = 20000,
    CHUNK = 12000,
    MAX_FRAME = 524288;
  let ws = null,
    room = null,
    stopped = true,
    configured = false,
    retry = null,
    pulse = null,
    lostAt = 0;
  let iceServers = [{ urls: "stun:stun.cloudflare.com:3478" }],
    seq = 0;
  const peers = new Map(),
    handlers = new Set(),
    peerHandlers = new Set(),
    events = new Set();
  const stats = {
    sent: 0,
    recv: 0,
    relaySent: 0,
    bytesSent: 0,
    bytesRecv: 0,
    signalSent: 0,
  };
  const uid = () => G.Server?.user?.uid;
  const active = (p) => peers.get(p.uid) === p && room && !p.closed;
  const isHost = () => room?.host === uid();
  const allowed = (u) =>
    room &&
    u !== uid() &&
    room.members.some((m) => m.uid === u) &&
    (isHost() || u === room.host);
  function emitPeer(p) {
    for (const fn of peerHandlers) fn(p.uid, p.mode);
  }
  function mode(p, value) {
    if (!active(p)) return;
    p.mode = value;
    emitPeer(p);
  }
  function signal(p, value) {
    if (
      !active(p) ||
      ws?.readyState !== WebSocket.OPEN ||
      ws.bufferedAmount > 65536
    )
      return false;
    ws.send(
      JSON.stringify({
        k: "signal",
        room: room.id,
        to: p.uid,
        attempt: p.attempt,
        ...value,
      }),
    );
    stats.signalSent++;
    return true;
  }
  function dispose(p, notify = false) {
    if (!p) return;
    p.closed = true;
    clearTimeout(p.timer);
    clearTimeout(p.recover);
    clearTimeout(p.again);
    if (peers.get(p.uid) === p) peers.delete(p.uid);
    try {
      p.dc?.close();
      p.pc?.close();
    } catch {}
    if (notify) {
      p.mode = "closed";
      emitPeer(p);
    }
  }
  function failed(p) {
    if (!active(p) || p.mode === "failed") return;
    clearTimeout(p.timer);
    clearTimeout(p.recover);
    p.mode = "failed";
    p.closed = true;
    try {
      p.dc?.close();
      p.pc?.close();
    } catch {}
    emitPeer(p);
    // A failed participant cannot rejoin the middle of an existing run.
    if (!G.Coop?.active && isHost())
      p.again = setTimeout(() => {
        p.again = null;
        if (peers.get(p.uid) === p && allowed(p.uid) && room.open)
          startPeer(p.uid);
      }, 15000);
  }
  function recovering(p) {
    if (!active(p) || p.mode === "failed" || p.recover) return;
    if (p.mode === "direct") {
      p.deadline = Date.now() + CONNECT_MS;
      p.readySent = false;
    }
    mode(p, "connecting");
    clearTimeout(p.timer);
    p.timer = setTimeout(() => failed(p), Math.max(1, p.deadline - Date.now()));
    p.recover = setTimeout(() => {
      p.recover = null;
      if (!active(p)) return;
      if (isHost()) startPeer(p.uid, p.deadline);
      else signal(p, { retry: true });
    }, 1500);
  }
  function makePeer(u, attempt, deadline = Date.now() + CONNECT_MS) {
    dispose(peers.get(u));
    const p = {
      uid: u,
      attempt,
      deadline,
      mode: "connecting",
      closed: false,
      pc: null,
      dc: null,
      pending: [],
      localIce: [],
      offered: false,
      readySent: false,
      rtt: null,
      assembly: null,
      pingAt: 0,
    };
    peers.set(u, p);
    p.timer = setTimeout(() => failed(p), Math.max(1, deadline - Date.now()));
    try {
      p.pc = new RTCPeerConnection({ iceServers, iceTransportPolicy: "all" });
      p.pc.onicecandidate = (e) => {
        if (!e.candidate || !active(p)) return;
        const c = e.candidate.toJSON();
        if (p.offered) signal(p, { candidate: c });
        else p.localIce.push(c);
      };
      p.pc.onconnectionstatechange = () => {
        if (!active(p)) return;
        if (["failed", "disconnected"].includes(p.pc.connectionState))
          recovering(p);
        else if (
          p.pc.connectionState === "connected" &&
          p.dc?.readyState === "open"
        )
          opened(p);
      };
      p.pc.ondatachannel = (e) => {
        if (
          isHost() ||
          p.dc ||
          e.channel.label !== "battle-v2" ||
          !e.channel.ordered ||
          e.channel.maxRetransmits != null ||
          e.channel.maxPacketLifeTime != null
        ) {
          e.channel.close();
          return;
        }
        wire(p, e.channel);
      };
    } catch {
      failed(p);
    }
    emitPeer(p);
    return p;
  }
  function offered(p) {
    p.offered = true;
    for (const c of p.localIce.splice(0)) signal(p, { candidate: c });
  }
  async function startPeer(u, deadline) {
    if (
      !allowed(u) ||
      !isHost() ||
      !configured ||
      ws?.readyState !== WebSocket.OPEN
    )
      return;
    const p = makePeer(u, crypto.randomUUID().replaceAll("-", ""), deadline);
    if (!p.pc) return;
    wire(p, p.pc.createDataChannel("battle-v2", { ordered: true }));
    try {
      await p.pc.setLocalDescription(await p.pc.createOffer());
      if (!active(p)) return;
      if (!signal(p, { description: p.pc.localDescription.toJSON() })) {
        recovering(p);
        return;
      }
      offered(p);
    } catch {
      recovering(p);
    }
  }
  async function onSignal(m) {
    if (!room || m.room !== room.id || !allowed(m.from)) return;
    let p = peers.get(m.from);
    try {
      if (m.description?.type === "offer") {
        if (isHost() || m.from !== room.host || typeof m.attempt !== "string")
          return;
        // Per-socket async handlers are serialized below so ICE cannot race SDP.
        const deadline = p?.mode === "connecting" ? p.deadline : undefined;
        p = makePeer(m.from, m.attempt, deadline);
        if (!p.pc) return;
        await p.pc.setRemoteDescription(m.description);
        await p.pc.setLocalDescription(await p.pc.createAnswer());
        if (!active(p)) return;
        signal(p, { description: p.pc.localDescription.toJSON() });
        offered(p);
      } else {
        if (!p || !active(p) || p.attempt !== m.attempt) return;
        if (m.description?.type === "answer" && isHost()) {
          if (p.pc.signalingState !== "have-local-offer") return;
          await p.pc.setRemoteDescription(m.description);
          for (const c of p.pending.splice(0)) await p.pc.addIceCandidate(c);
        } else if (m.candidate) {
          if (p.pc.remoteDescription) await p.pc.addIceCandidate(m.candidate);
          else if (p.pending.length < 64) p.pending.push(m.candidate);
        } else if (m.retry && isHost()) {
          if (Date.now() - (p.lastRetry || 0) < 1500) return;
          p.lastRetry = Date.now();
          recovering(p);
        }
      }
    } catch {
      if (p) recovering(p);
    }
  }
  function opened(p) {
    if (!active(p)) return;
    const changed = p.mode !== "direct";
    clearTimeout(p.timer);
    clearTimeout(p.recover);
    p.recover = null;
    p.mode = "direct";
    if (changed) p.assembly = null;
    if (!p.readySent) p.readySent = signal(p, { ready: true });
    emitPeer(p);
    if (changed && G.Coop?.active) G.Coop.resync();
  }
  function wire(p, dc) {
    p.dc = dc;
    dc.binaryType = "arraybuffer";
    dc.onopen = () => opened(p);
    dc.onclose = dc.onerror = () => recovering(p);
    dc.onmessage = (e) => {
      if (!active(p) || typeof e.data !== "string" || e.data.length > 65536)
        return;
      stats.bytesRecv += new TextEncoder().encode(e.data).length;
      try {
        let m = JSON.parse(e.data);
        if (m.k === "ping") {
          if (Number.isSafeInteger(m.id))
            dc.send(JSON.stringify({ k: "pong", id: m.id }));
          return;
        }
        if (m.k === "pong") {
          if (m.id === p.pingId) {
            p.rtt = Math.max(0, Math.round(performance.now() - p.pingAt));
            emitPeer(p);
          }
          return;
        }
        if (m.k === "part") {
          if (
            !Number.isSafeInteger(m.id) ||
            !Number.isInteger(m.i) ||
            !Number.isInteger(m.n) ||
            m.n < 2 ||
            m.n > Math.ceil(MAX_FRAME / CHUNK) ||
            typeof m.data !== "string" ||
            m.data.length > CHUNK
          )
            return;
          if (m.i === 0)
            p.assembly = {
              id: m.id,
              n: m.n,
              next: 0,
              text: "",
              at: Date.now(),
            };
          const a = p.assembly;
          if (
            !a ||
            a.id !== m.id ||
            a.n !== m.n ||
            a.next !== m.i ||
            Date.now() - a.at > 15000
          ) {
            p.assembly = null;
            return;
          }
          a.text += m.data;
          a.next++;
          if (a.text.length > MAX_FRAME) {
            p.assembly = null;
            return;
          }
          if (a.next !== a.n) return;
          p.assembly = null;
          m = JSON.parse(a.text);
        }
        if (m?.k !== "f") return; // Start/room/identity messages only come from our authenticated server.
        stats.recv++;
        for (const fn of handlers) fn(p.uid, m);
      } catch {
        /* Drop malformed peer data; it never reaches the server. */
      }
    };
  }
  function send(to, msg) {
    const p = peers.get(to);
    if (
      !allowed(to) ||
      p?.mode !== "direct" ||
      p.dc?.readyState !== "open" ||
      msg?.k !== "f"
    )
      return false;
    const data = JSON.stringify(msg);
    if (data.length > MAX_FRAME || p.dc.bufferedAmount > 2 * MAX_FRAME) {
      recovering(p);
      return false;
    }
    try {
      const sendRaw = (raw) => {
        p.dc.send(raw);
        stats.bytesSent += new TextEncoder().encode(raw).length;
      };
      if (data.length <= CHUNK) sendRaw(data);
      else {
        const id = ++seq,
          n = Math.ceil(data.length / CHUNK);
        for (let i = 0; i < n; i++)
          sendRaw(
            JSON.stringify({
              k: "part",
              id,
              i,
              n,
              data: data.slice(i * CHUNK, (i + 1) * CHUNK),
            }),
          );
      }
      stats.sent++;
      return true;
    } catch {
      recovering(p);
      return false;
    }
  }
  function sync() {
    for (const [u, p] of peers) if (!allowed(u)) dispose(p, true);
    if (!room || !configured || ws?.readyState !== WebSocket.OPEN) return;
    for (const m of room.members) {
      if (!allowed(m.uid)) continue;
      const p = peers.get(m.uid);
      if (isHost() && (!p || (p.mode === "failed" && room.open && !p.again)))
        startPeer(m.uid);
      else if (!p) {
        // Guest waits for the authenticated host's offer.
        const placeholder = {
          uid: m.uid,
          mode: "connecting",
          closed: false,
          deadline: Date.now() + CONNECT_MS,
        };
        peers.set(m.uid, placeholder);
        placeholder.timer = setTimeout(() => failed(placeholder), CONNECT_MS);
        emitPeer(placeholder);
      }
    }
  }
  function setRoom(r) {
    if (room?.id !== r?.id || room?.host !== r?.host)
      for (const p of [...peers.values()]) dispose(p, true);
    room = r;
    sync();
  }
  function checkPeers() {
    for (const p of peers.values()) {
      if (p.mode !== "direct" || p.dc?.readyState !== "open") continue;
      p.pingId = ++seq;
      p.pingAt = performance.now();
      try {
        p.dc.send(JSON.stringify({ k: "ping", id: p.pingId }));
      } catch {
        recovering(p);
      }
      p.pc
        .getStats()
        .then((report) => {
          if (!active(p)) return;
          for (const s of report.values())
            if (
              s.type === "candidate-pair" &&
              s.state === "succeeded" &&
              s.nominated
            ) {
              const local = report.get(s.localCandidateId),
                remote = report.get(s.remoteCandidateId);
              p.candidateTypes = [local?.candidateType, remote?.candidateType];
              if (p.candidateTypes.includes("relay")) failed(p); // Budget guarantee: no TURN, even if misconfigured externally.
            }
        })
        .catch(() => {});
    }
  }
  function connect() {
    if (
      !uid() ||
      (ws && [WebSocket.OPEN, WebSocket.CONNECTING].includes(ws.readyState))
    )
      return;
    stopped = false;
    const socket = (ws = new WebSocket(
      `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`,
    ));
    let signaling = Promise.resolve();
    socket.onopen = () => {
      if (ws !== socket) return;
      lostAt = 0;
      clearInterval(pulse);
      pulse = setInterval(checkPeers, 5000);
    };
    socket.onmessage = (e) => {
      if (ws !== socket) return;
      let m;
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }
      if (m.k === "hello") {
        if (m.protocol !== PROTOCOL || m.transport !== "p2p") {
          stopped = true;
          socket.close();
          return;
        }
        iceServers = (m.iceServers || [])
          .filter((s) => typeof s.urls === "string" && /^stuns?:/.test(s.urls))
          .slice(0, 4);
        configured = true;
        for (const p of peers.values())
          if (p.mode === "direct") p.readySent = signal(p, { ready: true });
        sync();
      } else if (m.k === "room") {
        setRoom(m.room);
        for (const fn of events) fn(m);
      } else if (m.k === "signal") {
        signaling = signaling.then(() => onSignal(m)).catch(() => {});
      } else if (
        m.k === "net" &&
        m.msg?.k === "start" &&
        room &&
        m.from === room.host &&
        m.msg.host === room.host &&
        m.msg.protocol === PROTOCOL
      ) {
        for (const fn of handlers) fn(m.from, m.msg);
      } else for (const fn of events) fn(m);
    };
    socket.onclose = (e) => {
      if (ws !== socket) return;
      ws = null;
      configured = false;
      lostAt ||= Date.now();
      if (stopped) return;
      if ([4001, 4003, 1008].includes(e.code)) {
        stopped = true;
        clearInterval(pulse);
        for (const p of [...peers.values()]) dispose(p, true);
        G.UI?.toast(
          G.Server.text(
            "Sesión cerrada. Recarga para volver a conectar.",
            "Session closed. Reload to reconnect.",
            "连接已关闭，请重新载入并登录。",
          ),
          6000,
        );
        return;
      }
      retry = setTimeout(() => {
        if (Date.now() - lostAt > 15000)
          for (const p of [...peers.values()]) dispose(p, true);
        connect();
      }, 2000);
    };
    socket.onerror = () => {};
  }
  function disconnect() {
    stopped = true;
    configured = false;
    clearTimeout(retry);
    clearInterval(pulse);
    for (const p of [...peers.values()]) dispose(p, true);
    room = null;
    const socket = ws;
    ws = null;
    socket?.close();
  }
  const net = {
    open() {
      connect();
      sync();
    },
    close() {
      for (const p of [...peers.values()]) dispose(p, true);
      room = null;
    },
    syncMembers() {
      sync();
    },
    send,
    retry(u) {
      if (isHost()) {
        for (const target of u ? [u] : [...peers.keys()])
          if (allowed(target)) startPeer(target);
      } else {
        const p = peers.get(room?.host);
        if (p && active(p)) signal(p, { retry: true });
      }
    },
    toHost(msg) {
      if (room && !isHost()) return send(room.host, msg);
    },
    broadcast(msg, except) {
      for (const u of peers.keys()) if (u !== except) send(u, msg);
    },
    on(fn) {
      handlers.add(fn);
    },
    off(fn) {
      handlers.delete(fn);
    },
    onPeer(fn) {
      peerHandlers.add(fn);
    },
    mode(u) {
      return peers.get(u)?.mode || "closed";
    },
    slow(u) {
      return peers.get(u)?.mode !== "direct";
    },
    viaTurn() {
      return false;
    },
    peers() {
      return [...peers.keys()];
    },
    stats,
    metrics(u) {
      const p = peers.get(u);
      return p
        ? {
            rttMs: p.rtt,
            candidateTypes: p.candidateTypes || [],
            buffered: p.dc?.bufferedAmount || 0,
          }
        : null;
    },
    get open_() {
      return !!room;
    },
    get isHost() {
      return isHost();
    },
    get uid() {
      return uid();
    },
    get hostUid() {
      return room?.host;
    },
    get turn() {
      return false;
    },
    get transport() {
      return "p2p";
    },
    get controlConnected() {
      return ws?.readyState === WebSocket.OPEN;
    },
  };
  return {
    connect,
    disconnect,
    net,
    setRoom,
    on(fn) {
      events.add(fn);
    },
    get room() {
      return room;
    },
  };
})();
G.Net = G.SelfNet.net;

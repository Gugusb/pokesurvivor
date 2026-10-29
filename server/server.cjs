"use strict";
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const {
  randomBytes,
  randomUUID,
  createHash,
  scrypt,
  timingSafeEqual,
} = require("node:crypto");
const { promisify } = require("node:util"),
  { WebSocketServer, WebSocket } = require("ws");
const { openStore } = require("./store.cjs"),
  { ROOT, G, fresh, sanitize, clone, record } = require("./domain.cjs");
const {characterFor}=require('./character-profiles.cjs');
const derive = promisify(scrypt),
  digest = (s) => createHash("sha256").update(s).digest("hex");
const VERSION = "0.23.0",
  PROTOCOL = 2,
  MAX_BODY = 1024 * 1024;
const fail = (status, message) => Object.assign(new Error(message), { status });
async function hashPassword(pass) {
  const salt = randomBytes(16).toString("hex");
  return (
    salt +
    ":" +
    (await derive(pass, salt, 64, { N: 16384, r: 8, p: 1 })).toString("hex")
  );
}
async function verifyPassword(pass, stored) {
  const [salt, hex] = stored.split(":");
  const h = await derive(String(pass), salt, 64, { N: 16384, r: 8, p: 1 });
  return hex.length === 128 && timingSafeEqual(h, Buffer.from(hex, "hex"));
}
function password(pass) {
  if (typeof pass !== "string" || pass.length < 8 || pass.length > 128)
    throw fail(400, "Password must contain 8–128 characters");
}
function createApp(opts = {}) {
  const db = openStore(
    opts.dbFile ||
      process.env.DB_FILE ||
      path.join(__dirname, "data/game.sqlite"),
  );
  const origin = opts.origin || process.env.PUBLIC_ORIGIN || "",
    now = opts.now || Date.now,
    coopEnabled = opts.coopEnabled === true; // Internal regression fixtures only; public service stays solo.
  const sockets = new Map(),
    rooms = new Map(),
    invites = new Map(),
    limits = new Map();
  const iceServers = (
    opts.stunUrls ||
    process.env.STUN_URLS ||
    "stun:stun.cloudflare.com:3478"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4)
    .filter((s) => /^stuns?:[^\s]{1,500}$/.test(s))
    .map((urls) => ({ urls }));
  const traffic = {
    signalingMessages: 0,
    signalingBytes: 0,
    battleFramesRejected: 0,
  };
  const q = (sql, ...a) => db.prepare(sql).get(...a),
    all = (sql, ...a) => db.prepare(sql).all(...a),
    exec = (sql, ...a) => db.prepare(sql).run(...a);
  function clientIp(req) {
    const ip = req.socket.remoteAddress || "unknown";
    return process.env.TRUST_PROXY === "1" &&
      ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(ip)
      ? String(req.headers["x-forwarded-for"] || ip)
          .split(",")
          .at(-1)
          .trim()
      : ip;
  }
  function atomic(fn) {
    db.exec("BEGIN IMMEDIATE");
    try {
      const v = fn();
      db.exec("COMMIT");
      return v;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  function rate(key, max, ms, cost = 1) {
    let r = limits.get(key);
    if (!r || now() > r.until) {
      r = { n: 0, until: now() + ms };
      limits.set(key, r);
    }
    r.n += cost;
    if (r.n > max) throw fail(429, "Too many requests; try again later");
  }
  function cookie(req) {
    const raw = (req.headers.cookie || "")
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("ps_session="));
    return raw ? raw.slice(11) : "";
  }
  function auth(req) {
    const t = cookie(req);
    const u =
      t &&
      q(
        "SELECT u.*,s.expires FROM sessions s JOIN users u ON u.uid=s.uid WHERE s.token=?",
        digest(t),
      );
    if (!u || u.expires < now() || u.deleted)
      throw fail(401, "Sign in required");
    if (u.ban) throw fail(403, "Account suspended");
    return u;
  }
  const displayName = u => characterFor(db,u.uid)?.name || u.name;
  const publicUser = (u) => ({ uid: u.uid, name: displayName(u), role: u.role });
  const saved = (uid) => {
    const r = q("SELECT payload,rev FROM saves WHERE uid=?", uid);
    if (!r) return null;
    const s=JSON.parse(r.payload);
    for (const entry of Object.values(s.owned || {})) if(entry) entry.iv=G.MonProgression.normalizeIV(entry.iv);
    return { save:s, rev:r.rev };
  };
  function save(uid, s) {
    exec(
      "UPDATE saves SET payload=?,rev=rev+1 WHERE uid=?",
      JSON.stringify(s),
      uid,
    );
    return saved(uid);
  }
  function score(uid, s) {
    const n = G.Difficulty.completedCount(s);
    exec(
      "INSERT INTO completion_scores(uid,score,at) VALUES(?,?,?) ON CONFLICT(uid) DO UPDATE SET score=excluded.score,at=CASE WHEN score<>excluded.score THEN excluded.at ELSE at END",
      uid,
      n,
      now(),
    );
  }
  function session(res, u) {
    const token = randomBytes(32).toString("base64url");
    exec(
      "INSERT INTO sessions VALUES(?,?,?)",
      digest(token),
      u.uid,
      now() + 14 * 864e5,
    );
    res.setHeader(
      "Set-Cookie",
      `ps_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1209600${origin.startsWith("https:") ? "; Secure" : ""}`,
    );
    return token;
  }
  function json(res, status, data) {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify(data));
  }
  function checkOrigin(req) {
    const expected = origin || `http://${req.headers.host}`;
    if (req.headers.origin && req.headers.origin !== expected)
      throw fail(403, "Origin rejected");
  }
  async function body(req) {
    if (
      req.headers["content-type"]?.split(";")[0] !== "application/json" ||
      req.headers["x-ps-client"] !== "1"
    )
      throw fail(415, "JSON client required");
    const chunks = [];
    let length = 0;
    for await (const b of req) {
      length += b.length;
      chunks.push(b);
      if (length > MAX_BODY) throw fail(413, "Request too large");
    }
    const text = Buffer.concat(chunks).toString("utf8");
    try {
      return JSON.parse(text || "{}");
    } catch {
      throw fail(400, "Invalid JSON");
    }
  }
  function emit(uid, msg) {
    const ws = sockets.get(uid);
    if (ws?.readyState === WebSocket.OPEN) {
      if (ws.bufferedAmount > 2e6) {
        ws.close(1013, "Connection too slow");
        return;
      }
      ws.send(JSON.stringify(msg));
    }
  }
  const roomOf = (uid) => [...rooms.values()].find((r) => r.members.has(uid));
  function roomData(r, uid) {
    return r
      ? {
          id: r.id,
          host: r.host,
          isHost: r.host === uid,
          open: r.open,
          transport: "p2p",
          protocol: PROTOCOL,
          ready: [...(r.links || new Map())]
            .filter(([, l]) => l.ready.size === 2)
            .map(([uid]) => uid),
          members: [...r.members.values()],
        }
      : null;
  }
  function notifyRoom(r) {
    for (const uid of r.members.keys())
      emit(uid, { k: "room", room: roomData(r, uid) });
  }
  function leaveRoom(uid) {
    const r = roomOf(uid);
    if (!r) return;
    if (r.host === uid) {
      rooms.delete(r.id);
      for (const m of r.members.keys())
        emit(m, { k: "room", room: null, closed: true });
    } else {
      r.members.delete(uid);
      r.links?.delete(uid);
      emit(uid, { k: "room", room: null });
      notifyRoom(r);
    }
    for (const [k, v] of invites) if (v.room === r.id) invites.delete(k);
  }
  function friendList(uid) {
    return all("SELECT * FROM friends WHERE a=? OR b=?", uid, uid)
      .map((f) => {
        const id = f.a === uid ? f.b : f.a,
          u = q("SELECT uid,name FROM users WHERE uid=? AND deleted=0", id);
        return (
          u && {
            uid: id,
            name: displayName({...u,uid:id}),
            status: f.ok ? "ok" : f.from_uid === uid ? "out" : "in",
            online: sockets.has(id),
            play: !!roomOf(id) && !roomOf(id).open,
            room: roomOf(id)?.id || "",
          }
        );
      })
      .filter(Boolean);
  }
  function notifySocial(uid) {
    emit(uid, {
      k: "social",
      ...services.summary(uid),
      friends: friendList(uid),
      invites: [...invites.values()].filter(
        (v) => v.to === uid && v.at > now() - 180e3,
      ),
    });
  }
  function notifyFriends(uid) {
    notifySocial(uid);
    for (const f of friendList(uid)) notifySocial(f.uid);
  }
  function isFriend(a, b) {
    return !!q(
      "SELECT * FROM friends WHERE a=? AND b=? AND ok=1",
      ...[a, b].sort(),
    );
  }
  function member(u) {
    const s = saved(u.uid).save,
      dex = s.partner;
    if (!G.DEX_BY[dex] || !s.owned[dex])
      throw fail(400, "Choose an owned partner first");
    const abilities = Object.fromEntries(
      G.MonProgression.familyFor(dex).map((d) => {
        const id = s.abilityEquipped?.[d];
        return [
          d,
          s.abilityMedals?.[id]
            ? G.AbilityDefs.BY_ID[id]?.ability || null
            : null,
        ];
      }),
    );
    return {
      uid: u.uid,
      name: displayName(u),
      dex,
      shiny: !!s.partnerShiny && !!s.shiny[dex],
      at: now(),
      difficultyLimit: G.Difficulty.unlocked(s),
      equipment: {
        abilities,
        megas: G.MonProgression.familyFor(dex)
          .map((d) => s.megaEquipped?.[d])
          .filter((id) => id && s.megaStones?.[id]),
        mega: s.megaStones?.[s.megaEquipped?.[dex]]
          ? s.megaEquipped[dex]
          : null,
        z: G.ZAccess.allowed(s,dex) && G.ZAccess.TYPES.includes(s.zEquipped?.[dex]) ? s.zEquipped[dex] : null,
      },
    };
  }
  function checkRun(u, b) {
    const r = q("SELECT * FROM runs WHERE id=? AND uid=?", b.id, u.uid);
    if (!r || r.ended) throw fail(409, "Run has ended or expired");
    if (now() - r.beat > 120e3) throw fail(409, "Run connection expired");
    const t = Number(b.t),
      budget = r.budget + ((now() - r.beat) / 1000) * r.speed;
    if (!Number.isFinite(t) || t < r.t || t > 7200 || t > budget + 3)
      throw fail(400, "Invalid run clock");
    const previous=G.Difficulty.scoreCounts(JSON.parse(r.score_counts)),previousKills=previous.normal+previous.elite+previous.boss+previous.rift;
    let counts;
    if(b.scoreCounts!==undefined){
      if(!b.scoreCounts||Array.isArray(b.scoreCounts)||typeof b.scoreCounts!=='object')throw fail(400,'Invalid score counters');
      for(const key of G.Difficulty.SCORE_KEYS)if(!Number.isSafeInteger(b.scoreCounts[key])||b.scoreCounts[key]<previous[key]||b.scoreCounts[key]>2e6)throw fail(400,'Invalid score counters');
      counts=G.Difficulty.scoreCounts(b.scoreCounts);
    }else counts={...previous,normal:previous.normal+Math.max(0,(b.kills||0)-previousKills)};
    const totalKills=counts.normal+counts.elite+counts.boss+counts.rift;
    if((b.kills!==undefined&&(!Number.isSafeInteger(b.kills)||b.kills!==totalKills))||totalKills>256+t*160||counts.boss+counts.rift>20+Math.floor(t/30)||counts.events>2+Math.floor(t/60))throw fail(400,'Invalid score counters');
    exec('UPDATE runs SET score_counts=? WHERE id=?',JSON.stringify(counts),r.id);
    const dirty = r.dirty || b.clean !== true;
    exec(
      "UPDATE runs SET t=?,budget=?,beat=?,dirty=?,speed=?,doubled=? WHERE id=?",
      t,
      budget,
      now(),
      dirty ? 1 : 0,
      b.speed === 2 ? 2 : 1,
      r.doubled || b.speed === 2 ? 1 : 0,
      r.id,
    );
    return { ...r, t, dirty, counts, doubled: r.doubled || b.speed === 2 };
  }
  function runUpdate(u, b, end = false) {
    return atomic(() => {
      const current = saved(u.uid);
      if (!end && b.rev !== current.rev)
        throw fail(
          409,
          "Save changed on another device. Reload before continuing.",
        );
      const r = checkRun(u, b),
        s = current.save;
      const beforeRecords = JSON.stringify(s.difficultyRecords),
        beforeDifficulty = JSON.stringify(s.difficulty);
      const oldRecords = clone(s.difficultyRecords);
      const won = record(
        s,
        r,
        r.t,
        b.alive === true || (end && r.mode === "s" && r.t > G.Difficulty.WIN),
        !r.dirty,
      );
      if (end) {
        exec("UPDATE runs SET ended=1 WHERE id=?", r.id);
        if(!r.dirty&&r.mode==='s'&&r.t>=1){
          const result=G.Difficulty.score(r.counts,r.t,r.stars);
          exec('INSERT INTO run_scores VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(uid) DO UPDATE SET score=excluded.score,stars=excluded.stars,t=excluded.t,dex=excluded.dex,lv=excluded.lv,kills=excluded.kills,run=excluded.run,at=excluded.at,breakdown=excluded.breakdown WHERE excluded.score>run_scores.score',
            u.uid,result.total,r.stars,Math.floor(r.t),r.dex,Math.max(1,Math.min(1000,b.lv|0)),r.counts.normal+r.counts.elite+r.counts.boss+r.counts.rift,r.id,now(),JSON.stringify(result));
        }
        if (
          !r.dirty &&
          r.stars === 8 &&
          r.mode === "s" &&
          r.t >= 1
        ) {
          const t = Math.floor(r.t);
          exec(
            "INSERT INTO time_scores VALUES(?,?,?,?,?,?,?) ON CONFLICT(uid) DO UPDATE SET t=excluded.t,dex=excluded.dex,lv=excluded.lv,kills=excluded.kills,run=excluded.run,at=excluded.at WHERE excluded.t>time_scores.t",
            u.uid,
            t,
            r.dex,
            Math.max(1, Math.min(1000, b.lv | 0)),
            Math.max(0, Math.min(1e6, b.kills | 0)),
            r.id,
            now(),
          );
        }
      }
      score(u.uid, s);
      G.Offline.stamp(s, now());
      const value = save(u.uid, s);
      if (end) return { ...value, won };
      const progress = { offline: s.offline };
      if (beforeDifficulty !== JSON.stringify(s.difficulty))
        progress.difficulty = s.difficulty;
      if (beforeRecords !== JSON.stringify(s.difficultyRecords)) {
        progress.records = Object.fromEntries(
          Object.entries(s.difficultyRecords).filter(
            ([dex, data]) =>
              JSON.stringify(data) !== JSON.stringify(oldRecords[dex]),
          ),
        );
      }
      return { rev: value.rev, won, progress };
    });
  }
  const services = require('./social-services.cjs')({q,all,exec,atomic,saved,save,isFriend,now,fail,notifySocial,rng:opts.rewardRandom});
  async function api(req, res, url) {
    checkOrigin(req);
    const route = url.pathname.slice(4),
      method = req.method;
    if (route === "/health" && method === "GET")
      return json(res, 200, {
        ok: true,
        version: VERSION,
        protocol: PROTOCOL,
        transport: "p2p",
        relay: false,
        coopEnabled,
      });
    rate("api:" + clientIp(req), 6000, 60e3);
    const reads = [
      "/session",
      "/ranking",
      "/social",
      "/nursery",
      "/profile",
      "/admin/users",
      "/admin/reports",
    ];
    if (method !== (reads.includes(route) ? "GET" : "POST"))
      throw fail(405, "Method not allowed");
    const b = method === "GET" ? {} : await body(req);
    if (["/register", "/login", "/recover"].includes(route)) {
      rate("auth:" + clientIp(req), 120, 15 * 60e3);
      const name = typeof b.name === "string" ? b.name.trim() : "",
        lower = name.toLowerCase();
      rate("account:" + lower, 20, 15 * 60e3);
      if (!/^[\p{L}\p{N}_]{3,16}$/u.test(name))
        throw fail(400, "Username must contain 3–16 letters, numbers or _");
      let u = q("SELECT * FROM users WHERE lower=?", lower);
      if (route === "/register") {
        password(b.pass);
        if (u) throw fail(409, "Username unavailable");
        const uid = randomUUID(),
          recovery = randomBytes(24).toString("base64url"),
          pass = await hashPassword(b.pass);
        atomic(() => {
          if (q("SELECT uid FROM users WHERE lower=?", lower))
            throw fail(409, "Username unavailable");
          exec(
            "INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)",
            uid,
            name,
            lower,
            pass,
            digest(recovery),
            now(),
          );
          exec(
            "INSERT INTO saves(uid,payload) VALUES(?,?)",
            uid,
            JSON.stringify(fresh(name)),
          );
        });
        u = q("SELECT * FROM users WHERE uid=?", uid);
        session(res, u);
        return json(res, 201, { user: publicUser(u), ...saved(uid), recovery });
      }
      // Same password derivation for unknown users limits username timing leaks.
      if (route === "/recover") {
        password(b.pass);
        if (
          !u ||
          u.deleted ||
          u.ban ||
          typeof b.recovery !== "string" ||
          digest(b.recovery) !== u.recovery
        )
          throw fail(400, "Invalid recovery code or account");
        const pass = await hashPassword(b.pass),
          recovery = randomBytes(24).toString("base64url");
        atomic(() => {
          const latest = q(
            "SELECT recovery,ban,deleted FROM users WHERE uid=?",
            u.uid,
          );
          if (
            latest.ban ||
            latest.deleted ||
            latest.recovery !== digest(b.recovery)
          )
            throw fail(409, "Recovery code already used");
          exec(
            "UPDATE users SET pass=?,recovery=? WHERE uid=?",
            pass,
            digest(recovery),
            u.uid,
          );
          exec("DELETE FROM sessions WHERE uid=?", u.uid);
          exec(
            "UPDATE runs SET dirty=1,ended=1 WHERE uid=? AND ended=0",
            u.uid,
          );
        });
        sockets.get(u.uid)?.close(4001, "Session changed");
        return json(res, 200, { ok: true, recovery });
      }
      if (typeof b.pass !== "string" || b.pass.length > 128)
        throw fail(400, "Invalid credentials");
      const ok = await verifyPassword(
        b.pass,
        u?.pass || "00000000000000000000000000000000:" + "0".repeat(128),
      );
      u = u && q("SELECT * FROM users WHERE uid=?", u.uid);
      if (!ok || !u || u.deleted)
        throw fail(401, "Invalid username or password");
      if (u.ban) throw fail(403, "Account suspended");
      session(res, u);
      return json(res, 200, { user: publicUser(u), ...saved(u.uid) });
    }
    const u = auth(req);
    if(!coopEnabled && (route.startsWith('/room/') || route==='/run/start' && b.mode==='g'))
      throw fail(403,'Co-op invitations temporarily unavailable');
    rate("user:" + u.uid, 900, 60e3);
    if (route === "/session" && method === "GET")
      return json(res, 200, { user: publicUser(u), ...saved(u.uid) });
    if (route === "/logout") {
      exec("DELETE FROM sessions WHERE token=?", digest(cookie(req)));
      sockets.get(u.uid)?.close(4001, "Signed out");
      res.setHeader(
        "Set-Cookie",
        "ps_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
      );
      return json(res, 200, { ok: true });
    }
    if (route === "/account/delete") {
      if (!(await verifyPassword(b.pass || "", u.pass)))
        throw fail(401, "Invalid password");
      atomic(() => {
        exec(
          "UPDATE users SET deleted=1,pass=?,recovery=? WHERE uid=?",
          "",
          "",
          u.uid,
        );
        for (const table of [
          "sessions",
          "saves",
          "time_scores",
          "run_scores",
          "completion_scores",
        ])
          exec(`DELETE FROM ${table} WHERE uid=?`, u.uid);
        exec("DELETE FROM friends WHERE a=? OR b=?", u.uid, u.uid);
        exec('DELETE FROM nursery_invites WHERE owner=? OR guest=?',u.uid,u.uid);
        exec('DELETE FROM nursery_rooms WHERE owner=?',u.uid);
        // Running pairings retain snapshots so the other participant can still collect.
        exec("UPDATE nursery_hatches SET owner_claim=COALESCE(owner_claim,'{}') WHERE owner=?",u.uid);
        exec("UPDATE nursery_hatches SET guest_claim=COALESCE(guest_claim,'{}') WHERE guest=?",u.uid);
        // Keep the sent ledger: deleting a recipient must not replenish today's quota.
        // Gifts already sent by a deleted account remain claimable by their recipients.
        exec('UPDATE gifts SET claimed=1 WHERE recipient=?',u.uid);
        exec("DELETE FROM runs WHERE uid=?", u.uid);
        exec("DELETE FROM reports WHERE target=? OR by_uid=?", u.uid, u.uid);
      });
      leaveRoom(u.uid);
      sockets.get(u.uid)?.close(4001, "Account deleted");
      return json(res, 200, { ok: true });
    }
    if (route === "/save") {
      const value = atomic(() => {
        const old = saved(u.uid);
        if (b.rev !== old.rev)
          throw fail(
            409,
            "Save changed on another device. Reload before continuing.",
          );
        let s;
        try {
          s = sanitize(b.save, old.save, u.name);
        } catch (e) {
          throw fail(400, e.message);
        }
        return save(u.uid, s);
      });
      return json(res, 200, value);
    }
    if (route === "/offline") {
      const value = atomic(() => {
        const { save: s } = saved(u.uid);
        const report = G.Offline.claim(s, now());
        return { ...save(u.uid, s), report };
      });
      return json(res, 200, value);
    }
    if (route === "/run/start") {
      const s = saved(u.uid).save;
      if (
        !G.DEX_BY[b.dex] ||
        b.dex !== G.MonProgression.rootFor(s.partner) ||
        !s.owned[s.partner] ||
        !Number.isInteger(b.stars) ||
        b.stars < 1 ||
        b.stars > G.Difficulty.unlocked(s)
      )
        throw fail(400, "Run not unlocked");
      const r = roomOf(u.uid);
      if (
        b.mode === "g" &&
        (!r || r.open || !r.members.has(u.uid) || b.stars !== r.cfg?.difficulty)
      )
        throw fail(400, "No matching co-op room");
      const id = randomUUID();
      atomic(() => {
        exec("UPDATE runs SET ended=1,dirty=1 WHERE uid=? AND ended=0", u.uid);
        exec(
          "INSERT INTO runs(id,uid,dex,stars,started,beat,dirty,mode,room) VALUES(?,?,?,?,?,?,?,?,?)",
          id,
          u.uid,
          b.dex,
          b.stars,
          now(),
          now(),
          b.clean === true ? 0 : 1,
          b.mode === "g" ? "g" : "s",
          r?.id || null,
        );
      });
      return json(res, 200, { id });
    }
    if (route === "/run/beat" || route === "/run/end") {
      const old = q(
        "SELECT ended FROM runs WHERE id=? AND uid=?",
        String(b.id),
        u.uid,
      );
      if (route === "/run/end" && old?.ended)
        return json(res, 200, { ...saved(u.uid), alreadyEnded: true });
      return json(res, 200, runUpdate(u, b, route === "/run/end"));
    }
    if (route === "/presence") {
      const value = atomic(() => {
        const current = saved(u.uid);
        if (b.rev !== current.rev)
          throw fail(
            409,
            "Save changed on another device. Reload before continuing.",
          );
        const s = current.save;
        G.Offline.stamp(s, now());
        return { rev: save(u.uid, s).rev, progress: { offline: s.offline } };
      });
      return json(res, 200, value);
    }
    if (route === "/run/bonus") {
      const value = atomic(() => {
        const r = checkRun(u, b),
          s = saved(u.uid).save;
        if (r.dirty || r.t <= G.Difficulty.WIN || b.alive !== true)
          throw fail(400, "No eligible victory");
        record(s, r, r.t, true, true);
        if (
          !Number.isSafeInteger(b.coins) ||
          b.coins < 1 ||
          b.coins > Math.min(5e6, 1000 + Math.floor(r.t) * 500)
        )
          throw fail(400, "Invalid payout");
        const extra = G.Difficulty.claimBonus(
          s,
          { eligible: true, victory: true, stars: r.stars },
          b.coins,
        );
        score(u.uid, s);
        return { ...save(u.uid, s), extra };
      });
      return json(res, 200, value);
    }
    if (route === "/ranking" && method === "GET") {
      const board =
        url.searchParams.get("board") === "completion"
          ? "completion"
          : "survival";
      const rows =
        board === "completion"
          ? all(
              "SELECT c.uid,u.name,c.score,c.at FROM completion_scores c JOIN users u ON u.uid=c.uid WHERE u.ban=0 AND u.deleted=0 AND c.score>0 ORDER BY c.score DESC,c.at ASC,c.uid ASC",
            )
          : all(
              "SELECT t.uid,t.score,t.stars,t.t,t.dex,t.lv,t.kills,t.run,t.at,u.name FROM run_scores t JOIN users u ON u.uid=t.uid WHERE u.ban=0 AND u.deleted=0 ORDER BY t.score DESC,t.at ASC,t.uid ASC",
            );
      const i = rows.findIndex((v) => v.uid === u.uid);
      return json(res, 200, {
        rows: rows.slice(0, 100).map((v, i) => ({ ...v, name:displayName(v), pos: i + 1 })),
        me: i < 0 ? null : { ...rows[i], name:displayName(rows[i]), pos: i + 1 },
      });
    }
    if (route === "/social" && method === "GET") {
      return json(res, 200, {
        ...services.summary(u.uid),
        friends: friendList(u.uid),
        invites: [...invites.values()].filter(
          (v) => v.to === u.uid && v.at > now() - 180e3,
        ),
        room: roomData(roomOf(u.uid), u.uid),
      });
    }
    if(route==='/nursery' || route.startsWith('/nursery/') || route.startsWith('/gifts/'))
      return json(res,200,services.route(route,u.uid,b,url));
    if (route === "/friends/request") {
      const other = q(
        "SELECT uid FROM users WHERE lower=? AND deleted=0 AND ban=0",
        String(b.name || "").toLowerCase(),
      );
      if (!other || other.uid === u.uid) throw fail(400, "Player not found");
      const [a, c] = [u.uid, other.uid].sort();
      if (q("SELECT * FROM friends WHERE a=? AND b=?", a, c))
        throw fail(409, "Request already exists");
      exec("INSERT INTO friends(a,b,from_uid) VALUES(?,?,?)", a, c, u.uid);
      notifyFriends(u.uid);
      return json(res, 200, { ok: true });
    }
    if (route === "/friends/accept" || route === "/friends/remove") {
      const [a, c] = [u.uid, String(b.uid)].sort();
      const f = q("SELECT * FROM friends WHERE a=? AND b=?", a, c);
      if (!f) throw fail(404, "Request not found");
      if (route.endsWith("accept")) {
        if (f.from_uid === u.uid) throw fail(403, "Only recipient may accept");
        exec("UPDATE friends SET ok=1 WHERE a=? AND b=?", a, c);
      } else exec("DELETE FROM friends WHERE a=? AND b=?", a, c);
      notifyFriends(u.uid);
      notifySocial(b.uid);
      return json(res, 200, { ok: true });
    }
    if (route === "/room/create") {
      let r = roomOf(u.uid);
      if (!r) {
        r = {
          id: randomBytes(12).toString("base64url"),
          host: u.uid,
          open: true,
          members: new Map([[u.uid, member(u)]]),
          links: new Map(),
        };
        rooms.set(r.id, r);
      }
      notifyRoom(r);
      return json(res, 200, { room: roomData(r, u.uid) });
    }
    if (route === "/room/join") {
      const r = rooms.get(b.id),
        invite = invites.get(u.uid + ":" + r?.host);
      if (!r || !r.open) throw fail(409, "Room unavailable");
      if (
        !invite ||
        invite.room !== r.id ||
        now() - invite.at > 180e3 ||
        !isFriend(u.uid, r.host)
      )
        throw fail(403, "Friend invitation required");
      if (r.members.size >= 4) throw fail(409, "Room full");
      const m = member(u);
      leaveRoom(u.uid);
      r.members.set(u.uid, m);
      invites.delete(u.uid + ":" + r.host);
      notifyRoom(r);
      notifySocial(u.uid);
      return json(res, 200, { room: roomData(r, u.uid) });
    }
    if (route === "/room/leave") {
      leaveRoom(u.uid);
      notifyFriends(u.uid);
      return json(res, 200, { ok: true });
    }
    if (route === "/room/open") {
      const r = roomOf(u.uid);
      if (!r || r.host !== u.uid) throw fail(403, "Host required");
      r.open = true;
      delete r.cfg;
      notifyRoom(r);
      return json(res, 200, { ok: true });
    }
    if (route === "/room/member") {
      const r = roomOf(u.uid);
      if (r && r.open) {
        r.members.set(u.uid, member(u));
        notifyRoom(r);
      }
      return json(res, 200, { ok: true });
    }
    if (route === "/room/invite") {
      const r = roomOf(u.uid);
      if (
        !r ||
        r.host !== u.uid ||
        !r.open ||
        r.members.size >= 4 ||
        !isFriend(u.uid, b.uid)
      )
        throw fail(403, "Cannot invite");
      invites.set(b.uid + ":" + u.uid, {
        to: b.uid,
        from: u.uid,
        name: u.name,
        room: r.id,
        at: now(),
      });
      notifySocial(b.uid);
      return json(res, 200, { ok: true });
    }
    if (route === "/room/decline") {
      invites.delete(u.uid + ":" + b.uid);
      notifySocial(u.uid);
      return json(res, 200, { ok: true });
    }
    if (route === "/room/start") {
      const r = roomOf(u.uid);
      if (!r || r.host !== u.uid || !r.open || r.members.size < 2)
        throw fail(403, "Cannot start room");
      if ([...r.members.keys()].some((uid) => !sockets.has(uid)))
        throw fail(409, "Player disconnected");
      if (
        [...r.members.keys()].some(
          (uid) => uid !== r.host && r.links?.get(uid)?.ready.size !== 2,
        )
      )
        throw fail(409, "P2P connection not ready");
      const difficulty = Math.min(
        G.Difficulty.unlocked(saved(u.uid).save),
        G.Difficulty.level(b.difficulty),
        ...[...r.members.values()].map((m) => m.difficultyLimit),
      );
      r.open = false;
      r.cfg = {
        k: "start",
        seed: Math.floor(Math.random() * 1e6),
        host: u.uid,
        members: [...r.members.values()],
        difficulty,
        protocol: PROTOCOL,
        transport: "p2p",
      };
      notifyRoom(r);
      for (const uid of r.members.keys())
        emit(uid, { k: "net", from: r.host, msg: r.cfg });
      return json(res, 200, { cfg: r.cfg });
    }
    if (route === "/profile" && method === "GET") {
      const id = url.searchParams.get("uid"),
        p = q(
          "SELECT uid,name FROM users WHERE uid=? AND deleted=0 AND ban=0",
          id,
        );
      if (!p) throw fail(404, "Player not found");
      const s = saved(id).save;
      const character=characterFor(db,id),record=q('SELECT t FROM time_scores WHERE uid=?',id),bestScore=q('SELECT score,stars,t FROM run_scores WHERE uid=?',id);
      const completed=Object.keys(s.difficultyRecords||{}).map(Number).filter(dex=>G.DEX_BY[dex]&&G.Difficulty.frame(s,dex)==='ruby');
      return json(res, 200, {
        name: displayName(p),
        character,
        partner:s.partner||null,
        completedDex:completed.slice(0,12),
        favs: character ? character.team.filter(dex=>G.DEX_BY[dex]).map(dex=>({dex,shiny:false})) : (s.profile?.favs || []).filter(f=>G.DEX_BY[f?.dex]).slice(0, 3),
        title: String(s.profile?.title || "").slice(0, 40),
        best: {
          solo: s.stats.bestTime || 0,
          group: s.stats.bestGroupTime || 0,
          level: s.stats.bestLevel || 1,
          kills: s.stats.totalKills || 0,
          legends: Object.keys(s.legends || {}).length,
          medals: G.Difficulty.completedCount(s),
          eightStar:record?.t||0,
          score:bestScore?.score||0,scoreStars:bestScore?.stars||0,
          runs:s.stats.runs||0,
          bosses:s.stats.bossesTotal||0,
        },
        medals: [],
      });
    }
    if (route === "/report") {
      if (
        !["completion", "survival"].includes(b.board) ||
        !q("SELECT uid FROM users WHERE uid=?", b.uid)
      )
        throw fail(400, "Invalid report");
      exec(
        "INSERT OR IGNORE INTO reports VALUES(?,?,?,?,?)",
        randomUUID(),
        u.uid,
        b.uid,
        b.board,
        now(),
      );
      return json(res, 200, { ok: true });
    }
    if (route.startsWith("/admin/")) {
      if (u.role !== "admin") throw fail(403, "Administrator required");
      if (route === "/admin/users" && method === "GET") {
        const search = String(url.searchParams.get("q") || "").slice(0, 32);
        return json(res, 200, {
          users: all(
            "SELECT uid,name,role,ban,deleted,created FROM users WHERE lower LIKE ? ORDER BY created DESC LIMIT 100",
            "%" + search.toLowerCase() + "%",
          ),
        });
      }
      if (route === "/admin/reports" && method === "GET")
        return json(res, 200, {
          reports: all(
            "SELECT r.*,u.name FROM reports r JOIN users u ON u.uid=r.target ORDER BY at DESC LIMIT 200",
          ),
        });
      if (route === "/admin/ban") {
        if (b.uid === u.uid) throw fail(400, "Cannot suspend yourself");
        atomic(() => {
          exec("UPDATE users SET ban=? WHERE uid=?", b.ban ? 1 : 0, b.uid);
          exec("DELETE FROM sessions WHERE uid=?", b.uid);
          exec("UPDATE runs SET dirty=1,ended=1 WHERE uid=?", b.uid);
          exec(
            "INSERT INTO audit(actor,target,action,at) VALUES(?,?,?,?)",
            u.uid,
            b.uid,
            b.ban ? "ban" : "unban",
            now(),
          );
        });
        leaveRoom(b.uid);
        sockets.get(b.uid)?.close(4003, "Account suspended");
        return json(res, 200, { ok: true });
      }
      if (route === "/admin/remove-score") {
        if (b.board === "survival")
          exec("DELETE FROM run_scores WHERE uid=?", b.uid);
        else
          throw fail(
            400,
            "Completion medals require manual audit; suspend the account",
          );
        exec(
          "INSERT INTO audit(actor,target,action,at) VALUES(?,?,?,?)",
          u.uid,
          b.uid,
          "remove-survival",
          now(),
        );
        return json(res, 200, { ok: true });
      }
      if (route === "/admin/dismiss") {
        exec("DELETE FROM reports WHERE id=?", b.id);
        return json(res, 200, { ok: true });
      }
    }
    throw fail(404, "Endpoint not found");
  }
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".jpg": "image/jpeg",
    ".txt": "text/plain; charset=utf-8",
    ".ico": "image/x-icon",
    ".webmanifest": "application/manifest+json",
  };
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname.startsWith("/api/")) return await api(req, res, url);
      if (!["GET", "HEAD"].includes(req.method))
        throw fail(405, "Method not allowed");
      let name = decodeURIComponent(url.pathname);
      if (name.endsWith("/")) name += "index.html";
      const file = path.resolve(ROOT, "." + name),
        rel = path.relative(ROOT, file);
      if (
        rel.startsWith("..") ||
        path.isAbsolute(rel) ||
        !types[path.extname(file)] ||
        rel
          .split(/[\\/]/)
          .some(
            (p) =>
              p.startsWith(".") ||
              [
                "server",
                "functions",
                "tools",
                "cloudflare",
                "node_modules",
              ].includes(p),
          )
      )
        throw fail(404, "Not found");
      const stat = await fs.promises.stat(file);
      if (!stat.isFile()) throw fail(404, "Not found");
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)],
        "Content-Length": stat.size,
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "same-origin",
        "Cache-Control": /\.(html|js|css)$/.test(name)
          ? "no-cache"
          : "public, max-age=3600",
      });
      if (req.method === "HEAD") return res.end();
      fs.createReadStream(file).pipe(res);
    } catch (e) {
      json(
        res,
        e.status || (["ENOENT", "ENOTDIR"].includes(e.code) ? 404 : 500),
        { error: e.status ? e.message : "Request failed" },
      );
    }
  });
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 24576,
    perMessageDeflate: false,
  });
  server.on("upgrade", (req, socket, head) => {
    try {
      if (req.url !== "/ws") throw fail(404, "Not found");
      checkOrigin(req);
      const u = auth(req);
      wss.handleUpgrade(req, socket, head, (ws) =>
        wss.emit("connection", ws, req, u),
      );
    } catch {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
    }
  });
  wss.on("connection", (ws, req, u) => {
    sockets.get(u.uid)?.close(4001, "Connected on another device");
    sockets.set(u.uid, ws);
    ws.alive = true;
    emit(u.uid, {
      k: "hello",
      protocol: PROTOCOL,
      transport: "p2p",
      iceServers,
    });
    notifyFriends(u.uid);
    const r = roomOf(u.uid);
    if (r) notifyRoom(r);
    ws.on("pong", () => {
      ws.alive = true;
    });
    ws.on("message", (raw) => {
      try {
        if (sockets.get(u.uid) !== ws) return;
        rate("ws:" + u.uid, 240, 60000);
        const current = q("SELECT ban,deleted FROM users WHERE uid=?", u.uid);
        if (!current || current.ban || current.deleted)
          throw fail(403, "Account unavailable");
        const m = JSON.parse(raw);
        const r = roomOf(u.uid);
        if (m.k === "net") {
          traffic.battleFramesRejected++;
          throw fail(400, "Battle relay disabled");
        }
        if (!r || m.k !== "signal" || m.room !== r.id)
          throw fail(400, "Invalid signaling room");
        const target = String(m.to);
        if (!r.members.has(target) || target === u.uid)
          throw fail(403, "Invalid recipient");
        if (u.uid !== r.host && target !== r.host)
          throw fail(403, "Guests may only send to host");
        const guest = u.uid === r.host ? target : u.uid;
        r.links ||= new Map();
        let link = r.links.get(guest);
        if (
          typeof m.attempt !== "string" ||
          !/^[a-zA-Z0-9_-]{8,64}$/.test(m.attempt)
        )
          throw fail(400, "Invalid attempt");
        rate("signal-budget:" + u.uid, 98304, 60000, raw.length);
        let sig;
        if (m.description) {
          const d = m.description;
          if (
            typeof d.sdp !== "string" ||
            Buffer.byteLength(d.sdp) > 16384 ||
            !d.sdp.startsWith("v=0") ||
            !d.sdp.includes("m=application") ||
            !["offer", "answer"].includes(d.type) ||
            (d.type === "offer") !== (u.uid === r.host)
          )
            throw fail(400, "Invalid SDP");
          if (d.type === "offer") {
            // Only a new host negotiation can change the active generation.
            link = { attempt: m.attempt, ready: new Set() };
            r.links.set(guest, link);
          } else if (!link || link.attempt !== m.attempt) return;
          sig = { description: { type: d.type, sdp: d.sdp } };
        } else {
          if (!link || link.attempt !== m.attempt) return;
          if (m.ready === true) {
            if (!link.ready.has(u.uid)) {
              link.ready.add(u.uid);
              notifyRoom(r);
            }
            return;
          }
          if (m.retry === true && u.uid !== r.host) {
            rate("retry:" + u.uid, 6, 30000);
            link.ready.clear();
            sig = { retry: true };
          } else if (m.candidate && typeof m.candidate === "object") {
            const c = m.candidate;
            if (
              typeof c.candidate !== "string" ||
              c.candidate.length > 2048 ||
              !c.candidate.startsWith("candidate:") ||
              (c.sdpMid != null &&
                (typeof c.sdpMid !== "string" || c.sdpMid.length > 32)) ||
              (c.sdpMLineIndex != null &&
                (!Number.isInteger(c.sdpMLineIndex) ||
                  c.sdpMLineIndex < 0 ||
                  c.sdpMLineIndex > 8)) ||
              (c.usernameFragment != null &&
                (typeof c.usernameFragment !== "string" ||
                  c.usernameFragment.length > 256))
            )
              throw fail(400, "Invalid candidate");
            sig = {
              candidate: {
                candidate: c.candidate,
                sdpMid: c.sdpMid ?? null,
                sdpMLineIndex: c.sdpMLineIndex ?? null,
                ...(c.usernameFragment
                  ? { usernameFragment: c.usernameFragment }
                  : {}),
              },
            };
          } else throw fail(400, "Invalid signaling payload");
        }
        const out = {
          k: "signal",
          room: r.id,
          from: u.uid,
          attempt: m.attempt,
          ...sig,
        };
        traffic.signalingMessages++;
        traffic.signalingBytes += Buffer.byteLength(JSON.stringify(out));
        emit(target, out);
      } catch {
        ws.close(1008, "Invalid message");
      }
    });
    ws.on("close", () => {
      if (sockets.get(u.uid) !== ws) return;
      sockets.delete(u.uid);
      const currentRoom = roomOf(u.uid);
      if (currentRoom) {
        for (const [guest, link] of currentRoom.links || [])
          if (u.uid === currentRoom.host || u.uid === guest)
            link.ready.delete(u.uid);
        notifyRoom(currentRoom);
      }
      notifyFriends(u.uid);
      const grace = setTimeout(() => {
        if (!sockets.has(u.uid)) leaveRoom(u.uid);
      }, 15000);
      grace.unref();
    });
    ws.on("error", () => {});
  });
  const housekeeping = setInterval(() => {
    for (const [k, v] of limits) if (v.until < now()) limits.delete(k);
    for (const [k, v] of invites) if (v.at < now() - 180e3) invites.delete(k);
    exec("DELETE FROM sessions WHERE expires<?", now());
    exec("DELETE FROM runs WHERE beat<?", now() - 7 * 864e5);
    for (const ws of sockets.values()) {
      if (!ws.alive) {
        ws.terminate();
        continue;
      }
      ws.alive = false;
      ws.ping();
    }
  }, 30000);
  housekeeping.unref();
  return {
    server,
    db,
    rooms,
    traffic,
    sockets,
    async close() {
      clearInterval(housekeeping);
      for (const ws of sockets.values()) ws.terminate();
      await new Promise((resolve) => wss.close(resolve));
      await new Promise((resolve) => server.close(resolve));
      db.close();
    },
  };
}
if (require.main === module) {
  const app = createApp(),
    port = Number(process.env.PORT || 8000),
    host = process.env.HOST || "127.0.0.1";
  app.server.listen(port, host, () =>
    console.log(`PokéSurvivor ${VERSION}: http://${host}:${port}`),
  );
  for (const sig of ["SIGINT", "SIGTERM"])
    process.on(sig, () => app.close().then(() => process.exit(0)));
}
module.exports = { createApp, hashPassword, verifyPassword, VERSION };

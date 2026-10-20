/* Real WebRTC in disposable browser profiles and an isolated in-memory server.
 * This is LAN/loopback verification, not an Internet NAT-success measurement. */
const assert = require("node:assert/strict"),
  path = require("node:path"),
  fs = require("node:fs"),
  { once } = require("node:events"),
  { randomBytes, randomUUID } = require("node:crypto");
const { createApp, hashPassword } = require("../server/server.cjs"),
  { fresh } = require("../server/domain.cjs");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    path.join(__dirname, "cache/browser-qa/node_modules/playwright"),
);
(async () => {
  const app = createApp({coopEnabled:true, dbFile: ":memory:", stunUrls: "none" });
  let browser;
  const errors = [],
    contexts = [],
    pages = [],
    ids = [];
  try {
    const pass = randomBytes(24).toString("hex"),
      hash = await hashPassword(pass);
    for (let i = 0; i < 4; i++) {
      const uid = randomUUID(),
        name = "P2PFixture" + i,
        s = fresh(name);
      ids.push(uid);
      s.partner = 133;
      s.owned[133] = { at: Date.now(), from: "starter", iv: [20, 20, 20] };
      app.db
        .prepare(
          "INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)",
        )
        .run(uid, name, name.toLowerCase(), hash, "unused", Date.now());
      app.db
        .prepare("INSERT INTO saves(uid,payload) VALUES(?,?)")
        .run(uid, JSON.stringify(s));
      if (i) {
        const [a, b] = [ids[0], uid].sort();
        app.db.prepare("INSERT INTO friends VALUES(?,?,?,1)").run(a, b, ids[0]);
      }
    }
    app.server.listen(0, "127.0.0.1");
    await once(app.server, "listening");
    const base = "http://127.0.0.1:" + app.server.address().port;
    browser = await chromium.launch({
      headless: true,
      channel: process.env.BROWSER_CHANNEL || "msedge",
      args: [
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
      ],
    });
    for (let i = 0; i < 4; i++) {
      const c = await browser.newContext({
          viewport: { width: 1280, height: 900 },
          locale: "zh-CN",
        }),
        p = await c.newPage();
      contexts.push(c);
      pages.push(p);
      p.on("pageerror", (e) => errors.push(e.message));
      await p.goto(base + "/dev.html");
      await p.waitForFunction(
        () =>
          !document.getElementById("tap-start").classList.contains("hidden") ||
          !document.getElementById("scr-login").classList.contains("hidden"),
      );
      if (await p.locator("#tap-start").isVisible())
        await p.locator("#tap-start").click();
      await p.locator("#scr-login:not(.hidden)").waitFor();
      await p.locator("#f-user").fill("P2PFixture" + i);
      await p.locator("#f-pass").fill(pass);
      await p.locator("#btn-auth").click();
      await p.locator("#scr-menu:not(.hidden)").waitFor();
      await p.evaluate(() => G.Social.start());
    }
    const host = pages[0],
      room = await host.evaluate(async () => {
        const r = await G.Social.createRoom();
        G.LobbyUI.open();
        return r.id;
      });
    for (let i = 1; i < 4; i++) {
      assert.equal(
        (await host.evaluate((id) => G.Social.invite(id), ids[i])).ok,
        true,
      );
      assert.equal(
        (
          await pages[i].evaluate(async (id) => {
            const r = await G.Social.joinRoom(id);
            G.LobbyUI.open();
            return r;
          }, room)
        ).ok,
        true,
      );
    }
    await host.waitForFunction(
      () =>
        G.Social.room?.ready?.length === 3 &&
        G.Net.peers().every((u) => G.Net.mode(u) === "direct"),
      null,
      { timeout: 30000 },
    );
    await Promise.all(
      pages
        .slice(1)
        .map((p) =>
          p.waitForFunction(() => G.Net.mode(G.Net.hostUid) === "direct"),
        ),
    );
    await pages[1].evaluate(() => {
      G.Net.on((from, m) => {
        if (m.probe) window.qaProbe = { from, length: m.probe.length };
      });
    });
    assert.equal(
      await host.evaluate(
        (id) =>
          G.Net.send(id, { k: "f", ev: [], probe: "宝可梦".repeat(20000) }),
        ids[1],
      ),
      true,
    );
    await pages[1].waitForFunction(() => window.qaProbe?.length === 60000);
    assert.equal((await pages[1].evaluate(() => window.qaProbe)).from, ids[0]);
    await host.locator("#lobby-start").click();
    await Promise.all(
      pages.map((p) =>
        p.waitForFunction(() => G.Coop.active && G.Game.state === "playing"),
      ),
    );
    await Promise.all(
      pages.map((p) =>
        p.waitForFunction(() => G.Net.stats.sent > 20 && G.Net.stats.recv > 20),
      ),
    );
    const compact = await host.evaluate(async () => {
      G.DB.save.coins += 17;
      const before = G.DB.save.coins,
        r = await G.Server.heartbeat();
      return {
        bytes: JSON.stringify(r).length,
        noSave: !r.save,
        preserved: G.DB.save.coins === before,
      };
    });
    assert.ok(compact.bytes < 2000 && compact.noSave && compact.preserved);
    await host.evaluate(() => G.Game.debugLevelUp());
    await Promise.all(
      pages.map((p) => p.locator("#scr-levelup:not(.hidden)").waitFor()),
    );
    for (const p of pages)
      await p.locator("#scr-levelup:not(.hidden) .card").first().click();
    await Promise.all(
      pages.map((p) => p.waitForFunction(() => G.Game.state === "playing")),
    );
    const signalsBefore = app.traffic.signalingMessages;
    await host.evaluate((id) => G.Net.retry(id), ids[1]);
    await host.waitForFunction(
      () =>
        G.Social.room?.ready?.length === 3 &&
        G.Net.peers().every((u) => G.Net.mode(u) === "direct"),
    );
    await pages[1].waitForFunction(
      () =>
        G.Net.mode(G.Net.hostUid) === "direct" && G.EnemyMgr.all().length > 0,
    );
    await host.waitForFunction(() =>
      G.Net.peers().every(
        (u) => G.Net.metrics(u)?.candidateTypes?.length === 2,
      ),
    );
    const metrics = await host.evaluate(() =>
      G.Net.peers().map((u) => G.Net.metrics(u)),
    );
    assert.ok(metrics.every((m) => !m.candidateTypes.includes("relay")));
    assert.ok(app.traffic.signalingMessages > signalsBefore);
    assert.equal(app.traffic.battleFramesRejected, 0);
    const before = await host.evaluate(() => ({
      sent: G.Net.stats.sent,
      signals: G.Net.stats.signalSent,
    }));
    await host.waitForFunction((n) => G.Net.stats.sent > n + 100, before.sent);
    const after = await host.evaluate(() => ({
      sent: G.Net.stats.sent,
      signals: G.Net.stats.signalSent,
    }));
    assert.equal(after.signals, before.signals);
    fs.mkdirSync(path.join(__dirname, "cache"), { recursive: true });
    await host.screenshot({
      path: path.join(__dirname, "cache/v0.16.0-p2p.png"),
    });
    assert.equal(await host.evaluate(() => G.Net.stats.relaySent), 0);
    await contexts[0].close();
    await pages[1].waitForFunction(
      () => !G.Coop.active && G.UI.isOpen("scr-over"),
      null,
      { timeout: 30000 },
    );
    for (const c of contexts.slice(1)) await c.close();
    const built = [];
    for (let i = 0; i < 2; i++) {
      const c = await browser.newContext({
          viewport: { width: 1280, height: 900 },
          locale: "zh-CN",
        }),
        p = await c.newPage();
      contexts.push(c);
      pages.push(p);
      built.push(p);
      p.on("pageerror", (e) => errors.push(e.message));
      await c.addInitScript(() => {
        window.qaTime = 0;
        window.qaP2P = false;
        const fill = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function (t, ...a) {
          const m = String(t).match(/^(\d+):(\d\d)$/);
          if (m) window.qaTime = Math.max(window.qaTime, +m[1] * 60 + +m[2]);
          if (/^P2P(?: |$)/.test(t)) window.qaP2P = true;
          return fill.call(this, t, ...a);
        };
      });
      await p.goto(base + "/");
      await p.waitForFunction(
        () =>
          !document.getElementById("tap-start").classList.contains("hidden") ||
          !document.getElementById("scr-login").classList.contains("hidden"),
      );
      if (await p.locator("#tap-start").isVisible())
        await p.locator("#tap-start").click();
      await p.locator("#f-user").fill("P2PFixture" + i);
      await p.locator("#f-pass").fill(pass);
      await p.locator("#btn-auth").click();
      await p.locator("#scr-menu:not(.hidden)").waitFor();
    }
    async function post(p, route, b) {
      return p.evaluate(
        async ({ route, b }) => {
          const r = await fetch("/api" + route, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-PS-Client": "1" },
            body: JSON.stringify(b),
          });
          if (!r.ok) throw Error("Built fixture API failed");
          return r.json();
        },
        { route, b },
      );
    }
    await post(built[0], "/room/create", {});
    await built[0].locator('[data-go="friends"]').click();
    await built[0].locator("#fr-room").click();
    await post(built[0], "/room/invite", { uid: ids[1] });
    await built[1].locator("#inv-yes").click();
    await built[1].locator("#scr-lobby:not(.hidden)").waitFor();
    await built[0].waitForFunction(
      () => !document.getElementById("lobby-start").disabled,
    );
    assert.ok(
      (await built[0].locator("#lobby-members").textContent()).includes("P2P"),
    );
    await built[0].locator("#lobby-start").click();
    await Promise.all(
      built.map((p) =>
        p.waitForFunction(() => window.qaTime >= 3 && window.qaP2P),
      ),
    );
    await built[0].screenshot({
      path: path.join(__dirname, "cache/v0.16.0-p2p-built.png"),
    });
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify(
        {
          players: 4,
          actualWebRTC: true,
          largeFrameReassembled: true,
          allLevelChoicesResume: true,
          reconnectResync: true,
          heartbeatBytes: compact.bytes,
          localWalletPreserved: true,
          steadyBattleMessages: after.sent - before.sent,
          steadySignalingMessages: after.signals - before.signals,
          relayBattleFrames: 0,
          hostDisconnectEndsRun: true,
          builtTwoPlayerGame: true,
          candidateTypes: metrics.map((m) => m.candidateTypes),
          pageErrors: 0,
        },
        null,
        2,
      ),
    );
  } catch (e) {
    console.error(
      "Browser diagnostics:",
      JSON.stringify({
        errors,
        states: await Promise.all(
          pages
            .filter((p) => !p.isClosed())
            .map((p) =>
              p
                .evaluate(() => ({
                  boot: document.getElementById("boot")?.textContent,
                  state: window.G?.Game?.state,
                }))
                .catch(() => null),
            ),
        ),
      }),
    );
    throw e;
  } finally {
    await browser?.close();
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

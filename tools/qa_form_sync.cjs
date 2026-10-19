/* Four real P2P browsers; controlled progression/equipment in disposable fixtures. */
const assert = require("node:assert/strict"),
  path = require("node:path"),
  fs = require("node:fs"),
  { once } = require("node:events"),
  { randomBytes, randomUUID } = require("node:crypto");
const { createApp, hashPassword } = require("../server/server.cjs"),
  { fresh, G } = require("../server/domain.cjs");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    path.join(__dirname, "cache/browser-qa/node_modules/playwright"),
);
(async () => {
  const app = createApp({ dbFile: ":memory:", stunUrls: "none" }),
    pages = [],
    contexts = [],
    ids = [],
    errors = [];
  let browser;
  try {
    const pass = randomBytes(24).toString("hex"),
      hash = await hashPassword(pass),
      selected = [6, 133, 9, 475];
    for (let i = 0; i < 4; i++) {
      const uid = randomUUID(),
        name = "FormsFixture" + i,
        s = fresh(name);
      ids.push(uid);
      s.partner = selected[i];
      for (const dex of G.MonProgression.familyFor(selected[i]))
        s.owned[dex] = { at: Date.now(), from: "fixture", iv: [20, 20, 20] };
      if (i === 0 || i === 3) {
        const id = i === 0 ? "6-mega-x" : "475-mega";
        s.megaStones[id] = { at: Date.now() };
        s.megaEquipped[selected[i]] = id;
      }
      if (i === 2) {
        s.zStones.water = { at: Date.now() };
        s.zEquipped[9] = "water";
      }
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
      await p.locator("#f-user").fill("FormsFixture" + i);
      await p.locator("#f-pass").fill(pass);
      await p.locator("#btn-auth").click();
      await p.locator("#scr-menu:not(.hidden)").waitFor();
      await p.evaluate(() => G.Social.start());
    }
    const room = await pages[0].evaluate(async () => {
      const r = await G.Social.createRoom();
      G.LobbyUI.open();
      return r.id;
    });
    for (let i = 1; i < 4; i++) {
      assert.equal(
        (await pages[0].evaluate((uid) => G.Social.invite(uid), ids[i])).ok,
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
    await pages[0].waitForFunction(() => G.Social.room?.ready?.length === 3);
    await pages[0].locator("#lobby-start").click();
    await Promise.all(
      pages.map((p) =>
        p.waitForFunction(() => G.Coop.active && G.Game.state === "playing"),
      ),
    );
    for (let i = 0; i < 4; i++)
      await pages[i].evaluate((i) => {
        G.Game.player.x = (i - 1.5) * 100;
        window.qaDrawn = new Set();
        const draw = G.Sprites.Animator.prototype.draw;
        G.Sprites.Animator.prototype.draw = function (...args) {
          window.qaDrawn.add(this.dex);
          return draw.apply(this, args);
        };
      }, i);
    async function level(n) {
      await pages[0].evaluate((n) => {
        G.Game.player.level = n - 1;
        G.Game.debugLevelUp();
      }, n);
      await Promise.all(
        pages.map((p) => p.locator("#scr-levelup:not(.hidden)").waitFor()),
      );
      for (let i = 0; i < 4; i++) {
        await pages[i].locator("#cards .card").first().click();
        if (n === 6 || i !== 1) {
          await pages[i].locator("#lvl-evolution-title:not(.hidden)").waitFor();
          const target =
            n === 15 && i === 3
              ? '#cards [data-evolution-dex="475"]'
              : "#cards [data-evolution-dex]";
          await pages[i].locator(target).first().click();
        }
      }
      await Promise.all(
        pages.map((p) => p.waitForFunction(() => G.Game.state === "playing")),
      );
      const expected = await Promise.all(
        pages.map((p) => p.evaluate(() => G.Game.player.dex)),
      );
      for (let i = 0; i < 4; i++)
        await pages[i].waitForFunction(
          ({ ids, expected, i }) =>
            ids.every((uid, j) => {
              const p = j === i ? G.Game.player : G.Coop.mate(uid)?.pl;
              return (
                p &&
                p.dex === expected[j] &&
                p.spriteDex === expected[j] &&
                p.anim.dex === expected[j] &&
                window.qaDrawn.has(expected[j])
              );
            }),
          { ids, expected, i },
        );
      return expected;
    }
    const first = await level(6),
      final = await level(15);
    assert.equal(final[0], 6);
    assert.equal(final[2], 9);
    assert.equal(final[3], 475);
    for (const index of [0, 3])
      assert.equal(
        await pages[index].evaluate(() => {
          G.Game.player.megaState.energy = G.Mega.CAP;
          return G.Mega.activate(G.Game.player);
        }),
        true,
      );
    for (let i = 0; i < 4; i++)
      await pages[i].waitForFunction(
        ({ ids, i }) =>
          [0, 3].every((j) => {
            const p = j === i ? G.Game.player : G.Coop.mate(ids[j])?.pl,
              id = j === 0 ? "6-mega-x" : "475-mega";
            return (
              p?.anim.dex === id &&
              p.spriteDex === id &&
              p.megaForm === id &&
              window.qaDrawn.has(id)
            );
          }),
        { ids, i },
      );
    await pages[2].evaluate(() => {
      const p = G.Game.player,
        ms = ["water-gun", "hydro-pump"].map((id) => G.Moves.instance(id));
      p.moves = ms;
      p.slots = [ms];
      p.active = 0;
    });
    assert.equal(
      await pages[2].evaluate(() => G.ZMoves.arm(G.Game.player)),
      true,
    );
    for (let i = 0; i < 4; i++)
      await pages[i].waitForFunction(
        ({ uid, i }) => {
          const p = i === 2 ? G.Game.player : G.Coop.mate(uid)?.pl;
          return (
            p?.zState?.phase === "choose" &&
            G.ZMoves.busy(p) &&
            G.ZMoves.timeFactor() === 0.1
          );
        },
        { uid: ids[2], i },
      );
    assert.equal(
      await pages[2].evaluate(() => G.ZMoves.choose(G.Game.player, 0)),
      true,
    );
    for (const i of [0, 1, 3])
      await pages[i].waitForFunction((uid) => {
        const p = G.Coop.mate(uid)?.pl;
        return (
          p?.zState?.casts.length === 2 &&
          p.zState.casts.every((e) => e.ghost) &&
          p.anim.cur === "Charge"
        );
      }, ids[2]);
    const out = path.join(__dirname, "cache");
    fs.mkdirSync(out, { recursive: true });
    await pages[1].screenshot({ path: path.join(out, "v0.16.1-forms-z.png") });
    for (const p of pages)
      await p.waitForFunction((uid) => {
        const r = G.Coop.mate(uid)?.pl || G.Game.player;
        return (
          r.zState?.phase === "cooldown" &&
          !r.zState.casts.length &&
          !G.ZMoves.busy(r)
        );
      }, ids[2]);
    for (const index of [0, 3])
      await pages[index].evaluate(() => G.Mega.finish(G.Game.player));
    for (let i = 0; i < 4; i++)
      await pages[i].waitForFunction(
        ({ ids, i }) =>
          [0, 3].every((j) => {
            const p = j === i ? G.Game.player : G.Coop.mate(ids[j])?.pl,
              dex = j === 0 ? 6 : 475;
            return p?.anim.dex === dex && p.spriteDex === dex && !p.megaForm;
          }),
        { ids, i },
      );
    assert.deepEqual(errors, []);
    assert.equal(app.traffic.battleFramesRejected, 0);
    console.log(
      JSON.stringify(
        {
          players: 4,
          firstEvolution: first,
          finalEvolution: final,
          allObserversRenderCorrectSpecies: true,
          hostAndGuestMegaAppearAndRestore: true,
          fusedZVisibleToHostAndOtherGuests: true,
          zChargeAndCooldownSynced: true,
          relayBattleFrames: 0,
          pageErrors: 0,
        },
        null,
        2,
      ),
    );
  } catch (e) {
    console.error(
      "Form QA diagnostics:",
      JSON.stringify({
        errors,
        states: await Promise.all(
          pages
            .filter((p) => !p.isClosed())
            .map((p) =>
              p
                .evaluate(() => ({
                  state: G.Game.state,
                  dex: G.Game.player?.dex,
                  anim: G.Game.player?.anim.dex,
                  peers: G.Coop.mates?.map((m) => ({
                    dex: m.pl.dex,
                    anim: m.pl.anim.dex,
                    z: m.pl.zState?.phase,
                  })),
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

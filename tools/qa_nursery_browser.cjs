/* Real browser flows against an isolated memory database and a controlled server clock. */
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
  let clock = Date.now(), rewardRoll = 0.99;
  const app = createApp({
      dbFile: ":memory:",
      stunUrls: "none",
      now: () => clock,
      rewardRandom: () => rewardRoll,
    }),
    errors = [],
    results = [];
  let browser;
  try {
    const pass = randomBytes(24).toString("hex"),
      names = ["NurseryQAOwner", "NurseryQAFriend"],
      ids = [randomUUID(), randomUUID()],
      hash = await hashPassword(pass);
    for (let i = 0; i < 2; i++) {
      const s = fresh(names[i]);
      s.partner = 6;
      if (i === 0) s.shiny[6] = { at: clock, from: 'fixture' };
      s.zDuplicates[4] = 5;
      for (const d of [4, 6, 9, 132, 150, 151])
        s.owned[d] = { at: clock, from: "fixture", iv: [10, 20, 30] };
      app.db
        .prepare(
          "INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)",
        )
        .run(ids[i], names[i], names[i].toLowerCase(), hash, "unused", clock);
      app.db
        .prepare("INSERT INTO saves(uid,payload) VALUES(?,?)")
        .run(ids[i], JSON.stringify(s));
    }
    app.db
      .prepare("INSERT INTO friends VALUES(?,?,?,1)")
      .run(...ids.slice().sort(), ids[0]);
    app.server.listen(0, "127.0.0.1");
    await once(app.server, "listening");
    const base = "http://127.0.0.1:" + app.server.address().port;
    browser = await chromium.launch({
      headless: true,
      channel: process.env.BROWSER_CHANNEL || "msedge",
      args: [
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
      ],
    });
    const mobile = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        locale: "zh-CN",
      }),
      desktop = await browser.newContext({
        viewport: { width: 1280, height: 960 },
        locale: "zh-CN",
      });
    async function login(context, i, entry = null) {
      const p = await context.newPage();
      p.on("pageerror", (e) => errors.push(e.message));
      await p.goto(
        base +
          (entry || (process.argv.includes("--built") ? "/" : "/dev.html")),
      );
      await p.waitForFunction(
        () =>
          !document.getElementById("tap-start").classList.contains("hidden") ||
          !document.getElementById("scr-login").classList.contains("hidden"),
      );
      if (await p.locator("#tap-start").isVisible())
        await p.locator("#tap-start").click();
      await p.locator("#f-user").fill(names[i]);
      await p.locator("#f-pass").fill(pass);
      await p.locator("#btn-auth").click();
      try {
        await p.locator("#scr-menu:not(.hidden)").waitFor();
      } catch (e) {
        console.log(
          "Login diagnostic",
          i,
          errors,
          await p.locator('[id*="err"]').allTextContents(),
          await p
            .locator(".scr:not(.hidden)")
            .evaluateAll((es) => es.map((e) => e.id)),
        );
        await p.screenshot({
          animations: "disabled",
          path: path.join(__dirname, "cache/nursery-login-error.png"),
        });
        throw e;
      }
      console.log("Signed into isolated fixture", i);
      return p;
    }
    const a = await login(mobile, 0);
    assert.equal(await a.locator("#rotate").count(), 0);
    assert.equal(
      (await (await mobile.request.get(base + "/manifest.webmanifest")).json())
        .orientation,
      "any",
    );
    await a.evaluate(() => {
      window.qaOrientationLocks = 0;
      Object.defineProperty(screen.orientation, "lock", {
        value: () => {
          window.qaOrientationLocks++;
          return Promise.resolve();
        },
        configurable: true,
      });
    });
    await a.locator('[data-go="settings"]').click();
    await a.locator('#set-tabs [data-t="gfx"]').click();
    if (await a.locator("#set-full").count()) {
      await a.locator("#set-full").click();
      await a.waitForFunction(() => !!document.fullscreenElement);
      assert.equal(await a.evaluate(() => window.qaOrientationLocks), 0);
      await a.locator("#set-full").click();
      await a.waitForFunction(() => !document.fullscreenElement);
      results.push(
        "Fullscreen does not lock orientation; installed app manifest allows any orientation",
      );
    }
    await a.locator("#set-close").click();
    await a.locator('[data-go="nursery"]').click();
    await a.locator("#nursery-primary").selectOption("6");
    assert.equal(await a.locator('.nursery-preview').getAttribute('data-shiny'),'true');
    assert.equal(
      await a.locator(".nursery-preview").getAttribute("data-dex"),
      "6",
    );
    await a.locator(".nursery-place").click();
    await a.locator(".nursery-invite").waitFor();
    await a.locator(".nursery-invite").click();
    await a.locator(".nursery-invite[disabled]").waitFor();
    await a.screenshot({
      animations: "disabled",
      path: path.join(__dirname, "cache/nursery-mobile.png"),
    });
    const b = await login(desktop, 1);
    await b.locator('[data-go="friends"]').click();
    await b.locator(".nursery-invitation button").click();
    await b.locator("#nursery-partner").selectOption("9");
    await b.locator(".nursery-start").click();
    await b.locator(".nursery-clock").first().waitFor();
    assert.deepEqual(await b.locator('.nursery-hatch .nursery-mon').evaluateAll(es=>es.map(e=>e.dataset.shiny)),['true','false']);
    await b.locator('.nursery-rules summary').click();
    assert.ok((await b.locator('.nursery-rules').textContent()).includes('2%'));
    assert.deepEqual(
      await b
        .locator(".nursery-hatch .nursery-mon")
        .evaluateAll((es) => es.map((e) => e.dataset.dex)),
      ["6", "9"],
    );
    await b.waitForFunction(() =>
      [...document.querySelectorAll(".nursery-hatch canvas")].every((c) =>
        c
          .getContext("2d")
          .getImageData(0, 0, c.width, c.height)
          .data.some(
            (v, i, a) =>
              i % 4 === 3 && v > 128 && a[i - 1] + a[i - 2] + a[i - 3] > 100,
          ),
      ),
    );
    clock += 3 * 3600000;
    await b.locator("#nursery-back").click();
    await b.locator('[data-go="friends"]').click();
    await b.locator(".nursery-invitation button").click();
    await b.waitForFunction(
      () => Number(document.querySelector(".nursery-progress")?.value) >= 50,
    );
    const progress = await b.locator(".nursery-progress").getAttribute("value");
    assert.ok(Number(progress) >= 50 && Number(progress) < 51);
    await b.screenshot({
      animations: "disabled",
      path: path.join(__dirname, "cache/nursery-v0.20.1-desktop-hatching.png"),
    });
    await a.locator("#nursery-back").click();
    await a.locator('[data-go="nursery"]').click();
    await a.locator(".nursery-hatch").waitFor();
    assert.equal(await a.locator(".nursery-hatch canvas").count(), 2);
    await a.screenshot({
      animations: "disabled",
      path: path.join(__dirname, "cache/nursery-v0.20.1-mobile-hatching.png"),
    });
    await a.setViewportSize({ width: 320, height: 740 });
    assert.equal(
      await a
        .locator(".nursery-box")
        .evaluate((e) => e.scrollWidth <= e.clientWidth),
      true,
    );
    await a.screenshot({
      animations: "disabled",
      path: path.join(__dirname, "cache/nursery-v0.20.1-narrow-hatching.png"),
    });
    await a.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      (await b.locator("#nursery-body").textContent()).includes("继承 2 项"),
    );
    results.push(
      "Offline friend invitation, persistent pairing, two inherited IVs, mobile nursery controls",
    );
    await b.locator("#nursery-back").click();
    await b.locator('[data-go="friends"]').click();
    await b.locator(".friend-gift").click();
    await b.locator(".friend-gift[disabled]").waitFor();
    await a.locator("#nursery-back").click();
    await a.locator('[data-go="friends"]').click();
    await a.locator(".gift-claim").waitFor();
    await a.locator(".gift-claim").click();
    await a.locator(".gift-claim").waitFor({ state: "detached" });
    results.push("Free friend gift, inbox delivery, one-time claim");
    clock += 12 * 3600000;
    rewardRoll = .019;
    await a.locator("#scr-friends [data-back]").click();
    await a.locator('[data-go="nursery"]').click();
    await a.locator(".nursery-hatch.ready").waitFor();
    assert.equal(
      Number(await a.locator(".nursery-progress").getAttribute("value")),
      100,
    );
    await a.screenshot({
      animations: "disabled",
      path: path.join(__dirname, "cache/nursery-v0.20.1-mobile-ready.png"),
    });
    await a.locator(".nursery-claim:not([disabled])").click();
    await a.locator(".nursery-result").waitFor();
    assert.equal(await a.locator('.nursery-result .nursery-mon').getAttribute('data-shiny'),'false');
    assert.equal(await a.locator('.nursery-shiny-result').count(),0);
    assert.equal(
      await a.locator(".nursery-result .nursery-mon").getAttribute("data-dex"),
      "6",
    );
    assert.ok(
      (await a.locator(".nursery-result").textContent()).includes("Z 携带权限"),
    );
    await b.locator("#scr-friends [data-back]").click();
    await b.locator('[data-go="nursery"]').click();
    await b.locator(".nursery-claim:not([disabled])").click();
    await b.locator(".nursery-result").waitFor();
    assert.equal(await b.locator('.nursery-result .nursery-mon').getAttribute('data-shiny'),'true');
    await b.getByText('后代继承了闪光！',{exact:true}).waitFor();
    assert.equal(JSON.parse(app.db.prepare('SELECT payload FROM saves WHERE uid=?').get(ids[1]).payload).shiny[6].from,'nursery');
    if(!process.argv.includes('--built'))assert.equal(await b.evaluate(()=>G.DB.ownsShiny(6)),true);
    await b.screenshot({animations:'disabled',path:path.join(__dirname,'cache/nursery-v0.21.0-shiny-'+(process.argv.includes('--built')?'built':'source')+'.png')});
    await b.locator('#nursery-back').click();await b.locator('[data-go="dex"]').click();
    await b.locator('#dex-grid [data-dex="6"]').click();await b.locator('#dex-detail [data-v="1"]').waitFor();
    results.push(
      "Both players claim the primary species after server time, sixth duplicate unlocks family Z",
      "Shiny primary parent is displayed; only the guest inherits shiny from the other parent at a controlled 1.9% roll",
    );
    // Own breeding uses one inherited IV and can run independently of friend breeding.
    await a.locator("#nursery-partner").selectOption("9");
    await a.locator(".nursery-start").click();
    await a.locator(".nursery-clock").first().waitFor();
    assert.ok(
      (await a.locator("#nursery-body").textContent()).includes(
        "自行孵蛋：继承 1 项",
      ),
    );
    await a.locator("#nursery-back").click();
    await a.locator('[data-go="dex"]').click();
    await a.locator('#dex-grid [data-dex="6"]').click();
    await a.locator(".z-equipment select").selectOption("water");
    await a.locator(".z-equipment .btn").first().click();
    assert.equal(await a.locator(".z-equipment select option").count(), 18);
    await a.screenshot({
      animations: "disabled",
      path: path.join(__dirname, "cache/z-access-mobile.png"),
    });
    await a.locator("#scr-dex [data-back]").first().click();
    await a.locator('[data-go="play"]').click();
    await a.locator("#scr-menu").waitFor({ state: "hidden" });
    if (!process.argv.includes("--built")) {
      await a.waitForFunction(() => G.Game.state === "playing");
      assert.equal(
        await a.evaluate(() => G.ZMoves.hasStone(G.Game.player)),
        true,
      );
      const before = await a.evaluate(() => ({
          x: G.Game.player.x,
          y: G.Game.player.y,
        })),
        cdp = await mobile.newCDPSession(a);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: 180, y: 520 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: 240, y: 520 }],
      });
      await a.waitForFunction(
        ({ x, y }) => Math.hypot(G.Game.player.x - x, G.Game.player.y - y) > 10,
        before,
      );
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await a.setViewportSize({ width: 844, height: 390 });
      await a.setViewportSize({ width: 390, height: 844 });
      assert.equal(await a.evaluate(() => G.Game.state), "playing");
      await a.screenshot({
        animations: "disabled",
        path: path.join(__dirname, "cache/gameplay-portrait.png"),
      });
    }
    results.push(
      process.argv.includes("--built")
        ? "Z permission equips any type; portrait battle starts"
        : "Z permission equips any type; portrait play starts, touch movement and rotation do not auto-pause",
    );
    await mobile.close();
    await desktop.close();
    if (process.argv.includes("--built"))
      for (const [locale, entry, label] of [
        ["en-US", "/en/", "Your nursery"],
        ["es-ES", "/", "Tu guardería"],
      ]) {
        const c = await browser.newContext({
          viewport: { width: 1280, height: 960 },
          locale,
        });
        const p = await login(c, 1, entry);
        await p.locator('[data-go="nursery"]').click();
        await p.getByRole("heading", { name: label, exact: true }).waitFor();
        await p.locator("#nursery-primary").selectOption("150");
        await p.locator(".nursery-place").click();
        await p.locator("#nursery-partner").waitFor();
        const options = await p
          .locator("#nursery-partner option")
          .evaluateAll((es) => es.map((e) => e.value));
        assert.deepEqual(options, ["132"]); // Own Undiscovered cannot pair with another Undiscovered.
        await p.locator(".nursery-withdraw").click();
        await p.locator("#nursery-primary").waitFor();
        await c.close();
        results.push(locale + " nursery and Undiscovered partner filter");
      }
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify(
        { ok: true, built: process.argv.includes("--built"), results },
        null,
        2,
      ),
    );
  } finally {
    await browser?.close();
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

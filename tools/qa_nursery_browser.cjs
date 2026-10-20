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
  let clock = Date.now();
  const app = createApp({
      dbFile: ":memory:",
      stunUrls: "none",
      now: () => clock,
      rewardRandom: () => 0.99,
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
      await p.goto(base + (entry || (process.argv.includes("--built") ? "/" : "/dev.html")));
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
          path: path.join(__dirname, "cache/nursery-login-error.png"),
        });
        throw e;
      }
      console.log("Signed into isolated fixture", i);
      return p;
    }
    const a = await login(mobile, 0);
    assert.equal(await a.locator("#rotate").count(), 0);
    assert.equal((await(await mobile.request.get(base+'/manifest.webmanifest')).json()).orientation,'any');
    await a.evaluate(()=>{window.qaOrientationLocks=0;Object.defineProperty(screen.orientation,'lock',{value:()=>{window.qaOrientationLocks++;return Promise.resolve();},configurable:true});});
    await a.locator('[data-go="settings"]').click();await a.locator('#set-tabs [data-t="gfx"]').click();
    if(await a.locator('#set-full').count()){
      await a.locator('#set-full').click();await a.waitForFunction(()=>!!document.fullscreenElement);
      assert.equal(await a.evaluate(()=>window.qaOrientationLocks),0);
      await a.locator('#set-full').click();await a.waitForFunction(()=>!document.fullscreenElement);
      results.push('Fullscreen does not lock orientation; installed app manifest allows any orientation');
    }
    await a.locator('#set-close').click();
    await a.locator('[data-go="nursery"]').click();
    await a.locator("#nursery-primary").selectOption("6");
    await a.locator(".nursery-place").click();
    await a.locator(".nursery-invite").waitFor();
    await a.locator(".nursery-invite").click();
    await a.locator(".nursery-invite[disabled]").waitFor();
    await a.screenshot({
      path: path.join(__dirname, "cache/nursery-mobile.png"),
    });
    const b = await login(desktop, 1);
    await b.locator('[data-go="friends"]').click();
    await b.locator(".nursery-invitation button").click();
    await b.locator("#nursery-partner").selectOption("9");
    await b.locator(".nursery-start").click();
    await b.locator(".nursery-clock").first().waitFor();
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
    await a.locator("#scr-friends [data-back]").click();
    await a.locator('[data-go="nursery"]').click();
    await a.locator(".nursery-claim:not([disabled])").click();
    await a.locator(".nursery-result").waitFor();
    assert.ok(
      (await a.locator(".nursery-result").textContent()).includes("Z 携带权限"),
    );
    await b.locator("#scr-friends [data-back]").click();
    await b.locator('[data-go="nursery"]').click();
    await b.locator(".nursery-claim:not([disabled])").click();
    await b.locator(".nursery-result").waitFor();
    results.push(
      "Both players claim the primary species after server time, sixth duplicate unlocks family Z",
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
        path: path.join(__dirname, "cache/gameplay-portrait.png"),
      });
    }
    results.push(process.argv.includes('--built')?'Z permission equips any type; portrait battle starts':'Z permission equips any type; portrait play starts, touch movement and rotation do not auto-pause');
    await mobile.close();await desktop.close();
    if(process.argv.includes('--built'))for(const [locale,entry,label] of [['en-US','/en/','Your nursery'],['es-ES','/','Tu guardería']]){
      const c=await browser.newContext({viewport:{width:1280,height:960},locale});
      const p=await login(c,1,entry);await p.locator('[data-go="nursery"]').click();
      await p.getByRole('heading',{name:label,exact:true}).waitFor();
      await p.locator('#nursery-primary').selectOption('150');await p.locator('.nursery-place').click();
      await p.locator('#nursery-partner').waitFor();
      const options=await p.locator('#nursery-partner option').evaluateAll(es=>es.map(e=>e.value));
      assert.deepEqual(options,['132']); // Own Undiscovered cannot pair with another Undiscovered.
      await p.locator('.nursery-withdraw').click();await p.locator('#nursery-primary').waitFor();
      await c.close();results.push(locale+' nursery and Undiscovered partner filter');
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

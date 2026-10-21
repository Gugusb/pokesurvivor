/* Real UI and 2x ranking flow; isolated accounts and in-memory storage only. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { once } = require('node:events');
const { randomBytes, randomUUID } = require('node:crypto');
const { createApp, hashPassword } = require('../server/server.cjs');
const { fresh } = require('../server/domain.cjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(__dirname, 'cache/browser-qa/node_modules/playwright'));

(async () => {
  const app = createApp({ dbFile: ':memory:', stunUrls: 'none' });
  const errors = [], results = [], built = process.argv.includes('--built');
  let browser;
  try {
    const pass = randomBytes(24).toString('hex'), hash = await hashPassword(pass);
    app.server.listen(0, '127.0.0.1');
    await once(app.server, 'listening');
    const base = 'http://127.0.0.1:' + app.server.address().port;
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    for (const [lang, locale] of [['zh', 'zh-CN'], ['en', 'en-US'], ['es', 'es-ES']]) {
      const uid = randomUUID(), name = 'PresentationQA' + lang;
      const save = fresh(name);
      save.partner = 133; save.owned[133] = { at: Date.now(), from: 'fixture', iv: [1, 1, 1] };
      save.difficulty.selected = 8;
      for (let n = 1; n <= 7; n++) save.difficulty.cleared[n] = true;
      save.stats.runs = 1;
      app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid, name, name.toLowerCase(), hash, 'unused', Date.now());
      app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid, JSON.stringify(save));
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale, isMobile: true, hasTouch: true });
      await context.addInitScript(lang => localStorage.setItem('ps.lang', lang), lang);
      const p = await context.newPage();
      p.on('pageerror', e => errors.push(e.message));
      await p.goto(base + (built ? '/' : '/dev.html'));
      await p.locator('#tap-start:not(.hidden), #scr-login:not(.hidden)').first().waitFor();
      if (await p.locator('#tap-start').isVisible()) await p.locator('#tap-start').click();
      await p.locator('#f-user').fill(name); await p.locator('#f-pass').fill(pass); await p.locator('#btn-auth').click();
      await p.locator('#scr-menu:not(.hidden)').waitFor();
      await p.locator('#btn-settings').click(); await p.locator('#set-tabs [data-t="gfx"]').click();
      const setZoom = async value => p.locator('#set-zoom').evaluate((el, value) => { el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); }, value);
      await setZoom('0.5'); assert.equal(await p.locator('#set-zoom-value').textContent(), '50%');
      assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('ps.settings')).zoom), .5);
      await p.locator('#set-zoom-reset').click(); assert.equal(await p.locator('#set-zoom').inputValue(), '1');
      await setZoom('0.75');
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await p.screenshot({ path: path.join(__dirname, `cache/v0.20.3-zoom-${lang}${built ? '-built' : ''}.png`), animations: 'disabled' });
      await p.locator('#set-close').click();
      await p.locator('[data-go="play"]').click();
      await p.locator('#scr-menu').waitFor({ state: 'hidden' });
      await p.keyboard.press('v');
      if (!built) {
        await p.waitForFunction(() => G.Game.speed === 2 && G.Game.st.time > 3.5);
        const state = await p.evaluate(() => ({ clean: G.Game.runClean(), debug: G.Dev.enabled, zoom: G.Camera.viewMultiplier, t: G.Game.st.time }));
        assert.equal(state.clean, true); assert.equal(state.debug, false); assert.ok(Math.abs(state.zoom - 1 / .75) < 1e-8);
      } else {
        // Observe actual game time through the eventual result and server record.
        await p.waitForTimeout(2300);
      }
      await p.keyboard.press('Escape'); await p.locator('#scr-pause:not(.hidden)').waitFor();
      await p.locator('#btn-pause-settings').click(); await p.locator('#set-tabs [data-t="gfx"]').click();
      await setZoom('1.5');
      if (!built) assert.ok(Math.abs(await p.evaluate(() => G.Camera.viewMultiplier) - 2 / 3) < 1e-8);
      await setZoom('0.75'); await p.locator('#set-close').click();
      await p.locator('#btn-quit').click(); await p.locator('#scr-over:not(.hidden)').waitFor();
      await p.locator('#over-ask').waitFor();
      const ask = await p.locator('#over-ask').textContent();
      assert.ok(ask.includes('JPTER78') && ask.includes('Gugusb'));
      assert.equal(await p.locator('#over-ask a').getAttribute('href'), 'https://ko-fi.com/jpter78');
      const text = await p.locator('#over-stats').textContent();
      assert.doesNotMatch(text, /调试|一倍速|velocidad normal|normal speed|debug|depuración/i);
      await p.waitForFunction(async () => (await (await fetch('/api/ranking?board=survival')).json()).me?.t >= 1);
      const run = app.db.prepare('SELECT * FROM runs WHERE uid=? ORDER BY started DESC LIMIT 1').get(uid);
      const score = app.db.prepare('SELECT * FROM time_scores WHERE uid=?').get(uid);
      assert.equal(run.dirty, 0); assert.equal(run.doubled, 1); assert.equal(run.ended, 1);
      assert.equal(score.t, Math.floor(run.t)); assert.ok(score.t >= 3);
      await p.screenshot({ path: path.join(__dirname, `cache/v0.20.3-results-${lang}${built ? '-built' : ''}.png`), animations: 'disabled' });
      await p.locator('#btn-again').click(); await p.locator('[data-go="rank"]').click();
      await p.locator('#rk-mode .gen-tab').nth(1).click(); await p.locator('#rk-list .rk-row.mine').waitFor();
      assert.doesNotMatch(await p.locator('#rk-period').textContent(), /调试|一倍速|normal speed|depuración/i);
      await p.reload();
      await p.locator('#tap-start:not(.hidden), #scr-menu:not(.hidden)').first().waitFor();
      if (await p.locator('#tap-start').isVisible()) await p.locator('#tap-start').click();
      await p.locator('#scr-menu:not(.hidden)').waitFor();
      await p.locator('#btn-settings').click(); await p.locator('#set-tabs [data-t="gfx"]').click();
      assert.equal(await p.locator('#set-zoom').inputValue(), '0.75');
      results.push({ lang, built, rankedSeconds: score.t, zoomPersists: true, attributionAndDonation: true });
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ ok: true, results, pageErrors: errors.length }, null, 2));
  } finally { await browser?.close(); await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

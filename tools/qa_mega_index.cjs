/* Mega index UI QA; disposable users, memory DB, independent browser profiles. */
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm'),{once}=require('node:events'),{randomBytes,randomUUID}=require('node:crypto');
const {createApp,hashPassword}=require('../server/server.cjs'),{fresh,G}=require('../server/domain.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(__dirname,'cache/browser-qa/node_modules/playwright'));
(async()=>{
  const app=createApp({dbFile:':memory:',stunUrls:'none'}),out=path.join(__dirname,'cache'),errors=[];let browser;
  try{
    const data={G:{}};vm.createContext(data);
    for(const f of ['js/data/mega-forms.js','js/data/mega-types.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),data);
    const expected=[...new Set(data.G.MEGA_FORMS.filter(f=>f.available&&f.basicComplete&&data.G.MEGA_TYPES[f.id]).map(f=>f.dex))].sort((a,b)=>a-b);
    const name='MegaIndexFixture',pass=randomBytes(24).toString('hex'),uid=randomUUID(),save=fresh(name);save.partner=1;
    for(const dex of [1,6,475])save.owned[dex]={at:Date.now(),from:'fixture',iv:[20,20,20]};
    save.shiny[475]={at:Date.now(),from:'fixture'};
    save.megaStones['6-mega-x']={at:Date.now()};
    app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,name,name.toLowerCase(),await hashPassword(pass),'unused',Date.now());
    app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(save));
    fs.mkdirSync(out,{recursive:true});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
    const variants=process.argv.includes('--built')?[['/','zh-CN'],['/en/','en-US'],['/','es-ES']]:[['/dev.html','zh-CN']];
    for(const [entry,locale] of variants){
      const c=await browser.newContext({viewport:{width:1280,height:960},locale}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
      await p.goto(base+entry);await p.waitForFunction(()=>!document.getElementById('tap-start').classList.contains('hidden')||!document.getElementById('scr-login').classList.contains('hidden'));
      if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();
      await p.locator('#f-user').fill(name);await p.locator('#f-pass').fill(pass);await p.locator('#btn-auth').click();await p.locator('#scr-menu:not(.hidden)').waitFor();
      await p.locator('[data-go="dex"]').click();
      const mega=p.locator('[data-dex-index="mega"]'),cards=p.locator('#dex-grid .cell');
      const ids=()=>cards.evaluateAll(cs=>cs.map(c=>+c.dataset.dex));
      await mega.click();assert.equal(await mega.getAttribute('aria-pressed'),'true');
      assert.ok((await mega.locator('b').textContent()).includes(locale.startsWith('zh')?'Mega 进化':locale.startsWith('en')?'Mega Evolution':'Megaevolución'));
      assert.deepEqual(await ids(),expected);assert.equal(await mega.locator('small').textContent(),'2/'+expected.length);
      assert.equal(await p.locator('#dex-grid .cell b').evaluateAll(cs=>cs.filter(c=>c.textContent==='???').length),0);
      await p.locator('#dex-grid [data-dex="65"]').click();assert.ok(!(await p.locator('#dex-detail h3').first().textContent()).includes('???'));
      assert.equal(await p.locator('#dex-pick').count(),0);assert.equal(await p.locator('.mega-equipment').count(),0);
      await p.locator('#dex-grid [data-dex="6"]').focus();await p.keyboard.press('Enter');await p.locator('.mega-equipment').waitFor();
      if(await p.locator('.mega-equipment > .btn.ghost').isEnabled())await p.locator('.mega-equipment > .btn.ghost').click();
      await p.locator('.mega-equipment .ability-medal-row .btn:not([disabled])').click();
      assert.ok(await p.locator('.mega-equipment .ability-medal-row .btn.gold[disabled]').count());
      const chips=p.locator('#dex-filters .chip');
      await chips.nth(1).click();assert.deepEqual(await ids(),[6,475]);
      await chips.nth(2).click();assert.deepEqual(await ids(),expected.filter(d=>![6,475].includes(d)));
      await chips.nth(3).click();assert.deepEqual(await ids(),[475]);
      await chips.nth(8).click();assert.equal(await cards.count(),0);assert.equal(await p.locator('#dex-big').count(),0);assert.equal(await mega.getAttribute('aria-pressed'),'true');
      await chips.nth(0).click();assert.deepEqual(await ids(),expected);assert.equal(await mega.getAttribute('aria-pressed'),'true');
      await chips.nth(4).click();assert.deepEqual(await ids(),expected.filter(d=>G.DEX_BY[d].rarity===5));
      await chips.nth(0).click();
      await p.locator('#scr-dex .box').screenshot({path:path.join(out,'mega-index-'+locale+'.png')});
      await p.setViewportSize({width:390,height:844});await mega.scrollIntoViewIfNeeded();await mega.click();
      assert.ok(await mega.isVisible());assert.ok(await p.locator('#dex-grid').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
      await p.locator('[data-dex-index="4"]').click();assert.ok((await ids()).every(d=>G.DEX_BY[d].gen===4));assert.equal(await mega.getAttribute('aria-pressed'),'false');
      await c.close();
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({entry:process.argv.includes('--built')?'built':'source',megaSpecies:expected.length,crossRegion:true,unownedNamesVisible:true,equipmentWorks:true,ownershipFilters:true,emptyFilterRecovery:true,rarityFilter:true,keyboard:true,mobile:true,pageErrors:0},null,2));
  }finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

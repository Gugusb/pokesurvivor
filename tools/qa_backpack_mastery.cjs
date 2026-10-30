/* Disposable account/database: verify real keyboard, pause and mastery menus. */
const assert=require('node:assert/strict'),path=require('node:path'),{once}=require('node:events'),{randomBytes,randomUUID}=require('node:crypto');
const {createApp,hashPassword}=require('../server/server.cjs'),{fresh}=require('../server/domain.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(__dirname,'cache/browser-qa/node_modules/playwright'));
(async()=>{
 const app=createApp({dbFile:':memory:',stunUrls:'none'}),errors=[],results=[];let browser;
 try{
  const name='BackpackFixture',password=randomBytes(24).toString('hex'),uid=randomUUID(),save=fresh(name);save.partner=6;
  for(const dex of [4,5,6])save.owned[dex]={at:1,iv:Array(8).fill(20)};
  app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,name,name.toLowerCase(),await hashPassword(password),'unused',Date.now());
  app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(save));
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
  browser=await chromium.launch({channel:'msedge',headless:true});
  for(const built of (process.argv.includes('--source')?[false]:process.argv.includes('--built')?[true]:[false,true]))for(const lang of ['zh','en','es']){
   const ctx=await browser.newContext({viewport:{width:1280,height:900},locale:lang==='zh'?'zh-CN':lang});await ctx.addInitScript(lang=>localStorage.setItem('ps.lang',lang),lang);
   const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+(built?'/':'/dev.html'));
   await page.waitForFunction(()=>!document.getElementById('tap-start').classList.contains('hidden')||!document.getElementById('scr-login').classList.contains('hidden'));
   if(await page.locator('#tap-start').isVisible())await page.locator('#tap-start').click();
   await page.locator('#f-user').fill(name);await page.locator('#f-pass').fill(password);await page.locator('#btn-auth').click();await page.locator('#scr-menu:not(.hidden)').waitFor();
   await page.locator('[data-go="play"]').click();await page.locator('#backpack-open:not(.hidden)').waitFor();
   if(!built)await page.evaluate(()=>{G.Game.debugMark();G.Spawner.update=()=>{};G.Events.update=()=>{};G.EnemyMgr.clear();const p=G.Game.player;p.maxHp=p.hp=100000;p.invuln=10000;p.growStat('atk',.1);p.growStat('stamina',.12);G.Items.gain(p,'leftovers');G.Items.gain(p,'candyjar');});
   await page.keyboard.press('e');await page.locator('#scr-backpack:not(.hidden)').waitFor();assert.equal(await page.locator('#backpack-stats .bag-stat').count(),8);
   const content=await page.locator('#scr-backpack').textContent();for(const label of ({zh:['战斗背包','物攻倍率','敏捷','耐力','临时PP'],en:['Battle bag','Physical multiplier','Agility','Stamina'],es:['Mochila de combate','Multiplicador físico','Agilidad base','Resistencia base']})[lang])assert.ok(content.includes(label),label);
   await page.locator('#backpack-moves summary').first().click();const title=await page.locator('#backpack-moves details').first().getAttribute('title');assert.ok(title.includes('PP')===false||title.length>10);assert.ok(title.length>30);
   if(!built){const before=await page.evaluate(()=>({state:G.Game.state,time:G.Game.st.time}));assert.equal(before.state,'inventory');await new Promise(r=>setTimeout(r,400));assert.equal(await page.evaluate(()=>G.Game.st.time),before.time);}
   await page.screenshot({path:path.join(__dirname,`cache/backpack-${built?'built':'source'}-${lang}.png`),animations:'disabled'});
   await page.setViewportSize({width:320,height:740});await page.screenshot({path:path.join(__dirname,`cache/backpack-${built?'built':'source'}-${lang}-mobile.png`),animations:'disabled'});assert.ok(await page.locator('.bag-panel').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
   await page.keyboard.press('Escape');await page.locator('#scr-backpack').waitFor({state:'hidden'});await page.setViewportSize({width:1280,height:900});
   if(!built){
    // Bank the TM first: no max-level move means no forced choice yet.
    await page.evaluate(()=>G.Items.gain(G.Game.player,'masterytm'));await new Promise(r=>setTimeout(r,150));assert.equal(await page.locator('#scr-specialization').isVisible(),false);
    await page.evaluate(()=>{const m=G.Game.player.moves[0];while(G.Moves.levelUp(m)){};});await page.locator('#scr-specialization:not(.hidden)').waitFor();
    await page.locator('#specialization-cards .card').first().click();assert.equal(await page.locator('#specialization-cards .card').count(),3);
    const rerolls=await page.evaluate(()=>G.Game.player.rerolls);await page.keyboard.press('r');await page.waitForFunction(n=>G.Game.player.rerolls===n+1,rerolls);assert.equal(await page.evaluate(()=>G.Game.player.rerolls),rerolls+1);assert.ok(await page.locator('#specialization-reroll').isDisabled());
    const picked=await page.locator('#specialization-cards .card').first().getAttribute('data-spec');await page.screenshot({path:path.join(__dirname,`cache/mastery-source-${lang}.png`),animations:'disabled'});
    await page.keyboard.press('1');await page.locator('#scr-specialization').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>G.Game.player.moves[0].specializations[0]),picked);assert.equal(await page.evaluate(()=>G.Game.player.specTokens),0);assert.equal(await page.evaluate(()=>G.Game.state),'playing');
    await page.keyboard.press('e');await page.locator('#scr-backpack:not(.hidden)').waitFor();assert.ok((await page.locator('#backpack-moves details').first().getAttribute('title')).length>title.length);await page.keyboard.press('e');
   }
   if(built){
    await page.keyboard.press('Escape');await page.locator('#scr-pause:not(.hidden)').waitFor();await page.locator('#btn-pause-settings').click();await page.locator('#set-tabs [data-t="dev"]').click();await page.locator('#dev-enable').click();await page.locator('#set-close').click();await page.locator('#btn-resume').click();
    await page.keyboard.press('F2');await page.locator('#dev-panel:not(.hidden)').waitFor();await page.locator('[data-dev="god"]').click();await page.locator('[data-dev="move-max"]').click();await page.locator('[data-dev="mastery"]').click();await page.keyboard.press('F2');
    await page.locator('#scr-specialization:not(.hidden)').waitFor();await page.locator('#specialization-cards .card').first().click();assert.equal(await page.locator('#specialization-cards .card').count(),3);await page.locator('#specialization-reroll').click();assert.ok(await page.locator('#specialization-reroll').isDisabled());
    const name=(await page.locator('#specialization-cards .card strong').first().textContent()).replace(/^\d+\.\s*/,'');await page.screenshot({path:path.join(__dirname,`cache/mastery-built-${lang}.png`),animations:'disabled'});await page.locator('#specialization-cards .card').first().click();await page.locator('#scr-specialization').waitFor({state:'hidden'});
    await page.keyboard.press('e');await page.locator('#scr-backpack:not(.hidden)').waitFor();assert.ok((await page.locator('#backpack-moves details').first().getAttribute('title')).includes(name));assert.equal(await page.evaluate(()=>typeof G),'undefined');
   }
   results.push({built,lang,backpack:true,mobile:true,mastery:true});await ctx.close();
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify(results));
 }finally{await browser?.close();await new Promise(r=>app.server.close(r));app.db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

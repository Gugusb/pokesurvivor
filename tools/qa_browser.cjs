/* Optional isolated browser QA. No production accounts, databases or browser profile. */
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{once}=require('node:events'),{randomBytes,randomUUID}=require('node:crypto');
const {createApp,hashPassword}=require('../server/server.cjs'),{fresh,G}=require('../server/domain.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(__dirname,'cache/browser-qa/node_modules/playwright'));
const OUT=path.join(__dirname,'cache');
(async()=>{
  const app=createApp({dbFile:':memory:'});let browser;
  try{
    const username='BrowserFixture',pass=randomBytes(24).toString('hex'),uid=randomUUID(),s=fresh(username);s.partner=133;s.owned[133]={at:Date.now(),from:'starter',iv:[1,1,1]};
    for(let n=1;n<=8;n++)G.Difficulty.record(s,{stars:n,dex:133,eligible:true},1801,true,true);
    app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,role,created) VALUES(?,?,?,?,?,?,?)').run(uid,username,username.toLowerCase(),await hashPassword(pass),'unused','admin',Date.now());
    app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(s));app.db.prepare('INSERT INTO completion_scores VALUES(?,?,?)').run(uid,G.Difficulty.completedCount(s),Date.now());app.db.prepare('INSERT INTO time_scores VALUES(?,?,?,?,?,?,?)').run(uid,1801,133,60,1000,'fixture',Date.now());
    app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
    const context=await browser.newContext({viewport:{width:1280,height:900},locale:'zh-CN'}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    async function tap(p){await p.waitForFunction(()=>!document.getElementById('tap-start').classList.contains('hidden')||!document.getElementById('scr-login').classList.contains('hidden'));if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#scr-login:not(.hidden)').waitFor();}
    async function boot(url){await page.goto(url);await tap(page);}
    await boot(base+'/');assert.equal(await page.locator('#btn-google').count(),0);
    await page.locator('#f-user').fill(username);await page.locator('#f-pass').fill(pass);await page.locator('#btn-auth').click();await page.locator('#scr-menu:not(.hidden)').waitFor();
    await page.locator('[data-go="rank"]').click();await page.getByRole('button',{name:'满勋章通关数量榜',exact:true}).waitFor();await page.locator('#rk-list .rk-row').waitFor();assert.equal(await page.locator('#rk-list .time').textContent(),'9');
    await page.getByRole('button',{name:'八星生存时间榜',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#rk-list .time')?.textContent==='30:01');
    await page.screenshot({path:path.join(OUT,'v0.15.0-ranking.png')});
    await page.locator('#rk-mod').click();await page.getByText(username+' · admin',{exact:true}).waitFor();await context.close();
    const built=await browser.newContext({viewport:{width:1280,height:900},locale:'zh-CN'});
    await built.addInitScript(()=>{localStorage.setItem('ps.dev.enabled','true');window.qaTexts=[];const fill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(t,...a){if(window.qaTexts.length>2000)window.qaTexts=[];window.qaTexts.push(t);return fill.call(this,t,...a);};});
    const b=await built.newPage();b.on('pageerror',e=>errors.push(e.message));await b.goto(base+'/');await tap(b);
    await b.locator('#f-user').fill(username);await b.locator('#f-pass').fill(pass);await b.locator('#btn-auth').click();await b.locator('#scr-menu:not(.hidden)').waitFor();await b.locator('[data-go="play"]').click();
    for(let n=0;n<7;n++){await b.locator('#dev-launcher').click();await b.locator('[data-dev="level"]').click();await b.locator('#dev-close').click();await b.locator('#scr-levelup:not(.hidden) .card').first().click();}
    await b.locator('#lvl-evolution-title:not(.hidden)').waitFor();assert.equal(await b.locator('#cards .card').count(),3);await b.locator('#lvl-reroll').click();
    const builtName=await b.locator('#cards .card .evolution-target strong').first().textContent();await b.locator('#cards .card').first().click();await b.waitForFunction(name=>window.qaTexts.includes(name),builtName);await built.close();
    const guest=await browser.newContext({viewport:{width:1280,height:900},locale:'zh-CN'}),p=await guest.newPage();p.on('pageerror',e=>errors.push(e.message));
    await p.goto(base+'/dev.html');await tap(p);
    await p.evaluate(()=>{G.DB.playAsGuest();G.DB.grant(133,'qa');G.DB.save.partner=133;G.Flow.afterLogin();});
    await p.locator('[data-go="play"]').click();await p.waitForFunction(()=>G.Game.state==='playing');
    await p.evaluate(()=>{for(let n=0;n<7;n++)G.Game.debugLevelUp();});
    await p.locator('#scr-levelup:not(.hidden) .card').first().click();
    await p.locator('#lvl-evolution-title:not(.hidden)').waitFor();assert.equal(await p.locator('#lvl-evolution-title').textContent(),'进化方向');
    const before=await p.locator('#cards .card').evaluateAll(cs=>cs.map(c=>({dex:+c.dataset.evolutionDex,stat:c.dataset.statId})));assert.equal(before.length,3);assert.equal(new Set(before.map(c=>c.dex)).size,3);assert.ok(before.every(c=>c.stat!=='heal'));
    await p.locator('#lvl-reroll').click();const cards=await p.locator('#cards .card').evaluateAll(cs=>cs.map(c=>({dex:+c.dataset.evolutionDex,stat:c.dataset.statId})));assert.equal(cards.length,3);assert.equal(new Set(cards.map(c=>c.dex)).size,3);
    await p.screenshot({path:path.join(OUT,'v0.15.0-evolution.png')});
    const expected=cards[0];await p.locator('#cards .card').first().click();assert.equal(await p.evaluate(()=>G.Game.player.dex),expected.dex);assert.equal(await p.evaluate(id=>G.Game.player.statsTaken[id],expected.stat),3);assert.ok(!(await p.locator('#lvl-evolution-title').isVisible()));
    await p.screenshot({path:path.join(OUT,'v0.15.0-evolved.png')});await guest.close();
    assert.deepEqual(errors,[]);console.log(JSON.stringify({productionLogin:true,completionCount:9,survival:'30:01',adminUsers:true,builtEvolution:true,evolutionChoices:3,distinctDirections:true,rerollStaysEvolution:true,selectedBranchApplied:true,passiveStacks:3,pageErrors:0},null,2));
  }finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

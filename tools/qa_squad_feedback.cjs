/* Local source runtime, isolated accounts/SQLite and clearly marked battle fixtures. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{once}=require('node:events'),{randomUUID,randomBytes}=require('node:crypto');
const {createApp,hashPassword}=require('../server/server.cjs'),{fresh}=require('../server/domain.cjs'),{chromium}=require('./cache/browser-qa/node_modules/playwright');
(async()=>{const app=createApp({dbFile:':memory:',stunUrls:'none'});let browser;const errors=[],results=[];
try{
 app.server.listen(0,'127.0.0.1');await once(app.server,'listening');browser=await chromium.launch({channel:'msedge',headless:true});const base='http://127.0.0.1:'+app.server.address().port;
 for(const {lang,mobile,landscape} of [{lang:'zh',mobile:true,landscape:false}]){
  const uid=randomUUID(),name='Bonds'+randomBytes(4).toString('hex'),pass=randomBytes(16).toString('hex'),s=fresh(name);s.partner=s.starter=1;s.owned[1]={iv:Array(8).fill(20)};s.owned[4]={iv:Array(8).fill(0)};s.owned[5]={iv:Array(8).fill(31)};s.owned[6]={iv:Array(8).fill(16)};
  require('../server/domain.cjs').G.CardPacks.normalize(s);for(const k of ['specialize','link','breakthrough'])s.cardPack.taken['training:'+k]=1;
  s.cardPack.taken['item:ejectbutton']=1;s.cardPack.disabled.ejectbutton=true;
  for(const m of fs.readFileSync(path.join(__dirname,'../js/data/achievements.js'),'utf8').matchAll(/id:\s*['"]([^'"]+)['"]/g))s.ach[m[1]]=Date.now();
  app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,name,name.toLowerCase(),await hashPassword(pass),'unused',Date.now());app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(s));
  const ctx=await browser.newContext({viewport:mobile?(landscape?{width:844,height:390}:{width:390,height:844}):{width:1360,height:900},isMobile:mobile,hasTouch:mobile});await ctx.addInitScript(l=>localStorage.setItem('ps.lang',l),lang);const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error'&&m.text().includes('[Game]')){errors.push(m.text());console.error(m.text());}});p.on('dialog',d=>d.accept());
  await p.goto(base+'/dev.html');await p.locator('#tap-start:not(.hidden),#scr-login:not(.hidden)').first().waitFor();if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#f-user').fill(name);await p.locator('#f-pass').fill(pass);await p.locator('#btn-auth').click();await p.locator('#scr-menu:not(.hidden)').waitFor();await p.locator('[data-go=play]').click();await p.locator('#journey-captain').waitFor();



  await p.locator('#journey-captain').selectOption('4');
  await p.locator('.journey-prep-actions button').last().click();await p.locator('.journey-prep-actions button').last().click();await p.locator('.journey-grid').waitFor();
  await p.evaluate(()=>{
    const r=G.Expedition.run;r.gold=200;r.trainerLevel=3;r.trainerXp=G.Economy.levelRow(3).xpToNext-2;G.Squad.syncTrainer();G.Squad.recruit(7);const bench=G.Squad.recruit(1);G.Squad.bench(bench);r.map[1][3].kind='shop';G.Expedition.choose(1,3);
    for(const o of G.Expedition.offers)r.unitPool.putBack(o);G.Expedition.offers.splice(0,5,...[7,1,4,10,133].map(dex=>({kind:'mon',dex,moveId:G.FIXED_SKILLS[dex],rank:1,cost:G.ExpeditionQuality.quality(dex)})));G.Expedition.refreshScreen();
  });
  for(const i of [0,1,2])assert.equal(await p.locator('[data-product="'+i+'"]').getAttribute('data-owned'),'true');
  assert.equal(await p.locator('[data-product="0"]').getAttribute('data-merge'),'true');assert.equal(await p.locator('[data-product="2"]').getAttribute('data-merge'),'false');assert.equal(await p.locator('[data-product="3"]').getAttribute('data-owned'),null);
  assert.equal(await p.locator('[data-product="0"] .journey-owned-badge').textContent(),'可合成升星');
  const before=await p.evaluate(()=>({gold:G.Expedition.run.gold,level:G.Expedition.run.trainerLevel}));await p.locator('#journey-upgrade').click();
  assert.deepEqual(await p.evaluate(()=>({gold:G.Expedition.run.gold,level:G.Expedition.run.trainerLevel,xp:G.Expedition.run.trainerXp})),{gold:before.gold-4,level:before.level+1,xp:2});
  assert.match(await p.locator('#journey-shop-progress [data-xp=trainer]').innerText(),/Lv\.4[\s\S]*2 \//);assert.equal(await p.locator('#journey-shop-progress [data-xp=trainer] [role=progressbar]').getAttribute('aria-valuenow'),'2');
  await p.locator('[data-product="0"]').scrollIntoViewIfNeeded();const visible=await p.evaluate(()=>{const b=document.getElementById('journey-upgrade').getBoundingClientRect(),xp=document.getElementById('journey-shop-progress').getBoundingClientRect();return b.top>=0&&b.bottom<innerHeight&&xp.top>=0&&xp.bottom<innerHeight;});assert.equal(visible,true);await p.screenshot({path:'tools/cache/shop-feedback-mobile.png',animations:'disabled'});
  await p.locator('[data-buy="0"]').click();await p.locator('#squad-rankup[data-rank="2"][data-dex="8"]').waitFor();await p.waitForTimeout(850);await p.screenshot({path:'tools/cache/star-up-mobile.png'});await p.locator('#squad-rankup .btn').click();assert.equal(await p.locator('#squad-rankup').count(),0);
  assert.ok(await p.evaluate(()=>G.Squad.roster.some(p=>p.dex===8&&p.rank===2)));
  await p.evaluate(()=>{G.Squad.recruit(7);G.Expedition.offers[0]={kind:'mon',dex:7,rank:1,moveId:G.FIXED_SKILLS[7],cost:G.ExpeditionQuality.quality(7)};G.Expedition.refreshScreen();});await p.locator('[data-buy="0"]').click();await p.locator('#squad-rankup[data-rank="2"]').waitFor();await p.locator('#squad-rankup .btn').click();await p.locator('#squad-rankup[data-rank="3"][data-dex="9"]').waitFor();await p.locator('#squad-rankup .btn').click();assert.ok(await p.evaluate(()=>G.Squad.roster.some(p=>p.dex===9&&p.rank===3)));
  await p.evaluate(()=>{const m=G.Squad.recruit(131);G.Squad.promote(m,{});});await p.locator('#squad-rankup[data-rank="2"][data-dex="131"]').waitFor();await p.locator('#squad-rankup').waitFor({state:'detached'});
  await p.evaluate(()=>{const r=G.Expedition.run;r.trainerXp=G.Economy.levelRow(r.trainerLevel).xpToNext-2;G.Expedition.refreshScreen();});await p.locator('#journey-upgrade').click();await p.locator('#squad-rankup[data-rank="2"][data-dex="5"]').waitFor();await p.locator('#squad-rankup .btn').click();
  await p.evaluate(()=>{
    const r=G.Expedition.run;for(const p of [...G.Squad.roster])G.Squad.consume(p);r.cycle=4;r.trainerLevel=10;G.Squad.syncTrainer();G.SquadUI.clearRankUps();for(const dex of [1,7,16,19,21])G.Squad.recruit(dex);
    for(const p of G.Squad.actors()){const m=G.Moves.instance('ember');p.moves=[m];p.slots=[[m]];p.mon={...p.mon,types:['fire']};}G.Squad.refresh();G.SquadBonds.setLayer('skill','projectile',350);G.SquadBonds.setLayer('types','fire',150);G.SquadUI.show({editable:true});
  });
  assert.equal(await p.locator('#squad-content [data-xp=trainer]').count(),1);await p.locator('.squad-bond-tab').filter({hasText:'职业'}).click();let effect=await p.locator('[data-bond=projectile] .squad-bond-effect').innerText();assert.match(effect,/敏捷\+125%/);assert.match(effect,/耐力\+125%/);assert.doesNotMatch(effect,/50\/100|0\/200|500层/);
  await p.evaluate(()=>G.SquadBonds.setLayer('skill','projectile',800));await p.waitForFunction(()=>document.querySelector('[data-bond=projectile] .squad-bond-effect').textContent.includes('175%'));
  await p.locator('.squad-bond-tab').filter({hasText:'属性'}).click();const current=await p.locator('[data-bond=fire] .squad-bond-current').innerText();assert.match(current,/97\.5%/);assert.match(current,/975%/);assert.doesNotMatch(current,/0 \/ 100|0 \/ 200/);await p.locator('#squad-bonds').screenshot({path:'tools/cache/current-bond-values.png'});
  await p.evaluate(()=>{G.SquadUI.close();G.Expedition.showRoute();});assert.equal(await p.locator('#journey-content [data-xp=pokemon]').count(),1);
  await p.evaluate(()=>{const r=G.Expedition.run;r.map[2][3].kind='battle';G.Expedition.choose(2,3);G.EnemyMgr.clear();r.spawned=r.wave.count;r.pendingSpawns=[];const e=new G.Enemy({dex:7,hp:1e9,spd:0,dmg:0,xp:0,behavior:'chase'},r.captain.x+450,r.captain.y,{hp:1,spd:1,dmg:1});G.EnemyMgr.add(e);r.captain.gainXp(10);});
  await p.locator('#expedition-progress-hud:not([hidden]) [data-xp=trainer]').waitFor();assert.equal(await p.locator('#expedition-progress-hud [data-xp=pokemon] [role=progressbar]').getAttribute('aria-valuenow'),String(await p.evaluate(()=>G.Expedition.run.captain.xp)));await p.screenshot({path:'tools/cache/experience-in-combat.png'});await p.evaluate(()=>{G.Game.expeditionPause();G.Expedition.showRoute();});
  await p.setViewportSize({width:1360,height:900});assert.ok(await p.locator('#journey-content').evaluate(el=>el.scrollWidth<=el.clientWidth+1));await p.screenshot({path:'tools/cache/experience-route-desktop.png'});
  assert.deepEqual(errors,[]);console.log('Squad feedback passed: owned/reserve/family cues; XP purchase and sticky bars; two-star, chained three-star, unchanged-form and captain animations; interpolated/live class and type values; combat/route/squad XP; mobile and desktop layouts.');
  await p.goto(base+'/');await p.locator('#tap-start:not(.hidden),#scr-menu:not(.hidden)').first().waitFor();if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#scr-menu:not(.hidden)').waitFor();assert.equal(await p.evaluate(()=>typeof window.G),'undefined');await p.locator('[data-go=play]').click();await p.locator('#journey-captain').waitFor();assert.deepEqual(errors,[]);await ctx.close();
 }
}catch(e){console.error('Page errors:',errors);for(const context of browser?.contexts()||[])for(const page of context.pages()){console.error((await page.locator('body').innerText()).slice(-5000));await page.screenshot({path:'tools/cache/squad-feedback-failure.png'});}throw e;}finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

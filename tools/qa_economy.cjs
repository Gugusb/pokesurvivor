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
  assert.equal(await p.evaluate(()=>G.Expedition.run.gold),0);assert.equal(await p.evaluate(()=>G.Squad.capacity),1);
  await p.evaluate(()=>{const r=G.Expedition.run;r.gold=50;r.map[1][3].kind='battle';G.Expedition.choose(1,3);G.EnemyMgr.clear();r.spawned=r.wave.count;r.pendingSpawns=[];G.Pickups.drop('coin',r.captain.x,r.captain.y,999);r.captain.hp=r.captain.maxHp*.9;G.Expedition.tick(.01);});
  await p.locator('#journey-loot-next').waitFor();
  assert.deepEqual(await p.evaluate(()=>{const r=G.Expedition.run;return {gold:r.gold,wage:r.settlement.baseWage,interest:r.settlement.interest,drops:r.settlement.inWaveDrops,xp:r.trainerXp};}),{gold:61,wage:5,interest:5,drops:1,xp:2});
  await p.locator('#journey-claim').click();await p.locator('#journey-loot-next').click();await p.locator('.journey-grid').waitFor();
  await p.evaluate(()=>{const r=G.Expedition.run;r.map[2][3].kind='shop';G.Expedition.choose(2,3);window.oldOffers=G.Expedition.offers;window.stockBefore=Array.from(r.unitPool.stock);});
  assert.equal(await p.locator('.journey-product').count(),5);assert.equal(await p.locator('.journey-odds span').count(),5);assert.match(await p.locator('#journey-upgrade').innerText(),/4 G.*4 XP/);
  await p.locator('#journey-upgrade').click();assert.equal(await p.evaluate(()=>G.Expedition.run.trainerLevel),2);assert.equal(await p.evaluate(()=>G.Expedition.run.trainerXp),2);assert.equal(await p.evaluate(()=>G.Squad.capacity),2);assert.equal(await p.evaluate(()=>G.Expedition.offers===window.oldOffers),true);
  await p.locator('#journey-shop-lock').click();await p.locator('.journey-shop-controls button').nth(2).click();
  await p.evaluate(()=>{const r=G.Expedition.run;r.map[3][3].kind='shop';G.Expedition.choose(3,3);});assert.equal(await p.evaluate(()=>G.Expedition.offers===window.oldOffers),true);
  await p.locator('#journey-refresh').click();assert.equal(await p.evaluate(()=>G.Expedition.run.shopLocked),false);assert.equal(await p.evaluate(()=>G.Expedition.run.gold),57);
  await p.screenshot({path:'tools/cache/alpha16-shop-mobile.png'});
  await p.locator('.journey-shop-controls button').nth(2).click();
  await p.evaluate(()=>{const r=G.Expedition.run;r.map[4][3].kind='wild';G.Expedition.choose(4,3);});
  const wild=await p.locator('[data-wild-capture]').count();assert.ok(wild>=2&&wild<=3);await p.locator('[data-wild-capture]').first().click();await p.locator('#journey-content > button').last().click();await p.locator('.journey-grid').waitFor();assert.equal(await p.evaluate(()=>G.Expedition.run.gold),57);assert.equal(await p.evaluate(()=>G.Expedition.run.trainerXp),3);
  await p.evaluate(()=>{const r=G.Expedition.run;r.map[5][3].kind='training';G.Expedition.choose(5,3);});assert.match(await p.locator('[data-training=up]').innerText(),/免费/);await p.locator('#journey-content > button').last().click();await p.locator('.journey-grid').waitFor();assert.equal(await p.evaluate(()=>G.Expedition.run.trainerXp),5);
  // Jump the controlled route to its Boss day, preserving an isolated test account.
  await p.evaluate(()=>{const r=G.Expedition.run;r.row=19;r.day=19;G.Expedition.showRoute();G.Expedition.choose(20,3);G.EnemyMgr.clear();r.pendingSpawns=[];r.spawned=1;r.bossDead=true;G.Expedition.tick(.01);});
  await p.locator('[data-boss-emblem]').first().waitFor();assert.equal(await p.locator('[data-boss-emblem]').count(),3);assert.equal(await p.locator('#journey-loot-next').isDisabled(),true);await p.locator('[data-boss-emblem]').first().click();await p.locator('#journey-loot-next').click();await p.locator('#journey-shop-lock').waitFor();assert.equal(await p.evaluate(()=>G.Expedition.run.day),20);assert.equal(await p.evaluate(()=>G.Expedition.run.cycle),2);assert.equal(await p.evaluate(()=>G.Expedition.run.postBossShop),true);const gold=await p.evaluate(()=>G.Expedition.run.gold);await p.locator('.journey-shop-controls button').nth(2).click();await p.locator('.journey-grid').waitFor();assert.equal(await p.evaluate(()=>G.Expedition.run.day),20);assert.equal(await p.evaluate(()=>G.Expedition.run.gold),gold);
  // Standard-clear handoff keeps the Boss shop pending until Continue is chosen.
  await p.evaluate(()=>{const r=G.Expedition.run;r.cycle=3;r.map=G.ExpeditionRules.matrix(3);r.row=19;r.day=59;G.Expedition.showRoute();G.Expedition.choose(20,3);G.EnemyMgr.clear();r.pendingSpawns=[];r.spawned=1;r.bossDead=true;G.Expedition.tick(.01);});
  await p.locator('[data-boss-emblem]').first().waitFor();await p.locator('[data-boss-emblem]').first().click();await p.locator('#journey-loot-next').click();await p.locator('#scr-victory:not(.hidden)').waitFor();assert.equal(await p.evaluate(()=>G.Expedition.run.cycle),4);await p.locator('#victory-continue').click();await p.locator('#journey-shop-lock').waitFor();assert.equal(await p.evaluate(()=>G.Expedition.run.postBossShop),true);await p.locator('.journey-shop-controls button').nth(2).click();await p.locator('.journey-grid').waitFor();
  // Trainer rank gates and endless services, without simulating sixty full battles.
  const shapes=await p.evaluate(()=>{const r=G.Expedition.run;r.cycle=4;r.trainerLevel=5;G.Squad.syncTrainer();const a=r.captain.dex;r.trainerLevel=8;G.Squad.syncTrainer();const b=r.captain.dex;r.trainerLevel=10;r.gold=1000;G.Squad.syncTrainer();r.map=G.ExpeditionRules.matrix(4);r.row=0;r.col=3;r.map[1][3].kind='shop';G.Expedition.choose(1,3);return [a,b];});assert.deepEqual(shapes,[5,6]);
  await p.locator('#journey-license').click();await p.locator('#journey-license').click();assert.equal(await p.evaluate(()=>G.Squad.capacity),12);assert.equal(await p.evaluate(()=>G.Expedition.run.gold),760);
  await p.locator('.journey-shop-controls button').nth(2).click();await p.evaluate(()=>{const r=G.Expedition.run;r.map[2][3].kind='training';G.Expedition.choose(2,3);});await p.locator('[data-training=overclock]').click();assert.match(await p.locator('#journey-content h3').innerText(),/免费/);await p.locator('[data-training-choice=overclock]').first().click();await p.locator('.journey-grid').waitFor();assert.equal(await p.evaluate(()=>G.Expedition.run.skillOverclockCount),1);assert.equal(await p.evaluate(()=>G.Expedition.run.gold),760);
  assert.equal(await p.evaluate(()=>{const r=G.Expedition.run,m=r.captain.moves[0];return Math.abs(r.captain.attackFor(m)/(m.damageClass==='special'?r.captain.spa:r.captain.atk)-1.05)<1e-9;}),true);
  await p.screenshot({path:'tools/cache/alpha16-training-mobile.png'});
  // Published bundle embeds the JSON table and keeps debug APIs private.
  await p.goto(base+'/');await p.locator('#tap-start:not(.hidden),#scr-menu:not(.hidden)').first().waitFor();if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#scr-menu:not(.hidden)').waitFor();assert.equal(await p.evaluate(()=>typeof window.G),'undefined');await p.locator('[data-go=play]').click();await p.locator('#journey-captain').waitFor();await p.locator('.journey-prep-actions button').last().click();await p.locator('.journey-prep-actions button').last().click();await p.locator('.journey-grid').waitFor();assert.match(await p.locator('.journey-meta').innerText(),/局内金币 0/);
  console.log('Economy, five-slot lock, free/paid XP, wild captures, Boss emblems/free shop, captain ranks and endless services passed.');await ctx.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

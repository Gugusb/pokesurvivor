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
  assert.equal(await p.locator('[data-squad-hp="100"]').count(),1);
  for(let i=1;i<=3;i++){
   const result=await p.evaluate(i=>{const r=G.Expedition.run,row=r.row+1;r.map[row][r.col].kind=i===3?'boss':'battle';G.Expedition.choose(row,r.col);G.Game.expeditionPause();G.EnemyMgr.clear();G.Pickups.clear();G.Projectiles.clear();r.pendingSpawns=[];r.spawned=r.wave.count;r.captain.invuln=999;r.captain.hp=r.captain.maxHp*.6;
    // Keep every battle a timeout; include pending enemies in the controlled first encounter.
    const foe=(elite,boss)=>{const e=new G.Enemy({dex:7,hp:1e9,spd:0,dmg:0,xp:0,behavior:'chase'},r.captain.x+450,r.captain.y,{hp:1,spd:1,dmg:1},boss);e.expedition=true;e.elite=elite;return e;};
    if(i===1){G.EnemyMgr.add(foe(false,false));G.EnemyMgr.add(foe(true,false));r.pendingSpawns=[{enemy:foe(false,true),left:2}];}else G.EnemyMgr.add(foe(false,i===3));
    if(i===3)for(const key of r.unitPool.stock.keys())r.unitPool.stock.set(key,0);r.elapsed=r.wave.duration;G.Expedition.tick(0);return {hp:r.squadHp,damage:r.squadDamage,offer:r.companion,battles:r.battlesCompleted};},i);
   await p.locator('#journey-loot-next').waitFor();assert.equal(result.battles,i);assert.ok(result.offer);assert.equal(await p.locator('#journey-claim').count(),1);if(i===1){assert.equal(result.damage.raw,13);assert.equal(result.damage.applied,10);assert.equal(result.hp,90);assert.equal(await p.locator('[data-squad-damage="10"]').count(),1);assert.equal(await p.evaluate(()=>G.Expedition.run.settlement.baseWage),3);}
   const count=await p.evaluate(()=>G.Squad.roster.length);await p.locator('#journey-claim').click();assert.equal(await p.evaluate(()=>G.Squad.roster.length),count+1);assert.equal(await p.evaluate(()=>G.Expedition.run.companionResolved),true);console.log('Early companion/health',i,result);
   if(i===3)await p.locator('[data-boss-emblem]').first().click();await p.locator('#journey-loot-next').click();for(let j=0;j<90;j++){if(await p.locator('#scr-item').isVisible())await p.locator('#item-cards .card').first().click();if(await p.locator('.journey-grid').isVisible()||await p.locator('#journey-shop-lock').isVisible())break;await p.waitForTimeout(50);}if(await p.locator('#journey-shop-lock').isVisible())await p.locator('.journey-shop-controls button').nth(2).click();await p.locator('.journey-grid').waitFor();
  }
  await p.evaluate(()=>{const r=G.Expedition.run;for(const root of r.unitPool.stock.keys())r.unitPool.stock.set(root,10);r.map[r.row+1][r.col].kind='shop';G.Expedition.choose(r.row+1,r.col);});const prices=await p.evaluate(()=>G.Expedition.offers.filter(Boolean).map(o=>[o.cost,G.ExpeditionQuality.quality(o.dex)]));assert.ok(prices.every(([cost,q])=>cost===q+1));await p.locator('.journey-shop-controls button').nth(2).click();await p.locator('.journey-grid').waitFor();
  const death=await p.evaluate(()=>{const r=G.Expedition.run;r.squadHp=1;r.map[r.row+1][r.col].kind='battle';G.Expedition.choose(r.row+1,r.col);G.Game.expeditionPause();G.EnemyMgr.clear();r.pendingSpawns=[];r.spawned=r.wave.count;const e=new G.Enemy({dex:7,hp:1e9,spd:0,dmg:0,xp:0,behavior:'chase'},r.captain.x+300,r.captain.y,{hp:1,spd:1,dmg:1});e.expedition=true;G.EnemyMgr.add(e);r.elapsed=r.wave.duration;G.Expedition.tick(0);return {hp:r.squadHp,phase:r.phase,state:G.Game.state,dead:r.captain.dead};});assert.deepEqual(death,{hp:0,phase:'squad-defeat',state:'over',dead:true});await p.locator('#scr-over:not(.hidden)').waitFor();assert.match(await p.locator('#over-title').innerText(),/小队生命耗尽/);assert.equal(await p.locator('#journey-loot-next:visible').count(),0);assert.deepEqual(errors,[]);console.log('Shop price and zero squad HP game-over passed.');await ctx.close();
 }
}finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

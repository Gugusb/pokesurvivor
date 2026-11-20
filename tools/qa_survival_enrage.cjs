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
  app.db.prepare("UPDATE users SET role='admin' WHERE uid=?").run(uid);
  const ctx=await browser.newContext({viewport:mobile?(landscape?{width:844,height:390}:{width:390,height:844}):{width:1360,height:900},isMobile:mobile,hasTouch:mobile});await ctx.addInitScript(l=>localStorage.setItem('ps.lang',l),lang);const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error'&&m.text().includes('[Game]')){errors.push(m.text());console.error(m.text());}});p.on('dialog',d=>d.accept());
  await p.goto(base+'/dev.html');await p.locator('#tap-start:not(.hidden),#scr-login:not(.hidden)').first().waitFor();if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#f-user').fill(name);await p.locator('#f-pass').fill(pass);await p.locator('#btn-auth').click();await p.locator('#scr-menu:not(.hidden)').waitFor();await p.locator('[data-go=play]').click();await p.locator('#journey-captain').waitFor();





  await p.locator('#journey-captain').selectOption('4');await p.locator('.journey-prep-actions button').last().click();await p.locator('.journey-prep-actions button').last().click();await p.locator('.journey-grid').waitFor();


  for(const scenario of [{kind:'elite',speed:1,day:1},{kind:'boss',speed:3,day:20},{kind:'boss',speed:1,day:60}]){
   const result=await p.evaluate(({kind,speed,day})=>{
    const r=G.Expedition.run;G.Expedition.showRoute();r.cycle=Math.ceil(day/20);r.map=G.ExpeditionRules.matrix(r.cycle);const row=(day-1)%20+1;r.row=row-1;r.map[row][r.col].kind=kind;G.Expedition.choose(row,r.col);G.Game.expeditionPause();G.CardPacks.normalize(G.DB.save);G.DB.save.cardPack.taken['speed:3']=1;G.Game.setSpeed(speed);r.captain.invuln=1e6;r.captain.xpNext=1e9;G.EnemyMgr.clear();G.Pickups.clear();r.pendingSpawns=[];r.spawned=r.wave.count;
    const e=new G.Enemy({dex:7,hp:1e9,spd:100,dmg:10,xp:0,behavior:'chase'},r.captain.x+400,r.captain.y,{hp:1,spd:1,dmg:1},kind==='boss');e.expedition=true;G.EnemyMgr.add(e);const base=e.spd;
    r.elapsed=r.wave.enrageAt;G.Expedition.tick(0);const first=e.spd/base;r.elapsed+=10;G.Expedition.tick(0);const second=e.spd/base;G.Expedition.tick(0);if(e.spd/base!==second)throw Error('compounded speed');G.Game.expeditionResume();G.Expedition.hud();const hud=document.getElementById('journey-status').textContent;G.Game.expeditionPause();
    r.elapsed=r.wave.duration;G.Expedition.tick(0);return {first,second,duration:r.wave.duration,bosses:r.captain.bosses,dead:r.bossDead,arceus:r.arceus,cashout:r.cashout,hud};
   },scenario);assert.ok(Math.abs(result.first-1.5)<1e-8);assert.ok(Math.abs(result.second-1.75)<1e-8);assert.equal(result.duration,scenario.kind==='elite'?60:90);assert.equal(result.dead,false);assert.match(result.hud,/激怒 2/);assert.match(await p.locator('.expedition-battle-result-title').innerText(),/成功生存/);
   await p.locator('#journey-loot-next').waitFor();const loot=await p.evaluate(()=>{const r=G.Expedition.run;return {wage:r.settlement.baseWage,items:Object.entries(r.loot).filter(([k])=>k.startsWith('item:')).reduce((n,[k,v])=>n+v,0),chests:r.loot.bossChest||0,emblems:r.bossEmblemChoices?.length||0,shop:r.freeShopPending};});assert.ok(loot.wage>0);assert.equal(loot.chests,0);if(scenario.kind==='elite')assert.equal(loot.items,2);else{assert.equal(loot.emblems,3);assert.equal(loot.shop,true);await p.locator('[data-boss-emblem]').first().click();}if(scenario.day===60){assert.equal(result.arceus,true);assert.equal(result.cashout,true);}
   console.log('Survival passed',scenario,result,loot);
   if(scenario.day!==60){await p.locator('#journey-loot-next').click();for(let i=0;i<80;i++){if(await p.locator('#scr-item').isVisible())await p.locator('#item-cards .card').first().click();if(await p.locator('.journey-grid').isVisible()||await p.locator('#journey-shop-lock').isVisible())break;await p.waitForTimeout(50);}if(await p.locator('#journey-shop-lock').isVisible())await p.locator('.journey-shop-controls button').nth(2).click();await p.locator('.journey-grid').waitFor();}
  }
  assert.deepEqual(errors,[]);await ctx.close();
 }
}finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

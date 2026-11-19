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





  await p.locator('#journey-captain').selectOption('4');await p.locator('.journey-prep-actions button').last().click();await p.locator('.journey-prep-actions button').last().click();await p.locator('.journey-grid').waitFor();
  for(const bossDay of [20,40,60]){
  await p.evaluate(bossDay=>{const r=G.Expedition.run;r.cycle=bossDay/20;r.map=G.ExpeditionRules.matrix(r.cycle);r.row=19;r.day=bossDay-1;r.col=3;G.Expedition.showRoute();G.Expedition.choose(20,3);G.Expedition.recordPickup({kind:'coin',value:500});G.Expedition.recordPickup({kind:'treasure',value:500});G.EnemyMgr.clear();r.pendingSpawns=[];r.spawned=1;const boss=new G.Enemy({dex:150,hp:1,spd:0,dmg:0,xp:r.captain.xpNext*3,behavior:'chase'},r.captain.x+50,r.captain.y,{hp:1,spd:1,dmg:1},true);boss.expedition=true;boss.lastAttacker=r.captain;G.EnemyMgr.add(boss);boss.die();G.EnemyMgr.clear();G.Expedition.tick(.01);},bossDay);
  await p.locator('#journey-loot-next').waitFor();assert.equal(await p.evaluate(()=>G.Expedition.run.settlement.inWaveDrops),0);assert.equal(await p.evaluate(()=>G.Expedition.run.loot.coin||G.Expedition.run.loot.treasure||0),0);assert.equal(await p.evaluate(()=>G.Pickups.all().some(o=>['coin','treasure'].includes(o.kind))),false);await p.locator('[data-boss-emblem]').first().click();await p.locator('#journey-loot-next').click();
  for(let i=0;i<15;i++){
    if(await p.locator('#scr-levelup:not(.hidden)').isVisible())await p.locator('#cards .card').first().click();
    else if(await p.locator('#scr-item:not(.hidden)').isVisible())await p.locator('#item-cards .card').first().click();
    else if(await p.locator('#scr-victory:not(.hidden)').isVisible())await p.locator('#victory-continue').click();
    else if(await p.locator('#journey-shop-lock').isVisible())break;
    else await p.waitForFunction(()=>['levelup','choice','journey'].includes(G.Game.state)||G.Expedition.phase==='shop',{},{timeout:5000});
  }
  await p.locator('#journey-shop-lock').waitFor();assert.equal(await p.evaluate(()=>G.Game.state),'journey');assert.equal(await p.evaluate(()=>G.Expedition.run.cycle),bossDay/20+1);
  if(bossDay===40)await p.evaluate(()=>G.Game.expeditionResume()); // Recover a legacy leaked playing state as well.
  await p.locator('.journey-squad-link').click();await p.locator('#squad-close').click();assert.equal(await p.evaluate(()=>G.Game.state),'journey');assert.equal(await p.locator('#journey-shop-lock').isVisible(),true);
  const before=await p.evaluate(()=>({day:G.Expedition.run.day,gold:G.Expedition.run.gold}));await p.locator('.journey-shop-controls button').nth(2).click();assert.deepEqual(await p.evaluate(()=>({day:G.Expedition.run.day,gold:G.Expedition.run.gold})),before);assert.equal(await p.locator('.journey-event.reachable:not(:disabled)').count(),3);
  await p.evaluate(()=>{const r=G.Expedition.run;r.map[1][r.col].kind='battle';G.Expedition.refreshScreen();});await p.locator('.journey-event.reachable[data-event=battle]').first().click();await p.waitForFunction(()=>G.Expedition.run.elapsed>.3,{},{timeout:5000});
  console.log('BOSS '+bossDay+' next battle running',await p.evaluate(()=>({phase:G.Expedition.phase,state:G.Game.state,elapsed:G.Expedition.run.elapsed})));
  }
  assert.deepEqual(errors,[]);await ctx.close();
 }
}finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

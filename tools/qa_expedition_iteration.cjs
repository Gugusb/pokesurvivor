/* Local source runtime, isolated accounts/SQLite and clearly marked battle fixtures. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{once}=require('node:events'),{randomUUID,randomBytes}=require('node:crypto');
const {createApp,hashPassword}=require('../server/server.cjs'),{fresh}=require('../server/domain.cjs'),{chromium}=require('./cache/browser-qa/node_modules/playwright');
(async()=>{const app=createApp({dbFile:':memory:',stunUrls:'none'});let browser;const errors=[],results=[];
try{
 app.server.listen(0,'127.0.0.1');await once(app.server,'listening');browser=await chromium.launch({channel:'msedge',headless:true});const base='http://127.0.0.1:'+app.server.address().port;
 for(const lang of ['zh','en','es'])for(const mobile of [false,true]){
  const uid=randomUUID(),name='Bonds'+randomBytes(4).toString('hex'),pass=randomBytes(16).toString('hex'),s=fresh(name);s.partner=s.starter=4;s.owned[4]={iv:Array(8).fill(20)};
  require('../server/domain.cjs').G.CardPacks.normalize(s);for(const k of ['specialize','link','breakthrough'])s.cardPack.taken['training:'+k]=1;
  for(const m of fs.readFileSync(path.join(__dirname,'../js/data/achievements.js'),'utf8').matchAll(/id:\s*['"]([^'"]+)['"]/g))s.ach[m[1]]=Date.now();
  app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,name,name.toLowerCase(),await hashPassword(pass),'unused',Date.now());app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(s));
  const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1360,height:900},isMobile:mobile,hasTouch:mobile});await ctx.addInitScript(l=>localStorage.setItem('ps.lang',l),lang);const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error'&&m.text().includes('[Game]')){errors.push(m.text());console.error(m.text());}});p.on('dialog',d=>d.accept());
  await p.goto(base+'/dev.html');await p.locator('#tap-start:not(.hidden),#scr-login:not(.hidden)').first().waitFor();if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#f-user').fill(name);await p.locator('#f-pass').fill(pass);await p.locator('#btn-auth').click();await p.locator('#scr-menu:not(.hidden)').waitFor();await p.locator('[data-go=play]').click();await p.locator('#journey-captain').waitFor();await p.locator('#journey-content .journey-actions button').last().click();await p.locator('#journey-content .journey-actions button').last().click();await p.locator('.journey-grid').waitFor();
  await p.evaluate(()=>{G.Dev.setEnabled(true);});await p.keyboard.press('F2');await p.locator('[data-dev=god]').click();


  await p.locator('#dev-close').click();
  const enter=async kind=>{await p.evaluate(kind=>{const r=G.Expedition.run;r.gold=20000;r.map[r.row+1][r.col].kind=kind;G.Expedition.showRoute();},kind);await p.locator('.journey-event.reachable[data-event="'+kind+'"]').first().click();};
  await enter('shop');await p.locator('[data-lock="0"]').click();const locked=await p.evaluate(()=>JSON.stringify(G.Expedition.offers[0]));
  const offers=await p.evaluate(()=>JSON.stringify(G.Expedition.offers));await p.locator('#journey-upgrade').click();assert.equal(await p.evaluate(()=>JSON.stringify(G.Expedition.offers)),offers);
  await p.locator('#journey-refresh').click();assert.equal(await p.evaluate(()=>JSON.stringify(G.Expedition.offers[0])),locked);
  assert.ok(await p.locator('.journey-product p,.journey-shop-move').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=14));
  await p.screenshot({path:path.join(__dirname,'cache/alpha8-shop-'+lang+'-'+mobile+'.png')});await p.locator('.journey-squad-link').click();
  assert.ok(await p.evaluate(()=>[...document.querySelectorAll('[data-bond]')].every(e=>G.SquadBonds.count('types',e.dataset.bond)>0)));
  assert.ok(await p.evaluate(()=>{const b=document.querySelector('.squad-box');return b.scrollWidth<=b.clientWidth+1;}));await p.screenshot({path:path.join(__dirname,'cache/alpha8-squad-'+lang+'-'+mobile+'.png')});await p.locator('#squad-close').click();await p.locator('.journey-shop-controls button').nth(2).click();
  await enter('training');assert.equal(await p.locator('[data-training]').count(),6);await p.screenshot({path:path.join(__dirname,'cache/alpha8-training-'+lang+'-'+mobile+'.png')});
  const gold=await p.evaluate(()=>G.Expedition.run.gold);await p.locator('[data-training="up"]').click();await p.locator('[data-training-choice="up"]').first().click();assert.ok(await p.evaluate(()=>G.Expedition.run.gold)<gold);await p.locator('.journey-grid').waitFor();
  await enter('battle');await p.waitForFunction(()=>G.Expedition.run.pendingSpawns.length>0);
  const warning=await p.evaluate(()=>{const w=G.Expedition.run.pendingSpawns[0];w.enemy.hp=w.enemy.maxHp=1e9;window.auditWarning=w;return {id:w.enemy.id,left:w.left};});assert.ok(warning.left>0&&warning.left<=2);
  assert.equal(await p.evaluate(id=>G.EnemyMgr.all().some(e=>e.id===id),warning.id),false);
  await p.waitForFunction(id=>G.EnemyMgr.all().some(e=>e.id===id),warning.id,{timeout:10000});assert.ok(await p.evaluate(()=>window.auditWarning.left<=0));
  const fire=await p.evaluate(()=>{const cap=G.Game.player;G.Squad.recover();for(let n=G.Squad.shopLevel;n<6;n++)G.Squad.upgrade();for(const q of [...G.Squad.roster])G.Squad.release(q);for(const dex of [5,6,37,38])G.Squad.recruit(dex,'ember');G.Squad.refresh();G.SquadBonds.setLayer('types','fire',0);G.EnemyMgr.clear();const e=new G.Enemy({dex:1,hp:1e7,spd:0,dmg:0,xp:0,behavior:'chase'},cap.x+60,cap.y,{hp:1,spd:1,dmg:1});G.EnemyMgr.add(e);G.EnemyMgr.rebuildGrid();let stops=0;const stop=G.Game.hitStop;G.Game.hitStop=ms=>{stops++;stop(ms);};const rng=Math.random;try{Math.random=()=>0;const p=G.Squad.deployed()[0];for(let i=0;i<2;i++)e.hurt(20,'#fff',1,0,0,null,p,{id:'ember',type:'fire',kind:'projectile'});}finally{Math.random=rng;G.Game.hitStop=stop;}return {tier:G.TypeBonds.state('fire').tier,stops,rows:G.ExpeditionDamage.snapshot()};});
  assert.equal(fire.tier,5);assert.ok(fire.stops>0);assert.ok(fire.rows.some(r=>r.type==='fire'&&r.damage>0));await p.waitForTimeout(250);await p.screenshot({path:path.join(__dirname,'cache/alpha8-damage-'+lang+'-'+mobile+'.png')});
  await p.evaluate(()=>{const r=G.Expedition.run;r.companion=1;r.elapsed=r.wave.duration;r.pendingSpawns=[];r.spawned=r.wave.count;G.EnemyMgr.clear();});await p.locator('#journey-loot-next').waitFor();assert.equal(await p.locator('#journey-loot-next').isEnabled(),true);
  await p.locator('#journey-loot-next').click();await p.locator('.journey-grid').waitFor();
  for(const kind of ["learn","replace","specialize","link","breakthrough"]){
    if(kind==="specialize"||kind==="breakthrough")await p.evaluate(()=>{const m=G.Game.player.moves[0];while(G.Moves.levelUp(m)){};});
    await enter("training");await p.locator("[data-training="+kind+"]").click();if(kind==="replace")await p.locator(".journey-training .btn").first().click();await p.locator("[data-training-choice="+kind+"]").first().click();await p.locator(".journey-grid").waitFor();
  }
  // End through the actual route control and verify the damage report survives settlement.
  await p.locator('#journey-content .journey-actions button').first().click();await p.locator('#scr-over:not(.hidden)').waitFor();assert.equal(await p.locator('#over-damage').isVisible(),true);assert.ok((await p.locator('#over-damage .expedition-damage-row').count())>=5);
  await p.screenshot({path:path.join(__dirname,'cache/alpha8-result-'+lang+'-'+mobile+'.png')});
  results.push({lang,mobile,shopLock:true,upgradeKeepsOffers:true,training:true,spawnWarning:true,fireExplosion:true,liveAndResultDamage:true,lootSkip:true});await ctx.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify(results));
}finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

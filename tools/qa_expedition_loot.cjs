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
  await p.evaluate(()=>{const E=G.Expedition,r=E.run;r.map[1][3].kind='battle';E.choose(1,3);G.Game.expeditionPause();r.trainerLevel=6;r.trainerXp=0;G.Squad.syncTrainer();for(const dex of [1,7,25,37,10])G.Squad.recruit(dex);r.gold=20;r.lockedGoldAtBattleStart=20;r.squadHp=73;r.captain.hp=r.captain.maxHp*.55;r.captain.xpMul=1.5;r.captain.gainXp(37);r.xpJarStored=20;r.xpJar=20;r.loot={xp:37,'item:leftovers':1,'item:quickclaw':1,'item:assaultvest':1,'item:shellbell':1,ticket:2};r.appeared=new Set([4]);G.ExpeditionDamage.beginBattle(1);G.Squad.actors().forEach((p,i)=>G.ExpeditionDamage.record(p,{type:p.mon.types[0],kind:'melee',id:'tackle'},(7-i)*1234));G.ExpeditionDamage.record(r.captain,{id:'typebond-fire',kind:'typebond',type:'fire'},1234);G.EnemyMgr.clear();for(let i=0;i<12;i++){const e=new G.Enemy({dex:1,hp:500,spd:0,dmg:1,xp:0,behavior:'chase'},1000+i*20,0,{hp:1,spd:1,dmg:1});e.expedition=true;G.EnemyMgr.add(e);}r.spawned=r.wave.count;r.pendingSpawns=[];r.elapsed=r.wave.duration;E.tick(0);});
  await p.locator('.battle-loot-layout').waitFor();assert.equal(await p.locator('#journey-content').evaluate(e=>e.scrollTop),0);
  assert.equal(await p.locator('.loot-outcome h2').textContent(),'成功生存');
  assert.equal(await p.locator('.loot-life').getAttribute('data-squad-damage'),'10');
  assert.equal(await p.locator('.loot-loss').textContent(),'−10');
  const earnings=await p.evaluate(()=>({xp:G.Expedition.run.pokemonXpGained,trainer:G.Expedition.run.settlement.xpGained,gold:G.Expedition.run.settlement.totalGoldGained}));
  assert.equal(earnings.xp,55.5);assert.equal(await p.locator('[data-earning=pokemon] .loot-earning-value').textContent(),'+'+earnings.xp);
  assert.equal(await p.locator('[data-earning=gold] .loot-earning-value').textContent(),'+'+earnings.gold);
  assert.ok((await p.locator('.loot-gold-formula').textContent()).includes('利息 2'));
  assert.equal(await p.locator('.loot-earnings-grid > article').count(),3);
  assert.equal(await p.locator('#journey-damage .expedition-damage-row').count(),6);
  assert.ok((await p.locator('.loot-companion-details .journey-tags').textContent()).length>0);
  assert.ok((await p.locator('.loot-mon-trait').textContent()).length>0);
  await p.setViewportSize({width:1440,height:900});
  const geometry=await p.locator('.battle-loot-layout').evaluate(e=>{const [a,b]=e.children;return {ratio:a.getBoundingClientRect().width/b.getBoundingClientRect().width,overflow:e.scrollWidth>e.clientWidth+1,itemCols:getComputedStyle(e.querySelector('.loot-items')).gridTemplateColumns.split(' ').length,scroll:e.parentElement.scrollTop,heights:[...e.firstChild.children].map(n=>Math.round(n.getBoundingClientRect().height))};});
  assert.ok(Math.abs(geometry.ratio-3.5)<.02,JSON.stringify(geometry));assert.equal(geometry.overflow,false);assert.equal(geometry.itemCols,3);
  await p.locator('#journey-content').evaluate(e=>e.scrollTop=0);assert.ok(await p.locator('.loot-outcome').evaluate(e=>e.getBoundingClientRect().top>=e.closest('.journey-box').getBoundingClientRect().top));await p.screenshot({path:'tools/cache/loot-report-desktop.png',animations:'disabled'});
  await p.locator('[data-damage-scope=run]').last().click();assert.equal(await p.locator('#journey-damage [data-damage-scope=run]').getAttribute('aria-pressed'),'true');await p.locator('#journey-damage [data-damage-fold]').click();assert.equal(await p.locator('#journey-damage .damage-body').isVisible(),false);await p.locator('#journey-damage [data-damage-fold]').click();
  await p.setViewportSize({width:390,height:844});await p.locator('#journey-content').evaluate(e=>e.scrollTop=0);
  assert.ok(await p.locator('#journey-content').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  await p.screenshot({path:'tools/cache/loot-report-mobile.png',animations:'disabled'});
  await p.locator('#journey-claim').click();assert.equal(await p.locator('.loot-received').textContent(),'✓ 已领取');
  await p.locator('.loot-footer button').first().click();await p.locator('#scr-squad:not(.hidden)').waitFor();await p.locator('#squad-close').click();await p.locator('.battle-loot-layout').waitFor();
  assert.equal(await p.locator('.loot-loss').textContent(),'−10');
  await p.evaluate(()=>{const E=G.Expedition,r=E.run;r.battleCleared=true;r.squadDamage={before:63,after:63,applied:0,normal:0,elite:0,boss:0,raw:0,cap:10};r.companion=null;r.companionResolved=false;r.loot={};r.bossEmblemChoices=['fire','water','grass'];r.bossEmblemClaimed=false;E.refreshScreen();});
  assert.equal(await p.locator('.loot-outcome h2').textContent(),'全歼敌人');assert.equal(await p.locator('#journey-loot-next').isDisabled(),true);assert.equal(await p.locator('.loot-no-loss').textContent(),'无损过关');
  await p.locator('[data-boss-emblem=fire]').click();assert.equal(await p.locator('#journey-loot-next').isEnabled(),true);
  await p.setViewportSize({width:1024,height:720});await p.locator('#journey-content').evaluate(e=>e.scrollTop=0);await p.screenshot({path:'tools/cache/loot-report-boss.png',animations:'disabled'});assert.ok(await p.locator('#journey-content').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  await p.locator('#journey-loot-next').click();await p.waitForFunction(()=>G.Expedition.phase==='route');assert.equal(await p.locator('#journey-content').evaluate(e=>e.classList.contains('battle-loot-box')),false);
  assert.deepEqual(errors,[]);console.log('Battle loot browser checks passed:',{geometry,earnings,rows:6,healthLoss:10,claimAndSquad:true,bossChoice:true,nextRoute:true});await ctx.close();
 }
}finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

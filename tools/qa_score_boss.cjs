/* Isolated real browser: new score UI, server ranking, and actual boss combat. */
const assert=require('node:assert/strict'),path=require('node:path');
const {once}=require('node:events'),{randomBytes,randomUUID}=require('node:crypto');
const {createApp,hashPassword}=require('../server/server.cjs'),{fresh}=require('../server/domain.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(__dirname,'cache/browser-qa/node_modules/playwright'));
(async()=>{
 const app=createApp({dbFile:':memory:',stunUrls:'none'}),errors=[],results=[],built=process.argv.includes('--built');let browser;
 try{
  const pass=randomBytes(24).toString('hex'),hash=await hashPassword(pass);
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
  browser=await chromium.launch({channel:'msedge',headless:true});
  for(const [lang,stars]of [['zh',1],['zh',8],['en',8],['es',8]]){
   const name='ScoreQA'+lang+stars,uid=randomUUID(),save=fresh(name);save.partner=133;save.ach.own1={at:1};
   save.owned[133]={iv:[1,1,1,1,1,1]};save.difficulty.selected=stars;
   for(let n=1;n<8;n++)save.difficulty.cleared[n]=true;
   app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,name,name.toLowerCase(),hash,'unused',Date.now());
   app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(save));
   const c=await browser.newContext({viewport:{width:390,height:844},locale:lang==='zh'?'zh-CN':lang==='es'?'es-ES':'en-US',isMobile:true,hasTouch:true});
   await c.addInitScript(lang=>{localStorage.setItem('ps.lang',lang);window.qaText=[];
    const fill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(t,...a){if(window.qaText.length>2000)window.qaText=[];window.qaText.push(String(t));return fill.call(this,t,...a);};},lang);
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base+(built?'/':'/dev.html'));
   await p.locator('#tap-start:not(.hidden),#scr-login:not(.hidden)').first().waitFor();if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();
   await p.locator('#f-user').fill(name);await p.locator('#f-pass').fill(pass);await p.locator('#btn-auth').click();try{await p.locator('#scr-menu:not(.hidden)').waitFor();}catch(e){console.log('Login diagnostics',{lang,stars,error:await p.locator('#login-err').textContent(),connection:await p.locator('#login-mode').textContent(),pageErrors:errors});throw e;}
   if(lang==='zh')assert.match(await p.locator('#difficulty-note').textContent(),/得分倍率/);
   await p.locator('[data-go="play"]').click();await p.locator('#scr-menu').waitFor({state:'hidden'});await p.keyboard.press('v');
   await p.waitForFunction(()=>window.qaText.some(x=>/预计得分|Estimated score|Puntuación estimada/.test(x)));
   await p.waitForTimeout(1700);
   await p.screenshot({path:path.join(__dirname,`cache/score-${built?'built':'source'}-${lang}-${stars}-hud.png`),animations:'disabled'});
   if(!built)assert.equal(await p.evaluate(()=>G.Game.runClean()),true);
   await p.keyboard.press('Escape');await p.locator('#btn-quit').click();await p.locator('#scr-over:not(.hidden)').waitFor();
   await p.locator('.run-score-result').waitFor();assert.doesNotMatch(await p.locator('#over-stats').textContent(),/调试|normal speed/);
   await p.waitForFunction(async()=>!!(await(await fetch('/api/ranking?board=survival')).json()).me?.score);
   const row=app.db.prepare('SELECT * FROM run_scores WHERE uid=?').get(uid);assert.equal(row.stars,stars);assert.ok(row.score>0);
   assert.equal(app.db.prepare('SELECT dirty FROM runs WHERE id=?').get(row.run).dirty,0);
   await p.screenshot({path:path.join(__dirname,`cache/score-${built?'built':'source'}-${lang}-${stars}-result.png`),animations:'disabled'});
   await p.locator('#btn-again').click();await p.locator('[data-go="rank"]').click();await p.locator('#rk-mode .gen-tab').nth(1).click();await p.locator('#rk-list .rk-row.mine').waitFor();
   assert.ok((await p.locator('#rk-list .rk-row.mine').textContent()).includes(stars+'★'));
   await p.setViewportSize({width:320,height:740});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   results.push({lang,stars,score:row.score,liveScore:true});await c.close();
  }
  if(!built){
   const c=await browser.newContext({viewport:{width:1280,height:960},locale:'zh-CN'}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
   await p.goto(base+'/dev.html');await p.locator('#tap-start:not(.hidden),#scr-login:not(.hidden)').first().waitFor();if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();
   await p.evaluate(()=>{G.DB.playAsGuest();G.DB.grant(6,'fixture');G.DB.save.partner=6;G.Flow.afterLogin();});await p.locator('[data-go="play"]').click();await p.waitForFunction(()=>G.Game.state==='playing');
   const combat=await p.evaluate(()=>{
    G.Game.debugMark();G.Spawner.update=()=>{};G.EnemyMgr.clear();G.Projectiles.clear();G.Weather.clear();G.World.isLiquid=()=>false;
    const pl=G.Game.player;pl.moves=[];pl.slots=[];pl.maxHp=pl.hp=1000;pl.ability=null;pl.item=null;
    const e=new G.Enemy({dex:150,hp:100000,dmg:10,spd:0,xp:0,behavior:'ranged',networkStats:true},pl.x+160,pl.y,{hp:1,dmg:1,spd:1},true);
    e.spawnTime=900;e.legend=true;G.EnemyMgr.add(e);G.EnemyMgr.rebuildGrid();e.hurt(1e9);const first=e.hp;
    for(let i=0;i<30;i++)e.hurt(1e9);const burst=e.hp;pl.invuln=pl.dashGuardT=0;pl.hurt(100,null,true,{kind:'contact',enemy:e});const leeched=e.hp;
    pl.invuln=1;pl.hurt(100,null,true,{kind:'ranged',enemy:e});const immune=e.hp;
    window.qaBoss=e;return {max:e.maxHp,first,burst,leeched,immune,fury:e.ai.fury,resistance:e.bossGuard.resistance};
   });assert.equal(combat.first,32000);assert.equal(combat.burst,combat.first);assert.ok(combat.leeched>combat.burst);assert.equal(combat.immune,combat.leeched);assert.equal(combat.fury,true);
   await p.waitForTimeout(150);await p.screenshot({path:path.join(__dirname,'cache/score-boss-fury-source.png'),animations:'disabled'});
   await p.evaluate(()=>{
    const pl=G.Game.player;
    for(const kind of ['normal','elite','boss','rift']){
      const e=new G.Enemy({dex:1,hp:1,dmg:0,spd:0,xp:0,behavior:'ranged',networkStats:true},pl.x+250,pl.y,{hp:1,dmg:1,spd:1},kind==='boss'||kind==='rift');
      if(kind==='elite')e.makeElite();if(kind==='rift')e.legend=true;
      G.EnemyMgr.add(e);e.hurt(1e6,'#fff',0,0,0,null,pl);
    }
   });
   await p.waitForFunction(()=>{const c=G.Game.scoreCounts();return c.normal===1&&c.elite===1&&c.boss===1&&c.rift===1;});
   assert.equal(await p.evaluate(()=>G.Game.runScore().kills),226);
   const counters=await p.evaluate(()=>{
    const before=G.Game.scoreCounts();G.Events.debugStart('gold');G.Events.update(31,G.Game.everyone(),G.Game.st.time);G.Events.update(31,G.Game.everyone(),G.Game.st.time);
    return {before,after:G.Game.scoreCounts()};
   });assert.equal(counters.after.events,counters.before.events+1);results.push({combat,counters});await c.close();
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,built,results,pageErrors:0},null,2));
 }finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

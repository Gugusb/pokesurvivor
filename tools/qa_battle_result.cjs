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


  for(const scenario of [{cleared:false,speed:1},{cleared:true,speed:3}]){
    const start=await p.evaluate(({cleared,speed})=>{
      const r=G.Expedition.run,row=r.row+1,col=r.col;r.map[row][col].kind='battle';G.Expedition.choose(row,col);G.CardPacks.normalize(G.DB.save);G.DB.save.cardPack.taken['speed:3']=1;if(!G.Game.setSpeed(speed))throw Error('speed');
      G.EnemyMgr.clear();G.Pickups.clear();G.Projectiles.clear();G.Combat.clearFields();r.spawned=r.wave.count;r.pendingSpawns=[];
      if(!cleared){const e=new G.Enemy({dex:7,hp:1e9,spd:0,dmg:0,xp:0,behavior:'chase'},r.captain.x+400,r.captain.y,{hp:1,spd:1,dmg:1});e.expedition=true;G.EnemyMgr.add(e);r.elapsed=r.wave.duration;}
      let removedAt=null;const stamp=performance.now();G.Expedition.tick(.001);const banner=document.getElementById('expedition-battle-result');if(!banner)throw Error('missing banner');
      window.resultProbe={stamp,elapsed:r.elapsed,seenPhase:G.Expedition.phase};new MutationObserver((_,o)=>{if(!document.contains(banner)){window.resultProbe.removedAt=performance.now();o.disconnect();}}).observe(document.body,{childList:true});
      return {stamp};
    },scenario);
    const banner=p.locator('#expedition-battle-result');await banner.waitFor();assert.equal(await banner.locator('strong').innerText(),scenario.cleared?'全灭敌人':'时间结束');assert.equal(await p.locator('#journey-loot-next').isVisible(),false);
    await p.keyboard.press('t');await p.keyboard.press('Escape');assert.equal(await p.locator('#scr-squad').isVisible(),false);
    const checkpoint=await p.evaluate(()=>({ms:performance.now()-resultProbe.stamp,phase:G.Expedition.phase,elapsed:G.Expedition.run.elapsed,initial:resultProbe.elapsed}));assert.ok(checkpoint.ms<1500);assert.equal(checkpoint.phase,'battle-result');assert.equal(checkpoint.elapsed,checkpoint.initial);
    await p.screenshot({path:'tools/cache/battle-result-'+scenario.speed+'x.png',animations:'disabled'});
    await p.locator('#journey-loot-next').waitFor();const duration=await p.evaluate(()=>resultProbe.removedAt-resultProbe.stamp);assert.ok(duration>=1500&&duration<2300,'presentation duration '+duration);assert.equal(await banner.count(),0);
    await p.locator('#journey-loot-next').click();
    await p.waitForFunction(()=>G.Expedition.phase==='route'||document.querySelector('#scr-item:not(.hidden)'));
    if(await p.locator('#scr-item').isVisible())await p.locator('#item-cards .card').first().click();await p.locator('.journey-grid').waitFor();assert.equal(await p.evaluate(()=>G.Expedition.phase),'route');
    console.log(scenario.cleared?'All enemies defeated':'Time up',scenario.speed+'x',duration.toFixed(1)+' ms; loot and route passed.');
  }
  await p.goto(base+'/');await p.locator('#tap-start:not(.hidden),#scr-menu:not(.hidden)').first().waitFor();if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#scr-menu:not(.hidden)').waitFor();assert.equal(await p.evaluate(()=>typeof window.G),'undefined');await p.locator('[data-go=play]').click();await p.locator('#journey-captain').waitFor();console.log('Standard build startup and private runtime passed.');
  assert.deepEqual(errors,[]);await ctx.close();
 }
}finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

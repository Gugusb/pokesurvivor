/* Isolated Z gameplay/visual QA. Test accounts and saves never reach production. */
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{once}=require('node:events'),{randomBytes,randomUUID}=require('node:crypto');
const {createApp,hashPassword}=require('../server/server.cjs'),{fresh}=require('../server/domain.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(__dirname,'cache/browser-qa/node_modules/playwright'));
const CASES=['ember','tackle','ice-beam','fire-spin','thunderbolt','quick-attack','rock-slide','razor-leaf','heat-wave','giga-drain','spikes','will-o-wisp','toxic','flamethrower'];
(async()=>{
  const app=createApp({dbFile:':memory:',stunUrls:'none'}),errors=[],results=[],out=path.join(__dirname,'cache');let browser;
  try{
    const pass=randomBytes(24).toString('hex'),uid=randomUUID(),save=fresh('ZBrowserFixture');save.partner=6;save.owned[6]={at:Date.now(),from:'fixture',iv:[20,20,20]};
    app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,'ZBrowserFixture','zbrowserfixture',await hashPassword(pass),'unused',Date.now());
    app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(save));
    fs.mkdirSync(out,{recursive:true});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
    const base='http://127.0.0.1:'+app.server.address().port;
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge',args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
    const context=await browser.newContext({viewport:{width:1440,height:960},locale:'zh-CN'});
    await context.addInitScript(()=>localStorage.setItem('ps.dev.enabled','true'));
    const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/dev.html');
    await p.waitForFunction(()=>!document.getElementById('tap-start').classList.contains('hidden')||!document.getElementById('scr-login').classList.contains('hidden'));
    if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();
    await p.evaluate(()=>{G.DB.playAsGuest();G.DB.grant(6,'qa');G.DB.save.partner=6;G.Flow.afterLogin();});
    await p.locator('[data-go="play"]').click();await p.waitForFunction(()=>G.Game.state==='playing');
    await p.evaluate(()=>{G.Spawner.update=()=>{};G.Events.update=()=>{};G.Weather.clear();});
    for(const id of process.argv.includes('--built-only')?[]:CASES){
      await p.keyboard.press('F2');await p.locator('#dev-z-move').selectOption(id);await p.locator('[data-dev="z-prepare"]').click();await p.locator('#dev-close').click();
      await p.evaluate(()=>{
        G.EnemyMgr.clear();G.Projectiles.clear();const p=G.Game.player;p.hp=p.maxHp=1000000;p.invuln=100;p.x=window.qaOrigin?.x??p.x;p.y=window.qaOrigin?.y??p.y;
        window.qaOrigin={x:p.x,y:p.y};
        const e=new G.Enemy({dex:1,hp:100000000,spd:0,dmg:0,xp:0,behavior:'melee'},p.x+100,p.y,{hp:1,spd:1,dmg:1},true);
        e.types=[];G.EnemyMgr.add(e);G.EnemyMgr.rebuildGrid();window.qaBefore=p.dmgDealt;
      });
      await p.keyboard.press('z');await p.waitForFunction(()=>G.Game.player.zState.phase==='choose');
      await p.keyboard.press('1');await p.waitForFunction(()=>G.Game.player.zState.phase==='cast');
      const state=await p.evaluate(()=>({kind:G.Game.player.zState.casts[0].m.kind,duration:G.Game.player.zState.casts[0].duration,charges:G.Game.player.zState.charges}));
      assert.equal(state.charges,0);
      if(state.duration>1)await p.waitForFunction(()=>G.Game.player.zState.elapsed>.25);
      await p.screenshot({path:path.join(out,'z-v0.34.1-'+state.kind+'.png')});
      await p.waitForFunction(()=>G.Game.player.zState.phase==='cooldown');
      const end=await p.evaluate(()=>{
        const p=G.Game.player;p.invuln=0;
        const hp=p.hp,hit=p.hurt(1,null,true);
        return {damage:p.dmgDealt-window.qaBefore,casts:p.zState.casts.length,cooldown:p.zState.cooldown,guard:p.zState.guard,busy:G.ZMoves.busy(p),hit,unchangedHp:p.hp===hp,speed:p.spd,baseSpeed:p.baseSpd};
      });
      assert.ok(end.damage>0,id);assert.equal(end.casts,0);assert.ok(end.cooldown>0);
      assert.ok(end.guard>1.5&&end.guard<=1.8,id);assert.equal(end.busy,false);assert.equal(end.hit,false);assert.equal(end.unchangedHp,true);assert.ok(end.speed>end.baseSpeed*.9,id);
      await p.keyboard.press('e');await p.locator('#scr-backpack:not(.hidden)').waitFor();
      const paused=await p.evaluate(()=>G.Game.player.zState.guard);await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>G.Game.player.zState.guard),paused);
      await p.keyboard.press('e');await p.locator('#scr-backpack').waitFor({state:'hidden'});
      await p.waitForFunction(()=>G.Game.player.zState.guard===0);
      const expired=await p.evaluate(()=>{const p=G.Game.player;p.invuln=0;const hp=p.hp,hit=p.hurt(1,null,true);return {hit,damaged:p.hp<hp,guard:p.zState.guard};});
      assert.equal(expired.guard,0);assert.equal(expired.hit,true);assert.equal(expired.damaged,true);
      results.push({id,...state,damage:Math.round(end.damage),recoveryGuard:true,movementUnlocked:true,pausePreservesGuard:true,damageAfterExpiry:true});
      process.stdout.write('Z browser: '+state.kind+' passed\n');
    }
    await context.close();
    const built=await browser.newContext({viewport:{width:1440,height:960},locale:'zh-CN'});
    await built.addInitScript(()=>{
      localStorage.setItem('ps.dev.enabled','true');window.qaZTexts=[];
      const fill=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(t,...args){if(t==='Z…'||/^\d+s$/.test(t))window.qaZTexts.push(t);return fill.call(this,t,...args);};
    });
    const b=await built.newPage();b.on('pageerror',e=>errors.push(e.message));await b.goto(base+'/');
    await b.waitForFunction(()=>!document.getElementById('tap-start').classList.contains('hidden')||!document.getElementById('scr-login').classList.contains('hidden'));
    if(await b.locator('#tap-start').isVisible())await b.locator('#tap-start').click();
    await b.locator('#f-user').fill('ZBrowserFixture');await b.locator('#f-pass').fill(pass);await b.locator('#btn-auth').click();
    await b.locator('#scr-menu:not(.hidden)').waitFor();await b.locator('[data-go="play"]').click();await b.locator('#dev-launcher').waitFor();
    const builtCases=['ember','heat-wave','flamethrower','spikes','will-o-wisp','toxic'];
    for(const id of builtCases){
      await b.keyboard.press('F2');
      assert.equal(await b.locator('#dev-z-move option').count(),59);
      await b.locator('#dev-z-move').selectOption(id);await b.locator('[data-dev="z-prepare"]').click();await b.locator('[data-dev="z-enemies"]').click();
      await b.locator('#dev-close').click();await b.evaluate(()=>{window.qaZTexts=[];});
      await b.keyboard.press('z');await b.keyboard.press('1');await b.waitForFunction(()=>window.qaZTexts.includes('Z…'));
      await b.screenshot({path:path.join(out,'z-v0.34.1-built-'+id+'.png')});
      await b.waitForFunction(()=>window.qaZTexts.includes('5s'));process.stdout.write('Built Z browser: '+id+' passed\n');
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({tested:results,builtMoves:builtCases,pageErrors:errors.length,isolatedMemoryDatabase:true},null,2));
  }finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

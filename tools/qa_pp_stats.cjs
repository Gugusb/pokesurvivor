/* Browser QA uses only disposable accounts in an isolated in-memory server. */
const assert=require('node:assert/strict'),path=require('node:path'),{once}=require('node:events'),{randomBytes,randomUUID}=require('node:crypto');
const {createApp,hashPassword}=require('../server/server.cjs'),{fresh}=require('../server/domain.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(__dirname,'cache/browser-qa/node_modules/playwright'));
(async()=>{
 const app=createApp({dbFile:':memory:',stunUrls:'none'}),errors=[],results=[];let browser;
 try{
  const name='PPStatsFixture',password=randomBytes(24).toString('hex'),uid=randomUUID(),save=fresh(name);save.partner=6;
  for(const dex of [4,5,6])save.owned[dex]={at:1,iv:[3,17,31,21,13,19]};
  app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,name,name.toLowerCase(),await hashPassword(password),'unused',Date.now());
  app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(save));
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
  for(const built of (process.argv.includes('--source')?[false]:process.argv.includes('--built')?[true]:[false,true]))for(const lang of ['zh','en','es']){
   const ctx=await browser.newContext({viewport:{width:1280,height:900},locale:lang==='zh'?'zh-CN':lang});
   await ctx.addInitScript(lang=>{localStorage.setItem('ps.lang',lang);window.qaText=[];const f=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(t,...args){window.qaText.push(String(t));if(window.qaText.length>10000)window.qaText.splice(0,5000);return f.call(this,t,...args);};},lang);
   const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+(built?'/':'/dev.html'));
   await page.waitForFunction(()=>!document.getElementById('tap-start').classList.contains('hidden')||!document.getElementById('scr-login').classList.contains('hidden'));
   if(await page.locator('#tap-start').isVisible())await page.locator('#tap-start').click();
   await page.locator('#f-user').fill(name);await page.locator('#f-pass').fill(password);await page.locator('#btn-auth').click();await page.locator('#scr-menu:not(.hidden)').waitFor();
   await page.locator('[data-go="dex"]').click();await page.locator('#dex-grid [data-dex="6"]').click();
   await page.waitForFunction(()=>document.querySelectorAll('#dex-detail .stat').length===8);
   const detail=await page.locator('#dex-detail').textContent();for(const label of ({zh:['敏捷','耐力'],en:['Agility','Stamina'],es:['Agilidad base','Resistencia base']})[lang])assert.ok(detail.includes(label),label);
   assert.equal(await page.locator('#dex-detail .iv-value').count(),8);
   await page.setViewportSize({width:320,height:740});assert.ok(await page.locator('#dex-detail').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
   await page.locator('#dex-detail .stat').first().scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(__dirname,`cache/pp-${built?'built':'source'}-${lang}-dex-mobile.png`),animations:'disabled'});
   await page.setViewportSize({width:1280,height:900});await page.locator('#scr-dex [data-back]').first().click();await page.locator('[data-go="play"]').click();await page.locator('#scr-menu').waitFor({state:'hidden'});
   await page.waitForFunction(()=>window.qaText.some(t=>/^PP \d+\/\d+$/.test(t)));
   if(!built){
    const mechanics=await page.evaluate(()=>{
     G.Game.debugMark();G.Spawner.update=()=>{};G.Events.update=()=>{};G.EnemyMgr.clear();G.Projectiles.clear();
     const p=G.Game.player;p.ability=null;p.item=null;p.maxHp=p.hp=100000;p.invuln=1000;p.baseStamina=0;
     const a=G.Moves.instance('ember'),b=G.Moves.instance('tackle'),other=G.Moves.instance('water-gun');p.moves=[a,b,other];p.slots=[[a,b],[other]];p.active=0;
     const e=new G.Enemy({dex:143,hp:1e9,spd:0,dmg:0,xp:0,behavior:'ranged',range:10000,shotCd:10000},p.x+30,p.y,{hp:1,spd:1,dmg:1});e.update=()=>{};G.EnemyMgr.add(e);G.EnemyMgr.rebuildGrid();p.target=e;
     p.baseStamina=200;for(const m of p.moves)G.MovePP.state(p,m).current=0;G.MovePP.tick(p,1);const recovery={active:G.MovePP.state(p,a).current,inactive:G.MovePP.state(p,other).current,interval:p.ppInterval};p.baseStamina=0;for(const m of p.moves)G.MovePP.state(p,m).current=0;G.MovePP.state(p,other).current=G.MovePP.max(p,other);
     G.MovePP.state(p,a).current=0;G.MovePP.state(p,b).current=0;G.Combat.tick(0,p,0);const blocked=G.Projectiles.all().length===0;
     p.tempPP=2;G.Combat.tick(0,p,0);const reserve=p.tempPP===0&&G.Projectiles.all().length>0;
     G.ZMoves.grant(G.DB.save,'fire');G.ZMoves.equip(G.DB.save,p.ivDex||p.dex,'fire');G.ZMoves.init(p,G.DB.save);
     const armed=G.ZMoves.arm(p)&&G.ZMoves.choose(p,0);G.ZMoves.tick(p,1.6);
     const refilled=[a,b].every(m=>G.MovePP.state(p,m).current===G.MovePP.max(p,m));
     const cards=G.LevelUp.STATS.filter(s=>['atk','stamina','temppp'].includes(s.id)).map(s=>({...s,type:'stat',tag:'Mejora',color:'#80caae'}));
     G.RunUI.showLevelUp(p.level,cards,c=>c.apply(p));
     return {recovery,blocked,reserve,armed,refilled,gameState:G.Game.state,other:G.MovePP.state(p,other).current,ivs:G.DB.ivOf(6),agility:p.agility,interval:p.ppInterval};
    });
    assert.ok(Math.abs(mechanics.recovery.active-2.8)<1e-7);assert.ok(Math.abs(mechanics.recovery.inactive-6)<1e-7);assert.equal(mechanics.recovery.interval,.25);
    assert.ok(mechanics.blocked&&mechanics.reserve&&mechanics.armed&&mechanics.refilled,JSON.stringify(mechanics));assert.equal(mechanics.other,15);assert.equal(mechanics.ivs.length,8);
    const cardText=await page.locator('#cards').textContent();assert.ok(cardText.includes(({zh:'储能果',en:'Reserve Berry',es:'Baya Reserva'})[lang]));
    await page.screenshot({path:path.join(__dirname,`cache/pp-source-${lang}-berries.png`),animations:'disabled'});await page.locator('#cards .card').last().click();
    assert.equal(await page.evaluate(()=>G.Game.player.tempPP),20);
    if(lang==='zh'){
     const arenas=await page.evaluate(()=>{
      const p=G.Game.player,reports=[];
      for(const type of ['fire','judgment']){
       G.ZMoves.cancel(p);G.Judgment.reset();G.Rift.reset();G.EnemyMgr.clear();
       if(type==='fire')G.Rift.debugArena('fire');else{G.Judgment.debugStart();G.Judgment.cineTick(10.2);}
       const arena=G.World.arena,origin=[p.x,p.y],m=G.Moves.instance('quick-attack');p.moves=[m];p.slots=[[m]];p.active=0;
       G.EnemyMgr.clear();const e=new G.Enemy({dex:143,hp:1e9,spd:0,dmg:0,xp:0,behavior:'ranged'},p.x+100,p.y,{hp:1,spd:1,dmg:1});e.boss=true;e.update=()=>{};G.EnemyMgr.add(e);
       G.ZMoves.grant(G.DB.save,m.type);G.ZMoves.equip(G.DB.save,p.ivDex||p.dex,m.type);p.zState=null;G.ZMoves.init(p,G.DB.save);
       const release=G.ZMoves.arm(p)&&G.ZMoves.choose(p,0);let inside=true;for(let n=0;n<51;n++){G.ZMoves.tick(p,.01);inside&&=G.World.arenaContains(p.x,p.y,p.r);}
       reports.push({type:arena.type,release,inside,free:G.World.isFree(p.x,p.y,p.r),distance:Math.hypot(p.x-origin[0],p.y-origin[1]),range:m.radius*10});
      }
      G.Game.flash('#fff',0);G.FX.clear();G.Judgment.reset();G.Rift.reset();G.World.setArena(null);G.EnemyMgr.clear();p.x=p.y=0;G.Camera.x=0;G.Camera.y=0;return reports;
     });
     for(const a of arenas){assert.ok(a.release&&a.inside&&a.free,JSON.stringify(a));assert.ok(a.distance<a.range);}results.push({arenas});
    }
    results.push({lang,mechanics});
   }
   await page.evaluate(()=>{window.qaText=[];});await page.waitForFunction(()=>window.qaText.some(t=>/^PP \d+\/\d+$/.test(t)));
   await page.screenshot({path:path.join(__dirname,`cache/pp-${built?'built':'source'}-${lang}-gameplay.png`),animations:'disabled'});
   await page.setViewportSize({width:320,height:740});await page.screenshot({path:path.join(__dirname,`cache/pp-${built?'built':'source'}-${lang}-hud-mobile.png`),animations:'disabled'});
   await ctx.close();
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,sourceAndBuilt:!process.argv.includes('--source'),languages:3,results,pageErrors:errors.length},null,2));
 }finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

/* Local source runtime, isolated accounts/SQLite and clearly marked battle fixtures. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{once}=require('node:events'),{randomUUID,randomBytes}=require('node:crypto');
const {createApp,hashPassword}=require('../server/server.cjs'),{fresh}=require('../server/domain.cjs'),{chromium}=require('./cache/browser-qa/node_modules/playwright');
(async()=>{const app=createApp({dbFile:':memory:',stunUrls:'none'});let browser;const errors=[],results=[];
try{
 app.server.listen(0,'127.0.0.1');await once(app.server,'listening');browser=await chromium.launch({channel:'msedge',headless:true});const base='http://127.0.0.1:'+app.server.address().port;
 for(const lang of ['zh','en','es'])for(const mobile of [false,true]){
  const uid=randomUUID(),name='Bonds'+randomBytes(4).toString('hex'),pass=randomBytes(16).toString('hex'),s=fresh(name);s.partner=s.starter=4;s.owned[4]={iv:Array(8).fill(20)};
  for(const m of fs.readFileSync(path.join(__dirname,'../js/data/achievements.js'),'utf8').matchAll(/id:\s*['"]([^'"]+)['"]/g))s.ach[m[1]]=Date.now();
  app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,name,name.toLowerCase(),await hashPassword(pass),'unused',Date.now());app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(s));
  const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1360,height:900},isMobile:mobile,hasTouch:mobile});await ctx.addInitScript(l=>localStorage.setItem('ps.lang',l),lang);const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error'&&m.text().includes('[Game]')){errors.push(m.text());console.error(m.text());}});p.on('dialog',d=>d.accept());
  await p.goto(base+'/dev.html');await p.locator('#tap-start:not(.hidden),#scr-login:not(.hidden)').first().waitFor();if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#f-user').fill(name);await p.locator('#f-pass').fill(pass);await p.locator('#btn-auth').click();await p.locator('#scr-menu:not(.hidden)').waitFor();await p.locator('[data-go=play]').click();await p.locator('#journey-captain').waitFor();await p.locator('#journey-content .journey-actions button').last().click();await p.locator('#journey-content .journey-actions button').last().click();await p.locator('.journey-grid').waitFor();
  await p.evaluate(()=>{G.Dev.setEnabled(true);});await p.keyboard.press('F2');await p.locator('[data-dev=god]').click();

  await p.locator('#dev-bond-category').selectOption('types');
  for(const type of ['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy']){
   await p.locator('#dev-bond-kind').selectOption(type);await p.locator('#dev-bond-layer').fill('100');await p.locator('[data-dev=bond-layer]').click();await p.locator('[data-dev=bond-party]').click();
   assert.ok(await p.evaluate(t=>G.TypeBonds.state(t).tier===5,type));await p.locator('#dev-close').click();
   if(await p.evaluate(()=>G.Expedition.phase==='route')){await p.evaluate(()=>{const r=G.Expedition.run;r.map[r.row+1][r.col].kind='battle';G.Expedition.showRoute();});await p.locator('.journey-event.reachable[data-event="battle"]').first().click();}
   const result=await p.evaluate(type=>{G.TypeBonds.beginStage();G.Combat.clearFields();G.EnemyMgr.clear();G.Projectiles.clear();const cap=G.Game.player;const actor=G.Squad.actors().find(a=>a.mon.types.includes(type));
    const e=new G.Enemy({dex:1,hp:1e8,spd:0,dmg:0,xp:0,behavior:'chase'},cap.x+40,cap.y,{hp:1,spd:1,dmg:1});e.touchCd=1000;G.EnemyMgr.add(e);G.EnemyMgr.rebuildGrid();const before=e.hp;e.hurt(20,'#fff',1,0,1,null,actor,{id:actor.moves[0].id,type,kind:'projectile',typeCastId:G.TypeBonds.cast(actor,actor.moves[0])});
    return {type,tier:G.TypeBonds.state(type).tier,level:G.TypeBonds.state(type).level,damage:before-e.hp};},type);
   assert.equal(result.level,100);assert.ok(result.damage>0);await p.waitForTimeout(100);await p.keyboard.press('KeyT');const row=p.locator('[data-bond="'+type+'"]');assert.ok((await row.locator('.squad-bond-effect').innerText()).length>15);assert.equal(await row.locator('details').count(),1);await row.locator('summary').click();assert.ok((await row.innerText()).includes('300'));
   if(type==='fire'){if(mobile)assert.ok(await p.evaluate(()=>{const b=document.querySelector('.squad-box');return b.scrollWidth<=b.clientWidth+1;}));await p.screenshot({path:path.join(__dirname,'cache/type-bonds-'+lang+'-'+(mobile?'phone':'pc')+'.png')});}
   await p.keyboard.press('KeyT');await p.keyboard.press('F2');
  }
  results.push({lang,mobile,types:18,debugStacks:true,damagePipeline:true,growthPreview:true});await ctx.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify(results));
}finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

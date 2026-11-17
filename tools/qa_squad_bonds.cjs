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
  for(const kind of ['projectile','melee','beam','orbit','chain']){
   await p.locator('#dev-bond-kind').selectOption(kind);await p.locator('#dev-bond-layer').fill('4');await p.locator('[data-dev=bond-layer]').click();await p.locator('[data-dev=bond-party]').click();assert.equal(await p.evaluate(k=>G.SquadBonds.state(k).tier,kind),6);assert.equal(await p.evaluate(k=>G.SquadBonds.layer('skill',k),kind),4);await p.locator('#dev-close').click();
   if(await p.evaluate(()=>G.Expedition.phase==='route')){await p.evaluate(()=>{const r=G.Expedition.run;r.map[r.row+1][r.col].kind='battle';G.Expedition.showRoute();});await p.locator('.journey-event.reachable[data-event="battle"]').first().click();}
   await p.evaluate(kind=>{
    G.Combat.clearFields();G.Projectiles.clear();G.EnemyMgr.clear();const c=G.Game.player;c.x=c.y=0;G.Squad.recover();for(const m of c.moves)m.t=1000;
    for(const actor of G.Squad.deployed()){actor.dmgDealt=0;for(const m of actor.moves)m.t=0;}
    window.bondShots=[];window.originalSpawn||=G.Projectiles.spawn;G.Projectiles.spawn=function(o){const shot=window.originalSpawn(o);window.bondShots.push(shot);return shot;};
    G.World.collide=()=>false;G.World.isFree=()=>true;G.World.isWall=()=>false;G.World.projectileBlock=()=>null;G.World.propsInCircle=()=>[];
    const r=G.Expedition.run;r.elapsed=0;r.spawned=r.wave.count;
    for(let i=0;i<14;i++){const e=new G.Enemy({dex:1,hp:1e8,spd:0,dmg:0,xp:0,behavior:'chase'},35+i*15,(i%3-1)*12,{hp:1,spd:1,dmg:1});e.touchCd=1000;G.EnemyMgr.add(e);}G.EnemyMgr.rebuildGrid();window.bondActors=G.Squad.deployed();window.checkedKind=kind;
   },kind);await p.waitForTimeout(1600);
   const actual=await p.evaluate(()=>({kind:window.checkedKind,count:G.SquadBonds.state(window.checkedKind).count,layers:G.SquadBonds.layer('skill',window.checkedKind),damage:window.bondActors.reduce((n,a)=>n+a.dmgDealt,0),spent:window.bondActors.some(a=>G.MovePP.state(a,a.moves[0]).current<G.MovePP.max(a,a.moves[0])),unstable:window.bondShots.some(s=>s.bondUnstable&&s.bondProcs>0),fields:G.Combat.fieldCount,slow:G.EnemyMgr.all().some(e=>e.slow>0)}));
   assert.ok(actual.count>=6,JSON.stringify(actual));assert.ok(actual.damage>0,JSON.stringify(actual));assert.ok(actual.spent,JSON.stringify(actual));if(kind==='projectile')assert.ok(actual.unstable,JSON.stringify(actual));if(kind==='beam')assert.ok(actual.fields>0,JSON.stringify(actual));if(kind==='orbit')assert.ok(actual.slow,JSON.stringify(actual));await p.screenshot({animations:'disabled',path:path.join(__dirname,`cache/bond-${kind}-${lang}-${mobile?'phone':'pc'}.png`)});
   await p.keyboard.press('KeyT');await p.locator('.squad-bond-tab').nth(2).click();const row=p.locator('[data-bond="'+kind+'"]');assert.ok(await row.locator('.squad-bond-stack').innerText().then(t=>t.includes('4')));assert.ok(await row.locator('.squad-bond-effect').innerText().then(t=>t.length>15));if(mobile){assert.ok(await p.evaluate(()=>{const box=document.querySelector('.squad-box');return box.scrollWidth<=box.clientWidth+1;}));}await p.screenshot({animations:'disabled',path:path.join(__dirname,`cache/bond-ui-${kind}-${lang}-${mobile?'phone':'pc'}.png`)});await p.keyboard.press('KeyT');await p.keyboard.press('F2');
  }
  results.push({lang,mobile,kinds:5,realBattle:true,debugStacks:true,dedicatedTeamButton:true,layerAndThresholdUI:true});await ctx.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify(results));
}finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

/* Disposable server and browser contexts: six-stat display and real typed combat. */
const assert=require('node:assert/strict'),path=require('node:path'),{once}=require('node:events'),{randomBytes,randomUUID}=require('node:crypto');
const {createApp,hashPassword}=require('../server/server.cjs'),{fresh}=require('../server/domain.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(__dirname,'cache/browser-qa/node_modules/playwright'));
(async()=>{const app=createApp({dbFile:':memory:',stunUrls:'none'}),errors=[],results=[];let browser;
try{
 const name='TypedStatsQA',password=randomBytes(24).toString('hex'),uid=randomUUID(),s=fresh(name);s.partner=6;
 for(const dex of [4,5,6,65,68])s.owned[dex]={at:1,from:'fixture',iv:[3,17,31]};
 app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,name,name.toLowerCase(),await hashPassword(password),'unused',Date.now());
 app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(s));
 app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
 browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
 for(const built of [false,true]){
  const c=await browser.newContext({viewport:{width:1280,height:960},locale:'zh-CN'});await c.addInitScript(()=>{window.qaText=[];const f=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(t,...a){if(window.qaText.length>2000)window.qaText=[];window.qaText.push(String(t));return f.call(this,t,...a);};});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base+(built?'/':'/dev.html'));
  await p.waitForFunction(()=>!document.getElementById('tap-start').classList.contains('hidden')||!document.getElementById('scr-login').classList.contains('hidden'));if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();
  await p.locator('#f-user').fill(name);await p.locator('#f-pass').fill(password);await p.locator('#btn-auth').click();await p.locator('#scr-menu:not(.hidden)').waitFor();
  await p.locator('[data-go="dex"]').click();await p.locator('#dex-grid [data-dex="6"]').click();await p.getByText('物攻',{exact:true}).waitFor();
  assert.equal(await p.locator('#dex-detail .stat').count(),6);for(const label of ['物攻','特攻','物防','特防'])assert.ok((await p.locator('#dex-detail').textContent()).includes(label));
  await p.setViewportSize({width:320,height:740});assert.ok(await p.locator('#dex-detail').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  await p.locator('#dex-detail .stat').first().scrollIntoViewIfNeeded();await p.screenshot({path:path.join(__dirname,'cache/battle-stats-'+(built?'built':'source')+'-mobile.png'),animations:'disabled'});await p.setViewportSize({width:1280,height:960});
  await p.locator('#scr-dex [data-back]').first().click();await p.locator('[data-go="play"]').click();await p.locator('#scr-menu').waitFor({state:'hidden'});await p.waitForFunction(()=>window.qaText.some(t=>t.includes('特殊')));
  if(!built){
   const result=await p.evaluate(()=>{
    G.Game.debugMark();G.Spawner.update=()=>{};G.EnemyMgr.clear();G.Projectiles.clear();G.Weather.clear();G.World.propsInCircle=()=>[];G.World.projectileBlock=()=>null;G.World.damageProp=()=>{};
    const p=G.Game.player;p.ability=null;p.item=null;p.critChance=0;p.baseAtk=2;p.baseSpa=5;p.atkMul=1;p.damageBonus=0;p.baseDefense=2;p.baseSpDef=4;p.dmgReduce=.2;p.maxHp=p.hp=5000;p.invuln=0;for(const b of Object.values(p.buffs))b.n=0;
    const e=new G.Enemy({dex:143,hp:500000,spd:0,dmg:0,xp:0,behavior:'ranged',range:10000,shotCd:10000},p.x+80,p.y,{hp:1,spd:1,dmg:1});e.types=[];e.defense=2;e.spdef=4;G.EnemyMgr.add(e);G.EnemyMgr.rebuildGrid();p.target=e;p.aim=0;
    const attacks=[];
    for(const id of ['rock-throw','ember']){G.Projectiles.clear();const m=G.Moves.instance(id);p.moves=[m];p.slots=[[m]];p.active=0;G.Combat.tick(0,p,0);const shot=G.Projectiles.all()[0],before=e.hp;
     const metadata={id,category:m.damageClass,shotCategory:shot.damageClass,raw:shot.dmg,expectedRaw:m.dmg*p.attackFor(m)};
     for(let n=0;n<45;n++){G.Projectiles.update(.01,p,G.EnemyMgr.all());G.Combat.resolve(.01,p,0);}attacks.push({...metadata,damage:before-e.hp,expectedDamage:Math.round(metadata.raw/(m.damageClass==='special'?4:2))});
    }
    p.moves=[];p.slots=[];const incoming=[];for(const kind of ['contact','ranged']){p.invuln=0;const before=p.hp;p.hurt(100,null,false,{kind});incoming.push({kind,damage:before-p.hp});}
    return {attacks,incoming,ivs:G.DB.ivOf(6).slice()};
   });
   for(const a of result.attacks){assert.equal(a.category,a.shotCategory);assert.equal(a.raw,a.expectedRaw);assert.equal(a.damage,a.expectedDamage);assert.ok(a.damage>0);}assert.deepEqual(result.incoming,[{kind:'contact',damage:40},{kind:'ranged',damage:20}]);assert.deepEqual(result.ivs,[3,17,31,17,17,17]);results.push(result);
  }
  await p.screenshot({path:path.join(__dirname,'cache/battle-stats-'+(built?'built':'source')+'-gameplay.png'),animations:'disabled'});await c.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,sourceAndBuiltSixStats:true,mobile320:true,results,pageErrors:errors.length},null,2));
}finally{await browser?.close();await app.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

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


  for(const scenario of [{day:1,kind:'battle',speed:1},{day:100,kind:'battle',speed:3},{day:100,kind:'elite',speed:1},{day:20,kind:'boss',speed:3}]){
   const result=await p.evaluate(({day,kind,speed})=>{
    G.Expedition.showRoute();const r=G.Expedition.run;r.cycle=Math.ceil(day/20);r.map=G.ExpeditionRules.matrix(r.cycle);const row=(day-1)%20+1;r.row=row-1;r.map[row][r.col].kind=kind;G.Expedition.choose(row,r.col);G.Game.expeditionPause();G.CardPacks.normalize(G.DB.save);G.DB.save.cardPack.taken['speed:3']=1;G.Game.setSpeed(speed);
    const step=speed/30,stop=kind==='boss'?2.2:r.wave.spawnDuration+2.2;while(r.elapsed<stop)G.Expedition.tick(step);
    const expected=kind==='boss'?1:r.wave.count,actual=G.EnemyMgr.all().filter(e=>e.expedition&&!e.dead).length;if(actual!==expected||r.pendingSpawns.length||r.spawned!==expected)throw Error('incomplete wave '+JSON.stringify({expected,actual,pending:r.pendingSpawns.length,spawned:r.spawned}));
    const before=r.spawned;G.Expedition.tick(1);if(before!==r.spawned)throw Error('extra enemies');return {day,kind,speed,total:actual,enteredBy:r.elapsed,base:r.wave.standardDuration,duration:r.wave.duration,enrage:r.wave.enrageAt};
   },scenario);assert.ok(result.enteredBy<result.base);assert.equal(result.duration,scenario.kind==='elite'?75:scenario.kind==='boss'?105:Math.min(60,24+scenario.day*1.2)+35);if(scenario.day===100&&scenario.kind!=='boss')assert.equal(result.total,168);console.log('Spawn pacing passed',result);
  }
  // Keep the two-second warning intact, including deterministic recovery after failed random positions.
  const warning=await p.evaluate(()=>{G.Expedition.showRoute();const r=G.Expedition.run;r.cycle=1;r.map=G.ExpeditionRules.matrix(1);r.row=0;r.map[1][r.col].kind='battle';G.Expedition.choose(1,r.col);G.Game.expeditionPause();const free=G.World.isFree;let calls=0;G.World.isFree=(...a)=>++calls<=24?false:free(...a);try{G.Expedition.tick(r.wave.spawnDuration/r.wave.count+.001);}finally{G.World.isFree=free;}const e=r.pendingSpawns[0]?.enemy;if(!e)throw Error('fallback spawn');G.Expedition.tick(1.99);if(G.EnemyMgr.all().includes(e))throw Error('early arrival');G.Expedition.tick(.02);if(!G.EnemyMgr.all().includes(e))throw Error('late arrival');return {calls,warning:2};});assert.ok(warning.calls>24);assert.deepEqual(errors,[]);console.log('Warning and placement fallback passed',warning);await ctx.close();
 }
}finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

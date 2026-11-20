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




  await p.locator('#journey-captain').selectOption('4');await p.locator('.journey-prep-actions button').last().click();await p.locator('.journey-prep-actions button').last().click();await p.locator('.journey-grid').waitFor();
  const cases=[{kind:'battle',before:0,clear:false,roll:.99,mon:true,xp:2},{kind:'battle',before:1,clear:false,roll:.99,mon:true,xp:2},{kind:'battle',before:2,clear:false,roll:.99,mon:true,xp:2},{kind:'battle',before:3,clear:false,roll:0,mon:false,xp:2},{kind:'battle',before:4,clear:true,roll:.199999,mon:true,xp:2},{kind:'battle',before:5,clear:true,roll:.2,mon:false,xp:2},{kind:'elite',before:6,clear:false,roll:0,mon:false,xp:2},{kind:'elite',before:7,clear:true,roll:.199999,mon:true,xp:4}];
  const reports=[];
  for(const c of cases){
   await p.evaluate(c=>{const E=G.Expedition,r=E.run;if(r.companionOffer)r.unitPool.putBack(r.companionOffer);E.showRoute();r.trainerLevel=6;r.trainerXp=0;r.battlesCompleted=c.before;r.map[r.row+1][r.col].kind=c.kind;E.choose(r.row+1,r.col);G.Game.expeditionPause();G.EnemyMgr.clear();G.Pickups.clear();r.pendingSpawns=[];r.spawned=r.wave.count;r.appeared=new Set([1,4,7]);r.captain.invuln=999;r.captain.hp=r.captain.maxHp*.6;if(!c.clear){const e=new G.Enemy({dex:7,hp:1e9,spd:0,dmg:0,xp:0,behavior:'chase'},r.captain.x+600,r.captain.y,{hp:1,spd:1,dmg:1});e.expedition=true;G.EnemyMgr.add(e);}r.elapsed=c.clear?.1:r.wave.duration;const saved=Math.random;try{Math.random=()=>c.roll;E.tick(0);}finally{Math.random=saved;}},c);
   await p.waitForFunction(()=>G.Expedition.phase==='loot');
   const got=await p.evaluate(()=>{const r=G.Expedition.run;return {mon:!!r.companion,xp:r.settlement.xpGained,clearBonus:r.settlement.clearXpBonus,cleared:r.battleCleared};});
   assert.equal(got.mon,c.mon,JSON.stringify(c));assert.equal(got.xp,c.xp,JSON.stringify(c));assert.equal(got.clearBonus,c.kind==='elite'&&c.clear?2:0);assert.equal(got.cleared,c.clear);
   assert.equal(await p.locator('.loot-outcome h2').textContent(),c.clear?'全歼敌人':'成功生存');assert.equal(await p.locator('[data-earning=trainer] .loot-earning-value').textContent(),'+'+c.xp);if(got.clearBonus)assert.match(await p.locator('[data-earning=trainer]').textContent(),/基础 2 \+ 全歼 2/);reports.push({...c,...got});
  }
  await p.evaluate(()=>{const r=G.Expedition.run;G.TrainerTalents.onLevelUp(r,4,()=>.2);G.TrainerTalentsUI.showPickModal(()=>G.Expedition.refreshScreen());});await p.locator('#trainer-talents-modal[data-tier=great]').waitFor();assert.equal(await p.locator('.talent-card').count(),3);await p.locator('[data-talent-select="0"]').click();await p.locator('#trainer-talents-modal').waitFor({state:'detached'});await p.locator('#journey-loot-next').waitFor();
  assert.deepEqual(errors,[]);console.log('Battle reward balance browser checks passed:',reports);await ctx.close();
 }
}finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

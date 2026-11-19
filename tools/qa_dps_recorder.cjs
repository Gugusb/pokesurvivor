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
  const expected=await p.evaluate(()=>{
    const r=G.Expedition.run;r.trainerLevel=4;G.Squad.syncTrainer();const member=G.Squad.recruit(37),before=[r.captain,member].map(p=>[p.agility,p.stamina,p.spd,p.baseDefense*(1+p.statGrowth.defense),p.baseSpDef*(1+p.statGrowth.spdef)]);r.captain.level=11;G.ExpeditionGrowth.sync();for(const [i,p]of [r.captain,member].entries()){if(Math.abs(p.expeditionGrowth.hp-.1)>1e-8||Math.abs(p.expeditionGrowth.atk-.1)>1e-8||Math.abs(p.expeditionGrowth.spa-.1)>1e-8)throw Error('growth rate');const after=[p.agility,p.stamina,p.spd,p.baseDefense*(1+p.statGrowth.defense),p.baseSpDef*(1+p.statGrowth.spdef)];if(after.some((n,j)=>Math.abs(n-before[i][j])>1e-8))throw Error('forbidden growth');}
    r.map[1][3].kind='battle';G.Expedition.choose(1,3);G.EnemyMgr.clear();r.spawned=r.wave.count;r.pendingSpawns=[];const enemy=new G.Enemy({dex:7,hp:1e9,spd:0,dmg:0,xp:0,behavior:'chase'},r.captain.x+500,r.captain.y,{hp:1,spd:1,dmg:1});enemy.expedition=true;G.EnemyMgr.add(enemy);
    for(let i=0;i<100;i++){if(i===50)G.SquadBonds.setLayer('types','fire',20);G.ExpeditionDamage.record(r.captain,{id:'ember',type:'fire'},i<50?10:20);G.Expedition.tick(.1);}G.EnemyMgr.clear();G.Expedition.tick(.001);return {damage:1500};
  });
  await p.locator('#journey-loot-next').waitFor();await p.waitForFunction(async()=>{const r=await G.Server.api('/admin/expedition-dps');return r.records.length===1;},{},{timeout:8000});
  const record=await p.evaluate(async()=> (await G.Server.api('/admin/expedition-dps')).records[0]);assert.equal(record.day,1);assert.equal(record.damage,expected.damage);assert.ok(Math.abs(record.averageDps-150)<.1);assert.equal(record.peak.dps,200);assert.equal(record.peak.team.bonds.find(b=>b.id==='fire').layers,20);assert.equal(record.peak.team.squad.length,2);assert.equal(record.version,'0.43.0-alpha.19');assert.equal(record.clean,true);
  await p.evaluate(()=>G.ModUI.open());await p.getByRole('button',{name:'远征输出记录',exact:true}).click();await p.locator('.dps-record summary').first().click();assert.match(await p.locator('.dps-record').innerText(),/平均品质/);
  const [download]=await Promise.all([p.waitForEvent('download'),p.getByRole('button',{name:'导出JSON',exact:true}).click()]);await download.saveAs('tools/cache/dps-records-qa.json');assert.equal(JSON.parse(fs.readFileSync('tools/cache/dps-records-qa.json')).records[0].peak.dps,200);
  const [csv]=await Promise.all([p.waitForEvent('download'),p.getByRole('button',{name:'导出CSV',exact:true}).click()]);await csv.saveAs('tools/cache/dps-records-qa.csv');assert.match(fs.readFileSync('tools/cache/dps-records-qa.csv','utf8'),/peakDps/);
  await p.getByLabel('起始天',{exact:true}).fill('2');await p.getByRole('button',{name:'搜索',exact:true}).click();assert.equal(await p.locator('.dps-record').count(),0);assert.match(await p.locator('#mod-list').innerText(),/暂无记录/);
  await p.goto(base+'/');await p.locator('#tap-start:not(.hidden),#scr-menu:not(.hidden)').first().waitFor();if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#scr-menu:not(.hidden)').waitFor();assert.equal(await p.evaluate(()=>typeof window.G),'undefined');await p.locator('[data-go=play]').click();await p.locator('#journey-captain').waitFor();await p.locator('.journey-prep-actions button').last().click();await p.locator('.journey-prep-actions button').last().click();await p.locator('.journey-grid').waitFor();
  console.log('One-percent growth, automatic telemetry upload, admin details, filtering and JSON/CSV downloads passed.');assert.deepEqual(errors,[]);await ctx.close();
 }
}finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

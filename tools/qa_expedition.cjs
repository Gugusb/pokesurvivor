const {dragSquad}=require('./drag_squad.cjs');
/* Isolated accounts/SQLite only. Source fixtures accelerate stage completion, not real player saves. */
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{once}=require('node:events'),{randomUUID,randomBytes}=require('node:crypto');
const {createApp,hashPassword}=require('../server/server.cjs'),{fresh}=require('../server/domain.cjs');
const own=path.join(__dirname,'cache/browser-qa/node_modules/playwright'),fallback=path.resolve(__dirname,'../../PokeSurvivor/tools/cache/browser-qa/node_modules/playwright');
const {chromium}=require(fs.existsSync(own)?own:fallback),built=process.argv.includes('--built');
(async()=>{const app=createApp({dbFile:':memory:',stunUrls:'none'});let browser;const errors=[],results=[];
try{
 app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;browser=await chromium.launch({channel:'msedge',headless:true});
 for(const lang of ['zh','en','es'])for(const mobile of [false,true]){
  const uid=randomUUID(),name='Journey'+randomBytes(4).toString('hex'),pass=randomBytes(16).toString('hex'),s=fresh(name);s.partner=s.starter=4;for(const d of [4,6,25])s.owned[d]={iv:Array(8).fill(20)};
  for(const m of fs.readFileSync(path.join(__dirname,'../js/data/achievements.js'),'utf8').matchAll(/id:\s*['"]([^'"]+)['"]/g))s.ach[m[1]]=Date.now();
  app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,name,name.toLowerCase(),await hashPassword(pass),'unused',Date.now());app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(s));
  const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1360,height:900},isMobile:mobile,hasTouch:mobile});await ctx.addInitScript(l=>localStorage.setItem('ps.lang',l),lang);const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error'&&m.text().includes('[Game]')){errors.push(m.text());console.error(m.text());}});p.on('dialog',d=>d.accept());
  await p.goto(base+(built?'/':'/dev.html'));await p.locator('#tap-start:not(.hidden),#scr-login:not(.hidden)').first().waitFor();if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#f-user').fill(name);await p.locator('#f-pass').fill(pass);await p.locator('#btn-auth').click();await p.locator('#scr-menu:not(.hidden)').waitFor();await p.locator('[data-go=play]').click();await p.locator('#journey-captain').waitFor();assert.equal(await p.locator('#journey-captain').inputValue(),'4');
  await p.locator('#journey-content .journey-actions button').last().click();assert.equal(await p.locator('.journey-gens>span').count(),3);await p.locator('#journey-content .journey-actions button').last().click();await p.locator('.journey-grid').waitFor();assert.equal(await p.locator('.journey-event').count(),147);assert.equal(await p.locator('.journey-event.reachable').count(),3);assert.equal(await p.locator('[data-row="20"][data-event="boss"]').count(),7);
  await p.screenshot({path:path.join(__dirname,`cache/journey-${built?'built':'source'}-${lang}-${mobile?'phone':'pc'}-route.png`)});
  if(!built){
   await p.evaluate(()=>{const r=G.Expedition.run;r.map[1][3].kind='shop';G.Expedition.showRoute();});await p.locator('[data-row="1"][data-col="3"]').click();await p.locator('[data-buy]').first().click();assert.equal(await p.evaluate(()=>G.Squad.roster.length),1);assert.equal(await p.evaluate(()=>G.Game.everyone().length),2);
   await p.evaluate(()=>{const r=G.Expedition.run;r.gold=600;});await p.locator('.journey-shop-controls button').nth(1).click();await p.locator('#journey-upgrade').click();assert.equal(await p.evaluate(()=>G.Squad.capacity),5);
   await p.evaluate(()=>{for(const d of [4,4,4,4,7,25,133])G.Squad.recruit(d);const p=G.Squad.roster.find(p=>p.rank===3);if(!p||p.dex!==6)throw new Error('pair merge failed');});
   await p.locator('.journey-squad-link').click();await p.locator('#scr-squad:not(.hidden)').waitFor();assert.ok(await p.locator('[data-squad-select]').count()>=5);const ids=await p.locator('[data-squad-select]').evaluateAll(es=>es.map(e=>e.dataset.squadSelect));await dragSquad(p,p.locator('.squad-field-slot[data-slot="2"] .squad-unit'),p.locator('.squad-field-slot[data-slot="1"]'),mobile);const after=await p.locator('[data-squad-select]').evaluateAll(es=>es.map(e=>e.dataset.squadSelect));assert.equal(after[1],ids[2]);await p.locator('[data-squad-select]').nth(1).click();assert.equal(await p.locator('.squad-stat').count(),8);
   await p.screenshot({path:path.join(__dirname,`cache/journey-source-${lang}-${mobile?'phone':'pc'}-squad.png`)});await p.locator('#squad-member-close').click();await p.locator('#squad-close').click();
   await p.locator('.journey-shop-controls button').last().click();await p.evaluate(()=>{const r=G.Expedition.run;r.map[2][3].kind='battle';G.Expedition.showRoute();});await p.locator('[data-row="2"][data-col="3"]').click();await p.waitForFunction(()=>G.Game.state==='playing'&&G.Expedition.inCombat);
   await p.evaluate(()=>{const p=G.Game.player;p.hp=p.maxHp=30000;p.invuln=1000;for(const o of G.Squad.deployed()){o.invuln=1000;o.moves=[G.Moves.instance('ember')];o.slots=[o.moves.slice()];o.active=0;}G.Settings.set('castMode','click');});
   await p.waitForFunction(()=>G.EnemyMgr.count>0);await p.evaluate(()=>{const p=G.Game.player,e=G.EnemyMgr.all()[0];e.x=p.x+90;e.y=p.y;e.hp=e.maxHp=1e7;e.spd=0;});await p.keyboard.down('KeyD');await p.waitForTimeout(1500);await p.keyboard.up('KeyD');await p.waitForTimeout(500);
   assert.ok(await p.evaluate(()=>G.Squad.deployed().some(o=>G.MovePP.state(o,o.moves[0]).current<G.MovePP.max(o,o.moves[0]))),'companions auto cast even in click mode');assert.ok(await p.evaluate(()=>G.Squad.deployed().some(o=>o.dmgDealt>0)),'companion damage ownership');
   await p.screenshot({path:path.join(__dirname,`cache/journey-source-${lang}-${mobile?'phone':'pc'}-battle.png`)});
   await p.evaluate(()=>{const p=G.Squad.deployed()[0];p.invuln=0;p.hurt(1e9,null,true,{kind:'environment'});if(!p.dead)throw new Error('member should faint');if(!G.Squad.talent(p).value)throw new Error('trait disappeared');G.Expedition.run.elapsed=G.Expedition.run.wave.duration;});
   async function settle(target='journey'){
    for(let n=0;n<300;n++){
     const info=await p.evaluate(()=>({state:G.Game.state,phase:G.Expedition.phase})),state=info.state;
     if(info.phase==='loot'){
      if(await p.locator('#journey-claim').isVisible())await p.locator('#journey-claim').click();
      await p.locator('#journey-loot-next').click();continue;
     }
     if(state===target)return;
     if(await p.locator('#scr-levelup').isVisible())await p.locator('#cards .card').first().click();
     else if(await p.locator('#scr-item').isVisible())await p.locator('#item-cards .card').first().click();
     else if(await p.locator('#scr-bond').isVisible())await p.locator('#bond-cards .card').first().click();
     else if(await p.locator('#scr-specialization').isVisible())await p.locator('#specialization-cards .card').first().click();
     await p.waitForTimeout(35);
    }throw new Error('Stage failed to settle: '+await p.evaluate(()=>JSON.stringify({state:G.Game.state,phase:G.Expedition.phase})));
   }
   await settle();assert.ok(await p.evaluate(()=>G.Squad.roster.every(o=>!o.dead&&o.hp===o.maxHp)));
   if(lang==='zh'){
    for(let day=3;day<=60;day++){
     await p.evaluate(day=>{const r=G.Expedition.run;r.map[r.row+1][r.col].kind=day%20===0?'boss':day===3?'elite':'rest';G.Expedition.showRoute();},day);
     const cell=await p.evaluate(()=>({row:G.Expedition.run.row+1,col:G.Expedition.run.col}));await p.locator(`[data-row="${cell.row}"][data-col="${cell.col}"]`).click();
     if(day%20===0){await p.waitForFunction(()=>G.Expedition.inCombat&&G.EnemyMgr.all().some(e=>e.boss));const dex=await p.evaluate(()=>G.EnemyMgr.all().find(e=>e.boss).dex);if(day===60){assert.equal(dex,493);await p.evaluate(()=>{const e=G.EnemyMgr.all().find(e=>e.boss),p=G.Game.player;e.x=p.x+150;e.y=p.y;});await p.screenshot({path:path.join(__dirname,`cache/journey-day60-${mobile?'phone':'pc'}-arceus.png`)});}await p.evaluate(()=>{const e=G.EnemyMgr.all().find(e=>e.boss);e.hurt(1e9,'#fff',0,0,0,null,G.Game.player);});await settle(day===60?'victory':'journey');}
     else if(day===3){await p.waitForFunction(()=>G.EnemyMgr.count>0);assert.ok(await p.evaluate(()=>G.EnemyMgr.all().every(e=>e.elite)));await p.evaluate(()=>G.Expedition.run.elapsed=G.Expedition.run.wave.duration);await settle();}
     if(day===20||day===40)assert.equal(await p.locator('[data-row="20"][data-event="boss"]').count(),7);
    }
    await p.locator('#scr-victory:not(.hidden)').waitFor();assert.equal(await p.evaluate(()=>G.Game.challenge.victory),true);assert.equal(await p.evaluate(()=>G.Difficulty.unlocked(G.DB.save)),2);await p.screenshot({path:path.join(__dirname,'cache/journey-day60-victory.png')});if(!mobile)await p.locator('#victory-cashout').click();else{await p.locator('#victory-continue').click();await p.locator('.journey-grid').waitFor();assert.equal(await p.evaluate(()=>G.Expedition.run.cycle),4);assert.equal(await p.evaluate(()=>G.Expedition.summary().cashout),false);await p.locator('#journey-content>.journey-actions button').click();}await p.locator('#scr-over:not(.hidden)').waitFor();
    let saved;for(let n=0;n<100;n++){saved=JSON.parse(app.db.prepare('SELECT payload FROM saves WHERE uid=?').get(uid).payload);if(mobile?saved.difficulty.cleared[1]:saved.difficulty.cashouts?.[1])break;await p.waitForTimeout(50);}assert.equal(!!saved.difficulty.cashouts?.[1],!mobile);assert.equal(saved.difficulty.cleared[1],true);assert.equal(app.db.prepare('SELECT COUNT(*) n FROM run_scores WHERE uid=?').get(uid).n,0);
   }
  }else{
   const choice=p.locator('.journey-event.reachable[data-event="shop"],.journey-event.reachable[data-event="rest"]');await (await choice.count()?choice.first():p.locator('.journey-event.reachable').first()).click();await p.waitForTimeout(1800);
  }
  if(mobile){for(const size of [{width:844,height:390},{width:320,height:568}]){await p.setViewportSize(size);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:path.join(__dirname,`cache/journey-${built?'built':'source'}-${lang}-${size.width}.png`)});}}
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));results.push({built,lang,mobile,schedule:true,shop:!built,squadCombat:!built,day60Victory:!built&&lang==='zh'});await ctx.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify(results));
}finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

/* Local source runtime, isolated accounts/SQLite and clearly marked battle fixtures. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{once}=require('node:events'),{randomUUID,randomBytes}=require('node:crypto');
const {createApp,hashPassword}=require('../server/server.cjs'),{fresh}=require('../server/domain.cjs'),{chromium}=require('./cache/browser-qa/node_modules/playwright');
(async()=>{const app=createApp({dbFile:':memory:',stunUrls:'none'});let browser;const errors=[],results=[];
try{
 app.server.listen(0,'127.0.0.1');await once(app.server,'listening');browser=await chromium.launch({channel:'msedge',headless:true});const base='http://127.0.0.1:'+app.server.address().port;
 for(const lang of ['zh','en','es'])for(const mobile of [false,true]){
  const uid=randomUUID(),name='Bonds'+randomBytes(4).toString('hex'),pass=randomBytes(16).toString('hex'),s=fresh(name);s.partner=s.starter=1;s.owned[1]={iv:Array(8).fill(20)};
  require('../server/domain.cjs').G.CardPacks.normalize(s);for(const k of ['specialize','link','breakthrough'])s.cardPack.taken['training:'+k]=1;
  for(const m of fs.readFileSync(path.join(__dirname,'../js/data/achievements.js'),'utf8').matchAll(/id:\s*['"]([^'"]+)['"]/g))s.ach[m[1]]=Date.now();
  app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,name,name.toLowerCase(),await hashPassword(pass),'unused',Date.now());app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(s));
  const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1360,height:900},isMobile:mobile,hasTouch:mobile});await ctx.addInitScript(l=>localStorage.setItem('ps.lang',l),lang);const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error'&&m.text().includes('[Game]')){errors.push(m.text());console.error(m.text());}});p.on('dialog',d=>d.accept());
  await p.goto(base+'/dev.html');await p.locator('#tap-start:not(.hidden),#scr-login:not(.hidden)').first().waitFor();if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#f-user').fill(name);await p.locator('#f-pass').fill(pass);await p.locator('#btn-auth').click();await p.locator('#scr-menu:not(.hidden)').waitFor();await p.locator('[data-go=play]').click();await p.locator('#journey-captain').waitFor();await p.locator('#journey-content .journey-actions button').last().click();await p.locator('#journey-content .journey-actions button').last().click();await p.locator('.journey-grid').waitFor();
  await p.evaluate(()=>{G.Dev.setEnabled(true);});await p.keyboard.press('F2');await p.locator('[data-dev=god]').click();



  await p.locator('#dev-close').click();assert.equal(await p.evaluate(()=>G.Game.player.moves[0].id),'vine-whip');
  const enter=async kind=>{await p.evaluate(kind=>{const r=G.Expedition.run;r.gold=20000;r.map[r.row+1][r.col].kind=kind;G.Expedition.showRoute();},kind);await p.locator('.journey-event.reachable[data-event="'+kind+'"]').first().click();};
  await p.evaluate(()=>{G.ExpeditionRules.shopMon=()=>G.DEX_BY[1];G.ExpeditionRules.shopRank=()=>1;G.Squad.recruit(1);});
  assert.equal(await p.evaluate(()=>G.Squad.roster[0].moves[0].id),'toxic');await enter('shop');
  assert.ok(await p.evaluate(()=>G.Expedition.offers.filter(o=>o.kind==='mon').every(o=>o.moveId===G.FIXED_SKILLS[o.dex])));
  const moveName=await p.evaluate(()=>G.T(G.Moves.BY_ID.toxic.name));assert.ok((await p.locator('.journey-shop-move').first().innerText()).includes(moveName));await p.locator('[data-buy="0"]').click();assert.ok(await p.evaluate(()=>G.Squad.roster.every(p=>p.moves[0].id==='toxic')));await p.screenshot({path:path.join(__dirname,'cache/fixed-skills-shop-'+lang+'-'+mobile+'.png')});
  await p.locator('.journey-shop-controls button').nth(2).click();
  await enter('battle');await p.evaluate(()=>{const r=G.Expedition.run;r.companion=1;r.companionResolved=false;r.elapsed=r.wave.duration;r.pendingSpawns=[];r.spawned=r.wave.count;G.EnemyMgr.clear();});await p.locator('#journey-claim').click();assert.ok(await p.evaluate(()=>G.Squad.roster.every(p=>p.moves[0].id==='toxic')));await p.locator('#journey-loot-next').click();await p.locator('.journey-grid').waitFor();
  await enter('training');await p.locator('[data-training="replace"]').click();await p.locator('.journey-training .btn').first().click();const vine=await p.evaluate(()=>G.T(G.Moves.BY_ID['vine-whip'].name));await p.locator('[data-training-choice="replace"]').filter({hasText:vine}).first().click();await p.locator('.journey-grid').waitFor();
  const after=await p.evaluate(()=>{const p=G.Squad.roster[0];if(p.moves[0].id!=='vine-whip')throw Error('training did not apply');G.Squad.recruit(2,null,2);return {dex:p.dex,rank:p.rank,move:p.moves[0].id,evolved:p.moves[0].evolved,captain:G.Game.player.moves[0].id};});assert.deepEqual(after,{dex:3,rank:3,move:'vine-whip',evolved:true,captain:'vine-whip'});
  await p.locator('.journey-squad-link').click();await p.locator('[data-squad-select="1"]').click();assert.equal(await p.locator('#squad-detail [data-skill="vine-whip"]').count(),1);await p.screenshot({path:path.join(__dirname,'cache/fixed-skills-trained-'+lang+'-'+mobile+'.png')});
  results.push({lang,mobile,captainUnchanged:true,recruitAndLootFixed:true,shopAdvertisedAndActual:true,trainingPreservedThroughEvolution:true});await ctx.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify(results));
}finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

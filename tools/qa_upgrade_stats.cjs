/* Upgrade purchases and battle stats in disposable browser/account fixtures. */
const assert=require('node:assert/strict'),path=require('node:path'),{once}=require('node:events'),{randomBytes,randomUUID}=require('node:crypto');
const {createApp,hashPassword}=require('../server/server.cjs'),{fresh}=require('../server/domain.cjs');
const {chromium}=require(path.join(__dirname,'cache/browser-qa/node_modules/playwright'));
(async()=>{const app=createApp({dbFile:':memory:',stunUrls:'none'}),errors=[],results=[];let browser;
try{const name='UpgradeFixture',password=randomBytes(24).toString('hex'),uid=randomUUID(),s=fresh(name);s.partner=6;s.coins=1000000;
for(const d of [4,5,6])s.owned[d]={at:1,iv:Array(8).fill(31)};
app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,name,name.toLowerCase(),await hashPassword(password),'unused',Date.now());
app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(s));app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
browser=await chromium.launch({channel:'msedge',headless:true});
for(const built of (process.argv.includes('--source')?[false]:process.argv.includes('--built')?[true]:[false,true]))for(const lang of ['zh','en','es']){
 const c=await browser.newContext({viewport:{width:1280,height:1000}});await c.addInitScript(l=>localStorage.setItem('ps.lang',l),lang);const page=await c.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.text().includes('[Game]'))errors.push(m.text());});await page.goto(base+(built?'/':'/dev.html'));
 await page.waitForFunction(()=>!document.getElementById('tap-start').classList.contains('hidden')||!document.getElementById('scr-login').classList.contains('hidden'));if(await page.locator('#tap-start').isVisible())await page.locator('#tap-start').click();
 await page.locator('#f-user').fill(name);await page.locator('#f-pass').fill(password);await page.locator('#btn-auth').click();await page.locator('#scr-menu:not(.hidden)').waitFor();
 await page.locator('[data-go="upgrades"]').click();await page.locator('#upg-mon').selectOption('6');
 for(let i=0;i<6;i++){const row=page.locator('#upg-list .upg-item').nth(i),button=row.locator('[data-buy]');const before=await row.locator('.pips .on').count();if(await button.isEnabled()){await button.click();assert.equal(await page.locator('#upg-list .upg-item').nth(i).locator('.pips .on').count(),before+1);}}
 const text=await page.locator('#upg-list').innerText();assert.ok(text.includes('3%'));assert.ok(text.includes('5%'));assert.ok(text.includes('0.2%'));if(lang==='zh'){assert.ok(text.includes('基础敏捷'));assert.ok(text.includes('基础物防和特防'));}
 await page.screenshot({path:path.join(__dirname,`cache/upgrades-${built?'built':'source'}-${lang}.png`),animations:'disabled'});
 await page.locator('#upg-mon').selectOption('4');assert.ok(await page.locator('#upg-list .upg-item').first().locator('.pips .on').count()>0);
 await page.locator('#scr-upgrades [data-back]').click();await page.locator('[data-go="play"]').click();await page.locator('#scr-menu').waitFor({state:'hidden'});
 if(!built){const result=await page.evaluate(()=>{const p=G.Game.player,l=G.DB.upgradesOf(6);return {hp:p.maxHp/p.baseHp,atk:p.atk/p.baseAtk,spa:p.spa/p.baseSpa,def:p.defenseFor({kind:'contact'})/p.baseDefense,spdef:p.defenseFor({kind:'projectile'})/p.baseSpDef,agility:p.agility/p.baseAgility,regen:p.regen/p.baseHp,l};});for(const [key,id,rate]of [['hp','hp',.03],['atk','atk',.04],['spa','atk',.04],['def','def',.05],['spdef','def',.05],['agility','cd',.03]])assert.ok(Math.abs(result[key]-(1+result.l[id]*rate))<1e-7,key);assert.ok(Math.abs(result.regen-result.l.regen*.002)<1e-7);results.push({lang,statsVerified:true});}else assert.equal(await page.evaluate(()=>typeof G),'undefined');
 await c.close();
}assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,results,pageErrors:errors.length}));
}finally{await browser?.close();await app.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

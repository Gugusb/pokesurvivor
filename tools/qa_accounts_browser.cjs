/* Failure/recovery and legacy backup checks. Only disposable memory accounts. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{once}=require('node:events'),{randomBytes,randomUUID,createHash}=require('node:crypto');
const {createApp,hashPassword}=require('../server/server.cjs'),{fresh}=require('../server/domain.cjs');
const {chromium}=require(path.join(__dirname,'cache/browser-qa/node_modules/playwright'));
(async()=>{
 const app=createApp({dbFile:':memory:'}),errors=[],results=[],out=path.join(__dirname,'cache');let browser;
 try{
  fs.mkdirSync(out,{recursive:true});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
  browser=await chromium.launch({headless:true,channel:'msedge'});
  for(const [entry,locale] of process.argv.includes('--built')?[['/','zh-CN'],['/en/','en-US'],['/','es-ES']]:[['/dev.html','zh-CN']]){
   const name='AuthQA_'+randomBytes(3).toString('hex'),pass=randomBytes(18).toString('hex'),uid=randomUUID(),salt='fixture-salt',server=fresh(name),local=fresh(name);
   server.partner=1;server.owned[1]={at:Date.now(),from:'fixture'};server.coins=321;local.partner=6;local.coins=777777;
   app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,name,name.toLowerCase(),await hashPassword(pass),'unused',Date.now());
   app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(server));
   const seed={key:name.toLowerCase(),name,save:local,salt,hash:createHash('sha256').update(salt+':'+pass).digest('hex')};
   const c=await browser.newContext({locale,viewport:{width:390,height:844},acceptDownloads:true});
   await c.addInitScript(seed=>{if(!localStorage.getItem('ps.accounts')){localStorage.setItem('ps.accounts',JSON.stringify({[seed.key]:{name:seed.name,salt:seed.salt,hash:seed.hash}}));localStorage.setItem('ps.save.'+seed.key,JSON.stringify(seed.save));localStorage.setItem('ps.session',JSON.stringify(seed.key));}},seed);
   const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));let fail=true,registerCalls=0;
   p.on('request',r=>{if(r.url().endsWith('/api/register'))registerCalls++;});
   await p.route('**/api/health',route=>fail?route.abort('failed'):route.continue());
   const ready=async()=>{await p.waitForFunction(()=>!document.getElementById('tap-start').classList.contains('hidden')||!document.getElementById('scr-login').classList.contains('hidden')||!document.getElementById('scr-menu').classList.contains('hidden'));if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();};
   await p.goto(base+entry);await ready();await p.locator('#scr-login:not(.hidden)').waitFor();assert.ok(await p.locator('#login-reconnect').isVisible());assert.ok(await p.locator('#login-legacy-backup').isVisible());
   const localBefore=await p.evaluate(k=>localStorage.getItem('ps.save.'+k),seed.key);
   await p.locator('[data-tab="register"]').click();await p.locator('#f-user').fill(name);await p.locator('#f-pass').fill(pass);await p.locator('#btn-auth').click();
   await p.waitForFunction(()=>!document.getElementById('btn-auth').disabled);assert.ok((await p.locator('#login-err').textContent()).length>0);assert.equal(registerCalls,0);
   const downloaded=p.waitForEvent('download');await p.locator('#login-legacy-backup').click();const download=await downloaded,chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);const backup=JSON.parse(Buffer.concat(chunks));
   assert.equal(backup.entries[0].save.coins,777777);assert.equal(backup.entries[0].name,name);assert.ok(!JSON.stringify(backup).includes(seed.hash));assert.ok(!JSON.stringify(backup).includes(pass));await download.delete();
   await p.screenshot({path:path.join(out,'account-outage-'+locale+'.png')});
   fail=false;await p.locator('#login-reconnect').click();await p.waitForFunction(()=>document.getElementById('login-reconnect-row').classList.contains('hidden'));
   await p.locator('#btn-auth').click();await p.waitForFunction(()=>!document.getElementById('btn-auth').disabled);assert.ok((await p.locator('#login-err').textContent()).length>0);
   assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM users WHERE lower=?').get(name.toLowerCase()).n,1);
   await p.locator('[data-tab="login"]').click();await p.locator('#btn-auth').click();await p.locator('#scr-menu:not(.hidden)').waitFor();
   const partner=await p.locator('#menu-partner-name').textContent();assert.ok(+(await p.locator('#coins').textContent())<1000);
   for(let i=0;i<2;i++){
    await p.reload();await ready();await p.locator('#scr-menu:not(.hidden)').waitFor();assert.equal(await p.locator('#menu-partner-name').textContent(),partner);
    await p.locator('#btn-logout').click();await p.locator('#scr-login:not(.hidden)').waitFor();await p.locator('#f-user').fill(name);await p.locator('#f-pass').fill(pass);await p.locator('#btn-auth').click();await p.locator('#scr-menu:not(.hidden)').waitFor();
   }
   assert.equal(await p.evaluate(k=>localStorage.getItem('ps.save.'+k),seed.key),localBefore);
   const recovery=await c.newPage();recovery.on('pageerror',e=>errors.push(e.message));await recovery.goto(base+'/local-save-backup.html');assert.ok(await recovery.locator('#download').isEnabled());
   const recoveryDownload=recovery.waitForEvent('download');await recovery.locator('#download').click();const d=await recoveryDownload,parts=[];for await(const part of await d.createReadStream())parts.push(part);assert.equal(JSON.parse(Buffer.concat(parts)).entries[0].save.coins,777777);await d.delete();
   assert.ok(await recovery.locator('body').evaluate(el=>el.scrollWidth<=innerWidth));await recovery.screenshot({path:path.join(out,'local-backup-'+locale+'.png')});
   results.push({entry,locale,blockedLocalRegistration:true,retry:true,duplicateRejected:true,stableReloadAndRelogin:true,legacyBackup:true,legacyDataUnchanged:true});await c.close();
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({results,pageErrors:0,isolatedMemoryDatabase:true},null,2));
 }finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

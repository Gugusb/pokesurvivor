/* Character cards via actual leaderboard clicks; disposable memory users only. */
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{once}=require('node:events'),{randomBytes,randomUUID}=require('node:crypto');
const {createApp,hashPassword}=require('../server/server.cjs'),{fresh,G}=require('../server/domain.cjs'),{identity}=require('../server/character-profiles.cjs');
const {chromium}=require(path.join(__dirname,'cache/browser-qa/node_modules/playwright'));
(async()=>{
 const app=createApp({dbFile:':memory:'}),errors=[],out=path.join(__dirname,'cache');let browser;
 try{
  fs.mkdirSync(out,{recursive:true});const pass=randomBytes(20).toString('hex'),hash=await hashPassword(pass),viewer=randomUUID();
  const specs=[['ash','小智',25,1602],['may','小遥',257,1495],['dawn','小光',393,1390],['serena','瑟蕾娜',655,1350],['liko','莉可',906,1300],['roy','罗伊',909,1240]];
  for(const [uid,name,dex,time,marked] of [[viewer,'ProfileViewer',1,0,false],...specs.map(([key,name,dex,time])=>[identity(key),name+'_演示',dex,time,true])]){
   const s=fresh(name);s.partner=dex;s.owned[dex]={at:Date.now(),from:'fixture'};s.profile.favs=[dex];
   if(marked){s.stats.bestLevel=78;s.stats.totalKills=7420;for(const d of G.DEX.slice(0,18).map(m=>m.dex))s.difficultyRecords[d]=Object.fromEntries(Array.from({length:8},(_,i)=>[i+1,{won:true,best:1250}]));}
   app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,name,name.toLowerCase(),hash,'unused',1);app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(s));
   if(marked){app.db.prepare('INSERT INTO audit(actor,target,action,at) VALUES(?,?,?,?)').run('system:anime-demo-v1',uid,'seed-demo-rankings:anime-v1',1);app.db.prepare('INSERT INTO completion_scores VALUES(?,?,?)').run(uid,18,1);app.db.prepare('INSERT INTO time_scores VALUES(?,?,?,?,?,?,?)').run(uid,time,dex,78,7420,'preset',1);}
  }
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
  browser=await chromium.launch({headless:true,channel:'msedge'});const results=[];
  for(const [entry,locale] of process.argv.includes('--built')?[['/','zh-CN'],['/en/','en-US'],['/','es-ES']]:[['/dev.html','zh-CN']]){
   const c=await browser.newContext({locale,viewport:{width:1280,height:960}}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base+entry);
   await p.waitForFunction(()=>!document.getElementById('tap-start').classList.contains('hidden')||!document.getElementById('scr-login').classList.contains('hidden'));if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();
   await p.locator('#f-user').fill('ProfileViewer');await p.locator('#f-pass').fill(pass);await p.locator('#btn-auth').click();await p.locator('#scr-menu:not(.hidden)').waitFor();await p.locator('[data-go="rank"]').click();await p.locator('#rk-list .who b').first().waitFor();
   assert.equal(await p.locator('#rk-list .who b').count(),6);assert.ok(!(await p.locator('#rk-list').textContent()).includes('_演示'));
   for(const [key,name] of specs){
    await p.locator('#rk-list .who b').filter({hasText:new RegExp('^'+name+'$')}).click();await p.waitForFunction(name=>document.querySelector('#prof-body h2')?.textContent===name,name);
    const partners=p.locator('.prof-partner');assert.equal(await partners.count(),['liko','roy'].includes(key)?2:3);assert.ok(await p.locator('.prof-preset').isVisible());assert.equal(await p.locator('.prof-victory').count(),12);
    await p.waitForTimeout(250);const rendered=await partners.locator('canvas').evaluateAll(cs=>cs.every(c=>{try{return c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);}catch{return false;}}));assert.equal(rendered,true);
    if(key==='ash'||key==='liko')await p.locator('.profile-box').screenshot({path:path.join(out,'character-'+key+'-'+locale+'.png')});
    await p.setViewportSize({width:320,height:800});assert.ok(await p.locator('.profile-box').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    if(key==='ash')await p.locator('.profile-box').screenshot({path:path.join(out,'character-mobile-'+locale+'.png')});await p.locator('#prof-close').click();await p.setViewportSize({width:1280,height:960});
   }
   await p.locator('#rk-mode .gen-tab').nth(1).click();await p.waitForFunction(()=>document.querySelector('#rk-list .time')?.textContent==='26:42');assert.ok(!(await p.locator('#rk-list').textContent()).includes('_演示'));
   await p.locator('#scr-rank [data-back]').click();await p.locator('#user-pill').click();await p.locator('#goals-body > button.btn.gold').click();await p.waitForFunction(()=>document.querySelector('#prof-body h2')?.textContent==='ProfileViewer');assert.equal(await p.locator('.prof-preset').count(),0);
   results.push({entry,locale,characters:6,bothBoardsPlainNames:true,animatedPartners:true,completeMedalGallery:true,mobile320:true,ordinaryProfile:true});await c.close();
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({results,pageErrors:0,isolatedMemoryDatabase:true},null,2));
 }finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

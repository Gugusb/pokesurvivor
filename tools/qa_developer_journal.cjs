/* Edition notes and developer profile in an isolated database, never player data. */
const assert=require('node:assert/strict'),path=require('node:path'),{once}=require('node:events'),{randomBytes,randomUUID}=require('node:crypto');
const {createApp,hashPassword}=require('../server/server.cjs'),{fresh}=require('../server/domain.cjs');
const {seedDeveloperCharacter}=require('../server/seed-developer-character.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(__dirname,'cache/browser-qa/node_modules/playwright'));
(async()=>{
 const app=createApp({dbFile:':memory:',stunUrls:'none'}),errors=[],results=[];let browser;
 try{
  const character=await seedDeveloperCharacter(app.db),uid=randomUUID(),name='JournalWebViewer',pass=randomBytes(24).toString('hex'),save=fresh(name);save.partner=6;save.owned[6]={at:1,iv:Array(8).fill(20)};
  app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,name,name.toLowerCase(),await hashPassword(pass),'unused',Date.now());app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(save));
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
  browser=await chromium.launch({channel:'msedge',headless:true});
  for(const built of process.argv.includes('--source')?[false]:process.argv.includes('--built')?[true]:[false,true])for(const lang of ['zh','en','es']){
   const context=await browser.newContext({viewport:{width:1280,height:960},locale:lang==='zh'?'zh-CN':lang});await context.addInitScript(l=>localStorage.setItem('ps.lang',l),lang);
   const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base+(built?'/':'/dev.html'));
   await p.waitForFunction(()=>!document.getElementById('tap-start').classList.contains('hidden')||!document.getElementById('scr-login').classList.contains('hidden'));if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();
   await p.locator('#f-user').fill(name);await p.locator('#f-pass').fill(pass);await p.locator('#btn-auth').click();await p.locator('#scr-menu:not(.hidden)').waitFor();await p.locator('#btn-news').click();await p.locator('#scr-news:not(.hidden)').waitFor();
   assert.equal(await p.locator('.news-day').count(),47);assert.equal(await p.locator('.news-note').count(),40);assert.equal(await p.locator('.news-day').filter({has:p.locator('.news-note')}).count(),40);
   const team=await p.locator('.news-team').textContent();assert.ok(team.includes('Gugusb'));assert.ok(team.includes('JPTER78'));assert.ok(team.includes('DeepSeek'));
   const first=p.locator('.news-day').first(),last=p.locator('.news-day').last();assert.ok((await first.textContent()).includes('v0.35.0'));assert.equal(await last.locator('.news-note').count(),0);
   if(lang==='zh'){assert.ok(team.includes('大肥鱼'));assert.ok((await first.textContent()).includes('用户好懒'));for(const text of await p.locator('.news-note span').allTextContents())assert.ok(/[\u4e00-\u9fff]/.test(text));}
   else assert.ok(!(await first.locator('.news-note').textContent()).includes('白饭'));
   assert.equal(await first.evaluate(el=>el.lastElementChild.classList.contains('news-note')),true);
   await p.screenshot({path:path.join(__dirname,`cache/journal-${built?'built':'source'}-${lang}.png`),animations:'disabled'});
   await p.setViewportSize({width:320,height:740});assert.ok(await p.locator('.news-box').evaluate(el=>el.scrollWidth<=el.clientWidth+1));await p.screenshot({path:path.join(__dirname,`cache/journal-${built?'built':'source'}-${lang}-mobile.png`),animations:'disabled'});
   await first.locator('[data-news-profile]').click();await p.waitForFunction(()=>document.querySelector('#prof-body h2')?.textContent==='大肥鱼');assert.ok(await p.locator('.prof-preset').isVisible());
   assert.equal(await p.locator('.prof-partner').count(),3);assert.equal(await p.locator('.prof-victory').count(),12);const marks=(await p.locator('.prof-marks').textContent()).replace(/[.,\s\u00a0\u202f]/g,'');assert.ok(marks.includes('251250'));assert.ok(marks.includes('183240'));assert.ok((await p.locator('.prof-bio').textContent()).includes('Gugusb'));
   await p.waitForFunction(()=>[...document.querySelectorAll('.prof-partner canvas')].every(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0)));
   assert.ok(await p.locator('.profile-box').evaluate(el=>el.scrollWidth<=el.clientWidth+1));await p.screenshot({path:path.join(__dirname,`cache/developer-profile-${built?'built':'source'}-${lang}-mobile.png`),animations:'disabled'});
   await p.setViewportSize({width:1280,height:960});await p.screenshot({path:path.join(__dirname,`cache/developer-profile-${built?'built':'source'}-${lang}.png`),animations:'disabled'});
   const scores=await p.evaluate(async id=>{const out=[];for(const board of ['completion','survival']){const r=await fetch('/api/ranking?board='+board),v=await r.json();out.push(v.rows.some(x=>x.uid===id));}return out;},character.uid);assert.deepEqual(scores,[false,false]);
   await p.locator('#prof-close').click();await p.locator('[data-go="play"]').click();await p.locator('#scr-menu').waitFor({state:'hidden'});await p.waitForTimeout(700);await p.keyboard.press('Escape');await p.locator('#scr-pause:not(.hidden)').waitFor();await p.locator('#btn-quit').click();await p.locator('#scr-over:not(.hidden)').waitFor();
   assert.ok(await p.locator('#over-fish').isVisible());assert.match(await p.locator('#over-fish').getAttribute('data-quip'),/^departure-/);assert.equal(await p.locator('#over-fish-title').textContent(),lang==='zh'?'大肥鱼吐槽':lang==='en'?'Dafeiyu comments':'Dafeiyu comenta');assert.ok((await p.locator('#over-fish-text').textContent()).length>15);
   await p.setViewportSize({width:320,height:740});assert.ok(await p.locator('#over-fish').evaluate(el=>el.scrollWidth<=el.clientWidth+1));assert.ok(await p.locator('#scr-over .box').evaluate(el=>el.scrollWidth<=el.clientWidth+1));await p.screenshot({path:path.join(__dirname,`cache/fish-result-${built?'built':'source'}-${lang}-mobile.png`),animations:'disabled'});
   let contexts=1;
   if(!built){
    const checked=await p.evaluate(()=>{
     const cases=[['early',{dead:true,time:40,record:true}],['growing',{dead:true,time:400}],['close',{dead:true,time:1000}],['victory',{dead:false,time:1201,victory:true}],['endless',{dead:true,time:1600,completed:true,record:true}],['arceus',{dead:true,time:1900,victory:true,judge:{time:100,bosses:1}}],['record',{dead:false,time:1201,victory:true,record:true}],['departure',{dead:false,time:80}]],out=[];
     for(const [group,result] of cases){const r={level:10,kills:100,bosses:1,coins:10,moves:[],breakdown:'',...result};G.RunUI.showOver(r,()=>{});const first=document.getElementById('over-fish').dataset.quip;G.RunUI.showOver(r,()=>{});out.push({group,correct:first.startsWith(group+'-'),repeat:first===document.getElementById('over-fish').dataset.quip,visible:!document.getElementById('scr-over').classList.contains('hidden')});}
     G.DB.save.stats.runs=2;localStorage.removeItem('ps.ask');G.RunUI.showOver({dead:false,time:1250,level:10,kills:100,bosses:1,coins:10,moves:[],breakdown:'',victory:true,record:true},()=>{});return out;
    });for(const c of checked){assert.ok(c.correct,c.group);assert.equal(c.repeat,false,c.group);assert.ok(c.visible);}contexts=checked.length;
    assert.equal(await p.locator('#over-ask a').getAttribute('href'),'https://ko-fi.com/jpter78');await p.locator('#over-ask .x').click();assert.ok(await p.locator('#over-fish').isVisible());await p.setViewportSize({width:1280,height:960});await p.screenshot({path:path.join(__dirname,`cache/fish-result-source-${lang}-victory.png`),animations:'disabled'});
   }
   results.push({built,lang,notes:40,upstream:7,mobile320:true,characterProfile:true,animatedPartners:true,curatedRecords:true,noLeaderboardInsertion:true,realRunResult:true,resultContexts:contexts});await context.close();
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,results,pageErrors:0,isolatedMemoryDatabase:true}));
 }finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

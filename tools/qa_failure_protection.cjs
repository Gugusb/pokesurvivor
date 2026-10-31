/* Real browser lifecycle, isolated memory database; no changes to player saves. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{once}=require('node:events'),{randomBytes,randomUUID}=require('node:crypto');
const {createApp,hashPassword}=require('../server/server.cjs'),{fresh}=require('../server/domain.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(__dirname,'cache/browser-qa/node_modules/playwright'));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
(async()=>{
  let clock=Date.now(),browser;const app=createApp({dbFile:':memory:',stunUrls:'none',now:()=>clock}),errors=[],results=[];
  try{
    const accounts=[];
    for(const [name,points]of [['AssistWeb',0],['AssistMax',100]]){
      const password=randomBytes(24).toString('hex'),uid=randomUUID(),save=fresh(name);save.partner=6;
      for(const dex of [4,5,6])save.owned[dex]={at:1,iv:Array(8).fill(20)};
      if(points)save.failureProtection={1:{points,losses:8,rev:8,at:clock,last:'seed'}};
      app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,name,name.toLowerCase(),await hashPassword(password),'unused',clock);
      app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(save));accounts.push({name,password,uid});
    }
    app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
    browser=await chromium.launch({channel:'msedge',headless:true});
    const source=fs.readFileSync(path.join(__dirname,'../js/game.js'),'utf8'),anchor='init, startRun, everyone,';
    assert.ok(source.includes(anchor));
    const instrumented=source.replace(anchor,'_qa:{setTime(t){time=t;runReal=performance.now()-t*1000;},endRun}, '+anchor);
    for(const account of accounts){
      const ctx=await browser.newContext({viewport:{width:1280,height:900},locale:'zh-CN'});await ctx.addInitScript(()=>localStorage.setItem('ps.lang','zh'));
      const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.text().includes('[Game]'))errors.push(m.text());});
      await page.route('**/js/game.js',r=>r.fulfill({contentType:'application/javascript',body:instrumented}));
      await page.goto(base+'/dev.html');await page.waitForFunction(()=>!document.getElementById('tap-start').classList.contains('hidden')||!document.getElementById('scr-login').classList.contains('hidden'));
      if(await page.locator('#tap-start').isVisible())await page.locator('#tap-start').click();
      await page.locator('#f-user').fill(account.name);await page.locator('#f-pass').fill(account.password);await page.locator('#btn-auth').click();await page.locator('#scr-menu:not(.hidden)').waitFor();
      async function start(){
        await page.locator('[data-go="play"]').click();await page.locator('#backpack-open:not(.hidden)').waitFor();
        await page.evaluate(()=>{G.Spawner.update=()=>{};G.Events.update=()=>{};G.EnemyMgr.clear();G.Weather.clear();});
      }
      async function advance(target){
        let current=await page.evaluate(()=>G.Game.st.time);
        while(current<target){const next=Math.min(target,current+60);clock+=Math.ceil((next-current)*1000)+100;
          await page.evaluate(async t=>{G.Game._qa.setTime(t);await G.Server.heartbeat();},next);current=next;
        }
      }
      const stored=()=>JSON.parse(app.db.prepare('SELECT payload FROM saves WHERE uid=?').get(account.uid).payload).failureProtection;
      if(account.name==='AssistWeb'){
        for(const points of [0,0,5]){
          await start();await advance(5);const response=page.waitForResponse(r=>r.url().endsWith('/api/run/end'));
          await page.evaluate(()=>{const p=G.Game.player;p.invuln=0;p.hurt(1e6,null,true);G.Game._qa.endRun(true);});
          const ended=await response;assert.equal(ended.status(),200);const data=await ended.json();assert.equal(data.save.failureProtection[1].points,points);assert.equal(stored()[1].points,points);
          await page.locator('#scr-over:not(.hidden)').waitFor();await page.locator('#btn-again').click();await page.locator('#scr-menu:not(.hidden)').waitFor();
        }
        await start();close(await page.evaluate(()=>G.FailureProtection.xpFactor(G.Game.player)),1.015);
        assert.equal(await page.evaluate(()=>G.Game.runClean()),true);
        results.push({shortDeaths:3,persistedPoints:5,nextRunXp:1.015});
      }else{
        await start();close(await page.evaluate(()=>G.FailureProtection.xpFactor(G.Game.player)),1.3);
        const savedHit=await page.evaluate(()=>{const p=G.Game.player,hp=p.hp,random=Math.random;try{Math.random=()=>0;p.invuln=0;const hit=p.hurt(1e6,null,true);return {hit,hp:p.hp,before:hp,dead:p.dead,invuln:p.invuln};}finally{Math.random=random;}});
        assert.equal(savedHit.hit,false);assert.equal(savedHit.hp,savedHit.before);assert.equal(savedHit.dead,false);assert.ok(savedHit.invuln>0);
        await page.evaluate(()=>{const random=Math.random;let i=0;try{Math.random=()=>i++%2===0?.3:0;G.BossRewards.receive(999,{rift:false,options:['leftovers','quickclaw','focussash']});}finally{Math.random=random;}});
        await page.locator('#scr-item:not(.hidden)').waitFor();assert.equal(await page.locator('#item-cards .card').count(),3);assert.equal(await page.locator('#item-cards .card.evo').count(),2);
        await page.locator('#item-cards .card:not(.evo)').click();await page.locator('#scr-item').waitFor({state:'hidden'});
        await page.keyboard.press('e');await page.locator('#scr-backpack:not(.hidden)').waitFor();
        const paused=await page.evaluate(()=>G.Game.st.time);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>G.Game.st.time),paused);close(await page.evaluate(()=>G.FailureProtection.xpFactor(G.Game.player)),1.3);
        assert.ok(!/失败保护|失败系数/.test(await page.locator('#scr-backpack').textContent()));
        await page.keyboard.press('e');await page.locator('#scr-backpack').waitFor({state:'hidden'});
        await page.evaluate(()=>G.Game.setSpeed(2));await advance(599.8);
        const before=await page.evaluate(()=>({time:G.Game.st.time,xp:G.FailureProtection.xpFactor(G.Game.player)}));assert.ok(before.time<600);close(before.xp,1.3);
        await page.waitForFunction(()=>G.Game.st.time>=600);
        close(await page.evaluate(()=>G.FailureProtection.xpFactor(G.Game.player)),1);assert.equal(stored()[1].points,100);
        await page.screenshot({path:path.join(__dirname,'cache/failure-protection-ten-minutes.png'),animations:'disabled'});
        await advance(721);await page.waitForFunction(()=>G.DB.save.failureProtection[1].points===0);assert.equal(stored()[1].points,0);assert.equal(stored()[1].losses,0);
        const response=page.waitForResponse(r=>r.url().endsWith('/api/run/end'));await page.evaluate(()=>G.Game.quit());const ended=await response;assert.equal(ended.status(),200);assert.equal((await ended.json()).save.failureProtection[1].points,0);
        await page.reload();await page.waitForFunction(()=>typeof G!=='undefined'&&G.DB.save?.failureProtection?.[1]?.points===0);
        results.push({maxXp:1.3,lethalIgnored:true,bossOptions:2,pauseStopsClock:true,doubleSpeedUsesTopClock:true,tenMinuteCutoff:true,twelveMinuteReset:true,reloadKeepsReset:true});
      }
      await ctx.close();
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,results,pageErrors:0}));
  }finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

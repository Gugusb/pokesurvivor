/* Real support casts and bag UI, isolated memory database and disposable account. */
const assert=require('node:assert/strict'),path=require('node:path'),{once}=require('node:events'),{randomBytes,randomUUID}=require('node:crypto');
const {createApp,hashPassword}=require('../server/server.cjs'),{fresh}=require('../server/domain.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(__dirname,'cache/browser-qa/node_modules/playwright'));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
(async()=>{
  const app=createApp({dbFile:':memory:',stunUrls:'none'}),errors=[],results=[];let browser;
  try{
    const name='BaseBuffFixture',password=randomBytes(24).toString('hex'),uid=randomUUID(),save=fresh(name);save.partner=6;
    for(const dex of [4,5,6])save.owned[dex]={at:1,iv:[10,31,8,20,17,27,14,24]};
    app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,name,name.toLowerCase(),await hashPassword(password),'unused',Date.now());
    app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(save));
    app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
    browser=await chromium.launch({channel:'msedge',headless:true});
    for(const lang of ['zh','en','es']){
      const ctx=await browser.newContext({viewport:{width:1280,height:960},locale:lang==='zh'?'zh-CN':lang});await ctx.addInitScript(l=>localStorage.setItem('ps.lang',l),lang);
      const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.text().includes('[Game]'))errors.push(m.text());});
      await page.goto(base+'/dev.html');await page.waitForFunction(()=>!document.getElementById('tap-start').classList.contains('hidden')||!document.getElementById('scr-login').classList.contains('hidden'));
      if(await page.locator('#tap-start').isVisible())await page.locator('#tap-start').click();
      await page.locator('#f-user').fill(name);await page.locator('#f-pass').fill(password);await page.locator('#btn-auth').click();await page.locator('#scr-menu:not(.hidden)').waitFor();
      await page.locator('[data-go="play"]').click();await page.locator('#backpack-open:not(.hidden)').waitFor();
      await page.evaluate(()=>{G.Game.debugMark();G.Spawner.update=()=>{};G.Events.update=()=>{};G.EnemyMgr.clear();G.Game.player.invuln=10000;});
      await page.keyboard.press('e');await page.locator('#scr-backpack:not(.hidden)').waitFor();
      const state=await page.evaluate(()=>{
        const p=G.Game.player;p.ability=null;p.specialItems={};p.regenFlat=p.regenBase=0;p.maxHp=1000;p.hp=400;p.atkMul=1.3;p.spdMul=1.2;p.inLiquid=false;p.slowT=0;G.Weather.clear();
        Object.assign(p.statGrowth,{atk:.8,spa:.4,spd:.7,defense:.5,spdef:.3});Object.assign(p.permanentGrowth,{atk:.2,spa:.1,spd:.1,defense:.15,spdef:.1});
        p.moves=['swords-dance','harden','agility','aqua-ring'].map(id=>G.Moves.instance(id,5));p.slots=p.moves.map(m=>[m]);
        for(const [i,m]of p.moves.entries()){p.active=i;for(let j=0;j<m.stacks;j++){m.t=0;G.Combat.tick(0,p,0);}}
        p.active=0;G.BackpackUI.refresh(p);
        return {atk:p.atk/p.baseAtk,spa:p.spa/p.baseSpa,spd:p.spd/p.baseSpd,def:p.defenseFor({kind:'contact'})/p.baseDefense,spdef:p.defenseFor({kind:'ranged'})/p.baseSpDef,reduction:p.reduction,regen:p.regen,rows:G.PlayerStats.rows(p),pp:p.moves.map(m=>G.MovePP.state(p,m).current)};
      });
      close(state.atk,(1.8+1.7836)*1.3);close(state.spa,(1.4+1.7836)*1.3);close(state.spd,(1.7+1.372)*1.2);close(state.def,1.5+.9604);close(state.spdef,1.3+.9604);close(state.reduction,0);close(state.regen,600*.18816);assert.deepEqual(state.pp,[3,3,3,4]);
      for(const r of state.rows)close(r.total,r.base+r.permanent+r.fruit+r.skills+r.other);
      for(const key of ['atk','spa','defense','spdef','spd'])assert.notEqual(await page.locator(`[data-stat="${key}"] .bag-skills`).textContent(),'(+0)');
      const aqua=page.locator('#backpack-moves details[data-move="aqua-ring"]');await aqua.locator('summary').click();const aquaText=await aqua.getAttribute('title');assert.ok(aquaText.includes((lang==='es'?'3,14':'3.14')+'% ×6'));assert.ok(aquaText.includes(({zh:'每秒恢复已损失生命',en:'Missing HP restored per second',es:'Vida perdida recuperada por segundo'})[lang]));
      const swordText=await page.locator('#backpack-moves details[data-move="swords-dance"]').getAttribute('title');assert.ok(swordText.includes((lang==='es'?'25,48':'25.48')+'% ×7'));
      await page.screenshot({path:path.join(__dirname,`cache/base-buffs-${lang}.png`),animations:'disabled'});
      await page.setViewportSize({width:320,height:740});assert.ok(await page.locator('.bag-panel').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await page.screenshot({path:path.join(__dirname,`cache/base-buffs-${lang}-mobile.png`),animations:'disabled'});
      // Resume normal game frames with a damage move; support buffs must keep healing.
      await page.evaluate(()=>{const p=G.Game.player,m=G.Moves.instance('tackle');p.moves=p.moves.filter(x=>x.id!=='swords-dance');p.moves.push(m);p.slots[0]=[m];p.active=0;});await page.keyboard.press('e');await page.locator('#scr-backpack').waitFor({state:'hidden'});
      await page.waitForFunction(()=>G.Game.player.hp>410);const hp=await page.evaluate(()=>G.Game.player.hp);assert.ok(hp>400&&hp<1000);
      results.push({lang,baseStats:true,dualDefense:true,missingHpHealing:true,pp:true,backpack:true,mobile:true});await ctx.close();
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,results,pageErrors:errors.length}));
  }finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

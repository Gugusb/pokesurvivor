/* Real UI/input flows, isolated in-memory account; no player saves are touched. */
const assert=require('node:assert/strict'),path=require('node:path'),{once}=require('node:events'),{randomBytes,randomUUID}=require('node:crypto');
const {createApp,hashPassword}=require('../server/server.cjs'),{fresh}=require('../server/domain.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(__dirname,'cache/browser-qa/node_modules/playwright'));
(async()=>{
 const app=createApp({dbFile:':memory:',stunUrls:'none'}),errors=[],results=[];let browser;
 try{
  const name='ItemsFixture',password=randomBytes(24).toString('hex'),uid=randomUUID(),save=fresh(name);save.partner=6;save.megaStones['6-mega-x']={at:1};
  for(const dex of [4,5,6])save.owned[dex]={at:1,iv:Array(8).fill(31)};
  app.db.prepare('INSERT INTO users(uid,name,lower,pass,recovery,created) VALUES(?,?,?,?,?,?)').run(uid,name,name.toLowerCase(),await hashPassword(password),'unused',Date.now());
  app.db.prepare('INSERT INTO saves(uid,payload) VALUES(?,?)').run(uid,JSON.stringify(save));app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
  for(const built of (process.argv.includes('--built')?[true]:process.argv.includes('--source')?[false]:[false,true]))for(const lang of (process.argv.includes('--zh')?['zh']:['zh','en','es'])){
   const c=await browser.newContext({viewport:{width:1280,height:900},locale:lang==='zh'?'zh-CN':lang});
   await c.addInitScript(lang=>{localStorage.setItem('ps.lang',lang);localStorage.setItem('ps.dev.enabled','true');window.qaText=[];const f=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(t,...a){window.qaText.push(String(t));if(window.qaText.length>10000)window.qaText.splice(0,5000);return f.call(this,t,...a);};},lang);
   const page=await c.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.text().includes('[Game]')){errors.push(m.text());console.error(m.text());}});await page.goto(base+(built?'/':'/dev.html'));
   await page.waitForFunction(()=>!document.getElementById('tap-start').classList.contains('hidden')||!document.getElementById('scr-login').classList.contains('hidden'));if(await page.locator('#tap-start').isVisible())await page.locator('#tap-start').click();
   await page.locator('#f-user').fill(name);await page.locator('#f-pass').fill(password);await page.locator('#btn-auth').click();try{await page.locator('#scr-menu:not(.hidden)').waitFor();}catch(e){console.error('Login diagnostics:',JSON.stringify({lang,built,text:await page.locator('#scr-login').innerText()}));throw e;}
   assert.equal(await page.locator('#menu-active-item').count(),0);
   await page.locator('[data-go="dex"]').click();await page.locator('#dex-grid [data-dex="6"]').click();
   assert.equal(await page.locator('#dex-carried-item option[value^="z:"]:disabled').count(),18);
   await page.locator('#dex-carried-item').selectOption('mega:6-mega-x');await page.locator('#dex-equip-item').click();assert.equal(await page.locator('#dex-carried-item').inputValue(),'mega:6-mega-x');
   await page.locator('#dex-carried-item').selectOption('none');await page.locator('#dex-equip-item').click();assert.equal(await page.locator('#dex-carried-item').inputValue(),'none');
   for(const id of ['pppotion','spiritspray']){await page.locator('#dex-carried-item').selectOption(id);await page.locator('#dex-equip-item').click();assert.equal(await page.locator('#dex-carried-item').inputValue(),id);}
   await page.locator('#dex-carried-item').selectOption('superpotion');await page.locator('#dex-equip-item').click();assert.equal(await page.locator('#dex-carried-item').inputValue(),'superpotion');
   await page.screenshot({path:path.join(__dirname,`cache/items-${built?'built':'source'}-${lang}-equipment.png`),animations:'disabled'});
   await page.locator('#scr-dex [data-back]').click();
   await page.locator('#btn-settings').click();await page.locator('#set-tabs [data-t="ctl"]').click();assert.equal(await page.locator('[data-k="castMode"]').count(),3);
   for(const v of ['auto','click','toggle'])await page.locator(`[data-k="castMode"][data-v="${v}"]`).click();
   await page.screenshot({path:path.join(__dirname,`cache/items-${built?'built':'source'}-${lang}-settings.png`),animations:'disabled'});await page.locator('#set-close').click();
   await page.locator('[data-go="play"]').click();await page.locator('#scr-menu').waitFor({state:'hidden'});await page.waitForFunction(()=>window.qaText.some(t=>/^PP \d+\/\d+$/.test(t)));
   if(!built){
    await page.evaluate(()=>{
     G.Game.debugMark();G.Spawner.update=()=>{};G.Events.update=()=>{};G.EnemyMgr.clear();G.Projectiles.clear();G.Hazards.clear();const p=G.Game.player;p.ability=null;p.invuln=1000;p.maxHp=1000;p.hp=100;
     const m=G.Moves.instance('ember');m.cd=.25;p.moves=[m];p.slots=[[m]];p.active=0;p.xpNext=1e12;
     const e=new G.Enemy({dex:143,hp:1e9,dmg:0,spd:0,xp:0,behavior:'ranged'},p.x+100,p.y,{hp:1,spd:1,dmg:1});e.update=()=>{};G.EnemyMgr.add(e);G.EnemyMgr.rebuildGrid();p.target=e;
     const cast=p.cast.bind(p);window.qaCasts=0;p.cast=m=>{window.qaCasts++;cast(m);};
    });
    assert.equal(await page.evaluate(()=>window.qaCasts),0);await page.keyboard.press('1');await page.waitForFunction(()=>window.qaCasts>=1);
    await page.keyboard.press('1');const count=await page.evaluate(()=>{window.qaStoppedAt=G.Game.st.time;return window.qaCasts;});await page.waitForFunction(()=>G.Game.st.time>window.qaStoppedAt+.5);assert.equal(await page.evaluate(()=>window.qaCasts),count);
    await page.keyboard.press('0');await page.waitForFunction(()=>G.Game.player.activeItemCd>0);const healed=await page.evaluate(()=>({hp:G.Game.player.hp,cd:G.Game.player.activeItemCd}));assert.equal(healed.hp,400);assert.ok(healed.cd>29&&healed.cd<=30);
    await page.keyboard.press('Escape');await page.locator('#btn-pause-settings').click();await page.locator('#set-tabs [data-t="ctl"]').click();await page.locator('[data-k="castMode"][data-v="click"]').click();await page.locator('#set-close').click();await page.locator('#btn-resume').click();
    await page.evaluate(()=>{G.Game.player.moves[0].t=0;window.qaCasts=0;});await page.keyboard.press('1');await page.waitForFunction(()=>window.qaCasts===1);await page.evaluate(()=>{window.qaStoppedAt=G.Game.st.time;});try{await page.waitForFunction(()=>G.Game.st.time>window.qaStoppedAt+.5);}catch(e){console.error('Click diagnostics',await page.evaluate(()=>({state:G.Game.state,time:G.Game.st.time,stoppedAt:window.qaStoppedAt,casts:window.qaCasts,hp:G.Game.player.hp,screens:[...document.querySelectorAll('.scr:not(.hidden)')].map(e=>e.id)})));throw e;}assert.equal(await page.evaluate(()=>window.qaCasts),1);
    await page.evaluate(()=>{const p=G.Game.player;for(const id of ['leftovers','leftovers','candyjar'])G.Pickups.drop('item',p.x,p.y,id);});await page.waitForFunction(()=>G.Items.count(G.Game.player,'leftovers')===2&&G.Items.count(G.Game.player,'candyjar')===1);
    await page.evaluate(()=>{const p=G.Game.player;p.activeItem='pppotion';p.activeItemCd=0;G.MovePP.state(p,p.moves[0]).current=0;});await page.keyboard.press('0');await page.waitForFunction(()=>G.Game.player.ppPotionReady===20);
    await page.keyboard.press('1');await page.waitForFunction(()=>G.Game.player.ppPotionReady===0);assert.ok(await page.evaluate(()=>G.MovePP.state(G.Game.player,G.Game.player.moves[0]).current>=13));
    await page.evaluate(()=>{const p=G.Game.player;p.activeItem='spiritspray';p.activeItemCd=0;window.reserveBefore=p.tempPP;});await page.keyboard.press('0');await page.waitForFunction(()=>G.Game.player.tempPP-window.reserveBefore===15);assert.ok(await page.evaluate(()=>G.Game.player.activeItemCd>89));
    await page.screenshot({path:path.join(__dirname,`cache/pp-items-${lang}.png`),animations:'disabled'});
    const sealed=await page.evaluate(()=>{const p=G.Game.player;G.Pickups.clear();const e=new G.Enemy({dex:143,hp:1,dmg:0,spd:0,xp:0,behavior:'melee'},p.x+140,p.y,{hp:1,spd:1,dmg:1},true);G.EnemyMgr.add(e);e.die();const list=G.Pickups.all();window.qaWorldChest=list.find(o=>o.kind==='bossChest');return list.length===1&&!!window.qaWorldChest;});assert.ok(sealed);
    await page.screenshot({path:path.join(__dirname,`cache/boss-chest-${lang}.png`),animations:'disabled'});
    await page.evaluate(()=>{const p=G.Game.player,c=window.qaWorldChest;G.Items.rewardChoices=()=>['leftovers','quickclaw','focussash'];p.x=c.x;p.y=c.y;});await page.locator('#scr-item:not(.hidden)').waitFor();assert.equal(await page.locator('#item-cards .card').count(),3);await page.locator('#item-cards [data-item="leftovers"]').click();
    const won=await page.evaluate(()=>{
     const p=G.Game.player,before=p.bonds;G.Items.rewardChoices=()=>['linker','luckymedal','candyjar'];G.Rift.debugArena('fire');const e=G.EnemyMgr.get(G.Rift.arena.bossId);e.hurt(1e12,'#fff',0,0,0,null,p);G.Rift.update(.01,p,G.Game.st.time);const noBond=p.bonds===before;G.Rift.update(5.1,p,G.Game.st.time);const chest=G.Pickups.all().find(o=>o.kind==='bossChest');if(!chest)throw Error('Rift chest missing');G.BossRewards.open(chest);G.Pickups.removeId(chest.id);return {noBond,leftArena:!G.Rift.inArena,clearedWorld:!G.World.arena};
    });
    assert.ok(won.noBond&&won.leftArena&&won.clearedWorld);await page.locator('#scr-item:not(.hidden)').waitFor();assert.equal(await page.locator('#item-cards .card').count(),3);
    await page.screenshot({path:path.join(__dirname,`cache/items-source-${lang}-rift-reward.png`),animations:'disabled'});await page.locator('#item-cards [data-item="candyjar"]').click();assert.equal(await page.evaluate(()=>G.Items.count(G.Game.player,'candyjar')),2);
    await page.evaluate(()=>G.Game.offerSpecialChoice(['luckymedal','focussash','bugnet']));await page.locator('#item-cards [data-item="luckymedal"]').click();await page.evaluate(()=>{G.Game.player.xp=0;G.Pickups.clear();G.Game.debugLevelUp();});await page.locator('#scr-levelup:not(.hidden)').waitFor();assert.equal(await page.locator('#cards .card').count(),4);await page.locator('#lvl-reroll').click();assert.equal(await page.locator('#cards .card').count(),4);await page.locator('#cards .card').first().click();
    await page.evaluate(()=>{const p=G.Game.player;const list=['hp','atk','spa','heal'].map(id=>{const s=G.LevelUp.STATS.find(c=>c.id===id);return {...s,type:'stat',tag:'Mejora',color:'#83cdae'};});G.RunUI.showLevelUp(p.level,list,c=>c.apply(p));});
    assert.equal(await page.locator('#cards .ico img').count(),4);const images=await page.locator('#cards .ico img').evaluateAll(es=>es.map(e=>e.src));assert.equal(new Set(images).size,4);
    await page.screenshot({path:path.join(__dirname,`cache/items-source-${lang}-berries-potion.png`),animations:'disabled'});await page.locator('#cards .card').last().click();
    await page.evaluate(()=>G.Items.gain(G.Game.player,'focussash'));await page.evaluate(()=>{const p=G.Game.player;p.invuln=p.dashGuardT=0;p.hurt(1e8,null,true);});assert.equal(await page.evaluate(()=>G.Items.count(G.Game.player,'focussash')),0);assert.equal(await page.evaluate(()=>G.Game.player.dead),false);
    await page.keyboard.press('Escape');await page.locator('#scr-pause:not(.hidden)').waitFor();assert.ok((await page.locator('#pause-items').textContent()).includes('×2'));await page.screenshot({path:path.join(__dirname,`cache/items-source-${lang}-bag.png`),animations:'disabled'});await page.locator('#btn-resume').click();
    await page.evaluate(()=>{const p=G.Game.player;p.moves=['ember','water-gun','tackle','hail'].map(id=>G.Moves.instance(id));p.slots=p.moves.map(m=>[m]);p.active=0;G.ZMoves.grant(G.DB.save,'fire');G.ZMoves.equip(G.DB.save,p.ivDex||p.dex,'fire');G.ZMoves.init(p,G.DB.save);G.Spawner.say('',0,true);});
    const mechanics=await page.evaluate(()=>{
     const p=G.Game.player;G.Settings.set('castMode','toggle');G.MoveControl.input(p,1);const first=G.MoveControl.wants(p,p.slots[1][0]);G.MoveControl.input(p,1);const paused=!G.MoveControl.wants(p,p.slots[1][0]);G.MoveControl.input(p,2);G.MoveControl.input(p,1);const resumed=G.MoveControl.wants(p,p.slots[1][0]);
     const removed=!G.Items.gain(p,'choiceband');const a=p.slots[0][0],b=p.slots[1][0];G.MovePP.state(p,a).current=G.MovePP.state(p,b).current=0;G.MovePP.tick(p,.1);const blocked=removed&&G.MovePP.state(p,a).current>0&&G.MovePP.state(p,b).current>0;
     G.EnemyMgr.clear();const config={dex:113,hp:100,dmg:0,spd:0,xp:0};const h=new G.Enemy({...config,behavior:'healer'},p.x+30,p.y,{hp:1,spd:1,dmg:1});const sh=new G.Enemy({...config,dex:213,behavior:'shielder'},p.x+40,p.y,{hp:1,spd:1,dmg:1});const target=new G.Enemy({...config,dex:143,behavior:'ranged'},p.x+60,p.y,{hp:1,spd:1,dmg:1});[h,sh,target].forEach(e=>G.EnemyMgr.add(e));G.EnemyMgr.rebuildGrid();for(let i=0;i<3;i++){target.hp=1;h.healAround();sh.castShields();}target.hp=1;target.shield=0;const exhausted=!h.healAround()&&!sh.castShields()&&target.hp===1&&target.shield===0;
     return {first,paused,resumed,blocked,exhausted,potionAbsent:p.activeItem===null};
    });assert.ok(Object.values(mechanics).every(Boolean),JSON.stringify(mechanics));
    results.push({lang,toggleAndClick:true,activePotion:true,stackedItems:true,riftThreeChoices:true,luckyRerollFour:true,coloredBerriesAndPotion:true,focusSashConsumed:true});
   }else{
    await page.keyboard.press('F2');await page.locator('#dev-panel [data-dev="damage"]').click();await page.keyboard.press('F2');await page.evaluate(()=>{window.qaText=[];});await page.keyboard.press('0');await page.waitForFunction(()=>window.qaText.some(t=>t==='30s'||t==='29s'));assert.equal(await page.evaluate(()=>typeof G),'undefined');
   }
   if(await page.locator('.toast').count())await page.locator('.toast').waitFor({state:'hidden',timeout:5000});
   await page.evaluate(()=>{window.qaText=[];});await page.waitForFunction(()=>window.qaText.some(t=>/^PP \d+\/\d+$/.test(t)));await page.screenshot({path:path.join(__dirname,`cache/items-${built?'built':'source'}-${lang}-gameplay.png`),animations:'disabled'});
   await page.setViewportSize({width:320,height:740});await page.screenshot({path:path.join(__dirname,`cache/items-${built?'built':'source'}-${lang}-mobile.png`),animations:'disabled'});await c.close();
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,built:!process.argv.includes('--source'),languages:process.argv.includes('--zh')?1:3,results,pageErrors:errors.length},null,2));
 }catch(e){console.error("Page errors:",JSON.stringify(errors));throw e;}finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

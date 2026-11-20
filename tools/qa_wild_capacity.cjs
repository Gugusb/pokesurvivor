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
  const ctx=await browser.newContext({viewport:mobile?(landscape?{width:844,height:390}:{width:390,height:844}):{width:1360,height:900},isMobile:mobile,hasTouch:mobile});await ctx.addInitScript(l=>localStorage.setItem('ps.lang',l),lang);const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error'&&m.text().includes('[Game]')){errors.push(m.text());console.error(m.text());}});p.on('dialog',d=>d.accept());
  await p.goto(base+'/dev.html');await p.locator('#tap-start:not(.hidden),#scr-login:not(.hidden)').first().waitFor();if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#f-user').fill(name);await p.locator('#f-pass').fill(pass);await p.locator('#btn-auth').click();await p.locator('#scr-menu:not(.hidden)').waitFor();await p.locator('[data-go=play]').click();await p.locator('#journey-captain').waitFor();



  await p.locator('#journey-captain').selectOption('4');
  await p.locator('.journey-prep-actions button').last().click();await p.locator('.journey-prep-actions button').last().click();await p.locator('.journey-grid').waitFor();
  const initial=await p.evaluate(()=>{
    const r=G.Expedition.run;r.gold=30;for(const dex of [1,7,10,16])G.Squad.recruit(dex);r.map[1][3].kind='wild';G.Expedition.choose(1,3);for(const o of r.wildOffers)r.unitPool.putBack(o);
    const root=G.MonProgression.rootFor(133);r.unitPool.stock.set(root,r.unitPool.stock.get(root)-1);r.wildOffers=[{kind:'mon',dex:133,moveId:G.FIXED_SKILLS[133],cost:G.ExpeditionQuality.quality(133),rank:1,reserved:true}];window.wildOffer=r.wildOffers[0];G.Expedition.refreshScreen();return {gold:r.gold,stock:r.unitPool.stock.get(root),member:G.Squad.roster[0].squadId};
  });
  assert.equal(await p.locator('[data-wild-capture]').textContent(),'整理仓库后领取');await p.locator('[data-wild-capture]').click();await p.locator('#scr-squad:not(.hidden)').waitFor();
  const full=await p.evaluate(()=>({gold:G.Expedition.run.gold,stock:G.Expedition.run.unitPool.stock.get(133),sold:!!wildOffer.sold,same:G.Expedition.run.wildOffers[0]===wildOffer,count:G.Squad.roster.length}));assert.deepEqual(full,{gold:initial.gold,stock:initial.stock,sold:false,same:true,count:4});
  await p.locator('#squad-close').click();await p.locator('[data-wild-capture]').waitFor();assert.equal(await p.evaluate(()=>G.Expedition.run.wildOffers[0]===wildOffer),true);assert.match(await p.locator('#journey-wild-next').textContent(),/跳过未领取/);
  await p.locator('[data-wild-capture]').click();await p.locator('[data-squad-select="'+initial.member+'"]').click();await p.locator('#squad-release').click();await p.locator('#squad-close').click();await p.locator('[data-wild-capture]').waitFor();assert.equal(await p.locator('[data-wild-capture]').textContent(),'捕获');await p.locator('[data-wild-capture]').click();assert.equal(await p.locator('[data-wild-capture]').textContent(),'已领取');assert.equal(await p.locator('[data-wild-capture]').isDisabled(),true);
  assert.ok(await p.evaluate(()=>G.Expedition.run.wildOffers[0].sold&&G.Squad.roster.some(p=>p.dex===133)));
  await p.evaluate(()=>{const r=G.Expedition.run;r.wildOffers=[{kind:'mon',dex:133,rank:1,moveId:G.FIXED_SKILLS[133],cost:G.ExpeditionQuality.quality(133)}];G.Expedition.refreshScreen();});assert.equal(await p.locator('[data-wild-capture]').textContent(),'捕获');await p.locator('[data-wild-capture]').click();await p.locator('#squad-rankup[data-rank="2"]').waitFor();await p.locator('#squad-rankup .btn').click();assert.ok(await p.evaluate(()=>G.Squad.roster.some(p=>G.MonProgression.rootFor(p.dex)===133&&p.rank===2)));assert.equal(await p.locator('[data-wild-capture]').isDisabled(),true);
  await p.locator('#journey-wild-next').click();await p.locator('.journey-grid').waitFor();assert.deepEqual(errors,[]);console.log('Wild full-capacity regression passed: no lost offer/gold/pool reservation; return without changes; release through squad UI, return and capture once; full-reserve merge still works; next day remains available.');await ctx.close();
 }
}finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

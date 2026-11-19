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
  app.db.prepare("UPDATE users SET role='admin' WHERE uid=?").run(uid);
  const ctx=await browser.newContext({viewport:mobile?(landscape?{width:844,height:390}:{width:390,height:844}):{width:1360,height:900},isMobile:mobile,hasTouch:mobile});await ctx.addInitScript(l=>localStorage.setItem('ps.lang',l),lang);const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error'&&m.text().includes('[Game]')){errors.push(m.text());console.error(m.text());}});p.on('dialog',d=>d.accept());
  await p.goto(base+'/dev.html');await p.locator('#tap-start:not(.hidden),#scr-login:not(.hidden)').first().waitFor();if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#f-user').fill(name);await p.locator('#f-pass').fill(pass);await p.locator('#btn-auth').click();await p.locator('#scr-menu:not(.hidden)').waitFor();await p.locator('[data-go=play]').click();await p.locator('#journey-captain').waitFor();





  await p.locator('#journey-captain').selectOption('4');await p.locator('.journey-prep-actions button').last().click();await p.locator('.journey-prep-actions button').last().click();await p.locator('.journey-grid').waitFor();


  const sample=await p.evaluate(()=>{
    const r=G.Expedition.run;r.trainerLevel=10;G.Squad.syncTrainer();const team=[r.captain,...[1,7,16,19,21].map(d=>G.Squad.recruit(d))];for(const a of team){a.moves=[G.Moves.instance('razor-leaf',2)];a.slots=[a.moves];a.active=0;}G.Squad.refresh();
    r.map[1][3].kind='battle';G.Expedition.choose(1,3);G.CardPacks.normalize(G.DB.save);G.DB.save.cardPack.taken['speed:3']=1;G.Game.setSpeed(3);G.Game.expeditionPause();G.EnemyMgr.clear();G.Projectiles.clear();G.Combat.clearFields();
    const member=team[1],enemy=new G.Enemy({dex:7,hp:1e12,spd:0,dmg:0,xp:0,behavior:'chase'},member.x+70,member.y,{hp:1,spd:1,dmg:1});enemy.expedition=true;G.EnemyMgr.add(enemy);G.EnemyMgr.rebuildGrid();member.target=enemy;member.aim=0;const m=member.moves[0];m.count=1;m.t=0;G.Combat.tick(.001,member,0);const shot=G.Projectiles.all()[0];const base=shot.dmg,original=shot.r;
    for(let i=0;i<160;i++){G.SquadBonds.onPierce(shot);shot.pierce--;}
    if(shot.r>Math.min(original*6,128))throw Error('size overflow');if(Math.abs(shot.dmg/(base*1.2**160)-1)>1e-6)throw Error('damage growth');
    const started=performance.now();for(let i=0;i<50;i++){G.World.propsInCircle(member.x,member.y,shot.r);G.EnemyMgr.queryCircle(member.x,member.y,shot.r);G.Projectiles.update(.001,r.captain,G.EnemyMgr.all());G.Combat.resolve(.001,r.captain,i*.001);G.Projectiles.drawSprite(document.createElement('canvas').getContext('2d'),shot);}const ms=performance.now()-started;if(ms>1500)throw Error('collision/render stall '+ms);
    G.Game.expeditionResume();return {radius:shot.r,visualScale:shot.visualScale,damage:shot.dmg,ms};
  });
  await p.waitForTimeout(700);assert.deepEqual(errors,[]);console.log('160 penetrations, real world queries, rendering, and continued 3x combat passed:',sample);await p.screenshot({path:'tools/cache/projectile-growth-fixed.png'});
  await p.goto(base+'/');await p.locator('#tap-start:not(.hidden),#scr-menu:not(.hidden)').first().waitFor();if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#scr-menu:not(.hidden)').waitFor();assert.equal(await p.evaluate(()=>typeof window.G),'undefined');await p.locator('[data-go=play]').click();await p.locator('#journey-captain').waitFor();assert.deepEqual(errors,[]);await ctx.close();
 }
}finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

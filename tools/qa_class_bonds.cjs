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

  await p.evaluate(()=>{
    const r=G.Expedition.run;r.trainerLevel=10;G.Squad.syncTrainer();const team=[r.captain,...[1,7,16,19,21].map(d=>G.Squad.recruit(d))];
    team.forEach((a,i)=>{a.moves=[G.Moves.instance(['ember','razor-leaf','flamethrower'][i%3],2)];a.slots=[a.moves];a.active=0;});G.Squad.refresh();
    if(G.SquadBonds.count('skill','cone')!==6)throw Error('unified counts');G.SquadUI.show({editable:true});
  });
  await p.getByRole('button',{name:'职业',exact:true}).click();assert.equal(await p.locator('[data-bond=projectile]').count(),1);assert.match(await p.locator('[data-bond=projectile]').innerText(),/6.*6/s);assert.match(await p.locator('[data-bond=projectile]').innerText(),/体积与伤害/);await p.waitForFunction(()=>getComputedStyle(document.getElementById('scr-squad')).opacity==='1');await p.screenshot({animations:'disabled',path:'tools/cache/class-bonds-formation.png',fullPage:true});await p.locator('#squad-close').click();
  const combat=await p.evaluate(()=>{
    const r=G.Expedition.run;r.map[1][3].kind='battle';G.Expedition.choose(1,3);G.Game.expeditionPause();G.EnemyMgr.clear();G.Combat.clearFields();G.Projectiles.clear();
    const near=(a,b)=>{if(Math.abs(a-b)>1e-6)throw Error(a+' != '+b);};
    const team=G.Squad.actors(),member=team[1];
    function cohort(kind){for(const a of team){a.moves=[G.Moves.instance(G.Moves.ALL.find(m=>m.kind===kind).id,2)];a.slots=[a.moves];a.active=0;a.dead=false;}G.Squad.refresh();return member.moves[0];}
    function foe(x,y){const e=new G.Enemy({dex:7,hp:1e9,spd:0,dmg:0,xp:0,behavior:'chase'},x,y,{hp:1,spd:1,dmg:1});e.expedition=true;G.EnemyMgr.add(e);G.EnemyMgr.rebuildGrid();return e;}
    function cast(m){m.t=0;G.Combat.tick(.001,member,0);}
    let m=cohort('projectile');m.pierce=2;m.count=1;const e=foe(member.x,member.y);member.target=e;member.aim=0;cast(m);let shot=G.Projectiles.all()[0];const damage=shot.dmg,size=shot.r;shot.x=shot.px=e.x;shot.y=shot.py=e.y;G.Combat.resolve(0,r.captain,1);if(Math.abs(shot.dmg-damage*1.2)>1e-6)throw Error(JSON.stringify({state:G.SquadBonds.state('projectile'),shot:{growth:shot.bondPierceGrowth,pierce:shot.pierce,damage:shot.dmg,base:damage},live:G.Projectiles.all().includes(shot),enemyHp:e.hp,block:G.World.projectileBlock(e.x,e.y,shot.r)}));near(shot.dmg,damage*1.2);near(shot.r,size*1.2);if(shot.vis.pal!=='class:projectile')throw Error('palette');
    G.Projectiles.clear();G.EnemyMgr.clear();G.Combat.clearFields();m=cohort('orbit');const target=foe(member.x+90,member.y);member.target=target;cast(m);shot=G.Projectiles.all()[0];if(!shot.bondOrbitShot||shot.homing!==0||!shot.ignoreTerrain)throw Error('orbit launch');const slot=shot.orbitSlot;G.Projectiles.remove(shot);G.Combat.tick(.1,member,.1);if(G.Projectiles.all().some(s=>s.orbitSlot===slot))throw Error('instant refill');member.moves[0].t=0;G.Combat.tick(.001,member,.101);if(!G.Projectiles.all().some(s=>s.orbitSlot===slot))throw Error('cooldown refill');
    G.Projectiles.clear();G.EnemyMgr.clear();G.Combat.clearFields();m=cohort('mine');member.x=r.captain.x;member.y=r.captain.y;const boss=foe(member.x,member.y);boss.boss=true;m.count=1;cast(m);G.Combat.updateFields(.36);near(boss.classStunT,1);boss.draw(document.createElement('canvas').getContext('2d'));
    G.Projectiles.clear();G.EnemyMgr.clear();G.Combat.clearFields();m=cohort('turret');for(const off of [80,100,120])foe(member.x+off,member.y+off/2);cast(m);G.Combat.updateFields(.3);if(G.Projectiles.count!==3)throw Error('turret target count');for(const shot of G.Projectiles.all())G.Projectiles.drawSprite(document.createElement('canvas').getContext('2d'),shot);
    G.SquadBonds.setLayer('skill','summon',800);near(G.SquadBonds.value('summon','turretDamage'),1.25);G.SquadUI.show({editable:false});
    return {projectile:'1.2x',bossStun:boss.classStunT,turretTargets:G.Projectiles.count};
  });
  await p.getByRole('button',{name:'职业',exact:true}).click();assert.match(await p.locator('[data-bond=summon]').innerText(),/召唤/);await p.waitForFunction(()=>getComputedStyle(document.getElementById('scr-squad')).opacity==='1');await p.screenshot({animations:'disabled',path:'tools/cache/class-bonds-summon.png',fullPage:true});assert.deepEqual(errors,[]);console.log('Unified class UI, real cast/collision, class palettes, Boss stun, orbit recovery and turret targets passed:',combat);
  await p.goto(base+'/');await p.locator('#tap-start:not(.hidden),#scr-menu:not(.hidden)').first().waitFor();if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#scr-menu:not(.hidden)').waitFor();assert.equal(await p.evaluate(()=>typeof window.G),'undefined');await p.locator('[data-go=play]').click();await p.locator('#journey-captain').waitFor();assert.deepEqual(errors,[]);await ctx.close();
 }
}finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

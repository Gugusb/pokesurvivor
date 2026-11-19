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



  const result=await p.evaluate(()=>{
    const r=G.Expedition.run;r.trainerLevel=10;G.Squad.syncTrainer();const team=[r.captain,...[1,7,16,19,21].map(d=>G.Squad.recruit(d))];
    function cohort(id){for(const a of team){a.moves=[G.Moves.instance(id,2)];a.slots=[a.moves];a.active=0;}G.Squad.refresh();return team[1].moves[0];}
    cohort('fire-spin');r.map[1][3].kind='battle';G.Expedition.choose(1,3);G.Game.expeditionPause();G.EnemyMgr.clear();G.Pickups.clear();G.Projectiles.clear();G.Combat.clearFields();
    const member=team[1],m=member.moves[0],view=G.PlayerStats.move(member,m).view,R=view.radius;
    function foe(x,y){const e=new G.Enemy({dex:7,hp:1e9,spd:0,dmg:0,xp:0,behavior:'chase'},x,y,{hp:1,spd:1,dmg:1});e.expedition=true;G.EnemyMgr.add(e);G.EnemyMgr.rebuildGrid();return e;}
    const e=foe(member.x+R*1.11,member.y);member.target=e;m.t=0;G.Combat.tick(.001,member,0);if(G.Projectiles.all().some(p=>p.bondOrbitShot))throw Error('out of ring range');e.x=member.x+R*1.09;G.Combat.tick(.001,member,.001);const shots=G.Projectiles.all().filter(p=>p.bondOrbitShot);if(shots.length!==view.count)throw Error('inside range');const factor=shots[0].dmg/(view.dmg*member.attackFor(view));if(Math.abs(factor-1.2)>1e-6)throw Error('shot multiplier');
    for(const kind of ['bomb','magnet'])if(G.Pickups.drop(kind,member.x,member.y)!==null)throw Error('removed pickup');G.Pickups.dropXp(member.x,member.y,140,true);if(G.Pickups.all().some(p=>['bomb','magnet'].includes(p.kind)))throw Error('Boss pickup');G.Pickups.clear();
    G.ExpeditionDamage.reset();G.ExpeditionDamage.record(member,{id:'fire-spin',kind:'orbit',type:'fire',bondDamageContributions:[['orbit',3]]},120,{contributions:[['dragon',2],['trait:terminal-power',2]]});G.ExpeditionDamage.record(member,{id:'ice-beam',kind:'beam',bondDamageKind:'beam',type:'ice'},15);G.ExpeditionDamage.record(member,{id:'typebond-fire',kind:'typebond',type:'fire',typeBondSecondary:true},20);const rows=G.ExpeditionDamage.snapshot();if(rows.filter(p=>p.damage>0).length!==2||rows.find(p=>p.kind==='pokemon').damage!==135||rows.find(p=>p.type==='fire').damage!==20)throw Error('source attribution');
    G.Projectiles.clear();G.EnemyMgr.clear();G.Combat.clearFields();const meteor=cohort('rock-slide');member.target=foe(member.x+60,member.y);meteor.t=0;G.Combat.tick(.001,member,0);G.Combat.updateFields(.5);const draw=G.FX.drawMeteor,vfx=G.VFX.draw,sees=G.Camera.sees;let bodyScale=0,growth=0;try{G.Camera.sees=()=>true;G.FX.drawMeteor=(ctx,f)=>{growth=Math.max(growth,f.r/f.baseR);draw(ctx,f);};G.VFX.draw=(...a)=>{bodyScale=Math.max(bodyScale,a[5]?.scale||0);vfx(...a);};G.Combat.drawAirFields(document.createElement('canvas').getContext('2d'));}finally{G.FX.drawMeteor=draw;G.VFX.draw=vfx;G.Camera.sees=sees;}if(growth!==2||bodyScale<3)throw Error('meteor body scale '+JSON.stringify({growth,bodyScale}));
    G.Projectiles.clear();G.Combat.clearFields();const trail=cohort('toxic');trail.t=0;member.lastPatch=null;G.Combat.tick(.001,member,0);G.Combat.updateFields(.25);const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),ellipse=ctx.ellipse.bind(ctx);let patch;ctx.ellipse=(x,y,rx,...a)=>{patch||={x,y,r:rx};ellipse(x,y,rx,...a);};G.Combat.drawGroundFields(ctx);if(!patch||Math.hypot(patch.x-member.x,patch.y-member.y)<=trail.radius*3)throw Error('trail spread');window.areaResult={patch,owner:{x:member.x,y:member.y},bodyScale,growth};
    return {radius:R,search:R*1.1,shotFactor:factor,bodyScale,growth,patchDistance:Math.hypot(patch.x-member.x,patch.y-member.y),rows:rows.map(r=>({kind:r.kind,type:r.type,damage:r.damage}))};
  });
  await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await p.screenshot({path:'tools/cache/area-expanded.png'});
  const ko=await p.evaluate(()=>{
    const r=G.Expedition.run;for(const a of [...G.Squad.roster])G.Squad.consume(a);G.Combat.clearFields();G.Projectiles.clear();G.EnemyMgr.clear();G.Pickups.clear();G.FX.clear();r.spawned=r.wave.count;r.pendingSpawns=[];for(const m of r.captain.moves)m.t=100;
    const hold=new G.Enemy({dex:7,hp:1e9,spd:0,dmg:0,xp:0,behavior:'chase'},r.captain.x+600,r.captain.y,{hp:1,spd:1,dmg:1});G.EnemyMgr.add(hold);G.CardPacks.normalize(G.DB.save);G.DB.save.cardPack.taken['speed:3']=1;G.Game.expeditionResume();G.Game.setSpeed(3);G.Settings.set('calm',false);
    const e=new G.Enemy({dex:25,hp:1,spd:0,dmg:0,xp:0,behavior:'chase'},r.captain.x+80,r.captain.y-30,{hp:1,spd:1,dmg:1});G.EnemyMgr.add(e);let stops=0;const stop=G.Game.hitStop;G.Game.hitStop=ms=>{stops++;stop(ms);};try{e.hurt(1e6,'#fff',0,0,0,null,r.captain,{kind:'melee',type:'fire'});}finally{G.Game.hitStop=stop;}return {minParts:Math.round(36*[.35,.65,1][G.Settings.fx]),stops};
  });
  await p.waitForTimeout(130);const visible=await p.evaluate(()=>G.FX.count);assert.ok(visible>=ko.minParts,'KO particles vanished at 3x: '+visible);assert.equal(ko.stops,1);await p.screenshot({path:'tools/cache/ko-stronger-3x.png'});assert.deepEqual(errors,[]);console.log('Orbit range/damage, no removed drops, new attribution, meteor body/puddle spread and stronger real-time 3x KO passed:',{...result,ko,visible});
  await p.goto(base+'/');await p.locator('#tap-start:not(.hidden),#scr-menu:not(.hidden)').first().waitFor();if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#scr-menu:not(.hidden)').waitFor();assert.equal(await p.evaluate(()=>typeof window.G),'undefined');await p.locator('[data-go=play]').click();await p.locator('#journey-captain').waitFor();assert.deepEqual(errors,[]);await ctx.close();
 }
}finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

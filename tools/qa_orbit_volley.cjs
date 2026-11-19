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
    const r=G.Expedition.run;r.trainerLevel=10;G.Squad.syncTrainer();const team=[r.captain,...[1,7,16,19,21].map(d=>G.Squad.recruit(d))];for(const a of team){a.moves=[G.Moves.instance('fire-spin',2),G.Moves.instance('ember',2)];a.slots=a.moves.map(m=>[m]);a.active=0;}G.Squad.refresh();if(G.SquadBonds.state('orbit').tier!==6||G.SquadBonds.state('projectile').tier!==6)throw Error('bond counts');
    r.map[1][3].kind='battle';G.Expedition.choose(1,3);G.CardPacks.normalize(G.DB.save);G.DB.save.cardPack.taken['speed:3']=1;G.Game.setSpeed(3);G.Game.expeditionPause();G.EnemyMgr.clear();G.Projectiles.clear();G.Combat.clearFields();
    const member=team[1],m=member.moves[0];m.specializations=['n2'];m.t=0;G.Combat.tick(.001,member,0);const ring=G.Projectiles.all().filter(p=>p.orb&&p.owner===member),want=G.PlayerStats.move(member,m).view.count;if(ring.length!==want)throw Error('full ring');
    function foe(x,y){const e=new G.Enemy({dex:7,hp:1e9,spd:0,dmg:0,xp:0,behavior:'chase'},x,y,{hp:1,spd:1,dmg:1});e.expedition=true;G.EnemyMgr.add(e);G.EnemyMgr.rebuildGrid();return e;}
    const aim=foe(member.x+180,member.y);member.target=aim;G.Combat.tick(.001,member,.001);const first=ring.filter(p=>p.bondOrbitShot);if(first.length!==want)throw Error('volley launch');const shot=first[0],vx=shot.vx,vy=shot.vy;if(shot.homing!==0||shot.pierce!==0||shot.bondPierceGrowth||shot.moveKind!=='orbit'||!shot.ignoreTerrain)throw Error('classification');
    m.t=0;G.Combat.tick(.001,member,.002);if(G.Projectiles.all().filter(p=>p.bondOrbitShot).length!==want*2||!first.every(p=>G.Projectiles.all().includes(p)))throw Error('CD volley refill');
    for(const p of [...G.Projectiles.all()])if(p!==shot)G.Projectiles.remove(p);const len=Math.hypot(aim.x-shot.x,aim.y-shot.y),near=foe(shot.x+vx/420*len*.25,shot.y+vy/420*len*.25);const before=near.hp,far=aim.hp;aim.y+=30;G.EnemyMgr.rebuildGrid();G.Projectiles.clearOrbs(member);G.MovePP.state(member,m).current=0;m.t=0;G.Combat.tick(.001,member,.003);if(!G.Projectiles.all().includes(shot))throw Error('PP removed flight');
    const block=G.World.projectileBlock,props=G.World.propsInCircle,sees=G.Camera.sees;let terrainQueries=0;
    try{G.World.projectileBlock=()=>{terrainQueries++;return 'wall';};G.World.propsInCircle=()=>{terrainQueries++;return [{id:999,solid:true,destructible:true}];};G.Camera.sees=()=>false;G.Projectiles.update(.8,r.captain,G.EnemyMgr.all());if(!G.Projectiles.all().includes(shot)||shot.vx!==vx||shot.vy!==vy)throw Error('straight flight/culling');G.Combat.resolve(.8,r.captain,1);}finally{G.World.projectileBlock=block;G.World.propsInCircle=props;G.Camera.sees=sees;}
    if(terrainQueries||near.hp>=before||aim.hp!==far||G.Projectiles.all().includes(shot))throw Error('first impact');return {ring:want,refill:want,interceptorDamage:before-near.hp,terrainQueries,kind:shot.moveKind,pierce:shot.pierce};
  });
  assert.deepEqual(errors,[]);console.log('Full CD volleys, independent flight, straight terrain bypass, first interception and orbit classification passed:',result);
  await p.goto(base+'/');await p.locator('#tap-start:not(.hidden),#scr-menu:not(.hidden)').first().waitFor();if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#scr-menu:not(.hidden)').waitFor();assert.equal(await p.evaluate(()=>typeof window.G),'undefined');await p.locator('[data-go=play]').click();await p.locator('#journey-captain').waitFor();assert.deepEqual(errors,[]);await ctx.close();
 }
}finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

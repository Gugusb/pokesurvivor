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
  const ctx=await browser.newContext({viewport:mobile?(landscape?{width:844,height:390}:{width:390,height:844}):{width:1360,height:900},isMobile:mobile,hasTouch:mobile});await ctx.addInitScript(l=>localStorage.setItem('ps.lang',l),lang);await ctx.addInitScript(()=>{
    window.audioProbe=[];const A=window.AudioContext||window.webkitAudioContext;if(!A)return;
    const osc=A.prototype.createOscillator;A.prototype.createOscillator=function(){const o=osc.call(this),set=o.frequency.setValueAtTime.bind(o.frequency);o.frequency.setValueAtTime=(v,t)=>{audioProbe.push({kind:'pitch',value:v,at:t});return set(v,t);};return o;};
    const gain=A.prototype.createGain;A.prototype.createGain=function(){const g=gain.call(this),fade=g.gain.exponentialRampToValueAtTime.bind(g.gain);g.gain.exponentialRampToValueAtTime=(v,t)=>{audioProbe.push({kind:'fade',value:v,at:t});return fade(v,t);};return g;};
  });const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error'&&m.text().includes('[Game]')){errors.push(m.text());console.error(m.text());}});p.on('dialog',d=>d.accept());
  await p.goto(base+'/dev.html');await p.locator('#tap-start:not(.hidden),#scr-login:not(.hidden)').first().waitFor();if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#f-user').fill(name);await p.locator('#f-pass').fill(pass);await p.locator('#btn-auth').click();await p.locator('#scr-menu:not(.hidden)').waitFor();await p.locator('[data-go=play]').click();await p.locator('#journey-captain').waitFor();





  await p.locator('#journey-captain').selectOption('4');await p.locator('.journey-prep-actions button').last().click();await p.locator('.journey-prep-actions button').last().click();await p.locator('.journey-grid').waitFor();



  await p.evaluate(()=>{
    const r=G.Expedition.run;r.map[1][3].kind='battle';G.Expedition.choose(1,3);G.Game.expeditionPause();G.EnemyMgr.clear();G.Pickups.clear();G.Projectiles.clear();r.pendingSpawns=[];r.spawned=r.wave.count;r.captain.xpNext=1e9;r.captain.xpMul=1.5;
    const e=new G.Enemy({dex:7,hp:1e9,spd:0,dmg:0,xp:0,behavior:'chase'},r.captain.x+500,r.captain.y,{hp:1,spd:1,dmg:1});G.EnemyMgr.add(e);G.Pickups.drop('xp',r.captain.x+500,r.captain.y,25);G.Pickups.drop('xpBig',r.captain.x+500,r.captain.y,35);window.startXp=r.captain.xp;G.Expedition.tick(r.wave.duration);
    if(r.xpJar!==60||r.captain.xp!==startXp||G.Pickups.all().some(p=>p.kind==='xp'||p.kind==='xpBig'))throw Error('XP storage');
  });
  await p.locator('#journey-loot-next').waitFor();assert.match(await p.locator('#journey-content').innerText(),/本场存入经验罐/);assert.equal(await p.locator('[data-xp-jar]').getAttribute('data-xp-jar'),'60');await p.locator('#journey-loot-next').click();await p.locator('.journey-grid').waitFor();assert.equal(await p.locator('[data-xp-jar]').getAttribute('data-xp-jar'),'60');await p.waitForFunction(()=>getComputedStyle(document.getElementById('scr-journey')).opacity==='1');await p.screenshot({path:'tools/cache/xp-jar-route.png',animations:'disabled'});
  const expected=await p.evaluate(()=>{
    const r=G.Expedition.run;r.map[2][3].kind='battle';G.Expedition.choose(2,3);G.CardPacks.normalize(G.DB.save);G.DB.save.cardPack.taken['speed:3']=1;G.Game.setSpeed(3);G.Game.expeditionPause();G.EnemyMgr.clear();G.Projectiles.clear();G.Pickups.clear();r.spawned=r.wave.count;r.pendingSpawns=[];
    const e=new G.Enemy({dex:7,hp:1e9,spd:0,dmg:0,xp:0,behavior:'chase'},r.captain.x+500,r.captain.y,{hp:1,spd:1,dmg:1});G.EnemyMgr.add(e);const before=r.captain.xp,mul=r.captain.effectiveXpMul;G.Pickups.drop('xp',r.captain.x,r.captain.y,20);G.Game.expeditionResume();return {before,mul};
  });
  await p.waitForFunction(()=>G.Expedition.run.xpJar===40);const earned=await p.evaluate(()=>{G.Game.expeditionPause();const r=G.Expedition.run;r.phase='pokemon-training';if(G.Expedition.takeStoredXp(20)!==0||r.xpJar!==40)throw Error('training withdrawal');r.phase='combat';return {xp:r.captain.xp,raw:r.loot.xp,spent:r.xpJarSpent};});assert.ok(Math.abs(earned.xp-expected.before-40*expected.mul)<1e-7);assert.equal(earned.raw,40);assert.equal(earned.spent,20);
  await p.evaluate(()=>{const r=G.Expedition.run;G.Pickups.drop('xpBig',r.captain.x,r.captain.y,60);G.Game.expeditionResume();});await p.waitForFunction(()=>G.Expedition.run.xpJar===0);const xp=await p.evaluate(()=>{G.Game.expeditionPause();return G.Expedition.run.captain.xp;});assert.ok(Math.abs(xp-expected.before-140*expected.mul)<1e-7);
  await p.evaluate(()=>G.Sprites.preload([4,25,143]));await p.waitForFunction(()=>[4,25,143].every(d=>G.Sprites.sheet(d,'Idle').ready));
  const palettes=await p.evaluate(()=>{
    const colors=[4,25,143].map(d=>G.Sprites.themeColors(d));if(colors.some(p=>!p?.length))throw Error('palette');const r=G.Expedition.run,call=G.FX.koSplash;let used;G.FX.koSplash=(...a)=>{used=a[2];call(...a);};try{const e=new G.Enemy({dex:143,hp:1,spd:0,dmg:0,xp:0,behavior:'chase'},r.captain.x+90,r.captain.y,{hp:1,spd:1,dmg:1});e.hurt(1e6,'#f00',0,0,0,null,r.captain,{kind:'projectile',type:'fire'});}finally{G.FX.koSplash=call;}if(JSON.stringify(used)!==JSON.stringify(colors[2]))throw Error('victim palette');return colors;
  });
  await p.evaluate(()=>{G.Audio.setVolume('music',0);});await p.waitForTimeout(100);
  const cast=await p.evaluate(()=>{audioProbe.length=0;G.Audio.sfx('shot',{kind:'projectile',type:'electric'});return audioProbe.slice();});await p.waitForTimeout(80);const hit=await p.evaluate(()=>{audioProbe.length=0;G.Audio.sfx('hit');return audioProbe.slice();});assert.ok(cast.find(p=>p.kind==='pitch').value<550);const at=hit.find(p=>p.kind==='pitch').at;assert.ok(Math.max(...hit.filter(p=>p.kind==='fade').map(p=>p.at))-at<.04);assert.equal(await p.evaluate(()=>G.Audio.canPlay()),true);
  assert.deepEqual(errors,[]);console.log('XP jar 60 -> 40 -> 0, one-pass XP multipliers, training exclusion, victim sprite palettes and native cast/hit envelopes passed:',{palettes,castPitch:cast.find(p=>p.kind==='pitch').value,hitFade:Math.max(...hit.filter(p=>p.kind==='fade').map(p=>p.at))-at});
  await p.goto(base+'/');await p.locator('#tap-start:not(.hidden),#scr-menu:not(.hidden)').first().waitFor();if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#scr-menu:not(.hidden)').waitFor();assert.equal(await p.evaluate(()=>typeof window.G),'undefined');await p.locator('[data-go=play]').click();await p.locator('#journey-captain').waitFor();assert.deepEqual(errors,[]);await ctx.close();
 }
}finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

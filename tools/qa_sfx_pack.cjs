/* Local source runtime, isolated accounts/SQLite and clearly marked battle fixtures. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{once}=require('node:events'),{randomUUID,randomBytes}=require('node:crypto');
const {createApp,hashPassword}=require('../server/server.cjs'),{fresh}=require('../server/domain.cjs'),{chromium}=require('./cache/browser-qa/node_modules/playwright');

// Observe native audio nodes, including source lifetime and the decoded asset URL.
function audioProbe(){
 const urls=new WeakMap(),decoded=new WeakMap(),fetch0=window.fetch;
 window.sfxProbe={plays:[],loads:[],active:0,max:0,osc:0};
 window.fetch=async function(...args){const res=await fetch0.apply(this,args),url=String(args[0]);if(url.includes('/pokemon-survivors-sfx/')){sfxProbe.loads.push(url);const read=res.arrayBuffer.bind(res);res.arrayBuffer=async()=>{const b=await read();urls.set(b,url);return b;};}return res;};
 const A=window.AudioContext||window.webkitAudioContext,decode=A.prototype.decodeAudioData,make=A.prototype.createBufferSource,osc=A.prototype.createOscillator;
 A.prototype.decodeAudioData=function(data,...args){const url=urls.get(data);return decode.call(this,data,...args).then(b=>{if(url)decoded.set(b,url);return b;});};
 A.prototype.createOscillator=function(){sfxProbe.osc++;return osc.call(this);};
 A.prototype.createBufferSource=function(){const s=make.call(this),start=s.start.bind(s),stop=s.stop.bind(s),connect=s.connect.bind(s);let gain,live=false;
  s.connect=function(node,...args){gain=node;return connect(node,...args);};
  const done=()=>{if(live){live=false;sfxProbe.active--;}};s.addEventListener('ended',done);
  s.start=function(...args){const url=decoded.get(s.buffer);if(url){live=true;sfxProbe.active++;sfxProbe.max=Math.max(sfxProbe.max,sfxProbe.active);sfxProbe.plays.push({file:url.split('/').pop().split('?')[0],rate:s.playbackRate.value,gain:gain?.gain?.value,duration:s.buffer.duration});}return start(...args);};
  s.stop=function(...args){done();return stop(...args);};return s;
 };
}

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
  const ctx=await browser.newContext({viewport:mobile?(landscape?{width:844,height:390}:{width:390,height:844}):{width:1360,height:900},isMobile:mobile,hasTouch:mobile});await ctx.addInitScript(l=>localStorage.setItem('ps.lang',l),lang);await ctx.addInitScript(audioProbe);const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error'&&m.text().includes('[Game]')){errors.push(m.text());console.error(m.text());}});p.on('dialog',d=>d.accept());
  await p.goto(base+'/dev.html');await p.locator('#tap-start:not(.hidden),#scr-login:not(.hidden)').first().waitFor();if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#f-user').fill(name);await p.locator('#f-pass').fill(pass);await p.locator('#btn-auth').click();await p.locator('#scr-menu:not(.hidden)').waitFor();await p.locator('[data-go=play]').click();await p.locator('#journey-captain').waitFor();





  await p.locator('#journey-captain').selectOption('4');await p.locator('.journey-prep-actions button').last().click();await p.locator('.journey-prep-actions button').last().click();await p.locator('.journey-grid').waitFor();



  const files=fs.readdirSync(path.join(__dirname,'../assets/audio/pokemon-survivors-sfx/skills')).map(f=>'skills/'+f).concat(fs.readdirSync(path.join(__dirname,'../assets/audio/pokemon-survivors-sfx/kills')).filter(f=>f.endsWith('.wav')).map(f=>'kills/'+f));
  assert.equal(files.length,33);
  for(const file of files){const res=await fetch(base+'/assets/audio/pokemon-survivors-sfx/'+file);assert.equal(res.status,200);assert.equal(res.headers.get('content-type'),'audio/wav');assert.deepEqual(Buffer.from(await res.arrayBuffer()),fs.readFileSync(path.join(__dirname,'../assets/audio/pokemon-survivors-sfx',file)));}
  assert.deepEqual(await p.evaluate(()=>G.Audio.preloadCombat()),{ready:33,total:33});
  const cache=await p.evaluate(async()=>{const before=sfxProbe.loads.length;await G.Audio.preloadCombat();return {before,after:sfxProbe.loads.length};});assert.equal(cache.before,33);assert.equal(cache.after,33);
  await p.evaluate(()=>{
   const r=G.Expedition.run;r.map[1][3].kind='battle';G.Expedition.choose(1,3);G.Game.expeditionPause();G.EnemyMgr.clear();G.Projectiles.clear();G.Pickups.clear();r.spawned=r.wave.count;r.pendingSpawns=[];G.Audio.setVolume('music',0);
   window.sfxEnemy=new G.Enemy({dex:7,hp:1e9,spd:0,dmg:0,xp:0,behavior:'chase'},r.captain.x+20,r.captain.y,{hp:1,spd:1,dmg:1});G.EnemyMgr.add(sfxEnemy);G.EnemyMgr.rebuildGrid();r.captain.target=sfxEnemy;
  });
  await p.waitForTimeout(600);
  const pairs=await p.evaluate(async()=>{
   sfxProbe.plays=[];const kinds=[...new Set(G.Moves.ALL.map(m=>m.kind))],pl=G.Expedition.run.captain;
   for(const kind of kinds){const m=G.Moves.instance(G.Moves.ALL.find(m=>m.kind===kind).id);pl.cast(m);sfxEnemy.hurt(1,'#fff',0,0,0,null,pl,{kind,type:m.type});await new Promise(r=>setTimeout(r,90));}
   return {kinds,plays:sfxProbe.plays};
  });
  assert.equal(pairs.kinds.length,15);for(const kind of pairs.kinds)for(const phase of ['cast','hit'])assert.ok(pairs.plays.some(v=>v.file===kind+'_'+phase+'.wav'),kind+' '+phase);
  assert.ok(pairs.plays.every(v=>v.rate===1&&v.gain>0&&v.gain<=.5));
  await p.waitForTimeout(600);
  const triggers=await p.evaluate(async()=>{
   const pl=G.Expedition.run.captain;
   function equip(kind){G.Combat.clearFields();G.Projectiles.clear();const m=G.Moves.instance(G.Moves.ALL.find(d=>d.kind===kind).id);m.t=0;pl.moves=[m];pl.slots=[[m]];pl.active=0;pl.target=sfxEnemy;return m;}
   sfxProbe.plays=[];const m=equip('orbit');G.Combat.tick(.001,pl,0);G.Combat.tick(.01,pl,.01);const first=sfxProbe.plays.filter(p=>p.file==='orbit_cast.wav').length;await new Promise(r=>setTimeout(r,100));m.t=0;G.Combat.tick(.001,pl,.02);const refill=sfxProbe.plays.filter(p=>p.file==='orbit_cast.wav').length;
   for(const kind of ['mine','meteor','buff']){await new Promise(r=>setTimeout(r,90));equip(kind);G.Combat.tick(.001,pl,0);if(kind!=='buff')G.Combat.updateFields(30);}
   // Use visual enemy replicas to avoid altering expedition rewards with fixture kills.
   for(const [boss,elite] of [[false,false],[false,true],[true,false]]){const e=new G.Enemy({dex:7,hp:1,spd:0,dmg:0,xp:0,behavior:'chase'},pl.x+20,pl.y,{hp:1,spd:1,dmg:1});e.remote=true;e.boss=boss;e.elite=elite;e.die();e.die();}
   return {first,refill,plays:sfxProbe.plays};
  });
  assert.equal(triggers.first,1);assert.equal(triggers.refill,2);
  for(const f of ['mine_hit.wav','meteor_hit.wav','buff_hit.wav','kill_normal.wav','kill_elite.wav','kill_boss.wav'])assert.equal(triggers.plays.filter(p=>p.file===f).length,1,f);
  await p.waitForTimeout(1700);
  const stress=await p.evaluate(async()=>{
   sfxProbe.max=0;sfxProbe.plays=[];const before=sfxProbe.loads.length;
   for(let n=0;n<6;n++){for(const d of G.Moves.ALL){G.Audio.sfx('shot',{kind:d.kind});G.Audio.sfx('hit',{kind:d.kind});}await new Promise(r=>setTimeout(r,80));}
   G.Audio.sfx('bossDown');G.Audio.toggleMute();const muted=sfxProbe.plays.length;G.Audio.sfx('shot',{kind:'chain'});G.Audio.sfx('hit',{kind:'aura'});G.Audio.sfx('faint');if(sfxProbe.plays.length!==muted)throw Error('muted sample');G.Audio.toggleMute();G.Audio.setVolume('sfx',0);G.Audio.sfx('hit',{kind:'chain'});if(sfxProbe.plays.length!==muted)throw Error('zero volume sample');G.Audio.setVolume('sfx',.7);
   G.CardPacks.normalize(G.DB.save);G.DB.save.cardPack.taken['speed:3']=1;G.Game.setSpeed(3);await new Promise(r=>setTimeout(r,120));G.Audio.sfx('shot',{kind:'projectile'});
   return {max:sfxProbe.max,plays:sfxProbe.plays,requests:sfxProbe.loads.length-before};
  });
  assert.ok(stress.max<=18,JSON.stringify(stress));assert.equal(stress.requests,0);assert.equal(stress.plays.at(-1).file,'projectile_cast.wav');assert.equal(stress.plays.at(-1).rate,1);assert.ok(stress.plays.some(p=>p.file==='kill_boss.wav'));
  await p.waitForTimeout(1700);assert.equal(await p.evaluate(()=>sfxProbe.active),0);
  // Missing files fall back immediately; no late/stale playback, no crash or repeated requests.
  const fail=await browser.newContext();await fail.addInitScript(audioProbe);await fail.route('**/meteor_cast.wav*',r=>r.fulfill({status:404,body:'missing'}));const fp=await fail.newPage();fp.on('pageerror',e=>errors.push(e.stack));
  await fp.route('**/sfx-fixture',r=>r.fulfill({contentType:'text/html',body:'<button onclick="G.Audio.unlock()">Start</button><script>window.G={U:{clamp:(v,a,b)=>Math.max(a,Math.min(b,v))}};</script><script src="/js/core/audio.js"></script>'}));await fp.goto(base+'/sfx-fixture');await fp.locator('button').click();
  assert.deepEqual(await fp.evaluate(()=>G.Audio.preloadCombat()),{ready:32,total:33});
  const fallback=await fp.evaluate(()=>{const before=sfxProbe.osc,loads=sfxProbe.loads.length;G.Audio.sfx('shot',{kind:'meteor',type:'rock'});return {osc:sfxProbe.osc-before,loads:sfxProbe.loads.length-loads,plays:sfxProbe.plays.length};});assert.ok(fallback.osc>0);assert.equal(fallback.loads,0);assert.equal(fallback.plays,0);await fp.waitForTimeout(300);assert.equal(await fp.evaluate(()=>sfxProbe.plays.length),0);await fail.close();
  assert.deepEqual(errors,[]);console.log('SFX pack passed:',{files:files.length,pairs:pairs.kinds.length,cached:cache.after,orbitRefills:triggers.refill,peakVoices:stress.max,fallback});
  await p.goto(base+'/');await p.locator('#tap-start:not(.hidden),#scr-menu:not(.hidden)').first().waitFor();if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#scr-menu:not(.hidden)').waitFor();assert.equal(await p.evaluate(()=>typeof window.G),'undefined');await p.locator('[data-go=play]').click();await p.locator('#journey-captain').waitFor();assert.deepEqual(errors,[]);await ctx.close();
 }
}finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

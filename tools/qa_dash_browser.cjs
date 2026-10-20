/* Real gameplay frames, disposable guest and memory server; controlled targets/damage. */
const assert=require('node:assert/strict'),path=require('node:path'),{once}=require('node:events');
const {createApp}=require('../server/server.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(__dirname,'cache/browser-qa/node_modules/playwright'));
(async()=>{
  const app=createApp({dbFile:':memory:',stunUrls:'none'}),errors=[];let browser;
  try{
    app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
    browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
    const p=await browser.newPage({viewport:{width:1280,height:960},locale:'zh-CN'});p.on('pageerror',e=>errors.push(e.message));
    await p.goto(base+'/dev.html');await p.waitForFunction(()=>!document.getElementById('tap-start').classList.contains('hidden')||!document.getElementById('scr-login').classList.contains('hidden'));
    if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();
    await p.evaluate(()=>{G.DB.playAsGuest();G.DB.grant(6,'qa');G.DB.save.partner=6;G.Flow.afterLogin();});
    await p.locator('[data-go="play"]').click();await p.waitForFunction(()=>G.Game.state==='playing');
    await p.evaluate(()=>{
      G.Game.debugMark();G.Spawner.update=()=>{};G.EnemyMgr.clear();G.Projectiles.clear();
      G.World.isFree=()=>true;G.World.collide=()=>{};G.World.isLiquid=()=>false;G.World.propsInCircle=()=>[];
      const player=G.Game.player;player.hp=player.maxHp=5000;player.dmgReduce=0;player.critChance=0;player.ability=null;player.equip(null);
      const target=new G.Enemy({dex:143,hp:1e9,spd:0,dmg:0,xp:0,behavior:'ranged',range:10000,shotCd:10000},player.x+160,player.y,{hp:1,spd:1,dmg:1},false);
      target.types=[];G.EnemyMgr.add(target);G.EnemyMgr.rebuildGrid();window.qaTarget=target;
      window.qaCast=player.cast.bind(player);player.cast=function(m){
        if(window.qaMeasure){window.qaMeasure.casts++;window.qaMeasure.expected=m.t/G.Abilities.cooldownRate(player,m)/G.Mega.cooldownRate(player,m);}
        return window.qaCast(m);
      };
      const guard=player.grantDashGuard.bind(player);player.grantDashGuard=function(cd){
        const before=player.dashGuardT,result=guard(cd),q=window.qaMeasure;
        if(q)q.guards.push({cd,expected:q.expected,before,after:player.dashGuardT});return result;
      };
      window.qaPhase=(mode,duration)=>{
        const m=G.Moves.instance('quick-attack',5);G.Moves.evolve(m);m.knock=0;
        player.moves=mode==='fused'?[m,G.Moves.instance('aerial-ace',5)]:[m];player.moves.forEach(m=>m.knock=0);
        player.slots=[player.moves];player.active=0;player.cdMul=mode==='normal'?Math.pow(.92,5):.1;
        player.invuln=player.dashGuardT=0;target.x=player.x+160;target.y=player.y;
        G.World.isFree=()=>mode!=='wall';
        const start=G.Game.st.time,q=window.qaMeasure={mode,casts:0,guards:[],samples:0,protected:0,hits:0,startHp:player.hp,enemyHp:target.hp,done:false};
        function sample(){
          q.samples++;if(player.dashGuardT>0)q.protected++;
          if(player.hurt(1,null,true,{kind:'projectile',enemy:target}))q.hits++;
          if(G.Game.st.time-start>=duration){q.done=true;q.hp=player.hp;q.damage=q.enemyHp-target.hp;return;}
          requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      };
    });
    const results=[];
    for(const [mode,duration,minCasts]of [['normal',2.5,7],['fused',1.5,30],['wall',1.1,12]]){
      await p.evaluate(([mode,duration])=>window.qaPhase(mode,duration),[mode,duration]);await p.waitForFunction(()=>window.qaMeasure.done);
      const result=await p.evaluate(()=>window.qaMeasure);assert.ok(result.casts>=minCasts,JSON.stringify(result));
      if(mode==='normal')assert.ok(result.hits>=1,JSON.stringify(result));
      for(const g of result.guards){
        assert.ok(Math.abs(g.cd-g.expected)<1e-7,JSON.stringify(g));
        assert.ok(Math.abs(g.after-Math.max(g.before,g.cd<.3?g.cd*.9:.3))<1e-7,JSON.stringify(g));
      }
      if(mode==='wall'){assert.equal(result.protected,0);assert.equal(result.guards.length,0);}else{assert.ok(result.damage>0);assert.ok(result.guards.length>0);}
      const {guards,...summary}=result;results.push({...summary,guardCount:guards.length,firstGuard:guards[0]});
    }
    await p.screenshot({path:path.join(__dirname,'cache/v0.20.2-dash-gameplay.png'),animations:'disabled'});
    assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,results,pageErrors:errors.length,isolatedGuest:true},null,2));
  }finally{await browser?.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

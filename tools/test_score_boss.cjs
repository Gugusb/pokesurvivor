const test=require('node:test'),assert=require('node:assert/strict');
const {context}=require('./battle_fixture.cjs');
const {G:rules}=require('../server/domain.cjs');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`),noop=()=>{};
function fixture(time=900){
  const s=context(),{G}=s;s.load('js/systems/difficulty.js');s.load('js/systems/boss-combat.js');
  G.Game.st={time};G.Spawner={say:noop};G.Pickups={drop:noop,dropXp:noop};G.Items={roll:()=>null};
  s.boss=()=>new G.Enemy({dex:6,hp:10000,dmg:10,spd:10,xp:0,behavior:'ranged',networkStats:true},100,0,{hp:1,spd:1,dmg:1},true);
  return s;
}
test('score uses mutually exclusive kill categories, accelerating survival and completed events',()=>{
  const d=rules.Difficulty,counts={normal:100,elite:4,boss:2,rift:3,events:4},s=d.score(counts,1200,1);
  assert.equal(s.kills,680);assert.equal(s.survival,3600);assert.equal(s.events,1800);assert.equal(s.total,4864);
  assert.ok(d.score({},1200,1).survival>2*d.score({},600,1).survival);
  const typical=d.score({normal:3790,elite:50,boss:1,rift:3,events:4},1200,4);
  close(typical.kills/900,5);close(typical.survival/900,4);close(typical.events/900,2);
});
test('all eight score multipliers are increasing from 80% to 1000%; rewards depend on score',()=>{
  const d=rules.Difficulty;let previous=0;
  for(let n=1;n<=8;n++){const s=d.score({normal:100},600,n);assert.ok(s.total>previous);previous=s.total;assert.equal(d.rewards(n),1);}
  assert.equal(d.scoreMultiplier(1),.8);assert.equal(d.scoreMultiplier(8),10);
  for(const points of [0,1,100,5000,1e6])assert.equal(d.rewardCoins(points),Math.floor(points/10));
  assert.ok(d.growth(1200,'boss',8).hp>rules.Difficulty.growth(1200,'normal',8).hp*.5);
});
test('late fury splits a lethal opening hit at half health and resists same-frame burst spam',()=>{
  const s=fixture(),{G}=s,e=s.boss();e.hurt(1e9);assert.equal(e.ai.fury,true);close(e.hp,3200);
  const hp=e.hp;for(let i=0;i<100;i++)e.hurt(1e9);close(e.hp,hp);assert.ok(e.bossGuard.resistance<=.85);
  G.BossCombat.tick(e,1);e.hurt(1e9);close(e.hp,1800);
  assert.equal(e.dead,false);
});
test('adaptive resistance grows with damage pressure and fades when attacks stop',()=>{
  const s=fixture(),{G}=s,low=s.boss(),high=s.boss();
  for(const e of [low,high]){e.bossInit();e.ai.fury=true;e.hp=5000;}
  low.hurt(10);high.hurt(3000);assert.ok(high.bossGuard.resistance>low.bossGuard.resistance);
  const pressure=high.bossGuard.resistance;G.BossCombat.tick(high,6);assert.ok(high.bossGuard.resistance<pressure*.1);
  close(high.bossGuard.budget,1800);
});
test('early bosses, ordinary and elite enemies, Judgment bosses and visual peers retain their existing damage rules',()=>{
  const s=fixture(300),{G}=s;
  for(const kind of ['early','normal','elite','judge','remote']){
    const e=s.boss();if(kind!=='early')e.spawnTime=900;
    if(kind==='normal'||kind==='elite')e.boss=false;
    if(kind==='elite')e.elite=true;
    if(kind==='judge')e.judge=true;
    if(kind==='remote')e.remote=true;
    assert.equal(G.BossCombat.damage(e,30000),30000,kind);
  }
});
test('boss pressure uses simulated seconds consistently at different frame rates and two-speed substeps',()=>{
  const run=dt=>{
    const {G,boss}=fixture(),e=boss();e.bossInit();e.ai.fury=true;e.hp=5000;
    for(let t=0;t<2-1e-8;t+=dt){G.BossCombat.tick(e,dt);e.hp-=G.BossCombat.damage(e,1500*dt);}
    return 5000-e.hp;
  };
  const fine=run(.01),coarse=run(.1);assert.ok(Math.abs(fine-coarse)/fine<.08);
});
test('rift lifesteal uses actual HP lost, honors invulnerability and healing reduction, and has a sustained cap',()=>{
  const s=fixture(),{G}=s,e=s.boss(),p=s.player(6);e.legend=true;e.hp=5000;
  p.moves=[];p.slots=[];p.hp=p.maxHp=100;p.dmgReduce=0;
  assert.equal(p.hurt(20,null,true,{kind:'contact',enemy:e}),true);close(e.hp,5200);
  assert.equal(p.hurt(20,null,true,{kind:'ranged',enemy:e}),false);close(e.hp,5200);
  p.invuln=0;e.unnerveT=3;p.hurt(20,null,true,{kind:'ranged',enemy:e});close(e.hp,5300);
  e.unnerveT=0;for(let i=0;i<20;i++)G.BossCombat.leech(e,100,100);close(e.hp,5400);
  G.BossCombat.tick(e,1);assert.ok(G.BossCombat.leech(e,100,100)>0);
  const hp=e.hp;e.remote=true;const calls=[];G.Coop.bossLeech=(...args)=>calls.push(args);
  G.BossCombat.leech(e,20,100);close(e.hp,hp);assert.equal(calls.length,1);
});
test('real enemy projectiles retain their attacker so a rift boss can leech from ranged hits',()=>{
  const s=fixture(),{G}=s,e=s.boss(),p=s.player(6);e.legend=true;e.hp=5000;
  p.moves=[];p.slots=[];p.hp=p.maxHp=100;p.dmgReduce=0;
  G.World.propsInCircle=()=>[];G.World.projectileBlock=()=>null;G.VFX={forType:()=>({})};
  G.EnemyMgr.get=id=>id===e.id?e:null;s.load('js/entities/projectile.js');s.load('js/systems/combat.js');
  G.Projectiles.spawn({x:p.x,y:p.y,dmg:20,friendly:false,sourceId:e.id});G.Combat.resolve(.01,p,0);
  assert.ok(e.hp>5000);assert.ok(p.hp<100);
});

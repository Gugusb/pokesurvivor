/* Real combat, PP, derived stats, old saves and both arena boundaries. */
const test=require('node:test'),assert=require('node:assert/strict');
const {context}=require('./battle_fixture.cjs');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`),noop=()=>{};
function setup(){
  const s=context('zh',false),{G}=s;
  G.VFX={forMove:()=>({pal:[]}),forType:()=>({})};G.Sprites.preload=noop;
  Object.assign(G.World,{propsInCircle:()=>[],projectileBlock:()=>null,damageProp:noop,isFree:()=>true});
  for(const f of ['js/entities/projectile.js','js/systems/move-pp.js','js/systems/combat.js','js/systems/levelup.js','js/systems/z-access.js','js/systems/z-moves.js'])s.load(f);
  G.Game.state='playing';G.Game.st={time:10};
  s.learn=(p,ids)=>{p.moves=ids.map(id=>G.Moves.instance(id));p.slots=p.moves.map(m=>[m]);p.active=0;p.target=s.enemy();p.target.x=30;p.aim=0;return p.moves;};
  s.z=(p,i=0)=>{const m=p.slots[i][0];G.ZMoves.grant(G.DB.save,m.type);G.ZMoves.equip(G.DB.save,p.dex,m.type);G.ZMoves.init(p,G.DB.save);assert.ok(G.ZMoves.arm(p));assert.ok(G.ZMoves.choose(p,i));};
  return s;
}
test('agility follows original Speed and both curve limits are smooth, monotonic and bounded',()=>{
  const {G}=setup(),P=G.MonProgression;
  for(const m of G.DEX){close(P.agilityBase(m),m.baseStats.spe);close(P.staminaBase(m),(m.baseStats.def+m.baseStats.spd)/2);}
  close(P.cooldownFactor(80),1);close(P.cooldownFactor(0),3);
  let last=3;for(let a=1;a<=20000;a++){const k=P.cooldownFactor(a);assert.ok(k>.25&&k<last);last=k;}
  const a=P.stats(384,Array(8).fill(16)),b=P.stats(383,Array(8).fill(16));
  assert.ok(a.agility>b.agility);assert.ok(P.cooldownFactor(a.agility)<P.cooldownFactor(b.agility));
  close(P.ppInterval(0),1);assert.ok(P.ppInterval(80)<1);let prev=1;
  for(let e=1;e<20000;e++){const v=P.ppInterval(e);assert.ok(v>=.2&&v<prev);prev=v;}
});
test('ordinary casts include agility as a separate multiplier and short dash protection uses that actual cooldown',()=>{
  const s=setup(),{G}=s,p=s.player(384),[m]=s.learn(p,['quick-attack']);p.baseAgility=160;p.cdMul=.1;m.cd=1;
  G.Combat.tick(0,p,0);close(m.t,.1);close(p.dashGuardT,.1*p.agilityCooldown*.9);
  const after=m.t;G.Combat.tick(.01,p,0);close(m.t,after-.01/p.agilityCooldown);
});
test('PP maxima follow the type hierarchy, spend only on an actual cast and independently block ready moves',()=>{
  const s=setup(),{G}=s,p=s.player(6),[m]=s.learn(p,['ember']);
  for(const [kind,n]of [['melee',24],['dash',20],['projectile',15],['buff',10]])assert.equal(G.MovePP.baseMax({kind}),n);
  const pp=G.MovePP.state(p,m);p.target=null;G.Combat.tick(0,p,0);assert.equal(pp.current,15);
  p.target=s.enemies[0];m.t=0;G.Combat.tick(0,p,0);assert.equal(pp.current,14);assert.equal(G.Projectiles.all().length,1);
  G.Projectiles.clear();pp.current=0;m.t=0;G.Combat.tick(0,p,0);assert.equal(G.Projectiles.all().length,0);assert.equal(m.t,0);
  p.tempPP=20;G.Combat.tick(0,p,0);assert.equal(p.tempPP,19);assert.equal(pp.current,0);assert.equal(G.Projectiles.all().length,1);
});
test('inactive moves recover PP; fractional ordinary PP is preserved when reserve PP is used; dead players do not recover',()=>{
  const s=setup(),{G}=s,p=s.player(6),ms=s.learn(p,['ember','tackle']);p.baseStamina=0;
  for(const m of ms)G.MovePP.state(p,m).current=0;
  G.MovePP.tick(p,.75);for(const m of ms)close(G.MovePP.state(p,m).current,.75);
  assert.equal(G.MovePP.consume(p,ms[0]),false);p.tempPP=1;assert.equal(G.MovePP.consume(p,ms[0]),true);close(G.MovePP.state(p,ms[0]).current,.75);
  G.MovePP.tick(p,.25);assert.equal(G.MovePP.consume(p,ms[0]),true);close(G.MovePP.state(p,ms[0]).current,0);
  p.dead=true;G.MovePP.tick(p,30);close(G.MovePP.state(p,ms[0]).current,0);
  p.dead=false;p.baseStamina=1000000000;G.MovePP.tick(p,1);assert.ok(G.MovePP.state(p,ms[0]).current>4.99);
});
test('linked moves spend PP separately; max-PP berries affect learned and future moves and preserve level-up PP',()=>{
  const s=setup(),{G}=s,p=s.player(6),[a,b]=s.learn(p,['ember','tackle']);p.slots=[[a,b]];
  G.MovePP.state(p,a).current=0;G.MovePP.state(p,b).current=2;
  G.Combat.tick(0,p,0);assert.equal(G.Projectiles.all().length,0);assert.equal(G.MovePP.state(p,b).current,1);
  G.MovePP.increaseMax(p);assert.equal(G.MovePP.state(p,a).max,16);assert.equal(G.MovePP.state(p,a).current,1);assert.equal(G.MovePP.state(p,b).max,25);
  G.Moves.levelUp(a);assert.equal(G.MovePP.state(p,a).current,1);
  assert.equal(G.MovePP.state(p,G.Moves.instance('quick-attack')).max,21);
});
test('orbit PP sustains a cooldown cycle then removes exhausted orbs without affecting linked moves',()=>{
  const s=setup(),{G}=s,p=s.player(6),[m]=s.learn(p,['fire-spin']);p.baseAgility=80;p.baseStamina=0;m.cd=.5;G.MovePP.state(p,m).current=1;
  G.Combat.tick(0,p,0);assert.ok(G.Projectiles.all().some(o=>o.orb));assert.equal(G.MovePP.state(p,m).current,0);
  G.Combat.tick(.5,p,.5);assert.ok(!G.Projectiles.all().some(o=>o.orb));
  G.Combat.tick(.5,p,1);assert.ok(G.Projectiles.all().some(o=>o.orb));
  p.baseAgility=160;G.Combat.tick(0,p,1);for(const o of G.Projectiles.all())close(o.rehit,.5*p.agilityCooldown);
});
test('Z ignores PP and agility, restores every move of the selected slot only after completion and preserves reserve PP',()=>{
  for(const a of [1,80,10000]){
    const s=setup(),{G}=s,p=s.player(6),[m,b,other]=s.learn(p,['ember','tackle','water-gun']);p.baseAgility=a;p.tempPP=20;p.slots=[[m,b],[other]];
    for(const move of p.moves)G.MovePP.state(p,move).current=0;
    s.z(p);assert.equal(p.zState.phase,'cast');assert.equal(G.MovePP.state(p,m).current,0);
    G.ZMoves.tick(p,.6);assert.equal(p.zState.phase,'cast');assert.equal(G.MovePP.state(p,b).current,0);
    G.ZMoves.tick(p,1);assert.equal(p.zState.phase,'cooldown');assert.equal(p.zState.cooldown,5);
    for(const move of [m,b])assert.equal(G.MovePP.state(p,move).current,G.MovePP.max(p,move));
    assert.equal(G.MovePP.state(p,other).current,0);assert.equal(p.tempPP,20);
  }
});
test('cancelled Z does not refill PP or mutate learned move definitions',()=>{
  const s=setup(),{G}=s,p=s.player(6),[m]=s.learn(p,['ember']);G.MovePP.state(p,m).current=0;const before=JSON.stringify(m);
  s.z(p);G.ZMoves.cancel(p);assert.equal(G.MovePP.state(p,m).current,0);assert.equal(JSON.stringify(m),before);
});
test('berries boost their own base stat layer; HP growth scales with evolution and leaves other multipliers intact',()=>{
  const s=setup(),{G}=s,p=s.player(4),berry=id=>G.LevelUp.STATS.find(b=>b.id===id);p.atkMul=1.5;p.cdMul=.8;p.dmgReduce=.2;
  berry('atk').apply(p);close(p.atk,p.baseAtk*1.1*1.5);close(p.spa,p.baseSpa*1.5);
  berry('spa').apply(p);close(p.spa,p.baseSpa*1.1*1.5);
  berry('def').apply(p);berry('spdef').apply(p);close(p.defenseFor({kind:'contact'}),p.baseDefense*1.08);close(p.dmgReduce,.2);
  berry('cd').apply(p);berry('stamina').apply(p);close(p.agility,p.baseAgility*1.12);close(p.stamina,p.baseStamina*1.12);close(p.cdMul,.8);
  berry('hp').apply(p);close(p.maxHp,p.baseHp*1.12);p.addMaxHp(20);p.hp=p.maxHp*.4;p.level=8;p.evolutionPath=[4,5,6];
  assert.ok(G.MonProgression.evolve(p,{dex:5}));close(p.maxHp,p.baseHp*1.12+20);close(p.hp,p.maxHp*.4);close(p.atk,p.baseAtk*1.1*1.5);
  berry('temppp').apply(p);assert.equal(p.tempPP,20);berry('ppmax').apply(p);assert.equal(p.maxPpBonus,1);
});
test('either physical or special berries can unlock existing attack/defense ultimate prerequisites',()=>{
  const {G}=setup(),m=G.Moves.instance('ember',5);assert.ok(G.Moves.evoInfo(m,{spa:1}).ready);assert.ok(G.Moves.evoInfo(m,{atk:1}).ready);
});
test('six-IV saves acquire deterministic derived IVs; new best agility/stamina values survive an older-client save',()=>{
  const {G}=setup();assert.deepEqual(Array.from(G.MonProgression.normalizeIV([3,4,5,6,7,8])),[3,4,5,6,7,8,5,7]);
  const old=G.DB.fresh('test');old.owned[6]={at:1,iv:[3,4,5,6,7,8,31,30]};G.DB.normalize(old);
  const input=JSON.parse(JSON.stringify(old));input.owned[6].iv=[10,11,12,13,14,15];
  const {sanitize}=require('../server/domain.cjs'),out=sanitize(input,old,'test');
  assert.deepEqual(Array.from(out.owned[6].iv),[10,11,12,13,14,15,31,30]);
});
test('both rift and Judgment outer walls stop every Z dash trajectory and landing; free-field dash keeps full distance',()=>{
  const s=setup(),{G}=s;s.load('js/world/tiles.js');s.load('js/world/world.js');
  for(const [type,r]of [['fire',11],['judgment',24]])for(let i=0;i<16;i++){
    G.World.reset(123);G.World.setArena({tx:100,ty:100,r,type});
    const p=s.player(6);s.learn(p,['quick-attack']);p.x=p.y=100*G.World.TS+G.World.TS/2;p.aim=i*Math.PI/8;
    s.enemies.length=0;const e=s.enemy();e.x=p.x+Math.cos(p.aim)*100;e.y=p.y+Math.sin(p.aim)*100;e.boss=true;e.maxHp=e.hp=1e9;
    const start={x:p.x,y:p.y};s.z(p);for(let n=0;n<51;n++){G.ZMoves.tick(p,.01);assert.ok(G.World.arenaContains(p.x,p.y,p.r),`${type} angle ${i} frame ${n}`);}
    assert.ok(Math.hypot(p.x-start.x,p.y-start.y)<p.moves[0].radius*10);assert.ok(G.World.isFree(p.x,p.y,p.r));
  }
  G.World.setArena(null);assert.deepEqual(Array.from(G.World.limitArenaDash(0,0,10000,0,10)),[10000,0]);
});
test('Boss fractional damage text rounds visually while real damage keeps its precision',()=>{
  const s=setup(),{G}=s;G.Settings={fx:2,get:()=>true};G.Camera.sees=()=>true;s.load('js/entities/fx.js');
  G.FX.dmgText(0,0,123.456789012345);const seen=[];
  const ctx=new Proxy({fillText:t=>seen.push(t)},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
  G.FX.draw(ctx);assert.deepEqual(seen,[123]);
  G.FX.clear();seen.length=0;s.load('js/systems/boss-combat.js');const e=s.enemy();e.boss=true;e.spawnTime=600;e.ai={fury:true};e.maxHp=10000;e.hp=5000;
  const before=e.hp,loss=e.hurt(2200,'#fff');assert.ok(!Number.isInteger(loss));close(before-e.hp,loss);
  G.FX.draw(ctx);assert.deepEqual(seen,[Math.round(loss)]);
});
test('empty PP orbit stops locally and in peer snapshots; remote effects never spend learned PP',()=>{
  const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),s=setup(),{G}=s,p=s.player(6),[m]=s.learn(p,['fire-spin']);
  G.Net={uid:'host',on:noop,onPeer:noop};G.startMoveOf=()=> 'fire-spin';
  const source=fs.readFileSync(path.join(__dirname,'../js/net/coop.js'),'utf8').replace('ANIMS, COLORS, begin, end,','_myState:myState, ANIMS, COLORS, begin, end,');vm.runInContext(source,s);
  G.Coop.begin({host:'host',members:[{uid:'host',dex:6},{uid:'peer',dex:6}]},p,{});
  const pp=G.MovePP.state(p,m);pp.current=0;G.Combat.tick(0,p,0);assert.equal(G.Coop._myState()[7],'');
  pp.current=1;G.Combat.tick(0,p,0);assert.equal(G.Coop._myState()[7],'fire-spin');
  const peer=G.Coop.mate('peer').pl;peer.netUpdate(0);const learned=peer.moves[0],before=G.MovePP.state(peer,learned).current;
  G.Combat.ghostOrbit(peer,.01,0);assert.ok(G.Projectiles.all().some(o=>o.owner===peer&&o.orb));assert.equal(G.MovePP.state(peer,learned).current,before);
  peer.net.mv='';peer.netUpdate(0);G.Combat.ghostOrbit(peer,.01,0);assert.ok(!G.Projectiles.all().some(o=>o.owner===peer&&o.orb));G.Coop.end();
});

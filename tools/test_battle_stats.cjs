/* Actual six-stat species, attacks and legacy-save migration; disposable VM only. */
const test=require('node:test'),assert=require('node:assert/strict');
const {context}=require('./battle_fixture.cjs');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`),noop=()=>{};
function fixture(){const s=context('zh',false),G=s.G;G.Sprites.preload=noop;G.VFX={forMove:()=>({pal:[]}),forType:()=>({})};G.World.propsInCircle=()=>[];G.World.projectileBlock=()=>null;G.World.damageProp=noop;s.load('js/entities/projectile.js');s.load('js/systems/combat.js');return s;}
test('all 966 species carry six original base stats, with separate original attack conversion and defense divisors',()=>{
 const {G}=context('zh',false);assert.equal(G.DEX.length,966);
 for(const m of G.DEX){assert.equal(Object.keys(m.baseStats).length,6);assert.equal(Object.values(m.baseStats).reduce((a,b)=>a+b,0),m.bst);
  for(const [field,key]of [['atk','atk'],['spa','spa'],['defense','def'],['spdef','spd']])assert.ok(Math.abs(m[field]-(.7+m.baseStats[key]*.0055))<=.00500001);}
 assert.deepEqual(Object.values(G.DEX_BY[6].baseStats),[78,84,78,109,85,100]);
 assert.equal(G.DEX_BY[213].baseStats.def,230);assert.equal(G.DEX_BY[242].baseStats.def,10);
 assert.ok(G.DEX_BY[150].spa>G.DEX_BY[150].atk);assert.ok(G.DEX_BY[68].atk>G.DEX_BY[68].spa);
});
test('physical ranged moves remain physical; special close-range moves remain special; evolved classification can change independently of geometry',()=>{
 const {G}=context('zh',false);
 for(const m of G.Moves.ALL){assert.equal(m.damageClass==='status',m.kind==='buff');assert.ok(['status','physical','special'].includes(m.damageClass));}
 assert.equal(G.Moves.instance('rock-throw').damageClass,'physical');assert.equal(G.Moves.instance('bulldoze').damageClass,'physical');assert.equal(G.Moves.instance('giga-drain').damageClass,'special');
 const m=G.Moves.instance('razor-leaf',5);assert.equal(m.damageClass,'physical');G.Moves.evolve(m);assert.equal(m.damageClass,'special');assert.equal(G.Moves.BY_ID[m.id].damageClass,'physical');
});
test('old HP/Attack/Speed IVs expand deterministically and mixed-format merges preserve every best value',()=>{
 const {G}=context('zh',false),old=G.DB.fresh('legacy');old.owned[6]={at:1,iv:[4,17,31]};
 G.DB.normalize(old);assert.deepEqual(Array.from(old.owned[6].iv),[4,17,31,17,17,17,31,17]);const again=JSON.stringify(old);G.DB.normalize(old);assert.equal(JSON.stringify(old),again);
 const newer=JSON.parse(again);newer.updated=20;newer.owned[6].iv=[2,3,4,31,30,29];old.updated=10;
 assert.deepEqual(Array.from(G.DB.merge(old,newer).owned[6].iv),[4,17,31,31,30,29,31,29]);
 const {sanitize}=require('../server/domain.cjs');const base=JSON.parse(JSON.stringify(newer));base.updated=1;
 const incoming=JSON.parse(JSON.stringify(base));incoming.owned[6].iv=[31,31,31];
 assert.deepEqual(Array.from(sanitize(incoming,base,'legacy').owned[6].iv),[31,31,31,31,31,31,31,31]);
 const six=JSON.parse(JSON.stringify(base));six.owned[6].iv=[1,2,3,4,5,6];
 assert.deepEqual(Array.from(sanitize(six,base,'legacy').owned[6].iv),[2,3,4,31,30,29,4,29]);
});
test('base-stat move buffs stay separate from generic attack bonuses and debuffs for both attacks',()=>{
 const s=fixture(),{G}=s,p=s.player(150);p.baseAtk=2;p.baseSpa=5;p.atkMul=1.3;p.buffs.atk={n:2,t:5,amount:.1};
 close(p.atk,2*1.2*1.3);close(p.spa,5*1.2*1.3);p.ability='justified';G.Abilities.state(p).justiceT=5;close(p.atk,2*1.2*1.7);close(p.spa,5*1.2*1.7);
 p.ability=null;p.applyAttackDebuff(.25,3);close(p.atk,2*1.2*1.05);close(p.spa,5*1.2*1.05);
 p.ability='defiant';close(p.atk,2*1.2*1.3);close(p.spa,5*1.2*1.3);
});
test('contact and melee use physical defense; ranged uses special defense; reduction and pure/environment damage preserve their own rules',()=>{
 const s=fixture(),p=s.player(150);p.hp=p.maxHp=10000;p.baseDefense=2;p.baseSpDef=4;p.dmgReduce=.2;
 for(const [kind,loss]of [['contact',40],['melee',40],['ranged',20],['projectile',20],['beam',20],['environment',80]]){p.invuln=0;const before=p.hp;p.hurt(100,null,false,{kind});close(before-p.hp,loss);}
 p.invuln=0;let before=p.hp;p.hurt(100,null,true,{kind:'ranged'});close(before-p.hp,100);
 p.moves=[s.G.Moves.instance('tackle')];p.slots=[p.moves];p.invuln=0;before=p.hp;p.hurt(100,null,false,{kind:'contact'});close(before-p.hp,30);
});
test('ordinary physical and special projectiles snapshot different attack stats and carry category through collision',()=>{
 const s=fixture(),{G}=s,p=s.player(150),e=s.enemy();e.x=80;p.target=e;p.baseAtk=2;p.baseSpa=5;
 for(const [id,atk,category]of [['rock-throw',2,'physical'],['ember',5,'special']]){G.Projectiles.clear();const m=G.Moves.instance(id);p.moves=[m];p.slots=[[m]];p.active=0;G.Combat.tick(0,p,0);const shot=G.Projectiles.all()[0];assert.ok(shot);close(shot.dmg,m.dmg*atk);assert.equal(shot.damageClass,category);}
});
test('enemy defenses resolve the move category once, while status/environment damage bypasses species defenses',()=>{
 const s=fixture(),{G}=s,p=s.player(150),e=s.enemy();e.defense=2;e.spdef=4;
 for(const [damageClass,loss]of [['physical',50],['special',25]]){const before=e.hp;e.hurt(100,'#fff',0,0,0,null,p,{id:'rock-throw',kind:'projectile',damageClass});assert.equal(before-e.hp,loss);}
 let before=e.hp;e.hurt(100);assert.equal(before-e.hp,100);
 let sent;e.remote=true;G.Coop.hit=(enemy,dmg)=>sent=dmg;before=e.hp;e.hurt(100,'#fff',0,0,0,null,p,{damageClass:'special'});assert.equal(sent,100);assert.equal(before-e.hp,100);
});
test('evolution refreshes all six base stats and keeps earned HP, ratio and dual-attack upgrades',()=>{
 const s=fixture(),{G}=s,p=s.player(4);p.evolutionPath=[4,5,6];p.level=8;p.monStage=4;p.atkMul=1.4;p.maxHp+=60;p.hp=p.maxHp*.4;
 G.DB.save.owned[5]={at:1,iv:[31,1,2,31,30,29]};assert.equal(G.MonProgression.evolve(p,{dex:5}),true);const st=G.MonProgression.stats(5);
 close(p.baseAtk,st.atk);close(p.baseSpa,st.spa);close(p.baseDefense,st.defense);close(p.baseSpDef,st.spdef);close(p.baseSpd,st.spd);close(p.maxHp,st.hp+60);close(p.hp,p.maxHp*.4);close(p.atk/st.atk,1.4);close(p.spa/st.spa,1.4);
});
test('P2P host reconstructs normal and evolved damage classes and applies only the target defense',()=>{
 const s=fixture(),{G}=s;let receive;G.Net={uid:'host',on:f=>receive=f,onPeer:noop};G.startMoveOf=()=> 'shadow-ball';G.Sprites.preload=noop;G.Game.st={time:1};s.load('js/net/coop.js');
 const p=s.player(150),e=s.enemy();e.id=77;e.defense=2;e.spdef=4;G.EnemyMgr.get=id=>id===77?e:null;
 G.Coop.begin({host:'host',members:[{uid:'host',dex:150},{uid:'peer',dex:150}]},p,{});
 const frame=[0,0,0,0,100,100,0,'shadow-ball',5,78,0,1,0,0,0,null];
 for(const [evolved,loss]of [[0,25],[1,50]]){const before=e.hp;receive('peer',{k:'f',p:frame,ev:[['h',77,100,'#fff',0,0,0,'shadow-ball',evolved]]});assert.equal(before-e.hp,loss);}
 G.Coop.end();
});

test('existing orbit projectiles update attack category when the learned move evolves',()=>{
 const s=fixture(),{G}=s,p=s.player(6),m=G.Moves.instance('fire-spin',5);p.baseAtk=2;p.baseSpa=5;p.moves=[m];p.slots=[[m]];
 G.Combat.tick(0,p,0);assert.ok(G.Projectiles.all().length>0);assert.ok(G.Projectiles.all().every(o=>o.damageClass==='special'&&o.dmg===m.dmg*5));
 assert.equal(G.Moves.evolve(m),true);G.Combat.tick(0,p,0);assert.ok(G.Projectiles.all().every(o=>o.damageClass==='physical'&&o.evolved&&o.dmg===m.dmg*2));
});
test('Z budgets and spawned projectile metadata use the selected physical or special attack',()=>{
 const s=fixture(),{G}=s;s.load('js/systems/z-access.js');s.load('js/systems/z-moves.js');const p=s.player(6);G.Game.state='playing';G.Game.player=p;p.baseAtk=2;p.baseSpa=5;
 for(const [id,power]of [['rock-throw',2],['ember',5]]){
  G.Projectiles.clear();const m=G.Moves.instance(id);p.moves=[m];p.slots=[[m]];G.ZMoves.grant(G.DB.save,m.type);assert.equal(G.ZMoves.equip(G.DB.save,p.dex,m.type),true);p.zState=null;G.ZMoves.init(p,G.DB.save);
  assert.equal(G.ZMoves.arm(p),true);assert.equal(G.ZMoves.choose(p,0),true);close(p.zState.casts[0].budget,1200*power);
  G.ZMoves.tick(p,.01);assert.ok(G.Projectiles.all().length>0);assert.ok(G.Projectiles.all().every(o=>o.damageClass===m.damageClass));G.ZMoves.cancel(p);
 }
});

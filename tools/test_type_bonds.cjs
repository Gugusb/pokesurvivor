const test=require('node:test'),assert=require('node:assert/strict'),{context}=require('./battle_fixture.cjs');
const noop=()=>{},close=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
function setup(type='fire',n=5){
 const s=context('zh',false),g=s.G;for(const f of ['js/core/settings.js','js/data/egg-groups.js','js/entities/projectile.js','js/systems/expedition-rules.js','js/systems/squad.js','js/systems/squad-bonds.js','js/data/type-bonds.js','js/systems/type-bonds.js','js/systems/move-control.js','js/systems/move-pp.js','js/systems/combat.js'])s.load(f);
 g.Sprites.preload=noop;g.Sprites.Animator.prototype._start=noop;g.FX=new Proxy({},{get:(o,k)=>o[k]||noop});g.Pickups={dropXp:noop,drop:noop};g.Difficulty={treasureChance:()=>0,onHurt:noop,factors:()=>({hp:1,damage:1,speed:1})};g.World.propsInCircle=()=>[];g.World.isWall=()=>false;g.World.projectileBlock=()=>null;g.VFX={forMove:()=>({}),forType:()=>({})};
 const cap=s.player(25);cap.mon={...cap.mon,types:[type]};g.Squad.begin(cap);for(let i=0;i<3;i++)g.Squad.upgrade();
 const members=[];for(let i=0;i<n-1;i++){const p=g.Squad.recruit([6,9,3,26,65,68][i]);p.mon={...p.mon,name:'Type partner '+i,types:[type]};members.push(p);}
 for(const p of g.Squad.actors()){p.baseAtk=10;p.baseSpa=20;p.baseDefense=2;p.baseSpDef=4;p.critChance=0;p.moves=[g.Moves.instance('tackle')];p.slots=[p.moves];p.active=0;}
 g.Squad.refresh();g.Game.player=cap;g.Game.everyone=()=>g.Squad.actors();s.Math.random=()=>.99;
 const foe=(x=40,y=0)=>{const e=s.enemy();e.x=x;e.y=y;e.hp=e.maxHp=1e6;e.defense=e.spdef=1;e.touchCd=100;return e;};
 const p=members[0]||cap,hit=(e,amount=10,owner=p,attack={})=>e.hurt(amount,'#fff',1,0,0,null,owner,{id:owner.moves[0]?.id||'test-hit',type,kind:'projectile',...attack});
 return {...s,g,cap,p,members,foe,hit,B:g.TypeBonds};
}

test('all 18 definitions use 2/5 thresholds and exact 0/100/300 anchors, extrapolating the last slope beyond 300',()=>{
 const {g,B}=setup();assert.equal(g.TypeBondDefs.LIST.length,18);for(const d of g.TypeBondDefs.LIST){assert.deepEqual(Array.from(d.thresholds),[2,5]);for(const nodes of Object.values(d.values))for(const [l,want]of [[0,nodes[0]],[100,nodes[1]],[300,nodes[2]],[400,nodes[2]+(nodes[2]-nodes[1])*.5]])close(g.TypeBondDefs.interpolate(nodes,l),want);}
 assert.equal(g.SquadBonds.layer('types','fire'),0);assert.equal(g.SquadBonds.layer('skill','projectile'),0);assert.equal(B.state('fire').tier,5);
});
test('damage basis sums only living deployed same-type physical and special attacks and multiplies by 30 percent',()=>{
 const {g,B,cap,members}=setup('fire',3),expected=g.Squad.actors().reduce((s,p)=>s+p.atk+p.spa,0)*.3;close(B.base('fire'),expected);members[0].dead=true;close(B.base('fire'),(cap.atk+cap.spa+members[1].atk+members[1].spa)*.3);g.Squad.bench(members[1]);close(B.base('fire'),(cap.atk+cap.spa)*.3);assert.equal(B.base('water'),0);
});
test('normal marks persist, amplify the next matching partner hit, are consumed and are not reapplied on that hit',()=>{
 const {g,B,p,foe,hit,Math:rng}=setup('normal');const e=foe();rng.random=()=>0;hit(e);assert.equal(e.typeBondState.normal,true);const hp=e.hp;hit(e);close(hp-e.hp,18);assert.equal(e.typeBondState.normal,false);g.SquadBonds.setLayer('types','normal',100);hit(e);const h=e.hp;hit(e);close(h-e.hp,30);
});
test('fire ignite ticks with the shared basis and reapplication at five triggers one non-recursive explosion',()=>{
 const s=setup('fire'),{B,g}=s,e=s.foe();s.Math.random=()=>0;s.hit(e);assert.ok(e.typeBondState.ignite);const hp=e.hp;B.enemyTick(e,1);close(hp-e.hp,Math.round(B.base('fire')*.35));assert.ok(e.typeBondState.ignite.left>0);const h=e.hp;s.hit(e);close(h-e.hp,10+Math.round(B.base('fire')*3.5));assert.equal(e.typeBondState.ignite,null);
});
test('wet slows enemies, and water refund can happen only once per original multi-hit skill cast',()=>{
 const s=setup('water'),{B,g,p}=s,e=s.foe();s.Math.random=()=>0;const m=p.moves[0],pp=g.MovePP.state(p,m),id=B.cast(p,m);pp.current=2;s.hit(e,10,p,{typeCastId:id});close(B.enemySpeed(e),.9);s.hit(e,10,p,{typeCastId:id});assert.equal(pp.current,3);s.hit(e,10,p,{typeCastId:id});assert.equal(pp.current,3);B.enemyTick(e,5);assert.equal(e.typeBondState.wet,0);
});
test('grass creates thorns per grass partner, ticks later, roots at five and heals only grass partners within them',()=>{
 const s=setup('grass'),{B,g,p}=s,e=s.foe();p.hp=p.maxHp*.5;const hp=p.hp;s.Math.random=()=>0;B.tick(2);assert.equal(B.fields.length,g.Squad.actors().length);assert.ok(B.fields.every(f=>f.r===175));const h=e.hp;B.tick(1);assert.ok(e.hp<h);assert.ok(B.immobile(e));assert.ok(p.hp>hp);B.beginStage();assert.equal(B.fields.length,0);
});
test('shock triggers on another element hit, its chain does not recursively shock and five unlocks squad speed',()=>{
 const s=setup('electric'),{B,g,cap}=s,e=s.foe(30),foes=Array.from({length:6},(_,i)=>s.foe(60+i*20));s.Math.random=()=>0;s.hit(e);assert.ok(e.typeBondState.shock>0);const before=foes.map(e=>e.hp);const outsider=new g.Player(g.DEX_BY[1]);s.hit(e,10,outsider,{type:'normal'});assert.equal(foes.filter((e,i)=>e.hp<before[i]).length,5);assert.ok(foes.some(e=>e.freezeT===1.5));close(B.speed(cap),1.2);
});
test('ice accumulates frost and freezes, guarantees bonus criticals, and frozen defeats emit penetrating shards',()=>{
 const s=setup('ice'),{B,g,p}=s,e=s.foe();s.Math.random=()=>0;for(let i=0;i<3;i++)s.hit(e);assert.equal(e.typeBondState.frost,0);assert.equal(e.typeBondState.frozen,1);assert.ok(B.forceCrit(p,e));const hp=e.hp;s.hit(e);close(hp-e.hp,20);s.hit(e,1e9);assert.equal(g.Projectiles.all().filter(p=>p.moveId==='typebond-ice').length,2);
});
test('fighting amplifies knockback and heals from actual damage taken in the last three seconds',()=>{
 const s=setup('fighting'),{B,p}=s,e=s.foe();p.maxHp=p.hp=1000;p.invuln=0;p.hurt(100,null,true,{kind:'environment'});assert.equal(p.hp,900);s.hit(e);close(p.hp,905);close(B.knock(p,{}),2);B.tick(3.01);const hp=p.hp;s.hit(e);assert.equal(p.hp,hp);
});
test('poison respects 10/30 caps and a death spreads all stacks evenly without cloning them per neighbor',()=>{
 const s=setup('poison'),{B,g}=s,e=s.foe();s.Math.random=()=>0;for(let i=0;i<40;i++)s.hit(e);assert.equal(e.typeBondState.poison.n,30);const a=s.foe(60),b=s.foe(80);s.hit(e,1e9);assert.equal(a.typeBondState.poison.n+b.typeBondState.poison.n,30);assert.equal(a.typeBondState.poison.n,15);assert.equal(b.typeBondState.poison.n,15);assert.ok(a.hp<a.maxHp);
});
test('earth shields are shared, block contact only and trigger a single battlefield quake when spent at five',()=>{
 const s=setup('ground'),{B,cap,p}=s,e=s.foe();cap.maxHp=cap.hp=1000;cap.invuln=0;B.tick(10);assert.equal(B.shields,1);assert.equal(cap.hurt(100,null,true,{kind:'contact',enemy:e}),false);assert.equal(cap.hp,1000);assert.equal(B.shields,0);assert.equal(e.freezeT,2);assert.ok(e.hp<e.maxHp);cap.invuln=0;cap.hurt(100,null,true,{kind:'ranged'});assert.equal(cap.hp,900);
});
test('flying is one squad pulse, upgrading from periodic knockback to continuous slowing damage',()=>{
 const a=setup('flying',2),e=a.foe();a.B.tick(2.9);assert.equal(e.hp,e.maxHp);a.B.tick(.11);assert.ok(e.hp<e.maxHp);assert.ok(e.kx>0);
 const b=setup('flying'),f=b.foe();b.B.tick(.2);assert.ok(f.hp<f.maxHp);assert.equal(f.slow,.55);assert.equal(f.kx,0);
});
test('psychic adds two marks at five and high pre-existing marks give all members non-stacking temporary agility',()=>{
 const s=setup('psychic'),{B,g,p,cap}=s,e=s.foe();const agility=p.agility;for(let i=0;i<53;i++)s.hit(e,1,p,{type:'psychic'});assert.equal(e.typeBondState.psychic,106);close(p.agility,agility*2);assert.equal(B.agility(cap),1);B.tick(2.01);close(p.agility,agility);
});
test('bug ascension preserves a Bug captain, sacrifices only members, inherits base stats, heals and resets at the next stage',()=>{
 const s=setup('bug'),{B,g,p,cap,members}=s;const baseHp=cap.maxHp,inherited=members.reduce((n,p)=>n+p.baseAtk,0);for(let i=0;i<91;i++)B.cast(p,p.moves[0]);assert.equal(B.ascended,true);assert.equal(cap.dead,false);assert.ok(members.every(p=>p.dead));close(B.baseBonus(cap,'atk'),inherited);assert.ok(cap.maxHp>baseHp);cap.hp=cap.maxHp*.5;const hp=cap.hp;cap.regenerate(1);close(cap.hp-hp,cap.maxHp*.15);B.beginStage();g.Squad.recover();assert.equal(B.ascended,false);assert.equal(B.cluster,0);assert.ok(members.every(p=>!p.dead));close(B.baseBonus(cap,'atk'),0);
});
test('rock waits three seconds, increases its radius at five and gives temporary agility only to Rock partners',()=>{
 const s=setup('rock'),{B,p}=s,e=s.foe();s.Math.random=()=>0;s.hit(e);assert.equal(B.fields[0].kind,'rock');const hp=e.hp,ag=p.agility;B.tick(2.9);assert.equal(e.hp,hp);B.tick(.11);assert.ok(e.hp<hp);close(p.agility,ag*2);B.tick(2.01);close(p.agility,ag);
});
test('ghost drains current HP, reduces Boss drain by 75 percent and feared deaths can spread fear at five',()=>{
 const a=setup('ghost'),e=a.foe(),boss=a.foe(70);boss.boss=true;a.Math.random=()=>0;a.hit(e);a.hit(boss);const eh=e.hp,bh=boss.hp;a.B.enemyTick(e,1);a.B.enemyTick(boss,1);close(eh-e.hp,Math.round(eh*.02));close(bh-boss.hp,Math.round(bh*.005));assert.ok(a.B.immobile(e));a.hit(e,1e9);assert.ok(boss.typeBondState.fear.left>0);
});
test('dragon buffs all members regardless of their type, excludes captain from that clause, and ignores its own meteor kills',()=>{
 const s=setup('dragon',6),{B,g,cap,members}=s,p=members.at(-1);p.mon={...p.mon,types:['normal']};g.Squad.refresh();close(B.damageMultiplier(p),1.15);close(B.damageMultiplier(cap),1);const m=p.moves[0];close(B.move(p,m).radius,m.radius*1.2);const target=s.foe();
 for(let i=0;i<99;i++)B.death({id:'kill'+i,dead:true,lastAttacker:p,lastTypeBondAttack:{},x:1000,y:1000});const hp=target.hp;B.death({id:'ignored',dead:true,lastAttacker:p,lastTypeBondAttack:{noDragonCount:true},x:1000,y:1000});assert.equal(target.hp,hp);B.death({id:'last',dead:true,lastAttacker:p,lastTypeBondAttack:{},x:1000,y:1000});assert.ok(target.hp<hp);
});
test('dark can generate standalone DOT without Fire/Ghost/Poison contributors, copy up to fourfold and refresh legacy timers',()=>{
 const s=setup('dark'),{B}=s,e=s.foe();s.Math.random=()=>0;s.hit(e);assert.ok(e.typeBondState.ignite);s.Math.random=()=>.99;e.burn=2;e.burnT=1;e.poison=1;e.poisonT=1;for(let i=0;i<4;i++)s.hit(e);assert.equal(e.typeBondState.amp,4);assert.equal(e.burnT,3);assert.equal(e.poisonT,4);const hp=e.hp;B.enemyTick(e,1);assert.ok(e.hp<hp);
});
test('steel reflection uses the bearer defenses while its five-person head/tail bonus is independent of their type',()=>{
 const s=setup('steel'),{B,cap,p,g}=s,e=s.foe();const hp=e.hp;B.contact(p,e);close(hp-e.hp,9);close(B.defense(cap),.9);close(B.damageMultiplier(cap),1.25);assert.equal(B.defense(p),1);
});
test('fairy heals the lowest current-HP living partner and executes ordinary foes, with distinct Boss and elite execution damage',()=>{
 const s=setup('fairy'),{B,cap,p,g}=s,e=s.foe();for(const q of g.Squad.actors())q.hp=q.maxHp=1000;p.hp=100;e.hp=1;s.hit(e);close(p.hp,150);
 const ordinary=s.foe();ordinary.maxHp=1000;ordinary.hp=100;ordinary.shield=200;s.hit(ordinary);assert.equal(ordinary.dead,true);
 const boss=s.foe();boss.boss=true;boss.maxHp=1000;boss.hp=100;s.hit(boss);assert.equal(boss.hp,85);const elite=s.foe();elite.elite=true;elite.maxHp=1000;elite.hp=100;s.hit(elite);assert.equal(elite.hp,80);
});

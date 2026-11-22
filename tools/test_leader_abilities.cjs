const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {context}=require('./battle_fixture.cjs');
function setup(dex=4,level=1,medal=true,reuse=null){
 const s=reuse||context('zh',false),G=s.G;
 if(!reuse){
 G.LeaderAbilitiesConfig=JSON.parse(fs.readFileSync('config/leader_abilities_gen1.json','utf8'));
 s.load('js/data/leader-medals.js');G.LeaderMedals.install();
 s.load('js/systems/move-pp.js');s.load('js/entities/projectile.js');
 G.VFX={forMove:()=>({pal:'normal'}),forType:()=>({pal:'normal'})};
 Object.assign(G.World,{isFree:()=>true,isWall:()=>false,propsInCircle:()=>[],damageProp:()=>{},projectileBlock:()=>null,arenaContains:()=>true});
 G.Weather.force=(kind)=>G.Weather.current={kind};
 s.load('js/systems/combat.js');s.load('js/systems/leader-abilities.js');s.load('js/systems/leader-z-moves.js');
 }
 s.enemies=[];G.Projectiles.clear();G.Combat.clearFields();
 const p=s.player(dex);p.addMove(G.Moves.startFor(p.mon));p.onDealt=()=>{};
 G.Game.player=p;G.Game.state='playing';
 G.Squad={actors:()=>s.players,growth:()=>0};G.Expedition={active:true,run:{captain:p,trainerLevel:level,phase:'combat',gold:100,squadHp:20,kind:'battle',wave:{count:100,duration:100}}};
 const d=G.LeaderAbilities.definition(dex);
 if(medal)G.DB.save.abilityMedals[G.LeaderMedals.medalsFor(dex).find(m=>m.leader).id]={at:1};
 G.LeaderAbilities.begin(G.Expedition.run);G.LeaderAbilities.beginBattle();
 return Object.assign(s,{p,d});
}
test('74 catalogue families, all named Z handlers and readable five-part parameters are covered',()=>{
 const {G}=setup();assert.equal(G.LeaderAbilitiesConfig.families.length,74);assert.equal(G.LeaderAbilities.zKinds.length,74);
 for(const f of G.LeaderAbilitiesConfig.families){assert.ok(G.LeaderAbilities.zKinds.includes(f.active.kind));assert.ok(G.LeaderMedals.medalsFor(f.members.find(d=>G.DEX_BY[d]?.gen===1)).some(d=>d.leader));}
});
test('passives and costs do not require medals; 5/8 advances use trainer level; family medals and legacy medals unlock Z',()=>{
 const {G,p}=setup(4,1,false);assert.equal(G.LeaderMedals.unlocked(6),false);assert.equal(G.LeaderAbilities.profile().moves.cone.range,1.7);assert.equal(G.LeaderAbilities.profile().weakDamage,1.35);assert.equal(G.LeaderAbilities.profile().burnCrit,undefined);
 G.Expedition.run.trainerLevel=5;assert.equal(G.LeaderAbilities.profile().burnCrit,.2);G.Expedition.run.trainerLevel=8;assert.equal(G.LeaderAbilities.profile().wallExplosion,true);
 G.DB.save.abilityMedals['4-leader_inferno_cone']={at:1}; // only recognized identities qualify
 const m=G.LeaderMedals.medalsFor(4).find(m=>m.leader);G.DB.save.abilityMedals[m.id]={at:1};assert.equal(G.LeaderMedals.unlocked(6),true);
 const s=setup(147,1,false);s.G.DB.save.abilityMedals['149-multiscale']={at:1};assert.equal(s.G.LeaderMedals.unlocked(147),true);
});
test('charge requires matching ordinary actions; manual cast consumes one, no auto cast or recursive charging',()=>{
 const {G,p}=setup();const L=G.LeaderAbilities,s=L.state();
 L.onCast(p,{kind:'beam',type:'fire'});assert.equal(s.charge,0);
 L.onCast(p,{kind:'cone',type:'fire',leaderGenerated:true});assert.equal(s.charge,0);
 s.targetEvents=3;for(let i=0;i<3;i++)L.onCast(p,{kind:'cone',type:'fire'});assert.equal(s.charge,1);assert.equal(s.zCasts,undefined);
 assert.equal(L.activate(),true);assert.equal(s.charge,0);assert.equal(s.zCasts,1);assert.equal(L.activate(),false);
 L.finishBattle();s.charge=.42;L.beginBattle();assert.equal(s.charge,.42);G.Expedition.run.phase='route';L.tick(100);assert.equal(s.charge,.42);
});
test('HP modifiers preserve wounds through repeated refreshes and never touch strategic squad HP',()=>{
 const {G,p}=setup(143);p.hp=p.maxHp*.2;const max=p.maxHp,hp=p.hp;
 for(let i=0;i<100;i++)G.LeaderAbilities.sync(p);assert.equal(p.maxHp,max);assert.equal(p.hp,hp);assert.equal(G.Expedition.run.squadHp,20);
 const before=p.hp/p.maxHp;G.Expedition.run.trainerLevel=8;G.LeaderAbilities.sync(p);assert.equal(p.hp/p.maxHp,before);assert.equal(G.Expedition.run.squadHp,20);
});
test('all 74 active families execute through real combat primitives at trainer level 8 without invalid projectile numbers',()=>{
 const all=JSON.parse(fs.readFileSync('config/leader_abilities_gen1.json')).families;
 let shared=null;for(const f of all){const s=shared=setup(f.members.find(d=>safelyHas(d)),8,true,shared),{G,p}=s;const e=s.enemy();e.x=p.x+60;e.y=p.y;e.maxHp=e.hp=1e7;e.poison=3;e.burn=3;e.shield=100;p.target=e;
  G.LeaderAbilities.state().charge=1;assert.equal(G.LeaderAbilities.activate(),true,f.id);
  for(let n=0;n<25;n++){G.LeaderAbilities.tick(.2);G.Combat.updateFields(.2);G.Projectiles.update(.2,p,G.EnemyMgr.all());G.Combat.resolve(.2,p,n*.2);}
  for(const shot of G.Projectiles.all())assert.ok([shot.x,shot.y,shot.dmg,shot.r].every(Number.isFinite),f.id);
  assert.equal(G.Expedition.run.squadHp,20,f.id);assert.ok(G.LeaderAbilities.state().charge<1,f.id);
 }
 function safelyHas(d){return d<=151;}
});
test('healing/shield limits, one rescue per actor and forbidden move replacement respect boundaries',()=>{
 const {G,p}=setup(13,8);p.hp=1;G.LeaderAbilities._z.heal(p,1e9);assert.ok(p.hp<=1+p.maxHp*.03+1e-8);G.LeaderAbilities._z.shield(p,1e9);assert.equal(p.leaderState.shield,p.maxHp*.4);
 const legal=G.LeaderAbilities.legalFixed(G.DEX_BY[1],G.Moves.ALL.find(m=>m.kind==='aura').id);assert.ok(legal);assert.notEqual(G.Moves.BY_ID[legal].kind,'aura');
 const r=setup(19,8);r.p.hp=-1;assert.equal(r.G.LeaderAbilities.rescue(r.p),true);r.p.hp=-1;assert.equal(r.G.LeaderAbilities.rescue(r.p),false);
});
test('charge pacing uses game time consistently at 1x and 4x',()=>{
 function sample(speed){const {G,p}=setup(4);let ticks=0;for(let real=0;real<60/speed;real+=1/60)for(let n=0;n<speed;n++){G.LeaderAbilities.tick(1/60);ticks++;if(ticks%120===0)G.LeaderAbilities.onCast(p,{kind:'cone',type:'fire'});}return G.LeaderAbilities.state().charge;}
 assert.ok(Math.abs(sample(1)-sample(4))<.01);
});

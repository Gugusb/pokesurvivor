const test=require('node:test'),assert=require('node:assert/strict');
const {context}=require('./battle_fixture.cjs');
let cached;
function setup(dex=906,reuse=null){
 const x=reuse||cached||context('zh',false),G=x.G;
 if(!cached){
  G.LeaderAbilitiesConfig=require('./leader_config.cjs').read(process.cwd());
  x.load('js/data/leader-medals.js');G.LeaderMedals.install();
  x.load('js/systems/move-pp.js');x.load('js/entities/projectile.js');
  G.VFX={forMove:()=>({pal:'normal'}),forType:()=>({pal:'normal'})};
  Object.assign(G.World,{isFree:()=>true,isWall:()=>false,propsInCircle:()=>[],damageProp:p=>p.hp=0,projectileBlock:()=>null,arenaContains:()=>true});
  G.Camera.sees=()=>true;G.STARTER_ITEMS=[];G.Items.permitted=()=>true;G.Abilities.healEnemy=()=>0;
  G.ExpeditionSupplies={maxHp:()=>100,xpFactor:()=>1,canGain:()=>true,gained:()=>{}};
  G.Weather.force=kind=>G.Weather.current={kind};G.Weather.clear=()=>G.Weather.current=null;G.Weather.hasWeather=()=>!!G.Weather.current;
  G.Weather.mult=type=>{const k=G.Weather.current?.kind;if(k==='sun')return type==='fire'?1.5:type==='water'?.5:1;if(k==='rain')return type==='water'?1.5:type==='fire'?.5:type==='electric'?1.2:1;return 1;};
  for(const file of ['js/systems/economy.js','js/systems/combat.js','js/systems/leader-abilities.js','js/systems/leader-z-moves.js','js/systems/actor-status.js','js/systems/leader-johto.js','js/systems/leader-johto-z.js','js/systems/leader-hoenn.js','js/systems/leader-hoenn-z.js','js/systems/hoenn-terrain.js','js/systems/hoenn-market.js','js/systems/leader-sinnoh.js','js/systems/leader-sinnoh-z.js','js/systems/leader-unova.js','js/systems/leader-unova-z.js','js/systems/unova-market.js','js/systems/leader-kalos.js','js/systems/leader-kalos-z.js','js/systems/leader-alola.js','js/systems/leader-alola-z.js','js/systems/leader-galar.js','js/systems/leader-galar-z.js','js/systems/leader-paldea.js','js/systems/leader-paldea-z.js'])x.load(file);
 }
 cached=x;x.random([.5]);G.Weather.current=null;x.enemies=[];G.Projectiles.clear();G.Combat.clearFields();
 const p=x.player(dex);p.addMove(G.Moves.startFor(p.mon));p.onDealt=()=>{};G.Game.player=p;G.Game.state='playing';
 G.Squad={active:true,actors:()=>x.players,roster:[],growth:()=>0,refresh:()=>{}};
 G.Expedition={active:true,run:{captain:p,trainerLevel:8,phase:'combat',day:1,cycle:1,gold:100,squadHp:20,kind:'battle',wave:{count:100,duration:120},shopFreeRefreshes:0}};
 const d=G.LeaderAbilities.definition(dex);
 G.DB.save.abilityMedals[G.LeaderMedals.medalsFor(dex).find(m=>m.leader).id]={at:1};
 G.LeaderAbilities.begin(G.Expedition.run);G.LeaderAbilities.beginBattle();
 return Object.assign(x,{p,d});
}
function ally(x,dex=25){
 const p=new x.G.Player(x.G.DEX_BY[dex]);p.isSquadMember=true;p.squadId='a'+x.players.length;p.rank=1;
 p.addMove(x.G.Moves.startFor(p.mon));x.players.push(p);x.G.Squad.roster.push(p);return p;
}

test('52 Paldea families retain all five original sections, estimates, deferred rules and cross-generation roots',()=>{
 const {G}=setup(),c=require('../config/leader_abilities_gen9.json');
 assert.equal(c.families.length,52);
 assert.equal(G.LeaderAbilities.zKinds.length,508);
 assert.equal(c.families.reduce((n,d)=>n+d.skipped.length,0),3);
 for(const d of c.families){
  assert.ok(d.estimate.length>20,d.root);
  for(const key of ['base','active','cost','five','eight'])assert.equal(d.description.zh[key],d.source.parts[key].join('\n'));
  for(const id of d.members)assert.equal(G.LeaderMedals.family(id).root,d.root);
  assert.ok(G.LeaderAbilities.zKinds.includes(d.active.kind));
 }
 assert.equal(G.LeaderMedals.family(979).root,56);
 assert.equal(G.LeaderMedals.family(980).root,194);
 assert.equal(G.LeaderMedals.family(981).root,203);
 assert.equal(G.LeaderMedals.family(982).root,206);
 assert.equal(G.LeaderMedals.family(983).root,624);
 assert.equal(G.LeaderMedals.family(1011).root,840);
 assert.equal(G.LeaderMedals.family(1019).root,840);
 assert.equal(G.LeaderMedals.family(1018).root,884);
});

test('all 52 manual Z operate in real combat, remain finite, damage offensively and preserve strategic HP',()=>{
 for(const d of require('../config/leader_abilities_gen9.json').families){
  const x=setup(d.root),{G,p}=x,e=x.enemy();
  e.hp=e.maxHp=1e8;e.x=p.x+Math.cos(p.aim)*65;e.y=p.y+Math.sin(p.aim)*65;e.types=['normal'];e.poison=2;p.target=e;
  G.LeaderAbilities.state().charge=1;
  assert.equal(G.LeaderAbilities.activate(),true,d.root);
  if(d.active.power===0)assert.ok(G.LeaderAbilities._z.own(p).shield>0,'support Z shield '+d.root);
  for(let i=0;i<150;i++){G.LeaderAbilities.tick(.05);G.Combat.updateFields(.05);G.Projectiles.update(.05,p,[e]);G.Combat.resolve(.05,p,i*.05);}
  if(d.active.power>0)assert.ok(e.hp<e.maxHp,'no offensive damage '+d.root);
  assert.equal(G.Expedition.run.squadHp,20,d.root);
  assert.ok([p.hp,p.maxHp,p.atk,p.spa,p.spd].every(Number.isFinite),d.root);
 }
});

test('alpha.66 charging stays 120 combat seconds with matching-event boost; pauses in shop',()=>{
 const x=setup(906),{G}=x;
 G.LeaderAbilities.tick(30);assert.ok(Math.abs(G.LeaderAbilities.state().charge-.25)<1e-8);
 G.Expedition.run.phase='shop';G.LeaderAbilities.tick(90);assert.ok(Math.abs(G.LeaderAbilities.state().charge-.25)<1e-8);
 G.Expedition.run.phase='combat';for(let i=0;i<10;i++)G.LeaderAbilities._z.event('crit');
 G.LeaderAbilities.tick(10);assert.ok(Math.abs(G.LeaderAbilities.state().charge-5/12)<1e-8);
});

test('fire/ground absorb, Bellibolt dual hurt boost, Walking Wake sun water immunity and Terapagos PP floor work',()=>{
 let x=setup(926),{G,p}=x;
 const baseAtk=G.LeaderAbilities.factor(p,'atk');
 assert.equal(G.LeaderAbilities.beforeHurt(p,'fire',{kind:'ranged',enemy:{dmg:10}}),false);
 assert.ok(Math.abs(G.LeaderAbilities.factor(p,'atk')-(baseAtk+.25))<1e-8);

 x=setup(968);G=x.G;p=x.p;p.hp=p.maxHp*.5;
 assert.equal(G.LeaderAbilities.beforeHurt(p,'ground',{kind:'ranged',enemy:{dmg:10}}),false);
 assert.ok(p.hp>p.maxHp*.5);

 x=setup(938);G=x.G;p=x.p;
 const spaBefore=G.LeaderAbilities.factor(p,'spa'),atkBefore=G.LeaderAbilities.factor(p,'atk');
 G.LeaderAbilities.hurt(p,10,'normal',{kind:'contact'});
 assert.ok(G.LeaderAbilities.factor(p,'atk')>atkBefore+.29);
 assert.ok(G.LeaderAbilities.factor(p,'spa')>spaBefore+.29);

 x=setup(1009);G=x.G;p=x.p;G.Weather.force('sun');
 const e=x.enemy();
 assert.ok(Math.abs(G.LeaderAbilities.outgoing(p,e,{kind:'beam',type:'water'})*G.Weather.mult('water')-1)<1e-8);

 x=setup(1024);G=x.G;p=x.p;p.hp=p.maxHp;
 const fullDmg=G.LeaderAbilities.incoming(p,100,'normal',{kind:'ranged'});
 p.hp=p.maxHp*.5;
 const midDmg=G.LeaderAbilities.incoming(p,100,'normal',{kind:'ranged'});
 assert.ok(fullDmg<midDmg*.6);
 assert.equal(G.LeaderAbilities.ppCost(p,{kind:'beam'},1),1);
});

test('Paldea specialized hooks: Revavroom poison trail, Wugtrio burrow debuff, Cyclizar warp reset, Cetitan snow heal, Sandy Shocks weather haste',()=>{
 let x=setup(965),{G,p}=x;
 p.x+=20;G.LeaderAbilities.tick(.1);
 assert.ok(G.LeaderAbilities.fields.some(v=>v.kind==='paldeaPoisonTrail'&&v.opts.slow===.6));

 x=setup(960);G=x.G;p=x.p;
 const e=x.enemy();e.x=p.x+40;e.y=p.y;
 for(let i=0;i<61;i++){p.x+=2;G.LeaderAbilities.tick(.1);}
 assert.ok(G.LeaderAbilities._z.own(p).burrowUntil>G.LeaderAbilities.state().time);
 for(let i=0;i<14;i++){p.x+=2;G.LeaderAbilities.tick(.1);}
 assert.ok(e.leaderDamage<=.75&&e.leaderDamageUntil>G.LeaderAbilities.state().time);

 x=setup(967);G=x.G;p=x.p;
 p.moves.push({id:'tackle',kind:'dash',t:5,cd:5});p.hp=0;
 assert.equal(G.LeaderAbilities.rescue(p),true);
 assert.equal(p.moves.find(m=>m.kind==='dash').t,0);

 x=setup(974);G=x.G;p=x.p;p.hp=p.maxHp*.5;G.Weather.force('snow');
 assert.equal(G.LeaderPaldea.weatherImmune(p),true);
 for(let i=0;i<10;i++)G.LeaderAbilities.tick(.1);
 assert.ok(p.hp>p.maxHp*.5);

 x=setup(989);G=x.G;p=x.p;
 assert.equal(G.Weather.current?.kind,'sand');
 assert.equal(G.LeaderPaldea.weatherImmune(p),true);
 const sandRate=G.LeaderAbilities.rate(p,{kind:'chain',cd:2});
 G.Weather.clear();
 const clearRate=G.LeaderAbilities.rate(p,{kind:'chain',cd:2});
 assert.ok(sandRate>clearRate*1.15);
});

test('Tinkaton and Iron Leaves bypass shields only on ordinary melee; Baxcalibur Z applies post-strike exposure',()=>{
 for(const dex of [957,1010]){
  const x=setup(dex),{G,p}=x,e=x.enemy();
  e.hp=e.maxHp=1000;e.shield=500;
  e.hurt(20,'#fff',0,0,0,null,p,{kind:'melee',type:'steel',damageClass:'physical'});
  assert.equal(e.shield,500,dex);assert.ok(e.hp<1000,dex);
  const hp=e.hp;
  e.hurt(20,'#fff',0,0,0,null,p,{kind:'projectile',type:'steel',damageClass:'physical'});
  assert.equal(e.hp,hp,dex);assert.ok(e.shield<500,dex);
 }
 const x=setup(996),{G,p}=x;
 const before=G.LeaderAbilities.incoming(p,100,'normal',{kind:'ranged'});
 G.LeaderAbilities.state().charge=1;G.LeaderAbilities.activate();
 const exposed=G.LeaderAbilities.incoming(p,100,'normal',{kind:'ranged'});
 assert.ok(exposed>before*1.2);
});

test('Flittle, Gholdengo, Tinkaton and Rellor shop/interest/elite/rescue rules work cleanly',()=>{
 let x=setup(955),{G}=x,r=G.Expedition.run;
 G.HoennMarket.enterShop(r,[]);G.HoennMarket.enterShop(r,[]);
 assert.equal(r.shopFreeRefreshes,1);assert.equal(G.LeaderAbilities.refreshCost(1),2);

 x=setup(1000);G=x.G;r=G.Expedition.run;
 assert.equal(G.Economy.interest(48,r),6);
 r.gold=10;assert.ok(G.LeaderAbilities.factor(x.p,'defense')<.8);
 G.HoennMarket.enterShop(r,[]);assert.equal(r.shopFreeRefreshes,1);

 x=setup(957);G=x.G;r=G.Expedition.run;
 G.LeaderAbilities.finishBattle();r.phase='rewards';
 G.HoennMarket.settle(r,{victory:true,eventType:'elite'},{baseWage:3,totalGoldGained:3});
 assert.equal(r.kalosItemChoice.ids.length,3);
 r.phase='loot';const id=r.kalosItemChoice.ids[0];
 assert.equal(G.LeaderKalos.claimItem(id),true);assert.equal(G.LeaderKalos.claimItem(id),false);

 x=setup(953);G=x.G;const a=ally(x);a.dead=true;a.hp=0;x.p.hp=0;
 assert.equal(G.LeaderAbilities.rescue(x.p),true);
 assert.equal(a.dead,false);assert.ok(a.hp>=a.maxHp*.25-1e-7);
});

test('shared boss Z budgets hold across all custom Paldea shapes and healing queues obey 3%/s cap',()=>{
 for(const dex of [906,909,935,951,960,965,969,987,989,994,1004,1006,1010,1015,1017,1024]){
  const x=setup(dex),{G,p}=x;ally(x);
  const e=x.enemy();e.x=p.x+50;e.y=p.y;e.hp=e.maxHp=1e8;e.boss=true;e.poison=3;p.target=e;
  G.LeaderAbilities.state().charge=1;G.LeaderAbilities.activate();
  const token=G.LeaderKalos.s().token;
  for(let i=0;i<140;i++){G.LeaderAbilities.tick(.05);G.Combat.updateFields(.05);G.Projectiles.update(.05,p,[e]);G.Combat.resolve(.05,p,i*.05);}
  assert.equal(G.LeaderKalos.s().token,token,dex);
  assert.ok(e.maxHp-e.hp<=G.LeaderAbilities._z.budget(p)*.65+15,dex);
  assert.equal(G.Expedition.run.squadHp,20,dex);
 }
 const x=setup(1012),{G,p}=x;p.hp=p.maxHp*.1;
 G.LeaderAbilities.state().charge=1;G.LeaderAbilities.activate();
 const before=p.hp;for(let i=0;i<20;i++)G.LeaderAbilities.tick(.1);
 assert.ok(p.hp-before<=p.maxHp*.09+1e-7);
 assert.ok(G.LeaderKalos.q(p).queuedHeal>0);
});

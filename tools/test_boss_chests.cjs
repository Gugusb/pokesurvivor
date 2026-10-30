const test=require('node:test'),assert=require('node:assert/strict');
const {context}=require('./battle_fixture.cjs');
function setup(){const s=context(),{G}=s,p=s.player(6);G.Game.player=p;G.Game.state='playing';s.load('js/entities/pickup.js');G.Game.offerSpecialChoice=options=>{(s.choices||=[]).push(options);};G.Progress={event:()=>{}};return s;}
test('a normal Boss drops one unopened chest, no immediate XP/coins/item; opening spawns rewards and one choice',()=>{
 const s=setup(),{G}=s,e=s.enemy();e.boss=true;e.xp=140;e.die();e.die();const all=G.Pickups.all();assert.equal(all.length,1);assert.equal(all[0].kind,'bossChest');assert.equal(s.choices,undefined);
 const c=all[0];assert.ok(G.BossRewards.open(c));const after=G.Pickups.all();assert.equal(after.filter(p=>p.kind==='xpBig').reduce((a,p)=>a+p.value,0),140);assert.equal(after.filter(p=>p.kind==='coin').reduce((a,p)=>a+p.value,0),50);assert.equal(s.choices.length,1);assert.equal(s.choices[0].length,3);assert.equal(after.filter(p=>p.kind==='item').length,0);
 const count=after.length;assert.equal(G.BossRewards.open(c),false);assert.equal(after.length,count);assert.equal(s.choices.length,1);
});
test('rift chest holds coins, tickets and gem until opening and survives a return to the surface',()=>{
 const s=setup(),{G}=s,c=G.BossRewards.drop({x:1000,y:1000,xp:280,legend:true});assert.equal(G.DB.save.abilityGems,10);
 G.BossRewards.returnFromRift({x:1000,y:1000,back:{x:10,y:20}});assert.equal(c.x,50);assert.equal(c.y,20);assert.equal(c.pulled,false);
 G.BossRewards.open(c);assert.equal(G.DB.save.abilityGems,11);assert.equal(G.Pickups.all().filter(p=>p.kind==='coin').reduce((a,p)=>a+p.value,0),130);assert.equal(G.Pickups.all().filter(p=>p.kind==='ticket').length,3);
 G.BossRewards.receive(c.id,{rift:true,stone:null,options:G.Items.rewardChoices()});assert.equal(G.DB.save.abilityGems,11);assert.equal(s.choices.length,1);
});
test('ordinary Boss and rift pools differ; rare rewards are available more often and with more kinds in rifts',()=>{
 const {G}=setup();let ordinary=new Set(),rift=new Set();for(let j=0;j<2000;j++){for(const id of G.Items.rewardChoices(Math.random,false))ordinary.add(id);for(const id of G.Items.rewardChoices(Math.random,true))rift.add(id);}
 assert.ok(ordinary.has('masterytm'));assert.ok(ordinary.has('linker'));assert.equal(ordinary.has('luckymedal'),false);assert.ok(rift.has('luckymedal'));assert.ok(rift.size>ordinary.size);
});
test('guest replicas cannot open chests; validated host rewards are applied once and do not spawn client loot',()=>{
 const s=setup(),{G}=s;G.Coop.active=true;G.Coop.isHost=false;const p={id:31,kind:'bossChest',x:0,y:0,value:{xp:100,rift:true}};
 assert.equal(G.BossRewards.open(p),false);assert.equal(G.Pickups.count,0);assert.equal(G.BossRewards.receive(31,{rift:true,stone:null,options:['bad','leftovers','quickclaw']}),false);
 const data={rift:true,stone:null,options:['leftovers','quickclaw','masterytm']};assert.ok(G.BossRewards.receive(31,data));assert.equal(G.BossRewards.receive(31,data),false);assert.equal(G.DB.save.abilityGems,11);assert.equal(G.Pickups.count,0);assert.equal(s.choices.length,1);
});
test('Judgment bosses also drop a normal chest, and unopened Boss chests are not discarded by ordinary pickup overflow',()=>{
 const s=setup(),{G}=s,e=s.enemy();e.boss=true;e.judge=true;e.legend=true;e.xp=140;e.die();assert.equal(G.Pickups.all().length,1);assert.equal(G.Pickups.all()[0].kind,'bossChest');assert.equal(G.Pickups.all()[0].value.rift,false);
 G.Pickups.clear();const c=G.BossRewards.drop({x:500,y:0,xp:100});for(let i=0;i<500;i++)G.Pickups.drop('coin',i,0,1);assert.ok(G.Pickups.all().includes(c));
});

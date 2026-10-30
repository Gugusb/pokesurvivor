const test=require('node:test'),assert=require('node:assert/strict');
const {context}=require('./battle_fixture.cjs');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function setup(){const s=context('zh',false);for(const d of [4,5,6,213])s.G.DB.save.owned[d]={at:1,iv:Array(8).fill(31)};return s;}
test('permanent levels add base HP, both attacks, both defenses, speed and agility without old damage/CD multipliers',()=>{
 const {G}=setup(),perks=G.Upgrades.perks({hp:2,atk:2,spd:2,cd:2,def:2,regen:2}),p=new G.Player(G.DEX_BY[4],perks);
 close(p.maxHp,p.baseHp*1.06);close(p.atk,p.baseAtk*1.08);close(p.spa,p.baseSpa*1.08);close(p.defenseFor({kind:'contact'}),p.baseDefense*1.1);close(p.defenseFor({kind:'projectile'}),p.baseSpDef*1.1);close(p.spd,p.baseSpd*1.06);close(p.agility,p.baseAgility*1.06);close(p.regen,p.baseHp*.004);
 assert.equal(p.atkMul,1);assert.equal(p.spdMul,1);assert.equal(p.cdMul,1);assert.equal(p.dmgReduce,0);close(p.agilityCooldown,G.MonProgression.cooldownFactor(p.baseAgility*1.06));
});
test('purchased growth adds to berry growth, while combat buffs remain a separate multiplier and regen uses base HP',()=>{
 const {G}=setup(),p=new G.Player(G.DEX_BY[213],G.Upgrades.perks({atk:1,def:1,hp:1,regen:1,cd:1}));
 p.growStat('atk',.1);p.growStat('defense',.08);p.growStat('hp',.12);p.growStat('agility',.12);p.atkMul=1.5;
 close(p.atk,p.baseAtk*1.14*1.5);close(p.maxHp,p.baseHp*1.15);close(p.defenseFor({kind:'contact'}),p.baseDefense*1.13);close(p.agility,p.baseAgility*1.15);close(p.regen,p.baseHp*.002);
});
test('evolving recalculates permanent and berry HP/growth and regeneration from the new form without granting lost health',()=>{
 const {G}=setup(),p=new G.Player(G.DEX_BY[4],G.Upgrades.perks({hp:10,atk:10,cd:8,def:8,regen:5}));p.level=8;p.monStage=4;p.evolutionPath=[4,5,6];p.growStat('hp',.12);p.hp=p.maxHp*.4;
 const choice=G.MonProgression.evolutionOptions(p).find(c=>c.dex===5);assert.ok(choice);G.Sprites.preload=()=>{};assert.ok(G.MonProgression.evolve(p,choice));
 close(p.maxHp,p.baseHp*1.42);close(p.hp,p.maxHp*.4);close(p.atk,p.baseAtk*1.4);close(p.agility,p.baseAgility*1.24);close(p.defenseFor({kind:'contact'}),p.baseDefense*1.4);close(p.regen,p.baseHp*.01);
});
test('saved levels and family sharing keep their meaning, clamp to existing caps, and utility upgrades keep their existing effects',()=>{
 const {G}=setup();G.DB.save.pupg[4]={hp:2,def:3,cd:4};const before=JSON.stringify(G.DB.save.pupg);G.DB._test.sanitize(G.DB.save);assert.equal(JSON.stringify(G.DB.save.pupg),before);assert.equal(G.DB.upgradesOf(6),G.DB.upgradesOf(4));
 const p=G.Upgrades.perks({hp:100,def:100,cd:100,atk:-5,regen:5,xp:2,coins:2,crit:2,moves:1,reroll:2,ban:2});close(p.statGrowth.hp,.3);close(p.statGrowth.defense,.4);close(p.statGrowth.agility,.24);close(p.statGrowth.atk,0);close(p.xpMul,1.1);close(p.coinMul,1.16);close(p.crit,.06);assert.equal(p.startMoves,2);assert.equal(p.rerolls,2);assert.equal(p.bans,2);
});

const test=require('node:test'),assert=require('node:assert/strict'),{context}=require('./battle_fixture.cjs');
const noop=()=>{};
function setup(){
 const s=context('zh',false),g=s.G;for(const f of ['js/data/expedition-quality.js','js/systems/expedition-quality.js','js/core/settings.js','js/data/egg-groups.js','js/entities/projectile.js','js/systems/expedition-rules.js','js/systems/squad.js','js/systems/squad-bonds.js'])s.load(f);
 const nodes=new Map(),el=()=>({children:[],style:{},classList:{add:noop,remove:noop},dataset:{},append(...a){this.children.push(...a);for(const n of a)if(n.id)nodes.set(n.id,n);},replaceChildren(){this.children=[];},setAttribute:noop,scrollIntoView:noop,querySelector:()=>null,remove(){nodes.delete(this.id);}});
 s.document.getElementById=id=>id==='expedition-battle-result'?(nodes.get(id)||null):(nodes.has(id)?nodes.get(id):(nodes.set(id,el()),nodes.get(id)));s.document.createElement=el;s.document.body=el();s.requestAnimationFrame=noop;
 g.Sprites.preload=noop;g.UI.spriteCanvas=el;g.UI.show=noop;g.UI.hideAll=noop;g.Icons={html:()=>''};g.Game.expeditionPause=()=>g.Game.state='journey';g.Game.expeditionResume=()=>g.Game.state='playing';g.Game.loot={};g.Game.scoreEvent=noop;
 g.World.setBiome=noop;g.World.isFree=()=>true;g.EnemyMgr.clear=()=>{s.enemies.length=0;};g.EnemyMgr.update=noop;Object.defineProperty(g.EnemyMgr,'count',{get:()=>s.enemies.length});g.Combat={clearFields:noop};g.Pickups={clear:noop,drop:noop};g.Hazards={clear:noop};g.Path.clear=noop;g.Touch={reset:noop};g.Difficulty={eliteChance:()=>0};g.Spawner={SHINY_RATE:0};
 s.load('js/data/expedition-lang.js');s.load('js/systems/expedition.js');const E=g.Expedition;E.begin(s.player(4));E.run.map[1][3].kind='battle';E.choose(1,3);return {...s,g,E,nodes};
}
function outcome(s,cleared){const {E,enemies}=s;E.run.spawned=E.run.wave.count;E.run.pendingSpawns=[];if(!cleared)enemies.push({dead:false,expedition:false});E.tick(cleared?.001:E.run.wave.duration);}

test('both outcomes freeze combat and hold the correct headline for 1500 real milliseconds before rewards',()=>{
 for(const cleared of [false,true]){const s=setup(),{g,E,nodes}=s;let now=500;s.performance.now=()=>now;outcome(s,cleared);assert.equal(E.phase,'battle-result');assert.equal(g.Game.state,'journey');const banner=nodes.get('expedition-battle-result');assert.equal(banner.children[0].children[1].textContent,cleared?'全灭敌人':'时间结束');const elapsed=E.run.elapsed;
 E.tick(100);assert.equal(E.run.elapsed,elapsed);E.showLoot(0);assert.equal(E.phase,'battle-result');now=1999;E.tickPresentation();assert.equal(E.phase,'battle-result');now=2000;E.tickPresentation();assert.equal(E.phase,'rewards');assert.equal(g.Game.state,'playing');assert.equal(nodes.has('expedition-battle-result'),false);E.tickPresentation();assert.equal(E.phase,'rewards');}
});

test('reset cancels the result presentation and cannot resume an old run',()=>{
 const s=setup(),{g,E,nodes}=s;s.performance.now=()=>0;outcome(s,true);assert.ok(nodes.has('expedition-battle-result'));E.reset();g.Game.state='ui';s.performance.now=()=>10000;E.tickPresentation();assert.equal(nodes.has('expedition-battle-result'),false);assert.equal(E.active,false);assert.equal(g.Game.state,'ui');
});

test('uncollected XP is banked once, withdrawn equally only in combat, and reset between runs',()=>{
 const s=setup(),{g,E}=s;s.load('js/entities/pickup.js');g.Pickups.drop('xp',100,0,25);g.Pickups.drop('xpBig',100,0,35);g.Pickups.drop('ticket',100,0,1);const xp=E.run.captain.xp;outcome(s,true);assert.equal(E.run.xpJar,60);assert.equal(E.run.xpJarStored,60);assert.equal(E.run.captain.xp,xp);assert.equal(g.Pickups.all().some(p=>p.kind==='xp'||p.kind==='xpBig'),false);E.bankGroundXp();assert.equal(E.run.xpJar,60);assert.equal(E.takeStoredXp(20),0);
 E.run.phase='rewards';g.Pickups.drop('xpBig',100,0,10);E.bankGroundXp();assert.equal(E.run.xpJar,70);E.run.phase='combat';assert.equal(E.takeStoredXp(20),20);assert.equal(E.run.xpJar,50);assert.equal(E.takeStoredXp(60),50);assert.equal(E.run.xpJar,0);assert.equal(E.run.xpJarSpent,70);assert.equal(E.takeStoredXp(20),0);assert.equal(E.takeStoredXp(NaN),0);E.begin(E.run.captain);assert.equal(E.run.xpJar,0);
});

test('bomb and magnet drops are blocked for normal monsters, Boss rewards and scripted/remote drops',()=>{
 const s=setup(),{g}=s;s.load('js/entities/pickup.js');for(const v of [.015,.023]){s.Math.random=()=>v;g.Pickups.dropXp(0,0,10);g.Pickups.dropXp(0,0,140,true);}for(const kind of ['bomb','magnet']){assert.equal(g.Pickups.drop(kind,0,0),null);g.Pickups.addRemote(999,kind,0,0,0);}assert.ok(g.Pickups.all().some(p=>p.kind==='xp'));assert.ok(g.Pickups.all().some(p=>p.kind==='heal'));assert.equal(g.Pickups.all().some(p=>['bomb','magnet'].includes(p.kind)),false);
});

test('elite and Boss survival clocks increase pressure every ten seconds without compounding or losing late spawns',()=>{
 for(const kind of ['elite','boss']){const s=setup(),{g,E,enemies}=s,r=E.run;r.kind=kind;r.wave=g.ExpeditionRules.wave(r.day,kind);r.spawned=r.wave.count;r.pendingSpawns=[];const e={expedition:true,dead:false,spd:100,dmg:10};enemies.push(e);assert.equal(r.wave.duration,kind==='elite'?75:105);
 r.elapsed=r.wave.enrageAt-.01;E.tick(.001);assert.equal(e.spd,100);E.tick(.01);assert.equal(e.spd,150);assert.equal(e.dmg,15);E.tick(.1);assert.equal(e.spd,150);r.elapsed=r.wave.enrageAt+10;E.tick(0);assert.equal(e.spd,175);e.spd*=1.15;r.elapsed=r.wave.enrageAt+20;E.tick(0);assert.ok(Math.abs(e.spd-230)<1e-7);assert.equal(e.dmg,15);
 const late={expedition:true,dead:false,spd:100,dmg:10};enemies.push(late);E.tick(0);assert.equal(late.spd,200);assert.equal(late.dmg,15);r.elapsed=r.wave.duration;E.tick(.1);assert.equal(E.phase,'battle-result');assert.equal(s.nodes.get('expedition-battle-result').children[0].children[1].textContent,'成功生存');assert.equal(r.bossDead,false);
 }
});

test('a Boss already killed at the deadline counts as defeated even during its fade animation',()=>{const s=setup(),r=s.E.run;r.kind='boss';r.wave=s.g.ExpeditionRules.wave(20,'boss');r.elapsed=r.wave.duration;r.bossDead=true;r.spawned=1;r.pendingSpawns=[];s.enemies.push({boss:true,dead:true});s.E.tick(0);assert.equal(s.nodes.get('expedition-battle-result').children[0].children[1].textContent,'全灭敌人');});

test('all wave clocks gain fifteen seconds and finite scheduling finishes even when 168 enemies remain alive',()=>{
 for(const day of [1,10,60,100]){const s=setup(),{g,E,enemies}=s;for(const kind of ['battle','elite','boss']){const w=g.ExpeditionRules.wave(day,kind),old=Math.min(60,24+day*1.2);assert.equal(w.standardDuration,kind==='battle'?old+15:kind==='elite'?45:60);assert.equal(w.duration,kind==='battle'?old+35:kind==='elite'?75:105);assert.ok(w.spawnDuration+2.1<w.standardDuration);assert.equal(w.count,2*Math.round(12+Math.min(72,day*2)));}
 const r=E.run;r.day=day;r.wave=g.ExpeditionRules.wave(day,'battle');r.elapsed=0;r.spawned=0;r.pendingSpawns=[];g.EnemyMgr.add=e=>enemies.push(e);g.Camera.outerRadius=()=>300;g.Enemies={behaviorOf:()=>'chase'};g.Enemy=class{constructor(){this.dead=false;this.spd=50;this.dmg=1;}makeElite(){this.elite=true;}};
 for(let time=0;time<r.wave.spawnDuration+2.2;time+=.05)E.tick(.05);assert.equal(r.spawned,r.wave.count);assert.equal(r.pendingSpawns.length,0);assert.equal(enemies.filter(e=>!e.dead).length,r.wave.count);assert.ok(r.elapsed<r.wave.standardDuration);const total=r.spawned;E.tick(1);assert.equal(r.spawned,total);
 }
});

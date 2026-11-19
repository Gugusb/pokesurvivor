const test=require('node:test'),assert=require('node:assert/strict'),{context}=require('./battle_fixture.cjs');
const noop=()=>{};
function setup(){
 const s=context('zh',false),g=s.G;for(const f of ['js/data/expedition-quality.js','js/systems/expedition-quality.js','js/core/settings.js','js/data/egg-groups.js','js/entities/projectile.js','js/systems/expedition-rules.js','js/systems/squad.js','js/systems/squad-bonds.js'])s.load(f);
 const nodes=new Map(),el=()=>({children:[],style:{},classList:{add:noop},dataset:{},append(...a){this.children.push(...a);for(const n of a)if(n.id)nodes.set(n.id,n);},replaceChildren(){this.children=[];},setAttribute:noop,scrollIntoView:noop,querySelector:()=>null,remove(){nodes.delete(this.id);}});
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
